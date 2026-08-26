# TTS bake-off harness — design and operating manual

**Written 2026-08-26. Deliverable 3 of 4 of phase 1 (the harness skeleton).**
Phase 1 spends zero. Everything below runs, today, without a penny leaving the account.

---

## 1. What this is

A provider-independent runner that takes an utterance set in, sends it through one adapter per
provider, and produces audio plus **full generation metadata**. Then a blind-listening pack builder
turns several runs into an anonymised pack a human can score, and a scoring sheet in Tom's axes A-G.

```
utterance set JSON  ->  adapter (one per provider)  ->  audio + metadata sidecars
                    ->  build-listening-pack        ->  anonymised clips + index.html + scoring CSV
                                                    ->  key file, written OUTSIDE the pack
```

Seven adapters: **cartesia, chatterbox, minimax, openai** (candidates) and **xai, azure,
elevenlabs** (controls).

---

## 2. How to run it

Run from the repo root — that is where `node_modules` and `.env` resolve.

```bash
# dry run: builds the request, writes metadata, spends nothing
node tools/tts-bakeoff/run-bakeoff.cjs \
  --utterances tools/tts-bakeoff/data/utterances-fixture.json \
  --provider azure --voice cy-GB-NiaNeural \
  --out "$CS_SCRATCH/harness/out/azure"
```

| flag | meaning |
|---|---|
| `--utterances <path>` | utterance-set JSON, `schema_version: 1` |
| `--provider <id>` | `cartesia chatterbox minimax openai xai azure elevenlabs` |
| `--voice <id>` | provider voice id / Azure voice name / Chatterbox reference-clip path |
| `--out <dir>` | created; gets `audio/`, `metadata/`, `run-manifest.json` |
| `--live` | actually call the provider — **still refused in phase 1**, see §6 |
| `--seed N` | where the provider has one |
| `--temperature X` | where the provider has one |
| `--repeat N` | override every utterance's `repeat_count` |
| `--model <id>` | override the model / snapshot id |
| `--limit N` | first N utterances only, for smoke tests |

Then build a pack from two or more run directories:

```bash
node tools/tts-bakeoff/build-listening-pack.cjs \
  --in out/azure --in out/xai --in out/elevenlabs \
  --out packs/welsh-round-1 --pack-seed 7 --max-repeats 3
```

Open `packs/welsh-round-1/index.html`. **Link it with the explicit `/index.html`** — evidence pages
on this estate 404 without it.

---

## 3. The utterance schema (consumed, not produced by this slice)

A sibling worker generates the real sets at `tools/tts-bakeoff/data/utterances-<lang>.json`. This
slice ships only a **fixture** at `tools/tts-bakeoff/data/utterances-fixture.json` so the runner is
testable today. The fixture is hand-written Welsh with **empty provenance blocks on purpose** —
nothing in it came from `course_seeds`, and nothing in it should ever be scored.

```jsonc
{
  "schema_version": 1,
  "language": "cym", "dialect": "mixed", "generated_at": "", "source": "",
  "categories": { "<id>": { "label": "", "purpose": "" } },
  "utterances": [{
    "id": "cym-0001", "category": "isolated_word", "text": "", "language": "cym",
    "provenance": { "course_code": "", "table": "", "row_id": "", "seed_number": 0 },
    "difficulty_note": "", "repeat_count": 1
  }]
}
```

The runner validates `schema_version === 1`, requires `id` and `text` on every utterance, inherits
`language` from the set, defaults `repeat_count` to 1, and honours `repeat_count: 20` on the repeat
probe.

---

## 4. The adapter contract

```js
module.exports = {
  id, displayName, role,                    // role: 'candidate' | 'control'
  requiredEnv: ['XAI_API_KEY'],
  stubbed, stubReason,                      // why it cannot run here
  supportsSeed, supportsTemperature,
  supportsVersionPinning,                   // true | false | 'partial'
  versionPinningNote,                       // prose — the answer, not a shrug
  docs: ['https://…'],                      // what the claims were read from
  languageSupport(iso3) -> { supported: true|false|null, note },
  buildRequest(utterance, opts) -> { transport, endpoint, method, headers, body,
                                     bodyKind, responseKind, unsupportedOptions, notes },
  async synthesise(utterance, opts) -> { audioBuffer, metadata },
};
```

Three rules the contract enforces:

1. **`buildRequest()` never embeds a credential.** It puts `${env:NAME}` in the header slot;
   `resolveHeaders()` substitutes the real value inside `synthesise()` only, at call time. This is
   what makes it safe to write the entire request body into a metadata sidecar and commit it.
2. **Unsupported options are recorded, never dropped.** Pass `--seed 42` to Cartesia and the
   sidecar carries `options_requested_but_unsupported: ["seed — Cartesia /tts/bytes documents no
   seed field…"]`. A silently ignored knob is how a bake-off produces a wrong answer.
3. **`synthesise()` fails loudly.** No key → `no credential: phase 2 blocker` with the env var
   named. No runtime → `no runtime: phase 2 blocker`. Never a silent empty return.

`transport` is `'http'` for the six vendors and `'local'` for Chatterbox, whose "request" is an argv
plus a JSON payload on stdin — recorded in metadata exactly as an HTTP body would be.

---

## 5. Metadata — the point of the whole exercise

One sidecar JSON per render, at `<out>/metadata/<provider>__<utteranceId>__r<NN>.json`.

| field | what it is for |
|---|---|
| `provider`, `provider_display_name`, `provider_role` | which system, and whether it is a candidate or a control |
| `product_model` | the model actually sent (`sonic-3.5`, `eleven_multilingual_v2`, …) |
| **`model_version_or_snapshot_id`** | **the pinning story, which is the thing we are testing.** `null` here is an *answer*, not a hole: it means the vendor gives us nothing to pin. `model_version_note` says so in words. |
| `supports_version_pinning` | `true` / `false` / `'partial'` — the adapter's own verdict |
| `voice_id`, `seed`, `temperature` | what we asked for |
| `seed_supported`, `temperature_supported` | whether asking meant anything |
| `settings_sent` | every other setting in the body |
| `options_requested_but_unsupported` | knobs the provider silently ignores |
| `request` | transport, endpoint, method, headers (credential-free), exact body |
| **`request_sha256`** | hash of the canonicalised request. Two runs sharing this **should** share `audio_sha256` on a repeatable provider; where they don't, that gap is the axis-E finding. |
| `utterance_id`, `utterance_text`, `utterance_category`, `utterance_language`, `utterance_provenance` | what was said and where it came from |
| `repeat_index` / `repeat_total` | position in the 20x probe |
| `timestamp` | ISO 8601, per render |
| `output_file` | path, relative to the run directory |
| **`audio_sha256`**, `audio_bytes` | **first-class.** This is what answers "byte-identical across identical runs?" |
| `dry_run`, `audio_is_placeholder` | whether any of this is real |
| `provider_response_metadata` | HTTP status, content type, and for xAI a `suspected_silent_stub` flag |
| `gate_zero` | the Welsh verdict for this utterance's language |
| `error` | message + code, when the render failed |

`run-manifest.json` rolls the run up and adds a **repeatability table**: for each
(utterance, request) pair, how many renders, how many distinct `audio_sha256`, and a
`byte_identical` boolean.

### The dry-run placeholder

A dry run has no real bytes, but the pack builder needs something and the sha256 story needs to be
*demonstrable today*. So `lib/audio.cjs` writes a short WAV tone **derived deterministically from
the canonical request**. Same request → same bytes → same hash; change one field → different hash.
It is a faint tone rather than silence so anyone who opens a dry-run pack hears instantly that it
is not speech, and every sidecar carries `audio_is_placeholder: true`. **Nothing dry-run is ever to
be scored** — the pack builder prints a warning and the HTML shows a red banner.

Proof, run today:

```
seed | request_sha256   | audio_sha256
42     28f1158fe1296c2c   6fb832bb9e15c1e6
42     28f1158fe1296c2c   6fb832bb9e15c1e6      <- identical request, identical bytes
99     2142e73847c0c67e   2b08ba0736c6d471      <- one field changed, everything changes
```

---

## 6. Two locks on spending

1. **Dry run is the default.** No flag, no call.
2. **`--live` alone is not enough.** Every `synthesise()` calls `assertSpendAllowed()`, which
   refuses unless `PHASE2_SPEND_APPROVED=1` is exported by a human who has cleared the approval gate
   in `CLAUDE.md` ("Never generate TTS audio without showing a plan and getting explicit approval").
   Observed today:

   ```
   FAIL azure__cym-0001__r01: SPEND GATE — Azure Speech (control: consistency benchmark) live
   synthesis is blocked. Phase 1 of the bake-off spends zero.
   ```

   For the three unkeyed providers the credential error fires first, because "no key" is the honest
   message rather than "spend blocked":

   ```
   cartesia    no credential: phase 2 blocker — Cartesia Sonic cannot be called: CARTESIA_API_KEY not set.
   minimax     no credential: phase 2 blocker — MiniMax Speech cannot be called: MINIMAX_API_KEY, MINIMAX_GROUP_ID not set.
   openai      no credential: phase 2 blocker — OpenAI TTS cannot be called: OPENAI_API_KEY not set.
   chatterbox  no runtime: phase 2 blocker — Chatterbox needs a GPU host with a pip-capable python.
   xai         SPEND GATE — live synthesis is blocked. Phase 1 of the bake-off spends zero.
   azure       SPEND GATE — live synthesis is blocked. Phase 1 of the bake-off spends zero.
   elevenlabs  SPEND GATE — live synthesis is blocked. Phase 1 of the bake-off spends zero.
   ```

   The order is `credentials → spend gate → call`, shared by every HTTP adapter via
   `httpSynthesise()`. It matters that the gate is *reached*, not merely that the credential check
   usually fires first: an adapter that threw unconditionally would become an ungated spender the
   day its key arrived. Verified by simulating that day — `CARTESIA_API_KEY=sk-fake … --live` gets
   `SPEND GATE`, not a call.

   Chatterbox alone has **no** spend gate, deliberately: it is self-hosted and costs nothing per
   clip, so there is no money to stop. What blocks it is the runtime, and that is a different error.

   The runner loads the repo-root `.env` via dotenv, which is why it must be run from the repo root.
   Each `run-manifest.json` records `required_env` and `missing_env` **as they were on the day**, so
   a phase-2 reader sees which gaps were real rather than inferring them from prose that has aged.

---

## 7. Which adapters are stubbed, and why

| adapter | role | runs here? | why not |
|---|---|---|---|
| **cartesia** | candidate | **stubbed** | No `CARTESIA_API_KEY` in the repo-root `.env` on watson-1 (checked 2026-08-26). Tom is signing up. **Phase-2 blocker.** |
| **minimax** | candidate | **stubbed** | No `MINIMAX_API_KEY` / `MINIMAX_GROUP_ID`. **Phase-2 blocker.** |
| **openai** | candidate | **stubbed** | No `OPENAI_API_KEY`. Custom voices are additionally gated — "limited to eligible customers", requiring consent and sample recordings, so a custom-voice entry is an *account* question before it is a technical one. **Phase-2 blocker.** |
| **chatterbox** | candidate | **stubbed** | Not a credential problem — a **hardware** one. watson-1 has no GPU (Virtio display adapter, no CUDA) and Python 3.14.4 here has no pip and no ensurepip, so `chatterbox-tts` and torch cannot be installed at all. Free to call, impossible to call here. **Phase-2 blocker: needs a GPU box, or at minimum a pip-capable python.** |
| **xai** | control | key present, **not called** | Phase 1 spends zero. |
| **azure** | control | key present, **not called** | Phase 1 spends zero. |
| **elevenlabs** | control | key present, **not called** | Phase 1 spends zero. |

The three keyed adapters mirror the request the repo already sends, matched line by line against
`services/tts-service.cjs` (read 2026-08-26):

- **elevenlabs** — endpoint `:252`, headers `:258-262`, body with `model_id: 'eleven_multilingual_v2'`
  and `voice_settings {stability, similarity_boost, style: 0, use_speaker_boost: true}` `:263-272`,
  defaults `:240-241`. The bake-off adds one field the repo does not send: `seed`.
- **azure** — SSML envelope `:352-359`, output format `Audio16Khz32KBitRateMonoMp3` `:330`,
  key+region `:329`. The repo uses the Speech SDK, which has no serialisable body, so the adapter
  emits the **documented REST equivalent** of the same SSML call. The repo's TTS-input-only
  transforms (`applyRegenerationVariation`, `applyShortWordHint`, `:313-314`) are **deliberately not
  applied** — a bake-off must compare providers on identical text, and a repo-specific pre-transform
  would quietly advantage Azure.
- **xai** — endpoint `:449`, headers `:453-456`, body `{text, voice_id, language, output_format
  {codec, sample_rate, bit_rate}}` `:436-445`, defaults `:410-415`, 15 000-char cap `:421`. The
  adapter always sends an explicit language because the repo warns that `auto` makes the
  English-dominant voices read cross-language words with English phonology (`:425-430`, ita pilot
  2026-07-10) — letting the control run under `auto` would handicap it by our own hand. It also
  carries the repo's silent-stub signature (`:133-181`) into `suspected_silent_stub`.

---

## 8. The blind-listening pack

`build-listening-pack.cjs` takes N run directories and produces:

- `clips/clip-0001.wav` … — **no provider string in any filename**
- `pack-manifest.json` — only what the listener may see
- `index.html` — the player and scoring form
- `scoring-sheet.csv` — the same sheet, printable
- `<pack>-KEY.json` — **written outside the pack directory.** The builder throws if you try to put
  the key inside it. A key in the pack is not a pack.

Anonymisation is done at the byte level as well as the filename level: ID3v2 headers and ID3v1
footers are stripped from mp3, and non-`fmt `/`data` chunks (LIST/INFO/`ISFT` "encoded by …") from
WAV. Encoders write vendor names into comment frames; a listening pack that leaks the answer in a
hex dump is not blind. Verified today: `grep -rlia "azure|elevenlabs|cartesia|x.ai|microsoft"` over
a built pack's clips, manifest and HTML returns nothing.

Ordering is randomised from `--pack-seed` with a seeded PRNG, so a disputed pack can be rebuilt
byte-for-byte and re-listened to. **System letters are assigned in randomised order too** — System A
is not the first `--in` argument.

Two modes:

- **default (`grouping: by-utterance`)** — the same utterance from every system sits back to back,
  each clip tagged `System A/B/C…`. This is what you want: A-D are judged by comparison, and D-G
  need to know which clips share a system.
- **`--no-grouping`** — one flat shuffle, no system letters, no utterance ids, no text. Maximum
  blindness, and the price is that axes D-G are not scorable from it. The CSV drops those rows and
  the HTML says so rather than offering boxes that mean nothing.

---

## 9. The scoring sheet — and which axis is scored at which granularity

1-9 throughout, matching the estate's existing USE-phrase convention (`ralph-methodology.md`: 9 = a
native would actually say it; 5-6 functional/textbook; ≤4 = reject). One scale, one habit, no new
convention to learn.

| axis | granularity | why |
|---|---|---|
| **A** similarity to reference voice | **per clip** | One clip carries the whole answer: this take either sounds like Catrin or it does not. |
| **B** naturalness | **per clip** | Same. Naturalness is a property of an utterance, and it is precisely the *per-utterance outliers* — the one clip that mangles an isolated word — that a per-system average would hide. |
| **C** pronunciation accuracy | **per clip** | Same, and more so: pronunciation failures are local and you want the clip id so it can be re-listened to and quoted. |
| **D** intra-voice consistency | **both** | Per clip it means "does *this* take sit with the others of this voice" — a drifting take is a specific, locatable defect. Per system it means "is the voice stable across the whole set". Different questions; score both. |
| **E** repeatability over time | **per system** | A single clip cannot show it. It is the 20x repeat probe plus the `audio_sha256` column, answered by *comparing* takes. |
| **F** control | **per system** | Seed, temperature, pronunciation dictionaries and version pinning are properties of an API, not of a clip. Largely pre-filled from the adapter capability flags — the listener adjusts, they do not research. |
| **G** operational suitability | **per system** | Rate limits, latency, cost, self-hosting, consent. Nothing to do with the ear; it is on the sheet so it gets weighed rather than forgotten at decision time. |

The HTML form downloads its own CSV locally — nothing is uploaded anywhere.

---

## 10. Gate zero: what the vendor docs actually say about Welsh

Recorded here because it is the most consequential thing the adapter research turned up, and it is
the brief's own killer criterion. Each adapter's `languageSupport('cym')` returns this at runtime
and the runner prints it before every run.

| provider | Welsh in the published list? | source, fetched 2026-08-26 |
|---|---|---|
| **Cartesia Sonic 3.5** | **NO.** The 42-code list is `en fr de es pt zh ja hi it ko nl pl ru sv tr tl bg ro ar cs el fi hr ms sk da ta uk hu no vi bn th he ka id te gu kn ml mr pa` | https://docs.cartesia.ai/build-with-cartesia/models/tts |
| **MiniMax Speech** | **NO.** Welsh is absent from the `language_boost` enum (~30 values; it has "Chinese,Yue" but no Cymraeg) | https://platform.minimax.io/docs/api-reference/speech-t2a-http |
| **Chatterbox Multilingual** | **NO.** The 23 languages are `ar da de el en es fi fr he hi it ja ko ms nl no pl pt ru sv sw tr zh` | https://github.com/resemble-ai/chatterbox |
| **OpenAI gpt-4o-mini-tts** | **YES, claimed.** The guide says support "generally follows the Whisper model" and names Welsh explicitly | https://developers.openai.com/api/docs/guides/text-to-speech |
| **Azure** (control) | **YES, in production.** `cym_n_for_eng` and `cym_s_for_eng` are both live and Azure-voiced | the estate itself |
| **ElevenLabs** (control) | unknown from docs — the multilingual list is 29 languages; verify by ear | https://elevenlabs.io/docs/api-reference/text-to-speech/convert |
| **xAI** (control) | unknown — no language list fetched; the estate has never voiced Welsh with xAI | — |

**Read plainly: three of the four candidates fail gate zero on their own published documentation,
before anyone listens to anything.** That is not my call to make — it is Watson's and Tom's — but
the harness will not let it be discovered late. A claimed language is not a convincing language
either: OpenAI's "yes" is a list entry, and gate zero is decided by ear.

## 11. Pinning, per provider — the thing we are actually testing

| provider | pinnable? | how |
|---|---|---|
| **chatterbox** | **strongest** | The weights are ours. Pin the HF repo id *and* commit sha, the `chatterbox-tts` version and the torch version. Nothing can change under us. That is the argument for self-hosting, and it deserves an honest axis-F score even though Welsh kills it under gate zero. |
| **cartesia** | **yes, two ways** | `model_id: "sonic-3.5-YYYY-MM-DD"` snapshot, plus a dated `Cartesia-Version` header. Caveat: the API reference documents the header and the models guide does not mention it — **the vendor's own docs disagree**, so confirm against a live response in phase 2. |
| **openai** | **yes** | Dated model ids; the schema enum carries both floating `gpt-4o-mini-tts` and snapshot `gpt-4o-mini-tts-2025-12-15`. |
| **elevenlabs** | **partial** | `model_id` pins a named generation, but there is no dated snapshot, so an in-place update to a named model cannot be ruled out. `seed` exists (0-4294967295) with the vendor's own caveat, recorded verbatim in every sidecar: *"Determinism is not guaranteed."* |
| **minimax** | **weak** | Only product generations (`speech-2.8-hd` …). Nothing says they are frozen. Ask the vendor. |
| **azure** | **none** | No snapshot, no dated model, no API-version header. It is the consistency benchmark not because it pins but because it is *deterministic within a model generation* — the repo depends on that so completely that it injects deliberate text variation to force a different render. |
| **xai** | **none** | `/v1/tts` takes no model field at all. Worth stating plainly: the incumbent we are being asked to match on quality gives us **zero** pinning, so "near-Azure repeatability" is a step up from where we stand, not a compromise. |

---

## 12. Files

```
tools/tts-bakeoff/
  run-bakeoff.cjs               the runner
  build-listening-pack.cjs      anonymised pack + index.html + CSV
  lib/registry.cjs              adapter registry
  lib/adapter-utils.cjs         env refs, credential errors, the spend gate
  lib/audio.cjs                 deterministic dry-run placeholder + sha256
  lib/scoring.cjs               the A-G sheet and its granularity rules
  adapters/{cartesia,chatterbox,minimax,openai,xai,azure,elevenlabs}.cjs
  data/utterances-fixture.json  hand-written fixture (NOT course data)
docs/tts-bakeoff/harness-design-2026-08-26.md   this file
```

## 13. Known gaps in this slice

- **No provider has been called.** Every request shape here is reviewed against documentation and
  against `services/tts-service.cjs`; none has been confirmed by a live 200. Phase 2's first job.
- **Cartesia's `Cartesia-Version` header is documented in one place and absent in another.** Flagged
  in the adapter; unresolved.
- **`docs.x.ai` was not fetched.** The xAI adapter is matched to the repo's live, working call,
  which is stronger evidence than a doc page — but it is not a vendor citation, and I am not
  pretending it is.
- **No Chatterbox python runner is written.** Writing one on a box that cannot install torch would
  be theatre. The adapter builds and records the exact invocation; the runner script is a phase-2
  item on a GPU host.
- **ElevenLabs and xAI Welsh support is genuinely unknown**, not "probably fine".
- The fixture is **not** course data. Real utterance sets arrive from the sibling slice.
