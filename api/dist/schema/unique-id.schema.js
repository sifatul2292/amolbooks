"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniqueIdSchema = void 0;
const mongoose = require("mongoose");
exports.UniqueIdSchema = new mongoose.Schema({
    orderId: {
        type: Number,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: false,
});
//# sourceMappingURL=unique-id.schema.js.map