#!/usr/bin/env bash
# cs #950: one bounded waker. Wakes the job when it is quiet hours (22:00-07:00 UK) AND Kai's ita tile repair
# (tools/changeset/apply-changeset.cjs on ops/937-ita-tiles) shows no sign of running. Reads no database.
#   usage: quiet-wake.sh <conversation id>      (CS_CONV_TOKEN in the environment, never on argv)
# Wakes: CLEAR (go), BUSY-AT-01 (still busy at 01:00 UK; includes the DB load gate level), TIMED OUT (07:00 UK).
set -uo pipefail
CONV="${1:?conversation id}"
busy_reason() {
  local r=""
  pgrep -af 'apply-changeset' | grep -v -e quiet-wake -e pgrep >/dev/null && r+="apply-changeset process running; "
  systemctl --user list-units --state=active,activating --no-legend 2>/dev/null | grep -Ei '937-ita|apply-changeset' >/dev/null && r+="user unit active; "
  systemctl list-units --state=active,activating --no-legend 2>/dev/null | grep -Ei '937-ita|apply-changeset' >/dev/null && r+="system unit active; "
  local led; led=$(find "$HOME/SSi" "$HOME/.cs-worktrees" -maxdepth 4 -path '*937-ita-tiles*' -name '*.applied.jsonl' -mmin -15 2>/dev/null | head -1)
  [ -n "$led" ] && r+="ledger written <15 min ago ($led); "
  printf '%s' "$r"
}
M=""; told01=0
for i in $(seq 1 240); do                     # 240 x 5 min = 20 h ceiling; the 07:00 UK bound ends it first
  h=$((10#$(TZ=Europe/London date +%H)))
  if [ "$h" -ge 7 ] && [ "$h" -lt 22 ] && [ "$i" -gt 1 ] && [ -n "${SEEN_NIGHT:-}" ]; then
    M="TIMED OUT at $(TZ=Europe/London date +%H:%M) UK: quiet hours ended without a clear window. Last busy: ${LAST:-none}"; break
  fi
  if [ "$h" -ge 22 ] || [ "$h" -lt 7 ]; then
    SEEN_NIGHT=1
    LAST=$(busy_reason)
    if [ -z "$LAST" ]; then M="WAKE CLEAR at $(TZ=Europe/London date +%H:%M) UK: quiet hours, no sign of Kai's apply-changeset run. Run step 2."; break; fi
    if [ "$h" -ge 1 ] && [ "$h" -lt 7 ] && [ "$told01" -eq 0 ]; then
      gate=$(cd "$HOME/command-surface" && timeout 30 node ops/db-load-governor.cjs signal 2>/dev/null | grep -o '"level": *"[a-z]*"' | head -1)
      M="BUSY-AT-01 at $(TZ=Europe/London date +%H:%M) UK: $LAST DB load gate: ${gate:-unreadable}. Decide per brief (go only if green)."; break
    fi
  fi
  sleep 300
done
M=${M:-"TIMED OUT after 20 h waiting for quiet hours"}
node "$HOME/command-surface/tools/cs-wake-send.cjs" "$CONV" "$CS_CONV_TOKEN" "$M"
