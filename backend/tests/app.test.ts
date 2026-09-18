import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('API shell', () => {
  const app = createApp();

  it('reports health without requiring authentication', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: true,
      statusCode: 503,
      message: 'Database unavailable',
      data: { status: 'DOWN' },
    });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns the standard error envelope for unknown routes', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      statusCode: 404,
      message: 'Cannot find GET /api/v1/does-not-exist on this server',
    });
  });

  it('rejects protected application routes without an access token', async () => {
    const response = await request(app).get('/api/v1/applications/me');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Unauthorized: Access token missing or invalid',
    });
  });
});
