"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupLogSchema = void 0;
const mongoose = require("mongoose");
exports.BackupLogSchema = new mongoose.Schema({
    fileId: {
        type: String,
        required: true,
    },
    dateString: {
        type: String,
        required: true,
    },
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=backup-log.schema.js.map