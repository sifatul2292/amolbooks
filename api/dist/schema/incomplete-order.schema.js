"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncompleteOrderSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
exports.IncompleteOrderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: false,
    },
    name: {
        type: String,
        required: false,
        trim: true,
    },
    phoneNo: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: false,
    },
    city: {
        type: String,
        required: false,
    },
    shippingAddress: {
        type: String,
        required: false,
    },
    paymentType: {
        type: String,
        required: false,
    },
    paymentStatus: {
        type: String,
        required: false,
    },
    orderStatus: {
        type: Number,
        required: false,
    },
    grandTotal: {
        type: Number,
        required: false,
    },
    subTotal: {
        type: Number,
        required: false,
    },
    discount: {
        type: Number,
        required: false,
    },
    checkoutDate: {
        type: String,
        required: false,
    },
    status: {
        type: String,
        required: false,
    },
    orderedItems: {
        type: [mongoose_1.Schema.Types.Mixed],
        required: false,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=incomplete-order.schema.js.map