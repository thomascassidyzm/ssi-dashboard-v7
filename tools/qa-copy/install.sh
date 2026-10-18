#!/usr/bin/env bash
# Arm the QA database copy: the postgres + refresh units (USER manager), and the one-switch drop-in on each heavy nightly QA unit.
#   tools/qa-copy/install.sh            install + enable (daemon-reload)
#   tools/qa-copy/install.sh --off      remove the drop-ins: every QA unit reads live again (nothing else changes)
# The units that read the copy: audio-gap, sibling-identity, debut-practice, voice-variety, voice-audit.
# Those five are SYSTEM units (/etc/systemd/system, User=popty), so their drop-ins belong to the SYSTEM manager; a drop-in under
# ~/.config/systemd/user is read by nothing that runs them. The copy's own pg + refresh units stay user units.
# Overrides for tests: SYSTEM_UNIT_DIR (default /etc/systemd/system), SUDO (default "sudo", "" to run unprivileged).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
U="$HOME/.config/systemd/user"
SYS="${SYSTEM_UNIT_DIR:-/etc/systemd/system}"
SUDO="${SUDO-sudo}"
QA_UNITS="ssi-audio-gap ssi-sibling-identity ssi-debut-practice ssi-voice-variety ssi-voice-audit"
if [ "${1:-}" = "--off" ]; then
  for u in $QA_UNITS; do $SUDO rm -f "$SYS/$u.service.d/qa-copy.conf"; done
  $SUDO systemctl daemon-reload; echo "QA units read live again"; exit 0
fi
mkdir -p "$U"
cp "$HERE/systemd/ssi-qa-copy-pg.service" "$HERE/systemd/ssi-qa-copy-refresh.service" "$HERE/systemd/ssi-qa-copy-refresh.timer" "$U/"
# A system unit's %h is the User='s home (popty's), not ours; the env file lives in ours, so write the path out.
CONF="$(mktemp)"; trap 'rm -f "$CONF"' EXIT
# The pg unit is a user unit: a system unit cannot order against it, so the drop-in carries the env switch only.
grep -v '^\(After\|Wants\)=ssi-qa-copy-pg\|^\[Unit\]$' "$HERE/systemd/qa-copy.conf" | sed "s|%h|$HOME|g" > "$CONF"
for u in $QA_UNITS; do $SUDO mkdir -p "$SYS/$u.service.d"; $SUDO install -m 0644 "$CONF" "$SYS/$u.service.d/qa-copy.conf"; done
systemctl --user daemon-reload; $SUDO systemctl daemon-reload
systemctl --user enable --now ssi-qa-copy-refresh.timer
echo "armed: refresh timer (user) + system drop-ins on $QA_UNITS (postgres unit starts on demand; enable with: systemctl --user enable --now ssi-qa-copy-pg)"
