// Customer Manager list/redesign check: delivered-only customers, order and courier
// ratios, every filter, tab counts, auto follow-up dates, export permission, cache
// freshness and a production-size speed benchmark. Throwaway database on the local
// mongod only; nothing is sent anywhere. Run after `npm run build` in api/.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const lib = createRequire(path.join(root, 'api/package.json'));
lib('reflect-metadata');
const mongoose = lib('mongoose');
const { CustomerManagerService, followUpDate, dhakaToday } = require('../api/dist/pages/customer-manager/customer-manager.service');
const { CustomerContactSchema } = require('../api/dist/pages/customer-manager/customer-manager.schema');
const { OrderSchema } = require('../api/dist/schema/order.schema');

const uri = 'mongodb://127.0.0.1:27017/amol_crm_redesign_test_' + crypto.randomBytes(6).toString('hex');
assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27017\/amol_crm_redesign_test_[a-f0-9]+$/);
const day = 86400000;
let connection;

(async () => {
  const page = fs.readFileSync(path.join(root, 'gtm-snippets/customer-manager.html'), 'utf8');
  new vm.Script(page.match(/<script>([\s\S]*?)<\/script>/)[1], { filename: 'customer-manager.html' });
  assert.ok(page.includes('<!-- AB_ADMIN_SIDEBAR -->'), 'Uses the shared sidebar');
  assert.ok(!/class="drawer"|has-detail/.test(page), 'No side panel; details open in a popup');
  assert.ok(page.includes('<dialog class="cm-modal"'), 'Customer popup');
  assert.ok(page.includes("'not_interested', 'Not interested'"), 'Not interested outcome');

  connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  const Orders = connection.model('Order', OrderSchema);
  const Contacts = connection.model('CustomerContact', CustomerContactSchema);
  const Products = connection.model('Product', new mongoose.Schema({}, { strict: false }));
  await Promise.all([Orders.init(), Contacts.init()]);
  const service = new CustomerManagerService(Orders, Contacts, Products, {}, {});
  const owner = { _id: new mongoose.Types.ObjectId(), username: 'owner', role: 'super_admin' };
  const sales = { _id: new mongoose.Types.ObjectId(), username: 'sales', role: 'salesman' };
  const catalogBook = new mongoose.Types.ObjectId();
  await Products.collection.insertOne({ _id: catalogBook, name: 'Catalog Seerah', category: { name: 'Seerah' } });
  let n = 0;
  const order = (phone, ageDays, extra = {}) => ({
    orderId: 'T' + ++n, name: 'Customer ' + phone.slice(-3), phoneNo: phone, shippingAddress: 'Road ' + n, city: 'Dhaka',
    paymentType: 'cash_on_delivery', paymentStatus: 'paid', subTotal: 500, discount: 0, deliveryCharge: 60, grandTotal: 560,
    orderStatus: 5, createdAt: new Date(Date.now() - ageDays * day),
    orderedItems: [{ _id: new mongoose.Types.ObjectId(), name: 'Fixture Book', quantity: 1, category: { name: 'Islamic' } }], ...extra,
  });
  await Orders.collection.insertMany([
    // A: 3 delivered (one via courier status only), 1 cancelled, 1 returned, 1 pending → 3/6 = 50%.
    order('01711000001', 5, { grandTotal: 1200, fraudChecker: { overall: { total: 20, delivered: 18, returned: 2, success_ratio: 90 } } }),
    order('+8801711000001', 40, { orderStatus: 2, courierStatus: { status: 'delivered' } }),
    order('০১৭১১০০০০০১', 100),
    order('01711000001', 3, { orderStatus: 6 }),
    order('01711000001', 2, { orderStatus: 2, courierStatus: { status: 'returned' } }),
    order('01711000001', 1, { orderStatus: 1 }),
    // B: one delivered (book with no saved category → catalog fallback), older courier check than its latest.
    order('01811000002', 70, { grandTotal: 300, orderedItems: [{ _id: catalogBook, name: 'Catalog Seerah', quantity: 1 }], fraudChecker: { overall: { total: 5, delivered: 1, returned: 4, success_ratio: 20 } } }),
    order('01811000002', 65, { orderStatus: 6, fraudChecker: { overall: { total: 6, delivered: 1, returned: 5, success_ratio: 16.7 } } }),
    // C: only cancelled/pending orders → not a delivered customer.
    order('01911000003', 4, { orderStatus: 6 }),
    order('01911000003', 2, { orderStatus: 1 }),
    // D: partial delivery only → excluded.
    order('01611000004', 4, { orderStatus: 2, courierStatus: { status: 'partial_delivered' } }),
    // Invalid phone → excluded.
    order('12345', 4),
  ]);

  let list = (await service.list({}, owner)).data;
  assert.deepEqual(list.rows.map((r) => r.phone).sort(), ['01711000001', '01811000002'], 'Only customers with a delivered order');
  const A = list.rows.find((r) => r.phone === '01711000001'), B = list.rows.find((r) => r.phone === '01811000002');
  assert.deepEqual([A.orderCount, A.totalOrderCount, A.failedCount, A.ratio, A.totalSpent], [3, 6, 2, 50, 2320]);
  assert.deepEqual(A.courierRatio, { total: 20, delivered: 18, returned: 2, ratio: 90 });
  assert.deepEqual(B.courierRatio, { total: 6, delivered: 1, returned: 5, ratio: 16.7 }, 'Latest saved courier check wins');
  assert.deepEqual([B.orderCount, B.totalOrderCount, B.failedCount, B.ratio], [1, 2, 1, 50]);
  assert.equal(new Date(A.lastPurchase).getTime() > Date.now() - 6 * day, true, 'Last purchase is the latest delivered order');
  assert.deepEqual(list.summary, { customers: 2, followedUp: 0, never: 2, due: 0, repeat: 1, spent: 2620 });
  assert.deepEqual(list.followUpRules, { no_answer: 1, interested: 2, follow_up: 7, ordered: 30, not_interested: 90 });

  const total = async (q, who = owner) => (await service.list(q, who)).data.total;
  const iso = (ageDays) => new Date(Date.now() + 6 * 3600000 - ageDays * day).toISOString().slice(0, 10);
  assert.equal(await total({ q: 'customer 001' }), 1);
  assert.equal(await total({ q: '1811' }), 1, 'Phone digits');
  assert.equal(await total({ q: '০১৮১১' }), 1, 'Bengali phone digits');
  assert.equal(await total({ q: '[' }), 0);
  assert.equal(await total({ product: 'catalog' }), 1);
  assert.equal(await total({ category: 'seerah' }), 1, 'Catalog category fallback');
  assert.equal(await total({ category: 'islamic' }), 1);
  assert.equal(await total({ lastFrom: iso(10), lastTo: iso(0) }), 1);
  assert.equal(await total({ lastFrom: iso(80), lastTo: iso(60) }), 1);
  assert.equal(await total({ lastTo: iso(200) }), 0);
  assert.equal(await total({ days: 30 }), 1, 'Older than N days (kept for old links)');
  assert.equal(await total({ minSpent: 1000 }), 1);
  assert.equal(await total({ maxSpent: 1000 }), 1);
  assert.equal(await total({ minOrderValue: 1000 }), 1);
  assert.equal(await total({ frequency: 'repeat' }), 1);
  assert.equal(await total({ frequency: 'once' }), 1);
  assert.equal(await total({ ratio: 'mid' }), 2);
  assert.equal(await total({ ratio: 'good' }), 0);
  assert.equal(await total({ ratio: 'low' }), 0);
  assert.equal((await service.list({ sort: 'spent' }, owner)).data.rows[0].phone, '01711000001');
  assert.equal((await service.list({ sort: 'recent' }, owner)).data.rows[0].phone, '01711000001');
  for (const bad of [{ minSpent: '-1' }, { lastFrom: '2026-02-30' }, { lastTo: 'today' }, { frequency: 'often' }, { ratio: 'great' }, { status: 'maybe' }])
    await assert.rejects(service.list(bad, owner), (error) => error.status === 400, JSON.stringify(bad));
  await assert.rejects(service.list({ export: '1' }, sales), (error) => error.status === 403, 'Sales staff cannot export');
  assert.equal((await service.list({ export: '1' }, owner)).data.rows.length, 2);
  assert.equal((await service.list({ pageSize: '50' }, owner)).data.pageSize, 50);
  assert.equal((await service.list({ pageSize: '7' }, owner)).data.pageSize, 20);

  // Outcomes and automatic follow-up dates.
  assert.equal(followUpDate('interested', '2026-10-31'), '2026-11-02');
  assert.equal(followUpDate('not_interested', '2026-10-31'), '2027-01-29');
  assert.equal(followUpDate('dont_contact', '2026-10-31'), '');
  const save = (phone, body) => service.save(phone, { channel: 'call', note: '', ...body }, sales);
  await save('01711000001', { outcome: 'not_interested' });
  let history = (await service.detail('01711000001')).data.history;
  assert.equal(history[0].outcome, 'not_interested');
  assert.equal(history[0].nextFollowUp, followUpDate('not_interested'), 'Omitted date → automatic');
  await save('01711000001', { outcome: 'no_answer', nextFollowUp: '' });
  assert.equal((await service.detail('01711000001')).data.history[0].nextFollowUp, '', 'Empty date → no follow-up');
  await save('01711000001', { outcome: 'interested', nextFollowUp: dhakaToday() });
  await save('01811000002', { outcome: 'dont_contact', nextFollowUp: '2030-01-01' });
  assert.equal((await service.detail('01811000002')).data.history[0].nextFollowUp, '', "Don't contact never schedules");
  list = (await service.list({}, owner)).data;
  assert.deepEqual(list.tabs, { all: 1, never: 0, due: 1, contacted: 2, interested: 1, not_interested: 0, no_answer: 0, follow_up: 0, ordered: 0, dont_contact: 1 });
  assert.deepEqual(list.rows.map((r) => r.phone), ['01711000001'], "Default list hides Don't contact");
  assert.equal(await total({ status: 'due' }), 1);
  assert.equal(await total({ status: 'dont_contact' }), 1);
  assert.equal(await total({ status: 'contacted' }), 2);
  assert.equal(await total({ status: 'never' }), 0);
  assert.equal((await service.list({ q: '1811' }, owner)).data.summary.customers, 1, 'Cards follow the filters');

  // Detail: every order with its status for the popup; delivered list kept for repeat orders.
  const detail = (await service.detail('01711000001')).data;
  assert.equal(detail.allOrders.length, 6);
  assert.equal(detail.orders.length, 3);
  assert.deepEqual([detail.failedCount, detail.ratio], [2, 50]);
  assert.equal(detail.courierRatio.ratio, 90);
  assert.equal(detail.allOrders.filter((o) => o.crmFailed).length, 2);
  assert.equal(detail.allOrders.some((o) => 'fraudChecker' in o), false);

  // Freshness: a new delivered order appears immediately; refresh rebuilds on demand.
  await Orders.collection.insertOne(order('01511000005', 1));
  assert.equal(await total({}), 2, 'New customer listed after an order is added');
  await Orders.collection.updateOne({ phoneNo: '01911000003', orderStatus: 1 }, { $set: { orderStatus: 5 } });
  assert.equal(await total({ q: '1911' }), 0, 'Status-only changes wait for the background refresh');
  assert.equal(await total({ q: '1911', refresh: '1' }), 1, 'Refresh picks them up at once');
  assert.deepEqual((await service.searchPurchasedBooks('catalog')).data, [{ name: 'Catalog Seerah' }]);

  // Speed at production size: ~15,000 orders from 10,000 phones.
  await connection.dropDatabase();
  await Promise.all([Orders.init(), Contacts.init()]);
  const docs = [];
  for (let i = 0; i < 15000; i++) {
    const phone = '017' + String(10000000 + (i % 10000) * 3).padStart(8, '0');
    docs.push(order(phone, i % 400, { orderStatus: i % 7 === 0 ? 6 : 5, orderedItems: [{ _id: new mongoose.Types.ObjectId(), name: 'Book ' + (i % 300), quantity: 1, category: { name: 'Cat ' + (i % 12) } }] }));
  }
  await Orders.collection.insertMany(docs);
  await Contacts.insertMany(Array.from({ length: 2000 }, (_, i) => ({ phone: '017' + String(10000000 + i * 3).padStart(8, '0'), outcome: 'follow_up', channel: 'call', note: '', nextFollowUp: '2026-01-01', contactedBy: sales._id, contactedByName: 'sales' })));
  const fresh = new CustomerManagerService(Orders, Contacts, Products, {}, {});
  const timed = async (q) => { const start = process.hrtime.bigint(); const result = await fresh.list(q, owner); return { ms: Number(process.hrtime.bigint() - start) / 1e6, total: result.data.total }; };
  const first = await timed({});
  const cached = [];
  for (const q of [{}, { page: '3' }, { status: 'due' }, { q: 'customer 12' }, { product: 'book 12' }, { category: 'cat 3', minSpent: '1000' }, { sort: 'spent', pageSize: '100' }]) cached.push(await timed(q));
  const worst = Math.max(...cached.map((r) => r.ms));
  assert.equal(first.total, new Set(docs.filter((d) => d.orderStatus === 5).map((d) => d.phoneNo)).size, 'Every phone with a delivered order');
  assert.ok(worst < 250, 'Cached list requests stay fast (' + worst.toFixed(1) + 'ms)');
  console.log('Speed (15,000 orders / 10,000 customers): first build ' + first.ms.toFixed(0) + 'ms, filtered/paged requests ' + Math.min(...cached.map((r) => r.ms)).toFixed(1) + '–' + worst.toFixed(1) + 'ms');
  console.log('Customer Manager redesign: delivered-only customers, order/courier ratios, every filter, tab counts, not-interested + automatic follow-ups, export permission, freshness and popup page pass');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (connection && connection.readyState === 1) {
    await connection.dropDatabase();
    await connection.close();
  }
});
