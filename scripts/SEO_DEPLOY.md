# Restore public SEO routing

The live API already returns the correct sitemap, robots directives and book HTML.
On 2026-10-17, the public storefront still returned the old static sitemap and
homepage metadata/canonical for Googlebot product requests. Fix nginx routing;
an API rebuild alone will not fix this incident.

1. On the VPS, inspect `sudo nginx -T` to locate the active
   `www.amolbooks.com` server block and confirm the Nest upstream port.
2. Back up the active nginx configuration outside included nginx directories.
3. Apply `nginx-product-social-seo.conf.example`: its map belongs in `http`,
   its locations in the active storefront server. Merge existing locations;
   do not add duplicate locations or replace the entire virtual host. Preserve
   TLS, redirects, uploads and the existing interactive storefront fallback.
   Adjust the example's port 3000 only if the active Nest upstream differs.
4. Run `sudo nginx -t`; reload only after it passes (`sudo systemctl reload nginx`).
5. From the local repository run `node scripts/check-live-seo.cjs`.
   All three checks must pass. Also open the book normally and confirm the
   interactive product/cart flow still works. Purge any configured CDN cache
   for these URLs if it continues serving the previous responses.
6. Google Search Console already has `https://www.amolbooks.com/sitemap.xml`
   submitted (43 discovered pages in the October 17 screenshot). After fixing
   routing, resubmit it and verify the updated product URLs are discovered.
   Inspect `/product-details/tinii-amar-rob-2-98`, test the live URL, verify
   the rendered book title and selected canonical, then request indexing.

If nginx needs to be rolled back, restore the configuration backup, validate
with `nginx -t`, and reload. No database or upload changes are required.
For repository updates on the VPS use `scripts/vps-safe-pull.sh`; never use
destructive Git cleanup commands.
