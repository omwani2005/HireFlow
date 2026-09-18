import crypto from 'crypto';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

const schema = new mongoose.Schema({ _id: String, count: { type: Number, default: 0 }, expiresAt: { type: Date, expires: 0 } });
export const RateLimitBucket = mongoose.model('RateLimitBucket', schema);

// Shared fixed windows across API instances; TTL cleans expired buckets.
export const rateLimit = (name: string, max: number, windowMs: number) => asyncHandler(async (req, res, next) => {
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  const identity = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex');
  const key = name + ':' + identity + ':' + window;
  const expiresAt = new Date((window + 1) * windowMs);
  let bucket;
  try {
    bucket = await RateLimitBucket.findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, new: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    bucket = await RateLimitBucket.findOneAndUpdate({ _id: key }, { $inc: { count: 1 } }, { new: true });
  }
  if (!bucket || bucket.count > max) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)));
    throw new AppError('Too many requests. Please try again later.', 429);
  }
  next();
});
