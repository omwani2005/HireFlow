import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const developmentAccessSecret = 'development_jwt_access_secret_min_32_chars_placeholder';
const developmentRefreshSecret = 'development_jwt_refresh_secret_min_32_chars_placeholder';
const envSchema = z.object({
  EMAIL_PROVIDER: z.enum(['smtp', 'resend']).default('smtp'),
  RESEND_API_KEY: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  EMAIL_FROM: z.string().default(''),
  REQUIRE_EMAIL_VERIFICATION: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SERVE_FRONTEND: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  CLIENT_URL: z.string().default(process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/hireflow'),
  JWT_ACCESS_SECRET: z.string().min(32).default(developmentAccessSecret),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32).default(developmentRefreshSecret),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(/^[1-9][0-9]{0,4}[smhd]$/).default('7d'),
  RESUME_STORAGE_DIR: z.string().default('./private-uploads/resumes'),
  RESUME_STORAGE_PROVIDER: z.enum(['local', 'gridfs']).default('local'),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production') {
    const origins = value.CLIENT_URL.split(',').map(origin => origin.trim());
    if (origins.some(origin => { try { const url = new URL(origin); return url.protocol !== 'https:' || url.origin !== origin; } catch { return true; } })) context.addIssue({ code: z.ZodIssueCode.custom, path: ['CLIENT_URL'], message: 'Use exact HTTPS frontend origins without paths or trailing slashes' });
    if (!value.EMAIL_FROM || (value.EMAIL_PROVIDER === 'smtp' ? !value.SMTP_HOST : !value.RESEND_API_KEY)) context.addIssue({ code: z.ZodIssueCode.custom, path: [value.EMAIL_PROVIDER === 'smtp' ? 'SMTP_HOST' : 'RESEND_API_KEY'], message: 'Production requires EMAIL_FROM and credentials for the selected email provider' });
    if (value.RESUME_STORAGE_PROVIDER !== 'gridfs') context.addIssue({ code: z.ZodIssueCode.custom, path: ['RESUME_STORAGE_PROVIDER'], message: 'Production requires durable GridFS resume storage' });
  }
  if (value.NODE_ENV === 'production' && (value.JWT_ACCESS_SECRET === developmentAccessSecret || value.JWT_REFRESH_SECRET === developmentRefreshSecret || /placeholder/i.test(value.JWT_ACCESS_SECRET + value.JWT_REFRESH_SECRET))) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Production requires unique non-placeholder JWT secrets of at least 32 characters', path: ['JWT_ACCESS_SECRET'] });
  }
  if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Access and refresh secrets must be different', path: ['JWT_REFRESH_SECRET'] });
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type Environment = z.infer<typeof envSchema>;
