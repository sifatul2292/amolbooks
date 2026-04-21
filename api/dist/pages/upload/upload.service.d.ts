import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
export declare class UploadService {
    private logger;
    constructor();
    deleteSingleFile(path: string): Promise<ResponsePayload>;
    deleteMultipleFile(baseurl: string, url: string[]): Promise<ResponsePayload>;
    deleteMultipleFilePdf(baseurl: string, url: string[]): Promise<ResponsePayload>;
    bytesToKb(bytes: number): number;
    updateCsv(products: any[]): Promise<unknown>;
    getCsvFile(): Promise<string>;
}
