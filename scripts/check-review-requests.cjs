// WhatsApp review request 14 days after delivery (api/src/pages/review-request, owner 2026-11-13):
// which orders are asked (and why not), the template and its three buttons, the answers to a tap
// (review link, one book suggestion, "problem" in the inbox), "stop", the review page API (pending
// verified reviews, one per book per order), the staff numbers, the locked add-by-admin route and
// the page wiring. A fake WhatsApp server on 127.0.0.1 answers instead of Meta (nothing is sent
// to anyone) and the database is a throwaway one on the local mongod. Needs `api/dist`.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createRequire, Module } = require('node:module');
const root = path.resolve(__dirname, '..');
process.env.NODE_PATH = [path.join(root, 'api/dist'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();
const lib = createRequire(path.join(root, 'api/package.json'));
lib('reflect-metadata');
const mongoose = lib('mongoose');
const { WhatsappService } = require('../api/dist/shared/whatsapp/whatsapp.service');
const { WhatsappInboxService } = require('../api/dist/shared/whatsapp/whatsapp-inbox.service');
const { WhatsappChatSchema, WhatsappChatMessageSchema } = require('../api/dist/shared/whatsapp/whatsapp-chat.schema');
const { ReviewRequestService } = require('../api/dist/pages/review-request/review-request.service');
const { OrderSchema } = require('../api/dist/schema/order.schema');
const { ProductSchema } = require('../api/dist/schema/product.schema');
const { ReviewSchema } = require('../api/dist/schema/review.schema');

const uri = 'mongodb://127.0.0.1:27017/amol_review_request_test_' + crypto.randomBytes(6).toString('hex');
assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27017\/amol_review_request_test_[a-f0-9]+$/, 'Only a throwaway local database is permitted');
const silent = { error() {}, warn() {}, log() {} };
const DAY = 24 * 60 * 60 * 1000;
const ENV = ['WHATSAPP_ENABLED', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_GRAPH_BASE', 'WHATSAPP_TEMPLATE_ORDER_PLACED',
  'WHATSAPP_TEMPLATE_ORDER_SHIPPED', 'WHATSAPP_TEMPLATE_REVIEW_REQUEST', 'WHATSAPP_TEMPLATE_REVIEW_APPROVED', 'WHATSAPP_AUTO_REPLY', 'REVIEW_REQUEST_DAYS', 'REVIEW_REQUEST_HOURS',
  'REVIEW_REQUEST_HOLDOUT_PERCENT', 'REVIEW_REQUEST_SKIP_NUMBERS', 'REVIEW_REWARD_COUPON', 'REVIEW_REQUEST_DISABLED'];
let connection;
let server;

(async () => {
  // 1. Wiring: route, module, locked admin route, staff page, docs.
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const main = read('api/src/main.ts');
  assert.match(main, /\^\\\/rate\\\/\(\[A-Za-z0-9_-\]\{16\}\)\\\/\?\$/, 'main.ts handles /rate/<token>');
  assert.ok(main.includes('return res.redirect(302, `/pages/order-review#t=${rate[1]}`);'), '/rate/<token> opens the page inside the storefront');
  assert.ok(main.indexOf('/pages/order-review#t=') < main.indexOf('app.use(storefrontSeoRouting);'), 'The redirect comes before the storefront routing');
  assert.match(main, /^\s+'order-review-loader\.html',$/m, 'The loader is a storefront snippet');
  assert.match(read('api/src/app.module.ts'), /^\s+ReviewRequestModule,\r?$/m);
  const controller = read('api/src/pages/review/review.controller.ts');
  const addByAdmin = controller.slice(controller.indexOf("@Post('/add-by-admin')"), controller.indexOf('async addReviewByAdmin('));
  assert.match(addByAdmin, /@UseGuards\(AdminJwtAuthGuard\)/, 'add-by-admin needs an admin login');
  assert.match(addByAdmin, /@AdminMetaRoles\(AdminRoles\.SUPER_ADMIN, AdminRoles\.ADMIN\)/);
  for (const file of ['gtm-snippets/order-review-loader.html', 'gtm-snippets/review-requests.html']) {
    const page = read(file);
    for (const match of page.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1], { filename: file });
  }
  const reviewPage = read('gtm-snippets/order-review.js');
  new vm.Script(reviewPage, { filename: 'gtm-snippets/order-review.js' });
  for (const needle of ["'/order-review/'", "'/upload/single-image'", "'https://apisub.amolbooks.com/api'", 'app-extra-page-view', "'/login-code'",
    "'/login'", 'localStorage.setItem(data.storageKey, data.storageValue)', "location.assign('/account/profile')", 'hintsHtml(book, index)',
    "api('/login-code', 'POST', { phone: state.login.phone })", 'রিভিউ পাঠান', 'ভালো-মন্দ যা মনে হয়']) {
    assert.ok(reviewPage.includes(needle), 'Review page has ' + needle);
  }
  // The loader moves the token out of the address bar before anything else runs.
  const loader = read('gtm-snippets/order-review-loader.html').match(/<script>([\s\S]*?)<\/script>/)[1];
  const runLoader = (pathname, hash, hostname = 'amolbooks.com') => {
    const added = [];
    const urls = [];
    const stored = {};
    const sandbox = {
      location: { pathname, hash, hostname, origin: 'https://' + hostname },
      history: { state: null, replaceState(_state, _title, url) { urls.push(url); sandbox.location.pathname = url; sandbox.location.hash = ''; } },
      sessionStorage: { setItem(key, value) { stored[key] = value; } },
      document: { createElement: (tag) => ({ tag }), head: { appendChild: (node) => added.push(node) } },
      addEventListener() {},
    };
    sandbox.window = sandbox;
    vm.runInNewContext(loader, sandbox);
    return { urls, stored, added, token: sandbox.__abOrderReviewToken };
  };
  let loaded = runLoader('/rate/AbCdEfGh12345678', '');
  assert.deepEqual(loaded.urls, ['/pages/order-review']);
  assert.equal(loaded.token, 'AbCdEfGh12345678');
  assert.equal(loaded.stored['ab-order-review-token'], 'AbCdEfGh12345678');
  assert.deepEqual(loaded.added.map((node) => node.src || node.content), ['noindex, nofollow', 'https://apisub.amolbooks.com/api/storefront-page/order-review.js']);
  loaded = runLoader('/pages/order-review', '#t=AbCdEfGh12345678', 'localhost');
  assert.deepEqual(loaded.urls, ['/pages/order-review'], 'The #fragment from the redirect is dropped');
  assert.equal(loaded.token, 'AbCdEfGh12345678');
  assert.equal(loaded.added[1].src, 'https://localhost/api/storefront-page/order-review.js', 'Local preview uses the local API');
  loaded = runLoader('/product-details/x', '#t=AbCdEfGh12345678');
  assert.deepEqual([loaded.urls, loaded.added, loaded.token], [[], [], undefined], 'Other pages are left alone');
  assert.match(read('api/src/pages/customer-manager/customer-manager-pages.ts'), /'\/upload\/static\/review-requests\.html'/);
  assert.match(read('api/src/pages/customer-manager/admin-sidebar.ts'), /href: 'review-requests\.html'.*hideForSalesman: true/);
  assert.match(read('scripts/WHATSAPP_ORDERS.md'), /WHATSAPP_TEMPLATE_REVIEW_REQUEST=/);
  const inboxPage = read('gtm-snippets/whatsapp-inbox.html');
  assert.ok(inboxPage.includes("'⚠ Has a problem'") && inboxPage.includes("ask.kind === 'problem'"), 'Inbox labels the problem request');
  assert.ok(read('api/upload/static/custom-orders.html').includes("review_request: 'Review request'"), 'Orders page names the message');

  // 2. Helpers.
  assert.equal(WhatsappService.isStopWord(' STOP '), true);
  assert.equal(WhatsappService.isStopWord('বন্ধ করুন।'), true);
  assert.equal(WhatsappService.isStopWord('বই বন্ধ হয়ে গেছে'), false);
  assert.equal(WhatsappService.reviewLink('AbCdEfGh12345678'), 'https://amolbooks.com/rate/AbCdEfGh12345678');
  assert.deepEqual(
    WhatsappService.templateParams('review_request', { name: 'রহিম', orderId: '1024', orderedItems: [{ name: 'বই ক' }], reviewRequest: { token: 'AbCdEfGh12345678' } }),
    ['রহিম', '1024', 'বই ক'],
  );
  assert.equal(WhatsappService.templateSummary('review_request', ['রহিম', '1024', 'বই ক']), 'Review request #1024: বই ক');
  // Several books: a short line in the message (the page lists them all).
  const many = (n) => ({ name: 'রহিম', orderId: '1024', orderedItems: ['বই ক', 'বই খ', 'বই গ', 'বই ঘ'].slice(0, n).map((name) => ({ name })) });
  assert.deepEqual(WhatsappService.templateParams('review_request', many(2)), ['রহিম', '1024', 'বই ক ও বই খ']);
  assert.deepEqual(WhatsappService.templateParams('review_request', many(3)), ['রহিম', '1024', 'বই ক, বই খ ও আরও ১টি বই']);
  assert.deepEqual(WhatsappService.templateParams('review_request', many(4)), ['রহিম', '1024', 'বই ক, বই খ ও আরও ২টি বই']);
  // The "মতামত দিন" / "রিভিউ দেখুন" button opens amolbooks.com/rate/<code>, then two quick replies.
  assert.deepEqual(
    WhatsappService.reviewButtons('review_request', { _id: 'o1', reviewRequest: { token: 'AbCdEfGh12345678' } }),
    [{ url: 'AbCdEfGh12345678' }, 'review_unread:o1', 'review_problem:o1'],
  );
  assert.deepEqual(
    WhatsappService.reviewButtons('review_approved', { _id: 'o1', reviewRequest: { token: 'AbCdEfGh12345678' } }),
    [{ url: 'AbCdEfGh12345678' }],
  );
  assert.deepEqual(ReviewRequestService.phoneVariants('8801711111111'), ['01711111111', '+8801711111111', '8801711111111']);
  assert.equal(ReviewRequestService.bucket('8801711111111'), ReviewRequestService.bucket('8801711111111'));
  assert.deepEqual(ReviewRequestService.dhakaTime(new Date('2026-11-13T13:30:00Z')), { day: '2026-11-13', hour: 19 });
  assert.deepEqual(ReviewRequestService.dhakaTime(new Date('2026-11-13T19:30:00Z')), { day: '2026-11-14', hour: 1 });
  assert.deepEqual(
    ReviewRequestService.cleanImages([
      'https://amolbooks.com/api/upload/images/review-1a2b.jpg',
      'https://evil.example/api/upload/images/review-1a2b.jpg',
      'https://amolbooks.com/api/upload/images/../../secret.jpg',
      'javascript:alert(1)',
      'http://localhost:3001/api/upload/images/review-9f9f.webp',
    ], 'localhost'),
    ['https://amolbooks.com/api/upload/images/review-1a2b.jpg', 'http://localhost:3001/api/upload/images/review-9f9f.webp'],
  );
  const twoDates = { orderStatus: 5, deliveryDate: new Date('2026-11-01'), courierStatus: { status: 'delivered', receivedAt: new Date('2026-11-05') },
    courierStatusHistory: [{ status: 'in_review', receivedAt: new Date('2026-10-30') }, { status: 'delivered', receivedAt: new Date('2026-10-31') }] };
  assert.equal(ReviewRequestService.deliveredAt(twoDates).toISOString(), new Date('2026-10-31').toISOString(), 'Earliest delivery sign wins');
  assert.equal(ReviewRequestService.deliveredAt({ orderStatus: 4 }), null);

  // 3. Fake WhatsApp server and the database.
  const calls = [];
  const refuse = new Set(['8801799999999']);
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}');
      calls.push({ url: req.url, body: parsed });
      res.setHeader('Content-Type', 'application/json');
      if (refuse.has(parsed.to)) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: { code: 131026, message: 'Message undeliverable' } }));
      }
      res.end(JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.REVIEW' + calls.length }] }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  for (const key of ENV) delete process.env[key];
  Object.assign(process.env, {
    WHATSAPP_ENABLED: 'true', WHATSAPP_ACCESS_TOKEN: 'test-only-token', WHATSAPP_PHONE_NUMBER_ID: 'TEST_PHONE_ID',
    WHATSAPP_GRAPH_BASE: 'http://127.0.0.1:' + server.address().port, WHATSAPP_AUTO_REPLY: 'inbox',
    REVIEW_REQUEST_SKIP_NUMBERS: '01788888888', REVIEW_REQUEST_DISABLED: '1',
  });

  connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  const Order = connection.model('Order', OrderSchema);
  const Product = connection.model('Product', ProductSchema);
  const Review = connection.model('Review', ReviewSchema);
  const Chat = connection.model('WhatsappChat', WhatsappChatSchema);
  const ChatMessage = connection.model('WhatsappChatMessage', WhatsappChatMessageSchema);
  await Promise.all([Order.init(), Review.init(), Chat.init(), ChatMessage.init()]);
  const whatsapp = new WhatsappService(Order, Chat, ChatMessage, Product);
  whatsapp.logger = silent;
  const reviews = new ReviewRequestService(Order, Product, Review, Chat, whatsapp);
  reviews.logger = silent;
  reviews.onModuleInit();
  assert.equal(reviews.timer, null, 'REVIEW_REQUEST_DISABLED=1 keeps the timer off');

  // Books: the order's book by author X, a best seller by X (suggested), one already bought, a draft, one out of stock.
  const author = { _id: new mongoose.Types.ObjectId(), name: 'লেখক ক' };
  const publisher = { _id: new mongoose.Types.ObjectId(), name: 'প্রকাশনী ক' };
  const book = async (fields) => {
    const doc = { _id: new mongoose.Types.ObjectId(), status: 'publish', salePrice: 300, discountType: 1, discountAmount: 20, quantity: 10,
      author: [author], publisher, category: [], images: ['https://amolbooks.com/upload/images/cover.webp'], totalSold: 1, ...fields };
    await Product.collection.insertOne(doc);
    return doc;
  };
  const read1 = await book({ name: 'পড়া বই', slug: 'pora-boi' });
  const bestSeller = await book({ name: 'পরের বই', slug: 'porer boi 2', totalSold: 50 });
  const boughtBefore = await book({ name: 'আগে কেনা বই', slug: 'age-kena', totalSold: 99 });
  await book({ name: 'খসড়া', slug: 'khosra', status: 'draft', totalSold: 500 });
  await book({ name: 'স্টক নেই', slug: 'stock-nei', quantity: 0, totalSold: 400 });
  await book({ name: 'হাতে নেই', slug: 'hate-nei', stock: 0, totalSold: 300 });
  const gift = await book({ name: 'নোটবুক', slug: 'notebook', author: [], publisher: null });

  const now = new Date('2026-11-27T14:00:00Z'); // 8 pm in Dhaka
  const ago = (days) => new Date(now.getTime() - days * DAY);
  const line = (product, extra = {}) => ({ _id: product._id, name: product.name, slug: product.slug, quantity: 1, salePrice: product.salePrice, ...extra });
  const seed = async (overrides = {}) => {
    const id = new mongoose.Types.ObjectId();
    const doc = {
      _id: id, orderId: 'R-' + id.toString().slice(-6), name: 'Test customer — not a real order', phoneNo: '01700000001',
      shippingAddress: 'Test address', paymentType: 'cash_on_delivery', paymentStatus: 'paid', orderStatus: 5,
      deliveryDate: ago(14.2), subTotal: 300, discount: 0, deliveryCharge: 60, grandTotal: 360,
      orderedItems: [line(read1), line(gift, { isGift: true })], createdAt: ago(18), updatedAt: ago(14), ...overrides,
    };
    await Order.collection.insertOne(doc);
    return doc;
  };
  const get = (doc) => Order.findById(doc._id).lean();
  await seed({ phoneNo: '01700000001', orderedItems: [line(boughtBefore)], createdAt: ago(200), deliveryDate: ago(195) }); // bought before (too old)
  const A = await seed({ phoneNo: '01700000001' });
  const B = await seed({ phoneNo: '+8801700000002', orderStatus: 8, deliveryDate: undefined, courierStatus: { status: 'delivered', receivedAt: ago(14.5) },
    courierStatusHistory: [{ eventKey: 'x', notificationType: 'delivery_status', status: 'delivered', receivedAt: ago(15) }] });
  // Older than A: newest orders go first, so A is asked and this one is skipped (number just asked).
  const sameNumber = await seed({ phoneNo: '8801700000001', deliveryDate: ago(15), createdAt: ago(19) });
  const cancelled = await seed({ phoneNo: '01700000003', orderStatus: 6 });
  const returned = await seed({ phoneNo: '01700000004', orderStatus: 8, deliveryDate: undefined, courierStatus: { status: 'returned', receivedAt: ago(15) } });
  const tooNew = await seed({ phoneNo: '01700000005', deliveryDate: ago(10) });
  const catchUp = await seed({ phoneNo: '01700000006', deliveryDate: ago(16.5), orderStatus: 5 });
  // A later courier update moved receivedAt into the window; the real delivery was 20 days ago.
  const lateUpdate = await seed({ phoneNo: '01700000010', orderStatus: 8, deliveryDate: undefined, courierStatus: { status: 'delivered', receivedAt: ago(14.5) },
    courierStatusHistory: [{ eventKey: 'y', notificationType: 'delivery_status', status: 'delivered', receivedAt: ago(20) }] });
  const stopped = await seed({ phoneNo: '01700000007' });
  await Chat.collection.insertOne({ wa: '8801700000007', followUpOptOut: true });
  const openRequest = await seed({ phoneNo: '01700000008' });
  await Chat.collection.insertOne({ wa: '8801700000008', request: { kind: 'change', orderId: 'X', at: new Date() } });
  const foreign = await seed({ phoneNo: '+44 7700 900000' });
  const giftOnly = await seed({ phoneNo: '01700000009', orderedItems: [line(gift, { isGift: true })] });
  const staff = await seed({ phoneNo: '01788888888' });
  const refused = await seed({ phoneNo: '01799999999' });

  // 4. Off until the template is named: nothing happens.
  await reviews.tick(now);
  assert.equal(calls.length, 0);
  assert.equal((await get(A)).reviewRequest, undefined);
  process.env.WHATSAPP_TEMPLATE_REVIEW_REQUEST = 'order_feedback';
  // Outside the send hours: nothing.
  await reviews.tick(new Date('2026-11-27T08:00:00Z'));
  assert.equal(calls.length, 0);

  // 5. Inside the hours: each order once, with the reason when not asked.
  await reviews.tick(now);
  const status = async (doc) => {
    const request = (await get(doc)).reviewRequest;
    return request ? [request.status, request.reason || ''] : null;
  };
  assert.deepEqual(await status(A), ['sent', '']);
  assert.deepEqual(await status(B), ['sent', ''], 'Courier "delivered" update counts as delivery');
  assert.deepEqual(await status(sameNumber), ['skipped', 'asked_recently']);
  assert.equal(await status(cancelled), null);
  assert.equal(await status(returned), null);
  assert.equal(await status(tooNew), null);
  assert.deepEqual(await status(catchUp), ['sent', ''], 'Within the 3 catch-up days');
  assert.deepEqual(await status(lateUpdate), ['skipped', 'delivered_too_long_ago']);
  assert.deepEqual(await status(stopped), ['skipped', 'opted_out']);
  assert.deepEqual(await status(openRequest), ['skipped', 'open_request']);
  assert.deepEqual(await status(foreign), ['skipped', 'no_whatsapp_number']);
  assert.deepEqual(await status(giftOnly), ['skipped', 'no_books']);
  assert.deepEqual(await status(staff), ['skipped', 'staff_number']);
  const refusedStatus = await status(refused);
  assert.equal(refusedStatus[0], 'failed');
  assert.match(refusedStatus[1], /131026 Message undeliverable/);

  const sentA = await get(A);
  assert.match(sentA.reviewRequest.token, /^[A-Za-z0-9_-]{16}$/);
  assert.equal(sentA.reviewRequest.wa, '8801700000001');
  assert.equal(sentA.reviewRequest.deliveredAt.toISOString(), A.deliveryDate.toISOString());
  const callA = calls.find((call) => call.body.to === '8801700000001');
  assert.deepEqual(callA.body.template, {
    name: 'order_feedback', language: { code: 'bn' }, components: [
      { type: 'body', parameters: [
        { type: 'text', text: 'Test customer — not a real order' }, { type: 'text', text: A.orderId }, { type: 'text', text: 'পড়া বই' },
      ] },
      { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: sentA.reviewRequest.token }] },
      { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'review_unread:' + A._id }] },
      { type: 'button', sub_type: 'quick_reply', index: '2', parameters: [{ type: 'payload', payload: 'review_problem:' + A._id }] },
    ],
  }, 'Gift left out of the books; order number sent; "মতামত দিন" opens the review page, then two quick replies');
  assert.equal(sentA.whatsappMessages[0].kind, 'review_request');
  const sentCount = calls.length;
  assert.equal(sentCount, 4, 'A, B, the catch-up order and the refused one');
  // Done for the day: later ticks and a second run send nothing more.
  await reviews.tick(new Date(now.getTime() + 20 * 60 * 1000));
  await reviews.sendDue(now);
  assert.equal(calls.length, sentCount);

  // Daily limit (owner, 2026-11-14: "send out about 50 messages a day, we can increase it later on").
  assert.equal(reviews.config().dailyLimit, 50, 'Default 50 a day');
  assert.deepEqual(['80', '', 5000, -3, 'x'].map((v) => ReviewRequestService.limitValue(v, 50)), [80, 50, 1000, 0, 50]);
  const limitSetting = (dailyLimit) => ({ findOne: () => ({ select: () => ({ lean: async () => ({ dailyLimit }) }) }) });
  const sentNow = await reviews.sentToday(now);
  assert.equal(sentNow, 3, "Today's sends (the refused one failed)");
  const waiting = await seed({ phoneNo: '01700000077', deliveryDate: ago(14.1), createdAt: ago(16) });
  assert.equal((await reviews.sendDue(now, 100, 0)).capped, true, 'No sends left: stops before asking');
  assert.equal((await get(waiting)).reviewRequest, undefined);
  const full = new ReviewRequestService(Order, Product, Review, Chat, whatsapp, limitSetting(sentNow));
  full.logger = silent;
  await full.tick(now);
  assert.equal((await get(waiting)).reviewRequest, undefined, 'Limit reached today: waits');
  assert.equal(full.doneDay, '2026-11-27', 'Done for the day');
  const roomForOne = new ReviewRequestService(Order, Product, Review, Chat, whatsapp, limitSetting(sentNow + 1));
  roomForOne.logger = silent;
  await roomForOne.tick(now);
  assert.equal((await get(waiting)).reviewRequest.status, 'sent', 'Room for one more: sent');
  assert.equal((await roomForOne.settings(now)).data.dailyLimit, sentNow + 1, 'Setting wins over the default');
  await Order.deleteOne({ _id: waiting._id });
  calls.length = sentCount;

  // 6. Taps on the buttons (webhook), free answers in the 24-hour window.
  const tap = (from, payload, text, type = 'button') => whatsapp.receiveWebhook({ entry: [{ changes: [{ value: {
    contacts: [{ wa_id: from, profile: { name: 'Test' } }],
    messages: [type === 'button'
      ? { id: 'wamid.IN' + crypto.randomBytes(4).toString('hex'), from, timestamp: '1', type: 'button', button: { payload, text } }
      : { id: 'wamid.IN' + crypto.randomBytes(4).toString('hex'), from, timestamp: '1', type: 'text', text: { body: text } }],
  } }] }] });
  const lastText = () => calls[calls.length - 1].body.text.body;
  process.env.REVIEW_REWARD_COUPON = 'REVIEW30';
  await tap('8801700000001', 'review_liked:' + A._id, 'ভালো লাগছে');
  let answer = lastText();
  assert.match(answer, new RegExp('https://amolbooks.com/rate/' + sentA.reviewRequest.token));
  assert.match(answer, /রিভিউ দিলেই পাবেন পরের অর্ডারে ছাড়ের কুপন/);
  assert.match(answer, /আপনার জন্য পরের বই: পরের বই — ২৪০ টাকা/, 'Best seller by the same author, not bought before, shop price');
  assert.match(answer, /product-details\/porer%20boi%202/);
  assert.doesNotMatch(answer, /আগে কেনা বই|খসড়া|স্টক নেই|হাতে নেই/);
  let saved = await get(A);
  assert.equal(saved.reviewRequest.reply, 'liked');
  assert.equal(saved.reviewRequest.suggested, 'porer boi 2');

  // Ordered again since delivery: no suggestion.
  await seed({ phoneNo: '01700000002', orderStatus: 1, createdAt: ago(2), deliveryDate: undefined });
  await tap('8801700000002', 'review_liked:' + B._id, 'ভালো লাগছে');
  assert.doesNotMatch(lastText(), /আপনার জন্য পরের বই/);
  await tap('8801700000002', 'review_unread:' + B._id, 'এখনো পড়িনি');
  assert.match(lastText(), /৬০ দিন খোলা থাকবে/);
  assert.equal((await get(B)).reviewRequest.reply, 'unread');

  // Problem: the order and the chat get the inbox nudge, and it stays on a delivered order.
  await tap('8801700000002', 'review_problem:' + B._id, 'সমস্যা আছে');
  assert.match(lastText(), /কী সমস্যা হয়েছে/);
  const problemOrder = await get(B);
  assert.equal(problemOrder.customerRequest.kind, 'problem');
  const chat = await Chat.findOne({ wa: '8801700000002' }).lean();
  assert.equal(chat.request.kind, 'problem');
  assert.equal(String(chat.request.order), String(B._id));
  assert.equal(WhatsappInboxService.pendingRequest([problemOrder]).kind, 'problem', 'Problem stays open on a delivered order');
  assert.equal(WhatsappInboxService.pendingRequest([{ ...problemOrder, customerRequest: { kind: 'more', at: new Date() } }]), null, 'More books on a delivered order is closed');
  // The next request for this number waits while the problem is open.
  assert.equal(await whatsapp.followUpBlocked('8801700000002'), 'open_request');

  // A tap from another number changes nothing.
  const before = calls.length;
  await tap('8801700000005', 'review_problem:' + A._id, 'সমস্যা আছে');
  assert.equal((await get(A)).reviewRequest.reply, 'liked');
  assert.equal((await get(A)).customerRequest, undefined);
  assert.equal(calls.length, before + 1, 'They get the general answer');

  // "Stop": no more review requests (order messages are not affected).
  await tap('8801700000001', null, 'STOP', 'text');
  assert.match(lastText(), /আর পাঠানো হবে না/);
  assert.equal((await Chat.findOne({ wa: '8801700000001' }).lean()).followUpOptOut, true);
  assert.equal(await whatsapp.followUpBlocked('8801700000001'), 'opted_out');

  // 7. Review page API.
  const token = sentA.reviewRequest.token;
  let page = (await reviews.page(token)).data;
  assert.equal(page.orderId, A.orderId);
  assert.equal(page.expired, false);
  assert.equal(page.rewardOffered, true);
  assert.equal(page.reward, '', 'Coupon only after a review');
  assert.deepEqual(page.books.map((item) => [item.name, item.author, item.review]), [['পড়া বই', 'লেখক ক', null]], 'Gift not on the page');
  // More books under the reviews: published, in stock, not bought on this number, shop price.
  assert.deepEqual(page.more.map((item) => [item.slug, item.price, item.listPrice, item.author]), [['porer boi 2', 240, 300, 'লেখক ক']]);
  assert.deepEqual((await reviews.moreForUser({ _id: 'not-an-id' })).data, []);
  assert.deepEqual((await reviews.suggestBooks(sentA, '8801700000001', 4)).map((item) => item.slug), ['porer boi 2'], 'No book twice, none bought before');
  await assert.rejects(reviews.page('short'), (e) => e.getStatus() === 404);
  await assert.rejects(reviews.page('ZZZZZZZZZZZZZZZZ'), (e) => e.getStatus() === 404);
  const bad = (body) => assert.rejects(reviews.submit(token, body, 'localhost'), (e) => e.getStatus() === 400);
  await bad({ product: String(gift._id), rating: 5, review: 'ভালো' });
  await bad({ product: String(bestSeller._id), rating: 5, review: 'ভালো' });
  await bad({ product: String(read1._id), rating: 6, review: 'ভালো' });
  await bad({ product: String(read1._id), rating: 4.5, review: 'ভালো' });
  await bad({ product: String(read1._id), rating: 4, review: ' ' });
  let result = await reviews.submit(token, { product: String(read1._id), rating: 2, review: 'ছাপা ভালো, তবে বাঁধাই দুর্বল।', name: 'রহিম উ.',
    images: ['https://amolbooks.com/api/upload/images/review-1a2b.jpg', 'https://evil.example/x.jpg'] }, 'localhost');
  assert.deepEqual(result.data, { saved: true, reward: 'REVIEW30' });
  let stored = await Review.find({ 'order._id': A._id }).lean();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].status, false, 'Pending until staff approve it');
  assert.equal(stored[0].verifiedPurchase, true);
  assert.equal(stored[0].order.orderId, A.orderId);
  assert.equal(stored[0].user.name, 'রহিম উ.');
  assert.equal(stored[0].user._id, null);
  assert.equal(stored[0].rating, 2, 'Low ratings are kept as written');
  assert.deepEqual(stored[0].images, ['https://amolbooks.com/api/upload/images/review-1a2b.jpg']);
  assert.equal(String(stored[0].product._id), String(read1._id));
  assert.equal((await Product.findById(read1._id).lean()).reviewTotal || 0, 0, 'Product numbers change only on approval');
  // Changing it before approval updates the same review.
  await reviews.submit(token, { product: String(read1._id), rating: 3, review: 'আবার পড়ে ভালো লাগলো।', name: '' }, 'localhost');
  stored = await Review.find({ 'order._id': A._id }).lean();
  assert.equal(stored.length, 1);
  assert.deepEqual([stored[0].rating, stored[0].review, stored[0].user.name], [3, 'আবার পড়ে ভালো লাগলো।', 'Test customer — not a real order']);
  // Approved: the link cannot change it any more.
  await Review.updateOne({ _id: stored[0]._id }, { $set: { status: true } });
  result = await reviews.submit(token, { product: String(read1._id), rating: 1, review: 'বদলে দিলাম' }, 'localhost');
  assert.equal(result.data.already, true);
  assert.equal((await Review.findById(stored[0]._id).lean()).rating, 3);
  page = (await reviews.page(token)).data;
  assert.equal(page.reward, 'REVIEW30');
  assert.deepEqual(page.books[0].review, { rating: 3, review: 'আবার পড়ে ভালো লাগলো।', images: [], approved: true });
  saved = await get(A);
  assert.equal(saved.reviewRequest.reviews, 1);
  assert.ok(saved.reviewRequest.reviewedAt);
  // The same book in another order on this number: shown as reviewed before, not asked again.
  const repeat = await seed({ phoneNo: '01700000001', reviewRequest: { status: 'sent', token: 'SameNumberTok123', at: new Date() } });
  const again = (await reviews.page('SameNumberTok123')).data;
  assert.deepEqual([again.books[0].review.earlier, again.books[0].review.rating], [true, 3], 'Reviewed in an earlier order');
  await Order.deleteOne({ _id: repeat._id });
  const shown = read('gtm-snippets/order-review.js');
  assert.match(shown, /if \(book\.review && book\.review\.earlier\) \{/, 'Page shows it without a form');
  assert.match(shown, /return book\.review && !book\.review\.earlier; \}\)\.length;/, 'Earlier reviews do not count as just sent');
  // 60 days later the link is closed.
  await Order.updateOne({ _id: A._id }, { $set: { 'reviewRequest.at': new Date(Date.now() - 61 * DAY) } });
  await assert.rejects(reviews.submit(token, { product: String(read1._id), rating: 5, review: 'দেরিতে' }, 'localhost'), (e) => e.getStatus() === 400);
  assert.equal((await reviews.page(token)).data.expired, true);
  await Order.updateOne({ _id: A._id }, { $set: { 'reviewRequest.at': now } });

  // 8. Holdout and staff numbers.
  process.env.REVIEW_REQUEST_HOLDOUT_PERCENT = '50';
  const holdoutNumbers = ['01711000001', '01711000002', '01711000003', '01711000004', '01711000005', '01711000006', '01711000007', '01711000008'];
  for (const phone of holdoutNumbers) await seed({ phoneNo: phone, deliveryDate: ago(14.1) });
  reviews.doneDay = '';
  const run = await reviews.sendDue(now);
  const expectedHoldout = holdoutNumbers.filter((phone) => ReviewRequestService.bucket(WhatsappService.toWhatsappNumber(phone)) < 50).length;
  assert.equal(run.holdout, expectedHoldout);
  assert.equal(run.sent, holdoutNumbers.length - expectedHoldout);
  delete process.env.REVIEW_REQUEST_HOLDOUT_PERCENT;

  // 9. Staff numbers.
  await seed({ phoneNo: '01700000001', orderStatus: 1, createdAt: new Date(now.getTime() + DAY), deliveryDate: undefined }); // A ordered again
  const stats = (await reviews.stats(30)).data;
  assert.equal(stats.active, true);
  assert.equal(stats.sent, 3 + holdoutNumbers.length - expectedHoldout);
  assert.equal(stats.failed, 1);
  assert.equal(stats.holdout, expectedHoldout);
  assert.deepEqual(stats.replies, { liked: 1, unread: 0, problem: 1 }, "B's latest tap (problem) counts");
  assert.equal(stats.reviewedOrders, 1);
  assert.equal(stats.reviews, 1);
  assert.equal(stats.reorders, 1, 'A ordered again after the request; B ordered before its request');
  assert.equal(stats.optedOut, 2);
  assert.equal(stats.skipped.asked_recently, 1);
  assert.equal(stats.skipped.opted_out, 1);
  assert.equal(stats.skipped.delivered_too_long_ago, 1);
  assert.ok(stats.recent.length > 0 && stats.recent.length <= 50);

  // 10. Login on the review page: SMS code to the order's number → the customer's shop account.
  const { GuestOrdersService } = require('../api/dist/pages/guest-orders/guest-orders.service');
  const { GuestOrderAccessSchema } = require('../api/dist/pages/guest-orders/guest-order-access.schema');
  const { ReviewLoginService } = require('../api/dist/pages/review-request/review-login.service');
  const { StorefrontPageController } = require('../api/dist/pages/review-request/review-request.controller');
  const { storefrontLoginStorage, cryptoJsEncrypt, cryptoJsDecrypt } = require('../api/dist/pages/review-request/storefront-login');
  const { UserService } = require('../api/dist/pages/user/user.service');
  const { UserSchema } = require('../api/dist/schema/user.schema');
  const { AddressSchema } = require('../api/dist/schema/address.schema');
  const CryptoJS = lib('crypto-js');
  const bcrypt = lib('bcrypt');
  const { JwtService } = lib('@nestjs/jwt');
  const User = connection.model('User', UserSchema);
  const Address = connection.model('Address', AddressSchema);
  const Access = connection.model('GuestOrderAccess', GuestOrderAccessSchema);
  await Access.init();
  const sms = [];
  const guestOrders = new GuestOrdersService(Access, Order, { sendOrderAccessOtp: async (to, message) => { sms.push({ to, message }); } }, null);
  const jwt = new JwtService({ secret: 'test-only-user-secret', signOptions: { expiresIn: 604800 } });
  const config = { get: (key) => (key === 'userTokenExpiredTime' ? 604800 : undefined) };
  const login = new ReviewLoginService(Order, User, Address, Review, guestOrders, jwt, config);
  login.logger = silent;
  const lastCode = () => /(\d{6})/.exec(sms[sms.length - 1].message)[1];
  const allowResend = () => Access.updateMany({}, { $set: { resendAfter: new Date(0) } });

  // The storefront's saved login: CryptoJS format, key name and secret read from its bundle.
  const storage = storefrontLoginStorage();
  assert.ok(storage && storage.key && storage.secret, 'Login storage found in ui/dist');
  // The storefront's key is "Amolbooks_USER_1_" + VERSION (1); the snippets know it by that name.
  assert.equal(storage.key, 'Amolbooks_USER_1_1');
  assert.ok(read('gtm-snippets/customer-account-mobile.html').includes("'Amolbooks_USER_1_1'"));
  assert.equal(CryptoJS.AES.decrypt(cryptoJsEncrypt('{"a":1}', 'pass phrase'), 'pass phrase').toString(CryptoJS.enc.Utf8), '{"a":1}', 'CryptoJS reads it');
  assert.equal(cryptoJsDecrypt(CryptoJS.AES.encrypt('{"b":2}', 'pass phrase').toString(), 'pass phrase'), '{"b":2}');
  assert.equal(storefrontLoginStorage(path.join(root, 'api')), null, 'No storefront build, no login');
  const pages = new StorefrontPageController();
  assert.match(pages.script('order-review.js'), /app-extra-page-view/, 'API serves the review page script');
  assert.match(pages.script('customer-dashboard.js'), /ab-dash-main/, 'API serves the dashboard script');
  assert.throws(() => pages.script('../api/.env'), (e) => e.getStatus() === 404, 'Only the two page scripts');
  assert.throws(() => pages.script('main.ts'), (e) => e.getStatus() === 404);

  assert.equal(ReviewRequestService.phoneHint('+8801712345678'), '017•••••678');
  assert.equal(ReviewRequestService.phoneHint('12345'), '');
  assert.equal((await reviews.page(token)).data.phoneHint, '017•••••001');

  const otherAccount = new mongoose.Types.ObjectId();
  const elsewhere = await seed({ phoneNo: '01700000001', user: otherAccount, orderStatus: 1, deliveryDate: undefined });
  const metaPending = await seed({ phoneNo: '01700000001', metaPurchaseStatus: 'failed', orderStatus: 1, deliveryDate: undefined });
  const stranger = await seed({ phoneNo: '01700000077', orderStatus: 1, deliveryDate: undefined });
  const beforeA = await get(A);

  await assert.rejects(login.sendCode(token, ''), (e) => e.getStatus() === 400, 'The number is needed');
  await assert.rejects(login.sendCode(token, '12345'), (e) => e.getStatus() === 400);
  await assert.rejects(login.sendCode(token, '01711111111'), (e) => e.getStatus() === 400 && /017•••••001/.test(e.message), 'Only the order\'s own number');
  assert.equal(sms.length, 0, 'No SMS for a wrong number');
  const codeSent = await login.sendCode(token, '+880 1700-000001');
  assert.deepEqual(codeSent.data, { phone: '017•••••001', retryAfter: 60 });
  assert.deepEqual(sms.map((row) => row.to), ['01700000001'], 'Only to the order\'s own number');
  await assert.rejects(login.sendCode(token, '01700000001'), (e) => e.getStatus() === 429, 'One code a minute');
  await assert.rejects(login.login(token, '000000'), (e) => e.getStatus() === 401);
  await assert.rejects(login.login(token, 'abc'), (e) => e.getStatus() === 401);
  let signedIn = await login.login(token, lastCode());
  await assert.rejects(login.login(token, lastCode()), (e) => e.getStatus() === 401, 'A code works once');

  const user = await User.findOne({ username: '01700000001' }).lean();
  assert.deepEqual([user.name, user.phoneNo, user.registrationType, user.hasAccess, user.addressLine],
    ['Test customer — not a real order', '01700000001', 'phone', true, 'Test address'], 'New account from the order');
  assert.ok(/^\$2[aby]\$/.test(user.password) && !(await bcrypt.compare('', user.password)), 'Random password');
  let addressBook = await Address.find({ user: user._id }).lean();
  assert.deepEqual(addressBook.map((row) => [row.address, row.phone, row.name, row.setDefaultAddress]),
    [['Test address', '01700000001', 'Test customer — not a real order', true]], 'Order address saved as the default');
  assert.deepEqual(user.addresses.map(String), [String(addressBook[0]._id)]);
  const mine = (await Order.find({ user: user._id }).select('_id').lean()).map((row) => String(row._id)).sort();
  const expectedMine = (await Order.find({ phoneNo: { $in: ['01700000001', '8801700000001'] }, _id: { $nin: [elsewhere._id, metaPending._id] } })
    .select('_id').lean()).map((row) => String(row._id)).sort();
  assert.ok(expectedMine.length >= 4);
  assert.deepEqual(mine, expectedMine, "The number's orders show in the account");
  assert.equal(signedIn.data.ordersLinked, expectedMine.length);
  assert.equal(signedIn.data.addressSaved, true);
  assert.equal(String((await get(elsewhere)).user), String(otherAccount), 'An order in another account stays there');
  assert.equal((await get(metaPending)).user, undefined, 'Meta purchase still being sent: left alone');
  assert.equal((await get(stranger)).user, undefined);
  assert.equal((await get(A)).updatedAt.toISOString(), beforeA.updatedAt.toISOString(), 'Linking leaves updatedAt alone');

  assert.equal(signedIn.data.storageKey, storage.key);
  const savedLogin = JSON.parse(CryptoJS.AES.decrypt(signedIn.data.storageValue, storage.secret).toString(CryptoJS.enc.Utf8));
  assert.equal(savedLogin.userId, String(user._id));
  assert.ok(Math.abs(new Date(savedLogin.expiredDate).getTime() - (Date.now() + 604800000)) < 60000, 'Expires with the token (7 days)');
  const claims = jwt.verify(savedLogin.token);
  assert.deepEqual([claims._id, claims.username], [String(user._id), '01700000001']);

  // Again later: same account, the address is not added twice, a new order joins.
  const newer = await seed({ phoneNo: '+8801700000001', orderStatus: 1, deliveryDate: undefined });
  await allowResend();
  await login.sendCode(token, '01700000001');
  signedIn = await login.login(token, lastCode());
  assert.equal(await User.countDocuments({ username: '01700000001' }), 1);
  assert.equal(await Address.countDocuments({ user: user._id }), 1);
  assert.deepEqual([signedIn.data.ordersLinked, signedIn.data.addressSaved], [1, false]);
  assert.equal(String((await get(newer)).user), String(user._id));

  // An existing account keeps its own name; the order's address is added beside its own.
  const tokenB = (await get(B)).reviewRequest.token;
  const ownUser = await User.create({ name: 'নিজের নাম', username: '01700000002', hasAccess: true, password: 'x' });
  const ownAddress = await Address.create({ user: ownUser._id, phone: '01700000002', address: 'পুরনো ঠিকানা', setDefaultAddress: true });
  await User.updateOne({ _id: ownUser._id }, { $push: { addresses: ownAddress._id } });
  await allowResend();
  await login.sendCode(tokenB, '০১৭০০০০০০০২');
  assert.equal(sms[sms.length - 1].to, '01700000002', '+880 number normalised');
  signedIn = await login.login(tokenB, lastCode());
  const own = await User.findById(ownUser._id).lean();
  assert.deepEqual([own.name, own.phoneNo, own.addresses.length], ['নিজের নাম', '01700000002', 2]);
  addressBook = await Address.find({ user: ownUser._id }).sort({ _id: 1 }).lean();
  assert.deepEqual(addressBook.map((row) => [row.address, row.setDefaultAddress]), [['পুরনো ঠিকানা', true], ['Test address', false]]);
  assert.equal(await User.countDocuments({ username: { $in: ['01700000002', '8801700000002'] } }), 1);
  // A closed account cannot log in this way.
  await User.updateOne({ _id: ownUser._id }, { $set: { hasAccess: false } });
  await allowResend();
  await login.sendCode(tokenB, '01700000002');
  await assert.rejects(login.login(tokenB, lastCode()), (e) => e.getStatus() === 401);
  // Old link: no code.
  await Order.updateOne({ _id: A._id }, { $set: { 'reviewRequest.at': new Date(Date.now() - 61 * DAY) } });
  await allowResend();
  await assert.rejects(login.sendCode(token, '01700000001'), (e) => e.getStatus() === 400);
  await Order.updateOne({ _id: A._id }, { $set: { 'reviewRequest.at': now } });
  await assert.rejects(login.sendCode('ZZZZZZZZZZZZZZZZ', '01700000001'), (e) => e.getStatus() === 404);

  // The old "social" login no longer hands out a token for an existing account by its number alone.
  const users = new UserService(User, null, Address, jwt, config, null, { del: async () => {} }, null);
  users.logger = silent;
  const social = await users.userSignupAndLoginSocial({ username: '01700000001', registrationType: 'phone' });
  assert.deepEqual([social.success, social.token], [false, null], 'No token for an existing account');
  const fresh = await users.userSignupAndLoginSocial({ username: 'new-reader@example.com', name: 'নতুন', registrationType: 'google', hasAccess: true });
  assert.equal(fresh.success, true, 'New accounts can still be made');

  // 11. Writing help from the book's description (review-hints.ts).
  const { reviewHints, bookTopics, topicFromLine } = require('../api/dist/pages/review-request/review-hints');
  const sampleDescription = '<div>এই বইটি সাজানো হয়েছে ৫২ সপ্তাহে—</div><div>১. কুরআনের বার্তা: এখানে রয়েছে ৩৬ সূরা।</div>' +
    '<div>২. মাসনুন দুআ: প্রতিদিনের দুআ</div><div class="box">✅ শব্দের ইংরেজি অর্থ দেওয়া আছে<br>✅ ফ্রি নোটবুক পাচ্ছেন</div>' +
    '<p>নিরীক্ষণ: মাওলানা ক</p><p>ভাষা সম্পাদনা: খ</p><p>📦 এখনই অর্ডার করুন!</p><p>&nbsp;🚚 ডেলিভারি চার্জ ৬০ টাকা</p>' +
    '<h3>সূচিপত্র</h3><p>এই বইয়ের মাধ্যমে আপনি—</p><p>একটি অনেক লম্বা বাক্য যা বইয়ের পরিচিতি দেয় এবং কোনো নির্দিষ্ট অংশের নাম নয় বরং পুরো বই নিয়ে কথা বলে।</p>';
  assert.deepEqual(bookTopics(sampleDescription, 'আমল বিশ্বকোষ'), ['কুরআনের বার্তা', 'মাসনুন দুআ', 'শব্দের ইংরেজি অর্থ দেওয়া আছে'],
    'Parts and features of the book; no credits, selling lines, headings or sentences');
  assert.equal(topicFromLine('আমল বিশ্বকোষ', 'আমল বিশ্বকোষ'), '');
  assert.equal(topicFromLine('• Free delivery today'), '', 'Bengali topics only');
  let hints = reviewHints({ name: 'আমল বিশ্বকোষ', description: sampleDescription, category: [{ name: 'আত্মশুদ্ধি ও অনুপ্রেরণা' }] });
  assert.deepEqual(hints.slice(0, 3).map((hint) => hint.label), ['কুরআনের বার্তা', 'মাসনুন দুআ', 'শব্দের ইংরেজি অর্থ দেওয়া আছে']);
  assert.equal(hints[0].starter, '«কুরআনের বার্তা» নিয়ে আমার মতামত: ');
  assert.equal(hints.length, 8, 'Three of the book + five every review can answer');
  hints = reviewHints({ name: 'প্লেইন', description: '<p>একটি সাধারণ বর্ণনা যেখানে কোনো তালিকা নেই।</p>', category: [{ name: 'কুরআন বিষয়ক আলোচনা' }] });
  assert.deepEqual(hints[0], { label: 'কুরআন বিষয়ক আলোচনা কতটা কাজে এল', starter: 'কুরআন বিষয়ক আলোচনা বইটি ' }, 'Plain description: a question from the category');
  hints = reviewHints({ name: 'প্লেইন', description: '', category: [{ name: 'প্রোডাক্টিভিটি' }] });
  assert.equal(hints[0].label, 'প্রোডাক্টিভিটি বিষয়ে কতটা কাজে এল');
  assert.equal(reviewHints({}).length, 5, 'Always the five general ones');
  await Product.updateOne({ _id: read1._id }, { $set: { description: sampleDescription } });
  assert.equal((await reviews.page(tokenB)).data.books[0].hints[0].label, 'কুরআনের বার্তা', 'The review page sends the hints');

  // 12. After the login the order's reviews are in the account ("আমার রিভিউ"), new ones too.
  const accountA = await User.findOne({ username: '01700000001' }).lean();
  assert.equal(String((await Review.findOne({ 'order._id': A._id }).lean()).user._id), String(accountA._id), 'Earlier review joined the account');
  assert.equal(String((await get(A)).reviewRequest.user), String(accountA._id));
  await User.updateOne({ _id: ownUser._id }, { $set: { hasAccess: true } });
  await reviews.submit(tokenB, { product: String(read1._id), rating: 4, review: 'লগইনের পরে লেখা রিভিউ।', name: 'নিজের নাম' }, 'localhost');
  const reviewB = await Review.findOne({ 'order._id': B._id }).lean();
  assert.equal(String(reviewB.user._id), String(ownUser._id), 'A review written after the login belongs to the account');
  assert.equal(reviewB.status, false);
  const linksA = (await reviews.linksFor({ _id: accountA._id })).data;
  assert.ok(linksA.some((row) => row.order === String(A._id) && row.token === token), "Dashboard gets the account's review links");
  assert.deepEqual((await reviews.linksFor({ _id: 'nope' })).data, []);
  assert.ok(!linksA.some((row) => row.order === String(B._id)), "Not another account's orders");

  // 13. Staff approve → "your review is published" on WhatsApp (order number, book, link).
  assert.equal(await reviews.notifyApproved(String(reviewB._id)), 'skipped', 'Off until the template is set');
  process.env.WHATSAPP_TEMPLATE_REVIEW_APPROVED = 'review_published';
  assert.equal(await reviews.notifyApproved(String(reviewB._id)), 'skipped', 'Not approved yet');
  // ReviewService's approval (false → true) is what calls it.
  const { ReviewService } = require('../api/dist/pages/review/review.service');
  const approvedIds = [];
  const reviewService = new ReviewService(Review, Product, User, {}, {}, { reviewApproved: (id) => approvedIds.push(String(id)) });
  await reviewService.updateReviewById({ _id: reviewB._id, status: true, rating: 4, product: { _id: read1._id } });
  assert.deepEqual(approvedIds, [String(reviewB._id)], 'Approval calls the WhatsApp hook');
  await reviewService.updateReviewById({ _id: reviewB._id, status: true, rating: 4, product: { _id: read1._id } });
  assert.equal(approvedIds.length, 1, 'Saving an approved review again sends nothing');
  const sentBefore = calls.length;
  assert.equal(await reviews.notifyApproved(String(reviewB._id)), 'sent');
  const published = calls[calls.length - 1].body;
  assert.equal(published.template.name, 'review_published');
  assert.deepEqual(published.template.components[0].parameters.map((p) => p.text),
    ['Test customer — not a real order', B.orderId, 'পড়া বই']);
  assert.deepEqual(published.template.components[1], { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: (await get(B)).reviewRequest.token }] }, '"রিভিউ দেখুন" opens the review page');
  assert.equal(published.template.components.length, 2, 'Utility version: the link only, no "need more books?" buttons');
  assert.equal(calls.length, sentBefore + 1);
  assert.equal((await get(B)).reviewRequest.approved.slug, 'pora-boi');
  assert.equal(await reviews.notifyApproved(String(reviewB._id)), 'skipped', 'Once per order');
  // A number that said "stop" gets none.
  await Review.updateOne({ 'order._id': A._id }, { $set: { status: true } });
  assert.equal(await reviews.notifyApproved(String((await Review.findOne({ 'order._id': A._id }).lean())._id)), 'skipped');
  // Taps on older messages that still have the buttons: "এখন না" thanks them; "হ্যাঁ, বই লাগবে" offers a book and flags the inbox (an open problem stays first).
  await tap('8801700000002', 'review_nomore:' + B._id, 'এখন না');
  assert.match(lastText(), /কখনো বই লাগলে এখানেই লিখবেন/);
  assert.equal((await get(B)).reviewRequest.approvedReply, 'nomore');
  assert.equal((await get(B)).reviewRequest.reply, 'problem', "The review request's own answer is kept");
  await tap('8801700000002', 'review_more:' + B._id, 'হ্যাঁ, বই লাগবে');
  assert.match(lastText(), /কোন বই লাগবে, এখানেই নাম লিখে জানান/);
  assert.equal((await get(B)).customerRequest.kind, 'problem', 'Open problem not replaced');
  await Order.updateOne({ _id: B._id }, { $set: { 'customerRequest.doneAt': new Date() } });
  await Chat.updateOne({ wa: '8801700000002' }, { $unset: { request: 1 } });
  await tap('8801700000002', 'review_more:' + B._id, 'হ্যাঁ, বই লাগবে');
  assert.match(lastText(), /আপনার জন্য একটি বই: .+ টাকা\nhttps:\/\/amolbooks\.com\/product-details\//);
  const booksOrder = await get(B);
  assert.equal(booksOrder.customerRequest.kind, 'books');
  assert.equal((await Chat.findOne({ wa: '8801700000002' }).lean()).request.kind, 'books', 'Inbox shows "Wants new books"');
  assert.equal(WhatsappInboxService.pendingRequest([booksOrder]).kind, 'books', 'Stays open on a delivered order');
  const inboxHtml = read('gtm-snippets/whatsapp-inbox.html');
  assert.ok(inboxHtml.includes("'📚 Wants new books'") && inboxHtml.includes("const books = ask.kind === 'books';"));
  assert.ok(read('api/upload/static/custom-orders.html').includes("review_approved: 'Review published'"));
  // Buy more along the way (owner, 2026-11-14): shelves on the review page and the account overview.
  const shelfPage = read('gtm-snippets/order-review.js');
  const dashboardPage = read('gtm-snippets/customer-dashboard.js');
  assert.match(shelfPage, /loginBox\(\) \+ moreBooks\(\);/, 'Review page shows more books under the reviews');
  assert.match(shelfPage, /note\('এই লিংকের মেয়াদ শেষ'[^;]*\) \+ moreBooks\(\);/, 'Also when the link has expired');
  assert.match(dashboardPage, /call\('\/order-review\/mine\/books'\)/, 'Account loads more books');
  assert.match(dashboardPage, /'<\/section>' \+\s*moreShelf\(\) \+/, 'Account overview shows them after recent orders');
  assert.match(dashboardPage, /class="abd-again"/, 'Delivered books can be bought again');
  assert.match(read('api/src/pages/review-request/review-request.controller.ts'), /@Get\('mine\/books'\)\s+@UseGuards\(UserJwtAuthGuard\)/, 'Account books need the customer login');
  assert.match(read('scripts/WHATSAPP_ORDERS.md'), /WHATSAPP_TEMPLATE_REVIEW_APPROVED=/);

  // 14. Local preview only: the storefront's live-API calls stay on this machine.
  const localOnly = read('gtm-snippets/local-api-only.html').match(/<script>([\s\S]*?)<\/script>/)[1];
  const runLocalOnly = (hostname) => {
    const sandbox = { location: { hostname, href: 'http://' + hostname + ':3001/', origin: 'http://' + hostname + ':3001' }, URL,
      XMLHttpRequest: function () {}, fetch: null };
    sandbox.XMLHttpRequest.prototype.open = function () {};
    sandbox.window = sandbox;
    vm.runInNewContext(localOnly, sandbox);
    return sandbox.__abLocalApiUrl;
  };
  const here = runLocalOnly('localhost');
  assert.equal(here('GET', 'https://apisub.amolbooks.com/api/user/logged-in-user-data?select=name'), 'http://localhost:3001/api/user/logged-in-user-data?select=name');
  assert.equal(here('POST', 'https://apisub.amolbooks.com/api/cart/get-carts-by-user'), 'http://localhost:3001/api/cart/get-carts-by-user');
  assert.equal(here('POST', 'https://apisub.amolbooks.com/api/product/get-all'), 'https://apisub.amolbooks.com/api/product/get-all', 'Catalogue reads keep their proxy');
  assert.equal(here('GET', 'https://example.com/api/x'), 'https://example.com/api/x');
  assert.equal(runLocalOnly('amolbooks.com'), undefined, 'Nothing on the live site');
  assert.ok(main.indexOf("'local-api-only.html'") < main.indexOf("'catalogue-local-requests.html'"), 'Installed before anything calls out');

  // 15. Customer dashboard: loader on /account only, the page script, the old mobile menu hidden.
  assert.match(main, /^\s+'customer-dashboard-loader\.html',$/m);
  const dashboard = read('gtm-snippets/customer-dashboard.js');
  new vm.Script(dashboard, { filename: 'gtm-snippets/customer-dashboard.js' });
  for (const needle of ["'/order/get-orders-by-user'", "'/review/get-Review-by-user'", "'/user/get-user-address'", "'/order-review/mine'",
    'অনুমোদনের অপেক্ষায়', 'html.ab-dash-on .ab-account-hub', "'ab-review-just-sent'", '@media (max-width:991px)', '/order-track/', '/order-details/']) {
    assert.ok(dashboard.includes(needle), 'Dashboard has ' + needle);
  }
  // The storefront's own account styles are more specific (.account-area[_ngcontent] .account-main[_ngcontent]):
  // every layout rule of ours must be !important or tablets get a squeezed second column (owner, 2026-11-13).
  for (const needle of ['grid-template-columns:260px minmax(0,1fr)!important', 'grid-template-columns:220px minmax(0,1fr)!important',
    'display:flex!important;flex-direction:column!important', 'grid-column:2!important', '@media (min-width:992px) and (max-width:1199px)',
    '@media (max-width:640px)', '@media (max-width:380px)', '.section-main{box-shadow:none!important']) {
    assert.ok(dashboard.includes(needle), 'Dashboard layout has ' + needle);
  }
  // Icons are inline drawings: no icon font to wait for (owner: "these takes a lot of time to load").
  assert.ok(dashboard.includes('<svg class="abd-ic"') && !/class="fa |fa-[a-z]/.test(dashboard), 'Dashboard uses no icon font');
  // Wishlist is called উইশলিস্ট everywhere (not উপহার তালিকা); empty wishlist / notifications get a note.
  assert.match(main, /function rewriteWishlistTexts\(\)/);
  assert.match(main, /MyWishlist: 'উইশলিস্ট'/);
  assert.match(main, /YourWishlist2: 'টি বই আছে'/);
  assert.match(main, /\\u09DF\|\\u09AF\\u09BC/, 'Both forms of য় are matched');
  assert.ok(!dashboard.includes("'My Gift List': 'উপহার তালিকা'") && dashboard.includes("'My Gift List': 'উইশলিস্ট'"), 'Dashboard heading map');
  assert.ok(!read('gtm-snippets/customer-account-mobile.html').includes("label: 'উপহার তালিকা'"), 'Account menu label');
  assert.ok(dashboard.includes('function polishNativePages()') && dashboard.includes('এখনো কোনো নোটিফিকেশন নেই') && dashboard.includes('আপনার উইশলিস্ট এখনো খালি'), 'Empty notes');
  // Old "11 হাজার পাঠক ..." book grid script is stripped from the storefront page, and only it.
  const shudhuiPattern = eval(main.match(/const legacyShudhuiSectionScriptPattern =\s*(\/[^\n]+\/g);/)[1]);
  const sample = "<p>a</p>\n<script>\n(function(){\n  var TAG_ID='69a3b7f20d6f5e6e2633656c';\n  var API='x';\n  var TAG_API='y';\n  var SECTION_ID='__shudhui-section';\n  inject();\n})();\n</script>\n<script>keep()</script>";
  assert.equal(sample.replace(shudhuiPattern, ''), '<p>a</p>\n<script>keep()</script>');
  assert.equal((main.match(/\.replace\(legacyShudhuiSectionScriptPattern, ''\)/g) || []).length, 2, 'Stripped on both page paths');
  // "আমার অর্ডার দেখুন": in the footer help links (not the header menu); logged-in customers go to
  // the dashboard's orders page, guests get the phone lookup.
  const guestOrdersHtml = read('gtm-snippets/guest-orders.html');
  assert.ok(!guestOrdersHtml.includes("addEntry(document.querySelector('app-header ul.nav-list'),true)"), 'No header menu entry');
  assert.ok(guestOrdersHtml.includes('function addFooterEntry()') && guestOrdersHtml.includes("link.href = '/account/orders'"), 'Footer entry links the orders page');
  assert.match(guestOrdersHtml, /if \(loggedIn\(\)\) \{ openAccountOrders\(\); return; \}/);
  assert.ok(guestOrdersHtml.includes('/^Amolbooks_USER_1_\\d+$/'), 'Login check uses the shop login key');
  // All shop icons: inline drawings (generated snippet, up to date) injected on every page.
  assert.match(main, /^\s+'storefront-icons\.html',$/m);
  require('node:child_process').execFileSync(process.execPath, [path.join(root, 'scripts/build-storefront-icons.cjs'), '--check'], { stdio: 'pipe' });
  const iconCss = read('gtm-snippets/storefront-icons.html');
  for (const name of ['fa-house', 'fa-bars', 'fa-shopping-bag', 'fa-star-half-alt', 'fa-facebook-f', 'fa-whatsapp', 'fa-user-circle', 'fa-xmark', 'fa-chevron-down']) {
    assert.ok(iconCss.includes('.' + name), 'Icon drawn: ' + name);
  }
  // Wishlist remove button: trash drawn inline, not the icon font.
  const accountMobile = read('gtm-snippets/customer-account-mobile.html');
  assert.ok(accountMobile.includes('.wishlist-area .delete > span > i.fa-trash { display: none !important; }') &&
    /\.wishlist-area \.delete > span \{\s*background-image: url\("data:image\/svg\+xml,/.test(accountMobile), 'Wishlist trash icon is inline');
  // Order lines show the price paid (after the book's discount), the list price struck through.
  assert.ok(dashboard.includes('Number(item.unitPrice || item.salePrice || 0)') && dashboard.includes("list > paid ? '<s>'"), 'Order lines show the paid price');
  // Checkout: a logged-in customer with no saved address gets the form filled from the account or the last order.
  const accountSnippet = read('gtm-snippets/customer-account-mobile.html');
  for (const match of accountSnippet.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1], { filename: 'customer-account-mobile.html' });
  for (const needle of ['prefillFromAccount(formArea);', "'/order/get-orders-by-user'", 'profile.addressLine || order.shippingAddress',
    "!String(control.value || '').trim()", 'select=name%20phoneNo%20username%20addressLine%20division%20area']) {
    assert.ok(accountSnippet.includes(needle), 'Checkout prefill has ' + needle);
  }
  const dashLoader = read('gtm-snippets/customer-dashboard-loader.html').match(/<script>([\s\S]*?)<\/script>/)[1];
  const runDashLoader = (pathname) => {
    const added = [];
    const sandbox = { location: { pathname, hostname: 'amolbooks.com', origin: 'https://amolbooks.com' }, history: { pushState() {}, replaceState() {} },
      document: { createElement: (tag) => ({ tag }), head: { appendChild: (node) => added.push(node) } },
      addEventListener() {}, dispatchEvent() {}, Event: function (name) { this.type = name; }, setTimeout };
    sandbox.window = sandbox;
    vm.runInNewContext(dashLoader, sandbox);
    return added.map((node) => node.src);
  };
  assert.deepEqual(runDashLoader('/account/orders'), ['https://apisub.amolbooks.com/api/storefront-page/customer-dashboard.js']);
  assert.deepEqual(runDashLoader('/product-details/x'), [], 'Other pages do not load it');

  // 16. Cart and checkout on tablets (768–1023 px; owner, 2026-11-13: "cart items are out of place").
  const sections = read('api/src/storefront-product-sections-script.ts');
  const tabletStart = sections.indexOf('    @media (max-width: 1023px) {\n\n      /* Native cart/checkout repairs.');
  assert.ok(tabletStart > 0, 'Cart/checkout repairs cover tablets too');
  const tabletBlock = (() => { let depth = 0; for (let i = tabletStart; i < sections.length; i++) {
    if (sections[i] === '{') depth++; if (sections[i] === '}' && --depth === 0) return sections.slice(tabletStart, i + 1); } return ''; })();
  for (const needle of ['.cart-products-list > .cart-product-item', '.cart-card.ab-live-cart-page-item .cart-card-main', '.select-items-area.ab-cart-summary-source']) {
    assert.ok(tabletBlock.includes(needle), 'Tablet block has ' + needle);
  }
  assert.ok(!tabletBlock.includes('app-cart .container'), 'Desktop cart container rules stay out of the tablet block');
  assert.match(sections, /@media \(min-width: 768px\) and \(max-width: 1023px\) \{[\s\S]*?html body\.ab-checkout-enhanced app-checkout \.cart-products-area\.summery-mbl \{\s*display: block !important;/,
    'Checkout shows its books at 851–1023 px');

  // 17. Author / book addresses with ( or ) (owner, 2026-11-13: "when I click on this author why the page goes blank?").
  const { routePart } = require('../api/dist/pages/product/product-seo.utils');
  assert.equal(routePart('ড.-খোন্দকার-(রহ.)'), encodeURIComponent('ড.-খোন্দকার-') + '%28' + encodeURIComponent('রহ.') + '%29');
  assert.equal(routePart('Rasul (SA)'), 'Rasul%20%28SA%29');
  const { cataloguePath } = require('../api/dist/pages/sitemap/catalogue-seo.utils');
  assert.ok(!/[()]/.test(cataloguePath('author', 'আবু-(সম্পাদক)')), 'Sitemap author paths have no bare brackets');
  assert.equal(WhatsappService.productLink('Rasul (SA)'), 'https://amolbooks.com/product-details/Rasul%20%28SA%29');
  assert.ok(sections.includes('function routePart(value)') && !/author-details\/' \+ encodeURIComponent/.test(sections), 'Storefront author links write brackets safely');
  assert.ok(main.indexOf("'bracket-paths.html'") > 0 && main.indexOf("'bracket-paths.html'") < main.indexOf("'meta-match-data.html'"), 'Bracket fix runs early');
  const bracketFix = read('gtm-snippets/bracket-paths.html').match(/<script>([\s\S]*?)<\/script>/)[1];
  const runBracketFix = (pathname) => { const urls = []; const sandbox = { location: { pathname, search: '?x=1', hash: '' },
    history: { state: null, replaceState: (_s, _t, url) => urls.push(url) } }; sandbox.window = sandbox; vm.runInNewContext(bracketFix, sandbox); return urls; };
  assert.deepEqual(runBracketFix('/author-list/author-details/%E0%A6%A1.-(%E0%A6%B0%E0%A6%B9.)'), ['/author-list/author-details/%E0%A6%A1.-%28%E0%A6%B0%E0%A6%B9.%29?x=1']);
  assert.deepEqual(runBracketFix('/product-details/Rasul%20(SA)'), ['/product-details/Rasul%20%28SA%29?x=1']);
  assert.deepEqual(runBracketFix('/product-list'), [], 'Other pages untouched');

  console.log('review request checks passed');
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (connection) {
      await connection.dropDatabase().catch(() => {});
      await connection.close().catch(() => {});
    }
    if (server) server.close();
    for (const key of ENV) delete process.env[key];
  });
