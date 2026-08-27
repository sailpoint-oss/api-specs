#!/usr/bin/env node

/**
 * Tests every endpoint in a Postman collection.
 * Highlights routing 500 errors and 404s with { "error": "No message available" }.
 * 500s that include a trackingId in the response are treated as routed (not flagged).
 *
 * Usage:
 *   node test-endpoints.js [collection]
 *
 *   [collection] - collection filename (with or without .json) from postman/collections/.
 *                  Defaults to sailpoint-api-isc.
 *                  Pass "list" to see all available collections.
 *
 * Required .env variables:
 *   TENANT          - your ISC tenant name (e.g. "acme")
 *   CLIENT_ID       - OAuth client ID
 *   CLIENT_SECRET   - OAuth client secret
 *   DOMAIN          - optional, defaults to "sailpoint" (builds <tenant>.api.<domain>.com)
 *   SCOPE           - optional OAuth scope
 *   ROUTE_SPEC      - optional, defaults to "dev-test_feature_v1-routes"
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load .env
// ---------------------------------------------------------------------------
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('No .env file found in scripts/. Create one with TENANT, CLIENT_ID, CLIENT_SECRET.');
  process.exit(1);
}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

const TENANT = process.env.TENANT;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const DOMAIN = process.env.DOMAIN || 'sailpoint';
const SCOPE = process.env.SCOPE || '';
const ROUTE_SPEC = process.env.ROUTE_SPEC || 'dev-test_feature_v1-routes';

if (!TENANT || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing required env vars: TENANT, CLIENT_ID, CLIENT_SECRET');
  process.exit(1);
}

// AUTH_BASE is always the root tenant URL — never versioned.
const AUTH_BASE = `https://${TENANT}.api.${DOMAIN}.com`;

// BASE_URL is resolved from the collection's own baseUrl variable after loading.
// Defined here as a placeholder; overwritten in main() once the collection is parsed.
let BASE_URL = AUTH_BASE;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function request(opts, body = null) {
  return new Promise((resolve, reject) => {
    const lib = opts.protocol === 'http:' ? http : https;
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function fetchToken() {
  const tokenUrl = new URL(`${AUTH_BASE}/oauth/token`);
  const formParts = [
    `grant_type=client_credentials`,
    `client_id=${encodeURIComponent(CLIENT_ID)}`,
    `client_secret=${encodeURIComponent(CLIENT_SECRET)}`,
  ];
  if (SCOPE) formParts.push(`scope=${encodeURIComponent(SCOPE)}`);
  const bodyStr = formParts.join('&');

  const opts = {
    hostname: tokenUrl.hostname,
    port: tokenUrl.port || 443,
    path: tokenUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(bodyStr),
    },
  };

  const res = await request(opts, bodyStr);
  if (res.status !== 200) {
    throw new Error(`Auth failed (${res.status}): ${res.body.slice(0, 200)}`);
  }
  return JSON.parse(res.body).access_token;
}

// ---------------------------------------------------------------------------
// Extract endpoints from collection
// ---------------------------------------------------------------------------
function extractEndpoints(items, results = []) {
  for (const item of items) {
    if (item.item) {
      extractEndpoints(item.item, results);
    } else if (item.request) {
      const req = item.request;
      const urlObj = req.url || {};
      const pathParts = (urlObj.path || []).map((seg) => {
        // Replace :param placeholders with a dummy value
        return seg.startsWith(':') ? 'abc123' : seg;
      });
      const urlPath = '/' + pathParts.join('/');

      // Only include enabled (non-disabled) query params
      const qParts = (urlObj.query || [])
        .filter((q) => !q.disabled)
        .map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value || '')}`)
        .join('&');

      const fullPath = qParts ? `${urlPath}?${qParts}` : urlPath;

      results.push({
        name: item.name || 'Unnamed',
        method: (req.method || 'GET').toUpperCase(),
        path: fullPath,
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// ANSI colours
// ---------------------------------------------------------------------------
const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function colourStatus(status) {
  if (status >= 500) return `${C.bold}${C.red}${status}${C.reset}`;
  if (status === 404) return `${C.yellow}${status}${C.reset}`;
  if (status >= 400) return `${C.dim}${status}${C.reset}`;
  return `${C.green}${status}${C.reset}`;
}

// ---------------------------------------------------------------------------
// Resolve collection path from CLI arg
// ---------------------------------------------------------------------------
const COLLECTIONS_DIR = path.join(__dirname, '..', 'postman', 'collections');

function listCollections() {
  return fs.readdirSync(COLLECTIONS_DIR).filter((f) => f.endsWith('.json')).sort();
}

function resolveCollection(arg) {
  const name = arg.endsWith('.json') ? arg : `${arg}.json`;
  return path.join(COLLECTIONS_DIR, name);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const arg = process.argv[2];

  if (arg === 'list') {
    console.log(`${C.bold}Available collections:${C.reset}`);
    for (const f of listCollections()) console.log(`  ${f.replace(/\.json$/, '')}`);
    process.exit(0);
  }

  const collectionPath = resolveCollection(arg || 'sailpoint-api-isc');

  if (!fs.existsSync(collectionPath)) {
    console.error(`Collection not found: ${collectionPath}`);
    console.error(`\nAvailable collections:`);
    for (const f of listCollections()) console.error(`  ${f.replace(/\.json$/, '')}`);
    process.exit(1);
  }

  const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

  // Resolve baseUrl from the collection's own variable, substituting env tokens.
  const collectionVars = Object.fromEntries(
    (collection.variable || []).map((v) => [v.key, v.value || ''])
  );
  if (collectionVars.baseUrl) {
    BASE_URL = collectionVars.baseUrl
      .replace(/\{\{tenant\}\}/g, TENANT)
      .replace(/\{\{tenantName\}\}/g, TENANT)
      .replace(/\{\{domain\}\}/g, DOMAIN)
      .replace(/\/+$/, ''); // strip trailing slash
  }

  const endpoints = extractEndpoints(collection.item);

  console.log(`${C.bold}Fetching OAuth token...${C.reset}`);
  let token;
  try {
    token = await fetchToken();
    console.log(`${C.green}Token acquired.${C.reset}\n`);
  } catch (err) {
    console.error(`${C.red}${err.message}${C.reset}`);
    process.exit(1);
  }

  console.log(`${C.bold}Collection:  ${path.basename(collectionPath)}${C.reset}`);
  console.log(`${C.bold}Testing ${endpoints.length} endpoints against ${BASE_URL}${C.reset}`);
  console.log(`${C.dim}SLPT-ROUTE-SPEC: ${ROUTE_SPEC}${C.reset}\n`);

  const issues = { fiveHundreds: [], noMessageAvailable: [] };

  const baseUrlObj = new URL(BASE_URL);

  for (let i = 0; i < endpoints.length; i++) {
    const ep = endpoints[i];

    const opts = {
      hostname: baseUrlObj.hostname,
      port: baseUrlObj.port || 443,
      path: (baseUrlObj.pathname.replace(/\/$/, '') + ep.path),
      method: ep.method,
      headers: {
        Authorization: `Bearer ${token}`,
        'SLPT-ROUTE-SPEC': ROUTE_SPEC,
        'User-Agent': 'SailPointPostmanCollection',
        Accept: 'application/json',
      },
    };

    let status, body;
    try {
      const res = await request(opts);
      status = res.status;
      body = res.body;
    } catch (err) {
      const line = `[${String(i + 1).padStart(4, '0')}] ${ep.method.padEnd(7)} ${ep.path.slice(0, 60).padEnd(60)}  ERR  ${err.message.slice(0, 50)}`;
      console.log(`${C.red}${line}${C.reset}`);
      continue;
    }

    const snippet = body.replace(/\s+/g, ' ').trim().slice(0, 50);
    const idx = String(i + 1).padStart(4, '0');
    const methodPad = ep.method.padEnd(7);
    const pathTrunc = ep.path.slice(0, 60).padEnd(60);

    let parsed = null;
    try { parsed = JSON.parse(body); } catch (_) {}

    // A 500 that includes a trackingId was routed correctly — the server handled
    // the request and produced an internal error. Only flag 500s without one.
    const routingError500 = status >= 500 && !(parsed && parsed.trackingId);
    const statusStr = routingError500
      ? `${C.bold}${C.red}${status}${C.reset}`
      : colourStatus(status);

    console.log(`[${idx}] ${methodPad} ${pathTrunc}  ${statusStr}  ${snippet}`);

    if (routingError500) {
      issues.fiveHundreds.push({ ...ep, status, snippet });
    }
    if (status === 404 && parsed && parsed.error === 'No message available') {
      issues.noMessageAvailable.push({ ...ep, status, snippet });
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log(`${C.bold}SUMMARY${C.reset}`);
  console.log('='.repeat(80));

  if (issues.fiveHundreds.length === 0 && issues.noMessageAvailable.length === 0) {
    console.log(`${C.green}No 500 errors or unrouted 404s found.${C.reset}`);
  }

  if (issues.fiveHundreds.length > 0) {
    console.log(`\n${C.bold}${C.red}500 ERRORS (${issues.fiveHundreds.length}):${C.reset}`);
    for (const ep of issues.fiveHundreds) {
      console.log(`  ${C.red}${ep.method} ${ep.path}${C.reset}`);
      console.log(`    ${C.dim}${ep.snippet}${C.reset}`);
    }
  }

  if (issues.noMessageAvailable.length > 0) {
    console.log(`\n${C.bold}${C.yellow}404 "No message available" (${issues.noMessageAvailable.length}):${C.reset}`);
    for (const ep of issues.noMessageAvailable) {
      console.log(`  ${C.yellow}${ep.method} ${ep.path}${C.reset}`);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
