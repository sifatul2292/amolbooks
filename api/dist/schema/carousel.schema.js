"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarouselSchema = void 0;
const mongoose = require("mongoose");
exports.CarouselSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    image: {
        type: String,
        required: false,
    },
    mobileImage: {
        type: String,
        required: false,
    },
    title: {
        type: String,
        required: false,
    },
    amount: {
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
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=carousel.schema.js.map