# A-133 Part B — per-voice raw-tail screen for T-21 casting

**Date:** 2026-08-17 · Design + working script. Not run across the T-21 pool — that is a bulk
render and it is Tom's call.

Tool: `tools/a108/a133-voice-tail-screen.cjs`
Sibling: `tools/a108/a133-tail-probe.cjs` (Part A — the render-time treatment; supplies the
envelope/event primitives this screen imports)

---

## The commission

Tom, 2026-08-17: *"I think the trick is to not use voices that generate clicks right?"*

T-21 is casting voices for 41 languages. A clicking voice caught **before** casting costs one short
render. Caught **after** casting it costs a whole language's audio, plus the make-before-break dance
to replace it. So the screen is worth building even if it only catches the obvious cases.

## What the signal actually is

The A-131 blind test proved a voice can ship a click in the provider's own bytes with none of our
processing on it. A-133 then measured what that click *is*, and it is not what everyone assumed.

It is **not** an end-of-file hard cut. On `xai_247783ebdd51` the file ends in ordinary decay and
then true digital silence. The click is **one or more isolated impulses sitting in the dead room
tone after the last phonation** — 261 ms and 380 ms after speech ends, on a clip whose room floor is
−66.5 dB.

That reframing matters for the screen: measuring the level at the last non-silent sample (the
obvious "hard cut" test) finds **nothing** on this voice. It reads −70.9 dB, indistinguishable from
the clean voices. A hard-cut screen would have passed the one voice we know is broken.

## The measurement

All levels are **dB relative to the clip's own speech peak**, never absolute dBFS — xAI clones run a
crest factor around 19 dB, so a fixed floor means a different thing on every voice.

1. Decode the **raw** provider bytes to mono 44.1 kHz. No processing of ours is applied first; the
   point is to judge the voice, not the chain.
2. Build an envelope of **5 ms window peaks**.
3. Group windows above **−45 dB** into events, merging across gaps of ≤20 ms.
4. Label each event: **speech** if ≥40 ms of it is actually above threshold, otherwise **impulse**.
   The summed-energy test is load-bearing — a decaying tick rings across a 45 ms *span* on only
   20 ms of real energy, and span-based counting mislabelled the first Dutch tick as speech on the
   first pass.
5. **End of speech** = the end of the last speech event.
6. **Room floor** = median of 2 ms window peaks over `[eos+30 ms, eos+130 ms]` — a fixed physical
   region, so it is comparable across clips of different lengths.
7. **Verdict**: any post-speech impulse **≥ +20 dB over the room floor** ⇒ `suspect`. Otherwise
   `pass`. No sustained speech at all ⇒ `unreadable` (failed render).

## Where the +20 dB threshold comes from

Measured on the four voices A-133 rendered — one known positive (Tom's blind-test slot 4) and three
known negatives:

| voice | room floor | post-speech impulses | worst, over floor | verdict |
|---|---|---|---|---|
| `xai_247783ebdd51` (Noor) — **known clicker** | −66.5 dB | 2 | **+41.7 dB** | suspect |
| `xai_58d27475085e` (Femke) | −83.4 dB | 0 | — | pass |
| `xai_a13662ba951c` (Thijs) | −54.3 dB | 0 | — | pass |
| `azure_nl-NL-FennaNeural` | −57.9 dB | 0 | — | pass |

The separation is +41.7 dB against literally nothing. +20 dB sits roughly halfway down that gap and
is a long way clear of both sides. It is not a tuned number and it does not need to be — there is no
borderline case in this evidence to tune against.

Running `node tools/a108/a133-voice-tail-screen.cjs` with no argument re-screens exactly these four
and asserts the expected verdicts, so the shape is regression-checked without new spend.

## How confident to be — read this before trusting an output

**n = 1 known positive, 3 known negatives, one line, one language.** That is the whole evidence
base. Be honest about what follows from it:

- It screens the **obvious** case: a voice that fires a loud, isolated tick into dead air. On that
  case the margin is enormous and I'd expect near-perfect agreement with an ear.
- It **will miss** marginal ones: a tick only a few dB over floor; a tick landing *during* speech,
  where it is masked by the envelope test; a voice that only ticks on some lines or some lengths
  (one render per voice is one sample — a voice that clicks 1 line in 5 has a 20% chance of being
  caught).
- It says nothing about any other voice defect — breathiness, hiss, pace, gender, pronunciation.
- A `suspect` verdict means **"a human listens before this voice is cast"**. It is never an
  automatic reject, and it must never be wired to reject one.

The estate has already been burned once by a tail detector taken more seriously than its precision
justified: `flagTailDefect` is 9% precise by ear and used to drive a repair that amputated taught
words from live German course clips (`docs/DECISIONS.md`, 2026-08-05). This screen is read-only by
construction — it renders, measures and prints, and modifies no audio anywhere — but the lesson that
matters is the epistemic one, not the code one. Report the number next to the verdict, always, so a
human can overrule it with the evidence in hand.

## Sampling order — heavy use first (Tom's ruling, 2026-08-17)

> "Sample HEAVY-USE voices first, not alphabetically. (1) English voices first — his own voice
> clone and Olivia; (2) the big money courses next — Chinese, Spanish, German, French, Japanese;
> (3) everything else after."

Implemented in `prioritise()` (`a133-voice-tail-screen.cjs`), applied by the screen itself to
whatever list it is handed, so a hand-typed list cannot silently fall back to typing order. The
candidate list is built in that order by `a133-build-screen-list.cjs`, which attaches each voice's
measured clip count so the ranking is evidence rather than assertion.

The ruling is not a preference, it is blast radius, and the numbers are lopsided enough to be worth
seeing. Estate-wide clip counts in `course_audio`, 2026-08-17:

| rank | voice | clips |
|---|---|---|
| 1 | `en-GB-SoniaNeural` | 414,080 |
| 2 | **`gfzdpspr5fdp` — Tom's clone** | **325,223** |
| 3 | `eve` | 162,906 |
| 4 | **`bedd6226` — Olivia** | **150,237** |
| 5 | `leo` | 90,044 |
| 6 | `en-GB-RyanNeural` | 79,120 |

The two voices Tom named are #2 and #4 in the entire estate. Screening one of them costs the same
single render as screening a voice nobody has cast yet, and it stands behind ~475,000 shipped clips.

**What the order buys, concretely:**

| tier | voices | clips behind them | share of all voiced clips | cost |
|---|---|---|---|---|
| 1 — English side | 13 | 1,336,486 | **53.5%** | ~$0.03 |
| 1 + 2 — plus zho/spa/deu/fra/jpn | 36 | 1,686,542 | **67.5%** | ~$0.07 |
| all three tiers | 38 | 1,697,000 | 67.9% | ~$0.08 |

So thirteen renders and about thirty seconds of wall clock covers over half the audio the estate has
ever shipped. `screen.json` is rewritten after every single voice, so a sweep killed part-way still
leaves the tier-1 verdicts on disk — which is the whole point of ordering it this way.

**One thing to flag back to Tom.** Sonia (#1) and Eve (#3) are English-side voices too, and he named
only the clone and Olivia. I have put his two first, in his order, and the rest of the English pool
immediately behind them in tier 1 rather than making them wait for tier 3 — on the reading that
"English voices first" is the rule and the two names are emphasis. If he meant *only* those two in
tier 1, that is a one-line change to `TIER1_LANGS`.

### Two traps in building the list, both of which produced wrong answers first

**1. Olivia is not findable by name.** `voices` stores her as id `bedd6226` with `display_name`
'Olivia'; `course_audio.voice_id` never contains the string "olivia" anywhere. A name search returns
zero rows and reads as *"there is no Olivia voice"* — which is how a prior note in my own memory came
to record exactly that, and it is wrong by 150,237 clips. Resolve named voices through
`voices.display_name` → `voice_id`, never by matching the name against `course_audio`.

**2. A voice's language is a property of the voice, not of the courses it serves.** Deriving it from
`courses.target_lang` is wrong and *looks* right, because a course has two sides and roughly half the
estate's clips are a voice reading the KNOWN side. Doing it that way labelled `zh-CN-XiaochenNeural`
as English (she reads the Chinese known side of `eng_for_zho`, whose `target_lang` genuinely is
`eng`) and `ta-LK-SaranyaNeural` as Korean. Both would then have been screened on the wrong probe
line. The builder now reads the locale out of the Azure voice name and treats the xAI multilingual +
clone pool as the English known-side pool, which is what it is.

Also live here: the **bare/prefixed voice-id duality**. Tom's clone is 183,194 rows as
`gfzdpspr5fdp` and a further 142,029 as `xai_gfzdpspr5fdp`; Olivia is 70,281 + 79,956. Match one
spelling and every voice is under-counted by roughly half and the whole ranking is wrong.

### Explicit gap — 88 heavy voices have no probe line yet

The builder covers eng/nld/zho/spa/deu/fra/jpn. **88 voices with ≥2,000 shipped clips are excluded**
because no probe line exists in their language — including `ta-LK-SaranyaNeural` (41,913 clips),
`it-IT-ElsaNeural` (30,338), `pt-PT-RaquelNeural` (20,404), `ar-EG-SalmaNeural` (19,475) and the
whole Indic and Korean set. They are printed by name and count on every run rather than silently
dropped. That residue is tier 3 by Tom's ruling, so the ordering is unaffected — but "we screened
the estate" cannot be claimed until those lines exist. Writing them is cheap and needs a native eye,
not a render.

## Cost of a full T-21 screen

- **Renders**: one short line (~2–3 s of speech) per candidate voice.
- **The list as it stands today**: 38 voices with probe lines ⇒ **38 renders, ~$0.08, ~2 minutes**
  at the default concurrency of 4. Tier 1 alone is 13 renders, ~$0.03, well under a minute.
- **Full estate coverage**, once probe lines exist for the 88 gapped voices: ~126 voices ⇒
  **~$0.25, 5–8 minutes**.
- **The whole T-21 candidate pool** including voices never yet cast (xAI's per-language lists plus
  the Azure candidates across 41 languages, ~250 voices) ⇒ **~$0.50, 10–15 minutes**.
- Earlier drafts of this doc quoted only the ~250-voice figure. The priority ordering is what makes
  the cheap numbers above meaningful: you do not have to buy the whole sweep to cover most of the
  estate.
- **Output**: a `screen.json` plus the raw mp3s kept on disk, so every `suspect` can be listened to
  immediately rather than re-rendered.

Use each voice's own language and a line with a clear phrase-final consonant — a click hides behind
a trailing vowel's decay. The Dutch probe line (`Ik wil graag een glas bitter, alstublieft.`) is a
good shape: sentence-final, two syllables of decay, no trailing breath.

**Not authorised by this document.** A 250-render sweep is bulk rendering and Tom rules on it as its
own piece of work. Nothing in A-133 unpauses T-21.

## Open question for Tom

If the screen flags a voice already cast on a live pod, the answer is a recast under
make-before-break, not a repair — but no replacement-voice policy exists for "the clean voice of the
right gender in that language is already taken". Worth a ruling before the sweep runs, not after.
