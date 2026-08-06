# The audio pipeline rethought — providers, fidelity, and the labs

**2026-08-06. Design only — nothing built, nothing rendered, no data touched.**

> The store design settled *where a clip lives*. This settles *how it gets made, how we know it is
> good, and where the choices that shape it are allowed to live.*

Companion to `AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md` and its appendix. Read that
first: it establishes that a clip is addressed by the hash of its own bytes and identified by
`(language, normalised text, voice)`, that speed is applied at playback and never stored, and that a
clip which fails its gates is never admitted to the store.

**What I built on.** Commit **`dacb13ad`** on `docs/audio-store-content-addressed-design-2026-08-06`
— the update folding in Tom's three constraints, which landed while this was being written and which
I have read at its final state. It carries all three (one clip per `(language, text, voice)` shared
across courses and sides; voice in the identity; speed a player concern), and it enforces the identity
as a **partial unique index on `audio_objects (language, text_normalized, voice_id) WHERE
superseded_at IS NULL`**. That last detail matters here: the constraint is on the raw column values,
and §4 shows that neither of those two columns is canonical in the live estate.

One correction to the brief that sent me: the pod voice catalogues are at `tools/pod-voices-xai.json`
and `tools/pod-voices-azure.json`, not under `services/`.

---

## 1 · Providers — xAI-first, and where the exceptions actually live

xAI-first is settled. What was not settled is where the exceptions are, and the repo answers that
more cleanly than I expected: **the exceptions are not a judgement call, they are a catalogue.**

### What xAI genuinely covers

`tools/pod-voices-xai.json` declares voices for **20 languages** — `ar da de en es fi fr hi it ja ko
nl pl pt ru sv-SE th tr vi zh-CN` — with two to four named voices each, plus five multilingual voices
(`ara`, `eve`, `leo`, `rex`, `sal`). `tools/pod-voices-azure.json` declares **29 locales**, and the
striking thing is that it is almost exactly the *complement*: `af bg ca cs cy el et eu fa ga he hr hu
hy is lt lv mk mt nb ne ro sr sw uk` have Azure voices and no xAI voice at all.

The base-language overlap is **three languages, and all three are regional variants xAI does not
offer**: `ar-LB` and `ar-SY` (dialects, against xAI's single `ar`), **`de-AT`** (Austrian German), and
`fr-CA` (Quebec French). That is the whole overlap. So the provider rule writes itself:

> **xAI for the 20 languages it covers. Azure for the 25 it does not, and for every regional variant
> xAI has no voice for. ElevenLabs for nothing new.**

ElevenLabs survives only as legacy: `elevenlabs_FVdzAUsp8apoOdc0907A` on 97 `deu_at_for_eng`
instruction and encouragement clips, and similar pockets elsewhere. It is a provider we still can
call (`services/tts-service.cjs:252`) but have no remaining reason to choose.

**A fourth provider nobody listed.** `deu_at_for_eng` carries **766 target clips on
`narakeet_fritzi`**. Narakeet is not in either catalogue and not in `tts-service.cjs`'s provider
switch. Whatever wrote those rows is outside the corridor the store design is trying to build. Worth
knowing before the German migration, not after.

**A live inconsistency worth fixing cheaply.** `tools/render-fine-knowns.cjs:39` hard-codes
`XAI_OFFICIAL` as **17** languages; the catalogue has 20. `da`, `fi`, `sv-SE` and `th` have declared
xAI voices but are routed away from xAI by that tool. One of the two is wrong and the catalogue is
the more recent artefact. **My recommendation: make `XAI_OFFICIAL` read the catalogue rather than
restate it**, so there is one list and it is the one with the voice ids in it.

### What xAI-first costs — the machinery is the evidence

`services/tts-service.cjs` carries four pieces of xAI-specific defence, and each one exists because
xAI failed in a specific observed way at volume. Read as a list of costs, it is the honest price of
the voice quality:

| defence | file:line | what it is defending against |
|---|---|---|
| **Concurrency slot** — `XAI_MAX_CONCURRENT`, default **4** | `tts-service.cjs:51-60` | xAI degrades under fan-out in a way Azure does not. Four in flight, the rest queue. |
| **Empty-response gate** — `assertAudibleResponse` | `tts-service.cjs:105-115` | A body too small to hold speech. Thrown as a synthetic `503` so it re-rolls inside the existing retry budget. This is the fix for the 2026-08-03 French batch. |
| **Degradation cooldown** — stub rate **>4%** over a rolling **50** responses pauses xAI for **60s** | `tts-service.cjs:128-160` | The provider does not fail one request at a time; it goes bad in windows. The window is cleared after a trip so post-cooldown behaviour is judged on its own. |
| **Phonology gate** — whisper language auto-detect, **xAI only** | `tts-service.cjs:554-631` | xAI's multilingual voices are English-dominant and will render non-English text with English phonology *even with an explicit `language` sent* — 'Come stai' spoken as English 'come', measured in the Italian pilot on 2026-07-10. A suspect detection re-rolls; exhausting the budget throws, so a wrong-language clip is never persisted. |

Three things about that table matter for the design.

**The concurrency ceiling is a throughput fact, not a tuning knob.** Four concurrent renders is the
rate at which the German and French passes will actually run. Any plan that assumes Azure-like
parallelism is wrong by construction.

**The phonology gate is off for English and skipped when whisper is absent**
(`tts-service.cjs:571`, `625-631`). It does not apply when the steered language is `en` or `auto`,
which is correct — but it means the gate protects the target side and not the known side, and it
silently does nothing on a machine without `whisper-cli` and the `ggml-small` model. A gate that can
be absent without anyone noticing is a gate you cannot cite in a guarantee. **Recommendation: make
its availability part of the render's recorded verdict**, so a clip can say "phonology: unchecked"
rather than being indistinguishable from "phonology: passed". `services/audio-veracity.cjs` already
has exactly this shape with its three-outcome `pass: true|false|null`; copy it.

**There is no automatic provider fallback.** `generate()` (`tts-service.cjs:489-508`) switches on the
provider it was handed and throws on failure; the retry budget re-rolls the *same* provider. Falling
back from xAI to Azure is a human decision today, taken by editing a voice config. That is defensible
— an automatic silent fallback would mean a course side quietly acquiring a second voice, which is
precisely the drift §4 is cleaning up — but it should be *stated* as the policy rather than left as
an accident of the code.

### The ladder, stated

1. **Render on the course side's declared voice.** One voice per side, no exceptions, no silent
   substitution.
2. **Transient failure** (network, 5xx, empty body): re-roll on the same voice, exponential backoff
   with full jitter, budget of 3. Already implemented.
3. **Phonology suspect** (xAI, non-English target): re-roll on the same voice within the same budget.
   Already implemented.
4. **Budget exhausted:** the item **fails and is reported**. Nothing is written. No fallback voice, no
   fallback provider, no partial course.
5. **A repeated failure on the same voice is a VOICELAB question, not a pipeline question** — it means
   this voice cannot say this text reliably, and the answer is a human choosing a different voice in
   a bench where they can hear the difference. See §3.

### Gaps I could not close

- **Per-language xAI quality is not measured anywhere.** The catalogue tells us which languages have
  voices; nothing in the repo tells us which of those 20 xAI speaks *well*. The Italian phonology
  failure is the only per-language quality evidence I found, and it is one language on one date.
  Everything else is Tom's ear, unrecorded. **This is the single biggest reason to build VOICELAB**:
  it is the instrument that would turn that into data.
- **`course_audio` records no provider.** There is no provider or engine column
  (schema verified live). Provider is inferable from the shape of `voice_id` — `azure_` and
  `elevenlabs_` prefixes, Azure's `xx-XX-NameNeural` pattern, xAI's short names and 8–12 character
  clone ids — but it is inference, not data. **Recommendation: `audio_objects` records the provider
  explicitly**, since it is being created anyway and this is free at insert time.

---

## 2 · Fidelity and consistency — two different problems

Tom asked for both words. They are not the same problem and the estate is lopsided: **almost all of
the fidelity half exists, and almost none of the consistency half.**

### What exists

| check | where | measures | runs |
|---|---|---|---|
| Whisper CER | `services/audio-veracity.cjs` | are the right words in there | post-hoc, on demand |
| Empty response | `tts-service.cjs:105` | is there any audio at all | **generation time** |
| Phonology | `tts-service.cjs:554-631` | is it the right *language* | **generation time**, xAI non-English only |
| Syllable-rate duration | `services/audio-intelligence/tiers/duration.cjs` | is it too fast to be real | written, **untracked, unwired** |
| Tail shape | `services/audio-intelligence/tiers/energy.cjs` | did it stop or was it cut | written, **untracked, unwired** |
| Speech span | `services/audio-intelligence/tiers/vad.cjs` | where the speech actually is | written, **untracked, unwired** |
| Pace vs generation | `tools/audio-pace-gate.cjs` (`1241f5fb`) | is this take rushed against its own voice's current generation | manual tool, deliberately post-hoc |

The pace gate exists because whisper is deaf to the defect Tom heard: "I want to learn as often as
possible" delivered in **1.70s** where the current generation says **2.18s**, transcribing perfectly,
CER 0, veracity PASS, four consecutive sweeps shipping past it. Its own header states the doctrine
that must survive into the new pipeline verbatim:

> **It is an OUTPUT CHECK, never a selector.** Every previous attempt on this course failed by using a
> cheap test to DECIDE WHAT TO REPLACE — and every definition missed rows.

That is a rule about *repair*. Under the new design the same measurement moves to a second job — an
**admission** gate at generation time, judging a clip that does not exist yet — and there it is not a
selector, because there is nothing to select from. Both roles are legitimate; conflating them is what
went wrong four times. **Say which role a measurement is playing, every time.**

### What the estate does not measure at all

**Loudness.** Nothing measures it in the pipeline. The evidence for the target comes from a single
25-clip test (`docs/audio/deu-loudness-cluster-test-2026-08-06.md`) sitting between −15.0 and
−16.3 dB. One `ffmpeg -af ebur128` pass gives integrated LUFS and true peak. It has not been the
defect in any of this week's failures, so this gate is there to stop a good property drifting, not to
fix a broken one.

**Voice identity. Nothing, anywhere, checks that a clip sounds like the voice it claims to be.** This
is the consistency hole, and it is total. Every check above asks "is this clip good?"; none asks "is
this clip the *same person* as the other 14,000 clips on this course side?" That is why a course can
accumulate ten voice ids on one side and no gate says a word.

### The gates, at generation time

Ordered so the cheap ones run first and the expensive one runs on what they escalate. All on the
**mastered** bytes, so what is judged is what the learner hears.

1. **Speech span** (VAD) — find where the speech is. Everything downstream measures against this
   span, not file duration, so mastering padding cannot move a threshold.
2. **Loudness and true peak** — integrated LUFS within **±1.5 dB** of the course's declared target
   (evidence says about **−15.5 dB**), true peak below **−1 dBTP**.
3. **Tail shape** — did the voice stop, or was it cut.
4. **Syllable rate** — cohort first (other known-good takes of the same text and voice), the voice's
   own seconds-per-syllable distribution as fallback, with the absolute floor of 9 syllables/second
   that applies even to an uncalibrated voice. **Reports `calibrated: false` and is advisory for any
   language without a fitted syllable counter — English and German are the only two fitted.**
5. **Language** — xAI non-English only, as today.
6. **Words** — whisper CER, on what the cheap tiers escalate.

A clip failing any refusing gate is **never hashed and never stored**, so it cannot be linked by
accident later. Failures go to a quarantine prefix with their verdict attached, because a human
needs to be able to hear what failed and why.

### The consistency check that does not exist yet

Consistency is a property of a **set**, not of a clip, so it cannot be an admission gate. It is a
course-level report, and here is the part worth knowing: **the machinery to compute it is already
written, in the browser, for a different purpose.**

`src/views/admin/vadProsody.js` is a full prosodic feature extractor — framewise RMS in dB, ACF pitch
per 40 ms frame, silence trimming, syllable-peak counting, DTW distance, loudness-matched rendering,
and `comparePhraseDims`. It was built for VadLab's record-yourself flow and it is a deliberate
line-for-line mirror of `tools/prosody-lab/prosody.py`, so a learner recording and a model clip are
compared by the same extractor.

And it carries this in its own header:

> *features are blind to voice identity. Energy z-scored per clip, F0 in semitones re the clip's own
> median. F0 is extracted for the experimental pitch-shape DISPLAY track only — it is never folded
> into any score (melody is voice, AUC 0.464).*

**VadLab computes the voice-identity signal and then deliberately throws it away, because for VAD it
is noise.** For voice consistency it is the entire signal. The consistency check is VadLab's mirror
image, built from the same extractor with the sign flipped: pitch and timbre statistics become the
score, and the energy contour becomes the thing you ignore.

Concretely, a **course voice report** per course side:

- **Pitch centre and spread** — median F0 and interquartile range per clip, distribution across the
  side. A clip more than *n* semitones off the side's median is a different person or a bad take.
- **Speaking rate** — syllables per second of speech span, distribution across the side. The pace
  gate's Theil–Sen fit already does this per generation; this is the same fit read as a histogram
  instead of a threshold.
- **Loudness** — integrated LUFS distribution. A tight band is the goal; the clusters in the German
  loudness test are what a loose one looks like.
- **Voice-id census** — how many distinct canonical voices this side actually carries, and how many
  clips on each. Cheap, exact, and it would have caught the German drift in January.

Three of those four are histograms of numbers the admission gates already compute. The fourth is one
SQL query. **This is a small build, not a research project**, and its natural home is a screen.

---

## 3 · The labs — VOICELAB, and what listening and speaking gain

### What actually makes a lab a lab

The offered starting position was that a lab is a bench — real material in, parameters you can
change, an A/B you can hear, a versioned config you can freeze — and a config page just writes
settings. **The code only half agrees, and the half it disagrees on is the useful half.**

All four screens load real material and play audio. `ListeningConfig.vue` is 1,616 lines and reads
`courses`, `course_legos`, `course_audio`, `pod_legos` and `listening_pod_sentences` and has 67
preview call sites; `SpeakingConfig.vue` reads `course_seeds` and `course_audio`. Neither is a form.
Three of the four — `VadLab`, `ListeningConfig`, `SpeakingConfig` — share `algorithmConfigShared.js`,
whose `useAlgorithmConfig` composable loads every `algorithm_config` row, tracks drafts and saves
them back; `PodLab` calls the same config over `/api/algorithm-config`. So the persistence layer is
common, and none of the four is more versioned than the others.

What separates them is narrower and sharper: **a lab owns a model, a config page owns a model's
settings.**

`VadLab` has `vadProsody.js` — an extractor and a comparison, mirrored against a Python reference so
the two agree. `PodLab` has the pod fine-map. Those screens exist because there is a *computation*
whose behaviour you cannot predict from its parameters, so you need to see it run on real material to
know what it does. `ListeningConfig` and `SpeakingConfig` drive models that live elsewhere —
`pauseModel.js` is imported by the shared layer, and the speaking algorithm lives in the production
service — and their job is to expose the knobs well.

So the honest distinction is: **a lab is where a model is developed; a config page is where a
developed model is operated.** Both need real material and audible preview. The lab additionally
needs comparison, and a record of what was compared.

**What none of the four has: versioning.** `algorithm_config` is one row per key, saved in place.
There is no version, no freeze, no publish, no rollback, no history of what a config used to be. That
is the same defect as the audio store's — a name whose meaning can change underneath you — and it has
the same fix. **A config should be content-addressed too**: hash the config object, store it
immutably, and have the live pointer name a hash. Then "which config was this course built with" is
answerable, and rolling back is repointing. That is one small table and it serves all four screens at
once. **This is my strongest recommendation in this document after the store itself.**

### VOICELAB — what it is for

A voice is currently chosen the way audio used to be named: implicitly, inside a pipeline, by
whoever ran the tool. `render-fine-knowns.cjs` decides a course's known voice in three lines of
inline logic. That is exactly the class of thing the lab pattern exists to pull out.

VOICELAB is a bench with four jobs, and each one answers a failure this estate has actually had:

**1 · Audition — hear candidate voices on real course sentences.** Pick a language, pick the seeds you
care about, hear every catalogued voice for that language say the same real sentences. Not a vendor
demo reel: the actual text the learner will hear, including the short fragments where TTS is worst.
*Answers: which voice should this course side declare.*

**2 · Compare providers on identical text.** xAI, Azure and ElevenLabs, same sentences, side by side,
blind if you want it blind. *Answers: is xAI genuinely better for this language, and is the
per-language quality gap real or assumed — the gap §1 could not close from the repo.*

**3 · Lock a course side's voice.** One voice per side, declared here, recorded as a versioned config,
and the renderer cannot be handed another. *Answers: the ten-voices problem, at the point where it
starts rather than eighteen months later.*

**4 · Drift detection — the course voice report from §2.** Pitch, rate and loudness distributions per
side, plus the canonical voice-id census, plus the ability to hear the outliers. *Answers: has this
side stayed one person, and did last month's re-render match last year's.*

Job 4 is the one that makes it a lab rather than a picker, and it is the one built from `vadProsody.js`
with the sign flipped.

**What it reuses**: `algorithmConfigShared.js` for the config layer, `vadProsody.js` for the extraction
and comparison, `VadLab.vue`'s recording and playback UI as the pattern, the pod voice catalogues as
the candidate list, `services/voice-discovery-service.cjs` for enumeration. It is a fifth entry on
`ConfigsIndex.vue` and a fifth route beside the four in `src/router/index.js:478-511`.

**The one hard constraint: VOICELAB auditions cost money.** Every candidate voice on every sentence is
TTS spend. So VOICELAB **auditions from the store first** — under content addressing, a
`(language, text, voice)` that already exists is free to audition, and the estate has 2.5 million of
them. It renders only what is genuinely new, it shows the cost before it spends, and it stays behind
the same approval gate as everything else. A lab that can quietly spend is not shippable.

### Listening and speaking as labs — honestly

**Listening gains something real.** Its model — pause timing, `pauseModel.js`, belts, syllable buckets
— is genuinely a model whose behaviour you cannot predict from its parameters, and the screen already
loads real pod sentences and real audio to preview it. It is a lab that has not been called one. What
it is actually missing is the versioning above: "the pauses felt right last month" is currently an
unanswerable question. **Recommendation: give it versioned configs and rename it LISTENING LAB. That
is the whole change.**

**Speaking gains less, and I will not pretend otherwise.** `SpeakingConfig.vue` is 942 lines, reads
seeds and audio, and drives an algorithm that lives in the production service rather than in the
screen. Its knobs are mostly timings whose effect *is* predictable from their values. Making it a lab
in the full sense — a local model you can run and compare — would mean moving the speaking algorithm
into the browser, which is a real cost for a modest gain. **Recommendation: give it versioned configs
like the others and leave it a config page.** If it later grows a model of its own, promote it then.

### The framing, engaged with

Watson's reading — that the LAB pattern does for voice what content-addressing does for the store,
pulling something implicit out of a pipeline into a named, inspectable, versionable thing — is right,
and the code sharpens it. **The missing word in both cases is the same word: *immutable*.** The store's
bug was a name whose bytes could change; `algorithm_config`'s equivalent bug is a name whose settings
can change, with no way to say which settings a course was built under. Fix both the same way and the
third language really does become configuration: declare its voice in VOICELAB, freeze the config,
render through the corridor, and the gates decide.

---

## 4 · German and French — the first two migrations

Three courses, not two, and the third is the interesting one.

### The live picture, measured today

All figures from the production database via `.env.psql`, 2026-08-06. `course_audio` has no provider
column; provider below is inferred from the `voice_id` shape and is labelled as inference.

| | `deu_for_eng` | `fra_for_eng` | `deu_at_for_eng` |
|---|---|---|---|
| rows | **47,374** | **51,371** | **27,264** |
| target voices (canonical) | `ara` 14,160 · `leo` 13,741 | `eve` 14,706 | `de-AT-IngridNeural` 11,645 · `narakeet_fritzi` 766 |
| known voices | `eve` 14,326 | `eve` 14,679 | `en-GB-SoniaNeural` 10,415 · `eve` 1,604 · `gfzdpspr5fdp` 957 |
| veracity-checked rows | 1,322 (2.8%) | **0** | **0** |
| texts with more than one row at the same role | **48** | **215** | — |

**`deu_at_for_eng` is a real, fully populated course**, not a stub: 11,645 Austrian-German target
clips rendered on 2026-07-25. **It is in scope, and it is the case that proves the provider ladder** —
`de-AT` is one of the four regional variants where xAI has no voice at all. Austrian German cannot go
xAI-first tonight or any night, on current catalogues. Migrating it to the content-addressed store is
straightforward; migrating it to xAI is not available. Say that out loud rather than discovering it
mid-pass. It is also where the un-catalogued `narakeet_fritzi` rows live.

### The ten voices — a naming problem wearing a drift costume

The store-design worker flagged ten distinct voice ids on the `deu_for_eng` German side. Live, that
is exact — and it decomposes into three quite different things:

- **Two of the ten are spelling.** `ara` and `xai_ara` are the same voice; so are `leo` and `xai_leo`.
  `voice_id` carries an optional provider prefix that is sometimes written and sometimes not.
  Canonicalising the prefix takes the German target side from **10 ids to 8**, and estate-wide there
  are **97 voice ids that exist in both prefixed and bare form**. It also takes the count of course
  sides carrying more than two voices from **200 down to 126** — so roughly a third of the estate's
  apparent voice drift is a string-formatting artefact.
- **`ara` and `leo` carry 99.5% of the side** — 27,901 of 28,037 clips. The two declared target voices
  are doing their job.
- **The remaining 136 rows are a June experiment.** Four clone ids (`3a7889066fa2`, `41321eb41295`,
  `458705c07139`, `40f31906b23d`), eleven stray `eve` rows and one `44c91d64`, all stamped
  2026-06-08 to 2026-06-19 — a batch window, the same signature as every other debris cluster this
  estate has produced.

**What that means in practice, under decision 2.** Voice is part of clip identity, so those 136 rows
are not wrong clips — they are clips of a voice this side does not use. Nothing needs re-rendering to
fix a naming artefact, and nothing needs re-rendering for the 99.5%. The German target migration is
therefore: **canonicalise the ids, declare `ara` and `leo` as the side's voices in VOICELAB, and
resolve 136 rows.** Of those 136, **14 already have a correct-voice row at the same role**, so they
are pure selection — the right clip exists and the wrong one is simply also present. The other 122 are
a decision: render on the declared voice, or leave them and let selection prefer the declared voice.
Either way it is a hundred-odd clips, not twenty-eight thousand.

**And that is the real German lesson.** The 48 texts in `deu_for_eng` (and 215 in `fra_for_eng`) that
carry more than one row at the same role are the ambiguity that caused the whole saga: the unique
constraint is `(course_code, text_normalized, language, role, voice_id)`, so two voices for one slot
is *permitted*, and something downstream picks. Every "the store looked right but the app played the
old one" bug lives in that gap. **Declaring one voice per side is what closes it** — not the hash, not
the gate. The hash makes the fix audible; the declaration makes the ambiguity impossible.

### A second fragmentation the identity key needs to survive

`course_audio.language` is not canonical either. German rows carry `deu`, `de` and `de-DE`; English
rows carry `eng`, `en` and `en-GB`; French rows carry `fra` and `fr` — all for the same language, in
the same courses.

Since the store's identity is `(language, normalised text, voice)`, **an uncanonicalised language code
splits one identity into three**, and the same sentence in the same voice gets rendered again because
it was asked for as `de` on Tuesday and `deu` on Thursday. Measured live: canonicalising both the
language code and the voice prefix takes the estate from **2,099,110 identities to 2,078,913** — a
further **20,197 renders that need never happen**. (The 2,099,110 figure reproduces the store
document's number exactly, which is a useful cross-check on both.)

Twenty thousand is modest against 2.5 million. The correctness point is not modest. The appendix at
`dacb13ad` enforces the identity as a **unique index on the raw columns** —
`audio_objects (language, text_normalized, voice_id) WHERE superseded_at IS NULL` — and calls that
index "the whole of the dedup mechanism". A unique index cannot see that `de` and `deu` are one
language or that `ara` and `xai_ara` are one voice: it will happily admit both, and the dedup
guarantee quietly becomes a dedup tendency. **The store's dedup guarantee is only as good as its
key's canonicalisation**, and the design's own reasoning —
that a normalisation miss costs one extra render and never a wrong clip — holds here too, so this is
safe to tighten later. But German and French are where the fragmentation is concentrated, so tighten
it *before* those two rather than after. **Recommendation: canonicalise `language` to a base ISO code
and strip the provider prefix from `voice_id` as part of the store's step 1 hashing pass**, which is
already read-only and already touching every row.

### The step order — make-before-break at every step

Doctrine is `AUDIO_PIPELINE_ARCHITECTURE.md` §6b, and it is not advice: on 2026-08-03 a French Azure
purge deleted 31,310 rows before re-rendering and left about 2,000 course slots silent for two days
(`docs/fra-audio-1608-forensics-2026-08-05.md`). **Nothing in this plan deletes anything.**

**Step 0 · Declare.** In VOICELAB, or by hand until VOICELAB exists: one voice per side per course.
`deu_for_eng` → `ara` (target1), `leo` (target2), `eve` (known). `fra_for_eng` → `eve` throughout.
`deu_at_for_eng` → `de-AT-IngridNeural` (target), one known voice chosen from its current three.
Freeze it as a versioned config. **No audio is touched.** This is the step that makes every later step
unambiguous, and it costs nothing.

**Step 1 · Canonicalise and hash, read-only.** Strip voice prefixes, normalise language codes, hash
every object, write `audio_objects`, back-fill `content_hash`. **No bytes move, no key changes, no
link changes, nothing deleted.** German first, French second, Austrian third. Output is the census
that tells you what is actually there.

**Step 2 · Measure before you fix.** Run the full gate stack over the hashed set as a *report*, not a
repair queue — the pace gate's own doctrine, respected. `fra_for_eng` has **zero** veracity-checked
rows out of 51,371 and `deu_at_for_eng` zero out of 27,264, so this is the first honest picture either
course has ever had. Publish the distributions: pitch, rate, loudness, per side. That is the course
voice report from §2, and building it here is what makes it exist.

**Step 3 · Resolve the ambiguous slots.** The 48 German and 215 French texts with more than one row at
the same role. For each, the declared voice from step 0 says which row wins; the loser is **left in
place, unlinked**. Nothing is deleted.

**Step 4 · Generate only what is genuinely missing** — and only with Tom's approval on a shown plan,
with the count and the cost stated. On today's numbers that is at most 122 German clips plus whatever
step 2's gates fail. Render, gate, hash, admit.

**Step 5 · Relink atomically, and prove it on served bytes.** Repoint the course rows, then ask the
live app for each slot and compare the bytes it hands back against the bytes we meant. This is exactly
the verification that made tonight's 57-slot German relink trustworthy (`751c9057`) — done by hand
there, and it is step 7 of the new pipeline done properly.

**Step 6 · Retire nothing.** Under content addressing the old object is still valid, still addressed,
and harms nobody. Deletion needs its own plan and Tom's approval, and this design does not ask for it.

**French is the same six steps with different numbers, and it should go second, not in parallel** —
German is where the diagnosis was earned, and running the two together means a mistake lands twice.

---

## Open questions, with my recommendations

1. **Canonicalise `voice_id` and `language` in the identity key?** They are not canonical today and
   that fragments the store's dedup and makes drift look worse than it is. **Recommendation: yes,
   as part of step 1's read-only pass.** Worth 20,197 avoided renders and, more importantly, an
   identity key that means what it says.
2. **`deu_at_for_eng` in scope?** **Recommendation: yes for the store migration, no for xAI.** `de-AT`
   has no xAI voice on current catalogues. It is the honest first exception and it is better as a
   documented one than a surprise.
3. **The 766 `narakeet_fritzi` clips and whatever wrote them.** **Recommendation: leave the clips,
   find the writer.** It is one of the side doors the store design closes with a foreign key, and it
   will start failing loudly — which is correct, but only if someone knows to expect it.
4. **Version `algorithm_config`?** **Recommendation: yes, and it is the cheapest high-value item
   here.** One small table, serves all four existing screens plus VOICELAB, and it makes "which config
   was this built under" answerable for the first time.
5. **Automatic provider fallback on repeated xAI failure?** **Recommendation: no.** A silent fallback
   means a course side quietly acquiring a second voice, which is the exact drift §4 is cleaning up.
   Fail loudly, and let a human choose in VOICELAB.
6. **Per-language xAI quality.** I could not establish it from the repo — one Italian phonology
   failure is the only recorded evidence, and everything else is Tom's ear, unwritten. **I do not hold
   a recommendation on which languages xAI is genuinely good at, because I have no data.** VOICELAB
   job 2 is the instrument that would produce it, and until it exists, xAI-first outside German,
   French, English and Italian is an assumption rather than a finding.
7. **`XAI_OFFICIAL` (17) versus the catalogue (20).** **Recommendation: read the catalogue.** One
   list, and it is the one that carries the voice ids.

---

*Store design and the numbers behind its claims: `AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`
and its migration appendix. Make-before-break doctrine: `AUDIO_PIPELINE_ARCHITECTURE.md` §6b.*
