# The Language-Mapping Index

**One English word, two target words. Look here before you solve it from scratch again.**

This is the estate's index for one recurring problem class: **an English prompt that cannot determine which target form the learner should produce**, because the target language splits what English fuses. "I know" a *fact* versus "I know" a *person* is the canonical case. It bites on every new course, in a different language each time, and we have been re-deriving the same answer for years because the previous answer was not findable.

**It is not a grammar reference.** It is a catalogue of *English-side wordings that resolved the fork in a shipped course*, plus the approaches we tried and rejected.

## The 7 problems currently covered

| | Problem | The fix, in a phrase |
|---|---|---|
| **P1** | "know" a **fact** vs a **person** | Put a person or a fact into the English sentence |
| **P2** | "know" means **four** things (Finnish, worked) | Count the target words before you split; "know how to" is a separate fork |
| **P3** | Irish "know", **live 2026-08-21** | Narrow the English on the person side; editing a gloss reissues no phrase ids |
| **P4** | A **bare pronoun cannot carry tense** | Put the tense in the English, or upchunk the pronoun into its verb |
| **P5** | One gloss, **two correct** forms (fronted object) | Both are needed — the English must carry what selects between them |
| **P6** | **Formal vs familiar "you"** (RULED) | Carry the register inside the sentence: `, sir` / `, madam` |
| **P7** | The same shape **outside cognition verbs** | Check meaning not strings, and measure the **seed gap** |

## How to use this in 30 seconds

1. Find your problem in the table above.
2. Read **THE FIX** line. Copy the shape of the real prompt wordings under it.
3. If your language is not listed under a problem, the shape almost certainly still applies — the split is a property of the *English side*, not of your target language.
4. If you solve a new one, **add it here** (see *Adding to this index*, at the end).

---

## The rule behind every entry

This class is a **ZUT problem on the production side**. ZUT is *same KNOWN → same TARGET, always* (`ralph-methodology.md` §ZUT). When the target splits a word English fuses, one English prompt has two right answers and the learner forks — which is exactly the failure ZUT exists to prevent.

There are only ever three moves, and they rank:

| | Move | Verdict |
|---|---|---|
| **1** | **Put the distinguishing sense into the English sentence as ordinary English.** `to know a person => kennen`. | **PREFERRED.** Survives being read aloud, because it is already speech. |
| **2** | **Reach for a different English verb.** `to get to know => conhecer`. | **USE WITH CARE.** It teaches a *different meaning*. See the Brazilian Portuguese failure below. |
| **3** | **Collapse the fork — teach only one sense, drop the other.** | **LEGITIMATE** when the second sense is rare in the course. Cheapest fix there is. |
| **✗** | **A bracketed tag.** `you know (2sg pres)`, `I know (am acquainted)`. | **REJECTED.** See *Rejected approaches*. |

**Why move 1 wins, concretely:** the presentation clip speaks the gloss. `"The German for 'to know a person', is:"` is a correct English sentence. The brackets are *stripped* before TTS, so `I know (am acquainted)` is spoken as **"I know am acquainted"**, and `he/she knows (3sg present)` is spoken as **"he she knows 3sg present"**. The tag was written for an editor's eye and gets read to a learner.

---

# The problems

## P1 — "know" a FACT vs "know" a PERSON

> **THE FIX:** put a person or a fact into the English sentence. `to know a person => kennen`, `I know those people => conozco a esas personas`, `we don't know the facts => no sabemos los hechos`. Never a bracket.

**The English ambiguity.** English has one verb for propositional knowledge and for acquaintance. Most of Europe and much of Asia has two.

**Where it bites — measured, not assumed.** 36 courses confirmed splitting automatically from drill data, 11 more confirmed by hand, 6 confirmed *not* splitting, 17 courses with no drill data at all (draft shells — an explicit gap, we cannot say).

Splitting, with the fact-word / person-word actually shipped:

| Language | Fact sense | Person sense | Language | Fact sense | Person sense |
|---|---|---|---|---|---|
| Spanish | `saber` | `conocer` | Finnish | `tietää` | `tuntea` |
| French | `savoir` | `connaître` | Irish | `tá a fhios ag` | `aithne ag` |
| German | `wissen` | `kennen` | Scottish Gaelic | `fios` | `aithne` |
| Italian | `sapere` | `conoscere` | Welsh | `gwybod` | `nabod` |
| Portuguese | `saber` | `conhecer` | Dutch | `weet` | `ken` |
| Catalan | `saber` | `conèixer` | Swedish | `veta` | `känna` |
| Galician | `saber` | `coñecer` | Norwegian | `vite` | `kjenne` |
| Basque | `jakin` | `ezagutu` | Danish | `vide` | `kende` |
| Romanian | `a ști` | `a cunoaște` | Icelandic | `vita` | `þekkja` |
| Mandarin | `知道` | `认识` | Turkish | `bilmek` | `tanımak` |
| Polish | `wiedzieć` | `znać` | Hebrew | `יודע` | `מכיר` |
| Czech | `vědět` | `znát` | Persian | `دانستن` | `شناختن` |
| Croatian | `znati` | `poznavati` | Bengali | `জানা` | `চেনা` |
| Bulgarian | `знам` | `познавам` | Hungarian | `tudni` | `ismerni` |
| Lithuanian | `žinoti` | `pažinti` | Afrikaans | `weet` | `ken` |
| Latvian | `zināt` | `pazīt` | | | |

**NOT splitting — nothing to do here:** Japanese, Korean, Arabic (all three variants). Japanese 分かる is *understand*, a different distinction from 知る; Korean 몰라요 is simply the negative of 알다; the Arabic أعرف/تعرف/يعرف forms are one root with person prefixes. These looked like splits in an automatic sweep and are not.

### The fix as shipped — real English wordings, copy these

Move 1, in its cleanest form (Austrian and Swiss German do this better than the flagship German course):

- `to know a person => kennen`
- `I know a person => i kenn` *(deu_at)*
- `to know somebody => kenne` *(deu_ch)*
- `people I don't know => persone che non conosco` *(ita)*
- `I know those people => conozco a esas personas` *(spa)*
- `most people I know => la plupart des gens que je connais` *(fra)*
- `we don't know the facts => no sabemos los hechos` *(spa)*

Across 927 "know" cards in 59 courses, this convention is used on **147 cards in 41 courses** — the second most common, and the one that works.

### What we got wrong, so you don't repeat it

- **620 cards in 59 courses do nothing at all** — `to know => wissen`, `I know => sé`, `knows => sabe`. That is the overwhelming default and it is where every live collision lives.
- **Live collisions — the same English prompt with two different right answers**, still shipped: French 5 (`I know` → *je sais* **and** *que je connais*; `he knows` → *il sait* **and** *il connaît*), German 4 (`I know` → *weiß* **and** *Ich kenne*), Portuguese 3, Brazilian Portuguese 3, Czech 3, Croatian 3, Polish 3, Spanish 2, Swiss German 2, Norwegian 4, Italian 1, Mexican Spanish 1, Austrian German 1. Mandarin and Cantonese have none.
- **Drilling a sense you never label.** Nine courses drill the person-word heavily while never once introducing it in short, plain English. Worst: **Brazilian Portuguese** drills `conhecer` **146 times** and the only cards introducing it say *"to get to know"* — which is a different meaning (meeting someone, not knowing them). It is public and paid. Also: Finnish `tunnen` 104 drills, only ever inside sentences; Basque ships `to know => jakin` **and** `to know => ezagutu`, same prompt, two verbs, no hint; Dutch ships `I know => ken` and `I know => weet` on separate cards, unmarked.
- **No seed text needs to change.** Of 2,753 English seed sentences containing "know", **zero** carry any disambiguation. The problem lives entirely on cards and drills — so the fix is a handful of card glosses per course plus a re-render of the affected known-side and presentation clips.

*Source: the estate-wide "know" survey, `.a74-scratch/know-survey/report.md` and `appendix-table.md` (per-course table with drill counts and verbatim glosses).*

---

## P2 — "know" MEANS FOUR THINGS, not two (Finnish, worked)

> **THE FIX:** before you decide the fact/person split, count how many target words your English "know" is actually covering. In Finnish it is **four**, and the dangerous pair is not the famous one.

Finnish is the language with the deepest existing notes, and they say the fact/person split was **not** the problem. `tietää` (fact, seed 45) vs `tuntea` (person, seed 85) is **clean, with zero crossovers**. The defects are the other two words:

- **`osata` — "know how to".** The identical English frame *know how to [verb]* is `osata` at seeds 11, 13 and 60, and `tiedän miten` at seed 59. **Seeds 59 and 60 are adjacent.** The prior report calls this "the worst thing in the report."

  | Seed | English shown | Finnish expected |
  |---|---|---|
  | 11 | to know how to speak | `osata puhua` |
  | 59 | I know how to say something in Finnish | `mä tiedän **miten** sanoa jotain suomeksi` |
  | 59 | I know how to answer now | `mä tiedän **miten** vastata nyt` |
  | 60 | I don't know how to speak yet | `mä en vielä **osaa** puhua` |

- **`tutustua` — "to get to know"** (seed 133), a fourth word again glossed off the same English.
- **`tietää` used with a person object**, contradicting the course's own teaching: `S0290L01B03/U02/U05` write `tietääköhän se mun kaverin` while the course teaches `tuntea` for knowing a person at S230 across 14+ rows (`mä tunnen sen`, `mä tunnen nuoren miehen`). Corpus-confirmed.

**Generalises to:** any language with a dedicated "know how to" verb — Spanish/French *saber+inf / savoir+inf* do this job with the fact-verb, so English "know how to" is a *third* fork there, not covered by the person/fact fix.

*Source: `docs/finnish/finnish-decisions-evidence-pack-2026-08-06.md` §"know is four words, not two" and §A; `docs/finnish/fin-possessor-systems-deep-dive-2026-08-18.md` §"tietää with a person object".*

---

## P3 — Irish "I know", live and being fixed (Connemara, 2026-08-21)

> **THE FIX:** narrow the English gloss on the person-sense side — `I don't know him`, `I know a young man who…` — and leave the Irish untouched. Editing a unit's English **reissues no phrase ids**, because ids are position-derived (seed, unit index, role, position), not text-derived.

**The ambiguity.** Irish splits it two ways and neither is optional:

| English | Fact sense | Person sense |
|---|---|---|
| I know | `tá a fhios agam` (S59) | `tá aithne agam ar` (S230) |
| I don't know | `níl a fhios agam` (S60) | `níl aithne agam ar` (S85) |

Both collisions are **live in `gle_cn_for_eng`**, found by the course-wide audit as two of ten known-side splits. The audit's own verdict: *"'I know' / 'I don't know' — know-a-fact versus know-a-person, seeds 59/230 and 60/85. Needs: the English prompts differentiated. **This is the one I would fix first.**"*

**The cost of leaving it, in one real example.** By the time the build reached seed 135, the bare gloss *"I don't know"* was **already locked** to the person sense at S85, so a later fact-sense tile could not have it and had to carry an extra word: *"the bare gloss "I don't know" was NOT available — it is already locked to `níl aithne agam ar` (S85, knowing a person), so the tile had to carry `why`"* → `níl a fhios agam cén fáth`. **An unresolved fork does not stay put; it distorts every later seed that needs the word.**

**Why it happened, and the structural cause worth knowing:** the submit endpoint only checks collisions against *earlier* seeds, so **parallel workers on different bands are structurally blind to each other.** Both Irish collisions were unavoidable by the workers who created them. If you are running a banded parallel build, a cross-band sweep at the end is not optional.

**Real Irish wordings that resolve it, already in the register:**
- `I know a young man who wants to work with you` → `Tá aithne agam ar fhear óg atá ag iarraidh obair leat.`
- `they are people I don't know` → `Is daoine iad nach bhfuil aithne agam orthu.`
- `we don't know` (fact, not a person) → `níl a fhios againn`
- `you get to know someone` → `cuireann tú aithne ar dhuine`

**One trap recorded:** *"I don't know those people"* (seed 85) is the **person** sense, not the fact sense. `Níl a fhios agam na daoine sin` **is not Irish.** Person-knowing is always `aithne`.

*Source: `docs/gle-cn/zut-crossband-hole-closed-and-swept-2026-08-21.md`, `docs/gle-cn/translation-register-2026-08-20.md`, `docs/gle-cn/register-additions-B1band133.md`, `docs/gle-cn/band-register-D45-52-73-2026-08-20.md`.*

---

## P4 — A bare pronoun cannot carry tense

> **THE FIX:** never gloss a tensed target form with a bare English pronoun. Put the tense in the English — `I was`, `I did`, `you were` — or upchunk the pronoun into the verb it is fused to.

**The English ambiguity.** English "I" is tenseless: the tense lives in a separate verb. In languages that **fuse pronoun and tense into one form**, a bare `I` on a card has no way to tell the learner which form to produce.

**Live in Connemara Irish:** `I` and `you` are glossed as the **present** form at seeds 1, 163 and 20, and as the **past** form at seeds 30 and 31. The audit's verdict, verbatim: *"Real: **a bare pronoun prompt cannot select a tense.**"* It is item 7 on the list awaiting a ruling — **UNRULED as of 2026-08-21.**

**Where else this shape bites.** Any language that inflects the pronoun-plus-verb as one unit, or that has synthetic verb forms: Irish and Scottish Gaelic, Welsh, the Romance languages wherever the pronoun is dropped and the verb ending carries person *and* tense, Hungarian, Finnish. **If your target drops or fuses the subject pronoun, a bare-pronoun gloss is a defect waiting to happen.**

*Source: `docs/gle-cn/zut-crossband-hole-closed-and-swept-2026-08-21.md` §"Seven more splits nobody had counted" and §"What I deliberately did NOT touch", item 7.*

---

## P5 — One English gloss, two or three correct target forms (the fronted-object convention)

> **THE FIX:** when both target forms are correct and *complementary* — neither can be dropped — the English gloss must carry the thing that selects between them. For Irish: put the object into the English. `to read it` selects `a léamh`; `to read` selects bare `léamh`.

**This is a different problem from P1, and the difference matters.** In P1, two target words mean *different things* and you pick the sense. Here **neither form is wrong and they are not alternatives** — they are in complementary distribution, and swapping either for the other produces target-language text that is simply **wrong**. There is no "which form should the course use" question to answer: **it needs both.**

**The Irish case, measured across 33 practice sentences with not one counterexample:**
- `a léamh` occurs **only** where an object comes first — `mo leabhar a léamh`, `an leabhar sin a léamh`, `tada a léamh`.
- bare `léamh` occurs **only** where there is no object — `is maith liom léamh`, `tá mé ag iarraidh léamh`, `in ann léamh`.

Confirmed against the National Corpus of Irish on the decisive frame: `leabhar a léamh` **306** vs `leabhar léamh` 3; `rud a athrú` **38** vs `rud athrú` 3 — and all six apparent counterexamples dissolve on inspection (they are the *noun* `léamh` "a reading", or an intransitive `athrú`).

**The model to copy, and it was already in the course.** Seed 35 — `tada a léamh` → *"to read anything"* — is the **earliest** of the three and is **correct**, because it puts the object into the English, so the particle in the Irish is earned. Seed 180 (`a léamh` glossed as bare *"to read"*) broke a pattern seed 35 had already set.

**It is a family, not a one-off.** 29 units in the course teach a particle form `a X`; five also teach the bare form as its own unit. **Two collide outright** — *to read* (180 vs 239) and *to change* (`a athrú` 104 vs `athrú` 188). Three escaped **only because the English happened to differ** — *to speak*/*speak*, *to explain*/*explain*, *understand*/*to understand* — *"that differentiation is ad hoc, and in one case it is inverted relative to the other two."* So this is **a missing convention**, not two bad rows.

**RULING STATUS: UNRULED as of 2026-08-21.** It is item 2 on the list for Kai: *"Needs: a decision on how the course glosses a fronted-object verbal noun. Both Irish forms are correct and neither can be dropped; the fix is one field on seed 180, but the convention is yours to set, and it should be set once for both."*

**Two measurement traps, recorded because each would have produced a confident wrong answer:**
1. A plain substring count of `athrú` in Ó Curnáin returns 180 — but most are `ceathrú` ("quarter") and `fiathrú`. **With word boundaries it is 53.**
2. Raw corpus bigram counts *look* like both forms appear in both frames until you **read the concordance lines**, at which point every apparent exception has its object fronted a few words further left.

*Source: `docs/gle-cn/zut-crossband-hole-closed-and-swept-2026-08-21.md` §Addendum.*

---

## P6 — FORMAL vs FAMILIAR "you" (RULED, and the ruling is the spec)

> **THE FIX — Kai's ruling, 2026-08-17, verbatim:** *"Yes, this should apply to all formal phrases. Just always add the formal tag, sir or madam. We should probably also say hänen in the formal ones, if it comes up in the seed? If it doesn't, then we shouldn't use sen in the formal phrases."*

**The English ambiguity.** Modern English has one "you" for every register. Most of Europe has two, and the target verb form changes with it — so a learner shown a bare `you` has no way to choose.

**The mechanism, and it is move 1 exactly:** carry the register **inside the sentence**, as ordinary English, appended before any question mark. `, sir` → `, herra` and `, madam` → `, rouva`. Applied to 59 Finnish phrases across 14 baskets:

- `I asked how you are, sir` → `mä kysyin, miten te voitte, herra`
- `how are you today, sir?` → `miten te voitte tänään, herra?`
- `do you want coffee, madam` → `haluatteko te kahvia, rouva`
- `could you speak more slowly, sir?` → `voisitteko te puhua hitaammin, herra?`
- `I can see you, sir` → `mä nään teitä, herra`
- `you're doing something, madam` → `te teette jotain, rouva`
- `i'd like to help you, sir` → `mä haluaisin auttaa teitä, herra`

**Three things worth stealing from how it was done:**
1. **The signal must be taught before it is used.** The `how are you (formal)` basket took `herra` **only**, because `rouva` does not debut until the next card in the same seed. The known side is a controlled language too — a disambiguating word is vocabulary, and it obeys the same accumulation rule as any other.
2. **`sir` and `madam` were balanced across baskets** (35 / 24) and chosen to avoid duplicating a prompt already present — i.e. the fix was applied so as not to *create* a ZUT collision while resolving one.
3. **Scope it before you sweep it.** 190 formal phrases; 79 already carried a signal, **111 did not**, 59 were fixed, 53 went to Kai as judgement calls. A separate 7 misused colloquial `se` for a *person*. The inanimate `se`/`sen` was deliberately **left alone** and said so out loud — *"`se` is the only word Finnish has for it, there is no register contrast, and Kai's ruling is about his/her."*

**Where it bites:** Finnish (`te`/`sinä`), German (`Sie`/`du`), Spanish (`usted`/`tú`), French (`vous`/`tu`), Italian (`Lei`/`tu`), Portuguese, Dutch (`u`/`je`), Polish (`pan`/`ty`), Czech, Russian, Turkish, and most of the Slavic set. **Note the overlap with plural "you"** — in French, Spanish (Iberian), Finnish and Russian the *same* form does formal-singular and plural duty, so one English `you` can be forking **three** ways at once.

*Source: `docs/finnish/fin-formal-register-2026-08-17.md`, `docs/finnish/fin-register-compatibility-2026-08-17.md`.*

---

## P7 — "need to", "very", "when", "how": the same shape, outside the verbs of cognition

> **THE FIX:** run the check on *meaning*, not on exact English strings — and measure the **seed gap**, because a fork the learner meets 40 seeds apart is survivable and one they meet 1 seed apart is not.

The famous cases are verbs of cognition, but the shape is general. Finnish, measured live:

| English | The two words | Seeds | Gap |
|---|---|---|---|
| that person | `se henkilö` / `toi henkilö` | 388, 389 | **1** |
| thing / things | `juttu` / `asioita` | 47, 51 | **4** |
| how | `kuinka` / `miten` (bare tiles) | 33, 40 | **7** |
| need to | `mun pitää` / `mun ei tarvii` | 44, 45 | **1** |
| very | `tosi` / `kovin` | 13, 55 | 42 |
| when | `kun` / `milloin` | 34, 79 | 45 |

**Three method lessons, each of which flipped a verdict when it was applied:**

1. **Exact English matching is blind by construction.** "thing" (seed 47) was never compared with "things" (seed 51) — different Finnish words, not a plural — so a real 4-seed collision read as 196 seeds apart. **Collapse word endings before comparing**, and run a *meaning-based* sweep alongside the exact one.
2. **Measure the gap between the two tiles the learner actually chooses between**, not a word's earliest appearance anywhere. "how" read as a 30-seed gap when it is 7.
3. **A clean-looking split can still be a defect if it is early.** `kun` (joins clauses) vs `milloin` (asks questions) has **zero crossovers** — the split is perfectly clean — but it debuts at seed 34, in the nervous stretch, where a learner has no context to lean on.

**And one that is legitimately not a defect:** "need to" → `pitää` at 44 and `tarvita` at 45 is one seed apart, but `ei tarvitse` is the standard Finnish negative of `pitää`. **A grammatically-forced alternation is not a fork** — the learner has one rule, not two choices. Check for this before flagging.

*Source: `docs/finnish/finnish-decisions-evidence-pack-2026-08-06.md`.*

---

## Rejected approaches — and why

**A rejected approach recorded is worth as much as an accepted one.** These have all been tried and shipped somewhere on the estate. Do not reach for them.

### ✗ Bracketed grammar tags — `you know (2sg pres)`

47 cards in 18 courses. **Delete on sight; nothing is lost.** They are noise to a learner (who cannot produce anything from "3sg present") and absurd when read aloud, because the brackets are stripped and the words inside are *spoken*:

- *"The Romanian for: 'he/she knows (3sg present)', is:"*
- *"The Latvian for: 'you know (2nd sg present)', is:"*
- *"we wanted to know (1pl imperfect + subjunctive)"*
- *"known (past participle of vita)"*
- *"she knows (3sg fem present, sentence-final)"*

This is the same principle as `ralph-methodology.md` §*Conservative Suppression & Honest Glosses*: **a debut hands the learner a producible intention, never a grammar label.**

### ✗ Bracketed sense hints — `I know (a person)`

41 cards in 20 courses. **Replace, do not delete** — unlike the grammar tags, these are the *only* thing telling the learner which sense is meant, so deleting them leaves the fork wide open. Rewrite as move 1. They degrade badly when spoken: `(a person)` becomes *"you know a person"*, which is passable; `(am acquainted)` becomes *"I know am acquainted"*, which is not.

**Standing position, and a live clash you must not sweep up.** Kai: *"NO PARENTHETICAL TAGS in courses, ever… they're a pet peeve of mine"*, and existing ones get removed. **But** the *English-brackets-in-narration* objection is explicitly **PARKED** — "they can't be pulled just like that, so let's look at it later." Do not treat "brackets are banned" as a licence to bulk-edit narration. (Logged as clash **C3** in the methodology canon.)

**Scale, if you are scoping a sweep:** 307 built English clips in 31 courses speak a bracket aloud — 159 grammar tags, 147 sense hints, 1 stray. Worst: Nepali 34, Hindi 24, Swahili 23, Persian 23, Bengali 16, Serbian 15, Romanian 12, Irish 11, Dutch 11, Greek 11, Icelandic 10, Lithuanian 10, Catalan 10, Turkish 9.

### ⚠ A different English verb — `to get to know => conhecer`

60 cards in 49 courses — nearly universal, and **it quietly teaches the wrong meaning.** "Get to know" is *meeting* someone, not knowing them. It is acceptable only when the target word genuinely means that. Brazilian Portuguese is the cautionary case: 146 drills of `conhecer`, introduced *only* as "to get to know".

### ✗ Slashed alternatives — `know/feel => känner`

12 cards in 7 courses. Two English words on one card do not tell a learner which target form to produce; they tell them the card has two answers. `I used to know/knew => þekkti`, `you know/get to know (2sg) => cunoști`.

---

## What we have notes for, and what we do not — read this before trusting the index

This index is honest about its holes. It covers **7 problems**. The class is bigger than that.

**Languages with real, findable prior notes on this class:**

| Language | What exists | Where |
|---|---|---|
| **Finnish** | The deepest by far — "know" is four words not two, `osata` vs `tiedän miten`, `tietää` with a person object, the whole formal-register sweep with Kai's ruling, and the meaning-based-vs-exact-match method lesson | `docs/finnish/` (17 files) |
| **Irish (Connemara)** | Three live cases, fully measured, all awaiting rulings: fact/person "know", bare-pronoun tense, fronted-object verbal noun | `docs/gle-cn/` (~60 files) |
| **Irish (Ulster)** | Dialect spec and block reports; **not checked for this class** | `docs/gle-ul/` |
| **All 59 courses, for "know" only** | Per-course table with drill counts, both target words, and verbatim glosses | `.a74-scratch/know-survey/` |

**Languages with NO prior notes found on this class, stated plainly:** German, Spanish, French, Italian, Portuguese, Dutch, Welsh, Japanese, Sinhala, Hindi, and every other course. Their entries in P1 come **from the shipped database**, not from anyone having written the problem up. **If you are working in one of these, you are the first — write it down here.**

**Problems in this class NOT yet covered here, and known to exist:**
- **"to be" splitting two ways** — Spanish/Portuguese `ser`/`estar`, Irish `tá`/`is`. No prior notes found; **no shipped-evidence sweep has been run.**
- **Singular vs plural "you"** — Welsh `ti`/`chi`, Irish `tú`/`sibh`, Spanish `tú`/`vosotros`. Overlaps P6 but is a distinct fork. No prior notes found.
- **A verb whose object case changes its meaning** — Finnish partitive vs accusative. `docs/finnish/fin-kysya-government-2026-08-21.md` treats one instance (`kysyä` governs a partitive object) but it has not been generalised into a rule for this class.
- **Possession / "have" splitting** — Irish `agam`, Welsh `gyda`. No prior notes found.
- **Gendered forms** — the estate has no voice-gender field and gender adaptation is invisible in `course_audio.text`; how that interacts with a gendered known-side gloss is unexamined here.

---

## Adding to this index

**If you solve one of these, it goes here.** Not in a build report that nobody re-reads, not in a commit message.

Each entry carries, in this order:
1. **THE FIX**, one line, first — the reader is holding a broken row and wants the answer.
2. The English-side ambiguity in one sentence.
3. Which languages it bites in — **from data, not assumption**. If you did not check a language, say so.
4. Real, verbatim, copy-pasteable English prompt wordings from a **shipped** course, with the course code.
5. Anything tried and rejected, with why.

**Honesty rule:** an index that overstates what we know is worse than a short one. Write "no notes found for X" rather than implying coverage.

**Related:** `ralph-methodology.md` (§ZUT, §The Pair-Contract, §Conservative Suppression) · `synonym-choice-architecture.md` (upstream translation-choice) · `docs/pair-contracts/*.contract.cjs` (where a *pair's* resolved forks are encoded as machine-checkable rules) · `.claude/commands/ssi-translation-methodology.md` · `.claude/commands/translation-analysis.md` (Pass-1 "problem verbs" capture).

**A resolved fork belongs in TWO places:** here, as a lesson for the next language, **and** in that pair's `docs/pair-contracts/<course_code>.contract.cjs` as a gloss-determinism rule the gates actually enforce. This index is the memory; the contract is the enforcement.
