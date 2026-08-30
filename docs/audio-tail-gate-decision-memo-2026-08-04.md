# Decision memo — the tail-click gate is damaging more audio than it repairs

**2026-08-04 · For Tom · Raised by Kai · Nothing has been changed. This memo asks for a decision.**

All findings below are measured, not inferred. Every number is reproducible from scripts in
`scripts/` (gitignored) and the listening artefacts in `docs/`. Where a claim is weak, it says so.

---

## The ask, in one paragraph

`repairTailDefect` (`services/audio-processor.cjs:649`) automatically trims and re-pads any clip
its detector flags, on every render. We now have measurements saying the detector is wrong ~91% of
the time, fires on ~70% of *brand-new* TTS output, and that its repairs are the likely cause of a
widespread "clip ends abruptly" defect. **We propose it stops modifying audio and becomes
flag-only, with a human reviewing a much smaller, higher-precision queue.** That is a change to the
live render path plus a re-render of damaged clips, so it needs your call.

---

## The trade, measured

Measured across **7,209 clips** in `deu_for_eng` + `fra_for_eng`:

| | count | share |
|---|---:|---:|
| clips the gate flags | 835 | 11.6% |
| clips that **audibly click** | ~77 | **1.1%** |
| clips that **audibly sound cut off** | ~3,244 | **45%** |

**The defect being chased is ~42× rarer than the defect being caused.**

---

## Evidence chain — each link measured independently

**1. The detector is mostly measuring trailing silence, not clicks.**
Appending 300 ms of digital silence to a clip cannot create or remove a click. It only changes how
much room sits in the detector's 400 ms analysis window (`audio-processor.cjs:363`). Re-running the
real detector on padded copies:

| rule | flagged bare | flag vanished on padding |
|---|---:|---:|
| rise | 24 | **23 (96%)** |
| burst | 24 | 19 (79%) |
| resurgence | 28 | 21 (75%) |
| **all** | **76** | **63 (83%)** |

Zero new flags appeared. `rise` at 96% is effectively a trailing-room detector wearing a click
detector's name.

**2. Blind listening confirms the flags are mostly empty.**
104 clips, blinded, judged by ear (`docs/tail-click-listening-test.html`):

| bucket | n | audible click |
|---|---:|---:|
| clean (control) | 28 | 0 |
| **rise** | 24 | **0** |
| burst | 24 | 3 (12.5%) |
| resurgence | 28 | 4 (14.3%) |

Bare-flag precision: **7/76 = 9%**.

**3. The gate fires on most fresh TTS output.**
Re-rendering clips through the existing TTS path: **16 of 20 fresh renders trip the tail-defect
detector.** Untouched provider audio, flagged as defective.

**4. The repair removes speech and backfills with silence.**
The repair runs `atrim=end=cutAt, areverse, afade=t=in:st=0:d=0.008, areverse, apad=pad_dur=0.1`.
A cut landing near the end barely changes total length, so duration checks see nothing — but the
audio after `cutAt` is gone. Three independent signatures:

- **Speech span vs a fresh render of the same text, same voice:** signature clips median ratio
  **0.863** vs control **0.952** (Mann–Whitney **p = 0.0139**; English subset p = 0.031). German
  median 0.68, n=7, directional only.
- **Decay steepness** — time from last loud frame to silence: clips judged cut off median **30 ms**,
  natural **80 ms** (p = 0.0037). The steepest is 10 ms, which is the 8 ms `afade`.
- **Speech rate** — characters of text per second of audio: cut off median **21.1 c/s**, natural
  **16.1** (p = 0.0032). Worst case: *"I'm trying to practise"* in **702 ms** (31 c/s), containing
  two energy humps where the phrase needs four words.

Combined marker (fast **and** steep): **79% precision, 68% recall, p = 0.00028.** Language-independent,
needs no listening.

**5. The damage is audible and widespread.**
50 English clips, blind, matched on voice and duration (`docs/english-cutoff-test.html`):
**45% judged "ends abruptly"** (22/49).

---

## Proposed change

| | current | proposed |
|---|---:|---:|
| review queue (per 7,209 clips) | 835 auto-repaired | **143 flagged for a human** |
| precision | 9% | **38%** |
| recall of real clicks | ~100% | 71% |
| clips modified by machine | ~835 | **0** |

1. **`repairTailDefect` stops mutating audio** — detect and record only. Never trim, never throw.
   This also removes the hard-block that currently stops some clips shipping at all.
2. **Pad before detecting**, so the rules stop firing on trailing room. Free; drops the queue 83%.
3. **Human review queue** — flagged clips go to a blind listening page; a confirmed click triggers a
   **re-render**, never a DSP repair.
4. **Find existing damage** with the fast+steep marker (read-only).

**The honest cost:** ~22 of every 77 real clicks per 7,209 clips would no longer be caught
automatically. Kai's judgement, which we think the data supports, is that a click is materially less
disruptive to a learner than a clipped word.

---

## What we are NOT claiming

- **No per-clip repair record exists.** We can show the mechanism damages audio; we cannot prove any
  *specific* shipped clip was repaired. The 100 ms trailing-room fingerprint is suggestive, not proof —
  and it **failed** as a predictor of the audible defect (45.8% vs 44.0%, p = 1.00).
- **The 45% figure rests on one listener judging 49 English clips.** Good enough to act on, not good
  enough to quote precisely.
- **Foreign-language judgements are weaker.** Cut-off rates were English 6.7%, French 19%, German 50%
  in the mixed test — the judge is not a French or German speaker and said so. The English-only rerun
  exists because of that.
- **Whisper does not solve this.** `verifyTrimKeepsText` only checks that the text survived. A clip
  can retain every word and still end abruptly. An earlier suggestion to install `whisper-cli` as the
  fix was wrong and is withdrawn.
- **Two hypotheses were tested and killed** during this work: "raise the pad constant" (padding
  changed 0 of 48 paired verdicts) and "the 100 ms fingerprint predicts the audible defect".

---

## Artefacts

| what | where |
|---|---|
| click listening test + results | `docs/tail-click-listening-test.html` |
| paired padding test | `docs/cutoff-listening-test.html` |
| English-only cut-off test | `docs/english-cutoff-test.html` |
| detector-vs-padding experiment | `scripts/tail-causation-test.cjs` |
| decay + speech-rate markers | `scripts/decay-steepness.cjs`, `scripts/envelope-dump.cjs` |
| TTS re-render probe | `scripts/amputation-tts-probe.cjs` |

---

## Decisions needed

1. **Do we make the gate flag-only?** (live render path; small, reversible)
2. **Do we pad before detecting?** (live render path; one constant)
3. **Do we re-render already-damaged clips, and at what scope?** Cost scales with scope —
   estate-wide extrapolates to ~294,000 currently-eligible clips, so we would recommend
   course-by-course, starting with one course as a proving run.
4. **Who reviews the queue, and how often?**
