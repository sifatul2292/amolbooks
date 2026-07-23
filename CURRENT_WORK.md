# CURRENT_WORK

Living status doc. Update after meaningful progress.

_Last updated: 2026-07-24. Branch: `main`. Special-package storefront redesign completed locally._

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

- Special-package detail redesign implementation:
  - Added an API-served storefront enhancement for `/special-package-details/:id`, leaving compiled Angular artifacts untouched.
  - Reframed the oversized offer banner as a responsive Split Studio layout with package title, description, book count, and package price alongside contained artwork.
  - Added sanitized short descriptions to every included book and replaced misleading list-price-only labels with calculated selling prices and savings (for example, ৳550 − ৳240 = ৳310 and ৳900 − ৳194 = ৳706).
  - Restyled the included-book rows, metadata, price summary, and mobile purchase actions using the existing Amol green/cream visual language.
  - Removed translator and category fields from package book rows, and simplified the package totals to book count plus the actual discounted package price only.
  - Package pricing is now dynamic: sum each included product's discounted unit price multiplied by its package quantity, then apply the backend package-level cash or percentage discount once.

- Profit-dashboard Dhaka date fix:
  - Profit analytics, product drill-down, and top-product queries now convert selected calendar dates to full `Asia/Dhaka` day boundaries before querying MongoDB.
  - This includes orders created from 12:00 AM through 5:59 AM Dhaka time that were previously omitted from a single-day selection because `YYYY-MM-DD` was parsed as UTC.
  - Dashboard-generated "today" date strings now explicitly use `Asia/Dhaka`, independent of the browser/device timezone.

- Urgent-restock prioritization:
  - Added authenticated `GET /api/product/stock-urgent?days=14`, which evaluates every tracked product against the existing weighted demand forecast rather than the current inventory page or manual low-stock threshold.
  - Urgent results include out-of-stock products plus products projected to run out within 14 days, sorted by out-of-stock, shortest coverage, and highest forecast demand; untracked/zero-demand products are excluded unless already out of stock.
  - Added a sticky, independently scrolling Urgent Restock rail beside the desktop stock grid, with compact stock/forecast/coverage cues and suggested 30-day reorder quantities.
  - At 1320px and below the rail moves above the inventory grid as a horizontally scrollable strip; verified no page overflow through 320px.
  - Rail Restock actions reuse the existing purchase modal and prefill the suggested quantity; successful purchases and manual stock edits refresh the rail immediately.
- Stock-management page modernization:
  - Replaced the wide product table in `api/upload/static/custom-orders.html` with a responsive three-column product card grid (two columns at tablet width, one on phones).
  - Each card now surfaces product image/name/SKU/price, live stock status, quantity stepper, low-stock threshold, restock/history actions, and inline save feedback.
  - Stock and threshold edits autosave after a short debounce; rapid edits are versioned so an older response cannot overwrite newer UI state.
  - Stock results are globally ranked by the existing `totalSold` counter before pagination, with sold quantities shown on cards; filters and search keep the same best-selling-first order.
  - Product cards show units sold today, units sold in the rolling last 30 days, and a next-30-day demand forecast. Forecasts weight the latest 30 days at 70% and the preceding 30 days at 30%, falling back to the latest period when no older sales exist; cancelled/refunded/returned orders are excluded.
  - Simplified the stock-mode top bar and responsive summary cards so the page has no horizontal overflow down to 320px.
  - Preserved the existing stock APIs, order deduction, cancel/return restocking, purchase logging, and movement history behavior.
- Salesman custom-order access tightening:
  - `api/upload/static/custom-orders.html` detects `role: salesman` from the stored admin JWT, hides Import WooCommerce, Profit Dashboard, Back to Admin, the analytics snapshot, and money summary cards.
  - Profit/ad-spend dashboard APIs require Super Admin/Admin role guards so hidden analytics are not exposed by direct API calls.
- Product price readability tweak:
  - Added API-served `/storefront-price-english-digits.js` injection in `api/src/main.ts`, leaving compiled `ui/dist` untouched.
  - Moved the storefront HTML injection middleware before `ServeStaticModule` registration so static storefront routes receive the script instead of bypassing the fallback.
  - Added `api/src/storefront-price-script.ts` to convert Bangla numerals inside product, cart sidebar, and checkout summary price blocks to English numerals and apply a clearer numeric font.
  - Hid the checkout `.condition-area` terms/instructions block and auto-check the hidden terms field defensively.
  - Added an API startup installer that writes the same script/tag into `ui/dist/angular-ui/browser` at runtime, so nginx-served `amolbooks.com` storefront pages receive the local patch without GTM.

## Files most recently touched (why)

- `api/src/main.ts` — injects the local storefront price script into served SPA HTML.
- `api/src/storefront-price-script.ts` — storefront price digit/font override script.
- `api/src/storefront-special-package-script.ts` — special-package page redesign and dynamic package-price display.
- `api/src/shared/utils/special-package-price.util.ts` — shared product-subtotal calculation for special packages.
- Special-package, cart, and order services — populate package products and use their discounted subtotal before applying the backend package discount.
- `api/upload/static/custom-orders.html` — salesman restrictions plus responsive stock cards and autosaving quantity controls.
- `api/src/pages/product/product.controller.ts` / `product.service.ts` — authenticated global urgent-stock feed and forecast-based urgency ranking.
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

- Dynamic special-package cash-discount check: ৳310 + ৳706 + ৳212 = ৳1,228 product subtotal; backend cash discount ৳20 produces ৳1,208 → passed.
- Dynamic special-package percentage/quantity check: discounted product subtotal ৳230; backend 10% package discount produces ৳207 → passed.
- Special-package injected script syntax check after dynamic pricing → passed.
- `cd api && npm run build` after dynamic special-package pricing → passed (TypeScript deprecation warnings only).
- `cd api && npm run lint` after dynamic special-package pricing → still fails before linting because ESLint reports the configured glob is fully ignored.
- Special-package production data check: confirmed ৳550 − ৳240 = ৳310, ৳900 − ৳194 = ৳706, and ৳275 − ৳63 = ৳212; confirmed package and product descriptions are populated.
- Special-package injected DOM test: all three corrected prices, three descriptions, and package summary rendered from mocked API data.
- Special-package live-page browser verification at 320/375/414/768/1440px: no horizontal overflow; corrected prices and all descriptions rendered at every width.
- Special-package desktop and 375px mobile visual QA: constrained artwork, responsive Split Studio hero, compact book rows, and inline purchase panel verified.
- Special-package palette contrast check: body, muted, accent, and focus colors meet their applicable WCAG contrast thresholds on both offer surfaces.
- Special-package metadata/total refinement verified at 375px and 1440px: only author metadata remains; totals show book count and one final discounted package price, with no overflow.
- Special-package injected script syntax check → passed.
- `cd api && npm run build` after special-package redesign → passed (TypeScript deprecation warnings only).
- `cd api && npm run lint` after special-package redesign → still fails before linting because ESLint reports the configured glob is fully ignored.
- `git diff --check` after special-package redesign → passed.

- Profit-dashboard date diagnosis: confirmed single-day queries began at `00:00 UTC` (`06:00 Asia/Dhaka`) while calendar grouping already used `+06:00`.
- Profit-dashboard Dhaka range check: confirmed `2026-07-23` maps to `2026-07-22T18:00:00.000Z` through `2026-07-23T17:59:59.999Z`.
- Profit-dashboard inline script syntax check → passed.
- `cd api && npm run build` after profit-dashboard fix → passed (TypeScript deprecation warnings only).
- `cd api && npm run lint` after profit-dashboard fix → still fails before linting because ESLint reports the configured glob is fully ignored.
- `git diff --check` after profit-dashboard fix → passed.

- Urgent-restock rail: verified 0/1/7/14-day products are included, 15-day products are excluded, and untracked/zero-demand products are excluded unless out of stock.
- Urgent-restock browser preview: verified right rail at 1440px and horizontal above-grid rail at 1280/768/375/320px with no page overflow; suggested quantity prefill passed.
- Stock page inline scripts after urgent-restock changes → all 3 passed Node syntax checks.
- `cd api && npm run build` after urgent-restock endpoint → passed (TypeScript deprecation warnings only).
- Stock demand metrics browser preview: verified real card markup with four-digit forecasts at 1440/768/414/375/320px, no page or metric overflow, and no browser console errors.
- Stock page inline scripts after demand strip → all 3 passed Node syntax checks.
- `cd api && npm run lint` after demand metrics → still fails before linting because ESLint reports the configured glob is fully ignored.
- `cd api && npm run build` after demand metrics → passed (TypeScript deprecation warnings only).
- Best-selling stock sort: confirmed `totalSold` is the existing order-created sales counter and the stock query sorts by it before pagination.
- Stock card inline scripts after sold-count cue → all 3 passed Node syntax checks.
- `cd api && npm run lint` after best-selling sort → still fails before linting because ESLint reports the configured glob is fully ignored.
- `cd api && npm run build` after best-selling sort → passed (TypeScript deprecation warnings only).
- Stock redesign browser preview with mock inventory: verified 3 columns at 1440px, 2 at 768px, and 1 at 414/375/320px with no horizontal overflow; quick quantity autosave passed and browser console had no errors.
- Stock page inline scripts parsed with Node `new Function` syntax checks → all 3 passed.
- `git diff --check` after stock redesign → passed.
- `cd api && npm run lint` after stock redesign → still fails before linting because ESLint reports the configured glob is fully ignored.
- `cd api && npm run build` after stock redesign → passed (TypeScript deprecation warnings only).
- `git status` → clean before edits.
- Read `PROJECT_CONTEXT.md` and `CURRENT_WORK.md`.
- Inspected custom-orders static page and relevant admin/order/dashboard/meta controllers.
- `cd api && npm run lint` → failed before linting because ESLint reports the configured glob is fully ignored.
- `cd api && npm run build` → passed.
- `git diff --check` → passed.
- Added local product-price injection; API build is required for deployment.
- `node` syntax check for `api/src/storefront-price-script.ts` script body → passed.
- `cd api && npm run build` after local injection → passed.
- Moved storefront price injection earlier in `api/src/main.ts`; `cd api && npm run build` → passed.
- Extended local price font/digit script to cart sidebar and checkout selectors; Nest watch compile → passed with 0 errors.
- Hid checkout condition/terms block in the local injected script; Nest watch compile → passed with 0 errors.
- Added API startup static storefront patch installer; `cd api && npm run build` → passed.

## Do NOT touch / be careful

- `ui/dist`, `admin/dist` — compiled artifacts, no source. Don't hand-edit.
- `api/upload/*`, `api/backup/db/*` — runtime data, gitignored. Never track or wipe.
- `api/node_modules/` — never re-track (Linux/Mac native-binary crash history).
- On VPS: never `git clean` / `reset --hard` / `stash -u`; use `scripts/vps-safe-pull.sh`.
- Every `npm install` needs `--legacy-peer-deps`.
