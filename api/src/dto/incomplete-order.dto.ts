import {
  IsArray,
  IsMongoId,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export class AddIncompleteOrderDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phoneNo?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  division?: any;

  @IsOptional()
  area?: any;

  @IsOptional()
  zone?: any;

  @IsOptional()
  @IsString()
  paymentType?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsNumber()
  orderStatus?: number;

  @IsOptional()
  @IsNumber()
  grandTotal?: number;

  @IsOptional()
  @IsNumber()
  subTotal?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  deliveryCharge?: number;

  @IsOptional()
  @IsString()
  checkoutDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  adminNote?: string;

  @IsOptional()
  fraudChecker?: any;

  @IsOptional()
  @IsArray()
  orderedItems?: any[];

  @IsOptional()
  @IsString()
  user?: string;
}

export class UpdateIncompleteOrderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phoneNo?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  division?: any;

  @IsOptional()
  area?: any;

  @IsOptional()
  zone?: any;

  @IsOptional()
  @IsString()
  paymentType?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsNumber()
  orderStatus?: number;

  @IsOptional()
  @IsNumber()
  grandTotal?: number;

  @IsOptional()
  @IsNumber()
  subTotal?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  deliveryCharge?: number;

  @IsOptional()
  @IsString()
  checkoutDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  adminNote?: string;

  @IsOptional()
  fraudChecker?: any;

  @IsOptional()
  @IsArray()
  orderedItems?: any[];
}

export class FilterIncompleteOrderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phoneNo?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class FilterAndPaginationIncompleteOrderDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  filter?: object;

  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination?: PaginationDto;

  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  sort?: object;

  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  select?: any;
}

export class DeleteMultipleIncompleteOrderDto {
  @IsArray()
  @IsMongoId({ each: true })
  ids: string[];
}
