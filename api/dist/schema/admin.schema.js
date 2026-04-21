"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSchema = void 0;
const mongoose = require("mongoose");
exports.AdminSchema = new mongoose.Schema({
    readOnly: {
        type: Boolean,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    phoneNo: {
        type: String,
        required: false,
    },
    email: {
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
    hasAccess: {
        type: Boolean,
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    permissions: {
        type: [String],
        required: false,
    },
    registrationAt: {
        type: String,
        required: false,
    },
    lastLoggedIn: {
        type: Date,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=admin.schema.js.map