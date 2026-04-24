import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AdminMetaRoles } from '../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../enum/admin-roles.enum';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { AdminMetaPermissions } from '../../decorator/admin-permissions.decorator';
import { AdminPermissions } from '../../enum/admin-permission.enum';
import { AdminPermissionGuard } from '../../guards/admin-permission.guard';
import { AdminJwtAuthGuard } from '../../guards/admin-jwt-auth.guard';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { ProductService } from './product.service';
import {
  AddProductDto,
  FilterAndPaginationProductDto,
  GetProductByIdsDto,
  OptionProductDto,
  UpdateProductDto,
} from '../../dto/product.dto';

import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';

@Controller('product')
export class ProductController {
  private logger = new Logger(ProductController.name);

  constructor(private productService: ProductService) {}


  @Get('/get-all-data')
  @UsePipes(ValidationPipe)
  async getAllTagForUi(
    @Query() query: Record<string, any>,
  ): Promise<ResponsePayload> {
    return await this.productService.getAllProductForUi(query);
  }



  /**
   * addProduct
   * insertManyProduct
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN,AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addProduct(
    @Body()
    addProductDto: AddProductDto,
  ): Promise<ResponsePayload> {
    return await this.productService.addProduct(addProductDto);
  }

  @Post('/clone')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN,AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async cloneSingleProduct(
    @Body('id')
    id: string,
  ): Promise<ResponsePayload> {
    return await this.productService.cloneSingleProduct(id);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN,AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyProduct(
    @Body()
    body: {
      data: AddProductDto[];
      option: OptionProductDto;
    },
  ): Promise<ResponsePayload> {
    return await this.productService.insertManyProduct(body.data, body.option);
  }

  /**
   * getAllProducts
   * getProductById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllProducts(
    @Body() filterProductDto: FilterAndPaginationProductDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.productService.getAllProducts(filterProductDto, searchString);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-products-by-ids')
  async getProductByIds(
    @Body() getProductByIdsDto: GetProductByIdsDto,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.productService.getProductByIds(
      getProductByIdsDto,
      select,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Post('/get-related-products-by-category-ids')
  async getRelatedProductsByMultiCategoryId(
    @Body() body: { ids: string[]; limit: number },
  ): Promise<ResponsePayload> {
    // console.log('body', body);
    return await this.productService.getRelatedProductsByMultiCategoryId(body);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-bought-together')
  async getBoughtTogetherProducts(@Query('productSlug') productSlug: string): Promise<ResponsePayload> {
    return await this.productService.getBoughtTogetherProducts(productSlug);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/set-bought-together')
  @UseGuards(AdminJwtAuthGuard)
  async setBoughtTogetherProducts(@Body() body: { productIds: string[] }): Promise<ResponsePayload> {
    return await this.productService.setBoughtTogetherProducts(body.productIds);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/get-bought-together-by-product/:id')
  async getBoughtTogetherByProduct(@Param('id') id: string): Promise<ResponsePayload> {
    return await this.productService.getBoughtTogetherByProduct(id);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getProductById(
    @Param('id') id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    if (id === 'get-bought-together') {
      return await this.productService.getBoughtTogetherProducts();
    }
    return await this.productService.getProductById(id, select);
  }


  // @Version(VERSION_NEUTRAL)
  // @Get('/get-by-slug/:slug')
  // async getProductBySlug(
  //   @Param('slug') slug: string,
  //   @Query() select: string,
  // ): Promise<ResponsePayload> {
  //   return await this.productService.getProductBySlug(slug, select);
  // }

  @Version(VERSION_NEUTRAL)
  @Get('/get-by-slug/:slug')
  async getProductBySlug(
    @Param('slug') slug: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.productService.getProductBySlug(slug, select);
  }

  /**
   * updateProductById
   * updateMultipleProductById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN,AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateProductById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ResponsePayload> {
    return await this.productService.updateProductById(id, updateProductDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN,AdminRoles.EDITOR)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleProductById(
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ResponsePayload> {
    return await this.productService.updateMultipleProductById(
      updateProductDto.ids,
      updateProductDto,
    );
  }

  /**
   * deleteProductById
   * deleteMultipleProductById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteProductById(
    @Param('id', MongoIdValidationPipe) id: string,
  ): Promise<ResponsePayload> {
    return await this.productService.deleteProductById(id);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleProductById(
    @Body() data: { ids: string[] },
  ): Promise<ResponsePayload> {
    return await this.productService.deleteMultipleProductById(data.ids);
  }

  @Version(VERSION_NEUTRAL)
  @Post('/set-product-not-null')
  async setProductQtyNotNull(): Promise<ResponsePayload> {
    return await this.productService.setProductQtyNotNull();
  }

  @Version(VERSION_NEUTRAL)
  @Post('/set-product-image-https')
  async setProductImageHttpToHttps(): Promise<ResponsePayload> {
    return await this.productService.setProductImageHttpToHttps();
  }

}
