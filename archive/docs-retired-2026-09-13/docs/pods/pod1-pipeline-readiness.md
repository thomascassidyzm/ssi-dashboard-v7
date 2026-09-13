# Pod-1 pipeline readiness — dry-run (read-only)

2026-07-16. No writes to Supabase content tables, no TTS rendered. DB reads via
`.env.psql` / `/opt/homebrew/opt/postgresql@17/bin/psql`; tooling verified by
reading source + `node -e require(...)` syntax/module checks + running the one
existing automated test (`services/shared/ellipsis-ssml.test.js`, PASS).

## Summary

Pod-1 canon (`canonical_pod_scenarios` pod_slug='pod-1') is 196 English lines
across 14 scenes. `hrv_for_eng` is the only course with a pod-1 draft
(`hrv_for_eng:pod-1`, 180 rows, no audio) — everything else in the pod-0 estate
(64 course_codes, ~66 pod rows counting `spa_for_eng`'s two `choice` pods) has
pod-0 only.

**Voice readiness is the main blocker class, and it's small**: of 64 course
pairs, **9 are blocked-on-voices** — `cym_n_for_eng` / `cym_s_for_eng` (no
Welsh target pool at all) and 7 `eng_for_<Indic>` courses (`ben`, `guj`, `pan`,
`sin`, `tam`, `urd`) whose *known*-side pool is empty. Every other pair has ≥1
f + ≥1 m voice on both sides and is voice-green for pod-1's 2-speaker,
mixed-gender scene requirement. The Azure ellipsis-SSML shim is already wired
(`services/shared/ellipsis-ssml.cjs`, into both `tts-service.cjs` and
`azure-tts-service.cjs`) and its unit test passes — 38 of 64 pairs pick an
Azure voice on at least one side (rank 0), so the shim is live and load-bearing
for the majority of the estate, not a corner case.

**Tooling readiness is the real gap, and it's structural, not per-course**:
`tools/breakdown-flat.cjs`, `tools/breakdown-fine.cjs`, and
`tools/audit-fine-seams.cjs` are all **hardcoded to `${course}:pod-0`** in
their `listening_pod_sentences` query (`.eq('pod_id', \`${COURSE}:pod-0\`)`) —
none of the three currently accept a pod-1 (or any non-pod-0) row at all; they
need a slug/pod-level parameter added before they can touch `hrv_for_eng:pod-1`
or any future pod-1 course. Separately, `tools/insert-ellipsis-seams.cjs` (the
tool that actually enforces the C=8/C=12 syllable ceiling) *is* already
parameterized by pod-level, but its syllable counter is **Croatian-specific**
(vowel + flanked-syllabic-r heuristic) — it will silently miscount syllables
for every other language until a per-language (or language-family) counter is
added. Today it has plausibly only ever been run against `hrv_for_eng`.

**hrv drift is a single missing scene, not row-level rot**: `hrv_for_eng:pod-1`
has all 13 of canon's first 13 scenes at exact matching per-scene counts;
100% of the 196-180=16 row deficit is **scene 14 ("Catching Up", 16 lines)
never having been generated**. This is a clean `mode:'resume'` (or `sync`) call
away — it will only touch scene 14, since 1–13 already have rows.

Translation/generation tooling (`services/pod-dialogue-generator.cjs`) is
confirmed to (a) load and export cleanly, (b) invoke via
`POST /api/admin/pods/generate {courseCode, slug, mode}` → `generatePodBatch`,
which is how the hrv pod-1 draft was actually produced (`source_file:
'generated:canonical'` in the DB, cross-referenced against commit `301c0e12`
"pods: pod-1 scene review pack + voice-gender name-list fix", 2026-07-14), and
(c) degrade gracefully on a missing voice pool (catches the `assignVoices`
throw, writes `{_default:{deferred:true}}` + a `voiceNote`, does NOT block
draft text generation) — so the 9 voice-blocked pairs above can still get
pod-1 **text** drafted; they're blocked only for **audio**.

---

## Per-pair table

Legend: pool counts are `f=N,m=N` female/male voices available at
`app_config.pod_voice_pools[langKey]`; providers are the **rank-0** pick per
gender (what `assignVoices` in `tools/pod-sync.cjs` actually casts first —
rank-1 only matters for a second same-gender speaker in a scene, and reuses
rank-0 when a pool has only one voice of that gender). `known_lang`/`target_lang`
are courses.known_lang / courses.target_lang (already base ISO codes);
`langKey()` (tools/pod-sync.cjs) is idempotent on these except for the
`fra_ca`/`cym_n` etc. course-code-only variants, which all resolve through the
DB columns, not the course_code prefix.

| course_code | target pool f/m (rank0 provider) | known pool f/m (rank0 provider) | azure-shim needed | verdict |
|---|---|---|---|---|
| ara_eg_for_eng | 2/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| ara_for_eng | 2/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| ara_sy_for_eng | 2/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| bul_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| cat_for_eng | 3/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| cat_for_spa | 3/3 (xai/xai) | 3/3 (xai/xai) | no | green |
| **cym_n_for_eng** | **0/0 (MISSING)** | 5/5 (xai/xai) | — | **blocked-on-voices (no Welsh target pool)** |
| **cym_s_for_eng** | **0/0 (MISSING)** | 5/5 (xai/xai) | — | **blocked-on-voices (no Welsh target pool)** |
| dan_for_eng | 3/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| deu_for_eng | 2/2 (xai/xai) | 5/5 (xai/xai) | no | green |
| deu_for_jpn | 2/2 (xai/xai) | 1/1 (azure/azure) | YES | green |
| ell_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| eng_for_ara | 5/5 (xai/xai) | 2/3 (xai/xai) | no | green |
| **eng_for_ben** | 5/5 (xai/xai) | **0/0 (MISSING)** | — | **blocked-on-voices (no Bengali known pool)** |
| eng_for_deu | 5/5 (xai/xai) | 2/2 (xai/xai) | no | green |
| eng_for_fra | 5/5 (xai/xai) | 1/1 (azure/azure) | YES | green |
| **eng_for_guj** | 5/5 (xai/xai) | **0/0 (MISSING)** | — | **blocked-on-voices (no Gujarati known pool)** |
| eng_for_hin | 5/5 (xai/xai) | 3/2 (xai/xai) | no | green |
| eng_for_ita | 5/5 (xai/xai) | 2/3 (xai/xai) | no | green |
| eng_for_jpn | 5/5 (xai/xai) | 1/1 (azure/azure) | YES | green |
| eng_for_kor | 5/5 (xai/xai) | 1/2 (azure/xai) | YES | green |
| **eng_for_pan** | 5/5 (xai/xai) | **0/0 (MISSING)** | — | **blocked-on-voices (no Punjabi known pool)** |
| eng_for_por | 5/5 (xai/xai) | 1/1 (azure/azure) | YES | green |
| **eng_for_sin** | 5/5 (xai/xai) | **0/0 (MISSING)** | — | **blocked-on-voices (no Sinhala known pool)** |
| eng_for_spa | 5/5 (xai/xai) | 3/3 (xai/xai) | no | green |
| **eng_for_tam** | 5/5 (xai/xai) | **0/0 (MISSING)** | — | **blocked-on-voices (no Tamil known pool)** |
| **eng_for_urd** | 5/5 (xai/xai) | **0/0 (MISSING)** | — | **blocked-on-voices (no Urdu known pool)** |
| eng_for_zho | 5/5 (xai/xai) | 3/3 (xai/xai) | no | green |
| est_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| eus_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| eus_for_spa | 1/1 (azure/azure) | 3/3 (xai/xai) | YES | green |
| fas_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| fra_ca_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| fra_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| fra_for_jpn | 1/1 (azure/azure) | 1/1 (azure/azure) | YES | green |
| gle_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| heb_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| hin_for_eng | 3/2 (xai/xai) | 5/5 (xai/xai) | no | green |
| **hrv_for_eng** | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | **green — pilot, pod-1 draft exists (180/196 rows)** |
| hye_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| isl_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| ita_for_eng | 2/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| ita_for_jpn | 2/3 (xai/xai) | 1/1 (azure/azure) | YES | green |
| jpn_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| kor_for_eng | 1/2 (azure/xai) | 5/5 (xai/xai) | YES | green |
| lav_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| lit_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| nep_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| nld_for_eng | 3/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| nor_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| pol_for_eng | 3/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| por_br_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| por_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| ron_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| spa_for_eng | 3/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| spa_for_jpn | 3/3 (xai/xai) | 1/1 (azure/azure) | YES | green |
| spa_mx_for_eng | 3/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| swa_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| swe_for_eng | 3/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| tha_for_eng | 3/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| tur_for_eng | 1/2 (azure/xai) | 5/5 (xai/xai) | YES | green |
| ukr_for_eng | 1/1 (azure/azure) | 5/5 (xai/xai) | YES | green |
| zho_for_eng | 3/3 (xai/xai) | 5/5 (xai/xai) | no | green |
| zho_for_jpn | 3/3 (xai/xai) | 1/1 (azure/azure) | YES | green |

55 green / 9 blocked-on-voices (all blocked pairs have full pools on the
*other* side — deferred-voice draft-text generation still works for them).
`spa_for_eng`'s two `choice`-type pods (`music`, `travel-situations`) are not
pod-1 targets and excluded from this table.

---

## Tooling

**Translation/generation entry point** — `services/pod-dialogue-generator.cjs`,
`generatePodBatch({courseCode, podSlug, force, mode, deadlineMs, maxScenes, log})`.
- CLI: `node services/pod-dialogue-generator.cjs <courseCode> [--force|--sync|--relabel] [--max=N]` — CLI hardcodes no `--slug`, so a CLI pod-1 run needs a one-line addition (or call `generatePodBatch` directly with `podSlug:'pod-1'`, as the API route already does).
- API: `POST /api/admin/pods/generate {courseCode, slug, force, mode}` → the actual call site with a `slug` param, `deadlineMs:45_000, maxScenes:4` bounded per call, UI loops on `more_remaining`. **This is how the hrv pod-1 draft was produced** — confirmed via `listening_pods.source_file = 'generated:canonical'` for `hrv_for_eng:pod-1`, cross-referenced against commit `301c0e12` (2026-07-14, "pods: pod-1 scene review pack + voice-gender name-list fix", which also fixed a real casting bug: 5 female names missing from `pod-sync.cjs`'s gender lists, defaulting them to male voices).
- No dry-run mode exists in `generatePodBatch` itself (no flag skips the Claude CLI call or the DB write) — verified by reading the full function body, not exercised live per the read-only mandate. Verified instead via `node -e "require('./services/pod-dialogue-generator.cjs')"` (loads cleanly, exports `generatePodBatch, generateScene, validateScene, parseLines, loadCanonicalScenes, loadCourse, buildPodGlossary, parseNameMap, localiseSpeakerLabel, relabelPodSpeakers`) and CLI `--help`-less usage line.
- Voice-pool-missing degrades gracefully: `upsertPodRow` catches the `assignVoices` throw and writes `speakers: {_default:{deferred:true}, ...}` + a `voiceNote` string returned in the result — draft **text** generation is never blocked by a missing voice pool (confirmed by reading the code, lines ~294–303).

**Breakdown tools — BLOCKED for pod-1 as shipped**, hardcoded pod-0:
- `tools/breakdown-flat.cjs` — `.eq('pod_id', \`${COURSE}:pod-0\`)` (×2, lines 125 & 143). RULES prompt text does correctly call out `…` as a sentence boundary the atom map must not cross ("NEVER cross a sentence boundary (. ! ? …)").
- `tools/breakdown-fine.cjs` — same hardcode (line 114); mechanical `tileAndSnap()` sentence-splits on `/(?<=[.!?。！？…؟])/` (line 85) so `…` IS enforced as a seam at the code level regardless of the LLM's output — but the RULES prompt text itself (line 70) doesn't list `…` among the "mandatory seam" punctuation it tells the model about (minor prompt-doc gap, not a functional gap, since the mechanical tiler is the real gate).
- `tools/audit-fine-seams.cjs` — same hardcode (line 99); `SENTENCE_PUNCT` regex does include `…`.
- **None of the three accept a `--slug`/pod-level argument today.** To run any of them against `hrv_for_eng:pod-1` (or any future pod-1 course) requires a small parameterization change first — not exercised live (would require a code edit, out of scope for a read-only dry-run).
- `tools/insert-ellipsis-seams.cjs` — the one tool built for this ladder and **is** parameterized (`node insert-ellipsis-seams.cjs <course> <pod-level> <ceiling C> [orders] [--dry]`, `POD_ID = \`${COURSE}:pod-${POD_LEVEL}\``), so it already runs against pod-1 by design. **But its `countSyllables()` is Croatian-specific** (vowel count + flanked syllabic-r heuristic; header comment says explicitly "HRV-specific — fine for now, since this backfill pass is hrv_for_eng-only"). Running it against any non-Croatian pod-1 target today will silently produce wrong syllable counts, not an error — a real correctness risk if someone runs it against, say, `spa_for_eng:pod-1` before a generic/per-language counter exists.

**Tests run**: `node services/shared/ellipsis-ssml.test.js` → **exit 0, all assertions pass** (only automated test found under this feature; no test suite covers `breakdown-flat`/`breakdown-fine`/`audit-fine-seams`/`insert-ellipsis-seams` themselves).

---

## hrv_for_eng pod-1 drift (180 vs 196)

Per-scene comparison, canon (`canonical_pod_scenarios` pod_slug='pod-1') vs
live draft (`listening_pod_sentences` pod_id='hrv_for_eng:pod-1'):

| scene | title | canon | hrv draft | delta |
|---|---|---|---|---|
| 1 | The Journey In | 13 | 13 | 0 |
| 2 | The Weekend | 14 | 14 | 0 |
| 3 | Making Plans | 13 | 13 | 0 |
| 4 | Family | 14 | 14 | 0 |
| 5 | Under the Weather | 14 | 14 | 0 |
| 6 | How's the New Job? | 14 | 14 | 0 |
| 7 | The New Flat | 14 | 14 | 0 |
| 8 | Photos on the Phone | 14 | 14 | 0 |
| 9 | Last Night's Film | 14 | 14 | 0 |
| 10 | Where I Grew Up | 14 | 14 | 0 |
| 11 | Holiday Stories | 14 | 14 | 0 |
| 12 | What Are You Learning? | 14 | 14 | 0 |
| 13 | Good News | 14 | 14 | 0 |
| 14 | Catching Up | 16 | **0 (missing entirely)** | **-16** |
| **total** | | **196** | **180** | **-16** |

**100% of the drift is one missing scene** (14, "Catching Up" — real content
confirmed present in canon, e.g. "Hannah! I don't believe it. It must be two
years, at least." / "It really must be..."), not row-level corruption within
scenes 1–13, which match canon exactly. `mode:'resume'` (the API/CLI default)
already skips scenes with existing rows via `generatedSceneNumbers(podId)`, so
re-running generation for `hrv_for_eng` pod-1 would only touch scene 14 —
low-risk, no re-flex of the 180 verified rows. (`listening_pods.metadata.
scene_hashes` for this pod is currently empty/unset, so a `mode:'sync'` call
would fall back to `sceneChangedByContent` — a line-count diff — which would
correctly detect scenes 1–13 as unchanged (canon counts equal draft counts)
and scene 14 as new/changed.)

One row in the hrv pod-1 draft already contains a `…` ellipsis-seam character,
confirming the founder ellipsis pass has at least partially touched pod-1
target_text; 0 rows have any audio (`target_audio_id`/`known_audio_id` both
null across all 180 rows) — confirmed still a clean draft, consistent with the
"no audio = reviewable/editable" design.
