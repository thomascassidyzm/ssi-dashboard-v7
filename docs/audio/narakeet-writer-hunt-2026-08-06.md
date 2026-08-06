# Narakeet writer hunt — deu_at_for_eng's 766 `narakeet_fritzi` clips (2026-08-06)

Read-only investigation. No writes were made anywhere. Verdict: **most likely Kai Saraceno**, working
uncommitted on `kai-stage`, rendering via a local copy of `services/tts-service.cjs` that had a
Narakeet provider added — before that provider ever reached a committed history. The exact
invoking script was never committed and could not be recovered; that is an explicit gap, named below.

## The rows

Queried `course_audio` directly (`DATABASE_URL` from `.env.psql`, read-only):

```
n=766, min(created_at)=2026-07-25T02:52:32.212Z, max(created_at)=2026-07-25T05:22:28.458Z
role: target1 (100%), origin: tts (100%), course_code: deu_at_for_eng (100%)
lego_id: NULL for all 766 rows, veracity_checked: 0
voice_id: narakeet_fritzi throughout
s3_key: mastered/{UUID}.mp3 — identical convention to the course's azure_de-AT-IngridNeural rows
text: Austrian-dialect German ("i wü", "gfühlt", "olles", "grod", "deitsch reden")
```

All 766 rows were written in one 2.5-hour window on 2026-07-25. `s3_key` follows exactly the same
`mastered/{UUID}.mp3` pattern as the course's legitimate `azure_de-AT-IngridNeural` target1 rows —
i.e. whatever wrote these went through the **same mastering/upload path** (`masterAudio`/
`generatePodAudio` in `services/phases/phase8-audio-v13.cjs`) as normal renders, not a bespoke
side-channel. Only the provider/voice differs.

## Neither catalogue, neither provider switch

- `tools/pod-voices-xai.json` and the Azure/ElevenLabs pod-voice files: no `narakeet` entry anywhere.
- `services/tts-service.cjs` **on this branch** (`feat/voicelab-bench-2026-08-06`, based on `main`):
  no `narakeet` case in the provider switch — confirmed by `grep -i narakeet services/tts-service.cjs`
  returning nothing before this investigation touched anything.
- `services/shared/clip-identity.cjs` already lists `narakeet` as a valid provider prefix in its
  closed set (`PROVIDERS`, `PROVIDER_ALIASES`) — landed 2026-08-06 in the clip-identity-canonical work
  this branch is based on, in response to exactly this finding (see
  `docs/architecture/AUDIO_PIPELINE_PROVIDERS_FIDELITY_LABS-2026-08-06.md` §"A fourth provider nobody
  listed", written earlier today on a sibling branch, not yet merged here — cited as the source of the
  brief, not as evidence I re-derived).

## `ssi-learning-app`

`grep -rniI narakeet` across `/home/tomcassidy/SSi/ssi-learning-app` (working tree, no git filter):
**zero hits.** Ruled out as a source.

## `git log -S"narakeet"` across all branches (this repo)

Seven commits touch the string "narakeet" anywhere in history, none earlier than 2026-07-28:

| commit | date | author | what |
|---|---|---|---|
| `3b312ba1` | 2026-07-28 09:44 +0100 | kai-saraceno | **adds `generateNarakeet()` + `case 'narakeet':`** to `services/tts-service.cjs` — see below |
| `ee9e7176` | 2026-07-28 09:21 +0100 | (kai-stage snapshot) | same addition, captured on `origin/kai-stage-uncommitted-2026-07-28` |
| `e3c684f1` | 2026-07-28 11:19 +0100 | (hand-merge onto main) | explicitly **declines** to port it: "Narakeet provider from kai's in-flight snapshot NOT ported (unaudited)" |
| `b9724c07`/`e7bdcb9c` | 2026-08-06 | (today, this investigation's source doc) | docs naming the 766 rows as unexplained |
| `664747ec`, `330b0b43` | 2026-08-06/08-03 | — | mention "narakeet" only in passing, in unrelated voice-census tables |

`3b312ba1`'s commit message: *"Preserves uncommitted work as history before reset. NOTE: tts-service.cjs
inline-SSML passthrough is a MERGE-HAZARD vs main's child-voice block... hand-merge onto main, never
overwrite the gates."* This is Kai capturing **local uncommitted changes** on `kai-stage` before a
reset — the code itself is not new as of 07-28, only its commit is. The docstring gives
`config.voiceId` example `'fritzi'` — the exact voice name in `narakeet_fritzi`.

`e3c684f1` (the hand-merge that ported Kai's other fixes onto `main`) **deliberately did not port**
the Narakeet provider, calling it "unaudited" — which is why `main`'s `tts-service.cjs` has never had
a `narakeet` case, consistent with today's `grep` finding nothing.

## The case for Kai, and its gap

**What's proven:**
1. The only code anywhere, on any branch, that can call the Narakeet API and write a clip through the
   normal mastering path is `generateNarakeet()`, authored by kai-saraceno, existing (uncommitted) on
   `kai-stage` before 2026-07-28.
2. It was never merged to `main` — confirmed absent from `main`/this branch and explicitly declined in
   `e3c684f1`.
3. `deu_at_for_eng` (Austrian German) is the exact course this code, this voice example (`fritzi`), and
   Kai's known work area (kai-stage, Austrian-dialect pod content — cf. `3b312ba1`'s "pod
   culture/dialogue" snapshot) all point at.
4. The rows' `mastered/{UUID}.mp3` convention matches the course's other legitimate TTS rows, meaning
   whoever wrote them called the same rendering pipeline the rest of the course uses — consistent with
   a real (if unauthorised) TTS provider function, not a manual DB insert.

**What's not proven — the explicit gap:** no committed script, tool, or log entry actually *invokes*
`generateNarakeet` with `voiceId: 'fritzi'` against `deu_at_for_eng`. The calling code — whatever ran
on 2026-07-25 between 02:52 and 05:22 UTC — was never committed anywhere I can reach: not on `main`,
not on `kai-stage`, `kai-stage-backup-2026-07-28`, or `kai-stage-uncommitted-2026-07-28`, and there is
no job/render log table in the DB (checked `build_jobs`, `content_audit_log`; neither carries a
per-clip provenance column or references these rows). `course_audio` itself has no
actor/session/job-id column, so the DB cannot corroborate authorship independent of the code trail.

**What would settle it:** ask Kai directly whether they ran a Narakeet render against `deu_at_for_eng`
on 2026-07-25, and whether they still have local shell history or an uncommitted script from that
session. Absent that, the code-provenance match above (same author, same file, same voice example
string, same course area, same missing-from-main status) is strong circumstantial evidence but not a
confirmed identification.

## What was ruled out

- **`ssi-learning-app`** — no mention of narakeet anywhere; it's a delivery-side repo with no TTS
  generation code at all.
- **Any script/tool in this repo's committed history** — `git log -S"narakeet"` across all branches
  returns no caller, only the provider-function addition and today's docs.
- **The estate's two voice catalogues** (`tools/pod-voices-xai.json` and Azure/ElevenLabs pod-voice
  files) — narakeet is declared in neither, so it is not a "forgot to route through the corridor"
  case; it was written by code that existed entirely outside the catalogue-driven routing this
  investigation's Job 1 hardens.
