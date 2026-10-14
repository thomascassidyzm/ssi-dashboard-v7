#!/usr/bin/env bash
# with-lane.sh <branch> <cmd...> — run <cmd> inside a detached checkout of origin/<branch>.
#
# The phrase-quality lane keeps its data (staged decisions, undo ledgers) on a Popty branch, never
# main. A procedure that reads it must read ONE named state of that branch, so this refreshes a
# procedure-owned detached worktree to origin/<branch> and prints the sha before anything else:
# every run's output therefore says exactly which lane state it saw. The worktree is never written
# to by a report.
set -euo pipefail
BRANCH="$1"; shift
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
HOME_DIR="${POPTY_PROC_HOME:-$HOME/.local/share/popty-procedures}"
DIR="$HOME_DIR/checkouts/${BRANCH//\//-}"
mkdir -p "$HOME_DIR/checkouts"
exec 9>"$DIR.lock"
flock 9
git -C "$REPO" fetch -q origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
if [ ! -e "$DIR/.git" ]; then
  git -C "$REPO" worktree prune
  git -C "$REPO" worktree add -q --detach "$DIR" "origin/$BRANCH"
else
  git -C "$DIR" checkout -q --detach --force "origin/$BRANCH"
fi
[ -e "$DIR/node_modules" ] || ln -s "$REPO/node_modules" "$DIR/node_modules"
SHA="$(git -C "$DIR" rev-parse --short HEAD)"
echo "lane: $BRANCH @ $SHA"
cd "$DIR"
# fd 9 stays open through exec: lane runs queue behind each other, so no refresh ever moves the
# checkout under a run that is still reading it.
exec "$@"
