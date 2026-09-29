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
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export class ShippingChargeRuleDto {
  @IsNumber()
  @Min(0)
  fromGram: number;

  @IsNumber()
  @Min(0)
  toGram: number;

  @IsNumber()
  @Min(0)
  cost: number;
}

export class AddShippingChargeDto {
  @IsOptional()
  @IsNumber()
  deliveryInDhaka: number;

  @IsOptional()
  @IsNumber()
  deliveryOutsideDhaka: number;

  @IsOptional()
  @IsNumber()
  deliveryOutsideBD: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ShippingChargeRuleDto)
  insideDhakaRules: ShippingChargeRuleDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ShippingChargeRuleDto)
  outsideDhakaRules: ShippingChargeRuleDto[];
}

export class FilterShippingChargeDto {
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

export class OptionShippingChargeDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateShippingChargeDto {
  @IsOptional()
  @IsNumber()
  deliveryInDhaka: number;

  @IsOptional()
  @IsNumber()
  deliveryOutsideDhaka: number;

  @IsOptional()
  @IsNumber()
  deliveryOutsideBD: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids: string[];
}

export class FilterAndPaginationShippingChargeDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterShippingChargeDto)
  filter: FilterShippingChargeDto;

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
