import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Profile } from '../../../interfaces/common/profile.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddProfileDto, CheckProfileDto, FilterAndPaginationProfileDto, OptionProfileDto, UpdateProfileDto } from '../../../dto/profile.dto';
import { User } from '../../../interfaces/user/user.interface';
export declare class ProfileService {
    private readonly profileModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(profileModel: Model<Profile>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addProfile(addProfileDto: AddProfileDto): Promise<ResponsePayload>;
    insertManyProfile(addProfilesDto: AddProfileDto[], optionProfileDto: OptionProfileDto): Promise<ResponsePayload>;
    getAllProfilesBasic(): Promise<ResponsePayload>;
    getAllProfiles(filterProfileDto: FilterAndPaginationProfileDto, searchQuery?: string): Promise<ResponsePayload>;
    getProfileById(id: string, select: string): Promise<ResponsePayload>;
    updateProfileById(id: string, updateProfileDto: UpdateProfileDto): Promise<ResponsePayload>;
    updateMultipleProfileById(ids: string[], updateProfileDto: UpdateProfileDto): Promise<ResponsePayload>;
    deleteProfileById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleProfileById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkProfileAvailability(user: User, checkProfileDto: CheckProfileDto): Promise<ResponsePayload>;
}
