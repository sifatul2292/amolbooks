import { AddDiscountPercentDto, FilterAndPaginationDiscountPercentDto, OptionDiscountPercentDto, UpdateDiscountPercentDto } from '../../dto/discount-percent.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { DiscountPercentService } from './discount-percent.service';
export declare class DiscountPercentController {
    private discountPercentService;
    private logger;
    constructor(discountPercentService: DiscountPercentService);
    addDiscountPercent(addDiscountPercentDto: AddDiscountPercentDto): Promise<ResponsePayload>;
    insertManyDiscountPercent(body: {
        data: AddDiscountPercentDto[];
        option: OptionDiscountPercentDto;
    }): Promise<ResponsePayload>;
    getAllDiscountPercents(filterDiscountPercentDto: FilterAndPaginationDiscountPercentDto, searchString: string): Promise<ResponsePayload>;
    getDiscountPercentById(id: string, select: string): Promise<ResponsePayload>;
    updateDiscountPercentById(id: string, updateDiscountPercentDto: UpdateDiscountPercentDto): Promise<ResponsePayload>;
    updateMultipleDiscountPercentById(updateDiscountPercentDto: UpdateDiscountPercentDto): Promise<ResponsePayload>;
    deleteDiscountPercentById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleDiscountPercentById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
