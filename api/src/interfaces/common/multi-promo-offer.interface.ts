export interface MultiPromoOffer {
  _id?: string;
  title?: string;
  slug?: string;
  description?: string;
  bannerImage?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  products?: string[] | any[];
  createdAt?: Date;
  updatedAt?: Date;
}
