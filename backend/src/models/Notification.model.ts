import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 'application_submitted' | 'application_withdrawn' | 'application_stage_changed';

export interface INotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['application_submitted', 'application_withdrawn', 'application_stage_changed'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
  readAt: { type: Date, default: null },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const Notification = mongoose.model<INotificationDocument>('Notification', NotificationSchema);
