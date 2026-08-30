# Two welcome clips + publish four courses — 2026-08-06

Kai authorised TTS spend for the two missing Mandarin welcome clips, and asked for the four
complete courses to be published. **Two of the four are published. The two welcome clips are
NOT generated — blocked on missing source text, and I did not invent any.** Detail below.

---

## 1. The bulk welcome tool — found only half of it, and the half that generates is missing

| Piece | Where | State |
|---|---|---|
| **Generator + welcome translations** | `scripts/bulk-audio/` — referenced by committed code at `services/production-api.cjs:3683` | **NOT on watson-1.** Not in either repo, not in the dev checkout, not in the running prod checkout. |
| **Importer** (welcomes.json → `course_audio`) | `database/import-welcomes.cjs` | Committed and intact. Takes a `welcomes.json` produced elsewhere. |
| **Legacy single-welcome service** | `services/welcome-service.cjs` | Committed but **dead for this purpose** — it reads `vfs/canonical/welcomes.json`, and `vfs/canonical/` is empty on this box. |
| **Welcome script renderer** | `services/production-api.cjs:3679` `renderWelcomeScript()` | Committed and working, but its data files are absent, so it returns `null`. |

`scripts/` is gitignored wholesale (`.gitignore:126`), plus `scripts/bulk-audio/data/` and
`scripts/bulk-audio/generated/` are ignored explicitly (`.gitignore:120-121`). So the tool was
never in git — it lives on whichever machine Kai ran it from.

### Proof the data is absent, not just the tool

`renderWelcomeScript()` reads `scripts/bulk-audio/data/translations/welcomes/{lang}.json`. I hit
the **live** production API on watson-1 (`:3470`) for five courses:

| course | welcome text returned |
|---|---|
| `fra_for_eng` | `'Course welcome audio'` ← DB label fallback |
| `zho_for_eng` | `'Course welcome audio'` ← DB label fallback |
| `eng_for_zho` | `'welcome'` ← DB label fallback |
| `eng_for_hin` | `'welcome'` ← DB label fallback |
| `eng_for_tam` | `'welcome'` ← DB label fallback |

Every one falls through to the `course_audio.text` label, meaning the renderer returned `null`
for **all** of them. The whole `translations/welcomes/` directory is missing on watson-1 — this
is not a hin/tam-specific hole.

### If it were brought in properly (NOT done — no refactor in this job)

1. Move the generator to `tools/` (committed, shared) — it is a production content tool, and
   right now the repo has committed code that reads a path only one laptop can satisfy.
2. Move `data/translations/welcomes/*.json` out of the ignored tree. This is **source content** —
   authored welcome copy per known language — and it is currently un-backed-up and un-reviewable.
3. Persist the rendered welcome text onto the `course_audio` row. Today `text` is just the label
   `"welcome"`, so **what a welcome actually says is recorded nowhere** (see §3).

---

## 2. The Hindi / Tamil ElevenLabs voices — found, with evidence

Taken from what is actually voicing the known-side shared audio in these languages today:

| lang | ElevenLabs voice | clips voiced by it |
|---|---|---|
| **hin** | `XcWoPxj7pwnIgM3dQnWv` | **199** — 48 instructions, 50 encouragements, 101 paywall |
| **tam** | `yrFqUM5ku2rYJCdiBKFU` | **199** — 48 instructions, 50 encouragements, 101 paywall |

These are the only ElevenLabs voices present for hin/tam anywhere in `shared_audio`, so there is
no ambiguity about which voice was in use. The Hindi narrator is **female** and speaks in the
informal `तुम` register (`बताऊँगी`, `दूँगी` in the instruction texts) — a welcome must match, or
the first thing a learner hears contradicts everything after it.

Note the welcome rows themselves carry `voice_id = 'elevenlabs'` with **no voice hash**, so the
exact voice used on the *existing* welcomes is not recorded. The 199-clip evidence above is for
the shared audio, which is the right thing to match.

---

## 3. What already exists for the two Mandarin courses: nothing, and no text anywhere

| course | welcome row | clip | text / translation |
|---|---|---|---|
| `zho_for_hin` | **none** | **none** | **none found** |
| `zho_for_tam` | **none** | **none** | **none found** |
| `kor_for_hin` | yes | alive, verified good | not recorded |
| `kor_for_tam` | yes | alive, verified good | not recorded |

Where I looked for the text, all negative:

- `course_audio.text` / `text_normalized` / `text_stripped` on all four welcome rows → the literal
  string `"welcome"`, a label, not a script.
- `course_audio.word_boundaries` (which normally proves what TTS spoke) → `NULL` on every welcome row.
- `shared_audio` for hin/tam → only `instruction`, `encouragement`, `paywall`, `bookend_*`. No welcome.
- DB-wide search for the words for "welcome" (`स्वागत`, `வரவேற்`, `வணக்கம்`) across `shared_audio`,
  `course_audio`, `target_audio`, `course_practice_phrases` → hits are Nepali and Tamil **paywall**
  lines only. No welcome script.
- `presentation_templates` → has hin and tam rows, but those are LEGO presentation frames, not welcomes.
- Git history, all branches, including deleted files (`docs/WELCOME_WORKFLOW.md`,
  `scripts/generate-welcome.cjs`, `public/vfs/canonical/welcomes.json`) → the only welcome text
  recoverable is a 2025 placeholder for `cmn_for_eng`, ~200 characters. The real welcomes run
  **40–61 seconds**, so that placeholder is not the current script.

**This is an explicit gap, and it is the reason no TTS was spent.** I have no Hindi or Tamil
welcome copy to voice, and I will not author a 50-second first-impression script and pass it off
as Kai's. Three ways to unblock, cheapest first:

1. **Put `hin.json` and `tam.json` back on watson-1** (or name the machine that has them). Zero
   invention, and it fixes every future course too. Best option.
2. **Authorise one-off speech-to-text** on the two existing `kor_for_*` welcome clips (~113
   seconds of audio, pennies) to recover Kai's exact wording, then swap "Korean" → "Chinese".
   I'd show the recovered text for approval before any TTS. No local ASR exists on watson-1 —
   no `whisper-cli`, no model, and no `pip`/`venv` to install one — so this needs an API call,
   which is outside the TTS-only rail.
3. **Authorise me to author fresh Hindi/Tamil welcome copy** from the English template and the
   existing instruction register, for review before TTS. Slowest and the least faithful to what
   the other twelve courses say.

**Clips generated: 0. TTS calls spent: 0. Cost: nothing.**

---

## 4. Published — two of four, verified live

Field: `courses.new_app_status`. Allowed values are `not_available | draft | beta | live`
(CHECK constraint, `ssi-learning-app/supabase/schema.sql:6643`). The learner app gates purely on
`new_app_status IN ('live','beta')` — `App.vue:431`, `BrowseScreen.vue:237`,
`api/courses/available.ts:35` — and `visibility` is **not** filtered, so `hidden` does not block.

**Value set: `beta`** on `kor_for_hin` and `kor_for_tam`.

`beta` rather than `live` because it matches the batch: of the 13 hin/tam/other Indian-language
courses, 10 are `beta` and only 3 (`eng_for_kan`, `eng_for_mar`, `eng_for_tel`) are `live`. It
also fits Kai's "polish them as much as possible" — `beta` shows a β badge and is one word from
`live` whenever he wants it.

Read back from a fresh connection:

| course | new_app_status | beta_started_at | legacy_app_status |
|---|---|---|---|
| `kor_for_hin` | **beta** | 2026-08-06T13:32:02.825Z | not_available |
| `kor_for_tam` | **beta** | 2026-08-06T13:32:02.825Z | not_available |
| `zho_for_hin` | not_available (held) | null | not_available |
| `zho_for_tam` | not_available (held) | null | not_available |

The `beta_started_at` timestamp was auto-set by the DB trigger, which confirms the publish path
fired properly rather than just a column being overwritten.

**Verified as a learner, not just as a field.** Using the anon key and the app's own catalogue
query, an anonymous client now sees both:

```
[{ "course_code": "kor_for_tam", "new_app_status": "beta", "display_name": "Korean for Tamil Speakers" },
 { "course_code": "kor_for_hin", "new_app_status": "beta", "display_name": "Korean for Hindi Speakers" }]
```

I could not verify inside the deployed SPA — I could not resolve its public URL from the repo,
and `app.saysomethingin.com` / `learn.saysomethingin.com` did not answer `/api/courses/available`.
The RLS + anon-query check above is the authoritative gate, but stating the limit plainly.

The two Mandarin courses are **held at `not_available`**, exactly as briefed — their welcome clips
are the precondition and they do not exist yet.

---

## 5. Condition checks on what I published

The scout doc's claims hold up, with one correction to how "100%" should be read.

**Seeds:** all four at **668**. Confirmed.

**Audio linkage:** `known_audio_id`, `target1_audio_id`, `target2_audio_id` are **100% non-null**
on all four. `presentation_audio_id` has nulls — 23, 24, 65 and 2 — which looks like a gap and is
not one: every null is an `is_new = false` lego, i.e. a repeat, which is never presented. Every
single `is_new = true` lego has presentation audio in all four courses. So linkage is genuinely
complete; the nulls are correct.

**Round-map view:** `course_round_index` is populated for all four, and its row counts match the
`is_new = true` counts exactly (1500 / 1503 / 1353 / 1161). This was worth checking — a course
absent from that materialised view presents as "one seed then INF PLAY" to a learner.

**Shared audio:** 48/48 instructions, 50 encouragements, and for the Korean pair 101 paywall
clips. Complete.

### The two Korean welcome clips, measured

Both fetched from `s3://ssi-audio-stage/mastered/` (HTTP 200) and analysed from decoded PCM at
48 kHz mono. `astats` and `silencedetect` both proved unreliable on these renders, so every
number below comes from the samples.

| | `kor_for_hin` | `kor_for_tam` |
|---|---|---|
| duration | 51.84 s | 61.28 s |
| decode errors | 0 | 0 |
| peak | −1.66 dB | −1.55 dB |
| clipped samples | 0 | 0 |
| noise floor | −88.0 dB | −87.5 dB |
| DC offset | −0.0006 | −0.00036 |
| click impulses | **0** | **3** (marginal, ratio 9.8 vs threshold 8) |
| longest internal silence | 0.94 s | 0.77 s |
| lead silence | 0.09 s | 0.10 s |

**Truncation — measured the right way.** A 100 ms pad can sit *after* a cut, so reading the final
50 ms of the file reads the pad and scores a damaged clip clean. I found the last frame carrying
speech and measured the 50 ms window *ending* there: **−37.1 dB** (hin) and **−25.8 dB** (tam).
Neither is a hot cut. I then dumped the closing 1.5 s envelope frame by frame to be sure:

- `kor_for_tam` decays smoothly `−18 → −21 → −25 → −29 → −33 → −40 → −49 → −64 → −74 → −83 dB`,
  all the way to the noise floor. Clean natural ending, definitely not truncated.
- `kor_for_hin` decays `−21 → −22 → −26 → −32 → −40 → −43 dB` and the file ends there, mid-decay
  rather than at the floor. At 41 dB below peak that is inaudible and the click detector reads 0,
  so it is not a defect — but it is a very slight hard stop and worth knowing about.

**One thing that looks broken and is not.** On both Korean welcome rows the row `id` and the
`s3_key` basename disagree (`356931e8…` vs `mastered/86EBBF2F…`), and the player builds its URL
from the row **id** (`CourseDataProvider.ts:370`). That would 404 — the id-derived object does not
exist in S3, I checked. But `/api/audio/[audioId]` looks the row up by id and streams
`sample.s3_key` (`api/audio/[audioId].ts:127`), so the mismatch never reaches S3. Playback is
fine. Flagging it because it is a trap for anyone reading the DB and reasoning about URLs.

`duration_ms` is `NULL` on both Korean welcome rows (`eng_for_hin` has it). The player tolerates
it (`data.duration_ms || null`). Cosmetic; I did not write to the DB to fix it.

### My own correction

My first pass at click detection used a raw sample-to-sample jump threshold and reported
thousands of "clicks" on healthy clips — loud sibilance at 48 kHz jumps that far routinely. The
numbers above come from a rewritten detector that scores isolated impulses (deviation from the
line the two neighbouring samples draw) against the local frame RMS. The earlier figures were
wrong and are not used anywhere in this report.

Probe: `scripts/welcome-zho-2026-08-06/probe.cjs` (gitignored workspace, so uncommitted).

---

## 6. Pushing these to the LEGACY app — what it involves

Not done, per the brief. This is what it would take.

**Step 1 — the "lock" is a comment, not a gate.** The field is `courses.legacy_app_status`, and its
comment says it is *locked until `new_app_status` is beta or live*. **That is enforced nowhere.**
Every trigger on `courses` (`courses_beta_timestamp_trigger`, `courses_audit`,
`trg_courses_updated_at`) was checked and none references `legacy_app_status`; there is no
constraint tying it to `new_app_status`. Nothing in this repo ever *writes* the field either — it
is only read, at `services/production-api.cjs:949`. So the field is set today by manual SQL, with
no gate of any kind. Correcting my own earlier framing: I described this as a door that had just
opened for the Korean pair. It was never locked.

The Korean pair does now satisfy the *documented intent* (new-app beta), and the Mandarin pair does
not — so honouring that intent still puts the Mandarin courses behind the welcome blocker.

⚠️ **The schema comment is wrong about the values.** It documents
`not_available → submitted → testing → live`, but the actual CHECK constraint
(`ssi-learning-app/supabase/schema.sql:6642`) permits only
**`not_available | draft | beta | released`**. Writing `'submitted'` or `'live'` would be rejected.
Anyone doing this push from the comment would hit a constraint error. There is a
`legacy_app_beta_started_at` auto-set trigger on the `beta` transition, mirroring the new-app one.

**Step 2 — generate the legacy manifest.** `services/phases/generate-legacy-manifest.cjs`, driven
by one of two routes:

- `GET /api/production/:courseCode/export-legacy` (`services/production-api.cjs:2400`) — manifest only
- `POST /api/production/:courseCode/export-legacy-with-state` (`services/production-api.cjs:7586`) — the fuller path, with `withAudio` and export-state tracking

**Step 3 — what legacy needs that the new app does not.** The legacy app consumes a *manifest*;
the new app reads Supabase directly, so none of this is exercised today. The manifest builds an
`introduction` block from the welcome (`generate-legacy-manifest.cjs:1553`).

A welcome is **not** strictly mandatory — `welcomeMissing` is a warning, not an error
(`:1562-1566`), and there is a `PLACEHOLDER_INTRO` fallback (`:76-83`) that substitutes a silent
45-second stub. So the Mandarin courses *could* technically ship to legacy with a placeholder
introduction. That is worse than not shipping them, and it is exactly the "wrong first impression"
outcome the welcome work is meant to prevent.

**Step 4 — publish the manifest.** `POST /api/production/:courseCode/publish-manifest`
(`production-api.cjs:7926`) → `publish-manifest-service.cjs:674`. This writes the manifest into an
**external git repo**, `course-configs`, commits and pushes it, and optionally `scp`s to
`ssi@apidev`. Two hard environment gaps: the `course-configs` repo is **not cloned on watson-1**
(`~/Documents/GitHub/course-configs` absent, `COURSE_CONFIGS_REPO` unset in `.env`), and SSH access
to `ssi@apidev` is unverified. So the legacy push **cannot be run from watson-1 as it stands**,
regardless of content readiness.

**Step 5 — one real thing to fix first, and it is cheap.** The legacy manifest sets the
introduction's duration from `welcome.duration_ms / 1000` (`:1558`). Both Korean welcome rows have
`duration_ms = NULL`, so **a legacy manifest generated today would carry `duration: 0` for the
welcome on both courses.** The new app doesn't care (it tolerates the null), which is why this has
been invisible.

And it would **not** be caught on the way out. `publish-manifest` does have a duration-zero guard
(`production-api.cjs:7949-7965`), but it only scans `manifest.slices[0].samples`, whereas
`introduction` is a **top-level** manifest key (`generate-legacy-manifest.cjs:1614`). So a
zero-duration welcome sails straight through the one check that would otherwise stop it. That
makes this worth fixing *before* any export, not after.

Fix is a no-TTS DB backfill from the measured file lengths — 51.84 s and 61.28 s, already measured
in §5. I did not write it, as it wasn't in scope.

Note also that legacy derives the introduction id from `uuidFromS3Key(welcome.s3_key)` (`:1555`),
i.e. the *s3_key*, not the row id — so the id/key divergence in §5 is handled correctly here too.

Also note step 2 with `withAudio: true` runs `generateCombinedPresentations` — a real
download/ffmpeg-concat/re-upload job **per LEGO** (~1,500 per course). That is compute and S3
traffic, not TTS spend, but it is not a quick button either.

**Already satisfied:** content (668 seeds), audio linkage, round index, shared audio, per-LEGO
presentation/target1/target2 audio, and — for the Korean pair only — the documented new-app-beta
precondition and a real welcome clip.

**Not satisfied:** `legacy_app_status` still `not_available` on all four, with no code path that
writes it; no `course_export_states` row for any of the four, so no manifest has ever been
generated; the `course-configs` repo is not on watson-1 and `ssi@apidev` access is unverified;
welcome `duration_ms` is NULL on both Korean rows and the publish guard won't catch it; and the
Mandarin pair lacks both a welcome and new-app publication.

---

## Rails honoured

No TTS spent. No other audio generated. No content edited. No seed approvals fired. No assets
deleted. The only write of any kind was `new_app_status` on the two Korean courses.
