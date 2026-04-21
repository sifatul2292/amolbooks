"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
exports.UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false,
    },
    username: {
        type: String,
        required: false,
        unique: false,
    },
    password: {
        type: String,
        required: false,
    },
    phoneNo: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: false,
    },
    image: {
        type: String,
        required: false,
    },
    birthDate: {
        type: String,
        required: false,
    },
    gender: {
        type: String,
        required: false,
    },
    profileImg: {
        type: String,
    },
    registrationType: {
        type: String,
        required: false,
    },
    hasAccess: {
        type: Boolean,
        required: true,
    },
    carts: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Cart',
        },
    ],
    addresses: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Address',
            required: false,
        },
    ],
    usedCoupons: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Coupon',
        },
    ],
    authors: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Author',
            required: false,
        },
    ],
    addressLine: {
        type: String,
        required: false,
    },
    division: {
        _id: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Division',
            required: false,
        },
        name: {
            type: String,
            required: false,
        },
    },
    area: {
        _id: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Area',
            required: false,
        },
        name: {
            type: String,
            required: false,
        },
    },
    zone: {
        _id: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Zone',
            required: false,
        },
        name: {
            type: String,
            required: false,
        },
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=user.schema.js.map