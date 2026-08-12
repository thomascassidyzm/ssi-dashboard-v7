# The casting map stopped assuming a voice's gender

**2026-08-12 · Tom's ruling: fix the root premise, not the symptom.**

## What was wrong

`tools/pod-voice-coverage.cjs` — the map every pod cast resolves its voice pool
from — believed that Spanish and Italian native xAI voices are all male. The
belief was written twice as prose ("natives all-male → F from multilingual") and
was silently true in the data: gender came from the `gender` label shipped inside
`tools/pod-voices-xai.json`, and nobody had asked the provider.

So an Italian pod filled its female slots from *multilingual* voices — while a
native Italian female voice sat in the male list, unused.

The 2026-08-11 metadata reconciliation (commit `8f34de76`) proved it: xAI answers
`GET /v1/tts/voices/{id}` for our opaque ids, and `hqxr4yub` — **Luca**, it — is
**female**. (`d18jlf6v` Hao/zh is female too; `4ff93971bfdc` Aroon/th is male.)

## What changed

Gender is now **read**, not assumed, from `voices.gender` — the provider's own
word, filled by `tools/xai-voice-metadata-sync.cjs`.

- `loadVerifiedGenders()` reads the column once per process (SELECT only) and
  caches it; `resolveTargetPool(lang, { genders })` can also take a map directly.
- Every tier goes through **one** gender decision — xAI native, xAI multilingual,
  Azure, ElevenLabs. No tier can grow its own assumption.
- The top-up from multilingual now fires only when a gender list comes out
  **empty from the data**, discovered per resolve. There is no list of "all-male"
  languages anywhere in the file any more, and there must never be one again.
- Every pool reports `genderSource: 'voices.gender' | 'catalogue'`, so a caller
  that forgot to load the column can tell rather than quietly guessing. Without a
  database the JSON catalogues remain the fallback, and a voice the provider has
  stated nothing about (Tom's clone, which xAI 404s) keeps its catalogue label —
  NULL is never read as "probably".
- `tools/pod-recolour.cjs` — the casting flow — loads the column before resolving
  and prints where the gender came from.

## What deliberately did NOT change

**No casting moved.** This is a fix to how coverage is *computed*, and nothing
here writes: no `listening_pods.speakers`, no `courses.voice_config`, no
`app_config`, no pointer moves, no re-render. Existing clips and existing casts
are exactly as they were. The corrected logic takes effect the next time someone
runs a course through the normal PodLab casting/approval flow — never
retroactively.

Verified live on `ita_for_eng:pod-0`: a dry-run resolved the pool to **Luca (F) /
Enzo (M)** — native female, no multilingual top-up — and the pod's `speakers` and
`updated_at`, and the course's `voice_config`, were byte-identical afterwards.

## What the data now says

| language | female slots | note |
|---|---|---|
| ita | **Luca (native)**, then multilingual | the premise that this was impossible is gone |
| spa | multilingual | genuinely no native female — a fact from the column, not a hard-coded list |
| tha | multilingual | same; Aroon is male, per xAI |
| zho | Hao, Xia (native) | Hao was mislabelled male |

## Tests

`tools/pod-voice-coverage.test.cjs` (13 tests) proves:

- gender follows `voices.gender` even when the JSON catalogue disagrees, for
  Italian **and** for a language nobody hard-coded;
- loading touches the `voices` table only, and only ever selects — the stub client
  has no update/insert/upsert/delete to call;
- resolving does no database work at all;
- Luca is available as a native female Italian option, and no pool claims Italian
  has no native F;
- a language that genuinely has no native female still tops up — by data, not by
  list;
- voice objects keep exactly their old keys, so nothing downstream shifts.
