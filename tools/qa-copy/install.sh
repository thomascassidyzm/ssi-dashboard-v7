#!/usr/bin/env bash
# Arm the QA database copy: the postgres + refresh units (USER manager), and the switch drop-in on every batch reader
# that reads the copy instead of the live database (jobs #891, #204; /d/d8c4e29d).
#   tools/qa-copy/install.sh                 install every move below + the copy's own units, daemon-reload
#   tools/qa-copy/install.sh <unit>...       move only those jobs (one at a time is the reversible way)
#   tools/qa-copy/install.sh --off [<unit>...]   remove the drop-ins (all, or those): the job reads live again
#   tools/qa-copy/install.sh --list          print the table of moves
# Each job lives in ONE manager, and its drop-in must go to that manager: a drop-in under ~/.config/systemd/user is
# read by nothing that runs a SYSTEM unit, and the reverse (F17a's lesson, kept). Several QA units exist in both
# managers; only the one whose timer is armed matters, but both get the switch so re-arming either is safe.
# HOW a job is switched (the third column):
#   env    EnvironmentFile=-<copy env>: DATABASE_URL points at the copy. Pure readers; absent file = live as before.
#   read   Environment=QA_COPY_ENV=<copy env>: the job's READS go to the copy, its WRITES stay live (voices-reconcile).
#   fresh  EnvironmentFile=-<fresh env>: as env, but only while the copy is tonight's (jobs that judge a recent day).
#   pulse  Environment=SSI_PULSE_COPY_ENV=<fresh env>: the pulse/POI's own switch, same freshness rule.
# A fourth column re-times the job's timer to run after the 03:38 UTC refresh (so it reads a copy minutes old).
# Overrides for tests: SYSTEM_UNIT_DIR (default /etc/systemd/system), USER_UNIT_DIR, SUDO (default "sudo", "" none).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
U="${USER_UNIT_DIR:-$HOME/.config/systemd/user}"
SYS="${SYSTEM_UNIT_DIR:-/etc/systemd/system}"
SUDO="${SUDO-sudo}"
COPY_ENV="$HOME/ssi-restore/qa-copy.env"
FRESH_ENV="$HOME/ssi-restore/qa-copy-fresh.env"
# manager  unit                    how    timer (UTC, "-" = unchanged)
MOVES="
user    ssi-audio-gap           env    -
user    ssi-sibling-identity    env    -
user    ssi-voice-variety       env    -
user    ssi-voice-audit         env    -
user    ssi-debut-practice      env    -
system  ssi-audio-gap           env    -
system  ssi-sibling-identity    env    -
system  ssi-voice-variety       env    -
system  ssi-voice-audit         env    -
system  ssi-debut-practice      env    -
system  ssi-voice-coverage      env    04:05
user    ssi-voices-reconcile    read   -
user    ssi-intel-nightly       fresh  04:00
user    cs-ssi-telemetry-pulse  pulse  -
user    cs-ssi-poi-nightly      pulse  -
"
dir_of() { [ "$1" = system ] && echo "$SYS" || echo "$U"; }
run_as() { if [ "$1" = system ]; then shift; $SUDO "$@"; else shift; "$@"; fi; }
conf_for() {
  case "$1" in
    env)   printf '[Service]\nEnvironmentFile=-%s\n' "$COPY_ENV" ;;
    read)  printf '[Service]\nEnvironment=QA_COPY_ENV=%s\n' "$COPY_ENV" ;;
    fresh) printf '[Service]\nEnvironmentFile=-%s\n' "$FRESH_ENV" ;;
    pulse) printf '[Service]\nEnvironment=SSI_PULSE_COPY_ENV=%s\n' "$FRESH_ENV" ;;
    *) echo "unknown switch $1" >&2; return 1 ;;
  esac
}
OFF=0; LIST=0; ONLY=()
for a in "$@"; do case "$a" in --off) OFF=1 ;; --list) LIST=1 ;; *) ONLY+=("${a%.service}") ;; esac; done
wanted() { [ ${#ONLY[@]} -eq 0 ] && return 0; local u; for u in "${ONLY[@]}"; do [ "$u" = "$1" ] && return 0; done; return 1; }
if [ $LIST = 1 ]; then echo "$MOVES" | sed '/^$/d'; exit 0; fi
[ ${#ONLY[@]} -eq 0 ] || for u in "${ONLY[@]}"; do echo "$MOVES" | awk -v u="$u" '$2==u{f=1} END{exit !f}' || { echo "not in the table: $u" >&2; exit 3; }; done

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
did_user=0; did_sys=0
while read -r mgr unit how timer; do
  [ -n "${mgr:-}" ] || continue
  wanted "$unit" || continue
  D="$(dir_of "$mgr")"
  # A unit this manager does not define gets no drop-in (and none is left behind by --off).
  if [ $OFF = 0 ] && [ ! -f "$D/$unit.service" ]; then continue; fi
  if [ $OFF = 1 ]; then
    run_as "$mgr" rm -f "$D/$unit.service.d/qa-copy.conf" "$D/$unit.timer.d/qa-copy.conf"
  else
    conf_for "$how" > "$TMP/s.conf"
    run_as "$mgr" mkdir -p "$D/$unit.service.d"; run_as "$mgr" install -m 0644 "$TMP/s.conf" "$D/$unit.service.d/qa-copy.conf"
    if [ "$timer" != - ] && [ -f "$D/$unit.timer" ]; then
      printf '[Timer]\n# After the 03:38 UTC QA-copy refresh (tools/qa-copy, job #204): it reads a copy minutes old.\nOnCalendar=\nOnCalendar=*-*-* %s:00 UTC\n' "$timer" > "$TMP/t.conf"
      run_as "$mgr" mkdir -p "$D/$unit.timer.d"; run_as "$mgr" install -m 0644 "$TMP/t.conf" "$D/$unit.timer.d/qa-copy.conf"
    fi
  fi
  echo "$([ $OFF = 1 ] && echo live || echo copy): $mgr $unit ($how)"
  [ "$mgr" = system ] && did_sys=1 || did_user=1
done <<< "$MOVES"

if [ $OFF = 0 ] && [ ${#ONLY[@]} -eq 0 ]; then
  mkdir -p "$U"
  cp "$HERE/systemd/ssi-qa-copy-pg.service" "$HERE/systemd/ssi-qa-copy-refresh.service" "$HERE/systemd/ssi-qa-copy-refresh.timer" "$U/"
  did_user=1
fi
[ $did_user = 1 ] && systemctl --user daemon-reload
[ $did_sys = 1 ] && $SUDO systemctl daemon-reload
if [ $OFF = 0 ] && [ ${#ONLY[@]} -eq 0 ]; then systemctl --user enable --now ssi-qa-copy-refresh.timer; fi
exit 0
