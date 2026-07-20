# Presentation audio readiness — fleet-wide check, 2026-07-20

Read-only sweep of every course (143 checked, 80 with gaps) after the phase8 staleness fix (`4ed5a38f`).
Per course, over `is_new` LEGOs: **needTTS** = no real presentation row reachable by FK or lego_id (would need author+TTS); **orphanFk** = FK points at a deleted `course_audio` row; **link-only** = nullFk − needTTS (a real row exists by lego_id, just needs the FK bound — free); **missingIntro** = absent from `lego_introductions` (Script Editor view only; learner path reads the FK).

Script: scratchpad `presentation-health-check.cjs` (session 80e242d6). Excludes `eng_template`, `zzz_test_for_eng`.

## 1. Live main courses with ORPHAN FKs — learner-facing, regen needed 🔴

Presentations existed and were deleted (delete-on-change without completed regen); learners hit silent missing INTROs. Same family as [eng_for_por orphan blast].

| course | orphanFk | needTTS |
|---|---|---|
| jpn_for_eng | 761 | 761 |
| spa_for_eng | 517 | 517 | ← Deborah's R755 report
| kor_for_eng | 321 | 321 |
| cym_s_for_eng | 1 | 3 |
| pol_for_eng | 1 | 1 |

**~1,603 intros.** Repair: clear orphan FKs → `/generate` (authors + TTSes on the known-language presentation voice; eng-known = Tom's xAI clone). Rough cost: low single-digit dollars total.

## 2. Free repairs — no TTS, no approval needed 🟢

- **Link-only FK repair** (real presentation rows exist, FK unset): nor_for_eng 146, zho_for_jpn 118, and ~12-each across bul/cat_for_spa/ces/dan/eus_for_spa/fra_for_jpn/gle/heb/hun/ita_for_jpn/lav/rus/spa_for_jpn + singles (ron/tha/tur/zho). Plus fra_ca_for_eng 532 (course on TTS hold, but linking is free). `/generate` Step A does this automatically; can also run link pass standalone.
- **`lego_introductions` backfill from existing FK+audio** — fleet-wide gap (e.g. fra_for_eng 1,526/1,529 missing; afr, est, hin, isl, lit, rus, swa, swe, ukr, hye, fas, nep, dan, ces… effectively every course not recently regenerated). Learner audio unaffected; this is why the Script Editor INTRO view looks broken/empty (Deborah). One backfill script fixes the editor everywhere.

## 3. Expansion/new mains — presentations never generated 🟡 (generate when course is cleared)

| course | needTTS | notes |
|---|---|---|
| eng_for_guj | 719 | India expansion 301→668 |
| eng_for_pan | 670 | " |
| eng_for_hin | 654 | " |
| eng_for_urd | 596 | " |
| eng_for_ben | 173 | " |
| mar_for_eng | 1,688 | expanded build |
| tel_for_eng | 1,558 | final-pass HELD |
| fin_for_eng | 1,398 | build in flight |
| por_for_jpn | 738 | jpn-known voice |
| mlt_for_eng | 677 | |
| bre_for_fra | 596 | fra-known voice |
| gla_for_eng | 529 | gla-replace decisions pending |
| ita_for_cym | 58 | cym-known voice (Welsh intros) |
| sbx_for_eng | 47 | minority probe |
| kor_for_hin | 6 | scaffold |

## 4. Variant courses — ⛔ deliberate TTS HOLDs, excluded until released

hak_for_eng 2,510 · deu_ch_for_eng 1,390 · deu_at_for_eng 1,253 · yue_for_eng 1,022 · fra_ca_for_eng 819 · por_br_for_eng 784 · ara_lb_for_eng 776 · ara_eg_for_eng 651 · spa_mx_for_eng 645 · nan_for_eng 706
(Per variant tracker: native checks / Kai review gates first. The 07-20 staleness fix makes their eventual `/generate` safe after text sweeps.)

## Totals

- Fleet-wide needTTS ≈ **22.3k** intros (≈ $70-ish all-in, mostly xAI clone / Azure known voices)
- Immediately actionable (groups 1): **~1.6k**, low single-digit dollars
- Free wins (group 2): FK link repairs + fleet `lego_introductions` backfill

## Proposed order

1. ✅ phase8 staleness fix live (done, `4ed5a38f`)
2. Group 2 free repairs (link pass + lego_introductions backfill) — no cost, fixes Script Editor everywhere
3. Group 1 orphan regen (jpn/spa/kor + trivia) — **needs TTS approval**
4. Group 3 as each course clears its gate
5. Group 4 when Kai releases each variant hold
