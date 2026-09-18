import { transaction } from '../utils/transaction';
import { escapeSearch } from '../utils/search';
import mongoose, { FilterQuery } from 'mongoose';
import { Application, ApplicationStage, IApplicationDocument } from '../models/Application.model';
import { Job } from '../models/Job.model';
import { IUserDocument } from '../models/User.model';
import { User } from '../models/User.model';
import { AppError } from '../utils/AppError';
import { ApplicationQuery, CreateApplicationInput, UpdateApplicationStageInput } from '../validators/application.validator';
import { PaginatedResult } from './job.service';
import { NotificationService } from './notification.service';

const applicationPopulation = [
  { path: 'candidateId', select: 'fullName email avatarUrl designation candidateProfile.headline candidateProfile.skills candidateProfile.location candidateProfile.summary candidateProfile.experience candidateProfile.education candidateProfile.projects candidateProfile.certifications candidateProfile.resume.originalFilename candidateProfile.resume.size candidateProfile.resume.uploadedAt candidateProfile.resume.parseStatus candidateProfile.resume.parsedAt' },
  { path: 'jobId', select: 'title location workplaceType employmentType status' },
  { path: 'companyId', select: 'name slug logoUrl' },
];
const allowedStageTransitions: Record<ApplicationStage, ApplicationStage[]> = {
  applied: ['screening', 'shortlisted', 'rejected'],
  screening: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
  hired: [], rejected: [], withdrawn: [],
};

export class ApplicationService {
  static async create(jobId: string, input: CreateApplicationInput, candidate: IUserDocument): Promise<IApplicationDocument> {
    return transaction(async (session) => {
      if (!mongoose.Types.ObjectId.isValid(jobId)) throw new AppError('Invalid job ID format', 400);

      const job = await Job.findOne({ _id: jobId, status: 'published', archivedAt: null }).session(session);
      if (!job) throw new AppError('Job posting is not available for applications', 404);
      if (job.applicationDeadline && job.applicationDeadline < new Date()) {
        throw new AppError('The application deadline for this job has passed', 409);
      }

      try {
        const [application] = await Application.create([{
          candidateId: candidate._id,
          jobId: job._id,
          companyId: job.companyId,
          coverLetter: input.coverLetter || '',
          stage: 'applied',
          statusHistory: [{ stage: 'applied', changedBy: candidate._id, changedAt: new Date() }],
        }], { session });
        await NotificationService.notifyCompanyRecruiters(job.companyId, { type: 'application_submitted', title: 'New application', message: `${candidate.fullName} applied for ${job.title}.`, applicationId: application._id, jobId: job._id }, session);
        return application.populate(applicationPopulation.map(option => ({ ...option, ordered: true })));
      } catch (error: unknown) {
        if ((error as { code?: number }).code === 11000) {
          throw new AppError('You have already applied for this job', 409);
        }
        throw error;
      }
    });
  }

  static async getCandidateApplications(candidateId: mongoose.Types.ObjectId, query: ApplicationQuery): Promise<PaginatedResult<IApplicationDocument>> {
    return this.findPaginated({ candidateId, ...(query.stage && { stage: query.stage }) }, query);
  }

  static async getRecruiterApplications(jobId: string, recruiter: IUserDocument, query: ApplicationQuery): Promise<PaginatedResult<IApplicationDocument>> {
    if (!mongoose.Types.ObjectId.isValid(jobId)) throw new AppError('Invalid job ID format', 400);
    const job = await Job.findById(jobId).select('companyId');
    if (!job) throw new AppError('Job not found', 404);
    if (recruiter.role !== 'admin' && (!recruiter.companyId || !job.companyId.equals(recruiter.companyId))) {
      throw new AppError('Forbidden: You cannot view applicants for this job', 403);
    }
    const candidateFilter: FilterQuery<IApplicationDocument> = { jobId: job._id, ...(query.stage && { stage: query.stage }) };
    if (query.search) {
      const candidateIds = await Application.distinct('candidateId', { jobId: job._id });
      const literal = escapeSearch(query.search);
      const candidates = await User.find({
        _id: { $in: candidateIds },
        $or: [
          { fullName: { $regex: literal, $options: 'i' } },
          { email: { $regex: literal, $options: 'i' } },
          { 'candidateProfile.skills': { $regex: literal, $options: 'i' } },
        ],
      }).select('_id');
      candidateFilter.candidateId = { $in: candidates.map((candidate) => candidate._id) };
    }
    return this.findPaginated(candidateFilter, query);
  }

  static async updateStage(id: string, input: UpdateApplicationStageInput, actor: IUserDocument): Promise<IApplicationDocument> {
    return transaction(async (session) => {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid application ID format', 400);
      const application = await Application.findById(id).session(session);
      if (!application) throw new AppError('Application not found', 404);
      if (actor.role !== 'admin' && (!actor.companyId || !application.companyId.equals(actor.companyId))) {
        throw new AppError('Forbidden: You cannot update this application', 403);
      }
      if (input.stage === 'withdrawn') {
        throw new AppError('Only the candidate can withdraw an application', 403);
      }
      if (application.stage === 'withdrawn' || application.stage === 'hired' || application.stage === 'rejected') {
        throw new AppError(`Cannot change an application in '${application.stage}' stage`, 409);
      }
      if (!allowedStageTransitions[application.stage].includes(input.stage)) {
        throw new AppError(`Invalid stage transition from '${application.stage}' to '${input.stage}'`, 409);
      }
      application.stage = input.stage;
      application.statusHistory.push({ stage: input.stage, changedBy: actor._id, note: input.note || '', changedAt: new Date() });
      await application.save({ session });
      await NotificationService.notifyUser(application.candidateId, { type: 'application_stage_changed', title: 'Application updated', message: `Your application is now in the ${input.stage} stage.`, applicationId: application._id, jobId: application.jobId }, session);
      return application.populate(applicationPopulation.map(option => ({ ...option, ordered: true })));
    });
  }

  static async withdraw(id: string, candidate: IUserDocument): Promise<IApplicationDocument> {
    return transaction(async (session) => {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid application ID format', 400);
      const application = await Application.findOne({ _id: id, candidateId: candidate._id }).session(session);
      if (!application) throw new AppError('Application not found', 404);
      if (['hired', 'rejected', 'withdrawn'].includes(application.stage)) {
        throw new AppError(`Cannot withdraw an application in '${application.stage}' stage`, 409);
      }
      application.stage = 'withdrawn';
      application.statusHistory.push({ stage: 'withdrawn', changedBy: candidate._id, changedAt: new Date() });
      await application.save({ session });
      await NotificationService.notifyCompanyRecruiters(application.companyId, { type: 'application_withdrawn', title: 'Application withdrawn', message: `${candidate.fullName} withdrew an application.`, applicationId: application._id, jobId: application.jobId }, session);
      return application.populate(applicationPopulation.map(option => ({ ...option, ordered: true })));
    });
  }

  private static async findPaginated(filter: FilterQuery<IApplicationDocument>, query: ApplicationQuery): Promise<PaginatedResult<IApplicationDocument>> {
    const skip = (query.page - 1) * query.limit;
    const [records, totalRecords] = await Promise.all([
      Application.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(query.limit).populate(applicationPopulation),
      Application.countDocuments(filter),
    ]);
    return { records, meta: { page: query.page, limit: query.limit, totalRecords, totalPages: Math.max(1, Math.ceil(totalRecords / query.limit)) } };
  }
}
