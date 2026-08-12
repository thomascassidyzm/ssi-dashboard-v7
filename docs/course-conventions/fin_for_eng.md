# `fin_for_eng` — fix-worker checklist

**This is the checklist, not the record.** The long-form record is Kai's own decision-log bundle:
`docs/course-optimization/fin-decision-log/` on branch **`kai-stage`** (commit `bdd8998f`) —
`fin-proofread-decision-log.md` (the dated ledger), `fin-build-and-translation-log.md`,
`fin-spoken-register-rules.md`, plus `../fin-calibration-golden.md`,
`../fin-general-issues-status.md`, `../fin-zut-concern-context.md`.
**Read the log for the why; read this for the two-minute check.** Don't duplicate it here.

> **Currency.** Those logs are **copies, snapshotted 2026-08-12**; the live memory files they came
> from keep updating independently. Anything cited here is as-of that snapshot. Everything in
> section B was **re-verified against the live DB on 2026-08-12** — where the live course
> contradicts a log entry, this file says so and the DB wins.

*Course: 666 seeds, 14,032 phrases, 1,394 LEGOs. **Pre-audio** — no Finnish target audio, so text
edits are free and orphan no clips.*

---

## A. Estate-wide rails — NOT Finnish decisions

Rails transfer between courses; the decisions in B do not. Full text: `docs/fix-agent-rules.md` §B.

1. **One English prompt → exactly one Finnish answer** (ZUT), course-wide. Same known → two targets
   is a defect; **two knowns → one target is not** (Kai: shared targets are fine).
2. **Every word form must be attested at or before its own seed** — the exact inflected form, not
   the lemma. *Check first-seed **excluding the phrase you are editing** — counting the row you just
   wrote is how this rail gets broken.*
3. **No forward reference to a later chunk within the same seed.** LEGO N may use LEGO N, seeds
   1..S-1, and LEGOs 1..N-1 — never a later sibling.
4. Fix in place → reword one side → reword both → delete. Never force; skip with a reason.
5. Components are intentionally partial — don't judge them as sentences.
6. Calibrate before counting. JS/POSIX word boundaries break on `ä ö` — use `(?<!\p{L})…(?!\p{L})`
   with `/u`, or a zero here means nothing.
7. No TTS without per-batch approval (moot — pre-audio).

---

## B. `fin_for_eng` decisions — CONFIRMED

Each cites its log and its live check. **PL** = proofread log · **RR** = register rules ·
**BL** = build/translation log.

### B1. Spoken register — **[RR]** · live: absolute

`mä` / `sä` / `me` / `te` / `ne`; genitive `mun` / `sun` / `sen`. **`se` for `hän` ALWAYS**, and in
the plural `he→ne`, `heidän→niiden` (*not* `niitten` — too slangy), `heitä→niitä`.

**Live counts:** `minä` **0**, `sinä` **0**, `hän` **0**, `he` **0**, `haluan` **0**, `minun` **0**,
against `mä` 4,619 / `sä` 1,451 / `mun` 832 / `haluun` 785 / `ne` 642. One `olen`, at `S0639L02B03`
(`olen täällä, herra`) — inside the **formal block from seed 639**, deliberate.

Also **[RR]**, each a live check a fix must not break:

- **Plural subject → SINGULAR verb**, including relative clauses: `ne puhuu`, `jotka puhuu`.
- **Keep FULL `-a/-ä` infinitives**: `tehdä` not `tehä`, `puhua` not `puhuu`, `oppia` not `oppii`.
  Kai's principle: *don't pre-erode endings* — the clear form works in more contexts. (Finite
  `haluu`, `se puhuu` are a different thing and are correct.)
- **Particles stay full**: `mutta` not `mut`, `että` not `et`.
- **`pitää` takes a GENITIVE subject**: `mun pitää`, `sun pitäis` — never `sä pitäisi`.
- **`me` + passive for 1st plural**: `me mennään`, `me opitaan` — not `me menemme`.
- **`tää`/`tän`** for `tämä`/`tämän`. **Kept as-is:** `tässä`, `tästä`, `tähän`, `tällä`, `tätä`.
- **Colloquial adverbs/verbs but STANDARD adjective stems** — `vaikea` not `vaikee`, `nopea` not
  `nopee`. (`nopeesti`/`oikeesti` are adverbs and correct — a known false pair.)
- **Possessive suffixes → `mun`/`sun` + noun.** Kept: `-nsa` reflexives (`laukkuunsa`,
  `kaverillensa`) and fixed expressions (`pahoillani`, `huolissani`, `mielelläni`, `tahansa`).

### B2. The *it* convention — **[PL 2026-07-21, Kai's design]** · live: holds where it ran

English signals the Finnish structure:

| English | Finnish structure | |
|---|---|---|
| **`it's` / `it's not`** | bare `on` / `ei oo` + evaluative | **dummy / impersonal** |
| **`it is` / `it isn't` / `it was`** | `se on` / `se ei oo` / `se oli` | **referential** |
| **`it has been`** | `se on ollut` | perfect referential |

Kai's instruction: **apply this to ALL new English phrases.** 226 rows were swept on 07-21.

**Live check — the sweep held exactly where the log says it ran, and stops at its boundary:**

| band | expanded → referential | contracted → dummy |
|---|---|---|
| **S28–S164** (the swept run) | 125/136 — **92%** | 180/224 — **80%** |
| **outside it** | 235/253 — 93% | 136/271 — **50%** |

So the contracted side is a coin-flip outside the swept range. **135 rows** use a contraction for a
referential *it*: **17** in S165–S213, **15** in S214–S400, and **103 at S401+** — the late course,
built by backfill batches *after* the sweep. Real rows:

| seed | English | Finnish |
|---|---|---|
| 166 | I think it**'s** uncommon | `mun mielestä se on epätavallinen` |
| 178 | although it**'s** difficult, it**'s** fun | `vaikka se on vaikeaa, se on hauskaa` |
| 185 | I reckon it**'s** true | `mä luulen, että se on totta` |
| 200 | they say that it**'s** true | `ne sanoo, että se on totta` |
| 191 | it doesn't matter, it**'s** not a problem | `ei haittaa, se ei oo ongelma` |

**Known and deliberate — do NOT report these as faults** (log, same entry): inverted questions
(first S165, 15 rows) and dummy-past `oli kiva` (first S214, 9 rows) were documented as gaps; and
three dup-collisions were skipped on purpose, including **`S0065L01B01`** ("it is important" →
`on tärkeää`) and **`S0066L01B01`** ("it is difficult" → `on vaikeaa`).

> Note on wording: the contraction is written **`it's`** with a straight apostrophe (495 rows).
> **`it s`** with a space does not occur — **0 rows**.

### B3. Object case — **[PL 2026-08-03/04]** · three separate rules, in order

1. **Negation forces the partitive.** A negated clause cannot take a whole object.
   `mä en muista sen nimeä` (not `nimen`); `mä en haluu antaa tekosyytä`. Verified across all 2,376
   negated phrases, 189 distinct `-n` tokens, each hand-read; 5 fixes live today.
   **Correct despite looking wrong** — don't "fix": duration accusatives (`en haluu olla täällä
   koko päivän`), genitives before a postposition (`sun kaverin kanssa`), predicate nominatives
   (`se ei oo punainen`), and an `-n` object in an affirmative clause embedded in a negated one
   (`mä en oo varma, muistanko mä sen nimen`).
2. **`sen` vs `sitä` for object "it"**: affirmative telic total object → **`sen`**; negation →
   **`sitä`**; partitive-governing verbs (`haluta`, `tykätä`, `miettiä`, `odottaa`) → **`sitä`**.
3. **"do it" — the governor decides**: personal verb (`haluta`/`voida`/`yrittää`/`aikoa`) → **`sen`**;
   necessive (`pitää`/`pitäisi`/`täytyy`) or impersonal (`on erikoista`, `ei haittaa`) → **`se`**;
   bare fragment → **`se`**; negation → **`sitä`**.

Also: **partitive objects taken from negative seeds may only be reused in partitive-licensing
contexts** — negation, `yrittää`, or `on vaikeaa + INF`. Never invent an affirmative total-object
form the course hasn't taught.

### B4. Never edit the English known side unless absolutely necessary — **[RR, overarching]**

This is Kai's standing constraint and it outranks tidiness. Where the English *was* changed it was
a deliberate, logged decision (e.g. `S55` enjoy→like, the come→come-back sweep, `reckon`).
**Consequence:** fin's English has knowingly diverged from the shared spa/ita/por seed text. That
divergence is **approved** (flag #5, closed) — do not "restore" it.

### B5. Frozen known→target mappings — **[BL think/can passes; PL sweeps]**

One-to-one, course-wide. Breaking one of these is a ZUT defect:

| English | Finnish | | English | Finnish |
|---|---|---|---|---|
| think about + noun | `miettiä` | | begin | `aloittaa` |
| what … think | `mitä mieltä` | | start | `alkaa` |
| think that | `mun/sun mielestä` | | go | `mennä` |
| **reckon** | `luulla` | | leave | `lähteä` |
| believe | `uskoa` | | more | `enemmän` |
| know a fact | `tietää` | | some more | `lisää` |
| know a person | `tuntea` | | earlier | `aiemmin` |
| know how / skill | `osata` | | sooner | `aikaisemmin` |
| able to | `pystyä` | | use | `käyttää` |
| like | `tykätä` | | spend | `viettää` |
| enjoy | `nauttia` | | learn | `oppia` |
| practise | `harjoitella` | | doing (well) | `pärjätä` |

**Idioms that override the go/leave split:** "go home" = `lähteä kotiin`, "go out" = `lähteä ulos`.
**Deliberate exceptions kept:** seeds 377, 510, 413, 534, 665 teach a general `mennä` form as their
LEGO; seed 173 keeps "manage".

**`very`:** `tosi` for affirmative; `kovin` **only** negative, interrogative or down-toning.
**`happy`:** `tyytyväinen` is **always relational** ("happy with/that X", carries `siihen`); bare or
"so" happy → `onnellinen`. (`onnellinen` singular debuts late at S129, which is why earlier
emotional "happy" had to take the relational route.)

### B6. Predicative adjective goes SINGULAR — **[PL 2026-08-04, course-wide, all adjectives]**

Unless the learner can **see** a plural subject (`me`, `meidän`, `ne`, `niiden`, `te`). Generic or
impersonal `olla [adj]` with no visible subject → singular. A 76-row scan found only `onnellisia`
violating; it was resolved by demoting three generic-plural USE rows to builds.

### B7. Text shape — live-verified

- **Lowercase everywhere below the seed.** Seeds **are** capitalised (663/668); LEGOs **0**/1,425;
  phrases **1**/14,032 (the outlier is `S0010L03C01`, `Mä en oo varma`). *Don't carry a seed's
  capital down into a LEGO or phrase.*
- **No trailing full stops — ever.** 0 of 14,032. House style, set at translation time (`?`/`!` kept).
- **Questions:** prefer `onko` / `-ko` / `-tko` over `-ks`. 951 question rows; `?` matches on both
  sides bar one, `S0470L02U07` ("do you mind climbing?" → `haittaako sua kiivetä`, no `?`).
- **Commas** follow Finnish rules (Kai supplied *Pilkkusäännöt*): finite subordinate clause → comma;
  infinitive `lauseenvastike` (`miten puhua`) → none; `joka` = "every" → none; two main clauses with
  a coordinating conjunction and **not** a shared subject → comma; `heti kun` → comma before `heti`;
  `-kä`/`kuin` → none. **Phrases and seeds are separate fields — fixing one does not fix the other.**
- **Contractions are always apostrophised**: `don't` 709, `didn't` 360; **zero** `dont/cant/im/wont`.
  Re-run that check after any bulk write.

### B8. Five USE rows per LEGO — live: 971 of 1,394 exactly 5, **99.3%** at 5 or more

Floor and mode. Before deleting a USE row, check what it leaves. Only six LEGOs past seed 3 sit
below five: `S0027L03`, `S0091L03`, `S0106L02`, `S0658L01`, `S0665L01`, `S0667L01`. The thin ones at
`S0001L03/L04/L05` and `S0003L01` are ramp-legitimate, not defects.

---

## C. Observed in the data, never recorded — Kai to rule

Real rows, with seeds, so the sentences can be judged rather than the rule.

**C1 — British spelling on the known side.** `practise` 161 rows / `practice` **0**. But
`realise/realize`, `colour/color`, `favourite/favorite` have **zero rows either way** — no evidence,
don't infer a general rule.

| seed | English | Finnish |
|---|---|---|
| 200 | they want to **practise** together | `ne haluu harjoitella yhdessä` |
| 206 | I enjoy the chance to **practise** | `mä nautin mahdollisuudesta harjoitella` |

**C2 — "film", never "movie".** `film` 40 rows / `movie` **2** — and one of the two is the seed-371
island, so that seed is anomalous **in English as well as Finnish**, which no existing analysis
notes. Side by side:

| seed | English | Finnish | |
|---|---|---|---|
| 248 | I thought that the **film** was complete rubbish | `mun mielestä elokuva oli täyttä roskaa` | the course norm |
| 371 | I went to see a **film** last month | `mä menin kattomaan **leffaa**` | slang target |
| 371 | a **movie** | `leffaa` | odd on **both** sides |

**C3 — the `(formal)` parenthetical.** 20 rows, all seed 639+. The build log **does** record that
"formal LEGOs/phrases must carry a formality marker to stay distinct from informal", so the *purpose*
is recorded — but the choice of a bare `(formal)` tag in learner-facing English is not, and
`fix-agent-rules.md` §8 calls learner-facing parentheticals a defect class. **Kai: keep the tag, or
carry the formality lexically?**

| seed | English | Finnish |
|---|---|---|
| 639 | with you **(formal)** | `teidän kanssanne` |
| 642 | how are you **(formal)** | `miten te voitte` |
| 644 | could you **(formal)** | `voisitteko te` |

**C4 — `-ko/-kö` carries yes/no questions**, 688 of 951 question rows; the remaining 263 are
wh-questions in normal word order, not a rival construction. Consistent with the recorded
"prefer `onko`/`-ko`/`-tko`" rule; recorded here only because the *proportion* has never been stated.

---

## D. Open questions and gaps

### D0. Open **on purpose** — do not resolve these in a fix pass

**D0.1 — Contracted infinitive after `alkaa`.** Kai's own words: *"the ONLY PARKED FLAG"*, a
"corpus-wide register-class decision, needs own call". `alkaa oppii` / `alkaa sanoo` / `alkaa tehä`
versus the full `alkaa oppia`. This sits directly against the keep-full-infinitives rule in B1, which
is why it was parked rather than swept.

**D0.2 — `juttu` vs `asia` for "thing".** `juttu` 58 rows, `asia` 45; nearest pair four seeds apart:

| seed | English | Finnish |
|---|---|---|
| 47 | thing | `juttu` |
| 51 | thing**s** | `asioita` |

**D0.3 — "I need to" vs "I don't need to", one seed apart.** Grammatically motivated (`ei tarvii` is
the standard negative of `pitää`) but unmarked for the learner:

| seed | English | Finnish |
|---|---|---|
| 44 | I need to | `mun pitää` |
| 45 | I don't need to | `mun ei tarvii` |

**D0.4 — `kuinka` vs `miten` for "how".** A sweep on 07-27 set **bare "how" → `miten`**, with
`kuinka` kept for quantity/degree. Live: 65 of 73 `kuinka` rows carry a quantifier or degree.
**Three of the four remainders are `component` atoms** (`S0033L01C01`, `S0420L02C01`,
`S0470L01C01`, all "how" → `kuinka`) — and the logs show component atoms are deliberately left
alone, so those are probably fine. **One is a genuine `use`-row crossover:**

| seed | English | Finnish | |
|---|---|---|---|
| 245 | I'm really happy with **how** you speak Finnish | `…**kuinka** sä puhut suomea` | plain manner, takes `kuinka` |
| 76 | I'm happy with **how** you speak Finnish | `…**miten** sä puhut suomea` | near-identical, takes `miten` |

⚠️ **`docs/fix-agent-rules.md` §4 is stale here** — it cites this pair as the model of a settled split
with *"187 rows, zero crossovers"*. The row above is a crossover. The DB and Kai's sweep both outrank
that doc.

### D1. The lowercase `I` is a known mechanism, now due again

263 rows spell the pronoun lowercase — `i'm`, `i've`, `i'd`. **All 263 are phrase-initial; zero
mid-phrase.** That is exactly the signature the build log records: *the API lowercases phrase-initial
`known_text` on insert*, and the remedy is a **course-wide cap sweep as an end-step, not a per-insert
fight**. A sweep ran 2026-07-16 (896 rows); these 263 arrived with the backfill batches after it.
**So this is not a new defect — it is the known end-step falling due again.** Examples: `S0340L01B01`
"i'm sure", `S0309L02B03` "i've never seen it", `S0051L05U05` "i'd like to be with my friends".

### D2. Resolved since the snapshot — the log's own carried-forward blocker is clear

The bundle README carries `REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index` as **PENDING**
and "must happen before fin_for_eng serves learners (INF-PLAY risk)". **It no longer reproduces.**
The named dangling row `S0016L02` is absent from `course_round_index`, and seed 16 matches exactly
across the view and `course_legos` (L01/L03/L04/L05 in both, no L02). Calibrated first: the view
stores ids as `S0001L01`, and that row is present. **Someone appears to have run it — worth Kai
confirming rather than assuming.**

### D3. Still gaps

- **Deferred to Kai in the log tail and not obviously actioned:** the S137 lego-expand (blocked —
  the S106 governor isn't contiguous in its seed, so tiling forbids binding it); assorted
  vocab-not-taught cases; `S0168L02` "I'll be able to come" left bare while its presentation says
  plain "come" (*Kai may want a native check on that one*); the `S0007L03` component surfacing
  `pystyn`.
- **132 M-LEGO components have English glosses that are literal Finnish back-translations** (e.g.
  "I agree" → [I'm + of the same opinion]). Targets are all correct and aligned; only the English
  labels read oddly. Logged as a deliberate **end-of-build** cleanup, still outstanding.
- **Human proofreading reaches seed 52 of 666.** The tool progress file holds 2,791 decisions, all
  `ok` bar one open flag — `S0034L02U06`, where Kai wrote *"would have to be koko päivää"*. **That
  contradicts B3**, which names duration accusatives (`koko päivän`) as legitimately surviving
  negation. One of the two is wrong; unresolved. Above seed 52, "no flag" means unread, not clean.
- **`courses.quality_rules` is NULL for `fin_for_eng`** while 83 of 144 courses have it populated,
  some in exactly this shape. Once section C is ruled on, section B belongs in that column so tools
  can read it. Nothing written.
- **Not examined:** `decomposition` / `display_tiling`. If displayed English can differ from stored
  `known_text`, a convention could be broken invisibly.

---

## Reusing this template for another course

**A** estate-wide rails (pointer, never a restatement) · **B** decisions, each citing its source log
*and* a live check · **C** observed-but-unrecorded, **with the actual rows** · **D** open questions
first, then gaps.

Two rules that made this file work: **cite the owner's decision log rather than re-deriving from
scattered reports** — half of what looked like undocumented convention was already ruled on and
logged; and **every candidate carries its sentences and seed numbers**, because the owner rules by
reading the phrase, not the rule statement.
