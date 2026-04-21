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
import { AdminMetaRoles } from '../../../decorator/admin-roles.decorator';
import { AdminRoles } from '../../../enum/admin-roles.enum';
import { AdminRolesGuard } from '../../../guards/admin-roles.guard';
import { AdminMetaPermissions } from '../../../decorator/admin-permissions.decorator';
import { AdminPermissions } from '../../../enum/admin-permission.enum';
import { AdminPermissionGuard } from '../../../guards/admin-permission.guard';
import { AdminJwtAuthGuard } from '../../../guards/admin-jwt-auth.guard';
import {
  AddOrderDto,
  FilterAndPaginationOrderDto,
  GenerateInvoicesDto,
  OptionOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from '../../../dto/order.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { MongoIdValidationPipe } from '../../../pipes/mongo-id-validation.pipe';
import { OrderService } from './order.service';
import { UserJwtAuthGuard } from '../../../guards/user-jwt-auth.guard';
import { GetTokenUser } from '../../../decorator/get-token-user.decorator';
import { User } from '../../../interfaces/user/user.interface';
import { GetAdmin } from '../../../decorator/get-admin.decorator';
import { Admin } from '../../../interfaces/admin/admin.interface';

@Controller('order')
export class OrderController {
  private logger = new Logger(OrderController.name);

  constructor(private orderService: OrderService) {}

  /**
   * addOrder
   * insertManyOrder
   */
  @Post('/add')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(
    AdminRoles.SUPER_ADMIN,
    AdminRoles.ADMIN,
    AdminRoles.EDITOR,
    AdminRoles.Collector,
    AdminRoles.SALESMAN,
  )
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async addOrder(
    @Body()
    addOrderDto: AddOrderDto,
    @GetAdmin() admin: Admin,
  ): Promise<ResponsePayload> {
    return await this.orderService.addOrderAdmin(admin, addOrderDto);
  }

  @Put('/updateDate')
  // @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.CREATE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async updateDate(): Promise<ResponsePayload> {
    return await this.orderService.updateDate();
  }

  @Version(VERSION_NEUTRAL)
  @Post('/check-fraud-spy')
  async checkFraudSpy(
    @Body() body: { phone: string },
  ): Promise<ResponsePayload> {
    return await this.orderService.checkFraudSpy(body.phone);
  }

  @Post('/add-order-by-user')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async addOrderByUser(
    @Body()
    addOrderDto: AddOrderDto,
    @GetTokenUser() user: User,
  ): Promise<ResponsePayload> {
    return await this.orderService.addOrderByUser(addOrderDto, user);
  }

  @Post('/add-order-by-anonymous')
  @UsePipes(ValidationPipe)
  // @UseGuards(UserJwtAuthGuard)
  async addOrderByAnonymous(
    @Body()
    addOrderDto: AddOrderDto,
    // @GetTokenUser() user: User,
  ): Promise<ResponsePayload> {
    return await this.orderService.addOrderByAnonymous(addOrderDto);
  }

  @Post('/insert-many')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.CREATE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async insertManyOrder(
    @Body()
    body: {
      data: AddOrderDto[];
      option: OptionOrderDto;
    },
  ): Promise<ResponsePayload> {
    return await this.orderService.insertManyOrder(body.data, body.option);
  }

  /**
   *Multiple Invoice Method
   * generateInvoices()
   */

  @Post('/generate-invoices')
  @UsePipes(ValidationPipe)
  async generateInvoices(
    @Body() dto: GenerateInvoicesDto,
  ): Promise<ResponsePayload> {
    return this.orderService.generateInvoicesByIds(dto.ids);
  }

  /**
   * getAllOrders
   * getOrderById
   */
  @Version(VERSION_NEUTRAL)
  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllOrders(
    @Body() filterOrderDto: FilterAndPaginationOrderDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return this.orderService.getAllOrders(filterOrderDto, searchString);
  }

  @Post('/get-orders-by-user')
  @UsePipes(ValidationPipe)
  @UseGuards(UserJwtAuthGuard)
  async getOrdersByUser(
    @GetTokenUser() user: User,
    @Body() filterOrderDto: FilterAndPaginationOrderDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return await this.orderService.getOrdersByUser(
      user,
      filterOrderDto,
      searchString,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Get('/sales-stats/:filterType/:filterId')
  async getSalesStatsByFilter(
    @Param('filterType') filterType: 'publisher' | 'category',
    @Param('filterId', MongoIdValidationPipe) filterId: string,
  ): Promise<ResponsePayload> {
    return await this.orderService.getSalesStatsByFilter(filterType, filterId);
  }

  @Version(VERSION_NEUTRAL)
  @Get('/:id')
  async getOrderById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query() select: string,
  ): Promise<ResponsePayload> {
    return await this.orderService.getOrderById(id, select);
  }

  /**
   * updateOrderById
   * updateMultipleOrderById
   */
  @Version(VERSION_NEUTRAL)
  @Put('/update/:id')
  @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.EDIT)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async updateOrderById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<ResponsePayload> {
    return await this.orderService.updateOrderById(id, updateOrderDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async updateMultipleOrderById(
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<ResponsePayload> {
    return await this.orderService.updateMultipleOrderById(
      updateOrderDto.ids,
      updateOrderDto,
    );
  }

  @Version(VERSION_NEUTRAL)
  @Put('/update-order-session-key/:id')
  @UsePipes(ValidationPipe)
  async updateOrderSessionKey(
    @Param('id') id: string,
    @Body() updateOrderDto: any,
  ): Promise<ResponsePayload> {
    return await this.orderService.updateOrderSessionKey(id, updateOrderDto);
  }

  @Version(VERSION_NEUTRAL)
  @Put('/change-status/:id')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN, AdminRoles.SALESMAN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.EDIT)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async changeOrderStatus(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<ResponsePayload> {
    return await this.orderService.changeOrderStatus(id, updateOrderStatusDto);
  }

  /**
   * Invoice Method
   * generateInvoiceById()
   */
  @Get('/generate-invoice/:id')
  @UsePipes(ValidationPipe)
  // @UseGuards(VendorAuthGuard)
  async generateInvoiceById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('shop', MongoIdValidationPipe) shop: string,
  ): Promise<ResponsePayload> {
    return this.orderService.generateInvoiceById(shop, id);
  }

  @Get('/get-order-by-order-id/:orderId')
  async getOrderByOrderId(
    @Param('orderId') orderId: string,
    @Query('select') select: string,
  ): Promise<ResponsePayload> {
    return await this.orderService.getOrderByOrderId(orderId, select);
  }
  /**
   * deleteOrderById
   * deleteMultipleOrderById
   */
  @Version(VERSION_NEUTRAL)
  @Delete('/delete/:id')
  @UsePipes(ValidationPipe)
  // @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  // @UseGuards(AdminRolesGuard)
  // @AdminMetaPermissions(AdminPermissions.DELETE)
  // @UseGuards(AdminPermissionGuard)
  // @UseGuards(AdminJwtAuthGuard)
  async deleteOrderById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.orderService.deleteOrderById(id, Boolean(checkUsage));
  }

  @Version(VERSION_NEUTRAL)
  @Post('/delete-multiple')
  @UsePipes(ValidationPipe)
  @AdminMetaRoles(AdminRoles.SUPER_ADMIN)
  @UseGuards(AdminRolesGuard)
  @AdminMetaPermissions(AdminPermissions.DELETE)
  @UseGuards(AdminPermissionGuard)
  @UseGuards(AdminJwtAuthGuard)
  async deleteMultipleOrderById(
    @Body() data: { ids: string[] },
    @Query('checkUsage') checkUsage: boolean,
  ): Promise<ResponsePayload> {
    return await this.orderService.deleteMultipleOrderById(
      data.ids,
      Boolean(checkUsage),
    );
  }
}
