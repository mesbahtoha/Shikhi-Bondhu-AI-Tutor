import { asyncHandler, ok } from '../../../utils/response.utils';
import docsContentService from '../../../services/docs/docsContent.service';
import { findFile, streamFile, uploadBuffer } from '../../../config/gridfs';

/** Admin docs controller: draft/publish/schedule/versions/team/features. */
export const docsAdminController = {
  get: asyncHandler(async (_req, res) => {
    const state = await docsContentService.getDraft();
    return ok(res, state);
  }),

  saveDraft: asyncHandler(async (req, res) => {
    const email = req.user?.email ?? '';
    const state = await docsContentService.saveDraft({
      pitchDeck: req.body.pitchDeck,
      productOverview: req.body.productOverview,
      customSections: req.body.customSections,
      featureMatrix: req.body.featureMatrix,
      roadmap: req.body.roadmap,
      changelog: req.body.changelog,
      updatedBy: email,
    });
    return ok(res, state);
  }),

  publish: asyncHandler(async (req, res) => {
    const state = await docsContentService.publish(req.user?.email ?? '');
    return ok(res, state);
  }),

  unpublish: asyncHandler(async (_req, res) => {
    const state = await docsContentService.unpublish();
    return ok(res, state);
  }),

  setPublishingEnabled: asyncHandler(async (req, res) => {
    const state = await docsContentService.setPublishingEnabled(Boolean(req.body.enabled));
    return ok(res, state);
  }),

  setSchedule: asyncHandler(async (req, res) => {
    const state = await docsContentService.setSchedule({
      start: req.body.start ? new Date(req.body.start) : null,
      end: req.body.end ? new Date(req.body.end) : null,
      timezone: String(req.body.timezone ?? 'Asia/Dhaka'),
    });
    return ok(res, state);
  }),

  listVersions: asyncHandler(async (_req, res) => {
    const versions = await docsContentService.listVersions();
    return ok(res, { versions });
  }),

  restoreVersion: asyncHandler(async (req, res) => {
    const state = await docsContentService.restoreVersion(Number(req.params.version), req.user?.email ?? '');
    return ok(res, state);
  }),

  addTeamMember: asyncHandler(async (req, res) => {
    let avatarId = '';
    if (req.file) {
      avatarId = String(await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, { kind: 'team-avatar', memberName: String(req.body.name ?? '') }));
    }
    const state = await docsContentService.addTeamMember(
      { name: String(req.body.name ?? ''), role: String(req.body.role ?? ''), contact: String(req.body.contact ?? ''), avatarId },
      req.user?.email ?? ''
    );
    return ok(res, {
      member: state.member,
      versions: state.versions,
      publishedVersion: state.publishedVersion,
      updatedAt: state.updatedAt,
    });
  }),

  updateTeamMember: asyncHandler(async (req, res) => {
    const patch: { name?: string; role?: string; contact?: string; avatarId?: string } = {};
    for (const field of ['name', 'role', 'contact', 'avatarId'] as const) {
      if (typeof req.body[field] === 'string') patch[field] = req.body[field];
    }
    const result = await docsContentService.updateTeamMember(String(req.params.memberId), patch, req.user?.email ?? '');
    return ok(res, result);
  }),

  getTeamAvatar: asyncHandler(async (req, res) => {
    const state = await docsContentService.getDraft();
    const member = (state.doc.teamMembers ?? []).find((candidate) => candidate.id === String(req.params.memberId));
    if (!member?.avatarId) return res.status(404).json({ success: false, message: 'Avatar not found' });
    const file = await findFile(member.avatarId);
    if (!file) return res.status(404).json({ success: false, message: 'Avatar file is missing' });
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', file.contentType || 'image/jpeg');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    await streamFile(res, member.avatarId);
  }),

  updateTeamAvatar: asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'An image file is required.' });
    const result = await docsContentService.updateTeamMemberAvatar(
      String(req.params.memberId),
      { buffer: req.file.buffer, originalname: req.file.originalname, mimetype: req.file.mimetype },
      req.user?.email ?? ''
    );
    return ok(res, result);
  }),

  deleteTeamMember: asyncHandler(async (req, res) => {
    const { deleted, remaining } = await docsContentService.deleteTeamMember(String(req.params.memberId), req.user?.email ?? '');
    return ok(res, { deleted, remaining });
  }),
};

export default docsAdminController;
