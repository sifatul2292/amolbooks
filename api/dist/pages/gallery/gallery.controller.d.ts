import { AddGalleryDto, FilterAndPaginationGalleryDto, OptionGalleryDto, UpdateGalleryDto } from '../../dto/gallery.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { GalleryService } from './gallery.service';
export declare class GalleryController {
    private galleryService;
    private logger;
    constructor(galleryService: GalleryService);
    addGallery(addGalleryDto: AddGalleryDto): Promise<ResponsePayload>;
    insertManyGallery(body: {
        data: AddGalleryDto[];
        option: OptionGalleryDto;
    }): Promise<ResponsePayload>;
    getAllGalleries(filterGalleryDto: FilterAndPaginationGalleryDto, searchString: string): Promise<ResponsePayload>;
    getAllGalleriesByAdmin(filterGalleryDto: FilterAndPaginationGalleryDto, searchString: string): Promise<ResponsePayload>;
    getGalleryById(id: string, select: string): Promise<ResponsePayload>;
    updateGalleryById(id: string, updateGalleryDto: UpdateGalleryDto): Promise<ResponsePayload>;
    updateMultipleGalleryById(updateGalleryDto: UpdateGalleryDto): Promise<ResponsePayload>;
    deleteGalleryById(id: string): Promise<ResponsePayload>;
    deleteMultipleGalleryById(data: {
        ids: string[];
    }): Promise<ResponsePayload>;
}
