import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ProductService } from './product.service';
import { AddProductDto, FilterAndPaginationProductDto, GetProductByIdsDto, OptionProductDto, UpdateProductDto } from '../../dto/product.dto';
export declare class ProductController {
    private productService;
    private logger;
    constructor(productService: ProductService);
    getAllTagForUi(query: Record<string, any>): Promise<ResponsePayload>;
    addProduct(addProductDto: AddProductDto): Promise<ResponsePayload>;
    cloneSingleProduct(id: string): Promise<ResponsePayload>;
    insertManyProduct(body: {
        data: AddProductDto[];
        option: OptionProductDto;
    }): Promise<ResponsePayload>;
    getAllProducts(filterProductDto: FilterAndPaginationProductDto, searchString: string): Promise<ResponsePayload>;
    getProductByIds(getProductByIdsDto: GetProductByIdsDto, select: string): Promise<ResponsePayload>;
    getRelatedProductsByMultiCategoryId(body: {
        ids: string[];
        limit: number;
    }): Promise<ResponsePayload>;
    getBoughtTogetherProducts(productSlug: string): Promise<ResponsePayload>;
    setBoughtTogetherProducts(body: {
        productIds: string[];
    }): Promise<ResponsePayload>;
    getBoughtTogetherByProduct(id: string): Promise<ResponsePayload>;
    getProductById(id: string, select: string): Promise<ResponsePayload>;
    getProductBySlug(slug: string, select: string): Promise<ResponsePayload>;
    updateProductById(id: string, updateProductDto: UpdateProductDto): Promise<ResponsePayload>;
    updateMultipleProductById(updateProductDto: UpdateProductDto): Promise<ResponsePayload>;
    deleteProductById(id: string): Promise<ResponsePayload>;
    deleteMultipleProductById(data: {
        ids: string[];
    }): Promise<ResponsePayload>;
    setProductQtyNotNull(): Promise<ResponsePayload>;
    setProductImageHttpToHttps(): Promise<ResponsePayload>;
}
