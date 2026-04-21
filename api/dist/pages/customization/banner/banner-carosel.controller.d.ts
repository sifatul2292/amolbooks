import { AddBannerCaroselDto, CheckBannerCaroselDto, FilterAndPaginationBannerCaroselDto, OptionBannerCaroselDto, UpdateBannerCaroselDto } from '../../../dto/banner-carosel.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { BannerCaroselService } from './banner-carosel.service';
import { User } from '../../../interfaces/user/user.interface';
export declare class BannerCaroselController {
    private bannerCaroselService;
    private logger;
    constructor(bannerCaroselService: BannerCaroselService);
    addBannerCarosel(addBannerCaroselDto: AddBannerCaroselDto): Promise<ResponsePayload>;
    insertManyBannerCarosel(body: {
        data: AddBannerCaroselDto[];
        option: OptionBannerCaroselDto;
    }): Promise<ResponsePayload>;
    getAllBannerCarosels(filterBannerCaroselDto: FilterAndPaginationBannerCaroselDto, searchString: string): Promise<ResponsePayload>;
    getAllBannerCaroselsBasic(): Promise<ResponsePayload>;
    getBannerCaroselById(id: string, select: string): Promise<ResponsePayload>;
    updateBannerCaroselById(id: string, updateBannerCaroselDto: UpdateBannerCaroselDto): Promise<ResponsePayload>;
    updateMultipleBannerCaroselById(updateBannerCaroselDto: UpdateBannerCaroselDto): Promise<ResponsePayload>;
    deleteBannerCaroselById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleBannerCaroselById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkBannerCaroselAvailability(user: User, checkBannerCaroselDto: CheckBannerCaroselDto): Promise<ResponsePayload>;
}
