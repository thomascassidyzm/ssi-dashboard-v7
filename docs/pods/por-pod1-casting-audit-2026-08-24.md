# por_for_eng Pod 1 — text/casting construction + served-audio spot-check

**2026-08-24. Parallel sweep alongside the ita_for_eng pod-1 investigation. Scope: `por_for_eng:pod-1` only.**

## Headline verdict: **INFECTED**

Same disease family as `ita_for_eng:pod-1` (`docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`), and worse in scale: the **split-clip columns** (`sentence_audio_ids` / `sentence_known_audio_ids` on `listening_pod_sentences` — used by `podSentenceSplit` for multi-sentence turns) carry **wrong-voice audio on 353 of 478 referenced clips (74%)**, spread across **91 of 231 rows** and **scenes 1–15** (every dialogue scene checked). The whole-turn columns (`target_audio_id` / `known_audio_id`) are clean.

This is not a metadata artefact: clips were fetched live through the real learner route (`GET https://saysomethingin.app/api/audio/<id>`, not S3 direct) and STT-confirmed to carry the *right text* — it is a voice swap, not a content swap, exactly the ita pattern.

---

## 1. TEXT/CASTING CONSTRUCTION (DB canon)

Checked against `listening_pods.speakers` + `listening_pod_sentences` for `por_for_eng:pod-1` (live, 231 rows, 22 scenes), using the six-check template from `docs/pods/spa-pod1-casting-construction-audit-2026-08-24.md`.

| Check | Result |
|---|---|
| C1 Voice inventory | **PASS** — exactly 2 target voices (`eve` f / `rex` m), exactly 2 known voices (`bedd6226` f / `gfzdpspr5fdp` m = clone+Olivia). 28 characters, all resolve to one of these two pairs. |
| C2 Resolution | **PASS** — 0 blank/unresolved `speaker` values across 231 rows. |
| C3 Speaker-stability | **PASS** — every canonical character has exactly one voice pair for the whole pod. |
| C4 Scene cast size | **FAIL, 3 scenes** — Scene 7 (Cafe Barista + 3 customers, 4 chars), Scene 8 (Bartender + 3 customers, 4 chars), Scene 9 (Waiter + 2 diners, 3 chars). Identical shape to the Spanish audit's scenes 7/8/9 — this looks like a shared script template across courses, not a por-specific defect. |
| C5 Adjacent same-voice hand-offs | **10 hand-offs** (scene 7×1, scene 8×5, scene 9×4) — same count and same scene distribution as the Spanish audit. Accepted cost under the 2026-08-08 casting rule for >2-character scenes; not re-optimised for por specifically, matching the Spanish finding. |
| C6 Gender agreement | Not checked (por marks gender in Portuguese; time-boxed out of this 20-min pass — flag for a follow-up if wanted). |

**Verdict on text/casting construction alone: clean of the "wrong voice, wrong content" disease** — the whole-turn cast wiring is correct and matches the declared two-voice pair everywhere. This part is CLEAN.

## 2. SERVED AUDIO SPOT-CHECK — INFECTED

**Same-day recast history, same shape as ita:** `por_for_eng:pod-1` (live) and `por_for_eng:pod-1-retired-2026-08-24` (held) share an identical `created_at` (`2026-08-24T08:30:56.067Z`), with `por_for_eng:pod-0-retired-2026-08-22` predating both. This is the same same-day-recast fingerprint that produced the ita bug (some columns re-derived onto the new cast, others not).

**Method**: pulled all 231 `listening_pod_sentences` rows, resolved every audio id referenced (`target_audio_id`, `known_audio_id`, and every id inside `sentence_audio_ids` / `sentence_known_audio_ids`) against `course_audio.voice_id` — 923 distinct ids, all resolved, zero missing. Compared each clip's actual `voice_id` to the voice the row's speaker is cast to in `listening_pods.speakers`. Spot-fetched a sample of flagged clips through the live learner route (`saysomethingin.app/api/audio/<id>`, 200 OK, real bytes) and ran local Whisper STT on two of them — both transcribed correctly against their claimed text (`"Bom dia."` / `"No, it's free."`), confirming these are the right *clips*, wrong *voice*.

**Findings:**

| Column | Referenced ids | Wrong-voice ids | Rate |
|---|---|---|---|
| `target_audio_id` (whole-turn) | 231 | 0 | 0% — clean |
| `known_audio_id` (whole-turn) | 231 | 0 | 0% — clean |
| `sentence_audio_ids` (split target) | ~239 | 135 | ~56% |
| `sentence_known_audio_ids` (split known) | ~239 | 218 | ~91% |
| **Total split-clip ids** | **478** | **353** | **74%** |

**The wrong voices are not just off-cast within por — several are from entirely different courses/providers**, confirming cross-contamination rather than a simple gender flip:

- `ara` / `xai_ara` (68 clips) — this is **Italian's cast female voice** (`ita_for_eng`'s Ara, per `docs/pods/ita-pod1-served-bytes-speaker-census-2026-08-24-data.json`), showing up on por's target track where `eve` is cast.
- `leo` / `xai_leo` (69 clips), `sal` / `xai_sal` (34 clips), `bedd6226`/`gfzdpspr5fdp` swapped onto the wrong gender's slot (47 clips) — none of these are por's declared pair.
- `en-GB-SoniaNeural`, `en-GB-HollieNeural`, `en-GB-LibbyNeural`, `en-GB-RyanNeural` (Azure voices, 94 clips combined) — **not xai at all**; por's known track is cast to the xai clone (`gfzdpspr5fdp`)/Olivia (`bedd6226`), never Azure.

**Affected rows: 91 of 231 (39%), scenes 1 through 15** (every dialogue scene has at least one affected row; scenes 16–22 are single-line Learner drills with no split arrays, so untouched).

**Representative failing clips** (full 353-row list: `por-real-mismatches.json`, raw per-clip data alongside this doc):

| Scene | global_order | Speaker | Column | Clip id | Expected voice | Actual voice | Clip text (STT/DB) |
|---|---|---|---|---|---|---|---|
| 1 | 2 | Sarah | split_target | `97ea3ffa-e6f3-4bb7-97ed-22ed495e0019` | eve | **ara** (Italian cast) | "Bom dia." ✓ correct text |
| 1 | 3 | Neighbour | split_known | `6f6579e1-8478-4715-9bf1-cc5d586a6722` | gfzdpspr5fdp | **leo** | "I'm very well, thank you." |
| 1 | 4 | Sarah | split_target | `2e6eb006-1e5f-4ddf-8981-df821ebd9a37` | eve | **ara** | "Sim, tenho um dia muito ocupado hoje." |
| 2 | 6 | Passenger | split_target | `ec0fcd73-b2e3-4bfc-9c45-278f1b79128a` | rex (m) | **eve** (f) | "Não, está livre." — gender-crossed |
| 2 | 6 | Passenger | split_known | `62662800-aa24-40e3-b0e5-7521ac85353f` | gfzdpspr5fdp | **en-GB-SoniaNeural** (Azure) | "No, it's free." ✓ correct text, confirmed live via production URL + STT |

## 3. Explicit gaps

- Did not run C6 (gender agreement text check) or the C4/C5 max-cut optimum re-derivation — time-boxed to the split-clip disease, which is the material finding.
- Did not STT/byte-verify all 353 flagged clips individually — sampled 3 through the production route, 2 STT-confirmed. Given the `voice_id` field alone (sourced from `course_audio`, the same table that drives what actually gets served) is direct DB evidence, not inferred, the sample was to corroborate the serving path, not to establish the defect.
- Did not check `por_br_for_eng` (Brazilian Portuguese) — out of the assigned scope (`por_for_eng` only), but it shares the same casting/recast machinery per the doc filenames in `docs/pods/`; worth a follow-up pass if the ita crew's fix is applied estate-wide.

## 4. Relationship to the ita root-cause

This independently reproduces the mechanism identified in `docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`: a same-day pod-1 recast re-derived the whole-turn columns onto the new two-voice cast but left the split-clip columns (`sentence_audio_ids`/`sentence_known_audio_ids`) unrepaired. For por_for_eng, the unrepaired arrays don't just carry a stale *same-course* voice (as in ita's scene 15) — they carry ids resolving to voices from other courses and providers entirely, suggesting the split arrays here were never correctly derived for pod-1 at all, or were inherited from a much earlier/different source than pod-0. That provenance question is for the ita crew's mechanism work, not this evidence-only sweep.

No fix applied. No clip touched. No pointer changed. No audio generated.
