#!/usr/bin/env bash
#
# vps-safe-pull.sh — update code from origin/main on the VPS WITHOUT ever
# touching user-uploaded files (product images, invoices, CSVs).
#
# Why this exists:
#   api/upload/* and api/backup/db/ are gitignored runtime data. A normal
#   `git pull` cannot delete gitignored untracked files — but a panicked
#   `git reset --hard`, `git clean -fd`, or `git stash -u` WILL wipe every
#   product image. This script does NONE of those. It only writes the tracked
#   code files that changed, and snapshots uploads first as a safety net.
#
# Usage (on VPS):   bash scripts/vps-safe-pull.sh
#
set -euo pipefail

BRANCH="${AMOL_DEPLOY_BRANCH:-main}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOYED_REF="refs/amolbooks/deployed"
SNAPSHOT_ROOT="${AMOL_SNAPSHOT_ROOT:-/home/amolbooks}"
cd "$REPO_ROOT"

# --- Hard guard: refuse to run anywhere near a destructive flag ---------------
case "${1:-}" in
  ""|--dry-run) ;;
  *) echo "[safe-pull] refusing unknown arg '$1'. This script never force-resets."; exit 1;;
esac

echo "[safe-pull] repo: $REPO_ROOT"
echo "[safe-pull] fetching origin/$BRANCH ..."
git fetch origin "$BRANCH"

TARGET="origin/$BRANCH"
if git rev-parse --verify --quiet "$DEPLOYED_REF" >/dev/null; then
  BASE="$DEPLOYED_REF"
else
  BASE="HEAD"
fi

UPDATES_FILE="$(mktemp)"
DELETIONS_FILE="$(mktemp)"
trap 'rm -f "$UPDATES_FILE" "$DELETIONS_FILE"' EXIT

is_safe_path() {
  case "$1" in
    api/backup/db/*) return 1 ;;
    api/upload/static/*.html|api/upload/static/profit-dashboard-tokens.css) return 0 ;;
    api/upload/*) return 1 ;;
    *) return 0 ;;
  esac
}

while IFS=$'\t' read -r STATUS FILE_PATH; do
  [ -n "$FILE_PATH" ] || continue
  if ! is_safe_path "$FILE_PATH"; then
    echo "[safe-pull] SKIPPING runtime data: $FILE_PATH"
    continue
  fi
  case "$STATUS" in
    D) printf '%s\n' "$FILE_PATH" >> "$DELETIONS_FILE" ;;
    *) printf '%s\n' "$FILE_PATH" >> "$UPDATES_FILE" ;;
  esac
done < <(git diff --no-renames --name-status "$BASE" "$TARGET")

echo "[safe-pull] baseline: $BASE ($(git rev-parse --short "$BASE"))"
echo "[safe-pull] target:   $TARGET ($(git rev-parse --short "$TARGET"))"
echo "[safe-pull] files to update:"
sed 's/^/  /' "$UPDATES_FILE"
echo "[safe-pull] files to remove:"
sed 's/^/  /' "$DELETIONS_FILE"

if [ "${1:-}" = "--dry-run" ]; then
  echo "[safe-pull] dry-run: no files written and no snapshots pruned."
  exit 0
fi

# --- Safety net: snapshot upload dirs before changing anything ----------------
# Hardlink copy = near-instant, near-zero disk. Falls back to real copy.
TS="$(date +%Y%m%d-%H%M%S)"
SNAP_DIR="$SNAPSHOT_ROOT/upload-snapshots/$TS"
if [ -d api/upload ]; then
  mkdir -p "$SNAP_DIR"
  cp -al api/upload "$SNAP_DIR/upload" 2>/dev/null || cp -a api/upload "$SNAP_DIR/upload"
  echo "[safe-pull] upload snapshot -> $SNAP_DIR"
  # keep only the 14 most recent snapshots
  ls -1dt "$SNAPSHOT_ROOT"/upload-snapshots/*/ 2>/dev/null | tail -n +15 | xargs -r rm -rf
fi

# --- Write ONLY the safe changed tracked files --------------------------------
# `git checkout <ref> -- <paths>` writes only the listed files. It cannot
# delete untracked uploads. HEAD intentionally NOT moved, so any local VPS
# edits to other tracked files are preserved.
while IFS= read -r FILE_PATH; do
  [ -n "$FILE_PATH" ] || continue
  git checkout "$TARGET" -- "$FILE_PATH"
done < "$UPDATES_FILE"

# Remove only exact application paths deleted by the target release. Runtime
# upload and DB paths were filtered above. Save any existing file first.
CODE_SNAP_DIR="$SNAPSHOT_ROOT/code-snapshots/$TS"
while IFS= read -r FILE_PATH; do
  [ -n "$FILE_PATH" ] || continue
  if [ -e "$FILE_PATH" ]; then
    mkdir -p "$CODE_SNAP_DIR/$(dirname "$FILE_PATH")"
    cp -a "$FILE_PATH" "$CODE_SNAP_DIR/$FILE_PATH"
    rm -f -- "$FILE_PATH"
  fi
done < "$DELETIONS_FILE"

# A failed build can remove compiled files that did not change between releases,
# so the revision diff above will not necessarily restore them during rollback.
# Recover every missing tracked API/storefront build file from the target.
# Existing files are left untouched, and runtime uploads live elsewhere.
STOREFRONT_DIR="ui/dist/angular-ui/browser"
STOREFRONT_INDEX="$STOREFRONT_DIR/index.html"
for BUILD_DIR in api/dist "$STOREFRONT_DIR"; do
  git ls-tree -r --name-only "$TARGET" "$BUILD_DIR" |
    while IFS= read -r TRACKED_BUILD_PATH; do
      [ -n "$TRACKED_BUILD_PATH" ] || continue
      if [ ! -e "$TRACKED_BUILD_PATH" ]; then
        echo "[safe-pull] restoring missing tracked build file: $TRACKED_BUILD_PATH"
        git checkout "$TARGET" -- "$TRACKED_BUILD_PATH"
      fi
    done
done

# Validate the entry files referenced by index.html after recovery. This also
# catches an invalid deployment where index.html points to an untracked bundle.
if [ -f "$STOREFRONT_INDEX" ]; then
  CORE_ASSETS="$(
    {
      grep -oE '(runtime|polyfills|main)\.[^"[:space:]]+\.js' "$STOREFRONT_INDEX" || true
      grep -oE 'styles\.[^"[:space:]]+\.css' "$STOREFRONT_INDEX" || true
      printf '%s\n' 'dl-normalize.js'
    } | sort -u
  )"
  MISSING_CORE=""
  while IFS= read -r ASSET; do
    [ -n "$ASSET" ] || continue
    ASSET_PATH="$STOREFRONT_DIR/$ASSET"
    if [ ! -f "$ASSET_PATH" ]; then
      if git cat-file -e "$TARGET:$ASSET_PATH" 2>/dev/null; then
        echo "[safe-pull] restoring missing storefront asset: $ASSET"
        git checkout "$TARGET" -- "$ASSET_PATH"
      else
        MISSING_CORE="${MISSING_CORE}${ASSET_PATH}\n"
      fi
    fi
  done <<EOF
$CORE_ASSETS
EOF

  if [ -n "$MISSING_CORE" ]; then
    echo "[safe-pull] ERROR: storefront references unavailable core assets:"
    printf '%b' "$MISSING_CORE" | sed 's/^/  /'
    exit 1
  fi
fi

# Record the exact deployed target without moving HEAD or discarding VPS-local
# edits. Future deploys and rollback commits diff from this release marker.
git update-ref "$DEPLOYED_REF" "$(git rev-parse "$TARGET")"

echo "[safe-pull] done. Code updated; uploads untouched."
echo "[safe-pull] If api/ source/dist changed, restart the API:  pm2 restart all   (or your usual restart)."
