import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { BannerCarosel } from '../../../interfaces/common/banner-carosel.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddBannerCaroselDto, CheckBannerCaroselDto, FilterAndPaginationBannerCaroselDto, OptionBannerCaroselDto, UpdateBannerCaroselDto } from '../../../dto/banner-carosel.dto';
import { User } from '../../../interfaces/user/user.interface';
export declare class BannerCaroselService {
    private readonly bannerCaroselModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(bannerCaroselModel: Model<BannerCarosel>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addBannerCarosel(addBannerCaroselDto: AddBannerCaroselDto): Promise<ResponsePayload>;
    insertManyBannerCarosel(addBannerCaroselsDto: AddBannerCaroselDto[], optionBannerCaroselDto: OptionBannerCaroselDto): Promise<ResponsePayload>;
    getAllBannerCaroselsBasic(): Promise<ResponsePayload>;
    getAllBannerCarosels(filterBannerCaroselDto: FilterAndPaginationBannerCaroselDto, searchQuery?: string): Promise<ResponsePayload>;
    getBannerCaroselById(id: string, select: string): Promise<ResponsePayload>;
    updateBannerCaroselById(id: string, updateBannerCaroselDto: UpdateBannerCaroselDto): Promise<ResponsePayload>;
    updateMultipleBannerCaroselById(ids: string[], updateBannerCaroselDto: UpdateBannerCaroselDto): Promise<ResponsePayload>;
    deleteBannerCaroselById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleBannerCaroselById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkBannerCaroselAvailability(user: User, checkBannerCaroselDto: CheckBannerCaroselDto): Promise<ResponsePayload>;
}
