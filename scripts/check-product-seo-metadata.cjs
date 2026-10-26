const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname, '../api/package.json'));
const { JSDOM } = req('jsdom');
const { ProductService } = require('../api/dist/pages/product/product.service');

async function checkApprovedReviews() {
  const uri = process.env.SEO_TEST_MONGO;
  if (!uri) return;
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\/product_seo_fixture$/);
  const mongoose = req('mongoose');
  const { ReviewSchema } = require('../api/dist/schema/review.schema');
  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    const Review = connection.model('Review', ReviewSchema);
    const Product = connection.model('Product', new mongoose.Schema({}, { strict: false }));
    const category = new mongoose.Types.ObjectId();
    const book = await Product.create({ name: 'Review fixture', slug: 'review-fixture', status: 'publish', salePrice: 100, category: [{ _id: category, name: 'Fixture category' }] });
    await Product.create([
      ...Array.from({ length: 6 }, (_, index) => ({ name: 'Related ' + index, slug: 'related-' + index, status: 'publish', totalSold: index, category: [{ _id: category }] })),
      { name: 'Unpublished', slug: 'unpublished', status: 'draft', totalSold: 999, category: [{ _id: category }] },
      { name: 'Unrelated', slug: 'unrelated', status: 'publish', totalSold: 999, category: [{ _id: new mongoose.Types.ObjectId() }] },
    ]);
    await Review.collection.insertMany([
      { product: { _id: book._id }, status: true, rating: 5 },
      { product: { _id: book._id }, status: true, rating: 4 },
      { product: { _id: book._id }, status: false, rating: 1 },
      { product: { _id: book._id }, status: true, rating: 9 },
      { product: { _id: new mongoose.Types.ObjectId() }, status: true, rating: 1 },
    ]);
    const service = Object.create(ProductService.prototype);
    service.productModel = Product;
    service.reviewModel = Review;
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, send(html) { this.html = html; } };
    await service.getProductOgHtml(book.slug, res);
    assert.equal(res.code, 200);
    const dom = new JSDOM(res.html);
    const schema = JSON.parse(dom.window.document.querySelector('script[type="application/ld+json"]').textContent);
    assert.equal(schema.aggregateRating.ratingValue, 4.5);
    assert.equal(schema.aggregateRating.ratingCount, 2);
    const links = [...dom.window.document.querySelectorAll('nav[aria-label="সম্পর্কিত বই"] a')].map(link => link.href);
    assert.equal(links.length, 4);
    assert.ok(links[0].endsWith('/related-5'));
    assert.ok(links.every(link => !/unpublished|unrelated|review-fixture/.test(link)));
    dom.window.close();
    console.log('PASS: real MongoDB filters approved ratings and limits related links to four published relevant books');
  } finally { await connection.close(); }
}

async function render(overrides = {}, reviews = []) {
  const book = { _id: '6a04d8a16272179445d5efb9', name: 'প্রোডাক্টিভ মুসলিম', nameEn: 'Productive Muslim',
    slug: 'productive muslim', status: 'publish', seoTitle: 'প্রোডাক্টিভ মুসলিম',
    description: '<p>নিজেকে গড়ার বই।</p><p>' + 'বাস্তব জীবনের শিক্ষা। '.repeat(25) + '</p>',
    author: [{ _id: 'author', name: 'মোহাম্মাদ ফারিস', slug: 'মোহাম্মাদ-ফারিস' }],
    publisher: { name: 'আমল বুকস', slug: 'আমল-বুকস' },
    category: [{ _id: 'category', name: 'প্রোডাক্টিভিটি', slug: 'productivity' }],
    edition: '1st Edition 2026', language: ['Bangla'], totalPages: 256,
    isbn: '9789848254547', images: ['https://example.com/cover.webp'], salePrice: 420,
    discountAmount: 105, discountType: 2, quantity: 5, ...overrides };
  const service = Object.create(ProductService.prototype);
  const chain = data => ({ select() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => data });
  service.productModel = { findOne: () => chain(book), find: () => chain([{ _id: 'other', name: 'Related <book>', slug: 'related % book' }]) };
  service.reviewModel = { aggregate: async pipeline => {
    assert.equal(pipeline[0].$match.status, true);
    assert.deepEqual(pipeline[0].$match.rating, { $gte: 1, $lte: 5 });
    return reviews;
  } };
  const response = { statusCode: 200, setHeader() {}, status(n) { this.statusCode = n; return this; }, send(html) { this.html = html; } };
  await service.getProductOgHtml(book.slug, response);
  assert.equal(response.statusCode, 200);
  const dom = new JSDOM(response.html);
  const doc = dom.window.document;
  const schemas = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(n => JSON.parse(n.textContent));
  return { doc, schema: schemas[0], close: () => dom.window.close() };
}
async function main() {
  let result = await render({}, [{ ratingValue: 4.75, ratingCount: 4 }]);
  assert.ok(result.doc.title.includes('মোহাম্মাদ ফারিস'), 'Book-only custom titles gain author context');
  assert.equal(result.doc.title.match(/Amolbooks/g).length, 1);
  const description = result.doc.querySelector('meta[name="description"]').content;
  assert.ok(!description.endsWith('…'), 'Description ends at a sentence/word boundary');
  assert.ok(result.schema.description.length > description.length, 'Schema keeps the full book summary');
  assert.equal(result.schema.publisher.name, 'আমল বুকস');
  assert.equal(result.schema.bookEdition, '1st Edition 2026');
  assert.equal(result.schema.numberOfPages, 256);
  assert.deepEqual(result.schema.inLanguage, ['bn']);
  assert.equal(result.schema.isbn, '9789848254547');
  assert.equal(result.schema.offers.price, '315.00');
  assert.equal(result.schema.aggregateRating.ratingValue, 4.75);
  assert.ok(result.doc.body.textContent.includes('4.75'));
  assert.ok(result.doc.querySelector('a[href*="author-list/author-details/"]'));
  assert.ok(result.doc.querySelector('a[href*="publisher="]'));
  assert.ok(result.doc.querySelector('a[href*="categories="]'));
  assert.ok([...result.doc.querySelectorAll('a')].some(link => link.getAttribute('href').endsWith('related%20%25%20book')), [...result.doc.querySelectorAll('a')].map(link => link.getAttribute('href')).join('\n'));
  assert.ok(result.doc.body.textContent.includes('Related <book>'));
  result.close();
  result = await render({ name: 'দ্য বারাকাহ ইফেক্ট', seoDescription: 'সময় ও জীবনে **বরকত** খোঁজার বই।', description: 'Copied summary about Productive Muslim' });
  assert.equal(result.schema.description, 'সময় ও জীবনে বরকত খোঁজার বই।');
  assert.equal(result.doc.querySelector('meta[name="description"]').content, result.schema.description);
  assert.ok(result.doc.body.textContent.includes('Copied summary'), 'The stored full summary remains available for separate catalogue review');
  result.close();
  result = await render({ seoTitle: 'A carefully written title | Amolbooks', seoDescription: 'A complete custom description.', isbn: '123', totalPages: 0, language: [], edition: '' });
  assert.equal(result.doc.title, 'A carefully written title | Amolbooks');
  assert.equal(result.doc.querySelector('meta[name="description"]').content, 'A complete custom description.');
  for (const field of ['isbn', 'numberOfPages', 'inLanguage', 'bookEdition', 'aggregateRating']) assert.equal(result.schema[field], undefined);
  result.close();
  result = await render({ name: '<script>alert(1)</script>', seoTitle: '', nameEn: '', description: '<img src=x onerror=alert(1)>Safe &amp; useful.', publisher: {}, author: [], category: [], isbn: '' });
  assert.equal(result.doc.querySelectorAll('script:not([type="application/ld+json"])').length, 0);
  assert.ok(!result.doc.querySelector('[onerror]'));
  assert.equal(result.schema.publisher, undefined);
  result.close();
  await checkApprovedReviews();
  console.log('PASS: product title, complete descriptions, verified book fields, approved ratings, escaped links/content and omissions');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
