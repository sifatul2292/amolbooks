"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobSchedulerSchema = void 0;
const mongoose = require("mongoose");
exports.JobSchedulerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: true,
    },
    collectionName: {
        type: String,
        required: true,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=job-scheduler.schema.js.map