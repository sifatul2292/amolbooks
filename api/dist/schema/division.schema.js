"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DivisionSchema = void 0;
const mongoose = require("mongoose");
exports.DivisionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        required: false,
        default: 'publish',
    },
    priority: {
        type: Number,
        required: false,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=division.schema.js.map