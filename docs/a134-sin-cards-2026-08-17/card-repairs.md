# eng_for_sin — the broken-card set, repaired (A-134, step 4)

**Date:** 2026-08-17 · **Branch:** `fix/sin-cards-2026-08-17` (off `fix/sin-27-seed-rebuild-2026-08-17`)
**Course:** `eng_for_sin` — English for Sinhala speakers. The **known/prompt side is Sinhala**, the target/answer side is English. All audio here is known-side Sinhala, Azure `si-LK-SameeraNeural`.

Every claim in the work order was re-verified against the live database before any write. One of my own proposals was refuted by that process and withdrawn; so was one the work order had already flagged as milder. **21 rows changed, 21 verified live, 0 clips deleted.**

---

## Headline

| | |
|---|---|
| Rows changed | **21** — 7 cards, 3 seed rows, 11 practice phrases |
| Corrupt strings remaining course-wide | `දිහා` **0**, `නනිකු` **0**, `ගොඩ ඉස්සර` **0**, `වඩා දිගු` **0** (each was non-zero before) |
| Clips rendered | 17, all passing 7 gates on the **first** attempt; 4 more served by reuse |
| Clips deleted | **0** — make-before-break throughout |
| New ZUT collisions | **0** (course-wide total flat at 167 before and after) |
| Introduced-before-used violations | **0** of 21, under a Unicode-aware gate |
| Learner progress migrated | **none needed — `eng_for_sin` has 0 progress rows** (verified, see below) |
| Withdrawn after my own adversarial pass | **S0382L04** (my proposal was wrong) and **S0080L01** (no defensible repair) |

---

## Part A — S0275L01 "longer". The prior analyst's explicit gap is closed.

The prior analysis called this unrepairable without a Sinhala speaker: the card read `වඩා දිගු` ("more long", physical length) and all its phrases used `ගොඩ ඉස්සර`, so *"I want to wait longer"* was drilled as roughly *"I want to wait much earlier."*

**Both halves of that diagnosis are confirmed, and I attacked the second one specifically.** `ඉස්සර` occurs 25 times in this course and means "early" (seed 277, *"an important meeting early"*) or "ahead/before" (seed 480, *"it's not far ahead now"*). It never expresses duration anywhere. So `ගොඩ ඉස්සර` = "much early". Confirmed.

### What I did NOT have to invent

The work order floated `වැඩි වෙලාවක්`. It is right, and — contrary to the prior finding — **the course already owns both halves of it**:

| piece | status in the course | first seen |
|---|---|---|
| `වැඩි` "more", **adjectival, before a noun** | 17 occurrences, e.g. `ටිකක් වැඩි කාලය` = *"a little more time"* | seed 96 |
| `වෙලාවක්` "a while / a time" (a **noun**) | 65 occurrences; card `S0092L02` = `ටිකක් වෙලාවක්` = *"for a while"* | seed 54 |
| `ටිකක් වෙලාවක් බලාගෙන ඉන්න` = *"to wait for a while"* | the wait+duration collocation, already authored | seed 92 |

The choice between `වැඩි` and `වැඩිය` was the one real decision, and the corpus settles it cleanly. Counting what follows each token:

- **`වැඩිය`** is followed by a **verb** 47 times out of 48 — `හිතනවා` (14), `කතා` (5), `ඉගෙනගන්න` (3), `පුහුණු` (3)… It is the **adverbial** "more".
- **`වැඩි`** is followed by a **noun** **17 times out of 17** — `අදහස්` (13), `වචන` (2), `කාලය` (1), `මිනිස්සු` (1). It is the **adjectival** "more". Zero verbs.

`වෙලාවක්` is a noun, so the course's own grammar selects **`වැඩි වෙලාවක්`**.

> One honest wrinkle, stated because it cuts against me: the *only* place the exact two-word string appears in the course is seed 54, and it is spelled there as `වැඩිය වෙලාවක්` — the 1-of-48 exception to the pattern above. Seed 54 sits in the seeds 1–200 band that this plate has independently measured at a 25% orphan-word corruption rate. I went with the pattern (17/17 and 47/48) rather than with the single attested outlier.

### What is invented, precisely

**No word is invented.** Every token in every replacement is course-taught, at or before its seed. What is new is the **combination**: `වැඩි` + `වෙලාවක්` as a two-word chunk. Its two parts, the adjectival-`වැඩි`+noun pattern it instantiates, and the wait-collocation it slots into are each independently attested. The exact string `වැඩි වෙලාවක්` was not previously in the course.

**Confidence: HIGH on the diagnosis** (a count, not a judgement — `ඉස්සර` is never durational). **MODERATE-TO-HIGH on the repair** — the grammar is settled by a 17/17 distribution, but no native speaker has read it, and a speaker might prefer `තව ටිකක්` for the colloquial register.

### The blast radius was larger than the work order said

`ගොඩ ඉස්සר` was not confined to S0275L01. It spanned **13 rows over two seeds** — 8 phrases and the seed row at 275, plus 3 phrases and the seed row at 276 (*"No I can stay here for a little longer"*). Fixing only the card would have left the same broken form drilled next door. All 13 were repaired, plus the card = 14 rows.

One change goes beyond a mechanical swap and is flagged as such: phrase `p275g` is glossed *"can you wait **a little** longer?"* but its Sinhala had no word for "a little". I added `ටිකක්`. That corrects a pre-existing English/Sinhala mismatch rather than merely swapping the chunk.

---

## Part B — the confirmed cards

### The `දිහා` cluster — 4 cards, confirmed airtight

My independent counts reproduce the work order's exactly:

| string | in 11,719 phrases | in 668 seeds | in 1,300 cards |
|---|---:|---:|---:|
| `දිහා` | 0 | 0 | **4** |
| `දැක්ක…` | 63 | 7 | 1 |

`දිහා` is a postposition ("towards/at"), never a finite verb, and it sat where a past form of `දකිනවා` ("to see") belonged. **The `components` array on each card carries the same corruption while the card's own component *rows* carry the correct word** — that internal contradiction is the proof, and it needs no Sinhala to read:

| card | read literally | glossed | components array said | component ROWS said | repaired to |
|---|---|---|---|---|---|
| S0369L02 | "several **eyes** towards" | "several horses" | `ඇස්`→horses | `අශ්වයො`→horses | `අශ්වයො කිහිපයක්` |
| S0370L02 | "I towards towards" | "I didn't see" | `දිහා දිහා`→didn't see | `දැක්කේ නෑ`→didn't see | `මම දැක්කේ නෑ` |
| S0372L03 | "you … towards" | "did you see" | (empty) | — | `ඔයා ... දැක්කාද` |
| S0453L02 | "they towards" | "they saw them" | `දිහා`→saw them | `ඒ අයව දැක්කා`→saw them | `ඒ අය ඒ අයව දැක්කා` |

Every replacement is that card's own BUILD phrase, verbatim. `ඇස්` really is "eyes" — cards S0486L01/L02 teach `ඔයාගේ ඇස්` = *"your eyes"* — and `අශ්වයො` really is "horses" (15 occurrences, all so glossed).

Two judgement calls, stated plainly:
- **S0372L03 keeps the `...` ellipsis** (`ඔයා ... දැක්කාද`) even though its BUILD phrase has none. The card is a discontinuous frame, the ellipsis is a deliberate convention on 74 cards, and its sibling S0453L03 is written the same way. I changed only the one corrupt token.
- **S0369L02 drops a component.** Its target is "several horses" (two words) but its components array had **three** entries, the third glossing `දිහා` as "saw" — a word its own target does not contain. Dropped.

**Confidence: HIGH on all four.** Independent corroboration: the replacement strings for three of the four **already had clips in the course**, so the repaired text is voiced by audio the course had already rendered.

### `නනිකු` — 1 card, confirmed

`නනිකු` appeared in exactly 2 places course-wide (this card and its own seed row) and **0** of 11,719 phrases. The card's `components` array said `නනිකු`→"short"; the card's own **component row** says `කෙටි`→"short"; all its phrases use `කෙටි කාලේ`; `කෙටි` is its own component card at S0089L03. Repaired to **`කෙටි කාලේ`**, and the same swap applied to seed 245's text. **Confidence: HIGH.**

### `S0108L02` — confirmed

`නැගිටි` is a bare stem, not a standalone word. Repaired to **`නැගිටින්න`**. Three independent supports: the card's own phrases use `නැගිටින්න`/`නැගිටියා`; the sibling card on the *same seed*, S0108L01, uses the identical `-න්න` form (`බලාපොරොත්තු වෙන්න` = "hope"); and **the card's existing presentation clip already speaks `නැගිටින්න`** — the audio was already right and only the card text was wrong. **Confidence: HIGH.**

---

## The two I withdrew

### S0382L04 — my own proposal was REFUTED, by me, before it was written

The defect is real: the card is glossed "did you hear" but its seed means *"Did you **ask** where he wanted to put it?"*, and the identical Sinhala `ඔයා ... ඇහුවාද` is also the card at S0366L03 where the seed genuinely means "hear". The two even **share one `known_audio_id`**.

I proposed distinguishing them with the quotative `කියලා`, reasoning that seed 382 has `කොහෙද කියලා ඔයා ඇහුවාද` while seed 366 has no `කියලා`. **Then I counted, and it is backwards:**

| | rows glossed ASK | rows glossed HEAR |
|---|---:|---:|
| containing `කියලා` | 35 of 142 | **43 of 88** |

`කියලා` is if anything the course's marker for **hear**, and there are existing cards reading literally `කියලා මම ඇහුවා` = *"I heard that"* (S0364, S0509). My repair would have contradicted them head-on. **Withdrawn.**

The real distinguisher is the **WH-word**, and the numbers are decisive: among `ඇහුව-` rows, HEAR is **76 without a WH-word vs 1 with**; ASK is 28 without vs 12 with. Seed 382 has `කොහෙද`; seed 366 has none. But `කොහෙද` is tiled to a **sibling card** (S0382L03 = "where"), so the disambiguator lives outside this card's chunk and cannot be pulled in without retiling the seed.

**Status: confirmed defect, deliberately not repaired.** Note it is *not* an active ZUT collision today — both cards carry the same gloss, so it is one prompt with one answer (a duplicate). It becomes a hard ZUT hit the moment anyone re-glosses S0382L04 to "did you ask" while leaving the Sinhala alone; that is the trap to avoid. The clean fix is a **retile of seed 382**: fold `කොහෙද` into this card as `කොහෙද කියලා ඔයා ඇහුවාද` = "did you ask where" and drop S0382L03. Cost: 1 card removed, 1 rewritten, 8 phrases at index 3 rehomed, new audio for all. That is a decomposition change, not a card fix, and I did not have an independent verifier — so it is reported, not done.

### S0080L01 — no defensible repair

Confirmed: the card teaches the frame `මම ... වෙනවා` for "I'll", and **none** of its 11 phrases end in `වෙනවා` — they end in `කරනවා`/`කියනවා`/`දන්නවා`. The obvious repair, `මම ... නවා`, **failed the introduced-before-used gate**: `නවා` appears nowhere in the course as a word because it is a bound suffix. Repairing a non-word card with another non-word is not a repair. **Withdrawn**; the fix requires deciding what this card should teach, which is a content-design call.

---

## Part C — a ruling on the dative/nominative question

**The 96 is wrong, and so was my own first recount.** The prior analyst's 96 conflates constructions. Classifying every adjacent nominative site by *what follows `ඕනේ`*:

| construction | nominative sites | reading |
|---|---:|---|
| `ඕනේ කරනවා` / `ඕනේ කළා/කළේ/කළාද` | **70** | a genuinely **transitive** verb "to want" — nominative subject is **correct** here, not a defect |
| bare `ඕනේ` (incl. `ඕනේ නෑ`) | **61** | the disputed dative-subject pattern |
| `ඕනේ නම්` (conditional) | 23 | separate case |

Course-wide the experiencer is dative 698 times against 154 nominative by adjacency — a ~4.5:1 preference. But the disputed pattern is narrower still. Of the 61 bare-`ඕනේ` nominative sites, most phrase sites are `මම ඕනේ` glossed **"I should"** on seeds 98 and 100 — a deliberate deontic ("should", nominative) vs volitional ("want", dative) split, not the defect.

**For the actual disputed pattern — `ඒ අය` + bare `ඕනේ` glossed "they want" — the count is 6 phrases nominative against 133 dative.**

**My ruling: the 3 cards are defective. Confidence MODERATE-TO-HIGH**, and it does not rest on my Sinhala. It rests on the course contradicting itself: **seed 437's own text and every one of its phrases use the dative `ඒ අයට ඕනේ` while its card S0437L03 says nominative.** That card disagrees with its own seed. (S0440 and S0443 agree with their seeds, so they are weaker cases.)

**Blast radius: 11 sites, not 96 and not 987** — 5 cards + 6 phrases. Not the 96-site sweep the prior note implied. All three disputed cards have **zero practice phrases at their own `lego_index`**, so they currently drill nothing; repairing them is 3 text edits and 3 clips.

**I have not touched them**, per the work order's instruction to rule rather than sweep. Recommended: fix the 5 cards and 6 phrases (~11 rows, ~11 clips, well under an hour). Do **not** touch the 70 `ඕනේ කරනවා` sites or the seeds 98/100 "should" phrases — those are correct.

---

## Method, and what it cost

**Re-verification.** Own dump from the live DB (1,300 cards / 668 seeds / 11,719 phrases — matching), paged by seed window because ordered full-table reads hit the 8s statement timeout.

**Introduced-before-used.** The shipped gate is **inert for Sinhala**: `tokenizeKnown` splits on `/[^a-z']+/`, so Sinhala yields zero tokens and any "0 violations" is meaningless. **Disclosed substitute:** the Unicode-aware `tokenizeKnown` from `fix/known-side-tokenizer-unicode-2026-08-17` (worktree `.worktrees/a135`), which returns 6 tokens where the shipped one returns 0. Every token of all 21 replacements was checked against its first appearance in the course. **0 violations.**

**ZUT** via the builder's own normalisers from `validation.cjs` (`checkPhraseZUT` semantics), run over the whole corpus rather than one submission: **167 collisions before, 167 after, 0 newly introduced.** (The 167 pre-existing are a course-wide finding outside this scope.)

**Migration.** The protocol files progress under a *slot*, so an in-place edit silently credits unheard content. I checked rather than assumed: `lego_progress` holds 135,874 rows estate-wide but **0 for `eng_for_sin`** (`course_id` is the course code, not a UUID), and `seed_progress` likewise. **No learner has progress in this course, so no slot could be mis-credited.** Nothing to migrate — verified, not skipped.

**Audio.** Rendered on the compressor-free chain (667a6e09, already on the base branch), `PHASE8_NO_LISTEN=1`, Azure `si-LK-SameeraNeural` speed 1 read from `voice_config`. **17 clips, 17 shipping takes, all on attempt 1**, every take kept as a spare. Gates applied per clip: alive; **headword-voiced-per-token-array** (every word present in the provider's `word_boundaries` — the gate duration cannot do, since for a 4-character headword the duration test is blind at z≈0); **no-filler-regression** (zero `ඒ ගෙ` pairs voiced); non-empty token array; tail floor ≤ −35 dB; duration sanity; no stray Latin voiced.

> The rate model in `gates-12.cjs` (3143 ms intercept) is fitted to **long presentation clips** and does not transfer to 1–3 s known-side chunks, so it was deliberately not used. Stated so nobody reads "7 gates" as "the same 7 gates".

**Make-before-break,** in this order, per row: bytes to their permanent S3 key → `HeadObject` size check → one transaction inserting the `course_audio` row, patching the text, and setting `known_audio_id` **last** (a text UPDATE fires the null-audio trigger, so the link is written after the text) → COMMIT. Each row drift-checked against the pre-write snapshot and aborting if another session had moved it. **All 27 pre-existing clips are still present. Nothing was deleted.**

A trap the dry run caught: `course_audio` is UNIQUE on `(course_code, text_normalized, language, role, voice_id)`, and three of these rows normalise to one string. They **share** one clip rather than inserting duplicates — which is what the course already does elsewhere (S0366L03 and S0382L04 share one).

**Live verification.** All 21 rows re-read from the DB: text correct, link non-null, clip text matching, voice `azure_si-LK-SameeraNeural`, S3 object present, and the stored `word_boundaries` re-checked for full coverage. Then over the **learner's own path** — `https://ssi-learning-app.vercel.app/api/audio/<id>` — HTTP 200 with decoded durations matching the DB (1.800 s, 1.800 s, 1.944 s). `courses.content_stamp` bumped to `2026-08-17T11:10:55Z` by the insert, which is what invalidates the cached script; a bare link UPDATE would not have.

> A probe note, since it looked alarming for a moment: `/api/audio?id=<id>` returns 404 for *every* clip including known-good pre-existing ones. The route is `/api/audio/<id>` as a path segment. The 404 was my probe, not the content.

---

## Explicit gaps

1. **No independent verifier ran.** Adversarial verification of card/phrase text is mandatory and I attempted to dispatch a Sonnet refuter; the surface refused it — this session already sits at the fan-out depth ceiling, the same wall the previous analyst hit. **Everything here is single-analyst.** I ran the adversarial pass against myself from the live data, and it did real work — it killed the S0382L04 proposal outright and re-grounded the Part A choice from `වැඩිය` to `වැඩි`. But self-refutation is not a second pair of eyes, and this is the one thing most worth adding.
2. **No native Sinhala speaker has read any of it.** Per Kai's ruling that is accepted; confidence is labelled per item above. The judgements resting on *distribution* (`ඉස්සර` never durational; `වැඩි`+noun 17/17; `කියලා` favouring "hear" 43/88) are much stronger than the ones resting on my reading of the grammar.
3. **S0382L04 and S0080L01 are confirmed-broken and left broken**, with the repair options and costs above. Both were withdrawn on evidence, not parked for want of a speaker.
4. **167 pre-existing ZUT collisions** exist course-wide. Untouched, unexamined, outside this scope, and worth a pass of their own.
