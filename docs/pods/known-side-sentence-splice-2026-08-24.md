# The known-side sentence splice — 22 courses, 1,249 turns, £0

**2026-08-24.** Tom's instruction: BUILD IT.

The target-side splice pass scoped itself out of the known side and said why:

> TARGET SIDE ONLY. `sentence_known_audio_ids` is out of scope for this pass and
> is not touched… Splicing the known side is the same free method and is a
> follow-on pass, not a silent extension of this one.

This is that follow-on pass.

---

## What was broken, and why

`repair-split-array-inheritance.cjs` ran at 11:12Z on Italian and 11:29Z
fleet-wide. It NULLed `sentence_known_audio_ids` wherever the array had been
inherited positionally from a retired pod and was pointing at another
conversation's clips. That was the right call — the learner was hearing the
wrong words — but it left the known side of those turns with no per-sentence
audio, so a split card shows its sentence's text with the translation slot
silent.

The fix is free. `generatePodAudio` inserts its `" … "` pause cue on
`track === 'target' || track === 'known'` alike (Tom, 2026-06-30), precisely so
a multi-sentence take stays cleanly splittable. So each turn's own English
performance can be cut at the pauses that are already in it. ffmpeg only. No
TTS, no money, no content text changed.

## The result

| | |
|---|---|
| Courses | 22 |
| Candidate turns | 1,705 |
| **Turns restored** | **1,249** |
| Clips cut | 2,813 |
| Clips reused (already rendered) | 441 |
| Left on whole-turn fallback | 461 |
| Out of scope (target side never split) | 3,068 |
| **Errors** | **0** |
| Cost | £0 |

Fleet-wide, rows carrying a known split the app will actually use went from
**1,553** — reconciled row by row against the live DB, exactly matching the
per-course logs.

### Per course

| course | candidates | restored | clips cut | reused | fallback | out of scope |
|---|---|---|---|---|---|---|
| deu_at | 86 | 73 | 182 | 12 | 13 | 145 |
| fra_ca | 94 | 72 | 168 | 21 | 22 | 131 |
| fra | 96 | 72 | 172 | 16 | 24 | 135 |
| spa_mx | 94 | 70 | 158 | 21 | 24 | 131 |
| por_br | 93 | 68 | 159 | 19 | 25 | 133 |
| por | 94 | 67 | 152 | 19 | 27 | 133 |
| deu | 92 | 66 | 160 | 12 | 26 | 139 |
| isl | 93 | 65 | 150 | 22 | 28 | 131 |
| ara | 92 | 64 | 149 | 14 | 28 | 132 |
| gle | 92 | 64 | 153 | 17 | 28 | 132 |
| ron | 90 | 64 | 150 | 14 | 26 | 131 |
| swe | 92 | 64 | 145 | 16 | 28 | 133 |
| nld | 92 | 63 | 146 | 19 | 29 | 135 |
| ara_eg | 88 | 61 | 142 | 11 | 28 | 134 |
| eus | 84 | 59 | 137 | 16 | 25 | 131 |
| spa | 67 | 56 | 108 | 40 | 11 | 133 |
| jpn | 55 | 47 | 73 | 59 | 8 | 134 |
| zho | 62 | 39 | 93 | 9 | 23 | 157 |
| kor | 43 | 37 | 59 | 37 | 7 | 145 |
| hrv | 37 | 33 | 70 | 37 | 4 | 178 |
| hin | 44 | 32 | 59 | 6 | 15 | 183 |
| ita | 25 | 13 | 28 | 4 | 12 | 132 |

---

## Why 461 turns were left alone

They are the gates working, not defects. Every refused turn keeps the
whole-turn clip it has today and is **exactly as it was** — no worse.

| reason | turns |
|---|---|
| `margin_below_floor` | 223 |
| `too_few_gaps` | 165 |
| `seam_not_silent` | 68 |
| `known_count_mismatch` | 5 |

**The dominant cause is the voices, not the method.** The xAI clone voices on
the known track (`gfzdpspr5fdp` Tom, `bedd6226` Olivia) render the `" … "` cue
as **110-200 ms** of silence. Target-side voices give **300-800 ms**. Because a
comma pause is ~100-150 ms in both, the known side's *margin* — shortest gap cut
at ÷ longest gap not cut at — collapses toward 1.0 where the target side sits at
2-6. Measured Italian refusals: 1.01, 1.02, 1.03, 1.08, 1.17, 1.39. A margin of
1.0 is a coin toss about which gap is a sentence boundary.

**The margin floor was NOT lowered to improve the count.** 1.5 came from a
target-side census (`docs/pods/splice-margin-census-2026-08-24.md`); no
known-side census exists to justify a different number, and the standing rule is
that a bad split is worse than no split. If the yield ever needs to go up, the
honest routes are a known-side margin census first, or a longer pause cue on the
known track at render time — not a relaxed gate.

A chunk of `too_few_gaps` is the number/colour drill lines — "4. 6. 8. Blue.
Yellow.", five one-word "sentences" in 3.5 s, read as the list they are. Some
have **no** interior silence at all at the −35 dB / 100 ms detection floor.
Nothing to cut there, on either side.

---

## Explicit gaps — what this pass did not do

**3,068 rows whose target side never split.** `splitRowUnits` returns a single
whole-turn unit below 2 target clips and never reads the known array on that
path, so splicing their known side would write clips no learner can reach.
These are waiting on the TARGET pass, not on this one. They are counted per
course in every log under `excluded_by_reason.no_target_split`.

**CJK/Thai known text: zero excluded, and that is the honest answer.** Every
live `<course>:pod-1` is a `*_for_eng` course, so the known side is English
everywhere and the exclusion never fired. The gate is implemented and tested
anyway, because `eng_for_jpn`-shaped courses exist on the estate: the known-side
boundary needs whitespace after the mark and CJK/Thai has none, and unlike the
target side the app does *not* take the known display text from the clip
(`kSents[i]`, the regex split, wins when there is no known clip). A CJK known
split would pair audio against text the app never split. Excluded, counted,
reported — not silently skipped.

**One pre-existing defect found, not fixed.** `kor_for_eng:pod-1` 6.11 has its
target split into **5** clips while its English has **4** sentences, and carries
a 4-length known array from earlier work. The app pairs known audio in only when
the lengths match, so that row's translation slots are silent today and this
pass correctly refused it (`known_count_mismatch`). Fixing it means deciding
whether the 5-way target split is right, which is a content question, not a
splice one.

**One text mismatch found, not fixed.** `ita_for_eng` row 95 s0 is a clip
rendered on 2026-08-23 storing "That's very kind of you." where the row's text
has "!". Words identical, terminal punctuation on the card differs. Predates
this pass; logged and untouched.

---

## How it was built

`tools/pods/splice-known-sentence-clips.cjs`. **Nothing is reimplemented**: the
cut, the four splice gates and the publisher are `require`d from
`splice-sentence-clips.cjs`, which calls `scripts/splice-fork/splice.py`
unmodified. That tool's seam gate shipped fail-open twice during its build; a
second copy here would be a second chance to get it wrong.

What is genuinely different about the known side, and it is not cosmetic:

1. **The unit count is not ours to choose.** On the target side the number of
   pieces IS the number of cards. On the known side it is not: `splitRowUnits`
   pairs the known array in only when `knownClips.length === clips.length`.
   A known split of any other length is not a smaller win — the app ignores the
   whole array and the slot stays silent. So N comes from the row's *existing*
   target array, and anything else is refused.
2. **The known track has its own cast**, resolved exactly as `generatePodAudio`
   resolves a known work-queue item.
3. **A row with no target split is out of scope, not a failure.**

### The ten per-row gates

All measured on the row, none assumed from the course.

| | |
|---|---|
| G1 | target split present (N ≥ 2) |
| G2 | every target split id still resolves — the app's stale-slice guard is all-or-nothing across BOTH arrays |
| G3 | known text splits into exactly N parts |
| G4 | known script is splittable by the boundary regex |
| G5 | a whole-turn known clip exists to cut |
| G6 | the cast answers for this speaker's known track |
| G7 | **fidelity, text** — the whole-turn clip says THIS row's words |
| G8 | **fidelity, voice** — and is on the pod's known cast |
| G9 | **the variant-drill rule** — refuse a run currently split across two known voices |
| G10-13 | gap count, margin ≥ 1.5, seam silence (absolute AND relative to the piece's own peak), minimum piece duration |

G7 and G8 are the six-column fidelity check applied to the slot we are about to
derive N learner-facing clips from. Cutting a clip that says something else
produces N wrong clips that every audio gate passes, because the audio is
perfectly good — it is just not that line. That is exactly the defect the
split-array repair swept this morning.

G9 is Tom's variant-drill ruling (2026-08-24) via `tools/pods/variant-run.cjs`.
A run mid-repair must not have its breach multiplied by N — that makes the
character contradict itself on every card and makes the repair N times bigger.
A run wholly on one voice is the CORRECT state and is never flagged.

**17/17 tests green** (`splice-known-sentence-clips.test.cjs`), driving `planRow`
— the pure ten-gate verdict — through every branch. 14/14 still green on the
target tool.

### The publisher, hardened

`publishPiece` now checks the upsert's conflict key **before** writing and
throws rather than repointing an existing clip. That is the structural form of
the comment left behind after the target run repointed 28 clips: same text, same
voice, no gate fired, invisible. Verified on Italian — exactly 28 new
`course_audio` rows for 28 spliced clips, zero updates.

### Progress safety: nothing to migrate, and it was checked

`learner_pod_state` keys a split unit `<row.id>:s<k>`, and k runs over the
**target** clip array. This pass adds a known array and changes neither the unit
count nor any key. The content-change migration protocol is satisfied with no
migration: the learner's position is untouched; a slot that was silent starts
speaking.

---

## Verification

`verify-spliced-sentences.cjs` gained `--side=known` rather than a second
verifier — the known split fails in the same five ways, and two verifiers means
two sets of thresholds to drift. Two checks are new because the known side can
fail in a way the target side cannot: a written-but-ignored array (wrong
length → no known audio paired at all), and each unit's clip id asserted to be
the clip under inspection.

While building it, `appUnits` was found to resolve only one side's clip ids
before applying the stale-slice guard — so a pod with a known array made the
guard fire on ids the query had never fetched, reporting 12 parity failures
against a *correct* Italian pod. Fixed; both arrays are resolved now.

Italian was the sample and was verified before the fleet ran: all 87 usable
known splits serve, parse and seam clean through `saysomethingin.app/api/audio`,
0 parity failures.

A fleet-wide sweep followed. Across **20 courses / 1,432 rows**:

| check | failures |
|---|---|
| serves | **0** |
| parity | **0** |
| seams | **0** |
| text | 43 |

`swe` and `zho` were still sweeping when this was written and were passing at
that point; every course checked shows the identical pattern.

**All 43 text failures are on REUSED clips, none on a clip this pass cut.**
42 are the same words with different case and punctuation; the 43rd is a
pre-existing June defect described below.

### The one real consequence of this pass — and its floor

"Free before cut" reuses any clip already rendered under the dedup key. Some of
those are main-course `known` clips that store **normalised** text — `of course`
where the sentence reads `Of course.`, `wednesday` for `Wednesday.`. And
`splitRowUnits` takes the card's English line from the clip's stored text:

```ts
knownText: (knownClip && textById?.get(knownClip)) || kSents[i] || '',
```

So on 42 of 1,432 rows (2.9%) one card's translation line now reads `of course`
instead of `Of course.`. **The audio is correct**; the casing is not. Before
this pass those rows had no known array, so `kSents[i]` won and the text was
right.

This has a hard floor, not a workaround. `Of course.` and `of course` collide
under `normalizeForAudio`, so they are the SAME dedup key: a correctly-cased
sibling clip cannot be published without the upsert clobbering the shared
main-course clip, which the publisher's conflict-key check correctly refuses.
Editing the existing clip's text is worse — it is shared, and editing text
mutates audio links.

So the only two options inside this tool are (a) reuse and accept the casing, or
(b) refuse those turns and lose the per-sentence split on them entirely. I took
(a): the audio is right, the split is the win, and a lowercase card is a scuff
rather than a wrong answer.

**Recommendation, for Tom — a one-line fix, but in the other repo.** On the
KNOWN side the app has no reason to prefer clip text. It needs clip text on the
TARGET side because the Latin regex cannot split CJK; the known text always
splits. Swapping the precedence on that one line —

```ts
knownText: kSents[i] || (knownClip && textById?.get(knownClip)) || '',
```

— fixes all 42 at once, costs nothing, and cannot regress the target side. It is
learner-facing shared code in `ssi-learning-app`, so it is recommended here
rather than done.

### One pre-existing defect the sweep found

`gle_for_eng` row 54: its second known clip (rendered 2026-06-19) says
*"What ales do you have?"* while the row's text is *"What ales do you have on?"*.
The learner reads a word they never hear. **This pass did not touch that row** —
it was already split in June, so it took the `already_split` path. Reported, not
fixed: it needs a re-render or a text decision, neither of which is a splice.

## Files

- `tools/pods/splice-known-sentence-clips.cjs` + `.test.cjs`
- `tools/pods/splice-sentence-clips.cjs` — publisher hardened, `spliceAndGate`/`publishPiece` exported
- `tools/pods/verify-spliced-sentences.cjs` — `--side=known`
- `docs/pods/<course>-known-sentence-splice-2026-08-24-applied-log.json` × 22
- `docs/pods/<course>-known-sentence-splice-verify-2026-08-24.json` × 22
