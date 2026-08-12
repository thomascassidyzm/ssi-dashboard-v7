# Course conventions — `fin_for_eng`

**Carry this whole file in every fix brief for this course.** Two minutes to read.
Conventions are **per-course**: nothing in section B or C transfers to another course.

*Last verified against the live DB: 2026-08-12. Course: 666 seeds, 14,032 practice phrases,
1,394 LEGOs, **zero target-language audio** — so text edits here orphan no clips.*

**Every section-B item carries its basis**, so you can tell a ruling from a measurement:
**[KAI]** he said it · **[APPLIED]** changed and verified live · **[ABSOLUTE]** live data with zero
counter-examples. Anything weaker than these lives in C or D, never in B.

---

## A. Estate-wide rails — these are NOT Finnish decisions

They hold on every course. Full text: `docs/fix-agent-rules.md` §B — **read it, don't rely on this
summary.** Kept separate from section B deliberately: per-course decisions do not transfer between
courses, and these do.

**The three methodology rails, from the repo agent guide:**

1. **One English prompt maps to exactly one Finnish answer** (ZUT), course-wide. Same known → two
   targets is a defect. **Two knowns → one target is not.** (See B4 for Kai's qualification here.)
2. **Every word form must be attested at or before its own seed.** The exact form, not the lemma.
   Finnish breaks this easily via case endings.
3. **No forward reference to a later chunk within the same seed.** For LEGO N of seed S a phrase may
   use LEGO N itself, everything from seeds 1..S-1, and LEGOs 1..N-1 of seed S — **never a later
   sibling.**

**The rest of the block that bites hardest here:**

4. A fix is done when the course is **consistent**, not when the sentence is correct. Check the seed,
   the card and every build/use row in the tile, in play order.
5. **Your own fix can create a ZUT collision.** Before writing new English, grep the whole course for
   that exact wording; re-check after any `known_text` edit.
6. **You may reword both sides, and you may delete.** Ladder: fix in place → reword one side →
   reword both → delete. Never force a fix; skip with a one-line reason.
7. **Components are intentionally partial — don't "fix" them as sentences.** USE rows are the
   complete sentences and carry the naturalness judgement.
8. **Calibrate any detector before believing its count.** JS `\b` does not match Finnish `ä ö y` —
   use `(?<!\p{L})…(?!\p{L})` with `/u`, or a zero on this course means nothing.
9. **No TTS generation without explicit per-batch approval.** (Moot here — no target audio exists.)
10. **Editing a phrase in an approved seed knocks that seed back to review.** Say which seeds.

---

## B. `fin_for_eng`-specific decisions — CONFIRMED

Counts re-run against the live DB 2026-08-12.

### B1. Register: spoken Finnish, not standard written Finnish — **[KAI] [ABSOLUTE]**

The course is colloquial throughout, and the standard forms have **zero rows**:

| spoken (used) | rows | standard (never used) | rows |
|---|---|---|---|
| `mä` | 4,619 | `minä` | **0** |
| `sä` | 1,451 | `sinä` | **0** |
| `mun` | 832 | `minun` | **0** |
| `haluun` | 785 | `haluan` | **0** |
| `oon` | 437 | `olen` | **1** (see below) |
| `ne` (they) | 642 | `he` | **0** |
| `se` (he/she/it) | — | `hän` | **0** |

**The one exception is principled, not an error:** `olen täällä, herra` at `S0639L02B03`, inside the
**formal-register block running from seed 639 to the end of the course**, which uses formal `te` /
`-tte` deliberately.

*Never write `minä`, `sinä`, `hän`, `he`, `haluan` or `olen` into this course below seed 639.*

### B2. A negative sentence cannot take a whole object — **[KAI] [APPLIED]**

A negated clause takes a **partitive** object, never the accusative/genitive `-n`. Verified
adversarially across all 2,376 negated phrases and 189 distinct `-n` tokens, each read by hand
(`docs/fin-partitive-adversarial-verify-2026-08-06.md`). Five rows were fixed and are live now —
`S0057L01U06` reads `mä en muista sen nimeä` (not `nimen`); `S0523L01U01/U02/U04` read `tekosyytä`.
Both re-confirmed in the DB today.

**Four things that look like violations and are correct — do not "fix" these:**

- **Duration accusatives** survive negation: `mä en haluu olla täällä koko päivän` is right.
- **Genitives before a postposition**: `sun kaverin kanssa`, `ruohon poikki`.
- **Predicate nominatives**: `se ei oo punainen`.
- **An `-n` object in an affirmative clause embedded inside a negated one**:
  `mä en oo varma, muistanko mä sen nimen` is right.

### B3. "it is" for a real *it*; the contraction for the impersonal *it* — **[KAI]**

**Stated by Kai on 2026-08-12.** A parallel search of all four Finnish decision docs and the repo
decisions log found it recorded nowhere, so this is its first statement as a Finnish decision.
In his words: *use "it is" when referring to a real it, and the contracted form when the it is
passive/impersonal.*

**One wording note.** The contraction in this course is written **`it's`, straight apostrophe** —
495 rows. The spelling **`it s`** (space, no apostrophe) **does not occur at all: 0 rows.** So apply
the rule as *expanded vs contracted*.

Finnish makes it checkable: a real *it* is `se on …`; an impersonal one is a bare `on …` with no
subject. The minimal pair sits inside one seed:

| row | English | Finnish |
|---|---|---|
| `S0047L01B01` | it**'s** a good thing | `on hyvä juttu` — impersonal ✓ |
| `S0047L02B01` | I think that it**'s** a good thing | `se on hyvä juttu` — real *it* ✗ |

**How consistently the live course follows it. Measured, not fixed — no repair pass was asked for.**

| English form | expected | rows | follows | exceptions |
|---|---|---|---|---|
| `it is` | real *it* (`se`) | 227 | 220 — **96.9%** | **7** |
| `it's` | impersonal (no `se`) | 495 | 268 — **54.1%** | **227** |
| **total** | | **722** | **488 — 67.6%** | **234** |

The leak is almost entirely one-directional: **~170–227 rows use the contraction for a real *it***.
(The range is honest uncertainty — a tighter test requiring the literal `se on` gives 170; colloquial
`se` also means *he/she*, which inflates the looser count. See D9.)

**The 7 expanded-side exceptions**: `S0066L01B01`, `S0066L01U03`, `S0064L04U04`, `S0065L01B01`,
`S0065L01U02` are impersonal (`on vaikeaa`, `on tärkeää`) but written "it is"; `S0539L01U03/U04`
(`mikä kello on`) are a different construction.

> **One corroboration worth knowing, and why two searches disagreed.** A July per-language addendum
> in `docs/course-optimization/lego-spread-backfill-playbook.md` (committed 2026-07-28) states a
> compatible and finer distinction: *"dummy-it = `it's / it's not`; referential = `it is / it isn't /
> it was`; perfect referential = `it has been`."* It is not a Finnish decision doc, which is why the
> decision-doc search did not reach it — **Kai's ruling above is the authority**; this only shows the
> same instinct was already in play, and extends it to forms Kai did not name. Live: `it isn't`
> 58/59 referential, `it was` 88/100, `it has been` 6/7, `it's not` 25/42 impersonal — the same
> expanded-reliable / contracted-leaky shape.

### B4. Same English → two Finnish words is accepted technique — **[KAI]**

Kai's ruling, quoted:

> *"It needed to be different because we can't use onnellinen in some places… What we've done is try
> to separate the contexts to make it clearer. It's not the ideal solution but in this case it's the
> best we could do — we just need to make sure we don't have too many of these happening close to
> each other or early in the course."*

**Do not report a same-English pair as a duplicate defect.** Report how far apart the two sit and how
early. `happy` (`tyytyväinen` / `onnellinen`, 30 seeds apart, earliest seed 76) is the accepted
benchmark. The thresholds proposed to measure this (25 seeds / seed 50) were **never ruled on** — D1.

**Two English prompts sharing one Finnish target is not a defect at all** — Kai overturned the
earlier rule that it was. Four rows were deleted under the old rule first; see D5.

### B5. Five USE rows per LEGO is this course's norm — **[KAI] [ABSOLUTE]**

**971 of 1,394 LEGOs have exactly 5** (69.7%), and **99.3% have 5 or more**. Five is the floor and
the mode; more is common (413 LEGOs), fewer is almost unknown.

**Before deleting a USE row, check what it leaves behind.** Only **six** LEGOs at seed 4 or later
sit below five today — `S0027L03` (4), `S0091L03` (4), `S0106L02` (3), `S0658L01` (4), `S0665L01`
(4), `S0667L01` (4). The four thinner ones at `S0001L03/L04/L05` and `S0003L01` are **not** defects:
the phrase-count ramp deliberately allows fewer in seeds 1–3.

### B6. Text shape — **[ABSOLUTE]**

Live across all 14,032 rows. Not a stated ruling; recorded here because the counts have **no**
counter-examples beyond the single outliers named.

- **`target_text` is lowercase.** Exactly one row starts with a capital: `S0010L03C01`
  (`Mä en oo varma`) — an outlier, not the convention.
- **No row ever ends in a full stop** — 0 of 14,032, every role.
- **A question ends in `?` on both sides, and the two agree.** 951 Finnish question rows; exactly one
  genuine mismatch, `S0470L02U07` (`haittaako sua kiivetä`, missing its `?`).
- **`known_text` is lowercase too**, except the pronoun *I*: 9,698 start lowercase, 4,330 start with
  *I*, **zero** start with any other capital.
- **No parentheticals on the Finnish side at all** (0 rows). The known side has 20 — all `(formal)`,
  all from seed 639 on. See C5.

---

## C. Observed in the data, never ruled on — Kai to confirm or reject

**OBSERVED-NOT-RECORDED.** Evidenced from live text; none has been decided.

| # | Candidate convention | Evidence | Note |
|---|---|---|---|
| **C1** | **British spelling on the known side.** | `practise` 161 / `practice` **0**; `travelling` 1 / `traveling` 0. `realise/realize`, `colour/color`, `favourite/favorite` have **zero rows either way** — no evidence, don't infer. | Strong on `practise` only. |
| **C2** | **"film", never "movie".** | `film` 40 / `movie` **2**. One of the two is `S0371L01C03` — the seed-371 island — so that island is anomalous **in English as well as Finnish**, which the existing analysis missed. | The other, `S0452L01U05`, is normal. |
| **C3** | **"reckon" is the house rendering of *luulen*.** | 345 rows. A British register choice a rewriter could easily flatten to "think". | Worth ruling on because it looks like an oddity. |
| **C4** | **Yes/no questions use the `-ko/-kö` clitic.** | 688 of 951 question rows. The other 263 are mostly question-word questions, not a rival construction. | A tendency with a clear core. |
| **C5** | **The formal block marks itself `(formal)` in the English.** | 20 rows, all from seed 639. It does real ZUT work — the only thing distinguishing formal `te` from informal `sä` for the same English. | **But** `fix-agent-rules.md` §8 lists learner-facing parentheticals as a defect class. **Kai should say which wins.** |
| **C6** | **`se` covers *he/she* as well as *it*.** | `hän` 0 rows; `se ei halunnut tietää` = "she didn't want to know". | Any detector keying on `se` to find *it* over-counts — see B3. |
| **C7** | **263 rows spell the pronoun *I* lowercase inside contractions** — `i'm`, `i've`, `i'd`. | 263 rows; **0** bare lowercase `i`. E.g. `S0340L01B01` "i'm sure", `S0309L02B03` "i've never seen it". | `fix-agent-rules.md` §8 names this a defect class. **Largest single defect found here; no report of it exists anywhere.** Not fixed. |
| **C8** | **Recorded-but-never-ruled translation choices**, from the July playbook addendum: `like→tykätä`, `enjoy→nauttia`, `use→käyttää`, `spend→viettää` (one-to-one, never crossed); reflexive possessives use bare `-nsa` not `oma…` unless the English says "own"; `will/'ll` → Finnish present, never `aikoa`, with `going to` → `aikoa` only for real intention; destination "here/there" with motion verbs = `tänne`/`sinne`, not `täällä`/`siellä`. | `docs/course-optimization/lego-spread-backfill-playbook.md`, validated over ~500 phrases across three agent runs. | Real and useful, but that file is a **method playbook, not a decision record** — so these are candidates, not conventions. |
| **C9** | **Two single-row slips:** `S0010L03C01` capitalised; `S0470L02U07` a direct question with no `?`. | One row each. | Cleanups, listed so they aren't rediscovered. |

---

## D. Open questions and gaps

### D0. Deliberately unsettled — **do not "resolve" these in a fix pass** (Kai, 2026-08-12)

All four confirmed live today. They are open **by decision**, not by oversight:

| Question | Live state |
|---|---|
| **Necessive object case** — `tekosyyn` vs nominative `tekosyy` after `pitää`/`pitäisi` | **3 rows** (`mun pitää antaa tekosyyn`, `sun pitäisi antaa tekosyyn`, `mun pitää löytää tekosyyn`). Flagged in two docs as "not asserted, wants a separate look". |
| **"I need to" vs "I don't need to" using different verbs one seed apart** | Seed 44 `pitää` (13 rows) vs seed 45 `tarvii` (12 rows). Grammatically motivated — `ei tarvitse` is the standard negative of `pitää` — but unmarked for the learner. |
| **`kuinka` (degree) vs `miten` (manner)** | 73 `kuinka` rows; 65 carry a quantifier or degree. The 4 genuine outliers: three bare "how" → `kuinka` tiles (`S0033L01C01`, `S0420L02C01`, `S0470L01C01`) and one manner crossover (`S0245L01U04`). **See D2 — a repo doc wrongly calls this settled.** |
| **`juttu` vs `asia` for "thing"** | `juttu` 58 rows, `asia` 45. Nearest pair is 4 seeds apart (seed 47 `juttu`, seed 51 `asioita`). |

### D1–D9. Gaps

1. **The ten Finnish decisions put to Kai on 2026-08-06 were never answered, and none were applied.**
   Re-checked live today: `S0371L01C02` = `kattomaan`, `S0371L01C03` = `leffaa` (the island);
   `S0152L02C01` "differently" = `eri`; `S0162L01B01`/`B02` both "what do you think"; `S0389L01B01`
   "that person" = `toi henkilö` against `S0388L01B02` = `se henkilö`. **Open questions, not
   conventions** — do not read the evidence pack's proposals as decided.
   Source: `docs/finnish/finnish-decisions-evidence-pack-2026-08-06.md`.

2. **`docs/fix-agent-rules.md` §4 is stale on Finnish.** It cites `kuinka`/`miten` as the worked
   example of a settled clean split — *"187 rows, **zero crossovers**"*. That is contradicted live
   (see D0) **and** superseded by Kai, who has now put it back on the open list. **The live DB and
   Kai both outrank the doc.**

3. **Kai's own open proofread flag contradicts the verified partitive analysis.** He flagged
   `S0034L02U06` (`…mun pitää olla valmis koko päivän`) with *"would have to be koko päivää"*. But
   the partitive verification names duration accusatives — `koko päivän` exactly — as the class that
   legitimately survives negation. One is wrong; I have not resolved which. **Kai's ruling needed.**

4. **`courses.quality_rules` is NULL for `fin_for_eng`** — while **83 of 144 courses have it
   populated**, several in exactly the `lessons_learned` shape this file is (see `ara_lb_for_eng`).
   A machine-readable per-course home already exists and Finnish's is empty. **Recommendation: once
   section C is ruled on, write section B into it so tools can read it, not only humans.**

5. **Four rows were deleted under a rule Kai has since overturned.** `S0059L01U07`, `S0105L01U06`,
   `S0142L04U06`, `S0144L01U06`, restorable word-for-word from
   `docs/fin-flags-2026-08-06-rollback.json`. **Restoration is unruled.**

6. **~115 legos flagged in the original leak sweep were never individually adjudicated.**
   `docs/exception-lego-leak-sweep-2026-08-04.md` flagged 46 accusative/genitive-baked legos and 76
   "reverse" partitive-baked ones; only the S0057 / S0523 / S0589 subset was triaged into the applied
   fixes. **Do not assume the remainder are cleared.**

7. **Human proofreading covers ~8% of the course** — 2,791 decisions, all `ok` bar one, stopping at
   **seed 52 of 666**. Above seed 52 "no flag" means unread, not clean. The proofread-unapprove rule
   (21 approved seeds holding never-read phrases) is also still unruled.

8. **Not examined: `decomposition` and `display_tiling`.** If a tile's *displayed* English can differ
   from the stored `known_text`, a convention could be violated there invisibly.

9. **B3's exception counts rest on a proxy, not on reading 722 rows.** I classified real vs
   impersonal by the presence of Finnish `se`, hand-checking ~40 rows to validate it. The proxy held
   in every sample, but the 170-vs-227 spread is the honest width of my uncertainty.

---

## How to reuse this file for another course

Copy the skeleton, not the content. **A / B / C / D carry fixed meanings:**

- **A** — estate-wide rails. *Pointer plus the ones that bite here.* Never restate
  `fix-agent-rules.md`; it will drift. **Keeping these out of B is the point of the file:**
  per-course decisions don't transfer between courses, and rails do.
- **B** — only what is **ruled by the course owner, applied and verified live, or absolute in the
  data**. Tag every item with which. If you can't tag it, it isn't section B.
- **C** — regularities nobody has decided. Always OBSERVED-NOT-RECORDED, always with the count.
  A rule found in a *method* doc rather than a decision record belongs here, not B.
- **D** — start with **D0, questions that are open on purpose**, so no one "fixes" them; then the
  gaps. **A file with an empty section D has not looked hard enough.**

Two sources that are easy to miss: the **per-language addendum** in
`docs/course-optimization/lego-spread-backfill-playbook.md`, and **`courses.quality_rules`** in the
DB. Calibrate DB access before trusting any count — retrieve one known row by id prefix and confirm
it matches, before believing a zero.
