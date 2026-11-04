# fry_for_eng stage 2 — block review brief (job #199, Kai's GO 4 Nov 2026)

You review ONE block of freshly built fry_for_eng seeds (your block is in your dispatch). The Popty build team built them under brief v3 (`ops/fry-build/stage2-builder-brief-301-668-v3-2026-11-03.md`, d/405cea45) and the live rule text (`ops/fry-build/governing-brief-grammar-rules-2026-10-28.txt`, = `courses.quality_rules.grammar_rules`). Read the rule text file first (8 KB); the v3 brief only if you need detail.

## Read every row
`curl -s "localhost:3470/api/production/fry_for_eng/script-view?seedStart=A&seedEnd=B" > $CS_SCRATCH/b.json` (max 50 seeds) then `python3 ops/fry-build/stage2-dump-block.py $CS_SCRATCH/b.json`. Read every LEGO and phrase in full. Regex may FIND candidates; it never decides. Never sample.

## What to check (the defects stage 1 actually had, plus Auke's rules)
1. Infinitives: after modals / litte / sjen / gean / bliuwe / graach and in bare "to X" = -e/-je (wol leare, kin prate); -en/-jen ONLY right after te (te learen). The phrase door writes "wol learen": fix every one.
2. ús always accented; no lowercase "us" on the Frisian side (seeds 454/462 capital "Us" are Auke's — leave the seed, but never copy lowercase).
3. dû/-stû only, never do/-sto. jo only in 639–655; jim in 529 and 656–668; a basket never mixes jo/jim/dû.
4. "?" on every BUILD/USE phrase that is a real question, BOTH sides; statement + question ("ik bin klear, wêr wolstû moetsje?") gets "?". Embedded clauses, fragments and inverted conditionals are not questions. NO "?" on any LEGO or component, either side.
5. No ask-then-state lines (a question followed by a statement in one line): reword to one thing, or delete the phrase.
6. Phrases lowercase, no full stop; never a capitalised one-chunk sentence ("In âlde man."). BUT English "I", day/month names, Mum/Dad and language names keep their capitals — the builder writes "i", "monday": fix every one (#213 found 24 in 311–360).
7. Mum/Dad capitalised under ús mem / ús heit when the English says Mum/Dad.
8. Auke's choices are not "corrected": no útfine; besykje only for a real attempt and never brought into 541/638; "should" never drilled as both moatte and soe…moatte in one basket, never moat as "must" under a "should" LEGO; ik fyn vs ik tink dat — build what the seed says, never drill the competing form in the same basket; no "kinne sil" where the seed has kin/kinne; stopje/efkes/elts/poppe/ûnthjitte/tichtby/saterdei stay; it liket for "it feels" (618).
9. Grammar and naturalness of every Frisian line (V2 main clause, verb-final subclause, modal cluster main-infinitive-before-modal, clitics on conjunctions, R-form relatives) and of every English line (stilted English is a defect; rare is not).
10. Every BUILD/USE phrase contains its LEGO on both sides; the known side uses only words already given (judge reasonably).
11. Phrase floors: after any phrase deletion, check the basket is not left thinner than it should be — prefer reword over delete.

Split LEGOs wrapping another LEGO (ik haw har … sjoen) are the stage-1 shape (84 in 1–300): not a defect.

## What you may change, and how
- ONLY through `POST http://localhost:3470/api/production/fry_for_eng/edit-batch` (header `x-agent-id: kai-fry-stage2-review`): dry run first, then the same body with `"apply": true`; at most 50 ops per request. Save each applied response (it carries before/after) as `ops/fry-build/stage2-review-<A>-<B>-<n>.batch-and-undo.json`, commit and push on your own branch. Ops: `phrase.update` (known_text/target_text), `phrase.delete`. Vocabulary: `GET /api/production/fry_for_eng/edit-ops`.
- Clear-cut defects (items 1–7, plain grammar slips, ask-then-state): FIX.
- Any language judgement you are not sure of, any LEGO change, any seed text: HOLD. Never edit a LEGO, never delete a LEGO, never edit seed text. Held items go in your record and the Auke question list.
- Then set EVERY seed in your block to draft: `seed.update` with `"set": {"status": "draft"}` (the build route marks seeds released; Kai wants them draft for Auke). Touch only seeds in your block.
- After your fixes run `curl -s localhost:3471/api/build/zut-collisions/fry_for_eng` and report the count.
- Text only. NO audio, no TTS, no render calls. No hand-written DB code. Scratch in $CS_SCRATCH.
- The build team is still building later seeds while you work: do not touch seeds outside your block, and do not start, stop or restart the build.

## Deliverable
Publish ONE record (http://localhost:4317/api/publish-doc with your own x-cs-conv token, `conv_id` your own conversation): counts (LEGOs and phrases read; fixed by type; deleted; held), every change as `id: before → after`, the held list with seed numbers and phrases, and a "Questions for Auke" list (phrases in full, seed numbers). Report back in one paragraph with the url, the event ids, the ZUT count, and anything systemic (a defect that recurs across many seeds — say so loudly so the builder rules can be tightened for later blocks).
