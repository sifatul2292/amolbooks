// Automatic WhatsApp order messages (api/src/shared/whatsapp): off by default, one message per
// order and kind, failures recorded, Meta's webhook check/signature/status updates, the order and
// courier hooks, the order SMS held for WhatsApp (sent only when not delivered), the buttons
// (confirm / more books / change) and answers, and the page wiring. A fake WhatsApp server on 127.0.0.1 answers instead of Meta
// (nothing is sent to anyone) and the database is a throwaway one on the local mongod. Needs `api/dist`.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire, Module } = require('node:module');
const root = path.resolve(__dirname, '..');
process.env.NODE_PATH = [path.join(root, 'api/dist'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();
const lib = createRequire(path.join(root, 'api/package.json'));
lib('reflect-metadata');
const mongoose = lib('mongoose');
const { WhatsappService } = require('../api/dist/shared/whatsapp/whatsapp.service');
const { WhatsappController } = require('../api/dist/shared/whatsapp/whatsapp.controller');
const { OrderService } = require('../api/dist/pages/sales/order/order.service');
const { UtilsService } = require('../api/dist/shared/utils/utils.service');
const { OrderSchema } = require('../api/dist/schema/order.schema');

const uri = 'mongodb://127.0.0.1:27017/amol_whatsapp_test_' + crypto.randomBytes(6).toString('hex');
assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27017\/amol_whatsapp_test_[a-f0-9]+$/, 'Only a throwaway local database is permitted');
const silent = { error() {}, warn() {}, log() {} };
const loose = () => new mongoose.Schema({}, { strict: false });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const WA_ENV = ['WHATSAPP_ENABLED', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_API_VERSION', 'WHATSAPP_GRAPH_BASE',
  'WHATSAPP_TEMPLATE_LANGUAGE', 'WHATSAPP_TEMPLATE_ORDER_PLACED', 'WHATSAPP_TEMPLATE_ORDER_SHIPPED', 'WHATSAPP_APP_SECRET', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'WHATSAPP_CONFIRM_BUTTONS', 'WHATSAPP_SMS_WAIT_SECONDS', 'WHATSAPP_AUTO_REPLY'];
let connection;
let server;

(async () => {
  // 1. Page and app wiring.
  const page = fs.readFileSync(path.join(root, 'api/upload/static/custom-orders.html'), 'utf8');
  for (const needle of ['whatsappMessages:1', 'customerConfirmation:1', 'customerRequest:1', 'orderSmsSkippedAt:1', "phoneCell(o.phoneNo)+whatsappBadge(o)+customerConfirmBadge(o)", 'function whatsappBadge(o)', 'function customerConfirmBadge(o)', '.wa-badge.is-failed', '.cc-badge.is-change', '.cc-badge.is-more', 'Wants more books', 'order SMS not sent (WhatsApp delivered)']) {
    assert.ok(page.includes(needle), 'Orders page has ' + needle);
  }
  const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
  assert.match(main, /'checkout-whatsapp-note\.html',/, 'The checkout note is injected');
  assert.match(main, /startsWith\('\/api\/whatsapp\/webhook'\)\) req\.rawBody = buffer;/, 'The webhook keeps its raw body for the signature');
  assert.match(fs.readFileSync(path.join(root, 'api/src/app.module.ts'), 'utf8'), /^\s+WhatsappModule,$/m);
  const note = fs.readFileSync(path.join(root, 'gtm-snippets/checkout-whatsapp-note.html'), 'utf8');
  for (const match of note.matchAll(/<script>([\s\S]*?)<\/script>/g)) new (require('node:vm').Script)(match[1]);
  assert.match(note, /\/api\/whatsapp\/public-status/);

  // 2. Helpers.
  assert.equal(WhatsappService.toWhatsappNumber('01712-345678'), '8801712345678');
  assert.equal(WhatsappService.toWhatsappNumber('+880 1712 345678'), '8801712345678');
  assert.equal(WhatsappService.toWhatsappNumber('০১৭১২৩৪৫৬৭৮'), '8801712345678');
  assert.equal(WhatsappService.toWhatsappNumber('0021712345678'), null);
  assert.equal(WhatsappService.toWhatsappNumber('12345'), null);
  assert.equal(WhatsappService.cleanParam('a\nb\t c     d'), 'a b  c   d');
  assert.equal(WhatsappService.cleanParam(''), '-');
  assert.equal(WhatsappService.cleanParam('x'.repeat(500)).length, 200);
  assert.deepEqual(
    WhatsappService.templateParams('order_placed', { name: 'রহিম', orderId: 'A1', grandTotal: 1234.4, orderedItems: [{ name: 'বই ক', quantity: 2 }, { name: 'বই খ', quantity: 1 }] }),
    ['রহিম', 'A1', 'বই ক × 2, বই খ', '1,234'],
  );
  assert.deepEqual(
    WhatsappService.templateParams('order_shipped', { orderId: 'A1', _id: 'abc' }, { providerName: 'Steadfast Courier', trackingId: 'TR1' }),
    ['প্রিয় গ্রাহক', 'A1', 'Steadfast', 'TR1', 'abc'],
  );

  // 3. Fake WhatsApp server.
  const calls = [];
  let reply = 'ok';
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: JSON.parse(body || '{}') });
      res.setHeader('Content-Type', 'application/json');
      if (reply === 'undeliverable') {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: { code: 131026, message: 'Message undeliverable' } }));
      }
      res.end(JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.TEST' + calls.length }] }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const setEnv = (on) => {
    for (const key of WA_ENV) delete process.env[key];
    if (!on) return;
    Object.assign(process.env, {
      WHATSAPP_ENABLED: 'true', WHATSAPP_ACCESS_TOKEN: 'test-only-token', WHATSAPP_PHONE_NUMBER_ID: 'TEST_PHONE_ID',
      WHATSAPP_GRAPH_BASE: base, WHATSAPP_TEMPLATE_ORDER_PLACED: 'order_received', WHATSAPP_TEMPLATE_ORDER_SHIPPED: 'order_shipped',
      WHATSAPP_APP_SECRET: 'test-only-secret', WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'test-only-verify',
      // This check covers the hand-over answers; check-whatsapp-inbox covers the inbox ones.
      WHATSAPP_AUTO_REPLY: 'handover',
    });
  };

  connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  const Order = connection.model('Order', OrderSchema);
  await Order.init();
  const whatsapp = new WhatsappService(Order);
  whatsapp.logger = silent;
  const seed = async (overrides = {}) => {
    const id = new mongoose.Types.ObjectId();
    const doc = {
      _id: id, orderId: 'TEST-' + id.toString().slice(-6), name: 'Test customer — not a real order', phoneNo: '01700000000',
      shippingAddress: 'Test address', paymentType: 'cash_on_delivery', paymentStatus: 'unpaid', orderStatus: 1,
      subTotal: 300, discount: 0, deliveryCharge: 60, grandTotal: 360,
      orderedItems: [{ _id: new mongoose.Types.ObjectId(), name: 'পরীক্ষার বই', quantity: 1, regularPrice: 300, salePrice: 300 }],
      createdAt: new Date(), updatedAt: new Date(), ...overrides,
    };
    await Order.collection.insertOne(doc);
    return doc;
  };
  const get = (doc) => Order.findById(doc._id).lean();

  // 4. Off by default: nothing sent, nothing recorded.
  setEnv(false);
  const A = await seed();
  assert.equal(await whatsapp.notifyOrder('order_placed', A), 'skipped');
  assert.equal(calls.length, 0);
  assert.equal((await get(A)).whatsappMessages, undefined);
  assert.deepEqual(new WhatsappController(whatsapp).status().data, { orderMessages: false });

  // 5. On: one template message, recorded once.
  setEnv(true);
  assert.deepEqual(new WhatsappController(whatsapp).status().data, { orderMessages: true });
  assert.equal(await whatsapp.notifyOrder('order_placed', A), 'sent');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/v26.0/TEST_PHONE_ID/messages');
  assert.equal(calls[0].auth, 'Bearer test-only-token');
  assert.deepEqual(calls[0].body, {
    messaging_product: 'whatsapp', to: '8801700000000', type: 'template',
    template: { name: 'order_received', language: { code: 'bn' }, components: [{ type: 'body', parameters: [
      { type: 'text', text: 'Test customer — not a real order' }, { type: 'text', text: A.orderId },
      { type: 'text', text: 'পরীক্ষার বই' }, { type: 'text', text: '360' },
    ] }] },
  });
  let order = await get(A);
  assert.equal(order.whatsappMessages.length, 1);
  assert.equal(order.whatsappMessages[0].status, 'sent');
  assert.equal(order.whatsappMessages[0].messageId, 'wamid.TEST1');
  assert.equal(order.whatsappMessages[0].to, '8801700000000');
  assert.equal(await whatsapp.notifyOrder('order_placed', A), 'skipped', 'Never twice for the same order');
  const x = await seed();
  const twice = await Promise.all([whatsapp.notifyOrder('order_placed', x), whatsapp.notifyOrder('order_placed', x)]);
  assert.deepEqual(twice.sort(), ['sent', 'skipped'], 'Two at once still send one');
  assert.equal(calls.length, 2);

  // 6. A template switched off, a non-BD number, and Meta refusing the message.
  delete process.env.WHATSAPP_TEMPLATE_ORDER_SHIPPED;
  assert.equal(await whatsapp.notifyOrder('order_shipped', A), 'skipped');
  setEnv(true);
  assert.equal(await whatsapp.notifyOrder('order_placed', await seed({ phoneNo: '+44 7700 900000' })), 'skipped');
  reply = 'undeliverable';
  const B = await seed();
  assert.equal(await whatsapp.notifyOrder('order_placed', B), 'failed');
  order = await get(B);
  assert.equal(order.whatsappMessages[0].status, 'failed');
  assert.match(order.whatsappMessages[0].error, /131026 Message undeliverable/);
  reply = 'ok';

  // 7. Webhook: Meta's check, the signature, and status updates that never go backwards.
  const controller = new WhatsappController(whatsapp);
  const res = { code: 0, body: null, status(code) { this.code = code; return this; }, type() { return this; }, send(body) { this.body = body; } };
  controller.verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'test-only-verify', 'hub.challenge': '12345' }, res);
  assert.deepEqual([res.code, res.body], [200, '12345']);
  assert.throws(() => controller.verify({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '1' }, res), (e) => e.getStatus() === 403);
  const statusBody = (id, status, errors) => ({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id, status, timestamp: '1', recipient_id: '8801700000000', ...(errors ? { errors } : {}) }] } }] }] });
  const signed = (payload) => {
    const raw = Buffer.from(JSON.stringify(payload));
    return { req: { rawBody: raw }, signature: 'sha256=' + crypto.createHmac('sha256', 'test-only-secret').update(raw).digest('hex'), payload };
  };
  let hook = signed(statusBody('wamid.TEST1', 'delivered'));
  assert.deepEqual(await controller.receive(hook.req, hook.signature, hook.payload), { success: true, updated: 1, handled: 0 });
  await assert.rejects(controller.receive(hook.req, 'sha256=' + '0'.repeat(64), hook.payload), (e) => e.getStatus() === 401, 'Wrong signature');
  await assert.rejects(controller.receive({}, hook.signature, hook.payload), (e) => e.getStatus() === 401, 'No raw body');
  hook = signed(statusBody('wamid.TEST1', 'read'));
  await controller.receive(hook.req, hook.signature, hook.payload);
  hook = signed(statusBody('wamid.TEST1', 'delivered'));
  assert.deepEqual(await controller.receive(hook.req, hook.signature, hook.payload), { success: true, updated: 0, handled: 0 }, 'A late "delivered" does not undo "read"');
  assert.equal((await get(A)).whatsappMessages[0].status, 'read');
  hook = signed(statusBody('wamid.TEST2', 'failed', [{ code: 131026, title: 'Message undeliverable' }]));
  await controller.receive(hook.req, hook.signature, hook.payload);
  order = await get(x);
  assert.equal(order.whatsappMessages[0].status, 'failed');
  assert.equal(order.whatsappMessages[0].error, '131026 Message undeliverable');
  hook = signed(statusBody('wamid.UNKNOWN', 'read'));
  assert.deepEqual(await controller.receive(hook.req, hook.signature, hook.payload), { success: true, updated: 0, handled: 0 });
  delete process.env.WHATSAPP_APP_SECRET;
  await assert.rejects(controller.receive(hook.req, hook.signature, hook.payload), (e) => e.getStatus() === 503, 'No app secret, no webhook');
  setEnv(true);

  // 8. Order flow hooks: cash-on-delivery order placed, and every courier booking.
  const Setting = connection.model('Setting', loose());
  const Product = connection.model('Product', loose());
  const Incomplete = connection.model('IncompleteOrder', loose());
  await Setting.collection.insertOne({ courierMethods: [{ status: 'active', providerName: 'Steadfast Courier', apiKey: 'test-only', secretKey: 'test-only' }] });
  const courierService = new Proxy({
    async createOrderWithProvider(_config, payload) {
      return { status: 200, consignment: { consignment_id: 900001, tracking_code: 'TRACKTEST1', status: 'in_review', invoice: payload.invoice } };
    },
  }, { get: (target, key) => target[key] || (async () => ({ status: 404 })) });
  const orderService = Object.create(OrderService.prototype);
  Object.assign(orderService, {
    orderModel: Order, incompleteOrderModel: Incomplete, productModel: Product, settingModel: Setting,
    utilsService: Object.assign(new UtilsService(Product), { generateInvoicePdf: async () => {} }), courierService,
    bulkSmsService: { sentSingleSms(phone, text) { sms.push({ phone, text }); } }, emailService: { sendEmail() {} }, configService: { get: () => undefined },
    whatsappService: whatsapp, logger: silent,
  });
  const sms = [];
  const orderSms = () => sms.filter((item) => item.text.startsWith('অর্ডারটি কনফার্ম হয়েছে')).length;
  // Without OrderService's sender nothing is held (the SMS goes out as before).
  assert.equal(await whatsapp.holdOrderSms(await seed()), false);
  whatsapp.onOrderSms((id) => orderService.sendHeldOrderSms(id));
  const C = await seed();
  const before = calls.length;
  await orderService.processOrderBackgroundTasks({ ...C }, { phoneNo: C.phoneNo });
  await sleep(300);
  assert.equal(calls.length, before + 1, 'Order placed sends one WhatsApp message');
  assert.equal(calls.at(-1).body.template.name, 'order_received');
  // The order SMS waits for the WhatsApp message...
  assert.equal(orderSms(), 0, 'No SMS while the WhatsApp message is on its way');
  order = await get(C);
  assert.ok(order.orderSmsDueAt > new Date(Date.now() + 100 * 1000), 'Waits two minutes by default');
  assert.equal(await whatsapp.settleOrderSms(), 0, 'Sent but not delivered yet, wait not over: still waiting');
  // ...and is dropped once WhatsApp says delivered.
  hook = signed(statusBody(order.whatsappMessages[0].messageId, 'delivered'));
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.equal(await whatsapp.settleOrderSms(), 1);
  order = await get(C);
  assert.equal(order.orderSmsDueAt, undefined);
  assert.ok(order.orderSmsSkippedAt instanceof Date, 'Recorded: SMS not needed');
  assert.notEqual(order.orderSmsSent, true);
  assert.equal(orderSms(), 0, 'Delivered on WhatsApp: no SMS');
  // Not delivered when the wait is over: the SMS goes out (once).
  const C2 = await seed();
  await orderService.processOrderBackgroundTasks({ ...C2 }, { phoneNo: C2.phoneNo });
  await sleep(300);
  assert.equal(orderSms(), 0);
  await Order.updateOne({ _id: C2._id }, { $set: { orderSmsDueAt: new Date(Date.now() - 1000) } });
  assert.deepEqual(await Promise.all([whatsapp.settleOrderSms(), whatsapp.settleOrderSms(String(C2._id))]).then((r) => r[0] + r[1]), 1, 'Decided once');
  assert.equal(orderSms(), 1, 'Not delivered in time: SMS');
  order = await get(C2);
  assert.equal(order.orderSmsSent, true);
  assert.equal(order.orderSmsDueAt, undefined);
  // Meta refuses the message: the SMS goes out at once.
  reply = 'undeliverable';
  const C3 = await seed();
  await orderService.processOrderBackgroundTasks({ ...C3 }, { phoneNo: C3.phoneNo });
  await sleep(300);
  reply = 'ok';
  assert.equal(orderSms(), 2, 'WhatsApp failed: SMS right away');
  assert.equal((await get(C3)).orderSmsSent, true);
  // Failed later (webhook, e.g. no WhatsApp on the number): SMS at the next check.
  const C4 = await seed();
  await orderService.processOrderBackgroundTasks({ ...C4 }, { phoneNo: C4.phoneNo });
  await sleep(300);
  hook = signed(statusBody((await get(C4)).whatsappMessages[0].messageId, 'failed', [{ code: 131026, title: 'Message undeliverable' }]));
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.equal(orderSms(), 2);
  await whatsapp.settleOrderSms();
  assert.equal(orderSms(), 3, 'Undeliverable: SMS');
  // Switched off: the SMS goes out at once, as before.
  process.env.WHATSAPP_ENABLED = 'false';
  const C5 = await seed();
  await orderService.processOrderBackgroundTasks({ ...C5 }, { phoneNo: C5.phoneNo });
  assert.equal(orderSms(), 4, 'WhatsApp off: SMS as before');
  assert.equal((await get(C5)).orderSmsDueAt, undefined);
  setEnv(true);
  // Added by staff (Orders page / Customer Manager / Incomplete Orders): no WhatsApp, SMS at once.
  for (const staff of [{ orderOrigin: 'admin', manualOrderSource: 'whatsapp' }, { orderOrigin: 'incomplete', manualOrderSource: 'phone' }, { manualOrderSource: 'phone' }]) {
    const S = await seed(staff);
    const sent = calls.length;
    const texts = orderSms();
    await orderService.processOrderBackgroundTasks({ ...S }, { phoneNo: S.phoneNo });
    await sleep(200);
    assert.equal(calls.length, sent, 'Staff-added order: no WhatsApp message');
    assert.equal(orderSms(), texts + 1, 'Staff-added order: SMS as before');
    order = await get(S);
    assert.equal(order.whatsappMessages, undefined);
    assert.equal(order.orderSmsDueAt, undefined);
  }
  const online = await seed({ paymentType: 'online_payment' });
  const sentBefore = calls.length;
  await orderService.processOrderBackgroundTasks({ ...online }, { phoneNo: online.phoneNo });
  await sleep(300);
  assert.equal(calls.length, sentBefore, 'Online payments wait for the payment, like the order SMS');
  await orderService.sendToCourier(String(C._id));
  await sleep(300);
  assert.equal(calls.length, sentBefore + 1, 'Sending to the courier sends the second message');
  assert.equal(calls.at(-1).body.template.name, 'order_shipped');
  assert.deepEqual(calls.at(-1).body.template.components[0].parameters.map((p) => p.text), [C.name, C.orderId, 'Steadfast', 'TRACKTEST1', String(C._id)]);
  order = await get(C);
  assert.deepEqual(order.whatsappMessages.map((m) => [m.kind, m.status]), [['order_placed', 'delivered'], ['order_shipped', 'sent']]);
  // OrderService without WhatsApp (as in other checks) still works.
  const plain = Object.create(OrderService.prototype);
  Object.assign(plain, { logger: silent });
  plain.notifyWhatsapp('order_placed', C);

  // 9. Confirm buttons: the order message carries them, a tap confirms like staff do or flags a
  //    change, every answer goes back on WhatsApp, and anything else gets one hand-over answer.
  process.env.WHATSAPP_CONFIRM_BUTTONS = 'true';
  process.env.WHATSAPP_TEMPLATE_ORDER_PLACED = 'order_confirm';
  whatsapp.onCustomerReply((reply) => orderService.handleWhatsappReply(reply));
  const D = await seed({ orderStatus: 1 });
  assert.equal(await whatsapp.notifyOrder('order_placed', D), 'sent');
  assert.equal(calls.at(-1).body.template.name, 'order_confirm');
  assert.deepEqual(calls.at(-1).body.template.components.slice(1), [
    { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'confirm:' + D._id }] },
    { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'change:' + D._id }] },
  ]);
  const incoming = (id, from, message) => signed({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { messages: [{ id, from, timestamp: '1', ...message }] } }] }] });
  const tap = (id, from, payload) => incoming(id, from, { type: 'button', button: { payload, text: 'অর্ডার কনফার্ম' } });
  const lastText = () => calls.at(-1).body.type === 'text' ? calls.at(-1).body.text.body : null;
  const smsBefore = sms.length;
  let n = calls.length;
  hook = tap('wamid.IN1', '8801700000000', 'confirm:' + D._id);
  assert.deepEqual(await controller.receive(hook.req, hook.signature, hook.payload), { success: true, updated: 0, handled: 1 });
  order = await get(D);
  assert.equal(order.orderStatus, 2, 'Confirmed like a staff confirm');
  assert.equal(order.customerConfirmation.status, 'confirmed');
  assert.equal(order.customerConfirmation.via, 'whatsapp');
  assert.ok(order.orderTimeline === undefined || order.orderTimeline === null || order.orderTimeline.confirmed, 'Timeline follows the staff path');
  assert.equal(calls.length, n + 1);
  assert.equal(calls.at(-1).body.to, '8801700000000');
  assert.match(lastText(), new RegExp('অর্ডার #' + D.orderId + ' কনফার্ম হয়েছে'));
  assert.match(lastText(), /— amolbooks\.com$/);
  assert.equal(sms.length, smsBefore, 'Confirmed on WhatsApp: no confirmation SMS (the WhatsApp answer instead)');
  n = calls.length;
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.equal(calls.length, n, 'The same message delivered twice by Meta is handled once');
  hook = tap('wamid.IN2', '8801700000000', 'confirm:' + D._id);
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.match(lastText(), /আগেই কনফার্ম করা আছে/);
  assert.match(lastText(), /https:\/\/wa\.me\/8801893058682\?text=/, 'Points to the staff WhatsApp number');
  // Someone else's number tapping (or a forged payload) changes nothing.
  const E = await seed({ orderStatus: 1 });
  hook = tap('wamid.IN3', '8801999999999', 'confirm:' + E._id);
  await controller.receive(hook.req, hook.signature, hook.payload);
  order = await get(E);
  assert.equal(order.orderStatus, 1);
  assert.equal(order.customerConfirmation, undefined);
  assert.match(lastText(), /এই নম্বরটি শুধু অর্ডারের আপডেটের জন্য/);
  // "পরিবর্তন চাই" (first template) flags the order for staff and sends them to the staff number.
  hook = tap('wamid.IN4', '8801700000000', 'change:' + E._id);
  await controller.receive(hook.req, hook.signature, hook.payload);
  order = await get(E);
  assert.equal(order.orderStatus, 1, 'A change request does not confirm');
  assert.equal(order.customerRequest.kind, 'change');
  assert.equal(order.customerConfirmation, undefined);
  assert.match(lastText(), new RegExp('অর্ডার #' + E.orderId + '-এ কী পরিবর্তন করতে চান'));
  assert.ok(lastText().includes('https://wa.me/8801893058682?text=' + encodeURIComponent('Order #' + E.orderId + ' - change')), 'Short chat link with the order number');
  // ...and a later confirm still works, keeping the request for staff.
  hook = tap('wamid.IN5', '8801700000000', 'confirm:' + E._id);
  await controller.receive(hook.req, hook.signature, hook.payload);
  order = await get(E);
  assert.equal(order.orderStatus, 2);
  assert.equal(order.customerRequest.kind, 'change');
  // Cancelled or already booked orders are not reopened.
  const F = await seed({ orderStatus: 6 });
  hook = tap('wamid.IN6', '8801700000000', 'confirm:' + F._id);
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.equal((await get(F)).orderStatus, 6);
  assert.match(lastText(), new RegExp('অর্ডার #' + F.orderId + ' কুরিয়ারে পাঠানো বা বাতিল'));
  const G = await seed({ orderStatus: 1, courierData: { providerName: 'Steadfast Courier', consignmentId: '9' } });
  hook = tap('wamid.IN7', '8801700000000', 'confirm:' + G._id);
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.equal((await get(G)).orderStatus, 1, 'A booked parcel is never re-confirmed');
  // A staff confirm still sends the confirmation SMS.
  const H = await seed({ orderStatus: 1 });
  await orderService.changeOrderStatus(String(H._id), { orderStatus: 2 });
  assert.ok(sms.some((item) => item.text.includes('অর্ডার আইডি ' + H.orderId + ' নিশ্চিত')), 'Staff confirm: SMS as before');

  // 10. The new template (order_confirm_v2): second button "একই ডেলিভারি চার্জে আরও বই নিবো".
  process.env.WHATSAPP_TEMPLATE_ORDER_PLACED = 'order_confirm_v2';
  const M = await seed({ orderStatus: 1 });
  assert.equal(await whatsapp.notifyOrder('order_placed', M), 'sent');
  assert.equal(calls.at(-1).body.template.name, 'order_confirm_v2');
  assert.deepEqual(calls.at(-1).body.template.components.slice(1).map((c) => c.parameters[0].payload), ['confirm:' + M._id, 'more:' + M._id]);
  hook = tap('wamid.IN20', '8801700000000', 'more:' + M._id);
  await controller.receive(hook.req, hook.signature, hook.payload);
  order = await get(M);
  assert.equal(order.orderStatus, 1, 'More books does not confirm');
  assert.equal(order.customerRequest.kind, 'more');
  assert.equal(order.customerRequest.via, 'whatsapp');
  assert.match(lastText(), new RegExp('অর্ডার #' + M.orderId + '-এ একই ডেলিভারি চার্জে আরও বই যোগ করা যাবে'));
  assert.ok(lastText().includes('https://wa.me/8801893058682?text=' + encodeURIComponent('Order #' + M.orderId + ' - add more books')));
  hook = tap('wamid.IN21', '8801700000000', 'confirm:' + M._id);
  await controller.receive(hook.req, hook.signature, hook.payload);
  order = await get(M);
  assert.equal(order.orderStatus, 2);
  assert.equal(order.customerRequest.kind, 'more', 'Confirming keeps the more-books request for staff');
  hook = tap('wamid.IN22', '8801700000000', 'more:' + M._id);
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.match(lastText(), /আরও বই যোগ করা যাবে/, 'Confirmed but not booked yet: books can still be added');
  hook = tap('wamid.IN23', '8801700000000', 'more:' + G._id);
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.equal((await get(G)).customerRequest, undefined);
  assert.match(lastText(), new RegExp('অর্ডার #' + G.orderId + ' কুরিয়ারে পাঠানো বা বাতিল'), 'Booked: nothing can be added');
  // Which second button: follows the template, or set outright.
  process.env.WHATSAPP_CONFIRM_BUTTONS = 'confirm,change';
  assert.equal(whatsapp.config().secondButton, 'change');
  process.env.WHATSAPP_CONFIRM_BUTTONS = 'confirm, more';
  assert.equal(whatsapp.config().secondButton, 'more');
  process.env.WHATSAPP_CONFIRM_BUTTONS = 'true';
  process.env.WHATSAPP_TEMPLATE_ORDER_PLACED = 'order_confirm';
  assert.equal(whatsapp.config().secondButton, 'change');
  process.env.WHATSAPP_TEMPLATE_ORDER_PLACED = 'order_confirm_v2';
  // Any other message: one hand-over answer per customer, not one per message.
  n = calls.length;
  hook = incoming('wamid.IN8', '8801711111111', { type: 'text', text: { body: 'আসসালামু আলাইকুম, বইটা কবে পাব?' } });
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.equal(calls.length, n + 1);
  assert.equal(calls.at(-1).body.to, '8801711111111');
  assert.match(lastText(), /এই নম্বরটি শুধু অর্ডারের আপডেটের জন্য/);
  assert.ok(lastText().includes('https://wa.me/8801893058682?text=' + encodeURIComponent('Amol Books order')), 'No order on that number: no order number');
  hook = incoming('wamid.IN9', '8801711111111', { type: 'image', image: { id: 'x' } });
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.equal(calls.length, n + 1, 'No second hand-over within 12 hours');
  // A customer with orders: the answer names their latest order.
  const L = await seed({ phoneNo: '01733333333', createdAt: new Date(Date.now() + 60000) });
  await seed({ phoneNo: '01733333333', createdAt: new Date(Date.now() - 86400000), whatsappMessages: [{ kind: 'order_placed', to: '8801733333333', status: 'read' }] });
  assert.equal(await whatsapp.notifyOrder('order_placed', L), 'sent');
  hook = incoming('wamid.IN11', '8801733333333', { type: 'text', text: { body: 'বইটা কবে পাব?' } });
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.equal(lastText(), 'এই নম্বরটি শুধু অর্ডারের আপডেটের জন্য।\nঅর্ডার #' + L.orderId + ' নিয়ে প্রশ্ন বা কথা বলতে আমাদের অফিসিয়াল WhatsApp-এ লিখুন 👇\nhttps://wa.me/8801893058682?text=Order%20%23' + L.orderId + '\n— amolbooks.com');
  // Switched off: customers' messages are left alone.
  n = calls.length;
  process.env.WHATSAPP_ENABLED = 'false';
  hook = incoming('wamid.IN10', '8801722222222', { type: 'text', text: { body: 'hi' } });
  await controller.receive(hook.req, hook.signature, hook.payload);
  assert.equal(calls.length, n);

  console.log('WhatsApp order messages: off by default, one per order, failures, webhook check/signature/statuses, order + courier hooks (customer orders only), order SMS only when WhatsApp is not delivered, buttons (confirm/more/change, no confirm SMS), answers with the order number and page wiring pass');
})()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => {
    if (connection) { await connection.dropDatabase().catch(() => {}); await connection.close().catch(() => {}); }
    if (server) server.close();
  });
