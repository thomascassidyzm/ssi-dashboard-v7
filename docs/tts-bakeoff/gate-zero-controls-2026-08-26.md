# Gate zero — the three controls: xAI, Azure, ElevenLabs

**Slice 1b of 4 · compiled 2026-08-26 · zero spend, no API called**

The controls set the ends of the yardstick. Azure is the consistency bar every candidate must
approach. ElevenLabs is the failure mode we are trying to avoid. xAI is the incumbent, and the
honest accounting of what leaving actually costs.

Machine-readable records: `docs/tts-bakeoff/coverage-azure.json`, `coverage-elevenlabs.json`,
`coverage-xai.json`.

---

## The headline

**Three findings change the shape of the report.**

1. **Azure — our "consistency benchmark" — does not offer version pinning, and has already changed
   a voice under paying customers.** Microsoft's own Q&A answer of 2026-02-11 says it plainly:
   "Azure Speech does not provide version pinning for standard neural or multilingual voices…
   Once the backend model is replaced, the older version is retired and becomes inaccessible."
   Azure is repeatable *within* a model generation and gives no promise at all *across* one. The
   only true pin anywhere in the Azure line is the on-prem **container**, which you upgrade when
   you choose to. If axis E genuinely matters, the container is the answer, not the cloud API.

2. **xAI's version-pinning story is not weak, it is absent — there is no model id to pin.**
   `POST /v1/tts` has no `model_id` field. The synthesis model is unnamed and unversioned from the
   customer's side, xAI publishes no voice deprecation policy, and the docs themselves concede the
   model reads awkward words "not the same way twice". **On axes E and F we are giving up nothing,
   because we never had anything.** The cost of the move is entirely on axes A and B — perceived
   quality — and even that rests on this estate's own listening, because xAI publishes no
   benchmark, only adjectives.

3. **Welsh is not a migration problem — it is already solved and already protected.** Welsh has
   never been xAI-voiced. `cym_n_for_eng` and `cym_s_for_eng` run Azure plus human recordings from
   Aran and Catrin, and `services/tts-service.cjs:217-222` hard-blocks *any* TTS for those courses
   as a 403. Gate zero still matters for candidate selection — a provider with no Welsh can never be
   the estate's single answer — but no candidate has to rescue Welsh from xAI.

---

## Coverage table

Welsh first, then the remaining 67 in code order. `yes` = the vendor's own list names it.
`—` = the vendor publishes a list and it is absent. `?` = unstated (no definitive list). Full
per-code detail is in the JSON records.

| | | **Azure** | **ElevenLabs** | **xAI** |
|---|---|---|---|---|
| **of 68** | | **52** | **48** | **21** |
| **of the 11 xAI-exposed** | | **10** | **10** | **10** |
| ISO | Language | Azure | ElevenLabs | xAI |
| cym | WELSH | yes | yes | — |
| afr | Afrikaans | yes | yes | — |
| ara | Arabic | yes | yes | yes |
| ben | Bengali | yes | yes | yes |
| bre | Breton | — | — | — |
| bul | Bulgarian | yes | yes | — |
| cat | Catalan | yes | yes | — |
| ces | Czech | yes | yes | — |
| cor | Cornish | — | — | — |
| dan | Danish | yes | yes | yes |
| deu | German | yes | yes | yes |
| ell | Greek | yes | yes | — |
| eng | English | yes | yes | yes |
| est | Estonian | yes | yes | — |
| eus | Basque | yes | — | — |
| fas | Persian | yes | yes | — |
| fin | Finnish | yes | yes | yes |
| fra | French | yes | yes | yes |
| fur | Friulian | — | — | — |
| gla | Scottish Gaelic | — | — | — |
| gle | Irish | yes | yes | — |
| glg | Galician | yes | yes | — |
| hak | Hakka | — | — | — |
| heb | Hebrew | yes | yes | — |
| hin | Hindi | yes | yes | yes |
| hrv | Croatian | yes | yes | — |
| hun | Hungarian | yes | yes | — |
| hye | Armenian | yes | yes | — |
| ind | Indonesian | yes | yes | yes |
| isl | Icelandic | yes | yes | — |
| ita | Italian | yes | yes | yes |
| jpn | Japanese | yes | yes | yes |
| kan | Kannada | yes | yes | — |
| kor | Korean | yes | yes | yes |
| lav | Latvian | yes | yes | — |
| lit | Lithuanian | yes | yes | — |
| lmo | Lombard | — | — | — |
| mar | Marathi | yes | yes | — |
| mkd | Macedonian | yes | yes | — |
| mlt | Maltese | yes | — | — |
| nan | Min Nan | yes | — | — |
| nap | Neapolitan | — | — | — |
| nep | Nepali | yes | yes | — |
| nld | Dutch | yes | yes | yes |
| nor | Norwegian | yes | yes | — |
| pdc | Pennsylvania Dutch | — | — | — |
| pol | Polish | yes | yes | yes |
| por | Portuguese | yes | yes | yes |
| rgn | Romagnol | — | — | — |
| roh | Romansh | — | — | — |
| ron | Romanian | yes | yes | — |
| rus | Russian | yes | yes | yes |
| scn | Sicilian | — | — | — |
| sme | Northern Sami | — | — | — |
| spa | Spanish | yes | yes | yes |
| srp | Serbian | yes | yes | — |
| swa | Swahili | yes | yes | — |
| swe | Swedish | yes | yes | yes |
| tel | Telugu | yes | yes | — |
| tha | Thai | yes | yes | yes |
| tur | Turkish | yes | yes | yes |
| ukr | Ukrainian | yes | yes | — |
| vec | Venetian | — | — | — |
| yid | Yiddish | — | — | — |
| yor | Yoruba | — | — | — |
| yue | Cantonese | yes | — | — |
| zho | Chinese (Mandarin) | yes | yes | yes |
| zzz | (test placeholder) | — | — | — |

**What the table says.** No control covers the estate. Azure's 52/68 is the ceiling, and the 16 it
misses are the minority-language tail that is most of SSi's distinctiveness — Breton, Cornish,
Scottish Gaelic, Northern Sami, Yiddish, Yoruba, Romansh, and the Italian regional set (Friulian,
Lombard, Neapolitan, Romagnol, Sicilian, Venetian). Every one of those is currently either
human-voiced or unvoiced, and **no commercial TTS on this board will ever claim them.** That is a
finding for the whole bake-off, not a control detail: the estate's answer is going to be
*Azure-or-successor for the covered 52, humans for the tail*, and the candidate slice should be
scored on how well it serves the 52, not on a fantasy of 68.

Two specific losses worth naming: **Basque** (`eus_for_eng`, `eus_for_spa`, both beta, 300 seeds
each) and **Maltese** and **Cantonese** are Azure-only across the three controls — ElevenLabs has
none of them. **Pennsylvania Dutch is nobody's** — 0/3 — and `pdc_for_eng` is already hard-blocked
as a human-voice course (`services/tts-service.cjs:217-222`, Tom's ruling 2026-08-14), so it should
be struck from the migration scope rather than carried as a gap.

---

## Azure AI Speech — the consistency benchmark

**Gate zero: SURVIVES.** `cy-GB` is a first-class locale with `cy-GB-NiaNeural` (F) and
`cy-GB-AledNeural` (M), and it is what the Welsh courses already run on.

### What actually makes Azure repeatable — and where it stops

The repeatability is real but narrower than its reputation, and it comes from four separate things:

**1. No exposed randomness on the classic neural voices.** There is no seed, no temperature, no
sampling parameter anywhere on the voices we use. Same text, same voice, same SSML → same audio.
This estate does not take that on trust: `services/azure-tts-service.cjs:174-197` defines
`REGENERATION_VARIATIONS`, a set of punctuation mutations (append `.`, append `...`, insert a comma
before the last word) whose only purpose is to *force different audio out of a voice that would
otherwise return the same bytes*. That is a determinism test running in production, and it passes.

**2. Full pronunciation control — except on Welsh.** SSML gives `<phoneme>` in IPA/SAPI/UPS/X-SAMPA
and uploadable PLS `<lexicon>` files up to 100 KB
([docs](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-pronunciation)).
But the Welsh rows carry footnote 3 — *"Phonemes, custom lexicon, and visemes aren't supported"*.
**On the one language gate zero is about, Azure gives no pronunciation override at all.** A
mispronounced Welsh word can only be fixed by respelling the input, which is exactly the
`applyShortWordHint` trick this repo already uses (`services/azure-tts-service.cjs:256-276`). Any
candidate that offers a working IPA override for Welsh beats Azure on axis C, on Welsh.

**3. A real product-tier deprecation policy — for tiers, not for weights.** Standard (non-neural)
voices were announced retired 2021-08-31 and switched off 2024-08-31: roughly three years' notice,
communicated to every Speech subscription. That is the good half of the story.

**4. And here is the bad half.** Microsoft Q&A, 2026-02-11: a customer reports that
`pt-BR-ThalitaMultilingualNeural` "has completely changed". The answer:

> "Azure Speech does not provide version pinning for standard neural or multilingual voices, so
> applications transparently move to the updated voice model when Microsoft deploys it… Once the
> backend model is replaced, the older version is retired and becomes inaccessible… Future changes
> can therefore happen again without prior notice."

([source](https://learn.microsoft.com/en-us/answers/questions/5771581/change-in-tts-voice))
`en-US-AvaMultilingualNeural` is named in the same answer as a prior instance. **The bar the
candidates must approach is therefore lower than we assumed: Azure guarantees determinism within a
model generation and guarantees nothing across one.** A candidate offering dated, pinnable model
snapshots — Cartesia's story, per the shortlist — would be *better* than Azure on axis E, not
merely close to it.

### Nondeterminism Azure does expose

On HD voices, deliberately. The docs list "Prosody variations — Neural text-to-speech HD voices
introduce slight variations in each output to enhance realism", and expose `temperature` (DragonHD
default **1.0**; Dragon HD Omni default 0.7 with `top_p` 0.7, `top_k` 22, `cfg_scale` 1.4) via
`<voice name="…" parameters="temperature=0.8">`
([source](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/high-definition-voices)).
Every documented HD voice id is the `…LatestNeural` form, defined as "Always uses the latest version
of the DragonHD base model". So the HD tier is *both* nondeterministic per call *and* explicitly
floating. **We use no HD voice today and nothing in the code stops one being configured** — that is
worth a guard rail before anyone reaches for the newer voices.

Welsh has no HD voice, so `temperature` is unreachable for Welsh either way.

### The rest

- **Self-host: yes, and it is the strongest repeatability answer on the board.**
  `mcr.microsoft.com/azure-cognitive-services/speechservices/neural-text-to-speech`, 6 core/12 GB
  minimum, plus a **disconnected** variant on application approval and a commitment plan
  ([source](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-howto)).
  A pinned container digest is the only way to freeze an Azure voice against a backend swap.
  **Not verified: whether the container ships `cy-GB`.** That single fact decides whether Welsh can
  be frozen on-prem, and it should be checked before the report lands.
- **Cloning consent:** Custom Neural Voice is Limited Access — eligibility review via intake form,
  plus a mandatory recorded voice-talent consent statement before fine-tuning, plus disclosure
  guidance. The strictest, most defensible consent regime of the three.
- **Pricing** (Azure Retail Prices API, USD, fetched today): **$15.00 / 1M characters** for S1
  Neural TTS. Free tier 0.5M chars/month. Commitment tiers fall to roughly $5.70–$12.00 / 1M.
  Custom Neural Voice: $24/1M realtime, $48/1M HD, $52/compute-hour training, $4.032/hour hosting.
- **Rate limits:** F0 20 transactions / 60s (fixed); S0 **30 TPS** default, adjustable on request to
  **1,000 TPS**. Batch synthesis has no concurrent-job limit.

---

## ElevenLabs — the known-variable benchmark

**Gate zero: CONDITIONAL.** Welsh is listed — but on the model we do not use, and cannot easily
adopt.

`eleven_v3` and `eleven_v3_conversational` list 70+ languages ending "…Vietnamese (vie), **Welsh
(cym)**." `eleven_multilingual_v2` lists 29 with no Welsh. `eleven_flash_v2_5` is those 29 plus
`hu`, `no`, `vi` = 32, no Welsh ([source](https://elevenlabs.io/docs/models)).

**Both of our live code paths hardcode a model that cannot speak Welsh** —
`services/tts-service.cjs:265` sends `model_id: 'eleven_multilingual_v2'`, and
`services/elevenlabs-service.cjs:120` defaults to `eleven_flash_v2_5`. Reaching Welsh means moving
to `eleven_v3`, which is also the least repeatable model of the three. That is the conditional.

### What exactly makes it variable — named precisely

**The settings are a randomness dial, by the vendor's own words.** From the API reference parameter
table ([source](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)):

| Setting | Default | The vendor's own description |
|---|---|---|
| `stability` | 0.5 | *"Determines how stable the voice is and **the randomness between each generation**. Lower values introduce broader emotional range for the voice. Higher values can result in a monotonous voice with limited emotion."* |
| `similarity_boost` | 0.75 | *"Determines how closely the AI should adhere to the original voice when attempting to replicate it."* |
| `style` | 0 | *"Determines the style exaggeration of the voice… consumes additional computational resources and might increase latency if set to anything other than 0."* |
| `use_speaker_boost` | true | *"Boosts the similarity to the original speaker… slightly higher computational load."* |
| `speed` | 1.0 | Range 0.7–1.2. *"Extreme values may affect the quality of the generated speech."* |

In `eleven_v3` the numeric slider becomes a three-way choice — **Creative** ("More emotional and
expressive, but prone to hallucinations"), **Natural** ("Closest to the original voice recording"),
**Robust** ("Highly stable, but less responsive to directional prompts but consistent, similar to
v2") ([source](https://elevenlabs.io/docs/best-practices/prompting/controls)). Note what "Robust"
buys you: *similar to v2*. The stability ceiling of the newest model is the behaviour of the old one.

**A seed exists, and the vendor refuses to stand behind it.** Verbatim from the convert endpoint:

> *"If specified, our system will make a **best effort** to sample deterministically, such that
> repeated requests with the same seed and parameters **should** return the same result.
> **Determinism is not guaranteed.** Must be integer between 0 and 4294967295."*

**We send no seed anywhere in the estate.** The string does not appear in any ElevenLabs request
body in this repo.

**Pronunciation is 80–90% consistent, by admission.** v3 accepts raw IPA inline between forward
slashes, and up to 3 `pronunciation_dictionary_locators` per request. But the docs say "the model
may occasionally produce different outputs **even with identical IPA transcriptions**" and that
"V3's IPA support achieves **80-90% pronunciation consistency**". A one-in-six chance of a different
reading of a corrected word is not a pronunciation control for course content; it is a suggestion.

**Model versions are pinnable; output is not.** `model_id` is a stable string and there is an
explicit deprecated-models table (`eleven_turbo_v2_5`, `eleven_turbo_v2`, each with a named
successor). On paper that beats Azure. In practice **a pinned model with an unpinned sampler is not
repeatability** — you have frozen the weights and left the dice on the table. ElevenLabs publishes
nothing about whether `eleven_v3` output drifts *across* updates within the same `model_id`, which
is exactly what axis E asks.

### The rest

- **Cloning consent — and a real operational constraint for us.** Instant Voice Cloning is a
  self-asserted tickbox ("confirm that you have the right and consent to clone the voice").
  Professional Voice Cloning is own-voice-only, enforced by a live verification recording:
  *"For now, we only allow you to clone your own voice"*, and in the FAQ, *"Even with their consent,
  you cannot clone someone else's voice."* A third party shares a PVC by creating and verifying it
  on **their own account**. **So an Aran or Catrin professional clone cannot be built by us from
  their existing recordings** — Aran and Catrin would each have to make and verify one themselves
  and share it. That is a person-time cost, not an engineering one, and it belongs in the phase-2
  plan.
- **Self-host: no.** Cloud only. Enterprise buys concurrency and priority, not weights.
- **Pricing:** ~**$0.10 per 1,000 characters** (~$100/1M) on v3 and multilingual v2; ~$0.05/1k on
  Flash/Turbo and v3 Conversational. Plans Starter $6 / Creator $22 / Pro $99 / Scale $299 /
  Business $990. **Roughly 6–7× Azure and xAI per character, on the only model that speaks Welsh.**
- **Rate limits:** concurrency, not RPM. Multilingual v2 / Flash concurrent limits: Free 2/4,
  Starter 3/6, Creator 5/10, Pro 10/20, Scale 15/30, Business 15/30, Enterprise "Elevated". Excess
  queues rather than fails (~50ms). Headers `current-concurrent-requests` /
  `maximum-concurrent-requests`.

---

## xAI — the incumbent, and what leaving actually costs

**Gate zero: DEAD.** No Welsh in the 20-code docs table, none in the voice catalogue. Costs us
nothing: Welsh was never on xAI.

### What we are giving up — the honest version

**Quality claims: adjectives only.** The docs offer "a rich set of expressive voices" and
"high-fidelity". There is no published benchmark, no MOS score, no evaluation. **The proposition
"xAI is our quality bar" rests entirely on this estate's own listening.** That is a legitimate basis
— Tom's ear is the instrument that matters — but the report should not dress it as a vendor claim.

**Languages: the docs and the API disagree with each other.** The docs table lists 20 codes —
`auto, en, ar-EG, ar-SA, ar-AE, bn, zh, fr, de, hi, id, it, ja, ko, pt-BR, pt-PT, ru, es-MX, es-ES,
tr, vi` — with the escape clause *"The model is also capable of generating speech in additional
languages beyond those listed above, with varying degrees of accuracy."* But this estate's own
capture of `GET /v1/tts/voices` (`tools/pod-voices-xai.json`, 72 voices across 21 keys) contains
**Danish, Swedish, Finnish, Dutch, Polish and Thai voices the docs table omits**, and omits Bengali
and Indonesian which the docs list. `fin_for_eng` ships on an xAI Finnish voice that xAI does not
document. Coverage here is scored as the union: **21/68**.

**Controls: better than our code uses, worse than any candidate.** No seed. No temperature. But
three parameters exist that we do not send:

| Parameter | What it does | Do we send it? |
|---|---|---|
| `speed` | 0.7–1.5 multiplier | **No** — we re-time in mastering instead |
| `replace` | Phrase → respelling or IPA between slashes; validated before synthesis | **No** |
| `with_timestamps` | Character-level start/end times | **No** — so xAI clips lack the boundaries Azure clips carry |

Plus inline speech tags (`[pause]`, `[laugh]`, `<whisper>`, `<emphasis>`, `<slow>`),
`text_normalization`, `optimize_streaming_latency`, output codecs mp3/wav/pcm/mulaw/alaw to 48 kHz,
a 15,000-character cap and a WebSocket endpoint at `wss://api.x.ai/v1/tts`.

**Version pinning: there is nothing to pin.** `POST /v1/tts` has **no `model_id` field**. The
synthesis model is unnamed and unversioned from the customer's side; xAI publishes no voice
deprecation or notice policy; and the models page shows it does retire voice models
(`grok-voice-think-fast-1.0 — Deprecated`). The docs concede output variability in their own
pronunciation section: without a `replace` rule the model spells odd terms out, *"and not the same
way twice"*. **That sentence is the incumbent documenting its own nondeterminism.**

**Cloning consent: none documented.** Custom Voices is "Clone a voice from a short reference clip"
— up to 120s, 90+ recommended, 30 free voices in the console, API creation Enterprise-only. There is
no consent statement, no verification, no attestation in the API docs. The only gate is
geographic: *"Custom Voices is currently only available in the United States, with the exception of
Illinois"* — which reads as a response to Illinois biometric-privacy law rather than a consent
design. Whether a UK team may lawfully create and use xAI custom voices at all was **not**
established and is a gap.

**Pricing: $15.00 / 1M characters** — identical to Azure S1 neural, one seventh of ElevenLabs v3.
**Rate limits: not published.** The rate-limits page covers text and embedding models only:
*"For increases to Voice and Imagine API limits, contact sales@x.ai."*

**Self-host: no.**

### So what does the move actually cost?

Axes A and B (similarity, naturalness) — a real, unmeasured amount, resting on our own ears.
Axis C (pronunciation) — we lose an IPA `replace` map we never used. Axes E and F (repeatability,
control) — **nothing, because there is nothing there.** Axis G — we lose $15/1M pricing that Azure
matches exactly, and we lose an unpublished rate limit that our own code already treats as unstable
(a 4-way concurrency cap and a circuit breaker that pauses renders when the provider starts
returning silent stubs).

---

## Live integration — what we actually send today

Code is the authority in this section. Vendor docs describe what is possible; these lines describe
what this estate does.

### Azure

| | |
|---|---|
| **Endpoint** | Two paths. SDK: `sdk.SpeechConfig.fromSubscription(key, region)` — `services/tts-service.cjs:329`, `services/azure-tts-service.cjs:128`. Raw REST: `https://<region>.tts.speech.microsoft.com/cognitiveservices/v1` with `Ocp-Apim-Subscription-Key` and `Content-Type: application/ssml+xml` — `tools/a108/a131-blind-raw-tts.cjs:78`. |
| **Voice id format** | `xx-XX-NameNeural`, passed **verbatim** from `voice_config.voiceId` (`services/voice-config-service.cjs:461`). An `azure_` storage prefix is stripped only in the VoiceLab list builder (`services/voicelab/params.cjs:99`), **not** on the render path — a stored `azure_`-prefixed id would reach Azure unstripped. |
| **Settings** | Region from `AZURE_SPEECH_REGION` defaulting to `westeurope` (`services/voice-config-service.cjs:460`). Output format **`Audio16Khz32KBitRateMonoMp3`** on the tts-service path (`services/tts-service.cjs:330`) but **`Audio24Khz96KBitRateMonoMp3`** on the azure-tts-service path (`services/azure-tts-service.cjs:129`). SSML carries exactly one control: `<prosody rate="+N%">` from cadence speed (`services/tts-service.cjs:346-360`). Word-boundary events captured and persisted (`:336-343`). |
| **Determinism-relevant** | We send **no** temperature, **no** style, **no** `<phoneme>`, **no** `<lexicon>`. `REGENERATION_VARIATIONS` (`services/azure-tts-service.cjs:174-197`) exists *because* Azure is deterministic — it mutates input punctuation to force a different render. `services/tts-service.cjs:353` hardcodes `xml:lang="en-US"` in the SSML envelope while `services/azure-tts-service.cjs:163` derives the locale from the voice name; the `<voice>` element overrides it in practice, but the two paths are not the same request. |

### ElevenLabs

| | |
|---|---|
| **Endpoint** | `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}`, header `xi-api-key`, `Accept: audio/mpeg` — `services/tts-service.cjs:252-262`, `services/elevenlabs-service.cjs:13`+`:133`. |
| **Model id** | **Hardcoded** `eleven_multilingual_v2` at `services/tts-service.cjs:265`; defaulted to `eleven_flash_v2_5` at `services/elevenlabs-service.cjs:120`. Neither speaks Welsh. |
| **Settings** | `voice_settings { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true }` — `services/tts-service.cjs:266-271`, defaults at `:239-241`. Config assembled at `services/voice-config-service.cjs:445-453`; the production call site at `services/phases/phase8-audio-v13.cjs:2705-2709` passes **no** stability or similarity at all, so the defaults always apply. |
| **Determinism-relevant** | **No seed sent, anywhere.** `stability` sits at the vendor's mid-dial default. No `pronunciation_dictionary_locators`, so no pronunciation override layer exists. No `previous_text`/`next_text`, so split long text has no continuity anchor. `output_format` left to the account default while the audible-response gate hardcodes a 128 kbps assumption (`services/tts-service.cjs:282-285`) — if the default changed, that floor is wrong. A `speed` value is destructured at `:241` and then never placed in the body: **the parameter is accepted and silently dropped.** |

### xAI

| | |
|---|---|
| **Endpoint** | `POST https://api.x.ai/v1/tts`, `Authorization: Bearer`, JSON — `services/tts-service.cjs:449`. Metadata at `GET /v1/tts/voices/{id}` — `tools/xai-voice-metadata-sync.cjs:15,45`. |
| **Voice id format** | Free-form string, passed through verbatim: a preset (`eve`/`ara`/`leo`/`rex`/`sal`) **or** a custom clone id such as `gfzdpspr5fdp` (Tom's clone, `services/voicelab/params.cjs:26`). An `xai_` storage prefix is stripped only in the VoiceLab list builder (`services/voicelab/params.cjs:102`), **not** on the render path (`services/voice-config-service.cjs:474`). |
| **Body** | `{ text, voice_id, language, output_format: { codec: 'mp3', sample_rate: 24000, bit_rate: 128000 } }` and nothing else — `services/tts-service.cjs:436-445`. 15,000-char cap enforced locally at `:421`. |
| **Determinism-relevant** | Three documented parameters go unsent. `speed` — the comment at `:432` says "xAI currently does not document a speed parameter", which the vendor docs now contradict; we re-time downstream in `masterAudio` instead. `replace` — the IPA override the docs call deterministic; never used, so every proper noun is at the model's discretion each render. `with_timestamps` — the comment at `:405` says xAI gives no word boundaries; the docs give character-level ones. **Both comments are stale against the vendor docs as of today.** |
| **What we do instead** | The estate's real defence against xAI nondeterminism is not a parameter: it is a whisper-based **phonology gate** (`services/tts-service.cjs:563-700`) that re-rolls any non-English render whose *detected spoken language* comes back English, and fails the item after the retry budget. Plus a concurrency cap of 4 (`:51`) and a **circuit breaker** that pauses xAI renders for 60s when >4% of the last 50 responses come back as inaudible stubs (`:128-160`). Retries treat 429/408 as transient (`:542`). None of that machinery exists for Azure. |

**One cross-cutting note for the harness adapters:** the estate has *two* Azure code paths at two
different bitrates and *two* ElevenLabs code paths at two different models. Whichever the harness
matches, it should match one deliberately and say which — otherwise a bake-off result will not be
comparable to production.

---

## GAPS

Reported as blockers, not smoothed over.

**Denied or unavailable data**
1. **No API was called for any provider** — phase 1 spends zero. Every determinism claim here is a
   documentation claim or a code reading. The ElevenLabs "best effort" seed, Azure's cross-region
   byte-identity, and xAI's actual repeat behaviour are all **unmeasured** and are phase-2 items.
2. **`ELEVENLABS_API_KEY`** is present in `.env` with a correct `sk_` prefix (51 chars). This
   **contradicts** the note at `tools/a108/a131-blind-raw-tts.cjs:44-47` (2026-08-17) that the
   stored value was a key *ID*, not a key. The key was **not** exercised, so "present and correctly
   shaped" is all that is established.
3. **The Azure public pricing page rendered placeholder dashes** on fetch. Figures here come from
   the public Azure Retail Prices API instead, which returned **two** S1 Neural TTS rows ($15.00 and
   $18.75 per 1M) — presumably different regional meters. **The region attribution was not
   resolved.**

**Vendor silence**
4. **No Microsoft document states a deprecation or notice policy for individual neural voices.**
   The three-year standard-voice retirement is a product-tier policy. The only statement about
   individual model swaps is a **Q&A support answer**, not a published SLA. That is the strongest
   evidence available and it is weaker than a policy.
5. **ElevenLabs says nothing about output drift across updates within one `model_id`** — precisely
   the axis-E question.
6. **xAI publishes no rate limits for the Voice API, no deprecation policy, and no model id.**
   There is nothing to cite because there is nothing published.
7. **xAI publishes no quality benchmark** — only marketing adjectives. We are moving off a benchmark
   nobody has measured.

**Unresolved facts that would change a recommendation**
8. **Does the Azure `neural-text-to-speech` container ship `cy-GB`?** Not established. This single
   fact decides whether Welsh can be frozen on-prem, which is the strongest repeatability play on
   the board.
9. **The xAI docs table and `GET /v1/tts/voices` disagree** — the catalogue adds da/sv/fi/nl/pl/th
   and omits bn/id. `tools/pod-voices-xai.json` is a **capture**, not a live read, and was not
   refreshed (that would mean calling the API).
10. **`nan` (Min Nan) is marked yes for Azure on footnote 6 alone** — `nan-CN` is a *secondary
    locale* of the single voice `zh-CN-XiaoxiaoDialectsNeural`, not a first-class locale with its
    own voices. Treat that `yes` as weaker than the others.
11. **Serbian** appears as both `sr-RS` (Cyrillic) and `sr-LATN-RS` (Latin) on Azure; which our
    `srp` courses need was not checked.
12. **Whether a UK-based team may lawfully create and use xAI custom voices** was not chased past
    the "US except Illinois" note to a licence or terms document.

**Scope note, not a gap**
13. `pdc` (Pennsylvania Dutch) is claimed by **no** vendor on this board and `pdc_for_eng` is
    already hard-blocked from TTS as a human-voice course
    (`services/tts-service.cjs:217-222`). It should be **struck from the migration scope**, which
    takes it from 29 courses to 28 and from 11 exposed languages to 10.
