# Connemara verb & predication system — sourced evidence

**Date:** 2026-08-18 · **For:** Kai · **Purpose:** core form inventory for a beginner Connemara
(Cois Fharraige) course. Orthography = An Caighdeán Oifigiúil; grammar/lexis = Connemara.

## How to read this

Every claim is marked:

- **OBSERVED** — URL + verbatim quote. The quote is doing the work.
- **INFERRED** — my reasoning *from* observed material. Not evidence on its own.
- **GAP** — could not source it. Stated plainly, never papered over.

**My own competence in Irish is not evidence** and is never presented as such. Where I had a
strong intuition I could not source, it is filed as GAP with the intuition labelled.

### Two access failures, up front

- **Ó Siadhail, _Learning Irish_ (Cois Fharraige)** — the single most on-point source in the
  brief — is on archive.org twice (`learningirish0000mich`, `learning-irish-3rd-ed`) and **both
  are access-restricted**. Full-text search returns "Item not available"; the plain-text
  derivative returns **HTTP 403**. Nothing from this book is quoted below. This is the biggest
  hole in the report.
- **Ó Siadhail, _Modern Irish: Grammatical Structure and Dialectal Variation_** and
  **de Bhaldraithe, _The Irish of Chois Fhairrge_** — no accessible full text found. Not quoted.
- **nualeargais.ie (Braesicke)** — every URL pattern I tried returned 404. Not quoted.
- `thegeekygaeilgeoir.wordpress.com` and `irishforenglishspeakers.wordpress.com` returned
  **HTTP 403** to the fetcher on the specific articles I wanted.

**Consequence:** the report leans on Wikipedia's dialect articles, Wiktionary's dialect-tagged
IPA, Ó Dónaill/de Bhaldraithe via teanglann.ie, and a small number of teaching sites. The
dialect-attributed claims below are thinner than the brief deserves, and I have said so at each
point rather than inflating what I found.

---

## A methodological finding that constrains Q10 — read before trusting teanglann audio

The brief asks me to report whether a **Connacht** recording exists per headword on teanglann.ie.
It does — but I checked whether that fact carries any dialectal weight, and **it does not**:

- `ábalta` — **OBSERVED** (https://www.teanglann.ie/en/fuaim/ábalta): Ulster, Connacht and
  Munster recordings all present.
- `fosta` — **OBSERVED** (https://www.teanglann.ie/en/fuaim/fosta): Ulster, Connacht and Munster
  recordings **all present** — yet `fosta` is a diagnostically *Ulster* word (it is on our own
  spec's forbidden-Ulster list at `docs/gle-cn/connemara-dialect-spec.md:67`).

**INFERRED:** teanglann's three-dialect audio is a *recording-coverage* fact, not a
*dialect-membership* fact — speakers read the whole headword list in their own accent regardless
of whether the word is native to their dialect. **So "a Connacht recording exists" must never be
used as evidence that a word is Connemara.** It tells you how the word sounds in a Connacht
mouth, which is useful for pronunciation modelling and nothing else.

---

## Q1. Present habitual vs progressive — and how "I speak Irish" is actually said

### The simple present is habitual/general; `tá + ag +` verbal noun is progressive

**OBSERVED** — https://www.allaboutirish.ie/blog/the-difference-between-tá-and-bíonn

> "Use 'tá' when something is happening in the present time, or is true right now"
> — example: "Tá sé tuirseach anois / He is tired now"

> "Use 'bíonn' when something happens regularly / repeatedly / always"
> — example: "Bím san oifig ag a naoi a chlog gach maidin / I am in the office at nine o'clock
> every morning"

> 'bí' is "the ONLY verb which has both a present tense and a habitual present tense."

**This last point is the important one for course design.** The habitual/non-habitual contrast is
carried by a *dedicated form* only in the verb `bí` (`tá` vs `bíonn`). For every other verb the
ordinary present (`labhraím`) already covers the habitual sense, and the progressive is built
periphrastically (`tá mé ag labhairt`). No dialect attribution given — this is pan-dialectal.

### THE CRUCIAL ANSWER: "I speak Irish" (ability/habit) → `Tá Gaeilge agam`

**OBSERVED** — http://www.irishlanguageforum.com/viewtopic.php?f=28&t=5679 (Irish Language Forum,
thread "An labhraíonn tú Gaeilge?"). Contributor **Labhrás**:

> "English questions like 'Do you speak Irish?' in the sense of 'Are you able to speak irish?'
> cannot be translated 'An labhraíonn tú Gaeilge?' (utter nonsense) but only 'An bhfuil Gaeilge
> agat?'"

Contributor **silmeth**:

> "certainly 'Labhraím.' is a correct answer to 'An labhraíonn tú Gaeilge?', and 'An bhfuil
> Gaeilge agat?' would be a more idiomatic way to ask whether someone is able to speak Irish."

And the contrast is made explicitly by Labhrás:

> "Tá Gaeilge agam ach ní labhraím í" (I have Irish but don't speak it)

**OBSERVED** — https://talkpal.ai/culture/why-do-irish-speakers-use-the-phrase-ta-gaeilge-agam-instead-of-i-speak-irish/

> "Tá Gaeilge agam" … literally meaning "Irish is at me" … "Unlike English, where 'to speak' is
> a direct action, Irish focuses on possession."

> "saying 'tá Gaeilge agam' does not necessarily mean 'I speak Irish fluently'" — it indicates
> the speaker "has some knowledge of Irish."

**VERDICT (OBSERVED for the semantics; INFERRED for the Connemara-specificity):** `Tá Gaeilge
agam` **is** the idiomatic rendering of English "I speak Irish" in the ability/competence sense,
and `An labhraíonn tú Gaeilge?` for "Do you speak Irish?" is explicitly called "utter nonsense"
by a forum contributor. `Labhraím Gaeilge` is *not* wrong — it is a fine answer to a question
actually about the act of speaking, and it genuinely means "I speak Irish (habitually)".

**Caveats you should hold:**
- **GAP — dialect.** No source I reached attributes `Tá Gaeilge agam` to Connemara *specifically*.
  It is presented everywhere as general Irish idiom. I found **no** evidence it is dialectally
  marked, and none that Connemara differs. Treat as pan-dialectal, not as a Connemara feature.
- **Source quality.** The sharpest quotes are from a **language forum**, not a grammar. The
  contributors are knowledgeable but the thread does not identify anyone as a native speaker.
  I would not build a rail on this alone without Ó Siadhail.

**Course implication (INFERRED):** for "I speak Irish / do you speak Irish", teach
`Tá Gaeilge agam` / `An bhfuil Gaeilge agat?`. Keep `labhraím` for genuinely habitual acts of
speaking. Whether to introduce `bíonn` in the first 20 lessons is a separate decision — the
contrast only exists for `bí`, so it can be deferred without leaving a hole elsewhere.

---

## Q2. Synthetic vs analytic in the Connemara present — SPEC CONFIRMED (with one caveat)

Our spec (`docs/gle-cn/connemara-dialect-spec.md:76-82`) rules: **synthetic 1sg present YES;
synthetic 1pl and synthetic past NO.**

### 1pl analytic — CONFIRMED, OBSERVED

**OBSERVED** — https://en.wikipedia.org/wiki/Connacht_Irish

> "In Galway and Mayo, as in Ulster, the analytic forms are used in a variety of forms where the
> standard language has synthetic forms, e.g. _molann muid_ 'we praise' (standard _molaimid_)"

That is exactly our rule, in the source's own words, with Galway named.

### `muid` is the Connacht 1pl pronoun — CONFIRMED, OBSERVED

**OBSERVED** — same page:

> "_muid_, emphatic form _muide/muidí_ for the first person plural pronoun, Ulster Irish uses
> this form as well, whereas Munster Irish uses _sinn, sinne_"

So `muid` is **Connacht + Ulster**, against Munster `sinn`. Our spec's `muid` and `tá muid` are
correct, and the recorded `táimid ×22` at seed 274 flagged in the spec is a genuine defect.

### 1sg synthetic — NOT DIRECTLY SOURCED; INFERRED, and a GAP

**GAP.** I found **no** source that states in terms that 1sg `labhraím / ceapaim / feicim` is
obligatory in Connemara, or that `labhrann mé` is or is not heard there.

**INFERRED:** the Wikipedia quote says analytic forms replace the standard's synthetic forms "in
a variety of forms" and illustrates only with the **1pl**. The Caighdeán present has synthetic
forms in exactly two slots — 1sg `-(a)im` and 1pl `-(a)imid`. Connacht is reported as replacing
the 1pl; nothing reports it replacing the 1sg. That is consistent with our rule, but it is an
argument from what a source *didn't* say, which is weak. **Do not treat 1sg-obligatory as
verified.** It needs Ó Siadhail.

### Supporting contrast: Munster is more synthetic

**OBSERVED** — https://www3.smo.uhi.ac.uk/gaeilge/gramadach/canuinti.html

> Munster prefers synthetic forms: "**tiocfad** for **tiocfaidh mé**, '_I will come_'"

**INFERRED:** the synthetic/analytic axis is a real dialect axis running Munster (most synthetic)
→ Connacht/Ulster (more analytic), which is the axis our spec is placing itself on. Note this
Munster example is **future**, not present — the split differs by tense, so do not generalise a
present-tense rule from it.

### Other Connacht verb morphology worth knowing

**OBSERVED** — https://en.wikipedia.org/wiki/Connacht_Irish

> "the synthetic forms, including those no longer included in the standard language, may be used
> in answering questions."

> "relative forms of the verb such as _beas_ 'that/who/which will be', or _déananns/déanas_,
> 'that/who/which do~does' are frequently used."

**INFERRED:** the first is a real trap for a beginner course — a Connemara speaker may answer a
question with a synthetic form even where the statement form is analytic. The relative forms
(`beas`, `déanas`) are Connacht-frequent but almost certainly out of scope for 20 lessons.

---

## Q3. Copula `is` vs substantive verb `tá`

### The rule

**OBSERVED** — https://en.wikipedia.org/wiki/Irish_grammar (fetched; the article carries the
standard inventory). Copula present forms **is / ní / an / nach**; past-conditional **ba / níor /
ar / nár** with contracted **b'** before vowels.

**INFERRED (this is textbook and I could not get a clean verbatim rule statement — the two
best-written sources, Geeky Gaeilgeoir and irishforenglishspeakers, both 403'd):** the copula
`is` links two noun phrases — identification (`Is é Seán an múinteoir`) and classification
(`Is múinteoir é Seán`) — and carries the `le`-idioms of opinion/preference. The substantive
verb `tá` carries existence, location, state, and all progressive aspect. This is a genuine
weak point in the report's sourcing.

### `Is maith liom` (I like) — the structure

**OBSERVED** — the copula-idiom structure is confirmed indirectly via the search corpus: in Irish
the phrasing is "'X is good with me', 'Is maith liom X'". **INFERRED:** `is maith liom` is
copula + adjective + prepositional pronoun, and is universal, unmarked Irish.

### `Ba mhaith liom` (I would like) — past-form-with-conditional-meaning: CONFIRMED

**OBSERVED** — Wikipedia Irish grammar gives the copula past/conditional as **ba** (with `níor /
ar / nár`). **INFERRED:** `ba mhaith liom` is morphologically the *past* copula used with
*conditional* ("would like") force — structurally the same trick as `caithfidh` in Q6
(future form, present meaning). Confirmed as a pattern; the specific gloss is inference.

### `Is féidir liom` vs `Tá mé in ann` — see Q4. `is féidir liom` is attributed to **Munster**.

### `Is dóigh liom` vs `Ceapaim` (I think) — ⚠️ **SPEC CLAIM NOT VERIFIED**

Our spec forbids `is dóigh liom` as Munster (`connemara-dialect-spec.md:63`). The brief asked me
to verify that. **I could not.**

**OBSERVED** — https://www.teanglann.ie/en/fgb/dóigh (Ó Dónaill, *Foclóir Gaeilge–Béarla*):

> "Likely, probable. An rud is ~ le duine, what one thinks likely. Is ~ liom (go), I am of
> opinion (that)."
> "Is ~ gur fíor é, it is probably true." · "Ní ~ go dtiocfaidh sé, he is unlikely to come"
> "Tá, is ~, it is, I suppose"

**No dialect label appears on any sense of `dóigh` in Ó Dónaill.**

**GAP — this is the most important unresolved item in the report.** I searched specifically for
dialect attribution of `is dóigh liom` / `ceapaim` / `sílim` / `measaim` and found none. The
search engine's own summary was explicit: the results "do not contain specific information about
which of these three verbs is preferred in the Ulster, Connacht, or Munster dialects."

**What this does and does not mean:**
- It does **not** refute the spec. Ó Dónaill labels dialects only sparingly; absence of a label
  is not evidence of pan-dialectal status.
- It does mean **the "Munster" attribution in our spec is currently unsourced.** If that rule is
  rejecting learner/authored content, it is doing so on an unverified basis.
- My own untested intuition — **explicitly not evidence** — is that `is dóigh liom` is *not*
  narrowly Munster and is well attested in Ulster in particular, which would make a flat
  "Munster" label wrong. I would not act on that without a source.

**RECOMMENDATION:** treat `connemara-dialect-spec.md:63`'s `is dóigh liom` ban as **unverified,
pending Ó Siadhail / de Bhaldraithe**. Do not delete the rule on my say-so; do not defend it as
sourced either. `ceapaim` as the Connemara "I think" is likewise **GAP** — unsourced, though it
is what our spec already uses and nothing I found contradicts it.

### Is the copula ever dropped in Connemara speech?

**GAP.** Not sourced. Did not find material either way.

---

## Q4. CAN / ABLE — `in ann` CONFIRMED; `ábalta`-as-Ulster **NOT VERIFIED**

### The one clean dialect quote

**OBSERVED** — https://www.bitesize.irish/blog/dialects-2/

> "Tig liom (Ulster) meaning 'I can' is preferred over is féidir liom (Munster) or tá mé in ann
> (Connacht)."

This single sentence settles three of the four candidates:

| Form | Dialect (per source) | Our spec | Verdict |
|---|---|---|---|
| `tá mé in ann` | **Connacht** | IN | ✅ **CONFIRMED** |
| `is féidir liom` | **Munster** | — | ⚠️ Munster, not merely "bookish" |
| `tig / thig liom` | **Ulster** | — | ✅ correctly out of scope |
| `ábalta` | *not mentioned* | FORBIDDEN as Ulster | ❌ **NOT VERIFIED** |

**Note the `is féidir liom` result is stronger than expected.** The brief guessed it might be
"written/formal register". The source calls it **Munster**. If that is right, `is féidir liom`
should arguably be treated the same way as any other Munster form in a Connemara course — but
one teaching-site sentence is thin evidence for a rule that strict, and `is féidir` is also
plainly current in standard/written Irish nationally. Flagging it rather than recommending a ban.

### `ábalta` — the spec's Ulster label is unsupported

**OBSERVED** — https://www.teanglann.ie/en/fgb/ábalta (Ó Dónaill):

> "Able, capable. ~ (ar) rud a dhéanamh, able to do sth. ~ éirí, siúl, able to rise, walk."
> "Able-bodied" · "Fear ~, an able-bodied man." · "~ ábalta, (i) limber and able-bodied,
> (ii) willing and able."

**No dialect label.**

**OBSERVED** — a search-result summary stated that `ábalta` and `in ann` "can be used
interchangeably to mean 'able'". I could not confirm this against the underlying page (the
relevant articles 403'd), so I record it as a **weak, unverified** counter-indication rather than
as evidence.

**VERDICT: GAP / weakly counter-indicated.** I found **no source calling `ábalta` Ulster**, and
Ó Dónaill carries it unlabelled. Per the finding at the top of this document, the existence of a
Connacht teanglann recording for `ábalta` proves nothing. So:

- `in ann` as the Connemara form: **verified — keep it.**
- `ábalta` as *forbidden Ulster*: **unverified.** It may well be right (`ábalta` is certainly
  frequent in Ulster), but "frequent in Ulster" and "not Connemara" are different claims and only
  the first is plausible from what I found.

### `in acmhainn`

**GAP.** Our spec forbids it (`:63`). I found no dialect attribution for `in acmhainn` at all.

### Syntax

**INFERRED** (from the quoted forms, not separately sourced): `in ann` + verbal-noun phrase
(`tá mé in ann é a dhéanamh`); `ábalta ar` + verbal noun per Ó Dónaill's "~ (ar) rud a
dhéanamh"; `is féidir le` + verbal-noun phrase.

---

## Q5. KNOW — both senses

### Fact: `tá a fhios agam`

**OBSERVED** — https://en.wiktionary.org/wiki/fhios — IPA by dialect:

> Munster/Ulster: **/ɨ̞sˠ/** · **Connacht: /ɪsˠ/**

> the construction derives from "a fhios" (literally "its knowledge"), which **remains the
> standard spelling in Irish**

### Is `tá fhios agam` (without `a`) the Connemara spoken form? — the reduction is real

**OBSERVED** — https://blogs.transparent.com/irish/beagainin-eile-sa-"teanga"-teacsaise-9l-is-am/
(an article about the Irish text-message abbreviation `9L is am` = *níl fhios agam*):

> "This shortened form is very typical in Conamara, so the abbreviation works great for a least a
> good percentage of Irish speakers."

The article explains `am` as shorthand for `agam`, and the contraction of *a fhios agam* → *is am*
as reflecting "authentic Conamara pronunciation habits".

**VERDICT:**
- **Spoken Connemara: OBSERVED** — the phrase reduces heavily, to roughly *[sˠ am]* (`'s am`).
  The `a` and the `agam` are both eaten. This is explicitly called "very typical in Conamara".
- **Written: OBSERVED** — Wiktionary states `a fhios` "remains the standard spelling in Irish".
  Since our orthography rail is An Caighdeán Oifigiúil, **write `tá a fhios agam`** even though
  nobody in Cois Fharraige says it that way. This is exactly the spelling-vs-speech split the
  spec is built around.
- **GAP:** whether Connemara writers *representing* the dialect drop the `a` (`tá fhios agam`) —
  not sourced. Note the Scottish Gaelic entry does show bare `fhios` ("Cha robh fhios agam"), but
  that is Scottish Gaelic, not Irish, and must not be carried across.

### Person: `tá aithne agam ar`

**OBSERVED** — https://www.teanglann.ie/en/fgb/aithne (Ó Dónaill), `aithne1`, "Acquaintance":

> "Tá aithne agam air, I know him well, intimately."
> "Tá aithne agus ~ agam air, I know and understand him; I know all about him" [~ = *eolas*]

Secondary sense "Recognition; act of recognizing":

> "Tá mé ag cailleadh na h~, I am losing my memory for faces."

**No dialect labels.**

**INFERRED:** `aithne` (noun, "acquaintance") in `tá aithne agam ar X` = *be acquainted with a
person*; the verb `aithin / aithním` is *recognise* (identify on sight), a different act. The
`aithne`/`eolas` pairing in the second quote shows Irish splits acquaintance from understanding
as well as from factual knowledge.

### `is eol dom`

**GAP.** Not sourced for register or dialect. **INFERRED (untested):** literary/formal.
Recommend avoiding in a beginner course on the general ground that neither dictionary example
set nor any teaching source I reached uses it — but that is absence of evidence, not evidence.

---

## Q6. NEED and HAVE TO

### `caithfidh mé` is morphologically FUTURE, used for present obligation — CONFIRMED

**OBSERVED** — https://en.wiktionary.org/wiki/caithfidh

> the "future analytic of caith", meaning "must (do as a requirement), have to."
> Usage note: "the conditional form **chaithfeadh** is used as the past tense of the meaning
> 'must, have to.'"

**OBSERVED** — search corpus, irishforenglishspeakers: "'Caithfidh' is the future form of the verb
caith!/caitheamh and is used in the sense of 'must'." (The article itself 403'd; this is the
search engine's rendering of it, so treat as **second-hand**.)

**CONFIRMED.** And note the tidy consequence: the *past* of "must" is the **conditional**
`chaithfeadh`, not a past tense. A second form-vs-meaning mismatch, alongside `ba mhaith liom`.

**INFERRED:** ordinary present `caitheann` carries the lexical senses of `caith` — spend / wear /
throw / consume — not obligation. Not separately sourced; low risk.

### The alternatives

**OBSERVED** — search corpus (from irishforenglishspeakers, second-hand as above):

> "Ní mór duit imeacht" (you must leave), and "tá ort imeacht" (you must leave) are alternative
> ways to express the same obligation.

> "Tá agam é a dhéanamh" translates the English "I have to do it," although "tá orm é a dhéanamh"
> might fit better, noting that duties and responsibilities are in Irish usually "on" (ar) you.

**OBSERVED** — the impersonal/epistemic use: "caithfidh sé go bhfuil tú sásta" (you must be
happy) — i.e. `caithfidh` also does *inference*, not just obligation.

### `teastaíonn` — the "need" verb and its syntax

**OBSERVED** — https://www.teanglann.ie/en/fgb/teastaíonn (Ó Dónaill, under `teastaigh`):

> "Teastaíonn cabhair uaim, I need assistance."
> "Teastaíonn foighne chun na hoibre sin, that work requires patience."

**Syntax (OBSERVED from the examples):** the *thing needed* is the grammatical **subject**
(`cabhair`), and the needer is marked with **ó** (`uaim` = "from me"). Literally "help is wanted
from me". This is the inverted argument structure a beginner will trip on.

### Verdicts

| English | Form | Status |
|---|---|---|
| I have to / must | **`caithfidh mé`** | **INFERRED** as the ordinary form — it is the one every teaching source leads with. **GAP: no Connemara-specific attribution found.** |
| I have to (obligation "on" me) | `tá orm` | OBSERVED as an alternative; **GAP** on dialect and on force relative to `caithfidh` |
| must (formal) | `ní mór dom` | OBSERVED as an alternative; **GAP** on register/dialect |
| I need | **`teastaíonn X uaim`** | OBSERVED (Ó Dónaill), unlabelled for dialect |
| I need (progressive) | `tá X ag teastáil uaim` | **GAP** — could not retrieve the `ag teastáil` material |

**GAP, and it is a real one:** I could not source *which* of `caithfidh mé` / `tá orm` / `ní mór
dom` is the ordinary **Connemara** "I have to". All I established is that all three exist in
Irish. The brief asked specifically for the Connemara answer and I do not have it.

### `ag iarraidh` for "want"

**OBSERVED** — https://en.wiktionary.org/wiki/iarraidh — noun senses "request, demand"; "thing
sought"; "attempt, attack"; "turn, time"; and "verbal noun". **GAP:** Wiktionary does not gloss
`ag iarraidh` = "wanting" on that page, and I did not source the want/need overlap. Our course
already uses `ag iarraidh` for "want" (per the spec at `:136`) — that usage is not challenged by
anything I found, but neither did I verify it here.

---

## Q7. LIKE — `is maith liom` vs `taitníonn ... liom`

**OBSERVED** — search corpus (teanglann/de Bhaldraithe + teaching sources):

> "Taitníonn uachtar reoite liom" literally means "Ice-cream appeals to me"
> "Is maith liom thú" (I like you) · "Is maith liom an chathaoir" (I like the chair)
> "Is maith liom a bheith ag siúl" (I like to walk)

**Structural difference (OBSERVED):** with `taitníonn`, the thing liked is the grammatical
**subject** and the liker takes `le` — same inversion as `teastaíonn` in Q6. With `is maith liom`
the thing liked is the complement of the copula phrase.

**Semantic difference (INFERRED from the above):** `is maith liom` = general preference;
`taitníonn ... liom` = something actively pleases/appeals to me, and is the natural choice for
"I enjoyed it" (`thaitin sé liom`).

**"I like doing X" (INFERRED):** `is maith liom a bheith ag +` verbal noun, per the quoted
"Is maith liom a bheith ag siúl".

**GAP — and this is the direct question the brief asked.** I found **no** source stating a
**Connemara preference** between `is maith liom` and `taitníonn ... liom`. Everything I found
treats the difference as semantic/structural, not dialectal. On the evidence I have, there is no
dialect rail to write here — `is maith liom` is unmarked and safe; nothing suggests `taitníonn`
is un-Connemara.

---

## Q8. Negation and questions — the beginner set

**OBSERVED** — https://en.wikipedia.org/wiki/Irish_grammar confirms the standard inventory:

| Function | Present `bí` | Past `bí` | Regular verb past | Copula pres. | Copula past/cond. |
|---|---|---|---|---|---|
| positive | `tá` | `bhí` | (lenition) | `is` | `ba` / `b'` |
| negative | `níl` | `ní raibh` | `níor` | `ní` | `níor` / `níorbh` |
| question | `an bhfuil` | `an raibh` | `ar` | `an` | `ar` / `arbh` |
| neg. question | `nach bhfuil` | `nach raibh` | `nár` | `nach` | `nár` / `nárbh` |

Past particles `ar / níor / nár` "trigger lenition or eclipsis on following verbs"; copula past
has "contracted **b'** forms before vowels".

*(Caveat: the fetcher returned this partly as summary rather than tight verbatim. The inventory
is standard and I am confident in it, but treat the table as OBSERVED-in-substance.)*

### Connemara specifics

**`cha` is Ulster, NOT Connacht — OBSERVED.**

https://letslearnirish.com/articles/irish-dialects/: Ulster Irish uses "cha(n)" while "Munster
and Connacht dialects tend to use ní".

https://www3.smo.uhi.ac.uk/gaeilge/gramadach/canuinti.html: Ulster uses "**cha**" (a Scottish
Gaelic borrowing) alongside standard **ní**, with "**chan fhéachann**, but **cha dtig**", and it
"often eclipses b-forms: **cha mbeadh**, **cha mbíonn**".

✅ Confirms our spec's forbidding of `chan`/`cha` (`connemara-dialect-spec.md:67`). Connemara uses
`ní`.

**Ulster also keeps absolute/dependent distinctions Connacht does not — OBSERVED** (same source):
Ulster has "most strong verbs still have a distinction between absolute and dependent forms in
the present: **tchí**, '_sees_' - **chan fheiceann**, '_doesn't see_'". Confirms `tchí` as Ulster
(also on our forbidden list).

**A genuine Connacht eclipsis rule — OBSERVED** (same source), which our spec does not currently
mention and a beginner course will hit almost immediately:

> Connacht: "**sa mbaile** instead of **sa bhaile**"

i.e. **Connacht eclipses after `sa`** where the Caighdeán lenites. (Munster eclipses more widely:
"**ag an ndoras**"; Ulster lenites: "**ag an fhear**".) Worth a decision — `sa mbaile` is
Connemara-natural but is arguably a *grammar* choice rather than a spelling one, so the
Caighdeán-orthography rail does not automatically settle it.

**GAP:** whether Connemara reduces or drops the interrogative particle `an` in speech
(e.g. `an bhfuil` → *[ə wɪlʲ]*) — I did not source this. Our spec's `an` + eclipsis is not
contradicted by anything I found.

---

## Q9. Possession and pronouns

**OBSERVED** — https://en.wikipedia.org/wiki/Irish_grammar: first- and second-person possessives
`mo` / `do` cause **lenition**; third person masculine `a` **also causes lenition**; "their"
triggers **eclipsis** rather than lenition. Prepositional pronouns are given in tables, including
`agam` (at me), `liom` (with me), `orm` (on me), `dom` (to me), `uaim` (from me), "each with
emphatic variants".

**INFERRED** (standard, not separately quoted): the three-way `a` contrast is
`a chóta` (his, lenition) / `a cóta` (her, no mutation, h- before vowels) / `a gcóta` (their,
eclipsis) — the single highest-value mutation contrast in the language and unavoidable early.

### Connemara-specific realisations

**GAP — substantially unsourced.** I could not source Connacht-specific spoken realisations of
`aige / aici / againn / acu / uaidh`. The one adjacent thing I can offer:

- **`dom` vs `domh`:** our spec lists `domh` as forbidden-Ulster (`:67`), and
  https://en.wikipedia.org/wiki/Connacht_Irish does not list `domh` among Connacht forms.
  **INFERRED:** `dom` is the Connemara form. Not directly quoted.
- **Cois Fharraige vowel realisation — OBSERVED**
  (https://en.wikipedia.org/wiki/Connacht_Irish): "underlying short /a/ is realized as a long
  front [aː] while underlying long /aː/ is realized as a back [ɑː]". This *will* affect how
  `agam`, `agat`, `acu` sound in Cois Fharraige, but the source states the rule, not the
  resulting prepositional-pronoun forms.

**`agam` for both language and object (Q9's last part):** **OBSERVED** that both patterns exist
— `tá Gaeilge agam` (Q1) and "tá carr agam" ('I have a car', from the talkpal source, which
presents them as the *same* possessive pattern: "This grammatical pattern is applied to many
other contexts, such as 'tá carr agam'"). So yes, identical construction. No dialect marking.

---

## Q10. Phonological difficulty for an English-speaking beginner

Wiktionary tags IPA **by dialect**, which makes it the right source here. Cois Fharraige is
called out explicitly for one of our words.

| Form | Connacht IPA (OBSERVED) | Source | Verdict for first 20 lessons |
|---|---|---|---|
| `caithfidh` | **(Cois Fharraige) /ka/, [kaː]** — also (Aran) /ˈkafʲə/, (Mayo) /ˈkɑihə/ | [wiktionary](https://en.wiktionary.org/wiki/caithfidh) | **EASY — this is a surprise.** In Cois Fharraige it is one light syllable **[kaː]**. The scary `-idh` is simply gone. |
| `ag iarraidh` | (Galway) **/ˈiəɾˠə/** for *iarraidh* | [wiktionary](https://en.wiktionary.org/wiki/iarraidh) | **Moderate.** Two-syllable [ˈiəɾˠə]; the diphthong [iə] and velarised [ɾˠ] are the work. No cluster. |
| `tá a fhios agam` | *fhios* Connacht **/ɪsˠ/**; whole phrase reduces — "very typical in Conamara" | [wiktionary](https://en.wiktionary.org/wiki/fhios), [transparent](https://blogs.transparent.com/irish/beagainin-eile-sa-"teanga"-teacsaise-9l-is-am/) | **EASY to say, HARD to map.** Spoken ≈ *[sˠ am]*. The difficulty is that the written form has four words and the spoken form has ~two syllables. |
| `cén chaoi a bhfuil tú` | *caoi* Connacht **/kiː/** → `chaoi` = [xiː] | [wiktionary](https://en.wiktionary.org/wiki/caoi) | **HARD.** Long phrase, and `chaoi` opens with **[x]** (velar fricative), which English lacks entirely. |
| `is féidir liom` | **GAP** — Wiktionary's `féidir` page carries no IPA | [wiktionary](https://en.wiktionary.org/wiki/féidir) | Phonologically mild. But per **Q4 it is attributed to Munster** — the dialect question matters more than the phonetics. |
| `ag labhairt` | **GAP** — not retrieved | — | **INFERRED:** the slender **[vʲ]/[uː]** in *labhairt* plus final slender *rt* is a real cluster. Not sourced. |
| `i ndáiríre` | *dáiríre* Munster **and Connacht** **/d̪ˠɑːˈɾʲiːɾʲə/** | [wiktionary](https://en.wiktionary.org/wiki/dáiríre) | **HARD.** Four syllables, **stress on the second**, two slender [ɾʲ], plus the eclipsis `nd-` → [n̪ˠ]. The heaviest item on this list. |

### Ranked recommendation (INFERRED from the IPA above)

- **Safe early:** `caithfidh` [kaː] — genuinely one of the *easiest* forms in the inventory,
  contrary to the brief's assumption. `tá a fhios agam` is easy to *pronounce* once you teach the
  reduced form, provided you accept the spelling/speech gap.
- **Defer or drill hard:** `i ndáiríre` (stress + slender r's + eclipsis) and
  `cén chaoi a bhfuil tú` (the [x] onset). `cén chaoi` is unavoidable — it is the Connacht "how"
  — so it needs deliberate drilling rather than deferral.
- **Watch:** `ag labhairt` — unsourced, but the slender cluster is a plausible trap.

### Connacht recordings on teanglann — the factual yes/no the brief asked for

I verified two headwords directly (`ábalta`, `fosta`): **the Connacht recording exists in both
cases**, alongside Ulster and Munster. **But see the methodological finding at the top of this
document** — `fosta` is an Ulster word and still has a Connacht recording, so coverage appears to
be universal across the headword list and **carries no dialectal information**. I did not check
all seven Q10 forms individually; several are phrases rather than headwords and would not have
their own pronunciation pages at all.

**GAP:** abair.ie Connacht synthesis availability — not checked.

---

## Summary: the three spec claims the brief asked me to verify

| Spec claim | Location | Verdict |
|---|---|---|
| Synthetic **1pl NO** (`tá muid`, `molann muid`), `muid` is the Connacht pronoun | `:47-48`, `:76-82` | ✅ **CONFIRMED** — Wikipedia *Connacht Irish*, verbatim, Galway named |
| Synthetic **1sg YES** (`labhraím`, `ceapaim`) | `:80-82` | ⚠️ **INFERRED ONLY** — no source states it; consistent with what is reported, but argued from silence |
| `in ann` IN (Connemara) | `:50` | ✅ **CONFIRMED** — "tá mé in ann (Connacht)" |
| `ábalta` FORBIDDEN as Ulster | `:67` | ❌ **NOT VERIFIED** — no source calls it Ulster; Ó Dónaill unlabelled; weakly counter-indicated |
| `is dóigh liom` FORBIDDEN as Munster | `:63` | ❌ **NOT VERIFIED** — no dialect attribution found anywhere; Ó Dónaill unlabelled |
| `chan`/`cha`, `tchí`, `fosta` forbidden as Ulster | `:67` | ✅ **CONFIRMED** for `cha`/`chan` and `tchí` |

### What I would do next

1. **Get Ó Siadhail.** Both the Cois Fharraige textbook and *Modern Irish: Grammatical Structure
   and Dialectal Variation* are behind archive.org restrictions. A physical/purchased copy would
   close most of the GAPs above in one pass — specifically `is dóigh liom`, `ábalta`, the 1sg
   question, and the Connemara "I have to".
2. **Do not harden the two unverified bans** (`is dóigh liom`, `ábalta`) into further tooling
   until sourced — and equally, do not relax them on the strength of this document alone.
3. **Consider `sa mbaile`** — a sourced Connacht eclipsis rule not currently in the spec.
