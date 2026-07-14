# CURRENT_WORK

Living status doc. Update after meaningful progress.

_Last updated: 2026-07-14. Branch: `main`. Working tree: modified with local storefront price digit/font injection._

## Recently completed (git log, newest first)

- `0b3e31b5` Checkout gift widget: margin tweaks + copy updates
- `b8796620` Checkout gift row: revert to display-only, fix alignment
- `7cb58b6d` Checkout gift widget: real cart-add with zero reload, fix comma-price bug
- `a8888799` Fix checkout gift widget math/image, add real free-gift cart line
- `3df026ff` Add checkout item-list free-notebook offer widgets

Recent work centered on the **checkout gift widget** (`gtm-snippets/lever5-checkout-gift.html`)
— free-notebook offer on the checkout item list. Iterated on: real cart-add with no page
reload, comma-in-price parse bug, math/image fixes, alignment, then reverted the row to
display-only, then margin/copy polish.

## In progress

Nothing active.

## Completed this session

- Salesman custom-order access tightening:
  - `api/upload/static/custom-orders.html` detects `role: salesman` from the stored admin JWT, hides Import WooCommerce, Profit Dashboard, Back to Admin, the analytics snapshot, and money summary cards.
  - Profit/ad-spend dashboard APIs require Super Admin/Admin role guards so hidden analytics are not exposed by direct API calls.
- Product price readability tweak:
  - Added API-served `/storefront-price-english-digits.js` injection in `api/src/main.ts`, leaving compiled `ui/dist` untouched.
  - Added `api/src/storefront-price-script.ts` to convert Bangla numerals inside product price blocks to English numerals and apply a clearer numeric font.

## Files most recently touched (why)

- `api/src/main.ts` — injects the local storefront price script into served SPA HTML.
- `api/src/storefront-price-script.ts` — storefront price digit/font override script.
- `api/upload/static/custom-orders.html` — salesman-only custom order UI restrictions and hidden amount cards.
- `api/src/pages/dashboard/dashboard.controller.ts` — protect profit/manual-sales dashboard endpoints from salesman access.
- `api/src/pages/meta-ads/meta-ads.controller.ts` — protect Meta Ads spend/config/expense endpoints from salesman access.
- `gtm-snippets/lever5-checkout-gift.html` — checkout free-gift widget iterations (above).
- Backend free-gift/recent-buyers endpoints (`api/src/pages/order`, `OrderOffer` schema) —
  supporting the GTM levers.

## Known bugs / incomplete / TODOs

- No committed test coverage; `npm test` is scaffolding only.
- Deploy script TODO (per ops notes): finalize `/home/amolbooks/deploy.sh` wrapper on VPS
  with `.env` safety net.
- Meta Ads env vars may not be set in production.
- Secrets hardcoded in `api/src/config/configuration.ts` — should move to env.

## Next recommended tasks for Codex

1. Verify GTM snippet `API_BASE` values match the current `ui/dist` host before any snippet edit.
2. Move hardcoded secrets in `api/src/config/configuration.ts` into `.env` (SSL payment,
   Google OAuth, SMS token, Atlas fallback) — low-risk, high-value, source-side only.
3. Add a minimal smoke test / health endpoint check for the free-gift + recent-buyers flows.

## Commands already run this session

- `git status` → clean before edits.
- Read `PROJECT_CONTEXT.md` and `CURRENT_WORK.md`.
- Inspected custom-orders static page and relevant admin/order/dashboard/meta controllers.
- `cd api && npm run lint` → failed before linting because ESLint reports the configured glob is fully ignored.
- `cd api && npm run build` → passed.
- `git diff --check` → passed.
- Added local product-price injection; API build is required for deployment.
- `node` syntax check for `api/src/storefront-price-script.ts` script body → passed.
- `cd api && npm run build` after local injection → passed.

## Do NOT touch / be careful

- `ui/dist`, `admin/dist` — compiled artifacts, no source. Don't hand-edit.
- `api/upload/*`, `api/backup/db/*` — runtime data, gitignored. Never track or wipe.
- `api/node_modules/` — never re-track (Linux/Mac native-binary crash history).
- On VPS: never `git clean` / `reset --hard` / `stash -u`; use `scripts/vps-safe-pull.sh`.
- Every `npm install` needs `--legacy-peer-deps`.
