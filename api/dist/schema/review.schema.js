"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewSchema = void 0;
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
exports.ReviewSchema = new mongoose.Schema({
    user: {
        _id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        name: {
            type: String,
        },
        profileImg: {
            type: String,
        },
    },
    product: {
        _id: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
        },
        name: {
            type: String,
        },
        images: {
            type: [String],
        },
        slug: {
            type: String,
        },
    },
    reviewDate: {
        type: Date,
        required: false,
        default: Date.now(),
    },
    review: {
        type: String,
        required: true,
    },
    isReview: {
        type: Boolean,
        required: false,
    },
    rating: {
        type: Number,
        required: true,
    },
    status: {
        type: Boolean,
        required: true,
    },
    reply: {
        type: String,
        required: false,
    },
    replyDate: {
        type: Date,
        required: false,
    },
}, {
    timestamps: true,
    versionKey: false,
});
//# sourceMappingURL=review.schema.js.map