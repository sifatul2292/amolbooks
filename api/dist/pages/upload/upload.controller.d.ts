/// <reference types="multer" />
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { FileUploadResponse, ImageUploadResponse, ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Response } from 'express';
export declare class UploadController {
    private configService;
    private uploadService;
    private logger;
    constructor(configService: ConfigService, uploadService: UploadService);
    uploadSingleImage(file: Express.Multer.File, req: any): Promise<{
        originalname: string;
        filename: string;
        url: string;
    }>;
    uploadSingleImageV2(file: Express.Multer.File, req: any, body: any): Promise<{
        originalname: string;
        filename: string;
        url: string;
    }>;
    uploadMultipleImages(files: Express.Multer.File[], req: any): Promise<ImageUploadResponse[]>;
    uploadMultipleImagesV2(files: Express.Multer.File[], req: any, body: any): Promise<ImageUploadResponse[]>;
    seeUploadedFile(image: any, res: any): any;
    deleteSingleFile(url: string, req: any): Promise<ResponsePayload>;
    deleteMultipleFile(url: string[], req: any): Promise<ResponsePayload>;
    uploadMultipleFiles(files: Express.Multer.File[], req: any): Promise<FileUploadResponse[]>;
    seeUploadedFilePdf(file: string, res: any): Promise<any>;
    deleteMultipleFilePdf(url: string[], req: any): Promise<ResponsePayload>;
    updateCsv(products: any[]): Promise<{
        message: string;
        fileUrl: string;
    }>;
    getCsvFile(res: Response): Promise<void>;
}
