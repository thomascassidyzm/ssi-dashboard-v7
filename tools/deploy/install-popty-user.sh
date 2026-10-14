#!/usr/bin/env bash
# Popty under its own Unix user (job #391, Tom 2026-10-14).
#
# Moves Popty's services from tomcassidy user units to system units running as `popty`,
# and moves the secrets they need (the prod .env: Supabase service key, AWS, provider keys;
# the DB owner login) into /etc/popty, readable only by popty. Idempotent: re-running it
# re-installs the units and re-asserts permissions; the secret move happens once.
#
#   sudo tools/deploy/install-popty-user.sh stage    # user, secrets COPIED, perms, units installed but not started
#   sudo tools/deploy/install-popty-user.sh cutover  # stop the user units, start the system ones, then remove tomcassidy's copies
#
# Run from the prod checkout. `cutover` removes the tomcassidy-readable originals only after every
# system unit is active (make-before-break); the originals are kept in /etc/popty/pre-391/.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "run with sudo"; exit 64; }
TOM=tomcassidy
TH=/home/$TOM
PROD=$TH/SSi/ssi-dashboard-v7-clean-prod
SRC=$(cd "$(dirname "$0")/../../ops/systemd/popty-user" && pwd)
UNITS=(popty-production-api popty-course-builder-api popty-phase8-audio)
ONESHOTS=(ssi-round-index cs-db-watchdog)
as_tom() { sudo -u $TOM XDG_RUNTIME_DIR=/run/user/$(id -u $TOM) "$@"; }

stage() {
  id popty >/dev/null 2>&1 || useradd --system --user-group --home-dir /var/lib/popty --create-home --shell /usr/sbin/nologin popty
  usermod -aG $TOM popty

  install -d -o popty -g popty -m 0700 /etc/popty /etc/popty/pre-391
  [[ -f /etc/popty/popty.env ]] || install -o popty -g popty -m 0600 $PROD/.env /etc/popty/popty.env
  [[ -f /etc/popty/owner.env ]] || install -o popty -g popty -m 0600 $TH/.config/ssi-db/owner.env /etc/popty/owner.env
  # Tools that read $HOME/.config/ssi-db/owner.env (migration runners) work under `sudo -u popty -H`.
  install -d -o popty -g popty -m 0700 /var/lib/popty/.config /var/lib/popty/.config/ssi-db
  ln -sfn /etc/popty/owner.env /var/lib/popty/.config/ssi-db/owner.env

  # The course builder's claude CLI: its own config dir; the account-3 token is read through a link
  # so the surface rotating it reaches Popty too. Group-readable for popty only (popty is the group's
  # one other member).
  install -d -o popty -g $TOM -m 0770 /var/lib/popty/claude
  chmod 0640 $TH/.cs-accounts/account-3/.cs-oauth-token
  ln -sfn $TH/.cs-accounts/account-3/.cs-oauth-token /var/lib/popty/claude/.cs-oauth-token
  [[ -f /var/lib/popty/claude/settings.json ]] || install -o popty -g $TOM -m 0664 $TH/.cs-accounts/account-3/settings.json /var/lib/popty/claude/settings.json

  # Where Popty writes in Tom's home: group-writable (umask 0002 keeps new files that way).
  chmod -R g+w $PROD/data $PROD/logs $PROD/scripts $PROD/dist 2>/dev/null || true
  chmod g+w $PROD
  for d in $TH/.local/state $TH/.local/log $TH/ssi-evidence "$(sed -n 's/^VFS_ROOT=//p' /etc/popty/popty.env)"; do
    [[ -n "$d" && -e "$d" ]] && chmod -R g+rwX "$d"
  done
  chmod -R g+rX $TH/.local/state/ssi-tts-spend/tom-stop   # Tom's audio stop must be visible to the guard
  chmod 0640 $TH/.cs-cron-session                         # the DB watchdog posts its notices with it

  install -m 0644 "$SRC"/*.service "$SRC"/*.timer /etc/systemd/system/
  install -m 0644 "$SRC"/50-popty-units.rules /etc/polkit-1/rules.d/50-popty-units.rules
  systemctl daemon-reload
  echo "staged: user popty, /etc/popty, units installed (not started)"
}

cutover() {
  stage
  # The user units hold the ports; stop and mask them so nothing restarts a second copy.
  for u in "${UNITS[@]}"; do
    as_tom systemctl --user stop $u.service || true
    as_tom systemctl --user mask $u.service || true
    systemctl enable $u.service
    if [[ $u == popty-phase8-audio ]]; then systemctl start $u.service; else systemctl restart $u.service; fi
  done
  for t in "${ONESHOTS[@]}"; do
    as_tom systemctl --user disable --now $t.timer || true
    as_tom systemctl --user mask $t.service $t.timer || true
    systemctl enable --now $t.timer
  done
  sleep 8
  local bad=0
  for u in "${UNITS[@]}"; do systemctl is-active --quiet $u.service || { echo "NOT ACTIVE: $u"; bad=1; }; done
  if (( bad )); then echo "cutover incomplete: tomcassidy's secret copies left in place"; exit 2; fi

  # Make-before-break: only now remove the copies tomcassidy can read.
  mv -n $PROD/.env /etc/popty/pre-391/prod.env 2>/dev/null || true
  mv -n $TH/.config/ssi-db/owner.env /etc/popty/pre-391/owner.env 2>/dev/null || true
  mv -n $TH/.config/ssi-db/ssi-learning-app.env.pre-384 /etc/popty/pre-391/ 2>/dev/null || true
  chown -R popty:popty /etc/popty/pre-391 && chmod -R go-rwx /etc/popty/pre-391
  echo "cutover done: Popty runs as popty; prod .env and owner.env are readable only by popty"
}

case "${1:-}" in
  stage) stage ;;
  cutover) cutover ;;
  *) echo "usage: $0 stage|cutover"; exit 64 ;;
esac
