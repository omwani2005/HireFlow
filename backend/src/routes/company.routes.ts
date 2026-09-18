import { Router } from 'express';
import {
  createCompany,
  getCompany,
  getMyCompany,
  updateCompany,
  deleteCompany,
} from '../controllers/company.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { verifyCompanyOwnership } from '../middlewares/tenantGuard.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator';

const router = Router();

// Authenticated Recruiter & Admin routes
router.post(
  '/',
  authenticate,
  authorize('recruiter', 'admin'),
  validate(createCompanySchema),
  createCompany
);

router.get(
  '/recruiter/my-company',
  authenticate,
  authorize('recruiter', 'admin'),
  getMyCompany
);

// Public route to view company details (keep after static paths).
router.get('/:id', getCompany);

router.put(
  '/:id',
  authenticate,
  authorize('recruiter', 'admin'),
  verifyCompanyOwnership,
  validate(updateCompanySchema),
  updateCompany
);

router.delete(
  '/:id',
  authenticate,
  authorize('recruiter', 'admin'),
  verifyCompanyOwnership,
  deleteCompany
);

export default router;
