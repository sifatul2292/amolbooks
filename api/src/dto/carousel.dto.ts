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

export class AddCarouselDto {
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

export class FilterCarouselDto {
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

export class OptionCarouselDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateCarouselDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  carouselCode: string;

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

export class FilterAndPaginationCarouselDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterCarouselDto)
  filter: FilterCarouselDto;

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

export class CheckCarouselDto {
  @IsNotEmpty()
  @IsString()
  carouselCode: string;

  @IsNotEmpty()
  @IsNumber()
  subTotal: number;
}
