import { IsNumber, IsOptional } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsNumber()
  pageSize: number;

  @IsOptional()
  @IsNumber()
  currentPage: number;
}
