import http from 'http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';

const startServer = async () => {
  // 1. Establish MongoDB connection
  await connectDB();

  // 2. Initialize Express application
  const app = createApp();
  const server = http.createServer(app);

  // 3. Start listening on configured port
  server.listen(env.PORT, () => {
    console.log(`====================================================`);
    console.log(`?? HireFlow ATS Backend running in [${env.NODE_ENV}] mode`);
    console.log(`?? URL: http://localhost:${env.PORT}`);
    console.log(`?? Health check: http://localhost:${env.PORT}/api/v1/health`);
    console.log(`====================================================`);
  });

  // 4. Graceful Shutdown Management
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      console.log('[Server] Graceful shutdown process complete.');
      process.exit(0);
    });

    // Force exit if shutdown hangs beyond 10 seconds
    setTimeout(() => {
      console.error('[Server] Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[Server] Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (err: Error) => {
    console.error('[Server] Uncaught Exception:', err);
    process.exit(1);
  });
};

startServer();
