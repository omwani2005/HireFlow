import crypto from 'crypto';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { AppError } from './utils/AppError';
import { env } from './config/env';

export const createApp = (): Application => {
  const app: Application = express();
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use((_req, res, next) => { res.setHeader('X-Request-ID', crypto.randomUUID()); next(); });

  // Defensive HTTP Security Headers
  app.use(helmet());

  // Cross-Origin Resource Sharing Configuration
  const allowedOrigins = env.CLIENT_URL.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new AppError('Blocked by CORS policy', 403));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Cookie Parser Middleware for secure HTTP-only refresh tokens
  app.use(cookieParser());

  // Request Body Parsers with defensive size caps
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Root endpoint info
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'HireFlow ATS API',
      version: '1.0.0',
      status: 'operational',
      documentation: '/api/v1/health',
    });
  });

  // Mount API v1 Master Router
  app.use('/api/v1', routes);

  // Unmatched route 404 handler
  app.all('*', (req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server`, 404));
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
