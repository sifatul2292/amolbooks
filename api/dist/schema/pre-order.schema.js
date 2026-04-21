"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreOrderSchema = void 0;
const mongoose = require("mongoose");
exports.PreOrderSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    phoneNo: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: false,
        trim: true,
    },
    status: {
        type: String,
        required: false,
        default: 'pending',
        enum: ['pending', 'completed', 'cancelled'],
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=pre-order.schema.js.map