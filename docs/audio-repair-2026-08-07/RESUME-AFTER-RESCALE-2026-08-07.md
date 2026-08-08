# Resume recipe — after the watson-1 rescale (CPX42 → CPX52)

Both audio rebuilds were stopped at **14:07Z on 2026-08-07** so the box could be rescaled
and rebooted. This file is the one-command-each restart. Nothing here needs
reconstruction: both runs checkpoint in the DATABASE and both resume from a state file.

---

## The two resume commands

**French (fra_for_eng, port 3468) — restarts band 2, rounds 201-400:**

```bash
systemd-run --user --unit=overnight-shepherd4 --collect \
  /usr/bin/bash /home/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/overnight-shepherd.sh
```

**German (deu_for_eng, port 3469) — restarts band 201-400:**

```bash
systemd-run --user --unit=deu-shepherd2 --collect \
  /home/tomcassidy/SSi/ssi-dashboard-v7-clean/tools/deu-shepherd.sh
```

That is the whole restart. Each shepherd:
1. reads its band-state file (`~/.fra-band-state` = `1`, `~/.deu-band-state` = `0`) —
   both already point at rounds 201-400, which is where each run stopped;
2. finds its phase-8 service down, relaunches it from its own snapshot tree
   (`~/.fra-redo-snapshot2-2026-08-07`, `~/.deu-redo-snapshot2-2026-08-07`) with the
   right port, verdict-cache path and concurrency;
3. re-POSTs the band. Clips already committed re-plan as `SATISFIED`, so nothing is
   redone twice on the DB side.

If a unit name is already taken: `systemctl --user reset-failed <unit>` first, or pick a
new name — these are transient units and do not survive the reboot.

Watch: `tail -f /tmp/overnight-shepherd.log`, `tail -f /tmp/deu-shepherd.log`,
alerts in `/tmp/{overnight,deu}-shepherd-alerts.log`. Both shepherds ping their own
parent conversation, so band completions report themselves.

---

## Exactly where each run stopped

**French — band 2 of 8 (rounds 201-400), run `reuse-fra_for_eng-r201to400-1786096426376`,
started 09:53:46Z.**
- Incumbent listen: **COMPLETE** — 4,941 clips listened, 534 damaged
  (467 last_word_missing, 67 cer_above_threshold). All 4,941 verdicts are flushed to
  `~/.audio-veracity-verdicts.json`, so the listen does not repeat.
- Plan: 6,452 distinct clips; 3,745 already satisfied; 2,707 actionable.
- Apply: stopped at **1,020 / 2,707 (1,005 ok, 15 failed)**, last clip
  `c'est pour cela que nous [rendered]`.
- Bands 3-8 (401-1529) not started.

**German — band 201-400, run `reuse-deu_for_eng-r201to400-1786103124289`,
started 11:45:24Z.**
- Incumbent listen: **IN PROGRESS**, stopped at **~1,200-1,350 / 4,168** listened
  (248 damaged at the 1,200 mark). 1,200 verdicts are flushed to
  `~/.audio-veracity-verdicts-deu.json`.
- Apply: **not reached — zero clips applied for this band.**
- Rounds 1-200 were already finished at 06:44Z (`{NONE:3590, REUSED_OWN:12,
  RENDERED:1323, REUSED_CROSS:506, FAILED:3}`) and are untouched by any of this.
- Bands 401-1395 not started.

## Honest cost of the stop — what actually gets redone

Neither run loses committed clip work: `applyReusePlan` upserts the audio row and then
updates the link, per clip, as it lands; there is no delete-before-write in the path, so
no course slot was left silent.

| | Lost | Redo on resume |
|---|---|---|
| **French** | Nothing applied is lost — all 1,005 clips are in the DB. Up to 4 clips were mid-render at the kill; worst case they left an unlinked S3 object, which is invisible to the course and gets re-rendered. | Plan rebuild (~10 min). The 4,941-clip listen returns from cache. **But the ~1,005 clips rendered during this band are now the incumbents, and their verdicts were never written to the verdict cache — so they get listened afresh: ~1,005 whisper decodes, ≈45 min at concurrency 4.** Net redo ≈ **45-60 minutes**. |
| **German** | The verdicts decoded since the last 200-verdict flush: **at most 199, realistically ~100-150 whisper decodes.** No clip work existed to lose. | Plan rebuild (~10 min) + re-decode of those ≤199 clips (≈10-15 min at concurrency 2). Net redo ≈ **20-25 minutes**. |

The verdict cache is keyed on the mastered S3 object, which is write-once, so cached
verdicts can never be stale — the cache is safe to keep across the reboot and is what
makes both resumes cheap.

## What was stopped, and what was left alone

Stopped (all transient systemd units — **none of them come back at boot**):
- `overnight-shepherd3.service` — the French shepherd. Stopping it also took down the
  phase-8 service it owned on **3468**, which is what we wanted.
- `deu-shepherd-start.service` — the German shepherd.
- `deu-phase8-3469.service` + `deu-phase8-log-bridge.service` — the German phase-8 on
  **3469** and its journal→file log mirror. The bridge is not needed on resume: the
  shepherd launches phase 8 itself and writes straight to `/tmp/deu-phase8-3469.log`.

Left running (and self-restoring after the reboot — `Linger=yes`, units `enabled`,
`Restart=always`; the `*/2` popty watchdog cron also resurrects 3470/3471/3465):
- **3465** `popty-phase8-audio`, **3470** `popty-production-api`, **3471**
  `popty-course-builder-api`, plus proofread, seed1-listen, voicelab, zenjin-preview.
- **Nothing on the 3465-3471 range needs starting by hand after the reboot.**

Not restarted deliberately: the idle phase-8 on **3467**. It held the finished German
1-200 run in memory; that band's artifact is already on disk and nothing reads 3467.
It dies at the reboot and should stay dead.

## Quiet confirmation (14:07Z)

- `whisper-cli`: none running.
- `ffmpeg` / any TTS render: none running.
- Ports 3467/3468/3469: 3468 and 3469 free; 3467 idle with no work.
- Load average falling: 6.25 (1m) / 7.94 (5m) / 9.05 (15m) — the residue is unrelated
  dev servers and agent sessions, not audio.
