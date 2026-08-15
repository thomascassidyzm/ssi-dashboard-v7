# ind_for_eng — decomposition build report

**2026-08-15 · Indonesian for English speakers · TEXT ONLY, NO AUDIO GENERATED**

---

## How far it got

| | Before tonight | After tonight | Remaining |
|---|---|---|---|
| Translated seeds | 668 | 668 | 0 |
| Seeds decomposed | **0** | **25** | **643** |
| LEGOs | **0** | **75** (27 A, 48 M) | — |
| Practice phrases | **0** | **557** (213 BUILD + 344 USE) | — |
| Component rows | 0 | 86 | — |
| Audio clips | **0** | **0 — unchanged** | — |

**25 of 668 seeds (3.7%) are decomposed.** The course is **not** built. It is a
quality-checked opening block with everything downstream of decomposition in place for those
25 seeds, and a clean runway for the next agent to continue from **seed 26**.

**No TTS was run. No audio was generated. `course_audio` for this course held zero rows before
this session and holds zero rows now.** Kai's hard rule was observed without exception.

Shape: 3.0 LEGOs per seed, 22.3 practice phrases per seed, USE outnumbering BUILD 1.6 : 1.
Self-assessed USE scores average **7.60** (17 at 6, 119 at 7, 193 at 8, 15 at 9; nothing below 6).

---

## Premise check — and one correction to the census

Verified against the live database **before** anything was written:

- `ind_for_eng` exists, created **2026-08-11**, status `draft`.
- **668 seeds**, numbered 1–668, **no gaps**, every one carrying an Indonesian `target_text`.
- **0 LEGOs, 0 practice phrases, 0 audio rows** before this session. Census correct on all three.

### ⚠️ The census said 300-seed standard tier. The evidence says 668-seed flagship.

The brief flagged that the 300-vs-668 tier was inferred rather than read. It was — and the
inference is **wrong**. Two independent pieces of evidence:

1. **`courses.seed_count` is NULL** for this course. The "300" comes from a hardcoded
   fallback: `services/course-builder/routes/course-data.cjs:259` reads
   `courseData?.seed_count || 300`. That is why `/api/resume/ind_for_eng` reports
   *"0/300 done (target: seeds 1-300)"* — it is a default, not a tier.
2. **The course's own `translation_analysis` plans past seed 300.** It explicitly describes
   *"address-form drills in the final seed block (**639-668**)"*, and the corpus delivers
   them: `kalian` appears in 15 seeds, `Bapak`/`Ibu` in 17, all late.

**This is a 668-seed flagship build whose translation half is complete.** Whoever picks it up
next should plan for 668, not 300. The cheap fix is to set `courses.seed_count = 668` so the
resume endpoint stops reporting a fictional target — I have **not** done that, because
changing a course's declared size is a scope decision for Kai, not a build step.

---

## The affix question — the rule adopted, and why

Indonesian is Latin-script and regular but **agglutinative**: `me-`, `ber-`, `per-`, `-kan`,
`-i`, `-an`, `-nya`, `se-…`. One written word can carry what English spreads over several.
The brief asked for a stated rule rather than a forced decomposition. Here it is.

> **Indonesian affixes are construction-features, never units of intention. The learnable unit
> is the whole orthographic word.**

Three consequences, applied throughout:

1. **No affix is ever a LEGO or a component.** `belajar` = "to learn" is one A-LEGO; there is
   no `bel-` + `ajar`. `namanya` = "his name" is one M-LEGO; there is no bare `-nya` card.
2. **Root and affixed form are two whole-word LEGOs, and the overlap does the teaching.**
   Seed 20 teaches `nama` = "name" and then `namanya` = "his name". The learner sees the piece
   inside the bigger piece and infers `-nya` with nothing explained — which is exactly the
   mechanism the methodology already prescribes for conjugation in other languages.
3. **Structural particles are absorbed inside a whole thought.** `lagi` (progressive), `yang`
   (relativiser), `itu` (definite), `akan` (future), `tidak` (negator) never get a card and
   never get a component row of their own. They are covered for tiling by the M-LEGO's own
   target, and the gloss names the **whole intention** — `saya lagi coba` = "I'm trying", not
   "I" + "progressive" + "try".

**Two independent reasons this is right, not a convenience.** The doctrinal one is
ralph-methodology's *intention-units vs construction-features* distinction: a learner never
forms an intention to "say `-nya`". The mechanical one is that the tiling validator is
whitespace-word based (`validation.cjs:126-147`) — a sub-word affix LEGO **cannot tile at
all**, so the method and the tool agree.

### Where this pair needed *less* than the standard method, and why

The layered-decomposition brief in this repo is written for Japanese, where almost every
combination hides a conjugation, a reordering or a particle, so overlapping M-LEGOs are the
norm. **Indonesian is the opposite case**: analytic, SVO, no verb inflection, no case, no
agreement. Most combinations are transparent concatenation in English order, and the brief's
own rule — *"DON'T overlap when the composition is transparent"* — then bites.

So overlaps here are **reserved for five things**, and used nowhere else:

| Overlap reserved for | Example |
|---|---|
| affixed form vs its root | `nama` → `namanya` (S20) |
| an enclitic or particle that must be absorbed | `saya lagi coba` (S2), `apa yang akan terjadi` (S12) |
| a fixed multi-word unit | `bahasa Indonesia`, `orang lain`, `hari ini`, `cari tahu` |
| negation placement | `saya tidak yakin` + `saya tidak bisa ingat` (S10) |
| a word-order difference from English | `bahasa Indonesia sedikit` = "a little Indonesian" (S9) |

That last one is worth naming: Indonesian puts `sedikit` **after** the noun phrase where
English puts "a little" before it. That is a genuine reordering, so it earns an overlapping
M-LEGO. It is also **question B** for a native speaker, because it is the one place the corpus
made a word-order choice we cannot verify.

**One deliberate departure from a checklist item.** Seed 13 ("You speak Indonesian very well")
gets a **single** LEGO, against the brief's "no single-LEGO seeds for 5+ word seeds". By seed
13 every other word in that sentence is already taught; the only new unit is `dengan sangat
baik`. Rather than manufacture a second LEGO to hit a count, its two pieces (`sangat` = very,
`baik` = good) are declared as **introduced components**, so nothing load-bearing is acquired
by accident and no fake card is created.

### The contrastive twin at seed 10

Negation (`tidak`) is the most load-bearing feature in the whole opening block, and it first
appears at seed 10. Rather than let it arrive by accident inside one phrase, seed 10 gives it
a **contrastive twin debut** — two overlapping M-LEGOs sharing the feature:

> `saya tidak yakin` = "I'm not sure"  ·  `saya tidak bisa ingat` = "I can't remember"

The learner meets `tidak` twice, in two different frames, both whole natural thoughts, and
infers its position before the verb without a rule being stated. `saya tidak bisa ingat` is
**not** a slice of seed 10's own sentence — it is deliberately constructed. That is flagged
honestly in the self-check below, because it is exactly the shape a slicing bug would take.

---

## The mis-pairing defect scan — run on my own output, with numbers

The brief warned of a live estate-wide defect coming from the **shared decomposition
machinery**: a LEGO's known and target sides failing to correspond because one side was sliced
from a *different word in the same seed sentence*. Confirmed in four unrelated language pairs,
in one case as a four-card rotation.

**I ran the scan on my own 75 LEGOs and 557 phrases, reading them back out of the database —
not from my authoring state.** Script: `.a108-ind/selfcheck.cjs`. Results in full, including
the zeros.

### Check 1 — does each LEGO's target actually sit where its known side says it does?

Method: for every LEGO, test whether its target text is a **contiguous word-span of its own
seed's target sentence**. An off-by-one slice — a card holding the neighbouring word's
material — either fails this outright or lands on a span another card already claims. Then,
separately: do any two LEGOs **in the same seed** with *different* known text claim the
**identical** target span? That is the rotation signature.

| Result | Count |
|---|---|
| LEGO targets that are **not** a contiguous slice of their own seed | **2** |
| Same-seed LEGO pairs claiming the **identical** span with different known text | **0** |

**Both of the 2 are deliberate and are named above**, which is the point — the check surfaced
exactly the two rows I already knew about, and nothing else:

- `S10L4 "I can't remember" → "saya tidak bisa ingat"` — the contrastive twin for negation,
  constructed on purpose, not sliced.
- `S20L1 "name" → "nama"` — the root card added on purpose so `-nya` becomes inferable.

**No off-by-one slice was found. No rotation was found.**

### Check 2 — the self-contradiction test (needs no Indonesian)

Method: build two maps across **every LEGO and every non-component phrase** — known→target and
target→known. Any known text mapping to two different targets is a defect. Any target reached
by two different knowns is a convergence, legitimate only if deliberate.

| Result | Count |
|---|---|
| **Same known → different target** (each one a defect) | **0** |
| **Different known → same target** (convergences) | **10** |

All 10 convergences are the same two deliberate merges, and both are documented features of
Indonesian rather than authoring slips:

- **`dia` covers "he" and "she"** (7 of the 10). Indonesian does not mark gender on the third
  person pronoun. Flagged in the course's own `translation_analysis` before I started.
- **`namanya` covers "his name" and "her name"** (3 of the 10), for the same reason.

Both are *reception*-direction merges, which ZUT explicitly permits, and the methodology treats
convergence pairs as pedagogically valuable — the learner meets "English splits this, Indonesian
unifies it" at first contact with no rule stated.

### Check 3 — the sibling defect: a missing LEGO

Method: walk the 25 seeds in learner order, accumulating every word taught by any LEGO or
component; at each seed, list the words of that seed's target sentence that **nothing has ever
taught**.

| Result | Count |
|---|---|
| Seeds containing a word no LEGO ever teaches | **0 of 25** |

### Check 4 — the untaught-word rule, re-verified from scratch

The API rejects a violating seed outright and inserts nothing; it did so several times during
the build and every rejection was fixed rather than bypassed. Afterwards, an **independent**
pass read all 75 LEGOs and all 557 phrases back out of the database, rebuilt the learner's
vocabulary in strict seed-then-LEGO-index order, and re-checked both sides of every phrase —
the known side token by token against the exact-form gloss vocabulary plus the free glue class,
the target side by dynamic-programming re-tiling from whole introduced chunks only.

| Result | Count |
|---|---|
| Phrases checked | **557** |
| Known-side untaught-word violations | **0** |
| Target-side phrases that cannot be re-tiled from taught chunks | **0** |

**Summary: 4 checks, 0 defects of the kind the brief describes.** That is a clean result on a
25-seed sample, stated with its method so it counts as evidence about the tool rather than as
silence. It does **not** clear the machinery — 25 seeds is a small sample and this build used
the golden path (`POST /api/seed/complete`), which validates tiling and containment *before*
inserting. If the estate-wide defect lives in a **different** write path — edit-cascade, a
backfill, or a regenerate — nothing here would have caught it, and that is where I would look
next.

---

## Things a native speaker must rule on

Published separately as
**`docs/a108/ind-for-eng-native-speaker-questions-2026-08-15.md`** — 14 questions in plain
English, no jargon, answerable by someone who has never seen our system. **Five are BLOCKING**,
meaning the course currently teaches a guess:

| | Question | Exposure if the answer is "no" |
|---|---|---|
| 1 | Where does `sedikit` ("a little") go — before or after? | 22 phrases rewritten |
| 2 | Is `dengan` needed before adverbs (`dengan cepat`, `dengan mudah`)? | 35 phrases rewritten |
| 3 | Does `sebisa mungkin` work with a "you" subject, or only "I"? | 9 phrases; unlocks more |
| 4 | Is `kita` always right for "we", or is `kami` sometimes needed? | 24 phrases; 42 of 668 seeds |
| 5 | Is `jawaban` a real standalone word, or only ever affixed? | one teaching piece deleted |

The list also carries a finding about the **existing translations** that nothing built tonight
depends on: **"better" is rendered two ways** — `lebih bagus` at seed 29, `lebih baik` at seeds
42, 117, 118, 291 and 401. Seed 291 ("speak better") and seed 29 ("speaking better") are the
same intention with two different targets, which is a straight ZUT fork. **Seed 29 is not yet
built**, so this is the cheapest possible moment to rule on it.

---

## Register: the existing translations are internally consistent

The `translation_analysis` claims a colloquial spoken register with bare-root verbs. Measured
across all 668 seeds, **every claim holds and there is not one counter-example**:

| Claimed | Present | Absent form | Occurrences |
|---|---|---|---|
| `bicara` not `berbicara` | ✓ | `berbicara` **0** | 33 seeds |
| `coba` not `mencoba` | ✓ | `mencoba` **0** | 22 |
| `bilang` not `mengatakan` | ✓ | `mengatakan` **0** | 70 |
| `pikir` not `berpikir` | ✓ | `berpikir` **0** | 51 |
| `ketemu` not `bertemu` | ✓ | `bertemu` **0** | 16 |
| `latihan` not `berlatih` | ✓ | `berlatih` **0** | 3 |
| `gimana` not `bagaimana` | ✓ | `bagaimana` **0** | 10 |
| `kamu` as default you | ✓ | `anda` **0** | 139 |

This is unusually clean for a machine-translated corpus and meant **nothing needed normalising**
before decomposition. The one real inconsistency found anywhere in the 668 is the "better" fork
above.

---

## Also produced

**A pair-contract for the pair** — `docs/pair-contracts/ind_for_eng.contract.cjs`. The
methodology says to derive one on first contact with a pair, and there was none. It records the
affix rule above, the convergences (`dia` = he/she, `bisa` = can/could/able, `akan` =
will/going to, `orang` = person/people), the bound English gloss-units (`as often as possible`,
`what the answer is`, `before I have to go`), which English machinery is licensed by which
Indonesian carrier (`going to` by `akan` at seed 5; negation by `tidak` at seed 10; do-support
questions by `apakah` at seed 14), and the one English-side fork this pair must hold apart:
**"if" is never used as a gloss for `apakah`** — `apakah` is always glossed "whether", and "if"
is reserved for `kalau`, which first appears at seed 44. It is marked **`ratified: null`** —
nobody here speaks Indonesian, so it runs advisory until a speaker signs it off.

---

## Explicit gaps

1. **643 of 668 seeds are not decomposed.** The course is 3.7% built. Seeds 26 onward are
   untouched. I am not reporting this as built.
2. **The pair-contract is written but not live.** The running course-builder executes from a
   *different* checkout (`ssi-dashboard-v7-clean-prod`, on `main`) — confirmed by its own health
   endpoint — which is outside this session's workspace. The contract therefore sat on the
   branch while the build ran, and the known-side gate used the generic `_default_eng` fallback.
   Practical effect: the gate was **stricter**, not looser, so nothing bad got through because
   of it. It becomes active only when the branch reaches `main` and the service restarts.
3. **The branch copy of the validator is not what validated this content.** Worker **#682**
   diffed the two checkouts and found four files differ, including a prod-only "bare-LEGO
   phrase" gate in `phrase-structure.cjs` that silently drops a phrase equal to its own LEGO,
   and a prod-only per-submission casing-evidence system in `text-normalization.cjs`. Both were
   hit during this build (the bare-LEGO rejections are why seed 1 was restructured). Anyone
   reading the branch copy to predict submission behaviour will be reading the wrong file.
4. **The ZUT fork-map worker never delivered.** Worker **#680** — the sweep of all 668 seeds for
   English words rendered by more than one Indonesian form — **failed on an account rate limit**
   and produced nothing. Everything about forks in this report was therefore measured
   first-hand in the main session over the corpus, and is limited to what I looked for. **A
   systematic fork sweep over all 668 seeds has not been done.** That is the single most useful
   piece of legwork still outstanding, and it should be run before seeds 26+ are built, because
   a fork discovered at seed 400 is expensive and one discovered now is free.
5. **No Indonesian speaker has reviewed any of this.** The 7.60 average USE score is a
   statement about pedagogical shape by a non-speaker, not about whether an Indonesian would
   say these sentences.
6. **No QA checkpoint ran.** `/checkpoint-qa` has not been run against this content; the
   checkpoint at seed 10 did not block.
7. **`courses.seed_count` is still NULL**, so `/api/resume/ind_for_eng` will keep telling the
   next agent the target is 300 seeds. Deliberately left alone — see the tier finding above.

---

## For whoever picks this up

Resume at **seed 26**. `GET /api/resume/ind_for_eng` gives the next seed; ignore its "/300".
The authored source for seeds 1–25 is `.a108-ind/seeds-1-30.cjs` (gitignored scratch, not
committed) with `submit.cjs`, `precheck.cjs` and `selfcheck.cjs` alongside it —
`precheck.cjs` catches bare-BUILD rows, duplicate phrases, length-ratio breaches, forward
references and untaught words **before** a round-trip to the API, which is worth keeping.
Read the affix rule above and the pair-contract before authoring a single card.
