import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const requireTrustedOrigin = (req: Request, _res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (!origin || env.CLIENT_URL.split(',').map((value) => value.trim()).includes(origin)) return next();
  return next(new AppError('Blocked request from an untrusted origin', 403));
};
