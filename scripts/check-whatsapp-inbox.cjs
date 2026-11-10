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
  for (const needle of ['<!-- AB_ADMIN_SIDEBAR -->', "'/api/whatsapp-inbox/chats", '/api/whatsapp-inbox/media/', "'/reply'", 'administrator: token()', 'Reply closed', 'class="workspace"', 'id="info"', 'function orderCard(order)', 'Open in Orders']) {
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

  // Chat list lines say what was sent.
  assert.equal(WhatsappService.previewText('image', 'এই বইটা'), '📷 Photo: এই বইটা');
  assert.equal(WhatsappService.previewText('audio', ''), '🎤 Voice note');
  assert.equal(WhatsappService.previewText('text', 'a\n\nb'), 'a b');
  assert.equal(WhatsappService.previewText('unsupported', ''), '[unsupported]');

  // 11. Without the inbox storage (other checks) nothing breaks.
  const bare = new WhatsappService(Order);
  bare.logger = silent;
  assert.equal(await bare.recordChat({ wa: A, direction: 'in', kind: 'customer', type: 'text', text: 'x' }), 'skipped');

  console.log('WhatsApp Inbox: messages kept once (text/photo/voice/reaction/location), order messages, chat list/search/unread, open + read by staff, media through the API, staff replies + ticks, who answered / who is in the chat / typing, 24-hour rule, switch, automatic answer modes, staff-only routes and page wiring pass');
})()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => {
    if (connection) { await connection.dropDatabase().catch(() => {}); await connection.close().catch(() => {}); }
    if (server) server.close();
  });
