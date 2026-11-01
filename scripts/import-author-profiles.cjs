// Fills in author photos, bios and English names from data/author-profiles (authors.json + images/).
// Only empty fields are written: an author that already has an image, description or English name keeps it.
// Images are copied into api/upload/images (never over an existing file).
//
// On the VPS, from /home/amolbooks:
//   node scripts/import-author-profiles.cjs            dry run, shows what would change
//   node scripts/import-author-profiles.cjs --apply    writes to the database
// Options: --env <file> (default api/.env), --upload-dir <dir> (default api/upload/images),
//          --image-base <url> (default https://apisub.amolbooks.com/api/upload/images/)
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const req = createRequire(path.join(root, 'api/package.json'));
const { MongoClient, ObjectId } = req('mongodb');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const APPLY = args.includes('--apply');
const ENV_FILE = path.resolve(root, option('--env', 'api/.env'));
const UPLOAD_DIR = path.resolve(root, option('--upload-dir', 'api/upload/images'));
const IMAGE_BASE = option('--image-base', 'https://apisub.amolbooks.com/api/upload/images/').replace(/\/?$/, '/');
const DATA_DIR = path.join(root, 'data/author-profiles');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
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

const isEmptyText = (html) => !String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

(async () => {
  const profiles = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'authors.json'), 'utf8'));
  const env = readEnv(ENV_FILE);
  const client = new MongoClient(mongoUri(env), { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const authors = client.db(env.DB_NAME).collection('authors');

  const plan = [];
  for (const profile of profiles) {
    const author = await authors.findOne({ _id: new ObjectId(profile.id) }, { projection: { name: 1, nameEn: 1, image: 1, description: 1 } });
    if (!author) {
      console.log(`missing   ${profile.id} ${profile.name} (not in database)`);
      continue;
    }
    const set = {};
    let copy = null;
    if (profile.image && !author.image && /^https?:\/\//.test(profile.image)) {
      // Duplicate author records reuse a photo that is already on the server.
      set.image = profile.image;
    } else if (profile.image && !author.image) {
      const source = path.join(DATA_DIR, 'images', profile.image);
      const target = path.join(UPLOAD_DIR, profile.image);
      if (!fs.existsSync(source)) throw new Error(`image file missing: ${source}`);
      if (fs.existsSync(target) && !fs.readFileSync(target).equals(fs.readFileSync(source))) {
        throw new Error(`${target} already exists with other content; not overwriting`);
      }
      if (!fs.existsSync(target)) copy = { source, target };
      set.image = IMAGE_BASE + profile.image;
    }
    if (profile.description && isEmptyText(author.description)) set.description = profile.description;
    // English name: matched by the storefront search ("arif" finds আরিফ আজাদ); editable in admin.
    if (profile.nameEn && !String(author.nameEn || '').trim()) set.nameEn = profile.nameEn;
    if (!Object.keys(set).length) {
      console.log(`unchanged ${profile.id} ${author.name}`);
      continue;
    }
    plan.push({ id: author._id, name: author.name, set, copy });
    console.log(`${APPLY ? 'update' : 'would set'} ${profile.id} ${author.name}: ${Object.keys(set).join(' + ')}`);
  }

  if (APPLY) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    for (const item of plan) {
      // Two records of the same person share one file; the second finds it already copied.
      if (item.copy && !fs.existsSync(item.copy.target)) fs.copyFileSync(item.copy.source, item.copy.target, fs.constants.COPYFILE_EXCL);
      await authors.updateOne({ _id: item.id }, { $set: { ...item.set, updatedAt: new Date() } });
    }
  }
  console.log(`\n${plan.length} author(s) ${APPLY ? 'updated' : 'would be updated (dry run; add --apply to write)'}`);
  await client.close();
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
