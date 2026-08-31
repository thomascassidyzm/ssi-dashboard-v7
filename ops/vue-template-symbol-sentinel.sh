#!/bin/sh
# vue-template-symbol-sentinel.sh — runs tools/check-vue-template-symbols.cjs once a night
# and is SILENT unless it breaks.
#
# WHY IT EXISTS. GitHub Actions stays permanently OFF on this repo (Tom's ruling) — the
# estate's automated checking runs as nightly cron jobs on watson-1, not workflow files. The
# check itself was wired into .github/workflows/explainer-check.yml on 2026-08-31, the
# afternoon a Voice Lab rewrite deleted `canRecord`/`pickFile`/`canSubmitClone` and the whole
# MediaRecorder block from a component's script while leaving their buttons in the template —
# Vue compiles the orphaned identifiers to `_ctx.<name>` and says nothing, so the build stayed
# green and "Record it here" shipped permanently disabled, blaming the browser. Tom hit it
# live in front of Aran. Because Actions never runs, that workflow step never ran either —
# this script is what actually holds the guarantee, following the pattern already proven by
# command-surface/ops/singular-routing-sentinel.sh.
#
# SILENT ON GREEN, deliberately, same reasoning as that sentinel: a daily "still green" card
# is how a real notice stops being read. On green it writes one line to its own log and exits.
# On RED it dispatches a single worker to say what broke, in the room where Tom will see it.
#
# Runs against ssi-dashboard-v7-clean-prod, not the interactive dev checkout — that checkout
# tracks whatever branch a human left it on, while -prod is kept fast-forwarded onto
# origin/main by its own popty-staleness-watchdog (every 10 min), so this always checks the
# code that's actually live, not an arbitrary feature branch.
#
# Install:  (crontab -l; echo '30 4 * * *  /bin/sh /home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod/ops/vue-template-symbol-sentinel.sh') | crontab -
DIR=/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod
LOG=/home/tomcassidy/.local/log/vue-template-symbol-sentinel.log
TS=$(/bin/date -u +%Y-%m-%dT%H:%M:%SZ)

cd "$DIR" || exit 1

# The checker skips itself with exit 0 if @vue/compiler-sfc isn't resolvable, so make sure
# it is — cheap and idempotent when already installed (it is, as a transitive Vite/Vue dep).
if ! /usr/bin/node -e "require('@vue/compiler-sfc')" >/dev/null 2>&1; then
  /usr/bin/npm install --no-save --no-audit --no-fund @vue/compiler-sfc@3 >/dev/null 2>&1
fi

OUT=$(/usr/bin/node "$DIR/tools/check-vue-template-symbols.cjs" 2>&1); RC=$?

if [ $RC -eq 0 ]; then
  /bin/echo "$TS PASS — no new _ctx. template-symbol misses" >> "$LOG"
  /bin/sh /home/tomcassidy/command-surface/ops/trim-log.sh "$LOG" 2>/dev/null
  exit 0
fi

{
  /bin/echo ""
  /bin/echo "=== $TS FAIL ==="
  /bin/echo "$OUT"
} >> "$LOG"

# RED. Dispatch one worker to report it. Identity comes from the shared cron include,
# fail-soft exactly as the singular-routing sentinel does it — a missing include leaves the
# vars empty and the surface treats the call as Tom's, the pre-existing behaviour for every
# cron dispatcher on this box.
. /home/tomcassidy/command-surface/ops/cs-cron-identity.sh 2>/dev/null || true
: "${CS_COOKIE:=}"; : "${CS_SURFACE:=http://localhost:4317}"

PROMPT="The Vue template-symbol gate found a NEW hit on $TS (tools/check-vue-template-symbols.cjs, rc=$RC).

Written 2026-08-31 after a Voice Lab rewrite silently deleted script bindings (canRecord,
pickFile, canSubmitClone, the whole MediaRecorder block) while their buttons stayed in the
template — Vue compiles an unknown identifier to _ctx.<name> and says NOTHING, at build time
or runtime, so the page shipped green and 'Record it here' rendered permanently disabled,
blaming the browser. Tom hit it live in front of Aran.

Verbatim output:

$OUT

Your job, in ONE turn, read-only unless the fix is obvious and provable:
1. Open the .vue file(s) named in the output and read the surrounding template + script setup.
2. Decide: was the binding deleted from the script (the exact bug class this gate exists to
   catch — the button/handler is now dead), or is it a genuine v-for alias used outside its
   loop, or a real global the component forgot to import?
3. If it's a deleted-binding regression, restore the binding or remove the dead
   template usage — whichever actually matches what the component is meant to do; do not
   guess without reading the surrounding code.
4. If it's a false positive (the identifier IS meant to resolve some other way), do NOT edit
   the baseline in tools/check-vue-template-symbols.cjs to silence it without being certain —
   say so and explain why in your report instead.
5. Commit the fix to its own docs/fix branch and merge to main per this repo's branch hygiene
   (CLAUDE.md) if you're confident; otherwise report findings only."

PAYLOAD=$(/usr/bin/node -e "const p=process.argv[1];const ts=process.argv[2];process.stdout.write(JSON.stringify({cwd:'$DIR',label:'Vue template-symbol gate',prompt:p,display:'Vue template-symbol gate FAILED '+ts,permission:'bypassPermissions',model:'sonnet'}))" "$PROMPT" "$TS")
/usr/bin/curl -s -m 30 -X POST "$CS_SURFACE/api/dispatch" -H "Content-Type: application/json" \
  -H "Cookie: cs_user=$CS_COOKIE" -H "Origin: $CS_SURFACE" --data "$PAYLOAD" >> "$LOG" 2>&1
/bin/echo "" >> "$LOG"
exit 1
