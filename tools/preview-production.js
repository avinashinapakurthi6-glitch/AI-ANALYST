#!/usr/bin/env node
// tools/preview-production.js
// Build, start the production server (dist/index.js) and open a browser when ready.
// Usage: node tools/preview-production.js

const { spawn } = require('child_process');
const { platform } = require('process');
require('dotenv').config();

function spawnPromise(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.on('error', reject);
  });
}

async function waitForUrl(url, timeoutMs = 30000, interval = 500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch (e) {
      // ignore
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function openBrowser(url) {
  try {
    if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], { stdio: 'ignore', detached: true });
    } else if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true });
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
    }
  } catch (e) {
    console.log('Could not open browser automatically:', e.message);
  }
}

(async () => {
  try {
    console.log('Building production (vite + esbuild)...');
    await spawnPromise('pnpm', ['build']);

    console.log('Starting production server: node dist/index.js');
    const server = spawn('node', ['dist/index.js'], { env: process.env, stdio: 'inherit', shell: true });

    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}/`;
    console.log(`Waiting for server to be available at ${url} ...`);
    await waitForUrl(url, 30000, 500);

    console.log(`Production preview available: ${url}`);
    openBrowser(url);

    // keep the script running while the server runs
    server.on('close', code => {
      console.log('Server exited with code', code);
      process.exit(code);
    });
  } catch (err) {
    console.error('Preview failed:', err.message || err);
    process.exit(1);
  }
})();
