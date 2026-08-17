# eng_for_tam — adjudication of 40 residual known-side hits (A135)

Known language = Tamil. Sample: `node .a135-scratch/adjudicate-helper.cjs eng_for_tam --sample=40` (deterministic — same 40 on re-run).

Debut seeds below were re-derived independently with `.a135-scratch/adjudications/probe2.cjs`, which lists every already-given known-side token *containing* a substring (the helper only compares character **prefixes**, so it misses relatives that differ in the first grapheme — e.g. it reported "nothing shares even 2 characters" for இதை although இந்த was given at seed 18, and for செய்ய although the whole செய் paradigm starts at seed 46).

| phrase_id | flagged word | gloss | verdict | reason |
|---|---|---|---|---|
| S0083L03B03 | இதை | this / it (accusative) | FP-FUNCTION | Demonstrative pronoun + accusative -ஐ; demonstrative இந்த "this" given seed 18, target side asks only for "this". |
| S0025L03U04 | பேசப் | to speak (infinitive + sandhi ப்) | FP-MORPH | Same lexeme as பேச "speak" (seed 1); the ப் is euphonic doubling before போகிற-. |
| S0016L01U05 | செய்ய | do (light verb of "பயிற்சி செய்" = practise) | FP-OTHER | Multiword-gloss artefact: "practise" was given as the bare noun பயிற்சி (seed 5); the compound-verb light verb adds no target-side item. |
| S0084L03U02 | இதை | this / it (accusative) | FP-FUNCTION | As S0083L03B03. |
| S0100L03U02 | இதை | this / it (accusative) | FP-FUNCTION | As S0083L03B03. |
| S0007L01U02 | செய்ய | do (light verb of "பயிற்சி செய்") | FP-OTHER | As S0016L01U05. |
| S0092L02U01 | இதை | this / it (accusative) | FP-FUNCTION | As S0083L03B03. |
| S0013L01U05 | செய்யப் | do (light verb + sandhi ப்) | FP-OTHER | As S0016L01U05, plus euphonic ப் before போகிற-. |
| S0016L05U02 | பேசப் | to speak | FP-MORPH | Base பேச seed 1. |
| S0118L01U01 | பாரில் | in the pub | FP-MORPH | Locative -இல் (seed 4) on பார் "pub", given in this same seed 118. |
| S0136L01U01 | அவளிடம் | to her | FP-FUNCTION | Pronoun அவள் "she" (seed 17) + animate locative -இடம்; English needs only "her". |
| S0098L02U03 | இதை | this / it (accusative) | FP-FUNCTION | As S0083L03B03. |
| S0018L01U04 | பேசுகிறோம் | we speak (pres. 1pl) | FP-MORPH | Finite agreement form of பேசு (seed 1). |
| S0028L02U01 | பேசுகிறீர்கள் | you speak (pres. 2pl) | FP-MORPH | Finite agreement form of பேசு (seed 1). |
| S0218L01U04 | அன்று | on (that day) | FP-FUNCTION | Temporal postposition in "ஞாயிறு அன்று = on Sunday"; never given anywhere in the course and never would be — it is grammar, not vocabulary. |
| S0333L01B02 | அவளால் | by her / she can | FP-FUNCTION | Pronoun அவள் (seed 17) + instrumental -ஆல், the standard potential construction. |
| S0460L02U01 | கடையை | shop (accusative) | FP-MORPH | கடை "shop" given in this same seed 460. |
| S0005L04U01 | பேசப் | to speak | FP-MORPH | Base பேச seed 1. |
| S0018L01U01 | பேசுகிறோம் | we speak | FP-MORPH | Base பேசு seed 1. |
| S0038L01U03 | செய்ய | do (light verb of "பயிற்சி செய்") | FP-OTHER | As S0016L01U05. |
| S0112L03U05 | இதை | it (accusative) | FP-FUNCTION | As S0083L03B03. |
| S0153L03U02 | வழியில் | in the way | FP-MORPH | Locative of வழி "way" (seed 94); the exact form debuts as a lego only at seed 443. |
| S0333L02B02 | அவளால் | by her / she can | FP-FUNCTION | As S0333L01B02. |
| S0336L01U03 | அவளால் | by her / she can | FP-FUNCTION | As S0333L01B02. |
| S0372L02U01 | ஏதோ | something (indefinite) | FP-FUNCTION | Indefinite pronoun on the எது root with clitic -ஓ; ஏதாவது "something" given seed 4 and the English target is the identical "something". |
| S0424L01U03 | பணத்தை | money (accusative) | FP-MORPH | Oblique -த்த- + accusative on பணம் "money" (seed 195). |
| S0601L01U08 | பாரில் | in the pub | FP-MORPH | Locative of பார் "pub" (seed 118). |
| S0461L01U02 | கடையை | shop (accusative) | FP-MORPH | கடை seed 460. |
| S0461L01U03 | கடையை | shop (accusative) | FP-MORPH | கடை seed 460. |
| S0281L01U04 | பிடிக்கும் | (I) like | **REAL** | The whole பிடி-as-"like" lexeme is absent before this point — first form பிடிக்க seed 334 (and in the "hold" sense), "liked" only at 346. Learner must produce English "like" off a Tamil verb never given. |
| S0360L02U05 | ஏதோ | something | FP-FUNCTION | As S0372L02U01. |
| S0343L01U04 | ஏதோ | something | FP-FUNCTION | As S0372L02U01. |
| S0491L01B03 | பிடிக்கும் | (I) like | FP-MORPH | By seed 491 the "like" sense is given: பிடித்திருந்தது "liked" (346), பிடிக்கவில்லை "didn't like" (364); this is the habitual/future finite form of it. |
| S0341L02U01 | உன்னை | you (accusative) | FP-FUNCTION | Pronoun உன்/நீ (உன் seed 306) + accusative -ஐ; exact form debuts as a lego at 501. |
| S0336L02B02 | அவளால் | by her / she can | FP-FUNCTION | As S0333L01B02. |
| S0336L02U05 | அவளால் | by her / she can | FP-FUNCTION | As S0333L01B02. |
| S0247L01U03 | ஓரளவு | fairly / to some extent | **REAL** | Lexicalised adverb; no form of it given anywhere (ஓர- returns nothing). அளவு "extent" exists at seed 7 but ஓரளவு is a distinct solid compound adverb, and the target demands the new English adverb "fairly". |
| S0176L02U03 | அவனை | him (accusative) | FP-FUNCTION | Pronoun அவன் "he" (seed 105) + accusative -ஐ. |
| S0662L01U04 | பேசுகிறீர்கள் | you speak | FP-MORPH | Base பேசு seed 1; பேசுகிறாள் already at 285. |
| S0662L01B03 | பேசுகிறீர்கள் | you speak | FP-MORPH | As S0662L01U04. |

## Tally

| verdict | count |
|---|---|
| REAL | 2 |
| FP-MORPH | 16 |
| FP-FUNCTION | 18 |
| FP-OTHER | 4 |
| UNSURE | 0 |
| **total** | **40** |

Confirmed-real rate: **2/40 = 5%**.

## Note on the one debatable class

The four `செய்ய` / `செய்யப்` cases (seeds 7, 13, 16, 38) are the only ones where a strict letter-of-the-rubric reading could give REAL: the lexeme செய் "do" has no form in the inventory before seed 46, and debuts as a lego at seed 59. I ruled FP-OTHER because in every one of the four the word is the light verb of the compound verb `பயிற்சி செய்` = "practise", whose content noun `பயிற்சி` was given at seed 5 with exactly the gloss "practise" — so no new target-side item is demanded, and a native Tamil speaker (the known side is the learner's L1) meets no new word. If Kai prefers the strict reading, the real rate becomes 6/40 = 15%.
