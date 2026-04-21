"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdditionalPageSchema = void 0;
const mongoose = require("mongoose");
exports.AdditionalPageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    isHtml: {
        type: Boolean,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=additional-page.schema.js.map