#!/bin/sh
# Regression for review #290: run.sh armed its verdict trap AFTER the prerequisite checks, the
# fixture reset and the staging refresh, so a run dying at any of them wrote no red line and an
# earlier green for the same SHA stayed promotable. Here a green for staging's SHA is on file, the
# run fails (no .env, then a fixture reset that fails), and the LAST line for that SHA must be red.
#
#   sh e2e/booth-artists-day/run-verdict.test.sh
set -u
REPO=$(git rev-parse --show-toplevel)
TMP=${TMPDIR:-/tmp}/run-verdict-test.$$
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/stage" "$TMP/work/e2e/booth-artists-day" "$TMP/work/node_modules/.bin" "$TMP/ev/e2e/booth-artists-day"
git -C "$TMP/stage" init -q && git -C "$TMP/stage" commit -q --allow-empty -m x
SHA=$(git -C "$TMP/stage" rev-parse HEAD)
V=$TMP/ev/e2e/booth-artists-day/verdicts.jsonl
fails=0
ok()  { echo "  ok   — $1"; }
bad() { echo "  FAIL — $1"; fails=$((fails + 1)); }
run() {
  printf '{"sha":"%s","rc":0,"at":"2026-10-03T02:10:00Z"}\n' "$SHA" > "$V"
  ( cd "$TMP/work" && REFRESH_STAGING=1 STAGING_DIR="$TMP/stage" SSI_EVIDENCE_ROOT="$TMP/ev" sh "$REPO/e2e/booth-artists-day/run.sh" >/dev/null 2>&1 )
  rc=$?
  last=$(grep "\"$SHA\"" "$V" | tail -1)
  [ "$rc" -ne 0 ] && ok "$1: run exits non-zero" || bad "$1: run should have failed"
  case "$last" in *'"rc":0'*|'') bad "$1: green still the last word for the SHA: $last" ;; *) ok "$1: red line supersedes the earlier green" ;; esac
}
echo "missing prerequisite (no .env)"
run "no .env"
echo "fixture reset fails"
touch "$TMP/work/.env" "$TMP/work/node_modules/.bin/playwright"; chmod +x "$TMP/work/node_modules/.bin/playwright"
echo 'process.exit(1)' > "$TMP/work/e2e/booth-artists-day/fixture.cjs"
run "failed reset"
[ "$fails" -eq 0 ] && echo "all ok" || { echo "$fails FAILED"; exit 1; }
