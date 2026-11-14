#!/bin/sh
# Popty weekly release (cs #948, Tom 14 Nov: "Only builds to production when there is an update. Which should be on a
# weekly cadence. Apart from hot fixes, which do happen." / "Popty shouldn't need 98 builds a week").
# Vercel's ignored-build step for ssi-dashboard-v7 (dashboard setting, command-surface ops/vercel-production-filter.cjs
# --release) builds popty.app ONLY from a main commit whose message carries [release] or [hotfix]. This script makes the
# weekly [release] commit — an EMPTY commit on main — and only when main has moved since the last [release]/[hotfix].
# Run by popty-weekly-release.timer (ops/systemd/). By hand: systemctl --user start popty-weekly-release.service
# A hot fix: put [hotfix] in the commit message of the fix itself (or push an empty `[hotfix] <why>` commit on main).
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
    last=$(git log -1 --format=%H -E --grep='\[(release|hotfix)\]' HEAD || true)
    if [ -n "$last" ] && [ "$last" = "$head" ]; then
      echo "popty-release: main unchanged since the last release ($(git rev-parse --short HEAD)) — no build"; exit 0
    fi
    if [ -n "$last" ]; then since="$(git rev-list --count "$last..HEAD") commits since $(git rev-parse --short "$last")"; else since="first release under the cs #948 gate"; fi
    git commit -q --allow-empty -m "[release] Popty weekly release: $since (cs #948)" -m "Vercel builds popty.app production from [release]/[hotfix] commits only (r-2026-11-14-build-cadence-production-builds-only-when)."
    if git push -q origin HEAD:main; then echo "popty-release: pushed $(git rev-parse --short HEAD) ($since); Vercel builds production from it"; exit 0; fi
    echo "popty-release: push refused (main moved?), retry $try"; sleep 5
  done
  echo "popty-release: FAILED to push the release commit after 3 tries" >&2; exit 1
}
main "$@"
