gle_v2_for_eng "remember" family, second pass (job #426, 12 Nov 2026). Read-only proposal for Kai. Nothing here was applied.

- proposal.json: every seed, LEGO and phrase in the course that carries "remember" / cuimhneamh (7 seeds, 4 LEGOs, 173 phrases, read live after #403), with Eoghan's Irish beside ours and two options per row. Option A (recommended) keeps `cuimhneamh ar` and changes nothing. Option B is Eoghan's own `cuimhneamh a dhéanamh ar`, with the proposed text for every row it touches, the three LEGO re-cuts the 8-syllable cap forces, and the rows held or deleted.
- build.py: regenerates proposal.json with `python3 build.py <seeds.json>`, where seeds.json is Popty's `GET /api/production/gle_v2_for_eng/seeds`. The row lists regenerate; the SEEDS_B / LEGOS_B / SPECIAL tables in it are hand-written judgement and do not.
- An applier runs only after Kai picks A or B. Option A needs no applier.
- Supersedes ops/gle-v2-remember/ on branch cs/410-gle-v2-remember-family-proposal- (never merged).
