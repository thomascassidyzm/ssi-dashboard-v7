# Consent is part of onboarding now — the last mint-before-consent door

**Tom's ruling, 2026-08-31**, following the hard block of the same day:

> Consent becomes part of onboarding a recordist. A person being onboarded to record for us is
> exactly who should be stating, on the record, that they agree to their voice being used and
> cloned — so onboarding must CAPTURE consent as a step of the process, and mint the voice id
> with a consent record already attached.

And explicitly: **do not carve an exemption into the block for onboarding.** With consent captured
up front, the standing block simply never fires for a properly onboarded recordist.

---

## 1. What the previous worker left open, and why

`POST /api/production/:courseCode/team/assign-slot` minted a `human_*` voice id for a person and
cast it into `courses.voice_config` in one motion. The consent gate refuses any `human_*` id with
no recorded consent — correctly — so gating that route as it stood would have blocked onboarding
outright. The worker named the door and stopped, which was the right call:
`docs/voice/consent-hard-block-2026-08-31.md` §4.

The fix is not an exemption. **The consent moved earlier.**

## 2. What changed

| Where | Before | Now |
|---|---|---|
| `POST …/team/consent` **(new)** | — | the consent step: the read-aloud line checked by whisper, or the signed attestation. Mints the person's `human_*` id **and writes the `voices` row with the yes already on it**, in one write |
| `GET …/team/consent-wording` **(new)** | — | the exact line and attestation the screen must show, from the backend, so what a person agreed to and what they were shown cannot drift |
| `POST …/team/assign-slot` | minted a voice id for anybody | **mints nothing.** Casts the person's already-consented id, and runs the ordinary standing gate over it. 409 `NO_RECORDED_CONSENT` with `needsOnboardingConsent:true` otherwise |
| `TeamRoster.vue` | Assign → done | Assign → if nobody has asked them, the consent step opens in place, records their permission, and finishes the assignment. Not a warning, not a dialog to click past |
| `POST /api/auth/users` (admin invite) | minted `human_{email}_{lang}` onto every non-admin invitee | **mints nothing.** See §4 |
| `POST /api/voicelab/…/clone-from-estate` | cloned a real person at Cartesia, born `awaiting_authorisation` | takes the same signed attestation as the upload route |
| `declaration.captureDeclaration()` **(new)** | the three ways through lived inside the clone route | one function, both routes. A rule in two places is one redline from meaning two things |

**No new consent machinery.** The words, the whisper check, the threshold and the columns are the
same `services/voicelab/declaration.cjs` the clone route uses. A recordist's yes and a clone
subject's yes are the same yes.

**A recordist may consent for themselves and for nobody else** — the one exception to the
read-only rule for the `recorder` role, because consent done *about* people rather than *by* them
is not consent.

## 3. The `voices` row onboarding never wrote

Slot assignment wrote `dashboard_users.voice_id` and `courses.voice_config` and **never registered
the voice anywhere a consent question could be asked of it**. That is why six of the nine
unconsented cast voices found on 2026-08-31 — `human_sasha_wanasky_deu_at`, the Welsh recordists —
are `human_*` ids with no `voices` row at all. `onboardConsentedVoice` writes that row, with the
consent columns in the same insert. It is also the repair path for the legacy ids: recording
consent for one of those people creates the row they never had.

## 4. Other places that created a voice id ahead of consent

Tom: *"If you find ANY other place that mints or casts a voice ahead of consent existing … fix it
the same way. Name any such place you find, whether you fixed it or not."* Four found.

**(a) `POST /api/auth/users` — admin invite. FIXED.**
Minted `human_{email-localpart}_{lang}` onto every non-admin invitee — a voice id for a real
person created the moment somebody typed their email address, months before they were ever in the
room. Removed. Nothing depended on it: the invite-code **redeem** path has never set `voice_id`,
so accounts arriving that way already had none, and the recordist surface takes its identity from
the link (`/r/:voiceId`), not from that column. The id is now minted by the consent step.

**(b) `POST /api/voicelab/voices/cartesia/clone-from-estate`. FIXED.**
Created a clone of a real person **at a vendor** from our own archive, with no declaration at all,
born `awaiting_authorisation`. The reasoning was that no live speaker is present to declare
anything — true, and the same is true of the upload route, which asks for the next honest thing
instead. Cloning somebody from our archive of their takes is precisely the case where a named
human should have to state they hold that right. It now takes the same signed attestation. It
cannot block anyone: one tick and a name, admin-only.

**(c) `pods-cast.cjs mintPeopleVoiceIds` + `PUT …/pods/cast` provisioning. NOT A HOLE — but it is
now a BLOCKED FLOW, and that needs your decision.**
The pod cast proposal mints `human_*` ids for people, and saving the cast provisions them a
`dashboard_users` row carrying that id. The consent gate already runs **before** the merge and
before provisioning, so nothing unconsented is ever written — the hole is closed. The consequence
is the one this whole job was about: **casting a NEW person into a pod is now refused outright,
and there is no consent step in that flow to satisfy it.** The server side would be small (the
same `onboardConsentedVoice`, given the id the proposal already minted); the cost is a consent step
in PodLab's cast screen. I have not built it — it is its own piece of work with its own screen, and
you should decide whether it is next. **Nobody can cast a new pod speaker until it exists.**

**(d) `services/voice-engine/synthesis-job.cjs`.** Named for completeness only. It splices a
person's own takes and creates nothing; the previous worker's read is correct.

## 5. Proof

`services/voice-engine/team-router.consent.test.cjs` — 9 tests at the endpoint, over a stub estate:
assigning to somebody nobody has asked is refused and **writes nothing at all**; the refusal is
branchable; a minted id with no `voices` row behind it is still refused (the Sasha shape); the
spoken line mints the voice with `authorised` in a single `voices` write and the assignment then
goes through; an unread line is refused and quotes what was heard; a tick with nobody behind it is
not a permission; a recordist may consent for themselves and for nobody else, and still cannot
assign slots.

`services/voicelab/declaration.test.js` — four more on `captureDeclaration`, the load-bearing one
being that a **missing `sampleFrom` falls to the branch that cannot be faked** and never listens.

Live end-to-end against the deployed production API is recorded in §6.

## 6. Live verification — a real onboarding, with and without consent

Production API restarted on the `-prod` checkout at `1ac3452a8`. The probe below ran the **real
router against the real database** with the real consent gate — only the dashboard JWT is stubbed,
because only a browser can mint one. It used the existing `e2e-pod-voice-a@ssi-test.invalid`
identity on `zzz_test_for_eng`, snapshotted every row it touched and restored all of them.

**1. Onboarding somebody nobody has asked — REFUSED, nothing written.**
```
HTTP 409  code=NO_RECORDED_CONSENT  needsOnboardingConsent=true
"No consent is recorded for human_e2e_pod_voice_a_zzz_test. Record consent for this voice…"
target1 unchanged? true
```
Note the shape: this person already **held** a minted voice id (`human_e2e_pod_voice_a_zzz_test`)
with no `voices` row behind it — the Sasha shape — and it was still refused.

**2. A recording that does not carry the line — REFUSED.** Whisper is installed on this box; the
probe sent 64 kB of silence, which whisper could not decode at all, so the honest answer was
"could not check" and the route fell to demanding the written statement rather than passing:
```
HTTP 400  needsAttestation=true
"This machine cannot listen to the recording to check that the consent line was read…"
```
(A recording that decodes but does not contain the line comes back `declarationNotHeard` with
what was heard quoted — pinned in the tests.)

**3. The consent step — accepted, and the voice written with the yes in it.**
```
HTTP 200  voice_id=human_e2e_pod_voice_a_zzz_test  consent.status=authorised  kind=attested
voices row: type=human, consent_status=authorised, consent_person="E2E Probe Voice A",
            consent_authorised_by="E2E Probe Voice A",
            consent_authorised_how="agreed to the consent wording when uploading the recording",
            consent_authorised_at=2026-08-31T21:05:33Z,
            consent_declaration="This is my own voice, or I have the right to use this recording…"
```
That `voices` row did not exist before this call.

**4. The same onboarding, now — GOES THROUGH.**
```
HTTP 200  slot=target1  voice={provider:"human", voiceId:"human_e2e_pod_voice_a_zzz_test", …}
```

**5. Restored.** `target1` back to `null`, the probe's `voices` row deleted, `voice_id` restored.
Verified in the same run: `target1 restored? true`, `probe voices row removed? true`.
