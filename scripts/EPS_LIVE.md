# EPS live release

Production was inspected through the owner's authenticated Hostinger console on
2026-11-19. The deployed marker is `dfed9a2679c24d1c924586afc30a56900d5b767c`,
and source/snippets match it. PM2 runs `amolbooks-api` from
`/home/amolbooks/api/dist/main.js` on Node 20.20.0. No EPS settings were present.
The isolated release branch is `codex/eps-live-20261119`, based on that marker.
Do not substitute the older local rollback or prod-release checkouts.

## Credentials and preflight

Use the encrypted live credentials supplied privately by EPS. Never commit the
document, its password, an environment file, API responses or tokens. Guide V5
uses `https://pgapi.eps.com.bd` and requires the merchant ID as well as store ID.

Private environment entries:

```dotenv
EPS_BASE_URL=https://pgapi.eps.com.bd
EPS_USERNAME=<from-EPS>
EPS_PASSWORD=<from-EPS>
EPS_HASH_KEY=<from-EPS>
EPS_STORE_ID=<from-EPS>
EPS_MERCHANT_ID=<from-EPS>
EPS_ENABLED=true
EPS_RETURN_BASE_URL=https://apisub.amolbooks.com
STOREFRONT_URL=https://www.amolbooks.com
```

Keep the existing production DB settings unchanged and do not enable
`EPS_ALLOW_SANDBOX`. Authenticate before changing the running application:

```bash
node scripts/check-eps-live-config.cjs /private/path/eps.env
```

This reads only the selected private file and calls GetToken. It never initializes
a payment, creates an order, touches the application DB, sends a message or prints
credentials. Authentication alone does not prove a successful charge.

## Deployment sequence

1. Recheck `refs/amolbooks/deployed` and source drift. If production changed after
   inspection, reconcile the release with that exact deployed version first.
2. Fetch the release branch and archive its API source, package/config files
   into a private candidate directory. Reuse the existing Linux `node_modules`
   through a symlink; this release introduces no dependencies. Build there with
   TypeScript or Nest, keeping the running `api/dist` intact throughout the build.
3. Create a private backup of existing `api/dist`, affected source/snippets,
   `api/.env`, and the deployed marker. Preserve ownership/permissions. Keep the
   backup for immediate rollback. Do not copy or alter the application database.
4. Run `AMOL_DEPLOY_BRANCH=codex/eps-live-20261119 bash scripts/vps-safe-pull.sh --dry-run`.
   Verify that only the reviewed EPS source, tests, docs, snippet and branding
   asset change. No compiled storefront/admin, runtime uploads, unrelated files
   or dependency changes belong in this release.
5. Install the verified private EPS entries into `api/.env` while preserving every
   existing setting and file permissions. Run the safe-pull without `--dry-run`.
   It snapshots uploads and checks out only safe tracked application paths.
6. Swap in the completed candidate `dist` and reload **only** `amolbooks-api`.
   Never restart all PM2 applications or reboot the server for this release.
7. Verify the local backend and public `/api/payment/eps/config` return
   `success: true` and `data.enabled: true`; check homepage, product, checkout,
   branding asset and PM2 health. If startup or health fails, restore the saved
   dist/source/environment and deployed marker, then reload `amolbooks-api`.

## Payment verification

Check checkout on desktop and phone. Complete an owner-operated small payment;
verify the EPS merchant, amount, order paid state, payment entity and confirmation.
Also check cancellation, failure/retry on the same order, and COD. Never enter a
wallet PIN or approve a real charge on the owner's behalf. No test charge has
been performed during preparation.

The backend verifies the transaction identity and amount, holds changed-total
payments for review, and reconciles recent unresolved attempts including attempts
superseded by retries. Repeated callbacks do not resend the paid notification.
An additional successful attempt is recorded for refund review; refunds are not
automated. The general order update now requires the existing admin JWT header.
