import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
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

export class AddCartDto {
  @IsOptional()
  @IsString()
  product: string;

  @IsOptional()
  @IsString()
  specialPackage: string;

  @IsOptional()
  @IsNumber()
  cartType: number;

  @IsNotEmpty()
  @IsNumber()
  selectedQty: number;

  @IsOptional()
  selectedVariation: any | null;
}

export class FilterCartDto {
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

export class OptionCartDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateCartDto {
  @IsOptional()
  @IsString()
  product: string;

  @IsOptional()
  @IsString()
  user: string;

  @IsOptional()
  @IsNumber()
  selectedQty: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids: string[];
}
export class UpdateCartQty {
  @IsOptional()
  @IsString()
  type: string;

  @IsOptional()
  @IsNumber()
  selectedQty: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids: string[];
}

export class CartItemDto {
  @IsOptional()
  @IsString()
  product: string;

  @IsOptional()
  @IsNumber()
  selectedQty: number;

  @IsOptional()
  @IsNumber()
  cartType: number;

  @IsOptional()
  @IsString()
  specialPackage: string;
}

export class FilterAndPaginationCartDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterCartDto)
  filter: FilterCartDto;

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
