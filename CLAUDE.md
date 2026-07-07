# CLAUDE.md

Claude and Codex share one source of truth. **Read [AGENTS.md](AGENTS.md) and follow it.**

Also read before editing:
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — what the project is, stack, run/build, deploy, gotchas.
- [CURRENT_WORK.md](CURRENT_WORK.md) — recent work, in-progress, next tasks, what to avoid.

Quick reminders (full detail in AGENTS.md):
- UI/admin are compiled `dist` only — no Angular source. On-page changes go via `gtm-snippets/`.
- `npm install` always with `--legacy-peer-deps`. Source app is `api/` (NestJS).
- Never track/wipe `api/upload/*`, `api/backup/db/*`, `api/node_modules/`.
- On VPS use `scripts/vps-safe-pull.sh`; never `git clean` / `reset --hard` / `stash -u`.
- Update `CURRENT_WORK.md` after meaningful progress.
