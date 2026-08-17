This audit is done — no need to fan out, it was a self-contained string/frequency analysis I could complete directly. Here's the full report.

# Cornish orthography audit — cor_for_eng corpus (668 seeds)

**Upfront disclaimer: I am not a Cornish speaker.** Everything below is orthographic/string-level pattern-matching against the diagnostic features you listed, cross-checked by hand-reading context lines to rule out grammatical mutation (which produces legitimate spelling variants of the same lemma in Cornish, e.g. k→g, t→d, b→v soft mutation) before calling anything an inconsistency. Where a finding still needs a native/fluent judgement, it's in the numbered list at the end.

**Corpus size check**: 668 seed numbers present, 1–668, none missing, none duplicated (file lacks a trailing newline, which is why `wc -l` under-reports at 667).

## 1. Which orthographic standard(s)

I tested every diagnostic feature you named against every matching token in `freq.json` (1,007 distinct tokens) and spot-checked contexts in `corpus.txt`. Result: **100% consistent, one-sided, on every feature that discriminates — the corpus reads as SWF Main-form / KK-compatible orthography**, with zero counter-examples of the Traditional-Graph / UC / UCR variants.

| Feature | Form found | Count | Counter-form | Count | Examples (seed) |
|---|---|---|---|---|---|
| voiceless w: hw- vs wh- | hw- | 23 distinct types, 100+ tokens (`hwath` 9, `hwi` 24, `hwegh` 2, `hwarvos` 6...) | wh- | **0** | `hwath` (60, 88, 96, 345), `hwi` (529, 642, 643, 644) |
| k- vs c- before a/o/u | k- | 40+ distinct types (`kavos` 9, `kul` 9, `kov` 7, `kernewek` 10...) | c- | **0** | `kewsel` (1, 3, 5, 11), `Kernewek` (1×10 total, always capital-K) |
| doubled -mm/-nn vs single -m/-n | doubled | 16 mm-types/91 tokens + 70 nn-types/270 tokens | single -m/-n | **0** | `dhymm` (25, 32, 44, 45), `mamm` (181, 239, 308), `henna` (61, 90, 111) |
| you-plural: hwi vs why | hwi | 24 | why | **0** | 529, 642, 643, 644 |
| hyphenated a- compounds (a-dro, a-varr, a-vorow…) joined vs separate | hyphenated | `a-dro` 24, `a-varr` 3, `a-vorow` 7, `a-dre` 1, `a-ves` 1 | joined (adro, avarr…) | **0** | 24 instances of `a-dro` alone |
| c-initial tokens at all (any position) | only `ch-` digraph loanwords (chi, chambour, chalenj…) | 8 distinct types, all `ch` | plain `c` | **0** | — |

**Not present in the corpus at all** (a gap, not a contradiction): the classic Traditional-graph/Main-form minimal pair `gwreans`/`gwrians` never occurs — that lexeme simply isn't used in these 668 seeds, so I can't use it as corroborating evidence either way.

**-dh vs -th word-final**: this feature is *not* a reliable single-word diagnostic on its own — most -th words in the corpus (`pyth`, `yth`, `orth`, `owth`, `hwath`, `keth`) are simply words that always end in -th regardless of standard (they're not alternate spellings of -dh words). I checked for genuine same-stem dh/th pairs and found 4 look-alikes (`godh`/`goth`, `kodh`/`koth`, `pydh`/`pyth`, `vydh`/`vyth`) — all four turned out, on reading context, to be **grammatically-conditioned mutation pairs of different words** (`koth`="old" vs `y/ny/a-godh`="ought", `bydh`(future "will be") mutating to `pydh`/`vydh` after particles), not spelling drift. So: zero genuine dh/th inconsistency found, but note the method — I can't rule out a subtler one existing beyond what edit-distance-1 clustering surfaced.

**Conclusion on Q1**: the corpus is written in a single, internally uniform orthographic register that is consistent with **SWF Main-form and/or Kernewek Kemmyn** — I cannot fully distinguish between those two on string evidence alone (their diagnostic differences are more lexical/morphological than the letter-level features listed in your brief), and that distinction goes into the human-judgement list below. It is **not** SWF Traditional-graph, not UC/UCR, not RLC/Nowedga, on every letter-level test performed.

## 2. Internally consistent or mixed?

**On the coarse standard-vs-standard axis (hw-/k-/mm-nn/hwi): fully consistent, 0 mixed instances.** Every one of the ~150+ diagnostic-bearing tokens I checked came down on the same side. I did not find a single seed where, e.g., a `wh-` or `c-` or single-consonant form intrudes.

I cannot rule out mixing on the finer SWF-Main-vs-KK axis (a question that needs a fluent judgement — see list below), but on the letter-level markers your brief specified, this is a clean, single-standard corpus.

## 3. Same lemma spelled two ways (regardless of standard)

I ran a systematic near-duplicate sweep (edit-distance-1 clustering over all 1,007 tokens, plus a targeted -is/-ys and -o/-oo/-oe scan), then manually verified every candidate pair against its context to exclude Cornish's productive mutation system (which legitimately alters initial and sometimes final consonants of the *same* word). Most of the ~50 raw candidate pairs the algorithm surfaced turned out to be either different grammatical persons/tenses of the same verb (weles/welis = infinitive vs 1sg-past "see"), different words entirely (kres "peace" vs krys "shirt"), or mutation pairs (kewsel/gewsel = unmutated/soft-mutated "speak"). Two genuine spelling inconsistencies survived that scrutiny:

**a) "said" (3rd-sg past of leverel): `leveris` vs `leverys`** — same word, same grammatical slot (both follow the relative particle `a`), spelled two ways.
- `leveris`: **21** occurrences — seeds 84, 211, 235, 236, 296, 301, 302, 312, 313, 322, 323, 333, 334, 383, 384, 449, 451, 464, 527, 544, 589
- `leverys`: **8** occurrences — seeds 342, 343, 344, 345, 358, 359, 365, 367
- Notable: `leverys` clusters almost entirely in one contiguous block (seeds 342–367), while `leveris` is spread across the rest of the corpus (seeds 84–589) — this pattern (a tight cluster using one spelling, everywhere else using the other) looks like two different authoring passes/sessions rather than random noise, though I can't confirm authorship — that's outside what the corpus file tells me.

**b) "important" (root poos-/pos-): `posek` vs `poesek` vs `poosekka`** — same adjective root, three vowel-graph treatments (the oo/oe/o diagnostic you specifically flagged).
- `posek`: **6** — seeds 65, 261, 277, 280, 311, 329
- `poesek`: **1** — seed 356
- `poosekka` (comparative "more important"): **1** — seed 137
- These sit on exactly the vowel-graph axis your brief called out (oo/oe/o); whether `poosekka`'s doubled-o is a legitimate comparative-form spelling of a `poos-` root or genuinely conflicts with `posek`'s single-o base needs a fluent call (see list below).

No other same-lemma spelling pairs survived verification. Explicit gap: this method (edit-distance-1 + targeted suffix scan) catches near-misses but could miss a genuine two-way spelling split for words that differ by 2+ characters — I did not do an exhaustive semantic clustering of all 1,007 tokens by meaning, which would need either a Cornish lexicon/stemmer (not available in this environment — no pip/numpy on this box, confirmed) or a fluent reader.

## 4. Truncated / empty / non-Cornish seeds

- **Empty Cornish field**: 0 (checked all 668 rows programmatically).
- **Word-count-ratio outlier check** (Cornish word count vs English word count per seed, flagging anything under 35% or over 300% of the English length as possible truncation/padding): **0 outliers** — no seed's Cornish looks abnormally short or long relative to its English gloss.
- **Trailing truncation markers** (`...`, dangling hyphen/comma at line end): **0**.
- **Apparent single-word or very-short Cornish translations**: 7 found (seeds 259 "tybyans", 265 "koweth", 275 "hirra", 305 "benyn", 321 "lyver", 422 "kwestyon", 441 "maner") — all 7 checked against their English side, and all 7 are legitimately single-word/short-phrase seeds ("An idea.", "A friend.", "Longer.", "Woman.", "A book.", "A question.", "An approach."), not truncations.
- **English left untranslated in the Cornish field**: 0 — I also grepped for common English function words (the, and, you, that, with, have, will, would) inside the Cornish column and got no hits.

**Result: no truncated, empty, or English-leftover seeds found in this corpus, by these checks.**

## Questions for a Cornish speaker (plain English, no software knowledge needed)

1. Seeds 65, 261, 277, 280, 311, 329 spell "important" as **posek**; seed 356 spells it **poesek**; seed 137 (in the comparative, "more important") spells it **poosekka**. Are these all acceptable spellings of the same word, or is one of them wrong/non-standard?
2. Seeds 84, 211, 235, 236, 296, 301, 302, 312, 313, 322, 323, 333, 334, 383, 384, 449, 451, 464, 527, 544, 589 spell "said" (in "...who said that...") as **leveris**; seeds 342, 343, 344, 345, 358, 359, 365, 367 spell the same word **leverys**. Is this a genuine error, or are both acceptable spellings?
3. This whole 668-seed course consistently uses forms like *hwath* (not *whath*), *kewsel* (not *cewsel*), *hwi* (not *why*), and doubled letters like *dhymm*/*henna* (not *dhym*/*hena*) throughout, with zero exceptions found. Does that combination read to you as one specific named Cornish spelling standard (and if so, which one), or could it be a mix of standards that happen to agree on those particular letters?

**No commits made — this was a read-only text/frequency analysis, nothing was modified or generated.**

**Landing line**: no commits.
