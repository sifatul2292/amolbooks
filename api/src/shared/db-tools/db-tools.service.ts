import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs';
import { basename } from 'path';
import { google } from 'googleapis';
import * as archiver from 'archiver';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { BackupLog } from './interface/backup-log.interface';
import { UtilsService } from '../utils/utils.service';

@Injectable()
export class DbToolsService {
  constructor(
    private configService: ConfigService,
    private utilsService: UtilsService,
    @InjectModel('BackupLog')
    private readonly backupLogModel: Model<BackupLog>,
  ) {}

  /**
   * Mongo DB Database Backup on Google Drive (REf: https://youtu.be/1y0-IfRW114)
   * backupMongoDb()
   * restoreMongoDb()
   * zipDirectory()
   * uploadToGoogleDrive()
   * removeUploadedFile()
   * execToPromise()
   */

  async backupMongoDb() {
    try {
      const dbOptions = {
        username: this.configService.get<string>('dbAdminUsername'),
        password: this.configService.get<string>('dbAdminPassword'),
        host: 'localhost',
        authenticationDatabase: 'admin',
        port: 27017,
        db: this.configService.get<string>('backupDB'),
        out: this.configService.get<string>('backupPath'),
        restorePath: this.configService.get<string>('restorePath'),
      };

      const cmd =
        'mongodump --host ' +
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

      // Mongo Dump
      await this.execToPromise(cmd);

      // File
      const outputFilePath = `./backup/db/${
        dbOptions.db
      }_${new Date().toISOString()}.zip`;
      const sourceFile = `./backup/db/${dbOptions.db}`;

      // Process
      await this.zipDirectory(sourceFile, outputFilePath);
      const fileName = basename(outputFilePath);
      const driveRes = await this.uploadToGoogleDrive(fileName, outputFilePath);
      this.removeUploadedFile(outputFilePath, sourceFile);

      // Create Backup Log
      const backupLog = new this.backupLogModel({
        fileId: driveRes.data ? driveRes.data.id : '',
        dateString: this.utilsService.getDateString(new Date()),
      });
      await backupLog.save();
    } catch (error) {
      console.log(error);
    }
  }

  async restoreMongoDb() {
    try {
      const dbOptions = {
        username: this.configService.get<string>('dbAdminUsername'),
        password: this.configService.get<string>('dbAdminPassword'),
        host: 'localhost',
        authenticationDatabase: 'admin',
        port: 27017,
        db: this.configService.get<string>('backupDB'),
        out: this.configService.get<string>('backupPath'),
        restorePath: this.configService.get<string>('restorePath'),
      };

      const cmd =
        'mongorestore --host ' +
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

      // Mongo Dump
      exec(cmd);
      // const g = await exec(
      //   'mongorestore --db ek-rate /Users/hello/Documents/MongoDB/ek-rate --host localhost:27017 --authenticationDatabase admin --username ikbalsazib11 --password IKBALsazib11',
      // );
    } catch (error) {
      console.log('error', error);
    }
  }

  private async zipDirectory(sourceDir: any, outPath: any) {
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

  private async uploadToGoogleDrive(fileName: string, path: string) {
    // Config Files
    const clientId = this.configService.get<string>('googleClientId');
    const clientSecret = this.configService.get<string>('googleClientSecret');
    const redirectUrl = this.configService.get<string>('googleRedirectUrl');
    const refreshToken = this.configService.get<string>('googleRefreshToken');
    const driveFolder = this.configService.get<string>('driveFolder');

    const fileMetadata = {
      name: fileName,
      parents: [driveFolder], // Google Drive Folder Id
    };

    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(path),
    };

    const oAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUrl,
    );
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    const driveService = google.drive({ version: 'v3', auth: oAuth2Client });

    // Delete Old Data Before 30 Days
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

  private removeUploadedFile(filePath: string, folderPath: string) {
    fs.unlinkSync(filePath);
    fs.rmSync(folderPath, { recursive: true, force: true });
  }

  private execToPromise(command: string) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(stdout.trim());
      });
    });
  }
}
