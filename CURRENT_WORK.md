# CURRENT_WORK

## Free notebook cart offer cleanup (2026-08-31)

- Added site-wide Add to Cart tracking for non-product-page cart buttons.
  Native homepage/list card buttons, injected recommendation buttons, cart
  suggestion buttons, and product-section buttons now push both the product-page
  `AddToCart` shape and the GA4-style `add_to_cart` `dataLayer` shape, with
  one shared `event_id` and lightweight duplicate suppression.
- Fixed the product-page “বিষয়ভিত্তিক জনপ্রিয় বই” section for production.
  It was calling the local-only `/library` catalogue proxy on the live API,
  which returned 404; it now loads books through the live
  `POST /api/product/get-all` endpoint.
- Fixed the checkout free-notebook gift row so it always renders the real
  notebook cover. If the live offer/product config has no image or still points
  to a generic avatar/placeholder, the checkout and GTM fallback now use the
  published `amolbooks-notebook-8ddd.webp` cover instead.
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
- Cart synchronization: corrected the injected cart key to Angular's real `ALAMBOOKS_USER_CART_1`, one-time merges/removes the wrongly cased legacy cart, keeps the native bottom-navigation count aligned, and forces full cart/checkout route loads so every surface rebuilds from the same product list.

## Do NOT touch / be careful

- `ui/dist`, `admin/dist` — compiled artifacts, no source. Don't hand-edit.
- `api/upload/*`, `api/backup/db/*` — runtime data, gitignored. Never track or wipe.
- `api/node_modules/` — never re-track (Linux/Mac native-binary crash history).
- On VPS: never `git clean` / `reset --hard` / `stash -u`; use `scripts/vps-safe-pull.sh`.
- Every `npm install` needs `--legacy-peer-deps`.
