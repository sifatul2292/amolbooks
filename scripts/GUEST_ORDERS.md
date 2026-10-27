# Verified guest orders

Customers open **আমার অর্ডার দেখুন** from the navigation, mobile drawer, login page,
or order-success page. They verify the checkout phone with an SMS code,
then view that number's orders and cancel eligible orders without creating an account.

## Access and cancellation rules

- Six-digit random OTP: five-minute expiry, single use, five verification attempts.
- Resend after 60 seconds; at most five sends per normalized number per hour.
  HTTP throttling also limits requests per IP. Requesting a code never checks whether orders exist.
- A separate, phone-scoped, 30-minute session grants only guest order access.
  It cannot log into an account or reset a password. Tokens/OTPs are hashed in the database;
  the browser keeps the short-lived session in sessionStorage and can revoke it by logging out.
- Order responses contain IDs, item names/quantities, prices and status, not addresses,
  fraud reports, courier credentials or internal notes. All list/cancel queries enforce
  the verified phone on the server, regardless of submitted IDs or extra query parameters.
- Immediate cancellation is permitted for pending, confirmed or processing orders only
  before courier booking, provided inventory work is not running. Other orders show a support link.
- Cancellation preserves history, adds the cancelled timeline entry and records the verified
  phone, time and reason. Existing admin notes identify the customer cancellation.
- Prepaid orders keep their payment status. Staff can still record the existing refund status
  without reopening the order; other fulfillment transitions stay blocked. The customer is told to contact support for
  refund review; cancellation never claims that money was refunded.
- Courier booking and cancellation atomically exclude each other. A booking marker is
  deliberately retained after an uncertain provider failure. Staff must verify with the
  courier before resolving it, rather than blindly creating another parcel.
- Stock deduction cannot start after customer cancellation. Per-product atomic, opaque retry
  markers prevent duplicate restoration across retries, workers and interrupted operations.
  A minute job resumes unfinished customer cancellation restocks. Markers do not disclose order IDs.
- Interrupted stock processing stays blocked for staff reconciliation; do not clear a
  processing/booking marker without checking the corresponding inventory/provider state.

These rules apply to this new guest flow. Existing account login and password-reset flows remain separate.

## Production deployment

No new dependency or secret is required. The existing `GREENWEBSMS_TOKEN` must work.
The strict OTP sender waits for the SMS gateway's acknowledgement and fails closed on
missing credentials, rejection or timeout. It never logs the code or gateway response body.

Use the usual Sunday-branch safe pull, API build and `pm2 restart amolbooks-api`.
New optional order/product fields are backward compatible; the new guest-access collection
creates unique phone/session indexes and a TTL index. No existing order is backfilled or deleted.
After deployment, verify SMS delivery with an owner-approved number before announcing the feature.
No production SMS or actual customer cancellation is performed by the local checks.

## Local checks and review

With local MongoDB on 127.0.0.1:27017, run after `npm run build` in `api/`:

```bash
node scripts/check-guest-orders.cjs
```

This creates and drops an isolated `amol_guest_orders_test_*` database, mocks SMS/couriers,
and exercises OTP limits/replay/expiry, ownership, validation, concurrent cancellation and
booking, stock processing/recovery, pagination and session revocation. The fixture disables
product index creation because existing product schema index declarations conflict on a
fresh database; the new authentication indexes are created and checked.

For interactive review in two terminals:

```bash
node scripts/check-guest-orders.cjs --serve
GUEST_ORDERS_PREVIEW_PORT=3012 node scripts/dev-storefront.cjs
```

Use **01700000000** in the localhost order dialog. The sandbox returns a clearly labelled
test code in the UI; no SMS is sent. Orders and stock are disposable fixtures. Ctrl+C on
the sandbox drops its isolated database. The production service has no test-code response
or authentication bypass. The dev proxy only forwards guest actions to an explicitly configured
localhost sandbox, never to production.
