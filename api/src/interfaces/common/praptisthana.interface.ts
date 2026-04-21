import { Area } from "./area.interface";
import { Division } from "./division.interface";
import { Zone } from "./zone.interface";

export interface Praptisthana {
  _id?: string;
  name?: string;
  image?: string;
  mobileImage?: string;
  amount?: string;
  url?: string;
  area?: Area;
  division?: Division;
  zone?: Zone;
  title?: string;
  priority?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
