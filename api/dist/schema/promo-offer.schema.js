"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoOfferSchema = void 0;
const mongoose = require("mongoose");
const sub_schema_schema_1 = require("./sub-schema.schema");
exports.PromoOfferSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        required: false,
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
    products: [sub_schema_schema_1.PRODUCT_DISCOUNT_OPTIONS],
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=promo-offer.schema.js.map