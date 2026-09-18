import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.util';
import { User, IUserDocument } from '../models/User.model';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      sessionId?: string;
    }
  }
}

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('Unauthorized: Access token missing or invalid', 401)
      );
    }

    try {
      const decoded = verifyAccessToken(token);

      const currentUser = await User.findById(decoded.userId);
      if (!currentUser || (decoded.authVersion ?? 0) !== (currentUser.authVersion ?? 0)) {
        return next(
          new AppError('Unauthorized: User belonging to this token no longer exists', 401)
        );
      }

      req.user = currentUser;
      next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Unauthorized: Access token has expired', 401));
      }
      return next(new AppError('Unauthorized: Invalid access token signature', 401));
    }
  }
);

export const optionalAuthenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      const currentUser = await User.findById(decoded.userId);
      if (currentUser && (decoded.authVersion ?? 0) === (currentUser.authVersion ?? 0)) {
        req.user = currentUser;
      }
    } catch {
      // Ignore token failure for public routes
    }

    next();
  }
);
