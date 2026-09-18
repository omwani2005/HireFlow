import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../src/config/env';
import { isEmailConfigured, sendAccountEmail } from '../src/services/email.service';

const original = { provider: env.EMAIL_PROVIDER, key: env.RESEND_API_KEY, from: env.EMAIL_FROM };
afterEach(() => {
  env.EMAIL_PROVIDER = original.provider;
  env.RESEND_API_KEY = original.key;
  env.EMAIL_FROM = original.from;
  vi.restoreAllMocks();
});

describe('HTTPS account email delivery', () => {
  it('sends plain-text account email through the configured provider', async () => {
    env.EMAIL_PROVIDER = 'resend'; env.RESEND_API_KEY = 'test-key'; env.EMAIL_FROM = 'HireFlow <accounts@example.test>';
    const send = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    expect(isEmailConfigured()).toBe(true);
    await sendAccountEmail('candidate@example.test', 'Verify email', 'One-time link');
    expect(send).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ from: env.EMAIL_FROM, to: ['candidate@example.test'], subject: 'Verify email', text: 'One-time link' }),
    }));
  });

  it('fails without disclosing provider response bodies', async () => {
    env.EMAIL_PROVIDER = 'resend'; env.RESEND_API_KEY = 'test-key'; env.EMAIL_FROM = 'accounts@example.test';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('sensitive provider response', { status: 403 }));
    await expect(sendAccountEmail('candidate@example.test', 'Verify', 'Link')).rejects.toThrow('Email provider rejected the request (403)');
  });

  it('does not contact a provider when credentials are missing', async () => {
    env.EMAIL_PROVIDER = 'resend'; env.RESEND_API_KEY = ''; env.EMAIL_FROM = 'accounts@example.test';
    const send = vi.spyOn(globalThis, 'fetch');
    await expect(sendAccountEmail('candidate@example.test', 'Verify', 'Link')).rejects.toThrow('not configured');
    expect(send).not.toHaveBeenCalled();
  });
});
