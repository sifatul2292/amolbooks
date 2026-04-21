import { User } from '../../interfaces/user/user.interface';
import { AddPraptisthanaDto, CheckPraptisthanaDto, FilterAndPaginationPraptisthanaDto, OptionPraptisthanaDto, UpdatePraptisthanaDto } from '../../dto/praptisthana.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { PraptisthanaService } from './praptisthana.service';
export declare class PraptisthanaController {
    private praptisthanaService;
    private logger;
    constructor(praptisthanaService: PraptisthanaService);
    addPraptisthana(addPraptisthanaDto: AddPraptisthanaDto): Promise<ResponsePayload>;
    insertManyPraptisthana(body: {
        data: AddPraptisthanaDto[];
        option: OptionPraptisthanaDto;
    }): Promise<ResponsePayload>;
    getAllPraptisthanas(filterPraptisthanaDto: FilterAndPaginationPraptisthanaDto, searchString: string): Promise<ResponsePayload>;
    getAllPraptisthanasBasic(): Promise<ResponsePayload>;
    getPraptisthanaById(id: string, select: string): Promise<ResponsePayload>;
    updatePraptisthanaById(id: string, updatePraptisthanaDto: UpdatePraptisthanaDto): Promise<ResponsePayload>;
    updateMultiplePraptisthanaById(updatePraptisthanaDto: UpdatePraptisthanaDto): Promise<ResponsePayload>;
    deletePraptisthanaById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultiplePraptisthanaById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkPraptisthanaAvailability(user: User, checkPraptisthanaDto: CheckPraptisthanaDto): Promise<ResponsePayload>;
}
