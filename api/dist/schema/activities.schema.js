"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivitiesSchema = void 0;
const mongoose = require("mongoose");
exports.ActivitiesSchema = new mongoose.Schema({
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
    totalView: {
        type: Number,
        required: false,
        default: 0,
    },
    authorName: {
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
    shortDescEn: {
        type: String,
        required: false,
    },
    priority: {
        type: Number,
        required: false,
    },
    shortDesc: {
        type: String,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=activities.schema.js.map