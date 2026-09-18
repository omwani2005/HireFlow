export type JobStatus = 'draft' | 'published' | 'closed';

export interface CompanySummary {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  location?: string;
  industry?: string;
  description?: string;
  website?: string;
  companySize?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  companyId: CompanySummary;
  skillsRequired: string[];
  location: string;
  workplaceType: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  status: JobStatus;
  applicationDeadline?: string | null;
  createdAt: string;
  responsibilities?: string[];
  qualifications?: string[];
  benefits?: string[];
  openings?: number;
  applicationCount?: number;
}

export type ApplicationStage = 'applied' | 'screening' | 'shortlisted' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';

export interface Application {
  _id: string;
  stage: ApplicationStage;
  coverLetter?: string;
  jobId: Job;
  companyId: CompanySummary;
  createdAt: string;
  updatedAt: string;
  candidateId: {
    _id: string;
    fullName: string;
    email: string;
    designation?: string;
    candidateProfile?: { headline?: string; skills?: string[]; location?: string; experienceYears?: number; resumeUrl?: string; resume?: { originalFilename: string; size: number; uploadedAt: string; parseStatus: string } };
  };
  statusHistory?: Array<{ stage: ApplicationStage; changedAt: string; note?: string; changedBy: string }>;
}

export interface JobInput {
  title: string; description: string; skillsRequired: string[]; location: string;
  workplaceType: Job['workplaceType']; employmentType: Job['employmentType']; experienceLevel: Job['experienceLevel'];
  salaryMin: number; salaryMax: number; salaryCurrency: string; isSalaryNegotiable: boolean; status: JobStatus;
  openings: number; responsibilities: string[]; qualifications: string[]; benefits: string[]; applicationDeadline?: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}
