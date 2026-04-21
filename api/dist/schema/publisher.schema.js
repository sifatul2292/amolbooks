"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublisherSchema = void 0;
const mongoose = require("mongoose");
exports.PublisherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    nameEn: {
        type: String,
        required: false,
    },
    image: {
        type: String,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=publisher.schema.js.map