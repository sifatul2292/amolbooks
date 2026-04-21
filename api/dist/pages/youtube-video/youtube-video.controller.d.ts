import { AddYoutubeVideoDto, CheckYoutubeVideoDto, FilterAndPaginationYoutubeVideoDto, OptionYoutubeVideoDto, UpdateYoutubeVideoDto } from '../../dto/youtube-video.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { YoutubeVideoService } from './youtube-video.service';
import { User } from '../../interfaces/user/user.interface';
export declare class YoutubeVideoController {
    private youtubeVideoService;
    private logger;
    constructor(youtubeVideoService: YoutubeVideoService);
    addYoutubeVideo(addYoutubeVideoDto: AddYoutubeVideoDto): Promise<ResponsePayload>;
    insertManyYoutubeVideo(body: {
        data: AddYoutubeVideoDto[];
        option: OptionYoutubeVideoDto;
    }): Promise<ResponsePayload>;
    getAllYoutubeVideos(filterYoutubeVideoDto: FilterAndPaginationYoutubeVideoDto, searchString: string): Promise<ResponsePayload>;
    getAllYoutubeVideosBasic(): Promise<ResponsePayload>;
    getYoutubeVideoById(id: string, select: string): Promise<ResponsePayload>;
    updateYoutubeVideoById(id: string, updateYoutubeVideoDto: UpdateYoutubeVideoDto): Promise<ResponsePayload>;
    updateMultipleYoutubeVideoById(updateYoutubeVideoDto: UpdateYoutubeVideoDto): Promise<ResponsePayload>;
    deleteYoutubeVideoById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleYoutubeVideoById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkYoutubeVideoAvailability(user: User, checkYoutubeVideoDto: CheckYoutubeVideoDto): Promise<ResponsePayload>;
}
