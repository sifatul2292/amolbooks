"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpSchema = void 0;
const mongoose = require("mongoose");
exports.OtpSchema = new mongoose.Schema({
    phoneNo: {
        type: String,
        required: true,
        unique: true,
    },
    code: {
        type: String,
        required: true,
    },
    expireTime: {
        type: String,
        required: false,
    },
    count: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    versionKey: false,
    timestamps: { createdAt: false, updatedAt: true },
});
//# sourceMappingURL=otp.schema.js.map