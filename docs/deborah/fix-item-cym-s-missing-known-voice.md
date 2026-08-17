# Fix item — `cym_s_for_eng` has no configured `known` voice

**Filed 2026-08-17 per Tom's ruling (b).** Not repairable until the config says what the
voice *is*, so this is a small question for Kai, folded into the render decision.

## What was found

While classifying the 108 held voice-mismatch slots, 11 of them — **all of
`cym_s_for_eng`, all on the `known` side** — came back with `wanted_voice: null`. That is
not a mismatch. It means `courses.voice_config` for this course **has no `known` voice at
all**, so there is nothing to match a candidate against.

The 11 slots have clips available for their text on the `known` role (e.g. `"I didn't"`,
`"you're ready"`, on `azure_en-GB-SoniaNeural` and one on `eve`). We cannot link any of
them, because we cannot say whether Sonia is the right voice for this course's English
side or the wrong one.

## Why it can't be worked around

Every safe path needs the configured voice as its reference:

- **Relinking** needs it to prove the candidate is the same voice (the `decodeVoiceId`
  assertion in `tools/deborah/relink-silent-slots.cjs` returns `false` for a null want,
  by design — it fails closed).
- **Rendering** needs it to know which voice to render *in*. Tom's ruling (c) sends the
  genuine voice-mismatch class to the render pass precisely because rendering in the
  correct voice sidesteps substitution — but that requires knowing the correct voice.

So these 11 are the one class in the whole repair that neither authorised route reaches.
They are **excluded from the 2,446-render bill** for that reason, and `cym_s_for_eng`'s
33 render slots in the table are its *target*-side ones only.

## The question for Kai

**Which English voice should `cym_s_for_eng` use on the known side?** Two candidates are
already present in its own data — `azure_en-GB-SoniaNeural` (the estate's usual English
known voice, used by most `*_for_eng` courses) and one clip on `eve`. Confirming Sonia
would make these 11 immediately relinkable at zero cost.

## Worth checking at the same time

I have **not** swept the estate for other courses missing a role in `voice_config` — this
surfaced only because `cym_s_for_eng` happened to have silent known-side slots. A course
with a missing voice entry and no silent slots would not have shown up here at all, and
the same gap would bite the moment it needed one. One query over `courses.voice_config`
checking all four roles are present would settle it.

## What this is not

Not the cause of the silence. These 11 slots went NULL by the same mechanism as the rest
(a text edit re-resolving the link, see the programme report). The missing voice config is
what blocks the *repair*, not what caused the damage.
