# SEO repair — Sunday rollback

Worktree: `/Users/sifatulalamshohan/.codex/worktrees/rollback-sunday/Amolbooks-local`
Branch: `codex/rollback-sunday-20260927`

The routing fix lives in `api/src/middleware/storefront-seo-routing.ts` and is wired before the storefront HTML fallback in `main.ts`. The metadata repair is adapted to the existing `product-seo.utils.ts`; the current document renderer and title/performance behavior remain in place. Do not deploy the older prod-release checkout.

Checks: API build; `node scripts/check-seo-routing.cjs`; `node scripts/check-product-seo-metadata.cjs`; `node scripts/check-storefront-seo.cjs`; `node scripts/check-storefront-seo-http.cjs`. Lint is blocked by the existing ignored-files configuration.

Production remains unchanged because SSH authentication failed. Before deployment, inspect/snapshot active nginx configuration and source, apply the policy to the actual frontend fallback/API-host locations, and diagnose shared renderer 429s without weakening authentication/write limits. Use `scripts/vps-safe-pull.sh` for the focused Sunday release, rebuild API, restart the correct process, validate nginx before reload, then verify canonical redirects, unknown/product 404s, product schemas, private noindex responses, robots, sitemap, images, admin and checkout. Keep `server.amolbooks.com` unchanged.

Only start Search Console validation/indexing requests after the matching live corrections are verified. Historical exclusion counts are not all errors: canonical alternates, redirects and intentional noindex pages should remain excluded. The copied full catalogue summary needs factual review separately from the corrected structured SEO description.

## Matching nginx repair (October 26)

The supplied active www configuration serves unhandled routes through static `/index.html`, bypassing the backend policy. The updated nginx installer replaces only that fallback with `try_files $uri @amol_storefront`, proxies the named fallback to Nest with the original Host and URI, adds explicit `/home`, `/home/` and `/index.html` redirects with query preservation, and removes `error_page 404 /index.html`. Existing product/package rendering, SSL, static assets/cache, gzip, catalogue and feed locations remain intact. Missing static assets keep their real 404s. The existing installer snapshots each affected config and validates nginx before reload, restoring originals if validation/reload fails.

After safe pull: build the API, run `python3 scripts/install-storefront-seo.py` from the repository root, then restart `amolbooks-api`. Installing nginx before restarting the API keeps the old private-route robots blocks active until the matching backend policy is running. Review any installer failure before restarting; live checkout/admin/image and SEO response checks are still required. No changes to server.amolbooks.com are included.
