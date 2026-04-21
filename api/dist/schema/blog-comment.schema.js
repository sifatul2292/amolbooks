"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogCommentSchema = void 0;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
exports.BlogCommentSchema = new mongoose.Schema({
    readOnly: {
        type: Boolean,
        required: false,
    },
    name: {
        type: String,
        required: false,
    },
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
    blog: {
        _id: {
            type: Schema.Types.ObjectId,
            ref: 'Blog',
        },
        name: {
            type: String,
        },
        image: {
            type: String,
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
    isComment: {
        type: Boolean,
        required: false,
    },
    rating: {
        type: Number,
        required: false,
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
    email: {
        type: String,
        required: false,
    },
    phoneNo: {
        type: String,
        required: false,
    },
    address: {
        type: String,
        required: false,
    },
    message: {
        type: String,
        required: false,
    },
    emailSent: {
        type: Boolean,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=blog-comment.schema.js.map