# Item 6 independent review — shard B

Review basis: origin/cs/703-paid-cleanup-item-6-wrong-target, plan built 18 November 2026 13:23:15Z. Ten assigned courses only. No course writes; no tests, build or typecheck. AGREE accepts the specified action, including hold; a hold is not approval of defective course text. Null proposed on a DISPUTE means leave out pending the stated correction/evidence.

## Coverage

| Course | AGREE | DISPUTE |
|---|---:|---:|
| fra_for_eng | 8 | 0 |
| ita_for_eng | 12 | 1 |
| zho_for_jpn | 11 | 0 |
| deu_for_eng | 1 | 0 |
| deu_ch_for_eng | 1 | 0 |
| eng_for_hin | 1 | 0 |
| ara_eg_for_eng | 7 | 0 |
| por_for_eng | 59 | 2 |
| ara_for_eng | 31 | 3 |
| spa_for_eng | 12 | 0 |

## Disputes

- **ita_for_eng S0642L02U05**: The new English still gives no formal-register signal for si sente. The plan repairs after all this but leaves the learner unable to choose the formal form. Add madam at the end on both sides, using the card’s existing formal address. Source: Canon K10 and K32; S0642L01U07 in this same plan supplies signora for seed 642. Proposed: {"known": "how do you feel after all this, madam?", "target": "come si sente dopo tutto questo, signora?"}.
- **por_for_eng S0501L04U04**: The rewrite retains em ti (one addressee) with brincarem (third-person plural infinitive) while the English makes you the people playing together. It repairs the reporting clause but keeps the singular/plural mismatch. Leave out: changing ti to vocês or brincarem to brincares needs a taught-surface and LEGO check; a warning-only floor does not justify a faulty sentence. Source: Cunha and Cintra, Nova Gramática do Português Contemporâneo, personal infinitive; Ciberdúvidas, Infinitivo flexionado em orações completivas não finitas: https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/infinitivo-flexionado-em-oracoes-completivas-nao-finitas/29501 ; plan S0501L04U04. Proposed: leave out.
- **por_for_eng S0501L04U05**: Same retained ti/brincarem person mismatch: the prompt does not say that some other people will play. Leave out until the whole frame is grammatical and taught; preserving the original chunk does not override naturalness. Source: Cunha and Cintra, Nova Gramática do Português Contemporâneo, personal infinitive; Ciberdúvidas: https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/infinitivo-flexionado-em-oracoes-completivas-nao-finitas/29501 ; canon K16/P23; plan S0501L04U05. Proposed: leave out.
- **ara_for_eng S0427L02U05**: Adding the subjunctive governor fixes تظنّ but retains يفهمون بعضهم for understand each other. In formal MSA the reciprocal needs the second بعض (بعضهم بعضا / بعضهم البعض); the written single بعضهم also reads some of them. Leave out until a taught reciprocal frame or a different taught-only sentence is provided; do not invent the extra surface form. Source: Ryding, A Reference Grammar of Modern Standard Arabic, chapter 9, 2.1.2–2.1.3, p.231, distinguishes some of them from reciprocal double بعض: https://nabataea.net/media/04shop/PDFS/Arabic%20-%20Modern%20Grammar.pdf#page=259 ; canon K16/P1. Proposed: leave out.
- **ara_for_eng S0154L01B02**: The indicative نلتقي is right, but the replacement still leaves السبت without its genitive ending. For this explicitly fully vowelled MSA course, complete the idafa ليلةَ السبتِ. This is a spelling/vowelling completion, not a new lexical item. Source: Ryding, A Reference Grammar of Modern Standard Arabic, chapter 8, construct phrases: the annexed noun is genitive; task requirement fully vowelled MSA. Proposed: {"known": "where do we meet Saturday night?", "target": "أَيْنَ نَلْتَقي لَيْلَةَ السَّبْتِ؟"}.
- **ara_for_eng S0154L01B03**: Same remaining missing genitive kasra on السبت in a fully vowelled course. Keep the indicative correction and finish the vowelling. Source: Ryding, A Reference Grammar of Modern Standard Arabic, chapter 8, construct phrases; task requirement fully vowelled MSA. Proposed: {"known": "we meet Saturday night", "target": "نَلْتَقي لَيْلَةَ السَّبْتِ"}.

## Evidence and gaps

EXPLICIT GAP: whole-course taught-surface, known-side availability, voice assignment, ZUT and duplicate claims have not yet been independently checked live. Before 14:10Z no Popty reads or dump runs are permitted. Plan claims and row ids are documentary evidence only; the planner’s checker report is not independent verification. Review progress and subsequent live checks are recorded below.

- Plan source SHA: `bb8d2420cfa2dcf3f3dac9165ee8fe47f4f5e4c1`. All 149 assigned entries received individual verdicts; the other three courses belong to shard A.
- Independent references checked online: Larousse *penser* (conditional accepted after negative penser); Treccani *Soggettive, frasi* (potential conditional); Yip and Rimmington, *Chinese: A Comprehensive Grammar*, 2nd edition §7.3 (brief duration); Ryding, *A Reference Grammar of Modern Standard Arabic*, chapter 9 §2.1.3 (reciprocal double بعض); Duden *helfen* (dative).
- **Checker limitation:** `check.cjs` adds every LEGO of the current seed and the entire seed text to phrase vocabulary availability. It cannot prove the P2 ban on later sibling LEGOs. It checks target vocabulary only, strips Arabic case/mood marks in normalisation, and skips non-new baskets. Its op application also does not assign `is_new`. A clean checker result therefore does not certify known-side control, vowelling, voice, or the S0283L02 not-new transition. The checker was read, not run as a substitute for linguistic review.
- **Additional omission:** Egyptian S0047L02U02/U05 retain the same agreement defect (`إن دي مفيد`) the planner identifies in its note. Deleting U03/U04 is correct, but it does not finish that basket. Delete the remaining invalid practice rows too if no taught-only grammatical rewrite exists; warning floors do not override correctness (P23).
- No served course experience changed: this branch contains review documents only. No audio was played, and audio voice assignment/agreement has not been independently verified.

