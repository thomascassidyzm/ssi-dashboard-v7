# Pod-0 rollout, 11 Aug 2026 — canon text and one shared English cast

Decisions **A (canon)** and **B (shared cast)** are applied. Decision **C (proofreading)** is not
ruled and nothing was shipped that needs it. No audio was generated, none was deleted, nothing
was promoted onto a learner-facing slug.

Supporting detail: [text alignment](https://watson-1.tail4968cb.ts.net/d/ef53ec54) ·
[casting](https://watson-1.tail4968cb.ts.net/d/2394b91e) ·
[the decision-C boundary](https://watson-1.tail4968cb.ts.net/d/46ffafa4)

---

## Before / after

| | before | after |
|---|---|---|
| pods on Aran's 231-line, 22-scene canon | 4 | **43** |
| courses with pod-0 English on the shared cast | 16 | **56** |
| distinct English voices across pod-0 | 8 | **2** (+ human Welsh) |
| courses blocked on decision C | — | **23** (16 `eng_for_X` + 7 no-English-side) |
| target lines needing translation before anything can be promoted | — | **4,465** |

Independently re-queried from the live database after both workers finished, not taken from
their reports: 43 pods at 231 canon rows, 4,465 blank target lines, 2,178 English slots on the
shared cast, **0 off-cast**, 88 human-exempt slots.

## What moved

**39 courses aligned to canon** — 3 in place (`draft`), 36 onto `pod-0-unrecorded` clones.
9,240 of 9,240 English lines and all 9,240 speakers match canon. `spa_for_eng` was already
aligned and was verified as a no-op rather than churned.

**Live pods proven untouched, not asserted.** The ordered row set of all 40 live `pod-0`s was
sha256'd before the first write and again after the last. 37 of 40 identical; the 3 that differ
are exactly the 3 drafts that were meant to change. 10,791 referenced takes probed, 10,791 alive,
zero deletions. No `--force` anywhere.

**78 pods recast**, 1,571 slots moved to Olivia (`xai:bedd6226`) and Tom (`xai:gfzdpspr5fdp`),
23 cast from nothing, 584 already correct. The 16 `eng_for_X` courses needed no change — their
English target track was already on the shared pair.

**40 audio-pass requests queued** (27 new, 13 already pending and touched). Nothing generated.

## The gap that caused the Welsh outage, closed

`align-pod0-to-canonical.cjs` no longer defaults to the slug the player reads. `resolveSlug()`
resolves the destination per course from `courses.status` before anything is planned: `draft` in
place, `released` and `beta` cloned first. `beta` is inside the wall with `released` because the
same player serves it to real beta learners and an emptied pod is indistinguishable to them —
and because only 5 of 144 courses are `draft`, clone-first is the fleet default, not an edge
case. Archives are now named per pod rather than per course, so aligning a clone can no longer
overwrite the live pod's only way back.

## Judgment calls made, each reversible in a sentence

**Human voices exempt.** `cym_n` and `cym_s` are voiced by Aran and Catrin on both tracks,
including English. Characters whose English track is `provider: 'human'` were skipped rather than
have human recordings' cast discarded — 44 slots.

**76 gender corrections, and the ones deliberately not made.** 23 fills on `fin_for_eng`, the one
pod never cast, and 53 `Learner n→f`. `hin`'s male Barista, `tha`'s female Waiter and
`heb`/`ara_sy`/`cat`'s male Learner look like bugs and are documented text-evidence rulings from
the 2026-07-16 sweep that fixed a real learner complaint; a majority vote would have reverted
them. The Learner flip is gated on `tools/gendered-speech.cjs` because `gender` drives *both*
tracks — a female Learner over male-scripted Hindi is the July bug in mirror — and is held back
on 9 courses.

**The `hin`/`hye`/`swa` refusal.** Those three write "I *am* learning Hindi" where the other 37
write "I'm learning Danish", so the language-name detector missed the name in their own text and
refused rather than ship `[target language]` to a recorder. The regex was broadened to accept both
forms rather than hand-feed `--language-name` on three courses — hand-feeding is the guessing the
detector exists to prevent.

**One retired row per course, 40 total** — the old `SC15-S012` numbers drill, which the new canon
has no slot for. Blanked and parked, never deleted, audio intact, old text archived.

## Two numbers that change what you approve next

**Decision C is 4,465 lines, not 994.** The per-course `*-target-needing-translation.json` files
count only the 994 lines with salvageable prior text. The real debt is 3,511 brand-new canon
lines with nothing to work from plus 954 near-misses. Quoting 994 would undersize the ruling by
four and a half times.

**Decision B does not buy the 374.** `findExistingAudio`
(`services/phases/phase8-audio-v13.cjs:6110`) filters on `.eq('course_code', courseCode)` — a hard
SQL predicate — so the generator cannot see another course's clip even when text, language and
voice are identical. Priced live at steady state: **10,193 renders against 539 real identities,
18.9× duplication.** The *link* has no such constraint and the estate already exploits it: 1,904
cross-course English pointers are live right now, all 16 `eng_for_*` courses pointing at 119
clips owned by `zho_for_eng`. So the recommendation is not to approve 10,193 — it is to approve
~539 and point. One relaxed lookup stands between one approval and sixty-five, and that is
decision 8, not B.

## Where decision C is already overdue rather than pending

`cym_s_for_eng` carries 104 unproofread machine-drafted lines and `deu_at_for_eng` 155, and
nothing on the learner path reads `target_text_draft` — a draft with audio plays exactly like a
finished line. `cym_s` is `released`. Whatever Kai rules, these two are where it lands first, and
they are already serving.

## Still open

- 16 `eng_for_X`: English is free (zero drift, 137/137) but the aligner refuses inverted
  direction, and the 89 new lines need known-side text that does not exist. Blocked on C; no
  point writing the tool first.
- 7 no-English-side courses: decision 5, untouched.
- 3 non-pod-0 pods on English-side courses (`hrv:pod-1`, `spa:music`, `spa:travel-situations`) —
  one more run if wanted.
- `pod_voice_approvals` is `{}`, so no casting approval was invalidated: nothing was approved.
- Unrelated find: the `tur` voice pool is scrambled — `tur.f[0]` is a male Azure voice.
