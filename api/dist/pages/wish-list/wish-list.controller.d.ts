import { AddWishListDto, UpdateWishListDto, UpdateWishListQty } from '../../dto/wish-list.dto';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { WishListService } from './wish-list.service';
import { User } from '../../interfaces/user/user.interface';
export declare class WishListController {
    private wishListService;
    private logger;
    constructor(wishListService: WishListService);
    addToWishList(addWishListDto: AddWishListDto, user: User): Promise<ResponsePayload>;
    addToWishListMultiple(addWishListDto: AddWishListDto[], user: User): Promise<ResponsePayload>;
    getWishListByUserId(user: User): Promise<ResponsePayload>;
    deleteWishListById(id: string, user: User): Promise<ResponsePayload>;
    updateWishListById(id: string, updateWishListDto: UpdateWishListDto): Promise<ResponsePayload>;
    updateWishListQty(id: string, updateWishListQty: UpdateWishListQty): Promise<ResponsePayload>;
}
