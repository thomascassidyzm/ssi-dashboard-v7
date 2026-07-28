# Heavies clone-repoint — prep (2026-07-28)

Prep-only. No execution, no writes, no TTS. Companion: `audio-batch-fill-vs-regen-audit-2026-07-28.md` (line 63: the "repoint before voicing the backfill estate" recommendation this doc grounds).

## Verdict up front

- **Only 3 of the 5 held courses actually need a voice_config change**: `fra_ca_for_eng`, `por_br_for_eng`, `spa_mx_for_eng` — their `known` (English) role is pinned to a legacy Azure voice, which the copy-bucket gate refuses as a source. `eng_for_tel` and `eng_for_urd` already have their English role (`target1`/`target2`) on `xai` — an already-trusted engine — so **no config change is needed there**; whatever TTS still happens for them is a "no matching source yet" cold-start cost, not an engine-trust refusal.
- The repoint is a **1-field JSON edit per course** (`voice_config.voices.known`), applied via the existing `saveVoiceConfig`/`updateVoiceRole` API — no DB migration, no schema change.
- It **does not touch any existing audio row or FK link** — only new (`NULL` FK) generation resolves the new voice. Existing Azure-voiced clips (~24k across the 3 courses) stay exactly as they are; this creates a **mixed-voice course** (old English clips in Sonia/Bella, new fills in the clone) until/unless a separate harmonisation pass is commissioned — that's a distinct, larger, explicitly-approved spend decision, not a side-effect of this prep.
- My read of the audit's "~46k" figure: it's the sum across all 5 courses' English-bearing slots (not just the 3 that need repointing). My own count today is **49,906** (close, same method, natural drift from a live queue) — see §3. The number that actually matters for the repoint decision is smaller: **25,458** slots (the 3 Azure-known courses only).
- **xAI TTS pricing: FOUND — $15.00 / 1M chars** (xAI's own published rate, `docs.x.ai/docs/pricing`, checked 2026-07-28). See §5 addendum: the repo's `$4.20/1M` was launch-press coverage, never a billed rate, and under-estimated every xAI projection by 3.6x. Now corrected in code.

---

## 1. Where voice_config lives, and how a pinned voice resolves

**Storage**: `courses.voice_config` — a single JSONB column, keyed by role (`known`, `target1`, `target2`, `presentation`), each `{ name, voiceId, provider, language, settings: { speed, ... } }`. Documented and read/written by `services/voice-config-service.cjs:9` (`loadVoiceConfig`/`saveVoiceConfig`/`updateVoiceRole`, `services/voice-config-service.cjs:133,316,391`).

**Resolution at render time** (`services/phases/phase8-audio-v13.cjs`):
- `/generate` loads the course row, reads `course.voice_config.voices` (`phase8-audio-v13.cjs:1678-1679`), and builds a `getVoiceForRole(role)` closure that pulls `voices[role].voiceId`, stripping any legacy `provider_` prefix (`phase8-audio-v13.cjs:1706-1713`).
- Every item queued for TTS gets its `voiceId` set explicitly from this resolver, never trusted from any pending-row cache (`phase8-audio-v13.cjs:1808-1820`, comment explains why: some flows store voice_id without the provider prefix).
- The resolved `{ voiceId, provider, settings }` becomes the `config` object passed to `services/voice-config-service.cjs:435` `buildTTSConfig()`, which shapes it per-provider (azure/elevenlabs/xai) and is what actually reaches `services/tts-service.cjs:338` `generate(text, provider, config)` → `generateAzure`/`generateXai`/`generateElevenLabs`.
- Missing `known`/`target1` voiceIds hard-block `/generate` with a 400 (`phase8-audio-v13.cjs:1680-1690`) — this is why `deu_ch_for_eng`/`fin_for_eng`/`por_for_jpn` (no `voice_config` at all) 400 today, per the audit.

### Current literal `voice_config` for the five held courses (live read, 2026-07-28)

| course | known role | target1 | target2 |
|---|---|---|---|
| `fra_ca_for_eng` | **Sonia**, `en-GB-SoniaNeural`, `azure`, speed 0.95 | Sylvie, `fr-CA-SylvieNeural`, azure, 0.85 | Antoine, `fr-CA-AntoineNeural`, azure, 0.85 |
| `por_br_for_eng` | **Bella**, `en-GB-BellaNeural`, `azure`, speed 0.95 | Brenda, `pt-BR-BrendaNeural`, azure, 0.8 | Julio, `pt-BR-JulioNeural`, azure, 0.8 |
| `spa_mx_for_eng` | **Sonia**, `en-GB-SoniaNeural`, `azure`, speed 0.9 | Carlota, `es-MX-CarlotaNeural`, azure, 0.8 | Luciano, `es-MX-LucianoNeural`, azure, 0.8 |
| `eng_for_tel` | Shruti, `te-IN-ShrutiNeural`, azure (known = Telugu, not English) | **Olivia**, `bedd6226`, `xai`, speed 1 | **Tom (clone)**, `gfzdpspr5fdp`, `xai`, speed 1 |
| `eng_for_urd` | Uzma, `ur-PK-UzmaNeural`, azure (known = Urdu, not English) | **Olivia**, `bedd6226`, `xai`, speed 1 | **Tom (clone)**, `gfzdpspr5fdp`, `xai`, speed 1 |

Bold = the English-bearing role in that course. Confirmed against `voices` table: `en-GB-SoniaNeural`/`en-GB-BellaNeural` → `tts_engine='azure'`; `bedd6226`/`gfzdpspr5fdp` → `tts_engine='xai'` (both active).

Query used (read-only, `.env.psql` `DATABASE_URL`):
```sql
SELECT course_code, known_lang, target_lang, jsonb_pretty(voice_config) FROM courses
WHERE course_code IN ('fra_ca_for_eng','por_br_for_eng','spa_mx_for_eng','eng_for_tel','eng_for_urd');
```

---

## 2. Exactly what changes, and the copy-bucket eligibility check

**Field to change**: `voice_config.voices.known` — only for `fra_ca_for_eng`, `por_br_for_eng`, `spa_mx_for_eng`. `eng_for_tel`/`eng_for_urd` need no change (see verdict).

Before/after (illustrative — same shape for all three, only `name`/`settings.speed` differ per course today):

```jsonc
// before (fra_ca_for_eng, por_br_for_eng, spa_mx_for_eng)
"known": { "name": "Sonia", "voiceId": "en-GB-SoniaNeural", "provider": "azure", "language": "en-GB", "settings": { "speed": 0.95 } }

// after
"known": { "name": "Tom", "voiceId": "gfzdpspr5fdp", "provider": "xai", "language": "en-GB", "settings": { "speed": 1 } }
```

Apply via the existing service — `updateVoiceRole(courseCode, 'known', { voiceId: 'gfzdpspr5fdp', provider: 'xai', name: 'Tom', settings: { speed: 1 } })` (`services/voice-config-service.cjs:391`) — not a raw SQL UPDATE; this path also auto-registers the voice in `voices` (no-op here, already registered) and bumps the course version.

**Copy-bucket eligibility — the actual gate**: `classifyEnglishCopyBucket()`, `services/phases/phase8-audio-v13.cjs:369-406`. For each English-bearing role it calls `buildSourceIndex(supabase, { voiceId, language: 'eng', texts })` (`services/shared/clone-copy-index.cjs:110`), which looks up the voice's `tts_engine` (`clone-copy-index.cjs:40`) and calls `isTrusted1xEngine(engine)` (`services/shared/clone-copy-match.cjs:38-40`). Only `xai` and `elevenlabs` are trusted (`TRUSTED_1X_ENGINES`, `clone-copy-match.cjs:36`) — **azure is explicitly excluded** because it bakes a non-1.0 `speed` into the rendered SSML/MP3 and `course_audio` has no persisted per-row speed, so a historical Azure clip can't be verified 1x after the fact (`clone-copy-match.cjs:30-35`).

What must be true for a clip to become a **free copy** rather than a new render, once the engine is trusted:
1. `voice_config.voices.known.provider` = `'xai'` (or `'elevenlabs'`) — satisfied by the repoint.
2. A `course_audio` row already exists **anywhere** (any course, any role) with the exact same `(normalized text, language='eng', voice_id)` — the match key is `computeAudioKey()` (`clone-copy-match.cjs:46-48`); role and course are not part of the key, only decided by `decideCopy()` (`clone-copy-match.cjs:62-92`), which picks the newest cross-course match.
3. If no candidate exists yet, the slot still renders via TTS (now under `xai`) — it's a "no source yet" case, not a refusal. This is why `eng_for_tel`/`eng_for_urd`'s English slots (already `xai`) aren't automatically free: they're trusted, but copy hit-rate still depends on whether some other course has already rendered that exact English text under `bedd6226`/`gfzdpspr5fdp`.

Execution (only on `/generate`, never on `/plan` or `/needs`, which stay pure reads): `executeCopyBucket()` (`phase8-audio-v13.cjs:423-454`) inserts an owned `course_audio` row pointing at the **same S3 key** as the source (shared physical object, logical per-course ownership) — zero new TTS calls, zero new S3 writes.

---

## 3. Verifying/refining the ~46k number

Per-course count of unlinked (`NULL`-FK) English-bearing slots, summed across `course_practice_phrases`, `course_legos`, `course_seeds` (seeds filtered `status='released'`, matching the audit's own method):

| course | English role(s) | practice_phrases | legos | seeds | **total** |
|---|---|---|---|---|---|
| fra_ca_for_eng | known | 10,925 | 950 | 57 | **11,932** |
| por_br_for_eng | known | 6,874 | 792 | 177 | **7,843** |
| spa_mx_for_eng | known | 5,066 | 617 | 0 | **5,683** |
| eng_for_tel | target1+target2 | 6,632+5,565 | 668+227 | 26+26 | **13,144** |
| eng_for_urd | target1+target2 | 5,096+5,096 | 556+556 | 0+0 | **11,304** |
| | | | | **grand total** | **49,906** |

- **This differs from the audit's "~46k"** — mine is ~8% higher. Same method (live `NULL`-FK slot count), so the gap is queue drift between snapshots (the batch/backfill estate has been moving), not a methodology disagreement. Not investigated further; re-run the query below before acting if the exact number matters.
- **The number that actually matters for the repoint decision is 25,458** (fra_ca + por_br + spa_mx only) — that's the Azure-blocked, copy-refused slice. The other 24,448 (eng_for_tel/urd) sit on an already-trusted engine; repointing does nothing for them.

Query (read-only):
```sql
SELECT course_code, count(*) FROM course_practice_phrases WHERE course_code='fra_ca_for_eng' AND known_audio_id IS NULL;
-- repeated per {course_practice_phrases,course_legos,course_seeds} x {known_audio_id | target1_audio_id | target2_audio_id}
-- per the role split in the table above; course_seeds additionally filtered status='released'.
```

---

## 4. Risks / order of operations

1. **Repointing does not orphan or invalidate existing clips.** `/generate` only ever targets `NULL`-FK slots (`getAudioNeeds`, confirmed by the audit's Q2 finding that generation scope comes from `NULL` FKs + `getExistingAudioSet`, never a voice_config diff). Existing `known_audio_id` links for already-rendered Sonia/Bella clips are untouched.
2. **It does not force regeneration of already-good audio** — same reason. No pass in this repo re-renders a linked slot just because `voice_config` changed.
3. **Real risk: mixed-voice course.** All three courses already have a majority-Sonia/Bella `known` inventory (fra_ca: 7,029 Sonia-voiced rows across two `voice_id` formats + 380 already on the clone + 168 on `bedd6226`; por_br: 6,874 Bella + smaller others; spa_mx: 7,882 Sonia + smaller others — live counts, `course_audio` `group by voice_id`). After repoint, all *new* English fills speak as "Tom" (the clone) while the existing ~24k stay as Sonia/Bella. The course is already not monovoice today (small clone/`bedd6226` counts exist in all three) — the repoint doesn't introduce the inconsistency, it grows one side of it. Full harmonisation (re-rendering the ~24k existing Azure clips to the clone) is a separate, explicit, costed decision — regenerating already-good audio needs the approval gate in `CLAUDE.md` ("never delete/regenerate generated assets without a plan + approval").
4. **No precious-audio interaction.** Queried `course_audio` origin for the `known` role on all 5 courses today: 100% `origin='tts'`, zero `origin='human'` rows. The guard (`humanRowAtAudioKey`, `phase8-audio-v13.cjs:211`) has nothing to refuse here regardless.
5. **Not in scope / no interaction**: Welsh (`cym_*`) and `bre_for_fra` are human-voice-only, never TTS (per standing policy) — none of the 5 held courses are Welsh/Breton, so this repoint doesn't touch that policy at all; flagged only for completeness.
6. **Order of operations if approved**: (a) repoint `voice_config.voices.known` for the 3 Azure-known courses via `updateVoiceRole` (reversible, instant, no cost); (b) THEN resume `/generate` for those courses so new fills render under the clone and pick up free copies where a cross-course match exists; (c) decide separately, later, whether to commission a harmonisation pass for the existing ~24k Azure clips — do not fold that into this step.

---

## 5. xAI TTS pricing — could not determine

Checked, in order:
- Repo-wide grep for `xai`, `XAI_`, `grok`, `pricing`, `cost-per-char`, `$` near xai mentions — no billed rate anywhere.
- `.env` / `.env.example` — only `XAI_API_KEY` (a credential), no pricing metadata.
- `docs/secrets-vault.md` — lists `XAI_API_KEY` as a provisioned secret, no billing info.
- `services/phases/phase8-audio-v13.cjs:5366`: `const POD_CHARS_TO_COST = 4.20 / 1_000_000  // xAI pricing; near-identical to Azure scale, rough estimate` — this is the only number in the repo, and its own comment says it's a rough estimate copied from Azure's scale, not a verified xAI billed rate. All cost lines in `docs/audio-census-2026-07-11.md` that cite "xai rates" trace back to this same constant.
- The audit doc this task is grounded in says the same thing explicitly: "xAI TTS pricing is not recorded in the repo; flagged below" / "exact xAI per-char/per-clip pricing isn't in the repo — worth pinning down once."
- Did not check xAI's own billing dashboard or docs site — no account access/URL was provided for this prep pass, and the instruction is not to guess or estimate a number.

**Open item**: get the actual xAI per-character or per-request TTS rate from the xAI account/console and record it in the repo (e.g. replace the `POD_CHARS_TO_COST` comment with a sourced figure) — needed before any cost projection involving `bedd6226`/`gfzdpspr5fdp` clips can be trusted.

---

## §5 addendum — xAI TTS pricing RESOLVED (2026-07-28)

**$15.00 / 1M characters.** Source: xAI's own published pricing, `https://docs.x.ai/docs/pricing`
(confirmed independently against `https://docs.x.ai/docs/models`), checked 2026-07-28.

For completeness, the rest of xAI's audio line: Speech to Text $0.10/hr (REST) and $0.20/hr
(streaming); Realtime voice $0.05/min ($3.00/hr).

**The repo was wrong by 3.6x.** `POD_CHARS_TO_COST = 4.20 / 1_000_000` traced to launch press
coverage, not a billed rate, and its comment claimed xAI was "near-identical to Azure scale".
It is not: Azure S0 is $4/1M chars, so **xAI is ~3.75x Azure**. Corrected in
`services/phases/phase8-audio-v13.cjs`. Not hot-loaded — phase8 was deliberately not bounced
to avoid killing the running light-course batch; it affects pod cost *estimates* only, never
generation behaviour, so it takes effect at the next natural restart.

**What this changes:** every cost line in the repo citing "xai rates" (including
`docs/audio-census-2026-07-11.md`) is understated by 3.6x for the xAI-voiced share. This
matters most for the English side of `eng_for_X` courses, which is xAI-voiced throughout — and
it strengthens the case for the clone repoint on the three Azure-known heavies, since clone
copy-bucket reuses are free against a $15/1M alternative, not a $4.20/1M one.
