// EPS online payment checks: node scripts/check-eps-payment.cjs (after `npm run build` in api/).
// Runs the compiled PaymentService/EpsService/PaymentController against a fake EPS server and an
// own disposable MongoDB. No real EPS, SMS, email or application database is touched.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const deps = path.resolve(__dirname, '../api/node_modules');
require(deps + '/reflect-metadata');
const mongoose = require(deps + '/mongoose');
const axios = require(require.resolve('axios', { paths: [path.resolve(__dirname, '../api')] }));
const { Module } = require(deps + '/@nestjs/common');
const { NestFactory } = require(deps + '/@nestjs/core');
const { HttpService } = require(deps + '/@nestjs/axios');
const { OrderSchema } = require('../api/dist/schema/order.schema');
const { EpsService } = require('../api/dist/shared/eps/eps.service');
const { PaymentService } = require('../api/dist/pages/payment/payment.service');
const { PaymentController } = require('../api/dist/pages/payment/payment.controller');
const { OrderService } = require('../api/dist/pages/sales/order/order.service');
const { OrderController } = require('../api/dist/pages/sales/order/order.controller');
const { PassportModule } = require(deps + '/@nestjs/passport');
const jwt = require(deps + '/jsonwebtoken');
const { JwtAdminStrategy } = require('../api/dist/pages/admin/jwt-admin.strategy');

const SETTINGS = {
  EPS_USERNAME: 'fixture-merchant@example.com',
  EPS_PASSWORD: 'fixture-password',
  EPS_HASH_KEY: 'fixture-hash-key',
  EPS_STORE_ID: 'fixture-store',
  EPS_MERCHANT_ID: 'fixture-merchant',
  EPS_RETURN_BASE_URL: 'https://api.fixture.test',
  STOREFRONT_URL: 'https://shop.fixture.test',
};
const xhash = (data) =>
  crypto.createHmac('sha512', Buffer.from(SETTINGS.EPS_HASH_KEY, 'utf8')).update(String(data), 'utf8').digest('base64');

async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/** Fake EPS: checks credentials, x-hash and bearer token like the guide describes. */
async function startFakeEps() {
  const state = { tokenCalls: 0, tokens: new Set(), tx: new Map(), initBodies: [], failInit: false, down: false };
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const send = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (state.down) return send(503, {});
      const url = new URL(req.url, 'http://fake');
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
      if (req.method === 'POST' && url.pathname === '/v1/Auth/GetToken') {
        const ok = req.headers['x-hash'] === xhash(body.userName) && body.userName === SETTINGS.EPS_USERNAME &&
          body.password === SETTINGS.EPS_PASSWORD;
        if (!ok) return send(200, { token: null, expireDate: null, errorMessage: 'An error occured while processing the request.', errorCode: null });
        state.tokenCalls += 1;
        const token = crypto.randomBytes(16).toString('hex');
        state.tokens.add(token);
        // No time zone, seven decimals: like the real reply.
        const expireDate = new Date(Date.now() + 8 * 3600e3).toISOString().replace('Z', '1234');
        return send(200, { token, expireDate, errorMessage: null, errorCode: null });
      }
      const bearer = String(req.headers.authorization || '').replace(/^Bearer /, '');
      if (!state.tokens.has(bearer)) return send(401, {});
      if (req.method === 'POST' && url.pathname === '/v1/EPSEngine/InitializeEPS') {
        if (req.headers['x-hash'] !== xhash(body.merchantTransactionId)) return send(200, { ErrorMessage: 'Invalid hash' });
        if (state.failInit) return send(500, {});
        state.initBodies.push(body);
        const transactionId = crypto.randomUUID();
        state.tx.set(body.merchantTransactionId, { status: 'Initiated', amount: body.totalAmount, transactionId, body });
        return send(200, { TransactionId: transactionId, RedirectURL: `https://pg.fixture.test/PG?data=${transactionId}`, ErrorMessage: '', ErrorCode: null });
      }
      if (req.method === 'GET' && url.pathname === '/v1/EPSEngine/CheckMerchantTransactionStatus') {
        const mtid = url.searchParams.get('merchantTransactionId');
        if (req.headers['x-hash'] !== xhash(mtid)) return send(200, { ErrorMessage: 'Invalid hash' });
        const tx = state.tx.get(mtid);
        if (!tx) return send(200, { MerchantTransactionId: mtid, Status: '', ErrorMessage: 'Not found' });
        return send(200, {
          MerchantTransactionId: tx.omitId ? undefined : tx.wrongId || mtid,
          Status: tx.status,
          TotalAmount: Number(tx.paidAmount ?? tx.amount).toFixed(2),
          TransactionDate: '05 Nov 2026 06:06:19 PM',
          TransactionType: 'Purchase',
          FinancialEntity: tx.status === 'Success' ? 'bKash' : '',
          ErrorCode: '',
          ErrorMessage: '',
          CustomerName: tx.body.customerName,
        });
      }
      send(404, {});
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { state, server, url: `http://127.0.0.1:${server.address().port}` };
}

async function startMongo() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'amol-eps-payment-'));
  const port = await freePort();
  const mongo = spawn('mongod', ['--dbpath', directory, '--bind_ip', '127.0.0.1', '--port', String(port), '--quiet'], { stdio: 'ignore' });
  let connection;
  for (let attempt = 0; attempt < 40 && !connection; attempt++) {
    if (mongo.exitCode !== null) throw new Error('Disposable mongod failed to start');
    const candidate = mongoose.createConnection(`mongodb://127.0.0.1:${port}/eps_fixture`, { serverSelectionTimeoutMS: 250 });
    try { await candidate.asPromise(); connection = candidate; } catch (_) { await candidate.close().catch(() => {}); }
  }
  assert.ok(connection, 'Disposable MongoDB must start');
  return { connection, stop: () => { mongo.kill(); fs.rmSync(directory, { recursive: true, force: true }); } };
}

/** COD keeps sending SMS/email at order time; online orders wait for the payment. */
async function checkOrderNotifications() {
  const calls = [];
  const fakeThis = (paymentType) => ({
    logger: { error() {}, warn() {} },
    orderModel: { findOneAndUpdate: async () => null, updateOne: async () => ({}) },
    sendOrderPlacedNotifications: async (order) => calls.push(order.paymentType),
    holdOrderSmsForWhatsapp: async () => false,
    notifyWhatsapp() {},
    utilsService: { generateInvoicePdf: async () => {} },
    courierService: { checkFraudOrder: async () => null },
    incompleteOrderModel: { deleteMany: async () => ({}) },
  });
  // stockClaim returns null => the method stops early; give it a claim so it reaches step 5.
  for (const type of ['cash_on_delivery', 'online_payment']) {
    const self = fakeThis(type);
    self.orderModel.findOneAndUpdate = async () => ({ orderedItems: [] });
    self.decreaseProductStock = async () => true;
    await OrderService.prototype.processOrderBackgroundTasks.call(self, { _id: 'x', orderId: '1', paymentType: type }, { phoneNo: '' });
  }
  assert.deepEqual(calls, ['cash_on_delivery'], 'only cash on delivery notifies at order time');

  // The shared sender: one SMS per order, email when there is an address.
  const sms = [], mails = [];
  let smsSent = false;
  const self = {
    orderModel: {
      findById: () => ({ select: async () => ({ orderSmsSent: smsSent }) }),
      updateOne: async () => { smsSent = true; },
    },
    bulkSmsService: { sentSingleSms: (phone, text) => sms.push([phone, text]) },
    emailService: { sendEmail: (to) => mails.push(to) },
  };
  const order = { _id: 'id1', orderId: '000777', phoneNo: '01700000000', email: 'buyer@example.com' };
  await OrderService.prototype.sendOrderPlacedNotifications.call(self, order);
  await OrderService.prototype.sendOrderPlacedNotifications.call(self, order);
  assert.equal(sms.length, 1, 'order SMS only once');
  assert.match(sms[0][1], /অর্ডারটি কনফার্ম হয়েছে/);
  assert.equal(mails.length, 2);

  // The public session-key route may no longer change other order fields.
  const updates = [];
  const sessionThis = { orderModel: { findByIdAndUpdate: async (id, update) => updates.push(update) } };
  await OrderService.prototype.updateOrderSessionKey.call(sessionThis, 'id', { sslSessionId: 'abc', paymentStatus: 'paid', grandTotal: 1 });
  await OrderService.prototype.updateOrderSessionKey.call(sessionThis, 'id', { paymentStatus: 'paid' });
  assert.deepEqual(updates, [{ $set: { sslSessionId: 'abc' } }]);
}

async function checkOrderUpdateAuth() {
  const writes = [];
  const secret = 'eps-order-update-fixture-secret';
  class AuthFixtureModule {}
  Module({
    imports: [PassportModule], controllers: [OrderController],
    providers: [
      { provide: OrderService, useValue: { updateOrderById: async (id, body) => { writes.push({id, body}); return {success: true}; } } },
      { provide: JwtAdminStrategy, useValue: new JwtAdminStrategy({ get: () => secret }) },
    ],
  })(AuthFixtureModule);
  const app = await NestFactory.create(AuthFixtureModule, {logger: false});
  try {
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl() + '/api/order/update/507f1f77bcf86cd799439011';
    const update = (administrator) => fetch(url, {
      method: 'PUT', headers: {'Content-Type': 'application/json', ...(administrator ? {administrator} : {})},
      body: JSON.stringify({paymentStatus: 'paid', grandTotal: 1}),
    });
    assert.equal((await update()).status, 401);
    assert.equal((await update('forged')).status, 401);
    assert.equal((await update(jwt.sign({_id:'fixture-admin'}, secret, {expiresIn:-1}))).status, 401);
    assert.equal(writes.length, 0, 'unauthenticated requests never reach the writer');
    assert.equal((await update(jwt.sign({_id:'fixture-admin', role:'admin'}, secret, {expiresIn:'1h'}))).status, 200);
    assert.equal(writes.length, 1, 'existing authenticated admin update remains available');
  } finally { await app.close(); }
}

function checkSnippetRegistered() {
  const main = fs.readFileSync(path.join(__dirname, '../api/src/main.ts'), 'utf8');
  assert.match(main, /'checkout-payment\.html'/, 'snippet is injected into storefront pages');
  const html = fs.readFileSync(path.join(__dirname, '../gtm-snippets/checkout-payment.html'), 'utf8');
  assert.match(html, /https:\/\/apisub\.amolbooks\.com\/api/);
  assert.match(html, /বিকাশ \/ নগদ \/ কার্ড/);
  for (const script of html.match(/<script>([\s\S]*?)<\/script>/g)) new Function(script.replace(/<\/?script>/g, ''));
}

async function main() {
  await checkOrderUpdateAuth();
  await checkOrderNotifications();
  checkSnippetRegistered();

  const eps = await startFakeEps();
  const mongo = await startMongo();
  let app;
  try {
    const Order = mongo.connection.model('Order', OrderSchema);
    await Order.init();
    const settings = { ...SETTINGS, EPS_BASE_URL: eps.url };
    const config = { get: (name) => settings[name] };
    const httpService = new HttpService(axios.create());
    const epsService = new EpsService(httpService, config);
    const notified = [];
    const sslCalls = [];
    const payment = new PaymentService(
      Order, null, { getClientIp: () => '203.0.113.9' }, { sslInit: async (body) => { sslCalls.push(body); return { sessionkey: 'ssl' }; } },
      config, httpService, { sentSingleSms() {} }, epsService,
      { sendOrderPlacedNotifications: async (order) => notified.push(String(order.orderId)) },
    );
    class FixtureModule {}
    Module({ controllers: [PaymentController], providers: [{ provide: PaymentService, useValue: payment }] })(FixtureModule);
    app = await NestFactory.create(FixtureModule, { logger: false });
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    const base = (await app.getUrl()).replace('[::1]', '127.0.0.1') + '/api/payment';
    const call = async (route, body, method = body ? 'POST' : 'GET') => {
      const response = await fetch(base + route, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const text = await response.text();
      let json = null;
      try { json = JSON.parse(text); } catch (_) {}
      return { status: response.status, location: response.headers.get('location'), body: json };
    };

    let counter = 100;
    const newOrder = async (extra = {}) => Order.create({
      orderId: String(++counter).padStart(6, '0'), name: 'Fixture Buyer', phoneNo: '01711000111', email: 'buyer@example.com',
      shippingAddress: 'House 1, Road 2', division: { name: 'Dhaka' }, area: { name: 'Mirpur' }, paymentType: 'online_payment',
      paymentStatus: 'unpaid', subTotal: 500, discount: 185, deliveryCharge: 60, grandTotal: 375, orderStatus: 1,
      orderedItems: [{ _id: new mongoose.Types.ObjectId(), name: 'প্রোডাক্টিভ মুসলিম', nameEn: 'Productive Muslim', quantity: 1, unitPrice: 315, salePrice: 315, regularPrice: 500, orderType: 'regular' }],
      ...extra,
    });
    const init = (order, phone = '+880 1711-000111') =>
      call('/init-ssl', { tran_id: order.orderId, total_amount: 1, cus_phone: phone });
    const mtidOf = async (order) => (await Order.findById(order._id).lean()).epsMerchantTransactionId;

    // Settings switch.
    assert.equal((await call('/eps/config')).body.data.enabled, true);

    // 1. Start: phone must match, amount comes from the order (not the browser's 1).
    const paidOrder = await newOrder();
    assert.equal((await init(paidOrder, '01700000000')).status, 404, 'wrong phone is refused');
    assert.equal((await call('/init-ssl', { tran_id: '999999', cus_phone: '01711000111' })).status, 404);
    const started = await init(paidOrder, '০১৭১১০০০১১১');
    assert.equal(started.status, 201);
    assert.match(started.body.data.GatewayPageURL, /^https:\/\/pg\.fixture\.test\/PG\?data=/);
    let saved = await Order.findById(paidOrder._id).lean();
    const sent = eps.state.initBodies.at(-1);
    assert.equal(sent.totalAmount, 375);
    assert.equal(sent.transactionTypeId, 1);
    assert.equal(sent.storeId, 'fixture-store');
    assert.equal(sent.merchantId, 'fixture-merchant');
    assert.equal(sent.customerPhone, '01711000111');
    assert.equal(sent.ProductList[0].ProductName, 'Productive Muslim');
    assert.match(sent.merchantTransactionId, /^\d{19}$/);
    assert.equal(sent.successUrl, `https://api.fixture.test/api/payment/eps/return/${sent.merchantTransactionId}/success`);
    assert.equal(saved.paymentGateway, 'eps');
    assert.equal(saved.paymentGatewayStatus, 'initiated');
    assert.equal(saved.epsMerchantTransactionId, sent.merchantTransactionId);
    assert.equal(saved.epsTransactionId, started.body.data.sessionkey);
    assert.equal(saved.epsAttempts[0].amount, 375);

    // 2. Paid: verified with EPS, idempotent, notifications once.
    eps.state.tx.get(sent.merchantTransactionId).status = 'Success';
    let back = await call(`/eps/return/${sent.merchantTransactionId}/success`);
    assert.equal(back.status, 302);
    assert.equal(back.location, `https://shop.fixture.test/checkout/order-success/${paidOrder._id}?payment=paid`);
    saved = await Order.findById(paidOrder._id).lean();
    assert.equal(saved.paymentStatus, 'paid');
    assert.equal(saved.paidAmount, 375);
    assert.equal(saved.paymentFinancialEntity, 'bKash');
    assert.ok(saved.paidAt instanceof Date);
    back = await call(`/eps/return/${sent.merchantTransactionId}/fail`, {}, 'POST');
    assert.equal(back.location, `https://shop.fixture.test/checkout/order-success/${paidOrder._id}?payment=paid`, 'a later fail redirect does not undo a payment');
    assert.deepEqual(notified, [paidOrder.orderId], 'SMS/email after payment, once');
    assert.equal((await init(paidOrder)).status, 400, 'paid orders cannot start another payment');
    const status = await call(`/eps/status/${paidOrder._id}`);
    assert.deepEqual(Object.keys(status.body.data).sort(), ['_id', 'amount', 'orderId', 'paidAmount', 'paidWith', 'paymentGatewayStatus', 'paymentStatus', 'paymentType']);
    assert.equal(status.body.data.paymentStatus, 'paid');

    // 3. Success URL opened without paying: EPS says still open => not paid.
    const forged = await newOrder();
    await init(forged);
    const forgedId = await mtidOf(forged);
    back = await call(`/eps/return/${forgedId}/success`);
    assert.equal(back.location, `https://shop.fixture.test/payment/fail?order=${forged._id}&state=pending`);
    saved = await Order.findById(forged._id).lean();
    assert.equal(saved.paymentStatus, 'unpaid');
    assert.equal(saved.paymentGatewayStatus, 'pending');
    assert.equal((await call('/eps/return/123/success')).location, 'https://shop.fixture.test/payment/fail?state=failed');
    assert.equal((await call('/eps/return/12345678901234/success')).location, 'https://shop.fixture.test/payment/fail?state=failed');

    // 4. Failed and cancelled: order kept, unpaid, marked for staff.
    const failed = await newOrder();
    await init(failed);
    eps.state.tx.get(await mtidOf(failed)).status = 'Failed';
    back = await call(`/eps/return/${await mtidOf(failed)}/fail`);
    assert.equal(back.location, `https://shop.fixture.test/payment/fail?order=${failed._id}&state=failed`);
    saved = await Order.findById(failed._id).lean();
    assert.ok(saved, 'failed order is kept');
    assert.equal(saved.paymentStatus, 'unpaid');
    assert.equal(saved.paymentGatewayStatus, 'failed');
    const cancelled = await newOrder();
    await init(cancelled);
    back = await call(`/eps/return/${await mtidOf(cancelled)}/cancel`);
    assert.equal(back.location, `https://shop.fixture.test/payment/fail?order=${cancelled._id}&state=cancelled`);
    saved = await Order.findById(cancelled._id).lean();
    assert.equal(saved.paymentStatus, 'unpaid');
    assert.equal(saved.paymentGatewayStatus, 'cancelled');

    // 5. Wrong amount at EPS: not paid, held for review.
    const mismatch = await newOrder();
    await init(mismatch);
    Object.assign(eps.state.tx.get(await mtidOf(mismatch)), { status: 'Success', paidAmount: 10 });
    back = await call(`/eps/return/${await mtidOf(mismatch)}/success`);
    assert.equal(back.location, `https://shop.fixture.test/payment/fail?order=${mismatch._id}&state=review`);
    saved = await Order.findById(mismatch._id).lean();
    assert.equal(saved.paymentStatus, 'unpaid');
    assert.equal(saved.paymentGatewayStatus, 'review');
    assert.equal((await call(`/eps/retry/${mismatch._id}`, {})).status, 400, 'no new payment while one is under review');

    // 6. Pay again on the same order; the first attempt succeeding later is flagged as a double payment.
    const firstAttempt = await mtidOf(failed);
    const retry = await call(`/eps/retry/${failed._id}`, {});
    assert.equal(retry.status, 201);
    assert.match(retry.body.data.GatewayPageURL, /^https:\/\/pg\.fixture\.test/);
    const secondAttempt = await mtidOf(failed);
    assert.notEqual(secondAttempt, firstAttempt);
    eps.state.tx.get(secondAttempt).status = 'Success';
    back = await call(`/eps/return/${secondAttempt}/success`);
    assert.match(back.location, /order-success/);
    eps.state.tx.get(firstAttempt).status = 'Success';
    await call(`/eps/return/${firstAttempt}/success`);
    saved = await Order.findById(failed._id).lean();
    assert.equal(saved.paymentStatus, 'paid');
    assert.equal(saved.epsMerchantTransactionId, secondAttempt);
    assert.match(saved.paymentGatewayMessage, /Paid twice/);
    assert.equal(saved.epsAttempts.find((a) => a.merchantTransactionId === firstAttempt).status, 'paid_duplicate');
    const retryPaid = await call(`/eps/retry/${failed._id}`, {});
    assert.equal(retryPaid.body.data.paid, true, 'pay again on a paid order just opens the thank-you page');

    // 7. Shopper paid but never came back: the background re-check marks it paid.
    const closedTab = await newOrder();
    await init(closedTab);
    eps.state.tx.get(await mtidOf(closedTab)).status = 'Success';
    await Order.updateOne({ _id: closedTab._id }, { $unset: { paymentCheckedAt: 1 } });
    assert.ok((await payment.reconcileEpsPayments()) >= 1);
    assert.equal((await Order.findById(closedTab._id).lean()).paymentStatus, 'paid');
    assert.ok(notified.includes(closedTab.orderId));

    // 8. Status page polling re-checks a pending order.
    eps.state.tx.get(forgedId).status = 'Success';
    await Order.updateOne({ _id: forged._id }, { $unset: { paymentCheckedAt: 1 } });
    assert.equal((await call(`/eps/status/${forged._id}`)).body.data.paymentStatus, 'paid');

    // 9. Rules: cash on delivery, cancelled orders, old orders, EPS down.
    assert.equal((await init(await newOrder({ paymentType: 'cash_on_delivery' }))).status, 400);
    assert.equal((await init(await newOrder({ orderStatus: 6 }))).status, 400);
    const old = await newOrder();
    await Order.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date(Date.now() - 30 * 3600e3) } });
    assert.equal((await init(old)).status, 400);
    const down = await newOrder();
    eps.state.failInit = true;
    assert.equal((await init(down)).status, 503);
    eps.state.failInit = false;
    saved = await Order.findById(down._id).lean();
    assert.equal(saved.paymentGatewayStatus, 'init_failed');
    assert.equal(saved.paymentStatus, 'unpaid');
    eps.state.down = true;
    const unreachable = await newOrder();
    assert.equal((await init(unreachable)).status, 503);
    eps.state.down = false;

    // Live release: an old session must not pay an edited order or accept an unbound status.
    const edited = await newOrder();
    await init(edited);
    const editedId = await mtidOf(edited);
    await Order.updateOne({ _id: edited._id }, { $set: { grandTotal: 500 } });
    eps.state.tx.get(editedId).status = 'Success';
    await call(`/eps/return/${editedId}/success`);
    assert.equal((await Order.findById(edited._id).lean()).paymentGatewayStatus, 'review');
    assert.equal((await Order.findById(edited._id).lean()).paymentStatus, 'unpaid');
    for (const override of [{ omitId: true }, { wrongId: '9999999999999999999' }]) {
      const unbound = await newOrder();
      await init(unbound);
      const id = await mtidOf(unbound);
      Object.assign(eps.state.tx.get(id), { status: 'Success', ...override });
      await call(`/eps/return/${id}/success`);
      assert.equal((await Order.findById(unbound._id).lean()).paymentStatus, 'unpaid');
    }
    // Legacy gateway callbacks cannot delete or mark an EPS order paid.
    const beforeLegacy = await Order.findById(failed._id).lean();
    assert.equal((await call('/ssl-ipn', { tran_id: failed.orderId, status: 'FAILED', amount: 1 })).status, 500);
    assert.deepEqual(await Order.findById(failed._id).lean(), beforeLegacy);
    settings.EPS_ENABLED = 'false';
    assert.equal((await call('/eps/config')).body.data.enabled, false);
    delete settings.EPS_ENABLED;
    const merchantRequired = { ...settings, EPS_MERCHANT_ID: '' };
    assert.equal(new EpsService(httpService, { get: (name) => merchantRequired[name] }).isConfigured(), false);

    // A missed callback from an earlier attempt must still recover the payment.
    const earlier = await newOrder();
    await init(earlier);
    const earlierId = await mtidOf(earlier);
    eps.state.tx.get(earlierId).status = 'Failed';
    await call(`/eps/return/${earlierId}/fail`);
    await call(`/eps/retry/${earlier._id}`, {});
    const laterId = await mtidOf(earlier);
    eps.state.tx.get(earlierId).status = 'Success';
    await Order.updateOne({ _id: earlier._id }, { $unset: { paymentCheckedAt: 1 } });
    await payment.reconcileEpsPayments();
    assert.equal((await Order.findById(earlier._id).lean()).epsMerchantTransactionId, earlierId);
    // Also detect two successful attempts when both browser callbacks were lost.
    eps.state.tx.get(laterId).status = 'Success';
    await Order.updateOne({ _id: earlier._id }, { $unset: { paymentCheckedAt: 1 } });
    await payment.reconcileEpsPayments();
    assert.match((await Order.findById(earlier._id).lean()).paymentGatewayMessage, /Paid twice/);

    // Gift wrapping is part of the saved payable total, including EPS retries.
    const wrappedGift = await newOrder({ isGiftOrder:true, giftWrap:true, giftWrapCharge:30, grandTotal:405,
      gift:{ senderName:'Gift Sender', senderPhone:'01711000222', message:'শুভেচ্ছা' } });
    assert.equal((await init(wrappedGift)).status, 201);
    const giftAttempt = await mtidOf(wrappedGift);
    assert.equal(eps.state.tx.get(giftAttempt).body.totalAmount, 405, 'EPS charges the saved total with wrapping');
    eps.state.tx.get(giftAttempt).status = 'Failed';
    await call(`/eps/return/${giftAttempt}/fail`);
    assert.equal((await call(`/eps/retry/${wrappedGift._id}`, {})).status, 201);
    assert.equal(eps.state.tx.get(await mtidOf(wrappedGift)).body.totalAmount, 405, 'Retry keeps the wrapping fee');

    // 10. One login reused; an expired token logs in again once.
    assert.equal(eps.state.tokenCalls, 1, 'EPS token is cached');
    eps.state.tokens.clear();
    const relogin = await newOrder();
    assert.equal((await init(relogin)).status, 201);
    assert.equal(eps.state.tokenCalls, 2);

    // 11. Sandbox settings never switch on against the live database by accident.
    const sandboxSettings = { ...settings, EPS_BASE_URL: 'https://sandboxpgapi.eps.com.bd', PRODUCTION_BUILD: 'true' };
    const sandboxEps = new EpsService(httpService, { get: (name) => sandboxSettings[name] });
    assert.equal(sandboxEps.isConfigured(), false, 'sandbox + live database stays off');
    sandboxSettings.EPS_ALLOW_SANDBOX = 'true';
    assert.equal(sandboxEps.isConfigured(), true, 'explicitly allowed on a test database');
    delete sandboxSettings.PRODUCTION_BUILD;
    delete sandboxSettings.EPS_ALLOW_SANDBOX;
    assert.equal(sandboxEps.isConfigured(), true, 'sandbox on a non-production database');

    // 12. Without EPS settings the old SSLCommerz path is used unchanged.
    delete settings.EPS_HASH_KEY;
    assert.equal((await call('/eps/config')).body.data.enabled, false);
    const legacy = await call('/init-ssl', { tran_id: '000101', cus_phone: '01711000111' });
    assert.equal(legacy.status, 201);
    assert.equal(sslCalls.length, 1);

    console.log('EPS payment checks passed');
  } finally {
    if (app) await app.close();
    await mongo.connection.close().catch(() => {});
    mongo.stop();
    eps.server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
