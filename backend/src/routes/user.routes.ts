import { rateLimit } from '../middlewares/rateLimit.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { Router } from 'express';
import { downloadResume, getMe, updateProfile, uploadResume } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateProfileSchema } from '../validators/user.validator';
import { resumeUpload } from '../middlewares/upload.middleware';

const router = Router();

router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.post('/resume', authenticate, authorize('candidate'), rateLimit('resume-upload', 10, 15 * 60_000), resumeUpload.single('resume'), uploadResume);
router.get('/:id/resume', authenticate, downloadResume);

export default router;
