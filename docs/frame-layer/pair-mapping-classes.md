# Per-pair mapping classes

Every canonical English frame (see `english-pattern-inventory.md`) against what the target does with it. Four classes, Tom's ruling from the 2026-08-29 sitting:

- **DETERMINISTIC** — one known frame, one target frame; the difficulty is carried by vocabulary
- **SPLIT** — one known frame, two or more target frames chosen by a trigger; the difficulty is in the frame
- **INVERSION** — the shape mirrors — constituent order reorganises (verb-final, prenominal relative, dative inversion)
- **ERASURE** — the target is simpler and drops a distinction the known side marks

`spa_for_eng` is populated in full, every row carrying the seed numbers that attest it. `deu/zho/jpn` are populated only where an attesting example was cheap to pull live; every other cell says **NOT YET EXTRACTED** and means exactly that — it is a gap, not a claim of DETERMINISTIC.

The finding this table exists to carry: **the curriculum relocates per pair.** spa = splits, deu = inversions, zho = erasure-cheap but with new admissions of its own, jpn = inversion + erasure + register. That is why no universal difficulty ordering ever worked.

## spa_for_eng — full

| id | pattern | known seeds | class | mapping | attesting seeds | note |
|---|---|---:|---|---|---|---|
| P1 | want-chain | 125 | **SPLIT** | want to VP → quiero + inf; want SUBJ2 to VP → quiero que + SUBJUNCTIVE | 1 15 | subject-switch is the trigger; seeds 1 and 15 are the deliberate minimal pair |
| P2 | going-to future | 22 | **DETERMINISTIC** | going to VP → ir a + inf | 5 179 289 |  |
| P3 | progressive | 65 | **SPLIT** | progressive → estar + gerundio \| plain present | 2 140 | ongoing-at-this-moment keeps estar+gerundio; embedded/habitual collapses to the simple present (140 'you're trying' → intentas) |
| P4 | modal can/could | 68 | **SPLIT** | can/could → puedo / pueda / podía / pudo / podría | 7 310 311 413 148 | four target outcomes under one English modal; 310-318 drill the block, 148/433 are the only pudo/pude preterites |
| P5 | be able to | 12 | **ERASURE** | be able to → poder (same verb as 'can') | 11 176 445 | the known side's can / be able to distinction has no target trace |
| P6 | have to / need to | 43 | **SPLIT** | have to / need to → tener que / necesitar / hay que, plus tuve que vs tenga que | 25 280 397 |  |
| P7 | should / ought | 11 | **DETERMINISTIC** | should → debería (conditional of deber) | 98 253 404 |  |
| P8 | must / may / might | 4 | **SPLIT** | must → tener que; might → podría \| puede que + SUBJUNCTIVE | 109 261 456 |  |
| P9 | matrix think/believe | 55 | **SPLIT** | think that CLAUSE → pienso que + INDICATIVE; negated → no pienso que + SUBJUNCTIVE | 325 326 387 | negation of the matrix verb is the trigger; 325/326 are the minimal pair |
| P10 | matrix know/sure | 48 | **SPLIT** | know → saber (fact) \| conocer (person/place) | 10 307 297 | no English trace at all; the split is lexical and invisible on the known side |
| P11 | matrix hope/wish | 10 | **SPLIT** | hope → espero + inf; subject-switch → espero que + SUBJUNCTIVE | 291 292 | adjacent seeds — the authors put the minimal pair side by side |
| P12 | matrix say/tell | 69 | **SPLIT** | say/tell → decir (+ obligatory dative clitic me/le/te) \| contar | 4 367 464 | 'nobody told me' → nadie me dijo: the clitic is minted, not translated |
| P13 | temporal clause | 47 | **SPLIT** | before → antes de que + SUBJUNCTIVE \| antes de + inf; after → después de (que) | 110 25 251 281 | 110 (same subject, infinitive) vs 25 (subject switch, subjunctive) |
| P14 | conditional if (real) | 37 | **SPLIT** | if → si + present (real) \| si + IMPERFECT SUBJUNCTIVE (hypothetical) | 419 203 | realis/irrealis; English 'if' carries the trigger only in the tense of its own clause |
| P15 | because / so / but | 35 | **DETERMINISTIC** | because/but/although → porque/pero/aunque | 19 178 464 | aunque can take the subjunctive; not attested in the seeds |
| P16 | relative clause | 72 | **SPLIT** | relative clause → que + INDICATIVE (specific) \| que + SUBJUNCTIVE (non-specific) | 22 297 | 22 'people who speak Spanish' (hablan) vs 297 'many people who speak Spanish' under negation (hablen) |
| P17 | counterfactual | 16 | **SPLIT** | 'd have VPpp → habría + participle; 'd VPpp → hubiera/hubieras + participle | 599 600 606 607 | THE double-'d split: one English contraction, two Spanish moods. The whole teaching job of seed 600. |
| P18 | It's-adjective | 56 | **SPLIT** | it's ADJ → es (property) \| está (state/location) | 28 143 487 | ser/estar; no English trace |
| P19 | there is/are | 3 | **ERASURE** | there is / there are → hay (invariant) | 131 279 475 | number agreement on the known side is erased in the target |
| P20 | question | 111 | **ERASURE** | do-support → nothing; question = intonation + ¿ ? | 14 220 453 | the English auxiliary has no target correspondent |
| P21 | wh-question | 60 | **DETERMINISTIC** | wh-word → qué/cómo/dónde/cuándo/quién/por qué + inverted verb | 175 179 493 |  |
| P22 | embedded question | 52 | **SPLIT** | embedded question → lo que (free relative) \| si (whether) \| qué (interrogative) | 8 165 289 |  |
| P23 | negation | 35 | **DETERMINISTIC** | not/n't → no before the verb; negative concord (no ... nada/nadie) | 103 298 367 |  |
| P24 | comparative/superlative | 39 | **SPLIT** | than → que (phrase) \| de lo que (clause) | 117 118 | 117 'better than last time' (que) vs 118 'better than I felt' (de lo que) |
| P25 | as ... as | 8 | **INVERSION** | as ADJ as possible → lo más ADJ posible | 3 28 50 | the shape reorganises: superlative frame replaces the equative frame |
| P26 | imperative | 4 | **DETERMINISTIC** | let's VP → hortative SUBJUNCTIVE (hablemos) | 158 466 522 | mints subjunctive morphology with no known-side trace |
| P27 | what's-it-like | 5 | **SPLIT** | what's it like → cómo es; it's like this → es así | 49 582 581 |  |
| P28 | time adjunct | 64 | **DETERMINISTIC** | time adverbs map one-to-one and sit clause-finally | 1 97 291 |  |
| P29 | perfect | 35 | **SPLIT** | have VPpp → he + participle \| llevo + gerundio (duration) \| me queda (possession-left) | 575 38 298 | three target frames under one English perfect |
| P30 | passive | 0 | **NOT ATTESTED** | — | — | no be-passive found on the English known side of these 668 seeds |
| P31 | like/enjoy (dative) | 42 | **INVERSION** | SUBJ likes X → a SUBJ le gusta X (experiencer to dative, theme to subject) | 239 11 426 | the canonical inversion of the pair |

Class distribution for spa_for_eng: SPLIT 18, DETERMINISTIC 7, ERASURE 3, INVERSION 2, NOT ATTESTED 1. **SPLIT is the pair's expensive class** — the metric in `frame-zut.md` weights toward it.

## deu_for_eng — 9 of 31 patterns extracted

| id | pattern | class | mapping | attesting seed | note |
|---|---|---|---|---:|---|
| P1 | want-chain | **INVERSION** | want SUBJ2 to VP → dass-clause with verb final — BUT seed 15 does not do it: 'ich will morgen mit dir Deutsch sprechen' drops the embedded subject entirely | 15 | the seed-15 fidelity flag, confirmed live |
| P8 | must / may / might | **DETERMINISTIC** | müssen | 109 |  |
| P9 | matrix think/believe | **INVERSION** | denken, dass + VERB-FINAL: Ich denke, dass er sich hinsetzen will | 303 |  |
| P13 | temporal clause | **INVERSION** | subordinator + verb-final (wenn du fertig bist) | 11 |  |
| P16 | relative clause | **INVERSION** | relative clause postnominal but verb-final: Leute treffen will, die Deutsch sprechen | 22 |  |
| P17 | counterfactual | **INVERSION** | hätte + participle, wenn-clause verb-final: wenn du mir gesagt hättest | 600 |  |
| P19 | there is/are | **DETERMINISTIC** | es gibt (invariant, like hay) | 131 |  |
| P20 | question | **ERASURE** | no do-support; V2 inversion carries the question: sprichst du…? | 14 |  |
| P31 | like/enjoy (dative) | **DETERMINISTIC** | gern + verb, no inversion: meine Mutter liest gern | 239 | contrast with spa's dative inversion |

NOT YET EXTRACTED (22): P2 P3 P4 P5 P6 P7 P10 P11 P12 P14 P15 P18 P21 P22 P23 P24 P25 P26 P27 P28 P29 P30

## zho_for_eng — 9 of 31 patterns extracted

| id | pattern | class | mapping | attesting seed | note |
|---|---|---|---|---:|---|
| P1 | want-chain | **DETERMINISTIC** | 想 + bare clause, no complementiser: 我也想你明天和我说中文 | 15 |  |
| P8 | must / may / might | **DETERMINISTIC** | 必须 | 109 |  |
| P9 | matrix think/believe | **DETERMINISTIC** | 觉得 + bare clause, same order as English | 303 |  |
| P13 | temporal clause | **INVERSION** | temporal clause precedes the main clause; 之后/时 are clause-FINAL: 你说完之后我也能说 | 11 |  |
| P16 | relative clause | **INVERSION** | PRENOMINAL relative with 的: 会说中文的人 | 22 | the shape mirrors |
| P17 | counterfactual | **ERASURE** | no counterfactual marking at all: 如果你告诉我…我会开车的 — the double-'d split disappears | 600 | this is the reverse frame-ZUT case: eng_for_zho learners must mint what their known side never marks |
| P19 | there is/are | **INVERSION** | location-first existential: 我脑子里有太多想法 | 131 |  |
| P20 | question | **ERASURE** | no do-support; 吗 particle clause-final | 14 | new admission: the 吗 particle itself |
| P31 | like/enjoy (dative) | **DETERMINISTIC** | 喜欢 + VP, same order | 239 |  |

NOT YET EXTRACTED (22): P2 P3 P4 P5 P6 P7 P10 P11 P12 P14 P15 P18 P21 P22 P23 P24 P25 P26 P27 P28 P29 P30

## jpn_for_eng — 9 of 31 patterns extracted

| id | pattern | class | mapping | attesting seed | note |
|---|---|---|---|---:|---|
| P1 | want-chain | **ERASURE** | 〜たい is subject-bound, so the embedded subject is dropped: 明日も一緒に日本語を話したい | 15 | same fidelity flag as deu |
| P8 | must / may / might | **INVERSION** | negative-conditional periphrasis: 学ばないといけない ('if I don't learn it won't do') | 109 |  |
| P9 | matrix think/believe | **INVERSION** | clause first, matrix verb last: 彼は座りたいんだと思う | 303 |  |
| P13 | temporal clause | **INVERSION** | まで/うちに clause-final and pre-matrix: 終わるまで知りたくない | 251 |  |
| P16 | relative clause | **INVERSION** | prenominal, no relative pronoun: 日本語を話す人 | 22 |  |
| P17 | counterfactual | **ERASURE** | 〜てくれてたら + plain past; no dedicated counterfactual: 疲れてるって言ってくれてたら運転した | 600 |  |
| P19 | there is/are | **INVERSION** | location-first with 多すぎる: 頭の中に考えが多すぎる | 131 |  |
| P20 | question | **ERASURE** | no do-support; rising intonation / か | 14 |  |
| P31 | like/enjoy (dative) | **INVERSION** | nominalised complement + 好き: 読むのが好き | 239 |  |

NOT YET EXTRACTED (22): P2 P3 P4 P5 P6 P7 P10 P11 P12 P14 P15 P18 P21 P22 P23 P24 P25 P26 P27 P28 P29 P30

## Pod frames (`D*` sentence grain, `X*` exchange grain) — 18 rows, all NOT ATTESTED

These come from `dialogue-frame-inventory.md`, not from the seeds. **NOT ATTESTED means exactly that** — no pair has target-side evidence for a pod frame yet, and `expensiveClassFor` skips any class matching `/^NOT /`, so these rows cannot skew a pair's expensive-class tally. The Method Pod's Italian rendering (585 rows with `target_text`) is the first place a pod-frame mapping class can actually be read for any pair — and reading one is a separate job, because **pods do not cut**: having target text is a different act from minting an agreement between a known chunk and a target chunk.

| id | grain | frame | pod rows | class, every pair |
|---|---|---|---:|---|
| D1 | sentence | ritual open/close | 35 | NOT ATTESTED |
| D2 | sentence | polar response + elaboration | 70 | NOT ATTESTED |
| D3 | sentence | thanks / gratitude close | 56 | NOT ATTESTED |
| D4 | sentence | apology / attention-getter | 21 | NOT ATTESTED |
| D5 | sentence | deictic handover | 10 | NOT ATTESTED |
| D6 | sentence | reciprocal return | 22 | NOT ATTESTED |
| D7 | sentence | uptake assessment | 24 | NOT ATTESTED |
| D8 | sentence | ellipted order | 7 | NOT ATTESTED |
| D9 | sentence | reckoning | 2 | NOT ATTESTED |
| D10 | sentence | read-back receipt | 11 | NOT ATTESTED |
| D11 | sentence | reassurance / normalising | 10 | NOT ATTESTED |
| D12 | sentence | compliance commitment | 32 | NOT ATTESTED |
| X1 | exchange | reciprocal return | 7 | NOT ATTESTED |
| X2 | exchange | polar-response-to-question | 48 | NOT ATTESTED |
| X3 | exchange | repair | 31 | NOT ATTESTED |
| X4 | exchange | instruction -> read-back | 9 | NOT ATTESTED |
| X5 | exchange | order -> deictic handover | 7 | NOT ATTESTED |
| X6 | exchange | thanks -> downgrade | 3 | NOT ATTESTED |

## The seed-15 flag, re-confirmed live

Seed 15's canonical teaching job is the want-YOU-to split. Pulled fresh 2026-08-29:

| course | seed 15 target | carries the embedded subject? |
|---|---|---|
| known (eng) | and I want you to speak Spanish with me tomorrow | — |
| spa_for_eng | y quiero que hables español conmigo mañana | yes (subjunctive `hables`) |
| zho_for_eng | 我也想你明天和我说中文 | yes (bare embedded clause) |
| deu_for_eng | und ich will morgen mit dir Deutsch sprechen | **no** — reads "I want to speak WITH you" |
| jpn_for_eng | 明日も一緒に日本語を話したい | **no** — 〜たい is subject-bound |

Possibly a deliberate deferral of expensive machinery (`dass` + V-final, 〜てほしい), but the learner drills a mapping that does not perform the seed's teaching job. Fidelity vs naturalisation is a native-eye call, and it is Tom's. The general check is now definable and mechanical: **per pair, does each seed's target still perform its seed's canonical teaching job?**
