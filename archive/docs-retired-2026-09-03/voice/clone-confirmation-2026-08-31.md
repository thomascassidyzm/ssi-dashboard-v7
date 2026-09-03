# You cannot consent to a clone you have not heard — the second stamp

**Tom's refinement, 2026-08-31**, hours after the onboarding consent step landed (`c006e1e25`):

> automatic consent is better and then a click to confirm or something, once voice clone has
> been generated

Consent is now **two stamps on one voice**, and only the second one casts.

| | what it is | when | what it does |
|---|---|---|---|
| 1. **the declaration** | the line read aloud and checked by whisper, or the signed attestation — `services/voicelab/declaration.cjs`, unchanged | at sign-up, or at clone time | records who they are and that they agree. **No longer casts anything on its own.** |
| 2. **the confirmation** | they hear their own clone and click — `services/voicelab/clone-confirmation.cjs`, new | once the clone exists | makes the voice castable, or closes it for good |

**Why the second one is the load-bearing one.** Agreeing in the abstract to "my voice being
cloned" is signing blind: nobody knows what the clone will sound like at the moment it is agreed
to — not the person, not the operator, not Cartesia. Hearing the thing speak in your own voice and
then saying yes is consent to the actual object. It is also the only moment where *"that doesn't
sound like me"* can be said before a learner hears it.

---

## 1. It adds no new state, and that is the design

The obvious build is a "half-consented" flag, and it is the wrong one: a new state is a new thing
every gate in the estate has to learn about, and the one that forgets waves an unconfirmed clone
through. There is already a state meaning *a person is attached to this voice and nobody has said
yes* — `awaiting_authorisation` — and the hard block (`c91df2cb5`) already refuses it **everywhere**.

So a clone between its two stamps sits in that same state, is refused by that same block, and needs
no new rule anywhere. What the new module adds is the **distinction between the two ways of being in
it**, drawn from a column that already exists (`consent_declaration_kind`) — so **no migration**, and
a gate that has never heard of this file still refuses both:

```
awaiting_authorisation, no declaration  → nobody has asked this person
awaiting_authorisation, a declaration   → they agreed at sign-up, waiting to hear the clone
```

## 2. What changed

| Where | Now |
|---|---|
| `services/voicelab/clone-confirmation.cjs` **(new)** | the rules, pure: `stageOf`, `awaitingHearing`, `confirmedRecord`, `rejectedRecord`, `isHearableForDecision`, `describe`. 17 tests |
| `cartesia.createClone` | the declaration is merged in **held one stamp short** — every clone, from every route, is born `awaiting_authorisation` |
| `recordist-consent.cjs` (onboarding) | writes the same held record: sign-up consent is necessary and **no longer sufficient** |
| `GET/POST /api/voicelab/voices/:id/confirmation` **(new)** | read the question; record the click. A second answer on a decided voice is `409 ALREADY_DECIDED` — a no does not get overwritten by somebody who was not there |
| `POST …/team/assign-slot` | the 409 now says **which** stamp is missing (`needsCloneConfirmation` vs `needsOnboardingConsent`), so nobody is asked to consent twice |
| `consent.cjs` wording | `awaiting_authorisation` with a declaration reads "agreed at sign-up and has not heard this clone yet", not "has not been asked" |
| `CloneConfirm.vue` **(new)**, `LanguagesPanel.vue`, `TeamRoster.vue` | the strip under the clone's own audio, and the roster banner naming the outstanding step |

### The one deliberate hole, and why the flow deadlocks without it

An unconfirmed clone cannot be rendered — so the person can never hear the thing they are being
asked to confirm. `consentGate.assertHearableForDecision` opens for `awaiting_hearing` and
**nothing else**: a refused, withdrawn or never-declared voice stays refused, because "play it once
more" is how a no gets worn down. It is a **separate export** rather than a flag on the ordinary
door, so no caller can widen that one by passing an option. The Voice Lab audition route sets it;
what comes out is played to one person and lives in the lab's own clip store — never `course_audio`,
never a cast.

### The reject is equal weight, by construction

Same element, same class, same size, same one tap, side by side, both labels served from the same
backend `describe()`. And it writes `refused` — the status the block treats as **final** — not a
softer word for "not yet". A confirm step where the no is harder than the yes is a funnel, not a
consent.

## 3. Proof

**Unit** — `services/voicelab/clone-confirmation.test.js`, 17 tests: the two ways of being
unconsented are told apart; the declaration keeps its words and loses only its authorisation; the
**block** refuses a declared-but-unheard clone and allows it the moment the confirmation lands;
hearing-to-decide is refused for refused, withdrawn and never-declared voices; the reject writes
`refused` and keeps their own words. `team-router.consent.test.cjs` — **two tests flipped
deliberately**: they asserted sign-up consent cast on its own, which is what Tom changed.

**Live**, against the deployed production API on `f84bb73c9` and the real database, with only the
browser bypassed (a real admin JWT, every call over HTTP). Snapshotted and restored:

```
1. ONBOARDING CONSENT → 200  consent.status=awaiting_authorisation  kind=attested
                             confirmation.stage=awaiting_hearing  answers=["confirm","reject"]
2. CAST BEFORE        → 409  code=NO_RECORDED_CONSENT  needsCloneConfirmation=true
                             "…agreed at sign-up but has not heard this clone yet…"
                             target1 untouched? true
2b RENDER BEFORE      → REFUSED (the same sentence)
   HEARING TO DECIDE  → ALLOWED (forDecision=true)
3. THE QUESTION       → 200  two answers, one shape
4. REJECT             → 200  stage=rejected  status=refused
   render after       → REFUSED   hearing after → REFUSED   cast after → 409
5. CONFIRM            → 200  status=authorised  by="E2E Probe Voice A"
                             how="heard their own clone and confirmed it"
   a second answer    → 409  ALREADY_DECIDED
6. CAST AFTER         → 200  target1 = {provider:"human", voiceId:"human_e2e_pod_voice_a_zzz_test"}
   render after       → ALLOWED
RESTORED — voice_config identical? true | probe voices row removed? true
```

## 4. The consequence to know about

**An onboarded recordist whose voice has no clone yet cannot be cast.** Sign-up consent no longer
casts, and the second stamp is about hearing a generated clone — so a person onboarded to a course
where nothing has been cloned for them sits at `awaiting_authorisation` until one is. That is what
the refinement asks for, and today it costs nothing: the onboarding route is hours old and no live
recordist has been through it. It matters for **Welsh, Breton and Cornish**, where Cartesia cannot
clone at all and the recordists are human-voiced by design — those people will need either a clone
to hear or a ruling that a human-recorded voice is confirmed by hearing their own take. **Not
decided here, and Tom's call.** [NEEDS TOM]
