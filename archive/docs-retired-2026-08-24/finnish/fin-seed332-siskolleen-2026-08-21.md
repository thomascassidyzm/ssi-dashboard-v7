# fin_for_eng — the `siskolleen` family at seed 332, and a course-wide possessive sweep

**Course:** `fin_for_eng` (668 seeds, 14,120 practice-phrase rows) · **Date:** 2026-08-21
**Follow-up to:** `docs/finnish/fin-seed54-kaverillensa-2026-08-21.md`, which closed the seed 54
`kaverillensa` family and declared an explicit gap: two identical defects at seed 332, left unfixed,
and a withdrawn "zero unbound possessives remain" claim because its sweep matched only the `-nsa`
allomorph and missed the `-Vn` spelling (`siskolleen`).
**Applied by:** worker session `fin-seed332-siskolleen`.

**Result in one line: 168 rows carry a third-person possessive suffix, all 168 were adjudicated
individually, exactly 2 are defective, and both are now repaired. Zero seeds needed unapproving.**

---

## 1. The sweep — spelling-agnostic, whole course, read live

The previous pass's miss is the reason this sweep matches **morphology, not a string**. Finnish
writes the third-person possessive suffix two ways and the course uses both:

- **`-nsa` / `-nsä`** — `kaverillensa`, `laukkuunsa`, `veljensä`, `itsensä`
- **`-Vn`** (the case ending's final vowel lengthened, plus `n`) — `siskolleen`, `huolissaan`,
  `mielellään`, `tosissaan`, `innoissaan`, `keskenään`, `toisiaan`

Method: every `target_text` in `course_practice_phrases`, `course_legos` and `course_seeds` for
`fin_for_eng` was tokenised live from the database, and every distinct token ending in
`-nsa` / `-nsä` / `-nne` **or** in a long vowel + `n` (`aan|ään|een|iin|oon|uun|yyn|öön`) was pulled
out and adjudicated by hand. No sampling, no build artefact, no JSON.

| | count |
|---|---|
| Distinct Finnish tokens in the course | 1,297 |
| Distinct tokens matching possessive morphology (candidates) | **137** |
| …of which are genuinely a 3rd-person possessive | **11** |
| …plus one fossilised `-nsa` (`tahansa`, *mikä tahansa* "anything") | 1 |
| …plus two **2nd-person plural** possessives, out of scope | 2 (`kanssanne`, `kätenne`) |
| …the remaining 123 candidates are not possessives at all | 123 |

The 123 non-possessives are illatives (`kotiin`, `autoon`, `ravintolaan`), third infinitives
(`puhumaan`, `lähtemään`), passives (`halutaan`, `puhuttiin`), and long-vowel stems and negative
polarity items (`tänään`, `mitään`, `koskaan`, `kukaan`). They are listed here only to show the
candidate net was cast wide and then narrowed by hand rather than by a second lucky regex.

**The 11 genuine third-person possessives, and where each is taught:**

| token | gloss | lego | seed | kind |
|---|---|---|---|---|
| `kaverillensa` | to his friend | `S0052L04` | 52 | referential |
| `laukkuunsa` | in her bag | `S0053L03` | 53 | referential |
| `veljensä` | her brother | `S0316L03` | 316 | referential |
| `siskolleen` | for his sister | `S0332L04` | 332 | referential |
| `itsensä` | oneself / himself | `S0065L04`, `S0339L01` | 65, 339 | reflexive pronoun |
| `huolissaan` | worried | `S0343L01` | 343 | lexicalised adverbial |
| `mielellään` | happy to | `S0344L01`, `S0448L01` | 344, 448 | lexicalised adverbial |
| `tosissaan` | serious | `S0482L01` | 482 | lexicalised adverbial |
| `innoissaan` | excited | (used at 128) | 128 | lexicalised adverbial |
| `keskenään` | with each other | `S0410L03` | 410 | reciprocal |
| `toisiaan` | each other | `S0426L02` | 426 | reciprocal |

**Rows carrying one of these, all read and decided individually:**

| | rows |
|---|---|
| `course_practice_phrases` | 142 |
| `course_seeds` (seed sentences) | 13 |
| `course_legos` (lego cards) | 13 |
| **Total adjudicated** | **168** |
| **Defective** | **2** |

All 13 seed sentences and all 13 lego cards are clean: every seed sentence has an overt
third-person subject (`Se voi…`, `Ne tappelee…`, or an embedded `että se…`), and every lego card is
a bare fragment with no subject at all, so the suffix has nothing to mis-bind to.

### Adjudication, family by family

**`kaverillensa` (18 rows, seeds 52 / 54 / 185 / 357 / 527)** — repaired by the previous pass and
re-verified live here. Every row now has a third-person subject or is a bare infinitive. Clean.

**`laukkuunsa` (18 rows, seeds 53 / 314 / 332 / 349 / 466 / 636)** — clean throughout. Seed 53 is
the seed that *teaches* the distinction, and its rows do it deliberately: `S0053L03U01` "she wanted
to put **his** letter in **her** bag" → *se halusi laittaa **sen** kirjeen laukkuu**nsa*** — free
`sen` for the non-coreferent possessor, the suffix for the subject's own. `S0053L03U06` is its
mirror ("he … **her** letter … **his** bag"), byte-identical in Finnish, and that identity is the
teaching point: Finnish does not mark gender here. Both flagged by my class-B detector and both
correctly **exempt**. The five later rows (314, 332L01, 349, 466, 636) all put the suffix in a
clause whose subject is `se`. Clean.

**`veljensä` (10 rows, seed 316)** — clean. Three bare build fragments, and seven rows where the
suffix sits in a clause with a `se` subject, including the embedded-clause cases
(*luuletko sä, että **se** voisi tuoda velje**nsä***) where the binder is the embedded subject, not
the matrix `sä`. Clean.

**`itsensä` (17 rows, seeds 65 / 327 / 333 / 339)** — clean on the binding test. Seed 339's rows all
have a `se` subject. Seed 65's `itsensä testaamiseen` is a generic nominalisation ("for testing
oneself"), which takes the third-person suffix in standard Finnish regardless of who is doing the
testing. `S0339L01U04` "she said that he's hurt himself" was flagged by the detector and is a false
positive: `itsensä` is in the embedded clause whose subject is `se` = *he*. Correct.

**`huolissaan`, `mielellään`, `tosissaan`, `innoissaan`, `keskenään`, `toisiaan` (77 rows)** — these
are lexicalised adverbials and reciprocals, not referential possession. They do not name a possessor,
so classes A and B cannot apply: no learner can be misled about *whose*. `mielellään`, `keskenään`
and `toisiaan` additionally occur only with third-person subjects (`se` / `ne`) throughout, so they
are licensed even on the strict reading. See §5 for the three rows where a frozen `-Vn` sits with a
first- or second-person subject, raised and deliberately not acted on.

**`siskolleen` (8 rows, seed 332)** — **2 defective.** Detailed below.

---

## 2. The two defects, and the repairs

Lego `S0332L04` teaches **`siskolleen`** — *for his sister*. `sisko` + `-lle` (allative) + `-Vn`
(3rd-person possessive). Same anaphoric suffix, same binding rule, same two failure classes as
seed 54, 278 seeds later.

### Before / after — every row changed

| id | | English | Finnish | Class |
|---|---|---|---|---|
| `S0332L04U02` | **before** | I want to build a new life for his sister | mä haluun rakentaa uuden elämän siskolleen | **A** |
| | **after** | **he wants** to build a new life for his sister | **se haluu** rakentaa uuden elämän siskolleen | |
| `S0332L04U04` | **before** | she needs to build a new life for **his** sister | sen pitää rakentaa uuden elämän siskolleen | **B** |
| | **after** | she needs to build a new life for **her** sister | *(Finnish unchanged)* | |

**Nothing else was touched. 2 rows edited, 0 rows pulled, 166 rows kept.**

**`S0332L04U02` — Class A, no binder.** With the first-person subject `mä` there is nothing in the
clause for the anaphoric suffix to bind to; *mä haluun rakentaa uuden elämän siskolleen* is not a
sentence a Finn produces. The repair is the seed 54 p4 repair, operation for operation: swap the
**subject** so the suffix is licensed, changing **no vocabulary at all** — `mä haluun` → `se haluu`.
It is not redundant against its neighbours: `S0332L04U01` drills `se voi` (*he can*), this row drills
`se haluu` (*he wants*), so the new lego `siskolleen` is exercised against two different frames.

**`S0332L04U04` — Class B, wrong referent.** In the necessive construction *sen pitää…* the genitive
experiencer `sen` controls the possessive suffix, so `siskolleen` means "**her own** sister" while
the English said "**his** sister" — the two sides disagreed about whose. The Finnish was always
right; only the prompt was wrong. So the **Finnish is untouched** and one English word changes.
This is the most conservative repair available and is exactly the seed 54 p5 / seed 185 shape.

### Why the obvious repair is blocked here too

The natural alternative for Class A is *sen siskolle* — free possessor, no suffix, the pattern seed
53 teaches. **It is blocked, for the same reason `sen kaverille` was blocked at seed 54.** Checked
against `course_legos`: the only `sisko` cards in the whole course are `S0233L03` *your sister* →
`sun siskon` and `S0284L02` *my sister's* → `mun siskon`, both **genitive**. The bare allative
`siskolle` is **never introduced anywhere in the course**. Using it at seed 332 would teach a word
that is never taught. Not done.

---

## 3. Introduced before use — every word checked against `course_legos`

The repair to `S0332L04U02` introduces no new word in either direction, but each word is named here
with the lego that teaches it rather than asserted:

| word | lego | seed | note |
|---|---|---|---|
| `se haluu` | `S0016L01` (*he wants*) / `S0017L01` (*she wants*) | **16 / 17** | 316 seeds before use |
| `rakentaa` | `S0332L02` (*to build*) | **332** | same seed, **earlier** lego |
| `uuden elämän` | `S0332L03` (*a new life*) | **332** | same seed, **earlier** lego |
| `siskolleen` | `S0332L04` (*for his sister*) | **332** | this lego |

Lego index order within seed 332 is L01 `se voi` → L02 `rakentaa` → L03 `uuden elämän` → L04
`siskolleen`, so every component of the new sentence is at or before its own position. `mä haluun`
was **removed**, not added, so no window question arises there.

**Known side.** No new English word or structure. *he wants*, *to build*, *a new life*, *for his
sister*, *she needs to*, *her sister* are all already on the known side at or before seed 332
(`sen pitää` = *she needs to* is `S0319L01`, seed 319). The word *her* is on the known side from
seed 53 onwards. The known side stays inside its controlled vocabulary.

---

## 4. Checks

**ZUT — checked against the whole course after writing, not against seed 332.** Both new known
prompts appear exactly once in `fin_for_eng` and map to exactly one target each. A full course-wide
sweep of every `build` and `use` row for *one known prompt → two different targets* returns **4
collisions, all pre-existing, all outside this family** — the same four the previous pass reported,
untouched and named here rather than silently fixed:

- *that book* → `se kirja` / `sen kirjan`
- *that person* → `se henkilö` / `toi henkilö`
- *very kind* → `tosi kiltti` / `tosi kilttiä`
- *what do you think* → `mitä mieltä` / `mitä mieltä sä oot`

**My two edits created zero new collisions.**

**Duplicate Finnish inside `S0332L04`: zero** — verified live after the write. All eight rows in the
lego are distinct sentences. No Class C defect was introduced or left behind.

**Unbound and misreferring possessives after the write: zero, course-wide.** Two post-write probes,
both run over all 14,120 phrase rows:
- any row combining a referential possessive with a first- or second-person subject outside an
  embedded clause → **0 rows**;
- any row whose English subject gender contradicts its possessive → **3 rows**, all three verified
  by hand as correct (two are seed 53's deliberate free-`sen` contrast, one is `S0339L01U04` where
  the binder is an embedded `se`).

**Audio — none generated, none deleted, none orphaned.** Both edited rows carry NULL on all four
audio columns (`known_audio_id`, `target1_audio_id`, `target2_audio_id`, `presentation_audio_id`),
verified before and after. Nothing to re-render, nothing orphaned by the text change.

**Derived artefacts.** Both rows have NULL `decomposition`, `display_tiling` and
`known_gloss_segments`, so no word-mapping or gloss artefact references the old text. No lego was
mutated, so `course_round_index` needs no refresh. The counters were maintained: `word_count`
(target character length) 42 → 41 on `S0332L04U02` and unchanged at 42 on `S0332L04U04`;
`lego_count` (known-side word count) stays 10 on both.

**Seeds unapproved: 0.** There is no trigger that unapproves a seed on a content edit, so the
`UPDATE` was issued explicitly — and it matched **zero rows**, because seed 332 was **already
unapproved** (`approved_at` is NULL) before this pass, as the previous report predicted. Verified
live after the write: still NULL. **Nothing was approved.** No other seed was touched.

**Proofreading store.** Not read, not written. No file under `tools/proofread/progress/` was opened
and the server on port 4747 was not contacted. Flags close themselves on the tool's next live read.

---

## 5. Raised, not acted on

**Three rows freeze a third-person `-Vn` under a first- or second-person subject.** These are
lexicalised adverbials, not referential possession, and in standard Finnish they would agree with
the subject:

| id | English | Finnish | standard form |
|---|---|---|---|
| `S0128L01U05` | you're excited about it | sä oot **innoissaan** siitä | innoissasi |
| `S0385L01U03` | were you worried about it? | olitko sä **huolissaan** siitä? | huolissasi |
| `S0482L01U03` | are you serious? | ootko sä **tosissaan**? | tosissasi |
| `S0482L01B02` / `U05` | i'm not serious (now) | mä en oo **tosissaan** (nyt) | tosissani |

**Not changed, deliberately.** This course speaks *puhekieli* throughout, and in that register the
frozen `-Vn` form is the norm for exactly these adverbials — *ootko sä tosissaan?* is the ordinary
colloquial Finnish question, not an error. More to the point, each of these is taught as a **single
frozen component card** (`S0343L01C02` *worried* → `huolissaan`, `S0482L01B01` *serious* →
`tosissaan`, `S0448L01C02` / `S0344L01C03` *happy to* → `mielellään`). Making them agree would turn
one card into a paradigm of five and is a register decision for Kai, not a defect repair. The same
argument covers seed 65's `itsensä testaamiseen` under a `sua` experiencer.

**`kaverillensa` is a literary form in a colloquial course**, and `siskolleen` is not — the course
uses both realisations of the same suffix within 280 seeds. The previous pass raised this and left
it to Kai; the seed 332 evidence strengthens the observation without changing the answer. Still
Kai's call, still not acted on.

---

## 6. Explicit gap

**None.** The gap declared by the previous pass — the two seed 332 rows — is closed, and the sweep
that pass had to withdraw has been rerun spelling-agnostically across all 668 seeds and all 14,120
phrase rows. **Zero unbound or misreferring third-person possessives remain in `fin_for_eng`.** The
four ZUT collisions in §4 are pre-existing, are named rather than hidden, and are out of scope.

---

## 7. Rollback

Both rows are snapshotted verbatim, pre-edit, in
`docs/finnish/fin-seed332-siskolleen-2026-08-21-rollback.json`, and seed 332's row (carrying its
`approved_at`, which was already NULL) in
`docs/finnish/fin-seed332-siskolleen-2026-08-21-rollback-seeds.json`. A straight `UPDATE` from those
files restores the previous state exactly.

## 8. Method

Read live from the database throughout, never from a build artefact or a JSON file. Both writes ran
inside a single transaction with a `WHERE` clause matching the pre-edit text, so a concurrent edit
would have made them no-ops rather than clobbering another worker. Every count and every row in the
tables above was re-read live from the database after the commit. Work was done in a dedicated git
worktree off `origin/main`, not in the shared checkout.
