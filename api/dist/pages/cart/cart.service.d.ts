import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddCartDto, CartItemDto, UpdateCartDto, UpdateCartQty } from '../../dto/cart.dto';
import { Product } from '../../interfaces/common/product.interface';
import { Cart } from 'src/interfaces/common/cart.interface';
import { User } from '../../interfaces/user/user.interface';
import { SpecialPackage } from '../../interfaces/common/special-package.interface';
export declare class CartService {
    private readonly userModel;
    private readonly cartModel;
    private readonly specialPackageModel;
    private readonly productModel;
    private configService;
    private utilsService;
    private logger;
    constructor(userModel: Model<Cart>, cartModel: Model<Cart>, specialPackageModel: Model<SpecialPackage>, productModel: Model<Product>, configService: ConfigService, utilsService: UtilsService);
    addToCart(addCartDto: AddCartDto, user: User): Promise<ResponsePayload>;
    addToCartMultiple(addCartDto: AddCartDto[], user: User): Promise<ResponsePayload>;
    getCartByUserId(user: User): Promise<ResponsePayload>;
    deleteCartById(id: string, user: User): Promise<ResponsePayload>;
    updateCartById(id: string, updateCartDto: UpdateCartDto): Promise<ResponsePayload>;
    updateCartQty(id: string, updateCartQty: UpdateCartQty): Promise<ResponsePayload>;
    getLocalCartItems(cartItemDto: CartItemDto[]): Promise<ResponsePayload>;
}
