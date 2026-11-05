// Sets the shop price of a book set already in the shop to the price in
// data/new-books/<set>/books.json (cover price minus `discountAmount` Taka, or minus
// `discountPercent`). Only books whose cover price in the shop still equals the file's change;
// a book whose cover price was edited in admin is reported and left alone.
// Uses the API's own mongoose schema (api/dist, so run after `npm run build`).
//
// On the VPS, from /home/amolbooks:
//   node scripts/update-book-prices.cjs somokalin            dry run, shows each price change
//   node scripts/update-book-prices.cjs somokalin --apply    writes to the database
// Options: --env <file> (default api/.env)
// The shop caches its book lists for up to 5 minutes, so new prices appear within that time.
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
const SET = args.find((arg, index) => !arg.startsWith('--') && !(index > 0 && args[index - 1] === '--env'));
const APPLY = args.includes('--apply');
const ENV_FILE = path.resolve(root, option('--env', 'api/.env'));
if (!SET || !/^[a-z0-9-]+$/.test(SET)) {
  console.error('usage: node scripts/update-book-prices.cjs <set> [--apply]');
  process.exit(1);
}

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

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Bengali letters like য় can be stored as one or two code points; compare in one form.
const same = (value) => String(value || '').normalize('NFD').replace(/\s+/g, ' ').trim().toLowerCase();

(async () => {
  const { books } = JSON.parse(fs.readFileSync(path.join(root, 'data/new-books', SET, 'books.json'), 'utf8'));
  await mongoose.connect(mongoUri(readEnv(ENV_FILE)), { serverSelectionTimeoutMS: 8000 });
  const { ProductSchema } = require(path.join(root, 'api/dist/schema/product.schema'));
  const Product = mongoose.model('Product', ProductSchema);

  const changes = [];
  const unchanged = [];
  const skipped = [];
  for (const book of books) {
    // The importer adds "-2", "-3" … to a slug that was already taken.
    const found = (await Product.find({ slug: new RegExp('^' + escapeRegex(book.slug) + '(-\\d+)?$') })
      .select('name slug salePrice discountType discountAmount afterDiscountPrice')
      .lean()).find((product) => same(product.name) === same(book.name));
    if (!found) {
      skipped.push(`${book.name} (not in the shop: not imported yet, or renamed in admin)`);
      continue;
    }
    if (Number(found.salePrice) !== book.mrp) {
      skipped.push(`${found.name} (cover price in the shop is ৳${found.salePrice}, file says ৳${book.mrp}; left as it is)`);
      continue;
    }
    const discountAmount = Number.isInteger(book.discountAmount) ? book.discountAmount : Math.round(book.mrp * book.discountPercent / 100);
    const price = book.mrp - discountAmount;
    if (found.discountType === 2 && found.discountAmount === discountAmount && found.afterDiscountPrice === price) {
      unchanged.push(found.name);
      continue;
    }
    changes.push({ product: found, discountAmount, price, before: found.afterDiscountPrice ?? book.mrp - (found.discountAmount || 0) });
  }

  for (const c of changes) console.log(`${APPLY ? 'set' : 'would set'}  ${c.product.name}: ৳${c.before} -> ৳${c.price} (cover ৳${c.product.salePrice} - ${c.discountAmount})`);
  for (const line of skipped) console.log(`skip           ${line}`);

  if (APPLY) {
    for (const c of changes) {
      await Product.updateOne(
        { _id: c.product._id, salePrice: c.product.salePrice },
        { $set: { discountType: 2, discountAmount: c.discountAmount, afterDiscountPrice: c.price } },
      );
    }
  }
  console.log(`\n${changes.length} price(s) ${APPLY ? 'changed' : 'would change (dry run; add --apply to write)'}; ${unchanged.length} already right; ${skipped.length} skipped`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error.message || error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
