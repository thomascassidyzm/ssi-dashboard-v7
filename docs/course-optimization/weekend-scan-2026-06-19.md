# Weekend Scan — 9 Main `_for_eng` Courses (2026-06-19)

Generated 2026-06-19T13:42:27.932Z. Mechanical scan (Checks 1-18) per `.claude/commands/scan-course.md`. Haiku Step-4 language spot-check tracked separately (see §Haiku status).

Courses: spa_for_eng, fra_for_eng, por_for_eng, deu_for_eng, kor_for_eng, ita_for_eng, ara_for_eng, zho_for_eng, jpn_for_eng

## At-a-glance matrix

| course | 1 paren | 2 slash | 3 wL-kn | 4 wL-tg | 5 multi | 6 unpr | 7 quote | 8 trailP | 9 lc-i | 10 ZUT | 14 ? | 15 id | 18 drift |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| spa | 74 | 88 | 0 | 0 | 27 | 0 | 0 | 2 | 238 | 3 | 26 | 7 | 26 |
| fra | 92 | 64 | 0 | 0 | 1 | 0 | 0 | 0 | 110 | 9 | 110 | 46 | 14 |
| por | 76 | 147 | 0 | 0 | 0 | 0 | 0 | 0 | 135 | 0 | 107 | 93 | 0 |
| deu | 287 | 231 | 0 | 0 | 1 | 0 | 0 | 0 | 22 | 1 | 57 | 58 | 9 |
| kor | 433 | 366 | 1 | 1 | 4 | 0 | 0 | 0 | 62 | 0 | 0 | 0 | 26 |
| ita | 16 | 49 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 4 | 102 | 11 | 10 |
| ara | 130 | 133 | 0 | 0 | 10 | 0 | 269 | 0 | 218 | 0 | 0 | 0 | 11 |
| zho | 98 | 1166 | 2 | 0 | 8 | 3 | 0 | 12 | 121 | 7 | 0 | 0 | 8 |
| jpn | 0 | 3 | 0 | 0 | 4 | 0 | 29 | 0 | 52 | 9 | 0 | 0 | 0 |

*(Checks 11 vocab-word, 12 vocab-chunk, 13 case/outliers, 16 underpopulated, 17 lang-specific listed per-course below — high counts there are mostly known-territory or judgment, not simple fixes.)*

## A. SAFE auto-fixes — no audio regeneration needed (apply this weekend)

These change text without changing what TTS speaks, per memory `feedback_audio_null_only_when_tts_affected` (case & trailing-period = no audio null; quotes aren't voiced). Whole-class re-verify after each. Course-scoped → no cross-course infection.

### A1. Lowercase "i" → "I" (English known side) — Check 9

| course | count |
|---|---|
| spa_for_eng | 238 |
| fra_for_eng | 110 |
| por_for_eng | 135 |
| deu_for_eng | 22 |
| kor_for_eng | 62 |
| ara_for_eng | 218 |
| zho_for_eng | 121 |
| jpn_for_eng | 52 |

Fix: `text.replace(/\bi\b/g,'I').replace(/\bi'/g,"I'")` on the English field. No audio impact (case-insensitive to TTS).

### A2. Trailing periods — Check 8

| course | count |
|---|---|
| spa_for_eng | 2 |
| zho_for_eng | 12 |

Fix: strip trailing `.`. Per memory, period removal does NOT require audio null.

### A3. Speech-mark wrapped text — Check 7

| course | count |
|---|---|
| ara_for_eng | 269 |
| jpn_for_eng | 29 |

Fix: strip wrapping quotes from known_text + target_text AND from matching course_audio.text/text_normalized (keeps export consistent). Quotes aren't voiced → no regen. **Largest: ara (269), jpn (29).**

## B. Fixable text, but AUDIO-AFFECTING → text-fix queued, regen needs Kai's approval

Doing the text change without regenerating audio leaves text/audio drift (breaks legacy export). So these are PREPARED but NOT applied until Kai approves the TTS regen on Monday.

### B1. Parentheticals in known_text (grammar annotations) — Check 1

| course | count |
|---|---|
| spa_for_eng | 74 |
| fra_for_eng | 92 |
| por_for_eng | 76 |
| deu_for_eng | 287 |
| kor_for_eng | 433 |
| ita_for_eng | 16 |
| ara_for_eng | 130 |
| zho_for_eng | 98 |

Strip annotations like "(imperfect)", "(条件)". These were voiced into presentation/known audio → regen needed. **After stripping, MUST re-run ZUT check (Check 10) — stripping reveals hidden duplicates.** Largest: kor (433), deu (287).

### B2. Missing question marks — Check 14

| course | both-sides ? | spanish ¿ |
|---|---|---|
| spa_for_eng | 26 | 24 |
| fra_for_eng | 110 | 0 |
| por_for_eng | 107 | 0 |
| deu_for_eng | 57 | 0 |
| ita_for_eng | 102 | 0 |

Adding `?` changes TTS intonation → regen needed. Memory `feedback_haiku_is_mandatory`: question-mark Haiku validation is MANDATORY before applying (mechanical regex misses yes/no, declarative, tag questions). So: Haiku-validate → apply → null audio → regen (approval).

## C. Needs judgment — LEAVE for Kai (documented, not auto-fixed)

### C1. Slashes in known_text — Check 2

| course | count |
|---|---|
| spa_for_eng | 88 |
| fra_for_eng | 64 |
| por_for_eng | 147 |
| deu_for_eng | 231 |
| kor_for_eng | 366 |
| ita_for_eng | 49 |
| ara_for_eng | 133 |
| zho_for_eng | 1166 |
| jpn_for_eng | 3 |

Synonym glosses ("speech / words"). Skill: don't blindly pick first — he/she needs seed check, synonyms pick first, word/word+trailing keeps trailing. **zho (1166), kor (366), deu (231)** are large. Semi-mechanical but volume + judgment → defer.

### C2. ZUT conflicts — Check 10

**spa_for_eng** (3 real, +0 gender):
  - "to feel" → `sentirme` vs `sentirse` (S0041L04, S0122L02)
  - "instead of" → `en lugar de` vs `en vez de` (S0523L01, S0502L03)
  - "we are" → `estamos` vs `somos` (S0102L01, S0110L01)

**fra_for_eng** (9 real, +0 gender):
  - "anywhere" → `nulle part` vs `quelque part` (S0603L03, S0182L03)
  - "holidays" → `vacances` vs `les vacances` (S0378L01, S0573L01)
  - "how" → `à quel point` vs `comment` (S0600L03, S0003L01)
  - "thought" → `pensais` vs `trouvé` (S0616L01, S0615L03, S0124L01)
  - "to leave" → `partir` vs `quitter` (S0345L02, S0139L02, S0588L01)
  - "wanted" → `voulu` vs `voulait` (S0580L03, S0052L01)
  - "work" → `travail` vs `fonctionne` (S0610L01, S0094L03)
  - "her" → `son` vs `sa` (S0637L01, S0053L02)
  - "that" → `cela` vs `que` (S0644L01, S0121L02)

**deu_for_eng** (1 real, +0 gender):
  - "to write" → `schreiben` vs `einen Brief` (S0052L01, S0052L02)

**ita_for_eng** (4 real, +0 gender):
  - "to eat" → `da mangiare` vs `mangiare` (S0243L02, S0400L01)
  - "to wake up" → `svegliarmi` vs `svegliarsi` (S0055L01, S0584L02)
  - "a friend" → `un'amica` vs `un amico` (S0308L01, S0265L01)
  - "to answer" → `rispondere` vs `per rispondere` (S0043L02, S0027L03)

**zho_for_eng** (7 real, +0 gender):
  - "to speak" → `新事` vs `说` (S0227L01, S0001L02)
  - "to start" → `开始` vs `会问` (S0023L02, S0223L01)
  - "finish" → `结束` vs `完成` (S0050L01, S0149L03)
  - "if" → `如果` vs `的话` (S0049L01, S0229L02)
  - "to know" → `知道` vs `认识` (S0045L01, S0230L01)
  - "to remember" → `想起` vs `记住` (S0006L01, S0010L04)
  - "to try" → `足球` vs `试试` (S0221L01, S0002L01)

**jpn_for_eng** (9 real, +0 gender):
  - "woman" → `女の人` vs `女性` (S0305L01, S0232L02)
  - "can do" → `できる` vs `できます` (S0317L02, S0645L02)
  - "three" → `三つ` vs `三` (S0311L01, S0524L01)
  - "that" → `その` vs `それが` (S0336L01, S0127L01)
  - "can speak" → `話せる` vs `話せます` (S0009L01, S0662L01)
  - "think" → `思う` vs `思います` (S0486L04, S0666L01)
  - "don't mind" → `気にしない` vs `気にしませんか` (S0540L03, S0667L01)
  - "can help" → `お手伝いできます` vs `お手伝いできる` (S0660L01, S0654L01)
  - "are doing" → `おられます` vs `されています` vs `やってる` (S0655L03, S0661L01, S0033L01)

Resolution patterns: `memory/methodology-zut-resolution.md`. Expansion/rename needs methodology judgment + tiling check.

### C3. Wrong-language clusters (incl. Latin-on-Latin that Check 3 missed) — Checks 3,4,15

**spa_for_eng**: wrong-lang known=0, target=0; identical-LEGO=1 (seeds: 481)
**fra_for_eng**: wrong-lang known=0, target=0; identical-LEGO=18 (seeds: 422, 411, 391, 148, 436, 202, 589, 618, 237, 95, 65, 268, 195, 221, 130, 357, 450)
**por_for_eng**: wrong-lang known=0, target=0; identical-LEGO=5 (seeds: 439, 443, 481, 577, 635)
**deu_for_eng**: wrong-lang known=0, target=0; identical-LEGO=15 (seeds: 211, 41, 391, 433, 389, 415, 388, 406, 589, 590, 494, 518, 519, 548, 535)
**kor_for_eng**: wrong-lang known=1 (seeds 334-334), target=1; identical-LEGO=0 (seeds: )
**ita_for_eng**: wrong-lang known=0, target=0; identical-LEGO=2 (seeds: 259, 123)
**zho_for_eng**: wrong-lang known=2 (seeds 546-550), target=0; identical-LEGO=0 (seeds: )

⚠️ **por_for_eng**: identical k/t surfaced Portuguese text in the English known field (e.g. "morrer"="to die", seeds ~439-443). Check 3 missed these (Latin script). Needs English re-derivation + rebuild. **Flag seeds, leave for Kai.**

### C4. Multi-sentence, unpronounceable, identical phrases

| course | 5 multi-sent | 6 unpron | 15 identical-phrase |
|---|---|---|---|
| spa_for_eng | 27 | 0 | 6 |
| fra_for_eng | 1 | 0 | 28 |
| por_for_eng | 0 | 0 | 88 |
| deu_for_eng | 1 | 0 | 43 |
| kor_for_eng | 4 | 0 | 0 |
| ita_for_eng | 8 | 0 | 9 |
| ara_for_eng | 10 | 0 | 0 |
| zho_for_eng | 8 | 3 | 0 |
| jpn_for_eng | 4 | 0 | 0 |

Multi-sentence: skill distinguishes dialogue (delete) from tag-questions/connectors (keep) — per-item judgment. Unpronounceable: delete (tiny counts). Identical-phrase: context-dependent.

### C5. First-letter case outliers (13b) — HIGH VOLUME, mostly noise

| course | known out | target out | note |
|---|---|---|---|
| fra_for_eng | 0 | 2022 | target convention drift |
| por_for_eng | 0 | 147 |  |
| kor_for_eng | 1863 | 0 | known FPs = English "I"-initial |
| ita_for_eng | 0 | 1 |  |
| jpn_for_eng | 2272 | 0 | known FPs = English "I"-initial |

jpn/kor known outliers are English "I" capitalization (correct — false positives). fra/por target outliers are sentence-capitalization convention drift (judgment, high volume). **Do NOT auto-fix.**

### C6. Case-only duplicates (13a)

| course | count |
|---|---|
| spa_for_eng | 323 |
| fra_for_eng | 162 |
| por_for_eng | 35 |
| deu_for_eng | 356 |
| kor_for_eng | 7 |
| ita_for_eng | 3 |
| ara_for_eng | 2 |
| zho_for_eng | 6 |
| jpn_for_eng | 3 |

Nearly always real bugs (same text, diff case). Fixable (pick dominant case) but touches audio text_normalized → review with Kai. spa(323), deu(356), fra(162) notable.

## D. Known-territory / OUT OF SCOPE (existing projects own these)

### D1. Vocab ordering (Checks 11 word, 12 chunk)

| course | 11 total | 11 catA | 12 total | 12 catA |
|---|---|---|---|---|
| spa_for_eng | 721 | 3 | 2291 | 103 |
| fra_for_eng | 306 | 36 | 1175 | 55 |
| por_for_eng | 339 | 6 | 717 | 24 |
| deu_for_eng | 517 | 8 | 1094 | 32 |
| kor_for_eng | 453 | 15 | 630 | 16 |
| ita_for_eng | 323 | 19 | 1102 | 44 |
| ara_for_eng | 177 | 69 | 175 | 7 |
| zho_for_eng | 870 | 781 | 0 | 0 |
| jpn_for_eng | 787 | 724 | 0 | 0 |

**zho (catA 781), jpn (catA 724)** = the ungated old-builder S351-668 extension. WORKLIST already tracks this as the gate-and-fix queue (`docs/course-optimization/upper-half-fix-queue.md`). Cat A in European courses is small (spa 3, fra 36, ita 19) — worth a look but mostly stemmer FPs (Check 11 known limitation). **Do not bulk-delete.**

### D2. Underpopulated LEGOs (Check 16)

| course | total | empty | noBuild | fewUse |
|---|---|---|---|---|
| spa_for_eng | 186 | 0 | 2 | 184 |
| fra_for_eng | 142 | 1 | 4 | 137 |
| por_for_eng | 88 | 0 | 0 | 88 |
| deu_for_eng | 122 | 0 | 14 | 108 |
| kor_for_eng | 29 | 0 | 6 | 23 |
| ita_for_eng | 360 | 0 | 0 | 360 |
| ara_for_eng | 68 | 0 | 0 | 68 |
| zho_for_eng | 3 | 0 | 0 | 3 |
| jpn_for_eng | 10 | 0 | 8 | 2 |

Mostly "few-use" (≥1 build, <2 use) — not blocking. Backfill is a build-pipeline action (Step 6a), needs approval. jpn has known 63 unbuilt seeds (memory `mass-approve-marks-empty-seeds-complete`).

### D3. Language-specific (Check 17)

- **spa_for_eng**: {"llevar":1}
- **por_for_eng**: {"eu_pt_voce":0}
- **deu_for_eng**: {"german_subordinate":3563}
- **ita_for_eng**: {"italian_subjunctive":0}
- **jpn_for_eng**: {"japanese_ka":"kaOnly=99,qOnly=698"}

- deu `german_subordinate` 3563 = candidates only (need LLM verb-final check), not violations.
- jpn `japanese_ka` kaOnly counts include FALSE POSITIVES (静か "quiet", しか "only" end in か but aren't questions) — unreliable, defer to Haiku/manual.
- spa `llevar` 1, ita `italian_subjunctive` 0 — clean.
- ⚠️ ita subjunctive re-decomposition is a PLANNED project Kai is reviewing (memory `ita-subjunctive-redecomposition-plan`) — **do not touch ita subjunctive structure**.

### D4. Presentation/text drift (Check 18)

| course | count |
|---|---|
| spa_for_eng | 26 |
| fra_for_eng | 14 |
| deu_for_eng | 9 |
| kor_for_eng | 26 |
| ita_for_eng | 10 |
| ara_for_eng | 11 |
| zho_for_eng | 8 |

Fix = regenerate presentation audio (needs approval). spa(26), kor(26), fra(14) notable. Queued for Kai.


---

## APPENDIX 1 — por_for_eng: Portuguese in the English known field (investigated 2026-06-19)

**Real builder bug, BOUNDED.** A cluster of phrases in por_for_eng has Portuguese text in the English `known_text` field (the learner would be shown Portuguese as their prompt). Mechanical Check 3 missed all of these because the text is Latin script.

- **~78 phrases** flagged by a Portuguese-token heuristic on the English side, concentrated in **seeds 457–481** plus **S439** ("morrer" LEGO + its 8 build/use phrases) and a couple of strays (S151, S402).
- Example phrases (known side, should be English): `morrer`, `morrer mais`, `parte do problema é o número de áreas`, `era tudo muito mais fácil antes`, `disse-lhe mas ela esqueceu-se`.
- The **seed-level** known_text for these seeds is correct English (e.g. S439 = "they don't want to die") — it's the **phrases** under them whose English side is Portuguese. So the builder lost the English known side for the phrase generation in this range.
- LEGO **S0439L01** ("morrer"/"morrer", is_new) + reuse **S0443L01** are the only LEGO-level instances.

**Recommended action (Kai):** flag seeds 457–481 + 439 for phrase rebuild (re-derive English known side); the Portuguese target side is fine. The full Haiku scan (running with FULL coverage on por for this reason) will give the exact phrase list. NOT auto-fixed — needs English re-derivation + audio regen.

**Other European identical-text findings are false positives** — fra/deu/ita/spa "identical" LEGOs are all cognates/loanwords (bus, table, problem, idea, film, weekend, football, person, baby, job…), legitimately identical. No wrong-language cluster in those four.

## APPENDIX 2 — Haiku coverage tiers (decision)

- **FULL coverage:** jpn, kor, zho, ara (non-Latin — Haiku is the only wrong-language defence) **+ por** (Latin-on-Latin cluster above).
- **SAMPLE (1/seed):** spa, fra, ita, deu (cognate-only identicals, Deborah reviews these languages, low wrong-language risk).

---

## HAIKU LANGUAGE SPOT-CHECK FINDINGS (Step 4)

Generated 2026-06-19T21:09:05.812Z. Full coverage on jpn/kor/zho/ara/por/fra/ita/deu; spa sampled (1/seed). These are WRONG-LANGUAGE findings (text in the wrong language for its field) — audio-affecting, so **queued for Kai, not auto-fixed**.

| course | coverage | batches | flagged | pending(gap) | status |
|---|---|---|---|---|---|
| jpn | full | 392/392 | 0 | 0 | done |
| kor | full | 466/466 | 1 | 0 | done |
| zho | full | 400/400 | 1 | 0 | done |
| ara | full | 425/425 | 0 | 0 | done |
| por | full | 484/484 | 130 | 0 | done |
| fra | full | 532/532 | 13 | 0 | done |
| ita | full | 453/453 | 1 | 0 | done |
| deu | full | 470/470 | 180 | 0 | done |
| spa | SAMPLE | 23/23 | 0 | 0 | done |

### jpn_for_eng — CLEAN (0 findings)

### kor_for_eng — 1 findings across 1 seeds (range 334-334)

Seed histogram: 334:1

Samples:
- `S0334L03C01` (component) K="안게" T="hold (causative form)" — known: 안게 | target: hold (causative form)

### zho_for_eng — 1 findings across 1 seeds (range 248-248)

Seed histogram: 248:1

Samples:
- `S0248L01B03` (build) K="too bad le" T="太糟了" — known mixes English with Chinese particle "le"

### ara_for_eng — CLEAN (0 findings)

### por_for_eng — 130 findings across 33 seeds (range 396-656)

⚠️ Large cluster — likely a builder failure over a seed range; recommend **flag affected seeds for rebuild** (re-derive the English known side). Audio regen needed.

Seed histogram: 396:6, 398:21, 399:4, 402:4, 404:5, 414:1, 439:8, 457:2, 458:2, 460:1, 461:2, 462:2, 463:3, 464:7, 465:7, 466:3, 467:5, 468:3, 469:2, 470:4, 471:3, 472:4, 473:3, 474:4, 475:2, 476:4, 477:4, 478:3, 479:2, 480:2, 481:2, 597:3, 656:2

Samples:
- `S0396L02U01` (use) K="we were prontos to go" T="estávamos prontos para ir" — known text has Portuguese word "prontos" embedded (should be "ready")
- `S0396L02U02` (use) K="we weren't prontos yet" T="não estávamos prontos ainda" — known text has Portuguese word "prontos" embedded (should be "ready")
- `S0396L02U03` (use) K="she said we were prontos" T="ela disse que estávamos prontos" — known text has Portuguese word "prontos" embedded (should be "ready")
- `S0396L02U04` (use) K="I didn't think we were prontos" T="não achei que estávamos prontos" — known text has Portuguese word "prontos" embedded (should be "ready")
- `S0396L02U05` (use) K="I said we were prontos" T="disse que estávamos prontos" — known text has Portuguese word "prontos" embedded (should be "ready")
- `S0396L02U06` (use) K="we were prontos for it" T="estávamos prontos para isso" — known text has Portuguese word "prontos" embedded (should be "ready")
- `S0398L01U03` (use) K="I think we need to be more pacientes" T="acho que precisamos de ser mais pacientes" — known has Portuguese "pacientes" embedded instead of English
- `S0398L01U04` (use) K="we were trying to be more pacientes" T="estávamos a tentar ser mais pacientes" — known has Portuguese "pacientes" embedded instead of English
- `S0398L01U05` (use) K="it's hard to be more pacientes" T="é difícil ser mais pacientes" — known has Portuguese "pacientes" embedded instead of English
- `S0398L02U01` (use) K="she has two filhos" T="ela tem dois filhos" — known has Portuguese "filhos" embedded instead of English
- `S0398L02U02` (use) K="filhos dela wanted to come" T="filhos dela queriam vir" — known has Portuguese "filhos dela" embedded instead of English
- `S0398L02U03` (use) K="I need to be more patient with my filhos" T="preciso de ser mais pacientes com filhos meus" — known has Portuguese "filhos" embedded instead of English
- `S0398L02U04` (use) K="we want more time with our filhos" T="queremos mais tempo com filhos meus" — known has Portuguese "filhos" embedded instead of English
- `S0398L02U05` (use) K="do you know her filhos?" T="conheces filhos dela?" — known has Portuguese "filhos" embedded instead of English
- `S0398L03U01` (use) K="nossos filhos wanted to come" T="nossos filhos queriam vir" — Portuguese mixed into known text
- `S0398L03U02` (use) K="we want more time with our filhos" T="queremos mais tempo com nossos filhos" — Portuguese mixed into known text
- `S0398L03U03` (use) K="nossos amigos wanted to help" T="nossos amigos queriam ajudar" — Portuguese mixed into known text
- `S0398L03U04` (use) K="she knows nossos filhos" T="ela conhece nossos filhos" — Portuguese mixed into known text
- `S0398L03U05` (use) K="we were with nossos filhos" T="estávamos com nossos filhos" — Portuguese mixed into known text
- `S0398L04U01` (use) K="os nossos filhos wanted to come" T="os nossos filhos queriam vir" — Portuguese mixed into known text
- `S0398L04U02` (use) K="do you know os nossos filhos?" T="conheces os nossos filhos?" — Portuguese mixed into known text
- `S0398L04U03` (use) K="we want more time with os nossos filhos" T="queremos mais tempo com os nossos filhos" — Portuguese mixed into known text
- `S0398L04U04` (use) K="os nossos amigos wanted to help" T="os nossos amigos queriam ajudar" — Portuguese mixed into known text
- `S0398L04U05` (use) K="she knows os nossos filhos" T="ela conhece os nossos filhos" — Portuguese mixed into known text
- `S0398L05U04` (use) K="do we want to tornar-nos more patient?" T="queremos tornar-nos mais pacientes?" — Portuguese mixed into known text
- …and 105 more (see temp/weekend-scan-2026-06-19/por_for_eng.haiku.json)

### fra_for_eng — 13 findings across 11 seeds (range 354-644)

Seed histogram: 354:1, 355:1, 497:1, 506:1, 508:1, 533:1, 535:1, 555:1, 557:2, 614:1, 644:2

Samples:
- `S0355L03C03` (component) K="de" T="de" — known: de (French, not English)
- `S0497L02C02` (component) K="need" T="as besoin" — target: "as besoin" — mixing English "as" with French; should be French only
- `S0506L01U01` (use) K="that was il y a des années" T="ça fait il y a des années" — known contains French — "il y a des années" mixed into known text
- `S0508L04C02` (component) K="de" T="de" — known: "de" — should be English, but this is French
- `S0533L02C01` (component) K="to" T="(included)" — target: "(included)" is not French — it's a placeholder/instruction, not actual translation text
- `S0535L02C01` (component) K="choose" T="(included)" — known: (included) is not French — it's a placeholder note, not target text
- `S0555L02C02` (component) K="en chercher" T="en chercher" — known should be English but is in French
- `S0557L01C03` (component) K="pas" T="pas" — known is French, not English
- `S0557L01C01` (component) K="ne" T="ne" — known is French, not English
- `S0614L03U04` (use) K="it is near where on habite" T="c'est près de là où on habite" — known: "on habite" is French, should be English
- `S0644L01B03` (build) K="yes cela is what I want" T="oui cela c'est ce que je veux" — known contains embedded French word "cela"
- `S0644L01B02` (build) K="I think cela is right" T="je pense que cela est bien" — known contains embedded French word "cela"
- `S0354L02C02` (component) K="de" T="d" — known is in French (de), not English

### ita_for_eng — 1 findings across 1 seeds (range 15-15)

Seed histogram: 15:1

Samples:
- `S0015L03C02` (component) K="me" T="me" — target is English, should be Italian

### deu_for_eng — 180 findings across 27 seeds (range 51-590)

⚠️ Large cluster — likely a builder failure over a seed range; recommend **flag affected seeds for rebuild** (re-derive the English known side). Audio regen needed.

Seed histogram: 51:1, 389:3, 391:2, 392:1, 393:4, 394:3, 408:6, 410:1, 466:15, 468:6, 470:12, 471:3, 473:1, 474:12, 476:4, 477:19, 478:6, 479:12, 480:6, 481:13, 482:13, 483:11, 484:5, 485:18, 525:1, 577:1, 590:1

Samples:
- `S0051L02U03` (use) K="Er will interesting things learn" T="Er will interessante Sachen lernen" — known: starts with German "Er" instead of English
- `S0392L04B01` (build) K="the post" T="post" — target is English, not German — "post" should be "Post"
- `S0393L01U03` (use) K="I have heard that that Junge wanted to travel to Africa" T="ich habe gehört, dass der Junge nach Afrika reisen wollte" — known contains German "Junge" instead of English "boy"
- `S0393L01U05` (use) K="I thought the Junge was near the entrance" T="ich dachte, dass der Junge in der Nähe des Eingangs war" — known contains German "Junge" instead of English "boy"
- `S0393L01U06` (use) K="the Junge went to the bus" T="der Junge geht zum Bus" — known contains German "Junge" instead of English "boy"
- `S0393L02B03` (build) K="the Junge is near with the green shirt" T="der Junge mit dem grünen Hemd ist in der Nähe" — known contains German "Junge" instead of English "boy"
- `S0394L01U05` (use) K="I thought the Mädchen was near the entrance" T="ich dachte, dass das Mädchen in der Nähe des Eingangs war" — known contains German "Mädchen" instead of English "girl"
- `S0394L01U06` (use) K="that Mädchen went to the bus" T="das Mädchen geht zum Bus" — known contains German "Mädchen" instead of English "girl"
- `S0394L02B03` (build) K="the Mädchen is near with the yellow dress" T="das Mädchen mit dem gelben Kleid ist in der Nähe" — known: German word "Mädchen" embedded in English text (should be "girl")
- `S0408L01U01` (use) K="I think that is the beste example" T="ich denke, dass das das beste Beispiel ist" — known uses German "beste" instead of English "best"
- `S0408L01U02` (use) K="I thought that was the beste example" T="ich dachte, dass das das beste Beispiel war" — known uses German "beste" instead of English "best"
- `S0408L01U03` (use) K="she told me that was the beste example" T="sie hat mir gesagt, dass das das beste Beispiel war" — known uses German "beste" instead of English "best"
- `S0408L01U04` (use) K="I think it is the beste way" T="ich denke, dass das der beste Weg ist" — known uses German "beste" instead of English "best"
- `S0408L01U05` (use) K="I think that is the beste we have" T="ich dachte, dass das das beste ist, was wir haben" — known uses German "beste" instead of English "best"
- `S0408L01U06` (use) K="we all thought that was the beste" T="ich dachte, dass das das beste war" — known uses German "beste" instead of English "best"
- `S0410L03B03` (build) K="I wollte they were fighting with each other" T="ich dachte, dass Sie miteinander streiten wollten" — known contains German word "wollte" mixed into English text
- `S0466L01B03` (build) K="lass mich es haben" T="lass mich es haben" — known: lass mich es haben — German, should be English
- `S0466L01U01` (use) K="lass mich es sehen" T="lass mich es sehen" — known: lass mich es sehen — German, should be English
- `S0466L01U02` (use) K="lass mich es machen" T="lass mich es machen" — known: lass mich es machen — German, should be English
- `S0466L01U03` (use) K="lass mich es verstehen" T="lass mich es verstehen" — known: lass mich es verstehen — German, should be English
- `S0466L01U04` (use) K="lass mich es wissen" T="lass mich es wissen" — known: lass mich es wissen — German, should be English
- `S0466L01U05` (use) K="lass mich es fragen" T="lass mich es fragen" — known: lass mich es fragen — German, should be English
- `S0466L01U06` (use) K="lass mich es finden" T="lass mich es finden" — known: lass mich es finden — German, should be English
- `S0466L02B03` (build) K="lass mich über" T="lass mich über" — known: lass mich über — German, should be English
- `S0466L02U01` (use) K="ich denke, dass wir über es sprechen sollten" T="ich denke, dass wir über es sprechen sollten" — known: ich denke, dass wir über es sprechen sollten — German, should be English
- …and 155 more (see temp/weekend-scan-2026-06-19/deu_for_eng.haiku.json)

### spa_for_eng — CLEAN (0 findings)


---

## FIXES APPLIED (2026-06-19/20, unattended) — Section A safe fixes

Applied the two **normalization-invariant** fixes (lowercase standalone "i"→"I" on the English side; strip genuine trailing ".") to phrases + legos across all 9 courses, via `safe-fix.cjs`. Two-step relink preserved every existing audio link (verified: restored audio `text_normalized` matches the new text → **NO TTS regen needed, no export drift**). All courses re-verified **CLASS CLEAN** and an independent mechanical re-scan confirms Check 8 = 0 and Check 9 = 0 everywhere.

| course | total fixes | lc-i (phrase) | lc-i (lego) | trailP | relinks | failed |
|---|---|---|---|---|---|---|
| spa | 258 | 238 | 15 | 5 | 50 | 0 |
| fra | 122 | 110 | 10 | 2 | 122 | 0 |
| por | 150 | 135 | 15 | 0 | 0 | 0 |
| deu | 22 | 22 | 0 | 0 | 0 | 0 |
| kor | 65 | 62 | 3 | 0 | 3 | 0 |
| ita | 11 | 0 | 11 | 0 | 11 | 0 |
| ara | 229 | 218 | 11 | 0 | 0 | 0 |
| zho | 133 | 121 | 0 | 12 | 14 | 0 |
| jpn | 64 | 60 | 4 | 0 | 3 | 0 |
| **total** | **1054** | | | | | **0** |

(Courses with 0 relinks had no generated audio on the affected rows — text fixed, nothing to relink. zho's 251 SEED-level trailing periods were deliberately left — zho is mid-overhaul and seeds have no audio-null trigger; flagged for Kai.)

**Nothing else was auto-fixed.** Everything in Sections B/C/D + the Haiku wrong-language findings (por S396-481, deu S466-485 clusters; fra/kor/zho/ita isolated leaks) is audio-affecting and/or judgment-heavy → left for Kai.

---

## DIALECT COURSES — scan + safe-fix + build readiness (2026-06-20)

Extended the same scan to the 6 existing dialect variants (read-only investigation + the two normalization-invariant safe-fixes). **None inherited the big por/deu wrong-language clusters from their mains** — dialect issues are isolated.

### Safe fixes applied to dialects (CLASS CLEAN, audio preserved, no regen)
| dialect | lowercase-i + trailP fixes |
|---|---|
| ara_eg | 336 |
| ara_lb | 17 |
| por_br | 17 |
| spa_mx | 1 |
| fra_ca | 0 |
| deu_at | 0 |

### Dialect Haiku language findings (real, isolated)
| dialect | seeds | phrases | Haiku real findings | note |
|---|---|---|---|---|
| ara_eg | 668 | 5,816 | 0 | clean |
| ara_lb | 668 | 5,469 | 10 | **builder bug, S22–38**: placeholder `b+`/`b+people` leak + **transliterated Arabic in the English known** (`yaskot`, `yihki`, `bido`, `baddha`, `min`) — needs English re-gloss for those build phrases |
| fra_ca | 668 | 7,537 | 1 (+1 FP) | S148 "gentil" in English known (real); S156 "restaurant"/"restaurant" = cognate FP |
| spa_mx | 668 | 7,230 | 2 | "correos"/embedded-Spanish in English known (isolated) |
| por_br | 668 | 6,372 | 1 | S227 "aquele homem" in English known (isolated) |
| deu_at | 668 | 5,736 | **446 = ALL FALSE POSITIVES** | ⚠️ **deu_at is NOT broken.** Austrian dialect uses **"I" = ich** and German **"will" = want**, so targets like `"I will Deutsch sprechen"` / `"I versuche..."` are valid Austrian. Haiku reads "I" as English. **Review deu_at with a dialect-aware lens, never standard Haiku/regex.** |
| ara_sy | 0 | 0 | — | **empty — biggest build gap** |

### ⚠️ Builds NOT launched (left for Kai)
Dialect builds were **not** started unattended. Reasons: (1) builds are heavy LLM/TTS operations needing approval + supervision (the deu rebuild saga: degraded builders, unkillable auto-resumers, usage-limit freezes); (2) the repo is mid-merge; (3) "monitor the content" can't be done well unattended. Everything is staged for a supervised launch.

### Build watch-list (when extending dialects to 668 / building ara_sy)
Watch for the exact failure classes this scan surfaced in the mains:
1. **Foreign-language-on-the-English-known cluster** (por main S396-481 = Portuguese in English; deu main S466-485 = German nouns Junge/Mädchen in English). Spot-check the **English known side of the first ~50 seeds of every new range** with Haiku — mechanical Check 3 CANNOT see Latin-on-Latin.
2. **Transliteration in the English known** (ara_lb `yaskot`/`yihki`) — the known side must be an English gloss, not romanized target.
3. **Placeholder leaks** — `(included)` (fra main S533/535), `b+` (ara_lb S22). Builder placeholder strings reaching learner-facing text.
4. **deu_at / regional varieties**: brief the dialect's lens up front (Austrian "I"=ich, etc.) so reviewers/Haiku don't false-positive valid dialect ([[feedback_check_regional_variety]]).
