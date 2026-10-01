import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export class AddSpecialPackageDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsArray()
  products: any[];
}

export class SpecialPackageDraftItemDto {
  @IsMongoId()
  product: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class AddSpecialPackageDraftDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  sellingPrice: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => SpecialPackageDraftItemDto)
  products: SpecialPackageDraftItemDto[];
}

export class FilterSpecialPackageDto {
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

export class OptionSpecialPackageDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateSpecialPackageDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsArray()
  products: any[];

  @IsOptional()
  @IsString()
  slug: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  ids: string[];
}

export class FilterAndPaginationSpecialPackageDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterSpecialPackageDto)
  filter: FilterSpecialPackageDto;

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
