"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaTokenSchema = exports.MetaAdSpendSchema = void 0;
const mongoose_1 = require("mongoose");
exports.MetaAdSpendSchema = new mongoose_1.Schema({
    date: { type: String, required: true },
    spend: { type: Number, required: true, default: 0 },
    source: { type: String, enum: ['manual', 'api'], default: 'manual' },
    currency: { type: String, default: 'BDT' },
    breakdown: {
        type: [{
                campaignId: String,
                campaignName: String,
                adSetId: String,
                adSetName: String,
                adId: String,
                adName: String,
                spend: { type: Number, default: 0 },
            }],
        default: [],
    },
}, { timestamps: true });
exports.MetaAdSpendSchema.index({ date: 1 }, { unique: true });
exports.MetaTokenSchema = new mongoose_1.Schema({
    accessToken: { type: String },
    adAccountId: { type: String },
    lastSync: { type: Date },
    expiresAt: { type: Date },
}, { timestamps: true });
//# sourceMappingURL=meta-ad-spend.schema.js.map