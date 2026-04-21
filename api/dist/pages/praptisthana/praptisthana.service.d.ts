import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User } from '../../interfaces/user/user.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Praptisthana } from '../../interfaces/common/praptisthana.interface';
import { AddPraptisthanaDto, CheckPraptisthanaDto, FilterAndPaginationPraptisthanaDto, OptionPraptisthanaDto, UpdatePraptisthanaDto } from '../../dto/praptisthana.dto';
import { UtilsService } from '../../shared/utils/utils.service';
export declare class PraptisthanaService {
    private readonly praptisthanaModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(praptisthanaModel: Model<Praptisthana>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addPraptisthana(addPraptisthanaDto: AddPraptisthanaDto): Promise<ResponsePayload>;
    insertManyPraptisthana(addPraptisthanasDto: AddPraptisthanaDto[], optionPraptisthanaDto: OptionPraptisthanaDto): Promise<ResponsePayload>;
    getAllPraptisthanasBasic(): Promise<ResponsePayload>;
    getAllPraptisthanas(filterPraptisthanaDto: FilterAndPaginationPraptisthanaDto, searchQuery?: string): Promise<ResponsePayload>;
    getPraptisthanaById(id: string, select: string): Promise<ResponsePayload>;
    updatePraptisthanaById(id: string, updatePraptisthanaDto: UpdatePraptisthanaDto): Promise<ResponsePayload>;
    updateMultiplePraptisthanaById(ids: string[], updatePraptisthanaDto: UpdatePraptisthanaDto): Promise<ResponsePayload>;
    deletePraptisthanaById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultiplePraptisthanaById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkPraptisthanaAvailability(user: User, checkPraptisthanaDto: CheckPraptisthanaDto): Promise<ResponsePayload>;
}
