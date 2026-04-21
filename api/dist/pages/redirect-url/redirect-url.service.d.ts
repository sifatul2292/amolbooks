import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { User } from '../../interfaces/user/user.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddRedirectUrlDto, CheckRedirectUrlDto, FilterAndPaginationRedirectUrlDto, OptionRedirectUrlDto, UpdateRedirectUrlDto } from '../../dto/redirect-url.dto';
import { RedirectUrl } from 'src/interfaces/common/redirect-url.interface';
export declare class RedirectUrlService {
    private readonly redirectUrlModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(redirectUrlModel: Model<RedirectUrl>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addRedirectUrl(addRedirectUrlDto: AddRedirectUrlDto): Promise<ResponsePayload>;
    insertManyRedirectUrl(addRedirectUrlsDto: AddRedirectUrlDto[], optionRedirectUrlDto: OptionRedirectUrlDto): Promise<ResponsePayload>;
    getAllRedirectUrlsBasic(): Promise<ResponsePayload>;
    getAllRedirectUrls(filterRedirectUrlDto: FilterAndPaginationRedirectUrlDto, searchQuery?: string): Promise<ResponsePayload>;
    getRedirectUrlById(id: string, select: string): Promise<ResponsePayload>;
    updateRedirectUrlById(id: string, updateRedirectUrlDto: UpdateRedirectUrlDto): Promise<ResponsePayload>;
    updateMultipleRedirectUrlById(ids: string[], updateRedirectUrlDto: UpdateRedirectUrlDto): Promise<ResponsePayload>;
    deleteRedirectUrlById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleRedirectUrlById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkRedirectUrlAvailability(user: User, checkRedirectUrlDto: CheckRedirectUrlDto): Promise<ResponsePayload>;
}
