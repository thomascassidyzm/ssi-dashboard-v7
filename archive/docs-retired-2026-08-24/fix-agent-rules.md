# Fix-agent rules

*Harvested 2026-08-06 from `.claude/commands/scan-course.md` and the other places this repo already
encodes fix knowledge. Sources and provenance in the appendix.*

## What this is

One self-contained block of rules for any agent that is about to **change course content** —
a seed, a LEGO, a practice phrase, on either the target or the known side.

`scan-course` is a *detector*: it reports and deliberately never fixes. Everything it knows about
what counts as a defect, what the structural invariants are, and what breaks when you touch a row
was therefore stranded in a tool that doesn't do the touching. This block is that knowledge,
pointed at the agent doing the edit.

**Paste section B wholesale into every fix-agent brief.** It is written to be read cold, with no
other file open. Don't summarise it, don't link to it — a worker who has to go and read something
else will not.

---

# B. THE BLOCK

**The ten lines, if you read nothing else:**

1. A fix isn't done when it's correct — it's done when the course is **consistent**. Check the seed,
   the LEGOs *and* the phrases, everywhere in the course.
2. Has the corrected form been **introduced to the learner before this point**? If not, it's a new
   defect, not a fix.
3. You may reword **both sides**, including the English. You may **delete**. Neither is failure.
4. Ladder: fix exactly what was flagged → verify consistency → sweep the course for the same
   pattern → look for related patterns → other courses **report, don't fix**.
5. **Same known → two targets is a defect. Two knowns → same target is not.** Most reported
   "duplicates" are the harmless direction.
6. Your own fix can **create** a ZUT conflict — stripping a disambiguator merges two clean rows into
   a collision. Re-check ZUT across the course after any known_text edit.
7. **Calibrate before counting.** A detector that hasn't found a known-present case proves nothing.
8. **Never report a raw hit count.** Hand-check, split high-confidence from possible, state method.
9. **No TTS generation without explicit per-batch approval.** Orphaned audio gets listed and
   unlinked, never regenerated.
10. When blocked or unsure: **say so explicitly**. Skip freely with a reason. Never force a fix.

---

## 0. What "done" means

A fix is **not** done when it is technically correct. It is done when the course is **consistent**.

Before you call anything fixed, answer these out loud:

- **Will the learner know to say this?** Or could they be understandably confused?
- **Has the corrected form been INTRODUCED to the learner before this point?** A form that is
  correct but unintroduced is not a fix — it is a new defect.
- **Does the card / LEGO still teach the old form?** If you changed a phrase but the LEGO that
  teaches it still says the old thing, you have made the course *less* consistent, not more.
- **If the same or a similar word is now taught as two different things, is there a REASON?**
  If the two must stay separate, use them consistently in different contexts and **never mix
  them**. If they can be merged, **merge them**.

Check the **seed, the LEGOs AND the practice phrases from EVERYWHERE in the course** — not just the
row you were pointed at. Every fix should be careful and involve a lot of checking.

## 1. The fix space is wide

- **Reword freely.** Don't be afraid to completely reword phrases — *both* the target and the known
  side — if the forms you need to fix it properly aren't available.
- **The known/English side is editable.** It is not a fixed input. The known side is a *controlled
  language* in its own right (see §3), so it is authored, and it can be re-authored.
- **Deletion is a legitimate outcome.** Don't be afraid to just delete a phrase if you can't fix it
  easily. A deleted phrase costs the course a little practice volume; a broken phrase costs the
  learner confidence.

Prefer, in order: fix in place → reword one side → reword both sides → delete. Take the first one
that leaves the course consistent, not the first one that makes the flag go away.

**But check what the phrase hangs on first.** You cannot fully fix a phrase whose underlying
LEGO gloss is broken — rewrite "talking more" into a hundred fresh frames and every one is still
ungrammatical, because the gloss is the defect. Phrase-level rewriting is a *finishing* pass. If
the decomposition or the gloss beneath the row is wrong, fix that or flag it; don't polish rows
that hang off it.

**Submit through the course-builder, don't re-implement the methodology.** `POST /api/seed/complete`
runs every gate — tiling, ZUT, vocabulary, phrase counts — atomically, and rejects the whole thing
with a full problem list rather than partially saving. A previous bespoke rewrite loop that
re-encoded the rules in an agent prompt instead quietly dropped rules the builder already enforces
and shipped 1.3 BUILD / 1.7 USE phrases per LEGO against a floor of 3/5. The builder would have
rejected it outright.

## 2. The escalation ladder

Work outward in this order, and don't skip a rung:

0. **Locate the flagged row by its TEXT, not by its ordinal.** Human reviewers say "Build 1..n" and
   "Cons n" for what the learner sees; the database roles are `component` / `build` / `use` and the
   reviewer's numbering does **not** map cleanly onto `position`. Anchor on the quoted wording, then
   say which role row it actually turned out to sit in. Round numbers (`R####`) resolve to LEGOs via
   the `course_round_index` materialised view — the same one the learner-facing app reads.
1. **Fix the specific thing flagged, exactly as flagged.** Not a reinterpretation of it.
2. **Verify consistency** — §0, on that fix.
3. **Sweep the same course for the same pattern.** The flag is a sample, not a census.
4. **Look for RELATED patterns failing for the same underlying reason.** Defects here come in
   families produced by one upstream generator, not as scattered typos — one root cause routinely
   accounts for hundreds of rows across a course.
5. **Check other courses — but REPORT, don't fix.** Cross-course edits are a separate, approved
   piece of work.

**Exception:** if the flag is itself a request to do something general ("sweep X across the
course"), do the general thing — the ladder is for narrow flags.

**Why rung 3 is mandatory:** a fix script's `ok=N failed=0` log proves the rows *the script
targeted* updated. It is **not** proof the failure class is gone. On `spa_for_eng`, a narrow
`llevar` word-order fix touched one LEGO on 2026-04-20; the reviewer found 11 untouched siblings on
2026-04-30, two passes later. Your definition of done is: **re-run the detector that DEFINED the
issue across the whole course and require zero hits** — never a hand-curated verify list of the IDs
you happened to edit.

## 3. What the learner knows at this point

- **Vocabulary accumulates strictly in order.** For LEGO N in seed S, a phrase may use only: LEGO N
  itself, everything from seeds 1..S-1, and LEGOs 1..N-1 of seed S. **Never a later sibling. No
  forward references.**
- **FIRST-LEGO RULE: LEGO 1 cannot carry content the learner has not met.** At seed 1 LEGO 1 the
  learner knows only that one word — nothing else exists yet. (The build minimums encode this
  exactly: seed 1 LEGO 1 requires 0 BUILD / 0 USE, because there is nothing to combine with.)
- **The KNOWN side is a controlled language too.** The English (or other known-language) prompt is
  not free natural English. It composes from the known-glosses of introduced LEGOs, a small free
  class (glue words, -s/-ed/-ing, do/does/did, "any/ever" under negation), and constructions
  licensed by a carrier that has already debuted. **It must still be grammatically correct and read
  naturally** — Kai ruled on 2026-08-06 that grammatical correctness is hard, naturalness near-hard,
  and a stilted prompt taken for ZUT reasons is a rare per-case exception, never a standing licence.
  (This line used to read *"slightly stilted but tileable is correct"* — the overruled side.) A
  prompt using unlicensed known-side machinery is unmappable — it forks or stalls production
  exactly like a target-side error.
- **Phrases tile from WHOLE already-introduced chunks — never re-split into words.** If your
  rewording needs a conjugation, inversion or contraction that has not been introduced as a whole
  chunk, it is not available to you.
- **FORM discipline is the number-one failure mode.** Not the lemma — the *form*. Every
  target-language word form you use must already be attested at or before this seed. Swapping the
  pronoun in an attested frame is fine; using a frame in a shape the course has only ever shown in
  one other shape is not. In case languages, an object form introduced under negation may only be
  reused where that case is licensed — never invent the form the course hasn't taught. When unsure,
  skip.
- **Multi-word chunks are protected as units.** A fixed expression taught as one M-LEGO at seed 40
  ("ein bisschen", "lo que") must not appear wholesale in a seed-20 phrase, even when every
  individual word is known. The learner's confusion is "I recognise the words but this combination
  means something I haven't learned."
- **A word being seen is not the same as its sense being taught.** A target word introduced in one
  meaning and reused in another is a real violation that no word-level check can see.

## 4. ZUT — and what to do when YOUR fix creates one

**What it is, plainly.** ZUT (Zero Uncertainty Test) is the law that **one known prompt maps to
exactly one target form, course-wide. Always.** The learner sees an English prompt and must be able
to produce the answer without choosing. Two different targets for the same prompt means the learner
forks, hesitates, and stops trusting the course. ZUT **outranks naturalness**: a mapping that isn't
the most natural way to say it is fine; a mapping that makes the learner guess is not.

**The asymmetry — get this right, most reported "duplicates" are not defects:**

- **Same/similar KNOWN → two different TARGETs. This IS a defect.** Production direction. The
  learner cannot know which to say.
- **Two different KNOWN prompts → the SAME target. This is NOT a defect.** Reception direction, and
  it is often *useful* — convergence teaches the unification cheaply. It is redundant at worst, and
  only worth **noting** when the twins sit adjacent to each other.
  **Check the roles before you even note it.** A BUILD tile and the USE sentence that expands it
  routinely share a target — "want to speak Japanese" and "I want to speak Japanese" are both
  日本語を話したい in a subject-dropping language. That is the methodology working, not redundancy.
  Only **use↔use** — two full sentences competing — is the shape worth reporting. On a 91-course
  scan (2026-08-06) that restriction cut 3,547 raw hits to 768. Reporting the build/component pairs
  as "redundant phrases" would itself be a false-positive headline.

**A single LEGO can fail ZUT on its own** — it doesn't take two rows to collide. If a learner
seeing the prompt would hesitate between target forms, that LEGO already fails. `"I" → "je"` fails:
the learner thinks *je? moi? me?* The fix is **chunk up to disambiguate** — bundle the atom with
the context that resolves it, so `"I want" → "je veux"`, `"with you" → "avec toi"`, `"a word" → "un
mot"`. **Your own hesitation is the detector:** if *you* have to stop and pick which target form to
use, that is a ZUT concern, and it is the same move as resolution 1 below.

**How a fix creates a ZUT conflict.** This is the failure mode most likely to be missing from a
brief written from scratch, and it is not hypothetical:

- **Stripping a disambiguator collapses two mappings into one.** Two LEGOs reading `it was
  (imperfect)` and `it was (preterite)` are distinct prompts. Strip the parentheticals — a
  legitimate fix, those annotations should never be learner-facing — and both become `it was` with
  two different targets. You have just minted a ZUT conflict out of two clean rows. The same
  happens when you resolve a slash gloss (`he/she` → `he`) and the sibling LEGO already says `he`.
- **Rewording a known prompt onto an existing one.** You reword an awkward English prompt into
  something more natural, and that natural wording is already the prompt for a different target
  elsewhere in the course.
- **Merging or renaming a LEGO** so its known gloss now collides with a sibling's.

**So before you write any new or reworded text: grep the course for how that English chunk is
already rendered.** Never add a *second* rendering of a chunk that already has one, and never reuse
an existing rendering under a *different* English chunk. First-come-first-served — the established
earlier-seed form wins, and you don't get to substitute a better idea later. (Fixing a genuine
error is not "changing your mind"; stylistic preference is.)

**Therefore: after ANY edit to a known_text, re-run the ZUT check across the course.** Not on the
row you touched — across the course. Stripping parens/slashes before resolving ZUT is the required
order, precisely because the strip reveals hidden collisions.

**When your fix has created one, resolve it in this order of preference:**

1. **Expand the LEGO** to include natural context from the seed, so the two prompts differ
   honestly. *Both known AND target must be expanded.* Make it M-type with the original word as a
   component. Then check: does the expansion create a NEW conflict? Is every word in the expansion
   already introduced? Does the expanded LEGO still tile into the seed's target text?
   — This is the "use different natural phrases" fix: `"know" → 알다` colliding at two seeds becomes
   `"I know" → 알아요` and `"I know about it" → 알고 있어요`. Context disambiguates; no explanation
   needed; the learner infers the distinction.
2. **Set `is_new=false`** if the word is already taught inside a larger M-LEGO. Suppress a debut
   *only* for a pure same-meaning restatement — identical intention, identical target, adding no
   new word, sense, idiom or contrast. Everything else keeps its debut.
3. **Rename to a more accurate gloss** (e.g. `"I had"` → `"I took"` for *tomé*).
4. **Leave it** when either answer is genuinely correct — gender pairs (amigo/amiga,
   ocupado/ocupada), person variations (irme/irte). These are not real ZUT conflicts; do not
   "fix" them.

**Consolidate or differentiate.** Every real conflict resolves one of two ways: make the two rows
share one canonical target (consolidate — right when the two prompts really mean the same thing, and
the natural USE rendering is the canonical one), or make the two prompts genuinely different
(differentiate — right when the meanings differ and the prompt was hiding it). Differentiation that
needs a human judgement call — inherently ambiguous source words like Hindi वह (he/she), Bengali
তাকে (him/her), "yesterday/tomorrow" — is **flagged, not guessed**.

**After every ZUT fix, check:**
- Does the seed still have at least one `is_new` LEGO? If not, set the seed to draft.
- Did the expansion absorb another LEGO in the same seed? Set that one `is_new=false`.
- Does the expanded LEGO still tile into the seed's target_text?

**The near-miss version — synonym overload.** ZUT is about identical prompts, but the same damage
is done by *similar* ones. Several target forms covering similar known meanings — synonym overload,
or a verb appearing in five conjugations inside the first 50 LEGOs — produces the same paralysis
without tripping any duplicate check. This is exactly Kai's question: **if the same or a similar
word is taught as two different things, is there a REASON?** If yes, keep them rigidly in separate
contexts. If no, merge.

**How to answer "is there a REASON?" — look at the whole course, not the pair.** Pull every row
using either form and ask whether the split is applied *consistently*:

- **A reason, leave it alone:** the two forms occupy genuinely different slots and the course honours
  the split everywhere. Finnish `kuinka` (with degree/quantity) vs `miten` (manner) — 187 rows,
  **zero crossovers**. Also: English polysemy the target correctly separates (happy-with vs happy),
  polarity (a negative-polarity intensifier vs the affirmative one), case inflection of one lexeme,
  and different parts of speech. These are the target language being right, not the course being
  wrong.
- **No reason, merge:** one seed is an **island**. The whole course says `katso-`; seed 371 alone
  says `katto-`, and a further colloquialism the learner is never given anywhere else. One outlier
  against a consistent body is a defect — merge onto the course-wide form.

Of 12 hand-checked candidates in that sweep, **1 was a real defect and 11 were false positives** —
which is why §5 exists. **But 6 of the 11 hid a different, smaller, real defect**: the sentences
were fine while the **bare one-word tile the learner is drilled on** was wrong. When you clear a
candidate at sentence level, look at its tile before you close it.

**Known ZUT false positives — do not report these as findings:**
- **Component sub-glosses** that are never drilled bare.
- **Same-lemma inflection** on the known side (to-X/X, friend/friends, a/an, say/said/speaks).
- **Statement→question convergence** (`you speak X` / `do you speak X?`) — designed, not a bug.
- Together these were **80% of 2,315 raw ZUT collisions** across 16 courses (2026-06-15). Default
  to false-positive and make the flag earn its place.

## 5. Detectors, counts and false positives

- **CALIBRATE BEFORE COUNTING.** Never trust a detector until it has found something already known
  to be there. Feed it a case you are certain about and confirm it fires. **An uncalibrated count
  is not evidence.** Calibrate your *lookup* too, not just your detector: resolve one
  independently-confirmable item end to end and check the round number, the LEGO id and the exact
  quoted wording all agree before you trust any verdict that used the same resolution.
- **A status must quote the actual current value from the database.** "Already fixed" / "still
  present" / "cannot determine" are the only honest verdicts, and **an assertion without a quoted
  value is not a status.**
- **HUNT FALSE POSITIVES. Never report a raw hit count as a finding.** Hand-check the hits,
  separate high-confidence from possible, and state the method you used. Report those three things
  separately — "412 hits" is not a finding, it is an input.
- **Count fix-CLUSTERS, not flags.** Real findings collapse hard: 1,499 raw flags → 1,123 adjudicated
  real → but 90 ZUT consolidations plus ~7 tense-mapping demonstrations covered 617 of them. The
  number that tells anyone anything is *how many distinct fixes*, not how many rows lit up.
- **False-positive hunting over-fires too.** In that same queue, tense/inflection variants were
  first written off as noise and then **reclassified as real** — Chinese carries tense with 了/过/在
  rather than verb inflection, so the "noise" was a missing construction introduction. Default to
  false-positive on a *known* FP class; don't default to it on a class you haven't understood yet.
- **A clean strict-gate pass can sit next to a filthy course.** The answerability checks found 15+6
  violations in 41,885 prompts (~0.05%) — the gate was genuinely fine — while a side-channel on the
  same run carried 701 real authoring defects. Passing the thing you measured says nothing about
  what you didn't.
- **The word-boundary trap has bitten this estate twice.** JS `\b` only matches ASCII word
  boundaries, so `\bvocê\b`, `\bcansé\b`, `\bgrüß\b` silently never match — and every non-Latin
  script here (Devanagari, Arabic, CJK, Cyrillic, Armenian…) plus Finnish ä/ö/y breaks naive
  boundaries the same way. Use `(?<!\p{L})word(?!\p{L})` with the `/u` flag. A detector that
  returns zero on a non-ASCII course is far more likely broken than clean.
- **Judgement about language is not a regex.** Mechanical grouping to *gather candidates* is fine.
  **Classification is an agent's job.** A regex classifier reached ~52% on ZUT adjudication and
  under-caught systematically. Don't invest in regex normalisers/stemmers for language judgements.
- **A passing gate is not a clean row.** The split is **COUNT vs MEANING**, not target vs known:
  code gates do phrase-count floors, tiling, vocab presence, complexity tiers — pure mechanics.
  **Every judgement about what the language *means* is yours.** So:
  - *"I want talking more"* **passed the vocabulary gate** — every word had been introduced.
    Grammaticality is meaning, not counts, and no deterministic gate here catches it.
  - On `eng_for_X`, five seeds with known, real known-side defects passed all golden-path gates
    with zero rejections (2026-06-16) — those gates inspect the *target* side only, and the one
    known-side gate is ASCII-tokenised, so it silently no-ops on Devanagari and every other
    non-Latin script.
  - A frame-coverage check returned `[]` on all 9,846 LEGOs tested — a **false clean** from a code
    signature that can't judge language.
  - A missing pair-contract makes the known-side check **silently skip**, so an un-contracted
    course is never wrongly blocked — and never rightly blocked either.
  "The gate passed it" proves the gate ran. A zero from a check you didn't calibrate is a rumour.
- **Absence of findings is not absence of issues.** For languages our human reviewer doesn't speak,
  the scanner is the only gate — a quiet report there means untested, not clean.
- **COMPONENT phrases are intentionally partial — don't "fix" them.** A component is a building
  block ("de" → "to"), not a standalone translation, and it is never drilled bare. Judging it as a
  sentence produces a large, confident, entirely false finding set. BUILD phrases are fragments too
  — flag those only for outright errors. **USE phrases are the complete sentences** and are where
  naturalness and translation-accuracy judgements belong.
- **Tokenizers don't stem.** `perguntas` and `pergunta` count as different words; a singular/plural
  "violation" inside one seed's own vocabulary is a false positive.
- **Supabase silently truncates `IN`-clause results past ~500 IDs.** Batch in chunks of 200 or your
  sweep will under-report and look clean.

## 6. Audio — never generate, always unlink

- **NO TTS GENERATION without explicit per-batch approval.** Every clip costs real money. This is
  not a formality and it is not yours to waive.
- **If a text fix orphans existing audio, do NOT regenerate.** List the affected clips with a count
  as a **separate section** of your report and stop there.
- **You must still unlink.** When you change a `known_text` or `target_text`, the linked audio row
  now has the *wrong* text but the link still exists. The dashboard counts links, so it will show
  **0 missing** while the export breaks on the text mismatch. Set the relevant `known_audio_id` /
  `target1_audio_id` / `target2_audio_id` / `presentation_audio_id` to `null` so the row correctly
  reads as missing and a later approved pass can fulfil it.
- **Make-before-break, always.** Never delete a clip before its replacement has been generated *and
  verified alive and correct*. Deletion never precedes a verified replacement — not even "we'll
  regenerate right after."
- **Punctuation changes are audio-affecting.** Adding `?` changes TTS intonation; a trailing `.`
  changes phrasing. Treat them as text changes with audio consequences, not as cosmetics.

## 7. Structural invariants — must still hold after your edit

- **Tiling:** the seed must still be recomposable from its LEGOs by at least one valid path.
- **Every seed keeps at least one `is_new` LEGO.** If your fix removes the last one, set the seed to
  draft.
- **Phrase minimums:** seed 1 LEGO 1 → 0 BUILD / 0 USE; rest of seed 1 and seeds 2–3 → 1/1; seeds
  4+ → 3 BUILD / 5 USE. Max 13 phrases per LEGO. A LEGO with **no** phrases is always invalid. Only
  phrases that literally contain the LEGO target count toward the minimums.
- **USE must outrank BUILD in quality.** BUILDs are fragments that lock in a pattern; USEs are
  complete sentences that stay in eternal rotation. If your edits leave BUILDs better than USEs, the
  methodology has been inverted.
- **`lego_index` is part of the phrase ID.** Touching it while phrases exist is messy — and a phrase
  written against the wrong LEGO order is rarely salvageable. Reorder, delete the affected phrases,
  flag the seed, let the builder repopulate. Don't try to preserve them.
- **Editing a LEGO can vaporise its phrases.** Observed on `spa_for_eng` S53: BUILD/USE phrases
  vanished after a LEGO edit. Count the phrases before and after any LEGO-level change.
- **Presentation audio announces the LEGO's `known_text`.** If you change a LEGO's known_text, the
  presentation clip now announces one thing while the screen shows another. Null
  `presentation_audio_id`.
- **Never set phrase IDs by hand**, and always submit with `phrase_role: 'build'` — IDs are
  assigned deterministically.
- **Deleting phrases thins the LEGO.** Check what your deletions leave behind: a LEGO that drops
  below its minimums, or loses its whole MEDIUM band (phrases should climb SHORT 3–5 syllables →
  MEDIUM 6–9 → LONG 10+; jumping SHORT straight to LONG is jarring), needs backfilling or a note
  saying it wasn't. Fix underpopulation *last*, after the deletions are settled.
- **Your edit may invalidate human approval.** If the course has a proofread/approval process, any
  seed whose approval predates your change goes back to review. Say which seeds you knocked back.

**One writer per course.** Never run two fix agents against the same course at once — concurrent
writers collide on per-basket numbering, and a parallel campaign will silently eat rows out from
under your batch. If you inherit a stale candidate list, re-check each row against the live data
before editing it; drift aborts are the rule working, not a shortfall. **These are live production
tables with concurrent writers**: on 2026-08-06 a row vanished mid-scan between the calibration
query and the systematic fetch, making a demonstrably-real pattern read as zero hits. If your
counts shift under you, disclose it — don't reconcile it quietly.

**Two ways a bulk edit corrupts data silently:**

- **Shell-quoted `curl` eats apostrophes.** `don't` goes in as `dont`, `I'm` as `im`. **Submit from
  a JSON file, never from an inline shell-quoted payload**, and after any run grep your new rows for
  `dont|cant|im|wont|didnt|youre|thats` before calling it clean.
- **Read bulk/regex dry-runs in FULL before applying.** Not a sample. Regex edge cases only surface
  on a complete read — accented letters defeating `\b`, homographs, `"it's been"` ≠ `"it is been"`.
  If the dry-run is too long to read, the batch is too big to apply.

**Never force a fix.** Skip freely, with a one-line reason. Two good phrases beat ten stilted ones,
and a skipped row you named is worth more than a forced row you didn't. Work slowly — course
content is craftsmanship, and quality beats throughput every time.

## 8. Defect classes worth recognising on sight

Learner-facing text should never contain: **grammar annotations in parentheses** (`(2sg pronoun)`,
`(past participle)`); **slash glosses** (`he/she`, `well/good`) — the learner must hear one word;
**wrapping speech marks**; **trailing periods**; **lowercase standalone `i`** in English; **text in
the wrong script** for its side; **known_text identical to target_text** (data corruption — the
translation is missing; flag for rebuild, don't delete); **nothing pronounceable** (`"..."`,
`"?!"`); **two speakers or two unrelated questions in one row** (tag questions and "so are you…?"
connectors are *one* utterance — keep those); **a direct question with no `?`**.

Resolving a slash is not "pick the first option": for `he/she`, read the **seed sentence** and use
the pronoun it uses; for `he/she wants`, keep the first word *plus* the trailing words → `he wants`.

**A gloss must name a producible intention, never a grammar label.** "object marker", "measure word
for long thin objects", "completed action marker", "past participle prefix" cost the learner
cognitive effort and yield zero ability to say anything. Red flags in a known_text: the words
*marker, particle, tense, conjugation, suffix, prefix*; longer than about three words; doesn't
translate to a word or phrase. Construction-features live *inside* an M-LEGO with
`introduce: false` — never as a bare debut. If your fix is tempted to write one, expand the LEGO
instead.

## 9. Report honestly

- If you were blocked — missing access, a source you couldn't read, a check you couldn't run —
  report it as an **explicit gap**. Never substitute an assumption for data you were denied. A gap
  reported honestly is useful; a gap papered over is poison.
- Separate **fixed** / **flagged for human** / **found but not fixed** / **could not verify**.
- Back up what you change (id + old value) so it is reversible, and say where the backup is.
- If you skipped a rung of the ladder, say which and why.

---

# C. Appendix — sources harvested

Every source below is in this repo. Line references are to the state of the files on 2026-08-06.

| Source | What came from it |
|---|---|
| `.claude/commands/scan-course.md` (1,477 lines) | **Primary.** The defect catalogue (§8) from Checks 1–18; the ZUT check and its gender-pair exemption and the strip-then-rescan ordering (Check 10, Remediation Guide); the four ZUT resolution approaches and their post-fix checks (§4); chunk-level protection and Cat A/B/C classification, incl. "new sense of an already-taught word" (Checks 11–12); the readiness-gate rule that a fix log is not proof of fix, and the `spa_for_eng` llevar coverage-hole story (§2); the audio unlink procedure and why the dashboard shows 0 missing (§6); the `IN`-clause truncation, `\b`-on-Unicode and apostrophe-regex gotchas (§5); LEGO-reorder handling and "don't preserve phrases across a reorder" (§7); slash resolution by category (§8); presentation/text drift (Check 18). |
| `ralph-methodology.md` (repo root) | The canonical ZUT definition and the production/reception asymmetry (L37–39, L480–500); "ZUT outranks naturalness"; the known side as a controlled language — which since Kai's 2026-08-06 ruling reads "controlled does not mean stilted": grammatical correctness hard, naturalness near-hard, a ZUT compromise a rare per-case exception (L45–51); consolidate-or-differentiate and the per-phrase hold-out enforcement (L492); vocabulary constraints, no-forward-references and whole-chunk tiling (L505–524); the graduated phrase-count ramp incl. seed 1 LEGO 1 → 0/0, the first-LEGO rule (L876–883); `is_new=false` as "a scalpel, not a cull" (L57); the "know → 알다" worked resolution (L497–500). |
| `docs/course-optimization/eng-for-x-zut-adjudication.md` | The ZUT false-positive classes and the 80%-of-2,315 figure; default-to-false-positive calibration; consolidate/differentiate/`fp_wrong_data` taxonomy; "USE rendering is canonical"; statement→question convergence as designed; the 78 items deliberately NOT auto-fixed because they need human disambiguation; Tom's rule (2026-06-15) that language classification is an agent, never a regex, with the ~52% regex result; reversible per-row backups. |
| `docs/deborahs-findings.md` | The defect taxonomy and which categories are mechanically detectable vs LLM-only vs manual; "**Absence of findings does NOT mean no issues**" for unreviewed languages (§5); `deu_for_eng` S18 R59 — a vocab fix that immediately created a fresh violation at R100, the concrete case behind §0; `spa_for_eng` S53 R147 — BUILD/USE phrases vanishing after a LEGO edit (§7); the cognate allowlist concept behind the identical-known/target check. |
| `docs/course-optimization/eng-for-x-known-side-findings.md` | Defects arrive in **generation-bug families**, identical across independently-built courses — the evidence for ladder rung 4 (§2); "the fix is upstream, not 1,000 manual edits"; the 2026-06-16 gated-regeneration proof that five known-defective seeds passed every golden-path gate, behind "a passing gate is not a clean row" (§5); confirmation that known-side remediation means re-sourcing and re-glossing the known text — i.e. the known side is authored and editable (§1). |
| `docs/course-fix-intake.md` (2026-08-06) | The role-name/ordinal trap — reviewers' "Build 1..n / Cons n" doesn't map onto DB `position`, so anchor on quoted text (ladder rung 0); `R####` → LEGO resolution via the `course_round_index` materialised view; "**an assertion without a quoted value is not a status**" and the three-verdict vocabulary (§5, §9); calibrating the *lookup* against one independently-confirmable item before trusting any batch verdict (§5); "recording a finding is not permission to fix it". |
| `docs/dup-target-cross-course-2026-08-06.md` | The role-pair refinement of the duplicate asymmetry (§4) — build↔use sharing a target is the methodology working, only use↔use is reportable, 3,547 raw → 768; the warning that reporting build/component pairs as redundancy is itself a false-positive headline; the mid-scan row disappearance on a live table with concurrent writers (§7); normalise-and-compare instead of regex boundaries. |
| `docs/fin-synonym-handcheck-2026-08-06.md` | The whole "is there a REASON?" adjudication method in §4 — consistency across the entire course (kuinka/miten, 187 rows, zero crossovers) vs the one-seed **island** (seed 371 `katto-`/`leffa`) that must be merged; the legitimate-split categories (polysemy, polarity, case inflection, part of speech); 1 real defect in 12 candidates; and **6 of the 11 false positives hiding a real defect in the bare component tile**; Unicode `/\p{L}+/gu` tokenisation with no `\b` anywhere. |
| `.claude/commands/checkpoint-qa.md` | The USE > BUILD quality invariant and why (§7); the vocabulary gate as a hard fail — "a learner cannot be asked to say a word they haven't been introduced to". |
| `.claude/commands/course-audit.md` | "Component sins" — the red-flag list for glosses that explain grammar instead of translating (§8); "production uncertainty" / synonym overload as the near-miss form of a ZUT failure, and consistency failures where the same phrase is translated differently in different locations (§4); vocabulary violations and tiling failures as CRITICAL severity (§7). |
| `.claude/commands/calibrate.md` | That a **single** LEGO can fail ZUT with no second row to collide with, the `"I" → "je"` worked failure, and "chunk up to disambiguate" as the canonical fix (§4) — the same move as resolution 1. |
| `.claude/commands/translation-analysis.md` | The self-hesitation detection heuristic: "If YOU hesitate about which target form to use, it's a ZUT concern" (§4). |
| `.claude/commands/course-methodology-analysis.md` | The ZUT direction table making the known→target / target→known asymmetry explicit per course type — "known → target: STRICT; target → known: FLEXIBLE" (§4). **Also the source of a contradiction — see below.** |
| `.claude/commands/ssi-translation-methodology.md` | "NEVER change canonical meaning"; consistency of a chosen mapping course-wide (never "ich will" sometimes and "ich möchte" other times for "I want") — corroborates §0's merge-or-separate-consistently rule. |
| `.claude/commands/phrase-monitor.md` | The phrase-role discipline in §5: components are intentionally partial and must be SKIPPED, BUILDs flagged only for obvious errors, and only USE phrases judged for naturalness and translation accuracy. |
| `.claude/commands/phrase-fixer.md` | The confidence ladder (auto-fix only what is unambiguous; when uncertain, skip rather than guess) and "log your reasoning so humans can audit" (§9). **Also the source of a contradiction — see below.** |
| `docs/course-optimization/lego-spread-backfill-playbook.md` | "**NEVER force. Skip freely with a one-line reason. 2 great phrases beat 10 stilted ones**" (§7); one writer per course and why concurrent writers collide (§7); that new inserts knock a seed's approval back into review (§7); **FORM discipline as "the #1 failure mode"** and the case-licensing rule (§3); grep-before-you-write — never a second rendering of a chunk, never a rendering reused under a different chunk (§4); the shell-quoted-curl apostrophe strip and its grep-back check, and "read dry-runs in FULL before applying" (§7). |
| `docs/course-optimization/upper-half-fix-queue.md` | **Count fix-clusters, not flags** — 1,499 raw → 1,123 real → 90 ZUT consolidations + ~7 tense demos covering 617 of them (§5); the explicit **reversal** where tense/inflection variants were first dismissed as false positives and then reclassified as real, behind "false-positive hunting over-fires too" (§5); consolidate-or-differentiate as the repeated two-branch ZUT decision (§4); the `metadata_gloss` defect class (§8). |
| `docs/course-optimization/eng-for-x-remediation-plan.md` | **"COUNT vs MEANING, not target vs known"** (Tom, 2026-06-16) — the framing that opens §5's gate rule; *"I want talking more"* passing the vocabulary gate because grammaticality is meaning not counts; the frame-coverage check returning `[]` on all 9,846 LEGOs as a false clean; "you cannot fully fix the target side without fixing the decomposition/gloss it hangs on" and phrase rewriting as a finishing pass (§1); drive fixes **through** the course-builder rather than re-encoding methodology in a prompt, and the 1.3 BUILD / 1.7 USE failure that caused (§1). |
| `.claude/commands/ssi-phrase-variety.md` | The SHORT 3–5 / MEDIUM 6–9 / LONG 10+ syllable ladder and the common failure of skipping MEDIUM (§7); the practice-score notion of under- vs over-used LEGOs behind "check what your deletions leave behind". |
| `synonym-choice-architecture.md` (repo root) | Context only: when a fix forces you to choose between several valid target realisations, that choice has its own doctrine (least-action path for the pair) and is applied *before* decomposition. Nothing from it is quoted in the block. |
| Kai's direct instructions (2026-08-06) | §0 consistency in full; §1 the wide fix space; §2 the escalation ladder; §4 the duplicate asymmetry; §3 the first-LEGO rule; §5 calibrate-before-counting and hunt-false-positives; §6 no TTS without per-batch approval. Where these overlap a repo source, both agree unless noted below. |
| `CLAUDE.md` (repo root) | The make-before-break audio doctrine (§6) and the approval gates. |

## Explicit gaps and contradictions

Reported rather than papered over.

1. **`memory/methodology-zut-resolution.md` DOES NOT EXIST in this repo.** `scan-course.md` points
   at it twice — at Check 10 ("See `memory/methodology-zut-resolution.md` for the resolution
   patterns") and in the Remediation Guide ("See … for the full pattern catalogue"). There is no
   `memory/` directory at the repo root and no file of that name anywhere in the tree. This matters
   because it is the *named* home of the ZUT resolution catalogue — precisely the material this job
   was asked to capture. §4 is therefore reconstructed from three sources that DO exist:
   scan-course's own four-approach summary and post-fix checklist, `ralph-methodology.md`'s
   definition and worked example, and the empirical false-positive classes in the eng_for_X
   adjudication. **If a fuller catalogue exists on the previous local agent's machine, §4 should be
   re-derived against it before being trusted as complete.**
2. **`memory/feedback_subjunctive_penso_che.md` also does not exist.** Referenced by scan-course
   Check 17b. Lower stakes — the rule itself is stated inline in the check.
3. **`phrase-fixer.md` contradicts Kai's stated rules, and Kai wins.** It says "**Don't delete** —
   your job is to fix. If a phrase should be deleted, leave the flag for human decision" (L169) and
   "Don't rewrite the whole phrase" (L114). Kai's instruction is the opposite: reword freely on both
   sides, and delete when you can't fix easily. `scan-course.md` sides with Kai — it prescribes
   deletion outright for Cat A vocab-ordering violations, multi-sentence phrases and unpronounceable
   phrases. The block follows Kai and scan-course. `phrase-fixer.md` appears to describe a narrower,
   older role (an Opus fixer working a queue of Haiku QA flags) rather than a general content-fix
   agent; it should probably be updated or scoped, but that is outside this job.
4. **RULED — how natural the known side must be.** This entry used to record a live disagreement
   between `course-methodology-analysis.md` (L21: the known language *"must be natural, idiomatic,
   trustworthy… must never sound 'AI weird'"*) and `ralph-methodology.md` (L49: *"slightly stilted
   but tileable English is correct"*), and resolved it on the author's own authority in favour of
   ralph — "tileability is the hard constraint and naturalness is the tie-breaker". **Kai ruled the
   other way on 2026-08-06 and that author's reading is withdrawn.** His words: *"It shouldn't sound
   very weird, especially when English is the target language. It should be grammatically correct —
   sometimes we might need to pick something slightly suboptimal for ZUT reasons, but usually that's
   not necessary."* So: **grammatical correctness on the known side is HARD, naturalness is
   near-hard, and a ZUT-driven compromise is a rare exception justified case by case — not a
   standing licence for stilted English.** Ralph L49 has been corrected to match. If a prompt that
   tiles reads badly, rewrite the prompt or redraw the LEGO; do not ship the awkward line.
5. **The acronym is expanded two different ways.** "Zero **Uncertainty Test**" in
   `ralph-methodology.md`, `calibrate.md` and `scan-course.md`; "Zero **Unprompted Thinking**" in
   `course-methodology-analysis.md` (L25). Same concept, same direction, different name. Cosmetic,
   but flagged rather than silently normalised.
6. **Scope of "check other courses" is stated but not defined.** Kai's ladder says report rather
   than fix across courses; scan-course is single-course throughout and says nothing about the
   boundary. The block states the rule as Kai gave it and does not invent a threshold.
7. **Not verified by execution.** This is a documentation harvest. No course content was changed,
   no scan was run against a course, no database was touched, no audio generated. The rules are
   faithful to their sources; they have not been re-tested against a live course as part of this
   job.
8. **How coverage was actually obtained, since it affects how much to trust each row.** Sources in
   the upper half of the table were read directly and in full by the author. Three parallel
   harvester sessions covered the rest and reported late; their findings were folded in afterwards
   and are marked by the files only they reached
   (`eng-for-x-remediation-plan.md`, `upper-half-fix-queue.md`, and the fuller reading of
   `lego-spread-backfill-playbook.md`). Four command files —
   `ssi-translation-methodology.md`, `course-methodology-analysis.md`, `calibrate.md`,
   `translation-analysis.md` — were covered *both* by a harvester and by the author's targeted grep;
   they agree. Where a harvester was the only reader, the block reflects its summary rather than the
   author's own reading of the source.
9. **The long tail was not swept.** A grep for `zut` / `false positive` across `docs/` and
   `.claude/` returns ~40 files; the most on-point were followed up and the rest were not. Known
   unread and plausibly relevant, several dated within the last few days:
   `docs/eng-for-mar-flagged-seeds-triage-2026-08-06.md`, the four-file
   `docs/spa-padding-*-2026-08-06.md` cluster (a fresh false-positive calibration case),
   `docs/greek-disambiguation-tags-2026-08-06.md`, `docs/exception-lego-leak-sweep-2026-08-04.md`,
   `docs/qa-landscape-scout-2026-08-04.md` and
   `docs/GRAMMAR_FLAG_FIXING_REPORT_2026-01-30.md`. **Treat this block as version 1, not as
   complete.**
10. **Two more contradictions surfaced by the harvesters, both left unresolved.**
    (a) *Phrase-tier minimums disagree.* `course-audit.md` gives per-seed-range tier counts (seeds
    6–20: 1+ SHORT / 1+ MEDIUM / 2+ LONG; 21+: 2+ / 2+ / 3+), while `ssi-phrase-variety.md` gives a
    flat "minimum 5 USE per LEGO spread across the tiers" with no per-tier counts. Neither
    cross-references the other. §7 states the ladder and the 3/5 floor from
    `ralph-methodology.md` — which is the validator's actual behaviour — and does not adopt either
    file's tier counts.
    (b) *USE phrase length targets differ.* `calibrate.md` says "LEGO + 10–12 syllables";
    `ralph-methodology.md`'s USE table says LEGO + 4–6 (medium) / + 7–10 (long). The block gives
    the SHORT/MEDIUM/LONG syllable bands rather than either target.
