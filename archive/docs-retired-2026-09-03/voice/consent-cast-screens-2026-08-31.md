# The cast screens get a key — and the answer to "is the block cosmetic?"

**2026-08-31.** Follow-up to the consent hard block (`c91df2cb5`) and consent-in-onboarding
(`c006e1e25`). The census that commissioned this work found PodLab's cast screen refusing every
new pod speaker with no way to satisfy the refusal. That is fixed. First, the more serious
question.

---

## 1. Is the consent block cosmetic for pre-existing voices? **No. It is real, and it bites.**

The check is on the **consent record**, not on a creation date. Nothing anywhere in
`services/shared/voice-consent-gate.cjs` looks at when a voice was made, and there is no
grandfather clause: `consent_status` defaults to `not_recorded` for every row that existed before
the migration, and `not_recorded` is refused exactly as hard as a brand-new voice with nothing on
it. A `human_*` id with **no `voices` row at all** is refused too, on the grounds that "we know
nothing about this person" is the strongest possible reason to refuse.

Run live against the production database, 2026-08-31 (`scripts/probe-gate.cjs`, read-only, 309
`voices` rows read):

| Voice | Created | Verdict |
|---|---|---|
| `human_welsh_source`, `_target1`, `_target2`, `_presentation` | 2025-12-23 | **REFUSE** |
| `human_spa_for_eng_known/target1/target2/presentation` | 2025-12-24 | **REFUSE** |
| `human_cym_n_for_eng_*` (4) | 2025-12-24 | **REFUSE** |
| `human_cym_s_for_eng_*` (4) | 2025-12-31 | **REFUSE** |
| `gfzdpspr5fdp` — Tom's own clone, 1826 cast sites | 2026-07-04 | **REFUSE** |
| `human_kai_fin` | 2026-08-19 | **REFUSE** |
| `cartesia_e7ed10ad-…` | 2026-08-31 | **REFUSE** |
| `cartesia_f56e05e2-…` (the one consented voice in the estate) | 2026-08-31 | ALLOW |

Twenty voices in the estate are ones where the consent question is real. **Nineteen of them are
refused, and eighteen of those pre-date the block.** All nine of the voices the 2026-08-31 census
found cast with no consent come back REFUSE on a live `verdictFor` read, including the four
`human_*` ids that have never had a `voices` row.

**And it is not only casting.** The gate is wired into the render path as well —
`tts-service.generate()`, `azure-tts-service` (both entry points) and `elevenlabs-service` (all
three) each call `assertConsentedForRender` before a single character is sent to a provider. So
any NEW render on any of those nineteen voices fails with a 403-shaped client error, not a retry.
Already-rendered audio keeps being served — pulling shipped clips is a separate, destructive
decision that nobody has taken — but `gfzdpspr5fdp` is cast into 20 course roles and 1826 sites,
and none of them can produce a new clip until somebody records a consent for it. **That is the
live consequence Tom should know about, and it is not a UI problem.**

## 2. What was broken, and what now works

Consent could only ever be **captured at the moment a voice was born** — inside the Voice Lab's
clone flows, or in recordist onboarding. Both cast screens cast voices they did not create:

- **`PodCastPanel.vue` → `PUT /pods/cast`** mints a `human_*` id the moment you type somebody's
  name, so every NEW pod speaker was refused, always, with the refusal shown as a flat red line
  and nothing to do about it. The previous worker named this exact flow and deliberately left it
  (`consent-in-onboarding-2026-08-31.md` §4c: *"Nobody can cast a new pod speaker until it
  exists."*).
- **`PodLab.vue` → `POST /api/pod-cast-voices`** and its ▶ audition. The pools are vendor stock
  today so it does not bite yet, but it is the same lock and it now has the same key.

Both now branch on the refusal's `code` and open a consent step **on the voice that was refused**,
then **finish the job the refusal interrupted** — so a human goes from blocked to cast in one
pass, on one screen, without a trip to the Voice Lab.

## 3. The same mechanism, not a second one

| Piece | What it is |
|---|---|
| `services/voicelab/consent-capture.cjs` | records a declaration onto a voice that **already exists** — the one thing neither cloning nor onboarding can do. Creates the `voices` row when there is none, which is the repair path for the four `human_*` ids that have never had one. Writes consent columns and nothing else. |
| `POST /api/voicelab/voices/:id/consent-declaration` | the same two shapes as `POST /team/:course/consent`: multipart with the line read aloud and checked by whisper on the box, or a named written statement. |
| `GET /api/voicelab/consent-wording` | the words alone, so a screen need not pay for the whole `/params` payload to show somebody the line they are about to read. |
| `ConsentStep.vue` | **one** component, used by both cast screens, showing the backend's copy of the wording — so what a person was shown and what the database records them as agreeing to cannot drift when Tom redlines the sentence. |

The words, the whisper check, the 0.7 coverage threshold and the columns are `declaration.cjs` and
`consent.cjs`, unchanged. Nothing about consent is decided in the new code.

**Two deliberate rulings inside it, both flagged for Tom:**

1. **A recorded no is never walked back from a cast screen.** `refused` and `withdrawn` are
   refused outright with their own code (`CONSENT_REFUSED_ALREADY`). Reversing a no stays on the
   Voice Lab's admin editor, where the operator can see the whole record.
2. **The route takes a dashboard session, not admin.** Admin-only would leave the lock keyless for
   exactly the people who hit it — a course leader casting a pod. The estate already has this
   precedent (an editor may record consent for a member of their course's team). What makes it
   safe is what the route cannot do: it can only add a fresh, evidenced yes with a named person
   and a named operator, and it cannot overturn a no.

## 4. Proof

**A real browser, on the real screen.** `e2e/pod-recording/05-cast-consent-step.spec.js` drives
`PodCastPanel` in Chromium against a local production-api and the live database: two people nobody
has ever asked → **save refused**, step opens naming the person → **nothing written** by the
refused save (voice_config byte-identical) → the wording read from the backend → one attestation
each → **the same save finishes itself**, both `voices` rows written `authorised` and both ids in
`courses.voice_config`. Passes in 8.5s. Snapshots and restores everything it touches.

It earned its keep on the first run: `recordConsent` had been added as a **second key of the same
name** in `labApi`'s exported object, so the new call silently resolved to the older admin PUT that
writes a decision without a declaration. The step appeared to work, wrote nothing, and the save
refused the same person forever. A vitest suite would not have caught it.

**The routers, live.** `scripts/live-consent-cast-probe.cjs` — real `pods-router` and real
`voicelab` router against the real database on `zzz_test_for_eng`, only the JWT stubbed:

```
1. cast a new pod speaker nobody has asked   409 NO_RECORDED_CONSENT, nothing written (verified)
2. a tick with nobody behind it              400 "Nobody has agreed to the consent wording…"
3. signed                                    200 created=true, voices row written authorised/attested
4. the same cast, now                        200 success=true
5. and a no is not walked back from here     409 CONSENT_REFUSED_ALREADY
   restore: voice_config restored=true, probe voice row gone
```

**Unit.** `services/voicelab/consent-capture.test.js` — 6 tests: updates an existing row and
touches nothing but consent columns; creates the row a `human_*` id never had; refuses to invent a
row without being told the language; refuses to write a yes no declaration produced; refuses to
walk back a no; insists on a named person. 171 tests green across `services/voicelab/`,
`PodLab.casting.test.js` and the consent gate.

**What is NOT proven here, stated plainly:** the browser walk exercises the **attested** branch.
The **spoken** branch — the line read aloud and checked by whisper — is proven by
`declaration.test.js` and by the onboarding worker's live probe, not by a browser in this pass:
the fake-mic fixture plays a clip that does not contain the consent line, so it can only produce
the refusal, never the pass.

## 5. Every other screen that provisions or casts a voice

Two passes: my own, and an independent read-only census (job #541) run against `origin/main`
before these commits landed. They agree, and #541 found one surface I had missed — the Voice Lab's
own Declare tab.

| Surface | Gated route | Verdict |
|---|---|---|
| `PodCastPanel.vue` (PodDetailView, PodsView, PodScriptsView) | `PUT /pods/cast` | **FIXED.** The headline defect: no new pod speaker was castable by anybody. |
| `PodLab.vue` voice picker + ▶ audition | `POST /api/pod-cast-voices`, `POST /api/voices/preview` | **FIXED.** Same lock; the pools are vendor stock today so it does not bite yet. |
| `VoiceConfiguration.vue` — the course-role cast | `PUT /api/courses/:c/voice-config`, gated inside `voice-config-service.cjs` | **FIXED.** Worse than the others: its ▶ preview and Test buttons swallowed *every* failure into `console.error` without even checking `response.ok`, so a consent refusal there was invisible and the button simply did nothing. #541 called this a different shape needing its own design; on reading it the reuse turned out to be the same three-line branch the others take, so it is fixed rather than flagged — but its silent-swallow was a general defect that consent merely exposed, and whether that screen wants a proper error region rather than borrowing `saveStatus` is a taste call left alone. |
| `EstatePanels.vue` — the Voice Lab's Declare tab | `POST /api/voices/declare` | **FIXED.** Found by #541, missed by me. A declaration locks a course side to a voice — a cast under another name — and the panel showed the refusal honestly and then had nothing to offer. |
| `TeamRoster.vue` | `POST /team/:c/assign-slot` | already had a key. #541's words: the reference implementation — it branches on `detail.code` and opens its own inline consent flow before retrying. |
| `CandidateVoices.vue` / `LanguagesPanel.vue` | `PUT /api/voicelab/languages/:lang/slot`, the clone routes | already had a key: consent badge, disabled Cast with a reason, editor beside it. |
| `AdminRecording.vue` | — | never reaches the gate; it only toggles `humanOnly` and writes no voice map. |
| `tools/pod-recast.cjs` (CLI) | the gate directly | no change needed — it refuses with the gate's own sentence, which names what to do, and the operator has a screen to go to. |

#541 also confirmed two gated writers that the hard-block doc's call-site list does not name:
`voice-config-service.cjs:551` and `pods-router.cjs:398`. Both are genuinely gated; the list was
incomplete, not the code.

Nothing else in `src/` or `tools/` calls a consent-gated route.
