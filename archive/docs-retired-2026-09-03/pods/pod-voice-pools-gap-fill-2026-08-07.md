# Pod voice pools — filling the 7 gap languages

**Date:** 2026-08-07 · **Plate item:** A-95, pod redo phase 1 · **Status:** DONE, live in the DB
**Scope:** `app_config.pod_voice_pools` only. No generation run, no code changed.

Closes §5 of [`pod-redo-scope-2026-08-07.md`](./pod-redo-scope-2026-08-07.md): the 7 courses that
could not produce any pod audio because their language had no entry in the pool.

---

## 1. What changed

`app_config.pod_voice_pools` went from **39 keys to 46**. Seven new pools, each one female voice
and one male voice — the casting default (Aran's two-hander rule, 2026-08-07).

| Key | Blocks | Side | Female | Male |
|---|---|---|---|---|
| `fin` | `fin_for_eng` | target | **Selma** — azure `fi-FI-SelmaNeural` | **Harri** — azure `fi-FI-HarriNeural` |
| `ben` | `eng_for_ben` | known | **Tanishaa** — azure `bn-IN-TanishaaNeural` | **Bashkar** — azure `bn-IN-BashkarNeural` |
| `guj` | `eng_for_guj` | known | **Dhwani** — azure `gu-IN-DhwaniNeural` | **Niranjan** — azure `gu-IN-NiranjanNeural` |
| `pan` | `eng_for_pan` | known | **Vaani** — azure `pa-IN-VaaniNeural` | **Ojas** — azure `pa-IN-OjasNeural` |
| `sin` | `eng_for_sin` | known | **Thilini** — azure `si-LK-ThiliniNeural` | **Sameera** — azure `si-LK-SameeraNeural` |
| `tam` | `eng_for_tam` | known | **Saranya** — azure `ta-LK-SaranyaNeural` | **Kumar** — azure `ta-LK-KumarNeural` |
| `urd` | `eng_for_urd` | known | **Uzma** — azure `ur-PK-UzmaNeural` | **Asad** — azure `ur-PK-AsadNeural` |

All 14 are Azure native neural voices, GA status. Shape matches the existing pools exactly:
`{ <langkey>: { f: [{name, provider, voice_id}], m: [...] } }`.

### Why Azure for all seven

- Six of the seven have **no xAI option at all** — `tools/pod-voices-xai.json` carries 21 locales
  and none of `bn/gu/pa/si/ta/ur` is among them. Azure native neural is the only real choice.
- Finnish is the one with a fork: xAI has four `fi` voices (Valtteri, Helmi, Eero, Elina). Azure
  wins it anyway on the pod door's own arithmetic — every xAI render steered to a non-English
  locale is re-decoded through whisper for the phonology gate at ~576 clips/hr process-global
  (§3 of the scope doc), and Azure renders skip that lane entirely. Same casting, ungated, and
  the pool file's Finnish voices stay available as opt-in headroom if Aran prefers them by ear.
- ⚠️ `tools/pod-voice-coverage.cjs` claims Finnish is tier-1 xAI-native. It is a stale static map
  and was not used for any decision here.

### Regional variants, and why these ones

Where Azure offers more than one region, the choice follows what the course already ships:

- `ben` → **bn-IN** (not bn-BD): `eng_for_ben` already has rendered `bn-IN-TanishaaNeural` clips
  in `course_audio`.
- `urd` → **ur-PK** (not ur-IN): `eng_for_urd.voice_config` names `ur-PK-UzmaNeural` as its
  known/presentation voice.
- `tam` → **ta-LK** (not ta-IN/ta-MY/ta-SG): `eng_for_tam.voice_config` names
  `ta-LK-SaranyaNeural` and `ta-LK-KumarNeural`. This is Sri Lankan Tamil by existing decision,
  not an accident — flagging it in case Aran wants ta-IN instead, which is a one-line pool edit.
- `pan`/`guj`/`sin`/`fin` have exactly one Azure region each.

---

## 2. How each voice was verified

Three independent layers, all before the DB write:

**(a) Provider truth.** Live query of
`https://<region>.tts.speech.microsoft.com/cognitiveservices/voices/list` (556 voices returned).
Every one of the 14 ids appears there with `VoiceType: Neural`, `Status: GA`. No id was
pattern-guessed from a name.

**(b) Actual render.** One short clip per voice through the codebase's own TTS path
(`services/azure-tts-service.cjs#generateAudio`) — 14 clips, in-language text, real audio out.
Durations 1.8–4.7 s, mean volume −17 to −24 dB, max −2 to −8 dB: speech, not silence, not a
zero-byte stub. Per-voice evidence (bytes, duration, volume, transcript):
[`pod-voice-pools-probe-2026-08-07.json`](./pod-voice-pools-probe-2026-08-07.json). Audio kept at
`scripts/pod-voice-pools-probe-2026-08-07/` (gitignored workspace).

**(c) Content check.** Each clip re-decoded with whisper (`ggml-small`, `ggml-medium` for the
doubtful ones), language forced to the expected code:

- **fin** — exact match, both voices ("Hei, tämä on lyhyt äänikoe").
- **tam** — near-exact Tamil, both voices.
- **urd** — exact match, both voices.
- **ben / guj / pan** — whisper transliterates these into Devanagari (a known small-model habit),
  but the phonetic content matches the prompt word for word in every case. Correct speech in the
  correct language; the wrong script is the decoder's, not the renderer's.
- **sin** — see the gap below.

### Explicit gap: Sinhala content is unverified

Whisper produces degenerate looping output for Sinhala on both `small` and `medium` — it has
effectively no Sinhala capability, so layer (c) simply does not exist for `si-LK-ThiliniNeural`
and `si-LK-SameeraNeural`. What is verified: both ids are GA in Azure's live list, both render
real audio of healthy amplitude, and both scale with input length (a 12-word sentence renders
~4.3 s against ~1.8 s for a one-word one — the text is being spoken, not ignored). Also,
`si-LK-SameeraNeural` already has shipped clips in `eng_for_sin`'s `course_audio`.

**Recommendation: one native or Aran ear on the two Sinhala probes before the `eng_for_sin`
batch runs.** That is the only residual doubt in the seven.

### One false alarm, recorded so nobody re-chases it

The first Urdu male probe came out 1.8 s against the female's 3.9 s and looked truncated. It was
not the voice: re-renders of `ur-PK-AsadNeural` give a full 4.2 s every time. The truncated files
were always the **last** file written before `process.exit(0)` — `generateAudio` resolves before
the file is flushed to disk, so an immediate exit clips the tail. Harmless to the pipeline (which
does not exit per clip) but a real trap for any one-off probe script.

---

## 3. Write safety and diff proof

- Before-value snapshotted to
  [`pod-voice-pools-before-2026-08-07.json`](./pod-voice-pools-before-2026-08-07.json) first, so
  the change is reversible by a single update from that file.
- Read-modify-write with a drift guard (abort if the live row no longer matched the snapshot),
  a 39-key assertion, and a refusal to overwrite any existing key.
- Read back after writing: **46 keys**, `0` pre-existing keys changed, `0` new keys deviating from
  intent. Post-state saved to
  [`pod-voice-pools-after-2026-08-07.json`](./pod-voice-pools-after-2026-08-07.json).
- Independent proof: `after` minus the 7 new keys diffs **byte-identical** against `before`.

## 4. End-to-end check

`tools/pod-sync.cjs#assignVoices` (read-only call, nothing written) now resolves cleanly for all
seven courses where it previously threw `No target/known voice available`. With
`POD_VOICES_PER_GENDER=1` every speaker of a gender lands on the single pool voice, which is the
two-hander rule working as intended — e.g. `fin_for_eng` casts Learner/Sarah on Selma and
Narrator/Customer on Harri.

**Still blocked, by design and not by this work:** the six `eng_for_*` courses also carry the §4a
zh-corrupted target casting in `listening_pods.speakers` and need a full re-sync, not a patch.
The pool was the missing precondition; the re-sync is a different owner's step.
