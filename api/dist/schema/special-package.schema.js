"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialPackageSchema = void 0;
const mongoose = require("mongoose");
const sub_schema_schema_1 = require("./sub-schema.schema");
exports.SpecialPackageSchema = new mongoose.Schema({
    name: {
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
    discountType: {
        type: Number,
        required: false,
    },
    discountAmount: {
        type: Number,
        required: false,
    },
    salePrice: {
        type: Number,
        required: true,
    },
    image: {
        type: String,
        required: false,
    },
    active: {
        type: Boolean,
        required: false,
    },
    gifts: {
        type: [Object],
        required: false,
    },
    products: [sub_schema_schema_1.PACKAGE_ITEMS],
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=special-package.schema.js.map