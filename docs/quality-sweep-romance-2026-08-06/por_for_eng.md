# Quality sweep — `por_for_eng` (European Portuguese for English speakers) — READ-ONLY

**Date:** 2026-08-06 · **Course status:** `status=released`, `new_app_status=live`, `visibility=public` — **LIVE TO LEARNERS**
**Scope:** 668 seeds, 1,417 LEGOs (1,356 `is_new`), 14,156 practice phrases (1,516 component / 4,555
build / 8,085 use). All four counts reconciled exactly against `count(*)` on the live DB before any
work started, and the component+build+use split sums to the total.

**This is a filler run for a worker killed by a server restart earlier today. Per the brief: NO
WRITES. No UPDATE, no INSERT, no DELETE, no TTS, no git commit. Everything below is read-only
legwork for a coordinator; every "fix" mentioned is a description of what a fix *would* do, not
something I did.**

DB access: direct `psql` against the live `DATABASE_URL`, via a Node/`pg` seed-reader script and a
handful of calibrated SQL/regex sweeps, both kept in `scripts/` (gitignored, not committed).

---

## 0. Method and calibration

Every detector below was run raw first, then every hit was hand-read against the seed's own master
sentence plus its sibling rows before being called a defect (per the evidence standard). Two counts
are reported for every sweep: **raw** (what the regex matched) and **confirmed** (what survived
hand-reading). No raw count is reported alone anywhere below.

All regexes use `(?<!\S)…(?!\S)` or an explicit `(^|[^a-zà-ÿ])…([^a-zà-ÿ]|$)` character-class form —
**never `\b`** — because Postgres's POSIX regex engine doesn't support `\p{L}`/`\b` the way the brief
warned about, and this course's hyphenated clitics (`ajudar-me`, `ajudá-la`, `dizer-me`) and elisions
would break a naive ASCII boundary. Calibration check run before trusting the character class:
`ajudar-me` does **not** false-positive as containing a bare word `me` under the class-based pattern,
and `dizer-me` is correctly left untouched by any bare-word sweep for `me`.

One detector bug caught mid-run: my first tiling-check used substring comparison without stripping
punctuation, and it flagged `S0512` as non-tiling purely because the LEGO's own known-text carried a
trailing `?` the seed's mid-sentence position doesn't. Re-verified by hand and downgraded to false
positive — not counted below.

---

## 1. Seeds read end-to-end (42, well over the 30 floor, spread across the full range)

Seed row + every LEGO + every component/build/use phrase, both languages, read in learner order:

**1, 20, 45, 70, 95, 130, 160, 190, 204, 220, 250, 272, 280, 310, 313, 315, 340, 341, 344, 352, 358,
370, 379, 384, 390, 400, 406, 430, 450, 460, 490, 512, 521, 550, 580, 610, 630, 645, 650, 660, 665,
668** — plus the 644–654 formal ("madam"/"senhora") block sampled via 645/650/660/665.

Each finding below was found in this hand-read, then swept across the whole course.

---

## 2. Confirmed defects

### 2.1 LEGO teaching a bare preposition-contraction, sibling produces a dangling preposition — S0204

**The lead, read in full and confirmed exactly as briefed, with one correction to the brief's own
wording.** Seed 204: *"I wanted her to help you to deal with the arrangements"* →
`eu queria que ela te ajudasse a tratar dos preparativos`.

- `S0204L01` — `"of the"` → `"dos"` — has 2 BUILD phrases that **do** say "of the" (`build1`/`build2`,
  both literally `"of the"` → `"dos"`), so the brief's claim that "its practice prompts never contain
  'of the' at all" is **not quite right at the BUILD tier**. It **is** right at the USE tier: all 4 USE
  phrases (`"I like my friends"`, `"I don't remember the names"`, `"I'm talking about the problems"`,
  `"he's the best of friends"`) absorb `dos` into a different English framing and never surface the
  literal two-word chunk "of the" in a complete sentence. This is a weak-reinforcement pattern, not
  itself ungrammatical — logged as (d), not a confirmed defect on its own.
- `S0204L03` — `"to deal with"` → `"tratar dos"` — **`build4`: `"she is going to deal with it"` →
  `"ela vai tratar dos"`.** This *is* a confirmed defect: the English sentence is complete (has an
  object, "it") and the Portuguese is not — `tratar dos` is a preposition-contraction with nothing
  after it, which is not a sentence a Portuguese speaker would produce. Provable directly from the
  row itself (no object where the English has one) and from every sibling in the same LEGO, all of
  which correctly follow `tratar dos` with a noun (`tratar dos preparativos`, `tratar dos problemas`).
  **Class: (c) — confirmed, provable from the row + its own siblings.**

**Swept the whole course** for the general shape (Portuguese target ends bare on a
preposition-contraction — `dos/das/do/da/no/na/nos/nas/ao/aos/à/às` — while the English ends on an
object pronoun `it/that/this/them/him/her/me/us`): **raw 1, confirmed 1 — S0204 is the only instance
in the course.** Not a class; a single row.

### 2.2 Bare past participle with no auxiliary — S0520, 3 rows

Found reading S0520 (*"it might have happened to the whole family"*). `S0520L01` — `"it happened"` →
`"acontecido"` — a bare past participle, correct only when supported by an auxiliary (`tinha
acontecido`, `pode ter acontecido`, both of which the *rest* of this same LEGO uses correctly). Three
USE phrases drop the auxiliary entirely:

| known | target |
|---|---|
| she said it happened | ela disse que **acontecido** |
| he said it happened | ele disse que **acontecido** |
| they said it happened | disseram que **acontecido** |

`"que acontecido"` is not a Portuguese clause — it needs a finite verb (`que aconteceu`) or the
auxiliary the LEGO's own sibling row already supplies (`que tinha acontecido`, present two rows down
in the same LEGO). **Confirmed, provable from the LEGO's own other rows.**

**Swept the whole course** two ways: (a) `"que" + {acontecido,feito,dito,visto,posto,escrito,aberto,
vindo}` as the last word of a row — **raw 3, confirmed 3**, all S0520; (b) the general shape `(disse|
disseram) que [word ending -ido/-ado]$` across *all* verbs, not just the calibration list — **raw 3,
confirmed 3, identical set.** This is an isolated single-LEGO defect, not a course-wide class.

### 2.3 Gender-agreement error — S0130, 1 row

Found reading S0130 (*"that was a surprise, because he's my friend"* — note the seed's own
**known_text has a typo, "surrpise"**, unrelated to the Portuguese, logged in §4). `S0130L01` —
`"surprise"` → `"surpresa"` (feminine noun, confirmed feminine by its own sibling `"a surprise"` →
`"uma surpresa"`) — `build3`: `"this is a surprise"` → **`"este é uma surpresa"`**. `este` is the
masculine demonstrative; `surpresa` is feminine, so this needs `esta`. Provable from the LEGO's own
sibling row two lines above it. **Confirmed, single row.**

**Swept the whole course** for `(este|esse|aquele) é uma` (masculine demonstrative directly against a
feminine indefinite article): **raw 1, confirmed 1 — S0130 only.**

### 2.4 Mid-sentence capital `É` / `Porque` — 14 rows, seeds 547/549/558/573

Same defect shape as the sibling `por_br_for_eng` sweep found at much larger scale (99 rows there).
Here it is small and tightly clustered:

| seed | lego | role | target |
|---|---|---|---|
| 547 | 2 | use | ela disse que o cão está sujo **Porque** esteve a brincar na lama |
| 549 | 2 | use | ela disse que foi **Porque** tenho de ficar calado *(×3 more, same seed/lego)* |
| 558 | 1 | LEGO + 4 use | disseram que **É** tão tarde à noite *(the LEGO itself: `"it's so late at night"` → `"É tão tarde à noite"`, `is_new=true`, so the capital is baked into the taught form, not just a phrase-level slip)* |
| 573 | 3 | use | disseram que **É** o tipo de coisa que torna as férias muito especiais *(×3 more)* |

**Swept the whole course**, excluding genuine proper nouns (África, Itália, Portugal, Jane, day
names): **raw 13 phrase rows + 1 LEGO row = 14, confirmed 14.** Everything outside seeds
547/549/558/573 is clean — no other mid-sentence capital anywhere in known or target text, LEGO or
phrase level. Note S0558L01 means this is a **LEGO-level** instance, not just phrase-level, unlike
por_br's version of the same class.

### 2.5 Seven seeds whose own target text doesn't tile from their own LEGOs

Structural tiling check (every LEGO's `target_text` must appear as a contiguous, punctuation-stripped
substring of its own seed's `target_text`): **raw 17 seeds** flagged; **7 confirmed** genuine
non-tiling defects, matching the shape `por_br_for_eng` found at S53/S289 — the seed's own sentence
uses different wording than the LEGO family it's supposed to demonstrate, while every sibling
BUILD/USE phrase under that LEGO agrees with the LEGO, not the seed:

| seed | LEGO teaches | seed's own text uses instead |
|---|---|---|
| S0315 | `couldn't afford` → **`não conseguia pagar`** (6/6 sibling rows agree) | seed target: `...ele não **podia** pagar o carro que queria` |
| S0344 | `happy to help you` → **`contente em ajudar-te`** (5/5 sibling rows agree) | seed target: `...tem **todo o gosto** em ajudar-te` — a different idiom entirely, no lexical overlap with the LEGO at all |
| S0352 | `wouldn't be able to` → **`não conseguiria`** (6/6 sibling rows agree) | seed target: `...não **ia conseguir**` — a periphrastic-future construction, not the conditional the LEGO teaches |
| S0358 | `your friend` → **`a tua amiga`** (feminine, 6/6 sibling rows agree) | seed target: `**o teu amigo** disse...` — masculine. Either the seed or the whole LEGO family has the wrong gender; six rows can't all be checked against a seed that disagrees with every one of them |
| S0390 | `standing` → **`parado`** (masculine) | seed's own known_text is `"the one **who** is standing"` with target `"**a que** está de pé..."` — feminine "a que", *and* the seed doesn't use `parado` at all, it uses `está de pé` (different construction). Two faults stacked: lexical mismatch and, if the LEGO's word had been used, a further gender mismatch |
| S0406 | `it will be okay` → **`vai ficar bem`** (6/6 sibling rows agree, and this exact form is independently taught at S0340) | seed target: `...vai **correr bem**` — a different verb |
| S0450 | `themselves` → **`eles próprios`** (taught as its own LEGO, L2, with 4 of its own drilling phrases) | seed's own target `não, eles têm de apanhar o comboio` **never includes `eles próprios` at all** — the seed doesn't demonstrate the LEGO it's supposed to carry |

Ten more raw hits (313, 341, 379, 384, 403, 512, 521, 553, 574, 616) were hand-read and are **not**
defects — either a legitimate adverb the LEGO fragment naturally extends into (`553`/`574`/`616`
insert `muito`; `403` a defensible `de`-drop), a benign near-synonym (`341` `uns`/`alguns`, `379`
`sorte`/`a sorte`, `384` `há um momento`/`há pouco`), a single-clitic drop worth a native check but
not provable as wrong (`521` `esqueças`/`te esqueças`), or a detector artifact from unstripped
punctuation (`512`, §0).

**Classification: (d), escalate to Kai/native review** for all seven — I can prove the seed and its
LEGO family disagree, but for S0358 and S0390 I cannot prove from the data alone which side (seed or
LEGO family) is the error, the same limitation the `por_br` report hit on its own seed-vs-sibling
cases. S0344/S0352/S0406/S0450/S0315 are more clear-cut (the LEGO family is large, self-consistent,
and in S0406's case independently corroborated by S0340 teaching the identical correct form) — those
five are closer to (c) but I have not made the seed-vs-LEGO call myself; that call is Kai's per the
task brief, not mine to make read-only.

### 2.6 Small vocabulary forward-references — 3 confirmed instances

Built a word-level debut map from every `is_new` LEGO's `target_text`, then flagged any BUILD/USE
phrase using a word before that word's own debut seed. **Raw: 8 word-level hits across 4 distinct
words.** Hand-adjudicated:

- **`tu` at S0079 (build), formal debut S0099 — false positive.** The debut map only counts `is_new`
  *LEGO* targets; `tu` is already available as a **component** (`"you"` → `"tu"`) from S0013 onward.
  The word was taught, just not as its own dedicated atomic LEGO. Not a defect.
- **`problemas` (S0204, 2 rows) — debut S0325, 121 seeds later. Confirmed forward-reference.** Used
  inside two USE phrases at S0204L01/L03 (`"estou a falar dos problemas"`, `"vou tratar dos
  problemas"`) well before the course teaches the word as its own LEGO at S0325.
- **`disso` (S0112, 1 row) — debut S0162, 50 seeds later. Confirmed, low severity.** `disso` is a
  transparent contraction of already-known `de` + `isso`, so it's a milder case than a genuinely new
  lexeme, but it is still used before its formal LEGO debut.
- **`forma` (S0116, 1 row) — debut S0126, 10 seeds later. Confirmed, low severity, single occurrence.**

No irregular-verb-form forward-reference of the `pôr`/`fizer`/`quiser` shape that `por_br_for_eng`
found: I specifically checked `fizer` and `quiser` (both appear in this course too, at the same seed
numbers as the `por_br` report — S0190 and S0097/S0540 respectively) and in `por_for_eng` **both debut
exactly where they're first used**, with no forward-reference. See §3.3 for a different concern about
the same LEGO.

---

## 3. Cleared as false positive (worth as much as a find)

1. **Lead 6 — late-tranche component rows with no English gloss (the `spa_mx` shape, 71 rows there).**
   Checked directly: `select count(*) where known_text is null or trim='' ` → **0**, both at LEGO and
   phrase level, course-wide. `known_text == target_text` component rows: 10 total, all genuine
   cognates/reflexives (`me`→`me` ×6, `hotel`→`hotel`, `real`→`real`), none clustered in a late
   tranche, none null. **This course does not have the generator-failure shape.**
2. **Lead 7 — Brazilian forms leaking into the European course.** Checked `você`/`vocês`, gerund
   constructions (`estou fazendo` vs `estou a fazer`), and BR-specific vocabulary (`ônibus`, `trem`,
   `celular`, `geladeira`, `banheiro`): **all zero for the BR-specific forms.** `você`/`vocês` returns
   109 phrase + 12 LEGO hits, but **every single one is plural `vocês`** (the standard EU form for "you
   all") — singular `você` (the BR-associated form) occurs **zero times** anywhere in the course. The
   formal register block (S644–654, and S645/650/660/665/668 read directly) consistently uses vocative
   `senhora`/`senhor` with correct third-person agreement (`a senhora quer ir?`), and the informal/plural
   split between `tu` (2sg) and `vocês`/`-vos` (2pl) is applied consistently everywhere I read. This
   course reads as genuinely European throughout the sample.
3. **Lead 2 — dialogue-as-seed (the `ita_for_eng` S82 "Why not?" shape).** Swept for seeds with two
   question marks and for phrases with a `?` mid-string: **raw 1** (`S0272` use13: `"would you like to
   do that? It's a great idea"` → `"gostavas de fazer isso? É uma ótima ideia"`). Read in context: this
   is one speaker asking a question and answering their own suggestion in the same breath — the
   "musing aloud" pattern the `ita_for_eng` report explicitly kept 5 of 7 similar cases under. **Not a
   defect.** No genuine two-speaker dialogue-as-seed found anywhere in the 42 seeds read or the
   course-wide `?`-pattern sweep.
4. **Mid-sentence capitals in LEGO `target_text` generally.** The initial regex (any lowercase-space-
   uppercase) hit 2 rows at the LEGO level — both proper nouns (`Itália`, `Jane`). No defect.
5. **`quiser`/`quiseres` duplicate `is_new` debut at S0097 and S0540.** Looked like `por_br`'s "`até`
   duplicate debut" finding at first glance (same conjugated form marked `is_new=true` twice), but the
   two LEGOs carry genuinely different known-language glosses (`"as soon as you want"` vs `"I don't
   mind if you want"`) — different M-LEGO chunks that happen to share an inner word. Not the same
   defect as `por_br`'s case, where the *identical* gloss was re-introduced.
6. **`S0130`'s known-text typo (`"surrpise"`)** is on the English side and unrelated to the Portuguese
   gender-agreement finding in §2.3 that shares the same seed — logged separately, not folded into a
   language-quality finding since it's not Portuguese content.

---

## 4. Found, single occurrences, logged but not swept further (too small to characterize a class)

- **S0130 known_text**: `"that was a surrpise, because he's my friend"` — typo, extra `r` in
  "surprise". English side only.
- **S0521**: `S0521L02`/`S0521L04` teach bare `"esqueças"` for `"you forget"` while the seed and
  `S0521L01`'s context consistently pair it with the reflexive clitic `te` (`"te esqueças"`). Possibly
  a dropped clitic, possibly intentional variation (Portuguese `esquecer` can be transitive or
  reflexive) — flagged (d), needs a native check, not confirmed either way.
- **S0390**: stacked defect — see §2.5 table, logged there. Do not double-count.

---

## 5. Explicit gaps

1. **I have no native European Portuguese certainty on every judgement.** The clearest calls (bare
   participle §2.2, gender agreement §2.3, dangling preposition §2.1, capitalization §2.4) are provable
   directly from each row's own siblings and don't depend on my ear. The seed-vs-LEGO disagreements in
   §2.5, and the `esqueças`/`te esqueças` question in §4, are genuinely uncertain and need a native
   speaker or Kai's ruling — I have not guessed.
2. **42 seeds of 668 were read by hand (6.3%).** Spread deliberately across the full range, but a
   defect shape I never happened to read in the sample is a defect shape I never swept for. In
   particular I did not specifically target seeds in the back quarter (600–668) beyond 610/630/
   645/650/660/665/668, so that region has lighter direct coverage even though the 644–654 formal
   block (flagged by the brief) was checked.
3. **No native-speaker or course-builder cross-check was possible** — this was direct SQL reads only,
   read-only per the brief. None of my "confirmed" classifications went through `checkEditedPhrase` or
   any live gate, because nothing was written.
4. **I did not run a full forward-reference sweep at the lemma/inflection level**, only exact surface
   word forms. A verb used in an inflected form that differs from its debut LEGO's exact string (e.g.
   a different person/number of an already-debuted verb) would not be caught by §2.6's detector. I
   specifically checked `fizer`/`quiser` by name because the `por_br_for_eng` report flagged them at
   these same seed numbers, and both are clean here — but that is a targeted check, not a general
   sweep for the whole irregular-verb-form class.
5. **`display_tiling`/`decomposition` JSON columns were not inspected.** I read `known_text`/
   `target_text` only.
6. **I did not query any other course.** The two cross-course leads I could clear (§3.2 no BR leak,
   §3.1 no `spa_mx`-style null-gloss batch failure) are `por_for_eng`-specific findings, not measured
   comparisons against the other six Romance courses.
7. **Nothing was fixed, relinked, unlinked, deleted, or queued for TTS.** No `course_audio` row was
   touched. No approval flag was touched. This entire report is read-only legwork, per the brief.

---

## Scripts

All under `scripts/` (gitignored workspace), not committed: `por-seed.cjs` (learner-order seed
reader), `por-gloss-absent.cjs` (LEGO-gloss-never-appears-in-own-phrases sweep), `por-tiling.cjs`
(seed-doesn't-tile-from-own-LEGOs sweep), `por-debut.cjs` (word-level forward-reference sweep). Ad hoc
SQL sweeps for §2.1–2.4 and §3 were run directly via `psql` and are reproduced inline above rather
than saved as separate files.
