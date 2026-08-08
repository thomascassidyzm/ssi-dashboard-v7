# Tail amputation — code + git provenance

**Date:** 2026-08-06 · **Scope:** read-only code and git forensics on this repo (watson-1 checkout).
No code, DB row or S3 object was modified. No audio analysis — another worker owns that half.

**The question:** which code path can amputate a clip tail, when did it exist, and when could it
have run? Tom's window is roughly 2026-07-28 → 2026-08-06.

---

## Verdict in one paragraph

Exactly **one** piece of code in this repo has ever cut the end off a finished course clip:
`repairTailDefect` in `services/audio-processor.cjs`. It existed from **2026-07-24** to
**2026-08-05 21:22 UTC**, it was wired into `masterAudio` — the chokepoint every TTS publish path
goes through — and until 2026-08-05 01:24 UTC it had **no off switch and mutated by default**.
Five run logs on this box prove it fired **959 times on 2026-08-04 between 11:50 and 13:57 UTC**,
across `deu_for_eng` and `fra_for_eng`, cutting a median 0.61 s off each clip. That is the
confirmed amputating event. A second, larger candidate — Kai's out-of-band de-hiss reprocess of
**142,973 files on ~2026-07-29/30** — sits squarely in the window and is the only thing that could
explain damage to clips whose `created_at` predates 2026-07-23; **its script is not in this repo
and not on this machine, so I cannot confirm or exclude it.** That is the one gap that matters.

---

## 1. Every code path that can shorten an audio file

Enumerated by grepping the whole repo for `silenceremove`, `atrim`, `afade`, `areverse`, `apad`,
`-t`/`-ss`, and every `repairTailDefect` implementation, then reading each hit.

| # | Path | File · function | What it does to the tail | Writes where |
|---|---|---|---|---|
| **A** | **Tail "repair"** | `services/audio-processor.cjs` · `repairTailDefect` — **DELETED 2026-08-05** | `atrim=end=${cutAt}` then `apad=pad_dur=0.1`. Discards **everything** after the detector's timestamp and pads 100 ms of silence back. No upper bound on how much is discarded beyond the guards in §3. | Rewrites the mastered temp file in place; `phase8:1022` `fs.move(tail.outPath, masteredPath)` then uploads it as the clip. **The trimmed file becomes the object learners hear.** |
| B | Human-recording intake | `audio-processor.cjs:897-901` · `processRecordingBuffer` | `silenceremove` at −40 dB / 0.1 s, applied to start **and** (via `areverse`) end. | New S3 key. **Not on the TTS path** — sole caller is `production-api.cjs:4440` `POST /api/production/:courseCode/recording/upload`, the RecordRoom human-take path. |
| C | Pod explainer piece edge-trim | `services/pod-explainer-composite.cjs:153-157` · `EDGE_TRIM_FILTER` | `silenceremove` at −45 dB / 0.04 s, both edges. Trims provider edge-padding only, keeps 40 ms breath; internal pauses untouched. | Temp piece file, then spliced into a new composite under a new key. Operates on a **fresh** TTS piece, never on a stored clip. |
| D | Component-word splice | `services/phases/phase8-audio-v13.cjs:5281` | `atrim=start=…:end=…` — deliberate extraction of one word from a parent clip. | New key. Cutting is the purpose; the parent is untouched. |
| E | Voice-engine alignment splice | `services/voice-engine/align.cjs:294` | `atrim=start=…:end=…`, sample-accurate segment extraction. | New key. Same as D. Last touched 2026-06-10 — outside the window. |
| F | Loudness / mastering chain | `audio-processor.cjs:298, 741` · `normalizeAudio` | `PRE_COMPRESS, volume, TRUE_PEAK_LIMIT, ANTI_CLICK_FADE`. **Removes nothing** — 8 ms fade in, 8 ms fade out. A fade attenuates; it does not delete samples. | n/a |
| G | De-hiss | `audio-processor.cjs` · `PRE_DENOISE = afftdn=nf=-25:nt=w` | FFT denoise. **Duration-preserving by construction** (`afftdn` is a spectral filter, not a trim); the commit message asserts "duration bit-identical". | n/a — but see §4, candidate 2, for the *reprocess run* that applied it. |

**Only path A shortens a finished clip.** B, C, D and E cut by design at points that are not the
end of a taught utterance, and none of them re-processes a stored course clip. F and G do not cut
at all.

### Path A, exactly as it lived

`git show 8415f2d9^:services/audio-processor.cjs`:

```js
for (let pass = 0; pass < 3; pass++) {
  const next = path.join(workDir, `declick-pass${pass}.mp3`);
  await ffmpegFilterToLameMp3(fixed, next, {
    filterChain: `atrim=end=${cutAt},asetpts=PTS-STARTPTS,`
      + 'areverse,afade=t=in:st=0:d=0.008,areverse,apad=pad_dur=0.1',
  });
```

`cutAt` is `detectTailClick`'s `trimSec` — the start of the quiet gap before a supposed click. The
detector's `resurgence` and `rise` rules describe "quiet, then sound again", which is also a
German word-final plosive release, an xAI clone's end-of-utterance breath, and any natural
mid-sentence pause. The 100 ms pad plus the 8 ms fade then leave a textbook-clean decay, so every
*physical* probe reports the clip healthy. Only an ASR word-retention check can see the damage.

The current tombstone at `audio-processor.cjs:491-528` says the same thing and is accurate — I
checked it against the deleted code, not the other way round.

---

## 2. Git archaeology — what existed and was reachable, 2026-07-28 → 2026-08-06

All dates are **author dates**; `git log -S` over `services/audio-processor.cjs`,
`services/phases/phase8-audio-v13.cjs`, `tools/declick-tail.cjs` and `ops/systemd/`.

| Date (UTC unless noted) | Commit | Author | Event |
|---|---|---|---|
| 2026-07-23 11:44 +0100 | `9f8a7ba0` | thomascassidyzm | `detectTailClick` born; `tools/declick-tail.cjs` created — DSP repair for **stored** clips. Trigger was one clicked `ita_for_eng` "Come stai?". |
| **2026-07-24 03:02 +0100** | **`44fef862`** | thomascassidyzm | **`repairTailDefect` created and wired into `masterAudio`.** Detector v2 adds the `resurgence` + `rise` rules and the whisper amputation guard. Commit claims "153 clips healed". **This is the start of the exposure window.** |
| 2026-07-27 10:32 +0100 | `09f9f4ac` | thomascassidyzm | whisper trim-verify capped at 2 concurrent, SIGKILL timeout. Touches the guard, not the cut. |
| 2026-07-29 14:32 +0100 | `df61179a` | **kai-saraceno** | De-hiss v1 in the mastering chain. Message: *"Existing xAI audio was reprocessed out-of-band (138,234 files, 0 failures)."* |
| 2026-07-30 23:35 +0100 | `58a18d37` | **kai-saraceno** | De-hiss v2. Message: *"Existing course audio was reprocessed out-of-band (142,973 files, 0 failures, originals retained for rollback), so this only governs future renders."* |
| 2026-08-04 10:46 +0100 | `e476b242` | kai-saraceno | Burst-only tail gate for `eve` — narrows the detector for one voice. |
| 2026-08-04 11:50 | `f8c380bd` | thomascassidyzm | `AMPUTATION_MIN_KEEP_FRACTION` + silence guard added — *"stop the tail repair amputating short clips into silence"*. **Note the timestamp: this landed in the same minute the first amputating run started, and the guard only blocked cuts discarding >50 % of a clip. Eating one final word keeps far more than half.** |
| 2026-08-05 01:24 | `d5ad9f2c` | thomascassidyzm | `TAIL_REPAIR_MODE` env switch introduced. **Before this commit there was no way to stop the mutation at all.** |
| 2026-08-05 02:04 | `4c5bbf90` | thomascassidyzm | Default flips to `flag` — "the fix travels with the code". |
| 2026-08-05 02:13 | `b48317551` (`b4831755`) | thomascassidyzm | `tools/verify-tail-repair-mode.cjs` — proves which branch is live. |
| 2026-08-05 02:16 / 02:29 | `d90f1ba3` / `30e59aa1` | thomascassidyzm | Repo systemd units carry `TAIL_REPAIR_MODE=flag`; `pad` mode added. |
| 2026-08-05 21:02 / 20:58 | `479f28bb` / `43d3004f` | thomascassidyzm | 26 amputated `deu_for_eng` seeds 1-5 clips repaired; mechanism named. |
| **2026-08-05 21:22** | **`8415f2d9`** | thomascassidyzm | **`repairTailDefect`, `verifyTrimKeepsText`, the `TAIL_REPAIR_MODE` switch and `tools/declick-tail.cjs` all deleted.** Exposure window closes. Merged to `main`; present on `main`, `fix/audio-link-integrity` and 5 other branches. |
| 2026-08-06 00:04 | `96a95dde` | thomascassidyzm | `deu` raw-TTS A/B artefacts committed — raw renders clean. |

**All five leads I was handed check out against the actual history**, with two corrections worth
stating:

- `30e59aa1` (`TAIL_REPAIR_MODE=pad`) exists **only** on `origin/feat/tail-repair-pad-mode-2026-08-05`.
  It was never merged to `main` and was superseded by the wholesale deletion 19 hours later. It
  never ran in production.
- `96a95dde` is a **docs/data** commit (three artefact files, 8,256 lines) — it is evidence *about*
  the conclusion, not the fix. The fix is `8415f2d9`.

### The reachability statement

> **From 2026-07-24 03:02 +0100 until 2026-08-05 01:24 UTC — 12 days, covering the whole first half
> of Tom's window — `repairTailDefect` was live inside `masterAudio` with mutation as its
> unconditional behaviour and no environment variable, flag or argument that could disable it.**

From 2026-08-05 01:24 to 21:22 the behaviour depended on `TAIL_REPAIR_MODE` being set correctly in
each process's environment — which is exactly the leak Tom's deletion ruling was aimed at. After
21:22 the code is gone.

**EXPLICIT GAP:** I cannot establish retroactively when `TAIL_REPAIR_MODE=flag` first took effect
in a *running* render process. `phase8-audio-v13.cjs` writes no mode banner at startup and is not
under pm2. The prod checkout's processes restarted **2026-08-05T15:40:03Z** carrying
`TAIL_REPAIR_MODE=flag`; renders before that timestamp are suspect. (This matches
`docs/deu-clipping-root-cause-2026-08-05.md` §4, which I verified rather than assumed.)

---

## 3. How path A was invoked, and at what scale

`repairTailDefect` had **two** entry points. It was never a cron, never a timer, never an HTTP
route of its own — it rode inside the mastering function.

### 3a. `masterAudio` — the chokepoint (the one that matters)

`services/phases/phase8-audio-v13.cjs:1009`. Every TTS publish path in the estate funnels through
it. Call sites verified by grep:

| Caller | file:line | Reaches stored clips? |
|---|---|---|
| phase8 `/generate` render paths ×7 | `phase8-audio-v13.cjs:2176, 2685, 4061, 4270, 4572, 4972, 5846` | New renders |
| **`tools/revoice-clips.cjs`** | `:241` `p8.masterAudio(audioBuffer, text)` | **Yes — replaces live clips** |
| **`tools/repair-presentation-clips.cjs`** | `:148` | **Yes** |
| **`services/audio-repair.cjs`** | `:157`, `:161` `phase8().masterAudio(...)` | **Yes** |
| `services/pod-explainer-composite.cjs` | `:303` | Composites |

So any bulk repair or re-voice run re-rendered the text, sent it through `masterAudio`, and the
tail gate cut the result before it was uploaded. **The repair tools were the delivery mechanism.**

Scale controls: `revoice-clips.cjs` takes `<course>` (required) plus optional `--ids`, `--roles`,
`--limit`. `revoice-clips.cjs:98` is `const DRY = argv.includes('--dry')` — so it is
**write-by-default**: omit the flag and it renders, uploads and relinks. It cannot sweep the
estate, because a course code is mandatory. `repair-silent-clips.cjs` (the engine that ran on
2026-08-04, since retired to a shim) was likewise per-course, invoked with `--only all`.

### 3b. `tools/declick-tail.cjs` — the stored-clip sweeper

`node tools/declick-tail.cjs <course> --ids <id1,id2|ids.json> [--apply]`. **Dry by default**;
requires an explicit id list — it has no "all clips" mode, so it cannot sweep an estate or even a
whole course without someone first producing a list. On `--apply` it mints a **new** S3 key and a
**new** `course_audio` id, deletes the old row, relinks pods and core tables, and restores on
failure. Deleted with `8415f2d9`.

### 3c. Automation surface — nothing scheduled

Checked directly on watson-1:

- `ops/systemd/`: three units (`popty-phase8-audio`, `popty-production-api`,
  `popty-course-builder-api`). All are long-running services; none has an `ExecStart` that runs an
  audio tool. `systemctl --user list-timers --all` shows **one** timer, `launchpadlib-cache-clean`
  — unrelated.
- `crontab -l`: watchdog, backup, git-sync, memory-sync, account-sentinel, pm2 resurrect, and the
  learning-app deploy sentinel. **Nothing audio.**
- No `package.json` script invokes any audio tool.
- The `/api/audio/regenerate-*` routes in `production-api.cjs` (`:5097, 5265, 5282, 5301, 5319`)
  reach phase8 render paths and therefore reached `masterAudio` — but they are per-role, per-lego,
  per-phrase or per-course, and all require an HTTP call. They are not self-triggering.

**Conclusion: nothing could have run path A by itself. Every amputating run was a human typing a
command.** That narrows the search to run logs, which is where §4 goes.

---

## 4. Evidence any of them actually ran

### Confirmed: the 2026-08-04 bulk-repair block

Five distinct run logs on this box, all produced by tools that call `masterAudio`, each counted by
me directly (`grep -c "repaired in .* pass"`), not taken from any doc:

| Log (mtime, UTC) | Course | Clips **cut** | Held (shipped untouched) |
|---|---|---:|---:|
| `/tmp/fra-bulk-repair-run1.log` 2026-08-04 11:50:33 | fra_for_eng | **99** | 0 |
| `/tmp/fra-bulk-repair2.log` 2026-08-04 12:00:12 | fra_for_eng | **198** | 185 |
| `/tmp/deu-repair-run.log` 2026-08-04 13:30:24 | deu_for_eng | **449** | 282 |
| `/tmp/revoice-full.log` 2026-08-04 13:50:37 | deu_for_eng | **38** | 1 |
| `/tmp/revoice-run2.log` 2026-08-04 13:57:42 | deu_for_eng | **175** | 14 |
| | | **959** | 482 |

(`/tmp/fra-bulk-repair.log` is byte-identical to `run1.log` — same run, captured twice. Counted once.)

The log lines are unambiguous:

```
[Phase8-Audio-v13] masterAudio: tail rise -22.5dB repaired in 1 pass(es) at 0.464s
[Phase8-Audio-v13] masterAudio: tail resurgence -5.2dB repaired in 1 pass(es) at 0.41s
```

`repaired in N pass(es)` is emitted **after** the `atrim` executed. Every one of those 959 lines is
a clip that shipped shorter than it rendered. Trim points in the deu run: min 0.28 s, median
0.61 s, max 2.074 s.

I also swept **every** `/tmp/*.log` with an mtime between 2026-07-25 and 2026-08-05 for the same
marker. **No amputating run log exists on this box before 2026-08-04 11:50 UTC.**

Corroborating detail from `revoice-run2.log` that ties directly to what Tom heard — the seed-2
`lernen` clip and the "as often as possible" family are both in that run:

```
[1/235] target2 "Hast du noch mehr zu lernen oder fühl: FAILED — every attempt threw
        (last: tail defect (rise -8.4dB) still detected (resurgence -1.9dB) after 3 repair passes)
[74/235] target1 "Ich will jetzt lernen, wie man so oft: azure_de-DE-KatjaNeural 4992ms -> ara 2300ms
```

### Unresolved: the de-hiss estate reprocess

`58a18d37` (2026-07-30 23:35 +0100, kai-saraceno) states in its own message:

> *Existing course audio was reprocessed out-of-band (142,973 files, 0 failures, originals retained
> for rollback), so this only governs future renders.*

and `df61179a` (2026-07-29) states 138,234 files. This is **the only event in the window that
touched pre-existing clips at estate scale**, and its timing is an exact match for Tom's
"since ~2026-07-30".

What I can establish:

- **The script is not in this repo and not on this machine.** `find /home/tomcassidy -iname "*hiss*"`
  returns nothing. `temp/hiss-reprocess/` and `scripts/hiss-chain-probe.cjs`, both cited by
  `docs/xai-hiss-chain-analysis-2026-07-30.md`, do not exist here. Both de-hiss commits are
  authored by `kai-saraceno` on the `kai-stage` line — consistent with the two-machine split, i.e.
  the work ran on Kai's Mac.
- **No in-repo tool does what that run did.** I grepped every file that uses both
  `GetObjectCommand` and `PutObjectCommand`: none of them fetches a stored course clip,
  re-processes it and writes it back. So the reprocess was a bespoke, out-of-band script.
- **The filter itself cannot shorten.** `afftdn` is spectral; the commit's "duration bit-identical"
  claim is sound *for the filter*.
- **But whether the run applied the filter alone or routed clips through `masterAudio` is exactly
  what I cannot determine** — and on 2026-07-29/30, `masterAudio` contained `repairTailDefect` in
  unconditional mutate mode. If the reprocess used `masterAudio`, it amputated up to 142,973 clips
  estate-wide and left `created_at` untouched.

Two pieces of weak evidence point *away* from `masterAudio`: the analysis doc measures
`afftdn` applied "on already-mastered mp3s", which reads like a direct filter application; and a
full re-master would have re-normalised loudness, which nobody reported. Neither is proof.

One claim in that commit I flag as **unbacked**: *"originals retained for rollback"* cites
`temp/hiss-reprocess/*-done-*.jsonl` and `s3://<bucket>/backups/hiss-reprocess-logs-2026-07-29/` —
both of which are **log** paths, not audio backups. Separately,
`tools/prosody-lab/remaster-vad-lab-clean.cjs:9` states plainly: *"No raw pre-master copies of the
estate renders are retained."* If the de-hiss run did damage clips, the rollback may not exist.

### Branch tips in the window

`git for-each-ref` over the window shows ~25 branches touched between 2026-08-04 and 2026-08-06,
all audio-remediation work created *after* the damage. Nothing on any branch tip introduces a new
shortening path. The uncommitted working tree on `fix/audio-link-integrity` touches dashboard,
RecordRoom and repair-queue code — none of it on the clipping path.

---

## 5. Ranked candidates

### 1 — `repairTailDefect` firing inside the 2026-08-04 bulk repair/re-voice block · **CONFIRMED**

**Confidence: high — this is not an inference, the runs logged their own cuts.**

**Window:** 2026-08-04, 11:50–13:57 UTC. **Blast radius:** 959 clips confirmed cut, in
`deu_for_eng` and `fra_for_eng` only.

**For:** five independent run logs; the code path is fully reconstructed from git; the trim
magnitudes (median 0.61 s, max 2.07 s) are word-scale on short LEGO clips; the specific German
clips Tom flagged appear in `revoice-run2.log`; the mechanism explains why physical probes call
the clips healthy.

**Against:** it accounts only for clips **re-rendered on 2026-08-04**. It cannot explain damage to
a clip created in January or February that was never re-rendered — and most `deu_for_eng` seed 1-5
clips are from 2026-01/02. **If Tom heard amputation on an untouched old clip, candidate 1 is not
the whole story.**

### 2 — The de-hiss estate reprocess, ~2026-07-29/30 · **UNRESOLVED, and the one that matters**

**Confidence: cannot be determined from this repo. Genuinely open.**

**Window:** 2026-07-29 to 2026-07-30. **Potential blast radius:** 142,973 files — the whole estate,
every language.

**For:** the only in-window event that touched pre-existing clips at scale; timing matches Tom's
"since ~2026-07-30" precisely; `repairTailDefect` was live and unconditionally mutating throughout;
it is the **only** hypothesis that explains amputation of clips whose `created_at` is months old;
"0 failures" is, on the README's own admission, a statement about exceptions thrown and says
nothing about content.

**Against:** `afftdn` alone cannot shorten; the analysis doc's phrasing suggests a direct filter
rather than a full re-master; no loudness change was reported.

**What would settle it, and what I could not do from here:** read the reprocess script and its
`*-done-*.jsonl` logs on Kai's Mac. If the script calls `masterAudio` or `phase8`, candidate 2 is
the estate-wide cause and candidate 1 is a subset. If it shells `ffmpeg -af afftdn` directly,
candidate 2 is cleared and the damage is confined to re-rendered clips.

### 3 — `tools/declick-tail.cjs` sweeps · **LOW**

**Confidence: low that it contributed materially.** Existed 2026-07-23 → 2026-08-05; dry by
default; requires an explicit id list, so it cannot sweep. `44fef862` claims "153 clips healed" on
2026-07-24. Those 153 went through the same amputating implementation, so some are likely damaged
— but 153 is small, and no `declick-tail` run log survives on this box for the window. **Gap:**
I could not establish how many `declick-tail --apply` runs happened, or on which courses.

### 4 — Ordinary `/generate` renders, 2026-07-24 → 2026-08-05 · **CERTAIN but unquantified**

Every clip rendered through phase8 in those 12 days passed the mutating tail gate. The estate-wide
detector fire rate measured on live `deu_for_eng` clips is **7.3 %**, of which ~82 % would ship a
trim once the whisper guard is absent — and the guard *was* absent (it returns `null` → proceed
whenever `whisper-cli` is missing). **Gap:** phase8 keeps no durable per-clip verdict
(`veracity_checked_at` is NULL on all 2,544,755 `course_audio` rows), so I cannot count how many
clips were rendered in the window, let alone how many were cut.

### 5 — Paths B / C / D / E · **EXCLUDED**

`processRecordingBuffer` is human-recording-only (single caller, `production-api.cjs:4440`). Pod
edge-trim, component splice and voice-engine align all cut by design at non-terminal points and
never re-process a stored clip. None was modified in the window (`align.cjs` last touched
2026-06-10; `pod-explainer-composite` 2026-06-12).

---

## 6. Explicit gaps

1. **The de-hiss reprocess script and its logs are not on this machine.** Whether it routed through
   `masterAudio` is the single unresolved question, and it is the difference between ~1,000 damaged
   clips and up to 142,973. Needs someone with access to Kai's Mac / `kai-stage`.
2. **No per-clip durable record of what the tail gate did.** Nothing in `services/` or `tools/`
   writes `veracity_checked_at`; the run counters die with the process. Outside the five surviving
   `/tmp` logs, "was this clip cut?" is unanswerable from records.
3. **When `TAIL_REPAIR_MODE=flag` first took effect on a running process** cannot be established
   retroactively. Safe reading: anything rendered before **2026-08-05T15:40:03Z** is suspect.
4. **`declick-tail.cjs --apply` run history is unknown** — no surviving logs for the window.
5. **`/tmp` is not a reliable archive.** These five logs survived by luck. Runs from 2026-07-28 to
   2026-08-03 may have existed and been cleaned up; absence of a log there is weak evidence, not
   proof that nothing ran.
6. **Whether each of the 959 logged cuts is audibly bad** is not established here — the logs prove
   the cut happened and how deep, not that every one removed a word. That is the audio worker's half.

---

## 7. Standing risk

Path A is gone from `main` as of `8415f2d9`, and `tools/verify-tail-repair-mode.cjs` asserts no
`atrim=end=` step remains. The remaining exposure is not code, it is **the damaged clips already in
S3** — which are invisible to every physical probe, because the 100 ms pad and the 8 ms fade leave
a clean decay. Only ASR word-retention finds them. That is what
`tools/audio-word-loss-scan.cjs` and the current sweeps are for.
