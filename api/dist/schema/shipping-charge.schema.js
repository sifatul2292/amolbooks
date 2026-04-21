"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingChargeSchema = void 0;
const mongoose = require("mongoose");
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
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=shipping-charge.schema.js.map