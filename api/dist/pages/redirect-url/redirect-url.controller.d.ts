import { AddRedirectUrlDto, CheckRedirectUrlDto, FilterAndPaginationRedirectUrlDto, OptionRedirectUrlDto, UpdateRedirectUrlDto } from 'src/dto/redirect-url.dto';
import { ResponsePayload } from 'src/interfaces/core/response-payload.interface';
import { RedirectUrlService } from './redirect-url.service';
import { User } from '../../interfaces/user/user.interface';
export declare class RedirectUrlController {
    private redirectUrlService;
    private logger;
    constructor(redirectUrlService: RedirectUrlService);
    addRedirectUrl(addRedirectUrlDto: AddRedirectUrlDto): Promise<ResponsePayload>;
    insertManyRedirectUrl(body: {
        data: AddRedirectUrlDto[];
        option: OptionRedirectUrlDto;
    }): Promise<ResponsePayload>;
    getAllRedirectUrls(filterRedirectUrlDto: FilterAndPaginationRedirectUrlDto, searchString: string): Promise<ResponsePayload>;
    getAllRedirectUrlsBasic(): Promise<ResponsePayload>;
    getRedirectUrlById(id: string, select: string): Promise<ResponsePayload>;
    updateRedirectUrlById(id: string, updateRedirectUrlDto: UpdateRedirectUrlDto): Promise<ResponsePayload>;
    updateMultipleRedirectUrlById(updateRedirectUrlDto: UpdateRedirectUrlDto): Promise<ResponsePayload>;
    deleteRedirectUrlById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleRedirectUrlById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkRedirectUrlAvailability(user: User, checkRedirectUrlDto: CheckRedirectUrlDto): Promise<ResponsePayload>;
}
