# The recordist API — `/api/recording/*`

Built 2026-08-14 on branch `feat/recordist-api-2026-08-14` (off
`feat/one-recordist-surface-2026-08-14`). Backend for the ONE recordist surface
that replaces the five per-course human-recording surfaces.

Every response below is a real one, captured from the running service.

---

## The idea in one paragraph

Human recording exists for the languages we decide we have no TTS voice for.
That decision lives in exactly one place — the `language_recording_policy`
table — and nowhere else: no per-course flag, no per-pod toggle. A recordist's
queue is derived **by language**: every pod line in every course whose target
language is theirs, filtered by the gender that course's own cast names,
collapsed by clip identity so the same sentence appearing in three courses is
**one** recording. The three recordist routes have **no login**: the voice id in
the link IS the identity, and takes are attributed to it from the first tap.

---

## 1. `GET /api/recording/voice/:voiceId`

The queue. Already-recorded lines are skipped by default; `?includeRecorded=1`
lists them too.

```json
{
  "voiceId": "human_aran_cym_n",
  "displayName": "Aran",
  "language": "cym",
  "languageName": "Welsh",
  "gender": "m",
  "total": 153,
  "recorded": 71,
  "remaining": 82,
  "lines": [
    {
      "id": "cym_n_for_eng:pod-0:SC04-S003",
      "order": 22,
      "text": "Na, mae'n ddrwg gen i,… dw i'n brysur fory. Ond gawn ni siarad ddydd Sadwrn. Wela i chdi bryd hynny.",
      "knownText": "No, I'm sorry, I'm busy tomorrow. But let's talk on Saturday. See you then.",
      "speaker": "Friend",
      "courseCode": "cym_n_for_eng",
      "recorded": false,
      "clipUrl": null,
      "alsoFills": 0
    }
  ]
}
```

`alsoFills` is an addition to the agreed shape: how many other pod lines, in any
course of this language, this one recording also fills. It is the dedupe made
visible — nothing breaks if the frontend ignores it.

An alias spelling in the link resolves to the canonical voice, so links handed
out weeks ago keep working — `/voice/human_aran_cym_n_2`,
`/voice/human_aranv3_cym_n`, `/voice/human_aran_cym_s` and `/voice/Aran` all
return the same queue as `/voice/human_aran_cym_n`.

A voice no policy names is a 404:

```json
{"error":"No recording voice human_not_a_voice. A recording link is only live while language_recording_policy names that voice for a language."}
```

## 2. `POST /api/recording/voice/:voiceId/take`

`multipart/form-data` with the audio part plus `lineId` and `text`. A JSON body
`{lineId, text, audioData (base64), mimeType}` is accepted too, because that is
what every existing recorder client on the estate sends.

```json
{
  "ok": true,
  "audioId": "9dc8a8cb-c3c4-4fe1-a96b-9154a52eb448",
  "clipUrl": "/api/recording/voice/human_tom_zzz/line/zzz_test_for_eng:pod-0-s2/clip",
  "alsoFilled": 1,
  "rawKey": "raw/B35340E2-5FFA-4B31-9A2A-54D04E6D1265.webm"
}
```

- The raw upload is archived at `raw/{UUID}.{ext}` **before** any processing.
- The clip is written with the canonical `(language, text_normalized, voice_id)`
  identity, and the pod sentence's `target_audio_id` is re-pointed to it.
- `alsoFilled` — the same recording also filled that many duplicate lines in
  other courses of the language.
- A re-record never deletes anything: three consecutive re-records of one line
  left all three mastered objects and all three raw originals alive.
- `409` if the client's `text` disagrees with the stored line (stale queue).

## 3. `GET /api/recording/voice/:voiceId/line/:lineId/clip`

302 to a signed URL for what is **actually stored** — never a local blob.
`?json=1` returns `{audioId, s3Key, url, variant}` instead of redirecting.

### `?variant=raw` — the untouched original (added 2026-08-16, T-20)

`variant` is `processed` by default, so no existing caller changes. `raw` serves
the recordist's **untouched** take instead of the mastered clip, which is what
makes an A/B comparison possible at all: the T-20 clips were butchered by the
processing chain and nobody could hear it, because there was nothing to hear it
against.

There is **no `raw_key` column anywhere.** The pointer lives in the mastered
object's own S3 user metadata (`rawKey` at write time, handed back lowercased as
`rawkey`), so finding it costs a `HeadObject`. That HEAD is paid **lazily**, when
a human taps Compare — never per line on a queue load, because Catrin's queue is
276 lines and 276 HEADs would make the page unusable. `hasRaw` is deliberately
NOT in the queue payload for that reason.

```json
{"audioId":"9dc8a8cb-…","s3Key":"raw/B35340E2-5FFA-4B31-9A2A-54D04E6D1265.webm",
 "url":"https://…","variant":"raw"}
```

Every take made **before 2026-08-14** (commit `0d76bd5c`) has no original — that
includes all of Aran's existing Welsh clips. That is a permanent absence, and it
answers a machine-readable 404 so the UI can say so in words rather than show a
dead player:

```json
{"error":"No original was kept for this take — it was recorded before 2026-08-14, when raw originals started being retained.",
 "reason":"no_raw_retained","audioId":"09ba841f-…","variant":"raw"}
```

`reason` distinguishes the three failures a caller must not conflate:
`no_raw_retained` (no original kept), `no_take` (nothing recorded for this line
yet — also now returned by the processed variant), `mastered_missing` (the
processed object itself is gone from storage). An unknown variant is a `400`
with `reason: "bad_variant"` rather than a silent fallback to processed.

Live verification, 2026-08-16, on `human_tom_zzz` / `zzz_test_for_eng:pod-0-s2`:
both URLs resolve `200`, raw `1.408s` vs processed `1.400s` by `ffprobe` — the
head-loss the comparison exists to make visible.

## 4. `GET /api/recording/coverage`

```json
[
  {"language":"bre","languageName":"Breton","humanOnly":true,"total":0,"recorded":0,"uncast":0,"pct":0,"voices":[]},
  {"language":"cym","languageName":"Welsh","humanOnly":true,"total":428,"recorded":71,"uncast":0,"pct":16.6,
   "voices":[{"voiceId":"human_catrinlliar_cym_n","name":"Catrin","gender":"f","total":275,"recorded":0},
             {"voiceId":"human_aran_cym_n","name":"Aran","gender":"m","total":153,"recorded":71}]},
  {"language":"pdc","languageName":"Pennsylvania Dutch","humanOnly":true,"total":0,"recorded":0,"uncast":0,"pct":0,"voices":[]},
  {"language":"zzz","languageName":"Test Language","humanOnly":true,"total":25,"recorded":1,"uncast":0,"pct":4,
   "voices":[{"voiceId":"human_test_f_zzz","name":"Test Voice F","gender":"f","total":13,"recorded":0},
             {"voiceId":"human_tom_zzz","name":"Tom","gender":"m","total":12,"recorded":1}]}
]
```

`uncast` is a property of the language, not of one voice: pod speakers with no
gender in their course's cast are excluded from every queue and counted here,
where a human can see them and cast them. It is computed even for a language
with no cast at all.

## 5. `GET /api/recording/languages`, `PUT /api/recording/languages/:language`

Admin-authenticated (`Authorization: Bearer <supabase jwt>`; 401 without,
403 for a non-admin). GET lists every policy row; PUT patches one — any of
`{humanOnly, voices, notes}`, omitted fields left alone. An unspellable voice or
an unknown language is refused before it can mint a queue nobody can be
credited under:

```
{"error":"voices.m.voiceId: cannot canonicalise voice_id \"human\": a placeholder, not a voice"}
{"error":"cannot canonicalise language \"nope\": not in tools/sync/reference/language_codes.csv"}
```

---

## Where the code is

| Piece | File |
|---|---|
| HTTP surface | `services/voice-engine/recordist-router.cjs` |
| Queue derivation, coverage, propagation | `services/voice-engine/recordist-queue.cjs` |
| Tests | `services/voice-engine/recordist-queue.test.cjs` |
| Mount | `services/production-api.cjs` (`app.use('/api/recording', …)`) |

The take route contains **no uploader**. It adapts its body and calls the
existing `handleRecordingUpload` in `production-api.cjs`, so archive-before-
process, both take refusals, provenance and pod registration are one piece of
code with one set of tests across both surfaces.
