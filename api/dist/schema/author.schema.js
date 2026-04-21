"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
exports.AuthorSchema = new mongoose.Schema({
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
    address: {
        type: String,
        required: false,
    },
    addressEn: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    descriptionEn: {
        type: String,
        required: false,
    },
    birthDate: {
        type: Date,
        required: false,
    },
    priority: {
        type: Number,
        required: false,
    },
    followers: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
    ],
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=author.schema.js.map