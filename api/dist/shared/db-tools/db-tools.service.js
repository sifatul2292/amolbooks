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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbToolsService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const fs = require("fs");
const path_1 = require("path");
const googleapis_1 = require("googleapis");
const archiver = require("archiver");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const utils_service_1 = require("../utils/utils.service");
let DbToolsService = class DbToolsService {
    constructor(configService, utilsService, backupLogModel) {
        this.configService = configService;
        this.utilsService = utilsService;
        this.backupLogModel = backupLogModel;
    }
    async backupMongoDb() {
        try {
            const dbOptions = {
                username: this.configService.get('dbAdminUsername'),
                password: this.configService.get('dbAdminPassword'),
                host: 'localhost',
                authenticationDatabase: 'admin',
                port: 27017,
                db: this.configService.get('backupDB'),
                out: this.configService.get('backupPath'),
                restorePath: this.configService.get('restorePath'),
            };
            const cmd = 'mongodump --host ' +
                dbOptions.host +
                ' --port ' +
                dbOptions.port +
                ' --db ' +
                dbOptions.db +
                ' --username ' +
                dbOptions.username +
                ' --password ' +
                dbOptions.password +
                ' --authenticationDatabase ' +
                dbOptions.authenticationDatabase +
                ' --out ' +
                dbOptions.out;
            await this.execToPromise(cmd);
            const outputFilePath = `./backup/db/${dbOptions.db}_${new Date().toISOString()}.zip`;
            const sourceFile = `./backup/db/${dbOptions.db}`;
            await this.zipDirectory(sourceFile, outputFilePath);
            const fileName = (0, path_1.basename)(outputFilePath);
            const driveRes = await this.uploadToGoogleDrive(fileName, outputFilePath);
            this.removeUploadedFile(outputFilePath, sourceFile);
            const backupLog = new this.backupLogModel({
                fileId: driveRes.data ? driveRes.data.id : '',
                dateString: this.utilsService.getDateString(new Date()),
            });
            await backupLog.save();
        }
        catch (error) {
            console.log(error);
        }
    }
    async restoreMongoDb() {
        try {
            const dbOptions = {
                username: this.configService.get('dbAdminUsername'),
                password: this.configService.get('dbAdminPassword'),
                host: 'localhost',
                authenticationDatabase: 'admin',
                port: 27017,
                db: this.configService.get('backupDB'),
                out: this.configService.get('backupPath'),
                restorePath: this.configService.get('restorePath'),
            };
            const cmd = 'mongorestore --host ' +
                dbOptions.host +
                ' --port ' +
                dbOptions.port +
                ' --db ' +
                dbOptions.db +
                ' ' +
                dbOptions.restorePath +
                ' --username ' +
                dbOptions.username +
                ' --password ' +
                dbOptions.password +
                ' --authenticationDatabase ' +
                dbOptions.authenticationDatabase;
            (0, child_process_1.exec)(cmd);
        }
        catch (error) {
            console.log('error', error);
        }
    }
    async zipDirectory(sourceDir, outPath) {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const stream = fs.createWriteStream(outPath);
        return new Promise((resolve, reject) => {
            archive
                .directory(sourceDir, false)
                .on('error', (err) => reject(err))
                .pipe(stream);
            stream.on('close', () => resolve('Success'));
            archive.finalize();
        });
    }
    async uploadToGoogleDrive(fileName, path) {
        const clientId = this.configService.get('googleClientId');
        const clientSecret = this.configService.get('googleClientSecret');
        const redirectUrl = this.configService.get('googleRedirectUrl');
        const refreshToken = this.configService.get('googleRefreshToken');
        const driveFolder = this.configService.get('driveFolder');
        const fileMetadata = {
            name: fileName,
            parents: [driveFolder],
        };
        const media = {
            mimeType: 'application/zip',
            body: fs.createReadStream(path),
        };
        const oAuth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUrl);
        oAuth2Client.setCredentials({ refresh_token: refreshToken });
        const driveService = googleapis_1.google.drive({ version: 'v3', auth: oAuth2Client });
        const dateBefore = this.utilsService.getNextDateString(new Date(), -30);
        const findOlderData = await this.backupLogModel.find({
            dateString: { $lt: dateBefore },
        });
        const mFindOlderData = JSON.parse(JSON.stringify(findOlderData));
        for (const data of mFindOlderData) {
            await driveService.files.delete({ fileId: data.fileId });
            await this.backupLogModel.findByIdAndDelete(data._id);
        }
        return await driveService.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });
    }
    removeUploadedFile(filePath, folderPath) {
        fs.unlinkSync(filePath);
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
    execToPromise(command) {
        return new Promise((resolve, reject) => {
            (0, child_process_1.exec)(command, (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout.trim());
            });
        });
    }
};
DbToolsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, mongoose_2.InjectModel)('BackupLog')),
    __metadata("design:paramtypes", [config_1.ConfigService,
        utils_service_1.UtilsService,
        mongoose_1.Model])
], DbToolsService);
exports.DbToolsService = DbToolsService;
//# sourceMappingURL=db-tools.service.js.map