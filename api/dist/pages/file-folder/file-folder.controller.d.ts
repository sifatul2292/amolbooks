import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { FileFolderService } from './file-folder.service';
import { AddFileFolderDto, FilterAndPaginationFileFolderDto, OptionFileFolderDto, UpdateFileFolderDto } from '../../dto/file-folder.dto';
export declare class FileFolderController {
    private fileFolderService;
    private logger;
    constructor(fileFolderService: FileFolderService);
    addFileFolder(addFileFolderDto: AddFileFolderDto): Promise<ResponsePayload>;
    insertManyFileFolder(body: {
        data: AddFileFolderDto[];
        option: OptionFileFolderDto;
    }): Promise<ResponsePayload>;
    getAllFileFolders(filterFileFolderDto: FilterAndPaginationFileFolderDto, searchString: string): Promise<ResponsePayload>;
    getAllFileFoldersByAdmin(filterFileFolderDto: FilterAndPaginationFileFolderDto, searchString: string): Promise<ResponsePayload>;
    getFileFolderById(id: string, select: string): Promise<ResponsePayload>;
    updateFileFolderById(id: string, updateFileFolderDto: UpdateFileFolderDto): Promise<ResponsePayload>;
    updateMultipleFileFolderById(updateFileFolderDto: UpdateFileFolderDto): Promise<ResponsePayload>;
    deleteFileFolderById(id: string): Promise<ResponsePayload>;
    deleteMultipleFileFolderById(data: {
        ids: string[];
    }): Promise<ResponsePayload>;
}
