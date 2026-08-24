# Do the two render paths differ?

**Verdict: the mastering is IDENTICAL — every render on both paths goes through one `masterAudio()`, and `PRE_COMPRESS` fires unconditionally on both. The real divergence is that the bulk path very often does not RENDER AT ALL: it links and reuses clips that already exist (including from other courses), so a "bulk-rendered" clip can be old audio from an older chain, while the script-view per-clip tool always renders fresh.**

Read-only code trace, 2026-08-08. No audio generated, no endpoint called, no module loaded — files read as text only.

---

## 1. The side-by-side table

Everything below is `services/phases/phase8-audio-v13.cjs` unless stated.

| Step | Script-view per-clip (`/regenerate-phrase`, `/regenerate-lego`, `/regenerate-presentation`, `/regenerate-single`) | Bulk (`POST /generate/:courseCode`, `/generate-components`, `/generate-pods`) | Same? |
|---|---|---|---|
| Entry (UI) | `src/views/production/ScriptViewer.vue:1772` (phrase), `:1918` (presentation), `:2033` (lego) | Production console `/generate` | — |
| Proxy | `services/production-api.cjs:5361 / 5381 / 5342 / 5325` → `proxyToPhase8` (`:4735`) | `services/production-api.cjs:4996` → `proxyToPhase8` | same proxy |
| **Reuse before rendering** | **None.** Phrase route comment at `:4756`: *"we ALWAYS render fresh TTS for every requested role — no dedup reuse-skip"* | `linkAudioIds()` binds existing rows first (`:1985`), then `findSiblingCourseClip()` (`:390`, called `:2268` and `:5447`) copies **another course's `s3_key` verbatim** into a new `course_audio` row and skips TTS entirely | **NO — biggest divergence** |
| Text preprocessing | Gender expansion (Haiku, then marker regex) — `:4780-4797` (phrase), `:5066-5085` (lego), `:4240-4261` (single). Presentation route builds text from the template instead (`:4464`) | Same gender expansion, but precomputed into `genderMap` (`:2318-2331`) | same result |
| Azure text variation | `/regenerate-single` **only** passes `regenerationAttempt: regenCount` (`:4272`) → `applyRegenerationVariation` (`services/azure-tts-service.cjs:278`) mutates the text on attempt ≥1 | never passes it (attempt 0 = no-op) | **differs, `/regenerate-single` only** |
| Voice resolution | `canonicalClipVoiceId(rawVoice, voiceSettings.provider)` — `:4744` (phrase), `:5039` (lego). **`/regenerate-single` is looser**: `voiceSettings.provider \|\| 'azure'` (`:4222`) | `getVoiceForRole()` → `tryCanonicalClipVoiceId` (`:1971`) | same canonicaliser except `/regenerate-single` |
| TTS dispatch | `ttsService.generateWithRetry(text, provider, {...})` — `:4803/4810/4816` (phrase), `:5089/5096/5102` (lego), `:4267/4275/4281` (single), `:4486/4492/4498` (presentation) | `:2338/2345/2351` — byte-for-byte the same three provider branches and the same config keys | **identical** |
| Provider params | Azure: `Audio16Khz32KBitRateMonoMp3`, SSML via `buildAzureSSMLBody` (`services/tts-service.cjs:330,350`). ElevenLabs: `eleven_multilingual_v2`, stability 0.5 / similarity 0.75 / style 0 / speaker boost (`:235-290`). xAI: mp3 24 kHz 128 kbps, explicit BCP-47 (`:407-450`) | same — one shared `tts-service.cjs` | **identical** |
| Retry / 429 | `generateWithRetry(..., maxRetries = 3)` (`services/tts-service.cjs:658`) | same function | **identical** |
| xAI phonology gate | inside `generateWithRetry` (`services/tts-service.cjs:571,660-672`) | same | **identical** |
| **Mastering** | `masterAudio()` — `:4827` (phrase), `:5113` (lego), `:4292` (single), `:4508` (presentation) | `masterAudio()` — `:2365`, `:2894`, `:5521`, `:6427` (pods), `:6918` | **identical — one function, `:1160`** |
| → compression | `PRE_COMPRESS = acompressor=threshold=-24dB:ratio=8:attack=5:release=80:knee=8` (`services/audio-processor.cjs:308`), applied in `normalizeAudio()` (`:552-558`) — **unconditional, no flag, no branch** | same call, same line | **identical — PRE_COMPRESS fires on BOTH** |
| → gain | measure with `PRE_COMPRESS` prefilter, then `volume=(target+1.0−measured)dB` (`audio-processor.cjs:554-557`) | same | identical |
| → limiter | `TRUE_PEAK_LIMIT = aresample=176400,alimiter=limit=0.841:attack=1:release=50` (`:309`) | same | identical |
| → fades | `ANTI_CLICK_FADE` 8 ms in + 8 ms out (`:298`) — **live today on both chains** | same | identical |
| → silence trim | **none on either path** — `normalizeAudio` does no trimming | none | identical (see §3 gap) |
| → tail defect | `flagTailDefect` — log-only since Tom's 2026-08-05 ruling; the old trimming `repairTailDefect` is gone (`:1183-1190`) | same | identical |
| Encode | `ffmpegFilterToLameMp3`: mono, 48 kHz, LAME CBR 96 kbps, `-q 2` (`audio-processor.cjs:92-120`) | same | identical |
| Veracity gate | **absent** on all four per-clip routes | `veracity.renderChecked({ render: renderAndMaster, ... })` (`:2382`) — a failing clip is **re-rendered and re-mastered**, then quarantined if it still fails | **differs, bulk only** |
| Concurrency | 1 clip, roles in sequence | `CONCURRENCY = AUDIO_CONCURRENCY \|\| 20` (`:273`), worker pool `processInParallel` (`:1109`) | differs |
| Write | fresh UUID → `mastered/<UUID>.mp3`, upsert `course_audio`, rebind pointer (`:4835`, `:5117`) | identical shape (`:2400-2440`) plus `veracity.verdictColumns` | near-identical |

`normalizeAudioClean()` — the compressor-free variant (`audio-processor.cjs:577`) — is **not on any production path**. Its only caller in the whole repo is `tools/prosody-lab/remaster-vad-lab-clean.cjs:124`.

## 2. What this means for the clicks

The compressor hypothesis from this morning's forensic survives intact but **cannot explain a difference between the paths**, because it applies equally to both. If Tom's per-clip fixes sound clickless and bulk clips do not, the code offers three candidate explanations, in order of strength:

1. **Bulk mostly doesn't render.** A `/generate` run first links existing `course_audio` rows (`linkAudioIds`, `:1985`) and then, per item, looks for a sibling *course's* clip with the same normalised text/role/voice and **copies its `s3_key`** (`findSiblingCourseClip`, `:390` → `:2268`). Nothing about that clip is re-rendered or re-mastered — it can have been made months ago under a different chain, a different voice-id spelling, or the era when the tail *trim* still ran. Tom's per-clip regen, by construction, never reuses: it always mints a new render. So "bulk clips click, my fixes don't" is fully consistent with the two paths sharing one mastering chain.
2. **The clips are not the same clips.** Per-clip fixes are the ones Tom chose *because they sounded wrong* — self-selected, one voice, one language. Bulk output is everything. Comparing a hand-picked fixed set against a whole course is not a like-for-like A/B.
3. **Provider drift on `/regenerate-single` only.** That route defaults `voiceProvider` to `'azure'` when `voice_config.voices[role].provider` is absent (`:4222`), where bulk would refuse to canonicalise and fail the item. If a course's config is missing the provider key, the same clip regenerated from script view comes back **Azure** where bulk rendered it **xAI clone** — and xAI clones are the peaky, exhale-prone voices the tail-click detector was calibrated on. This is a narrow condition, but it would produce exactly Tom's experience for the affected courses. Note this is `/regenerate-single`, *not* the phrase/lego routes.

## 3. Gaps and corrections — stated plainly

- **Which per-clip route is "the regeneration tool in script view" is not determinable from source alone.** Script view exposes at least three: text-edit → `/regenerate-phrase`; LEGO audio → `/regenerate-lego`; intro narration → `/regenerate-presentation`. `/regenerate-single` is reachable from the audio-flag/QA surfaces, not obviously from the script-view edit modal. Mastering is identical across all four, so the verdict does not depend on which one; the provider-default point in §2.3 does.
- **Deployment.** Popty services run from a separate `-prod` checkout on `main`. I checked `main` directly: `masterAudio` is at `main:phase8-audio-v13.cjs:1121`, calling `normalizeAudio` at `:1133`; `findSiblingCourseClip` at `:424`, used at `:2164` and `:5247`; `PRE_COMPRESS`/`TRUE_PEAK_LIMIT`/`ANTI_CLICK_FADE` and both normalisers are byte-identical on `main`. So the conclusion holds for the deployed code, not just this branch. I did **not** verify the running process, env vars (`AUDIO_CONCURRENCY`, `XAI_PHONO_GATE`), or any course's live `voice_config` — those are runtime facts I had no read access to under this brief.
- **`services/audio-envelope.cjs` header is wrong.** Line 14 states "a mastered clip IS the speech region already — mastering trims lead/trail silence". The mastering chain does no trimming of any kind. The file is also not on either render path — its only pipeline use is a post-hoc backfill in bulk (`:2552`).
- Tom's note that the anti-click fade "has been deprecated" maps to the tail **trim** (`repairTailDefect`), which is genuinely gone. `ANTI_CLICK_FADE` (the 8 ms boundary fades) is live in both chains today.
- I did not measure any audio. This is a source diff only; the claim that bulk clips click and per-clip ones don't is Tom's ear, and nothing here contradicts it.
