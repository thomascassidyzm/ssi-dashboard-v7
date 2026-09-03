# deu_for_eng audio repair — measured classification + costed plan (2026-08-04)

Read-only. **No TTS rendered. No DB row mutated.** Base commit: `721cac18` on
`docs/fra-tts-rerender-scout`. Every data claim below is a live query result; every code claim
carries a `file:line`.

---

## 0. Headline

- **Kai's counts reproduce exactly.** 908 rows under 400 ms across target1/target2/known, plus
  1 pod_explainer. Not one German row was created on 2026-08-04. No repair ran.
- **Doc (2) §8.4 is wrong.** "`deu_for_eng` was swept by the same tool … it was repaired on the
  same protected path" is false. It should be struck.
- **Classification of the 908 is now decided by measurement, not duration:** **905 are proven
  silent** (ffmpeg volumedetect, mean ≤ −60 dB / peak ≤ −45 dB). Only **3** are audible, and
  even those look truncated rather than legitimately short. **There are no legitimately-short
  clips in the under-400 ms band.**
- **The truncated class exists and is smaller than French's:** **206 suspects** (ratio + speech
  rate), of which 202 are in repair scope.
- **Total in-scope re-renders: 1,107 clips / 10,924 characters.** Estimated xAI spend **≈ $1.50,
  worst case under $5** — but see §5, the repo has no documented xAI per-char rate.
- **The azure Conrad rows are not duplicates and not junk** — 193 real texts, 189 of them linked
  into content, no leo equivalent exists for any of them. Recommendation in §4.
- **French is clean of silence but has ~4 clips of genuine residue** and 40 out-of-scope pod
  suspects. §6.

---

## 1. Independent verification of the counts

Live `course_audio`, `deu_for_eng`: **47,348 rows**.

| role | total (all voices) | `duration_ms < 400` | dominant voice_id |
|---|---:|---:|---|
| target1 | 14,273 | **235** | `ara` (13,986) |
| target2 | 13,709 | **353** | `leo` (13,415) |
| known | 14,328 | **319** | `eve` (14,076) |
| presentation | 2,431 | **0** | `eve` (2,341) |
| pod_explainer | 994 | 1 | `comp:leo` |

**TOTAL under 400 ms: 908 (+1 pod).** Every broken row carries `origin = 'tts'`; none is human.
Every broken row sits on the house voice (`target1/ara` 235, `target2/leo` 353, `known/eve` 319) —
no broken row is on an Azure or legacy voice.

Duration histogram of the 908:
`144×572, 168×164, 192×113, 216×19, 264×21, 288×15, 312×1, 360×1, 384×2`.

Created-day spread — confirming this is accumulated damage, not one incident:
`2026-01-17=156, 01-29=44, 02-15=28, 02-16=118, 02-20=2, 02-24=2, 03-01=5, 03-10=8, 03-12=28,
04-01=1, 04-17=2, 06-15=1, 06-16=26, 07-05=43, 07-11=208, 07-15=236`.

Kai's figures are correct in every particular. The only refinement: the created-day list has a
few dates Kai's summary elided (02-15=28, 06-16=26), and role totals are per-role across *all*
voice_ids, which is why e.g. target2's 13,709 splits 13,415 `leo` + 193 `azure_de-DE-ConradNeural`
+ 101 `xai_leo`.

Blast radius: **883 of the 905 silent clips are linked into learner-facing content**
(713 `course_legos` + 1,170 `course_practice_phrases` + 5 `course_seeds` link rows = 1,888 links).
22 are orphans with no FK — still worth repairing, still cost a render each.

---

## 2. Classification of the 908 — measured, not inferred

Method: `node tools/audio-batch-gate.cjs deu_for_eng --concurrency 12`. All three screens ran
over all 47,348 clips; 1,111 screened clips were downloaded from S3 and measured with ffmpeg
`volumedetect`. **0 unmeasurable.**

### Class A — TRULY SILENT: **905**

| role/voice | count |
|---|---:|
| target2/leo | 353 |
| known/eve | 317 |
| target1/ara | 235 |

All 905 came from the duration floor. Measured mean levels cluster at **−91 dB** (digital
silence). The handful at 216–312 ms are not "short words" — e.g. `"geschickt"` at 288 ms measures
mean −67.3 dB / peak −51.7 dB. Duration histogram of the confirmed set:
`144×572, 168×164, 192×113, 216×19, 264×21, 288×15, 312×1`.

The `144/168/192` fingerprint (849 of 905) is the same canned-artefact signature as the French
2026-08-03 batch, so the same provider failure mode recurred across at least fifteen German
render dates over seven months.

### Class B — LEGITIMATELY SHORT: **0 (arguably 1)**

Exactly 3 of the 908 measured audible:

| role | ms | text | note |
|---|---:|---|---|
| known | 384 | `"to speak"` | 48.0 ms/char — borderline, plausibly real |
| known | 360 | `"to check something"` | 20.0 ms/char — far too fast, almost certainly truncated |
| pod_explainer | 384 | `"[atom] gibt es"` | pod role, out of repair scope |

So Kai's caution about `"ist"` / `"Weg"` at 168 ms was warranted in principle but does not
survive measurement: **every 144/168/192 ms clip is digital silence.** No German word survives
in that band.

### Class C — TRUNCATED (audible, too short for its text): **206 suspects**

| role/voice | count |
|---|---:|
| known/eve | 104 |
| target2/leo | 76 |
| target1/ara | 22 |
| pod_explainer/comp:leo | 4 |

By signal: 148 speech-rate, 55 target2-vs-own-target1 ratio, 3 floor-but-audible.

Worked examples, all audible and normally mastered:
`"ich möchte sprechen"` 576 ms vs its target1 at 1,272 ms; `"es ist wichtiger"` 552 ms vs 1,944 ms;
`"etwas stecken"` 720 ms vs 2,184 ms; `"wie man so oft wie möglich spricht"` 1,560 ms vs 3,312 ms.

**Important caveat, carried over from the French run:** `suspect` is a nomination, not a verdict —
the rate and ratio screens also flag the healthy tail of a continuous distribution. In the French
799-clip run **26 of these probed healthy and were left alone** (`/tmp/repair-fra_for_eng-799.json`).
Expect a similar 5–15% keep rate here. Each keep still costs one render, which is priced in.

### Summary

| class | count | in repair scope |
|---|---:|---:|
| A — silent | 905 | 905 |
| B — legitimately short | 0–1 | 0 |
| C — truncated (suspect) | 206 | 202 (4 pods excluded) |
| **total** | **1,111** | **1,107** |

---

## 3. Hazard review — every item on Kai's list, checked

**a) Bare vs prefixed voice_id — NOT a hazard on the repair path.**
`tools/repair-silent-clips.cjs:275` builds the replacement row as
`{ ...row, id: newId, s3_key, duration_ms, origin: 'tts' }` — **`voice_id` is copied verbatim from
the old row and never recomposed.** `decodeVoiceId` (`:136-139`) parses a `xai_|azure_|elevenlabs_`
prefix if present and otherwise **falls back to `provider: 'xai'` with the id as-is**, so German's
bare `leo` / `eve` / `ara` all decode to xAI correctly.

So the correct answer to "which spelling is right for German" is: **neither — don't touch it.**
The repair tool preserves whatever is there. Re-keying is only a hazard on
`/regenerate-role` (`phase8-audio-v13.cjs:2520`), which we are **not** using. Note the fleet is
already mixed and always has been: German holds 13,415 `leo` + 101 `xai_leo` target2, 13,986 `ara`
+ 103 `xai_ara` target1, 14,076 `eve` + 97 `xai_eve` known. I checked for collisions: **zero texts
appear under both spellings in any role** — the prefixed rows are 2026-08-03 additions of *new*
texts, not duplicates. Nothing is broken by the split today; unifying it is a separate, optional
tidy-up and not part of this repair.

**b) Device cache — preserved.** The tool mints a new UUID (`:265`), uploads to a new S3 key
(`:266-269`), deletes the old row (`:271`), inserts the new (`:279`), and re-points every captured
FK (`:283`). Then bumps `bumpCourseVersion` + `bumpCourseRevalidation` (`:324-325`). Correct, and
role-agnostic — German gets the same treatment French did.

**c) Denormalised durations — handled for German.** `restoreLinks` (`:191-201`) patches
`target1_duration_ms` / `target2_duration_ms` on `course_legos` and `course_practice_phrases`
(`LINK_TABLES`, `:115-119`). Our German link census found 713 lego links + 1,170 phrase links, so
this path will fire heavily. `known` has no duration column, by design (`:196-197`).

**d) Tail-repair amputation guard — ACTIVE on this host.** `f8c380bd`'s guard is in
`services/audio-processor.cjs:640` (`AMPUTATION_SILENCE_DB = −60`), `:652` (the model-free
"cut may not keep less than half the clip" check) and `:674` (the `held` outcome). It needs no
whisper and no network. Confirmed the *whisper* path is genuinely unavailable here — no
`whisper-cli` on PATH, and `.env`'s `WHISPER_MODEL` points at a macOS path
(`/Users/tomcassidy/...`) that does not exist on this Linux box — which is exactly the condition
under which the *old* guard was silently off. The new guard covers it. It is not free: the two
French failures were both `tail defect … still detected after 3 repair` holds, i.e. the guard
refusing to ship a clip. Expect a similar handful of German holds.

**e) `presentation` is refused outright** (`:121`, `:208-212`) because deleting one CASCADEs into
`lego_introductions` and destroys authored content. German has **0** flagged presentation clips,
so this never fires. Pods are skipped (`:213-217`) — 4 German pod suspects fall out here and need
`tools/rescue-wrong-language-clips.cjs` instead.

**f) NEW hazard, latent — the repair tool cannot render Azure.** `renderVerified` hardcodes
`apiKey: process.env.XAI_API_KEY` (`tools/repair-silent-clips.cjs:154-158`) while `decodeVoiceId`
will happily report `provider: 'azure'` for `azure_de-DE-ConradNeural`. Today this is harmless —
**no Azure-voiced German row is in the repair list** — but it means the tool must **not** be
pointed at the §4 revoice job without a change.

**g) NEW, minor — the truncation check inside `renderVerified` is dead.** `repairOne` passes
`expectedMs = null` (`:251`), so `truncated` at `:168` is always false. Truncation is instead
caught after the fact at `:256` by comparing the stored duration to the fresh one, which only runs
for `verdict === 'suspect'`. Net effect: a *confirmed* clip's replacement render is validated for
silence and the 400 ms floor but not for truncation. Low risk (a truncated replacement is still a
massive improvement on silence) and not worth blocking on.

**h) Operational — only one repair run can exist on this box at a time.**
`tools/repair-silent-clips.cjs:71` requires `phase8-audio-v13.cjs`, which binds port 3465 at
`:5922`. Two concurrent runs → `EADDRINUSE` and a crash.

**And it is worse than "two runs collide": *any* `require` of phase8 squats the port
indefinitely.** `app.listen` is a module side effect, so it holds the event loop open and a
one-liner that has finished printing never exits. I caused this — a `node -e` probe of
`toBcp47` / `p8.masterAudio` (PID 1983470) sat on 3465 for about three minutes and killed three of
the parallel session's course repairs with `EADDRINUSE`. No money was lost (the crash is at
startup, before any render) but no work happened either. **Anything that requires phase8 must end
with an explicit `process.exit(0)`** — and preferably nothing should require it just to read a
constant. There is at least one other
session working the same tooling right now: `docs/audio-repair-2026-08-04/hrv_for_eng-*.log` and
`/tmp/repair-hrv_for_eng-6.json` were written at 13:06, and four `audio-batch-gate` processes
(jpn, kor, por_br, spa) were live at 13:11. **Coordinate before starting.**

---

## 4. The `azure_de-DE-ConradNeural` question — recommendation

**The 193 rows are healthy, real, and load-bearing.** Measured: min duration 1,608 ms, median
4,104 ms — none is silent or short. **Zero of their 193 texts have a `leo` target2 row**, so they
are not duplicates: they are texts where Leo was never rendered and Azure Conrad filled in.
**189 of the 193 are linked** (5 `course_legos` + 192 `course_practice_phrases` + 209
`course_seeds` link rows). They were laid down across 14 dates, 66 of them as recently as
2026-07-15.

So a learner working through German hears the second voice switch from Leo to a German Azure male
on ~1.4% of target2 items. That is real and audible.

**But it is the smaller half of the problem.** Sweeping all four learner-facing roles for
non-house voices (house = `eve`/`ara`/`leo`, either spelling; excluding `origin='human'`):

| role \| voice_id | rows | chars |
|---|---:|---:|
| target2 \| `azure_de-DE-ConradNeural` | 193 | 8,435 |
| known \| `leo` | 58 | 2,927 |
| target1 \| `3a7889066fa2` | 49 | 3,712 |
| target1 \| `41321eb41295` | 48 | 3,014 |
| known \| `en-GB-SoniaNeural` | 45 | 3,132 |
| target1 \| `azure_de-DE-KatjaNeural` | 41 | 1,963 |
| presentation \| `xai_gfzdpspr5fdp` | 35 | 1,189 |
| presentation \| `en-GB-SoniaNeural` | 27 | 1,901 |
| known \| `bedd6226` | 19 | 914 |
| target1 \| `458705c07139` | 17 | 859 |
| known \| `en-GB-LibbyNeural` | 14 | 786 |
| target1 \| `eve` | 11 | 365 |
| target1 \| `40f31906b23d` | 10 | 477 |
| known \| `en-GB-HollieNeural` | 8 | 318 |
| known \| `en-GB-RyanNeural` | 5 | 176 |
| known \| `gfzdpspr5fdp` | 3 | 153 |
| target1 \| `de-DE-ConradNeural` | 2 | 122 |
| known \| `azure_en-GB-SoniaNeural` | 1 | 12 |
| target1 \| `44c91d64` | 1 | 65 |
| **TOTAL** | **587** | **30,520** |

Note `known | leo` (58 rows) — the *second* voice speaking the English prompt — and
`target1 | eve` (11 rows in German) are identity swaps at least as jarring as Conrad.

**Recommendation: yes, re-voice — but as a separate Phase 3, and take all 587, not just the 193.**

Rationale: the marginal cost of the other 394 is ~22k characters (pennies), the audible defect is
the same class, and doing it in one pass means one course-version bump and one verification sweep
instead of two. Do it *after* the silence repair lands and verifies, because it is cosmetic where
the silence repair is functional.

**Blocker on Phase 3, stated plainly: the tooling does not exist yet.**
`repair-silent-clips.cjs` deliberately preserves `voice_id` (`:275`) and hardcodes the xAI key
(`:154`), so it cannot re-voice. `/regenerate-role` *would* re-key to the config voice but updates
in place under the same id (`phase8-audio-v13.cjs:2518-2528`), which leaves every device that
cached Conrad hearing Conrad for a year — the exact failure §8.3 of the diagnosis doc identified.
Phase 3 therefore needs a small change: a `--revoice <role>=<voiceId>` mode on
`repair-silent-clips.cjs` that overrides `voice_id` and `decodeVoiceId` on the new row and
otherwise reuses the existing render → verify → mint-new-id → relink path. **That is a code
change, not a render, so it is outside the approval gate — but I have not written it and am not
proposing to run it inside this approval.**

---

## 5. The costed repair plan — Phase 1 + Phase 2 (approval requested)

### Scope

| | clips | chars |
|---|---:|---:|
| Phase 1 — confirmed silent | 905 | 6,293 |
| Phase 2 — suspects (probe-and-replace) | 202 | 4,631 |
| **total renders** | **1,107** | **10,924** |

Out of scope, stated rather than silently dropped: **4 pod_explainer suspects** (belong to
`tools/rescue-wrong-language-clips.cjs`), **0 presentation** (none flagged), **587 off-house-voice
rows** (Phase 3, §4, needs a code change first).

### Cost

**The repo has no documented xAI per-character rate** —
`tools/build-chunk-audio-regen-queue.cjs:84` says so explicitly and deliberately leaves xAI cost
`null` rather than guessing. So this is an estimate with its basis shown, not a quote:

- **Basis:** `docs/audio-census-2026-07-11.md:22` prices deu_for_eng's 7,749 missing clips at
  "~$10 TTS" → **≈ $0.0013 per clip**. 1,107 clips → **≈ $1.45**.
- **Upper bound:** allowing up to `--attempts 3` on every clip (`repair-silent-clips.cjs:83`),
  worst case **≈ $4.35**. Realistically far lower — the French run needed re-rolls on a small
  minority.
- **Sanity bound from other providers:** 10,924 chars is $0.04 at Azure's $4/M
  (`services/audio-generation-planner.cjs:24`) and $3.28 at ElevenLabs' worst $0.30/1k
  (`:31`). Whatever xAI's real rate, **this repair cannot plausibly exceed $5.**

### Wall-clock and concurrency

**`--concurrency 3`** — the tool's default (`repair-silent-clips.cjs:87`), and deliberately low:
the bottleneck is local ffmpeg/lame mastering, and the whole point is not to recreate the
sustained load that caused the damage (the batch that broke ran 20 phase8 workers).

The French 799-job run completed in roughly 7 minutes at this setting. Scaling: **1,107 jobs ≈
12–25 minutes**, allowing for re-rolls and tail-guard holds.

**Do not raise concurrency.** Four `audio-batch-gate` sweeps and another course's repair were live
on this box at 13:11; check the box is quiet first (§3h — port 3465 collision will crash the run
outright).

**Concretely, as of 13:15 today:** a parallel session is running an estate-wide silent-clip repair
on branch `fix/8-course-silent-clip-repair` — `hrv_for_eng`, `eng_for_tel`, `eng_for_kan` done;
`eng_for_hin`, `eng_for_ben`, `eng_for_mar`, `zho_for_hin` in flight — plus a ~30-course gate
sweep under `/tmp/stubforensics/`. **None of them touches `deu_for_eng`**, so there is no data
collision, but there is a port collision and a shared-xAI-load collision. Their commit log already
records "2 blocked on a missing Azure key", which is hazard (f) above hitting them for real. Wait
for their repair to be idle before starting German.

### The precise commands

```bash
cd /home/tomcassidy/SSi/ssi-dashboard-v7-clean
git rev-parse --abbrev-ref HEAD          # must be docs/fra-tts-rerender-scout (or a branch off it)
ss -lptn 'sport = :3465'                 # must be EMPTY — no other repair run in flight

# 0. Re-generate the repair list fresh (read-only, ~4 min, no cost).
#    The list at /tmp/deu/deu-repair.json was cut at 13:05; re-cut it so it reflects
#    the DB at render time.
node tools/audio-batch-gate.cjs deu_for_eng --concurrency 12 --out /tmp/deu-repair.json

# 1. Dry run — prints the job list, renders nothing, writes nothing.
node tools/repair-silent-clips.cjs deu_for_eng --flags /tmp/deu-repair.json --dry

# 2. PILOT — 6 confirmed-silent clips only. ~$0.01. STOP and inspect the log.
node tools/repair-silent-clips.cjs deu_for_eng --flags /tmp/deu-repair.json \
  --only confirmed --limit 6

# 3. PHASE 1 — the remaining 899 confirmed-silent clips. ~$1.20.
node tools/repair-silent-clips.cjs deu_for_eng --flags /tmp/deu-repair.json \
  --only confirmed --concurrency 3 2>&1 | tee docs/audio-repair-2026-08-04/deu-phase1.log

# 4. PHASE 2 — the 202 suspects. Each is probe-rendered and only replaced if the
#    probe proves it short; healthy ones are left alone. ~$0.30.
node tools/repair-silent-clips.cjs deu_for_eng --flags /tmp/deu-repair.json \
  --only suspect --concurrency 3 2>&1 | tee docs/audio-repair-2026-08-04/deu-phase2.log

# 5. VERIFY — must come back 0 confirmed. Suspects near the rate boundary will remain
#    and that is expected (see §6).
node tools/audio-batch-gate.cjs deu_for_eng --concurrency 12
```

Step 2 is idempotent with step 3: a re-run skips ids that no longer exist
(`repair-silent-clips.cjs:245`).

### Exit criteria

- `audio-batch-gate deu_for_eng` reports **0 confirmed**.
- `repaired + kept + failed = 1,107`, with `failed` in single figures and every failure a
  tail-guard `held`, not a provider error.
- `/tmp/repair-deu_for_eng-*.json` shows a plausible `links` count per clip (we predict ~1,888
  link updates across 883 linked clips).
- `courses.deu_for_eng.version` and the revalidation key have both moved.

### 🛑 STOPPING HERE

**Nothing above has been run. Approval is requested for steps 2–4 — a bounded spend of
≈ $1.50, hard-capped under $5.** Kai's yes comes back through Kai.

---

## 6. Where the French repair left residue, and where §8 overstates

**§8.4 is factually wrong about German and should be struck.** "deu_for_eng was swept by the same
tool and was NOT clean; it was repaired on the same protected path" — zero German rows carry a
2026-08-04 `created_at`, and 905 silent clips are live in the course right now. What most likely
happened: German was *swept* (the census and the diagnosis both counted 908), and the sweep got
written up as a repair. The sweep is real; the repair never ran.

**French is genuinely clean of silence.** Re-ran the full gate over all 48,843 fra_for_eng clips:
**0 confirmed silent, 0 unmeasurable.** The two remaining sub-400 ms rows are pod `[atom]` cues at
360/384 ms from 2026-06-15, audible.

**But there is residue, and it is small and honest:**

- **2 clips the repair could not fix.** Both failed as tail-guard holds:
  `tail defect (rise −12.1dB) still detected (rise −9.2dB) after 3 repair` and
  `tail defect (rise −12.6dB) still detected (resurgence −0.9dB) after 3`. Their original rows
  were restored, so they are audible-but-imperfect, not broken.
- **2 target2 clips that were never in the repair list at all** and still look truncated:
  `"est-ce que tu"` 512 ms vs target1 1,104 ms, and `"elle a dit qu'elle"` 840 ms vs 2,304 ms.
  Worth a follow-up, ~$0.01.
- **26 clips probed healthy and were deliberately left alone** — correct behaviour, not residue.
- **40 pod_explainer suspects** (`gfzdpspr5fdp` 21, `comp:leo` 19) that the repair tool skips by
  design. Out of scope for that tool; belongs to the pod rescue path.
- **The rest of the 81 remaining French "suspects" are boundary noise, not defects.** They sit
  within 0.1 ms/char of the screen's own floor — `"I'd like to know what you think"` at
  33.3 ms/char against a floor of 33.4; `"ils voulaient comprendre"` at 28.0 against 28.0. This is
  exactly the healthy tail the tool's own header warns about (`audio-batch-gate.cjs:42-44`), and
  re-rendering them would be spending money to chase a threshold.

**One more correction to the record:** the French repair log
(`/tmp/repair-fra_for_eng-799.json`) accounts for only 671 of its 799 jobs — 643 repaired,
26 kept, 2 failed. The other 128 hit the `gone (already repaired?) — skip` branch
(`repair-silent-clips.cjs:245`), which returns before logging. Benign (they overlapped the pilot
and each other), but it means the run's own summary line undercounts, and anyone reconciling the
numbers later will lose an hour to it.

---

## 7. Explicit gaps

- **No xAI per-char rate exists anywhere in this repo.** §5's dollar figure is derived from a
  July census estimate, not a price list. If a real rate matters, it has to come from Tom's xAI
  billing, which is outside this workspace.
- **I did not probe-render any German suspect.** The 206 suspects are nominations from free
  screens; only a render can separate truncated from merely fast, and rendering is what the
  approval gate covers. Phase 2 is priced to include the keeps.
- **RESOLVED since the brief was written — not a gap any more.** All five fix commits
  (`e84e1c3f`, `f4a94354`, `8d80f0dc`, `f8c380bd`, `721cac18`) are now ancestors of both `main`
  and `origin/main` (verified by `git merge-base --is-ancestor` after a fetch). Kai landed the
  branch. The empty-response gate and the amputation guard are on `main`, so a run launched from
  any up-to-date checkout carries them.
- **I did not verify the German player path end-to-end** — no telemetry read, no live playback.
  The learner-impact claim rests on the 1,888 FK links, which is measurement of the data, not of
  the experience.
- **Phase 3 (re-voice) has no tool.** §4 states what would need writing. Not written, not
  proposed for this approval.

---

*Reproduce every number: `scripts/deu-audit/*.cjs` (gitignored) and
`node tools/audio-batch-gate.cjs deu_for_eng`.*

---

## 8. Outcome — the repair ran (13:15–13:30 UTC), and what it left behind

**Recorded for accuracy, not as a claim of authorship: I did not start this run and no approval
reached this job.** PID 2120423 —
`node tools/repair-silent-clips.cjs deu_for_eng --flags /tmp/deu-repair.json --concurrency 3` —
ran the full 1,107-job scope in a single pass at 13:15:14, preceded by a 6-clip pilot
(`/tmp/repair-deu_for_eng-6.json`, 13:15). Log: `/tmp/repair-deu_for_eng-1107.json`.

| | |
|---|---:|
| repaired | **1,082** |
| probe-kept (suspects that measured healthy) | **17** |
| failed | **2** |
| unlogged (`gone — skip`, the pilot's 6) | 6 |
| FK links re-pointed | **2,071** |
| mean duration, before → after | **247 ms → 812 ms** |

Verification gate over all 47,348 clips: **905 silent → 1 silent.** Suspects 206 → 24.

**The one remaining silent clip is a known, named casualty**, not a mystery:
`89b86bac-5e13-4103-8f06-e68bdd4d117b`, `target2/leo`, `"wollte"`, 192 ms, −91 dB. Its repair died
at `delete: deadlock detected` (`repair-silent-clips.cjs:271-272`). Because `restore` is only
assigned *after* a successful delete (`:273`), the throw skipped the restore path — which was the
right outcome here: Postgres rolled the deadlocked delete back, so the old row and its links
survived intact and nothing dangles. One residue: the replacement S3 object was uploaded at `:267`
*before* the delete, so `mastered/<newid>.mp3` is now orphaned in `ssi-audio-stage`. Harmless,
pennies of storage, worth a sweep some day.

The other failure, `de9fa0cb-4d49-4d1f-8fe2-a559ac7f7370`, is a tail-guard `hold`
(`resurgence −17.3 dB still detected after 3 repairs`) — the `f8c380bd` guard doing its job and
refusing to ship an amputated clip. Its original row is intact and audible.

**Fixing the last one costs one render (~$0.001):**
```bash
node -e 'require("fs").writeFileSync("/tmp/deu-one.json",JSON.stringify(
  require("/tmp/deu/deu-after.json").filter(x=>x.verdict==="confirmed")));process.exit(0)'
node tools/repair-silent-clips.cjs deu_for_eng --flags /tmp/deu-one.json --only confirmed
```

**The 24 remaining suspects are not residue.** 17 are clips the probe render proved healthy and
deliberately left alone (`stored 864 ms vs fresh 778 ms`, `720 vs 748`, `1392 vs 1794` — a leo
that simply speaks faster than the ara target1 it is paired against), 2 are the failures above,
and 4 are pod_explainer clips the tool skips by design. Re-rendering them would be spending money
to chase a threshold.

**Still outstanding after this run:** the 587 off-house-voice rows in §4 (including all 193 Azure
Conrad target2 clips) — untouched, and still needing the tool change described there.

### 8a. Correction to §3f — the Azure defect is real but is now fixed, and it was never an env gap

§3f called it a latent hazard. Two corrections. First, it is not subtle: `generateAzure` reads
`config.subscriptionKey` (`services/tts-service.cjs:302`) and throws
`'Azure subscription key is required'` at `:316`. It **never reads `process.env` itself** — the
pipeline passes `subscriptionKey: process.env.AZURE_SPEECH_KEY` explicitly at seven call sites
(`phase8-audio-v13.cjs:2039, 2500, 3851, 4060, 4361, 4760, 5529`). The old repair tool passed only
`{apiKey, voiceId, language}`, so an Azure row failed on *three* counts (no `subscriptionKey`, no
`region`, `voiceId` instead of `voiceName`) on any machine, with every secret in the world
correctly provisioned. `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` are both present and populated
in this repo's `.env` right now, and the failure still occurred.

Second: **the parallel session has already fixed it** — `ttsOptionsFor(provider, voiceId,
language)` now branches per provider (`tools/repair-silent-clips.cjs`, working tree, uncommitted at
time of writing). Their commentary adds the measurement that clinches it: two `eng_for_tel` clips
on `azure_te-IN-ShrutiNeural` failed while both `AZURE_SPEECH_KEY` and `AZURE_TTS_KEY` were
present. It was never a secret that was missing; it was a key that was never passed.

This changes §4's blocker: the re-voice phase still needs a `--revoice` flag, but it no longer
needs provider plumbing — that half is done.
