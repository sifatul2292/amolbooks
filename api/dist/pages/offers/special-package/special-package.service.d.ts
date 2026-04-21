import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { Product } from '../../../interfaces/common/product.interface';
import { SpecialPackage } from '../../../interfaces/common/special-package.interface';
import { AddSpecialPackageDto, FilterAndPaginationSpecialPackageDto, OptionSpecialPackageDto, UpdateSpecialPackageDto } from '../../../dto/special-package.dto';
import { JobSchedulerService } from '../../../shared/job-scheduler/job-scheduler.service';
export declare class SpecialPackageService {
    private readonly specialPackageModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private jobSchedulerService;
    private logger;
    constructor(specialPackageModel: Model<SpecialPackage>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService, jobSchedulerService: JobSchedulerService);
    addSpecialPackage(addSpecialPackageDto: AddSpecialPackageDto): Promise<ResponsePayload>;
    insertManySpecialPackage(addSpecialPackagesDto: AddSpecialPackageDto[], optionSpecialPackageDto: OptionSpecialPackageDto): Promise<ResponsePayload>;
    getAllSpecialPackages(filterSpecialPackageDto: FilterAndPaginationSpecialPackageDto, searchQuery?: string): Promise<ResponsePayload>;
    getSpecialPackageByIds(ids: any, select: string): Promise<ResponsePayload>;
    getSpecialPackageById(id: string, select: string): Promise<ResponsePayload>;
    getSpecialPackageBySlug(slug: string, select: string): Promise<ResponsePayload>;
    getSpecialPackageSingle(select?: string): Promise<ResponsePayload>;
    updateSpecialPackageById(id: string, updateSpecialPackageDto: UpdateSpecialPackageDto): Promise<ResponsePayload>;
    updateMultipleSpecialPackageById(ids: string[], updateSpecialPackageDto: UpdateSpecialPackageDto): Promise<ResponsePayload>;
    deleteSpecialPackageById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleSpecialPackageById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
}
