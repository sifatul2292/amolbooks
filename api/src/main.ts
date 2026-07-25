import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, VersioningType } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import * as express from 'express';
import * as helmet from 'helmet';
import * as compression from 'compression';
import { createHash } from 'crypto';
import { RedirectUrlMiddleware } from './middleware/redirect-url.middleware';
import { STOREFRONT_PRICE_SCRIPT } from './storefront-price-script';
import { STOREFRONT_SPECIAL_PACKAGE_SCRIPT } from './storefront-special-package-script';
import { ADMIN_INCOMPLETE_ORDER_EDITOR_SCRIPT } from './admin-incomplete-order-editor-script';
import { STOREFRONT_ATTRIBUTION_SCRIPT } from './storefront-attribution-script';
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { cors: true });

  // Security headers
  app.use(helmet.default({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));

  // Gzip compression
  app.use(compression());

  // Allow Cors
  app.enableCors({
    // origin: '*',
    origin: [
      'http://localhost:4200',
      'http://localhost:42002',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3007',
      'http://localhost:3005',
      'http://localhost:3004',
      'http://localhost:3003',
      'http://localhost:3006',
      'http://localhost:3008',
      'https://www.alambook.com',
      'https://alambook.com',
      'https://admin.alambook.com',
      'https://adminsub.amolbooks.com',
      'https://uisub.amolbooks.com',
      'https://apisub.amolbooks.com',
      'https://amolbooks.com',
      'https://www.amolbooks.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization,administrator',
    credentials: true,
  });

  // Lazy reference: populated after app.init(). Safe because server only
  // starts listening after init completes, so the ref is always set on first request.
  let redirectMiddlewareRef: RedirectUrlMiddleware | null = null;

  // Register BEFORE init so this slot is early in the Express stack —
  // before ServeStatic (registered during module init) and NestJS Router.
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!redirectMiddlewareRef) return next();
    return redirectMiddlewareRef.use(req, res, next);
  });

  app.use(
    '/upload/static',
    express.static(join(__dirname, '..', 'upload/static')),
  );
  // Serve all upload assets (files/images/invoice) at /upload — front-end and
  // admin reference this prefix without the global 'api' prefix. Registered
  // before init() so it wins over ServeStatic (/api/upload) and the SPA fallback.
  app.use('/upload', express.static(join(__dirname, '..', 'upload')));

  const storefrontIndexPath = join(
    __dirname,
    '..',
    '..',
    'ui',
    'dist',
    'angular-ui',
    'browser',
    'index.html',
  );
  const storefrontPriceScriptFileName = 'storefront-price-english-digits.js';
  const storefrontPriceScriptTag =
    `<script src="/${storefrontPriceScriptFileName}?v=20260714-3" defer></script>`;
  const storefrontSpecialPackageScriptFileName =
    'storefront-special-package.js';
  const storefrontSpecialPackageScriptVersion = createHash('sha256')
    .update(STOREFRONT_SPECIAL_PACKAGE_SCRIPT)
    .digest('hex')
    .slice(0, 12);
  const storefrontSpecialPackageScriptTag =
    `<script src="/${storefrontSpecialPackageScriptFileName}?v=${storefrontSpecialPackageScriptVersion}" defer></script>`;
  const storefrontAttributionScriptFileName = 'storefront-attribution.js';
  const storefrontAttributionScriptVersion = createHash('sha256')
    .update(STOREFRONT_ATTRIBUTION_SCRIPT)
    .digest('hex')
    .slice(0, 12);
  const storefrontAttributionScriptTag =
    `<script src="/${storefrontAttributionScriptFileName}?v=${storefrontAttributionScriptVersion}" defer></script>`;
  const storefrontGtmLoaderUrl =
    'https://server.amolbooks.com/tagioo-loader/gtm.js?id=GTM-NNZV54QJ';
  const storefrontGtmNoscriptUrl =
    'https://server.amolbooks.com/tagioo-loader/ns.html?id=GTM-NNZV54QJ';
  const legacyStapeGtmLoaderUrlPattern =
    /https:\/\/load\.server\.amolbooks\.com\/2kpblypwe\.js\?8=[^'"\s<]+/g;
  const legacyStapeGtmNoscriptUrlPattern =
    /https:\/\/load\.server\.amolbooks\.com\/ns\.html\?id=GTM-NNZV54QJ/g;
  const adminIncompleteOrderEditorScriptFileName =
    'incomplete-order-editor.js';
  const legacyStorefrontPriceScriptTagPattern =
    /\s*<script src="\/storefront-price-english-digits\.js(?:\?v=[^"]*)?" defer><\/script>/g;
  const legacyStorefrontSpecialPackageScriptTagPattern =
    /\s*<script src="\/storefront-special-package\.js(?:\?v=[^"]*)?" defer><\/script>/g;
  const legacyStorefrontAttributionScriptTagPattern =
    /\s*<script src="\/storefront-attribution\.js(?:\?v=[^"]*)?" defer><\/script>/g;
  const staticAssetPattern =
    /\.(js|css|map|json|xml|txt|ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot)$/i;

  function replaceStorefrontTrackingLoader(indexHtml: string) {
    return indexHtml
      .replace(legacyStapeGtmLoaderUrlPattern, storefrontGtmLoaderUrl)
      .replace(legacyStapeGtmNoscriptUrlPattern, storefrontGtmNoscriptUrl)
      .replace(
        '<!-- GTM/Stape loads after first paint. -->',
        '<!-- GTM/Tagioo loads after first paint. -->',
      );
  }

  function installStaticStorefrontPatch() {
    try {
      const storefrontScriptPath = join(
        __dirname,
        '..',
        '..',
        'ui',
        'dist',
        'angular-ui',
        'browser',
        storefrontPriceScriptFileName,
      );
      writeFileSync(storefrontScriptPath, STOREFRONT_PRICE_SCRIPT, 'utf8');
      const storefrontSpecialPackageScriptPath = join(
        __dirname,
        '..',
        '..',
        'ui',
        'dist',
        'angular-ui',
        'browser',
        storefrontSpecialPackageScriptFileName,
      );
      writeFileSync(
        storefrontSpecialPackageScriptPath,
        STOREFRONT_SPECIAL_PACKAGE_SCRIPT,
        'utf8',
      );
      const storefrontAttributionScriptPath = join(
        __dirname,
        '..',
        '..',
        'ui',
        'dist',
        'angular-ui',
        'browser',
        storefrontAttributionScriptFileName,
      );
      writeFileSync(
        storefrontAttributionScriptPath,
        STOREFRONT_ATTRIBUTION_SCRIPT,
        'utf8',
      );

      const indexHtml = readFileSync(storefrontIndexPath, 'utf8');
      const cleanedHtml = replaceStorefrontTrackingLoader(indexHtml)
        .replace(legacyStorefrontPriceScriptTagPattern, '')
        .replace(legacyStorefrontSpecialPackageScriptTagPattern, '')
        .replace(legacyStorefrontAttributionScriptTagPattern, '');
      const storefrontPatchScriptTags =
        storefrontAttributionScriptTag + storefrontPriceScriptTag + storefrontSpecialPackageScriptTag;
      const patchedHtml = cleanedHtml.includes('</body>')
        ? cleanedHtml.replace('</body>', `${storefrontPatchScriptTags}</body>`)
        : `${cleanedHtml}${storefrontPatchScriptTags}`;

      if (patchedHtml !== indexHtml) {
        writeFileSync(storefrontIndexPath, patchedHtml, 'utf8');
      }
      logger.log('Static storefront patch installed');
    } catch (error) {
      logger.warn(`Static storefront patch skipped: ${error.message}`);
    }
  }

  function sendStorefrontIndex(res: express.Response) {
    try {
      const indexHtml = readFileSync(storefrontIndexPath, 'utf8');
      const cleanedHtml = replaceStorefrontTrackingLoader(indexHtml)
        .replace(legacyStorefrontPriceScriptTagPattern, '')
        .replace(legacyStorefrontSpecialPackageScriptTagPattern, '')
        .replace(legacyStorefrontAttributionScriptTagPattern, '');
      const storefrontPatchScriptTags =
        storefrontAttributionScriptTag + storefrontPriceScriptTag + storefrontSpecialPackageScriptTag;
      const html = cleanedHtml.includes('</body>')
        ? cleanedHtml.replace('</body>', `${storefrontPatchScriptTags}</body>`)
        : `${cleanedHtml}${storefrontPatchScriptTags}`;
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.type('html').send(html);
    } catch (error) {
      res.sendFile(storefrontIndexPath);
    }
  }

  installStaticStorefrontPatch();

  const httpAdapter = app.getHttpAdapter().getInstance() as express.Express;
  httpAdapter.get(
    `/${storefrontAttributionScriptFileName}`,
    (_req: express.Request, res: express.Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.type('application/javascript').send(STOREFRONT_ATTRIBUTION_SCRIPT);
    },
  );
  httpAdapter.get(
    `/${storefrontPriceScriptFileName}`,
    (_req: express.Request, res: express.Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.type('application/javascript').send(STOREFRONT_PRICE_SCRIPT);
    },
  );
  httpAdapter.get(
    `/${storefrontSpecialPackageScriptFileName}`,
    (_req: express.Request, res: express.Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res
        .type('application/javascript')
        .send(STOREFRONT_SPECIAL_PACKAGE_SCRIPT);
    },
  );
  httpAdapter.get(
    `/${adminIncompleteOrderEditorScriptFileName}`,
    (_req: express.Request, res: express.Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res
        .type('application/javascript')
        .send(ADMIN_INCOMPLETE_ORDER_EDITOR_SCRIPT);
    },
  );

  // Serve injected storefront HTML before ServeStaticModule can serve the SPA.
  // This keeps ui/dist untouched while making the local storefront change apply.
  httpAdapter.use(
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const accept = String(req.headers.accept || '');
      const path = req.path || '';
      if (
        req.method !== 'GET' ||
        !accept.includes('text/html') ||
        path.startsWith('/api') ||
        path.startsWith('/upload') ||
        path.startsWith('/invoice') ||
        path === '/storefront-price-english-digits.js' ||
        path === '/storefront-special-package.js' ||
        path === '/storefront-attribution.js' ||
        path === '/incomplete-order-editor.js' ||
        staticAssetPattern.test(path)
      ) {
        return next();
      }
      return sendStorefrontIndex(res);
    },
  );
  // app.enableCors();
  // Version Control
  app.enableVersioning({
    type: VersioningType.URI,
  });
  // Global Prefix
  // Limit payload size
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3000;

  // init() initializes all modules (ServeStatic registers here, NestJS Router built here)
  await app.init();

  // Wire up the lazy reference now that DI is ready
  redirectMiddlewareRef = app.get(RedirectUrlMiddleware);

  // SPA fallback: serves index.html for any unhandled route
  httpAdapter.use((_req: express.Request, res: express.Response) => {
    if (!res.headersSent) {
      sendStorefrontIndex(res);
    }
  });

  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}

bootstrap();
