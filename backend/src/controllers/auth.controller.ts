import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getRefreshTokenCookieOptions, getClearCookieOptions } from '../utils/token.util';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await AuthService.register(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: { user },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

  const { user, accessToken, refreshToken } = await AuthService.login(
    req.body,
    userAgent,
    ipAddress
  );

  // Set HTTP-only secure cookie
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Login successful',
    data: {
      user,
      accessToken,
    },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

  const { user, accessToken, refreshToken } = await AuthService.rotateRefreshToken(
    rawRefreshToken,
    userAgent,
    ipAddress
  );

  // Set updated rotated HTTP-only cookie
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Session refreshed successfully',
    data: {
      user,
      accessToken,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.refreshToken;

  await AuthService.logoutCurrentSession(rawRefreshToken);
  res.clearCookie('refreshToken', getClearCookieOptions());

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logged out successfully from this device',
  });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await AuthService.logoutAllSessions(req.user._id);
  }

  res.clearCookie('refreshToken', getClearCookieOptions());

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logged out successfully from all active devices',
  });
});

export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  const sessions = await AuthService.getActiveSessions(req.user!._id, rawRefreshToken);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Active sessions retrieved',
    data: { sessions },
  });
});
