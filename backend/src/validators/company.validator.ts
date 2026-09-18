import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z
    .string({ required_error: 'Company name is required' })
    .trim()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name cannot exceed 100 characters'),
  description: z
    .string({ required_error: 'Company description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  logoUrl: z.string().trim().url().or(z.literal('')).optional(),
  website: z.string().trim().url().or(z.literal('')).optional(),
  industry: z
    .string({ required_error: 'Industry is required' })
    .trim()
    .min(2, 'Industry is required'),
  companySize: z
    .enum(['1-10', '11-50', '51-200', '201-500', '500+'])
    .default('11-50'),
  location: z
    .string({ required_error: 'Company location is required' })
    .trim()
    .min(2, 'Location is required'),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
