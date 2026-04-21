import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddDivisionDto, FilterAndPaginationDivisionDto, OptionDivisionDto, UpdateDivisionDto } from '../../../dto/division.dto';
import { DivisionService } from './division.service';
export declare class DivisionController {
    private divisionService;
    private logger;
    constructor(divisionService: DivisionService);
    addDivision(addDivisionDto: AddDivisionDto): Promise<ResponsePayload>;
    insertManyDivision(body: {
        data: AddDivisionDto[];
        option: OptionDivisionDto;
    }): Promise<ResponsePayload>;
    getAllDivisions(filterDivisionDto: FilterAndPaginationDivisionDto, searchString: string): Promise<ResponsePayload>;
    getDivisionById(id: string, select: string): Promise<ResponsePayload>;
    updateDivisionById(id: string, updateDivisionDto: UpdateDivisionDto): Promise<ResponsePayload>;
    updateMultipleDivisionById(updateDivisionDto: UpdateDivisionDto): Promise<ResponsePayload>;
    deleteDivisionById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleDivisionById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
