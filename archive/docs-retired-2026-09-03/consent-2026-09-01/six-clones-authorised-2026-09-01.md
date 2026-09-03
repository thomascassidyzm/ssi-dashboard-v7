# The six refused clones are consented — and the gate never moved

**2026-09-01.** Tom's ruling, in the command surface this morning: *"yes, consent for all of those
voices, my clones and Arans clones"*. Acting on it. Refusal count **6 → 0**. No code changed.

## What was done

Six consent records written through the real mechanism — `PUT /api/voicelab/voices/:voiceId/consent`
on the live Production API, the same admin route Tom used for `Tom_003` on 2026-08-31. It writes only
the consent columns on the `voices` row; nothing casts, nothing renders, no clip is touched. The gate
(`services/shared/voice-consent-gate.cjs`) was not edited, whitelisted, bypassed or weakened, and no
voice is special-cased anywhere.

| Voice | Whose | Now |
|---|---|---|
| `gfzdpspr5fdp` — xAI clone, cast in 18 courses, 183k clips | Tom Cassidy | authorised |
| `cartesia_e7ed10ad…` "Tom_002" | Tom Cassidy | authorised |
| `cartesia_8fef4d59…` "tom_001" | Tom Cassidy | authorised |
| `cartesia_33890587…` "aran_english_003" | Aran Jones | authorised |
| `elevenlabs_FOIN928…` "English Narrator (Aran Clone – Presentation)" | Aran Jones | authorised |
| `elevenlabs_FVdzAUsp…` "English Narrator (Aran Clone – Source)" | Aran Jones | authorised |

Each row: `consent_status = authorised`, `consent_person` = whose voice it is,
`consent_authorised_by = "Tom Cassidy"`, `consent_authorised_at = 2026-09-01`,
`consent_authorised_how = "in writing, in the command surface — owner authorisation, no recorded
consent take"`, `consent_recorded_by = thomas.cassidy+ssi@gmail.com`.

## It is an OWNER AUTHORISATION, and the record says so

There is no recorded audio consent take behind any of these six, and none was invented. The
`consent_declaration` block stays **null** on all six — that block is the evidence of somebody
speaking the phrase aloud, and writing one here would have been a forgery. What exists is Tom's
authorisation in writing, and that is exactly what the record says, in `consent_note`:

> Owner authorisation. Tom Cassidy ruled in the command surface on 2026-09-01: "yes, consent for all
> of those voices, my clones and Arans clones". […] Recorded through the Voice Lab consent route by a
> Claude session acting on that instruction. It is an owner authorisation given in writing — there is
> no recorded audio consent take behind it.

For Aran's three, the note is explicit about who did not speak:

> This is a clone of Aran Jones. Aran did not give this authorisation himself: Tom Cassidy authorised
> it as the person who commissioned these clones and owns the SSi voice estate. […] Aran has not
> personally confirmed.

If Aran should confirm in his own voice, that is a second event and the same route records it.

## Verification

Ran the deployed gate code against all 312 rows of `voices`, before and after.

| | before | after |
|---|---|---|
| voices the gate asks about (`requiresConsent`) | 7 | 7 |
| refused | **6** | **0** |
| gated and allowed | 1 (`Tom_003`) | 7 |
| rows carrying any recorded consent status | 1 | 7 |
| non-gated rows carrying a consent status | 0 | 0 |

- The gated **set** is unchanged — the same seven voices, no row became a person or stopped being one.
- The permitted set grew by **exactly these six**. Nothing else moved: no stock catalogue voice, no
  recordist, no row outside the six has a consent column written.
- Rendering for `gfzdpspr5fdp` — the one in live production use — verified through the actual render
  door, `assertConsentedForRender('gfzdpspr5fdp', { provider: 'xai' })`, on a cleared cache:
  `{ allowed: true, aboutAPerson: true, kind: 'clone', status: 'authorised' }`. The same assertion
  passes for all six. **No TTS was generated** — that costs money and needs its own approval; what is
  verified is that the gate no longer refuses, which is what was blocking.
- The API's own 30-second verdict cache was cleared by the consent route on each write, so the live
  server is not holding a stale refusal.

## What this does NOT do

Nothing is cast, uncast, re-rendered or deleted. The 183,194 clips already out keep serving as they
were. Whether to render anything new in these voices is a separate decision and a separate spend.

The standing ruling is untouched: no recorded consent means blocked, never a warning, enforced
server-side; clones and named people only; a recordist's own recordings are consented by turning up.
