#!/usr/bin/env bash
#
# backup-now.sh — run this on your Mac. SSHes into the VPS, dumps MongoDB
# (products, orders, everything) + tars the upload folders (images, files,
# invoices, csv), downloads both to ~/Amolbooks-Backups/<date>/ on this Mac,
# then cleans up the temp files it made on the VPS.
#
# Supply VPS_HOST, DB_USERNAME, and DB_PASSWORD as environment variables.
#
# Usage:  bash scripts/backup-now.sh
#
set -euo pipefail

VPS_USER="${VPS_USER:-amolbooks}"
: "${VPS_HOST:?Set VPS_HOST to the production SSH host}"
: "${DB_USERNAME:?Set DB_USERNAME from the production api/.env}"
: "${DB_PASSWORD:?Set DB_PASSWORD from the production api/.env}"
REMOTE_APP_DIR="/home/amolbooks/api"

DATE="$(date +%Y%m%d-%H%M%S)"
REMOTE_TMP="/tmp/amolbooks-manual-backup-${DATE}"
LOCAL_DIR="${HOME}/Amolbooks-Backups/${DATE}"
LOCAL_MONGO_CONFIG="$(mktemp)"
cleanup() {
  rm -f "$LOCAL_MONGO_CONFIG"
  ssh -o BatchMode=yes -o ConnectTimeout=10 "${VPS_USER}@${VPS_HOST}" \
    "rm -rf -- '${REMOTE_TMP}'" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' HUP TERM
chmod 600 "$LOCAL_MONGO_CONFIG"
MONGO_CONFIG_PATH="$LOCAL_MONGO_CONFIG" node <<'NODE'
const fs = require('fs');
fs.writeFileSync(
  process.env.MONGO_CONFIG_PATH,
  JSON.stringify({
    password: process.env.DB_PASSWORD,
    uri: `mongodb://${encodeURIComponent(process.env.DB_USERNAME)}@127.0.0.1/amolbooks?authSource=admin`,
  })
);
NODE

echo "[backup-now] backing up on VPS -> ${REMOTE_TMP} ..."
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p '${REMOTE_TMP}' && chmod 700 '${REMOTE_TMP}'"
scp "$LOCAL_MONGO_CONFIG" "${VPS_USER}@${VPS_HOST}:${REMOTE_TMP}/mongodump-config.yml"
ssh "${VPS_USER}@${VPS_HOST}" bash -s -- "$REMOTE_TMP" "$REMOTE_APP_DIR" <<'EOF'
set -euo pipefail
REMOTE_TMP="$1"
REMOTE_APP_DIR="$2"
chmod 600 "$REMOTE_TMP/mongodump-config.yml"
trap 'rm -f "$REMOTE_TMP/mongodump-config.yml"; rm -rf "$REMOTE_TMP/db"' EXIT
mongodump --config "$REMOTE_TMP/mongodump-config.yml" --out "$REMOTE_TMP/db"
tar -czf "$REMOTE_TMP/db.tar.gz" -C "$REMOTE_TMP" db
tar -czf "$REMOTE_TMP/uploads.tar.gz" -C "$REMOTE_APP_DIR" upload/images upload/files upload/invoice upload/csv
EOF

echo "[backup-now] downloading to ${LOCAL_DIR} ..."
mkdir -p "${LOCAL_DIR}"
scp "${VPS_USER}@${VPS_HOST}:${REMOTE_TMP}/db.tar.gz" "${LOCAL_DIR}/"
scp "${VPS_USER}@${VPS_HOST}:${REMOTE_TMP}/uploads.tar.gz" "${LOCAL_DIR}/"

echo "[backup-now] cleaning up VPS temp files ..."
ssh "${VPS_USER}@${VPS_HOST}" "rm -rf '${REMOTE_TMP}'"

echo "[backup-now] done. Saved locally:"
ls -lh "${LOCAL_DIR}"
