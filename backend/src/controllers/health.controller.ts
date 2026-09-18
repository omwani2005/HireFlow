import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { getDBStatus } from '../config/db';
import { env } from '../config/env';

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const connected = getDBStatus() === 'connected';
  const healthData = {
    status: connected ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    database: getDBStatus(),
  };

  return sendSuccess(res, {
    statusCode: connected ? 200 : 503,
    message: connected ? 'HireFlow API operational' : 'Database unavailable',
    data: healthData,
  });
});
