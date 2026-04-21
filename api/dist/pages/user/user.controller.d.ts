import { UserService } from './user.service';
import { User, UserAuthResponse } from '../../interfaces/user/user.interface';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddAddressDto, AuthUserDto, CheckUserDto, CheckUserRegistrationDto, CreateSocialUserDto, CreateUserDto, FilterAndPaginationUserDto, FollowUnfollowAuthor, ResetPasswordDto, UpdateAddressDto, UpdateUserDto, UserSelectFieldDto } from '../../dto/user.dto';
import { ChangePasswordDto } from '../../dto/change-password.dto';
export declare class UserController {
    private usersService;
    private logger;
    constructor(usersService: UserService);
    userSignup(createUserDto: CreateUserDto): Promise<UserAuthResponse>;
    userLogin(authUserDto: AuthUserDto): Promise<UserAuthResponse>;
    userSignupAndLogin(createUserDto: CreateUserDto): Promise<UserAuthResponse>;
    userSignupAndLoginSocial(createUserDto: CreateSocialUserDto): Promise<UserAuthResponse>;
    userSignupAndLogin1(createUserDto: CreateUserDto): Promise<UserAuthResponse>;
    checkUserForRegistration(checkUserRegistrationDto: CheckUserRegistrationDto): Promise<ResponsePayload>;
    getLoggedInUserData(userSelectFieldDto: UserSelectFieldDto, user: User): Promise<ResponsePayload>;
    getAllUsersV3(filterUserDto: FilterAndPaginationUserDto, searchString: string): Promise<ResponsePayload>;
    getFollowedAuthorListByUser(user: User): Promise<ResponsePayload>;
    getAllAddress(user: User): Promise<ResponsePayload>;
    getUserById(id: string, userSelectFieldDto: UserSelectFieldDto): Promise<ResponsePayload>;
    updateLoggedInUserInfo(user: User, updateUserDto: UpdateUserDto): Promise<ResponsePayload>;
    changeLoggedInUserPassword(user: User, changePasswordDto: ChangePasswordDto): Promise<ResponsePayload>;
    resetUserPassword(resetPasswordDto: ResetPasswordDto): Promise<ResponsePayload>;
    checkUserAndSentOtp(checkUserDto: CheckUserDto): Promise<ResponsePayload>;
    followUnfollowAuthor(user: User, followUnfollowAuthor: FollowUnfollowAuthor): Promise<ResponsePayload>;
    checkFollowedAuthorByUser(user: User, data: {
        author: string;
    }): Promise<ResponsePayload>;
    updateUserById(id: string, updateUserDto: UpdateUserDto): Promise<ResponsePayload>;
    deleteUserById(id: string): Promise<ResponsePayload>;
    deleteMultipleUserById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    addNewAddress(user: User, addAddressDto: AddAddressDto): Promise<ResponsePayload>;
    updateAddressById(id: string, updateAddressDto: UpdateAddressDto): Promise<ResponsePayload>;
    setDefaultAddressById(id: string, updateAddressDto: UpdateAddressDto, user: User): Promise<ResponsePayload>;
    deleteAddressById(id: string, user: User): Promise<ResponsePayload>;
}
