#!/bin/sh
# ensure-staging.sh — make the staging TREE exist, or say exactly why it cannot.
#
#   sh e2e/booth-artists-day/ensure-staging.sh <staging-dir> [repo-root]
#
# Staging is a git worktree of this repo living outside it (default ~/wt-staging), with its
# node_modules and .env linked to the shared checkout's real ones, fast-forwarded to origin/main.
# It used to be made by hand, once, in September 2026 — and on the night of 2026-09-15 it went
# missing and the nightly booth check went red with "no staging tree", which is a true statement
# about the box and tells nobody anything about the booth. Environment a human made by hand once
# is environment the next reboot or the next stray rm can take away, so the check now rebuilds it.
# What it must NOT do is pretend: every failure here is fatal and named, so a booth that genuinely
# cannot be stood up is still a red line, not a skipped one.
set -u
DIR=${1:?usage: ensure-staging.sh <staging-dir> [repo-root]}
REPO=${2:-$(pwd)}
BRANCH=${STAGING_BRANCH:-deploy/staging}

die() { echo "ensure-staging: $*" >&2; exit 1; }

git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 || die "$REPO is not a git checkout of this repo"

# -e, not -d: a worktree's .git is a FILE pointing at the common repo.
if [ ! -e "$DIR/.git" ]; then
  [ -e "$DIR" ] && die "$DIR exists but is not a git checkout — refusing to touch it; move it aside by hand"
  git -C "$REPO" fetch -q origin "$BRANCH" 2>/dev/null   # the branch may be local-only; not fatal
  if git -C "$REPO" show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git -C "$REPO" worktree add "$DIR" "$BRANCH" >/dev/null || die "could not add a worktree at $DIR on $BRANCH (is it checked out elsewhere?)"
  else
    git -C "$REPO" worktree add -b "$BRANCH" "$DIR" origin/main >/dev/null || die "could not add a worktree at $DIR on a new $BRANCH"
  fi
  echo "ensure-staging: created $DIR on $BRANCH"
fi

# node_modules and .env are never in the tree: link the REAL ones this checkout is using, so
# staging never needs its own install and never holds its own secret.
for link in node_modules .env; do
  [ -e "$DIR/$link" ] && continue
  src=$(readlink -f "$REPO/$link" 2>/dev/null || true)
  [ -n "$src" ] && [ -e "$src" ] || die "no $link to link from $REPO — staging cannot run without it"
  ln -s "$src" "$DIR/$link" || die "could not link $link into $DIR"
  echo "ensure-staging: linked $link -> $src"
done

( cd "$DIR" && git fetch -q origin main && git merge --ff-only origin/main >/dev/null ) \
  || die "could not fast-forward $DIR to origin/main"
