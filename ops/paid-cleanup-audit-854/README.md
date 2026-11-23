# Paid-course scans: status, story and plan for all courses (23 Nov 2026)

cs #854 for Kai. Read-only audit: nothing was applied, armed, rendered or merged.

**How status was decided.** I used the appliers' own night ledgers in `~/.cs-long/*/night-*.log` (event id per batch, counts of applied, drift and refused), the ops/ directories and commits on Popty `origin/main` (fetched 23 Nov 14:58Z), whether each worker branch is merged, `systemctl --user` timers and units, and the surface's job records. Where Kai's memory notes disagree with these, the live record wins, and I say so.

**Not re-read per row on the live database.** At ~15:15Z one of my reads (`GET audio-pipeline/missing` for eng_for_pan) went out while the load gate read red. My script printed the gate but did not check it. I stopped it by hand within two minutes and made no further live course reads. So "silent slot" counts below come from apply answers and records, not from a fresh live count. Each one is marked **(unverified live)**.

Status words: **APPLIED** (date + event or ledger), **QUEUED** (which run and when), **HELD** (why and who it waits on), **DROPPED** (who decided), **LIMBO** (none of these: nobody owns the next step).

---

## 1. LIMBO: nobody owns the next step (read this first)

| # | family | courses | what is stuck | evidence | what would unstick it |
|---|---|---|---|---|---|
| L1 | **Item 5 broken English: audio never filled** | ~16 (eng_for_tam, eng_for_sin, eng_for_zho, eng_for_kan, eng_for_ben, eng_for_jpn, eng_for_ita, eng_for_deu, eng_for_fra, eng_for_spa, eng_for_por, eng_for_tel, ara_for_eng, ara_lb_for_eng, fra_ca, + spa/por/deu) | The text was applied on 18 Nov. When the text changes, the edit door clears or re-points each row's clip. The audio fill `cs-long-item5-fill` was stopped 28 s after it started (18 Nov 14:22Z). Its resume, #783·AI, was cancelled in the 19:54Z DB incident and never replaced. The fill ledger covers only 30 slots in 4 courses (455 chars). The apply answers show hundreds of null audio slots after the edit (eng_for_tam alone ~136). **Likely silent rows (unverified live)** | events 25333502 (tam), 62f3dae2 (sin), 42022743 (zho), 7034b415 (kan), 2def1baf (ben), af5f3a24 (jpn), dc301ce0 (ita), bbc963ec, 8f5371b1, 51295689, 2c57b6aa, 3e3ecf26, 10befb30, 39fe3642, 40285063; ledger `ops/paid-cleanup-item5/audio-ledger.json`; records only on **unmerged** `cs/727-resume-701-item5-broken-english` (7 commits) | Count silent slots for these events on the QA copy, then a library-first night fill through `/api/audio/render` (Kai token; small) |
| L2 | **Item 6 wrong target form: two courses never done** | kor_for_tam (86 rows, plain 나/내 in a polite 저/제 course), kor_for_hin (17) | #703·AI applied 13 courses, then was cancelled at the 19:54Z incident before these two. Never replaced | plan builders and plan in `cs/703-paid-cleanup-item-6-wrong-target`, **unmerged** (10 commits, incl. all item-6 apply records) | Land cs/703's records to main; re-plan the two courses on the copy for one night writer |
| L3 | **Item 4 filler: two courses never planned** | por_for_eng (205 rows), eng_for_sin (201) | No plan and no directory in `ops/paid-cleanup-item4/`. Only por_br, mar and the 16-row group were done | `git ls-tree ops/paid-cleanup-item4` | Plan on the copy. eng_for_sin's 185 template rows were called "safe to delete now" in D1 |
| L4 | **Item 1 silent prompts: pan/guj** | eng_for_pan (615 rows), eng_for_guj (199) | Held until D3. D3 was settled on 18–19 Nov (two known voices; pan/urd cast written 19 Nov, f5f1c367d), but no job filled them afterwards. **Count unverified live** | #694 record "pan and guj were not touched (D3)"; d/c1c6739e | Count on the copy; fill in the new cast voices, library first |
| L5 | **Item 8 female voice reading male forms** | spa_mx, fra_ca, por_br, ara_for_eng (8A); pan/urd/guj (8B) | 8A #709·AI was cancelled by the 30-minute watcher on 18 Nov. 8B #710·AI was cancelled 18 Nov (its branch is unmerged). Since then only 8 spa_mx clips were re-recorded (#984, cadb0d3b0). Since 19 Nov (35080b712) the render route speaks the gender form for NEW clips, but old clips are unchanged. The pan/urd male re-record was never priced | job records #709·AI, #710·AI; `cs/710-…` unmerged | Kai Y/N on an ear sample of ~10 per course (the 16 Nov method), then a priced plan |
| L6 | **Item 10 LEGO says what its seed does not** | 37 courses in the scan | Only zho_for_eng and zho_for_jpn have plans. zho 37–450 and 451–663 **fail the validator** (57 and 58 seeds). zho_for_jpn dry runs are partial. No other course was started. #808·AI's branch is unmerged. Nothing has moved since 19 Nov | `ops/paid-cleanup-scan-447/item10/QUEUE.md` | Kai picks a first course; planning on the copy-only kit; dry runs at night, `--chunk 10` |
| L7 | **Item 11 basket does not drill its LEGO** | deu, fra, spa_mx, ara ×3, eng_for_tam planned; ~25 others not | Plans from #805 and #806 sit on **unmerged** branches (6 and 9 commits). #784·AI was cancelled. Nothing queued | `cs/805-plan-item-11-shard-a-romance-ger`, `cs/806-plan-item-11-shard-b-arabic-asia` | Land the plans; re-validate on today's copy; Kai Y/N |
| L8 | **Item 13 one prompt, two answers (LEGO level)** | 28 courses, 102 rows | #784·AI decided about half before it was cancelled. Its branch is **unmerged** (10 commits) | `cs/784-plan-items-11-13-17-19-dup-legos` | Land it; finish the decisions; Kai Y/N |
| L9 | **Item 17 gapped LEGOs** | 12 courses, 44 | Dry runs done by #784, on the same unmerged branch | same | same |
| L10 | **Item 19 LEGOs over 8 syllables** | 29 courses, 467 | 3 courses planned (eng_for_ita/spa/fra). One changeset (eng_for_ita, 33 ops) passes `--check` and was never queued | `ops/paid-cleanup-scan-447/plan-11-13-17-19/item19/plans/` | Kai Y on eng_for_ita as the first night changeset |
| L11 | **Item 15 formal LEGOs without sir/madam** | ita, fra_ca, deu, deu_at, deu_ch (86–89 rows) | #914·AI wrote "Held" (needs rewording and audio), but no question went to Kai and there is no owner | `ops/paid-cleanup-717/README.md` (#914 section) | Ask Kai one Y/N with the fin #846 precedent |
| L12 | **D1: eng_for_sin seeds ~345–668 rebuild** | eng_for_sin | Never asked ("NOT YET ASKED" in the 18 Nov handover). eng_for_sin's 188 item-12 rows were held whole waiting on it | combined list D1; #957 SPOTCHECK | Put the D1 Y/N to Kai |
| L13 | **D2 smaller reads: eng_for_kor (해요 statement/question) and eng_for_zho seeds 60–80** | 2 | Never commissioned (eng_for_jpn's D2 is tonight) | combined list D2 | Kai Y/N |
| L14 | **Wave 2: never hand-read** | spa/fra/deu/ita _for_jpn and _for_zho (8 paid courses); ara_sy_for_eng could not be read | Machine candidate counts only. "Still a gap" since 17 Nov | `partition.md`, FIX-LIST.head.md | First nights of part C below |
| L15 | **Item 12 refusals** | eng_for_deu 6, eng_for_hin 6, fra_for_eng 2, eng_for_ben 1 | 15 ops refused on 19–20 Nov (a clip says "?" text, a clip spoken differently, an insert already existed, 1 statement timeout). No follow-up found | `~/.cs-long/item12/night-20261119.log` | Re-plan the 15 on the copy |
| L16 | **Item 4 eng_for_mar 10 rows set aside** | eng_for_mar | Drift: seed 108 was changed by C0108 after the plan. No re-plan | afa3f2cf0; night log 22 Nov | Re-plan the 10 against the new seed 108 |
| L17 | **Small set-asides** | eng_for_tam (item 9 5-thin, 1 drift op); zho_for_eng S0129L01 (needs a lego.insert) and S0413L02 "lean" (no fix settled) | No owner | item9 night log 19 Nov; #431 record | Fold into the next tam / zho night writer |
| L18 | **No audio pass gets queued (whole process)** | every content pass since 18 Nov | `tools/course-optimization/queue-audio-pass.cjs` is refused by the DB guard (it uses Supabase REST), and Popty has no route that queues one. So the CLAUDE.md rule "a content pass ends by queueing an audio pass" cannot be followed | `ops/sister-propagation/record-840.md`, `ara_lb_for_eng/record.md` | A Popty route (or a pg port) for queueing; a tooling job, not content |
| L19 | **Records stranded on unmerged branches** | — | Apply records and plans exist only on: cs/482 (1 commit), cs/701 (3), cs/703 (10), cs/710 (2), cs/717 (2), cs/727 (7), cs/784 (10), cs/805 (6), cs/806 (9), cs/808 (11). Nothing to apply; the risk is that the record is lost | `git merge-base --is-ancestor` on each | One landing job that merges the ops/ records only |
| L20 | **jpn held items above seed 300** | jpn_for_eng (20 of 33 real; the polite block 642–667 is biggest) | No decision. #421 recommended finishing the #248 rebuild. Low impact: #421 says jpn is capped at seed 300 for learners (I did not re-check `courseBoundary.ts`) | d/71221f73 | Kai: rebuild later, or drop while the cap stands |

**Memory notes that live state contradicts** (live wins):
- "Item 9 night changesets: PR #143 NOT merged" and "PR #145 unmerged". **Both were merged on 19 Nov** (12:31Z / 12:35Z). The night runner applied 1,187 ops on 19 Nov, filled the audio on 20 Nov, logged "ITEM9 ALL DONE" and removed its own timer.
- "Sister-course propagation: por_br + spa_mx A priced" (left open). **Applied on 21 Nov by #840·AJ** (spa_mx C/I/S/A, por_br, deu_ch); `ops/sister-propagation/record-840.md`.
- "Item 12 changesets on branch cs/914 (not merged)". They were merged and **applied on 19–20 Nov** (16,445 ops), and the timer disabled itself ("ITEM12 ALL DONE").

---

## 2. Every family: status from live state

### The #482 combined list (d/23c5a220), items 1–20 and D1–D3

| item | family | status | evidence | waiting on |
|---|---|---|---|---|
| 1 | silent slots | **APPLIED** in bulk 18 Nov: #694 (974 slots), #704 (84), #712 / #705 (tel/mar 846). Remainder: **LIMBO** L4 (pan/guj), **HELD** 69 EXISTS_IN_LANGUAGE + 15 ara_eg/lb other-voice slots | d/c1c6739e, d/77b3cebc, d/1bc2f2de; d9f242250, 25c3e6db5 | Kai: re-record token for the 69, ara hold |
| 2 | zho "last time" taught twice | **APPLIED** 18 Nov, ev d9b6ac2b (S0572L02 not-new) | 079f28888 | — |
| 3 | prompt ≠ answer | **APPLIED** 18 Nov (#699/#726): eng_for_jpn 1–73 (events d162e0ae…fbe24936), eng_for_kor 59 rows ev 72e7dfeb, eng_for_zho 25 ev f7407af6/e223e1be, eng_for_urd ev c224b3f6, zho_for_jpn ev 008aab94, eng_for_ara ev 434e9d44. Gate held kor 17 bare-LEGO and jpn ~127. **QUEUED**: jpn seeds 74–300 = tonight's item 2 | commits 0fc67a4f6…5f5c0ec0e; `ops/overnight-785/item2-jpn-d2/plans/READY.txt` (18 files) | #789·AK, 22:00Z |
| 4 | filler rows | **APPLIED**: por_br in full (18 Nov + night of 22 Nov 309/309), eng_for_mar 2,082 (22 Nov night), 16 rows in pan/urd/kan/tam/tel/zho (#700, 18 Nov). **QUEUED**: 12,034 audio slots still unanswered at 07:00Z 23 Nov; timer `cs-long-keep-item4-358` fires 22:05Z tonight (cap 420k). Until then those rows are live and silent. **LIMBO**: L3, L16 | `~/.cs-long/item4-358/night-20261122.log`; afa3f2cf0 | timer |
| 5 | broken English | text **APPLIED** 18 Nov (events in L1); audio **LIMBO** L1. Seed 108 went to C0108 (applied) | cs/727 branch | — |
| 6 | wrong target form | **APPLIED** 18 Nov in 13 courses: por ev 8835ee1a, ara a7969c81, ara_eg fb313314, ita 5dfb2183, spa 0a68f7ca, fra 2888b6a1/8aa12dfe, zho_for_jpn 39c9cadf, deu_ch 32194c13, eng_for_hin dd8d2a1a, jpn 22a358e9. **LIMBO** L2 | cs/703 (unmerged) | — |
| 7 | fixed in main, never carried to sister | **APPLIED**: deu 55 rows (incl. the 8 #435 fixes), fra_ca, ara_lb fun→مسلّي, zho_for_jpn/hin/eng/tam, deu_at offers (18 Nov, #698/#702), spa_mx 102 ops (#695), spa_mx C/I/S/A + por_br + deu_ch (21 Nov, #840·AJ). **HELD**: spa_mx 2 rows GENDER_PREP_MISSING; deu_at seed 383 (male voice uncast) | `ops/sister-propagation/*/record.md`, record-840.md; d4ea2d39f | voice cast |
| 8 | female voice, male form | **LIMBO** L5 (D3 part decided and applied, see D3) | — | — |
| 9 | untaught words | **APPLIED** 19 Nov night (1,187 ops, 1 drift), audio 20 Nov; "ITEM9 ALL DONE". Back-fill for the thinned baskets = tonight's #785 item 7: **HELD** (17 changesets, 546 rows, ≈44.5k chars gross, NOT applied, no timer) | `~/.cs-long/item9/night-2026111{9,20}.log`; `ops/overnight-785/item7-backfill/README.md` | Kai Y |
| 10 | LEGO ≠ seed | **LIMBO** L6 | QUEUE.md | — |
| 11 | basket does not drill its LEGO | **LIMBO** L7 | — | — |
| 12 | seed sentence never said | **APPLIED** 19–20 Nov, 16,445 ops in 47 courses (15 refused, L15); #964 held seeds fixed live; #976 follow-up. Duplicate census (#785 item 8): 0 exact twins, **1,259 same target under another prompt**, 4 cross-basket: **HELD** for Kai's ruling. eng_for_sin 188 held → L12 | `~/.cs-long/item12/night-20261119.log`; `ops/overnight-785/item8-census/README.md` | Kai |
| 13 | one prompt, two answers | **LIMBO** L8 | — | — |
| 14 | question on one side only | **HELD**: plan d/6e9f4b92 (2,881 rows on the copy, ≈1,263 real) | `ops/overnight-785/item9-plans/README.md` | Kai Y/N |
| 15 | formal without sir/madam | **LIMBO** L11 | — | — |
| 16 | NEW flag wrong | **HELD**: plan d/ed89648a (652 LEGOs) | same | Kai Y/N |
| 17 | gapped LEGOs | **LIMBO** L9 | — | — |
| 18 | same row twice in one basket | **HELD**: plan d/d58f19f3 (3,761 rows) | same | Kai Y/N |
| 19 | over 8 syllables | **LIMBO** L10 | — | — |
| 20 | thin Indic baskets | **APPLIED** 21 Nov (#79·AJ): 3,439/3,439 rows, all 10,317 slots voiced | d/275d604e; 14639deda | — |
| D1 | eng_for_sin rebuild | **LIMBO** L12 | — | — |
| D2 | eng_for_jpn full known read | **QUEUED** for 74–300 tonight (item 2). The smaller kor/zho reads are **LIMBO** L13 | — | #789·AK |
| D3 | pan/guj/urd prompt voice gender | **APPLIED** 19 Nov: two known voices per gender (pan Gurpreet/Navjot, urd Asad/Uzma; guj already Amit/Isha) | f5f1c367d | — |

### Per-language held-item re-checks

| family | status | evidence | waiting on |
|---|---|---|---|
| kor_for_eng (#420·AI, d/c38294a1) | **APPLIED** in part: #432 31/34 (17 Nov), #484 seeds 633/656/662/664. Remainder **QUEUED** = tonight's item 4 (incl. S0082L01 dup rows) | `ops/kor-held-432`, `ops/kor-held-484` | #789·AK |
| jpn_for_eng (#421, d/71221f73) | ≤ seed 300 (13 items) **QUEUED** = tonight's item 6; > seed 300 **LIMBO** L20 | `ops/overnight-785/item6-jpn-small/` | #789·AK |
| deu_for_eng (#422, d/af093f03) | **APPLIED**: #440 (4 events 432c1bc7, 87f5a1ba, 52c4068d, 6ba4306b), #519 (7), #690 (last 3). The #468 scan slice was folded into items 7/9/11 | cf00ac594; Kai memory | — |
| por_br (#423, d/86cf198f) | **QUEUED** = tonight's item 3 (incl. "fala isso"); seeds 49 and 72 **HELD** | child-A brief | #789·AK; Kai for 49/72 |
| zho_for_eng (#425, d/58d93baf) | **APPLIED**: #431 (25/26), #449 (58 slots), #451 (1 intro). 643/659 **HELD** (reverted ev 76ac6e61, Tom's plate A-186). S0129L01 / S0413L02 **LIMBO** L17 | `ops/zho-held-431`; 9deac985b | Tom (A-186) |
| fra_for_eng (#424, d/b6a2a5d7) | **APPLIED** 22 Nov by cs #233 (events d655550a, 57d7d95a, d21ac482, b52c13e6, 99b12aca, dc10188d…06f823cc, 4ddadb3c). bouger/heureuse LEGO deletes + capitals (352 phrases, 191 seeds) **HELD** | b700e1457; d/2ee55fbd | Kai Y/N |
| por_for_eng (#426, d/f1e11f9f) | **QUEUED** = tonight's item 5 | child-A brief | #789·AK |
| ita_for_eng (#427 → #435, #439, #930, #942) | **APPLIED**: #435 ev 70c35c08, #439 ev 50113304, own-LEGO #420·AK 82 ops night 22 Nov (ev ec216c61, da120203, 9de2147e, e315d139). Stale word tiles (1,858 ita + 215 jpn) **HELD** | 73c7ec80c; `~/.cs-long/ita420/`; d/c4220fd2 | Kai Y/N (since 19 Nov) |
| spa_for_eng (#441, #442, #443) | **APPLIED**: #441 S0027 ev fbe34cb6, #442 6 events. "practicar hablando" (#443, 152 rows) **HELD** | d47a020d6; d/34783671 | Kai: seed 5 option B or A (since 17 Nov) |

### Other families tied to the scans

| family | status | evidence | waiting on |
|---|---|---|---|
| C0108 hope→expect (#374·AI, #381–#383) | **APPLIED** 22–23 Nov: 1,169/1,170 ops in 80 courses. **HELD**: ell S0108L01 re-cut; 275 slots silent because the target voice is uncast; 30 intros refused; nan 10 ops refused on 23 Nov; cor parked; eus/yor 'hope' outside the plan | 3c571b96f; `~/.cs-long/c0108-374/`; d/bfb0419b | voice cast; Kai |
| Indic sister propagation (#697·AI) | **DROPPED / superseded**: the urd tranche was a dry run only; item 20 then rebuilt all five courses (applied 21 Nov). urd S0182L01 re-gloss flagged only | `ops/sister-propagation/indic/record.md` | — |
| Item 12 S0450 mismos/mesmos (target side) | **DROPPED** by Kai (HOLD 19 Nov 12:20Z, English-only ruling 12:25Z); undone by #964 | 881da8987, c6657fdae | — |
| #976 follow-ups | eng_for_tam S0103L04 + 2 deu intros **HELD** (uncast voices) | 9f0d870b1 | voice cast |
| tel / mar known prompts | **APPLIED** (Azure, provisional cast). The tel Cartesia re-voice runs tonight (`cs-long-keep-785-tel`, until ~06:55Z) | b9f2e87e8 | — |

**Included / excluded.** pdc (Doug's words, #770·AK/#777·AK), fry and gle_v2 are **not** part of the paid scans: their target languages are not in the app's paid Big-10 (`partition.md`). I left them out of the counts. They appear above only where C0108 touched them (pdc's 41 human-voiced slots, fry's 22 Auke re-takes).

---

## 3. The process story (for Kai)

**What the scan looked for.** On 17 Nov #447·AI built a catalogue of 17 mechanical detectors (`detect.cjs`) plus lexical regexes, each checked against a known real defect before use (`ops/paid-cleanup-scan-447/patterns.md`). The detectors covered: ZUT at LEGO / seed / USE level; LEGO not in its seed; words used before they are taught; gapped LEGOs; not-new LEGOs never taught; pairs taught as NEW twice; LEGOs over 8 syllables; rows without their LEGO; 'the X' rows under 'a X' LEGOs; duplicate rows; empty audio slots; LEGOs with no practice; seed sentences never played; brackets and labels in the text; a "?" on one side only; known text the same as target text. The lexical regexes were seeded only for Spanish and English and mined per language by each slice worker. Female-voice errors, clips that don't match their text, intro wording and naturalness had **no trustworthy detector** and were read by hand or listed as gaps.

**Who read it.** Detector output is only a candidate. Thirteen slice workers hand-read the candidates for 46 courses (#453–455, #467–476; `partition.md`). The 8 wave-2 courses were never dispatched (L14). #482·AI folded the reports into 20 fix families plus three decisions, and re-checked five things against live (d/23c5a220).

**How well each detector did.** These are hand-confirmed findings divided by candidates, from `candidate-counts-2026-11-17.txt` (50 courses) against `combined/family-totals-2026-11-17.json` (46 courses, KNOWN/held items removed). Treat them as rough lower bounds.

| detector | candidates | confirmed | hit rate | verdict for part C |
|---|---|---|---|---|
| empty_audio (item 1) | 2,792 | 2,525 | ~90% | **proven** |
| dup_rows (item 18) | 3,763 | 3,207 | ~85% | **proven** |
| seed_not_played (item 12) | 8,943 | 4,033 | ~45% | usable as a count. The item-12 census then found 1,259 of 4,129 inserts repeated a near-paraphrase already in the basket, so a fix must check for twins first |
| qmark_mismatch (item 14) | 3,072 | 1,263 | ~41% | candidate + read |
| untaught_target (item 9) | 3,824 | 1,464 | ~38% | **needs calibration**: 105 rows were a checker bug (first LEGO taken before the seed); exact surface matching fails Korean/Arabic; spaceless languages need their own count |
| gapped_lego (item 17) | 121 | 44 | ~36% | candidate + read (small, cheap) |
| zut_lego (item 13) | 289 | 102 | ~35% | candidate + read |
| phrase_missing_lego (item 11) | 3,243 | 1,062 | ~33% | **noisy**: exclude from the first batches |
| notnew / dup_debut (item 16) | 487 | 138 | ~28% | candidate + read |
| lego_not_in_seed (item 10) | 9,279 | 1,537 | ~17% | **noisy**: exclude |
| lego_syll_over8 (item 19) | 630 | 467 | — | **needs calibration**: the builder's estimate under-counts English and Arabic (hand counts were used) |
| lexical regexes | — | — | — | per-language; no patterns exist yet for the non-paid languages |

**The live pre-check gate.** Kai's 19 Nov 10:38Z rule: re-read each row, its LEGO and its seed live right before writing, and hold any mismatch. It became the guards sidecar in every changeset (`precheck-guards.cjs`, item 9 e51829fa3; item 4 r358.guards.json). It held real drift: 10 eng_for_mar rows whose seed 108 had moved under C0108, 1 ell LEGO, 1 tam op. #957 noted that `apply-changeset.cjs` itself checks only the row's `expect`, so the LEGO and seed check depends on the guards file being present.

**How it went.**
- **18 Nov.** Items 1–7 ran as parallel live writers. At 13:27–14:10Z the fan-out (15–46 active backends) starved Aran's marketing send. It was stopped by SIGSTOP on the worker trees, because hold messages only queue between a worker's steps (Kai memory `db-hold-sigstop-lesson`). At 18:29Z eight writers auto-respawned over the 3-writer cap. At 19:54Z production hung on Tom's phone (later traced to his signal), and every DB writer was cancelled (#699, #703, #709, #710, #717, #759, #783…). Tom: "Kai's Watson needs to never do any hammering. Ever." Most of the limbo above dates from that evening's cancellations.
- **18–19 Nov.** The load gate and governor were built and fixed (bec3ad2c5, f24ace1fd, e67ef9a84). The planning kits were moved to read only the nightly copy (#931, `copy-read.cjs`). Every paid-cleanup kit now refuses live unless given `--live-ok` at UK night (#968, 12ddb0836). Bulk applies became night changesets through one governed applier.
- **19 Nov.** cs #937 made LEGO edits recompute word tiles inside the transaction, so dry runs became 3–15× slower and hit 60 s timeouts. Item-10 dry runs now need `--chunk 10` at night.
- **19–23 Nov nights.** Item 9 and item 12 (19–20 Nov), item 20 (21 Nov), item 4 and C0108 (22 Nov), ita own-LEGO (22 Nov) all ran through the governor. Typical log line: "red → green, rate 2/s". There were no learner-side incidents in the logs. A second lesson from C0108: a client timeout can fire while Popty's transaction still commits, so a timed-out batch must be read back as "maybe landed" (memory `c0108-applied-374`, ops/c0108-719/tools/landed.cjs).

**What was found, by language** (from `FIX-LIST.head.md`): por_br had the most (~1,170 filler rows from seed 400 on); kor_for_eng had 863 duplicate rows and 109 seeds whose sentence the 5 Nov rebuild dropped; spa_mx kept "I think" as both creo que and pienso, and Deborah's seed corrections never reached it; deu had 39 LEGOs whose baskets don't drill them; jpn had bare たい rows saying "I want" for he/she; ara_eg/lb had about 680 silent English prompts; kor_for_tam used plain 나/내 in a polite course; the Indic eng_for courses had thin baskets and female-only prompt voices reading male text.

**Propagation to sister courses.** It worked where a sister shares the same rows. spa → spa_mx (seeds 27, 55, 115, 139, 140, 414, 416, 437, 567 and the "I think" family), por → por_br (European forms, ter certeza, magoou → machucou), deu → deu_at/deu_ch (offers, Swiss pronouns), zho_for_eng → zho_for_jpn/hin/tam (time word after modal), fra → fra_ca (se voir, need help), ara_for_eng → ara_lb (fun). Records: `ops/sister-propagation/`. **Where it did not carry, or stopped:**
- deu_at/deu_ch are dialect translations, so row fixes cannot copy over; only the rule can (#468 finding).
- Item 6's kor_for_eng-style register fix never reached kor_for_tam/kor_for_hin (L2).
- The ara_eg 14 / ara_lb 3 "taught NEW twice" fixed in ara_for_eng by #513 are part of item 16, which is held.
- S0207L01 "you've done" was fixed in eng_for_spa on 14 Oct but not in eng_for_fra/deu/ita/por (item 16, held).
- zho_for_tam 643/658 were left alone because the fix changes the meaning on the Tamil side (`ops/sister-propagation/zho_for_eng/record.md`).
- The Indic courses got eng_for_hin's #943 repair only through item 20.

**Lessons**, each now a standing rule:
- Never hammer the DB: at most 3 writers, the gate checked before each batch, bulk reads on the copy.
- Hold messages don't stop a mid-step worker; cancel, don't SIGSTOP and forget.
- Kai's live pre-check of row + LEGO + seed.
- "Thin baskets over bad phrases" (Kai 19 Nov): item 9 deleted 555 rows without waiting for back-fill.
- "Shortest LEGO cut" with stand-in "it" frames (Kai 17 Nov).
- The learner-POV gate for held fixes (Kai 17 Nov).
- No scripted fixes without Kai's specific OK (18 Nov 22:03Z).
- A text edit clears or re-points the row's clips, so every text apply needs its audio fill to finish. L1 is what happens when it doesn't.
- #697·AI found that the player never plays a bare build row, and that USE rows fill empty build slots (`ops/sister-propagation/indic/record.md`). Item 20's premise was therefore weaker than the list said. It was applied anyway (~163k Cartesia chars). Worth remembering when pricing back-fill (item 7 tonight is ≈44.5k).

---

## 4. Plan: scan every learner-visible course (PROPOSAL for Kai's Y/N; nothing starts)

**Which courses.** Popty `GET /api/estate-map` (read once, 15:01Z): 160 courses, **86 released** ("released = new_app_status IN ('live','beta')", from its `semantics` block). The paid rule (`partition.md`: target in the Big-10, released) gives 48. That leaves **38 released non-paid courses**, plus the **8 wave-2 paid courses never hand-read**.

**GAPS in the source.** The estate map has **no learner-use field** (no enrolment or activity count), and no "paid" flag (paid is derived by the rule above). I found no Popty route or committed tool that exposes per-course learner numbers, so the order below is a **taste-safe default for Kai to change**: paid-but-unread first, then `live` before `beta`, English-known before other-known.

**Order (default):**
1. Wave 2 (paid, never read): spa_for_jpn, spa_for_zho, fra_for_jpn, fra_for_zho, deu_for_jpn, deu_for_zho, ita_for_jpn, ita_for_zho. ara_sy_for_eng stays a gap (it is not released; Popty returns 0 seeds).
2. Live non-paid: ben_for_eng, glg_for_eng, hrv_for_eng, fin_for_eng. cym_n_for_eng and cym_s_for_eng are **excluded by default**: Welsh is never a fix target under canon R0.12, and it is Kai's own language, so his call.
3. Beta, English-known (29): afr, bul, cat, ces, dan, ell, est, eus, fas, gle, heb, hin, hun, hye, isl, lav, lit, nep, nld, nor, pol, ron, rus, srp, swa, swe, tha, tur, ukr _for_eng.
4. Beta, other-known: cat_for_spa, eus_for_spa, cym_anthem_for_jpn (7 seeds).

**Batches.** About 3 courses per night, 22:00–07:00 UK, one batch a night. That is ~3 nights for groups 1–2 and ~11 for groups 3–4. Each course: (a) dump it from the **nightly QA copy** with `node ops/paid-cleanup-scan-447/copy-read.cjs dump <course>` (that reader refuses any database that is not the local copy, so the live DB is never read); (b) run the detectors on the dump; (c) one Opus worker hand-reads the candidates against the canon; (d) a per-course fix list in the #482 family shape, published for Kai. **Scanning writes nothing and records no audio.**

**Detectors.**
- **Run, proven:** empty_audio, dup_rows, plus the cheap structural ones (same_both, tag_lego/tag_phrase, gapped_lego).
- **Run as candidate + hand read:** seed_not_played (with the twin check), qmark_mismatch, zut_lego, notnew/dup_debut.
- **Excluded until calibrated:** lego_not_in_seed (~17%), phrase_missing_lego (~33%), untaught_target (checker bug; spaceless and agglutinative languages), lego_syll (estimator), and all lexical regexes (none exist for these languages).
- **Kai's Y/N needed:** running `detect.cjs` is a script producing candidates. His 18 Nov rule is about scripted *fixes*, and #447 used the detector this way, but I'm naming it so he can say no.

**DB-load discipline.**
- Scans read only the copy.
- Before each batch, check `curl -s localhost:3470/health` → `dbLoadGate.governed:true` and `level:green` (d/b6e2e1e9). Pause on red or amber. (My own slip today is why this must be a check in code, not a printed value.)
- At most 3 DB writers estate-wide. Scans are not writers.
- Any fix a scan leads to goes into a night changeset (`tools/changeset/apply-changeset.cjs`, 22:00–07:00 UK), with Kai's live pre-check guards, after his Y.

**Cost.** Claude time only. My estimate: ~1–2 Opus hours per 300-seed course for the hand read, extrapolated from #447 (13 workers, 46 courses, one afternoon), so about 3–6 hours per nightly batch of 3. Scanning records **no audio**. Any audio a later fix needs goes through `POST /api/audio/render`, library first, and is priced separately for Kai.

**Not started.** No timer is armed and no job is dispatched. The first batch waits for Kai's Y.

---

## 5. Gaps (reads I did not or could not make)
- **No per-row live read-back.** Silent-slot counts for L1 (item 5) and L4 (pan/guj) are **unverified live**. I stopped my only course read after the gate slip described at the top.
- **Popty's edit-event history** (`/api/admin/audit-events`) needs an admin login, so event ids come from ledgers, commits and records, not from Popty's event table.
- **Learner-use figures** per course: no route or committed tool found (part C).
- **The full text of finished worker reports** (e.g. #783, #741): I read the summaries the surface returned, not the whole chats.
- **jpn seed-300 cap:** taken from #421; not re-checked in `ssi-learning-app` code.
