# One recordist surface — human recording, rebuilt

2026-08-14. Tom's brief, in his words: *"we can do better than this as an interface: can't we?"*,
*"let's think harder about what this needs, and what this does NOT need"*, *"all of this process
needs making more obvious, more natural"*, *"although we only need the PODS recorded by language,
not by course from now on"*, *"remember — better x simpler x cheaper"*.

The scope line, which decides everything else: *"we're improving the WHOLE human recording set of
processes for any languages WE DECIDE we don't have the TTS voices for"*. Per **language**, decided
by a human. Not per course, not per clip, and never inferred.

---

## The count

Measured by driving the deployed page on a phone-sized browser with no session.

| | Before | After |
|---|---|---|
| Surfaces | 5 | **1** |
| Screens before the first line | 4 | **2** |
| Taps from link to first line | 6, plus a typed email, a pasted code, and a trip out to the mail app | **2** |

Before, the link Aran holds does not even reach the recording code: `/record/:course` is
`requiresAuth`, so it lands on **"Sign In to Popty"**. Email, Send Login Code, leave for the mail
app, code, Sign In, Record Room, Start. Catrin — who records North *and* South — got an extra
course-picker screen on top, because the old surface was scoped per course.

After: tap the link → **"Hello Tom — 1 of 12 recorded"** → tap **Start** → the line.

## The finding that drove the design

Welsh is not one course. It is **four**: `cym_n_for_eng`, `cym_s_for_eng`, `cym_for_yor`,
`cym_anthem_for_jpn`. Every surface we had was scoped to one course and one pod, so a Welsh
recordist could only ever see a fraction of Welsh. That is the whole answer to *"why only 63 clips
for Aran — I'm pretty sure he's going to need to do more of them"*. He was right, and the cause was
structural.

| Queue | Total | Already recorded | Left to record |
|---|---|---|---|
| Aran (m) | 170 = 153 pod + 17 narration | 71 | **99** |
| Catrin (f) | 276 = 275 pod + 1 narration | 0 | **276** |
| Tom (`zzz` test) | 12 | 1 | 11 |

- **Aran keeps every take.** All 111 of his Welsh clips resolve across both spellings. The 40 that
  match no current pod line are untouched; he is asked to re-record nothing.
- **The canonical identity collapses 34 duplicate lines.** 462 Welsh pod sentences become 428
  recordings — lines the old per-course model would have made them read two or three times. One
  take now fills the same line in every course of the language: one S3 object, no re-render.

## Where the per-language decision lives

One table, `language_recording_policy`, and nowhere else: the `human_only` flag, the two voice
queues, and why in a human's words. `cym`, `bre`, `pdc` and `zzz` are on it.

**The flag is strictly additive to the existing hard floor.** `services/shared/human-voice-courses.cjs`
already names Welsh, Breton and Pennsylvania Dutch by owner ruling and says in terms that there is
no runtime bypass. The flag can *add* a human-only language; it can never remove one the floor
names. That keeps Tom's one toggle without weakening the guarantee — a stray toggle cannot
resurrect the ~23,442-clip Welsh render the 2026-08-13 recount proposed over already-recorded texts.

**What it gates:** with the flag on, that language's missing audio is not TTS-rendered — it waits
for a human, and the held items are *counted and surfaced*, never silently dropped. It deliberately
does not retro-delete existing TTS clips; that is a separate, destructive decision.

## The queue is content-type-agnostic

Tom's later ruling: the 18 failing LEGO-narration clips should ride the new queue rather than get a
bespoke path. The old flag lived on `listening_pod_sentences`, so it could only describe pod
dialogue — which is exactly why those 18 had been unqueueable.

The flag now lives on `course_audio`. Every clip of every type is a `course_audio` row, so one flag
reaches pod dialogue, narration, encouragement and instruction alike, and the next content type
needs no new mechanism. Routed by the **required voice**, never by a guess at who recorded the
original: the narration originals are stored under the shared untagged voice `human`, so authorship
is unknowable, but the estate's own casting says `cym_n` narration is Aran's and `cym_s` is
Catrin's. Flagging is non-destructive — all 18 keep their `s3_key` and keep serving.

## The QA gate: fixed, not removed

It was timing out at 14.3s against an 8s limit. Yesterday's migration had been applied; it just
didn't cover the whole cost. The remaining bottleneck was a join on the audio uuid alone, forcing
~18,800 random index probes per load. `course_code` was already on both sides; adding it makes it a
range scan. **156ms now, 143/143 courses loading, median 0.30s**, and the index footprint dropped
219MB.

Removing it was tempting — zero sign-offs estate-wide. But the gate **hard-blocks publishing and
fails closed**, so the timeout was making every promotion to learner-visible unevaluable. Zero
sign-offs isn't "nobody wants this"; it's a gate whose only sign-off surface has been throwing a
timeout.

## The bug that only a real browser could find

The surface was deployed, every endpoint answered 200, CORS headers were correct — and the page
still read **"Failed to fetch"**.

A public document at `popty.app` fetching watson-1 is refused by the browser *before* CORS is
consulted, as a public page reaching into the local address space. `curl` cannot see it: the
preflight and the GET both answer 200 with a correct `Access-Control-Allow-Origin`. Only the
running page knows.

It took three passes to actually kill:

1. Proxy `/api/recording/*` through popty.app so the call is same-origin — but a `comment` key in
   `vercel.json` (not in Vercel's schema) made it reject the whole config, and the only symptom was
   that the site silently stopped redeploying.
2. The same `apiBase()` had been hand-written in four files. Three were fixed; the fourth loaded the
   queue. Collapsed to one helper.
3. The app's environment bootstrap writes `api_base_url` into localStorage **for anonymous visitors
   too**, pointing at watson-1 — and the helper honoured that pin first, sending every recordist
   straight back into the blocked fetch. On popty.app the proxy now wins over the pin.

Lesson worth keeping: **for this surface, verify on the running page, not on the served bytes.**
Checking the served chunk said "fixed" twice while the page stayed broken.

## Things deliberately left alone

- No audio deleted, superseded or converged. The estate-wide `audio_clips` convergence backfill
  stays on its urgent hold — human decisions outrank canon.
- No TTS generated.
- Raw-take archival at `raw/{UUID}.{ext}` before processing is untouched. Make-before-break held
  under three consecutive re-records: all three mastered objects and all three raws still live.

## Open — one line each, cheap to overrule

- **`/health` and `/api/languages` still fail on the recordist page** — app-bootstrap calls, not the
  recording path, and the surface works regardless. Console noise, not a defect on the screen.
- **Catrin's queue is 276 against Aran's 99.** That is the existing casting, not a new choice — she
  simply has not started. Worth knowing before "your queue is live" goes out.
- **`bre` and `pdc` are human-only with no recordist cast**, because neither course has a podCast.
  They show honestly as such rather than being hidden.
- **Two voices per language** (one male, one female) kept as the shape, because Aran and Catrin
  already map onto it.
- **`bre_for_fra` lego S0089L03**: its French known line pointed at a Mandarin clip. It now reports
  no audio instead of reporting Mandarin as French. Refills on the next normal pass.
