"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileFolderModule = void 0;
const common_1 = require("@nestjs/common");
const file_folder_controller_1 = require("./file-folder.controller");
const file_folder_service_1 = require("./file-folder.service");
const mongoose_1 = require("@nestjs/mongoose");
const file_folder_schema_1 = require("../../schema/file-folder.schema");
let FileFolderModule = class FileFolderModule {
};
FileFolderModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'FileFolder', schema: file_folder_schema_1.FileFolderSchema },
            ]),
        ],
        controllers: [file_folder_controller_1.FileFolderController],
        providers: [file_folder_service_1.FileFolderService],
    })
], FileFolderModule);
exports.FileFolderModule = FileFolderModule;
//# sourceMappingURL=file-folder.module.js.map