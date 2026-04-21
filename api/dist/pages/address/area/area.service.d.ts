import { Model } from 'mongoose';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddAreaDto, FilterAndPaginationAreaDto, OptionAreaDto, UpdateAreaDto } from '../../../dto/area.dto';
import { Area } from '../../../interfaces/common/area.interface';
export declare class AreaService {
    private readonly areaModel;
    private logger;
    constructor(areaModel: Model<Area>);
    addArea(addAreaDto: AddAreaDto): Promise<ResponsePayload>;
    insertManyArea(addAreasDto: AddAreaDto[], optionAreaDto: OptionAreaDto): Promise<ResponsePayload>;
    getAllAreas(filterAreaDto: FilterAndPaginationAreaDto, searchQuery?: string): Promise<ResponsePayload>;
    getAreaByParentId(id: string, select: string): Promise<ResponsePayload>;
    getAreaById(id: string, select: string): Promise<ResponsePayload>;
    updateAreaById(id: string, updateAreaDto: UpdateAreaDto): Promise<ResponsePayload>;
    updateMultipleAreaById(ids: string[], updateAreaDto: UpdateAreaDto): Promise<ResponsePayload>;
    deleteAreaById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleAreaById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
