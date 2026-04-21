import { Controller, Post, Get, Put, Delete, Body, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { PreOrderService } from './pre-order.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { AddPreOrderDto, FilterAndPaginationPreOrderDto, UpdatePreOrderStatusDto } from '../../dto/pre-order.dto';
import { MongoIdValidationPipe } from '../../pipes/mongo-id-validation.pipe';

@Controller('pre-order')
export class PreOrderController {
  constructor(private readonly preOrderService: PreOrderService) {}

  @Post('/add')
  @UsePipes(ValidationPipe)
  async addPreOrder(
    @Body() addPreOrderDto: AddPreOrderDto,
  ): Promise<ResponsePayload> {
    return await this.preOrderService.addPreOrder(addPreOrderDto);
  }

  @Post('/get-all')
  @UsePipes(ValidationPipe)
  async getAllPreOrders(
    @Body() filterPreOrderDto: FilterAndPaginationPreOrderDto,
    @Query('q') searchString: string,
  ): Promise<ResponsePayload> {
    return await this.preOrderService.getAllPreOrders(filterPreOrderDto, searchString);
  }

  @Get('/:id')
  async getSinglePreOrderById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Query('select') select: string,
  ): Promise<ResponsePayload> {
    return await this.preOrderService.getSinglePreOrderById(id, select);
  }

  @Put('/update-status/:id')
  @UsePipes(ValidationPipe)
  async updatePreOrderStatus(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() updatePreOrderStatusDto: UpdatePreOrderStatusDto,
  ): Promise<ResponsePayload> {
    return await this.preOrderService.updatePreOrderStatus(id, updatePreOrderStatusDto);
  }

  @Delete('/:id')
  async deletePreOrderById(
    @Param('id', MongoIdValidationPipe) id: string,
  ): Promise<ResponsePayload> {
    return await this.preOrderService.deletePreOrderById(id);
  }
}

