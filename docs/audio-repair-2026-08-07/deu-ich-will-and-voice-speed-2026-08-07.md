# German first rounds — the "ich will" defect and the voice speed

*2026-08-07, watson-1. Findings only — nothing was re-rendered, nothing was written to the database, nothing was deleted. Aran reported the defect by WhatsApp at 12:52 today; this is the answer to it.*

---

## The short version

**Aran is right on both counts, and they are two different faults.**

1. **"Ich will" on its own really is missing its /l/, and it is not a broken pipeline.** The clip is not cut off. Nothing of ours trimmed it. The xAI voice simply holds the vowel of *will* for a quarter of a second and fades out without ever closing the /l/. That is the voice's behaviour on a short isolated utterance — the thing Tom guessed at, only more extreme than a "dropped l": there is no lateral gesture in the file at all.

2. **The German voices are not at 0.8×, and they were never going to be.** The 0.8× is a *playback* setting in the learner app, not a render setting. The German clips were rendered at the voice's natural pace because **xAI has no speed parameter at all** — our own code says so in a comment. And the German-for-English voices are intrinsically fast: measured against the estate's other German courses, they speak **1.6× faster**. Slowing playback to 0.72× still leaves them faster than the German a `deu_for_zho` learner hears at full speed.

The two faults make each other worse: the app plays that seed-1 clip at 0.72×, which stretches the already over-held vowel from 240 ms to 333 ms. The missing /l/ is more exposed in the app than in the raw file.

---

## 1. The verdict on "ich will"

The clip: `823cf48a-43bf-40c9-a5d2-56c2be1788c7`, LEGO **S0001L01** (`I want` / `ich will`) — the very first LEGO of the course. Voice **Ara** (xAI), 744 ms, revision 2, rendered 06 Aug 13:48 UTC. (Aran said "I will"; the LEGO is glossed "I want". Same clip.)

**It is not truncation (a).** The tail has a 100 ms fall into silence and then 99 ms of trailing pad. The tail-shape probe scores it `decayDb −24.1` — strongly falling into the boundary, which is the signature of a natural ending; a cut clip runs flat or rising. Run across the whole of seed 1 — 81 distinct live clips — **0 came out as truncation candidates**.

**It is not our post-processing (c).** The only thing `masterAudio` does now is loudness-normalise and *flag*. The trimming path was deleted on 05 Aug after it ate "sprechen" out of a German sentence; the comment sits at `services/phases/phase8-audio-v13.cjs:1169-1181` and says the clip now ships exactly as rendered. There is no splice or silence-strip on this path.

**It is (b) — the voice's prosody on an isolated short utterance.** Formant tracking on the actual served bytes:

| | isolated `ich will` | the same syllable inside `ich will sprechen` |
|---|---|---|
| length of the *will* vowel | **240 ms** | **85 ms** |
| F1 during it | 350 Hz, flat | ~400 Hz |
| F2 during it | 2270 Hz, flat to within 40 Hz | ~2000 Hz |
| what happens next | fades to silence over 100 ms | closes straight into the /ʃp/ of *sprechen* |

From 330 ms to 570 ms the isolated clip is **dead steady** — amplitude within 1 dB, F2 within 40 Hz. That is a held /ɪ/, not a syllable with a coda. There is no F1/F2 movement anywhere that would mark a lateral closure, and then it just fades. Acoustically it is `[ɪç vɪː…]`. "Ich ver" is a fair transcription of it.

Inside a sentence the same voice gets 85 ms for that syllable and the following consonant supplies the boundary the ear needs — which is exactly the contrast Aran described.

**Hear it.** Three clips, all straight off the bucket, nothing processed:

Isolated "ich will" — xAI Ara, the clip in the course:
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/823CF48A-43BF-40C9-A5D2-56C2BE1788C7.mp3

Same voice, "ich will nur eine Sprache lernen" — the /l/ Aran says is fine:
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/79651773-A9FC-4EC6-A9BE-CE4644500D6A.mp3

And the interesting one — isolated "ich will" from `deu_for_zho`, rendered by **Azure Katja** instead of xAI:
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/179FBC02-AB62-46D9-921E-702FE232F948.mp3

The third is the one that decides the money. Azure takes 1800 ms over it and its energy falls 17 dB into the coda, where xAI's holds within 3 dB and fades. On the measurement that looks like Azure articulating a final consonant and xAI not. **I am not going to claim it from the numbers alone — that is an ears question, and ten seconds of Aran's ears settles it.** If Azure says it properly, this is fixable with a re-render on a different voice and no human recorder is needed for it.

---

## 2. The blast radius — smaller than it looks

The at-risk shape is: a short isolated LEGO clip, drawn out well past the course's normal pace, ending in a sonorant (`-l`, `-n`, `-m`, `-r`) where there is no burst or friction to make the ending audible.

Counting by shape across the first 200 rounds' LEGO clips (200 clips):

| | rounds 1-10 | rounds 1-50 | rounds 1-200 |
|---|---|---|---|
| drawled (≥260 ms/syllable vs the course's 181 ms baseline) | 9 of 10 | 33 of 50 | 113 of 200 |
| …and ending in `l / n / m / r` | **5** | **12** | **48 (24%)** |

But when I measured the actual audio on 15 of them, **"ich will" is a lone outlier, not the tip of an iceberg**:

| clip | terminal steady hold | % of clip |
|---|---|---|
| **ich will** | **210 ms** | **36%** |
| schnell | 100 ms | 23% |
| schon | 100 ms | 23% |
| soll | 90 ms | 20% |
| sein | 80 ms | 15% |
| still | 80 ms | 18% |
| mehr / viel / man / mir / hier / sehr | 40-70 ms | 9-19% |

40-100 ms is an ordinary vowel steady-state. 210 ms is a drone. So on this measurement the confirmed defect is **one clip, badly** — and the worst of the rest, in order, are `schnell` (round 67), `schon` (104), `still` (105), `soll` (164), `sein` (87).

I also checked the obstruent-final ones (`Deutsch`, `jetzt`, `etwas`, `fertig`, `du bist`, `nicht`) against the same words at the end of full sentences. The isolated versions came out **better**, by 5-35 dB of high-frequency energy at the tail — sentence-final words trail off, isolated ones don't. So there is no general "isolated clips lose their final consonant" problem. It is specific to sonorant codas after an over-held vowel.

**Honest limit:** my instrument can find an over-held vowel; it cannot tell you whether `soll` has an audible /l/. That needs ears. Aran listening to ~50 short LEGO clips is ten minutes of his time and would settle the whole class properly.

---

## 3. The speed answer

**What the German clips actually render at: 1.0×, the voice's natural pace, and it was never possible for it to be anything else.**

`deu_for_eng` is on **xAI** voices for all four roles — target1 `ara`, target2 `leo`, known and presentation the Tom clone. In the live render path, `services/phases/phase8-audio-v13.cjs:2345-2350`, the Azure and ElevenLabs branches pass `speed`; **the xAI branch does not pass it at all**. The comment four lines below (`:2357-2359`) says it outright: *"xAI does not expose an API-level speed parameter, so xAI audio is always generated at natural speed."*

So neither of the other two numbers in the repo ever touched this course:
- `cadenceProfiles.slow = 0.75` in `services/voice-config-service.cjs` — not on this path.
- The hardcoded `spec.cadence === 'slow' ? 0.8 : 1.0` at `services/phases/phase8-audio-from-baskets.cjs:349` — a different, Azure-only path.

**Where the 0.8× Aran means actually lives: the player.** It is a belt ramp applied as `audio.playbackRate` in the learning app — `beltSpeed()` at `packages/player-vue/src/providers/toSimpleRounds.ts:76-81` (white belt, seeds 1-7 = 0.80) multiplied by the course's `voice_config.target_speed.global_speed`, which for German is **0.9**. So a seed-1 German learner should be hearing **0.72×**, and known-language prompts are pinned at 1.00× and never ramped.

**And here is why Aran can be right even with the ramp working.** Measured speaking rate, median milliseconds per syllable on target clips, minus padding:

| course | voice | 12+ syllable clips | syllables/sec |
|---|---|---|---|
| **deu_for_eng** | xAI Ara / Leo | **181 ms** | **5.5** |
| deu_at_for_eng | Azure Ingrid | 305 ms | 3.3 |
| deu_for_zho | Azure Katja @ speed 0.85 | 325 ms | 3.1 |

Cross-checked on the 7 texts that exist verbatim in both German courses: the `deu_for_eng` clips are **0.63×** the duration of the `deu_at_for_eng` ones. Same answer from both methods.

5.5 syllables/sec is conversational-native German. The other two courses sit at ~3.1-3.3 because Azure honoured a rate parameter. At the intended 0.72× playback, German-for-English lands at ~4.0 syllables/sec — **still faster than the other German courses are at full speed.** Aran's ear is correct and it is correct *regardless* of whether the ramp is firing.

And the ramp cannot be turned down to compensate: `computeCycleSpeed` floors at `MIN_SPEED = 0.7` (`toSimpleRounds.ts:61, 113`), so 0.70× is the slowest the app will ever play anything. See §4.

**Flagged for you, not changed:** the repo's `slow` cadence profile is 0.75 where you and Aran both say 0.8. It is irrelevant to this course — nothing reads it here — but it is a real inconsistency and I have left both constants alone.

---

## 4. The proposed fix

It splits cleanly in two, and only one half is a bug.

### Half one — the speed. Not a code bug, and the player cannot rescue it.

Not a bug, a **voice choice**. We put German on a provider that cannot be slowed, in a system whose whole beginner design depends on slowing the target language.

**And the obvious cheap fix does not work.** `computeCycleSpeed` clamps at a hard floor of `MIN_SPEED = 0.7` (`toSimpleRounds.ts:61, 113`). Today's seed 1 already plays at 0.72×. Turning `global_speed` down as far as it will go buys **0.70× instead of 0.72×** — 3%, and it flattens the belt curve to nothing while doing it. There is no database field that fixes this. 0.70× is the floor of what the app can play, and German at 5.5 syllables/sec played at 0.70× is 3.85 — *still* faster than `deu_for_zho` is at full speed.

So the only real options are:
- **Move the German target voices to Azure** (Katja/Conrad, as `deu_for_zho` already runs) at `speed 0.85`, and let the belt ramp do its job on top of an already-sane pace. That is a full target-side re-render — which you have explicitly not authorised, and I have not done.
- **Do nothing on speed until the "ich will" call is made**, because if a human recorder does the first 150-200 short clips, the pace of those clips is a recording direction, not a config value — and the same recording session settles both halves of this report.

**My read: don't touch any constant today.** There is no stopgap worth having, so the speed fix and the "ich will" fix are the same decision and should be made together, once. If the Azure A/B in §1 sounds right to Aran, one target-side re-render on Azure at 0.85 fixes the pace *and* the citation forms in a single pass — better (both faults gone), simpler (one provider, one run, no new machinery, no belt-curve distortion), cheaper (pennies of TTS against a recording session). If Azure sounds wrong, the recorder is the answer and the re-render would have been money burnt.

### Half two — "ich will". This one needs your call, and I have a lean.

It is inherent voice behaviour on isolated short utterances, so **it is not fixable by fixing our pipeline** — which is the finding that says your human-recorder instinct is pointed at a real problem. But there is a cheaper thing to try first, and it is the Azure A/B above. If Azure articulates the /l/ on an isolated "ich will", the fix is: **re-render the isolated LEGO clips only** — that is the ~150-200 clips you were going to hand a recorder — on a provider that does citation forms properly. That is minutes of compute and pennies.

The human recorder is the right answer if *no* TTS voice does an isolated LEGO properly, or if the "ich will | sprechen" split-recording idea is worth having for its own sake — and your own note about "I'm" versus "I am" is the sharpest thing anyone has said about this problem. A native speaker asked to say "ich will" in isolation will give you a citation form too; what you actually want is the *in-sentence* pronunciation, extracted. That is a direction you can give a recorder and cannot give a TTS API.

**So: play the three clips above. If Azure sounds right, re-render 200 clips and keep your recorder budget. If it doesn't, the recorder is the answer and this report is the evidence for it.** I am not going to fake a verdict on a question that ten seconds of listening answers better than my measurements can.

---

## 5. Gaps — what I could not check

- **I did not listen.** Every acoustic claim here is measurement — durations, envelopes, LPC formant tracks — not a human ear. The formant work was done with a hand-rolled LPC tracker because there is no numpy, scipy or praat on this box and `pip` is not installed; it is good enough to show a 240 ms flat-F2 hold, and not good enough to adjudicate a clear German /l/. The Azure-versus-xAI comparison in §1 is the honest edge of what I can prove.
- **Coverage was deliberately narrow.** The box was at load ~12 on 8 cores with two large audio rebuilds running, so I ran no whisper and no fleet. I measured 81 clips physically (seed 1), 40 early LEGO clips acoustically, 15 at-risk clips in detail, 12 isolated-versus-sentence pairs, and 51,522 clip durations from the database. Rounds 11-200 were sampled by shape from the database, not listened to.
- **A worker I dispatched to trace the render path never appeared in the queue** and never reported. I traced it myself instead, which is where the `phase8-audio-v13.cjs:2345-2359` finding comes from — first-hand, not relayed.
- **The clip may move under this report.** There is another session running right now titled *"deu: revert ich-will LEGO clip to previous version"*. Everything above was measured against revision 2 of `823cf48a…` as served at 12:20-12:45 UTC today.
- **Not investigated, per your ruling:** the truncated listening content. I saw nothing to suggest it is a different fault than you think it is.
