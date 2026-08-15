# lmo_for_eng — Lombard for English speakers: decomposition build

**Date:** 2026-08-15 · **No audio of any kind was generated.** The course still holds exactly the 1 pre-existing `welcome` clip it had when I started.

---

## 1. How far the build got, in numbers

| | |
|---|---|
| Seeds decomposed and banked | **29** (seeds 1–25, 27–30) |
| Seeds deliberately deferred | **1** (seed 26 — reason in §6) |
| LEGOs created | **86** |
| Practice phrases created | **636** (245 BUILD, 391 USE) |
| USE-phrase self-assessed average | **7.70** |
| Audio generated | **0** |
| Seeds remaining undecomposed | **639** of 668 |

Every one of the 29 was accepted by the course-builder API's own validation (`POST /api/seed/complete`), which gates tiling, ZUT, vocabulary, the known-side controlled-language rule, syllable caps and phrase counts atomically before writing anything.

---

## 2. THE PREMISE IN THE BRIEF WAS WRONG — corrected against the live database

The brief said "a 300-seed standard-tier build" and flagged that the tier was inferred rather than read. **It is not 300. `course_seeds` holds 668 rows for `lmo_for_eng`, numbered 1–668 with no gaps and no empty targets.**

Corroborating evidence that 668 is the real corpus, not padding:

- I diffed the English known side against `nap_for_eng` (Neapolitan), which is a confirmed 668-seed build. **654 of 668 known texts are byte-identical**; the 14 that differ, differ *only* by the language name ("I want to speak **Lombard** with you now" vs "…**Neapolitan**…"). This is the shared estate English corpus at full flagship length.
- `courses.seed_count` is `NULL` for this course, which is why a census that reads that column would fall back to an inference. The row count is the truth.

**So this is a 668-seed flagship-shaped corpus, and 29 seeds is 4.3% of it.** I have not silently stopped at an imagined 300.

---

## 3. Variety and orthography — established from the corpus, with counts

Counted across all 668 target sentences. Apostrophes were treated as letters, never stripped (see §5).

**Verdict: Western Lombard (Milanese), in the Classical Milanese orthography. The result is not close.**

| Western / Milanese marker | occurrences / distinct seeds |
|---|---|
| `minga` (negator) | 158 / 153 |
| `el` (masc. article) | 162 / 141 |
| `on` / `ona` (indef. article) | 120 / 118 |
| `oeu` digraph (`voeuri`, `incoeu`) | 112 / 107 |
| `pussee` (more) | 34 / 34 |
| `quajcoss` (something) | 24 / 24 |
| `tucc` (all) | 9 / 9 |
| `adess` (now) | 7 / 7 |

| Eastern / Bergamasque–Brescian marker | occurrences |
|---|---|
| `mia` as negator | **0** (see note) |
| `briza` | 0 |
| `piö` / `piu` | 0 |
| `ergot` / `argota` | 0 |
| `ö` `ü` `ä` umlauts | 0 |
| `chèl` | 0 |

**Note on `mia`:** a naive string count finds 11 hits, which would look like the Eastern negator. I read all 11 and every single one is the feminine possessive "my" — `la mia mamma` (S181), `la mia camera` (S463), `la mia sorella` (S594). **Zero are the negator.** Eastern markers are a true zero, not a near-zero.

Orthographic convention:

| Feature | count | reading |
|---|---|---|
| `oeu` digraph | 112 occurrences / 107 seeds | Classical Milanese |
| umlauts `ö ü ä` | **0** | rules out Ticinese/unified umlaut systems |
| circumflexes | **0** | rules out Scriver Lombard |
| grave accents `à è ì ò ù` | 704 / 445 seeds | Classical Milanese |
| elision apostrophes (`l'è`, `gh'hoo`) | 371 / 304 seeds | Classical Milanese |
| distinct `-à` infinitive forms | 85 (`parlà`, `imparà`, `regordà` …) | Classical Milanese |

**Recommended authority.** Kai has ruled that the Neapolitan course follows Neapolitan Wikipedia's conventions. The equivalent here is the **Circolo Filologico Milanese / Cherubini classical orthography**, which is what Lombard Wikipedia's Western articles and the standard Milanese dictionaries use, and which this corpus already follows. I recommend adopting it explicitly rather than leaving it implicit — because of §4.

---

## 4. INTERNAL INCONSISTENCY IN THE EXISTING TRANSLATION — found, with counts

The corpus is **not** internally consistent. The Classical Milanese convention uses a doubled consonant to mark a short preceding vowel, and the existing translation applies it in some seeds and not others — **the same word, spelled two ways**. I did not normalise any of this; it is the translator's call, not mine.

| Word | spelling A | spelling B |
|---|---|---|
| "before/first" | `prima` ×6 (S25, S281, S309) | `primma` ×6 (S119, S143, S237) |
| "thing" | `robba` ×8 (S47, S243, S257) | `roba` ×4 (S116, S143, S480) |
| "good" (f.) | `bonna` ×4 (S47, S189, S541) | `bona` ×3 (S123, S124, S125) |
| "week" | `settimanna` ×3 (S38, S52, S59) | `settimana` ×6 (S186, S214, S237) |
| "answer" | `resposta` ×1 (S17) | `risposta` ×5 (S66, S105, S225) |
| "they are" | `hinn` ×13 | `hin` ×2 (S572, S574) |
| "no" | `nò` ×7 | `no` ×22 |
| "up/on" | `su` ×10 | `sù` ×3 (S437, S513, S527) |

Note S143 contains *both* `primma` and `roba` — the drift is within-seed, not just across seeds, so it is not a clean "early vs late pass" split I could correct mechanically.

**This directly affected my build.** Seed 17 gave me `la resposta`, so the LEGO "what the answer is" → `quala che l'è la resposta` is banked with the **minority** spelling (1 of 6 occurrences corpus-wide). If Kai rules that `risposta` is canonical, that LEGO's text and — per Kai's standing rule — the presentation that introduces it must both be corrected in the same pass. **Flagging it now rather than letting it become a silent defect.**

---

## 5. Self-check for the estate mis-pairing defect — result with method

The defect: a LEGO's known side and target side fail to correspond because one side was sliced from a *different word in the same seed sentence*. I ran this on my own 86 LEGOs and 636 phrases straight out of the database.

**Result — all figures are on my own fresh output:**

| Test | Method | Result |
|---|---|---|
| **T1 round-trip** | diff authored JSON against stored rows: known, target, and every component | **86 of 86 byte-identical, 0 drift** |
| **T2 self-contradiction** | same known → different targets, or same target → different knowns, across every LEGO *and* component pairing | **0 known-side forks. 0 same-seed cases** (the estate signature) |
| **T3 missing LEGO** | every word of each seed target must be claimed by some LEGO | **0 seeds with an unclaimed word** |
| **T3 double-claiming** | overlap classification (discriminator below) | 3 intentional nested overlaps, **1 flagged → adjudicated false positive** |
| **T4 untaught-word rule** | every phrase must tile from chunks introduced at or before its own LEGO | **636 phrases checked, 0 violations** |
| **T5 reconstructability** | each seed target must rebuild from its own LEGOs plus prior vocabulary | **29 of 29 reconstruct, 0 failures** |

**T2 found 2 convergences, both deliberate and both correct** — different English, same Lombard, which ZUT explicitly permits and which teaches the unification cheaply:
- `el sò nomm` ← "his name" (S20) *and* "her name" (S21). Lombard `sò` agrees with the thing owned, not the owner.
- `perchè` ← "why" (S21) *and* "because" (S22).

Both are cross-seed, not same-seed. The estate signature is same-seed. **Zero same-seed cases.**

### The one flag, adjudicated

S3: L2 `"more" → pussee` vs L4 `"as often as possible" → pussee spess che se pò`. The targets nest (`pussee` is literally inside the longer chunk) but the *glosses* do not — English builds "as often as possible" without the word "more".

I verified this against the whole 668-seed corpus rather than accepting or dismissing it: `pussee` = "more" is consistent everywhere (`parlà pussee` = talk more S23; `on poo pussee de temp` = a little more time S54; `pussee adasi` = more slowly S90; `pussee important` = more important S137), and `pussee X che se pò` is the fixed "as X as possible" frame, mirrored at S50 (`pussee a la svelta che se pò` = as quickly as possible). **Neither LEGO borrowed the other's material. Not a defect.**

**This is a third false-positive class worth adding to the two already circulating**, alongside apostrophe-stripping and intentional overlap: *cross-linguistically idiomatic nesting* — the target nests but the gloss cannot, because the two languages build the idiom from different pieces. The "glosses must nest the same way" half of the discriminator produces a false positive whenever an idiom is non-compositional across the pair. The surviving reliable test is the one already stated: a real defect has two rows pointing at **different parts of the sentence with swapped counterparts**.

### The two inherited false-positive classes were both live here

- **Apostrophes.** I kept the apostrophe as a letter on the target side and stripped it only on the English side. This mattered: Lombard has `l'è`, `l'ora`, `gh'abbia`, `gh'hoo`, `t'ee`, `s'è`, `on'amisa` — 371 elision apostrophes across 304 seeds. Stripping them merges `l'è` ("it is") with `le`, and `d'ona` with `dona`/`donna`. The check would have manufactured false contradictions.
- **Intentional overlap.** Fired 4 times in 29 seeds — about the same 1-in-4-seeds rate reported for Neapolitan — and 3 resolved as correct nesting automatically.

### The honest limit of this result

**A clean self-check does not mean the content is verified correct.** The self-contradiction test only catches a pairing that contradicts *another pairing in the same course*. It is structurally blind to a pairing that is wrong **consistently everywhere**, because nothing contradicts it. Neither I nor Kai speaks Lombard. Only a native speaker closes that gap — which is what §7 is for.

---

## 6. Seed 26 — deferred, not failed

**S26** `"I like feeling as if I'm nearly ready to go."` → `me pias sentimm come se fussi squas pront a andà`

The tail `sentimm come se fussi squas pront a andà` is 11 syllables and the API's 8-syllable LEGO cap correctly rejected it as one chunk. Splitting it is the right answer — but every split leaves a middle LEGO (`pront a andà` "ready to go", or `sentimm come se fussi` "feeling as if I'm") that **cannot head a complete USE sentence with the vocabulary available at seed 26**, because no copula chunk exists yet. The first one, `l'è` ("it's"), arrives at seed 28.

I could have met the 5-USE minimum with padded fragments. The methodology explicitly says to reduce the USE count rather than submit fragments, and the validator's minimum would have forced padding, so **I deferred the seed instead of shipping five bad phrases into the eternal spaced-repetition pool.** Two clean fixes, both Kai's call:

1. Introduce a copula LEGO (`l'è`) before seed 26 — it exists in the corpus at S28 and reordering is cheap; or
2. A native speaker confirms `pront a andà` can head a phrase on its own (question 18 below).

---

## 7. QUESTIONS FOR A NATIVE MILANESE SPEAKER

Each is written so a speaker can answer it without knowing anything about our software. **This list is a deliverable, not a shortfall** — these are the points where I refused to guess.

**Spelling — needs a ruling, affects banked content**
1. The corpus spells the same words two ways: `prima`/`primma`, `robba`/`roba`, `bonna`/`bona`, `settimanna`/`settimana`, `resposta`/`risposta`, `hinn`/`hin`, `nò`/`no`, `su`/`sù`. Which spelling is correct in each pair? (`resposta` vs `risposta` is urgent — it is already banked in a LEGO.)

**Words I had to split or join, where I may have drawn the line wrong**
2. `con tì` (with you, S1) but `cont on olter` (with someone else, S5). Is `cont` simply `con` before a vowel, or a different word? I taught them as two separate whole chunks to avoid teaching a contradiction.
3. `andà via` = "to go" (S25) but `pront a andà` = "ready to go" (S26). Does `via` ("away") have to be there in one and not the other?
4. `cominciaroo prest **a parlà**` (S23) and `comincià **a parlà**` (S28). Is the linking `a` obligatory after "start"? I taught "to talk" → `a parlà` as a single chunk including it.
5. `sforzamm` (S7) — I glossed it "to try hard". Is that right, or is it more like "to push myself"? Does the `-mm` ending mean it always refers back to the speaker, so a learner could not say it about someone else?
6. `pussee che poss` (S7) — I glossed it "as much as I can". Is that right? Does `poss` change to `podet` when talking about "you"?
7. `sentimm` (S26) — "feeling". Does this always mean "feel *myself*"? I could not build phrases on it alone, which is why seed 26 is deferred.
8. `mettegh tropp temp` (S27) — "taking too much time". Can this whole chunk follow other verbs unchanged, e.g. `voeuri minga mettegh tropp temp` ("I don't want to take too much time")? I used it that way in practice phrases.
9. `vedi minga l'ora de` (S29) — "I'm looking forward to". It contains `minga`, which everywhere else means "not". Will a learner mis-hear this as a negative? Is there a less confusing way to say it?
10. `domandatt` (S30) — "to ask you", with "you" stuck on the end. Can it follow any verb, e.g. `provaroo a domandatt` ("I'm going to try to ask you")?

**Things I asserted that a speaker should confirm or reject**
11. `el sò nomm` is banked for **both** "his name" and "her name". Confirm Lombard does not distinguish these.
12. `perchè` is banked for **both** "why" and "because". Confirm one word does both jobs.
13. `voeuri che te parlet` (S15) — "I want you to speak". I reused `te parlet` unchanged from "you speak" (S13). Does the verb need to change after `che`?
14. `trovass` (S18) = "to meet". It looks reflexive ("meet each other"). Can it take `con` + a person — I wrote `trovass con tucc i olter` ("meet with everyone else") in a practice phrase.
15. `me pias` + a plain infinitive — I wrote `me pias parlà lombard` ("I like to speak Lombard"). Is anything needed between them?
16. Word order: I put time words (`incoeu`, `stasira`, `doman`, `jer`) at the **end** of every phrase I generated, copying the seeds. Is end position always natural, or does it sometimes belong at the front?
17. I never generated a new verb form. Every practice phrase is a recombination of chunks that already appear somewhere in the 668 seeds. Please still spot-check: do any of the 636 combinations produce something a Milanese speaker would not say?
18. Can `pront a andà` ("ready to go") stand at the head of a sentence on its own, or does it always need something before it? (This unblocks seed 26.)

---

## 8. EXPLICIT GAPS — reported, not papered over

1. **639 of 668 seeds are still undecomposed.** I built 29. This is 4.3% of the corpus. The course is **not** built; it is calibrated and started.
2. **Three sub-workers died on an account limit** (`#687` orthography census, `#688` builder mechanics, `#692` blind alignment — all exited 1 with "hit kai-gmail's limit"). I retried two as **`#705`** (blind alignment) and **`#706`** (orthography census); at the time of writing they had not reported back. **Everything in §3 and §4 above I therefore computed myself rather than waiting** — the counts are mine and reproducible from `.a108-lmo/`. I dropped the builder-mechanics retry because I had already answered it empirically by building 29 seeds through the API successfully.
3. **The independent blind alignment did not land.** Its purpose was a second, independently produced English↔Lombard alignment to diff against mine — disagreements between two independent alignments are the sharpest available probe for the mis-pairing defect. **My §5 result therefore rests on self-consistency checks alone, not on an independent second opinion.** That is a real weakening of the evidence and I am not claiming otherwise.
4. **No native-speaker verification exists for any of this.** See the limit stated at the end of §5.
5. **Seed 26 deferred** (§6).
6. **No pair-contract file exists** at `docs/pair-contracts/lmo_for_eng.contract.cjs`. Per the methodology the known-side gate silently skips when the contract is absent — so an un-contracted course is never wrongly blocked, but it is also never checked against pair-specific rules. Writing that contract is the natural next task and should encode the §7 rulings once a speaker gives them.

---

## 9. Quality bars — how each was actually enforced

- **Untaught-word rule.** Checked *as built*, not after: I wrote a pre-flight lint (`.a108-lmo/lint.cjs`) mirroring the API's gates and ran it before every submission. It caught 16 violations in seeds 26–30 alone before they ever reached the API. Independently re-verified from the database afterwards: **636 phrases, 0 violations.**
- **ZUT.** 0 known-side forks across all 86 LEGOs and their components. The 2 convergences are deliberate.
- **Presentation-matches-LEGO-text.** No LEGO text was changed after insertion, so no presentation has fallen out of sync. The one live risk is the `resposta`/`risposta` ruling in §4 — if that changes, both must move together.
- **Methodology followed** per `ralph-methodology.md`: overlapping A-inside-M LEGOs as the teaching mechanism, non-greedy introduction, BUILD-plugs-into-prior-vocabulary, USE as complete sentences only, the graduated early-seed phrase ramp, and the 8-syllable cap.
- **One deliberate departure, stated:** I glossed several grammatical frames as whole single-component M-LEGOs (`son dree a provà a` = "I'm trying to", `vedi minga l'ora de` = "I'm looking forward to", `prima che gh'abbia de` = "before I have to") rather than atomising their parts. This follows the methodology's construction-features rule — `dree a` and `gh'` are not units of intention and glossing them alone would be a category error — but it means the learner meets them only as wholes. Questions 4, 8 and 9 in §7 are where a speaker should check that call.
