# Parentheses pilot — spa_for_eng (closed-loop verified)

*2026-07-04. First application of the no-parentheses house law (`ralph-methodology.md`,
"No Parentheses, Ever") to **existing** content, on one course. This report is the template
for the other 54 courses carrying the 7,953 remaining occurrences catalogued in
`parenthetical-audit-2026-07-04.md`.*

## Outcome

spa_for_eng had **9** parenthetical hits (`audit-parentheticals.cjs`), all in
`course_legos.components[].known` — zero in lego/phrase `known_text`. **8 fixed and applied
live** (staged for audio regen, none generated). **1 left untouched**, routed to the owner
decision list below — not invented.

| | count |
|---|---|
| Total hits found | 9 |
| Fixed (pattern-class A) | 8 |
| Owner decision list (pattern-class B) | 1 |

Verified after apply: re-running the audit against spa_for_eng returns exactly 1 hit
(`S0239L02`, the decision-list item) — closed loop.

## The pattern-classes

### A. Stale-duplicate component JSON (8/9) — mechanical, no policy call

**Root cause, not a new house-law replacement pattern.** `course_legos.components` is a JSONB
snapshot that is stored *independently* of the `course_practice_phrases` rows with
`phrase_role='component'` — a schema quirk already documented in `cue-library-v1-spa.md`
("THE CUE LIVES IN WHAT THE LEARNER SEES... an enrichment that stops at the lego record leaves
[stale text] live at the rows the learner actually sees"). For all 8, some earlier pass had
already cleaned the `course_practice_phrases` sibling row to the bare form — but never synced
the parent lego's `components` JSON, so the learner-facing decomposition render
(`LegoAssembly.vue`, fed by `course_legos.components` via `bundle.ts`/`cycles.ts`) was still
showing the parenthetical.

The fix: sync `components[i].known` to the value the course's own sibling row already
established. `target_text` and the lego's own `known_text`/`target_text` are untouched.

| Seed·Lego | Before | After | Sibling already read |
|---|---|---|---|
| S0332·L02 | `new (feminine)` | `new` | `new` (S0332L02C02) |
| S0398·L01 | `patient (plural)` | `patient` | `patient` (S0398L01C03) |
| S0454·L01 | `the (time)` | `the` | `the` (S0454L01C01) |
| S0642·L02 | `you (reflexive)` | `you` | `you` (S0642L02C01) |
| S0645·L01 | `you (formal)` | `you` | `you` (S0645L01C02) |
| S0653·L01 | `you (formal)` | `you` | `you` (S0653L01C01) |
| S0657·L01 | `you all (reflexive)` | `you all` | `you all` (S0657L01C01) |
| S0667·L01 | `you all (indirect)` | `you all` | `you all` (S0667L01C01) |

S0653 is the exact example `ralph-methodology.md` itself calls out as the violation that made
the law universal; S0645 is the same family (register already carried by the seed's own
`U01`/`U02` vocative siblings — "I can help you madam" / "...sir"). Both resolve the same way
as the other 6: bare component, no invented vocative insertion needed, because the register/
gender/number cue was never actually carried by the component annotation in the first place —
it's carried (or, for 645/653, not needed at all at the component level — see verification
below) by the full phrase.

### B. Explanatory-construction gloss (1/9) — no established pattern, decision list

- **S0239·L02**: `likes (to her/him it pleases)` — target `le gusta`. No clean sibling exists
  (seed 239 has no `phrase_role='component'` rows at all). This is a literal-translation
  explanation of Spanish's impersonal *gustar* construction glued into a component gloss —
  exactly the case `ralph-methodology.md` flags: *"If neither a natural vocative nor a natural
  glued prefix can carry the cue, that is a signal the underlying construction needs its own
  bundled M-LEGO... not a parenthetical stopgap."* Deciding how to bundle/re-debut the *gustar*
  construction is a content-design call, not a mechanical fix — left for the owner.

## Verification (why 8/9 is safe, not a guess)

1. **ZUT gate doesn't see components.** `checkLegoConflict` (`services/course-builder/lib/
   validation.cjs`) queries `course_legos.known_text` only — `components[].known` is never
   checked for production-direction determinism. It's used only for tiling vocab coverage
   (`checkTiling`) and on-screen decomposition. So bare-component multi-target mapping isn't a
   ZUT category at all in this schema.
2. **Multi-target bare components are already normal, pre-existing practice** — confirmed
   live: `the` already maps to 5 different targets across spa_for_eng (`los/la/al/el/las`)
   before this pilot touched anything. Removing the annotation from `you`/`you all` adds them
   to that same already-tolerated bucket; it does not create a new category of risk.
3. **Every fix matches an already-established sibling row exactly** (target included) — not
   an invented value.
4. **Lego/phrase `known_text` and `target_text` are byte-for-byte untouched** for all 8 —
   confirmed via before-state assertions in `apply-parentheses-pilot-spa.cjs` (aborts on drift).
5. **Audio impact staged, not generated.** Each apply nulls only `presentation_audio_id`
   (the field that would narrate the changed breakdown); no `*_audio_id` was deleted, no TTS
   was generated. These 8 rows now sit in spa_for_eng's "Generate Missing Audio" queue,
   pending Tom's go-ahead per the TTS-approval gate.
6. **Re-audit confirms closed loop**: post-apply scan of spa_for_eng returns exactly the 1
   decision-list item, 0 unexpected survivors.

**Flagged, not touched:** seed 642 has a separate, pre-existing, already-documented issue
(`cue-library-v1-spa.md`: `642|2 'you feel'=se siente` is bare at the full-phrase level on
several USE lines, a 3-way collision surface with `te sientes@40` / `te sientas@542`). This
pilot only removed the internal `(reflexive)` component annotation on that same lego — it does
not touch, and does not resolve, that pre-existing collision. Noted here so it isn't mistaken
for something this pass fixed.

## Template for the other 54 courses

1. Run `audit-parentheticals.cjs`, filter hits per course (see `spa-parenthetical-hits.json`
   for the extraction pattern used here).
2. **For each hit, check whether a `course_practice_phrases` `phrase_role='component'` sibling
   already reads clean with a matching target.** If yes → pattern-class A: mechanical sync,
   zero policy call, safe to apply exactly like `apply-parentheses-pilot-spa.cjs`. This check is
   cheap and, on spa_for_eng, resolved **89%** of the course's hits without any content
   judgment at all — worth running across the full 7,953-row backlog *before* assuming it's all
   manual content-authoring work; the true remaining effort may be smaller than the raw count
   suggests.
3. For hits with an established replacement pattern but no clean sibling to copy (e.g.
   formal-you where **no** vocative exists anywhere in the seed's phrase family) — that's a
   real text edit (inserting a vocative into `known_text`/`target_text`, not just the
   component label). Treat as content authoring, not metadata sync: verify course-wide
   uniqueness before applying, same rigor as the `formal-vous-pass-fra` precedent.
4. Everything else (explanatory glosses, sense-disambiguators, case/gender/number labels with
   no natural-example technique yet) → owner decision list. Do not invent a replacement.
5. Larger courses (tel_for_eng 895, mar_for_eng 805, hin_for_eng 551, ...) are two orders of
   magnitude bigger than spa's 9 and, per the original audit's skim, contain real explanatory
   glosses and cross-language variation this pilot didn't need to handle — expect genuine
   content-authoring volume there even after the mechanical-sync step above is exhausted.

## Owner decision list

| Pattern-class | Count (spa_for_eng) | Example | Why it's not auto-fixed |
|---|---|---|---|
| Explanatory-construction gloss (impersonal-verb literal-translation, e.g. *gustar*) | 1 | `likes (to her/him it pleases)` = `le gusta` (S0239L02) | No natural-example replacement established; `ralph-methodology.md` itself signals this needs a dedicated bundled M-LEGO — a construction-design decision, not a text-recast. |

## Machine-readable artifacts
- `tools/course-optimization/spa-parenthetical-hits.json` — the 9 hits, extracted from the
  course-wide audit.
- `tools/course-optimization/apply-parentheses-pilot-spa.cjs` — the apply script (dry-run
  supported, per-seed, assertion-guarded).
- `tools/course-optimization/parentheses-pilot-spa-applied-log.json` — full before/after log
  of the 8 applied changes.

## Next step (needs Tom's go-ahead, not taken here)
Run Phase 8 "Generate Missing Audio" scoped to `spa_for_eng` to render the 8 rows whose
`presentation_audio_id` was staged null above — no other content in the course is touched
(only null `*_audio_id` rows render, per `docs/specs/edit-cascade-spec.md` §2d).
