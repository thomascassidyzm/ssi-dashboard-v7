# Prosody Lab PoC — TTS-as-lab invariance study on the existing audio estate

*Founder-commissioned research PoC, 2026-07-28. Tool: `tools/prosody-lab/`. Parent
research direction: `ssi-learning-app/docs/vad-feedback-design.md` (waveform →
prosodic features → similarity vs model voice → CEFR-calibrated variance bands).*

## Doctrine (write-once, applies to everything downstream)

**We optimise for UNDERSTANDABILITY, not naturalness.** The model voice must be
maximally copyable by a beginner; a natural voice with low understandability is
a bad teacher. Consequences for measurement:

- Features must be blind to voice identity/timbre — a learner cannot copy a
  larynx, only a melody, a rhythm, and a stress pattern. So: F0 in semitones
  relative to the speaker's own median (register-blind), energy z-scored per
  clip (level-blind), timing in seconds and counts. No MFCCs, no spectral
  envelope, no formants — those ARE the voice.
- Whatever survives a change of voice while the phrase stays the same is the
  candidate **understandability core** — the thing worth measuring a learner
  against. Whatever varies freely across voices on the same phrase is the
  identity/naturalness axis — the thing we must NOT grade a learner on.

## The lab

The estate is a ready-made controlled experiment: `course_audio` holds the same
`(language, text)` rendered by multiple voices under a per-voice unique
constraint. Available at scale (role ∈ known/target1/target2, text > 2 chars):

| Axis | Scale |
|---|---|
| Same text, 2+ voices (any) | ~119k English texts, 20–34k per major target language |
| Same text, cross-provider (azure × xai × elevenlabs) | ~51k eng, ~15k fra texts |
| Same text, human vs TTS | 1,282 eng texts (human eng recordings exist), 12 cym texts |
| Same text, same voice, distinct files (re-renders) | ~69k groups |

## Study design

Six categories, sampled deterministically (`order by md5(...)`), ~400 pairs:

- **rerender** — same language+text+voice, two distinct files. Near anchor: the
  metric's noise floor.
- **diffphrase** — same voice, two different texts. Far anchor. (Note the
  deliberate confound: the far anchor is same-voice, so a dimension where
  cross-voice-same-phrase scores WORSE than same-voice-different-phrase is by
  construction voice-dominated.)
- **crossvoice** — same text, two azure voices (fra/spa; typically male/female).
- **crossprovider** — same text, azure vs xai/other (eng/fra).
- **human_tts_eng** — same English text, human recording vs TTS.
- **human_tts_cym** — same Welsh text, human vs TTS (all 12 that exist).

Per clip (methods documented in `prosody.py` header): F0 contour via
normalised autocorrelation (60–400 Hz, 10 ms hop, clarity-gated voicing,
median-filtered), converted to semitones re clip median; RMS energy contour
z-scored; syllable-scale envelope peaks (prominence-gated, mirrors the
production envelope extractor's logic); internal pauses ≥150 ms; voiced
fraction. Contours resampled to 150 points → **shape** comparison by DTW
(normalised path cost); absolute timing carried by separate scalars
(duration log-ratio, syllable rate/count, pauses).

Two summary numbers per dimension:

- **voice_sensitivity** = (cross-voice median − rerender median) / (diffphrase
  median − rerender median). 0 ⇒ changing the voice doesn't move the dimension
  (invariant); ≥1 ⇒ changing the voice moves it as much as changing the phrase
  (voice-dominated).
- **same_vs_diff AUC** = P(cross-voice same-phrase distance < same-voice
  different-phrase distance). >0.5 ⇒ the dimension can still recognise "same
  phrase" through a voice change — the property the learner-vs-model metric
  needs.

## RESULTS

Run completed 2026-07-28 11:18–11:20 BST. **774 clips downloaded, 388 pairs
compared** (1 clip unusable — a 834-byte truncated S3 object, `2a47ba2d…`,
which cost 1 pair's F0 dims; everything else extracted cleanly). Category
counts: crossvoice 100, crossprovider 100, human_tts_eng 99, rerender 40,
diffphrase 36, human_tts_cym 12. Raw artifacts: `temp/prosody-lab/`
(`results.jsonl`, `report.json`, `clips/`).

**8 of the 40 `rerender` pairs turned out to be byte-identical files under two
s3_keys** — the same render filed twice, not an independent re-synthesis. They
score a trivial 0.0 and would flatter the noise floor, so they are flagged
(`same_bytes`) at compare time and excluded from the near anchor. The near
column below is the 32 genuine re-renders. (Excluding them moved the baseline
up — e.g. energy 0.051 → 0.067 — and changed no conclusion or ranking.)

### The headline: three dimensions carry the phrase, six carry the voice

Medians per anchor; **vsens** = voice_sensitivity, **AUC** = same_vs_diff
(>0.5 ⇒ recognises the phrase through a voice change).

| Dimension | near (re-render) | cross (same phrase, new voice) | far (diff phrase) | vsens | AUC |
|---|---|---|---|---|---|
| **energy_dtw** | 0.067 | 0.122 | 0.192 | **0.44** | **0.845** |
| **dur_log_ratio** | 0.060 | 0.093 | 0.251 | **0.17** | **0.743** |
| **syl_count_diff** | 0.0 | 1.0 | 3.0 | **0.33** | **0.715** |
| syl_rate_diff | 0.291 | 0.520 | 0.514 | 1.03 | 0.465 |
| f0_dtw | 0.256 | 0.663 | 0.606 | 1.16 | 0.464 |
| f0_range_diff_st | 0.585 | 3.50 | 1.82 | 2.37 | 0.333 |
| voiced_frac_diff | 0.022 | 0.215 | 0.075 | 3.63 | 0.133 |
| f0_register_gap_st | 0.335 | 7.24 | 1.99 | 4.17 | 0.109 |
| pause_diff | 0.0 | 0.0 | 0.0 | — | 0.027 |

The split is clean and it is not marginal:

- **Phrase-stable (the candidate understandability core): energy contour shape,
  duration, syllable count.** All three sit near the re-render anchor when the
  voice changes and jump when the phrase changes. Energy-contour DTW is the
  single best dimension (AUC 0.845): the *stress/prominence rhythm* of a phrase
  survives a change of speaker, which is exactly the property the theory needs.
- **Voice-dominated (must NOT be graded): raw F0 contour, F0 range, register
  gap, voiced fraction, syllable rate.** Every one of these has AUC < 0.5 —
  i.e. two voices saying the SAME phrase are further apart on that dimension
  than one voice saying two DIFFERENT phrases. That is the definition of
  measuring the speaker rather than the utterance. `f0_register_gap_st` (AUC
  0.109, vsens 4.2) is the purest voice-ID axis in the set, as expected.
- **`pause_diff` is degenerate** — 0.0 at every anchor. Course phrases are short
  and TTS doesn't insert ≥150 ms internal pauses, so the dimension carries no
  information at this phrase length. Drop it or lower the threshold; do not
  report it as "invariant".

Note that **register-normalising F0 was not enough**. Semitones-re-own-median
removes the bass/soprano offset, but the residual melodic shape is still
voice-dominated (AUC 0.464 ≈ chance). Melody as measured here is a voice
property, not a phrase property. This is the study's most actionable negative.

### Does it discriminate the way the theory needs? Yes — combined AUC 0.813

Combining the three surviving dimensions (each divided by its median over the
cross+far pool so no dimension dominates by unit):

| Category | combined median |
|---|---|
| rerender (deduped) | 0.56 |
| crossvoice | 0.83 |
| crossprovider | 1.06 |
| human_tts_cym | 1.53 |
| diffphrase (far anchor) | 2.19 |
| human_tts_eng | 2.37 |

- **AUC same-phrase-through-a-voice-change vs different-phrase = 0.813**
- AUC re-render vs different-phrase = 0.927 (the ceiling, given a perfect match)
- AUC re-render vs cross-voice = 0.771 (the metric still *notices* the voice
  change — it is not blind, it is just not dominated)

The ordering is monotonic and matches the physical story end to end: same
render < new voice, same provider < new provider < human vs TTS < different
phrase. **A contour metric built on energy shape + timing separates "said the
right phrase" from "said a different phrase" at AUC ≈ 0.81 across a speaker
change**, using zero timbre information. That is the discrimination the
learner-vs-model-voice design depends on, and it holds at PoC scale.

The honest read on the ceiling: 0.81 is a usable signal, not a solved problem.
The near/cross gap (0.56 vs 0.83) is real, so a learner will be scored partly
on not-being-the-model-voice. Calibrating variance bands per CEFR level — the
parent design's proposal — is therefore not optional polish; it is what stops
that residual voice sensitivity reaching the learner as a penalty.

### Sanity checks

1. **Same-voice re-renders are near-identical** ✅ — on genuine re-renders
   energy 0.067, duration log-ratio 0.060, syllable-count difference 0, voiced
   fraction 0.022. The metric's noise floor is well below every real contrast.
   (Caveat: TTS re-renders are near-deterministic, so this is a floor for
   *decoder* noise, not for human repetition variability.)
2. **Different phrases are far** ✅ — syllable count 3.0 apart, duration
   log-ratio 0.251, energy 0.192; combined 2.19 vs 0.56. Cleanly separated
   from every same-phrase category.
3. **Cross-provider > cross-voice** ✅ (combined 1.06 vs 0.83; energy 0.145 vs
   0.104) — swapping vendor moves prosody more than swapping voice within
   Azure, which is what you'd expect and a useful independent confirmation the
   metric is tracking something real.
4. **Human vs TTS sits in between — partially** ⚠️. Welsh lands where predicted
   (1.53, between cross-provider 1.06 and different-phrase 2.19). **English does
   not** (2.37 — at or beyond the different-phrase anchor), driven by duration:
   human/TTS `dur_log_ratio` median 0.476 vs 0.251 for different phrases. Human
   speakers simply do not use the same pace as the TTS, and the 99 English
   pairs pit a legacy human recording against Azure/xAI renders of the same
   text. Read straight, this says **duration ratio will punish a learner for
   speaking at a human tempo** — it needs per-phrase normalisation or a wide
   tolerance band before it goes anywhere near learner scoring.

**Do not trust the Welsh number as a human-vs-TTS read.** All 12 cym pairs are
the human recording of a declarative against the TTS render of the *question*
form of the same words (grouping is on punctuation-stripped text, and in every
one of the 12 the TTS side ends in `?`). So that comparison contains a real
intonation difference on top of the origin difference. n=12 and confounded —
listed for completeness, load-bearing on nothing.

### Listenable example pairs

Extremes ranked on `energy_dtw` (the dimension that actually tracks phrase
identity — the earlier build ranked on `f0_dtw`, which we now know sorts by
voice). Paths are repo-relative under `temp/prosody-lab/clips/`; full list with
every pair in `report.json` → `examples`.

**Should sound the same — cross-voice, low distance:**

| Text | Voices | energy_dtw | Files |
|---|---|---|---|
| *para tener* | es-MX Carlota / Luciano | 0.031 | `8a3eb330….mp3` / `8cfcd10d….mp3` |
| *porque quiero* | es-AR Elena / es-ES Elvira | 0.041 | `1987ad25….mp3` / `8d4bf76f….mp3` |
| *entendre la vérité* | fr-FR Henri / xAI eve | 0.062 | `344e0301….mp3` / `e1e31a00….mp3` |

**Same phrase, but the metric flags distance — cross-voice/provider, high:**

| Text | Voices | energy_dtw | Files |
|---|---|---|---|
| *quería que ella te ayudara con los preparativos* | es-ES Alvaro / Elvira | 0.168 | `b7911589….mp3` / `8174eda2….mp3` |
| *don't you want to come with us?* | en-GB Ryan / xAI bedd6226 | 0.227 | `6acb33c4….mp3` / `4609d930….mp3` |
| *What do you have today?* | en-GB Sonia / xAI bedd6226 | 0.236 | `080d0b74….mp3` / `463245ee….mp3` |

**Genuinely different phrases — the far anchor, for calibration by ear:**

| Texts | Voice | energy_dtw / combined | Files |
|---|---|---|---|
| *palabras nuevas* vs *me gustaría que hables español conmigo hoy* | es-ES Alvaro | 0.237 / 6.32 | `4fbfa1b9….mp3` / `4c22377b….mp3` |
| *vas a aprender español rápidamente* vs *quiero leer un libro* | es-ES Alvaro | 0.228 / 4.22 | `5967420b….mp3` / `3fc82c05….mp3` |
| *eres joven todavía* vs *cambia nuestro cerebro* | es-ES Alvaro | 0.125 / 0.57 | `476f55ba….mp3` / `9606cf67….mp3` |

That last row is the instructive failure and worth 30 seconds of listening:
two different phrases of near-identical length and rhythm score *low* on
energy alone. The combined score catches it only via the other dims (0.57 is
still near the same-phrase range) — evidence that a contour metric confirms
**how** something was said, and cannot on its own confirm **what** was said.
Pair it with a content check; do not ask it to do word recognition.

### What this changes

1. **Build the learner metric on energy-contour shape + duration + syllable
   count.** Ship those three; they are the invariance core the study set out
   to find.
2. **Do not score raw F0 contour, F0 range, register or voiced fraction.**
   Register-normalisation is insufficient; on this evidence they grade the
   learner's larynx.
3. **Duration needs a tolerance band before learner use** — the human-vs-TTS
   English result shows a natural human tempo scoring as far as a wrong phrase.
4. **Model-voice selection** now has a measurable handle: of the renditions of
   a phrase, prefer the one whose energy contour is most central across voices
   — that is the most copyable reading, and it is the doctrine ("maximally
   copyable by a beginner") made operational.
5. Next scale-up, if wanted: more human-vs-TTS pairs without the punctuation
   confound, and a cross-voice *different-phrase* anchor to bound the easy case.

## Honest limitations

- ACF pitch tracking is octave-error-prone on creaky/very low voices; the
  clarity gate + median filter contain but don't eliminate this. Parselmouth
  (Praat) is the defensible upgrade if F0 becomes load-bearing.
- Contour resampling to 150 points makes DTW compare *shape*, discarding
  absolute time (recovered by the scalar dims) — but it also stretches short
  phrases and compresses long ones; contour dims are most comparable within
  similar-length phrases.
- The far anchor is same-voice different-phrase (the estate has no
  cross-voice different-phrase need — that comparison is strictly easier).
- Human recordings are studio-mastered like the TTS, so human-vs-TTS gaps here
  are a *floor* for what real learner-mic audio will show.
- The near anchor is TTS re-renders, which are near-deterministic — it bounds
  decoder noise, not the variability of a human saying the same thing twice.
  8 of 40 sampled "re-renders" were the same file under two s3_keys and are
  excluded (`same_bytes`); the estate contains such duplicates.
- The 12 human-vs-TTS Welsh pairs are confounded: grouping is on
  punctuation-stripped text and in all 12 the human side is declarative while
  the TTS side is the question form, so an intonation difference rides along
  with the origin difference. n=12; treat as anecdote.
- `pause_diff` is degenerate at this phrase length (0.0 at every anchor) — it
  is uninformative here, not invariant.
- Anchor medians are 12–100 pairs per category; the direction of every result
  is large and consistent, but the exact AUCs are PoC-precision, not final.
