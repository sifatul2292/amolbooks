// Isolated analytics fixtures; no application database or credentials needed.
const assert = require('node:assert/strict');
require('../api/node_modules/reflect-metadata');
const { DecisionDashboardService } = require('../api/dist/pages/dashboard/decision-dashboard.service');
const { OrderStatus } = require('../api/dist/enum/order.enum');

const bookId = '000000000000000000000001';
const packageId = '000000000000000000000002';
const date = '2026-11-19';
const line = (id, extra = {}) => ({ _id: id, quantity: 1, salePrice: 500, ...extra });
const order = (id, items, extra = {}) => ({
  _id: id, createdAt: `${date}T06:00:00Z`, orderStatus: OrderStatus.DELIVERED,
  grandTotal: 1200, deliveryCharge: 60, actualCourierCost: 60,
  packagingCost: 2.5, paymentFee: 12, orderedItems: items, ...extra,
});

async function report(orders, packages, products = [{ _id: bookId, costPrice: 100 }], previousOrders = []) {
  const service = Object.create(DecisionDashboardService.prototype);
  service.getOrders = async (start) => start.toISOString() === '2026-11-18T18:00:00.000Z' ? orders : previousOrders;
  service.getManualSales = async () => [];
  service.getSpendRows = async (start) => [{ date: start, spend: 50 }];
  service.getCustomerHistory = async () => new Map();
  service.getGa4Analytics = async () => ({ available: false, funnel: {}, products: {} });
  service.attachExperimentState = async () => {};
  service.productModel = { find: () => ({ select: () => ({ lean: async () => products }) }) };
  service.specialPackageModel = { find: ({ _id }) => {
    assert.ok(_id.$in.includes(packageId), 'look up unresolved package IDs');
    assert.ok(!_id.$in.includes(bookId), 'ordinary products need no package lookup');
    return { select: () => ({ populate: (field, select) => {
      assert.equal(field, 'products.product');
      assert.ok(select.includes('costPrice'));
      return { lean: async () => packages };
    } }) };
  } };
  return (await service.getDecisionAnalytics(date, date)).data;
}

async function main() {
  const specialPackage = {
    _id: packageId, name: 'সফল উদ্যোক্তা বান্ডেল',
    products: [{ product: { costPrice: 100 }, quantity: 2 }, { product: { costPrice: 50 }, quantity: 1 }],
  };
  const items = [line(bookId), line(packageId, { name: specialPackage.name, quantity: 2 })];
  const orders = [order('mixed', items)];
  let data = await report(orders, [specialPackage]);
  // COGS = 100 + 2*(2*100+50) = 600; contribution = 1200-600-60-2.5-12-50.
  assert.equal(data.summary.expectedContribution.amount, 475.5);
  assert.equal(data.summary.expectedContribution.basis, 'estimated');
  assert.equal(data.summary.realizedContribution.amount, 475.5);
  assert.equal(data.profitBridge.expected.productCost.amount, 600);
  assert.equal(data.profitBridge.expected.profit.amount, 475.5);
  assert.equal(data.trend[0].expectedContribution, 475.5);
  assert.equal(data.dataQuality.cogsCoverage, 100);
  assert.equal(data.dataQuality.historicalCogsCoverage, 0);
  const row = data.productPerformance.rows.find((row) => row.productId === packageId);
  assert.equal(row.contribution.amount, 500);
  assert.equal(row.contribution.basis, 'estimated');
  assert.equal(row.units, 2);

  data = await report([], [specialPackage], [], [order('prior', [items[1]], { createdAt: '2026-11-18T06:00:00Z' })]);
  assert.equal(data.comparison.expectedContribution.previous, 575.5, 'packages in comparison-only orders are resolved');

  // Existing snapshots always win, including when the package has been removed.
  data = await report([order('saved', [line(packageId, { costPriceAtOrder: 175, quantity: 2 })])], []);
  assert.equal(data.summary.expectedContribution.amount, 725.5);
  assert.equal(data.summary.expectedContribution.basis, 'actual');
  assert.equal(data.productPerformance.rows[0].contribution.amount, 650);
  data = await report([order('saved', [line(packageId, { costPriceAtOrder: 175, quantity: 2 })])], [specialPackage]);
  assert.equal(data.summary.expectedContribution.amount, 725.5, 'catalog changes cannot replace a saved snapshot');

  // Incomplete/malformed packages must never silently contribute zero/partial COGS.
  for (const products of [[], [{ product: null }], [{ product: { costPrice: null } }],
    [{ product: { costPrice: '' } }], [{ product: { costPrice: -1 } }],
    [{ product: { costPrice: 100 } }, { product: {} }]]) {
    data = await report(orders, [{ ...specialPackage, products }]);
    assert.equal(data.summary.expectedContribution.amount, null);
    assert.equal(data.productPerformance.rows.find((row) => row.productId === packageId).contribution.amount, null);
  }
  data = await report(orders, []);
  assert.equal(data.summary.expectedContribution.amount, null, 'deleted legacy package stays unavailable');
  data = await report(orders, [{ ...specialPackage, products: [{ product: { costPrice: 0 }, quantity: 1 }] }]);
  assert.equal(data.summary.expectedContribution.amount, 975.5, 'explicit zero cost is valid');
  data = await report([order('book', [line(bookId)])], []);
  assert.equal(data.summary.expectedContribution.amount, 975.5, 'ordinary book calculation stays unchanged');
  console.log('Profit dashboard package checks passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
