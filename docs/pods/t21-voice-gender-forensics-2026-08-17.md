# T-21 — voice-gender forensics before the cast lock

**2026-08-17. Read-only.** Nothing was written to `listening_pods`, `course_audio`,
`pod_voice_approvals`, or any voice JSON. No audio generated, no render run.

The listening doc labels all 41 "In production now" voices male and none female. That column is a
known defect, so none of the genders below are taken from it. Every gender here comes from one of
three independent sources, named per row.

**Namespace note, stated once and meant throughout:** `ara` is used in this estate as BOTH a
language code (Arabic MSA) AND an xAI voice id. Every query below that touches `ara` matches it in
the **`course_audio.voice_id`** column only — the voice namespace — never against `language` or
`course_code`. The clip used to establish the `ara` VOICE's gender is a Hindi clip in
`hin_for_eng`; it is Hindi audio spoken by the voice called `ara`, and it involves Arabic not at
all. Where the report means the language, it says "Arabic".

**Spelling note:** every voice-id query matched **both** the bare and `xai_`-prefixed spellings
(`voice_id ~ '^(xai_)?<id>$'`). `eve` and `xai_eve` are one voice; matching one spelling silently
misses part of a layer.

---

## Method — how gender was established

Three evidence sources, in descending authority:

1. **Azure's own live voice list** — `GET https://ukwest.tts.speech.microsoft.com/cognitiveservices/voices/list`
   with `AZURE_SPEECH_KEY` from `.env` (the call shape is the one in
   `services/voice-discovery-service.cjs:129`). HTTP 200, 432,008 bytes, 556 voices. Each voice
   carries a `Gender` field. This is Microsoft's own record and is authoritative for Azure voices.
2. **Acoustic measurement** — median fundamental frequency (F0) over real served clip bytes,
   autocorrelation over 1024-sample frames at 16 kHz, 70–350 Hz search band, silence-gated.
   Clips were fetched from S3 and decoded. This is provider-independent and label-independent: it
   measures the voice itself. Convention used: median F0 < 155 Hz → male, > 175 Hz → female,
   between → ambiguous.
3. **Repo voice records** — `tools/pod-voices-xai.json`, `tools/pod-voices-azure.json`, and the pod
   pool snapshot `docs/pods/pod-voice-pools-after-2026-08-07.json`. Believed correct; used as
   corroboration, and as the *only* documentary source where noted.

Where sources 1/2 and 3 both exist, they **agree in every single case below**. No contradiction was
found between Azure's list, the acoustic measurement, and the repo records.

---

## 1. Gender of every voice id in the lock

### Azure voices — established from Azure's live list (`Gender` field, verbatim)

| Voice | Azure ShortName | Locale | Azure `Gender` | Verdict |
|---|---|---|---|---|
| Laith | `ar-SY-LaithNeural` | ar-SY | Male | **m** |
| Amany | `ar-SY-AmanyNeural` | ar-SY | Female | **f** |
| Hayk | `hy-AM-HaykNeural` | hy-AM | Male | **m** |
| Anahit | `hy-AM-AnahitNeural` | hy-AM | Female | **f** |
| Ander | `eu-ES-AnderNeural` | eu-ES | Male | **m** |
| Ainhoa | `eu-ES-AinhoaNeural` | eu-ES | Female | **f** |
| Borislav | `bg-BG-BorislavNeural` | bg-BG | Male | **m** |
| Kalina | `bg-BG-KalinaNeural` | bg-BG | Female | **f** |
| Srećko | `hr-HR-SreckoNeural` | hr-HR | Male | **m** |
| Gabrijela | `hr-HR-GabrijelaNeural` | hr-HR | Female | **f** |
| Kert | `et-EE-KertNeural` | et-EE | Male | **m** |
| Anu | `et-EE-AnuNeural` | et-EE | Female | **f** |
| Harri | `fi-FI-HarriNeural` | fi-FI | Male | **m** |
| Selma | `fi-FI-SelmaNeural` | fi-FI | Female | **f** |
| Henri | `fr-FR-HenriNeural` | fr-FR | Male | **m** |
| Celeste | `fr-FR-CelesteNeural` | fr-FR | Female | **f** |
| Antoine | `fr-CA-AntoineNeural` | fr-CA | Male | **m** |
| Sylvie | `fr-CA-SylvieNeural` | fr-CA | Female | **f** |
| Enric | `ca-ES-EnricNeural` | ca-ES | Male | **m** |
| Alba | `ca-ES-AlbaNeural` | ca-ES | **Female** | **f** |

All twenty resolve to exactly one Azure ShortName each, with an unambiguous `Gender`. Every one of
them also matches `tools/pod-voices-azure.json` where that file carries the locale.

**Bas and Lieke are NOT Azure nl-NL voices.** The brief lists them under the Azure pool block, but
Azure's live list contains only three nl-NL voices — `nl-NL-FennaNeural` (Female),
`nl-NL-MaartenNeural` (Male), `nl-NL-ColetteNeural` (Female). Bas and Lieke are **xAI**, and are
handled in the next table.

### xAI voices — established acoustically on served bytes, corroborated by the repo records

Each row is a real clip fetched from `ssi-audio-stage` and decoded.

| Voice id | Name | Median F0 | Voiced frames | Acoustic verdict | Repo record | Agree? |
|---|---|---|---|---|---|---|
| `rex` | Rex | 93.0 Hz | 144 | **MALE** | `pod-voices-xai.json` m | ✅ |
| `eve` | Eve | 186.0 Hz | 307 | **FEMALE** | `pod-voices-xai.json` f | ✅ |
| `ara` (the VOICE) | Ara | 235.3 Hz | 309 | **FEMALE** | `pod-voices-xai.json` f | ✅ |
| `0ih5oi34` | Kasper | 102.6 Hz | 106 | **MALE** | `pod-voices-xai.json` da m | ✅ |
| `0p0rt7o1` | Remi | 117.6 Hz | 118 | **MALE** | `pod-voices-xai.json` fr m | ✅ |
| `9ab26871` | Wei | 127.0 Hz | 104 | **MALE** | pool snapshot `zho/m` | ✅ |
| `18245f0d` | Bas | 141.6 Hz | 364 | **MALE** | pool snapshot `nld/m` | ✅ |
| `cdb1cec8` | Lieke | 183.9 Hz | 219 | **FEMALE** | pool snapshot `nld/f` | ✅ |
| `sal` | Sal | 140.4 Hz, IQR 111–186 | 101 | **ambiguous by design** | m in JSON, both in cast metadata | — |

Notes on the two that needed extra work:

- **Bas and Lieke** were measured on a **pooled concatenation of 7 clips each**, not one clip.
  Single-clip runs were noisy (one 21-frame Lieke clip read male at 131 Hz — too little voiced
  audio to trust, and a classic autocorrelation octave error). Pooled over 219 and 364 voiced
  frames respectively the answer is stable and clear: Lieke 183.9 Hz female, Bas 141.6 Hz male.
  Bas is a **light male voice** — 141.6 Hz sits closer to the male/female boundary than any other
  male in this table — so it is male, but with a narrower margin than Rex (93 Hz) or Kasper
  (102.6 Hz). If Tom's ear is going to disagree with any male label here, Bas is the one.
- **`sal`** measures 140.4 Hz with an unusually wide IQR (111–186 Hz), straddling the boundary.
  This is exactly consistent with the known fact that xAI's cast metadata calls `sal` both f and m.
  It is a genuine gender-neutral voice, not a mislabel. **Do not lock `sal` into a gendered pod
  slot on the strength of the `m` in `pod-voices-xai.json`.**

**Egyptian Arabic (`ara_eg`) — Tom's expectation confirmed.** `rex` = male (93.0 Hz),
`eve` = female (186.0 Hz). "The male and the female" maps as expected. Verified, not assumed.

---

## 2. Catalan — the decisive question

**Verdict: Catalan needs no render. It needs a label fix and Tom's ear on Enric.**

**(a) Is Enric genuinely MALE?** Yes, on two independent sources.
- Azure's live list: `ca-ES-EnricNeural`, Gender = **Male**, Status GA.
- Acoustic, on served bytes: **median F0 128.0 Hz**, IQR 110–142 Hz. Unambiguously male.

**(b) Is Enric genuinely a DIFFERENT voice from Alba?** Yes, decisively.
- They are two distinct Azure ShortNames: `ca-ES-EnricNeural` and `ca-ES-AlbaNeural`. Azure's full
  ca-ES list has exactly three voices — `ca-ES-JoanaNeural` (Female), `ca-ES-EnricNeural` (Male),
  `ca-ES-AlbaNeural` (Female). All GA.
- The stronger proof is acoustic, and it is a clean A/B: both voices have a clip of the **identical
  Catalan sentence** ("Això és exactament el tipus de pràctica que necessito…"). Measured on those
  two clips:

  | Voice | Clip | Median F0 | IQR |
  |---|---|---|---|
  | Enric | `95317dec-22d7-4410-984f-a9d4833a6ec3` | **128.0 Hz** | 110–142 Hz |
  | Alba | `ced8613e-27b6-44f1-858d-ebd557081069` | **190.5 Hz** | 172–208 Hz |

  A 62.5 Hz separation on the same words. These are two different people, an octave-ish apart.
  Not the same voice under two names.

**(c) Are Enric's clips alive?** Yes. Fetched and verified:

**https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/56B5A4AD-5E29-42D5-B289-9F957D1489BC.mp3**

- `HTTP 200`, `Content-Type: audio/mpeg`, **198,144 bytes**
- `ffprobe`: mp3, 48 kHz, mono, **16.128 s**, 96 kbps — real audio, not a stub
- DB row: clip `95317dec-22d7-4410-984f-a9d4833a6ec3`, `cat_for_eng`, `voice_id=ca-ES-EnricNeural`,
  role `target1`, reached from a `cat_for_eng` pod sentence pointer

A second Enric clip was fetched independently and also returned HTTP 200 / audio/mpeg / 194,112
bytes.

**Enric's Catalan pod inventory is substantial, not a stub layer** — via pod pointers, on both
spellings:

| Voice | course | role | clips |
|---|---|---|---|
| `ca-ES-EnricNeural` | cat_for_eng | target1 | 132 |
| `ca-ES-EnricNeural` | cat_for_spa | target1 | 132 |
| `ca-ES-EnricNeural` | cat_for_eng | pod_take_g | 53 |
| `azure_ca-ES-EnricNeural` | cat_for_eng | target1 | 17 |
| `azure_ca-ES-EnricNeural` | cat_for_spa | target1 | 12 |
| `azure_ca-ES-EnricNeural` | cat_for_eng | pod_take_g | 5 |

**So: Enric is male, distinct from Alba, and alive.** The doc's "Alba, male, 77 clips" is a label
defect on the doc — Tom's ear was right and Azure agrees with his ear. Catalan's real state is a
correct male/female pair already in production (Enric m + Alba f); what is wrong is the paperwork,
not the audio. That saves a Catalan render.

---

## 3. The A-131 Dutch clip — the collision does NOT dissolve

Checked against the live database, not against any document.

```
clip 7e08e470-61a2-49ae-8614-222ed9155a75
  course_code   nld_for_eng
  voice_id      xai_247783ebdd51        <-- Noor. REJECTED.
  role          target1
  s3_key        mastered/E933BFD3-3256-4A41-98A6-9153B6E0D314.mp3
  duration_ms   2688
  audio_revision 1
  created_at    2026-08-14 22:02:33+00
  text          "Ik wil graag een glas bitter, alstublieft."
```

And it is the live pointer for the ruled line:

```
listening_pod_sentences
  id              nld_for_eng:pod-0:SC08-S004
  speaker         Customer 1
  target_audio_id 7e08e470-61a2-49ae-8614-222ed9155a75
```

**The clip Tom ruled must stay is on Noor — one of the two rejected production voices.** It is not
already on Bas or Lieke. The cheap dissolution does not happen: a wholesale Dutch re-render onto
Bas + Lieke would replace exactly the clip that was ruled untouchable. The collision is real and
still needs Tom's call.

(Matched on both spellings — the clip carries the `xai_`-prefixed form `xai_247783ebdd51`. A query
matching only the bare `247783ebdd51` would have missed this clip entirely and reported the
collision as already dissolved. That is precisely the failure mode the spelling rule exists to
prevent.)

Nothing was deleted, relinked, queued, or modified. Read only.

---

## 4. The Dutch re-render cost — a real number

### Where the pipeline gets its price

The render pipeline's own constant, in the pod render path:

```
services/phases/phase8-audio-v13.cjs:6142
const POD_CHARS_TO_COST = 15.00 / 1_000_000
```

with this comment above it:

> xAI's published rate, docs.x.ai/docs/pricing (checked 2026-07-28): Text to Speech $15.00 / 1M
> chars. The old value here was $4.20/1M — the figure from launch press coverage, never a billed
> rate — which under-estimated every xAI cost projection in the repo by 3.6x. Azure S0 is $4/1M by
> comparison (services/audio-generation-planner.cjs), so xAI is ~3.75x Azure.

This constant is what actually stamps `estimated_cost_usd` on pod render plans
(`phase8-audio-v13.cjs:6553` and `:6565`). The Azure comparison rate is real too:
`services/audio-generation-planner.cjs:24`, S0 tier, `cost_per_million: 4.0`.

**The $4.48 figure reconciles cleanly and is not a stale estimate.** It comes from commit
`c5088106` (2026-08-14), which costed the entire remaining 41-language pod render at
**6,910 clips / 298,494 characters**. Check: 298,494 × $15/1M = **$4.477**. That is the same
$15/1M constant the code uses. The doc figure and the code constant agree.

**Dutch is being recast to Bas + Lieke, who are xAI**, so the xAI rate is the applicable one for
the new render.

### Counting the real Dutch clips

Voice read from `course_audio`, never from `listening_pods.speakers`. Rejected voices matched on
both spellings: `voice_id ~ '^(xai_)?(247783ebdd51|a13662ba951c)$'` — Noor and Thijs. Clips reached
through the real pod pointers: `target_audio_id`, `takeg_audio_ids`, `sentence_audio_ids` on
`listening_pod_sentences` joined to `listening_pods` where `course_code='nld_for_eng'`. Counts are
**distinct clip ids** — `pod-0` (142 sentences) and `pod-0-unrecorded` (232 sentences) share clips,
so a per-sentence count double-counts.

| Scope | Distinct clips | Characters | Cost @ $15/1M |
|---|---|---|---|
| **A. Rejected-voice clips that are actually played** (`target_audio_id`) | **93** | **6,097** | **$0.0915** |
| B. All rejected-voice target-side clips (incl. `take_g`, alt takes) | 356 | 18,119 | $0.2718 |
| C. Full recast, played clips only (all voices, not just rejected) | 142 | 8,457 | $0.1269 |
| D. Full recast, all target-side clips | 549 | 24,899 | $0.3735 |

### The arithmetic, shown

The number Tom most likely wants is **scope A** — the clips a learner actually hears that sit on a
rejected voice:

```
6,097 characters ÷ 1,000,000 = 0.006097 million characters
0.006097 × $15.00                = $0.0915
```

Worst case, re-rendering every target-side Dutch pod clip regardless of current voice:

```
24,899 ÷ 1,000,000 = 0.024899
0.024899 × $15.00  = $0.3735
```

**The whole Dutch pod re-render costs between 9 cents and 37 cents.** Even the maximal scope is
under forty cents. Cost is not a reason to hesitate on Dutch — the A-131 ruling and the #800
end-click are the reasons, and those are correctness reasons, not money ones.

Nothing was rendered.

---

## EXPLICIT GAPS

Stated rather than filled. Each is something a lock should not lean on.

1. **Bas (`18245f0d`) and Lieke (`cdb1cec8`) are absent from `tools/pod-voices-xai.json`.** That
   file's `nl` block lists only Thijs, Femke, Noor and Ruben. The only documentary attestation of
   Bas and Lieke is the pod pool snapshot `docs/pods/pod-voice-pools-after-2026-08-07.json`
   (`/nld/m[0]`, `/nld/f[0]`). Their genders here are established **acoustically**, not from the
   repo's believed-correct voice record — because that record does not contain them. The acoustic
   evidence is solid (pooled over 7 clips each), but the repo record has a hole, and that hole is
   worth closing separately.
2. **Bas's male reading has the narrowest margin in the set** (141.6 Hz median). It is male, but if
   any male label in this report is going to fail Tom's ear, it is this one. Worth thirty seconds
   of listening before the Dutch lock.
3. **`sal` cannot be assigned a gender** and should not be locked into a gendered slot. Measured
   140.4 Hz with IQR 111–186 straddling the boundary; the cast metadata calls it both f and m. This
   is a genuine property of the voice, not a defect to resolve.
4. **The brief's "roughly 173 existing Dutch pod clips" is not reproducible** against the live
   database under any scoping I could construct. The real figures are 93 (played clips on rejected
   voices), 356 (all target-side clips on rejected voices), 142 (all played clips), or 549 (all
   target-side clips). None is 173. The costing above is given for all four scopes so the number
   does not depend on resolving where 173 came from.
5. **Dutch pod voice leakage, noted but not investigated.** Beyond the two rejected voices, Dutch
   pod clips also sit on `58d27475085e` (Femke), `244e27b39200` (Ruben), `ara`, `eve`, `ef4ce33e`
   and `sal` — well past one-voice-per-gender. This is the known leakage pattern and is a
   convergence question, not a casting question, so it was left alone.
6. **Gender was established for the voices named in the brief only.** The other voices in the
   41-language production block were not measured. Nothing here licenses trusting the doc's labels
   for any language not listed above.
