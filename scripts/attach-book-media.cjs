// Adds sample PDFs ("একটু পড়ে দেখুন") and covers to products that already exist, e.g. drafts that were
// uploaded without them. Reads data/book-media/<set>/manifest.json:
//   { "items": [ { "productId": "...", "name": "...", "pdf": "file.pdf" | null, "image": "file.webp" | null } ] }
// with the files in data/book-media/<set>/pdfs/ and images/.
// It only fills EMPTY fields: a product that already has a PDF or a cover keeps it. Status is not changed;
// the report lists the drafts that now have both a cover and a PDF, ready to publish from admin.
// Uses the API's own mongoose schema (api/dist, so run after `npm run build`).
//
// On the VPS, from /home/amolbooks:
//   node scripts/attach-book-media.cjs 2026-11-12-drafts            dry run: shows what would change
//   node scripts/attach-book-media.cjs 2026-11-12-drafts --apply    copies the files and updates the products
//                                                                   (old values backed up in api/backup/db/)
// Options: --env <file> (default api/.env), --files-dir / --upload-dir, --file-base / --image-base.
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
const SET = args.find((arg, index) => !arg.startsWith('--') && !(index > 0 && args[index - 1].startsWith('--')));
const APPLY = args.includes('--apply');
const ENV_FILE = path.resolve(root, option('--env', 'api/.env'));
const UPLOAD_DIR = path.resolve(root, option('--upload-dir', 'api/upload/images'));
const IMAGE_BASE = option('--image-base', 'https://apisub.amolbooks.com/api/upload/images/').replace(/\/?$/, '/');
const FILES_DIR = path.resolve(root, option('--files-dir', 'api/upload/files'));
const FILE_BASE = option('--file-base', 'https://apisub.amolbooks.com/api/upload/files/').replace(/\/?$/, '/');
if (!SET || !/^[a-z0-9-]+$/.test(SET)) {
  console.error('usage: node scripts/attach-book-media.cjs <set> [--apply]');
  process.exit(1);
}
const DATA_DIR = path.join(root, 'data/book-media', SET);

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

const isEmpty = (value) => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
const safeName = (name) => typeof name === 'string' && /^[A-Za-z0-9._-]+$/.test(name) && !name.startsWith('.');

(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'manifest.json'), 'utf8'));
  const items = manifest.items.filter((item) => item.pdf || item.image);
  for (const item of items) {
    if (!/^[a-f0-9]{24}$/.test(item.productId)) throw new Error(`${item.name}: bad productId ${item.productId}`);
    for (const [kind, dir] of [['pdf', 'pdfs'], ['image', 'images']]) {
      if (!item[kind]) continue;
      if (!safeName(item[kind])) throw new Error(`${item.name}: bad file name ${item[kind]}`);
      if (!fs.existsSync(path.join(DATA_DIR, dir, item[kind]))) throw new Error(`${item.name}: missing ${dir}/${item[kind]}`);
    }
  }

  // MONGO_URI_OVERRIDE: local testing against a dev database only.
  await mongoose.connect(process.env.MONGO_URI_OVERRIDE || mongoUri(readEnv(ENV_FILE)), { serverSelectionTimeoutMS: 8000 });
  const { ProductSchema } = require(path.join(root, 'api/dist/schema/product.schema'));
  const Product = mongoose.model('Product', ProductSchema);

  const plan = []; const notFound = []; const kept = [];
  for (const item of items) {
    const product = await Product.findById(item.productId).select('name slug status pdfFile images').lean();
    if (!product) { notFound.push(item); continue; }
    const set = {}; const files = [];
    if (item.pdf) {
      if (isEmpty(product.pdfFile)) {
        set.pdfFile = FILE_BASE + item.pdf;
        files.push({ source: path.join(DATA_DIR, 'pdfs', item.pdf), target: path.join(FILES_DIR, item.pdf) });
      } else kept.push(`${product.name}: already has a PDF`);
    }
    if (item.image) {
      if (isEmpty(product.images)) {
        set.images = [IMAGE_BASE + item.image];
        files.push({ source: path.join(DATA_DIR, 'images', item.image), target: path.join(UPLOAD_DIR, item.image) });
      } else kept.push(`${product.name}: already has a cover`);
    }
    if (Object.keys(set).length) plan.push({ product, set, files });
  }

  for (const { product, set } of plan) {
    console.log(`${APPLY ? 'update' : 'would update'} ${product.name} [${product.status}]: ${Object.keys(set).map((k) => (k === 'pdfFile' ? 'sample PDF' : 'cover')).join(' + ')}`);
  }
  for (const line of kept) console.log(`keep   ${line}`);
  for (const item of notFound) console.log(`skip   ${item.name}: product ${item.productId} not found`);
  const ready = plan.filter(({ product, set }) => product.status === 'draft'
    && !isEmpty(set.pdfFile || product.pdfFile) && !isEmpty(set.images || product.images));
  console.log(`\n${plan.length} product(s) ${APPLY ? 'updated' : 'would be updated (dry run; add --apply to write)'}; ${kept.length} field(s) kept; ${notFound.length} not found`);
  console.log(`${ready.length} draft(s) will have both a cover and a sample PDF (ready to publish in admin)`);
  const missing = manifest.items.filter((item) => item.missing);
  if (missing.length) console.log(`Still missing: ${missing.map((item) => `${item.name} (${item.missing})`).join('; ')}`);

  if (APPLY && plan.length) {
    const backupDir = path.join(root, 'api/backup/db');
    fs.mkdirSync(backupDir, { recursive: true });
    const backup = path.join(backupDir, `product-media-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, JSON.stringify(plan.map(({ product }) => ({ _id: product._id, pdfFile: product.pdfFile ?? null, images: product.images ?? [] })), null, 2));
    console.log(`backup: ${path.relative(root, backup)}`);
    fs.mkdirSync(FILES_DIR, { recursive: true });
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    for (const { product, set, files } of plan) {
      for (const file of files) if (!fs.existsSync(file.target)) fs.copyFileSync(file.source, file.target, fs.constants.COPYFILE_EXCL);
      await Product.updateOne({ _id: product._id }, { $set: set });
    }
  }
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error.message || error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
