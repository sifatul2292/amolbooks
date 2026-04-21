import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ManuscriptSubject } from '../../interfaces/common/manuscript-subject.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddManuscriptSubjectDto, FilterAndPaginationManuscriptSubjectDto, OptionManuscriptSubjectDto, UpdateManuscriptSubjectDto } from '../../dto/manuscript-subject.dto';
import { Product } from '../../interfaces/common/product.interface';
export declare class ManuscriptSubjectService {
    private readonly manuscriptSubjectModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(manuscriptSubjectModel: Model<ManuscriptSubject>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addManuscriptSubject(addManuscriptSubjectDto: AddManuscriptSubjectDto): Promise<ResponsePayload>;
    insertManyManuscriptSubject(addManuscriptSubjectsDto: AddManuscriptSubjectDto[], optionManuscriptSubjectDto: OptionManuscriptSubjectDto): Promise<ResponsePayload>;
    getAllManuscriptSubjects(filterManuscriptSubjectDto: FilterAndPaginationManuscriptSubjectDto, searchQuery?: string): Promise<ResponsePayload>;
    getManuscriptSubjectById(id: string, select: string): Promise<ResponsePayload>;
    updateManuscriptSubjectById(id: string, updateManuscriptSubjectDto: UpdateManuscriptSubjectDto): Promise<ResponsePayload>;
    updateMultipleManuscriptSubjectById(ids: string[], updateManuscriptSubjectDto: UpdateManuscriptSubjectDto): Promise<ResponsePayload>;
    deleteManuscriptSubjectById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleManuscriptSubjectById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
