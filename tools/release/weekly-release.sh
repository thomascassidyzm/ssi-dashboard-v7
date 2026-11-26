#!/bin/sh
# Popty weekly release (cs #948, Tom 14 Nov: "Only builds to production when there is an update. Which should be on a
# weekly cadence. Apart from hot fixes, which do happen." / "Popty shouldn't need 98 builds a week").
# Vercel's ignored-build step for ssi-dashboard-v7 (dashboard setting, command-surface ops/vercel-production-filter.cjs
# --release) builds popty.app ONLY from a main commit whose message STARTS with [release] or [hotfix]. This script makes the
# weekly [release] commit — an EMPTY commit on main — and only when main has moved since the last [release]/[hotfix].
# SUPERSEDED (cs #537, 26 Nov): popty.app ships from tools/release/prod-deploy.cjs (hourly on deployable change, built on
# watson-1, uploaded prebuilt). This timer is disabled; a [release] commit it made would still ship on the next tick.
# Run by popty-weekly-release.timer (ops/systemd/). By hand: systemctl --user start popty-weekly-release.service
# A hot fix: START the fix commit subject with [hotfix] (or push an empty `[hotfix] <why>` commit on main).
# Undo the whole thing: node ops/vercel-production-filter.cjs --apply --restore <record> prj_FUHJ5A3KZjnJqIBIpk1syH6ttHPY
# (command-surface; the record is in ~/.local/state/cs-vercel-gate/production-filter-history.jsonl), and disable the timer.
# The whole body is one function so sh has parsed it before the clone holding this file is reset.
main() {
  set -eu
  CLONE="${POPTY_RELEASE_CLONE:-$HOME/.cs-builds/popty-release}"
  REMOTE=https://github.com/thomascassidyzm/ssi-dashboard-v7.git
  [ -d "$CLONE/.git" ] || git clone -q --depth 300 --branch main "$REMOTE" "$CLONE"
  cd "$CLONE"
  for try in 1 2 3; do
    git fetch -q --depth 300 origin main && git reset -q --hard origin/main
    head=$(git rev-parse HEAD)
    # Match the SUBJECT only: --grep searches the whole message, so a body line starting [hotfix] made an ordinary
    # commit look like a release and skipped the week (review 9dbf075d #2). Same test as the Vercel gate.
    last=$(git log --format='%H %s' HEAD | grep -m1 -E '^[0-9a-f]{40} \[(release|hotfix)\]' | cut -d' ' -f1 || true)
    if [ -n "$last" ] && [ "$last" = "$head" ]; then
      echo "popty-release: main unchanged since the last release ($(git rev-parse --short HEAD)) — no build"; exit 0
    fi
    # cs #476·AJ: main moving is not enough. In the week before the gate, 85 of 117 builds shipped nothing (ops/,
    # docs/, watson-1-only services and tools). Release only when a file popty.app actually ships changed; exit 2
    # from the checker (could not tell) releases, so a broken check never silently freezes production.
    if [ -n "$last" ]; then
      rc=0; node tools/release/deployed-changed.cjs "$last" HEAD >/dev/null || rc=$?
      if [ "$rc" = 1 ]; then
        echo "popty-release: main moved since $(git rev-parse --short "$last") but nothing popty.app ships changed — no build"; exit 0
      fi
    fi
    if [ -n "$last" ]; then since="$(git rev-list --count "$last..HEAD") commits since $(git rev-parse --short "$last")"; else since="first release under the cs #948 gate"; fi
    git commit -q --allow-empty -m "[release] Popty weekly release: $since (cs #948)" -m "Vercel builds popty.app production from [release]/[hotfix] commits only (r-2026-11-14-build-cadence-production-builds-only-when)."
    if git push -q origin HEAD:main; then echo "popty-release: pushed $(git rev-parse --short HEAD) ($since); Vercel builds production from it"; exit 0; fi
    echo "popty-release: push refused (main moved?), retry $try"; sleep 5
  done
  echo "popty-release: FAILED to push the release commit after 3 tries" >&2; exit 1
}
main "$@"
