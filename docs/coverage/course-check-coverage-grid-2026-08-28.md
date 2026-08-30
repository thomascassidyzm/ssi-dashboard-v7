# Course × check coverage — what has ever actually been checked

*Read from the live database and the committed check artefacts on 28 August 2026. Read-only: no course data, no audio, nothing changed.*

## The short version

The estate holds **119 courses with real content**. Against them sit **18 quality checks** — fifteen of them scripts you can run, three of them a method a person follows. That is 2142 possible course-and-check pairings, and **86% of them are blank**: the check has never been run against that course, or it ran and could not speak.

Set aside three checks that are estate-wide-but-narrow, mostly-untriaged, or six months stale, and what is left is the set that asks whether a course actually *teaches* properly. **12 courses have never had a single one of those run against them. Another 80 have had exactly one** — so **92 of 119 courses have been looked at once or not at all**. One course, `spa_for_eng`, has had 8 of the fifteen run against it; it is the only course anyone could honestly call examined.

Three checks — the forward-reference gate, the known/target completeness detector and the introduction-order probe — have each been run against exactly **one** course in the whole estate. The only check that has ever swept everything looks for the wrong language's name inside a sentence.

And where a check has run and found something, the finding has usually stayed put: **133 cells hold defects that are still open**, against 40 where they were fixed.

**Key** 🟩 run, clean · 🟧 run, defects found and fixed · 🟥 run, defects still open · ❓ ran but cannot speak, or outcome never published · ⬜ never run

---

## Calibration — the cells I checked by hand before trusting the rest

- **Expected green, and it is not.** The filler-BUILD scan reports zero on forty courses including every English-for-X course. I opened the detector that produced those numbers: its padding list is a hardcoded set of English words (**here, yesterday, before, a lot, of course**) matched against the **known** side. On any course whose learners are not English speakers, a zero is arithmetically guaranteed and says nothing. Those forty cells are marked **?**, not green. Nine genuinely clean cells survive that correction, out of the fifty that column first claimed.

- **Expected red, and it is.** Spanish under the ZUT audit. I read the run's own JSON rather than its write-up: 81 strict clashes and 20 target-membership failures. The same file from 15, 18 and 25 August carries identical numbers — so 'no drift' means nothing was repaired either. Confirmed red.

- **Expected amber, and it is — verified in the live database, not in the report.** Italian-for-Japanese under the lesson-boundary rule. The write-up claims 17 cases found and all 17 repaired. I counted rows in the live database changed on the day of the repair: 15 LEGO rows and 353 practice rows. Fifteen is exactly the 6 merges plus 9 label corrections the report claims. The repair is real.

- **Expected grey, and it is.** Turkish under the known-side gate. I searched every branch and every document for that course code in connection with any of these checks. It appears in audio, pod and punctuation work and in none of the content checks. Genuinely never run.

---

## Where the biggest holes are, check by check

| check | courses it has run on | never run on |
|---|---|---|
| known-side untaught word | 15 | 104 |
| BUILD teaches its word | 6 | 113 |
| teaching-order scan | 6 | 113 |
| lesson/LEGO boundary | 6 | 113 |
| know-clash (twin verbs) | 6 | 113 |
| vocabulary discontinuity | 3 | 116 |
| ZUT audit (3 buckets) | 5 | 114 |
| ZUT gate-and-fix (Jun) | 16 | 103 |
| forward-reference tiling | 1 | 118 |
| known/target completeness | 1 | 118 |
| LEGO edge map | 2 | 117 |
| filler BUILD scan | 76 | 43 |
| language-name contamination | 119 | 0 |
| presentation drift | 7 | 112 |
| distinction coverage | 4 | 115 |
| LEGO frequency / variety | 3 | 116 |
| checkpoint QA (early 2026) | 21 | 98 |
| introduction-order probe | 1 | 118 |

---

## The checks, and what each one actually tests

### Known-side untaught-word gate (v2)

Does a prompt use a known-language word this course has not taught yet.

*Caveat:* Sweep-only — the live submit path still calls the older v1 gate. Japanese-known courses come back 'cannot judge', not 'clean'.

- 🟥 `cym_for_yor` **2** — 2 of 4 token issues assessed real; seeds 161-668 came back UNCHECKED (2026-08-26)
- 🟥 `eng_for_kan` **28** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `eng_for_mar` **61** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `eng_for_tel` **3** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `kor_for_hin` **60** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `kor_for_tam` **19** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `zho_for_hin` **48** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `zho_for_tam` **15** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `eng_for_ben` **14** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `eng_for_guj` **9** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `eng_for_pan` **7** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `eng_for_sin` **56** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `eng_for_tam` **21** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `eng_for_urd` **47** — estate sweep doc, strong candidates, none applied (2026-08-18)
- 🟥 `eng_for_hin` **41** — estate sweep doc, strong candidates, none applied (2026-08-18)

### BUILD phrase must teach its own known-side word

Does each BUILD phrase's prompt actually contain the word its LEGO teaches, rather than a near-synonym.

*Caveat:* Built and calibrated for Japanese-prompt courses only; it cannot be pointed at another known language as-is.

- 🟥 `deu_for_jpn` — 541 violations across the six courses; 19% of rows refused as unjudgeable (2026-08-26)
- 🟥 `fra_for_jpn` — 541 violations across the six courses; 19% of rows refused as unjudgeable (2026-08-26)
- 🟥 `ita_for_jpn` — 541 violations across the six courses; 19% of rows refused as unjudgeable (2026-08-26)
- 🟥 `por_for_jpn` — 541 violations across the six courses; 19% of rows refused as unjudgeable (2026-08-26)
- 🟥 `spa_for_jpn` — 541 violations across the six courses; 19% of rows refused as unjudgeable (2026-08-26)
- 🟥 `zho_for_jpn` — 541 violations across the six courses; 19% of rows refused as unjudgeable (2026-08-26)

### Known-side teaching-order scan (spaceless scripts)

Does a practice sentence show a word this same course only teaches at a later seed.

*Caveat:* Under-reports by design; on these six courses it could date only 30–66% of rows.

- 🟥 `deu_for_jpn` **11** — 44 confirmed defects, read-only scan, nothing fixed (2026-08-26)
- 🟥 `fra_for_jpn` **14** — 44 confirmed defects, read-only scan, nothing fixed (2026-08-26)
- 🟥 `ita_for_jpn` **4** — 44 confirmed defects, read-only scan, nothing fixed (2026-08-26)
- 🟥 `por_for_jpn` **4** — 44 confirmed defects, read-only scan, nothing fixed (2026-08-26)
- 🟥 `spa_for_jpn` **5** — 44 confirmed defects, read-only scan, nothing fixed (2026-08-26)
- 🟥 `zho_for_jpn` **7** — 44 confirmed defects, read-only scan, nothing fixed (2026-08-26)

### Lesson-boundary rule (can either side stand alone?)

Is each LEGO a unit a learner could actually say on both sides, and does its label name the right word.

*Caveat:* Ran as a one-off human sort over 120 flagged cases, not as a committed tool. There is no re-runnable script.

- 🟥 `deu_for_jpn` **3** — 26 cases found, 23 repaired in the live DB, 3 still open (2026-08-27)
- 🟧 `fra_for_jpn` **6** — all 6 cases found and repaired in the live DB (2026-08-27)
- 🟧 `ita_for_jpn` **17** — all 17 cases found and repaired in the live DB (2026-08-27)
- 🟥 `por_for_jpn` **1** — 15 cases found, 14 repaired in the live DB, 1 still open (2026-08-27)
- 🟥 `spa_for_jpn` **1** — 26 cases found, 25 repaired in the live DB, 1 still open (2026-08-27)
- 🟥 `zho_for_jpn` **2** — 30 cases found, 28 repaired in the live DB, 2 still open (2026-08-27)

### Know-clash: one known word, two target verbs

Does one English word (know, meet) point at two different target verbs with nothing bridging them.

*Caveat:* A documented method and a reading, not a tool. Nothing automates it yet.

- 🟥 `spa_mx_for_eng` — 1 bare chunk plus a self-contradiction at seeds 233/290 — nothing fixed (2026-08-27)
- 🟥 `deu_for_eng` — kennen/wissen across eight rows — nothing fixed (2026-08-27)
- 🟥 `ita_for_eng` — cleanest of the four, two genuine survivors — nothing fixed (2026-08-27)
- 🟥 `por_for_eng` — same shape as Spanish plus one sentence taught two ways — nothing fixed (2026-08-27)
- 🟥 `fra_for_eng` — worst in the estate: sais/connais across many rows — nothing fixed (2026-08-27)
- 🟥 `spa_for_eng` — 4 bare 'I know'=conozco chunks against 'I know'=sé — nothing fixed (2026-08-27)

### Vocabulary discontinuity

Does a word the learner already owns silently change into a different target word later in the course.

*Caveat:* Scoped and calibrated, not built. ~85% false-positive rate; recommended as a ranked reading list, never a gate.

- 🟥 `gle_for_eng` **1** — calibration probe only — three Irish idioms for 'know'; not a full read (2026-08-27)
- 🟥 `jpn_for_eng` **16** — 110 hits read by hand, 16 genuine; nothing fixed (2026-08-27)
- 🟥 `spa_for_eng` **1** — calibration probe only — found saber/conocer; not a full read (2026-08-27)

### ZUT audit — same known, different target

The core rail: one known prompt must resolve to exactly one target form.

*Caveat:* The tool is not on main — every run pulled it off an unmerged branch. Course list is hardcoded and edited by hand per run.

- 🟥 `gle_cn_for_eng` **4** — 4 strict + 5 membership; read as Irish polysemy needing a ruling (2026-08-22)
- 🟥 `ell_for_eng` **62** — 102 groups → 73 after 29 were fixed; 62 handed on for triage, outcome never recorded (2026-08-11)
- 🟥 `eng_for_hin` **230** — 9 strict + 230 membership; the 230 were only spot-checked, pilot deferred (2026-08-22)
- 🟥 `fra_for_eng` **101** — 101 strict clashes + 23 membership; byte-identical across 08-15/18/25 — nothing fixed (2026-08-25)
- 🟥 `spa_for_eng` **81** — 81 strict clashes + 20 membership; unchanged across three runs (2026-08-25)

### ZUT gate-and-fix pass on the English-for-X courses

An earlier, differently-bucketed ZUT sweep across the sixteen English-for-X courses.

*Caveat:* 2026-06-15, a different lineage from the audit above — do not add the two together. The applicator script and its backups are not in the repo.

- 🟧 `eng_for_ita` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_ben` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_guj` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_pan` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_sin` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_tam` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_urd` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_ara` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_deu` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_fra` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_jpn` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_kor` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_spa` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_zho` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_por` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)
- 🟧 `eng_for_hin` — part of the 16-course pass: 467 real fixes identified, 383 rows re-glossed, 78 left for a human (2026-06-15)

### Forward-reference / tiling replay

Replays the submit gate's tiling against only the vocabulary taught before that phrase.

*Caveat:* Checks a supplied list of phrases, not a whole course. The Spanish figure is a 2.6% sample.

- 🟥 `spa_for_eng` **76** — 19% of a 400-row sample of live rows fails; nothing applied (2026-08-26)

### Known/target content-completeness

Do the two sides of a practice row say the same thing, or has the target dropped a clause.

*Caveat:* Language packs exist for English-known and Spanish-target only; any other pair loses the tense signal.

- 🟥 `spa_for_eng` **54** — 1,019 flagged → 112 real; 58 fixed and live, 54 still open (2026-08-26)

### LEGO edge map

What does each new LEGO actually connect to — is the course building on itself or restating itself.

*Caveat:* Read-only by design; it reports structure, so its output is a shape rather than a defect count.

- 🟥 `fra_for_eng` — control run: 56% of BUILD phrases connect to nothing (2026-08-26)
- 🟥 `spa_for_eng` — 42% of BUILD phrases connect to nothing; read-only, nothing fixed (2026-08-26)

### Filler BUILD scan

Are BUILD phrases just the LEGO plus 'here'/'yesterday'/'before' instead of real recombination.

*Caveat:* The only trustworthy version is an uncommitted scratch file, and its padding list is English words matched against the known side — so any course whose learners are not English speakers scores zero by construction, which is not a pass.

Ran clean on 9 courses. Found something on 67:

- 🟥 `afr_for_eng` **10** — 10 confirmed filler BUILDs in 4 clusters; reported, never actioned (2026-08-17)
- 🟥 `ara_eg_for_eng` **387** — 387 confirmed filler BUILDs in 184 clusters; reported, never actioned (2026-08-17)
- 🟥 `ara_lb_for_eng` **78** — 78 confirmed filler BUILDs in 39 clusters; reported, never actioned (2026-08-17)
- 🟥 `ben_for_eng` **217** — 217 confirmed filler BUILDs in 108 clusters; reported, never actioned (2026-08-17)
- 🟥 `bre_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `bul_for_eng` **23** — 23 confirmed filler BUILDs in 10 clusters; reported, never actioned (2026-08-17)
- 🟥 `cat_for_eng` **6** — 6 confirmed filler BUILDs in 3 clusters; reported, never actioned (2026-08-17)
- 🟥 `ces_for_eng` **776** — 776 confirmed filler BUILDs in 300 clusters; reported, never actioned (2026-08-17)
- 🟥 `deu_at_for_eng` **30** — 30 confirmed filler BUILDs in 14 clusters; reported, never actioned (2026-08-17)
- 🟥 `deu_ch_for_eng` **273** — 273 confirmed filler BUILDs in 133 clusters; reported, never actioned (2026-08-17)
- 🟥 `eng_template` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `est_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `eus_for_eng` **14** — 14 confirmed filler BUILDs in 7 clusters; reported, never actioned (2026-08-17)
- 🟥 `fas_for_eng` **112** — 112 confirmed filler BUILDs in 56 clusters; reported, never actioned (2026-08-17)
- 🟥 `fin_for_eng` **112** — 112 confirmed filler BUILDs in 52 clusters; reported, never actioned (2026-08-17)
- 🟥 `fra_ca_for_eng` **133** — 133 confirmed filler BUILDs in 62 clusters; reported, never actioned (2026-08-17)
- 🟥 `fur_for_eng` **5** — 5 confirmed filler BUILDs in 2 clusters; reported, never actioned (2026-08-17)
- 🟥 `gla_for_eng` **42** — 42 confirmed filler BUILDs in 21 clusters; reported, never actioned (2026-08-17)
- 🟥 `glg_for_eng` **21** — 21 confirmed filler BUILDs in 10 clusters; reported, never actioned (2026-08-17)
- 🟥 `heb_for_eng` **38** — 38 confirmed filler BUILDs in 19 clusters; reported, never actioned (2026-08-17)
- 🟥 `hun_for_eng` **225** — 225 confirmed filler BUILDs in 108 clusters; reported, never actioned (2026-08-17)
- 🟥 `hye_for_eng` **8** — 8 confirmed filler BUILDs in 4 clusters; reported, never actioned (2026-08-17)
- 🟥 `isl_for_eng` **6** — 6 confirmed filler BUILDs in 3 clusters; reported, never actioned (2026-08-17)
- 🟥 `lav_for_eng` **4** — 4 confirmed filler BUILDs in 2 clusters; reported, never actioned (2026-08-17)
- 🟥 `lit_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `lmo_for_eng` **19** — 19 confirmed filler BUILDs in 7 clusters; reported, never actioned (2026-08-17)
- 🟥 `mar_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `mkd_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `mlt_for_eng` **49** — 49 confirmed filler BUILDs in 23 clusters; reported, never actioned (2026-08-17)
- 🟥 `nan_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `nap_for_eng` **20** — 20 confirmed filler BUILDs in 9 clusters; reported, never actioned (2026-08-17)
- 🟥 `nep_for_eng` **6** — 6 confirmed filler BUILDs in 3 clusters; reported, never actioned (2026-08-17)
- 🟥 `nor_for_eng` **4** — 4 confirmed filler BUILDs in 2 clusters; reported, never actioned (2026-08-17)
- 🟥 `pdc_for_eng` **190** — 190 confirmed filler BUILDs in 78 clusters; reported, never actioned (2026-08-17)
- 🟥 `pol_for_eng` **14** — 14 confirmed filler BUILDs in 7 clusters; reported, never actioned (2026-08-17)
- 🟥 `por_br_for_eng` **48** — 48 confirmed filler BUILDs in 23 clusters; reported, never actioned (2026-08-17)
- 🟥 `rgn_for_eng` **6** — 6 confirmed filler BUILDs in 3 clusters; reported, never actioned (2026-08-17)
- 🟥 `ron_for_eng` **13** — 13 confirmed filler BUILDs in 6 clusters; reported, never actioned (2026-08-17)
- 🟥 `rus_for_eng` **5** — 5 confirmed filler BUILDs in 2 clusters; reported, never actioned (2026-08-17)
- 🟥 `sbx_for_eng` **7** — 7 confirmed filler BUILDs in 3 clusters; reported, never actioned (2026-08-17)
- 🟥 `scn_for_eng` **8** — 8 confirmed filler BUILDs in 3 clusters; reported, never actioned (2026-08-17)
- 🟥 `sme_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `srp_for_eng` **6** — 6 confirmed filler BUILDs in 3 clusters; reported, never actioned (2026-08-17)
- 🟥 `swa_for_eng` **10** — 10 confirmed filler BUILDs in 5 clusters; reported, never actioned (2026-08-17)
- 🟥 `swe_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `tel_for_eng` **11** — 11 confirmed filler BUILDs in 5 clusters; reported, never actioned (2026-08-17)
- 🟥 `ukr_for_eng` **4** — 4 confirmed filler BUILDs in 2 clusters; reported, never actioned (2026-08-17)
- 🟥 `vec_for_eng` **11** — 11 confirmed filler BUILDs in 5 clusters; reported, never actioned (2026-08-17)
- 🟥 `yid_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `ell_for_eng` **5** — 5 confirmed filler BUILDs in 2 clusters; reported, never actioned (2026-08-17)
- 🟥 `hin_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `spa_mx_for_eng` **27** — 27 confirmed filler BUILDs in 11 clusters; reported, never actioned (2026-08-17)
- 🟥 `tur_for_eng` **41** — 41 confirmed filler BUILDs in 19 clusters; reported, never actioned (2026-08-17)
- 🟥 `ara_for_eng` **54** — 54 confirmed filler BUILDs in 27 clusters; reported, never actioned (2026-08-17)
- 🟥 `cym_n_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `hrv_for_eng` **24** — 24 confirmed filler BUILDs in 12 clusters; reported, never actioned (2026-08-17)
- 🟥 `nld_for_eng` **10** — 10 confirmed filler BUILDs in 5 clusters; reported, never actioned (2026-08-17)
- 🟥 `cym_s_for_eng` **2** — 2 confirmed filler BUILDs in 1 clusters; reported, never actioned (2026-08-17)
- 🟥 `deu_for_eng` **20** — 20 confirmed filler BUILDs in 10 clusters; reported, never actioned (2026-08-17)
- 🟥 `gle_for_eng` **8** — 8 confirmed filler BUILDs in 4 clusters; reported, never actioned (2026-08-17)
- 🟥 `kor_for_eng` **22** — 22 confirmed filler BUILDs in 11 clusters; reported, never actioned (2026-08-17)
- 🟥 `zho_for_eng` **21** — 21 confirmed filler BUILDs in 10 clusters; reported, never actioned (2026-08-17)
- 🟥 `jpn_for_eng` **22** — 22 confirmed filler BUILDs in 10 clusters; reported, never actioned (2026-08-17)
- 🟥 `ita_for_eng` **63** — 63 confirmed filler BUILDs in 31 clusters; reported, never actioned (2026-08-17)
- 🟥 `por_for_eng` **222** — 222 confirmed filler BUILDs in 89 clusters; reported, never actioned (2026-08-17)
- 🟥 `fra_for_eng` **151** — 151 confirmed filler BUILDs in 71 clusters; reported, never actioned (2026-08-17)
- 🟥 `spa_for_eng` **15** — 15 confirmed filler BUILDs in 7 clusters; reported, never actioned (2026-08-17)

### Language-name contamination sweep

Is the wrong language's name sitting in a course — 'she speaks Yoruba' inside the Friulian course.

*Caveat:* Genuinely estate-wide and script-aware, but it searched seed sentences only, not LEGOs or practice phrases. One pass, 2026-08-19; anything introduced since is unmeasured.

Ran clean on 101 courses. Found something on 18:

- 🟧 `bre_for_eng` **1** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟧 `cor_for_eng` **4** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟧 `fur_for_eng` **4** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟥 `hye_for_eng` **4** — spelling corruption found alongside the sweep, never fixed (2026-08-19)
- 🟧 `lmo_for_eng` **4** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟧 `nap_for_eng` **5** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟧 `rgn_for_eng` **5** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟧 `roh_for_eng` **5** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟧 `sbx_for_eng` **1** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟧 `scn_for_eng` **5** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟧 `sme_for_eng` **5** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟧 `vec_for_eng` **6** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟧 `yid_for_eng` **4** — the Yoruba-name leak from one batch run — found and fixed (2026-08-19)
- 🟥 `deu_for_jpn` **4** — English placeholder left in the language name — NOT fixed, the rows are already voiced (2026-08-19)
- 🟥 `fra_for_jpn` **4** — English placeholder left in the language name — NOT fixed, the rows are already voiced (2026-08-19)
- 🟥 `ita_for_jpn` **4** — English placeholder left in the language name — NOT fixed, the rows are already voiced (2026-08-19)
- 🟥 `spa_for_jpn` **4** — English placeholder left in the language name — NOT fixed, the rows are already voiced (2026-08-19)
- 🟥 `zho_for_jpn` **5** — English placeholder left in the language name — NOT fixed, the rows are already voiced (2026-08-19)

### Presentation-clip drift

Does the spoken teaching clip announce the same phrase the learner's card shows.

*Caveat:* Ran estate-wide at 99.99% coverage, but only the 120 worst rows across seven courses were ever triaged. 2,744 more flagged rows across about seventy courses were never sorted, and nobody published which courses they are — so most of this column is 'ran, outcome unknown'.

- 🟥 `cym_n_for_eng` **2** — 2 Welsh rows held for Kai, unfixed (2026-08-18)
- 🟧 `hrv_for_eng` **33** — 33 rows, 25 were false alarms, 8 re-rendered (2026-08-18)
- 🟥 `cym_s_for_eng` **4** — 4 rows, 2 false alarms, 2 held for Kai (2026-08-18)
- 🟥 `zho_for_eng` **19** — 19 rows fixed but 1 still held for a human decision (2026-08-18)
- 🟧 `ita_for_eng` **1** — 1 row, fixed (2026-08-18)
- 🟧 `por_for_eng` **6** — 6 rows, all fixed (2026-08-18)
- 🟧 `spa_for_eng` **55** — 55 rows, 53 relinked and 2 re-rendered — none left drifting (2026-08-18)

### Distinction coverage

Is a grammatical distinction (gender, formality) marked on one side of the pair and not the other.

*Caveat:* Proposes, never applies. Its stronger detectors need per-language morphology config, which exists for Hindi alone. An estate census counted which courses have an asymmetric axis (118 of 146) but did not scan them for defects.

- 🟥 `hin_for_eng` **929** — 929 under-determined rows, none applied (2026-08-19)
- 🟥 `cym_s_for_eng` **4** — 4 confirmed walls, none applied (2026-08-19)
- 🟥 `eng_for_hin` **1895** — 1,895 proposals, none applied (2026-08-19)
- 🟥 `spa_for_eng` **690** — 690 masculine-only rows — found by a person, not the tool (2026-08-19)

### LEGO frequency and phrase variety

Is one LEGO doing all the work, are some barely used, do USE phrases all start the same way.

*Caveat:* A clean course leaves no row, so the database cannot tell 'never scanned' from 'scanned, nothing found'. Only three courses have flags, all from early 2026. Everything else is genuinely unknown and shown as never-run.

- 🟥 `tur_for_eng` **16** — 16 LEGO-frequency flags, still open (2026-03-10)
- 🟥 `kor_for_eng` **20** — 20 variety flags, still open (2026-02-14)
- 🟥 `jpn_for_eng` **6** — 6 variety flags, still open (2026-02-11)

### Build-time checkpoint QA

An LLM reviewer scores quality and vocabulary violations at seeds 10, 50, 150 and 300 during the build.

*Caveat:* STALE. The endpoint is still live but nothing has written to it since 17 February 2026. It never looked past seed 300, and the paid courses have since grown to 668 — so a green here describes a course that no longer exists in that form.

- 🟩 `bre_for_fra` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟩 `cat_for_spa` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟩 `ara_for_eng` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟩 `eng_for_ara` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟩 `eng_for_deu` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟩 `eng_for_fra` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟧 `eng_for_jpn` — checkpoints ran but at least one was left sitting at 'pending human' and never resolved (early 2026)
- 🟩 `eng_for_kor` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟩 `eng_for_spa` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟩 `eng_for_zho` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟩 `nld_for_eng` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟧 `deu_for_eng` — checkpoints ran but at least one was left sitting at 'pending human' and never resolved (early 2026)
- 🟩 `eng_for_por` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟩 `gle_for_eng` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟧 `kor_for_eng` — checkpoints ran but at least one was left sitting at 'pending human' and never resolved (early 2026)
- 🟩 `zho_for_eng` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟩 `jpn_for_eng` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)
- 🟧 `ita_for_eng` — checkpoints ran but at least one was left sitting at 'pending human' and never resolved (early 2026)
- 🟧 `por_for_eng` — checkpoints ran but at least one was left sitting at 'pending human' and never resolved (early 2026)
- 🟧 `fra_for_eng` — checkpoints ran but at least one was left sitting at 'pending human' and never resolved (early 2026)
- 🟩 `spa_for_eng` — every checkpoint approved, zero vocabulary violations — but only up to seed 300, and never re-run since (early 2026)

### Introduction-order probe

Is an expression used in a phrase before the round that introduces it.

*Caveat:* Takes one word at a time, not a course. The single run probed five words — a course is never 'covered' by this.

- 🟥 `eng_for_por` **2** — five words probed, two used early; not fixed — and five words is not a course (2026-08-17)

---

## Every course, most-gapped first

Each line shows only the checks that produced an answer. Everything else on that course has never run.

- **`cym_anthem_for_jpn`** · 7 seeds · Welsh for Japanese speakers · **17/18 unchecked**  
  ❓ known-side untaught word · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`cym_nnew_for_eng`** · 267 seeds · Welsh for English speakers · **17/18 unchecked**  
  🟩 language-name contamination · ❓ presentation drift
- **`deu_for_zho`** · 300 seeds · German for Chinese speakers · **17/18 unchecked**  
  ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`eus_for_spa`** · 300 seeds · Basque for Spanish speakers · **17/18 unchecked**  
  ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`fra_for_zho`** · 300 seeds · French for Chinese speakers · **17/18 unchecked**  
  ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`ita_for_cym`** · 20 seeds · Italian for Welsh speakers · **17/18 unchecked**  
  ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`ita_for_zho`** · 300 seeds · Italian for Chinese speakers · **17/18 unchecked**  
  ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`spa_for_cym`** · 2 seeds · Spanish for Welsh speakers · **17/18 unchecked**  
  ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`spa_for_zho`** · 300 seeds · Spanish for Chinese speakers · **17/18 unchecked**  
  ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`zho_for_gle`** · 5 seeds · Chinese for Irish speakers · **17/18 unchecked**  
  ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`afr_for_eng`** · 300 seeds · Afrikaans for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 10 · 🟩 language-name contamination · ❓ presentation drift
- **`ara_eg_for_eng`** · 668 seeds · Arabic for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 387 · 🟩 language-name contamination · ❓ presentation drift
- **`ara_lb_for_eng`** · 668 seeds · Arabic for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 78 · 🟩 language-name contamination · ❓ presentation drift
- **`ben_for_eng`** · 300 seeds · Bengali for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 217 · 🟩 language-name contamination · ❓ presentation drift
- **`bre_for_eng`** · 14 seeds · Breton for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟧 language-name contamination 1 · ❓ presentation drift
- **`bul_for_eng`** · 300 seeds · Bulgarian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 23 · 🟩 language-name contamination · ❓ presentation drift
- **`cat_for_eng`** · 300 seeds · Catalan for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 6 · 🟩 language-name contamination · ❓ presentation drift
- **`ces_for_eng`** · 300 seeds · Czech for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 776 · 🟩 language-name contamination · ❓ presentation drift
- **`cor_for_eng`** · 25 seeds · Cornish for English speakers · **16/18 unchecked**  
  🟩 filler BUILD scan · 🟧 language-name contamination 4 · ❓ presentation drift
- **`cym_for_yor`** · 313 seeds · Welsh for Yoruba speakers · **16/18 unchecked**  
  🟥 known-side untaught word 2 · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`dan_for_eng`** · 300 seeds · Danish for English speakers · **16/18 unchecked**  
  🟩 filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`deu_at_for_eng`** · 668 seeds · German for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 30 · 🟩 language-name contamination · ❓ presentation drift
- **`deu_ch_for_eng`** · 668 seeds · German for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 273 · 🟩 language-name contamination · ❓ presentation drift
- **`eng_for_ita`** · 300 seeds · English for Italian speakers · **16/18 unchecked**  
  🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`eng_for_kan`** · 668 seeds · English for Kannada speakers · **16/18 unchecked**  
  🟥 known-side untaught word 28 · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`eng_for_mar`** · 668 seeds · English for Marathi speakers · **16/18 unchecked**  
  🟥 known-side untaught word 61 · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`eng_for_tel`** · 668 seeds · English for Telugu speakers · **16/18 unchecked**  
  🟥 known-side untaught word 3 · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`eng_template`** · 300 seeds · English for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟩 language-name contamination · ❓ presentation drift
- **`est_for_eng`** · 300 seeds · Estonian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟩 language-name contamination · ❓ presentation drift
- **`eus_for_eng`** · 300 seeds · Basque for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 14 · 🟩 language-name contamination · ❓ presentation drift
- **`fas_for_eng`** · 300 seeds · Persian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 112 · 🟩 language-name contamination · ❓ presentation drift
- **`fin_for_eng`** · 668 seeds · Finnish for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 112 · 🟩 language-name contamination · ❓ presentation drift
- **`fra_ca_for_eng`** · 668 seeds · French for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 133 · 🟩 language-name contamination · ❓ presentation drift
- **`fur_for_eng`** · 25 seeds · Friulian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 5 · 🟧 language-name contamination 4 · ❓ presentation drift
- **`gla_for_eng`** · 272 seeds · Scots Gaelic for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 42 · 🟩 language-name contamination · ❓ presentation drift
- **`gle_cn_for_eng`** · 300 seeds · Irish for English speakers · **16/18 unchecked**  
  🟥 ZUT audit (3 buckets) 4 · 🟩 language-name contamination · ❓ presentation drift
- **`glg_for_eng`** · 300 seeds · Galician for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 21 · 🟩 language-name contamination · ❓ presentation drift
- **`hak_for_eng`** · 668 seeds · Hakka for English speakers · **16/18 unchecked**  
  🟩 filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`heb_for_eng`** · 300 seeds · Hebrew for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 38 · 🟩 language-name contamination · ❓ presentation drift
- **`hun_for_eng`** · 300 seeds · Hungarian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 225 · 🟩 language-name contamination · ❓ presentation drift
- **`hye_for_eng`** · 300 seeds · Armenian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 8 · 🟥 language-name contamination 4 · ❓ presentation drift
- **`ind_for_eng`** · 25 seeds · Indonesian for English speakers · **16/18 unchecked**  
  🟩 filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`isl_for_eng`** · 300 seeds · Icelandic for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 6 · 🟩 language-name contamination · ❓ presentation drift
- **`kan_for_eng`** · 8 seeds · Kannada for English speakers · **16/18 unchecked**  
  🟩 filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`kor_for_hin`** · 668 seeds · Korean for Hindi speakers · **16/18 unchecked**  
  🟥 known-side untaught word 60 · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`kor_for_tam`** · 668 seeds · Korean for Tamil speakers · **16/18 unchecked**  
  🟥 known-side untaught word 19 · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`lav_for_eng`** · 300 seeds · Latvian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 4 · 🟩 language-name contamination · ❓ presentation drift
- **`lit_for_eng`** · 300 seeds · Lithuanian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟩 language-name contamination · ❓ presentation drift
- **`lmo_for_eng`** · 29 seeds · Lombard for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 19 · 🟧 language-name contamination 4 · ❓ presentation drift
- **`mar_for_eng`** · 668 seeds · Marathi for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟩 language-name contamination · ❓ presentation drift
- **`mkd_for_eng`** · 16 seeds · Macedonian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟩 language-name contamination · ❓ presentation drift
- **`mlt_for_eng`** · 300 seeds · Maltese for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 49 · 🟩 language-name contamination · ❓ presentation drift
- **`nan_for_eng`** · 467 seeds · Hokkien for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟩 language-name contamination · ❓ presentation drift
- **`nap_for_eng`** · 30 seeds · Neapolitan for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 20 · 🟧 language-name contamination 5 · ❓ presentation drift
- **`nep_for_eng`** · 300 seeds · Nepali for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 6 · 🟩 language-name contamination · ❓ presentation drift
- **`nor_for_eng`** · 300 seeds · Norwegian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 4 · 🟩 language-name contamination · ❓ presentation drift
- **`pdc_for_eng`** · 298 seeds · Pennsylvania Dutch for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 190 · 🟩 language-name contamination · ❓ presentation drift
- **`pol_for_eng`** · 300 seeds · Polish for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 14 · 🟩 language-name contamination · ❓ presentation drift
- **`por_br_for_eng`** · 668 seeds · Portuguese for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 48 · 🟩 language-name contamination · ❓ presentation drift
- **`rgn_for_eng`** · 10 seeds · Romagnol for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 6 · 🟧 language-name contamination 5 · ❓ presentation drift
- **`roh_for_eng`** · 10 seeds · Romansh for English speakers · **16/18 unchecked**  
  🟩 filler BUILD scan · 🟧 language-name contamination 5 · ❓ presentation drift
- **`ron_for_eng`** · 300 seeds · Romanian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 13 · 🟩 language-name contamination · ❓ presentation drift
- **`rus_for_eng`** · 300 seeds · Russian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 5 · 🟩 language-name contamination · ❓ presentation drift
- **`sbx_for_eng`** · 15 seeds · Breton for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 7 · 🟧 language-name contamination 1 · ❓ presentation drift
- **`scn_for_eng`** · 30 seeds · Sicilian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 8 · 🟧 language-name contamination 5 · ❓ presentation drift
- **`sme_for_eng`** · 10 seeds · Northern Sami for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟧 language-name contamination 5 · ❓ presentation drift
- **`srp_for_eng`** · 300 seeds · Serbian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 6 · 🟩 language-name contamination · ❓ presentation drift
- **`swa_for_eng`** · 300 seeds · Swahili for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 10 · 🟩 language-name contamination · ❓ presentation drift
- **`swe_for_eng`** · 300 seeds · Swedish for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟩 language-name contamination · ❓ presentation drift
- **`tel_for_eng`** · 668 seeds · Telugu for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 11 · 🟩 language-name contamination · ❓ presentation drift
- **`tha_for_eng`** · 300 seeds · Thai for English speakers · **16/18 unchecked**  
  🟩 filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`ukr_for_eng`** · 300 seeds · Ukrainian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 4 · 🟩 language-name contamination · ❓ presentation drift
- **`vec_for_eng`** · 30 seeds · Venetian for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 11 · 🟧 language-name contamination 6 · ❓ presentation drift
- **`yid_for_eng`** · 10 seeds · Yiddish for English speakers · **16/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟧 language-name contamination 4 · ❓ presentation drift
- **`yor_for_eng`** · 10 seeds · Yoruba for English speakers · **16/18 unchecked**  
  🟩 filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`yue_for_eng`** · 668 seeds · Cantonese for English speakers · **16/18 unchecked**  
  🟩 filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`zho_for_hin`** · 668 seeds · Chinese for Hindi speakers · **16/18 unchecked**  
  🟥 known-side untaught word 48 · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`zho_for_tam`** · 668 seeds · Chinese for Tamil speakers · **16/18 unchecked**  
  🟥 known-side untaught word 15 · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`bre_for_fra`** · 300 seeds · Breton for French speakers · **16/18 unchecked**  
  ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`cat_for_spa`** · 300 seeds · Catalan for Spanish speakers · **16/18 unchecked**  
  ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`ell_for_eng`** · 300 seeds · Greek for English speakers · **15/18 unchecked**  
  🟥 ZUT audit (3 buckets) 62 · 🟥 filler BUILD scan 5 · 🟩 language-name contamination · ❓ presentation drift
- **`eng_for_ben`** · 668 seeds · English for Bengali speakers · **15/18 unchecked**  
  🟥 known-side untaught word 14 · 🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`eng_for_guj`** · 668 seeds · English for Gujarati speakers · **15/18 unchecked**  
  🟥 known-side untaught word 9 · 🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`eng_for_pan`** · 668 seeds · English for Punjabi speakers · **15/18 unchecked**  
  🟥 known-side untaught word 7 · 🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`eng_for_sin`** · 668 seeds · English for Sinhala speakers · **15/18 unchecked**  
  🟥 known-side untaught word 56 · 🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`eng_for_tam`** · 668 seeds · English for Tamil speakers · **15/18 unchecked**  
  🟥 known-side untaught word 21 · 🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`eng_for_urd`** · 668 seeds · English for Urdu speakers · **15/18 unchecked**  
  🟥 known-side untaught word 47 · 🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`hin_for_eng`** · 300 seeds · Hindi for English speakers · **15/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟩 language-name contamination · ❓ presentation drift · 🟥 distinction coverage 929
- **`spa_mx_for_eng`** · 668 seeds · Spanish for English speakers · **15/18 unchecked**  
  🟥 know-clash (twin verbs) · 🟥 filler BUILD scan 27 · 🟩 language-name contamination · ❓ presentation drift
- **`tur_for_eng`** · 300 seeds · Turkish for English speakers · **15/18 unchecked**  
  🟥 filler BUILD scan 41 · 🟩 language-name contamination · ❓ presentation drift · 🟥 LEGO frequency / variety 16
- **`ara_for_eng`** · 668 seeds · Arabic for English speakers · **15/18 unchecked**  
  🟥 filler BUILD scan 54 · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`cym_n_for_eng`** · 305 seeds · Welsh for English speakers · **15/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟩 language-name contamination · 🟥 presentation drift 2
- **`eng_for_ara`** · 300 seeds · English for Arabic speakers · **15/18 unchecked**  
  ❓ known-side untaught word · 🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`eng_for_deu`** · 300 seeds · English for German speakers · **15/18 unchecked**  
  🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`eng_for_fra`** · 300 seeds · English for French speakers · **15/18 unchecked**  
  🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`eng_for_jpn`** · 300 seeds · English for Japanese speakers · **15/18 unchecked**  
  ❓ known-side untaught word · 🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟧 checkpoint QA (early 2026)
- **`eng_for_kor`** · 300 seeds · English for Korean speakers · **15/18 unchecked**  
  ❓ known-side untaught word · 🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`eng_for_spa`** · 300 seeds · English for Spanish speakers · **15/18 unchecked**  
  🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`eng_for_zho`** · 299 seeds · English for Chinese speakers · **15/18 unchecked**  
  🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`hrv_for_eng`** · 300 seeds · Croatian for English speakers · **15/18 unchecked**  
  🟥 filler BUILD scan 24 · 🟩 language-name contamination · 🟧 presentation drift 33
- **`nld_for_eng`** · 300 seeds · Dutch for English speakers · **15/18 unchecked**  
  🟥 filler BUILD scan 10 · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`deu_for_jpn`** · 300 seeds · German for Japanese speakers · **14/18 unchecked**  
  ❓ known-side untaught word · 🟥 BUILD teaches its word · 🟥 teaching-order scan 11 · 🟥 lesson/LEGO boundary 3 · ❓ filler BUILD scan · 🟥 language-name contamination 4 · ❓ presentation drift
- **`fra_for_jpn`** · 300 seeds · French for Japanese speakers · **14/18 unchecked**  
  ❓ known-side untaught word · 🟥 BUILD teaches its word · 🟥 teaching-order scan 14 · 🟧 lesson/LEGO boundary 6 · ❓ filler BUILD scan · 🟥 language-name contamination 4 · ❓ presentation drift
- **`ita_for_jpn`** · 300 seeds · Italian for Japanese speakers · **14/18 unchecked**  
  ❓ known-side untaught word · 🟥 BUILD teaches its word · 🟥 teaching-order scan 4 · 🟧 lesson/LEGO boundary 17 · ❓ filler BUILD scan · 🟥 language-name contamination 4 · ❓ presentation drift
- **`por_for_jpn`** · 300 seeds · Portuguese for Japanese speakers · **14/18 unchecked**  
  ❓ known-side untaught word · 🟥 BUILD teaches its word · 🟥 teaching-order scan 4 · 🟥 lesson/LEGO boundary 1 · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift
- **`spa_for_jpn`** · 300 seeds · Spanish for Japanese speakers · **14/18 unchecked**  
  ❓ known-side untaught word · 🟥 BUILD teaches its word · 🟥 teaching-order scan 5 · 🟥 lesson/LEGO boundary 1 · ❓ filler BUILD scan · 🟥 language-name contamination 4 · ❓ presentation drift
- **`zho_for_jpn`** · 300 seeds · Chinese for Japanese speakers · **14/18 unchecked**  
  ❓ known-side untaught word · 🟥 BUILD teaches its word · 🟥 teaching-order scan 7 · 🟥 lesson/LEGO boundary 2 · ❓ filler BUILD scan · 🟥 language-name contamination 5 · ❓ presentation drift
- **`cym_s_for_eng`** · 334 seeds · Welsh for English speakers · **14/18 unchecked**  
  🟥 filler BUILD scan 2 · 🟩 language-name contamination · 🟥 presentation drift 4 · 🟥 distinction coverage 4
- **`deu_for_eng`** · 668 seeds · German for English speakers · **14/18 unchecked**  
  🟥 know-clash (twin verbs) · 🟥 filler BUILD scan 20 · 🟩 language-name contamination · ❓ presentation drift · 🟧 checkpoint QA (early 2026)
- **`eng_for_por`** · 300 seeds · English for Portuguese speakers · **14/18 unchecked**  
  🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026) · 🟥 introduction-order probe 2
- **`gle_for_eng`** · 300 seeds · Irish for English speakers · **14/18 unchecked**  
  🟥 vocabulary discontinuity 1 · 🟥 filler BUILD scan 8 · 🟩 language-name contamination · ❓ presentation drift · 🟩 checkpoint QA (early 2026)
- **`kor_for_eng`** · 667 seeds · Korean for English speakers · **14/18 unchecked**  
  🟥 filler BUILD scan 22 · 🟩 language-name contamination · ❓ presentation drift · 🟥 LEGO frequency / variety 20 · 🟧 checkpoint QA (early 2026)
- **`zho_for_eng`** · 668 seeds · Chinese for English speakers · **14/18 unchecked**  
  🟥 filler BUILD scan 21 · 🟩 language-name contamination · 🟥 presentation drift 19 · 🟩 checkpoint QA (early 2026)
- **`eng_for_hin`** · 668 seeds · English for Hindi speakers · **13/18 unchecked**  
  🟥 known-side untaught word 41 · 🟥 ZUT audit (3 buckets) 230 · 🟧 ZUT gate-and-fix (Jun) · ❓ filler BUILD scan · 🟩 language-name contamination · ❓ presentation drift · 🟥 distinction coverage 1895
- **`jpn_for_eng`** · 668 seeds · Japanese for English speakers · **13/18 unchecked**  
  🟥 vocabulary discontinuity 16 · 🟥 filler BUILD scan 22 · 🟩 language-name contamination · ❓ presentation drift · 🟥 LEGO frequency / variety 6 · 🟩 checkpoint QA (early 2026)
- **`ita_for_eng`** · 668 seeds · Italian for English speakers · **13/18 unchecked**  
  🟥 know-clash (twin verbs) · 🟥 filler BUILD scan 63 · 🟩 language-name contamination · 🟧 presentation drift 1 · 🟧 checkpoint QA (early 2026)
- **`por_for_eng`** · 668 seeds · Portuguese for English speakers · **13/18 unchecked**  
  🟥 know-clash (twin verbs) · 🟥 filler BUILD scan 222 · 🟩 language-name contamination · 🟧 presentation drift 6 · 🟧 checkpoint QA (early 2026)
- **`fra_for_eng`** · 668 seeds · French for English speakers · **12/18 unchecked**  
  🟥 know-clash (twin verbs) · 🟥 ZUT audit (3 buckets) 101 · 🟥 LEGO edge map · 🟥 filler BUILD scan 151 · 🟩 language-name contamination · ❓ presentation drift · 🟧 checkpoint QA (early 2026)
- **`spa_for_eng`** · 668 seeds · Spanish for English speakers · **7/18 unchecked**  
  🟥 know-clash (twin verbs) · 🟥 vocabulary discontinuity 1 · 🟥 ZUT audit (3 buckets) 81 · 🟥 forward-reference tiling 76 · 🟥 known/target completeness 54 · 🟥 LEGO edge map · 🟥 filler BUILD scan 15 · 🟩 language-name contamination · 🟧 presentation drift 55 · 🟥 distinction coverage 690 · 🟩 checkpoint QA (early 2026)

---

## The course universe: what exists against what was planned

The database holds **149 registered courses**. Only **120 have any content
at all**; 29 are empty shells with a row and nothing behind it. The grid covers the 119 real ones (a test course is excluded).
- **The paid x-for-English list is complete.** All sixteen exist and all sixteen are at the full 668 seeds — Arabic
(MSA, Egyptian, Lebanese), Chinese, Japanese, Korean, Italian, French ×2, Spanish ×2, Portuguese ×2, German ×3.
- **English-for-X exists but is half-length.** All nine are built, and all nine stop at 300 seeds, not 668.
- **All ten English-for-Indian-language courses exist, at the full 668 seeds.** This is the most complete block in the estate.
- **The retargeted block is mostly not there.** Fourteen courses for Japanese and Chinese speakers have content;
fourteen more exist as empty shells; and nothing at all exists for Hindi or Tamil speakers beyond four courses.
(That count comes from expanding "the paid list, retargeted" combinatorially — it is my reading of a one-line brief, not a list Kai wrote.)
- **Community courses:** Welsh (four), Irish (two built, Munster and Ulster empty), Basque (two), Finnish and
Yoruba all exist. Yoruba-for-English is ten seeds.
- **Sixty-one courses with real content are on nobody's list** — Dutch, Polish, Russian, Turkish, Swedish, Greek,
Hebrew, Persian, Thai, Hakka, Cantonese, Swahili, Scots Gaelic, Pennsylvania Dutch, and a long tail of regional Italian
and Celtic pilots. Several are large: Turkish and Catalan-for-Spanish carry over 1,300 LEGOs each. They are real courses
and they are outside the September plan as written.

---

## Gaps, blocks and things I could not settle

- **Kai's Basecamp was in my brief but I had no tool to read it.** No Basecamp connector was available to this session, so the planning lists in the brief are taken at face value and I could not check them against his board. Deborah's own findings are known to live in Basecamp card descriptions, so anything she raised that was never written into a repo document is invisible to this grid.

- **Almost none of this tooling is on the main branch.** The ZUT audit tool, the forward-reference gate, the known/target detector, the edge map and the known-side ordering fixes all live on unmerged branches; the only trustworthy filler detector is an uncommitted scratch file that a clean checkout would delete. The grid describes work that happened, not protection that is in place.

- **Two checks are not tools at all.** The know-clash and the vocabulary-discontinuity work are a documented method and a scoping study. Re-running either on a new course today means a person reading, not a command.

- **The lesson-boundary column is a one-off.** The 120 cases were sorted and repaired by hand. No script exists to produce that list for a seventh course.

- **Eight Japanese-prompt courses came back 'cannot judge' from the known-side gate** — 51,017 rows the gate refused because Japanese gives it no word boundary to work with. That is honest of the gate and it is not coverage, so those cells are **?**.

- **Two numbers rest on prose alone.** The 19% forward-reference figure for Spanish has no surviving list of the 400 rows it sampled, and the June English-for-X pass claims 383 rows were re-glossed with backup files that are not in the repository. Both are shown, both are flagged.

- **The 'never run' cells are an absence of evidence.** I searched every branch, the document tree, the committed artefacts and the database's own result tables. A check run by someone who wrote nothing down would not appear here.
