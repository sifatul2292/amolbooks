export interface Otp {
  _id?: string;
  phoneNo?: string;
  code?: string;
  attempts?: number;
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
  expireTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
