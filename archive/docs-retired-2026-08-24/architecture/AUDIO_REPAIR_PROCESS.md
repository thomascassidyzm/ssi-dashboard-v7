# Audio repair — THE process

**Status: canonical.** This is how damaged course audio is found, regenerated, verified and
swapped. It was ratified by Tom on 2026-08-05 after he listened to all 384 regenerated clips from
`deu_for_eng` seeds 1-5 and said "the work on the clips is excellent — I have accepted all of them
… I approved the process". Written up 2026-08-06.

If you are repairing course audio, follow this document. Do not invent a detector, do not add a
trimming step, do not "improve" the mastering. Every one of those has already been tried and each
one is why this document exists.

Linked from `AUDIO_PIPELINE_ARCHITECTURE.md` §6b (make-before-break), which this process implements.

---

## 0. The historical cause — read this before you change anything

`repairTailDefect` in `services/audio-processor.cjs` deleted audio from a detected "tail dip" to
the end of the file and re-padded with 100 ms of silence plus an 8 ms fade. `detectTailClick`
cannot distinguish a tail click from a natural mid-sentence pause. German word order makes a pause
before the final verb routine, the resumed speech after the pause reads as tail energy, and the
trim then deleted **every word after the pause**.

It shipped a live course with taught words missing: `deu_for_eng` served *"Ich will jetzt mit dir
Deutsch sprechen"* without **sprechen**. 449 German clips were trimmed in a single run on
2026-08-04.

Its guards could not work:

- `AMPUTATION_MIN_KEEP_FRACTION` only blocked a trim discarding >50 % of a clip. Eating one final
  word keeps far more than half.
- The silence guard only fired if the *result* was silent.
- The whisper guard `verifyTrimKeepsText` returned `null` → proceed whenever `whisper-cli` was
  absent. **`whisper-cli` was not on the render process's PATH, so "could not verify" was treated
  as permission to proceed.** It is installed at `~/.local/bin/whisper-cli`, which systemd user
  units and cron do not inherit. Check this before trusting any veracity result.
- Because the trim re-padded with silence and a fade, the result had a textbook clean decay. Every
  physical tail-shape probe reported the course healthy. The damage was invisible to everything
  except an ASR word-retention check.

Measured precision by ear: **7/76 = 9 %** (`docs/audio-tail-gate-decision-memo-2026-08-04.md`).

The mutation path is **deleted**, not flagged. An earlier `TAIL_REPAIR_MODE` env switch was also
removed, because an env var that must be set correctly in every unit file, tool, cron and fresh
checkout is a default waiting to leak — which is exactly what kept happening. There is now no code
path in that module that can trim or rewrite course audio. `flagTailDefect` survives, read-only,
and must never gate, mutate or auto-act.

**Do not reintroduce a trimming step. There is no version of it that is safe.**

---

## 1. Detection — the tail-integrity predictor

The predictor is `tailIntegrity` in `services/audio-repair-core.cjs`. Tom's ruling: *"the doc's
analysis of the rate of fade from signal to end of the clip was a very accurate predictor."*

**What it measures.** The time from the last frame at (peak − 10 dB) down to (peak − 50 dB) — how
long the clip takes to fall from full speech level to silence. A clip allowed to finish decays
naturally; a clip cut mid-word stops.

**The threshold: `steepReleaseMs: 30` ms.** Clips heard as cut off measured a median 20 ms release
against 80 ms for clips heard as natural, over 104 blind-judged clips, p = 0.0037
(`docs/audio-tail-gate-decision-memo-2026-08-04.md`). The 30 ms line sits between the two
populations.

**Control that rules out the obvious confounder:** fresh renders of the same 93 texts through the
same voices moved the median release 20 ms → 115 ms, and 92 of 93 stopped tripping the check. The
flags are not an artefact of which phoneme a word happens to end on.

### Why the other two checks do not see this defect

- **Duration-vs-expected** (`chars / 14 cps`) is a rate estimate, not a defect detector. It flagged
  198 of 384 `deu_for_eng` seed 1-5 clips (52 %) and buried Tom's three named clips at ranks 13, 15
  and nowhere. On the whole course it flags 28,407 of 47,254 (60 %). **Never use it to scope a
  repair.** It survives only as a secondary ordering signal.
- **CER-based veracity** (the live gate, 0.3 threshold) **passed every amputated clip**. Losing one
  short final word from a sentence moves character error rate far less than 0.3. That is precisely
  why nobody caught this. Word-retention on the *final word* is the metric that works
  (`docs/amputation-tts-probe-2026-08-04.md`, Test B) — not CER.

### Running it

```bash
node tools/audio-repair.cjs queue <course> --tails --concurrency 16 --limit 100000 \
     --json docs/audio-repair-<date>/<course>-queue-tails.json
```

`--max-seed N` scopes to clips reachable from seeds 1..N. `--tails` costs one S3 GET and one ffmpeg
decode per clip; at `--concurrency 16` that is ~50 clips/sec, so a 50,000-clip course is ~15 min.
It costs **no money** — detection is always free, and it is always run before any spend.

The queue reads are **paged**, and must stay that way: they page along `text_normalized`, because
the unique index on `(course_code, text_normalized, language, role, voice_id)` is the only index
whose leading column is `course_code` and therefore the only ordering Postgres can walk without
sorting the whole course. Ordering by `id` or `created_at` sorts ~50,000 rows and blows the 8 s
statement timeout. Before 2026-08-06 this was a single `.limit(5000)`, which silently truncated a
47,254-clip course to a tenth of itself and reported a clean flag rate for the part it never read.

**Fix only where the predictor flags.** Tom's ruling: *"only if needed."* This is not a blanket
re-render. On `deu_for_eng` seeds 1-5 it flagged 91 of 384 (~24 %). Let the measurement, never a
quota, decide.

---

## 2. Priority — LEGOs before cycles, always

Tom's ruling, 2026-08-06:

> "we should prioritise LEGOS - before cycles - a missing clip in a LEGO basically destroys the
> learning journey / a missing clip in a cycle makes little difference"

and, on what a LEGO means:

> "INCLUDING proper introduction of the LEGO of course … intro + voice 1 + voice 2"

So a LEGO is the **full triple**: the introduction, target voice 1, target voice 2, plus the
known-side prompt. Order every repair queue LEGO-first; cycle clips after.

**Banned metric:** never report completeness of the "prompt + voice 1" kind for a LEGO. It flatters
a broken course. Everything in the SSi method is contingent on previously introduced LEGOs, so a
LEGO missing one of its voices is a broken course, not a 67 %-complete one.

---

## 3. Generation — naked TTS

**Raw provider bytes. Zero time-domain edits.** No tail detection, no trimming, no silence
stripping. Gain and the true-peak safety limiter only — gain is not a time-domain edit and cannot
add or remove a millisecond of speech, which is the entire point.

This is what `tools/audio-repair.cjs propose --spend` already does. It renders through
`phase8.masterAudio` → `audioProcessor.normalizeAudio`, which is:

```
acompressor(threshold=-24dB:ratio=8:attack=5:release=80:knee=8)  →  volume=<gain>dB
   →  true-peak limit  →  8ms anti-click fades
```

levelled to **−16 LUFS**. Since `repairTailDefect` was deleted from this path, nothing in it can
remove speech. These are the exact bytes Tom listened to and accepted on 2026-08-05, so this is the
approved chain — **do not swap it for `normalizeAudioClean` or anything else without a fresh
listening pass.**

### Levelling — measured, 2026-08-06

Tom asked why the clips sounded louder than the ones they replaced. Measured on all 93 accepted
pairs (superseded S3 object vs current), integrated LUFS:

| | before | after | delta |
|---|---|---|---|
| p10 | −17.4 | −15.9 | +0.3 |
| median | −16.5 | −15.6 | **+0.9** |
| p90 | −15.9 | −15.5 | +1.7 |

91 of 93 are louder, none by 3 dB or more, max +2.9 dB. The repaired clips sit at the top of the
course's own normal range (untouched spread −17.4…−15.9) but are **not outliers**. No re-levelling
of the accepted 93 is needed, and no extra levelling step is needed before rollout: the production
path already lands every repaired clip within ~1 dB of its untouched neighbours.

### The trap this measurement exposed

The 384 clips in `docs/audio-repair-2026-08-05/deu-seeds1-5-naked.md` are a **different, quieter
set** than the 93 that were accepted. That doc says "the only thing applied is a single volume
adjustment so the voices sit at the same level". **That is false.** Its own log
(`deu-seeds1-5-naked.json`) records `rawLufs: null` and `gainDb: 0` for **all 384 clips** — the
loudness measurement silently returned null and the gain defaulted to zero. Measured: those naked
clips sit at a median **−26.4 LUFS, 10.8 dB quieter** than the deployed clips beside them, every
single one, no exceptions.

The accepted clips were never those bytes. They came from `propose --spend`
(`repair-candidates/…`), were served to Tom for listening as `mastered/listen-2026-08-05/…`, and
went through the full levelling chain above. That is why they are at −15.6 and not −26.

**The lesson, and it is the important one:** if anyone ever implements "naked" literally as that
doc describes it — raw provider bytes with the gain step — they will ship clips **10 dB quieter
than every neighbour**, which is a learner-facing defect of its own even though every word is
present. A repaired clip must always be levelled to the course's own reference. Gain only. Always
assert the measured LUFS is non-null before trusting a gain of 0.

### Stragglers

Clips that fail repeatedly at `--concurrency 3` succeed **serially**. Retry stragglers at
`--concurrency 1` before concluding a clip cannot be rendered
(`docs/audio-repair-2026-08-04/deu_for_eng-revoice-complete.md`).

**Adding terminal punctuation makes it worse. That hypothesis is dead — do not retry it.**

---

## 4. Cost gate

TTS costs money and needs a plan and approval before spending (CLAUDE.md). `propose` will not
render without `--spend`; without it you get a free dry run with the real character count.

Calibration from the run Tom approved: **384 clips ≈ 11,045 characters ≈ £0.35**, i.e. ~29
characters per clip and ~£0.000032 per character.

Publish clips flagged, characters to render and £ estimate **before** any `--spend`.

---

## 5. Verification — on the bytes, never on the log

For every candidate, before it goes near a human:

1. **Decode it back from S3.** Not the render buffer, not the log line — the object that will
   actually be served.
2. **`releaseMs` above 30 ms.** The same predictor that flagged it must now clear it.
3. **Duration matches the DB row.**
4. **Unprimed whisper ASR confirms the expected FINAL WORD is present.** Final-word retention, not
   CER — CER at 0.3 passed every amputated clip. Unprimed matters: a primed decode will happily
   hallucinate the word you told it to expect.
5. **Link census before and after** — `lego_introductions`, `course_legos.target1/2_audio_id`,
   `course_practice_phrases.target1/2_audio_id`. Every link must survive.

**Name any clip that still measures ≤30 ms rather than burying it.** The seeds 1-5 run named its
one straggler ("auf Deutsch"); that honesty is the standard.

**Check `whisper-cli` is on PATH before you believe a veracity result.** It lives in
`~/.local/bin`, which service processes do not inherit. "Could not verify" is not "verified" — that
confusion is what shipped the amputations. `lame` has the same problem and the same fix
(`ops/install-lame.sh`).

---

## 6. Acceptance — only a human passes audio

**Machines may flag audio. Only humans may pass it.**

`accept` refuses without `--i-have-listened` and `--actor`. That rail is deliberate and there is no
way around it.

- **Never fabricate `--i-have-listened`.**
- **Never pass `--actor tom` for a batch he has not heard.**

Working pattern: per course, publish a tap-to-play listening doc — deployed clip beside the
regeneration, worst-first, a representative sample rather than hundreds of players (style:
`docs/audio-repair-2026-08-05/deu-seeds1-5-naked.md`). Generation and verification do **not** wait
for a human; only the swap does. When he gives a go-ahead covering a course, the accept run records
his words verbatim as `--reason` (as commit `339e755f` did).

### What the swap does

Non-destructive, in place, at the same `course_audio.id`:

- `s3_key`, `duration_ms`, `audio_revision` update in place.
- `id`, `text`, `text_normalized`, `role`, `voice_id` and **every foreign key** are untouched, so no
  CASCADE can fire. This is the whole reason presentation clips can be repaired at all — minting a
  new id forces a DELETE of the old row (the unique index will not hold both) and that CASCADE
  destroys the authored intro script in `lego_introductions`.
- **Superseded S3 objects are retained.** They cost nothing and they are the evidence.
- `course_audio_revisions` records the before-state, so a revert is data-only.
- Per-row before-state assertions abort on drift; every row is logged to a
  `*-{dryrun,applied}-log.json`.

The old delete-first engine `repair-silent-clips.cjs` is **retired** and forwards here. The
2026-08-03 `fra_for_eng` Azure-voice purge deleted 31,310 rows *before* re-rendering and left ~2,000
course slots silent for two days (`docs/fra-audio-1608-forensics-2026-08-05.md`). That is why
make-before-break is doctrine: generate, verify, swap, and only then consider the old asset.

---

## 7. Known blocker — cache immutability

The learning app serves audio with `Cache-Control: immutable` and no revision in the URL. A device
that already played a damaged clip **keeps the damaged bytes**, however well the repair worked.

The fix exists: `ssi-learning-app` branch `feat/audio-revision-cache-bust-2026-08-05`
(`/api/audio/<id>?v=<rev>`). **As of 2026-08-06 it is NOT merged to `main`.** Until it ships, this
whole process stops at the database and does not reach a learner's ears on any device that has
already played the clip.

---

## 8. The commands

```bash
# 1. detect — free, no spend, no writes
node tools/audio-repair.cjs queue <course> --tails [--max-seed N] [--role R] \
     --concurrency 16 --limit 100000 --json docs/audio-repair-<date>/<course>-tails.json

# 2. cost — dry run, free
node tools/audio-repair.cjs propose <course> --targets <queue.json>

# 3. render — COSTS MONEY, needs a published plan first
node tools/audio-repair.cjs propose <course> --targets <queue.json> --spend

# 4. inspect one
node tools/audio-repair.cjs preview <course> --id <audioId>
node tools/audio-repair.cjs bytes   <course> --id <audioId> --out /tmp/live.mp3

# 5. swap — only after a human has listened
node tools/audio-repair.cjs accept <course> --from <propose-log> --dry
node tools/audio-repair.cjs accept <course> --from <propose-log> \
     --i-have-listened --actor tom --reason "<his words>"
```

Full CLI reference: `docs/audio-repair-cli-runbook-2026-08-05.md`.
