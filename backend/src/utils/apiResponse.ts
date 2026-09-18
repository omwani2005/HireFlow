import { Response } from 'express';

export interface ApiResponseOptions<T = unknown> {
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export const sendSuccess = <T>(
  res: Response,
  options: ApiResponseOptions<T> = {}
): Response => {
  const { statusCode = 200, message = 'Success', data, meta } = options;

  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    ...(data !== undefined && { data }),
    ...(meta !== undefined && { meta }),
  });
};

export interface ApiErrorResponseOptions {
  statusCode?: number;
  message?: string;
  errors?: unknown;
}

export const sendError = (
  res: Response,
  options: ApiErrorResponseOptions = {}
): Response => {
  const {
    statusCode = 500,
    message = 'An unexpected error occurred',
    errors,
  } = options;

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(errors !== undefined && { errors }),
  });
};
