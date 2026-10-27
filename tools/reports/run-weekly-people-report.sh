#!/usr/bin/env bash
# run-weekly-people-report.sh — what popty-people-report.service runs every Monday (job #501).
#
# Runs the report from its OWN detached worktree of origin/main, refreshed first, so the Monday run
# is always the merged tool, unchanged — never a dev checkout's uncommitted state. The worktree
# borrows the shared checkout's node_modules and env files (the same symlinks every Popty worktree has).
#   PEOPLE_REPORT_DIR   where that worktree lives (default ~/.local/share/popty-people-report)
#   PEOPLE_REPORT_ARGS  extra args (default --publish; e.g. "--publish --to Tom")
set -euo pipefail
SHARED="${HOME}/SSi/ssi-dashboard-v7-clean"
DIR="${PEOPLE_REPORT_DIR:-${HOME}/.local/share/popty-people-report}"
git -C "$SHARED" fetch -q origin main
if [ ! -e "$DIR/.git" ]; then
  mkdir -p "$(dirname "$DIR")"
  git -C "$SHARED" worktree add -q --detach "$DIR" origin/main
fi
git -C "$DIR" checkout -q --detach origin/main
for f in node_modules .env .env.psql; do [ -e "$DIR/$f" ] || ln -s "$SHARED/$f" "$DIR/$f"; done
cd "$DIR"
# shellcheck disable=SC2086
exec node tools/reports/weekly-people-report.cjs ${PEOPLE_REPORT_ARGS:---publish}
