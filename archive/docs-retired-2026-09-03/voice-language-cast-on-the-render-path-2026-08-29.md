# Voice casting moved to the language — and the render path now reads it

**2026-08-29.** The Voice Lab could cast a language since yesterday. Nothing read
the result. It does now.

---

## What you can do tonight

Open the Voice Lab Languages page and cast a language — a male primary and a
female primary. The next time any course in that language is rendered or
re-rendered, it will speak in the voices you cast. You do not have to touch the
course.

That was already the promise of the page. Until this landed it was not true:
`voice_language_roles` was a table nothing on the render path consulted.

## Precedence, in one line

**explicit course override → language cast → the course's stored voice_config**

The third leg is what makes this safe. Nothing is cast yet (0 rows), and 94 of
149 courses carry a real stored voice block. A strict two-tier rule would have
changed what every render decides overnight. So: **with nothing cast, nothing
changes** — measured over the live estate, **94/94 configured courses resolve
byte-identical to what they resolve to today.**

An "explicit override" is a new deliberate marker — `overrideLanguageCast: true`
on a course or on one role — never the mere presence of a legacy config, because
every course has one of those and treating it as an override would put the
language cast permanently out of reach.

## Two defaults I chose, either correctable in one word

1. **Gender comes from the data.** A role takes the language cast at the gender
   of the voice the course *already has*, so nothing silently flips gender on a
   re-render. Only where there is no voice to read does the fallback apply:
   target1 = female, target2 = male, known = female.
2. **`presentation` is excluded from the cast.** It is the intro / clone voice —
   your own presenter, not a specimen of the language — so casting French would
   otherwise replace your clone on every French course. It keeps its per-course
   config untouched.

Say the word on either and it is a one-line change.

## Speed is the player's job now

Rendered pace no longer depends on role or cadence. The cadence multiplier
resolves to 1.0 and the hardcoded `slow` 0.8x in the baskets renderer is gone.
The **per-voice base speed stays** — that corrects a voice's own natural pace,
which is a property of the voice, not of the role a clip plays in.

**The consequence, which you waived in advance.** `isSpeedTrustedVoice` refused
cross-role reuse of an Azure clip, because Azure bakes speed into the MP3 and we
store no per-row speed. With new renders all at one pace it describes nothing,
so it is retired. **An old Azure clip rendered at a 0.8x "slow" cadence can now
be borrowed into a role that would previously have re-rendered it, and will play
at its baked 0.8x until the next re-render.** Nothing existing is re-rendered by
this change; it only affects what the next render decides.

No speed column was added to `course_audio` — it has none, and this ruling does
not need the migration.

## Still outstanding — yours to schedule

**The player half.** Known-fast / target-slow playback lives in
`ssi-learning-app` (player-vue), which deploys separately to Vercel. That is the
other side of "the same clip plays faster as the known language and slower as
the target". It was deliberately not done here.

## What is live, and what is not

| Half | State |
|---|---|
| Voice Lab Languages page on popty.app | **live** — verified in the served Voice Lab chunk |
| Voice Lab casting API (production-api) | **live** — service restarted on the new commit, verified |
| Render path (phase8) | **live** — service restarted on the new commit, verified, and proved end to end: cast French, the resolver moved both target voices, cast cleared, it moved back |
| Orchestrator | **not live** — see the gap below |

**The gap.** `popty-orchestrator.service` runs out of the shared development
checkout, which is currently sitting on another worker's branch with uncommitted
changes. Moving it was not mine to do. The only orchestrator change in this work
is one editor read (its `GET voice-config` now returns the course's *stored*
config rather than the cast-resolved one, so saving that screen cannot bake a
language decision into a course row). It is a duplicate of the same route on
production-api, which IS live. Nothing on the render path is affected.
