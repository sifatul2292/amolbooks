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

export class AddYoutubeVideoDto {
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

export class FilterYoutubeVideoDto {
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

export class OptionYoutubeVideoDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateYoutubeVideoDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  youtubeVideoCode: string;

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

export class FilterAndPaginationYoutubeVideoDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterYoutubeVideoDto)
  filter: FilterYoutubeVideoDto;

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

export class CheckYoutubeVideoDto {
  @IsNotEmpty()
  @IsString()
  youtubeVideoCode: string;

  @IsNotEmpty()
  @IsNumber()
  subTotal: number;
}
