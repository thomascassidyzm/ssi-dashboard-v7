# zho_for_eng — the 236 mislinked English prompts: state, verification, and what is left

**Kai commissioned a relink of 236 Chinese-course prompts that play an unrelated English sentence.
The number had already moved before this session started. This is the true state, checked by
listening to every one of the course's 668 known-side prompts as the live app serves them.**

2026-08-18. Zero TTS. Zero rows deleted. Zero audio bytes changed. No unlink-then-generate anywhere.

---

## Lead

| | |
|---|---|
| Actually broken when I picked this up | **30**, not 236 |
| Relinked in this session by me | **0** |
| Already relinked, at 15:52:55 UTC today, by the failed predecessor of this session | **206** |
| Of those 206, verified correct on live-served bytes | **206 / 206** |
| Left alone, listed for your decision | **30** |
| Rows I deleted | **0** |
| Audio rendered | **0** |
| Spend | **£0.00** |
| Verification | every one of the **668** known-side prompts fetched from `saysomethingin.app/api/audio/…` and transcribed |

**The 236 was real when it was written and it is not real now.** Between the finding (2026-08-17)
and this session, 206 of the 236 were repaired. That repair was applied by an earlier run of *this
same job* — surface job `zho-236-mislinked-prompts-relink`, started 15:17:47 UTC, status **failed**.
It wrote 206 `course_seeds` rows in a single transaction at **15:52:55.848 UTC** and then died
without verifying its own work, without reporting, and without a commit. This session is the retry.

So the first thing worth saying plainly: **206 learner-facing links were changed by a job that
never checked whether it had got them right.** I have now checked all 206, individually, by ear.
They are right. But nobody knew that until now.

---

## 1. What is broken, measured by listening — not by the database

The defect was originally found by listening, so a database text comparison is not sufficient
evidence. I fetched **all 668** zho_for_eng known-side prompts from the live public audio endpoint
(`https://saysomethingin.app/api/audio/<ref>`, the same URL the player builds) and transcribed each
with whisper `ggml-small`, English.

| result | count |
|---|---|
| clip speaks the seed's English | **637** |
| clip speaks the seed's English, transcript differs only in numeral spelling | **1** (seed 586, *"I want twenty boiled eggs"* → whisper wrote *"20"*) |
| clip speaks a completely unrelated English sentence | **30** |
| fetch failed / empty body | **0** |

668 fetched, 668 answered `200`, smallest body 10,656 bytes.

**The listening test and the database text comparator agree exactly — the same 30 rows, no more
and no fewer.** That is worth stating because it was not guaranteed: a slot whose text matches can
still hold audio saying something else. On this course's known side, it does not. 638 of 668 are
genuinely correct in the learner's ear.

---

## 2. The 30 that are still broken — every one, no sampling

All 30 are on the known (English) side of `course_seeds`. Column 3 is what a learner actually hears
today, transcribed from the live app.

| seed | the prompt the card shows | what the learner actually hears | clip |
|---|---|---|---|
| 351 | No he didn't want to leave me on my own. | I want to see the new movie that just came out | `d8706cae` |
| 358 | Your friend said that she couldn't reach the top. | I'm going to take a break for a few minutes | `7f5b5978` |
| 361 | He was quiet. | He said that he's too busy to help right now | `09d6e62e` |
| 373 | It was beautiful. | He said that he'll be there in 10 minutes | `269214d5` |
| 375 | No I didn't know what she was doing. | I want to make sure that everything is ready | `a98250e8` |
| 387 | No I didn't think she was right. | I need to get some rest before tomorrow | `92988765` |
| 389 | That person over there. | I want to know if you're okay | `98810d2c` |
| 396 | We don't need to stand until everybody else is ready. | I don't know what happened yesterday | `ef26d460` |
| 397 | Do we need to get ready soon? | He said that he needs to think about it | `0e9e4284` |
| 398 | We want to become more patient with our children. | She asked me to wait for her | `f1a3d6fd` |
| 401 | No it would be better to go straight home. | I need to prepare for my presentation | `014b7707` |
| 406 | No I'm sure it will be okay. | I'm going to read a book tonight | `1d29ad19` |
| 409 | No it doesn't matter what we do. | He said that he can help us tomorrow | `17c5be07` |
| 413 | We could fall if we go too close to the edge. | I want to try that new restaurant | `4576be40` |
| 452 | They didn't say what they wanted to do. | He doesn't want to give up | `e3feab63` |
| 468 | It's a big world. | I don't know how to thank you | `26d84df4` |
| 480 | Whatever he says it's not far ahead now. | I don't think that this is the right place | `a1670216` |
| 509 | I heard that you're going to pay for a new bed. | I want to feel better soon | `286b5a87` |
| 525 | To check if you've been able to finish. | She wants to adopt a pet | `234c86ad` |
| 526 | I'm finding it hard to believe that you can't guess. | I'm going to watch a movie later | `365f722b` |
| 535 | He made a promise that he wouldn't choose the wrong job. | I think that we should celebrate | `f292db1d` |
| 555 | And I'm too tired to fetch a new one. | I need to be more careful | `0d1797a3` |
| 571 | I'm not convinced that would be a very good idea. | I think that this is absolutely beautiful | `78038b54` |
| 577 | We've been waiting for the news from the hospital. | He said that he's excited about the trip | `4b4fa582` |
| 585 | I can see the mountains out of my bedroom window. | She's going to look for a new house | `60b68895` |
| 591 | She followed me down to the shops. | I want to contribute to the project | `55f45948` |
| 595 | I need to lie down in the garden. | I think that this deserves recognition | `48e844b0` |
| 597 | I suspect that he's heard a hundred stories about it. | She wants to volunteer at the hospital | `4f6a8c06` |
| 646 | You're doing something sir. | She wants to pursue her dreams | `4ee59bf0` |
| 647 | You speak it madam | I'm going to wear something comfortable | `6ccf771e` |

### Why I did not relink these 30

**There is no correct clip for any of them inside this course.** OBSERVED: for each of the 30 seed
texts, the count of `course_audio` rows in `zho_for_eng` with `role='known'` and matching normalised
text is **0** — in every voice, not just Sonia. There is nothing to point at.

A direct id update is only lawful when the target already exists. It does not. Per your rule that a
wrong relink is worse than a known-wrong link, and per the standing rule that I do not render
without approval, I left all 30 exactly as they are.

**There is a £0 option, and it needs your ruling, because it is structurally new.** Each of the 30
English sentences *does* exist in Azure Sonia — the voice this course's `voice_config` names for the
known side — **16 times each, in other courses**. Same words, same voice, already rendered, already
in S3. Pointing at one would cost nothing.

I did not do it, because it would be the estate's first cross-course known-side link. `course_code`
is part of a clip's identity here, and the English known side is per-course by construction —
`findSiblingCourseClip` exists in the code but is wired into almost nothing. A link that no
convergence job, no autolink trigger and no `/generate` pass expects to see is a link that something
may later "correct" back. That is your call, not mine.

**The two options, priced:**

| option | spend | risk |
|---|---|---|
| **A. Cross-course link** to an existing Azure Sonia clip of the identical sentence | **£0.00** | first of its kind on the known side; may be reverted by a future link/convergence pass |
| **B. Render 30 new Azure Sonia clips** into `zho_for_eng` | **1,128 characters → $0.0045 → ~£0.004** (Azure S0 at $4.00/1M neural chars) | none structurally; it is the ordinary path |

Option B costs less than half a penny. I still did not run it, because TTS needs your approval and
because £0.004 is not the reason to choose — the reason to choose is that B produces a clip the rest
of the machinery understands and A does not. **My recommendation is B.** Say the word and it is a
ten-minute job.

---

## 3. The 206 already applied — audited row by row

I did not write these. I inherited them and I treated them as unverified, because the job that wrote
them failed.

**Seeds touched** (206 of them, all in the range 353–668):
353, 355–357, 360, 362–363, 365, 367–370, 372, 374, 377, 379–382, 384–386, 391–394, 399, 403–405,
408, 410–411, 415–418, 420–423, 425, 427–430, 432–435, 437, 439–442, 444–447, 449, 451, 453–454,
456–459, 461, 463–466, 469–471, 473, 475–478, 481–483, 485, 487–490, 492–495, 497, 499–502, 504–507,
511–514, 516–519, 521, 523–524, 528–531, 533, 536–538, 540–543, 545, 547–550, 552–554, 557, 559–562,
564–567, 569, 572–574, 576, 578–579, 581, 583–584, 586, 588–590, 593, 596, 598, 600–603, 605,
607–610, 612–615, 617, 619–622, 624–627, 629, 631–633, 637–640, 642, 644–645, 649–652, 654, 656–659,
661–664, 666, 668.

| check | result |
|---|---|
| Link actually changed (new id ≠ old id) | 206 / 206 |
| New clip's text matches the seed's English | 206 / 206 |
| **New clip's audio, heard from the live app, speaks the seed's English** | **206 / 206** |
| `role` still `known` | 206 / 206 |
| `language` still `eng` | 206 / 206 |
| Old audio rows deleted | **0 / 206 — all 206 still present** |
| Cross-course links introduced | 0 |

Make-before-break was honoured by accident rather than by design: the predecessor pointed at clips
that already existed and deleted nothing.

### The one thing the predecessor did that you should know about: it changed the voice on 164 rows

| transition | rows |
|---|---|
| `azure_en-GB-SoniaNeural` → `gfzdpspr5fdp` (xAI clone) | **145** |
| `azure_en-GB-SoniaNeural` → `xai_gfzdpspr5fdp` (same clone, prefixed spelling) | **19** |
| `azure_en-GB-SoniaNeural` → `azure_en-GB-SoniaNeural` (voice preserved) | 42 |

The brief said *"correct recordings already exist in the same voice."* For 42 rows that was true.
For **164 it was not** — and I checked whether the predecessor had a choice: for each of those 164
seed texts, the number of Azure Sonia `known` clips in `zho_for_eng` with matching text is **0**.
There was no same-voice option at £0. Switching to the clone was the only non-spending repair
available, and the alternative was leaving 164 learners hearing an unrelated sentence. I judge that
the right trade, and I am reporting it rather than reversing it.

The consequence, stated honestly: **the known (English) side of this course is now four voices deep.**

| known-side voice | seed slots |
|---|---|
| `azure_en-GB-SoniaNeural` | 400 |
| `gfzdpspr5fdp` (xAI clone) | 205 |
| `en-GB-SoniaNeural` (bare spelling, same Azure voice) | 36 |
| `xai_gfzdpspr5fdp` | 27 |

Seeds 1–299 are 100% Sonia. From seed 300 on it is mixed. 68 of the clone links pre-date today.
`voice_config` names Sonia for the known side, so the estate and the config disagree. **This is a
pre-existing inconsistency that today's repair widened, not one it created — but it is now the
largest open question on this course, and it is not something I should decide.**

---

## 4. Fan-out — what else pointed at the clips involved

You asked for these numbers before anything moved. Counted across `course_seeds`, `course_legos` and
`course_practice_phrases`, all four audio-id columns each.

**Clips pointed *at* (the 206 correct clips):** every one is referenced 2–4 times; 445 references in
total; mean 2.16.

That sounds alarming and is not. The breakdown:

| where the references live | count | references whose own text differs from the seed's |
|---|---|---|
| `course_practice_phrases.known_audio_id` @ zho_for_eng | 231 | **0** |
| `course_seeds.known_audio_id` @ zho_for_eng | 206 | **0** |
| `course_legos.known_audio_id` @ zho_for_eng | 8 | **0** |

Every single reference is inside `zho_for_eng`, on the known side, and on a row whose own English
text normalises identically to the seed's. The fan-out is the same sentence legitimately appearing
as a seed prompt and as a practice phrase. **Nothing was changed that was not intended: the write
touched 206 `course_seeds` rows and nothing else.** Worst-case fan-out observed here is 4, not 108.

**Clips pointed *away from* (the 206 wrong clips):** 204 are now referenced by nothing at all; 2 are
still referenced once each, and correctly — `27afc1a5…` ("I want to know the truth.") by the phrase
on seed 71, and `570f696a…` ("I don't know what to wear") by the phrase on seed 393. In both cases
the phrase genuinely says that sentence. Those two links are right and must stay. **No row was
deleted; the 204 orphans are dormant, not gone.**

**The 30 still-broken clips:** fan-out **1** each — only the seed that is wrong. Repairing them
would touch nothing else.

---

## 5. How I verified live, and why no cache-bust was needed

**A relink cannot be defeated by the per-clip cache, because the clip id in the URL changes.**

- `buildAudioRef(id, revision)` returns `id` for revision ≤ 1 and `id.vN` above it —
  `packages/player-vue/src/providers/revisedAudioRefs.ts:65-67`, mirrored at
  `api/_utils/audioAccess.ts:129-131`. The **id** is the first component of the cache key.
- `api/audio/[audioId].ts:150` sets `Cache-Control: public, max-age=31536000, immutable`. That
  pins *one id* forever. It cannot pin a *different* id.
- A relink writes a **new uuid** into `course_seeds.known_audio_id`, so the player requests a URL it
  has never requested. The old bytes stay cached under the old id and are simply never asked for.

So `audio_revision` is the wrong tool here and I did not touch it. It exists for the *other* repair
shape — same id, new bytes — where the URL would otherwise not change. **Bumping it on a relink
would have forced a needless re-download of a clip the learner has never heard.** I checked the
revision anyway when building each URL: where a clip already carried revision 2, I requested
`<uuid>.v2`, exactly as the player would.

Two further read-path checks:

- `course_round_index`, the materialised view the round map reads, carries only
  `course_code, round_index, lego_id, seed_number, lego_index` — **no audio id**. No refresh needed;
  a relink is visible to the learner immediately.
- `api/courses/[code]/cycles.ts` and `bundle.ts` read `known_audio_id` from `course_seeds` live.

**What I actually did to verify:** 668 HTTPS GETs to the public production audio endpoint on
`saysomethingin.app`, each to the URL the player would build for that seed today, each body decoded
by whisper and compared to the card's English. Not a database read.

**GAP, named:** I did not drive the player UI itself for these seeds. `api/courses/[code]/cycles`
gates past the free seeds and every affected seed is ≥ 351, so a UI walk would have needed an
entitled account. The binding from seed row to learner audio is therefore OBSERVED in the code and
in the served bytes, but INFERRED for the last hop through the player. Given the URL is public and
byte-identical, I judge that hop safe; you should know it is the one link I did not exercise.

---

## 6. Where the wrong audio came from

OBSERVED. Between **2026-05-03 17:44 and 17:52 UTC** a batch was rendered into `zho_for_eng`
containing 237 English `known` clips in `azure_en-GB-SoniaNeural` (alongside 224 Chinese `target1`
clips and 1 `target2`, which are fine — 215 of the 223 currently-linked Chinese ones match their
seed text).

**Of those 237 English clips, only 2 have text that is any zho_for_eng seed's English.** The rest are
sentences like *"I want to participate in the competition"*, *"she's going to study for her exam
tonight"*, *"he doesn't want to interrupt you"* — fluent, generic, and not this course's content.

**235 of the original 236 wrong links pointed into that eight-minute batch** (the 236th dates from
2026-02-16). That is the origin, and it is a single event, not a drift.

INFERRED, and I could not close it: something in that run supplied invented English in place of each
seed's `known_text`, rendered it, and bound it to the seed's known slot. I did not identify which
code path, and I am not going to guess. **What matters operationally is that the batch is bounded and
identified: 237 clips, one course, eight minutes.** 33 of them are still referenced somewhere (30
of those are the wrong seed links in §2); the other **204 are now linked to nothing**. They are
dormant, not deleted, and they are the obvious cleanup once the 30 are settled — but deleting them
needs its own plan and its own approval, so I have not proposed one here.

---

## 7. Not in scope, but you should see it

The target side of this course is untouched and still carries the residue the 2026-08-17 sweep found:
**10 `target1` and 10 `target2` seed links whose clip text does not match the seed's Chinese.** I did
not listen to those and I did not touch them. They are a separate, smaller job.

---

## 8. What I did not do

- **No `unlink`, then no `generate`.** Not once. The published finding
  (`/d/5940e737`) is right that unlink-then-generate re-links the same wrong clip by text match;
  every change here is a direct id update, and I made none of them myself.
- **No TTS.** £0.00.
- **No deletion** of any `course_audio` row or S3 object.
- **No `audio_revision` bump** — see §5 for why it would have been wrong.
- **No writes at all by this session.** Everything I ran against the database was `SELECT`.

---

## 9. What I need from you

1. **Rule on the 30.** Option B — render 30 Azure Sonia clips into `zho_for_eng`, ~£0.004 — is my
   recommendation. Option A is free but structurally novel. Either way it is one short job.
2. **Rule on the known-side voice.** 232 of 668 English prompts are now the xAI clone and 436 are
   Sonia, against a `voice_config` that says Sonia. That is a bigger and more audible question than
   the 30, and it is not one I should answer alone.
