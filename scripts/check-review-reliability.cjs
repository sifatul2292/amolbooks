const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const snippet = fs.readFileSync(path.join(root, 'gtm-snippets/review-reliability.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8');
const uploadController = fs.readFileSync(path.join(root, 'api/src/pages/upload/upload.controller.ts'), 'utf8');
const reviewDto = fs.readFileSync(path.join(root, 'api/src/dto/review.dto.ts'), 'utf8');
const browserJs = snippet.match(/<script>([\s\S]*)<\/script>/)[1];

new Function(browserJs);
if (/\b(?:const|let)\b|=>|\.find\(/.test(browserJs)) throw new Error('browser snippet must remain ES5-compatible');

const responsePayloadSource = browserJs.match(/function responsePayload\(xhr\) \{[\s\S]*?\n  \}/)[0];
const responsePayload = new Function(responsePayloadSource + '; return responsePayload;')();
assert.deepStrictEqual(responsePayload({ responseText: '{"success":true,"data":[]}' }), { success: true, data: [] });
assert.strictEqual(responsePayload({ responseText: '<html>failure</html>' }), null);
assert.equal((uploadController.match(/sharp\(file\.path\)\s*\.rotate\(\)\s*\.resize/g) || []).length, 2, 'single and multiple v2 uploads must honor EXIF orientation before resizing');

const normalizeSource = browserJs.match(/function normalizeReviewPart\(value\) \{[\s\S]*?\n  \}/)[0];
const keySource = browserJs.match(/function reviewRecordKey\(name, review\) \{[\s\S]*?\n  \}/)[0];
const reviewRecordKey = new Function(normalizeSource + '\n' + keySource + '; return reviewRecordKey;')();
assert.strictEqual(reviewRecordKey(' Sifatul ', 'খুব   ভালো'), reviewRecordKey('sifatul', 'খুব ভালো'));
assert.notStrictEqual(reviewRecordKey('Sifatul', 'প্রথম রিভিউ'), reviewRecordKey('Sifatul', 'দ্বিতীয় রিভিউ'));

const limitSource = browserJs.match(/function enforceReviewImageLimit\(event\) \{[\s\S]*?\n  \}/)[0];
const selectedFiles = Array.from({ length: 7 }, (_, index) => ({ name: String(index) }));
const limitInput = { files: selectedFiles, matches: () => true, value: 'selected' };
function FakeDataTransfer() {
  const files = [];
  this.items = { add(file) { files.push(file); } };
  Object.defineProperty(this, 'files', { get() { return files; } });
}
const enforceReviewImageLimit = new Function('document', 'DataTransfer', 'showReviewImageLimit', limitSource + '; return enforceReviewImageLimit;')(
  { querySelectorAll: () => Array.from({ length: 2 }) },
  FakeDataTransfer,
  () => {}
);
enforceReviewImageLimit({ target: limitInput });
assert.strictEqual(limitInput.files.length, 3, 'two existing photos must leave room for only three more');

const cacheSource = browserJs.match(/function cacheReviewRecords\(list\) \{[\s\S]*?\n  \}/)[0].replace('fullReviewSlug = slug();', 'fullReviewSlug = "book";');
const renderSource = browserJs.match(/function renderReviewImages\(\) \{[\s\S]*?\n  \}/)[0];
function fakeTarget(initialHref) {
  return {
    attrs: {},
    children: initialHref ? [{ className: 'legacy', href: initialHref }] : [],
    getAttribute(name) { return this.attrs[name] || null; },
    setAttribute(name, value) { this.attrs[name] = value; },
    querySelectorAll(selector) {
      return selector === '.arr-review-image'
        ? this.children.filter((child) => child.className === 'arr-review-image')
        : [];
    },
    appendChild(child) { this.children.push(child); },
    set textContent(value) { if (value === '') this.children = []; }
  };
}
function fakeCard(name, review, initialHref) {
  const target = fakeTarget(initialHref);
  return {
    target,
    setAttribute() {},
    querySelector(selector) {
      if (selector === '.user-review-data > p') return { textContent: review };
      if (selector === '.review-product-img-main') return target;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.user-name span, .user-name a') return [{ textContent: name }];
      if (selector === 'div[style]') return [];
      return [];
    }
  };
}
const cards = [
  fakeCard('Sifatul', 'একই রিভিউ', 'wrong.jpg'),
  fakeCard('Sifatul', 'একই রিভিউ'),
  fakeCard('Noman', 'ছবি নেই', 'wrong.jpg')
];
const fakeDocument = {
  querySelectorAll(selector) { return selector === '.user-review' ? cards : []; },
  createElement() {
    return {
      children: [],
      appendChild(child) { this.children.push(child); },
      setAttribute() {},
      addEventListener() {}
    };
  }
};
const behavior = new Function('window', 'document', `
  var reviewRecords = {}, repairTimer = 0;
  function scheduleReviewImageRepair() {}
  function removeLegacyImageStrips() {}
  ${normalizeSource}
  ${keySource}
  ${cacheSource}
  ${renderSource}
  return { cache: cacheReviewRecords, render: renderReviewImages };
`)({}, fakeDocument);
behavior.cache([
  { name: 'Sifatul', review: 'একই রিভিউ', images: ['first.jpg'] },
  { name: 'Sifatul', review: 'একই রিভিউ', images: ['second.jpg'] },
  { name: 'Noman', review: 'ছবি নেই', images: [] }
]);
behavior.render();
const renderedHrefs = () => cards.map((card) => card.target.children.map((child) => child.href));
assert.deepStrictEqual(renderedHrefs(), [['first.jpg'], ['second.jpg'], []]);
behavior.render();
assert.deepStrictEqual(renderedHrefs(), [['first.jpg'], ['second.jpg'], []]);

function expect(pattern, message) {
  if (!pattern.test(snippet)) throw new Error(message);
}

expect(/if \(window\.XMLHttpRequest\)/, 'XHR reliability bridge must run on every host');
expect(/args\[1\] = preview\s*\? '\/storefront-review-upload\?convert=yes&width=300&quality=85'\s*: 'https:\/\/apisub\.amolbooks\.com\/api\/v2\/upload\/single-image\?convert=yes&width=300&quality=85'/, 'review uploads must carry conversion parameters even when the legacy uploader bypasses the XHR send hook');
assert.match(main, /sharp\(req\.file\.buffer\)\s*\.rotate\(\)\s*\.resize\(300\)\s*\.webp\(\{ effort: 4, quality: 85 \}\)/, 'the preview upload bridge must flatten EXIF orientation before publishing');
assert.match(main, /https:\/\/apisub\.amolbooks\.com\/api\/upload\/single-image'/, 'the preview bridge must persist the normalized WebP in published storage');
assert.match(uploadController, /body\?\.\['convert'\] \?\? req\.query\?\.\['convert'\]/, 'v2 uploads must accept conversion parameters from the request URL');
expect(/this\.timeout = 90000/, 'review uploads need a 90-second timeout');
expect(/__arrUploadFinished/, 'upload completion must be idempotent');
expect(/nativeOpen\.apply\(this, args\);\s*this\.__arrUploadStarted = true/, 'legacy native-send uploads must be tracked from open');
expect(/রিভিউ জমা হয়নি। আবার চেষ্টা করুন—আপনার ছবিটি সংরক্ষিত আছে।/, 'failed review submissions need a visible cached-image retry message');
expect(/else if \(xhr\.__arrReviewKey && sameReviewPage\) \{\s*reviewError\(\)/, 'failed review submissions must preserve cached images and show the error');
expect(/function responsePayload\(xhr\) \{\s*try \{ return JSON\.parse\(xhr\.responseText\); \} catch \(_\) \{ return null; \}/, 'review responses must be parsed safely');
expect(/this\.__arrSlug = slug\(\)/, 'review requests must capture their originating product slug');
expect(/var key = this\.__arrSlug/, 'review submissions must keep the slug captured when the request opened');
expect(/var sameReviewPage = xhr\.__arrSlug === slug\(\)/, 'stale review responses must be ignored after navigation');
expect(/xhr\.__arrReviewKey && sameReviewPage && xhr\.status >= 200 && xhr\.status < 300 && payload && payload\.success === true/, 'review images must clear only after an explicit logical success');
expect(/\/review\\\/get-all-review-by-query\$/, 'review-list failures must be tracked');
expect(/failedReviewSlug = xhr\.__arrSlug;\s*retryMissingReviews\(\)/, 'failed review reads must trigger recovery for their originating product');
expect(/xhr\.status < 200 \|\| xhr\.status >= 300 \|\| !payload \|\| payload\.success === false \|\| !Array\.isArray\(payload\.data\)/, 'HTTP, malformed, logical, and invalid review-list responses must trigger recovery');
expect(/failedReviewSlug !== key && \(!count \|\| count < 1\)/, 'missing reviews must retry after failure or a positive count');
expect(/\.product-menu button, \[role="tab"\], \.mat-tab-label, \.mat-mdc-tab/, 'native and Material review tabs must be supported');
expect(/review\|রিভিউ/i, 'English and Bengali review labels must be supported');
expect(/document\.querySelector\('\.user-review'\)/, 'rendered reviews must stop recovery');
expect(/retries >= 2/, 'review recovery must stop after two retries');
expect(/next\[key\]\.push\(Array\.isArray\(record\.images\)/, 'duplicate exact review keys must retain API ordering');
expect(/var images = null/, 'each review card must begin without inherited images');
expect(/positions\[recordKey\] = position \+ 1/, 'duplicate exact review keys must be consumed in DOM order');
expect(/\.user-name span, \.user-name a/, 'review mapping must read the rendered reviewer name across storefront variants');
expect(/\.user-review-data > p/, 'review mapping must read the full rendered review text');
expect(/card\.querySelector\('\.review-product-img-main'\)/, 'images must render only in the matched card image container');
expect(/data-arr-signature/, 'review image rendering must be idempotent');
expect(/link\.addEventListener\('click',[\s\S]*?event\.preventDefault\(\);[\s\S]*?openReviewLightbox\(this\.href\)/, 'review images must open in the in-page lightbox');
assert.ok(!/link\.target\s*=\s*'_blank'/.test(snippet), 'review images must not open a separate browser tab');
expect(/lightbox\.setAttribute\('role', 'dialog'\)/, 'the image lightbox must expose dialog semantics');
expect(/lightbox\.setAttribute\('aria-modal', 'true'\)/, 'the image lightbox must be announced as modal');
expect(/event\.key === 'Escape'/, 'the image lightbox must close with Escape');
expect(/\.arr-review-lightbox \{/, 'the image lightbox must cover the current page');
expect(/document\.addEventListener\('change', enforceReviewImageLimit, true\)/, 'the five-photo limit must run before the legacy picker');
expect(/সর্বোচ্চ ৫টি ছবি যোগ করা যাবে।/, 'customers must see the review photo limit');
assert.match(reviewDto, /@IsArray\(\)\s*@ArrayMaxSize\(5\)\s*@IsString\(\{ each: true \}\)\s*images: string\[\]/, 'the review API must reject more than five photos');
expect(/removeLegacyImageStrips\(card\)/, 'legacy unclassed image strips must be removed');
expect(/window\._riuMap = \{\}/, 'legacy name-only image cache must be neutralized');
expect(/clearTimeout\(repairTimer\);\s*repairTimer = setTimeout\(function \(\) \{ renderReviewImages\(\); paginateReviews\(\); \}, 60\)/, 'legacy image repairs must be debounced');
expect(/else \{\s*if \(failedReviewSlug === xhr\.__arrSlug\) failedReviewSlug = '';\s*cacheReviewRecords\(payload\.data\)/, 'only valid review-list payloads may replace the exact-card cache');
expect(/role', 'status'/, 'successful review submission needs an accessible status toast');
expect(/আপনার রিভিউ অনুমোদনের জন্য পাঠানো হয়েছে।/, 'successful review submission needs the approval message');
expect(/@media \(max-width: 430px\)/, 'review dialog needs iPhone-sized responsive rules');
expect(/\.cdk-overlay-pane\.arr-review-dialog/, 'responsive rules must be scoped to the review dialog');
expect(/min-width: 44px; min-height: 44px/, 'review controls need mobile touch targets');
expect(/position: sticky; bottom: 0/, 'review actions must remain reachable on a small screen');

if (!/storefrontSnippetFiles\s*=\s*\[[\s\S]*?'review-reliability\.html'/.test(main)) {
  throw new Error('main.ts must inject review-reliability.html');
}

console.log('review reliability checks passed');

const fullRequestSource = browserJs.match(/function fullProductReviewRequest\(body\) \{[\s\S]*?\n  \}/)[0];
const fullRequest = new Function('slug', fullRequestSource + '; return fullProductReviewRequest;')(() => 'productive%20muslim');
const productQuery = { filter: { 'product._id': 'book-id', status: true }, pagination: { pageSize: 5, currentPage: 0 }, select: { review: 1 } };
assert.strictEqual(JSON.parse(fullRequest(JSON.stringify(productQuery))).pagination, undefined);
assert.deepStrictEqual(JSON.parse(fullRequest(JSON.stringify(productQuery))).filter, productQuery.filter);
assert.strictEqual(fullRequest('{broken'), '{broken');
const homeQuery = JSON.stringify({ filter: { isReview: true }, pagination: { pageSize: 6, currentPage: 0 } });
assert.strictEqual(fullRequest(homeQuery), homeQuery, 'homepage review requests stay unchanged');
const paginateSource = browserJs.match(/function paginateReviews\(\) \{[\s\S]*?\n  \}/)[0];
const reviewCards = Array.from({ length: 18 }, () => ({ hidden: false, classList: { toggle(name, hidden) { this.card.hidden = hidden; } } }));
reviewCards.forEach(card => { card.classList.card = card; });
const nav = { __arrCount: 18, __arrPage: 0 };
const reviewRoot = { __arrSlug: 'book', __arrPage: 0, querySelectorAll: () => reviewCards, querySelector: () => nav };
const paginate = new Function('document', 'slug', 'var fullReviews = [], fullReviewSlug = \"\";' + paginateSource + '; return paginateReviews;')({ querySelector: () => reviewRoot }, () => 'book');
for (let page = 0; page < 4; page++) {
  reviewRoot.__arrPage = nav.__arrPage = page;
  paginate();
  assert.strictEqual(reviewCards.filter(card => !card.hidden).length, page === 3 ? 3 : 5);
  assert.strictEqual(reviewCards[page * 5].hidden, false);
}
assert.match(snippet, /app-product-details app-all-reviews \.user-img-rev/);
console.log('Review pagination checks passed (18 reviews: 5/5/5/3).');

assert.match(browserJs, /nativeCard\.cloneNode\(true\)/, 'must render records beyond Angular allReviews.slice(0,5)');
assert.match(browserJs, /r < fullReviews\.length/, 'render every approved API review');
assert.match(snippet, /arr-has-full-reviews \.user-review:not\(\[data-arr-card\]\)/, 'hide truncated native list');
