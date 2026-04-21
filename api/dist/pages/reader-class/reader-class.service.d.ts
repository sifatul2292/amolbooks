import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ReaderClass } from '../../interfaces/common/reader-class.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddReaderClassDto, FilterAndPaginationReaderClassDto, OptionReaderClassDto, UpdateReaderClassDto } from '../../dto/reader-class.dto';
import { Product } from '../../interfaces/common/product.interface';
export declare class ReaderClassService {
    private readonly readerClassModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(readerClassModel: Model<ReaderClass>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addReaderClass(addReaderClassDto: AddReaderClassDto): Promise<ResponsePayload>;
    insertManyReaderClass(addReaderClasssDto: AddReaderClassDto[], optionReaderClassDto: OptionReaderClassDto): Promise<ResponsePayload>;
    getAllReaderClasss(filterReaderClassDto: FilterAndPaginationReaderClassDto, searchQuery?: string): Promise<ResponsePayload>;
    getReaderClassById(id: string, select: string): Promise<ResponsePayload>;
    updateReaderClassById(id: string, updateReaderClassDto: UpdateReaderClassDto): Promise<ResponsePayload>;
    updateMultipleReaderClassById(ids: string[], updateReaderClassDto: UpdateReaderClassDto): Promise<ResponsePayload>;
    deleteReaderClassById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleReaderClassById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
