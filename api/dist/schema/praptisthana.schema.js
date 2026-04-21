"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PraptisthanaSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
exports.PraptisthanaSchema = new mongoose.Schema({
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
    title: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: false,
    },
    address: {
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
//# sourceMappingURL=praptisthana.schema.js.map