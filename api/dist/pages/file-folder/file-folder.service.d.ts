import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddFileFolderDto, FilterAndPaginationFileFolderDto, OptionFileFolderDto, UpdateFileFolderDto } from '../../dto/file-folder.dto';
import { FileFolder } from '../../interfaces/gallery/file-folder.interface';
export declare class FileFolderService {
    private readonly fileFolderModel;
    private configService;
    private utilsService;
    private logger;
    constructor(fileFolderModel: Model<FileFolder>, configService: ConfigService, utilsService: UtilsService);
    addFileFolder(addFileFolderDto: AddFileFolderDto): Promise<ResponsePayload>;
    insertManyFileFolder(addFileFoldersDto: AddFileFolderDto[], optionFileFolderDto: OptionFileFolderDto): Promise<ResponsePayload>;
    getAllFileFolders(filterFileFolderDto: FilterAndPaginationFileFolderDto, searchQuery?: string): Promise<ResponsePayload>;
    getFileFolderById(id: string, select: string): Promise<ResponsePayload>;
    updateFileFolderById(id: string, updateFileFolderDto: UpdateFileFolderDto): Promise<ResponsePayload>;
    updateMultipleFileFolderById(ids: string[], updateFileFolderDto: UpdateFileFolderDto): Promise<ResponsePayload>;
    deleteFileFolderById(id: string): Promise<ResponsePayload>;
    deleteMultipleFileFolderById(ids: string[]): Promise<ResponsePayload>;
}
