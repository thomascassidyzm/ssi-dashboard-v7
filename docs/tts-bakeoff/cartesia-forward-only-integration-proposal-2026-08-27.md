# Wiring Cartesia in, forward-only — the proposal

**2026-08-27.** Your ruling: Cartesia is for **new audio only**. No bulk regeneration, existing clips stand. This is what that costs to build, what it silently breaks if done naively, and the one decision in it that is genuinely yours.

**The headline: forward-only is safe by construction at the storage layer.** I checked rather than assumed. It is the *dispatch* layer that needs care, and one legacy corner that would misfile a Cartesia clip as xAI without ever raising an error.

---

## 1. Why the catalogue cannot be touched by accident

A clip's identity is the tuple `(course_code, text_normalized, language, role, voice_id)` — that is the `onConflict` target on every audio upsert (`services/phases/phase8-audio-v13.cjs:624, 2653, 2811, 3596, 3689, 4121, 4350`). And every render mints a **fresh UUID and a fresh S3 key**, unconditionally: `const audioId = uuidv4().toUpperCase(); const s3Key = 'mastered/' + audioId + '.mp3'` (`:2771-2773`). Nothing is ever overwritten in place.

Because **`voice_id` is part of the identity**, a Cartesia render of text an xAI clip already covers has a different `voice_id`, so it cannot collide with the existing row and cannot replace the existing object. It can only ever add.

**So forward-only needs no new storage guard.** The only way to touch the catalogue is to deliberately run a bulk job over it, which is precisely the thing you have ruled out. The policy is the guard, and the data model is already on its side.

---

## 2. What actually has to change — four files, and one of them is a single line

### 2a. The identity allowlist — one line, and it is the keystone

`services/shared/clip-identity.cjs:75` holds `PROVIDER_ALIASES`: azure, xai, elevenlabs, google, narakeet, human. Cartesia is not in it. Add `cartesia: 'cartesia'`.

**Until that line exists, every modern path fails closed** — `canonicalVoiceId` throws `unknown provider hint "cartesia"` rather than guessing (`clip-identity.cjs:222-225`). That is exactly the behaviour you want from a system being extended: it refuses rather than misfiles. This layer is well built and needs nothing but the entry.

### 2b. The generator — one new function, one new case

`services/tts-service.cjs` has `generate()` dispatching on provider (`:497-509`) and one function per provider. Add `generateCartesia()` and a `case 'cartesia'`. It inherits the estate's existing gates for free by sitting inside `generate()`: the child-voice block, and `assertNotHumanVoiceCourse` (`:217`), which is what keeps **Welsh, Breton and Pennsylvania Dutch human-voiced** — that rule holds with no extra work.

Two settings should be baked in from the measurements, not left to callers:
- **`locale`, not `language`.** Cartesia's docs: *"Prefer `locale` when you can. `language` only accepts base ISO codes."* Phase 8 already computes `toBcp47(item.language)` for the xAI call (`phase8-audio-v13.cjs:2728`) — the right value is already in hand at the call site.
- **`generation_config.speed: 1.0` by default.** From the determinism run: pinning it takes the worst-case take-to-take spread from 104% to 38%, for free. It should be the default, overridable per voice.

### 2c. The dispatch duplication — the real cost, and the chance to reduce it

The provider `if/else` is written out **four times**: three in `phase8-audio-v13.cjs` (`:2710-2730` generate, `:4699` regenerate-single, and the regenerate-role path off `:3024`) and once in `tts-service.cjs:497`. Every one of them defaults an unset provider to `'azure'` and throws `Unknown TTS provider` otherwise.

Adding a fourth arm to each is the obvious move and the wrong one — it makes a fifth provider cost five edits and guarantees somebody misses a site.

**The better shape, and it is smaller code than what is there now:** export one `buildProviderTTSConfig(provider, { voiceName, language, speed })` from `tts-service.cjs`, and let each phase-8 site become a single call into `generateWithRetry(text, provider, config)`. Each ~20-line if/else collapses to about three lines; behaviour for azure, xAI and ElevenLabs is unchanged by construction because the same parameters are assembled from the same fields; and Cartesia arrives at all four sites at once instead of three times over.

Said plainly: **this is a refactor of the live generation path, so it carries real risk** and it is the only part of this proposal that does. It touches how *all* future audio is rendered, including new lines on existing courses. It is not retroactive — no existing clip is re-rendered — but it is not nothing either. The existing suites (`services/tts-service.test.cjs`, the phase-8 tests) are the check, and they should run before and after. If you would rather not take that on, the fallback is four copies of one more branch, and I will say honestly that it works and that we will pay for it later.

### 2d. The phonology gate — currently xAI-only, and this is the one that matters

`phonologySuspects()` returns `null` unless `provider === 'xai'` (`tts-service.cjs:635`). That gate exists because of the Italian pilot on 2026-07-10, where `language: 'auto'` made xAI read *"come stai"* with **English** phonology.

That is the exact failure my `come` / `sole` locale test was probing on Cartesia. Wire Cartesia in without touching this line and **the gate silently stops applying** — no error, no warning, just an unguarded provider. It is a one-line change to make the condition a set of providers rather than a string equality, and it should land in the same commit as the generator, not after.

---

## 3. The legacy corner that fails *open* — and would misfile clips as xAI

Everything above fails closed. This does not.

`decodeVoiceId()` in `services/audio-repair-core.cjs:141` parses `xai_|azure_|elevenlabs_` prefixes, treats anything ending `Neural` as Azure, and then **falls through to `{ provider: 'xai' }` for any bare id**. The same shape-guessing is copy-pasted into `tools/repair-presentation-clips.cjs:115-116` and `tools/regen-seed-clips-from-scratch.cjs:219-220`.

A bare Cartesia voice id — and Cartesia's are bare UUIDs like `8fef4d59-0a7e-4ad2-a261-6a3bb50734d2` — lands in that fallback. It would be repaired **as xAI, with a Cartesia id passed to xAI's API**: wrong provider, and a failure whose error message points nowhere near the cause. This sits directly inside the flag-and-regenerate flow you named as in-scope.

**Two ways to fix it, and the second is better on all three counts.** Add `cartesia` to those three regexes — cheap, and leaves three copies of a guess. Or delete the guessing and delegate all three to `canonicalVoiceId` from `clip-identity.cjs`, which already does this properly and throws instead of assuming. That is less code, one behaviour instead of three, and it converts a silent misfile into a loud refusal. It is my recommendation.

**Also to sweep, both trivial:** `EXPLAINER_PROVIDER = 'xai'` hard-coded at `services/run-pod-explainer-batch.cjs:61`, and `tools/pods/pod-voice-identity.cjs:65` hard-coding `'azure'`.

---

## 4. How a course actually gets Cartesia

Provider is per-course, per-role: `courses.voice_config.voices.<role>.provider`. Turning Cartesia on for new work is a config write, not a deploy — which is what makes forward-only easy to hold.

**New courses**: set `provider: 'cartesia'` with `voiceId` set to your clone at creation. Nothing else to do.

**Existing courses**: leave their config alone and they carry on exactly as today. Which raises the one thing I am not deciding for you.

---

## 5. The decision that is yours

**When a clip on an existing course gets flagged and re-rendered, should it come back as Cartesia or as the voice that course already uses?**

The flag-and-regenerate path reads the course's *current* config at render time (`phase8-audio-v13.cjs:3024, 4594`). So this is decided entirely by whether we flip an existing course's `voice_config`, and it cuts both ways:

- **Leave it (my recommendation).** A flagged clip comes back in the same voice as its neighbours. The course stays one voice throughout. Cartesia arrives only on genuinely new courses, and the estate migrates by natural turnover rather than by a decision. The cost: existing courses never get the better voice, and a bad xAI clip is replaced by another xAI clip.
- **Flip it.** Every future render on that course is Cartesia — new lines *and* flagged repairs. The course becomes progressively mixed-voice, one clip at a time, in an order determined by which clips learners happen to flag. That is a product-identity question, not an engineering one, and mid-lesson voice changes are the kind of thing a learner notices without being able to say why.

There is a third option worth naming: **flip it only for the "new lines" case and pin repairs to the original voice** — but that means the render path has to know *why* it is rendering, which it currently does not, and it is more machinery than the problem deserves until you have said the mixed-voice question actually matters.

**"Leave it, and revisit when a course is due a refresh anyway" is a first-class answer**, and it is the one that costs nothing and keeps every course coherent.

---

## 6. What I have not established

- **What promotes a flag to regeneration.** A learner's flag lands at `sample_flags.status = 'needs_review'` (`ssi-learning-app`, `ReportIssueButton.vue:100`). I could not find the code path that moves it to `flagged_regen_tts` — it appears to be a manual dashboard reclassification, but I am not asserting that. It does not change the proposal; it does mean nobody should assume flags regenerate themselves.
- **Two flag systems coexist.** `sample_flags` and a newer `audio_flags` are both live, with `services/supabase-client.cjs:1333` commenting that the latter "replaces complex sample_flags". Which one is authoritative is a separate question from this one, and worth answering before anyone builds on either.
- **No Cartesia code exists anywhere in the estate today.** This is greenfield, which is why the shape is worth getting right once.

---

## 7. The caveat this wiring ships with

From the short-phrase measurements, and it belongs in the commit message as much as in this document: **Cartesia wanders take-to-take on short text.** No seed parameter exists; median spread ~26% silence-trimmed, worst case 104% on a three-word LEGO, concentrated at exactly the two-to-three-word length the course drills at. Pinning `generation_config.speed` halves it and is therefore not optional in our config, it is a default.

Whether that residual wander is acceptable is your ear's call, not a number's — the clips are at `/d/1f12cba4`. And if it is not acceptable, the answer is a **Pro clone**, which learns pacing from a dataset rather than guessing it from six seconds, and needs 30 minutes of your voice minimum. That experiment is specified and waiting on a real recording.

**Nothing in this document has been built.** It is a proposal, and the sequencing question in section 5 is the one I need from you before anything is.
