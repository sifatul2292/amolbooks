import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Coupon } from '../../../interfaces/common/coupon.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { AddCouponDto, CheckCouponDto, FilterAndPaginationCouponDto, OptionCouponDto, UpdateCouponDto } from '../../../dto/coupon.dto';
import { User } from '../../../interfaces/user/user.interface';
export declare class CouponService {
    private readonly couponModel;
    private readonly userModel;
    private configService;
    private utilsService;
    private logger;
    constructor(couponModel: Model<Coupon>, userModel: Model<User>, configService: ConfigService, utilsService: UtilsService);
    addCoupon(addCouponDto: AddCouponDto): Promise<ResponsePayload>;
    insertManyCoupon(addCouponsDto: AddCouponDto[], optionCouponDto: OptionCouponDto): Promise<ResponsePayload>;
    getAllCouponsBasic(): Promise<ResponsePayload>;
    getAllCoupons(filterCouponDto: FilterAndPaginationCouponDto, searchQuery?: string): Promise<ResponsePayload>;
    getCouponById(id: string, select: string): Promise<ResponsePayload>;
    updateCouponById(id: string, updateCouponDto: UpdateCouponDto): Promise<ResponsePayload>;
    updateMultipleCouponById(ids: string[], updateCouponDto: UpdateCouponDto): Promise<ResponsePayload>;
    deleteCouponById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleCouponById(ids: string[], checkUsage: boolean): Promise<ResponsePayload>;
    checkCouponAvailability(user: User, checkCouponDto: CheckCouponDto): Promise<ResponsePayload>;
    checkCouponAnonymousAvailability(checkCouponDto: CheckCouponDto): Promise<ResponsePayload>;
}
