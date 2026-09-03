# Duplicate-target scan: "same seed, different known, identical target" — all courses except fin_for_eng

**Scope:** read-only scan of `course_practice_phrases`. No data changed.
**Key used:** `SUPABASE_SERVICE_KEY` from `.env` (service role — the RLS-bypassing key, not anon).
**Method:** keyset-paginated fetch by `id` in pages of 1,000 (offset pagination 500-errored past ~590k rows on this table, so switched to `id=gt.<last_id>` cursoring). Grouped rows by `(course_code, seed_number)`, normalised `known_text`/`target_text` (NFC-normalise, trim, lowercase, collapse whitespace — this is why the Unicode-boundary warning in the brief doesn't bite: no regex `\b` is used anywhere, only whole-field compare), then flagged any pair in a group where normalised `target_text` matches and normalised `known_text` differs.

## Calibration — mandatory check, with a wrinkle

Before the full scan, an ad-hoc live query against `fin_for_eng` seed 59 (run first, timestamped before the full fetch) returned both flagged rows:

```
fin_for_eng:S0059L01U06 | "I know that you're learning Finnish" -> "mä tiedän, että sä oot oppimassa suomea"
fin_for_eng:S0059L01U07 | "I know you're learning Finnish"      -> "mä tiedän, että sä oot oppimassa suomea"
```

Both `phrase_role: use`, both under lego `S0059L01` — the exact pair Kai flagged. Fed through the normalize+compare logic directly: targets match, knowns differ, same-lego key matches. **Detector confirmed correct.**

**Wrinkle, disclosed rather than papered over:** by the time the full 818k-row systematic fetch ran a few minutes later, `S0059L01U07` had been deleted from the live table — table row count dropped from 818,227 (checked at the start of this session) to 818,223 (both the full fetch and a fresh count check afterward agree on 818,223). This is a live production table with concurrent writers per `CLAUDE.md`; someone fixed or removed the exact row Kai flagged while this scan was running. Net effect: the systematic per-course counts below show `fin_for_eng` at 0 hits (correctly — the row's gone) even though the pattern demonstrably existed and the detector demonstrably catches it. Excluded from all tables below per the brief regardless.

## The two-thirds cut: raw hits vs what's actually the flagged shape

The raw detector (any `phrase_role` combination) found **2,356 same-lego + 1,191 cross-lego = 3,547 raw hits across 91 courses**. Hand-checking the top offenders (`jpn_for_eng`, `eng_for_jpn`, `kor_for_eng`, `ita_for_eng`) showed most of that is **not** Kai's pattern — it's `build` vs `use` (or `build` vs `component`) pairs, e.g.:

```
jpn_for_eng:S0001L02B02 (build) | "want to speak Japanese"   -> 日本語を話したい
jpn_for_eng:S0001L02U01 (use)   | "I want to speak Japanese" -> 日本語を話したい
```

That's the lego-build tile and the sentence that uses it, sharing target text because Japanese/Korean drop the subject pronoun the build tile omits. It's the methodology working as designed, not redundancy — a `build` phrase existing without its own target form is normal; a `build`+`use` pair is a different phrase_role pair by construction, not two competing full sentences. Role-pair breakdown of the 3,547 raw hits:

| role pair | count |
|---|---|
| build ↔ use | 1,415 |
| build ↔ build | 980 |
| use ↔ use | **768** |
| build ↔ component | 247 |
| component ↔ component | 128 |
| component ↔ use | 9 |

Kai's flagged pair was **use ↔ use** (two full "use" sentences, not a build tile and its expansion). Restricting to that shape cuts the total from 3,547 to **768** — a 78% reduction, comfortably past "cut by two thirds" — leaving:

- **278 same-lego use↔use hits** (27 courses) — high confidence, this is exactly Kai's shape
- **490 cross-lego use↔use hits** (64 courses) — lower confidence per the brief (same seed, different lego, still worth a human look but more likely to be a legitimate two-lego overlap)

Everything below is this refined use↔use count. The build/component-involving pairs are NOT reported as findings — they're a different, expected shape and reporting them as "redundant phrases" would itself be a false-positive headline.

## Per-course table (use↔use only), sorted by same-lego count descending

98 courses scanned (99 total in the table minus `fin_for_eng`, excluded per the brief).

| Course | Same-lego | Cross-lego |
|---|---|---|
| eng_for_jpn | 145 | 163 |
| jpn_for_eng | 65 | 6 |
| kor_for_eng | 10 | 29 |
| ita_for_eng | 9 | 2 |
| zho_for_eng | 7 | 6 |
| por_for_eng | 6 | 1 |
| fra_for_eng | 5 | 2 |
| spa_for_eng | 4 | 2 |
| eng_for_tam | 3 | 14 |
| eng_for_hin | 3 | 3 |
| eng_for_zho | 3 | 0 |
| eng_for_kan | 2 | 2 |
| por_br_for_eng | 2 | 1 |
| deu_for_eng | 1 | 25 |
| eng_for_pan | 1 | 14 |
| eng_for_urd | 1 | 9 |
| ara_eg_for_eng | 1 | 5 |
| eng_for_ben | 1 | 3 |
| ara_lb_for_eng | 1 | 2 |
| srp_for_eng | 1 | 2 |
| swe_for_eng | 1 | 2 |
| eng_for_guj | 1 | 1 |
| eng_for_kor | 1 | 1 |
| eng_for_spa | 1 | 0 |
| hin_for_eng | 1 | 0 |
| hrv_for_eng | 1 | 0 |
| ukr_for_eng | 1 | 0 |
| rus_for_eng | 0 | 24 |
| fra_for_zho | 0 | 22 |
| tur_for_eng | 0 | 19 |
| fas_for_eng | 0 | 15 |
| gle_for_eng | 0 | 14 |
| nep_for_eng | 0 | 11 |
| hak_for_eng | 0 | 9 |
| eus_for_eng | 0 | 8 |
| deu_for_jpn | 0 | 7 |
| eng_for_mar | 0 | 7 |
| fra_for_jpn | 0 | 5 |
| eng_for_sin | 0 | 4 |
| spa_mx_for_eng | 0 | 4 |
| deu_ch_for_eng | 0 | 3 |
| hye_for_eng | 0 | 3 |
| lit_for_eng | 0 | 3 |
| tha_for_eng | 0 | 3 |
| bre_for_fra | 0 | 2 |
| ces_for_eng | 0 | 2 |
| deu_for_zho | 0 | 2 |
| eng_for_por | 0 | 2 |
| eng_for_tel | 0 | 2 |
| heb_for_eng | 0 | 2 |
| mlt_for_eng | 0 | 2 |
| pol_for_eng | 0 | 2 |
| spa_for_zho | 0 | 2 |
| afr_for_eng | 0 | 1 |
| ara_for_eng | 0 | 1 |
| cat_for_eng | 0 | 1 |
| ell_for_eng | 0 | 1 |
| eng_for_deu | 0 | 1 |
| eng_for_fra | 0 | 1 |
| eng_for_ita | 0 | 1 |
| glg_for_eng | 0 | 1 |
| ita_for_jpn | 0 | 1 |
| ita_for_zho | 0 | 1 |
| kor_for_hin | 0 | 1 |
| mar_for_eng | 0 | 1 |
| nld_for_eng | 0 | 1 |
| sbx_for_eng | 0 | 1 |
| spa_for_jpn | 0 | 1 |
| swa_for_eng | 0 | 1 |

**Totals: 278 same-lego, 490 cross-lego, across 69 courses with ≥1 hit** (of 98 scanned; the other 29 scanned courses had zero use↔use hits).

`eng_for_jpn` (308 combined) and `jpn_for_eng` (71 combined) dominate — together over half of all use↔use hits. Worth a dedicated pass on that language pair before anything else.

## Hand-checked samples, verbatim (35 groups across 7 courses)

### eng_for_jpn — same-lego
```
seed 62: S0062L01U02 "同時に話しながら覚えようとしています" / S0062L01U10 "同時に覚えようとしながら話しています" -> both "I'm trying to remember and speak at the same time"
seed 65: S0065L03U04 "重要です、あなた自身をテストすることが、英語を学ぶときに" / S0065L03U11 "あなた自身をテストすることが大切です、英語を学ぶときに" -> both "it's important to test yourself when you want to learn English"
seed 65: S0065L03U09 "あなた自身をテストすることが大切です" / S0065L03U12 "あなた自身をテストすることが重要です、楽しいです" -> both "it's important to test yourself but it is fun at the same time"
```
**Read:** the first is real (two ways of ordering the same clause, identical result). The second and third are suspicious in the *other* direction — the `known_text` (Japanese) strings visibly differ in wording (大切/重要, clause order) but the `target_text` (English gloss) is pasted identically. This looks like an English-gloss authoring shortcut, not a translation collision — the Japanese source really does differ. Flagging as **artefact of this course's known/target column convention**, not the redundant-encoding pattern.

### eng_for_jpn — cross-lego
```
seed 11: S0011L03U06 vs S0011L04U05 -> both "I'd like to be able to speak after you finish" (Japanese differs: 終わった後に vs 終わったら, "after"-two-ways)
seed 51: S0051L01U05 vs S0051L03U07 -> both "I enjoy doing interesting things today" (今日も vs 今日は)
seed 51: S0051L02U10 vs S0051L05U11 -> both "I enjoy doing things with my friends" (友達とすることを楽しんでいます vs 友達といろんなことをするのが好きです — these aren't even the same construction)
```
**Read:** same artefact as above — different-lego, genuinely different Japanese, identical English gloss. **Likely false positives** for eng_for_jpn specifically; the English `target_text` column there reads as a loose gloss, not a precision translation, so two different Japanese sentences legitimately share one English gloss. This course needs its own targeted look, not this detector.

### jpn_for_eng — same-lego
```
seed 52: S0052L03U01 "I'm going to speak to my friend" / S0052L03U07 "he's going to speak to his friend" -> both 友だちに話す
seed 53: S0053L01U01 "I'm going to put it in" / S0053L01U04 "she's going to put it in" -> both 入れる
seed 53: S0053L03U02 "I'm going to put it in my bag" / S0053L03U07 "she's going to put it in her bag" -> both バッグに入れる
```
**Read:** real — Japanese drops subject pronouns, so "I'm going to X" and "she's going to X" collapse to the identical target sentence. This is exactly Kai's pattern (an English distinction the target doesn't carry) and looks systematic across `jpn_for_eng` for pronoun-only known-text variants.

### jpn_for_eng — cross-lego
```
seed 190: S0190L02U07 "can I ask you some questions?" / S0190L03U07 "do you mind if I ask some questions?" -> both いくつか質問していい？
seed 301: S0301L01U02 "she said she wants to show you something" / S0301L03U01 "he said that he wants to show you something" -> both 何か見せたいって言ってた
seed 375: S0375L01U01 "he said he didn't know..." / S0375L02U02 "she said she didn't know..." -> both 何をしてたか分からなかったって言ってた
```
**Read:** all real, same root cause (pronoun dropped in Japanese). Genuine redundant-encoding candidates.

### kor_for_eng — same-lego
```
seed 74: S0074L01U06 "I'm really thankful for helping me to understand" / S0074L01U07 "thank you very much for helping me to understand it" -> both 이해할 수 있게 도와줘서 정말 고마워요
seed 100: S0100L02U01 "you shouldn't worry..." / S0100L02U06 "we shouldn't worry..." -> both 비슷한 걸 하는 것에 대해서 걱정하지 않아도 돼요
seed 106: S0106L02U02 "we just need to work hard" / S0106L02U08 "everyone just needs to work hard" -> both 그냥 열심히 하면 돼요
```
**Read:** real — Korean drops subject here too (100, 106); 74 is a "thankful for/thank you very much" synonym collapse, same shape as Kai's fin_for_eng example.

### kor_for_eng — cross-lego
```
seed 200: S0200L01U01 vs S0200L02U01 -> both 우리가 제시간에 다 끝내는지 확인하고 싶다고 해요 (known differs "in time" / "finish everything in time")
seed 325: S0325L03U01 "ten possible problems" / S0325L04U01 "ten kinds of possible problems" -> both 열 가지 가능한 문제를 생각해 봐야 해요
seed 325: S0325L03U04 vs S0325L04U03 -> both 열 가지 가능한 문제를 생각해 봐야 했어요
```
**Read:** real. The seed-325 pair is worth a second look by Kai specifically — "ten possible problems" vs "ten kinds of possible problems" is a bigger English gap than a synonym; if the Korean genuinely can't distinguish these, fine, but it's the kind of gap I'd rather a human eyeball than auto-trust.

### deu_for_eng — same-lego / cross-lego
```
same, seed 559: S0559L01U03 "she went on the path" / S0559L01U04 "she walked the path" -> both "sie ist den Weg gegangen"
cross, seed 309: S0309L02U05 "I have never before seen this" / S0309L03U06 "...seen that" -> both "ich habe das noch nie gesehen"
cross, seed 371: S0371L02U02 "...went to the cinema" / S0371L03U03 "...had gone to the cinema" -> both "...ins Kino gegangen ist"
cross, seed 415: S0415L01U01 "...is not a problem" / S0415L02U01 "...is no problem" -> both "...kein Problem ist"
```
**Read:** all real synonym/this-that/tense collapses, same shape as Kai's flag.

### rus_for_eng — cross-lego
```
seed 17: S0017L02U05 "which answer is correct" / S0017L03U01 "what the answer is" -> both "я хочу узнать, какой ответ" (note: capitalisation differs between the two rows — Я vs я — our normalizer lowercases so this correctly still counts as identical)
seed 115: S0115L01U01 "ready for a conversation" / S0115L02U03 "ready to have a conversation" -> both "Я готов к разговору"
seed 143: S0143L03U01 "...we're talking" / S0143L04U02 "...we were talking" -> both "Я знаю, о чём мы говорили"
```
**Read:** real, same shape.

### ita_for_eng — same-lego / cross-lego
```
same, seed 76: "...how much I've learnt" / "...how much I've learnt already" -> both "sono molto contento di quanto ho già imparato"
same, seed 129: "he's happy that..." / "she's happy that..." -> both "è felice che tu stia andando così bene" (Italian "felice" doesn't inflect for subject gender here — real collapse)
same, seed 134: "not a problem" / "it's not a problem" -> both "non è un problema"
cross, seed 618 (×2): "a long time has passed" family -> both "non sembra passato molto tempo" / "è passato molto tempo"
```
**Read:** all real.

### fra_for_eng — same-lego / cross-lego
```
same, seed 114: "I'm doing better than yesterday" / "I feel as if I'm doing better than yesterday" -> both "j'ai l'impression de faire mieux qu'hier" (note: the English glosses here look non-equivalent yet share French — possibly a components-drift artefact worth Kai's eye, not a clean case)
same, seed 150: "Can you tell me your name?" / "...what your name is please?" -> both "peux-tu me dire comment tu t'appelles?"
same, seed 157: "I won't be able to do it" / "...do that" -> both "je ne pourrai pas faire ça"
cross, seed 424 (×2): "waste time" family -> both "ils font perdre du temps" / "...à tout le monde"
```
**Read:** mostly real; seed 114 flagged as worth a second look (the English gloss mismatch is bigger than a pure synonym gap).

## Confidence statement

- **Same-lego, use↔use (278 hits, 27 courses):** high confidence this is Kai's pattern. Every jpn_for_eng/kor_for_eng/ita_for_eng/fra_for_eng/deu_for_eng sample checked was a genuine known-side distinction the target doesn't carry (dropped pronoun, synonym pair, this/that, tense). One exception: **`eng_for_jpn` same-lego is NOT trustworthy** — its `target_text` column reads as a loose English gloss rather than a precision back-translation, so identical glosses can mask genuinely different Japanese `known_text`. Recommend excluding `eng_for_jpn` (145 same-lego) from any acted-on headline until someone confirms how that course's known/target columns are meant to be read; that leaves **133 same-lego hits across 26 other courses** as solid.
- **Cross-lego, use↔use (490 hits, 64 courses):** lower confidence by design (per the brief) — same seed, different lego, so some fraction is legitimate component-vs-build reuse across legos rather than the flagged redundancy. Hand-checked samples outside `eng_for_jpn` looked real, but this bucket wasn't calibrated against a known Kai-confirmed cross-lego example (the brief's only confirmed case was same-lego), so treat it as a candidate list, not a verified one.
- **The excluded 2,779 raw hits (build/component-involving pairs)** are very likely *not* findings — they're the lego-tile/use-sentence relationship working as intended. Not reported as a defect.

## Gaps

- The exact flagged row (`fin_for_eng:S0059L01U07`) was deleted from the live table during this scan, before the systematic fetch ran — see calibration section. Not something this scan can control; disclosed rather than hidden.
- Row-count drift: 818,227 → 818,223 across the session (net −4) confirms concurrent writes; the systematic fetch and post-fetch count check agree with each other (818,223 both times), so the reported numbers are internally consistent as of the fetch, just not as of the very start of the session.
- Cross-lego bucket has no Kai-confirmed calibration case (only same-lego was confirmed) — flagged above as lower confidence per the brief's own instruction.
- `eng_for_jpn`'s `known_text`/`target_text` semantics didn't hold up under hand-check — flagged as a course-specific data-shape question for Kai, not resolved here (read-only scan, no fixes made).

---
**Landing line:** no commits — this was a read-only scan, nothing was written to git or the database.
