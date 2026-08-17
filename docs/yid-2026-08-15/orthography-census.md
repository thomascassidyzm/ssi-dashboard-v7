# yid_for_eng — orthography consistency census

**Scope:** 668 rows, `course_seeds` where `course_code='yid_for_eng'`, `target_text` (Yiddish, Hebrew script), translated 2026-07-07. Read-only — no writes to `course_seeds`, no audio, nothing normalised.

**Method:** DB pulled via `scripts/yid-build/q.cjs` into `.a74-scratch/yid-orthography/seeds.json` (668 rows, verified count and JSON validity). All counts below come from a mechanical scan script, `.a74-scratch/yid-orthography/analyze.cjs`, run against that file — reproducible with `node .a74-scratch/yid-orthography/analyze.cjs`. I do not speak Yiddish; every claim below is a character/token count, not a linguistic judgement. Anywhere a mechanical heuristic produced noise I couldn't resolve without linguistic knowledge, I say so explicitly rather than guess.

**Author's disclaimer on marker design:** several markers required iteration — my first-pass scripts produced false positives from Yiddish diphthongs and homographs. I show the correction in each section so the discarded numbers aren't silently missing.

---

## A. Pointed letters

| Marker | Count | Notes |
|---|---|---|
| Alef, pasekh (אַ) | 822 | e.g. seeds 3–7 |
| Alef, komets (אָ) | 1045 | e.g. seeds 3,4,6,8 |
| Alef, bare (א, no point) | 725 | **see breakdown below — not a raw defect count** |
| Pey-dagesh (פּ, /p/) | 124 | e.g. seeds 2,4,6,7,8 |
| Fey-rafe (פֿ, /f/) | 377 | e.g. seeds 3,11,12,17,18 |
| Pey/fey, bare (פ, no point at all) | **0** | every occurrence of base letter פ in all 668 seeds carries either a dagesh or a rafe point |
| Beys-dagesh (בּ) | 0 | never used — see note |
| Veys-rafe (בֿ, /v/) | 5 | seeds 136, 138, 288, 573, 574 — see below |
| Beys, bare (ב, no point) | 464 | expected — see note |
| Yud after another yud/vov, hirik-pointed (יִ) | 11 | see khirik-yud note below |

**Bare-alef breakdown (the 725 figure is not one thing):**
- 711 are **word-initial**. A direct check of which lexemes take a leading אי vs. plain יי, and אוי vs. plain וו, shows **zero mixing within a lexeme**: e.g. ייִדיש ("Yiddish") and ייִנגל ("boy") never take a prefix alef (11 occurrences, 0 exceptions); איידער ("before"), איין/איינער ("one"), אייער ("your, pl.") always do (21 occurrences, 0 exceptions); words starting with tsvey-vovn (וויל, ווי, וואָס, וועט, etc. — 563 tokens across dozens of distinct lexemes) never take a prefix alef, 0 exceptions anywhere in the corpus. This is a clean, 100%-consistent pattern — whether the specific choice of "which lexemes get the alef" matches YIVO's rule or a different tradition's rule is a call I can't make (see questions at the end).
- The remaining 14 word-initial-adjacent bare alefs are inside Hebrew-origin words that traditionally keep a bare alef (הנאה ×4, מיאוס ×3, מורא ×2, מסתּמא ×2, אַוודאי ×2, plus one maqaf-compound). None are unexplained.
- **Net finding: I found zero anomalous or unexplained bare-alef occurrences in the whole corpus.** Every bare alef is either the word-initial pattern above or inside a Hebrew-origin word.

**Beys/veys note:** in Yiddish, plain ב is unambiguously /b/ in Germanic vocabulary — dagesh is not required to disambiguate it the way it is for פ (/p/ vs /f/) or כ (/k/ vs /kh/), so 0 beys-dagesh and 464 bare ב is the expected pattern, not a gap. Veys-rafe (בֿ, /v/) is reserved for Hebrew-origin words and appears **only** in that stratum here (all 5 occurrences are in חבֿרטע, חבֿר, רובֿ, יום־טובֿים — see section C). That reservation is 100% clean in this corpus.

**Khirik-yud note:** my first attempt (flag every yud following another yud/vov) produced heavy noise — it caught normal tsvey-yudn (ey, e.g. זיי "they", ניין "no") and vov-yud (oy) diphthongs that never take a khirik, none of which are a real signal. I could not build a reliable general rule without linguistic knowledge, so **general khirik-yud placement is NOT MEASURED**. The one case I could verify directly and unambiguously is ייִדיש ("Yiddish"): all 10 occurrences use the khirik (ייִדיש), 0 without it.

---

## B. Silent alef (shtumer alef)

Directly measured, not the noisy general heuristic above:

| Pattern | Count |
|---|---|
| Word-initial אוו (alef + tsvey-vovn) | 0 |
| Word-initial וו bare (tsvey-vovn, no alef) | 563 |
| Word-initial איי (alef + tsvey-yudn) | 21 |
| Word-initial יי bare (tsvey-yudn, no alef) | 11 |

As noted in A: this is not a mixed/inconsistent 21-vs-11 split of the *same* words — it's two disjoint sets of lexemes, each spelled the same way every time it occurs (ייִדיש/ייִנגל never take the alef; איידער/איין/איינער/אייער always do; every tsvey-vovn word, no exceptions, never takes it). **The corpus is internally 100% self-consistent on this marker.** Whether "no alef before tsvey-vovn, ever" and "alef before this particular set of tsvey-yudn words" is the YIVO rule or a different one, I can't say — flagged as a question below.

---

## C. Hebrew/Aramaic-origin vocabulary (loshn-koydesh stratum)

I identified 36 loshn-koydesh-stratum words by pattern-matching (roots/letter clusters not native to Germanic Yiddish vocabulary — sin-dot שׂ, tof/kof-dagesh תּ/כּ, characteristic triliteral shapes). This list is best-effort, not exhaustive — I don't speak Yiddish and may have missed some.

| Word | Count | Example seeds |
|---|---|---|
| מסכּים (agree) | 6 | 83, 84, 384 |
| כּדי (in order to) | 5 | 56, 91, 109 |
| חודש (month) | 4 | 37, 157, 271 |
| הנאה (pleasure) | 4 | 51, 55, 101 |
| אמת (truth) | 4 | 71, 165, 522 |
| כּמעט (almost) | 3 | 26, 449, 502 |
| מעשׂה (story) | 3 | 36, 310, 527 |
| משפּחה (family) | 3 | 408, 520, 614 |
| מיאוס (disgusting) | 3 | 551, 552, 553 |
| מזל (luck) | 2 | 379, 532 |
| מסתּמא (probably) | 2 | 528, 613 |
| טעות (mistake) | 2 | 537, 617 |
| מעשׂיות (stories) | 2 | 597, 598 |
| בשעת (while) | 2 | 440, 512 |
| שבת (Sabbath) | 2 | 154, 215 |
| מורא (fear) | 2 | 183, 521 |
| אַוודאי (certainly) | 2 | 117, 136 |
| יום־טובֿים (holidays) | 2 | 573, 574 |
| חבֿר (friend, m.) | 1 | 138 |
| חבֿרטע (friend, f.) | 1 | 136 |
| שׂימחה (joy) | 1 | 292 |
| רובֿ (majority) | 1 | 288 |
| צדקה (charity) | 1 | 437 |
| עצה (advice) | 1 | 173 |
| מלחמה (war) | 1 | 462 |
| מתּנה (gift) | 1 | 474 |
| תּיכּף (immediately) | 1 | 489 |
| תּירוץ (excuse) | 1 | 523 |
| כּעס (anger) | 1 | 542 |
| חשק (desire) | 1 | 363 |
| קהילה (community) | 1 | 418 |
| צרות (troubles) | 1 | 503 |
| משוגע (crazy) | 1 | 536 |
| בשלום (in peace) | 1 | 562 |
| מחיה (delight) | 1 | 567 |
| סיבות (reasons) | 1 | 475 |
| נישקשה (not bad) | 1 | 41 |

**Finding: all 36 words are spelled in traditional (unvocalised-per-Hebrew-convention) form, none phonetically.** Their Hebrew-derived points (sin-dot on שׂ, dagesh on תּ/כּ) are preserved consistently every time the word occurs — e.g. מסכּים always has the kaf-dagesh, never a bare-kaf phonetic spelling. I found **zero** double-spelled loshn-koydesh words (i.e. no word in this list appears both traditionally and phonetically spelled).

Caveat on diagnostic value: this marker is weaker than the brief implies for distinguishing YIVO from Hasidic/traditional in practice, because *both* traditions retain traditional Hebrew-component spelling for this stratum — phonetic spelling of loshn-koydesh words is rare in any camp. So "spelled traditionally, 100% of the time" is good hygiene but not on its own strong evidence for YIVO specifically. Flagged as a question below.

---

## D. Final forms

Mechanical check of the five sofit letters (ך ם ן ף ץ) vs. their regular forms (כ מ נ פ צ), word-finally vs. medially, across all 668 seeds.

- **Regular form used where a final form was expected: 0 violations.**
- **Final form used where a regular form was expected: 4 raw hits, all false positives** — they are maqaf-joined compounds (סוף־וואָך "weekend" ×2, יום־טובֿים "holidays" ×2) where my tokenizer, splitting only on whitespace, treated the whole hyphen-joined compound as one word. Each half of the compound is itself a complete word and its final letter is correctly final *within that half* (סוף ends in tsadek — wait, fey — correctly, because סוף is a complete word; יום ends in mem correctly, complete word). **Net: zero real final-form violations found anywhere in the corpus.**

I also ran a second, independent check (frequency-table pairs differing by exactly one letter, filtered to final/regular-letter swaps) as a cross-check — it surfaced 4 candidate pairs, and all 4 turned out to be unrelated real words of similar shape (מאַכן "make" vs מאַן "man"; זען "see" vs זעצן "sit"; זוכן "search" vs זון "sun/son"; זיצן "sit" vs זין "sons") — not spelling variants of the same word. No final-form defects survive either check.

---

## E. Word-final / suffix spelling — internal consistency (frequency table method)

Built a frequency table of all 932 distinct whitespace-delimited tokens (`.a74-scratch/yid-orthography/token-freq.json`), then grouped tokens that collapse to the same form once all Hebrew point marks are stripped (`.a74-scratch/yid-orthography/point-variant-groups.json`), and separately every pair of tokens exactly one letter apart (`.a74-scratch/yid-orthography/subst-pairs.json`, 498 pairs — this file is large and dominated by genuinely distinct real words that happen to be one letter apart; I did not hand-verify all 498, flagging it as raw material for further review rather than a finding).

**Point-stripped groups: 7 found.** I checked each against its known_text to see whether it's really the same word spelled two ways, or two different words that only collide once you strip points:

| Stripped form | Variant 1 | Variant 2 | Verdict |
|---|---|---|---|
| ווארט | וואָרט "word" (seeds 6,160,205,533) | וואַרט "wait!" (seed 476) | **different words** — false positive |
| פאר | פֿאַר "for/why" (seeds 21,67,82,99,105,113) | פּאָר "pair/few" (seeds 56,155,216,253,274,341) | **different words** — false positive |
| אן | אָן "on/without" (seeds 41,77,122,281,434,501) | אַן "an" (seeds 130,164,173,225,231,232) | **different words** — false positive |
| דארף | דאַרף "need" (seeds 44,45,59,96,139,188) | דאָרף "village" (seeds 550,552) | **different words** — false positive |
| ארט | אַרט "bother" idiom (seeds 48,63,155,190,191,281) | אָרט "place" (seeds 364,405,510) | **different words** — false positive |
| פארן | פֿאָרן "to travel" (seeds 95,379) | פֿאַרן "for the" (seeds 142,198,237,459) | **different words** — false positive |
| **האלט** | **האַלט "think" (seeds 47,123,163,185,261,303 — 6×)** | **האָלט (seed 419 — 1×)** | **candidate real inconsistency** |

The one surviving candidate: seed 419 — *"אויב זיי ווילן אַז מענטשן זאָלן זיי האָלט האָבן"* ("If they want people to like them") — uses האָלט (qamats) where all 6 other occurrences of what looks like the same verb (האַלטן, "to think/hold [an opinion of]") use האַלט (pasekh), e.g. seed 47 *"איך האַלט אַז..."* ("I think that..."). This is the single clearest internal-inconsistency candidate the mechanical pass found. **I can't confirm it's the same lexeme in the same sense without Yiddish** — put to the speaker below.

Six of the seven point-variant collisions are pointing doing real disambiguating work between unrelated words, not noise — that's evidence the pointing in this corpus is load-bearing and applied carefully, not decorative.

I explicitly did **not** find a second spelling of any of the 36 loshn-koydesh words in section C, nor of ייִדיש/ייִנגל, nor any variant of the shtumer-alef lexemes in B — those markers came back completely clean.

---

## F. Punctuation and abbreviation

| Marker | Count |
|---|---|
| Hebrew geresh (׳) | 0 |
| ASCII apostrophe (') | 0 |
| Hebrew gershayim (״) | 0 |
| ASCII double-quote (") | 0 |
| Maqaf (Hebrew hyphen ־) | 8 — all in compound nouns: סוף־וואָך ×2, צימער־נומער ×1(+1 within a sentence), פּאַרקיר־פּלאַץ ×1, יום־טובֿים ×2, לענג־אויס ×1 |
| ASCII hyphen (-) | 0 |
| Ends with period (.) | 0 |
| Ends with question mark (?) | 111 |
| Ends with exclamation (!) | 0 |
| Ends with no terminal punctuation (Hebrew letter/point) | 557 |
| Ends with anything else | 0 (111 + 557 = 668) |

No abbreviations occur anywhere in the corpus (0 geresh/gershayim usage, and nothing that would call for it), so this sub-marker is not applicable rather than inconsistent. Maqaf is used consistently for compound nouns, never as a plain-hyphen substitute, and no ASCII hyphen appears anywhere to compare it against.

**Sentence-final punctuation is binary and 100% rule-governed by sentence type, not stylistically mixed:** every declarative seed ends with a bare Hebrew letter (no period — periods are simply never used, 0 for 0), and **every single question (111/111) ends with a question mark**.

**Known-text cross-check:** 109 seeds have `known_text` ending in "?" (I count 109 here vs. 111 target-text seeds ending in "?" — 2 more target seeds end in "?" than known-text seeds do; not investigated further, flagged below). Of the 109 known-text questions, **all 109 (100%) have a matching "?" in target_text. Zero mismatches.**

---

## Verdict

**Given the counts above, I can say the corpus is internally self-consistent to an unusually high degree** — every marker I could measure cleanly (pey/fey pointing, veys-rafe reservation, alef placement, shtumer-alef lexeme choice, loshn-koydesh traditional spelling, final-form usage, sentence-final punctuation) came back at or near 100% consistent, with exactly **one** candidate real spelling variant found in 668 seeds (האַלט/האָלט at seed 419) out of 932 distinct tokens.

**I cannot say whether this consistent system IS specifically YIVO, specifically traditional/Hasidic, or some other consistent convention** — that call requires knowing the actual rule content (e.g. "does YIVO require shtumer alef before tsvey-vovn or not"), which I don't have reliable knowledge of and did not want to guess at per the honesty rule. What I can say with confidence from pure counting:

- It is **not mixed in the sense of "some seeds YIVO, some seeds Hasidic"** — there's no seed-range split, no cluster of seeds that disagree with the rest. The one candidate inconsistency (seed 419) is a single token among 668 seeds, not a systematic split.
- It is **not "no convention at all"** — the pointing, the shtumer-alef placement, and the loshn-koydesh spelling are far too systematic (near-zero exception rate across hundreds of occurrences) to be unplanned or ad hoc.
- Whether the *specific* choices match the label "YIVO" needs a native/expert eye — see below.

---

## QUESTIONS FOR A YIDDISH SPEAKER

1. In seed 419, the Yiddish is *"אויב זיי ווילן אַז מענטשן זאָלן זיי האָלט האָבן"* for the English *"If they want people to like them."* Elsewhere in the same set of 668 sentences, the same-looking word for "think/consider" is spelled האַלט (pasekh, as in seed 47: *"איך האַלט אַז דאָס איז אַ גוטע אידעע"* / "I think that's a good idea") — six times, always the same way. Is the seed-419 spelling האָלט (with a different vowel point) a typo for the same word, or is it a genuinely different word/meaning that happens to look similar?

2. Throughout the whole set, words starting with a doubled-vov (like וויל "want", ווי "how", וואָס "what" — 563 times, no exceptions) are never written with a leading silent alef, while a different, smaller group of words starting with doubled-yud (like איידער "before", איין/איינער "one" — 21 times, no exceptions) always ARE written with the leading silent alef. Does that split — never for the vov-words, always for that particular yud-word group — match the spelling convention you were taught, or does it look off to you?

3. The word for "Yiddish" is spelled ייִדיש with a small mark under the second letter (khirik) in all 10 places it appears, and "boy" (ייִנגל) similarly once — is that mark present/expected in the spelling convention you use?

4. Everywhere a Hebrew/Aramaic-origin word appears (words like מסכּים "agree", אמת "truth", מזל "luck", שבת "Sabbath", יום־טובֿים "holidays" — 36 different words, listed in the report above), it's spelled the traditional way rather than sounded-out. Does that traditional spelling look like the version you'd expect to see, or does anything there look like it's using a different community's spelling for one of those words?

---

## Explicit gaps

- Marker A's general khirik-yud placement (beyond the single verified ייִדיש/ייִנגל case) is **not measured** — my heuristic produced unusable noise from ordinary diphthongs and I could not build a reliable general rule without Yiddish knowledge.
- The 498 single-letter-substitution token pairs in `subst-pairs.json` were **not individually hand-verified** — I checked the subset relevant to final-form letters (D) and the point-stripped groups (E: 7 of them), but the bulk of that file is raw and may contain further real spelling-variant pairs a Yiddish speaker could spot faster than I can.
- The 2-seed discrepancy between known-text questions (109) and target-text questions ending in "?" (111) was **noted but not chased down** — outside the marker this job was scoped to census, and I did not want to start editing/investigating individual seeds beyond what the report needed.
- I do not speak Yiddish. Every "consistent"/"clean" verdict above is a claim about *character-level repetition*, not about linguistic correctness — a systematically-wrong spelling would still read as "consistent" to this method.

## Reproduce

```
node scripts/yid-build/q.cjs "SELECT seed_number, known_text, target_text FROM course_seeds WHERE course_code='yid_for_eng' ORDER BY seed_number" > .a74-scratch/yid-orthography/seeds.json
node .a74-scratch/yid-orthography/analyze.cjs
```
Raw data: `.a74-scratch/yid-orthography/{seeds.json, token-freq.json, point-variant-groups.json, subst-pairs.json, analysis-output.txt}` (all in the gitignored scratch dir, not committed).
