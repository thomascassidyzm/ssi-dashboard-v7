# Audio-defect findings — handover to Tom's audio QA tool

**2026-08-05 · Compiled for Tom · FINDINGS ONLY.** Nothing here recommends a re-render, a repair or
a regeneration. Kai has stood down on audio fixes; the manual investigation of 2026-08-03..05
becomes calibration data for the automated sampler.

Read this next to the tool. It carries four things: a **known-positive set** to calibrate against,
the **false-positive traps** that ate an earlier funnel, the **de-clicking gotcha** that makes
duration-based detection blind, and a **defect class no acoustic detector will ever catch**.

Every number below names the file it came from. Where a number is unverified, it says so — see
§7 GAPS, and note up front that `docs/adversarial-verification-2026-08-05.md` independently marks
several headline numbers **COULD-NOT-VERIFY** because the production database was unreachable from
that workspace (DNS `EAI_AGAIN` on `aws-1-eu-west-1.pooler.supabase.com`).

---

## 0. One correction to the brief, before anything else

The handover brief described the funnel as **733 raw detector hits → 425 after removing the ASCII
`\b` false-positive trap → ~20 high-confidence real defects confirmed by ear.**

Those three numbers are real and reproducible, but **they are not from an audio detector.** They
come from a **text** regex sweep over French contractions in `course_practice_phrases` —
`docs/exception-lego-leak-sweep-2026-08-04.md:72-75`:

> My first contraction pass reported `à+le → au` against *"je serai **là le** mois prochain"* —
> because JS `\b` is also ASCII-only, so it sees a boundary inside `là`. That pass produced **733
> hits, mostly false**. Rebuilt with `(?<![\p{L}\p{N}])` / `(?![\p{L}\p{N}])` under `/u`: **425
> hits, 20 high-confidence.**

The same figure is restated at `docs/fra-contraction-fixes-2026-08-05.md:25`. There was **no
"confirmed by ear" step** in that funnel — "high-confidence" there means grammatically adjudicated
text, not listened-to audio.

This matters for calibration: **do not use 733/425/20 as audio base rates.** The real measured
audio base rates are in §2, and they are different numbers with different denominators. The `\b`
lesson itself still transfers, and is worth carrying (§2.1) — it is a *tooling* lesson about
Unicode-unsafe regex, applicable to any filename/text/ID matching Tom's tool does.

---

## 1. The known-positive set — calibrate against these first

Tom's detector should find these before its output is trusted. They are split by evidence strength;
do not merge the tiers.

### 1.1 Tier A — amputation confirmed by two independent ASR models (8 clips)

Source: `docs/proving-run-2026-08-04.md`, per-clip table at lines 38-60, evidence grading at 66-96.
Clip list: `scripts/proving-run-cliplist.json` (**gitignored — not in the repo**, see GAPS).
Each clip was re-rendered 3× with identical text/voice/provider under `TAIL_REPAIR_MODE=flag`;
60/60 renders succeeded.

The shipped clip's transcript is **missing the final word of the phrase**, and the fresh render has
it, under **both** `ggml-small` and `ggml-medium`.

| clip | course/role/voice | text | words retained ship→fresh | trailing room ms | decay ms | chars/sec ship→fresh |
|---|---|---|---|---|---|---|
| `01bbd3cf` | fra target2/leo | le travail change et je suis enthousiaste pour ça | 0.778 → 1 | 100 → 30 | 50 → 150 | 22.2 → 16.6 |
| `03c44078` | deu target2/leo | in Italien während des Krieges | 0.6 → 1 | 100 → 60 | 20 → 210 | 26.5 → 16 |
| `237e9c72` | fra target2/leo | j'ai besoin de m'allonger dans le jardin aujourd'hui | 0.818 → 1 | 100 → 110 | 60 → 380 | 27.4 → 22 |
| `48d0cc60` | fra known/eve | I'm not sure if I can speak French today | 0.9 → 1 | 90 → 140 | 20 → 200 | 24.8 → 19.2 |
| `4f48fe73` | deu target2/leo | Ich will heute nicht üben | 0.6 → 1 | 100 → 100 | 30 → 120 | **49 → 18.9** |
| `53040b44` | deu target1/ara | es in den Garten stellen | 0.6 → 1 | 100 → 110 | 20 → 70 | 38.7 → 20.2 |
| `572d0bd5` | fra target2/leo | qu'est-ce qui | 0.75 → 1 | 90 → 80 | 50 → 40 | 33.3 → 25 |
| `83496603` | deu target1/ara | zu viel Zeit zum Antworten | 0.8 → 1 | 100 → 70 | 20 → 90 | 25.2 → 17.1 |

**`4f48fe73` is the cleanest single calibration case** (`docs/proving-run-2026-08-04.md:73-77`):
shipped transcribes as "Ich will heute…" in 0.73 s — **49 chars/sec, physically impossible at SSi
speech rates** — fresh transcribes as the full "Ich will heute nicht üben" at 18.9 c/s over 1.49 s.
Re-run by hand as a spot-check and reproduced exactly. If a detector misses this one, it is not
working.

**Caveat carried from source, not softened:** `572d0bd5` is a two-word fragment ("qu'est-ce qui");
shipped and two of three candidates transcribe as the idiomatic "Qu'est-ce qu'il y a ?", so whisper
autocompleting a fragment is at least as likely as a real recovery (`:88-91`). Chars/sec is
meaningless on a 13-character text.

### 1.2 Tier B — weaker positives, listed so they are not mistaken for Tier A

| clip | tier | why weaker | source |
|---|---|---|---|
| `7a5a5530` | medium | mid-phrase word recovered ("topped"→"talked"); the repair does not cut mid-phrase, so probably TTS variance | `proving-run-2026-08-04.md:83-86` |
| `0e4fac06` | weak | acoustic only — both arms transcribe perfectly; chosen on decay + rate | `:87-88` |
| `8c7a7a1e` | weak | acoustic only; decay 30→190 ms. **Not validated against ears.** | `:87-88` |

### 1.3 Tier A-negative — a known FALSE positive, equally valuable for calibration

| clip | what happened | source |
|---|---|---|
| `01577966` | deu known/eve, "I believe they said that is important". `ggml-small` heard "impossible" and scored the final word LOST; `ggml-medium` hears "important" in **both** arms. **Nothing is wrong with this clip.** | `proving-run-2026-08-04.md:33-36, 78-82` |
| `5de53ec9` | fra target1/eve. Retains only 0.714 of words — **and so does every fresh render, identically**. The miss reproduces without the repair, so it is a TTS/ASR problem, not amputation. | `:105` |

The `01577966` result is the most useful line in the whole proving run for Tom: **the original
amputation survey was itself built on `ggml-small`, so it carries a false-positive rate of exactly
this kind.** Any ASR-based ground truth needs a second, larger model before it counts as truth.

### 1.4 Confirmed audible clicks — 7 clips, from blind listening

Source: `docs/audio-tail-gate-decision-memo-2026-08-04.md:52-62`, harness
`docs/tail-click-listening-test.html`. 104 clips, blinded, judged by ear:

| bucket | n | audible click |
|---|---:|---:|
| clean (control) | 28 | **0** |
| `rise` | 24 | **0** |
| `burst` | 24 | 3 (12.5%) |
| `resurgence` | 28 | 4 (14.3%) |

**7 real clicks out of 76 flagged — bare-flag precision 9%** (`:64`). The clean control returning
0/28 is a genuine specificity result and is the closest thing in this investigation to the "~20
confirmed by ear" the brief expected.

**The individual clip IDs for these 7 are not stated in the committed markdown** — they are inside
`docs/tail-click-listening-test.html` (2.4 MB). See GAPS.

### 1.5 One confirmed truncation, hand-adjudicated (fra pilot)

`docs/audio-veracity-gate-2026-08-04.md:153-160`, over 250 live `fra_for_eng` clips:

| | result |
|---|---|
| raw agreement between the automated gate and the manual harness | **247/250 (98.8%)** |
| the one confirmed truncation — `"I'd like to guess"` → `"I'd like"` | **both flag it** (CER 0.53, 9 characters out) |
| the three flagged then adjudicated NOT defects — `"ce"`, `"vas"`, `"te"` | gate clears all three (1–3 characters out) |
| clips the gate flags that the humans cleared | **0** |

Against human-adjudicated ground truth: one real defect caught, zero false alarms.

---

## 2. False-positive lessons — what actually inflates a hit count

### 2.1 The ASCII `\b` / `\w` trap (carried from the text sweep — a tooling lesson)

Measured in `docs/exception-lego-leak-sweep-2026-08-04.md:56-77`. JS `\b` and `\w` are **ASCII-only**:

| raw | ASCII `\w` | Unicode `\p{L}` |
|---|---|---|
| `来年` | `""` | `来年` |
| `준비됐어요` | `""` | `준비됐어요` |
| `لا أُمانِعُ` | `""` | `لا أمانع` |

ASCII `\w` **zeroes 100% of CJK/Arabic**. `\b` sees a word boundary *inside* `là`, which is what
produced 733 mostly-false hits. Fixed with `(?<![\p{L}\p{N}])` / `(?![\p{L}\p{N}])` under `/u`
→ 425 hits, 20 high-confidence.

> "Anyone repeating this work should assume **every** ASCII-implicit regex construct is unsafe
> here, not just `\w`." — `:75-76`

Known cost of the fix, stated in source: `\p{L}` excludes combining marks, so Arabic harakat are
stripped (`أُمانِعُ` → `أمانع`) — that sweep **cannot see vowel-diacritic errors** in Arabic.

Relevance to an audio tool: any place the tool matches text, filenames, S3 keys, voice IDs or
course codes with a regex. It does not affect DSP.

### 2.2 The real audio base rates — measured over 7,209 clips

Source: `docs/audio-tail-gate-decision-memo-2026-08-04.md:22-30`, across `deu_for_eng` +
`fra_for_eng`:

| | count | share |
|---|---:|---:|
| clips the tail gate flags | 835 | 11.6% |
| clips that **audibly click** | ~77 | **1.1%** |
| clips that **audibly sound cut off** | ~3,244 | **45%** |

> "The defect being chased is **~42× rarer** than the defect being caused." — `:30`

**This is the single most important calibration fact in the document.** A tail/click detector run
naively over this estate has a ~9% precision floor and is chasing a 1.1% base rate, while a 45%
base-rate defect (abrupt endings) sits unaddressed next to it.

### 2.3 The detector was measuring trailing silence, not clicks

`docs/audio-tail-gate-decision-memo-2026-08-04.md:34-48`. Appending 300 ms of digital silence
cannot create or remove a click — it only changes how much room sits in the 400 ms analysis window
(`services/audio-processor.cjs:363`). Re-running the real detector on padded copies:

| rule | flagged bare | flag vanished on padding |
|---|---:|---:|
| rise | 24 | **23 (96%)** |
| burst | 24 | 19 (79%) |
| resurgence | 28 | 21 (75%) |
| **all** | **76** | **63 (83%)** |

Zero new flags appeared. `rise` at 96% is "effectively a trailing-room detector wearing a click
detector's name" (`:47-48`).

**Lesson for Tom: pad-then-detect as a control.** If a hit disappears when you append silence, the
hit was about analysis-window occupancy, not about the audio.

### 2.4 The gate fires on most *fresh* TTS output

**16 of 20 fresh renders trip the tail-defect detector** (`:50-51`) — untouched provider audio,
flagged as defective. A detector that flags 80% of brand-new output has no useful base rate.

### 2.5 CER on short text — the absolute edit floor

`docs/audio-veracity-gate-2026-08-04.md:169-186`. The first 12 live `deu_for_eng` clips the veracity
detector ever saw produced **7 "failures", all healthy**:

| expected | heard | CER | characters out |
|---|---|---:|---:|
| `mir` | `Mia.` | 0.33 | 1 |
| `er` | `Ja.` | 1.00 | 2 |
| `sie` | `Z.` | 1.00 | 3 |
| `Fehler` | `Fila.` | 0.67 | 3 |
| `verändert` | `verinnern.` | 0.33 | 3 |

CER is a ratio; on a two-character text the denominator is two, so any ASR near-miss looks
catastrophic. **Single-LEGO clips are everywhere in this estate.** The fix was a dual rule: wrong by
a large *fraction* **and** by at least **6 characters**. Recall stayed **flat at 97.6% across floors
0/2/3/4/5/6** — no real defect in the labelled set was a near-miss — and at 6 the last genuine false
alarm went too. After the floor: 60 live `deu_for_eng` clips, **0 failures, 0 unchecked**.

Final labelled-set performance: **97.6% recall (82/84), 0% false alarm (0/81)**
(`audio-veracity-gate-2026-08-04.md:108`), runtime **3.2 s/clip** at concurrency 4 on an 8-core box.

### 2.6 Two ASR traps that would manufacture false positives

Both from `docs/audio-veracity-gate-2026-08-04.md:110-120`:

- **`whisper-cli -nt` stdout DROPS segments that the `-oj` JSON carries.** Measured on a two-segment
  German clip: stdout gave `"Aber ich will nicht fertig sein,"`; JSON gave the whole sentence. *A
  gate reading stdout would manufacture a truncation false alarm on every multi-segment clip in the
  estate.* Read the JSON.
- **Whisper hallucinates on silence.** A near-silent Chinese clip decoded as `"字幕:J Chong"` — the
  signature subtitle-credit hallucination. A silence detector that trusts a transcript will call
  silence "speech".

---

## 3. The de-clicking gotcha — why duration-based detection is blind

**Kai's hypothesis, later supported: the repair silenced/removed the click without changing the
clip's length.** A duration check therefore sees nothing.

### 3.1 What the repair actually did

`docs/audio-tail-gate-decision-memo-2026-08-04.md:53-56`, describing `repairTailDefect`
(`services/audio-processor.cjs:649`), which ran **on every render**:

```
atrim=end=cutAt, areverse, afade=t=in:st=0:d=0.008, areverse, apad=pad_dur=0.1
```

Read that chain left to right: `atrim` **cuts audio off at `cutAt`**, an 8 ms fade is applied to the
new ending, and then `apad` **adds 100 ms of silence back on**.

> "A cut landing near the end **barely changes total length, so duration checks see nothing** — but
> the audio after `cutAt` is gone." — `:55-56`

So the mechanism is confirmed **from the filter chain itself**, not inferred: trim-then-pad is
length-preserving by construction. It is not that clicks were silenced in place — it is that speech
was **removed and backfilled with silence**, which is the same blindness with a worse outcome.

### 3.2 The three independent signatures that survived the length-blindness

Since duration was useless, the investigation found signals that were not (`:57-70`):

| signature | defective | control/natural | significance |
|---|---|---|---|
| speech span vs fresh render, same text+voice | median ratio **0.863** | **0.952** | Mann–Whitney **p = 0.0139** (English subset p = 0.031) |
| **decay steepness** — last loud frame → silence | **30 ms** | **80 ms** | **p = 0.0037** |
| **speech rate** — chars of text per second | **21.1 c/s** | **16.1 c/s** | **p = 0.0032** |

The steepest decay observed is **10 ms — which is the 8 ms `afade` in the filter chain above.**
That is the repair's own fingerprint showing up in the acoustics.

Worst case found: *"I'm trying to practise"* in **702 ms (31 c/s)**, containing two energy humps
where the phrase needs four words.

**Combined marker (fast AND steep): 79% precision, 68% recall, p = 0.00028** — language-independent,
needs no listening (`:70-71`). German median 0.68, n=7, is directional only.

### 3.3 What a detector is blind to, and what still sees it

| signal | sees a repaired clip? | why |
|---|---|---|
| duration / total length | **NO** | trim-then-pad is length-preserving by construction (§3.1) |
| file size | **NO** | same reason; padded silence compresses but length is restored |
| word-presence ASR (the veracity gate) | **only above ~800 ms of loss** | see the dose-response below |
| terminal RMS vs body RMS | **YES** | `tools/physical-tail-probe.cjs` |
| decay steepness | **YES** | 30 ms vs 80 ms, p = 0.0037 |
| speech rate (chars/sec) | **YES** | 21.1 vs 16.1, p = 0.0032 |

**The dose-response curve** — synthetic tail amputation on 12 healthy clips, read-only on copies via
`scripts/veracity-validate/tail-probe.cjs` (`audio-veracity-gate-2026-08-04.md:192-204`):

| tail removed | flagged by the veracity gate |
|---|---:|
| 150 ms | **0 / 12** |
| 300 ms | **0 / 12** |
| 500 ms | 5 / 12 |
| 800 ms | **12 / 12** |

> "**Yes for a lost final word, no for a clipped tail.** … One that shaves ≤300 ms — an
> abrupt-sounding cut-off that still contains all the words — is invisible to this gate, and always
> will be: **the gate asks whether the words are there, not whether the ending sounds right.**"

If the 45% "ends abruptly" population is mostly the ≤300 ms kind, **a word-presence gate does not
cover it at all.**

### 3.4 Prior art Tom should look at before writing his own tail check

**`tools/physical-tail-probe.cjs`** (commit `cf7bb21d`, 2026-08-05) is a working implementation of
the tail-shape test, deliberately independent of any ASR/veracity decoder.

> ⚠️ **It is not on `main`.** `cf7bb21d` exists only on `fix/audio-finish-the-job-2026-08-05`
> (and its `origin/` copy). `git cat-file -e origin/main:tools/physical-tail-probe.cjs` fails.
> Read it with `git show cf7bb21d:tools/physical-tail-probe.cjs`.

- fetches the real S3 object, decodes with `ffprobe`, measures `tailRms` over the final 50 ms
  (`--tail-ms`, default 50) against whole-clip `bodyRms`;
- reports `tailRatioDb = 20*log10(tailRms/bodyRms)`; verdict is `ABRUPT_CUT` when
  `tailRatioDb >= CUT_DB` (**`--cut-db`, default −6 dB**), else `natural_decay`. A natural ending
  decays well below body level; an abrupt cut leaves speech energy running to the last sample, so
  the ratio approaches or exceeds 0 dB;
- **deterministic stride sampler, not random** — a re-run probes the same clips, so numbers in a
  report reproduce.

Its own stated scope limit, from the commit message: *"this is a TAIL-SHAPE test. It catches a clip
that stops mid-signal. It does NOT catch a clip missing a word that happens to end on a decayed
boundary, and it says nothing about pronunciation. Corroborating evidence for the acoustic decoder,
never a replacement."*

### 3.5 What was explicitly NOT claimed — carried over unsoftened

From `docs/audio-tail-gate-decision-memo-2026-08-04.md:96-114`:

- **No per-clip repair record exists.** The mechanism is shown to damage audio; **no specific
  shipped clip can be proven to have been repaired.**
- The 100 ms trailing-room fingerprint is suggestive, not proof — and it **failed** as a predictor of
  the audible defect (**45.8% vs 44.0%, p = 1.00**).
- **The 45% figure rests on one listener judging 49 English clips** (`docs/english-cutoff-test.html`,
  22/49). Good enough to act on, not good enough to quote precisely.
- Foreign-language judgements are weaker: cut-off rates English 6.7%, French 19%, German 50% in the
  mixed test — the judge is not a French or German speaker and said so. The English-only rerun exists
  because of that.
- **Two hypotheses were tested and killed:** "raise the pad constant" (padding changed **0 of 48**
  paired verdicts), and "the 100 ms fingerprint predicts the audible defect".
- **Whisper does not solve this.** `verifyTrimKeepsText` only checks that the *text* survived; a clip
  can retain every word and still end abruptly.
- **The direct before/after experiment returned nothing usable** — running the real `repairTailDefect`
  over 12 healthy `deu_for_eng` clips detected no defect on any of them, so there was no repair to
  score. Consistent with the 11.6% flag rate on a 12-clip sample, but **the before/after measurement
  was not obtained.** Only the synthetic curve in §3.3 is evidence.

### 3.6 `TAIL_REPAIR_MODE` — three modes, and which was live when

The mode determines whether the length-preserving damage above was still happening. Commit trail:

| commit | change |
|---|---|
| `d5ad9f2c` | `TAIL_REPAIR_MODE=flag` — stop `repairTailDefect` mutating audio |
| `4c5bbf90` | default changed to `flag`, "so the fix travels with the code" |
| `30e59aa1` | `TAIL_REPAIR_MODE=pad` — padded re-check before shipping a tail flag untouched |
| `c5370bc6` | decision record: "the pad is a **probe**, not a repair" |
| `b4831755` | prove which `repairTailDefect` branch is live, before spending |
| `03f4ccd6`, `db3335fd` | expose `tail_repair_mode` on `/health` — read it through the public door |
| `d90f1ba3` | repo systemd units carry `TAIL_REPAIR_MODE=flag`, as installed |
| `cf7bb21d` | physical tail probe — file evidence independent of the decoder |

**The amputation counts (449 / 1,107 / 282 / 376) are contested — do not quote them as established.**
`docs/f7c28028` (`docs/deu-audio-repair-plan-2026-08-04.md` and the commit "the approved scope was
already spent, and 449 renders were amputated") asserts 449 of 1,107 German repair renders were
amputated. `docs/adversarial-verification-2026-08-05.md:59-76` searched for a retained run log
containing those branch-event counts and **found none**, verdict **COULD-NOT-VERIFY**:

> "The source does establish a **material risk, not the alleged outcome**: `services/audio-processor.cjs`
> defaults `TAIL_REPAIR_MODE` to `repair`, and its own comments say a host without Whisper can
> silently bypass the text-retention guard. That is source-code evidence of a hazardous path, not
> evidence that 449 production files took it."

It also notes the unexplained remainder **1,107 − 449 − 282 = 376**. A later commit `f1a718b2`
claims to close that 376 ("351 renders the detector never fired on, plus 25 never re-rendered") —
**that closure is itself unverified against a run log.**

⚠️ **Version-state warning for anyone reading the code:** `services/audio-processor.cjs` has
**uncommitted working-tree modifications** on branch `fix/audio-finish-the-job-2026-08-05` as of
2026-08-05. The adversarial verifier read a state where the default was `repair`; commit `4c5bbf90`
sets it to `flag`. **Check `git status` and read `/api/audio/health` (`03f4ccd6`) before trusting any
statement about which branch is live on watson-1.**

---

## 4. Voice-assignment defects — the blind spot

**This is a defect class a spectral / click / duration / RMS detector will NEVER catch.** The audio
is clean, correctly rendered, full-length, natural decay. It is simply **the wrong voice**.

The voice IDs in the brief are real. Stored `voice_id` values are bare names — `eve`, `leo`, `ara` —
because of a legacy write path, while the provider comes from each course's `voice_config`
(`docs/proving-run-2026-08-04.md:17-21`).

### 4.1 `deu_for_eng` — 129 clips, the mechanism

Source: `docs/audio-repair-2026-08-04/deu_for_eng-revoice-complete.md`.

Configured `voice_config` (verified live, unchanged since 2026-01): known=`eve` / target1=`ara` /
target2=`leo` / presentation=`eve`, all xAI.

**80 English `known` clips were narrated by a German voice.** The cause was systematic, not random:
the pod builder **inherited the known-side voice from whichever character voice the *target* line
used**, instead of taking it from `voice_config`. The mapping was mechanical and total:

| pod target voice | known narration got | rows |
|---|---|---:|
| `41321eb41295`, `40f31906b23d` | `leo` (German target2) | 58 |
| `458705c07139` | `bedd6226` | 19 |
| `3a7889066fa2`, `ara`, `eve` | `eve` ✅ correct | 72 |

A learner heard **the German male voice read the English prompt**, in exactly the pods cast with
those two speakers.

What was corrected (129 clips, 0 failures, ~3.9k characters of TTS):

| group | n | action |
|---|---:|---|
| `known` on `leo` / `bedd6226` / `gfzdpspr5fdp` | 80 | → `eve` (61 rendered, 19 merged) |
| `presentation` on `xai_gfzdpspr5fdp` | 35 | → `eve` (4 rendered, 31 merged) |
| `target2` on `azure_de-DE-ConradNeural` | 11 | → `leo` |
| `target1` on `azure_de-DE-KatjaNeural` | 1 | → `ara` |

### 4.2 `fra_for_eng` — 150 clips, the same bug never swept in French

Commits `6a993da4` ("the German voice bug was never swept in French — 150 clips") and `27be3779`.
Record: `docs/overnight-audio-2026-08-05/fra-wrong-known-voice-2026-08-05.md`.

**Complete at 03:03Z: 150 of 150 — 142 re-voiced, 8 merged, 0 failed.** 5,721 characters of TTS
across four runs. xAI health: 142 responses, 0 empty, 0 cooldowns. Verified live afterwards:

| check | result |
|---|---|
| any `known`/`presentation`/bookend clip still off the configured voice | **0** — the selection query returns an empty set |
| dangling pod array slots | **118, unchanged** — nothing was stranded |
| `listening_pod_sentences` with a `known_audio_id` | 68, unchanged — no link nulled |

⚠️ `docs/adversarial-verification-2026-08-05.md:11-27` marks the 150/142/0 claim **COULD-NOT-VERIFY**
— the verifier could not reach the database to re-run the voice-selection query. The claim rests on
the run's own record.

### 4.3 How this class is actually detected

**Not by ear at scale, and not acoustically.** Kai *heard* the first instance; the sweep that found
all of them was a **database query**: compare each row's `voice_id`/`origin` against the course's
`voice_config` for that `role`. That is a metadata join, and it is cheap, exact, and complete —
which is precisely why an acoustic tool should not try to own this class.

**Do not "fix" multi-speaker pods.** `deu_for_eng:pod-0` legitimately runs six distinct target
voices mapped 1:1 to the `speaker` column (Barista=`eve`, Waiter/Guest/Friend=`41321eb41295`,
Narrator/Sarah=`458705c07139`, Customer=`3a7889066fa2`, Customer 2=`ara`). Re-voicing them to a
single configured voice would collapse a dialogue into one speaker and destroy the pod. A naive
"voice ≠ voice_config ⇒ defect" rule **would flag all of these as defects.** The exclusion list is
in `deu_for_eng-revoice-complete.md` under "What was deliberately LEFT".

### 4.4 A third, separately detectable class: MISSING

**118 French pod slots point at audio that no longer exists** (`865b319b`). This is neither an
acoustic defect nor a voice defect — it is a **dangling reference**: a pod array slot naming an
audio ID with no live `course_audio` row. It is detectable only by a referential-integrity check,
and it is now a first-class state in the preview page (`37db0eb3`, merged `d1cf2e1b`).

---

## 5. The verification harness — point the tool's hits at human ears

**Live: https://ssi-dashboard-v7.vercel.app/audio-preview** — verified responding `HTTP/2 200` on
2026-08-05 11:36Z.

| what | where |
|---|---|
| API router | `services/audio-preview-router.cjs` (269 lines, `ad4da47a`) |
| MISSING-state resolver | `services/audio-preview-missing.cjs` + `.test.cjs` (`37db0eb3`) |
| mounted at | `services/production-api.cjs` → `app.use('/api/production/:courseCode/audio-preview', …)` |
| page | `src/views/production/AudioPreview.vue` (418 lines, `65941554`) |
| clip component | `src/views/production/components/AudioPreviewClip.vue` |
| missing component | `src/views/production/components/AudioPreviewMissing.vue` |
| tests | `src/views/production/AudioPreview.test.js` |

**It is genuinely read-only**: four `GET` routes, and `grep -nE "insert|update|delete|upsert"` over
the router returns **nothing**.

| route | parameters |
|---|---|
| `GET /clips` | `?filter=recent\|gated\|all` `&role` `&limit` (default 50, max 200) `&offset` |
| `GET /sample` | `?filter` `&role` `&n` (default 20, capped) |
| `GET /quarantine` | gate failures read from the veracity quarantine JSONL — these clips are **not** in `course_audio` |
| `GET /missing` | pod slots referencing audio with no live `course_audio` row (§4.4) |

Course scoping is enforced by the app-level `app.param('courseCode')` auth gate; the router
deliberately does not declare `:courseCode` itself.

### Two limits Tom should know before planning to use it

1. **There is no caller-supplied ID-list parameter.** Selection is by `courseCode` + `filter` + `role`
   + `limit`/`offset`/`n` only. **Tom cannot currently point this page at an arbitrary list of his
   detector's hits** without adding an `?ids=` filter to `/clips`. That is a small change to
   `applyFilter` / the `/clips` handler, but it does not exist today.
2. **No verdict is persisted.** From `AudioPreview.vue:178-180`: *"verdict is persisted anywhere
   (verified against the live schema … never a verdict lookup, and nothing on the page claims a clip
   'passed'."* and `:87` — *"No per-clip verdict is stored, so this is rendered under the gate —
   checked-and-passed"*. **Listening is ephemeral.** A calibration session on this page produces no
   in-repo artefact unless the listener writes one by hand — which is exactly what
   `docs/*-listening-test.html` are.

The standalone listening pages are the other harness, and they *do* embed their clip lists:
`docs/tail-click-listening-test.html` (2.4 MB), `docs/cutoff-listening-test.html` (2.2 MB),
`docs/english-cutoff-test.html` (1.5 MB), `docs/proving-run-listening-test.html` (706 KB).
Design notes worth copying from `proving-run-2026-08-04.md:141-152`: arms shuffled per pair, and the
**target text hidden behind a per-item toggle** — "with the text on screen the listener runs a word
checklist, which just re-measures what whisper already measured. Judge by ear first."

---

## 6. Summary table — defect classes and which detector sees them

| class | base rate measured | acoustic detector? | best signal |
|---|---|---|---|
| audible click | **1.1%** of 7,209 | yes, but 9% precision bare | burst/resurgence rules, padded control |
| ends abruptly (≤300 ms) | **~45%** of 7,209 (one listener, 49 clips) | yes | decay steepness + chars/sec, 79% precision |
| lost final word (≥800 ms) | 9 of 20 on a selected list, 1 withdrawn | **no** — needs ASR | word-presence gate, 97.6% recall |
| repaired/amputated clip | **unquantified** — no per-clip repair record | **duration: NO**; tail RMS: yes | `tools/physical-tail-probe.cjs` |
| wrong voice | 129 deu + 150 fra | **NEVER** | DB join on `voice_config` |
| MISSING (dangling ref) | 118 fra pod slots | **NEVER** | referential-integrity check |

---

## 7. GAPS — things I could not find or could not verify

Stated explicitly rather than papered over.

1. **The brief's 733→425→20 funnel is not an audio funnel.** It is a text contraction sweep, and it
   contained no listening step. See §0. This is a correction, not a gap, but it changes what
   "calibration data" means here.
2. **`scripts/` is gitignored repo-wide**, so several primary artefacts are **not in this repo**:
   `scripts/proving-run-cliplist.json` (the 20-clip list), `scripts/tail-causation-test.cjs`,
   `scripts/decay-steepness.cjs`, `scripts/envelope-dump.cjs`, `scripts/amputation-tts-probe.cjs`,
   `scripts/veracity-validate/replay.cjs`, `scripts/veracity-validate/tail-probe.cjs`,
   `scripts/proving-run-medium-check.cjs`. The measured *numbers* survive in `docs/`; the *code that
   produced them* does not. Anyone re-running these must reconstruct the scripts or recover them from
   the machine they ran on. (`docs/proving-run-2026-08-04.md:5-8` says so directly.)
3. **The 7 confirmed-audible-click clip IDs are not in any committed markdown.** They are inside
   `docs/tail-click-listening-test.html` (2.4 MB). I did not extract them; the bucket counts in §1.4
   are what the committed prose states.
4. **No per-clip repair record exists anywhere.** No shipped clip can be proven to have been repaired
   (§3.5). Any "these clips were damaged" list is inference from acoustic markers.
5. **`docs/adversarial-verification-2026-08-05.md` could not verify four headline claims** — the 150
   French re-voices, the 26 re-rendered French clips + the 10.5% truncation rate, the 449/1,107
   amputations, and the 5 contraction fixes — because `aws-1-eu-west-1.pooler.supabase.com` failed DNS
   (`EAI_AGAIN`) and `psql` was absent. I have **carried those verdicts forward rather than
   overriding them**. I did not re-attempt a live database read: this handover was scoped read-only
   and DB access was not part of it.
6. **The 10.5% French base rate is cited in commit `7192c5c6`** ("the control sample nobody ran —
   French base rate is 10.5%, not 'clean'") but the adversarial verifier could neither reproduce it
   nor reconcile it with the earlier "4 clips" figure — *"I could not establish that they used the
   same population, detector, or denominator."* Treat 10.5% as **unreconciled**.
7. **`services/audio-processor.cjs` has uncommitted working-tree changes** on
   `fix/audio-finish-the-job-2026-08-05`. Statements in older docs about the `TAIL_REPAIR_MODE`
   default describe a state that has since moved (§3.6). Read `/api/audio/health` for the live value.
8. **I did not verify any of this against live audio or the live database** — no clip was fetched, no
   S3 object decoded, no query run. This is a synthesis of committed evidence, and its reliability is
   bounded by the reliability of that evidence, which §7.4–7.6 partly limits.
9. **Fan-out failure, disclosed:** I dispatched three worker sessions (`audio-known-positives`,
   `audio-declick-gotcha`, `audio-voice-and-preview`) via the command-surface API at 11:31Z. All three
   returned job IDs but **never registered as jobs** and produced no reports. I compiled the whole
   document first-hand instead. Nothing in it comes from a worker.

---

## 8. Source index — and where each file physically lives

> 🚨 **Read this column before you go looking.** **None of the primary sources are on `main`.**
> The three most-cited documents and **all four listening-test HTMLs are untracked working-tree
> files** — they exist only in the `ssi-dashboard-v7-clean` checkout on this machine, in no commit,
> on no branch, on no remote. If that working tree is cleaned or the machine is lost, **the evidence
> behind most of the numbers in this handover is gone.** Verified 2026-08-05 with
> `git log --all -- <path>` returning nothing for each.

| file | what it carries | where it lives |
|---|---|---|
| `docs/audio-tail-gate-decision-memo-2026-08-04.md` | the 7,209-clip base rates, padding experiment, decay/rate markers, what was NOT claimed | **UNTRACKED — working tree only** |
| `docs/proving-run-2026-08-04.md` | 20-clip re-render, per-clip table, evidence tiers, the withdrawn positive | **UNTRACKED — working tree only** |
| `docs/adversarial-verification-2026-08-05.md` | independent COULD-NOT-VERIFY verdicts on four headline claims | **UNTRACKED — working tree only** |
| `docs/tail-click-listening-test.html` (2.4 MB) | blind click test, 104 clips — holds the 7 confirmed-click IDs | **UNTRACKED — working tree only** |
| `docs/cutoff-listening-test.html` (2.2 MB) | paired padding test | **UNTRACKED — working tree only** |
| `docs/english-cutoff-test.html` (1.5 MB) | English-only cut-off test, 22/49 | **UNTRACKED — working tree only** |
| `docs/proving-run-listening-test.html` (706 KB) | 12-pair blind A/B, arms shuffled | **UNTRACKED — working tree only** |
| `docs/exception-lego-leak-sweep-2026-08-04.md` | the 733/425/20 funnel and the ASCII `\b`/`\w` trap | committed, **local branch only — not pushed to origin** |
| `docs/deu-audio-repair-plan-2026-08-04.md` | German repair scope and the amputation claim | committed, **local branch only — not pushed** |
| `docs/audio-veracity-gate-2026-08-04.md` | gate design, 97.6%/0%, edit floor, whisper traps, dose-response | `origin/docs/audio-veracity-estate-sweep-2026-08-05`, `origin/docs/fra-audio-repair-2026-08-05` |
| `docs/audio-repair-2026-08-04/deu_for_eng-revoice-complete.md` | German wrong-voice mechanism + deliberate-casting exclusion list | `origin/fix/8-course-silent-clip-repair` |
| `docs/overnight-audio-2026-08-05/fra-wrong-known-voice-2026-08-05.md` | French 150/150 re-voice record | `origin/fix/audio-finish-the-job-2026-08-05`, `origin/fix/fra-contraction-leaks-2026-08-05` |
| `docs/introductions-audio-coverage-2026-08-05.md` | per-language/per-role introduction coverage | same two branches |
| `docs/fra-contraction-fixes-2026-08-05.md` | restates the 733/425/20 funnel | same two branches |
| `tools/physical-tail-probe.cjs` | working tail-shape probe: RMS(final 50 ms) vs body RMS, `CUT_DB` −6 | **`fix/audio-finish-the-job-2026-08-05` only — not on `main`** |
| `services/audio-preview-router.cjs`, `src/views/production/AudioPreview.vue` | the read-only listening harness | **on `main`** (`d1cf2e1b`) |
