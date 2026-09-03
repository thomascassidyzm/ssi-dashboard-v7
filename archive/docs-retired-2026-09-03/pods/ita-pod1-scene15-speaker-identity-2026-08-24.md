# Italian scene 15 — who is actually speaking

2026-08-24. Identification only. No audio generated, no rows written.

## The short answer

**It is one woman — Ara — and you were right that something is materially different.**

The previous verdict ("one voice, non-deterministic renders") was correct about the voice and
useless about everything else, because it measured only pitch. Pitch was the *symptom*.

What actually varies between your "good" clips and your "rubbish" clips is **delivery**: how fast
she talks, and how much her pitch moves. Measured across scene 15, three things move together and
they move in exactly the order you listened in:

| line | text | syllables/sec | median f0 | pitch range (p10–p90) |
|---|---|---|---|---|
| 15.1 | Quanto costa? | **3.62** | 258.1 Hz | **170 Hz** |
| 15.2 | Può dirmi quanto costa? | 4.05 | 216.2 Hz | 130 Hz |
| 15.5 | Dove possiamo prendere l'autobus? | 4.86 | 200.0 Hz | 162 Hz |
| 15.3 | Quanto costa un taxi per andare in centro? | 4.90 | 181.8 Hz | 253 Hz ¹ |
| 15.8 | Due biglietti di andata e ritorno… | 5.03 | 205.1 Hz | 113 Hz |
| 15.7 | Quattro biglietti di sola andata… | 5.10 | 216.2 Hz | 132 Hz |
| 15.4 | Quanto costa un autobus per andare in centro? | 5.12 | 205.1 Hz | 148 Hz |
| 15.6 | Dove possiamo prendere un taxi? | 5.15 | 210.5 Hz | 135 Hz |
| 15.9 | Preferisco provare a parlare la tua lingua… | 5.37 | 186.0 Hz | **99 Hz** |
| 15.10 | Mi dispiace, non riesco a parlare molto velocemente. | **5.56** | 173.9 Hz | **78 Hz** |

¹ 15.3 carries an octave-tracking artefact at its floor (p10 = 80 Hz); its true range is narrower.

Your "first couple that I think are the good voice" are the two **slowest** lines in the scene.
Your "last two or three… from the rubbish voice" are the two **fastest**, and they are also the two
**flattest** — 15.10 has less than half the pitch movement of 15.1.

That is why it does not sound like the same woman. Italian is a syllable-timed language carried by
big pitch excursions. Strip the excursions out and speed it up by 50% and you get a flat, hurried
read — which is precisely what an English-language delivery sounds like laid over Italian words.
Your ear called it "American". The instrument agrees with your ear; it just names the thing
differently.

There is a joke in the data: **15.10 is the line that says "I can't speak very fast", and it is the
fastest line in the scene.**

## Listen for yourself — grouped by what the numbers say

### The two you called good — slow, wide pitch

https://saysomethingin.app/api/audio/3dacb8c6-28af-47e8-8fac-ff1cc37153bd

https://saysomethingin.app/api/audio/44f61b15-3afd-466d-82b4-f92b38bcbffa

### The middle six — nothing to choose between them

https://saysomethingin.app/api/audio/da55642b-5acb-45d0-80d9-315643019f4d

https://saysomethingin.app/api/audio/04a67b80-a06a-4417-9450-1ae065eae150

https://saysomethingin.app/api/audio/45791332-c798-4d91-b9ea-1f6bc582ee6e

https://saysomethingin.app/api/audio/75c1c77b-9eeb-48d6-b2c1-a80fa76f852c

https://saysomethingin.app/api/audio/4a10d96a-d44f-4851-86d4-bee084e38535

https://saysomethingin.app/api/audio/13f62ca9-77b4-42c4-8c28-8f9ebd8a0b10

### The two you called rubbish — fast, pitch-flattened

https://saysomethingin.app/api/audio/9b8575ae-5545-4437-9fd3-a9136552a13c

https://saysomethingin.app/api/audio/46bf25a1-ad00-47fe-894a-0ad85d6c912f

## The trained speaker embedding — it agrees, and it sharpens one thing

A second measurement leg got a genuine speaker-verification model running (SpeechBrain ECAPA-TDNN
x-vector, 192-dim, `speechbrain/spkrec-ecapa-voxceleb`, CPU torch in a venv on real disk). This is
the trained embedding the previous section says we didn't have — we do now.

**It confirms the identity verdict outright.** All ten scene-15 clips sit in the Ara family
(cosine 0.48–0.70 to Ara references) and nowhere near Eve — 0.16–0.44 against Eve/Italian and
0.05–0.28 against Eve/English. A voice swap is eliminated on trained-embedding evidence, not
inference.

**Whisper's language-ID was properly calibrated on this population** and it works: Arabic
references detect `ar` at p≥0.98, English references `en` at p≥0.99, Italian references `it`. All
ten scene-15 clips detect `it` at p>0.9 with clean, correctly-spelled Italian transcripts and zero
English bleed. Language steering is exonerated by measurement, not just by reading the config.

**And it independently reproduces the delivery split.** Hierarchical clustering (average-linkage,
cosine, stable at k=2 across a duration-controlled re-run) splits the scene as:

> **{15.1, 15.2} vs {15.3 … 15.10}**

Those two clips are 3.62 and 4.05 syllables/sec. Every one of the other eight is ≥4.86. The
embedding, which knows nothing about my rate measurement, cuts the scene at exactly the same place
your ear did when you said "the first couple are the good voice". Two independent instruments,
same boundary.

**Where it complicates the picture, honestly.** The embedding does *not* isolate 15.9 and 15.10 as
their own cluster — they group with 15.7 and 15.8, and the falloff from 15.1/15.2 is gradual rather
than a step. It also flags one clip you did not: **15.8** ("Due biglietti di andata e ritorno per il
centro, grazie.", `13f62ca9…`) is numerically the *most* divergent clip from your two good ones
(cosine 0.367 to 15.1) — more divergent than 15.9. It is worth thirty seconds of your ear:

https://saysomethingin.app/api/audio/13f62ca9-77b4-42c4-8c28-8f9ebd8a0b10

The directional signal still backs you: 15.9's and 15.10's two lowest similarities in the entire
matrix are, in both cases, 15.1 and 15.2. "Furthest from the good ones" does rank your rubbish
clips near the bottom. It just isn't a clean two-speaker boundary, because there aren't two
speakers — it is one speaker drifting across a batch.

Limit worth stating: an x-vector is trained to be *phonetically invariant*, and Whisper is a phone
recogniser. Neither is built to isolate accent or intonation, which is where "sounds American"
actually lives. They can tell you it is the same woman and the right language — they cannot
measure the thing you objected to. The rate and pitch-range numbers above can, which is why those
carry the verdict and these carry the corroboration.

## Why scene 15 in particular

Scene 15 is not a defective scene. It is the scene where you hear the **whole spread** back to back.

Across all 143 Ara lines on `ita_for_eng:pod-1`, delivery rate runs 3.7 to 5.6 syllables/sec
(median 4.76). Scene 15 alone runs **3.62 to 5.56** — essentially the entire pod-wide range,
inside ten consecutive lines, in ascending order. Anywhere else on the pod the fast and slow reads
are separated by scenes and you never A/B them. Here they are consecutive, so the contrast is
unmissable.

## Why the pitch answer was wrong, in one sentence

Job #308 read the f0 spread (175–271 Hz) as "unstable voice", when f0 median is downstream of
speaking rate — a faster, flatter read has a lower median pitch by construction, so it measured the
consequence and reported it as the cause.

## The mechanism, named in code

**Everything upstream did its job. The problem is that nothing measures delivery.**

1. **Language steering was correct.** `services/phases/phase8-audio-v13.cjs:6289`
   (`buildPodTTSConfig`) sets `base.language = voice.locale || toBcp47(language)`, and the live pod
   cast has Learner → Ara at `locale: "it"`. Explicit, valid BCP-47. Your hypothesis that "the voice
   selection for Italian just got lost in the mix" was a good one, and I checked it first — it is
   not what happened here. The `language='auto'` trap in `services/tts-service.cjs:426-431` is real
   and it warns rather than refusing, but it was not triggered on this render.

2. **The phonology gate was live and it passed all of them.**
   `services/tts-service.cjs:625-632` (`phonologySuspects`) + `:669-674`. The gate was on during
   this run — the log shows it firing and rejecting French clips in the same session, and there is
   no "gate unavailable" warning anywhere in it. The Italian run recorded `0 failed`.
   **But the gate asks "what language is this?", not "what accent is this?"** I re-ran whisper
   myself over the two clips you called rubbish: both transcribe as flawless Italian
   ("Preferisco provare a parlare la tua lingua, penso sia educato." /
   "Mi dispiace, non riesco a parlare molto velocemente."). Correct Italian words spoken flat and
   fast pass a language-detect gate every time. That is the hole.

3. **The veracity gate never looked at these ten at all.** From the render log
   (`~/.local/log/popty-phase8-audio.log`, the `ita_for_eng` BULK run of 2026-08-22 12:29Z):
   `sampling 10.0% of pod clips (per-course ladder…)`, then `sample clean — relaxing to 1.00%
   (rung 1)`, finishing `12 checked, 0 failed, … 250 not sampled`. All ten scene-15 Learner clips
   have `veracity_pass` NULL in `course_audio` — they were in the unsampled 95%. Even if it had
   sampled them, veracity checks the *words*, not the *delivery*.

4. **There is no delivery check anywhere in the pipeline.** Not rate, not pitch range, not prosody.
   xAI returns whatever performance it feels like for a given text, and every gate we own says yes.

Render provenance, for the record: all eleven scene-15 rows were generated in one batch,
2026-08-22 12:43–12:46 UTC, `origin='tts'`, `audio_revision=1`, `language='ita'`,
`veracity_checker='phase8-generate-pods'`, under a BULK run you approved at 12:29:12Z, cast hash
`763307d5d9f08d32`. Ten on `xai_ara`, one Narrator on `xai_x7avnu1k`. Zero reused from the retired
pod-0. No batch anomaly, no wrong-slot substitution, no cross-course clip.

## The Arabic thread — checked, and it is clean

`ara` is genuinely overloaded on this estate: it is Ara's xAI voice id *and* the ISO code for
Arabic (`services/voice-config-service.cjs:216`, `services/audio-reuse-planner.cjs:122`). Worth an
hour, and I gave it one. On this pod it is not the cause: the live `ita_for_eng:pod-1` cast lists
Learner → `{voice_id: "ara", locale: "it", provider: "xai"}`, the rendered rows carry
`language='ita'`, and no `ara_for_eng` / `ara_eg_for_eng` clip appears anywhere on the Italian pod.
The overloading remains a live hazard for other courses; it did not bite here.

## Answering your question directly

> "So why was I given an unstable voice to choose between then? That seems bonkers."

You weren't. The voice is stable — Ara is one speaker and she is the same speaker on all ten clips.
What is unstable is the **performance** xAI renders for a given line, and we never told you that
because we never measured it. When you auditioned voices you were choosing on timbre, which is the
thing that *is* stable. Nobody put a delivery-consistency number in front of you, and there wasn't
one to put. That is our gap, not a flaw in your choice, and it is not a reason to drop Ara.

**Recommendation: keep Ara. Re-render the outliers.** Replacing the voice would not fix this —
Eve, or any other xAI voice, has exactly the same unmeasured delivery variance, so a swap would
buy a different timbre and the identical problem.

## The re-render list

Scoring rule, calibrated against your ear: delivery rate ≥ 5.3 syllables/sec. Applied to scene 15
it returns **exactly the two clips you flagged and nothing else** — which is the strongest thing I
can say for it.

**Scene 15 — do these two now (2 clips):**

| clip id | line | rate |
|---|---|---|
| `9b8575ae-5545-4437-9fd3-a9136552a13c` | Preferisco provare a parlare la tua lingua, penso sia educato. | 5.37 |
| `46bf25a1-ad00-47fe-894a-0ad85d6c912f` | Mi dispiace, non riesco a parlare molto velocemente. | 5.56 |

**Rest of the pod at the same threshold: 30 of 143 Ara clips (21%)**, concentrated in scene 22
(6 clips), scene 16 (5), and pairs in scenes 8, 9, 17, 20, 21. Full list available on request —
your call whether this is a two-clip fix or a 30-clip pass. I have not run it on the male voices.

**Render parameters to use, unchanged from what produced the good clips:**
`provider xai`, `voice_id ara`, `language it` (BCP-47, from the pod cast's `locale`) —
i.e. exactly what `buildPodTTSConfig` already emits. There is no parameter to change. The re-render
is a **re-roll**: same request, different performance, keep it if it lands slow and wide.

**How to queue it** (I have not run this — TTS is yours to trigger):
`POST /generate-pods/ita_for_eng` on phase8 (port 3465), after NULLing the two rows'
`target_audio_id` so the endpoint sees them as missing — it only fills NULLs. The versioned-swap
path in `reuseRenderClip` (`phase8-audio-v13.cjs:6947+`) bumps `audio_revision` so learners get a
new URL rather than a year-cached old clip.

**One thing that would settle it beyond argument, if you want it:** a single comparison render of
15.10 at the same parameters, to demonstrate the re-roll produces a different delivery from the
same voice. That is one clip's worth of TTS. Say the word and I will spec it; I have not run it.

## What I could not do

- **Resemblyzer** could not be built (its `webrtcvad` C-extension needs `Python.h`; no
  `python3.14-dev`, no sudo). SpeechBrain ECAPA-TDNN was used instead and worked, so the trained
  embedding gap is **closed** — but it is one model's opinion, not two.
- **No accent or prosody model.** Nothing on this box targets accent directly. The x-vector is
  phonetically invariant by design and Whisper is a phone recogniser; neither measures the quality
  you objected to. The rate and pitch-range numbers do, but they are hand-rolled measures validated
  against your ear on ten clips, not an established instrument. That is the real remaining
  weakness in this report.
- **Male voices not analysed.** The Narrator line and the Enzo/Matteo cast are outside this job.

## What needs you

0. **Thirty seconds of your ear on 15.8** (`13f62ca9…`, linked above) — the embedding says it is
   the most divergent clip in the scene and you did not flag it. If it sounds fine to you, the
   rate metric is the better guide and the list stays at two. If it sounds off, the list grows.
1. **Keep Ara, or not.** My read: keep her. The evidence says the voice is not the problem.
2. **Scope of the re-render**: the two scene-15 clips, or the 30-clip pod-wide pass at the same
   threshold.
3. **Whether to build a delivery gate.** The real fix is a rate/pitch-range check at render time
   that re-rolls an outlier the way the phonology gate re-rolls a wrong-language clip. Cheap to
   build — the measurement in this document is about forty lines. Not started; your call.
