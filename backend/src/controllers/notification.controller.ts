import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationService.list(req.user!._id, Number(req.query.page), Number(req.query.limit));
  return sendSuccess(res, { message: 'Notifications retrieved', data: { notifications: result.notifications, unreadCount: result.unreadCount }, meta: result.meta });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await NotificationService.markRead(req.params.id, req.user!._id);
  return sendSuccess(res, { message: 'Notification marked as read', data: { notification } });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const updatedCount = await NotificationService.markAllRead(req.user!._id);
  return sendSuccess(res, { message: 'All notifications marked as read', data: { updatedCount } });
});
