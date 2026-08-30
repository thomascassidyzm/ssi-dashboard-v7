# English rendered once per distinct text — done, verified, relinked

**13 Aug 2026. APPLIED.** Tom approved this on 2026-08-13: 670 distinct English render units
at Tom's clone + Olivia, per [the recount](https://watson-1.tail4968cb.ts.net/d/fefc8e10) and
[the sample-pack listen](https://watson-1.tail4968cb.ts.net/d/b44f9a8d).

**620 clips rendered. 620 verified alive on the right voice. 15,097 slots relinked across 55
courses, zero drift. $0.80. Aran's Welsh recordings untouched — and found to be broken already.**

---

## The headline

| | |
|---|---:|
| Distinct English clips **rendered** | **620** |
| Verified alive, right voice, decodable, not truncated | **620 / 620** |
| Bytes of new audio, measured on the objects | **39,189,312** |
| Reuse-credited clips swept for liveness | **440 / 440 alive** (17,926,956 bytes) |
| **Slots relinked onto shared clips** | **15,097** across **55 courses** |
| Relink drift (before-state moved under us) | **0** |
| Slots already on the right cast voice — left untouched | **1,796** |
| Welsh human recordings touched | **0 of 23** |
| Characters rendered | 53,383 |
| **Cost** | **$0.80** |

The recount predicted $0.81. It came in at $0.80.

---

## 1. Re-verified live before a penny was spent

State had moved a little since the recount, so every number was recomputed against the live DB
first (`tools/eng-distinct-render/recount.cjs`, `analyse.cjs`), using the recount's own scope,
identity key and speaker resolution.

| | recount, 12h earlier | live, before rendering |
|---|---:|---:|
| pod-0 English slots | 17,510 | **17,510** |
| courses | 60 | **60** |
| distinct English lines | 970 | **971** |
| render units (line × voice) | 1,110 | **1,112** |
| already on-cast — reusable | 440 | **440** |
| **needing render** | 670 | **672** |
| Welsh human recordings | 23 | **23** |

Two things moved in our favour. The recount reported **63 slots with an unresolvable speaker**
as a gap; live, that is **12**, and all 12 are inside courses this pass excludes anyway — so the
gap closed to **zero** in the working scope. And the recount's gap #3, *"liveness is sampled,
not exhaustive — 40 of 440 HEADed"*, was closed properly: **all 440 reuse-credited clips were
fetched, 440/440 alive**, 17.9 MB. No paper credit anywhere in this pass.

---

## 2. One scope narrowing, made deliberately: 655 renders, not 672

**17 of the 672 units are English lines that only the two Welsh courses use.** Rendering them
means synthesising English into a human-voiced course, which is the same ruling (Tom, 2026-07-25)
that makes `tts-service` refuse `cym_*` at its chokepoint, and every prior pod-0 pass excluded
`cym_*` for exactly that reason.

So `cym_n_for_eng` / `cym_s_for_eng` were excluded **entirely**: the 23 human recordings untouched,
and their other **439 empty English slots left empty** rather than filled with TTS. That is 17
renders and 462 relinks not done, deliberately. If those 439 slots should be filled, it is 17 more
renders and about two pence — but it is a ruling, not a cost question.

---

## 3. Make-before-break, step by step

The doctrine is `CLAUDE.md` §approval gates: generate → verify → swap → only then supersede.
Nothing in this pass deletes or overwrites anything. `render.cjs` only ever **inserts**;
`relink.cjs` only ever **moves a pointer**. Every old clip and every old S3 object is still
exactly where it was, so the whole pass replays backwards from its own log.

**Step 1 — generate.** The estate's own path, not a reimplementation: `generateWithRetry` →
`phase8.masterAudio` → `veracity.renderChecked` → S3 `PutObject` → `course_audio` insert, the
same order and the same pre-publish gate as phase8's batch path. A 3-clip shakedown ran and was
fully verified before the other 652 were queued.

**Step 2 — verify, four independent checks per clip** (`verify.cjs`):

| check | method | result |
|---|---|---:|
| alive | real bytes fetched from the bucket, per object | **620 / 620** |
| correct voice | **`voice_id`**, not pitch | **620 / 620** |
| decodable | ffprobe actually decodes it | **620 / 620** |
| not truncated | chars-per-second outlier vs this run's own distribution | **0 outliers** |

The voice check is `voice_id` deliberately. The 2026-08-13 pod-0 fill verification established
that the clone and Olivia f0 bands **overlap at 148–176 Hz**, so pitch alone has an ambiguity zone
and cannot decide a borderline clip — while the substitution that actually happens, an Azure
fallback, records an Azure voice id and is caught with no ambiguity at all.

Speech-rate distribution, for the record: clone median **15.88** cps, p95 18.74, max 21.24
(n=484); Olivia median **16.73**, p95 20.24, max 20.54 (n=136). The worst clip in the run sits at
1.34× its voice's median, well inside the 1.6× flag. Nothing was cut short.

**Step 3 — relink** (`relink.cjs`), and only onto clips already proved alive. The before-state is
asserted **inside the UPDATE** — a row is written only if its current value is still the one the
plan was built from — so a row that moved under us would simply not update and would report as
drift rather than being silently overwritten.

**15,097 slots written, 0 drift, of 15,097 planned.** 2,195 onto newly rendered clips, 12,902 onto
reuse-credited ones; 12,985 known-side, 2,112 target-side; 55 courses.

What they were on before: 4,524 had **no clip at all**, 3,812 Leo, 3,554 Sonia, 1,048 Libby, 528
Ryan, 512 Hollie, 368 Eve, 32 Thomas, 9 Alfie, and 710 that were on a cast voice but the **wrong
gender** for their speaker.

---

## 4. Every one of the 17,510 slots, reconciled

Re-running the audit after the fact reconciles exactly, with no unexplained residue:

| | slots |
|---|---:|
| **on the right cast voice** | **16,893** |
| Welsh — empty, deliberately left empty (§2) | 439 |
| Welsh — Aran's human recordings, untouched | 23 |
| veracity-quarantined units, kept their existing clips (§5) | 104 |
| slot has no English text at all | 39 |
| `zzz_test_*` course, excluded | 12 |
| **total** | **17,510** |

"On the right cast voice" went **1,796 → 16,893**, which is exactly +15,097 — the relink count,
to the row.

The **1,796** slots that were already on the right cast voice were **left untouched**, as
specified. Repointing them at the shared row would change the uuid a learner's cache keys on for
zero audible gain.

---

## 5. NEEDS YOU — the veracity gate has a numeral hole, and it is costing real clips

**35 clips were quarantined by the pre-publish veracity gate. All 35 are the checker being wrong,
not the audio.** Whisper transcribes spelled-out numbers as numerals, so CER explodes against text
that spells them out:

| the text | what Whisper heard | CER |
|---|---|---:|
| "That's forty-eight pounds altogether." | "That's £48 altogether." | 0.50 |
| "Here we are. That's twelve thousand and five hundred króna." | "Here we are. That's 12,500 kroner." | 0.58 |
| "That's three hundred and twenty hryvnias altogether." | "That's 320 Hryvnias altogether." | 0.47 |
| "Lovely. The room is on the third floor, room seven hundred and nine." | "Lovely. The room is on the third floor, room 709." | 0.34 |
| "Here we are. That's twelve pound fifty." | "Here we are. That's £12.50." | 0.46 |

The clips say **exactly the right words**. Classified mechanically, **35 of 35** are "decode
contains digits, text contains none" — not one genuinely defective clip in the set. This is the
same class as `d951ddae`, *"the last-word rule asked how a word is SPELT, not whether it was
said"*, and it will keep biting every price, room number and time line in the estate.

**Nothing was forced past the gate.** The gate refusing a clip is signal, not an obstacle. Those
35 units cover **104 slots**, which simply kept their existing clips — nothing regressed.

**My recommendation: (a)** teach the gate numeral↔words equivalence before comparing, then
re-render those 35 (about a penny). **(b)** leave them as they are. **(c)** you listen to the 35
quarantined files first — they are on disk at
`scripts/audio-veracity-quarantine/`. The only one I would want an ear on regardless is
`"Here we are. That's twelve złoty fifty groszy."`, heard as *"that's 12's Wattie 50 Grushy"* —
Whisper mangling a Polish word, but worth a listen.

---

## 6. NEEDS YOU — Aran's 23 Welsh recordings have no audio behind them

This pass did not touch them, and while proving that, it found something worse.

**All 23 "human recordings" that every pod-0 pass has carefully protected are 834-byte,
undecodable stubs in the bucket.** Not one of them plays. Every one is exactly 834 bytes,
`ffprobe` reports *"Failed to find two consecutive MPEG audio frames"*, and they are identical in
size — so this is one bad write event, not decay.

**This is pre-existing and not caused by this run**, and the proof is three-way:

- the `course_audio` rows were created **2026-06-15**, two months ago;
- the pod sentence rows were last updated **2026-08-11**, two days before this run;
- the applied relink log contains **0 rows for any `cym_*` course** out of 15,097.

The rows are all still `voice_id=human_aran_cym_n`, `origin=human`, 23 distinct clips — the
metadata is intact and correct. It is the audio that is missing. So the Welsh courses' pod-0
English track is **entirely silent today**: 439 slots empty and 23 pointing at stubs.

I have deliberately done nothing about it. Human-voice rows are precious by rule, the courses
refuse TTS by rule, and re-recording is Aran's, not a script's. **This wants a decision: is the
master audio recoverable from somewhere, or does Aran need to re-record?**

---

## 7. Reproducing any of this

Every number above comes from a committed tool, all read-only except `render.cjs` (inserts only)
and `relink.cjs --apply` (moves pointers only):

| tool | what it does |
|---|---|
| `tools/eng-distinct-render/recount.cjs` | live scope, the recount's own queries |
| `analyse.cjs` | speaker → gender → cast voice, render units, reuse credit |
| `plan.cjs` | one text and one owning course per unit |
| `render.cjs` | the render, resumable, gated, checkpointed to `render-log.jsonl` |
| `verify.cjs` | the four per-clip checks → `verify-results.json` |
| `sweep-reused.cjs` | exhaustive liveness of the 440 → `reused-liveness.json` |
| `relink.cjs` | dry run by default; `--apply` → `relink-applied-log.json` |
| `served-check.cjs` | the real serving path, below |

### The served spot-check — what a learner is actually handed

Row counts prove nothing about serving, so 20 relinked slots spread across 20 courses were driven
through the real path: the pod detail route the app itself calls, then the app's own versioned
player URL.

**20 / 20 serve the new shared clip.** Every one: the API returns the new clip id in its
`known_audio_id` / `target_audio_id`, and the player URL returns **200, `audio/mpeg`, real bytes**
— 18 KB to 170 KB, measured as bytes that actually arrived, not as a `Content-Length` promise.

Sample of the evidence, one line per course:

```
OK ara_eg_for_eng/pod-0  known_audio_id  api=true player=200  34,272b  gfzdpspr5fdp
OK ara_sy_for_eng/pod-0  known_audio_id  api=true player=200  33,696b  xai_bedd6226
OK dan_for_eng/pod-0     known_audio_id  api=true player=200 170,496b  bedd6226
OK deu_for_eng/pod-0     known_audio_id  api=true player=200  30,240b  gfzdpspr5fdp
OK eng_for_fra/pod-0     target_audio_id api=true player=200  65,088b  bedd6226
OK eng_for_por/pod-0     target_audio_id api=true player=200  42,336b  xai_gfzdpspr5fdp
```

One methodology note, because it nearly produced a false alarm: the player route answers **HEAD
with 405**, so a HEAD probe reports every clip in the estate as broken. The check uses GET and
curl's own `%{size_download}`. It was that false alarm on the Welsh clips that led to §6 — where
a GET then showed the 834-byte stubs are real.

---

## 8. Gaps, stated rather than papered over

1. **35 units (104 slots) are unrendered** because the veracity gate quarantined them on the
   numeral artefact. They kept their existing clips. §5 is the decision.
2. **439 Welsh English slots are still empty and 23 point at stubs.** §2 and §6.
3. **39 pod-0 slots have no English text at all** — nothing to render, nothing to link. They want
   a look from whoever owns pod content; a render run cannot invent a line.
4. **12 slots have an unresolvable speaker**, all inside the excluded `cym_*`/`zzz_test_*` courses.
5. **"Verified" here means alive, right voice, decodable, full-length, and veracity-passed. It
   does not mean anyone has listened.** 620 clips went out on the gate's word plus four mechanical
   checks. The sample pack Tom listened to was drawn from the *reused* pool, so his ear has been
   on that half; the 620 new ones are unheard.
6. **Course content is untouched.** This pass is pod-0 only. The estate-wide English course-content
   build the recount costed at $242 is not started and is not approved.
