# Welsh pods: the human recording process today

**2026-08-07.** A read-only scout of the live database and the running code. Nothing was
written, nothing generated, nothing repaired.

---

## The short answer

**Yes — the two-voice recast is real, at every layer.** Both Welsh courses are cast to
exactly two people, Aran and Catrin, and every single pod clip that exists today was
recorded by one of them. There is no third voice, no leftover machine voice, nothing
stray in the pod audio at all. That part is clean.

**But nobody has recorded anything since 15 June.** All 49 finished takes are Aran's, all
from that one day. Catrin has recorded nothing on either course. Nothing has moved in the
last 24 hours, or the last seven weeks.

**And there's a good reason nobody can get on with it.** All 213 lines of Welsh that were
machine-drafted yesterday are still marked as drafts. Not one has been proofread. The
recording room does show recorders a "draft" badge on those lines, so nobody is being
tricked — but between them Aran and Catrin are looking at 213 lines they've been told not
to trust. Until Aran reads them, roughly a third of the work is parked.

**How the process works now, in a sentence:** Aran and Catrin log in, land in a Record
Room that is theirs alone, pick the Dialogue tab, and read their lines off a teleprompter
that shows the surrounding conversation for context. Each take uploads straight into the
course as finished audio. There is no reviewer, no approval step, no queue for someone to
sign off — a take is live the moment it's saved, and the only correction is to record it
again.

---

## Who is recording, and what's left

Rebuilt today from the live database using the recording room's own arithmetic.

| | Course | Lines to read | Done | To go | Time left |
|---|---|---|---|---|---|
| **Aran** | North Welsh | 318 | **49** | 269 | ~32 min |
| **Aran** | South Welsh | 87 | 0 | 87 | ~11 min |
| **Catrin** | North Welsh | 144 | 0 | 144 | ~18 min |
| **Catrin** | South Welsh | 375 | 0 | 375 | ~44 min |

That's about **1 hour 45 minutes of finished audio** still to record between the two of
them — Aran roughly 43 minutes, Catrin roughly an hour. Real elapsed time will be several
times that, because reading takes retakes.

**One number moved since yesterday's report, and it isn't progress.** Yesterday said Aran
had 27 takes; today the same query says 49. Nobody recorded 22 more lines — the count now
correctly includes takes Aran made under a second recording identity of his own, which
yesterday's count skipped. The live figure of 49 is the right one. The last take on either
course is still dated 15 June.

---

## What's blocking them

**1. All 213 machine-drafted Welsh lines are still unproofread — Aran hasn't started.**
Every line drafted yesterday is still flagged as a draft: 109 on North, 104 on South.
*Recommendation: this is the one thing to nudge Aran about. It gates 88 of Catrin's 144
North lines and 89 of her 375 South lines, so his proofread unblocks her as much as him.*

**2. Seventeen Welsh rows you deliberately silenced on 26 July are playing machine Welsh
again.** An estate-wide audio relink on 6 August (15:48 UTC) saw those empty slots, found
the old Welsh TTS clips still sitting in the database, and helpfully put them back — the
exact same 32 clips, by their exact original ids. The sweep had no way of knowing the
emptiness was your decision. *Recommendation: re-cut those 17 links, and give the relink
tool a way to recognise a deliberately-empty slot, or the next sweep undoes it again.*

**3. Nothing else is blocking them.** Both recorders can reach their queues — verified in
the live user table and cast data. The queue-safety probe still passes on all four
queues: no recorder is served stale or unmarked text. The Welsh pods are correctly
hidden from learners until they're recorded, which was your call on 6 August.

**4. Still open, unchanged from yesterday: the guide lines are split the wrong way round.**
Aran guides North and Catrin guides South, which is what makes the four queues so lopsided
(318 vs 144, then 375 vs 87). *Recommendation: leave it. It balances out across the two
courses, and re-splitting now would move work between two people who are already behind.*

---

## One thing that isn't as documented

The brief said Welsh has no machine voice at all, so human recording is the only route.
That isn't quite true any more — the voice tool lists Welsh as "human preferred" with an
Azure Welsh voice available as a fallback, and there are legacy machine-Welsh clips
sitting in both courses. That's exactly how blocker 2 was able to happen. It doesn't
change anything about the plan — human is still the right and intended route for Welsh —
but "there is no Welsh TTS to fall back to" is no longer a safety net you can rely on.

---
---

# Appendix — the technical detail

## A. The pipeline, end to end

1. **Who.** `dashboard_users`: Catrin (`catrinlliar@gmail.com`) is role `recorder` holding
   `["cym_n_for_eng","cym_s_for_eng"]`; Aran (`aran@hey.com`) is role `admin`, all courses.
2. **Where they land.** Router guard (`src/router/index.js` ~728-755) confines role
   `recorder` to `/record/:courseCode`; one course → straight in, several → room picker.
3. **Which queue.** `src/views/RecordRoom.vue` has two modes. *Script* mode calls
   `GET /api/production/:courseCode/recording-script` (course legos/phrases, coverage-optimised
   by `tools/recording-optimizer/generate-recording-script.cjs`). *Dialogue* mode mounts
   `PodLongTakeStudio.vue`, which calls
   `GET /api/production/:courseCode/pods/recording-plan?voiceId=…`
   (`services/voice-engine/pods-router.cjs:475`). Dialogue mode is offered when
   `courses.voice_config.podCast` holds an entry matching the signed-in email — this is the
   Welsh pod lane. Per-course voice therefore resolves by **email match against the cast**,
   not by `dashboard_users.voice_id` (Catrin's column says `human_catrinlliar_cym_n`; she
   correctly gets `human_catrinlliar_cym_s` on the southern course).
4. **Plan construction.** `pods-plan.cjs` `buildRecordingPlan` + `finalizeRecordingPlan`.
   `recorded` = the sentence's `{kind}_audio_id` points at a `course_audio` row with
   `origin='human'` and a `voice_id` in the queue's accept set (its own id plus
   `voice_config.podCastAliases`). `estimatedMinutes` is the plan's own arithmetic — the
   figures in the table above are its `estimatedSeconds` summed over unrecorded items.
5. **Take → stored clip.** `POST /api/production/:courseCode/recording/upload`
   (`services/production-api.cjs:4393`). Pod-mode is detected from metadata
   (`podsRegistration.isPodModeUpload`), a fresh S3 object is always PUT (never over an
   existing key), then `commitPodRegistration` upserts a `course_audio` row
   (`origin='human'`, role per kind) and re-points `listening_pod_sentences.{target|known|
   explainer}_audio_id`. Re-record mints a new row and re-points; the old row and object
   are kept.
6. **After.** **No review or accept step exists on this lane.** The signed-record accept
   path in `services/api/audio-repair-routes.cjs:138` (`audio_id, revision, accepted_by,
   reason`) is the *audio repair* lane for fixing damaged existing clips — a different
   lane. `audio_clip_signoffs` holds **0 rows** estate-wide. `recording_provenance` holds
   142 rows estate-wide but **0** for either Welsh course.

## B. Voice layer — how it was counted

Normalisation: `lower(regexp_replace(voice_id,'^xai_',''))`, i.e. bare and `xai_`-prefixed
spellings of the same voice folded together before counting. This mattered: the English
side of both courses carries Tom's clone under both `gfzdpspr5fdp` (39 north / 24 south)
and `xai_gfzdpspr5fdp` (4 north / 3 south) — one voice, two spellings.

**Pod clips specifically** — every `course_audio` row reachable from a
`listening_pod_sentences.{target,known}_audio_id` on a `cym%` pod:

| origin | voice_id | clips |
|---|---|---|
| human | `human_aran_cym_n` | 27 |
| human | `human_aran_cym_n_2` | 22 |

Two ids, one person (`podCastAliases` on north maps `human_aran_cym_n_2` and
`human_aranv3_cym_n` → `human_aran_cym_n`; Catrin's maps `human_catrinv2_cym_n`).
**Zero TTS, zero legacy, zero third voices in the pod layer.** `cym_s_for_eng` has no pod
clips at all.

**Course-wide audio layer** (all roles, not just pods), normalised:

| course | language | origin | voice | clips |
|---|---|---|---|---|
| cym_n | cym | human | `legacy_import` | 12,750 |
| cym_n | eng | human | `legacy_import` | 6,311 |
| cym_n | eng | human | `human` (presentation) | 641 |
| cym_n | eng | human | `human_recording` | 74 |
| cym_n | eng | **tts** | `gfzdpspr5fdp` (clone) | 43 |
| cym_n | cym | human | `human_aran_cym_n_2` | 42 |
| cym_n | eng | human | `human_aran_cym_n` | 26 |
| cym_n | cym | **tts** | `legacy_import` | 18 |
| cym_n | cym | human | `human_aran_cym_n` | 8 |
| cym_s | cym | human | `legacy_import` | 13,370 |
| cym_s | eng | human | `legacy_import` | 6,601 |
| cym_s | eng | human | `human` (presentation) | 676 |
| cym_s | eng | human | `human_recording` | 74 |
| cym_s | eng | **tts** | `gfzdpspr5fdp` (clone) | 27 |
| cym_s | cym | **tts** | `legacy_import` | 18 |

(plus one `Aran` welcome clip per course). The bulk `legacy_import` layer is the historic
SSiW human recording estate, not machine audio.

## C. Blocker 2 — provenance of the relink

Commit `70c7c89b` (2026-07-26, your option-B ruling) nulled `target1/target2_audio_id` on
5 legos + 12 phrases across both Welsh courses so 32 legacy Welsh TTS clips would stop
playing; the clips themselves were left in place under the no-delete rule, with the
reversibility log at `579009cd`.

Today all 17 rows carry those exact original audio uuids again, `updated_at`
2026-08-06 15:48:03–15:49:11 UTC. Source identified: the A-22 estate-wide relink
(`e803a157`, "6,688-row relink", 56 courses). Its own applied logs record the writes —
`docs/a22-applied/cym_n_for_eng.json` (18 rows) and `cym_s_for_eng.json` (17 rows, 16 of
them `audio_origin: "tts"`), each stamped `"match": "strict", "candidates": 1`. The sweep
did exactly what it was designed to do: it found empty slots with one matching clip and
filled them. It had no signal that the emptiness was a ruling.

Note this does **not** remove those lines from the recording queue —
`generate-recording-script.cjs --gap` prunes against existing *human* audio
(`.eq('origin','human')`, line 370), not against a non-null pointer. So the work is still
queued; the harm is purely learner-facing playback.

## D. Draft state and the queue probe

`listening_pod_sentences.target_text_draft`: **109 of 232** on `cym_n_for_eng:pod-0-unrecorded`,
**104 of 232** on `cym_s_for_eng:pod-0-unrecorded` — 213 total, i.e. the entire 2026-08-06
drafting run, none cleared. Per queue: Aran north 21, Catrin north 88, Aran south 15,
Catrin south 89.

Drafts *are* served to recorders, badged: `finalizeRecordingPlan` sets `draft: true` on
target items and `cues[].draft`, and the Record Room renders the badge. Aran clears them
via `GET /api/production/:courseCode/pods/drafts` and the sentence PATCH, which sets
`target_text_draft = false` on edit (`pods-cast.cjs:313`).

`node tools/pods/verify-welsh-pod0-queue.cjs` — **all four queues `ok: true`**, zero
violations in every bucket (`englishNotCanonical`, `oldEnglish`, `welshMismatched`,
`emptyLine`, `draftServedUnmarked`, `archiveWelshMarkedDraft`). The 2026-08-06 acceptance
assertion still holds.

## E. Pods held off live

Commit `016f3854` (2026-08-06) moved all 464 Welsh pod sentences from `<course>:pod-0` to
`<course>:pod-0-unrecorded`. Learner-facing paths query the exact id `<course>:pod-0`, so
the pods are unreachable; the childless `pod-0` row remains as the "no pods yet"
placeholder. Confirmed live: both `pod-0` rows have 0 sentences, both
`pod-0-unrecorded` rows have 232.

## F. Method and gaps

- All figures are live reads via direct SQL (`~/.local/pg17/bin/psql` with `.env.psql`).
  Unlike the 2026-08-06 worker, psql was available on this box.
- The four queue figures were rebuilt by running the API's own
  `buildRecordingPlan`/`finalizeRecordingPlan` against live rows over `pg`
  (`scripts/welsh-scout-plans.cjs`, gitignored, read-only) — the same code the recording
  room is served by, not a re-implementation.
- **Gap:** no browser was driven and nobody was logged in as Aran or Catrin. Access is
  asserted from `dashboard_users`, the cast, and the router guard, not observed.
- **Gap:** the machine was under load (French audio shepherd + German rebuild), so no
  whisper, no TTS, no Playwright, no full-course scans were run. Audio was verified by
  database provenance only — no clip bytes were listened to or measured.
- **Gap:** the `cym_s_for_eng` A-22 applied log lists 17 rows against 12 distinct refs;
  one south lego (`S0207L01`) appears in that log but was not in the 2026-07-26
  before-state list, so the south relink may be one row wider than the original unlink.
  Not chased down — worth a look when the re-cut is done.
