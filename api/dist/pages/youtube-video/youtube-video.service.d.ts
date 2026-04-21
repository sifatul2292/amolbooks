import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { YoutubeVideo } from '../../interfaces/common/youtube-video.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddYoutubeVideoDto, CheckYoutubeVideoDto, FilterAndPaginationYoutubeVideoDto, OptionYoutubeVideoDto, UpdateYoutubeVideoDto } from '../../dto/youtube-video.dto';
import { User } from '../../interfaces/user/user.interface';
export declare class YoutubeVideoService {
    private readonly youtubeVideoModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(youtubeVideoModel: Model<YoutubeVideo>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addYoutubeVideo(addYoutubeVideoDto: AddYoutubeVideoDto): Promise<ResponsePayload>;
    insertManyYoutubeVideo(addYoutubeVideosDto: AddYoutubeVideoDto[], optionYoutubeVideoDto: OptionYoutubeVideoDto): Promise<ResponsePayload>;
    getAllYoutubeVideosBasic(): Promise<ResponsePayload>;
    getAllYoutubeVideos(filterYoutubeVideoDto: FilterAndPaginationYoutubeVideoDto, searchQuery?: string): Promise<ResponsePayload>;
    getYoutubeVideoById(id: string, select: string): Promise<ResponsePayload>;
    updateYoutubeVideoById(id: string, updateYoutubeVideoDto: UpdateYoutubeVideoDto): Promise<ResponsePayload>;
    updateMultipleYoutubeVideoById(ids: string[], updateYoutubeVideoDto: UpdateYoutubeVideoDto): Promise<ResponsePayload>;
    deleteYoutubeVideoById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleYoutubeVideoById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkYoutubeVideoAvailability(user: User, checkYoutubeVideoDto: CheckYoutubeVideoDto): Promise<ResponsePayload>;
}
