import { Router } from 'express';
import { applyToJob, getApplicationMatch, getJobApplicants, getMyApplications, updateApplicationStage, withdrawApplication } from '../controllers/application.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { validate, validateQuery } from '../middlewares/validate.middleware';
import { applicationQuerySchema, createApplicationSchema, updateApplicationStageSchema } from '../validators/application.validator';

const router = Router();

router.get('/me', authenticate, authorize('candidate'), validateQuery(applicationQuerySchema), getMyApplications);
router.get('/job/:jobId', authenticate, authorize('recruiter', 'admin'), validateQuery(applicationQuerySchema), getJobApplicants);
router.post('/job/:jobId', authenticate, authorize('candidate'), validate(createApplicationSchema), applyToJob);
router.get('/:id/match', authenticate, authorize('recruiter', 'admin'), getApplicationMatch);
router.patch('/:id/stage', authenticate, authorize('recruiter', 'admin'), validate(updateApplicationStageSchema), updateApplicationStage);
router.patch('/:id/withdraw', authenticate, authorize('candidate'), withdrawApplication);

export default router;
