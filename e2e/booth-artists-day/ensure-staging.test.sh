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

echo "a dirty staging tree on a stray branch is refused, and left exactly as it was"
STRAY=$BR-stray
git -C "$DIR" checkout -q -b "$STRAY"
echo "// stray edit" >> "$DIR/services/production-api.cjs"
out=$(STAGING_BRANCH=$BR sh "$REPO/e2e/booth-artists-day/ensure-staging.sh" "$DIR" "$REPO" 2>&1); rc=$?
[ "$rc" -ne 0 ] && ok "exited non-zero" || bad "exited 0 with uncommitted edits in the tree"
[ "$(git -C "$DIR" rev-parse --abbrev-ref HEAD)" = "$STRAY" ] && ok "original branch still checked out" || bad "switched branch under a dirty tree"
echo "$out" | grep -q "services/production-api.cjs" && ok "message names the dirty file" || bad "message does not name the dirty file: $out"
git -C "$DIR" checkout -q -- services/production-api.cjs
git -C "$DIR" checkout -q "$BR"; git -C "$DIR" branch -D "$STRAY" >/dev/null 2>&1

echo "an untracked file in a tracked-clean staging tree is refused, and left exactly as it was"
echo "<p>stray</p>" > "$DIR/public/stray.html"
before=$(git -C "$DIR" rev-parse HEAD)
out=$(STAGING_BRANCH=$BR sh "$REPO/e2e/booth-artists-day/ensure-staging.sh" "$DIR" "$REPO" 2>&1); rc=$?
[ "$rc" -ne 0 ] && ok "exited non-zero" || bad "exited 0 with an untracked file in the tree"
echo "$out" | grep -q "public/stray.html" && ok "message names the untracked file" || bad "message does not name the untracked file: $out"
[ -f "$DIR/public/stray.html" ] && [ "$(git -C "$DIR" rev-parse HEAD)" = "$before" ] && ok "tree untouched" || bad "tree changed under an untracked file"
rm -f "$DIR/public/stray.html"

echo "staging follows its OWN branch (origin/deploy/staging), not main — the 2026-10-02 tier"
rm -f "$DIR/public/stray.html"
AHEAD=$(git -C "$REPO" commit-tree "$(git -C "$REPO" rev-parse 'origin/main^{tree}')" -p "$(git -C "$REPO" rev-parse origin/main)" -m "test: staging is ahead of main")
git -C "$REPO" update-ref "refs/remotes/origin/$BR" "$AHEAD"
STAGING_BRANCH=$BR sh "$REPO/e2e/booth-artists-day/ensure-staging.sh" "$DIR" "$REPO" >/dev/null 2>&1
have=$(git -C "$DIR" rev-parse HEAD 2>/dev/null || echo none)
[ "$have" = "$AHEAD" ] && ok "staging fast-forwarded to origin/$BR, past main" || bad "staging is at $have, origin/$BR is $AHEAD (still tracking main?)"
git -C "$REPO" update-ref -d "refs/remotes/origin/$BR"

echo
[ "$fails" -eq 0 ] && { echo "ensure-staging: all checks passed"; exit 0; }
echo "ensure-staging: $fails check(s) FAILED"; exit 1
