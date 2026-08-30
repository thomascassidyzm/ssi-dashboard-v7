# Mandarin welcomes for Hindi & Tamil — reused, not generated

**2026-08-06.** zho_for_hin and zho_for_tam are published to `new_app_status=beta`.
**No TTS was generated. Zero spend.** Both welcome clips already existed in S3.

## 1. The script-text gap is closed

Kai's toolkit (`kai-stage` 7d0da74e) contains the welcome script text that was
unreachable earlier today:

- `scripts/bulk-audio/data/translations/welcomes/hin.json`
- `scripts/bulk-audio/data/translations/welcomes/tam.json`

Each holds a template plus per-target substitutions for ~150 target languages.
Mandarin is keyed `cmn` in the toolkit; courses use `zho`. The applier already
knows this: `apply-welcomes-to-courses.cjs` carries `LANG_ALIAS = { zho: 'cmn' }`.

Voice config **confirmed against the toolkit**, not assumed:

| Known | Voice ID | Name | Model / lang |
|---|---|---|---|
| hin | `XcWoPxj7pwnIgM3dQnWv` | Kanika — Smooth, Intimidating (f) | eleven_v3 / `hi` |
| tam | `yrFqUM5ku2rYJCdiBKFU` | Aarumugam — Expressive Narrator (m) | eleven_v3 / `ta` |

Both match the IDs given in the brief.

## 2. The welcomes already existed — reused

`_welcome_index.json` already had both entries:

| Course | UUID | S3 key |
|---|---|---|
| zho_for_hin | `065DD2DD-5717-428A-823B-BF0D9DEF3848` | `mastered/065DD2DD-….mp3` |
| zho_for_tam | `DF624A51-7BD7-41F5-B77B-53C2364F7E09` | `mastered/DF624A51-….mp3` |

Both flagged `"skipped": true`. That flag is **not** a failure — `process-welcomes.cjs:230-243`
sets it when a HEAD request finds the object **already in S3**. Both objects were
downloaded from `ssi-audio-stage` and confirmed present.

**Takes generated: 0.**

## 3. Measured proof the clips are good

Downloaded from S3 and measured with ffprobe/ffmpeg, against the two Korean
welcomes Kai published today as controls (same voices, same batch).

| | zho_for_hin | zho_for_tam | kor_for_hin (ctrl) | kor_for_tam (ctrl) |
|---|---|---|---|---|
| Duration | 51.760 s | 61.280 s | 51.840 s | 61.280 s |
| Size | 607.2 kb | 718.9 kb | 608.1 kb | 718.9 kb |
| Stream | 48 kHz mono 96 kbps | same | same | same |
| Overall RMS | −17.3 dB | −16.3 dB | −17.1 dB | −16.2 dB |
| Peak | −1.92 dB | −1.63 dB | — | — |
| Flat factor | 0.000 | 0.000 | 0.000 | 0.000 |
| **RMS at the cut** | **−40.9 dB** | **−149.7 dB** | −49.0 dB | −118.3 dB |

**Not truncated.** Neither file carries a trailing silence pad, so the truncation
trap does not apply here in its usual form — there is no pad to read by mistake.
`silencedetect` was used to locate where speech actually ends; in both files
speech runs to the end of the file, and the level in that final window decays to
−40.9 dB and −149.7 dB against a speech RMS of ≈ −17 dB. A cut mid-word would
read within a few dB of speech level. Both tails are 24 dB and 133 dB down.

**No clicks / no clipping.** Flat factor 0.000 and peak −1.9/−1.6 dB, consistent
with the pipeline's `loudnorm=I=-16:TP=-1.5` mastering. Peak count 2 (normal).

**Correct voice and language.** The per-language manifests bind each UUID to its
text: the hin→cmn clip's text names **चीनी** (Chinese), tam→cmn names **சீன**
(Chinese) — not कोरियाई / கொரிய (Korean). Rendered by the hin/tam voices above.

**Not accidental duplicates of the Korean clips.** The Tamil pair are byte-identical
in *size* (identical duration × constant 96 kbps), which is worth ruling out. MD5s
differ, and subtracting one signal from the other leaves −19.3 dB RMS — as loud as
the originals themselves. Genuinely different speech.

> Gap, stated plainly: there is no ASR on this host (no whisper), so the spoken
> language was **not** verified by transcription. The evidence above is
> text-binding + acoustic + differential, which is strong, but it is not ASR.

## 4. duration_ms — the export hole, confirmed and avoided

Both rows were linked with `duration_ms` **measured from the S3 object**:
51760 ms and 61280 ms.

This mattered. **3,682 of 4,396** entries in `_welcome_index.json` — every entry
flagged `skipped:true` — carry **no `duration_ms` field at all**. Both appliers
write `duration_ms: entry.duration_ms`, so linking straight from the index writes
NULL. That is not hypothetical:

> **kor_for_hin and kor_for_tam — published to beta today — both have
> `duration_ms: null` on their welcome rows** (inserted 2026-07-09 from
> `skipped:true` entries). Not touched, per rails. Recommend a fix.

The guard, located: the publish block scans only `manifest.slices[0].samples`
(`services/production-api.cjs:7949-7957`) while the welcome sits at the top-level
`introduction` key (`services/phases/generate-legacy-manifest.cjs:1610`) — so a
zero-duration welcome ships unchallenged. Reported, **not fixed**, as instructed.

Worth noting: a *separate* service does catch it —
`services/preflight-check-service.cjs:1017` — but its auto-fix **blanks the id**
(`intro.id = ''`), shipping no welcome rather than a broken one.

Also found: `upsert(..., { onConflict: 'course_code,text_normalized,language,role' })`
fails — no such unique constraint exists. Both toolkit appliers would error today.
Used a plain insert, guarded by a zero-count check.

## 5. Both courses are live to a learner

Verified through the app's own catalogue query (`App.vue:428-432`) run with the
**anon** key — a logged-out learner's browser, under RLS — not just a DB read-back:

```
anon-visible courses total: 82
VISIBLE  zho_for_hin  status=beta  "Chinese for Hindi Speakers"   tier=premium
VISIBLE  zho_for_tam  status=beta  "Chinese for Tamil Speakers"   tier=premium
VISIBLE  kor_for_hin  status=beta  "Korean for Hindi Speakers"    tier=premium
VISIBLE  kor_for_tam  status=beta  "Korean for Tamil Speakers"    tier=premium
```

Also reachable anonymously, per course: the welcome row with its correct
duration, 668 seeds, and a populated `course_round_index` (1353 / 1161 rows) —
so neither course hits the stale-view "one seed then INF PLAY" failure.

## 6. Legacy push — position unchanged

Kai's toolkit does **not** change it. Its only `course-configs` references are
hardcoded paths on Kai's Mac (`/Users/kaisaraceno/Documents/GitHub/course-configs`)
and concern UI **Translations**, not manifest publishing. No legacy-push capability
is in the commit; `COURSE_CONFIGS_REPO` is still unset here and the repo is still
not cloned on this server. Not attempted.

One new fact: the toolkit confirms course-configs **is checked out on Kai's Mac**,
so the legacy push is runnable from there — not from watson-1.
