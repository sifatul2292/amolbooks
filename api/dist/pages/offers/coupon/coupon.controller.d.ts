import { AddCouponDto, CheckCouponDto, FilterAndPaginationCouponDto, OptionCouponDto, UpdateCouponDto } from '../../../dto/coupon.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { CouponService } from './coupon.service';
import { User } from '../../../interfaces/user/user.interface';
export declare class CouponController {
    private couponService;
    private logger;
    constructor(couponService: CouponService);
    addCoupon(addCouponDto: AddCouponDto): Promise<ResponsePayload>;
    insertManyCoupon(body: {
        data: AddCouponDto[];
        option: OptionCouponDto;
    }): Promise<ResponsePayload>;
    getAllCoupons(filterCouponDto: FilterAndPaginationCouponDto, searchString: string): Promise<ResponsePayload>;
    getAllCouponsBasic(): Promise<ResponsePayload>;
    getCouponById(id: string, select: string): Promise<ResponsePayload>;
    updateCouponById(id: string, updateCouponDto: UpdateCouponDto): Promise<ResponsePayload>;
    updateMultipleCouponById(updateCouponDto: UpdateCouponDto): Promise<ResponsePayload>;
    deleteCouponById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleCouponById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
    checkCouponAvailability(user: User, checkCouponDto: CheckCouponDto): Promise<ResponsePayload>;
    checkCouponAnonymousAvailability(checkCouponDto: CheckCouponDto): Promise<ResponsePayload>;
}
