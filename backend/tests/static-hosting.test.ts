import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';

describe('optional frontend hosting', () => {
  const originalServeFrontend = env.SERVE_FRONTEND;
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const frontendDirectory = fs.mkdtempSync(path.join(temporaryRoot, 'hireflow-static-'));

  beforeAll(() => {
    fs.mkdirSync(path.join(frontendDirectory, 'assets'));
    fs.writeFileSync(path.join(frontendDirectory, 'index.html'), '<!doctype html><html><body><div id="root">HireFlow</div></body></html>');
    fs.writeFileSync(path.join(frontendDirectory, 'assets', 'app.js'), 'window.hireflow = true;');
  });

  afterEach(() => { env.SERVE_FRONTEND = originalServeFrontend; });
  afterAll(() => {
    const relative = path.relative(temporaryRoot, fs.realpathSync(frontendDirectory));
    if (relative.startsWith('hireflow-static-') && !relative.includes(path.sep)) fs.rmSync(frontendDirectory, { recursive: true, force: true });
  });

  it('serves the app and deep links with frontend hosting enabled', async () => {
    env.SERVE_FRONTEND = true;
    const app = createApp({ frontendDirectory });
    for (const route of ['/', '/jobs/example', '/verify-email']) {
      const response = await request(app).get(route).accept('html');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.text).toContain('id="root"');
    }
  });

  it('serves built assets and never replaces missing assets with HTML', async () => {
    env.SERVE_FRONTEND = true;
    const app = createApp({ frontendDirectory });
    const asset = await request(app).get('/assets/app.js');
    expect(asset.status).toBe(200);
    expect(asset.headers['content-type']).toContain('javascript');
    expect(asset.text).toBe('window.hireflow = true;');
    const missing = await request(app).get('/assets/missing.js').accept('html');
    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({ success: false, statusCode: 404 });
  });

  it('preserves JSON API responses and unknown API errors', async () => {
    env.SERVE_FRONTEND = true;
    const app = createApp({ frontendDirectory });
    const health = await request(app).get('/api/v1/health').accept('html');
    expect(health.headers['content-type']).toContain('application/json');
    for (const route of ['/api/v1/missing', '/api/v2/missing', '/api']) {
      const response = await request(app).get(route).accept('html');
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toMatchObject({ success: false, statusCode: 404 });
    }
  });

  it('keeps the standalone API behavior when frontend hosting is disabled', async () => {
    env.SERVE_FRONTEND = false;
    const app = createApp();
    const root = await request(app).get('/');
    expect(root.status).toBe(200);
    expect(root.body.name).toBe('HireFlow ATS API');
    expect((await request(app).get('/jobs/example').accept('html')).status).toBe(404);
  });

  it('fails startup clearly if frontend hosting is enabled before building', () => {
    env.SERVE_FRONTEND = true;
    expect(() => createApp({ frontendDirectory: path.join(frontendDirectory, 'missing-build') })).toThrow('Frontend build is missing');
  });
});
