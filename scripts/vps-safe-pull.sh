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
  echo "[safe-pull] already up to date with origin/$BRANCH. Nothing to do."
  exit 0
fi

# Belt-and-braces: never let an upload path slip into the checkout set.
SAFE_CHANGED="$(printf '%s\n' "$CHANGED" | grep -vE '^api/upload/|^api/backup/db/' || true)"
SKIPPED="$(printf '%s\n' "$CHANGED" | grep -E '^api/upload/|^api/backup/db/' || true)"

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

echo "[safe-pull] done. Code updated; uploads untouched."
echo "[safe-pull] If api/ source/dist changed, restart the API:  pm2 restart all   (or your usual restart)."
