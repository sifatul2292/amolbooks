"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreInfoSchema = void 0;
const mongoose = require("mongoose");
exports.StoreInfoSchema = new mongoose.Schema({
    readOnly: {
        type: Boolean,
        required: false,
    },
    storeName: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    map: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    }
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=store-info.schema.js.map