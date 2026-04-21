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

export class AddActivitiesCommentDto {
  @IsOptional()
  @IsString()
  user: string;

  @IsOptional()
  @IsString()
  product: string;

  @IsOptional()
  @IsString()
  activities: string;

  @IsOptional()
  @IsString()
  activitiesComment: string;

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

export class FilterActivitiesCommentDto {
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

export class FilterActivitiesCommentGroupDto {
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

export class OptionActivitiesCommentDto {
  @IsOptional()
  @IsBoolean()
  deleteMany: boolean;
}

export class UpdateActivitiesCommentDto {
  @IsOptional()
  product: any;

  @IsOptional()
  activities: any;

  @IsOptional()
  @IsString()
  userName: string;

  @IsOptional()
  @IsString()
  replyDate: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  activitiesComment: string;

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
  activitiesCommentId: string;
}

export class GetActivitiesCommentByIdsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  ids: string[];
}

export class FilterAndPaginationActivitiesCommentDto {
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterActivitiesCommentDto)
  filter: FilterActivitiesCommentDto;

  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => FilterActivitiesCommentGroupDto)
  filterGroup: FilterActivitiesCommentGroupDto;

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
