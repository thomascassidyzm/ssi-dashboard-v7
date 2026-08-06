# Components are never introduced — what happened and what I did

**Tom's ruling, 2026-08-06 18:45Z:** *"All the components are now being introduced in the new M-LEGO introductions. Components do NOT get introduced."*

---

## What he was hearing

He was hearing **cycles, not new audio**.

The per-component "as in" narration clips are old — authored February to July 2026, across nearly every course. What changed was that on **2026-08-04** the cycles API started *playing* them. Commit `9e9a19bf` in ssi-learning-app added `buildComponentIntroCycles`, which inserted one `component_intro` cycle per component between an M-LEGO's intro and its debut. Roughly 68,000 previously-silent narration clips became audible in one deploy.

The French seed-1 commit from earlier today (`7c7b6675`, 18:03Z, forty-two minutes before his message) added four component rows to French seed 1 and reported "French now emits component_intro for both seed-1 M-LEGOs" as a success. That is almost certainly the specific thing he pressed play on — but it was the last four rows of a course-wide behaviour, not the cause.

## The scope, as fact from the live database

| | count |
|---|---|
| `phrase_role='component'` rows, all courses | **84,626** |
| …across | **96 courses** |
| …carrying a presentation (narration) clip | **56,671** |
| …that the cycles API would have spoken as an introduction | **67,710** |
| …created in the last 7 days | **21** (4 French, 17 others, all pre-existing pattern) |

Only **4** rows are genuinely new-and-unwanted: the French seed-1 rows added at 18:01Z today.

The split that matters: component rows as **visual ghost tiles** on the intro/debut card are correct and always were. Component rows being **spoken as their own introduction** is what Tom ruled out. Until 2026-08-04, every course was in the first state. Between 2026-08-04 and today, all 96 were in the second.

## What I changed

**Stopped it reaching the learner (ssi-learning-app).** `buildComponentIntroCycles` deleted; a LEGO's sequence is `intro → debut → BUILDs → USEs` again. The player adapter `toPlayerCycle` also refuses a `component_intro` outright, as a backstop if any producer emits one again. Both test files that asserted the 2026-08-04 behaviour are flipped and renamed for the ruling.

**Made the generator incapable (Popty).** phase8 was the machine that authored, TTSed and bound the narration. Six paths are now refusals or hard zeros — no component text queued for authoring, no component presentation inserted by `/prepare-presentations-scoped` or `/regenerate-presentations`, no presentation clip queued by `/generate-components` (its known/target tile clips stay), `linkComponentPresentationAudio` links nothing, and a component without a narration clip can no longer hold a release. The money-path guard throws before spend: any `presentation` item reaching TTS with a `phrase_id` and no `lego_id` **is** a component introduction, and it refuses by name.

`introduce: true` is explicitly not a licence. A test asserts no surviving query in phase8 pairs `phrase_role='component'` with `introduce=true` in order to narrate it.

**No data touched.** No row updated, no clip deleted, no audio generated.

## Verified live

Dev, before the fix — both courses, exactly what Tom heard:

```
=== fra_for_eng ===          === deu_for_eng ===
  intro          S0001L01_intro
  component_intro S0001L01_component_intro_1
  component_intro S0001L01_component_intro_2
  debut          S0001L01_debut
```

Dev, after the fix deployed:

```
=== fra_for_eng ===          === deu_for_eng ===
  intro  S0001L01_intro       intro  S0001L01_intro
  debut  S0001L01_debut       debut  S0001L01_debut
  build  S0001L01_build_1     build  S0001L01_build_1
```

Also clean on `eng_for_kan`, `ita_for_eng` and `spa_for_eng`: only `intro / debut / build / use`.

Live DB after: 84,626 component rows, 56,671 still linked to a narration clip — unchanged. (23 deu/deu_at rows were updated at 18:34–19:04 by another agent working concurrently in this shared checkout; none of that is mine.)

## What I did NOT do, and why

The brief's default was to **unlink** presentation audio from component rows. I did not, deliberately.

That would have been a 56,671-row mutation across 96 courses to fix something that no longer has any effect — nothing plays those clips now the emission is gone. That is exactly the large blast radius the brief said to stop and report rather than sweep. The clips and bindings sit inert. Unlinking or deleting them is a separate, approval-gated decision, and there is no rush: the learner-facing symptom is already fixed.

---

## One decision for Tom

**The four French seed-1 component rows added at 18:01 today (I/je, want/veux, with/avec, you/toi).** They were added specifically so French would introduce its components, which is the thing you've just ruled out. They are now silent, and as visual tiles they make French seed 1 match German seed 1, which has had the same four rows for months. The commit wrote its own rollback file if you want them gone.

**My recommendation: keep them.** As tiles they're correct and they make the two courses consistent; the introduction they were built for can no longer happen. **Keep or roll back?**
