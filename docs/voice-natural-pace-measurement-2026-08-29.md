# Voice natural-pace measurement — 2026-08-29

**Measure-only job.** Read-only SQL against `course_audio`. No writes, no audio generated, no code touched.

## 1. Headline

**Yes — TTS voices differ substantially in natural pace, within the same language, and the belt's fixed 0.8/0.9/0.95/1.0 multiplier cannot see it.** Across the whole estate, per-voice characters-per-second normalised to that language's median voice ranges from **0.57x to 1.67x** (a ~3x spread top-to-bottom), with 80% of voices (p10–p90) still spanning **0.84x–1.17x** — i.e. even excluding the extremes, the fastest common voice speaks ~40% faster than the slowest common voice in the same language. This is confirmed two ways: a content-uncontrolled probe (chars/sec per voice) and a **same-text, matched-pair gold standard** (identical `text_normalized` rendered by 2+ voices), which agree closely and rule out "it's just that voice's course has harder text."

## 2. Method

- **Metric**: `chars_per_sec = SUM(length(text_normalized)) / SUM(duration_ms) * 1000`, computed per `(language, voice_id, role)`.
- **Tail guard**: excluded `duration_ms < 1500` and `length(text_normalized) < 15`, to stop leading/trailing silence on short clips from dominating the ratio. Also excluded `duration_ms IS NULL OR <= 0`.
- **Origin**: restricted to `origin = 'tts'` throughout (human-recorded rows excluded — see gap note below).
- **Role held constant**: every aggregate groups by `role` as well as `language`/`voice_id` — never mixed `known`/`target1`/`target2`/`presentation` together, since role correlates with sentence length/register.
- Never compared across languages — chars/sec is only meaningful within one language.

## 3. Step A — probe (content not controlled)

Probe languages: **fra, spa, deu** (all have 5+ voices with 200+ qualifying clips each). Selected rows (full set in terminal output / reproducible via SQL below):

| language | voice_id | role | n | chars/sec |
|---|---|---|---:|---:|
| deu | xai_ara / ara | target1 | 8044–1012 | 17.92–17.94 |
| deu | azure_de-DE-KatjaNeural | target1 | 8310 | 9.31 |
| deu | leo / xai_leo | target2 | 8022–1038 | 16.96–17.02 |
| deu | azure_de-DE-ChristophNeural | target2 | 3887 | 9.05 |
| fra | eve / xai_eve | target1 | 6524–1006 | 19.33–19.38 |
| fra | azure_fr-FR-DeniseNeural | target1 | 4972 | 9.97 |
| fra | xai_leo | target2 | 7475 | 19.01 |
| fra | azure_fr-FR-ClaudeNeural | target2 | 4972 | 10.49 |
| spa | eve | known | 213 | 16.11 |
| spa | azure_es-ES-ElviraNeural | known | 9386 | 10.85 |
| spa | azure_es-MX-LucianoNeural | target2 | 10108 | 8.12 |
| spa | azure_es-ES-AlvaroNeural | target2 | 24140 | 10.08 |

Pattern: the small set of non-Azure "named" voices (`eve`, `ara`, `leo`, and their `xai_`-prefixed duplicates) consistently read **~1.7–2x faster** than the Azure Neural voices in the same language/role. This alone could in principle be a content-difficulty artefact (different courses draw different voices) — which is exactly why Step B exists.

## 4. Step B — gold standard (same text, different voices)

For fra/spa/deu there are hundreds to thousands of `text_normalized` values rendered by 2+ distinct voices in the same role (629–4960 matched texts per language/role pair). Restricting to matched clips only, with the same tail guard, and requiring ≥30 matched clips per voice:

| language | role | fastest voice | chars/sec | slowest voice | chars/sec | ratio |
|---|---|---|---:|---|---:|---:|
| deu | target1 | ara | 18.12 | azure_de-DE-KatjaNeural | 10.40 | 1.74x |
| deu | target2 | leo | 17.75 | azure_de-DE-ChristophNeural | 8.95 | 1.98x |
| fra | target1 | eve | 19.46 | azure_fr-FR-DeniseNeural | 9.58 | 2.03x |
| fra | target2 | xai_leo | 19.15 | azure_fr-FR-ClaudeNeural | 10.09 | 1.90x |
| spa | known | eve | 15.55 | es-AR-ElenaNeural | 9.44 | 1.65x |
| spa | target1 | eve | 15.77 | azure_es-ES-LaiaNeural | 7.96 | 1.98x |
| spa | target2 | es-ES-AlvaroNeural | 9.72 | azure_es-MX-LucianoNeural | 8.19 | 1.19x |

This closely matches Step A's uncontrolled numbers (e.g. fra target1 eve 19.33 uncontrolled vs 19.46 matched-text) — **confirming the spread is a genuine voice property, not a content artefact.** Full matched-pair table (all voices, ≥30 matched clips): `docs/voice-natural-pace-gold-standard-2026-08-29.tsv`.

## 5. Step C — estate-wide ratio table

Since the probe showed a real, large spread, extended to the whole estate: every `(language, voice_id, role)` with ≥100 qualifying clips, `chars_per_sec` normalised to that `(language, role)`'s **median** across voices.

**Distribution across all 454 (language, voice_id, role) rows:** min 0.567, p10 0.835, median 1.000 (by construction), p90 1.166, max 1.665.

Top of the table (fastest relative to their own language):

| language | role | voice_id | display_name | clips | chars/sec | ratio to median |
|---|---|---|---|---:|---:|---:|
| fra | target2 | xai_leo | — | 7475 | 19.01 | 1.665 |
| fra | target1 | xai_eve | — | 1006 | 19.38 | 1.525 |
| fra | target1 | eve | Eve | 6524 | 19.33 | 1.521 |
| spa | known | eve | Eve | 213 | 16.11 | 1.485 |
| fra | target1 | ara | Ara | 138 | 18.86 | 1.484 |
| ita | target2 | xai_leo | — | 679 | 15.07 | 1.431 |
| eng | known | eve | Eve | 7055 | 17.99 | 1.422 |
| deu | target1 | xai_ara | — | 1012 | 17.94 | 1.363 |
| deu | target1 | ara | Ara | 8044 | 17.92 | 1.361 |
| deu | target2 | leo | Leo | 8022 | 17.02 | 1.360 |

Bottom of the table (slowest relative to their own language):

| language | role | voice_id | display_name | clips | chars/sec | ratio to median |
|---|---|---|---|---:|---:|---:|
| ara | target1 | azure_ar-LB-LaylaNeural | — | 2889 | 5.36 | 0.567 |
| nld | target1 | azure_nl-NL-FennaNeural | — | 3546 | 8.40 | 0.577 |
| zho | known | azure_zh-CN-XiaochenNeural | — | 1140 | 5.96 | 0.638 |
| spa | target1 | azure_es-MX-CarlotaNeural | — | 10028 | 8.41 | 0.646 |
| ara | target2 | azure_ar-LB-RamiNeural | — | 2889 | 5.74 | 0.655 |
| tur | target1 | azure_tr-TR-AhmetNeural | — | 7926 | 9.40 | 0.661 |
| spa | target1 | azure_es-ES-LaiaNeural | — | 6483 | 8.71 | 0.669 |
| eng | target1 | en-GB-RyanNeural | Ryan | 126 | 8.72 | 0.692 |
| por | target1 | azure_pt-PT-RaquelNeural | — | 10742 | 8.61 | 0.695 |
| deu | target1 | azure_de-DE-KatjaNeural | — | 8310 | 9.31 | 0.707 |

Full table (455 rows, all languages/voices/roles with ≥100 clips): `docs/voice-natural-pace-estate-wide-2026-08-29.tsv`.

Note: the fastest outliers cluster on a small set of non-Azure voice IDs (`eve`, `ara`, `leo`, `xai_*` variants) that recur across several languages — these look like a shared narrator/voice-clone pool rather than per-language Azure Neural voices, and they are consistently ~1.3–1.7x faster than the Azure Neural voices they sit alongside. That is itself a candidate second finding (worth a follow-up), but this job's brief was pace measurement only, not voice-identity investigation.

## 6. SQL (reproducible)

**Step A — probe:**
```sql
SELECT language, voice_id, role,
  count(*) as n,
  round((sum(length(text_normalized))::numeric / sum(duration_ms)::numeric) * 1000, 3) as chars_per_sec
FROM course_audio
WHERE language IN ('fra','spa','deu')
  AND voice_id IS NOT NULL
  AND origin = 'tts'
  AND duration_ms >= 1500
  AND length(text_normalized) >= 15
GROUP BY language, voice_id, role
HAVING count(*) >= 200
ORDER BY language, role, chars_per_sec DESC;
```

**Step B — gold standard (matched text):**
```sql
WITH matched AS (
  SELECT language, role, text_normalized
  FROM course_audio
  WHERE language IN ('fra','spa','deu')
    AND origin='tts' AND duration_ms >= 1500 AND length(text_normalized) >= 15
  GROUP BY language, role, text_normalized
  HAVING count(distinct voice_id) >= 2
)
SELECT ca.language, ca.role, ca.voice_id,
  count(*) as n_matched_clips,
  round(avg(ca.duration_ms)::numeric, 1) as avg_duration_ms,
  round((sum(length(ca.text_normalized))::numeric / sum(ca.duration_ms)::numeric)*1000, 3) as chars_per_sec
FROM course_audio ca
JOIN matched m ON m.language=ca.language AND m.role=ca.role AND m.text_normalized=ca.text_normalized
WHERE ca.origin='tts' AND ca.duration_ms >= 1500 AND length(ca.text_normalized) >= 15
GROUP BY ca.language, ca.role, ca.voice_id
HAVING count(*) >= 30
ORDER BY ca.language, ca.role, chars_per_sec DESC;
```

**Step C — estate-wide ratio table:**
```sql
WITH agg AS (
  SELECT language, voice_id, role,
    count(*) as clip_count,
    (sum(length(text_normalized))::numeric / sum(duration_ms)::numeric) * 1000 as chars_per_sec
  FROM course_audio
  WHERE voice_id IS NOT NULL AND origin='tts'
    AND duration_ms >= 1500 AND length(text_normalized) >= 15
  GROUP BY language, voice_id, role
  HAVING count(*) >= 100
),
med AS (
  SELECT language, role, percentile_cont(0.5) WITHIN GROUP (ORDER BY chars_per_sec) as median_cps
  FROM agg
  GROUP BY language, role
)
SELECT a.language, a.role, a.voice_id, v.display_name, a.clip_count,
  round(a.chars_per_sec::numeric,3) as chars_per_sec,
  round((a.chars_per_sec / m.median_cps)::numeric, 3) as ratio_to_median
FROM agg a
JOIN med m ON m.language=a.language AND m.role=a.role
LEFT JOIN voices v ON v.voice_id=a.voice_id
ORDER BY a.language, a.role, ratio_to_median DESC;
```

## 7. Explicit gaps

- **Human-recorded (`origin != 'tts'`) rows were excluded entirely**, not measured against TTS. The brief suggested considering this; I did not attempt a human-vs-TTS pace comparison since it wasn't core to the ask (per-voice TTS correction) and human recordings likely have different silence/pause conventions that would need their own tail-guard tuning.
- **No per-course or per-learner breakdown** — this is a global per-voice measure across all courses that voice appears in. If a single voice_id is shared across multiple courses with very different content difficulty, that could still blend distinct "true" paces into one number; the gold-standard matched-text check (Step B) mitigates this for the three probe languages but Step C's estate-wide table does not have that control.
- **Did not investigate why `eve`/`ara`/`leo`/`xai_*` voices are consistently fast** (shared voice-clone pool, different TTS engine, or genuinely faster natural speech) — flagged as a candidate follow-up, out of scope for a pace-only measurement job.
- **Roles with too few qualifying clips were dropped** (the `HAVING count(*) >= 100` estate-wide / `>= 200` probe / `>= 30` matched-pair floors) — some low-volume voices in minor languages have no ratio in the estate-wide table at all. Not a measurement failure, just below the volume floor chosen to keep the aggregate noise-free.
- DB and box: no connectivity issues, no query timeouts, no need to bound further than stated (all queries ran in a few seconds each on watson-1).
