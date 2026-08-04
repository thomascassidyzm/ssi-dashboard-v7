# Parenthetical Cleanup Plan — 9 main `_for_eng` courses (2026-06-22)

Kai's steer: **parentheticals are the methodology problem** (English-side grammar labels → learner confusion); slashes are cosmetic and deprioritised. Plan + check first, then apply. NO DB writes yet.

## The shape of the problem
965 LEGOs carry a parenthetical in the **English known** side (grammar/gender labels the learner should never see). Splitting by what happens when you strip the label:

| course | cosmetic | grammar-singleton | ZUT-creating | total |
|---|---|---|---|---|
| spa | 14 | 20 | 8 | 42 |
| fra | 25 | 14 | 23 | 62 |
| ita | 2 | 7 | 7 | 16 |
| deu | 38 | 120 | 109 | 267 |
| zho | 40 | 8 | 5 | 53 |
| jpn | 0 | 0 | 0 | 0 |
| por | 15 | 22 | 13 | 50 |
| kor | 171 | 130 | 72 | 373 |
| ara | 21 | 49 | 32 | 102 |
| **total** | **326** | **370** | **269** | **965** |

(Also: 236 phrases carry parens in known_text + a handful in target — separate, mostly mirror the LEGO labels. 0 parens in target LEGOs.)

## Three buckets, three treatments

**1. Cosmetic (326) — SAFE STRIP.** The label is pure clarification; the target is the natural reading. E.g. `"a little (bit)"→ein bisschen`, `"new (fem.)"→nouvelle`, `"close by (prepositional)"→in der Nähe`. Action: strip label → regen audio (the label was voiced). No ZUT, no mapping change. Clear win. Concentrated in kor (171), zho (40), deu (38).

**2. Grammar-singleton (370) — STRIP LABEL, FLAG MAPPING.** Case/tense/gender-marked but no colliding sibling, so no ZUT. E.g. `"bought (past part.)"→gekauft`, `"madam (subject)"→여사님이`. Stripping the label is correct (don't show grammar), but the bare English→marked-form mapping ("madam"→여사님이 with subject particle) is a **known-side-control** question, not a clean cosmetic strip. Action: strip the label now (improvement either way); log the mapping for the known-control review. Concentrated in kor (130), deu (120), ara (49).

**3. ZUT-creating (269) — METHODOLOGY RESOLUTION.** The label was the ONLY thing distinguishing two+ is_new LEGOs that share an English gloss. Stripping surfaces a real ZUT (`children (acc.pl)→Kinder` vs `children (dat.pl)→Kindern`; `should`→soll/sollte/sollten). Action: per-conflict — **expand with context** (M-type with the governing prep/verb that forces the form), rename to a distinct gloss, or set is_new=false. **Concentrated in deu (109) + kor (72) + ara (32) = 213 of 269** — these are systemic case/honorific labelling, i.e. the *known-language-control* problem (WORKLIST #1 NEXT). The other courses are small & tractable: spa 8, fra 23, ita 7, zho 5, por 13.

## Recommended sequence (after your nod)
1. **Cosmetic strip** (326) per course → regen. Show you the exact diff on one course (ita, smallest) as the "check" before scaling.
2. **Grammar-singleton strip** (370) → strip labels, regen, log mappings for known-control.
3. **ZUT-creating, tractable courses** (spa/fra/ita/zho/por = 56) → per-conflict expand/rename/is_new=false, re-verify ZUT=0.
4. **ZUT-creating deu/kor/ara** (213) → the methodology batch — needs your call (see decision below).
5. Slashes (deprioritised), missing-?, presentation drift, case-dupes — after parens settle.

## Check performed
Re-detected ZUT on paren-stripped text (this is how the 269 were found). Verified the clean-strip set has no residual collisions among itself (deu had 1 mis-bucketed → reclassified to ZUT-creating). Detail: `*.paren.json`, `*.zut.json`, `zut-plan-2026-06-22.md`.

## Decision needed
The deu/kor/ara ZUT-creating set (213) is the *known-language-control* problem at scale (grammar labels used as a disambiguation crutch). **Resolve bespoke per-LEGO now, or fold into the known-control policy (WORKLIST #1)?** That determines whether I expand ~213 LEGOs by hand or wait for the policy.
