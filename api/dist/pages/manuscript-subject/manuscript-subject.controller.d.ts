import { AddManuscriptSubjectDto, FilterAndPaginationManuscriptSubjectDto, OptionManuscriptSubjectDto, UpdateManuscriptSubjectDto } from '../../dto/manuscript-subject.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ManuscriptSubjectService } from './manuscript-subject.service';
export declare class ManuscriptSubjectController {
    private manuscriptSubjectService;
    private logger;
    constructor(manuscriptSubjectService: ManuscriptSubjectService);
    addManuscriptSubject(addManuscriptSubjectDto: AddManuscriptSubjectDto): Promise<ResponsePayload>;
    insertManyManuscriptSubject(body: {
        data: AddManuscriptSubjectDto[];
        option: OptionManuscriptSubjectDto;
    }): Promise<ResponsePayload>;
    getAllManuscriptSubjects(filterManuscriptSubjectDto: FilterAndPaginationManuscriptSubjectDto, searchString: string): Promise<ResponsePayload>;
    getManuscriptSubjectById(id: string, select: string): Promise<ResponsePayload>;
    updateManuscriptSubjectById(id: string, updateManuscriptSubjectDto: UpdateManuscriptSubjectDto): Promise<ResponsePayload>;
    updateMultipleManuscriptSubjectById(updateManuscriptSubjectDto: UpdateManuscriptSubjectDto): Promise<ResponsePayload>;
    deleteManuscriptSubjectById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleManuscriptSubjectById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
