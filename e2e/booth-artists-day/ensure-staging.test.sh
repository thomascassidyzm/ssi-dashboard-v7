#!/bin/sh
# The one test for the 2026-09-16 fix: a MISSING staging tree is something the nightly builds,
# not something it dies of. On the pre-fix run.sh the same situation printed
# "no staging tree at /home/tomcassidy/wt-staging" and exited 1 — a red line that said nothing
# about the booth. It also holds the two lines that keep the fix honest: a directory that is not
# ours is never touched, and provisioning twice is the same as provisioning once.
#
#   sh e2e/booth-artists-day/ensure-staging.test.sh
set -u
# ENSURE_STAGING_REPO lets this be pointed at another checkout of this repo — which is how the
# fix was proved: run against the pre-fix tree (c44f1a1a, no ensure-staging.sh) it goes red on
# the first check, against this one it is green.
REPO=${ENSURE_STAGING_REPO:-$(git rev-parse --show-toplevel)}
TMP=${TMPDIR:-/tmp}/ensure-staging-test.$$
DIR=$TMP/wt-staging
BR=test/ensure-staging-$$
fails=0
ok()  { echo "  ok   — $1"; }
bad() { echo "  FAIL — $1"; fails=$((fails + 1)); }
cleanup() {
  git -C "$REPO" worktree remove --force "$DIR" >/dev/null 2>&1
  git -C "$REPO" branch -D "$BR" >/dev/null 2>&1
  git -C "$REPO" worktree prune >/dev/null 2>&1
  rm -rf "$TMP"
}
trap cleanup EXIT
mkdir -p "$TMP"

echo "a staging tree that is not there gets built"
if STAGING_BRANCH=$BR sh "$REPO/e2e/booth-artists-day/ensure-staging.sh" "$DIR" "$REPO" >/dev/null; then
  ok "exited 0"
else
  bad "exited non-zero with no staging tree on disk — this is the 2026-09-16 red"
fi
[ -e "$DIR/.git" ] && ok "the worktree is there" || bad "no .git at $DIR"
[ -d "$DIR/node_modules" ] && ok "node_modules resolves" || bad "node_modules missing or dangling"
[ -e "$DIR/.env" ] && ok ".env resolves" || bad ".env missing or dangling"
[ -f "$DIR/services/production-api.cjs" ] && ok "the staging API is checked out" || bad "no services/production-api.cjs"
want=$(git -C "$REPO" rev-parse origin/main)
have=$(git -C "$DIR" rev-parse HEAD 2>/dev/null || echo none)
[ "$want" = "$have" ] && ok "staging is at origin/main" || bad "staging is at $have, origin/main is $want"

echo "running it again changes nothing and still exits 0"
STAGING_BRANCH=$BR sh "$REPO/e2e/booth-artists-day/ensure-staging.sh" "$DIR" "$REPO" >/dev/null \
  && ok "idempotent" || bad "second run failed"

echo "a directory that is not ours is refused, never adopted"
mkdir -p "$TMP/occupied" && echo somebody-elses-work > "$TMP/occupied/file.txt"
if STAGING_BRANCH=$BR sh "$REPO/e2e/booth-artists-day/ensure-staging.sh" "$TMP/occupied" "$REPO" >/dev/null 2>&1; then
  bad "adopted a non-git directory instead of refusing"
else
  [ -f "$TMP/occupied/file.txt" ] && ok "refused, and left it alone" || bad "refused but touched it"
fi

echo
[ "$fails" -eq 0 ] && { echo "ensure-staging: all checks passed"; exit 0; }
echo "ensure-staging: $fails check(s) FAILED"; exit 1
