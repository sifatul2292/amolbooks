const assert = require('node:assert/strict');
const mongoose = require('../api/node_modules/mongoose');
const {
  ShippingChargeSchema,
} = require('../api/dist/schema/shipping-charge.schema');

const Model = mongoose.model(
  'ShippingChargePersistenceCheck',
  ShippingChargeSchema,
);
const payload = {
  deliveryInDhaka: 60,
  deliveryOutsideDhaka: 75,
  insideDhakaRules: [{ fromGram: 0, toGram: 500, cost: 60 }],
  outsideDhakaRules: [{ fromGram: 501, toGram: 1000, cost: 95 }],
};
const query = Model.findOneAndUpdate({}, { $set: payload });
const castUpdate = query._castUpdate(query.getUpdate()).$set;

assert.equal(castUpdate.insideDhakaRules[0].toGram, 500);
assert.equal(castUpdate.outsideDhakaRules[0].cost, 95);
console.log('Shipping-charge persistence check passed');
