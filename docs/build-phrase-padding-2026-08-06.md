https://watson-1.tail4968cb.ts.net/d/5da151fc

# Build-phrase padding — how bad, and where it comes from

*Diagnosis only, 2026-08-06. Read-only: no DB writes, no content edits, no regeneration. Source = live Supabase (`course_practice_phrases`, `course_legos`, `course_round_index`), read directly.*

---

## The three numbers

**1. How bad in Spanish — 394 padded practice phrases, and they are concentrated, not spread.**
394 of spa_for_eng's 15,205 Build+Use phrases (2.6% course-wide). But that average hides it. In **rounds 1100–1199, 259 of 871 phrases — 30% — are padding**, and **89 of the 150 rounds between R1050 and R1199 (59%) contain two or more**. Outside that band the rate is 1–4%, and most of those are false positives. Deborah's "from R1147 onward" is right; the band actually starts at about **R1050** and stops dead at **R1200**.

**2. Is it generator-side — YES.**
It is produced at build time by the LLM course-builder agent submitting through `POST /api/seed/complete`, and the forcing function is a hard quota: `services/course-builder/lib/phrase-structure.cjs:111` — `minUse = 5`, enforced at line 159. Five complete Use sentences per LEGO, "LEGO + 5–10 syllables", using only already-introduced vocabulary. When the known vocabulary is thin, the cheapest legal way to hit five is to bolt a stock adverbial on. **This is one generator change, not thousands of hand edits** — though the rows already in the database will not self-heal.

**3. Wider than Spanish — YES, and Spanish is not the worst.**
**74 of the 99 live courses** are affected, **12,341 padded phrases** in total. Spanish ranks 6th of the 60 English-known courses. Worse: `eng_for_zho` **17.0%**, `eng_for_kan` 8.5%, `ces_for_eng` 7.3%, `hun_for_eng` 7.2%, `eng_for_mar` 7.1%, `ara_eg_for_eng` 6.3%, `ben_for_eng` 6.3%. Four courses (`hak_for_eng`, `yue_for_eng`, `nan_for_eng`, `tha_for_eng`) have **zero**.

---

## One important correction to the brief

Deborah calls these "Build phrases". In the database, **291 of the 394 Spanish hits are `phrase_role = 'use'`**, only 103 are `'build'`. That matters for the fix: the anti-template gate shipped on 2026-07-24 runs on BUILD baskets **only** (`services/course-builder/routes/seed-complete.cjs:1218`), so three quarters of this defect is in the half of the data no gate is watching.

---

## The detector, and that it caught her examples

**Definition.** A practice phrase is a *hit* when its known text, lowercased and punctuation-stripped, is exactly `<the round's LEGO known text> + " " + T`, where `T` is one of 30 semantically vacuous adjuncts:

> here, there, over there, before, after, yesterday, today, tomorrow, tonight, now, right now, last night, this morning, this afternoon, this evening, at the end, again, soon, well, very well, a lot, everything, for everyone, for us, for me, about everything, too, also, anywhere, everywhere

That list was not invented — it is the top of the empirically measured distribution of trailing remainders in spa_for_eng (here 140, before 74, yesterday 56, for everyone 36, today 27), which independently reproduces the words Deborah named.

**Calibration — it caught all six of her rounds**, before any count was taken:

| round | hits found |
|---|---|
| R1146 `whenever you feel` | 5 |
| R1150 `was absolutely right` | 3 |
| R1155 `because he has been playing` | 6 |
| R1156 `in the mud` | 3 |
| R1157 `I am feeling sad` | 4 |
| R1162 `small` | 4 |

Her exact rows are in there: `whenever you feel here`, `whenever you feel before`, `was absolutely right here / before / yesterday`, `in the mud here / before / yesterday`, `I am feeling sad before / yesterday / for everyone`, `small here / before / yesterday / for everyone`. **Yes — the detector found every known positive.**

---

## False positives, and the CONFIRMED / PLAUSIBLE split

A raw hit count here is largely noise, and I can show it. My first pass used a purely structural detector (LEGO + any short remainder). It returned 793 hits in Spanish — and a hand sample of 30 from the early course was mostly *legitimate*: `I need` + `to learn`, `how` + `to speak`, `they have to` + `come`. Those are real Build phrases where the LEGO is a fragment that *requires* completion. **That raw number is not a finding and I am not reporting it as one.**

**Split criterion.** This encodes Deborah's own definition of the defect — "the same two or three words over and over":

- **CONFIRMED** = a vacuous-adjunct hit occurring in a round where **two or more** phrases end in a vacuous adjunct. The round's practice set is built from a stock tail pool.
- **PLAUSIBLE** = a vacuous-adjunct hit that is the only one in its round. A single time adverbial on a rich phrase is usually good practice.

**Spanish: 394 CONFIRMED, 102 PLAUSIBLE.**

**Hand audits of the CONFIRMED set** (I read every row and judged it):

| sample | verdict |
|---|---|
| 24 rows, R1100–1199 | **23 defective, 1 legitimate** (`the dog is` + `there` — the LEGO needs a completion) |
| 20 rows carrying a past-time tail | **19 defective, 1 legitimate** (`Did you have a good time last night?`) |
| 24 rows, rounds < 1050 | **~8 defective, ~16 legitimate** — e.g. `a table for four tonight`, `I'd like to read my book tomorrow` are fine |

So precision is ~96% inside the hot band and only ~33% outside it. Applying those rates: **best estimate of genuinely defective Spanish phrases ≈ 315**, of which ~282 sit in R1050–R1199.

**Ungrammatical subset.** 137 Spanish CONFIRMED rows carry a past-time tail (`yesterday` / `before` / `last night`). Hand-reading 20 of them: 4 are outright ungrammatical (`I want to get there yesterday`, `let's agree that before`, `it's so late at night yesterday`, and Deborah's `I am feeling sad yesterday`), and a further 9 are bare fragments, not the complete sentences the Use role requires (`the beach yesterday`, `in the mud yesterday`, `without your help yesterday`). In `eng_for_kan` / `eng_for_zho` it is worse still: `Ago today`, `perfect today`, `Your car here`, `do they want to kill today?`.

---

## Where in the Spanish course it lives

| round band | Build+Use phrases | padded | % |
|---|---|---|---|
| 1–999 | 11,140 | ~100 (mostly false positives) | ~1% |
| 1000–1049 | ~200 | 6 | 3% |
| 1050–1099 | ~200 | 36 | 18% |
| **1100–1149** | 435 | **156** | **35.9%** |
| **1150–1199** | 436 | **157** | **36.0%** |
| 1200–1339 | 1,210 | 30 | 2.5% |

Sharp on, sharp off. That is the signature of a batch, not of drift. Row provenance agrees: 341 of the ~490 Spanish vacuous-tail rows were created on **2026-05-28**, all stamped `metadata.format = 'build_use'`.

---

## The cause, traced

**It is generated, not authored by hand.** The chain:

1. **Where the rows come from.** All of them carry `metadata.format = 'build_use'`, written by the agent-submission endpoint `services/course-builder/routes/seed-complete.cjs` (lines 1863, 1887, 2026). Phrases are composed by an LLM course-builder agent and POSTed to `/api/seed/complete`; the server validates and inserts. No template in this repo emits the word "yesterday" — I grepped `services/`, `tools/`, `prompts/` and there is no hardcoded adjunct list. The padding is the *model's* cheapest way to satisfy the server's constraints.

2. **The forcing function — a hard quota of five.** `services/course-builder/lib/phrase-structure.cjs:111` sets `minUse = 5`; line 159 rejects the submission if fewer are supplied. The methodology hint the agent is shown (`services/course-builder/lib/validation.cjs:40`) reads *"USE phrases (minimum 5) … MUST be complete sentences … LEGO + 5–10 syllables … only prior vocabulary."* Five complete sentences, a length floor, and a closed vocabulary — when prior vocabulary is thin, appending `aquí` / `antes` / `ayer` satisfies every one of those constraints at once. That is why the defect clusters late in a course *and* in courses with short vocabulary runways.

3. **Why the existing guards do not catch it.** Two guards exist and both are structurally blind to this shape:
   - `checkBuildRecombination` (the BUILD anti-template gate, added **2026-07-24**, `validation.cjs:918`). Its stamp signature is `FILLER_TAG_RE = /,\s*¿?[^,]{1,18}$/` — **it requires a comma** before the tag. `small yesterday` has no comma, so it passes. And it runs on BUILD baskets only (`seed-complete.cjs:1218`), never on USE — where 74% of the defect lives.
   - `checkBasketFrameCoverage` (added **2026-06-10**, `validation.cjs:~720`) is **warn-only**, and it slots the LEGO out to form a signature. `◇ aquí`, `◇ antes`, `◇ ayer` are three *distinct* signatures, so diversity scores 1.0 and no warning fires. Varying the adverbial is exactly what defeats it.

4. **Timing confirms it.** The Spanish rows were created 2026-02-17 and 2026-05-28. Both guards postdate them. The comment at `services/course-builder/lib/build-escalation.cjs:41` already names this defect by hand — *"NEVER the LEGO (or a USE phrase) with a short tacked-on tag like ', yes / , here / , again'"* — so it is a known failure mode whose gate was only ever half-built.

---

## Per-course table

Method note: for the 60 `*_for_eng` courses the detector runs on the **known (English)** side. For the 19 `eng_for_*` courses the known side is not English, so it runs on the **target (English)** side — same detector, same closed adjunct list, equally adjudicable. No course is counted twice.

### Worst 20

| course | Build+Use | padded (CONFIRMED) | % |
|---|---|---|---|
| eng_for_zho † | 4,392 | 745 | **16.96** |
| eng_for_kan † | 11,973 | 1,016 | 8.49 |
| ces_for_eng | 5,278 | 384 | 7.28 |
| hun_for_eng | 4,843 | 350 | 7.23 |
| eng_for_mar † | 11,574 | 816 | 7.05 |
| ara_eg_for_eng | 10,812 | 683 | 6.32 |
| ben_for_eng | 5,628 | 353 | 6.27 |
| eng_for_pan † | 10,621 | 633 | 5.96 |
| eng_for_tam † | 10,936 | 591 | 5.40 |
| eng_for_tel † | 10,859 | 576 | 5.30 |
| eng_for_ben † | 10,632 | 511 | 4.81 |
| eng_for_hin † | 10,599 | 433 | 4.09 |
| eng_for_guj † | 11,628 | 414 | 3.56 |
| eng_for_ara † | 4,975 | 146 | 2.93 |
| fas_for_eng | 6,395 | 187 | 2.92 |
| eng_for_sin † | 10,506 | 295 | 2.81 |
| eng_for_urd † | 9,746 | 256 | 2.63 |
| **spa_for_eng** | **15,205** | **394** | **2.59** |
| fra_for_eng | 14,118 | 356 | 2.52 |
| eng_for_spa † | 4,898 | 123 | 2.51 |

† measured on the target (English) side.

### Full table — English-known courses (60)

| course | Build+Use | padded | % |
|---|---|---|---|
| ces_for_eng | 5278 | 384 | 7.28 |
| hun_for_eng | 4843 | 350 | 7.23 |
| ara_eg_for_eng | 10812 | 683 | 6.32 |
| ben_for_eng | 5628 | 353 | 6.27 |
| fas_for_eng | 6395 | 187 | 2.92 |
| spa_for_eng | 15205 | 394 | 2.59 |
| fra_for_eng | 14118 | 356 | 2.52 |
| tel_for_eng | 12448 | 311 | 2.50 |
| heb_for_eng | 4701 | 108 | 2.30 |
| fra_ca_for_eng | 11007 | 250 | 2.27 |
| por_for_eng | 12640 | 270 | 2.14 |
| sbx_for_eng | 427 | 8 | 1.87 |
| ara_lb_for_eng | 11521 | 176 | 1.53 |
| fin_for_eng | 12304 | 186 | 1.51 |
| mlt_for_eng | 5344 | 69 | 1.29 |
| glg_for_eng | 4475 | 54 | 1.21 |
| bul_for_eng | 4580 | 55 | 1.20 |
| deu_ch_for_eng | 11551 | 134 | 1.16 |
| gla_for_eng | 4507 | 50 | 1.11 |
| ara_for_eng | 11340 | 122 | 1.08 |
| ita_for_eng | 12277 | 122 | 0.99 |
| eus_for_eng | 5683 | 54 | 0.95 |
| spa_mx_for_eng | 11966 | 107 | 0.89 |
| swa_for_eng | 5846 | 47 | 0.80 |
| deu_at_for_eng | 11251 | 68 | 0.60 |
| por_br_for_eng | 12056 | 70 | 0.58 |
| nld_for_eng | 4368 | 23 | 0.53 |
| tur_for_eng | 9046 | 45 | 0.50 |
| lav_for_eng | 4920 | 22 | 0.45 |
| hye_for_eng | 5378 | 24 | 0.45 |
| hrv_for_eng | 5449 | 24 | 0.44 |
| cat_for_eng | 5041 | 21 | 0.42 |
| gle_for_eng | 5431 | 21 | 0.39 |
| lit_for_eng | 5188 | 19 | 0.37 |
| pol_for_eng | 5049 | 16 | 0.32 |
| srp_for_eng | 4922 | 15 | 0.30 |
| ron_for_eng | 5166 | 15 | 0.29 |
| afr_for_eng | 3877 | 11 | 0.28 |
| jpn_for_eng | 10583 | 28 | 0.26 |
| kor_for_eng | 12461 | 31 | 0.25 |
| isl_for_eng | 4785 | 11 | 0.23 |
| deu_for_eng | 12954 | 29 | 0.22 |
| zho_for_eng | 10543 | 19 | 0.18 |
| nep_for_eng | 6824 | 12 | 0.18 |
| nor_for_eng | 4439 | 8 | 0.18 |
| rus_for_eng | 6071 | 11 | 0.18 |
| est_for_eng | 4839 | 8 | 0.17 |
| cym_n_for_eng | 4997 | 8 | 0.16 |
| cym_s_for_eng | 5365 | 8 | 0.15 |
| ell_for_eng | 7374 | 10 | 0.14 |
| dan_for_eng | 4499 | 6 | 0.13 |
| ukr_for_eng | 4755 | 5 | 0.11 |
| swe_for_eng | 5178 | 2 | 0.04 |
| mar_for_eng | 13482 | 4 | 0.03 |
| hin_for_eng | 5760 | 2 | 0.03 |
| tha_for_eng | 4535 | 0 | 0.00 |
| nan_for_eng | 5758 | 0 | 0.00 |
| yue_for_eng | 8142 | 0 | 0.00 |
| hak_for_eng | 20329 | 0 | 0.00 |

### Full table — `eng_for_*` courses, measured on the English target side (19)

| course | Build+Use | padded | % |
|---|---|---|---|
| eng_for_zho | 4392 | 745 | 16.96 |
| eng_for_kan | 11973 | 1016 | 8.49 |
| eng_for_mar | 11574 | 816 | 7.05 |
| eng_for_pan | 10621 | 633 | 5.96 |
| eng_for_tam | 10936 | 591 | 5.40 |
| eng_for_tel | 10859 | 576 | 5.30 |
| eng_for_ben | 10632 | 511 | 4.81 |
| eng_for_hin | 10599 | 433 | 4.09 |
| eng_for_guj | 11628 | 414 | 3.56 |
| eng_for_ara | 4975 | 146 | 2.93 |
| eng_for_sin | 10506 | 295 | 2.81 |
| eng_for_urd | 9746 | 256 | 2.63 |
| eng_for_spa | 4898 | 123 | 2.51 |
| eng_for_kor | 4680 | 91 | 1.94 |
| eng_for_jpn | 10108 | 145 | 1.43 |
| eng_for_fra | 5240 | 60 | 1.15 |
| eng_for_por | 5104 | 30 | 0.59 |
| eng_for_deu | 4937 | 21 | 0.43 |
| eng_for_ita | 4982 | 13 | 0.26 |

---

## Recommendation

**The fix is generator-side first, data-side second — and they are separable.** Do the generator now; the data repair is a separate, gated decision.

**Generator side — three small changes, all in the submit path:**

1. **Run the anti-template gate on USE, not just BUILD.** `seed-complete.cjs:1218` applies `checkBuildRecombination` to BUILD baskets only. Three quarters of this defect is in USE.
2. **Drop the comma requirement from the stamp signature.** `FILLER_TAG_RE = /,\s*¿?[^,]{1,18}$/` in `validation.cjs:928` only fires on `LEGO, tag`. Add a bare-adjunct arm: LEGO + a trailing token from a per-language closed adjunct list, hard-reject on the second occurrence within one basket. My 30-word English list is a working starting point and reproduces the defect exactly; each target language needs its own (the Spanish rows are `aquí / antes / ayer / para todos`).
3. **Make the quota of five satisfiable honestly.** `minUse = 5` (`phrase-structure.cjs:111`) is the pressure that creates the padding. Either let the floor ramp down when the prior-vocabulary pool is small, or count *distinct frames* rather than raw rows — five phrases that differ only by adverbial should count as one, not five.

Do these and the backlog stops growing. Nothing else changes; no existing content is touched.

**Data side — ~12,300 phrases estate-wide, ~315 of them Spanish.** These rows will not self-heal. But the repair is a **within-round swap**: the LEGO, the round index, the teaching order and the vocabulary window all stay exactly as they are; only the padded Use/Build texts inside an already-existing basket are replaced. That is the shape that keeps the course internally consistent. It is emphatically *not* a re-tile.

**What could break — four things, in order of danger:**

1. **Use phrases are eternal spaced-repetition stock.** `validation.cjs:667` is explicit that all USE phrases feed consolidate/review. Replacing a Use phrase changes what comes back in later review rounds. Any consolidate round that already references a replaced phrase must be re-pointed, or the review phase goes stale. **This is the real risk, and it is bigger than the padding.**
2. **Audio.** Every replaced phrase needs new clips. Spanish alone is ~315 phrases × (known + 2 target voices) ≈ 950 clips. That is a cost gate and needs approval, and make-before-break applies — generate and verify before any old clip is touched.
3. **ZUT.** Replacement phrases must not create a second target for a known text that already has one.
4. **Vocabulary window.** Replacements may only use vocabulary introduced before that round — the same constraint that caused the defect, so the generator fix must land first or the repair reproduces it.

**Suggested sequencing.** Ship the generator fix. Then regenerate **spa_for_eng R1050–R1199 only** — 89 rounds, ~294 phrases — as a bounded pilot, and put it in front of Deborah before touching any of the other 73 courses. If it holds, `eng_for_zho` (17%) is the next target, not Spanish; it is nearly seven times worse.

---

## Explicit gaps

- **20 of the 99 courses have no English side and were not adjudicated.** `cat_for_spa`, `eus_for_spa`, `bre_for_fra`, `zho_for_hin`, `kor_for_hin`, `kor_for_tam`, `zho_for_tam`, `spa_for_jpn`, `fra_for_jpn`, `por_for_jpn`, `ita_for_jpn`, `deu_for_jpn`, `zho_for_jpn`, `fra_for_zho`, `deu_for_zho`, `ita_for_zho`, `spa_for_zho`, `ita_for_cym`, `cym_anthem_for_jpn`, `zho_for_gle`, plus `eng_template`. A coarse language-agnostic proxy (LEGO + a remainder that recurs across ≥5 rounds in that course) flags `ita_for_cym` at 6.9%, `eus_for_spa` 0.6%, `cat_for_spa` 0.5%, `zho_for_hin` 0.6%, `kor_for_hin` 0.5%, `zho_for_tam` 0.5%, `kor_for_tam` 0.3%, `bre_for_fra` 0.2%, and the rest at zero — but **I could not read those languages to confirm any of it, so treat those figures as unverified screens, not measurements.** Each needs a native speaker with the same 10-row sample.
- **Only trailing padding was measured.** A phrase padded at the front or in the middle would not be detected. Extent unknown.
- Precision figures come from hand audits of 24, 24, 20 and 21 rows — not exhaustive review of all 12,341.
- A worker session was dispatched to trace the generator independently and had not reported by the time this was written; the cause analysis above is my own tracing, with file and line citations you can check.

---

*Queries used are in `scripts/bpp/` (gitignored working directory) — SQL run read-only against production Supabase via the repo's `.env.psql` connection.*
