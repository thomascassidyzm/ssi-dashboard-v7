# fin_for_eng — the formal register, walked

**2026-08-17 · applied: 17 phrases · for Kai to rule on: 19 + 4 open questions · audio generated: none**

Kai's ruling, in three parts, the last one dissolving the knot the first two created:

> 1. The speaker speaks formally too — full `minä`/`sinä` forms, not `mä`/`sä`.
> 2. `herra` may only be practised with formal-**compatible** legos — nothing that has a more
>    formal version arriving later.
> 3. *"Phrases don't have to be full phrases, they don't need to include minä or sinä. Get
>    creative… The full phrases will come. And herra is an easy lego that'll get drilled and
>    drilled with longer phrases soon."*

---

## The one fact that shaped everything

**`minä` and `sinä` appear nowhere in this course.** Zero seeds, zero legos, zero phrases, across
all 668 / 1,425 / 14,123. So does `hän`. So does `kyllä`. The course is colloquial throughout —
5,777 phrases carry `mä`.

That is why ruling 1 could not simply be applied: it asks for a word the learner has never met.
Ruling 3 resolves it — **go pronoun-free**. Finnish 1sg endings are unambiguous, so `kysyin`,
`tiedän`, `voin` are complete and standard on their own.

## The second fact, which decided *which* rows could move

The tiling gate never splits a chunk (`validation.cjs:268`). The pronoun is **bundled into the
chunk**: `mä kysyn` is a chunk, `kysyn` alone is not. So deleting `mä` is only legal where the
bare verb already exists as its own component.

I measured this against the real validator rather than guessing. Of 36 candidate rows:

| | |
|---|---|
| **tile cleanly — applied** | **17** |
| blocked on a chunk that does not exist | 19 |

The 19 are blocked on `haluan`, `olen`, `näen`, `kysyn`, `kanssani`, `mielestäni`, `minua`,
`kyllä` — **none of which exists anywhere in the course.**

---

## What was applied — the walk

All 17 are the same edit: delete `mä`, change nothing else. **The English is untouched in every
one**, so no prompt changed and no audio link could move.

**S0639L01** *with you* — 3 phrases
`mä haluaisin puhua teidän kanssanne` → **haluaisin** puhua teidän kanssanne ·
`saisinko mä puhua teidän kanssanne?` → **saisinko** puhua teidän kanssanne? ·
`mä haluaisin olla teidän kanssanne` → **haluaisin** olla teidän kanssanne

**S0639L02** *herra* — 1 · `mä haluaisin puhua teidän kanssanne, herra` → **haluaisin** …

**S0642L01** *how are you* — 3 · `mä kysyin,` → **kysyin,** · `mä tiedän,` → **tiedän,** ·
`mä kuulin,` → **kuulin,** *(… miten te voitte, herra)*

**S0642L02** *rouva* — 1 · `saisinko mä puhua teidän kanssanne, rouva?` → **saisinko** …

**S0645L01** *teitä* — 4 · `mä voin auttaa teitä` → **voin** auttaa teitä ·
`mä voin auttaa teitä, herra` → **voin** … · `mä haluaisin auttaa teitä, rouva` → **haluaisin** … ·
`saisinko mä auttaa teitä, rouva?` → **saisinko** …

**S0648L01** *you said* — 3 · `mä kuulin,` → **kuulin,** · `mä tiedän,` → **tiedän,** ·
`mä en muista,` → **en muista,** *(… mitä te sanoitte)*

**S0653L01** *do you mind* — 2 · `haittaako teitä, jos mä puhun, rouva` → `… jos **puhun**, rouva` ·
same with `herra?`

---

## Gates — run at apply, delta measured

| gate | before | after |
|---|---|---|
| containment | PASS | PASS |
| `checkVocabViolations` (DP tiling) | PASS | **PASS — this is the gate that chose the 17** |
| `checkPhraseZUT`, prior seeds | 0 | 0 |
| `checkPhraseZUT`, whole course | 4 multi-target prompts | **4 — delta zero** |
| `checkPhraseComplexity` | 7/7 baskets FAIL | 7/7 FAIL — **0 broken, 0 fixed** |
| vocative availability | — | **17/17 PASS** |
| NFC / control chars | clean | clean |

**Two gate "failures" were run down and proved to be artefacts, not defects:**

- **17 ZUT-all hits** — the gate compared each new target against the DB row it was *about to
  replace*, so every row collided with its own old self. Proved by building the post-state and
  re-checking: **all 17 edited prompts have exactly one target afterwards**, and course-wide
  multi-target prompts are 4 before and 4 after.
- **5 vocative-order hits** — my own harness bug (rows with *no* vocative defaulted to `rouva`)
  plus an over-strict rule that forbade a phrase using the vocative of *its own card*. Corrected
  check: 17/17 pass.

## Verification after the write

Against a full pre-apply backup (30 seeds / 34 legos / 379 phrases):

- **379 block rows before and after** — an in-place edit adds nothing
- **exactly 17 changed, all intended, all carrying exactly the proposed text, 0 unexpected**
- **0 seed approval/status drift** course-wide (104 seeds carry `approved_at`; none is in scope)
- totals unchanged: 668 / 1,425 / 14,123
- NFC clean on read-back
- written in **one transaction**, every `UPDATE` guarded on `id + known_text + target_text`, so a
  drifted row would have aborted the whole apply

## Audio

**None generated, none required, nothing deleted.** 313 `course_audio` rows, **every one
`language='eng'`** — zero Finnish audio. All 17 edited rows carry no audio on any column. The 3
`known_audio_id` links that exist course-wide are English prompts at seeds 142/147/168, nowhere
near this block. No audio pass queued: the course is 100% unvoiced on the target side, so a pass
would push ~14,000 phrases into the render queue — a cost decision for Kai, not housekeeping.

**Learner impact: none.** `status='draft'`, `new_app_status='not_available'`.

---

# The answers Kai asked for

## Rule 4 — the te-plural question. Both are seed-tied, so neither was fixed.

His two flagged cases are **the complete set** — an exhaustive sweep of every seed below 656 found
nothing else, corroborated by a second pass using a different method.

- **S0133L02** *you work* → `te teette töitä` — seed: *"Sä tutustut johonkuhun tosi hyvin, kun **te
  teette** töitä yhdessä"*
- **S0501L03** *you play together* → `te pelaatte yhdessä` — seed: *"…että **te pelaatte** yhdessä
  ilman riitelyä"*
- **S0529L01** *can you all* → legitimate plural, English says "you all". Not a defect.

**How it happened.** Both seeds genuinely mix singular `sä` in one clause with plural `te` in
another, and the Finnish is arguably *correct* for the meaning — it is the English that collapses
both onto one undifferentiated "you". The clincher: **`S0133L02`'s own `components` entry already
glosses `te` as "you all"**. The plural was known at decomposition time and simply never reached
the headline card. This is a glossing gap, not an injected error. Both predate every campaign in
this repo (present in a snapshot dated 2026-08-06).

**A fix exists that touches no seed:** reword the lego's English to *"you two work"* — one cell, no
tag, no Finnish change. **Not applied — Kai's call.**

## Rule 5 — the tags

Complete census of every parenthetical in the course: **exactly two classes.**

- **`(formal)`** — 19 legos + 20 phrases. **Not yet removed, and here is why.**
- **`(all)`** — one lego, `S0664L01 ready (all)` → *valmiita*. Non-register; listed, not touched,
  per instruction.

**The blocker, measured.** Stripping `(formal)` is not a text edit — it collapses 10 cards into a
ZUT violation, because the tag is the only thing distinguishing them from their informal twin:

| card | becomes | collides with |
|---|---|---|
| S0647L01 you speak | `te puhutte` | S0013L01 *you speak* → `sä puhut` |
| S0643L01 do you want | `haluatteko te` | S0156L01 → `haluutko sä` |
| S0644L01 could you | `voisitteko te` | S0061L03 → `voisitko sä` |
| S0648L01 you said | `te sanoitte` | S0078L02 → `sä sanoit` |
| S0652L01 you need | `te tarvitsette` | S0170L02 → `sä tarviit` |
| S0653L01 do you mind | `haittaako teitä` | S0190L01 → `haittaako sua` |
| S0654L01 i'm not sure | `en ole varma` | S0010L01 → `mä en oo varma` |
| S0655L02 you're doing well | `te pärjäätte hyvin` | S0072L01 → `sä pärjäät hyvin` |
| S0639L01 with you | `teidän kanssanne` | S0001L04 → `sun kanssa` |
| S0660L01 you all | `teitä kaikkia` | S0657L01 *you all* → `te kaikki` |

Kai's answer is that the vocative carries the register instead. **But it cannot live inside the
card's Finnish** — I measured that: if each formal card absorbs its vocative (`te puhutte` →
`te puhutte, rouva`), **only 12 of 179 phrases still contain their own card. 167 containment
failures**, because real phrases put material in between (`miten te voitte **tänään**, rouva`).

So the signal has to be the card's **English** (`you speak, madam` → `te puhutte`), which satisfies
ZUT and needs no parenthetical — at the cost of the English naming a word the chunk itself doesn't
contain. **That is a design call, not housekeeping, so the tags stay until Kai rules.** Removing
them without the replacement signal would put 10 ZUT violations into the course.

## Rule 6 — the 7 `se`-for-a-person phrases: **not fixed, and honestly blocked**

Kai's rule is *hänen/hän in formal, or absence*. **`hän` does not exist in this course** — so
option one is unavailable without introducing it, which is a new card and his call. Option two
(restructure away from the third person) is available but every wording manufactures a near-twin of
a phrase already in the same basket. Both routes need a decision, so all 7 are held.

---

# Open for Kai — 4 questions

1. **`joo` → `kyllä`.** Ruled, but **`kyllä` appears 0 times course-wide**, so obeying it introduces
   an untaught word. Note `joo, herra` *passes* the vocabulary gate — it fails only the register
   rule, so this is a content decision. Introduce `kyllä` as its own lego in the block, drop the
   two rungs, or leave them?
2. **`olen täällä, herra` (`S0639L02B03`) is a live defect, independent of register.** `olen`
   occurs **exactly once in the whole course — in this phrase**, and is taught nowhere. The tiler
   cannot start on it: `✗ UNTILEABLE [olen täällä herra]`. **This row would be rejected by
   `/api/seed/complete` today**, which implies a write path that bypassed the gate. Worth tracking
   separately from this job.
3. **The 19 blocked rows.** They need either new chunks (`haluan`, `olen`, `näen`, `kysyn`,
   `minua`, `kanssani`, `mielestäni`) introduced, or rewording onto what exists — e.g. `mä haluun`
   → `haluaisin` shifts *want* to *would like*, which changes the English. Rewording is available
   for all 19; it is authoring, and it should be done deliberately rather than batched.
4. **Seed 655.** Its own sentence is `Mun mielestä te pärjäätte tosi hyvin, rouva` — a formal seed
   carrying colloquial first person. Fixing it needs `mielestäni` (untaught) and cascades to card
   `S0655L01 in my view`. **Left alone**; it is the one seed the ruling genuinely reaches.

## Explicit gaps

- **Nothing here has been read by a Finnish speaker.** The 17 applied edits are a mechanical
  deletion of one word from text a Finnish author wrote.
- **`sinä` has zero rows.** That half of the ruling is unexercised in this block — not skipped.
- The `(formal)` tag is the only machine-readable register marker: the
  `course_practice_phrases.register` column is **NULL on all 14,123 rows**.
- The Supabase pooler was down for ~90 minutes mid-job (estate-wide load). Every number in this
  document was measured after it returned, against a fresh dump.
