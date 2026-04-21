"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedirectUrlSchema = void 0;
const mongoose = require("mongoose");
exports.RedirectUrlSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    fromUrl: {
        type: String,
        required: false,
    },
    toUrl: {
        type: String,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=redirect-url.schema.js.map