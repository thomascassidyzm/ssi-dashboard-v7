# nap_for_eng — mis-pairing self-check on my own output

**2026-08-15 · scope: all 93 LEGOs and 86 component rows produced tonight (seeds 1–30)**

Run in response to the estate-wide scan that confirmed a defect class in existing courses: a LEGO
whose known side and target side do not correspond because one side was sliced from a *different
word in the same seed sentence* (ita_for_zho S0286L01, deu_for_zho S0225L02, fra_for_zho S0012L02,
fas_for_eng S0056L03). Since I am building with the same machinery, the question is whether I am
producing fresh instances.

## Headline

> **Zero instances of the estate defect.** No LEGO in this course has a known side or target side
> borrowed from a sibling LEGO in the same seed. **Zero missing LEGOs** — every word of all 30 seed
> sentences is taught by something.
>
> **One real defect of a different kind was found and fixed:** a duplicated *gloss* (not a
> mis-slice) at S25L2, where two learner-facing cards both read "before".

The strongest single piece of evidence is T1 below: I authored these LEGOs by hand as JSON and
posted them, so the submitted source can be diffed against the stored rows. **93 of 93 round-tripped
byte-identically — known side, target side, and every component.** On this pass the shared
machinery moved nothing.

---

## T1 — Round-trip: did the tool store what I submitted?

Diffs every stored `course_legos` row against the authored JSON that produced it.

| Checked | Known-side drift | Target-side drift | Component drift |
|---|---|---|---|
| **93 LEGOs** | **0** | **0** | **0** |

This is the test that most directly addresses "is the shared upstream tool mis-slicing". For
`nap_for_eng` it did not alter a single field. If the defect is in a slicing stage, that stage is
not on the `POST /api/seed/complete` path I used — it is somewhere else (a regeneration or
backfill pass, not the golden-path submission).

---

## T2 — Self-contradiction: same word, different counterparts

Every LEGO **and** component pair, 179 pairs in all, grouped both ways.

**7 known-side forks · 8 target-side convergences · 2 matching the estate "same-seed" signature.**

### The 2 same-seed hits — adjudicated

Both matched the signature's *shape* (same seed, same English gloss, two different Neapolitan
strings). Neither is a mis-slice; both are a gloss I duplicated when splitting a chunk.

| Hit | Verdict |
|---|---|
| **S10** "I can" → `pozzo` (LEGO) **and** "I can" → `me pozzo` (component) | **Not a defect.** `me pozzo` is `pozzo` with the reflexive clitic climbed off `arricurdà`. Pairing is correct; the component is `introduce:false`, so there is only one card. Gloss is imprecise — noted, not learner-facing. |
| **S25** "before" → `primma ca` (LEGO) **and** "before" → `primma` (component) | **REAL DEFECT — FIXED.** Both were `introduce:true`, so the learner met **two cards with the identical prompt "before" and two different answers**. A straight ZUT violation. |

**The fix applied to S25L2:** the component `primma` is now `introduce:false` — it remains as
tiling vocabulary but is no longer a card. `primma` does have a genuine separate life in the corpus
as an adverb ("earlier", S143, S309) and before a noun phrase (S237 `primma d''a fine`, S404
`primma 'e gioverì`), so it will get its own honest debut with its own gloss when the course
reaches that sense. **No text was changed** — only the `introduce` flag on the component and its
one generated phrase row — so no audio-relink trigger was touched. Re-verified afterwards: the
untaught-word check still returns **707 phrases, 0 violations**.

### The 5 cross-seed forks — all correct pairings, 3 imprecise glosses

| Gloss | Targets | Verdict |
|---|---|---|
| "you" | `tte` / `tu` / `te` | Three real Neapolitan forms — post-`cu` doubled, subject pronoun, object clitic. Correctly paired. Only `tu` is a card; the other two are silent. **No learner-facing collision.** Gloss should still be sharpened. |
| "I'm going to" | `aggi'a` / `m'aggi'a` | Same word with a climbed clitic. `m'aggi'a` is silent. Correct pairing, imprecise gloss. |
| "to" | `a` / `pe` | Two different infinitival/purposive prepositions; both silent, both placeholder glosses on a free-class word. Low severity. |
| "me" | `mme` / `m'` | Same word, two phonological forms. Both silent. Correct. |
| "talking" | `'e parlà` / `a parlà` | **My own boundary slip.** "talking" is `parlà`; the glue `'e` / `a` belongs to the governing verb (`fernì 'e` / `accumincià a`), not to "talking". Both silent, so nothing wrong reaches a learner, but the component boundary is drawn one word too wide. Logged for the next pass. |

### The 8 convergences — 7 deliberate, 1 scanner false positive

`parlà` ← to speak / speaking / to talk · `pruvà` ← to practise / to try · `ca` ← that / who ·
`'o nomme sujo` ← his name / her name · `sujo` ← his / her · `pecché` ← why / because · `jì` ←
to go / go. All are the methodology's sanctioned reception-direction convergence, and the first two
and `pecché` are written into `docs/pair-contracts/nap_for_eng.contract.cjs` as such.

The eighth — `'e` ← "of" / "and" — is a **false positive of my own scanner**, and an important one
(see below).

---

## T3 — Coverage: nothing unclaimed, nothing wrongly double-claimed

| | Result |
|---|---|
| Seeds where a word of the sentence is taught by **nothing** (missing-LEGO defect) | **0 of 30** |
| Overlapping-claim groups | 8 — **all intentional**, none a defect |

The 8 overlaps are all the methodology's own overlapping-LEGO mechanism, an A-LEGO deliberately
sitting inside an M-LEGO so the learner infers the join: `pruvà` inside `pruvà a parlà` (S5),
`chello ca` inside `chello ca voglio dicere` (S8), `pozzo` inside `me pozzo arricurdà` (S10),
`vulimmo` and `vedé` inside `ce vulimmo vedé` (S18), `fernì` inside `fernì 'e parlà` (S19),
`accumincià` inside `accumincià a parlà` and `parlà` inside `parlà 'e cchiù` (S23).

---

## Two false-positive classes the estate scan should know about

Both cost me real adjudication time and would fire on other languages.

**1. Apostrophe-stripping merges genuinely different words.** My first pass reported `'e` ("of")
and `e` ("and") as one target with two conflicting glosses. They are two different Neapolitan
words; the normaliser stripped the apostrophe that distinguishes them. Any scan that normalises
punctuation before comparing will manufacture this defect across every apostrophe-heavy
orthography — Neapolitan, and by the same logic Sicilian, Cornish, Breton. **Do not strip the
apostrophe on the target side.**

**2. Intentional overlap reads as double-claiming.** A methodology-compliant course *must* have
A-LEGOs nested inside M-LEGOs. That produced 8 "double-claimed word" hits in only 30 seeds — a rate
of roughly one every four seeds. A naive overlap detector run estate-wide will bury the real signal.
The discriminator that works: a real defect has the two rows pointing at *different* parts of the
sentence with swapped counterparts; intentional overlap has one row's target as a literal
**substring** of the other's, with glosses that nest the same way.

---

## Method, so the result is checkable

`.a108-nap/mispair-selfcheck.cjs` on this branch — reads `course_legos` and `course_seeds` straight
from the live database, diffs against the authored JSON in `.a108-nap/seeds-*.json`, and runs all
three tests. `.a108-nap/collide-exposure.cjs` reports whether each colliding gloss is actually a
learner-facing card or a silent `introduce:false` component. `.a108-nap/fix-s25l2.cjs` is the
one fix applied, and prints before/after.

**Limits of this check, stated plainly:** T1 and T3 need no Neapolitan. T2 catches a pairing that
contradicts *another pairing in the same course* — it cannot catch a pairing that is wrong
consistently everywhere, because there is nothing to contradict. Only a Neapolitan speaker closes
that gap, and the question list at
`docs/a108/nap-for-eng-native-speaker-questions-2026-08-15.md` is where those go.
