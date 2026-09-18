import mongoose, { Document, Model, Schema } from 'mongoose';

export const applicationStages = [
  'applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn',
] as const;

export type ApplicationStage = (typeof applicationStages)[number];

export interface IApplicationStatusHistory {
  stage: ApplicationStage;
  changedBy: mongoose.Types.ObjectId;
  note?: string;
  changedAt: Date;
}

export interface IApplication {
  candidateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  stage: ApplicationStage;
  coverLetter?: string;
  statusHistory: IApplicationStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IApplicationDocument extends IApplication, Document {}
export interface IApplicationModel extends Model<IApplicationDocument> {}

const StatusHistorySchema = new Schema<IApplicationStatusHistory>(
  {
    stage: { type: String, enum: applicationStages, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    changedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false }
);

const ApplicationSchema = new Schema<IApplicationDocument, IApplicationModel>(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    stage: { type: String, enum: applicationStages, default: 'applied', index: true },
    coverLetter: { type: String, trim: true, maxlength: 4000, default: '' },
    statusHistory: { type: [StatusHistorySchema], default: [] },
  },
  { timestamps: true }
);

// Enforced at the database level to make duplicate applications impossible under races.
ApplicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });
ApplicationSchema.index({ companyId: 1, jobId: 1, stage: 1, updatedAt: -1 });
ApplicationSchema.index({ candidateId: 1, updatedAt: -1 });

export const Application = mongoose.model<IApplicationDocument, IApplicationModel>(
  'Application',
  ApplicationSchema
);
