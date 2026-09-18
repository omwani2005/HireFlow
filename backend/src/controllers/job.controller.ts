import { Request, Response } from 'express';
import { JobService } from '../services/job.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { Application } from '../models/Application.model';

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await JobService.createJob(req.body, req.user!);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Job posting created successfully',
    data: { job },
  });
});

export const getJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await JobService.getJobById(req.params.id, req.user);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job posting retrieved',
    data: { job },
  });
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await JobService.updateJob(req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job posting updated successfully',
    data: { job },
  });
});

export const updateJobStatus = asyncHandler(async (req: Request, res: Response) => {
  const job = await JobService.updateJobStatus(req.params.id, req.body.status);

  return sendSuccess(res, {
    statusCode: 200,
    message: `Job status transitioned to '${req.body.status}'`,
    data: { job },
  });
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  await JobService.deleteJob(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job posting archived successfully',
  });
});

export const getMyJobs = asyncHandler(async (req: Request, res: Response) => {
  const result = await JobService.getRecruiterJobs(req.user!, req.query);
  const counts = await Application.aggregate<{ _id: unknown; count: number }>([
    { $match: { jobId: { $in: result.records.map((job) => job._id) } } },
    { $group: { _id: '$jobId', count: { $sum: 1 } } },
  ]);
  const countByJob = new Map(counts.map((item) => [String(item._id), item.count]));
  const jobs = result.records.map((job) => ({
    ...job.toObject(),
    applicationCount: countByJob.get(job._id.toString()) || 0,
  }));

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Recruiter jobs retrieved',
    data: { jobs },
    meta: result.meta,
  });
});

export const searchJobs = asyncHandler(async (req: Request, res: Response) => {
  const result = await JobService.searchJobs(req.query as any);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Published job requisitions retrieved',
    data: { jobs: result.records },
    meta: result.meta,
  });
});
