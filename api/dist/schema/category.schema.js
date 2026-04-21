"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategorySchema = void 0;
const mongoose = require("mongoose");
exports.CategorySchema = new mongoose.Schema({
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
        trim: true,
        unique: true,
    },
    image: {
        type: String,
        required: false,
    },
    mobileImage: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    serial: {
        type: Number,
        required: false,
    },
    status: {
        type: String,
        required: false,
        default: 'publish',
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=category.schema.js.map