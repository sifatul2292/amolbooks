import { AddReaderClassDto, FilterAndPaginationReaderClassDto, OptionReaderClassDto, UpdateReaderClassDto } from '../../dto/reader-class.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ReaderClassService } from './reader-class.service';
export declare class ReaderClassController {
    private readerClassService;
    private logger;
    constructor(readerClassService: ReaderClassService);
    addReaderClass(addReaderClassDto: AddReaderClassDto): Promise<ResponsePayload>;
    insertManyReaderClass(body: {
        data: AddReaderClassDto[];
        option: OptionReaderClassDto;
    }): Promise<ResponsePayload>;
    getAllReaderClasss(filterReaderClassDto: FilterAndPaginationReaderClassDto, searchString: string): Promise<ResponsePayload>;
    getReaderClassById(id: string, select: string): Promise<ResponsePayload>;
    updateReaderClassById(id: string, updateReaderClassDto: UpdateReaderClassDto): Promise<ResponsePayload>;
    updateMultipleReaderClassById(updateReaderClassDto: UpdateReaderClassDto): Promise<ResponsePayload>;
    deleteReaderClassById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleReaderClassById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
