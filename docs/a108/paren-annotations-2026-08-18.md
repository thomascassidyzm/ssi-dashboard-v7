# Brackets out of the learner's ear — first tranche live

**18 Aug 2026.** Kai approved fixing the grammar annotations that sit inside learner-facing prompts and get **read aloud** by the voice.

---

## What is now live

Five rows in **ben_for_eng** (a released course) no longer speak grammar jargon. Four new clips, generated, whisper-verified, and confirmed through the learner app.

| Was heard | Now heard |
|---|---|
| "I know **(a person)**" | "I know" |
| "I know someone **(a person)**" | "I know someone" |
| "The Bangla for: 'I know **(a person)**', is:" | "The Bangla for: 'I know', is:" |
| "The Bangla for: 'I know someone **(a person)**', is:" | "The Bangla for: 'I know someone', is:" |

**Hear them** (tap to play):

- [I know](https://ssi-learning-app.vercel.app/api/audio/701ea8ee-e53f-4055-bac3-93f7a189bfec?f=.mp3)
- [I know someone](https://ssi-learning-app.vercel.app/api/audio/3ecb6b2d-b8bc-4a41-b29a-0ce732fe45b8?f=.mp3)
- [Presentation: "The Bangla for: 'I know', is:"](https://ssi-learning-app.vercel.app/api/audio/b91de214-8abe-43f4-b6c4-0a3e5a8fbe63?f=.mp3)
- [Presentation: "The Bangla for: 'I know someone', is:"](https://ssi-learning-app.vercel.app/api/audio/3356ef7f-95af-48dc-9943-fcb54ed6b7d2?f=.mp3)

**Cost: $0.003.** 168 characters of Azure neural TTS — 8 takes generated, 4 shipped. The earlier estimate was $0.63; that covered 1,356 rows, and this pass changed 5.

Rows changed: legos S0230L3, S0231L3, S0236L2; build phrases S0230L3, S0236L2. Presentation clips swapped in the same pass. `content_stamp` moved to 10:14:20Z, so learner caches invalidate.

---

## Why strip rather than merge, here

The tag was **already redundant**. Bengali splits *know*: চিনি (know a person) vs জানি (know a fact). Across 26 rows the course already separates them by **distinct English wording** — চিনি is only ever glossed "I know" / "I don't know" / "people I don't know", while জানি always gets a different English form ("I have no idea", "I know how to", "we don't know", "to find out"). That is your route (a), already attested in the course itself, not my intuition. So "(a person)" was adding nothing the English wasn't already carrying.

Corroboration: the sibling build phrases at those very legos — "I know him", "ready, I know someone" — were already clean and un-tagged.

---

## The measurement was wrong, by 3–5×

I calibrated first: pulled a known audible positive (`(dative)` clips in lav/nep/isl/lit) before counting anything.

| | Earlier report | Live today |
|---|---|---|
| Strippable annotations | ~1,356 | **6,804** |
| Rows whose clip speaks it | 1,619 | **4,706** |
| Collide if stripped | 276 | **974** |
| Courses affected | — | **48** |

Reduction chain, not a raw count: **6,804 raw → 4,706 linked to a clip that speaks the bracket → 3,688 genuinely audible.** The 1,018 removed are `component` rows, which the app never plays (`cycles.ts:153`, and a DB trigger `refuse_component_introduction` enforces it). Those are still **visible** as on-screen tiles — brackets on the screen, not in the ear.

Three mechanism findings worth keeping:

1. **The phase8 bracket guard gives zero protection here.** Of 2,931 legos that carry a bracket and have a clip, the clip speaks the bracket in **2,931** cases. Not one was stripped.
2. **`normalize_text` does not remove brackets** — "i know (a person)" is the clip's canonical identity, so a corrected clip can never be silently confused with the old one.
3. Only **3 of 48** affected courses are released (ben, kor, por). The other 45 are beta or draft — real, but not in a paying learner's ear today.

---

## Did scan-course already catch this? Partly.

**Yes:** Check 1 (`/\([^)]+\)/` in LEGO known_text), Check 2 (slashes), and Check 10 (ZUT conflicts) — which even carries the note that it "should run AFTER parentheticals and slashes are fixed, since stripping those can reveal hidden duplicates". That note is vindicated: 974 legos collide on strip.

**Three honest gaps:**

- It **never looks at `course_audio.text`**, so it cannot tell you the annotation is *spoken*. It reads as a cosmetic text issue when it is an audible one.
- Check 1 is scoped to **LEGO known_text only**. The 2,783 affected `course_practice_phrases` rows are outside it.
- It is a **manually-invoked, per-course** skill. Nothing schedules it, nothing runs it estate-wide — which is how 48 courses drifted.

Adding an audibility join and a phrase-table pass is a small change and matters more than this one sweep.

---

## Held back, deliberately — four things need your word

I did not guess on these. Each needs a language competence I don't have, or your ruling.

1. **ben S0297L3 "I don't know (a person)"** — stripping collides with S0085L2 "I don't know" → আমি **...** চিনি না. Same verb, but that one is the *split* form with the object in the middle. A learner prompted "I don't know" wouldn't know whether to leave the gap. Needs a Bengali reviewer, not me. → **Hold?**
2. **por S0330 "(subj.)"** — the known side is *nothing but* the annotation; the learner is shown "(subj.)" and must say "seja". Stripping leaves it empty. The course already says "that it be good" → "que seja bom" elsewhere, so I'd re-text it to "that it be" → "que seja", expanding both sides. Changes the target, so it needs Portuguese eyes. → **Approve?**
3. **kor_for_eng, 24 rows** — these tag Korean *particles* ("family (object)", "you all (topic)"). English has no distinct word for case, so route (a) is simply unavailable; route (b) merging is the only answer. Often the sister lego already contains the whole thing — at S0408, "family (object)" → 가족을 sits beside "a happy family" → 행복한 가족을, which already contains it. Needs a Korean reviewer. → **Commission?**
4. **The remaining 3,688 audible rows across 45 beta/draft courses.** At your "quality over throughput" rail this is a per-course campaign with a native check each, not a sweep. → **Go?**

---

## Gaps in this report

- **Two sub-workers (#24 audio recon, #26 adversarial census refutation) finished cleanly but their full reports were truncated on delivery and could not be retrieved through the API.** I did their critical work myself instead, so nothing here rests on them — but the independent refutation of my numbers did not reach me, and every figure above is therefore single-sourced to my own queries.
- The untaught-word checker misfires on non-Latin scripts. It did **not** bite this pass: every side I edited is English. It *will* bite fra_for_jpn, por_for_jpn and kor_for_hin, where the known side is Japanese or Hindi.
- I changed 5 of 6,804 rows. This is a first tranche and a proof of the method, not the job.
