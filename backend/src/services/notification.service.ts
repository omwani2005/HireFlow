import mongoose from 'mongoose';
import { Notification, NotificationType } from '../models/Notification.model';
import { User } from '../models/User.model';
import { AppError } from '../utils/AppError';

interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
}

export class NotificationService {
  static async notifyUser(userId: mongoose.Types.ObjectId, input: NotificationInput, session?: mongoose.ClientSession) {
    const [notification] = await Notification.create([{ userId, ...input }], { session });
    return notification;
  }

  static async notifyCompanyRecruiters(companyId: mongoose.Types.ObjectId, input: NotificationInput, session?: mongoose.ClientSession) {
    const recruiters = await User.find({ companyId, role: 'recruiter' }).select('_id').session(session ?? null);
    if (!recruiters.length) return;
    await Notification.insertMany(recruiters.map(({ _id }) => ({ userId: _id, ...input })), { session });
  }

  static async list(userId: mongoose.Types.ObjectId, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [notifications, totalRecords, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, readAt: null }),
    ]);
    return { notifications, unreadCount, meta: { page, limit, totalRecords, totalPages: Math.max(1, Math.ceil(totalRecords / limit)) } };
  }

  static async markRead(id: string, userId: mongoose.Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid notification ID format', 400);
    const notification = await Notification.findOneAndUpdate({ _id: id, userId }, { $set: { readAt: new Date() } }, { new: true });
    if (!notification) throw new AppError('Notification not found', 404);
    return notification;
  }

  static async markAllRead(userId: mongoose.Types.ObjectId) {
    const result = await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
    return result.modifiedCount;
  }
}
