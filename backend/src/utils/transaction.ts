import mongoose, { ClientSession } from 'mongoose';

// All production writes that span documents require a replica set (Atlas supports this).
export const transaction = <T>(work: (session: ClientSession) => Promise<T>): Promise<T> =>
  mongoose.connection.transaction(work);
