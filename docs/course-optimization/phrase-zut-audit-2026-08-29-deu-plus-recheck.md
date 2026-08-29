# Phrase-level ZUT audit — read-only, 2026-08-29

*Reset-eve spare-capacity pass. Read-only against Supabase (SELECT only, no writes to course
content, no fixes applied). Ran the rescoped audit tool (`1cde09e5`, target-membership check for
component rows) against three courses: `fra_for_eng` and `spa_for_eng` (the same two courses as the
2026-08-11 pass, `phrase-zut-audit-2026-08-11.md`, run again here purely to check for drift) and
`deu_for_eng` (first-ever measurement — a Germanic course, contrasting with the two Romance courses
every prior pass has used). No course-content rows were written to; the only files touched by this
pass are this doc and disposable JSON snapshots in scratch (`$CS_SCRATCH`), not committed.*

## The tool itself: still living off `main`, in `scripts/` not `tools/`

`tools/course-optimization/audit-phrase-zut.cjs` — the path the sweep-protocol doctrine names —
does not exist on current `main`. The 2026-08-11 pass restored it to that path, but the currently
checked-out working tree (branch `scan/optional-feature-consistency-2026-08-28`, several commits
ahead of `origin/main` including the Aug-11 restore's ancestry) has it at `scripts/_audit-phrase-zut.cjs`
instead — gitignored (`scripts/` is the agent scratch dir per `CLAUDE.md`), hardcoded to loop over
`['spa_for_eng', 'fra_for_eng']` only, with no course argument. To audit `deu_for_eng` I copied the
file's `auditCourse()` function unmodified (only fixing the two relative `require()` paths, since
the copy lived one directory shallower) into a throwaway `module.exports` wrapper, ran it, and
deleted the copy immediately after — same SELECT-only logic, same rules, no change to the checked
rules themselves. **Open gap, not fixed here (would be a code change, out of scope for an audit
pass): the tool should take a course-code argument instead of a hardcoded pair, and should live at
the path the doctrine names.**

## Numbers

| | fra_for_eng | spa_for_eng | deu_for_eng |
|---|---|---|---|
| total rows scanned | 17,551 | 17,803 | 15,496 |
| component rows | 1,780 | 1,123 | 972 |
| distinct normalized knowns | 14,244 | 15,530 | 13,253 |
| **[1] bidirectional strict** (real ZUT violations, LEGO/BUILD/USE vs LEGO/BUILD/USE) | **101** | **81** | **169** |
| [2] target-membership failures (component target not a substring of its own seed) | **23** | **20** | **23** |
| [3] target-side collisions (component-only groups, informational, not enforced) | 77 | 34 | 19 |

## fra/spa: zero drift since 2026-08-11

Every one of the six fra/spa numbers above is an **exact match** to the 2026-08-11 snapshot (101 /
81 bidirectional-strict; 23 / 20 membership; 77 / 34 target-side-collision). Eighteen days, no
change in either direction. Combined with the fix-sweep's own 2026-07-04 baseline, that means bucket
[2] (membership) has now been stable at "the same 44→43(ish) judgment-fork residue" for nearly two
months — it is not a live queue, it's a decision backlog waiting on Tom's open items (manual §8).
Bucket [1] on these two courses is likewise settled; the 2026-08-11 doc's flagged "unexplained spa
cliff from 338→81" is *not* new information here (that drop happened before Aug 11, not since), but
it is now doubly confirmed as a **stable** floor rather than a transient dip — whatever caused it,
it stuck.

## deu_for_eng: the new data point, and it doesn't match the Romance-language calibration

This is the first time the rescoped audit has been run against a non-Romance course. Two things
stand out against the fra/spa priors:

**Bidirectional violations are higher in absolute count (169) despite deu_for_eng having ~1,700-2,300
fewer total rows than fra/spa** — i.e. a meaningfully higher violation *rate* per row than either
Romance course. Skimming the first 25 (never triaged the bare fragment — read against the printed
seed pairing, per the manual's evidence standard, though this is a skim-level read, not a scored
pilot with full seed+sibling pulls):

- The overwhelming majority look like **German's grammar surfacing where English has one word**:
  case (`those`→`denen`/`diese`), gender/number/case on possessives (`your`→`deine`/`dein`/`eure`),
  separable-verb infinitive forms (`to check`→`überprüfen`/`um zu überprüfen`), and pronoun-drop vs
  pronoun-included registers (`i wished`→`wünschte`/`ich wünschte`; `i move`→`bewege`/`ich bewege`).
  This is the same *shape* of finding the July pilot made on fra/spa — "grammar the check can't see"
  — but German's case/gender system means it fires far more often, which plausibly explains the
  higher count without implying worse content.
- A smaller handful look like genuine **English known-side polysemy** the methodology's own doctrine
  already names as a known trap (`ralph`, "The Known Side Is a Controlled Language" — unlicensed
  known-side machinery is itself a ZUT violation, just on the other side): `when`→`wann`(interrogative)
  /`wenn`(conditional-temporal), `one`→`eines`(numeral)/`man`(impersonal pronoun). These read as
  **known-side decomposition gaps** — the English gloss needed to fork into two distinct known-side
  entries at the point these senses first diverged, and didn't. That's a different remediation path
  from a target-side synonym fork: fixing it means editing which LEGO/phrase owns which English
  gloss, not picking a different German word.
- One or two look like real target-side **sense-splits that should have been differentiated** and
  weren't: `the news`→`die Nachrichten`(the news, media)/`die Nachricht`(a piece of news) is the
  clearest candidate — these are genuinely different concepts in German that happen to share an
  English surface form, which is exactly the DIFFERENTIATE case in the ZUT resolver playbook
  (manual §2.1). Not confirmed against seed+sibling context here — flagged as the strongest single
  candidate for the pilot's first batch.

**Membership failures (23, same count as fra) and target-side collisions (19, notably lower than
fra's 77 and spa's 34) look structurally identical to the fra/spa pattern** — short deictic/discourse
words (`could not`, `the same`, `Have you heard?`) whose component gloss is a paraphrase rather than
a literal slice, the same "grammar the substring check can't express" bucket the July fix sweep
classified as (d) judgment-fork, not defects.

**Reading against the calibration priors**: this does NOT match "mostly noise" (the pre-rescope
fra finding, where 93% of flags were the audit checking the wrong unit — that category error is
already fixed by the rescope, so it can't recur here) nor cleanly "mostly orphans" (the batch-debris
pattern that drove the July membership sweep — no evidence of timestamp clustering checked yet,
see below). It looks like a **third shape**: a genuine per-language rate difference in bucket [1],
driven by German's richer inflectional morphology triggering more case/gender/register variants than
the check's normalization can absorb — plus a small number of real known-side decomposition gaps.

## What a follow-up sweep would look like

1. **Bucket [1] on deu_for_eng (169) is the one that needs a real pilot** — it has never had any
   triage pass. Pull ~40 items with the manual's full evidence standard (seed's own master
   sentence + every sibling at that seed_number/lego_index, not the bare fragment) and classify
   a/b/c/d. Predict most land in **(d) grammar-the-check-can't-see** (case/gender/register, not
   defects) given the skim above, but the `when`/`one`/`the news` shape suggests a **non-trivial (b)
   or escalate-to-Tom bucket for known-side decomposition gaps** that fra/spa's pilots never
   surfaced (Romance languages don't fork "when" the way German does) — worth explicitly tagging
   that as a distinct sub-category in the pilot write-up rather than folding it into the generic
   judgment pile, since its fix (re-gloss/re-decompose the English side) is different work from a
   target-side synonym call.
2. **Check for batch-debris timestamp clustering on deu's [2]/[3] before triaging them** — the July
   fix sweep found 85% of fra's membership orphans clustered in two ~2-minute batch-regen windows;
   a cheap `created_at` histogram on deu's 23+19 flagged rows would say in one query whether this is
   the same mechanical debris (skip straight to a scriptable cut, per §7's origin-pattern shortcut)
   or genuinely scattered judgment calls (go through the full per-row pilot). Not run in this pass —
   flagged as the fastest next step, costs one query.
3. **fra/spa bucket [2] (43 combined) still needs nothing but Tom's ruling** — unchanged since
   August 11, and unchanged since July before that. Re-surfacing it as a fresh "queue" would be
   makework; the open decisions are still the ones logged in the manual §8 (fra synonym forks,
   seed-vs-sibling outliers at fra 319/spa 578/488/580/510, the interposed-word tolerance question,
   the stacked defect at fra `S0664L01C01`).
4. **Do not extrapolate the deu rate to the rest of the estate from one course.** One Germanic
   course against two Romance ones is a contrast, not a sample — if a broader rate comparison
   matters, the next cheap step is running the same read-only audit against one or two more
   typologically distinct courses (e.g. a case-marking Slavic course, an agglutinative one) before
   drawing any "German is worse" conclusion; nothing here should be read as ranking deu_for_eng
   below fra/spa on quality, only as a first per-language-family rate signal in this dataset.

**No fixes were applied. No `course_seeds`/`course_legos`/`course_practice_phrases` rows were
written to in this pass.** The tool copy used for `deu_for_eng` was deleted after the run; no new
tracked files were added to `scripts/` or `tools/`.
