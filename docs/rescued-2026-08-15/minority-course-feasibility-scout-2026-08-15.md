# Minority-course feasibility scout — Welsh-known, Neapolitan, Yiddish

**Date:** 2026-08-15 · **For:** Kai · **Method:** live Supabase + repo code. Scout only — nothing built, no audio generated, no commits.

---

## THE FINDING

**Kai's reasoning for #3 does not survive measurement. Both halves of it are wrong.**

> "It reuses an existing course's entire target side including all its recorded audio, and only rebuilds the KNOWN side in Welsh. The expensive half already exists."

**Half 1 — "the target side carries over."** It mostly doesn't. Two courses have already done exactly this experiment: `spa_for_jpn` and `spa_for_zho` are Spanish targets with a non-English known side, sitting next to `spa_for_eng`. Measured overlap of Spanish practice-phrase text:

| Pair | Distinct target phrases | Shared with `spa_for_eng` | Reuse rate |
|---|---|---|---|
| `spa_for_jpn` | 7,337 | 962 | **13.1%** |
| `spa_for_zho` | 4,622 | 800 | **17.3%** |
| LEGOs only (`spa_for_jpn`) | 579 | 358 | 61.8% |

**~85% of the target-side phrase audio has to be generated fresh**, because the Spanish sentences themselves differ. That is not an accident of those two builds — it is structural. The LEGO decomposition and the phrase set are derived from the known language; change the known language and you get a different Spanish course. Short LEGOs reuse well (62%); the phrases, which are the bulk of the audio, do not.

**Half 2 — "the known side is the cheap half."** It is the *larger* half. Clips in `spa_for_eng` by which language actually speaks them:

- **Known-language (English) or unsplittable-bilingual clips: ~42,300 (54%)** — `known` 33,977 · `presentation` 5,057 · `pod_fine_known` 2,027 · `pod_explainer` 1,190 · `instruction` 48 · `encouragement` 26 · welcome/bookends 3
- **Target-language (Spanish) clips: ~35,000 (46%)** — `target1` 18,990 · `target2` 16,983 · `pod_take_g` 645

The `pod_explainer` clips are the subtle one, and worker #612 caught it. They are tagged `language='es'` but the text is **bilingual in a single file** — e.g. `"soy de Bogotá". means I'm from Bogotá. "ya llevo dos años aquí". means I've been here two years now.` The English narration cannot be separated from the Spanish without re-rendering the clip, so all 1,190 belong on the rebuild side despite the Spanish tag. (I verified #612's mechanism and its total; its claim that the same bleed affects `target1`/`target2` does **not** reproduce — only 10 such rows exist there.)

So the "expensive half that already exists" is 46% of the audio, of which ~85% doesn't transfer. **Kai is proposing to save roughly 6% of the audio work and calling it the expensive half.**

**And then Welsh makes the remaining half unbuyable.** See §C.

---

## A. INVENTORY (live DB, 145 courses)

- **47 courses** are built to **300 seeds** (the standard build). **23** run to 668 (the flagship tier: spa/fra/ita/deu/por/jpn/kor/zho for eng, and the eng_for_* Indic set).
- **`is_community` is `true` for zero courses.** Whatever "community course" means operationally, nothing in the DB is tagged as one today. **Flagging as a decision, not a defect** — if community courses are meant to be a distinct shelf, that flag needs a rule before the first one ships.

**Kai's memory of `eng_for_jpn` — correct in substance, wrong on scale.** It is real and live: `beta`, 719 LEGOs, 10,770 phrases, 53,570 clips, all TTS. But `seed_count = 300`, and LEGOs cover exactly seeds 1–300, not 668. It is a standard-tier build, not a flagship one, and it is `beta`, never released.

**All three candidates already exist as draft shells** — created 2026-07-07 by a script (`creator_email` is NULL on all of them):

| Course | Seeds | LEGOs | Phrases | Audio | State |
|---|---|---|---|---|---|
| `nap_for_eng` | 668 translated | 0 | 0 | 1 (generic welcome clip) | Seeds done, decomposition never run |
| `yid_for_eng` | 668 translated | 0 | 0 | 1 (same generic welcome clip) | Seeds done, decomposition never run |
| `spa_for_cym` + 8 siblings | 668, **real Welsh** | 0 | 0 | 0 | Shells with a Welsh known side authored |
| `ita_for_cym` | 668 Welsh | **58** | **465** | 0 | Someone started this and stopped — last touched 2026-08-13 |

The nine Welsh-known shells are `ara/deu/fra/ita/jpn/kor/por/spa/zho_for_cym`. There is also a `cym_for_yor` (Welsh target, Yoruba known) shell, empty.

**The Welsh known text is genuinely authored, and it is North Welsh.** `spa_for_cym` seed 1: *"Dw i isio siarad Sbaeneg efo chdi rŵan."* — `isio`, `chdi`, `rŵan`, `efo` are all northern. SSi ships both `cym_n` and `cym_s`. **A Welsh-known course inherits the dialect split: pick one, or build two.** That decision has already been made by default in the seed data and nobody ratified it.

---

## B. WHAT ACTUALLY HAS TO BE REBUILT

**The good news first: known and target audio ARE disjoint row sets.** `course_audio` rows carry `role` and `language`; the `known`/`presentation`/`instruction`/`encouragement`/`pod_fine_known` roles are spoken in the known language, `target1`/`target2` in the target. So the mechanical premise — "target audio is a separate set of rows" — is confirmed.

**And byte-level reuse is already the estate norm.** 112,326 `s3_key` values are shared across more than one course, covering 445,840 rows. You reuse audio by inserting a *new* `course_audio` row for the new course pointing at the *same* S3 object. **No TTS money is spent to carry a clip across courses.** That part of Kai's instinct is right.

Two mechanical cautions:
- **Don't reuse by pointing at another course's audio ID.** It *would* serve — worker #612 confirmed `lookupAudioRecord` resolves by `id` with no `course_code` filter — but only 1 such cross-course reference exists estate-wide (the known `zho_for_jpn` orphan defect), so it is a bug, not a used pattern. It would also mis-gate the paywall: `resolveAudioEntitlement` checks the token against the **audio row's** `course_code` (`ssi-learning-app/api/_utils/audioAccess.ts:534`), so a Welsh learner's clip would be entitlement-checked against the Spanish-for-English course. Duplicate the row, share the `s3_key`.
- **A text-only fix is never text-only.** Editing `target_text` fires a trigger that nulls or cross-relinks the clips.

**The rebuild scope, as numbers.** Model it on a 300-seed Spanish course — `spa_for_jpn` is the right yardstick, not the 668-seed `spa_for_eng`:

| Item | Rows | Reusable from `spa_for_eng`? |
|---|---|---|
| `course_seeds` known_text | 668 | **Already done in Welsh** ✅ (and `target_text` matches `spa_for_eng` 667/668) |
| `course_legos` (both sides + components, tiling, gloss segments) | ~600–1,400 | Must be re-derived |
| `course_practice_phrases` (both sides + decomposition, display_tiling) | ~7,500 | Must be re-derived |
| Target-side (Spanish) clips | ~16,000 | **~13–17% only** → ~13,500 new |
| **Known-side (Welsh) clips** | **~9,300** (9,283 distinct) | **0%** |

**Can the existing Welsh audio corpus supply the prompts?** No. I matched all 668 `spa_for_cym` Welsh seed texts against every human Welsh clip in the estate (12,152 distinct texts): **3 matches.** The existing Welsh corpus is learner-target sentences from the Welsh courses; it is not prompt material.

**English is baked into structured JSON, not just the `known_text` column.** `course_legos.components` stores paired nodes — seed 157: `[{"known": "the month", "target": "el mes"}, {"known": "coming / next", "target": "que viene"}]` — and `course_practice_phrases.decomposition` does the same. So the re-authoring surface is **1,475 LEGO `components` blobs and ~15,700 phrase `decomposition` blobs**, every node of which carries an English string. This is not a column-level find-and-replace.

**And the crux: it is not "just translation."** The methodology rails state the known side is a controlled language in its own right and that decomposition is built on the known-language structure. Welsh maps onto Spanish differently than English does — different LEGO boundaries, different tiling, different ZUT collisions. The 13% measured target-text overlap is the empirical proof of that: `spa_for_jpn` didn't produce different Spanish by accident.

**Best first candidate if it goes ahead:** `spa_for_cym`. Spanish has the deepest existing estate (78,946 clips), the highest plausible Welsh-learner demand, and no script/RTL complications. Second choice `ita_for_cym`, purely because 58 LEGOs and 465 phrases of it already exist — but that head start is 4% of the job and I would not let it drive the pick.

---

## C. WELSH AUDIO COST — the finding that decides it

**Every Welsh clip SSi has ever shipped is a human recording. There are no exceptions in the data.**

- 26,585 Welsh clips estate-wide (`cym_s_for_eng` 13,370 · `cym_n_for_eng` 12,861 · `cym_anthem_for_jpn` 354) — **`origin = 'human'` on all of them.** The only non-human `cym` rows anywhere are 36 tagged `legacy_import` and 27 mis-tagged with a *Japanese* voice ID.
- `cym_n_for_eng`'s `voice_config` has **empty `voiceId` strings** for `known`, `target1` and `target2`. No TTS voice is configured for Welsh at all.
- In `cym_n_for_eng`, even the **English** prompt side is human — 6,337 human English clips. These courses are recorded end to end.
- The policy is written in code, with an owner and a date. `services/shared/human-voice-courses.cjs`, Tom's ruling 2026-07-25: *"All `cym_*` courses are treated as human-voiced: every Welsh course we ship is human-recorded, so the prefix rule is the safe default."* `services/tts-service.cjs:209` enforces it at the one chokepoint every provider path passes through, as a hard 403.

**But the guard does not reach a Welsh-KNOWN course.** `isHumanVoiceCourse()` tests `/^cym_/` — that matches `cym_n_for_eng` (Welsh *target*). It does not match `spa_for_cym` (Welsh *known*). Worker #610 ran it live against all nine Welsh-known shells: **all nine return `false`.** Azure's `cy-GB-NiaNeural` / `cy-GB-AledNeural` are in the voice-gender map and have **zero uses estate-wide**.

**So the position is: the stated policy is "every Welsh course we ship is human-recorded," and the code that enforces it has a hole exactly where Kai wants to build.** Building `spa_for_cym` with TTS would not be blocked by the guard — it would mint synthesised Welsh prompts, which is precisely the defect the ruling names.

**This needs Tom's ruling before anything is built, and it is a tonight question:**
- **If human Welsh applies to the prompt side** → ~9,300 Welsh clips of Aran/Catrin studio time. The measured throughput is brutal: after January's 26,120-clip bulk *import* of legacy recordings, actual new Welsh recording since is **354 (Mar) + 50 (Jun) + 61 (Aug) = 465 clips in seven months.** Worker #610 clocked one Aran session at ~241 clips/hour sustained — so ~40 clean studio hours if you had Aran's undivided attention, which the seven-month record says you don't. **The cheap story collapses completely.**
- **If Tom rules Azure Welsh acceptable for prompts only** → it becomes ordinary and cheap, and the `/^cym_/` guard should be widened to `_for_cym` deliberately rather than left as an accident.

---

## D. THE TWO NEW TARGETS — decisions for a human

Both need `nap` and `yid` registered in `tools/sync/reference/language_codes.csv`: **both rows exist but with an empty `database_code`, so `canonicalLanguage()` throws for both today.** That is a hard blocker, but it is a one-line data fix, not a decision. (The reject list is 14 languages, not 9: `fur hak lmo nan nap pdc rgn roh scn sme vec yid yor yue`.)

### Yiddish — Hebrew script vs romanisation
**Somebody already chose, and nobody ratified it.** All 668 seeds are authored in pointed Hebrew script (seed 1: `איך וויל איצט רעדן ייִדיש מיט דיר`). The trade-offs as they bear on *this* pipeline:

- **Hebrew script:** `heb_for_eng` is the existence proof — 300 seeds, 629 LEGOs, 21,942 clips, and `target_text_roman` populated at **100%** (629/629 LEGOs, 668/668 seeds), so the script-plus-romanisation mechanism is proven, not theoretical. **But RTL rendering is proven in exactly one component** — `LegoAssembly.vue` flips direction on a Unicode-range test that covers the Hebrew block Yiddish uses. `ListeningOverlay.vue`, `PronunciationOverlay.vue`, `PodTurnDisplay.vue` and `LearningPlayer.vue` have **no RTL handling at all**. (Note: `docs/IME_pipeline_review_gaps_answers.md` claims no RTL handling exists anywhere in the frontend — that doc is stale by four months.)
- **YIVO romanisation:** sidesteps the RTL gap and learner typing entirely, but isn't how Yiddish is written, and doesn't solve the voice problem either.
- **The voice is the real blocker, not the script.** There is **no Yiddish voice** in the `voices` table, Azure, or ElevenLabs. Substitutes: Hebrew (`he-IL-HilaNeural`/`he-IL-AvriNeural`, already in production for `heb_for_eng`) or a German voice on the Germanic base. Neither speaks Yiddish. That is a decision, not a default — the code has no fallback-voice logic.

### Neapolitan — orthography
**Same story: already chosen implicitly, never ratified.** The 668 seeds use an apostrophe-marked elision convention (`stongo pruvanno a 'mparà`, `voglio parlà napulitano cu tte mo`). The estate precedent is *undocumented*: only `pdc_for_eng` (661 LEGOs, Latin/German-influenced spelling) and `nan_for_eng` (732 LEGOs, traditional Han characters over Tâi-lô) are built out among the seven unstandardised-language drafts, and **no doc anywhere records why either convention was chosen.** If Neapolitan goes ahead, write the choice down this time.

**Voice:** no Neapolitan voice exists. The obvious substitute is Italian (8 active Azure `it-IT-*` voices). It will read as Italian-accented. Also a decision.

**Toolchain verdict:** Latin script and LTR — Neapolitan has no script or character-set problem at all. Yiddish's Hebrew script is proven at the data-model layer and in one UI component; the rest of the learner UI is unproven.

---

## E. WHAT EACH WOULD ACTUALLY COST

**Machine time**, from real build wall-clocks in the DB: decomposition of a full course ran **9.3h** (`hak_for_eng`, 2,635 LEGOs), **9.4h** (`tel`), **10.2h** (`mar`). Audio generation peaked at **25,734 clips in one day** (`eng_for_jpn`, 2026-02-17). So a standard 300-seed course is roughly **10h decomposition + 1–2 days audio**, plus QA.

**Audio money** is smaller than the fear suggests — *on Azure*. At $4/1M neural chars (`services/audio-generation-planner.cjs:24`):

| Course | Clips | Chars | Azure cost |
|---|---|---|---|
| `spa_for_eng` (biggest in estate, 668 seeds) | 78,946 | 3.09M | **$12** |
| `spa_for_jpn` (300 seeds) | 25,330 | 693k | **$3** |
| `cym_n_for_eng` | 19,976 | 755k | **$3** |

⚠️ **Provider changes this by two orders of magnitude.** ElevenLabs is priced per 1k chars ($0.15–0.30) — the same 300-seed course would be **$100–200**, and `spa_for_eng`-scale **$460–930**. xAI (used for the English `known` voice on Spanish) has no cost figure in this repo — **explicit gap**.

| Candidate | Machine | Audio money | Human time | Blocked on |
|---|---|---|---|---|
| **Neapolitan** | ~10h + 1–2d | **$3–8** (Azure it-IT) | QA only | CSV registration; ratify orthography; accept Italian voice |
| **Yiddish** | ~10h + 1–2d | **$3–8** (Azure he-IL) | QA + RTL UI audit | CSV registration; script ruling; accept substitute voice; 4 UI components |
| **Spanish-for-Welsh** | ~10h + 1–2d | **$3–8** *if TTS Welsh allowed* | **~40+ studio hours** if not | **Tom's ruling on human Welsh**; dialect N/S; guard hole |

---

## MY RECOMMENDATION: build **Neapolitan** first. Not Welsh-known.

Stated as a position, against Kai's lean.

**Neapolitan is the only one of the three with no blocking human decision that costs anything.** 668 seeds are already translated. The orthography choice has already been made by the person who wrote them and just needs Kai's ratification — a reading pass, not a research project. Latin script, LTR, no toolchain risk whatsoever. Italian voices exist and are in daily production use. The whole build is ~10 hours of decomposition, a day of audio, and single-digit dollars. It is the weekend-sized job Kai is actually looking for.

**Welsh-known is the worst of the three, and it is the one that looked cheapest.** Its premise is inverted: the "expensive half that already exists" is 47% of the audio, of which 13–17% actually transfers — so the reuse is worth about 6% of the job. Everything else is a full course build: decomposition from scratch, ~13,500 new Spanish clips, ~9,300 new Welsh clips. And the Welsh clips sit behind a policy that says every Welsh clip SSi ships is human — enforced by a guard with a hole in it exactly where this course would land. **Do not start this without Tom's ruling.** If he says human, it is a multi-month recording project, not a weekend.

**Yiddish second, behind Neapolitan** — the seeds are done and the Hebrew-script data path is proven, but it carries two live unknowns (the script ruling, four un-RTL'd UI components) and no voice that speaks the language. Worth doing; not worth doing first.

If the Welsh-known idea is worth anything, it is worth it as a *demand* bet — a Welsh-speaking learner base is a real audience nobody else serves — not as a cost bet. The cost bet is false.

---

## EXPLICIT GAPS

- **Worker #612 (`known-swap-mechanics`) has now landed and this doc incorporates it.** Its independent verdict was the same — "best means least of a very large job, not cheap." It contributed the bilingual-`pod_explainer` finding (which corrected my clip ledger) and the decomposition-JSON finding. Its claim that the same bilingual bleed affects `target1`/`target2` did not reproduce on my check (10 rows, not 1,190) and is not relied on here. It also did not check the entitlement path; §B does. Its own report: https://watson-1.tail4968cb.ts.net/d/ae2b2fe9
- **Neither of us priced the decomposition re-derivation in human hours** — the ~10h figure is machine wall-clock for the automated pass only.
- **xAI TTS pricing is not recorded anywhere in this repo.** The Azure and ElevenLabs figures are from `services/audio-generation-planner.cjs`; the xAI known-side voice cost is unknown.
- **Welsh human recording throughput** is a session-burst figure (~241 clips/hour over 15.5 minutes), not a sustainable daily rate. The seven-month figure (465 clips) is the honest planning number and they disagree by two orders of magnitude.
- **Whisper/veracity pass rates on Hebrew-script or Han-character text were not measured.** If Hebrew script is chosen for Yiddish, pull `heb_for_eng`'s live veracity pass rate first.
- **`is_community = false` on all 145 courses** — I could not determine what operationally makes a course a "community course," so I could not check whether any of the three would qualify.
- **The minimum viable `voice_config` shape for a brand-new course** was not traced end-to-end from a working build.

---

**NO COMMITS.** Nothing was built, no audio was generated, nothing was pushed.
