import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { join } from 'path';
import * as fastCsv from 'fast-csv';

@Injectable()
export class UploadService {
  private logger = new Logger(UploadService.name);

  constructor() {}

  async deleteSingleFile(path: string): Promise<ResponsePayload> {
    try {
      if (path) {
        fs.unlinkSync(path);
        return {
          success: true,
          message: 'Success! Image Successfully Removed.',
        } as ResponsePayload;
      } else {
        return {
          success: false,
          message: 'Error! No Path found',
        } as ResponsePayload;
      }
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleFile(
    baseurl: string,
    url: string[],
  ): Promise<ResponsePayload> {
    try {
      if (url && url.length) {
        url.forEach((u) => {
          const path = `.${u.replace(baseurl, '')}`;
          fs.unlinkSync(path);
        });

        return {
          success: true,
          message: 'Success! Image Successfully Removed.',
        } as ResponsePayload;
      } else {
        return {
          success: false,
          message: 'Error! No Path found',
        } as ResponsePayload;
      }
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleFilePdf(
    baseurl: string,
    url: string[],
  ): Promise<ResponsePayload> {
    try {
      if (url && url.length) {
        url.forEach((u) => {
          const path = `.${u.replace(baseurl, '')}`;
          fs.unlinkSync(path);
        });

        return {
          success: true,
          message: 'Success! Files Successfully Removed.',
        } as ResponsePayload;
      } else {
        return {
          success: false,
          message: 'Error! No Path found',
        } as ResponsePayload;
      }
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  bytesToKb(bytes: number): number {
    const res = bytes * 0.001;
    return Number(res.toFixed(2));
  }

  /**
   * CSV
   */
  async updateCsv(products: any[]) {
    // const csvPath = this.getCsvPath(clientId);
    const uploadPath = join('upload/csv', 'csv');

    return new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(uploadPath + '.csv');
      fastCsv
        .write(products, { headers: true })
        .pipe(ws)
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  async getCsvFile(): Promise<string> {
    const filePath = join('upload/csv', 'csv');
    return filePath + '.csv';
  }
}
