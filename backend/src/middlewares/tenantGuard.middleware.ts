import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { Job, IJobDocument } from '../models/Job.model';
import { Company, ICompanyDocument } from '../models/Company.model';
import mongoose from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      targetJob?: IJobDocument;
      targetCompany?: ICompanyDocument;
    }
  }
}

/**
 * Enforces that a recruiter has completed company setup.
 * Never trusts any client-provided companyId.
 */
export const requireRecruiterCompany = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized: Authentication required', 401));
    }

    // Admins bypass tenant isolation
    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.role !== 'recruiter') {
      return next(new AppError('Forbidden: Only recruiters can perform company actions', 403));
    }

    if (!req.user.companyId) {
      return next(
        new AppError(
          'Forbidden: You must create or join a company before managing jobs or company profiles',
          403
        )
      );
    }

    next();
  }
);

/**
 * Validates that the requested job belongs strictly to the authenticated recruiter's company.
 * Prevents Insecure Direct Object Reference (IDOR) attacks across companies.
 */
export const verifyJobOwnership = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid job ID format', 400));
    }

    const job = await Job.findById(id);
    if (!job || job.archivedAt) {
      return next(new AppError('Job not found', 404));
    }

    // Admin has global tenant access
    if (req.user?.role === 'admin') {
      req.targetJob = job;
      return next();
    }

    if (!req.user?.companyId) {
      return next(
        new AppError('Forbidden: You must belong to a company to manage this job', 403)
      );
    }

    // Strict multi-tenant boundary check:
    if (!job.companyId.equals(req.user.companyId)) {
      return next(
        new AppError(
          'Forbidden: You do not have permission to access or modify jobs belonging to another company',
          403
        )
      );
    }

    req.targetJob = job;
    next();
  }
);

/**
 * Validates that the recruiter is updating their own company and not another company.
 */
export const verifyCompanyOwnership = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid company ID format', 400));
    }

    const company = await Company.findById(id);
    if (!company || company.archivedAt) {
      return next(new AppError('Company not found', 404));
    }

    // Admin has global access
    if (req.user?.role === 'admin') {
      req.targetCompany = company;
      return next();
    }

    if (!req.user?.companyId || !company._id.equals(req.user.companyId)) {
      return next(
        new AppError(
          'Forbidden: You do not have permission to modify another company\'s profile',
          403
        )
      );
    }

    req.targetCompany = company;
    next();
  }
);
