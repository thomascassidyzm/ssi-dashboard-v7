# A-134 — Gate Verifier report: the 12 restored eng_for_sin presentation examples

**VERDICT: SHIP THE 12.** No gate found a blocking defect. No `lego_id` is held.

Scope reminder: this fix touches only `course_audio.text`/`.duration_ms`/the
`presentation_audio_id` link for 12 of the 27 corrupt `eng_for_sin` presentation
clips (`S0178L02, S0180L01, S0184L02, S0194L01, S0198L01, S0201L01, S0206L01,
S0214L02, S0225L01, S0231L01, S0249L01, S0260L01`). It writes nothing to
`course_seeds`, `course_legos`, or `course_practice_phrases` — the restored
example text is drawn verbatim from a `phrase_role='use'` row (or the seed
sentence) already authored and living in those tables.

**Also found, not looked for:** a second worker (commit `d3ef6c14`, "RENDER
worker") already rendered real TTS audio for these exact 12 texts while this
gate review was underway — same worktree, same branch. Verified byte-identical
to `scripts/a134/recomposed.json`'s `presText` for all 12 (0 mismatches), staged
additively at `repair-candidates/a134-sin12-examples-2026-08-17/`, and passed
its own independent 7-gate audio QA (`ship-log-12.json`: `fail: []` and
`gate7_example_voiced: true` on all 12; tail floor −77.6 to −88.4 dB, all z
within ±1.25 sd). **Nothing is live** — only `relink-dryrun-log.json` exists,
no `relink-applied-log.json` — `relink.cjs --apply` is still the only way past
dry-run, and that is Kai's call, not mine or that worker's. This is corroborating
evidence, not something I re-verified myself (audio QA is outside this gate's
remit); I'm reporting it because it changes what "ship" means operationally —
the asset already exists and is staged, this isn't a "go render it" decision.

---

## GATE 0 — FIDELITY: is `recompose.cjs` a faithful re-implementation?

**PASS.** Line-by-line comparison against `services/phases/phase8-audio-v13.cjs`
(the `/regenerate-presentations/:courseCode` route, ~3300–3555) plus an
independent from-scratch re-derivation, both clean:

- **Weighted-roll thresholds** (0.60/0.85 with both pools, 0.80 USE-only,
  0.70 seed-only) — `recompose.cjs:32-39` vs `phase8-audio-v13.cjs:3481-3518`.
  Identical.
- **`deterministicRand` hash** — `recompose.cjs:10` vs
  `phase8-audio-v13.cjs:3442-3448`. Character-for-character identical (32-bit
  rolling hash, same shift/charCode/mask).
- **USE-phrase ordering**: phase8 paginates the WHOLE course's
  `phrase_role='use'` rows ordered by `id` (3414-3438); `recompose.cjs:17`
  filters `.in('seed_number', seedNumbers)` before ordering by `id`. Confirmed
  this cannot change which phrase wins a `seed_number:lego_index` key: the
  scoped query returned 211 rows (well under any 1000-row page limit, so
  nothing is silently truncated), and relative `id` order within a single key
  is preserved under an unrelated-seed filter. Independently re-derived all 12
  outcomes directly from the DB with a **separately-written** script
  (`scripts/a134-B/gate0_independent_recheck.cjs`) that re-implements the pool
  build + roll from scratch (not copied from `recompose.cjs`) — 12/12 match,
  including the exact `use_phrase` index picked by the second `deterministicRand`
  roll for each.
- **Compound `' / '` handling** — `recompose.cjs:25,43` vs
  `phase8-audio-v13.cjs:3462-3464,3534-3536`. Identical.
- **Overlap-suppression ratio** (`known.length/contextText.length > 0.5`) —
  `recompose.cjs:40-42` vs `phase8-audio-v13.cjs:3522-3528`. Identical.
- **Template**: `recompose.cjs:8-9` hardcodes the template string and
  `TARGET_LANG_NAME`. Verified live against the DB: `presentation_templates`
  has exactly one active `sin` row and its `template` field is byte-identical
  to the hardcoded string; `presentationAuthor.localisedLangName('eng','sin')`
  (the real function phase8 calls at `phase8-audio-v13.cjs:3324`) returns
  `'ඉංග්‍රීසි'`, matching `TARGET_LANG_NAME` exactly.
- **`shortTemplate` divergence, checked and found NOT to matter**: phase8 uses
  `finalTemplate = contextText ? template : shortTemplate`
  (`phase8-audio-v13.cjs:3531`) while `recompose.cjs:44` always uses the full
  template and substitutes `''` for `{seed}`. For the 15 *unrestored* legos this
  could matter — but I ran the real `shortTemplate`-generating regex
  (`phase8-audio-v13.cjs:3408-3410`) against the actual `sin` template and
  confirmed it is a no-op for this specific template shape (none of the
  hardcoded language patterns match Sinhala's `'{seed}' ඉතින්.` construction),
  so `shortTemplate === template` for `sin` and the two approaches produce
  byte-identical output either way. Moot for the 12 restored rows regardless,
  since `changes_vs_823` is only `true` when `contextText` is non-null, i.e.
  `finalTemplate` is the full template in both implementations.
- **Course orientation**: verified directly from the `courses` row —
  `known_lang: 'sin', target_lang: 'eng'` — confirming the commissioning
  brief's stated reverse was wrong and `composer-finding.md`'s correction is
  right.
- **No data drift**: re-ran `recompose.cjs` live against today's DB during this
  review; output was byte-identical to the checked-in `recomposed.json`.

No divergence found. All 4 divergence-candidates the dispatch specifically
named (weighted-roll thresholds, hash, USE-phrase ordering, overlap ratio) were
checked and are clean; the one divergence that does exist (`shortTemplate`
handling) was checked and shown not to affect the 12 in question.

Scratch: `scripts/a134-B/check_template.cjs`, `check_langname.cjs`,
`check_use_query.cjs`, `gate0_independent_recheck.cjs`.

---

## GATE 1 — real course-builder gates, called the way the submit path calls them

**Ran what applies; named the gap on what doesn't reach.**

This fix adds no row to `course_seeds`/`course_legos`/`course_practice_phrases`,
so the two gates that exist to validate *new submitted content* —
`checkTiling` and `checkVocabViolations` (both target/English-side, gating what
gets tiled into `course_legos.target_text` and what vocabulary a *new* phrase
may use) — have no new target-side content to run against here; I did not
invent a synthetic submission to feed them, since that would not be validating
this change, it would be validating a fiction.

What **does** apply and what I ran, verbatim, via the real exported functions
in `services/course-builder/lib/validation.cjs` (not a rewrite):

- **`checkLegoConflict`** (`validation.cjs:476-520`), called exactly as
  `seed-complete.cjs:1134` calls it (`known_text, target_text, seed_number`,
  conflict = existing prior-seed row with same known but different target) —
  run against all **42 LEGOs** across the 23 named seeds:
  **0 ZUT violations.**
- The known-side gate (`checkKnownSide`, `validation.cjs:843-880`) IS exported
  and I called it directly. Its context builder, `buildKnownSideSeedCtx`
  (`seed-complete.cjs:32-70` — fetches prior LEGOs, builds the
  gloss-introduction-position map), is declared at module scope in
  `seed-complete.cjs` and is **not exported** (`seed-complete.cjs:393` only
  exports the route-mounting function). I could not invoke it as the submit
  path wires it without either modifying that source file or reimplementing
  its data-plumbing — the first is out of scope for a verifier, the second is
  the parallel-checker this brief forbids. **Stated as an explicit gap.** What
  I found instead by calling `checkKnownSide`/`compileKnownContract` directly
  with real data is reported under GATE 4, because it turned out to be the
  more important finding: the gate is structurally inert for this course
  regardless of the missing glue code (see below).

Scratch: `scripts/a134-B/gate1_gate2.cjs`, `gate1_known_side_probe.cjs`.

---

## GATE 2 — one Sinhala prompt, two English answers

**Real gate: 0 collisions.** Independent Unicode-aware sweep: 169 course-wide /
19 touching the 23 seeds, **none involving the 12 restored sentences or their
cards.** Not a hold.

Ran the real `checkPhraseZUT` (`validation.cjs:630-661`) two ways:
1. Scoped — every known/target pair from the 23 seeds' LEGOs + practice
   phrases, checked against the whole course (`currentSeedNumber=null`):
   **0 collisions.**
2. Course-wide — the entire course's LEGOs + practice phrases (1,300 + 11,719
   rows) fed through the same function: **0 collisions.**

Per the brief's specific warning (the ara_for_eng precedent — a Latin-only
punctuation strip inflated 0 true defects to 1,126), I also ran an independent,
separately-normalized sweep (`scripts/a134-B/gate2_unicode_sweep.cjs`):
NFC-normalize, strip `\p{P}`+`\p{S}` (full Unicode punctuation/symbols, not a
Latin/CJK literal list), group by normalized known text, flag >1 distinct
normalized target. Result: **169 course-wide collisions, 19 touching the 23
named seeds.** The divergence from the real gate's 0 is explained by
normalization strength, not a bug in either: the real gate's `nk`/`nt`
(`validation.cjs:631-632`) strip only trailing sentence punctuation and compare
near-verbatim; my sweep strips all punctuation everywhere, which is more
aggressive and (per the "know-split clustering trap" precedent) risks
over-merging distinct inflected forms into one bucket.

All 19 are **single-word or two-word LEGO/phrase-level fragments**
(pronouns — අපි "we"/"we're"/"it"; short adverbs — කලින් "early"/"ago"/"before";
modal පුළුවන් "can"/"able"/"could") where a `course_legos` headword and a
`course_practice_phrases` example sentence disagree on the isolated gloss of a
shared word once full context is stripped — the known SSi pattern of a LEGO
teaching an atomic chunk while USE phrases embed the same string inflected
differently in a longer sentence. **None is a full-sentence match on any of the
12 restored example texts**, and none is on a card belonging to one of the 12
affected legos (I checked `card_known` for all 12 against the collision list
directly — no hit). These are pre-existing rows in `course_legos`/
`course_practice_phrases`, unread and unwritten by this fix. Flagged for the
record as a course-wide, out-of-scope observation; not a hold.

One instance worth naming as a **positive** finding: `කලින්` collides 3 ways
course-wide (early/ago/before) — and S0184L02's own card is upchunked to
`ටිකක් කලින්` ("a while ago"), the methodology's own prescribed fix
(UPCHUNK to disambiguate) already applied at authoring time. Not a defect;
evidence the mechanism works.

---

## GATE 3 — ZUT forwards and backwards on the 12 restored sentences

**0 collisions, either direction. Near-conflict framing does not literally
apply to this clip type — flagged, not resolved.**

- Whole-course sweep (GATE 2's data, both real-gate and Unicode-sweep runs)
  checked every one of the 12 full restored sentences as its own `known_text`
  string, in both directions (the sweep is seed-agnostic by construction — it
  groups by normalized known text across all seed numbers at once, so "earlier"
  and "later" are both covered by the same pass): **zero hits.** None of the 12
  strings appears as a colliding `known_text` anywhere else in the course.
- Card-level check: none of the 12 legos' own `card_known` appears in the
  collision list either (see GATE 2).
- Semantic consistency, English side (a check I can make without judging
  Sinhala): compared `card_target` against `context_target` for all 12 —
  every restored example's English gloss is a coherent superset/extension of
  its card's own English gloss (e.g. S0206L01 card "the chance" /
  context "I need the chance to learn English"; S0260L01 card "the faintest
  idea" / context "do you have the faintest idea?"). No semantic drift.
- **The brief's "near-conflict" framing — "a learner could reasonably produce
  a different correct English answer to a Sinhala prompt because the prompt
  lacks context" — presumes the sentence is answered by the learner.** It
  isn't: per the dispatch's own GATE 4 text, "the example is contextual
  illustration in the learner's OWN language and is never translated by the
  learner." The presentation clip's example sentence is spoken audio the
  learner hears, not a prompt they produce from. I'm flagging this framing
  mismatch explicitly rather than silently declaring the sub-check "passed" —
  the question as posed doesn't have a target in this clip type.

---

## GATE 4 — introduction order

**Real gate is structurally inert for this course — proven, not assumed.
Fell back to a stated, disclosed independent standard.** Raw finding: 8 of 12
sentences have 0–1 unresolved token, 2 have 2; every unresolved token reads as
a Sinhala inflectional/case/clitic suffix on an already-introduced root, per
the course's own pair-contract, not a new content word — but I am not
authorised to make that call, so it is reported raw. Target/English side: not
applicable — no English is spoken in this clip type.

**Why the real gate doesn't reach:**

1. `checkKnownSide`'s tokenizer is Latin-script-only by construction.
   `tokenizeKnown` (`validation.cjs:818`) is
   `expandContractions(s).split(/[^a-z']+/).filter(Boolean)` and
   `stemKnownGloss` (`validation.cjs:803-808`) is
   `.toLowerCase().replace(/[^a-z']/g, '')`. Ran both directly against real
   Sinhala text (`scripts/a134-B/gate1_known_side_probe.cjs`):
   `tokenizeKnown("ඔයාව දකින්න ඕනේ වුණත්, මම මහන්සියෙන් හිටියා")` → `[]`.
   `stemKnownGloss("ඔයාව")` → `""`. With zero tokens, `checkKnownSide`'s main
   loop never executes, so it returns `[]` (no problems) for **any** Sinhala
   string — confirmed with a real call: `checkKnownSide(sample, 178, ctx)` →
   `[]`. The gate does not fail to catch a Sinhala vocabulary violation here
   and there; it cannot see Sinhala at all. This is a standing, pre-existing
   condition of the pipeline, not something this fix causes or could fix.
2. Independently, `eng_for_sin`'s pair-contract
   (`docs/pair-contracts/eng_for_sin.contract.cjs`) uses field names
   (`freeClass`, `npi`, `negation`, `knownConstructions`) that don't match what
   `compileKnownContract`/`checkKnownSide` read (`freeGlue`, `npiTokens`,
   `negationWords`, `constructions` with a `carrier`/`cluster`/`test` shape,
   plus a `negationMarkers` regex the contract doesn't define at all).
   Confirmed live: `compileKnownContract(contract)` on the real contract
   produces `glue.size: 0, npi.size: 0, neg.size: 0` even though the contract
   itself declares 18 free-class words, 4 NPI items and 7 negators. Even if
   (1) weren't true, this course's contract wouldn't wire up to the mechanical
   gate as written — it reads, by its own header comment, as "the agent's
   reference knowledge, NOT a regex gate config" (`eng_for_sin.contract.cjs:4`),
   i.e. authored for a human/LLM reader, never for `compileKnownContract`.
3. `buildKnownSideSeedCtx` is unexported (see GATE 1) — a second, independent
   reason the exact submit-path call can't be reproduced even for a
   Latin-known course.

None of this is new: it is a standing condition of `eng_for_sin`'s pipeline
that pre-dates and is unaffected by this fix. I'm reporting it because GATE 4
asked me to run the real gate and be explicit when I can't, and because it's a
materially useful finding for whoever owns eng_for_sin course quality next —
**zero automated known-side vocabulary-introduction checking has ever run on
this course.**

**Fallback standard applied (stated explicitly, per the brief's instruction):**
space-tokenize the Sinhala text of each restored example (Sinhala is written
word-space-delimited even though morphology is agglutinative-suffixal); for
each token, check EXACT match against a whitespace token of any
`course_legos.known_text` (or M-LEGO component `known`) introduced at or
before that seed, OR substring containment in the concatenated prior-vocabulary
text (to allow for the suffixal case/tense/clitic morphology the pair-contract
itself documents — `caseIsSuffixal`, `-ද` question clitic, etc.). Tokens
matching neither are reported as unresolved, **not classified as violations** —
I am verifying, not editing or judging Sinhala grammar.

| lego_id | seed | tokens | unresolved |
|---|---|---|---|
| S0178L02 | 178 | 7 | 1: `මහන්සියෙන්` (instrumental of "tired") |
| S0180L01 | 180 | 7 | 1: `කැමතියි` (inflected "like/want to") |
| S0184L02 | 184 | 5 | 0 |
| S0194L01 | 194 | 4 | 1: `යාළුවද` ("friend" + -ද question clitic) |
| S0198L01 | 198 | 5 | 2: `දුවව` ("daughter" + -ව accusative), `දැක්කා` (past "saw") |
| S0201L01 | 201 | 9 | 1: `ඊයෙ` ("yesterday") |
| S0206L01 | 206 | 5 | 0 |
| S0214L02 | 214 | 6 | 0 |
| S0225L01 | 225 | 7 | 0 |
| S0231L01 | 231 | 5 | 0 |
| S0249L01 | 249 | 7 | 0 |
| S0260L01 | 260 | 4 | 1: `තියෙනවද` ("have/exist" + -ද question clitic) |

Every unresolved token, by inspection against the pair-contract's own
documented grammar (`eng_for_sin.contract.cjs`), is either a case/instrumental
suffix (`-ෙන්`, `-ව`) on a root, a question clitic (`-ද`) fused onto an
introduced word, an inflected verb form, or (`ඊයෙ` "yesterday") a single
adverb — none reads as a never-before-taught content chunk. I am flagging
these as the raw finding the brief asked for and explicitly declining to
clear or fail them: that judgment needs a Sinhala speaker or a real
morphological analyzer, neither of which I am.

**Target/English side:** not applicable. The presentation-clip template
(`{target_lang_name}ෙන්. '{known}'. '{seed}' ඉතින්. :`) is 100% Sinhala —
confirmed against the actual rendered `presText` for all 12 and against raw
`course_audio.text` samples of the corrupt originals (same all-Sinhala shape).
No English is spoken in this clip type, so this fix cannot introduce an
un-introduced English word regardless of which 12 legos are affected.

Scratch: `scripts/a134-B/gate4_known_side_sweep.cjs`.

---

## Files

All scratch under `scripts/a134-B/` (this worktree, not `/tmp`):
`check_template.cjs`, `check_langname.cjs`, `check_use_query.cjs`,
`check_is_new.cjs`, `counts.cjs`, `gate0_independent_recheck.cjs`,
`gate1_known_side_probe.cjs`, `gate1_gate2.cjs`, `gate2_unicode_sweep.cjs`,
`gate4_known_side_sweep.cjs`, plus their `*_output.json` results.

---

**LANDING LINE:** commits on `fix/sin-27-seed-rebuild-2026-08-17`
(this report's commit, added to the branch a prior worker was already using for
the 27-clip repair and the 12-clip re-render). Not merged — `main` has not been
touched. Not deployed — nothing in this branch's work has reached any machine;
the swap itself (`relink.cjs --apply`) has not been run by anyone, verified via
the absence of `relink-applied-log.json` in this worktree at time of writing.
