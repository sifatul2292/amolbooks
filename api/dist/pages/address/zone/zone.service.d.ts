import { Model } from 'mongoose';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddZoneDto, FilterAndPaginationZoneDto, OptionZoneDto, UpdateZoneDto } from '../../../dto/zone.dto';
import { Zone } from '../../../interfaces/common/zone.interface';
export declare class ZoneService {
    private readonly zoneModel;
    private logger;
    constructor(zoneModel: Model<Zone>);
    addZone(addZoneDto: AddZoneDto): Promise<ResponsePayload>;
    insertManyZone(addZonesDto: AddZoneDto[], optionZoneDto: OptionZoneDto): Promise<ResponsePayload>;
    getAllZones(filterZoneDto: FilterAndPaginationZoneDto, searchQuery?: string): Promise<ResponsePayload>;
    getZoneByParentId(id: string, select: string): Promise<ResponsePayload>;
    getZoneById(id: string, select: string): Promise<ResponsePayload>;
    updateZoneById(id: string, updateZoneDto: UpdateZoneDto): Promise<ResponsePayload>;
    updateMultipleZoneById(ids: string[], updateZoneDto: UpdateZoneDto): Promise<ResponsePayload>;
    deleteZoneById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleZoneById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
