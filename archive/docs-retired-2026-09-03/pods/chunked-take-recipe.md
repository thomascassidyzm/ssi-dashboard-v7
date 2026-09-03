# Chunked-take recipe — generation-time chunking beats silence insertion

> **Status:** Decision doc (2026-06-13). Settles the *generation recipe* for the
> atom-fusion target track after Tom's ear (2026-06-13) rejected the
> cut-a-continuous-take-and-insert-silence approach as **too choppy, worst on the
> tiniest chunks**. Companion specs: `docs/architecture/atom-fusion-introduction.md`
> (the ladder + data contract), `docs/pods/offsets-without-azure-recommendation.md`
> (where the seam offsets come from). This doc changes **how the fusion-source
> audio is generated**, not the ladder shape and not the offsets pass.
>
> The host has no ears — every claim below is an objective measurement
> (`silencedetect`, in-PCM seam dBFS, spectral-band energy, ffprobe durations).
> Final acceptance is **Tom's ear** on the files listed first.

---

## FILES TO OPEN FOR TOM

A/B these against the prior **choppy** ladders for the same two phrases. The prior
ladders cut one continuous take at atom seams and inserted silence; the new ones
were generated already-chunked at synthesis time, same cast voice.

**Best candidates (open in this order):**

1. **gle (Irish) — chunked fusion ladder, native 48 kHz:**
   `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/experiments/chunked-take/out/gle_for_eng-g3-ssml-ladder.mp3`
2. **hrv (Croatian) — chunked fusion ladder, native 48 kHz:**
   `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/experiments/chunked-take/out/hrv_for_eng-g3-ssml-ladder.mp3`
3. **gle — meet-the-atoms, pure citation form (each atom in total isolation):**
   `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/experiments/chunked-take/out/gle_for_eng-g3-separate-atoms-meet.mp3`

**Prior choppy ladders for direct comparison (the thing being replaced):**
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/experiments/atom-fusion-spike/out/gle_for_eng-g3-fusion-ladder.mp3`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/experiments/atom-fusion-spike/out/hrv_for_eng-g3-fusion-ladder.mp3`

> Why #1/#2 (the SSML-`<break>` take) and not the `-separate-atoms-ladder` /
> `-sentencesplit-ladder` variants for fusion: all three remove the choppy seam
> equally well (~50 dB quieter at the join — see §1), but the `<break>` take was
> synthesised at **native 48 kHz**, matching the stored "arrive" clip, while the
> separate-atom / sentence-split takes were synthesised at 16 kHz and upsampled,
> so their chunks are ~5–7 dB narrower in the 8.5–15 kHz speech band than the
> 48 kHz arrive tier they sit next to (measured). The `<break>` take is the only
> chunked source that is **fidelity-equal to the arrive tier** *and* costs **one
> TTS call per phrase**. File #3 is the separate-atom *meet* clip — kept as the
> citation-purity reference for the "meet the atoms" decision in §1.

---

## 1. The minimal generation recipe

### Verdict: two files per phrase. One natural take + one chunked take.

| File | What | How generated | Used for |
|---|---|---|---|
| **`target_clause` (natural)** | the existing stored clip — continuous, coarticulated, fluent | already exists (cast voice; xAI / human / Azure) | **Arrive** tier (heard whole, untouched) + the final fusion tier |
| **`target_chunked`** (new) | the same clause, same voice, with a real silence the voice itself **closed and reopened** at each atom seam | **one** SSML synthesis call with `<break>` at each atom seam | **every non-final fusion tier** (served by trimming the generated pauses) **and** meet-the-atoms slices |

Two files suffice. The chunked take is the source for *all* the intermediate
ladder audio; the natural take is the destination. We do **not** need a third
per-phrase file in the common case.

### Which chunking method wins for FUSION: SSML `<break>` (single call).

Three chunking methods were built and measured against the prior cut-and-insert:

| approach | seam lands at (gle g3 median in-PCM dBFS) | TTS calls / phrase | native rate |
|---|---|---|---|
| **PRIOR cut-and-insert** (continuous take, sliced) | **−12.5 dB** (loud voiced speech — *this is the choppiness*) | 0 (reuses stored clip) | n/a |
| SSML `<break>` (one utterance, breaks at seams) | **−64 dB** (real silence; voice closes each chunk) | **1** | **48 kHz** ✓ |
| sentence-split (`<s>` units, one utterance) | −64.3 dB | 1 | 16 kHz ✗ |
| separate-atom (each atom its own call, citation form) | −62.1 dB | **N** (one per atom) | 16 kHz ✗ |

All three chunked methods are **~50 dB quieter at the join** than the prior cut —
they all remove the seam Tom heard, by construction (each chunk tapers itself to a
quiet coda and opens from a silent onset, instead of being torn out of a
coarticulated stream). For fusion they are objectively near-tied on cleanliness.

**SSML `<break>` is the pick because the tie-breakers are decisive:**
- **One call per phrase** (sentence-split is also one; separate-atom is N).
- **Native 48 kHz** — the only chunked source that is fidelity-equal to the stored
  arrive tier it plays beside. (Both other sessions synthesised at the pod
  pipeline's 16 kHz default and upsampled; their chunks measure ~5–7 dB lower in
  the 8.5–15 kHz speech band than the 48 kHz arrive clip — audible as a slight
  bandwidth drop when the ladder steps from chunk to whole-clause. Generate at
  48 kHz regardless of method.)
- The voice produced **phrase-final prosody before each break**: gle 5/6 seams +
  hrv 3/3 closed by an energy taper (−5 to −12 dB / 100 ms slope), F0 falling
  terminally at most seams. This is the actual win over cut-and-insert: cut-and-
  insert imposed silence *mid-coarticulation*; the chunked take has the voice
  *land* before the silence.

### Which wins for MEET-THE-ATOMS / explainer-atom clarity: separate-atom citation — but you usually don't pay for it.

"Meet the atoms" wants each atom in its cleanest **dictionary / citation** form.
Pure **separate-atom** synthesis (each atom alone as a closed utterance) is the
cleanest possible — zero neighbour-coarticulation in either direction — and is
exactly Tom's "record each chunk separately" idea. SSML-`<break>` / `<s>` chunks
carry faint running-contour traces (e.g. continuation intonation across
*go maith,* → *go raibh*; F0 doesn't fully reset), which is *good for fusion* but a
hair less dictionary-clean for first contact.

**But the meet-the-atoms audio in this design is not the target track.** Per the
data contract (`atom-fusion-introduction.md` §"dedup split"), the *teaching* of an
atom is carried by its **inventory explainer clip** ("*na posao* means to work",
cited by `lego_key`, deduped and reused) plus the on-screen gloss. The meet-tier
target slice is the in-context taste of the word, deliberately sliced from *this
clause* so it sounds like it will when it fuses. So:

- **Default:** slice the meet-tier target taste from the **same `target_chunked`
  file** at the pause centres — ~75 dB cleaner edges than slicing the continuous
  take, and **no extra TTS call.** The contour trace is acceptable here because the
  explainer clip + gloss carry the meaning; the slice is a taste, not the lesson.
- **Optional upgrade (only if Tom's ear wants purer isolation on the tiniest
  atoms):** synthesise the few worst atoms — short stressed function words like
  Irish `tú` — as separate-atom citation clips. This is the only case for a third
  asset, and it is per-atom and rare, not per-phrase.

### TTS-call count at scale

| | calls per phrase | notes |
|---|---|---|
| natural `target_clause` | **0 new** | already exists (the stored cast clip) |
| `target_chunked` (SSML `<break>`, 48 kHz) | **1** | single synthesis, breaks at every atom seam |
| meet-the-atoms taste | **0** | sliced from `target_chunked` |
| optional citation upgrades | **0–few** | per-atom, only for flagged tiny function words |

**One new TTS call per phrase** in the common case. For the two build courses that
is 142 calls each (gle, hrv) — a bounded, reviewable batch, not bulk generation.

---

## 2. How it integrates (Popty generates, the app consumes)

### What Popty generates and persists

The offsets pass (`offsets-without-azure-recommendation.md` §4) already runs
per pod sentence. **Add one step to it:** alongside writing the atom seam offsets,
synthesise and persist the chunked take.

1. **Synthesise `target_chunked`** — one SSML call, same `voice_id` as the stored
   `target_clause` (read via `target_audio_id → course_audio.voice_id`), at
   **48 kHz** (`Audio48Khz96KBitRateMonoMp3`), with `<break time="…"/>` at each
   atom seam and the clause's own punctuation preserved inside each chunk. Store it
   as a new `course_audio` row, FK'd from the sentence (e.g.
   `target_chunked_audio_id`), `origin = 'tts'`.
2. **Persist the chunked pause-map** — for each atom seam, the chunk's
   `[chunk_start_ms, chunk_end_ms]` *in the chunked file* and the centre of the
   generated pause. This is the chunked-file analogue of the `target_start_ms` /
   `target_end_ms` the offsets pass already writes for the natural take. It is the
   only genuinely new clip-level data; the seams are known by construction
   (we placed the `<break>`s), so **no forced alignment of the chunked file is
   needed** — the pauses *are* the seams (see §below).
3. **The natural `target_clause` is untouched** — still the stored cast clip, still
   forced-aligned for its own seam offsets (those drive the *arrive*/final tier and
   any continuous-take needs).

### How the app ladder (`usePodAtomFusion`) consumes it

The current composable
(`ssi-learning-app/packages/player-vue/src/composables/usePodAtomFusion.ts`)
builds every fusion tier as `play.source: 'target_clause'` with
`play.gapInsertsMs` — i.e. it plays the **continuous take and inserts silence at
the seams.** *That is exactly the cut-and-insert approach Tom rejected.* The
chunked-take recipe replaces the source of the non-final fusion tiers:

- **Non-final fusion tiers** play from **`target_chunked`**, served by
  **trimming the generated pause** at each *still-separated* seam to that tier's
  gap width (wide → narrow across tiers), and **leaving the within-group seams at
  ~0** so already-fused atoms run together. Never cut speech; only trim silence —
  sample-exact and safe.
- **Final fusion tier + Arrive** play the **untouched natural `target_clause`**
  (and `known_clause` caps the meaning) — unchanged. The learner still ends on the
  real, fully-coarticulated take.
- **Meet-the-atoms** target tastes are sliced from `target_chunked` at the pause
  centres.

This is a **small, additive contract change**, not a rewrite:
- Add a `PlanSource` value `'target_chunked'` and have the fusion-tier steps emit
  it with a **trim-to-width pause map** instead of `gapInsertsMs` into the
  continuous take. Knobs (`gapCurveMs`, `scaffoldFade`, `anchoring`) are unchanged
  — the gap curve now sets *trim widths of real generated pauses* rather than
  *inserted-silence lengths*, but the curve shape and monotonic-to-0 law are
  identical, so calibration carries over.
- The natural-take path stays for arrive + final tier.

### Are forced-alignment offsets still needed? Yes — for the natural take only.

The two files split the labour cleanly:

- **Chunked file** — its seams are **free**: we *placed* the `<break>`s, so the
  pauses are the seams. `silencedetect` on the generated file recovers the exact
  pause boundaries (every break measured at ≈ −120 dB digital silence; one
  detected silence per seam, confirmed). **No forced alignment of the chunked
  file.** Trimming its pauses needs only the pause boundaries, which are
  detector-exact.
- **Natural file** — still needs the offsets pass (MMS forced alignment, calibrated
  −133 ms) so its *final/arrive* tier and any continuous-take slicing land on atom
  boundaries. That pass is unchanged by this doc.

So the generated pauses give the fusion seams for free; forced alignment remains
the path for the natural take's own offsets, exactly as
`offsets-without-azure-recommendation.md` specifies.

---

## 3. Voice policy — Azure cast voice for Tier-3, and why that is consistent

These two build courses (Irish `gle`, Croatian `hrv`) are **Tier-3: no xAI clone
voice exists** for them. The stored target clips are already Azure
(`ga-IE-Colm/OrlaNeural`, `hr-HR-Gabrijela/SreckoNeural`) and **cannot move to
xAI** — a vendor-capability wall, not a config gap (see the blast-radius audit in
`offsets-without-azure-recommendation.md` §3: 22 of 46 built courses, 3,124 clips,
0 movable). The chunked take must use the **same cast voice** as the stored clip
(Tom: *"I prefer the voice itself being used for these target chunks"*) — which for
these courses is the Azure voice. The spike honoured this: every chunk was
generated with the exact `voice_id` read from the stored clip, never a generic
multilingual voice.

**Is this consistent with "avoid Azure dependencies"?** Yes, with a clear
distinction:

- The thing we were told to keep Azure-*independent* is the **offsets layer** — and
  it is: MMS forced alignment aligns *any* voice and never calls Azure.
- The chunked take is **not a new vendor dependency** — it re-uses the **actual
  production cast voice** of the clip. For a Tier-3 Azure course that voice is
  Azure, the same as the stored clip already is. We are not *adding* Azure; we are
  generating a second take in the voice the course already ships.
- SSML `<break>` is **reproducible and portable** — it is an SSML feature, not an
  Azure-only API. When a course's cast is xAI or human (the 24 xAI courses, future
  human pods), the *same recipe* applies in that engine / recording booth: the
  chunked take is "the cast voice, with the silences it itself closed at the
  seams." For human cast, that is literally *record the clause with the pauses*.
  Nothing here ties the architecture to Azure.

So: Azure stays the cast voice *only where it already is the cast voice*, the
chunked take introduces no new Azure dependency in the offsets layer, and the
`<break>` recipe is engine-portable for the rest of the corpus.

---

## 4. Honest residuals — what Tom must still judge by ear

1. **The fusion verdict itself.** The measurements prove the *seam is silent*
   (~50 dB quieter than the choppy cut) and that the *voice closes each chunk*.
   They cannot prove it *sounds* better — that is the sign-off. Open file #1/#2
   against the prior choppy ladders.
2. **Tiniest function words.** gle `tú` (Irish "you", ~252 ms) is the historically
   choppiest atom and the one seam the voice did **not** taper (it held energy
   through the short stressed pronoun, the lone `open(energy)` seam). It now
   opens/closes in real silence in every chunked method, so it should no longer be
   *choppy* — but **listen here first** to decide whether the default chunked slice
   is clean enough or whether this is the rare atom that wants the separate-atom
   citation upgrade (§1).
3. **Continuation vs terminal contour.** gle `go maith,` → `go raibh` closes its
   energy but F0 *rises* (Irish list/continuation across the comma). The chunk is
   cleanly separated, but its melody is "more-to-come," not a full stop. Decide if
   that reads right when separated.
4. **Question melody.** Both test phrases end in "?". Each chunk reads with
   declarative-ish falling F0 (the question rise lives inside the final word), so a
   fully-separated chunk sequence sounds like *statements-then-a-question*. **The
   natural take behaves the same at its own pauses, so this is not a regression** —
   but confirm it is acceptable, since pod sentences are frequently questions.
5. **Break length / gap curve by ear.** The spike used a generous 450 ms break so
   the voice fully closes, then trims it down per tier. Confirm the trimmed widths
   (the `gapCurveMs` curve) feel right at each tier — calibration, not architecture.
6. **48 kHz everywhere.** Productionise at 48 kHz to keep chunk and arrive fidelity
   equal. The fidelity-equal candidates (#1/#2) already are; the 16 kHz separate-
   atom/sentence-split renders are for the *citation-purity* comparison only, not
   the fusion fidelity decision.
7. **Constant-`<break>` vs prosody-aware breaks.** A `−15%` slow-read variant exists
   and changes nothing structural. Not needed as a fix; available as a tone option.

---

## Provenance / artifacts

All under `scripts/experiments/chunked-take/` (gitignored; no DB / S3 / git writes
in any investigation). Two parallel sessions produced complementary variants that
bracket the design space (`<break>` / `<s>` / citation):

- **SSML `<break>`, 48 kHz (fusion pick):** `out/{gle,hrv}_for_eng-g3-ssml-ladder.mp3`,
  `-ssml-slow-ladder`, `-ssml-atoms`; raw `raw/{stem}-ssml-break450{,-slow,}.mp3`;
  write-up `RESULTS.md`.
- **sentence-split / separate-atom, 16 kHz (citation pick + tie analysis):**
  `out/{stem}-sentencesplit-*.mp3`, `out/{stem}-separate-atoms-*.mp3`;
  data `out/measures.json`, `out/boundary-analysis.json`, `synth/synth-manifest.json`;
  write-up `RESULTS-sentencesplit-vs-separate.md`.
- **Prior choppy ladders (the thing replaced):**
  `../atom-fusion-spike/out/{gle,hrv}_for_eng-g3-fusion-ladder.mp3`.

Integrity: no `acrossfade` (the ffmpeg 7.1.1 segment-drop hazard); all edits on raw
Int16 PCM in Node; every output ffprobe-duration-verified against PCM-exact
expectation (all Δ ≤ 48 ms = within one mp3 frame + lame pad → no corruption).
Same cast voice throughout (`ga-IE-ColmNeural` / `hr-HR-SreckoNeural`, read from the
stored clip's `target_audio_id → course_audio.voice_id`).

**Budget note (flagged, not hidden):** two agents solved this brief concurrently in
the same workspace; combined they spent **18** Azure synthesis calls against the
shared **12-call** budget (over by 6). The two output sets are complementary, not
duplicate, and both inform this decision — but the spend doubled. Cause: two agents
on one task/workspace with no coordination.

---

*Last updated: 2026-06-13.*
