const backendUrl = process.env.BACKEND_URL;
if (!backendUrl) throw new Error('Set BACKEND_URL to the Render HTTPS origin before deploying.');

const backend = new URL(backendUrl);
if (backend.protocol !== 'https:' || backend.username || backend.password || backend.search || backend.hash || backend.pathname !== '/') {
  throw new Error('BACKEND_URL must be an HTTPS origin without credentials, a path, or a query.');
}

export const config = {
  framework: 'vite',
  installCommand: 'npm ci',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  rewrites: [
    { source: '/api/:path*', destination: `${backend.origin}/api/:path*` },
    { source: '/(.*)', destination: '/index.html' },
  ],
  headers: [
    { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
  ],
};
