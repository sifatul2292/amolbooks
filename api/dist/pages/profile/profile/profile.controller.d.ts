import { AddProfileDto, CheckProfileDto, FilterAndPaginationProfileDto, OptionProfileDto, UpdateProfileDto } from '../../../dto/profile.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ProfileService } from './profile.service';
import { User } from '../../../interfaces/user/user.interface';
export declare class ProfileController {
    private profileService;
    private logger;
    constructor(profileService: ProfileService);
    addProfile(addProfileDto: AddProfileDto): Promise<ResponsePayload>;
    insertManyProfile(body: {
        data: AddProfileDto[];
        option: OptionProfileDto;
    }): Promise<ResponsePayload>;
    getAllProfiles(filterProfileDto: FilterAndPaginationProfileDto, searchString: string): Promise<ResponsePayload>;
    getAllProfilesBasic(): Promise<ResponsePayload>;
    getProfileById(id: string, select: string): Promise<ResponsePayload>;
    updateProfileById(id: string, updateProfileDto: UpdateProfileDto): Promise<ResponsePayload>;
    updateMultipleProfileById(updateProfileDto: UpdateProfileDto): Promise<ResponsePayload>;
    deleteProfileById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleProfileById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkProfileAvailability(user: User, checkProfileDto: CheckProfileDto): Promise<ResponsePayload>;
}
