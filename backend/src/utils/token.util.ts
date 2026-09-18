import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { CookieOptions } from 'express';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
  authVersion?: number;
}

export const signAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    jwtid: crypto.randomUUID(), // RFC 7519 unique JWT ID ensures cryptographic uniqueness
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

export const generateFamilyId = (): string => {
  return crypto.randomUUID();
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const refreshLifetimeMs = (): number => {
  const value = env.JWT_REFRESH_EXPIRES_IN;
  const factors: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(value.slice(0, -1)) * factors[value.slice(-1)];
};

export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: refreshLifetimeMs(),
  };
};

export const getClearCookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
  };
};
