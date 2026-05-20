"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualSaleSchema = void 0;
const mongoose_1 = require("mongoose");
exports.ManualSaleSchema = new mongoose_1.Schema({
    date: { type: String, required: true },
    revenue: { type: Number, required: true },
    cost: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    orders: { type: Number, default: 1 },
    source: { type: String, enum: ['whatsapp', 'phone', 'other'], default: 'whatsapp' },
    note: { type: String, default: '' },
}, { timestamps: true });
//# sourceMappingURL=manual-sale.schema.js.map