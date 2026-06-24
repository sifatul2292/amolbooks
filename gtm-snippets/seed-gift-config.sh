#!/usr/bin/env bash
# Seed the free-notebook gift config onto the single OrderOffer doc.
# Run AFTER you create the notebook as a Product in admin.
# It auto-resolves the notebook's _id/name/image from its slug, then upserts config.
#
# Usage:
#   ADMIN_TOKEN=<admin-jwt> ./seed-gift-config.sh
# Override any var inline, e.g.:
#   ADMIN_TOKEN=xxx NOTEBOOK_SLUG=amol-notebook BOOK_SLUG=500-shobde-quran ./seed-gift-config.sh

set -euo pipefail

API_BASE="${API_BASE:-https://apisub.amolbooks.com/api}"

# ---- Fill these (or pass as env vars) -------------------------------------
NOTEBOOK_SLUG="${NOTEBOOK_SLUG:-REPLACE_notebook_slug}"   # slug of the notebook product
BOOK_SLUG="${BOOK_SLUG:-REPLACE_this_book_slug}"          # the "500 শব্দে কুরআন" slug (buy-2 trigger)
GIFT_MIN_AMOUNT="${GIFT_MIN_AMOUNT:-750}"                 # global threshold (Trigger A)
GIFT_BUY_X_QTY="${GIFT_BUY_X_QTY:-2}"                     # qty trigger (Trigger B)
GIFT_LABEL="${GIFT_LABEL:-ফ্রি নোটবুক}"
ADMIN_TOKEN="${ADMIN_TOKEN:?Set ADMIN_TOKEN env var (admin JWT)}"
# ---------------------------------------------------------------------------

echo "Resolving notebook product: $NOTEBOOK_SLUG"
NB_JSON="$(curl -fsS "$API_BASE/product/get-by-slug/$NOTEBOOK_SLUG")"

NB_ID="$(printf '%s' "$NB_JSON"   | python3 -c 'import sys,json;d=json.load(sys.stdin).get("data") or {};print(d.get("_id",""))')"
NB_NAME="$(printf '%s' "$NB_JSON" | python3 -c 'import sys,json;d=json.load(sys.stdin).get("data") or {};print(d.get("name",""))')"
NB_IMG="$(printf '%s' "$NB_JSON"  | python3 -c 'import sys,json;d=json.load(sys.stdin).get("data") or {};imgs=d.get("images") or [];print(imgs[0] if imgs else "")')"

if [ -z "$NB_ID" ]; then
  echo "ERROR: could not resolve notebook _id for slug '$NOTEBOOK_SLUG'. Create the product first." >&2
  exit 1
fi
echo "Notebook _id=$NB_ID  name=$NB_NAME"

PAYLOAD="$(python3 - "$NB_ID" "$NB_NAME" "$NOTEBOOK_SLUG" "$NB_IMG" "$BOOK_SLUG" "$GIFT_MIN_AMOUNT" "$GIFT_BUY_X_QTY" "$GIFT_LABEL" <<'PY'
import json,sys
_id,name,slug,img,book,minamt,qty,label = sys.argv[1:9]
print(json.dumps({
  "giftEnabled": True,
  "giftMinAmount": int(minamt),
  "giftBuyXProductSlug": book,
  "giftBuyXQty": int(qty),
  "giftLabel": label,
  "giftProduct": {"_id": _id, "name": name, "slug": slug, "image": img},
}, ensure_ascii=False))
PY
)"

echo "Posting config..."
curl -fsS -X POST "$API_BASE/order-offer/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "$PAYLOAD"
echo
echo "Done. Verify: curl -s $API_BASE/order-offer/get"
