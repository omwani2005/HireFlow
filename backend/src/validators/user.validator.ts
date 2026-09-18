import { z } from 'zod';

const profileEntrySchema = z.object({
  title: z.string().trim().max(150).optional(),
  organization: z.string().trim().max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  date: z.string().trim().max(100).optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(60).optional(),
  phoneNumber: z.string().trim().max(20).optional(),
  avatarUrl: z.string().trim().url().or(z.literal('')).optional(),
  designation: z.string().trim().max(100).optional(),
  candidateProfile: z
    .object({
      headline: z.string().trim().max(150).optional(),
      bio: z.string().trim().max(1000).optional(),
      skills: z.array(z.string().trim().toLowerCase()).optional(),
      experienceYears: z.number().min(0).max(50).optional(),
      location: z.string().trim().max(100).optional(),
      summary: z.string().trim().max(2000).optional(),
      education: z.array(profileEntrySchema).max(20).optional(),
      experience: z.array(profileEntrySchema).max(30).optional(),
      projects: z.array(profileEntrySchema).max(30).optional(),
      certifications: z.array(z.string().trim().min(1).max(150)).max(30).optional(),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
