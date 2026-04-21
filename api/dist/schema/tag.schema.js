"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagSchema = void 0;
const mongoose = require("mongoose");
exports.TagSchema = new mongoose.Schema({
    readOnly: {
        type: Boolean,
        required: false,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    image: {
        type: String,
        required: false,
    },
    url: {
        type: String,
        required: false,
    },
    priority: {
        type: Number,
        required: false,
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=tag.schema.js.map