# The debut IS the bare LEGO — and one of the three sequence builders forgot

**2026-08-09. Telemetry-led. You were right: it is not a pointer bug and it is not one bad row.**

---

## What you heard, as the telemetry recorded it

`S0009L01` "I speak / je parle", dev, learner session 02:58:50Z, every clip resolved to its text
and its voice:

| Time | Cycle | Role | Voice | Text |
|---|---|---|---|---|
| 02:58:50 | `S0009L01_intro` | known | clone | The French for: 'I speak', as in — 'I speak a little French now', is: |
| 02:58:56 | `S0009L01_intro` | target1 | Eve | je parle |
| 02:59:00 | `S0009L01_debut` | known | **clone** | **I speak** |
| 02:59:04 | `S0009L01_build_2` | known | clone | I speak with you |
| 02:59:09 | `S0009L01_build_1` | known | **Eve** | **I speak** |
| 02:59:14 | `S0009L01_build_1_x2` | known | **Eve** | **I speak** |
| 02:59:23 | `S0009L01_build_2_x2` | known | clone | I speak with you |

Your description was exact, including the count. The `_x2` suffix is Easy mode's repeat working as
designed — it is not the bug, it is the amplifier. **One redundant cycle became two consecutive
plays.**

## The defect

`fra_for_eng:S0009L01B01` is a BUILD row whose known text is "I speak" and whose target text is
"je parle" — character-for-character its own LEGO. The debut already teaches exactly that. Playing
it again as a BUILD also breaks the rule that a BUILD is the new LEGO plugged into already-known
vocabulary, and burns a build slot a real phrase should have had.

**Two of the three sequence builders have always guarded against this. The third never did.**

| Builder | Guard | Cycle ids it emits |
|---|---|---|
| `packages/player-vue/src/providers/generateLearningScript.ts` | ✅ claims the bare LEGO before walking phrases | `S0009L02_build_446` (global counter) |
| dashboard `services/learning-script-generator.cjs` | ✅ same claim | — |
| **`api/courses/[code]/cycles.ts`** (instant playback) | ❌ **none** | `S0009L01_build_1` (per-LEGO ordinal) |

The script path's own comment names this exact defect, and even names a sibling course's row:
*"Some courses carry a build row whose text equals its own LEGO (deu_for_eng S0001L01 'I want /
ich will'); playing that as a BUILD breaks the rule…"*. The instant endpoint is a newer, faster
path that was never given the same claim.

## Why it looked condition-triggered

The two builders are both live in one session. The instant endpoint serves a LEGO when you **skip
or jump into it, or after a cold start**; natural progression is served by the script path. Your
own session shows the switch: `lego_skip` at 02:58:50 → `S0009L01_intro` (no counter, unguarded),
then rolling on to `S0009L02` at 02:59:55 → `S0009L02_intro_444` (counter, guarded).

That is why "a little" was clean. It carries a bare-LEGO row too (`S0009L02B01` "a little / un
peu") — you simply reached it by progression, and the guarded builder dropped it.

Counted across every non-spaced-rep build cycle in that session:

| Path | Known plays | Of which the bare LEGO's own words |
|---|---|---|
| unguarded (`_build_N`) | 39 | **10** |
| guarded (`_build_NNN`) | 38 | **0** |

## Scale — it is the whole estate, not fra

Rows whose known **and** target text equal their own LEGO's:

| Course | Rows | LEGOs affected |
|---|---|---|
| hak_for_eng | 2,247 | 2,247 |
| mar_for_eng | 1,649 | 1,649 |
| **fra_for_eng** | **1,518** | **1,277** |
| por_for_eng | 1,460 | 1,182 |
| ita_for_eng | 1,448 | 1,198 |
| … every other course | ~1,000 each | |

fra's 1,518 rows over 1,277 LEGOs means some LEGOs carry the bare row more than once.

## The fix — suppressed, not recoloured

`api/courses/[code]/cycles.ts` now claims the LEGO's own (known, target) before walking the
phrases, and claims each phrase as it is emitted. The row is skipped **before** it takes a build
ordinal, so a real phrase gets the slot instead of it being burned. The claim set also catches a
duplicated phrase row and a USE row that is just the LEGO. Matching uses the script path's own
normaliser character-for-character, so the two builders now skip exactly the same rows.

Six tests pin it (`cycles.bareLegoBuildNeverReplays.test.ts`), built on the real `S0009L01` and
`S0009L02` shapes: 5 of 6 fail without the fix, 6 of 6 pass with it. The full API suite is green —
111 files, 1,250 tests.

**No content was deleted.** The bare-LEGO rows stay in the database; the sequence simply stops
emitting them. Whether they should also be removed from the courses — they are a methodology
violation as authored, and they are occupying a BUILD slot that owes a real phrase — is a separate,
much larger call, and yours.

## The migration I had already run — reported plainly

Before your correction arrived I had already applied the repoint: **1,528 fra_for_eng build/use
`known_audio_id` pointers moved from the 2026-08-03 Eve clip to the existing clone-voiced clip**,
verified on served bytes, 40/40. That was the wrong diagnosis of what you heard, and it is not the
fix. It is not harmful and I have not reverted it — those phrase rows genuinely should carry the
course's known voice, and the ones that are bare-LEGO rows now never play at all. The rollback is
`fra_for_eng-known-repoint-applied-log.json` replayed backwards if you want it gone.

## Not yet done

The fix is committed and pushed but **not merged and not deployed** — the instant endpoint is a
Vercel route in `ssi-learning-app`, so it needs a deploy before you can hear the difference.
