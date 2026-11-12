// Sets each book's cost price from the publisher's trade discount, so the profit dashboard counts it.
// Cost = sale price (MRP) minus the publisher's discount, rounded UP to the next whole Taka
// (the owner's own entries were rounded the same way, e.g. 392 x 45% = 176.4 -> 177).
//   সমকালীন (Samakalin): 40% off the sale price -> cost 60%  (invoice: 20 x 60 = 1200, 40% off = 720)
//   সন্দীপন প্রকাশন (Sandipan): 55% off           -> cost 45%
// Orders save the cost at the time of the order (orderedItems.costPriceAtOrder) and the dashboard reads that
// first, so old order lines of these books that saved 0 or nothing get the new cost too. Lines that saved a
// real (non-zero) cost are left alone. Old values are backed up first.
// Uses the API's own mongoose schemas (api/dist, so run after `npm run build`).
//
// On the VPS, from /home/amolbooks:
//   node scripts/set-publisher-cost.cjs            dry run: every book, old -> new cost, order lines to fix
//   node scripts/set-publisher-cost.cjs --apply    writes (backup in api/backup/db/)
// Options: --env <file> (default api/.env), --rate "<publisher name>=<cost %>" (repeatable; replaces the
// defaults), --products-only (do not touch old orders).
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const req = createRequire(path.join(root, 'api/package.json'));
const mongoose = req('mongoose');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const APPLY = args.includes('--apply');
const PRODUCTS_ONLY = args.includes('--products-only');
const ENV_FILE = path.resolve(root, option('--env', 'api/.env'));

// Cost as a % of the sale price, per publisher name (exactly as in the catalogue).
const DEFAULT_RATES = { 'সমকালীন': 60, 'সন্দীপন প্রকাশন': 45 };
const rateArgs = args.flatMap((arg, index) => (arg === '--rate' && args[index + 1] ? [args[index + 1]] : []));
const RATES = rateArgs.length
  ? Object.fromEntries(rateArgs.map((value) => {
    const match = value.match(/^(.+)=(\d+(?:\.\d+)?)$/);
    if (!match || Number(match[2]) <= 0 || Number(match[2]) > 100) throw new Error(`bad --rate ${value}`);
    return [match[1].trim(), Number(match[2])];
  }))
  : DEFAULT_RATES;

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

// Same database the API uses with PRODUCTION_BUILD=true (api/src/config/configuration.ts).
function mongoUri(env) {
  for (const key of ['DB_USERNAME', 'DB_PASSWORD', 'DB_PORT', 'DB_NAME', 'AUTH_SOURCE']) {
    if (!env[key]) throw new Error(`${key} missing in ${ENV_FILE}`);
  }
  if (String(env.PRODUCTION_BUILD).toLowerCase() !== 'true') {
    throw new Error(`PRODUCTION_BUILD is not true in ${ENV_FILE}; refusing to guess the database`);
  }
  const user = encodeURIComponent(env.DB_USERNAME);
  const pass = encodeURIComponent(env.DB_PASSWORD);
  return `mongodb://${user}:${pass}@127.0.0.1:${env.DB_PORT}/${env.DB_NAME}?authSource=${env.AUTH_SOURCE}`;
}

// Whole-Taka cost, rounded up; integer maths so 300 x 60% is exactly 180.
function costFor(salePrice, percent) {
  const paisa = Math.round(Number(salePrice) * 100);          // 392 Tk -> 39200
  const basisPoints = Math.round(percent * 100);              // 45% -> 4500
  return Math.floor((paisa * basisPoints + 999999) / 1000000); // ceil(39200 x 4500 / 1e6 = 176.4) -> 177
}

const unsetCost = { $or: [{ 'l.costPriceAtOrder': { $exists: false } }, { 'l.costPriceAtOrder': null }, { 'l.costPriceAtOrder': 0 }] };

(async () => {
  // MONGO_URI_OVERRIDE: local testing against a dev database only.
  await mongoose.connect(process.env.MONGO_URI_OVERRIDE || mongoUri(readEnv(ENV_FILE)), { serverSelectionTimeoutMS: 8000 });
  const { ProductSchema } = require(path.join(root, 'api/dist/schema/product.schema'));
  const { OrderSchema } = require(path.join(root, 'api/dist/schema/order.schema'));
  const Product = mongoose.model('Product', ProductSchema);
  const Order = mongoose.model('Order', OrderSchema);

  const plan = []; const noPrice = [];
  for (const [publisher, percent] of Object.entries(RATES)) {
    const products = await Product.find({ 'publisher.name': publisher }).select('name status salePrice costPrice').lean();
    if (!products.length) console.log(`! no products with publisher "${publisher}"`);
    for (const product of products) {
      if (!(Number(product.salePrice) > 0)) { noPrice.push(`${product.name} (${publisher})`); continue; }
      plan.push({ product, publisher, percent, cost: costFor(product.salePrice, percent) });
    }
  }

  let lineTotal = 0;
  for (const item of plan) {
    item.changes = item.product.costPrice !== item.cost;
    if (PRODUCTS_ONLY) { item.lines = []; continue; }
    const orders = await Order.find({ orderedItems: { $elemMatch: { _id: item.product._id, $or: [{ costPriceAtOrder: { $exists: false } }, { costPriceAtOrder: null }, { costPriceAtOrder: 0 }] } } })
      .select('orderId orderedItems._id orderedItems.costPriceAtOrder orderedItems.quantity').lean();
    item.lines = orders.flatMap((order) => order.orderedItems
      .filter((line) => String(line._id) === String(item.product._id) && !(Number(line.costPriceAtOrder) > 0))
      .map((line) => ({ order: order._id, orderId: order.orderId, old: line.costPriceAtOrder ?? null, quantity: line.quantity })));
    lineTotal += item.lines.length;
  }

  for (const publisher of Object.keys(RATES)) {
    const rows = plan.filter((item) => item.publisher === publisher);
    console.log(`\n${publisher}: cost = ${RATES[publisher]}% of sale price, rounded up (${rows.length} books)`);
    for (const { product, cost, changes, lines } of rows) {
      const old = product.costPrice === undefined || product.costPrice === null ? '-' : product.costPrice;
      const tag = changes ? (Number(product.costPrice) > 0 ? 'CHANGE' : 'set   ') : 'same  ';
      console.log(`  ${tag} ${String(old).padStart(5)} -> ${String(cost).padStart(5)}  (MRP ${product.salePrice}) ${product.name}${lines.length ? ` · ${lines.length} old order line(s)` : ''}${product.status !== 'publish' ? ` [${product.status}]` : ''}`);
    }
  }
  if (noPrice.length) console.log(`\nskipped, no sale price: ${noPrice.join('; ')}`);
  const changing = plan.filter((item) => item.changes);
  console.log(`\n${changing.length} book(s) ${APPLY ? 'updated' : 'would get a new cost'} (${changing.filter((i) => Number(i.product.costPrice) > 0).length} had a different cost before); ${PRODUCTS_ONLY ? 'orders not touched' : `${lineTotal} old order line(s) with cost 0/empty ${APPLY ? 'fixed' : 'would be fixed'}`}${APPLY ? '' : ' (dry run; add --apply to write)'}`);

  if (APPLY && (changing.length || lineTotal)) {
    const backupDir = path.join(root, 'api/backup/db');
    fs.mkdirSync(backupDir, { recursive: true });
    const backup = path.join(backupDir, `publisher-cost-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, JSON.stringify({
      products: plan.map(({ product }) => ({ _id: product._id, costPrice: product.costPrice ?? null })),
      orderLines: plan.flatMap(({ product, lines }) => lines.map((line) => ({ order: line.order, product: product._id, costPriceAtOrder: line.old }))),
    }, null, 2));
    console.log(`backup: ${path.relative(root, backup)}`);
    for (const { product, cost, changes, lines } of plan) {
      if (changes) await Product.updateOne({ _id: product._id }, { $set: { costPrice: cost } });
      if (lines.length) {
        // Plain driver call: Mongoose adds schema fields to arrayFilters, which MongoDB rejects.
        const orderIds = [...new Map(lines.map((line) => [String(line.order), line.order])).values()];
        await Order.collection.updateMany(
          { _id: { $in: orderIds } },
          { $set: { 'orderedItems.$[l].costPriceAtOrder': cost } },
          { arrayFilters: [{ 'l._id': product._id, ...unsetCost }] },
        );
      }
    }
  }
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error.message || error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
