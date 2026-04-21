import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
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

export class AddBlogCommentDto {
  @IsOptional()
  @IsString()
  user: string;

  @IsOptional()
  @IsString()
  product: string;

  @IsOptional()
  @IsString()
  blog: string;

  @IsOptional()
  @IsString()
  blogComment: string;

  @IsOptional()
  @IsString()
  userName: string;

  @IsOptional()
  @IsNumber()
  rating: number;

  @IsOptional()
  @IsString()
  reply: string;

  @IsOptional()
  @IsString()
  replyDate: string;

  @IsOptional()
  @IsString()
  name: string;
}

export class FilterBlogCommentDto {
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

export class FilterBlogCommentGroupDto {
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
}

export class OptionBlogCommentDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateBlogCommentDto {
  @IsOptional()
  product: any;

  @IsOptional()
  blog: any;

  @IsOptional()
  @IsString()
  userName: string;

  @IsOptional()
  @IsString()
  replyDate: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  blogComment: string;

  @IsOptional()
  @IsNumber()
  rating: number;

  @IsOptional()
  @IsString()
  reply: string;

  @IsOptional()
  status: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  ids: string[];
}

export class LikeDislikeDto {
  @IsOptional()
  @IsBoolean()
  like: boolean;

  @IsOptional()
  @IsBoolean()
  dislike: boolean;

  @IsOptional()
  @IsString()
  blogCommentId: string;
}

export class GetBlogCommentByIdsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  ids: string[];
}

export class FilterAndPaginationBlogCommentDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterBlogCommentDto)
  filter: FilterBlogCommentDto;

  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterBlogCommentGroupDto)
  filterGroup: FilterBlogCommentGroupDto;

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
