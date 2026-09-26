#!/usr/bin/env bash
set -euo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT

git init --bare "$TEST_ROOT/origin.git" >/dev/null
git clone "$TEST_ROOT/origin.git" "$TEST_ROOT/source" >/dev/null 2>&1
git -C "$TEST_ROOT/source" config user.name "Deploy Check"
git -C "$TEST_ROOT/source" config user.email "deploy-check@example.invalid"
mkdir -p "$TEST_ROOT/source/scripts" "$TEST_ROOT/source/api/upload/images" "$TEST_ROOT/source/api/dist"
cp "$(dirname "$0")/vps-safe-pull.sh" "$TEST_ROOT/source/scripts/"
printf 'old\n' > "$TEST_ROOT/source/app.txt"
printf 'restore me\n' > "$TEST_ROOT/source/delete-me.txt"
printf 'unchanged compiled file\n' > "$TEST_ROOT/source/api/dist/unchanged.js"
git -C "$TEST_ROOT/source" add .
git -C "$TEST_ROOT/source" commit -m baseline >/dev/null
git -C "$TEST_ROOT/source" branch -M main
git -C "$TEST_ROOT/source" push -u origin main >/dev/null 2>&1

git clone --branch main "$TEST_ROOT/origin.git" "$TEST_ROOT/deploy" >/dev/null 2>&1
mkdir -p "$TEST_ROOT/deploy/api/upload/images"
printf 'runtime upload\n' > "$TEST_ROOT/deploy/api/upload/images/customer.jpg"

printf 'new\n' > "$TEST_ROOT/source/app.txt"
printf 'added\n' > "$TEST_ROOT/source/added.txt"
rm "$TEST_ROOT/source/delete-me.txt"
git -C "$TEST_ROOT/source" add -A
git -C "$TEST_ROOT/source" commit -m release >/dev/null
RELEASE_SHA="$(git -C "$TEST_ROOT/source" rev-parse HEAD)"
git -C "$TEST_ROOT/source" push origin main >/dev/null 2>&1

AMOL_SNAPSHOT_ROOT="$TEST_ROOT/snapshots" \
  bash "$TEST_ROOT/deploy/scripts/vps-safe-pull.sh" --dry-run >/dev/null
test "$(cat "$TEST_ROOT/deploy/app.txt")" = old

AMOL_SNAPSHOT_ROOT="$TEST_ROOT/snapshots" \
  bash "$TEST_ROOT/deploy/scripts/vps-safe-pull.sh" >/dev/null
test "$(cat "$TEST_ROOT/deploy/app.txt")" = new
test "$(cat "$TEST_ROOT/deploy/added.txt")" = added
test ! -e "$TEST_ROOT/deploy/delete-me.txt"
test "$(cat "$TEST_ROOT/deploy/api/upload/images/customer.jpg")" = "runtime upload"
test "$(git -C "$TEST_ROOT/deploy" rev-parse refs/amolbooks/deployed)" = "$RELEASE_SHA"

git -C "$TEST_ROOT/source" revert --no-edit HEAD >/dev/null
ROLLBACK_SHA="$(git -C "$TEST_ROOT/source" rev-parse HEAD)"
git -C "$TEST_ROOT/source" push origin main >/dev/null 2>&1
rm "$TEST_ROOT/deploy/api/dist/unchanged.js"
AMOL_SNAPSHOT_ROOT="$TEST_ROOT/snapshots" \
  bash "$TEST_ROOT/deploy/scripts/vps-safe-pull.sh" >/dev/null
test "$(cat "$TEST_ROOT/deploy/app.txt")" = old
test ! -e "$TEST_ROOT/deploy/added.txt"
test "$(cat "$TEST_ROOT/deploy/delete-me.txt")" = "restore me"
test "$(cat "$TEST_ROOT/deploy/api/dist/unchanged.js")" = "unchanged compiled file"
test "$(cat "$TEST_ROOT/deploy/api/upload/images/customer.jpg")" = "runtime upload"
test "$(git -C "$TEST_ROOT/deploy" rev-parse refs/amolbooks/deployed)" = "$ROLLBACK_SHA"

echo "vps-safe-pull deploy and rollback check passed"
