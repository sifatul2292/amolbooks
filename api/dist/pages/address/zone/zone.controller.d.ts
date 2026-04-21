import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddZoneDto, FilterAndPaginationZoneDto, OptionZoneDto, UpdateZoneDto } from '../../../dto/zone.dto';
import { ZoneService } from './zone.service';
export declare class ZoneController {
    private zoneService;
    private logger;
    constructor(zoneService: ZoneService);
    addZone(addZoneDto: AddZoneDto): Promise<ResponsePayload>;
    insertManyZone(body: {
        data: AddZoneDto[];
        option: OptionZoneDto;
    }): Promise<ResponsePayload>;
    getAllZones(filterZoneDto: FilterAndPaginationZoneDto, searchString: string): Promise<ResponsePayload>;
    getZoneByParentId(id: string, select: string): Promise<ResponsePayload>;
    getZoneById(id: string, select: string): Promise<ResponsePayload>;
    updateZoneById(id: string, updateZoneDto: UpdateZoneDto): Promise<ResponsePayload>;
    updateMultipleZoneById(updateZoneDto: UpdateZoneDto): Promise<ResponsePayload>;
    deleteZoneById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleZoneById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
