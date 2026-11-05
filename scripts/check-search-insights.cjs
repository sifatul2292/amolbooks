// Isolated check for "Customer Searches": what shop visitors type in the search box.
// Uses a throwaway database on the local mongod (never the app database).
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire, Module } = require('node:module');
const root = path.resolve(__dirname, '..');
process.env.NODE_PATH = [path.join(root, 'api/dist'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();
const lib = createRequire(path.join(root, 'api/package.json'));
lib('reflect-metadata');
const mongoose = lib('mongoose');
const jwt = lib('jsonwebtoken');
const { NestFactory } = lib('@nestjs/core');
const { Module: NestModule } = lib('@nestjs/common');
const { PassportModule } = lib('@nestjs/passport');
const { JwtAdminStrategy } = require('../api/dist/pages/admin/jwt-admin.strategy');
const { SearchInsightsService } = require('../api/dist/pages/search-insights/search-insights.service');
const { SearchInsightsController } = require('../api/dist/pages/search-insights/search-insights.controller');
const { SearchLogSchema } = require('../api/dist/pages/search-insights/search-insights.schema');
const { ProductController } = require('../api/dist/pages/product/product.controller');
const { customerManagerPages } = require('../api/dist/pages/customer-manager/customer-manager-pages');

const uri = 'mongodb://127.0.0.1:27017/amol_search_insights_test_' + crypto.randomBytes(6).toString('hex');
assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27017\/amol_search_insights_test_[a-f0-9]+$/, 'Only a throwaway local database is permitted');
const secret = 'isolated-search-insights-fixture-secret';
const PHONE = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36';
const LAPTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36';
let connection, app;

const visitor = (ip, ua = PHONE, extra = {}) => ({ ip: '10.0.0.1', headers: { 'user-agent': ua, 'x-forwarded-for': ip + ', 10.0.0.1', ...extra } });
const waitFor = async (check, label, ms = 3000) => {
  const until = Date.now() + ms;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > until) throw new Error('Timed out waiting for ' + label);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

(async () => {
  const html = fs.readFileSync(path.join(root, 'gtm-snippets/search-insights.html'), 'utf8');
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1], { filename: 'search-insights.html' });

  connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  const SearchLog = connection.model('SearchLog', SearchLogSchema);
  await SearchLog.init();
  const service = new SearchInsightsService(SearchLog);
  const rows = () => SearchLog.find({}).sort({ at: 1 }).lean();

  // 1. Typing step by step and the results page repeating the search count once.
  const amina = visitor('103.10.0.5');
  await service.record('sob', 4, amina);
  await service.record('sobor', 1, amina);
  await service.record('sobor', 1, amina);
  await service.record('sob', 4, amina);
  let all = await rows();
  assert.equal(all.length, 1, 'Typing on, repeating and backspacing stay one search');
  assert.equal(all[0].term, 'sobor');
  assert.equal(all[0].results, 1, 'Result count of the longest words');
  assert.equal(all[0].visitor.length, 16);
  assert.ok(!JSON.stringify(all[0]).includes('103.10.0.5'), 'No IP address is stored');

  // 2. Different words, another visitor, odd spacing/case/punctuation.
  await service.record('পড়ো  ৬', 0, amina);
  await service.record('Sobor!', 1, visitor('103.10.0.6', LAPTOP));
  await service.record('sobor', 1, visitor('103.10.0.5', LAPTOP));
  all = await rows();
  assert.equal(all.length, 4);
  assert.equal(all[1].term, 'পড়ো ৬', 'Spaces tidied');
  assert.equal(all[2].key, 'sobor', 'Case and punctuation grouped');

  // 3. Not customers, or not searches.
  await service.record('sobor', 1, visitor('103.10.0.7', PHONE, { administrator: 'any-admin-token' }));
  await service.record('sobor', 1, visitor('66.249.66.1', 'Mozilla/5.0 (compatible; Googlebot/2.1)'));
  await service.record('sobor', 1, { headers: { 'x-forwarded-for': '103.10.0.8' } });
  await service.record('a', 0, visitor('103.10.0.9'));
  await service.record('  ', 0, visitor('103.10.0.9'));
  await service.record('https://spam.example', 0, visitor('103.10.0.9'));
  await service.record('ক'.repeat(81), 0, visitor('103.10.0.9'));
  await service.record('sobor', 1, null);
  assert.equal((await rows()).length, 4, 'Staff, bots, empty, one-letter, links, very long and broken requests are skipped');

  // 4. The same visitor searching again later is another search.
  await SearchLog.updateOne({ _id: all[0]._id }, { $set: { at: new Date(Date.now() - 2 * 60 * 1000) } });
  await service.record('sobor', 1, amina);
  assert.equal((await rows()).length, 5);

  // 5. Report: grouped, most searched first, "found no books", periods.
  await SearchLog.create({ term: 'রাহিকুল', key: 'রাহিকুল', visitor: 'old-visitor-0001', results: 0, at: new Date(Date.now() - 10 * 86400000) });
  await SearchLog.create({ term: 'জাদুর কাঠি', key: 'জাদুর কাঠি', visitor: 'old-visitor-0002', results: 0, at: new Date(Date.now() - 200 * 86400000) });
  let report = (await service.report({})).data;
  assert.equal(report.days, 30, 'Last 30 days by default');
  assert.deepEqual(report.rows.map((r) => [r.term, r.searches, r.visitors, r.results]), [
    ['sobor', 4, 3, 1],
    ['পড়ো ৬', 1, 1, 0],
    ['রাহিকুল', 1, 1, 0],
  ], 'Most searched first, then most recent');
  assert.equal(report.searches, 6);
  assert.equal(report.terms, 3);
  assert.equal(report.notFound, 2);
  assert.equal((await service.report({ days: '7' })).data.rows.length, 2, '7 days leaves out older searches');
  assert.equal((await service.report({ days: '365' })).data.rows.length, 4);
  assert.equal((await service.report({ days: '9999' })).data.days, 30, 'Unknown period falls back to 30 days');

  // 6. The product search endpoint records shop searches without waiting for it.
  await SearchLog.deleteMany({});
  const products = { getAllProducts: async (_dto, q) => ({ success: true, data: q === 'সবর' ? [{ name: 'সবর' }] : [], count: q === 'সবর' ? 1 : 0 }) };
  const controller = new ProductController(products, service);
  const reply = await controller.getAllProducts({}, 'রকেট সায়েন্স', visitor('103.10.1.1'));
  assert.deepEqual(reply, { success: true, data: [], count: 0 }, 'Search results unchanged');
  await controller.getAllProducts({}, 'সবর', visitor('103.10.1.2'));
  await controller.getAllProducts({ pagination: { pageSize: 10 } }, undefined, visitor('103.10.1.3'));
  const logged = await waitFor(async () => ((await rows()).length === 2 ? rows() : null), 'search rows');
  assert.deepEqual(logged.map((r) => [r.term, r.results]), [['রকেট সায়েন্স', 0], ['সবর', 1]], 'Only searches, with their result counts');
  assert.deepEqual(await new ProductController(products).getAllProducts({}, 'x y', visitor('103.10.1.4')), { success: true, data: [], count: 0 }, 'Works without the search log');

  // 7. Admin report over HTTP: signed-in staff only; sales staff and visitors cannot read it.
  const config = { get: (key) => (key === 'adminJwtSecret' ? secret : undefined) };
  class FixtureModule {}
  NestModule({
    imports: [PassportModule],
    controllers: [SearchInsightsController],
    providers: [
      { provide: SearchInsightsService, useValue: service },
      { provide: JwtAdminStrategy, useValue: new JwtAdminStrategy(config) },
    ],
  })(FixtureModule);
  app = await NestFactory.create(FixtureModule, { logger: false });
  app.use(customerManagerPages(root));
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  const base = 'http://127.0.0.1:' + app.getHttpServer().address().port;
  const as = (role) => jwt.sign({ _id: new mongoose.Types.ObjectId().toString(), username: role, role, permissions: ['get'] }, secret, { expiresIn: '1h' });
  const get = async (url, token) => {
    const response = await fetch(base + url, { headers: token ? { administrator: token } : {} });
    return { status: response.status, body: /json/.test(response.headers.get('content-type') || '') ? await response.json() : await response.text() };
  };
  assert.equal((await get('/api/search-insights/report')).status, 401, 'Visitors cannot read searches');
  assert.notEqual((await get('/api/search-insights/report', as('salesman'))).status, 200, 'Sales staff cannot read searches');
  assert.equal((await get('/api/search-insights/report', jwt.sign({ role: 'admin' }, 'wrong-secret'))).status, 401);
  const ok = await get('/api/search-insights/report?days=7', as('admin'));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.days, 7);
  assert.equal(ok.body.data.rows.length, 2);
  assert.equal((await get('/api/search-insights/report', as('super_admin'))).status, 200);

  // 8. The admin page, with the shared menu and its own item highlighted.
  const page = await get('/upload/static/search-insights.html');
  assert.equal(page.status, 200);
  assert.match(page.body, /<title>Customer Searches · Amolbooks<\/title>/);
  assert.equal(page.body.split('class="ab-sb"').length, 2, 'One shared sidebar');
  assert.match(page.body, /class="ab-sb-item[^"]* active"[^>]*aria-current="page"><i class="fas fa-magnifying-glass"><\/i> Customer Searches</);
  assert.ok(!page.body.includes('AB_ADMIN_SIDEBAR'));
  assert.match(page.body, /'\/api\/search-insights\/report\?days='/);
  const staffPage = await get('/upload/static/staff-performance.html');
  assert.match(staffPage.body, /href="search-insights.html"[^>]*data-salesman-hidden|data-salesman-hidden[^>]*href="search-insights.html"/, 'Menu item hidden for sales staff');

  console.log('Customer searches: typing merged, repeats and backspacing, grouping, no IP stored, staff/bots/junk skipped, periods, result counts from the shop search, admin-only report and the menu page pass');
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (app) await app.close();
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
  });
