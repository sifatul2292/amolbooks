import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { SpecialPackageService } from './special-package.service';
import { AddSpecialPackageDto, FilterAndPaginationSpecialPackageDto, OptionSpecialPackageDto, UpdateSpecialPackageDto } from '../../../dto/special-package.dto';
export declare class SpecialPackageController {
    private promoOfferService;
    private logger;
    constructor(promoOfferService: SpecialPackageService);
    addSpecialPackage(addSpecialPackageDto: AddSpecialPackageDto): Promise<ResponsePayload>;
    insertManySpecialPackage(body: {
        data: AddSpecialPackageDto[];
        option: OptionSpecialPackageDto;
    }): Promise<ResponsePayload>;
    getAllSpecialPackages(filterSpecialPackageDto: FilterAndPaginationSpecialPackageDto, searchString: string): Promise<ResponsePayload>;
    getSpecialPackageSingle(select: string): Promise<ResponsePayload>;
    getSpecialPackageById(id: string, select: string): Promise<ResponsePayload>;
    getSpecialPackageBySlug(slug: string, select: string): Promise<ResponsePayload>;
    getProductByIds(ids: any, select: string): Promise<ResponsePayload>;
    updateSpecialPackageById(id: string, updateSpecialPackageDto: UpdateSpecialPackageDto): Promise<ResponsePayload>;
    updateMultipleSpecialPackageById(updateSpecialPackageDto: UpdateSpecialPackageDto): Promise<ResponsePayload>;
    deleteSpecialPackageById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleSpecialPackageById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
