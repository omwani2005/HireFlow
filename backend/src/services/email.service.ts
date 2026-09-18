import nodemailer from 'nodemailer';
import { env } from '../config/env';

export const isEmailConfigured = (): boolean => Boolean(env.EMAIL_FROM && (
  env.EMAIL_PROVIDER === 'resend' ? env.RESEND_API_KEY : env.SMTP_HOST
));

export const sendAccountEmail = async (to: string, subject: string, text: string): Promise<void> => {
  if (env.EMAIL_PROVIDER === 'resend') {
    if (!isEmailConfigured()) throw new Error('Email transport is not configured');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(15000),
    });
    // Provider responses can contain recipient details; expose only a safe status.
    if (!response.ok) throw new Error(`Email provider rejected the request (${response.status})`);
    return;
  }
  if (!env.SMTP_HOST) throw new Error('Email transport is not configured');
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    requireTLS: env.NODE_ENV === 'production' && env.SMTP_PORT !== 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  await transport.sendMail({ from: env.EMAIL_FROM, to, subject, text });
};
