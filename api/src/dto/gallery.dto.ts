import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';
import { FileTypes } from '../enum/file-types.enum';

export class AddGalleryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsNotEmpty()
  @IsString()
  @IsIn([FileTypes.IMAGE, FileTypes.VIDEO, FileTypes.PDF])
  type: string;
}

export class FilterGalleryDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  folder: any;

  @IsOptional()
  @IsString()
  @IsIn([FileTypes.IMAGE, FileTypes.VIDEO, FileTypes.PDF])
  type: string;
}

export class OptionGalleryDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateGalleryDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  @IsIn([FileTypes.IMAGE, FileTypes.VIDEO, FileTypes.PDF])
  type: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids: string[];
}

export class FilterAndPaginationGalleryDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterGalleryDto)
  filter: FilterGalleryDto;

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
