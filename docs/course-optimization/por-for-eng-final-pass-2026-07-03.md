# por_for_eng — Final Pass Report (2026-07-03)

Targeted final pass over 380 seeds (1–3, 114, 136, 139, 143, 183, 185, 281, 286, 293, 301–668).
Architecture: Opus orchestrator + 6 Sonnet reviewers (read-only) → orchestrator verified every flag and acted.

## Actions taken

### Deleted — 49 isolated phrase-level errors
Verified genuine grammar/content errors, LEGO stayed ≥4 USE (or dropped to backfill):
- **Gender/agreement**: S0361L01B03 (calado→calada), S0434L01U02 (contente→contentes), S0434L03U01 (muitas→muitos alunos), S0615L01U02 (corajoso→corajosa)
- **Wrong verb/person**: S0364L04U04 (came→foi), S0374L01U03 (achei/she), S0397L01U05 (nos/se), S0444L03U05 + S0456L01U04 (she thinks→disse), S0452L01U05 (sabe→disse), S0420L01U02 (conheces→sabes), S0569L02U06 (foi já decidiste), S0571L01U04 (estou/está), S0593L01U04 (tinha discutisse), S0603L01B02/U04 (missing "de")
- **Mood**: S0330L01U03/U04 (seja→é after affirmative achar), S0419L02U04 (gostem→indicative)
- **Structure/prep**: S0364L04U06 (sobre daquele), S0373L01U05 (stray era), S0387L02U06 (subj after sabia que), S0411L01U03 (quatro mais→mais quatro), S0366L01B04 (missing com), S0432L01B03 (antes de perguntes→perguntares), S0455L03B03 (truncated)
- **Content mismatch / stray content**: S0339L01U02, S0364L02U06, S0377L01U03/U05/L02U06, S0450L02U04/L03U04, S0566L01U04, S0577L01U04, S0610L01U02 (missing algo), S0615L02B03 / S0635L01B03/U04 / S0641L01B03 / S0654L01B03 (stray hoje/ali/muito), S0622L01U02/U03 (missing clitic o → seed 622 backfilled)
- **EP clitic (isolated, correct siblings existed)**: S0339L02B02/B03/U03 (ele se magoou→magoou-se)
- **quem/que**: S0343L02U01, S0344L01U01, S0345L01U01 (que disse→quem disse)

### Flagged for rebuild — 9 seeds (whole-LEGO structural defects; backfill can't fix)
- **427** — tense sequence: present "querem" + imperfect subj "achasses" (should be present subj "aches"), whole L02
- **482** — subjunctive "estejam" in plain "disse que" reported speech (no trigger), L03
- **501** — missing "que" after "disse" before "se ao menos" clause, across L02/L03/L04 (+ pudesse/pudessem agreement, trust-them/you pronoun)
- **507**, **524** — EP clitic: enclisis wrongly retained after "que" (mudámo-nos→nos mudámos; ligo-te→te ligo), whole LEGOs
- **521** — missing reflexive clitic "te" (esqueças→te esqueças), whole L04
- **531** — subjunctive "possa" no trigger in "disse que", L01/L02
- **532** — subject-verb agreement: "tenha" (sg) throughout for plural subject → "tenham", near-whole seed
- **668** — ZUT violation: identical known "I hope you'll all be able to go" → two targets (±todos); stray "então"

## LEFT IN PLACE — needs a course-wide batched fix (NOT blocked; approved as-is)

These are systematic/orthographic and recur beyond the reviewed range — best fixed by one course-wide script sweep, not by blocking individual seeds.

1. **Mid-sentence capitalization** (seeds 547, 549, 558, 573, +likely course-wide): a component's sentence-initial capitalized form ("Porque"/"É") is reused verbatim when embedded mid-sentence in "[subj] disse que …" USE phrases.
   → Suggested sweep: lowercase a capitalized word immediately following "que " in target_text (guard proper nouns). Does NOT affect audio (case-only) — no audio_id null needed.

2. **Missing de+DEM contraction** (seed 417, +course-wide): "de aquele/a/es/as" not contracted to "daquele/a/es/as" (mandatory).
   → Suggested sweep: regex `\bde (aquele|aquela|aqueles|aquelas)\b` → `daquel…` in target_text.

3. **Frozen-core reported speech** (seeds 505, 506, 511, 513, 514, 515, 519, 522, 526, 654U04, +many course-wide): "[she/he/they] disse que …" USE phrases retain the underlying LEGO's frozen 1st-person / default form instead of re-conjugating to the reported subject — e.g. "ela disse que encontrei" (she said that *I* found) for "she said she found it"; "ela disse que são várias horas" (no past backshift). Reviewers 5 & 6 judged this an established course-wide convention and deliberately did not flag it; reviewer 4 flagged its subset. **This is a course-level decision for Kai**: accept as convention, or schedule a targeted regen. Fixing only the flagged subset would be inconsistent with identical unflagged instances elsewhere.

## Uncertain / left as-is (judgment calls, not deleted)
S0143L02U03 (pensar de vs em — also would drop L01 below threshold), S0346L02B03/U01 (um livro dela vs o livro dela — definiteness), S0423L01B02 (isso óbvia — possible fem preload), S0421L02U02 (que fazer vs o que fazer — acceptable register), S0503/S0517/S0539 ("disse que mas" — possible quote-fragment convention).

## Notes
- por_for_eng is European Portuguese (tu/-te, comboio, enclisis rules apply).
- The "she thinks→disse" swap (S0444, S0456) and the frozen-core pattern both look like find/replace / LEGO-reuse artifacts — worth a course-wide grep beyond these 380 seeds.
