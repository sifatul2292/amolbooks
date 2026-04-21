import { AddCarouselDto, CheckCarouselDto, FilterAndPaginationCarouselDto, OptionCarouselDto, UpdateCarouselDto } from '../../../dto/carousel.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { CarouselService } from './carousel.service';
import { User } from '../../../interfaces/user/user.interface';
export declare class CarouselController {
    private carouselService;
    private logger;
    constructor(carouselService: CarouselService);
    addCarousel(addCarouselDto: AddCarouselDto): Promise<ResponsePayload>;
    insertManyCarousel(body: {
        data: AddCarouselDto[];
        option: OptionCarouselDto;
    }): Promise<ResponsePayload>;
    getAllCarousels(filterCarouselDto: FilterAndPaginationCarouselDto, searchString: string): Promise<ResponsePayload>;
    getAllCarouselsBasic(): Promise<ResponsePayload>;
    getCarouselById(id: string, select: string): Promise<ResponsePayload>;
    updateCarouselById(id: string, updateCarouselDto: UpdateCarouselDto): Promise<ResponsePayload>;
    updateMultipleCarouselById(updateCarouselDto: UpdateCarouselDto): Promise<ResponsePayload>;
    deleteCarouselById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleCarouselById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkCarouselAvailability(user: User, checkCarouselDto: CheckCarouselDto): Promise<ResponsePayload>;
}
