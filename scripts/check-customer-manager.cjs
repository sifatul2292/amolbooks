// Isolated fixture check. Requires mongod on CRM_TEST_MONGO, never the app database.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const deps = path.join(root, 'api/node_modules');
require(path.join(deps, 'reflect-metadata'));
const mongoose = require(path.join(deps, 'mongoose'));
const { Module, VersioningType, Logger } = require(path.join(
  deps,
  '@nestjs/common'
));
const { NestFactory } = require(path.join(deps, '@nestjs/core'));
const { PassportModule } = require(path.join(deps, '@nestjs/passport'));
const jwt = require(path.join(deps, 'jsonwebtoken'));
const {
  JwtAdminStrategy,
} = require('../api/dist/pages/admin/jwt-admin.strategy');
const {
  CustomerManagerController,
} = require('../api/dist/pages/customer-manager/customer-manager.controller');
const {
  CustomerManagerService,
  normalizeCustomerPhone,
  dhakaToday,
} = require('../api/dist/pages/customer-manager/customer-manager.service');
const {
  CustomerContactSchema,
} = require('../api/dist/pages/customer-manager/customer-manager.schema');
const {
  customerManagerPages,
} = require('../api/dist/pages/customer-manager/customer-manager-pages');
const { OrderService } = require('../api/dist/pages/sales/order/order.service');
const { UtilsService } = require('../api/dist/shared/utils/utils.service');
const { OrderSchema } = require('../api/dist/schema/order.schema');
const secret = 'isolated-customer-manager-fixture-secret';
const uri =
  process.env.CRM_TEST_MONGO ||
  'mongodb://127.0.0.1:27029/customer_manager_fixture';
assert.match(
  uri,
  /^mongodb:\/\/127\.0\.0\.1:27029\/customer_manager_fixture$/,
  'Only the isolated fixture database is permitted'
);
let connection, app, browser;
(async () => {
  assert.equal(normalizeCustomerPhone('+880 1711-123456'), '01711123456');
  assert.equal(normalizeCustomerPhone('০০৮৮০১৭১১১২৩৪৫৬'), '01711123456');
  assert.equal(normalizeCustomerPhone('invalid'), '');
  const html = fs.readFileSync(
    path.join(root, 'gtm-snippets/customer-manager.html'),
    'utf8'
  );
  new Function(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  connection = await mongoose.createConnection(uri).asPromise();
  await connection.dropDatabase();
  const Orders = connection.model('Order', OrderSchema);
  const Products = connection.model(
    'Product',
    new mongoose.Schema({}, { strict: false })
  );
  const Contacts = connection.model('CustomerContact', CustomerContactSchema);
  await Contacts.init();
  const product = new mongoose.Types.ObjectId(),
    adminId = new mongoose.Types.ObjectId();
  await Products.collection.insertOne({
    _id: product,
    name: 'Fixture Book',
    salePrice: 500,
    discountType: 2,
    discountAmount: 50,
    costPrice: 200,
    stock: 50,
    quantity: 50,
    sku: 'CRM-FIXTURE',
    category: [{ name: 'Self development' }],
  });
  const fixture = (phone, amount, age, extra = {}) => ({
    orderId: new mongoose.Types.ObjectId().toString(),
    name: 'Fixture Reader',
    phoneNo: phone,
    shippingAddress: 'House 12, Road 3',
    city: 'Dhaka',
    email: 'fixture@example.test',
    deliveryCharge: 60,
    paymentType: 'cash_on_delivery',
    grandTotal: amount,
    orderStatus: 5,
    createdAt: new Date(Date.now() - age * 86400000),
    orderedItems: [{ _id: product, name: 'Fixture Book', quantity: 1 }],
    ...extra,
  });
  await Orders.collection.insertMany([
    fixture('01711123456', 1000, 70),
    fixture('+880 1711-123456', 2000, 65),
    fixture('০০৮৮০১৭১১১২৩৪৫৬', 500, 90),
    fixture('01811123456', 900, 30, {
      orderStatus: 3,
      courierStatus: { status: 'delivered' },
      name: '<script>bad()</script>',
    }),
    fixture('01711123456', 9999, 1, {
      orderStatus: 6,
      courierStatus: { status: 'delivered' },
    }),
    fixture('01711123456', 9999, 1, { orderStatus: 7 }),
    fixture('01711123456', 9999, 1, { orderStatus: 9 }),
    fixture('01711123456', 9999, 1, {
      courierStatus: { status: 'partial_delivered' },
    }),
    fixture('01711123456', 9999, 1, { orderStatus: 1 }),
    fixture('bad phone', 9999, 1),
  ]);
  await Orders.init();
  const Admins = connection.model(
    'Admin',
    new mongoose.Schema({}, { strict: false })
  );
  const Users = connection.model(
    'User',
    new mongoose.Schema({}, { strict: false })
  );
  const UniqueIds = connection.model(
    'UniqueId',
    new mongoose.Schema({ orderId: Number })
  );
  const StockMovements = connection.model(
    'StockMovement',
    new mongoose.Schema({}, { strict: false })
  );
  await Admins.collection.insertOne({
    _id: adminId,
    username: 'fixture-sales',
    name: 'Fixture Sales',
  });
  const utils = new UtilsService(Products);
  const orderService = Object.create(OrderService.prototype);
  Object.assign(orderService, {
    orderModel: Orders,
    productModel: Products,
    adminModel: Admins,
    userModel: Users,
    uniqueIdModel: UniqueIds,
    stockMovementModel: StockMovements,
    utilsService: utils,
    logger: new Logger('Order fixture'),
  });
  // Exercise actual order persistence/stock methods while suppressing external notifications.
  orderService.sendManualOrderToMeta = async () => {};
  orderService.processOrderBackgroundTasks = async (order) =>
    orderService.decreaseProductStock(order._id, order.orderedItems);
  const service = new CustomerManagerService(
    Orders,
    Contacts,
    Products,
    orderService,
    utils
  );
  class FixtureModule {}
  Module({
    imports: [PassportModule],
    controllers: [CustomerManagerController],
    providers: [
      { provide: CustomerManagerService, useValue: service },
      {
        provide: JwtAdminStrategy,
        useValue: new JwtAdminStrategy({ get: () => secret }),
      },
    ],
  })(FixtureModule);
  app = await NestFactory.create(FixtureModule, { logger: false });
  app.use(customerManagerPages(root));
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  await app.listen(3019, '127.0.0.1');
  const token = (role) =>
    jwt.sign(
      { _id: adminId.toString(), username: 'fixture-sales', role },
      secret,
      { expiresIn: '1h' }
    );
  const call = async (url, role = 'salesman', options = {}) => {
    const response = await fetch('http://127.0.0.1:3019' + url, {
      ...options,
      headers: {
        administrator: role ? token(role) : '',
        'Content-Type': 'application/json',
      },
    });
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await call('/api/customer-manager', null)).status, 401);
  assert.equal((await call('/api/customer-manager', 'editor')).status, 401);
  assert.equal((await call('/api/customer-manager', 'accountant')).status, 401);
  assert.equal(
    (await call('/api/customer-manager/01711123456', 'editor')).status,
    401
  );
  assert.equal(
    (
      await call('/api/customer-manager/01711123456/contacts', 'editor', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    ).status,
    401
  );
  for (const role of ['salesman', 'admin', 'super_admin'])
    assert.equal((await call('/api/customer-manager', role)).status, 200);
  let response = await call('/api/customer-manager');
  assert.equal(response.body.data.summary.customers, 2);
  assert.equal(response.body.data.summary.never, 2);
  const customer = response.body.data.rows.find(
    (r) => r.phone === '01711123456'
  );
  assert.equal(customer.orderCount, 3);
  assert.equal(customer.totalSpent, 3500);
  assert.equal(
    (
      await call(
        '/api/customer-manager?minSpent=3000&frequency=repeat&days=60&product=Fixture&category=Self'
      )
    ).body.data.total,
    1
  );
  assert.equal(
    (await call('/api/customer-manager?minOrderValue=2500')).body.data.total,
    0
  );
  assert.equal(
    (await call('/api/customer-manager?product=doesnotexist')).body.data.total,
    0
  );
  assert.equal((await call('/api/customer-manager?q=%5B')).body.data.total, 0);
  assert.equal((await call('/api/customer-manager?minSpent=oops')).status, 400);
  response = await call('/api/customer-manager/01711123456');
  assert.equal(response.body.data.orders.length, 3);
  assert.equal(response.body.data.history.length, 0);
  const save = (body) =>
    call('/api/customer-manager/01711123456/contacts', 'salesman', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  const entry = {
    outcome: 'follow_up',
    channel: 'call',
    note: 'Fixture note',
    nextFollowUp: dhakaToday(),
    contactedByName: 'FORGED',
  };
  assert.equal((await save(entry)).status, 201);
  let history = (await call('/api/customer-manager/01711123456')).body.data
    .history;
  assert.equal(history[0].contactedByName, 'fixture-sales');
  assert.equal(history[0].contactedBy, adminId.toString());
  assert.equal(
    (await call('/api/customer-manager?status=due')).body.data.total,
    1
  );
  assert.equal(
    (await call('/api/customer-manager?status=never')).body.data.total,
    1
  );
  assert.equal(
    (await save({ ...entry, nextFollowUp: '2026-02-30' })).status,
    400
  );
  assert.equal((await save({ ...entry, outcome: 'invalid' })).status, 400);
  assert.equal((await save({ ...entry, note: 'x'.repeat(2001) })).status, 400);
  assert.equal(
    (
      await call('/api/customer-manager/01911123456/contacts', 'salesman', {
        method: 'POST',
        body: JSON.stringify(entry),
      })
    ).status,
    404
  );
  assert.equal((await save({ ...entry, outcome: 'dont_contact' })).status, 201);
  assert.equal((await call('/api/customer-manager')).body.data.total, 1);
  assert.equal(
    (await call('/api/customer-manager?status=dont_contact')).body.data.total,
    1
  );
  assert.equal(
    (await call('/api/customer-manager?status=due')).body.data.summary.due,
    0
  );
  assert.equal(
    (await call('/api/customer-manager/01711123456')).body.data.history.length,
    2
  );
  const more = [];
  for (let i = 0; i < 21; i++)
    more.push(fixture('019' + String(10000000 + i), 200 + i, 5));
  await Orders.collection.insertMany(more);
  const firstPage = (await call('/api/customer-manager')).body.data;
  const secondPage = (await call('/api/customer-manager?page=2')).body.data;
  assert.equal(firstPage.rows.length, 20);
  assert.equal(secondPage.rows.length, 2);
  assert.equal(
    new Set([...firstPage.rows, ...secondPage.rows].map((r) => r.phone)).size,
    22
  );
  await Orders.collection.deleteMany({ phoneNo: /^019/ });
  const followupStats = (await call('/api/customer-manager?status=contacted'))
    .body.data;
  assert.equal(followupStats.summary.followedUp, 1);
  assert.equal(followupStats.total, 1);
  assert.equal(
    (await call('/api/customer-manager/01711123456')).body.data.customerInfo
      .shippingAddress,
    'House 12, Road 3'
  );
  assert.equal(
    (await call('/api/customer-manager/products/search?q=Fixture')).body.data[0]
      .price,
    450
  );
  assert.equal(
    (await call('/api/customer-manager/products/search?q=Fixture', 'editor'))
      .status,
    401
  );
  const createBody = {
    items: [{ product: product.toString(), quantity: 2 }],
    paymentType: 'cash_on_delivery',
    source: 'phone',
    requestId: 'crm-fixture-repeat-order-0001',
    grandTotal: 1,
    orderStatus: 5,
    phoneNo: '01999999999',
  };
  const create = (body, role = 'salesman') =>
    call('/api/customer-manager/01711123456/orders', role, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  assert.equal((await create(createBody, 'editor')).status, 401);
  assert.equal(
    (await create({ ...createBody, shippingAddress: '' })).status,
    400
  );
  assert.equal((await create({ ...createBody, items: [] })).status, 400);
  assert.equal(
    (
      await create({
        ...createBody,
        items: [{ product: product.toString(), quantity: 0 }],
      })
    ).status,
    400
  );
  assert.equal(
    (await create({ ...createBody, deliveryCharge: -1 })).status,
    400
  );
  assert.equal(
    (
      await create({
        ...createBody,
        items: [
          { product: new mongoose.Types.ObjectId().toString(), quantity: 1 },
        ],
      })
    ).status,
    400
  );
  const created = await create(createBody);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const persisted = await Orders.findById(created.body.data._id).lean();
  assert.equal(persisted.phoneNo, '01711123456');
  assert.equal(persisted.shippingAddress, 'House 12, Road 3');
  assert.equal(persisted.city, 'Dhaka');
  assert.equal(persisted.email, 'fixture@example.test');
  assert.equal(persisted.orderStatus, 1);
  assert.equal(persisted.paymentStatus, 'unpaid');
  assert.equal(persisted.manualOrderSource, 'phone');
  assert.equal(persisted.grandTotal, 960);
  assert.equal(persisted.orderedItems[0].costPriceAtOrder, 200);
  const replay = await create(createBody);
  assert.equal(replay.body.data.orderId, created.body.data.orderId);
  assert.equal(
    await Orders.countDocuments({ manualOrderRequestId: createBody.requestId }),
    1
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal((await Products.findById(product).lean()).stock, 48);
  assert.equal((await Products.findById(product).lean()).totalSold, 2);
  assert.equal(
    (await call('/api/customer-manager')).body.data.summary.customers,
    2
  );
  console.log(
    'PASS: prefilled addresses, distinct followed-up counts, protected catalog search, server-priced order persistence, validation, stock and duplicate protection.'
  );
  const page = await fetch(
    'http://127.0.0.1:3019/upload/static/customer-manager.html'
  );
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  const ordersPage = await (
    await fetch('http://127.0.0.1:3019/upload/static/custom-orders.html')
  ).text();
  assert.match(ordersPage, /id="navCustomerManager"/);
  assert.doesNotMatch(
    ordersPage.match(/<a href="customer-manager.html"[^>]*>/)[0],
    /data-salesman-hidden/
  );
  console.log(
    'PASS: delivered-only totals, phone normalization, filters, persistent contact history, opt-out, validation, auth/role gates and navigation.'
  );
  if (process.env.CRM_BROWSER_CHECK) {
    const { chromium } = require(process.env.CRM_PLAYWRIGHT_PATH);
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CRM_CHROME_PATH
        ? { executablePath: process.env.CRM_CHROME_PATH }
        : {}),
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(
      (value) => localStorage.setItem('co_admin_token', value),
      token('salesman')
    );
    await page.goto(
      'http://127.0.0.1:3019/upload/static/customer-manager.html'
    );
    await page.waitForFunction(
      () =>
        document.querySelector('#notice').textContent === '' &&
        document.querySelector('#stat-customers').textContent === '2'
    );
    assert.equal(await page.locator('[data-admin-only]:visible').count(), 0);
    assert.equal(await page.locator('#rows script').count(), 0);
    assert.equal(
      await page.locator('#status option[value="never"]').count(),
      1
    );
    await page.locator('[data-status="never"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('#status').value === 'never' &&
        document.querySelector('#notice').textContent === ''
    );
    assert.equal(await page.locator('#rows [data-phone]').count(), 1);
    await page.locator('[data-status=""]').click();
    await page.waitForSelector('[data-phone="01811123456"]');
    await page.locator('[data-phone="01811123456"]').click();
    await page.waitForSelector('#drawer:not([hidden])');
    assert.match(
      await page.locator('#customer-name').textContent(),
      /<script>/
    );
    await page.locator('#note').fill('Browser fixture call');
    await page.locator('#followup').fill(dhakaToday());
    await page.locator('#save').click();
    await page.waitForFunction(
      () =>
        document.querySelector('#save-status').textContent === 'Contact saved.'
    );
    await page.locator('[data-tab="history"]').click();
    assert.match(
      await page.locator('#history').textContent(),
      /Browser fixture call/
    );
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        ),
        true,
        'No page overflow at ' + width
      );
    }
    await Orders.collection.updateOne(
      { phoneNo: '01811123456' },
      { $set: { name: 'Nusrat Jahan' } }
    );
    await page.locator('#close').click();
    await page.locator('#reset-filters').click();
    await page.waitForFunction(() =>
      document.querySelector('#rows').textContent.includes('Nusrat Jahan')
    );
    await page.locator('[data-phone="01811123456"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('#customer-name').textContent === 'Nusrat Jahan'
    );
    assert.match(
      await page.locator('#customer-address').textContent(),
      /House 12/
    );
    await page.locator('#create-order').click();
    assert.equal(
      await page.locator('#order-name').inputValue(),
      'Nusrat Jahan'
    );
    assert.equal(
      await page.locator('#order-phone').inputValue(),
      '01811123456'
    );
    assert.equal(
      await page.locator('#order-address').inputValue(),
      'House 12, Road 3'
    );
    assert.equal(await page.locator('#order-delivery').inputValue(), '60');
    await page.locator('#order-submit').click();
    assert.match(
      await page.locator('#order-status').textContent(),
      /Add at least one product/
    );
    await page.locator('#order-search').fill('Fixture');
    await page.locator('#order-search-button').click();
    await page.waitForSelector('[data-order-add="0"]');
    await page.locator('[data-order-add="0"]').click();
    await page.locator('[data-order-qty="0"]').fill('2');
    await page.locator('[data-order-qty="0"]').blur();
    assert.equal(await page.locator('#order-total').textContent(), '৳960');
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () =>
            document.querySelector('#order-dialog').scrollWidth <=
            document.querySelector('#order-dialog').clientWidth
        ),
        true,
        'Order dialog fits at ' + width
      );
    }
    await page.setViewportSize({ width: 1200, height: 1000 });
    await page.screenshot({
      path: path.join(root, 'tmp/customer-manager-create-order.png'),
      fullPage: true,
    });
    await page.locator('#order-submit').click();
    await page.waitForSelector('#order-success:not([hidden])');
    assert.match(
      await page.locator('#order-success').textContent(),
      /Order #.* created/
    );
    assert.equal(
      await Orders.countDocuments({ phoneNo: '01811123456', orderStatus: 1 }),
      1
    );
    assert.equal(await page.locator('#order-submit').isDisabled(), true);
    await page.locator('#order-close').click();
    assert.equal(await page.locator('#stat-followedUp').textContent(), '2');
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.locator('[data-tab="contact"]').click();
    await page.screenshot({
      path: path.join(root, 'tmp/customer-manager-desktop.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(root, 'tmp/customer-manager-mobile.png'),
      fullPage: true,
    });
    await page.locator('#close').click();
    await page.locator('#product').fill('no match');
    await page.locator('#filters button[type="submit"]').click();
    await page.waitForSelector('#rows .empty');
    assert.match(
      await page.locator('#rows').textContent(),
      /No customers match/
    );
    assert.deepEqual(errors, []);
    await browser.close();
    console.log(
      'PASS: browser Sales Man navigation, escaped data, save/reload/history, filters and responsive layouts at 320–1440px.'
    );
  }
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (app) await app.close();
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
  });
