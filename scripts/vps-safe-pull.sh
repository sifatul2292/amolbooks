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

BRANCH="main"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# --- Hard guard: refuse to run anywhere near a destructive flag ---------------
case "${1:-}" in
  ""|--dry-run) ;;
  *) echo "[safe-pull] refusing unknown arg '$1'. This script never force-resets."; exit 1;;
esac

echo "[safe-pull] repo: $REPO_ROOT"
echo "[safe-pull] fetching origin/$BRANCH ..."
git fetch origin "$BRANCH"

# --- Safety net: snapshot upload dirs before changing anything ----------------
# Hardlink copy = near-instant, near-zero disk. Falls back to real copy.
TS="$(date +%Y%m%d-%H%M%S)"
SNAP_DIR="/home/amolbooks/upload-snapshots/$TS"
if [ -d api/upload ]; then
  mkdir -p "$SNAP_DIR"
  cp -al api/upload "$SNAP_DIR/upload" 2>/dev/null || cp -a api/upload "$SNAP_DIR/upload"
  echo "[safe-pull] upload snapshot -> $SNAP_DIR"
  # keep only the 14 most recent snapshots
  ls -1dt /home/amolbooks/upload-snapshots/*/ 2>/dev/null | tail -n +15 | xargs -r rm -rf
fi

# --- Compute changed tracked files between current HEAD and origin ------------
CHANGED="$(git diff --name-only HEAD "origin/$BRANCH" || true)"
if [ -z "$CHANGED" ]; then
  echo "[safe-pull] no tracked code differences; checking required storefront assets."
fi

# Belt-and-braces: never let runtime uploads slip into the checkout set. The
# tracked admin dashboard HTML files and the profit-dashboard token stylesheet
# under api/upload/static are application assets, not user uploads, so they are
# the only explicit exceptions.
SAFE_CHANGED="$(printf '%s\n' "$CHANGED" | awk '
  /^api\/backup\/db\// { next }
  /^api\/upload\// && $0 !~ /^api\/upload\/static\/[^\/]+\.html$/ && $0 != "api/upload/static/profit-dashboard-tokens.css" { next }
  { print }
')"
SKIPPED="$(printf '%s\n' "$CHANGED" | awk '
  /^api\/backup\/db\// { print; next }
  /^api\/upload\// && $0 !~ /^api\/upload\/static\/[^\/]+\.html$/ && $0 != "api/upload/static/profit-dashboard-tokens.css" { print }
')"

echo "[safe-pull] files to update:"
printf '%s\n' "$SAFE_CHANGED" | sed 's/^/  /'
if [ -n "$SKIPPED" ]; then
  echo "[safe-pull] SKIPPING (runtime data, never overwritten by deploy):"
  printf '%s\n' "$SKIPPED" | sed 's/^/  /'
fi

if [ "${1:-}" = "--dry-run" ]; then
  echo "[safe-pull] dry-run: no files written."
  exit 0
fi

# --- Write ONLY the safe changed tracked files --------------------------------
# `git checkout <ref> -- <paths>` writes only the listed files. It cannot
# delete untracked uploads. HEAD intentionally NOT moved, so any local VPS
# edits to other tracked files are preserved.
if [ -n "$SAFE_CHANGED" ]; then
  # shellcheck disable=SC2086
  printf '%s\0' $SAFE_CHANGED | xargs -0 git checkout "origin/$BRANCH" --
fi

# Missing compiled storefront files can break the SPA even when those files did
# not change between HEAD and origin, so the revision diff above will not
# necessarily restore them. Recover every missing tracked storefront asset from
# origin. Existing files are left untouched, and runtime uploads live outside
# this directory.
STOREFRONT_DIR="ui/dist/angular-ui/browser"
STOREFRONT_INDEX="$STOREFRONT_DIR/index.html"
git ls-tree -r --name-only "origin/$BRANCH" "$STOREFRONT_DIR" |
  while IFS= read -r TRACKED_ASSET_PATH; do
    [ -n "$TRACKED_ASSET_PATH" ] || continue
    if [ ! -e "$TRACKED_ASSET_PATH" ]; then
      echo "[safe-pull] restoring missing tracked storefront asset: ${TRACKED_ASSET_PATH#"$STOREFRONT_DIR/"}"
      git checkout "origin/$BRANCH" -- "$TRACKED_ASSET_PATH"
    fi
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
      if git cat-file -e "origin/$BRANCH:$ASSET_PATH" 2>/dev/null; then
        echo "[safe-pull] restoring missing storefront asset: $ASSET"
        git checkout "origin/$BRANCH" -- "$ASSET_PATH"
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

echo "[safe-pull] done. Code updated; uploads untouched."
echo "[safe-pull] If api/ source/dist changed, restart the API:  pm2 restart all   (or your usual restart)."
