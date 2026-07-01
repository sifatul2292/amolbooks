#!/usr/bin/env bash
#
# backup-now.sh — run this on your Mac. SSHes into the VPS, dumps MongoDB
# (products, orders, everything) + tars the upload folders (images, files,
# invoices, csv), downloads both to ~/Amolbooks-Backups/<date>/ on this Mac,
# then cleans up the temp files it made on the VPS.
#
# Fill in VPS_HOST / VPS_USER / DB_USERNAME / DB_PASSWORD below once.
#
# Usage:  bash scripts/backup-now.sh
#
set -euo pipefail

VPS_USER="amolbooks"
VPS_HOST="your-vps-ip-or-domain"     # <-- fill in
DB_USERNAME="ikbalsazib11"           # from api/.env on the VPS
DB_PASSWORD="IKBALsazib11"           # from api/.env on the VPS
REMOTE_APP_DIR="/home/amolbooks/api"

DATE="$(date +%Y%m%d-%H%M%S)"
REMOTE_TMP="/home/${VPS_USER}/manual-backup-${DATE}"
LOCAL_DIR="${HOME}/Amolbooks-Backups/${DATE}"

echo "[backup-now] backing up on VPS -> ${REMOTE_TMP} ..."
ssh "${VPS_USER}@${VPS_HOST}" bash -s <<EOF
set -euo pipefail
mkdir -p "${REMOTE_TMP}"
mongodump --db amolbooks --username '${DB_USERNAME}' --password '${DB_PASSWORD}' \
  --authenticationDatabase admin --out "${REMOTE_TMP}/db"
tar -czf "${REMOTE_TMP}/db.tar.gz" -C "${REMOTE_TMP}" db
tar -czf "${REMOTE_TMP}/uploads.tar.gz" -C "${REMOTE_APP_DIR}" upload/images upload/files upload/invoice upload/csv
rm -rf "${REMOTE_TMP}/db"
EOF

echo "[backup-now] downloading to ${LOCAL_DIR} ..."
mkdir -p "${LOCAL_DIR}"
scp "${VPS_USER}@${VPS_HOST}:${REMOTE_TMP}/db.tar.gz" "${LOCAL_DIR}/"
scp "${VPS_USER}@${VPS_HOST}:${REMOTE_TMP}/uploads.tar.gz" "${LOCAL_DIR}/"

echo "[backup-now] cleaning up VPS temp files ..."
ssh "${VPS_USER}@${VPS_HOST}" "rm -rf '${REMOTE_TMP}'"

echo "[backup-now] done. Saved locally:"
ls -lh "${LOCAL_DIR}"
