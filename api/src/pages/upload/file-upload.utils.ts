import { extname } from 'path';
import * as fs from 'fs';

export const imageFileFilter = (req, file, callback) => {
  if (
    !file.originalname.match(
      /\.(jpg|jpeg|png|gif|webp|svg|PNG|JPG|JPEG|GIF|WEBP|SVG)$/,
    )
  ) {
    return callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};

export const getUploadFilePath = (req: any, file: any, callback: any) => {
  const dir = `./upload/files`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return callback(null, dir);
};

export const allFileFilter = (req: any, file: any, callback: any) => {
  if (!file.originalname.match(/\.(pdf|PDF|DOCX|docx|doc)$/)) {
    return callback(new Error('Only pdf files are allowed!'), false);
  }
  callback(null, true);
};

export const editFileName = (req, file, callback) => {
  const name = transformToSlug(file.originalname.split('.')[0]);
  const fileExtName = extname(file.originalname);
  const randomName = Array(4)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  callback(null, `${name}-${randomName}${fileExtName}`);
};

export const getUploadPath = (req: any, file: any, callback: any) => {
  // Destination Folder Dynamic..
  // const { folderPath } = req.body;
  // const dir = `./upload/images/${folderPath ? folderPath : 'others'}`;
  const dir = `./upload/images`;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return callback(null, dir);
};

// export const getUploadFilePath = (req: any, file: any, callback: any) => {
//   const dir = `./upload/files`;
//
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }
//
//   return callback(null, dir);
// };

const transformToSlug = (value: string): string => {
  return value
    .trim()
    .replace(/[^A-Z0-9]+/gi, '-')
    .toLowerCase();
};
