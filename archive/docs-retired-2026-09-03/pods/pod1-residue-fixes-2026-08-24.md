# Pod 1 residue: the two ruled fixes

**2026-08-24.** Both items from `pod1-live-state-audit-2026-08-24.md` §"What needs Tom", ruled by
better × simpler × cheaper under delegation. No TTS, no spend, ffmpeg only. Every number here was
re-derived from the live database and the live serve path, not from the audit document.

---

## The answer

| | before | after |
|---|---|---|
| **Croatian** turns served as per-sentence splits | 53 | **100** |
| **Croatian** residue (multi-sentence turns served whole) | 78 | **0** |
| **Irish** `SC12-S010` | whole-turn fallback | *see below* |
| Cost | | **£0** |

Croatian is fully resolved and the residue is gone, not reduced.

---

## 1. Croatian — "…" is hesitation, not a sentence end

### What was actually wrong

hrv Pod 1 writes hesitation with an ellipsis. `"Da, mogu li dobiti… i čašu vode, molim."` is **one
sentence**, and 78 of its 131 multi-sentence rows do this.

Two pieces of shared code disagreed with the text, and they are the *same* regex in two places:
- `POD_SENTENCE_BOUNDARY` in `podSentenceSplit.ts` — `/(?<=[.!?…])\s+/`, so "…" is terminal;
- `generatePodAudio`, which uses it to place the `" … "` TTS pause cue — **so the take really does
  pause at every hesitation.**

That is the trap. A splitter finds a wide, clean, high-margin gap at a hesitation and **every audio
gate passes** — the cut is good, the unit is not a sentence. Gate 5 (`known_count_mismatch`) is what
saved it: English has no hesitation ellipsis, so it split into fewer parts, the counts disagreed, and
all 78 rows were refused back to whole-turn. They were never wrong to the learner, only unsplit.

### The measurement that decided the shape of the fix

Taken before touching anything:

- Under the demoted rule, **all 78 rows match their English known-side count exactly.** Not most —
  all. 31 turn out to be genuinely single sentences (correctly never split); **47 become splittable.**
- Estate-wide blast radius, across all 67 live core pods and 11,483 rows: exactly **225 rows** change
  their regex count — hrv 78, cym_s 144, fin 3 — and **not one of them is currently split.** Every
  affected row has fewer than 2 sentence clips, so it returns `wholeTurn()` before the count is ever
  consulted. **Zero currently-split rows change unit count or unit text anywhere in the estate.**

### Why the app had to change too, not just the splicer

This is the part that would have made a splicer-only fix worthless. There are two callers:

- the **overlay** calls `splitRowUnits(row, textById)` — honest word-coverage oracle;
- the **main-flow scheduler** calls `splitRowUnits(row)` with **no** oracle, so its only check is
  `tSents.length <= clips.length` using the app regex.

With "…" terminal, a correctly spliced 3-clip Croatian turn regex-counts as 5 sentences, `5 <= 3` is
false, and the **main flow falls back to the whole turn while the overlay splits it**. The two doors
would disagree on the unit count — which also desynchronises the shared `podOrdinal` that derives
maturity. So `POD_SENTENCE_BOUNDARY` now reads `/(?<=[.!?])\s+/`.

Under-splitting is the safe direction here in general, the same way the regex is blind to the
Devanagari danda: a turn it declines to split keeps its whole, correct clip, whereas over-splitting
hands out cards with no translation.

### Why the splicer could not simply be re-run

The audit's own sharpest finding was that **margin cannot discriminate placement** — the three zho
turns passed every gate with margins of 1.53/1.59/1.75 and were still cut on a comma; only STT caught
them. Croatian is that problem in a worse form, because the hesitation pauses and the sentence pauses
are *the same TTS cue* and are drawn from the same population. Asking the splicer for N pieces and
letting it take the N-1 longest gaps would sometimes have cut a sentence in half, cleanly, with every
gate green.

So the cut is **aimed, not chosen**. `splice.py` gains an optional cue-ordinal mode that separates the
two questions the default conflates:

- **which gaps are cue pauses at all** — still by length, top K, where K is read off the take's own
  stored text (the `" … "` markers survive in `course_audio.text`, which is how K was verified rather
  than assumed: cue count is always `old_count − 1`);
- **which of those cue pauses are sentence ends** — by **ordinal in time**, derived from the text.
  Never guessed.

For hrv #4, `"Da,… imam zauzet dan danas. Nadam se… da ćeš imati lijep dan. Vidimo se kasnije."`, the
take has four cue pauses and only ordinals **1 and 3** are sentence ends. The hesitation pauses stay
*inside* their sentences, where they belong — the performance is preserved exactly, not re-joined.

Three things fail closed:
- the caller **self-checks** its own map — a cue map that cannot rebuild the sentence split it claims
  to describe is refused rather than cut on;
- gate 1 now requires **every** cue pause the text claims, not merely n−1: a missing pause means every
  later ordinal points at the wrong gap;
- margin is measured over the whole cue population against the loudest *non*-cue pause, which is the
  discrimination that actually matters. A cue gap we declined to cut at is a known hesitation, not
  evidence the choice was close.

The default path is bit-identical when the flags are absent, and a test proves the two modes choose
**different** gaps on the same synthesised audio (cue mode 3.0s+ first piece, default 1.65s).

### Result

`47/47 turns linked, 73 clips spliced, 40 reused, 0 refused, 0 errors, 0 known-count mismatches.`
Margins 3.23–6.05 where measurable; the rest had no non-cue gap to measure against.

Verified on the live serve path with the **anon key** — a real fresh client's credentials:

```
hrv_for_eng pod-1: rows 231
  served as per-sentence splits : 100   (was 53)
  whole-turn (genuinely 1 sentence): 131
  word-coverage oracle REFUSED  : 0
  scheduler bare-count REFUSED  : 0     <- the two doors now agree
  split clip row missing        : 0
```

HTTP closure over the learner proxy on a sample of the new clips: 200, `audio/mpeg`, real bytes.

Spot-check of the hardest rows shows the hesitations preserved inside their sentences — hrv #29 s0 is
`"Ja sam iz Manchestera,… ali sad živim… u Londonu."` at 6,023 ms, carrying both hesitations, against
s1 `"A ti?"` at 1,440 ms.

---

## 2. Irish — `gle_for_eng:pod-1:SC12-S010`

Master: `"A naoi déag. Fiche. Fiche a haon. Dé Céadaoin. Déardaoin."`
First split clip `7f7a48bc-…` stores `"Naoi déag."` — missing the leading `"A "`.

**Provenance found before listening, and it matters.** This array is not from today's splice pass. It
is **inherited from an earlier pod generation whose text was `"Naoi déag."`**, proven in
`gle_for_eng-split-array-repair-2026-08-24-applied-log.json` (which records the row as
`target_text+known_text` changed) and in the residual-inherited-slots dry run, which planned to NULL
this very array with the reason *"no alive, verified clip exists for this row's target text"*. All
five sentence clips carry the bare `ga-IE-ColmNeural` voice id while the whole-turn clip carries
`azure_ga-IE-ColmNeural` — the tell of a different, older render.

That is a strong prior that the audio says "Naoi déag." with no "A", but a prior is not an ear, and
the ruling turns on the audio. STT verification is running as job **#405**; result below.

---

## Explicit gaps

- **The 40 reused Croatian clips carry their stored text, not the row's punctuation.** Free-first
  reuse matches on `text_normalized`, so hrv #33 s1 displays `"učim hrvatski"` rather than
  `"Učim hrvatski."`. Cosmetic, estate-wide, and pre-existing — not introduced here, and the
  word-coverage oracle is punctuation-blind by design. Worth a separate pass, not this one.
- **`generatePodAudio`'s pause-cue regex was deliberately NOT changed.** No audio was re-rendered, so
  existing takes are unaffected either way; changing it would alter future hrv renders with no audio
  to validate the change against. Flagged, not done.
- **cym_s (144 rows) and fin (3) also write "…"** and are *not* in the hesitation set. Their texts have
  not been read. They are unsplit today and stay exactly as they are; adding a course to
  `ELLIPSIS_IS_HESITATION` is a claim that someone has read that pod's text.
- **CORRECTION on `splice.py`.** My first commit message claims this branch discovered that
  `splice.py` was untracked and moved it. That is wrong, and the branch's own commit message carries
  the wrong version. What is true: a tracked, byte-identical `tools/pods/splice.py` already existed,
  and this branch's `SPLICER` constant still pointed at the gitignored `scripts/splice-fork/` copy —
  so the committed tool was running the uncommitted of two identical copies. **`main` had already
  found and fixed exactly this**, with the same reasoning; this branch was simply 710 commits stale.
  Behaviour is unchanged either way because the two files were identical.
- **This branch is not merged, and merging it is a separate job.** `feat/known-side-sentence-splice`
  is **48 ahead / 710 behind** `origin/main` and carries 45 commits of earlier, unlanded pods work
  (the whole known-side splice) beneath my three. A test merge into main conflicts on **92 paths**,
  including `CLAUDE.md` and the splice toolchain itself, which has diverged in *both* directions —
  main has the splice.py repoint and lacks `splice-known-sentence-clips.cjs` entirely. Reconciling
  that is a real piece of work that predates these two fixes and should not be done blind inside
  them. **The learner is not waiting on it:** the Croatian fix is a database change and is already
  live, and the Popty side here is build tooling, not a serving path.
- No Croatian clip was listened to by a human. The STT leg is advisory per clip by the verifier's own
  design; the hard checks are serves / text / app-parity / seams.
