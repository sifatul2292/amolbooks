// Run after npm run build in api/. Isolated Nest app, no database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const apiRequire = createRequire(path.join(root, 'api/package.json'));
const { NestFactory, APP_GUARD } = apiRequire('@nestjs/core');
const { Controller, Get, Module: NestModule } = apiRequire('@nestjs/common');
const { ThrottlerModule, ThrottlerGuard } = apiRequire('@nestjs/throttler');
const { ClientIpThrottlerGuard } = require('../api/dist/guards/client-ip-throttler.guard');

const appModule = fs.readFileSync(path.join(root, 'api/src/app.module.ts'), 'utf8');
assert.match(appModule, /\{ provide: APP_GUARD, useClass: ClientIpThrottlerGuard \}/, 'The API rate-limits per visitor');
assert.doesNotMatch(appModule, /useClass: ThrottlerGuard/, 'The proxy-wide guard is no longer registered');

class PingController { ping() { return { ok: true }; } }
Controller('ping')(PingController);
Get()(PingController.prototype, 'ping', Object.getOwnPropertyDescriptor(PingController.prototype, 'ping'));

function testModule(guard) {
  class TestModule {}
  NestModule({
    imports: [ThrottlerModule.forRoot({ ttl: 60, limit: 2 })],
    controllers: [PingController],
    providers: [{ provide: APP_GUARD, useClass: guard }],
  })(TestModule);
  return TestModule;
}

async function statuses(guard, requests) {
  const app = await NestFactory.create(testModule(guard), { logger: false });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const result = [];
    for (const headers of requests) result.push((await fetch(base + '/ping', { headers })).status);
    return result;
  } finally {
    await app.close();
  }
}

(async () => {
  const visitorA = { 'cf-connecting-ip': '203.0.113.10', 'x-forwarded-for': '203.0.113.10, 172.70.1.1' };
  const visitorB = { 'cf-connecting-ip': '198.51.100.20', 'x-forwarded-for': '198.51.100.20, 172.70.1.1' };
  const forwardedOnly = { 'x-forwarded-for': '192.0.2.30, 10.0.0.1' };
  const requests = [visitorA, visitorA, visitorA, visitorB, forwardedOnly, {}];

  // Old behaviour: every request comes from the local proxy, so one visitor exhausts everyone.
  assert.deepEqual(await statuses(ThrottlerGuard, requests), [200, 200, 429, 429, 429, 429]);
  // New behaviour: each visitor has their own bucket; the third request from A is still limited.
  assert.deepEqual(await statuses(ClientIpThrottlerGuard, requests), [200, 200, 429, 200, 200, 200]);

  // The real product controller: a visitor can read books 300 times a minute
  // (a product page reads its book ~5 times), not the global 120.
  const { ProductController } = require('../api/dist/pages/product/product.controller');
  const { ProductService } = require('../api/dist/pages/product/product.service');
  class ProductTestModule {}
  NestModule({
    imports: [ThrottlerModule.forRoot({ ttl: 60, limit: 120 })],
    controllers: [ProductController],
    providers: [
      { provide: ProductService, useValue: { getProductBySlug: async (slug) => ({ success: true, data: { slug } }) } },
      { provide: APP_GUARD, useClass: ClientIpThrottlerGuard },
    ],
  })(ProductTestModule);
  const app = await NestFactory.create(ProductTestModule, { logger: false });
  try {
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    const url = (await app.getUrl()) + '/api/product/get-by-slug/productive%20muslim';
    const counts = {};
    for (let i = 0; i < 301; i += 1) {
      const status = (await fetch(url, { headers: visitorA })).status;
      counts[status] = (counts[status] || 0) + 1;
    }
    assert.deepEqual(counts, { 200: 300, 429: 1 }, 'One visitor: 300 book reads a minute, then 429');
    assert.equal((await fetch(url, { headers: visitorB })).status, 200, 'Another visitor is unaffected');
    const body = await (await fetch(url, { headers: { 'cf-connecting-ip': '192.0.2.99' } })).json();
    assert.deepEqual(body, { success: true, data: { slug: 'productive muslim' } }, 'Response unchanged');
  } finally {
    await app.close();
  }
  console.log('PASS: API rate limits are tracked per visitor (Cloudflare/forwarded IP), not per proxy; book reads allow 300/min per visitor.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
