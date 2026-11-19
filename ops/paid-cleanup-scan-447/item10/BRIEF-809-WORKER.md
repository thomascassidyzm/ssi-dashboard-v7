# Item-10 planning worker under #809·AI (child of #714·AI) — PLAN ONLY, APPLY NOTHING

You are a leaf of #809·AI. Setup, FIRST: `git fetch origin cs/809-item10-plan-eng-for-romance && git merge --no-edit FETCH_HEAD`
(this carries #714·AI's branch: tools, recount, the zho worked example). Then read and follow EXACTLY
`ops/paid-cleanup-scan-447/item10/BRIEF-CHILD.md` — every settled ruling, the pipeline, the deliverables, the hard rules
(never send apply true, no audio/render, no seed PATCH, no cascade, no tests, no Whisper, no hand-written database code:
Popty HTTP only, through the committed tools). Also read `README.md` and `decisions/zho_for_eng.py` beside it.
PURPOSE: a per-LEGO plan Kai approves before anything is applied, exact enough for a later worker to apply as-is.
PRICE: tokens are cheap (Kai: "I'd rather use a lot of tokens on this than have to do it again"); compute small; zero audio money.
Scratch in $CS_SCRATCH, never /tmp.

## Course direction
- `eng_for_<x>` courses: the TARGET is ENGLISH and the KNOWN side is the learner's language (Tamil, Punjabi, Portuguese…).
  The LEGO's English must be the seed's OWN English words; the LEGO's known side must be the learner-language words of the
  seed. K54 ("to" on verb LEGOs) is a rule about the English KNOWN side of *_for_eng courses; in eng_for_* the English is the
  TARGET, so judge an English infinitive there by L26 (the seed's own words), not K54.
- `<x>_for_eng` courses: known = English, target = the language. K54 applies to the English known side.
- Some candidate rows are PHRASE rows (id like `S0012L02B01`; eng_for_tam family `en_adds_word_known_lacks`: the English
  adds "now"/"today" that the known side lacks). Judge them as phrase fixes under their LEGO's decision: verdict `keep` for
  the LEGO plus `extra` raw `phrase.update` ops (with `expect` = current known/target), or basket rebuilds if the LEGO itself
  also changes. Fix the side that is wrong (usually drop the stray English word, or add the known word if the pair reads
  better that way — natural, taught words only). Check the WHOLE basket of that LEGO for the same slip.
- The recount rows (`jq '.rows[]|select(.course=="<c>")' recount.json`) have `seed_known/seed_target` for LEGO rows; for
  phrase rows read them from the dump. The scan's `fix`/`recommended_fix` is a hint only.

## Your courses (seed order within each course; one course at a time end-to-end)
See the dispatch prompt.

## Landing
Commit `decisions/<course>.py` + `.json` and `plans/<course>.json` (only your courses' files; tool changes as separate,
backward-compatible commits with a one-line why — avoid them if you can, sibling workers share plan.py) and
`git push -u origin HEAD` after EACH course. Do NOT merge to main; #809·AI merges your branch. Keep a progress file via
POST /api/job-journal, one milestone per course. Dry runs one course at a time; if one times out, `--chunk 400`.
Your report (one paragraph + landing line, per the house format) must give, per course: LEGOs planned / verdict counts /
ops / dry run status / validator new issues; 2-3 real before→after examples per fix family with the seed shown; every
LEGO kept at 7-8 syllables; every `seed` verdict (Kai's call) listed; every gap. Name your branch and last sha.
