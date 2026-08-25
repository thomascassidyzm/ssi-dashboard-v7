# Kai's four picks are in the live Austrian course

**Course:** `deu_at_for_eng` · **Recordist:** Sascha, who uses they/them
**Applied:** 2026-08-25, 23:37Z · **Verified by reading the live database and bucket back afterwards**

Four phrases in seeds 1–9 that Kai rejected now play the spliced clips he picked. Every
millisecond of all four is audio Sascha already recorded. **No audio was generated. Nothing
was deleted. Not one S3 object was overwritten.**

## What he picked, and where it landed

| his pick | phrase | how it was cut | length | slots |
|---|---|---|---|---|
| `i-wue-p41` | **i wü** | start of *"i wü heit Deitsch reden"* · medium padding · 1 run | 940 ms | 3 |
| `reden-s48` | **reden** | end of *"i wü iatz Deitsch reden"* · wide padding · 1 run | 1010 ms | 3 |
| `i-wue-reden-g94` | **i wü reden** | *"i wü"* off *"i wü Deitsch lernen"* + *"reden"* off *"i wü iatz Deitsch reden"* · 190 ms gap · medium | 2050 ms | 1 |
| `long-on-your-half-c226` | **i wü iatz mit dir Deitsch reden** | *"i wü iatz"* + *"mit dir"* + *"deitsch reden"* · 50 ms gap at both joins · medium | 4515 ms | 2 |

**Nine slots, counted before anything was written and unchanged after:** 1 seed row, 2 lego
rows, 6 practice-phrase rows — spread over seeds 1, 5 and 7, because the little words are
reused (`reden` is a lego, a build phrase and a component phrase in seed 5; `i wü` the same
in seed 7). All nine were on the Azure synthetic `azure_de-AT-JonasNeural` before this.

**The fifth id in his export, `part-a1-p170`, was NOT applied.** It was a half-phrase pick
made before he settled the full line, and the full line he chose is built on a different
source (`part-a1-p161`, from *"i wü iatz Deitsch reden"*). Applying pick 4 does not depend on
it in any way — the manifest records `built_on_pick: part-a1-p161` — so it is superseded,
not a conflict, and nothing was resolved by guesswork.

## Why two instruments, not one

The brief named `swapClipInPlace` + `audio_revision`. That is exactly right for **half** of
this job, and the live data says which half:

- **The bytes.** Each of the four phrases already has a Sascha `course_audio` row — the take
  Kai rejected (`origin='human'`, `voice_id='human_sasha_wanasky_deu_at'`, `role='target2'`).
  Its *bytes* are the thing that is wrong, so the bytes are what got replaced:
  `swapClipInPlace` wrote the `course_audio_revisions` ledger row first, then pointed the row
  at the new object and bumped `audio_revision` 1 → 2. **The row id never moved.** Checked
  first: none of those four rows is bound to any other slot, so a byte swap cannot reach past
  the phrase it belongs to.
- **The binding.** Those four rows were bound to **no slot at all** — the nine slots pointed
  at the Azure twin. Putting a human voice back into a slot is a foreign-key repoint, not a
  byte swap: the Azure row is untouched and still there. `target2_duration_ms` moved with the
  FK, because the player reads that column for its pause timing
  (`CourseDataProvider.ts:304`); leaving it at the Azure clip's 1824 ms would have cut a
  940 ms clip's silence wrong.

**Order, deliberately: upload → verify → swap bytes → repoint.** The byte swap happens while
the row is bound to nothing, so no learner can hear a half-finished state; the repoint is the
single instant anything audible changes, and it moves each slot from one live clip straight
to another. **No slot is NULL at any instant.**

Before any database write, each new object was proved present with `HeadObject` **and its own
`coursecode` user metadata read back as `deu_at_for_eng`** — the check that caught five
"Austrian" takes being Welsh in job #628.

## Read back from live state afterwards

| | |
|---|---|
| slots now on the picked clip | **9 / 9** |
| slots with a stale `target2_duration_ms` | **0** |
| empty (`NULL`) audio slots on any affected row | **0** |
| `course_audio_revisions` rows for revision 2 | **4** |
| seed 1–9 slots on a Sascha take | **236** (was 227, + the 9) |
| seed 10+ slots on a Sascha take | **0** — the earlier unlink is undisturbed |
| S3 objects deleted | **0** — all four superseded objects still in the bucket |

## Reversing it

One command reverses the entire batch — slots back to the Azure clip they held (guarded: a
slot something else has moved is reported, not clobbered), and the four rows back onto their
previous objects, which were never deleted:

```
node tools/deu-at-splice/apply-picks.cjs --rollback \
  scripts/deu-at-splice/apply-picks-2026-08-25T23-37-15-920Z.json
```

(from `/home/tomcassidy/SSi/wt-deuat-unlink`, the checkout the batch file lives in.)

## What his picks encode — a proposed default rule

His four choices are consistent enough to be a rule rather than four decisions, and stating
it back means nobody has to ask him again for the next course. **Proposed, for him to confirm
or correct:**

1. **Padding: medium by default; wide on a cut taken off the END of a line.** Three of four
   are medium. The one wide pick is the suffix cut (`reden`, off the end of a take) — the
   place mastering leaves least room, so the extra margin is protecting the final consonant.
   Prefix cuts (`i wü`, off the start) take medium.
2. **The gap between joined pieces depends on what is being built, not on how many pieces.**
   Two standalone words joined into a two-word phrase get **190 ms** — an audible boundary,
   about a third of Sascha's own 523 ms-per-word pace, so the learner hears two words. Joins
   *inside* a longer sentence get **50 ms** — near-continuous, so the line sounds like one
   utterance rather than three clips in a row. It is the same instinct both times: the seam
   should sound like whatever the phrase is meant to be.
3. **Where the material is ambiguous, build both and label them.** He picked a "1 run of
   speech" reading of *"i wü"* over the two-run reading, having been shown both. That is only
   possible because the tool offered versions instead of a guess, and it should keep doing so.

Concretely, for the next course's splice bench: default `padding=mid`, `padding=wide` for
suffix cuts, `join=g190` for standalone multi-word phrases, `join=g50` for joins inside a
sentence — and still offer the alternatives underneath.
