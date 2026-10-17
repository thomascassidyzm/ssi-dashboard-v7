#!/usr/bin/env bash
# Arm the QA database copy: the postgres + refresh units, and the one-switch drop-in on each heavy nightly QA unit.
#   tools/qa-copy/install.sh            install + enable (daemon-reload)
#   tools/qa-copy/install.sh --off      remove the drop-ins: every QA unit reads live again (nothing else changes)
# The units that read the copy: audio-gap, sibling-identity, debut-practice, voice-variety, voice-audit.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
U="$HOME/.config/systemd/user"
QA_UNITS="ssi-audio-gap ssi-sibling-identity ssi-debut-practice ssi-voice-variety ssi-voice-audit"
if [ "${1:-}" = "--off" ]; then
  for u in $QA_UNITS; do rm -f "$U/$u.service.d/qa-copy.conf"; done
  systemctl --user daemon-reload; echo "QA units read live again"; exit 0
fi
cp "$HERE/systemd/ssi-qa-copy-pg.service" "$HERE/systemd/ssi-qa-copy-refresh.service" "$HERE/systemd/ssi-qa-copy-refresh.timer" "$U/"
for u in $QA_UNITS; do mkdir -p "$U/$u.service.d"; cp "$HERE/systemd/qa-copy.conf" "$U/$u.service.d/qa-copy.conf"; done
systemctl --user daemon-reload
systemctl --user enable --now ssi-qa-copy-refresh.timer
echo "armed: refresh timer + drop-ins on $QA_UNITS (postgres unit starts on demand; enable with: systemctl --user enable --now ssi-qa-copy-pg)"
