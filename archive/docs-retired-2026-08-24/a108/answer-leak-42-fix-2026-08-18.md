# Answer-leak fix — the 42, and the 13 the detector could not see

**For Kai · 2026-08-18 · all writes applied and verified live**

## What the defect was

42 rows across four courses carried an **answer leak**: untranslated target-language
words sitting inside the known-side prompt the learner reads, with a `known_audio_id`
attached so a voice read the leak aloud. Same class as the `yaskot` family in
`ara_lb_for_eng`.

## Recovering the exact 42

The source report (https://watson-1.tail4968cb.ts.net/d/79973189) gave the arithmetic
but no row ids. The detector script itself survived in a scratch directory
(`.a108-gcov/leak.cjs`). Re-running its **exact** logic estate-wide via direct SQL
reproduced every published bucket:

| bucket | published | reproduced |
|---|---|---|
| `cat_for_spa` (discarded — shared Spanish/Catalan words) | 1,170 | 1,170 |
| `por_for_jpn` (already inside the morning's 503) | 99 | 99 |
| `bre_for_fra` (discarded — French borrowings) | 10 | 10 |
| `eng_for_spa` | 27 | 27 |
| `eus_for_spa` | 12 | 12 |
| `eng_for_jpn` | 2 | 2 |
| `spa_for_jpn` | 1 | 1 |
| `eng_for_ita` (discarded — coincidental overlap) | 1 | 1 |

`27 + 12 + 2 + 1 = 42`. That is the recovery, not a re-derivation.

**My raw total was 2,260, not 1,322.** The original sweep timed out on courses it
never reached — `deu_ch_for_eng` (308), `eng_template` (273), `afr_for_eng` (132),
`deu_at_for_eng` (128), `gle_for_eng` (23), `lmo_for_eng` (22) and others. Those
~938 raw hits are **unexamined**, not clean. Sized here, not fixed.

## The 13 the two-word detector structurally cannot see

The detector requires a **two-word run** shared between prompt and answer. Single-word
leaks are invisible to it. In `eng_for_spa` alone I found 90 additional single-word
candidates. Triaged by hand:

- `idea` (68) + `ideas` (9) — genuine Spanish/English cognates. **False positives.**
- `slowly` (5), `easy` (4), `again` (3), `different` (1), `when` (1) — **13 real leaks**,
  all with audio, in the very seeds the 27 already touched (S55, S61, S64).

Leaving them would have fixed `es easy doing interesting things` at S64 while leaving
`es easy aprender inglés hoy` at S64 broken. I fixed them. **eng_for_spa total: 40.**

## What was authored, and against what

Every replacement was taken from the course's **own** established mapping, never invented:

| leaked English | course's own Spanish | taught at |
|---|---|---|
| give you | `darte` | S54L1 `dar → give` |
| waking up | `despertarme` | S55L2 |
| when you speak | `cuando hablas` | S55 build |
| a few words | `algunas palabras` | S56L2 |
| remember how | `recordar cómo` | S6 |
| at the same time | `al mismo tiempo` | S62 build |
| enough words | `suficientes palabras` | S58 |
| slowly | `despacio` | S61L1 |
| again | `otra vez` | S61L2 |
| easy | `fácil` | S64L1 |
| different | `distintas` | S60L1 |
| doing interesting things | `hacer cosas interesantes` | S51 |

No English answer was changed. Only the Spanish prompt moved.

**Collision check: all 40 clean** — no proposed Spanish already mapped to a different
English (ZUT), none duplicated another card, none collided with a lego, none collided
with each other.

One flagged: `queríamos darte un poco más de tiempo` uses a phrase whose packaged lego
debuts at S96, though its parts are taught at S9 (`un poco de`) and S54 (`tiempo`).
The **answer** is unchanged and taught, which is the axis that matters.

## The eus_for_spa component rows — my assumption was half wrong

I read `cycles.ts` and concluded the 11 `component` rows were never seen or heard.
Worker #52 checked further and **corrected me**: there are two tile producers.
`cycles.ts`/`bundle.ts` exclude components, but `generateLearningScript.ts`
(`fetchAllPracticePhrases`) has **no `phrase_role` filter** and pushes every component
row to the DOM at `LegoAssembly.vue`. So they **are displayed, never heard**
(`componentPhrasesByLego` is populated and read nowhere).

Consequence: fixed as **text-only, zero audio spend**. Seven now hold `known_audio_id
= NULL`, which is honest — the old clips spoke Basque in a Spanish slot, and NULL is
strictly better than wrong. Four opportunistically relinked to existing correct
Spanish clips at no cost.

Two collisions found and shipped anyway, both reported here rather than buried:
- `ez dut → no` — Spanish `no` is **already** 4-way overloaded in the tile layer
  (`ez` ×9, `ez nuke`, `ezin`, `ez dut`). Pre-existing; reusing the existing
  `no → ez dut` precedent adds no new ambiguity.
- `nola esaten → cómo se dice` — `cómo se dice` is a producible prompt mapped to
  `nola esaten da`; this tile puts it over the shorter span. Tiles are visual
  sub-spans, and there is no third Spanish the course supports.

## The Japanese, and the flags worth your attention

All three rows had the answer sitting in the Japanese prompt field. Worker #55 built
the replacements from the courses' own corpora and raised three honest flags — none
of which it resolved unilaterally, correctly, because a `target_text` edit relinks or
nulls target audio:

1. **`eng_for_jpn` S248** — `すみません` is glossed *"I'm sorry that"* course-wide
   (seed 139), but the target says *"I'm sorry to say that"*. Meaning identical, idiom
   differs; no taught Japanese distinguishes them.
2. **`eng_for_jpn` S248** — the sibling rows carry the same proposition in the opposite
   clause order (`ので` = so vs `から` = because). Formally distinct and pedagogically
   correct, but a learner may answer with the so-form.
3. **`spa_for_jpn` S273 — the loudest.** `〜かどうかわからない` is glossed
   *`no estoy seguro si`* on 33 rows and *`no sé si`* on 2. This row's target uses the
   minority gloss. **Pre-existing inconsistency, living in the target.** Your call
   whether to normalise it.

## Audio

Rendered through the same path `/generate` uses (TTS → `masterAudio` → veracity gate →
S3 → `course_audio` upsert), at each course's **configured known speed**:

| course | voice | speed | clips |
|---|---|---|---|
| `eng_for_spa` | `azure_es-ES-ElviraNeural` | **1.0** | 39 |
| `eus_for_spa` | `azure_es-AR-ElenaNeural` | **1.0** | 1 |
| `eng_for_jpn` | `azure_ja-JP-MayuNeural` | **0.95** | 2 |
| `spa_for_jpn` | `azure_ja-JP-ShioriNeural` | **0.9** | 1 |

43 clips, 0 failures, veracity gate ON and every sampled clip passed. One text
(`queríamos darte un poco más de tiempo`) already had a correct clip and cost nothing.

**No row was ever silent.** Clips were rendered and verified in S3 *first*; the
`trg_null_phrase_audio_on_text_change` trigger then relinked each row to the new
same-voice clip on the text UPDATE. All 55 rows relinked; old objects left in place.

## Two things found on the way

- **This checkout's `services/` is stale.** `phase8-audio-v13.cjs` calls
  `veracity.verdictColumns()`, which does not exist in this branch's
  `audio-veracity.cjs` (690 lines) but does on `main` (1,920 lines). Production is
  fine; the branch is behind. I rendered from a clean `origin/main` worktree.
- **`/generate` would have over-spent.** `eng_for_spa` has **368 released seed rows**
  with NULL known audio. A `roles:['known']` generate would have swept all of them.
  I rendered exactly the clips named here instead.

## Verified live

Not from the database — from the running app. The deep seeds are subscription-gated
for anonymous requests (`{"error":"Subscription required","reason":"preview_only"}`),
and `previewOnly` caps the bundle at ~19 seeds, so a bundle probe proves nothing at
S54+. **Stated as a gap.** What I could verify, I did: each new clip fetched through
the learner's own `/api/audio/<id>` route and transcribed with whisper.

| served clip | heard |
|---|---|
| `277d4f4e` | *Queríamos darte más tiempo.* |
| `be0df0f2` | *Es fácil aprender palabras distintas.* |
| `e87a4453` | *Por desgracia, no me gusta dejar de hablar.* |
| `b08848f1` | すみません、その映画は全くひどかったと思いました。 |
| `11d923b1` | お金を返してほしいですその映画は全くひどかったと思いましたから |
| `ef506f1d` | あいにく、間に合ってつくことができるかどうかわかりません。 |

Byte sizes match the S3 objects exactly. No English remains in any of them.

## Final state

Re-scan with the original detector: `eng_for_spa` 0 (was 27), `eus_for_spa` 0 (was 12),
`eng_for_jpn` 0 (was 2), `spa_for_jpn` 0 (was 1). Single-word re-scan of `eng_for_spa`:
0 remaining. NULL known audio introduced: 7, all component, all deliberate.

## Gaps, stated

- **~938 raw hits in courses the original sweep never reached** are unexamined.
- **The two-word detector misses single-word leaks.** It found 27 in `eng_for_spa`;
  the true count was 40. Every published count from it is a floor, including the 42.
- **No live read of the served prompt text at S54+** — subscription-gated.
- **No native speaker** reviewed the Basque-course Spanish or the Japanese.
