import { Request, Response } from 'express';
import { ApplicationService } from '../services/application.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApplicationQuery } from '../validators/application.validator';
import { MatchingService } from '../services/matching.service';

export const applyToJob = asyncHandler(async (req: Request, res: Response) => {
  const application = await ApplicationService.create(req.params.jobId, req.body, req.user!);
  return sendSuccess(res, { statusCode: 201, message: 'Application submitted successfully', data: { application } });
});

export const getMyApplications = asyncHandler(async (req: Request, res: Response) => {
  const result = await ApplicationService.getCandidateApplications(req.user!._id, req.query as unknown as ApplicationQuery);
  return sendSuccess(res, { message: 'Applications retrieved', data: { applications: result.records }, meta: result.meta });
});

export const getJobApplicants = asyncHandler(async (req: Request, res: Response) => {
  const result = await ApplicationService.getRecruiterApplications(req.params.jobId, req.user!, req.query as unknown as ApplicationQuery);
  return sendSuccess(res, { message: 'Applicants retrieved', data: { applications: result.records }, meta: result.meta });
});

export const updateApplicationStage = asyncHandler(async (req: Request, res: Response) => {
  const application = await ApplicationService.updateStage(req.params.id, req.body, req.user!);
  return sendSuccess(res, { message: 'Application stage updated', data: { application } });
});

export const withdrawApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await ApplicationService.withdraw(req.params.id, req.user!);
  return sendSuccess(res, { message: 'Application withdrawn', data: { application } });
});

export const getApplicationMatch = asyncHandler(async (req: Request, res: Response) => {
  const match = await MatchingService.forApplication(req.params.id, req.user!);
  return sendSuccess(res, { message: 'Candidate match calculated', data: { match } });
});
