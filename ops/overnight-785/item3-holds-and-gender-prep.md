# Item 3 (por_br) holds and the GENDER_PREP_MISSING refusal (cs #785·AK, 23 Nov ~22:45Z, read-only)

## Why the 26 seeds are held: one cause for all of them
Seeds: 145 194 195 232 246 284 295 311 313 314 318 320 325 355 366 369 371 372 373 377 388 393 407 507 647 662
(source: #789·AK `ops/overnight-785/item3-por-br/out/apply-scope.json` → `held`; `precheck.json` → `heldSeeds: []`).
- The live pre-check (row + LEGO + seed against the plan) held NONE of them.
- Renders run in seed order, and the kit renders new clips before it changes any text (make-before-break). The render
  stopped at seed 145 on the refusal below; its other two clips had rendered. Seeds 194-662 never had their clips
  asked for (`audio-real.json` has no entries for them), so their text was left untouched rather than left silent.
- S0647/S0662 ("fala isso"): held ONLY for this reason. Nothing in their content or live state blocked them. A
  re-run of item 3's remaining renders, then the apply, clears all 26.

## The refusal
`S0145L01B03`, role target1 (the female seat), text "não estou mais contente" → 503 `GENDER_PREP_MISSING`:
"could not be made (the expansion model failed) — try again later".
How the route preps (services/shared/render-gender-prep.cjs `speakerForm`): for a target seat it reads the
`course_gender_expansions` row for (course, exact text, text_side 'target'). With no row, it calls
`gender-haiku-service.ensureExpansionForText`, a Claude CLI text call for the female and male forms. If that call
fails twice ('llm-failed'), the route refuses rather than speaking a possibly-male form.
- Row: S0145L01B03, por_br_for_eng, target1. Speaker gender: female seat.
- Prep entry: none existed for this exact text (a new text from the item-3 edit). The model call failed twice.
  Cause NOT determined: the Popty service log was not readable from here. kai-gmail was at 43% of its week, so it was
  not that account's weekly limit; the cause looks transient.
- "contente" is the same for a man or a woman, so the right prep answer is "no variants" (spoken as written).

## Smallest fix, without routing around the refusal
1. Just re-run item 3's remaining renders on a later night. The refusal says "try again later", and the next ask
   repeats the prep call. If it succeeds, all 253 clips follow. Use #789·AK's `kit/resume-item3.sh`, which skips
   applied batches and is library-first. No new tool is needed.
2. If it fails again: through Popty's edit route (`POST /api/production/por_br_for_eng/edit`, gender-expansion op), file
   ONE `course_gender_expansions` row for "não estou mais contente" with expanded_f = expanded_m = null ("no different
   form"). The route then reads it as 'stored' and speaks the text as written, which is correct here. This is a
   Kai-approved content write, not something to do tonight.
