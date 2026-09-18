import mongoose from 'mongoose';
import { env } from './env';

export type DatabaseStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

let dbStatus: DatabaseStatus = 'disconnected';

export const getDBStatus = (): DatabaseStatus => {
  const readyState = mongoose.connection.readyState;
  switch (readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 0:
    default:
      return dbStatus === 'error' ? 'error' : 'disconnected';
  }
};

export const connectDB = async (): Promise<void> => {
  try {
    dbStatus = 'connecting';
    console.log(`[Database] Attempting connection to MongoDB...`);

    mongoose.connection.on('connected', () => {
      dbStatus = 'connected';
      console.log('[Database] MongoDB connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      dbStatus = 'error';
      console.error('[Database] MongoDB runtime error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      dbStatus = 'disconnected';
      console.warn('[Database] MongoDB disconnected.');
    });

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  } catch (error) {
    dbStatus = 'error';
    console.warn('[Database] Failed to connect to MongoDB on initial startup.');
    if (env.NODE_ENV === 'development') {
      console.warn('[Database] Running in development mode: Server will continue running, but DB-dependent routes will fail until MongoDB is available.');
    } else {
      console.error('[Database] Fatal database connection error in non-development environment:', error);
      throw error;
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[Database] MongoDB connection closed.');
    }
  } catch (error) {
    console.error('[Database] Error during MongoDB disconnection:', error);
  }
};
