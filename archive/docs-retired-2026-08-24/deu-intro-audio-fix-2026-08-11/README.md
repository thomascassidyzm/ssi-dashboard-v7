# deu_for_eng — Intro audio / written-text divergence, 2026-08-11

Before-images and census for the live fix of the mismatch Deborah reported
("the spoken Intro doesn't match the written text; in the app it's a woman's
voice and it's wrong, in Popty it's correct").

## Files
- `census-deu_for_eng.json` — full census of all 43,197 audio references held by
  the course's 1,570 legos and 13,926 practice phrases.
- `before-images.json` — every row this pass writes to, captured immediately
  before the write. Row-by-row rollback.

## What the census found (learner-facing defects only)

| Class | Count |
|---|---|
| Intro (presentation) clip whose spoken script names a different English word than the one written on screen | **2 legos** |
| References still pointing at a row tombstoned `::superseded-regen` by the 2026-08-06 regen | **4 references** (2 distinct clips) |
| Known-clip text ≠ written known text | 0 |
| Target-clip text ≠ written target text | 0 |
| Referenced audio id with no `course_audio` row | 0 |
| Referenced clip belonging to another course | 0 |

### The two wrong Intros — both are within-seed mislinks

| Lego | Written on screen | Spoken by the Intro clip (transcribed) | Voice |
|---|---|---|---|
| S0213L02 | `to know` / `wissen` | "The German for 'to achieve', as in 'we don't know what they're trying to achieve', is" | `eve` |
| S0241L03 | `it` / `es` | "The German for 'to him', as in 'I said to him that I need more time today', is" | `eve` |

In both cases the clip that was linked is the Intro belonging to a *different
lego in the same seed* (S0213L01 is "trying to achieve"; S0241L01 is "to him").

### Replacements used — already existed, nothing was generated

| Lego | New Intro clip | Spoken (transcribed) | Voice |
|---|---|---|---|
| S0213L02 | `af9d3494-bb6c-4c80-83fb-8627928d0812` | "The German for 'to know', as in 'I don't need to know everything', is" | `xai_gfzdpspr5fdp` |
| S0241L03 | `80bd4255-37bf-4e45-aa15-a323fea4c16c` | "The German for 'it', is" | `xai_gfzdpspr5fdp` |

Both are the Intro clips already in service on the other lego that carries the
same known/target pair (S0045L02 `to know`/`wissen`, S0027L01 `it`/`es`), so the
German word introduced is identical. The "as in" example sentence for S0213L02
now comes from seed 45 rather than seed 213 — see Open item 1.

### The tombstoned references (S0001L01, "ich will")

`0f37d106…` (target1) and `695a757c…` (target2) were tombstoned
`ich will ::superseded-regen` by the 2026-08-06 regen but were still referenced
by lego S0001L01 and phrase `deu_for_eng:S0001L01B01`. Repointed at the regen's
own clips `823cf48a…` / `ca2c4e01…` (both `veracity_pass: true`, CER 0).

All four clips were transcribed and all four say "ich will", so this one was a
*bookkeeping* defect, not an audible one — the learner was not hearing the wrong
words here. It is fixed because a reference to a tombstoned row is a trap: the
next repair pass has no way to tell it is live.

## Open items, not fixed here
1. S0213L02's new Intro quotes a seed-45 example rather than its own seed-213
   sentence. Correcting that needs a new render — **no audio was generated, no
   approval was sought**. One clip.
2. 170 legos and 12,954 practice phrases have no presentation clip at all.
   Not a mismatch; recorded for scope.
3. 980 of the 2,372 linked presentation clips are still on the older `eve` /
   `xai_eve` voice while 1,392 are on `xai_gfzdpspr5fdp`. Their scripts all
   match their written text, so this is a voice-consistency question, not a
   correctness one.
