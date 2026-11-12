// WhatsApp Inbox (api/src/shared/whatsapp/whatsapp-inbox.*, gtm-snippets/whatsapp-inbox.html):
// customers' messages are kept (text, photos, voice notes, taps, once each), the shop's own
// messages too, the chat list / chat / reply / media routes, the 24-hour reply rule, automatic
// answers (inbox / handover / off), ticks from the webhook, staff-only routes and page wiring.
// A fake WhatsApp server on 127.0.0.1 answers instead of Meta (nothing is sent to anyone) and the
// database is a throwaway one on the local mongod. Needs `api/dist`.
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
const { WhatsappController } = require('../api/dist/shared/whatsapp/whatsapp.controller');
const { WhatsappInboxService } = require('../api/dist/shared/whatsapp/whatsapp-inbox.service');
const { WhatsappInboxController } = require('../api/dist/shared/whatsapp/whatsapp-inbox.controller');
const { WhatsappChatSchema, WhatsappChatMessageSchema } = require('../api/dist/shared/whatsapp/whatsapp-chat.schema');
const { OrderSchema } = require('../api/dist/schema/order.schema');
const { AdminSchema } = require('../api/dist/schema/admin.schema');
const { AdminJwtAuthGuard } = require('../api/dist/guards/admin-jwt-auth.guard');
const { AdminRolesGuard } = require('../api/dist/guards/admin-roles.guard');

const uri = 'mongodb://127.0.0.1:27017/amol_whatsapp_inbox_test_' + crypto.randomBytes(6).toString('hex');
assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27017\/amol_whatsapp_inbox_test_[a-f0-9]+$/, 'Only a throwaway local database is permitted');
const silent = { error() {}, warn() {}, log() {} };
const HOUR = 3600 * 1000;
let connection;
let server;

(async () => {
  // 1. Wiring: module, staff-only routes, menu, page.
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(read('api/src/shared/whatsapp/whatsapp.module.ts'), /controllers: \[WhatsappController, WhatsappInboxController\]/);
  assert.match(read('api/src/shared/whatsapp/whatsapp.module.ts'), /name: 'WhatsappChatMessage', schema: WhatsappChatMessageSchema/);
  const guards = Reflect.getMetadata('__guards__', WhatsappInboxController) || [];
  assert.ok(guards.includes(AdminJwtAuthGuard) && guards.includes(AdminRolesGuard), 'Every inbox route needs a staff login');
  assert.match(read('api/src/pages/customer-manager/customer-manager-pages.ts'), /'\/upload\/static\/whatsapp-inbox\.html': \{\s+file: 'gtm-snippets\/whatsapp-inbox\.html'/);
  assert.match(read('api/src/pages/customer-manager/admin-sidebar.ts'), /label: 'WhatsApp Inbox', href: 'whatsapp-inbox\.html'/);
  const page = read('gtm-snippets/whatsapp-inbox.html');
  for (const match of page.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  for (const needle of ['<!-- AB_ADMIN_SIDEBAR -->', "'/api/whatsapp-inbox/chats", '/api/whatsapp-inbox/media/', "'/reply'", 'administrator: token()', 'Reply closed', 'class="workspace"', 'id="info"', 'function orderCard(order)', 'Open in Orders', 'id="request-banner"', 'Mark done', '&needs=1', 'Wants more books']) {
    assert.ok(page.includes(needle), 'Inbox page has ' + needle);
  }
  // Customer text is escaped before links are added.
  assert.match(page, /function richText\(text\) \{\s+return esc\(text\)\.replace/);
  const orders = read('api/upload/static/custom-orders.html');
  assert.ok(orders.includes("search: String(params.get('q') || '').trim().slice(0, 80)"), 'Orders page opens searched (?q=)');
  assert.ok(orders.includes("whatsapp-inbox.html?wa='+encodeURIComponent(to)"), 'WhatsApp badge opens the chat');

  // 2. Fake WhatsApp server (messages, media lookup, media download).
  const calls = [];
  let sendReply = 'ok';
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: body ? JSON.parse(body) : null });
      if (req.url.startsWith('/files/')) {
        if (req.headers.authorization !== 'Bearer test-only-token') { res.statusCode = 401; return res.end(); }
        res.setHeader('Content-Type', 'image/jpeg');
        return res.end(Buffer.from('JPEGDATA'));
      }
      res.setHeader('Content-Type', 'application/json');
      const media = req.url.match(/^\/v26\.0\/(\d+)$/);
      if (req.method === 'GET' && media) {
        if (media[1] === '777777') { res.statusCode = 404; return res.end(JSON.stringify({ error: { message: 'Media not found' } })); }
        return res.end(JSON.stringify({ id: media[1], url: base + '/files/' + media[1], mime_type: 'image/jpeg', file_size: 8 }));
      }
      if (sendReply === 'refuse') {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: { code: 131047, message: 'Re-engagement message' } }));
      }
      res.end(JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.OUT' + calls.length }] }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  Object.assign(process.env, {
    WHATSAPP_ENABLED: 'true', WHATSAPP_ACCESS_TOKEN: 'test-only-token', WHATSAPP_PHONE_NUMBER_ID: 'TEST_PHONE_ID',
    WHATSAPP_GRAPH_BASE: base, WHATSAPP_TEMPLATE_ORDER_PLACED: 'order_received', WHATSAPP_TEMPLATE_ORDER_SHIPPED: '',
    WHATSAPP_APP_SECRET: 'test-only-secret', WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'test-only-verify',
  });
  delete process.env.WHATSAPP_AUTO_REPLY;
  delete process.env.WHATSAPP_CONFIRM_BUTTONS;

  connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  const Order = connection.model('Order', OrderSchema);
  const Admin = connection.model('Admin', AdminSchema);
  const Chat = connection.model('WhatsappChat', WhatsappChatSchema);
  const ChatMessage = connection.model('WhatsappChatMessage', WhatsappChatMessageSchema);
  await Promise.all([Order.init(), Chat.init(), ChatMessage.init()]);
  const make = () => {
    const service = new WhatsappService(Order, Chat, ChatMessage);
    service.logger = silent;
    return service;
  };
  let whatsapp = make();
  const inbox = new WhatsappInboxService(Chat, ChatMessage, Order, Admin, whatsapp);
  const staffId = new mongoose.Types.ObjectId();
  await Admin.collection.insertOne({ _id: staffId, name: 'Test Staff', username: 'test-staff', role: 'salesman' });
  const admin = { _id: String(staffId), username: 'test-staff', role: 'salesman' };
  const signed = (payload) => {
    const raw = Buffer.from(JSON.stringify(payload));
    return { req: { rawBody: raw }, signature: 'sha256=' + crypto.createHmac('sha256', 'test-only-secret').update(raw).digest('hex'), payload };
  };
  const deliver = async (service, from, message, name) => {
    const hook = signed({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
      contacts: name ? [{ wa_id: from, profile: { name } }] : [],
      messages: [{ from, timestamp: String(Math.floor(Date.now() / 1000)), ...message }],
    } }] }] });
    return new WhatsappController(service).receive(hook.req, hook.signature, hook.payload);
  };
  const statusHook = (service, id, status) => {
    const hook = signed({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id, status, timestamp: '1', recipient_id: '1' }] } }] }] });
    return new WhatsappController(service).receive(hook.req, hook.signature, hook.payload);
  };
  const sentTexts = () => calls.filter((c) => c.method === 'POST' && c.body && c.body.type === 'text');
  const A = '8801700000001';

  // 3. A customer writes: kept with their name, unread, and one "we got it" answer kept too.
  let result = await deliver(whatsapp, A, { id: 'wamid.IN-A1', type: 'text', text: { body: 'বইটা কবে পাব?' } }, 'Rahim Test');
  assert.deepEqual(result, { success: true, updated: 0, handled: 1 });
  let chat = await Chat.findOne({ wa: A }).lean();
  assert.equal(chat.name, 'Rahim Test');
  assert.equal(chat.unread, 1);
  assert.ok(chat.lastCustomerAt instanceof Date);
  assert.equal(sentTexts().length, 1, 'One automatic answer');
  assert.match(sentTexts()[0].body.text.body, /^আপনার মেসেজ পেয়েছি ✅\nআমাদের টিম এখানেই উত্তর দেবে ইনশাআল্লাহ।\n— amolbooks\.com$/);
  let stored = await ChatMessage.find({ wa: A }).sort({ at: 1, _id: 1 }).lean();
  assert.deepEqual(stored.map((m) => [m.direction, m.kind, m.type, m.text]), [
    ['in', 'customer', 'text', 'বইটা কবে পাব?'],
    ['out', 'auto', 'text', sentTexts()[0].body.text.body],
  ]);
  chat = await Chat.findOne({ wa: A }).lean();
  assert.equal(chat.unread, 1, 'The automatic answer does not mark it read');
  assert.equal(chat.lastDirection, 'out');

  // Meta delivers the same message again after a restart: kept once, answered once.
  whatsapp = make();
  inbox.whatsapp = whatsapp;
  result = await deliver(whatsapp, A, { id: 'wamid.IN-A1', type: 'text', text: { body: 'বইটা কবে পাব?' } });
  assert.deepEqual(result, { success: true, updated: 0, handled: 0 });
  assert.equal(await ChatMessage.countDocuments({ wa: A, direction: 'in' }), 1);
  assert.equal(sentTexts().length, 1);

  // Photo, voice note, reaction: kept; no second answer within 12 hours; reactions never answered.
  await deliver(whatsapp, A, { id: 'wamid.IN-A2', type: 'image', image: { id: '123456', mime_type: 'image/jpeg', caption: 'এই বইটা' } });
  await deliver(whatsapp, A, { id: 'wamid.IN-A3', type: 'audio', audio: { id: '234567', mime_type: 'audio/ogg' } });
  await deliver(whatsapp, A, { id: 'wamid.IN-A4', type: 'reaction', reaction: { emoji: '👍', message_id: 'x' } });
  await deliver(whatsapp, A, { id: 'wamid.IN-A5', type: 'location', location: { latitude: 23.8, longitude: 90.4, name: 'Home' } });
  assert.equal(sentTexts().length, 2, 'The fresh service answers once (12-hour rule is per server run) and not again');
  stored = await ChatMessage.find({ wa: A, direction: 'in' }).sort({ at: 1, _id: 1 }).lean();
  assert.deepEqual(stored.map((m) => [m.type, m.text, m.media && m.media.id]), [
    ['text', 'বইটা কবে পাব?', undefined],
    ['image', 'এই বইটা', '123456'],
    ['audio', '', '234567'],
    ['reaction', 'Reacted 👍', undefined],
    ['location', '📍 Home https://maps.google.com/?q=23.8,90.4', undefined],
  ]);
  assert.equal((await Chat.findOne({ wa: A }).lean()).unread, 5);

  // 4. The shop's order message shows in the chat (a customer who never wrote is not listed).
  const order = { _id: new mongoose.Types.ObjectId(), orderId: 'T-9001', name: 'Rahim Test', phoneNo: '01700000001', paymentType: 'cash_on_delivery', orderStatus: 1, grandTotal: 370,
    orderedItems: [{ name: 'পরীক্ষার বই', quantity: 1 }], createdAt: new Date() };
  await Order.collection.insertOne(order);
  assert.equal(await whatsapp.notifyOrder('order_placed', order), 'sent');
  const orderMessage = await ChatMessage.findOne({ wa: A, kind: 'order' }).lean();
  assert.equal(orderMessage.text, 'Order message #T-9001: পরীক্ষার বই · ৳370');
  assert.equal(orderMessage.orderId, 'T-9001');
  const quiet = { _id: new mongoose.Types.ObjectId(), orderId: 'T-9002', name: 'Quiet', phoneNo: '01700000009', paymentType: 'cash_on_delivery', orderStatus: 1, grandTotal: 100, orderedItems: [], createdAt: new Date() };
  await Order.collection.insertOne(quiet);
  await whatsapp.notifyOrder('order_placed', quiet);
  assert.ok(await Chat.findOne({ wa: '8801700000009' }).lean(), 'Kept for context');

  // 5. Chat list: customers who wrote, newest first; unread filter; search by name or number.
  const B = '8801800000002';
  await deliver(whatsapp, B, { id: 'wamid.IN-B1', type: 'text', text: { body: 'hello' } }, 'Karim Test');
  let list = (await inbox.chats({})).data;
  assert.deepEqual(list.chats.map((c) => c.wa), [B, A], 'Newest first; the quiet number is not listed');
  assert.equal(list.unreadChats, 2);
  assert.equal(list.canSend, true);
  assert.equal(list.chats[1].phone, '01700000001');
  assert.ok(list.chats[1].replyUntil > new Date(Date.now() + 23 * HOUR));
  assert.deepEqual((await inbox.chats({ q: 'rahim' })).data.chats.map((c) => c.wa), [A]);
  assert.deepEqual((await inbox.chats({ q: '01800' })).data.chats.map((c) => c.wa), [B]);
  assert.deepEqual((await inbox.chats({ q: '০১৭০০' })).data.chats.map((c) => c.wa), [A], 'Bengali digits');
  assert.deepEqual((await inbox.chats({ q: 'a.*' })).data.chats, [], 'Search text is not a pattern');

  // 6. Opening a chat: messages oldest first, the customer's orders, marked read by the staff member.
  let opened = (await inbox.messages('01700000001', {}, admin)).data;
  assert.equal(opened.chat.unread, 0);
  assert.deepEqual(opened.messages.map((m) => [m.direction, m.type]), [
    ['in', 'text'], ['out', 'text'], ['in', 'image'], ['out', 'text'], ['in', 'audio'], ['in', 'reaction'], ['in', 'location'], ['out', 'template'],
  ], 'In the order things happened');
  assert.equal(opened.messages[2].media.id, '123456');
  assert.deepEqual(opened.orders.map((o) => [o.orderId, o.orderStatus, o.grandTotal]), [['T-9001', 1, 370]]);
  // What was ordered, for the order details panel.
  assert.deepEqual(opened.orders[0].items, [{ name: 'পরীক্ষার বই', quantity: 1, price: 0, total: 0, image: '', gift: false }]);
  assert.equal(opened.orders[0].paymentType, 'cash_on_delivery');
  const shaped = WhatsappInboxService.orderRow({ _id: 'x', orderId: 7, orderStatus: 2, shippingAddress: 'House 1, Road 2', area: 'Mirpur', city: 'Dhaka', subTotal: 500, deliveryCharge: 60, discount: 20, grandTotal: 540,
    orderedItems: [{ name: 'বই ক', quantity: 2, salePrice: 250, image: 'https://example.test/a.webp' }, { name: 'নোটবুক', quantity: 1, salePrice: 0, isGift: true }],
    courierData: { providerName: 'Steadfast Courier', consignmentId: 99, trackingId: 'TR9' }, customerRequest: { kind: 'more' }, customerConfirmation: { status: 'confirmed' } });
  assert.deepEqual(shaped.items.map((i) => [i.name, i.quantity, i.total, i.gift]), [['বই ক', 2, 500, false], ['নোটবুক', 1, 0, true]]);
  assert.equal(shaped.address, 'House 1, Road 2, Mirpur, Dhaka');
  assert.deepEqual(shaped.courier, { name: 'Steadfast Courier', tracking: 'TR9' });
  assert.deepEqual([shaped.request, shaped.confirmed, shaped.booked], ['more', true, true]);
  chat = await Chat.findOne({ wa: A }).lean();
  assert.equal(chat.unread, 0);
  assert.equal(chat.readBy, 'Test Staff');
  list = (await inbox.chats({ unread: '1' })).data;
  assert.deepEqual(list.chats.map((c) => c.wa), [B]);
  await assert.rejects(inbox.messages('12345', {}, admin), (e) => e.getStatus() === 400);
  await assert.rejects(inbox.messages('01999999999', {}, admin), (e) => e.getStatus() === 404);

  // 7. Photos and voice notes come through the API with the token, only for inbox media.
  const file = await inbox.media('123456');
  assert.equal(file.mime, 'image/jpeg');
  assert.equal(file.buffer.toString(), 'JPEGDATA');
  await assert.rejects(inbox.media('999000111'), (e) => e.getStatus() === 404, 'Not a file from the inbox');
  await assert.rejects(inbox.media('../v26.0/me'), (e) => e.getStatus() === 404);
  await ChatMessage.collection.insertOne({ wa: A, direction: 'in', kind: 'customer', type: 'image', media: { id: '777777' }, at: new Date() });
  await assert.rejects(inbox.media('777777'), (e) => e.getStatus() === 404 && /Media not found/.test(e.message), 'Expired at WhatsApp');

  // 8. Staff reply: sent as text, kept with the staff name; ticks follow the webhook.
  const before = sentTexts().length;
  const sent = (await inbox.reply(A, { text: '  আগামীকাল পাবেন ইনশাআল্লাহ।  ' }, admin)).data;
  assert.equal(sentTexts().length, before + 1);
  assert.deepEqual(sentTexts().at(-1).body, { messaging_product: 'whatsapp', to: A, type: 'text', text: { preview_url: true, body: 'আগামীকাল পাবেন ইনশাআল্লাহ।' } });
  assert.equal(sent.kind, 'staff');
  assert.equal(sent.by, 'Test Staff');
  assert.equal(sent.status, 'sent');
  const staffMessage = await ChatMessage.findOne({ wa: A, kind: 'staff' }).lean();
  assert.equal(String(staffMessage.by._id), String(staffId));
  await statusHook(whatsapp, staffMessage.messageId, 'read');
  await statusHook(whatsapp, staffMessage.messageId, 'delivered');
  assert.equal((await ChatMessage.findById(staffMessage._id).lean()).status, 'read', 'Ticks never go backwards');
  assert.equal((await Chat.findOne({ wa: A }).lean()).lastText, 'আগামীকাল পাবেন ইনশাআল্লাহ।');
  // The chat list says who answered last.
  let row = (await inbox.chats({}, admin)).data.chats.find((c) => c.wa === A);
  assert.deepEqual([row.lastKind, row.lastBy, row.lastStaff.name], ['staff', 'Test Staff', 'Test Staff']);
  await assert.rejects(inbox.reply(A, { text: '   ' }, admin), (e) => e.getStatus() === 400);
  await assert.rejects(inbox.reply(A, { text: 'x'.repeat(4097) }, admin), (e) => e.getStatus() === 400);
  sendReply = 'refuse';
  await assert.rejects(inbox.reply(A, { text: 'hi' }, admin), (e) => e.getStatus() === 400 && /131047/.test(e.message));
  sendReply = 'ok';
  // Staff are talking with them: no automatic answer in between (fresh server run).
  whatsapp = make();
  inbox.whatsapp = whatsapp;
  const quietBefore = sentTexts().length;
  await deliver(whatsapp, A, { id: 'wamid.IN-A6', type: 'text', text: { body: 'ধন্যবাদ' } });
  assert.equal(sentTexts().length, quietBefore, 'No automatic answer while staff reply');

  // Who else has the chat open / is typing (not yourself); leaving or going quiet removes them.
  const otherId = new mongoose.Types.ObjectId();
  await Admin.collection.insertOne({ _id: otherId, name: 'Second Staff', username: 'second-staff', role: 'salesman' });
  const other = { _id: String(otherId), username: 'second-staff', role: 'salesman' };
  await inbox.messages(A, {}, other);
  assert.deepEqual((await inbox.messages(A, {}, admin)).data.viewers, [{ name: 'Second Staff', typing: false }]);
  assert.deepEqual((await inbox.messages(A, {}, other)).data.viewers, [{ name: 'Test Staff', typing: false }]);
  row = (await inbox.chats({}, admin)).data.chats.find((c) => c.wa === A);
  assert.deepEqual(row.viewers, [{ name: 'Second Staff', typing: false }]);
  await inbox.typing(A, other);
  assert.deepEqual((await inbox.chats({}, admin)).data.chats.find((c) => c.wa === A).viewers, [{ name: 'Second Staff', typing: true }]);
  await inbox.reply(A, { text: 'ঠিক আছে' }, other);
  assert.deepEqual((await inbox.messages(A, {}, admin)).data.viewers, [{ name: 'Second Staff', typing: false }], 'Sending ends "typing"');
  assert.equal((await inbox.chats({}, admin)).data.chats.find((c) => c.wa === A).lastStaff.name, 'Second Staff');
  await inbox.leave(A, other);
  assert.deepEqual((await inbox.messages(A, {}, admin)).data.viewers, []);
  await inbox.messages(A, {}, other);
  inbox.presence.get(A).get(String(otherId)).seenAt -= 25000;
  assert.deepEqual((await inbox.messages(A, {}, admin)).data.viewers, [], 'Gone quiet for 20 s: left');
  await inbox.leave(A, admin);

  // 9. The 24-hour rule and the switch.
  await Chat.updateOne({ wa: B }, { $set: { lastCustomerAt: new Date(Date.now() - 25 * HOUR) } });
  await assert.rejects(inbox.reply(B, { text: 'hi' }, admin), (e) => e.getStatus() === 400 && /24 hours/.test(e.message));
  assert.equal((await inbox.messages(B, {}, admin)).data.chat.replyUntil, null);
  process.env.WHATSAPP_ENABLED = 'false';
  await assert.rejects(inbox.reply(A, { text: 'hi' }, admin), (e) => e.getStatus() === 503);
  assert.equal((await inbox.chats({})).data.canSend, false);
  // Switched off: customers' messages are still kept, nothing is answered.
  const offBefore = calls.length;
  await deliver(make(), '8801900000003', { id: 'wamid.IN-C1', type: 'text', text: { body: 'off?' } }, 'Off Test');
  assert.equal(calls.length, offBefore);
  assert.ok(await ChatMessage.findOne({ messageId: 'wamid.IN-C1' }).lean());
  process.env.WHATSAPP_ENABLED = 'true';

  // 10. Automatic answer modes, and button answers asking to write here.
  process.env.WHATSAPP_AUTO_REPLY = 'off';
  let n = sentTexts().length;
  await deliver(make(), '8801900000004', { id: 'wamid.IN-D1', type: 'text', text: { body: 'hi' } });
  assert.equal(sentTexts().length, n, 'off: no automatic answer');
  process.env.WHATSAPP_AUTO_REPLY = 'handover';
  await deliver(make(), '8801900000005', { id: 'wamid.IN-E1', type: 'text', text: { body: 'hi' } });
  assert.match(sentTexts().at(-1).body.text.body, /^এই নম্বরটি শুধু অর্ডারের আপডেটের জন্য।/);
  delete process.env.WHATSAPP_AUTO_REPLY;
  assert.match(whatsapp.replyText({ status: 'more', orderId: '14869' }), /^অবশ্যই! অর্ডার #14869-এ একই ডেলিভারি চার্জে আরও বই যোগ করা যাবে।\nকোন বই নিতে চান, এখানেই লিখুন/);
  assert.match(whatsapp.replyText({ status: 'change', orderId: '14869' }), /এখানেই লিখুন/);
  assert.match(whatsapp.replyText({ status: 'unknown', orderId: '14869' }), /অর্ডার #14869 নিয়ে আমাদের টিম এখানেই উত্তর দেবে/);
  assert.ok(!/wa\.me/.test(whatsapp.replyText({ status: 'closed', orderId: '1' })), 'No link to the other number in inbox mode');

  // "Wants more books" nudge: set by the tap, listed under Needs action, cleared by Mark done
  // (order flagged done), re-shown from the order if the chat lost it, dropped once booked.
  process.env.WHATSAPP_ENABLED = 'true';
  whatsapp.onCustomerReply(async (reply) => {
    await Order.updateOne({ _id: reply.orderId }, { $set: { customerRequest: { kind: reply.action, at: new Date(), via: 'whatsapp' } } });
    return { status: reply.action, orderId: 'T-9001' };
  });
  await deliver(whatsapp, A, { id: 'wamid.IN-MORE1', type: 'button', button: { payload: 'more:' + order._id, text: 'একই ডেলিভারি চার্জে আরও বই নিবো' } });
  chat = await Chat.findOne({ wa: A }).lean();
  assert.deepEqual([chat.request.kind, chat.request.orderId, String(chat.request.order)], ['more', 'T-9001', String(order._id)]);
  list = (await inbox.chats({ needs: '1' }, admin)).data;
  assert.deepEqual(list.chats.map((c) => c.wa), [A]);
  assert.equal(list.needsAction, 1);
  assert.deepEqual([list.chats[0].request.kind, list.chats[0].request.orderId], ['more', 'T-9001']);
  opened = (await inbox.messages(A, {}, admin)).data;
  assert.equal(opened.chat.request.kind, 'more');
  assert.equal(opened.orders[0].request, 'more');
  assert.deepEqual((await inbox.requestDone(A, admin)).data, { orders: 1 });
  const doneOrder = await Order.findById(order._id).lean();
  assert.ok(doneOrder.customerRequest.doneAt instanceof Date, 'Kept on the order');
  assert.equal(doneOrder.customerRequest.doneBy, 'Test Staff');
  assert.equal((await Chat.findOne({ wa: A }).lean()).request, undefined);
  list = (await inbox.chats({ needs: '1' }, admin)).data;
  assert.deepEqual([list.chats.length, list.needsAction], [0, 0]);
  opened = (await inbox.messages(A, {}, admin)).data;
  assert.equal(opened.orders[0].request, '', 'Handled: no longer open');
  assert.equal(opened.orders[0].requestDone.by, 'Test Staff');
  assert.equal(opened.chat.request, null);
  // A new tap opens it again; the chat picks it up from the order even without the flag.
  await Order.updateOne({ _id: order._id }, { $set: { customerRequest: { kind: 'change', at: new Date(), via: 'whatsapp' } } });
  assert.equal((await inbox.messages(A, {}, admin)).data.chat.request.kind, 'change');
  assert.equal((await inbox.chats({}, admin)).data.needsAction, 1);
  // Booked with the courier: nothing left to add, the nudge goes.
  await Order.updateOne({ _id: order._id }, { $set: { 'courierData.consignmentId': 'C-1' } });
  assert.equal((await inbox.chats({}, admin)).data.needsAction, 0);
  assert.equal((await Chat.findOne({ wa: A }).lean()).request, undefined);

  // Chat list lines say what was sent.
  assert.equal(WhatsappService.previewText('image', 'এই বইটা'), '📷 Photo: এই বইটা');
  assert.equal(WhatsappService.previewText('audio', ''), '🎤 Voice note');
  assert.equal(WhatsappService.previewText('text', 'a\n\nb'), 'a b');
  assert.equal(WhatsappService.previewText('unsupported', ''), '[unsupported]');

  // 11. Without the inbox storage (other checks) nothing breaks.
  const bare = new WhatsappService(Order);
  bare.logger = silent;
  assert.equal(await bare.recordChat({ wa: A, direction: 'in', kind: 'customer', type: 'text', text: 'x' }), 'skipped');

  // 12. "More books" answer lists the shop's popular books with today's price, leaving out what is
  // already in the order (owner, 2026-11-12); the reply box's ready answers; page wiring.
  const { ProductSchema } = require('../api/dist/schema/product.schema');
  const Product = connection.model('Product', ProductSchema);
  const pid = () => new mongoose.Types.ObjectId();
  const books = [
    { _id: pid(), slug: '500 shobder kuraner 75%', name: '৫০০ শব্দে কুরআনের ৭৫% (নতুন সংস্করণ)', salePrice: 470, discountType: 2, discountAmount: 160, status: 'publish' },
    { _id: pid(), slug: 'productive muslim', name: 'প্রোডাক্টিভ মুসলিম', salePrice: 500, discountType: 2, discountAmount: 185, status: 'publish' },
    { _id: pid(), slug: 'the-barakah-effect', name: 'দ্য বারাকাহ ইফেক্ট', salePrice: 600, discountType: 1, discountAmount: 50, status: 'publish' },
    { _id: pid(), slug: 'the-story-of-muhammad', name: 'দ্য স্টোরি অব মুহাম্মাদ (সা.)', salePrice: 320, status: 'draft' },
  ];
  await Product.collection.insertMany(books);
  const shop = new WhatsappService(Order, Chat, ChatMessage, Product);
  shop.logger = silent;
  assert.deepEqual((await shop.offeredBooks()).map((b) => [b.name, b.price]), [
    ['৫০০ শব্দে কুরআনের ৭৫% (নতুন সংস্করণ)', 310], ['প্রোডাক্টিভ মুসলিম', 315], ['দ্য বারাকাহ ইফেক্ট', 300],
  ], 'List order, website price (taka and percent discounts), drafts left out');
  assert.equal(WhatsappService.bengaliNumber(1234), '১২৩৪');
  const K = '8801700000077';
  const moreOrder = { _id: pid(), orderId: 'T-9100', name: 'Karim Test', phoneNo: '01700000077', paymentType: 'cash_on_delivery', orderStatus: 1, grandTotal: 375,
    orderedItems: [{ _id: books[1]._id, name: 'প্রোডাক্টিভ মুসলিম', quantity: 1, salePrice: 315 }], createdAt: new Date() };
  await Order.collection.insertOne(moreOrder);
  shop.onCustomerReply(async (reply) => {
    await Order.updateOne({ _id: reply.orderId }, { $set: { customerRequest: { kind: reply.action, at: new Date(), via: 'whatsapp' } } });
    return { status: reply.action, orderId: 'T-9100' };
  });
  n = sentTexts().length;
  await deliver(shop, K, { id: 'wamid.IN-MORE-LIST', type: 'button', button: { payload: 'more:' + moreOrder._id, text: 'একই ডেলিভারি চার্জে আরও বই নিবো' } });
  assert.equal(sentTexts().length, n + 1, 'One answer to the tap');
  const moreAnswer = [
    'অবশ্যই! অর্ডার #T-9100-এ একই ডেলিভারি চার্জে আরও বই যোগ করা যাবে।',
    '',
    'আমাদের জনপ্রিয় বই ও মূল্য:',
    '১. ৫০০ শব্দে কুরআনের ৭৫% (নতুন সংস্করণ) — ৩১০ টাকা',
    '২. দ্য বারাকাহ ইফেক্ট — ৩০০ টাকা',
    '',
    'আরও বই দেখুন: https://amolbooks.com',
    '',
    'কোন বই নিতে চান, বইয়ের নাম বা নম্বর এখানে লিখুন। আমাদের টিম অর্ডারে যোগ করে দেবে ইনশাআল্লাহ।',
    '— amolbooks.com',
  ].join('\n');
  assert.equal(sentTexts().at(-1).body.text.body, moreAnswer, 'Book list without the book already ordered');
  assert.equal((await Chat.findOne({ wa: K }).lean()).request.kind, 'more', 'The nudge still shows');
  // No shop books (or no product storage): the short answer as before.
  assert.match(shop.replyText({ status: 'more', orderId: '1', books: [] }), /\nকোন বই নিতে চান, এখানেই লিখুন/);
  process.env.WHATSAPP_AUTO_REPLY = 'handover';
  assert.match(shop.replyText({ status: 'more', orderId: '1', books: await shop.offeredBooks() }), /wa\.me/, 'Hand-over answers unchanged');
  delete process.env.WHATSAPP_AUTO_REPLY;
  process.env.WHATSAPP_BOOK_LIST = 'the-barakah-effect, productive muslim';
  assert.deepEqual((await shop.offeredBooks()).map((b) => b.slug), ['the-barakah-effect', 'productive muslim'], 'WHATSAPP_BOOK_LIST replaces the list');
  delete process.env.WHATSAPP_BOOK_LIST;

  const shopInbox = new WhatsappInboxService(Chat, ChatMessage, Order, Admin, shop);
  let quick = (await shopInbox.quickReplies('01700000077')).data;
  assert.equal(quick.orderId, 'T-9100');
  assert.deepEqual(quick.replies.map((r) => r.id), ['more', 'added', 'prices', 'address', 'delivery', 'thanks']);
  assert.equal(quick.replies[0].text, moreAnswer, 'Same list as the automatic answer');
  assert.match(quick.replies[1].text, /^আপনার অর্ডার #T-9100-এ বই যোগ করা হয়েছে ✅\nএখন মোট: ৩৭৫ টাকা \(ডেলিভারি চার্জসহ\)।/);
  assert.match(quick.replies[2].text, /^আসসালামু আলাইকুম,\n\nআমাদের জনপ্রিয় বই ও মূল্যতালিকা:\n১\. ৫০০ শব্দে কুরআনের ৭৫% \(নতুন সংস্করণ\) — ৩১০ টাকা\n২\. প্রোডাক্টিভ মুসলিম — ৩১৫ টাকা\n৩\. দ্য বারাকাহ ইফেক্ট — ৩০০ টাকা\n\n৩টি বা তার বেশি বই নিলে সারাদেশে ফ্রি ডেলিভারি।/);
  // Staff added books: "Books added" shows the new total.
  await Order.updateOne({ _id: moreOrder._id }, { $set: { grandTotal: 685 } });
  assert.match((await shopInbox.quickReplies(K)).data.replies[1].text, /এখন মোট: ৬৮৫ টাকা/);
  // Booked with the courier: no order answers, the general ones stay.
  await Order.updateOne({ _id: moreOrder._id }, { $set: { 'courierData.consignmentId': 'C-77' } });
  assert.deepEqual((await shopInbox.quickReplies(K)).data.replies.map((r) => r.id), ['prices', 'address', 'delivery', 'thanks']);
  await assert.rejects(() => shopInbox.quickReplies('12'), /Unknown WhatsApp number/);
  assert.ok(Reflect.getMetadata('path', WhatsappInboxController.prototype.quickReplies) === 'chats/:wa/quick-replies', 'Route');

  // Page: instant sending with Send again / Edit, drafts per chat, ready answers (button and "/"), Book list button.
  for (const needle of ["'/quick-replies'", 'id="quick-btn"', 'id="quick"', 'id="request-books"', 'function sendOutbox()', 'data-retry="', 'data-edit="', 'DRAFTS_KEY', "/^\\/[^\\n]*$/.test(value)", 'const CHAT_EVERY_MS = 4000;']) {
    assert.ok(page.includes(needle), 'Inbox page has ' + needle);
  }
  assert.ok(!/\$\('send'\)\.disabled = true/.test(page), 'The send button is never locked while a message goes out');
  // Phones (2026-11-12): no zoom on tapping the box, page sized above the keyboard, Back = chat list,
  // keyboard stays up after Send, newest message stays in view when the area changes size.
  for (const needle of ['interactive-widget=resizes-content', 'viewport-fit=cover', "matchMedia('(max-width: 900px)')", 'function fitViewport()', "window.addEventListener('popstate'",
    'history.pushState({ inboxChat: wa }', 'new ResizeObserver(() => keepBottom())', "['send', 'quick-btn'].forEach((id) => $(id).addEventListener('mousedown'", '.app.composing .orders, .app.composing .request { display: none; }', 'env(safe-area-inset-bottom)']) {
    assert.ok(page.includes(needle), 'Inbox page has ' + needle);
  }
  assert.match(page, /@media \(max-width: 900px\) \{[\s\S]*?\.search input, \.composer textarea, \.login input \{ font-size: 16px; \}/, '16px boxes on phones (iPhone zoom)');
  assert.ok(page.indexOf('renderHead(data);') < page.indexOf('renderMessages(first);'), 'Banner drawn before scrolling to the newest message');

  console.log('WhatsApp Inbox: messages kept once (text/photo/voice/reaction/location), order messages, chat list/search/unread, open + read by staff, media through the API, staff replies + ticks, who answered / who is in the chat / typing, more-books nudge + mark done, 24-hour rule, switch, automatic answer modes, more-books book list, ready answers, staff-only routes and page wiring pass');
})()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => {
    if (connection) { await connection.dropDatabase().catch(() => {}); await connection.close().catch(() => {}); }
    if (server) server.close();
  });
