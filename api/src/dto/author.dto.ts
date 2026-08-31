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

export class AddAuthorDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  bannerImage: string;

  @IsNotEmpty()
  startDateTime: any;

  @IsNotEmpty()
  endDateTime: any;
}

export class FilterAuthorDto {
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

export class OptionAuthorDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateAuthorDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsString()
  authorCode: string;

  @IsOptional()
  @IsString()
  bannerImage: string;

  @IsNotEmpty()
  startDateTime: any;

  @IsNotEmpty()
  endDateTime: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids: string[];
}

export class FilterAndPaginationAuthorDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterAuthorDto)
  filter: FilterAuthorDto;

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

export class CheckAuthorDto {
  @IsNotEmpty()
  @IsString()
  authorCode: string;

  @IsNotEmpty()
  @IsNumber()
  subTotal: number;
}
