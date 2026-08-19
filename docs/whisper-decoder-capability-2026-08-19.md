# Which languages can the veracity gate actually read?

*2026-08-19. Measured against `ggml-small`, the model `services/audio-veracity.cjs` uses.*

## The defect

`services/audio-veracity.cjs` maps 81 course languages to whisper ISO-639-1 codes
and gates all of them identically. whisper.cpp accepts every one of those codes —
`-l si` does not error, it decodes — so a language the model cannot transcribe
produces confident garbage rather than a failure. The gate reads that garbage as
"the words are not in this clip" and refuses the render.

For Sinhala the decode is a degenerate repetition loop, the same for every clip:

| | |
|---|---|
| text | `අද අපිට ප්‍රශ්නේ ගැන සාකච්ඡා කරන්න අවශ්‍යයි` |
| decode | `වවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවවව…` |

For Kannada the decoder transcribes the phonetics roughly correctly but emits
**Devanagari instead of Kannada script**, so the CER is ~0.7 on healthy audio:

| | |
|---|---|
| text | `ಅಂತ ಅವನು ಮಾತು ಕೊಟ್ಟ` |
| decode | `अन्ता अवनु मातू कोट्ता` |

Either way every render in those languages is refused. It blocked `eng_for_sin`
lego `S0225L01` three times.

## How the allow/deny list was decided

Two independent experiments over the 50 languages with ≥5,000 clips in
`course_audio`, ~20 live clips each. Tools committed at
`tools/whisper-capability-probe/`.

**1. Discrimination** (`probe.cjs`). Decode each clip once, free and unprimed,
then score that decode against its own text and against distractor texts from
the same language. A decoder that reads the language separates the two. A dead
one emits the same output whatever the input, so own-score and cross-score
converge. This is deliberately robust to the obvious objection that the sampled
clips might just be damaged: damaged audio lowers the score by the fraction of
clips that are damaged, it does not collapse the *separation* to zero.

**2. False negatives on audio proven complete** (`proof.cjs`). Restrict to clips
whose Azure `word_boundaries` independently record the full script as spoken,
with the last word landing at the end of the clip. For those clips the words
**are** in the audio, on evidence that never passed through whisper — so every
gate failure is a false negative by construction.

Rejected as a criterion: raw "how often does the gate fail this language". It
conflates decoder capability with real estate audio damage and with comparison
mismatches, and it put **German** — the language the 0.3 threshold was fitted on —
in the deny list. See "not a capability problem" below.

## Result

Both experiments pick out the same six, with a ~2× gap in separation to the next
language. The tell is the reason mix: these six fail almost entirely on
`cer_above_threshold` with **zero** `last_word_missing`, the signature of
unrelated output rather than of damaged audio.

| language | iso1 | separation | own CER | false negatives on proven audio |
|---|---|---|---|---|
| Sinhala | `si` | 0.062 | 0.813 | **15/15 (100%)** |
| Bengali | `bn` | 0.100 | 0.700 | **15/15 (100%)** |
| Punjabi | `pa` | 0.126 | 0.700 | **14/15 (93%)** |
| Telugu | `te` | 0.127 | 0.709 | **15/15 (100%)** |
| Gujarati | `gu` | 0.141 | 0.667 | **15/15 (100%)** |
| Kannada | `kn` | 0.147 | 0.692 | **15/15 (100%)** |
| — gap — | | | | |
| Chinese | `zh` | 0.285 | 0.689 | no proven-complete sample |
| Icelandic | `is` | 0.371 | 0.447 | 11/15 (73%) |
| …42 more | | 0.43–0.92 | ≤0.29 | |
| **controls** | `en` `hi` `es` `it` `sw` `pt` `ca` `ru` `sv` `hu` `cs` `lv` | 0.60–0.84 | 0.00–0.07 | **0/15 (0%)** |

The boundary is a script boundary, and a coherent one: Devanagari (`hi`, `mr`,
`ne`) and Tamil work; Bengali, Gurmukhi, Gujarati, Telugu, Kannada and Sinhala
scripts do not. `ggml-small` has effectively no training data for the latter set.

## Not a capability problem — deliberately still gated

Several languages fail the gate often but their decoder demonstrably works
(separation 0.37–0.66). Un-gating them here would be a different fix wearing this
one's clothes:

| lang | false negatives | actual cause |
|---|---|---|
| `de` | 67% | estate German is largely **Austrian dialect script** vs standard orthography — `"a Glasl Wossa"` → `Akklassewasser`. Separation 0.61: the decoder hears it fine. |
| `hy` | 93% | **numerals** — text `100. … 200. … 1000.` decoded correctly as `հարյուր, երկու հարյուր, հազար`. |
| `eu` | 87% | Basque **word segmentation** trips the last-word rule (`12/15` failures are `last_word_missing`). |
| `is` | 73% | genuinely sloppy transcription, but still separating at 0.37. |

These want a threshold or normalisation fix, not a capability guard. `is` is the
weakest case and is the one most worth revisiting.

Separately, `last_word_missing` fires on 20–47% of proven-complete clips in
`ro`, `no`, `ur`, `ar`, `et`, `bg`, `mr`, `fa`. On audio whose final word Azure
records as spoken to the end of the clip, that rule is producing false alarms at
a rate worth its own investigation. **Not touched here.**

## The change

`DECODER_NOT_VALIDATED = {si, bn, pa, gu, te, kn}` in `services/audio-veracity.cjs`.
A clip in one of those languages returns `checked:false`,
`reason:'unchecked_decoder_not_validated'`, `pass:null` — never `pass:true` — and
`renderChecked()` publishes it on the existing unchecked path, exactly as it
already does for a missing whisper binary. One loud warning per language per
process; the count lands in the render report's `UNCHECKED` line.

The check runs *before* the concurrency semaphore, so a blind language no longer
queues ahead of one the gate can actually read.

## Gaps

- **31 of the 81 mapped languages were never measured** — no estate audio to
  measure them with: `am az be br bs cy fi gd ha id ka kk km lb lo mk ml mn ms
  mt my oc sk sl sq tl tt uz vi yo yue`. They **keep their gate**. This is a
  deliberate departure from "skip anything unverified": unchecked audio reaching
  a learner is the worse failure (there is no staging environment between a
  render and a learner's ear), and a gate that wrongly *blocks* fails loudly and
  gets investigated — which is exactly how the Sinhala case surfaced. If one of
  them turns out to be blind, it will present the same way Sinhala did. Re-run
  `probe.cjs` once a course exists.
- **8 languages have no proven-complete sample** (`zho fra jpn tur gle pol nld
  tha`) because their rows lack usable `word_boundaries`; they rest on the
  discrimination measurement alone. `zho` at separation 0.285 is the closest to
  the line and the one to re-measure first.
- `gle` produced **zero** eligible clips under both probes — worth a look on its
  own terms; it is not evidence of anything yet.
- Sample size is 15–20 clips per language. Ample for a 0.06-vs-0.85 separation,
  thin for adjudicating a borderline case like `zh` or `is`.
- Measured against `ggml-small` only. A larger model would move this list.
- **Mispronunciation remains uncovered**, as it always was.

## Reproducing

```
node tools/whisper-capability-probe/probe.cjs --n 20      # discrimination
node tools/whisper-capability-probe/decide.cjs            # apply the rule
node tools/whisper-capability-probe/proof.cjs --n 15      # false negatives
node tools/whisper-capability-probe/verify-render-path.cjs # end-to-end, both sides
```

All four are read-only: no TTS, no writes, no deletions.
