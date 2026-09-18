import { escapeSearch } from '../utils/search';
import { Company } from '../models/Company.model';
import mongoose, { FilterQuery } from 'mongoose';
import { Job, IJobDocument, JobStatus } from '../models/Job.model';
import { IUserDocument } from '../models/User.model';
import { AppError } from '../utils/AppError';
import { CreateJobInput, UpdateJobInput, JobFilterQuery } from '../validators/job.validator';

export interface PaginatedResult<T> {
  records: T[];
  meta: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
  };
}

export class JobService {
  static async createJob(
    input: CreateJobInput,
    user: IUserDocument
  ): Promise<IJobDocument> {
    if (!user.companyId) {
      throw new AppError(
        'Forbidden: You must create or join a company before publishing job requisitions',
        403
      );
    }

    if (!await Company.exists({ _id: user.companyId, archivedAt: null })) throw new AppError('Company is unavailable', 409);
    const job = await Job.create({
      ...input,
      companyId: user.companyId,
      createdBy: user._id,
    });

    return job.populate('companyId', 'name slug logoUrl location industry');
  }

  static async getJobById(
    id: string,
    user?: IUserDocument
  ): Promise<IJobDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid job ID format', 400);
    }

    const job = await Job.findById(id).populate(
      'companyId',
      'name slug logoUrl description website industry companySize location'
    );

    if (!job || job.archivedAt) {
      throw new AppError('Job posting not found', 404);
    }

    // Draft/Closed visibility guard:
    // Only published jobs are visible publicly or to candidates.
    // Draft or closed jobs can only be viewed by an admin or a recruiter belonging to the same company.
    if (job.status !== 'published') {
      const isOwnerRecruiter =
        user &&
        user.role === 'recruiter' &&
        user.companyId &&
        job.companyId &&
        (job.companyId as any)._id?.equals(user.companyId);

      const isAdmin = user && user.role === 'admin';

      if (!isOwnerRecruiter && !isAdmin) {
        throw new AppError('Job posting not found', 404);
      }
    }

    return job;
  }

  static async updateJob(
    id: string,
    input: UpdateJobInput
  ): Promise<IJobDocument> {
    const updatedJob = await Job.findOneAndUpdate(
      { _id: id, archivedAt: null },
      { $set: input },
      { new: true, runValidators: true }
    ).populate('companyId', 'name slug logoUrl location industry');

    if (!updatedJob) {
      throw new AppError('Job not found', 404);
    }

    return updatedJob;
  }

  static async updateJobStatus(
    id: string,
    status: JobStatus
  ): Promise<IJobDocument> {
    const updatedJob = await Job.findOneAndUpdate(
      { _id: id, archivedAt: null },
      { $set: { status } },
      { new: true, runValidators: true }
    ).populate('companyId', 'name slug logoUrl location industry');

    if (!updatedJob) {
      throw new AppError('Job not found', 404);
    }

    return updatedJob;
  }

  static async deleteJob(id: string): Promise<void> {
    const deleted = await Job.findOneAndUpdate({ _id: id, archivedAt: null }, { $set: { archivedAt: new Date(), status: 'closed' } });
    if (!deleted) {
      throw new AppError('Job not found', 404);
    }
  }

  static async getRecruiterJobs(
    user: IUserDocument,
    query: { status?: string; page?: number; limit?: number }
  ): Promise<PaginatedResult<IJobDocument>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IJobDocument> = user.role === 'admin' ? {} : { companyId: user.companyId };
    filter.archivedAt = null;
    if (query.status && ['draft', 'published', 'closed'].includes(query.status)) {
      filter.status = query.status as JobStatus;
    }

    const [records, totalRecords] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('companyId', 'name slug logoUrl location industry'),
      Job.countDocuments(filter),
    ]);

    return {
      records,
      meta: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit) || 1,
      },
    };
  }

  static async searchJobs(
    query: JobFilterQuery
  ): Promise<PaginatedResult<IJobDocument>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Candidate discovery strictly searches PUBLISHED jobs
    const filter: FilterQuery<IJobDocument> = {
      status: 'published',
      archivedAt: null,
    };

    // 1. Text / Keyword Search
    if (query.search && query.search.trim()) {
      filter.$text = { $search: query.search.trim() };
    }

    // 2. Location filter
    if (query.location && query.location.trim()) {
      filter.location = { $regex: escapeSearch(query.location.trim()), $options: 'i' };
    }

    // 3. Faceted filters
    if (query.workplaceType) {
      filter.workplaceType = query.workplaceType;
    }

    if (query.employmentType) {
      filter.employmentType = query.employmentType;
    }

    if (query.experienceLevel) {
      filter.experienceLevel = query.experienceLevel;
    }

    // 4. Skills match
    if (query.skills && query.skills.trim()) {
      const skillsArray = query.skills
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (skillsArray.length > 0) {
        filter.skillsRequired = { $in: skillsArray };
      }
    }

    // 5. Salary range filtering
    if (query.salaryMin !== undefined) {
      filter.salaryMax = { $gte: query.salaryMin };
    }
    if (query.salaryMax !== undefined) {
      filter.salaryMin = { $lte: query.salaryMax };
    }

    // 6. Sorting configuration
    let sortCriteria: any = { createdAt: -1 };
    if (query.sort === 'oldest') {
      sortCriteria = { createdAt: 1 };
    } else if (query.sort === 'salary_high') {
      sortCriteria = { salaryMax: -1 };
    } else if (query.sort === 'salary_low') {
      sortCriteria = { salaryMin: 1 };
    } else if (filter.$text) {
      sortCriteria = { score: { $meta: 'textScore' } };
    }

    const queryBuilder = Job.find(filter);
    if (filter.$text) {
      queryBuilder.select({ score: { $meta: 'textScore' } });
    }

    const [records, totalRecords] = await Promise.all([
      queryBuilder
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .populate('companyId', 'name slug logoUrl location industry'),
      Job.countDocuments(filter),
    ]);

    return {
      records,
      meta: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit) || 1,
      },
    };
  }
}
