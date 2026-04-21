import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import {
  allFileFilter,
  editFileName,
  getUploadFilePath,
  getUploadPath,
  imageFileFilter,
} from './file-upload.utils';
import { UploadService } from './upload.service';
import {
  FileUploadResponse,
  ImageUploadResponse,
  ResponsePayload,
} from '../../interfaces/core/response-payload.interface';
import * as path from 'path';
import { resolve } from 'path';
import * as sharp from 'sharp';
import * as fs from 'fs';
import { Response } from 'express';

@Controller('upload')
export class UploadController {
  private logger = new Logger(UploadController.name);

  constructor(
    private configService: ConfigService,
    private uploadService: UploadService,
  ) {}

  /**
   * SINGLE IMAGE
   * SINGLE IMAGE WITH WEBP CONTROL
   * MULTIPLE IMAGE
   * GET IMAGE
   * DELETE SINGLE IMAGE
   * DELETE MULTIPLE IMAGE
   */
  @Post('single-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: getUploadPath,
        filename: editFileName,
      }),
      limits: {
        fileSize: 10 * 1000 * 1000,
      },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadSingleImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    const isProduction = this.configService.get<boolean>('productionBuild');
    const baseurl =
      req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
    const path = file.path;
    const url = `${baseurl}/${path}`;
    return {
      originalname: file.originalname,
      filename: file.filename,
      url,
    };
  }

  // NEW
  @Version('2')
  @Post('single-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: getUploadPath,
        filename: editFileName,
      }),
      limits: {
        fileSize: 10 * 1000 * 1000,
      },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadSingleImageV2(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
    @Body() body,
  ) {
    const isProduction = this.configService.get<boolean>('productionBuild');

    if (
      body &&
      body['convert'] &&
      body['convert'].toString().toLowerCase() === 'yes'
    ) {
      const quality: number = body['quality'] ? Number(body['quality']) : 85;
      const width: number = body['width'] ? Number(body['width']) : null;
      const height: number = body['height'] ? Number(body['height']) : null;

      const dir = `upload/images`;
      const filename = path.parse(file.filename).name;
      const newFilename = filename + '.webp';
      const newPath = `${dir}/${newFilename}`;

      await sharp(file.path)
        .resize(width, height)
        .webp({ effort: 4, quality: quality })
        .toFile(path.join(dir, newFilename));

      const baseurl =
        req.protocol +
        `${isProduction ? 's' : ''}://` +
        req.get('host') +
        '/api';
      const url = `${baseurl}/${newPath}`;

      // Delete Images
      fs.unlinkSync('./' + file.path);

      return {
        originalname: file.originalname,
        filename: file.filename,
        url,
      };
    } else {
      const baseurl =
        req.protocol +
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

  @Post('multiple-image')
  @UseInterceptors(
    FilesInterceptor('imageMulti', 50, {
      storage: diskStorage({
        destination: getUploadPath,
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
    }),
  )
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ): Promise<ImageUploadResponse[]> {
    const isProduction = this.configService.get<boolean>('productionBuild');
    const baseurl =
      req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
    const response: ImageUploadResponse[] = [];
    files.forEach((file) => {
      const fileResponse = {
        size: this.uploadService.bytesToKb(file.size),
        name: file.filename.split('.')[0],
        url: `${baseurl}/${file.path}`,
      } as ImageUploadResponse;
      response.push(fileResponse);
    });
    return response;
  }

  // NEW
  @Version('2')
  @Post('multiple-image')
  @UseInterceptors(
    FilesInterceptor('imageMulti', 50, {
      storage: diskStorage({
        destination: getUploadPath,
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
    }),
  )
  async uploadMultipleImagesV2(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
    @Body() body,
  ): Promise<ImageUploadResponse[]> {
    const isProduction = this.configService.get<boolean>('productionBuild');
    const baseurl =
      req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';

    if (
      body &&
      body['convert'] &&
      body['convert'].toString().toLowerCase() === 'yes'
    ) {
      const quality: number = body['quality'] ? Number(body['quality']) : 85;
      const width: number = body['width'] ? Number(body['width']) : null;
      const height: number = body['height'] ? Number(body['height']) : null;
      const dir = `upload/images`;
      const response: ImageUploadResponse[] = [];

      for (const file of files) {
        const filename = path.parse(file.filename).name;
        const newFilename = filename + '.webp';
        const newPath = `${dir}/${newFilename}`;

        const conImage = await sharp(file.path)
          .resize(width, height)
          .webp({ effort: 4, quality: quality })
          .toFile(path.join(dir, newFilename));

        // Delete Images
        fs.unlinkSync('./' + file.path);

        const fileResponse = {
          size: this.uploadService.bytesToKb(conImage.size),
          name: file.filename.split('.')[0],
          url: `${baseurl}/${newPath}`,
        } as ImageUploadResponse;
        response.push(fileResponse);
      }

      return response;
    } else {
      const response: ImageUploadResponse[] = [];
      files.forEach((file) => {
        const fileResponse = {
          size: this.uploadService.bytesToKb(file.size),
          name: file.filename.split('.')[0],
          url: `${baseurl}/${file.path}`,
        } as ImageUploadResponse;
        response.push(fileResponse);
      });
      return response;
    }
  }

  @Get('images/:imageName')
  seeUploadedFile(@Param('imageName') image, @Res() res) {
    return res.sendFile(image, { root: './upload/images' });
  }

  @Post('delete-single-image')
  deleteSingleFile(
    @Body('url') url: string,
    @Req() req,
  ): Promise<ResponsePayload> {
    const isProduction = this.configService.get<boolean>('productionBuild');
    const baseurl =
      req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
    const path = `.${url.replace(baseurl, '')}`;
    // console.log('path', path);
    return this.uploadService.deleteSingleFile(path);
  }

  @Post('delete-multiple-image')
  deleteMultipleFile(
    @Body('url') url: string[],
    @Req() req,
  ): Promise<ResponsePayload> {
    const isProduction = this.configService.get<boolean>('productionBuild');
    const baseurl =
      req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
    return this.uploadService.deleteMultipleFile(baseurl, url);
  }

  /**
   * File CONTROL METHODS
   * uploadMultipleFiles()
   * seeUploadedFile()
   * deleteMultipleFile()
   */

  @Post('multiple-file')
  @UseInterceptors(
    FilesInterceptor('fileMulti', 50, {
      storage: diskStorage({
        destination: getUploadFilePath,
        filename: editFileName,
      }),
      fileFilter: allFileFilter,
    }),
  )
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ): Promise<FileUploadResponse[]> {
    const isProduction = this.configService.get<boolean>('productionBuild');
    const prefix = this.configService.get<string>('prefix');
    // const baseurl =
    //   req.protocol +
    //     `${isProduction ? 's' : ''}://` +
    //     req.get('host') +
    //     '/' +
    //     prefix ?? '';
    const baseurl =
      req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
    const response: FileUploadResponse[] = [];
    files.forEach((file) => {
      const fileResponse = {
        extension: file.filename.split('.')[1]?.toLowerCase(),
        size: this.uploadService.bytesToKb(file.size),
        name: file.filename.split('.')[0],
        url: `${baseurl}/${file.path}`,
      } as FileUploadResponse;
      response.push(fileResponse);
    });
    return response;
  }

  @Get('files/:name')
  async seeUploadedFilePdf(@Param('name') file: string, @Res() res: any) {
    return res.sendFile(file, { root: './upload/files' });
  }

  @Post('delete-multiple-file')
  deleteMultipleFilePdf(
    @Body('url') url: string[],
    @Req() req: any,
  ): Promise<ResponsePayload> {
    const isProduction = this.configService.get<boolean>('productionBuild');
    const prefix = this.configService.get<string>('prefix');
    // const baseurl =
    //   req.protocol +
    //     `${isProduction ? 's' : ''}://` +
    //     req.get('host') +
    //     '/' +
    //     prefix ?? '';
    const baseurl =
      req.protocol + `${isProduction ? 's' : ''}://` + req.get('host') + '/api';
    return this.uploadService.deleteMultipleFilePdf(baseurl, url);
  }

  /**
   * CSV
   */

  @Post('csv-upload')
  async updateCsv(@Body() products: any[]) {
    try {
      await this.uploadService.updateCsv(products);
      return {
        message: 'CSV updated successfully',
        fileUrl: `/csv/feed.csv`,
      };
    } catch (error) {
      console.log(error);
    }
  }

  @Get('csv/datafeed.csv')
  async getCsvFile(@Res() res: Response) {
    const filePath = await this.uploadService.getCsvFile();
    return res.sendFile(resolve(filePath));
  }
}
