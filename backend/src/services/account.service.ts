import bcrypt from 'bcryptjs';
import { User } from '../models/User.model';
import { Session } from '../models/Session.model';
import { generateRefreshToken, hashToken } from '../utils/token.util';
import { transaction } from '../utils/transaction';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { sendAccountEmail } from './email.service';

export class AccountService {
  static async request(email: string, purpose: 'verify' | 'reset'): Promise<void> {
    const token = generateRefreshToken();
    const prefix = purpose === 'verify' ? 'verification' : 'reset';
    const user = await User.findOneAndUpdate(
      { email, ...(purpose === 'verify' ? { isEmailVerified: false } : {}) },
      { $set: { [`${prefix}TokenHash`]: hashToken(token), [`${prefix}ExpiresAt`]: new Date(Date.now() + 30 * 60_000) } },
    );
    if (!user) return;
    const origin = env.CLIENT_URL.split(',')[0].trim();
    const link = `${origin}/${purpose === 'verify' ? 'verify-email' : 'reset-password'}#token=${token}`;
    try {
      await sendAccountEmail(user.email, purpose === 'verify' ? 'Verify your HireFlow email' : 'Reset your HireFlow password',
        `Open this link to ${purpose === 'verify' ? 'verify your email' : 'reset your password'}: ${link}\nThis link expires in 30 minutes. If you did not request it, ignore this email.`);
    } catch {
      // Never expose account existence, email contents, or provider credentials in logs/responses.
      console.error(JSON.stringify({ event: 'account_email_failed', purpose }));
    }
  }

  static async verify(token: string): Promise<void> {
    const user = await User.findOneAndUpdate(
      { verificationTokenHash: hashToken(token), verificationExpiresAt: { $gt: new Date() } },
      { $set: { isEmailVerified: true }, $unset: { verificationTokenHash: '', verificationExpiresAt: '' } },
    );
    if (!user) throw new AppError('This verification link is invalid or expired. Request another email.', 400);
  }

  static async reset(token: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12);
    await transaction(async (session) => {
      const user = await User.findOneAndUpdate(
        { resetTokenHash: hashToken(token), resetExpiresAt: { $gt: new Date() } },
        { $set: { passwordHash }, $inc: { authVersion: 1 }, $unset: { resetTokenHash: '', resetExpiresAt: '' } },
        { session },
      );
      if (!user) throw new AppError('This reset link is invalid or expired. Request another email.', 400);
      await Session.deleteMany({ userId: user._id }, { session });
    });
  }
}
