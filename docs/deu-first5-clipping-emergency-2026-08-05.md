# deu_for_eng — the first five seeds were shipping amputated audio

**2026-08-05. Production emergency raised by Tom after playing the first 10 minutes of the live course.**

Phase 1 (find and fix the first five seeds) is **done and verified live**. Phase 2 (exact root cause)
is stated below with evidence. Nothing beyond the first five seeds has been touched.

---

## 1. The headline

| | |
|---|---|
| Unique audio clips in seeds 1–5 | **384** |
| Clips that had ever been quality-checked before today | **0** |
| Multi-word clips audited so far | 192 of 250 |
| Clips found damaged | **35** |
| Clips re-rendered and now live | **26** |
| Clips probe-checked and left alone as healthy | 3 |
| Failures | **0** |
| Refused by the repair tool (`role=presentation`) | **6** — open gap, §6 |
| Audit still running | 134 clips of 384 |

**The damage was missing words, not noise.** Between a quarter and a half of each affected clip's
speech had been deleted, and the cut was hidden behind 100 ms of clean silence — which is why every
physical probe run on this course has reported it clean.

The very first German sentence of the course was among the damaged:

> `Ich will jetzt mit dir Deutsch sprechen` shipped at **1512 ms**. Correct length: **2184 ms**.
> The word **`sprechen`** — the verb the sentence exists to teach — was not in the file.

## 2. The damage pattern

It is not random. It concentrates on **sentence-final long verbs**, which in these seeds is exactly
the vocabulary being taught:

| what the course says | what production played |
|---|---|
| Ich will jetzt mit dir Deutsch **sprechen** | "Ich will jetzt mit dir Deutsch…" |
| wie man so oft wie möglich **spricht** | "…wie man so oft wie möglich" |
| Ich will lernen, wie man **spricht** | "Ich will lernen, wie man…" |
| I want to learn how to **speak** | "I want to learn how to" |
| I'm trying to learn German **as often as possible** | "I'm trying to learn German as often as…" |

Seed 3 is the worst hit: its whole `how to speak` / `as often as possible` LEGO family lost the
target verb across both German voices, both target roles, **and** the English known side. A learner
drilling seed 3 was being taught a word they never heard.

## 3. How it was found

Three independent measurements, because the obvious ones all say "clean":

1. **Unprimed whisper ASR, final-word retention.** Not CER. Decode the shipped clip without ever
   showing whisper the expected text, then check whether the expected final word appears. This is
   the metric from `docs/amputation-tts-probe-2026-08-04.md` Test B.
2. **Cross-voice span pairing.** The same text rendered by two different voices should have similar
   speech spans — median ratio across 121 paired texts is 1.01. Outliers are truncation.
   `Ich will mit dir Deutsch sprechen` was 910 ms on `leo` against 1450 ms on `ara`.
3. **Confirmation by re-render.** Every repaired clip came back 25–45 % longer, and the fresh render
   contains the missing word. That is the proof, not an inference.

**What does NOT find it, and why the course looked healthy:**

- Tail-shape / abrupt-cut probes: **0 of 383 clips fail**. The amputation is followed by a re-pad to
  100 ms of silence and an anti-click fade, so the file ends in a textbook clean decay.
- Digital clipping: **0 clips**, peak never above 0.85 FS.
- Start-of-clip truncation: **none** — every clip has 45–175 ms of clean lead-in.
- The live veracity gate: **passed all of them**. It scores character error rate against a 0.3
  threshold; one missing word out of seven is ~0.15 and passes comfortably.

## 4. Root cause — the exact mechanism

`repairTailDefect`, `services/audio-processor.cjs:686`.

The function exists to remove a "tail click". It calls `detectTailClick`, and when that reports a
click it trims the clip at the reported timestamp, then re-pads with `apad=pad_dur=0.1`
(`audio-processor.cjs:715`) and applies an 8 ms fade.

**The detector cannot distinguish a tail click from a natural mid-sentence pause.** When a speaker
pauses before the final verb — which German word order makes routine — the resumed speech after the
pause reads to the detector as a burst of energy in the tail. It trims at the pause, deleting every
word after it, and the 100 ms pad plus the fade make the result look like a clean, deliberate ending.

This is not inference. It was caught live during this repair run — each of these lines is a clip
that the old default would have cut at that timestamp:

```
masterAudio: tail flag (rise -6.7dB at 1.364s) is resumed speech — pausey render shipped untouched
masterAudio: tail flag (burst -3.4dB at 1.826s) is resumed speech — pausey render shipped untouched
masterAudio: tail flag (resurgence -2.5dB at 3.058s) is resumed speech — pausey render shipped untouched
```

**Correction, 2026-08-05, after a second measurement — do not use the 100 ms fingerprint as a
per-clip damage test.** I originally wrote that 218 of 383 clips carry the exact 100 ms pad
signature "so the repair ran on more than half of them". The count is right and the spike is real —
the trailing-room histogram is sharply peaked at 100 ms (136 clips, against 45 at 95 ms, 37 at
105 ms and 11 at 90 ms), so it is a genuine artefact of a pad step and not a smooth distribution.
But it does **not** identify which clips lost words. Final-word-missing rate on texts of three words
or more: **19.7 % inside the fingerprint (n=122) vs 17.2 % outside it (n=93)** — no useful
discrimination. The fingerprint tells you a clip went through the pad; it does not tell you the trim
ate anything. Every damaged clip in this report was identified by ASR word retention and confirmed
by re-render, never by the fingerprint.

The existing guards do not stop it. `AMPUTATION_MIN_KEEP_FRACTION` (0.5) only blocks a trim that
throws away more than half the clip; eating the final word of a six-word phrase keeps well over
half. The silence guard only fires if the result is silent. `verifyTrimKeepsText` is the check that
would catch it, and it returns `null` → proceed whenever whisper is unavailable.

**And whisper WAS unavailable, for a mundane reason — this is why the last guard was dead.**
`whisper-cli` lives in `~/.local/bin` on this box, which was not on the PATH the render process
inherited. So the trim-safety check returned `null` = "could not verify", and the code treated that
as permission to proceed. Proven two ways by the root-cause investigation: the 2026-08-04 German
repair run says *"whisper-cli or model missing"* in its own log, and an A/B of the pre-fix code on a
single clip returns `null` without `~/.local/bin` on PATH and `{ok:false}` — i.e. it *would* have
held the clip — with it. **That run trimmed 449 German clips**, 20 of which are still linked into
seeds 1–5. It is the same failure class as the ffmpeg and lame PATH bugs already documented at the
top of `audio-processor.cjs`: the binary was present and working, and the process simply could not
see it.

Production stopped doing this at **2026-08-05 15:40:03 Z**, when the render service restarted with
`TAIL_REPAIR_MODE=flag`. Everything Tom heard was rendered before that.

**The capability has since been deleted outright** (Tom's escalation, 2026-08-05 21:06 Z, commit
`8415f2d9`): `repairTailDefect`, `verifyTrimKeepsText`, the `TAIL_REPAIR_MODE` switch and
`tools/declick-tail.cjs` are gone, replaced by a read-only `flagTailDefect`. See §8.

## 5. Why unchecked audio reached production

Three separate failures, each sufficient on its own.

**(a) The fix existed and was never applied backwards.** `TAIL_REPAIR_MODE=flag` disables the
damaging trim. It landed yesterday in commit `d90f1ba3` (2026-08-05 02:16 Z) and is set in
`ops/systemd/popty-phase8-audio.service` and `popty-production-api.service`. So renders from that
point on are safe. **Nothing ever went back over the clips rendered before it.** The first five
seeds are almost entirely February and March audio. The flag stopped the bleeding and left the wound.

**(b) The gate's metric cannot see this defect.** `services/audio-veracity.cjs` is a genuinely good
tool — unprimed ASR, no forced alignment, three outcomes not two. But it scores CER against 0.3, and
a single missing word in a seven-word sentence does not reach that threshold. All 384 of these clips
would pass it. Final-word retention is the metric that finds this, and the live gate does not use it.

**(c) No clip in the estate has a recorded quality verdict.** `course_audio` carries
`veracity_checked_at`, `veracity_pass`, `veracity_reason`, `veracity_cer`, `veracity_attempts`,
`veracity_checker`. A search of the entire repo for `veracity_checked_at` outside `node_modules`
returns **zero hits** — no code writes any of them.

```
course_audio total          2,544,755
rendered before the flag    2,541,307
with a recorded verdict             0
```

The gate runs inline at render time and leaves no trace, so nothing downstream can tell a checked
clip from an unchecked one. That is precisely why the gate audit
(ledger `003157ac-d73a-484d-b7c3-40e9cc774966`) had to **infer** 1,413 clips' status from their age
— there was no recorded status to read. And it is why the gate-escape probe
(`docs/gate-escape-probe-2026-08-05.md`) found this course clean: it is a tail-shape test, and its
own blind-spot list says it cannot see a missing word that ends on a decayed sound.

**Unpushed work is not implicated.** The uncommitted working-tree changes on
`fix/audio-finish-the-job-2026-08-05` are to the autocue/record-room UI and the recording-script
generator. The damaged clips predate all of today's work by five months.

## 6. Explicit gaps

- **6 presentation clips are still damaged.** `repair-silent-clips.cjs` refuses `role=presentation`
  by design: deleting one CASCADEs into `lego_introductions` and destroys authored content. One is
  confirmed bad — the intro for the `how to speak` LEGO plays as *"…I'm trying to learn how to"*,
  losing both `speak` and the trailing `is:`. These need a make-before-break path that inserts a new
  row and re-points `lego_introductions.presentation_audio_id` **without** deleting the old row.
  Not attempted here; it is a different mutation shape and this was an emergency fix.
- **134 of 384 clips are still being audited.** The sweep runs at roughly 1.7 s/clip and was paused
  to give the repair the CPU. The 35 flagged are from the 250 audited so far; expect a handful more.
- ~~20 dangling audio references~~ **CLOSED — dead data, not a learner-facing defect.** The 20
  `course_practice_phrases.presentation_audio_id` values pointing at deleted `course_audio` rows are
  all on `phrase_role='component'` rows. `presentation_audio_id` is only ever read off `course_legos`
  / `lego_introductions`, never off a practice-phrase row, on any live path
  (`generateLearningScript.ts:1107`, `bundle.ts:529`, `cycles.ts:418`, `backendCyclesToRounds.ts:181`;
  `round-map.ts` doesn't select the column at all). They cannot produce silence or a fetch error.
- **Nothing beyond the first five seeds has been measured.** The rest of deu_for_eng, and every
  other course, is unassessed. The exposure population is 2.54 M clips rendered before the flag.
- **No human has listened.** Every verdict here is instrument-based. The instruments agree with each
  other and with the re-renders, but a listening pass on a sample is worth doing.

## 7. Verification that the fix is live

Read back from S3 after the repair, decoded fresh with whisper:

- 26 of 26 re-minted clips return **HTTP 200** and **contain their final word**.
- Every replacement is 25–45 % longer than the clip it replaced.
- 0 stale links to replaced rows.

And read back a second time **through the live production app**, not storage — 26 of 26 return
HTTP 200 with real audio bytes from `https://saysomethingin.app/api/audio/<new-id>`. That is the
exact URL a learner's player builds (`backendCyclesToRounds.ts:37`), so this is the learner path,
not a proxy for it. Production bucket confirmed as `ssi-audio-stage`, the only bucket
(`services/s3-service.cjs:6-8`).

The relink is also confirmed sufficient on its own: `cycles.ts` and `bundle.ts` read the audio-id
columns live from Postgres per request (`private, max-age=60`), so the next fetch hands the learner
the new id. `course_round_index` carries no audio ids, so **no materialised-view refresh is needed**
for this repair shape. The old IndexedDB blob is keyed by the old id (`AudioCache.ts:128`) and is
simply orphaned — never served again.
- The repair bumped `deu_for_eng` to version `0.1766.44` and incremented the integer revalidation
  key `4093 → 4094`, so clients refetch.

The repair mints a **new** audio id rather than overwriting bytes. That is necessary, not incidental:
`ssi-learning-app/api/audio/[audioId].ts:150` serves audio with
`Cache-Control: public, max-age=31536000, immutable`, so a device that already downloaded the
amputated bytes would hold them for a year under the old id. A new id is what actually heals a device
that has already played the course.

**Spend:** 29 xAI renders, 1,167 characters. 29 responses, 0 empty, 0 cooldowns.

## 8. Proposed shape for what comes next — for Tom's direction, not started

**The estate sweep.** The detector is cheap and the metric is free: measure the 100 ms pad
fingerprint (metadata only), then run final-word retention over the fingerprinted subset. Pilot ~40
clips per course first and read the distribution before committing — the fingerprint marks 57 % of
clips but only ~18 % of multi-word clips are actually damaged, so the flag count is not the work
count. Order by learner exposure: first seeds of live courses first, since that is where an
amputation costs the most.

**The gate.** Two changes, both small. Add final-word retention alongside CER in
`audio-veracity.cjs` — it is the metric that catches this class and the decode is already being
computed, so it costs nothing. And **write the verdict to the row**: the six `veracity_*` columns
already exist and nothing populates them. Once a clip carries its own verdict, "which clips are
unchecked?" becomes a query instead of an archaeology exercise, and no future audit has to infer
status from age.

**The default — RESOLVED, and then superseded.** Flipping the code default to `flag` landed as
`c6703b2d`. Tom then escalated (21:06 Z): *"DELETE the tail-repair service's ability to modify audio
entirely, do not just change its default."* Done in `8415f2d9` — `repairTailDefect`,
`verifyTrimKeepsText`, the `TAIL_REPAIR_MODE` switch and `tools/declick-tail.cjs` are removed;
detection survives only as read-only `flagTailDefect`, which carries its 9 % precision in every
result. `tools/verify-tail-repair-mode.cjs` is now a regression guard that sets
`TAIL_REPAIR_MODE=repair` deliberately and fails if anything still honours it.

**Why a default flip was not enough.** Six copies of `audio-processor.cjs` exist on this host, and
**two carried the mutation path with no switch at all** — `~/ssi-worktrees/audio-followup-2026-08-04`
(an *audio* worktree) and `~/SSi/wt-walkthrough`. Anything run from those amputates unconditionally,
which is the most likely mechanism for the recurrence. An env var that must be set correctly in
every unit file, tool, cron and checkout is a default waiting to leak. Those are other agents'
branches; they inherit the deletion when they rebase on `main`, and until then they are live
landmines — reported here rather than silently left.

---

*Artefacts (gitignored, on this box): `scripts/deu-first5-clips.json` (the 384-clip census),
`scripts/deu-edge-shape.json` (acoustic measurements), `scripts/deu-first5-veracity.json` (ASR
decodes), `scripts/deu-first5-repair.json` (the flag list), `scripts/deu-verify-live.json` (the
live read-back). Repair log committed at `docs/audio-repair-2026-08-04/repair-deu_for_eng-29.json`.*
