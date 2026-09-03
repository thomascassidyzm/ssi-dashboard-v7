# Your own recording is not a voice cloned from you

**Tom's ruling, 2026-08-31.** *"Gate anything CLONED from a person's voice. Do NOT gate a
person's own recording — the recording session IS the consent, and playing back someone's own
take is not synthesis. Do NOT gate stock voices. If a recordist's audio is ever used as the
source for a clone, THAT clone is gated as a clone."*

The clone-vs-stock work had already stopped the block asking vendor catalogue entries for
consent. What it could not answer was the question underneath the 17 `human_*` voices it left
refused: is a recordist's own audio the thing consent protects against? It is not. Those voices
now cast and render.

## The boundary, and where it lives

`services/shared/voice-personhood.cjs` gains a third category beside `clone` and `stock`, and
one new question — `requiresConsent()` — which is what the gate now asks:

| kind | gated | why |
|---|---|---|
| `clone` | **yes** | a voice this estate synthesised from somebody |
| `named` | **yes** | a human named on the voice, or a recorded refusal/withdrawal |
| `recordist` | no | **their own takes — the recording session already is the consent** |
| `stock` | no | a vendor catalogue entry; there is nobody to ask |

`recordist` and `stock` come out ungated for opposite reasons, and the difference is visible:
`classify()` still says `recordist` and `isAboutAPerson()` still says yes, because a recordist
**is** a person and a screen must say so. Only the permission decision narrowed.

## Derived from data, never a name list

A recordist row is exempt only while it looks like RECORDED AUDIO. Two facts take the
exemption back, both read off the row:

1. **clone provenance** in `metadata_source` — the field a clone flow writes;
2. **a vendor synthesis identity** — `tts_engine` naming one of the six vendors this estate can
   synthesise with, or a `provider_id`, or a `tts_voice_name`, or a vendor-prefixed id. This is
   the load-bearing half. A person's own recording is *files*: all 17 recordist rows hold null
   in all three columns under an id with no vendor prefix. A clone cannot exist without one,
   because a clone **is** a voice sitting at a provider under an id. So a `human_*` row that
   acquires one is something synthesising in that person's voice, whatever it is called.

Deliberately **not** used on a recordist row: the loose `/clone/i` word-search over notes and
display names that correctly catches `elevenlabs_FOIN928B9X0jwgJ95cLt`. On a recordist it would
gate the very recording this ruling exempts the moment somebody wrote *"used as the source for
Aran's clone"* on it — a true sentence about the SOURCE, which is not a clone.

## The clone made from a recordist

It is gated as a clone, and that falls out of the data rather than being arranged.
`POST /api/voicelab/voices/cartesia/clone-from-estate` clones a recordist's clips into a row of
its **own** — `cartesia_<uuid>`, `type: 'tts'`, `metadata_source: 'cartesia-clone (Voice Lab)'`
(`services/voicelab/cartesia.cjs` `registerVoice`). It never wears the source recordist's id, so
it never inherits the exemption. Belt and braces on top: a clone misfiled *under* a `human_*` id
is caught by either of the two facts above. Both directions are in the tests.

**And a recorded no is untouched.** A recordist who has refused or withdrawn classifies `named`
and is refused exactly as before — including a no given through the own-take confirmation flow
that landed hours earlier the same day. That flow is otherwise unchanged and still offered; it
is no longer a precondition of casting.

## Live verification — deployed API on :3470, browser bypassed

Real Supabase admin JWT, every call over HTTP against the production service on watson-1
running from the `-prod` checkout at `e8c15d63f`.

**Every `human_*` id in the estate — 24 of them** (the 17 `voices` rows plus the 7 that are cast
with no row at all: Aran ×2, Catrin ×2, Sasha, and two `zzz` test slots) — reads
`kind=recordist gated=false` from `GET /api/voicelab/voices/:id/confirmation`. Nothing was
missed and nothing needed a name.

**Casting, at the endpoint that writes the row** (`PUT /api/voicelab/languages/:language/slot`,
probed on an unused language code and cleared afterwards):

```
human_kai_fin                                  200 OK        (recordist, with a row)
human_sasha_wanasky_deu_at                     200 OK        (recordist, no row at all)
cartesia_e7ed10ad-…  Tom_002                   409 NO_RECORDED_CONSENT
gfzdpspr5fdp         Tom (xAI)                 409 NO_RECORDED_CONSENT
elevenlabs_FOIN…     Aran clone, presentation  409 NO_RECORDED_CONSENT
elevenlabs_FVdz…     Aran clone, source        409 NO_RECORDED_CONSENT
cartesia_f56e05e2-…  Tom_003, authorised       200 OK
azure_en-GB-OllieMultilingualNeural            200 OK        (stock, unaffected)
```

All five real clones behave: four refused, the one Tom has authorised goes through.

**Rendering.** The TTS chokepoint refuses an unconsented clone live and costs nothing to prove:
`POST /api/voicelab/voices/cartesia/audition` on `cartesia_e7ed10ad-…` returns
`409 NO_RECORDED_CONSENT`, *"Voice consent blocked (403)… [clone confirmation audition]"*, with
no vendor call. The allow side was verified against the deployed code in-process rather than by
rendering, because rendering spends money and the approval gate says not to:
`verdictFor()` returns `allowed=true kind=recordist` for the recordists, `allowed=false` for
every clone **including the bare-uuid spelling** `e7ed10ad-…`, and `allowed=true kind=stock`
for Azure.

**The census.** `tools/voice/census-unconsented-cast-voices.cjs` now counts what the block
refuses rather than who is a person. On the deployed code it went from **9 voices refused at
live cast sites — 8 recordists and 1 clone — to 1**: `gfzdpspr5fdp`, Tom's own xAI clone, cast
in 1,826 places with no consent recorded. That one is unchanged, real, and his call.

## Two things the live probe caught that no test would have

- **A recordist with no `voices` row read as "a stock voice licensed from the provider."** The
  confirmation route passed `consent.describe(voice || {})`, and an empty object says nothing
  about which voice it is. The gate was always right (it is handed the id); the *screen* was
  saying the opposite of true about Sasha, Aran and Catrin. Fixed by passing the id.
- **`tts_engine: 'human'` was being read as a vendor synthesis identity.** Casting a row-less
  recordist makes the cast route auto-register one — `type: 'tts'`, `tts_engine: 'human'` — so
  the act of casting Sasha turned her into a `clone` and would have re-gated her on the next
  read. `human` is in clip-identity's `PROVIDERS` but as an engine it means the opposite of a
  vendor. The test now names the six vendors this estate can actually synthesise with. Her exact
  row is a test fixture.

## Tests

585 green across `services/shared/`, `services/voicelab/` and the team-router consent suite.
Three assertions flipped deliberately, each carrying what it used to say and why:
`voice-consent-gate.test.js` *"refuses a human_* voice with NO ROW AT ALL"*;
`team-router.consent.test.cjs` *"NOT castable until the clone is confirmed"*;
`clone-confirmation.test.js` *"the same state machine"*. New tests cover the recordist category,
the clone made from a recordist, the clone misfiled under a `human_*` id, the source-note that
must **not** gate a recording, a recordist's recorded no, and stock left exactly where it was.

Everything the probe wrote was cleared afterwards: both probe slots deleted, and the `voices`
row the cast route auto-created for Sasha removed, leaving her row-less as she was.
