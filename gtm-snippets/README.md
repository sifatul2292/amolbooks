# Sales-boost widgets — install guide

Frontend ships as compiled Angular (`ui/dist`), no source. So all on-page UI is
delivered via **GTM Custom-HTML tags** in container **GTM-NNZV54QJ** (server-side
via Stape, `load.server.amolbooks.com`). The data comes from the NestJS API.

## Meta Purchase Event ID deduplication

`GTM-NNZV54QJ_purchase-event-id-fix.json` is a focused Web GTM merge import. It
adds the Data Layer variable `dlv - event_id`, maps `[Stape] Meta - Purchase` to
that stable value, and pauses `[Stape] DT - purchase`. The API already sends the
authoritative server Purchase with richer customer matching data, so the DT tag
was producing a second, weaker server copy that diluted Meta's customer-data
coverage even though Meta successfully deduplicated it.
The file also bundles the exact Facebook Pixel by Stape and Data Tag custom
templates required by those two tags, so it can be imported into a workspace
where GTM validates custom-template dependencies during import.

Import it into Web container `GTM-NNZV54QJ`, choose **Merge**, then choose
**Overwrite** for the two conflicting Purchase tags. Preview the workspace and
confirm the browser Meta Purchase tag shows `{{dlv - event_id}}` instead of
`{{Unique Event ID}}` and `[Stape] DT - purchase` is paused; then publish. Keep
the GA4 Purchase tag enabled. Do not import this file into the server container.

## GA4 website-purchase fallback

`GTM-PZPN8VW3_ga4-purchase-fallback.json` is a minimal corrected
server-container import for Tagioo. It intentionally excludes the container's
Meta token and unrelated configuration. Import it into server container
`GTM-PZPN8VW3`, merge the workspace, overwrite the conflicting GA4 tag, preview
the three-item diff, and publish only after confirming it.

The added trigger runs the existing `[Stape] GA4 - Base` tag, with the GA4
measurement ID set explicitly, only when a `purchase` is claimed by the Data
Client and `order_source` is `website`.
Admin and incomplete-order conversions therefore remain outside GA4 website
ecommerce. The API supplies the client/session, engagement, and stable
transaction fields. If the browser purchase also arrives, GA4 uses the
identical `transaction_id` to deduplicate the purchase.

Each `.html` file = one GTM Custom-HTML tag. Paste the file contents (including the
`<script>` tags) into a new Custom-HTML tag.

## Tags

| File | What it shows | Where |
|------|---------------|-------|
| `lever2-urgency.html` | Countdown to discount end, low-stock "মাত্র N কপি বাকি", "N+ কপি বিক্রি হয়েছে" | Product page |
| `lever3-sticky-cta.html` | Sticky bottom Order bar (mobile) + rotating ticker: real recent buyers + bonus-urgency line | Product page, mobile ≤768px |
| `lever1-buy2-banner.html` | "২টি কিনুন — নোটবুক ফ্রি" banner | Only the configured book |
| `lever0-cart-threshold.html` | Live cart progress + free-notebook row after either gift rule is earned | Cart page / cart drawer |
| `lever7-checkout-summary.html` | Three-row summary: actual order value + shipping + final total | Checkout page |

## GTM setup (per tag)

1. Tags → New → **Custom HTML** → paste file contents.
2. Triggering: add **All Pages** AND a **History Change** trigger (the site is a SPA;
   History Change re-fires the tag on route changes). Each tag is idempotent and
   also self-polls `location.pathname`, so double-firing is safe.
3. Name it (e.g. `AB - Lever 2 Urgency`), Save.
4. Use **Preview** to test on a product page + the cart page before Publish.

## API base URL

Each snippet has at top:
```js
var API_BASE = 'https://apisub.amolbooks.com/api';
```
This is the value found in the current `ui/dist`. If production uses a different
API host, change this line in every snippet before pasting.

## Backend changes (already in this repo, deploy required)

- `GET /api/order/recent-buyers/:slug` — public, returns `[{ firstName, purchasedAt }]`
  for the social-proof ticker. **First name only** — no phone/email/address.
  (`order.controller.ts`, `order.service.ts`)
- Free-gift engine in `order.service.ts` `newOrderMake` → `evaluateGiftLine()`.
  Attaches a zero-price gift line (`orderType:'gift'`, `isGift:true`) when eligible.
  The ৳750 rule uses the payable/sale-price subtotal, matching the cart popup.
  Does **not** change subtotal/discount/grandTotal.
- Gift config fields added to the single `OrderOffer` doc
  (`order-offer.schema.ts`, `order-offer.dto.ts`) and the gift flag on
  ordered items (`sub-schema.schema.ts` `ORDER_ITEM_SCHEMA.isGift`).

### Configure the gift offer

The notebook must exist as a real **Product** (so the gift line has a valid product id).
Set the config on the OrderOffer doc via the existing admin `POST /api/order-offer/add`
(it upserts the single config doc). Example payload:

```jsonc
{
  "giftEnabled": true,
  "giftMinAmount": 750,                      // Trigger A: cart subtotal >= 750 (all products)
  "giftBuyXProductSlug": "<this-book-slug>", // Trigger B: buy 2 of this book
  "giftBuyXQty": 2,
  "giftLabel": "ফ্রি নোটবুক",
  "giftProduct": {
    "_id": "<notebook-product-objectid>",
    "name": "আকর্ষণীয় নোটবুক",
    "slug": "<notebook-slug>",
    "image": "<notebook-image-url>"
  }
}
```

Public read used by the widgets: `GET /api/order-offer/get` (returns the same doc).
Because the widget threshold is read from this config, the on-page promise always
matches real fulfillment — no customer hits ৳750 and gets nothing.

## Truthfulness guards (built in)
- Urgency rows render only when the value is real (future end date / low stock / sold>0).
- Ticker uses real buyer first-names; if none, shows the urgency line alone — never a fake name.
- Threshold copy is driven by `giftMinAmount` from the same config the backend honors.

## Live-site safety (high-traffic, made before VPS pull)

- **Order checkout can't be broken by gift config.** `evaluateGiftLine()` validates
  `giftProduct._id` with `Types.ObjectId.isValid` and is wrapped in try/catch returning
  `null` — a bad/missing config logs and is skipped, the order still saves. `giftEnabled`
  defaults `false`, so zero behavior change until you seed config.
- **recent-buyers won't hammer the DB.** Results are cached in-process for 120s per slug,
  so pageview volume does not translate to query volume. Query also has `.maxTimeMS(2000)`
  and degrades to an empty list on any error (never 500s a product page).
- **No new DB index is auto-created.** Adding a schema index would trigger a background
  index build on the live `orders` collection at deploy. Skipped deliberately. If you want
  the recent-buyers query faster at the source, build this index **manually, off-peak**:
  ```js
  db.orders.createIndex({ "orderedItems.slug": 1, createdAt: -1 }, { background: true })
  ```
  Optional — the 120s cache already protects the DB without it.
- **API call volume is deduped.** All four tags share `window.__abGet` (60s cache), so a
  product pageview makes at most one `get-by-slug`, one `order-offer/get`, one `recent-buyers`
  — not 3×/2× duplicates.
- **Deploy is API-only + GTM.** No `ui/dist` changes. Backend deploy ships new code; GTM
  tags publish independently. Roll back GTM instantly by pausing tags if anything looks off.

## Notes / limitations
- Lever 0 progress bar on the **cart page** reads the rendered total from the DOM
  (cart is server-side, not in localStorage). It falls back to the static teaser if
  the total can't be parsed. Re-verify the scrape after any Angular rebuild.
- The cart and checkout widgets also read the SPA cart mirror from `localStorage`
  for the "buy 2 of this book" rule. They show the notebook row immediately; the
  real ৳0 order item is still attached server-side at checkout.
- Sticky-CTA proxy-clicks the real Angular "অর্ডার করুন" button (located by text);
  re-verify the selector after an Angular rebuild.
- Analytics: sticky CTA pushes `ab_sticky_cta_click` to `dataLayer` for lift tracking.
