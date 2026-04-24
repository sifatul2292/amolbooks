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

export class AddProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  nameEn: string;

  @IsOptional()
  quantity: number;
}

export class FilterProductDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  visibility: boolean;

  @IsOptional()
  quantity: any;

  @IsOptional()
  @IsNumber()
  price: number;
}

export class FilterProductGroupDto {
  @IsOptional()
  @IsBoolean()
  isGroup: boolean;

  @IsOptional()
  @IsBoolean()
  category: boolean;

  @IsOptional()
  @IsBoolean()
  subCategory: boolean;

  @IsOptional()
  @IsBoolean()
  brand: boolean;

  @IsOptional()
  @IsBoolean()
  publisher: boolean;
}

export class OptionProductDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nameEn: string;

  @IsOptional()
  @IsString()
  slug: string;

  @IsOptional()
  quantity: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3)
  boughtTogetherIds: string[];
}

export class GetProductByIdsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  ids: string[];
}

export class FilterAndPaginationProductDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterProductDto)
  filter: FilterProductDto;

  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterProductGroupDto)
  filterGroup: FilterProductGroupDto;

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

export class ProductFilterCatalogDto {
  @IsOptional()
  @IsBoolean()
  category: boolean;

  @IsOptional()
  @IsBoolean()
  brand: boolean;

  @IsOptional()
  @IsBoolean()
  tag: boolean;

  @IsOptional()
  @IsBoolean()
  subCategory: boolean;

  @IsOptional()
  @IsBoolean()
  rating: boolean;
}
