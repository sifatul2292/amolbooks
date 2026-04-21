import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Product } from '../../interfaces/common/product.interface';
import { User } from '../../interfaces/user/user.interface';
import { AddWishListDto, UpdateWishListDto, UpdateWishListQty } from '../../dto/wish-list.dto';
import { WishList } from '../../interfaces/common/wish-list.interface';
export declare class WishListService {
    private readonly userModel;
    private readonly wishListModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(userModel: Model<WishList>, wishListModel: Model<WishList>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addToWishList(addWishListDto: AddWishListDto, user: User): Promise<ResponsePayload>;
    addToWishListMultiple(addWishListDto: AddWishListDto[], user: User): Promise<ResponsePayload>;
    getWishListByUserId(user: User): Promise<ResponsePayload>;
    deleteWishListById(id: string, user: User): Promise<ResponsePayload>;
    updateWishListById(id: string, updateWishListDto: UpdateWishListDto): Promise<ResponsePayload>;
    updateWishListQty(id: string, updateWishListQty: UpdateWishListQty): Promise<ResponsePayload>;
}
