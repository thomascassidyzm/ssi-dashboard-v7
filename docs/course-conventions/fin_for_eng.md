# Course conventions — `fin_for_eng`

**Carry this whole file in every fix brief for this course.** Two minutes to read.
Conventions are **per-course**: nothing in section B or C transfers to another course.

*Last verified against the live DB: 2026-08-12. Course: 666 seeds, 14,032 practice phrases,
**zero target-language audio** — so text edits here have no audio consequence and orphan no clips.*

---

## A. Estate-wide rules that apply here

These are not Finnish decisions; they hold everywhere. Full text: `docs/fix-agent-rules.md` §B —
**read it, don't rely on this summary**. The ones that bite hardest on this course:

1. **A fix is done when the course is consistent, not when the sentence is correct.** Check the seed,
   the LEGO card, and every build/use row in the tile — in play order.
2. **Never introduce a word *form* the learner hasn't met** at or before this seed. The exact form,
   not the lemma. This is the top rule and Finnish breaks it easily (case endings).
3. **Same known → two targets is a defect. Two knowns → one target is not.** Most reported
   "duplicates" are the harmless direction. (See B4 for how Kai has qualified this here.)
4. **Your own fix can create a ZUT collision.** Before writing new English, grep the whole course for
   that exact wording; re-check after any `known_text` edit.
5. **You may reword both sides, and you may delete.** Ladder: fix in place → reword one side →
   reword both → delete. Never force a fix; skip with a one-line reason.
6. **Components are intentionally partial — don't "fix" them as sentences.** USE rows are the
   complete sentences and carry the naturalness judgement.
7. **Calibrate any detector before believing its count.** And note: JS `\b` does not match Finnish
   `ä ö y` — use `(?<!\p{L})…(?!\p{L})` with `/u`, or a zero on this course means nothing.
8. **No TTS generation without explicit per-batch approval.** (Moot here — no target audio exists.)
9. **Editing a phrase in an approved seed knocks that seed back to review.** Say which seeds you
   knocked back.

---

## B. `fin_for_eng`-specific decisions — CONFIRMED

Each is a ruling Kai gave, a recorded validated convention, or a change applied and verified live.
Counts re-run 2026-08-12.

### B1. Register: spoken Finnish, not standard written Finnish

The course is colloquial throughout, and it is **absolute** — the standard forms have zero rows:

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
**formal-register block that runs from seed 639 to the end of the course**. That block uses formal
`te` / `-tte` deliberately. Outside it, a standard-Finnish form is a defect.

*Never write `minä`, `sinä`, `hän`, `he`, `haluan` or `olen` into this course below seed 639.*

### B2. A negated clause takes a partitive object — applied and live

Verified adversarially across all 2,376 negated phrases and 189 distinct `-n` tokens, every one read
by hand (`docs/fin-partitive-adversarial-verify-2026-08-06.md`). Five rows were fixed and are live
now — e.g. `S0057L01U06` reads `mä en muista sen nimeä` (not `nimen`), and `S0523L01U01/U02/U04`
read `tekosyytä` (not `tekosyyn`).

**Four things that look like violations and are correct — do not "fix" these:**

- **Duration accusatives** survive negation: `mä en haluu olla täällä koko päivän` is right.
- **Genitives before a postposition**: `sun kaverin kanssa`, `ruohon poikki`.
- **Predicate nominatives**: `se ei oo punainen`.
- **An `-n` object in an affirmative clause embedded inside a negated one**:
  `mä en oo varma, muistanko mä sen nimen` is right.

Related: partitive objects introduced into *new* phrases need a partitive-licensing context —
negation, `yrittää`, or `on vaikeaa + INF`
(`docs/course-optimization/lego-spread-backfill-playbook.md`).

### B3. The four *it* forms — Kai 2026-08-12, and already recorded in July

**A wording correction first.** The contracted form in this course is written **`it's`, with a
straight apostrophe** — 495 rows. The spelling **`it s`** (space, no apostrophe) **does not occur at
all: 0 rows.** So the rule is *expanded vs contracted*, not *apostrophe vs no apostrophe*.

Kai's ruling today matches a convention **already written down in July**, which states it more
finely — four forms, not two:

> *"English signals Finnish structure: dummy-it = `it's / it's not`; referential = `it is / it isn't
> / it was`; perfect referential = `it has been`."*
> — `docs/course-optimization/lego-spread-backfill-playbook.md` §Per-language addendum

Finnish makes this mechanically checkable: a referential *it* is `se on …`; a dummy/impersonal one is
a bare `on …` with no subject. The minimal pair sits inside one seed:

| row | English | Finnish |
|---|---|---|
| `S0047L01B01` | it**'s** a good thing | `on hyvä juttu` — dummy ✓ |
| `S0047L02B01` | I think that it**'s** a good thing | `se on hyvä juttu` — referential ✗ |

**Live adherence. Do not fix these in passing — Kai has not asked for a repair pass.**

| English form | expected | rows | follows |
|---|---|---|---|
| `it is` | referential (`se`) | 227 | **220 — 96.9%** |
| `it isn't` | referential | 59 | **58 — 98%** |
| `it was` | referential | 100 | **88 — 88%** |
| `it has been` | referential | 7 | **6 — 86%** |
| `it's` | dummy (no `se`) | 495 | **268 — 54%** |
| `it's not` | dummy | 42 | **25 — 60%** |

So the **expanded** forms are reliable and the **contracted** ones are the leak: **~170–227 rows use
a contraction for a genuinely referential *it***. (The range is honest uncertainty — colloquial `se`
also means *he/she* here, which inflates the looser test. See D9.)

**The 7 expanded-side exceptions**: `S0066L01B01`, `S0066L01U03`, `S0064L04U04`, `S0065L01B01`,
`S0065L01U02` are impersonal (`on vaikeaa`, `on tärkeää`) but written "it is"; `S0539L01U03/U04`
(`mikä kello on`) are a different construction.

### B4. Same English → two Finnish words is accepted technique — but watch placement

Kai's ruling, quoted:

> *"It needed to be different because we can't use onnellinen in some places… What we've done is try
> to separate the contexts to make it clearer. It's not the ideal solution but in this case it's the
> best we could do — we just need to make sure we don't have too many of these happening close to
> each other or early in the course."*

So: **do not report a same-English pair as a duplicate defect.** Report how far apart the two sit and
how early. `happy` (`tyytyväinen` / `onnellinen`, 30 seeds apart, earliest seed 76) is the accepted
benchmark. The thresholds proposed to measure this (25 seeds / seed 50) were **never ruled on** — D1.

**Two English prompts sharing one Finnish target is not a defect at all** — Kai overturned the
earlier rule that it was. Four rows were deleted under the old rule before it was overturned; see D5.

**Where a split has a genuine reason, keep it rigid.** Where one seed is an **island** against a
consistent course-wide form, that is a defect — merge onto the course-wide form.

### B5. Recorded translation choices — one-to-one, never crossed

From the playbook addendum (`lego-spread-backfill-playbook.md`), validated over ~500 phrases across
three agent runs. **These are fixed pairings; don't substitute a synonym when rewriting:**

- `like → tykätä`, `enjoy → nauttia`, `use → käyttää`, `spend → viettää` — **never cross**.
- **`kuinka` only with a quantifier or degree** (`kuinka paljon / kauan / nopeesti`); **bare "how" =
  `miten`**. Live: 65 of 73 `kuinka` rows comply. The 4 genuine violations are three bare component
  tiles `S0033L01C01`, `S0420L02C01`, `S0470L01C01` ("how" → `kuinka`) and one manner crossover
  `S0245L01U04`. (The `kuinka väsynyt` rows at S0600 are degree-with-adjective and are fine.)
- **Reflexive possessives**: bare `-nsa` (`laukkuunsa`), not `oma…`, unless the English says "own".
- **Future**: `will / 'll` → Finnish **present**, never `aikoa`. `going to` → `aikoa` only for real
  intention; predictions and ability stay present. Stative predicates (`olla` + adj/location, bare
  `pystyä`) need a licensor — a time word, a when/if clause, or a hope/afraid/sure embed — otherwise
  bare future English pairs with present Finnish (`I'm ready → mä oon valmis`).
- **Destination "here/there" with motion verbs = `tänne` / `sinne`** (illative), not `täällä` /
  `siellä`.

### B6. Text shape: lowercase, no full stops, question marks mirror the English

All verified live across all 14,032 rows:

- **`target_text` is lowercase.** Exactly **one** row starts with a capital: `S0010L03C01`
  (`Mä en oo varma`). That is an outlier, not the convention.
- **No row ever ends in a full stop** — 0 of 14,032, across every role.
- **A question ends in `?` on both sides, and the two sides agree.** 951 Finnish question rows;
  exactly **one** genuine mismatch, `S0470L02U07` ("do you mind climbing?" → `haittaako sua kiivetä`,
  missing its `?`).
- **`known_text` is lowercase too**, except the pronoun *I*: 9,698 rows start lowercase, 4,330 start
  with *I*, and **zero** start with any other capital.
- **No parentheticals on the Finnish side at all** (0 rows). The known side has 20 — all `(formal)`,
  all from seed 639 on. See C5.

---

## C. Observed in the data, never written down — Kai to confirm or reject

Each is derived from live text and evidenced. **None has been ruled on.** Marked
**OBSERVED-NOT-RECORDED**.

| # | Candidate convention | Evidence | Note |
|---|---|---|---|
| **C1** | **British spelling on the known side.** | `practise` 161 / `practice` **0**; `travelling` 1 / `traveling` 0. `realise/realize`, `colour/color`, `favourite/favorite` have **zero rows either way** — no evidence, don't infer. | Strong on `practise`; the rest is one row. |
| **C2** | **"film", never "movie".** | `film` 40 rows / `movie` **2**. One of the two is `S0371L01C03` — the seed-371 island — so that island is anomalous **in English as well as Finnish**, which the existing analysis missed. | The other, `S0452L01U05`, is a normal row. |
| **C3** | **"reckon" is the house rendering of *luulen*.** | 345 rows. Distinctive, consistent, and a British register choice a rewriter could easily flatten to "think". | Worth ruling on precisely because it looks like an oddity. |
| **C4** | **Yes/no questions use the `-ko/-kö` clitic.** | 688 of 951 question rows carry it. The other 263 are mostly question-word questions, not a rival construction. | A tendency with a clear core, not an exclusive rule. |
| **C5** | **The formal block marks itself `(formal)` in the English.** | 20 rows, all from seed 639. It does real ZUT work — it is the only thing distinguishing formal `te` from informal `sä` for the same English. | **But** `fix-agent-rules.md` §8 lists learner-facing parentheticals as a defect class. These two rules collide here. **Kai should say which wins.** |
| **C6** | **`se` covers *he/she* as well as *it*.** | `hän` 0 rows; `se ei halunnut tietää` = "she didn't want to know". | Consequence: any detector keying on `se` to find *it* over-counts. Recorded so the next worker doesn't repeat the caveat in B3. |
| **C7** | **263 rows spell the pronoun *I* lowercase inside contractions** — `i'm`, `i've`, `i'd`. | 263 rows; **0** bare lowercase `i`. E.g. `S0340L01B01` "i'm sure", `S0309L02B03` "i've never seen it". | `fix-agent-rules.md` §8 names lowercase standalone `i` as a defect class. **This is the largest single defect found here and I can see no report of it anywhere.** Not fixed. |
| **C8** | **`S0010L03C01` is capitalised** (the only capitalised target in the course) and **`S0470L02U07` is a direct question with no `?`**. | One row each. | One-row cleanups, not conventions. Listed so they aren't rediscovered. |

---

## D. Known gaps — suspected decisions I could not find or verify

Stated plainly rather than papered over.

1. **The ten Finnish decisions put to Kai on 2026-08-06 were never answered, and none were applied.**
   Re-checked against the live DB today. Still live and unchanged: `S0371L01C02` = `kattomaan`,
   `S0371L01C03` = `leffaa` (the island); `S0152L02C01` "differently" = `eri`; `S0162L01B01`/`B02`
   both "what do you think"; `S0389L01B01` "that person" = `toi henkilö` against `S0388L01B02`
   "that person" = `se henkilö`. **These are open questions, not conventions** — a fix worker must
   not treat the evidence pack's proposals as decided.
   Source: `docs/finnish/finnish-decisions-evidence-pack-2026-08-06.md`.

2. **`docs/fix-agent-rules.md` §4 is stale on Finnish.** It cites `kuinka`/`miten` as the worked
   example of a clean split — *"187 rows, **zero crossovers**"*. Live data contradicts it:
   `S0245L01U04` is plain manner taking `kuinka`, against the near-identical `S0076L02U01` which
   takes `miten`, plus three bare "how" → `kuinka` tiles. **The live DB outranks the doc.** The
   playbook's rule (B5) is the one to apply.

3. **Kai's own open proofread flag contradicts the verified partitive analysis.** He flagged
   `S0034L02U06` (`…mun pitää olla valmis koko päivän`) with *"would have to be koko päivää"*. But
   `fin-partitive-adversarial-verify-2026-08-06.md` names duration accusatives — `koko päivän`
   exactly — as the class that legitimately survives negation. One of the two is wrong and I have not
   resolved which. **Kai's ruling needed.**

4. **`courses.quality_rules` is NULL for `fin_for_eng`** — while **83 of 144 courses have it
   populated**, several with exactly the `lessons_learned` shape this file is trying to be (see
   `ara_lb_for_eng`). There is already a machine-readable, per-course home for these conventions and
   Finnish's is empty. **Recommendation: once Kai rules on section C, write section B into
   `quality_rules` so tools can read it, not only humans.**

5. **Four rows were deleted under a rule Kai has since overturned.** `S0059L01U07`, `S0105L01U06`,
   `S0142L04U06`, `S0144L01U06` were removed as duplicate targets; Kai then ruled that two English
   prompts on one Finnish target is not a defect. They are restorable word-for-word from
   `docs/fin-flags-2026-08-06-rollback.json`. **Restoration is unruled.**

6. **~115 legos flagged in the original leak sweep were never individually adjudicated.**
   `docs/exception-lego-leak-sweep-2026-08-04.md` flagged 46 accusative/genitive-baked legos and 76
   "reverse" partitive-baked ones. Only the S0057 / S0523 / S0589 subset was triaged into the applied
   fixes. **Do not assume the remainder are either confirmed or dismissed.**

7. **Human proofreading covers ~8% of the course.** The progress file holds 2,791 decisions, all `ok`
   bar one, and the reviewed range stops at **seed 52 of 666**. Above seed 52, "no flag" means unread,
   not clean. Relatedly, the proofread-unapprove rule (21 approved seeds holding never-read phrases)
   is still unruled — `docs/proofread-unapprove-rule-stage1-2026-08-06.md`.

8. **Not examined: `decomposition` and `display_tiling`.** If a tile's *displayed* English can differ
   from the stored `known_text`, a convention could be violated there invisibly. Unchecked here, and
   unchecked by the 2026-08-06 passes too.

9. **B3's exception counts rest on a proxy, not on reading 722 rows.** I classified referential vs
   dummy by the presence of Finnish `se`, hand-checking ~40 rows to validate it. The proxy held in
   every sample I read, but the 170-vs-227 spread is the honest width of my uncertainty.

---

## How to reuse this file for another course

Copy the four-section skeleton, not the content. **A / B / C / D carry fixed meanings:**

- **A** — estate-wide rules, *pointer plus the ones that actually bite on this course*. Never restate
  `fix-agent-rules.md`; it will drift.
- **B** — only what is **ruled by the course owner, recorded as a validated convention, or applied
  and verified live**. Every row needs a live count or a quoted ruling. If you can't evidence it, it
  is not section B.
- **C** — regularities you found in the data that nobody has ever decided. Always marked
  OBSERVED-NOT-RECORDED, always with the count that supports them.
- **D** — open questions, stale docs, and what you couldn't check. **A file with an empty section D
  has not looked hard enough.**

Two sources that are easy to miss and carry real conventions rather than method: the
**per-language addendum** in `docs/course-optimization/lego-spread-backfill-playbook.md`, and
**`courses.quality_rules`** in the DB.

Calibrate DB access before trusting any count: retrieve one known row by id prefix and confirm it
matches what you expect, before believing a zero.
