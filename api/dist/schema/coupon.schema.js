"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponSchema = void 0;
const mongoose = require("mongoose");
exports.CouponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    couponCode: {
        type: String,
        required: true,
    },
    discountType: {
        type: Number,
        required: true,
    },
    discountAmount: {
        type: Number,
        required: true,
    },
    minimumAmount: {
        type: Number,
        required: true,
    },
    bannerImage: {
        type: String,
        required: false,
    },
    startDateTime: {
        type: Date,
        required: true,
    },
    endDateTime: {
        type: Date,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=coupon.schema.js.map