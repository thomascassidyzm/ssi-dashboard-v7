# The audio pipeline rethought — providers, fidelity, and the labs

**2026-08-06. Design only — nothing built, nothing rendered, no data touched.**

> The store design settled *where a clip lives*. This settles *how it gets made, how we know it is
> good, and where the choices that shape it are allowed to live.*
>
> **Every generation job starts with a small sample. Not as a precaution — as step one.**

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

**Where this is heading, stated up front, because it changes what the strategy is for.** The long-term
destination is **SSi staff clones on xAI** — real people on the team, cloned, used **multilingually
wherever the clone is capable** — rather than stock provider voices. Tom's own clone is
`gfzdpspr5fdp` and he has heard it hold up in several non-English languages. Everything below is
designed toward that destination, not weighing it up. §3 gives VOICELAB a named first experiment to
establish where that one voice holds and where it does not.

*What it means for the product that a learner hears a specific human being — identity, consent,
longevity — is a wider question, and a separate frame-think has been commissioned on it. This
document is the concrete process and lab design; it will be checked against that frame-think when it
lands.*

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

### Small-sample-first — step one of every run, not a special event

**Standing ruling, 2026-08-06: TTS spend is unblocked, and every generation job begins with a cheap
sample pass before any bulk run.** Sampling is not a precaution taken when someone is nervous. It is
the first stage of the pipeline, it runs every time, and a bulk run that has not been preceded by a
passing sample is not a thing the pipeline can express.

This is the same move the store design made with the hash. The old rule was "be careful before you
render a lot" — a discipline someone has to remember. The new rule is structural: **the bulk stage
takes a passing sample verdict as an input, and there is no other way to start it.**

**The pipeline's step 3 becomes three steps.**

| | | |
|---|---|---|
| **3a · Sample** | Render a small stratified set on the declared voice | tens of clips |
| **3b · Judge** | Full §2 gate stack, plus an ear pass in the lab | minutes |
| **3c · Bulk** | Only on a pass. The sample's verdict is the entry token | thousands of clips |

**What goes in the sample.** Not the first N rows — that is a sample of the easiest material. Stratify
deliberately, on the axes that actually break TTS:

- **The shortest texts**, where the intercept dominates and where truncation hides. Seed-1 fragments
  are where every German defect this week was found.
- **The longest**, where prosody drifts and where a voice runs out of breath.
- **The phonologically awkward** for the language in play — German final devoicing and `ch`, French
  liaison and nasal vowels, whatever the language's known trouble is.
- **A few from the middle**, so the sample can calibrate as well as catch.

**How big.** There is a hard floor and it comes from the tooling, not from taste: `audio-pace-gate.cjs`
refuses to calibrate on fewer than **12 reference clips** and says so rather than guessing. A sample
below that cannot be engine-judged at all. **Proposed default: 24 clips, and never fewer than 12** —
above the calibration floor with margin, small enough to listen to in a couple of minutes.

**Why this costs nothing extra — and this is the part that makes it easy to accept.** Under content
addressing, the sample clips are not a throwaway pilot. They are ordinary gated objects at ordinary
addresses. When the bulk run comes through, those 24 identities already resolve and are never
re-rendered. **The sample is not overhead; it is the first 24 clips of the job, done first and looked
at.** The only true cost is the case where the sample fails — and that is the case where you have just
saved yourself the other 16,642.

**And the reason it is worth more than its cost: the sample creates the calibration set.** The pace
gate works by fitting a reference generation and measuring against it. Today it borrows a reference
after the fact, which is why it is an audit tool rather than a gate — you cannot judge a run against
a generation that does not exist until the run is over. **Render 24 clips first, pass them, and the
bulk run now has its own reference generation to be gated against in real time.** That is the missing
piece that turns the pace gate from a post-hoc census into an admission check, and small-sample-first
is what supplies it. It is the strongest argument for the ruling, and it is a structural one rather
than a prudential one.

**What a failing sample does.** It stops the run — that is the whole point — and it hands back a
specific verdict rather than "something was wrong": which tier failed, on which texts, with the clips
kept and playable. The response is to change the voice, change the parameters, or change the text,
and re-sample. **Nothing about a failed sample is wasted either**: the failed clips sit in quarantine
with their verdicts and are exactly the material a lab needs to work out what went wrong.

**Where it lives in the labs.** VOICELAB's Experiment 0 below is not a special procedure — **it is the
sample stage, run against a voice that has no verdict yet.** That convergence is worth noticing,
because it means there is one mechanism and two uses of it: sample a new voice to find out whether it
can do the job at all, and sample every run to find out whether today's renders are behaving. Same
stratified set, same gates, same ear pass, same frozen verdict. Build it once.

### Staff clones — the destination, and what the estate already shows

The strategy above describes stock voices. The destination is not stock voices, and the estate is
further along that road than anyone has written down.

**Tom's clone is already 11.7% of all audio in the system.** `gfzdpspr5fdp` carries **295,193** of the
2,532,679 rows in `course_audio` — the known side of **48 courses**, `target2` on 19, presentation on
18, and the fine-known pod track on 38. A staff clone is not a future shape; it is already the single
most-used voice in the estate by a wide margin, against **274** distinct canonical voices in total.

**And it has already been used multilingually — in production, for three days, unmeasured.** Between
2026-06-08 and 2026-06-10 the clone rendered **4,686 non-English clips across 11 non-English base
languages** — `fr zh it de es ja tr hi ar pt ko` — all on the `pod_explainer` role. German and French
account for **1,126** of them (465 German, 661 French).

Two things about that corpus, and the second one is the important one.

**It is free to audition.** Those clips exist. Under content addressing an identity that already
exists costs nothing to hear. The first evidence about clone multilingual capability can be gathered
without rendering a single second of new TTS.

**It is not the experiment.** I sampled the text and it is **code-switched**, not monolingual — an
Arabic phrase followed by its English gloss, in one clip, in one voice:

> `"شكراً جزيلاً". means thank you very much. "بارك الله فيك". means may God bless you.`

So the `language` column says `ar`, and the clip is mostly English. Checked directly: **there are zero
clips where the clone carries a monolingual non-English role** — no `target1`, no `target2`, no
`known`, no `presentation` in any non-English language. The clone has never once been asked to speak
a whole German or French course sentence.

That is the honest position, and it is a good one to start from: **the existing corpus is a harder
task than the experiment** — code-switching mid-clip is more demanding of a voice than sustained
monolingual speech — **but it is not the same task**, and it has never been assessed. It is the
warm-up, not the verdict.

### The ladder, stated

**Voice selection — clone-first, and how the gap gets filled.** This is the ladder that decides *which
voice a side declares*, and it runs once per course side in VOICELAB, not per render:

1. **A staff clone proven capable in this language.** The default, and the destination.
2. **Another staff clone proven capable in this language.** A different colleague's voice is still an
   SSi person and still the intended shape. Preferred over any stock voice.
3. **An xAI stock voice** — the per-language named voices, or one of the five multilingual voices
   (`ara`, `eve`, `leo`, `rex`, `sal`). This is where German and French sit *today* (`ara`/`leo`/`eve`).
4. **Azure** — only for the 25 languages xAI does not cover and the four regional variants it has no
   voice for. `de-AT` is the live example, and no amount of cloning changes it: an Austrian-German
   staff clone would need an Austrian-German speaker on the team.

**"Proven capable" has to mean something measurable, or step 1 becomes taste wearing a lab coat.** The
proposed capability verdict per `(clone, language)` — all four already computable from machinery in
this document:

- **Phonology pass rate.** Fraction of takes whose detected spoken language is the steered language,
  measured by the gate already at `tts-service.cjs:554-631`. This is the sharp one: it is exactly the
  failure mode a clone is most likely to have, since a clone of an English speaker is by construction
  English-dominant. **A clone below the bar here fails, whatever it sounds like.**
- **Speaking rate sanity.** Syllables per second of speech span against the language's own norm. A
  voice struggling in a language runs slow and hesitant, or fast and slurred.
- **Consistency against the same clone's English.** Pitch centre and spread from §2. A clone that
  shifts register when it changes language is doing an impression, not speaking.
- **A blind A/B against the incumbent stock voice**, on real course sentences. Tom's ear, made
  cheap and repeatable — the only one of the four that is a taste call, and it goes last, after the
  three measurements have already eliminated the voices that cannot pass.

The first three are automatic and produce a shortlist. The fourth is the decision. **That is what "on
evidence rather than taste" means here — not that taste is removed, but that taste is spent only on
candidates that have already passed.**

### The render-time ladder

Once a side has declared its voice, generation does not get a vote:

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
| Whisper CER | `services/audio-veracity.cjs` | are the right words in there | **generation time** — `renderChecked` at `phase8-audio-v13.cjs:2089, 2588, 4777`, before the S3 put and the row upsert |
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

**Loudness — measured, never refused.** `services/audio-processor.cjs` normalises to a fixed
**−16.0 LUFS** target (`:552`) and it does read the measured value back (`:317`, `:575`) — but nothing
compares the output against a band and nothing fails a clip for missing it. The module's own comments
record that a single `loudnorm` pass can stall **4–6 LUFS short** of target (`:301`). So the estate
applies a loudness target blind and finds out later, by ear. The evidence for what "right" sounds like
is a single 25-clip test (`docs/audio/deu-loudness-cluster-test-2026-08-06.md`) sitting between −15.0
and −16.3 dB. **Turning an existing measurement into a verdict is the cheapest gate in this document** —
the number is already computed; it is simply thrown away.

The only loudness *consistency* check that exists anywhere is `audio-pace-gate.cjs`'s opt-in
`--loudness` leg, which fetches **the bytes the live app actually serves** and flags anything outside
the reference generation's own p2–p98 band ±3 dB. It is sampled, off by default, and manual.

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
needs to be able to hear what failed and why. `audio-veracity.cjs` already does exactly this — three
attempts, then quarantine of the failing bytes plus a JSONL record, nothing uploaded and nothing
inserted. **The pattern exists; it needs extending to the other tiers, not inventing.**

**One behaviour to change deliberately.** Today an *unchecked* clip is published — `renderChecked`
returns `pass: null` when it could not measure, and the caller uploads anyway, recording the outcome
as `unchecked` rather than as a pass. That was an honest choice for a gate retro-fitted onto a live
estate. Under a store where admission is the guarantee, it inverts: **`null` must refuse.** If the
gate cannot measure a clip, the clip does not enter the store, because the store's whole promise is
that everything in it passed. The three-outcome shape stays — it is the right shape — but the
disposition of the third outcome flips from admit to quarantine.

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

What separates them is narrower and sharper than the framing suggested, and it is worth stating in
terms of what each screen *persists*, because that is where they genuinely diverge:

| screen | material | persists | writes live config? |
|---|---|---|---|
| VadLab | frozen 774-clip study corpus + your own microphone | **evidence** — recordings to S3 with scores and features | no config at all |
| PodLab | live Supabase pod sentences and course audio | **content** — `atom_map_fine`, a draft column, tile-verified server-side | **deliberately refuses** |
| ListeningConfig | live legos, pod sentences, explainer audio | config | yes, globally |
| SpeakingConfig | live seeds and clip durations | config | yes, globally |

So: **a lab owns a model, a config page owns a model's settings** — but the sharper operational line
is that the two labs persist something *other than* live settings, and both of them arrived there by
choice.

`VadLab` has `vadProsody.js` — an extractor and a comparison, mirrored against a Python reference so
the two agree. `PodLab` has the pod fine-map. Those screens exist because there is a *computation*
whose behaviour you cannot predict from its parameters, so you need to see it run on real material to
know what it does. `ListeningConfig` and `SpeakingConfig` drive models that live elsewhere —
`pauseModel.js` is imported by the shared layer, and the speaking algorithm lives in the production
service — and their job is to expose the knobs well.

So the honest distinction is: **a lab is where a model is developed; a config page is where a
developed model is operated.** Both need real material and audible preview. The lab additionally
needs comparison, and a record of what was compared.

**What none of the four has: versioning — and one of them is already refusing to save because of it.**

`algorithm_config` is one row per key, upserted in place. No version column, no history table, no
snapshot, no draft/published split, no environment split. `updated_at` and `updated_by` are the entire
audit trail: you know who last and when last, and nothing about what it was before. **The previous
value is gone.** Rollback is "remember the number and re-type it".

And it is worse than a missing feature, because of what sits downstream:
`useAlgorithmConfig.ts:487` in the learning app caches for **five minutes**. So a Save on the Listening
or Speaking page is a **production deploy to every learner on every course, within five minutes, with
no undo**.

**PodLab already knows this and has opted out.** Its header states it outright: because
`algorithm_config` writes are immediately global with no draft/env split, the lab reads live config as
a starting point and **never writes it back** — it exports the tuned JSON to the clipboard for a human
to apply deliberately somewhere else. The most carefully built bench in the estate has concluded that
its own persistence layer is too dangerous to use, and has routed around it with a clipboard.

That is not a quirk. **It is the same defect as the audio store's, in a second place** — a name whose
meaning can change underneath you — and it has the same fix. **A config should be content-addressed
too**: hash the config object, store it immutably, and have the live pointer name a hash. Then "which
config was this course built under" is answerable, rolling back is repointing, and a draft can exist
without being live. One small table, serving all four screens plus VOICELAB.

**This is my strongest recommendation in this document after the store itself**, and PodLab's
clipboard is the evidence that the people building on this layer already want it.

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

### Experiment 0 — can Tom's clone carry German and French?

**This is the bench's day-one job, and VOICELAB should be designed so it is the obvious thing to do
first rather than something you could do if you configured it right.** One voice — `gfzdpspr5fdp` —
across the languages in play, German and French first because they are the two test cases, and a
verdict you can freeze into a config.

It runs in three phases, and **the first two cost nothing**, which is the whole point of designing it
this way:

**Phase A · Audition what already exists — zero spend, available immediately.** The 1,126 German and
French clone clips from June are sitting in the estate. Play them. They are code-switched explainers
rather than course sentences, so they cannot give a verdict — but they can give a *refutation*: if the
clone's German phonology is visibly wrong in material we already own, the experiment stops here and
has cost nothing. Run the phonology gate over them retrospectively for a first number, and note the
known limit — on a code-switched clip, "detected language: English" is the correct answer, so this
phase needs the gate pointed at the non-English spans, not the whole clip. **Where phase A is
unmeasurable, it is still audible, and Tom's ear on ten clips is a legitimate stopping test.**

**Phase B · Compare against the incumbents, still zero spend.** German is currently `ara` and `leo`;
French is `eve`. Those sides hold **28,037** and **14,706** clips. So for any course sentence, the
incumbent take already exists and is free to play. The bench lines them up side by side on identical
text. Half of every A/B is already paid for.

**Phase C · The actual test — unblocked, and it is simply the sample stage pointed at a new voice.**
The smallest render that answers the question: **the clone speaking whole German and French course
sentences as a course voice**, which has never happened. Under the standing ruling this no longer
waits on a shown plan; it waits only on phases A and B, which are free and which might make it
unnecessary:

- **Sentence set: 40 per language.** Drawn from real `deu_for_eng` and `fra_for_eng` seeds, stratified
  deliberately — short fragments where TTS is worst, long sentences where prosody shows, and the
  phonologically awkward ones each language has (German final devoicing and `ch`, French liaison and
  nasal vowels). Not a demo reel: the material the learner actually hears, chosen to be hard.
- **80 clips total** — two runs of the standard 24-clip sample, widened to 40 because this voice has
  no track record at all in these languages and the stratification has more axes to cover. Against
  28,037 existing German clips it is a rounding error.
- **Every clip passes the full §2 gate stack**, so the experiment produces measurements and not just
  impressions — phonology pass rate, speaking rate, pitch consistency against the clone's own English.
- **Then the blind A/B** against `ara`, `leo` and `eve` on the identical sentences, with the incumbent
  side free from phase B.
- **Output: a frozen, versioned capability verdict per `(gfzdpspr5fdp, language)`** — hold, or does not
  hold, with the four numbers and the sentences behind it. That verdict is what a course side's voice
  declaration then cites.

**And if it passes, the 80 clips are kept.** They are gated objects at real addresses in the languages
concerned, so if the clone goes on to voice German they are the first 80 clips of that job and the
seed of its reference generation. If it fails, they are the evidence of *how* it fails, which is the
thing nobody has ever had.

*This document designs the experiment; it has not been run here.*

**Why the design generalises.** Nothing in phases A–C is specific to Tom or to German. Swap the voice
id and the language and it is the capability test for any staff clone in any language — which is what
turns "SSi staff clones, used multilingually" from an aspiration into a process with an entry gate.
Run it once per `(clone, language)` pair and the result is a capability matrix: which of our people
can carry which languages, on evidence. **That matrix is the actual asset VOICELAB produces**, and
nothing in the estate can produce it today.

**What it reuses**: `algorithmConfigShared.js` for the config layer, `vadProsody.js` for the extraction
and comparison, `VadLab.vue`'s recording and playback UI as the pattern, the pod voice catalogues as
the candidate list, `services/voice-discovery-service.cjs` for enumeration. It is a fifth entry on
`ConfigsIndex.vue` and a fifth route beside the four in `src/router/index.js:478-511`.

**The one hard constraint: VOICELAB auditions cost money.** Every candidate voice on every sentence is
TTS spend. Spend is no longer gated, but that is not a reason to be wasteful, and one design rule
does the work: **VOICELAB auditions from the store first.** Under content addressing a
`(language, text, voice)` that already exists is free to audition, and the estate has 2.5 million of
them — so most of any comparison is already paid for, as phase B below demonstrates. It renders only
what is genuinely new, and it renders it as a **sample**, never as a bulk run: a lab is by definition
where you try 24 clips, not 16,000. The lab's natural unit and the pipeline's mandatory first stage
are the same unit, which is why the two fit together without any special-casing.

### Listening and speaking as labs — honestly

**Listening gains something real.** Its model — pause timing, `pauseModel.js`, belts, syllable buckets
— is genuinely a model whose behaviour you cannot predict from its parameters, and the screen already
loads real pod sentences and real audio to preview it. It is a lab that has not been called one. What
it is actually missing is the versioning above: "the pauses felt right last month" is currently an
unanswerable question. **Recommendation: give it versioned configs and rename it LISTENING LAB. That
is the whole change.**

**Speaking is already a lab and is only missing the name.** I had this wrong on a first pass and the
code corrects me: `SpeakingConfig.vue:121` titles its own section **"Pause lab — {mode} timing"**. It
has eight knobs on the boot-plus-assembly pause model, an SVG curve of pause-against-syllable-count
that redraws on every drag **with real sample sentences plotted as dots** so the synthetic curve is
anchored to actual clips, a sampler that picks one distinct real sentence per syllable bucket, belt
A/B across White/Yellow/Orange/Green, and `playWithPause` — which plays a real sentence exactly as the
learner hears it, known prompt, the computed gap, target1 at belt speed, target2. **You hear the
parameter.** That is a bench by any definition offered in this document.

**Recommendation: rename it SPEAKING LAB and give it versioned configs.** No structural work; the lab
is already built. It is the clearest case in the estate of a thing being better than its label.

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

### What a multilingual staff clone does to the store

Under the settled identity `(language, normalised text, voice)`, a clone used multilingually is **one
voice id appearing across many language values**. Three consequences, and the third is a warning.

**Dedup gets better, not worse.** The identity key does not care that one voice spans languages — it
keys on all three fields, so the clone speaking German and the clone speaking English are different
identities and always were. What improves is *convergence*: the fewer distinct voices the estate uses,
the more course sides land on the same `(language, text, voice)` triple and share an object. The clone
already demonstrates this — it is the known-side voice of **48 courses**, so every English sentence
those 48 courses share is already one identity rather than 48. A staff-clone estate is a
*more* deduplicated estate, and the 236,908 saving in the store design is a floor, not a ceiling.

**Declaration gets simpler.** A course side declares a voice id; the language comes from the side, not
from the voice. So a multilingual clone needs no special representation at all — `deu_for_eng`
target1 declaring `gfzdpspr5fdp` and `fra_for_eng` target1 declaring `gfzdpspr5fdp` are two ordinary
declarations that happen to name the same person. **The only new thing is the capability gate**: a
side may not declare a clone for a language where that `(clone, language)` pair has no passing verdict
from Experiment 0. That is one check at declaration time, and it is the entire mechanism by which
"wherever the clone is capable" stops being a hope.

**And the warning: multilingual clones multiply the canonicalisation bug below.** A stock voice used
in one language can only fragment across that language's code variants. A clone used across eleven
languages fragments across all of them at once. The evidence is on Tom's own voice, right now: the
clone's English clips are split across **three** language values — `eng` (239,866), `en` (42,558) and
`en-GB` (236) — for one voice speaking one language. Estate-wide there are **132 distinct values** in
`course_audio.language` for something on the order of forty real languages. The more multilingual the
voices become, the more that costs, which makes the next section a prerequisite for the staff-clone
strategy rather than a tidy-up alongside it.

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

*One piece of doctrine drift to fix while we are here: §6b names `tools/repair-silent-clips.cjs` as a
reference implementation of make-before-break, and the store design's appendix repeats it. That tool
was retired on 2026-08-05 and is now a shim (`tools/repair-silent-clips.cjs:3, :93`). The doctrine is
sound; one of its two worked examples no longer exists.*

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
course has ever had.

**Expect this step to find a lot, and budget for it.** The pace gate has already been run once on the
`deu_for_eng` known side and the result is the most decision-relevant number in this document:
**3,210 of 16,666 clips sit below the threshold** — against a reference generation whose own 2nd
percentile is −0.144, i.e. the new generation is internally consistent and those 3,210 are genuinely
adrift of it. That is 19% of one side of one course, found by one gate that has never been part of
the pipeline. Some fraction is already addressed by the seeds 1–10 known-side replacement
(`c212fcac`), and the number should be re-measured rather than assumed — but **plan German on the
expectation that step 2 returns thousands, not the 136 off-voice rows below.** The two numbers answer
different questions: 136 is "wrong voice", 3,210 is "right voice, wrong take". Publish the distributions: pitch, rate, loudness, per side. That is the course
voice report from §2, and building it here is what makes it exist.

**Step 3 · Resolve the ambiguous slots.** The 48 German and 215 French texts with more than one row at
the same role. For each, the declared voice from step 0 says which row wins; the loser is **left in
place, unlinked**. Nothing is deleted.

**Step 4 · Sample, then generate what is genuinely missing.** On today's numbers the German target
work is at most 122 off-voice clips, plus whatever step 2's gates fail — and step 2's known-side
number is expected to run to thousands, so this is a real run and not a touch-up. **It therefore
starts where every run now starts: 24 stratified clips on the declared voice, engine-gated and
listened to, and only then the rest.** The sample doubles as the run's reference generation, so the
bulk stage is gated against its own generation in real time rather than audited a week later. Render,
gate, hash, admit.

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
6a. **Experiment 0, phase C — 80 clips, now unblocked.** No longer a decision about money.
   **Recommendation: still run phase A first**, not to save the spend but to save the *time* — the
   1,126 clips we already own can refute the clone's German in ten minutes of listening, and there is
   no sense gating a render on a question that existing audio might already answer. If phase A is
   ambiguous or encouraging, go straight to C.
7a. **Sample size — 24 clips, and never fewer than 12.** The floor is not taste: the pace gate refuses
   to calibrate below 12 reference clips. **Recommendation: 24 as the default**, widened for a voice
   with no track record. Worth Tom's ear on the first few real samples to say whether 24 is enough to
   hear a voice by; that is a taste call and the number is one edit to change.
7. **`XAI_OFFICIAL` (17) versus the catalogue (20).** **Recommendation: read the catalogue.** One
   list, and it is the one that carries the voice ids.

---

*Store design and the numbers behind its claims: `AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`
and its migration appendix. Make-before-break doctrine: `AUDIO_PIPELINE_ARCHITECTURE.md` §6b.*
