import { Model } from 'mongoose';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddDivisionDto, FilterAndPaginationDivisionDto, OptionDivisionDto, UpdateDivisionDto } from '../../../dto/division.dto';
import { Division } from '../../../interfaces/common/division.interface';
export declare class DivisionService {
    private readonly divisionModel;
    private logger;
    constructor(divisionModel: Model<Division>);
    addDivision(addDivisionDto: AddDivisionDto): Promise<ResponsePayload>;
    insertManyDivision(addDivisionsDto: AddDivisionDto[], optionDivisionDto: OptionDivisionDto): Promise<ResponsePayload>;
    getAllDivisions(filterDivisionDto: FilterAndPaginationDivisionDto, searchQuery?: string): Promise<ResponsePayload>;
    getDivisionById(id: string, select: string): Promise<ResponsePayload>;
    updateDivisionById(id: string, updateDivisionDto: UpdateDivisionDto): Promise<ResponsePayload>;
    updateMultipleDivisionById(ids: string[], updateDivisionDto: UpdateDivisionDto): Promise<ResponsePayload>;
    deleteDivisionById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleDivisionById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
