# Icelandic SC20-S007 — rephrased, re-rendered, clean. 2026-08-24

Tom ruled at 09:54Z: the Icelandic text was LLM-generated in the first place, so
where Azure genuinely cannot say a line, **rephrase it ourselves** rather than
keep paying for renders of a sentence the voice cannot produce. The English
known-side text does not move.

**Result: the line is rendered, on-cast and CLEAN, and `isl_for_eng`'s pod is
231/231 on both tracks with zero off-cast clips.**

---

## The line, and what was actually broken

| | |
|---|---|
| Sentence | `isl_for_eng:pod-0-unrecorded:SC20-S007`, speaker Learner |
| Known text | "Good luck with that!" — **unchanged** |
| Old target | "Gangi þér vel með það!" |
| New target | **"Vonandi gengur þetta vel!"** |

The failure was not diffuse. Read the decode of the last render
(`docs/pods/pod1-render-isl-a230-2026-08-24/isl-holdout-probe-2026-08-24.json`):

```
whisper-small   "Kon kið servél maðsás?"     sim 0.556, gate FAIL cer 0.524
whisper-medium  "Konkíðir vel með það."      sim 0.706, gate PASS cer 0.286
```

**"vel með það" comes back intact on both models. What collapses is "Gangi þér"** —
the palatal onset of *Gangi* running straight into *þér* — which both models hear
as "Kon kið" / "Konkíð". Two independent Azure renders failed the same way, on the
same three syllables. That is a phoneme-cluster the voice cannot say, not decoder
noise, and it is the specific thing the rephrase had to avoid.

## Why this phrasing

- **"Vonandi gengur þetta vel!"** — "hopefully that goes well" — is the ordinary
  spoken-Icelandic way of wishing someone luck with a specific thing, which is
  exactly the register of "Good luck with that!". Same meaning, same warmth,
  same length.
- It avoids the *Gangi þér* onset entirely.
- The stem it does use, **"gengur"**, is already proven on this voice in this pod:
  `SC09-S015` "Gengur þetta? Hafið þið pláss fyrir eftirrétt?" renders and verifies
  clean. The rephrase leans on evidence from the pod itself, not on a guess.
- It stays **distinct from `SC20-S005`**, "Ég óska þér góðs gengis með allt." /
  "I wish you good luck with everything." — three lines earlier in the same scene.
  A rephrase toward *óska þér góðs gengis* would have collided with it.

## What was done

1. **Text update**, in one transaction with a before-state assertion on both the
   exact old text and `target_audio_id IS NULL` — the same semantics as the
   canonical `PATCH /api/admin/pod-sentences/:id` route (set text, null the audio
   link, let phase 8 refill). It aborts on any drift.
2. **Migration check, measured not assumed.** `listening_pod_sentences` progress is
   filed under the slot, so a text change normally demands the content-change
   migration protocol. Here `learner_pod_state` holds **zero rows** for
   `isl_for_eng:pod-0-unrecorded` — the pod is `visibility='held'` and has never
   been served — so there is no progress to carry and nothing to migrate. Icelandic's
   live pod is `pod-0`, untouched by this.
3. **Render through phase 8, the only door.** `POST /generate-pods/isl_for_eng`
   with `{pods:["isl_for_eng:pod-0-unrecorded"], roles:["target"], sample_limit:1}` —
   one clip, sample mode. Tom authorised the spend in the 09:54Z ruling.

```
generated 1, reused 0, failed 0, quarantined 0
veracity: checked 1, passed 1
```

4. **Verified on the served bytes**, not on the render's own word:

```
node tools/pods/verify-pod-clips.cjs --pod=isl_for_eng:pod-0-unrecorded --since=20min
CLEAN  target Learner  voice=is-IS-GudrunNeural dur=1.79s db=-16.8 tail=0.31s sim=0.87
1 clip — 1 CLEAN, 0 ADVISORY, 0 REVIEW, 0 ERROR
```

`veracity_cer` on the stored row is **0.125** against a 0.30 threshold, on
whisper-**small** — the deployed model that could not read the old line at all
(0.524). Similarity 0.556 → 0.87.

## Listen

**New — "Vonandi gengur þetta vel!"**

https://watson-1.tail4968cb.ts.net/evidence/isl-sc20-s007-2026-08-24/SC20-S007-new.mp3

**Old, for comparison — "Gangi þér vel með það!"**, the line that failed twice.

https://watson-1.tail4968cb.ts.net/evidence/isl-sc20-s007-2026-08-24/SC20-S007-old.mp3

## Pod state after this — measured

| Check | Result |
|---|---|
| `pod-0-unrecorded` target linked | **231 / 231** |
| `pod-0-unrecorded` known linked | **231 / 231** |
| Off-cast, target track | **0** (`unlink-off-cast-pod-clips` dry-run: "231 on-cast, 0 OFF-CAST") |
| Off-cast, known track | **0** (same tool, `--track=known`) |
| HEAD / ffprobe, both tracks | 231/231 ok, 0 missing, 0 tiny, 0 unresolved |

### FLIP-READY

`isl_for_eng` meets the bar: 231/231 on both tracks, zero off-cast, no unresolved
slot. **It has NOT been flipped** — flipping is Tom's call by name, and this job
reports readiness only. `pod-0` remains live and playable.

Two linked lines still carry the advisory flag from the A-230 pass for Tom's ear —
`SC12-S010` and `SC18-S007` — right voice, real speech, low transcript score.
Advisory is not a veto and neither blocks the flip.

## Explicit gaps

- **The rephrase is our Icelandic, not a native speaker's sign-off.** It is
  ordinary, idiomatic and register-matched, and the voice now says it cleanly, but
  no Icelandic speaker has read it. If Tom wants a native check before launch, that
  is one line to check.
- **The old clip was not deleted.** Its `course_audio` row is archived and intact;
  only the pod link moved.
- **Nothing was done about the underlying gate disagreement** named in
  `isl-pod1-a230-2026-08-24.md` — phase 8's render gate is still hard-STT while the
  pod verifier is STT-advisory. That recommendation stands unactioned; this job
  routed around it by changing the text, which is what Tom ruled.
