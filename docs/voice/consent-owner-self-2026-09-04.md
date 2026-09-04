# The consent block was telling Tom to go and ask Tom

**2026-09-04 · landed on `main` (`00e99861b`) · live on popty.app and on the watson-1 API**

## What was actually blocking

The refusal Tom read — *"Tom Cassidy has not authorised this voice yet. Ask them…"* — was
**not** `tom_ita_002`. That voice was authorised at 00:52 and auditions fine. The blocked
row is `cartesia_0b09cc76-…`, **"Tom — Italian clone sample 2026-09-04"**, made by an agent
at 00:46 during the Italian-clone-vs-Lorenzo job and left at `awaiting_authorisation` with
no declaration on it, so even the "hear it in order to decide" door was shut.

Both are Tom's Italian clone. The 01:13 fix consented **one voice id by hand** (`tom_001`),
which is why an identical wall stood eight hours later in front of a different row.

## The finding: there is no owner link in this schema

Measured on the live `voices` table, 427 rows:

| how a voice ties to a person | populated |
|---|---|
| `consent_person` — a free-text **name** ("Tom Cassidy", "tom", "Aran Jones") | 9 |
| `consent_person_contact` — an email | **1** |
| `human_email` — an email | **0** |
| `notes` — prose naming the operator who ran the clone flow, not the owner | most clones |

So "derive the owner from the session and let them through" **cannot be built today**, and
building it on a name would let anybody called Tom Cassidy consent to Tom's clone — the
protection removed, not narrowed. That gap is the finding, and it is stated in the header of
`services/shared/voice-ownership.cjs` rather than worked around.

## What was built, and why this shape

**Option (b): one tap on the blocking message — because it is the only one that can be true
today, and because the tap is what makes option (a) ever possible.** It records the consent
the person is standing there giving, and in the same write it mints the identity link (their
authenticated address onto the row), so every later question about that voice is derived and
the wall does not come back for it or for the next clone they make. No voice id is
special-cased anywhere.

- `services/shared/voice-ownership.cjs` — the one answer to "is this session the person
  behind this voice". **Identity-grade only**: a verified email against an email on the row.
  It never matches a name, and that is the whole reason it is a module.
- `services/voicelab/self-consent.cjs` — the write, and the four refusals below.
- `POST /api/voicelab/voices/:voiceId/consent-self` — dashboard tier, no body: **who is
  claiming comes from the session, never the request**.
- The claim lands on **every spelling** of the voice (bare uuid and `cartesia_…`). The
  browser is refused under the bare uuid and the registry stores the prefixed one; claiming
  one and leaving the other is how this recurs a third time.
- `services/voicelab/runner.cjs` now carries a failed clip's **error code**, not just its
  prose — a run is asynchronous, so the refusal reaches the screen as a stored clip, and the
  alternative is a browser string-matching English.

## Nothing is weakened for anybody else

Proved live against a throwaway voice row, created and deleted by the probe
(`scripts/prove-self-consent.cjs`), plus 12 unit tests:

| | result |
|---|---|
| the owner taps | `authorised`, `consent_person_contact` = their verified address, the note says who claimed it and whose name it replaced |
| the same person taps again | `alreadyAuthorised: true`, no second write |
| **somebody else taps the same voice** | **403 `NOT_YOUR_VOICE`**, row unchanged |
| a recorded `refused` / `withdrawn` | **409 `CONSENT_REFUSED_ALREADY`** — a no is never walked back with a tap |
| a stock voice (`en-GB-OllieMultilingualNeural`) | 400 `NOT_A_GATED_VOICE` — nobody to ask |
| **the gate itself** | **untouched**. It takes no identity and gives the same 403 to a cron job at 3am as to a person at a screen. A second user auditioning an unconsented clone still gets exactly the refusal Tom got. |

## Verified by doing it

Screenshots (tailnet): `/evidence/voice-consent-owner-2026-09-04/`

- `audition-tom-ita-002.png` — **tom_ita_002 auditioned in the Voice Lab, Italian,
  "Buongiorno, come stai oggi?" → *Admitted — every gate passed*, audio came back.**
- `block-with-the-tap.png` — the blocked clone, with the refusal now carrying its own
  answer: **"This is my voice — I consent"**.
- The tap's own wiring was driven in the browser: it posts to the id the server refused, and
  the screen clears and retries.

**One thing deliberately not done:** the button was not pressed on Tom's blocked clone. A
consent record must be the person's own act, and forging one under his name to finish a
screenshot is exactly what this subsystem exists to prevent. **Tom presses it once on
"Tom — Italian clone sample 2026-09-04" and it renders from then on** — and from that tap
his address is on the row, so no clone of his blocks him again.

## Still open

`consent_person_contact` is empty on every other clone in the estate, including
`aran_english_003` and the two ElevenLabs Aran clones. They are authorised, so nothing is
blocked — but they are tied to Aran by a name, not an identity. The link fills in as people
tap; nothing back-fills it, and nothing should guess it.
