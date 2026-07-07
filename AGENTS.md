# AGENTS

Instructions for any coding assistant (Claude Code, Codex, etc.) working in this repo.

## Before editing

1. Read `PROJECT_CONTEXT.md` and `CURRENT_WORK.md`.
2. Run `git status` and inspect relevant diffs. Do not start on stale assumptions.
3. Preserve existing user work — never overwrite unrelated changes.

## While editing

- Follow existing code style, architecture, and naming (NestJS module layout in `api/src`).
- Keep changes focused and minimal. No drive-by refactors.
- **UI/admin have NO source** — only compiled `dist`. On-page storefront/admin changes go
  through GTM snippets (`gtm-snippets/`), not by editing `dist`. Do not ask for Angular source.
- Never track or wipe `api/upload/*`, `api/backup/db/*`, or `api/node_modules/`.
- Every `npm install` uses `--legacy-peer-deps`.

## After editing

- Run relevant checks in `api/`: `npm run lint`, `npm run build`. (No real test suite exists.)
- For GTM snippet changes, confirm `API_BASE` matches the current environment host.
- Update `CURRENT_WORK.md` with what changed and why.

## Deploy safety (VPS)

- Use `scripts/vps-safe-pull.sh`. Never run `git clean`, `git reset --hard`, or `git stash -u`
  on the VPS — they wipe uploaded product images.

## Handling secrets

- `.env` is gitignored — do not commit it. Use placeholders in docs.
- Note: `api/src/config/configuration.ts` currently holds hardcoded secrets; treat as sensitive.
