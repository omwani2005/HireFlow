import { AccountService } from './account.service';
import { isEmailConfigured } from './email.service';
import { env } from '../config/env';
import { transaction } from '../utils/transaction';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, IUserDocument } from '../models/User.model';
import { Session } from '../models/Session.model';
import {
  signAccessToken,
  refreshLifetimeMs,
  generateRefreshToken,
  generateFamilyId,
  hashToken,
} from '../utils/token.util';
import { AppError } from '../utils/AppError';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export interface AuthResult {
  user: Partial<IUserDocument>;
  accessToken: string;
  refreshToken: string;
}

export interface SessionInfo {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: Date;
  isCurrent: boolean;
}

export class AuthService {
  static async register(input: RegisterInput): Promise<Partial<IUserDocument>> {
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const user = await User.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: input.role,
      designation: input.designation || '',
      candidateProfile: {
        headline: input.headline || '',
      },
    });

    if (isEmailConfigured()) await AccountService.request(user.email, 'verify').catch(() => { console.error(JSON.stringify({ event: 'account_email_failed', purpose: 'verify' })); });
    const userObj = user.toObject();
    delete (userObj as any).passwordHash;
    return userObj;
  }

  static async login(
    input: LoginInput,
    userAgent: string = 'Unknown Device',
    ipAddress: string = '127.0.0.1'
  ): Promise<AuthResult> {
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    if ((env.NODE_ENV === 'production' || env.REQUIRE_EMAIL_VERIFICATION) && !user.isEmailVerified) throw new AppError('Verify your email before signing in. You can request a new verification email.', 403);

    // 1. Generate Access Token (15m)
    const accessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      authVersion: user.authVersion ?? 0,
    });

    // 2. Generate Refresh Token (7d) and new Session Family
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = generateFamilyId();
    const expiresAt = new Date(Date.now() + refreshLifetimeMs());

    // 3. Persist multi-device session in MongoDB
    await Session.create({
      userId: user._id,
      tokenHash,
      familyId,
      userAgent,
      ipAddress,
      isRevoked: false,
      expiresAt,
    });

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    return {
      user: userObj,
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  static async rotateRefreshToken(
    rawRefreshToken: string,
    userAgent: string = 'Unknown Device',
    ipAddress: string = '127.0.0.1'
  ): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new AppError('Unauthorized: Refresh token missing', 401);
    }

    const result = await transaction(async (dbSession) => {
      const incomingHash = hashToken(rawRefreshToken);

      // Find session by token hash
      const session = await Session.findOne({ tokenHash: incomingHash }).session(dbSession);

      if (!session) {
        throw new AppError('Unauthorized: Invalid refresh token', 401);
      }

      // Token Reuse Detection:
      if (session.isRevoked) {
        // Invalidate ALL sessions in this family lineage immediately
        await Session.updateMany(
          { familyId: session.familyId },
          { $set: { isRevoked: true } }, { session: dbSession }
        );
        return null;
      }

      // Check expiration
      if (new Date() > session.expiresAt) {
        session.isRevoked = true;
        await session.save({ session: dbSession });
        throw new AppError('Unauthorized: Session has expired. Please log in again.', 401);
      }

      const user = await User.findById(session.userId).session(dbSession);
      if (!user) {
        throw new AppError('Unauthorized: User belonging to session no longer exists', 401);
      }

      if ((env.NODE_ENV === 'production' || env.REQUIRE_EMAIL_VERIFICATION) && !user.isEmailVerified) throw new AppError('Verify your email before signing in.', 403);

      // 1. Revoke the used session to prevent replay
      session.isRevoked = true;
      await session.save({ session: dbSession });

      // 2. Mint new tokens in the SAME family lineage
      const newRawRefreshToken = generateRefreshToken();
      const newTokenHash = hashToken(newRawRefreshToken);
      const expiresAt = new Date(Date.now() + refreshLifetimeMs());

      await Session.create([{
        userId: user._id,
        tokenHash: newTokenHash,
        familyId: session.familyId,
        userAgent: userAgent || session.userAgent,
        ipAddress: ipAddress || session.ipAddress,
        isRevoked: false,
        expiresAt,
      }], { session: dbSession });

      const accessToken = signAccessToken({
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        authVersion: user.authVersion ?? 0,
    });

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    return {
      user: userObj,
      accessToken,
      refreshToken: newRawRefreshToken,
    };
    });
    if (!result) throw new AppError('Unauthorized: Token reuse detected. Please log in again.', 401);
    return result;
  }

  static async logoutCurrentSession(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = hashToken(rawRefreshToken);
    await Session.deleteOne({ tokenHash });
  }

  static async logoutAllSessions(userId: string | mongoose.Types.ObjectId): Promise<void> {
    await transaction(async session => {
      await User.updateOne({ _id: userId }, { $inc: { authVersion: 1 } }, { session });
      await Session.deleteMany({ userId }, { session });
    });
  }

  static async getActiveSessions(
    userId: string | mongoose.Types.ObjectId,
    currentRefreshToken?: string
  ): Promise<SessionInfo[]> {
    const sessions = await Session.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

    return sessions.map((s) => ({
      id: s._id.toString(),
      userAgent: s.userAgent || 'Unknown Device',
      ipAddress: s.ipAddress || '127.0.0.1',
      createdAt: s.createdAt,
      isCurrent: currentHash ? s.tokenHash === currentHash : false,
    }));
  }
}
