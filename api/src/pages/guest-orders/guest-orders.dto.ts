import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
export class GuestOrderPhoneDto {
  @IsString() @Length(11, 32) phoneNo: string;
}
export class GuestOrderVerifyDto extends GuestOrderPhoneDto {
  @IsString() @Matches(/^\d{6}$/) code: string;
}
export class GuestOrderCancelDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}
