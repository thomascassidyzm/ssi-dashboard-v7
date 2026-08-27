# xAI: what the terms actually say, and where a custom voice ID enters

**Read and written 2026-08-27.** Probe only — no course audio regenerated, no `voice_config` touched, no database writes.

---

## The headline, before anything else

**Tom already has an xAI voice clone, and it is already the production voice across the estate.**

`GET https://api.x.ai/v1/custom-voices` on SSi's live key returns exactly one voice:

```json
{"voices":[{"voice_id":"gfzdpspr5fdp","name":"Tom001","gender":"male",
"age":"middle-aged","language":"en","tone":"warm",
"created_at":"2026-05-01T14:29:49.290068+00:00"}],"total_count":1,"cap":30}
```

That ID is not new to this repo. It is the English known-side and presentation voice of record — `docs/presentation-authoring-redesign.md:49`: *"English-known courses (X_for_eng) use Tom's xAI clone (`voice_id gfzdpspr5fdp`, ruled 2026-07-04)"* — and it has 44,616 clips against it in the 2026-08-14 pod audit. So the question "why can't I just generate the audio using xAI?" has a short answer on the technical side: **you already do, every day, in your own cloned voice.**

What is left is therefore not a pipeline. It is the licence question, and one flag about the OpenAI consent clip.

## The tension, named once and not resolved

The phase-1 report opens: *"SSi is leaving xAI voices — a founding-team ethical choice, Aran will not feed the Musk universe."* The unblock being considered here uses xAI to generate the clone source for the vendors that would replace xAI. Whether that sits with Aran's ruling is a real question, it is not mine, and it did not change anything below. Tom decides whether Aran is in the conversation before phase 2 uses any of this.

---

## 1. The terms, verbatim

Three documents matter. All read **27 August 2026**. All three were HTTP 403 to a plain fetcher and 200 to a browser user-agent; quotes below are from the live pages.

Note the corporate name on the current pages is **SpaceXAI LLC** throughout; quotes preserve it.

### Which agreement binds SSi?

SSi uses an API key (`XAI_API_KEY`) from the API console. The Consumer terms say, at the top:

> "…govern the use of our Services for developers and businesses, including SpaceXAI APIs and PromptIDE."
> — https://x.ai/legal/terms-of-service, Effective: August 24, 2026 (read 2026-08-27)

The Enterprise agreement says:

> "*Note: These terms are for enterprise (business) users of the SpaceXAI API and related SpaceXAI Services (including Grok) who are at least 18 years old. For consumer use of Grok, please see our Terms of Service — Consumer.*"
> — https://x.ai/legal/terms-of-service-enterprise (read 2026-08-27)

and is effective

> "as of the earliest date Customer makes an applicable purchase memorialized by an SpaceXAI online purchase confirmation or executes an Order Form"

**Both readings are live and I cannot settle it from the outside.** A pay-as-you-go API account arguably "makes an applicable purchase" and is a business user, which points at Enterprise; the Consumer page also claims developers and APIs, which points at Consumer. One corroborating fact: `POST /v1/custom-voices` is documented as *"gated to teams on an Enterprise plan"*, and SSi's key can **read** `/v1/custom-voices` but I did not test the write, so this does not resolve it either. **It matters, because the two documents restrict output-training differently — see 1b.** Recommendation at the end.

The **Acceptable Use Policy is common to both** — the Enterprise agreement incorporates it expressly ("Customer will comply with SpaceXAI's Acceptable Use Policy… incorporated herein by this reference"), and the AUP itself says it "applies to anyone using our Service, including consumers, developers and businesses." So the AUP clauses bind regardless of which reading wins.

### 1a. Commercial use of generated audio

**Enterprise — clear, and favourable.** From "Rights in Input and Output":

> "Customer (a) retains all right, title, and interest (including all intellectual-property rights) in and to the Input; and (b) owns all right, title, and interest in the Output in perpetuity and, to the fullest extent possible under applicable law, SpaceXAI hereby assigns to Customer all of its right, title, and interest in such Output (but excluding, for clarity, the SpaceXAI Technology (defined below))."
> — https://x.ai/legal/terms-of-service-enterprise (read 2026-08-27)

Access is granted "solely for Customer's business purposes", and the agreement expressly contemplates Customer building and distributing "Bundled Services" to End Users. Selling courses containing that audio is squarely inside that.

**Consumer — ownership yes, with an attribution string attached.** From "You Own Your User Content":

> "To the extent permitted by applicable law, and as between you and SpaceXAI, you retain your ownership rights to the User Content."

and immediately after:

> "When using Output or SpaceXAI's name, logos, trademarks, or other brand elements, you are required to obtain our permission and attribute your generation of the Output to the Service, as detailed in our Brand Guidelines."
> — https://x.ai/legal/terms-of-service (read 2026-08-27)

**This clause is genuinely ambiguous and both readings are available.** Read one: the permission-and-attribution requirement attaches to the whole list, so *any* use of Output requires xAI's permission and an attribution. Read two: it attaches to the brand elements, and "using Output" is swept in loosely by a list. Read one would mean every SSi course carrying a Tom001 clip needs an xAI attribution. Read two would mean none do. The sentence does not settle it, and the Brand Guidelines it points at were not read as part of this job — that is a gap.

Also relevant under Consumer, and **not** a general commercial bar but worth knowing:

> "Beta Modes and Trial Features. In some cases, we may permit you to evaluate our Service for a limited time or with limited functionality, including beta, preview, or trial features. Use of our Service for evaluation purposes is for your personal, non-commercial use only."

The **Custom Voices** feature is labelled **"New"** throughout the docs navigation but is *not* labelled beta on either the docs page or the announcement, so on the face of it this clause does not reach it. Calling that "silent" would be too strong; calling it settled would be too strong the other way.

Neither document contains any watermarking obligation on the customer. There is one disclosure clause:

> "AI-Generated Disclosures. When you generate Output using the Service, including through Agentic Actions, SpaceXAI may apply a disclosure stating that the content was generated or altered by artificial intelligence. By using the Service, you agree that such disclosures may be applied to your Outputs."

and the AUP forbids "Stripping, altering or circumventing embedded provenance metadata or watermarks."

### 1b. Using Output to train another model — the clause that decides it

**This is the ballgame clause, and it reads against the idea.**

**Enterprise — a flat prohibition, no "competing" qualifier at all:**

> "Customer will not, and will not permit any third party to: (i) use any Output to train any foundation models, large language models, or other artificial intelligence systems except as may be expressly permitted in an Order Form; or (ii) misrepresent that any Output was human-generated."
> — https://x.ai/legal/terms-of-service-enterprise, "Rights in Input and Output" (read 2026-08-27)

A voice clone is an artificial-intelligence system, and building one from a Tom001 sample is using Output to train it. On the Enterprise reading this is **prohibited unless expressly permitted in an Order Form**. There is no ambiguity to give the other way; the only doors are an Order Form permission or written consent from xAI.

**AUP — a prohibition qualified by competition, binding under either agreement:**

> "Using the Service or any Output to develop (or assist anyone in developing) machine learning models or any products or services that compete with SpaceXAI, whether directly or indirectly"

> "Scraping, harvesting or reselling any Input or Output, or distilling model data or Outputs"
> — https://x.ai/legal/acceptable-use-policy, Effective: August 14, 2026 (read 2026-08-27)

**Both readings, stated plainly.** Against: Cartesia, OpenAI TTS and Chatterbox are voice-synthesis products that compete with Grok Text to Speech directly; feeding them a Tom001 sample to build a clone is developing a model with Output, and it assists a competitor's model in representing a voice xAI currently supplies. That is close to the centre of the clause, not the edge. For: SSi would not be *developing* a competing product — the clone is for SSi's own internal use in its own courses, the vendors' models are already trained and an instant-clone is arguably conditioning rather than training, and "compete with SpaceXAI" is about products offered to the market. That reading has to survive the word "distilling", and it does not have to survive the Enterprise clause at all — because the Enterprise clause has no competition qualifier and would catch it regardless.

**Where the documents are silent:** neither the ToS nor the AUP says anything specific about using TTS output as *voice-cloning* input, as distinct from model training generally. There is no clause naming voice cloning of a third-party service. The training clauses are the only instruments that reach it.

### 1c. Voice, likeness and impersonation

The AUP prohibits, under "Using the Service in a way that infringes, misappropriates or violates a person's privacy or their right to publicity":

> "Deceptively impersonating a real person"

> "Undressing or nudifying real persons, or otherwise altering a real person's image or likeness to depict them in an intimate or sexual context"

> "Engaging in falsifying, forging, fabricating, or materially misrepresenting documents, records, identities, credentials, signatures, endorsements, evidence, or other information"

and under the general clauses:

> "Misleading others or not being transparent regarding your use of AI, including by phishing, creating fake accounts, providing services that appear to be from you, when they are in fact from SpaceXAI, or providing services that appear to originate from SpaceXAI, when they do not"

None of these bite on Tom using a clone of his own voice, with his own consent, in his own product. He is not impersonating anybody. The consumer ToS also covers the consent point from xAI's side:

> "To the extent the User Content includes a person's image, likeness, voice, or other similar attributes, you grant SpaceXAI the same rights to use those attributes as part of the User Content as described above. You represent and warrant that you have obtained all rights, licenses, notices, permissions, and consents necessary for SpaceXAI to use that User Content."

### 1d. The flag nobody asked for, which falls straight out of the words

The recording pack notes that OpenAI requires a **word-perfect spoken consent clip**: *"The consent audio recording must only include one of the following phrases. Any divergence from the script will lead to a failure."* That clip is a first-person statement that the speaker is a real human consenting to have their voice cloned.

Reading that statement with a synthetic voice runs directly into the Enterprise clause's second limb — **"misrepresent that any Output was human-generated"** — and, depending on how OpenAI treats it, into the AUP's "materially misrepresenting… identities… endorsements". This is not a hypothetical: it is the exact use the phase-2 plan would need.

**Recommendation, unemotional:** even if the sample passage were synthetic, **Tom should record the consent clip himself with his real voice.** It is one short scripted sentence, not the ~25-second expressive passage that the noise problem actually blocked, so the noise bar for it is far lower. That splits the problem cleanly and takes the sharpest edge off.

---

## 2. The seam: where a custom voice ID enters the existing pipeline

**Answer: it is already a passthrough, end to end, and it already carries Tom's clone in production. There is no code change to make.** The change for a *new* voice is a config value, not a line of code.

The path, verified in the code today:

| Step | File / line | What happens |
|---|---|---|
| Config | `courses.voice_config` in Supabase — `voices.<role>.{provider,voiceId,language}` | `provider: 'xai'`, `voiceId: 'gfzdpspr5fdp'`. **This is the seam.** |
| Config → TTS options | `services/voice-config-service.cjs:466-478` (`buildTTSConfig`) | The `xai` branch passes `voiceId: voiceConfig.voiceId` straight through. Its own comment: *"voiceId may be a preset ('eve'\|'ara'\|'leo'\|'rex'\|'sal') OR a custom cloned voice id (e.g. 'gfzdpspr5fdp') — generateXai passes it through verbatim."* |
| TTS call | `services/tts-service.cjs:407` (`generateXai`) | `body = { text, voice_id: voiceId, language, output_format }`. Verbatim into `POST https://api.x.ai/v1/tts`. |
| Registry | `services/voice-config-service.cjs:191-248` (`ensureVoiceRegistered`) | The `xai` branch **accepts an arbitrary id**: it does not consult any preset roster, it takes the language from the config rather than parsing an Azure-style locale from the id, and it inserts the row on first use. An unknown custom id registers itself. |

**Is anything whitelisting or hardcoding voice ids in a way that would reject a new custom one?** No blocking one. What exists:

- `services/tts-service.cjs:494-495` — `assertNotChildVoice` (a `CHILD_VOICE_IDS` **deny**-list, not an allow-list) and `assertNotHumanVoiceCourse` (gates on *course code*, not voice). Neither fired on this probe.
- `services/voice-discovery-service.cjs:186` `XAI_VOICES` and `tools/pod-voices-xai.json` — **discovery/picker rosters**, listing presets for a UI. They do not gate generation; `gfzdpspr5fdp` is absent from them and has still rendered ~45,000 clips.
- `services/audio-reuse-planner.cjs:224` `isSpeedTrustedVoice` — affects **clip reuse** decisions, not whether a voice can be rendered. A brand-new custom id simply will not be speed-trusted until it is added there. Worth knowing, not a blocker.
- `services/shared/clip-identity.cjs` — the `xai_` prefix vs bare-id spelling question. A custom id is written bare by `generatePodAudio` and prefixed by `getVoiceForRole`; both spellings already exist for `gfzdpspr5fdp` in `course_audio`. Pre-existing estate condition, documented in `docs/audio-identity-write-path-audit-2026-08-06.md`, not something a new id makes worse.

### The copy-pasteable instruction

To point any course or role at a new xAI voice — Tom's or anyone's — set, in that course's `voice_config` JSON in Supabase, for the role you want:

```json
"voices": { "presentation": { "provider": "xai", "voiceId": "<the 8–12 char voice_id>", "language": "en" } }
```

That is the whole change. `provider` must be `"xai"`; `voiceId` is the raw ID exactly as xAI returns it, no prefix; `language` must be an explicit BCP-47 code and **never `"auto"`** — under `auto` the multilingual voices read cross-language words with English phonology (the Italian pilot, 2026-07-10), and `generateXai` warns on it.

For a one-off render outside any course — which is what the sample batch below did — `services/audio-repair.cjs` exports `render.render({ text, voiceId: 'xai_<id>', language })`, which is the same TTS call plus the same `masterAudio` chain, with no database write.

**I made no code change.** There was nothing that needed one, and inventing a config constant for a voice the estate already resolves from the database would have been a second way to do one thing.

---

## 3. Cost of this probe

12 utterances, 300 billed characters, 12 requests. I could not extract xAI's published TTS character rate — `https://docs.x.ai/developers/pricing` renders its tables in JavaScript and the fetched HTML carries none of the numbers — so I will not quote a false precision. At any TTS rate in the range providers publish, 300 characters is a fraction of one US cent. Ceiling was $20; nothing near it was used. **Gap, stated honestly: this is a bounded estimate from character count, not a billed figure read off an invoice.**

## 4. Clone-of-a-clone, noted once

Watson's caveat — artefacts compound when a copy trains a copy — was answered by Tom with "1 and 2 ok". Noted, not relitigated. One fact from xAI's own docs sharpens it in a useful direction, though: *"Background noise will be cloned along with the voice."* A synthetic source clip has no room noise at all, which is the one respect in which it is **better** source material than Tom's blocked recording, whatever it costs in expressiveness.
