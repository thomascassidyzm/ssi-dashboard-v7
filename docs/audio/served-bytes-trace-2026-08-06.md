# Are the damaged German clips damaged on the server, or only on the learner's device?

2026-08-06. Diagnosis only — no TTS, no deletions, no S3 writes, no database updates. Every byte
analysed was copied DOWN to `scripts/served-bytes-trace/` (gitignored) and measured there.

## The one-sentence answer

**The client-cache mechanism explains none of the damage in this sample — every clip that is
damaged is damaged in the bytes S3 serves right now**, and the stale-cache problem is a second,
separate fault that will stop the *repairs* reaching learners rather than one that caused the
damage.

## Verdict counts

25 clips traced: 20 `deu_for_eng`, 5 `fra_for_eng`.

| verdict | deu | fra | meaning |
|---|---|---|---|
| **SERVER-DAMAGED** | 9 | 0 | today's S3 bytes are bad |
| **DEAD POINTER** | 4 | 0 | row names an S3 key that 404s |
| **CLEAN** | 3 | 1 | flag was a false positive, or the clip is already correctly repaired |
| **CLEAN, TAIL-SUSPECT** | 3 | 2 | content complete; tail shape inside the range healthy control clips also show |
| **AMBIGUOUS — needs an ear** | 1 | 2 | the two ASR models disagree |
| **CLIENT-STALE-ONLY** | **0** | **0** | good server bytes + a stale client copy |

Not one clip in 25 was clean-on-the-server-but-stale-on-the-device. The prior single-clip finding
(`docs/audio/deu-truncation-root-cause-2026-08-06.md`) does not generalise.

## The chain, verified end to end

Layer (b), (c) and (d) are the same for every `deu_for_eng` clip in the sample, so they are stated
once rather than repeated per row.

| layer | what it does | verified how |
|---|---|---|
| (a) `course_audio` row | holds `s3_key`, `audio_revision`, `duration_ms`, `voice_id` | live psql, per clip, in the tables below |
| (b) learner API | `ssi-learning-app` `api/audio/[audioId].ts` streams the row's `s3_key` straight from S3 | live GET against `staging.saysomethingin.app` |
| (b') Popty | `GET /api/production/:course/audio/:uuid/url` mints a **fresh presigned S3 URL per request** (`services/s3-production-service.cjs:125`); the API layer itself sends `no-store` | code + `services/production-api.cjs:151` |
| (c) headers | live response: `cache-control: public, max-age=31536000, immutable`, `cdn-cache-control: no-store`, `accept-ranges: bytes` | curl, 2026-08-06 22:33 UTC |
| (d) URL shape | `buildAudioRef()` returns a **bare uuid** whenever `audio_revision <= 1`; only revised clips get `.v<N>` (`api/_utils/audioAccess.ts:127`) | code + the refs in the tables |
| (e) S3 object | the bytes measured below | boto3 HEAD + GET |

**Layers (b)–(e) are byte-identical.** Downloading three clips through the live learner API and
through S3 directly gives the same MD5:

| clip | via `staging.saysomethingin.app/api/audio/<id>` | via S3 `GetObject` |
|---|---|---|
| d87be007 | `59f4dd50d436877494dc9622ab3d2624` | `59f4dd50d436877494dc9622ab3d2624` |
| 9e7b8947 | `126304fcbd7e73822541192170e61b72` | `126304fcbd7e73822541192170e61b72` |
| 37757f71 | `6a6318b5042e66616ae8974f17981938` | `6a6318b5042e66616ae8974f17981938` |

So "what S3 holds" and "what the player is handed" are the same question. Everything below measures
the S3 bytes and that is sufficient.

**Popty cannot show Tom a stale clip.** It signs a new URL per request and the API sends
`no-store`, so what he hears in Popty is what S3 holds this second. Damage he hears in Popty is
server-side by construction.

## Method — and why transcription alone was not allowed to decide anything

Every downloaded file was measured **twice**:

1. **ASR** — `whisper-cli` invoked exactly as `services/audio-veracity.cjs` does it (unprimed, no
   `--prompt`, no `--grammar`, JSON output not `-nt`, 639-3→639-1 language mapping), with
   `ggml-medium` for German and a second independent decode with `ggml-small` as a cross-check. A
   word counts as lost only when **both models miss it**.
2. **Waveform** — onset-of-trailing-silence anchored, 5 ms frames.

The waveform test had to be rebuilt mid-run. A file-end energy test — "is the last 100 ms loud?" —
scored every amputated clip healthy, because these clips are cut and *then* padded with ~100 ms of
digital silence, so the final 10 ms is zeros either way. The measurement that works is taken at the
moment speech stops: `preCut_vs_body_db`, how loud the signal still was when it ended, relative to
the clip's own average.

**Calibration against 9 unflagged control clips** (same course, same voices, `audio_revision = 1`,
scanned clean by the word-loss pass):

- `preCut_vs_body_db`: `-27.1, -26.8, -21.7, -16.2, -16.2, -10.8, -10.2, -1.7, +1.8`
- `stepDb`: `15.3 … 75.5` — **`stepDb` does not discriminate**; a healthy clip scores 75 dB
- `trailing_pad_ms`: `85 … 120` — the pad is universal

A natural German ending trails off 10–27 dB below the clip's body. **But 2 of 9 healthy controls
also stop at full level** (−1.7 and +1.8 dB), so "stops loud" on its own is not proof of damage —
which is why those clips are labelled TAIL-SUSPECT rather than damaged. Two files in the sample end
with **zero pad and full-scale energy** (edge amplitude 0.59 and 0.79); nothing in the control set
comes near that, and those are unambiguous.

## Sample — what was picked and why

At least 12 genuinely damaged clips spanning more than one damage class was the brief; the sample
was widened to 20 German clips so each class carries its own control, plus 5 French.

| class | n | source | selection rule |
|---|---|---|---|
| A — missing final word | 8 | `docs/audio-repair-2026-08-06/deu-wordloss-full.json` (1,036 flagged of 5,100) | `audio_revision = 1` only (830 of the 1,036 are still unrepaired); stratified 2 per role — the worst by missing-word count, and the median — so the sample cannot be all worst-case |
| B — abrupt tail cut | 4 | `docs/audio-repair-2026-08-06/deu-tail-flag-pilot.json` | lowest `releaseMs`; deliberately includes 3 whose final word the scan heard fine, to test the "CER 0 cannot hear a clipped take" rule |
| C — wrong voice / wrong language | 4 | DB `voice_id` census | all 12 `deu_for_eng` rows carrying the Azure **English** voice `en-GB-SoniaNeural` with a `pending/` key and NULL duration |
| D — silent take | 1 | DB `duration_ms < 400` census | the only sub-400 ms non-null clip in the course |
| E — control, already repaired | 3 | same word-loss file, `audio_revision = 2` | tests whether the sanctioned repair path works end to end |
| F — French confirmation | 5 | `docs/audio-repair-2026-08-06/fra-full-queue-tails.json` | flagged by **both** the duration and the tail detector, `revision = 1`, one per role |
| control | 9 | same word-loss file, `truncated: false` | calibration only |

The silent-take class is thin: the course has no silent clips to sample. The 13 candidates under
400 ms turned out to be 12 dead pointers (class C) and one 356 ms clip, which is class D.

## Class A — missing final word (8 clips)

All eight: `audio_revision = 1`, **bare-uuid learner URL**, no `course_audio_revisions` ledger
entry, `cache-control` unset on the S3 object, and an S3 `LastModified` in the evening of
2026-08-03 — weeks to seven months after the row was created.

| clip | role / voice | expected text | db dur → file | pad ms | preCut vs body | whisper **medium** | whisper **small** | verdict |
|---|---|---|---|---|---|---|---|---|
| `d87be007` | known / eve | ten possible problems | 1008 → 974 ms | 95 | **+0.05 dB** | "10 possible points." | "10 possible…" | **SERVER-DAMAGED** — both models lose `problems`; stops at full level |
| `9d704969` | known / eve | main road street | 912 → 882 ms | 100 | −8.6 dB | "Main Road." | "Main road." | **SERVER-DAMAGED** — both lose `street` |
| `9ca306ea` | presentation / eve | The German for: 'decided', is: | 2016 → 1976 ms | 100 | −3.1 dB | "The German four decided." | "The German thought decided." | **SERVER-DAMAGED** — both lose the trailing `is` |
| `9e7b8947` | presentation / eve | The German for: 'later'… is: | 4008 → 3984 ms | 105 | −0.1 dB | "…she was going later" | "…she was going later." | **SERVER-DAMAGED** — both lose `is` |
| `37757f71` | target1 / ara | an der nächsten Ecke `::superseded-regen` | 792 → 760 ms | 105 | −30.3 dB | "Und der nächste!" | "und den nächsten." | **SERVER-DAMAGED** — both lose `Ecke`; note the row's `text` carries a `::superseded-regen` marker |
| `a7cbb4f1` | target2 / leo | er gesagt hat | 792 → 754 ms | 125 | −0.7 dB | "Ehergesagt." | "Eher gesagt." | **SERVER-DAMAGED** — both lose `hat` |
| `9f7e7ecc` | target2 / leo | stellen | 744 → 720 ms | 155 | −23.3 dB | "stehen." | "Stehn." | **SERVER-DAMAGED**, different mechanism — the tail decays naturally; the clip appears to say the **wrong word**, not a truncated one |
| `be39ceef` | target1 / ara | großvater | 816 → 792 ms | 100 | +0.5 dB | "Großvater." (CER 0) | "Großfahrt." | **AMBIGUOUS** — models disagree; needs an ear |

**The duration delta is not evidence.** Every clip's file is 24–40 ms shorter than its stored
`duration_ms` — but so is every *control* clip (−24, −26, −24, 0 …). That offset is systematic
measurement, not damage, and it means the file's length cannot date the word loss.

## Class B — abrupt tail cut (4 clips): the flag is mostly noise, except where it is stark

| clip | text | pad ms | edge amp | preCut vs body | both models | verdict |
|---|---|---|---|---|---|---|
| `54201b05` | [atom] acht Euro vierzig (pod_explainer, `comp:leo`) | **0** | **0.788** | −8.0 dB | content present | **SERVER-DAMAGED** — file ends at full scale with no pad at all |
| `d2d7f702` | er wollte versuchen | 100 | 0.056 | −1.2 dB | complete, CER 0 | CLEAN, TAIL-SUSPECT |
| `61945817` | ich denke es ist wichtig… | 100 | 0.050 | −0.4 dB | complete, CER 0 | CLEAN, TAIL-SUSPECT |
| `ebbcff9b` | that has happened | 100 | 0.018 | +4.2 dB | complete, CER 0 | CLEAN, TAIL-SUSPECT |

`54201b05` is the case the estate memory warns about from the other direction: whisper recovers the
content ("8,40 €") while the waveform shows the file stopping mid-blast. Transcription would have
passed it. The three TAIL-SUSPECT clips sit inside the range two healthy controls occupy, so on
bytes alone they cannot be called damaged — that is Tom's ear, not a measurement.

Note that `54201b05` and `3b00ae28` (class D) are the only two zero-pad clips, both `comp:leo`
composites created 2026-06-15 with `LastModified` the same second. They are a **different, earlier
fault than the 2026-08-03 event** — composite assembly, not the mass overwrite.

## Class C — dead pointers (4 of 12)

| clip | voice | s3_key | duration_ms | S3 today |
|---|---|---|---|---|
| `d11982f9` | en-GB-SoniaNeural | `pending/391EC5DD-…mp3` | NULL | **404** |
| `5c933d7f` | en-GB-SoniaNeural | `pending/12EC5326-…mp3` | NULL | **404** |
| `0ba69c9a` | en-GB-SoniaNeural | `pending/6214024B-…mp3` | NULL | **404** |
| `e31f5158` | en-GB-SoniaNeural | `pending/6B88094A-…mp3` | NULL | **404** |

All 12 such rows share the fingerprint: created `2026-08-03 14:42:25` in one transaction, an Azure
**English** voice inside a German course, `pending/` prefix, NULL duration and NULL size. Nothing
was ever uploaded. A learner reaching these gets a 404, not a wrong-voice clip. The wrong-voice
damage class is therefore **not represented by audio** in this course — it is represented by
missing audio.

## Class D — the silent-take candidate is not silent

`3b00ae28` "[atom] gibt es": 356 ms, **zero trailing pad**, edge amplitude **0.594**, step 105 dB.
Both models transcribe "gibt es". It is not a silent take — it is a clip guillotined at full
speech level. **SERVER-DAMAGED.**

## Class E — the sanctioned repair path works, and busts the cache correctly

| clip | ref handed to the player | s3_key | S3 LastModified | cache-control on the object | whisper |
|---|---|---|---|---|---|
| `01608106` | `01608106….**v2**` | `repair-candidates/29B5A8A7-…` | 2026-08-06 05:13 | `public, max-age=31536000, immutable` | CER 0, final word present |
| `05765f39` | `05765f39….**v2**` | `repair-candidates/7A0FD565-…` | 2026-08-06 05:18 | same | CER 0, final word present |
| `06e27f01` | `06e27f01….**v2**` | `repair-candidates/65873B2D-…` | 2026-08-06 05:03 | same | CER 0, final word present |

Each has one `course_audio_revisions` ledger row. New key, revision 2, `.v2` in the URL — no cache
anywhere holds those bytes under that name. This is the path working exactly as designed.

## The stale-cache problem is real — but it is downstream of the damage, not upstream

A 400-row random census of `deu_for_eng` (`scripts/served-bytes-trace/overwrite-census.py`):

- 396 of 399 present objects are still `audio_revision = 1` → **bare-uuid URL** → served
  `immutable, max-age=1 year`
- **355 of those 396 (90%) have an S3 `LastModified` more than an hour after the row's
  `created_at`**, the great majority clustered in **2026-08-03, 18:00–23:59 UTC**
- maximum skew: 4,770 hours (≈6.5 months)
- 1 of 400 sampled rows 404s

So something rewrote the bytes under ~90% of this course's objects **in place**, leaving
`audio_revision` at 1 and writing no ledger row. This independently reproduces the storage-metadata
finding in `docs/audio/tail-forensics-s3-provenance-2026-08-06.md` (95% of its `deu_for_eng` sample,
same window, outside the audited repair path).

The consequence is the opposite of a cause: because the URL never changed and the response is
`immutable` for a year, **any device that had already fetched one of these clips will keep serving
its own cached copy — and will keep doing so through any future fix that reuses the same id.** The
`AudioCache` IndexedDB layer keys by audio *id* and never inspects the URL at all
(`api/_utils/audioAccess.ts:88-100`), so an offline learner is stuck harder than a browser one.

That is the finding for the repair plan: **repairs must go through the revisioned path** (new key,
`audio_revision++`, ledger row, `.vN` ref) or they will not reach the devices that already have the
damaged bytes.

## French confirmation (5 clips)

| clip | role / voice | text | S3 LastModified vs created | pad ms | preCut vs body | whisper medium | verdict |
|---|---|---|---|---|---|---|---|
| `125aef9b` | known / xai_eve | guess what I said | same second | 100 | −2.2 dB | CER 0, complete | CLEAN, TAIL-SUSPECT |
| `4e8bb81d` | presentation / xai_eve | The French for: 'to try and breathe'… | same second | 100 | −2.9 dB | loses trailing `is` | AMBIGUOUS |
| `2abf5ea5` | target2 / xai_leo | cette fois | same second | 100 | +5.5 dB | CER 0, complete | CLEAN, TAIL-SUSPECT |
| `4d2ac1ee` | target1 / eve | Quatre. | **07-07 → 08-04**, mutated | 95 | +3.4 dB | "Qu'est-ce qu'il y a ?" in 362 ms | AMBIGUOUS — needs an ear |
| `df9cf856` | pod_take_g / 0p0rt7o1 | Très bien. Et qu'est-ce que vous souhaitez boire ? | same second | 45 | −7.5 dB | CER 0, complete | CLEAN |

Three of five were never mutated at all — `LastModified` equals `created_at` to the second — yet
the tail detector flagged them with the same "ends abruptly — 10 ms release" reason it gave the
German clips. **The French tail-flag queue (7,092 flagged of 31,654) carries a lot of noise**, in
keeping with the estate's history of audits whose flag count is not a work count. `4d2ac1ee` is the
one French clip worth an ear: it was overwritten on 2026-08-04, it is 362 ms long, and neither its
stored text nor its decode is credible at that length.

## Explicit gaps

- **When the words were lost is not recoverable.** The provenance work reports 88% of the objects
  the 2026-08-03 event touched are single-version in S3 with no delete marker. I did not re-verify
  that, and I did not fetch prior versions. So I can prove the bytes are damaged *today*; I cannot
  prove from S3 whether a given word was cut on 2026-08-03 or was missing at original render.
- **No French cross-check with a second ASR model.** The German verdicts required both models to
  agree; the five French verdicts rest on `ggml-medium` alone.
- **No real browser.** Popty's and the player's front ends are not served from this machine. I
  verified the API responses, the headers, the URL-construction code and the served bytes; I did
  not drive a browser or inspect a device's actual IndexedDB cache, so the *size* of the stale-copy
  population is inferred from the URL/header mechanism, not observed.
- **`CLEAN, TAIL-SUSPECT` is deliberately not a verdict of damage.** Five clips stop at
  approximately body level with complete content. Two of nine healthy controls do the same. Bytes
  cannot separate them; an ear can.
- **The wrong-voice/wrong-language damage class could not be measured as audio** in
  `deu_for_eng` — every such row points at a `pending/` key that was never uploaded.

## Raw measurements

All under `scripts/served-bytes-trace/` (gitignored):

- `sample.json`, `sample-fra.json`, `control-set.json` — exactly which clips, from which file, why
- `trace-raw.json`, `trace-raw-fra.json` — full per-clip layer walk (DB row, ledger, learner ref,
  S3 head, ffprobe, waveform, whisper)
- `step-flagged.json`, `step-control.json`, `step-fra.json` — onset-anchored tail metrics
- `crosscheck-small-model.json` — the second-model decode
- `overwrite-census-deu_for_eng.json` — the 400-row S3-vs-DB timestamp census
- `verdicts.json` — the per-clip verdict and its stated basis
- `trace.py`, `trace-fra.py`, `tail-step.py`, `overwrite-census.py`, `build-sample.py` — the code

No TTS was generated, nothing was deleted, no S3 object was written, no row was updated.
