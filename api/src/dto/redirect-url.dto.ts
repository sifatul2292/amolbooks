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

export class AddRedirectUrlDto {
  @IsNotEmpty()
  @IsString()
  name: string;



  @IsOptional()
  @IsString()
  bannerImage: string;

  @IsNotEmpty()
  startDateTime: any;

  @IsNotEmpty()
  endDateTime: any;
}

export class FilterRedirectUrlDto {
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

export class OptionRedirectUrlDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateRedirectUrlDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  redirectUrlCode: string;

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

export class FilterAndPaginationRedirectUrlDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterRedirectUrlDto)
  filter: FilterRedirectUrlDto;

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

export class CheckRedirectUrlDto {
  @IsNotEmpty()
  @IsString()
  redirectUrlCode: string;

  @IsNotEmpty()
  @IsNumber()
  subTotal: number;
}
