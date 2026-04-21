"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeVideoSchema = void 0;
const mongoose = require("mongoose");
exports.YoutubeVideoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: false,
    },
    url: {
        type: String,
        required: false,
    },
    title: {
        type: String,
        required: false,
    },
    titleEn: {
        type: String,
        required: false,
    },
    seoImage: {
        type: String,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=youtube-video.schema.js.map