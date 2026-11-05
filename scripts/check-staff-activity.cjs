// Isolated Mongo/Nest check for staff attribution and performance points.
// Uses a throwaway database on the local mongod (never the app database); courier,
// SMS and Meta calls are stubbed, so no parcel, message or event leaves this machine.
// `--serve` keeps the sandbox running on http://localhost:3000 for browser checks.
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
const express = lib('express');
const jwt = lib('jsonwebtoken');
const { NestFactory } = lib('@nestjs/core');
const { Module: NestModule, VersioningType } = lib('@nestjs/common');
const { PassportModule } = lib('@nestjs/passport');
const { JwtAdminStrategy } = require('../api/dist/pages/admin/jwt-admin.strategy');
const { OrderService } = require('../api/dist/pages/sales/order/order.service');
const { OrderController } = require('../api/dist/pages/sales/order/order.controller');
const { StaffActivityService } = require('../api/dist/pages/staff-activity/staff-activity.service');
const { StaffActivityController } = require('../api/dist/pages/staff-activity/staff-activity.controller');
const { StaffActivitySchema, StaffPointsSchema } = require('../api/dist/pages/staff-activity/staff-activity.schema');
const { customerManagerPages } = require('../api/dist/pages/customer-manager/customer-manager-pages');
const { UtilsService } = require('../api/dist/shared/utils/utils.service');
const { OrderSchema } = require('../api/dist/schema/order.schema');
const { IncompleteOrderSchema } = require('../api/dist/schema/incomplete-order.schema');

const serve = process.argv.includes('--serve');
const uri = 'mongodb://127.0.0.1:27017/amol_staff_activity_test_' + crypto.randomBytes(6).toString('hex');
assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27017\/amol_staff_activity_test_[a-f0-9]+$/, 'Only a throwaway local database is permitted');
const secret = 'isolated-staff-activity-fixture-secret';
const silent = { error() {}, warn() {}, log() {} };
const loose = () => new mongoose.Schema({}, { strict: false });
let connection, app;

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
  for (const file of ['staff-attribution.html', 'staff-performance.html']) {
    const html = fs.readFileSync(path.join(root, 'gtm-snippets', file), 'utf8');
    new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1], { filename: file });
  }

  connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  const Order = connection.model('Order', OrderSchema);
  const Incomplete = connection.model('IncompleteOrder', IncompleteOrderSchema);
  const Activity = connection.model('StaffActivity', StaffActivitySchema);
  const Points = connection.model('StaffPoints', StaffPointsSchema);
  const Admin = connection.model('Admin', loose());
  const Product = connection.model('Product', loose());
  const User = connection.model('User', loose());
  const Setting = connection.model('Setting', loose());
  const StockMovement = connection.model('StockMovement', loose());
  const UniqueId = connection.model('UniqueId', new mongoose.Schema({ orderId: Number }));
  await Promise.all([Order.init(), Incomplete.init(), Activity.init(), Points.init()]);

  const admin = async (name, username, role, extra = {}) => {
    const doc = { _id: new mongoose.Types.ObjectId(), username, role, hasAccess: true, ...(name ? { name } : {}), ...extra };
    await Admin.collection.insertOne(doc);
    // JwtAdminStrategy.validate() shape
    return { _id: String(doc._id), username, role, permissions: ['create', 'edit', 'delete', 'get'] };
  };
  const owner = await admin('Owner Hasan', 'owner', 'super_admin');
  const karim = await admin('Karim Admin', 'karim', 'admin');
  const rahim = await admin('Rahim Sales', 'rahim', 'salesman');
  const sumi = await admin('Sumi Sales', 'sumi', 'salesman');
  const editor = await admin('', 'editor-only', 'editor');
  await admin('Old Staff', 'old', 'salesman', { hasAccess: false });
  const token = (who, options = { expiresIn: '1h' }) => jwt.sign(who, secret, options);

  const productId = new mongoose.Types.ObjectId();
  await Product.collection.insertOne({ _id: productId, name: 'পরীক্ষার বই — প্রকৃত অর্ডার নয়', salePrice: 250, regularPrice: 300, costPrice: 120, stock: 500, quantity: 500 });
  await Setting.collection.insertOne({ courierMethods: [{ status: 'active', providerName: 'Steadfast Courier', apiKey: 'test-only', secretKey: 'test-only' }] });

  let courierCalls = 0;
  let courierFails = false;
  const courierService = new Proxy(
    {
      async createOrderWithProvider(_config, payload) {
        courierCalls++;
        if (courierFails) return { status: 500, message: 'Test courier rejection' };
        return { status: 200, consignment: { consignment_id: 900000 + courierCalls, tracking_code: 'TEST' + courierCalls, status: 'in_review', invoice: payload.invoice } };
      },
    },
    { get: (target, key) => target[key] || (async () => ({ status: 404 })) }
  );
  const config = { get: (key) => (key === 'adminJwtSecret' ? secret : undefined) };
  const staff = new StaffActivityService(Activity, Points, Admin, Order, Incomplete, config);
  const orderService = Object.create(OrderService.prototype);
  Object.assign(orderService, {
    orderModel: Order,
    incompleteOrderModel: Incomplete,
    adminModel: Admin,
    productModel: Product,
    userModel: User,
    settingModel: Setting,
    uniqueIdModel: UniqueId,
    stockMovementModel: StockMovement,
    utilsService: new UtilsService(Product),
    courierService,
    bulkSmsService: { sentSingleSms() {}, sendOrderAccessOtp() {} },
    configService: config,
    staffActivityService: staff,
    logger: silent,
  });
  orderService.sendManualOrderToMeta = async () => {};
  orderService.processOrderBackgroundTasks = async () => {};

  class FixtureModule {}
  NestModule({
    imports: [PassportModule],
    controllers: [StaffActivityController, OrderController],
    providers: [
      { provide: StaffActivityService, useValue: staff },
      { provide: OrderService, useValue: orderService },
      { provide: JwtAdminStrategy, useValue: new JwtAdminStrategy(config) },
    ],
  })(FixtureModule);
  app = await NestFactory.create(FixtureModule, { logger: false, cors: true });
  app.use(customerManagerPages(root));
  app.use('/upload/static', express.static(path.join(root, 'api/upload/static')));
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  await app.listen(serve ? 3000 : 0, '127.0.0.1');
  const base = 'http://127.0.0.1:' + app.getHttpServer().address().port;
  const call = async (method, url, who, body, raw) => {
    const response = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(who ? { administrator: typeof who === 'string' ? who : token(who) } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: raw ? await response.text() : await response.json() };
  };

  const seed = async (overrides = {}) => {
    const id = new mongoose.Types.ObjectId();
    const doc = {
      _id: id, orderId: 'TEST-' + id.toString().slice(-6), name: 'Test customer — not a real order', phoneNo: '01700000000',
      shippingAddress: 'Test address', paymentType: 'cash_on_delivery', paymentStatus: 'unpaid', orderStatus: 1,
      subTotal: 300, discount: 50, deliveryCharge: 60, grandTotal: 310,
      orderedItems: [{ _id: productId, name: 'পরীক্ষার বই — প্রকৃত অর্ডার নয়', quantity: 1, regularPrice: 300, salePrice: 250 }],
      createdAt: new Date(), updatedAt: new Date(), ...overrides,
    };
    await Order.collection.insertOne(doc);
    return doc;
  };
  const get = (model, doc) => model.findById(doc._id || doc).lean();
  const activities = (filter) => Activity.find(filter).lean();
  const nameOf = (stamp) => stamp && stamp.name;

  // 1. Steadfast send from Processing: parcel + move, both credited once to the sender.
  const A = await seed();
  await orderService.sendToCourier(String(A._id), rahim);
  let order = await get(Order, A);
  assert.equal(order.orderStatus, 2);
  assert.equal(order.courierData.consignmentId, '900001');
  assert.equal(nameOf(order.courierSentBy), 'Rahim Sales');
  assert.equal(order.courierSentBy.role, 'salesman');
  assert.ok(order.courierSentBy.at instanceof Date);
  assert.deepEqual((await activities({ target: A._id })).map((a) => a.action).sort(), ['courier_sent', 'processing_moved']);
  const sendActivity = (await activities({ target: A._id, action: 'courier_sent' }))[0];
  assert.equal(sendActivity.adminName, 'Rahim Sales');
  assert.equal(sendActivity.provider, 'Steadfast Courier');
  assert.ok(sendActivity.createdAt instanceof Date, 'Upserted activity gets a timestamp');
  await assert.rejects(orderService.sendToCourier(String(A._id), sumi), 'An already-booked parcel cannot be re-sent');
  assert.equal(courierCalls, 1);
  assert.equal(nameOf((await get(Order, A)).courierSentBy), 'Rahim Sales');
  assert.equal((await activities({ target: A._id })).length, 2, 'No points for a repeated send');

  // 2. A rejected booking stamps no sender (the existing flow still confirms the order).
  const A2 = await seed();
  courierFails = true;
  await orderService.sendToCourier(String(A2._id), sumi);
  courierFails = false;
  order = await get(Order, A2);
  assert.equal(order.courierSentBy, undefined);
  assert.equal((await activities({ target: A2._id, action: 'courier_sent' })).length, 0);

  // 3. Status moves: first move out of Processing counts once, whoever moves it later.
  const B = await seed();
  await orderService.changeOrderStatus(String(B._id), { orderStatus: 2 }, karim);
  await orderService.changeOrderStatus(String(B._id), { orderStatus: 1 }, karim);
  await orderService.changeOrderStatus(String(B._id), { orderStatus: 6 }, sumi);
  let moved = await activities({ target: B._id, action: 'processing_moved' });
  assert.equal(moved.length, 1);
  assert.equal(moved[0].adminName, 'Karim Admin');
  assert.equal(moved[0].fromStatus, 1);
  assert.equal(moved[0].toStatus, 2);
  const C = await seed();
  await orderService.changeOrderStatus(String(C._id), { orderStatus: 8 }, sumi);
  await orderService.changeOrderStatus(String(C._id), { orderStatus: 3 }, sumi);
  assert.equal((await activities({ target: C._id })).length, 0, 'Moves inside the Processing tab do not count');
  await orderService.changeOrderStatus(String(C._id), { orderStatus: 10 }, sumi);
  moved = await activities({ target: C._id });
  assert.equal(moved.length, 1);
  assert.equal(moved[0].toStatus, 10);
  const D = await seed();
  await orderService.changeOrderStatus(String(D._id), { orderStatus: 2 });
  assert.equal((await activities({ target: D._id })).length, 0, 'No staff identity, no credit');
  const N = await seed();
  await orderService.changeOrderStatus(String(N._id), { orderStatus: 2 }, editor);
  assert.equal((await activities({ target: N._id }))[0].adminName, 'editor-only', 'Falls back to the username');

  // 4. Admin notes on the unguarded update route: only a valid admin token names the author.
  const E = await seed();
  const note = (text, who) => orderService.updateOrderById(String(E._id), { adminNote: text }, who);
  await note('Customer wants evening delivery', token(karim));
  assert.equal(nameOf((await get(Order, E)).adminNoteBy), 'Karim Admin');
  await note('Customer wants evening delivery ', token(sumi));
  assert.equal(nameOf((await get(Order, E)).adminNoteBy), 'Karim Admin', 'Saving an unchanged note keeps its author');
  await note('Evening delivery, call first', token(sumi));
  assert.equal(nameOf((await get(Order, E)).adminNoteBy), 'Sumi Sales');
  // A note change without a live admin login is refused; the saved note and its writer stay.
  const refused = async (text, who, why) => {
    await assert.rejects(note(text, who), (error) => error?.getStatus?.() === 401, why);
    order = await get(Order, E);
    assert.equal(order.adminNote, 'Evening delivery, call first', why);
    assert.equal(nameOf(order.adminNoteBy), 'Sumi Sales', why);
  };
  await refused('Changed without a token', undefined, 'No login');
  await refused('Wrong secret', jwt.sign(karim, 'not-the-secret'), 'Wrong secret');
  await refused('Expired', token({ ...karim, exp: Math.floor(Date.now() / 1000) - 60 }, {}), 'Expired login');
  await refused('', undefined, 'Clearing a note also needs a login');
  await note('Evening delivery, call first ');
  await orderService.updateOrderById(String(E._id), { paymentStatus: 'unpaid', courierSentBy: { name: 'Forged' } });
  order = await get(Order, E);
  assert.equal(order.paymentStatus, 'unpaid', 'Updates that leave the note alone need no login');
  assert.equal(nameOf(order.adminNoteBy), 'Sumi Sales');
  await note('Written by Karim', token(karim));
  await note('', token(karim));
  assert.equal((await get(Order, E)).adminNoteBy, undefined, 'A cleared note has no author');
  await orderService.updateOrderById(String(E._id), { adminNote: 'Forged', adminNoteBy: { name: 'Forged' }, courierSentBy: { name: 'Forged' } }, token(rahim));
  order = await get(Order, E);
  assert.equal(nameOf(order.adminNoteBy), 'Rahim Sales');
  assert.equal(order.courierSentBy, undefined, 'Request bodies cannot set attribution');
  const F = await seed();
  await orderService.updateOrderById(String(F._id), { orderStatus: 2 }, token(rahim));
  assert.equal((await activities({ target: F._id }))[0].adminName, 'Rahim Sales');
  const F2 = await seed();
  await orderService.updateOrderById(String(F2._id), { orderStatus: 2 });
  assert.equal((await activities({ target: F2._id })).length, 0);

  // 5. Bulk status change and bulk courier booking.
  const [G1, G2, G3] = [await seed(), await seed(), await seed({ orderStatus: 2 })];
  const gIds = [G1, G2, G3].map((g) => String(g._id));
  await orderService.updateMultipleOrderById(gIds, { ids: gIds, orderStatus: 6 }, owner);
  assert.equal((await activities({ action: 'processing_moved', target: { $in: [G1._id, G2._id, G3._id] } })).length, 2);
  const H = await seed();
  await orderService.updateMultipleOrderById([String(H._id)], { ids: [String(H._id)], orderStatus: 8 }, owner);
  order = await waitFor(async () => { const o = await get(Order, H); return o.courierSentBy && o; }, 'bulk courier attribution');
  assert.equal(nameOf(order.courierSentBy), 'Owner Hasan');
  assert.deepEqual((await activities({ target: H._id })).map((a) => a.action), ['courier_sent']);

  // 6. Order editor route (guarded) records notes and strips forged stamps.
  const I = await seed();
  await orderService.updateOrderByAdmin(String(I._id), { adminNote: 'Wrap as a gift', courierSentBy: { name: 'Forged' } }, karim);
  order = await get(Order, I);
  assert.equal(nameOf(order.adminNoteBy), 'Karim Admin');
  assert.equal(order.courierSentBy, undefined);
  await orderService.updateOrderByAdmin(String(I._id), { orderStatus: 6 }, karim);
  assert.equal((await activities({ target: I._id }))[0].toStatus, 6);

  // 7. Incomplete Orders: note author, Send/Add Order conversion counted once.
  const incomplete = async (adminNote) => {
    const id = new mongoose.Types.ObjectId();
    await Incomplete.collection.insertOne({
      _id: id, name: 'Test customer — not a real order', phoneNo: '01800000000', shippingAddress: 'Test address',
      paymentType: 'cash_on_delivery', subTotal: 300, discount: 50, deliveryCharge: 60, grandTotal: 310, adminNote,
      orderedItems: [{ _id: productId, name: 'পরীক্ষার বই — প্রকৃত অর্ডার নয়', quantity: 1, regularPrice: 300, salePrice: 250 }],
      createdAt: new Date(), updatedAt: new Date(),
    });
    return id;
  };
  const payload = (incompleteOrderId, adminNote, quantity = 1) => ({
    ...(incompleteOrderId ? { incompleteOrderId: String(incompleteOrderId) } : {}),
    name: 'Test customer — not a real order', phoneNo: '01800000000', shippingAddress: 'Test address',
    paymentType: 'cash_on_delivery', paymentStatus: 'unpaid', orderStatus: 1, subTotal: 300, discount: 50,
    deliveryCharge: 60, grandTotal: 310, adminNote, manualOrderSource: 'phone', orderFrom: 'Phone',
    orderedItems: [{ _id: String(productId), name: 'পরীক্ষার বই — প্রকৃত অর্ডার নয়', quantity, regularPrice: 300, salePrice: 250, unitPrice: 250 }],
  });
  const J = await incomplete('Asked to call after 5pm');
  await orderService.updateIncompleteOrderByAdmin(String(J), { adminNote: 'Call after 6pm' }, rahim);
  assert.equal(nameOf((await get(Incomplete, J)).adminNoteBy), 'Rahim Sales');
  const created = (await orderService.addOrderAdmin(sumi, payload(J, 'Call after 6pm'))).data;
  const convertedJ = await waitFor(async () => { const r = await get(Incomplete, J); return r.convertedBy && r; }, 'conversion attribution');
  assert.equal(convertedJ.status, 'converted');
  assert.equal(nameOf(convertedJ.convertedBy), 'Sumi Sales');
  order = await get(Order, created._id);
  assert.equal(nameOf(order.adminNoteBy), 'Rahim Sales', 'A carried-over note keeps its author');
  assert.equal(nameOf(order.staffCredit.incomplete), 'Sumi Sales');
  assert.equal(String(order.staffCredit.incomplete.incompleteOrderId), String(J));
  assert.deepEqual(order.staffCredit.items, { base: 1 }, 'Same books as the cart: nothing extra');
  assert.equal((await activities({ action: 'incomplete_converted', target: J })).length, 0, 'A conversion scores only when its parcel is sent');
  await orderService.sendToCourier(String(created._id), sumi);
  const conversion = (await activities({ action: 'incomplete_converted', target: J }))[0];
  assert.equal(conversion.adminName, 'Sumi Sales');
  assert.equal(String(conversion.creditedOrder), String(created._id));
  assert.equal((await activities({ action: 'extra_items', target: created._id })).length, 0);
  const again = (await orderService.addOrderAdmin(karim, payload(J, 'Call after 6pm'))).data;
  await waitFor(async () => (await get(Incomplete, J)).orderId === again.orderId, 'second conversion bookkeeping');
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal((await activities({ action: 'incomplete_converted', target: J })).length, 1, 'A second Add Order is not a second conversion');
  assert.equal(nameOf((await get(Incomplete, J)).convertedBy), 'Sumi Sales');
  const M = await incomplete('Original note');
  const fromM = (await orderService.addOrderAdmin(rahim, payload(M, 'Original note, edited'))).data;
  await waitFor(async () => (await get(Incomplete, M)).convertedBy, 'conversion of M');
  assert.equal(nameOf((await get(Order, fromM._id)).adminNoteBy), 'Rahim Sales', 'An edited note belongs to the converter');
  const manual = (await orderService.addOrderAdmin(karim, payload(null, 'VIP customer'))).data;
  assert.equal(nameOf((await get(Order, manual._id)).adminNoteBy), 'Karim Admin');
  const forged = (await orderService.addOrderAdmin(karim, { ...payload(null, ''), courierSentBy: { name: 'Forged' }, adminNoteBy: { name: 'Forged' } })).data;
  order = await get(Order, forged._id);
  assert.equal(order.courierSentBy, undefined);
  assert.equal(order.adminNoteBy, undefined);

  // 7b. Extra books: counted against what the customer chose, for whoever added them, when sent.
  const K = await incomplete('');
  const fromK = (await orderService.addOrderAdmin(rahim, payload(K, '', 3))).data;
  order = await get(Order, fromK._id);
  assert.equal(order.staffCredit.items.base, 1);
  assert.equal(nameOf(order.staffCredit.items.by), 'Rahim Sales', 'The converter added two books on the call');
  assert.equal((await activities({ target: fromK._id })).length, 0, 'Nothing scores before the parcel is sent');
  await orderService.sendToCourier(String(fromK._id), karim);
  const extraK = (await activities({ action: 'extra_items', target: fromK._id }))[0];
  assert.equal(extraK.adminName, 'Rahim Sales', 'Extra books go to the caller, not the sender');
  assert.equal(extraK.quantity, 2);
  assert.equal((await activities({ action: 'courier_sent', target: fromK._id }))[0].adminName, 'Karim Admin');
  assert.equal((await activities({ action: 'incomplete_converted', target: K }))[0].adminName, 'Rahim Sales');
  const items = (quantity, extra = []) => [{ _id: String(productId), name: 'পরীক্ষার বই — প্রকৃত অর্ডার নয়', quantity, regularPrice: 300, salePrice: 250, unitPrice: 250 }, ...extra];
  const gift = { _id: String(new mongoose.Types.ObjectId()), name: 'উপহার নোটবুক', quantity: 1, regularPrice: 0, salePrice: 0, unitPrice: 0, orderType: 'gift', isGift: true };
  const W = await seed();
  await orderService.updateOrderByAdmin(String(W._id), { adminNote: 'Will call' }, karim);
  await orderService.updateOrderByAdmin(String(W._id), { orderedItems: items(2, [gift]) }, sumi);
  await orderService.updateOrderByAdmin(String(W._id), { adminNote: 'Called, added one' }, karim);
  order = await get(Order, W);
  assert.equal(order.staffCredit.items.base, 1, 'The website order as placed is the customer\'s choice');
  assert.equal(nameOf(order.staffCredit.items.by), 'Sumi Sales');
  await orderService.sendToCourier(String(W._id), karim);
  assert.equal((await activities({ action: 'extra_items', target: W._id }))[0].quantity, 1, 'A free gift is not an extra book');
  assert.equal((await activities({ action: 'extra_items', target: W._id }))[0].adminName, 'Sumi Sales');
  const X = await seed();
  await orderService.updateOrderByAdmin(String(X._id), { orderedItems: items(3) }, rahim);
  await orderService.updateOrderByAdmin(String(X._id), { orderedItems: items(1) }, karim);
  await orderService.sendToCourier(String(X._id), karim);
  assert.equal((await activities({ action: 'extra_items', target: X._id })).length, 0, 'Books added and removed again do not count');
  const X2 = await seed({ orderedItems: [{ _id: productId, name: 'পরীক্ষার বই — প্রকৃত অর্ডার নয়', quantity: 2, regularPrice: 300, salePrice: 250 }] });
  await orderService.updateOrderByAdmin(String(X2._id), { orderedItems: items(1) }, karim);
  await orderService.updateOrderByAdmin(String(X2._id), { orderedItems: items(2) }, rahim);
  await orderService.sendToCourier(String(X2._id), karim);
  assert.equal((await activities({ action: 'extra_items', target: X2._id })).length, 0, 'Putting back a book the customer chose is not extra');
  const Y = await seed();
  await orderService.updateOrderById(String(Y._id), { orderedItems: items(4) }, token(rahim));
  await orderService.updateOrderById(String(Y._id), { staffCredit: { items: { base: 0, by: { _id: sumi._id, name: 'Forged' } } } });
  order = await get(Order, Y);
  assert.equal(nameOf(order.staffCredit.items.by), 'Rahim Sales', 'Request bodies cannot set the credit');
  assert.equal(order.staffCredit.items.base, 1);
  assert.equal((await activities({ target: Y._id })).length, 0, 'An order that is never sent (e.g. cancelled) never scores');
  const Y2 = await seed();
  await orderService.updateOrderById(String(Y2._id), { orderedItems: items(3) });
  await orderService.sendToCourier(String(Y2._id), karim);
  assert.equal((await activities({ action: 'extra_items', target: Y2._id })).length, 0, 'No staff identity, no extra-book credit');
  await orderService.updateOrderById(String(Y._id), { orderedItems: items(5) }, token(sumi));
  await orderService.sendToCourier(String(Y._id), karim);
  const extraY = (await activities({ action: 'extra_items', target: Y._id }))[0];
  assert.deepEqual([extraY.adminName, extraY.quantity], ['Sumi Sales', 4], 'The last staff member to add books gets them');

  // 7c. Customer Manager "Create order": 5 points when the parcel is sent, no extra books on top.
  const crmOrder = (await orderService.addAiAssistOrderAdmin(rahim, {
    name: 'Test customer — not a real order', phoneNo: '01900000000', shippingAddress: 'Test address', paymentType: 'cash_on_delivery',
    paymentStatus: 'unpaid', deliveryCharge: 60, manualOrderRequestId: 'crm-' + crypto.randomBytes(10).toString('hex'),
    cartData: [{ product: String(productId), selectedQty: 2 }],
  }, 'phone', 'crm')).data;
  order = await get(Order, crmOrder._id);
  assert.equal(nameOf(order.staffCredit.crm), 'Rahim Sales');
  await orderService.updateOrderByAdmin(String(crmOrder._id), { orderedItems: items(4) }, sumi);
  assert.equal((await activities({ target: crmOrder._id })).length, 0);
  await orderService.sendToCourier(String(crmOrder._id), sumi);
  assert.deepEqual((await activities({ target: crmOrder._id, action: { $ne: 'processing_moved' } })).map((a) => [a.action, a.adminName]).sort(), [['courier_sent', 'Sumi Sales'], ['crm_converted', 'Rahim Sales']]);
  assert.equal((await activities({ action: 'extra_items', target: crmOrder._id })).length, 0, 'No extra books on top of a Customer Manager order');
  const aiOrder = (await orderService.addAiAssistOrderAdmin(sumi, {
    name: 'Test customer — not a real order', phoneNo: '01900000001', shippingAddress: 'Test address', paymentType: 'cash_on_delivery',
    paymentStatus: 'unpaid', deliveryCharge: 60, cartData: [{ product: String(productId), selectedQty: 1 }],
  })).data;
  assert.equal((await get(Order, aiOrder._id)).staffCredit, undefined, 'Other staff-entered orders are not Customer Manager orders');

  // 8. Row labels for the order page.
  let attribution = (await staff.attribution([String(A._id), String(created._id), String(I._id), 'not-an-id'], 'order')).data;
  assert.deepEqual(Object.keys(attribution).sort(), [String(A._id), String(created._id), String(I._id)].sort());
  assert.equal(attribution[String(A._id)].courierSentBy.name, 'Rahim Sales');
  assert.equal(attribution[String(A._id)].courierSentBy.provider, 'Steadfast Courier');
  assert.equal(attribution[String(created._id)].courierSentBy.name, 'Sumi Sales');
  assert.equal(attribution[String(created._id)].adminNoteBy.name, 'Rahim Sales');
  assert.equal(attribution[String(A._id)].courierSentBy._id, undefined, 'Admin IDs are not exposed');
  attribution = (await staff.attribution([String(J)], 'incomplete')).data[String(J)];
  assert.equal(attribution.convertedBy.name, 'Sumi Sales');
  assert.equal(attribution.adminNoteBy.name, 'Rahim Sales');
  await assert.rejects(staff.attribution(new Array(201).fill(String(A._id)), 'order'), (error) => error.status === 400);
  await assert.rejects(staff.attribution('nope', 'order'), (error) => error.status === 400);

  // 9. Performance and points.
  await Activity.collection.insertOne({ action: 'processing_moved', target: new mongoose.Types.ObjectId(), admin: new mongoose.Types.ObjectId(rahim._id), adminName: 'Rahim Sales', adminRole: 'salesman', toStatus: 2, createdAt: new Date(Date.now() - 40 * 86400000) });
  const today = new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
  let report = (await staff.performance({}, owner)).data;
  assert.equal(report.from, today);
  assert.equal(report.scope, 'all');
  assert.equal(report.canEditPoints, true);
  assert.equal(report.pointsAreDefault, true);
  assert.deepEqual(report.points, { courierSent: 1, incompleteConverted: 10, crmConverted: 5, extraItems: 3 });
  const pick = (r) => r.rows.map((x) => [x.name, x.courierSent, x.incompleteConverted, x.crmConverted, x.extraItems, x.points]);
  // Parcels, conversions (scored at send), Customer Manager orders, extra books; moves no longer score.
  assert.deepEqual(pick(report), [
    ['Sumi Sales', 2, 1, 0, 5, 27],
    ['Rahim Sales', 1, 1, 1, 2, 22],
    ['Karim Admin', 6, 0, 0, 0, 6],
    ['Owner Hasan', 1, 0, 0, 0, 1],
    ['editor-only', 0, 0, 0, 0, 0],
  ]);
  const { courierSent, incompleteConverted, crmConverted, extraItems, points } = report.totals;
  assert.deepEqual({ courierSent, incompleteConverted, crmConverted, extraItems, points }, { courierSent: 10, incompleteConverted: 2, crmConverted: 1, extraItems: 7, points: 56 });
  assert.ok(report.rows.find((r) => r.name === 'Karim Admin').processingMoved > 0, 'Moves are still recorded');
  assert.equal(report.rows.some((r) => r.name === 'Old Staff'), false, 'Disabled accounts without activity are hidden');
  const fortyDaysAgo = new Date(Date.now() + 6 * 3600000 - 45 * 86400000).toISOString().slice(0, 10);
  report = (await staff.performance({ from: fortyDaysAgo, to: today }, owner)).data;
  assert.equal(report.rows.find((r) => r.name === 'Rahim Sales').processingMoved, 3, 'Older activity appears in a wider range');
  report = (await staff.performance({ from: today, to: today }, rahim)).data;
  assert.equal(report.scope, 'self');
  assert.equal(report.canEditPoints, false);
  assert.deepEqual(pick(report), [['Rahim Sales', 1, 1, 1, 2, 22]], 'Sales staff see only their own score');
  for (const bad of [{ from: '2026-02-30' }, { from: '2026-13-01' }, { from: 'today' }, { from: today, to: '2020-01-01' }, { from: '2024-01-01', to: today }]) {
    await assert.rejects(staff.performance(bad, owner), (error) => error.status === 400, JSON.stringify(bad));
  }
  const valid = { courierSent: 1, incompleteConverted: 1, crmConverted: 1, extraItems: 1 };
  for (const bad of [{ ...valid, courierSent: -1 }, { ...valid, extraItems: 1.5 }, { ...valid, crmConverted: '5' }, { courierSent: 1, incompleteConverted: 1, crmConverted: 1 }, { ...valid, incompleteConverted: 1001 }]) {
    await assert.rejects(staff.savePoints(bad, owner), (error) => error.status === 400, JSON.stringify(bad));
  }
  await staff.savePoints({ courierSent: 3, incompleteConverted: 20, crmConverted: 1, extraItems: 2, processingMoved: 50 }, owner);
  report = (await staff.performance({}, owner)).data;
  assert.equal(report.pointsAreDefault, false);
  assert.equal(report.pointsUpdatedBy, 'Owner Hasan');
  assert.deepEqual(report.rows.slice(0, 2).map((r) => [r.name, r.points]), [['Sumi Sales', 36], ['Rahim Sales', 28]], 'New points recalculate the period');
  assert.equal(report.points.processingMoved, undefined, 'Moves cannot be given points again');

  // 10. HTTP: guards, controller wiring and page injection.
  assert.equal((await call('POST', '/api/staff-activity/attribution', null, { ids: [] })).status, 401);
  assert.equal((await call('GET', '/api/staff-activity/performance', null)).status, 401);
  assert.equal((await call('GET', '/api/staff-activity/performance', jwt.sign(owner, 'not-the-secret'))).status, 401);
  let response = await call('POST', '/api/staff-activity/attribution', rahim, { ids: [String(A._id)], kind: 'order' });
  assert.equal(response.status, 200);
  assert.equal(response.body.data[String(A._id)].courierSentBy.name, 'Rahim Sales');
  response = await call('GET', '/api/staff-activity/performance?from=' + today + '&to=' + today, sumi);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.rows.map((r) => r.name), ['Sumi Sales']);
  assert.equal((await call('PUT', '/api/staff-activity/points', sumi, { courierSent: 99, incompleteConverted: 99, crmConverted: 99, extraItems: 99 })).status, 401, 'Sales staff cannot change points');
  assert.equal((await call('PUT', '/api/staff-activity/points', editor, { courierSent: 99, incompleteConverted: 99, crmConverted: 99, extraItems: 99 })).status, 401);
  response = await call('PUT', '/api/staff-activity/points', karim, { courierSent: 1, incompleteConverted: 10, crmConverted: 5, extraItems: 3 });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.updatedByName, 'Karim Admin');
  const P = await seed();
  assert.equal((await call('PUT', '/api/order/update/' + P._id, karim, { adminNote: 'Through HTTP' })).status, 200);
  assert.equal(nameOf((await get(Order, P)).adminNoteBy), 'Karim Admin', 'The unguarded update route reads the administrator header');
  response = await call('PUT', '/api/order/update/' + P._id, null, { adminNote: 'No login' });
  assert.equal(response.status, 401, 'A note change without a login is refused over HTTP');
  assert.match(response.body.message, /Login expired/);
  assert.equal((await get(Order, P)).adminNote, 'Through HTTP');
  assert.equal((await call('POST', '/api/order/send-to-courier/' + P._id, sumi)).status, 201);
  assert.equal(nameOf((await get(Order, P)).courierSentBy), 'Sumi Sales');
  const Q = await seed();
  assert.equal((await call('PUT', '/api/order/change-status/' + Q._id, rahim, { orderStatus: 6 })).status, 200);
  assert.equal((await activities({ target: Q._id }))[0].adminName, 'Rahim Sales');
  const R = await incomplete('');
  assert.equal((await call('PUT', '/api/order/update-incomplete-order-admin/' + R, karim, { adminNote: 'Busy, retry' })).status, 200);
  assert.equal(nameOf((await get(Incomplete, R)).adminNoteBy), 'Karim Admin');
  const ordersPage = (await call('GET', '/upload/static/custom-orders.html', null, null, true)).body;
  assert.equal(ordersPage.split('id="navStaffPerformance"').length, 2, 'One Staff Performance link');
  assert.match(ordersPage, /window\.editAdminNote[^]*r\.status === 401[^]*Log in again, then press Save on the note[^]*!d\.ok/, 'A refused note save asks for a login, not "Note saved"');
  assert.match(ordersPage, /id="navCustomerManager"[^]*id="navStaffPerformance"/);
  assert.equal(ordersPage.split('id="ab-staff-attribution"').length, 2);
  assert.ok(ordersPage.indexOf('id="ab-staff-attribution"') > ordersPage.indexOf("var isIncompleteView"), 'Labels load after the page script');
  assert.ok(ordersPage.lastIndexOf('</body>') > ordersPage.indexOf('id="ab-staff-attribution"'));
  const performancePage = await call('GET', '/upload/static/staff-performance.html', null, null, true);
  assert.equal(performancePage.status, 200);
  assert.match(performancePage.body, /<title>Staff Performance · Amolbooks<\/title>/);

  // 11. One sidebar menu on every custom admin page.
  const menu = (page, navClass) => {
    const nav = page.match(new RegExp('<nav class="' + navClass + '">([\\s\\S]*?)</nav>'))[1];
    return [...nav.matchAll(/<(div|a)\b([^>]*)>(?:<i class="fas ([\w-]+)"><\/i> )?([^<]*)<\/(?:div|a)>/g)].map(
      ([, tag, attrs, icon, text]) => [tag, (attrs.match(/href="([^"]*)"/) || [])[1] || '', icon || '', text.trim(), /data-salesman-hidden/.test(attrs)].join('|')
    );
  };
  const expected = menu(ordersPage, 'sidebar-nav');
  assert.ok(expected.length >= 15, 'Orders page menu comes from the shared list');
  for (const label of ['Customer Manager', 'Staff Performance', 'Customer Searches', 'Book Gift Offers', 'Profit Dashboard', 'Import WooCommerce', 'Stock Management']) {
    assert.ok(expected.some((entry) => entry.split('|')[3] === label), label + ' is in the menu');
  }
  assert.equal(ordersPage.split('class="nav-item').length - 1, expected.filter((entry) => entry.startsWith('a|')).length, 'No leftover hand-made links');
  for (const [file, active] of [['customer-manager.html', 'Customer Manager'], ['staff-performance.html', 'Staff Performance'], ['search-insights.html', 'Customer Searches'], ['book-gift-offers.html', 'Book Gift Offers'], ['profit-dashboard.html', 'Profit Dashboard'], ['import-woo-orders.html', 'Import WooCommerce']]) {
    const { status, body } = await call('GET', '/upload/static/' + file, null, null, true);
    assert.equal(status, 200, file);
    assert.deepEqual(menu(body, 'ab-sb-nav'), expected, file + ' shows the same menu as the orders page');
    assert.equal(body.split('class="ab-sb"').length, 2, file + ' has one shared sidebar');
    assert.equal(body.split('<aside').length - 1, file === 'profit-dashboard.html' ? 2 : 1, file + ' has no second menu');
    assert.match(body, new RegExp('class="ab-sb-item[^"]* active"[^>]*aria-current="page"><i class="fas [\\w-]+"></i> ' + active + '<'), file + ' highlights itself');
    assert.equal(body.match(/<aside class="ab-sb"[\s\S]*?<\/aside>/)[0].split(' active"').length, 2, file + ' highlights one item');
    assert.ok(body.includes('font-awesome/6.5.0'), file + ' loads the menu icons');
    assert.ok(body.indexOf('id="ab-sb-style"') < body.indexOf('</head>'));
    assert.ok(!/<aside\b[^>]*class="(sidebar|nav)"|Orders List \(Angular\)|Custom Orders<|☷|AB_ADMIN_SIDEBAR/.test(body), file + ' has no old menu');
  }

  await Points.deleteMany({});
  console.log('Staff activity: Steadfast sender, status moves, note authors, incomplete conversions and Customer Manager orders scored at send, extra books, once-only points, date ranges, role scopes, points settings, HTTP guards, order-page injection and one shared sidebar on every admin page pass');

  if (serve) {
    console.log('\nSandbox (throwaway local DB) at http://localhost:3000/upload/static/custom-orders.html');
    console.log('Staff Performance: http://localhost:3000/upload/static/staff-performance.html');
    for (const [label, who] of [['Owner (super_admin)', owner], ['Rahim (salesman)', rahim]]) {
      console.log(label + " token: localStorage.setItem('co_admin_token','" + token(who, { expiresIn: '8h' }) + "')");
    }
    const stop = async () => { await app.close(); await connection.dropDatabase(); await connection.close(); process.exit(0); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    return;
  }
  await app.close();
  await connection.dropDatabase();
  await connection.close();
})().catch(async (error) => {
  console.error(error);
  if (app) await app.close().catch(() => {});
  if (connection && connection.readyState === 1) {
    await connection.dropDatabase();
    await connection.close();
  }
  process.exitCode = 1;
});
