# CURRENT_WORK

Living status doc. Update after meaningful progress.

_Last updated: 2026-08-18. Branch: `main`. Purchase-path consolidation and non-zero checkout tracking are verified locally after live Meta tests; awaiting deployment._

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

**Authoritative Meta Purchase tracking (built locally, not yet deployed).** The API now
sends every new website/manual Purchase directly to Meta and requires Meta's
`events_received` acknowledgement before marking it tracked. It also sends the same event
through Tagioo for the existing server-container pipeline. Browser, Tagioo and direct CAPI
all use `event_id = order_<orderId>`, so Meta can deduplicate them.

Before deployment, verify in Tagioo preview that the Meta Purchase tag forwards the incoming
`event_id` unchanged. This is mandatory; without it, the browser/Tagioo copy cannot
deduplicate against the direct API copy.

Deployment order:

1. Verify/publish the Tagioo `event_id` mapping.
2. Deploy the API with `scripts/vps-safe-pull.sh`, then `npm install --legacy-peer-deps`,
   `npm run build`, and `pm2 restart amolbooks-api`.
3. Publish/update `gtm-snippets/meta-purchase-beacon.html` on All Pages. The API-served
   storefront attribution script already captures attribution and stamps the stable event
   ID; this GTM tag adds browser-fired health telemetry.
4. Test one website order, one incomplete-order phone conversion, and one WhatsApp order.
   For each, confirm the same `order_<orderId>` in Tagioo and Meta Test Events and one
   deduplicated Purchase in Meta.

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

## Do NOT touch / be careful

- `ui/dist`, `admin/dist` — compiled artifacts, no source. Don't hand-edit.
- `api/upload/*`, `api/backup/db/*` — runtime data, gitignored. Never track or wipe.
- `api/node_modules/` — never re-track (Linux/Mac native-binary crash history).
- On VPS: never `git clean` / `reset --hard` / `stash -u`; use `scripts/vps-safe-pull.sh`.
- Every `npm install` needs `--legacy-peer-deps`.
