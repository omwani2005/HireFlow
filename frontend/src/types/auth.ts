export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface CandidateProfile {
  headline?: string;
  bio?: string;
  skills?: string[];
  experienceYears?: number;
  location?: string;
  summary?: string;
  education?: ProfileEntry[];
  experience?: ProfileEntry[];
  projects?: ProfileEntry[];
  certifications?: string[];
  resumeUrl?: string;
  parsedSkills?: string[];
  resume?: { originalFilename: string; size: number; uploadedAt: string; parseStatus: 'pending' | 'completed' | 'failed'; parsedAt?: string };
  parsedResume?: { fullName?: string; email?: string; phone?: string; location?: string; summary?: string; skills: string[]; education: Array<{ title?: string }>; experience: Array<{ title?: string }>; projects: Array<{ title?: string }>; certifications: string[] };
}

export interface ProfileEntry { title?: string; organization?: string; description?: string; date?: string }

export interface User {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  companyId?: string | null;
  designation?: string;
  candidateProfile?: CandidateProfile;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  role: 'candidate' | 'recruiter';
  designation?: string;
  headline?: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  designation?: string;
  candidateProfile?: {
    headline?: string;
    bio?: string;
    skills?: string[];
    experienceYears?: number;
    location?: string;
    summary?: string;
    education?: ProfileEntry[];
    experience?: ProfileEntry[];
    projects?: ProfileEntry[];
    certifications?: string[];
  };
}

export interface SessionInfo {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface AuthResponseData {
  user: User;
  accessToken: string;
}
