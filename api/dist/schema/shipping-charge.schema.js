"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingChargeSchema = void 0;
const mongoose = require("mongoose");
const ShippingChargeRuleSchema = new mongoose.Schema({
    fromGram: {
        type: Number,
        required: true,
        min: 0,
    },
    toGram: {
        type: Number,
        required: true,
        min: 0,
    },
    cost: {
        type: Number,
        required: true,
        min: 0,
    },
});
exports.ShippingChargeSchema = new mongoose.Schema({
    deliveryInDhaka: {
        type: Number,
        required: true,
    },
    deliveryOutsideDhaka: {
        type: Number,
        required: true,
    },
    deliveryOutsideBD: {
        type: Number,
        required: false,
    },
    insideDhakaRules: {
        type: [ShippingChargeRuleSchema],
        required: false,
    },
    outsideDhakaRules: {
        type: [ShippingChargeRuleSchema],
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=shipping-charge.schema.js.map