import { Router } from 'express';
import { z } from 'zod';
import { AccountService } from '../services/account.service';
import { validate } from '../middlewares/validate.middleware';
import { rateLimit } from '../middlewares/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();
const email = z.object({ email: z.string().trim().email().toLowerCase() });
const token = z.string().regex(/^[a-f0-9]{80}$/);

for (const [path, purpose] of [['forgot-password', 'reset'], ['resend-verification', 'verify']] as const) {
  router.post(`/${path}`, rateLimit(path, 10, 15 * 60_000), validate(email), asyncHandler(async (req, res) => {
    await AccountService.request(req.body.email, purpose);
    return sendSuccess(res, { message: 'If the account is eligible, an email will arrive shortly. Check your inbox and spam folder.' });
  }));
}
router.post('/verify-email', rateLimit('verify-email', 20, 15 * 60_000), validate(z.object({ token })), asyncHandler(async (req, res) => {
  await AccountService.verify(req.body.token);
  return sendSuccess(res, { message: 'Email verified. You can now sign in.' });
}));
router.post('/reset-password', rateLimit('reset-password', 20, 15 * 60_000), validate(z.object({ token, password: z.string().min(12).max(72).refine(value => Buffer.byteLength(value) <= 72, 'Password must be at most 72 bytes') })), asyncHandler(async (req, res) => {
  await AccountService.reset(req.body.token, req.body.password);
  return sendSuccess(res, { message: 'Password updated. Sign in with your new password.' });
}));
export default router;
