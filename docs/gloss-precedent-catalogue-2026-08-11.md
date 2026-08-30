# Gloss precedent catalogue — what the estate already does about ambiguous prompts

**2026-08-11 · read-only survey · 145 courses, 93,377 lego cards, 820,072 drills, 81,809 seeds**

I was asked to find the *wording* that already solves "one prompt, two answers", so a fix can copy a house
style instead of inventing one. I did not measure collisions and I did not rule on which target word is right.

---

## The short answer

**There are two rival conventions, and the one the estate writes down is not the one it actually uses.**

| | The written rule | What the data does |
|---|---|---|
| Method | Swap in a narrower known-side word ("whether" for "if") | Bolt a parenthetical onto the prompt ("that (feminine demonstrative)") |
| Where it's stated | The Ralph methodology doc, explicitly | Nowhere — no doc describes it |
| Volume | ~340 drill rows estate-wide | ~4,030 card rows + ~2,500 drill rows |
| Machine-checkable | Yes, satisfies the ZUT gate | Yes, satisfies the ZUT gate |
| Survives to audio | Yes | **No — it gets read aloud to the learner** |

The parenthetical wins on volume roughly 10:1. The synonym swap wins on doctrine, and it is the only one of the
two that does not break when the prompt is spoken. That tension is the single most important thing in this report.

**One number matters more than any other: of 2,766 seed sentences in the estate containing "if" or "whether",
exactly 0 contain "whether".** The seed layer is uniformly natural English. Every instance of "whether" in the
estate lives on a card or a drill. So the constraint Kai set — seed text must not change — is not a restriction
a fix has to work around. It is already, without exception, how the existing precedent was built.

---

## 1. The conventions, and how widespread each is

Signals I searched on the known side: parenthetical, square bracket, slash, "as in", and narrowed synonyms.

### Estate totals

| Convention | Lego cards | Drill prompts | Courses |
|---|---|---|---|
| Parenthetical / bracket | 4,030 (4.3% of cards) | 2,747 (0.6% of drills) | 58 |
| Slash | 3,624 (3.9%) | 2,384 (0.5%) | 55 |
| "as in" | 0 | **1** | 1 |
| Narrowed synonym ("whether") | 12 | ~340 | 9 cards / 34 drills |

**"as in" is dead.** One row in 820,072. It is not a candidate convention — and the estate deliberately killed
it: a scoping doc from 2026-08-06 costed removing the "as in" clause from spoken intros across 82 courses.
Do not revive it.

### The parenthetical splits in two, and only one half is usable

Reading the actual strings, parentheticals are doing two completely different jobs:

**(a) Grammatical form annotation** — tells you which *form*, not which *meaning*:
> `able(fut-1sg)` · `ask(inf-obl)` · `answer(m)` · `about(postposition)` · `must (1pl)` ·
> `helped (masc past)` · `nothing (gen)` · `my (prep masc)` · `known (past part)`

**(b) Sense or register hint** — tells you which *meaning*, in learner-facing English:
> `to ride/travel (by vehicle)` · `glass (vessel)` · `thank you (for a gift)` · `for (duration)` ·
> `through (passing through)` · `how are you (formal)` · `do you want (formal)` · `to say (in order to)` ·
> `work/job (noun)` · `you had / you spent (time)` · `have finished (or not)` · `let's (informal)`

Only (b) is a disambiguating gloss in the sense we are hunting. (a) is grammar metadata, which the methodology
doc separately and explicitly forbids on cards.

**Kill count.** I classified all 4,030 parenthetical card rows with a mechanical rule (does every word inside
the brackets come from a closed list of ~60 grammatical tags). That rule called 1,935 jargon and 2,095 prose.
I then hand-read a 40-row spread of the "prose" bucket and found it still leaks: 24–28 of the 40 were really
grammatical annotation wearing prose clothes (`busy (f short)`, `to give (impf inf)`, `much/great (masc strong
nom)`, `my key(s)`). **Corrected estimate: roughly 1,200–1,600 of the 4,030 parenthetical rows are genuine
sense-disambiguating glosses — so I am killing about 60–70% of the raw hit count.** I am giving a range, not a
point estimate, because the boundary is a judgement call and I read 40 rows, not 4,030.

### Slashes are not a fix — they are the defect in miniature

3,624 card rows and 2,384 drill rows contain a slash. Almost every one I read *widens* the prompt instead of
narrowing it:

> `father / dad` · `true / correct` · `news / messages` · `all/both` · `he/she` · `at/to` · `need to / must` ·
> `I get / to get` · `you get/take` · `it is / to be`

A card reading `father / dad` teaches two known prompts for one target answer, which is harmless (that is the
reception direction). But `I get / to get` and `it is / to be` hand the learner two *different intentions* on one
card. **I killed the slash convention entirely as a disambiguation precedent — all ~6,000 rows.** It is worth
flagging separately that a slash card is arguably the same defect running backwards, and nobody is counting them.

### Where the gloss actually sits

| Drill role | Rows | With a parenthetical | Rate |
|---|---|---|---|
| component (word-level) | 84,853 | 1,056 | 1.24% |
| build | 284,351 | 1,007 | 0.35% |
| use (full sentence) | 450,868 | 441 | 0.10% |

Parenthetical glosses concentrate on **component** drills — the word-level rows that mirror the lego card. Full
sentence drills are almost untouched. The German `ob` precedent is the opposite shape: it is a whole-sentence
rewording. So the two conventions do not even land in the same place.

### House style by volume, per course

Courses leading on learner-facing prose hints (cards):

| Course | Prose hints | Grammar tags |
|---|---|---|
| tel_for_eng | 572 | 250 |
| nep_for_eng | 252 | 130 |
| eus_for_spa | 130 | 5 |
| est_for_eng | 95 | 80 |
| fas_for_eng | 95 | 62 |
| rus_for_eng | 91 | 330 |
| hin_for_eng | 80 | 154 |
| swa_for_eng | 72 | 35 |
| bul_for_eng | 58 | 53 |

(Prose column carries the 60–70% leak described above — treat as an upper bound.)

**`eus_for_spa` is the cleanest exemplar by ratio: 130 prose hints to 5 grammar tags.** `bul_for_eng` is the
cleanest by readability — its hints are written as natural English asides rather than codes.

---

## 2. "whether" versus "if", per course

**Cards.** 12 rows across 9 courses gloss something as `whether`. 81 rows across 48 courses still gloss with a
bare or hinted `if`.

Exact card strings, verbatim:

| Wording | Rows | Courses |
|---|---|---|
| `whether` | 10 | ben, deu_at, deu, eus, hye, jpn, kor, nan (all _for_eng) |
| `whether (if...or not)` | 1 | nep_for_eng |
| `whether [someone] knows` | 1 | jpn_for_eng |

**Drills.** 34 courses have at least one drill using "whether"; 30 more have "if" drills and zero "whether".

| Course | "whether" drills | "if" drills | % whether |
|---|---|---|---|
| hak_for_eng | 48 | 426 | 10% |
| tur_for_eng | 47 | 222 | 17% |
| kor_for_eng | 44 | 461 | 9% |
| tel_for_eng | 34 | 243 | 12% |
| jpn_for_eng | 33 | 478 | 6% |
| deu_at_for_eng | 23 | 264 | 8% |
| deu_for_eng | 22 | 488 | 4% |
| ben_for_eng | 20 | 141 | 12% |
| deu_ch_for_eng | 13 | 326 | 4% |
| nan_for_eng | 13 | 210 | 6% |
| gle_for_eng | 11 | 209 | 5% |
| fas_for_eng | 11 | 134 | 8% |
| ara_for_eng | 10 | 421 | 2% |
| zho_for_eng | 9 | 216 | 4% |
| yue_for_eng | 9 | 125 | 7% |
| nep_for_eng | 7 | 135 | 5% |
| pol_for_eng | 6 | 196 | 3% |
| srp_for_eng | 4 | 88 | 4% |
| isl_for_eng | 3 | 119 | 2% |
| fin, heb | 2 each | 304 / 209 | 1% |
| 14 more courses | 1 each | 95–612 | ≤1% |

**Zero "whether" at all, in drills or cards** — includes fra_for_eng, fra_ca_for_eng, por_for_eng,
por_br_for_eng, ita_for_eng, spa_for_eng (1 drill only), cym_n, cym_s, ces, ell, mlt, hrv, cat, hun, ron, lit,
lav, swe, nor, nld, afr, glg, est, bul, gla, dan, ukr, tha, hin.

**Narrowed to the target word, German.** This is the precedent Kai named, confirmed:

| Course | drills whose target contains `ob`, prompted "whether" | prompted "if" |
|---|---|---|
| deu_at_for_eng | 23 | 75 |
| deu_for_eng | 20 | 243 |
| deu_ch_for_eng | 0 | 13 |

Austrian German is the furthest along in the estate at 23%. Standard German sits at 8%.

Verbatim examples of the pattern working, from deu_for_eng:
> `she needs to think about whether to sell the company` → `sie muss bedenken, ob sie die Firma verkaufen muss`
> `I'm not sure whether I can practise speaking a little today` → `Ich bin mir nicht sicher, ob ich heute ein bisschen sprechen üben kann`
> `nobody asked whether she was near` → `niemand hat gefragt, ob sie in der Nähe war`
> `I don't care whether` → `Es ist mir egal, ob`

Note the last one is a bare component drill — the convention already reaches both drill roles.

---

## 3. The twelve ambiguous prompts — every disambiguating string in the estate

Card headword census first (after stripping a leading "to/the/a" and any bracketed hint):

| Prompt | Card rows | Courses | With a hint | With a slash |
|---|---|---|---|---|
| you | 105 | 43 | 43 | 1 |
| when | 98 | 53 | 12 | 0 |
| that | 96 | 46 | 35 | 0 |
| if | 81 | 48 | 9 | 2 |
| know | 78 | 45 | 17 | 0 |
| there | 60 | 42 | **2** | 0 |
| this | 56 | 36 | 16 | 0 |
| be | 48 | 37 | 11 | 0 |
| could | 26 | 20 | 7 | 0 |
| some | 22 | 18 | 4 | 0 |
| whether | 12 | 9 | 2 | 0 |
| would | 9 | 8 | 2 | 0 |
| any | 8 | 6 | **0** | 0 |

Read the "with a hint" column as coverage. **`there` (2 of 60) and `any` (0 of 8) are almost entirely
undisambiguated across the estate.** `you` is the best covered at 43 of 105.

Below, every distinct disambiguating string, verbatim. **122 distinct strings in total — and almost none repeat.**
The most-reused string in the whole catalogue appears in 4 courses. There is no convergent house wording.

### to know — the cleanest precedent in the estate

| Wording | Courses |
|---|---|
| `to know (a person)` | afr, dan, hak, tha |
| `to know (a fact)` | nor, yue |
| `to know (someone)` | nep |
| `know (someone)` | dan |
| `know (a person)` | nor |
| `to know (fact)` | nan |
| form-tags (killed): `know(inf)`, `know(hab m)`, `know(present m)`, `know (infinitive)`, `know (1pl)`, `know (2sg)` | hin, swe, isl, ukr |

**`to know (a fact)` / `to know (a person)` is the single strongest precedent in the estate** — the exact
fact-versus-person split, six courses, consistent wording, learner-facing English. If anything is house style,
this is it. 39 of 45 courses have done nothing.

### when

| Wording | Courses |
|---|---|
| `when (temporal)` | afr, nep, nor, tha |
| `when (question)` | afr, bul, gle |
| `when (interrogative)` | fas, lit |
| `when (conj)` | srp |
| `when (past)` | dan |
| `when (corr)` | mar |

Two rival wordings for the same distinction: `(temporal)` vs `(question)` in one camp, `(interrogative)` in
another. 47 of 53 courses have done nothing.

### that

The largest and messiest set — 25 distinct strings. Grouped:

| Wording | Courses |
|---|---|
| `that (feminine demonstrative)` | bul, ron, srp, ukr |
| `that (conjunction)` | afr, nep, swa |
| `that (masculine demonstrative)` | bul, ron, srp |
| `that (demonstrative)` | swe, ukr |
| `that (pronoun)` | rus, swa |
| `that (stronger conjunction)` | lit |
| `that (subjunctive)` | cat |
| `that (quote)` | tur |
| `that (one)` | fas |
| `that (it)` | hye |
| `that (house)` | hak |
| `that (near-distant demonstrative)` | srp |
| plus 13 pure case/gender tags (killed) | rus, mlt, cat, tel, hin, ara |

The useful distinction — demonstrative versus conjunction — is present but expressed six different ways.

### you

28 distinct strings, dominated by case and register:

| Wording | Courses |
|---|---|
| `to you (dative)` | heb, nep, tel, ukr |
| `you (formal)` | deu_ch, fin, fra_ca |
| `you (emphatic)` | gla, mlt, ron |
| `you (object)` | heb, mlt, tel |
| `you (pl) work` | ron, srp, ukr |
| `you (plural)` | nor |
| `you (sir)` | deu_ch |
| `you (subject)` | tel |
| `you (about something)` | dan |
| plus `you (acc)`, `you (accusative)`, `you(ergative)`, `you(oblique)`, `you (of you)`, `you (to you)`, `you (kes)`, `you (on)`, `you (with)`, `you (obj)`, `to you (dat)`, `to you (dative clitic)`, `to you (formal dative)`, `to you(formal)`, `you (formal ergative)`, `you (formal plural)`, `you (ergative/agent)`, `you (formal dative)`, `you (plural) work` | various |

**`you (formal)` / `you (plural)` is the one learner-facing pattern here** — the T/V distinction, which collides
in most European languages. Only 4 courses of 43 use it.

### to be

Every single one is a form tag, not a sense split:
> `to be (infinitive)` (cat, swe) · `to be (contracted)` (cat) · `to be (I future)` (bul) · `to be (inf)` (rus) ·
> `to be (infin)` (srp) · `to be (ma-inf)` (est) · `to be (subj)` (srp) · `to be (subjunctive)` (bul) ·
> `be (subjunctive)` (hin) · `be(v)` (hin)

**Explicit gap: the estate has no precedent whatsoever for the permanent-versus-temporary "to be" split**
(Spanish ser/estar, Portuguese, Catalan, Irish). I searched for wordings like "to be (permanent)" and found
none, in any course. 37 courses carry a `be` card; 0 disambiguate it by sense.

### if

| Wording | Courses |
|---|---|
| `if (conditional)` | nep, rus |
| `if (conditional marker)` | nep |
| `if (present/future condition)` | ara |
| `if (question particle)` | rus |
| `if (colloquial)` | fas |
| `if (I) didn't get to / if not` | nep |
| `if (she) wanted to` | nan |
| `if [one] wants` | zho |

Note this is a **third** approach to the if/whether problem — parenthesising `if` rather than swapping in
`whether`. Two courses (nep, rus) do both. `zho_for_eng` is the only user of square brackets as a hint carrier.

### this / there / could / would / some / any — thin or absent

- **this** — 15 strings, all gender/case tags except `this (tonight)` (swa) and `this (demonstrative)` (tha).
- **there** — only 2 in the whole estate: `there (that place)` (cat), `there (distal location)` (tel).
  Nothing anywhere splits existential "there is" from locative "over there".
- **could** — 7 strings, all form tags: `could (past)` (swe), `could (formal)` (deu_ch),
  `could (1st person conditional)` (isl), `could (conditional 3sg)` (est), `could (3sg f past)` (rus),
  `could (fem past)` (ukr), `could (n)` (mar). No ability-versus-permission split anywhere.
- **would** — 2: `would (conditional particle)` (rus), `would (f)` (mar).
- **some** — 4: `some (a few)` (tel) is the only meaning-bearing one; `some (neut)`, `some (adj)`, `some (f)` are tags.
- **any** — **0. Nothing in the estate has ever disambiguated "any".**

---

## 4. The written rule — it exists, and it picks the synonym

**Yes, there is a written rule, and it is specific.** From the Ralph methodology doc, section "ZUT (Zero
Uncertainty Test)", quoted verbatim:

> Same KNOWN → same TARGET. Always.
>
> **ZUT runs in the production direction, on intentions.** One intention (KNOWN) → one form (TARGET), so the
> generating learner never forks.

and its prescribed remedy, verbatim, under the heading **"Fix: Use Different Natural Phrases"**:

> ```
> Seed 10: "I know" → 알아요
> Seed 45: "I know about it" → 알고 있어요  ✓ Different KNOWN = OK
> ```
>
> The context disambiguates - no explanations needed. The learner infers the distinction.
>
> Other options: use synonyms like "understand" or "be aware of" for one meaning.

It even names our exact problem words, under **"Problem Verbs to Watch — these verbs often have multiple
translations. Disambiguate through natural phrasing"**:

> remember / recall / keep in mind · know / understand / be aware of · think / believe / consider ·
> see / meet / notice · feel / sense / seem

And the same doc rules the parenthetical out, twice:

> **Glosses are honest and whole-intention.** No mis-glosses, no surface-word particle labels, **no grammar
> metadata**. The known side names the *whole communicative intention*.

> **A debut must hand the learner a producible intention, never a grammar label.** … Glosses name the *whole
> communicative intention*; never grammar metadata.

It also pre-authorises the unnatural-but-unambiguous prompt, which is exactly what "whether" is:

> The English prompt is **not** free natural English — it is a designed, controlled language. … Slightly stilted
> but tileable English is **correct** — it is the known-side mirror of "ZUT over naturalness".

**So the rule reads: disambiguate by re-wording the known side into a different natural phrase or a narrower
synonym; do not bolt on an explanation.** The 1,200–1,600 parenthetical glosses in the estate are, on a strict
reading of the doc, all off-doctrine — and the ~4,000 grammar tags flatly violate it.

**But the rule stops one step short of what a fix needs.** It says *use a synonym*; it does not say *which*
synonym, does not give a preferred string per problem word, and does not say what to do when the natural phrase
is already taken. There is no "if → whether" line anywhere. The German `ob` work invented that mapping and no
document records it. **Distinguishing the two clearly: there is a rule that ambiguity is forbidden. There is no
rule about how to word the gloss that fixes it.**

### What is checked automatically

The course-builder API enforces ZUT on submission, and the enforcement is real:

- A **lego** whose known→target conflicts with an established mapping is a hard reject — nothing inserts.
  The error is `ZUT violation: "<known>" already maps to "<target>"`.
- A **practice phrase** that collides is held out individually — never inserted, the rest of the seed saves.

**Two important limits.** First, the comparison normaliser lowercases and strips punctuation but **does not
strip parentheses or slashes**. So `if (conditional)` is a different key from `if`, and a parenthetical is a
mechanically sufficient ZUT escape — which is very likely *why* the parenthetical convention grew: it is the
cheapest way past the gate. A synonym swap passes equally well, so the gate does not constrain the choice
either way.

Second, the gate only fires **at submission time**. Every collision described here is in content already
inserted. Nothing re-checks the estate. **No automated check exists today that would find these — they were
found by hand, and a fix would have to be verified by hand too.**

### The complication nobody should ignore

A separate diagnosis from 2026-08-06 established that parentheticals in the known side **get spoken aloud to
the learner**. A Greek intro stored as `The Greek for: 'to answer (I, aorist)', is:` was voiced, per the TTS
engine's own per-word timing record, as *"The Greek for : 'to answer ( I , aorist )', is :."* — brackets and all.
That was a real forum complaint. Greek was cleaned; the same doc records that **tel_for_eng (822 rows),
rus_for_eng (421) and nep_for_eng (382) still carry the tags in the card text itself**, where every re-render
reproduces them, and that ~4,911 tagged intros remain across 43 courses.

**This is decisive for choosing between the two conventions.** The parenthetical is the high-volume convention,
but it is also an active, known defect with a live cleanup campaign against it. The synonym swap has no such
problem: "whether" is a word, it speaks correctly, and it costs nothing at audio time. A fix built on
parentheticals would be adding rows to a pile someone else is currently shovelling.

---

## Gaps and limits, stated plainly

- **The 60–70% kill rate on parentheticals is an estimate from a 40-row hand read**, not a full classification.
  The true figure could reasonably sit anywhere in 55–75%. Classifying all 4,030 by hand is a day's work and I
  did not do it.
- **I did not check non-English known languages properly.** 78 of 145 courses are English-known and carry
  essentially all the precedent. The Japanese-known (15), Chinese-known (14) and Welsh-known (9) families showed
  almost no parenthetical signal at all — 1 row each in three of them — but I did not read their known-side text,
  because I cannot read it. **Whether those families disambiguate by some convention invisible to a
  bracket-and-slash search is unknown and untested.**
- **I did not verify that any of the 122 glosses is correct.** As instructed, no ruling on target words.
- 19 courses in the `courses` table have no rows in `course_legos` at all, so they carry no precedent either way.
- The 820,072-row drill table hits statement timeouts on ordered reads; all my drill figures come from aggregate
  queries, which are unaffected.

---

## What a fix would copy

If the decision is to follow the written rule, the estate already supplies the strings:

| Prompt | Copy this | Precedent |
|---|---|---|
| if (indirect question) | `whether` | 8 courses on cards, 34 in drills, 0 in seeds |
| know (a fact vs a person) | `to know (a fact)` / `to know (a person)` | 6 courses, consistent |
| you (formal vs plural) | `you (formal)` / `you (plural)` | 4 courses |
| when (question vs temporal) | `when (question)` / `when (temporal)` | 7 courses, two rival wordings |
| that (conjunction vs demonstrative) | `that (conjunction)` / `that (demonstrative)` | 5 courses, six rival wordings |
| to be, there, could, would, any | **nothing exists — would have to be invented** | 0 |

The first row is the only one that is a pure synonym swap, needs no brackets, and survives being spoken. It is
also the one with a working, shipped, never-rolled-out implementation sitting in German today.

---

no commits
