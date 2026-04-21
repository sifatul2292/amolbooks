import { AddCartDto, CartItemDto, UpdateCartDto, UpdateCartQty } from "../../dto/cart.dto";
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { CartService } from './cart.service';
import { User } from '../../interfaces/user/user.interface';
export declare class CartController {
    private cartService;
    private logger;
    constructor(cartService: CartService);
    addToCart(addCartDto: AddCartDto, user: User): Promise<ResponsePayload>;
    addToCartMultiple(addCartDto: AddCartDto[], user: User): Promise<ResponsePayload>;
    getCartByUserId(user: User): Promise<ResponsePayload>;
    deleteCartById(id: string, user: User): Promise<ResponsePayload>;
    updateCartById(id: string, updateCartDto: UpdateCartDto): Promise<ResponsePayload>;
    updateCartQty(id: string, updateCartQty: UpdateCartQty): Promise<ResponsePayload>;
    getLocalCartItems(cartItemDto: CartItemDto[]): Promise<ResponsePayload>;
}
