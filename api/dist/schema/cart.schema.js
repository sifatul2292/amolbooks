"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
exports.CartSchema = new mongoose.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: false,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    selectedQty: {
        type: Number,
        required: true,
    },
    specialPackage: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'SpecialPackage',
        required: false,
    },
    cartType: {
        type: Number,
        required: true,
        default: 0,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=cart.schema.js.map