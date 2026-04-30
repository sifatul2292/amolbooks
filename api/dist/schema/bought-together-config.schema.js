"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoughtTogetherConfigSchema = void 0;
const mongoose = require("mongoose");
exports.BoughtTogetherConfigSchema = new mongoose.Schema({
    productIds: { type: [String], required: true, default: [] },
}, { versionKey: false, timestamps: true });
//# sourceMappingURL=bought-together-config.schema.js.map