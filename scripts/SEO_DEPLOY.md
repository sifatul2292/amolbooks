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

The installer targets the existing `amolbooks.com`, `apisub.amolbooks.com`
and `adminsub.amolbooks.com` files under `/etc/nginx/sites-enabled`. It backs
up all three under `/root`, prepares all changes before writing, validates
nginx and reloads; any failure restores the originals. Private-host HTML
receives `X-Robots-Tag: noindex`, including index.html locations with their own
headers, while images receive no exclusion header. Existing security-header
inheritance is preserved. Their robots.txt allows recrawling to read noindex
and removes the old API sitemap advertisement. SSL, generic fallback, assets, feed and upload configuration are retained.
IPv6 listeners are added to this file so the older uisub host cannot serve a
conflicting canonical storefront over IPv6. The legacy host may still produce
conflicting-name warnings; consolidating that separate host is not required here.
If validation/reload fails, the original configuration is restored. The existing
API upstream must be port 3000, as confirmed in the supplied production config.

Purge Cloudflare cache for robots.txt, sitemap.xml and affected storefront HTML.
Then, with Node 18+, run:

```bash
node scripts/check-live-seo.cjs --all --private
```

The checks cover crawl directives, valid sitemap encoding, visitor homepage and
catalogue content/canonicals, crawler metadata, every product/package URL,
private-host exclusion and a representative public book cover.
Open a book in a browser and follow another book link to check the interactive
page and navigation. No install, database migration or upload edits are required.

## Search Console

The domain is already verified. Resubmit the corrected www sitemap. Test the
homepage, product-list and a representative book with URL Inspection, confirm
Google sees their own canonical URL, and request indexing. Inspect Google's
stored report again after recrawling; the report need not change immediately.
Do not validate or remove intentional admin/private exclusions indiscriminately.
Private hosts return noindex for HTML only. In Search Console, use URL
Inspection to confirm this after deployment; keep intentional private-page
exclusions. A temporary removal request for an exact private URL or its private
host prefix can hide existing results while Google reprocesses the noindex.
Never submit the public www host for removal.

Google requires accessible pages, HTTP 200 and indexable content; satisfying
these makes a page eligible, but does not guarantee indexing or ranking:
https://developers.google.com/search/docs/essentials/technical

If rollback is needed, restore the installer-reported nginx backup, validate
with `nginx -t`, then reload. Use the safe-pull script for repository updates;
never use destructive Git cleanup on the VPS.
