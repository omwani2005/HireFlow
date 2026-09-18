import mongoose from 'mongoose';
import { Application } from '../models/Application.model';
import { Job } from '../models/Job.model';
import { IUserDocument, User } from '../models/User.model';
import { AppError } from '../utils/AppError';

export interface MatchResult {
  overallScore: number; skillScore: number; experienceScore: number; educationScore: number; projectScore: number;
  matchedSkills: string[]; missingSkills: string[]; strengths: string[]; explanation: string;
}

const normalize = (values: string[]) => [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
const overlapScore = (text: string, terms: string[]) => terms.length ? Math.round(terms.filter((term) => text.includes(term)).length / terms.length * 100) : 100;

export class MatchingService {
  static score(job: { skillsRequired: string[]; description: string; experienceLevel: string }, candidate: IUserDocument): MatchResult {
    const profile = candidate.candidateProfile;
    const candidateSkills = normalize([...(profile?.skills || []), ...(profile?.parsedSkills || []), ...(profile?.parsedResume?.skills || [])]);
    const required = normalize(job.skillsRequired || []);
    const matchedSkills = required.filter((skill) => candidateSkills.includes(skill));
    const missingSkills = required.filter((skill) => !candidateSkills.includes(skill));
    const skillScore = required.length ? Math.round(matchedSkills.length / required.length * 100) : 100;
    const requiredYears = ({ entry: 0, mid: 2, senior: 5, lead: 7, executive: 10 } as Record<string, number>)[job.experienceLevel] || 0;
    const years = profile?.experienceYears || 0;
    const experienceText = (profile?.experience || profile?.parsedResume?.experience || []).map((item) => `${item.title || ''} ${item.description || ''}`).join(' ').toLowerCase();
    const descriptionTerms = normalize(job.description.split(/[^a-zA-Z+#.]+/).filter((word) => word.length > 4)).slice(0, 20);
    const relevance = overlapScore(experienceText, descriptionTerms);
    const experienceScore = requiredYears === 0 ? Math.max(70, relevance) : Math.round(Math.min(100, (years / requiredYears) * 75 + relevance * .25));
    const education = profile?.education || profile?.parsedResume?.education || [];
    const projects = profile?.projects || profile?.parsedResume?.projects || [];
    const educationScore = education.length ? 100 : 50;
    const projectText = projects.map((item) => `${item.title || ''} ${item.description || ''}`).join(' ').toLowerCase();
    const projectScore = projects.length ? Math.max(60, overlapScore(projectText, descriptionTerms)) : 40;
    const overallScore = Math.round(skillScore * .55 + experienceScore * .25 + educationScore * .1 + projectScore * .1);
    const strengths = [matchedSkills.length ? `${matchedSkills.length} required skill${matchedSkills.length === 1 ? '' : 's'} matched` : '', years ? `${years} years of stated experience` : '', projects.length ? `${projects.length} relevant project record${projects.length === 1 ? '' : 's'} available` : ''].filter(Boolean);
    return { overallScore, skillScore, experienceScore, educationScore, projectScore, matchedSkills, missingSkills, strengths, explanation: `Deterministic comparison of the candidate's stated profile and parsed resume against this job. It is decision support only and must not be used as an automatic hiring decision.` };
  }

  static async forApplication(applicationId: string, actor: IUserDocument) {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) throw new AppError('Invalid application ID format', 400);
    const application = await Application.findById(applicationId);
    if (!application) throw new AppError('Application not found', 404);
    if (actor.role !== 'admin' && (!actor.companyId || !application.companyId.equals(actor.companyId))) throw new AppError('Forbidden: You cannot score this application', 403);
    const [job, candidate] = await Promise.all([Job.findById(application.jobId), User.findById(application.candidateId)]);
    if (!job || !candidate) throw new AppError('Application data is incomplete', 404);
    return this.score(job, candidate);
  }
}
