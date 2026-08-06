# French seed 1 now introduces its components

**Fixed.** `fra_for_eng` seed 1 had zero `phrase_role='component'` rows, so the
player had nothing to play and skipped straight from the intro to the build.
German had four. French now has four too, and the live API proves it.

**2 clips generated.** Everything else was already in the course and reused.

---

## The live API, before and after

`GET /api/courses/:code/cycles?from=S0001L01&limit=12` — the endpoint the player
actually calls, on the dev deployment.

**BEFORE — French skipped it**

| deu_for_eng | fra_for_eng |
|---|---|
| intro S0001L01 · I want → ich will | intro S0001L01 · I want → je veux |
| **component_intro · I → Ich** | *(nothing)* |
| **component_intro · Want → Will** | *(nothing)* |
| debut S0001L01 | debut S0001L01 |
| build S0001L01 | build S0001L01 |

**AFTER — French matches German**

| deu_for_eng | fra_for_eng |
|---|---|
| intro S0001L01 · I want → ich will | intro S0001L01 · I want → je veux |
| **component_intro · I → Ich** | **component_intro · I → je** |
| **component_intro · Want → Will** | **component_intro · want → veux** |
| debut S0001L01 | debut S0001L01 |
| build S0001L01 | build S0001L01 |

The second M-LEGO too — `from=S0001L04` (French) / `from=S0001L05` (German):

| deu_for_eng | fra_for_eng |
|---|---|
| intro · with you → mit dir | intro · with you → avec toi |
| **component_intro · With → Mit** | **component_intro · with → avec** |
| **component_intro · You → Dir** | **component_intro · you → toi** |
| debut | debut |

German's sequence is unchanged, which is the control: the same request shape
returns the same thing it always did.

---

## Audio: 2 clips generated, 14 reused

**Generated (2):** `toi` — target1 (Eve) and target2 (Leo). Nothing for "toi"
existed anywhere in the course.

**Reused (14), each verified alive on S3 before being linked:**

- English prompts: *I*, *want*, *with*, *you*
- French targets: *je*, *veux*, *avec* — both voices, 6 clips
- Narration: *"The French for: 'I', is:"* and the same for *want*, *with*, *you*
  — all four already existed

The narration script is the short form, which is what French uses in **1,617 of
1,617** existing component rows. German uses the longer "as in" form; French
does not, so French's own convention won.

### How the two new clips were chosen

Six takes were rendered — three per voice — measured, and the best of each kept.
The losing four are kept on disk, not deleted.

Two traps were checked for and cleared:

- **The tail-pad trap.** Mastering leaves ~100ms of digital silence after the
  speech, so the RMS of the last 50ms of the file reads the pad, not the voice —
  it scores −91 dB on *every* clip, healthy or chopped. Measuring the 50ms
  *ending where the speech ends* instead: all six takes decay by 15–42 dB into
  the pad, inside the 8–48 dB range measured on the already-shipped `je`, `veux`
  and `avec` clips. No take is truncated.
- **A false alarm from the language gate.** The TTS phonology gate rejected
  "toi" as English. It is wrong at this clip length: run on the *shipped,
  known-good* clips, the same detector calls `je` **Turkish** (p=0.24) and
  `veux` French at only p=0.39. Checked by content instead — every take
  transcribes as "Toi" with French forced, and as "Toa" with English forced,
  i.e. [twa], the correct French, never English "toy". The gate was bypassed for
  these two clips only.

---

## What changed in the database

- 4 new rows in `course_practice_phrases` (`phrase_role='component'`), mirroring
  the German rows field for field
- 2 new rows in `course_audio` + 2 new S3 objects
- 6 existing seed-1 rows moved up one `position` slot, so the components sit at
  1 and 2 — which is what 1,775 of French's 1,776 component rows already do.
  Nothing else about those rows changed.

Nothing was deleted and nothing was overwritten. Learner caches invalidate on
their own: the `content_stamp` trigger fired on the write.

Full rollback SQL and the complete before/after snapshot:
`docs/audio/fra-seed1-component-intros-2026-08-06-rollback.json`.

---

## Not touched

The 17-course seed-1 component backlog from the diagnosis — 13 of those courses
have component rows but no component audio anywhere in the course. That is a
separate, uncosted decision and was left alone.

## Gaps

- I did not open the app in a browser. The proof is the live dev API response,
  which is the JSON the player consumes — the final render and playback step is
  inferred, not observed.
- I did not trace *why* the 2026-03-11 French component backfill skipped seed 1
  (and seeds 3 and 4). Seeds 3 and 4 are still unexamined.

*Applied 2026-08-06, approved by Kai.*
