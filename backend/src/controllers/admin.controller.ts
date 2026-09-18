import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Job } from '../models/Job.model';
import { Application } from '../models/Application.model';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page); const limit = Number(req.query.limit); const skip = (page - 1) * limit;
  const filter = req.query.role ? { role: req.query.role } : {};
  const [users, totalRecords] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)]);
  return sendSuccess(res, { message: 'Users retrieved', data: { users }, meta: { page, limit, totalRecords, totalPages: Math.max(1, Math.ceil(totalRecords / limit)) } });
});
export const listPlatformJobs = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, { message: 'Jobs retrieved', data: { jobs: await Job.find().sort({ createdAt: -1 }).limit(100).populate('companyId', 'name') } }));
export const listPlatformApplications = asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, { message: 'Applications retrieved', data: { applications: await Application.find().sort({ createdAt: -1 }).limit(100).populate('candidateId', 'fullName email').populate('jobId', 'title').populate('companyId', 'name') } }));
