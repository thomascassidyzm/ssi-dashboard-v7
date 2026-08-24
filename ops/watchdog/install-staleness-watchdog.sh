#!/bin/sh
# Install the Popty deploy-staleness watchdog into the USER crontab.
# Idempotent: run it twice, get one cron line. Works on Linux and macOS.
#
#   sh ops/watchdog/install-staleness-watchdog.sh
#
# Cron rather than launchd on the Mac deliberately: the liveness watchdog next
# door is already a user-crontab entry, one mechanism is cheaper to reason about
# than two, and cron survives the user-session failures launchd agents don't.

set -e

# Never abort the install because a diagnostic print failed.

REPO=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$REPO/ops/watchdog/popty-staleness-watchdog.sh"
MARKER="# popty-staleness-watchdog"
LINE="*/10 * * * *  /bin/sh $SCRIPT   $MARKER: is the running code behind origin/main?"

[ -f "$SCRIPT" ] || { echo "not found: $SCRIPT"; exit 1; }
chmod +x "$SCRIPT"

CURRENT=$(crontab -l 2>/dev/null || true)

if printf '%s\n' "$CURRENT" | grep -qF "$MARKER"; then
  # Replace in place so a moved checkout or changed cadence is picked up.
  printf '%s\n' "$CURRENT" | grep -vF "$MARKER" > /tmp/popty-cron.$$
  echo "$LINE" >> /tmp/popty-cron.$$
  crontab /tmp/popty-cron.$$
  rm -f /tmp/popty-cron.$$
  echo "updated existing crontab entry"
else
  { printf '%s\n' "$CURRENT"; echo "$LINE"; } | grep -v '^$' | crontab -
  echo "added crontab entry"
fi

echo "installed: every 10 minutes -> $SCRIPT"
echo "running once now to prove it works..."
/bin/sh "$SCRIPT"
echo "--- state ---"
cat "${POPTY_STALENESS_STATE:-/tmp/popty-staleness-$(basename "$REPO").json}"
echo
echo "--- log tail ---"
tail -5 "${POPTY_WATCHDOG_LOG:-$HOME/.local/log/popty-watchdog.log}" 2>/dev/null || true
