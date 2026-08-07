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

---

# Addendum — "ich will should not BE a separate audio"

*Added later on 2026-08-07, answering your design question. Report only; nothing changed.*

You are right, and the pipeline already agrees with you — there is a database constraint whose entire job is one-clip-per-(course, text, language, role, voice). It mostly works. What you saw is one of exactly four ways round it, and it is the only one of the four that actually splits live content.

## What the three sites really hold

Three sites, **two** distinct renders per voice — the S0473 component row is already reusing:

| site | target1 clip | what it is |
|---|---|---|
| `S0001L01` (the LEGO debut) | `0f37d106…` | the **January** take, 768 ms, voice recorded as `xai_ara`, text stored as **`ich will ::superseded-regen`** |
| `S0241L02` (the re-teach) | `823cf48a…` | the **6 Aug** take, 744 ms, voice `ara`, text `ich will` |
| `S0473L01C01` (component row) | `823cf48a…` | **the same 6 Aug clip** — already shared |

So the split is between the debut and everything else, and it is the revert that created it: the revert re-pointed `S0001L01` at the old row and left the other two sites on the new one.

**The mechanism, precisely.** `tools/regen-seed-clips-from-scratch.cjs:123` defines `const TOMBSTONE = ' ::superseded-regen'`. When a regen renders a new take, it appends that suffix to the *old* row's text so the new render can take the unique key. That is correct make-before-break behaviour and I would not remove it. The bug is what it doesn't do: **nothing re-points the holders that were pointing at the old row.** That is the same class of fault the 6 Aug repair doc already caught once — *"the original repair only ever updated the LEGO's copy of the link"*, 2,347 links across 1,036 clips.

## How much duplication actually exists

Counting a duplicate as: same course, same language, same text once you strip the tombstone and punctuation, same voice once you fold `xai_ara` into `ara`. Placeholder voice ids (`legacy_import`, `human`) excluded — they name a *slot*, not a voice, and counting them produces a fake 32% for the Welsh courses.

**deu_for_eng — 208 redundant renders in 49,305 rows (0.4%).** Of those, only **52 are live splits** where two different takes are both pointed at by course content and a learner can really hear both. The other 156 are orphaned old rows: disk, not quality.

| cause | groups | redundant rows | **live splits** |
|---|---|---|---|
| 1. superseded tombstone left behind | 107 | 107 | **2** ← one of these is `ich will` |
| 2. same voice used for two roles (known + presentation) | 3 | 3 | 0 |
| 3. bare `ara` vs prefixed `xai_ara` | 19 | 19 | **15** |
| 4. punctuation/case variant of the same text | 79 | 79 | **35** |

**Is it course-wide? Yes, but German is one of the cleanest courses on the estate.** Across all 2,495,061 clip rows with a real voice id: **19,222 redundant renders, 0.77%.**

| cause | groups | redundant (estate) | of which deu_for_eng |
|---|---|---|---|
| 4. punctuation/case variant | 17,068 | **17,184** | 79 |
| 3. bare vs `xai_` voice spelling | 1,248 | 1,249 | 19 |
| 2. same voice, two roles | 611 | 625 | 3 |
| 1. superseded tombstone | 164 | 164 | **107** |

Worst courses: `eng_for_jpn` 3,250 (6.1%), `gle_for_eng` 960 (3.8%), `jpn_for_eng` 863 (1.6%). German at 0.4% is near the bottom — but it holds **107 of the estate's 164 tombstones**, because it is the course we have been repairing all week.

Two readings of that table matter:
- **91% of the estate's duplication is punctuation.** `normalizeForAudio` strips a trailing `. ! 。 ！` but keeps commas and question marks; `normalizeForDb` strips `. ? ! ¿ ¡ 。 ？ ！`. Two conventions live in one column and the planner says so out loud at `services/audio-reuse-planner.cjs:83-85`. So "der mann," and "der mann" are two keys and buy two renders. Both say the right words, so this is money and disk, not quality.
- **The tombstone class is tiny but it is the one that hurts**, because it is the only one where the two takes are genuinely different performances of the same text.

## What enforcing one-canonical-clip-per-(text, voice, cadence) would take

The key exists: `unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)`, and the reuse planner upserts against it (`audio-reuse-planner.cjs:1571`). Four things stand between that and your rule.

**1. Re-point the holders when a row is tombstoned.** *This is your bug, and it is the cheap one.* `relinkHolders()` in the reuse planner already does exactly this job — it is what turned 1,036 clip fixes into 2,347 link updates on 6 Aug. `regen-seed-clips-from-scratch.cjs` needs to call it in the same transaction as the tombstone. One tool, one call. Acceptance test: tombstone a clip with three holders, assert zero holders still point at the tombstoned id.

**2. Fold the voice spellings.** `audio-reuse-planner.cjs:72-78` deliberately refuses to treat `ara` and `xai_ara` as one voice — *"a voice-identity call and therefore Tom's, not ours"* — and ships a `voiceAliases` hook waiting for your ruling. **You have already made that ruling** (`eve` and `xai_eve` are one voice). It just hasn't been wired in and normalised on write. 1,249 rows estate-wide, 15 of German's 52 live splits.

**3. Pick one text normaliser and backfill.** 17,184 rows. Needs one decision from you that I am not going to make: **is a trailing comma worth a separate render?** It genuinely changes the intonation the voice produces — "damit," rises, "damit" falls. My read is that a trailing comma on a LEGO is an authoring artefact rather than a prosody choice, and stripping it would be right, but that is your ear's call.

**4. Cadence — and this is the part that is not built at all.** `course_audio` has **no speed, cadence or rate column.** Cadence is implicit in (course, role) → `voice_config.voices[role].settings.speed`. Three consequences:
- Two cadences of the same text and voice **cannot coexist today**. The constraint collides them and the upsert overwrites. Your caveat is currently inexpressible.
- **Nothing records what speed a clip was rendered at.** Change a course's `voice_config` speed and every existing clip silently becomes mislabelled, with no way to tell old from new by inspection. I had to measure syllable rates in §3 of this report for exactly this reason — a column would have answered it in one query.
- Making your rule real means adding `render_speed numeric` to `course_audio`, backfilling it from the course's voice config as at each clip's `created_at`, and moving the constraint to `(course_code, text_normalized, language, voice_id, render_speed)` — role drops out of the key, speed comes in. Role is not identity; a voice and a speed are.

## My recommendation

**Do 1 and 2 now; do 4 before any German provider swap; leave 3 parked until you have an opinion on the comma.**

Better: (1) is the only change that stops a learner hearing two different takes of the same LEGO, which is the actual complaint. Simpler: both are calls to functions that already exist — `relinkHolders()` and the `voiceAliases` hook — with no new machinery and no re-render. Cheaper: nothing is regenerated and nothing is deleted, so the whole thing costs a code change and a backfill.

(4) is the only structural piece, and the reason to do it *before* moving German to Azure is that the swap is precisely the event that would silently mix cadences in a course with no way to tell them apart afterwards. Doing it after is a forensics job; doing it before is a column.

(3) is 91% of the volume and roughly 0% of the harm — both clips say the right words. It is a tidy-up, not a fix.

---

# Addendum 2 — judged against the in-context standard

*Added 2026-08-07 after your refinement. The test is no longer "is the isolated clip a faithful native rendering of the word alone" — it is **"does the isolated clip match how that word sounds inside the sentences it will be reused in."** That changes the answer, and it changes which clips are the problem.*

## The headline: you have re-scoped this from one clip to the whole early course — and "ich will" is one of the better ones

Measured every LEGO clip in rounds 1-40 against the same words spoken inside full course sentences, same voice, same course. **33 of 39 have endings that diverge more than their bodies. 14 of 39 have endings as far from their own in-sentence realisation as an unrelated clip is.**

`ich will` ranks **35th of 39** on the January take and 26th on the 6 Aug take. It is not the defect; it is the clip that made you look.

## How the measurement works, and what the numbers mean

For each isolated LEGO clip I search every course sentence that contains its words for the span that best matches it under a uniform time stretch, then score two things: **body** (mean spectral distance across the whole match) and **coda** (the same distance over the final 30% — the ending). Units are dB per frequency band; lower is more alike. Uniform stretch, not DTW, because DTW is free to hide a 2× drawl inside its own path, which is precisely what we are trying to see.

Two controls bracket the scale, both run through the identical machinery:

| comparison | body | coda | stretch |
|---|---|---|---|
| **FLOOR** — the same words in two *different* sentences | 4.52 | 4.93 | 1.04× |
| **the isolated LEGO clips** vs those words in a sentence | **5.14** | **6.18** | **1.28×** |
| **CEILING** — unrelated words | 6.92 | 6.88 | — |

Read the coda row: the natural variation between one sentence and another is 4.93. Unrelated speech is 6.88. **The isolated LEGO clips sit at 6.18 — 64% of the way from "the same words again" to "a different phrase altogether."** The bodies are far better behaved (5.14, only a quarter of the way up). The divergence is concentrated in the endings, exactly where you said it would be.

## The worst offenders

| rnd | LEGO | isolated text | isolated | in-sentence | stretch | body | **coda** |
|---|---|---|---|---|---|---|---|
| 33 | `S0010L04` | ob | 480 ms | 170 ms | 1.94× | 5.37 | **9.79** |
| 18 | `S0005L03` | mit jemand anderem | 1224 ms | 910 ms | 1.16× | 6.77 | **8.67** |
| 5 | `S0001L05` | mit dir | 840 ms | 360 ms | 1.81× | 6.23 | **8.02** |
| 7 | `S0002L02` | ich versuche zu | 1248 ms | 890 ms | 1.15× | 5.68 | **7.64** |
| 19 | `S0005L04` | sprechen üben | 1008 ms | 780 ms | 1.03× | 5.92 | **7.60** |
| 9 | `S0003L01` | so oft wie möglich | 1464 ms | 1180 ms | 1.08× | 5.91 | **7.52** |
| 2 | `S0001L02` | sprechen | 840 ms | 280 ms | 2.25× | 5.49 | **7.48** |
| 31 | `S0010L02` | Ich kann | 720 ms | 460 ms | 1.17× | 4.63 | **7.47** |
| 29 | `S0009L02` | spreche | 864 ms | 420 ms | 1.26× | 4.72 | **7.45** |
| 23 | `S0007L01` | heute | 696 ms | 390 ms | 1.31× | 6.30 | **7.28** |
| 26 | `S0008L01` | erklären | 840 ms | 600 ms | 1.08× | 5.59 | **7.18** |
| 32 | `S0010L03` | den ganzen Satz | 1296 ms | 850 ms | 1.25× | 6.13 | **6.92** |
| 17 | `S0005L02` | ich werde | 792 ms | 300 ms | 2.10× | 5.08 | **6.89** |
| 38 | `S0011L04` | du bist | 696 ms | 280 ms | 1.04× | 5.17 | **6.89** |
| 6 | `S0002L01` | lernen | 792 ms | 380 ms | 1.53× | 6.78 | **6.78** |
| 13 | `S0004L02` | sagen | 744 ms | 430 ms | 1.28× | 5.49 | **6.52** |

Ranked by coda divergence, worst first. `ob` is the standout: 480 ms in isolation against 170 ms in "ich wollte fragen ob du heute Abend etwas machst", and an ending 9.79 — well past the unrelated-words ceiling. `mit dir`, `sprechen` and `ich werde` are the big stretchers at 1.8-2.25×.

Nine of the 39 are stretched 1.5× or more against their own in-sentence realisation. Those are the ones a learner is being taught to say at a length that will not fit the sentences we then ask them to build.

## What this does to the recommendation

It settles it. My previous section said "play the Azure A/B, and if Azure sounds right, re-render 200 clips." **That advice was scoped to one clip and it does not survive your criterion.** A different TTS voice will still be doing citation forms — it will produce *its own* isolated-utterance prosody, which is a different sound from *its own* in-sentence prosody, because that is what TTS does when you hand it two words with a full stop after them. Swapping Ara for Katja changes which 39 clips diverge, not whether they diverge.

**So the human recorder is the right answer, and your "ich will | sprechen" split-recording idea is the specific thing that fixes it.** Record the composed phrase, then separate it — and the isolated LEGO inherits the in-context realisation by construction rather than by hope. That is the only method on the table that makes isolated-versus-context divergence structurally zero instead of something we measure afterwards and flinch at.

Your instinct about the native speaker holds too, and this data sharpens it: a native asked to say "ob" on its own will give you a 480 ms citation form as readily as Ara did. The direction they need is not "say this word", it is "say this sentence, then say it again with gaps" — which is a recording protocol, not a linguistic judgement.

**Sizing.** 39 LEGO clips cover rounds 1-40. Your 150-200 figure covers roughly rounds 1-200, which is where the drawled-isolated shape is concentrated. That is the right batch, and this measurement is the acceptance test for it: re-run it against the recorded clips and the coda number should land at the floor (≈4.9), not at 6.18.

**Speed, revisited.** If a recorder does the first 150-200, the Azure re-render question shrinks to "everything past round 200", where clips are longer and the isolation problem largely goes away — but the 1.6× pace problem does not. Those two now separate cleanly: recorder for the short isolated stock, provider decision for the long tail.

## Gaps in this measurement

- **Target 1 (Ara) only.** Leo was not measured; the box was at load ~13 with two rebuilds running and doubling the sweep was not worth the contention. Expect the same shape, unverified.
- **39 of the first 40 LEGOs.** One had no full-sentence context long enough to compare against.
- **This is a spectral distance, not a phonetic verdict.** It tells you two recordings of the same words sound different and roughly how much, calibrated against real floors and ceilings. It does not tell you *which* phone is wrong. For that, and for any final ruling, Aran's ears beat my numbers — and the ranked list above is exactly the running order to hand him.
- Five matches hit the search bound and were excluded from their LEGO's median where alternatives existed; they are marked in the raw data.
- Raw per-pair output: `scripts/ichwill/` on watson-1 (gitignored scratch), summaries in `/tmp/deu-divergence-long.json`.
