"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadPath = exports.editFileName = exports.allFileFilter = exports.getUploadFilePath = exports.imageFileFilter = void 0;
const path_1 = require("path");
const fs = require("fs");
const imageFileFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg|PNG|JPG|JPEG|GIF|WEBP|SVG)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
};
exports.imageFileFilter = imageFileFilter;
const getUploadFilePath = (req, file, callback) => {
    const dir = `./upload/files`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return callback(null, dir);
};
exports.getUploadFilePath = getUploadFilePath;
const allFileFilter = (req, file, callback) => {
    if (!file.originalname.match(/\.(pdf|PDF|DOCX|docx|doc)$/)) {
        return callback(new Error('Only pdf files are allowed!'), false);
    }
    callback(null, true);
};
exports.allFileFilter = allFileFilter;
const editFileName = (req, file, callback) => {
    const name = transformToSlug(file.originalname.split('.')[0]);
    const fileExtName = (0, path_1.extname)(file.originalname);
    const randomName = Array(4)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
    callback(null, `${name}-${randomName}${fileExtName}`);
};
exports.editFileName = editFileName;
const getUploadPath = (req, file, callback) => {
    const dir = `./upload/images`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return callback(null, dir);
};
exports.getUploadPath = getUploadPath;
const transformToSlug = (value) => {
    return value
        .trim()
        .replace(/[^A-Z0-9]+/gi, '-')
        .toLowerCase();
};
//# sourceMappingURL=file-upload.utils.js.map