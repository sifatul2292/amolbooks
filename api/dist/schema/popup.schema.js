"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopupSchema = void 0;
const mongoose = require("mongoose");
exports.PopupSchema = new mongoose.Schema({
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
    description: {
        type: String,
        required: false,
    },
    popUpUrl: {
        type: String,
        required: false,
    },
    priority: {
        type: Number,
        required: false,
    },
    status: {
        type: String,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=popup.schema.js.map