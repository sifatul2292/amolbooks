"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path_1 = require("path");
const fastCsv = require("fast-csv");
let UploadService = UploadService_1 = class UploadService {
    constructor() {
        this.logger = new common_1.Logger(UploadService_1.name);
    }
    async deleteSingleFile(path) {
        try {
            if (path) {
                fs.unlinkSync(path);
                return {
                    success: true,
                    message: 'Success! Image Successfully Removed.',
                };
            }
            else {
                return {
                    success: false,
                    message: 'Error! No Path found',
                };
            }
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleFile(baseurl, url) {
        try {
            if (url && url.length) {
                url.forEach((u) => {
                    const path = `.${u.replace(baseurl, '')}`;
                    fs.unlinkSync(path);
                });
                return {
                    success: true,
                    message: 'Success! Image Successfully Removed.',
                };
            }
            else {
                return {
                    success: false,
                    message: 'Error! No Path found',
                };
            }
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    async deleteMultipleFilePdf(baseurl, url) {
        try {
            if (url && url.length) {
                url.forEach((u) => {
                    const path = `.${u.replace(baseurl, '')}`;
                    fs.unlinkSync(path);
                });
                return {
                    success: true,
                    message: 'Success! Files Successfully Removed.',
                };
            }
            else {
                return {
                    success: false,
                    message: 'Error! No Path found',
                };
            }
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(err.message);
        }
    }
    bytesToKb(bytes) {
        const res = bytes * 0.001;
        return Number(res.toFixed(2));
    }
    async updateCsv(products) {
        const uploadPath = (0, path_1.join)('upload/csv', 'csv');
        return new Promise((resolve, reject) => {
            const ws = fs.createWriteStream(uploadPath + '.csv');
            fastCsv
                .write(products, { headers: true })
                .pipe(ws)
                .on('finish', resolve)
                .on('error', reject);
        });
    }
    async getCsvFile() {
        const filePath = (0, path_1.join)('upload/csv', 'csv');
        return filePath + '.csv';
    }
};
UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], UploadService);
exports.UploadService = UploadService;
//# sourceMappingURL=upload.service.js.map