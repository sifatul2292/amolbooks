"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandSchema = void 0;
const mongoose = require("mongoose");
exports.BrandSchema = new mongoose.Schema({
    readOnly: {
        type: Boolean,
        required: false,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    nameEn: {
        type: String,
        required: false,
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
    description: {
        type: String,
        required: false,
    },
    priority: {
        type: Number,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=brand.schema.js.map