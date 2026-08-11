# Pod-0 translation state, per target language — survey 2026-08-11

Read-only survey. No writes, no audio, nothing triggered. Retry of the sub-survey orphaned by the
server restart (original worker 5e14bc7e, under the all-pods-scope-scout job).

## 1. Where pod text actually lives (verified against schema + code)

- **Canon (English only):** `canonical_pod_scenarios`, `pod_slug='pod-0'` — 231 rows, 22 scenes.
  Seeded from `docs/pods/pod0-english-canonical.md` by `tools/seed-canonical-pods.cjs`.
- **Translated pod text: `listening_pod_sentences`** — one row per line per course pod, keyed
  `<course>:<pod-slug>` in `listening_pods`. Columns that carry the text:
  `target_text` (target language), `known_text` (known language), plus `speaker`, `scene_number`,
  `sentence_number`, `global_order`, `explainer_text`, `target_text_draft`.
- **It is NOT in `course_seeds` / `course_practice_phrases`** — checked; pod text has its own table.
  `services/pod-dialogue-generator.cjs` reads canon and writes `listening_pod_sentences`; that is the
  only writer of pod line text.
- **Which column holds the English depends on the course direction.** For `X_for_eng` courses
  (known=eng) English is `known_text`; for `eng_for_X` courses (target=eng) English is `target_text`;
  for the seven non-English-anchored pods (known = spa or jpn) **neither column is English** — canon
  reaches those courses only through a translation of a translation.
- **`target_text_draft = true`** means machine-written target text nobody has proofread
  (`services/voice-engine/pods-router.cjs` `/drafts` — the proofreading queue; a PATCH clears it).

## 2. What "new" precisely means

Reconciled the new canon against the pre-rebuild snapshot committed with the rebuild
(`docs/pods/pod0-live-snapshot-2026-08-06.json`, 142 rows) by exact normalised text match:

- **142 old lines are consumed exactly once** by the new canon — nothing the old canon taught is lost.
- **89 lines are genuinely new** (not 91): scene 2 +3, scene 3 +7, scene 15 +10, scenes 16-21
  +11/+11/+11/+11/+11/+14.
- Old scene 15 ("First conversation", 12 lines) became **new scene 22** (11 lines) — so scene 22 is
  entirely carried-over text, and the new "Extra phrases" block is scenes 15-21.
- 5 canonical lines contain the literal placeholder `[target language]`; every course legitimately
  substitutes its own language name there, so a per-course English mismatch on those 5 is correct,
  not drift. Reuse figures below are stated out of 137, not 142.

## 3. Answers

**Q1 — is the new canon translated per language?** Binary across the fleet. Four pods have all 89 new
lines present and translated; **every other pod has 0 of 89**. There is no partial state anywhere.

| state | pods |
|---|---|
| all 89 new lines translated | `deu_at_for_eng:pod-0`, `spa_for_eng:pod-0-unrecorded`, `cym_n_for_eng:pod-0-unrecorded`, `cym_s_for_eng:pod-0-unrecorded` |
| 0 of 89 new lines (still 142 rows) | 63 pods |
| 0 sentence rows at all (header only) | `cym_n_for_eng:pod-0`, `cym_s_for_eng:pod-0` |

**Q3 — is the old translation still valid for the 140-odd carried lines?** The target text was written
against each pod's **own** `known_text`, and that English has drifted from canon on every `X_for_eng`
course. Where the pod's English still matches canon, its translation is reusable as-is; where the
English drifted, the existing translation is a translation of the drifted English, not of canon —
so it is reusable only if you accept the drifted English as the course's English. Drift ranges from
12 lines (`kor_for_eng`) to 67 lines (`fin_for_eng`), out of 137.

Three clean groups:
- **17 `eng_for_X` pods: 137/137, zero drift.** English is the *target* there, generator-written, never
  localised. Their carried translations (the known side) are fully aligned to canon.
- **7 non-English-anchored pods** (`cat_for_spa`, `eus_for_spa`, `deu_for_jpn`, `fra_for_jpn`,
  `ita_for_jpn`, `spa_for_jpn`, `zho_for_jpn`): all 130 scene-1-14 lines plus old scene 15 present and
  translated on both sides, 0 new lines. Matched positionally, since neither column is English.
- **39 `X_for_eng` pods**: drift 12-67 lines each; table below.

**Q2 answered in §1. Q4 table follows.**

## 4. Per-pod table
| pod | known → target | rows | carried-142 English matching canon | new 89 lines | unproofread draft rows |
|---|---|---|---|---|---|
| cym_n_for_eng:pod-0-unrecorded | eng → cym | 232 | reusable (137/137) | **89/89 translated** | 0 |
| cym_s_for_eng:pod-0-unrecorded | eng → cym | 232 | reusable (137/137) | **89/89 translated** | 104 |
| deu_at_for_eng:pod-0 | eng → deu | 232 | reusable (137/137) | **89/89 translated** | 155 |
| spa_for_eng:pod-0-unrecorded | eng → spa | 232 | reusable (137/137) | **89/89 translated** | 128 |
| cat_for_spa:pod-0 | spa → cat | 142 | 130/130 | 0/89 | 0 |
| deu_for_jpn:pod-0 | jpn → deu | 142 | 130/130 | 0/89 | 0 |
| eus_for_spa:pod-0 | spa → eus | 142 | 130/130 | 0/89 | 0 |
| fra_for_jpn:pod-0 | jpn → fra | 142 | 130/130 | 0/89 | 0 |
| ita_for_jpn:pod-0 | jpn → ita | 142 | 130/130 | 0/89 | 0 |
| spa_for_jpn:pod-0 | jpn → spa | 142 | 130/130 | 0/89 | 0 |
| zho_for_jpn:pod-0 | jpn → zho | 142 | 130/130 | 0/89 | 0 |
| ara_eg_for_eng:pod-0 | eng → ara | 142 | 115/137 (22 drifted) | 0/89 | 0 |
| ara_for_eng:pod-0 | eng → ara | 142 | 108/137 (29 drifted) | 0/89 | 0 |
| ara_sy_for_eng:pod-0 | eng → ara | 142 | 113/137 (24 drifted) | 0/89 | 0 |
| bul_for_eng:pod-0 | eng → bul | 142 | 111/137 (26 drifted) | 0/89 | 0 |
| cat_for_eng:pod-0 | eng → cat | 142 | 105/137 (32 drifted) | 0/89 | 0 |
| cym_n_for_eng:pod-0 | eng → cym | 0 | — | no rows | 0 |
| cym_s_for_eng:pod-0 | eng → cym | 0 | — | no rows | 0 |
| dan_for_eng:pod-0 | eng → dan | 142 | 91/137 (46 drifted) | 0/89 | 0 |
| deu_for_eng:pod-0 | eng → deu | 142 | 109/137 (28 drifted) | 0/89 | 0 |
| ell_for_eng:pod-0 | eng → ell | 142 | 105/137 (32 drifted) | 0/89 | 0 |
| eng_for_ara:pod-0 | ara → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_ben:pod-0 | ben → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_deu:pod-0 | deu → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_fra:pod-0 | fra → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_guj:pod-0 | guj → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_hin:pod-0 | hin → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_ita:pod-0 | ita → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_jpn:pod-0 | jpn → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_kor:pod-0 | kor → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_pan:pod-0 | pan → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_por:pod-0 | por → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_sin:pod-0 | sin → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_spa:pod-0 | spa → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_tam:pod-0 | tam → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_urd:pod-0 | urd → eng | 142 | 137/137 | 0/89 | 0 |
| eng_for_zho:pod-0 | zho → eng | 142 | 137/137 | 0/89 | 0 |
| est_for_eng:pod-0 | eng → est | 142 | 112/137 (25 drifted) | 0/89 | 0 |
| eus_for_eng:pod-0 | eng → eus | 142 | 111/137 (26 drifted) | 0/89 | 0 |
| fas_for_eng:pod-0 | eng → fas | 142 | 101/137 (36 drifted) | 0/89 | 0 |
| fin_for_eng:pod-0 | eng → fin | 142 | 70/137 (67 drifted) | 0/89 | 0 |
| fra_ca_for_eng:pod-0 | eng → fra | 142 | 110/137 (27 drifted) | 0/89 | 0 |
| fra_for_eng:pod-0 | eng → fra | 142 | 110/137 (27 drifted) | 0/89 | 0 |
| gle_for_eng:pod-0 | eng → gle | 142 | 103/137 (34 drifted) | 0/89 | 0 |
| heb_for_eng:pod-0 | eng → heb | 142 | 98/137 (39 drifted) | 0/89 | 0 |
| hin_for_eng:pod-0 | eng → hin | 142 | 90/137 (47 drifted) | 0/89 | 0 |
| hrv_for_eng:pod-0 | eng → hrv | 142 | 102/137 (35 drifted) | 0/89 | 0 |
| hye_for_eng:pod-0 | eng → hye | 142 | 95/137 (42 drifted) | 0/89 | 0 |
| isl_for_eng:pod-0 | eng → isl | 142 | 86/137 (51 drifted) | 0/89 | 0 |
| ita_for_eng:pod-0 | eng → ita | 142 | 114/137 (23 drifted) | 0/89 | 0 |
| jpn_for_eng:pod-0 | eng → jpn | 142 | 122/137 (15 drifted) | 0/89 | 0 |
| kor_for_eng:pod-0 | eng → kor | 142 | 125/137 (12 drifted) | 0/89 | 0 |
| lav_for_eng:pod-0 | eng → lav | 142 | 118/137 (19 drifted) | 0/89 | 0 |
| lit_for_eng:pod-0 | eng → lit | 142 | 112/137 (25 drifted) | 0/89 | 0 |
| nep_for_eng:pod-0 | eng → nep | 142 | 123/137 (14 drifted) | 0/89 | 0 |
| nld_for_eng:pod-0 | eng → nld | 142 | 105/137 (32 drifted) | 0/89 | 0 |
| nor_for_eng:pod-0 | eng → nor | 142 | 109/137 (28 drifted) | 0/89 | 0 |
| pol_for_eng:pod-0 | eng → pol | 142 | 97/137 (40 drifted) | 0/89 | 0 |
| por_br_for_eng:pod-0 | eng → por | 142 | 108/137 (29 drifted) | 0/89 | 0 |
| por_for_eng:pod-0 | eng → por | 142 | 112/137 (25 drifted) | 0/89 | 0 |
| ron_for_eng:pod-0 | eng → ron | 142 | 118/137 (19 drifted) | 0/89 | 0 |
| spa_for_eng:pod-0 | eng → spa | 142 | 92/137 (45 drifted) | 0/89 | 0 |
| spa_mx_for_eng:pod-0 | eng → spa | 142 | 105/137 (32 drifted) | 0/89 | 0 |
| swa_for_eng:pod-0 | eng → swa | 142 | 109/137 (28 drifted) | 0/89 | 0 |
| swe_for_eng:pod-0 | eng → swe | 142 | 105/137 (32 drifted) | 0/89 | 0 |
| tha_for_eng:pod-0 | eng → tha | 142 | 118/137 (19 drifted) | 0/89 | 0 |
| tur_for_eng:pod-0 | eng → tur | 142 | 102/137 (35 drifted) | 0/89 | 0 |
| ukr_for_eng:pod-0 | eng → ukr | 142 | 112/137 (25 drifted) | 0/89 | 0 |
| zho_for_eng:pod-0 | eng → zho | 142 | 124/137 (13 drifted) | 0/89 | 0 |
Column notes: *carried-142* counts old-canon lines whose English in the pod still matches canon
exactly (max 137 — the 5 `[target language]` lines are excluded as legitimate localisation; the seven
non-English pods are matched positionally, max 130). *draft rows* = `target_text_draft=true`, i.e.
machine target text not yet proofread.

## 5. Genuine ambiguities to flag

1. **`cym_n_for_eng:pod-0` and `cym_s_for_eng:pod-0` have zero sentence rows** — header rows only,
   both touched 2026-08-11. The Welsh new-canon text lives on the `-unrecorded` slugs. Which slug the
   learner reads is not resolved by this survey.
2. **`deu_at_for_eng:pod-0` carries a leftover 232nd row**, `SC15-S012`, empty `known_text` and
   `target_text`, `global_order=90142` — an orphan from the old 12-line scene 15. The other three
   updated pods have the same 232-row count, so all four carry it. Harmless but real.
3. **Draft flags do not mean what a zero implies on the old pods.** The four updated pods carry
   0/104/128/155 unproofread rows (cym_n is 0 — Aran proofread it). Every one of the 63 stale pods
   reports 0 drafts, but their text predates the flag, so 0 there means "never flagged", not
   "proofread". Don't read the stale pods as proofread.
4. **The seven non-English-anchored pods need canon routed through a pivot.** Canon is English; those
   courses hold no English column. Whether their new-line text is translated from English canon or
   from an already-translated sibling (e.g. `spa_for_eng` for the `*_for_spa` pods) is a decision, not
   a fact this survey can settle.
5. **Per-course English drift is confirmed at the line level and is mostly deliberate localisation**
   — language-name substitution and register (`fin_for_eng` rewrites the English colloquially:
   "Very well, thank you" for canon's phrasing). Whether re-canonicalising the carried English is in
   scope for the pod-0 update is the separate flag already raised, not resolved here.
