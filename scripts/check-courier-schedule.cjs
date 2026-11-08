// Future delivery (pages/sales/courier-schedule): schedule, the every-minute send, failures,
// send now, remove, and the Orders page wiring. Throwaway database on the local mongod (never
// the app database); the courier is a stub, so no parcel is booked. Needs `api/dist`.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire, Module } = require('node:module');
const root = path.resolve(__dirname, '..');
process.env.NODE_PATH = [path.join(root, 'api/dist'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
process.env.COURIER_SCHEDULE_DISABLED = '1';
Module._initPaths();
const lib = createRequire(path.join(root, 'api/package.json'));
lib('reflect-metadata');
const mongoose = lib('mongoose');
const { OrderService } = require('../api/dist/pages/sales/order/order.service');
const { StaffActivityService } = require('../api/dist/pages/staff-activity/staff-activity.service');
const { StaffActivitySchema, StaffPointsSchema, StaffCallSchema } = require('../api/dist/pages/staff-activity/staff-activity.schema');
const { CourierScheduleService } = require('../api/dist/pages/sales/courier-schedule/courier-schedule.service');
const { UtilsService } = require('../api/dist/shared/utils/utils.service');
const { OrderSchema } = require('../api/dist/schema/order.schema');
const { IncompleteOrderSchema } = require('../api/dist/schema/incomplete-order.schema');

const uri = 'mongodb://127.0.0.1:27017/amol_courier_schedule_test_' + crypto.randomBytes(6).toString('hex');
assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27017\/amol_courier_schedule_test_[a-f0-9]+$/, 'Only a throwaway local database is permitted');
const silent = { error() {}, warn() {}, log() {} };
const loose = () => new mongoose.Schema({}, { strict: false });
let connection;

(async () => {
  // Page wiring: tab, popup, actions and the filters that keep scheduled orders out of Processing.
  const page = fs.readFileSync(path.join(root, 'api/upload/static/custom-orders.html'), 'utf8');
  for (const needle of ['id="tab-future"', 'courierSchedule:1', "API + '/api/courier-schedule/set'", "scheduleRequest('cancel'", "scheduleRequest('send-now'",
    "filter['courierSchedule.status'] = { $nin: SCHEDULE_ACTIVE }", "filter['courierSchedule.status'] = { $in: SCHEDULE_ACTIVE }", "{ 'courierSchedule.at': 1 }", 'id="bulkSchedule"']) {
    assert.ok(page.includes(needle), 'Orders page has ' + needle);
  }

  connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  const Order = connection.model('Order', OrderSchema);
  const Incomplete = connection.model('IncompleteOrder', IncompleteOrderSchema);
  const Activity = connection.model('StaffActivity', StaffActivitySchema);
  const Points = connection.model('StaffPoints', StaffPointsSchema);
  const Call = connection.model('StaffCall', StaffCallSchema);
  const Admin = connection.model('Admin', loose());
  const Product = connection.model('Product', loose());
  const Setting = connection.model('Setting', loose());
  const StockMovement = connection.model('StockMovement', loose());
  await Promise.all([Order.init(), Activity.init(), Points.init(), Call.init()]);

  const admin = async (name, role) => {
    const doc = { _id: new mongoose.Types.ObjectId(), username: name.toLowerCase(), role, hasAccess: true, name };
    await Admin.collection.insertOne(doc);
    return { _id: String(doc._id), username: doc.username, role };
  };
  const rahim = await admin('Rahim Sales', 'salesman');
  const sumi = await admin('Sumi Sales', 'salesman');
  await Setting.collection.insertOne({ courierMethods: [{ status: 'active', providerName: 'Steadfast Courier', apiKey: 'test-only', secretKey: 'test-only' }] });

  let courierCalls = 0;
  let courierFails = false;
  let courierDelay = 0;
  const courierService = new Proxy({
    async createOrderWithProvider(_config, payload) {
      courierCalls++;
      if (courierDelay) await new Promise((resolve) => setTimeout(resolve, courierDelay));
      if (courierFails) return { status: 500, message: 'Test courier rejection' };
      return { status: 200, consignment: { consignment_id: 700000 + courierCalls, tracking_code: 'TEST' + courierCalls, status: 'in_review', invoice: payload.invoice } };
    },
  }, { get: (target, key) => target[key] || (async () => ({ status: 404 })) });
  const config = { get: () => 'isolated-courier-schedule-secret' };
  const staff = new StaffActivityService(Activity, Points, Call, Admin, Order, Incomplete, config);
  const orderService = Object.create(OrderService.prototype);
  Object.assign(orderService, {
    orderModel: Order, incompleteOrderModel: Incomplete, adminModel: Admin, productModel: Product, settingModel: Setting,
    stockMovementModel: StockMovement, utilsService: new UtilsService(Product), courierService,
    bulkSmsService: { sentSingleSms() {}, sendOrderAccessOtp() {} }, configService: config, staffActivityService: staff, logger: silent,
  });
  const schedule = new CourierScheduleService(Order, orderService, staff);
  schedule.logger = silent;

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
  const inWeek = new Date(Date.now() + 7 * 864e5);
  const due = (doc) => Order.updateOne({ _id: doc._id }, { $set: { 'courierSchedule.at': new Date(Date.now() - 1000) } });
  const status = (code) => (error) => error?.getStatus?.() === code;

  // 1. Scheduling: rules and the stored stamp.
  const A = await seed();
  await assert.rejects(schedule.schedule({ ids: [String(A._id)], at: new Date(Date.now() - 60000).toISOString() }, rahim), status(400), 'Past time');
  await assert.rejects(schedule.schedule({ ids: [String(A._id)], at: new Date(Date.now() + 100 * 864e5).toISOString() }, rahim), status(400), 'More than 90 days ahead');
  await assert.rejects(schedule.schedule({ ids: ['nope'], at: inWeek.toISOString() }, rahim), status(400), 'No valid order');
  await assert.rejects(schedule.schedule({ ids: [String(A._id)], at: 'soon' }, rahim), status(400), 'Bad date');
  await assert.rejects(schedule.schedule({ ids: [String(A._id)], at: inWeek.toISOString() }, null), status(401), 'No staff login');
  let result = await schedule.schedule({ ids: [String(A._id)], at: inWeek.toISOString() }, rahim);
  assert.deepEqual(result.data.results.map((r) => r.ok), [true]);
  let order = await get(A);
  assert.equal(order.courierSchedule.status, 'scheduled');
  assert.equal(order.courierSchedule.at.getTime(), inWeek.getTime());
  assert.equal(order.courierSchedule.by.name, 'Rahim Sales');
  const later = new Date(Date.now() + 9 * 864e5);
  await schedule.schedule({ ids: [String(A._id)], at: later.toISOString() }, sumi);
  order = await get(A);
  assert.equal(order.courierSchedule.at.getTime(), later.getTime(), 'Changing the date moves it');
  assert.equal(order.courierSchedule.by.name, 'Sumi Sales');
  const booked = await seed({ courierData: { providerName: 'Steadfast Courier', consignmentId: '1' } });
  const cancelled = await seed({ orderStatus: 6 });
  const tried = await seed({ courierBookingStartedAt: new Date() });
  result = await schedule.schedule({ ids: [booked, cancelled, tried].map((d) => String(d._id)), at: inWeek.toISOString() }, rahim);
  assert.deepEqual(result.data.results.map((r) => r.reason), [
    'Already sent to the courier.', 'The order is cancelled.', 'A courier booking was already tried. Check the courier panel.',
  ]);

  // 2. The every-minute run: nothing before its time; at its time one booking, credited to the scheduler.
  await schedule.sendDue();
  assert.equal(courierCalls, 0, 'Not due yet');
  const B = await seed();
  await schedule.schedule({ ids: [String(B._id)], at: inWeek.toISOString() }, rahim);
  await due(B);
  await Promise.all([schedule.sendDue(), schedule.sendDue()]);
  order = await get(B);
  assert.equal(courierCalls, 1, 'Sent once even when two runs overlap');
  assert.equal(order.courierSchedule.status, 'sent');
  assert.ok(order.courierSchedule.sentAt instanceof Date);
  assert.equal(order.courierData.consignmentId, '700001');
  assert.equal(order.courierSentBy.name, 'Rahim Sales', 'Points go to whoever scheduled it');
  assert.equal(order.orderStatus, 2, 'Same as the Send button: the order is confirmed');
  assert.equal((await Activity.find({ target: B._id, action: 'courier_sent' }).lean())[0].adminName, 'Rahim Sales');
  await schedule.sendDue();
  assert.equal(courierCalls, 1, 'A sent order is not sent again');

  // 3. A rejected booking is reported, not retried.
  const C = await seed();
  await schedule.schedule({ ids: [String(C._id)], at: inWeek.toISOString() }, sumi);
  await due(C);
  courierFails = true;
  await schedule.sendDue();
  courierFails = false;
  order = await get(C);
  assert.equal(order.courierSchedule.status, 'failed');
  assert.match(order.courierSchedule.error, /courier did not accept/);
  const callsAfterFailure = courierCalls;
  await schedule.sendDue();
  assert.equal(courierCalls, callsAfterFailure, 'Failed orders wait for staff');
  const retry = await schedule.sendNow({ id: String(C._id) }, rahim);
  assert.equal(retry.success, false, 'The booking marker stops a blind re-booking');
  assert.match(retry.message, /already booked, or processing/);
  await schedule.cancel({ ids: [String(C._id)] });
  assert.equal((await get(C)).courierSchedule, undefined, 'Remove takes it out of Future delivery');

  // 4. Cancelled after scheduling: never sent.
  const D = await seed();
  await schedule.schedule({ ids: [String(D._id)], at: inWeek.toISOString() }, rahim);
  await Order.updateOne({ _id: D._id }, { $set: { orderStatus: 6 } });
  await due(D);
  const callsBefore = courierCalls;
  await schedule.sendDue();
  order = await get(D);
  assert.equal(courierCalls, callsBefore, 'A cancelled order is not booked');
  assert.equal(order.courierSchedule.status, 'failed');

  // 5. Sent by hand before its date: the run just marks it sent.
  const E = await seed();
  await schedule.schedule({ ids: [String(E._id)], at: inWeek.toISOString() }, rahim);
  await orderService.sendToCourier(String(E._id), sumi);
  await due(E);
  const callsManual = courierCalls;
  await schedule.sendDue();
  order = await get(E);
  assert.equal(courierCalls, callsManual, 'No second booking');
  assert.equal(order.courierSchedule.status, 'sent');
  assert.equal(order.courierSentBy.name, 'Sumi Sales');

  // 6. Send now: credited to whoever presses it; only for orders waiting in Future delivery.
  const F = await seed();
  await schedule.schedule({ ids: [String(F._id)], at: inWeek.toISOString() }, rahim);
  const now = await schedule.sendNow({ id: String(F._id) }, sumi);
  assert.equal(now.success, true);
  order = await get(F);
  assert.equal(order.courierSchedule.status, 'sent');
  assert.equal(order.courierSentBy.name, 'Sumi Sales');
  await assert.rejects(schedule.sendNow({ id: String(F._id) }, sumi), status(400), 'Already sent');

  // 7. A send interrupted by a restart is reported after 10 minutes, never resent.
  const G = await seed();
  await Order.updateOne({ _id: G._id }, { $set: { courierSchedule: { at: new Date(Date.now() - 3600e3), status: 'sending', startedAt: new Date(Date.now() - 11 * 60e3) } } });
  const callsStuck = courierCalls;
  await schedule.sendDue();
  order = await get(G);
  assert.equal(order.courierSchedule.status, 'failed');
  assert.match(order.courierSchedule.error, /interrupted/);
  assert.equal(courierCalls, callsStuck);

  // 8. Many due at once: all sent, oldest first.
  const many = [];
  for (let i = 0; i < 5; i++) {
    const doc = await seed();
    await schedule.schedule({ ids: [String(doc._id)], at: inWeek.toISOString() }, rahim);
    await Order.updateOne({ _id: doc._id }, { $set: { 'courierSchedule.at': new Date(Date.now() - (10 - i) * 1000) } });
    many.push(doc);
  }
  await schedule.sendDue();
  const sentAt = [];
  for (const doc of many) {
    const o = await get(doc);
    assert.equal(o.courierSchedule.status, 'sent');
    sentAt.push(o.courierSchedule.sentAt.getTime());
  }
  assert.deepEqual(sentAt, sentAt.slice().sort((a, b) => a - b), 'Oldest due first');

  await connection.dropDatabase();
  await connection.close();
  console.log('Courier schedule: rules, change date, the every-minute send (once, credited to the scheduler), failures reported not retried, cancelled orders skipped, sent-by-hand, send now, interrupted sends, oldest first and the Orders page wiring pass');
})().catch(async (error) => {
  console.error(error);
  try { await connection?.dropDatabase(); await connection?.close(); } catch (_) {}
  process.exit(1);
});
