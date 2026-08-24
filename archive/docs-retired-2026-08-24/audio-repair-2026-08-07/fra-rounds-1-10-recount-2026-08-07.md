# French rounds 1–10 — what the learner actually hears, measured from the course itself

2026-08-07. Every number below is the output of the real learning-script generator run over the
real `fra_for_eng` course data today. Nothing here is reconciled toward any previously stated
figure — not Watson's, not anyone's. If a number appears, it came out of the generator or out of a
direct read of the course tables, and the probe that produced it is named at the end.

**Read-only. No audio generated, nothing relinked, no course content touched.**

---

## The shape, measured

Rounds 1–10 emit **107 cycles**. Every single cycle plays **exactly three clips: 1 English + 2
French**. There are no exceptions — the generator emits no cycle with a different clip shape:

| Cycle type | Cycles | Clips per cycle | Which clips |
|---|---|---|---|
| intro | 10 | 3 | presentation (English) + target1 + target2 |
| debut | 10 | 3 | known (English) + target1 + target2 |
| build | 41 | 3 | known (English) + target1 + target2 |
| review | 32 | 3 | known (English) + target1 + target2 |
| consolidate | 14 | 3 | known (English) + target1 + target2 |
| **Total** | **107** | | |

So the first ten rounds are:

> **107 cycles × 3 clips = 321 clip plays.**

Those 321 plays resolve to **169 distinct clips**:

| Layer | Clip plays | Distinct clips |
|---|---|---|
| presentation (English intro line) | 10 | 10 |
| known (English) | 97 | 53 |
| target1 (normal-speed French) | 107 | 53 |
| target2 (fast French) | 107 | 53 |
| **Total** | **321** | **169** |

The English side is 97 rather than 107 because intro cycles carry the presentation line instead of
a bare English clip — 97 + 10 = 107, one English clip in every cycle.

Repetition is roughly 2×: 107 French plays per speed, off 53 distinct French clips per speed.

### Per round

| Round | LEGO | Cycles | intro | debut | build | review | consolidate | Clip plays | pres | Eng | fra ×2 | Reviews of rounds |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | S0001L01 | 2 | 1 | 1 | — | — | — | 6 | 1 | 1 | 2 + 2 | — |
| 2 | S0001L02 | 3 | 1 | 1 | 1 | — | — | 9 | 1 | 2 | 3 + 3 | — |
| 3 | S0001L03 | 4 | 1 | 1 | 2 | — | — | 12 | 1 | 3 | 4 + 4 | — |
| 4 | S0001L04 | 9 | 1 | 1 | 4 | 1 | 2 | 27 | 1 | 8 | 9 + 9 | 3 |
| 5 | S0001L05 | 14 | 1 | 1 | 7 | 3 | 2 | 42 | 1 | 13 | 14 + 14 | 4, 3 |
| 6 | S0002L01 | 15 | 1 | 1 | 6 | 5 | 2 | 45 | 1 | 14 | 15 + 15 | 5, 4, 3 |
| 7 | S0002L02 | 16 | 1 | 1 | 7 | 5 | 2 | 48 | 1 | 15 | 16 + 16 | 6, 5, 4 |
| 8 | S0002L03 | 13 | 1 | 1 | 3 | 6 | 2 | 39 | 1 | 12 | 13 + 13 | 7, 6, 5, 3 |
| 9 | S0003L01 | 16 | 1 | 1 | 6 | 6 | 2 | 48 | 1 | 15 | 16 + 16 | 8, 7, 6, 4 |
| 10 | S0003L03 | 15 | 1 | 1 | 5 | 6 | 2 | 45 | 1 | 14 | 15 + 15 | 9, 8, 7, 5 |
| **Total** | | **107** | **10** | **10** | **41** | **32** | **14** | **321** | **10** | **97** | **107 + 107** | |

Cycle-type names are the generator's own verbatim: `intro`, `debut`, `build`, `review`,
`consolidate`. Nothing else is emitted — no component cycles, no listening clusters, no pod laps.

### Which LEGOs and seeds

Rounds 1–10 walk exactly these ten LEGOs, in this order:

> 1 `S0001L01` "I want" / *je veux* · 2 `S0001L02` "to speak" / *parler* · 3 `S0001L03` "French" /
> *français* · 4 `S0001L04` "with you" / *avec toi* · 5 `S0001L05` "now" / *maintenant* ·
> 6 `S0002L01` "to learn" / *apprendre* · 7 `S0002L02` "I'm trying to" / *j'essaie de* ·
> 8 `S0002L03` "I'm trying to learn" / *j'essaie d'apprendre* · 9 `S0003L01` "how" / *comment* ·
> 10 `S0003L03` "often" / *souvent*

Seeds touched: 1, 2 and 3 only. Seed 3 is **not** complete at round 10 — `S0003L04`
"as often as possible" / *aussi souvent que possible* debuts at **round 11**. `S0003L02` ("to
speak") is `is_new=false`, a repeat of `S0001L02`, so it carries no round and the numbering
compresses past it. Spaced repetition never reaches outside this set: the largest offset in play by
round 10 is 5, and every reviewed round (3–9) is inside the window.

The `course_round_index` materialised view — the one the learner API's `round-map.ts` reads —
returns the same mapping independently: `1:S0001L01 … 9:S0003L01 10:S0003L03 11:S0003L04
12:S0004L01`.

### Configuration in force

Read live from `algorithm_config.script_shape` (the generator reported source `algorithm_config`,
not its built-in fallback): spaced-rep offsets `[1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,
1597,2584]`, maxBuildPhrases 7, maxSpacedRepPhrases 12, n1PhraseCount 3, useConsolidationCount 2.

### Content dropped before the walk

Two mechanisms, both measured:
- `is_new=false` LEGOs never enter the walk. In this range that is `S0003L02` alone.
- The learner audio gate drops LEGOs and phrases missing any of known/target1/target2 before the
  walk, so round numbers compress the way the learner's do. Course-wide it drops 4 LEGOs and 78
  phrases. **Rounds 1–10 are identical with the gate on and off** — same 10 LEGOs, same 107 cycles,
  same 321 clip plays, same 169 distinct clips. The gate changes nothing in this range.

---

## Tom's question: what feeds the TTS when a clip is built or re-rendered?

**There are two different paths, and they read from two different places.**

### First generation — reads the course content

`services/phases/phase8-audio-v13.cjs` (the `/generate` path) builds its work list in
`getAudioNeeds`, from the **holder rows**:

```
course_practice_phrases.known_text  → known_audio_id
course_practice_phrases.target_text → target1_audio_id
course_practice_phrases.target_text → target2_audio_id
course_legos.known_text             → known_audio_id
course_legos.target_text            → target1_audio_id / target2_audio_id
course_seeds.known_text / target_text (released seeds)
```

It only fills links that are **NULL**. This path reads the same text the round generator plays.

### Re-rendering an existing clip — reads the clip, not the course

`tools/regen-seed-clips-from-scratch.cjs` — the tool used on the French rounds overnight — works
from a list of `course_audio` **ids**. It fetches the `course_audio` row by id, and renders
`row.text`:

```js
const { data: row } = await supabase.from('course_audio').select('*').eq('id', item.id).single()
…
ttsService.generateWithRetry(row.text, provider, ttsOptionsFor(provider, voiceId, row.language))
```

It then reverse-looks-up every holder pointing at that id (its `HOLDERS` map) purely to **repoint
the links**. **It never reads `known_text` or `target_text`.** The source content for a re-render is
the text the clip itself is carrying — a copy made when the clip was first generated.

### So: is it the same source the round generator plays from?

**For first generation, yes. For re-rendering, no — and the two can disagree.**

The round generator plays `course_legos` / `course_practice_phrases` `known_text` and `target_text`,
and resolves audio through the `*_audio_id` pointers. `course_audio.text` is a **snapshot** of that
text taken at render time. Nothing in the schema keeps the two in step; there is no trigger, no
foreign key on text, no check. If a holder's text is updated in place while its `*_audio_id` stays
pointed at the old clip, then:

- the learner **sees** the new text and **hears** the old clip, and
- a re-render will faithfully regenerate the **old** text — the repair looks successful, the ledger
  is clean, the veracity check passes (it compares audio against `row.text`, the same stale copy),
  and the mismatch survives untouched.

The reason this is rare rather than routine is the sanctioned edit path: `edit-cascade` **deletes
and re-inserts** the LEGO/phrase rows, which drops the audio pointers to NULL, and `/generate` then
refills them from the current holder text. Divergence only arises when holder text changes by some
other route.

### Measured, course-wide

I checked every link in `fra_for_eng` — both holder tables, all three audio roles — comparing the
holder's text against the text stored on the clip it points at:

| Link | Linked | Text agrees | Disagrees | Dangling | Unlinked |
|---|---|---|---|---|---|
| `course_legos.known_audio_id` | 1,653 | 1,653 | 0 | 0 | 0 |
| `course_legos.target1_audio_id` | 1,653 | 1,653 | 0 | 0 | 0 |
| `course_legos.target2_audio_id` | 1,649 | 1,649 | 0 | 0 | 4 |
| `course_practice_phrases.known_audio_id` | 15,837 | 15,837 | 0 | 0 | 61 |
| `course_practice_phrases.target1_audio_id` | 15,827 | 15,826 | **1** | 0 | 71 |
| `course_practice_phrases.target2_audio_id` | 15,803 | 15,803 | 0 | 0 | 95 |
| **Total** | **52,422** | **52,421** | **1** | **0** | **231** |

The single divergence:

```
course_practice_phrases.target1_audio_id  fra_for_eng:S0094L01C02  [component]
   holder plays   : "seule"
   clip re-renders: "seul"
```

That is the failure mode in miniature: the course says *seule*, the clip says *seul*, and any
re-render of that clip produces *seul* again. It is a component row, so it is never played — but it
is proof the two sources are independent, not proof they are safe.

**In rounds 1–10 specifically: 159 known/target links checked, 159 agree, 0 disagree, 0 dangling.**
So for the ten rounds under discussion, re-rendering from the clip and re-rendering from the course
would have produced identical text. The overnight run did not render anything the course did not
say.

---

## Findings

1. **The re-render path is architecturally blind to the course content.** It cannot fix a clip whose
   text is wrong, because the wrong text is its input. Today that costs `fra_for_eng` exactly one
   row, but the property is permanent and applies to every course. A one-line change — render from
   the holder text rather than `course_audio.text`, or at minimum assert they match before
   rendering — would close it. Not done: that is a code change, not a counting job.
2. **`fra_for_eng:S0094L01C02` says "seul" where the course says "seule".** Component row, never
   played, so no learner impact — but it is a real data defect and it will not self-heal.
3. **`course_audio` cannot be queried by `course_code` on this course** — statement timeout, the
   same wall the pace gate hit. I worked around it by fetching all 42,708 linked clips by primary
   key instead, which is fast. That workaround is worth folding into the pace gate; it may be the
   whole fix.
4. **One intro line reads oddly.** Round 8's presentation clip is *"The French for: 'I'm trying to
   learn', as in — 'I'm trying to learn', is:"* — the LEGO and its example sentence are the same
   string, so the "as in" clause says nothing. Observed while reading the ten intro scripts; noted,
   not actioned.
5. **231 links in this course are NULL** (4 lego target2, 61/71/95 phrase known/target1/target2).
   Outside rounds 1–10, which are fully linked. Noted as an observation only.

## Gaps

- The course-wide text comparison covers `course_legos` and `course_practice_phrases`. It does **not**
  cover `course_seeds` or `lego_introductions`/presentation text, which have their own link columns.
  Not measured; stated rather than assumed.
- No claim is made about audio *quality* — this is a text-and-count job. Whether the new French
  takes sound right is Tom's ear on the listen doc.

## Probes (read-only, gitignored `scripts/`)

- `fra-rounds-1-10-cycles.cjs` — runs the generator over rounds 1–10 in both production and
  learner-gated views; tallies cycles by type, clips per cycle, clip plays and distinct clips per
  layer, per round and cumulative.
- `fra-rounds-1-10-textsource.cjs` — for every clip those cycles play, compares the text the
  generator plays against the text stored on the clip.
- `fra-textsource-divergence.cjs` — the same comparison across all 52,422 links in `fra_for_eng`.
