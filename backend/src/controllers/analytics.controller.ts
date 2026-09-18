import { Request, Response } from 'express';
import { Application } from '../models/Application.model';
import { Job } from '../models/Job.model';
import { User } from '../models/User.model';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const getCandidateAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const [stageCounts, recentApplications] = await Promise.all([
    Application.aggregate([{ $match: { candidateId: req.user!._id } }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
    Application.find({ candidateId: req.user!._id }).sort({ updatedAt: -1 }).limit(5).populate('jobId', 'title status').populate('companyId', 'name'),
  ]);
  const byStage = Object.fromEntries(stageCounts.map((item) => [item._id, item.count]));
  const totalApplications = stageCounts.reduce((sum, item) => sum + item.count, 0);
  return sendSuccess(res, { message: 'Candidate analytics retrieved', data: { totalApplications, activeApplications: totalApplications - (byStage.rejected || 0) - (byStage.withdrawn || 0) - (byStage.hired || 0), byStage, recentApplications, profile: { hasResume: Boolean(req.user!.candidateProfile?.resume?.originalFilename), skillsCount: req.user!.candidateProfile?.skills?.length || 0 } } });
});

export const getRecruiterAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const jobFilter = req.user!.role === 'admin' ? {} : { companyId: req.user!.companyId };
  const jobs = await Job.find(jobFilter).select('_id status');
  const jobIds = jobs.map(({ _id }) => _id);
  const [stageCounts, recentApplications] = await Promise.all([
    Application.aggregate([{ $match: { jobId: { $in: jobIds } } }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
    Application.find({ jobId: { $in: jobIds } }).sort({ createdAt: -1 }).limit(5).populate('candidateId', 'fullName email').populate('jobId', 'title'),
  ]);
  return sendSuccess(res, { message: 'Recruiter analytics retrieved', data: { totalJobs: jobs.length, publishedJobs: jobs.filter((job) => job.status === 'published').length, draftJobs: jobs.filter((job) => job.status === 'draft').length, closedJobs: jobs.filter((job) => job.status === 'closed').length, totalApplicants: stageCounts.reduce((sum, item) => sum + item.count, 0), byStage: Object.fromEntries(stageCounts.map((item) => [item._id, item.count])), recentApplications } });
});

export const getAdminAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const [users, candidates, recruiters, jobs, publishedJobs, applications, byStage] = await Promise.all([User.countDocuments(), User.countDocuments({ role: 'candidate' }), User.countDocuments({ role: 'recruiter' }), Job.countDocuments(), Job.countDocuments({ status: 'published' }), Application.countDocuments(), Application.aggregate([{ $group: { _id: '$stage', count: { $sum: 1 } } }])]);
  return sendSuccess(res, { message: 'Admin analytics retrieved', data: { users, candidates, recruiters, jobs, publishedJobs, applications, byStage: Object.fromEntries(byStage.map((item) => [item._id, item.count])) } });
});
