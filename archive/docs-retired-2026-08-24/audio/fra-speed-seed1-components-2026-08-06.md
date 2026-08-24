# French speed, seed-1 audio, and the components question

2026-08-06. Three things Kai asked for after listening to French and German in the app.
**No TTS was generated anywhere in this job.**

---

## 1. French speed — DONE

| | old | new | seed-1 effective rate |
|---|---|---|---|
| **fra_for_eng** | 0.95 | **0.90** | **0.72×** |
| deu_for_eng (unchanged) | 0.90 | 0.90 | 0.72× |

`courses.voice_config.target_speed.global_speed`, written directly to Supabase and read
back to confirm. French now matches German exactly.

0.72× = 0.90 global × 0.80 white-belt ramp (seeds 1–7). I confirmed the belt ramp
actually applies rather than falling through to flat base speed: the gate is
`target1` recorded at 1.0× with a voiceId present, and both courses satisfy it
(deu voice `ara`, fra voice `eve`).

**One caveat, not acted on.** The player's script cache invalidates on
`content_version` / `content_stamp` / `audio_stamp` — **not** on `voice_config`. My
update moved `updated_at` but left `content_stamp` at 15:07. So:

- a **fresh** French session gets 0.72× right now;
- a learner with an **existing cached** French script keeps the old 0.95 bake until a
  version bump or a cache clear.

The remedy is a one-line `content_version` bump, but that invalidates caches for every
French learner, so it's Kai's call rather than mine. Say the word and I'll do it.

---

## 2. Seed-1 audio — no truncation found, but there IS a real defect

| | deu | fra | both |
|---|---|---|---|
| Live seed-1 clips | 74 | 65 | **139** |
| **Measurably damaged** | **0** | **0** | **0** |
| Blanket rerun cost | $0.021 | $0.024 | **$0.045** |

All 139 clips were fetched from S3, decoded and measured. **None failed.**

### The money question dissolves

A blanket seed-1 rerun for both courses costs **4.5 cents** (xAI, $15.00/1M chars, rate
found in `phase8-audio-v13.cjs:5601`). Spend is not the reason to hold off. The reason
to hold off is that the *last* rerun is what caused the only defect actually found —
plus the "as in" sequencing problem in §4.

### The real defect is a linking bug, not truncation

**10 deu seed-1 slots serve `::superseded` audio whose replacements were generated
today (13:48–13:52) and never linked:**

- 6 phrase slots where the relink hit the lego but not the phrase;
- 4 presentation clips linked by nothing at all.

**This is a relink, not a regeneration — the audio is already paid for and sitting on
S3.** No TTS needed to fix it.

⚠️ deu had 21 rows created in the 3 hours before the snapshot, so a concurrent campaign
was live. Re-check the relink list against current state before acting on it.

### On the measurement method

The trap Kai named was real and is now quantified. The naive "RMS over the final 50ms
of file" metric reads **−124 to −30 dB across all 139 clips** — against its own −6 dB
threshold it would call every clip clean, *including cut ones*. It reads the silence
pad, not the cut. `tools/physical-tail-probe.cjs` does exactly this and should not be
trusted for these verdicts.

The corrected probe is committed as `tools/seed-audio-tail-probe.cjs`. It finds the
onset of trailing silence, measures the 50ms *before* that point, and measures the
amplitude step at the cut boundary.

Two false leads were caught rather than reported as findings:

- A first metric (raw amplitude at the last supra-floor sample) was **degenerate** — it
  merely re-reported the chosen silence floor. Replaced with a frame-based envelope.
- French clips showed a syllable deficit that looked *exactly* like the reported
  symptom. It scales cleanly with nasal-vowel graphemes (0 nasals → −0.08, 3 → +2.30):
  **an orthographic estimator over-counting French nasals, not damage.** French *known*
  clips (spoken English) match German.

The distribution is unimodal and continuous, so no a-priori threshold was set; two
independent signals were required to agree. **1 clip of 139 qualifies** — a fra
presentation clip whose text ends in "is:", which is *meant* to hand over abruptly.
Worth one listen, not a regeneration.

### Where the claim has to be bounded — EXPLICIT GAPS

- **The positive control did not pass.** The 10 clips previously replaced *for being
  truncated* are indistinguishable from their replacements (tailRatio −20.7 vs −19.4;
  4 of 10 replacements came out *shorter*; one identical to the millisecond). Either
  the probe is insensitive, or those clips were never truncated. Duration evidence
  favours the latter — which would mean some selector is billing for healthy audio —
  but that is not proven here.
- **Clip content is unverified.** There is no ASR on this box and `word_boundaries` is
  NULL for all 139 rows. Everything above is waveform physics only: it detects a clip
  that stops mid-signal, and says nothing about whether the right words were spoken.
- One non-finding closed off: 12 `repair-candidates/` clips 403 on the public URL, but
  the learner uses presigned URLs — probe artefact, not breakage.

### Recommendation

Relink the 10 (no spend). Listen to the one fra clip. **Do not blanket-regenerate.**
Look at whatever selector flagged those 10 as truncated in the first place.

---

## 3. Components — a French data gap, not a bug

**French seed 1 has zero `phrase_role='component'` rows. German has four.**

Seed-1 phrase rows:

| | build | use | **component** | total |
|---|---|---|---|---|
| deu_for_eng | 9 | 7 | **4** | 20 |
| fra_for_eng | 10 | 7 | **0** | 17 |

The `course_legos.components` arrays *are* symmetric — both courses have exactly 2 of 5
seed-1 legos carrying components. But those are the tiles. The **audible** intro comes
from component-role rows in `course_practice_phrases`, carrying their own known/target/
presentation audio ids. The player is behaving correctly: it only speaks a component
when such a row exists.

French isn't broken course-wide — it has 1,776 component rows across 544 seeds. But the
earliest is **seed 2**. They were all created in a backfill on 2026-03-11, three weeks
after the seed-1 build/use rows. **That pass skipped seed 1.**

**Proved against the live API, not just from code.** Hitting the endpoint the player
actually calls, `GET /api/courses/:code/cycles?from=S0001L01&limit=12`:

- German: `intro → component_intro (I→Ich) → component_intro (Want→Will) → debut → build`
- French: `intro → debut → build`

Same request, same lego.

Ruled out with evidence: `voice_config` (identical shape, and nothing reads it for
component gating); lego `type` and component shape (both M, both 2 atoms); the stale
materialised view (`course_round_index` **does not exist** in the live DB); and the code
branch — the three skip conditions at `api/courses/[code]/cycles.ts:557,559,562` are
never reached for French, because the loop finds no component rows at all.
`generateLearningScript.ts:714-721` applies the same rule, so both read paths agree.

### Cost to fix fra seed 1

Four rows: I/je, want/veux, with/avec, you/toi. Target audio already exists for *je*,
*veux*, *avec*. **`toi` has none** (only "avec toi" exists). So **2 new clips minimum**
(toi target1 + target2), or **6** to match the convention of giving each component its
own narration.

### Wider than the brief — 17 courses affected, and it needs a separate decision

**17 courses have seed-1 components with no playable intro**, splitting into two very
different problems:

- **4 share French's disease** (rows missing, audio mostly present): `fra_for_eng`,
  `por_for_eng`, `eng_template`, `cym_anthem_for_jpn`.
- **13 are worse** — rows exist but there is **no component audio anywhere in the
  course**, so they never play a component intro at all: `hak_for_eng` (4,234 component
  rows, zero with full audio), `fin`, `deu_ch`, `bre_for_fra`, `yue`, `nan`, `mar`,
  `gla`, `mlt`, `tel`, `por_for_jpn`, `sbx`, `ita_for_cym`.

That second group is a large audio backlog. It has not been costed and should be its
own decision.

**Gaps:** the app was not run in a browser — the proof is live API JSON plus code
reading, so the final render step is inferred. And why the March backfill skipped seeds
1, 3 and 4 was not traced.

---

## 4. The "as in" removal — costed, HELD for Tom

**Not touched. No text changed, no audio generated.** Kai flagged this as Tom's call.

Current shape:

> "The French for: 'I want', **as in — 'I want to speak French with you now'**, is:"

Proposed: drop the clause for seed 1, leaving "The French for: 'I want', is:".

| Scope | Courses | Live clips | Chars | TTS cost |
|---|---|---|---|---|
| deu + fra, seed 1 only | 2 | 14 | 985 | **≈$0.015** |
| Every course, seed 1 | 82 | 534 | 29,651 | **≈$0.44** |

**It is a generation-time template render, not authored text** —
`presentation_templates` table → `renderIntro()` in
`services/phases/presentation-author.cjs`. The bare-intro variant (Frame A) **already
exists in shipping code**. So this is a small code change, not new engineering, and no
authored content column gets edited.

Money is a non-issue at either scope. The real cost is workflow: regen + veracity +
relink per clip.

### ⚠️ THE SEQUENCING CONSEQUENCE — why job 2 stopped at diagnosis

**Any seed-1 audio regenerated BEFORE the "as in" decision would have to be generated a
second time**, because the "as in" text is baked into those very presentation clips.
That is the whole reason no TTS ran in this job. The 4.5-cent price tag makes the
double-pay trivial in money, but the regen + veracity + relink workflow is the part
that actually costs, and it would be run twice.

Gaps: 2 courses (`zho_for_gle`, `cym_for_yor`) need manual eyes and are excluded from
the 82. The xAI $15/1M rate is documented **only in prose in a prior doc**, not in a
config file — every dollar figure in this report rests on that prose. Separately, 4
`deu_for_eng` live pointers resolve to text-tombstoned rows (a repair-completeness
issue, not investigated).

---

## What needs a decision

1. **Tom — the "as in" question.** Seed 1 only for deu+fra (14 clips), or all 82
   courses (534 clips)? Cents either way. Everything seed-1-audio-shaped is blocked
   behind this.
2. **Kai — the `content_version` bump**, so cached French sessions pick up 0.90.
3. **Kai — relink the 10 deu slots.** No spend; audio already exists on S3.
4. **Someone — the 13-course component-audio backlog.** Not costed here.
