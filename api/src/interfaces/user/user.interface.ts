export interface User {
  _id?: string;
  name?: string;
  username?: string;
  phone?: string;
  email?: string;
  image?: string;
  password?: string;
  gender?: string;
  profileImg?: string;
  date?: Date;
  occupation?: string;
  hasAccess?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  success: boolean;
}

export interface UserAuthResponse {
  success: boolean;
  token?: string;
  tokenExpiredIn?: number;
  data?: any;
  message?: string;
}

export interface UserJwtPayload {
  _id?: string;
  username: string;
}
