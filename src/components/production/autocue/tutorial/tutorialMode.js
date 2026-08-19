// src/components/production/autocue/tutorial/tutorialMode.js
/**
 * THE GATE. One symbol, one provider, one consumer.
 *
 * Every word of teaching copy in this codebase lives in `tutorialScript.js` and
 * reaches the screen through exactly one component, `TutorialCoach.vue`. That
 * component renders NOTHING unless `TUTORIAL_MODE` has been provided above it,
 * and the only thing that provides it is `TutorialStudio.vue`.
 *
 * So the separation is structural, not cosmetic:
 *
 *   - the live recorder (`AutocueStudio.vue`, `RecordRoom.vue`) never provides
 *     TUTORIAL_MODE, so even if someone pasted a <TutorialCoach> into it by
 *     mistake, it would render an empty comment node and no copy would leak;
 *   - `provideTutorialMode()` is the ONLY way to turn it on, and it is called
 *     in exactly one place — grep for it;
 *   - the copy module is imported by nothing outside this directory, which
 *     verify-recordist-tutorial.mjs asserts against the repo on every run.
 *
 * If you are adding instructional text: put it in tutorialScript.js and render
 * it with <TutorialCoach>. Do not add copy to a real studio component and hide
 * it behind a v-if — that is exactly the leak this file exists to prevent.
 */
import { inject, provide } from 'vue'

export const TUTORIAL_MODE = Symbol('ssi.autocue.tutorialMode')

/** Called by TutorialStudio.vue, and nowhere else. */
export function provideTutorialMode() {
  provide(TUTORIAL_MODE, true)
}

/** Defaults to FALSE — absence of the provider means "this is the real tool". */
export function useTutorialMode() {
  return inject(TUTORIAL_MODE, false)
}
