# TTS language coverage gap-map: Cartesia vs Azure vs human

2026-08-27. Read-only research for the Cartesia/Azure/human voice-architecture decision. No code or DB changes made.

## Method and honesty notes

- **Course list**: queried `courses` via the Supabase REST API directly (no local `psql`, per known machine limits). "Live" = `new_app_status` in `('beta','live')` and `visibility` not `hidden`/`private` — the only real course gate (confirmed against existing memory: `new_app_status is the only course gate`). This returned **79 live courses**, not the ~63 estimated in the brief — the discrepancy is presumably because `new_app_status='beta'` courses (67 of the 79) are already counted as live in this schema; I did not find a smaller canonical "live" count to reconcile against, because `GET /api/estate-map` — the documented authority for exactly this kind of estate fact — **timed out** (`canceling statement due to statement timeout`) every time I called it. **Gap: I could not get the canonical released-course count from its authoritative source; the 79-course / 51-language figures below are my own derived count from the raw `courses` table, not estate-map-verified.**
- **Language list**: derived from `known_lang` + `target_lang` on those 79 courses — **51 distinct ISO-639 language codes** appear, on either the known or the target side (30 of the 79 courses have a non-English known side, e.g. `zho_for_gle`, `eng_for_hin`, `deu_for_jpn` — so "known side" is a real, non-trivial TTS surface, not just a rounding case).
- **Current vendor**: read from each course's `voice_config.voices.{known,target1}.provider`. **Known limitation, flagged explicitly**: existing memory records that `voice_config` is not a reliable proxy for the actually-generated incumbent audio (`voice-config-is-not-the-incumbent-voice`, `voice-id-is-not-a-generation-marker`) — it records intent/config, not necessarily what's in `course_audio` today. I spot-checked one case (Welsh, below) against real `course_audio.voice_id` rows and it held up; I did **not** do this for all 51 languages — that would mean querying `course_audio` per course, which has its own known trap (`Ordered course_audio reads time out`). **Gap: the "current vendor" column is voice_config-derived, not exhaustively audio-verified.** Treat the xAI rows especially cautiously — see note below.
- **Cartesia coverage**: web-verified against Cartesia's own docs (`docs.cartesia.ai/build-with-cartesia/models/tts`) plus corroborating secondary sources, 2026-08-27.
- **Azure coverage**: not independently gap-checked per language, because it didn't need to be — **all 51 languages found in production are already running on Azure Neural TTS today** (proven directly by the `voice_config` data itself, which specifies real Azure locale codes like `af-ZA`, `si-LK`, `sr-Latn-RS` for every one of them). Web search independently confirms Azure Neural TTS now covers 140+ languages/variants, including notably Welsh — so Azure is not the constraint on the Welsh human-only rule; that rule is a deliberate choice, not a capability gap.

---

## 1. Cartesia's actual language support (verified 2026-08-27)

Cartesia's Sonic 3.5 model supports **42 languages "out of the box," each at claimed native quality — no beta/experimental tier distinction is documented**. Voice cloning is stated (secondary source, not Cartesia's own docs page, so treat as moderate- rather than high-confidence) to work across all 42: a clone made in English can reportedly speak any of the other 41.

The 42 ISO codes: `en, fr, de, es, pt, zh, ja, hi, it, ko, nl, pl, ru, sv, tr, tl, bg, ro, ar, cs, el, fi, hr, ms, sk, da, ta, uk, hu, no, vi, bn, th, he, ka, id, te, gu, kn, ml, mr, pa`.

Sources: [Sonic 3.5 — Cartesia Docs](https://docs.cartesia.ai/build-with-cartesia/tts-models/latest), [TTS — Cartesia](https://docs.cartesia.ai/build-with-cartesia/models/tts), [ElevenLabs vs Cartesia 2026](https://futureagi.com/blog/elevenlabs-vs-cartesia-tts-2026/), [Cartesia AI Review 2026 — TextToLab](https://texttolab.com/blog/cartesia-ai-review).

## 2. Azure Neural TTS (verified 2026-08-27)

Azure Neural TTS now covers 140+ languages and regional variants (up from ~100 a few years ago), including minority/regional languages such as Welsh, Zulu and Galician. No quality-tier split found in current docs — the older "standard" (non-neural) voices have been phased out; everything live is Neural. Sources: [What languages are available in Azure TTS? Full 2026 list](https://blog.thefix.it.com/what-languages-are-available-in-azure-tts-full-2026-list/), [Azure Speech's Neural TTS empowers organizations to serve users in more than 100 languages](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/azure-speech%E2%80%99s-neural-tts-empowers-organizations-to-serve-users-in-more-than-100/2920882).

## 3. The 51-language gap map

Sorted Cartesia-covered first, then Cartesia gaps. "Courses" = live courses where the language appears on either the known or target side.

| Lang | Language | Courses | Current vendor (voice_config) | Cartesia | Azure | Recommendation |
|---|---|---|---|---|---|---|
| eng | English | 67 | Azure; xAI (bedd6226) on 12 `eng_for_*` courses' target1 + 1 course w/ no provider set | ✅ | ✅ | **Cartesia** (Tom clone) |
| deu | German | 5 | Azure; xAI on `deu_for_eng` target1 | ✅ | ✅ | **Cartesia** |
| fra | French | 4 | Azure; xAI on `fra_for_eng` target1 | ✅ | ✅ | **Cartesia** |
| ita | Italian | 4 | Azure; xAI on `ita_for_eng` target1 | ✅ | ✅ | **Cartesia** |
| spa | Spanish | 7 | Azure | ✅ | ✅ | **Cartesia** |
| por | Portuguese | 3 | Azure | ✅ | ✅ | **Cartesia** |
| nld | Dutch | 1 | Azure | ✅ | ✅ | **Cartesia** |
| pol | Polish | 1 | Azure | ✅ | ✅ | **Cartesia** |
| rus | Russian | 1 | Azure | ✅ | ✅ | **Cartesia** |
| swe | Swedish | 1 | Azure | ✅ | ✅ | **Cartesia** |
| dan | Danish | 1 | Azure | ✅ | ✅ | **Cartesia** |
| nor | Norwegian | 1 | Azure | ✅ | ✅ | **Cartesia** |
| tur | Turkish | 1 | Azure | ✅ | ✅ | **Cartesia** |
| bul | Bulgarian | 1 | Azure | ✅ | ✅ | **Cartesia** |
| ron | Romanian | 1 | Azure | ✅ | ✅ | **Cartesia** |
| ces | Czech | 1 | Azure | ✅ | ✅ | **Cartesia** |
| ell | Greek | 1 | Azure | ✅ | ✅ | **Cartesia** |
| hrv | Croatian | 1 | Azure | ✅ | ✅ | **Cartesia** |
| hun | Hungarian | 1 | Azure | ✅ | ✅ | **Cartesia** |
| ukr | Ukrainian | 1 | Azure | ✅ | ✅ | **Cartesia** |
| ara | Arabic | 4 (eg/sa/lb variants) | Azure | ✅ | ✅ | **Cartesia** — confirm dialect: Cartesia's `ar` is almost certainly MSA, not Egyptian/Lebanese; check before switching `ara_eg`/`ara_lb` |
| heb | Hebrew | 1 | Azure | ✅ | ✅ | **Cartesia** |
| zho | Chinese | 8 | Azure | ✅ | ✅ | **Cartesia** — confirm Mandarin/simplified matches current `zh-CN` |
| jpn | Japanese | 7 | Azure | ✅ | ✅ | **Cartesia** |
| kor | Korean | 2 | Azure | ✅ | ✅ | **Cartesia** |
| tha | Thai | 1 | Azure | ✅ | ✅ | **Cartesia** |
| hin | Hindi | 2 | xAI + Azure | ✅ | ✅ | **Cartesia** |
| ben | Bengali | 2 | Azure + xAI | ✅ | ✅ | **Cartesia** |
| guj | Gujarati | 1 | Azure | ✅ | ✅ | **Cartesia** |
| kan | Kannada | 1 | Azure | ✅ | ✅ | **Cartesia** |
| mar | Marathi | 1 | Azure | ✅ | ✅ | **Cartesia** |
| pan | Punjabi | 1 | Azure | ✅ | ✅ | **Cartesia** |
| tam | Tamil | 1 | Azure | ✅ | ✅ | **Cartesia** |
| tel | Telugu | 1 | Azure | ✅ | ✅ | **Cartesia** |
| afr | Afrikaans | 1 | Azure | ❌ | ✅ | **Azure** |
| cat | Catalan | 2 | Azure | ❌ | ✅ | **Azure** |
| est | Estonian | 1 | Azure | ❌ | ✅ | **Azure** |
| eus | Basque | 2 | Azure | ❌ | ✅ | **Azure** |
| fas | Persian/Farsi | 1 | Azure | ❌ | ✅ | **Azure** |
| glg | Galician | 1 | Azure | ❌ | ✅ | **Azure** |
| hye | Armenian | 1 | Azure | ❌ | ✅ | **Azure** |
| isl | Icelandic | 1 | Azure | ❌ | ✅ | **Azure** |
| lav | Latvian | 1 | Azure | ❌ | ✅ | **Azure** |
| lit | Lithuanian | 1 | Azure | ❌ | ✅ | **Azure** |
| nep | Nepali | 1 | Azure | ❌ | ✅ | **Azure** |
| swa | Swahili | 1 | Azure | ❌ | ✅ | **Azure** |
| urd | Urdu | 1 | Azure | ❌ (Hindi is covered, Urdu is not — different script) | ✅ | **Azure** |
| gle | Irish | 2 | Azure | ❌ | ✅ | **[FLAG — see §4]** |
| sin | Sinhala | 1 | Azure | ❌ | ✅ | **[FLAG — see §4]** |
| srp | Serbian | 1 | Azure | ❌ | ✅ | **[FLAG — see §4]** |
| cym | Welsh | 2 | Azure config, **but real `course_audio` is human** (`Aran`, spot-checked) | ❌ | ✅ | **Human** (standing rule — moot: Cartesia doesn't cover it and Tom's rule says human regardless) |

34 of 51 languages are Cartesia-eligible; 17 are Cartesia gaps (16 → Azure, 1 → human by standing rule, independent of vendor capability).

## 4. Genuinely ambiguous calls — flagged for Tom

1. **Irish (`gle`)** — no Cartesia support, currently Azure (`ga-IE-OrlaNeural`). Irish is a minority Celtic language sharing Welsh's cultural position, but Welsh alone carries the "always human" standing rule. Existing memory records Irish has "never had a content pass" and is "agent-ruled with no native reviewer" (`irish-has-never-had-a-content-pass.md`, `gle-cn-is-agent-ruled-with-no-native-reviewer.md`) — i.e. there's an open quality question independent of TTS vendor. **Question for Tom: does the Welsh human-only rule extend to Irish, or is the Irish issue a content/methodology problem to fix separately from the vendor choice?**
2. **Sinhala (`sin`)** — no Cartesia support, currently Azure. Existing memory flags Sinhala-specific defects in the audio QA pipeline itself: `Veracity gate is blind to Sinhala` and a documented `eng_for_sin` presentation corruption incident. **Question for Tom: is Azure TTS actually fine for Sinhala, or is the QA blind spot masking a real quality problem that a vendor switch wouldn't fix anyway?**
3. **Serbian (`srp`)** — no Cartesia support, currently Azure. Existing memory: `Serbian shared_audio is wholly broken` and `Within-language median hides a broken language`. **This looks like it needs a fix regardless of vendor** — flagging so the vendor-mapping exercise doesn't get credited with "fixing" something that's actually broken at the shared_audio/infra layer.
4. **Arabic dialects (`ara_eg`, `ara_lb`)** and **Chinese (`zho`)** — Cartesia lists the language family (`ar`, `zh`) but I could not verify from its docs whether that's a single dialect/register (e.g. MSA, Mandarin-simplified) that would match or diverge from the specific locales already recorded in production (`ar-EG`, `ar-LB`, `ar-SA`, `zh-CN`). Not a vendor-capability gap, but a **verification gap before migrating** — worth a real audio sample comparison, not a docs read.
5. **The 16 courses currently marked `xai` in `voice_config`** (`deu_for_eng`, `fra_for_eng`, `ita_for_eng`, and 13 `eng_for_*` courses' target1) — given the documented unreliability of `voice_config` as a proxy for actual incumbent audio, I'd treat "currently xAI" as **unconfirmed** until someone samples the real `course_audio` rows for these courses. It's plausible these are stale test configs rather than what's actually live.

## 5. Explicit gaps in this research

- `GET /api/estate-map` — the documented authoritative source for exactly this kind of course/language census — timed out on every call; the 79-course/51-language figures are a direct-table derivation, not cross-checked against that authority.
- "Current vendor" is `voice_config`-sourced for 50 of 51 languages; only Welsh was spot-verified against real `course_audio.voice_id` rows. Memory explicitly warns this config can be stale/wrong.
- Cartesia's claim that voice cloning works identically across all 42 languages comes from a third-party review/blog, not confirmed on Cartesia's own docs pages in this session.
- I did not check per-locale voice *quality* (naturalness, house-voice fit) for either vendor — this is a coverage/capability map only, not a listening evaluation.
