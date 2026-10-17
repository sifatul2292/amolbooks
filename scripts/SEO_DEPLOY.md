# Deploy the indexing repair

Search Console was inspected on October 17, 2026. The homepage is excluded as
an alternate whose declared canonical is the API homepage. The second volume of
Tinie Amar Rob last crawled August 31 and Google selected a different book as
canonical. A live test now confirms that book is indexable; its indexing request
was accepted. The remaining live audit found homepage/catalogue/offer canonical
errors and two broken sitemap links (literal percent and trailing-slash slugs).
The sitemap contains 103 products and four packages; a lack of books is not the cause.

This release returns the existing Angular shell with a page-specific head and
real initial content inside app-root for visitors and crawlers alike. Angular
bootstraps normally. Homepage/catalogue links expose all published books. SPA
navigation refreshes metadata, and encoded slugs use their database identity.
UI/admin build files are not manually edited.

## On the VPS

```bash
cd /home/amolbooks
AMOL_DEPLOY_BRANCH=codex/rollback-sunday-20260927 bash scripts/vps-safe-pull.sh
cd api
npm run build && pm2 restart amolbooks-api
```

Before changing nginx, confirm the new backend route works:

```bash
curl -f http://127.0.0.1:3000/api/storefront-document/ -o /tmp/amolbooks-seo-home.html
```

Then apply the reviewed nginx locations to the active www HTTPS server:

```bash
cd /home/amolbooks
python3 scripts/install-storefront-seo.py
```

The installer targets `/etc/nginx/sites-enabled/amolbooks.com`, makes a backup
under `/root`, replaces only the matching SEO locations and validates before
reload. SSL, generic fallback, assets, feed and upload configuration are retained.
IPv6 listeners are added to this file so the older uisub host cannot serve a
conflicting canonical storefront over IPv6. The legacy host may still produce
conflicting-name warnings; consolidating that separate host is not required here.
If validation/reload fails, the original configuration is restored. The existing
API upstream must be port 3000, as confirmed in the supplied production config.

Purge Cloudflare cache for robots.txt, sitemap.xml and affected storefront HTML.
Then, with Node 18+, run:

```bash
node scripts/check-live-seo.cjs --all
```

The checks cover crawl directives, valid sitemap encoding, visitor homepage and
catalogue content/canonicals, crawler metadata and every product/package URL.
Open a book in a browser and follow another book link to check the interactive
page and navigation. No install, database migration or upload edits are required.

## Search Console

The domain is already verified. Resubmit the corrected www sitemap. Test the
homepage, product-list and a representative book with URL Inspection, confirm
Google sees their own canonical URL, and request indexing. Inspect Google's
stored report again after recrawling; the report need not change immediately.
Do not validate or remove intentional admin/private exclusions indiscriminately.
The private hosts should return noindex for HTML only, preserving public images.

Google requires accessible pages, HTTP 200 and indexable content; satisfying
these makes a page eligible, but does not guarantee indexing or ranking:
https://developers.google.com/search/docs/essentials/technical

If rollback is needed, restore the installer-reported nginx backup, validate
with `nginx -t`, then reload. Use the safe-pull script for repository updates;
never use destructive Git cleanup on the VPS.
