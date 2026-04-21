"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderOfferSchema = void 0;
const mongoose = require("mongoose");
exports.OrderOfferSchema = new mongoose.Schema({
    firstOrderDiscountAmount: {
        type: Number,
        required: false,
    },
    firstOrderDiscountType: {
        type: Number,
        required: false,
    },
    firstOrderMinAmount: {
        type: Number,
        required: false,
    },
    monthOrderDiscountAmount: {
        type: Number,
        required: false,
    },
    monthOrderDiscountType: {
        type: Number,
        required: false,
    },
    monthOrderMinAmount: {
        type: Number,
        required: false,
    },
    monthOrderValue: {
        type: Number,
        required: false,
    },
    amountOrderDiscountAmount: {
        type: Number,
        required: false,
    },
    amountOrderDiscountType: {
        type: Number,
        required: false,
    },
    amountOrderMinAmount: {
        type: Number,
        required: false,
    },
    amount2OrderDiscountAmount: {
        type: Number,
        required: false,
    },
    amount2OrderDiscountType: {
        type: Number,
        required: false,
    },
    amount2OrderMinAmount: {
        type: Number,
        required: false,
    },
    amount3OrderDiscountAmount: {
        type: Number,
        required: false,
    },
    amount3OrderDiscountType: {
        type: Number,
        required: false,
    },
    amount3OrderMinAmount: {
        type: Number,
        required: false,
    },
    appsOrderDiscountAmount: {
        type: Number,
        required: false,
    },
    appsOrderDiscountType: {
        type: Number,
        required: false,
    },
    appsOrderMinAmount: {
        type: Number,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=order-offer.schema.js.map