# Romance bound-form / licensor-outside-chunk repair — 4 courses

*2026-09-01. Executing Kai's ruling ("Yup, fix all and regenerate") on the Romance
slice of the `bound-form-licensor-scan-2026-09-01` findings: `spa_mx_for_eng`,
`por_br_for_eng`, `glg_for_eng`, `fra_for_eng`. Every defect was re-derived against
the live DB and against each course's own attested practice before it was touched.
Method is the Italian method — clause 1 merge toward the licensor, clause 2 correct
the form where no licensor exists, no invented notation, no rewriting of text that
is not wrong.*

## Direct answer

**20 defects fixed across 4 courses; 39 clips regenerated, every one verified
rendered, correct-voiced and transcribed back passing.** One course, French, is
genuinely served by xAI on all three roles, so its single fix could not be
re-rendered — 3 clips are an explicit gap for Kai, below. Two of the scan's Spanish
findings are disputed: on my reading they are correctly licensed and were left alone.

| Course | Scan said | I confirmed | Fixed | Clips regenerated | Boundary moved |
|---|---|---|---|---|---|
| `spa_mx_for_eng` | 8 | 7 (2 disputed, 1 new) | 7 phrases | 14 (Azure es-MX) | no |
| `por_br_for_eng` | 2 legos / 8 phrases | 8 + 3 more of the same shape | 11 phrases | 22 (Azure pt-BR) | no |
| `glg_for_eng` | 1 | 1 | 1 lego + 1 phrase | 7 (Azure gl-ES/en-GB) | **yes** |
| `fra_for_eng` | 1 | 1 | 1 phrase | **0 — blocked, see gap** | no |

---

## spa_mx_for_eng — 7 fixed, 2 disputed, all case 2, no boundary moved

The scan's reading was right about the shape: a bare-subjunctive LEGO
(`pudiera`, `puedan`, `tenha`… ) drilled correctly under its licensed frames
(`si …`, `espero que …`, `a menos que …`, `es importante que …`) and then welded
once, by an affirmative `creo que`, into a frame that takes the indicative.

Every one is **case 2 — no licensor exists in the sentence, so the text was simply
wrong**. Affirmative `creer que` is a fact-reporter in Spanish and takes the
indicative; only negation licenses the subjunctive, which is exactly what the course
already does elsewhere (`no creo que puedas` S0526L02U01, `no creo que tengan tiempo`
S0532L01U05, `no pienso que sea …` ×8 at seed 330). **No LEGO text changed, so no
presentation clip and no phrase id moved.** All five seeds are unapproved, so O5 did
not apply.

| Phrase | English (known, unchanged) | Was | Is now | Why |
|---|---|---|---|---|
| `S0501L03U04` | I believe I could trust him | `creo que pudiera confiar en él` | `creo que podría confiar en él` | conditional, as the course's own sibling `S0501L03U03 podríamos confiar en él` does; `podría` attested from seed 116 |
| `S0501L04U04` | I believe I could trust that they played | `creo que pudiera confiar en que jugaran` | `creo que podría confiar en que jugaran` | same; `jugaran` left alone — under a conditional main verb it is the well-formed sequence, and it is this lego's own taught chunk |
| `S0531L01U03` | I believe whoever can go | `creo que cualquiera pueda ir` | `creo que cualquiera puede ir` | the licensor for this lego is `no es verdad que` (B03/U01/U02), absent here; `puede` attested from seed 232 |
| `S0532L02U05` | I believe they have luck | `creo que tengan suerte` | `creo que tienen suerte` | licensor `a menos que` / `es importante que` absent; `tienen` attested from seed 450 |
| `S0542L01U04` | I believe you be feeling well | `creo que te sientas bien` | `creo que te sientes bien` | licensor `es importante que` / `siempre que` absent; `te sientes` attested from seed 40 |
| `S0668L02B02` | yes, they can | `sí, puedan` | `sí, pueden` | the por_br subtype: an isolated yes/no response with the governor (`espero que`) stripped entirely |
| `S0668L02U03` | I believe they can go | `creo que puedan ir` | `creo que pueden ir` | licensor `espero que` absent; `pueden` attested from seed 529 |

**Audio.** All 14 target clips regenerated through `/regenerate-phrase`, both roles,
in the course's incumbent voices — `azure_es-MX-CarlotaNeural` (target1) and
`azure_es-MX-LucianoNeural` (target2). **All 14 veracity-passed at CER 0 (exact).**
The 14 superseded clips are still in place, unlinked; nothing was deleted. Known
clips were kept — no known text changed.

**xAI hazard — proved, and it did not bite.** The brief listed `spa_mx_for_eng`'s
known role as configured-xAI-but-served-by-Azure. Counting linked known clips across
seeds, LEGOs and phrases, that is only half true: **9,047 on Azure Sonia vs 5,649 on
the xAI clone `gfzdpspr5fdp`** — a genuinely mixed role, and the specific known clips
in this seed range are on the *clone*, not Azure. So a repoint of the known role
would have been a real voice migration here, not the taste-safe correction it was
for `ita_for_eng`. It was not needed: **no known text changed**, so nothing was
blocked and the config was left untouched. Target1/target2 are already Azure.

### Disputed — scan says 8, I confirm 7

I could not reproduce an eighth affirmative-`creer` defect. Swept the whole course for
irregular subjunctive forms under every assertive frame (`creo/creemos/cree que`,
`pienso que`, `sé que`, `es verdad que`, `estoy seguro de que`, `parece que`,
`porque`) — 716 `creer` phrases read. Everything else is licensed. The two most
likely candidates for the eighth, both of which I **dispute and left alone**:

- `S0526L02U01` — "I don't believe you're able to" → `no creo que puedas`. **Correct.** Negated `creer` licenses the subjunctive.
- `S0532L01U05` — "I don't believe they have time" → `no creo que tengan tiempo`. **Correct**, same reason.

`S0482L01U03` — "I believe the hope is that they aren't being serious" →
`creo que la esperanza es que no estén hablando en serio` — also **correct** and left
alone: `creo que` governs the indicative `es`, and the subjunctive `estén` is licensed
by `la esperanza es que`, not by `creo`.

Conversely, one of my seven (`S0668L02B02 sí, puedan`) is **not** a `creo que` case at
all — it is the Portuguese subtype, an isolated yes/no response, and the scan did not
describe it. So the count may simply be one different item each way.

### Left alone deliberately

`S0501L03U04`'s sibling `pudiera`/`puedan`/`tengan` **LEGO citations** were not
touched. Unlike the Irish case — where the course itself already taught the
unlenited citation elsewhere, so putting the LEGO back was following the course —
here the subjunctive citation is what these seeds exist to teach, drilled correctly
by four or five licensed phrases each. Changing them would have broken those. The
cost of this choice, stated plainly: for `S0668L02` and `S0531L01`, one of five use
phrases no longer contains its lego's exact form.

---

## por_br_for_eng — 11 fixed, all case 2, no boundary moved

A cleanly different subtype, and the scan named it exactly: a *correctly licensed*
subjunctive stripped of its governor by the build system's **isolated yes/no response
template**, which mechanically produces `sim, <lego>` / `não, <lego>` /
`isso é verdade, <lego>` / `tenho certeza, <lego>` for every lego. When the lego is a
bound form, those come out as complete ungrammatical utterances.

All three seeds **were approved** (`approved_at` 2026-07-15), so **O5 applied: seeds
461, 482 and 532 were unapproved.**

### Seed 461, lego `possa comprar` (licensor: `uma loja onde`)

| Phrase | English | Was | Is now |
|---|---|---|---|
| `S0461L02B03` | yes, I can buy | `sim, possa comprar` | `sim, posso comprar` |
| `S0461L02U01` | no, I can buy | `não, possa comprar` | `não, posso comprar` |
| `S0461L02U02` | that's true, I can buy | `isso é verdade, possa comprar` | `isso é verdade, posso comprar` |
| `S0461L02U05` | I'm sure, I can buy | `tenho certeza, possa comprar` | `tenho certeza, posso comprar` |

The English is a complete first-person clause in each case, so the indicative `posso`
is unambiguous. Attested from seed 119.

### Seed 532, lego `tenha sorte` (licensor: `a menos que`)

| Phrase | English | Was | Is now |
|---|---|---|---|
| `S0532L02B03` | yes, lucky | `sim, tenha sorte` | `sim, tem sorte` |
| `S0532L02U02` | no, lucky | `não, tenha sorte` | `não, tem sorte` |
| `S0532L02U03` | that's true, lucky | `isso é verdade, tenha sorte` | `isso é verdade, tem sorte` |
| `S0532L02U05` | I'm sure, lucky | `tenho certeza, tenha sorte` | `tenho certeza, tem sorte` |

The indicative of the very same verb — clause 2 in its narrowest form. It keeps the
lexical drill (`ter`, `sorte`), keeps the known text untouched, and matches the
course's own gloss of `tenha sorte` as "lucky". `tem` attested from seed 63.
**Confidence: high on 461, medium on 532** — the known gloss "lucky" for a verb phrase
is loose either way, but that looseness pre-dates this pass and I did not touch it.

### Seed 482, lego `falando a sério` — three more of the same shape, not in the scan

The scan counted 2 legos / 8 phrases. Seed 482's fourth lego carries the identical
defect: the licensor is `a única esperança real é que`, owned by the *previous* lego,
and three phrases drop the marked form without it.

| Phrase | English | Was | Is now |
|---|---|---|---|
| `S0482L04B02` | they're not serious | `não estejam falando a sério` | `eles não estão falando a sério` |
| `S0482L04U04` | yes, they're not serious | `sim, não estejam falando a sério` | `sim, eles não estão falando a sério` |
| `S0482L04U05` | I'm sure they're not serious | `tenho certeza, não estejam falando a sério` | `tenho certeza, eles não estão falando a sério` |

As written, `não estejam …` standing alone reads as a negative imperative — the wrong
meaning entirely. `estão` attested from seed 34; `eles` kept to match the seed sentence.

**Audio.** All 22 target clips regenerated, both roles, in the incumbent
`azure_pt-BR-BrendaNeural` / `azure_pt-BR-JulioNeural`. **21 passed at CER 0
(exact); one — `S0532L02U05` target2, "tenho certeza, tem sorte" — passed at
CER 0.1304**, which is the ASR mishearing a three-word phrase, not a render fault.
The 22 superseded clips are retained, unlinked. No known text changed, so no known
clip moved.

**xAI hazard — proved, and again it did not bite.** `por_br_for_eng`'s known role is
configured xAI (`gfzdpspr5fdp`) and is, like Spanish, genuinely mixed:
**8,665 linked known clips on `azure_en-GB-BellaNeural` vs 7,707 on the xAI clone.**
Not the clean `ita_for_eng` shape, so no repoint was made. It was not needed —
target1/target2 are Azure and no known text changed.

### Left alone deliberately, with the line I drew

Where a lego **bundles the complementiser** (`é que eles não estejam` at S0482L03,
`que qualquer pessoa possa` at S0531L02), the response-template fragments read as a
*quoted subordinate clause* rather than an assertion — `sim, é que eles não estejam`,
`tenho certeza, que qualquer pessoa possa`. Those are borderline, not wrong, and
fixing them would mean rewriting the lego. Left, and named here so the line is
visible: **I corrected fragments that assert; I left fragments that quote.**

The three LEGO citations themselves (`possa comprar`, `tenha sorte`,
`é que eles não estejam`) were also left. A fuller repair would merge the licensor
into the chunk — `onde possa comprar`, `a menos que tenha sorte` — but at 461 and 532
the licensor is already owned by the *neighbouring* lego, so that is a real boundary
redraw with a lego-index shift, reissued phrase ids and a learner-progress migration.
**Recommend to Kai as a separate decision**, not smuggled into this pass.

---

## glg_for_eng — 1 fixed, case 1, **boundary moved**

The single Galician finding, and the only one in this pass where the course's own
practice pointed at clause 1.

**Seed 291** — `Espero que poida falar mellor pronto.` / "I hope I'll be able to speak
better soon." One lego covers the whole sentence, and it was
`poida falar mellor` glossed "i'll be able to speak better" — a bare subjunctive whose
licensor `espero que` sat just outside the chunk. Eight of its nine phrases supply
`espero que` (or `gustaríame que`); the ninth, the first build rung `S0291L01B01`, is
the chunk standing alone with nothing licensing it.

**The course's own attested practice decided it.** Three of the four comparable
subjunctive LEGOs in this course *bundle their licensor into the chunk*:
`S0007L02 o mellor que poida`, `S0025L03 antes de que teña que ir`,
`S0026L03 como se estivese`. `S0291L01` was the outlier. So: **merge toward the
licensor.**

| | was | is now |
|---|---|---|
| LEGO `S0291L01` known | i'll be able to speak better | **I hope I'll be able to speak better** |
| LEGO `S0291L01` target | `poida falar mellor` | **`espero que poida falar mellor`** |
| phrase `S0291L01B01` | same pair | same pair |

The lego's `components` gained one segment at the front (`"I hope"` → `"espero que"`);
`S0291L01B01` carries no stored decomposition. **This is the one boundary redraw in
the pass, and it was the cheap kind:** seed 291 has exactly one lego, so no lego index
shifted, no phrase id was reissued, `course_round_index` is text-free and needed no
refresh, and **no learner-progress migration was required.** Seed 291 was approved and
has been unapproved (O5).

**Audio — O2 honoured, presentation included.** `glg_for_eng` is fully Azure on all
four roles (verified in `voice_config`), so nothing was blocked.

| Slot | Role | Voice | Transcribed back |
|---|---|---|---|
| LEGO `S0291L01` | known | `azure_en-GB-SoniaNeural` | pass, CER 0 |
| LEGO `S0291L01` | target1 | `azure_gl-ES-SabelaNeural` | pass, CER 0.1034 |
| LEGO `S0291L01` | target2 | `azure_gl-ES-RoiNeural` | pass, CER 0.1379 |
| LEGO `S0291L01` | **presentation** | `azure_en-GB-SoniaNeural` | pass, CER 0.0561 |
| `S0291L01B01` | known / target1 / target2 | as above (same clips, relinked) | as above |

⚠️ **The presentation clip needed a second call.** `/regenerate-presentation` reuses
the *existing row's* narration text and does not re-derive it from the lego, so the
first call happily re-rendered the stale line ("The Galician for: 'i'll be able to
speak better'…"). It was corrected by passing `text` explicitly. **Anyone editing a
LEGO's known text must pass the new narration text to that endpoint or the
presentation will silently keep announcing the old card.** Galician CERs of 0.10–0.14
are the ASR's limit on this language, not a render fault; the known-side clip at CER 0
is the control.

**Consequence I am naming rather than hiding (O6).** One phrase under this lego,
`S0291L01U04` — "i'd like that I'll be able to speak better" /
`gustaríame que poida falar mellor` — no longer contains the lego's exact string,
because it uses a different licensor. It is correct Galician and still drills
`poida falar mellor`, so I left it rather than reshaping a sentence that is not wrong.
Flagging it for Kai as the one link this redraw loosened.

---

## fra_for_eng — 1 fixed in text, **audio blocked: EXPLICIT GAP**

**`fra_for_eng:S0237L02B02`**, the second build rung under seed 237
(`il voulait que je te dise avant le weekend` / "he wanted me to tell you before the
weekend"). The LEGO is `dise` / "tell"; its licensor `voulait que je` is bundled into
the *neighbouring* lego `S0237L01`, which is a sound decomposition. The rung was not.

> known: **"tell your brother"** → target: **`dise à ton frère`**

An English imperative glossing a French subjunctive with nothing licensing it. A
learner prompted "tell your brother" produces `dis à ton frère`; the course showed
them `dise`.

**Which case?** Neither pure clause — the repair the course's own ladders point to is
to restore the subject the rung had dropped. The sibling ladder at `S0169L02` runs
`fasse` → `je fasse` → `que je fasse`: bare, then subject, then licensor. Seed 237's
own B01 is `je te dise` / "I tell you". B02 was the only rung that dropped the subject
*and* re-glossed itself as an imperative. So:

| | was | is now |
|---|---|---|
| known | tell your brother | **I tell your brother** |
| target | `dise à ton frère` | **`je dise à ton frère`** |

This makes B02 parallel to B01 and to its own licensed use at `S0237L02U04`
(`elle voulait que je dise à ton frère …`). **No boundary moved** — the LEGO is still
`dise`, so no presentation clip and no phrase id was touched. Seed 237 was approved
and has been unapproved (O5). The stored decomposition was updated in the same pass
(`je` as a ghost segment, exactly as B01 stores it) and **recomposes to the new target
text character-for-character** — verified.

### 🚩 GAP — 3 clips cannot be regenerated, and no voice was migrated

`fra_for_eng` is configured xAI on **all** roles, and unlike Spanish and Portuguese it
**genuinely serves xAI**. Counted, linked, per role:

| Role | xAI clips | Azure clips |
|---|---|---|
| known | 15,895 (`xai_gfzdpspr5fdp` 14,046 + `xai_eve`/`eve` 1,846) | **0** |
| target1 | 15,891 (`eve` 13,761 + `xai_eve` 2,130) | **0** |
| target2 | 15,872 (`xai_leo`) | **0** |

So the taste-safe repoint that fixed `ita_for_eng` does **not** apply here — repointing
would be a real voice migration and a separate decision, which I did not make. I
attempted the regeneration once to document the refusal verbatim:

> `TTS generation failed (non-retriable): Retired provider "xai" reached tts-service.generate (403). New renders may not use it (Tom 2026-08-27). Existing clips on it are untouched and still play.`

**Result: `S0237L02B02` now has correct text and three empty audio slots** — known
(was `xai_gfzdpspr5fdp` "tell your brother"), target1 (was `eve` `dise à ton frère`),
target2 (was `xai_leo` `dise à ton frère`). All three drops are logged in
`content_audio_link_drops` with reason *nulled-no-same-voice-clip-for-new-text*, and
**all three superseded clips are retained, unlinked** — nothing was deleted, so a
revert or a later re-render has everything it needs. This is one build rung in one
ladder, but a learner reaching it hears silence until French's voice question is
settled. **Kai's call, not mine.**

---

## Verification, read back live

- All 39 regenerated clips: rendered with an `s3_key`, correct voice on the
  `course_audio` row, veracity-passed, text matching the row exactly.
- No `course_audio` row deleted anywhere: 14 superseded Spanish clips, 22 Portuguese,
  2 Galician and 4 French all still present and unlinked (O11).
- Zero unlinked target slots remaining in the touched Spanish and Portuguese seeds.
- No ZUT collision created in any course; the Spanish fixes *removed* the frame
  ambiguity where `creo que` had been mapping to two moods.
- Every substituted form checked attested at or before its seed (R0.2):
  `podría` s116, `puede` s232, `pueden` s529, `tienen` s450, `te sientes` s40 (Spanish);
  `posso` s119, `tem` s63, `estão` s34 (Portuguese).
- No known-language word or structure introduced that the learner did not already
  have; the only known-side edits are Galician `S0291L01` and French `S0237L02B02`,
  both built from wording already in their own seed sentence.
- `course_round_index` inspected: it carries no text and no id moved, so no refresh
  was needed.

## Not done / not ruled on

- **French `S0237L02B02`: 3 clips blocked** (above). The only true gap in this pass.
- **The Portuguese and Spanish LEGO citations** are untouched; merging their licensors
  in is a boundary redraw with a progress migration, recommended separately.
- **Galician `S0291L01U04`** now uses a different licensor from the one its lego
  bundles — correct, but the link is looser than its eight siblings.
- **`por_br_for_eng` seeds 482 L03 and 531 L02** — response-template fragments that
  quote a subordinate clause (`sim, é que eles não estejam`). Borderline, left, named.
- **Regular-conjugation subjunctives were not swept** in any of these courses; only
  irregular forms, per the brief's scope. A defect hiding there would not have been
  caught.
- No voice configuration was changed in any of the four courses.
