import { AddSeoPageDto, FilterAndPaginationSeoPageDto, OptionSeoPageDto, UpdateSeoPageDto } from '../../dto/seo-page.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { SeoPageService } from './seo-page.service';
export declare class SeoPageController {
    private seoPageService;
    private logger;
    constructor(seoPageService: SeoPageService);
    addSeoPage(addSeoPageDto: AddSeoPageDto): Promise<ResponsePayload>;
    insertManySeoPage(body: {
        data: AddSeoPageDto[];
        option: OptionSeoPageDto;
    }): Promise<ResponsePayload>;
    getAllSeoPages(filterSeoPageDto: FilterAndPaginationSeoPageDto, searchString: string): Promise<ResponsePayload>;
    getSeoPageById(id: string, select: string): Promise<ResponsePayload>;
    getSeoPageByPage(pageName: string, select: string): Promise<ResponsePayload>;
    updateSeoPageById(id: string, updateSeoPageDto: UpdateSeoPageDto): Promise<ResponsePayload>;
    updateMultipleSeoPageById(updateSeoPageDto: UpdateSeoPageDto): Promise<ResponsePayload>;
    deleteSeoPageById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleSeoPageById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
