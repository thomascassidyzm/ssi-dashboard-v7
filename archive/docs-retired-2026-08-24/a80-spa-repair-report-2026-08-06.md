# A-80 — the Spanish repair batch, done; and the 14 rows I deliberately did not touch

**2026-08-06.** Tom ruled YES on the second-opinion verdict: keep the 349 rewritten Spanish
practice phrases, repair the flagged rows first, then generate the clips. This is what landed.

---

## 1. What was repaired (7 rows, applied and verified against the live DB)

Every row was read from `course_practice_phrases` before and after; the gate asserted the
before-state, LEGO **target** containment, known-side ZUT uniqueness, and no parentheses, per row.
All 7 had **no audio linked** — `known_audio_id`, `target1_audio_id`, `target2_audio_id` and
`presentation_audio_id` were all null — so nothing was orphaned and make-before-break did not bite.

| Row | Before | After | Why |
|---|---|---|---|
| `S0519L03B03` | el mismo problema con su **nuevo bebé** | …con su **bebé nuevo** | LEGO teaches `su bebé nuevo`; the rewrite drilled the other order |
| `S0519L03U02` | no he visto a su **nuevo bebé** | …a su **bebé nuevo** | same |
| `S0519L03U05` | los dos vinieron solos con su **nuevo bebé** | …con su **bebé nuevo** | same |
| `S0567L02U04` | es buena idea **seguir pasando** tiempo al aire libre… | es buena idea **pasar** tiempo al aire libre… | re-conjugation; LEGO chunk is `pasar tiempo al aire libre` |
| `S0567L03U05` | no me importa si quieres irte **sin ver** a los niños jugar | no me importa si quieres **seguir viendo** a los niños jugar | re-conjugation; the `seguir viendo` frame is already proven at sibling `U04` |
| `S0547L02U04` | te toca a ti buscar **un lugar seguro** en el barro | te toca a ti buscar **al perro** en el barro | tier-2 clunky USE — "somewhere safe in the mud" needs a lot of context; `al perro` is proven at sibling `U02` |
| `S0661L01B03` | lo que estáis haciendo | **lo estáis haciendo muy bien** | the over-heavy edit: a good phrase had been spent to fix a missing `lo`. Restored, with the one-word fix applied |

Known sides moved with them where the English needed to follow (`to keep spending`→`to spend`,
`to leave without watching`→`to keep watching`, `somewhere safe`→`the dog`, `what you're all
doing`→`you're all doing very well`). No new vocabulary was introduced anywhere: every substitution
comes from the row itself, its siblings at the same LEGO, or the seed.

Logs: `docs/a80-spa-repair-dryrun-log.json`, `docs/a80-spa-repair-applied-log.json`.
Script: `scripts/a80-repair-spa-19.cjs` (DRY_RUN by default, `APPLY=1` to write).

**One gate correction worth recording.** My first pass also gated on known-side LEGO containment
and rejected `S0567L02U04` for `spending`→`spend`. That gate was wrong: known-side inflection is
licensed by the free class, and **2,107 of 15,205** live `spa_for_eng` build/use rows already differ
on the known side, against **360** on the target side. Any future containment check must be
target-side only.

---

## 2. The 14 other flagged rows — no action, and why

The second opinion flagged 19 rows for LEGO-containment. Five of them are repaired above. The other
fourteen split three ways, and none of them is a phrase defect I can fix without guessing.

### 2a. The LEGO and the seed are the wrong side — needs a ruling (5 rows)

| Rows | The LEGO **and its seed** say | The phrases say | My read |
|---|---|---|---|
| `S0115L04B02/B05/U04` (R262) | `no siento como si estuviera listo para tener una conversación` | `no **me** siento como si…` | `sentirse` is reflexive here. The phrases are right; the LEGO and **the seed itself** are wrong. |
| `S0116L04B04/B05` (R265) | `la mejor opción que podría **hacer**` | `…que podría **tomar**` | `hacer una opción` is an anglicism for "make a choice". Again the phrases are right and the LEGO+seed are wrong. |

I did not touch these. Reverting the phrases would drill wrong Spanish; fixing them means editing a
**seed**, which is a bigger move than a phrase repair and changes the seed's own clip. Both seeds
and both LEGOs already have audio. **This is the one decision I'm holding for you** — one line each:

- **S0115** seed+LEGO: `no siento…` → `no me siento…`? (my recommendation: yes)
- **S0116** seed+LEGO: `…que podría hacer` → `…que podría tomar`? (my recommendation: yes)

Neither blocks the clips that are generating now: the phrase rows are correct as they stand, and
only the seed/LEGO clips would need re-rendering if you say yes.

### 2b. Native ear needed — genuine fork (3 rows)

`S0552L01U01/U03/U04` (R1161). LEGO is `al otro extremo del pueblo`; the rewrites say `en el otro
extremo del pueblo`. With `vivir` and other location verbs Spanish wants `en`; the seed's own
`la iglesia al otro extremo del pueblo` is fine as it is. The second opinion marked this a fork and
declined to score it, and so do I. Both readings are live in the course right now and neither is
wrong in its own sentence.

### 2c. Not defects (6 rows)

- `S0550L01U01–U04` (R1159): LEGO `el final del pueblo`, rows `al final del pueblo`. `al` = `a`+`el`
  — the contraction false-positive this estate has already documented. Nothing to fix.
- `S0555L02U03`: dropped the bound `para` from `para buscar una nueva`. `te toca a ti buscar una
  nueva` is correct Spanish; forcing `para` back in would make it wrong.
- `S0557L02U04`: `música` replaced by the clitic `la`, which is what Spanish does on the second
  mention. Correct.

---

## 3. Two new things I found while in there — not touched, logged

**A second missing-`lo`, same defect as `S0661L01B03`, in two rows that already have audio.**
Across the 41 `estar haciendo bien` rows in `spa_for_eng`, 39 carry the clitic and two do not:

- `S0646L01U05` — "pienso que está haciendo bien" → should be `pienso que **lo** está haciendo bien`
- `S0661L01U02` — "puedo ver que estáis haciendo bien" → should be `puedo ver que **lo** estáis haciendo bien`

Both have `known`, `target1` and `target2` clips linked, so this is a make-before-break job (fix
text → regenerate → relink → retire the old clips), not a text edit. Neither is in the rewrite set;
both predate it. Small, cheap, and worth doing on the next spa pass.

**360 target-containment failures course-wide.** The 19 rows the second opinion flagged are a small
share of `spa_for_eng`'s 360 build/use rows whose Spanish does not contain their own LEGO's Spanish
(2.4% of 15,205). The rewrite set is not the problem here — the rest of that 360 has never been
looked at. Worth a scoped audit, not part of this job.

---

## 4. Clips

Repairs finished first, as ruled. The live phase8 plan then read **1,120 clips missing**
(365 known / 384 target1 / 384 target2), presentations `0 missing` and `readyForGenerate: true`,
at an estimated **$0.90** for 56,023 characters. That is slightly more than the 1,041 in the
verdict document because the same run also picks up the **07-31 Deborah targeted fixes** for this
course, which had been sitting unfulfilled in the audio-pass queue since July, plus 6 free relinks
and 2 free copies. Generation is running now against the live DB; voices unchanged
(Eve/xAI known, Elvira and Alvaro/Azure target).
