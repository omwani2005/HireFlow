import mongoose, { Document, Model, Schema } from 'mongoose';

export type JobStatus = 'draft' | 'published' | 'closed';
export type WorkplaceType = 'remote' | 'hybrid' | 'onsite';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

export interface IJob {
  title: string;
  description: string;
  companyId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  skillsRequired: string[];
  location: string;
  workplaceType: WorkplaceType;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  isSalaryNegotiable: boolean;
  status: JobStatus;
  openings: number;
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  applicationDeadline?: Date | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobDocument extends IJob, Document {}

export interface IJobModel extends Model<IJobDocument> {}

const JobSchema = new Schema<IJobDocument, IJobModel>(
  {
    archivedAt: { type: Date, default: null, index: true },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [3, 'Job title must be at least 3 characters'],
      maxlength: [120, 'Job title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      minlength: [10, 'Job description must be at least 10 characters'],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required'],
      index: true,
    },
    skillsRequired: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      index: true,
    },
    workplaceType: {
      type: String,
      enum: ['remote', 'hybrid', 'onsite'],
      default: 'remote',
      index: true,
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship'],
      default: 'full-time',
      index: true,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
      default: 'mid',
      index: true,
    },
    salaryMin: {
      type: Number,
      required: [true, 'Minimum salary is required'],
      min: [0, 'Minimum salary cannot be negative'],
    },
    salaryMax: {
      type: Number,
      required: [true, 'Maximum salary is required'],
      min: [0, 'Maximum salary cannot be negative'],
    },
    salaryCurrency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    isSalaryNegotiable: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
      index: true,
    },
    openings: {
      type: Number,
      default: 1,
      min: [1, 'At least 1 opening is required'],
    },
    responsibilities: [{ type: String, trim: true }],
    qualifications: [{ type: String, trim: true }],
    benefits: [{ type: String, trim: true }],
    applicationDeadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Full-text search index on title, description, and skillsRequired
JobSchema.index(
  { title: 'text', description: 'text', skillsRequired: 'text' },
  { weights: { title: 10, skillsRequired: 5, description: 1 } }
);

// Compound indexes for fast query filtering and sorting
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ companyId: 1, status: 1 });
JobSchema.index({ createdBy: 1, status: 1 });

export const Job = mongoose.model<IJobDocument, IJobModel>('Job', JobSchema);
