# eng_for_sin — seed/card coherence analysis (A-134, part A)

**Date:** 2026-08-17 · **Branch:** `fix/sin-27-seed-rebuild-2026-08-17` · **Scope:** analysis and proposal only — no database row was changed, no audio was generated.

`eng_for_sin` is **English for Sinhala speakers** (`known_lang='sin'`, `target_lang='eng'`). The **known/prompt side is Sinhala**; the **target/answer side is English**. Presentation clips are entirely Sinhala, voiced by `si-LK-SameeraNeural`.

---

## Headline

| Question | Answer |
|---|---|
| Do the 27 corrupt clips need new Sinhala authored? | **No.** 12 get a course-authored example restored; 15 correctly land on headword-only. Nothing is invented. |
| Of the 5 "dead cards", how many are broken content? | **1 card is wrong (S0207L01's seed, not its card). 2 are not broken at all.** Full verdicts below. |
| The course-wide 24.1% card/seed mismatch — how much is real? | **9 genuinely broken cards of 1,300 (0.7%)**, up to 12 if a disputed cluster is confirmed. Not 313. |
| Is there a broken-*seed* class underneath? | **Yes — this is the real defect.** ~18 of 668 seeds (2.7%) carry corrupt Sinhala, 48 of the 57 flagged sit in seeds 1–200. |
| Where are the English glosses? | `scripts/a134-A/glosses.json` (see Part 3). |

The premise the original brief was written on — "27 Sinhala example sentences must be newly authored" — is retired. So is the follow-on worry that the 5 dead cards need a Sinhala author. **The example slot is selected, not authored**, and for 4 of the 5 dead cards headword-only is the *correct* output, not a degraded one.

---

## Part 1 — The 5 dead cards

These five land on `contextSource='none'`: zero of their seed's USE phrases contain the card's `known_text`, and neither does the seed.

### The structural cause (this was not in the brief)

phase8's composer builds its candidate pool from exactly two places — the seed's `known_text`, and `phrase_role='use'` phrases **filed under the card's own `lego_index`**. It then drops any candidate where `known_text.length / contextText.length > 0.5`.

I probed every pool for all five. The result reframes the question:

| card | own-index BUILD | own-index USE | sibling-index USE | seed |
|---|---|---|---|---|
| S0181L02 | **2 exact hits** (both ratio > 0.5 → suppressed) | 0 of 5 | 0 | no |
| S0207L01 | **1 exact hit** (ratio 1.00 → suppressed) | 0 of 5 | **1 hit, ratio 0.42 → survives** | no |
| S0214L01 | **1 exact hit** (ratio 0.92 → suppressed) | 0 of 5 | 0 | no |
| S0218L01 | **1 exact hit** (ratio 1.00 → suppressed) | 0 of 5 | 0 | no |
| S0261L01 | **1 exact hit** (ratio 1.00 → suppressed) | 0 of 5 | 0 | no |

Two things follow, and they point in opposite directions:

1. **Every one of these cards *is* modelled verbatim in the course** — in its own BUILD phrases. The composer never looks at BUILD.
2. **Widening the pool to BUILD would fix nothing.** Every BUILD hit is ratio > 0.5 and would be correctly suppressed as redundant — a "context" identical to the headword teaches nothing. The suppression rule is doing its job.

So the composer's blind spot is real but benign here. Only **one** of the five gains anything from a wider pool: S0207L01, via a *sibling-index* USE phrase at ratio 0.42.

### Verdicts

**S0181L02** — card `මගේ අම්මව එක්කගෙන යන්න` ("take my mother") · seed 181 `හැබැයි මගේ අම්මව ලෙකරට අරගෙන යන්න ඕනේ.`

**The SEED is wrong. High confidence — this is a count, not a judgement call.** Seed 181's Sinhala contains two words that occur *nowhere else in the entire 668-seed course*:

| word | in seeds | in LEGO cards | in 11,719 practice phrases |
|---|---|---|---|
| `ලෙකරට` (used for "to the doctor") | 1 — this seed | **0** | **0** |
| `අරගෙන` (used for "take") | 1 — this seed | **0** | **0** |
| `දොස්තර` (what the course *does* teach for "doctor") | 0 | 1 | **13** |
| `එක්කගෙන` (what the course *does* teach for "take") | 0 | 1 | **9** |

The card is coherent with 5 BUILD and 5 USE phrases; the seed is the intruder. `එක්කගෙන යනවා` is also the *more* correct verb — Sinhala uses it for taking a **person**, and `අරගෙන යනවා` for taking a **thing**.

*Minimal repair, grounded entirely in strings the course already holds:* set seed 181 `known_text` to `හැබැයි මට මගේ අම්මව දොස්තර ළඟට එක්කගෙන යන්න වෙනවා` — `හැබැයි` from the seed itself, the remainder verbatim from its own USE phrase already glossed *"I have to take my mother to the doctor"*. **CONFIDENT.** (This also repairs sibling card S0181L01 `දොස්තර ළඟට`.)

**S0207L01** — card `ඔයා කරලා තියෙනවා` ("you've done") · seed 207 `ඔයා කරන්නයි ඕනේ කළේ ඒ ඔයා කරලා.`

**The SEED is wrong.** Seed 207's Sinhala is a word-order calque of the English "you have done what you needed to do" — it reads roughly *"you to-do want did that you having-done"* and is not a grammatical Sinhala sentence. The card and all 23 phrases are clean.

*Minimal repair:* the correct sentence **already exists in the course**, as seed 207's own USE phrase at `lego_index=2`: `ඔයාට කරන්න ඕනේ වුණ දේ ඔයා කරලා තියෙනවා`, authored English *"you've done what you needed to do"* — **verbatim identical to seed 207's own `target_text`**. Set the seed's `known_text` to that string. **CONFIDENT.**

This is also the one card of the five that gains a restored example: that same phrase sits at ratio 0.42 and would survive the suppression rule if the pool included sibling indices.

**S0214L01** — card `ඔයාට ලැබුණාද` ("did you have") · seed 214 `සති අන්තේ ඔයාට හොඳ ටයිමක් ලැබුණාද?`

**NEITHER SIDE IS WRONG. CONFIDENT.** The card is a discontinuous frame — `ඔයාට` … `ලැබුණාද`. Sinhala is SOV, so the verb is final and *any* sentence with an object necessarily splits the frame. All ten of the seed's phrases are good Sinhala and every one of them splits it. There is nothing to repair: headword-only is the correct presentation. The "defect" is in the composer's contiguous-substring test, not the content.

**S0218L01** — card `මම ගොඩාක් දේ කළේ නෑ` ("I didn't do much") · seed 218 `මම ඉරිදා ගොඩාක් දේ කළේ නෑ.`

**NEITHER SIDE IS WRONG. CONFIDENT.** Same class as S0214L01: the seed inserts `ඉරිදා` ("Sunday") into the frame, and every USE phrase inserts a time adverbial in the same slot. Headword-only is correct. *(Separate minor flag: the seed writes bare `ඉරිදා` while sibling card S0218L02 teaches `ඉරිදා දවසේ` for "on Sunday" — a card/seed wording split, not a defect in this card.)*

**S0261L01** — card `ඒක වෙන්න පුළුවන්` ("it might be") · seed 261 `මම හිතනවා ඒ වැදගත් දෙයක් වෙන්නට ඕනේ.`

**The SEED is wrong, on two counts — and one is a meaning error.** The seed says `වෙන්නට ඕනේ` = *"must be / needs to be"*, but its own `target_text` is *"I think it might be something important"*. **`ඕනේ` is obligation; `පුළුවන්` is possibility — the seed teaches the opposite modality from its own English.** It also writes `ඒ` where the card teaches `ඒක`.

*Minimal repair:* the correct sentence **already exists** as seed 261's own USE phrase: `මම හිතනවා ඒක වැදගත් දෙයක් වෙන්න පුළුවන් කියලා`, authored English *"I think it might be something important"* — again **verbatim identical to the seed's `target_text`**. **CONFIDENT.**

### Part 1 summary

| card | which side is wrong | repair grounded in course text? | confidence |
|---|---|---|---|
| S0181L02 | **seed** (2 hapax words) | yes — own USE phrase | CONFIDENT |
| S0207L01 | **seed** (ungrammatical calque) | yes — own USE phrase, English matches exactly | CONFIDENT |
| S0214L01 | **neither** | n/a — nothing to repair | CONFIDENT |
| S0218L01 | **neither** | n/a — nothing to repair | CONFIDENT |
| S0261L01 | **seed** (wrong modality) | yes — own USE phrase, English matches exactly | CONFIDENT |

**No Sinhala needs to be invented for any of the five.** Three seed repairs are available verbatim from the course's own practice phrases; two cards need nothing at all. Note that all three seed repairs are **out of scope for the 27-clip fix** — they are content edits under the standing content-change migration protocol, and are listed here as findings, not as work done.

---

## Part 2 — Is this a seed defect class?

### Reproducing the number

A classifier over all 1,300 cards reproduces the orchestrator's figure exactly: **313 of 1,300 (24.1%)** have a `known_text` that is not a contiguous substring of their seed. That number is real. It is also **almost entirely benign**, and here is the decomposition:

| bucket | cards | % | reading |
|---|---:|---:|---|
| A — contiguous in its own seed | 987 | 75.9% | coherent |
| B — discontinuous frame (all card words in the seed, in order, with insertions) | 107 | 8.2% | **benign** — Sinhala SOV splits frames |
| C — all card words in the seed, reordered | 8 | 0.6% | benign |
| D — reworded vs the seed, but drilled verbatim in its own phrases | 185 | 14.2% | **benign** — the learner does hear this exact form |
| E — variant, its words drilled elsewhere in the course | 8 | 0.6% | mostly benign |
| G — card contains a word drilled nowhere in the course | **5** | **0.4%** | **candidate defect** |

Two filters cut the 313 down hard:

- **284 of the 313** are drilled **verbatim** in the card's own BUILD/USE phrases. The card and the seed simply word the chunk differently, and the learner practises the card's exact form regardless. Benign.
- **74 of the 313** carry a literal `...` ellipsis in their Sinhala — a deliberate authoring convention marking a gap the learner fills (`ඔයා ... ඇහුවාද` = "did you hear"). These can *never* match a contiguous substring test, by design. Benign — though note they can also never receive a presentation example under the current composer.

That leaves **29 cards** not drilled verbatim anywhere in their own pool. Adding the 2 cards carrying a course-wide orphan word gives **31 candidates**, which I adjudicated one by one.

### Verdicts on the 31

**9 confirmed broken cards.** Two are clean mechanical clusters:

**The `දිහා` cluster — 4 cards, airtight.** `දිහා` is a real Sinhala postposition ("towards/at"), never a finite verb. It has been substituted for a past-tense form of `දකිනවා` ("to see") in exactly four cards. The evidence is a count:

| string | in 11,719 phrases | in 668 seeds | in 1,300 cards |
|---|---:|---:|---:|
| `දිහා` | **0** | **0** | **4** |
| `දැක්ක…` | 63 | 7 | 1 |

| card | reads (literally) | glossed | correct string, already in the course |
|---|---|---|---|
| S0369L02 | `ඇස් කිහිපයක් දිහා` — "several **eyes** towards" | "several horses" | `අශ්වයො කිහිපයක්` (own BUILD phrase) |
| S0370L02 | `මම දිහා දිහා` — "I towards towards" | "I didn't see" | `මම දැක්කේ නෑ` (own BUILD phrase) |
| S0372L03 | `ඔයා ... දිහා` | "did you see" | `ඔයා දැක්කාද` (own BUILD phrase) |
| S0453L02 | `ඒ අය දිහා` | "they saw them" | `ඒ අය ඒ අයව දැක්කා` (own BUILD phrase) |

Every one of the four has its correct replacement sitting in its own practice-phrase set. No Sinhala needs authoring.

**`නනිකු` — 1 card, airtight.** S0245L02 `නනිකු කාලේ` ("in a short time"). `නනිකු` appears in exactly two places in the course — this card and its own seed — and in **zero** of 11,719 phrases. Every practice phrase on that seed uses `කෙටි කාලේ`, and `කෙටි` = "short" is taught as its own component row (`S0089L03`) and appears in 21 phrases. Card and seed share a corruption; the phrases hold the correct form. *Fix: `කෙටි කාලේ`, already glossed "in a short time".*

**S0382L04 — a mis-gloss you can see without any Sinhala.** The card is glossed **"did you hear"**. Its seed's own `target_text` is **"Did you **ask** where he wanted to put it?"** `අහනවා` means both "ask" and "hear" in Sinhala, and the disambiguation went the wrong way. The identical Sinhala string `ඔයා ... ඇහුවාද` is *also* the card at S0366L03, glossed "did you hear" — where the seed genuinely does mean "hear". **This is a ZUT collision: one Sinhala prompt, two English answers.**

**S0275L01 — broken on both sides, and the only case I cannot ground a repair in.** Card `වඩා දිගු` = "more long" (physical length). Every practice phrase uses `ගොඩ ඉස්සර`, which means **"much earlier"** — so "I want to wait longer" is drilled as `මම ගොඩ ඉස්සර බලා ඉන්නයි ඕනේ` ≈ *"I want to wait much earlier."* Neither side expresses duration. **The course contains no correct string to repair from — this one needs a Sinhala speaker to author (`වැඩි වෙලාවක්` or similar). Explicit gap.**

**S0080L01 and S0108L02 — real but milder.** S0080L01 teaches the frame `මම ... වෙනවා` for "I'll", but **none of its own 11 practice phrases end in `වෙනවා`** — they end in `කරනවා`/`කියනවා`/`දන්නවා`. The frame describes nothing the learner practises. S0108L02 teaches `නැගිටි` for "wake", a bare stem that is not a standalone Sinhala word (the phrases correctly use `නැගිටියා`/`නැගිටින්න`); *wants a Sinhala speaker's eye.*

**3 disputed — I checked my own hypothesis and it failed.** S0437L03, S0440L03, S0443L03 all write `ඒ අය ... ඕනේ` ("they want") with the experiencer in the **nominative**, where Sinhala takes the **dative** (`ඒ අයට`) — and sibling seed 418 does exactly that. I was ready to call this a clean 3-card case error. Then I counted, and the pattern is not isolated:

| | nominative | dative |
|---|---:|---:|
| `ඒ අය(ට) ඕනේ` | 23 | 154 |
| `මම / මට ඕනේ` | 26 | 225 |
| `ඔහු(ට) ඕනේ` | 49 | 165 |
| `අපි(ට) ඕනේ` | 1 | 37 |

Counting whole rows rather than substrings: **682 rows across the course mark the experiencer dative, and 141 mark it nominative** — of which 45 are the `ඕනේ කළා/කළේ` ("wanted") construction, leaving **96 bare-`ඕනේ` nominative sites**. The course prefers dative ~5:1, but nominative occurs 96 times, not 3. **So this is a systemic minority pattern, not an isolated defect — I am downgrading it to WANTS A SINHALA SPEAKER'S EYE rather than counting it as broken.** If a native speaker confirms nominative is ungrammatical here, the broken-card count rises from 9 to 12 and a 96-site sweep is implied.

**Correction to my own earlier reading:** I initially had S0127L02/L03 ("shape", "changing") down as broken cards, because their input dump showed zero practice phrases. That was an artefact of keying the pool on `lego_index`. Seed 127 **does** have 11 phrases — all filed under `lego_index=1`, all about the brain (*"my brain is tired"*, *"English is easier for my brain"*). The cards are correct Sinhala, correctly glossed. **It is the seed row that is the intruder** — its text and English are *"That isn't why I wanted to see you"*, which has nothing to do with its own three cards or its own eleven phrases. Counted under Part 2's seed defects, not its card defects.

### The defensible number

> **9 of 1,300 eng_for_sin cards (0.7%) are genuinely broken** — 6 with a correct replacement already present in the course's own practice phrases, 1 needing authored Sinhala, 2 milder. A further **3 are disputed** pending a native speaker's ruling on dative marking, which would take it to 12 (0.9%).
>
> **The 24.1% is not a defect rate.** 284 of the 313 are drilled verbatim, and 74 are a deliberate ellipsis convention.

### The real defect class is the SEEDS

The mirror test — *seed words that appear in no card and no practice phrase anywhere in the course* — flags **57 of 668 seeds (8.5%)**. Reading all 57, I judge:

- **~18 carry a genuine corruption or mistranslation** (2.7% of seeds), including: S31 `මත්` for "me"; S36 `කඩා කනවා` for "interrupt"; S87/S88 `නාගෙ` for "know"; S97 `ඕනෑ ඕනෑකමට` (reduplicated garbage); S103 `ඉගෙනෙන්නේ` (non-word) plus a learn/hear mismatch; S131 `මාතෙ` for "in my head"; **S144 `ඇවිද්දා` = "walked", glossed "I woke"**; S147 `දිකිනකොට`; S148 `කිව්වකොට`; S180 `ගත්ව`; **S181 `ලෙකරට` + `අරගෙන`**; S227 `මාව ලවා … කිව්වයි`; S541 `හිස්සෙන්` for "slowly"; **S82/S425 `බලාගන්නේ` glossed "wait for" in one place and "make sure" in another**. Plus **seed 127**, which the orphan test cannot catch because its words are all real — it is simply a different sentence from its own cards and phrases.
- **~39 are rare-but-real vocabulary or orthographic variants** — `කාලෙ`/`කාලේ`, `කැමැති`/`කැමති`, colloquial `පස්සෙ`/`පහු`/`බසියෙ`, formal `පූර්ණය`/`සත්‍යය`. Benign.

### Bucketed by seed range — quality improved monotonically through the build

| seeds | cards | not contiguous | broken-card candidates | seeds with an orphan word |
|---|---:|---:|---:|---:|
| 1–100 | 225 | 98 (44%) | 0 | **25 / 100** |
| 101–200 | 165 | 58 (35%) | 0 | **23 / 100** |
| 201–300 | 130 | 34 (26%) | 1 | 5 / 100 |
| 301–400 | 244 | 66 (27%) | 3 | 1 / 100 |
| 401–500 | 240 | 43 (18%) | 1 | 2 / 100 |
| 501–600 | 199 | 10 (5%) | 0 | 1 / 100 |
| 601–668 | 97 | 4 (4%) | 0 | **0 / 68** |

**48 of the 57 broken seeds sit in seeds 1–200** — the earliest, most-heard, hardest-to-skip part of the course, and the part a new learner meets first. The last 68 seeds are clean. If the `sinhala-broken-seeds-rebuild` project needs a target, **it is seeds 1–200, and it is seed rows rather than cards.**

### One more structural finding

**54 cards have no practice phrase filed under their own `lego_index`** even though their seed has phrases — so the composer's candidate pool is empty for them by construction, regardless of content quality. These cluster in seeds 301–500 (23 and 23). Cards at `lego_index` 4 and 5 are worst served: phrases exist at index 4 only 209 times against 29 cards, and at index 5 only 7 times against 1 card.

---

## Part 3 — English glosses for Kai's page

**File: `scripts/a134-A/glosses.json`** — 27 rows, machine-readable. Absolute path:

```
/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.worktrees/a134/scripts/a134-A/glosses.json
```

Each row carries `card_english` (+ its source), `old_sinhala`, `old_gloss_english`, `old_defect_note`, `new_context_sinhala`, `new_context_english` (+ its source), `new_clip_sinhala`, `confidence` and `confidence_reason`.

**Provenance is explicit per field, as asked:**
- `card_english` — straight from `course_legos.target_text`. Already English; not re-translated.
- `new_context_english` — for all 12 restored examples, the selected phrase's **own authored `target_text`** (`course_practice_phrases` for 11, `course_seeds` for 1). Not re-translated.
- `old_gloss_english` — **hand-authored by me.** The old Sinhala is corrupt, so no authored English exists for it anywhere; this is the only field in the file that is a translation rather than a lookup.

### Reading the corruption

Two tokens explain almost all of it:

- **`ඒ ගෙ`** — a null placeholder the old composer emitted for a LEGO it could not resolve, repeated 3–8 times per clip. `si-LK-SameeraNeural` **voices it aloud**: the learner hears *"ay ge ay ge ay ge"*. Glossed here as "uh-the".
- **`මමා`** — a corrupt spelling of `මම` ("I"), voiced as *"mamaa"*.

**The worst single clip is S0198L02**, where the *headword slot itself* is pure placeholder — `'ඒ ගෙ ඒ ගෙ'`. The learner is told "In English…" and then given no chunk at all, followed by six more placeholders.

### The 27

| # | lego | card English | what the learner actually heard | restored example (authored English) | rating |
|---|---|---|---|---|---|
| 1 | S0178L01 | I didn't have time | "In English. 'but'. 'but I uh-the uh-the uh-the' so." | — headword only | CONFIDENT |
| 2 | S0178L02 | although I wanted to see you | "'I didn't have time'. 'I didn't have time but I uh-the ×4'" | although I wanted to see you I was tired | CONFIDENT |
| 3 | S0180L01 | to read my book | "'to read'. 'I uh-the ×6 to-read'" | I'd like to read my book for about a week | CONFIDENT |
| 4 | S0181L02 | take my mother | "'taking'. 'but near me uh-near uh-the ×3 taking'" | — headword only | **WANTS EYE** (seed 181, Part 1) |
| 5 | S0184L02 | a while ago | "'a while ago'. 'uh-the ×3 at the office a-little a while ago saw'" | we talked a while ago | CONFIDENT |
| 6 | S0194L01 | are you looking for | "'looking for'. 'you uh-the ×6 looking-for'" | are you looking for your friend? | CONFIDENT |
| 7 | S0196L02 | have you heard | "'the latest'. 'you uh-the ×3 about uh-the ×5 the-latest'" | — headword only | CONFIDENT |
| 8 | S0197L02 | works as a teacher | "'son'. 'my son uh-the ×5'" | — headword only | CONFIDENT |
| 9 | S0198L01 | my daughter | "'my daughter'. 'my daughter uh-near uh-the ×3'" | I saw my daughter today | CONFIDENT |
| 10 | S0198L02 | works for the council | "'uh-the uh-the'. 'my daughter uh-the ×6'" — **no headword at all** | — headword only | CONFIDENT |
| 11 | S0201L01 | what was going to happen | "'to find out what is happening'. 'I want uh-the ×8 …'" | yesterday I wanted to know what was going to happen | CONFIDENT |
| 12 | S0202L01 | nobody was sure | "'the question'. 'the question uh-the ×4'" | — headword only | CONFIDENT |
| 13 | S0202L02 | answer the question | "'sure'. 'the question uh-the ×6 sure'" | — headword only | **WANTS EYE** (ප්‍රශ්නෙ/ප්‍රශ්නේ spelling split) |
| 14 | S0203L01 | what would you do | "'if (I) asked'. 'if I asked uh-the ×4'" | — headword only | **WANTS EYE** (card is present tense, glossed conditional) |
| 15 | S0204L01 | to deal with the arrangements | "'concerning'. 'concerning uh-the ×6'" | — headword only | CONFIDENT |
| 16 | S0206L01 | the chance | "'the chance'. 'the chance uh-the ×6'" — headword was correct | I need the chance to learn English | CONFIDENT |
| 17 | S0207L01 | you've done | "'you having done'. 'you having-done uh-near uh-the ×6'" | — headword only | **WANTS EYE** (seed 207, Part 1) |
| 18 | S0210L01 | to discuss the problem | "'discussion'. 'discussion uh-the ×5'" | — headword only | CONFIDENT |
| 19 | S0214L01 | did you have | "'received'. 'received uh-near uh-the ×6'" | — headword only | CONFIDENT |
| 20 | S0214L02 | a good time | "'at the weekend'. 'at the weekend received uh-the ×5'" | I want a good time with you | CONFIDENT |
| 21 | S0218L01 | I didn't do much | "'I didn't do much on Sunday'. '… uh-the ×6'" | — headword only | CONFIDENT |
| 22 | S0225L01 | an answer | "'gives you'. 'he gives you uh-the ×6'" | He would give you an answer if he could. | CONFIDENT |
| 23 | S0230L01 | who wants to work with you | "'willing'. 'I know uh-the willing uh-the ×3'" | — headword only | **WANTS EYE** (කැමති/කැමැති spelling split) |
| 24 | S0231L01 | old | "'old'. 'I know uh-the old uh-the ×3'" — headword was correct | that old man is my friend | CONFIDENT |
| 25 | S0249L01 | I want you to | "'I want you (wrong case)'. '… uh-the ×5'" | I want you to help me today | **WANTS EYE** (card not well-formed alone; example calques English order) |
| 26 | S0260L01 | the faintest idea | "'any'. 'I have any uh-the ×5'" | do you have the faintest idea? | **WANTS EYE** (typo තියෙනවද) |
| 27 | S0261L01 | it might be | "'must be'. 'uh-the ×6 must-be uh-the ×4'" | — headword only | **WANTS EYE** (seed 261 modality, Part 1) |

**19 CONFIDENT · 8 WANTS A SINHALA SPEAKER'S EYE.** None of the eight blocks the clip repair — in every case headword-only or the authored example is safe to ship, and the flag is on adjacent content that a separate pass should fix.

A pattern worth naming: in **7 of the 27** the old headword slot held a *sibling card's* chunk or a bare fragment of the seed, not this card's chunk at all (S0178L01/L02, S0202L01/L02, S0214L01/L02, S0225L01). The old presentation set was composed against a LEGO numbering that has since been renumbered — consistent with worker #823's finding, and with the 6 "unlinked" clip ids that correspond to no card in the course today.

---

## Explicit gaps

1. **`S0275L01` ("longer") cannot be repaired from course text.** Both the card (`වඩා දිගු`, physical length) and all 8 of its phrases (`ගොඩ ඉස්සර`, "much earlier") fail to express duration. New Sinhala must be authored by a speaker. I did not invent it.
2. **The dative/nominative `ඕනේ` question is unresolved.** My isolated-defect hypothesis failed its own check (96 bare-`ඕනේ` nominative sites course-wide, not 3). A native ruling decides whether 3 cards or 96 sites are affected.
3. **The ~18 broken seeds are characterised, not verified one by one.** I read all 57 flagged seeds and classified them, but I am not a native speaker; the corruption calls on marginal items (`S26 ආසන්නෙන්`, `S143 දෙයමයි`, `S146 නොකෙරෙනවා`) are lower confidence than the clear-cut ones (`ලෙකරට`, `නාගෙ`, `මාතෙ`, `ඇවිද්දා`).
4. **Fan-out was refused.** I attempted to dispatch two adjudication workers and hit the depth ceiling (this session already sits at depth 2). All adjudication in Parts 1–3 is single-analyst, unreviewed by a second agent. A second pair of eyes on the 31 cards and 57 seeds would be worth having before any repair is applied.

## Reproducibility

All scripts under `.worktrees/a134/scripts/a134-A/` (gitignored): `corpus.cjs` (dump, pages by seed window — ordered full-table reads time out), `classify.cjs` (the 1,300-card classifier), `pool-probe.cjs` (Part 1 pool probe), `mkinputs.cjs`, `mkglosses.cjs`. Composer logic verified verbatim against `services/phases/phase8-audio-v13.cjs` lines 3377–3520, including that `shortTemplate === template` for this course.
