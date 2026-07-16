# HUMIN (human recording) — where it actually stands, 2026-07-16

*Plain-language status for the founder. Sources verified directly: repo code, git history,
and a live read-only `psql` query against production Supabase (`.env.psql`) run today.
Companion: `aran-recording-instructions.md` (the ready-to-send brief).*

---

## Headline

**The tool works. Aran already used it once.** On 2026-06-15 — the day after the original
HUMIN status doc was written — 28 real Welsh audio takes were recorded, mastered, and are
live in the DB against `cym_n_for_eng` (Northern Welsh) pod-0. Then the session stopped and
nobody has recorded since. **`cym_s_for_eng` (Southern Welsh) has zero takes.**

So the honest state is: **proven, not broken, abandoned mid-way.** There is no code blocker.
The single thing between here and "Aran recording again today" is telling him to sit down and
carry on — which is what `aran-recording-instructions.md` does.

---

## What's built and confirmed working

Unchanged from the June assessment (`docs/voice-engine/HUMIN-POD-RECORDING-STATE-AND-TEST-PLAN.md`),
and now with real production evidence behind it rather than inference:

| Step | Where | Confirmed by |
|---|---|---|
| Cast — assign real people to voice slots | `src/components/PodCastPanel.vue`, `services/voice-engine/pods-cast.cjs` | `listening_pods.speakers` for `cym_n_for_eng:pod-0` holds a real 5-slot cast (HUMAN_F1/F2/F3/M1/M2 → Sarah, Anna, Assistant, Neighbour, Tourist, etc.) |
| Per-voice recording script | `services/voice-engine/pods-plan.cjs` | matches the committed snapshot `docs/voice-engine/welsh-pods/cym_n_for_eng.md` |
| Recording room, dialogue autocue | `src/views/RecordRoom.vue` | — |
| Upload → mastered audio, `course_audio` row `origin='human'` | `services/voice-engine/pods-registration.cjs` | **28 real rows exist**, `s3_key` under `mastered/`, real `duration_ms` (2.1–6.0s), voice IDs `human_aran_cym_n` (4 lines) and `human_aran_cym_n_2` (24 lines) — i.e. Aran covered two of the five cast slots himself in one sitting |
| Coverage tracking | `services/voice-engine/pods-coverage.cjs` | matches: `cym_n` 28/142 target audio, 26/142 known audio; `cym_s` 0/142 |

**Test suite**: `npx vitest run services/voice-engine` → 188 pass, 9 skipped, 2 fail — and the
2 failures are only the ffmpeg-round-trip smoke tests, because this dev machine has no
`ffmpeg` installed. Not a regression; identical to the June result.

**Timestamp evidence**: both `human_aran_cym_n` voice slots' takes cluster in one
2.5-hour window on 2026-06-15 (13:09–15:44 UTC). One sitting, then nothing since — 31 days
of no further activity, confirmed against `git log` (no HUMIN/Welsh-recording commits since
that date) and `WORKLIST.md` (no open Welsh recording item).

---

## What's NOT done

1. **`cym_n_for_eng` is 20% recorded (28/142 lines), `cym_s_for_eng` is 0%.** This is pure
   volume — human time in the recording room. No tooling or content work is needed to close
   it; someone (Aran + the cast) just needs to keep going. *Effort: recording time only —
   roughly 2.5 hours got 28 lines from one voice-slot pair, so full pod-0 coverage for one
   dialect (142 lines, 5 voices) is a small handful of sessions; both dialects double that.*

2. **`known_audio` (the English side) lags `target_audio` by 2 rows** (26 vs 28) for
   `cym_n_for_eng`. Minor, same-session gap — likely two lines whose English take didn't
   land. *Effort: near-zero; the recording room re-records supersede stale takes.*

3. **The Welsh script predates the ellipsis-pause convention.** `insert-ellipsis-seams.cjs`
   (the tool that inserts `'…'` breathing marks, founder ruling 2026-07-16) already has Welsh
   wired up — `cym` has both a syllable counter (`tools/lib/syllable-counters.cjs`) and
   coordinator-word list (`tools/insert-ellipsis-seams.cjs`) — but it has **never been run**
   against `cym_n_for_eng` or `cym_s_for_eng`; the committed snapshot has zero `'…'` marks.
   This is not a recording blocker (the founder ruling already gives human cast a direct
   instruction — "pause at the ellipsis" — for whenever marks do appear, and most of the
   existing pod-0 lines are already short, single-clause sentences split by full stops).
   *Effort if wanted before recording resumes: ~10 minutes to dry-run the tool against both
   Welsh courses at pod-0's C=8 ceiling and eyeball the diff — optional, not blocking.*

4. **Coverage chips are cosmetic-broken behind ngrok** (unauthenticated fetch 401s through
   a tunnel — `docs/voice-engine/HUMIN-POD-RECORDING-STATE-AND-TEST-PLAN.md` Sharp Edge #2).
   Recording itself still works; the on-screen progress counter just won't update reliably
   outside the production domain. *Effort: small, not blocking — only matters if recording
   happens through a dev tunnel rather than the real site.*

5. **`ffmpeg` presence on the live API host is unconfirmed from this session** (no infra
   access here) — it's required to master an uploaded take. The 28 real mastered files in the
   DB are themselves proof it was present and working on 2026-06-15; if nothing has changed
   on that host since, it's still fine. *Effort: one `which ffmpeg` check on the API host
   before a session, if paranoid.*

6. **`scripts/welsh-pod-recording-pack.cjs` (the snapshot regenerator) is gitignored**,
   so cloud agents can't regenerate the recording-pack `.md` snapshot; only the machine that
   already has it can. Not a blocker for recording (the room reads live from the DB, not the
   snapshot) but worth moving into `tools/` at some point for portability.

---

## Welsh-specific state (the part that matters for Aran)

- **Two Welsh courses exist and are cast, live in Supabase**: `cym_n_for_eng` (Northern/
  Gogledd) and `cym_s_for_eng` (Southern/De). Both are pod-0 only — 142 lines each, the same
  transactional-dialogue content (coffee shop, taxi, pharmacy, hotel check-in, etc.) as the
  reference `hrv_for_eng`/`gle_for_eng` build courses, just in Welsh.
- **Why human recording matters here specifically**: pod-1's own pipeline-readiness check
  (`docs/pods/pod1-pipeline-readiness.md`, on branch `docs/pod1-frame-decision-pack`,
  2026-07-16) found `cym_n_for_eng` / `cym_s_for_eng` are the **only** two of 64 course pairs
  with **zero target-language TTS voices available** (`0/0` in the Welsh voice pool config).
  There is no synthetic fallback for Welsh — human recording is the only path to Welsh pod
  audio at all, for pod-0 and for any future pod-1.
- **Pod-1 is not ready for Welsh, or anyone, yet** — separate from the recording pipeline:
  - The pod-1 content itself is mid-review. `docs/pods/pod1-content-stress-test.md`
    (2026-07-14) found the current 14-scene draft has a structural gap — zero instances of
    "repair" language ("sorry, I didn't catch that") in 196 sentences — and recommends a
    rewrite around conversational *moves* rather than situations.
  - `docs/pods/pod1-frame-decision-pack.md` (branch `docs/pod1-frame-decision-pack`,
    2026-07-16) puts this to the founder as a single A/B decision, **still awaiting a
    ruling** as of this writing.
  - Only `hrv_for_eng` has any pod-1 text drafted at all (180 of 196 rows; scene 14 missing).
    Welsh has **no pod-1 text**, so there is nothing to record yet regardless of the frame
    decision.
  - **Conclusion: pod-1 Welsh recording cannot start today — the content doesn't exist yet
    and won't until (a) the frame ruling lands and (b) Welsh translation of whichever pod-1
    canon is chosen.** This is a content/translation task, not a recording-pipeline task.

---

## Bottom line

**Can Aran start recording Welsh today? Yes, pod-0, right now — he's already proven it works.**
The single blocking gap is volume, not code: 114 of 142 Northern lines and all 142 Southern
lines still need a human voice. Pod-1 is genuinely not ready for anyone yet, in any language —
that's a content decision pending the founder, not a recording-pipeline gap.
