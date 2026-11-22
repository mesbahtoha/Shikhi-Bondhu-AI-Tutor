import { Router } from 'express';
import docsAdminController from './docs.admin.controller';
import { uploadAvatar } from '../../../middleware/upload.middleware';
import { validate } from '../../../middleware/validate.middleware';
import {
  enabledSchema,
  restoreVersionSchema,
  saveDraftSchema,
  scheduleSchema,
  teamMemberPatchSchema,
  teamMemberSchema,
} from './docs.validation';

const router = Router();

// Mounted at /api/v1/admin/docs by the parent admin router.
router.get('/', docsAdminController.get);
router.put('/', validate(saveDraftSchema, 'body'), docsAdminController.saveDraft);
router.post('/publish', docsAdminController.publish);
router.post('/unpublish', docsAdminController.unpublish);
router.put('/schedule', validate(scheduleSchema, 'body'), docsAdminController.setSchedule);
router.get('/versions', docsAdminController.listVersions);
router.post('/versions/:version/restore', validate(restoreVersionSchema, 'params'), docsAdminController.restoreVersion);
router.put('/enabled', validate(enabledSchema, 'body'), docsAdminController.setPublishingEnabled);

// Team management (confirmed members cannot be removed)
// Multipart parsing must run before body validation: multer populates
// req.body from the form fields.
router.post('/team', uploadAvatar.single('avatar'), validate(teamMemberSchema, 'body'), docsAdminController.addTeamMember);
router.patch('/team/:memberId', validate(teamMemberPatchSchema, 'body'), docsAdminController.updateTeamMember);
router.get('/team/:memberId/avatar', docsAdminController.getTeamAvatar);
router.post('/team/:memberId/avatar', uploadAvatar.single('avatar'), docsAdminController.updateTeamAvatar);
router.delete('/team/:memberId', docsAdminController.deleteTeamMember);

export default router;
