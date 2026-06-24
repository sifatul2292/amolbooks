import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export class AddOrderOfferDto {
  @IsOptional()
  @IsNumber()
  firstOrderDiscountAmount: number;

  @IsOptional()
  @IsNumber()
  firstOrderDiscountType: number;

  @IsOptional()
  @IsNumber()
  firstOrderMinAmount: number;

  // Free-gift (notebook) offer config
  @IsOptional()
  @IsBoolean()
  giftEnabled: boolean;

  @IsOptional()
  @IsNumber()
  giftMinAmount: number;

  @IsOptional()
  @IsObject()
  giftProduct: object;

  @IsOptional()
  @IsString()
  giftBuyXProductSlug: string;

  @IsOptional()
  @IsNumber()
  giftBuyXQty: number;

  @IsOptional()
  @IsString()
  giftLabel: string;
}

export class FilterOrderOfferDto {
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

export class OptionOrderOfferDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateOrderOfferDto {
  @IsOptional()
  @IsNumber()
  firstOrderDiscountAmount: number;

  @IsOptional()
  @IsNumber()
  firstOrderDiscountType: number;

  @IsOptional()
  @IsNumber()
  firstOrderMinAmount: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids: string[];
}

export class FilterAndPaginationOrderOfferDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterOrderOfferDto)
  filter: FilterOrderOfferDto;

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
