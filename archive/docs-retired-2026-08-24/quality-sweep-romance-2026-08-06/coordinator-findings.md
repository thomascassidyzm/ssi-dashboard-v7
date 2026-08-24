# Quality sweep — Romance for-English courses (coordinator findings)

2026-08-06. Slice: Portuguese, Spanish, Italian, French — all variants — for English speakers.
Database read with the **SUPABASE_SERVICE_KEY** (never the anon key). Course codes were discovered
from the live `courses` table, not assumed.

## The seven courses, and their live status

| course | language | seeds | seeds approved | status / app / visibility |
|---|---|---|---|---|
| `spa_for_eng` | Spanish (Castilian) | 668 | 668 | released / live / public |
| `spa_mx_for_eng` | Mexican Spanish | 668 | 300 | beta / beta / public |
| `por_for_eng` | European Portuguese | 668 | 659 | released / live / public |
| `por_br_for_eng` | Brazilian Portuguese | 668 | 668 | beta / beta / public |
| `ita_for_eng` | Italian | 668 | 667 | released / live / public |
| `fra_for_eng` | French | 668 | 666 | released / beta / public |
| `fra_ca_for_eng` | Quebec French | 668 | **0** | draft / draft / **hidden** |

Six are live to learners. The seventh is the held-back one.

Local dump row counts reconciled **exactly** against `count(*)` per table per course, so nothing in
this report rests on a silently truncated fetch. (`.order('id')` + `.range()` paging times out on
these tables; paging by `seed_number` window does not.)

## Method note — every count here has been through false-positive elimination

Kai has cut worker headline counts by two thirds before. So: no raw hit count appears below as a
finding. Each detector was calibrated against a case known to be present, then its hits were
hand-checked, and the raw and confirmed numbers are reported separately.

The clearest illustration is the "dangling preposition" detector I built after hand-reading
`por_for_eng` S204. It went **559 raw → 6 confirmed** across four rounds of correction:

1. 559 raw. Nearly all false — BUILD phrases are *meant* to be fragments, and there the English
   dangles too (`"I'm trying to"` → `"j'essaye de"`), so the learner is fine.
2. Required an asymmetry (English complete, target dangling) → still noisy: `gosto de`, `un po' di`,
   `non riesco a` are legitimate lexical tiles where the preposition belongs to the verb.
3. Restricted to trailing **articles** (an article is syntactically obliged to have a noun after it;
   a bare preposition is not) → 59. Still wrong: European Portuguese clitics attach with a **hyphen**
   (`vi-as`, `encontrar-nos`, `disseram-nos`) and the hyphen is not `\p{L}`, so the lookbehind let
   them through as trailing articles. All three are correct Portuguese.
4. Excluded hyphens and the indefinite articles that double as pronouns (`una` = "one"), and
   completed the English preposition list (`through`, `across`, `along` dangle in English too) → **6**.

**The word-boundary trap bit this one detector three separate times** — apostrophe (`quelqu'un`),
hyphen (`vi-as`), and the ASCII-only `\b`. Every regex in this sweep uses `(?<!\p{L})…(?!\p{L})`
with `/u`, never `\b`.

## What the structural checker found

I read all 1,477 lines of `.claude/commands/scan-course.md` and ran its deterministic checks (1–18)
against all seven courses rather than inventing my own detectors.

**Returned zero on all seven, verified:** wrong script (3/4), unpronounceable (6), speech-mark
wrapping (7), trailing periods (8), Spanish `llevar`+gerund (17a), Italian subjunctive after
`penso che` (17b), European-Portuguese `você` (17e).

### Confirmed, high confidence

| finding | count | where |
|---|---|---|
| Builder metadata `(introduce:false)` in learner-facing Spanish, **spoken by the TTS** | 135 phrases | `spa_mx_for_eng` |
| Presentation audio announces a different English gloss than the LEGO teaches | **my count was low — see Corrections** | corrected: `fra_ca` **406**, `ita` **134** |
| Learner-facing lowercase `i` where English requires `I` | 1,488 phrases + 76 LEGOs | `fra_ca` 1,422, `ita` 65, `por` 49, `por_br` 23, `spa_mx` 5 |
| Exact duplicate practice rows inside one LEGO | 978 redundant rows / 949 groups | `ita` 313, `por` 311, `fra` 284, `por_br` 42, `spa` 28 |
| English prompt is Spanish (never translated) | 2 phrases | `spa_mx_for_eng` S0480 |
| ZUT conflicts (same known → two targets, `is_new` LEGOs) | 2 | `fra_ca` "i know" → `j'sais`/`j'connais`; `spa` "anyone" → `nadie`/`cualquiera` |
| Spanish negative polarity (English NPI, Spanish still positive) | 13 of 14 candidates | `spa_for_eng` S183–185, S309, S311 |
| Target dangles on a complete English prompt | 6 of 559 raw | `por` S204, `ita` S69, `fra` S183 |

### The metadata leak is the most severe thing in the slice

`spa_mx_for_eng` is **live and public**. 135 component phrases have the builder's `introduce` flag
concatenated into the Spanish, and they were sent to TTS in that state. `word_boundaries` — the only
field that proves what was actually voiced — shows the clips speak it:

```
S0635L01C02  "es (introduce:false)"       spoken: es ( introduce : false )       3696 ms
S0589L02C01  "autobús (introduce:false)"  spoken: autobús ( introduce : false )  4128 ms
S0627L01C02  "café (introduce:false)"     spoken: café ( introduce : false )     3888 ms
```

A one-word component clip should be well under a second. Five sixths of each clip is a learner being
read a JSON flag.

**This is not confined to the slice.** Estate-wide: `hak_for_eng` **3,974**, `spa_mx_for_eng` 135,
`deu_ch_for_eng` 128, `eng_for_mar` 54, `ita_for_jpn` 42. Only `spa_mx_for_eng` is in this sweep's
slice — per the ladder, the rest is **reported, not fixed**.

### Checks 11/12 — vocab ordering

Check 11 Cat A (a USE phrase whose English introduces an unmet word) gave 70 across the slice. After
stemming, 37 are morphological artifacts (`knew`/`know`, `told`/`tell`, `arrives`/`arrive` — the
tokenizer does not stem, a documented limitation) and **33 involve a genuinely new English word**.
Of those, roughly 15 are fresh lexical items with no bridge — `myself` (ita S65), `while` (ita S91),
`already` (por_br S59), `both`/`also`/`first`/`actually` (spa S283/262/225/300). These are
**candidates, not confirmed defects** — each needs the "is there a bridge?" judgement, and I did not
sweep or fix them. Listed here as a residual backlog.

While building this I inverted the `phrase_role !== 'use'` filter and put the USE phrases being
tested into the "already known" vocabulary, which made the check report 70/70 clean. Corrected.

## What hand-reading seeds found that the checker could not

### `ita_for_eng` S82 — the seed is a two-speaker dialogue, and the whole LEGO inherits it

Seed: `"I'm not going to wait for you. Why not?"` — that is person A and person B. The LEGO
`"why not"` → `"perché no"` is then practised as if one speaker says both halves, producing seven
USE phrases like:

```
"can you help me? Why not?"        -> "puoi aiutarmi? Perché no?"
"I'm ready to start. Why not?"     -> "sono pronto a cominciare. Perché no?"
```

`"can you help me? Why not?"` is not something anyone says. A structural checker sees only
"multi-sentence phrase"; the actual defect is that a dialogue was used as a seed.

### `por_for_eng` S204 — the LEGO's own gloss never appears in its practice prompts

LEGO `"of the"` → `"dos"`. Its USE phrases:

```
"I don't remember the names"  -> "não me lembro dos nomes"     (English has no "of the" at all)
"I like my friends"           -> "gosto dos amigos"            ("my friends" vs "the friends")
```

The learner is asked to produce `dos` from prompts that contain nothing corresponding to it. And in
the same seed, LEGO `"to deal with"` → `"tratar dos"` yields the ungrammatical build
`"she is going to deal with it"` → `"ela vai tratar dos"` — `dos` cannot end a phrase.
This is the "bad LEGO mapping" shape scan-course describes: the natural unit is `tratar de` + noun.

### `fra_ca_for_eng` S639 — one target form taught under two different English glosses, inside one LEGO

LEGO tile says `"you (formal)"` → `"vous"`. Its own BUILD phrases say:

```
"with you all"                 -> "avec vous"
"I want to speak with you all" -> "j'veux parler avec vous"
```

`vous` genuinely *is* both formal-singular and plural, so there is a reason for two senses — but
Kai's rule is that when two senses must stay separate they are used consistently in different
contexts and **never mixed**. Here they are mixed inside a single LEGO: the tile drills one sense,
the builds drill the other. Also, the USE phrases in this seed (`"with you today"`,
`"with you right now"`, `"no sir today"`) are fragments, not sentences — USE is supposed to outrank
BUILD in quality, and here it is inverted.

### `spa_for_eng` S185 — a broken sentence in a released course, duplicated twice

```
EN: I think you left your book somewhere in the office but I'm afraid I haven't seen it anywhere today
ES: Pienso que dejaste libro en algún sitio en oficina pero me temo que no las he visto en algún sitio hoy
```

Four defects in one sentence: `dejaste libro` (missing `tu`), `en oficina` (missing `la`),
`no las he visto` (feminine plural pronoun for the masculine singular `libro` — should be `lo`), and
`en algún sitio` under negation where Spanish requires `en ningún sitio`. Every sibling BUILD in the
same LEGO gets the articles right (`"Dejaste tu libro"`), so this is an island against a consistent
body — a defect by the fix-agent-rules test, not a dialect choice.

**Scanning for the pattern** gave the negative-polarity class: 14 candidates, **13 real**, one false
positive (`"No estoy seguro de si conozco a alguien"` — the `alguien` sits in a positive embedded
clause and is correct). The real ones are S183/184/185 (`en algún sitio` → `en ningún sitio`) and
S309/S311 (`nunca … algo así` → `nada así`).

Calibrating this detector took three corrections, each of which silently hid the case I already knew
was there: `n't` is preceded by a letter so the lookbehind blocked it; and comparing only the *first*
match position dropped sentences with a legitimate early `algún sitio` and a defective later one.

### Duplicate practice rows — 978 redundant rows

Found by hand-reading, not by any scan-course check. Exact duplicate `(known, target)` pairs inside
the same LEGO and role: `ita` 313, `por` 311, `fra` 284, `por_br` 42, `spa` 28; `fra_ca` and
`spa_mx` have none. The learner gets the identical drill twice in one LEGO, and it consumes the
13-phrases-per-LEGO budget. Note this is the *harmless* duplicate direction only in the
two-English-prompts sense — these are byte-identical on both sides, so it is pure redundancy.

## Canadian French — is there anything that would justify holding it back?

**Yes, two things, and neither was recorded anywhere.** Both are fixable.

**1. It has never been through content review.** `fra_ca_for_eng` is **0 of 668 seeds approved** —
the only course in the slice at zero; every other is 300–668. Its audio was nonetheless generated to
99.9% completeness (audio run completed 2026-07-29, 33,906/33,947 clips). So it is not that someone
held it back; it never cleared the approval gate, and the audio ran ahead of the review anyway.
That is a process gap rather than a content verdict, and it explains the absence of a recorded reason.

**2. 406 of 1,359 LEGOs (29.9%) have presentation-audio drift** — 243 severe. (I first measured 275; see Corrections.) The presenter announces
one English phrase and the screen shows a different one. Verified in context at S0039:

```
LEGO S0039L01 "i'm" -> "chu"        presentation says: "The French for: 'tired', as in — 'but I'm a little tired', is:"
LEGO S0039L02 "tired" -> "fatigué"  presentation says: "The French for: 'this morning', as in — 'he doesn't want to be quiet this morning', is:"
```

By comparison `fra_for_eng` has **zero** drift. This is an audio defect, so under the current hold it
cannot be fixed here — it needs an approved presentation-audio regeneration pass.

Also worth a decision, reported not fixed: the presentation audio says *"The French for:"* on a
course whose display name is "Quebec French for English Speakers".

**What is NOT a reason to hold it back:** the colloquial Québécois register (`chu`, `j'vas`,
`à matin`, `ptit`). Tom ruled on this on 2026-07-29 — "fra_ca's colloquial Québécois register is
**deliberate and intended** — protect as-designed; no re-authoring toward standard register"
(`docs/course-optimization/dialect-scaffold-decision-pack.md`). Its content is otherwise complete:
668/668 seeds decomposed, 0 flagged, 12 of 12,887 phrases missing known audio.

## Corrections — where the workers beat my numbers

Three worker reports survived (`fra_ca_for_eng.md`, `ita_for_eng.md`, `por_br_for_eng.md`, all in this
directory). They corrected me on a real defect in my own scan, and their numbers supersede mine.

**My Check 18 undercounted presentation drift by roughly half.** Presentation clips come in *two*
carrier formats, and my regex only anchored on the second:

```
The French for: 'X', is:                 <- 630 of 1,359 fra_ca clips.  MY REGEX SKIPPED ALL OF THESE
The French for: 'X', as in — 'Y', is:    <- 729 of 1,359 clips.         only these were checked
```

Verified directly: 1,359 clips fetched, 729 matched my pattern, 630 matched the one I skipped, 0
matched neither. So I silently checked 54% of the course and reported the result as a course-wide
count.

| | my figure | corrected |
|---|---|---|
| `fra_ca_for_eng` | 275 | **406** of 1,359 (29.9%) — 243 severe, 163 mild |
| `ita_for_eng` | 62 | **134** of 1,379 |

**Note this bug is in `scan-course.md` itself**, not just my implementation — the documented Check 18
regex is `/^The\s+\w+(?:\s\w+)?\s+for:\s+'([\s\S]*?)'\s*,\s*as in/i`, which cannot match the
plain `', is:'` format. Any previous course scanned with it has the same blind spot. Worth fixing in
the checker.

**The `fra_ca` worker also found the root cause, which I had not.** Every seed was re-decomposed on
2026-07-16/17. Presentation clips for seeds 301–668 were re-baked afterwards and drift there is
**zero**; seeds 1–300 were never re-baked. **All 406 drifted clips were created in 2026-04; none in
2026-07.** The damage is therefore concentrated in the first 300 seeds — the part of the course every
learner sees first.

**Other corrections to my scan:**

- `por_br` — identical `known==target` is **18, not 2**, and hand-checking says **all 18 are false
  positives** (cognates). My cognate allowlist was too short.
- `por_br` — my ZUT check (Check 10) was **under-scoped**: it only compares `is_new` LEGOs, and the
  worker found the real defect one level down, in BUILD phrases drilling a bare article
  (`"the"` → `"o"` at S195 vs `"the"` → `"a"` at S196). It also correctly **declined** to strip the
  `"the (masculine)"` parenthetical, because stripping it would have minted exactly that collision —
  the trap from `fix-agent-rules` §4, live and not hypothetical.
- `ita` — my "zero empty LEGOs" claim was wrong as stated: 60 exist, all `draft`/`is_new=false`,
  so the conclusion (nothing actionable) stands but the number did not.

I am reporting these against myself because an uncalibrated count is not evidence, and mine was not
calibrated on the format split.

## What was fixed, and by whom

I dispatched nine workers (seven per-course hand-readers, two class fixers). **A server restart
killed all nine mid-flight.** Only one ever reported, and it reported `failed`. They had already
written real, competent fixes to the live database and none of them produced a report, so I verified
their work against my pre-sweep dump and finished the classes they left half-done.

### Completed and gated (whole-class re-scan returns zero)

| class | fixed | verification |
|---|---|---|
| Learner-facing lowercase `i` | **1,564** (895 by the worker, **669 by me** after it died) | class detector re-run across all 7 courses, phrases + LEGOs + seeds → **0** |
| `(introduce:false)` metadata in Spanish text | **135** (by the worker) | full paged re-scan of 12,688 phrases → **0** |
| Stale links to metadata-speaking clips | **258 clips on 129 rows unlinked** (by me) | re-scan: leaking text 0, stale links 0 |
| English prompt was Spanish (`spa_mx` S0480) | **2** re-authored | ZUT-checked (no collision), vocabulary-checked against seed 480 |

**The half-fixed state was worse than either endpoint, and this is the thing most worth knowing.**
The worker corrected the text on all 135 `spa_mx` rows but died before unlinking the audio on 129 of
them. So `target_text` read `"café"` while `target1_audio_id` still pointed at a clip whose
`word_boundaries` prove it says `café ( introduce : false )`. Because the *link* still existed, the
dashboard would have reported **0 missing audio** — the fix would have looked complete while learners
kept hearing the flag, with nothing left on screen to hint at it. That is precisely the trap
scan-course describes in its closing section. Now unlinked; no `course_audio` row was deleted
(row counts identical before and after), nothing regenerated.

On the lowercase-`i` fix I did **not** unlink, and the evidence is:

```
course_audio.text             "I'm going to relax"
course_audio.text_normalized  "i'm going to relax"     <- the matching layer is CASE-FOLDED
```

so a case-only edit creates no mismatch, and `i'm`/`I'm` are voiced identically. Unlinking would have
manufactured a ~1,500-clip regeneration backlog during an audio hold, for a defect no listener can
hear.

### Landed unreported by the killed workers (verified by me against the pre-sweep dump, not re-derived)

- `fra_ca` — the ZUT conflict I flagged was resolved by **differentiation**: S0085L02 became
  `"I don't know"` → `"j'connais pas"`, so it no longer collides with S0059L01 `"I know"` → `"j'sais"`.
  Slash gloss `"still/anyway"` → `"still"`; parenthetical `"what (question)"` → `"what...?"`.
- `fra_for_eng` — 80 phrases; redundant `"French"` dropped from prompts, and real grammar fixes
  (`"tu es très bien"` → `"tu es très bon"`).
- `ita_for_eng` — 30 phrases converted from `"penso che sia molto contento"` to
  `"penso di essere molto contento"`. That is correct Italian: same subject in both clauses takes
  `penso di` + infinitive, not `penso che` + subjunctive. A genuinely sophisticated fix.
- `por_br_for_eng` — 34 phrases, `"pôr"` → `"colocar"` (Brazilian preference), `"pergunto"` →
  `"me pergunto"`, plus slash/parenthetical cleanups.

I did not re-derive these from scratch; I confirmed each is coherent and none deleted a row
(0 phrases deleted, 0 added, across all four courses).

## A defect my own fix uncovered — reported, NOT fixed

Stripping `(introduce:false)` revealed something it had been hiding. Those 135 rows had
`known_text` = `"café"` and `target_text` = `"café (introduce:false)"`, so no identical-text check
could ever see them. With the flag gone, **71 of them are now `known_text` == `target_text`, both in
Spanish** — the English gloss was never written for any of them.

- 71 rows, **all `component` role**, seeds **602–667**.
- All 71 came from the leak set; **0 pre-existing**, so this is one generator failing in the course's
  last tranche, not scattered rot.
- Examples: `"quedarnos"`, `"necesitábamos"`, `"hubiera"`, `"sabido"`, `"de otra manera"`.

Severity is real but bounded: components are intentionally partial and are never drilled bare
(`fix-agent-rules` §5), so this is not a USE phrase asking a learner to translate Spanish into
Spanish. It is still 71 English glosses that do not exist. **I have not fixed these** — writing 71
component glosses is authoring work that wants a careful pass, not a mechanical one.

This is the ladder's rung 4 working as designed: fix the flagged thing, then look for related
patterns failing for the same underlying reason.

## Found and deliberately NOT fixed

- **Presentation-audio drift, 370 LEGOs (204 severe).** Cannot be fixed without regenerating audio,
  which is barred. Note the killed workers *unlinked* 209 presentation clips as a partial response —
  see the audio section below, because that needs your decision.
- **978 duplicate practice rows** (`ita` 313, `por` 311, `fra` 284, `por_br` 42, `spa` 28). Exact
  duplicate `(known, target)` pairs inside one LEGO. Deleting is safe and obvious, but it changes
  phrase counts against the per-LEGO minimums, so it wants one deliberate pass rather than a
  half-finished sweep — which is the mistake this session already demonstrated.
- **13 Spanish negative-polarity defects**, hand-confirmed out of 14 candidates: `spa_for_eng`
  S0183/S0184/S0185 (`en algún sitio` → `en ningún sitio` under negation) and S0309/S0311
  (`nunca … algo así` → `nada así`). Exact phrase ids are in
  `scripts/romance-sweep/polarity-spa_for_eng.json`. Left alone because `spa_for_eng` had a worker
  assigned and I could not tell it to stop.
- **The `spa_for_eng` S185 broken sentence** — four defects in one row, duplicated twice (see above).
- **33 Check-11 vocab-ordering candidates**, ~15 genuinely fresh lexical items. Candidates, not
  confirmed defects.
- **The `(introduce:...)` leak elsewhere in the estate**: `hak_for_eng` **3,974**,
  `deu_ch_for_eng` 128, `eng_for_mar` 54, `ita_for_jpn` 42. Outside the slice — reported, not touched.
  `hak_for_eng` is the one to look at next.

## Audio now out of sync — needs approval

**630 links were nulled during this sweep window** (measured as the delta against my own pre-sweep
dump, not estimated):

| course | phrase known-side | phrase target1 | LEGO presentation |
|---|---|---|---|
| `fra_ca_for_eng` | +14 | +38 | +49 |
| `fra_for_eng` | +60 | +71 | 0 |
| `ita_for_eng` | +2 | +30 | **+106** |
| `por_br_for_eng` | +4 | +23 | +45 |
| `por_for_eng` | +1 | 0 | +2 |
| `spa_for_eng` | +9 | +35 | +3 |
| `spa_mx_for_eng` | +2 | **+132** | +4 |
| **total** | **+92** | **+329** | **+209** |

**No `course_audio` row was deleted anywhere** — verified by row count before and after. Nothing was
regenerated. Every one of these is an unlink, so the rows now correctly read as missing and an
approved pass can fulfil them.

**Two things here need your decision, Kai:**

1. **258 of the `spa_mx` target unlinks are mine and I am confident in them** — the clips genuinely
   say the wrong thing, so unlinking is required by doctrine.
2. **The 209 presentation unlinks are not mine and I am less comfortable.** The workers unlinked
   drifted presentation clips on **live** courses (`ita_for_eng` +106 is the big one). That trades
   *wrong* audio for *no* audio at the LEGO introduction. It stops the learner being told the wrong
   thing, but it is a live regression until an approved regeneration pass runs. If you would rather
   have the wrong announcement than silence in the meantime, this is reversible — the clip rows all
   still exist and I have the pre-sweep dump with every original id.

Separately, and pre-existing rather than caused here: `spa_for_eng` was already missing **354**
known-side and **347** target1 links before this sweep started.

## Gaps

- **I could not observe my own workers.** `GET /api/conversations` returns only `user: tom`
  conversations — my own conversation is not in it either — so the nine workers I dispatched were
  invisible to me throughout. I confirmed they were alive only indirectly, from the scratch scripts
  they wrote into the shared tree. There is also no message endpoint, so I could not hand a
  mid-flight finding to a running worker.
- **Check 11/12 vocab-ordering candidates (33) were not swept or fixed** — listed above as backlog.
- **Check 16 (underpopulated LEGOs)** returns 92–375 per course, but **zero are empty**; every hit is
  "fewer than 2 use phrases". Informational, deliberately not actioned.
- **I did not verify anything by ear.** All audio claims rest on `course_audio.text`,
  `word_boundaries` and `duration_ms`, not on listening to S3 objects.
- Kai does not speak French; nothing French in this report is referred to him for adjudication.
