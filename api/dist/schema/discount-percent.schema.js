"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountPercentSchema = void 0;
const mongoose = require("mongoose");
exports.DiscountPercentSchema = new mongoose.Schema({
    readOnly: {
        type: Boolean,
        required: false,
    },
    discountType: {
        type: String,
        required: true,
        trim: true,
    },
    discountPercent: {
        type: Number,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=discount-percent.schema.js.map