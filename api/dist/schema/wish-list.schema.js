"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishListSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
exports.WishListSchema = new mongoose.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
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
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=wish-list.schema.js.map