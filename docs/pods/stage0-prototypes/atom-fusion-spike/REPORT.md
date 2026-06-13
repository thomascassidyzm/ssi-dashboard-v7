# Atom-Fusion offset spike — findings & recommendation

> Spike for docs/architecture/atom-fusion-introduction.md ("Where the offsets
> come from"). Question: how do we get atom-level time offsets into existing
> pod sentence audio — (a) forced-align the existing clips, or (b) re-synthesize
> with Azure word-boundary capture? Test rows: `gle_for_eng:pod-0` g3/g4,
> `hrv_for_eng:pod-0` g3/g4. TTS spend: 10 Azure calls (5 intended + 5 from an
> unguarded CLI entry, since fixed — see 02's CLI guard comment).

## TL;DR recommendation

**For every existing TTS pod clip: re-synthesize with the same Azure voice and
capture wordBoundary events — the offsets transfer to the stored clip
UNCHANGED (shift = 0 ms).** No forced aligner on this host comes within an
order of magnitude of that precision, and Whisper cannot do Irish at all.
Forced alignment remains the necessary path for *human-recorded* clips (the
spec's long-term norm), but nothing currently installed can serve it — that
needs a new tool (MMS/ctc-forced-aligner or echogarden), evaluated when human
pod recordings actually exist.

## The decisive facts

1. **The "recorded" pod clips are Azure TTS.** All four test clips (and, by
   the generation path, all pod-0 target audio) were made by
   `phase8-audio-v13.cjs#generatePodAudio` → `tts-service.cjs#generateAzure`
   at speed 1.0, then mastered with **loudnorm only** (no trim, no tempo —
   timing-preserving). `course_audio.word_boundaries` is NULL simply because
   the pipeline captured the events (tts-service.cjs:138) and never persisted
   them for pods.

2. **Azure synthesis is bit-deterministic.** Synthesizing gle g3 twice with the
   same voice/settings produced **byte-identical MP3s and identical word
   boundaries** (max offset delta 0 ms). So a re-synthesis is not "a similar
   render" — it is *the same render*.

3. **The mastering step does not shift time.** RMS-envelope cross-correlation
   (2 ms hop) between each raw re-synth and its mastered original:
   correlation 0.979–0.997, **best lag 0 ms on all four clips**. The mastered
   file is the raw render with gain shaping only. Word boundaries measured
   on the re-synth therefore index the production clip **without any
   adjustment**.

## Candidate (a): forced alignment of existing clips

### services/voice-engine/align.cjs — what it actually is

Not a forced aligner. It is **zero-ML ffmpeg `silencedetect`** ("slow-gap")
alignment: it finds silences ≥150 ms @ −35 dB, inverts them to voiced regions,
and requires a **1:1 count match** between voiced regions and expected chunks
(else it refuses — its QA gate). It was built for human recording-script takes
where the speaker deliberately pauses between LEGO chunks; its only "transfer"
mode is proportional duration mapping (confidence 0.5, explicitly an
approximation). Because it has no acoustic/language model it is
language-agnostic — Irish and Croatian are no harder than Welsh — but it
**cannot align an arbitrary continuous mp3 + transcript**:

| clip | atoms | voiced regions found | align.cjs verdict |
|---|---|---|---|
| gle g3 | 7 | 3 | refuse (count mismatch) |
| gle g4 | 11 | 3 | refuse |
| hrv g3 | 4 | 2 | refuse |
| hrv g4 | 12 | 4 | refuse |

It finds the *clause-internal pauses at punctuation* — never the intra-clause
atom seams, which in fluent speech have no silence to detect.

### whisper.cpp (`whisper-cli`, installed) with `--dtw` token timestamps

- **Irish: hard fail.** `error: unknown language 'ga'` — Irish is not in
  Whisper's 99-language set. (align.cjs's header note that whisper "is not
  available on this host" is stale — `whisper-cli` is installed via homebrew —
  but for Irish it might as well not be.)
- **Croatian: recognition near-perfect, timestamps too coarse.** Versus the
  Azure ground truth (model: small, DTW enabled):
  - hrv g3: mean |Δstart| **264 ms**, max **563 ms** ("Ideš" was placed inside
    the preceding 950 ms pause).
  - hrv g4: mean |Δstart| **166 ms**, max **530 ms**; one zero-length word
    ("Da" 250–250 ms); one misrecognition ("lijeb" for "lijep").
  - DTW timestamps systematically bleed into silences and across word edges.

Errors of 150–550 ms are unusable for invisible fusion seams and ugly even for
the cosmetic meet-the-atoms cuts. Listen to
`out/hrv_for_eng-g3-fusion-ladder-WHISPER.mp3` vs
`out/hrv_for_eng-g3-fusion-ladder.mp3`: in the whisper version the 600 ms tier
splits "Ideš" mid-pause and clips into "na posao".

### Proper forced aligners (not installed)

For the spec's load-bearing future case — **human-recorded** clause takes — a
real forced aligner is still required. Surveyed options:

| tool | ga | hr | notes |
|---|---|---|---|
| Montreal Forced Aligner | no pretrained model | limited | heavy (conda), per-language acoustic models |
| MMS / ctc-forced-aligner (torchaudio `MMS_FA`) | **yes** | **yes** | ~2 GB Python/torch install; the credible candidate |
| echogarden (npm) | yes (espeak-ng DTW) | yes | JS-native, easiest pipeline fit; DTW quality to be validated |
| whisper.cpp | **no** | yes (coarse) | disqualified above |

This evaluation is deliberately deferred — there are no human pod recordings
yet to align, and the Popty pipeline already plans alignment as a reviewable
batch step ("forced-align once in the Popty pipeline, never on-device").

## Candidate (b): re-synthesis with Azure wordBoundary capture — WINNER for TTS clips

Method: `tts.generate(text, 'azure', { voiceName: <original course_audio
.voice_id>, speed: 1.0 })`, exactly the pod pipeline's settings; the existing
wordBoundary hook (tts-service.cjs:138) returns `{text, offset, duration}` per
word (punctuation events filtered by "contains letter/digit"). Words are then
grouped into atoms by aligning the `explainer_decomposition` chunk_target word
sequences against the token stream (forward-search, not blind positional
consume — see *data finding* below), seams = midpoint of the inter-atom gap.

Measured boundaries (ms, valid for the **original mastered clips**, shift 0):

**gle g3** — "Táim go maith, go raibh maith agat. An bhfuil tú ag dul chun oibre?" (ColmNeural)
`Táim 50–225 · go maith 238–563 · go raibh maith agat 663–1563 · An bhfuil 2450–2751 · tú 2750–2863 · ag dul 2900–3201 · chun oibre 3225–3688`

**gle g4** (OrlaNeural)
`Tá 88–488 (+absorbed 2nd "tá") · lá gnóthach 500–1351 · agam 1388–1676 · inniu 1675–1875 · Tá súil agam 2950–3776 · go mbeidh 3788–4026 · lá maith 4025–4588 · agat 4625–4900 · Feicfidh mé 5950–6338 · ar ball 6388–6850 · thú 6850–7063`

**hrv g3** — "Odlično sam, hvala. Ideš na posao?" (SreckoNeural)
`Odlično sam 50–876 · hvala 975–1413 · Ideš 2363–2676 · na posao 2688–3351`

**hrv g4** (GabrijelaNeural)
`Da 50–475 · imam 650–1088 · zauzet 1088–1613 · dan 1613–1863 · danas 1863–2476 · Nadam se 3313–3926 · da 3925–4025 · ćeš imati 4025–4813 · lijep 4813–5101 · dan 5100–5513 · Vidimo se 6350–7075 · kasnije 7075–7713`

**How well do seams land?** Local RMS (±10 ms) of the original clip at each
seam: seams at punctuation land in true silence (−120 dB — e.g. "agat. | An
bhfuil", "hvala. | Ideš"); seams between words separated by a micro-pause land
in troughs (−34 to −56 dB — "Da | imam", "ćeš imati | lijep", "tú | ag dul");
seams inside fluent runs land in coarticulated speech (−9 to −26 dB — "Táim |
go maith", "ag dul | chun oibre"). That last group is **not an offset error**:
Azure marks the word edge correctly, there is simply no acoustic gap there.
This is precisely the spec's coarticulation caveat — at wide early-tier gaps a
pulled-apart join can sound slightly clipped where the voice ran the words
together; it resolves as gaps shrink, and the 0 ms tier is the verbatim take.
On the audition pass the Croatian atom slices read back as their atom texts
(whisper echo of `hrv-*-atoms-review.mp3`: "Da. Imam zauzet dan dan danas.
Nadam se da ćeš imati lijeb dan. Vidimo se kastnije." — i.e. every slice
carries the right content, in order). The Irish slices are bounded by quiet at
both edges per the seam-RMS data; final word-by-ear check on the ladders is
Tom's (this machine has no ears).

**Effort:** for TTS clips this is a per-clip cost of one Azure call (cheap —
these are short sentences), zero new tooling, and the per-word offsets are
exact by construction. Re-mapping words→atoms is pure code (shipped here).

## Data finding (upstream, worth fixing regardless)

`gle g4`'s `explainer_decomposition` does **not tile its sentence**: the text
opens "Tá, tá lá gnóthach…" but the chunks contain a single `[Tá]` — the second
"tá" is unaccounted for. A naive positional word consumer mis-shifts every
subsequent atom by one word (this spike hit it; the fixed mapper forward-searches
and absorbs skipped words into the preceding atom, keeping tiling total).
`pod-lego-extractor.cjs#validateTiling` would flag this row (coverage < 1) —
supports the design doc's insistence on the total-tiling gate before offsets
are persisted.

## Risks / caveats

- **Determinism across time is not contractual.** The re-synth matched a
  3-day-old render bit-for-bit, but Azure voice-model updates could change
  renders across months. Mitigations: (1) capture-and-persist boundaries *at
  generation time* going forward (the hook already exists — pods just never
  stored them); (2) for back-fill, verify per clip with the cheap envelope
  cross-correlation check (03) and re-master from the fresh render when
  correlation drops (the clip was going to be byte-equivalent anyway).
- **xAI-voiced clips get nothing from candidate (b)** (no timings, different
  voice). For those: either regenerate the clause with an Azure voice (content
  identical, voice changes) or wait for the forced-align path. None of the four
  test clips were xAI, but pods elsewhere use xAI as primary — audit
  `course_audio.voice_id` per course before assuming coverage.
- **Human recordings (the future norm) are out of candidate (b)'s reach** —
  budget a real forced-aligner evaluation (MMS/ctc-forced-aligner vs
  echogarden) when the first human pod recordings land. Whisper-only is not an
  option (no Irish).
- **ffmpeg 7.1.1 acrossfade hazard respected:** all artifact edits were done on
  raw PCM in Node (ffmpeg = plain decoder, lame = encoder, no filtergraphs);
  every output's ffprobe duration was verified against the PCM-exact
  expectation (all within the constant ~25–48 ms lame frame pad; no drops).

## What fills `atom_map`

The `target_start_ms`/`target_end_ms` per atom entry
(20260612_pod_legos_and_atom_map.sql) come straight out of
`data/transfer.json#atom_spans_original`. Pipeline shape for TTS clips:
re-synthesize (same voice_id, speed 1.0) → capture wordBoundaries → map
words→atoms against the (tiling-validated) decomposition → persist spans +
also persist the raw `word_boundaries` on `course_audio` for future re-tiling
without re-synthesis.

## Artifacts (all under scripts/experiments/atom-fusion-spike/)

Listen in this order:

| file | what |
|---|---|
| `out/<course>-g<N>-fusion-ladder.mp3` | the concept: tier 1 = 600 ms gaps at atom seams, tone, tier 2 = 250 ms, tone, tier 3 = the untouched original take. 4 files. |
| `out/<course>-g<N>-atoms-review.mp3` | every atom sliced in isolation (zero-cross snapped, 8 ms fades, 25 ms pad), 700 ms apart. 4 files. |
| `out/<course>-g<N>/atom-NN-<slug>.mp3` | individual atom slices (34 files). |
| `out/hrv_for_eng-g3-fusion-ladder-WHISPER.mp3` | comparator: same ladder from whisper DTW offsets — hear the difference. |

Scripts (re-runnable): `01-fetch.cjs` (rows + S3 originals), `02-azure-boundaries.cjs`
(synthesis + boundary capture + atom mapping; `--remap` re-maps with zero TTS),
`03-transfer.cjs` (shift measurement + seam quality), `04-aligners-probe.cjs`
(align.cjs + whisper probes), `05-render-artifacts.cjs` (PCM renderer + duration
verification), `lib.cjs` (PCM toolkit). Data: `data/*.json`. Originals +
re-synths: `audio/`.
