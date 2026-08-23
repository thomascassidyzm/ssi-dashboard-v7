# Pod-1 recast, re-derived to keep the audio that already exists (2026-08-23)

**Croatian: 184 clips → 47.** Estate re-render burden caused by the recast: **2,747 → 2,559 distinct clips.**

Tom, on job #133's queue: *"Can't be 184 clips for Croatian."* He was right, and the cause was a
real defect in the solver rather than a reporting error.

## What was wrong

Every connected component of the exchange graph has two equally collision-free orientations —
colour 0 female, or colour 0 male. The first pass knew they were free (its own comment said so)
and then chose between them on **script gender alone**: keep "Anna" female, keep "James" male,
with no term at all for what the clips already sound like. In Croatian that scored the
orientation exactly backwards against the delivered audio: the whole pod's two voices swapped,
all 184 clips queued, 92 of them the Learner flipped male-to-female.

## What changed

`tools/pods/pod1-percall-recast.cjs`, `orientComponent()` — a new pure, unit-tested function:

- each component's two orientations are scored by **delivered clips kept**, counted in
  **distinct clips** (a clip serving several slots is one asset and one re-render, so it votes
  once — counting line-links would over-value pooled English);
- the orientation keeping the most clips wins;
- **script gender is now a tiebreak only** — it decides when the two orientations keep the same
  number of clips, which includes a component with no delivered audio at all. That is legitimate
  because a character voiced against apparent gender is already an accepted cost;
- orientation is chosen **per component**, independently.

This is a strictly better objective on the *same feasible set*: both orientations of a
2-colouring are collision-free by construction. **Zero same-voice exchanges is untouched — and
asserted, not assumed:** a proposed cast that leaves any same-voice exchange is now a hard
blocker, and the estate was re-measured on live data after the write.

`pickPair()` also now ranks candidate voices by **distinct clips** rather than by rows. On the
real data this changed no pod's pick — recorded because it was checked, not because it moved.

## Result: Croatian

| | delivered clips kept | queued |
|---|---|---|
| orientation the first pass chose | 94 | 368 line-links / 184 hrv clips |
| orientation the audio chooses | **368** | **94 line-links / 47 hrv clips** |

The 47 that remain are genuine: Croatian's delivered audio contained 4 same-voice exchange pairs,
so those characters have to move for the pod to reach zero. That is the floor, not a compromise.

## Result: the estate

Only **one pod's cast changed** — `hrv_for_eng:pod-1`. Cost-aware orientation fired on all 66
components (65 decided by delivered clips, 1 by script gender for a pod with no audio), and in
every pod but Croatia the first pass's script-gender orientation happened to coincide with the
audio-optimal one. **The defect had exactly one victim, and Tom found it by eye.**

I also searched **every** feasible (female voice, male voice) pair against **both** orientations
for all 65 pods, read-only. No pod has a choice that keeps more clips than the one now applied.
The queue is at the floor this method can reach without re-opening a settled decision.

## Per-language, old → new

| language | clips old → new | recast old → new | drift | untouched divergence | courses |
|---|---|---|---|---|---|
| eng ⬅ | 578 → 531 | 548 → 497 | 34 | 0 | 56 |
| jpn | 458 → 458 | 339 → 339 | 10 | 109 | 7 |
| spa | 448 → 448 | 300 → 300 | 6 | 142 | 5 |
| deu | 240 → 240 | 92 → 92 | 6 | 142 | 3 |
| ita | 238 → 238 | 78 → 78 | 18 | 142 | 3 |
| zho | 227 → 227 | 73 → 73 | 12 | 142 | 3 |
| hin | 201 → 201 | 59 → 59 | 0 | 142 | 2 |
| fra | 193 → 193 | 73 → 73 | 11 | 109 | 3 |
| kor | 186 → 186 | 44 → 44 | 0 | 142 | 2 |
| ara | 185 → 185 | 44 → 44 | 0 | 141 | 2 |
| por | 145 → 145 | 28 → 28 | 8 | 109 | 2 |
| ben | 109 → 109 | 0 → 0 | 0 | 109 | 1 |
| guj | 109 → 109 | 0 → 0 | 0 | 109 | 1 |
| pan | 109 → 109 | 0 → 0 | 0 | 109 | 1 |
| tam | 109 → 109 | 0 → 0 | 0 | 109 | 1 |
| urd | 109 → 109 | 0 → 0 | 0 | 109 | 1 |
| cat | 100 → 100 | 76 → 76 | 24 | 0 | 2 |
| tha | 84 → 84 | 84 → 84 | 0 | 0 | 1 |
| fra_ca | 80 → 80 | 80 → 80 | 0 | 0 | 1 |
| pol | 63 → 63 | 20 → 20 | 43 | 0 | 1 |
| dan | 59 → 59 | 59 → 59 | 0 | 0 | 1 |
| tur | 59 → 59 | 59 → 59 | 0 | 0 | 1 |
| nld | 57 → 57 | 57 → 57 | 0 | 0 | 1 |
| hrv ⬅ | 184 → 47 | 184 → 47 | 0 | 0 | 1 |
| heb | 46 → 46 | 46 → 46 | 0 | 0 | 1 |
| spa_mx | 44 → 44 | 44 → 44 | 0 | 0 | 1 |
| swe | 44 → 44 | 44 → 44 | 0 | 0 | 1 |
| nor | 41 → 41 | 8 → 8 | 33 | 0 | 1 |
| por_br | 36 → 36 | 29 → 29 | 7 | 0 | 1 |
| ara_sy | 34 → 34 | 29 → 29 | 5 | 0 | 1 |
| sin | 33 → 33 | 0 → 0 | 0 | 33 | 1 |
| ara_eg | 30 → 30 | 24 → 24 | 6 | 0 | 1 |
| deu_at | 29 → 29 | 29 → 29 | 0 | 0 | 1 |
| eus | 28 → 28 | 28 → 28 | 0 | 0 | 2 |
| lav | 26 → 26 | 22 → 22 | 4 | 0 | 1 |
| lit | 26 → 26 | 22 → 22 | 4 | 0 | 1 |
| ron | 25 → 25 | 18 → 18 | 7 | 0 | 1 |
| bul | 18 → 18 | 18 → 18 | 0 | 0 | 1 |
| ell | 18 → 18 | 18 → 18 | 0 | 0 | 1 |
| isl | 18 → 18 | 18 → 18 | 0 | 0 | 1 |
| ukr | 18 → 18 | 11 → 11 | 7 | 0 | 1 |
| est | 14 → 14 | 14 → 14 | 0 | 0 | 1 |
| fas | 14 → 14 | 0 → 0 | 14 | 0 | 1 |
| gle | 14 → 14 | 14 → 14 | 0 | 0 | 1 |
| hye | 14 → 14 | 14 → 14 | 0 | 0 | 1 |
| nep | 14 → 14 | 0 → 0 | 14 | 0 | 1 |
| swa | 14 → 14 | 0 → 0 | 14 | 0 | 1 |

⬅ marks a language whose count changed. Everything else is byte-identical to the superseded
queue, which is kept alongside as
`docs/pods/pod1-recast-regen-queue-by-language-2026-08-23-superseded.json`.

Estate totals reconcile exactly: total clips 4,928 → 4,744 (−184); caused-by-recast
2,747 → 2,559 (−188); pre-existing drift 283 → 287 (+4); untouched divergence 1,898 unchanged.
The +4 is re-attribution, not new work: four pooled English clips that took their "recast" reason
from Croatia now take "drift" from another course that still needs them. −188 + 4 = −184.

## A finding that contradicts the brief I was given

The commission expected ben, guj, pan, tam, urd (109 clips each) and sin (33) to be the same
orientation defect as Croatia — an entire pod's voice swapped wholesale. **They are not.** All of
them are `clipsUntouchedDivergence`: the **known** track of the `eng_for_*` courses, which no
recast has touched. That track is one narrator reading every character's known line — there are no
known-side exchanges to fix — and `pod-recast.cjs` corrected 16 of those casts forward on
2026-08-07. The clips predate that correction, so cast and audio disagree; rewriting the cast from
the shipped audio would silently revert somebody else's fix.

That category is **1,898 of the 4,744 clips — 40% of the whole queue** — and it is not this job's
burden nor #133's. It is a live decision for Tom, and I have not taken it:

- **re-render** those 1,898 clips to match the corrected casts, or
- **revert** the 2026-08-07 cast correction where the shipped audio was right all along.

## The three categories, kept separate

| category | clips | whose burden |
|---|---|---|
| caused by the recast | 2,559 | this line of work — the price of zero same-voice exchanges |
| pre-existing drift | 287 | predates any recast; clip already disagreed with its own cast |
| untouched divergence | 1,898 | the `eng_for_*` known track, deliberately out of scope (see above) |
| **total distinct clips** | **4,744** | |

## Scope and exclusions

- **Welsh `cym_n_for_eng` excluded explicitly** — human-voiced by Aran and Catrin, casting settled
  by their recording queues (#131/#132). Both its pods are `held` and so were already outside the
  live filter; the exclusion is now written into the query so a visibility change cannot sweep it in.
- **`cym_s_for_eng:pod-0`** carries no human takes and no linked pod audio at all: 0 clips, 0
  relabels, nothing written.
- **`fin_for_eng:pod-0` still refuses to apply** — its target track has one ungendered human voice
  (`human_kai_fin`), so no male/female pair exists. Unchanged from #133, and correct: the tool
  refuses rather than inventing a voice.
- **No audio was generated.** No TTS, no phase-8 `/generate`, not one clip. The output is a queue.

## Safety

- **Make before break**: nothing deleted, nothing unlinked. Every flipped line keeps its existing
  clip serving and goes into the queue instead. Verified live after the write: **21,177 audio
  links intact** across the estate, 231/231 on both Croatian tracks.
- **Content-change migration protocol** (`docs/pods/pod-migration-protocol.md`): re-read, and it
  does not apply here. The protocol's risk is *content changing under a slot* — progress is filed
  under `${podId}:SC{scene}-S{sentence}`, so a learner is mis-credited when the sentence in a slot
  changes. This write changed no sentence, no slot, no text and no audio link: only which voice a
  *future* render will use. Nothing is owed.
- **Before-state assertions** on every row, transactional, `voice_config.voices` asserted
  byte-identical before commit.
- **Zero same-voice exchanges re-measured on LIVE data after the write: 65 pods, 65 at zero.**

## Audio-pass requests

All 63 per-course requests re-stamped from the live-derived queue file (never from the tool's own
arithmetic) by `tools/pods/pod1-restamp-audio-pass-requests.cjs`. Croatian's request moves from
368 clips to 94. No course fell to zero, so the "keep the row and stamp it zero" branch exists but
did not fire. One correction carried in passing: several `eng_for_*` requests previously named only
their English count in the reason text while their metadata held the larger figure — the reason
line now matches the metadata.
