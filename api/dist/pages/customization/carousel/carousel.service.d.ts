import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Carousel } from '../../../interfaces/common/carousel.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddCarouselDto, CheckCarouselDto, FilterAndPaginationCarouselDto, OptionCarouselDto, UpdateCarouselDto } from '../../../dto/carousel.dto';
import { User } from '../../../interfaces/user/user.interface';
export declare class CarouselService {
    private readonly carouselModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(carouselModel: Model<Carousel>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addCarousel(addCarouselDto: AddCarouselDto): Promise<ResponsePayload>;
    insertManyCarousel(addCarouselsDto: AddCarouselDto[], optionCarouselDto: OptionCarouselDto): Promise<ResponsePayload>;
    getAllCarouselsBasic(): Promise<ResponsePayload>;
    getAllCarousels(filterCarouselDto: FilterAndPaginationCarouselDto, searchQuery?: string): Promise<ResponsePayload>;
    getCarouselById(id: string, select: string): Promise<ResponsePayload>;
    updateCarouselById(id: string, updateCarouselDto: UpdateCarouselDto): Promise<ResponsePayload>;
    updateMultipleCarouselById(ids: string[], updateCarouselDto: UpdateCarouselDto): Promise<ResponsePayload>;
    deleteCarouselById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleCarouselById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkCarouselAvailability(user: User, checkCarouselDto: CheckCarouselDto): Promise<ResponsePayload>;
}
