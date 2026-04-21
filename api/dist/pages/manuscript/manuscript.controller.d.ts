import { AddManuscriptDto, FilterAndPaginationManuscriptDto, OptionManuscriptDto, UpdateManuscriptDto } from '../../dto/manuscript.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ManuscriptService } from './manuscript.service';
export declare class ManuscriptController {
    private manuscriptService;
    private logger;
    constructor(manuscriptService: ManuscriptService);
    addManuscript(addManuscriptDto: AddManuscriptDto): Promise<ResponsePayload>;
    insertManyManuscript(body: {
        data: AddManuscriptDto[];
        option: OptionManuscriptDto;
    }): Promise<ResponsePayload>;
    getAllManuscripts(filterManuscriptDto: FilterAndPaginationManuscriptDto, searchString: string): Promise<ResponsePayload>;
    getAllManuscriptsBasic(): Promise<ResponsePayload>;
    getManuscriptById(id: string, select: string): Promise<ResponsePayload>;
    updateManuscriptById(id: string, updateManuscriptDto: UpdateManuscriptDto): Promise<ResponsePayload>;
    updateMultipleManuscriptById(updateManuscriptDto: UpdateManuscriptDto): Promise<ResponsePayload>;
    deleteManuscriptById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleManuscriptById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
