import { Request, Response } from 'express';
import { asyncHandler, ok, fail } from '../../../utils/response.utils';
import docsContentService from '../../../services/docs/docsContent.service';
import docsStatsService from '../../../services/docs/docsStats.service';
import { findFile, streamFile } from '../../../config/gridfs';

/**
 * Public docs controller. Enforces server-side visibility gating:
 * - disabled docs -> 403 (no content exposed)
 * - unpublished docs -> 404
 * - stats are aggregate-only (no PII)
 */
export const docsController = {
  meta: asyncHandler(async (_req: Request, res: Response) => {
    const meta = await docsContentService.getPublicMeta();
    return ok(res, meta);
  }),

  content: asyncHandler(async (_req: Request, res: Response) => {
    const content = await docsContentService.getPublicSnapshot();
    return ok(res, { content });
  }),

  stats: asyncHandler(async (_req: Request, res: Response) => {
    // Aggregate statistics are part of the documentation experience, so they
    // follow the same server-side visibility gate as the content itself.
    const meta = await docsContentService.getPublicMeta();
    if (!meta.accessible) {
      return fail(res, 403, meta.reason === 'unpublished'
        ? 'Documentation is not published yet.'
        : 'Documentation is not available right now.');
    }
    const stats = await docsStatsService.getStats();
    return ok(res, { stats });
  }),

  /** Streams a public team-member avatar from GridFS. */
  media: asyncHandler(async (req: Request, res: Response) => {
    const memberId = String(req.params.memberId ?? '');
    if (!memberId) return fail(res, 400, 'Member id is required');
    const content = await docsContentService.getPublicSnapshot();
    const member = (content.teamMembers ?? []).find((candidate) => candidate.id === memberId);
    if (!member?.avatarId) return fail(res, 404, 'Avatar not found');
    const file = await findFile(member.avatarId);
    if (!file) return fail(res, 404, 'Avatar file is missing.');
    if (!res.headersSent) {
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Content-Type', file.contentType || 'image/jpeg');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    await streamFile(res, member.avatarId);
  }),
};

export default docsController;
