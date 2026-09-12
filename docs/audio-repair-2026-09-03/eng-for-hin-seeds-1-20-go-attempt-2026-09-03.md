# eng_for_hin seeds 1–20 — GO attempt: still blocked, plan ready to fire

**Date:** 2026-09-03 · **Requested by:** Kai · **Scope:** seeds 1–20 inclusive

## Bottom line

**I did not generate. The blocker that stopped me before is still in place**, and it is not the
one the go-ahead cleared.

The go-ahead said "the known-side gender work has landed and the blocker is cleared". The gender
work **has** landed, and it is good — I verified it. But the blocker I reported was never the
gender work: it was that **xAI is retired from new renders** and `eng_for_hin`'s voice config is
entirely xAI. Nothing about that has changed.

I re-checked rather than trusting it, and proved it live just now with a deliberately tiny
3-clip probe against the Hindi cue side:

> `TTS generation failed (non-retriable): Retired provider "xai" reached tts-service.generate (403). New renders may not use it (Tom 2026-08-27). Existing clips on it are untouched and still play.`

`courses.voice_config` for `eng_for_hin` is unchanged since I last read it — `known` and
`presentation` are still **Eve** (`eve`, xAI), `target1` **Olivia** (`xai_bedd6226`), `target2`
**Tom** (`xai_gfzdpspr5fdp`). All four roles are xAI. **A full 630-clip run would have failed
630 times.** Firing it and reporting a pile of 403s as "generated" is exactly the doubtful batch
you told me to check rather than ship.

**The opening of the course is NOT playable end to end**, and I could not make it so tonight.

## What HAS landed, and it is good

`course_gender_expansions` for `eng_for_hin` is rebuilt exactly as described. I verified every
claim:

| check | result |
|---|---|
| Row count | **2,564** |
| All `text_side = 'known'` | 2,564 / 2,564 |
| `original_text == expanded_m` | 2,564 / 2,564 |
| Has a distinct `expanded_f` | 2,564 / 2,564 (zero null, zero equal to `expanded_m`) |
| Distinct `original_text` values | 2,564 (no duplicates) |
| Written | all at 2026-09-03T00:52:39Z (single rebuild) |

The Hindi is right, too — proper masculine/feminine verb agreement: चाहता/चाहती, रहा/रही,
करूँगा/करूँगी.

One thing worth knowing: you said 20.5% of the course's cues carry speaker gender. **In seeds
1–20 it is 45%** (253 of 563 cues). The opening is more than twice as gender-dense as the course
average, so the alternation matters more here than the headline number suggests.

## The alternation rule I applied

Deterministic, positional, no randomisation, no player logic — decided at generation time, exactly
as you asked. For each cue item compute an ordinal:

- **seed:** `ord = seed_number`
- **LEGO:** `ord = seed_number + lego_index`
- **practice phrase:** `ord = seed_number + lego_index + position`

Then **`turn = 'm'` if `ord` is odd, `'f'` if `ord` is even.** Where the cue has a
`course_gender_expansions` row, generate `expanded_m` or `expanded_f` for that turn; **where it
has no row, the cue has no speaker gender and the text is used unchanged.** The English target
text is untouched either way — it comes back identical, as you specified.

This gives every other seed male/female (seed 1 m, seed 2 f, seed 5 m, seed 6 f…), and alternation
running across LEGOs and across phrases within each seed, with the starting foot flipping per seed
so the pattern doesn't lock into phase. Balance across the 563 items: **281 male / 282 female.**

## The count: 630 clips — under the 1,000 cap

| | clips |
|---|---|
| Hindi cue — missing, must generate | 405 |
| Hindi cue — exists and correct, **reuse** | 137 |
| Hindi cue — exists but **wrong wording**, must regenerate | 21 |
| English target1 + target2 — missing | 204 |
| **TOTAL TO GENERATE** | **630** |

**630 is comfortably under 1,000, so seeds 1–20 fit and no shorter range is needed.**

### About those 21

This is the one thing in the plan that deserves your eye. All 21 are gendered cues whose turn
came up **female** but whose existing clip speaks the **male** wording — inevitable, because every
clip rendered before tonight came from `original_text`, which *is* `expanded_m`. Under the new
alternation those clips are no longer correct, so they are "existing but not good" and I have
them queued for regeneration rather than reuse. The other 137 existing cue clips genuinely match
their required wording and will be reused untouched.

## A second gap, still unbuilt

Even once the provider is fixed, there is a structural problem with the design as specified.
A cue that says *"मैं…चाहती हूँ"* is a **female speaker**, and reading it in a male voice is
incoherent. So the voice has to track the wording — which is what your original Vihaan/Ishani
50/50 split was reaching for.

**`voice_config` has exactly one `known` slot**, and phase8's `getVoiceForRole('known')` returns
one voice for every item. **There is no way to select a per-item cue voice on this render path.**
It would have to be built. I flagged this before the gender work; it is still true, and the gender
work makes it sharper rather than resolving it.

Also still true, from my earlier check: **Ishani does not exist** at the provider (`404 — Voice
'ishani' not found`), and **Vihaan** (`bcf738e4`) is real but is xAI, so it is retired along with
everything else.

## What unblocks this

`eng_for_hin` has to be re-cast off xAI. That changes the voices of record on a **live** course,
so it is your call, not mine. Azure is the ready path — I rendered the real seed-1 and seed-2 cues
through it just now, in both genders, and all three came back as clean audio:

| clip | voice | length |
|---|---|---|
| seed 1, male turn — *…बात करना **चाहता** हूँ।* | `hi-IN-KunalNeural` (m) | 4.30s |
| seed 2, female turn — *…कोशिश कर **रही** हूँ।* | `hi-IN-SwaraNeural` (f) | 3.34s |
| seed 1 as female, for contrast — *…बात करना **चाहती** हूँ।* | `hi-IN-SwaraNeural` (f) | 4.63s |

Azure has two female Hindi voices (`Swara`, `Aarti`) and two male (`Kunal`, `Madhur`), so the
male/female cue pairing you wanted **is** achievable there — it just needs the per-item voice
selection above to actually alternate the voice with the wording.

Note this hits the English side too: `target1`/`target2` are xAI as well, so the 204 missing
English clips cannot be topped up either until the re-cast happens.

## Ready to fire

The full per-item plan — all 563 items with their ordinal, turn, exact required Hindi wording and
per-clip action (GENERATE / REUSE / REGENERATE) — is committed alongside this report as
`eng-for-hin-seeds-1-20-alternation-plan.json`. The moment the course is re-cast, the run is
turnkey and stays inside the cap.

## Rules honoured

- **Nothing generated** — no spend, beyond three Azure evidence clips rendered to local files.
- No seed, LEGO or phrase **text** changed.
- **`course_gender_expansions` read only** — not written, not touched.
- Nothing beyond seed 20.
- Nothing existing and good regenerated (the 137 good cue clips are marked reuse).
- The 3-clip probe was deliberately capped with `limit: 3` so the check cost nothing.
