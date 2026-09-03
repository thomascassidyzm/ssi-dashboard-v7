# Scheduling scout: how to run one small nightly node script on watson-1 — 2026-08-18

READ-ONLY. Nothing installed, nothing edited. Question: what mechanism does this estate
already use to run a job every morning on its own, and which one should a new nightly
node script use?

**Answer up front: user crontab (`crontab -e` for `tomcassidy`), not systemd `--user` timers.**
There is exactly one systemd `--user` timer on this box and it is a stock Ubuntu one
(`launchpadlib-cache-clean.timer`) — nothing SSi-related has ever used a systemd timer for
scheduling. The estate's actual nightly/periodic mechanism, used by ~25 live lines, is the
user crontab, calling scripts in `command-surface/ops/` or node files directly, logging to
`~/.local/log/`.

---

## 1. systemd `--user` timers — AVAILABLE, not LIVE for anything SSi

```
$ systemctl --user list-timers --all
NEXT                            LEFT LAST                         PASSED UNIT
Tue 2026-08-18 14:57:31 UTC 3h... launchpadlib-cache-clean.timer  ...

1 timers listed.
```

That's the only timer unit that exists, loaded from Ubuntu's default user units — not
something anyone on this estate wrote. `systemctl --user list-unit-files --type=timer`
confirms only two timer *files* exist at all: `launchpadlib-cache-clean.timer` (enabled)
and `systemd-tmpfiles-clean.timer` (disabled, stock).

**Memory-note check on `systemd --user` vs pm2**: **confirmed** — `systemctl --user
list-units --type=service` shows pm2 is genuinely gone; all persistent Popty/Zenjin/Voicelab
processes run as systemd `--user` **services** (`popty-orchestrator.service`,
`popty-phase8-audio.service`, `popty-production-api.service`, `popty-course-builder-api.service`,
`popty-proofread.service`, `popty-concat-listen.service`, `popty-seed1-listen.service`,
`voicelab-playground.service`, four `zenjin-*.service`, `command-surface-dev.service`). And
the stdout-location half of the memory is also confirmed by direct inspection of a unit file
(`popty-orchestrator.service`):

```
StandardOutput=append:/home/tomcassidy/.local/log/popty-orchestrator.log
StandardError=append:/home/tomcassidy/.local/log/popty-orchestrator.log
```

**But** — and this is the correction the memory note doesn't make explicit — those are
**long-running `Type=simple` services with `Restart=always`**, not scheduled jobs. Nothing
in this estate pairs a systemd `--user` **service** with a systemd `--user` **timer** to run
something once a day. The `--user` timer mechanism exists in principle (you could write a
`.timer` + `.service` pair and `systemctl --user enable --now` it) but zero precedent for it
exists on this host for a periodic/nightly task. If you used it, you'd be adding a new
mechanism, which is exactly what you were told not to do.

## 2. crontab — LIVE, and this is the estate's real answer

`crontab -l` for `tomcassidy` lists **~25 active lines**, several explicitly timed for a
morning UTC/London window, e.g.:

```
0 6,7 * * *   /bin/sh .../ops/butler-digest.sh        # Butler morning digest — fires on
                                                          whichever hour is 07:00 in London
0 17 * * 4    /usr/bin/node .../release-train/candidate-report.mjs >> ~/.local/log/ssi-release-train.log 2>&1; \
              /bin/sh .../ops/trim-log.sh ~/.local/log/ssi-release-train.log
20 4 * * *    /usr/bin/node .../ops/growth-sentinel.js --quiet >> ~/.local/log/cs-growth-sentinel-cron.log 2>&1; \
              /bin/sh .../ops/trim-log.sh ~/.local/log/cs-growth-sentinel-cron.log
*/2 * * * *   /bin/sh .../ssi-dashboard-v7-clean/ops/watchdog/popty-services-watchdog.sh
```

`candidate-report.mjs` is the closest precedent to your task: a plain node script, invoked
directly by absolute path with `/usr/bin/node`, output redirected to a log under
`~/.local/log/`, trimmed by the shared `ops/trim-log.sh` helper on the same line. No wrapper
shell script needed for a simple case — you only need one if you want TZ-aware gating
(see `butler-digest.sh`'s `[ "$(TZ=Europe/London date +%H)" = "07" ] || exit 0` trick, needed
because the box runs UTC and "07:00 local" drifts across DST).

**`/etc/cron.d` and `/etc/cron.daily`** (system-level, root-owned): nothing SSi-related —
just `.placeholder`, `e2scrub_all`, and stock Debian/Ubuntu daily jobs (`apport`,
`apt-compat`, `dpkg`, `logrotate`, `man-db`). Not in play.

**Known hazard, documented by the estate itself** (`ops/cron-estate-is-the-code-in-git-2026-08-07.md`):
14 of the ops scripts a crontab line calls were, as of that doc, edited in the working tree
but never committed — and `ops/git-sync.sh`'s auto-mirror path can `git reset --hard` and wipe
uncommitted edits to files a cron line depends on. That's a warning about *editing existing*
cron-called scripts in place, not about the crontab mechanism itself — but it means: **commit
your new script to the repo** before pointing a crontab line at it, don't leave it as an
uncommitted file in a checkout that `git-sync.sh` might reset.

## 3. Command Surface's own scheduler (read-only reference)

Command Surface has no separate in-app cron/scheduler concept of its own for recurring
dispatches — it delegates entirely to the same OS crontab described above.
`ops/worker-doctrine.md` documents cron as the standing mechanism for surface-side recurring
work: `ops/restart-on-flag.sh` (cron, out-of-process, restarts on a flag file),
`ops/drain-gate-verify.sh` ("cron-driven, drops the flag, waits for the service to [restart],
own cron line — arm it and end your turn"), `ops/tmp-litter-sweep.sh` ("run daily at 04:15 by
cron"). Registering a recurring dispatch in this estate's own doctrine = adding a crontab
line, full stop. Turning one off = removing/commenting that crontab line (see §5 below) —
there is no separate on/off switch inside Command Surface for a cron-backed job.

## 4. This repo (ssi-dashboard-v7-clean) itself

- No cron/timer/schedule config of its own. `.github/workflows/` has two workflows
  (`auto-merge-claude.yml`, `explainer-check.yml`), both triggered by `push`/`pull_request`
  only — **neither has a `schedule:` trigger**, so GitHub Actions cron is not in use here.
- The repo does contribute *targets* that the estate's crontab calls by absolute path
  (`ops/watchdog/popty-services-watchdog.sh`, `ops/watchdog/popty-staleness-watchdog.sh`),
  confirming the pattern: the scheduling lives in the user crontab, not in the repo.

---

## Recommendation

Use the **user crontab**, following the `candidate-report.mjs` pattern exactly — it's the
lightest-touch precedent already in the ledger for "run one node script on a schedule, log
to `~/.local/log/`, trim the log."

**Exact steps to install** (someone runs these — nothing was installed by this scout):

1. Commit your node script to this repo, e.g. `tools/<name>/nightly-job.mjs`.
2. `crontab -e` and add one line (07:00 UTC — adjust if you specifically need 07:00
   *London*, in which case copy `butler-digest.sh`'s `0 6,7 * * *` + TZ-gate trick so DST
   doesn't drift it):

   ```
   0 7 * * *   /usr/bin/node /home/tomcassidy/SSi/ssi-dashboard-v7-clean/tools/<name>/nightly-job.mjs >> /home/tomcassidy/.local/log/<name>.log 2>&1; /bin/sh /home/tomcassidy/command-surface/ops/trim-log.sh /home/tomcassidy/.local/log/<name>.log
   ```

3. Back up the crontab first (the estate's own convention —
   `~/.local/log/crontab-backup-<date>.txt` — has precedent): `crontab -l > ~/.local/log/crontab-backup-$(date -u +%F-%H%M).txt`.

**Turn it off** — the one-line command Kai would run:

```
crontab -l | grep -v 'tools/<name>/nightly-job.mjs' | crontab -
```

(Safer / more legible for a non-technical run: `crontab -e`, delete that one line, save —
but the grep one-liner above is copy-pasteable and doesn't require knowing an editor.)

**How Kai tells whether it ran:**

```
tail -20 ~/.local/log/<name>.log
```

A line with today's UTC date near the top of the tail means it fired. If the file doesn't
exist or its newest line is from a prior day, it didn't run — check `grep <name> /var/log/syslog`
(system cron daemon log, root-readable) for a `CRON CMD` entry to see whether cron even
attempted it.

---

## Gaps

- I did not check whether `/var/log/syslog` is readable by `tomcassidy` on this box (didn't
  attempt, to stay strictly read-only/non-invasive beyond listing) — Kai should verify with
  `grep CRON /var/log/syslog | tail` if he needs to distinguish "cron never fired this" from
  "script ran and failed silently before writing to its log."
- I did not check for a **root** crontab (`sudo crontab -l -u root`) since sudo wasn't
  exercised for this read-only pass; `/etc/crontab` and `/etc/cron.d` (which I did check) are
  the standard places root-level periodic jobs would also register in Debian/Ubuntu, and both
  are stock/empty of SSi content, so this gap is unlikely to change the answer.
- systemd `--user run --scope` (ad-hoc per-invocation isolation, not a `.timer` unit) is
  technically possible but has zero precedent on this host — flagging as a theoretical
  alternative, not recommending it, since crontab already has 25 working precedents.
