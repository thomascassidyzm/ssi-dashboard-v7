# The 24-clip German sample — first real run of the sample-first process

**2026-08-06. A real TTS run: 24 clips, $0.021 spent. Nothing written to the course estate.**

Listening page (48 players, phone-playable): https://watson-1.tail4968cb.ts.net/d/0e4fae5c

Tom approved TTS spend with impunity and made small-sample-first standing doctrine on 2026-08-06.
This is the first job run under it. It is doing two things at once on purpose: proving the sample
stage of the pipeline in
[`docs/audio-providers-fidelity-labs-2026-08-06`](../audio-providers-fidelity-labs-2026-08-06.md)
§"Small-sample-first", and being the listening material that answers the open taste question —
**is 24 clips enough to judge a voice by?** Only Tom's ear answers the second one.

---

## What was run

| | |
|---|---|
| course / side | `deu_for_eng`, target1 (German) |
| voice | `ara`, xAI — the voice this side actually declares (14,051 rows) |
| language steer | `de`, explicit; xAI phonology gate on |
| render path | `services/tts-service.cjs` `generateWithRetry`, the estate's own |
| mastering | phase8's `masterAudio` replicated: `normalizeAudio(−16 LUFS)` → `flagTailDefect` → duration |
| clips | 24 rendered, 24 admitted |
| characters | 1,390 of text, 1,398 billed (two re-rolls on one clip) |
| **cost** | **$0.0210** at xAI's $15/1M characters |
| writes to `course_audio` | **none.** No row created, updated, relinked or deleted |
| S3 | `mastered/pilot/deu-24-2026-08-06/` — a scratch prefix, no existing object touched |

Scripts (gitignored workspace): `scripts/deu-pilot-24/` — `select.cjs` (stratification),
`render.cjs` (render + gates + upload), `live-compare.cjs` (the free A/B), `page.cjs` (the page).

## How the 24 were chosen

Not the first 24 rows — that is a sample of the easiest material. Six per axis, drawn from a pool
of **13,534 distinct German texts** across the course's legos, phrases and seeds, deduplicated on
normalised text because identity is `(language, text, voice)`:

- **Shortest** (2–3 syllables) — where the fixed onset and release dominate and a missing word
  hides. Three of the six are deliberately from seeds 1–12, because that is where every German
  defect this week was found.
- **Middle** (8 syllables, the course median, no special phonology) — the calibration material.
- **Phonologically awkward** (12–16 syllables) — scored on German's own trouble: ich-laut and
  ach-laut, umlauts, hard clusters (`pf zw str schr chst ngst`), final devoicing, long compounds.
  Held at ordinary length so the test is phonology and not duration.
- **Longest** (36–41 syllables) — prosody drift, breath, and the far anchor of the duration model.

Two constraints on top, both for the ear rather than the statistics: no two clips from the same
seed, and no two sharing an opening — six variants of "Meine Freundin hat gesagt…" would be a
stratum on paper and one clip to a listener.

## Coordination with VOICELAB 01 — checked, not assumed

Job `88ae4e60` (VOICELAB 01, Tom's clone in deu/fra) was rendering at the same time. Its brief and
sample set were read directly (`scripts/voicelab-01/samples.cjs` in the `SSi/` checkout) rather than
guessed at. It renders six German course sentences on `ara` as its **baseline** condition — the same
voice this pilot uses. **Those six texts are excluded from this sample by name**, so no clip was
rendered twice and no spend was duplicated. Different S3 prefix, and this run was serial, so the two
jobs never exceeded xAI's concurrency tolerance between them.

## Results — the fresh 24

**Every clip passed every gate.**

| gate | implementation | result |
|---|---|---|
| pace (syllables vs the voice's own fitted rate) | `services/audio-intelligence/tiers/tier1-duration.cjs` | 24 scored, **0 flags**; z −1.39 to +2.60 |
| ending (did it stop, or was it cut) | `services/audio-intelligence/tiers/tier2-edge-shape.cjs` | 24 measured, **0 flags**; fall rate 0.087–0.911 dB/ms against a 0.70 threshold that also needs ≥80% zero-pad |
| words (whisper CER) | `services/audio-veracity.cjs` | 24 checked, **24 pass, every one CER 0** |
| loudness | ffmpeg `loudnorm` measurement, verdict added here | **24 in band**, −15.25 to −15.94 LUFS, all true peaks ≤ −1.81 dB |
| language | `tts-service.cjs` phonology gate, whisper auto-detect | 24 pass; one clip needed three attempts |
| tail flag | `audioProcessor.flagTailDefect` (advisory, 9% precise) | 14 advisory flags, 0 actioned — as designed, it never gates |

## The finding that was free: the live estate on the same 24 sentences

Every one of the 24 texts already has a clip in the course on this same voice. Fetching those and
running the identical gate stack costs no TTS and no writes, and it turns the pilot into an A/B.

| | fresh renders | live in the course today |
|---|---|---|
| pace flags | **0** / 24 | **6** / 24 |
| ending flags | **0** / 24 | **9** / 24 |
| whisper CER > 0 | **0** / 24 | **5** / 24 |

Two are audible word damage, not measurement noise:

- **`raten`** ("to guess", S0012L01) is live as *"Rath"* — CER 0.40, pace z −2.74.
- **`rufe dich`** ("call you", S0524L01) is live as *"Rufi de"* — CER 0.44, and the ending detector
  puts the last 31 dB inside 10 ms (3.114 dB/ms) with 85% zero-pad: the fingerprint of a trim.

Three more have suspect decodes on short clips (`gute Zeit` → "gute Theorie", `Tasse Kaffee` →
"Tasse Café", `gesagt` → "gesehen") which are as likely to be small-model ASR error as damage, and
are logged as suspects rather than defects.

**What this says.** The German problem is damage done to clips *after* they were rendered, not a
voice that cannot say German. The same voice, asked the same 24 sentences tonight, produced clips
that pass every gate — including on the very sentences whose live versions are cut.

## Three things this run also surfaced

**1 · The language gate is expensive on very short clips.** `Ende` (2 syllables) was rendered, heard
as English by whisper, re-rolled, heard as English again, and passed on the third attempt. The gate
worked. But two syllables is very little for a language detector, so on a bulk run every short lego
is a potential triple render. Worth pricing before a 16,000-clip German pass; worth measuring as a
per-length flag rate rather than assuming.

**2 · 991 German slots point outside the public prefix.** 1,223 `deu_for_eng` audio rows have an
`s3_key` under `repair-candidates/` or `pending/` rather than `mastered/`, and 991 of those are
linked to a learner-facing slot. **This is not a learner-facing breakage** — checked, not assumed:
both app paths (`/api/audio/[audioId]` proxy and the signed `batch-urls` endpoint) read the object
server-side with credentials, and the objects exist. It does mean the content-addressed design's
"permanent public address" is not true of every row today, and the migration has to account for it.

**3 · The gates are calibrated for exactly this voice.** The ending detector's 0.70 dB/ms line was
read off `deu_for_eng` seeds 1–5 across three voices including `ara`; the pace model carries `ara`'s
own rate from 114 untrimmed renders. Both are speaking about a voice they have measured. Neither has
anything to say about a voice they have not — a clean sweep here is not transferable evidence about
French, or about the clone.

## Honest gaps

- **No ear pass.** Every verdict above is machine measurement. The taste judgement — is this voice
  good enough, and did 24 clips feel like enough to decide — is Tom's and is not answered here.
- **One voice, one language.** `leo` (this course's target2 German voice, 13,640 rows) was not
  sampled, and neither was the known side.
- **The suspect decodes were not adjudicated by ear.** Three live clips with small CER are recorded
  as suspects; separating ASR error from real damage needs a listen.
- **Loudness is measured but not enforced anywhere in the live pipeline.** The band verdict in this
  run is computed here, in the probe. Turning it into an admission gate remains unbuilt — it is,
  as the fidelity doc says, the cheapest gate available since the number is already computed and
  currently thrown away.
