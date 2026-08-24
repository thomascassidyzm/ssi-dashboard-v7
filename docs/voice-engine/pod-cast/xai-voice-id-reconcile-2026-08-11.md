# xAI voice ids, reconciled by id — 2026-08-11

**47 of the 48 "unverifiable" xAI pool entries resolved. Zero spend, no audio rendered. Every one of the 47 agrees with the gender list it sits in — no miscasts. The true residual is one voice: Tom's own clone.**

---

## What the earlier check got wrong

The pool gender audit could check every Azure entry against Azure's catalogue and caught a live miscast (`tur.f[0]` was a Male voice). It declared all 48 xAI entries UNVERIFIABLE, on the reasoning that our ids are opaque hex (`f331ee80`) and appear nowhere in xAI's `/v1/tts/voices` list.

That list is keyed by human names — `altair`, `ara`, `eve`. Comparing hex ids against it finds nothing, and proves nothing, which was Tom's correction.

xAI serves those ids one endpoint deeper:

```
GET https://api.x.ai/v1/tts/voices/{voice_id}
→ {"voice_id":"f331ee80","name":"Ahmet","language":"tr","gender":"male","age":"middle-aged"}
```

It is a GET. No audio, no spend.

## What resolved

| | count |
|---|---|
| xAI pool entries previously "unverifiable" | 48 |
| resolved by id, with a provider-stated gender | **47** |
| of those, agreeing with the pool list they sit in | **47** |
| miscast found | **0** |
| true residual | **1** |

Every language pool came back clean: ara, cat, dan, deu, eng, hin, ita, kor, nld, pol, spa, swe, tha, tur, zho. Each voice also carries a locale (`ca-ES`, `en-GB`, `sv-SE`, `pl-PL` …) and an age band, both now on record.

Sweeping wider than the 48 — every xAI id in play anywhere — 119 distinct ids, 118 known to the API, 116 with a stated gender.

## Where it is written

New columns on `voices` (`database/migrations/20260811_voices_provider_metadata.sql`):

- `gender` — `f`/`m`, **the provider's word**, `CHECK (gender IN ('f','m'))`. NULL means genuinely unknown, never "probably".
- `age` — the provider's band.
- `metadata_source` — `xai:GET /v1/tts/voices/{id}`.
- `metadata_checked_at` — when we asked.

118 xAI rows written (112 new, 6 updated); 116 carry a gender.

`tools/pod-voice-pool-gender-audit.cjs` now checks xAI entries against that column instead of shrugging at them. It reads **145 pool entries, 144 provider-verified, 0 mismatched, 1 with no provider-stated gender** — where before it could speak for only 97 of them.

Re-run any time, free:

```
node tools/xai-voice-metadata-sync.cjs           # dry run
node tools/xai-voice-metadata-sync.cjs --apply
node tools/pod-voice-pool-gender-audit.cjs
```

## The residual: one voice

`xai:gfzdpspr5fdp` — **"Tom"**, `eng.m[0]`. A 12-character id, not the 8-hex shape of the other 47: it is a **cloned** voice, and xAI 404s on it because clones are not in the catalogue the endpoint serves. It is also the pod-0 canon English male and the explainer voice.

Its gender is not actually in doubt — it is Tom's own voice, en-GB male, already carried in `voices` as such and hard-coded as `gender: 'm'` in the voicelab (`services/voicelab/params.cjs:26`). **Recommendation: record it as `gender='m'`, `metadata_source='human-known: Tom's own clone'` — one SQL line, no rendering. Awaiting the go-ahead; nothing has been assumed into the column.**

## Found on the way: three mislabelled voices in the catalogue file

`tools/pod-voices-xai.json` — which `tools/pod-voice-coverage.cjs` builds pools from and the voicelab UI labels by — disagreed with xAI's own statement on three voices:

| voice | file said | xAI says |
|---|---|---|
| `d18jlf6v` Hao (zh-CN) | m | **f** |
| `hqxr4yub` Luca (it) | m | **f** |
| `4ff93971bfdc` Aroon (th) | f | **m** |

Corrected to the provider's word. None of the three is in the live 48 pool entries, so **no cast moved and no rendered clip is affected**.

**One consequence for Tom.** `pod-voice-coverage.cjs` carries the premise "es and it natives are all-male", and tops Italian and Spanish female slots up from multilingual voices because of it. With Luca correctly female, that premise is false for Italian. Re-deriving Italian coverage would move casting for pods that already exist, so nothing has been re-run — flagging it as a decision, not acting on it.

## Files

- `database/migrations/20260811_voices_provider_metadata.sql` — the columns (applied)
- `tools/xai-voice-metadata-sync.cjs` + `.test.cjs` — resolve by id, write `voices` (13 tests)
- `tools/pod-voice-pool-gender-audit.cjs` + `.test.cjs` — now verifies xAI too (13 tests)
- `docs/voice-engine/pod-cast/xai-voice-metadata-applied-log.json` — per-id log of every answer

---

## Follow-up, same night: the residual is recorded (Tom's go-ahead)

`xai:gfzdpspr5fdp` now carries `gender='m'`, `age=NULL`, and
`metadata_source="human-known: Tom's own voice clone (en-GB male); xAI clone id, absent from the by-id catalogue"`,
written by `tools/tom-clone-voice-metadata.cjs --apply` — one UPDATE keyed on
`voice_id`, asserted against the row's before-state, no provider call, no
rendering, no listening pass. `age` stays NULL because nobody has stated one.

The source string is deliberately not shaped like the sync tool's
`xai:GET /v1/tts/voices/{id}`: this answer comes from provenance, not from the
provider, and the two must stay distinguishable in the column. So the pool
audit now reads `metadata_source` as well and reports the distinction instead
of quietly folding it into its "provider-verified" count:

```
46 pools, 145 entries: 144 provider-verified ok, 1 ok on human knowledge, 0 mismatched, 0 absent, 0 with no provider-stated gender
HUMAN-KNOWN eng.m[0]  Tom (xai:gfzdpspr5fdp) — human-known: Tom's own voice clone (en-GB male); …
```

Every entry in all 46 live pools now has a gender on record with its provenance
attached. The Italian-coverage decision above is untouched and still open.

- `tools/tom-clone-voice-metadata.cjs` + `.test.cjs` — the one-row write (6 tests)
- `docs/voice-engine/pod-cast/tom-clone-voice-metadata-applied-log.json` — before/patch/after
