# Humin (human) pod recording — state of the nation + test/run plan

> Written 2026-06-14 for Tom, ahead of the Tom + Aaron Welsh session.
> Purpose: a single read-when-you're-back summary of where the human pod-recording
> tool stands and the exact path to "final Welsh listening pods recorded + the
> system proven reusable for future community courses."
>
> Caveat: this was written from a cloud session with **repo access only** (no
> `.env`, no live Supabase/S3). So everything about the *code* is verified against
> the source; everything about *live DB content* is inferred and flagged as such.

---

## TL;DR

- **The tool is built, merged, and green.** 188 voice-engine unit tests pass. The
  one runtime landmine the integration plan flagged ("no test catches this, breaks
  at record-time") is **fixed**. Nobody has run a real take through it yet — that's
  the only thing left, and it's a *runtime/content* step, not a *code* step.
- **The Welsh content looks already loaded** in Supabase (north + south), based on
  the cast-sheet snapshots. One read-only command confirms it (below).
- **Objective is reachable in the two days:** cast → record → verify, per course.
- **One real code task** is worth doing first for reusability: the north/south
  single-`voice_id` collision (see Sharp Edges #1).

---

## What's built (verified against source)

The full flow you described exists and is wired end-to-end:

| Step | Where | Endpoint |
|------|-------|----------|
| Cast UI — "list the people, work out the parts, save" | `src/components/PodCastPanel.vue` in `src/views/PodsView.vue` (`/courses/:courseCode/pods`) | — |
| Solver ("jiggery-pokery") — split characters across the real voices, turn-alternation + gender honoured, auto-provision recorders by email | `services/voice-engine/pods-cast.cjs`, `tools/pod-voice-colour-n.cjs` | `POST /api/production/:courseCode/pods/cast/propose`, `PUT .../pods/cast` |
| Per-voice recording script (autocue queue + cue lines + scene headers + estimate) | `services/voice-engine/pods-plan.cjs` | `GET .../pods/recording-plan?voiceId=` |
| Dialogue autocue recording (cue lines greyed above the highlighted line) | `src/views/RecordRoom.vue` dialogue mode (`/record/:courseCode?podVoice=`) | — |
| Upload / registration (masters take, writes `course_audio` origin=human, re-points the sentence; re-records supersede) | `services/voice-engine/pods-registration.cjs` + upload seam | `POST .../recording/upload` (`mode:'pod'`) |
| Coverage (recorded/remaining per voice) | `services/voice-engine/pods-coverage.cjs` | `GET .../pods/coverage` |

**The fixed landmine:** the integration map (`docs/voice-engine/design/pods-integration-map.md` §2.A)
warned the server plan shape and the client renderer had drifted, so cue lines would
render empty and progress would always read 0 — and *no test catches it*. This is
resolved: `finalizeRecordingPlan()` (`pods-plan.cjs`) emits the canonical wire shape
(`cues[].targetText/knownText`, flattened `sceneNumber`/`sceneTitle`) and stamps
`recorded`/`audioId` per item; the router calls it. §2.B (coverage route mounted
*above* the pods router) is also correct in `services/production-api.cjs`.

**Test status:** `npx vitest run services/voice-engine` → 188 pass, 9 skipped. The
only failing suites in a bare environment are the two ffmpeg round-trip smoke tests,
which fail purely because `ffmpeg` isn't installed in that environment.

---

## What's NOT done

1. **No real take has gone through the live pipeline** — the actual test.
2. **Live DB content state is unconfirmed from here** (no creds). Strong evidence it
   *is* loaded: `docs/voice-engine/welsh-pods/cym_n_for_eng.md` and `cym_s_for_eng.md`
   say they were "generated 2026-06-11 from canon v2," that the colouring "is also
   written to `listening_pods.speakers` (provider: human)," and that "the source of
   truth is the `listening_pod_sentences` rows." A snapshot generated *from* those
   rows can't exist unless the rows exist. So the "generate Welsh scripts" step
   looks already done, north and south, 5-slot cast, 0 adjacent-turn voice clashes.

---

## Pre-flight (run these when back at the machine)

```bash
# 1. Confirm the Welsh content + see the recording gap (READ-ONLY, no spend):
node tools/pod-state-report.cjs cym_n_for_eng cym_s_for_eng
#    → per pod: sentence counts, what has target/known/explainer audio, what's missing.
#    This IS the recording manifest — how many lines each voice owes.

# 2. Confirm ffmpeg is on the API host (uploads master through it):
which ffmpeg

# 3. Confirm the stack is up (Camberley, via auto-merge): production-api :3470 + frontend.
```

---

## The run (working backward from "Welsh pods done")

Per course (`cym_n_for_eng`, then `cym_s_for_eng`):

1. **Cast** (~10 min): leader → `/courses/cym_n_for_eng/pods` → add the real people
   (Aran, Catrin + 2-3), set gender prefs + emails → **Work out the parts** →
   review → **Save cast**. Saving auto-grants each emailed person recorder access.
2. **Record** (the bulk): each cast member → `/record/cym_n_for_eng?podVoice=<theirVoiceId>`
   → dialogue autocue, whole queue in one sitting. Text is **editable live in the
   room** (community-tool requirement); an edit after a take supersedes the stale take.
3. **Verify**: coverage chips move as takes land → then listen back in the learning app.

---

## Sharp edges (so they don't surprise you mid-session)

1. **North/south single-`voice_id` collision — your specific risk, fix first.**
   `dashboard_users.voice_id` is a *single column*, but you have **two** Welsh courses
   with the **same cast** (Aran/Catrin record both). Per-course casting
   (`voice_config.podCast`) is fine; it's the **Record Room's slot resolution** via
   `dashboard_users.voice_id` that's fragile — a recorder assigned across two courses
   can show "Not yet assigned" in one room (documented in
   `services/voice-engine/README.md` "Known limitation"). This is the one real piece
   of *build* work standing between "works in a demo" and "reusable for every future
   community course." **Recommend hardening this before the session.**

2. **Coverage chips behind a tunnel.** The coverage fetch is unauthenticated → 401s
   through ngrok, so the chips silently hide (recording still works fine). Cosmetic
   but confusing. (`pods-integration-map.md` §4.)

3. **`scripts/welsh-pod-recording-pack.cjs` is not in git** (`scripts/` is gitignored)
   — the pack/snapshot regenerator lives only on your local machine. Fine for
   recording (text reads live from DB), but cloud agents can't regenerate packs until
   it's moved into `tools/`.

4. **ffmpeg must be present on the API host** — else uploads can't master.

---

## Where to spend the agent capacity (4 ProMax accounts)

The recording itself is human-bound (real voices, real time). Agents are best used
*around* it:

- **Per-course pre-flight + manifest**: one agent per cym course runs `pod-state-report`,
  cross-checks the cast sheet against the live rows, and produces a "voice X owes N
  lines across pods A-F" sheet so the humans walk in knowing the workload.
- **The north/south hardening** (Sharp Edge #1) — verify + fix.
- **Move `welsh-pod-recording-pack.cjs` into `tools/`** so it's version-controlled and
  cloud-runnable.
- **Reusability pass**: once Welsh proves the loop, write the generic "community course
  pod recording" runbook (this doc, minus the Welsh specifics) as the template.

---

## Recommended first two moves

1. Run the **pre-flight** block → get real numbers.
2. Greenlight the **north/south `voice_id` hardening** — it's the one defect between a
   working demo and a reusable system, and it directly bites your two-Welsh-course setup.

Everything else (the recording loop) is ready to drive the moment content is confirmed.
