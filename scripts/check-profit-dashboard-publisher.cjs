// Profit & Growth → Product performance: each sold book shows its publication (প্রকাশনী).
// Needs a built API (cd api && npx nest build). Run: node scripts/check-profit-dashboard-publisher.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
require(root + '/api/node_modules/reflect-metadata');
const {
  DecisionDashboardService,
} = require('../api/dist/pages/dashboard/decision-dashboard.service');

// 1. API rows carry the publisher name.
const service = Object.create(DecisionDashboardService.prototype);
const ids = { amol: 'a1', sondipon: 'b2', notebook: 'c3', deleted: 'd4' };
const productMap = new Map([
  [ids.amol, { _id: ids.amol, name: 'Book A', costPrice: 70, stock: 40, publisher: { name: 'আমল বুকস' } }],
  // Catalogue publisher wins over the name saved on the order line.
  [ids.sondipon, { _id: ids.sondipon, name: 'Book B', costPrice: 70, stock: 90, publisher: { name: ' সন্দীপন প্রকাশন ' } }],
  [ids.notebook, { _id: ids.notebook, name: 'Amol Notebook', costPrice: 20, stock: 500 }],
]);
const line = (_id, extra) => ({ _id, name: 'Item ' + _id, quantity: 1, salePrice: 300, costPriceAtOrder: 70, ...extra });
const orders = [
  {
    _id: 'o1',
    orderStatus: 1,
    orderOrigin: 'website',
    orderedItems: [
      line(ids.amol),
      line(ids.sondipon, { publisher: { name: 'Old name' } }),
      line(ids.notebook, { publisher: '64f000000000000000000000' }),
    ],
  },
  // Product no longer in the catalogue: fall back to the order line's saved publisher.
  { _id: 'o2', orderStatus: 1, orderOrigin: 'admin', orderedItems: [line(ids.deleted, { publisher: { _id: 'p9', name: 'সমকালীন প্রকাশন' } })] },
];
const performance = service.buildProductPerformance(orders, productMap, {}, 7);
const byId = Object.fromEntries(performance.rows.map((row) => [row.productId, row]));
assert.equal(byId[ids.amol].publisher, 'আমল বুকস');
assert.equal(byId[ids.sondipon].publisher, 'সন্দীপন প্রকাশন');
assert.equal(byId[ids.notebook].publisher, null, 'no publisher → null (an id string is not a name)');
assert.equal(byId[ids.deleted].publisher, 'সমকালীন প্রকাশন');
assert.equal(performance.rows.length, 4);

// 2. The service asks MongoDB for the publisher name.
const serviceSource = fs.readFileSync(root + '/api/src/pages/dashboard/decision-dashboard.service.ts', 'utf8');
assert.match(serviceSource, /\.select\('_id name stock quantity totalSold costPrice publisher\.name'\)/);

// 3. The page prints it under the product name, "—" when missing, escaped.
const html = fs.readFileSync(root + '/api/upload/static/profit-dashboard.html', 'utf8');
assert.match(html, /\.product-publisher \{[^}]*display: block;[^}]*\}/);
assert.match(html, /<th>Product \/ publication<\/th>/);
const script = html.slice(html.indexOf('<script>\n(function () {') + 8, html.lastIndexOf('</script>'));
new vm.Script(script); // whole inline script still parses
const pick = (name) => {
  const start = script.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, name + ' not found');
  const ends = ['\n  function ', '\n  window.']
    .map((marker) => script.indexOf(marker, start + 1))
    .filter((index) => index >= 0);
  return script.slice(start, ends.length ? Math.min(...ends) : undefined);
};
const elements = {};
const context = vm.createContext({
  productPublisher: '',
  NO_PUBLISHER: '__none__',
  document: { getElementById: (id) => (elements[id] = elements[id] || { innerHTML: '', textContent: '' }) },
  dashboardData: {
    productPerformance: {
      totalProducts: 3,
      totalUnits: 3,
      rows: [
        { name: 'Book A', publisher: 'আমল বুকস', units: 1, sourceMix: [], netSales: { amount: 300, basis: 'actual' }, contribution: { amount: 230, basis: 'actual' }, margin: { value: 76 }, views: null, conversion: { value: null }, cancellationRate: 0, stockCoverageDays: null, recommendation: 'Scale' },
        { name: 'Notebook', publisher: null, units: 1, sourceMix: [], netSales: { amount: 0, basis: 'actual' }, contribution: { amount: -20, basis: 'actual' }, margin: { value: null }, views: null, conversion: { value: null }, cancellationRate: 0, stockCoverageDays: null, recommendation: 'Monitor' },
        { name: 'Book C', publisher: '<b>X & Y</b>', units: 1, sourceMix: [], netSales: { amount: 300, basis: 'actual' }, contribution: { amount: 230, basis: 'actual' }, margin: { value: 76 }, views: null, conversion: { value: null }, cancellationRate: 0, stockCoverageDays: null, recommendation: 'Scale' },
      ],
    },
  },
});
vm.runInContext(
  ['esc', 'fmt', 'money', 'pct', 'setText', 'sourceClass', 'recClass', 'productSourceMix', 'publisherKey', 'renderPublisherFilter', 'renderProducts']
    .map(pick)
    .join('\n') + '\nrenderProducts();',
  context,
);
const rowsHtml = elements.productRows.innerHTML;
assert.ok(rowsHtml.includes('<td class="product-name">Book A<span class="product-publisher">আমল বুকস</span></td>'));
assert.ok(rowsHtml.includes('<td class="product-name">Notebook<span class="product-publisher">—</span></td>'));
assert.ok(rowsHtml.includes('<span class="product-publisher">&lt;b&gt;X &amp; Y&lt;/b&gt;</span>'));
assert.equal((rowsHtml.match(/<tr>/g) || []).length, 3);
assert.equal((rowsHtml.match(/<td/g) || []).length, 33, 'still 11 columns per row');
assert.equal(elements.productCount.textContent, '3 products · 3 units');

// 4. Publication filter: dropdown lists each publication (+ "No publication"), filters only the table.
assert.match(html, /<select class="control product-filter" id="productPublisher" aria-label="Filter products by publication" onchange="setProductPublisher\(this\.value\)">/);
assert.match(html, /\.product-filter \{ width: 100%; max-width: none; \}/, 'full-width dropdown on phones');
assert.match(script, /window\.setProductPublisher = function \(value\) \{ productPublisher = value \|\| ''; if \(dashboardData\) renderProducts\(\); \};/);
const options = elements.productPublisher.innerHTML;
assert.ok(options.startsWith('<option value="">All publications (3)</option>'));
assert.ok(options.includes('<option value="আমল বুকস">আমল বুকস (1)</option>'));
assert.ok(options.includes('<option value="&lt;b&gt;X &amp; Y&lt;/b&gt;">&lt;b&gt;X &amp; Y&lt;/b&gt; (1)</option>'));
assert.ok(options.endsWith('<option value="__none__">No publication (1)</option>'), 'no-publication option last');
const show = (value) => {
  context.productPublisher = value;
  vm.runInContext('renderProducts()', context);
  return elements.productRows.innerHTML;
};
let shown = show('আমল বুকস');
assert.equal((shown.match(/<tr>/g) || []).length, 1);
assert.ok(shown.includes('Book A'));
assert.equal(elements.productCount.textContent, '1 of 3 products · 1 units');
assert.equal(elements.productPublisher.value, 'আমল বুকস');
shown = show('__none__');
assert.equal((shown.match(/<tr>/g) || []).length, 1);
assert.ok(shown.includes('Notebook'));
// A publication with no sales in the new date range stays selected and says so.
shown = show('সন্দীপন প্রকাশন');
assert.ok(shown.includes('No products from this publication in this range.'));
assert.ok(elements.productPublisher.innerHTML.includes('<option value="সন্দীপন প্রকাশন">সন্দীপন প্রকাশন (0)</option>'));
assert.equal(elements.productCount.textContent, '0 of 3 products · 0 units');
shown = show('');
assert.equal((shown.match(/<tr>/g) || []).length, 3);
assert.equal(elements.productCount.textContent, '3 products · 3 units');

console.log('profit-dashboard publisher check passed');
