# zho_for_eng — the last 30 broken prompts are fixed, and the xAI voice is on a listen page

**Two jobs in one run: the repair, and the first live trial of Tom's rebuilt audio pipeline.
The repair is done — all 668 known-side prompts now play their own text. The pipeline mostly
behaves as advertised, and the run found two things that need saying.**

2026-08-19. Total spend **$0.036 (≈2.8p)**. Rows deleted: **0**. Bare unlinks: **0**.

**Listen page (blind A/B, phone-first):**
https://watson-1.tail4968cb.ts.net/evidence/zho-known-voice-trial-2026-08-19/index.html

---

## Lead

| | |
|---|---|
| Broken known-side prompts when I picked this up | **30** — re-verified live, the same 30 |
| Fixed and verified through the live audio endpoint | **30 / 30** |
| Known-side prompts in the course that now play their own text | **668 / 668** |
| Clips rendered | 60 course clips (two passes, see §3) + 72 trial clips |
| Rows deleted | **0** — the 30 wrong clips are orphaned, not removed |
| Silent windows | **0** — every link swap happened after the new clip was verified |
| Spend | **$0.036** — Azure $0.015, xAI $0.021 |
| Trial pairs on the listen page | **18**, blind, A/B randomised per pair |

---

## 1. The 30, re-verified before anything moved

The number had moved once before (236 → 30), so I re-derived it rather than trusting the
2026-08-18 report. Reading all 668 `course_seeds` known-side rows live and comparing each
against the text of the `course_audio` row it points at: **30 mismatches, the same 30 seeds,
no more and no fewer**. The voice census also matched the prior report exactly
(400 `azure_en-GB-SoniaNeural`, 205 `gfzdpspr5fdp`, 36 bare `en-GB-SoniaNeural`,
27 `xai_gfzdpspr5fdp`). Nothing had moved overnight.

Fan-out check before touching anything: each of the 30 wrong clips is referenced **exactly
once**, by its own seed. Nothing else in any course points at them. That is what made this
repair safe to do as a link swap.

## 2. How it was repaired — make before break, no silent window

`/generate` cannot do this job: `getAudioNeeds()` builds its candidate list from
`.is(audioCol, null)`, so a slot pointing at a *wrong* clip is never a candidate. The
alternative people reach for — null the link, then generate — is a bare unlink, and it is
forbidden. So:

1. **Make.** Render the correct English text in the course's configured voice
   (`en-GB-SoniaNeural` @ 0.95), through the pipeline's own chain: `tts-service` →
   phase8 `masterAudio` → veracity gate → S3 `mastered/<UUID>.mp3` → `POST /insert` on the
   live phase8 service (:3465). The seed still points at the old clip throughout.
2. **Verify.** Fetch each new clip **from the live audio endpoint the player builds**
   (`ssi-learning-app.vercel.app/api/audio/<id>`) and transcribe it. Not the local buffer,
   not the database's opinion of itself.
3. **Break.** One guarded `UPDATE` per seed, asserting the old link and the text are still
   what I read, then re-reading the row to confirm the swap took.
4. Old rows and old S3 objects are left exactly where they are.

Result: **30/30 swapped.** 28 transcribed exactly; the two "mismatches" are whisper
orthography, not audio defects — seed 406 `okay` → whisper wrote `OK`, seed 597
`a hundred` → whisper wrote `100`. Both were re-decoded with different whisper settings and
came back word-perfect. (The same numeral artefact hit seed 586 in the previous report.)

Final state, read live: **0 unlinked, 0 mismatched, 668/668 correct.**

No seed's `known_text` changed, so no presentation clip needed mirroring — the LEGO/
presentation layer is untouched by this repair.

---

## 3. GAP — I rendered the first pass against stale code, and had to do it twice

**This is the finding that matters most, and it is mine, not Tom's.**

The phase8 service on :3465 runs from the `-prod` checkout at `254a2f4d`, the tip of
`origin/main`. My working branch is **527 commits behind main**. `services/audio-veracity.cjs`
differs by 1,251 lines between the two — my copy is 685 lines, production's is 1,920. So my
first render pass exercised the **pre-fix** gate, a pre-fix mastering chain and a pre-fix
`tts-service`. It was not a trial of what Tom shipped.

I caught this when `createSampler` — added by `e9afee14` — was missing from the file I was
running. Everything below is from the **second pass, run against the production modules by
absolute path** out of the `-prod` tree (no file written there). The first pass's 29 clips
were superseded by the second pass; they were correct audio, they just weren't evidence.

**Anyone benchmarking the pipeline from a feature branch is benchmarking the wrong code.**
That is worth a rail: check `git rev-list --count HEAD..origin/main` before you conclude
anything about pipeline behaviour.

---

## 4. The veracity gate — Tom's three fixes are real, and I have a before/after

**Under the old gate, one of the 30 was refused three times and quarantined:**

> seed 406, `"No I'm sure it will be okay."`
> whisper decoded `"No, I'm sure it will be OK."`
> verdict `last_word_missing`, CER 0.0741 — **refused, re-rendered, refused, refused,
> quarantined, not published.**

The clip was perfect. `lastWordVerdict()` takes the expected last word (`okay`, 4 chars →
edit tolerance 1), scans the last three decoded words, and `levenshtein("okay","ok") = 2`.
An orthographic variant of the last word read as a missing last word. The decode is
deterministic — I reproduced it three times.

**Under the production gate, the exact same bytes PASS**, `reason: "ok"`, same CER. Verified
by running production's `checkAudioVeracity` against the quarantined file:

```
PROD verdict: {"pass":true,"checked":true,"reason":"ok","cer":0.0741,"decode":"No, I'm sure it will be OK."}
```

| | old gate | production gate |
|---|---|---|
| The 30 course clips | 29 published, **1 falsely refused and quarantined** | **30 published, 0 refusals** |
| The 36 trial clips | 34 pass, 2 fail (1 false, 1 real) | **36 pass, 0 refusals** |

**So: I saw exactly one false refusal in this run, it was against the old code, and Tom's fix
kills it.** Against production I saw **no refusal of any kind, correct or otherwise**.

**The gate did catch one genuinely bad render.** On the first trial pass, xAI rendering
`"No I'm sure it will be okay."` produced audio that decodes as **"No, I'm sure it will be
out hey."** — a real mispronunciation, and the gate was right to fail it. It did not recur on
re-render. One bad render in 72 xAI attempts.

---

## 5. Sampling — the cheap levels do take effect, but not at this run size

Wired exactly as `/generate` wires it (`veracity.startCourse(courseCode)` + the process-wide
graduated sampler), over the 30-clip course run:

```
[sampler] opening 10.0%, step 10 clean sampled clips per rung
stats   {"checked":3,"passed":3,"failed":0,"quarantined":0,"unchecked":0,"not_sampled":27}
sampler {"rate":0.1,"step":0,"clean_since_step":3,"step_clips":10,"sampled_this_course":3}
```

**3 of 30 checked, 27 skipped as `not_sampled`.** The sampler is genuinely live — the old
behaviour of paying a whisper decode on everything is gone, and a `not_sampled` clip is
recorded as such rather than being silently counted as passed.

But be precise about the claim: **it ran the full opening 10% and never got cheaper**, because
a rung costs 10 clean *sampled* clips, which at 10% is ~100 clips rendered. A 30-clip run gets
3 sampled clips and stays on rung 0 forever. So "gated runs are faster and cheaper" is true of
a course build and **not** true of a small repair run — the ladder needs scale to descend. That
is the design working as specified, not a defect; it just means this run is not evidence for
the cheap end of the ladder.

For the repair itself I did not rely on the sampler: every one of the 30 was verified at 100%
by fetching it back from the live endpoint and transcribing it.

---

## 6. GAP — `POST /insert` is a seventh in-place writer that does not move the cache key

Commit `254a2f4d` ("the six in-place writers now move the learner's cache key") fixed
`/regenerate-single`, `/regenerate-role`, `/regenerate-presentation`, `/regenerate-phrase`,
`/regenerate-lego`, and the recordist retake. **`/insert` is not on that list, and it has the
same defect.**

`/insert` upserts on `course_code,text_normalized,language,role,voice_id`. When that key is
already held it **overwrites `s3_key` in place and leaves `audio_revision` at 1**, writing no
`course_audio_revisions` history row. Measured on this run — the second pass hit the same
identity keys as the first:

```
same row id as first pass: 29    brand-new row: 1
rows now pointing at THIS pass's s3 key: 30 / 30
audio_revision: { '1': 30 }
course_audio_revisions history rows: 0
```

The learner ref is `<uuid>` unless `audio_revision > 1`, and `/api/audio/:id` serves
`max-age=31536000, immutable`. So a clip replaced through `/insert` keeps its address: a
learner who had already played it keeps the old bytes for a year in the HTTP cache and
indefinitely in IndexedDB.

**No learner was harmed here** — these rows were minutes old, nothing had cached them, and
the live fetch confirmed the new bytes were served (`x-vercel-cache: MISS`, byte sizes changed).
But `/insert` should be routed through `services/shared/audio-revision-swap.cjs` like the other
six. The main `/generate` render path (`merge-duplicates` upsert, phase8:2417) is worth the
same look.

---

## 7. Voice casting

Consistent across everything I exercised. Every one of the 30 course clips was rendered in the
configured known voice and stored as `azure_en-GB-SoniaNeural` — the canonical spelling, not
the bare form that has historically leaked in. All 36 trial clips came back in the intended
voice for their provider. `canonicalClipVoiceId` normalised identically on every `/insert`.

The pre-existing inconsistency the previous report flagged is **unchanged and still open**:
the known side of this course is four voices deep (400 Sonia / 205 xAI clone / 36 bare-spelled
Sonia / 27 prefixed clone), while `voice_config` names Sonia. This repair did not widen it —
all 30 replacements are Sonia — but it did not narrow it either. That is a decision, not a bug.

---

## 8. The xAI trial — what is on the page

18 lines from this course's known side, each rendered **twice**: once in the currently
configured Azure voice (`en-GB-SoniaNeural` @ 0.95) and once in the xAI clone already living
in this course's estate (`gfzdpspr5fdp`). Same text, same `masterAudio` chain, same run.

The set spans deliberately: 3 very short statements, 5 questions (short and long), 4 long
sentences up to 72 characters, 3 lines with no final punctuation, 2 vocatives (`sir`, `madam`),
3 with the proper noun *Chinese*, and one — *"a hundred"* — that both engines and whisper find
awkward.

**Nothing is wired in.** No S3 upload, no `course_audio` row, no link touched. The trial clips
are plain files served statically from the evidence folder. They cannot reach a learner.

The page is blind: which engine is A and which is B is randomised per pair, `key.json` is not
fetched until you tap reveal, and reveal only unlocks on a card once you have recorded a
verdict. Verdicts persist across reloads, and the bottom of the page gives a copyable summary.

**xAI is available and configured** — `XAI_API_KEY` is live, the voice renders, and the clone
is already carrying 232 known-side slots in this course today. Across the 18 pairs it is
consistently shorter than Azure — 43.8s of speech against Azure's 47.9s, a ratio of 0.91 in
both duration and bytes — which reads as a faster delivery. That is a measurement, not a
judgment. The judgment is yours, by ear.

---

## 9. Cost, in real money

| | characters | rate | cost |
|---|---|---|---|
| Azure — repair pass 1 (stale code, superseded) | 1,184 | $4/1M | $0.0047 |
| Azure — repair pass 2 (production code, shipped) | 1,128 | $4/1M | $0.0045 |
| Azure — trial pass 1 (stale, superseded) | 668 | $4/1M | $0.0027 |
| Azure — trial pass 2 (production, on the page) | 696 | $4/1M | $0.0028 |
| xAI — availability probe | 17 | $15/1M | $0.0003 |
| xAI — trial pass 1 (superseded) | 696 | $15/1M | $0.0104 |
| xAI — trial pass 2 (on the page) | 696 | $15/1M | $0.0104 |
| **Total** | **5,085** | | **$0.0358** |

**$0.036, about 2.8p.** Rates: Azure S0 $4/1M chars, xAI $15/1M chars (both already recorded
in this repo, `docs/course-optimization/audio-batch-fill-vs-regen-audit-2026-07-28.md`).
S3 PUTs (60) and whisper (local CPU) round to zero. Roughly $0.013 of that was the stale-code
false start in §3 — my error, and I would rather report it than fold it in.

---

## 10. Gaps, stated plainly

1. **The stale-checkout false start (§3).** Reported above, cost $0.013, no learner impact.
2. **`bundle.ts` could not be read end-to-end for these seeds.** It is the live route that
   serves seed known-audio, and it is entitlement-capped: an unauthenticated fetch returns
   `previewOnly` with 19 seeds, so seeds 351–647 are not in it. I closed the chain by reading
   the route (it emits `buildAudioRef(seedRow.known_audio_id, 'persistent', null)`, a bare
   uuid at revision 1) and verifying that exact id against the live `/api/audio` endpoint on
   both hosts. What I did **not** do is fetch one authenticated bundle and see the id in it.
3. **The evidence URL needs `/index.html`, not a trailing slash.** The brief said the trailing
   slash was required; for this server it is the opposite. `server.js` does no directory-index
   resolution — it `stat`s the path and 404s a directory. Measured:
   `/evidence/<slug>/index.html` → 200, `/evidence/<slug>/` → 404.
4. **Worker #227 under-delivered.** It was dispatched to do an independent live ear-check of
   the 30 and exited without producing its table. I did that verification myself, twice, so
   the deliverable has no hole — but it is not independent of me.
5. **The four-voice known side of this course is still open** (§7) and is not mine to decide.
6. **I used a bespoke script, and a standing rule adopted mid-run forbids exactly that.**
   Tom ruled at **10:50Z today** (via Watson) that dispatched workers must never write ad-hoc
   scripts touching production audio outside the reviewed render/relink paths, and that a
   worker hitting a case the reviewed tools do not cover must **stop and raise it as a fork**
   rather than improvise. My production-audio writes all completed by **10:41Z**, so they
   predate the ruling — but the method is the thing the ruling names, and I am not going to
   let that pass on a nine-minute technicality.

   The substance, so the fork can be judged: **the reviewed tool genuinely does not cover this
   case.** `audio-repair-core.cjs`'s propose/accept flow is the right shape — non-destructive,
   candidate-then-human-pass, versioned swap, nothing deleted — and I read it carefully before
   deciding against it. It cannot be used here because `accept()` deliberately excludes
   `text`/`text_normalized` from its patch and then **asserts they did not change**
   (`assert_text`). That is correct for its designed job, repairing a clip that says the right
   words badly. These 30 clips said the *wrong words*. Accepting a text-overridden candidate
   would have left `course_audio.text` holding the junk sentence while the bytes said something
   else — a row lying about its own identity key, which is worse than the defect.

   So the gap is real and worth closing: **there is no reviewed path that replaces a clip whose
   text is wrong.** `/generate` only sees NULL slots, `/regenerate-*` re-render the row's own
   (wrong) text, `/reuse-apply` is scoped by rounds not seeds, and repair/accept refuses a text
   change. Until one exists, this class of defect can only be fixed by improvising — which is
   precisely what the new rule forbids. That is the fork for Tom, not a defence of what I did.

   What I would say in mitigation, for the record and no further: nothing was deleted, nothing
   was bare-unlinked, every write was a guarded single-row `UPDATE` that re-asserted the prior
   value, and every clip was verified from the live endpoint before its link moved. The scripts
   are on the branch (`scripts/zho-trial/`, gitignored workspace) and can be read.

---

## What I did not do

No TTS beyond the 5,085 characters above. No row deleted. No S3 object deleted. No bare
unlink. No unlink-then-generate. No `known_text` edited. No trial clip wired into the course.
No live link touched by anything on the listen page.
