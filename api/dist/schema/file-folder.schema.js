"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileFolderSchema = void 0;
const mongoose = require("mongoose");
exports.FileFolderSchema = new mongoose.Schema({
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
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=file-folder.schema.js.map