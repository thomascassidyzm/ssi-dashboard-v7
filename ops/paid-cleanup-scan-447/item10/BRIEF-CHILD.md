# Brief for an item-10 planning child (parent #714·AI) — PLAN ONLY, APPLY NOTHING

Kai (course owner), 18 Nov, approving paid-cleanup item 10: "Yes, but do this one even more carefully and tell me the
detailed plan before applying". You write per-LEGO decisions for YOUR courses and prove them by dry run. Nothing is applied:
never send `"apply": true`, never render audio (no /api/audio/render at all — the parent prices audio), never PATCH a seed,
never run a cascade. Tests are off estate-wide: run none. No Whisper/transcription. No native-speaker holds or proofreader
question lists (Kai: fix it with online sources and evidence; the proofreader reads the finished course later).
HARD RULE: no hand-written code against the database. Since cs #931·AI every READ is from the NIGHTLY COPY via ../copy-read.cjs
(no Popty read route, no :3471, nothing to live); the one live call is tools/dryrun.py (edit-batch, no apply). See BRIEF.md.
Scratch goes in $CS_SCRATCH, never /tmp.

## Setup
Your worktree is off origin/main, which carries this kit since cs #931·AI.
Read, in order: `course-methodology-canon.md` (repo root — the live rulebook; L25-L32, K29, K49, K54, L7-L10, S3/S4/S15 matter
most), `ops/paid-cleanup-scan-447/item10/README.md` (the pipeline), and `decisions/zho_for_eng.py` (the worked example: the
format and the depth of judgement expected, including the FIX block at the end). Your candidate rows:
`jq '.rows[]|select(.course=="<course>")' recount.json` (has seed text, live LEGO, `known_not_in_seed`, `target_in_seed`) and the
scan's suggestion in `candidates-2026-11-17-scan.json` (`recommended_fix` — a hint, NOT a ruling; judge each row yourself; many
are scanner artefacts, e.g. a contraction split, which get verdict `keep` with the reason).
The per-slice findings in `../reports/<slice>.md` carry context for your courses.

## Settled rulings — do not re-open
- Re-gloss to the SEED'S OWN WORDS with the SHORTEST CUT (Kai 17 Nov). Go longer only if the short cut re-introduces a
  clash or a gap. Nothing over 8 syllables; list every LEGO you keep at 7-8 with a reason (`why`).
- EVERY SEED PART IS A LEGO (Kai 12 Nov): already-taught parts still appear as a LEGO in this seed, marked not-new.
  NO gapped LEGOs. Wrap-round target constructions: contiguous frame first, middles alone, phrases slot middles in.
  NEVER disambiguating labels on LEGOs ("when? (asking)") — a would-be clash stays inside the bigger LEGO.
- Stand-in "it" frame LEGOs are allowed; their phrases swap the "it". Do not flag or restructure them.
- One target with several English glosses is fine; the clash (ZUT) is ONE known prompt giving TWO target answers.
  Easy words matter early only; late seeds may take the harder correct word.
- Vocabulary is known / target / seed — never "source". The known side is a controlled language too.
- BASKET CONSEQUENCES (Kai 18 Nov: validator + rebuild + back-fill): for each changed LEGO say which rows follow the new
  gloss, which are rebuilt, which deleted, and BACK-FILL with good, real, natural phrases built only from words taught by
  that seed ("making sure the quality is good this time"). Rebuild a badly hit basket whole rather than patching.
- KNOCK-ONS on later seeds: later phrases that relied on the old LEGO text, new one-prompt-two-answers anywhere, duplicate
  LEGOs (plan.py lists `later_duplicates` and a `knock_census`; say in `knock` what happens to each). Learner-POV gate
  (Kai 17 Nov): test each fix as a learner reaching that point in the course.
- Interlocks: where the fix overlaps item 11 (basket does not drill its own LEGO) or item 19 (LEGO over 8 syllables),
  cut the LEGO ONCE and list the items closed in `closes`.
- KOREAN: fold kor's L26 LEGOs into the known over-8-syllable re-cut so each kor LEGO is cut once; read branch
  `origin/cs/703-kor-lego-follow-seed-37` (#703·AI) last commits first so you neither undo nor duplicate it.
- K54: verb LEGOs whose English lacks "to" get the "to" (jpn 21, fra_ca 9, fra 5). jpn L7: particles taught alone are folded
  into the LEGO they belong to under the shortest-cut rule.
- A seed-level re-cut uses the edit vocabulary that exists (`GET /api/production/<course>/edit-ops`: lego.update/insert/delete,
  lego.reorder, phrase.*, seed.update). Verdict `seed` (editing the English seed so it says what the target says) is KAI'S
  CALL: allowed, mark it so in `why`. If Popty has no route for an edit you need, record a gap, never a workaround.
- Seed-1-to-3 floors are 1/1; from seed 4 a changed new LEGO needs build 3+ and use 5+, bare-LEGO rows not counting.

## Romanisation
zho/jpn/kor rows carry `target_text_roman`; a target change without a new one is refused (ROMAN_STALE). `tools/roman.py`
handles zho only, from the course's own readings (`tools/lexicon_zho.py` over `tools/baskets.py --all`). For jpn/kor build
the equivalent from the course's own rows (same idea: longest-match over words the course already spells); a reading you
cannot derive goes in `ROMAN` overrides in the decisions file, hand-read, or `target_text_roman: null` only where the row had none.
Tool changes: keep them backward compatible with zho_for_eng and commit them separately with a one-line why.

## Deliverables (commit + push your own branch as each course lands)
Per course: `decisions/<course>.py` + `.json`, `plans/<course>.json` with `problems == []`, a 200 `dryRun`, and
`validator.seeds_with_new_issues == []` — or every remaining fail explained in the decisions file. Write ONLY your own courses'
files under `ops/paid-cleanup-scan-447/item10/` (plus tool commits); the parent merges your branch. Dry runs: one course at a time
(the live DB is shared with five other cleanup jobs; statements die at 5 s — if a dry run times out, split with `--chunk 400`).
Keep a progress file (POST /api/job-journal) with one milestone per course group — you may be handed over mid-way.
Your report: per course — LEGOs planned / verdict counts / ops / dry run / validator; 2-3 real before→after examples per
fix family with the seed shown; every LEGO kept at 7-8 syllables; every Kai-call (`seed` verdict) listed; every gap.
