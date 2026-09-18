import { z } from 'zod';

export const createJobSchema = z
  .object({
    title: z
      .string({ required_error: 'Job title is required' })
      .trim()
      .min(3, 'Job title must be at least 3 characters')
      .max(120, 'Job title cannot exceed 120 characters'),
    description: z
      .string({ required_error: 'Job description is required' })
      .trim()
      .min(10, 'Job description must be at least 10 characters'),
    skillsRequired: z
      .array(z.string().trim().toLowerCase())
      .min(1, 'At least one required skill must be specified'),
    location: z
      .string({ required_error: 'Job location is required' })
      .trim()
      .min(2, 'Location is required'),
    workplaceType: z.enum(['remote', 'hybrid', 'onsite']).default('remote'),
    employmentType: z
      .enum(['full-time', 'part-time', 'contract', 'internship'])
      .default('full-time'),
    experienceLevel: z
      .enum(['entry', 'mid', 'senior', 'lead', 'executive'])
      .default('mid'),
    salaryMin: z
      .number({ required_error: 'Minimum salary is required' })
      .min(0, 'Minimum salary cannot be negative'),
    salaryMax: z
      .number({ required_error: 'Maximum salary is required' })
      .min(0, 'Maximum salary cannot be negative'),
    salaryCurrency: z.string().trim().default('USD'),
    isSalaryNegotiable: z.boolean().default(false),
    status: z.enum(['draft', 'published', 'closed']).default('draft'),
    openings: z.number().int().min(1, 'At least 1 opening is required').default(1),
    responsibilities: z.array(z.string().trim()).default([]),
    qualifications: z.array(z.string().trim()).default([]),
    benefits: z.array(z.string().trim()).default([]),
    applicationDeadline: z.string().or(z.date()).nullable().optional(),
  })
  .refine((data) => data.salaryMax >= data.salaryMin, {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['salaryMax'],
  });

export const updateJobSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(10).optional(),
    skillsRequired: z.array(z.string().trim().toLowerCase()).min(1).optional(),
    location: z.string().trim().min(2).optional(),
    workplaceType: z.enum(['remote', 'hybrid', 'onsite']).optional(),
    employmentType: z
      .enum(['full-time', 'part-time', 'contract', 'internship'])
      .optional(),
    experienceLevel: z
      .enum(['entry', 'mid', 'senior', 'lead', 'executive'])
      .optional(),
    salaryMin: z.number().min(0).optional(),
    salaryMax: z.number().min(0).optional(),
    salaryCurrency: z.string().trim().optional(),
    isSalaryNegotiable: z.boolean().optional(),
    status: z.enum(['draft', 'published', 'closed']).optional(),
    openings: z.number().int().min(1).optional(),
    responsibilities: z.array(z.string().trim()).optional(),
    qualifications: z.array(z.string().trim()).optional(),
    benefits: z.array(z.string().trim()).optional(),
    applicationDeadline: z.string().or(z.date()).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.salaryMin !== undefined && data.salaryMax !== undefined) {
        return data.salaryMax >= data.salaryMin;
      }
      return true;
    },
    {
      message: 'Maximum salary must be greater than or equal to minimum salary',
      path: ['salaryMax'],
    }
  );

export const jobStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'closed'], {
    required_error: 'Status is required and must be draft, published, or closed',
  }),
});

export const jobFilterQuerySchema = z.object({
  search: z.string().trim().optional(),
  location: z.string().trim().optional(),
  workplaceType: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  employmentType: z
    .enum(['full-time', 'part-time', 'contract', 'internship'])
    .optional(),
  experienceLevel: z
    .enum(['entry', 'mid', 'senior', 'lead', 'executive'])
    .optional(),
  skills: z.string().trim().optional(),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  sort: z.enum(['newest', 'oldest', 'salary_high', 'salary_low']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobStatusInput = z.infer<typeof jobStatusSchema>;
export type JobFilterQuery = z.infer<typeof jobFilterQuerySchema>;
