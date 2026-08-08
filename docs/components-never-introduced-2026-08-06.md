# Components are never introduced — what happened and what I did

**Tom's ruling, 2026-08-06 18:45Z:** *"All the components are now being introduced in the new M-LEGO introductions. Components do NOT get introduced."*

---

## Your mechanism, checked against the database

You diagnosed it as: components miscategorised as **missing LEGOs**, new introductions generated for them as if they were LEGOs, and because they are really components they have zero practice phrases — so they show up as bare LEGOs.

**The symptom you describe is exactly right. The promotion never happened in the data.** I swept for it directly:

- LEGO rows that are `is_new`, carry an introduction, and have zero BUILD/USE/practice phrases: **533** across 16 courses — but **none created in the last 7 days**, and none in French or German seed 1. They are old (Dec 2025 – Jul 2026), and 399 of them are one course, `gle_for_eng`.
- LEGO rows whose target text *also* exists as a component row in the same seed, `is_new`, with an introduction and zero phrases — the precise promotion signature: **0 rows, estate-wide.**
- French seed 1 has the same 5 LEGO rows it has had since 2026-02-10. The four things added at 18:01Z today were written as `phrase_role='component'` rows, never as LEGOs.

The 533 bare LEGOs are a different defect — a phrase-floor failure. I checked a sample of the `gle_for_eng` ones (`last week`, `she wanted`, `to put`, `in her`, `bag`): those are genuine intention-units, real LEGOs that never got their phrases, not components wearing a LEGO's clothes. Per your instruction, out of scope for this job, untouched, and flagged here.

**What produces your signature without any promotion:** a `component_intro` cycle plays as an introduction card and is then followed by nothing, because a component has no practice phrases of its own. In the player that is indistinguishable from "a new LEGO was introduced and never practised" — a bare LEGO. Your observation and your inference about what it means are both correct; the mechanism sits one layer up, in cycle emission rather than in categorisation.

**The bypass you named is real, and it is cross-repo.** You said the rule is already in the code — it is, at `services/learning-script-generator.cjs:758`, which states components are never played, and the legacy client script generator obeys it. The path that went around it is the **cycles API in ssi-learning-app**, which reimplemented script assembly from scratch on 2026-08-04 and simply didn't carry the rule across. That is the bypass, and closing it is the fix. Separately, today's French rows got their narration bindings by a script writing **straight to the database**, under every code guard — which is why I also put the refusal in the database itself (below).

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

**Closed the direct-write bypass (database trigger).** A code guard cannot stop the next script that writes straight to Postgres, which is how today's French bindings arrived. `components_never_introduced` on `course_practice_phrases` refuses to bind a narration clip to a `phrase_role='component'` row, and names the ruling in the error. Clearing one to NULL is always allowed, so the approved cleanup can still happen later without dropping the trigger; existing bindings are untouched. Migration and its rollback are both in `database/migrations/`. Applied and tested live: refuses a new binding, permits an unlink, test transaction rolled back.

**Components stay allowed vocabulary.** Nothing here narrows what a later phrase may use. `checkTiling` in `services/course-builder/lib/validation.cjs` adds every M-LEGO's `components[]` targets to the available-vocabulary set, and I did not touch it — so "you are trying to speak" still works off the components of "I am trying to learn". Nothing was demoted, so no vocabulary was lost.

**No data touched.** No row updated, no clip deleted, no audio generated. 84,626 component rows and 56,671 bindings, before and after.

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

## The old-style standalone component introductions

You asked for their scope. That is the 56,671 figure: component rows carrying their own narration clip, authored Feb–Jul 2026 under the old pathway, across 96 courses. Under the new model they are all obsolete. They are also all silent now — nothing emits them. I have not removed any, and I would not without a plan you have seen; the trigger above means the pile cannot grow while that decision waits.

## One decision for Tom

**The four French seed-1 component rows added at 18:01 today (I/je, want/veux, with/avec, you/toi).** They were added specifically so French would introduce its components, which is the thing you've just ruled out. They are now silent, and as visual tiles they make French seed 1 match German seed 1, which has had the same four rows for months. The commit wrote its own rollback file if you want them gone.

**My recommendation: keep them.** As tiles they're correct and they make the two courses consistent; the introduction they were built for can no longer happen. **Keep or roll back?**
