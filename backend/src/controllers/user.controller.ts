import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ResumeService } from '../services/resume.service';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  return sendSuccess(res, {
    statusCode: 200,
    message: 'User profile retrieved',
    data: { user: req.user },
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const updates: Record<string, unknown> = {};
  for (const field of ['fullName', 'phoneNumber', 'avatarUrl', 'designation'] as const) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (req.body.candidateProfile !== undefined) {
    if (req.user!.role !== 'candidate') throw new AppError('Only candidates can update candidate profile fields', 403);
    for (const [field, value] of Object.entries(req.body.candidateProfile)) {
      updates[`candidateProfile.${field}`] = value;
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Profile updated successfully',
    data: { user: updatedUser },
  });
});

export const uploadResume = asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== 'candidate') throw new AppError('Only candidates can upload a resume', 403);
  const user = await ResumeService.upload(req.user!, req.file);
  return sendSuccess(res, { statusCode: 201, message: 'Resume uploaded and parsed successfully', data: { user } });
});

export const downloadResume = asyncHandler(async (req: Request, res: Response) => {
  const file = await ResumeService.getResumeFile(req.params.id, req.user!);
  if (file.buffer) { res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${file.filename.replace(/["\\\r\n]/g, '_')}"`); return res.send(file.buffer); }
  return res.download(file.path!, file.filename);
});
