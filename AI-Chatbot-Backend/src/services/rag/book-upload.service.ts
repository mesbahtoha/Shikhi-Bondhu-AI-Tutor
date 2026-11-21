import { Types } from 'mongoose';
import env from '../../config/env';
import { log } from '../../config/logger';
import { BookUploadSessionModel } from '../../database/models/BookUploadSession.model';
import { BookUploadChunkModel } from '../../database/models/BookUploadChunk.model';
import bookIngestionService from './book-ingestion.service';

/** 3 MB keeps every multipart request safely below Vercel's 4.5 MB limit. */
export const BOOK_UPLOAD_CHUNK_BYTES = 3 * 1024 * 1024;

export interface BookUploadMetadata {
  title: string;
  subject: string;
  grade?: string;
  curriculum?: string;
  language?: string;
  edition?: string;
  year?: number;
  publisher?: string;
  sourceNotes?: string;
  rightsStatus?: string;
}

function appError(message: string, statusCode: number): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.alloc(0);
}

export const bookUploadService = {
  async createSession(
    userId: string,
    metadata: BookUploadMetadata,
    fileName: string,
    fileSize: number
  ) {
    const maxBytes = env.tutor.uploadMaxMb * 1024 * 1024;
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      throw appError('The selected PDF is empty.', 400);
    }
    if (fileSize > maxBytes) {
      throw appError(`PDF exceeds the ${env.tutor.uploadMaxMb}MB limit.`, 400);
    }
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      throw appError('Only PDF books are supported in this version.', 400);
    }

    const totalChunks = Math.ceil(fileSize / BOOK_UPLOAD_CHUNK_BYTES);
    if (totalChunks < 1 || totalChunks > 200) {
      throw appError('The selected PDF is not a valid upload size.', 400);
    }

    const session = await BookUploadSessionModel.create({
      userId,
      status: 'uploading',
      metadata,
      fileName,
      fileSize,
      mimeType: 'application/pdf',
      totalChunks,
      receivedChunks: 0,
    });

    return {
      uploadId: String(session._id),
      chunkSize: BOOK_UPLOAD_CHUNK_BYTES,
      totalChunks,
    };
  },

  async saveChunk(userId: string, uploadId: string, index: number, data: Buffer) {
    if (!Types.ObjectId.isValid(uploadId)) throw appError('Upload session not found.', 404);
    const session = await BookUploadSessionModel.findOne({
      _id: new Types.ObjectId(uploadId),
      userId,
    });
    if (!session) throw appError('Upload session not found.', 404);
    if (session.status !== 'uploading') {
      throw appError('This upload session is no longer accepting chunks.', 409);
    }

    if (!Number.isInteger(index) || index < 0 || index >= session.totalChunks) {
      throw appError('Invalid chunk index.', 400);
    }

    const expectedSize =
      index === session.totalChunks - 1
        ? session.fileSize - BOOK_UPLOAD_CHUNK_BYTES * (session.totalChunks - 1)
        : BOOK_UPLOAD_CHUNK_BYTES;
    if (data.length !== expectedSize) {
      throw appError(
        `Chunk ${index} has an unexpected size (received ${data.length}, expected ${expectedSize}).`,
        400
      );
    }
    if (index === 0 && data.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw appError('The uploaded file is not a valid PDF.', 400);
    }

    await BookUploadChunkModel.updateOne(
      { sessionId: session._id, index },
      { $set: { data, createdAt: new Date() } },
      { upsert: true }
    );

    const receivedChunks = await BookUploadChunkModel.countDocuments({ sessionId: session._id });
    session.receivedChunks = receivedChunks;
    await session.save();

    return { receivedChunks, totalChunks: session.totalChunks };
  },

  async complete(userId: string, uploadId: string) {
    if (!Types.ObjectId.isValid(uploadId)) throw appError('Upload session not found.', 404);
    const objectId = new Types.ObjectId(uploadId);
    // Atomically claim the session so two completion requests cannot create
    // duplicate books from the same upload.
    const session = await BookUploadSessionModel.findOneAndUpdate(
      { _id: objectId, userId, status: 'uploading' },
      { $set: { status: 'processing' } },
      { new: true }
    );
    if (!session) {
      const existing = await BookUploadSessionModel.findOne({ _id: objectId, userId });
      if (!existing) throw appError('Upload session not found.', 404);
      throw appError('This upload session has already been completed.', 409);
    }

    try {
      const chunks = await BookUploadChunkModel.find({ sessionId: session._id })
        .sort({ index: 1 })
        .select({ index: 1, data: 1 });

      if (chunks.length !== session.totalChunks) {
        const received = new Set(chunks.map((chunk) => chunk.index));
        const missing = Array.from({ length: session.totalChunks }, (_, index) => index).filter(
          (index) => !received.has(index)
        );
        throw appError(
          `Upload is incomplete. Missing ${missing.length} chunk(s): ${missing.slice(0, 10).join(', ')}.`,
          409
        );
      }

      const buffers = chunks.map((chunk) => toBuffer(chunk.data));
      const totalSize = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
      if (totalSize !== session.fileSize) {
        throw appError('Uploaded chunks do not match the original file size. Please retry the upload.', 400);
      }

      const buffer = Buffer.concat(buffers, totalSize);
      if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
        throw appError('The uploaded file is not a valid PDF.', 400);
      }

      const metadata = session.metadata as unknown as BookUploadMetadata;
      const file = {
        fieldname: 'file',
        originalname: session.fileName,
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: buffer.length,
        buffer,
      } as Express.Multer.File;

      const created = await bookIngestionService.createBook({
        ...metadata,
        uploadedBy: userId,
        file,
      });

      // The book exists now. Cleanup failures must not make the admin retry
      // and accidentally create a duplicate book.
      try {
        session.status = 'completed';
        session.receivedChunks = session.totalChunks;
        await session.save();
        await BookUploadChunkModel.deleteMany({ sessionId: session._id });
      } catch (cleanupError) {
        log.warn('Could not finalize chunked upload session', {
          sessionId: uploadId,
          message: (cleanupError as Error).message,
        });
      }

      log.info('Chunked book upload completed', {
        sessionId: uploadId,
        bookId: String(created.book._id),
        size: session.fileSize,
        chunks: session.totalChunks,
      });

      return { book: created.book, jobId: created.jobId };
    } catch (error) {
      // Allow a retry (and let saveChunk accept chunks again) after a
      // transient failure. The TTL index cleans up if it is never retried.
      await BookUploadSessionModel.updateOne({ _id: session._id }, { $set: { status: 'uploading' } });
      throw error;
    }
  },

  async abort(userId: string, uploadId: string): Promise<void> {
    if (!Types.ObjectId.isValid(uploadId)) throw appError('Upload session not found.', 404);
    const session = await BookUploadSessionModel.findOne({
      _id: new Types.ObjectId(uploadId),
      userId,
    });
    if (!session) throw appError('Upload session not found.', 404);
    await BookUploadChunkModel.deleteMany({ sessionId: session._id });
    session.status = 'failed';
    await session.save();
  },
};

export default bookUploadService;
