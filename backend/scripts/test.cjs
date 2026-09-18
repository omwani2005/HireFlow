const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  // Never connect tests to the application database or a developer-provided production URI.
  const localBinary = path.resolve('../.mongodb-binaries/mongod.exe');
  const systemBinary = process.env.MONGOMS_SYSTEM_BINARY || (process.platform === 'win32' && fs.existsSync(localBinary) ? localBinary : undefined);
  const replica = await MongoMemoryReplSet.create({ binary: { version: process.env.MONGOMS_VERSION || '7.0.14', systemBinary }, replSet: { count: 1 }, instanceOpts: [{ dbName: 'hireflow_test' }] });
  try {
    const uri = replica.getUri('hireflow_test');
    const child = spawn(process.execPath, [path.resolve('node_modules/vitest/vitest.mjs'), 'run', '--testTimeout=30000', '--hookTimeout=60000', ...process.argv.slice(2)], {
      stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: uri, TEST_MONGODB_URI: uri, SMTP_HOST: '', REQUIRE_EMAIL_VERIFICATION: 'false', RESUME_STORAGE_PROVIDER: 'gridfs' },
    });
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code ?? 1)); });
    process.exitCode = code;
  } finally { await replica.stop(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
