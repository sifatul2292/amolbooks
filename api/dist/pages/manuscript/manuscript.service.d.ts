import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { Manuscript } from '../../interfaces/common/manuscript.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddManuscriptDto, FilterAndPaginationManuscriptDto, OptionManuscriptDto, UpdateManuscriptDto } from '../../dto/manuscript.dto';
import { User } from '../../interfaces/user/user.interface';
export declare class ManuscriptService {
    private readonly manuscriptModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(manuscriptModel: Model<Manuscript>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addManuscript(addManuscriptDto: AddManuscriptDto): Promise<ResponsePayload>;
    insertManyManuscript(addManuscriptsDto: AddManuscriptDto[], optionManuscriptDto: OptionManuscriptDto): Promise<ResponsePayload>;
    getAllManuscriptsBasic(): Promise<ResponsePayload>;
    getAllManuscripts(filterManuscriptDto: FilterAndPaginationManuscriptDto, searchQuery?: string): Promise<ResponsePayload>;
    getManuscriptById(id: string, select: string): Promise<ResponsePayload>;
    updateManuscriptById(id: string, updateManuscriptDto: UpdateManuscriptDto): Promise<ResponsePayload>;
    updateMultipleManuscriptById(ids: string[], updateManuscriptDto: UpdateManuscriptDto): Promise<ResponsePayload>;
    deleteManuscriptById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleManuscriptById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
