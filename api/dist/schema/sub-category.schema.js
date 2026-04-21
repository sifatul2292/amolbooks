"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubCategorySchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
exports.SubCategorySchema = new mongoose.Schema({
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
    priority: {
        type: Number,
        required: false,
    },
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
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
//# sourceMappingURL=sub-category.schema.js.map