import { IsNotEmpty, IsString, IsOptional, IsMongoId, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export class AddPreOrderDto {
  @IsNotEmpty()
  @IsMongoId()
  product: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phoneNo: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsMongoId()
  user?: string;
}

export class FilterAndPaginationPreOrderDto {
  @IsOptional()
  @IsObject()
  filter?: any;

  @IsOptional()
  @Type(() => PaginationDto)
  pagination?: PaginationDto;

  @IsOptional()
  @IsObject()
  sort?: any;

  @IsOptional()
  @IsObject()
  select?: any;
}

export class UpdatePreOrderStatusDto {
  @IsNotEmpty()
  @IsEnum(['pending', 'completed', 'cancelled'])
  status: 'pending' | 'completed' | 'cancelled';
}

