import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface ICandidateProfile {
  headline?: string;
  bio?: string;
  skills?: string[];
  experienceYears?: number;
  location?: string;
  summary?: string;
  education?: IResumeEntry[];
  experience?: IResumeEntry[];
  projects?: IResumeEntry[];
  certifications?: string[];
  resumeUrl?: string;
  resumePublicId?: string;
  resumeRawText?: string;
  parsedSkills?: string[];
  resume?: IResumeMetadata;
  parsedResume?: IParsedResume;
}

export interface IResumeMetadata { originalFilename: string; storageKey: string; size: number; uploadedAt: Date; parseStatus: 'pending' | 'completed' | 'failed'; parsedAt?: Date; }
export interface IResumeEntry { title?: string; organization?: string; description?: string; date?: string; }
export interface IParsedResume { fullName?: string; email?: string; phone?: string; location?: string; summary?: string; skills: string[]; education: IResumeEntry[]; experience: IResumeEntry[]; projects: IResumeEntry[]; certifications: string[]; }

export interface IUser {
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  companyId?: mongoose.Types.ObjectId | null;
  designation?: string;
  candidateProfile?: ICandidateProfile;
  isEmailVerified: boolean;
  authVersion: number;
  verificationTokenHash?: string;
  verificationExpiresAt?: Date;
  resetTokenHash?: string;
  resetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUserDocument> {}

const CandidateProfileSchema = new Schema<ICandidateProfile>(
  {
    headline: { type: String, default: '' },
    bio: { type: String, default: '' },
    skills: [{ type: String, lowercase: true, trim: true }],
    experienceYears: { type: Number, default: 0 },
    location: { type: String, default: '' },
    summary: { type: String, default: '', maxlength: 2000 },
    education: [{ title: String, organization: String, description: String, date: String }],
    experience: [{ title: String, organization: String, description: String, date: String }],
    projects: [{ title: String, organization: String, description: String, date: String }],
    certifications: [{ type: String, trim: true }],
    resumeUrl: { type: String, default: '' },
    resumePublicId: { type: String, default: '' },
    resumeRawText: { type: String, default: '', select: false },
    parsedSkills: [{ type: String, lowercase: true, trim: true }],
    resume: {
      originalFilename: { type: String, default: '' }, storageKey: { type: String, default: '', select: false }, size: { type: Number, default: 0 }, uploadedAt: { type: Date }, parseStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }, parsedAt: { type: Date },
    },
    parsedResume: {
      fullName: { type: String, default: '' }, email: { type: String, default: '' }, phone: { type: String, default: '' }, location: { type: String, default: '' }, summary: { type: String, default: '' }, skills: [{ type: String, lowercase: true, trim: true }], education: [{ title: String, organization: String, description: String, date: String }], experience: [{ title: String, organization: String, description: String, date: String }], projects: [{ title: String, organization: String, description: String, date: String }], certifications: [{ type: String, trim: true }],
    },
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument, IUserModel>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [60, 'Full name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['candidate', 'recruiter', 'admin'],
      default: 'candidate',
      index: true,
    },
    avatarUrl: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    designation: { type: String, default: '' },
    candidateProfile: {
      type: CandidateProfileSchema,
      default: () => ({}),
    },
    authVersion: { type: Number, default: 0 },
    verificationTokenHash: { type: String, select: false },
    verificationExpiresAt: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetExpiresAt: { type: Date, select: false },
    isEmailVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Password comparison method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);
