# spa_for_eng wide sweep (#255·AD) — triage brief for one seed band

READ-ONLY JOB. Never write to the course, never render audio, and never write code of your own against the database (Tom's hard rule, job #384). Read only the snapshot file below; if you must see something live, use a Popty GET route on http://localhost:3470.

## Setup
```
git fetch origin cs/255-spa-wide-grammar-sweep && git checkout origin/cs/255-spa-wide-grammar-sweep -- ops/spa-wide-255
S=~/ssi-evidence/ssi-dashboard-v7/ops/spa-wide-255/snap/spa-post.json   # course read after #259·AD, 4 Nov
```
Your input: `ops/spa-wide-255/triage/input/<BAND>.jsonl`, every item a Sonnet second read CONFIRMED in your seed band (first pass Sonnet + Haiku, told to over-flag). Each line: id, role (build/use/lego/seed), current known/target, its LEGO and seed pair, the second read's type/problem/fix and the first pass's reason. The second read is often wrong or over-eager: you are the final judge. Read EVERY item in full, against the phrase's LEGO, its seed, and its live basket in the snapshot.

## What you produce
`ops/spa-wide-255/triage/out/<BAND>.jsonl`, one line per input item (every input id exactly once), plus one line per knock-on row you add:
```
{"id":"S0123L02U05","bucket":"CLEAR|NEEDS-KAI|NEEDS-NATIVE|FALSE","type":"GRAMMAR_ES|UNNATURAL_ES|MEANING|ENGLISH|REGISTER|NONSENSE",
 "before":["<known now>","<target now>"],"after":["<known after>","<target after>"] or null,   (after = full texts; target "DELETE" = delete a phrase)
 "reason":"<one plain sentence a reader on a phone understands>","rule":"<canon id(s) the fix relies on, e.g. K16, P17, K14>",
 "knock_on":["<ids of OTHER rows carrying the same defect>"], "knock_on_of":"<id this row is a knock-on of, or null>",
 "proposal":"<NEEDS-KAI: the change you recommend, incl. downstream rows>", "question":"<NEEDS-NATIVE: one Deborah-style question, Spanish quoted>",
 "gates":{copied from gates.py output for CLEAR rows}}
```
Commit it on your branch, push, and ALSO copy it to `~/ssi-evidence/ssi-dashboard-v7/ops/spa-wide-255/triage/out/<BAND>.jsonl`. Report in one paragraph: counts per bucket, the 3 most common defect patterns, and your branch.

## Buckets
- **CLEAR**: a phrase (build/use row) with an unambiguous error, fixed with a minimal edit that (a) uses only taught target words (gates `untaught` empty; P1/P2: any word met earlier in course order, even inside a chunk, is taught, but another conjugation/plural/clitic form is NOT), (b) still contains its whole LEGO on both sides (P17; K49 allows words inside / reordering; K50: a different verb form of the LEGO's verb is a break), (c) makes no ZUT clash (gates `zut` empty for USE rows; K3: two Englishes to one Spanish is fine, one English to two Spanish is not), (d) changes nothing in a LEGO, seed or intro. Prefer fixing the ENGLISH when the Spanish is correct or when the Spanish fix would need an untaught form (K14). A phrase that cannot be fixed within taught material may be CLEAR as "DELETE" only if its basket keeps at least 4 USE and 1 BUILD played rows after all deletes; otherwise NEEDS-KAI.
- **NEEDS-KAI**: anything touching a LEGO or seed text (never propose deleting a LEGO: expand, re-cut or merge), a pattern decision affecting many rows, a meaning call where the course's choice is arguable, an untaught-form problem with no taught fix. Give seed number, the pair, and a concrete proposal including downstream rows.
- **NEEDS-NATIVE**: ONLY where the fix hinges on Spanish naturalness you genuinely cannot settle (canon §7: do not defer to a native as a habit; Kai: "you can still try"). Write a question Deborah can answer in one line.
- **FALSE**: not a real defect (explained by a taught LEGO pairing, Kai 2026-08-24 "the LEGOs decide"; acceptable Spanish; rare-but-fine P14; known side using an uninstructed form of a taught word K6).

## Run the gates on every CLEAR (and DELETE) before you write it
```
python3 ops/spa-wide-255/gates.py $S proposals.jsonl --out checked.jsonl
# proposals.jsonl lines: {"id":..., "after_known":..|null, "after_target":..|null, "pattern_target":"<defect substring>"|null, "pattern_known":..|null}
```
gates.py reads only the snapshot file. `pattern_rows` lists every played row in the WHOLE course containing the defect substring: read each one; those sharing the defect become knock-on rows (their own CLEAR lines with "knock_on_of"), whatever band they fall in. A CLEAR that fails a gate is not CLEAR: fix the fix, or move it to NEEDS-KAI. Scratch goes in $CS_SCRATCH, never /tmp.

## spa_for_eng rulings already made (do not re-open; flag only if a row breaks them)
- "I think + clause" = **creo que**; "you/they think + clause" = **crees/creen que**; "what do you think (about)", "think about", "planning to", past tenses and formal piensa stay **pensar** (Kai, #864, 2 Nov).
- Comparison with a clause = **de lo que** (Deborah). Deborah's applied choices stand: frecuentemente→**a menudo**, definitivamente→**sin duda**, "I don't feel ready" = **no me siento listo**.
- Enclitics (P27): **-lo** taught at seed 146, **-te** at 30, enclitic **-la is never taught** (verla, escucharla are untaught); a proclitic lo/la before a finite verb is fine where taught. "doing well/better" = **lo estoy haciendo bien** (lo taught S0072).
- **intentar**: seeds 7-141 use a taught object (algo/eso/nada) or bare where "again" completes; 146+ may use intentarlo with "it" in English.
- "I could" = **pude** (seed 148): affirmative pude phrases were made negative by Kai's ruling.
- "sorry, but" = **lo siento, pero**. Articles in seeds 5-13 ("el") are PARKED by Kai: do not touch.
- A dropped OBJECT (it/them/this, lo/la/eso) on one side only IS a defect (Kai 30 Oct) unless a taught LEGO pairs it that way.
- Never delete a LEGO. Empty seeds are fine. Unlikely-to-come-up is not a defect (P14). The bar is grammatical + natural.
- Already-held items: mark FALSE with note "ALREADY-HELD <doc>" rather than re-raise: S0427L01 "you thought" gloss; re-gloss of S0210L01/S0327L01; d/8287a39d (Deborah's 49 held), d/27bfe14b (seeds 116/122/138-140), d/7528fbc9 Kai calls.
- English must be grammatical and natural (K9); target correct and natural (K16); person matches on both sides (K26); agreement follows the noun present (K27); register consistent (K10). Full canon: `course-methodology-canon.md` §3-§4, only if you need detail.
