// Authenticate with EPS without creating an order, session, charge or notification.
// Run from the release checkout: node scripts/check-eps-live-config.cjs /private/path/eps.env
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const lib = createRequire(path.resolve(__dirname, '../api/package.json'));
lib('reflect-metadata');
const { HttpService } = lib('@nestjs/axios');
const { EpsService } = require('../api/dist/shared/eps/eps.service');

(async () => {
  const filename = process.argv[2];
  assert.ok(filename, 'Provide a private environment file; never pass credentials as arguments.');
  const settings = lib('dotenv').parse(fs.readFileSync(filename));
  assert.equal(settings.EPS_BASE_URL?.replace(/\/+$/, ''), 'https://pgapi.eps.com.bd', 'Use the live EPS API from guide V5.');
  assert.notEqual(settings.EPS_ALLOW_SANDBOX, 'true', 'Sandbox must not be allowed on production.');
  for (const key of ['EPS_USERNAME', 'EPS_PASSWORD', 'EPS_HASH_KEY', 'EPS_STORE_ID', 'EPS_MERCHANT_ID']) {
    assert.ok(settings[key]?.trim(), key + ' is missing.');
  }
  // Check credentials even when the rollout flag is still disabled.
  const eps = new EpsService(new HttpService(lib('axios').create()), { get: (name) => settings[name] });
  await eps.getToken();
  console.log('Live EPS authentication passed; no payment was created.');
})().catch(() => {
  console.error('Live EPS preflight failed. Check the private settings and EPS connectivity; no credentials are printed.');
  process.exitCode = 1;
});
