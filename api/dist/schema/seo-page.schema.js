"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeoPageSchema = void 0;
const mongoose = require("mongoose");
exports.SeoPageSchema = new mongoose.Schema({
    readOnly: {
        type: Boolean,
        required: false,
    },
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
    image: {
        type: String,
        required: false,
    },
    pageName: {
        type: String,
        required: false,
    },
    seoDescription: {
        type: String,
        required: false,
    },
    keyWord: {
        type: String,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=seo-page.schema.js.map