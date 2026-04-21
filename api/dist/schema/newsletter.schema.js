"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsletterSchema = void 0;
const mongoose = require("mongoose");
exports.NewsletterSchema = new mongoose.Schema({
    readOnly: {
        type: Boolean,
        required: false,
    },
    email: {
        type: String,
        required: false,
    },
    number: {
        type: String,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=newsletter.schema.js.map