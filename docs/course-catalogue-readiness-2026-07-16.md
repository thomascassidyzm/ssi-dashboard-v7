# Course catalogue readiness audit — 2026-07-16

Founder ask: 10 courses were flagged app-visible (`new_app_status='beta'`) while
their content `status` was still `'draft'`. Rather than blanket-hiding them,
checked actual content readiness against healthy reference courses and acted
on the clear cases.

## The 10 (identified by `new_app_status='beta' AND status='draft'`)

`eng_for_deu`, `eng_for_fra`, `eng_for_ita`, `eng_for_kor`, `eng_for_por`,
`eng_for_spa`, `fra_ca_for_eng`, `por_br_for_eng`, `spa_mx_for_eng`, `zho_for_jpn`.

## Method

- Canon references: 300-seed courses compared to other released 300-seed
  courses (e.g. `eng_for_ara`); 668-seed courses compared to `zho_for_eng`
  (released, 100% audio).
- **Audio coverage** measured directly from `target1_audio_id IS NOT NULL` on
  `course_legos` and `course_practice_phrases` — the actual playable-audio
  signal, not a proxy.
- **First-gap depth** = earliest `seed_number` with a missing LEGO audio file
  (`MIN(seed_number) WHERE target1_audio_id IS NULL`). Free-tier / preview
  depth in the learner app is **seed 19** (Yellow belt, `PREMIUM_PREVIEW_MAX_SEED`
  in `ssi-learning-app/api/_utils/audioAccess.ts`); belt ladder for framing
  depth: White 0 · Yellow 8 · Orange 20 · Green 40 · Blue 80 · Purple 150 ·
  Brown 280 · Black 400.
- Checked for structural breakage: blank known/target text (none found),
  and `course_round_index` materialised-view freshness (see note below).

## Results

| Course | Seeds built vs canon | LEGO audio | Phrase audio | First audio gap | Verdict |
|---|---|---|---|---|---|
| eng_for_deu | 300/300 | 100% | 100% | none — fully built | **PROMOTE** |
| eng_for_fra | 300/300 | 100% | 100% | none — fully built | **PROMOTE** |
| eng_for_ita | 300/300 | 100% | 100% | none — fully built | **PROMOTE** |
| eng_for_kor | 300/300 | 100% | 100% | none — fully built | **PROMOTE** |
| eng_for_por | 300/300 | 100% | 100% | none — fully built | **PROMOTE** |
| eng_for_spa | 300/300 | 100% | 100% | none — fully built | **PROMOTE** |
| zho_for_jpn | 300/300 | 99.8% (547/548) | 100% | seed 34 — a single isolated missing LEGO clip, not a wall (course resumes normally after) | **PROMOTE** |
| por_br_for_eng | 668/668 | 43.5% overall, but **100% through seed 232** | 44.7% overall | seed 233 — well past Purple-belt depth (150), deep into the tail | **PROMOTE** |
| spa_mx_for_eng | 668/668 | 49.8% overall, but **100% through seed 300** | 57.0% overall | seed 301 — Brown-belt depth (280); known SPA_MX display bug already fixed in code | **PROMOTE** |
| fra_ca_for_eng | 668/668 (translated + LEGO'd) | **0%** | **0%** | seed 1 — immediate wall, no audio anywhere in the course | **HIDE** |

No BORDERLINE cases — the audio-coverage signal split the 10 cleanly. 9 of
10 have deep, contiguous audio from seed 1 (either the whole 300-seed course,
or well past free-tier/Purple-belt depth for the two big 668-seed courses);
only `fra_ca_for_eng` has zero audio despite full text/LEGO content, which is
an unambiguous learner-facing wall.

### Structural note (not a promote/hide factor here, flagged for follow-up)

`course_round_index` (the materialised view `round-map.ts` actually reads,
per `CLAUDE.md`) is capped at `max(seed_number)=300` for **all** ten courses,
including `por_br_for_eng` and `spa_mx_for_eng` whose LEGOs/audio run to
seed 668/300 respectively. For those two the binding constraint today is
still the audio gap (233 / 301), which sits at or before the view's cap, so
this isn't yet a live symptom — but the view needs
`REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index` before deeper
audio passes on those two courses will actually reach learners. Logged as a
[NEEDS TOM EVIDENCE]-style follow-up, not actioned here (out of the read-only
+ status-flip scope of this pass).

## Actions taken

- **PROMOTE → `status='beta'`** (aligns content status with the already-public
  `new_app_status='beta'` flag): `eng_for_deu`, `eng_for_fra`, `eng_for_ita`,
  `eng_for_kor`, `eng_for_por`, `eng_for_spa`, `por_br_for_eng`,
  `spa_mx_for_eng`, `zho_for_jpn`.
- **HIDE → `new_app_status='draft'`** (pulls app-visibility back to match the
  actually-draft content; reversible): `fra_ca_for_eng`.

Both flips are additive/reversible single-column UPDATEs, scoped to
`course_code` + prior-state guard (`WHERE status='draft' AND new_app_status='beta'`),
verified by `RETURNING`.
