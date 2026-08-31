# PROJECT_CONTEXT

Source of truth for this repo. Repo-specific only — do not import assumptions from other projects.

## What this is

Amolbooks (also branded Alambook) — a Bengali-language e-commerce bookstore. Sells
books online with cart, checkout, orders, discounts, offers, blog, reviews, and an
admin back office. Business runs on a VPS in production (`amolbooks.com`).

## Repo layout (monorepo, 3 apps + GTM snippets)

```
api/            NestJS backend (TypeScript source in api/src) — the ONLY app with source
ui/             Storefront — COMPILED Angular only (ui/dist), NO source in repo
admin/          Admin panel — COMPILED Angular only (admin/dist), NO source in repo
gtm-snippets/   Google Tag Manager Custom-HTML tags (on-page sales widgets)
scripts/        Deploy + backup shell scripts
```

**Critical constraint:** UI and admin ship as compiled `dist` only. There is NO Angular
source in this repo. Any storefront/admin UI change must go through GTM injection
(`gtm-snippets/`) or be obtained from the original dev. Never ask for or assume Angular source.

## Tech stack

- **Backend:** NestJS 8 (TypeScript), Node.js. `nest-cli`. Serves API + serves UI/admin
  `dist` as static + SPA fallback (see `api/src/main.ts`).
- **DB:** MongoDB via Mongoose 6 / `@nestjs/mongoose` 9. Production = local MongoDB
  (`127.0.0.1`); non-production = Atlas test cluster (switched by `PRODUCTION_BUILD`).
- **Auth:** JWT (`@nestjs/jwt`, `passport-jwt`). Separate user + admin secrets. bcrypt for hashing.
- **Other libs:** helmet, compression, throttler, class-validator, sharp (image), pdfmake/pdfkit
  (invoices), nodemailer + googleapis (Gmail), archiver, sitemap, moment-timezone, posthog-node.
- **Analytics:** PostHog (`posthog-node`), plus GTM server-side via Stape
  (`load.server.amolbooks.com`, container `GTM-NNZV54QJ`).
- **Package manager:** npm. **Always install with `--legacy-peer-deps`** (peer conflict:
  `@nestjs/common@8` vs `@nestjs/serve-static@4` which wants `@nestjs/common@9+`).

## Install / run / build (api only — the source app)

All commands run in `api/`:

```bash
cd api
npm install --legacy-peer-deps   # legacy flag REQUIRED
npm run start:dev                # watch mode, local dev (uses Atlas test DB unless PRODUCTION_BUILD=true)
npm run build                    # nest build -> api/dist
npm run start:prod               # node dist/main
npm run lint                     # eslint --fix
npm run format                   # prettier
npm test                         # jest (see note below)
```

Default port `3000` (override via `PORT`). Global API prefix `api`, URI versioning enabled.
Uploads served at `/upload` and `/upload/static`. SPA fallback serves
`ui/dist/angular-ui/browser/index.html`.

**Tests:** Jest is configured but this repo has no meaningful test suite committed — treat
`npm test` as scaffolding, not a real gate. Verify changes by running the API + exercising endpoints.

## Deployment (VPS, production)

Server dir: `/home/amolbooks`. After `git push` from local Mac, on the VPS:

```bash
cd /home/amolbooks
bash scripts/vps-safe-pull.sh          # safe file-level checkout, snapshots api/upload first
# only if api source/dist changed:
cd api && npm install --legacy-peer-deps && npm run build && pm2 restart amolbooks-api
```

- `scripts/vps-safe-pull.sh` — snapshots `api/upload` (hardlink, keeps 14), then writes ONLY
  safe changed tracked files via `git checkout origin/main -- <files>`. Never a real
  merge/reset. Refuses any arg except `--dry-run`.
- `scripts/backup-now.sh` — on-demand backup.
- **NEVER run `git clean`, `git reset --hard`, or `git stash -u` on the VPS** — they wipe
  runtime-uploaded product images. See gotchas.

## Environment variables (api/.env — gitignored, placeholders only below)

```
PORT=3000
DB_USERNAME=<mongo-user>
DB_PASSWORD=<mongo-pass>
DB_PORT=27017
DB_NAME=<db-name>
AUTH_SOURCE=admin
JWT_PRIVATE_KEY_USER=<user-jwt-secret>
JWT_PRIVATE_KEY_ADMIN=<admin-jwt-secret>
PRODUCTION_BUILD=true            # true => local MongoDB; false/absent => Atlas test cluster
POSTHOG_API_KEY=<posthog-key>
POSTHOG_HOST=<posthog-host>
# Also expected in production per ops history:
GREENWEBSMS_TOKEN=<sms-token>    # OTP + order SMS via bdbulksms.net; missing => SMS silently fails
STEADFAST_WEBHOOK_TOKEN=<random-webhook-secret>
META_APP_ID=<meta-app-id>
META_APP_SECRET=<meta-secret>
META_REDIRECT_URI=https://apisub.amolbooks.com/api/meta-ads/callback
```

**Gotcha:** `PRODUCTION_BUILD` false/missing on VPS => site silently connects to Atlas test
DB and shows test data ("can't see products"). Empty DB creds => `MongoParseError: URI
contained empty userinfo section` crash loop.

Note: `api/src/config/configuration.ts` currently hardcodes several secrets (SSL payment
STORE_ID/PASSWORD, Google OAuth, SMS token, Atlas fallback URI). Fragile — treat as sensitive.

## Architecture / data flow

- Single NestJS app in `api/`. Feature modules under `api/src/pages/*` (product, cart,
  order, offers, blog, dashboard, meta-ads, redirect-url, sitemap, etc.). Mongoose schemas
  in `api/src/schema/*` (~60 schemas). DTOs in `api/src/dto`, guards in `api/src/guards`.
- API serves the compiled Angular storefront + admin as static assets and handles SPA
  fallback itself — one process serves everything.
- On-page sales widgets are NOT in the Angular bundle; they are injected via GTM Custom-HTML
  tags that call the API (`https://apisub.amolbooks.com/api`).

## Key product flows / business rules

- **Free-gift engine:** offer config in `OrderOffer` schema, evaluated in order service; GTM
  levers surface it on product/cart/checkout. Free notebook on qualifying carts.
- **Incomplete Orders:** abandoned-cart page. "Converted" set ONLY by page Send/Add Order.
  Self-placed real orders get deleted, not marked converted.
  The compiled checkout POSTs `add-incomplete-order-by-*` on every debounced form change
  until the first response returns an `_id`, then switches to
  `update-incomplete-order-by-id`. `addIncompleteOrder` therefore merges into the newest
  non-converted row for the same phone within 6h instead of inserting — without that, one
  customer produced several rows and the address (typed last) landed on whichever won the
  race. The public update route also ignores empty strings for the same reason.
- **Recent buyers:** `GET /api/order/recent-buyers/:slug` — public, first name + purchase
  time only (no phone/email/address). Feeds social-proof ticker.
- **GTM levers** (`gtm-snippets/`): cart threshold, buy-2-notebook banner, urgency/countdown,
  sticky CTA, qty, checkout gift, email field.

## UI/design conventions

- Storefront copy is Bengali. GTM widgets match the compiled Angular look; each `.html`
  snippet is one self-contained, idempotent GTM tag (self-polls `location.pathname` since
  site is a SPA). API base URL is hardcoded at top of each snippet — change per environment.

## Major decisions / history

- `api/node_modules/` and `api/upload/*` were previously git-tracked; both caused production
  incidents (Mac-compiled bcrypt binary crashed on Linux; deploy ops wiped images). Both now
  gitignored/untracked. Do not re-track.
- UI/admin source intentionally absent — GTM is the injection channel for on-page changes.

## Known constraints / risks / fragile areas

- No Angular source → limited UI change surface (GTM only).
- Hardcoded secrets in `configuration.ts`.
- No real test suite — manual/endpoint verification required.
- Native modules (bcrypt, sharp) must be built on the target OS (`npm install` on VPS).
- Destructive git ops on VPS wipe uploaded images — forbidden.
- Peer-dep conflict forces `--legacy-peer-deps` on every install.
