# The one door that minted `authorised` with zero listening

**2026-08-31.** Follow-up to `feat/hear-your-own-recording` (`93e3b1989`) and
`fix/consent-clone-vs-stock` (`a80939424`). Found by an adversarial verification
pass and confirmed live with an editor-role JWT.

## The hole

Consent to a cloned voice is **two stamps** (`services/voicelab/clone-confirmation.cjs`):

1. **the declaration** — the line read aloud and checked by whisper, or the signed attestation;
2. **the confirmation** — they hear the actual thing that will be used, and say yes to *that*.

When the second stamp landed, every creator of a consented voice was converted to
hold the voice one stamp short — `cartesia.cjs registerVoice`, and
`voice-engine/recordist-consent.cjs`, both via `awaitingHearing()`.

**One was missed.** `POST /api/voicelab/voices/:id/consent-declaration` — the
cast screens' own consent step, the key cut for the lock the standing consent
block created — wrote `captureDeclaration()`'s output straight onto the voice.
That output says `consent_status: 'authorised'`, because before the second stamp
existed the declaration *was* the whole of the consent. So a tick box and a name,
at **dashboard tier** (editor), cast a Cartesia clone that nobody had ever
listened to — at a lower privilege tier than the confirm screen itself.

A clone minted through that door defeats the entire point of the design.

## The fix

`services/voicelab/consent-capture.cjs` now holds the declaration at
`awaiting_hearing`, and it does so for **the class the gate actually asks about**
— `voice-personhood.requiresConsent()`, i.e. a clone or a voice a human has named
a human on. Per the 2026-08-31 ruling a recordist's own recordings and stock
catalogue voices need no recorded yes at all, and holding one of those would put a
second stamp in front of a person the gate never stops: friction bought with
nothing. The class is read off the row **as it will be after this write**, because
naming a person on a row is itself what can move it into the gated class.

Three other changes fall out of that one:

- **The guard was relaxed, and made stronger.** It insisted on
  `declarationRecord.consent_status === 'authorised'`; a held declaration is
  `awaiting_authorisation`. It now tests for `consent_declaration_kind` — the
  thing `declaration.cjs` writes and nothing else does. A status can be typed; a
  declaration kind is only ever written by the capture.
- **The row read was widened** to the fields `classify()` reads (`tts_engine`,
  `provider_id`, `tts_voice_name`, `notes`, `display_name`, `human_name`) — the
  same list the gate reads, so two reads of one row cannot classify it differently.
- **The confirmation routes moved from admin to dashboard tier.** Otherwise the fix
  trades one dead end for another: an editor who records a declaration and cannot
  then play the voice and confirm it is left holding a voice nobody can finish
  consenting. What makes it safe is what those routes cannot do — `confirmation`
  only ever writes an answer onto a voice already `awaiting_hearing` with a
  declaration on it, refuses every other stage, and creates nothing. Overturning a
  decision stays on the admin `PUT …/consent`.

`ConsentStep.vue` hands straight over to `CloneConfirm` when the answer comes back
`held`, and emits `recorded` only once the person has heard the voice and
confirmed it — so every host screen (PodLab, PodCastPanel, VoiceConfiguration,
EstatePanels, LanguagesPanel) keeps its one event and its one meaning: *this voice
may now be cast*.

**This is a deliberate behaviour change.** Consenting at the cast screen no longer
casts on its own; it takes one more listen-and-confirm tap, exactly matching every
other path into a consented voice.

## Verified live

A throwaway Production API instance on `:3921` from the fix worktree, real
database, only the browser bypassed. Production on `:3470` untouched throughout.
Three throwaway `voices` rows, one per class, deleted afterwards; the editor-role
account seeded and torn down.

| voice | classify | POST consent-declaration (editor JWT) | DB row | gate |
|---|---|---|---|---|
| `cartesia_…0001` (clone provenance) | `clone`, gated | 200 `held:true` `stage:awaiting_hearing` | `awaiting_authorisation`, `authorised_by: null` | **refused** — "agreed at sign-up but has not heard this clone yet" |
| `human_zz_…_cym` | `recordist`, exempt | 200 `held:false` `stage:confirmed` | `authorised` | allowed |
| `azure_zz-ZZ-…Neural` | `stock`, exempt | 200 `held:false` `stage:confirmed` | `authorised` | allowed |

Then, on the held clone, as the **same editor**:
`GET /confirmation` → 200, `stage: awaiting_hearing`, answers `[confirm, reject]`;
`POST /confirmation {decision:'confirm'}` → 200, `stage: confirmed`,
`consent.status: authorised`; gate → `allowed: true`.

**Control**, `main` before the fix, same real Cartesia clone row shape: writes
`consent_status: authorised`, `consent_authorised_by: Verification Operator` —
allowed by the gate immediately, with nobody having heard it.

Suites: `services/voicelab` + `services/shared` — 34 files, 580 tests, all green,
including five new ones in `consent-capture.test.js` covering the hold, the
row-less clone, the recordist exemption, and the relaxed guard.
