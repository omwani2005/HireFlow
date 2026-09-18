import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notification } from '../src/models/Notification.model';
import { NotificationService } from '../src/services/notification.service';

describe('NotificationService ownership', () => {
  afterEach(() => vi.restoreAllMocks());

  it('scopes mark-read updates to the authenticated user', async () => {
    const userId = new mongoose.Types.ObjectId(); const notificationId = new mongoose.Types.ObjectId().toString();
    const spy = vi.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue({ _id: notificationId, userId } as never);
    await NotificationService.markRead(notificationId, userId);
    expect(spy).toHaveBeenCalledWith({ _id: notificationId, userId }, { $set: { readAt: expect.any(Date) } }, { new: true });
  });

  it('returns not found instead of exposing another user notification', async () => {
    vi.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(null);
    await expect(NotificationService.markRead(new mongoose.Types.ObjectId().toString(), new mongoose.Types.ObjectId())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects malformed identifiers before querying', async () => {
    const spy = vi.spyOn(Notification, 'findOneAndUpdate');
    await expect(NotificationService.markRead('invalid', new mongoose.Types.ObjectId())).rejects.toMatchObject({ statusCode: 400 });
    expect(spy).not.toHaveBeenCalled();
  });
});
