## Promo/voucher entry hidden (2026-10-30)

- Owner asked to hide the promo option for now. `gtm-snippets/cart-page-navigation.html` (all pages, head CSS, so no flash) hides both checkout promo boxes (`.summery-mbl` phone and `.summery-pc` desktop `.promo-code-area`) and the cart page's "প্রোমো কোড বা ভাউচার কোড পরের পেজে প্রয়োগ করুন।" line (`.cart-area-bottom > p`), which would otherwise point to a box that is gone. CSS only: the elements stay in the DOM, so the checkout gift placement that looks for the promo block still works; coupon handling on the server is unchanged. Selector specificity beats `body.ab-checkout-enhanced app-checkout .promo-code-area { display: grid !important }`. To show it again, delete that one rule and restart the API.
- Verified on localhost:3001 after restart: phone checkout summary ends at Total, then payment method; desktop both boxes `display: none`; cart shows total, "আরও কিনুন" and the checkout button with no hint. Checkout-delivery, commerce-events, mobile-browsing, product-cart, cart-package-rows and Meta match-data checks pass. Not deployed.

## Special package missing from the cart page (2026-10-29)

- Reproduced on localhost:3001: cart held 2 books + package `6abe2123b1f44997b7ca5950`, but `/cart` listed only the books (total ৳900, count 3). The package details request (`/api/special-package/<id>`, proxied to apisub) got the live **nginx 404 page** (burst limit) on some of its parallel calls during the cart page load. `fetchJson` turns that into `null`, `fetchCartProducts` dropped the package, and the cart refresh then cached that incomplete list for the same cart signature, so it never came back. Checkout and the gift total used the same lookup.
- Fix (`storefront-product-sections-script.ts`, `fetchCartPackage`, local and live): one shared request per package; retried (0.7/2/5s, existing `fetchJsonWithRetry`) when no copy is saved; on failure the saved copy in `ab-cart-product-cache-v1` is used (books already fall back this way); successful loads are saved there.
- Verified: new `scripts/check-cart-package-rows.cjs` (Playwright, package API forced to 404): cart and checkout show the package from the saved copy (always 404) and after a retry (404 once, no saved copy); normal load unchanged; book-only cart unchanged (no package requests, ৳900). Real click flow for 2 packages (book Add to Cart → package page Add to Cart → `/cart`) lists book + package with correct totals (৳1,011, ৳1,523). The user's cart now shows all 3 items, ৳1,829. Product-cart, commerce-events, checkout-delivery, package-shelves, Meta match-data and pagespeed-runtime checks pass. `check-special-package-redesign.cjs` assertion updated for the moved fetch (plus retry/fallback); it still fails later on its older `#ab-added-cart-modal` assertion (recorded before). Not deployed; the served script updates on API restart.

## Product page shows no book ("Tk 0", placeholder image) after a few reloads (2026-10-28)

- Reproduced on localhost:3001: 1 in 10 quick reloads rendered the empty template (no title, placeholder cover, "Tk 0", Out of Stock). In the failing loads the app's `GET https://apisub.amolbooks.com/api/product/get-by-slug/<slug>` (both of its calls) returned **429 Too Many Requests** from the API's throttler (`x-ratelimit-remaining` had fallen to 2). Angular has no retry, so it renders an empty product.
- Cause: the API throttles 120 requests/min per route per tracker, and one product view reads its book ~5 times (the app twice, page sections, the gift notebook). On live the tracker is the proxy address, so **all visitors share that allowance** (samples showed ~30 other reads/min). About 24 product views a minute site-wide, then empty pages for everyone. My heavy test traffic on 2026-10-28 also used it up (same IP as the user's browser).
- Fix (server, `api/src/pages/product/product.controller.ts`, CRLF kept): `@Throttle(300, 60)` on `get-by-slug`, the same headroom as `POST /product/get-all`. Together with the per-visitor `ClientIpThrottlerGuard` already in this branch (`cf-connecting-ip`), each visitor gets 300 book reads/min. Responses are unchanged. `scripts/check-client-ip-throttle.cjs` now also runs the real `ProductController`: 300 reads → 200, the 301st → 429, another visitor 200, body unchanged.
- **Takes effect on live only after this branch is deployed.** Until then localhost (whose app calls the live API) can still hit the shared live limit. Remaining risks: many shoppers behind one carrier IP (CGNAT) share 300/min; the live nginx burst-404 rule (VPS config, not in the repo) can still fail requests. Not done (would change behaviour on failure only, needs sign-off): a client-side retry for the book request.

## PageSpeed work reverted (2026-10-28)

- At the user's request, everything from the PageSpeed Insights work of 2026-10-28 is undone; the code is as it was before it. The user reported product pages showing no product, a layout shift on the homepage and a slower feel. Rule from the user: performance changes must keep functionality and behaviour exactly the same.
- Reverted: the first-paint copy (`api/src/storefront-shell.ts`, deleted) and the deferred Angular start; the preload hints, Google Fonts stylesheet copy (`storefront-styles.<sha>.css`, deleted) and font rewrite in `storefront-performance.ts`; per-route hints and the shell/image hints in `storefront-document.service.ts` (back to HEAD); local routing of documents through `StorefrontDocumentService` in `main.ts`; logo/side-menu changes in `pagespeed-runtime.html` (back to HEAD); package banner `srcset` in `special-package-shelves.html`; the "রিভিউ ও রেটিং" heading change in `storefront-product-sections-script.ts`; the matching check changes (`check-storefront-shell.cjs` deleted). `ui/dist/angular-ui/browser/index.html` restored from HEAD and re-patched at startup (verified: no hints, original stylesheet link and font, super-deal prefetch back). Earlier work in the same files (header stability, COEP, Meta/Clarity tracking, retries) kept. Copies of the reverted files: session scratchpad `psi-attempt-backup/`.
- Verified after the revert on localhost:3001: homepage and 7 product pages render at 412px and 1350px with no copy/shell; 16 storefront checks pass. One product page came up empty once and rendered on 3 retries: the live API's request limit (heavy test traffic), the known nginx burst 404 issue, not this code.
- Likely causes of what the user saw: local product pages were served through the document service, which reads the local dev DB, so books missing there showed "Not found"; the copy used system fonts, so its hand-over to the real page changed text visibly; Angular started only after the cover painted and the copy stayed up until the app settled.
- Re-applied on its own (user sign-off, same day): the "রিভিউ ও রেটিং" heading fix in `storefront-product-sections-script.ts` (`activateReviewSection` now writes the heading only when it differs). Before, every DOM change re-ran the mount, which rewrote the heading, which was itself a DOM change: an endless loop on every product page. Verified on localhost:3001, 5 live-catalogue books at 412px and 1350px after scrolling the whole page: all 10 page snapshots identical before/after (every element's position, size and text inside `app-product-details`; heading text; review section present; bought-together still moved below the recommendations, 12/12 reloads). DOM changes in a 3s idle window dropped from 720–1,360 to 49–158. Checks pass: product-detail-polish, review-reliability, category-library, product-cart-state, pagespeed-runtime, bottom-navigation, product-review-video, storefront-seo. Not deployed.
- Findings that were correct but are not applied (each would need its own change and sign-off): side-menu logo `/assets/images/logo/download%20(2).png` 404s on every page; the 242KB Hind Siliguri TTF downloads next to the 87KB WOFF2; the global stylesheet `@import`s four Google Fonts sheets (three families unused); live still sends COEP `require-corp`, which blocks Clarity and the sGTM page_view beacon (fixed in this branch, needs deploy). Tracking tags stay as they are (user decision).

## Header menu flash on reload (2026-10-28)

- Follow-up to the header-jump fix below. Frame-by-frame recording showed the rest of the header painting at ~0.52s while the menu row stayed empty (the hide-until-swapped guard) until the index.html "Custom Nav Rewrite" filled it at ~0.73s, then "আমার অর্ডার দেখুন" one frame later: the menu popped in.
- New `gtm-snippets/header-stability.html` (injected second, all pages; the guard moved here from `pagespeed-runtime.html`, which is back to HEAD):
  - draws the store menu (হোমপেজ, অফার, সকল বই, কোরআন, সিরাত, হাদিস, ব্লগ; fixed links, current page marked active, Angular's style scope copied) in a MutationObserver callback, i.e. in the same task Angular creates the menu row, before any paint, and marks it `data-amol-nav` so the index.html rewrite skips it. The labels no longer depend on Angular's late translations. `guest-orders.html` adds its button in the same frame; `blog-reading.html` sees `/blogs` and adds nothing;
  - the old hide-until-swapped CSS stays as a fallback (3s reveal);
  - reserves space for other late header parts: desktop cart/login labels (shown via `:empty::before` with the same words until Angular fills them), header icons sized before they load (bag 112:150, support 143:150 at 33px), bottom-bar icons given the 1.55rem box of the later SVG icons, bottom-bar labels shown/kept while empty, tablet logo fixed to the app's final 90x115 box.
- `homepage-redesign.html`: desktop logo (≥67rem) now a fixed 4rem x 5rem box. Angular swaps the bundled 56x69 logo for the uploaded 325x415 one after load, and `width: auto` grew the header 8px.
- Result (Playwright layout-shift sources inside `app-header`): 0 at 412px (home, product, list), 800px and 1000px (offers, home) and 1280/1440px (home, product, list). The menu is complete on its first painted frame. Checks pass: new `check-header-stability.cjs`, `check-homepage-redesign.cjs` (logo-box assertion updated), `check-pagespeed-runtime.cjs`, `check-mobile-browsing.cjs`, `check-bottom-navigation.cjs`. Not deployed.
- If the menu items change, update both `header-stability.html` and the index.html rewrite's MENU.

## Header jumps while the page loads (2026-10-28)

- Measured with Playwright layout-shift sources and per-frame header snapshots at 444px. Three causes:
  1. **Late global stylesheet.** Angular's critical-CSS build loads `styles.<hash>.css` as `media="print" onload="this.media='all'"` (lowest priority). When Angular renders before it arrives, the header and page paint without `.container { padding: 0 16px }` and header sizes, then everything jumps sideways (logo x 0→16, search box 247→348px; CLS 0.09 from this alone). Timing-dependent, so it happens only on some loads. `api/src/storefront-performance.ts` (`optimizeStorefrontHtml`, applied to index.html at startup) now loads it as a normal stylesheet (134 KB, 17 KB gzip). Slow-4G A/B: first paint unchanged (~4.3s both); header shift 0 in every run versus 0.115 in a deferred run.
  2. **Menu swap.** Angular draws its own menu (মূলপাতা | সকল বই | লেখক | পাবলিকেশন্স …), and the inline "Custom Nav Rewrite" in index.html replaces it at DOMContentLoaded + 400ms with the store menu (হোমপেজ | অফার | সকল বই | কোরআন …). It must wait because Angular's labels come from the async translate pipe. `gtm-snippets/pagespeed-runtime.html` now keeps the row's space but hides `.nav-list` until it has `data-amol-nav`, with a 3s CSS reveal if the swap never happens.
  3. **30px jump under the header on the homepage.** The app's `.super-deal-section { margin-top: 30px }` (meant for the hidden hero banner) collapsed into a gap under the header and vanished when the redesign replaced the app's home. `homepage-redesign.html` sets it to 0.
- Result at 444px: no header layout shift on home, product and product-list pages; homepage desktop CLS 0, product page 0.03. `check-pagespeed-runtime.cjs` asserts the stylesheet rewrite. Not deployed.
- Homepage flash of the app's own home (follow-up, same day): `homepage-redesign.html` adds `html.ab-home-pending` while the head parses (and in its MutationObserver callback, the same task Angular adds `app-home` on in-app navigation). While pending, `app-home` is `visibility: hidden` with its space kept and `.page-render` at least one screen tall, so the footer does not jump. Pending clears when the redesign mounts, on leaving `/` or `?home=legacy`, and on failure (`cleanup()`); a CSS animation reveals the app's home after 6s if nothing happens. The catalogue request now retries after 0.7s and 2s before falling back. Playwright at 412px: normal loads, app's home never visible, redesign at ~0.65s, CLS 0 (was 0.13–0.31); first two catalogue calls 404, redesign still mounts (3.5s); catalogue down, app's home shown at 3.2s; catalogue never answers, app's home shown at 6.6s; in-app navigation to `/` (logo), 0 frames of the app's home, cached or not. `check-homepage-redesign.cjs` asserts the guard, cleanup and retries.
- `check-pagespeed-fixes.cjs` fails on its `responsiveImage` srcset assertion because of the earlier local-only `localHost ||` homepage-image change, not this work.

## Product page: squeezed "সর্বশেষ দেখা বই" and missing publisher shelf (2026-10-28)

- Recently-viewed shelf sits on its own soft green panel (accent 9% on white, rounded) with white cards, so the visitor's history stands apart from the catalogue shelves; green rather than cream so it does not merge with the footer. Panel padding 24/12px on phones, 32px from 48rem.
- Squeezed recently-viewed shelf: the compiled app's `app-recent-view` carousel uses Swiper breakpoints `0: 4 per view`, `450: 3`, so phones under 450px got four 92px covers per row with broken price/rating rows. It is now replaced (like the other two native shelves) by a "সর্বশেষ দেখা বই" shelf at the end of `#ab-category-library`, built with the same library cards: 2 per row on phones (4 shown), 4 on tablets, 6 in one row on desktop. Data comes from the app's own `recentViewedProducts` (newest first, current book excluded, deduped), with current library prices where the book is in the catalogue; it falls back to our `ab-recently-viewed-products` IDs. No extra request. The native carousel is hidden only when the new shelf has books.
- "এই প্রকাশনীর অন্যান্য বই" sometimes missing: it came from its own `POST /product/get-all`, and a failure (the live nginx burst 404, see below) left an empty list with no retry. The shelf is now taken from the library response, which already holds the whole in-stock catalogue (104 books, `count` = length) in the same sort order; the direct request is used only if the catalogue outgrows the library (`count` > length). The library request (and that fallback) now retries after 0.7s, 2s and 5s (`fetchJsonWithRetry`).
- Verified on localhost:3001: phone shelf 2 × 200px cards, desktop one row of 6, Add to Cart works from a recent card, native carousel hidden. Playwright, fresh visitors: with the first two library requests forced to 404 both shelves still appear (3rd call); 5/5 normal fresh loads show both shelves although every load had 3–6 burst 404s from the live API (library included). `check-category-library.cjs` gains retry, publisher-from-library and recently-viewed tests. `check-product-detail-polish.cjs` harness repaired (it already failed before this change: stale `isLocalPreviewHost`/`fetchJson` stubs). `check-special-package-redesign.cjs` still fails on its older package-feedback assertion. Not deployed.

## Empty strip under the footer on phones (2026-10-28)

- Symptom: on phones a 60px empty strip sat between the green "© 2026 আমল বুকস" bar and the bottom menu.
- Cause: two rules reserved room for the 61px bottom menu. The compiled app gives `.footer-bottom-copyright` `margin-bottom: 60px` at ≤500px, and `gtm-snippets/mobile-browsing.html` gives `body` `padding-bottom: 61px` at ≤767px. The menu covered one; the other showed as the strip.
- Fix (`mobile-browsing.html`, ≤767px): footer margin set to 0, so the body padding alone clears the bottom bar. The cart page's checkout bar is 69px (taller than the menu it covers), so the cart page now pads by that bar's height (`calc(59px + max(10px, safe-area))`), matching the existing product buy-bar rule.
- Verified on localhost:3001 after a dev-server restart: the copyright bar ends exactly where the bottom bar starts on the homepage (444px and 600px wide), on a product page (buy bar) and on the cart (checkout bar); desktop (1280px) unchanged with no padding. `check-mobile-browsing.cjs` asserts both rules. Not deployed.

## Homepage special-package shelf missing on localhost (2026-10-28)

- Symptom: the "স্পেশাল প্যাকেজ" shelf showed on production but not on localhost:3001. On 4 of 5 fresh headless loads, the shelf's single `POST /special-package/get-all` failed with 404, and the snippet then waited 30s and retried only on a later DOM change, so it never appeared.
- Cause: localhost proxies that call to `apisub.amolbooks.com`, and the **live nginx (nginx/1.18.0 Ubuntu) answers bursts with an nginx 404 page**. 25 parallel POSTs → 4×404; a mixed burst of 24 → 23×404. Sequential requests (curl/Node, 48 total) always returned 201. The same burst limit can hit production visitors: a page load fires many `apisub` calls at once, so sections that load from it can fail intermittently. This is very likely the "intermittent 404" seen earlier on product pages. No rate-limit rule exists in the repo's nginx examples; VPS access was unavailable, so the live config was not inspected.
- Fix (`gtm-snippets/special-package-shelves.html`): a failed load retries after 0.7s, 2s, 5s and 10s, re-running the mount each time; no duplicate requests while a retry is pending; the 30-second blackout is removed. `check-package-shelves.cjs` gains a behavioural retry test.
- Verified: after a dev-server restart (the homepage is served from the startup-patched index), 5/5 fresh loads show the shelf; 4 of them recovered from a first 404. Pane screenshot shows 4 banners, matching production. Package/homepage/free-delivery/hydration/action and Meta checks pass. Not deployed.
- Follow-up on the VPS: find the nginx `limit_req`/`limit_conn` (or similar) rule returning 404 for `apisub` and raise its burst or return 429. Other one-shot loaders on the site may be affected by the same limit.

## Meta Event Match Quality: real customer data on server events (2026-10-28)

- Baseline (Events Manager, pixel 1294682478263474, read only): ViewContent 6.1, AddToCart 6.1, InitiateCheckout 6.2, Purchase 8.5. Non-purchase events had IP/UA/fbp 100%, but phone ≤4%, email ≤2.6%, external ID ≤2.8%, country ≤4%. Meta flagged "server sends empty fbc" (est. +0.7) and "update to IPv6".
- Root cause found: the compiled storefront's `getUserData()` fills unknown visitors with stand-ins before calling `/api/gtag/track-theme-*`: phone 8801700000000, noemail@gmail.com, city "global", "Mr Unknown", gender m, state bd, zip 1200, dob 19970216. It also sends `external_id` = hash of `Date.now()`, which changes every event, so the inline index.html enrichment never added the real ID. Real names are hashed without lowercasing. The click ID is read from `_fbc`, which Meta's pixel writes only after it loads.
- Browser (`gtm-snippets/meta-match-data.html`, injected first):
  - writes `_fbc` (`fb.1.<ms>.<fbclid>`, `.amolbooks.com`, 90 days) while the head parses;
  - enriches only track-theme request bodies: removes the stand-ins (gender only for stand-in visitors); sets `external_id` to `amol_analytics_anonymous_id`, the ID the server's Purchase event already uses; adds `fbc` (cookie, else saved first-click `fbclid`) and `fbp`; adds the saved customer hashes; adds country bd;
  - `window.__amolRememberMetaCustomer` stores only SHA-256 phone (server `8801…` normalisation, Bengali digits accepted), email, first name, remaining name; `commerce-events.html` calls it when checkout details are complete and on confirm;
  - pushes `user_data.customer_id` (same ID) for the GTM pixel/Data Tags.
- Server (CRLF kept): `gtm.service.ts` strips the same stand-ins and empty `fbc`/`fbp`/`external_id` before the Meta call (protects older cached pages; also stops PostHog grouping every visitor under the stand-in hash). `utils.service.ts` `getClientIp` prefers `CF-Connecting-IP` (real IPv6) over the client-supplied first `X-Forwarded-For`.
- Local preview guard now also blocks `apisub.amolbooks.com/api/gtag|gtm/`. Localhost:3001 had been sending real ViewContent events to Meta via the live API.
- Verified:
  - new `scripts/check-meta-match-data.cjs` (compiled server handler + Playwright fixtures, nothing sent): cookie timing/domain, stand-in removal, stable external ID, fbc fallback, hashes equal Node SHA-256 of the server's normalisation, only hashes stored, real logged-in values kept, other requests untouched;
  - live-page capture on localhost:3001: ViewContent carries only country, the stable external ID and the click's fbc, and is redirected to `data:` locally;
  - after typing checkout details, the next ViewContent carries matching phone/first/last-name hashes.
  - API build and 11 checks pass.
- Not deployed. Expected effect is gradual (Meta recalculates over ~2–7 days). The Cloudflare "Pseudo IPv4" setting (Network tab) should be Off or "Add header" for real IPv6 to reach the API. Email capture is limited to the optional checkout email.

## Empty product pages from shared API rate limit (2026-10-27)

- Symptom: book pages intermittently showed no product. The browser console showed `429 Too Many Requests` from `apisub.amolbooks.com/api/product/get-by-slug/...` (65 such errors in this session's preview).
- Cause: the global `ThrottlerGuard` (`@nestjs/throttler` 2.0.1: 120 requests/60s per route, `get-all` 300) tracks callers by `req.ip`. The app never sets `trust proxy`, and production sits behind Cloudflare and nginx, so `req.ip` is the local proxy address. Every visitor shared one bucket per route. A few busy minutes (or one heavy client) made the API return 429 to everyone, and Angular renders an empty product page when its product request fails. Live sampling showed the bucket draining from traffic other than the probe.
- Fix: new `api/src/guards/client-ip-throttler.guard.ts` extends `ThrottlerGuard` and tracks `CF-Connecting-IP`, then the first `X-Forwarded-For` entry, then `req.ip`. It replaces `ThrottlerGuard` as `APP_GUARD` in `app.module.ts` (CRLF preserved, 3-line diff). Limits and per-route `@Throttle` overrides are unchanged. A request that bypasses Cloudflare could choose its own tracker; that is still stricter than the previous shared bucket.
- Verified: new `scripts/check-client-ip-throttle.cjs` boots an isolated Nest app at limit 2. The old guard gives `[200,200,429,429,429,429]` for visitor A ×3, B, forwarded-only, direct; the new guard gives `[200,200,429,200,200,200]`. The running dev API reports separate `X-RateLimit-Remaining` per `cf-connecting-ip`. The book that returned 429 renders on localhost:3001. API build plus throttle, SEO HTTP/routing, admin-signup, product-cart and commerce-events checks pass.
- Takes effect for visitors only after deployment: safe pull, API rebuild, `pm2 restart amolbooks-api`. Localhost product pages still call the live API directly until then. Not deployed.

## Local preview checkout item removal (2026-10-27)

- Cause on localhost:3001: Angular's drawer delete/stepper (proxied by the checkout trash and +/− buttons) writes only `Amolbooks_USER_CART_1`. Local preview treats `Amolbooks_LOCAL_USER_CART_1` and the tab's `window.name` copy as the source of truth, and `cartStorageKey()` plus `syncCheckoutCartStorage()` immediately wrote the stale copy back. The item reappeared or the checkout reloaded.
- Fix (local preview only, `storefront-product-sections-script.ts`): record taps inside `.ab-corow`, `.cart-slide-area` or the checkout item rows, and for 4s afterwards `cartStorageKey()` adopts a changed native cart into the local and tab copies instead of overwriting it. The tap listener is registered only when `isLocalPreviewHost()`, and the adoption sits inside that branch, so production is unchanged. Without a recent tap the local copy still restores carts the compiled app resets on page load.
- Verified on localhost:3001 at 1280px:
  - Trash on the combo book removes it from all three copies, stays removed past the window, subtotal ৳315, and `remove_from_cart_stape` fires.
  - Checkout + and − change quantity 1→2→1 and stick.
  - Deleting the last item leaves every copy empty after reload.
  - A cart added on one product page survives two page loads into checkout.
- `check-product-cart-state.cjs` gains a behavioural harness: adoption after a tap, restore without/after a stale tap, no resurrection of an emptied cart. API build plus product-cart, checkout-delivery, commerce-events, mobile, category, homepage, free-delivery, account and SEO HTTP checks pass.
- `check-cart-navigation.cjs` (hard-coded to port 3000; run against 3001 via a temporary copy) fails at its first count: it expects 4 cart-page rows, but the free-notebook gift row makes 5 while the cart holds exactly the 4 added lines. This predates this change. Not deployed.

## Wire the never-firing GTM ecommerce tags (2026-10-27)

- Fed the existing GTM-NNZV54QJ triggers; no GTM changes. Payloads match the tags' variables (`ecommerce.currency/value/items`, `ecommerce.search_term`, `ecommerce.collection_id`) and carry `event_id` and `__stape` like the existing events.
  - `view_collection_stape`: `homepage-redesign.html` pushes it beside each homepage `view_item_list`, with `collection_id`/`item_list_name` = shelf id.
  - New `gtm-snippets/commerce-events.html` (injected on all pages):
    - `search_submitted_stape`: on `/product-list?searchQuery=` (native and custom header search both land there); once per results URL, not on reload.
    - `remove_from_cart_stape`: cart quantity decreases (guest localStorage; signed-in `get-carts-by-user` responses) within 8s of a tap on a cart/checkout control, never on order-success. This keeps order placement, login merges and other tabs out.
    - `add_shipping_info_stape`: once per checkout visit when name, valid BD phone (Bengali digits accepted), address and delivery area are complete; includes `shipping_tier`.
    - `add_payment_info_stape`: once on the "অর্ডার কনফার্ম করুন" tap with complete details; `payment_type` from the payment radio.
  - `api/src/main.ts` exposes read-only `window.__amolTracking` (cart items, prices) from the injected tracking script so values match the existing events.
- Verified on localhost:3001 (orders blocked during the test): homepage 10 list events with collection ids; header search "barakah" one event, none on reload; cart − gives 1 × ৳315 removal, + gives none; checkout shipping once after address completion (৳315, "ঢাকা সিটির ভেতর ৬০ টাকা"); two confirm taps → one Cash on Delivery payment event. New `scripts/check-commerce-events.cjs` covers these plus signed-in removal, untapped decreases, order-success and invalid phones. API build and 10 focused checks pass. Not deployed.
- The served storefront `index.html` is re-patched only at API startup, so the new snippet appears after a restart (normal deploy restarts it).
- Checkout trash button (follow-up): on the live site it works. On desktop checkout with a guest cart, a real tap and a scripted click each removed the item (book removed, then bundle) and updated the subtotal (৳1,249 → ৳934 → empty). At phone width the checkout item list deliberately shows no item controls. On localhost:3001 it appears broken: the panel hides but the cart is unchanged, or the page reloads. This happens because local preview mode (`isLocalPreviewHost` in `storefront-product-sections-script.ts`) mirrors the cart into `Amolbooks_LOCAL_USER_CART_1` and the tab's `window.name` and re-syncs or reloads checkout. The inline stepper in `ui/dist/.../index.html` (commit 3df026ff) was not edited; the localhost behaviour is fixed separately (see "Local preview checkout item removal").

## Tracking tag audit after leaving Stape hosting (2026-10-27)

- Live setup: web container GTM-NNZV54QJ ("Amolbook Web Stape") loads first-party from `server.amolbooks.com/tagioo-loader`; its `const - server_container_url` is `https://server.amolbooks.com`, served by server container GTM-PZPN8VW3 (GA4 client + Data Client; GA4 base, Google Ads conversions/remarketing/linker, Meta Conversions API tags). Tagging server reports v4.3.0 (latest 4.5.0). The "Stape" names are only template/folder names; nothing depends on Stape hosting. Probe: `/healthy` ok; Data Client returns `200 image/gif` with CORS but no CORP header.
- Firing (GTM preview + clean browser): GA4 config/page_view/view_item/add_to_cart/view_cart/begin_checkout fire and reach `server.amolbooks.com/g/collect` (CORS fetch, unaffected by COEP). The browser Meta pixel works for normal visitors (fbevents and facebook.com/tr send CORP); its "Failed" status in the owner's Chrome comes from that browser's tracker blocking.
- Broken on live until the COEP fix deploys: every `[Stape] DT - *` Data Tag (pixel to `server.amolbooks.com/data`) and Microsoft Clarity. Confirmed: Data Client pixel errors on amolbooks.com (COEP require-corp) and loads on a page without COEP. Meta Events Manager shows InitiateCheckout server events steady at ~75% of browser volume before/after Oct 17, because the API's own Conversions API calls (`/api/gtag/track-theme-*`, and server-to-server purchase) are unaffected.
- Tags that never fire because nothing pushes their trigger event: GA4 view_item_list (Angular pushes `view_item_list`, trigger waits for `view_collection_stape`), GA4/Meta/DT search (`search_submitted_stape`), GA4 remove_from_cart, add_shipping_info, and GA4/Meta/DT add_payment_info. Either wire them or remove them.
- Follow-ups outside this repo: add `Cross-Origin-Resource-Policy: cross-origin` on the self-hosted tagging server responses; apply the GTM template updates (3 web, 1 server) and upgrade the tagging server image. No GTM or Meta settings were changed; GTM preview mode was opened in the owner's Chrome only.

## begin_checkout verification and Clarity checkout event (2026-10-27)

- Live check in a clean browser (guest carts, no order placed): `begin_checkout_stape` fires on /checkout for a single book (৳315) and a package-only cart (৳934), via Buy Now and via the cart page button. GTM then sends it first-party to the Stape server: `server.amolbooks.com/g/collect` (GA4, en=begin_checkout) and `server.amolbooks.com/data` (event=begin_checkout). Server container `/healthy` returns ok. Logged-in carts return packages inside `product`, so they are included too. No tracking-path change was needed.
- Clarity's "Begin checkout" smart event (1 session in 30 days) is Clarity's own click-based guess, not the dataLayer event, and Clarity cannot go through the Stape server. `api/src/main.ts` now patches the served tracking script to call `clarity('event','begin_checkout')` right after the existing push, using Clarity's queue stub so the call survives firing before the GTM-loaded tag. Idempotent marker; compiled UI files were not hand-edited.
- Verified on localhost:3001: patch served once on SPA and SEO documents; guest checkout pushes `begin_checkout_stape` (৳315) and queues `event,begin_checkout`; no console errors. API build, `check-storefront-seo-http`, `check-seo-routing`, `check-pagespeed-runtime` and diff check pass. Not deployed. After deploy, build a Clarity funnel or smart event from the `begin_checkout` custom event.

## Restore Microsoft Clarity recording (2026-10-27)

- Clarity (project u5f0mm81ub, loaded through GTM) stopped recording the homepage and every product page between 2026-10-16 and 10-18; the last 7/10 days show only checkout/cart/account pages, while 30-day data has thousands of product-page visits. Recorded sessions fell from 17,952 (30 days) to 888 (7 days); real traffic did not drop.
- Cause: Helmet 6 defaults send `Cross-Origin-Embedder-Policy: require-corp`. Once storefront documents were served through Nest (SEO routing work), every storefront page carried it. COEP blocks cross-origin no-CORS loads without a CORP header: the Clarity tag (www.clarity.ms) and pixel (c.clarity.ms) failed, so clarity.js never started. Facebook Pixel and the Stape GTM loader send CORP and kept working. Confirmed in a clean browser: Clarity tag/pixel fail on amolbooks.com but load on a page without COEP.
- Fix: `crossOriginEmbedderPolicy: false` in the existing helmet config in `api/src/main.ts`. CORP, COOP, referrer policy and the disabled CSP are unchanged. The storefront does not use cross-origin isolation.
- Verified on localhost:3001 after the watch rebuild: no COEP header; Clarity tag script and pixel load (probe pre-marked so no localhost session was recorded); rokomari icon URLs load. The native cash-on-delivery/return icons already render from local `/assets/images/logo/` copies, so they were not visibly broken. `npm run build`, `check-storefront-seo-http` and `check-seo-routing` pass. Not deployed: needs safe pull, API rebuild and `pm2 restart amolbooks-api`; afterwards confirm the live header is gone and product pages reappear in Clarity's heatmap list within a day.
- Other Clarity findings not changed here: CLS 0.38/LCP 4.3s (30-day score 61), product-cover dead taps (users expect zoom), small header drawer close icon, 356 promo Apply taps vs 9 applied-coupon events, high landing-page exits, and no Clarity funnel configured.

## Guest checkout address-type cleanup (2026-10-27)

- Hide the native home/saved-address type selector for unauthenticated checkout through the existing account snippet and authentication helper. Logged-in checkout retains its selector; the native control/default remains intact for order submission. No API calls or API_BASE changes. Browser verified the guest selector is hidden. Lint remains blocked by the existing ignored-glob configuration.

## Checkout delivery selection stability (2026-10-27)

- Fixed the reported delivery-area glitch on the Sunday rollback worktree: repeated checkout mounts moved native delivery heading/radio nodes even when already placed, continuously generating mutations. Mobile/desktop placement is now idempotent and preserves the existing selected controls/listeners.
- Included the selected delivery option in the local checkout cart-mirror signature so changing area refreshes the displayed total instead of keeping the previous shipping-inclusive total. No order submission or delivery-rate configuration changed; production Angular calculation remains authoritative.
- New `scripts/check-checkout-delivery-stability.cjs` reproduces baseline DOM churn and confirms zero settled moves on mobile/desktop, responsive restoration and retained selection. Existing product/cart checks pass. API build passes; lint remains blocked by the existing ignored-glob configuration. No API_BASE changes or compiled storefront edits.
- Browser verified the user's two-book checkout: ৳249 subtotal plus ৳75 outside = ৳324; switching back to inside selects ৳60 and total ৳309. Both selections remain checked after page updates. Dev server remains on localhost:3001; not deployed.

## Package hero savings removal (2026-10-27)

- Removed the highlighted large package-savings amount and caption from the special-package hero. Book count, list/offer prices, gift and purchase actions are preserved. Updated the existing savings assertion; no compiled storefront files were hand-edited. Browser verified the callout is absent and the ৳1,570 list / ৳934 offer prices and actions remain. Package hydration regression checks and API build pass; lint remains blocked by the existing ignored-glob configuration.

## Local homepage cover recovery (2026-10-27)

- Local homepage responsive covers requested `/api/storefront-images` from this worktree, which lacks production uploads: resized cover requests returned 404 while original API-host covers returned 200. Error recovery subsequently left placeholder covers.
- `homepage-redesign.html` now uses original published cover URLs on local hosts, preserving responsive derivatives in production. No runtime uploads or compiled storefront files were hand-edited; API_BASE remains same-origin catalogue locally and the published API otherwise.
- Local/production rendering assertions pass, API build and watch compilation pass. Browser verified the first four real covers load at localhost:3001 with nonzero natural widths. Lint remains blocked by the existing ignored-glob configuration; full diff check reports generated index.html whitespace, while the edited snippet passes. Dev server remains running on 3001.

## Sunday release preparation (2026-10-27)

- Prepared the verified guest-order access/cancellation flow and reviewed storefront fixes for the Sunday rollback branch. All focused guest-order, category-library, mobile, package hydration, product/cart, free-delivery, homepage and package-shelf checks pass. API build passes; lint remains blocked by the existing ignored-files configuration. Generated builds, local preview files and unrelated ISBN work are excluded from the release commit.
- Deployment requires safe pull, API rebuild and `pm2 restart amolbooks-api`. No dependency install or nginx change is needed. Live SMS still needs a real-phone delivery check after deployment; duplicate-checkout prevention and the diagnosed local multi-tab empty-cart issue are not part of this batch.

## Editorial blog-card refresh (2026-10-27)

- Restyled the existing `app-blog-card-one` in `gtm-snippets/blog-reading.html`: light paper, thin border, restrained corner radius, clear Bengali serif title, simpler metadata and a plain green reading link. Removed the decorative bookmark badge, glowing gradients/shadows and image zoom. Preserved the existing cover, author/view data, article title, Angular ownership and detail route.
- Scoped component tokens and hover/focus/pressed styles to the card; kept the reading link at a 44px minimum tap height with no wrapping. It uses a text arrow so it does not depend on a late icon font. Article reading styles and site navigation remain unchanged.
- Browser checked 320/375/414/768px with no horizontal overflow; also inspected desktop at 1280px. Confirmed the link opens the original article and the full description/title loads. Snippet syntax and API build pass; lint remains blocked by the existing ignored-files configuration. Local preview refreshed; not pushed or deployed.

## Remove below-footer order button and excess clearance (2026-10-27)

- Removed the guest-order entry appended after the footer copyright and its 80px bottom margin. Order access remains in the existing menu, login and order-success locations.
- Mobile document clearance now matches the existing bottom navigation (61px) or active purchase bar (53px), plus the device safe area. This removes the extra white strip without placing the footer under fixed controls. No order, cart or API behavior changes.
- Browser verified at 501px: no footer order entry; at the bottom, the footer ends at y=980.95 and the purchase bar starts at y=981, with no extra gap or covered copyright. Snippet syntax/mobile checks and API build pass. Lint remains blocked by its existing ignored-files configuration. Local preview updated; not deployed.

## Subject-library loading recovery (2026-10-27)

- Product subject shelves now use the existing same-origin `/storefront-catalog/library` endpoint on localhost and the public storefront, matching the homepage catalogue path. The former direct catalogue POST returned 404 during some full product-page loads despite returning 104 records in isolated requests. Other hosts retain their existing direct-API path.
- Loading failure is no longer presented as an empty catalogue. The shelf offers a retry button; native recommendations remain visible until real replacement cards are ready, including on repeated mounts. Publisher shelves remain independent of subject-catalogue success. No fabricated recommendations or catalogue writes.
- Added `scripts/check-category-library.cjs` for host routing, failed-response messaging, retry success and native fallback preservation. Category, product cart and homepage checks pass. API build passes; lint remains blocked by the existing all-files-ignored configuration.
- Browser verified subject shelves for `sompodgorarkoushol` (37 books/seven subjects), `Jibon` (41 books) and `the-barakah-effect` (41 books). Local dev preview updated; not pushed or deployed. The upstream cause of the direct POST's intermittent 404 is not established; this uses the existing working catalogue path and handles future failures explicitly.

## Product bottom-bar ownership and loading stability (2026-10-27)

- Mobile navigation is now hidden (including keyboard/accessibility focus) while the product purchase bar is active, and returns when that bar closes. Uses the existing active-bar class, with no purchase-handler changes. Product cover containers reserve square space and the product route opts out of browser scroll anchoring that could jump to asynchronously moved recommendation cards.
- Product runtime installs its layout CSS immediately, before the first debounced mount. Local preview now injects storefront snippets into the head, matching the existing production injection order instead of applying layout styles after body content. No compiled storefront edits or artificial loading delay/blank-page overlay.
- Browser verification on `/product-details/Jibon` at 501px: purchase bar active/navigation hidden at scrollY 413.5, scroll remains 413.5 after async content settles, navigation visible again at scrollY 0, no horizontal overflow. Mobile, product cart, homepage and package hydration checks pass. API build passes; lint remains blocked by the existing all-files-ignored configuration.
- Dev server restarted on localhost:3000; changes remain local. Phone hardware/network throttling and production rollout have not been checked.

## Cached special-package pricing correction (2026-10-27)

- Fixed the package detail hydration cache path: cached full-book data previously overwrote the package copy quantity with warehouse inventory. Repeat/cross-package hydration could therefore inflate list price, offer price and savings. Both fresh and cached hydration now use the same merge with package quantity and variation taking precedence, preserving catalogue descriptions/previews.
- Added `scripts/check-package-hydration.cjs`: first load, repeated cache hits, different bundle copy counts, selected variations and retained book details. Focused hydration and free-delivery checks pass; API build passes. Local browser shows the successful entrepreneur bundle at ৳1,570 list / ৳934 offer / ৳636 saving. Lint is blocked by the existing ignored-files configuration. The older package-redesign check also fails on unchanged HEAD at its unrelated silent-cart-feedback assertion.
- Dev preview serves the corrected source. No package records or checkout prices changed; not pushed or deployed.

## Mobile browsing comfort (2026-10-26)

- Added `gtm-snippets/mobile-browsing.html` through the existing storefront injection. Below 768px, the header has a compact logo/search layout and a stable Bengali search prompt, clearer section headings, larger cart titles and 44px quantity/remove targets. Cart actions use the existing Amol green with a distinct secondary continue-shopping button; existing cart handlers/prices remain authoritative.
- Added persistent Bengali labels above checkout name/phone/address/note fields plus appropriate autofill and phone keyboard hints. Mobile text fields use 16px text to avoid focus zoom. Bottom navigation includes active-page cues and safe-area spacing; fixed controls hide when a focused text field and a reduced visual viewport indicate an open software keyboard. Reduced-motion preferences stop the targeted ticker/transitions. No API calls, dependency additions or compiled UI edits.
- Browser review at 393px verified no horizontal overflow, 18px cart titles, 44px cart tap areas, search-result navigation, cart-to-checkout navigation and labelled checkout fields. Software-keyboard visibility logic is covered by `scripts/check-mobile-browsing.cjs`; physical iOS/Android keyboard behavior still needs a device check. Homepage and package regressions pass. API build passes; lint remains blocked by the existing all-files-ignored ESLint configuration.
- Dev server remains at localhost:3000. Prepared locally on the Sunday rollback branch; not pushed or deployed. This is a mobile presentation change, not duplicate-order prevention or a redesigned success screen.

## Verified guest order history and cancellation (2026-10-26)

- Added purpose-scoped SMS verification and a 30-minute guest-order session. Customers can enter their checkout number from the menu, mobile drawer, login screen, footer or success page, verify it, view paginated history and confirm cancellation without creating an account. Existing login/password-reset OTPs remain separate. New endpoints enforce verified phone ownership and return a limited order projection with no addresses or internal notes.
- OTPs expire in five minutes, allow five guesses, are single-use, and are limited by normalized phone/hour and IP. Only hashes are stored; SMS acknowledgement is awaited and failures do not return success. The local review sandbox uses disposable test orders and an explicitly labelled code, with no production bypass or real SMS.
- Customer cancellation is an atomic status transition before courier booking, with time/verified-phone/reason audit and retained history. Booking and inventory processing gates prevent races; cancelled orders cannot be reopened by stale staff updates. Staff may still record the existing refund status without reopening fulfillment; refund messaging never claims an automatic transfer. Per-product opaque retry keys make restoration idempotent and a minute job recovers interrupted restocks; raw order IDs are not exposed through catalogue markers.
- Local database/Nest checks cover ownership, OTP replay/expiry/rate limits, HTTP validation, pagination, logout, simultaneous cancellation/booking, stock restoration and crash recovery. Related homepage/package/free-delivery regressions and customer-manager backend regressions pass. Mobile browser review exercised the labelled sandbox OTP, history, confirmation and cancellation/refund state. No real order, courier or SMS was changed.
- API build and focused regression checks pass. Lint remains blocked by the existing all-files-ignored ESLint configuration.
- Dev preview remains at localhost:3000 with a separate local sandbox on 3012. Live SMS delivery still requires deployment and an owner-approved phone test with the existing gateway configuration. Operational notes and local commands: `scripts/GUEST_ORDERS.md`. No compiled UI/admin edits or dependency additions.

## Larger homepage package banners on mobile (2026-10-26)

- Increased the package page width to 150% below 600px, keeping the two-row layout while making each banner about 50% wider. A partial next column signals horizontal swiping; mobile arrow navigation advances by a column. Disabled page snapping at this breakpoint so the wider page does not snap back before readers can view the right column. Desktop stays 2×2. Compact free-delivery/notebook badge and all package links remain.
- Uses only the existing special-package shelf snippet; no API_BASE change or compiled UI edits. Dev preview remains running at localhost:3000.
- API build and package regression check pass; lint remains blocked by the existing ignored-files configuration. Browser at 393px confirms 262px-wide covers, no page overflow and working next/previous scrolling that stays at the chosen column. Prepared for the Sunday rollback branch; not deployed.

## Bundle free delivery (2026-10-26)

- User chose permanent free delivery for সফল উদ্যোক্তা বান্ডেল (`6abe2123b1f44997b7ca5950`), including other books in the same order. No expiry, countdown or limited-time claim.
- Website order creation now applies a server-owned eligibility rule to resolved package records and sets deliveryCharge to zero before calculating grandTotal. Existing discounts, gift pricing and courier cost bookkeeping remain intact. Other bundles and ordinary carts retain their prior delivery behavior; admin/manual overrides are unchanged.
- Added a storefront snippet with notices below this homepage/Offers banner, on the bundle detail page and at checkout. It patches the compiled lazy checkout calculator through its exported module metadata, with the existing component-context path as a fallback. This is required because production Angular hosts can hold numeric context IDs. No compiled UI edits, catalogue writes, or API_BASE required.
- API build and free-delivery, package shelf and homepage checks pass. Regression checks cover guest/saved mixed carts, zero/negative quantities, forged client flags, coupon totals, removal, address-wrapper replacement and Webpack bootstrap. Browser preview confirms mixed cart delivery changed from 60 to 0 and total from 1304 to 1244; removing the test bundle restores delivery 60 and total 370 for the original book. Test cart restored; no order submitted.
- Follow-up to browser comments: highlighted the homepage offer in gold, added an explicit double-offer label for free delivery plus the existing free notebook, and blurred/inerted only the delivery-charge radio group while eligibility is active. Preserved the selected delivery area and restore prior inert/ARIA state when eligibility ends. Browser checkout still shows zero shipping; focused regression covers state restoration and repeated updates.
- Further review: shortened the homepage/Offers badge to exactly “ফ্রি ডেলিভারি + ফ্রি নোটবুক” with compact padding and responsive type, retaining its gold highlight. Detailed bundle/checkout messaging is unchanged.
- Dev server remains running at localhost:3000. Lint remains blocked by the existing ignored-files configuration. Prepared on the Sunday rollback branch; production requires safe pull, API rebuild and restart before it can advertise or honor the offer.

## Homepage special packages and sales ordering (2026-10-26)

- Added a focused storefront snippet above the existing bestselling combo shelf. Four package banners appear in a 2×2 page, with horizontal touch/keyboard scrolling and previous/next controls for additional groups. Uses the same package IDs, artwork and detail routes as Offers; the Offers list uses the same sorted records. No compiled UI edits or package/catalogue writes.
- Added opt-in `totalSold` sorting to special-package get-all. It sums delivered order quantities by the retained package ID, excludes gift lines, defaults unsold packages to zero and uses deterministic date/ID ties. Counts are cached for one minute with concurrent query reuse; existing callers keep their prior behavior. Component-book sales are not used as package sales.
- Added `scripts/dev-storefront.cjs`: serves current snippets and compiled storefront at localhost:3000 with read-only remote catalogue proxying, without a database connection or scheduled jobs. Dev server left running for the user's review.
- API build and homepage/package regression checks pass. Lint remains blocked by the existing ignored-files configuration. Browser checks cover homepage placement, four-banner 2×2 phone/desktop layout, Offers rendering, loaded artwork and no page overflow. Live sales ordering cannot be verified against production until this API change is deployed; the current public API has no package totals. No deployment performed.

## Blog reading layout (2026-10-26)

- Updated the published top-ten article through the blog API: Noto Serif Bengali, 18/19px text, generous paragraph/heading spacing, 760px reading width, a responsive comparison table, and ten real catalogue covers linking to their books. Kept the full article and FAQ text. Backed up the original record in the local SEO research folder before the update; verified the live article at phone and desktop widths with no page overflow.
- Added `gtm-snippets/blog-reading.html` through the existing startup injection for future article styling and an idempotent desktop Blog menu link. Existing mobile-drawer/footer links remain; the header observer restores Blog after the current navigation script redraws it. Scoped article styles hide the unrelated product purchase bar. No compiled UI files edited, no API_BASE or catalogue writes.
- API build passes. Lint remains blocked by the existing all-files-ignored ESLint configuration. Live article content is updated; shared styling and the desktop menu require safe pull, API rebuild and restart on the VPS.

## SEO nginx fallback alignment (2026-10-26)

- Reviewed the user's actual www nginx configuration: core/product pages use the existing document renderer, but private/unknown routes use static index.html and bypass the prepared noindex/404 middleware.
- Updated the existing nginx template/installer to send the generic document fallback through a named Nest proxy, add query-preserving homepage alias redirects, and remove the server-wide Angular 404 replacement. Preserve existing document routes, SSL, gzip, assets/cache, catalogue and feed behavior. The installer already backs up config, validates before reload and restores originals on validation/reload failure. Private/API host configs keep their existing policy; server.amolbooks.com is untouched.
- Python regression checks pass for the legacy fixture and the complete user-supplied active storefront config, including repeat installation, named fallback uniqueness, preserved unrelated routes and real missing-asset 404 configuration. Local routing checks and API build pass; lint remains blocked by the existing ignored-files configuration. A local nginx executable is unavailable; actual nginx syntax validation is performed by the installer on the VPS before reload.
- Prepared as a focused follow-up on the Sunday branch. Deployment sequence is safe pull, API build, nginx installer, then API restart. Production is not changed by this local work; verify live private-page headers, aliases, unknown 404s, products, assets and checkout afterward.

## SEO audit repair on Sunday rollback (2026-10-26)

- Continued the SEO repair in this authoritative checkout on `codex/rollback-sunday-20260927`. The initial edits in the separate prod-release checkout are not a release source; its unrelated work and previous draft remain untouched.
- Adapted the fix to the existing Sunday `StorefrontDocumentService` and pure product SEO renderer instead of copying the older branch's crawler/bootstrap changes. Preserve all current metadata, approved-review, related-book, title-sync and performance work.
- Added host-scoped routing before the local storefront fallback: redirect API-host storefront documents to canonical www, consolidate `/home/` and `/index.html`, return real unknown-route 404/noindex responses, mark private frontend documents noindex, and correct canonical response HTML. Preserve API/assets/uploads/admin hosts and POST requests. Allow private frontend crawling in robots.txt so Google can see noindex.
- Product JSON-LD now prefers the saved book-specific SEO description over a potentially copied catalogue summary, strips Markdown emphasis, and retains the full stored summary in the visible fallback for separate factual catalogue review. Added a focused Barakah Effect regression to the existing metadata checks.
- API build, focused routing/metadata checks and existing renderer/HTTP checks pass. Lint remains blocked by the existing all-files-ignored configuration. No compiled storefront/admin files were hand-edited; pre-existing user changes are preserved.
- Prepared for a focused commit/push on the Sunday branch; production remains undeployed. SSH to root and amolbooks users at the supplied VPS host rejected the available key. Production nginx/API-host redirects, fallback handling, rate limiting and individual GSC error examples still need live inspection/verification; current prepared Express routing only applies to traffic that reaches Nest. No production data or Search Console settings changed. Deploy a focused Sunday release via `scripts/vps-safe-pull.sh` after access is restored.

## Mobile bottom bar and Core Web Vitals follow-up (2026-10-18)

- Reproduced the reported missing navigation icons: the earlier accessibility patch made the bar white while native CSS/SVG icons stayed white. Restored a dark green background with explicitly white labels/icons/links, retaining the existing SVG replacements, click selectors, layout and mobile sizing. This was a color regression; icons were already present.
- Added focused regression proof at 375, 390 and 430px with external font requests blocked. It reproduces white-on-white icons before the fix and verifies all four SVGs, contrasting background/labels and Angular redraws afterward.
- Report p3vpeiqndv shows historical field LCP 5s and CLS 0.3 over the previous 28 days, versus lab CLS 0.039 and still-slow lab LCP 8.8s. The Core Web Vitals field assessment is not fixed or passed merely by deploying code; it needs good real-user measurements. Original Angular bootstrap/vendor cost remains material, and the user's no-change instruction for server.amolbooks.com remains in force.
- Reduced the icon-font path in that report from about 254KiB to 6176 bytes of local WOFF2 subsets covering storefront classes/common social icons. Unicode ranges retain the vendor face for unlisted characters, with a CDN URL fallback if local fonts fail. Preserve font license metadata and include the upstream Font Awesome 6.2.0 license. No runtime dependency; regeneration uses temporary FontTools/Brotli tooling and official upstream TTF/CSS files.
- Runtime browser checks verify small-font use despite the late vendor stylesheet and actual fallback loading for an unlisted character. API build and focused checks pass; lint remains blocked by existing ignored-file config. Source changes are limited to snippets, font assets and checks; compiled UI/admin bundles are not hand-edited or staged.

## PageSpeed live verification (2026-10-18)

- First-paint follow-up c0f8f255 is deployed. Live font returns 200 with 87,976 bytes; homepage emits two responsive preload hints matching the actual first covers. Product/cart/home endpoints remain healthy and storefront screenshot confirms correct Bengali shaping and artwork.
- Final fresh mobile audit: https://pagespeed.web.dev/analysis/https-amolbooks-com/78hpo5tbwr?form_factor=mobile — performance 55, accessibility 97, best practices 96, SEO 100; FCP 5.0s, LCP 7.1s, TBT 300ms, Speed Index 5.7s, CLS 0.04. Original supplied report was 43 / 78 / 88 / 85 with FCP 7.0s, LCP 10.9s and Speed Index 17.4s. PSI resolved the new run to canonical www; lab variability and redirect handling mean this is not a controlled attribution experiment. Rolling 28-day field data will not update immediately.
- The new audit exposed a hydration race in the accessibility patch: an initially empty footer destination stayed aria-hidden after Angular populated href. Valid destinations now clear aria-hidden, and href changes trigger repair. Chrome regression covers the delayed empty-to-YouTube transition. This focused follow-up does not claim a new accessibility score before rerunning the audit.
- User explicitly requested leaving server.amolbooks.com unchanged. Its Tagioo loader transferred about 475,715 bytes without Content-Encoding in a GET probe and is not configured on this VPS. Further vendor/Angular bundle work and unused CSS are unresolved; original compiled storefront/admin bundles remain untouched. No claim that every PageSpeed warning is fixed.
- Deployment uses safe pull and saved code/upload snapshots. Nginx validation passes with existing duplicate-host warnings; only the Amol Books API process was restarted. Lint is still blocked by existing config, while API build and focused checks pass.

## PageSpeed first-paint follow-up (2026-10-18)

- Deployed bbbb358e through safe pull, rebuilt and restarted only amolbooks-api. Nginx now proxies /storefront-catalog/ to Nest and caches WebP/AVIF. Live catalogue returns 104 products as JSON; sampled cover shrank from 34,974 to 9,880 bytes. Code/nginx rollback snapshot: /home/amolbooks/source-snapshots/pagespeed-20261018-213247. Uploads have a separate safe-pull snapshot.
- Fresh mobile audit 37jv2ahujg: performance 37, accessibility 97, best practices 92, SEO 100. Main-thread work fell from 9.8s to 5.7s and product injection CPU from 1686ms to 92ms, but TBT increased and first render remains slow. Image opportunity fell from 563KiB to 68KiB; font-display and non-composited animation warnings disappeared. This is not an improved performance score.
- Follow-up: losslessly converted the existing 247,356-byte Bengali TTF to an 87,976-byte WOFF2, retaining all 427 codepoints. A hashed public asset replaces the font through the injected stylesheet. FontTools/Brotli were used in a temporary virtualenv only; no runtime dependency or compiled UI edits.
- Added dynamic responsive preloads for the two current best-selling published/in-stock homepage covers through the existing cached product reader. Hints match homepage srcset/sizes and fail open; they avoid waiting for Angular before requesting LCP artwork. Existing no-JS fallback/product metadata remain intact.
- API build, real-Nest document HTTP checks, SEO/navigation and runtime/browser checks pass. Lint remains blocked by the existing ignored-files config. Deployment and a second fresh audit will verify this follow-up.

## Production PageSpeed fixes (2026-10-18)

- Continued the PageSpeed work in the authoritative Sunday checkout, preserving the existing commerce bridge and unpublished review-video fix. The original chat checkout differs substantially from production and must not be deployed wholesale.
- Added responsive 320/640px homepage covers and 160/320px header logos through a fixed-size, local-file-only WebP endpoint. Four conversion workers queue normal shelf bursts; input pixels, pending jobs and cached bytes/entries are bounded. Original images recover on derivative failures; uploads are never rewritten. First shelf covers load eagerly.
- Enabled the existing allowlisted catalogue proxy for the production storefront and remapped Angular/homepage catalogue reads. Production nginx currently sends /storefront-catalog/ to the SPA fallback; deploy requires a prefix proxy to Nest. API_BASE is same-origin /storefront-catalog on production/local storefronts; other hosts retain https://apisub.amolbooks.com/api.
- Fixed repeated body scans and unchanged cart-badge writes. Focused Chrome fixture reproduces nine whole-body scans in 1.2s before the patch and one after; new content still receives brand replacement while scripts/data/textarea content stays untouched. Homepage mutation updates are batched and route polling avoids rescanning unchanged pages.
- Added icon font swap, compositor-only transitions, reduced-motion support, accessibility repairs and a main landmark. Document processing removes a known broken banner preload and prevents a duplicate standalone Ads library load after GTM is ready, preserving configuration/conversion commands and the fallback.
- Verified API build, focused image/browser/runtime checks and existing homepage, catalogue, product/cart and detail checks. Lint remains blocked by the pre-existing all-files-ignored ESLint config. No compiled UI/admin files are hand-edited or staged.
- VPS inspection confirms the canonical redirect is already an nginx return, measured at about 30ms internally and 86ms through Cloudflare; the old report's 7.1s delay was not reproduced. All resources in its cache-lifetime warning are third-party owned. Original Angular tree-shaking, vendor cache headers and active GTM configuration cannot be fixed by changing nginx asset TTLs. See scripts/PAGESPEED.md for remaining constraints.

## Product review YouTube embeds (2026-10-18)

- Confirmed the Dua Bishwokosh record stores a youtu.be share URL and the compiled Angular safeUrl pipe passes it straight into an iframe. It redirects to the watch page, which returns X-Frame-Options SAMEORIGIN. YouTube oEmbed confirms the video exists and supports embedding.
- Added `gtm-snippets/product-review-video.html` through the existing storefront injection. On product routes, recognized YouTube share/watch/shorts/live links become canonical embed URLs; existing embed parameters and unrelated hosts/frames remain untouched. Dynamic iframe/src changes are handled and the iframe sends an origin referrer for YouTube compatibility. No API_BASE is used. No compiled UI/admin edits or catalogue writes.
- Verification: desktop/mobile browser regression checks pass for the reported URL, supported forms, existing embeds, invalid IDs/lookalike hosts, delayed iframe changes and SPA route changes. API build passes. Lint remains blocked by existing ignored-files configuration. Not deployed; local changes are on the Sunday rollback worktree.

## Verified ISBN updates and deployment status (2026-10-18)

- Saved 29 researched ISBNs through the signed-in production admin; checked ISBN-13 checksums and read back each live record. See `docs/isbn-updates-2026-10-18.json` for product IDs, prior/new values and verification results. Read-back also found that the compiled admin normalized one embedded author snapshot on “মনের মতো সালাত”, dropping its embedded image/description while preserving author ID/name/slug. This requires a narrow restoration; the original snapshot remains in `/tmp/amol-isbn-live-records.json`. Remaining 68 lookups are deferred at the user's request; no guessed identifiers or component ISBNs assigned to bundles. No application source or compiled files changed for these data updates.
- Production sampling still returns the earlier Product/Book schema without the enhanced publisher, bookEdition, inLanguage and numberOfPages fields. Metadata enhancement commit `a9a4b748` is pushed on the Sunday branch but not confirmed deployed; safe pull, API rebuild and restart are still required. Newly saved ISBNs already appear in live schema. No Google ranking or catalogue-wide indexing claim.

## Product metadata improvements and catalogue audit (2026-10-18)

- Completed a read-only audit of all 104 current sitemap product records. Saved the records and a review summary under `docs/seo-catalogue-audit-2026-10-18.*`; missing fields are flags, not automatic corrections. Preserved the store's edition facts, including its Amol Books Productive Muslim edition. Flagged 97 absent ISBNs and four ambiguous comma-separated ISBN lists for factual review; no catalogue writes or competitor metadata copies.
- Titles: useful custom SEO titles remain intact; name-only/default titles gain available English-name/author context. Remove an existing trailing Amolbooks suffix before adding one final suffix. Title synchronization and GA4 encoding remain unchanged.
- Descriptions/content: keep concise custom descriptions, shorten long values on sentence/word boundaries, and retain the complete stored book summary in initial HTML and JSON-LD. HTML/JSON output escapes untrusted content.
- Book schema: emit stored publisher, bookEdition, language codes and positive integer page counts; validate single ISBN checksums and omit uncertain/invalid values. Ratings are derived from this product's approved 1–5 reviews instead of stale cached averages; add a supporting review lookup index and show the same aggregate in initial HTML.
- Crawlable links: author detail routes and existing publisher/category filter URLs, catalogue navigation, and up to four published books matching stored authors/categories, sorted by recorded sales. Existing canonical URL, stock and discounted-price rules are retained. Extracted the renderer to a small pure utility so these rules have focused checks; no compiled storefront/admin files were hand-edited.
- Validation: API build, focused metadata tests, actual disposable-MongoDB approval/related-product filtering tests, existing SEO renderer/HTTP tests and title/GA4 encoding regressions pass. Desktop/mobile Chrome previews using the real Productive Muslim catalogue record show the stored 2026/256-page edition, author-rich stable title, no fallback flash/overflow or JavaScript errors, and one matching GA4 page view. Lint remains blocked by the existing ignored-glob configuration.
- Prepared for the authoritative Sunday rollback branch. Production is not changed until safe pull, API rebuild and restart. Missing ISBN/edition/author corrections remain dependent on verified book facts; the notebook's absent book identifiers are not errors.

## GA4 title space-encoding correction (2026-10-18)

- Reproduced the reported literal-plus titles in a production homepage page-view request. The previous title bridge used URLSearchParams setters/serialization, turning spaces into form-encoded `+`; inspecting requests with URLSearchParams hid that defect by translating plus back into spaces during verification.
- Replaced only the raw `dt` query/body field using encodeURIComponent so spaces are `%20`, literal plus signs remain `%2B`, percent signs remain `%25`, and unrelated parameters retain their original bytes. The title authority, metadata waits and exactly-once forwarding behavior are unchanged.
- Added a failing-before/fixed-after raw percent-decoding regression assertion plus body/query checks for Bengali text, literal plus/percent characters and preservation of other fields. API build, title-sync, SEO renderer/SPA and HTTP tests pass; lint remains blocked by the existing ignored-glob configuration. Chrome response-patch previews for the live homepage and product each show exactly one intercepted GA4 page view with `%20` spaces, no literal `+`, and a percent-decoded title matching document.title. No production analytics settings were modified.
- Corrective patch is on the authoritative Sunday rollback branch; requires safe pull, API rebuild and restart. Already-recorded incorrect Analytics titles cannot be rewritten by the patch.

## Stable SEO and analytics page titles (2026-10-18)

- Continued on the authoritative Sunday rollback branch. Production investigation confirmed server-rendered descriptive titles were overwritten by Angular's shorter titles, while existing GA4 page views sometimes collected the earlier format and sometimes the later format.
- Made the current server SEO title authoritative for the rendered document and managed history routes. Angular title assignments and direct title-node changes cannot replace it once known; unsupported routes such as cart/checkout retain Angular ownership. Navigation revision checks still reject stale metadata responses.
- Existing GA4 fetch/sendBeacon page-view requests receive the authoritative title for their own URL. While route metadata is pending, those requests wait at most 1.5 seconds and then fail open; no new page-view events or retries are introduced. Purchase/unrelated requests and batched payloads are untouched. Background/page-exit beacons are not held. Encoded spaces and literal-percent book slugs match correctly.
- Validation: API build, focused title-sync checks, existing SEO renderer/SPA-race checks and real Nest HTTP checks pass. Tests cover title writes, history changes, fetch/beacon requests, exactly-once forwarding, literal-percent URLs, body/query title fields, failed/late metadata and cart title ownership. A Chrome preview patched only the browser response with the new script: homepage and product each retained one descriptive title and emitted one GA4 page view with that title; history navigation and Back retained correct titles, with no JavaScript errors. Analytics collection was intercepted during this preview. Lint remains blocked by the existing ignored-glob configuration.
- No compiled storefront/admin files were hand-edited and no production settings were changed. Deployment requires the Sunday branch safe pull, API rebuild and restart. Historical Analytics title rows remain unchanged; metadata failure/timeouts preserve existing delivery rather than dropping page views.

## SEO fallback visibility refinement (2026-10-17)

- Continued in the authoritative `codex/rollback-sunday-20260927` worktree. Current production product sampling confirms the previously deployed snippet hides the article, but that rule relies on `ng-version` timing and only matches article-shaped product content; core and package fallback shapes were uncovered.
- Moved suppression to `StorefrontDocumentService`, which wraps the exact initial server content in `#amol-seo-fallback` and includes its JavaScript-conditional hiding rule in the same response. The wrapper stays hidden regardless of early Angular attributes and disappears when Angular replaces its host contents. Without JavaScript the initial content remains readable. Metadata, canonical URLs, JSON-LD and catalogue links remain in the response.
- Removed the redundant startup GTM snippet and its registration. No API_BASE or compiled storefront/admin source changes. This supersedes the earlier product-only startup snippet.
- Validation: API build, desktop/mobile Chrome visibility tests (including early ng-version, delayed render, core/package shapes and JavaScript disabled), renderer/slug/SEO metadata/SPA tests, real Nest HTTP routing checks and diff whitespace checks pass. Lint remains blocked by the existing all-files-ignored configuration.
- Production was inspected read-only. Deploy this refinement through `AMOL_DEPLOY_BRANCH=codex/rollback-sunday-20260927 bash scripts/vps-safe-pull.sh`, rebuild API and restart `amolbooks-api`.

## SEO release completion checks (2026-10-17)

- Added private-host HTML exclusion to the reviewed nginx installer for both apisub and adminsub. Uses a content-type map so product images remain indexable, preserves server security-header inheritance, and repeats the directive only in locations already defining their own headers. Private robots responses permit recrawling and stop advertising the old API sitemap. All three virtual hosts are prepared and backed up before modification; failed validation/reload restores all originals.
- Preserved ordinary trailing-slash product/package URLs while retaining exact database slugs containing a slash. Added a real isolated Nest HTTP check proving prefix/version-neutral routing, the root document endpoint, encoded percent/slash decoding and real missing-book 404 responses, without a database.
- Expanded live verification with `--private` for API/admin HTML, robots directives and a representative public book cover. Updated deployment instructions for the complete installer.
- Release verification: API build passes; API lint remains blocked by the existing ignored glob. Renderer/SPA metadata, real Nest HTTP, nginx inheritance/idempotence/rollback preparation checks pass. Both supplied production private-host configurations pass the installer checks. Read-only release preview using the live catalogue and metadata endpoints passes 113 checks covering sitemap/core HTML and all 103 books/four packages. The first preview run encountered intermittent upstream 404s; a complete repeat passed without a code change. This preview does not confirm production deployment or Google's indexing decision. All unrelated compiled/source changes remain uncommitted.

## Search Console canonical/indexing repair (2026-10-17)

- Worked in the authoritative Sunday rollback checkout on `codex/rollback-sunday-20260927`. Read the signed-in Search Console property: the homepage is excluded as an alternate declaring `https://apisub.amolbooks.com/`; the last stored crawl of `tinii-amar-rob-2-98` was August 31 with a homepage canonical and Google selecting `poro-3-85` as canonical. This is evidence of duplicate-page signals, not proof of a penalty. Google's live book test now reports available/indexable with valid Product/Merchant/Breadcrumb items; its indexing request was accepted into the priority crawl queue.
- Audited all 115 live sitemap URLs: 103 products, four packages and eight core pages. Two product links fail (a literal percent and a slash embedded in stored slugs); core and package URLs still inherit the homepage canonical. Encoded both product path components correctly in the sitemap, preserving the exact database slug rather than renaming products.
- Added a server-rendered document endpoint that reuses existing product/package renderers and the existing Angular shell, replaces conflicting metadata, and inserts real initial content inside app-root. Visitors and crawlers receive the same document; Angular boots normally. Homepage and book listing provide crawlable links to every published book. Metadata refreshes on Angular history navigation, clears stale Product data on unrelated routes, and ignores stale fetch responses. Missing product/package responses preserve real HTTP errors/noindex. No compiled storefront/admin files were manually edited.
- Replaced the crawler-only nginx example with same-document routes and a backed-up installer tested against the supplied active virtual host. Retains existing SSL, uploads, feed and generic fallback; includes IPv6 listeners to stop the legacy uisub host winning IPv6 routing. Validates before reload and restores the original on failure. Node 18+ live check now detects malformed sitemap escaping, visitor canonical/content errors, and optionally all detail URLs (`--all`).
- Verification: API build passes (existing TypeScript deprecation warnings); document/slug/404/escaping/SPA metadata race checks and nginx merge/idempotence/ambiguity checks pass. Browser preview boots the native book page with image, price, stock, Buy Now and Add to Cart. Lint remains blocked by the repository's ignored-glob configuration. Initial bot-only repair is live; this broader repair still needs API rebuild/restart plus the reviewed nginx installer and Cloudflare HTML cache purge. Direct SSH authentication is unavailable and the computer-use tool refuses Terminal access.

## Public SEO routing diagnosis (2026-10-17)

- Confirmed the live API already returns canonical storefront sitemap URLs and product-specific HTML for `tinii-amar-rob-2-98`, including Bengali/English title and BDT Product structured data. The public `www` host still serves the 2024 API-host sitemap and homepage metadata/canonical to Googlebot. The production nginx routing is the remaining blocker; no catalogue/database edits are needed.
- Added `scripts/check-live-seo.cjs`, a read-only check for public robots, canonical sitemap/book inclusion, crawler title/heading/canonical and Product offers. All three checks pass against the live API routes; all three fail against the public storefront, reproducing the incident.
- Added User-Agent cache variation to the existing nginx example and an operational runbook in `scripts/SEO_DEPLOY.md`. No compiled storefront/admin files were edited. Production SSH host/user requested because no SSH alias is configured; nginx changes remain pending access. Search Console is already configured and the sitemap submitted (43 discovered pages); reprocessing and book URL inspection remain pending the live fix.
- Validation: API build passes; focused diff whitespace checks pass. Lint remains blocked by the existing all-files-ignored configuration.

## Matching compact purchase bar (2026-10-08)

- Mobile sticky Buy Now/Add to Cart bar uses the same 52px base height as bottom navigation, with 44px buttons and device safe-area padding. API_BASE unchanged.

## Shorter mobile bottom navigation (2026-10-08)

- Reduced bottom navigation padding, SVG icons and label size below 768px. Retains 44px minimum tap targets and device bottom safe-area padding. Verified at 465px: bar height reduced from about 66px to 52px. Product snippet checks pass. API_BASE unchanged.

## Three-line author preview (2026-10-08)

- Collapsed author biography now clamps to three lines on desktop and mobile. Existing see-more/less control reveals the full biography; book summary behavior and API_BASE unchanged.

## Compact mobile reviews and embedded stars (2026-10-08)

- Shared desktop card styling with mobile: inline name/verification, tighter body spacing, 12px card gap and reduced mobile padding. Review ratings and verification stars now use inline SVG instead of the Font Awesome font; five-star scores retain filled/outline states. API_BASE unchanged. Verified at 492px: first two cards are 240px/128px tall with 12px gaps and five embedded SVG stars each. Focused checks and API build pass; lint remains blocked by the existing ignored-files configuration.

## Compact desktop product cards (2026-10-08)

- Desktop delivery estimate now uses a 460px maximum width, smaller truck icon and tighter padding/type; still shrinks within its parent.
- Desktop reviews use a centered 920px reading width, tighter card spacing, inline name/verification, smaller stars and thumbnails, and a subtle green-tinted surface. Verified at 1456px and 492px: desktop delivery width is 460px and first review height is 226px; mobile retains its existing spacing. Snippet checks/API build pass; lint remains blocked by existing ignored-files configuration. Mobile styles are unchanged. API_BASE remains https://apisub.amolbooks.com/api.

# CURRENT_WORK

## Security fixes on authoritative Sunday branch (2026-10-17)

- Applied only the admin signup, password recovery and startup-flash changes from the mistakenly pushed release-branch commit. No release-branch merge or unrelated changes. All further work must use this Sunday rollback worktree and `codex/rollback-sunday-20260927` as required by AGENTS.md. Deploy using `AMOL_DEPLOY_BRANCH=codex/rollback-sunday-20260927 bash scripts/vps-safe-pull.sh`, then rebuild in `api/` and restart `amolbooks-api`.

## Product startup SEO-content flash (2026-10-17)

- Confirmed a normal desktop request to the production Quran product page returns the plain SEO `<main><article>` inside `<app-root>`, including the large cover and order link seen in the screenshot. It paints before Angular replaces the root contents; the observed transition does not itself imply a second navigation. The production response does not include the local password-reset bridge, so that bridge cannot cause the production flash.
- Added `gtm-snippets/product-startup-fallback.html` to the existing before-Angular snippet injection. A JavaScript-added document class hides only the direct fallback article while `app-root` lacks Angular's `ng-version`; normal Angular content and no-JavaScript fallback content stay visible. No API_BASE is used (presentation only); compiled storefront/admin files are untouched.
- Validation: `scripts/check-product-startup-fallback.cjs` reproduces the unpatched article visibility and verifies suppression during startup at 375/1440px in Chrome, normal visibility after Angular bootstrap, and readable fallback with JavaScript disabled. API build and `git diff --check` pass; lint remains blocked by the existing all-files-ignored configuration.
- Not deployed. Deploy the snippet and API injection change together using `scripts/vps-safe-pull.sh`, rebuild and restart the API. Production HTML was inspected read-only; the stopped localhost:3117 preview could not be inspected directly.


## Password reset verification (2026-10-17)

- `PUT /api/user/reset-user-password` now requires a username and a backend-issued reset token. Successful phone/email OTP verification returns a cryptographically random, account-bound token with a five-minute expiry. Only its SHA-256 hash is stored; an atomic MongoDB update consumes it before the password is changed, preventing replay and concurrent reuse. Invalid password/username input is rejected before token consumption.
- OTP verification consumes each valid code once and permits at most five guesses per issued code. Codes use cryptographic randomness and are no longer printed to logs. Resending an OTP resets attempts and invalidates earlier reset tokens. Added endpoint throttles for generation, verification and password reset. Existing OTP records work without a data migration.
- Added `gtm-snippets/password-reset-security.html`, injected before Angular by the existing storefront mechanism. Carries the verification response token into the compiled form's reset request, scoped to API origin and username and held only in memory. Production API base is `https://apisub.amolbooks.com/api`; localhost uses its origin, with compatibility for the compiled bundle's production API calls. No compiled storefront/admin files were hand-edited.
- Validation: API build, `node scripts/check-password-reset-security.cjs`, `node scripts/check-admin-signup-security.cjs` and `git diff --check` pass. Password-reset checks launch their own disposable MongoDB and isolated HTTP app; cover missing/invalid/expired/replayed tokens, wrong-account tokens, concurrent reset/OTP verification, OTP expiry/attempt limits/resends, phone/email recovery, legacy records, validation, bcrypt hashing and the storefront bridge. A separate headless Chrome check confirms the real XHR event handoff for phone and email with mock responses. No real SMS/email or production database writes. Lint remains blocked by the existing all-files-ignored ESLint configuration.
- Not deployed. Deploy backend and snippet together through `scripts/vps-safe-pull.sh`, rebuild API and restart. Already-open recovery pages must reload to receive the bridge. If password persistence fails after token consumption, the customer must request a fresh OTP. Other audit findings remain outside this fix.


## Admin signup security (2026-10-17)

- Protected `POST /api/admin/signup` with admin JWT authentication followed by the existing Super Admin role guard. Anonymous callers and every other staff role are denied before the signup service runs.
- Added route-local DTO whitelisting and an explicit persistence allowlist. Server-owned IDs, read-only flags and timestamps cannot be supplied through signup; passwords remain bcrypt-hashed. Preserved the compiled admin form's email, phone and boolean access toggle with validation; access defaults to enabled when omitted by an authorized Super Admin.
- Verification: `node scripts/check-admin-signup-security.cjs` passes using an isolated HTTP app, real JWT/role guards and fake persistence (no database writes). Covers missing/invalid/expired tokens, all denied staff roles, permitted Super Admin creation, invalid role/access/email, field injection and password hashing. API build and `git diff --check` pass. `npm run lint` remains blocked by the existing all-files-ignored ESLint configuration.
- Not deployed. Deploy via `scripts/vps-safe-pull.sh`, rebuild the API and restart its process. Existing accounts are unchanged; review administrator accounts separately for unexpected registrations. Other security findings from the audit remain outside this fix.




## Converted review image URL repair (2026-10-08)

- Confirmed the reported review stores a JPEG URL returning 404 while its corresponding WebP returns 200 image/webp. Converted v2 uploads now return the actual WebP filename alongside their URL.
- Review upload bridge maps legacy filenames to the returned URL before submission; preview/review images retry the converted WebP when an old JPEG/PNG path fails. Gallery links follow the recovered image. No review content or uploaded files are deleted; production API remains https://apisub.amolbooks.com/api.

- Verification: local converted upload returns a matching WebP filename and serves image/webp; browser confirms the existing review thumbnail and enlarged photo load (300px). Focused snippet checks and API build pass. API lint remains blocked by the existing all-files-ignored ESLint configuration. No test review was published.

## Show more reviews (2026-10-08)

- Replaced numbered review pages with Show more reviews. Starts with five, reveals five more beneath the existing reviews per click, and hides the button when all reviews are visible. New product routes reset to five; profile photos remain hidden and review attachments/replies stay available. API_BASE unchanged. Local browser verifies 5 → 10 → 15 → 18 visible reviews and the button disappearing at the end; focused checks pass. Lint remains blocked by the existing ignored-glob configuration.

## Product delivery date estimate (2026-10-08)

- Desktop/tablet uses slightly larger text, icon and padding; the card follows its product column width with wrapping text.
- Reduced the estimate card padding, truck icon and text spacing for a compact layout.
- Added a bordered সম্ভাব্য ডেলিভারি card immediately below the product price with an inline truck icon and Bengali date/weekday lines matching the supplied reference. Uses 2 calendar days inside Dhaka and 4 outside, based on Bangladesh time, refreshing as the date changes. Out-of-stock products omit the estimate. Browser verification confirms expected October 10/12 dates and no mobile overflow; date tests cover Dhaka midnight/year rollover and API build passes. Lint remains blocked by the existing ignored-glob configuration. No holiday/cutoff rules or API changes; existing production API_BASE remains https://apisub.amolbooks.com/api.

## Reset-password placeholder (2026-10-08)

- Set the reset-password mobile field placeholder to আপনার মোবাইল নম্বর দিন through the existing auth snippet. Input handling and API routing remain unchanged.

## Google sign-in temporarily hidden (2026-10-08)

- Hide the Google/Gmail sign-in option and adjacent অথবা divider on customer login and registration through the existing google-auth GTM snippet. Password login and registration remain available; the existing identity loader remains compatible with compiled auth components. No API_BASE changes. Local browser confirms Google and divider hidden with password login visible; API build passes. Lint remains blocked by the existing ignored-glob configuration.

## Immediate product rating stars (2026-10-08)

- Replaced product-heading rating star glyphs with embedded SVG backgrounds in the existing GTM snippet, removing their dependency on the Font Awesome download. Full, half and empty stars retain their original state; score and review counts remain unchanged. API_BASE routing is unchanged. Local browser confirms all five stars use embedded SVG and suppress font glyphs; focused checks pass. Lint remains blocked by the existing ignored-glob configuration.

## Collapsible author biography (2026-10-08)

- The author toggle spans the card grid and keeps its label on one line.
- Reused the summary expand/collapse control for long author biographies in the product-detail GTM snippet. Descriptions start at a 14rem preview with আরও দেখুন / কম দেখুন and accessible expanded state; short biographies remain fully visible. Local browser expand/collapse, product-detail checks and API build pass; lint remains blocked by the existing ignored-glob configuration. API routing stays unchanged (production https://apisub.amolbooks.com/api).

## Review pagination rendering correction (2026-10-08)

- Live browser inspection revealed Angular hardcodes `allReviews.slice(0,5)`, so fetching all reviews alone left five DOM cards and an empty pager. The snippet now builds the complete list from approved API records using the native card template, hides the truncated native list, and paginates the injected cards. Review text/names/replies use safe text insertion; review attachments remain supported.
- Browser fixture reproducing five native cards plus 18 API records confirms four numbered buttons, five reviews on page 1, and reviews 16–18 after clicking page 4. Focused checks and API build pass; lint remains blocked by the existing ignored-glob configuration. Production deployment remains pending.

## Review pagination (2026-10-08)

- Load all approved product reviews and show five native cards per page with numbered controls; hide reviewer profile photos while preserving review attachments and replies. Homepage queries remain unchanged.
- Production review API remains https://apisub.amolbooks.com/api. Focused reliability and 18-review pagination checks pass; rebuild the API on the VPS before restarting to avoid stale compiled Customer Manager dependencies.

## Customer delivery ratio and purchased-book search (2026-10-06)

- Added each customer's delivered/total recorded order ratio and percentage to the customer table and details panel. Total includes pending, cancelled, refunded, returned and partial orders; spending, purchased-book filters, dates, addresses and delivered-history eligibility remain based on delivered orders. Order creation refreshes the ratio after success.
- Added a protected purchased-title search endpoint and suggestions as staff type in the Purchased book/package filter. Suggestions are deduplicated from delivered-order snapshots, including titles no longer in the catalog; selecting/typing a title and applying filters narrows the customer list. Sales Man access is retained.
- Verification: API build and isolated MongoDB/HTTP/browser checks pass, including normalized phone grouping with 3 delivered out of 8 recorded orders, unchanged delivered-only totals, saved order creation, title suggestions, filter/reset behavior and responsive layouts. Lint remains blocked by the existing all-files-ignored configuration. Production API base remains `https://apisub.amolbooks.com`.

## Customer Manager seven-day filter (2026-10-06)

- Added “Over 7 days ago” to Last purchase, using the existing server-side days filter. Production API base remains `https://apisub.amolbooks.com`. API build, served-page verification and whitespace checks pass; lint remains blocked by the existing all-files-ignored configuration.

## Customer Manager repeat orders and follow-up totals (2026-10-06)

- Added customer address/city to the customer list and details drawer, taken from the latest delivered order, plus a Create Order dialog prefilled with name, normalized phone, email, address, city, payment type and previous delivery charge. Staff can review/edit delivery details, search the real catalog, add products and quantities, and create the order without re-entering customer information.
- Added protected Sales Man/Admin/Super Admin catalog-search and order-creation endpoints. The new flow reuses the existing catalog-priced manual-order service and normal Order collection, so created orders appear as unpaid/Pending in Amolbooks Orders with the existing stock, invoice and background processing. Phone/WhatsApp source is preserved; the existing AI flow keeps its WhatsApp default.
- Server-side validation rejects missing addresses, empty/invalid items, quantities and delivery charges; client prices/status/customer phone cannot override the server values. Each draft has an idempotent request ID and locked submission controls to prevent duplicate orders on retries.
- Added a clickable Customers followed up summary and Already followed up filter. Counts unique delivered customers with at least one saved contact log, including no-answer attempts and opted-out customers; repeated contact logs count once. Order creation does not automatically log a follow-up. Contact history remains explicit.
- Verification: API build and isolated MongoDB/HTTP/browser checks pass, including Sales Man creation and denied roles, saved-address prefill, current catalog discounts, order persistence in the real schema, pending/unpaid status, stock and sales-counter changes only once on retry, follow-up counts, and dialog layouts at 320/390/768/1440px. Lint is still blocked by the existing all-files-ignored configuration. No real customer orders or external messages were created during testing.
- Local dev server now runs from the authoritative Sunday rollback worktree on port 3000. Production API base remains `https://apisub.amolbooks.com`; localhost uses its own origin. Deployment requires a safe pull, API build and process restart.

## Customer Manager (2026-10-06)

- Added the purple Customer Manager design as a tracked custom page at `gtm-snippets/customer-manager.html`, served at `/upload/static/customer-manager.html`; the existing order sidebar receives its link at response time. Runtime uploads and compiled admin/storefront files are not edited.
- Added a focused NestJS module with protected, paginated customer summaries, delivered order history and persistent contact logs. Super Admin, Admin and Sales Man can read and save; unauthenticated users and unrelated roles are denied. Staff identity comes from the verified JWT.
- Groups Bangladesh phone variants (including Bengali digits and international prefixes) into one customer; excludes invalid phones, pending/cancelled/refunded/returned/partial deliveries. Filters include books/packages, category snapshots with current-catalog fallback, total spending, individual order value, purchase age, frequency and contact status.
- Provides Call/WhatsApp actions, editable Bengali templates, outcome/channel/notes and optional follow-up dates in Asia/Dhaka. Opening WhatsApp does not send or log automatically. Don't-contact customers are excluded from outreach lists and their contact actions are disabled.
- Page uses existing `co_admin_token` login and production API base `https://apisub.amolbooks.com`; localhost uses its own origin. No external messages were sent.
- Validation: API build and isolated MongoDB/HTTP checks pass for grouping, delivered-only totals, filters, pagination, contact persistence, input validation, opt-out, authenticated staff attribution and allowed/denied roles. Browser checks cover Sales Man visibility, safe text rendering, contact save/history, filter/reset interactions, and 320/390/768/1024/1440px layouts without document overflow. Lint remains blocked by the existing all-files-ignored ESLint configuration.
- Deployment pending: use `scripts/vps-safe-pull.sh`, rebuild the API and restart its process. The page source stays outside `api/upload`, so the safe pull includes it. No new dependency or data migration is required.

## FraudSpy key rotation (2026-10-06)

- Replaced the FraudSpy fallback API key in backend configuration and its tracked compiled output; preserved the existing FRAUDSPY_API_KEY environment override. No key is included in this log.
- Verification: API build and diff whitespace check pass. Lint remains blocked by the existing all-files-ignored ESLint configuration.

## Cart quantity display and gift stability (2026-10-05)

- Synchronize native quantity inputs from saved guest/authenticated cart quantities; keep decrement disabled at one.
- Preserve the gift row during local paid-row rebuilds and avoid resetting its image source on every repair. Use complete cart product data for gift eligibility instead of transient Angular totals.
- Verification: quantity increase/decrease and minimum-one regression checks, gift repair assertions, API build, and diff whitespace check pass. Lint remains blocked by the existing all-files-ignored configuration. The available browser cart is empty, so the populated production flow remains unverified.

## Reliable one-tap cart removal (2026-10-05)

- Push verification: cart-state regression check, API build, and diff whitespace check passed; lint remains blocked by the existing all-files-ignored ESLint configuration. Package loading and popup delay were investigated only; no performance fix is included.

- Attached native Angular cart rows, including special-package rows, to the same product-ID-based cart operation handler used by injected rows. The complete 44px trash control now owns the action instead of relying on a click landing on the icon glyph.
- Kept the row locked with immediate visual feedback until the guest or authenticated cart update and UI synchronization finish, preventing missed taps and duplicate requests on slower production connections.
- Prevented the legacy cart migration key from being merged more than once per page; it can no longer restore the final removed product before the page unloads.
- Invalidated in-flight cart hydration and repair requests whenever cart storage changes, preventing an older product fetch from redrawing the final item milliseconds after it was removed.
- Added focused regression checks for native remove ownership, awaited authenticated updates, and confirmed single-tap row removal in the local mobile cart.

## Production cart controls and gift threshold (2026-10-05)

- Applied the horizontal quantity selector and inline SVG remove icon directly to every native cart row, without waiting for a catalogue-name match. The mobile native row now reserves the selector's full three-column width so the minus control cannot be clipped by Angular's flex layout.
- Fixed free-notebook eligibility to parse the isolated cart-summary value. A ৳310 total followed by a title beginning with `500` can no longer be misread as ৳310,500; the notebook is shown only when the subtotal reaches the configured ৳799 threshold.
- Added focused regression checks for native control enhancement and isolated subtotal parsing.

## Special-package cart confirmation restored (2026-10-05)

- Restored the shared product-style cart confirmation dialog after a customer selects `Add to Cart` on a special-package detail page.
- Kept the obsolete legacy cart toast suppressed; the visible dialog now offers both “আরও বই কিনুন” and “অর্ডার সম্পন্ন করতে কার্টে যান”, with the latter opening the cart containing the package.
- Updated the tracked generated storefront asset and its cache-busting hash so the fix is included in the next deployment.
- Verification: the focused special-package browser check confirms the full-width mobile action, visible confirmation dialog, cart navigation, package cart row and total, and Buy Now checkout flow.

## Production cart quantity selector parity (2026-10-05)

- Kept the current localhost cart selector unchanged and applied its compact horizontal `− / quantity / +` presentation to the published Angular cart control on mobile.
- Preserved Angular's native increment/decrement handlers in production; the patch only marks and styles the existing control, including the disabled minimum-quantity state.
- Replaced the production control's Font Awesome plus/minus glyph dependency with immediate CSS text glyphs, preventing the old vertical selector and slow-loading icons from reappearing.
- Updated both the source injection and tracked generated storefront asset. The content-hashed script URL changed from `f19b504a42d8` to `b782a7699539`, so the next safe deployment fetches the new selector instead of using the year-long cached production asset.
- Verification: API build and focused product/cart state checks pass. Local mobile browser verification confirms the existing selector remains a 136px horizontal three-column control with 44px targets and the order `−`, quantity, `+`; `/cart` responds with HTTP 200.

## Special-package SEO repair (2026-10-04)

- Added crawler-rendered HTML for every `/special-package-details/:id` page with a package-specific title, description, canonical URL, Open Graph/Twitter image, real image dimensions, offer price, and semantic package contents instead of inheriting the homepage metadata.
- Added Product/Offer and BreadcrumbList JSON-LD using the package's live price, image, and included books; invalid or missing package IDs return a real `404` with `noindex`.
- Added the offers index and package detail URLs (including offer artwork) to the dynamic sitemap.
- Extended the nginx crawler-routing example so search/social crawlers reach the package metadata endpoint while normal customers continue to receive the Angular page.
- Kept the localhost published-catalogue proxy intact while allowing the new local SEO endpoint to reach Nest directly.
- Verification: `npm run build` passes; focused response assertions confirm the exact package canonical/`og:url`, 1170×658 image metadata, BDT offer price, and Product/Offer/Breadcrumb structured data. Local Atlas does not contain the referenced production package, so a live local request correctly returns `404 noindex`; the renderer was verified with the same production package fields. The repository's existing lint command remains blocked because its configured glob ignores every matching file.

## Special-package conversion redesign (2026-10-01)

- Reworked the deployed rollback branch's offer detail page around the real package saving, offer price, included-book artwork, and immediate purchase actions while preserving the native package cart and checkout handlers.
- Added an API-backed related-offers shelf that excludes the current package and uses real package/product artwork and pricing.
- Added a localhost-only, read-only special-package catalogue proxy so the rollback preview uses published package data without cross-origin failures.
- Replaced the `/offers` carousel below 768px with a full-width stacked offer list while preserving the desktop carousel and every offer link.
- Replaced the package page's inert native-click simulation with the same shared cart storage/API, badge refresh, and checkout pipeline used by product-page actions; both hero and lower controls now read `Add to Cart` and `Buy Now`.
- Fixed cart hydration for package-only and mixed carts: package entries now load their published name, artwork, offer price, quantity, and line total instead of being discarded by the product-only renderer. Guest and authenticated quantity/remove matching now recognizes package IDs too.
- Kept compiled Angular source untouched: all changes remain in the API-served storefront injections.
- Verification: API build, focused redesign check, product cart-state check, and isolated browser purchase check pass. The browser check clicks `Add to Cart`, confirms a valid package cart entry, clicks `Buy Now`, and reaches checkout with the package preserved. Responsive checks confirm vertically stacked offers at 320/375/414px and the carousel retained at 768px. The existing lint command remains blocked because the repository ESLint configuration ignores every file matched by its configured glob.

## Authoritative deployed baseline (2026-10-01)

- All new work must use this Sunday rollback worktree on `codex/rollback-sunday-20260927`.
- Do not continue development from `codex/prod-release-20260926`; that branch is considered corrupted.
- The previous checkout's uncommitted offer-page work remains preserved there but is not part of this deployed baseline and must not be copied automatically.

## Customer and bundle insights (2026-09-30)

- Added a protected `GET /api/order/customer-bundle-insights` report using existing order data only.
- Added an admin sidebar section listing repeat customers, complete multi-item basket patterns, and the top repeated 3–4 book combinations from the last 90 days as advertising bundle suggestions.
- Customer phone numbers are normalized before grouping; cancelled, refunded, returned, and held/trash orders are excluded.
- Added a manual bundle calculator using current product sale/cost prices, proposed bundle price, ad cost, fulfilment cost, and a configurable target margin. Missing cost prices block the viability result instead of being treated as zero.
- The calculator can save its selected books, quantities, name, and selling price as an inactive Special Package draft. The protected endpoint recalculates prices server-side and rejects duplicate/missing books or a price above the current discounted total; publishing remains a separate admin action.
- Bundle calculations use the storefront's effective discounted price (including stored final prices) and display the original price only as a comparison.
- Insights remain read-only until an admin explicitly uses the calculator's Save bundle as draft action; saving does not change orders or product records.

## Product-search SEO repair (2026-09-27)

- Audited live Amolbooks product discovery against Rokomari and Wafilife. The public Amolbooks sitemap was a static 2024 file pointing at `apisub.amolbooks.com`, while the dynamic sitemap used the placeholder `your-domain.com`; Googlebot also received the generic homepage metadata on every product URL. Rokomari and Wafilife both expose current product sitemaps and crawlable, product-specific HTML.
- Rebuilt the dynamic sitemap around the canonical `https://www.amolbooks.com` host, limited it to published products, added real product modification dates and cover images, removed private/checkout URLs, and corrected blog detail links to the ID-based route used by the storefront.
- Expanded the crawler product response with a unique Bengali-aware title and description, author, publisher, cover, final price, stock state, ISBN/page details when available, canonical/Open Graph/Twitter metadata, and Product + Book + Breadcrumb JSON-LD. Missing or unpublished products now return a real 404 with `noindex`.
- Added a generated `robots.txt` endpoint that allows the storefront, blocks transactional/account paths, and advertises the canonical public sitemap.
- Updated the nginx SEO example to proxy public `robots.txt` and `sitemap.xml` to their live API endpoints and to send Google, Bing, DuckDuckGo, Apple, social, and inspection crawlers to the product-specific HTML endpoint.
- Verification: `npm run build` passes. Local endpoint checks confirm canonical `www` product URLs, no placeholder/API product hosts, parsed JSON-LD with BDT offers and availability, published-only sitemap entries, and the expected robots directives. Production still requires deploying the API build and applying the documented nginx locations before crawlers can see the changes.

## Production release reconciliation (2026-09-26)

- Preserved the complete pre-release working tree on `codex/prod-release-snapshot-20260926`, then replayed it onto the current `origin/main` on `codex/prod-release-20260926` so upstream fixes remain intact.
- Resolved the storefront/API conflicts in favor of database-driven offer configuration, current upstream route removals, and the intended GTM/generated storefront enhancements. The free-notebook threshold remains ৳799 in the seed/configuration path rather than a second hardcoded order fallback.
- Restored the generated product-section and special-package assets, fixed dynamic brand replacement under continuous DOM updates, and removed the deleted recommendations endpoint dependency.
- Restricted preview catalogue proxies to non-production localhost/private-network/tunnel hosts, added exact method/path allowlists, and added category reads to the same-origin proxy so local catalogue navigation does not depend on remote CORS behavior. `PRODUCTION_BUILD=true` rejects the proxy even when a request forges `Host: localhost`.
- Fixed local cart hydration for multiple products by routing the existing `get-products-by-ids` catalogue request through the exact same-origin preview allowlist and allowing valid package-type cart entries to hydrate like other products. Cart rows and the total item count now agree; the browser regression check adds four homepage products, marks one as package-type, and verifies four rendered cart rows.
- Restored product-page Add to Cart measurement for the injected cart path, which bypasses Angular's original XHR tracker. Successful product-page adds now push one standard `add_to_cart` event and its deduplicated `add_to_cart_stape` mirror with the product ID, discounted price, quantity, value, and BDT currency; homepage tracking remains on its existing path without double-counting.
- Restored cart-page measurement for direct loads and hard redirects. Once the saved cart is hydrated, the page now pushes one standard `view_cart` event and its deduplicated `view_cart_stape` mirror with the current BDT total, product IDs, names, prices, and quantities.
- Kept the checkout Discount row hidden on mobile by preventing the compact summary's later `display: flex` rule from overriding the existing hidden-row state; totals and coupon calculations are unchanged.
- Reused the incomplete-order editor for actual orders in the custom order page. Each actual-order row now has a responsive Edit action for customer details, products, quantities, prices, delivery charge, payment type, and notes; saving uses an admin-authenticated endpoint, preserves payment status and cost snapshots, and reconciles tracked stock for active stock-accounted orders.
- Added WhatsApp actions to incomplete and actual order rows. Each action normalizes the customer phone number and opens WhatsApp with distinct Bengali copy for recovering an abandoned checkout or confirming a received order, including the order number and ordered book names (plus multi-copy quantities) when available.
- Fixed desktop header search suggestions by giving the injected results their own desktop layout rules; book covers remain compact instead of inheriting the storefront's global full-width image style.
- Moved the mobile delivery-charge selector before Checkout Summary while preserving the original Angular radio controls, shipping calculation, and desktop payment-card layout.
- Hardened `scripts/vps-safe-pull.sh` around an explicit deployed Git ref, exact added/modified/deleted path snapshots, runtime-data exclusions, dry-run inspection, recovery of every missing tracked API/storefront build file, and a tested rollback path. `scripts/backup-now.sh` now requires credentials through environment variables and transfers the database password in a temporary mode-600 `mongodump --config` file instead of command arguments or remote shell source.
- Verification: API build passes; all focused storefront checks pass using the Codex bundled Node/Playwright runtime (`NODE_PATH=/Users/sifatulalamshohan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/sifatulalamshohan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/check-<name>.cjs`); the VPS deploy/rollback simulation passes, restores an unchanged compiled API file, and preserves uploaded files. The existing lint command remains blocked because the repository ESLint configuration ignores every file matched by its configured glob.

## Post-revert GTM loader repair (2026-08-31)

- Restored the storefront GTM loader after the broad August 31 revert exposed
  the old dead Stape host (`load.server.amolbooks.com`). The static storefront
  shell now loads `GTM-NNZV54QJ` from the working Tagioo endpoint
  (`server.amolbooks.com/tagioo-loader`) without the old 10-second delay.

## Email and Google account access (2026-09-11)

- Restored the missing Google Identity Services library required by the compiled login and registration components, so their Gmail action can initialize instead of remaining an inert link.
- Clarified that the standard username field accepts either a mobile number or an email address, and added keyboard/button semantics to the Gmail action.
- Set Google-compatible referrer and popup isolation headers while preserving the remaining Helmet protections.

## Authenticated checkout recovery (2026-09-10)

- Suppressed the legacy add-to-cart toast while a guest cart is being attached to a newly logged-in account, so login no longer looks like a fresh add-to-cart action.
- Made checkout explicitly load saved addresses for authenticated users, select the default address, populate every checkout field, and select the matching Dhaka/outside-Dhaka delivery option.
- Kept authenticated saved-address delivery at the configured base rates (currently ৳60/৳75), matching guest checkout instead of applying an incorrect ৳100 weight tier.
- Replaced the checkout patch's dependency on Angular's development-only `__ngContext__` with an early authorization bridge and authenticated address request, so production builds populate the saved street address as well as name and phone.
- Made the local login cart reconcile the authenticated API cart to the guest cart once, removing stale account lines and correcting quantities before checkout. This keeps the account badge, checkout products, and weight-based delivery calculation on the same cart and prevents the temporary multi-product/৳100 state.
- Prevented the legacy review-photo matcher from treating a saved-address customer name as a review card, and remove any already-injected review image from checkout without affecting product-page reviews.

## Customer account mobile navigation (2026-09-10)

- Replaced the oversized mobile account drawer with a compact account identity bar, four high-frequency quick actions, and an accessible bottom-sheet menu covering profile, orders, address, notifications, wishlist, reviews, transactions, and logout.
- Preserved Angular's existing routes, address dialog, logout flow, profile data, and desktop sidebar; the enhancement is mobile-only and injected through `gtm-snippets/customer-account-mobile.html`.
- Added 44px touch targets, visible keyboard focus, Escape/backdrop dismissal, current-section labels, responsive checks at 320/375/414/768px, and reduced-motion handling.
- Fixed Address and Logout as real buttons instead of `href="#"` links, preventing the storefront tap handler from sending Address to the homepage. Strengthened native-sidebar hiding and avatar sizing so account imagery cannot stretch or misalign the compact header.
- Repaired new-address persistence by pushing only the created address ID into the user's address list and validating the storefront's actual address fields.
- Added a checkout saved-address selector that prefers the default address and fills the complete checkout form (name, phone, division, area, zone, street address, and address type); customers can switch addresses with one tap.
- Centered the mobile account menu in the viewport and constrained its height with an independently scrolling action grid, keeping every native account action reachable on short screens.

## Sales-focused homepage preview (2026-09-08)

- Added a homepage-only curated catalogue preview through `gtm-snippets/homepage-redesign.html`; the compiled Angular storefront remains untouched.
- Revised the preview to preserve the storefront's original header, white canvas, Hind Siliguri typography, red shelf accents, green prices, card proportions, and compact horizontal mobile shelves. Removed the custom hero and duplicate search.
- Starts with “জনপ্রিয়তার শীর্ষে”, followed by bestseller combos and eight requested topic shelves. “আপনার প্রয়োজন অনুযায়ী” now appears after the first five shelves.
- Added the diagonal “একটু পড়ে দেখুন” badge to product-link covers site-wide. Product cards also show orange stars and rating totals when stored ratings exist.
- Excluded the product page's “পাঠকেরা একসাথে কিনে থাকেন” bundle from that cover badge so its compact multi-book layout stays readable.
- Excluded only the cart's free-notebook progress card from that cover badge while preserving it on normal product cards.
- Corrected the cart's “জনপ্রিয় কিছু বই দেখুন” cards to load each product's current catalogue pricing and show the discounted price, struck original price, and discount percentage.
- Changed mobile homepage shelves from one horizontal row to two, showing twice as many books before readers scroll sideways. The tablet grid remains unchanged.
- Expanded “আপনার প্রয়োজন অনুযায়ী” from 6 to 12 choices with Hadith, family, women, character, Islamic literature, and modern-fitna discovery links.
- Added a compact “আপনার জন্য কোন বই (বিশেষ ছাড়)?” mini quiz after the first two shelves. Three accessible multiple-choice questions recommend either three catalogue books or one book immediately, using the already-loaded catalogue with no extra request. Expanded the topic choices to 12.
- Reduced mobile product-card width to show more books per screen and tightened only the homepage desktop header's logo and action spacing.
- Reused the existing injected `.ab-add-cart-button` cart bridge, added GA4-style list/select/successful-add measurement plus category events, and kept `?home=legacy` as a safe visual fallback. Removed the custom loading message: the existing homepage stays visible during the first catalogue request, while a small session cache makes repeat loads immediate. SPA request guards prevent a slow response from mounting on another route. Capture-phase, per-product intent queues cover keyboard activation and overlapping cart adds without counting failed writes.
- Added portable Hallmark tokens and `scripts/check-homepage-redesign.cjs`; the rebuilt local API passes the focused check and renders without horizontal overflow at 320, 375, 414, 768, and 1440px.
- Added horizontally scrollable popular-author and popular-publisher name strips between the requested homepage shelves. Each name opens its filtered catalogue; existing author and publisher list pages remain the “সব দেখুন” destinations.
- Replaced the homepage’s legacy add-to-cart toast with the same product-aware confirmation modal used on product pages.
- Added live suggestions beneath the native header search: focus shows popular books, Bangla and English queries update after a short debounce, and each result includes cover, author, and price. Enter, Escape, and Arrow Down remain keyboard-accessible.
- Pinned “জীবন পাল্টে দেওয়ার মত ৪ টি বই”, “জীবন ও চরিত্র গঠন বান্ডেল”, and “পড়ো কালেকশন (১–৫)” to the front of the bestseller-combo shelf; automatic combo discovery fills the remaining slots.
- Applied the compact desktop header layout across every storefront route and changed desktop homepage shelves from five to six columns so more, smaller book covers fit per row.
- Added a site-wide branded “বিশেষ অফার” header ticker for the ৳799 free-notebook offer and ৳60/৳75 Dhaka/outside-Dhaka delivery charges, with an extra-wide non-collapsing break before the delivery information, edge fades, hover pause, and reduced-motion fallback.
- Reduced the desktop header logo slightly and added balanced top/bottom spacing around it; removed category/publisher separator dots on product pages and restored the missing ৳75 outside-Dhaka delivery label.
- Added a development-preview tracking kill switch: localhost and temporary `trycloudflare.com` pages block browser GTM/Google Ads, Meta Pixel, PostHog, Tagioo, tracking beacons, and `/api/gtag` calls; running the API with `AMOL_DISABLE_TRACKING=1` also disables server-side Tagioo, Meta CAPI, and PostHog delivery.
- Hardened mobile ratings/reviews: preview photo uploads now use persistent published storage, Submit waits for uploads with a 90-second escape hatch, failed review submissions retain their image URLs and show a retry message, and missing review lists retry through the storefront's actual Bengali/English review control (maximum twice).
- Fixed the product-page “বিষয়ভিত্তিক জনপ্রিয় বই” shelf on Cloudflare mobile previews by routing its catalogue load through the existing same-origin proxy and preserving the in-flight shelf across repeated SPA mount checks.
- Corrected review-photo ownership by matching each image to the exact reviewer and full review text, auto-oriented new phone uploads before WebP conversion, tightened the review dialog for iPhone-sized screens, and added a Bengali approval confirmation after successful submission.
- Fixed the remaining sideways review-photo regression: the legacy uploader bypasses the XHR send hook, and the tunnel targets an older production converter. The preview bridge now applies EXIF rotation locally, strips the orientation metadata into WebP, then sends that normalized image to persistent published storage; production v2 uploads also accept conversion parameters in the request URL.
- Review photos now open in an accessible on-page lightbox instead of navigating Safari to the raw image URL in a separate tab; the overlay closes from its 44px button, backdrop, or Escape key.
- Customer reviews now accept at most five photos across repeated picker selections; the storefront displays a Bengali limit message and the validated review DTO enforces the same maximum server-side. Review photos continue to be auto-oriented, resized to 300px wide, and converted to quality-85 WebP before persistent storage.
- Replaced the product page's author-based related rail with “এই প্রকাশনীর অন্যান্য বই”, populated from the current product's publisher and excluding the current product by both ID and slug.

## Mobile checkout duplicate item list (2026-09-08)

- Remove the temporary local checkout fallback as soon as Angular renders its native product list, preventing two mobile “মোট আইটেম” sections after slower page loads.
- Explicitly hide the desktop checkout product list below the desktop breakpoint.

## Product detail rating and summary follow-up (2026-09-07)

- Restored the native review rating layout by removing the recent compact/flat GTM overrides.
- Long product summaries now start collapsed with accessible “আরও দেখুন” / “কম দেখুন” controls.

## Storefront follow-up browser fixes (2026-09-07)

- Unified product and sticky cart actions around actual persisted product IDs, including authenticated snapshots. Bought-together actions now use the selected products’ cart presence and navigate to the cart once ready, without adding quantities again. Failed adds and removed/zero-quantity lines do not claim success.
- Removed the page-count line beneath the title, suppressed empty top rating rows, and condensed review summaries while preserving reader reviews and the Write a Review action.
- Styled mobile cart summary actions as full-width outlined/green buttons and replaced the catalogue’s missing-font `menu` text with a hamburger icon.
- Fixed intermittent localhost/LAN homepage shelves by routing only public catalogue list reads through the existing same-origin proxy before Angular starts. Direct browser requests intermittently returned nginx HTML 404 responses without CORS; proxy reads succeeded. Four real reloads consistently showed Super Deal, 13 tag sections, 17 category cards and 52 category product links, with no catalogue failures. Production routing is unchanged and unverified.
- Focused checks: `node scripts/check-product-cart-state.cjs`, `node scripts/check-product-detail-polish.cjs`, and `node scripts/check-catalogue-requests.cjs` pass. Browser checks cover compact rated/unrated reviews, working review login action, cart button styling, hamburger menu, successful add and Go To Cart navigation. API build passes; lint remains blocked by the existing all-files-ignored configuration.


## Product detail browser feedback (2026-09-07)

- Added `gtm-snippets/product-detail-polish.html`, injected by the API on storefront responses: author/category/publisher now sit inline; the extra বিবরণ section is hidden; rating/review totals appear beside the stars; popup actions stack vertically.
- Fixed the existing injected popup to prefer the Bengali product name, use `আরও বই কিনুন` / `অর্ডার সম্পন্ন করতে কার্টে যান`, and bypass the global header-menu handler so its close button works.
- Catalogue requests use the same-origin `/storefront-catalog` proxy on localhost/LAN and `https://apisub.amolbooks.com/api` in production. Static production storefronts need the new All Pages GTM tag published alongside the updated generated storefront script.
- Verified the 465px browser layout, hidden description, 8 Ratings / 8 Reviews, Bengali popup title, vertical actions, and close-button dismissal. Added `node scripts/check-product-detail-polish.cjs` for popup event isolation, correct count fields, local API routing, and duplicate prevention.
- API build and focused checks pass. Lint remains blocked by the existing configuration that ignores all matching files. No compiled storefront files were manually edited; the running server generates its injected assets.


## Cart continue-shopping action (2026-09-07)

- Changed the first in-card cart action to `আরও কিনুন` and made it open the
  homepage, while keeping the second in-card and sticky actions on checkout.
- Narrowed checkout-label updates to the real order button so the two cart
  actions no longer receive the same text.

## Free notebook threshold (2026-09-07)

- Raised the free-notebook qualifying subtotal from ৳499 to ৳799 across
  backend order fulfillment, storefront fallbacks, GTM snippets, and setup docs.

## Brand-name cleanup (2026-09-03)

- Replaced legacy customer-facing branding with Amol Books/আমল বুকস across storefront rendering, emails, SMS, invoices, catalogue links, and backend URLs.
- Preserved legacy storage keys, payment/SMS account IDs, database name, and existing email address because changing those identifiers would break customer carts or external integrations.
- Added `scripts/check-branding.cjs` to verify runtime replacement while preserving functional legacy URL/email text.

## Storefront favicon refresh (2026-09-03)

- Replaced storefront favicon and Apple touch icon with the new Amol Books artwork.
- Added standard 16px, 32px, ICO, Android 192px/512px icons and a web app manifest.

## Homepage catalogue request protection (2026-09-03)

- Cached identical product catalogue queries for 30 seconds, reducing repeated MongoDB work during reloads and fast browsing.
- Raised only the public product-list endpoint limit from 120 to 300 requests per minute; write, authentication, and other API limits remain unchanged.

## Sticky catalogue navigation (2026-09-03)

- Reproduced the catalogue fast-tap loop: the injected handler clicks its own
  intercepted bottom-nav item, preventing Angular's category drawer from opening.
- Extended the GTM navigation snippet so bottom and sticky Catalogue controls
  open the existing `/category-list` page directly. Cart routing is unchanged;
  no compiled storefront files were manually edited.

## Cart drawer disabled (2026-09-03)

- Added `gtm-snippets/cart-page-navigation.html`: header cart links now open
  `/cart`, and the old drawer (including its overlay) stays hidden, even after
  automatic cart refreshes. Add to Cart and checkout behavior are unchanged.
- API-served pages inject the same snippet without manual compiled UI edits.
  Static/nginx production pages need the All Pages GTM tag published.
- Verified desktop click/Enter, mobile tap, drawer/backdrop suppression, and
  non-cart click isolation with `scripts/check-cart-navigation.cjs` (Playwright
  from the bundled runtime). Build passes; lint is still blocked by the existing
  all-files-ignored ESLint configuration.

## Checkout page visual repair (2026-09-02)

- Fixed the desktop cart page action area: the local cart mirror now recreates
  the missing bottom summary/actions block, makes the checkout CTA a prominent
  green primary button, and hides the competing popular-products shelf on
  desktop while leaving mobile breakpoints untouched.
- Redesigned the injected checkout layout as a compact workbench: desktop now
  uses a wide content column with a sticky right-side summary, while mobile
  stays single-column without horizontal overflow.
- Restyled checkout item cards so cart products render as thumbnail rows
  instead of full-width book-cover feed blocks.
- Tightened checkout summary, promo-code, payment, delivery, and confirm-order
  controls with the existing Amolbooks green token system.
- Added a desktop fallback so the mobile item list is hidden only when a real
  right-column item list exists; otherwise products remain visible in the main
  checkout column.
- Fixed mobile LAN testing at `192.168.*` addresses: the cart/checkout bridge
  now treats private Wi-Fi IPs like local preview hosts, so phone testing uses
  the same local cart storage, catalogue proxy, cart mirror, and checkout
  mirror as `localhost`.
- Smoothed the mobile cart controls: local preview cart remove/quantity updates
  now bypass stale authenticated API state, trash icons render as real 44px
  buttons, offer Add to Cart buttons have larger touch targets, and generated
  cart rows no longer receive duplicate native author/discount text.
- Moved mobile cart trash controls beneath the book details and ignored scroll
  gestures in their fast-tap handler to prevent accidental product removal.
- Matched cart item pricing to checkout: discounted books now show the current
  price, struck original price, and discount percentage in the same styling.
- Added the live discounted cart total to desktop and mobile checkout CTAs;
  quantity and removal updates refresh the button amount immediately.
- Added a cart-page fast-tap layer for mobile Safari/Chrome: `pointerup` and
  `touchend` now claim Add to Cart, remove, and quantity controls immediately,
  while suppressing the later duplicate synthetic click.
- Hid checkout-page cart row action controls only: quantity steppers and trash
  buttons no longer display in checkout, while cart-page controls remain
  unchanged.
- Added fast-tap handling for storefront menu/navigation controls and cart
  checkout CTAs so mobile taps route on `pointerup`/`touchend` with duplicate
  click suppression and a small swipe guard.
- Reduced cart and checkout row loading waits in local/mobile preview by
  caching lightweight product details for cart items, reusing those cached
  rows across pages, de-duping repeated cart product lookups, and skipping the
  authenticated merge wait before local checkout navigation.
- Fixed checkout polish regressions: the free notebook row now falls back to
  the real published notebook cover if the offer image is missing/broken, and
  the compiled checkout summary's Discount row is hidden.
- Rejected placeholder/avatar notebook images before rendering the cart or
  checkout gift row, forcing the real Amol Notebook cover instead of the stock
  profile image.
- Corrected the notebook fallback image URL to the live
  `amolbooks-notebook-8ddd.webp` asset, rebuilt the API, and restarted the
  local server from `dist` for mobile testing.
- Synced the generated storefront `storefront-product-sections.js` asset from
  the TypeScript injection source for local preview.
- Fixed the desktop checkout item-list regression where compiled `.cart-card`
  styles overrode the row grid, causing book covers and text to stack
  vertically in the wide layout; mobile remains on the existing breakpoint.

## Free notebook cart offer cleanup (2026-08-31)

- Changed the free-notebook threshold to ৳499 across the backend gift
  evaluator, public offer response, storefront cart/checkout widget, and GTM
  snippet fallbacks so the display and order creation agree.
- Updated notebook offer copy to 72 pages and made the cart offer suggestions
  re-filter against the live cart, excluding already-added products while
  choosing in-stock ৳100-৳200 products for the three recommendation slots.
- Fixed the offer-card Add to Cart path on local storefront previews so those
  dynamic recommendations can be added from the cart-page widget.
- Linked each offer-card product image and title to its product details page so
  shoppers can inspect a suggested book before adding it.
- Corrected those product links to use real product slugs from the suggestion
  API and force normal navigation from the cart widget, avoiding blank
  id-based product pages.
- Added a local product-detail proxy for published catalogue slugs and forced
  offer-card Add to Cart updates through the guest-cart renderer in local
  previews, so recommendation links and buttons respond on the first click.
- Fixed the added-to-cart modal summary so it includes the storefront guest cart
  even when a stale login token is present, preventing the popup from showing
  `0 Item(s)` after one product is added.
- Added a clicked-product fallback in the added-to-cart popup so a cart write
  race cannot show `0 Item(s)` or `৳0` immediately after Add to Cart.
- Forced the mobile bottom-nav cart item to navigate to `/cart` on one tap for
  both guest and logged-in customers.
- Synced the added-to-cart popup against stored guest cart lines even when an
  authenticated cart snapshot exists, and removed the popup recommendation
  shelf for now.
- Took over the product-detail Add to Cart click so one tap writes through the
  storefront cart bridge instead of relying on the compiled Angular handler.
- Forced local product-detail adds through the localStorage cart path so stale
  auth tokens cannot block localhost cart testing.
- Moved localhost cart storage to an injected-only key, keeping the cart alive
  across product-page navigation when the compiled app resets its own cart key.
- Mirrored localhost cart lines into `window.name` as a same-tab fallback when
  the compiled app clears localStorage during page loads.
- Mirrored the injected localhost cart back into the compiled checkout cart key
  before checkout navigation so cart and checkout show the same products.
- Added a one-time localhost checkout reload when the compiled checkout opens
  with a stale cart snapshot.
- Also posts localhost Add to Cart clicks into the authenticated cart when an
  auth token is present, and waits for guest-to-account merge before checkout
  navigation.
- Read the saved storefront token directly as a fallback so the checkout merge
  does not depend on catching an earlier Angular XHR header.
- Added a localhost checkout cart mirror so checkout item cards and totals are
  redrawn from the same cart source as the cart page.
- The checkout mirror now creates the missing mobile checkout item block when
  the compiled checkout renders only the summary.
- Rebuilt the localhost cart page rows from the same injected cart source so
  stale compiled cart rows cannot disagree with checkout.
- Added a localhost cart shell fallback for the empty-cart render state, so the
  mirrored cart rows and totals still appear when Angular initially thinks the
  cart is empty.
- Restyled the generated localhost cart rows to match the compiled cart card
  layout and stopped rewriting/animating them on every poll, removing the
  visible flicker.
- Restyled the generated localhost checkout product rows so mobile checkout
  cards use compact book thumbnails instead of full-width product images.
- Reduced the free-notebook offer suggestions from three products to two and
  verified offer-card Add to Cart updates the live cart and earned state.
- Stopped the localhost checkout mirror from rewriting product rows on every
  poll, removing the temporary checkout gift/summary flicker after load.
- Reworked Buy Now so product detail clicks add the current product first, keep
  existing cart items, suppress the add-to-cart popup, and then open checkout.
- Stabilized the checkout summary patch so the initial zero-value summary stays
  hidden until the real totals are ready, and the localhost checkout mirror no
  longer repeatedly refetches/repaints the same summary rows.
- Fixed cart-page empty-state reconciliation: removing the final item now clears
  stale generated product rows, resets cached cart products, and refreshes the
  recent-books/offer sections against an empty cart. The notebook-offer Add to
  Cart buttons now use the same cart add path as other injected product buttons,
  avoiding the previous local/auth split that made them intermittent.
- Fixed the remaining notebook-offer Add to Cart race after an empty cart:
  localhost cart-page reads now use the local cart snapshot even when a stale
  auth token is present, and guest adds clear any temporary authenticated cart
  override before refreshing the UI.
- Fixed notebook-offer dynamic add rendering by caching the gift-card product
  metadata before the buttons render and using that cache for the immediate cart
  repaint, so Add to Cart no longer waits on a second product lookup.
- Fixed native product-card overlay Add to Cart clicks by resolving the card
  slug and routing it through the shared injected cart writer, with guest-cart
  fallback when a stale auth token blocks the API write.
- Fixed product-page “পাঠকেরা একসাথে কিনে থাকেন” Add All to Cart by reading the
  checked section products, resolving their slugs through the catalogue proxy,
  and adding them through the shared cart bridge. The shared JSON helper now
  falls back to XMLHttpRequest when `fetch` is unavailable.
- Restyled desktop checkout cart rows to follow the same compact mobile
  item-card treatment, including the book thumbnail, Bengali title/price stack,
  and row dividers.
- Added desktop-only styling for the checkout cart row controls in the
  right-column `summery-pc` item list, keeping the fix scoped to CSS.
- Constrained the checkout right-column free-gift/offer block so product
  suggestion images render as compact thumbnails instead of large banner-style
  images inside the total cart section.

## Desktop sticky action cleanup (2026-08-31)

- Hid the injected mobile sticky product/cart action bars by default so their raw
  Buy Now, Add to Cart, and Go To Cart buttons cannot appear at the bottom of
  desktop pages. The existing mobile media query still turns them on for mobile.

## Technical SEO foundation (2026-08-30)

- Replaced the stale static-style sitemap response with backend-generated
  canonical `https://www.amolbooks.com` URLs for homepage, core pages, SEO
  landing pages, published products, product-list category filters, and blogs.
- Added a first-class `robots.txt` response that allows the storefront, blocks
  API/admin/private paths, and points Google at the canonical sitemap.
- Upgraded bot-facing product pages with product-specific title/description,
  canonical URL, Open Graph/Twitter tags, Product JSON-LD, Breadcrumb JSON-LD,
  price, stock availability, author/category text, and visible fallback content.
- Added server-rendered SEO landing pages for Islamic, Quran, Hadith, Dua,
  Bengali Islamic, and Bangladesh bestseller book searches, each with product
  grids and ItemList/Breadcrumb structured data.
- Updated the compiled storefront shell metadata to Bengali language, a stronger
  homepage title/description, canonical `www` URL, and removed the fake Google
  verification placeholder.

## Desktop product action buttons (2026-08-29)

- Fixed the desktop product-page purchase row so Buy Now, Add to Cart, and
  WhatsApp order sit in one aligned row with stable widths and no wrapped button
  labels. The hidden legacy advance-payment button row is now removed from the
  desktop grid so it does not reserve empty space.

## Cart layout stabilization (2026-08-29)

- Forced the cart route back into one centered desktop column, with the trust
  panel stacked under the cart contents instead of floating beside it.
- Hid the compiled related-products shelf on `/cart` so the footer follows the
  cart cleanly and the page no longer looks like a mixed product feed.

## Desktop cart refresh (2026-08-29)

- Refined the desktop cart route with a wider modern two-column layout, tighter
  cart rows, polished summary/actions, and a sticky right-side support panel
  while leaving mobile cart behavior unchanged.
- Removed stray pre-cart product feeds and the oversized native related-products
  section from the cart route so the cart itself is the first desktop content.
- Added a final desktop-only workbench override after the compiled tablet rules:
  it restores the wide cart ledger, keeps checkout/support panels sticky on the
  right, and aligns prices, quantities, totals, and checkout action as one
  deliberate desktop flow.

## Buy Now checkout flow (2026-08-29)

- Product-page Buy Now now suppresses the added-to-cart modal/toast and redirects
  straight to `/checkout`. Add to Cart still shows the added-to-cart popup.

## Checkout free-notebook visibility (2026-08-29)

- Made the earned free notebook visible inside the `/checkout` item list by
  reusing the live `OrderOffer` config, cart items, and product pricing helpers
  from the cart enhancement. The backend order creation path already appends the
  notebook as a zero-priced `orderType: gift` item, so saved orders and order
  lists receive the same gift line without adding it to the paid cart.
- Added a fallback checkout placement that anchors the notebook under the
  native “মোট আইটেম” list even when the compiled checkout uses different row
  classes than the cart. Local order creation also falls back to the published
  notebook offer when the local fixture DB has no `OrderOffer`, so dashboard
  verification shows the gift line after placing an order.
- Corrected checkout placement again after visual review: when compiled
  checkout rows do not expose cart classes, the gift now anchors after the last
  product image/price row instead of above the delivery form.
- Removed the broad checkout fallback that placed the notebook above the form;
  checkout now only renders the free notebook when it can anchor to the cart item
  list itself.

## Local development startup (2026-08-28)

- Made the mobile sticky storefront search dynamic. Typing at least two
  characters now debounces a published-catalogue product lookup and renders
  matching books directly below the search field with cover, author, and price;
  Enter/search still routes to the full product-list search page.
- Reworked the cart page's desktop treatment without touching Angular source:
  the native cart now gets a centered two-column layout, a clean bordered item
  list, right-side sticky trust/summary column, stronger quantity/price
  alignment, and desktop-specific spacing while preserving the mobile cart
  layout. Corrected the first pass after screenshot review: the free-notebook
  progress card now spans the top of the desktop grid instead of stretching into
  a giant left column and squeezing cart items into the right rail.
- Tightened the desktop cart layout again after review: the cart area now uses a
  predictable 12-column grid, an 8-column cart list, a 4-column sticky right
  panel, compact row covers, fixed price/quantity alignment, and constrained
  related-product imagery so the page no longer turns into a tall oversized
  product feed below the cart.
- Changed the desktop cart page to follow the mobile composition instead of a
  split desktop layout: offer card, cart items, totals/actions, trust panel,
  product shelves, and sticky checkout remain in one centered column.
- Centered the checkout progress stepper on desktop to match the mobile
  treatment: the three Bengali steps now sit inside a contained centered band
  with balanced spacing and no left-drift on wide screens.
- Fixed the cart-added popup's recommended-product Add to Cart controls so they
  render as proper full card buttons and continue updating the popup subtotal
  and sticky cart count after a click. Added a mobile cart-page sticky checkout
  bar that contains only “অর্ডার করতে এগিয়ে যান” and routes straight to
  checkout, leaving Gift Order out of the sticky bottom area. The sticky product
  header search now reads the real sticky input element value and also handles
  mobile search-key events before routing to the product-list search URL.
- Restored the product-page mobile sticky commerce header with catalogue,
  search, and cart controls while keeping a separate bottom product action bar.
  The sticky search now submits the actual typed value to the storefront product
  list route instead of forwarding an undefined Angular value. After a product
  is added to cart, the bottom Buy Now/Add to Cart pair collapses into one
  full-width sticky “Go To Cart” button. Product-page add-to-cart feedback now
  suppresses the old green toast and shows a Rokomari-style cart-added modal
  with cart count/subtotal, Buy More and Go To Cart actions, and two relevant
  product cards.
- Fixed Add to Cart in the cart page's “জনপ্রিয় কিছু বই দেখুন” carousel on
  localhost. Those native cards are backed by the published storefront
  catalogue, so their injected slug buttons now resolve products through the
  same catalogue proxy and, for local preview, write directly to the compiled
  storefront's guest-cart key instead of posting published product ids into the
  local fixture MongoDB cart API. The injected button also gets its own z-index
  and pointer hit area so carousel card links do not steal taps.
- Replaced the product-page mobile sticky catalogue/search/cart bar with a
  bottom Buy Now / Add to Cart bar. Both buttons proxy the compiled
  storefront's native product actions, so Buy Now keeps the existing checkout
  path and Add to Cart keeps the native cart state/label behavior. The old
  sticky search bridge now targets the real header search input/form more
  defensively for any cached older bar markup, instead of trying to own search
  behavior itself.

- Disabled storefront analytics only on `localhost`, `127.0.0.1`, and `::1`.
  The local HTML now prevents the GTM/Tagioo, Google Ads, and PostHog loaders
  from running and omits the GTM no-script iframe; deployed hosts retain the
  existing analytics behavior.

- Fixed guest-cart synchronization for the local compiled storefront. Its
  CartService reads `Amolbooks_USER_CART_1`, while the injected product/cart
  bridge had written `ALAMBOOKS_USER_CART_1`. The bridge now merges the stale
  uppercase entries into the native key, reloads cart/checkout once, and keeps
  all future item, quantity, and removal updates on the checkout-visible cart.
  The local server also content-versions the compiled `main.*.js` tag, so a
  previous same-filename browser cache cannot keep the old CartService alive.

- Moved the live item-count/subtotal calculation into the native cart card,
  immediately after the product rows and before promo/order actions, so the
  calculation reads as part of the cart contents rather than a detached block.
- Tightened the cart's “আপনার দেখা বই” shelf with a contained surface,
  consistent outer/inner spacing, smaller mobile covers, and more compact cards
  and actions. The global add-to-cart checkout toast is now hidden and cleared
  only on `/cart`; it remains available on product and catalogue pages.
- Connected the cart offer suggestions to the live cart page. An Add to Cart
  action now immediately reconciles the native cart-card list, item count,
  quantities, remove controls, and paid subtotal without a reload. The live
  `OrderOffer` threshold is recalculated from those paid items; when earned,
  suggestions disappear, the progress card switches to its congratulations
  state, and the configured notebook appears as a clearly labelled ৳0 gift row.
  The gift remains a derived cart view (not a second persisted paid product),
  leaving the server-side order offer engine as the source of truth at checkout.
  The bridge is pinned to the compiled storefront's real versioned cart key,
  preventing a pre-render badge race from writing offer products into a stale
  legacy cart. It also suppresses stale Angular rows when the compiled view has
  not yet reconciled that key, so item count, visible rows, and subtotal remain
  one consistent snapshot.
- Replaced the cart empty-state's hardcoded generic `dummy-image.jpg` avatar
  with an embedded, accessible empty-cart illustration. Because the repair uses
  a self-contained SVG data URL, it no longer depends on a missing or misleading
  image asset and remains intact across Angular cart redraws.
- Fixed the cart's “আপনার দেখা বই” shelf flicker at its ownership boundary.
  The injected section now lives between Angular's stable route container and
  footer instead of inside `app-cart`/`app-related-products`, whose redraws
  repeatedly removed and recreated it. Repeated mounts are idempotent, duplicate
  product requests are coalesced, stale responses are ignored, and the shelf is
  removed cleanly when leaving `/cart`. Cart product metadata is reused while
  the item signature is unchanged, and offer/row markup now mutates only when
  its rendered value changes, breaking the observer-driven refresh loop.
- Restored the full tracked Angular storefront `index.html` after a static patch
  pass reduced it to script tags only, which caused every localhost route to
  appear blank. The localhost root now serves the full application shell again
  and `/cart` renders normally.
- Kept `/cart` on the compiled storefront route (no injected second page), then
  repaired that native route in place: the two cart calls-to-action now read
  “আরও ক্রয় করুন” and “অর্ডার করতে এগিয়ে যান”; service rows use meaningful
  COD, return, quality, exchange, and value icons; cart rows gain backend
  author and calculated discount details; and the existing popular-products
  carousel receives real Add to Cart controls using the same cart bridge as
  product pages. A compact, backend-backed “আপনার দেখা বই” shelf now surfaces
  recently viewed books in the cart without duplicating items already there.
- Moved the free-notebook progress message out of checkout and into the cart.
  It reads the live `OrderOffer` threshold and real cart prices, so its progress
  and earned state match the server-side gift rule instead of promising a
  hard-coded offer. Checkout now has a concise `ক্রয় তালিকা → তথ্য ও পেমেন্ট →
  অর্ডার সম্পন্ন` flow marker with a link back to the cart, and its cash-on-
  delivery method uses the real COD artwork instead of a placeholder portrait.
- Anchored that notebook badge inside the native `app-cart-information` summary
  after live review (rather than outside the cart block), and added three real,
  in-stock Add to Cart suggestions immediately below it. The initial badge waits
  for the rendered subtotal, preventing a brief incorrect “remaining” amount
  while Angular is still drawing the cart.
- Corrected the cart badge against the published `OrderOffer`: a ৳190 cart now
  accurately says to add ৳560 more, never shows a premature congratulations
  state, and uses the live notebook product record for its current cover. The
  product record says 80 pages (not 72), so the customer-facing copy uses the
  accurate ৮০-পৃষ্ঠার notebook description.
- Refined the cart offer's earned state: only carts at or above the live ৳750
  threshold show “অভিনন্দন!” and the notebook gift, with no add-more-product
  recommendations. Below the threshold, the progress card still offers three
  relevant books. The recently viewed shelf now follows the final book section
  and uses deliberately compact cover dimensions so it reads as a secondary
  discovery module.
- Moved the recently viewed shelf out of Angular's frequently redrawn
  `app-cart-information` component and into the stable gap before related
  products. This prevents the remove/recreate cycle that made the shelf flicker
  while the native cart refreshed.
- Made the notebook cover an accessible link to its own product page and added
  a “সব বই দেখুন” route from the offer. Cart-line enrichment now has a published
  catalogue fallback when the compiled cart does not expose a product id, so it
  can match the visible book title and show the author, percentage discount,
  discounted price, and struck-through original price consistently.
- Replaced the first cart-overlay pass with a stable cart route that preserves
  the storefront header and mobile navigation. It now uses a clear cart-list /
  checkout-summary layout, real quantity and remove controls, an honest
  checkout-only delivery note, and no longer resets to a loading placeholder on
  the product-page watcher. Corrected cart-key selection so an empty legacy key
  cannot hide the active guest cart.
- Removed that injected cart layer after live review showed that the compiled
  storefront already provides the native `/cart` page underneath it. Sticky-cart
  navigation now routes directly to that native page, eliminating the duplicate
  page/overlay effect while retaining the storefront's header and navigation.
- Added the requested mobile sticky commerce bar to product pages: catalog control,
  search synchronized to the storefront search form, and a cart control with a
  count badge and a brief add-to-cart guidance animation. Its cart action opens a
  first-class local `/cart` view sharing the existing cart data, quantities,
  removal actions, and checkout path; returning to a product page now reliably
  removes the cart view.
- Expanded the subject-library source from the small bestseller sample to the
  available public/local product pool, prioritizing Hadith shelves and avoiding
  duplicate display titles. The Shamayele Tirmiji product page now renders
  “হাদিসের বই” alongside the other real backend-backed subjects.
- Made Summary, Author, and Customers Bought Together headings visibly stronger
  (800 weight and a larger responsive size) on desktop and mobile.
- Product purchase controls now keep WhatsApp ordering after Buy Now and Add to
  Cart, render Buy Now at an 800 weight, and route a second click on “Go to
  Cart” straight to `/cart`. The Bought Together component is no longer
  repeatedly reinserted on observer updates, and its Add All button has
  property-specific hover transitions to prevent the visible flicker.
- Pointed the injected category shelves and author lookups at the same
  published catalogue used by the compiled storefront; the local development
  database only includes fixture data, which had made shelves empty and author
  images fall back to the placeholder. Added a direct author-image hydration
  pass and forwarded sticky-search Enter events to the native Angular search
  input and form.
- Fixed local MongoDB URI construction when `DB_USERNAME`/`DB_PASSWORD` are blank,
  allowing the local unauthenticated MongoDB service to start the NestJS server.
- Updated injected product-section cart rows to use the storefront cart's native
  visual treatment even when a live row has to be created before Angular refreshes.
  Author images now accept the image field variants returned by the author API and
  fall back safely only if the image fails to load.
- Restored the local author image for "ড. খালিদ আবু শাদি" from its published
  author record and made localhost author lookups use the local API. Verified
  that the product page now renders the published author image.

## Author biography persistence (2026-08-27)

- Replaced the stale author add/update DTO fields, which were copied from an
  unrelated campaign-style model, with the actual author fields used by the
  compiled admin form and Mongo schema—including `description` and
  `descriptionEn`. This prevents validation/whitelisting from silently removing
  author biographies while returning a successful save response.
- Made single-author updates safe for partial payloads: an omitted/blank slug
  now preserves the existing slug, duplicate-slug checks exclude the author
  being edited, bulk-only `ids` are not written into the document, and Mongoose
  validators run on the update.
- Verified against localhost with a temporary author: create, Bengali and
  English rich-description update, fresh readback, and cleanup all succeeded;
  both saved HTML descriptions were returned unchanged.

## Standalone product information sections (2026-08-26)

- Replaced the storefront product page's Summary/Description/Author/Review tab
  presentation with separate vertical sections for summary, book details, author
  information, recommendations, and reviews.
- Author cards load the existing author API so names, photos, descriptions, and
  author links remain driven by backend data. Missing biographies are left
  blank rather than replaced with invented copy.
- The existing Angular review component is promoted into its own section instead
  of being reimplemented, preserving login, review submission, moderation,
  ratings, and review-image behavior.
- Added a product recommendation API backed by completed/non-returned order
  co-purchases. The storefront says “Customers Also Bought” only when real order
  evidence exists; sparse results are filled with popular related-category books
  under an honest related-books heading.
- The runtime layout was verified at 320, 375, 414, and 768 px: mobile uses two
  book columns, tablet uses four, the old tab row is hidden, and there is no
  horizontal page overflow.
- Corrected the first visual pass after local review: localhost now reads the
  same production product and author data as the compiled storefront, so real
  product slugs render the enhancement. The section treatment now follows the
  supplied Rokomari reference more closely—flat document sections, lighter
  headings, a borderless author row, a horizontally scrollable mobile book
  shelf, compact outline detail actions, and a flattened review summary.
- Local previews fall back to published books from the product's real category
  while the new co-purchase endpoint is not deployed. Production will use the
  order-backed “Customers Also Bought” heading when that endpoint returns real
  co-purchase evidence.
- Reduced the injected product-page typography weight so summary, author, and
  recommendation text sits closer to the storefront's normal font treatment.
  The recommendation shelf is now titled “Customers Bought Together” and each
  product card uses an Add to Cart button instead of a details link.
- Further normalized the injected product-page font rendering: the standalone
  sections now inherit the storefront's existing font family and keep body,
  author, recommendation-card, price, and Add to Cart text at normal 400 weight
  instead of the heavier Bengali font treatment seen in the mobile preview.
- Replaced the tabbed product-specification table with a Rokomari-style
  horizontal facts strip placed directly above “সারসংক্ষেপ”. It is backed by
  product API fields for category/genre, page count, language, publisher,
  author, ISBN/SKU, edition year, and country, with a horizontally scrollable
  mobile treatment.
- Polished that facts strip after mobile review: columns now use equal widths,
  consistent side padding, fixed label/icon/value rows, centered content, and no
  negative outer margin, so the rhythm is closer to Rokomari's specification
  rail.
- Removed the empty reserved icon slot from facts that do not have an icon
  (Length, Language, Edition, Country), eliminating the visible blank gap above
  their values while keeping icon-bearing facts aligned.
- Replaced the Publication fact's placeholder/clover glyph with a simple inline
  book SVG icon so the strip better matches the Rokomari product-spec reference.
- Restored bold weight only for the standalone section titles requested in the
  product page flow while keeping body/product-card text light. Review image
  placeholders are now suppressed when the saved uploaded image URL is missing
  or falls back to a dummy asset.
- Fixed an escaping bug in the injected review-image URL matcher that caused the
  product sections script to fail at runtime. The localhost product page now
  mounts the standalone sections again, hides the old tab row, and shows the
  requested headings at 700 weight.
- Switched only those standalone section titles to the storefront's stronger
  Bengali heading stack (`hind-siliguri` with Noto/system fallbacks) and bumped
  their requested weight to 800, because the inherited body font rendered 700 as
  visually too light.
- Fixed stale injected CSS during local iteration: the product sections runtime
  now updates the existing `ab-product-sections-style` tag instead of returning
  early when an older style block is already present in the page.
- Fixed the reason those recommendation changes appeared unchanged on
  localhost: the running API kept the injected product-page script frozen in
  memory. The script endpoint now reads the generated storefront asset from
  disk on every uncached request, with the bundled source as a fallback, so
  subsequent product-page styling edits become visible after a browser refresh
  without another API restart.
- Reworked the oversized desktop “Customers Bought Together” catalogue grid
  into a single compact recommendation rail. The rail is now the default layout
  rather than a desktop-only override, so the oversized four-column fallback
  cannot reappear. Tablet and mobile retain the keyboard-focusable horizontal
  shelf. Desktop now uses six fixed 9 rem tracks per row with much smaller
  6.25 × 8.5 rem covers, borderless cards, two-line titles, single-line authors,
  compact prices, and a 44 px Add to Cart action. The generated script's cache
  key was also refreshed so an already-running localhost page requests this new
  layout instead of reusing the previous four-column asset.
- Corrected the over-compressed desktop follow-up seen in the full-page review:
  the six cards now distribute evenly across the product content width, use a
  restrained bordered-card treatment with 6.75 × 9 rem covers, and hide cards
  after the sixth only on desktop. This removes the awkward two-card second row
  while tablet and mobile retain the full horizontally scrollable result set.
  Refreshed the generated script and cache key again for immediate local pickup.
- Unified the injected desktop product sections with the storefront's existing
  1300 px `.section-main` measure. Facts, summary, author, recommendations, and
  reviews now share that centered maximum width; the summary body can use the
  full measure instead of stopping at 72 characters. The specification rail
  renders only facts backed by product data and redistributes the available
  facts evenly, avoiding blank/placeholder columns. On wider layouts the author
  portrait now spans beside the author's name and full biography, while narrow
  layouts retain the safer stacked-description treatment. Refreshed the
  generated script and cache key for local pickup.
- Moved the storefront's existing interactive Bengali bought-together bundle
  directly below the injected “Customers Bought Together” recommendation shelf.
  The runtime relocates the live Angular section rather than copying it, so its
  selected books, calculated total/savings, and Add All to Cart action remain
  functional. A placeholder restores the section before rerenders and SPA route
  changes, preventing the native component from being discarded with the
  injected content. Corrected the relocation for the live product template,
  whose bought-together component has no `.section-main` ancestor, by falling
  back to moving the Angular component itself. Refreshed the generated script
  and cache key for local pickup.
- Repaired the product purchase-info icons by replacing the compiled template's
  dummy profile images with the storefront's existing COD and happy-return SVGs.
  Standalone Bengali section headings now use the bundled SolaimanLipi Bold face,
  including “Customers Bought Together”, producing real bold rendering instead
  of requesting unsupported Hind weight 800.
- Removed the redundant injected “11 হাজার পাঠক...” shelf from the product page.
  Replaced the native six-item category carousel with a two/four/six-column
  “আরও জনপ্রিয় বই” catalogue grid backed by published, in-stock products. It
  progressively loads twelve more real books near the scroll boundary, retains
  a keyboard-accessible manual load action, prevents stale SPA requests from
  crossing product routes, and restores the native component during cleanup.
- Added a compact Add to Cart action and calculated red percentage-off badge to
  every “আরও জনপ্রিয় বই” card. The desktop Description body now uses the full
  shared 1300 px content measure instead of the previous 72-character column.
  Author biographies remain fetched from the public author record, accept both
  Bengali and English description fields, bypass stale response caches, and
  show an honest empty state when the backend has no biography; the current
  মোহাম্মাদ ফারিস record returns no description yet.
- Standardized the product purchase controls without changing their Angular
  behavior: the primary order action now reads “Buy Now”, while the cart action
  reads “Add to Cart” before selection and “Go To Cart Page” once active. The
  existing Buy Now toast suppression and WhatsApp-button locator now recognize
  the English label as well.
- Extended the existing cart confirmation toast to the injected recommendation
  and catalogue card actions by emitting the same global cart-added event used
  by native/API cart additions. Native logged-in additions remain covered by
  the API event bridge, and guest additions remain covered by the cart-badge
  observer, so the same checkout prompt is available across product surfaces.
- Replaced the undifferentiated progressively expanding “আরও জনপ্রিয় বই” wall
  with seven capped, backend-driven subject shelves. The current product’s real
  category is prioritized, followed by available Quran, Hadith, Seerah,
  self-development, dua, productivity, women, finance, etiquette, or creed
  categories. Headings are derived from those actual categories, duplicate
  multi-category books are suppressed, and mobile shows at most four books per
  shelf while desktop shows up to six. Each shelf marks its highest-selling
  visible book as “বেস্টসেলার” only when the backend reports recorded sales.
- Made the injected recommendation and category-shelf Add to Cart actions update
  the guest cart immediately: the bottom-nav count, cart drawer rows, quantities,
  and total now synchronize from the stored cart without a page refresh. The
  primary product action starts as “Add to Cart” and changes to “Go to Cart”
  after it is clicked, and the product fact label “Length” now reads “Number of
  Pages”.
- Matched dynamically inserted cart lines to the native cart component by
  cloning its real scoped row template, so live-added books now share the same
  cover size, alignment, quantity controls, and price treatment. Added enough
  vertical room between the wrapping “Number of Pages” label and its value on
  mobile. Review-image uploads now preview the selected local file immediately,
  retain the environment-correct uploaded URL, and replace the preview with the
  saved image URL after upload instead of incorrectly pointing localhost files
  at production and falling back to the avatar placeholder. The live cart bridge
  now resolves the active versioned cart by matching Angular’s rendered cart
  count, with the fullest valid cart as fallback, preventing stale counts when
  several legacy storage keys coexist.
- `npm run build` passes. `npm run lint` remains blocked by the existing
  all-files-ignored ESLint configuration. Changes are local and not yet
  deployed.

## Profit dashboard actual-cost bridge (2026-08-26)

- Added a visible profit calculation for both valid placed orders and delivered
  orders: revenue minus product cost, courier, packaging, payment/refund/return
  costs, and Meta advertising spend.
- New orders continue to use the `costPriceAtOrder` historical snapshot. Older
  orders without that snapshot now fall back to the product edit page's current
  `costPrice` and are clearly marked estimated instead of making profit entirely
  unavailable.
- Expanded the campaign view with each Meta campaign's spend, Meta-attributed
  purchases and purchase value, captured store orders, delivered orders, cost
  per delivered order, and estimated store contribution after ad spend.
- Successful Meta syncs now save explicit zero-spend days, so a day Meta confirms
  as zero is no longer mistaken for a missing/un-synced day.
- Fixed the profit bridge being calculated internally but omitted from the final
  decision-analytics API response. The dashboard now also shows an explicit
  backend-version warning instead of empty values if that response field is ever
  absent again.
- Delivered outcomes now use the authoritative Steadfast `courierStatus.status`
  shown in Custom Orders as well as the legacy numeric order status. Courier cost
  likewise prefers Steadfast's reported delivery charge.
- Orders without an entered packaging cost now use ৳2.50 per order, and COD
  orders without an explicit payment fee deduct 1% of order value.
- A one-day Performance Trend now renders labeled revenue/profit/spend summary
  cards; multi-day views retain the line chart with an explicit series legend.
- `npm run build` passes and the dashboard's embedded JavaScript parses cleanly.
  Repository lint remains blocked by the existing all-files-ignored ESLint
  configuration.
- Changes are local and not yet deployed.

## Courier label pagination fix (2026-08-25)

- Corrected the custom order-list courier print template from 2 × 4 inches to the
  actual 50 × 75 mm sticker media used by the thermal printer.
- Compacted the header, barcode, QR/order metadata, recipient, product, COD, and
  footer spacing so the complete shipment stays on one physical sticker.
- Added explicit inside-break protection to prevent a courier label from being
  divided between adjacent stickers.
- Rebalanced the physical-print layout after a real sticker test: reduced the
  barcode and QR blocks, removed excess internal vertical padding, protected the
  COD box from product-text overlap, and added an automatic dense mode for
  orders containing five or more books or unusually long combined titles.
- Increased the compact and ultra-dense product-description fonts after a
  nine-line physical print showed that the reserved product area had ample room
  but the previous type was too small for reliable Bengali-title readability.
- Replaced fixed product sizing with item-count tiers plus a measured overflow
  fitter: single-item labels print largest, short lists remain spacious, and
  long lists shrink only as much as their actual rendered height requires.
- Enlarged the consignment ID and recipient details, added separation between
  name/phone/address rows, and retained a compact dense-label variant so those
  readability gains do not force the COD/footer outside the 50 × 75 mm page.
- Single-product labels now stack the COD/footer immediately after the larger
  product description instead of stretching an empty product area between them.
- Removed the nonessential Amol Books branding header and replaced it with an
  unprinted 10 mm feed-alignment band. A misaligned printer can consume that
  band across the preceding die-cut edge while the barcode and all operational
  order details begin on the intended sticker.
- Removed forced after-page breaks so consecutive fixed-height labels paginate
  naturally; a five-label mixed-density batch still produces exactly five
  50 × 75 mm pages without inserted blank document pages.

Living status doc. Update after meaningful progress.

_Last updated: 2026-08-26. Branch: `main`. Product-page sections and Meta Purchase EMQ coverage are corrected locally; publication is pending._

## Recently completed (git log, newest first)

- `991a080a` Incomplete orders: stop address landing on duplicate rows (pushed, not deployed)
- `032a9b10` Load GTM at window load instead of 10 seconds after it
- Ad-account picker for Meta spend sync (pending commit — see below)
- `add8d737` Fix Meta OAuth callback swallowing errors behind zlib crash
- `33dd40b0` Recover missed webhook transitions into Steadfast In Review
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

**Authoritative Meta Purchase tracking correction (built locally, not yet deployed).** The
live settings have `IsManageFbPixelByTagManager=true` and intentionally blank direct Meta
Pixel/token fields. The API was nevertheless requiring direct-CAPI acknowledgement after
Tagioo accepted each Purchase, so valid GTM-managed orders were marked failed and retried.
Website and manual orders now treat a successful Tagioo handoff as authoritative in this
mode. Direct CAPI remains available when explicit server-side credentials are configured.

The existing browser Meta Pixel also sends a resilient Purchase companion from the pending
thank-you-page payload. It uses the same `event_id = order_<orderId>` as Tagioo, allowing
Meta to deduplicate Pixel and CAPI rather than count twice. This does not expose or add a
CAPI token to the storefront. Automatic real-order direct CAPI no longer inherits a saved
Meta Test Events code; test delivery must be explicit so production Purchases cannot be
diverted into the test stream.

Before deployment, verify in Tagioo preview that the Meta Purchase tag forwards the incoming
`event_id` unchanged. This is mandatory; without it, the browser/Tagioo copy cannot
deduplicate against the direct API copy.

Deployment order:

1. Verify/publish the Tagioo `event_id` mapping.
2. Deploy the API with `scripts/vps-safe-pull.sh`, then `npm install --legacy-peer-deps`,
   `npm run build`, and `pm2 restart amolbooks-api`.
3. Test one real website order without a Meta Test Events code in the request. Confirm the
   Browser and Server copies share `order_<orderId>` and Meta reports one deduplicated
   Purchase.
4. Test one incomplete-order phone conversion and one WhatsApp order through Tagioo.

`META_GAP_FILL_DISABLED=true` + PM2 restart disables website direct sending/retries as an
emergency rollback. It does not disable manual-order CAPI.

The Meta tracking-health panel now treats only Meta-acknowledged API sends as reported;
`browserFired` is diagnostic and no longer assumed to prove delivery to Meta. Incomplete
orders store `_fbc`/`_fbp`/`fbclid` + IP/UA and carry them into phone-converted orders.
Incomplete conversions are labelled `phone`, while ordinary admin orders still default to
WhatsApp.

After deploy, first thing to verify: click **Sync** on the profit dashboard and confirm ad
spend still populates. `syncSpend` now also requests `actions,action_values` with
`action_report_time=conversion`; if Graph rejects those params it returns
`{synced: 0, error}` and spend silently stops updating. Fix in that case is to drop
`action_report_time` + `action_attribution_windows` from the query — spend keeps working,
you only lose the conversions column.

Older item, still open: awaiting VPS deploy of the ad-account picker; user needs to set the
correct Meta ad account ID (`1025891126119809`, confirmed from Business Settings) via
the new "Ad account" button, then re-sync and confirm spend appears. Also awaiting
VPS deploy of `33dd40b0` and live confirmation that the Steadfast In Review count
climbs from 17 toward the real ~46.

## Completed this session

### Product Facebook/Open Graph preview correction

- Confirmed the saved product SEO title and description are already returned by
  `GET /api/product/og/:slug`; the live `www` storefront was bypassing that
  endpoint and serving Angular's homepage metadata to Facebook instead.
- Added `scripts/nginx-product-social-seo.conf.example`, which routes social
  crawler requests for `/product-details/:slug` to the product OG endpoint while
  leaving normal visitors on the Angular SPA.
- Product OG URLs now use the canonical live `www.amolbooks.com` host, collapse
  whitespace/limit oversized metadata, and retain valid public `apisub` product
  image URLs. The former `/uploads/` rewrite returned storefront HTML instead of
  an image and caused Facebook's invalid-content-type warning.
- Deployment requires the API build/restart plus installing the nginx map and
  locations, validating with `nginx -t`, and reloading nginx. Facebook must then
  scrape the product URL again to clear its cached homepage preview.

### Product page number-of-pages label

- The API-injected storefront runtime now replaces the product weight heading
  with `Number of Pages: N`; no GTM tag or compiled Angular edit is required.
- It reads the structured `totalPages` value first and falls back to a page count
  in the product description. If neither source is valid, the existing weight
  remains visible.
- The display-only behavior is SPA-safe and does not read or write the data
  layer, Meta Pixel, GA4, purchase events, cart, checkout, or order state.
- Verified the live product exposes `totalPages: 256` and the marked DOM heading
  is `.product-title h4`. Structured-field and description-fallback runtime
  checks pass, as does the Nest build. Repository lint remains blocked by its
  all-files-ignored config. Deployment requires the normal API build/restart.

### Meta Purchase Event Match Quality correction

Meta's Purchase customer-information report showed IP, user agent, and `fbp` at
100%, while phone/name/country/external ID appeared on only ~21% of submissions.
Test Events identified the cause: every order produced a rich authoritative API
Purchase plus a weaker Web Data Tag server Purchase. Meta deduplicated the pair,
but the weak copy still diluted parameter-coverage reporting.

- The focused Web GTM import now pauses `[Stape] DT - purchase`; the browser
  Pixel Purchase, GA4 Purchase, and authoritative API-to-Tagioo Purchase remain.
- Website and manual API Purchases now expose the available hashed phone, email,
  name, city, region, and country fields at the top-level event model as well as
  in `user_data`, matching the existing Server GTM Event Data variables.
- City falls back to the stored area/zone and region to the stored division;
  bilingual checkout labels prefer their English portion for matching.
- Bangladesh phone normalization now handles both `01...` and `1...` inputs as
  the same `8801...` E.164 value before hashing.
- Email remains optional and `fbc` remains limited to Meta-click traffic; neither
  is fabricated merely to improve a coverage percentage.

### Meta Purchase duplicate Event ID correction

Meta Test Events showed one real order twice at the same second and value: the
authoritative API copy used `order_7084`, while the browser/Data Tag copy used a
generated timestamp-like Event ID. Inspection of the supplied Web GTM export
confirmed that `[Stape] Meta - Purchase` and `[Stape] DT - purchase` both
discarded the storefront's stable `event_id` in favor of `{{Unique Event ID}}`.

- Added `gtm-snippets/GTM-NNZV54QJ_purchase-event-id-fix.json`, a minimal Web
  GTM merge import containing only the two Purchase tags, their existing trigger,
  and a new `dlv - event_id` Data Layer variable.
- The initial correction mapped both Purchase tags to `{{dlv - event_id}}`,
  matching the API's `order_<orderId>` ID. The later EMQ correction above keeps
  that mapping on the browser Meta tag and pauses the redundant Data Tag copy.
- No event names, values, Pixel IDs, tokens, or non-Purchase tags were changed.
  The corrections take effect only after importing, previewing, and publishing
  the Web GTM container.
- Corrected the focused import after GTM rejected the first draft as an unknown
  `cvt_KFNBV` entity. The file now bundles the exact Facebook Pixel by Stape and
  Data Tag custom-template definitions from the supplied Web-container export.

### GA4 purchase delivery hardening

The browser `purchase_stape` restoration works when the thank-you page and GTM
finish normally, but the authoritative API purchase was claimed by Tagioo's
Data Client and only routed to Meta. That left GA4 with no fallback when the
browser event was blocked, interrupted, or delayed.

- Storefront attribution now preserves the GA4 client ID and current session ID
  from the first-party Analytics cookies on each website/incomplete checkout.
- Website-order server purchases now carry the GA4 client ID, session ID,
  engagement time, stable transaction ID, ecommerce items, and the existing
  `order_<orderId>` event ID through Tagioo.
- Added `gtm-snippets/GTM-PZPN8VW3_ga4-purchase-fallback.json`. Its server-GTM
  trigger forwards Data Client purchases to the existing GA4 tag, with the
  measurement ID configured explicitly, only when `order_source` is `website`;
  Admin and Incomplete Order sales cannot inflate GA4 website ecommerce.
- The browser purchase remains the attribution-rich primary event. The server
  copy is a delivery fallback with the same `transaction_id`, which GA4 uses to
  deduplicate repeated purchase events in a web stream.

Deployment still requires importing/publishing the corrected server-container
JSON and deploying/restarting the API. Verify one fresh website checkout in
both web and server GTM Preview before judging GA4 Realtime.

Validation: `npm run build` passes. Storefront runtime checks confirmed GA4
client/session extraction for both current GS2 and legacy GS1 cookie formats.
The repository lint script cannot currently run because its configured source
glob is entirely ignored by the existing ESLint configuration.

### Web GTM Purchase event restoration

Tag Assistant confirmed that a completed checkout did not produce the
`purchase_stape` data-layer event. The storefront runtime had intentionally
cleared `_pendingPurchase` without pushing it while the API was made the
authoritative Meta sender. That also prevented the web container's GA4 Purchase
tag from running, so GA4 could show the thank-you page without a Purchase event.

- Restored the `purchase_stape` push after GTM is ready, with the stable
  `event_id = order_<orderId>` already present on the payload.
- Added a runtime-upgrade marker so an API restart replaces the currently
  deployed clear-only block without editing compiled Angular bundles.
- Prepared `GTM-NNZV54QJ_purchase-event-id-fix.json` from the supplied web GTM
  export. It adds `dlv - event_id` and maps both the browser Meta Purchase tag
  and the Data Tag Purchase request to that stable ID instead of Stape's
  generated `Unique Event ID`.
- The GTM container fix must be imported and published before deploying the API
  restoration. That order prevents the old random-ID browser Purchase from
  becoming a duplicate of the Tagioo server Purchase.

### Profit-dashboard order-source reporting

- Added a dedicated **Order sources** panel to the Profit & Growth dashboard.
  It shows placed orders, valid revenue, units, order/revenue share, delivery
  rate, and loss rate for Facebook, Instagram, Google, Direct, Website,
  Incomplete Order, Admin, and any captured custom UTM source.
- Source classification uses the same `orderOrigin`, attribution, Google Ads
  click-ID, and historical fallback rules as the custom order list. Manual
  profit-dashboard sales are classified as Admin.
- Cancelled, refunded, and returned orders remain visible in placed-order and
  loss counts, but are excluded from source revenue and unit totals.
- Product performance now includes a per-product **Source mix (units)** showing
  Facebook, Google, Instagram, Website, Direct, Incomplete Order, Admin, custom
  UTM sources, and the product's total valid units.
- This is reporting-only: no Meta, Tagioo, GTM, GA4, or Purchase event path was
  changed.
- Verified the Nest build, dashboard inline JavaScript syntax, source
  classification fixture, and `git diff --check`. Repository lint still exits
  before linting because its configured TypeScript glob is globally ignored.

### Order-list UTM/source visibility

- Added a durable `orderOrigin` value for new orders: `website`, `incomplete`,
  or `admin`.
- The custom order list now includes a **UTM / Source** column. Website orders
  show the normalized last-touch source (Facebook, Instagram, Google, Direct,
  or the captured referral/UTM source), plus medium and campaign when present.
  Recovered abandoned checkouts show **Incomplete Order** and manually entered
  orders show **Admin**.
- Storefront attribution now recognizes Google Ads auto-tagging (`gclid`,
  `wbraid`, and `gbraid`) even when `utm_source` is absent, and preserves those
  identifiers on incomplete and completed orders.
- Historical rows use `orderFrom` / `manualOrderSource` fallback inference, and
  the CSV export now includes source, UTM medium, and UTM campaign.
- Verified the inline page scripts and a clean Nest build. Repository lint still
  exits because its configured TypeScript glob is globally ignored.

### Purchase still doubled and InitiateCheckout value was zero

A later live test made both remaining paths explicit. Purchase `order_7017`
arrived alongside a timestamp-ID Purchase at the same second: the API's direct
Meta delivery was correct, but the thank-you page still sent an additional
browser/Tagioo Purchase whose container-generated ID could not deduplicate.
InitiateCheckout contained the right product ID but value `0`; checkout fired
from localStorage before the guest product-details request populated prices,
then `_checkoutFired` prevented the later priced event.

- `api/src/main.ts`: the thank-you-page flush now clears its pending browser
  Purchase without pushing `purchase_stape`. The API remains authoritative: it
  sends the order to Tagioo server-side for the existing analytics pipeline and
  directly to Meta as `order_<orderId>`. This removes the redundant random-ID
  browser copy without weakening closed-tab reliability.
- `api/src/main.ts`: InitiateCheckout now refuses to fire while its calculated
  cart value is zero and retries briefly while product prices load. It marks
  checkout as fired only after a positive value is available.
- Both are runtime upgrades, so the API can replace the previously written
  storefront tracking block on restart without editing compiled Angular files.

**Verified:** Nest build, `git diff --check`, upgrade anchors against the live
already-patched production HTML, generated JavaScript syntax, and a zero-price
cart becoming a correctly valued ৳250 checkout all pass. The repo lint command
still exits because ESLint ignores its entire configured glob. Deployment and
a fresh Meta Test Events run remain pending.

### Meta ecommerce events still duplicated after the first guard

The first 750 ms `_stape` guard deployed successfully, and the missing lazy
assets now return JavaScript 200 responses. A clean Meta Test Events run still
showed paired ViewContent/AddToCart events in the same second with consecutive
auto-generated Event IDs. Inspection of the published Tagioo web container
confirmed that each ecommerce trigger launches GA4, a Meta Pixel tag, and a
Stape Data tag. Both Meta delivery paths use custom macro `42`, whose generated
ID ends with `gtm.uniqueEventId`; two independent storefront pushes therefore
get different IDs and cannot deduplicate.

- `api/src/main.ts`: replace the narrow closure-local guard with a five-second,
  page-global cache keyed by event, all item IDs/quantities, transaction and
  value. It also gives every mirrored event a stable payload `event_id`, using
  `order_<transaction_id>` for Purchase.
- The runtime upgrader recognizes and replaces the already-written 750 ms
  guard on the VPS, so restoring the original compiled index is unnecessary.
- Tagioo still needs its shared Meta/Data Event ID variable changed to prefer
  the incoming data-layer `event_id` and use the existing generator only as a
  fallback. That is required for the browser/Tagioo Purchase to deduplicate
  against the authoritative direct API Purchase.

**Verified:** Nest build, `git diff --check`, both the original-index and
already-deployed-guard upgrade paths, generated JavaScript syntax, and the
five-second signature behavior all pass. The repo lint command still exits
because ESLint ignores its entire configured glob. Deployment remains pending.

### Duplicate ecommerce mirrors and missing storefront lazy chunks

Production's GTM container is now loading (`window.__amolGtmReady === true`) and
the data layer contains `view_item`, proving the analytics bootstrap is active.
However, one product view produced two `view_item_stape` events, and Angular
failed to load tracked lazy chunk `142.12b2a24faab58a18.js`. Several other
tracked storefront scripts were also absent. The missing chunk can break route
rendering independently of analytics, while the duplicate mirror can report two
GA4 ViewItem/Meta ViewContent events for one product view.

- `api/src/main.ts`: the runtime index patch now suppresses identical `_stape`
  mirrors generated within 750 ms. Its signature includes event, first item,
  transaction and value, so a different product/action is not discarded.
- `scripts/vps-safe-pull.sh`: deployment now restores every missing file tracked
  under the compiled storefront directory, not only runtime/main/polyfills and
  `dl-normalize.js`. Existing compiled files and all runtime uploads remain
  untouched. Core index references are still validated after recovery.

**Verified:** Nest build, shell syntax, `git diff --check`, runtime patch anchor
matching/JavaScript syntax, duplicate-signature behavior, and recovery of a
deliberately removed lazy chunk in an isolated git worktree all pass. The repo's
lint command still exits because ESLint ignores its entire configured glob.
Production deployment remains pending.

### GA4 blank-data recovery and storefront asset deploy guard

**Production diagnosis.** GA4 measurement ID `G-5VZPVFL0X9` and the GA4 ecommerce
tags are present in the published Tagioo web container, but the container never loaded.
Production returned the SPA HTML fallback for `/dl-normalize.js` instead of JavaScript.
The GTM bootstrap treated that optional normalizer failure as fatal, leaving `dataLayer`
empty and sending no GA4 collection requests. This was the same missing-asset class that
had already removed the referenced Angular `main.*.js` bundle and blanked the storefront.

- `api/src/main.ts`: Tagioo now loads after normalizer success, error, or a 1.5-second
  timeout, guarded so it loads exactly once. The optional normalizer can no longer disable
  GA4 and Meta together.
- `scripts/vps-safe-pull.sh`: even when source revisions have no differences, the deploy
  now inspects `index.html`, restores missing tracked runtime/polyfills/main/style assets
  plus `dl-normalize.js` from `origin/main`, and aborts if a referenced core asset cannot
  be recovered.

**Verified:** live Tagioo container contains `G-5VZPVFL0X9`; production
`/dl-normalize.js` currently returns 404/HTML pending the manual VPS restore; Nest build,
shell syntax, storefront core-asset validation, `git diff --check`, and a VM harness proving
Tagioo loads exactly once on normalizer failure all pass. `npm run lint` still cannot run
because the repository's ESLint configuration ignores its entire configured TypeScript glob.

### Incomplete Orders: empty Address column — root cause + fix (`991a080a`)

**Symptom.** The Address column on the Incomplete Orders page was `—` on almost every row.
A few rows showed fragments (`138/`, `1`), and the same phone appeared several times at the
same minute (the `5x` repeat badge).

**Root cause.** The compiled checkout (`ui/dist/.../583.*.js`,
`handleIncompleteOrderOnFormChange`) subscribes to `formData.valueChanges` with a 300ms
debounce and POSTs `add-incomplete-order-by-*` on every change **until the first response
returns an `_id`** (`isIncompleteOrderId`), only then switching to
`update-incomplete-order-by-id`. Address is the last field a customer types, so the extra
posts each created their own row holding phone only, and the address updates landed on
whichever add-response happened to win the race. Second, smaller leak:
`division`/`area`/`zone` were sent by checkout but absent from `IncompleteOrderSchema`, so
mongoose dropped them — a row where the customer picked a location but had not typed the
street showed nothing at all. Related to the earlier "Incomplete-checkout address capture
regression" entry below, but a different mechanism (that one was a 401 on the update route).

- `addIncompleteOrder` merges into the newest non-converted row for the same phone within
  `INCOMPLETE_ORDER_MERGE_WINDOW_MS` (6h) and returns that `_id`, so every later update
  funnels into one row instead of stacking duplicates.
- `buildIncompleteOrderMergePatch` skips empty strings, empty arrays and `0` totals, and the
  public update route (`allowConverted=false`) drops empty strings for the same reason — an
  early snapshot can never blank an address the customer already typed. Admin edits may
  still clear a field.
- Added `division`/`area`/`zone` to `IncompleteOrderSchema`, both DTOs, and both
  editable-field allowlists.
- `custom-orders.html`: new `rowAddress()` builds street → area → zone → division → city
  with dedupe; used by the list cell, the view modal, and the CSV export.

**Verified:** `tsc --noEmit` clean, `node --check` on the page's script block clean,
`rowAddress` cases → `"138/A Green Road, Dhanmondi, Dhaka"`, `"Mirpur, Dhaka"`,
`"Chittagong"`, `"—"`, `"Dhaka"`. Not verified against live data — no DB access from this
session.

**Still open:** the ~432 pre-existing rows stay fragmented; the fix only applies to new
checkouts. A one-off merge script (group by phone + day, keep the longest address, delete
the rest) has NOT been written or run — it touches production Mongo, so back up first.

### Meta Ads reported 5 purchases against 12 units sold — root cause + fix

**Root cause of lost website purchases.** `ui/dist/.../index.html:482` stashes the
`purchase_stape` payload in `sessionStorage` and only pushes it when the buyer reaches the
thank-you page (redirect fires on a 1.2s `setTimeout`). A closed tab, a dropped mobile
connection, or blocked storage loses that Purchase permanently. Meta's coverage stats
cannot reveal this: "percent of events sending" measures events that arrived, never the
ones that never fired — which is why Purchase showed fbc 98.2% / fbp 100% while the count
was short. Purchase CAPI had been deliberately removed from the API
(`gtm.service.ts:475`) to avoid duplicating Stape, leaving the browser as the single point
of failure.

**Current approach (supersedes the original gap-fill design).** The API sends every new
Purchase directly to Meta and requires `events_received >= 1`. It also sends the event into
Tagioo, while the browser keeps its existing Tagioo path. All copies use the stable
`event_id = order_<orderId>` and therefore require Tagioo's Meta tag to forward `event_id`
unchanged for deduplication.

- `gtm-snippets/meta-purchase-beacon.html` (new GTM tag): splices `attribution` into the
  `/add-order-by-*` POST (`_fbc`/`_fbp` cookies, `fbclid`, first/last-touch UTMs, the
  `_ab_xid` anonymous ID), stamps `event_id: order_<orderId>` on the `purchase_stape` push,
  and `sendBeacon`s the order id to `POST /api/order/purchase-fired`.
- `order.controller.ts` / `order.service.ts`: public `markBrowserPurchaseFired` sets
  `browserPurchaseFiredAt` + `browserPurchaseEventId` (idempotent).
- `addOrder` takes `req`, stamps `attribution.clientUserAgent` / `clientIpAddress`, and starts
  authoritative Tagioo + direct Meta delivery immediately after the order is saved.
- `scheduleWebsitePurchaseGapFill` is now a retry worker only: after 20 minutes it retries
  website orders explicitly marked failed/stuck, up to three attempts. It never sweeps old
  orders that have no tracking state.
- The API-served storefront patch adds `event_id` to the browser Purchase before its
  dataLayer push, so it matches the API copy even if the optional beacon tag is delayed.
- Incomplete-order add/update requests now persist attribution. Conversion by staff copies
  it into the real order and is forced to `manualOrderSource: phone`; ordinary admin orders
  continue to default to WhatsApp.

**Manual/WhatsApp order fixes.** The admin panel dist hardcodes `orderFrom:"admin"` and
sends no `manualOrderSource`, so every manually typed order fell through to `'other'` →
`action_source: 'other'`, the least attributable value Meta takes, and the existing
`whatsapp_ad → business_messaging` mapping was unreachable. Default is now `'whatsapp'`
(`chat`). `event_time` is clamped to `now - 6d` (`metaEventTime`) because `createdAt` on a
manual order is when an admin typed it — Meta rejects events older than 7 days outright.
Added `isDuplicateMetaPurchase` (same phone + same total within 24h, already reported) for
the case where a WhatsApp buyer also self-places on the site.

**Measurement, so this never needs a mongosh query again.**
`meta-tracking-health.service.ts` + `GET /api/dashboard/meta-tracking-health` and a new
**Meta tracking health** panel on `profit-dashboard.html`: per day, orders vs units,
website vs manual, browser-fired / website-API-sent / never-reported / manual-sent / failed,
coverage %, the last 10 failures with their error text, and sample beacon `event_id`s.
Only a direct Meta acknowledgement counts as reported; a browser push alone does not.

**Reconciliation.** `meta-ads.service.ts` pulled `spend` only. It now also requests
`actions,action_values` with `action_report_time=conversion` and
`action_attribution_windows=['7d_click','1d_view']`, storing `purchases`/`purchaseValue`
per day and per campaign. Conversion-time reporting is what makes Meta's count comparable
to our order records at all — the default credits a sale to the day of the click.

**Verified:** `nest build` passes; `git diff --check` clean. Attribution add/update harness
passes with fbc/fbp/fbclid and stable browser `event_id` injection. Snippet
exercised in a browser harness — attribution injected with fbc/fbp/campaign/fbclid,
existing attribution preserved, `event_id` stamped, inner (Stape) push still receives the
event, one beacon per order to the right URL as `application/x-www-form-urlencoded`,
repeat pushes deduplicated, non-purchase pushes untouched. Dashboard panel rendered against
fixture data (pill, 6 tiles, day rows, failure list). **Not verified live:** the API was
deliberately not started locally — `.env` may point at production Mongo. The repository's
`npm run lint` currently cannot run because no ESLint configuration exists, causing ESLint
8 to treat the configured source glob as ignored.

**Expectation check.** This closes the lost-browser-event bucket only. The rest of the
12-vs-5 gap is units vs orders (Meta counts purchase events, not copies), Ads Manager
reporting on click date, non-ad sales, and WhatsApp orders that stay unattributable until
`ctwa_clid` is available via the WhatsApp Cloud API. Campaign count should not equal order
count even when tracking is perfect.

- Meta Ads connected but ad spend stayed empty for every date range:
  - `syncSpend` logs (`Meta insights HTTP 200, body[0..300]: {"data":[]}`) showed a
    clean, error-free response with zero rows for both Today and Last 7 days —
    token/app/permissions were all fine. Root cause: `handleCallback` blindly took
    the *first* ad account from `/me/adaccounts`
    ([meta-ads.service.ts:61](api/src/pages/meta-ads/meta-ads.service.ts:61)), which
    only lists accounts the connecting Facebook user personally has a role on — not
    necessarily the one actually running Amolbooks campaigns. User confirmed the real
    ad account (`1025891126119809`, "Amol Books Ad Ac") via Meta Business Settings.
  - Fix: the backend already had `setAdAccountId`/`POST /api/meta-ads/set-account`
    for exactly this override, but no UI called it. Added an "Ad account" button next
    to Sync (visible once Meta is connected) that prompts for an ad account ID
    (prefilled with the currently stored one), posts it to `set-account`, then
    re-syncs automatically.
  - File: `api/upload/static/profit-dashboard.html`.
  - Inline-script syntax check, `git diff --check` → passed. Verified the button
    markup/handler render correctly via a static browser check (no live backend to
    exercise the full flow from this session).
  - Not yet verified end-to-end — user still needs to enter the correct ad account ID
    on the live dashboard and confirm ad spend populates after Sync.

- Meta Ads OAuth connect failing with "unexpected end of file":
  - Root cause: `handleCallback` used raw NestJS `HttpService` (axios) for the 3
    Graph API calls (short-lived token, long-lived token, `/me/adaccounts`), which
    requests gzip by default. A truncated gzip response crashes zlib decompression
    with the generic message "unexpected end of file", burying whatever real Meta
    error (or success) was underneath. `httpsGet()` in this same file already works
    around this with `Accept-Encoding: identity` (used by `syncSpend`/`diagnose`),
    but `handleCallback` predates that fix and was never migrated.
  - Fix: rewrote all 3 calls in `handleCallback` to use `httpsGet()` via a new
    `graphGetJson()` helper that parses the JSON and throws Facebook's actual
    `error.message` when present. Removed the now-unused `HttpService`/`firstValueFrom`
    import and constructor injection.
  - File: `api/src/pages/meta-ads/meta-ads.service.ts`.
  - `cd api && npm run build`, `git diff --check` → passed.
  - Not yet verified live — user confirmed `.env` values, app-live status, and
    restarts were already correct; diagnosis came from reading a real production
    log line (`pm2 logs amolbooks-api --lines 2000 --nostream | grep -i meta`)
    showing `Meta OAuth callback failed: unexpected end of file` twice. Verify by
    deploying and retrying Connect Meta — if it still fails, the log should now
    show Meta's real error text instead.

- Steadfast In Review count mismatch (dashboard showed 17, Steadfast panel showed 46):
  - Root cause: `runSteadfastInReviewSync` only re-checked orders already tagged
    `in_review` in our DB (to catch them leaving). Nothing re-checked orders stuck at
    `pending`/`hold`/`unknown`/`*_approval_pending` to see if Steadfast had since moved
    them into `in_review` — a missed or late webhook left those frozen forever. The
    existing "Backfill Courier" button didn't help either since it only targets orders
    with a completely empty `courierStatus.status`, and every order gets a status at
    creation.
  - Fix: the sync's candidate query now covers any non-terminal courier status
    (`$nin: ['delivered','partial_delivered','cancelled']`) instead of exact
    `in_review`, so the 60s live-check job also recovers orders that reached
    in_review without a webhook firing. The displayed count still queries exact
    `in_review` only. Added an `entered`/"recovered" count to the sync response and
    admin banner so the recovery is visible.
  - Files: `api/src/pages/sales/order/order.service.ts`, `api/upload/static/custom-orders.html`.
  - `cd api && npm run build`, inline-script syntax check, `git diff --check` → passed.
  - Not yet verified against live production numbers (no direct DB/Steadfast API access
    from this session) — verify by deploying and watching the "recovered" count in the
    In Review sync banner.
  - Note for future sessions: caught and fixed an unrelated Edit-tool side effect during
    this task — a targeted edit to `order.service.ts` silently normalized the entire
    file from mixed CRLF/LF to all-CRLF, producing a ~3500-line noise diff. Rebuilt the
    file from `git show HEAD` preserving original line endings before committing.
  - Pushed to `origin/main` as `33dd40b0`. VPS not yet deployed — run
    `scripts/vps-safe-pull.sh` then rebuild `api/` (source changed) per
    [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) deploy steps.

- Meta Ads OAuth diagnosis:
  - Meta callback failures now write a safe server-side error to the API logs and return to the dashboard with a clear configuration message instead of silently appearing disconnected.
  - The dashboard removes the one-time OAuth result query parameter after displaying it, keeping subsequent refreshes clean.

- Profit & Growth authentication recovery:
  - Fixed the standalone dashboard's re-login flow to use the admin API's `username` credential and top-level `token` response instead of incompatible email/nested-token fields.
  - Dashboard and custom-orders now share the refreshed admin token; a rejected/expired token is cleared and prompts for a new sign-in rather than leaving every profit metric stuck at `Unauthorized`.

- Steadfast missing-charge recovery:
  - Fixed the scheduled courier status poll so it updates nested courier-status fields instead of replacing the whole object and erasing an already-saved delivery charge.
  - Normalized Steadfast charge values from numeric strings and both `delivery_charge`/`delivery_fee` response variants across webhooks, status reconciliation, historical backfill, scheduled polling, and order creation responses.
  - A separate guarded background batch prioritizes delivered/partially delivered consignments missing a charge, then checks pending, held, and cancelled consignments. It retries each missing charge at most once per six hours and saves only an actual amount returned by Steadfast—never an estimated tariff.
  - Admin page initialization starts the guarded reconciliation automatically; the queue banner reports charges added, while failed or charge-less lookups retain Awaiting Charge with a diagnostic tooltip.
  - Separated missing-charge recovery from the visible In Review refresh after it made the tab wait for up to 50 courier lookups. The In Review response now processes only its own queue at a bounded concurrency of eight, then charge recovery continues independently at five concurrent requests; the browser also falls back to saved statuses after 35 seconds rather than leaving the queue spinner stuck.

- Live Steadfast In Review reconciliation:
  - Fixed the admin/Steadfast queue-count mismatch caused by stale saved `in_review` values: opening the tab now checks the current courier status server-side and repeats every 60 seconds while the tab is visible and no rows are selected.
  - Each run is admin-only, limited to 50 saved In Review consignments, uses five concurrent Steadfast requests, prevents overlapping runs, and reuses a result for 45 seconds to control courier API load.
  - Orders that Steadfast has advanced are updated in MongoDB and removed from the tab; unchanged orders only record their last check, while failed lookups retain their saved status and a bounded diagnostic instead of disappearing incorrectly.
  - Print Selected excludes orders moved out by the live check, and Print All refreshes the courier queue before fetching printable orders.

- Mobile order-view recovery:
  - Corrected the responsive table column map after Courier Status and Courier Charge shifted the View action from column 10 to column 12; mobile now keeps only the essential order fields and a large icon-only View button.
  - Reworked the order-details popup for phone viewports using safe-area padding, dynamic viewport height with `vh` fallback, a contained momentum-scrolling body, compact order/product sections, and a non-scrolling footer whose totals and actions remain reachable.
  - Added a narrower-phone layout that removes the name column from the list and stacks modal customer/address/payment panels to prevent horizontal clipping.

- In Review courier queue and thermal-label printing:
  - Added an exact courier-status In Review tab and count; orders leave the queue automatically after Steadfast changes their saved status, with a guarded 60-second refresh while the tab is visible and no rows are selected.
  - Added Print Selected and Print All In Review actions. Print All re-fetches the live queue immediately before rendering and caps a single print job at 300 labels for browser/printer safety.
  - Generated one 2×4-inch page per order with Amol Books merchant identity, consignment barcode, tracking QR, invoice/SF IDs, recipient details, COD, print time, and full Amolbooks product names/quantities. Long product lists use progressively compact typography.
  - Label generation stays in the browser; barcode/QR libraries receive no order payload over the network, and text fallbacks keep labels usable if either renderer is unavailable.

- Courier charge visibility:
  - Added a separate Courier Charge column beside Courier Status in the custom order list, showing the amount reported by Steadfast or an honest Awaiting Charge state when no webhook charge exists.
  - Added raw courier charge to CSV exports; the display remains separate from customer delivery fees and does not change profit calculations.

- Safe historical Steadfast status backfill:
  - Added a super-admin/admin-only endpoint and order-list button that retrieves missing historical courier statuses using saved Steadfast consignment IDs.
  - Backfill runs in resumable 15-order batches with at most three concurrent courier requests and a 10-second status-request timeout; closing the page or an API failure leaves untouched orders available for the next run.
  - Successful results are saved as courier status plus history without changing Amolbooks order/payment status. Failed consignments record a bounded error, are skipped so later orders continue, and require an explicit retry click to prevent infinite loops.

- Steadfast courier-status webhook and order-list column:
  - Added a bearer-authenticated Steadfast webhook endpoint that matches orders by consignment ID with invoice/order ID fallback, stores delivery/tracking updates and a capped event history, ignores duplicate deliveries, and prevents older events from replacing newer state.
  - Added a separate Courier Status column to the custom order list without changing Amolbooks order status, payment status, stock, or notifications.
  - Mapped all documented Steadfast delivery states, including in-review, hold, partial delivery, and approval-pending variants; tracking messages appear on badge hover and exports now include the raw courier status.
  - New Steadfast consignments immediately start as In Review. Corrected the existing six-hour fallback poll to match the configured courier properly and update only courier status, allowing recent pre-webhook orders to backfill.
  - Requires `STEADFAST_WEBHOOK_TOKEN` in production and the callback URL/token to be entered in the Steadfast panel.

- Checkout order-summary simplification:
  - The initial GTM-only delivery did not activate after a VPS pull because repository files do not publish a GTM container; moved the behavior into the existing API-injected storefront price script so the normal VPS build/restart deploys it automatically.
  - The enhancement removes the displayed list-price subtotal and discount rows from both mobile and desktop summaries.
  - The summary now shows the actual order value, shipping charge, and final payable total; actual order value is calculated as grand total minus shipping, with subtotal minus discount as a fallback.
  - Angular's original calculated values remain in the DOM, so quantity, coupon, and delivery-area changes continue to update the displayed amounts without hard-coding screenshot values.
  - Replaced the price script's fixed cache version with a content hash so nginx/Cloudflare cannot retain the pre-fix checkout script after deployment.
  - JavaScript syntax, a mobile/desktop checkout DOM fixture (৳602 plus a live recalculation to ৳710), `git diff --check`, and `cd api && npm run build` passed.
  - The API-injected script fixture also passed with the production screenshot values (৳250 − ৳55 = ৳195) and a live total/shipping update to ৳210 on both mobile and desktop summaries.
  - Follow-up fixture verified the restored final payable row: actual ৳195 + shipping ৳60 + final total ৳255, including recovery when the previous script had already marked the total row hidden.
  - `cd api && npm run lint` remains blocked before linting because ESLint reports the configured glob is fully ignored.

- Profit-dashboard sold-product completeness:
  - Removed the hard 50-row API cap that silently omitted sold products from longer dashboard ranges.
  - Product performance now returns every product with at least one unit in a valid order, excludes products found only in cancelled/refunded/returned orders, and sorts by units sold then net sales.
  - Added total distinct products and total units to the response and dashboard badge so the visible table can be reconciled against the selected period.
  - A 60-product fixture returned all 60 products and 1,830 units while excluding a cancelled-only product; dashboard inline-script parsing, `git diff --check`, and `cd api && npm run build` passed.
  - `cd api && npm run lint` still fails before linting because ESLint reports the configured glob is fully ignored.

- Stock management publisher filter:
  - Added an authenticated publisher-option endpoint sourced from publishers actually attached to products, including each publisher's product count.
  - Added a responsive publisher dropdown to the stock toolbar and publisher labels to product cards.
  - Publisher selection now scopes the paginated product list, all/low/out summary counts, and urgent-restock rail; free-text search also matches publisher names.
  - Stock page inline scripts parsed successfully, `git diff --check` passed, and `cd api && npm run build` passed (TypeScript deprecation warnings only).
  - `cd api && npm run lint` still fails before linting because ESLint reports the configured glob is fully ignored.

- Incomplete-checkout address capture regression:
  - Found that checkout first creates an incomplete order when the phone number becomes valid, then progressively updates that record as the customer enters the address and other fields.
  - The July 24 admin-editor security change put `AdminJwtAuthGuard` on the shared update endpoint, causing every storefront follow-up update to return 401 and leaving the initial phone-only record in the dashboard.
  - Restored the existing storefront update route with a strict checkout-field allowlist and protection against modifying converted records.
  - Added a separate admin-authenticated update route for editor changes, fraud results, and admin notes; conversion/audit fields remain immutable.
  - Existing address-less records cannot be backfilled automatically because the rejected address values were never persisted; they can be completed manually with Edit.

- Meta Purchase External ID coverage:
  - Confirmed the existing Web GTM Purchase tags already map `user_data.customer_id` to Meta `external_id` and the Data Tag's `user_id`; the missing source value, rather than the tag configuration, was the root cause.
  - Storefront Purchase payloads now include the existing persistent first-party anonymous ID as `user_data.customer_id` before the pending Purchase is released to GTM. Existing customer IDs are preserved.
  - Direct `/api/gtm/*` browser payloads now carry the same customer ID alongside the analytics anonymous ID.
  - Manual/admin purchases now send `user_id` through Tagioo and `external_id` through the direct Meta fallback, preferring the account ID, then attribution ID, then a deterministic non-plaintext customer key.
  - No event names, values, triggers, Pixel IDs, tokens, or Purchase deduplication IDs were changed.

- Manual admin-order Tagioo delivery:
  - Changed authenticated admin/AI-assisted Purchase tracking from direct-Meta-only to Tagioo server GTM first, using the already-published first-party Data Client endpoint at `https://server.amolbooks.com/data`.
  - Manual Purchase events now carry the stable order event ID, final grand total/currency, order and catalog product IDs, quantities/prices, source, and SHA-256 customer matching fields so the existing server-container Purchase tags can process them.
  - Kept the direct Meta CAPI integration as a same-event-ID fallback only when Tagioo transport fails, preventing lost conversions while retaining Meta deduplication safety.
  - Persisted whether each Purchase used Tagioo or direct fallback, the Tagioo event ID, and any Tagioo transport error for production diagnosis.
  - Sent a harmless `amolbooks_manual_transport_test` event to production `/data`; it returned HTTP 200 with a server `unique_event_id`, proving the Data Client is live without generating a fake Purchase.
  - After production showed the SDK-style POST as an incoming Purchase but omitted it from Purchase Inspector, aligned backend delivery with the web container's existing Data Tag transport: `event=purchase` plus Base64-encoded event metadata in `dtdc`. A harmless custom-event probe of this exact transport returned HTTP 200 and the expected tracking-pixel response.

- AI Assist definitive spinner/root-cause fix:
  - Fixed the actual browser exception: the separate AI Assist IIFE was calling private `getToken`, `authHeaders`, and `showLogin` functions from another scope after enabling the spinner, so execution stopped before either the request or timeout existed.
  - Made AI Assist authentication self-contained, exposed the existing order-list refresh intentionally, and added an authenticated request-ID status endpoint so a saved order is recognized even if the original POST response is delayed.
  - The modal now polls durable order state and has a hard 20-second terminal deadline on every path, while retaining duplicate-safe retries.

- AI Assist order-creation hang fix:
  - The authenticated admin endpoint now returns immediately after the order is durably saved; incomplete-order marking, sales counters, stock, invoice, fraud, cart, SMS/email, and Meta work no longer hold the modal request open.
  - Added a stable per-attempt manual-order request ID with database uniqueness, so a browser timeout or retry returns the already-created order instead of creating a duplicate.
  - Added a 30-second browser abort that always restores the Create Order button and gives a safe retry message rather than leaving the modal on “Creating…” forever.

- Manual admin-order Meta delivery reliability:
  - Detached the authenticated manual-order Meta CAPI Purchase from the shared stock/invoice/fraud/SMS/email background chain, so an unrelated operational failure can no longer skip the Meta event.
  - Added three bounded CAPI attempts using the same stable order event ID for safe Meta deduplication, plus a 10-second HTTP timeout and persisted sent/failed/attempt diagnostics on the order.
  - Added capped recovery on API startup and every five minutes for recent manual orders that were missed, failed, or left in a stale sending state; this also recovers across a process restart without replaying successful events.
  - Website orders remain on the Tagioo path and are excluded from this direct manual-order CAPI flow, preventing duplicate Purchase events.

- Offline/manual Meta Purchase tracking hardening:
  - Removed the public anonymous `source: admin_manual` marker. AI Assist now uses a dedicated authenticated endpoint that reloads selected products, computes discounted totals server-side, and delegates to the proven admin-order creation flow; website orders continue through Tagioo and cannot enter the offline CAPI branch.
  - WhatsApp orders now send Meta Purchase with `action_source: chat`; click-to-WhatsApp, phone, email, walk-in, and other manual sources map to their corresponding Meta action sources.
  - Manual Purchase payloads use final order totals and Mongo product IDs matching the Meta catalog, with normalized/hash-only customer matching data.
  - Added atomic MongoDB claiming plus persisted sending/sent/failed state and stable order event IDs, preventing repeated application submissions and recording real Meta acknowledgement or failure.

- Tagioo server-side tracking migration:
  - Added an idempotent API startup/response patch that replaces the hardcoded Stape web GTM loader and noscript URLs with Tagioo's first-party loader on `server.amolbooks.com`, without directly editing the compiled storefront.
  - Kept the existing Web GTM container ID, dataLayer event names, server event domain, and delayed-loading behavior unchanged.
  - Corrected ViewContent, AddToCart, and InitiateCheckout server-side values to use each product's final `afterDiscountPrice`, with the storefront's cash/percentage discount calculation as a fallback. Purchase remains unchanged and continues to include the final order total such as delivery charges.
  - Made Brave/Shields Purchase delivery resilient: the first-party Tagioo loader starts immediately on the order-success route, pending Purchase stays in session storage until the loader signals ready, and the normal 10-second GTM delay remains on every other route.

- Profit & Growth decision dashboard:
  - Added authenticated `GET /api/v2/dashboard/decision-analytics` without breaking the existing profit endpoints. The response contains summary/comparison metrics, trend, product performance, order quality, funnel, ranked opportunities, and data-quality coverage with actual/estimated/allocated/unavailable money bases.
  - Split contribution into expected profit for valid active/placed orders and realized profit for delivered orders, with cancellation/refund/return handling, equal-length previous-period comparisons, Dhaka date boundaries, allocated ad spend, and explicit missing-data warnings. Missing COGS or incomplete daily ad coverage now makes profit unavailable instead of silently subtracting zero.
  - Snapshot `costPriceAtOrder` on new order lines and added actual courier, packaging, payment, refund, and return-loss fields. Existing lines without snapshots remain unavailable until reviewed and backfilled; current catalog cost is never substituted into historical profit.
  - Added persistent first/last-touch order attribution plus a stable anonymous storefront ID, and made PostHog funnel queries reuse that identity when the required environment variables are configured.
  - Extended paginated daily Meta synchronization with campaign/ad-set/ad breakdowns, added product profitability/stock-cover decisions, frequent product-pair candidates, source/payment/location/customer/value-band quality segments, and new/repeat customer, second-purchase, reorder-interval, and customer-value metrics.
  - Standardized manual phone/WhatsApp sales with outcome, payment, campaign, phone, products, and operational-cost fields; moved all entry forms into a drawer.
  - Replaced the fixed-width report with a responsive Workbench dashboard: eight comparison scorecards, Action Center, funnel, daily/weekly trend, compact heatmap, product decision table, order quality, and data quality. Verified 320/375/414/768/1440px with no page overflow.
  - Added authenticated order-cost correction and recommendation-action endpoints. “Mark acted” stores the recommendation baseline and later returns before/after metric deltas for the experiment loop.
  - New optional funnel configuration: `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, and `POSTHOG_QUERY_HOST` (defaults to `https://us.posthog.com`).

- Incomplete-order editing:
  - Added an Edit action to unconverted rows in the API-served incomplete-orders dashboard, without changing the compiled admin bundle.
  - Added a responsive editor for customer/contact/address/payment details, customer note, delivery charge, products, quantities, and per-product unit prices.
  - Product add/replace uses Amolbooks' existing catalog search API; product, delivery, and grand totals recalculate immediately and the saved values flow into the existing Add Order and Send to Courier actions.
  - Added an API-served, cache-busted editor asset and restricted incomplete-order updates to authenticated admins plus an explicit editable-field allowlist, protecting conversion and audit fields.
  - Fixed VPS deployment of the editor button: the safe-pull script now permits only tracked `api/upload/static/*.html` application assets while continuing to exclude product images, invoices, CSVs, backups, and every other runtime upload path.

- Special-package detail redesign implementation:
  - Added an API-served storefront enhancement for `/special-package-details/:id`, leaving compiled Angular artifacts untouched.
  - Reframed the oversized offer banner as a responsive Split Studio layout with package title, description, book count, and package price alongside contained artwork.
  - Added sanitized short descriptions to every included book and replaced misleading list-price-only labels with calculated selling prices and savings (for example, ৳550 − ৳240 = ৳310 and ৳900 − ৳194 = ৳706).
  - Restyled the included-book rows, metadata, price summary, and mobile purchase actions using the existing Amol green/cream visual language.
  - Removed translator and category fields from package book rows, and simplified the package totals to book count plus the actual discounted package price only.
  - Package pricing is now dynamic: sum each included product's discounted unit price multiplied by its package quantity, then apply the backend package-level cash or percentage discount once.
  - Removed the duplicate injected bottom total so the page uses Angular's backend-calculated package total, and changed the injected script URL to a content hash so Cloudflare's immutable cache cannot keep serving stale pricing code after deployments.

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

- `api/src/pages/sales/order/order.service.ts` — incomplete-order add now merges by phone
  instead of inserting duplicates; empty values never overwrite filled fields.
- `api/src/schema/incomplete-order.schema.ts` / `api/src/dto/incomplete-order.dto.ts` —
  persist `division`/`area`/`zone` from checkout.
- `api/upload/static/custom-orders.html` — `rowAddress()` for the list, modal and CSV.
- `api/src/pages/dashboard/decision-dashboard.service.ts` — versioned decision analytics, trusted profit calculations, recommendations, cohorts, and experiment baselines.
- `api/src/pages/dashboard/schema/analytics-action.schema.ts` — persistent acted-on recommendations.
- `api/upload/static/profit-dashboard.html` / `profit-dashboard-tokens.css` — responsive decision cockpit and named visual tokens.
- Order/manual-sale/Meta schemas and order service — historical costs, attribution, operating-cost fields, richer phone sales, and granular ad spend.
- `api/src/storefront-attribution-script.ts` / `api/src/main.ts` — stable storefront identity and first/last-touch capture without editing compiled UI assets.
- `scripts/vps-safe-pull.sh` — explicitly permits the tracked dashboard token stylesheet while preserving runtime uploads.
- `api/src/main.ts` — injects the local storefront price script into served SPA HTML.
- `api/src/admin-incomplete-order-editor-script.ts` — responsive incomplete-order editor served by the API.
- `api/upload/static/custom-orders.html` — exposes Edit on unconverted incomplete-order rows.
- Incomplete-order controller/service — require admin authentication and safely persist editor fields.
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

- Incomplete orders created before `991a080a` are still split across duplicate rows with the
  address on whichever row won the race. Needs a one-off merge script (group by phone + day,
  keep longest address, delete the rest) run against production Mongo after a backup.
- Historical orders created before this change need a reviewed COGS/courier/fee backfill to become fully actual; missing historical COGS makes contribution unavailable meanwhile.
- PostHog funnel stages remain unavailable until the personal API key and project ID are configured in production.
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

- `cd api && npx tsc --noEmit` after the incomplete-order duplicate/address fix → passed.
- `node --check` on the `custom-orders.html` script block containing `rowAddress` → passed.
- `rowAddress()` extracted and run against 5 fixtures (street+area+division, location only,
  whitespace-only address, empty order, duplicate city/street) → expected output.
- `git push origin main` → `032a9b10..991a080a`.

- Incomplete-order public/admin update allowlist smoke test: storefront address persisted, privileged/immutable fields were rejected, converted records were protected, and authenticated admin fields remained available → passed.
- `api/upload/static/custom-orders.html` inline scripts and the injected incomplete-order editor script syntax checks → passed.
- `cd api && npm run build` after the incomplete-order address fix → passed (TypeScript deprecation warnings only).
- `cd api && npm run lint` after the incomplete-order address fix → still cannot lint because the configured glob is fully ignored.
- `git diff --check` after the incomplete-order address fix → passed.

- Storefront External ID fixture: created a pending Purchase without `customer_id`, ran the injected attribution script, and confirmed the stable ID was persisted and added to the Purchase → passed.
- `cd api && npm run build` after Meta Purchase External ID coverage → passed (TypeScript deprecation warnings only).
- `cd api && npm run lint` after External ID coverage → still cannot lint because the configured glob is fully ignored.
- `git diff --check` after External ID coverage → passed.

- Tagioo Data Client production probe (`amolbooks_manual_transport_test`) → HTTP 200 with a server `unique_event_id`; no fake Purchase was sent.
- `cd api && npm run build` after manual-order Tagioo routing → passed (TypeScript deprecation warnings only).
- `cd api && npm run lint` after manual-order Tagioo routing → still cannot lint because the configured glob is fully ignored.
- `git diff --check` after manual-order Tagioo routing → passed.

- Profit decision fixture: verified cancelled revenue exclusion, expected contribution ৳218, allocated realized contribution ৳144.43, 67% historical COGS coverage, restock recommendation, 50% second-purchase rate, and recommendation baseline persistence.
- Historical-cost drift fixture: changed the catalog cost of a legacy line from ৳100 to ৳999; both overall and product contribution remained unavailable instead of rewriting history → passed.
- Profit-dashboard and storefront-attribution JavaScript syntax checks → passed.
- Profit-dashboard browser fixture: populated metrics, basis labels, Action Center, funnel, trends, product decisions, order-quality segments, and data warnings rendered with no browser errors.
- Profit-dashboard interaction checks: Daily/Weekly switch, data-entry drawer, and Mark acted controls → passed.
- Profit-dashboard responsive audit at 320/375/414/768/1440px: no document overflow, no wrapped buttons, responsive scorecard columns, and horizontally contained product table → passed.
- `cd api && npm run build` after the decision dashboard and experiment loop → passed (TypeScript deprecation warnings only).
- `cd api && npm run lint` → still fails before linting because ESLint reports the configured glob is fully ignored.
- `bash -n scripts/vps-safe-pull.sh` and `git diff --check` → passed.

- Live production check after the first deploy → confirmed the old dashboard HTML had no Edit button or editor script because `vps-safe-pull.sh` skipped all `api/upload/*` paths.
- Incomplete-order editor JavaScript syntax check → passed.
- Mocked DOM/load/product-search/totals/save flow → passed; verified Amolbooks catalog request shape and admin auth header.
- Incomplete-order update allowlist smoke test → passed; editable values persist while forged `status` and `orderId` values are ignored.
- `cd api && npm run build` after incomplete-order editing → passed (TypeScript deprecation warnings only).
- `cd api && npm run lint` after incomplete-order editing → still fails before linting because ESLint reports the configured glob is fully ignored.
- `git diff --check` after incomplete-order editing → passed.
- Storefront special-package cache-bust check: injected asset version is now the first 12 characters of its SHA-256 content hash (`d8e6e766a7c1` for this build), with no hardcoded package price or duplicate bottom-total element → passed.
- Live special-package API check: product subtotal ৳1,228, cash discount ৳20, final Angular package total ৳1,208 → passed.
- Live responsive audit at 320/375/414/768px: no horizontal overflow and purchase button labels remain single-line.
- Live production inspection: Angular's original package total was correctly ৳1,208, while Cloudflare served the old hardcoded ৳1,221 injected script from an immutable one-year cache under unchanged `?v=20260724-1`.
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
- Storefront product-page repair: added a same-origin localhost catalogue proxy, including a reliable read-only library endpoint, so injected category shelves and author records use the published catalogue instead of fixture-only local data. Added a legacy profile-image fallback for the Khalid Abu Shadi author record. Verified the Moner Moto Salat category shelves populate and its author image resolves to the published profile image.
- Sticky product-page search now mirrors text and Enter submission to the compiled header's real search control, preserving the storefront's native search flow.
- `cd api && npm run build` after the storefront repair → passed. `npm run lint` remains blocked before linting because the configured glob is fully ignored.
- Cart recently-viewed shelf: moved it outside Angular's `app-cart` host so cart redraws cannot remove and recreate it, eliminating the visible flicker. `cd api && npm run build` → passed.
- Cart desktop layout: locked the recently-viewed shelf to one compact four-card row, normalized its card/image/text/button geometry, and suppressed the product-only sticky actions on the cart route. Mobile rules are unchanged. Verified at 1024/1440px with no horizontal overflow; API build passes, while lint remains blocked by the existing all-files-ignored ESLint configuration.
- Cart desktop offer panel: rebuilt the free-notebook progress area and three suggested-book cards into a compact, aligned grid with restrained typography and proper cart buttons. Rules start at 768px; phone layout remains unchanged.
- Cart popular-books shelf: restored the native “জনপ্রিয় কিছু বই দেখুন” carousel while keeping unrelated cart-route product sections suppressed.
- Cart popular-books desktop actions: replaced raw browser buttons with full-width Amol-green Add to Cart controls, including hover, focus, active, and disabled states. Mobile styling remains unchanged.
- Checkout cleanup: permanently hide the competing free-notebook offer widgets on the checkout route instead of repeatedly removing/recreating them, and constrain the Cash on Delivery icon to 40px.
- Cart synchronization: corrected the injected cart key to Angular's real `Amolbooks_USER_CART_1`, one-time merges/removes the wrongly cased legacy cart, keeps the native bottom-navigation count aligned, and forces full cart/checkout route loads so every surface rebuilds from the same product list.
- Cart gift offer add: cache gift-card product metadata before buttons render and use that cache for immediate cart-page repaint, so gift products add dynamically even from an empty local cart. Local cart reads now use the local cart snapshot to avoid stale authenticated responses.
- Product-detail category shelves: replaced the preview-only `/library` request with the production-supported `/product/get-all` catalogue request, so “বিষয়ভিত্তিক জনপ্রিয় বই” loads from published, in-stock products on both localhost and the live site.
- Special-package Add to Cart now reuses the standard product confirmation modal and its cart-page CTA; the lower mobile Add to Cart and Buy Now controls are full width. Verified the lower button opens the modal, the modal navigates to `/cart`, and the package renders there at ৳1,208. `cd api && npm run build`, `git diff --check`, and the focused test-script syntax check pass; lint remains blocked by the existing all-files-ignored ESLint configuration.
- Cart action deduplication: the temporary fallback footer now removes itself after Angular's native footer mounts, leaving one “আরও কিনুন” and one in-card checkout control. Cart remove controls now use an immediate inline SVG instead of the delayed Font Awesome glyph. Verified live with one footer, two rendered remove buttons, and two inline trash SVGs; `cd api && npm run build` passed.
- Cart remove icon refinement: replaced the solid bin with a larger rounded outline matching the supplied reference while retaining the dependency-free inline SVG. Verified the rendered path in the live mobile cart; `cd api && npm run build` passed.
- Desktop cart remove icon: moved the shared remove-control styles out of the phone-only breakpoint, fixing the desktop SVG collapse from 0×0 to 23px inside a 44px accessible button. Verified live at 1024px; `cd api && npm run build` passed.
- Product utility icons: replaced the delayed Font Awesome stock, gift-list, and share glyphs with dependency-free inline SVGs while preserving the native parent controls and stock-green treatment. Live verification found all three rendered SVGs and zero remaining target font icons.
- Mobile bottom navigation icons: embedded dependency-free SVGs inside the existing Home, Catalogue, Cart, and Login Font Awesome elements, preserving the class-based navigation and cart-badge hooks. Live verification found four 25px SVGs with all native labels intact; `cd api && npm run build` passed.
- Special-package PDF reader: added a delegated close-button handler so the visible × remains functional when the dialog DOM is recreated. Verified on `/special-package-details/6ac0b248b1f44997b7cd9a0b` that the dialog opens, the × removes `is-open`, and body scrolling is restored; the focused redesign check and `cd api && npm run build` pass. Lint remains blocked by the existing all-files-ignored ESLint configuration.
- Special-package cart/typography refinement: suppressed both the native cart toast and injected cart modal on package-detail routes while preserving the cart mutation, button feedback, and badge update. Switched book descriptions to the storefront's mapped light Bengali face. Browser verification confirmed Add to Cart changed the badge from 4 to 5 with neither overlay visible and the selected description computed at weight 500; focused checks and the API build pass.
- Cart popular-books add repair: recommendation buttons now upgrade to the same product-ID-backed cart action used by the other injected product shelves after their product data loads. The cart renderer also creates a complete row when the native cart has no existing row to clone, so adding from an empty cart appears immediately without a reload.

## Do NOT touch / be careful

- `ui/dist`, `admin/dist` — compiled artifacts, no source. Don't hand-edit.
- `api/upload/*`, `api/backup/db/*` — runtime data, gitignored. Never track or wipe.
- `api/node_modules/` — never re-track (Linux/Mac native-binary crash history).
- On VPS: never `git clean` / `reset --hard` / `stash -u`; use `scripts/vps-safe-pull.sh`.
- Every `npm install` needs `--legacy-peer-deps`.

## Customer Manager performance — 6 October 2026

- Filters update automatically (400 ms typing debounce); order-product search responds as you type (300 ms). Existing Apply/Search buttons remain. Requests cancel previous work and ignore obsolete results; refresh errors retain loaded rows. Customer selection toggles row highlighting without repainting the table; full histories render only when opened. No external UI libraries added.
- Default list aggregation skips purchase-item arrays and catalog joins when those filters are absent. Detail narrows phone candidates before normalization, scans orders once for counts/history, and loads contacts in parallel. Contact logging validates customer existence without fetching full history. Purchased-book search prefilters matching item names. Phone normalization and delivered-only rules retained.
- API build and isolated Mongo/HTTP/Chrome checks pass, including automatic filtering, sales-role access, mobile layout and repeat-order persistence/stock/idempotency. Optional 10,000-order fixture benchmark: median detail 45→8 ms, list 221→217 ms, category 225→288 ms (local measurements, not production guarantees). Lint still fails because all matching source files are ignored by existing ESLint configuration.

## Book-specific notebook gifts — 11 October 2026 (Sunday rollback)

- Added Productive Muslim → one free Amol Notebook rule, configurable through `/upload/static/book-gift-offers.html` (Admin/SuperAdmin only). Shared gift product and existing spending/two-copy rules are retained; saving an empty book-rule list disables book-specific offers.
- New GTM gift card appears directly below the existing “সম্ভাব্য ডেলিভারি” estimate for qualifying books. SPA navigation removes it elsewhere; notebook metadata refresh avoids stale images. Local API_BASE uses the current host `/api`; published pages use `https://apisub.amolbooks.com/api`.
- Backend order pricing and cart eligibility honor book rules without duplicate notebook gifts. Storefront now honors the saved spending threshold rather than overriding it with 799.
- Initialized nonproduction development offer settings, preserving published legacy offer values. Added missing Productive Muslim and Amol Notebook development catalogue fixtures from public read-only catalogue responses. Previous offer document backed up in ignored `tmp/`. No production settings changed or deployment performed.
- API build passes. Gift eligibility/validation/HTTP role checks, responsive card/admin checks, existing cart-state and product-detail checks pass. Actual localhost Productive Muslim page verified at 320/375/414/768/1440px: card follows delivery estimate, image loads, unrelated book excluded. Lint remains blocked by existing all-files-ignored ESLint configuration.
- Dev server runs from `codex/rollback-sunday-20260927` checkout on port 3001. Existing unrelated working-tree changes preserved.

- Gift card copy updated to “এই বইটি আজকে অর্ডার করলে সাথে পাবেন আকর্ষণীয় ৭২ পৃষ্ঠার এই নোটবুকটি”; notebook link and quantity-specific wording retained.

- Gift card responsiveness now matches the delivery estimate: 14px heading, 13px body, matching padding/breakpoints/460px desktop cap, and compact notebook thumbnail. Existing offer text retained.

- Gift card visibility improved with a warm cream/green background, green edge, compact “ফ্রি উপহার” badge, stronger notebook link and subtle shadow. Responsive layout and small body text preserved; no animation added.

- Enlarged gift notebook thumbnail from 40×52 to 72×92px with less internal padding, preserving small copy and responsive card layout.

- Fixed blank cart gift offer: Sunday cart eligibility referenced an undefined package helper; now checks the existing specialPackage field directly. Included eligibility in the render key so equal-value cart changes refresh the offer correctly.
- Gift row now clones any ordinary cart row, including locally generated rows, rather than requiring an Angular-native row.
