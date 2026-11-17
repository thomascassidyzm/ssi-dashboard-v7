# Worker brief — #447 paid-courses cleanup scan (common part; your slice is in the dispatch prompt)

PURPOSE: Kai (SSi course production lead) asked on 17 Nov for ONE fix list covering every paid course, to walk through tomorrow. You scan your slice
and return a hand-read fix list for it. PRICE: reading and judgement only. **NOTHING IS APPLIED**: no edit-batch (not even dry runs — Popty caps them at
100/hour), no renders, no TTS, no link-clip, no contact with Deborah/Eoghan/Auke/anyone. No hand-written database code: you read courses ONLY through
Popty's own GET routes on http://localhost:3470 and the files below. No tests, no typecheck. Scratch in $CS_SCRATCH, never bare /tmp. You cannot fan out.

## Setup (in your own worktree)
    git fetch origin cs/447-paid-courses-cleanup-scan-orches
    git checkout FETCH_HEAD -- ops/paid-cleanup-scan-447
    python3 -I ops/paid-cleanup-scan-447/dump-course.py <course> $CS_SCRATCH/<course>.json      # live re-read, ~20 s
    node ops/paid-cleanup-scan-447/detect.cjs $CS_SCRATCH/<course>.json $CS_SCRATCH/<course>.hits.json ops/paid-cleanup-scan-447/patterns.json
`ops/paid-cleanup-scan-447/candidate-counts-2026-11-17.txt` is the orchestrator's run of 17 Nov (candidate counts per course, same tool); your own run is the live one. Read `patterns.md` there first:
it is the family catalogue, each detector's known positive, and the stated gaps. For row context use
`GET /api/production/<course>/seed/S0123/baskets` and `GET /api/production/<course>/presentation/<legoId>` (intro text).

## The law: course-methodology-canon.md (repo root). It outranks this brief. Digest of what decides a hit:
- A hit is a QUESTION, not a defect. Read every hit you report (R0.5: no sampling inside a family you put a number on; say "N read, M not read" honestly).
- Judge from the LEARNER's point of view at that seed: could they answer with what they have been taught? (R0.1, K7, Kai's learner-POV gate 17 Nov.)
- ZUT = one known prompt → one target answer (K2/K22). Two Englishes → one target is FINE (K3), unless the word is basic and very early (K24).
  Only LEGO/seed clashes count; phrase-level clashes follow the LEGOs (Kai 21 Oct); component tiles are never a concern.
  Remedy order (L34): unify to one form first; else put one inside a larger LEGO that shows why; never a label or bracket (K11).
- Known side has latitude (K6): other inflections of taught words are fine. TARGET side is strict (K8): exactly the taught form; tiny mutations/gender endings may pass.
  Any word met earlier, even inside a chunk, may be used alone (K29, P2). An untaught form means the PHRASE is wrong: reword with taught forms or delete; never add a LEGO (K14, K15).
- LEGO only says what its seed says (L26); exceptions: "to" on verb LEGOs (K54), an implied subject pronoun (K28), a stand-in "it" in a frame (L33), fused clitic forms (L28).
- No gapped LEGOs (L32). Every part of a seed is covered by a LEGO, taught-earlier parts listed not-new (S3, Kai 12 Nov). A not-new LEGO needs an earlier LEGO equal on BOTH sides (L31).
  Not-new baskets are never played (P25); seeds with no new LEGO are fine (Kai 4 Nov).
- Every phrase contains its whole LEGO (P17); NOT a break: non/ancora/già-type words inside it (K31), split or reordered LEGO (K49), honorific cut (K32).
  A different verb form IS a break (K50). "the X" under "a X" is fine if enough exact rows remain; strict in very early seeds (Kai 10 Nov).
- LEGO cap 8 syllables (L3); Kai 17 Nov wants the shortest viable cut, so list new LEGOs of 7+ with a proposed shorter cut where one is obvious. The tool's count is a character ESTIMATE: recount by hand before listing.
- English must be grammatical and natural (K9); verb LEGO English carries "to" (K54); person must match on both sides (K26).
- Unlikely-to-come-up is NOT a defect (P14). Soft English synonyms are not defects. Deliberate ambiguity may be Kai's own ruling (P15).
- Welsh is never a fix target. A soft preference never opens a correct live row (R0.18): propose, do not assume.
- R0.8: do NOT hand Kai back his own decisions. Before listing an item, check the course's held/ruled records named in your slice; mark items already there "KNOWN (doc id)" and keep them out of the new-findings count.
- Fix recommendations are BEST EFFORT from the course's own taught forms plus online sources (dictionaries, grammars, corpora), cited; one-word confidence (sure / likely / best guess).
  Never "needs a native speaker", never a question list for a proofreader.

## What to do, in order
1. For EACH course in your slice: dump, detect, and for every family read the hits and split them: REAL / NOT A DEFECT (say the mechanism) / KNOWN.
2. PRIORITY — fixes made in the MAIN course and not in its variants: mine the main course's fix records named in your slice (ops/ dirs in this repo; published docs via
   `curl -s -H "x-cs-conv: <your token>" http://localhost:4317/d/<id>`), turn each fixed defect into a lexical pattern with a KNOWN POSITIVE (the pre-fix text),
   add it to a copy of patterns.json under your language, confirm detect.cjs passes its calibration (exit 3 = your regex misses its own positive; fix or drop it),
   then run it on the main course AND every variant in your slice. A detector that cannot find a known positive is dropped and named in your gaps.
3. Hunt false positives: for each family understand the mechanism before calling it a defect (gender prep, stand-in frames, dialect forms that are RIGHT for a variant,
   canon exceptions above). A regional variant's own form is not a defect because the main course says it differently.
4. Audio cost per recommended fix: characters of NEW text that would be re-recorded = target text × 2 voices + known text × 1 (only the sides that change; a delete costs 0). Give a total per family.

## Deliverable (your final report is short; the substance is in the published doc)
- Write `ops/paid-cleanup-scan-447/reports/<your-slice>.md` and `…/<your-slice>.json` (rows: course, family, row id, known, target, verdict, recommended fix, confidence, source, canon ref, chars),
  plus your added patterns as `…/<your-slice>.patterns.json`. Commit on YOUR branch and push it (do not merge to main).
- The .md is grouped by COURSE then FAMILY: what it is in one plain sentence, 3–5 examples with live row ids (known | target → proposed), how many REAL (and how many read), the recommended fix,
  the canon check, the audio chars. Then a COVERAGE table (family × course: scanned / excluded and why / not scanned) and GAPS. Plain English, short sentences, no jargon Kai would have to look up.
- Publish the .md: POST http://localhost:4317/api/publish-doc with your x-cs-conv header and {"path": "<absolute path>", "title": "<slice> — cleanup scan findings (#447)", "conv_id": "<your conversation id>"}.
- Final report (one paragraph): doc url, per-course count of REAL new findings, total chars, anything you could not read (GAP), then the landing line (branch, "not merged", not deployed).
