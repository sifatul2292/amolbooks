export interface Blog {
  _id?: string;
  name?: string;
  slug?: string;
  image?: string;
  mobileImage?: string;
  authorName?: string;
  description?: string;
  shortDesc?:string;
  priority?:number;
  createdAt?: Date;
  updatedAt?: Date;
}
