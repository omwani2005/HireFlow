import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface StoredFile { storageKey: string }
export interface RetrievedFile { path?: string; buffer?: Buffer }

const bucket = () => {
  if (!mongoose.connection.db) throw new AppError('File storage is unavailable', 503);
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'resumes' });
};

export class StorageService {
  static async put(ownerId: string, originalFilename: string, data: Buffer): Promise<StoredFile> {
    if (env.RESUME_STORAGE_PROVIDER === 'gridfs') {
      const stream = bucket().openUploadStream(path.basename(originalFilename), { contentType: 'application/pdf', metadata: { ownerId } });
      await new Promise<void>((resolve, reject) => { stream.on('error', reject); stream.on('finish', () => resolve()); stream.end(data); });
      return { storageKey: stream.id.toString() };
    }
    const directory = path.resolve(env.RESUME_STORAGE_DIR); await fs.mkdir(directory, { recursive: true });
    const storageKey = `${ownerId}-${crypto.randomUUID()}.pdf`; await fs.writeFile(path.join(directory, storageKey), data, { flag: 'wx' });
    return { storageKey };
  }

  static async get(storageKey: string): Promise<RetrievedFile> {
    if (env.RESUME_STORAGE_PROVIDER === 'gridfs') {
      if (!mongoose.Types.ObjectId.isValid(storageKey)) throw new AppError('Resume not found', 404);
      const chunks: Buffer[] = []; const stream = bucket().openDownloadStream(new mongoose.Types.ObjectId(storageKey));
      const buffer = await new Promise<Buffer>((resolve, reject) => { stream.on('data', (chunk: Buffer) => chunks.push(chunk)); stream.on('error', reject); stream.on('end', () => resolve(Buffer.concat(chunks))); }).catch(() => { throw new AppError('Resume not found', 404); });
      return { buffer };
    }
    return { path: path.join(path.resolve(env.RESUME_STORAGE_DIR), path.basename(storageKey)) };
  }

  static async delete(storageKey?: string): Promise<void> {
    if (!storageKey) return;
    if (env.RESUME_STORAGE_PROVIDER === 'gridfs') { if (mongoose.Types.ObjectId.isValid(storageKey)) await bucket().delete(new mongoose.Types.ObjectId(storageKey)).catch(() => undefined); return; }
    await fs.unlink(path.join(path.resolve(env.RESUME_STORAGE_DIR), path.basename(storageKey))).catch(() => undefined);
  }
}
