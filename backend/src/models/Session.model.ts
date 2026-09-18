import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISession {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  familyId: string;
  userAgent?: string;
  ipAddress?: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionDocument extends ISession, Document {}

export interface ISessionModel extends Model<ISessionDocument> {}

const SessionSchema = new Schema<ISessionDocument, ISessionModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: 'Unknown Device',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // MongoDB TTL index automatically removes expired sessions
    },
  },
  {
    timestamps: true,
  }
);

export const Session = mongoose.model<ISessionDocument, ISessionModel>('Session', SessionSchema);
