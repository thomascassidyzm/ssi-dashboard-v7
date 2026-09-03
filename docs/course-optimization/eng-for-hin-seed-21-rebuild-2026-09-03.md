# eng_for_hin seed 21 — practice layer rebuilt from scratch

**Date:** 2026-09-03 · **Course:** `eng_for_hin` (known = Hindi cue, target = English answer)
**Seed 21:** known `आप उसका नाम क्यों सीख रहे हैं?` → target `Why are you learning her name?`

---

## 1. The premise, verified against the live DB

Kai's report was that seed 21's whole practice layer was English-word-order Hindi, and that
nothing else in the first 100 seeds looked like it. Both halves check out.

**Word order.** I ran a whole-course scan (10,967 phrases) for material sitting *after* a finite
verb — the signature of English order in a verb-final language — excluding legitimate clause
continuers (`कि जो तो और लेकिन क्योंकि जब अगर …`). It flagged 1,158 phrases course-wide, of which
**77 fall in seeds 1–100**. I read all 77:

| | count |
|---|---|
| Flagged in seeds 1–100 | 77 |
| Genuine English word order | **16 — every one in seed 21** |
| False positives (legitimate Hindi) | 61 → **false-positive rate 79%** |

The 61 false positives are all real constructions the heuristic can't see: `…है जैसे…`
complements (seed 26), `जितनी जल्दी हो सके` (28), the comma-joined `बात ऐसी है, …` (49),
correlative `जो … उसे/वह` (57, 59, 70), `हो जाता है` (58), `जिन्हें` relatives (87, 88).
A pattern match is a reading list, not a verdict — and here the list was 79% noise.

Sixteen is the count the *heuristic* caught. Reading seed 21's 28 rows directly, **every
BUILD and USE phrase in the seed was defective** — English order, or `क्यों क्या आप …`
(a double question particle), or the ungrammatical possessive below.

**`उसकी नाम`.** `नाम` is masculine, so the possessive must be `उसका`. The string `उसकी नाम`
occurred **8 times in the whole course, all 8 inside seed 21**. Everywhere else the course
writes `उसका नाम` correctly (36 phrases), and every one of the 25 `उसकी` phrases elsewhere
(seeds 53, 346) is `उसकी` + a *feminine* noun — `चिट्ठी`, `किताब` — and is correct.

**The builder agreed.** Replaying the pre-rebuild seed 21 through the dashboard's own
`/v2/validate` gate, seed 21 failed on all three LEGOs: each one's BUILD floor was padded with
a bare copy of the LEGO itself (`क्यों`/"why", `सीख रहे हैं`/"are you learning",
`उसकी नाम`/"her name"). Seed 21 was not written by whatever wrote its neighbours.

---

## 2. What was rebuilt, and with what

Built entirely through the dashboard's own routes on `localhost:3471` — no bespoke authoring
script. The payload was dry-run against the builder's own validators
(`validation.cjs`, `phrase-structure.cjs`) before posting.

1. `POST /api/course/eng_for_hin/components/backfill?force=true` — corrected S0021L03's
   component `उसकी` → `उसका` (target side `her` unchanged) and regenerated its component rows.
2. `POST /api/v2/phrases/eng_for_hin` — the full re-authored BUILD/USE set for all three
   LEGOs. **28 phrases inserted, 0 errors.** Its gates all passed: phrase-count floor
   (3 BUILD + 5 USE per LEGO), whole-chunk DP vocab tiling on the English side against the
   139 chunks available at seed 21, LEGO containment, and bare-LEGO rejection.
3. Two orphan rows (`S0021L01B02` at position 9, `S0021L01B03` at position 10 — leftovers from
   an earlier patch that had left L01 with positions 1,4–8,9,10 and no 2 or 3) were deleted
   directly, because the rebuild reclaims positions 2 and 3 and no dashboard route removes a
   stray phrase row. That is the one direct DB write in this job; it is stated here rather
   than buried.

**Every phrase is now verb-final, idiomatic Hindi using only material taught at or before
seed 21, and `उसकी नाम` no longer occurs anywhere in the course (0 hits).**

---

## 3. LEGO boundaries: unchanged — and that is verified, not assumed

All three LEGOs are byte-identical before and after:

| LEGO | known | target | changed? |
|---|---|---|---|
| S0021L01 | `क्यों` | why | no |
| S0021L02 | `सीख रहे हैं` | are you learning | no |
| S0021L03 | `उसका नाम` | her name | no |

The only LEGO-level edit is inside S0021L03's components: known `उसकी` → `उसका`. The *target*
side (`her`) is untouched, so the seed's vocab contribution to the course is identical — an
edit-cascade "Case 1", where the blast radius is provably the edited seed alone.

I did not take that on trust. I ran the dashboard's scoped sweep `POST /v2/validate` twice
over the same 648 decomposed seeds — once against the live rebuilt state, and once with the
**old** seed 21 restored as an in-memory override — and diffed:

| | seeds checked | seeds failing |
|---|---|---|
| Old seed 21 | 648 | 37 (incl. seed 21) |
| Rebuilt seed 21 | 648 | 36 |

- **Seeds newly failing after the rebuild: 0.**
- **Seeds whose issue list changed at all: 0.**
- Seed 21 itself moved from fail to pass.

The 36 remaining failures are pre-existing and unrelated: the lowest is seed 136, and every one
is byte-identical between the two runs.

**Phrases checked course-wide for the three affected LEGOs, by Hindi string:**

| LEGO string | phrases in course | needed repair |
|---|---|---|
| `क्यों` (excl. `क्योंकि`) | 118 | 0 |
| `सीख रहे हैं` | 19 | 0 |
| `उसका नाम` | 36 | 0 |
| `उसकी` (the changed component) | 25 | 0 — all with feminine nouns, all correct |

Total **198 phrase uses checked outside seed 21, 0 repairs needed** — the expected result for
a rebuild that moved no boundary, and now demonstrated rather than asserted.

---

## 4. Flagged, not touched: the possessive question

Kai has parked this; I did not touch seeds 20 or 53. But the rebuild forced the collision into
the open, so here is the sharpest statement of it I can give, with counts.

Hindi `उसका`/`उसकी` agrees with the **possessed noun**, not the possessor, so it carries no
his/her information at all. The course currently resolves the ambiguity **both ways, on the
same string**:

- `उसका नाम` → **26 phrases gloss it "his name"** (seeds 20, 24, 26, 29, 30, 33, 38, 57, 59, 60, 113)
  and **10 gloss it "her name"** (seed 21's new 8, plus two in seed 465 that already did:
  *"I will ask her name"*, *"next time I will ask her what her name is"*).
- The mirror image exists too: `उसकी चिट्ठी` → "his letter" (seed 53, 11 phrases) while
  `उसकी किताब` → "her book" (seed 346, 14 phrases).
- At component level the clash is now string-identical and unavoidable: `S0020L01C01` is
  `उसका` → "his" and `S0021L03C01` is `उसका` → "her". One known form, two target forms — a ZUT
  violation by the letter of the rail.

Making seed 21's Hindi grammatical **necessarily** creates that component-level collision,
because the only grammatical alternative to `उसकी नाम` is `उसका नाम`. I chose correct Hindi and
am flagging the consequence rather than leaving a broken form in place. Whatever the eventual
ruling — disambiguate the cue, or accept `उसका` as genuinely two-way — it is a design decision
across ~61 phrases in 13 seeds, not a seed-21 fix.

---

## 5. Audio

**No audio was generated.** Rewriting the Hindi nulled the cue-side links, as expected:
of seed 21's 28 phrase rows, **25 known-side, 19 target1 and 19 target2 links are now null.**
An audio-pass request is queued on `eng_for_hin` via
`tools/course-optimization/queue-audio-pass.cjs` (appended to the course's existing pending
request), naming this rebuild.

**Explicit gap:** the cue side of `eng_for_hin` is all-xAI, and xAI is retired, so those 25
Hindi clips **cannot be re-rendered today** — the same block recorded for seeds 1–20 in
`cc44c864f`. This is a pre-existing estate block that the rebuild inherits, not one it created;
seed 21's cue audio was going to be lost the moment its Hindi was corrected either way.

---

## 6. Full text of the rebuilt seed

### L01 `क्यों` → why
| role | Hindi cue | English |
|---|---|---|
| BUILD | आप क्यों सीखना चाहते हैं | why do you want to learn |
| BUILD | क्यों आज | why today |
| BUILD | क्यों अब | why now |
| USE | आप क्यों बहुत अच्छी अंग्रेज़ी बोलते हैं? | why do you speak English very well? |
| USE | आप क्यों अंग्रेज़ी में बात करना चाहते हैं? | why do you want to speak in English? |
| USE | आप आज क्यों मिलना चाहते हैं? | why do you want to meet today? |
| USE | आप जल्दी क्यों सीखना चाहते हैं? | why do you want to learn quickly? |
| USE | मुझे यकीन नहीं है कि आप क्यों सीख रहे हैं। | I'm not sure why you are learning |

### L02 `सीख रहे हैं` → are you learning
| role | Hindi cue | English |
|---|---|---|
| COMP | सीख रहे | learning |
| COMP | हैं | are |
| BUILD | क्या आप अंग्रेज़ी सीख रहे हैं | are you learning English |
| BUILD | क्या आप जल्दी सीख रहे हैं | are you learning quickly |
| BUILD | आप क्यों सीख रहे हैं | why are you learning |
| USE | क्या आप बहुत अच्छी अंग्रेज़ी सीख रहे हैं? | are you learning English very well? |
| USE | आप अंग्रेज़ी में क्यों सीख रहे हैं? | why are you learning in English? |
| USE | आप जल्दी क्यों सीख रहे हैं? | why are you learning quickly? |
| USE | क्या आप आज अंग्रेज़ी सीख रहे हैं? | are you learning English today? |
| USE | क्या आप मेरे साथ अंग्रेज़ी सीख रहे हैं? | are you learning English with me? |

### L03 `उसका नाम` → her name
| role | Hindi cue | English |
|---|---|---|
| COMP | उसका | her |
| COMP | नाम | name |
| BUILD | उसका नाम जल्दी जानना | to find out her name quickly |
| BUILD | मैं उसका नाम याद कर सकता हूँ | I can remember her name |
| BUILD | उसका नाम कहना | to say her name |
| USE | मैं उसका नाम जानना चाहूँगा। | I'd like to find out her name |
| USE | आप उसका नाम क्यों जानना चाहते हैं? | why do you want to find out her name? |
| USE | वह उसका नाम आज जानना चाहती है। | she wants to find out her name today |
| USE | हम उसका नाम जल्दी सीखना चाहते हैं। | we want to learn her name quickly |
| USE | मैं आपके साथ उसका नाम सीखना चाहता हूँ। | I want to learn her name with you |

No L03 Hindi string duplicates any of seed 20's twelve `उसका नाम` phrases, so the rebuild adds
no *string-identical* ZUT clash at phrase level — only the component-level one described in §4,
which is unavoidable.
