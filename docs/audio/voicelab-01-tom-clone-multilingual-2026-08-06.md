# VOICELAB 01 — Tom's clone in German and French

*2026-08-06. Voice `gfzdpspr5fdp` (Tom's xAI clone). Small-sample capability probe. Nothing was written to `course_audio`, no slot was bound, nothing was deleted.*

## What this is, in one line

Twenty-one fresh clips of Tom's own voice clone speaking German, French and Spanish — plus the production voice saying the same sentences next to it — so his ear can settle whether the July 2026 rejection of the clone in non-English still stands.

## The verdict, up front

**The July rejection and this evidence answer different questions, and both answers are useful.**

- **Plain target-language rendering (Condition A): clean, 15 of 15.** Every clip came back detected as the language it was meant to be, transcribed word-for-word against its reference, and sat inside normal duration and tail behaviour. On the French sentences the clone transcribed *more* accurately than the voice French learners hear today.
- **The July shape — one voice speaking an English intro with the target form inside it (Condition B): still a lottery.** Two of twelve English-steered takes mangled the target chunk ("un peu fatigué" → *"ompe fatiguée"*; "ein bisschen müde" → *"ein Bischenmutter"*). Six of six takes of the same lines rendered with the language steered to the target instead came back clean.
- **The phonology gate does not see Condition B at all.** It only arms when the render is steered to a non-English language, and the July shape is steered to English. So the one construction that actually fails is the one construction the estate's automatic defence is blind to. That is a first-class finding on its own.

## Side by side with July

The verdict on the books, verbatim, from `docs/presentation-authoring-redesign.md` line 50:

> **Piloted and REJECTED 2026-07-05:** a single multilingual voice speaking the whole intro *including* the target form. Tom's ear test: the clone needs "priming" to render target languages reliably — not worth the uncertainty across the whole course suite. Clips: `~/Desktop/presentation-pilot/`.

| | July 2026-07-05 | This run, 2026-08-06 |
|---|---|---|
| What was tested | one intro clip, English frame **plus** the target form, one voice | the same shape (Condition B) **and**, separately, plain target-language sentences (Condition A) |
| Language steering | English (the intro is an English clip) | Condition B English — as July. Condition A steered to the target language |
| Judged by | Tom's ear | machine floor here; **Tom's ear still decides** — clips below |
| Result | rejected | Condition B reproduces the July failure at roughly 1 take in 6. Condition A shows no failure at all |

**They do not contradict each other.** July rejected a *construction*; it did not test plain target-language rendering, and nothing in the July note claims it did. The honest reading is: the July verdict on the intro-with-target-form shape survives this run, and the separate question Tom raised on 2026-08-06 — is the clone capable in non-English — comes back positive on this sample, at the machine floor, pending his ear.

**Explicit gap:** the July clips at `~/Desktop/presentation-pilot/` are on Tom's Mac and are not on this host. I could not listen to them and have not inferred what they sounded like.

**Second explicit gap:** the brief suggested Spanish, Japanese and Korean might be covered by the July work, on the strength of commit `12fb9b16` ("Tom-clone audio manifest for spa/jpn/kor"). I opened that manifest: all 48,992 rows are `role: known` or `presentation`, `language: eng`. It is the clone speaking **English** in those three courses — not evidence of cross-language capability. So the evidence for what July covered beyond the intro shape is thin, and I say so rather than padding. German and French got the full two-condition treatment; Spanish got a short three-clip probe anyway, because its production voice is Azure and a clone-versus-Azure comparison is the most decision-relevant extra available.

---

## German — `deu_for_eng`

Production voice today: **ara** (xai).

### Condition A — plain German course sentences

**seed 1** — "I want to speak German with you now"

> Ich will jetzt mit dir Deutsch sprechen

*first seed of the course; ch + r*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a1-clone.mp3

Production voice today (ara):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a1-baseline.mp3

**seed 3** — "how to speak as often as possible"

> wie man so oft wie möglich spricht

*ö + final -cht cluster*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a2-clone.mp3

Production voice today (ara):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a2-baseline.mp3

**seed 10** — "I'm not sure if I can remember the whole sentence"

> Ich bin mir nicht sicher, ob ich mich an den ganzen Satz erinnern kann

*long; four ich-sounds; rolled/uvular r*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a3-clone.mp3

Production voice today (ara):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a3-baseline.mp3

**seed 12** — "I wouldn't like to guess what's going to happen tomorrow"

> Ich möchte nicht raten, was morgen passieren wird

*ö + initial r*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a4-clone.mp3

Production voice today (ara):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a4-baseline.mp3

**seed 39** — "but I'm a little tired this morning"

> aber ich bin heute Morgen ein bisschen müde

*ü — the classic English-accent tell*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a5-clone.mp3

Production voice today (ara):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a5-baseline.mp3

**seed 26 USE** — "But I like the feeling of speaking German with others"

> Aber ich mag das Gefühl, Deutsch mit anderen zu sprechen

*USE phrase; ü + ch + comma clause*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a6-clone.mp3

Production voice today (ara):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-a6-baseline.mp3

### Condition B — the July shape: English intro with the German inside it

> The German for 'I want' is — ich will

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-b1-clone.mp3

Whisper heard: *"The German for "I want" is "ich will"."*

> The German for 'a little tired' is — ein bisschen müde

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-b2-clone.mp3

Whisper heard: *"Der German für "a little tired" ist ein bisschen müder."*

> The German for 'as often as possible' — as in — 'how to speak as often as possible' — is — so oft wie möglich

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-b3-clone.mp3

Whisper heard: *"Die Deutschen für "as often as possible", "as in" "how to speak as often as possible" ist so oft wie möglich."*

**Repeat takes of the failing line, and the steering test.** The same text rendered three times as the presentation path does it (steered English), and three times steered to the target language instead:

- steered **en**, take 1 — **MISS**: *"Der German für "little tired" ist ein Bischenmutter."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-b2-steeren-t1.mp3

- steered **en**, take 2 — clean: *"Der German für "a little tired" ist ein bisschen müder."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-b2-steeren-t2.mp3

- steered **en**, take 3 — clean: *"Der German für "a little tired" ist ein bisschen müder."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-b2-steeren-t3.mp3

- steered **de**, take 1 — clean: *"Der German für "a little tired" ist "ein bisschen müde"."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-b2-steerde-t1.mp3

- steered **de**, take 2 — clean: *"Der German für "a little tired" ist ein bisschen müder."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-b2-steerde-t2.mp3

- steered **de**, take 3 — clean: *"Der German für "a little tired" ist ein bisschen müder."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/deu-b2-steerde-t3.mp3

---

## French — `fra_for_eng`

Production voice today: **eve** (xai).

### Condition A — plain French course sentences

**seed 1** — "I want to speak French with you now"

> Je veux parler français avec toi maintenant

*first seed; nasal -ain, French r*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a1-clone.mp3

Production voice today (eve):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a1-baseline.mp3

**seed 10** — "I'm not sure if I can remember the whole sentence"

> Je ne suis pas sûr de pouvoir me souvenir de toute la phrase

*long; u vs ou contrast*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a2-clone.mp3

Production voice today (eve):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a2-baseline.mp3

**seed 26** — "I like feeling as if I'm nearly ready to go"

> j'aime avoir l'impression d'être presque prêt à partir

*nasals + elision + liaison*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a3-clone.mp3

Production voice today (eve):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a3-baseline.mp3

**seed 37** — "I started to think about it carefully last month"

> j'ai commencé à y réfléchir attentivement le mois dernier

*nasal en/an, r-clusters*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a4-clone.mp3

Production voice today (eve):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a4-baseline.mp3

**seed 39** — "but I'm a little tired this morning"

> mais je suis un peu fatigué ce matin

*un + eu + in nasals*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a5-clone.mp3

Production voice today (eve):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a5-baseline.mp3

**seed 22 USE** — "because I want to meet people who speak French"

> parce que je veux rencontrer des gens qui parlent français

*USE phrase; gens/français nasals, liaison*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a6-clone.mp3

Production voice today (eve):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-a6-baseline.mp3

### Condition B — the July shape: English intro with the French inside it

> The French for 'I want' is — je veux

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-b1-clone.mp3

Whisper heard: *"Le français pour "I want" est "je veux"."*

> The French for 'a little tired' is — un peu fatigué

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-b2-clone.mp3

**Whisper heard the target chunk as** *"Le français pour "un petit peu connu" c'est "ompe fatiguée""* — the chunk collapsed.

> The French for 'as often as possible' — as in — 'how to speak as often as possible' — is — aussi souvent que possible

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-b3-clone.mp3

Whisper heard: *"Le français pour "As often as possible", "As in how to speak as often as possible" est aussi souvent que possible."*

**Repeat takes of the failing line, and the steering test.** The same text rendered three times as the presentation path does it (steered English), and three times steered to the target language instead:

- steered **en**, take 1 — clean: *"Le français pour « A little tired » est un peu fatigué."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-b2-steeren-t1.mp3

- steered **en**, take 2 — clean: *"Le français pour "un peu froid" est "un peu fatigué"."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-b2-steeren-t2.mp3

- steered **en**, take 3 — clean: *"Le français pour "un peu fatigué" est "un peu fatigué"."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-b2-steeren-t3.mp3

- steered **fr**, take 1 — clean: *"Le français pour « a little tired » est un peu fatigué."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-b2-steerfr-t1.mp3

- steered **fr**, take 2 — clean: *"Le français pour « a little tired » est un peu fatigué."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-b2-steerfr-t2.mp3

- steered **fr**, take 3 — clean: *"Le français pour « « A little tired » is « un peu fatigué »."*

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/fra-b2-steerfr-t3.mp3

---

## Spanish — `spa_for_eng`

Production voice today: **es-ES-ElviraNeural** (azure).

### Condition A — plain Spanish course sentences

**seed 1** — "I want to speak Spanish with you now"

> quiero hablar español contigo ahora

*first seed; ñ + tapped r*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/spa-a1-clone.mp3

Production voice today (es-ES-ElviraNeural):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/spa-a1-baseline.mp3

**seed 10** — "I'm not sure if I can remember the whole sentence"

> no estoy seguro de si puedo recordar toda la frase

*long; rr/r contrast*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/spa-a2-clone.mp3

Production voice today (es-ES-ElviraNeural):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/spa-a2-baseline.mp3

**seed 37** — "I started to think about it carefully last month"

> empecé a pensar en eso con cuidado el mes pasado

*peninsular c/z, unstressed vowels*

Tom's clone:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/spa-a3-clone.mp3

Production voice today (es-ES-ElviraNeural):

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/voicelab/01-tom-clone-2026-08-06/spa-a3-baseline.mp3

---

## The machine numbers

Every clip, measured with the estate's own instruments: whisper auto-detect (the same call the xAI phonology gate makes in `services/tts-service.cjs`), whisper transcription against the reference text as a word error rate, and the tiered checks in `services/audio-intelligence/` (`decode`, `tiers/vad`, `tiers/energy`, `tiers/duration`).

| clip | cond | steered | whisper heard | WER | total s | speech s | lead sil | tail sil | tail ratio dB | abrupt cut |
|---|---|---|---|---|---|---|---|---|---|---|
| `deu-a1` clone | A | de | de | 0 | 1.87 | 1.62 | 0.09 | 0.16 | -97.6 | no |
| deu-a1 baseline `ara` | A | — | de | 0 | 1.92 | 1.84 | 0.07 | 0.01 | -92 | no |
| `deu-a2` clone | A | de | de | 0 | 2.28 | 2.19 | 0.09 | 0 | -60.5 | no |
| deu-a2 baseline `ara` | A | — | de | 0 | 2.02 | 1.96 | 0.06 | 0 | -103.5 | no |
| `deu-a3` clone | A | de | de | 0 | 3.77 | 3.35 | 0.11 | 0.3 | -81.6 | no |
| deu-a3 baseline `ara` | A | — | de | 0 | 3.5 | 3.23 | 0.07 | 0.2 | -88.1 | no |
| `deu-a4` clone | A | de | de | 0 | 2.76 | 2.5 | 0.12 | 0.13 | -53.3 | no |
| deu-a4 baseline `ara` | A | — | de | 0 | 2.57 | 2.34 | 0.08 | 0.14 | -94.6 | no |
| `deu-a5` clone | A | de | de | 0 | 2.38 | 2.1 | 0.1 | 0.17 | -94.6 | no |
| deu-a5 baseline `ara` | A | — | de | 0 | 2.3 | 2.04 | 0.09 | 0.17 | -83.2 | no |
| `deu-a6` clone | A | de | de | 0 | 3.17 | 2.81 | 0.07 | 0.28 | -88.3 | no |
| deu-a6 baseline `ara` | A | — | de | 0 | 3.1 | 2.81 | 0.08 | 0.2 | -99.4 | no |
| `deu-b1` clone | B | en | en | 0 | 3.1 | 2.87 | 0.07 | 0.16 | -93.6 | no |
| `deu-b2` clone | B | en | en | 0 | 4.13 | 3.88 | 0.07 | 0.18 | -99 | no |
| `deu-b3` clone | B | en | en | 0 | 7.66 | 7.41 | 0.11 | 0.14 | -85.6 | no |
| `fra-a1` clone | A | fr | fr | 0 | 2.18 | 1.94 | 0.08 | 0.16 | -78 | no |
| fra-a1 baseline `eve` | A | — | fr | 0 | 2.16 | 2.08 | 0.07 | 0.01 | -79.7 | no |
| `fra-a2` clone | A | fr | fr | 0 | 3.07 | 2.79 | 0.09 | 0.2 | -69.8 | no |
| fra-a2 baseline `eve` | A | — | fr | 0.077 | 3.12 | 2.92 | 0.07 | 0.14 | -101 | no |
| `fra-a3` clone | A | fr | fr | 0 | 3.02 | 2.79 | 0.07 | 0.16 | -61.3 | no |
| fra-a3 baseline `eve` | A | — | fr | 0 | 2.83 | 2.74 | 0.08 | 0.01 | -38.4 | no |
| `fra-a4` clone | A | fr | fr | 0 | 3 | 2.48 | 0.09 | 0.43 | -73.2 | no |
| fra-a4 baseline `eve` | A | — | fr | 0 | 3.12 | 2.92 | 0.06 | 0.15 | -100 | no |
| `fra-a5` clone | A | fr | fr | 0 | 2.06 | 1.77 | 0.12 | 0.17 | -79.7 | no |
| fra-a5 baseline `eve` | A | — | fr | 0.125 | 1.94 | 1.85 | 0.08 | 0.01 | -77.3 | no |
| `fra-a6` clone | A | fr | fr | 0 | 2.64 | 2.17 | 0.1 | 0.37 | -53.3 | no |
| fra-a6 baseline `eve` | A | — | fr | 0 | 2.64 | 2.42 | 0.08 | 0.14 | -82.6 | no |
| `fra-b1` clone | B | en | en | 0 | 3.12 | 2.83 | 0.09 | 0.2 | -71.7 | no |
| `fra-b2` clone | B | en | en | 0.3 | 3.96 | 3.72 | 0.08 | 0.16 | -88.2 | no |
| `fra-b3` clone | B | en | en | 0 | 8.28 | 8.04 | 0.1 | 0.14 | -90.8 | no |
| `spa-a1` clone | A | es | es | 0 | 2.02 | 1.7 | 0.08 | 0.23 | -62.5 | no |
| spa-a1 baseline `es-ES-ElviraNeural` | A | — | es | 0 | 3.35 | 2.52 | 0.04 | 0.78 | -103.2 | no |
| `spa-a2` clone | A | es | es | 0 | 3.17 | 2.85 | 0.09 | 0.23 | -89 | no |
| spa-a2 baseline `es-ES-ElviraNeural` | A | — | es | 0 | 4.25 | 3.46 | 0.02 | 0.76 | -101.8 | no |
| `spa-a3` clone | A | es | es | 0 | 3.36 | 3.06 | 0.07 | 0.23 | -74 | no |
| spa-a3 baseline `es-ES-ElviraNeural` | A | — | es | 0 | 4.1 | 3.27 | 0.05 | 0.79 | -101.1 | no |

Reading it: every Condition-A clone clip is `WER 0` and detected as its own language, with no abrupt cut anywhere. The two non-zero baseline WERs are the **production French voice** (`eve`, 0.077 and 0.125) — on this sample the clone transcribes cleaner than the voice French learners hear today. The Spanish Azure baselines carry ~0.78 s of tail silence against the clone's ~0.23 s, which is a padding difference, not a quality one.

**Did the phonology gate fire?** No — not once, on any clip. On Condition A it armed (steered language non-English) and every take passed first time, so no re-roll was needed. On Condition B it never armed at all, because that render is steered to English. Recorded here because a gate that cannot see the one failing construction is a finding, not a footnote.

## What these instruments cannot tell you

All of the above is a **floor**. It can prove a clip is broken; it cannot prove a clip is good, and none of it can hear whether the voice still sounds like Tom.

- Whisper transcription passes wrong-voiced clips verbatim — the fra English-in-French clips from the August audio work transcribe perfectly.
- The acoustic tiers check bytes: duration, energy decay, speech span. They are blind to accent, to identity and to whether a learner would want to copy the sound.
- Whisper is noisy in its own right. It rendered "müde" as "müder" in almost every German take; that is the transcriber, not the voice.

So: **the verdict on quality is Tom's ear.** Everything here exists to make that listen fast, not to pre-empt it.

## Capability records

In the shape the voice-as-person frame asks for — a fact about a clone-version in a language and a role-class, dated, with its method named, and re-openable.

**Person:** Tom Cassidy. **Clone-version:** xAI `gfzdpspr5fdp` as served on 2026-08-06. **Method:** 21 clips, real course sentences from `deu_for_eng` / `fra_for_eng` / `spa_for_eng`, rendered through `services/tts-service.cjs` `generate(text, 'xai', …)` first take, measured with whisper auto-detect + forced-language transcription + `services/audio-intelligence` tiers, published for ear test.

| Language | Role class | Machine-floor finding, 2026-08-06 | Status |
|---|---|---|---|
| German | target-language example audio | 6/6 clean, WER 0, detected `de`, no gate fire | **provisionally capable — awaiting Tom's ear** |
| German | narration / known-side | not tested here; the clone already voices English narration in production | established, unchanged |
| German | mixed English-frame-with-target-form | 1 miss in 4 English-steered takes; 3/3 clean when steered `de` | **not capable as currently rendered** |
| French | target-language example audio | 6/6 clean, WER 0, detected `fr`, beat the production voice on WER | **provisionally capable — awaiting Tom's ear** |
| French | mixed English-frame-with-target-form | 1 miss in 4 English-steered takes; 3/3 clean when steered `fr` | **not capable as currently rendered** |
| Spanish | target-language example audio | 3/3 clean, WER 0, detected `es`, tighter tails than the Azure baseline | **provisionally capable — awaiting Tom's ear**, thin sample |

The two bars apply as Tom set them: narration only has to be clearly understandable and may carry a bit of an accent; target-language example audio has to be the exact sound a learner copies. Nothing here can tell the two apart — only his ear can, and the clips above are ordered so he can listen straight down the page.

## My recommendation

**On the plain target-language question I hold a position: the July verdict does not cover it, and on this evidence there is nothing stopping the clone from voicing German and French target audio.** The machine floor is spotless, the French clone out-transcribes the incumbent voice, and the failure mode July found does not appear once in fifteen Condition-A clips. If Tom's ear agrees on the accent, this is a green light.

**On the July shape I also hold a position: keep it rejected, but for a reason we now understand.** The failure is not "the clone cannot do German" — it is that a mixed-language render steered to English drops into English phonology on the target chunk, intermittently, and the phonology gate is structurally blind to it. Steering the render to the target language cleared 6 of 6, which is a lead worth pulling on, not a proof. The design already in the redesign doc — the intro ends at "is —" and the target form comes from the existing target clip — sidesteps the whole problem for free, so there is no reason to spend on rescuing the mixed shape.

**What I cannot hold a position on** is whether the accent is good enough to be the sound a learner copies. That is exactly the taste call the instruments cannot reach, and I am not going to fabricate a verdict on it. It is one listen down the page above.

## What this run cost

| | characters | cost |
|---|---|---|
| xAI renders — clone + xAI baselines + repeat takes | 2365 | **$0.0355** (~£0.03) |
| Azure Spanish baseline | 133 | ~$0.002 |

xAI TTS at $15 per 1M characters — the figure verified 2026-07-28 (`6b5e3bed`), not the older estimate the repo carried, which was 3.6× low.

## What a full re-voice would cost — estimate, order of magnitude only

Target-side text in the two courses, counted live from `course_seeds` + `course_legos` + `course_practice_phrases`:

| Course | target text rows | characters | one voice | two target voices |
|---|---|---|---|---|
| `deu_for_eng` | 16,164 | 507,041 | ~$7.61 | ~$15.21 |
| `fra_for_eng` | 18,219 | 484,752 | ~$7.27 | ~$14.54 |

So **re-voicing both German and French target sides onto the clone is roughly $15 for one voice each, or $30 if both target1 and target2 move** — clearly marked as an estimate: it counts distinct text rows once, ignores retries and the pace/tail passes, and assumes no re-render of the known side. The door this opens is a cheap one. The cost that matters is not the money; it is the make-before-break discipline on the swap.

## Housekeeping

Clips live at `s3://ssi-audio-stage/mastered/voicelab/01-tom-clone-2026-08-06/`. They sit under the `mastered/` prefix because that is the only prefix the bucket policy serves publicly — an explicit gap: a cleanly-named `voicelab/` prefix returns 403 and making it public is a bucket-policy change I did not make unilaterally. No `course_audio` row references any of these objects, nothing was bound, and nothing was deleted.

Probe source: `scripts/voicelab-01/` (gitignored workspace). Raw measurements: `results.json`, `repeat.json`.
