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

export class AddStoreInfoDto {
  @IsNotEmpty()
  @IsString()
  storeName: string;
  
  @IsNotEmpty()
  @IsString()
  address:string;

  @IsOptional()
  @IsString()
  phoneNumber : string;

  @IsNotEmpty()
  @IsString()
  map : string

  @IsNotEmpty()
  @IsString()
  district : string
  
  @IsNotEmpty()
  @IsString()
  country : string

}


export class FilterStoreInfoDto {
  @IsOptional()
  @IsString()
  storeName: string;

  @IsOptional()
  @IsString()
  district : string

  @IsOptional()
  @IsString()
  country : string


}

export class OptionStoreInfoDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateStoreInfoDto {

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  storeName: string;
  
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  address:string;

  @IsOptional()
  @IsOptional()
  @IsString()
  phoneNumber : string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  map : string

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  district : string
  
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  country : string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids: string[];
}

export class FilterAndPaginationStoreInfoDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterStoreInfoDto)
  filter: FilterStoreInfoDto;

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
