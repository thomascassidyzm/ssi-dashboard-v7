# Hear your own recording — the second stamp for people we cannot clone

**Tom's ruling, 2026-08-31**, closing the hole the second-stamp write-up
(`docs/voice/clone-confirmation-2026-08-31.md` §4) named and left open:

> play back their OWN RECORDED TAKE as the confirmation instead of a generated clone… no
> carve-out for these three languages: the principle stays the same — hear the actual thing that
> will be used, then consent to it. For these languages, the actual thing IS their own recording,
> not a synthesized clone.

## The hole

The second stamp made hearing a clone the thing that casts a voice. Welsh, Breton and Cornish
recordists are **human-voiced by design** and Cartesia **cannot clone those languages at all**, so
there was never going to be a clone for them to hear. Sign-up consent alone no longer casts; a
clone they could hear could not exist. Those recordists were unblockable.

## The ruling, and why it is not a carve-out

The first reading is three languages that skip the second stamp. That is the wrong one, because
**the second stamp was never about clones.** It is about hearing THE ACTUAL THING THAT WILL BE USED
and then consenting to it.

| the voice is | the actual thing that will be used | so that is what they hear |
|---|---|---|
| a clone | the clone | a rendered audition |
| a human recordist | **their own take** — literally the file a learner will play | that file, from the estate's own bucket |

For a recordist their own take is a **stronger** object to consent to than a clone, not a weaker
one: a clone is an approximation of them, a take is them. So there is no second flow, no exemption
and nothing new for any gate to learn. Same stages, same `awaiting_hearing` → `confirmed`/`refused`
machine, same hard block, same two answers in the same shape. **The only thing that varies is where
the audio comes from**, and that is one function and some words.

### No language code appears anywhere in the rule

`cym` / `bre` / `cor` are why Tom ruled; they are not the rule. What the code asks is *is this
voice a recording of a person, or a synthesis of one*, and it asks
**`services/shared/voice-personhood.cjs`** — the classifier that landed hours earlier under job
**#543**, which the consent gate and the census tools already read. `classify() === 'recordist'`
is the whole of the answer, and it resolves from a `human_*` id or `type: 'human'`, so a recordist
with no `voices` row at all still gets it. A test strips the comments from
`clone-confirmation.cjs` and asserts no language code survives. The day Cartesia can clone Welsh,
nothing here has to change.

## What changed

| Where | Now |
|---|---|
| `services/voicelab/clone-confirmation.cjs` | `hearingSourceOf()` → `clone` \| `own_recording`, delegating to `voice-personhood.classify()`. `describe()` gains a `hearing` block (what, where from, whether it spends, how many takes exist) and source-aware headings and answer labels. `confirmedRecord`/`rejectedRecord` write **what they actually heard** |
| `services/shared/voice-consent-gate.cjs` | the refusal names the right thing to play: *"has not heard their own recording back yet. Play one of their takes to them"*, never a clone that cannot exist |
| `GET …/voices/:id/confirmation` | returns the person's **own takes** with playable bucket URLs when the source is `own_recording` — longest first, capped at 5 |
| `POST …/voices/:id/confirmation` | **new server-side refusal, `409 NOTHING_TO_HEAR`**: a yes from somebody the estate holds no recording of is refused. A **no is always allowed** — "I do not want my voice used" must never need a recording first |
| `CloneConfirm.vue` | the same strip; on the own-recording path it plays the takes inline and knows for itself whether they were played |
| `TeamRoster.vue` | the blocked-assignment card now carries the strip, so a Welsh recordist is asked **there**, and a yes retries the assignment immediately |

### The audit trail says what they heard

`consent_authorised_how` is what somebody reads in a year to learn what a person agreed to.
Writing *"heard their own clone"* onto a Welsh recordist would be a false record of a consent
event, which is the one thing this subsystem exists to prevent. So it writes **"heard their own
recording and confirmed it"**, and the reject note matches.

### And nothing renders on this path

Playing a clone costs money at a vendor and goes through the daily ceiling; it also needs
`assertHearableForDecision`, the one deliberate hole in *no consent, no speech*. Playing somebody's
own take **spends nothing, renders nothing and does not touch that hole at all** — it is an
existing file in the estate's own bucket. One fewer thing that can ever be widened.

### The one thing that is genuinely new

A recordist who has agreed at sign-up but **recorded nothing yet** has nothing to play back. That
is the ordinary shape of a recordist's first week, not an error — so the screen withholds both
answers and says what happens next, and the server refuses the yes on the same fact. A confirm
button above silence is the blind signing this whole step exists to abolish, wearing its own
uniform.

## Proof

**Unit** — 872 tests green across `services/voicelab/`, `services/voice-engine/` and
`services/shared/`, including #543's `voice-personhood.test.js`. 9 new tests in
`clone-confirmation.test.js` cover: the source is read from what the voice IS; the same state
machine and the same block; the audit trail says "recording"; the wording and both answers; no
answers when nothing is recorded; the clone path unchanged; the delegation to personhood (a stock
voice and #543's rescued ElevenLabs clone both still classify as `clone`).

**Two tests changed deliberately**, both because they asserted something that was never right:
- `clone-confirmation.test.js` — a fixture rowed a `cartesia_` clone as `type: 'human'`. Redundant
  then, wrong now that `type` answers a second question. A real clone row in this estate is
  `type: 'tts'` with a `cartesia-clone` metadata_source; the fixture now says so.
- `team-router.consent.test.cjs` — asserted the onboarding refusal says *"has not heard this clone
  yet"*. Onboarding mints a `type: 'human'` recordist whose voice **is** their own takes; there is
  no clone of them anywhere, and for Welsh, Breton and Cornish there cannot be one.

**Live, on staging** — a Production API on **:3505** running from this branch's worktree, against
the real database, **with only the browser bypassed**: a real Supabase admin JWT, every call over
HTTP. Popty has no standing staging environment (its environments are machines — Camberley,
watson-1 — behind the Environment Switcher), so one was stood up for this. **The production
service on :3470 was not touched.**

```
0. ADMIN JWT      → real Supabase token, role=admin
1. FIXTURES       → recordist WITH 3 own takes | recordist with 0 | a clone control
2. THE QUESTION   → 200 stage=awaiting_hearing source=own_recording spends=false clips=3
   heading        → "…agreed to this at sign-up. Now play their own recording back to them…"
   answers        → ["Yes, that is my recording — use it", "No, do not use my recording"]
   clip is ALIVE  → HTTP 200 audio/mpeg 18,389 bytes, straight from the estate's bucket
3. CAST BEFORE    → 409 NO_RECORDED_CONSENT | slot row written? NO
   refusal        → "…has not heard their own recording back yet. Play one of their takes…"
4. NO TAKES YET   → GET 200 canDecide=false answers=0 nothingRecorded=true
   CLIENT BYPASSED→ POST confirm anyway: 409 NOTHING_TO_HEAR, still awaiting_authorisation
   but a NO       → 200 stage=rejected      (a refusal never needs a recording first)
5. CONFIRM        → 200 stage=confirmed  how="heard their own recording and confirmed it"
   second answer  → 409 ALREADY_DECIDED
6. CAST AFTER     → 200  slot row = the recordist's voice
7. CLONE CONTROL  → 200 source=clone spends=true, "play the clone to them", and
                    how="heard their own clone and confirmed it" — unchanged
RESTORED          → all three probe voices removed | test slot removed | probe admin removed
```

Step 4 is the one that matters for "the client cannot get round it": the screen withholds the
buttons, and a hand-rolled `POST` that ignores the screen is refused by the endpoint that writes
the row.

**The SPA builds** (`vite build`, clean).

## Where this leaves Welsh, Breton and Cornish

The mechanism is in place and proved. **No live recordist has been through it**, because the
recordists who hold the estate's Welsh audio today — `human_aran_cym_n` (81 cym clips),
`human_catrinlliar_cym_n` (56) — have **no `voices` row at all**, which is the gap the consent
census already named. They read as `unasked`, not `awaiting_hearing`, so nobody can confirm on
their behalf and nothing has been minted for them here. Giving them a row is a consent event with
a real person in it: Tom's, not an agent's. **[NEEDS TOM]**
