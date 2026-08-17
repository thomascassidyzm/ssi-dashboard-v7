# The new chain, on every render path — audit, gaps closed, and a live proof

2026-08-17. Commission: *"refactor the entire phase 8 audio gen pipeline with the new chain … I want to
have the new whole pipeline including the whispr at sample frequency up and running and verified so that
when he generates audio the old way in Popty, the new improved process is triggered."*

**The headline: yes — the ordinary Popty path already had the full chain, and I proved it live. Five other
render paths did not, and now do.**

> **Updated 2026-08-17 23:10Z for two rulings from Tom.** (1) Pod explainers no longer exist as a content
> type, so the explainer gating is *dropped*, not hardened. (2) Whisper sampling is scoped **per course**,
> not per run — which turned out to be a real fix, not a relabel. Both are folded in below and live.

---

## 1. The answer Kai needs

**Yes. The ordinary Popty audio-generation path is safe to start big runs on.**

"Generate Missing Audio" in the dashboard → `POST /api/production/:courseCode/audio-pipeline/start` →
`POST /generate/:courseCode` on phase 8. That path already carried all three parts of the chain before I
touched anything, and I verified it end-to-end on the deployed service, not by reading the code.

**No caveat any more.** My earlier note here worried that a course late in a long run could sit at the
0.2% floor. Tom's 2026-08-17 ruling resolves it and inverts the concern: sampling is scoped **per course**,
every course opens at 10%, and the relaxation happens *within* a course as clean clips accumulate. Kai
generates one course at a time, so each of his runs opens at full rate and earns its way down. See §6.

---

## 2. The audit

Three things travel together. The **250ms end-of-speech tail pad** and the **trailing-artefact rule** both
live inside `masterAudio`, so any path that calls `masterAudio` gets both for free. The **whisper veracity
gate** needs an explicit `veracity.renderChecked()` wrap, and that is where the holes were.

Audited against `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod` at `fc88c72b` — verified byte-identical
to what the running service executes.

| Render path | Tail pad + artefact rule | Veracity gate | Verdict |
|---|---|---|---|
| `POST /generate/:courseCode` — **Kai's path** | yes | yes | already correct |
| `POST /regenerate-role/:courseCode` | yes | yes | already correct |
| `POST /generate-components/:courseCode` | yes | yes | already correct |
| `reuseRenderClip` → `POST /reuse-apply/:courseCode` | yes | yes | already correct |
| `generatePodAudio` → `POST /generate-pods/:courseCode` | yes | **no → wired** | **gap closed** |
| `POST /regenerate-single/:courseCode/:audioUuid` | yes | **no → wired** | **gap closed** (+ see §5) |
| `POST /regenerate-presentation/:courseCode/:legoId` | yes | **no → wired** | **gap closed** |
| `POST /regenerate-phrase/:courseCode/:phraseId` | yes | **no → wired** | **gap closed** |
| `POST /regenerate-lego/:courseCode/:legoId` | yes | **no → wired** | **gap closed** |
| `pod-explainer-composite.cjs` | composite mastered: yes | ungated | **DROPPED 2026-08-17** — pod explainers no longer exist as a content type, so this path is not worth hardening |
| `POST /insert` | n/a | n/a | **exempt** — registers a row for bytes the caller already put in S3 |
| `POST /prepare-presentations-scoped/:courseCode` | n/a | n/a | **exempt** — authors text, renders nothing |
| `POST /regenerate-presentations/:courseCode` | n/a | n/a | **exempt** — text only |
| `POST /splice-components/:courseCode` | n/a | n/a | **exempt** — slices already-gated clips |
| `services/audio-repair.cjs` | yes | calls `checkAudioVeracity` directly, 100%, behind a human `accept()` | **left alone** — a stricter posture than sampling, deliberately |
| `tools/generators/phase8-generate-audio.cjs`, `phase8-audio-from-baskets.cjs`, `welcome-service.cjs` | — | — | **dormant** — zero requirers in the prod tree |
| orchestrator `/api/voices/preview` | — | — | **exempt** — temp file, never persisted |

Every exemption is now written **into the code** at the handler, one sentence each, not just into this
report — an exemption that lives only in a document is how the next person "fixes" it.

The interesting exemption is `/splice-components`: it does write new bytes, but they are a word-boundary
slice of a clip that already passed the gate, and whisper on a one-word slice is decode variance, not
evidence.

---

## 3. What I wired, and the two judgement calls inside it

**Pods** (`generatePodAudio`, bulk). TTS + the xAI→Azure fallback + master lifted into one closure so a
failed check re-renders *for real* rather than re-mastering the same bad bytes; each attempt re-reads the
configured voice so one attempt's Azure fallback cannot pin every retry to Azure. `/generate-pods` calls
`veracity.startCourse()`, so pods bank trust in the run alongside `/generate`.

**The four repair routes** use a new `veracity.ALWAYS_SAMPLER` instead of the run sampler. Two reasons.
Graduated sampling exists to make *bulk* affordable; at the 0.2% floor a one-clip regenerate is checked
essentially never, which is exactly backwards on the path a human uses to *fix a clip they think is bad*.
And calling `startCourse()` there would reset the every-Nth counter and bank a bogus clean course — so one
person fixing a clip in ScriptViewer would silently corrupt the trust accounting of a bulk run in the same
process. `ALWAYS_SAMPLER` holds no state and touches none. Cost is one whisper decode per button press.

**Pod explainers — reverted, not shipped.** I had gated the explainer *pieces* (the composite plays each
target three times against a one-line text, so whisper against the composite would have been pure noise).
Tom's ruling on 2026-08-17 is that pod explainers no longer exist as a content type, so that work is on a
path that is going away. `services/pod-explainer-composite.cjs` is back to its pre-gating state and holds
zero veracity references. Dropped rather than hardened, which is the cheaper answer by some distance.

No new feature flags on the chain. The tail-repair switch was itself the bug once (2026-08-05), and a
default that must be set correctly in every unit file and cron leaks.

---

## 4. The live proof

Not a unit test and not a direct call to `masterAudio` — the actual route, against a real course, on the
restarted production service.

Course: `dan_for_eng`, which had 56 genuinely missing clips, all English known-side (so whisper is on home
ground). Filling them is useful work, not waste.

**Acceptance run — `POST /api/production/dan_for_eng/audio-pipeline/start`, Kai's exact route,
authenticated as a real dashboard admin, scoped with `{"options":{"limit":10}}`:**

```
status: completed | total 10, success 10, failed 0
veracity: {"checked":1,"passed":1,"failed":0,"rerendered":0,"quarantined":0,"unchecked":0,"not_sampled":7}
```

Service log:

```
[audio-veracity] ON — unprimed whisper round-trip, model ggml-small.bin, CER threshold 0.3.
  GRADUATED SAMPLING: 10% of the first course, 1% once that samples clean, relaxing to a 0.2% floor
[audio-veracity] dan_for_eng: sampling 10.0% of clips (0 clean course(s) banked this run)
[audio-veracity] dan_for_eng: veracity: 1 checked, 0 failed, 0 re-rendered, 0 quarantined,
  0 UNCHECKED, 7 not sampled (graduated sampling at 10.0%, 0 clean course(s) banked)
[audio-gate] dan_for_eng: 10 new clips, all clean
```

10 items = **8 rendered + 2 cross-course reuse** (their S3 objects are shared with `hye_for_eng` and
`swe_for_eng` — no render happened, so correctly no gate and no verdict). 8 render decisions → 1 checked +
7 not sampled at the every-10th rate. The arithmetic closes exactly.

**The verdict travels with the clip.** `course_audio.veracity_pass` is `t` on the sampled clip and NULL on
the not-sampled ones — the three-state rule, honestly "not checked" rather than a fabricated pass.

**Tail pad, measured on the rendered bytes** (end-of-speech to file end, 20ms RMS envelope, speech = within
35dB of peak):

| | n | mean | min | max |
|---|---|---|---|---|
| **new clips (this run)** | 8 | **270ms** | 261ms | 285ms |
| pre-chain clips, same course | 3 | 223ms | 167ms | 335ms |

The new clips cluster tightly around the 250ms pad (plus ~20ms measurement hop); the old ones scatter.
That consistency *is* the signature — it is what a deliberate pad looks like versus whatever the provider
happened to leave behind.

**Artefact rule in force on that path**: the running `services/audio-processor.cjs` carries the cluster
constants — `EOS_BODY_MS = 150`, `EOS_MAX_ARTEFACT_MS = 120`, `EOS_MIN_CLEAR_MS = 200` — inside the same
`trimToEndOfSpeech` the tail measurements prove ran.

**Repair path proved separately**, after the fix in §5:

```
POST /regenerate-single/dan_for_eng/d2bf0a6b-… → {"success":true, …}
course_audio: veracity_pass=t, veracity_checker=phase8-regenerate-single, veracity_attempts=1
```

`ALWAYS_SAMPLER` did what it says: one clip, checked.

**Every wired path proved live, not assumed.** After finding the §5 bug by exercising rather than reading,
I exercised all of them:

| Route | Result | `veracity_checker` on the clip |
|---|---|---|
| `/regenerate-single` | success | `phase8-regenerate-single`, pass=`t` |
| `/regenerate-phrase` | success | `phase8-regenerate-phrase`, pass=`t` |
| `/regenerate-lego` | success | `phase8-regenerate-lego`, pass=`t` |
| `/regenerate-presentation` | success | `phase8-regenerate-presentation`, pass=`t` |
| `/generate-pods` (`fra_ca_for_eng`, sample 2) | 2 generated | `phase8-generate-pods`, 1 checked / 1 not sampled |
| `/generate-pods` (`ara_sy_for_eng`, sample 2) | 2 generated | **1 checked, 1 RE-RENDERED** |

That last row is the best single piece of evidence in this job. `ara_sy_for_eng` published a clip with
`veracity_attempts = 3, veracity_pass = t`: the gate **failed the first two renders and the third passed**.
That is the pod closure doing exactly what it was restructured to do — a real re-render through TTS and the
provider fallback, not a re-master of the same bad bytes — and the defective renders were never published.
The A-109 text-approval gate also still fired alongside it (`blocked_unapproved_target: 1`).

The pod restructure was also exercised on its failure paths: on `fin_for_eng` the xAI→Azure fallback ran
*inside* the closure and the error propagated with its `[STAGE=…]` tag intact, and `cym_s_for_eng` was
correctly refused as a human-voice course.

**Nothing shipped was mutated or deleted.** `dan_for_eng` went from 19,235 existing / 56 missing to 19,248
existing / 43 missing — 13 new rows (3 shakedown + 10 acceptance), purely additive. The regenerate wrote a
**new** S3 key and left the old object in place. `TAIL_REPAIR_MODE=flag` held throughout; the log shows
tail suspects flagged with *"Clip shipped exactly as rendered"* and no mutation.

**Spend: ~26 short clips across every run — a fraction of a cent.** Well inside the
verification allowance, and no bulk render was performed.

---

## 5. A pre-existing bug, found by exercising rather than reading

`POST /regenerate-single/:courseCode/:audioUuid` answered `{"error":"storedVoiceId is not defined"}` — and
**always has**. Verified at `fc88c72b`, before any of my changes: the identifier is declared in
`/regenerate-role` and `/regenerate-presentation`, neither of which is in scope there, and this route's
`course_audio` update referenced it anyway.

So the route has never once returned success. That also resolves the loose end in the UI trace — no
dashboard code calls `/regenerate-single`, which is exactly what you would expect of a route that has never
worked.

The failure was at least safe: it threw at the DB write, so the old clip and its `s3_key` were untouched.
It still burned a paid render on every call. Fixed in one line, computed the way the two sibling routes
compute it, and then proved working.

I only found this because I insisted on *exercising* a newly-wired route instead of trusting that it parsed.

---

## 6. Sampling is now per COURSE — and that was a real fix, not a relabel

Tom's ruling, 2026-08-17: *"Long-run whisper sampling should be scoped PER COURSE, not per run — Kai
typically generates one course at a time, so the graduated drop to the 0.2% floor within a course is
explicitly fine and approved."*

Implementing it exposed that **the cheap end of the ladder had been unreachable in practice.** Trust was
banked at *course boundaries*: `cleanCourses` only incremented when one course ended and the next began. A
run containing exactly one course therefore banked nothing and stayed at the opening 10% from its first
clip to its last. One course per run is how the estate is actually driven — so every course paid full
opening rate forever, and the 1% / 0.5% / 0.2% rungs were dead code.

**Now the ladder is walked inside a single course**, one rung per 10 clean sampled clips
(`AUDIO_VERACITY_SAMPLE_STEP`), and every course starts fresh at the opening rate — trust does not cross a
course boundary in either direction. Measured on the deployed module:

| after this many clips of one course | sampling rate |
|---|---|
| 0 | 10% |
| 91 | 1% |
| 1,001 | 0.5% |
| 3,001 | 0.25% |
| 6,801 | 0.2% (floor) |

Over a 400,000-clip course that is **826 clips whisper-checked instead of 40,000** — a 48× reduction in ASR
cost — while never stopping looking, which is the property the floor exists to guarantee.

The safety properties are unchanged or stronger. A failure still snaps straight back to 10%, and now
forfeits **every** rung rather than one: the cheap rate was a claim that turned out not to hold, so it is
withdrawn in full. Selection stays deterministic every-Nth, so the sample is spread and reproducible. The
relax is logged as loudly as the snap-back, so a reader can see *why* the checked count stops climbing.

One detail worth stating because it is easy to get backwards: the every-Nth counter deliberately keeps
running across a relax. Resetting it there would spend a check confirming the very thing we just relaxed
on. It **is** reset on a snap-back, where the point is to start looking again immediately.

**Nothing here needs a decision from you.** The one judgement I had to make is the step size — the ruling
sets the scope, not the granularity. I used **10 clean sampled clips per rung**, which is the faithful
within-course analogue of the old "that course sampled clean" (the opening sample was always a *block* of
checks, never one clip). At the opening rate that means ~100 clips render clean before anything gets
cheaper. It is one env knob (`AUDIO_VERACITY_SAMPLE_STEP`) if your ear says otherwise.

Three cross-course tests encoded the old scope and were flipped deliberately, each carrying a note saying
so, plus a new test pinning the invariant the ruling turns on — every course starts fresh. 92 tests pass.

---

## 7. What failed

Nothing, in the end. Two things went wrong along the way and both were caught:

1. My first two dispatched workers were pointed at the shared working checkout, which sits on a stale
   branch that predates the entire chain — `audio-veracity.cjs` was 755 lines short there. Every
   "X does not call veracity" conclusion from that tree is a **false negative**. I caught it before either
   worker reported, re-pointed both at the prod checkout, and both redid their file reading. Worth
   remembering: the chain files in `ssi-dashboard-v7-clean` are not what runs.
2. The `storedVoiceId` bug in §5 — pre-existing, now fixed.
