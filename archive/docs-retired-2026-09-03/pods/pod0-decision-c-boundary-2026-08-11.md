# Pod-0 rollout: what moves today, what waits on decision C

**11 Aug 2026.** Written against the live database, not the survey. Decisions A (canon) and B
(shared English cast) are ruled. Decision C (proofreading policy) is not, and is with Kai.

This document exists to answer one question precisely, because guessing it wrong either stalls
60 courses or ships unproofread text to learners: **which work is blocked on C, and which only
looks like it is.**

---

## The boundary, in one sentence

**C gates the writing of target text, not the writing of English.** Aran's canon is authored
English, so aligning a pod to it is never machine translation and is never blocked. What is
blocked is filling the blank target slots the alignment leaves behind — and therefore promoting
any of those pods onto the learner-facing slug.

## Why that line falls where it does

`align-pod0-to-canonical.cjs` moves English, speakers and ordering only. It carries an existing
`target_text` forward **only** onto a slot whose English is byte-for-byte the line that target
was written against; every other slot is left with an empty `target_text`, which `pods-plan.cjs`
reads as "not recordable yet" rather than "recordable with the wrong words". No LLM is in that
path. The tool that *would* machine-translate is `pod-dialogue-generator --sync`, and the whole
reason the align tool exists is to not be that.

So the align step produces: canon English on 231 lines, a shrunken set of carried target lines,
and a per-course `*-target-needing-translation.json` worklist. That worklist is the input to
decision C, not an output of it.

The consequence that matters: because a typical course ends with **100-160 blank target lines**
(89 genuinely new canon lines, plus the 12-67 carried lines whose English drifted and whose old
translation was written against the drifted English), **no aligned pod can be promoted to
`pod-0` today.** Promotion is blocked on C. Nothing was promoted.

---

## The four tiers

| tier | pods | English side | can align to canon today | blocked on C |
|---|---|---|---|---|
| 1. `X_for_eng` on old text | **40** | `known_text` | **yes** — staged on a clone | filling 100-160 target lines per course; promotion |
| 2. `X_for_eng` already on canon | 3 | `known_text` | already done | `cym_s` 104 and `deu_at` 155 unproofread lines are **already live-ish** |
| 3. `eng_for_X` | 16 | `target_text` | **no** — two independent blocks | yes, on the known side |
| 4. no English side | 7 | neither | out of scope (decision 5) | yes, doubly |

### Tier 1 — 40 courses, moving today

`ara_eg ara ara_sy bul cat dan deu ell est eus fas fin fra_ca fra gle heb hin hrv hye isl ita jpn
kor lav lit nep nld nor pol por_br por ron spa spa_mx swa swe tha tur ukr zho` (all `_for_eng`).

3 are `draft` (`ara_sy`, `fin`, `fra_ca`) and align in place. The other 37 are `beta` or
`released` and auto-clone to `pod-0-unrecorded` first — the live pod is untouched. `spa_for_eng`
already carries an aligned clone from the earlier Welsh-precedent run.

### Tier 2 — 3 courses, already on canon, and one of them is a live problem

`cym_n_for_eng` and `cym_s_for_eng` were promoted onto `pod-0` earlier today (the Welsh outage
fix). `deu_at_for_eng` was aligned in place because it is `draft`.

**This tier is where decision C is already overdue rather than merely pending.** `cym_s` carries
104 unproofread machine-drafted lines and `deu_at` carries 155, and *nothing on the learner path
reads `target_text_draft`* — a draft with audio plays exactly like a finished line. `cym_s` is
`released`. Whatever Kai rules, these two are the courses it lands on first, and they are
already serving.

### Tier 3 — 16 `eng_for_X`, blocked twice over

English here is the *target* side, generator-written, and it has **zero drift**: 137/137 of the
carried lines already match canon. So decision A costs these courses nothing on the English side
— the 89 new lines are Aran's own authored English, free.

They are blocked anyway, for two separate reasons, and both have to clear:

1. **Tool gap.** `align-pod0-to-canonical.cjs` compares `known_text` against canon and refuses
   any course not ending `_for_eng`, deliberately: on these courses the carry-forward logic
   inverts and it would mis-carry every line. Inverted-direction support is unwritten work.
2. **Decision C.** The 89 new lines need *known*-side text in Bengali, Gujarati, Japanese,
   Korean, Panjabi, Sinhala, Tamil, Urdu and the rest. None of it exists. Producing it is fresh
   machine translation, so shipping it is exactly the thing C governs.

The first block is cheap to clear and the second is not, so there is no point clearing the first
until C is ruled.

### Tier 4 — 7 no-English-side pods

`cat_for_spa`, `eus_for_spa`, `deu_for_jpn`, `fra_for_jpn`, `ita_for_jpn`, `spa_for_jpn`,
`zho_for_jpn`. Canon is English; these hold no English column. Reaching them means writing the
Japanese or Spanish *known* side afresh first, then translating the target from it — decision 5,
unruled, and blocked on C on both sides. Untouched.

---

## What decision B actually buys, and what it does not

B is metadata and applies to every pod with an English side, regardless of tier — so all three
of tiers 1-3, 60 pods, move today on casting even where their text cannot.

**One correction to the plan's arithmetic.** The 374-clips-versus-5,837 figure assumed a shared
cast means a shared clip. It does not, yet: `findExistingAudio`
(`services/phases/phase8-audio-v13.cjs:6110`) filters on `.eq('course_code', courseCode)`, so the
generator cannot see another course's clip even when text, language and voice are identical. With
B ruled and pointer reuse (decision 8) unruled, the estate gets the shared *cast* and still pays
for ~5,837 renders. **374 is unlocked by decision 8, not by B.** That is the difference between
one generation approval and sixty-five, and it is a one-line ruling.

**Human voices are exempt.** `cym_n` and `cym_s` are voiced by Aran and Catrin on both tracks,
including the English one. Recasting those to TTS clones would discard human recordings' cast, so
every character whose English track is `provider: 'human'` is skipped. Flagging it rather than
assuming: if Welsh English is meant to become Olivia and Tom like everywhere else, say so and it
is a one-line change.

---

## The gap that caused the outage, closed

`align-pod0-to-canonical.cjs` no longer defaults to the slug the player reads. It resolves the
destination per course from `courses.status`: `draft` in place, `released` and `beta` cloned
first. `beta` sits inside the wall with `released` because the same player serves it to real beta
learners and an emptied pod is indistinguishable to them — and because only 5 of 144 courses are
`draft`, so clone-first is the fleet default, not an edge case.

`--force` still exists, prints what it is doing, and nothing in this rollout used it.
