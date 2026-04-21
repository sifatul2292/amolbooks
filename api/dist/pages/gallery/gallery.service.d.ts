import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { Gallery } from '../../interfaces/gallery/gallery.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddGalleryDto, FilterAndPaginationGalleryDto, OptionGalleryDto, UpdateGalleryDto } from '../../dto/gallery.dto';
export declare class GalleryService {
    private readonly galleryModel;
    private configService;
    private utilsService;
    private logger;
    constructor(galleryModel: Model<Gallery>, configService: ConfigService, utilsService: UtilsService);
    addGallery(addGalleryDto: AddGalleryDto): Promise<ResponsePayload>;
    insertManyGallery(addGallerysDto: AddGalleryDto[], optionGalleryDto: OptionGalleryDto): Promise<ResponsePayload>;
    getAllGalleries(filterGalleryDto: FilterAndPaginationGalleryDto, searchQuery?: string): Promise<ResponsePayload>;
    getGalleryById(id: string, select: string): Promise<ResponsePayload>;
    updateGalleryById(id: string, updateGalleryDto: UpdateGalleryDto): Promise<ResponsePayload>;
    updateMultipleGalleryById(ids: string[], updateGalleryDto: UpdateGalleryDto): Promise<ResponsePayload>;
    deleteGalleryById(id: string): Promise<ResponsePayload>;
    deleteMultipleGalleryById(ids: string[]): Promise<ResponsePayload>;
}
