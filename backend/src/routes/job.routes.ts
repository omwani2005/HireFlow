import { Router } from 'express';
import {
  createJob,
  getJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  getMyJobs,
  searchJobs,
} from '../controllers/job.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import {
  requireRecruiterCompany,
  verifyJobOwnership,
} from '../middlewares/tenantGuard.middleware';
import { validate, validateQuery } from '../middlewares/validate.middleware';
import {
  createJobSchema,
  updateJobSchema,
  jobStatusSchema,
  jobFilterQuerySchema,
} from '../validators/job.validator';

const router = Router();

// Public candidate discovery
router.get('/', validateQuery(jobFilterQuerySchema), searchJobs);

// Recruiter-specific job management
router.get(
  '/recruiter/my-jobs',
  authenticate,
  authorize('recruiter', 'admin'),
  validateQuery(jobFilterQuerySchema.pick({ page: true, limit: true }).extend({ status: jobStatusSchema.shape.status.optional() })),
  getMyJobs
);

// Single job inspection (published is public, drafts require owner recruiter/admin)
router.get('/:id', optionalAuthenticate, getJob);

// Recruiter job CRUD
router.post(
  '/',
  authenticate,
  authorize('recruiter', 'admin'),
  requireRecruiterCompany,
  validate(createJobSchema),
  createJob
);

router.put(
  '/:id',
  authenticate,
  authorize('recruiter', 'admin'),
  verifyJobOwnership,
  validate(updateJobSchema),
  updateJob
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('recruiter', 'admin'),
  verifyJobOwnership,
  validate(jobStatusSchema),
  updateJobStatus
);

router.delete(
  '/:id',
  authenticate,
  authorize('recruiter', 'admin'),
  verifyJobOwnership,
  deleteJob
);

export default router;
