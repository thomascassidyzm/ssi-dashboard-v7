# Yoruba trio — feasibility scout

**The finding, first: all three courses are blocked by the same thing, and it is not content. It is that the estate has no Yoruba voice, and its own reference table says none of our three TTS providers offers one.** Yoruba is one of exactly three languages the repo classifies as "Tier 0 — no TTS exists at all". The other two are Breton and Scottish Gaelic. Both have courses. **Both have zero target-language clips.** They stalled at precisely the point Yoruba would stall.

The good news is real and worth having: **the content is much further along than expected**, the storage and TTS paths do *not* mangle Yoruba diacritics, and the one code gate that rejects `yor` is a one-line fix.

**Two things changed after my sub-workers reported, and I have corrected them below:** the best Welsh donor is `cym_s_for_eng`, not `cym_n_for_eng`; and the learner-app display risk is now **confirmed**, with two ordinary Yoruba letters (`Ṣ`, `ǹ`) missing from the actual target-text webfont.

---

## A. What already exists (Kai's memory was too pessimistic)

Both courses already exist as rows, with content:

| Course | Status | Seeds | LEGOs | Phrases | Audio |
|---|---|---|---|---|---|
| `yor_for_eng` | draft, hidden | **668** | 0 | 0 | 1 (an English "welcome" clip) |
| `cym_for_yor` | draft, hidden | **668** | 0 | 0 | 0 |

`yor_for_eng` seeds were created 2026-06-02, last touched 2026-07-11. `cym_for_yor` seeds 2026-07-16.

The Yoruba is real, fully tone-marked Yoruba, not placeholder text:

> `Mo fẹ́ láti sọ èdè Yorùbá pẹ̀lú rẹ báyìí`
> `Wọ́n sọ pé wọ́n fẹ́ rí dájú pé a parí gbogbo nǹkan ní àkókò`

623 of 668 rows carry dot-below characters; 523 carry standalone tone marks.

**Quality checks pass at seed level.** Zero ZUT violations in `yor_for_eng` (no known text maps to two targets; no target maps to two knowns). 667 distinct knowns and 667 distinct targets out of 668 — one duplicate pair to find.

**But nothing is decomposed.** `decomposed_at` is NULL on all 1,336 rows across both courses. Zero LEGOs, zero practice phrases. Seeds are the *start* of a build, not most of one. Note also `courses.seed_count` reads 305 for `yor_for_eng` while 668 rows exist — a stale counter, not missing content.

### The native-speaker asset — and the fact that it has drifted

`services/briefs/reference-examples/yor.json` holds **305 Yoruba lines described as native-speaker-checked**, sourced from `cym_for_yor`. This is the single most valuable Yoruba asset the estate owns — a human-verified tone-marking and register reference.

**Only 36 of those 305 lines still match any live `cym_for_yor` seed.** The live Yoruba was regenerated after the native check, and 88% of the human-verified work now survives only in that JSON file. Before any build, that file should be treated as the authority and the live seeds reconciled against it — not the other way round.

A known defect it documents and that is still live: **14 `cym_for_yor` seeds say `èdè Welsh`** — the language name left untranslated inside the Yoruba (`Mo fẹ́ láti sọ èdè Welsh pẹ̀lú rẹ báyìí`). The brief file already states the rule; the data has not been fixed.

---

## B. THE VOICE QUESTION — the one that decides everything

### (i) Is there a Yoruba voice?

**In our estate: no. Definitively, verified live.**

- `public.voices` returns **zero rows** for any Yoruba filter across every column.
- Azure inventory: **60 locales**, of which the only African ones are `af-ZA`, `sw-KE`, `sw-TZ`. No `yo-NG`.
- xAI inventory: **8 locales** (`ca-ES, da-DK, en-GB, nl-NL, pl-PL, sv-SE, th-TH, zh-CN`). No Yoruba.

The estate's own reference table, `tools/sync/reference/language_codes.csv`, has this row:

```
manifest_code,language_name,azure_locale,elevenlabs_code,database_code,google_locale
yo,Yoruba,,,,
```

**Every provider column is empty.** Azure, ElevenLabs and Google all blank. Compare Welsh: `cy,Welsh,cy-GB,cy,cym,cy-GB`.

And `tools/pod-voice-coverage.cjs`, built 2026-06-07 from the live Azure catalogue (554 voices) and the live xAI catalogue, states it in the code:

> `Tier 0  no TTS exists at all → human recording     (Breton, Scottish Gaelic, Yoruba)`

**The precedent is the alarming part.** I checked what happened to the other two Tier-0 languages:

| Course | Total clips | Target-language clips |
|---|---|---|
| `gla_for_eng` | 1,965 | **0** |
| `bre_for_eng` | 314 | **0** |
| `bre_for_fra` | 97 | **0** |

Every clip in all three is English or French — known side, instructions, encouragement. **Not one clip of Scottish Gaelic or Breton has ever been produced.** Both courses sit at `draft` / `not_available`. This is what "Tier 0" costs in practice, and it is what Yoruba will cost unless the voice question is answered differently.

**A voice PAIR — two distinct target voices for the two-voice cycle — is therefore not available either.** We are not short one voice; we are short the whole language.

### ⚠️ THE REMAINING GAP — now much narrower, and it is a CREDENTIALS problem

Sub-worker **#620** made the live provider calls I had not. The picture is now sharper, and the residual unknown is **our own broken configuration**, not provider capability:

- **Azure — confirmed NO, live.** `getVoicesAsync()` called against the real `AZURE_SPEECH_KEY`: **556 voices returned, zero Yoruba.** This is Microsoft's current catalogue, not a cached file. Azure does carry paired M/F voices for five African languages (`af-ZA`, `am-ET`, `so-SO`, `sw-KE`/`sw-TZ`, `zu-ZA`) — so African coverage exists, Yoruba specifically does not. Neither do Hausa or Igbo; **all three of Nigeria's major languages are absent from Azure.**
- **Google Cloud TTS — UNKNOWN, not configured here.** `services/google-tts-service.cjs` has a working `listVoices()`, but `.env` has **no `GOOGLE_TTS_API_KEY` and no `GOOGLE_PROJECT_ID`/`GOOGLE_APPLICATION_CREDENTIALS`.** The provider is not wired up in this deployment at all, so the call could not be made. **This is the most promising unchecked lead.**
- **ElevenLabs — UNKNOWN, the credential is broken.** `GET /v1/voices` returned HTTP 400: *"API key ID used as API key — only valid API keys start with 'sk_'"*. **The value in `ELEVENLABS_API_KEY` is a key ID, not a key.** This is a live estate defect worth fixing regardless of Yoruba — it means no ElevenLabs API work can succeed from this box today.
- **xAI — structurally unanswerable by listing.** xAI has no list-voices endpoint; voices are arbitrary cloned IDs and `language` is free-text BCP-47 passed through unvalidated. So "does xAI do Yoruba" is not a catalogue question but a phonology question, answerable only by synthesising — which needs Kai/Tom approval under the audio-generation gate. Of 119 registered xAI voices, none are Yoruba or any African language, and the `xaiLocaleToLang` map covers only en/es/it/fr/de/pt/ar/ja/ko/zh. **That is evidence of "never tried", not of "cannot".**

**So: the decisive question is still open, but it is now two cheap fixes away, and neither costs audio money.** Fix the ElevenLabs key and re-run the list call; provision Google credentials and run `listVoices()` looking for `yo-NG`. **Both should happen before any other Yoruba work.** Until then, treat all three courses as blocked.

### (ii) Does the pipeline preserve Yoruba diacritics?

**Yes — and this is genuinely good news, verified by running the actual code.**

The canonical normaliser, `services/shared/text-normalize.cjs`, does lowercase + trim + strip trailing punctuation. **No diacritic stripping, no accent folding, no Unicode normalisation.** Run on live Yoruba:

```
input   : "Ṣé a fẹ́ jẹ nǹkan lẹ́yìn?"
forDb   : "ṣé a fẹ́ jẹ nǹkan lẹ́yìn"      ← all marks intact
```

Lowercasing `Ṣ → ṣ` is correct and lossless. So the obvious fear — a `deburr`/`unidecode` step flattening tone marks — **does not apply here.**

**The real risk is subtler and I want to name it precisely.** Yoruba's stored text is NFC, but **NFC does not fully precompose Yoruba**: there is no single codepoint for "e with dot below *and* acute". So `ẹ́` is stored as U+1EB9 + U+0301 — a base character plus a *live combining mark* — even in NFC. Across the corpus that is **1,215 combining marks over 523 of 668 rows.**

Because nothing in the pipeline applies Unicode normalisation, NFC and NFD forms of the same sentence produce **different match keys**:

```
NFC key === NFD key ?  false     (24 chars vs 31)
```

`course_audio` carries `UNIQUE (course_code, text_normalized, language, role, voice_id)`. Two Unicode forms of one Yoruba sentence are therefore **two different rows** — silent duplicate audio, or a lookup that finds nothing. This is exactly the class of defect that has bitten this column before: the file's own header documents a live 2026-08-06 bug where a split `text_normalized` convention hid 5,090 human recordings from the precious-audio guard and let TTS overwrite them.

And a warning for whoever writes cleanup code: a naive combining-mark strip is *worse than useless* on Yoruba because it half-works.

```
strip U+0300–U+036F  →  "Rárá iye tí ó kéré wà tí wọn nílò"   ← inconsistently detoned
NFD then strip       →  "Rara iye ti o kere wa ti won nilo"   ← all tone AND dots gone
```

The first output still looks Yoruba-ish and would survive a spot check while being wrong. **Fix: pin one Unicode form (NFC) at every write boundary. Never strip combining marks.**

**Two places that DO strip diacritics — both found by sub-worker #621 and re-verified by me directly.** These matter enormously for a tonal language:

**1. The ZUT collision checker is tone-blind.** `normalizeForZUT` in `services/course-builder/lib/text-normalization.cjs` strips diacritics by design. I ran it on Yoruba minimal pairs:

```
"ó lọ"  → "o lo"      "o lọ"  → "o lo"      COLLIDE: true
"ọkọ̀"   → "oko"       "ọkọ"   → "oko"       COLLIDE: true
"pẹ̀lú"  → "pelu"      "pelu"  → "pelu"      COLLIDE: true
```

For French or Spanish, folding accents to compare "sameness" is reasonable. **For Yoruba it is not: tone is lexical.** Two genuinely different target forms distinguished only by tone normalise to one string, so the ZUT rail — the single most important methodology check we have — cannot see the difference. It will either reject a legitimate 1:1 mapping as a violation, or pass a real collision. **ZUT validation on Yoruba is not trustworthy as currently written.**

**2. The veracity gate cannot detect tone errors.** `services/audio-veracity.cjs:255` does `.normalize('NFD').replace(/[\u0300-\u036f]/g,'')` before scoring, so `"Mo fẹ́ láti..."` is compared as `"mo fe lati..."`. The function's own comment says diacritics "are not what we are measuring." **This is the automated gate that would otherwise be our safety net against wrong-tone audio — and it is structurally blind to exactly that failure.** It catches silence, truncation and wrong-language; it cannot catch a voice that ignores tone marks.

**Good news on S3:** every key is `mastered/<uuid>.mp3`. Text never enters the key path, so there is nothing to mangle there — the concern does not apply.

### (iii) Yoruba as a KNOWN language — and a code gate that rejects it

`yor` **throws** in the clip-identity gate. Verified by running it:

```
canonicalLanguage('yor') → THROWS: not in tools/sync/reference/language_codes.csv
canonicalLanguage('yo')  → THROWS
canonicalLanguage('cym') → 'cym'    canonicalLanguage('bre') → 'bre'
```

`phase8-audio-v13.cjs` imports this function, so **audio generation for Yoruba throws before it starts.** The cause is a hardcoded map in `services/language-code-service.cjs` which has `'bre': 'br'`, `'cym': 'cy'`, `'gla': 'gd'` — **and no `'yor': 'yo'`**. Adding that line, plus a `database_code` in the CSV row, is the fix. Trivial — but it is a hard stop until done, and it is exactly the silent-breakage class that costs a day mid-build.

---

## C. Welsh target audio for course #3 — and a correction to the brief's assumption

Two mature Welsh courses exist. **Sub-worker #622 corrected my initial read here, and I am taking its numbers over mine:**

| Course | Seeds | LEGOs | Phrases | Audio clips |
|---|---|---|---|---|
| `cym_s_for_eng` (South) | 668 | **679** | **5,365** | **20,395** (target1 6,694 · target2 6,694) |
| `cym_n_for_eng` (North) | 668 | 635 | 4,997 | 12,986 (target1 6,495 · target2 6,384) |

Both are **99.86% human-recorded** Welsh — a genuinely valuable asset, not TTS.

**But the existing `cym_for_yor` draft cannot reuse any of it.** All 668 Welsh strings compared against both courses, three ways — exact by seed position, normalised by seed position, and set-overlap at *any* position:

```
cym_n_for_eng: 0 / 668 exact · 0 / 668 normalised · 0 / 668 any-position
cym_s_for_eng: 0 / 668 exact · 0 / 668 normalised · 0 / 668 any-position
```

Zero on every measure. Not casing drift — **genuinely different Welsh sentences.** `cym_n` seed 1 is `dw i isio siarad Cymraeg`; the draft's is `Dw i isio siarad Cymraeg efo chdi rŵan.` By seed 200 they are unrelated. The draft also uses straight apostrophes (397 rows), full stops (529) and initial capitals (632); `cym_n` uses curly apostrophes, **no** full stops and **no** capitals.

**This demolishes the brief's reading of course #3 as currently seeded.** The existing draft is not "a Welsh course with the known side swapped" — it is an independently authored corpus that happens to be Welsh, with a 0% audio-reuse ceiling.

**The structure the brief describes is still right — it just hasn't been done.** Built correctly, #3 means taking a donor course's actual seeds and LEGOs and translating the *known* side into Yoruba, leaving Welsh target text byte-identical. **The current 668 draft rows should be discarded, not repaired.**

### Which donor — I am revising my recommendation to `cym_s_for_eng`

My first read favoured `cym_n` because the existing draft's Welsh is Northern (`isio`, `chdi`, `rŵan`). **That reasoning does not survive the 0% match: if the draft is being discarded, its dialect flavour carries no weight.** On the merits, `cym_s_for_eng` wins — deeper on every axis (679 vs 635 LEGOs, 5,365 vs 4,997 phrases, 20,395 vs 12,986 clips) and with zero open forensics questions.

On the damaged-Welsh-audio worry I raised: **#622 checked it properly and it is less alarming than I implied.** All 107 T-20-damaged clips are in `cym_n_for_eng`, none in `cym_s_for_eng` — and joining those 107 IDs against `course_legos`, `course_seeds` and `course_practice_phrases` returns **0 references in all three.** The damage is confined to `cym_n`'s pod-0 listening dialogue, never lesson-attached audio. So `cym_n`'s core audio is not at risk either; `cym_s` is simply the better donor.

### How audio actually attaches — and a correction to my trigger warning

I over-stated the trigger risk. Precisely:

- **The relinking trigger exists only on `course_legos`, not `course_seeds`.** `trg_null_lego_audio_on_text_change` fires BEFORE UPDATE and, on a change to `target_text` *or* `known_text`, **relinks** the audio IDs via `audio_id_for_text()` scoped to that row's own `course_code` — falling to NULL if nothing matches. It also nulls `presentation_audio_id` when **either** side changes, since presentation clips embed both. **A known-side swap therefore does still disturb lego audio** — that part of my warning stands, and it is the reason a swap must be done as a deliberate re-link, not a naive text edit.
- **`course_seeds` has no such trigger.** Editing a seed's `target_text` does *not* null or relink its audio IDs — **they go stale silently.** That is arguably the more dangerous behaviour, because nothing signals it.
- **Cross-course audio reuse is mechanically possible today.** The FKs do not tie a referencing row's `course_code` to the audio row's, and the learner-facing resolver (`ssi-learning-app/api/_utils/audioAccess.ts::lookupAudioRecord`) looks up by `.eq('id', audioId)` with **no `course_code` filter**. A cross-course reference would serve to a learner right now, byte-identical, with no code change.
- **But it has never been used.** Zero cross-course references in either Welsh course; estate-wide the sibling scout found one stray row in 93,854 — an integrity accident, not a mechanism. Audio-repair tooling, make-before-break doctrine and QA all assume same-course provenance. **Treat it as unproven and pilot it small.**

### The scale of what #3 actually needs

`cym_for_yor` has **0 LEGOs and 0 practice phrases**. Against `cym_s_for_eng` that is **679 LEGOs + 5,365 practice phrases** to build, with every Yoruba known-side text, gloss, tiling and known audio generated fresh. And because of the 0% match, adopting the donor's LEGOs means **replacing the draft's seed corpus with `cym_s_for_eng`'s Welsh sentences verbatim** — which changes what a Yoruba learner is taught. **That is a content-authorship decision for Kai on the methodology rails, not an audio-engineering one.**

## D. Display in the learner app — AT RISK, with two named missing glyphs

**I flagged this as unverified; sub-worker #623 closed it, and the answer is worse than I assumed.** It parsed the actual served webfont file rather than reasoning about it.

Target text renders in `LegoAssembly.vue` with `font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace` — a **monospace** stack, distinct from the known side's DM Sans. #623 downloaded the served JetBrains Mono TTF and inspected its cmap against every non-ASCII codepoint in our live Yoruba:

| Codepoint | Char | In JetBrains Mono? |
|---|---|---|
| U+1EB9 ẹ, U+1ECD ọ, á è é ì í ù ú, U+0300/U+0301 combining marks | | **present** |
| **U+1E62** | **Ṣ** | **MISSING** |
| **U+01F9** | **ǹ** | **MISSING** |

**Both are ordinary Yoruba letters, not edge cases.** `Ṣ` opens a live seed (`Ṣé a fẹ́ jẹ nǹkan lẹ́yìn?`) and `ǹ` sits inside `nǹkan`, one of the commonest words in the corpus. They will fall back per-glyph to the next font in the stack — **mixed-font rendering in the middle of Yoruba words, on a monospace stack where the mismatch is especially visible.**

Also found:
- **No `lang` attribute is set on target text anywhere**, so the browser gets no script hint to manage that fallback.
- **A dormant landmine:** `softHyphenate()` (`LegoAssembly.vue:411-426`) does a raw `word.slice(i, i+limit)` by character index with no combining-mark awareness. `yor` is absent from `HYPHEN_LIMITS`, so it gets the 20-char default. It only fires on a single word over 20 characters — none in the current corpus — but it would split a base letter from its tone mark if decomposition ever emits one.
- **Clean:** no `text-transform` touches target text, and the salient-phrase slicing works on whitespace boundaries, so it cannot break a combining sequence.

**Good news:** every learner-facing *map* in the learning app already covers Yoruba correctly — flag SVG (`yor.svg`), i18n locale file (`locales/yor.json`), display name `Yorùbá`, emoji 🇳🇬. Nothing to add there.

**Verdict: AT-RISK, and cheaply fixable** — add a font with full Latin Extended Additional coverage for target text, or a targeted fallback. **Still worth one look on a real phone before build**, since neither I nor #623 could render the app (login-gated; no browser on this box). That remains an open gap, but a much smaller one.

## E. Cost and time — machine time vs real money

The estate's own costing rate is **Azure S0 at $4 per 1M characters** (`services/audio-generation-planner.cjs`). Character volumes from `gle_for_eng`, the closest comparable full TTS build:

| Track | Characters |
|---|---|
| target1 + target2 | **719,179** |
| known | 323,638 |
| presentation | 83,863 |

**Audio money — but note the rate depends entirely on the unresolved voice question:**

| Scenario | Target audio (719k chars) | Full course (~1.13M) |
|---|---|---|
| Azure-rate equivalent ($4/1M) | ~$3 | ~$4.50 |
| Mid-tier neural ($16/1M) | ~$12 | ~$18 |
| Premium/HD tier ($30/1M) | ~$22 | ~$34 |
| ElevenLabs-class | ~$36–215 | ~$55–340 |
| **Human recording** | **$0 API — but human hours** | — |

Add roughly 20–40% for veracity-gate re-renders; historically real spend runs above the nominal.

**The honest headline on money: TTS for these courses is cheap — tens of dollars, not thousands. Money is not the constraint. Availability is.** If the answer is human recording, the cost moves entirely out of API spend and into a native speaker's time: `cym_n` needed **12,879 target clips**, and the pod audio door is throughput-gated around 576 clips/hour even for machine work. Human recording at that scale is a multi-session commitment measured in weeks, not an afternoon.

**Machine time (free, but real elapsed time):**

| Course | Work required | Rough elapsed |
|---|---|---|
| #1 `yor_for_eng` | Decompose 668 seeds → ~650 LEGOs + phrases; reconcile against the 305 native-checked lines; fix the language-code gate | Days of agent work, gated on human review |
| #2 `yor_for_cym` | Known-side swap to Welsh; reuses #1's Yoruba target audio; needs Welsh **known** audio (~324k chars — voice exists, `cy-GB`) | Days, after #1 |
| #3 `cym_for_yor` | Re-do the swap from `cym_n_for_eng`; translate known side to Yoruba; reuses 12,879 Welsh clips | Days, gated on Yoruba **known** voice |

**A structural point worth Kai's attention: course #3 needs a Yoruba voice too.** It is easy to read #3 as the cheap one because the Welsh audio already exists — but its *known* side is Yoruba and must be spoken. The difference is that **#3 needs only ONE Yoruba voice, where #1 needs a distinct PAIR.** If a single native speaker is willing to record, #3 is reachable at roughly half the recording burden of #1 while inheriting ~20,000 existing Welsh clips.

---

## Recommended build order

**0. Answer the voice question before anything else.** One `list-voices` call to Google and ElevenLabs. Nothing else on this page matters until that returns. If a Yoruba voice pair exists at any provider, this is an ordinary build and the order below is easy. If it does not, this is a **human-recording project**, and that is a different conversation about a different resource — one Kai's community contact may be precisely the answer to.

Then, assuming a voice exists:

**1. `yor_for_eng`** — the promised course, the only genuine new build, and the producer of the Yoruba target audio the other two depend on. Before decomposition: add `'yor': 'yo'` to the language-code map, pin NFC at write boundaries, reconcile the 668 seeds against the 305 native-checked lines.

**2. `cym_for_yor`** — do it second, not third. Discard the existing 668 draft rows and re-derive the swap from **`cym_s_for_eng`** (the deeper, forensics-clean donor). It needs only one Yoruba voice and inherits ~13,388 human-recorded Welsh clips, making it the cheapest real course on the list once a voice exists. Note the donor choice switches the course to Southern Welsh — a content decision, not a technical one.

**3. `yor_for_cym`** — last. It depends on #1's target audio and adds a Welsh known side, where the voice already exists. Lowest risk, so it should absorb the least attention first.

If the voice answer is "human recording only", **invert 1 and 2**: `cym_for_yor` becomes the fastest route to a shipped Yoruba-facing course, because one voice is half the recording of two.

## The single thing most likely to go wrong

**My position: the estate will decide Yoruba is "supported" on the strength of a multilingual model accepting the text, and will generate thousands of clips that are fluent-sounding and tonally wrong — and nothing in the pipeline will catch it.**

Yoruba is tonal: tone is lexical, not prosodic. Wrong tone is a *different word*, not an accent. A multilingual TTS voice not trained on Yoruba will read the text confidently and produce plausible audio that a non-speaker cannot distinguish from correct — and our automated gates are blind to exactly this. The veracity gate is Whisper-based, and Whisper's language identification is already documented as unreliable on short clips in this estate; it will not adjudicate tone. The diacritics survive the pipeline, as I showed — which is the trap, because **preserved input marks do not mean the voice honoured them.**

**This is no longer conjecture — I verified the blindness.** `services/audio-veracity.cjs:255` runs `.normalize('NFD').replace(/[\u0300-\u036f]/g,'')` before scoring, so it compares `"Mo fẹ́ láti..."` as `"mo fe lati..."`. Tone is deleted before the check happens. And `normalizeForZUT` collapses `"ó lọ"` and `"o lọ"` to the same string, so the methodology rail is blind too. **Both of our automated gates — content and audio — are structurally incapable of seeing a tone error.**

Both prior Tier-0 languages stalled at zero target clips rather than shipping wrong audio. That was the *safe* failure. The dangerous failure available to Yoruba is shipping 12,879 confidently wrong clips to a community that will immediately hear it — on a course Kai has personally promised.

**The mitigation is cheap and non-negotiable: before any bulk generation, render ~20 clips spanning the tone-mark patterns and have a native speaker listen.** Not a spot check by us; an actual Yoruba speaker. That single gate is the difference between a course that honours the promise and one that embarrasses it.

---

### Gaps, stated plainly

1. **The Yoruba voice question is still open — but it is now a credentials problem, not a research one.** Azure is a confirmed live NO (556 voices). Google TTS **is not configured in this deployment** (no key present). The **`ELEVENLABS_API_KEY` holds a key ID, not a valid key**, so that call returns HTTP 400. xAI cannot be answered by listing at all. Two cheap fixes — provision Google credentials, replace the ElevenLabs key with an `sk_`-prefixed one — would close this without spending a penny on audio.
2. **Neither I nor #623 could render the learner app** (login-gated, no browser here). The two missing glyphs are proven from the font file; what the fallback *looks like* on a real device is not.
3. **Whether the 0% Welsh mismatch is a defect or the intended state** of an independently authored course is not determinable from the database. It changes whether #3 is a repair or a re-authoring, and it is Kai's call.
4. **Blast radius of the `canonicalLanguage` throw is not fully enumerated** — `phase8-audio-v13.cjs` is one confirmed caller; the full caller list was not traced.
5. **#621 traced the diacritic code paths but had no DB access**, so the ZUT tone-collision was proven on constructed minimal pairs (which I re-ran and confirmed) rather than on the real 668-seed corpus. How many *actual* Yoruba ZUT pairs collide is unmeasured.
