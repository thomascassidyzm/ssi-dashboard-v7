# Cross-course scan: marked forms without their licensor (the ita_for_eng defect shape)

*2026-09-01. Read-only scan, report only — no fixes applied anywhere. Calibrated on the
ita_for_eng repair (subjunctive welded onto fact-reporting verbs); scanned Celtic
(mutations), German, Romance and case-marking (Slavic/Baltic/Finno-Ugric) courses for the
same shape — a taught chunk carries a form that's only correct in one environment, but
doesn't contain the thing that licenses it, so it gets welded into environments that
don't license it.*

## Direct answer

**19 courses have confirmed instances. The heaviest are Spanish Mexican (8), Serbian (5),
and the Italian source course itself (4, one repaired today). Most courses scanned came
back clean.** The pattern shows up in every family checked — Celtic mutations, Romance
subjunctive, Slavic/Baltic/Finno-Ugric case, and one German-Swiss word-order case — but
almost always as an isolated slip inside one build session, not a systemic rot. Two
recurring authoring habits explain most of it: (1) an affirmative "I think/know/believe
that" verb taking a subjunctive/marked form that only negation or a different verb would
license, and (2) a noun/verb LEGO whose base form is stored already-marked (case-marked,
mutated) with no trigger, safe until a build step or response-template drops it bare.

## Table

| Course | Candidates read | Confirmed | Rate | Clustered/scattered | Audio |
|---|---|---|---|---|---|
| ita_for_eng | 276 (prior repair) | 4 (3 repaired today, 1 open: S0558) | 3.6% | 1 build session | yes |
| **spa_mx_for_eng** | ~27 | **8** | high (1 recurring pattern) | clustered, 1 build session + 1 touch pass | yes — all 8 |
| **srp_for_eng** | ~50 | **5** (3 clusters) | worst rate found | scattered, 2 sessions | yes — all |
| **gle_cn_for_eng** | ~113 | **~8 legos** | — | clustered, 2 sessions | **no audio in course at all** |
| **hun_for_eng** | ~24 | **2** | — | 2 isolated legos | yes |
| **por_br_for_eng** | 8 | **2 legos / 8 phrases** | — | clustered, 1 day | yes — all |
| **rus_for_eng** | 12+3 | **3** | — | clustered, 1 seed window | yes — all |
| **ces_for_eng** | ~130 | **2** | — | clustered, seed 27 | yes — both |
| **cym_s_for_eng** | 213+86+9 raw | **2** confirmed + 1 borderline | — | 1 build session | yes — both |
| gle_for_eng | 114 | 2 | — | 1 build family (S0051/52) | yes — both |
| cym_n_for_eng | ~692 (self-consistency) | 1 | — | shared event w/ cym_nnew | yes |
| cym_nnew_for_eng | ~692 | 1 (same build event as cym_n) | — | — | yes |
| deu_ch_for_eng | 35 | 1 | ~3% | isolated | **no audio yet** |
| fra_for_eng | 16 legos / 116 phrases | 1 | ~6% legos | isolated | yes |
| glg_for_eng | 8 | 1 | — | isolated, amid 7 clean siblings | yes |
| hrv_for_eng | ~40 | 1 | — | isolated | yes |
| lit_for_eng | ~26 seeds spot-checked | 1 | — | isolated | yes |
| est_for_eng | ~25 | 1 confirmed + 1 unconfirmed gap | — | isolated | yes |
| gla_for_eng | 84 raw / ~1 deep | 1 (lower confidence, needs native check) | — | isolated | — |
| **Clean:** deu_for_eng, deu_at_for_eng, pdc_for_eng, fra_ca_for_eng, spa_for_eng, por_for_eng*, cat_for_eng, cat_for_spa, ron_for_eng, pol_for_eng, ukr_for_eng, bul_for_eng, lav_for_eng, fin_for_eng, cym_for_yor, cym_anthem_for_jpn, bre_for_eng*, cor_for_eng* | | 0 | 0% | — | — |

*por_for_eng clean only on irregular subjunctive forms searched (regular-conjugation forms weren't swept — see gaps). bre_for_eng/cor_for_eng clean but low-information (small, early-stage courses that haven't reached the risk pattern yet). mkd_for_eng: not-applicable, too early-stage, and Macedonian has largely lost case.

## Worst specimens

**spa_mx_for_eng** — a bare-subjunctive `pudiera`/`puedan` LEGO repeatedly welded onto affirmative "creo que" (I believe), which takes the indicative:
- "I believe I could trust him" → `creo que pudiera confiar en él` — should be `creo que podría confiar en él`
- "I believe they can go" → `creo que puedan ir` — should be `creo que pueden ir`
(6 more of the same shape, all audible now.)

**srp_for_eng** — "his name" left in its bare form, welded onto the genitive-governing verb `setiti se` (remember):
- `se setim njegovo ime` (build) / `želim da se setim njegovo ime` (use) — should be `njegovog imena`.

**gle_cn_for_eng** — the "friend/old man/old woman" LEGO family is taught already lenited (only correct after "ar" in "tá aithne agam ar..."), and the intermediate build scaffold drops it in sentence-initial with no trigger at all:
- "old man who wanted to learn" → `sheanfhear a bhí ag iarraidh foghlaim` — should be `Seanfhear a bhí...` (unlenited). Not yet audible — this course has no recorded audio at all.

**ita_for_eng (open item, not touched today)** — S0558L01U05: "I didn't know it was so late" → `non sapevo che fosse così tardi` — should be `non sapevo che era così tardi` (sapere che takes indicative). Same shape as the three seeds repaired today; flagged in that repair's own notes as unconfirmed/untouched.

**deu_ch_for_eng** — a question-form chunk welded straight into an indirect question without converting to embedded word order: "I know what you would like" → `ich weiss, was hättsch gern` — should be `ich weiss, was du gärn hättsch`. Not yet audible (no audio recorded).

**hun_for_eng** — a dative "to his friend" chunk welded onto verbs that need instrumental case: "he wants to meet his friend" → `találkozni a barátjának` — should be `...a barátjával`.

**por_br_for_eng** — a distinct subtype: a correctly-licensed subjunctive stripped of its governor entirely by an "isolated yes/no response" template: "yes, I can buy" → `sim, possa comprar` — should be indicative `sim, posso comprar`.

## Explicit gaps — honestly named, not guessed

- **Not reached at all** (outside this scan's prioritised families, per the brief's own ordering): every non-English-known-side course pair (`*_for_jpn`, `*_for_zho`, `cym_for_yor`, `ita_for_cym`, `spa_for_cym` beyond the light Welsh-side check already done), Basque (`eus_for_eng`, `eus_for_spa`), Yiddish, and every non-Indo-European/non-Celtic family — Arabic, Hebrew, Chinese, Japanese, Korean, Hindi and other South Asian languages, Turkish, African languages. None of these were scanned; no claim of clean or defective is made for any of them.
- **Portuguese/Catalan/Romanian/Galician**: only irregular subjunctive verb forms were swept (seja/esteja/tenha, sigui/pugui, fie/aibă). Regular-conjugation subjunctive forms are morphologically indistinguishable from other verb forms without a real lexicon and were not checked — a defect hiding there would not have been caught, across all 6 courses in that batch.
- **Welsh, Check 4 (mirror-error direction)** — LEGOs storing the *unmutated* form that then get used somewhere requiring mutation — was only spot-checked, not run as a systematic query, across all three Welsh courses.
- **bre_for_fra** (630 legos): sampled at the highest-risk seeds only, not exhaustive.
- **Scottish Gaelic** (`gla_for_eng`): the one finding (`thoilichte`) is well-calibrated by direct in-course contrast, but overall Gaelic-mutation depth here is shallower than the Irish coverage — flagged as lower-confidence, wants native check before acting.
- **Estonian** partitive-as-existential-subject case: read but explicitly left unconfirmed — a genuine "I'm not sure of the rule" gap, not a finding.

## Landing line

No commits — this was a read-only scan throughout; no writes, edits, or fixes were made to any course, LEGO, or audio asset.
