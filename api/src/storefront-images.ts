import { Router } from 'express';
import { stat } from 'fs/promises';
import { join } from 'path';
import * as sharp from 'sharp';

// Only local catalogue files and fixed sizes: no remote fetches or arbitrary transforms.
export function storefrontImages(directory: string) {
  const router = Router();
  const cache = new Map<string, Buffer>();
  const pending = new Map<string, Promise<Buffer>>();
  let bytes = 0;
  let active = 0;
  const waiting: Array<() => void> = [];
  router.get('/:width/:file', async (req, res) => {
    const width = Number(req.params.width);
    const file = req.params.file;
    if (![160, 320, 640].includes(width) ||
        !/^[\w-][\w .()-]*\.(?:jpe?g|png|webp)$/i.test(file)) {
      return res.sendStatus(400);
    }
    try {
      const source = join(directory, file);
      const info = await stat(source);
      const key = `${file}:${width}:${info.mtimeMs}:${info.size}`;
      let image = cache.get(key);
      if (!image) {
        let job = pending.get(key);
        if (!job) {
          if (pending.size >= 32) return res.status(503).set('Retry-After', '1').end();
          job = (async () => {
            if (active >= 4) await new Promise<void>(resolve => waiting.push(resolve));
            else active += 1;
            try {
              return await sharp(source, { limitInputPixels: 40000000 })
                .rotate().resize({ width, withoutEnlargement: true })
                .webp({ quality: 78, effort: 4 }).toBuffer();
            } finally {
              const next = waiting.shift();
              if (next) next();
              else active -= 1;
            }
          })();
          pending.set(key, job);
        }
        try {
          image = await job;
          if (!cache.has(key) && image.length <= 32 * 1024 * 1024) {
            while (cache.size >= 128 || bytes + image.length > 32 * 1024 * 1024) {
              const oldest = cache.keys().next().value;
              bytes -= cache.get(oldest).length;
              cache.delete(oldest);
            }
            cache.set(key, image);
            bytes += image.length;
          }
        } finally {
          pending.delete(key);
        }
      }
      res.set('Cache-Control', 'public, max-age=86400').type('webp').send(image);
    } catch (error) {
      res.sendStatus(error.code === 'ENOENT' ? 404 : 422);
    }
  });
  return router;
}
