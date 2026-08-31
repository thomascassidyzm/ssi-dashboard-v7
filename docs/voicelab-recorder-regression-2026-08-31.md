# The Voice Lab could not record a voice — 2026-08-31

Tom hit this live on `https://popty.app/admin/configs/voice`, in front of Aran. He could not
record a new voice.

## What was actually wrong

Commit `67794654b` — *"feat(voicelab): the clone demo — one tap per recording, and every clone
stays on screen"*, 13:50:04Z — rewrote `src/views/admin/voicelab/LanguagesPanel.vue` (496 lines
changed) and **deleted three script bindings and the entire browser recorder**, while leaving every
one of their buttons in the template.

Gone from the script, still named in the template:

| symbol | what the template did with it | what the user saw |
|---|---|---|
| `canRecord` | `:disabled="!canRecord"` on the **Record it here** chip | chip permanently greyed out, tooltip "This browser will not give the page a microphone" |
| `pickFile` | `@change="pickFile"` on the file input | choosing a file set nothing; the clone button never armed |
| `canSubmitClone` | `:disabled="cloneBusy \|\| !canSubmitClone"` on **Create the clone** | button permanently disabled |
| `recording`, `recordSeconds`, `recordedUrl`, `recordError`, `startRecording`, `stopRecording`, `clearRecording`, `recordHint`, plus the whole `MediaRecorder` block | the record/stop buttons, the playback element, the length hint; `submitClone()` calls `clearRecording()` | nothing to press, and the deliberate path would have thrown |

Both non-estate clone routes — **record here** and **upload a file** — were dead in production.
Cloning *from a recording the estate already holds* was untouched and kept working, which is why
the panel looked alive.

**Why nothing caught it.** Vue compiles an identifier the script does not define into
`_ctx.<name>` and emits no warning, at build time or at runtime. `!undefined` is `true`, so a
missing boolean reads as "disabled". The build was green, the deploy was green, and the failure
wore a message blaming the operator's browser.

## Timing — and one correction to the brief

The brief said it worked around 15:30Z and failed around 16:30Z. The edge evidence does not
support a change inside that window:

- `origin/main` did not move between 13:52:59Z and this fix at 16:47Z. No commit landed in the window.
- The production API (separate checkout `ssi-dashboard-v7-clean-prod`) has been running the same
  code since its 14:00:05Z restart, and that checkout was already at `9157eb5af`.
- The broken front-end bundle was already live: at 16:44Z `https://popty.app/admin/configs/voice`
  returned `age: 10193`, i.e. cached at the edge since **~13:54Z**. `VoiceLab-CpKMVJ7N.js`, the
  chunk it loaded, contained the record buttons and **zero** occurrences of `MediaRecorder`.

So the recorder had been dead since ~13:54Z. Whatever worked at 15:30 was almost certainly the
estate route (clone from a recording we already hold), which this commit did not break.

## The fix

`1c34cd1ce` restores the deleted block verbatim from `3f011c34e`, with one deliberate difference:
`canSubmitClone` no longer requires the *name* field. `submitClone()` composes a name from the
person when the field is blank, and the button's own hint asks only for the person — so requiring
the name would have contradicted the copy on screen. No layout or copy was touched.

## Verified by driving the live page

Not by reading code. Playwright, real `https://popty.app`, real admin session, production build
`1c34cd1c` (the badge in the corner of the screenshot):

1. **Record it here** — enabled.
2. **● Record** pressed → the counter ran; after 3s the row read `■ Stop — 3s`.
3. **■ Stop** at 13s → playback element rendered, hint read
   *"13s — over the floor. Twenty to sixty seconds clones noticeably steadier."*
4. **Create the clone** — armed, pressed.
5. A real Cartesia voice was created and registered:
   `cartesia_b59a04b9-8ca5-4068-b1f1-b607a7fd2643`, display name
   *"Recorder smoke test — delete me — recorded here"*, consent source
   *"uploaded or recorded sample (sample.webm)"*, status `awaiting_authorisation`.
6. The test voice was then deleted through the same route the Discard button uses —
   `{"atCartesia":{"deleted":true},"existingClips":0}`. Nothing left behind.

**One honest caveat.** This box has no audio input device and Chromium's
`--use-fake-device-for-media-capture` does not take in the bundled headless build
(`NotFoundError: Requested device not found`). The **device** was therefore synthesised:
`getUserMedia` was patched to return a real `MediaStream` fed by an `AudioContext` oscillator.
Everything downstream of the device — `MediaRecorder`, the webm blob, the multipart upload, the
route, Cartesia — is the real path on the real page. The one thing not exercised is a physical
microphone handing bytes to Chrome, which is the part that was never in question.

## The gate this leaves behind

`tools/check-vue-template-symbols.cjs` compiles every SFC template against its own script bindings
and fails on any surviving `_ctx.` access. Run against `67794654b` it names all ten missing symbols;
against `1c34cd1ce` it passes. It is wired into `.github/workflows/explainer-check.yml`, the repo's
one gate workflow.

Two pre-existing hits are baselined so the gate fires only on new breakage. **Both are real and
both are somebody else's file:**

- `src/views/CourseValidator.vue` — `v-if="phaseData.exists"` sits *outside* the `v-for` that binds
  `phaseData`, so it reads undefined and throws when that branch renders.
- `src/views/production/components/PhraseEditModal.vue` — `@click="() => { window.location.reload() }"`;
  `window` is not a template global in Vue 3, so that handler throws instead of reloading.

Neither was touched here.
