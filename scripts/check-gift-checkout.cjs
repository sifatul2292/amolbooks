// No database writes or gateway calls: exercise the real compiled order/payment services.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const deps = root + '/api/node_modules/';
require(deps + 'reflect-metadata');
const { giftOrderDetails, giftFulfilmentNote } = require('../api/dist/shared/utils/gift-order.util');
const { OrderService } = require('../api/dist/pages/sales/order/order.service');
const { PaymentService } = require('../api/dist/pages/payment/payment.service');
const { OrderSchema } = require('../api/dist/schema/order.schema');
const mongoose = require(deps + 'mongoose');
const { plainToInstance } = require(deps + 'class-transformer');
const { validate } = require(deps + 'class-validator');
const { AddOrderDto } = require('../api/dist/dto/order.dto');
const html = fs.readFileSync(path.join(root, 'gtm-snippets/gift-checkout.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
assert.ok(fs.readFileSync(path.join(root, 'api/src/main.ts'), 'utf8').includes("'gift-checkout.html'"));

const input = {
  name: 'Recipient', phoneNo: '01700000002', shippingAddress: 'Recipient address',
  paymentType: 'online_payment', isGiftOrder: true, giftWrap: true,
  gift: { senderName: ' Sender ', senderPhone: '01700000001', occasion: 'ঈদ', message: 'শুভেচ্ছা', unexpected: 'ignored' },
};
assert.equal(giftOrderDetails({}).giftWrapCharge, 0);
assert.equal(giftOrderDetails({ giftWrap: true }).giftWrapCharge, 0);
assert.equal(giftOrderDetails({ giftWrap: true, giftWrapCharge: -30 }).giftWrapCharge, 0);
assert.equal(giftOrderDetails({ giftWrap: false, giftWrapCharge: 30 }).giftWrapCharge, 0);
assert.equal(giftOrderDetails(input).gift.senderName, 'Sender');
assert.equal(giftOrderDetails({...input,gift:{...input.gift,occasionDate:'2026-12-01',recipientAlternativePhone:'01800000003'}}).gift.occasionDate,'2026-12-01');
assert.equal(giftOrderDetails(input).gift.unexpected, undefined);
for (const update of [
  { paymentType: 'cash_on_delivery' }, { paymentType: '' }, { paymentType: 'unknown' },
  { giftWrap: 'true' }, { isGiftOrder: 'true' }, { gift: {} },
  { gift: { ...input.gift, senderName: ' ' } },
  { gift: { ...input.gift, senderPhone: 'not a phone' } },
  { gift: { ...input.gift, message: 'a'.repeat(121) } },
  { shippingAddress: '' }, { name: 123 }, { phoneNo: 'invalid' },
  { gift:{...input.gift,occasionDate:'2026-02-31'} },
  { gift:{...input.gift,recipientAlternativePhone:'bad'} },
]) assert.throws(() => giftOrderDetails({ ...input, ...update }), error => error.getStatus() === 400);
assert.equal(giftOrderDetails({ ...input, gift: { ...input.gift, message: 'a'.repeat(120) } }).gift.message.length, 120);
assert.match(giftFulfilmentNote(giftOrderDetails(input), 'Keep existing note'), /Keep existing note\nGift order.*Sender.*\nGift wrap: Tk 30\nOccasion: ঈদ\nGift message: শুভেচ্ছা/);

const Schema = mongoose.model('GiftCheckoutFixture', OrderSchema);
const record = new Schema({ orderId: 'FIXTURE', orderStatus:1, paymentStatus:'unpaid', subTotal:200, discount:0, ...input, ...giftOrderDetails(input) });
assert.equal(record.validateSync(), undefined);
assert.equal(record.toObject().giftWrapCharge, 30);
assert.equal(record.toObject().gift.senderName, 'Sender');

// Check the exact production lazy-module hook, composed with the existing free-delivery hook.
const storage = new Map();
const fields = { querySelectorAll: () => [{ reportValidity: () => true }] };
const document = {
  querySelector: selector => selector === '#ab-gift-sender' ? fields : null,
  querySelectorAll: selector => selector.startsWith('#ab-gift-sender') ? [{reportValidity:()=>true}] : [], documentElement: {}, addEventListener() {},
};
const context = { window: { addEventListener() {} }, document,
  location: { pathname: '/checkout', search: '?gift=1', hostname:'localhost', origin:'http://localhost' }, URLSearchParams,
  sessionStorage: { getItem:key => storage.get(key), setItem:(key, value) => storage.set(key, value) },
  MutationObserver: class { observe() {} }, requestAnimationFrame() {} };
vm.runInNewContext(script, context);
const freeDeliveryScript = fs.readFileSync(path.join(root, 'gtm-snippets/package-free-delivery.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInNewContext(freeDeliveryScript, context);
const packageId = require('../api/dist/shared/utils/package-free-delivery.util').FREE_DELIVERY_PACKAGE_ID;
class Checkout {
  constructor() { this.selectedPaymentMethod = 'cash_on_delivery'; this.carts = [{ cartType: 1, selectedQty: 1, product: { _id: packageId } }]; }
  get grandTotal() { return 200 + this.calculateDeliveryCharge(); }
  calculateDeliveryCharge() { return 75; }
  initForm() { const control = { value: 'cash_on_delivery', setValue(value) { this.value = value; } }; this.formData = { get: () => control }; }
  onConfirmOrder() {}
  addOrder(data) { this.sent = data; }
  getLoggedInUserData() {}
}
function CheckoutModule() {}
CheckoutModule.ɵinj = { imports: [{ providers: [{ useValue: [{ component: Checkout }] }] }] };
const chunks = context.window.webpackChunkangular_ui;
const parentPush = chunks.push.bind(chunks);
chunks.push = chunk => parentPush(chunk);
chunks.push([[583], { 1(module) { module.exports = { CheckoutModule }; } }]);
chunks[0][1][1]({ exports: {} });
const checkout = new Checkout();
checkout.initForm();
assert.equal(checkout.selectedPaymentMethod, 'online_payment');
assert.equal(checkout.formData.get('paymentMethod').value, 'online_payment');
assert.equal(checkout.grandTotal, 200, 'Free-delivery hook composes with gift hook');
checkout.addOrder({ paymentType: 'cash_on_delivery' });
assert.equal(checkout.sent.isGiftOrder, true);
assert.equal(checkout.sent.paymentType, 'online_payment');
context.location.search = '';
checkout.addOrder({ paymentType: 'cash_on_delivery' });
assert.equal(checkout.sent.isGiftOrder, false);
assert.equal(checkout.sent.paymentType, 'cash_on_delivery', 'Ordinary orders retain COD');

async function main() {
  assert.equal((await validate(plainToInstance(AddOrderDto, input))).length, 0);
  assert.ok((await validate(plainToInstance(AddOrderDto, { ...input, gift: { ...input.gift, message: 'a'.repeat(121) } }))).some(error => error.property === 'gift'));
  const service = Object.create(OrderService.prototype);
  const book = { _id:'000000000000000000000001', salePrice:200 };
  const bundle = { _id:packageId, salePrice:1000, products:[] };
  service.productModel = { find: async () => [book] };
  service.specialPackageModel = { find: () => ({ populate: async () => [bundle] }) };
  service.utilsService = { transform:(product, field, qty=1) => field === 'discountAmount' ? 0 : Number(product.salePrice) * qty, getDateString:() => '2026-11-25' };
  service.getProductUnitCostSnapshot = () => 0;
  service.evaluateGiftLine = async () => ({ _id:'000000000000000000000003', quantity:1, salePrice:0, orderType:'gift' });
  service.calculateCouponDiscount = async () => 20;
  service.calculateOrderDiscount = async () => 10;
  service.calculateWeightBasedDeliveryCharge = () => 90;
  service.normalizeAttribution = () => undefined;
  const cart = { carts:[], cartData:[{ cartType:0, product:book._id, selectedQty:2 }], deliveryCharge:75 };
  let order = await service.newOrderMake({ ...input, ...cart, giftWrapCharge:-999, grandTotal:1 });
  assert.equal(order.grandTotal, 475, '400 + 75 - 20 - 10 + 30; ignore submitted fee/total');
  assert.equal(order.giftWrapCharge, 30);
  assert.equal(order.name, input.name, 'Recipient remains the courier recipient');
  assert.equal(order.orderedItems.length, 2, 'Keep earned free notebook');
  assert.match(order.note, /Gift wrap: Tk 30/);
  order = await service.newOrderMake({ ...input, ...cart, giftWrap:false });
  assert.equal(order.grandTotal, 445);
  order = await service.newOrderMake({ ...cart, paymentType:'cash_on_delivery',giftWrap:true,giftWrapCharge:30 });
  assert.equal(order.grandTotal, 445, 'Ordinary checkout ignores a stale/client-supplied wrapping selection');
  assert.equal(order.giftWrap,false);
  assert.equal(order.giftWrapCharge,0);
  cart.cartData.push({ cartType:1, specialPackage:packageId, selectedQty:1 });
  order = await service.newOrderMake({ ...input, ...cart });
  assert.equal(order.deliveryCharge, 0);
  assert.equal(order.grandTotal, 1400, 'Free delivery does not waive gift wrapping');
  const savedCart = [ { cartType:0, product:book, selectedQty:2 }, { cartType:1, specialPackage:bundle, selectedQty:1 } ];
  const chain = { populate() { return this; }, then(resolve) { return Promise.resolve(savedCart).then(resolve); } };
  service.cartModel = { find:() => chain };
  order = await service.newOrderMake({ ...input, ...cart, user:'000000000000000000000002' });
  assert.equal(order.grandTotal, 1400, 'Signed-in mixed carts charge wrapping once');
  await assert.rejects(service.addOrder({ ...input, paymentType:'cash_on_delivery' }), error => error.getStatus() === 400);

  const { DeliveryZoneService } = require('../api/dist/shared/delivery-zone/delivery-zone.service');
  const delivery = Object.create(DeliveryZoneService.prototype);
  delivery.shippingCharge = async () => ({deliveryInDhaka:60,deliveryOutsideDhaka:75});
  delivery.cartWeight = async () => 200;
  delivery.logger = {log(){},warn(){}};
  service.deliveryZoneService = delivery;
  const regional = await service.newOrderMake({...input,carts:[],cartData:[{cartType:0,product:book._id,selectedQty:1}],shippingAddress:'House 1',deliveryCharge:60,deliveryLocation:{district:'feni',area:''}});
  assert.equal(regional.deliveryCharge,100,'Gift recipient district uses real small-order delivery rules');
  assert.equal(regional.grandTotal,300,'200 books + 100 shipping - 20 coupon - 10 offer + 30 wrap');
  assert.equal(regional.deliveryLocation.district,'feni');
  assert.equal(regional.city,'Feni');
  assert.ok(regional.shippingAddress.includes('ফেনী'));

  const payment = Object.create(PaymentService.prototype);
  let gatewayInput;
  payment.eps = { isConfigured:() => false };
  payment.orderModel = { findOne:() => ({ select:async () => order }) };
  payment.sslService = { sslInit:async data => { gatewayInput = data; return {}; } };
  await payment.initSSLPayment({ tran_id:'FIXTURE', total_amount:1 });
  assert.equal(gatewayInput.total_amount, 1400, 'Gateway charges saved total including wrapping');
  order = { grandTotal:200 };
  await payment.initSSLPayment({ tran_id:'NORMAL', total_amount:200 });
  assert.equal(gatewayInput.total_amount, 200, 'Keep ordinary payment handoff');
  console.log('Gift checkout checks passed: validation, COD rejection, guest/signed-in totals, discounts, notebook, free delivery, persistence, lazy hooks and gateway amount.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
