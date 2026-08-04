# Exception-lego leak sweep — all seeds, 17 courses

**2026-08-04 · READ-ONLY sweep · nothing was written, deleted, queued or generated.**

Hunting the bug class found in `fra_for_eng` S9L3: *a lego whose target form is only valid inside a
particular frame, then recombined into frames where it is wrong.*

> **I am not a native speaker of these languages.** Every grammatical finding below is **SUSPECTED**
> and states the rule I think is broken, so a speaker can adjudicate fast. Confidence is marked on
> each. Where I am unsure I say so.

---

## Summary — read this bit

| # | Finding | Course | Earliest seed | Count | Conf |
|---|---|---|---|---|---|
| 1 | `que` + vowel not elided (`que on` → `qu'on`) | fra_ca_for_eng | **22** | 10 | high |
| 2 | `jusqu'à ce que il/elle` → `qu'il/qu'elle` | fra_for_eng | 396 | 9 | high |
| 3 | `si il` → `s'il` | fra_for_eng | 289 | 1 | high |
| — | *(language-family worker findings merged below)* | | | | |

**Structural headline:** `fra_for_eng` seed 9 is the **only** course in the whole 17-course cohort
that built a language-bound quantifier lego. Every sibling built the generalisable partitive form:

| Course | S9 legos | The "a little" lego |
|---|---|---|
| spa / spa_mx | 2 | `un poco de` ✅ generalises |
| ita | 2 | `un po' di` ✅ |
| por / por_br | 2 | `um pouco de` ✅ |
| fin | 2 | `vähän` ✅ |
| fra_ca | 2 | `un ptit peu` ✅ |
| **fra** | **3** | `un peu` **+ `un peu français`** ⚠️ parler-bound |

French was also left with **no generalisable `un peu de` lego until seed 220**. Between S9 and S220
the only "a little of X" material a phrase-writer had was the `parler`-bound form — so the leak was
close to inevitable, not a fluke. **That gap is the root cause, and it is still open.**

---

## Method (and one correctness trap I hit)

1. Pulled `course_legos` + `course_practice_phrases` for **all seeds** of all 17 courses (direct
   read-only Postgres via `.env.psql`; `phase8-audio-v13.cjs` never required, so no port 3465 bind).
2. Two independent usage extractors, because coverage is uneven:
   - **decomposition-based** — exact, uses the `decomposition` jsonb `legoId` per segment;
   - **substring-based** — Unicode-normalised, with CJK-aware word-boundary handling.
3. Flagged legos used in **≥2 distinct preceding contexts** (recombination candidates), then
   narrowed to those carrying a bound feature (article / particle / case / contraction / infinitive).
4. Language-family specialists adjudicated the grammar.

### The normaliser test the brief asked for — done first, and it mattered twice

Verified on `jpn_for_eng`, `zho_for_eng`, `kor_for_eng`, `ara_for_eng` **before** any analysis:

| raw | ASCII `\w` | Unicode `\p{L}` |
|---|---|---|
| `来年` | `""` | `来年` |
| `준비됐어요` | `""` | `준비됐어요` |
| `لا أُمانِعُ` | `""` | `لا أمانع` |

ASCII `\w` zeroes **100%** of CJK/Arabic. All normalisation uses `/[^\p{L}\p{N}\s']/gu`.

**The same trap bit a second time, in `\b`.** My first contraction pass reported `à+le → au` against
*"je serai **là le** mois prochain"* — because JS `\b` is also ASCII-only, so it sees a boundary
inside `là`. That pass produced **733 hits, mostly false**. Rebuilt with `(?<![\p{L}\p{N}])` /
`(?![\p{L}\p{N}])` under `/u`: **425 hits, 20 high-confidence.** Anyone repeating this work should
assume every ASCII-implicit regex construct is unsafe here, not just `\w`.

*Caveat worth knowing:* `\p{L}` excludes combining marks, so Arabic harakat are stripped
(`أُمانِعُ` → `أمانع`). Good for matching, but it means this sweep **cannot see vowel-diacritic
errors** in Arabic. Listed as a gap.

### Calibration — would this have caught the known bug?

Replayed the 8 deleted rows from `docs/backfill-2026-08-04/deleted-un-peu-francais-leak-2026-08-04.json`:
`un peu français` appeared after **7 distinct preceding contexts** (`peux dire`, `veut apprendre`,
`voulons apprendre`, `j'aimerais apprendre`, `veux apprendre`, `apprends tu`, `souvenir d'`).
Threshold is ≥2 — **the detector surfaces it.** Method is calibrated against a known positive.

**Post-fix state verified clean:** all 21 surviving `un peu français` phrases (seeds 9–19) are
governed by `parler`, plus the S9 lego debut. The deletion was complete; no residue.

---

## RECOVERY ADDENDUM (2026-08-04, later same day) — harvest after the 16:10 restart

**For Kai.** The 46-worker fan-out you dispatched at 15:56–16:09 was killed by a command-surface
restart at 16:10:09 mid-flight — 45 workers SIGTERM'd, none notified (the orphan-notification path
failed silently; that's a separate infra bug worth a look, not covered here). Nothing was lost
permanently: command-surface persists every tool call verbatim, so this is a straight harvest from
the dead workers' event streams, not re-analysis. Below is everything recovered, plus what a bounded
re-run still needs to cover.

### 1. The stranded shard report — `leak-deu-at-ch`

This worker actually **finished** (16:09:07, 62 seconds before its parent `leak-ita-deu` was killed)
and queued its report for delivery. The parent died before reading it, so it has sat undelivered in
command-surface's `queue` table (`job_id f3a420c8…`) ever since. Full text, recovered intact:

**deu_at_for_eng (Austrian)** — 4 findings, verb-final order baked into a lego then used as a bare
main clause (needs verb-second):

| Seed/lego | Known → target | Broken phrase | Fix needed | Conf |
|---|---|---|---|---|
| S0102L02 | "it's not like that" → `des ned so is` | `S0102L02B01` standalone | `des is ned so` (V2) | High |
| S0391L02 | "is walking towards the bus" → `zum Bus hingeht` | `S0391L02B01` standalone | `geht zum Bus hin` | Med-High |
| S0526L02 | "you cannot guess it" → `des ned erroten kannst` | `S0526L02B01` standalone, no subject | `du kannst des ned erroten` | High |
| S0655L01 | "you are doing it very well" → `sie das sehr gut machen` | `B01/B02/B04/U04` standalone (also: `Sie`/`sie` capitalisation only inconsistent on the broken rows — corroborating evidence) | `Sie machen das sehr gut` | High |

**deu_ch_for_eng (Swiss)** — 1 finding: `S0389L01U01` "he agreed with that person over there" →
`er isch mit die Person det äne iiverstande gsi`. `mit` governs dative everywhere else in the course
(`mit ere`, `mit dem, was`, `mit dim Fründ`…) — 100% consistent except this row. Likely error, not
dialect (Med-High).

Checked clean and explicitly not flagged: the `Sie`/`des` formal-register split (24/24 consistent),
`mit die Leit` (S0085L01, held per prior ruling), all case-government on prep+article+noun triples,
relative-clause and indirect-question verb-final legos (correct as-is). Full method notes, gaps, and
the "not queried the DB directly" caveat are in the original worker transcript
(`leak-deu-at-ch`, job `7379d4fc`).

### 2. Recovered interim findings from the dead workers' event streams

Command-surface logs every tool call and its result verbatim per job, so a killed worker's confirmed
findings are readable from its transcript even though it never got to write its final report. Pulled
directly from the `events` table for each job below (job IDs in parens for anyone who wants the raw
transcript).

#### Iberian — 16 DB-verified findings (`leak-iberian`, job `84d69540`)

Worker was **writing its final report** when killed ("All 16 confirmed live in the DB — these are
current, not stale. Writing up my findings now.") — the findings themselves were already re-verified
live against the DB one message earlier. Three pattern classes, all with phrase IDs:

- **Spanish mood leaks** (indicative baked in, recombined into a subjunctive-triggering frame —
  a genuinely new pattern class this sweep's brief didn't name):
  - `spa_for_eng:S0062L01U09` — "I do not think I can remember all the words and help you at the
    same time" → `No pienso que puedo recordar…` (needs `pueda`, subjunctive after `no pienso que`)
  - `spa_for_eng:S0168L04U08` — "I hope I'll be able to come…" → `Espero que podré venir…` (needs `pueda`)
  - `spa_for_eng:S0289L02U15` — "I hope everything is going to be ready…" → `Espero que todo va a
    estar listo…` (needs `vaya a estar`)
  - `spa_for_eng:S0532L02B02` — "I'm sure that they're lucky" → `estoy seguro de que tengan suerte`
    (mood inverted the other way: `estoy seguro de que` triggers indicative, `tengan` is subjunctive
    — should be `tienen`)
  - `spa_for_eng:S0558L01B03` — "I wish it's so late…" → `ojalá es tan tarde…` (needs `sea`, `ojalá`
    always triggers subjunctive)
  - `spa_for_eng:S0253L01U02` — "She said she should be ready…" → `Ella dijo que debería estar
    listo…` (gender: she → `lista`, not `listo`)
- **EP obligatory-proclisis violations** (enclitic used where the `que`/`se` before it obligatorily
  triggers proclisis — 14 total found, top 4 verified live):
  - `por_for_eng:S0118L01U04` — "I think I feel better than you" → `acho que sinto-me…` (needs `acho
    que me sinto`)
  - `por_for_eng:S0524L03U02` — "she said I'll call you back…" → `ela disse que eu ligo-te…` (needs
    `que eu te ligo`)
  - plus 12 more of the same shape at S0507L02 ("mudámo-nos") and S0572L03 ("esqueceste-te") — full
    list of 14 in the transcript.
- **`precisar de` + infinitive** (por_for_eng): 52 distinct phrases correctly use `precisar de` +
  infinitive; **exactly one** (`por_for_eng:S0071L04U03`, "I need to hear the answer" → `preciso
  ouvir a resposta`) drops the `de` — internal-consistency proof this is a defect, not a register
  choice.
  - Also flagged: `por_for_eng:S0491L01B03` "the way to do it" → `a maneira de o fazer` (likely
    wants the `do` contraction) and `S0281L04U05`/`U11` "before you start to think…" → `antes de que
    empieces pensar…` (missing governed `a`: `empieces a pensar`) and `S0512L02B02` "so that the
    door open" → `para que la puerta abierta` (missing copula, needs `esté abierta`).

Discarded false-positive generators along the way (don't re-run these unmodified): word-multiset
containment on French-shaped inversion; `de um/uma` optionality in EP; the `para`/`parar` homograph
poisoning the governed-preposition scan; most of the gender-agreement scan (real subject reference
resolved most "violations" as correct).

#### Korean — two distinct classes, ~40+ phrases with full lego IDs (`leak-kor`, job `0479c7b5`)

1. **Nominative-baked-into-object-position, onset seed 427.** 40 phrases where a lego debuted with
   baked-in nominative case (이/가) gets recombined into object position by a later phrase. Full list
   by lego, e.g.:
   - `S0427L02` "themselves (subject)" → `자기들이` — 3 bad phrases (`S0427L02U01/U02/U05`)
   - `S0433L01` "the film" → `영화가` — 4 bad phrases
   - `S0436L02` "number of people" → `인원이` — 6 bad phrases
   - `S0455L02` "children (subject)" → `아이들이`, `S0476L02` "second half" → `후반전이`,
     `S0478L01` "heart" → `마음이`, `S0491L01` "appearance" → `모습이`, `S0492L01` "where" → `어디가`,
     `S0494L04` "part" → `부분이` — 3–4 bad phrases each, plus `S0511L01`/`S0546L01`/`S0553L02`/
     `S0567L02`/`S0580L01`/`S0590L01`/`S0614L01`/`S0622L01`/`S0627L01` continuing the same shape
     through the seed-600s (full enumeration in transcript, seq 226–238).
2. **A second, broader "corrupted region" starting at seed ≥556** (distinct signal, found by
   bounding a failure-signature scan — "every failure signature starts at seed ≥556, none before"):
   363/3284 late-course phrases (11.1%) match one of five corruption signatures — `X을/를` + `있/없`
   needing `이/가`/`에` instead (67 hits, earliest s556: `작은 교회가 음악을 있어요` "the small church
   has music"), a filler `교회가` prepended (198 hits), object-marked person used as subject (106
   hits), dropped bound noun `수` before `있` (18 hits), and formal/informal ending mixing (6 hits).
   A 49-item mirror check (subject-marked noun where the gloss implies object) is also logged. This
   class is **not yet triaged into course-vs-audit-fault** — treat as raw signal, not confirmed
   defects, until someone reads seed/sibling context per the R0 evidence standard.

#### Finnish — accusative-baked class + a genuinely new "reverse-French" class (`fin-lego-leak`, job `88853f11`)

- **46 accusative/genitive-baked NP legos** (full inventory with seed, lego ID, known/target, use
  count — e.g. `S0006L02` "a word" → `sanan` (52 uses), `S0523L01` "an excuse" → `tekosyyn` (16
  uses), `S0589L01` "the bus" → `bussin` (16 uses)). Confirmed bug-class instances where the baked
  accusative leaks into a negation-scope frame that requires partitive instead, e.g.
  `fin_for_eng:S0057L01U06` "I don't remember his name" → `mä en muista sen nimen` (negation should
  force partitive `nimeä`, not accusative `nimen`); similar hits on `S0523L01` (`tekosyyn` × 3),
  `S0531L02`, `S0589L01`.
- **New pattern class the brief didn't name — the exact mirror of the French `un peu français` bug,
  reversed**: legos baked **partitive** because their *birth phrase* happened to be negative-scope or
  a non-culminating verb, then recombined into **positive, non-partitive-verb** frames where the
  accusative/nominative is grammatically required instead. 76 candidate legos flagged, e.g.
  `S0018L04` "this evening" → `tänä iltana` (19/25 uses suspicious), `S0036L03` "the story" →
  `tarinaa` (16/25 suspicious, born under `en halua keskeyttää` "don't want to interrupt"), `S0035L04`
  "this afternoon" → `tänä iltapäivänä` (14/20 suspicious). This is the Finnish case-system version
  of the exact structural root cause documented for French S9 above — a lego's case/form got frozen
  to the frame it debuted in, then reused past that frame's boundary.
- Also flagged but not yet confirmed: two legos baking illative (`kysymykseen`, `autoon`) rather than
  accusative — same shape, smaller n; a 3rd-person reflexive possessive suffix baked into two
  seed-52/53 legos, licensed only when the possessor is the clause subject (flagged, not yet checked
  against uses).

#### German — subordinate-clause word-order class (`leak-deu-eng`, job `2035b1f6`)

**13 legos** used both after a subordinator (correctly verb-final) *and* clause-initially as a bare
main clause (incorrectly still verb-final, violating V2). Confirmed with phrase counts either side
(`sub:N main:M`) and full phrase enumeration for the worst offenders:
- `S0063L02` "you don't mind" → `es dir nichts ausmacht` (sub:7, main:1) — `S0063L02B01` "You do not
  mind" → `Es dir nichts ausmacht`, standalone; correct main-clause form is `Es macht dir nichts aus`.
- `S0113L01` "you said" → `du gesagt hast` (sub:4, main:15) — `S0113L01B01` "You said" → `Du gesagt
  hast`, standalone; correct is `Du hast gesagt`. 15 more main-clause uses enumerated in transcript.
- `S0117L05` "we talked" → `wir geredet haben`, `S0127L02` "I wanted to see you" → `ich dich sehen
  wollte`, `S0129L02` "you are doing so well" → `du es so gut machst` (this one also shows the
  Austrian tell: capitalisation of the pronoun is only inconsistent on the broken standalone rows),
  `S0139L02` "I need to leave" → `ich gehen muss`, `S0140L01` "you're trying to show" → `du zeigen
  willst`, `S0051L01`, `S0116L02`, `S0222L01` — same shape, full detail in transcript (seq 118–130).

A **mirror check** (V2-order legos leaked into subordinate frames requiring verb-final) found 24
candidate hits and a broader "Nachfeld-suspect" scan found 117 — **neither of these two was triaged
before the worker died**; several of the 117 read as grammatically fine on inspection (e.g. `wenn du
weißt dass…` is ordinary nested subordination, not a leak). Treat both lists as raw candidates
needing the R0 evidence-standard read, not confirmed findings — unlike the 13-lego class above, which
is confirmed.

#### Japanese — 88 broken `ことがある` (from `jpn-leak-251-668`, job `3d1655f3`, dispatched by `leak-cjk`)

Of 446 phrases containing `ことがある` in seeds 251–668, **88 are truly broken**: the pattern is glued
onto a stem it cannot grammatically attach to (needs plain-form verb or na-adjective + な; instead
found on -te forms, bare nouns, question particles, etc.), starting at seed 485 and running to at
least 635. Examples: `s489 | because make -> 作ってことがある` (te-form + ことがある is not
grammatical — probably lost its て-form conditional/reason marker mid-recombination); `s564 | your
help -> 君の助けことがある` (bare noun, needs な or の); `s569 | how much do you need -> いくら必要か
ことがある` (question particle か directly before ことがある). Full list of 88 with seed numbers in
transcript (seq 101–102). This class was found by `leak-cjk`'s sub-worker `jpn-leak-251-668`, one of
three that re-scanned bands `leak-cjk` was itself already covering — see the duplication caveat in
the meta-review below.

### 3. Banked corpora — the re-run starting point

`scripts/narrow/` (36 files, 34MB, on disk, untracked) holds the per-course candidate JSONs for all
18 courses used by every worker above, plus Korean seed-band splits and full Japanese lego/phrase
dumps. A re-run reads from here, not from a cold DB pull — this is roughly the first several minutes
of work already paid for.

### 4. What a bounded re-run still needs to cover

Per Kai's own meta-review of the fan-out (job `14f75354`, done — read it in full if you want the
fan-out-discipline judgment call, restart-cost accounting, and the "why did the notification never
fire" open question): recommendation was **~15 workers, capped at two levels, starting from
`scripts/narrow/`**. Specifically still open/uncovered:
- The 4 courses above are the ones with confirmed live findings; **`zho_for_eng` got no coverage at
  all** — `leak-cjk` was mid-scan on the `这个` classifier-baked lego (449 uses) when killed.
- Every "candidate" list above that wasn't reduced to a confirmed table (Korean's 556+ region, the
  German 24+117 mirror/Nachfeld lists, Finnish's illative pair and reflexive-possessive pair) needs
  the R0 evidence-standard triage (§0 of the course-generation manual: pull seed + siblings, classify
  a/b/c/d) before anyone acts on it.
- `ita`, `ara`/`ara_eg`/`ara_lb` had workers running (`leak-ita-verbprep`, `leak-ara-fin`) but none of
  the four transcripts I pulled — check those jobs' event streams the same way if their findings are
  wanted (job IDs in the `jobs` table by label).
- The French root cause (no generalisable `un peu de` before seed 220) is a standing decision for
  Tom regardless of whether the sweep resumes — noted in the summary table above, still open.

### 5. Two corrections to what Kai was told earlier

1. **The "missing" backup exists.** `docs/backfill-2026-08-04/deleted-duplicate-phrases-2026-08-04.json`
   (105KB) has all 53 deleted rows with every column, `created_at` timestamp, and the exact dedup
   rule applied (`strict: same lego + same normalised known + same normalised target`). The earlier
   report that it "didn't exist" was a `head -30`-truncated read of a 105KB file, not an absent file.
2. **Scope was 4 courses / 53 rows, not fra/24.** `fra_for_eng` 24 + `cat_for_spa` 9 + `spa_for_eng`
   5 + `por_for_eng` 15 = 53, plus 4 logged soft-conflicts (not deleted). If anything downstream
   assumed fra-only, it needs re-checking against all four courses.

---

**Landing line:** commits on `docs/forced-alignment-experiment-2026-08-04` branch (this branch); not
merged to `main`; not deployed anywhere — this is a documentation-only recovery, nothing to deploy.
