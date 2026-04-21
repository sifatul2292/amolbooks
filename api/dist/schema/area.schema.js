"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AreaSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
exports.AreaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
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
//# sourceMappingURL=area.schema.js.map