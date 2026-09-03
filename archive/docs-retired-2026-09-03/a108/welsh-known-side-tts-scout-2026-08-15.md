# Can Welsh KNOWN-side audio (e.g. spa_for_cym) be TTS, or does it require human recording?

**Scout, 2026-08-15. Live DB + repo code. No commits.**

## Verdict

**No written policy currently blocks TTS for a Welsh-KNOWN course, and Azure has a working Welsh voice pair (`cy-GB-NiaNeural` / `cy-GB-AledNeural`) that has never been used by any course in the DB.** The one piece of code that hard-blocks TTS for Welsh (`services/shared/human-voice-courses.cjs`) is scoped to course codes **starting with `cym_`** — i.e. Welsh-**target** courses (`cym_n_for_eng`, `cym_s_for_eng`) — plus one hardcoded Breton course. A Welsh-**known** course like `spa_for_cym` does **not** match that rule and would sail straight through the TTS chokepoint (`services/tts-service.cjs:219-225`) if a build/audio-pass were run against it today.

Practically, this is a **policy gap, not a technical requirement**: Azure genuinely offers Welsh TTS voices, they're wired into the pod-voice catalogue, and nothing in the DB or code currently stops them being used for a `known` role. But every human signal in the repo (owner rulings, docs, the 100% human composition of the two live Welsh-target courses) points to the same intent extending to Welsh-known — it just was never encoded for that direction, because no Welsh-known course has shipped yet.

**Recommendation implied by the evidence, not yet enacted in code:** extend `isHumanVoiceCourse()` (or add a parallel guard) to also catch `course_code` **ending** in `_for_cym`, not just starting with `cym_`, before any of these 9 drafts are built with audio.

---

## Evidence

### 1–2. Existing Welsh-target courses: voice_config + course_audio composition

`courses.voice_config` (both courses queried directly, `courses.course_code`, `courses.voice_config`):
- `cym_s_for_eng`: only a `podCast` map (Aran = `human_aran_cym_s`, Catrin = `human_catrinlliar_cym_s`) — **no `voices` block at all**, i.e. no known/target1/target2/presentation TTS voice was ever configured.
- `cym_n_for_eng`: has a `voices` block, but `known`, `target1`, `target2` all have **empty `name`/`voiceId`/`language`** (provider `azure`, but nothing to synthesize with). Only `presentation` has a real voice: `en-GB-AdaMultilingualNeural` — and that's the **English** presentation narration, not Welsh.

`course_audio` grouped by role/voice_id/origin/language (live counts):

| course | role | voice_id | origin | language | count |
|---|---|---|---|---|---|
| cym_s_for_eng | target1 | legacy_import | **human** | cym | **6,685** |
| cym_s_for_eng | target1 | legacy_import | tts | cym | 9 |
| cym_s_for_eng | target2 | legacy_import | **human** | cym | **6,685** |
| cym_s_for_eng | target2 | legacy_import | tts | cym | 9 |
| cym_s_for_eng | known | legacy_import | human | eng | 6,601 |
| cym_s_for_eng | known | gfzdpspr5fdp / xai_gfzdpspr5fdp | tts | eng | 27 |
| cym_n_for_eng | target1 | legacy_import + human_aran_cym_n(_2) | **human** | cym | **6,375 + 69 + 42 = 6,486** |
| cym_n_for_eng | target1 | legacy_import | tts | cym | 9 |
| cym_n_for_eng | target2 | legacy_import | **human** | cym | **6,375** |
| cym_n_for_eng | target2 | legacy_import | tts | cym | 9 |
| cym_n_for_eng | known | legacy_import + human_aran_cym_n | human | eng | 6,337 |
| cym_n_for_eng | known | gfzdpspr5fdp / xai_gfzdpspr5fdp / legacy_import | tts | eng | 44 |

**Distinguishing signal:** `course_audio.origin` (`'human'` vs `'tts'`) is the real marker; `voice_id='legacy_import'` is a legacy-import stub that does **not** by itself mean TTS — the vast majority of `legacy_import` rows are `origin='human'`. This matches a known documented trap: `docs/voice-engine/audit/06-data-model.md:58-60,160` records that the legacy course-importer used to stamp `origin='tts'` on ALL rows including genuinely human Welsh recordings, and flagged a backfill to relabel them. **That relabeling appears to have already happened** — the live counts above show `origin='human'` on the Welsh rows now, not the ~19,080-mislabeled figure the older audit doc cites. Treat any doc older than this scout describing Welsh `origin` labels as superseded by this direct query.

### 2 (answer). Is the Welsh audio human-recorded?

**Yes, essentially entirely.** Welsh-language rows (`language='cym'`, roles `target1`/`target2`) are **13,171 human / 18 tts** for `cym_s_for_eng` (99.86% human) and **12,861 human / 18 tts** for `cym_n_for_eng` (99.86% human). The handful of `tts` rows (18 each) are residual/legacy stubs, not a production TTS pipeline for Welsh — no course anywhere in the DB uses the Azure Welsh voice IDs (see §3).

### 3. Does any TTS provider configured in this repo offer a Welsh voice?

**Yes — Azure does, via `cy-GB`.** Found in three places:
- `tools/pod-voices-azure.json:135-153` — `cy-GB` catalogue entry: `cy-GB-NiaNeural` (f, "Nia") and `cy-GB-AledNeural` (m, "Aled").
- `services/voice-gender-map.cjs:134` — `'cy-GB-NiaNeural': 'F', 'cy-GB-AledNeural': 'M'`.
- `services/phases/phase8-audio-v13.cjs:6159` — `'cy-GB': 'cy-GB-NiaNeural'` (default-voice map).
- `tools/pod-voice-coverage.cjs:121-124` — `cym`, `cym_n`, `cym_s`, `cym_anthem` all map to `{ azure: 'cy-GB', humanPreferred: true }`, with the inline comment: *"Welsh course audio is human; pods fall back to Azure cy-GB"*.
- ElevenLabs and xAI multilingual: no Welsh entry found anywhere in `services/`, `tools/`, or the pod voice pools — Azure is the **only** provider with a Welsh voice.

**But it has never been used**: a DB-wide search of `course_audio.voice_id ILIKE '%cy-GB%'` across **every course** returns **0 rows**. The Azure Welsh voice exists in the catalogue and is technically reachable, but nothing has ever synthesized with it.

### 4. Is there a written policy that Welsh audio must be human?

**Yes — but scoped narrowly, and the scope matters.** `services/shared/human-voice-courses.cjs:1-43`:

> "Human-voice-only courses — TTS is NEVER generated for these. OWNER RULING (Tom 2026-07-25): the Welsh courses cym_n_for_eng and cym_s_for_eng are HUMAN-VOICED ONLY. No TTS may ever be minted for them... All `cym_*` courses are treated as human-voiced: every Welsh course we ship is human-recorded, so the prefix rule is the safe default and new Welsh courses are covered without a code change."

The enforcement is `isHumanVoiceCourse(code)`: `HUMAN_VOICE_COURSES.has(code) || /^cym_/.test(code)`. I tested this directly against all 9 draft codes:

```
cym_n_for_eng  -> true
cym_s_for_eng  -> true
bre_for_fra    -> true
spa_for_cym    -> false
ara_for_cym    -> false
deu_for_cym    -> false   (and so on for all 9 _for_cym drafts — every one false)
```

**This is the single most important finding.** The comment's own claim — "new Welsh courses are covered without a code change" — is **only true for future Welsh-target courses** (codes starting `cym_`). It is **false** for Welsh-*known* courses, because the regex is a prefix match and `X_for_cym` doesn't start with `cym_`. The guard is wired into the real chokepoint (`services/tts-service.cjs:219-225`, `assertNotHumanVoiceCourse`) and multiple pipeline entry points (`phase8-audio-v13.cjs` ×5, `run-approved-audio-passes.cjs`, `build-chunk-audio-regen-queue.cjs`, rescue/regen tools) — so the block is real and would work correctly for `cym_n_for_eng`/`cym_s_for_eng`, but it is a **structural no-op for `spa_for_cym` and its 8 siblings**.

No other policy document (grepped `docs/`, `CLAUDE.md`, commit messages) makes a Welsh-known-specific statement. The closest related docs (`docs/IME_pipeline_review_gaps_answers.md:139-176`, `docs/PRESENTATION_AUDIO_INTEGRATION.md:15,160`) all describe the two existing Welsh-**target** courses only.

### 5. The 9 Welsh-known draft courses: real Welsh or placeholder?

**Real Welsh, not placeholder.** All 9 (`ara_for_cym`, `deu_for_cym`, `fra_for_cym`, `ita_for_cym`, `jpn_for_cym`, `kor_for_cym`, `por_for_cym`, `spa_for_cym`, `zho_for_cym`) exist as `status='draft'`, `seed_count=null`, `created_at` all within ~7 seconds of each other on **2026-07-07T10:34:56–10:35:03Z**, `creator_email=null` for every one (a script/migration, not a human via the dashboard UI). `course_seeds.known_text` for `spa_for_cym` (10 real rows shown) is genuine colloquial Welsh, e.g. `"Dw i isio siarad Sbaeneg efo chdi rŵan."` / `"Dw i'n trio dysgu."` / `"sut i siarad mor aml â phosib"` — correctly paired against Spanish `target_text`. Not a placeholder in any row sampled.

### 6. Who records Welsh, and what's the real throughput?

`recording_provenance` has no `course_code` column (it's linked via `audio_uuid`), but `recorded_by` shows Welsh-relevant human recordists include `aran@hey.com` (67 rows total) matching `courses.voice_config.podCast` casting Aran as the male Welsh voice and Catrin (`catrinlliar@gmail.com`) as the female voice — consistent with the "Aran admin, Catrin recorder" pod-role split already in memory.

**Real measured throughput**, `aran@hey.com` session on 2026-08-10: 63 timestamped takes from `16:46:00.960Z` to `17:01:40.440Z` — **15m40s wall-clock for 63 clips ≈ 4.0 clips/min ≈ ~241 clips/hour** sustained. This is a single unbroken autocue-style session; it is not a full-day average and doesn't account for breaks, retakes rejected before landing in the table, or slower phrase-vs-lego content. Treat it as a session-burst rate, not a daily-capacity estimate — I found no full-day or multi-day aggregate in the data to check it against.

---

## Explicit gaps

- **No full-day/weekly throughput figure exists in the DB** — only the one 15-minute burst above. Estimating a realistic daily human-recording capacity for a new 668-seed Welsh-known course from this alone would be extrapolation past what the evidence supports.
- **`recording_provenance` has no course linkage column** (`audio_uuid` only) — I did not join it to `course_audio.clip_id` to confirm which specific Welsh course each take belongs to; the `recorded_by` emails are corroborating, not proof, that all 67 Aran rows are Welsh-target work.
- Checked: `select count(*) from course_audio where course_code like '%_for_cym'` returns **zero rows for all 9 drafts**. No audio build has touched any of them yet — the code gap in §4 is real but not yet triggered. This is good news for remediation timing (the guard can be extended before any TTS is minted) but means the risk is live the moment someone runs an audio pass against one of these drafts.
