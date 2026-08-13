# 43 Basque phrases flagged by an automatic check — what they actually are

*eus_for_eng · recovered 13 August 2026 · read this on your phone, top to bottom*

## In one paragraph

On 12 August a repair tool swept the Basque course fixing stale word-by-word English
glosses. It fixed 447 phrases and **refused to touch 43**, because on those 43 it could not
find the phrase's own LEGO inside the phrase. It logged them for a human to look at. That
log became a one-line note that nobody could act on, so here are the 43 rows themselves,
each read and sorted.

## What the check was, in plain language

Every practice phrase in a course is attached to one **LEGO** — the new chunk of language
that phrase exists to teach. The check is the obvious sanity test: *if this phrase is here
to teach that chunk, the chunk ought to appear in the phrase.* When it doesn't, either the
phrase is wrong, or it has drifted onto the wrong LEGO — and a learner can end up drilling
a phrase that never contains the thing it claims to be teaching.

That is why a failure matters. It is also why most of these 43 turn out **not** to be
failures.

## The headline: it is not 43 defects

I read all 43 against their LEGOs. They fall into three very different piles.

| | What | Count |
|---|---|---|
| **A** | The LEGO's word is genuinely missing — worth a human read | **7** |
| **B** | Component rows, where the check asked the question backwards | **9** |
| **C** | The LEGO's word is there, just inflected — Basque grammar working normally | **27** |

**Basque glues endings onto words.** `aste` ("week") becomes `astebete` ("a week long");
`txakur` ("dog") becomes `txakurrak` ("dogs"); `ikusi` ("to see") becomes `ikustea`
("seeing"). A plain letter-for-letter search finds none of those, and calls all of them
defects. That is pile C — 27 of the 43, and by my reading nothing is wrong with any of them.

Pile B is the same kind of mistake in a different direction: a *component* row is a small
slice cut out of a LEGO, so of course the whole LEGO is not inside it.

**So the real queue is pile A: seven rows.** And within those seven, four are a data
problem rather than a language problem (a phrase left attached to a LEGO slot that was
later re-written to mean something else), which leaves roughly **three rows that genuinely
want a Basque speaker's eye.**

## Two numbers that do not match, and it matters

The note says 43. That is the count of rows **this one tool happened to look at** — it only
examined the 491 phrases that also had a stale gloss. It is not a course-wide figure.

Asking the same question across the whole Basque course:

| Question | Count |
|---|---|
| Practice phrases (BUILD + USE) in `eus_for_eng` | **5,683** |
| …whose LEGO text is not found in them at all (loose search) | **90** |
| …whose LEGO text is not found as a whole word (stricter) | **114** |
| The 43 in this document | a **subset** of those |

So the honest statement is: *43 is what one repair run tripped over, not the size of the
problem.* On the loosest test the course-wide figure is 90. Given that ~63% of this sample
(pile C) turned out to be Basque morphology rather than a defect, the true defect count
course-wide is likely well under 20 — but that is an estimate from this sample, not a count.

## The rows

Recovered from the original run log (`docs/decomposition-refresh-2026-08-12/eus_for_eng-applied-log.json`),
**not re-derived** — these are the exact 43 rows the tool declined, with the LEGO, round and
English pulled fresh from the live database.

### A — The 7 that look genuinely wrong

The LEGO's word is genuinely **not** in this phrase, in any form I can see. These are the rows worth a human read.

**Round 18 · seed 6 · S0006L02B03 · BUILD**

- LEGO being taught: **hitz bat** — “a word”
- Basque: **beste bat nahi dut**
- English: “I want another one”
- The phrase is about *another one* (`beste bat`), not *a word*. The slot was re-authored: this phrase belongs to an older LEGO.

**Round 18 · seed 6 · S0006L02U04 · USE**

- LEGO being taught: **hitz bat** — “a word”
- Basque: **beste bat praktikatu nahi dut**
- English: “I want to practise another one”
- Same as above — phrase belongs to `beste bat` (another one), not `hitz bat` (a word).

**Round 140 · seed 52 · S0052L01U04 · USE**

- LEGO being taught: **idatzi** — “to write”
- Basque: **gauzak idaztea gustatzen zait**
- English: “I enjoy writing things”
- `idatzi` → `idaztea` is the verbal-noun form of the same verb (root *idatz-*). Almost certainly fine; listed here only because the root letters change.

**Round 152 · seed 55 · S0055L04B02 · BUILD**

- LEGO being taught: **izatea** — “being”
- Basque: **esna egotea ez zait gustatzen**
- English: “I don't enjoy being awake”
- The LEGO is `izatea` (*being*, from **izan**) but the phrase uses `egotea` (*being*, from **egon**). Two different Basque verbs for 'to be'. A real question.

**Round 152 · seed 55 · S0055L04U06 · USE**

- LEGO being taught: **izatea** — “being”
- Basque: **ez zait gustatzen ondo lo egin ez dudanean esna egotea**
- English: “I don't enjoy waking up when I didn't sleep well”
- Same izan-vs-egon question as above.

**Round 299 · seed 115 · S0115L02U04 · USE**

- LEGO being taught: **nagoenik** — “that I am”
- Basque: **euskaraz hitz egiteko prest sentitzen naiz**
- English: “I feel that I'm ready to speak Basque”
- The LEGO is `nagoenik` (*that I am*); the phrase has `sentitzen naiz` (*I feel*) and no `nagoenik` at all. A real question.

**Round 325 · seed 126 · S0126L01U05 · USE**

- LEGO being taught: **lan honek** — “this work”
- Basque: **lan hau gustatzen zait**
- English: “I enjoy this work”
- The LEGO is `lan honek` (ergative *this work*); the phrase has `lan hau` (absolutive). Same words, different case ending — probably correct, since the grammar of the sentence decides the ending.

### B — The 9 where the check asked the question backwards

This is a **component** row — a literal slice *of* the LEGO, so it is correctly shorter than the LEGO. The check asked the question backwards: it looked for the whole LEGO inside a fragment of that same LEGO. Not a defect.

**Round 27 · seed 9 · S0009L02C02 · COMPONENT**

- LEGO being taught: **pixka bat** — “a little”
- Basque: **bat**
- English: “one”
- The slice `bat` is part of the LEGO `pixka bat`, as it should be.

**Round 33 · seed 11 · S0011L03C01 · COMPONENT**

- LEGO being taught: **hitz egiteko gai** — “capable of speaking”
- Basque: **hitz egiteko**
- English: “for speaking”
- The slice `hitz egiteko` is part of the LEGO `hitz egiteko gai`, as it should be.

**Round 56 · seed 19 · S0019L02C01 · COMPONENT**

- LEGO being taught: **hitz egiteari utzi** — “to stop talking”
- Basque: **hitz egiteari**
- English: “of speaking”
- The slice `hitz egiteari` is part of the LEGO `hitz egiteari utzi`, as it should be.

**Round 351 · seed 136 · S0136L02C01 · COMPONENT**

- LEGO being taught: **galdetu diezaiokezu** — “you can ask her”
- Basque: **galdetu**
- English: “to ask”
- The slice `galdetu` is part of the LEGO `galdetu diezaiokezu`, as it should be.

**Round 457 · seed 184 · S0184L03C01 · COMPONENT**

- LEGO being taught: **ordu bat barru** — “within an hour”
- Basque: **ordu bat**
- English: “one hour”
- The slice `ordu bat` is part of the LEGO `ordu bat barru`, as it should be.

**Round 505 · seed 208 · S0208L01C03 · COMPONENT**

- LEGO being taught: **ez nuen galdetu nahi** — “I didn't want to ask”
- Basque: **galdetu**
- English: “to ask”
- The slice `galdetu` is part of the LEGO `ez nuen galdetu nahi`, as it should be.

**Round 571 · seed 234 · S0234L02C01 · COMPONENT**

- LEGO being taught: **atzo gauean** — “last night”
- Basque: **atzo**
- English: “yesterday”
- The slice `atzo` is part of the LEGO `atzo gauean`, as it should be.

**Round 633 · seed 264 · S0264L01C03 · COMPONENT**

- LEGO being taught: **gizon zahar bat** — “an old man”
- Basque: **bat**
- English: “a”
- The slice `bat` is part of the LEGO `gizon zahar bat`, as it should be.

**Round 634 · seed 265 · S0265L01C02 · COMPONENT**

- LEGO being taught: **lagun bat** — “a friend”
- Basque: **bat**
- English: “a”
- The slice `bat` is part of the LEGO `lagun bat`, as it should be.

### C — The 27 that are Basque grammar doing its job

The LEGO's word **is** here, in an inflected or compounded form. Basque glues endings on, so the letters of the LEGO change shape. My reading: not a defect — the check simply cannot see Basque morphology.

**Round 60 · seed 20 · S0020L04U05 · USE**

- LEGO being taught: **ikasi** — “to learn”
- Basque: **bere izena ikasiko dut**
- English: “I'll learn his name”
- The LEGO word `ikasi` appears as `ikasiko`.

**Round 63 · seed 22 · S0022L01U03 · USE**

- LEGO being taught: **ezagutu** — “to know”
- Basque: **bere izena ezagutzeko gogoa dut**
- English: “I have a desire to know her name”
- The LEGO word `ezagutu` appears as `ezagutzeko`.

**Round 63 · seed 22 · S0022L01U05 · USE**

- LEGO being taught: **ezagutu** — “to know”
- Basque: **bere izena azkar ezagutzeko gogoa dut**
- English: “I have a desire to know his name quickly”
- The LEGO word `ezagutu` appears as `ezagutzeko`.

**Round 64 · seed 22 · S0022L02B01 · BUILD**

- LEGO being taught: **euskaraz hitz egiten duen jendea** — “people who speak Basque”
- Basque: **hitz egiten duen jendea**
- English: “people who speak”
- The LEGO word `egiten` appears as `egiten`.

**Round 78 · seed 27 · S0027L01U03 · USE**

- LEGO being taught: **gustatzen zait** — “I like”
- Basque: **hitz egiteari uztea ez zait gustatzen**
- English: “I don't like stopping talking”
- The LEGO word `gustatzen` appears as `gustatzen`.

**Round 78 · seed 27 · S0027L01U04 · USE**

- LEGO being taught: **gustatzen zait** — “I like”
- Basque: **euskaraz hitz egitea gustatzen zaizu?**
- English: “do you like speaking Basque?”
- The LEGO word `gustatzen` appears as `gustatzen`.

**Round 81 · seed 27 · S0027L04U02 · USE**

- LEGO being taught: **erantzuteko** — “to answer”
- Basque: **azkar erantzutea gustatzen zait**
- English: “I like answering quickly”
- The LEGO word `erantzuteko` appears as `erantzutea`.

**Round 108 · seed 38 · S0038L01B01 · BUILD**

- LEGO being taught: **aste** — “week”
- Basque: **astebete daramat ikasten**
- English: “I've learned for a week”
- The LEGO word `aste` appears as `astebete`.

**Round 108 · seed 38 · S0038L01B02 · BUILD**

- LEGO being taught: **aste** — “week”
- Basque: **gaur astebete daramat ikasten**
- English: “today I've learned for a week”
- The LEGO word `aste` appears as `astebete`.

**Round 108 · seed 38 · S0038L01B03 · BUILD**

- LEGO being taught: **aste** — “week”
- Basque: **astebete daramat saiatzen**
- English: “I've been trying for a week”
- The LEGO word `aste` appears as `astebete`.

**Round 108 · seed 38 · S0038L01U01 · USE**

- LEGO being taught: **aste** — “week”
- Basque: **astebetez praktikatu nahi dut**
- English: “I want to practise for a week”
- The LEGO word `aste` appears as `astebetez`.

**Round 108 · seed 38 · S0038L01U02 · USE**

- LEGO being taught: **aste** — “week”
- Basque: **iaz astebetez ikasi nahi zenuen**
- English: “last year you wanted to learn for a week”
- The LEGO word `aste` appears as `astebetez`.

**Round 108 · seed 38 · S0038L01U04 · USE**

- LEGO being taught: **aste** — “week”
- Basque: **astebete daramat hitz egiten saiatzen**
- English: “I've been trying to speak for a week”
- The LEGO word `aste` appears as `astebete`.

**Round 108 · seed 38 · S0038L01U05 · USE**

- LEGO being taught: **aste** — “week”
- Basque: **astebete baino gehiago praktikatu nahi dut**
- English: “I want to practise for more than a week”
- The LEGO word `aste` appears as `astebete`.

**Round 109 · seed 38 · S0038L02U01 · USE**

- LEGO being taught: **inguru** — “approximately”
- Basque: **astebete inguruz irakurri nahi dut**
- English: “I want to read for about a week”
- The LEGO word `inguru` appears as `inguruz`.

**Round 109 · seed 38 · S0038L02U02 · USE**

- LEGO being taught: **inguru** — “approximately”
- Basque: **astebete inguruz praktikatu nahi dut**
- English: “I want to practise for about a week”
- The LEGO word `inguru` appears as `inguruz`.

**Round 174 · seed 63 · S0063L03U03 · USE**

- LEGO being taught: **laguntzeaz** — “about helping”
- Basque: **jendeari laguntzea gustatzen zait**
- English: “I enjoy helping people”
- The LEGO word `laguntzeaz` appears as `laguntzea`.

**Round 185 · seed 69 · S0069L01U01 · USE**

- LEGO being taught: **txakur** — “dog”
- Basque: **txakurrak gustatzen zaizkit**
- English: “I like dogs”
- The LEGO word `txakur` appears as `txakurrak`.

**Round 186 · seed 69 · S0069L02U02 · USE**

- LEGO being taught: **gaztea** — “young”
- Basque: **txakur gazte bat gustatzen zait**
- English: “I like a young dog”
- The LEGO word `gaztea` appears as `gazte`.

**Round 224 · seed 85 · S0085L01U03 · USE**

- LEGO being taught: **ezagutzen** — “knowing”
- Basque: **jendea ezagutzea gustatzen zait**
- English: “I enjoy knowing people”
- The LEGO word `ezagutzen` appears as `ezagutzea`.

**Round 271 · seed 103 · S0103L01U02 · USE**

- LEGO being taught: **entzuten** — “hearing”
- Basque: **euskara entzutea gustatzen zait**
- English: “I enjoy hearing Basque”
- The LEGO word `entzuten` appears as `entzutea`.

**Round 277 · seed 106 · S0106L01U04 · USE**

- LEGO being taught: **sentitu** — “to feel”
- Basque: **ondo sentitzea gustatzen zait**
- English: “I enjoy feeling good”
- The LEGO word `sentitu` appears as `sentitzea`.

**Round 288 · seed 110 · S0110L02U03 · USE**

- LEGO being taught: **erlaxatu** — “to relax”
- Basque: **erlaxatzea gustatzen zait**
- English: “I enjoy relaxing”
- The LEGO word `erlaxatu` appears as `erlaxatzea`.

**Round 298 · seed 115 · S0115L01U04 · USE**

- LEGO being taught: **elkarrizketa** — “conversation”
- Basque: **elkarrizketak izatea gustatzen zait**
- English: “I enjoy having conversations”
- The LEGO word `elkarrizketa` appears as `elkarrizketak`.

**Round 321 · seed 123 · S0123L01U05 · USE**

- LEGO being taught: **ideia** — “idea”
- Basque: **zure ideiak gustatzen zaizkit**
- English: “I enjoy your ideas”
- The LEGO word `ideia` appears as `ideiak`.

**Round 328 · seed 127 · S0127L01U03 · USE**

- LEGO being taught: **ikusi** — “to see”
- Basque: **zu ikustea gustatzen zait**
- English: “I like seeing you”
- The LEGO word `ikusi` appears as `ikustea`.

**Round 584 · seed 240 · S0240L01U01 · USE**

- LEGO being taught: **nire aitak** — “my father”
- Basque: **nire aitari irakurtzea gustatzen zaio**
- English: “my father likes to read”
- The LEGO word `nire` appears as `nire`.

## A question for Tom, not a decision I made

The original note says these want **“a native-speaker / Aran read”**. Two things about that:

1. **Aran is a Welsh-side contributor.** These rows are Basque. Three of them turn on a
   genuine Basque grammar point (*izan* versus *egon* for “to be”; a missing
   `nagoenik`). Asking a Welsh speaker to adjudicate Basque morphology is not a read anyone
   can give. Who is the Basque speaker — Deborah, who reported the original gloss bug on
   this course?

2. **Four of the seven are not a language question at all.** A phrase sitting under a LEGO
   slot that was later re-authored is a data-provenance bug with a mechanical fix, and
   sending it to a native speaker asks them to rule on something they cannot see.

I have not decided either of these. They are yours.

## What I did not do

- I did not edit a single row. This is a read-only document.
- I did not run the course-wide check to the same depth as the 43 — the 90 and 114 figures
  are plain text-matching counts, not hand-read.
- The morphology calls in pile C are **my** reading of Basque, not a native speaker's. If a
  Basque speaker disagrees with even a few of them, pile A grows.
