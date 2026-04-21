"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
exports.AddressSchema = new mongoose.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: true,
    },
    city: {
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
    address: {
        type: String,
        required: false,
    },
    addressType: {
        type: String,
        required: false,
    },
    setDefaultAddress: {
        type: Boolean,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=address.schema.js.map