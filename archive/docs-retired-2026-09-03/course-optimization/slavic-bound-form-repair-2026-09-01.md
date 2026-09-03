# Slavic bound-form / licensor-outside-chunk repair — srp, rus, ces, hrv

*2026-09-01. Executing Kai's ruling ("Yup, fix all and regenerate") on the four Slavic
courses from the cross-course scan (`docs/course-optimization/bound-form-licensor-scan-2026-09-01.md`).
Every defect below was re-derived against the live DB and against each course's own attested
practice before being touched. Method is the Italian one: merge toward the licensor where one
exists, correct the form where none does, never invent notation, never rewrite what isn't wrong.*

---

## Headline

**25 practice phrases repaired across 4 courses. 45 clips regenerated, 5 relinked free, all
verified — correct voice, text-exact, veracity pass. No LEGO text changed, so no boundary
moved, no lego index shifted, no phrase id reissued, no presentation clip affected, and no
learner-progress migration was needed. Nothing was deleted.**

All four courses are configured Azure on all four roles, so the retired-xAI provider hazard
did not arise anywhere. Every fix was **repair case 2 — correct the form** except one, noted
below, which was case 1 — merge the licensor back in.

| Course | Scan said | Confirmed by me | Phrases fixed | Clips regenerated | Clips relinked free |
|---|---|---|---|---|---|
| `srp_for_eng` | 5 in 3 clusters | one defect family, 9 phrases | 9 | 18 | 0 |
| `rus_for_eng` | 3, one seed window | 8, across 5 seeds | 8 | 13 | 4 |
| `ces_for_eng` | 2, seed 27 | 7, all in seed 27 | 7 | 12 | 1 (known) |
| `hrv_for_eng` | 1, isolated | 1, isolated | 1 | 2 | 0 |

Where I found more than the scan did, it is because the brief told me to check *every* phrase
under a defective LEGO rather than only the row the scan named. Every extra instance is the
same defect, in the same clusters, and is listed below with its own evidence.

---

## `srp_for_eng` (Serbian) — 9 phrases, one defect family

### The defect

`setiti se` ("remember") governs the **genitive**. The course teaches that correctly and
overwhelmingly — `da se setim reči` (seed 6), `da se setim cele rečenice` (seed 10, eight
phrases), `da se seti odgovora` (seed 232, six phrases), `da se setim onoga što si rekao`
(seed 113). Against that settled practice, nine phrases welded a citation-case chunk straight
onto the verb.

The licensor (`se setim`) is already **inside** every one of these sentences — so there is
nothing to merge toward and no boundary redraw can help. **Case 2 throughout: the case is
simply wrong, so fix the case.** The LEGOs themselves are correct and were not touched:
`S0020L04 njegovo ime` is right as citation and is used correctly elsewhere in its own seed
(`naučiš njegovo ime`, `sazna njegovo ime` — accusative, licensed).

### Before → after

| Phrase | English | was | is now |
|---|---|---|---|
| `S0020L04B04` | remember his name | se setim **njegovo ime** | se setim **njegovog imena** |
| `S0020L04U02` | I want to remember his name | želim da se setim **njegovo ime** | … **njegovog imena** |
| `S0020L04U05` | i'd like to remember his name quickly | želeo bih da se setim **njegovo ime** brzo | … **njegovog imena** brzo |
| `S0025L03U03` | i'm trying to remember something before I go | pokušavam da se setim **nešto** pre nego što idem | … **nečega** … |
| `S0056L01U05` | so that I can remember something | tako da mogu da se setim **nešto** | … **nečega** |
| `S0057L01U04` | I remember what I wanted to say | se setim **ono** što sam želeo da kažem | se setim **onoga** što … |
| `S0064L02U06` | it is not easy to remember everything | nije lako da se setim **sve** | … **svega** |
| `S0065L01U04` | it's important to remember something | važno je da se setim **nešto** | … **nečega** |
| `S0205L03U04` | I wanted to remember the word I was trying to say | … da se setim **reč** koju … | … **reči** koju … |

The first three are the scan's named specimen. The other six are the same weld under different
LEGOs, found by checking every `setiti se` phrase in the course.

`S0205L03U04`'s decomposition carried the gloss **"word (nom)"**. Since the segment is no longer
nominative, and per Kai's rule against parenthetical tags, that gloss is now plain **"word"**.

### Deliberately left alone in Serbian

- `S0056L03U05` `pokušavam da se setim kako se kaže nešto` — here `nešto` is the object of
  `kaže`, not of `setim`. Correct as it stands.
- `S0020L04U04` `pokušavam da naučiš njegovo ime` ("i'm trying to learn his name") — the verb is
  **2nd person** under a 1st-person subject; it should be `naučim`. A real defect, but a
  person-agreement slip, not this defect shape. **Reported, not fixed.**
- `S0143L03U02` `se setim o kojoj smo pričali` ("I remember what we talked about") — broken in a
  different way (missing head; wrong gender/preposition; wants something like `onoga o čemu smo
  pričali`). Not a case-weld. **Reported, not fixed.**
- `S0038L02B03` `se nađemo oko u šest sati` — stacked prepositions. Different defect.
  **Reported, not fixed.**
- `S0232L04U04` known "she can remember the answer easily" vs target `… odgovora sada` ("now").
  Known/target mismatch, not a case defect. **Reported, not fixed.**

### Audio

18 clips (9 phrases × target1/target2). Known text never changed, so no known clip moved.
Both target links dropped on every row with reason `nulled-no-same-voice-clip-for-new-text`,
logged in `content_audio_link_drops`; none was hand-nulled. All 18 regenerated through
`/regenerate-phrase` in the course's incumbent voices:

- target1 `azure_sr-Latn-RS-SophieNeural`, target2 `azure_sr-Latn-RS-NicholasNeural`
- text on the `course_audio` row matches the new phrase text on all 18
- veracity: **18/18 pass.** CER 0 on eight clips; the rest 0.02–0.15. One outlier:
  `S0020L04B04` target1 at **CER 0.3913** — a three-word clitic-initial fragment
  (`se setim njegovog imena`), which is the kind of short fragment Whisper habitually
  mis-segments. It passed the gate and the render is the correct text; flagging it as the one
  clip a human ear might want to spot-check.

---

## `rus_for_eng` (Russian) — 8 phrases, five seeds

### 1. `около` (genitive) with an accusative numeral — **case 2**

`S0038L01B02`, "about six o'clock": `около **шесть**` → `около **шести часов**`.
`около` governs the genitive. The course's own rendering of "six o'clock" is `шесть часов`
(seed 18, seventeen phrases); the genitive of that is `шести часов`. The old text also dropped
`часов` entirely. Newly-introduced form: `шести`. Unavoidable — it is the licensed form.

### 2. A genitive-stored LEGO dropped with no licensor — **case 2** (the gle_cn mirror shape)

`S0038L02` is stored as **`недели`** ("a week") — the genitive, which is only correct after
`около`. Every other phrase under it supplies `около` and is fine. One does not:

`S0038L02B02`, "practise for a week": `практиковать **недели**` → `практиковать **неделю**`
(accusative of duration).

I did **not** redraw the boundary to swallow `около` into the LEGO, even though clause 1 would
normally point that way, because `около` is its own LEGO (`S0038L01`) in the same seed: merging
would make the seed sentence `Я учу около недели` untileable (the two LEGOs would overlap).
Correcting the one unlicensed phrase reaches the right result with no boundary move.

The identical shape appears once more, at seed 27:
`S0027L05B02`, "spend time": `тратить **времени**` → `тратить **время**`. LEGO `S0027L05` is
`времени`, the genitive licensed by `много` — correct in `слишком много времени` (B01, B03, and
~10 use phrases), unlicensed here.

### 3. `к` (dative) with an infinitive — **case 2**

`S0115L02B03` "ready for speaking": `готов к **говорить**` → `готов к **разговору**`
`S0115L02U04` "i'm not ready for speaking": `Я не готов к **говорить**` → `… к **разговору**`

`к` takes the dative; `говорить` is an infinitive. The course's own answer sits in the same
seed: `к разговору` (`S0115L01B01`, `S0115L02B01`, and six more). Known texts left unchanged.

### 4. `ждать` does not license `к` + dative — **case 2**

`S0115L01U04` "i'm looking forward to a conversation":
`Я с нетерпением жду **к разговору**` → `Я с нетерпением жду **разговора**`.
`ждать` takes genitive/accusative and never `к`. The dative chunk had been welded onto it from
the neighbouring `готов к разговору` frame. Newly-introduced form: `разговора` (genitive).

### 5. `через` with no nominal complement — **case 2, lower confidence**

`S0253L02B03` "in a bit": `через **немного**` → `через **немного времени**`.
`немного` is a quantifier, not a nominal; `через` needs something to govern. `времени` is
attested from seed 27, well before 253. The most idiomatic Russian would be `немного погодя`,
but that introduces vocabulary the course has not given. **Flagged as the least certain fix in
this course** — it is an improvement on what was there, not a claim of the ideal rendering.

### 6. A prepositional-case LEGO dropped without its preposition — **case 1, merge the licensor**

`S0206L03B03`: LEGO `S0206L03` is `разговоре`, the prepositional case, correct only after `в`.
The build phrase dropped it bare: `**разговоре** с тобой`. Here the licensor genuinely can be
merged back in, so it was:

| | was | is now |
|---|---|---|
| known | conversation with you | **in conversation with you** |
| target | разговоре с тобой | **в разговоре с тобой** |

This matches the sibling build phrase `S0206L03B01` `в разговоре` ("in conversation") exactly.
This is **the only known-side edit in the whole pass**, and the only case-1 repair.

### Audio (Russian)

- `S0115L02B03` and `S0115L02U04` (4 clips) **relinked free**, reason `relinked-same-voice` —
  clips already existed in this course speaking `готов к разговору` / `Я не готов к разговору` in
  the incumbent voices. Verified: correct text, `azure_ru-RU-SvetlanaNeural` /
  `azure_ru-RU-DmitryNeural`. No render, no revision bump (the id is the cache key).
- The remaining 13 clips regenerated: 12 target + 1 known (`S0206L03B03`, whose known text
  changed).
- Voices: target1 `azure_ru-RU-SvetlanaNeural`, target2 `azure_ru-RU-DmitryNeural`, known
  `azure_en-GB-SoniaNeural`.
- Veracity: **13/13 pass, CER 0 on every single clip.**

### Found in Russian, confirmed, and deliberately NOT fixed

**The predicate-instrumental family after `чувствовать себя`.** Russian requires the
instrumental in `чувствую себя готов**ым**`; the course says `чувствую себя готов` in at least
eight places across six seeds (`S0040L01U02`, `S0040L01U03`, `S0040L02B04`, `S0041L04U03`,
`S0047L03U05`, `S0115L02U05`, and neighbours). It **is** the same shape — a nominative-stored
chunk welded onto a verb that licenses a different case — but it is spread across the whole
course rather than clustered, and repairing it well is a course-wide sweep of a kind this brief
explicitly excludes. **Listed here as a genuine finding for Kai to rule on, not touched.**

Also seen and left: `S0069L01U05` `Мне нужно присматривать за весь день` ("I need to look after
all day") — the bound preposition `за` has lost its object, and the *English* known side is
broken too, so any repair means rewriting the known text; `S0253L04B03` `через несколько минут
здесь` — a stray `здесь`. Both reported, neither fixed.

---

## `ces_for_eng` (Czech) — 7 phrases, all in seed 27

### The defect

Seed 27 is `Nerad trávím příliš mnoho času odpovídáním.` — "I don't like taking too much time to
answer." The construction `trávit čas` + **instrumental verbal noun** is what the seed itself
teaches, in `S0027L04 odpovídáním`. The course confirms it independently at seed 209:
`chtějí trávit více času **setkáváním se** jako skupina` (`S0209L03B03`, `S0209L03U01`).

Seven phrases in seed 27 break it, in two ways. Both are **case 2** — no boundary moved, no LEGO
touched.

**(a) `trávit čas` + bare infinitive instead of the instrumental verbal noun** — 5 phrases:

| Phrase | English | was | is now |
|---|---|---|---|
| `S0027L01U06` | I don't like spending time speaking Czech | nerad trávím čas **mluvit** česky | … **mluvením** česky |
| `S0027L02B04` | …speaking Czech today | nerad trávím čas **mluvit** česky dnes | … **mluvením** česky dnes |
| `S0027L02U06` | I spend time speaking Czech today | trávím čas **mluvit** česky dnes | … **mluvením** česky dnes |
| `S0027L03B02` | …too much time speaking Czech | nerad trávím příliš mnoho času **mluvit** česky | … **mluvením** česky |
| `S0027L03B04` | …too much time learning today | nerad trávím příliš mnoho času **učit** dnes | … **učením** dnes |

`mluvení` ("speaking") is an existing LEGO — `S0005L03`, seed 5, well before 27 — so the
instrumental `mluvením` is the licensed inflection of taught material, and the decomposition
segments now point at `S0005L03`. `učením` is the same formation from `učit` (`S0002L02`) but
the verbal noun `učení` is **not separately taught anywhere in the course**; I used it because
the alternative is leaving a broken sentence. **Flagged.**

**(b) the quantified chunk `příliš mnoho času` welded onto a verb that cannot govern it** —
2 phrases. `příliš mnoho času` is internally well-formed (`mnoho` licenses genitive `času`),
but as a whole it is the object of `trávit`; hung on `mluvit` it is simply not Czech.

| Phrase | English | was | is now |
|---|---|---|---|
| `S0027L03U04` | he wants to spend too much time speaking | chce **mluvit** příliš mnoho času | chce **trávit** příliš mnoho času **mluvením** |
| `S0027L03U08` | (see below) | nerad **mluvím** příliš mnoho času česky | nerad **trávím** příliš mnoho času **mluvením** česky |

`S0027L03U08`'s known side read "I don't like speaking Czech for too long". The natural Czech
for that is `nerad mluvím česky příliš **dlouho**` — but `dlouho` is not introduced until
**seed 33**, and R0.2 forbids using it here. So the known side was brought to what the corrected
Czech actually says: **"I don't like spending too much time speaking Czech."** This is the only
other known-side edit in the pass. It now maps identically to `S0027L03B02`, which is
redundancy, not a ZUT collision (one known → one target still holds).

### Deliberately left alone in Czech

`S0027L04B01` "to answer" → `odpovídáním` presents the instrumental chunk bare with no licensor
in the sentence. I left it: every LEGO's `B01` in this format *is* the bare chunk, and the
gle_cn precedent was about full sentences using a marked form unlicensed, not about the chunk's
own presentation card. Changing it would require changing the LEGO — which is exactly what the
seed sentence needs.

### Audio (Czech)

- 12 clips regenerated (`S0027L03U08` now shares `S0027L03B02`'s two clips, since their target
  text is identical — so 7 phrases resolve to 12 distinct target clips, not 14).
- `S0027L03U08`'s **known** clip **relinked free** (`relinked-same-voice`) to `S0027L03B02`'s,
  because the new known text matches it. No known clip was rendered in this course.
- Voices: target1 `azure_cs-CZ-VlastaNeural`, target2 `azure_cs-CZ-AntoninNeural`.
- Veracity: **12/12 pass**, CER 0–0.048.

### Confidence

My Czech is the weakest of the four here. The direction of the fix is not in doubt — the course
itself supplies the pattern twice, at seed 27 and at seed 209 — but `učením` in particular
deserves a native check. Per Kai's 2026-08-17 standing note, the bar is improvement over what
was there, and `nerad trávím příliš mnoho času učit dnes` was not Czech.

---

## `hrv_for_eng` (Croatian) — 1 phrase, isolated

Re-derived independently of the Serbian finding, as instructed. Croatian's `setiti/sjetiti se`
phrases are all clause-complement and clean; the Serbian defect does **not** appear here. The
one defect is elsewhere:

`S0250L02U05`, "can you help me with something else?":
`možeš li mi pomoći s još **nešto**?` → `možeš li mi pomoći s još **nečim**?`

`s` governs the instrumental; `nešto` is the citation form. **Case 2.** The course's own practice
decides it: it already inflects this pronoun after a preposition — `o **nečemu** drugačijem`
across eleven phrases at seed 186 — and instrumental indefinites are everywhere
(`s nekim`, 36 phrases; `s onim`, 25). `nečim` is the licensed instrumental of the same paradigm.

Audio: 2 clips, `azure_hr-HR-GabrijelaNeural` / `azure_hr-HR-SreckoNeural`, both pass, CER 0.033.

---

## Obligations — what was and wasn't triggered

- **O2 (LEGO edit → presentation clip):** did not fire. **No LEGO text was changed in any of the
  four courses** — verified: zero rows in `course_legos` updated. No presentation clip is stale.
- **O1 (seed edit → sweep):** did not fire. Zero rows in `course_seeds` updated.
- **O3 (text edit mutates the link):** honoured. Every link move was made by the three DB
  triggers and is in `content_audio_link_drops` — 52 drop-log entries across the four courses,
  5 of them `relinked-same-voice`, the other 47 `nulled-no-same-voice-clip-for-new-text`. **No
  NULLing UPDATE was hand-written.**
- **O6 (phrase still respects its LEGO):** checked on all 25. In every case the phrase now
  carries the case-inflected form of the same LEGO lexeme, which is the normal state of affairs
  in an inflecting language and matches the gle_cn precedent (`ar sheanfhear` under lego
  `seanfhear`). No phrase was orphaned from its LEGO.
- **O11 / make-before-break:** **no `course_audio` row was deleted anywhere.** Every superseded
  clip is still in place, unlinked, with its flags and revision history intact.
- **Boundary redraws:** none. No lego index moved, no phrase id was reissued, no learner-progress
  migration was needed under `docs/pods/pod-migration-protocol.md`.
- **Decompositions:** all 25 updated in the same transaction as their text, and all 25 verified
  to recompose to the new target text **character-for-character**.
- **ZUT:** no collision created. The Serbian repair *removes* one — `se setim njegovo ime` and
  `naučiš njegovo ime` had been two different case realisations of the same chunk in the same
  seed with no principle distinguishing them.
- **O5 (unapprove affected seeds): DELIBERATELY NOT APPLIED — see gap 1 below.**

---

## Explicit gaps

**1. Seed approval was left untouched, on evidence, not by oversight.** All four courses show
exactly **300 of 668** seeds with `approved_at` set, and in `srp_for_eng` every one of those 300
carries the *identical* timestamp `2026-05-11 10:15:50.063+00`. That is a bulk build-time stamp,
not a record of human proofreading, and O5 applies "only where the course is genuinely in
proofreading". Every seed I touched falls inside that block, so had I read the flag literally I
would have unapproved 18 seeds across four courses on a false premise. **If Kai's view is that
the flag should be honoured literally regardless of provenance, this is a one-line change and I
will make it — but I was not willing to churn four courses' approval state on a stamp that
looks machine-set.**

**2. `rus_for_eng`'s `чувствовать себя` + nominative predicate family is confirmed and unfixed**
— eight-plus phrases across six seeds, listed above. Genuinely the same defect shape; genuinely
too diffuse to repair inside this brief's scope. **Wants Kai's ruling.**

**3. Czech confidence.** See above — `učením` in `S0027L03B04` is the one form in this pass I
would most like a native speaker to confirm. Everything else in Czech is licensed by the
course's own attested practice at seed 27 or seed 209.

**4. Adjacent non-shape defects found and reported but not fixed** — six of them, listed in the
per-course sections: Serbian `pokušavam da naučiš` (person agreement), `se setim o kojoj smo
pričali`, `oko u šest sati`, `S0232L04U04`'s known/target mismatch; Russian `присматривать за
весь день` and `через несколько минут здесь`. Each is a real defect of a different kind. None was
touched, because fixing them means editing known-side text that this brief did not put in scope.

**5. My sweep was targeted, not exhaustive.** In each course I checked (a) every phrase under
every LEGO the scan implicated, (b) every phrase containing a case-governing verb of the
implicated family, and (c) a full census of preposition-plus-next-word collocations for the
genitive/instrumental/dative prepositions in that language. I did **not** run a general course
audit, a ZUT sweep, or a scan-course pass — the brief excluded those. A defect of this shape
sitting behind a licensor I did not enumerate would not have been caught.

**6. No provider hazard arose.** All four courses are Azure on all four roles, verified before
any render. **No voice config was repointed and no voice migrated anywhere in this pass.**

---

## Landing line

No commits. Per the dispatcher's git override for this job family, this checkout is shared with
other live sessions, so no git command was run: this document is left uncommitted in the working
tree at `docs/course-optimization/slavic-bound-form-repair-2026-09-01.md` for central commit.
The substance of the work is 25 DB rows and 45 audio clips written directly to live Supabase and
S3 — those are landed and live now, not pending a merge.
