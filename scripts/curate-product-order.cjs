// Puts the shop's best sellers near the top of every book list (all books, category, publisher and
// author pages). Lists sort by `priority` (highest first), then newest (see api/src/storefront-list-sort.ts).
// The owner's own priorities (1 or more, set in admin) always stay first and are never changed here.
// This script only uses priorities between 0 and 1: the books in data/curation/all-books-order.json
// get descending values in that range (skipping books the owner pinned), and older curation values on
// books no longer listed are cleared, so the rest follow newest first. Old values are backed up first.
// Uses the API's own mongoose schema (api/dist, so run after `npm run build`).
//
// On the VPS, from /home/amolbooks:
//   node scripts/curate-product-order.cjs            dry run: shows the new top of the list and what changes
//   node scripts/curate-product-order.cjs --apply    writes to the database (backup in api/backup/db/)
//   node scripts/curate-product-order.cjs --restore api/backup/db/product-priority-<time>.json [--apply]
// Options: --env <file> (default api/.env), --order <file> (default data/curation/all-books-order.json)
// The shop caches its book lists for up to 5 minutes.
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
const ENV_FILE = path.resolve(root, option('--env', 'api/.env'));
const ORDER_FILE = path.resolve(root, option('--order', 'data/curation/all-books-order.json'));
const RESTORE = option('--restore', null);

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

(async () => {
  await mongoose.connect(mongoUri(readEnv(ENV_FILE)), { serverSelectionTimeoutMS: 8000 });
  const { ProductSchema } = require(path.join(root, 'api/dist/schema/product.schema'));
  const Product = mongoose.model('Product', ProductSchema);
  const products = await Product.find({}).select('name slug status priority').lean();
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  // The owner's pins (priority 1 or more) are theirs; curation owns only values between 0 and 1.
  const isPin = (value) => typeof value === 'number' && value >= 1;
  const isCurated = (value) => typeof value === 'number' && value > 0 && value < 1;
  // Wanted priority per product id: from the backup when restoring, else from the order file.
  const wanted = new Map();
  const missing = [];
  const keptPins = [];
  if (RESTORE) {
    const saved = JSON.parse(fs.readFileSync(path.resolve(root, RESTORE), 'utf8'));
    for (const row of saved.products) wanted.set(String(row._id), row.priority ?? null);
  } else {
    const { books } = JSON.parse(fs.readFileSync(ORDER_FILE, 'utf8'));
    const listed = [];
    for (const slug of books.map((b) => b.slug)) {
      const product = bySlug.get(slug);
      if (!product) { missing.push(slug); continue; }
      if (isPin(product.priority)) { keptPins.push(product.name); continue; }
      if (!listed.includes(product)) listed.push(product);
    }
    listed.forEach((product, i) => wanted.set(String(product._id), Number(((listed.length - i) / (listed.length + 1)).toFixed(6))));
    for (const p of products) {
      if (wanted.has(String(p._id))) continue;
      wanted.set(String(p._id), isCurated(p.priority) ? null : p.priority ?? null); // clear old curation, keep the rest
    }
  }

  const changes = [];
  for (const p of products) {
    const target = wanted.has(String(p._id)) ? wanted.get(String(p._id)) : p.priority ?? null;
    const current = p.priority ?? null;
    if (!RESTORE && isPin(current)) continue; // never touch the owner's pins
    if (current !== target) changes.push({ _id: p._id, name: p.name, from: current, to: target });
  }
  const shown = (p) => (wanted.has(String(p._id)) ? wanted.get(String(p._id)) : p.priority) ?? null;
  const top = products.filter((p) => p.status === 'publish' && shown(p) != null && shown(p) > 0)
    .sort((a, b) => shown(b) - shown(a));
  const pins = top.filter((p) => isPin(shown(p))).length;
  console.log(`${RESTORE ? 'restore from ' + RESTORE : 'order file ' + path.relative(root, ORDER_FILE)}: ${pins} pinned by you (kept, first), ${top.length - pins} curated, the rest newest first`);
  top.slice(0, 30).forEach((p, i) => console.log(`${String(i + 1).padStart(3)}. ${isPin(shown(p)) ? '[your pin] ' : ''}${p.name}`));
  if (top.length > 30) console.log(`     … ${top.length - 30} more`);
  if (keptPins.length) console.log(`in the order file but pinned by you, left as you set them: ${keptPins.length}`);
  for (const slug of missing) console.log(`not in the shop (skipped): ${slug}`);
  console.log(`${changes.length} product(s) ${APPLY ? 'updated' : 'would change'}${APPLY ? '' : ' (dry run; add --apply to write)'}`);

  if (APPLY && changes.length) {
    const backupDir = path.join(root, 'api/backup/db');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = path.join(backupDir, `product-priority-${stamp}.json`);
    fs.writeFileSync(backup, JSON.stringify({ savedAt: new Date().toISOString(), products: products.map((p) => ({ _id: String(p._id), slug: p.slug, priority: p.priority ?? null })) }, null, 2));
    console.log(`old priorities saved to ${path.relative(root, backup)}`);
    await Product.bulkWrite(changes.map((c) => ({
      updateOne: { filter: { _id: c._id }, update: c.to == null ? { $unset: { priority: '' } } : { $set: { priority: c.to } } },
    })));
  }
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error.message || error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
