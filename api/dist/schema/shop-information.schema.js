"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopInformationSchema = void 0;
const mongoose = require("mongoose");
exports.ShopInformationSchema = new mongoose.Schema({
    siteName: {
        type: String,
        required: true,
    },
    shortDescription: {
        type: String,
        required: false,
    },
    siteLogo: {
        type: String,
        required: false,
    },
    newsSlider: {
        type: String,
        required: false,
    },
    navLogo: {
        type: String,
        required: false,
    },
    redirectUrl: {
        type: String,
        required: false,
    },
    categoryPdfFile: {
        type: String,
        required: false,
    },
    footerLogo: {
        type: String,
        required: false,
    },
    othersLogo: {
        type: String,
        required: false,
    },
    addresses: [
        {
            type: Object,
            required: false,
        },
    ],
    emails: [
        {
            type: Object,
            required: false,
        },
    ],
    phones: [
        {
            type: Object,
            required: false,
        },
    ],
    downloadUrls: [
        {
            type: Object,
            required: false,
        },
    ],
    socialLinks: [
        {
            type: Object,
            required: false,
        },
    ],
}, {
    versionKey: false,
    timestamps: true,
});
//# sourceMappingURL=shop-information.schema.js.map