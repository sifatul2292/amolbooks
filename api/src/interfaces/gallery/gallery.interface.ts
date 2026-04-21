import { FileTypes } from '../../enum/file-types.enum';

export interface Gallery {
  _id?: string;
  name?: string;
  url?: string;
  folder?: string;
  size?: number;
  type?: FileTypes;
}
