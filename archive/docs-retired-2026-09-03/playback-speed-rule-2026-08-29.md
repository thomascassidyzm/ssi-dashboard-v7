# Playback speed — the new rule, and what each voice now needs

**2026-08-29, evening. Popty side: landed.** Player side: handed over, not built.

---

## The rule, in four lines

| What the learner is doing | Easy | Fast |
|---|---|---|
| **Target language** (speaking practice) | **0.80** | **0.90** |
| **Known language** | 1.00 | 1.00 |
| **Listening exercises**, any language | 1.00 | 1.00 |

**The belt ramp is retired.** `white 0.8 / yellow 0.9 / orange 0.95 / green 1.0`
no longer decides anything. Speed is a function of what the learner is doing and
which setting they chose, and nothing else.

**And 0.8 means 0.8 of the language's reference pace, not 0.8 of each voice's
own pace** — otherwise a brisk voice on Easy is still faster than a measured
voice on Fast, and the setting means nothing. Each voice carries a correction
against its language's reference.

---

## The measurement, and why the old one had to go

Your correction: *"Azure voices were recorded at non 1.0x speeds so we can only
use the providers APIs for the voice as the truth - not the recordings we have
in the estate."*

So nothing is measured from our recordings any more. **One identical sentence
per language**, rendered fresh through each voice's own provider API at speed
1.0 — no rate tag, no post-processing — and timed on the bytes. Because every
voice in a language speaks the same text, length cancels exactly and the
comparison is pure duration. **No existing course clip was read, touched or
re-rendered.**

| | Spread of voice pace |
|---|---|
| Estate recordings, uncorrected (this morning) | 0.57x – 1.67x |
| Estate recordings, correcting for Azure's baked speed | 0.65x – 1.32x |
| **Provider APIs at 1.0x (this measurement)** | **0.832x – 1.241x** |

That narrowing IS the evidence your correction mattered: roughly a third of the
apparent spread was decisions we had already made, not voices.

**173 voices measured, 0 render failures** — Azure 164, ElevenLabs 2, Cartesia 2,
and the 5 xAI voices still cast on live courses.

### The reference sentence

One per language, taken from that language's own course corpus: 10–18 words, no
numerals, no abbreviations, no odd punctuation — the things providers expand or
pause on unpredictably. Examples:

| Language | Reference read | Voices | Sentence |
|---|---|---|---|
| eng | 4.19s | 18 | "I'm definitely doing better than I was last time we talked to each other." |
| fra | 5.00s | 13 | "Ça commence à sembler plus facile et je suis enthousiaste de voir comment ça avance" |
| spa | 4.82s | 16 | "pensé que la película era una basura total y quiero que me devuelvan el dinero" |
| cym | 5.38s | 2 | "Mi wnaeth hi bron â mynd ar goll achos mi wnaeth hi droi i'r chwith yn lle i'r dde." |
| jpn | 4.50s | 7 | "ニュースがオフィス全体に届くまで数時間かかった" |

All 49 languages are in `tools/voice/provider-pace-reference.json`, each with the
seed it came from, so the measurement is reproducible.

---

## What each voice now plays at (target language)

`*` = clamped at the 0.7 floor, so the correction is partial.

**Briskest, where the correction does the most work**

| Voice | Language | Pace | Easy | Fast |
|---|---|---|---|---|
| fr-FR-VivienneMultilingual | fra | 1.241 | 0.70* | 0.72 |
| pt-PT-Duarte | por | 1.186 | 0.70* | 0.76 |
| ja-JP-Keita | jpn | 1.136 | 0.70 | 0.79 |
| fr-FR-RemyMultilingual | fra | 1.130 | 0.71 | 0.80 |
| zh-CN-Yunfeng | zho | 1.125 | 0.71 | 0.80 |

**The voices you know by name**

| Voice | Language | Pace | Easy | Fast |
|---|---|---|---|---|
| gfzdpspr5fdp (your clone, "Tom") | eng | 1.127 | 0.71 | 0.80 |
| bedd6226 ("Olivia") | eng | 1.099 | 0.73 | 0.82 |
| ara (xAI) | kor + 3 more | 1.114 | 0.72 | 0.81 |
| eve (xAI) | hin + 3 more | 1.074 | 0.74 | 0.84 |
| leo (xAI) | fra + 5 more | 1.054 | 0.76 | 0.85 |
| Ximena (Cartesia) | spa | 1.104 | 0.72 | 0.81 |
| Darío (Cartesia) | spa | 1.026 | 0.78 | 0.88 |
| Aran clone, source (ElevenLabs) | eng | 1.088 | 0.73 | 0.83 |
| Aran clone, presentation (ElevenLabs) | eng | 1.050 | 0.76 | 0.86 |

**Most measured, where the correction barely moves**

| Voice | Language | Pace | Easy | Fast |
|---|---|---|---|---|
| en-US-SerenaMultilingual | eng | 0.832 | 0.96 | 1.00* |
| ca-ES-Joana | cat | 0.883 | 0.91 | 1.00* |
| de-DE-Katja | deu | 0.895 | 0.89 | 1.00* |

Only **2 voices of 173** hit the 0.7 floor on Easy — so for practically the whole
estate the correction is exact, not clipped. On Fast, the slowest voices reach
1.00 and stop there: nothing is ever played faster than it was rendered.

The multilingual xAI voices (eve, leo, ara) have no single pace, so each was
measured in every language it is actually cast in and carries the median.

---

## Money

**About 40p.** ~38,000 characters of TTS across four providers over five runs
(a probe, three dry runs while the tool was being corrected, and the applied
run). Azure at roughly $16 per million characters is the bulk of it; the
ElevenLabs, Cartesia and xAI voices are a handful of sentences each. No bulk
render, no audio pass, no course clip touched.

## Voices we could not reach — the honest gap

Two, both xAI, both declaring `mul` (multilingual) with no language we could
pick a sentence for:

- **rex** — not cast on any live course, so nothing depends on it.
- **sal** — cast as `target2` on `fin_for_eng`, which is a draft. Finnish has no
  seeded course to take a reference sentence from, so there is no Finnish
  reference to measure against either.

Both are left with `natural_pace_ratio` NULL, which the arithmetic treats as
"we have not looked" and plays at the plain target number — never as 1.0.

---

## What I'd like one word on

1. **Known and listening are 1.00x with NO per-voice correction** — "played
   exactly as rendered". Correcting a slow voice *up* would mean playing a clip
   faster than it was rendered, which nobody asked for. Your rule says "always
   1.0x" and this is the cautious reading of it.
2. **The reference is per language, not per language-and-role.** With one
   controlled sentence there is no role dimension — a voice speaks at one pace.
3. **The German reference sentence is Swiss German** (`deu_ch_for_eng`), picked
   because it was the largest German corpus. Every German voice reads the same
   sentence so the comparison is still fair, but if you'd rather the reference
   were standard German, say so and I'll re-pick and re-measure German only.
4. **Sentence choice generally**: longest clean sentence in a 30–130 character
   window from that language's biggest course. Overrule in one word and it
   re-measures.

---

## What remains, in `ssi-learning-app`

Not touched — deliberately, and it is one change with a trap in front of it.

The player's pause model infers the learner's **belt from the baked playback
speed** (`beltProgress`: 0.8 → White … 1.0 → Green). Retiring the ramp breaks
that inference. Precisely: **Easy is safe by accident** (it already pins the
Green taper at every belt, deliberately), but **Fast reads the baked speed** —
so under a flat 0.9 every Fast learner would get a mid-taper pause at every
belt, beginners shorter than today and advanced learners longer, with no error
and no alarm.

So the pause must be told the belt explicitly, as its own change that moves no
pause at all, **before** any speed change reaches the player. Then `beltSpeed()`
is deleted, the speed comes from role and mode, four test files flip, and
legacy `nativeSpeed: false` courses keep skipping every correction — their clips
already have a pace baked in, and a second correction is the Azure mistake
again.

The full handover — exact files, the signature change, the tests, and the seam
by which the player reads a voice's pace — is
`docs/per-voice-pace-learning-app-handover-2026-08-29.md`.
