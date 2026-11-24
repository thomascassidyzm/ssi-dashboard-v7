#!/usr/bin/env bash
# cs #251·AL: write the Korean prompts for seeds $1 (files only, no DB), commit them, wake the job. Durable checkout.
set -u
R=${1:-1-668}; CONC=${2:-3}
cd "$(dirname "$0")/../../.."
export PATH=$HOME/.local/bin:$PATH
CONV=ae1f934c-2a29-4efa-b1a3-e69bf78b6492
node tools/course-optimization/cym-for-kor-rebuild-251.cjs korean "$R" "$CONC" 2>&1 | grep -v language-code
RC=${PIPESTATUS[0]}
N=$(ls ops/cym-for-kor/rebuild-251/ko/ | wc -l); F=$(journalctl --user -u cs-long-keep-251-korean --no-pager 2>/dev/null | grep -c FAILED)
git add ops/cym-for-kor/rebuild-251/ko && git commit -qm "cym-for-kor rebuild-251 (cs #251·AL): Korean prompts $R ($N seed files)" && git push -q origin HEAD:cs/251-run
node ~/command-surface/tools/cs-wake-send.cjs "$CONV" "$(cat ~/.cs-long/251/.tok)" "WAKE: cs251 Korean run $R finished rc=$RC; $N seed files; FAILED lines $F (journalctl --user -u cs-long-keep-251-korean)"
