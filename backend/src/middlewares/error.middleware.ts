import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/apiResponse';
import { env } from '../config/env';
import multer from 'multer';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors: unknown = err.details || undefined;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.flatten().fieldErrors;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err instanceof multer.MulterError) {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Resume files must not exceed 5 MB' : 'Invalid file upload';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}: ${err.value}`;
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}`;
  }

  // Handle body-parser JSON syntax error
  if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload in request body';
  }

  // In development, log full stack trace for operational diagnostics
  if (env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('[Error Middleware] 500 Uncaught Server Exception:', err);
  }

  if (statusCode >= 500) {
    console.error(JSON.stringify({ event: 'request_failed', requestId: res.getHeader('X-Request-ID'), method: _req.method, path: _req.path, errorType: err.name || 'Error' }));
    if (env.NODE_ENV === 'production') { message = 'An unexpected error occurred. Please retry.'; errors = undefined; }
  }
  sendError(res, {
    statusCode,
    message,
    errors,
  });
};
