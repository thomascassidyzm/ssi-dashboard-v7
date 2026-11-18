# Shard brief — paid-cleanup plan for items 11 and 19 (parent: cs #784·AI). PLAN ONLY, APPLY NOTHING.

You are one of three planning shards. Your own message names your family and your courses. Everything else is here.

## Purpose, price, failure
- **Feeds:** a per-family fix plan that Kai's assistant walks with Kai in chat before any applier exists. Kai: "even more
  carefully, tell me the detailed plan" and "I'd rather use a lot of tokens on this than have to do it again because the
  fix broke some other rule."
- **Failure is:** (a) a proposal that breaks another rule (a re-cut that leaves a gap, a new one-prompt-two-answers clash,
  an untaught word, a LEGO its seed does not say); (b) ANY database write or render; (c) a proposal built on stale rows —
  other cleanup jobs changed these courses today, so every seed you touch is re-read live first; (d) dozens of per-row
  questions for Kai — group into fix PATTERNS he rules on once.
- **Price:** generous tokens on judgement; light compute; zero audio characters; zero writes. No tests, no typecheck, no
  builds, no audio checks, no listening pages. Do not look for new defect families. Do not touch other items.
- **The 30-minute watcher stops a worker with no commit for 20 minutes.** Commit and push after EVERY course.

## Set-up (your checkout is off origin/main; the shared directory is on the parent's branch)
```
git fetch origin cs/784-plan-items-11-13-17-19-dup-legos
git merge --no-edit origin/cs/784-plan-items-11-13-17-19-dup-legos
cd ops/paid-cleanup-scan-447/plan-11-13-17-19            # P below
mkdir -p $CS_SCRATCH/snap
(set -a; . ~/ssi-restore/qa-copy-fresh.env; set +a; node ../../../tools/paid-cleanup-717/snapshot.cjs <course> $CS_SCRATCH/snap/<course>.json)
```
Commit ONLY files under `P/<your family>/…` and `P/data/live/<your courses>.json` on YOUR branch and push it. Do not merge
to main. The parent merges your branch.

## The data
- `P/data/scan-P17.json` (item 11) and `P/data/scan-LONG.json` (item 19): the 17 Nov scan rows, fields
  `course,row,known,target,fix,confidence,canon,chars,family,slice`. `row` may name one LEGO, one phrase, or several.
  These are CANDIDATES read by a scan worker, not verdicts. Per-slice prose: `../reports/<slice>.md`, `../FIX-LIST.md`.
- Whole-course reads: the nightly QA copy snapshot above (last night, BEFORE today's applies). Helpers: `tools/snap.py`.
- **Live re-read, mandatory for every seed you propose to change:** `python3 -I tools/live_seeds.py <course> <seed> [...]`
  (one small GET per seed through Popty's script-view, cached in `data/live/<course>.json`). Then
  `python3 -I tools/mkdump.py <course>` overlays the live seeds on the snapshot → `$CS_SCRATCH/dumps/<course>.json`.
  `plan.py` refuses a decision on a seed that was not re-read live. If the live LEGO or rows differ from the scan row,
  the row was changed by another job today: drop it if fixed, re-judge it if not, and COUNT both.
- **Database rule (Tom, HARD):** no hand-written code against the database, read-only included. Only the committed tools
  above and Popty GET routes / dry-run POSTs. Your own Python over the JSON they return is fine.

## The pipeline, per course
1. Author `P/<fam>/decisions/<course>.py` (hand-written; it writes `<course>.json`; schema = `tools/plan.py` docstring).
2. `python3 -I tools/plan.py <fam> <course> $CS_SCRATCH/dumps/<course>.json` → `P/<fam>/plans/<course>.json`; fix every
   "problem" it prints (or answer it by hand in `why` and list the row explicitly in `basket`).
3. `python3 -I tools/validate.py <fam> <course> $CS_SCRATCH/dumps/<course>.json` — the course-builder's own validator
   (:3471, in-memory override, nothing written); a seed with NEW issues is fixed or its proposal is marked HOLD.
4. `python3 -I tools/dryrun.py <fam> <course> --chunk 50` — Popty's edit-batch as a DRY RUN (rolled back). It never sends
   `"apply": true` and neither do you. A dry run that times out is a GAP to record, never a loop.
5. `python3 -I tools/price.py <fam> <course>` — estimated characters (new target ×2 voices + new known ×1 + intro).
Run every network step SERIALLY (no xargs -P, no background fan-out): about ten other jobs are using Popty and at most
three of them write. `<fam>` is `item11` or `item19`.

Structural ops (`lego.insert`, `lego.delete`, `lego.reorder`) go in a decision's `extra` list as raw edit-batch ops
(vocabulary: `GET http://localhost:3470/api/production/<course>/edit-ops`). On a released course their APPLY needs a go
from Kai/Tom, and `lego.reorder` is refused while any learner state names a moved LEGO — so prefer in-place
`lego.update`, append a new LEGO at the end of its seed rather than reordering, and say in `why` when a proposal is
structural. A new LEGO that is an exact pair (both sides) of an earlier NEW LEGO is inserted `is_new:false` and gets no
basket; any other new LEGO needs a basket of at least 3 build + 5 use rows (`phrase.insert`, ids
`<course>:S0123L04B01…`, `phrase_role` build/use), built only from words taught by that seed.

## Canon digest (full text `course-methodology-canon.md` at the repo root, 385k chars — grep an ID, never read it whole)
Every proposal names the rule ids it rests on in `why`, WITH the words of the rule (Kai reads plain English).
- **P17** every practice phrase under a LEGO, build and use, contains the WHOLE LEGO; phrases grow outward from it. HARD.
- **K49** words of any size may sit inside a LEGO in a phrase, and the phrase may reorder it: still contained. The basket
  must then also keep plain uses. **K8** target side: exactly the taught form (a split is fine). **K6** the known side
  may inflect taught words (learn/learning) — only a different WORD is a defect. **L28** a bound spelling (stem+clitic,
  *dirlo* for *dire*) still contains the LEGO — record it, do not reword.
- **L26** a LEGO holds only words its own seed says, on both sides. HARD. **L25** a LEGO that cannot be glossed to match
  its seed is re-chunked. **L27** a piece of the seed no LEGO covers is closed by growing a LEGO or adding one (not-new
  if the pair was taught earlier); never left untaught. **S3** every part of the seed is covered. **S4** overlap between
  LEGOs is normal. **L30** a span built entirely from taught pieces needs no new LEGO.
- **L3** a LEGO's target is capped at 8 syllables (HARD, the builder rejects). **L2** not too small to be meaningless,
  not too big to be inflexible. **L13** teach the small piece before the big one that contains it.
- **L32** absolutely no gapped LEGOs; a wrap frame is a LEGO only if it stands alone as complete target language,
  middles taught first. **L33** a frame may carry a stand-in "it".
- **L31** when a LEGO is re-cut, every later not-new LEGO that relied on the old pair is re-judged (grow the same way, or
  become NEW with an intro and a basket). **L17/L27** an exact pair on BOTH sides of an earlier LEGO is a duplicate:
  introduced once, the later one not-new. **P25** a not-new LEGO's basket is never played; rows worth keeping are
  re-homed under a NEW LEGO they contain. **P26** every seed sentence sits in a played basket.
- **ZUT / K2 / K22** one known prompt → exactly one target answer, judged on the delivered prompt. A new LEGO known text
  must not already map to a different target in the course (the builder rejects it). **L34** first unify to one form.
- **P1** no untaught words in a phrase (the word, in that exact form, taught at or before that seed). **K14/K15** never
  add a LEGO to license words; fix the phrase. **P28** once a form is taught for a meaning, phrases use that form.
- **K26** the person matches on both sides. **K54** a verb LEGO's English is "to [verb]" (not owed with a subject, a
  modal, a finite/past form or -ing); an imperative never takes "to". **K11** never a bracket, slash, tag or label.
- **O12** grow, shrink or re-gloss a LEGO → rewrite every row under it so each contains the whole LEGO, AND re-check
  every row anywhere in the course that uses the old gloss (plan.py's knock-on census lists them: read them).
- **R0.3** rewording or deleting a phrase is legitimate. **R0.13** anything a regex touched is read back by hand.
- **P7** full sentences preferred; a fragment only as a BUILD row. **P18** never demote a use row to build.
- **Never** propose editing a SEED sentence as a fix; if nothing else works mark it HOLD with "KAI:" and the reason.
- Best effort, not questions: no native-speaker holds. Decide from evidence (grammars, dictionaries), cite it in `why`.

## Kai's standing rulings — decided, do not re-open
- **Shortest LEGO cut** (17 Nov): offer the shortest workable cut first, stand-in frames carrying the surrounding words;
  a longer LEGO only when the shorter one brings back a clash or a gap. LIST every LEGO you keep at 7+ syllables, with why.
- **Stand-in "it" frames are fine** (17 Nov): never flag or restructure them; their rows (which swap the "it") are NOT
  "basket does not drill its LEGO".
- **Every seed part is a LEGO** (12 Nov): parts taught earlier still appear as a not-new LEGO in this seed. No gapped
  LEGOs. No disambiguating labels on LEGOs ("unacceptable") — a would-be clash stays inside the bigger LEGO.
- **Learner-POV gate** (17 Nov): test each proposal as a learner reaching that point. PASS when it clashes with no
  ruling and has a precedent (name it: an earlier LEGO of the course, the sister course, a canon worked case). Else HOLD,
  listed separately with the reason.
- **Cleanup fixes carefully** (18 Nov): every changed row passes the builder validator; a badly hit basket is REBUILT,
  not patched; removed rows are back-filled with good real phrases from taught words.
- Easy words matter early only; one target word with many English glosses is fine (the clash is one English, two answers).

## Family guidance
**Item 11 — basket does not drill its own LEGO.** Combined list: "The LEGO grew later (or was re-cut), and the basket
still drills the old, smaller piece. Fix (Kai's 17 Nov shortest cut): where the piece the basket drills is in the seed,
re-cut the LEGO to that piece and cover the rest with another LEGO. Nearly all rows then stay. Otherwise rebuild the rows."
Decide per LEGO, reading the WHOLE seed and the WHOLE basket (not only the rows the scan named):
 - `recut-small`: the drilled piece is a contiguous, meaningful piece of the seed → LEGO shrinks to it (both sides); the
   rest of the seed stays covered (by a LEGO already in the seed, else a new/not-new LEGO, see structural ops). Check the
   shrunk LEGO is not a duplicate of an earlier one (then it becomes not-new and its rows need a played home, P25) and
   not a new ZUT clash.
 - `rebuild-rows`: the LEGO is right as it is → rows that miss it are rewritten to contain it, or deleted where the
   basket keeps 3 build + 5 use, else back-filled.
 - `not-a-defect`: split/reordered LEGO (K49), bound spelling (L28), known-side inflection (K6), stand-in "it" frame.
 - `hold`: with the reason.
**Item 19 — LEGOs over 8 syllables.** The scan counted by hand (the builder under-counts English and Arabic). Re-count
each yourself (Arabic: from the vowel marks) and record the count. Then cut to the shortest workable pieces from the
seed's own words: each piece contiguous, glossed with the seed's own words, exact earlier pairs marked not-new, every
basket row re-homed/rewritten so it contains the LEGO it sits under, and no piece that is a bare particle/preposition
(L6/L7). The combined list's shared eng_for_eu cut is `I'm not going to be able to` → `I'm not going to` + `be able to`:
use ONE cut for the same English across all five eng_for_eu courses. Price it (price.py) — the list says "not priced
until the cuts are chosen".
**Overlap with item 10** (LEGO says what its seed does not): item 10 has plans only for zho_for_eng and zho_for_jpn
(`../item10/plans/*.json` and branches `origin/cs/741-…`, `origin/cs/742-…`, `origin/cs/743-…`). Where one of those
already re-cuts a LEGO of yours, INHERIT that cut and say so; do not plan it twice. kor_for_eng: the combined list says
most over-8 LEGOs are also item-10 "seed's exact words never played" LEGOs — fix both in the one cut and say so.
eng_for_sin seeds 345–668 are behind a pending rebuild decision (D1): list them as HOLD "behind D1", do not plan them.

## What you hand back
- `P/<fam>/decisions/<course>.py|json`, `P/<fam>/plans/<course>.json` (with validator + dryRun answers) for each course.
- `P/<fam>/SUMMARY-<shard>.md`, written for the chat walk in plain English (no job ids; no rule code without the rule's
  words): a table per course (scan rows, dropped as already fixed, not-a-defect, proposals, holds, est. chars); then
  the FIX PATTERNS, each with 2–3 real examples (seed sentence, current LEGO(s), proposed LEGO(s) with not-new flags,
  what happens to the rows, why); then the HOLDS with reasons; then the list of LEGOs kept at 7+ syllables with reasons;
  then gaps (seeds not re-read, dry runs that timed out, rows you could not judge).
- Your report: ONE paragraph (what you planned, where it is — your branch, not merged — and the honest gap) + landing line.
