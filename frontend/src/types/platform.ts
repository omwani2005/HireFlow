import { Application } from './jobs';
import { User } from './auth';

export interface Notification { _id: string; type: string; title: string; message: string; readAt?: string | null; createdAt: string; applicationId?: string; jobId?: string }
export interface MatchResult { overallScore: number; skillScore: number; experienceScore: number; educationScore: number; projectScore: number; matchedSkills: string[]; missingSkills: string[]; strengths: string[]; explanation: string }
export interface CandidateAnalytics { totalApplications: number; activeApplications: number; byStage: Record<string, number>; recentApplications: Application[]; profile: { hasResume: boolean; skillsCount: number } }
export interface RecruiterAnalytics { totalJobs: number; publishedJobs: number; draftJobs: number; closedJobs: number; totalApplicants: number; byStage: Record<string, number>; recentApplications: Application[] }
export interface AdminAnalytics { users: number; candidates: number; recruiters: number; jobs: number; publishedJobs: number; applications: number; byStage: Record<string, number> }
export interface AdminUsersResult { users: User[] }
