/* ============================================================================
 * Data Mining — container entry (Type B, Infrastructure Onboarding §4/§5b/§6).
 *
 * This app has no server-side rendering of its own - it's a Vite/React SPA.
 * Running it as Type B (container) rather than Type A (S3+CloudFront) means
 * something still has to serve the built dist/ and answer the ALB health
 * check. Plain Node http/fs - no framework, this doesn't need one. All the
 * actual app logic is still client-side in src/.
 *
 * Runtime config comes entirely from APP_SECRETS - no hardcoded port/origin,
 * per §5b, and this fails fast at startup rather than silently defaulting if
 * a required key is missing.
 * ==========================================================================*/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function loadConfig() {
  const source = process.env.APP_SECRETS ? JSON.parse(process.env.APP_SECRETS) : process.env;
  const missing = ['NAME', 'PORT', 'ALLOWED_ORIGIN'].filter((k) => !source[k]);
  if (missing.length) {
    throw new Error(`Missing required APP_SECRETS key(s): ${missing.join(', ')}`);
  }
  return {
    name: source.NAME,
    port: Number(source.PORT),
    allowedOrigin: source.ALLOWED_ORIGIN,
    nodeEnv: source.NODE_ENV,
  };
}

const { name, port, allowedOrigin } = loadConfig();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendFile(res, filePath) {
  const body = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  // CORS (§6) - this app has no API of its own besides /health, but the
  // rule is blanket for Types B & C, so it's honored here too.
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Health check (§6, required) - by convention the ALB polls this.
  if (urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: name, timestamp: new Date().toISOString() }));
    return;
  }

  const candidate = path.join(distDir, urlPath);
  const isRealFile = urlPath !== '/'
    && candidate.startsWith(distDir) // guard against path traversal (../..)
    && fs.existsSync(candidate)
    && fs.statSync(candidate).isFile();

  if (isRealFile) {
    sendFile(res, candidate);
    return;
  }

  // SPA fallback - this app has no client-side routes today, but any
  // unrecognized path still resolves to the app shell rather than 404ing,
  // same intent as the CloudFront 403/404 -> index.html mapping Type A uses.
  sendFile(res, path.join(distDir, 'index.html'));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`${name} listening on 0.0.0.0:${port}`);
});
