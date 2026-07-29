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
- **The scoring unit is the UTTERANCE, never the phoneme** (founder ruling,
  2026-07-29). Understandability is a property of enough contiguous signal —
  roughly 10 syllables — for the listener's predictive reconstruction to
  lock on; a phoneme-level score measures articulation, which is neither what
  the listener uses nor what the method teaches. Every feature, comparison
  and calibration downstream of this doc inherits this constraint: whole-clip
  contours, whole-clip scalars, no sub-utterance grading.
- **"Human v TTS speed is not a thing"** (founder ruling, 2026-07-29). No
  duration/tempo difference in this study may be framed as a property of
  humanness vs synthesis. The estate's human recordings are old-course
  recordings whose pacing is an era/production artefact; what the human-vs-TTS
  English category actually evidences is only that *those recordings* pace
  differently from modern TTS renders of the same text. The load-bearing
  lesson survives without the frame: duration reads ANY natural pacing
  difference as distance, so it needs calibrated variance bands before it
  ever reaches a learner as a score.

## The lab

The estate is a ready-made controlled experiment: `course_audio` holds the same
`(language, text)` rendered by multiple voices under a per-voice unique
constraint. Available at scale (role ∈ known/target1/target2, text > 2 chars):

| Axis | Scale |
|---|---|
| Same text, 2+ voices (any) | ~119k English texts, 20–34k per major target language |
| Same text, cross-provider (azure × xai × elevenlabs) | ~51k eng, ~15k fra texts |
| Same text, human vs TTS | 1,282 eng texts (human eng recordings exist) |
| Same text, cross-human (Welsh) | 12 cym texts — all Welsh audio in the estate is human-recorded, multiple voices; no Welsh TTS exists |
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
- **human_tts_cym** — same Welsh text, two different human voices (all 12 that
  exist). Every Welsh clip in the estate is human-recorded — there is no
  Welsh TTS — so despite the category's data-pipeline name this is
  cross-human, not human-vs-TTS. Useful in its own right as a preview of
  human-to-human distance, which is closer to the eventual learner-vs-model
  comparison than a human-vs-TTS pair is.

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
| human_tts_cym (cross-human, Welsh) | 1.53 |
| diffphrase (far anchor) | 2.19 |
| human_tts_eng | 2.37 |

- **AUC same-phrase-through-a-voice-change vs different-phrase = 0.813**
- AUC re-render vs different-phrase = 0.927 (the ceiling, given a perfect match)
- AUC re-render vs cross-voice = 0.771 (the metric still *notices* the voice
  change — it is not blind, it is just not dominated)

The ordering is largely monotonic and matches the physical story: same
render < new voice, same provider < new provider < cross-human (Welsh) <
different phrase < human vs TTS (English) — that last flip is discussed in
sanity check 4 below; it is a pacing artefact of the old English recordings'
era, not a Welsh result and not a humanness property. **A contour metric built on energy shape + timing separates "said the
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
4. **Human vs TTS sits in between — partially, and only the English half is a
   real human-vs-TTS read** ⚠️. The Welsh figure (1.53, between cross-provider
   1.06 and different-phrase 2.19) is **not** a human-vs-TTS comparison at all
   — every Welsh clip in the estate is human-recorded (there is no Welsh TTS),
   so `human_tts_cym` is actually two human voices, cross-human. It lands
   where predicted, which is a useful data point in its own right (human-to-
   human distance previews the eventual learner-vs-model comparison), but it
   says nothing about TTS. **English does not** sit where predicted (2.37 — at
   or beyond the different-phrase anchor), driven by duration: human/TTS
   `dur_log_ratio` median 0.476 vs 0.251 for different phrases. The 99 English
   pairs pit a genuine human recording (`origin='human'`, confirmed in the lab
   data) against Azure/xAI renders of the same text — but per the founder
   ruling in the doctrine section, this is **not** evidence of a human-vs-TTS
   tempo property: the human English clips are old-course recordings, and
   their pacing is an era/production artefact exactly as the Welsh estate's
   is. What the pairs evidence is narrower and still load-bearing: **two
   legitimate renditions of the same phrase can differ in pace enough for the
   duration dimension alone to score them as far apart as different phrases**.
   Duration therefore needs per-phrase normalisation or a wide tolerance band
   before it goes anywhere near learner scoring. No speed/duration claim in
   this doc rests on Welsh data (n=12, cross-human, same-era artefact), and
   none is framed as humanness anywhere.

**Do not trust the Welsh number as a human-vs-TTS read — it isn't one.** All
12 cym pairs are two human voices, not human vs TTS (see above). On top of
that, the pairing itself is confounded: one voice recorded a declarative
against the other voice's rendition of the *question* form of the same words
(grouping is on punctuation-stripped text, and in every one of the 12 the
second side ends in `?`). So that comparison contains a real
intonation difference on top of the cross-voice difference. n=12 and
confounded — listed for completeness, load-bearing on nothing.

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
3. **Duration needs a tolerance band before learner use** — the English
   category shows two legitimate renditions of the same phrase scoring as far
   apart on duration alone as different phrases (see sanity check 4 and the
   doctrine ruling: this is a pacing gap between recording eras, never a
   human-vs-TTS property; the Welsh pairs carry no tempo evidence either way).
4. **Model-voice selection** now has a measurable handle: of the renditions of
   a phrase, prefer the one whose energy contour is most central across voices
   — that is the most copyable reading, and it is the doctrine ("maximally
   copyable by a beginner") made operational.
5. Next scale-up, if wanted: more human-vs-TTS pairs without the punctuation
   confound, and a cross-voice *different-phrase* anchor to bound the easy case.
6. **Founder direction for VAD Lab v2**: more detailed comparisons than this
   PoC's six categories — deeper coverage before the surface is treated as
   more than a first pass. Partially delivered by the v2 surface below
   (record-yourself, live contours); the beyond-pair comparison *modes* are
   an open question (see Open questions).

## VAD Lab v2 (shipped 2026-07-29, founder-commissioned)

The surface (`/admin/configs/vad`, `src/views/admin/VadLab.vue`) grew four
things; the study above is unchanged.

1. **Live contour view** (`VadContour.vue`): every pair draws both energy
   envelopes — the actual feature the DTW score compares — with a moving
   playhead synced to playback and syllable-peak ticks on the axis. In the
   DTW-aligned view the playhead and clip-B ticks are routed through the warp
   path (`bmap`), so the eye sees where the alignment put each moment of
   audio. "Trust the number" becomes "watch what the number sees".
2. **Record-yourself flow**: record an attempt against any model clip (browser
   `MediaRecorder`, Safari/iOS included), get the overlay + the three
   phrase-carrying scores immediately. Both sides are extracted by the SAME
   code (`src/views/admin/vadProsody.js`, a line-for-line JS mirror of
   `prosody.py` v2) so there is no python/JS extractor bias inside a
   comparison. Recordings save with language + self-rated proficiency +
   optional note to `s3://ssi-audio-stage/vad-lab/recordings/` via
   `/api/vad-recordings` (chunked ≤32KB POSTs — the founder's network
   corrupts larger HTTPS uploads), each with its features, scores and model
   features baked into `meta.json`. One voice at varying self-rated
   proficiency = the controlled calibration corpus the variance-band decision
   needs. Private admin tool — no learner exposure.
3. **Experimental pitch-shape track**: the contour view can show each clip's
   F0 shape in semitones relative to its own median (register-normalised).
   Display only, clearly labelled experimental, and NEVER folded into any
   score — the study's own finding (melody is voice-dominated, AUC 0.464)
   is printed on the label. This reverses the v1 decision not to ship F0
   contours in lab-data at all (founder direction); the ban that stands is on
   *scoring* melody, not on *seeing* it. Deeper per-syllable shape
   normalisation (segment F0 by syllable peaks, normalise each syllable's
   shape) is sketched but not built — the whole-utterance register-normalised
   shape is the prototype.
4. **Tempo reframing** per the doctrine ruling: no surface copy frames any
   duration gap as human-vs-TTS.

Extractor v2 (`prosody-lab-poc-2`) adds `syllable_peak_t` (peak times as
fractions of trimmed duration) for the axis ticks; lab-data now ships
`sylT` + `f0` per clip alongside the energy contour.

## Open questions (founder explicitly unsure — design notes, not commitments)

- **Beyond-pair comparison modes.** One-vs-many (a clip against every other
  rendition of its phrase), distribution views (where does this pair sit in
  its category's spread), model-voice centrality ranking at scale. The
  founder wants richer comparison than pairs eventually but is explicitly
  not sure what the right modes are — nothing here should be built until
  the record-yourself corpus has been listened to and the useful questions
  are known.
- **Calibrating the learner-vs-model difference engine into feedback.** How
  do raw distances become helpful thresholds — per-CEFR variance bands, and
  what counts as "within band" per dimension? The founder's own graded
  recordings (Spanish/Italian/French strong, Chinese decent, one voice at
  varying proficiency) are the intended input to that decision; the
  record-yourself corpus exists precisely so this question is answered from
  data, not guessed.

### Voice-sourcing policy (context for the human/TTS categories above)

All future course voices are TTS, except where quality demands otherwise:
**Welsh** (deliberately picky about quality — human-voiced, no Welsh TTS),
**Breton** (no TTS exists for it), and any language where Azure — the most
comprehensive TTS provider available; if Azure doesn't have a suitable voice,
one likely doesn't exist — has no suitable voice. This is why `human_tts_cym`
is cross-human rather than human-vs-TTS: it isn't a gap to close, it's the
policy working as intended.

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
- All Welsh audio in the estate is human-recorded (multiple voices; there is
  no Welsh TTS) and comes from a very old, deliberately slow-paced course —
  noticeably slower than modern TTS. `human_tts_cym` is therefore cross-human,
  not human-vs-TTS, and carries no valid speed/duration evidence for either
  reading; every duration/tempo claim in this doc is anchored on the English
  pair only.
- The near anchor is TTS re-renders, which are near-deterministic — it bounds
  decoder noise, not the variability of a human saying the same thing twice.
  8 of 40 sampled "re-renders" were the same file under two s3_keys and are
  excluded (`same_bytes`); the estate contains such duplicates.
- The 12 `human_tts_cym` pairs are cross-human (see above), and independently
  confounded on top of that: grouping is on punctuation-stripped text and in
  all 12 one voice is declarative while the other is the question form, so an
  intonation difference rides along with the cross-voice difference. n=12;
  treat as anecdote.
- `pause_diff` is degenerate at this phrase length (0.0 at every anchor) — it
  is uninformative here, not invariant.
- Anchor medians are 12–100 pairs per category; the direction of every result
  is large and consistent, but the exact AUCs are PoC-precision, not final.
