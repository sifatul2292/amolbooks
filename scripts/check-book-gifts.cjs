const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..'),
  deps = root + '/api/node_modules/';
require(deps + 'reflect-metadata');
const mongoose = require(deps + 'mongoose');
const { OrderOfferSchema } = require('../api/dist/schema/order-offer.schema');
const { OrderService } = require('../api/dist/pages/sales/order/order.service');
const {
  OrderOfferService,
} = require('../api/dist/pages/offers/order-offer/order-offer.service');
const {
  OrderOfferController,
} = require('../api/dist/pages/offers/order-offer/order-offer.controller');
const { Module, VersioningType } = require(deps + '@nestjs/common');
const { NestFactory } = require(deps + '@nestjs/core');
const { PassportModule } = require(deps + '@nestjs/passport');
const jwt = require(deps + 'jsonwebtoken');
const {
  JwtAdminStrategy,
} = require('../api/dist/pages/admin/jwt-admin.strategy');
const {
  customerManagerPages,
} = require('../api/dist/pages/customer-manager/customer-manager-pages');
const ts = require(deps + 'typescript'),
  vm = require('node:vm');
const scriptExports = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      root + '/api/src/storefront-product-sections-script.ts',
      'utf8',
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  scriptExports,
);
const storefront = scriptExports.exports.STOREFRONT_PRODUCT_SECTIONS_SCRIPT;
new vm.Script(storefront);
const helper = storefront.slice(
  storefront.indexOf('  function cartHasBookGift('),
  storefront.indexOf('  function imageUrl('),
);
const context = {
  cartOfferConfig: {
    giftEnabled: true,
    giftBookOffers: [
      { bookSlug: 'productive muslim', quantity: 1, enabled: true },
    ],
  },
  cartPageProductId: (item) =>
    String(item.product?._id || item.product || item._id),
};
vm.createContext(context);
vm.runInContext(helper, context);
assert.equal(
  context.cartHasBookGift(
    [{ product: 'book', selectedQty: 1 }],
    [{ _id: 'book', slug: 'productive muslim' }],
  ),
  true,
);
assert.equal(
  context.cartHasBookGift(
    [{ product: 'book', selectedQty: 1 }],
    [{ _id: 'book', slug: 'other' }],
  ),
  false,
);
assert.equal(
  context.cartHasBookGift(
    [{ product: 'book', selectedQty: 1, specialPackage: true }],
    [{ _id: 'book', slug: 'productive muslim' }],
  ),
  false,
);
context.cartOfferConfig.giftEnabled = false;
assert.equal(
  context.cartHasBookGift(
    [{ product: 'book', selectedQty: 1 }],
    [{ _id: 'book', slug: 'productive muslim' }],
  ),
  false,
);
const Offer = mongoose.model('BookGiftFixtureOffer', OrderOfferSchema);
const config = new Offer({
  giftEnabled: true,
  giftMinAmount: 750,
  giftBuyXProductSlug: 'legacy book',
  giftBuyXQty: 2,
  giftProduct: {
    _id: '6a3c1d665676acb52a082df5',
    name: 'Amol Notebook',
    slug: 'Amol Notebook',
    image:
      'https://apisub.amolbooks.com/api/upload/images/amolbooks-notebook-8ddd.webp',
  },
});
const model = {
  findOne: async () => config,
  updateOne: async (filter, update) => {
    assert.equal(String(filter._id), String(config._id));
    config.set(update.$set);
  },
};
const productModel = {
  findOne: (filter) => ({
    select: () => ({
      lean: async () =>
        filter.slug === 'Amol Notebook'
          ? { ...config.giftProduct, images: [config.giftProduct.image] }
          : null,
    }),
  }),
  find: (filter) => ({
    select: () => ({
      lean: async () =>
        filter.slug.$in
          .filter((s) =>
            ['productive muslim', 'another book', 'Amol Notebook'].includes(s),
          )
          .map((slug) => ({ slug })),
    }),
  }),
};
const adminService = new OrderOfferService(
  model,
  productModel,
  null,
  null,
  null,
  null,
);
const orderService = Object.create(OrderService.prototype);
orderService.orderOfferModel = model;
orderService.logger = {
  error: (message) => {
    throw Error(message);
  },
};
orderService.utilsService = {
  transform: (product, key, qty) =>
    Number(product[key] || 0) * Number(qty || 1),
};
const book = (slug = 'productive muslim', qty = 1) => ({
  _id: '6a04d8a16272179445d5efb9',
  slug,
  quantity: qty,
  regularPrice: 400,
  salePrice: 315,
});
async function gift(products, total = 315) {
  return orderService.evaluateGiftLine(products, [
    { product: { _id: products[0]._id, salePrice: total }, selectedQty: 1 },
  ]);
}
let app, browser;
(async () => {
  assert.equal(config.giftBookOffers[0].bookSlug, 'productive muslim');
  assert.equal((await gift([book()])).salePrice, 0);
  assert.equal(await gift([book('unrelated')]), null);
  assert.equal((await gift([book('unrelated')], 750)).isGift, true);
  assert.equal((await gift([book('legacy book', 2)])).isGift, true);
  const existing = [
    book(),
    { _id: config.giftProduct._id, salePrice: 100, quantity: 1 },
  ];
  assert.equal(await gift(existing), null);
  assert.equal(existing[1].salePrice, 0);
  assert.equal(existing[1].isGift, true);
  const legacyBefore = JSON.stringify({
    threshold: config.giftMinAmount,
    slug: config.giftBuyXProductSlug,
    qty: config.giftBuyXQty,
    gift: config.giftProduct,
  });
  await assert.rejects(
    adminService.saveBookGifts({
      offers: [{ bookSlug: 'missing', quantity: 1, enabled: true }],
    }),
  );
  await assert.rejects(
    adminService.saveBookGifts({
      offers: [{ bookSlug: 'productive muslim', quantity: 0, enabled: true }],
    }),
  );
  await assert.rejects(
    adminService.saveBookGifts({
      offers: [
        { bookSlug: 'productive muslim', quantity: 1, enabled: true },
        { bookSlug: 'productive muslim', quantity: 1, enabled: true },
      ],
    }),
  );
  await adminService.saveBookGifts({
    offers: [{ bookSlug: 'productive muslim', quantity: 2, enabled: true }],
  });
  assert.equal(await gift([book()]), null);
  assert.equal((await gift([book('productive muslim', 2)])).isGift, true);
  await adminService.saveBookGifts({ offers: [] });
  assert.equal(await gift([book()]), null);
  await adminService.saveBookGifts({
    offers: [{ bookSlug: 'productive muslim', quantity: 1, enabled: false }],
  });
  assert.equal(await gift([book()]), null);
  assert.equal(
    JSON.stringify({
      threshold: config.giftMinAmount,
      slug: config.giftBuyXProductSlug,
      qty: config.giftBuyXQty,
      gift: config.giftProduct,
    }),
    legacyBefore,
  );
  await adminService.saveBookGifts({
    offers: [{ bookSlug: 'productive muslim', quantity: 1, enabled: true }],
  });
  await assert.rejects(
    adminService.saveBookGifts({ offers: [], notebookSlug: 'missing' }),
  );
  await assert.rejects(
    adminService.saveBookGifts({
      offers: [{ bookSlug: 'Amol Notebook', quantity: 1, enabled: true }],
    }),
  );
  await adminService.saveBookGifts({
    offers: [{ bookSlug: 'productive muslim', quantity: 1, enabled: true }],
    notebookSlug: 'Amol Notebook',
  });
  assert.equal(config.giftProduct.slug, 'Amol Notebook');
  let initialConfig;
  const initialService = new OrderOfferService({findOne:async()=>null,create:async value=>{initialConfig=value;}},productModel,null,null,null,null);
  await initialService.saveBookGifts({offers:[{bookSlug:'productive muslim',quantity:1,enabled:true}],notebookSlug:'Amol Notebook'});
  assert.equal(initialConfig.giftEnabled,true);
  assert.equal(initialConfig.giftBookOffers[0].bookSlug,'productive muslim');
  const secret = 'isolated-book-gift-fixture-secret';
  class FixtureModule {}
  Module({
    imports: [PassportModule],
    controllers: [OrderOfferController],
    providers: [
      { provide: OrderOfferService, useValue: adminService },
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
  await app.listen(3021, '127.0.0.1');
  const token = (role) =>
    jwt.sign(
      { _id: '6a04d8a16272179445d5efb9', username: 'fixture', role },
      secret,
      { expiresIn: '1h' },
    );
  async function save(role) {
    return fetch('http://127.0.0.1:3021/api/order-offer/book-gifts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        administrator: role ? token(role) : '',
      },
      body: JSON.stringify({
        offers: [{ bookSlug: 'productive muslim', quantity: 1, enabled: true }],
      }),
    });
  }
  for (const role of [null, 'salesman', 'editor'])
    assert.equal((await save(role)).status, 401);
  for (const role of ['admin', 'super_admin'])
    assert.equal((await save(role)).status, 201);
  const card = fs.readFileSync(
    root + '/gtm-snippets/book-gift-card.html',
    'utf8',
  );
  const manager = fs.readFileSync(
    root + '/gtm-snippets/book-gift-offers.html',
    'utf8',
  );
  for (const html of [card, manager])
    new Function(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  console.log(
    'PASS: gift eligibility, default Productive Muslim rule, quantity/disable/removal, no duplicate gift, preserved existing offers, validation and HTTP role gates.',
  );
  if (process.env.BOOK_GIFT_PLAYWRIGHT) {
    const { chromium } = require(process.env.BOOK_GIFT_PLAYWRIGHT);
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.BOOK_GIFT_CHROME,
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/api/order-offer/get', (route) =>
      route.fulfill({ json: { success: true, data: config.toObject() } }),
    );
    await page.route('**/product-details/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body:
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;font:16px sans-serif}h1{font-size:24px;overflow-wrap:anywhere}app-product-details{display:block;max-width:700px;margin:auto}.delivery-area{border:1px solid #bcdfb6;padding:20px;border-radius:7px}</style><app-product-details><h1>প্রোডাক্টিভ মুসলিম</h1><div class="delivery-area">সম্ভাব্য ডেলিভারি<p>ঢাকার ভেতরে: ১৩ অক্টোবরের মধ্যে</p></div><p>In Stock</p></app-product-details>' +
          card,
      }),
    );
    await page.route('https://example.com/notebook.webp', (route) =>
      route.fulfill({ status: 404 }),
    );
    await page.goto(
      'http://localhost:3021/product-details/productive%20muslim',
    );
    await page.waitForSelector('#ab-book-gift-card');
    await page.waitForFunction(
      () => document.querySelector('#ab-book-gift-card img').naturalWidth > 0,
    );
    assert.equal(
      await page.locator('.delivery-area + #ab-book-gift-card').count(),
      1,
    );
    assert.match(
      await page.locator('#ab-book-gift-card').textContent(),
      /Amol Notebook/,
    );
    for (const width of [320, 375, 414, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
    }
    await page.screenshot({
      path: root + '/tmp/book-gift-card-desktop.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: root + '/tmp/book-gift-card-mobile.png',
      fullPage: true,
    });
    await page.evaluate(() => {
      const estimate = document.createElement('section');
      estimate.className = 'ab-delivery-estimate';
      estimate.innerHTML =
        '<div><strong>সম্ভাব্য ডেলিভারি</strong><p data-ab-delivery-inside>Delivery estimate</p></div>';
      document
        .querySelector('.delivery-area')
        .insertAdjacentElement('afterend', estimate);
    });
    await page.waitForSelector('.ab-delivery-estimate + #ab-book-gift-card');
    await page.evaluate(() =>
      history.pushState({}, '', '/product-details/another%20book'),
    );
    await page.waitForSelector('#ab-book-gift-card', { state: 'detached' });
    await page.evaluate(() =>
      history.pushState({}, '', '/product-details/productive%20muslim'),
    );
    await page.waitForSelector('#ab-book-gift-card');
    assert.equal(await page.locator('#ab-book-gift-card').count(), 1);
    await page.addInitScript(
      (value) => localStorage.setItem('co_admin_token', value),
      token('admin'),
    );
    await page.goto(
      'http://127.0.0.1:3021/upload/static/book-gift-offers.html',
    );
    await page.waitForFunction(() => !document.getElementById('save').disabled);
    await page
      .locator('input[aria-label="Qualifying book"]')
      .fill('https://www.amolbooks.com/product-details/productive%20muslim');
    await page.locator('#save').click();
    await page.waitForFunction(() =>
      document.getElementById('status').textContent.startsWith('Offers saved.'),
    );
    assert.equal(config.giftBookOffers[0].bookSlug, 'productive muslim');
    await page.locator('#add').click();
    await page
      .locator('input[aria-label="Qualifying book"]')
      .last()
      .fill('another book');
    await page.locator('#save').click();
    await page.waitForFunction(() =>
      document.getElementById('status').textContent.startsWith('Offers saved.'),
    );
    assert.equal(config.giftBookOffers.length, 2);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: root + '/tmp/book-gift-offers-admin.png',
      fullPage: true,
    });
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      'PASS: browser gift placement, responsive card/admin, SPA cleanup and admin save/read-back.',
    );
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (app) await app.close();
  });
