import mongoose, { Schema, InferSchemaType } from 'mongoose';

/**
 * Resumable, chunked book upload session. Large PDFs exceed Vercel's request
 * body limit, so the admin UI uploads 3 MB chunks and the server assembles
 * them into one PDF before handing it to the ingestion pipeline.
 */
const bookUploadSessionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'completed', 'failed'],
      default: 'uploading',
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, default: 'application/pdf' },
    totalChunks: { type: Number, required: true },
    receivedChunks: { type: Number, default: 0 },
    /** Sparse/leftover sessions are removed automatically after a day. */
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true, collection: 'book_upload_sessions' }
);

bookUploadSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
bookUploadSessionSchema.index({ userId: 1, createdAt: -1 });

export type BookUploadSessionDocument = InferSchemaType<typeof bookUploadSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BookUploadSessionModel = mongoose.model('BookUploadSession', bookUploadSessionSchema);
