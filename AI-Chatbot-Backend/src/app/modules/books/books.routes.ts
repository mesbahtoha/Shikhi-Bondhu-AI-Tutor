import { Router } from 'express';
import { asyncHandler, ok, fail } from '../../../utils/response.utils';
import bookRepository from '../../../repositories/book.repository';
import { BookModel } from '../../../database/models/Book.model';
import { findFile, streamFile } from '../../../config/gridfs';

const router = Router();

/**
 * Public textbook catalogue (published books only).
 * GET /api/v1/books?subject=&grade=&curriculum=&search=
 * GET /api/v1/books/:id (info + sample chunks, no raw file bytes)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { subject, grade, curriculum, search } = req.query as Record<string, string>;
    const books = await bookRepository.listPublished({ subject, grade, curriculum, search });
    ok(res, {
      books: books.map((b) => ({
        _id: b._id,
        title: b.title,
        subject: b.subject,
        grade: b.grade,
        curriculum: b.curriculum,
        language: b.language,
        edition: b.edition,
        publisher: b.publisher,
        chunkCount: b.chunkCount,
        pageCount: b.pageCount,
        updatedAt: b.updatedAt,
      })),
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const book = await bookRepository.findPublishedById(req.params.id);
    if (!book) return fail(res, 404, 'Book not found');
    const chunks = await bookRepository.previewChunks(String(book._id), 6);
    ok(res, {
      book: {
        _id: book._id,
        title: book.title,
        subject: book.subject,
        grade: book.grade,
        curriculum: book.curriculum,
        language: book.language,
        edition: book.edition,
        publisher: book.publisher,
        chunkCount: book.chunkCount,
        pageCount: book.pageCount,
        hasDownload: Boolean(book.fileId),
        downloadUrl: book.fileId ? `/api/v1/books/${String(book._id)}/download` : null,
      },
      samples: chunks.map((c) => ({
        chunkId: String(c._id),
        chapterTitle: c.chapterTitle,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        preview: c.preview,
      })),
    });
  })
);

router.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const book = await bookRepository.findPublishedById(req.params.id);
    if (!book) return fail(res, 404, 'Book not found');
    if (!book.fileId) return fail(res, 404, 'This book has no downloadable PDF.');

    const file = await findFile(book.fileId);
    if (!file) return fail(res, 404, 'The book PDF is missing from storage.');

    const baseName =
      String(book.title || 'textbook')
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 90) || 'textbook';
    const filename = `${baseName}.pdf`;
    const asciiName = `book-${String(book._id)}.pdf`;
    const size = Number(file.length || 0);

    res.setHeader('Content-Type', file.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');

    // HEAD only needs the metadata; never stream the whole PDF for it.
    if (req.method === 'HEAD') {
      if (size > 0) res.setHeader('Content-Length', String(size));
      res.end();
      return;
    }

    let start = 0;
    let end = size > 0 ? size - 1 : undefined;
    const range = req.headers.range;
    if (range && size > 0) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (!match) {
        res.setHeader('Content-Range', `bytes */${size}`);
        return fail(res, 416, 'Invalid download range.');
      }
      const rawStart = match[1] ? Number(match[1]) : NaN;
      const rawEnd = match[2] ? Number(match[2]) : NaN;
      if (Number.isFinite(rawStart)) {
        start = rawStart;
        end = Number.isFinite(rawEnd) ? Math.min(rawEnd, size - 1) : size - 1;
      } else if (Number.isFinite(rawEnd)) {
        // Suffix range: the last N bytes.
        start = Math.max(0, size - rawEnd);
        end = size - 1;
      }
      const resolvedEnd = end ?? size - 1;
      if (start > resolvedEnd || start >= size) {
        res.setHeader('Content-Range', `bytes */${size}`);
        return fail(res, 416, 'Requested download range is not available.');
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${resolvedEnd}/${size}`);
      res.setHeader('Content-Length', String(resolvedEnd - start + 1));
      end = resolvedEnd;
    } else if (size > 0) {
      res.setHeader('Content-Length', String(size));
    }

    res.flushHeaders?.();

    try {
      await streamFile(res, book.fileId, end === undefined ? {} : { start, end });
    } catch (error) {
      if (!res.headersSent) {
        return fail(res, 500, 'Could not download this book. Please try again.');
      }
      res.destroy();
      throw error;
    }
  })
);

router.get(
  '/meta/subjects',
  asyncHandler(async (_req, res) => {
    const subjects = await BookModel.distinct('subject', { publicationState: 'published' });
    ok(res, { subjects });
  })
);

export default router;
