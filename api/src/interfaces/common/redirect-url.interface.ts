export interface RedirectUrl {
  _id?: string;
  name?: string;
  slug?: string;
  priority?: number;
  images?: string;
  mobileImage?: string;
  bannerType?: string;
  url?: string;
  fromUrl?: string;
  toUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
