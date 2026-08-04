# deu_at_for_eng — Final Pass (2026-07-20)

Opus orchestrator + 6 Sonnet reviewers over all 668 seeds (12,581 phrases).
Course entered the pass at **668/668 `drafted`, zero approved**.

⛔ **TTS remains on HOLD.** Nothing here authorises audio.

---

## 0. STRUCTURAL — three seeds are completely empty

**Seeds 67, 305, 321 have 1 LEGO and ZERO phrases each.** Seed grid reports all three as
`drafted`, not as gaps — so **mass-approve would have marked them complete**. This is the
`mass-approve-marks-empty-seeds-complete` trap firing for real.

| Seed | Known | Target |
|---|---|---|
| 67 | Why do you want to stop? | `wieso wüst aufhörn?` |
| 305 | woman | `Frau` |
| 321 | a book | `a Buach` |

This contradicts the build record of "668/668, 0 gaps, PASS" — the decompose validator and
the seed grid both miss empty seeds. Worth fixing at the tooling level: a seed with a LEGO
and no phrases should never read as `drafted`.

⚠️ **Cross-course signal:** `ara_eg_for_eng` is recorded as having empty seeds at **305 and
321** — the same two numbers. Two unrelated courses failing on identical seed numbers points
at the shared seed source or the seed-splitting step, not at either builder. Worth checking
305/321 across every course built from this seed list.

## 1. What needs Kai — systematic text sweeps

These are **text fixes, not deletions**. I am not authorised to PATCH phrase text, and
deleting the affected phrases would gut whole seeds. Each was confirmed by course-wide
counts, not by reviewer impression.

### 1a. `wir` → `mir` — seeds 395–414 (~190 phrases)

A single contiguous builder-session drift to standard German. **Zero** uses of `mir`
anywhere in those 20 seeds; 236 other seeds use `mir`. Seed 394 is clean, 415 has no
we-phrases, 416 reverts correctly — so the block is exactly 395–414. Independently
confirmed by reviewer-4 walking the boundary seed by seed.

Plus a mixed wir/mir state in **507, 577, 579, 580** (~8 phrases). Seed 579 is the worst:
every phrase carrying the `'s` clitic says `wir hobn's` while the same seed's other LEGO
correctly says `mir hobn`.

Safe as a mechanical replace (`wir` is only ever nominative "we").

### 1b. `die` → `de` — 19 seeds, 153 hits

Clusters: **85, 87, 88, 101, 105, 107, 111, 112, 113, 116, 123, 125, 126, 173, 343, 591,
592, 598, 622**. Worst: 126 (32), 116 (19), 592 (19). Course-wide `de` = 859 hits/155 seeds.

⚠️ **NOT a safe blind find/replace.** `mit die Leit` (S0085L01B03, S0085L01U04) is authentic
Bavarian dative plural (*mit den Leuten*) and must be **preserved**. Only nominative/
accusative uses (`die Arbeit` → `de Arbeit`, `die beste Wahl` → `de beste Wahl`) are the leak.
A naive `sed` over this will corrupt correct dialect.

### 1c. Formal-Sie zone (642–655) — two capitalisation bugs, 44 phrases

Found by reviewer-6 checking *inside* the zone I'd marked "intentionally standard German",
rather than skipping it. Both verified by direct scan of all 227 phrases in the zone.

**ISSUE B — meaning-changing, fix first.** Lowercase `sie` where formal `Sie` is required:
**23 phrases** in seeds **646 (9), 647 (9), 655-L01 (5)**. Lowercase `sie` reads as
*she/they*; the known side says "you". So `sie machen etwas` currently means "they do
something" against a known text of "you're doing something". The `und`-prefixed and
`dass`-embedded siblings in the same seeds correctly capitalise, which is what exposes it.
Zone totals: 23 lowercase vs 112 correct `Sie`.

**ISSUE A — 21 phrases.** A capitalised word left capitalised mid-sentence, after `und` or a
comma: `und Wie fühlen Sie sich`, `jo, Ich kann Ihnen helfen`, `und Was denken Sie`.
Root cause (reviewer-6): the citation-form component (C01) was pasted verbatim into a
mid-sentence slot without re-casing — confirmed by seed 648, whose component is lowercase
`was` and whose sentence is correspondingly correct. Affected: 642, 644, 645, 649, 650,
651, 652, 653, 654, 655.

Both are mechanical and safe: `sie`→`Sie` throughout 646/647/655-L01; lowercase the
post-`und`/post-comma word everywhere except `Sie`/`Ihnen`/`Ihr`.

### 1d. Sentence-initial lowercase nouns — 48 phrases

German nouns capitalised mid-sentence but lowercase at phrase start. Filtered against the
house rule (first letter lowercase *unless* the word is also uppercase mid-sentence), so
these are genuine defects, not style. Full list: `noun_caps_defects.json` in the run scratchpad.

**A second caps class — 29 more, MID-sentence.** The scan above only catches phrase-initial
lowercase. A separate scan for nouns lowercase *mid*-sentence found 29 instances across 10
seeds: seed 250 (`antwort` ×9 — whole LEGO), 186 (`freind` ×5), 196 (`gschicht` ×3), 185
(`buach` ×2), 133 (`leit` ×2), 194, 195, 163, 168, 178. Total caps defects: **77 phrases**.

⚠️ One entry to DROP from that list: `alles` (S0141L01B01). My scan counted `alles`
capitalised 7× mid-sentence and inferred it was a noun — but those 7 are themselves the
defect. `alles` is an indefinite pronoun and is correctly lowercase; seed 141 wrongly
capitalises it everywhere *including* component C01, so B01 is the only correct instance
in the seed. Seed 141 is a LEGO-level fix in the opposite direction (see §3).

Most frequent: `deitsch`→`Deitsch` (10), `leit`→`Leit` (6), `zeit`→`Zeit` (4),
`ideen`/`idee`→`Ideen`/`Idee` (3), `wörter`→`Wörter` (3), plus singletons
(`fehler`, `sunntog`, `mama`, `doktor`, `schlüssl`, `büro`, `fuaßball`, `antwort`, `anfang`,
`spiele`, `montog`, `händ`, `lust`, `eier`, `nähe`, `alles`, `freind`, `antworten`, `frogn`).

---

### 1d-bis. `gehen` → `gehn` — seeds 540–549 (26 phrases)

A fourth bounded drift block, found by reviewer-5. Unreduced standard `gehen` in seeds
**540 (17), 542 (2), 544 (2), 545 (3), 549 (2)** against `gehn` 227 hits/66 seeds elsewhere.
⚠️ Seed **650 also has 10** — but 650 is inside the formal-Sie zone where standard German is
correct, so **exclude 650 from this sweep**.

### 1e. Question marks — 270 phrases inconsistent

Found by reviewer-5a, quantified course-wide:
- **80 phrases** where the known side ends `?` but the target does **not** (58 USE, 22 BUILD),
  across 36 seeds, spanning **255–388** — a bounded block, not course-wide noise.
  e.g. `when do you want to pay?` → `wann wüst zohln` (no `?`).
- **190 phrases** the other way (target ends `?`, known doesn't) — worth a look, though some
  may be legitimate given LEGO-debut fragments never take `?`.
- 566 phrases have `?` correctly on both sides.

House rule is that questions end `?` even when the LEGO doesn't. Recommend a dedicated
qmark sweep rather than per-phrase fixes; note this is text-only and does **not** require
audio regeneration.

### 1f. Register target question — `va-` reduction (needs Kai's decision)

reviewer-2 found that S0205 `i hob des Wort vagessn, des wos i sogn wollt` is **verbatim one
of the 12 canonical reference examples** in `reference-examples/deu_at.json`. So the
`ver-`→`va-` reduction (`vagessn`, `vastehst`, `vabringen`) is brief-approved canon, not
drift. That inverts the question: seeds 113–173 mostly spell out `verstehst`/`versteh`
(16 hits/8 seeds) while `vastehst` appears in 4 seeds. **Which is the target register?**
Not a defect either way — needs a register decision before any normalisation sweep.

### 1g. `ois` homophone collision (methodology question)

`ois` is used for both **`als`** (as — "ois Lehrer", "ois Gruppn", seeds 197/209) and
**`alles`** (everything — "ois fühlt si leichter an"). Both are authentic Bavarian, so
neither is an error, but one target form now carries two distinct knowns. That's
ZUT-adjacent and worth a deliberate call rather than leaving it implicit.

## 2. Phrases deleted (50)

Each verified against full seed context before deletion. Grouped by fault class:

- **`zum` after a modal / conditional aux** (modals take a bare infinitive; `versuchen` and
  `haben` legitimately take `zum`): S0225L01U03, S0229L01U05, S0140L02U01/U02/U04/U05.
- **Separable verb unsplit in a main clause**: S0121L03U02/U03/U05.
- **Bare infinitive where a finite verb is required**: S0122L03U05 (`i sehn` → `i siech`),
  S0562L02U03 (`dass i … hinkumman` → `hinkumm`), S0190L02U02/U03/U04/U05 (`Frogn stell`
  after a modal → `stelln`).
- **Wrong case / agreement, against a correct sibling in the same LEGO**: S0134L02U02/U05
  (invariant dative `wos Schwierigem` in a nominative predicate), S0181L01U03 (`dein Mama`
  vs the LEGO's own `meine Mama`), S0182L02U04/U05 (`dein Schlüssl` vs `meine Schlüssl`),
  S0170L01U05 (`sagen` takes a dative recipient → `deim Freind`), S0284L02U04 (nominative
  `der Bruada` as an accusative object).
- **Gender mismatch** (`sie` + masculine `mein Freind` → `meine Freindin`): S0163L01U04,
  S0178L02U04, S0181L01U05.
- **Known/target mismatch**: S0294L01U05 (known "can call", target has no modal),
  S0311L04U05 (known "doesn't believe", target "doesn't want to believe").
- **Missing subject**: S0151L01U01 (`dass passiert` → `dass des passiert`).
- **Inverted LEGO used as a bare declarative** (`soitn mir` is correct only after a fronted
  element or as a question): S0534L02U05, S0540L02U05, S0545L02U03, S0545L04U04.
- **Construction break against the LEGO's own pattern**: S0555L02U05 (`z'miad, dass i … hol`
  against the LEGO's established `z'miad zum` + infinitive).
- **Verb-first LEGO used where subject-first V2 is required**: S0094L02U02/U05
  (`i glaub, wird's funktionieren` → `i glaub, es wird funktionieren`; the same LEGO is
  correct in questions and after a fronted element, and seed 99 shows the correct
  `i glaub, es funktioniert`).
- **Accusative-only LEGO reused in nominative**: S0560L01U01 (`in Weg geht owi bis zum Dorf`;
  the same LEGO's B01 correctly has `der geht owi`).
- **Separable verb unsplit in main clause, 2nd cluster**: S0095L02U02/U04, S0095L03U02/U03.
- **Wrong auxiliary**: S0527L02U03 (`gfoin` takes *haben* — `hot ma gfoin`, per S0476/S0531).
- **Case after a two-way preposition**: S0466L03U04 (`vor` + stationary → dative `vor da
  Mauer`), S0528L04U01 (motion `gehn in` → accusative, not dative `an ondan Zimmer`).
- **Adjective declension**: S0545L04U05 (`mein saubere Gwand` → strong neuter `saubers`).
- **Person mismatch**: S0492L01U06 (known 1sg "I don't know", target `sie woaß ned`).
- **Feminine possessive missing `-e`**: S0105L02U03 (`dein Antwort` → `deine`; the course has
  `deine`+fem 24×). Distinct from the masc-acc case above, which is a genuine convention.
- **2sg missing `-st`**: S0328L01U04 (`du sollt` → `du sollst`).

The original detail table for the first seven:

| Phrase | Text | Fault |
|---|---|---|
| S0225L01U03 | er tat ma **zum** sogn, wos a wü | `zum` after conditional aux `tat`, which takes a bare infinitive |
| S0229L01U05 | de Frau wü ma **zum** sogn, wos s' wü | `zum` after modal `wü`, which takes a bare infinitive |
| S0121L03U02 | **hernimmst** dein Auto? | separable verb unsplit in main clause → `nimmst dein Auto her?` |
| S0121L03U03 | wieso **hernimmst** dein Auto ned? | same |
| S0121L03U05 | du **hernimmst** des ned gern | same |
| S0122L03U05 | i **sehn**, wia's lauft | infinitive as finite 1sg → `i seh` |
| S0562L02U03 | i hoff, dass i sicher **hinkumman** | infinitive where subclause needs finite 1sg → `hinkumm` |

`versuchen` takes `zum` + infinitive; modals (`wü`, `tat`, `kann`) take a **bare** infinitive.
That split is correct in the course and is what makes the first two deletions safe.

---

## 3. LEGO-level — need rebuild or native check, NOT deletion

Errors sitting in BUILD phrases or invariant LEGO components. Deleting the USE phrases
would leave the faulty component in place and break tiling.

- **S0368L01B03/B04** — `host Paradeiser anbaun` / `er hot Paradeiser anbaun`: plain perfect
  needs a participle (`anbaut`), has the bare infinitive. Contrast `ghobt`, `greist`,
  `zuagstimmt` elsewhere. (Distinct from `angfangt`, which reviewer-4 confirmed across
  seeds 341/433 as a deliberate course-wide weak-participle regularisation — leave alone.)
- **S0599L02U01** — `i warat kumman`: same class, bare infinitive in the participle slot of
  Konjunktiv II Perfekt. Same seed's `i warat gern gfoahn` shows the correct pattern.
- **S0131L01B03 + U04** — `in dein Kopf`: locative `in` takes dative, and the same LEGO uses
  `in meim Kopf` correctly. Should be `in deim Kopf`.
- **S0257/S0258 `blaue`** — component C01 is invariant `blaue`, so it doesn't inflect:
  `a blaue Ding` (wants strong neuter `a blaus Ding`) and `mit dem blaue Ding` (wants weak
  dative `dem blauen Ding`). Design question about invariant adjective components, not a
  one-phrase fix.
- **S0355L02 `wost du`** — clitic `wo`+`-st` AND an explicit `du` (`de wost du kennst`).
  Reviewer-4 corroborated against S0362 `wiast gangen bist` and S0388 `mit der wost redst`,
  both of which use clitic-only. Needs a native call.
- **S0393L04 `mit'm grean Leiberl`** — missing weak dative adjective ending, against the
  directly parallel S0394L03 `mit'm gelben Kleid`. Native check.
- **Seed 270 — worst single seed in the course.** LEGO L01 is built verb-final as
  `i Angst hob`, correct only when subordinate (`weil i Angst hob`, correct in B02 and
  L03U04/U05). It is then reused as a MAIN clause in B03, B04, B05, all of U01–U06 and
  L02U06 — `i Angst hob, weil i iatz gehn muass` should be `i hob Angst, weil…`. The course
  uses correct V2 `i hob Angst` in seeds 521, 522, 535, 617. ~11 phrases on a broken base.
  Also S0270L02B01 `dass i z'spät` is missing the finite `bin`.
- **Seed 141 `Alles`** — `alles` is an indefinite pronoun and must be lowercase, but the
  seed capitalises it everywhere including component C01. B01 is the only correct instance.
- **Seed 610 reflexives** — wrong-person reflexives baked into BUILD phrases:
  `mir miassn se a Arbeit suachn` needs 1pl `uns`; `i wü se a Arbeit suachn` needs `ma`;
  `kannst du se a Arbeit suachn` needs `da`. Component C03 hardcodes `se`.
- **Seed 667** — impersonal `es macht … aus` over-conjugated to 2pl: `mochts eich olle wos
  aus` should keep 3sg `macht's`. Confirmed against the parallel formal-zone
  S0653L01B01 `macht es Ihnen etwas aus`. ~9 phrases.
- **Seeds 635/637 `Jane`** — dative `da Jane` correctly used after `mit` and in
  `da Jane ia Toschn`, but wrongly reused in nominative/accusative slots where feminine
  `de` is required (`des is da Jane`, `mogst da Jane?`, `wo is da Jane`). 6 instances.
- **Seeds 648/663** — register mix: informal 2sg `moanst` paired with formal `Sie` +
  `gnädige Frau` (648), and with 2pl `es olle … hobts` (663).
- **Seeds 265/281** — the a/an accusative distinction collapses: `a Freind`/`a Kaffee` used
  as accusative objects where the course elsewhere marks `an Freind`, `an Monn`. Component
  C01 hardcodes invariant `a`.
- **S0284L02U04** — `kennst du der Bruada…`: nominative `der` as accusative object of
  `kennen`, should be `den Bruada`. **Deleted** (a one-off, not a LEGO pattern — every
  sibling in that LEGO is feminine/plural).
- **Seed 95 (L02/L03)** — second separable-verb cluster, same class as 121: `hoamfohrst`
  built as a subclause-final fragment then reused in main-clause questions. The 4 USE
  misuses are deleted; the BUILD fragment S0095L02B01 is the root. reviewer-1b checked every
  other separable verb in 11–112 and found no further clusters.
- **Seed 485 (L02)** — `wegzukumman` (zu-infinitive) after a modal in 9 of 10 phrases;
  modals take a bare infinitive → `wegkumman`. U01 is correctly exempt (`ois` takes the
  zu-infinitive legitimately).
- **Seed 499 (L02) + downstream 534/540/545** — LEGO built INVERTED: known "we should" →
  `soitn mir`. Correct after a fronted element (`vielleicht soitn mir gehn`) and as a real
  question, but ungrammatical as a bare declarative. 4 USE misuses deleted; the LEGO is
  the root. Backfill constraint: any phrase using it needs a fronted element.
- **Seed 327** — component C01 hardcodes `a → an` (accusative), so existential `do is an
  andern Weg` is accusative where nominative `a anderer Weg` is required. Same shape as
  265/281.
- **Seed 331** — the LEGO's own gloss is wrong: B01 is glossed "to provide the answers" but
  targets `olle Antworten liefern` (= ALL the answers). Known-side fix, not phrase deletion.
- **Seed 328** — component `sollt` is invariant, so `du sollt scho` lacks the 2sg `-st`.
- **Seed 520 (L02)** — `de gonzn Familie` where nom/acc wants `-e`. Low confidence: `gonz`
  appears **only** in seed 520 course-wide (8 hits, zero `gonze`), so there's no same-lexeme
  counterexample and Bavarian does generalise `-n`. Native call.
- **Seeds 332/335** — `mit seine Schwester` (dative fem wants `seiner`) and
  `seine wertvolle Ideen` (weak plural wants `-en`). The second is the cleaner call.

---

## 4. Reviewer false positives — overruled, logged so they aren't re-litigated

The reviewers repeatedly inferred a course norm from a local sample and reported every
deviation as systematic. Base rates went the other way in every case below.

| Claim | Reality |
|---|---|
| `sie` → `si` leak (reported 6×) | **`sie` is correct.** 842 hits/280 seeds. `si` (132 hits) is overwhelmingly the *reflexive* (`sich`), e.g. `es fühlt si guat an`. The doctrine never lists sie→si. |
| `wor` should be `woa` | Free variation: 87/28 seeds vs 102/43 seeds. |
| `Mann` should be `Monn` | Near-even: 45/6 seeds vs 50/11 seeds. Consistency note at most. |
| `ma` should be `mir` (S0118L03U02) | `ma` is the attested unstressed clitic of `mir` (=we), distinct from dative `ma` (=me). |
| `mein Bruada` needs accusative `meinen` | Bavarian commonly leaves the accusative masculine possessive unmarked. `an oiden Monn` isn't a counterexample — `an` (=einen) is a separate lexical form. |
| `bittn wolln hot` clause-final aux | **Partly reversed — see §3.** Attested in Bavarian, but the course's own base rate is 40 aux-before vs 4 aux-final. reviewer-3's follow-up argument was right; now a consistency item for native check, not a settled non-error. |
| `kennt` should be `gkannt` | `i hob'n kennt` is standard Bavarian for "I knew him". Reviewer-4 independently confirmed the ge-dropping pattern. |
| `angfangt` weak participle | Deliberate course-wide regularisation, recurs consistently. |
| lowercase sentence-initial `sie` | Required by the house first-letter-lowercase rule. |
| `de Wohrheit` should be `die Wohrheit` | **Inverted.** `de` is the dialect form and correct; `die` is the leak being swept the other way. |
| `konn` is a localised slip for `kann` | 42 hits across **18** seeds (vs `kann` 318/91). Widespread variant, not a slip. |
| `kennan` should be `gekonnt` (seed 564) | `gekonnt` appears **0 times** course-wide; `hätt … kennan` recurs uniformly 19×. Bavarian generalises the Ersatzinfinitiv. Intentional. |
| `wos bsonders` should be capitalised | Base rate runs the other way: 5 lowercase vs 1 capitalised. The single `gonz Bsonders` in seed 574 is the outlier, not the four. Consistency item at most. |
| `warum gehn ma…` needs `mir` | Retracted by reviewer-2 itself: `-ma` is the genuine enclitic (cf. `gemma`, `samma`). |
| `ma` after a subordinator needs `mir` | **`ma` is the norm:** dass ma 37/dass mir 16; wenn ma 33/wenn mir 2; wia ma 34/wia mir 0. It also covers impersonal `man` — S0091L02B03 known text is literally "that ONE can answer". |
| `angfangt` should be `angfangen` | `angfangt` 41 hits/9 seeds, `angfangen` **0**. Uniform course-wide convention. |
| `wolln` + noun object should be `gwollt` | `gwollt` appears **0 times** course-wide. Settled convention, not an error. |
| `in Kopf` / `in Weg` corrupted | Authentic Bavarian reduced accusative: `den` → `in`. Correct. |
| `wort`/`wart`, `amol`/`amoi`, `voi`/`voll`, `poa`/`poar`, `schon`/`scho`, `friacher`/`früher` | Spelling variance, same class as `wor`/`woa`. |
| `sehgn` should be `sehn` (reported 7×) | Both common: `sehgn` 26 hits/14 seeds, `sehn` 46/14. Free variation, not drift. |
| **ein-words never inflect for masc acc** (`mein Opa`, `über dein Freind`, `sein Naumen`) — reported as "the single most pervasive gap" | **`meinen`/`deinen`/`seinen`/`einen` = ZERO hits course-wide**, against `mein` 183, `sein` 97, `dein` 46 across 90+ seeds. A uniform course-wide convention, and it matches Bavarian. NOT a defect. (Distinct from `a`/`an`: `an` (=einen) IS a live form the course uses, so an *indefinite article* left as `a` in accusative — seeds 265/281/327/546 — remains a real LEGO-level issue.) |
| `zweitn`/`gonzn`/`erstn` should take `-e` in nom/acc | **`zweite`/`erste`/`gonze` = ZERO hits course-wide**; only `zweitn` 24, `erstn` 27, `gonzn` 9. Ordinals/quantifiers never take `-e` here. Seeds 476, 477, 520 are all fine — earlier low-confidence flag on 520 now fully withdrawn. |
| `in Kopf`/`in Weg`/`in folschn Job` corrupted | Bavarian reduced accusative `den` → `in`. S0559L03B01 glosses "the" → `in` outright. Correct in accusative. **Exception:** seed 560 reuses it in NOMINATIVE (`in Weg geht owi`) where the same LEGO's B01 correctly says `der geht owi` — that one's real, LEGO-level. |
| `si in folschn Job aussuacht` needs no `in` | `in` = `den`, so this reads `sich den falschen Job aussucht`. Correct — all 11 phrases in S0535L04 stand. |
| `ma` for `mir` (we), reported 11× as "fixable by one grep" | Already settled: `ma` dominates after every subordinator and also covers impersonal `man`. A blind grep-replace here would corrupt ~100 correct phrases. |
| `wolln` + noun object should be `gwollt` | `gwollt` = ZERO hits course-wide. Settled convention. |

---

## 4b. Backfill — deliberately NOT run (tool would re-inject the deleted bugs)

Deletions left **3 seeds under-threshold**: 121 (L3, needs 2), 134 (L2, needs 1), 140 (L2,
needs 3) — 6 USE phrases total. I did **not** fire `POST /api/build/backfill-phrases`.

The served brief (`GET /api/brief/deu_at_for_eng/backfill-phrases`) has two disqualifying
properties for this course:

1. **No dialect context.** It says only "Austrian German" — no Graz persona, no
   `reference-examples/deu_at.json`, no do-not-use list. It would write standard/generic
   Austrian German into a young-Graz Styrian course. This is the same gap I had to patch by
   hand in the reviewer briefs.
2. **It mandates verbatim LEGO reuse** — "target_text MUST contain the exact LEGO target
   text verbatim". For seed 121 the LEGO target is `hernimmst`, the **unsplit separable
   verb**. Any main-clause phrase built to that instruction reproduces exactly the bug I
   deleted (`hernimmst dein Auto?`). Only subclause phrases are safe, and nothing in the
   brief says so.

The other two LEGOs carry similar hidden constraints the brief doesn't state:
- **134/L2** `wos Schwierigem` is an invariant **dative** chunk (component C02 hardcodes the
  dative ending). It is only valid after `an`/`mit`; a nominative predicate use produces
  `des is wos Schwierigem`, which is the error I just deleted.
- **140/L2** `ma zum zoagn` is a `zu`-infinitive chunk valid after `haben`/`versuchen` but
  **never after a modal** — and the target must stay contiguous, which sharply limits the
  legal frames.

These 6 phrases need authoring against the dialect doctrine with the per-LEGO constraints
stated explicitly. Recommend either a hardened backfill brief or hand-authoring them for
native check. Flagged rather than filled — filling them badly is worse than leaving 3 seeds
short, since the course is on hold for review anyway.

## 5. Approval status — deliberately NOT approved

Phase 3 mass-approve was **not run.** Two reasons:

1. deu_at is under a standing hold pending Kai's review of
   `deu-at-graz-consistency-sweep.md` (~17 flags) plus the seed grid. Mass-approve would
   flip all 668 to approved and silently clear that gate.
2. The three sweeps in §1 touch ~390 phrases across ~45 seeds. Approving now would mark
   seeds complete that still need a text pass.

**Recommended order:** run the §1 sweeps (respecting the `mit die Leit` exception) → decide
the §3 LEGO-level items → re-run the grammar pass over the touched seeds → then approve.

## 6. Method note for the next variant final pass

The stock `final-pass-reviewer` brief describes the course only as "Austrian German" and
hands reviewers a standard-German checklist. Against a dialect course that produces a flood
of false positives — the reviewers here still over-called register leaks six times even
*with* a hardened brief carrying the Graz doctrine and an explicit do-not-flag list.

The brief endpoint should take the dialect reference (`services/briefs/reference-examples/
<lang>.json`) into the reviewer prompt automatically for any variant course, and should
instruct reviewers to report suspected course-wide norms as **questions with counts**
rather than as errors. Base-rate checking at the orchestrator caught every false positive
here, but only because nothing was deleted on a reviewer's say-so.
