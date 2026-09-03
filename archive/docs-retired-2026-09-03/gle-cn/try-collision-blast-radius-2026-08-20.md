# "try" collision map and blast radius — gle_cn_for_eng

Measurement job only. Read-only: zero rows modified, zero TTS spend. Course state as queried 2026-08-20 via `scripts/q-try.cjs` against `.env.psql`. Course is 36/668 seeds translated (course_legos: 47 rows, course_practice_phrases: 368 rows, course_audio: **0 rows** — verified, see §4).

---

## (1) Every row that currently renders "try"

### English side — word-boundary `\y(try|tries|tried|trying)\y`

| Table | Count |
|---|---|
| course_seeds | 22 |
| course_legos | 3 |
| course_practice_phrases | 46 |

**All 22 course_seeds rows** (matches the seed-number list given in the brief exactly). Only seeds 2, 6, 7, 8 have been translated so far; the other 18 have `target_text = ''`:

| seed | known_text | target_text |
|---|---|---|
| 2 | I'm trying to learn | Tá mé ag iarraidh foghlaim |
| 6 | I'm trying to remember a word | Tá mé ag iarraidh cuimhneamh ar fhocal |
| 7 | I want to try as hard as I can today | Tá mé ag iarraidh mo dhícheall a dhéanamh inniu |
| 8 | I'm going to try to explain what I mean | Tá mé chun iarracht a dhéanamh céard atá i gceist agam a mhíniú |
| 50 | I'm not trying to finish as quickly as possible | *(untranslated)* |
| 102 | we're trying to say that it's not like that | *(untranslated)* |
| 103 | we're not trying to hear many more words | *(untranslated)* |
| 140 | I'm sorry that I can't see what you're trying to show me | *(untranslated)* |
| 146 | nothing seems to be working since we tried to fix it | *(untranslated)* |
| 159 | That isn't what I'm trying to say | *(untranslated)* |
| 195 | I'm trying to find the money I left on the table | *(untranslated)* |
| 205 | I've forgotten the word I was trying to say | *(untranslated)* |
| 213 | we don't know what they're trying to achieve | *(untranslated)* |
| 222 | he's trying to tell me what he wants | *(untranslated)* |
| 226 | the man is trying to help me | *(untranslated)* |
| 236 | I know someone who said that she was going to try to help | *(untranslated)* |
| 372 | Did you see what she was trying to create? | *(untranslated)* |
| 407 | shouldn't we try to set a good example? | *(untranslated)* |
| 491 | I love the way you try to help | *(untranslated)* |
| 541 | it's a good idea to try and breathe slowly | *(untranslated)* |
| 579 | we've often tried | *(untranslated)* |
| 638 | I'm trying to think | *(untranslated)* |

**The 3 course_legos rows:**

| seed | lego_index | known_text | target_text | type |
|---|---|---|---|---|
| 2 | 1 | I'm trying | tá mé ag iarraidh | M |
| 7 | 1 | to try as hard as I can | mo dhícheall a dhéanamh | A |
| 8 | 1 | to try | iarracht a dhéanamh | A |

**All 46 course_practice_phrases rows**, spread across seeds 2, 3, 4, 6, 7, 8, 13, 15, 25:

- Seed 2 (7 rows): "I'm trying to speak Irish with you"→"tá mé ag iarraidh Gaeilge a labhairt leat"; "I'm trying to speak Irish"→"tá mé ag iarraidh Gaeilge a labhairt"; "trying"→"ag iarraidh" (component); "I'm trying to learn"→"tá mé ag iarraidh foghlaim"; "I'm trying to learn now"→"...anois"; "I'm trying to speak Irish with you now"→"...anois"; "I'm trying to speak Irish now"→"...anois"
- Seed 3 (2 rows): "I'm trying to learn as often as possible"→"Tá mé ag iarraidh foghlaim chomh minic agus is féidir"; "I'm trying to learn how to speak Irish"→"Tá mé ag iarraidh foghlaim cén chaoi Gaeilge a labhairt"
- Seed 4 (2 rows): "I'm trying to learn how to say something"→"...cén chaoi rud eicínt a rá"; "...in Irish"→"...i nGaeilge"
- Seed 6 (4 rows): "I'm trying to remember a word now/how to learn.../a word/as often as possible"→"tá mé ag iarraidh cuimhneamh ar fhocal..." variants
- Seed 7 (11 rows): all "I want to try as hard as I can..." / "I'm going to try as hard as I can..." variants → "tá mé ag iarraidh mo dhícheall a dhéanamh..." / "tá mé chun mo dhícheall a dhéanamh..."
- Seed 8 (16 rows): all "I'm going to try..." / "to try..." variants → "tá mé chun iarracht a dhéanamh..." / "iarracht a dhéanamh..."; plus "I'm trying to explain what I mean in Irish"→"tá mé ag iarraidh céard atá i gceist agam a mhíniú i nGaeilge"
- Seed 13 (3 rows): builds combining seeds 1/2/7 material, e.g. "you have very good Irish. I want to try as hard as I can today"→"Tá Gaeilge mhaith agat. Tá mé ag iarraidh mo dhícheall a dhéanamh inniu"
- Seed 15 (3 rows): further combination builds, e.g. "I'd like to be able to speak Irish and I want to try as hard as I can today"→"ba mhaith liom a bheith in ann Gaeilge a labhairt agus tá mé ag iarraidh mo dhícheall a dhéanamh inniu"
- Seed 25 (1 row): "are you going to try"→"an bhfuil tú chun iarracht a dhéanamh"

### Irish side — accent-insensitive search for candidate stems

| stem | course_seeds | course_legos | course_practice_phrases |
|---|---|---|---|
| iarracht | 1 | 1 | 13 |
| iarraidh | 17 | 2 | 82 |
| triail / triall / traiail | 0 | 0 | 0 |
| féach / fhéach family | 0 | 0 | 0 |
| dícheall (`cheall`) | 1 | 1 | 12 |

`ag triail`/`triail`/`traiail` (the banned form) is confirmed **absent, course-wide, in all three tables** — the ban is currently being honoured. `féach`/`feachaint` is also entirely absent (see §2 for why that's not yet informative).

---

## (2) The collision map

### What this course currently teaches for LOOK / SEE / WATCH / WANT / DO-MAKE / GIVE / BEST-EFFORT

Searched known_text (English, word-boundary, all tense forms) and target_text (Irish, accent-stripped, including `féach`, `feiceáil`, `breathnaigh`, `amharc`, `tabhair`/`tabhairt`, `déan`/`dhéanamh` stems) across course_legos and course_practice_phrases.

| concept | taught anywhere in gle_cn_for_eng so far? | quote |
|---|---|---|
| LOOK | **No** — 0 rows | — |
| SEE | **No** — 0 rows | — |
| WATCH | **No** — 0 rows | — |
| WANT | **Yes** — seed 1 | lego: "I want" → "tá mé ag iarraidh"; practice: "want"→"ag iarraidh", "I want to speak Irish"→"tá mé ag iarraidh Gaeilge a labhairt" |
| DO/MAKE | **No independent lego** — `-eanamh` (déan root) only appears *inside* the seed-7/seed-8 try phrases ("mo dhícheall a **dhéanamh**", "iarracht a **dhéanamh**"); no standalone "do"/"make" lego exists yet |
| GIVE | **No** — 0 rows (`tabhair`/`tabhairt` stem: 0 hits anywhere) | — |
| BEST/EFFORT | **No standalone lego** — "mo dhícheall" (my best) and "iarracht" (an effort/attempt) exist only bound inside the seed-7/seed-8 try phrases | — |

**This is the crucial finding the brief asked for:** because LOOK, SEE, WATCH and GIVE are not taught *anywhere yet* in gle_cn_for_eng (only 36/668 seeds are translated), `féach le` / `feachaint le` and `tabhair faoi` currently have **zero collision surface** in the live data. That is a fact about *today's state*, not a guarantee — those concepts will need translating eventually, and at that point `féach` (candidate for "try") and `féach`/`feiceáil`/`breathnaigh` (candidates for look/see/watch) would compete for the same headword family. Flagging as a **forward risk**, not a current clash.

### (a) Exact-string clash with a different existing meaning

- **`ag iarraidh`** is the one live clash: it is simultaneously the seed-1 rendering of **WANT** ("I want") and the seed-2 rendering of **TRYING** ("I'm trying"). Full detail and row counts in §3 (ZUT check) below.
- **`iarracht a dhéanamh`** (seed 8, "to try") and **`mo dhícheall a dhéanamh`** (seed 7, "to try as hard as I can") are each used for exactly one meaning apiece — no exact-string collision found elsewhere in the course.

### (b) Near-homographs / near-homophones

- **iarraidh vs iarracht**: distinct strings (verbal-noun of *iarr* "to want/ask" vs the noun "an attempt"), so no string-identity ZUT violation — but they are etymologically the same root and a learner meeting both for "try"-family meanings inside two seeds apart (7 and 8) is exactly the kind of near-miss the brief calls out. Confirmed as two administratively separate legos, not a merge-worthy duplicate.
- **triail / triall / traiail**: all zero occurrences course-wide (checked individually, accent-insensitive). No collision because the banned form and its near-neighbours (triall = "journey/proceed", a real distinct word) are simply not present yet.
- **féach vs feiceáil vs breathnaigh vs amharc**: all four LOOK/SEE/WATCH candidates return **zero** hits course-wide. No current collision (see forward-risk note above).
- **dícheall**: single family, no near-homograph found in the loaded vocabulary.

### (c) English gloss already assigned to something else

- "want" is assigned to `ag iarraidh` (seed 1) — the same target already claimed by "trying" (seed 2). This is the one live gloss collision; see §3.
- No other English gloss in the try/want/effort field is currently double-assigned.

---

## (3) ZUT check

Restricted to the try/want/effort semantic field, checked at lego level, practice-phrase level, and component level (component rows exist for seeds 1 and 2 only in this field — seeds 7 and 8 have no `components` populated).

**Same English → two different Irish targets:** none found in this field, at any granularity.

**Two different English → one Irish target:** exactly one underlying pair, recurring across granularities because seed 1 and seed 2 build on each other:

| granularity | target_text | known_texts sharing it | seeds |
|---|---|---|---|
| component | `ag iarraidh` | "want", "trying" | 1, 2 |
| lego | `tá mé ag iarraidh` | "I want", "I'm trying" | 1, 2 |
| practice | `ag iarraidh` | "want", "trying" | 1, 2 |
| practice | `tá mé ag iarraidh Gaeilge a labhairt` | "I want to speak Irish", "I'm trying to speak Irish" | 1, 2 |
| practice | `tá mé ag iarraidh Gaeilge a labhairt anois` | "...now" / "...now" | 1, 2 |
| practice | `tá mé ag iarraidh Gaeilge a labhairt leat` | "...with you" / "...with you" | 1, 2 |
| practice | `tá mé ag iarraidh Gaeilge a labhairt leat anois` | "...with you now" / "...with you now" | 1, 2 |

Total: **7 rows** (1 lego + 1 component-pair-worth-2-rows counted once + 5 further practice-phrase pairs) instantiate the single WANT=TRYING collision. This is the only ZUT hit in the field, but it is a genuine, already-live one: seeds 1 and 2 currently teach the learner that "I want" and "I'm trying" are the identical Irish string.

No other duplication (e.g. between "want to try" in seed 7 and "want" in seed 1, or between seed 7/seed 8's two different try-forms) produces a same-target collision — seed 7 and seed 8 use visibly different Irish (`mo dhícheall a dhéanamh` vs `iarracht a dhéanamh`) for visibly different English framings, so ZUT holds *between* seeds 7 and 8, just not between seeds 1 and 2.

---

## (4) Blast radius per option

**course_audio rows for gle_cn_for_eng: 0 — verified by direct count.** No change below costs any TTS spend or touches any audio row, because there is no audio yet for this course.

| scenario | course_seeds rows | course_legos rows | course_practice_phrases rows | course_audio rows |
|---|---|---|---|---|
| **(A) leave as-is** | 0 | 0 | 0 | 0 |
| **(B) `ag iarraidh` single form everywhere; delete seed-8 `iarracht a dhéanamh` lego** | 1 (seed 8) | 1 (deleted) | 13 (12 in seed 8 + 1 in seed 25, which reuses the seed-8 lego) | 0 |
| **(C) replace `iarracht a dhéanamh` with a shorter form, seed 8 only** | 1 (seed 8) | 1 (seed 8) | 12 (seed 8 only) | 0 |
| **(D) also replace `mo dhícheall a dhéanamh` (seed 7)** | +1 (seed 7) | +1 (seed 7) | +12 (10 in seed 7 + 2 in seeds 13/15, which build on seed 7) | 0 |

Detail behind (C)/(D):
- `iarracht` total occurrences course-wide: 1 seed + 1 lego + 13 practice = **15 rows**. Of the 13 practice rows, 12 sit under seed 8 itself and **1 sits under seed 25** ("are you going to try" → "an bhfuil tú chun iarracht a dhéanamh") — a build/use phrase that reuses the seed-8 form but is filed three seeds later. A "seed 8 only" edit (scenario C) would leave that seed-25 row inconsistent with the rest of the course unless it is also touched — flagging this as a **coordination gap in the "seed 8 only" framing**, not something I'm recommending a fix for.
- `dícheall` total occurrences course-wide: 1 seed + 1 lego + 12 practice = **14 rows**. Of the 12 practice rows, 10 sit under seed 7 itself and **2 sit under seeds 13 and 15**, which are combination-build phrases layering seed 7's material onto earlier seeds.
- Combined (C)+(D) together: 28 rows total (15 + 14, no overlap between the two families).

`ag iarraidh` itself (the WANT/TRYING form) totals 17 seeds + 2 legos + 82 practice = 101 rows course-wide — but scenario B's "single form everywhere" language, read literally, would only require *touching* the 15 `iarracht`-bearing rows above (rewriting them onto the already-existing `ag iarraidh` form); it would not require editing the 101 rows that already say `ag iarraidh`.

---

## (5) The released course (gle_for_eng) for comparison

Matched by exact English text, since seed numbering differs between courses. All 22 of the brief's English seeds found an exact English-text match in gle_for_eng:

| known_text | gle_for_eng target_text |
|---|---|
| I'm trying to learn | Tá mé **ag triail** foghlaim |
| I'm trying to remember a word | Tá mé **ag triail** focal a chuimhneamh |
| I want to try as hard as I can today | Tá mé ag iarraidh mo dhícheall a dhéanamh inniu |
| I'm going to try to explain what I mean | Tá mé chun **triail** a mhíniú cad atá i gceist agam |
| I'm not trying to finish as quickly as possible | Níl mé ag iarraidh críochnú chomh tapa agus is féidir |
| we're trying to say that it's not like that | Tá muid ag iarraidh a rá nach bhfuil sé mar sin |
| we're not trying to hear many more words | Níl muid ag iarraidh go leor focal eile a chloisteáil |
| I'm sorry that I can't see what you're trying to show me | Tá brón orm nach féidir liom feiceáil cad atá tú ag iarraidh a thaispeáint dom |
| nothing seems to be working since we tried to fix it | Ní cosúil go bhfuil aon rud ag obair ó d'iarr muid é a dheisiú |
| That isn't what I'm trying to say | Ní hé sin atá mé ag iarraidh a rá |
| I'm trying to find the money I left on the table | Tá mé ag iarraidh an t-airgead a d'fhág mé ar an mbord a fháil |
| I've forgotten the word I was trying to say | Tá dearmad déanta agam ar an bhfocal a bhí mé ag iarraidh a rá |
| we don't know what they're trying to achieve | Níl a fhios againn cad atá siad ag iarraidh a bhaint amach |
| he's trying to tell me what he wants | Tá sé ag iarraidh insint dom cad atá uaidh |
| the man is trying to help me | Tá an fear ag iarraidh cabhrú liom |
| I know someone who said that she was going to try to help | Tá aithne agam ar dhuine a dúirt go raibh sí chun **iarraidh** cabhrú |
| Did you see what she was trying to create? | an bhfaca tú cad a bhí sí ag iarraidh a chruthú? |
| shouldn't we try to set a good example? | nach cheart dúinn **iarraidh** dea-shampla a thabhairt? |
| I love the way you try to help | is breá liom an chaoi a **n-iarrann** tú cabhrú |
| it's a good idea to try and breathe slowly | is smaoineamh maith é **iarraidh** análú go mall |
| we've often tried | Tá muid tar éis **iarraidh** go minic |
| I'm trying to think | Tá mé ag iarraidh smaoineamh |

**Notable finding:** gle_for_eng, the *live released* standard-Irish course, uses **`ag triail`/`triail`** — the exact form gle_cn_for_eng has banned — in 3 of these 22 rows ("I'm trying to learn", "I'm trying to remember a word", "I'm going to try to explain what I mean"). The remaining 19 rows use `ag iarraidh` (predominant, 15 rows) or bare `iarraidh`/`n-iarrann` as a present-tense verb form (4 rows). `iarracht` and `dícheall` do not appear at all in this set from gle_for_eng.

### Legacy translation memory: `scripts/en-ga-compare/en-ga.json`

This file is **not** a flat English→Irish lookup — it's a nested course export (511 seeds, introduction/encouragement audio scripts plus a seed tree with `known.text`/`target.text` node pairs). Extracted all 15,850 unique known/target pairs and searched for `\b(try|tries|tried|trying)\b`.

- **199 rows** match the try-family in English, across the whole legacy corpus (not seed-restricted, since this TM has a different, older 511-seed structure with no stable seed-number correspondence to gle_cn's 668).
- Of those 199: **124 use `ag triail`/`triail`** (the banned form — 62% of all legacy try-renderings), **66 use `ag iarraidh`**, **23 use `iarracht`**, **0 use `dícheall`**, **0 use `féach`**.
- Exact English-text matches against the brief's 22 seeds: only **3 of 22** exist verbatim in this older, smaller corpus (the seed sets have diverged):

| known_text | legacy en-ga.json target |
|---|---|
| Did you see what she was trying to create? | an bhfaca tú céard a bhí sí ag iarraidh a chruthú? |
| I love the way you try to help | is aoibhinn liom an chaoi a ndéanann tú **iarracht** cabhrú |
| we've often tried | bhíomar **ag triail** go minic |

**Reading this legacy corpus should carry a warning, not a recommendation**: it is dominated by the banned `ag triail` form (124/199), so its weight of evidence points the opposite direction from the course's own standing ban — treat it as historical usage data, not as a precedent to follow.

---

## Explicit gaps

- None of the five deliverables required sampling or estimation — every count above is exhaustive (`SELECT count(*)`, no `LIMIT`). No gap to report on completeness of counts.
- One judgment call flagged, not resolved: whether the legacy `en-ga.json` corpus (62% `ag triail`) should carry any weight given it uses the banned form more than any other. Left to whoever rules on this — not my call per the brief.
- The forward-risk note in §2 (LOOK/SEE/WATCH/GIVE untaught, so `féach le`/`tabhair faoi` have no *current* collision) is a fact about today's 36/668 state, not a proof they'll never collide once those seeds get translated.

No recommendation is made per the brief's instruction — this is measurement only.
