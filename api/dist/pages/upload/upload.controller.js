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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UploadController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const file_upload_utils_1 = require("./file-upload.utils");
const upload_service_1 = require("./upload.service");
const path = require("path");
const path_1 = require("path");
const sharp = require("sharp");
const fs = require("fs");
let UploadController = UploadController_1 = class UploadController {
    constructor(configService, uploadService) {
        this.configService = configService;
        this.uploadService = uploadService;
        this.logger = new common_1.Logger(UploadController_1.name);
    }
    async uploadSingleImage(file, req) {
        const isProduction = this.configService.get('productionBuild');
        const baseurl = req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
        const path = file.path;
        const url = `${baseurl}/${path}`;
        return {
            originalname: file.originalname,
            filename: file.filename,
            url,
        };
    }
    async uploadSingleImageV2(file, req, body) {
        const isProduction = this.configService.get('productionBuild');
        if (body &&
            body['convert'] &&
            body['convert'].toString().toLowerCase() === 'yes') {
            const quality = body['quality'] ? Number(body['quality']) : 85;
            const width = body['width'] ? Number(body['width']) : null;
            const height = body['height'] ? Number(body['height']) : null;
            const dir = `upload/images`;
            const filename = path.parse(file.filename).name;
            const newFilename = filename + '.webp';
            const newPath = `${dir}/${newFilename}`;
            await sharp(file.path)
                .resize(width, height)
                .webp({ effort: 4, quality: quality })
                .toFile(path.join(dir, newFilename));
            const baseurl = req.protocol +
                `${isProduction ? 's' : ''}://` +
                req.get('host') +
                '/api';
            const url = `${baseurl}/${newPath}`;
            fs.unlinkSync('./' + file.path);
            return {
                originalname: file.originalname,
                filename: file.filename,
                url,
            };
        }
        else {
            const baseurl = req.protocol +
                `${isProduction ? 's' : ''}://` +
                req.get('host') +
                '/api';
            const path = file.path;
            const url = `${baseurl}/${path}`;
            return {
                originalname: file.originalname,
                filename: file.filename,
                url,
            };
        }
    }
    async uploadMultipleImages(files, req) {
        const isProduction = this.configService.get('productionBuild');
        const baseurl = req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
        const response = [];
        files.forEach((file) => {
            const fileResponse = {
                size: this.uploadService.bytesToKb(file.size),
                name: file.filename.split('.')[0],
                url: `${baseurl}/${file.path}`,
            };
            response.push(fileResponse);
        });
        return response;
    }
    async uploadMultipleImagesV2(files, req, body) {
        const isProduction = this.configService.get('productionBuild');
        const baseurl = req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
        if (body &&
            body['convert'] &&
            body['convert'].toString().toLowerCase() === 'yes') {
            const quality = body['quality'] ? Number(body['quality']) : 85;
            const width = body['width'] ? Number(body['width']) : null;
            const height = body['height'] ? Number(body['height']) : null;
            const dir = `upload/images`;
            const response = [];
            for (const file of files) {
                const filename = path.parse(file.filename).name;
                const newFilename = filename + '.webp';
                const newPath = `${dir}/${newFilename}`;
                const conImage = await sharp(file.path)
                    .resize(width, height)
                    .webp({ effort: 4, quality: quality })
                    .toFile(path.join(dir, newFilename));
                fs.unlinkSync('./' + file.path);
                const fileResponse = {
                    size: this.uploadService.bytesToKb(conImage.size),
                    name: file.filename.split('.')[0],
                    url: `${baseurl}/${newPath}`,
                };
                response.push(fileResponse);
            }
            return response;
        }
        else {
            const response = [];
            files.forEach((file) => {
                const fileResponse = {
                    size: this.uploadService.bytesToKb(file.size),
                    name: file.filename.split('.')[0],
                    url: `${baseurl}/${file.path}`,
                };
                response.push(fileResponse);
            });
            return response;
        }
    }
    seeUploadedFile(image, res) {
        return res.sendFile(image, { root: './upload/images' });
    }
    deleteSingleFile(url, req) {
        const isProduction = this.configService.get('productionBuild');
        const baseurl = req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
        const path = `.${url.replace(baseurl, '')}`;
        return this.uploadService.deleteSingleFile(path);
    }
    deleteMultipleFile(url, req) {
        const isProduction = this.configService.get('productionBuild');
        const baseurl = req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
        return this.uploadService.deleteMultipleFile(baseurl, url);
    }
    async uploadMultipleFiles(files, req) {
        const isProduction = this.configService.get('productionBuild');
        const prefix = this.configService.get('prefix');
        const baseurl = req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
        const response = [];
        files.forEach((file) => {
            var _a;
            const fileResponse = {
                extension: (_a = file.filename.split('.')[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase(),
                size: this.uploadService.bytesToKb(file.size),
                name: file.filename.split('.')[0],
                url: `${baseurl}/${file.path}`,
            };
            response.push(fileResponse);
        });
        return response;
    }
    async seeUploadedFilePdf(file, res) {
        return res.sendFile(file, { root: './upload/files' });
    }
    deleteMultipleFilePdf(url, req) {
        const isProduction = this.configService.get('productionBuild');
        const prefix = this.configService.get('prefix');
        const baseurl = req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
        return this.uploadService.deleteMultipleFilePdf(baseurl, url);
    }
    async updateCsv(products) {
        try {
            await this.uploadService.updateCsv(products);
            return {
                message: 'CSV updated successfully',
                fileUrl: `/csv/feed.csv`,
            };
        }
        catch (error) {
            console.log(error);
        }
    }
    async getCsvFile(res) {
        const filePath = await this.uploadService.getCsvFile();
        return res.sendFile((0, path_1.resolve)(filePath));
    }
};
__decorate([
    (0, common_1.Post)('single-image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', {
        storage: (0, multer_1.diskStorage)({
            destination: file_upload_utils_1.getUploadPath,
            filename: file_upload_utils_1.editFileName,
        }),
        limits: {
            fileSize: 10 * 1000 * 1000,
        },
        fileFilter: file_upload_utils_1.imageFileFilter,
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadSingleImage", null);
__decorate([
    (0, common_1.Version)('2'),
    (0, common_1.Post)('single-image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', {
        storage: (0, multer_1.diskStorage)({
            destination: file_upload_utils_1.getUploadPath,
            filename: file_upload_utils_1.editFileName,
        }),
        limits: {
            fileSize: 10 * 1000 * 1000,
        },
        fileFilter: file_upload_utils_1.imageFileFilter,
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadSingleImageV2", null);
__decorate([
    (0, common_1.Post)('multiple-image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('imageMulti', 50, {
        storage: (0, multer_1.diskStorage)({
            destination: file_upload_utils_1.getUploadPath,
            filename: file_upload_utils_1.editFileName,
        }),
        fileFilter: file_upload_utils_1.imageFileFilter,
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadMultipleImages", null);
__decorate([
    (0, common_1.Version)('2'),
    (0, common_1.Post)('multiple-image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('imageMulti', 50, {
        storage: (0, multer_1.diskStorage)({
            destination: file_upload_utils_1.getUploadPath,
            filename: file_upload_utils_1.editFileName,
        }),
        fileFilter: file_upload_utils_1.imageFileFilter,
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadMultipleImagesV2", null);
__decorate([
    (0, common_1.Get)('images/:imageName'),
    __param(0, (0, common_1.Param)('imageName')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UploadController.prototype, "seeUploadedFile", null);
__decorate([
    (0, common_1.Post)('delete-single-image'),
    __param(0, (0, common_1.Body)('url')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "deleteSingleFile", null);
__decorate([
    (0, common_1.Post)('delete-multiple-image'),
    __param(0, (0, common_1.Body)('url')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "deleteMultipleFile", null);
__decorate([
    (0, common_1.Post)('multiple-file'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('fileMulti', 50, {
        storage: (0, multer_1.diskStorage)({
            destination: file_upload_utils_1.getUploadFilePath,
            filename: file_upload_utils_1.editFileName,
        }),
        fileFilter: file_upload_utils_1.allFileFilter,
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadMultipleFiles", null);
__decorate([
    (0, common_1.Get)('files/:name'),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "seeUploadedFilePdf", null);
__decorate([
    (0, common_1.Post)('delete-multiple-file'),
    __param(0, (0, common_1.Body)('url')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "deleteMultipleFilePdf", null);
__decorate([
    (0, common_1.Post)('csv-upload'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "updateCsv", null);
__decorate([
    (0, common_1.Get)('csv/datafeed.csv'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getCsvFile", null);
UploadController = UploadController_1 = __decorate([
    (0, common_1.Controller)('upload'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        upload_service_1.UploadService])
], UploadController);
exports.UploadController = UploadController;
//# sourceMappingURL=upload.controller.js.map