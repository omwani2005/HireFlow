import { z } from 'zod';
import { applicationStages } from '../models/Application.model';

export const createApplicationSchema = z.object({
  coverLetter: z.string().trim().max(4000).optional(),
});

export const updateApplicationStageSchema = z.object({
  stage: z.enum(applicationStages),
  note: z.string().trim().max(1000).optional(),
});

export const applicationQuerySchema = z.object({
  stage: z.enum(applicationStages).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStageInput = z.infer<typeof updateApplicationStageSchema>;
export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;
