import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AdditionalPageService } from './additional-page.service';
import { AddAdditionalPageDto, UpdateAdditionalPageDto } from '../../dto/additional-page.dto';
export declare class AdditionalPageController {
    private additionalPageService;
    private logger;
    constructor(additionalPageService: AdditionalPageService);
    addAdditionalPage(addAdditionalPageDto: AddAdditionalPageDto): Promise<ResponsePayload>;
    getAdditionalPageById(slug: string, select: string): Promise<ResponsePayload>;
    updateAdditionalPageById(slug: string, updateAdditionalPageDto: UpdateAdditionalPageDto): Promise<ResponsePayload>;
    deleteAdditionalPageById(slug: string, checkUsage: boolean): Promise<ResponsePayload>;
}
