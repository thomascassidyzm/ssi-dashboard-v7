# TTS bake-off phase 1 — shared digest (read this, not a pile of other docs)

Compiled 2026-08-26 by Watson from the live DB and this box. Everything below is verified, not remembered.

## Why the project exists
Tom has decided to move SSi off **xAI voices** — a founding-team ethical choice; Aran will not feed
the Musk universe. We need a replacement that reaches **~95% of xAI's perceived quality** with
**near-Azure repeatability** (the same text, re-rendered a year later, must not sound like a
different person).

## Phase 1 spends ZERO
No paid API calls at all — not for candidates, not for controls. The standing TTS policy is a
$20 cap with a human-checked sample before any bulk, and phase 1 must not touch it. Anything that
would cost money is a phase-2 item to be *named*, not run.

## The shortlist
- **Candidates:** Cartesia Sonic (stability-mode cloning, pinnable dated model snapshots);
  Resemble **Chatterbox** (open source, self-hostable, fixed seed + low temperature ≈ deterministic);
  **OpenAI custom voices** (medium priority).
- **Controls:** **xAI** (quality benchmark), **Azure** (consistency benchmark),
  **ElevenLabs** (known-variable benchmark).
- **EXCLUDED-ON-TERMS: MiniMax Speech** (Tom's ruling, 2026-08-26). The readable MiniMax App/Web
  Terms of Service grant MiniMax a **"royalty-free, perpetual, irrevocable, worldwide, non-exclusive"**
  licence to use, reproduce, modify and create derivative works from uploaded user content, retained
  after termination. Tom: that clause is disqualifying on its own — no human check of the
  API-specific terms page is needed. MiniMax is out of scope for all phase-2 work (utterance
  benchmarking, harness scoring, listening tests). Full reasoning:
  [`gate-zero-candidates-recut-2026-08-26.md`](./gate-zero-candidates-recut-2026-08-26.md#minimax-speech--excluded-on-terms-toms-ruling-2026-08-26).

## ⚠️ COURSE CORRECTION — Tom, 2026-08-26 11:06Z. This supersedes the gate-zero section below.

**1. Welsh is OUT of gate zero.** Welsh is done by human recording, so vendor Welsh support is
irrelevant to this evaluation. No candidate dies for lacking Welsh.

Verified against the live DB, and Tom's premise holds exactly: sampling `voice_id` across all 134
courses that hold any `course_audio`, **43 target languages carry 10,000+ clips and every one of
them is ~100% synthetic — except Welsh, which is 96.4% human.** Welsh is the only human-voiced
language in the estate. Evidence: `docs/tts-bakeoff/tts-language-reality-2026-08-26.json`.

**2. The headline is now the languages that actually use TTS today or next:**

- **TIER A — live courses on synthetic audio** (12 live courses, 10 languages). A vendor missing one
  of these cannot serve a shipped course: `eng spa kor zho por ita jpn hrv ben glg`.
  (The other two live courses are `cym_n_for_eng` and `cym_s_for_eng` — human, excluded.)
- **TIER B — the xAI migration scope** (29 courses), the commercial core of the decision:
  `eng deu fra ita jpn kor spa por zho fin` — **10 languages, not 11.**
- **TIER C — beta courses on synthetic audio**, 13,000+ clips each: `fra deu ara eus cat tur ell fas
  nep gle pol hin swa lit hye ron heb swe lav est rus isl ces dan nld ukr bul tha nor srp hun afr`.
- **TIER D — planned or barely started:** `gla mlt tel mar bre fin`, plus ~17 languages holding a
  single probe clip, plus 15 courses with no audio at all.

Coverage is counted **of Tier A (10), of Tier B (10), of Tier A+B+C (43)** — never "of 68", which
flattered vendors with breadth we do not use.

### The three human-voice languages are excluded from every tier — this is already CODE, not a new call

`services/shared/human-voice-courses.cjs` and the chokepoint at `services/tts-service.cjs:217-222`
hard-block TTS for **`cym` (Welsh), `bre` (Breton) and `pdc` (Pennsylvania Dutch)**, on three of
Tom's standing rulings:

- **Welsh, 2026-07-25**, restated as permanent on **2026-08-13**: "Welsh is PERMANENTLY EXCLUDED
  FROM EVERY TTS RENDER QUEUE. Aran's and Catrin's recordings are never overwritten by synthesis."
  Deliberately **no runtime bypass** — no env var, no `--force`. Re-admitting Welsh needs a signed-off
  code change, and nothing cheaper counts.
- **Breton, 2026-07-27** — Azure has no Breton voice; same policy.
- **Pennsylvania Dutch, 2026-08-14** — no synthetic voice anywhere, and its speakers are a community
  Doug and Erik are recording. A German voice reading a pdc line is the defect this prevents.

So Tom's 2026-08-26 correction is **not a new decision — it is him restating a ruling the estate
already enforces in code.** The file's own words: *"Welsh gaps are a RECORDING worklist for Aran and
Catrin, never a render backlog. Anything that reads a Welsh coverage gap as work-to-synthesise has
misread the estate."*

Consequence for this evaluation: **`pdc` must not be counted against any vendor.** Earlier passes
scored every provider "10/11, missing only pdc" — that miss was never real, because pdc is a language
we have ruled we will never synthesise. Corrected, **every provider covers the migration scope
completely.** Note also that `pdc_for_eng` still carries an xAI voice in `voice_config` despite the
guard; harmless (the chokepoint refuses it) but worth tidying.

**3. TTS is a BRIDGE, not the destination.** Verbatim from Tom:
> "we probably want long term to eventually do everything with human voices. Using our intelligent
> limited subset slice and dice approach."

So this evaluation is for **the interim years**, and for scale-out languages before a human reader
exists. The concrete consequence: operational suitability (axis G) weighs **easy EXIT** alongside
easy entry — how cleanly a course generated on a vendor can later be re-recorded human via the
subset/slice-and-dice method. Word/phoneme boundary metadata, output format, licensing, and whether
we are left holding a real person's clone that must then be retired all count. **A vendor that is
cheap to enter and expensive to leave is a worse bridge and scores as one.**

Version pinning still matters exactly as much — **a bridge that drifts mid-crossing is worse than no
bridge.** If anything the bridge framing sharpens it: the estate will be re-recorded language by
language over years, so the un-migrated remainder must keep sounding the same throughout.

## Gate zero (superseded — kept for the record)
~~A candidate that cannot do **Welsh** convincingly is **dead for canonical course work** regardless of
quality. Welsh is the headline row of the coverage table.~~

## The estate, as of 2026-08-26 (live `courses` table)
- **149 courses**, **68 distinct target languages**.
- Status split (`new_app_status`): 14 `live`, 69 `beta`, 65 `not_available`, 1 `draft`.
- **29 courses carry xAI in `voice_config`** — this is the migration scope:
  deu_at_for_eng, deu_for_eng, eng_for_ara, eng_for_ben, eng_for_guj, eng_for_hin, eng_for_jpn,
  eng_for_kan, eng_for_mar, eng_for_pan, eng_for_sin, eng_for_tam, eng_for_tel, eng_for_urd,
  eng_for_zho, fin_for_eng, fra_ca_for_eng, fra_for_eng, ita_for_eng, jpn_for_eng, kor_for_eng,
  kor_for_hin, kor_for_tam, pdc_for_eng, por_br_for_eng, spa_for_eng, spa_mx_for_eng,
  zho_for_hin, zho_for_tam.
  So the xAI-exposed target languages are: **eng, deu, fra, ita, jpn, kor, spa, por, zho, fin, pdc**.
- **Welsh:** `cym_n_for_eng` (north, live, 300 seeds) and `cym_s_for_eng` (south, live, 300 seeds).
  Welsh is **not** xAI-voiced — it runs Azure plus human recordings (Aran, Catrin). Welsh matters
  here because the cloning candidates are the route to Aran/Catrin voices at scale, and because a
  provider with no Welsh cannot be the estate's single answer.
- **Basque:** `eus_for_eng`, `eus_for_spa` (both beta, 300 seeds).
- Full 68-language inventory with per-language course lists and target-voice providers:
  `docs/tts-bakeoff/ssi-language-inventory-2026-08-26.json`.

The 68 target-language ISO codes:
```
afr ara ben bre bul cat ces cor cym dan deu ell eng est eus fas fin fra fur gla gle glg hak heb
hin hrv hun hye ind isl ita jpn kan kor lav lit lmo mar mkd mlt nan nap nep nld nor pdc pol por
rgn roh ron rus scn sme spa srp swa swe tel tha tur ukr vec yid yor yue zho zzz
```
(`zzz` is a placeholder/test course, not a language. Note some *known* languages — guj, pan, tam,
urd, sin — appear only on the known side and still need voices.)

## What credentials exist on this box (repo-root `.env`)
- **Present:** `XAI_API_KEY`, `AZURE_TTS_KEY`/`AZURE_SPEECH_KEY` (+ regions), `ELEVENLABS_API_KEY`.
- **Absent:** any Cartesia key, any MiniMax key, any OpenAI TTS key.
  This is **expected** — Tom is signing up. Report it as a gap; never work around it by spending.

## This box (watson-1), verified 2026-08-26
- 12 vCPU AMD EPYC-Genoa, 22 GB RAM, 175 GB free on `/`.
- **NO GPU.** Only a `Virtio 1.0 GPU` paravirtual display adapter. No CUDA, no `nvidia-smi`.
- Python 3.14.4, **no pip, no ensurepip, no torch**. `python3 -m venv` works but cannot bootstrap
  packages. No numpy.
- `ffmpeg` at `/usr/bin/ffmpeg`. `node` v24.18.0. `whisper-cli` and `lame` exist but are OFF PATH —
  read `WHISPER`/`WHISPER_MODEL` from `.env`.
- CPU is **shared** with other agent sessions; load has historically sat at 20+. Fan-out does not
  buy CPU throughput here.

## Object model, in one paragraph
Course content lives in Supabase, not JSON: `course_seeds` (a sentence pair, known_text/target_text),
`course_legos` (the unit of learning — type `A` atomic or `M` molecular), `course_practice_phrases`
(rows with `phrase_role` of `build` / `use` / `component`), `course_audio` (clips). A **LEGO** is what
the learner learns; **BUILD** phrases are debut-round-only fragments, **USE** phrases are complete
natural sentences that recur forever; **component** rows are per-sentence literal tiling glosses.
Vocabulary is **known / target / seed** — never "source".

## The benchmark utterance schema (fixed here so parallel work interlocks)
One JSON file per language at `tools/tts-bakeoff/data/utterances-<lang>.json`:
```json
{
  "schema_version": 1,
  "language": "cym",
  "dialect": "north",
  "generated_at": "2026-08-26",
  "source": "live Supabase course DB",
  "categories": { "<category_id>": { "label": "...", "purpose": "why this category exists" } },
  "utterances": [
    {
      "id": "cym-0001",
      "category": "isolated_word",
      "text": "…",
      "language": "cym",
      "provenance": { "course_code": "cym_n_for_eng", "table": "course_legos", "row_id": "…", "seed_number": 12 },
      "difficulty_note": "why this one is hard, if it is",
      "repeat_count": 1
    }
  ]
}
```
`repeat_count` is 1 for every utterance except **exactly one** per language, which carries
`repeat_count: 20` and `"category": "repeat_probe"` — that is the 20× repeat test for
intra-voice consistency.

## Tom's scoring axes A–G (the harness scores against these)
A similarity to the reference voice · B naturalness · C pronunciation accuracy ·
D intra-voice consistency (same voice across different utterances) ·
E repeatability (same text, re-rendered, over time) · F control (seed, temperature, pronunciation
overrides, version pinning) · G operational suitability (rate limits, latency, cost, self-host,
consent/licensing).

## House rules that bind every worker on this job
- **Honesty rule (Tom, 2026-08-01):** report every blocker — missing key, hardware gap, a vendor
  that will not admit to a language — as an **explicit gap**. A gap reported honestly is useful; a
  gap papered over is poison. Never substitute a stale doc or an assumption for data you were denied.
- **Code is gospel.** Docs in this repo are historical artifact. Verify vendor claims against vendor
  documentation you actually fetched, and estate claims against the live DB.
- **British English**, "-ise" spellings, direct and practical.
- **Never generate TTS audio** without a plan and explicit approval. In phase 1 the answer is no.
