# Premium courses still on Azure: why we missed it, the alarm, and the re-voicing plan (22 Nov, cs #470)

**Data date of every number below:** the nightly QA copy `ssi_copy_20261122t033000z` (22 Nov 03:30Z), censused 22 Nov 12:05Z with the committed `azure-census.cjs`, unchanged; library coverage from the clip_index dump of 22 Nov 11:55Z. spa_for_zho is left out: #468·AK is linking it right now (/d/fdea2585). Arabic is left out, as ruled: nobody on the team can judge those voices.

## Verdict

The spa_for_zho miss was not a one-off. **Five premium-LIVE courses are almost wholly on Azure and never appeared on any day list: eng_for_tel, eng_for_kan, eng_for_guj, eng_for_mar, eng_for_pan** (89-100% of their known slots). Three more premium-live courses were on the list but the 2.0M cap stopped them part-way: por_for_eng 57% still Azure, jpn_for_eng 49%, kor_for_eng 36%. Behind them sit 19 premium-beta courses, Spanish-target included, at 50-100% Azure.

## 1. Why we missed it: the chain

1. **The census was complete.** On 19 Nov `azure-census.cjs` counted every course, and `course-summary.json` listed every premium course with its characters, spa_for_zho and the five Indic courses included.
2. **The day lists were picked by hand.** `build-days.py` takes its courses from a hard-coded `DAYS` list. v1 (commit 73459fcba) carried eng_for_tel on day 3. v2 (b940d6de3) charged owed course fixes first, and eng_for_tel dropped off. kan, guj, mar and pan were on no version of the list, and nor was spa_for_zho. I found no recorded reason in the plan's files or commits.
3. **The cap ran out on fixes and the planned courses.** The runner stopped on 22 Nov 09:46Z at the four-day cap: 1,999,975 characters, 918,174 of them fix reservations that other jobs added to `fixes.json`. That is why por_for_eng stopped at 8,117 of 15,826 asks. jpn and kor stopped part-way too: day 1 logged 16,027 of 34,278 asks before the chain moved on.
4. **Nothing reported what was left.** `day-plan.json` lists what each day carries and never lists what no day carries. The cast resolver casts new recordings in Cartesia but never re-points existing clips. No check compares a course's served clips with its cast. The 13 Nov ruling parked the other premium courses "until you reconvene on a plan", and nothing flagged that parked meant still on Azure.

The missing system check: **nothing lists the courses in scope that no plan covers, and nothing alarms when served voice disagrees with cast.** No person made a wrong call. The plan's output format left out the one line that would have shown the gap.

## 2. The permanent alarm

**Built** (Popty branch `cs/470-azure-voice-drift-detector`, not merged): `ops/voice-casting/azure-to-cartesia/cast-drift.cjs`. It never touches the database. It reads a census file plus the clip_index dump and, for every premium course and role, reports:

- Azure slots, and their share of the course's rows
- lines free to link because the cast voice already says them in that language
- paid lines and characters, counted once across courses in run order
- roles with no Cartesia cast

Every course over the threshold (default 2%) prints `BREACH`, and one that is on no `--planned` list prints **`BREACH UNPLANNED`**. That is the line that was missing on 19 Nov. Today's run is committed as `premium-drift-2026-11-22.json`.

**Proposed, not installed:** a nightly user timer on watson-1 at 04:15Z, after the 03:30Z QA-copy restore. It would run `azure-census.cjs --courses <premium>` (about 6 minutes, read-only, QA copy), then `cast-drift.cjs --planned <the active day lists>`, and post the `BREACH UNPLANNED` lines to Watson's room through `cs-wake-send`. It stays silent when no line breaches. The alarm stops only when a course drops under 2% or is put on a plan. Two follow-ups would make it exact. First, `azure-census.cjs` should count total slots per role, so the share is not computed over rows: it is near-exact for known/target1/target2 and approximate for presentation. Second, `build-days.py` should write the unplanned list into `day-plan.json` itself.

## 3. The census: every premium course still on Azure (Arabic and spa_for_zho excluded)

"Free-link" means the words are already held in this language in the cast voice, in any course, so the library-first route links them at no cost. "Paid" means the words exist only in another voice (the Azure take at least), so they are a paid render, and every one needs a re-record grant (`EXISTS_IN_LANGUAGE`). Presentation lines are never free: intros are always rendered fresh. The table counts each course on its own; run order saves a little more, shown in the order table.

| # | course | status | role → cast | Azure slots (share) | free-link lines | paid lines / chars |
|---|---|---|---|---|---|---|
| 1 | eng_for_tel | live | known → Ramya | 13,395 (100%) | 0 | 11,745 / 412,717 |
|  |  |  | presentation → Vikram | 1,427 (11%) | 0 | 1,427 / 87,249 |
|  |  |  | target1 → Charlotte | 11 (0%) | 0 | 11 / 333 |
|  |  |  | target2 → Tom-006 | 10 (0%) | 4 | 6 / 170 |
| 2 | eng_for_kan | live | known → Chaitra | 14,229 (98%) | 0 | 12,380 / 358,667 |
|  |  |  | presentation → Chetan | 1,442 (10%) | 0 | 1,442 / 100,026 |
|  |  |  | target1 → Charlotte | 4 (0%) | 0 | 4 / 102 |
|  |  |  | target2 → Tom-006 | 4 (0%) | 1 | 3 / 75 |
| 3 | eng_for_guj | live | known → Isha | 12,494 (89%) | 1 | 11,974 / 339,568 |
|  |  |  | presentation → Isha | 1,422 (10%) | 0 | 1,422 / 96,434 |
|  |  |  | target1 → Charlotte | 5 (0%) | 0 | 5 / 123 |
|  |  |  | target2 → Tom-006 | 5 (0%) | 1 | 4 / 102 |
| 4 | eng_for_mar | live | known → Asha | 13,255 (95%) | 0 | 12,395 / 347,615 |
|  |  |  | presentation → Chinmay | 1,389 (10%) | 0 | 1,389 / 87,068 |
|  |  |  | target1 → Charlotte | 17 (0%) | 1 | 16 / 506 |
|  |  |  | target2 → Tom-006 | 15 (0%) | 5 | 10 / 322 |
| 5 | eng_for_pan | live | known → Navjot | 12,032 (91%) | 2 | 11,138 / 334,480 |
|  |  |  | presentation → Navjot | 1,261 (10%) | 0 | 1,261 / 93,779 |
|  |  |  | target1 → Charlotte | 16 (0%) | 2 | 14 / 420 |
|  |  |  | target2 → Tom-006 | 16 (0%) | 8 | 8 / 213 |
| 6 | por_for_eng | live | known → Tom-006 | 25 (0%) | 17 | 0 / 0 |
|  |  |  | target1 → Mariana | 8,695 (57%) | 65 | 7,007 / 158,241 |
|  |  |  | target2 → Matias | 8,723 (57%) | 96 | 6,989 / 157,965 |
| 7 | jpn_for_eng | live | target1 → Yuzuki - Composed Explainer | 6,586 (49%) | 146 | 4,942 / 35,279 |
|  |  |  | target2 → Kyo | 6,607 (49%) | 118 | 4,985 / 35,508 |
| 8 | kor_for_eng | live | target1 → Jihyun | 5,418 (36%) | 125 | 3,848 / 27,953 |
|  |  |  | target2 → Junho | 5,432 (36%) | 128 | 3,855 / 27,967 |
| 9 | fra_ca_for_eng | beta | known → Tom-006 | 1,775 (14%) | 1,183 | 10 / 264 |
|  |  |  | target1 → Léonie | 12,999 (100%) | 0 | 11,804 / 338,637 |
|  |  |  | target2 → Félix | 13,006 (100%) | 0 | 11,811 / 339,025 |
| 10 | spa_mx_for_eng | beta | known → Tom-006 | 1 (0%) | 0 | 1 / 28 |
|  |  |  | target1 → Daniela | 13,596 (91%) | 1 | 11,890 / 318,536 |
|  |  |  | target2 → Alejandro | 13,601 (91%) | 1 | 11,882 / 318,012 |
| 11 | kor_for_tam | beta | known → Karthik | 14,597 (100%) | 631 | 13,039 / 416,229 |
|  |  |  | presentation → Nila | 1,503 (10%) | 0 | 1,503 / 112,006 |
| 12 | spa_for_jpn | beta | known → Yuzuki - Composed Explainer | 7,787 (93%) | 120 | 7,161 / 102,889 |
|  |  |  | target1 → Maite | 7,976 (95%) | 1,260 | 6,188 / 207,829 |
|  |  |  | target2 → Thiago | 7,976 (95%) | 1,230 | 6,218 / 208,171 |
| 13 | eng_for_fra | beta | known → Inaya | 6,445 (99%) | 295 | 5,515 / 220,565 |
|  |  |  | target1 → Charlotte | 6,358 (98%) | 2,100 | 3,604 / 140,558 |
|  |  |  | target2 → Tom-006 | 4,039 (62%) | 714 | 3,142 / 127,842 |
| 14 | eng_for_ita | beta | known → Alessandra | 6,128 (99%) | 1,038 | 4,577 / 187,332 |
|  |  |  | target1 → Charlotte | 6,098 (98%) | 2,014 | 3,568 / 149,363 |
|  |  |  | target2 → Tom-006 | 4,072 (66%) | 722 | 3,196 / 140,020 |
| 15 | eng_for_por | beta | known → Mariana | 6,340 (99%) | 475 | 5,271 / 192,094 |
|  |  |  | target1 → Charlotte | 6,268 (97%) | 2,047 | 3,622 / 145,307 |
|  |  |  | target2 → Tom-006 | 4,089 (64%) | 694 | 3,231 / 135,687 |
| 16 | eng_for_deu | beta | known → Viktoria | 6,164 (99%) | 285 | 5,227 / 198,913 |
|  |  |  | target1 → Charlotte | 6,125 (98%) | 2,105 | 3,352 / 118,100 |
|  |  |  | target2 → Tom-006 | 3,829 (61%) | 758 | 2,843 / 105,222 |
| 17 | zho_for_tam | beta | known → Karthik | 11,864 (100%) | 574 | 9,900 / 332,764 |
|  |  |  | presentation → Nila | 1,161 (10%) | 0 | 1,161 / 79,492 |
|  |  |  | target1 → Shuwen | 1 (0%) | 0 | 1 / 6 |
|  |  |  | target2 → Hao | 1 (0%) | 0 | 1 / 6 |
| 18 | fra_for_jpn | beta | known → Yuzuki - Composed Explainer | 6,145 (94%) | 90 | 5,225 / 64,966 |
|  |  |  | target1 → Inaya | 6,162 (94%) | 395 | 5,012 / 154,473 |
|  |  |  | target2 → Erwan | 6,162 (94%) | 410 | 4,997 / 153,992 |
| 19 | eng_for_spa | beta | known → Maite | 6,062 (89%) | 953 | 4,311 / 141,912 |
|  |  |  | target1 → Charlotte | 6,097 (90%) | 1,785 | 3,461 / 119,883 |
|  |  |  | target2 → Tom-006 | 3,767 (55%) | 550 | 2,982 / 108,666 |
| 20 | por_br_for_eng | beta | target1 → Ana Paula | 8,192 (52%) | 7 | 6,454 / 175,557 |
|  |  |  | target2 → Rafael | 8,175 (51%) | 16 | 6,426 / 174,485 |
| 21 | ita_for_jpn | beta | known → Yuzuki - Composed Explainer | 5,498 (92%) | 102 | 4,832 / 64,638 |
|  |  |  | target1 → Alessandra | 5,603 (93%) | 1,081 | 4,009 / 131,593 |
|  |  |  | target2 → Lorenzo | 5,603 (93%) | 1,065 | 4,025 / 132,016 |
| 22 | fra_for_zho | beta | known → Shuwen | 5,128 (89%) | 615 | 3,710 / 28,618 |
|  |  |  | target1 → Inaya | 5,415 (94%) | 293 | 4,458 / 140,895 |
|  |  |  | target2 → Erwan | 5,415 (94%) | 305 | 4,446 / 140,437 |
| 23 | deu_for_zho | beta | known → Shuwen | 5,759 (91%) | 682 | 4,032 / 29,811 |
|  |  |  | target1 → Viktoria | 5,980 (94%) | 398 | 4,789 / 136,991 |
|  |  |  | target2 → Nico | 5,980 (94%) | 396 | 4,791 / 137,026 |
| 24 | deu_for_jpn | beta | known → Yuzuki - Composed Explainer | 5,273 (90%) | 106 | 4,410 / 49,173 |
|  |  |  | target1 → Viktoria | 5,480 (93%) | 370 | 4,379 / 121,253 |
|  |  |  | target2 → Nico | 5,481 (93%) | 372 | 4,378 / 121,220 |
| 25 | eng_for_kor | beta | known → Jihyun | 5,763 (99%) | 109 | 4,864 / 79,499 |
|  |  |  | target1 → Charlotte | 5,769 (99%) | 1,937 | 3,142 / 105,385 |
|  |  |  | target2 → Tom-006 | 3,378 (58%) | 653 | 2,526 / 89,763 |
| 26 | ita_for_zho | beta | known → Shuwen | 5,288 (91%) | 586 | 4,178 / 33,813 |
|  |  |  | target1 → Alessandra | 5,469 (94%) | 1,113 | 3,982 / 115,842 |
|  |  |  | target2 → Lorenzo | 5,470 (94%) | 1,096 | 4,000 / 116,418 |
| 27 | deu_at_for_eng | beta | known → Tom-006 | 7,096 (52%) | 440 | 6,528 / 169,378 |
| 28 | eng_for_jpn | beta | known → Yuzuki - Composed Explainer | 10,287 (92%) | 70 | 8,786 / 146,585 |
| 29 | zho_for_jpn | beta | known → Yuzuki - Composed Explainer | 4,960 (98%) | 303 | 4,285 / 51,601 |
|  |  |  | target1 → Shuwen | 5,009 (99%) | 1,099 | 3,413 / 25,824 |
|  |  |  | target2 → Hao | 5,010 (99%) | 1,096 | 3,417 / 25,855 |
| 30 | eng_for_zho | beta | known → Shuwen | 5,519 (98%) | 501 | 4,446 / 45,014 |
| 31 | zho_for_gle | beta | target1 → Shuwen | 133 (100%) | 124 | 2 / 12 |
|  |  |  | target2 → Hao | 133 (100%) | 124 | 2 / 12 |
| 32 | deu_ch_for_eng | not_available | known → Tom-006 | 2,862 (21%) | 1,010 | 1,465 / 41,524 |
|  |  |  | target1 → Vreni | 1,784 (13%) | 0 | 1,498 / 39,059 |


**Reuse is low, as it was for spa_for_zho.** Tom's "same clips as Spanish for English, largely" holds only for the free-link column. Across the 23 premium-beta courses, 37,489 lines are free to link and about 262k are new. Spanish-known courses are a case in point: eng_for_spa links 3,288 of its ~14k lines from Maite's existing clips. Cross-known practice phrases were written separately, so their words seldom match. spa_mx_for_eng is the extreme: 2 free lines, because Mexican Spanish is keyed as its own language and no Castilian clip counts for it (#394).

### Roles with no Cartesia cast: gaps, not plan items

| course | status | role | cast today | slots | chars |
|---|---|---|---|---|---|
| eng_for_urd | live | known | azure:Uzma | 12,100 | 297,545 |
| eng_for_urd | live | presentation | azure:Uzma | 1,152 | 68,104 |
| fra_ca_for_eng | beta | presentation | azure:Sonia | 503 | 34,865 |
| spa_for_jpn | beta | presentation | azure:Shiori | 610 | 17,037 |
| eng_for_fra | beta | presentation | azure:Celeste | 639 | 55,650 |
| eng_for_ita | beta | presentation | azure:Elsa | 596 | 46,914 |
| eng_for_por | beta | presentation | azure:Raquel | 614 | 46,788 |
| eng_for_deu | beta | presentation | azure:Katja | 604 | 48,524 |
| fra_for_jpn | beta | presentation | azure:Shiori | 662 | 19,465 |
| eng_for_spa | beta | presentation | azure:Elena | 602 | 41,251 |
| ita_for_jpn | beta | presentation | azure:Shiori | 567 | 15,877 |
| fra_for_zho | beta | presentation | azure:Xiaochen | 572 | 12,238 |
| deu_for_zho | beta | presentation | azure:Xiaochen | 608 | 13,025 |
| deu_for_jpn | beta | presentation | azure:Shiori | 619 | 14,725 |
| eng_for_kor | beta | presentation | azure:Sun-Hi | 545 | 19,910 |
| ita_for_zho | beta | presentation | azure:Xiaochen | 592 | 13,979 |
| eng_for_jpn | beta | presentation | azure:Mayu | 677 | 11,071 |
| zho_for_jpn | beta | presentation | azure:Shiori | 454 | 9,787 |
| eng_for_zho | beta | presentation | azure:Xiaochen | 502 | 12,058 |
| eng_for_sin | beta | known | azure:Sameera | 12,383 | 293,465 |
| eng_for_sin | beta | presentation | azure:Thilini | 1,241 | 84,242 |
| zho_for_gle | beta | known | azure:Orla | 133 | 4,172 |
| zho_for_gle | beta | presentation | azure:Colm | 15 | 534 |
| deu_ch_for_eng | not_available | target2 | elevenlabs:Swiss German male (ElevenLabs vTifwvQGTZT1q7epCu2b) | 404 | 9,715 |

These are presentation intros for French, Italian, Portuguese, German, Spanish, Japanese, Korean and Chinese known speakers, still cast to Azure presenters. Chinese presentation stays on Xiaochen, as ruled. The others are casting questions, not renders: a Cartesia French or Japanese voice exists, but no presenter is cast. eng_for_urd and eng_for_sin known roles have no Cartesia Urdu or Sinhala voice at all.

**Arabic, excluded as ruled:** ara_for_eng (808k), eng_for_ara known (155k), and the Tom-006 English known prompts of ara_lb_for_eng and ara_eg_for_eng (75k and 69k). Those English prompts could be re-voiced without judging Arabic, but I left them out to follow the ruling. Say if you want them in.

**Already clean** (under 2%): spa_for_eng, ita_for_eng, zho_for_eng, eng_for_hin, eng_for_ben, eng_for_tam (207 slots left, all free to link), eng_for_urd's Cartesia roles, fra_for_eng, deu_for_eng, eng_for_sin's Cartesia roles, kor_for_hin, por_for_jpn.

## 4. The plan

**Order.** Premium-live first, then premium-beta with Spanish-target first, then the rest of beta by size. I could not rank by learner activity. No committed tool gives per-course active learners, and the surface's telemetry pulse is not per course, so this order uses live versus beta and size. Within premium-live, I put the five Indic courses ahead of finishing por, jpn and kor because they are about 95% Azure against 36-57%. A learner there hears Azure on almost every prompt, where por, jpn and kor learners are already mostly on Cartesia.

| step | courses | paid lines | paid chars (in run order) | free links |
|---|---|---|---|---|
| A. premium-live Indic five | eng_for_tel, kan, guj, mar, pan | 65,104 | 2,198,615 | 25 |
| B. finish premium-live | por_for_eng, jpn_for_eng, kor_for_eng | 31,583 | 442,611 | 695 |
| C. premium-beta, Spanish target | spa_mx_for_eng, spa_for_jpn (spa_for_zho: #468·AK's 10,849 gap lines, ~236k) | 42,629 | 1,136,296 | 2,612 |
| D. rest of premium-beta, by size | fra_ca_for_eng, kor_for_tam, eng_for_fra/ita/por/deu/spa, zho_for_tam, fra_for_jpn, por_br_for_eng, ita_for_jpn, fra_for_zho, deu_for_zho, deu_for_jpn, eng_for_kor, ita_for_zho, deu_at_for_eng, eng_for_jpn, zho_for_jpn, eng_for_zho, zho_for_gle | 219,760 | 6,298,338 | 34,877 |

**Free links first, always.** Run `run-day.cjs --library-only` over each course before any paid list. #468·AK built and ran it for spa_for_zho. It costs nothing, needs no grant, and clears roughly 38k lines across these courses.

**Cap and credit timing** (`node tools/tts-cap.cjs status`, 22 Nov):
- Cartesia cycle: 6,809,814 of 8,000,000 used, so 1,190,186 left as of the 03:29Z ledger. Today shows 110,331 spent. The pool **resets 23 Nov 00:00Z** (cycleStartDay 23), so roughly **1.1M characters go unused tonight** whatever we do. Overage is allowed at about $38 per million characters, and passing 8M only sends Watson a notice.
- The daily cap is 1,000,000 characters across all providers. Tom alone may raise it, never past 3,000,000.
- **Pace binds, not the cap.** The runner sends one ask at a time at about 4.6 s per paid render, which comes to about 14k asks a day. At Indic line lengths that is about 0.45M characters a day, well under the 1M cap.
- Days needed: A about 5 days, B about 2.5, C about 3 (plus spa_for_zho's gap, about 1), D about 16. **Premium-live (A+B) needs about 7.5 days and 2.64M characters.** All four steps, with spa_for_zho's gap, come to about 10.3M characters over about 26 days: one cycle, 23 Nov to 22 Dec, plus about 2.3M of overage, roughly $90.
- If a grant landed in the next hour, step A could use about 0.3M of tonight's expiring credit, about 8k asks before midnight. The rest of tonight's credit is lost either way.

**Re-record grants needed**, one per course, all roles listed, filed only from your Watson:
- A: one grant each for eng_for_tel, kan, guj, mar and pan, covering known, presentation, target1 and target2
- B: one each for por_for_eng, jpn_for_eng and kor_for_eng, covering target1 and target2
- C: one each for spa_mx_for_eng (target1, target2) and spa_for_jpn (known, target1, target2)
- D: one per course, with the roles in the order table below

Kai's `kai:` approval token is the other door the guard accepts.

**Blockers checked.**
- The Popty commit "Pause unattended TTS services" (6a9f6c998) is dated **13 Oct**, not new. It paused the phase-8 and orchestrator services, and the 19-22 Nov runs went through the render route after it, so it does not block `run-day.cjs`.
- The shared Popty checkout at `~/SSi/ssi-dashboard-v7-clean` sits detached at that 13 Oct commit with untracked files. I worked in my own worktree and left it alone.
- `run-day.cjs` needs a day list per step. `build-days.py`'s `DAYS` would gain days 7+ for steps A to D, plus `--approver tom --cap`, as #468·AK did for day 5.

### Order table, every course (paid after free links and earlier courses in this order)

| course | status | paid lines | paid chars | grant roles |
|---|---|---|---|---|
| eng_for_tel | live | 12,791 | 483,683 |  known presentation target1 target2 |
| eng_for_kan | live | 13,549 | 448,018 |  known presentation target1 target2 |
| eng_for_guj | live | 12,970 | 419,885 |  known presentation target1 target2 |
| eng_for_mar | live | 13,373 | 418,137 |  known presentation target1 target2 |
| eng_for_pan | live | 12,421 | 428,892 |  known presentation target1 target2 |
| por_for_eng | live | 13,996 | 316,206 |  target1 target2 |
| jpn_for_eng | live | 9,884 | 70,485 |  target1 target2 |
| kor_for_eng | live | 7,703 | 55,920 |  target1 target2 |
| fra_ca_for_eng | beta | 22,439 | 627,354 |  known target1 target2 |
| spa_mx_for_eng | beta | 23,533 | 627,566 |  target1 target2 known |
| kor_for_tam | beta | 14,257 | 513,025 |  known presentation |
| spa_for_jpn | beta | 19,096 | 508,730 |  known target1 target2 |
| eng_for_fra | beta | 12,045 | 479,819 |  known target1 target2 |
| eng_for_ita | beta | 10,868 | 459,299 |  known target1 target2 |
| eng_for_por | beta | 11,083 | 441,441 |  known target1 target2 |
| eng_for_deu | beta | 10,555 | 391,643 |  known target1 target2 |
| zho_for_tam | beta | 10,539 | 394,683 |  known presentation target1 target2 |
| fra_for_jpn | beta | 13,445 | 330,524 |  known target1 target2 |
| eng_for_spa | beta | 9,771 | 340,557 |  target1 known target2 |
| por_br_for_eng | beta | 12,838 | 348,423 |  target1 target2 |
| ita_for_jpn | beta | 11,343 | 298,905 |  known target1 target2 |
| fra_for_zho | beta | 10,486 | 247,413 |  known target1 target2 |
| deu_for_zho | beta | 12,505 | 284,611 |  target1 target2 known |
| deu_for_jpn | beta | 9,943 | 228,191 |  known target1 target2 |
| eng_for_kor | beta | 9,516 | 245,868 |  known target1 target2 |
| ita_for_zho | beta | 10,499 | 233,257 |  known target1 target2 |
| deu_at_for_eng | beta | 6,445 | 167,245 |  known |
| eng_for_jpn | beta | 7,620 | 134,599 |  known |
| zho_for_jpn | beta | 9,392 | 88,059 |  known target1 target2 |
| eng_for_zho | beta | 4,168 | 43,402 |  known |
| zho_for_gle | beta | 3 | 20 |  target1 target2 |
| deu_ch_for_eng | not_available | 2,789 | 74,708 |  target1 known |

## Recommendation (Y/N)

**Step A: grant re-records for the five premium-live Indic courses (all roles) and run them free-links-first, then paid, at about 14k asks a day from tonight: about 2.2M Cartesia characters over about 5 days.**

Do it now and about 0.3M of tonight's expiring credit counts. B follows straight on with three more grants, and C and D come back to you as separate Y/Ns. Tom's intro idea, cutting "The English for…" and splicing "The Spanish for…", does not apply to step A: these are English-target courses. It would come up again in step C for spa_for_jpn.
