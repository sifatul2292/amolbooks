import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddAreaDto, FilterAndPaginationAreaDto, OptionAreaDto, UpdateAreaDto } from '../../../dto/area.dto';
import { AreaService } from './area.service';
export declare class AreaController {
    private areaService;
    private logger;
    constructor(areaService: AreaService);
    addArea(addAreaDto: AddAreaDto): Promise<ResponsePayload>;
    insertManyArea(body: {
        data: AddAreaDto[];
        option: OptionAreaDto;
    }): Promise<ResponsePayload>;
    getAllAreas(filterAreaDto: FilterAndPaginationAreaDto, searchString: string): Promise<ResponsePayload>;
    getAreaByParentId(id: string, select: string): Promise<ResponsePayload>;
    getAreaById(id: string, select: string): Promise<ResponsePayload>;
    updateAreaById(id: string, updateAreaDto: UpdateAreaDto): Promise<ResponsePayload>;
    updateMultipleAreaById(updateAreaDto: UpdateAreaDto): Promise<ResponsePayload>;
    deleteAreaById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleAreaById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
