import {
  ArrayMaxSize,
  ArrayMinSize, ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn, IsMongoId,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';
import { OrderStatus } from '../enum/order.enum';

export class AddOrderDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phoneNo: string;

  @IsOptional()
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  paymentType: string;

  @IsNotEmpty()
  @IsString()
  shippingAddress: string;

  @IsOptional()
  @IsString()
  user: string;

  @IsOptional()
  @IsString()
  coupon: string;
}

export class FilterOrderDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  visibility: boolean;

  @IsOptional()
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  price: number;
}

export class OptionOrderDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  phoneNo: string;

  @IsOptional()
  fraudChecker: any;

  @IsOptional()
  @IsString()
  adminNote: string;

  @IsOptional()
  orderStatus: any;

  @IsOptional()
  // @IsNotEmpty()
  @IsString()
  city: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  shippingAddress: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids: string[];
}

export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsNumber()
  @IsIn([
    OrderStatus.PENDING,
    OrderStatus.CONFIRM,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPING,
    OrderStatus.DELIVERED,
    OrderStatus.CANCEL,
    OrderStatus.REFUND,
    OrderStatus.Courier,
    OrderStatus.RETURN,
    OrderStatus.HOLD,
  ])
  orderStatus: number;

  @IsOptional()
  @IsString()
  courierLink: string;

  @IsOptional()
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phoneNo: string;
}

export class GenerateInvoicesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  ids: string[];
}

export class FilterAndPaginationOrderDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterOrderDto)
  filter: FilterOrderDto;

  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;

  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  sort: object;

  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  select: any;
}
