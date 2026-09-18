import multer from 'multer';
import { AppError } from '../utils/AppError';

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith('.pdf') || file.mimetype !== 'application/pdf') {
      callback(new AppError('Only PDF resume files are accepted', 400));
      return;
    }
    callback(null, true);
  },
});
