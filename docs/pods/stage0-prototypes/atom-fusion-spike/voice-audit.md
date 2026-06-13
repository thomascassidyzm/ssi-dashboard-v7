# Pod Voice-Provenance Audit — "No Azure" Blast Radius

**Date:** 2026-06-13  ·  **Mode:** read-only (SELECT only, no writes/commits/TTS)
**Scope:** every `listening_pods` row, joined through `listening_pod_sentences` to `course_audio`.
**Why:** Tom directs production onto xAI clone voices and away from any Azure capability we cannot reproduce. This quantifies how many pod clips that touches and where it is blocked.

## Method / classification

`course_audio` has **no `provider` column** — provenance is encoded in `voice_id` + `origin`:

| class | rule |
|---|---|
| **human** | `origin='human'`, or `voice_id` in {`human_recording`,`human`,`legacy_import`} |
| **azure** | `voice_id` matches `azure_*`, `xx-XX-…Neural`, or composite `comp:…Neural+…` |
| **xai** | `voice_id` in the xAI catalog (`tools/pod-voices-xai.json`) or a short clone token (`eve`,`sal`,`leo`,`gfzdpspr5fdp`,`bedd6226`, hex ids) |
| **elevenlabs** | `voice_id` starts `elevenlabs` |
| **noref** | `*_audio_id` FK is NULL (pod sentence exists but no audio linked = unbuilt / text-only) |

Counts: **61 pods, 8,831 sentences, 15,847 distinct audio ids — all 15,847 resolved in `course_audio`** (no dangling FKs; every "noref" below is a genuine NULL).

A course is **"built"** if it has any non-null target audio. 46 of 59 distinct pod courses are built; 13 are unbuilt (all NULL target): the two Welsh courses (`cym_n/s_for_eng`, served via Azure `cy-GB` fallback at runtime, not stored) and the 11 reverse `eng_for_*` courses.

> Note on `spa_for_eng`: it has **3 pods** (`pod-0`, `music`, `travel-situations`); only `pod-0` is built (142 target clips, all xAI). The 821 "noref" target rows are the two unbuilt extra pods — not missing audio on the canonical pod.

## 1. Per-course provider tally

Columns: target (TGT) and explainer (EXP) clip counts by provenance; `noref` = NULL FK. `intended tier/prov` = what `tools/pod-voice-coverage.cjs` resolves the target language to.

| course | sents | TGT azure | TGT xai | TGT noref | EXP azure | EXP xai | EXP noref | intended tier | intended prov |
|---|---|---|---|---|---|---|---|---|---|
| ara_eg_for_eng | 142 | 0 | 142 | 0 | 0 | 131 | 11 | 2 | xai |
| ara_for_eng | 142 | 0 | 142 | 0 | 0 | 130 | 12 | 1 | xai |
| ara_sy_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| bul_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| cat_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| cat_for_spa | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| cym_n_for_eng | 142 | 0 | 0 | 142 (unbuilt) | 0 | 0 | 142 | 3 | azure |
| cym_s_for_eng | 142 | 0 | 0 | 142 (unbuilt) | 0 | 0 | 142 | 3 | azure |
| dan_for_eng | 142 | 0 | 142 | 0 | 0 | 0 | 142 | 1 | xai |
| deu_for_eng | 142 | 0 | 142 | 0 | 0 | 125 | 17 | 1 | xai |
| deu_for_jpn | 142 | 0 | 142 | 0 | 0 | 126 | 16 | 1 | xai |
| ell_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| est_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| eus_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| eus_for_spa | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| fas_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| fra_ca_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| fra_for_eng | 142 | 0 | 142 | 0 | 0 | 128 | 14 | 1 | xai |
| fra_for_jpn | 142 | 0 | 142 | 0 | 0 | 129 | 13 | 1 | xai |
| **gle_for_eng** | 142 | **142** | 0 | 0 | **22** | 0 | 120 | 3 | azure |
| heb_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| hin_for_eng | 142 | 0 | 142 | 0 | 0 | 131 | 11 | 1 | xai |
| **hrv_for_eng** | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| hye_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| isl_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| ita_for_eng | 142 | 0 | 142 | 0 | 0 | 128 | 14 | 1 | xai |
| ita_for_jpn | 142 | 0 | 142 | 0 | 0 | 128 | 14 | 1 | xai |
| jpn_for_eng | 142 | 0 | 142 | 0 | 0 | 129 | 13 | 1 | xai |
| kor_for_eng | 142 | 0 | 142 | 0 | 0 | 131 | 11 | 1 | xai |
| lav_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| lit_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| nep_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| nld_for_eng | 142 | 0 | 142 | 0 | 0 | 0 | 142 | 1 | xai |
| nor_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| pol_for_eng | 142 | 0 | 142 | 0 | 0 | 0 | 142 | 1 | xai |
| por_br_for_eng | 142 | 0 | 142 | 0 | 0 | 126 | 16 | 1 | xai |
| por_for_eng | 142 | 0 | 142 | 0 | 0 | 122 | 20 | 2 | xai |
| ron_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| spa_for_eng (pod-0) | 963* | 0 | 142 | 821 (2 unbuilt pods) | 0 | 126 | 837 | 1 | xai |
| spa_for_jpn | 142 | 0 | 142 | 0 | 0 | 94 | 48 | 1 | xai |
| spa_mx_for_eng | 142 | 0 | 142 | 0 | 0 | 127 | 15 | 2 | xai |
| swa_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| swe_for_eng | 142 | 0 | 142 | 0 | 0 | 0 | 142 | 1 | xai |
| tha_for_eng | 142 | 0 | 142 | 0 | 0 | 0 | 142 | 1 | xai |
| tur_for_eng | 142 | 0 | 142 | 0 | 0 | 129 | 13 | 1 | xai |
| ukr_for_eng | 142 | **142** | 0 | 0 | 0 | 0 | 142 | 3 | azure |
| zho_for_eng | 142 | 0 | 142 | 0 | 0 | 127 | 15 | 1 | xai |
| zho_for_jpn | 142 | 0 | 142 | 0 | 0 | 129 | 13 | 1 | xai |

(11 reverse `eng_for_*` courses omitted — all unbuilt: 0 target / 0 explainer audio, all NULL.)

### Provider totals across all built pods

| slot | azure | xai | human | elevenlabs | noref (NULL) |
|---|---|---|---|---|---|
| **target** | **3,124** | 3,408 | 0 | 0 | 2,299 |
| **explainer** | **22** | 2,396 | 0 | 0 | 6,413 |
| **known (English)** | 3,003 | 3,909 | 0 | 0 | 1,919 |

- **target**: 3,124 Azure clips vs 3,408 xAI clips. The split is *binary per course* — a course is either 100% xAI target or 100% Azure target. No mixed-provider target tracks.
- **explainer**: the narrator is uniformly Tom's xAI clone `gfzdpspr5fdp` (2,396 clips). The only Azure explainer clips are **22 Irish composites** (`comp:ga-IE-ColmNeural+en-GB-SoniaNeural` etc.) — composites that splice an Azure-voiced quoted target token into Tom's narration. All other Azure-target courses have **unbuilt** explainers (noref).
- **known** (English narration track): a deliberate British pool blend of xAI (`leo`, `bedd6226`) + Azure en-GB (`SoniaNeural`/`LibbyNeural`/`HollieNeural`/`RyanNeural`/`MaisieNeural`). ~77 Azure + ~65 xAI per `_for_eng` course. Pure-xAI known only where known≠English (e.g. `_for_jpn`, `cat_for_spa`).

## 2. Intended cast (per `tools/pod-voice-coverage.cjs`) and xAI availability

The coverage map is the single source of truth and **already encodes the constraint**. Its resolution chain:

- **Tier 1** — xAI native voice exists for the language (18 languages: ar, da, de, fi, fr, hi, it, ja, ko, nl, pl, pt-BR, ru, es, sv, th, tr, zh).
- **Tier 2** — xAI multilingual + explicit locale handle (por/pt-PT, spa_mx/es-MX, ara_eg/ar-EG).
- **Tier 3** — Azure locale voice, the long minority-language tail. **No xAI voice exists.**
- **Tier 0** — no TTS at all → human recording (bre, gla, yor).

xAI clone voices (`tools/pod-voices-xai.json`) cover **only the Tier-1/Tier-2 set** — 19 language buckets plus 5 multilingual voices. For every Tier-3 language the JSON has **no entry**, so `resolveTargetPool()` returns `provider:'azure'` by design. There is no "missing cast we could go record" — xAI the vendor does not offer these languages.

This matches the stored audio exactly: every course whose target audio is Azure resolves to Tier-3/`azure`; every xAI-target course resolves to Tier-1/2/`xai`. The DB is consistent with the map.

## 3. Blast radius of "no Azure"

Of the **46 built pod courses**:

- **24 are already 100% xAI target** — no action. (ara, ara_eg, dan, deu×2, fra×2, hin, ita×2, jpn, kor, nld, pol, por, por_br, spa×2, spa_mx, swe, tha, tur, zho×2.)
- **22 have 100% Azure target = 3,124 clips that "no Azure" would require re-voicing.**
- **0 of those 22 can move to xAI.** All 22 are Tier-3 languages with **no xAI clone cast in existence**. Re-voicing them to xAI is **BLOCKED at the vendor**, not by missing config.

```
TARGET Azure clips to re-voice : 3,124
  movable to xAI now           :     0
  BLOCKED (no xAI cast)        : 3,124   (all of them)
```

### The 22 BLOCKED courses (Azure target, no xAI alternative)

ara_sy, bul, cat (×2: _for_eng + _for_spa), ell, est, eus (×2), fas, fra_ca, **gle (Irish)**, heb, **hrv (Croatian)**, hye, isl, lav, lit, nep, nor, ron, swa, ukr.

These are exactly the languages xAI does not speak. "No Azure" cannot be satisfied for them by switching providers; the only Azure-free paths are: (a) keep them text-only / unbuilt, (b) human-record them (Tier-0 style), or (c) find a third TTS vendor that covers the language. Note `fra_ca` and `ara_sy`/`ara_eg` are *regional variants* of languages xAI does speak in another accent — a possible partial mitigation (accept the non-regional xAI accent) but that is a content decision, not currently wired.

### Explainer blast radius

Explainer narration is already Azure-free (100% Tom's xAI clone). The only Azure dependency in explainers is the **22 Irish composite clips** that quote an Azure `ga-IE` token inside the narration — same root blocker (no xAI Irish voice). Every other Azure-target course simply has no explainers built yet, so "no Azure" costs nothing there until they are built.

### Known-track note

The English known track deliberately blends Azure en-GB voices into the British pool (~3,003 Azure known clips course-wide). These **can** move to xAI: xAI has English clone voices (`leo`, `bedd6226`, plus the `en` multilingual set). "No Azure" on the known track is *unblocked* but would shrink voice-colour headroom (the colouring guarantees conversants don't share a voice; dropping the Azure en-GB voices leaves fewer distinct English voices). This is a quality/headroom tradeoff, not a hard blocker.

## 4. Irish & Croatian (our two build courses) — direct answer

Both are **100% Azure target today, and both are BLOCKED from xAI**:

- **gle_for_eng (Irish):** 142/142 target clips Azure — `ga-IE-OrlaNeural` (72) + `ga-IE-ColmNeural` (70). Explainer: 22 Azure composites built (`comp:ga-IE-*+en-GB-SoniaNeural`), 120 unbuilt. **No xAI Irish voice exists** (Tier 3). Known track is the normal Azure-en-GB/xAI British blend.
- **hrv_for_eng (Croatian):** 142/142 target clips Azure — `hr-HR-GabrijelaNeural` (72) + `hr-HR-SreckoNeural` (70). Explainers unbuilt. **No xAI Croatian voice exists** (Tier 3). Known track same British blend.

→ Neither of our two flagship build courses can satisfy "production uses xAI clone voices" for the **target** language. They are precisely the courses sitting on the Azure floor with no xAI escape hatch.

## Key blockers (summary)

1. **3,124 Azure target clips across 22 courses cannot be re-voiced to xAI — xAI has no voice for any of those 22 languages.** This is a vendor-capability wall, already encoded as Tier 3 in `pod-voice-coverage.cjs`.
2. **Irish and Croatian — our two build courses — are both in that blocked set.** Target audio is 100% Azure; there is no xAI Croatian or Irish cast to move to.
3. The only Azure dependency that is *fully reproducible in xAI* is the **English known track** (~3,003 clips) — movable but at the cost of voice-distinctness headroom in the British pool.
4. Explainers are already Azure-free except **22 Irish composites** (same blocker as #1/#2).
5. Re-voicing the 24 already-xAI courses is a no-op; the real decision is policy for the 22 Tier-3 languages: stay Azure, go human-recorded, accept a non-regional xAI accent (only helps `fra_ca`/`ara_sy`/`ara_eg`), or add a third TTS vendor.

---
*Audit scripts: `scripts/experiments/atom-fusion-spike/voice-audit-final.cjs` (DB tally), `blast-radius.cjs` (coverage-map cross-ref). Read-only.*
