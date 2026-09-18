import nodemailer from 'nodemailer';
import { env } from '../config/env';

export const sendAccountEmail = async (to: string, subject: string, text: string): Promise<void> => {
  if (!env.SMTP_HOST) throw new Error('Email transport is not configured');
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    requireTLS: env.NODE_ENV === 'production' && env.SMTP_PORT !== 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  await transport.sendMail({ from: env.EMAIL_FROM, to, subject, text });
};
