# jpn_for_eng — cleanup scan findings (#447, jpn slice)

Read only. Nothing was applied, rendered or linked. The course was read live through Popty's `script-view` route on 17 Nov at 14:06Z: 667 seeds, 1,275 LEGOs and 13,964 rows, of which 11,053 are played.
Every row is listed in `jpn.json` beside this file, with its live id, the fix, a confidence word and the audio characters.

**Read this first.** The app only serves jpn seeds 1–300 to learners. Seeds 301–668 already have a KNOWN verdict: their baskets were made by a June padding generator and need rebuilding (#195 follow-up, d/6be32406). So this list puts seeds 1–300 first. 394 of the 409 new findings are in seeds 1–300.
My scan confirms that the generator's glued tails do not reach seeds 1–300. The tails are ことがある after a noun, ますかから and があるから. All 58 hits are in 301+.

**New findings: 409 rows in 14 families. About 15,600 audio characters**, of which ≈10,800 is an upper bound for re-making whole baskets (F1). Another 32 rows have empty audio slots. That gap was already noted in d/71221f73, so they are KNOWN and not counted as new.
How audio is counted: new target text ×2 voices + new known text ×1. A delete or a link to an existing clip costs 0.
Every fix to Japanese wording cites a grammar source. Nobody here reads Japanese natively.

---

## F1 — A particle or a bound ending is taught as its own LEGO (21 LEGOs, all in seeds 1–300)
**What it is.** Some LEGOs are a bare particle or a verb ending that can't be said alone. Examples are ね, よ, から, だけ, たかった and ほしかった.
Canon L7 (HARD) says a particle is never an atomic LEGO. L22 says a bound ending grows to the verb in its own seed, on both sides, and the basket is then re-made with that combination.
- S0120L01 right | ね → *it's interesting, right? = 面白いね*
- S0022L02 because | から → *because I want to meet = 会いたいから*
- S0136L02 you know | よ → merge with L01: *you can ask, you know = 聞いていいよ*
- S0052L01 wanted to | たかった (+ L02 手紙を書く) → *wanted to write = 書きたかった* + *a letter = 手紙を*
- S0297L02 many | あまり → this teaches the wrong meaning (あまり + negative = "not many"). Fix: *don't know many = あまり知らない*

Also in this family: 071 たくなかった, 106 なくても, 113 だろう, 132 ほど, 135 のか, 137 ほうが, 140 ことが, 146 らしい (not in the seed at all), 151 ほしかった, 170 てほしい, 190 いい, 206 のが ("the chance" is a wrong gloss), 224 ばかり, 269 たくない, 279 なかった, 280 だけ.
**21 REAL, 21 read.** Canon check: L7, L22 and L26. A particle may still sit inside an M-LEGO as a component (C13). These are standalone A/M LEGOs, so that exception does not apply.
**Confidence:** sure on the rule; likely on each wording. Source: L22 procedure; Makino & Tsutsui, *A Dictionary of Basic Japanese Grammar* (DBJG). **Audio:** ≤10,825 chars. That is the upper bound, re-voicing every row of the 21 baskets. A real rebuild keeps the rows that already use the seed's combination.

## F2 — The LEGO is not in its own seed (12 in seeds 1–300, 7 in 301+)
**What it is.** The LEGO is a dictionary form or a stand-in verb, but the seed uses a different form. Canon L26 (HARD) says a LEGO says only what its seed says.
- S0062L01 I'm not sure if I can | できるか分からない — できる is a stand-in verb; the seed says 手伝えるか分からない → re-cut to *I'm not sure if I can help = 手伝えるか分からない* + *at the same time = 同時に*
- S0061L01 could you say that again | もう一度言って — ゆっくり splits it in the seed, which makes it a gapped LEGO → seed Japanese → ゆっくり、もう一度言って
- S0055L01 sleep well | よく眠れる — the seed says よく眠れなかった, and よく眠れる means "can sleep well" → *couldn't sleep well = よく眠れなかった*
- S0262L01 man | 男性 — the seed 昨日、誰と話してた？ never says "man" → seed English → "who were you talking to yesterday?". 男性 then waits for seed 264.
- S0241L01 hand over | 渡す, S0300L01 seem | 見られる, S0002L01 do | やる — the M-LEGO next to each one already tiles the seed. Make each of these a component of that M-LEGO.

Also: 053, 069, 299 (re-cut), 146 (see F1). 255 出る: **caution**. #515 made S0345L01 not-new against it, so retiring 255 would re-open 345.
Seeds 301+: 302, 327, 355, 366, 380, 382, 580.
KNOWN, left out of the count: 54, 70, 240, 251 and 268 (d/71221f73, "seed doesn't tile").
**19 REAL, 19 read.** **Audio:** ≈1,815 chars, including the baskets of the 6 re-cut LEGOs.

## F3 — English says he/she/they, but the Japanese says "I want" (23 rows, all in seeds 1–300)
**What it is.** A bare たい with no subject means "I want", or "you want?" in a question. To say he/she/they wants, Japanese needs ～たがる or a hearsay ending (DBJG, -tai). Your held item 428 in d/71221f73 is the same point.
- SEED299 he wants to pay half | 半分払いたい → "I want to pay half" (build row B02 already says this)
- SEED300 she doesn't want to seem unfriendly | 冷たく見られたくない → "I don't want to seem unfriendly"
- SEED212 they wanted to ask for help | 助けを求めたかった → "I wanted to ask for help"
- S0211L02U03 he doesn't want to explain the reason | 理由を説明したくない → "I don't want to explain the reason"

**23 REAL, 23 read.** **Fix:** change the English only, or delete where the basket already has the I-row. **Confidence:** sure. **Audio:** 689 chars, known side only.

## F3b — he/she + present-tense たい, with the subject stated in Japanese (26 rows, seeds 16, 34, 35 and their baskets)
- SEED16 彼は、あとでみんなと一緒に戻りたい → 戻りたがってる
- SEED34 …彼は静かにしたくない → 静かにしたがらない
- SEED35 彼女は今日の午後、何も読みたくない → 読みたがらない
- Rows like S0016L03B01 he wants to go back | 彼は戻りたい: delete where an I-row remains.

The course already teaches the right form at seed 17 (彼女は、答えを知りたがってる), so the learner meets both.
Past-tense 彼は…たかった in narration (seeds 52, 53, 69, 70) is accepted by most grammars, so it is **not** listed.
**Confidence:** likely. Bare たい after 彼は is common in casual speech, but textbooks mark it. **Audio:** ≈114 chars for the 3 seeds. Rows cost 0 if deleted.

## F4 — Wrong meaning or wrong English (22 rows, all in seeds 1–300)
- **S0282L01 no | うん** — うん means *yes*. All 13 rows read like "no, I like it | うん、好き". Fix: seed 282 English → "yes, that's not a problem". L01 becomes not-new against S0172L01 (yes = うん). Delete B01–U09 and relink U10 to the seed's clip. **sure**
- **SEED108 / S0108L03** "we didn't hope to wake…" | 夜中に起きるとは思ってなかった — とは思ってなかった means "didn't *expect*" → "I didn't expect to wake up in the middle of the night". **sure**
- S0110L03 to relax | 休みたい → "I'd like to relax". S0092L02 keep on doing | 続けたい → "want to keep on doing". S0200L02 make sure that | ようにしたい → "want to make sure". S0005L02 with other people | 他の人とも → "…too". **sure**
- S0151L02U02, U07, S0154L01U03, S0156L01U03: "I was hoping to see you / we could go" | ～てほしかった. That form means "I wanted *you* to…" → delete. **sure** (DBJG -te hoshii)
- S0107L02B03, U02, U07, U08: "hoped to see you" | あなたを見たかった. 見る said of a person means "look at"; meeting someone is 会う → delete. **sure**

Also in this family: S0040L01 "what kind of feeling" is not English → "how do you feel". S0113L03 I can't remember | 覚えてない clashes with S0057L01 (思い出せない) → "I don't remember". S0225L01 "if I could" sits under a "he" seed. S0061L01U08, S0067L01B04, S0121L01B03 have English that says more than the Japanese. S0258L01U04 drops "what's".
**22 REAL, 22 read. Audio:** 223 chars.

## F5 — One English, two answers, not on the census list (3)
- **Seeds 68 and 194** are both "what are you looking for?". 68 says 何を探してる and 194 says 何探してる. Fix: merge 68's L01 and L02 into *what are you looking for = 何を探してる*; its L01 gloss "what are you = 何を" is wrong anyway. Then set 194's Japanese to 何を探してる？, so its LEGO becomes not-new. ≈1,000 chars, mostly re-voicing 194's basket.
- 336 "that = その" vs 127 "that = それが" → *that door = そのドア* (301+)
- 524 "three = 三" vs 311 "three = 三つ" → *in three or four minutes = 三、四分で* (301+)

The 8 LEGO clashes in census list C are KNOWN (d/af659c82, d/71221f73): can speak, are doing, woman, over there, can do, think, don't mind, can help. The 6 dup-debut hits are KNOWN too (d/9113817a): 329, 431 ×2, 449, 663 and 665.

## F6 — A row does not contain its LEGO (18 rows, all in seeds 1–300)
- S0154L01U10/U11 (LEGO 土曜の夜) ask about Sunday morning and afternoon. 日曜 is not taught until seed 175.
- S0273L02U01–U05 (LEGO 多すぎる) use 働きすぎ / 考えすぎる.
- S0280L03U05/U07 (LEGO だけ) use しか…ない.
- S0276L02 (いられる) rows say いたい / いられない. Canon K50: a different verb form breaks the LEGO.

**Fix:** delete, 0 chars. The exception is S0274L02: it has only 4 builds, so reword its rows to contain 出ないといけない (≈150 chars).
**18 REAL, 18 read.**

## F7 — Two sentences in one row (7)
- SEED41 大丈夫。でも、疲れてきてる → 大丈夫、でも、疲れてきてる. This is the same fix #421 proposed for 73/96/173/193. ≈26 chars.
- Delete S0041L01B02 (大丈夫。でも), S0127L02U06, S0163L01U06 and S0249L01U06–U08, as #434 did with S0166L01U07.

## F8 — A not-new LEGO that was never taught (2)
- S0207L01 done | やった and S0257L01 blue | 青い have no earlier twin. Flip both to new: they already have debuts and full baskets. Seed 257 then plays.
- #515 saw this case ("Case B") and left it. 0 chars.

## F9 — The seed sentence is not played as written (53 seeds, 1–300, none on a held list)
- Each of these seeds has a played copy with the seed's exact Japanese and clips. Only the copy's English differs, for example SEED25 "are you going to help me before I have to go?" vs the copy "will you help before I go?".
- Fix: the seed English takes the copy's English and the copy's known clip, so 0 chars. This is the route you took for 37 seeds on 29 Oct.
- About half are trivial drift (talking/speaking, "I'd"/"I would"). The census readers marked those trivial, and they were never put to you.
- Exceptions:
  - 123 has no copy, so add the seed as a USE row.
  - 241: add the seed as a USE row under L02.
  - 258: the copy's English is wrong (F4).
  - 68: see F5. 41: see F7. 257: see F8.
- Seeds 301+ (141 more) belong to the rebuild.

## F10 — An English question with no "?" (11 rows)
- S0072L02U01, S0075L01U01/U02/U05, S0077L01U05, S0079L01U01–U08. For example, "when did you go | いつ行った？".
- The known clip is read as a statement. Add "?" and re-voice the English: 252 chars.

## F11 — The seed says "old", the LEGO says "elderly" (3 seeds)
- SEED231 "an old man" (the Japanese 年配の人 says person) → "an elderly person". SEED232 → "an elderly woman". SEED264 → "an elderly man". 116 chars.
- The 26 "elderly" rows the detector found are consistent with their LEGO, so they are **not defects**.

## F12 — The same row twice in one basket (180; 174 in seeds 1–300)
- 101 are a use row that repeats a build, 74 are build/build and 5 are use/use. For example, S0011L01U01 = B02 "it would be good if I could speak Japanese".
- In 21 of them the build copy lacks the "?" of its use twin.
- Fix: delete one copy, keeping the use row. 0 chars. **180 REAL, 180 read** (the pairs were read in one pass).

## F13 — A played row with an empty audio slot (32, all in seeds 1–300) — KNOWN-noted
- Listed in jpn.json with the slots that are empty, for example S0029L01U01–U05 with all three slots empty.
- 10 of them are also F12 duplicates: delete those instead.
- The rest cost ≈878 chars through `/api/audio/render`.

## F14 — Verb LEGO English without "to" (K54, 21 in seeds 1–300; ~35 more in 301+)
- S0299L01 pay | 払う → "to pay". S0251L02 find out | 知る → "to find out". S0083L01 agree with → "to agree with".
- Each intro is re-voiced in the same pass (O13). Some overlap F1/F2, which re-cut them anyway.
- K54 was applied to zho on 4 Nov; it has not been applied to jpn yet. 251 chars, known side.

## NOT defects (read, mechanism stated)
- **article_drift (3).** Japanese has no articles, so "a sentence" and "the sentence" are the same 文を (K3).
- **tag_phrase (2).** S0366L02C03 and S0650L01C02 are component tiles, which are never played.
- **bare yes/no echo (3).** S0172L01 "yes it is / yes I do | うん". Plain うん is how Japanese answers, so several Englishes over one target is fine (K3). The Irish echo rule is per language.
- **Question marks: 16 of 28 in seeds 1–300 are fine.** S0120's ね tags and S0171/S0250 requests are written without ？ in Japanese. Seed 61 is a request.
- **Mood-checker flags that are fine** (`tools/jpn-prompt-mood.cjs`, run unchanged on the dump):
  - って言いたい "trying to say" (102) and 言いたいこと "what I mean" (8) are standard idioms.
  - いらない "don't want" and ～おうか "do you want me to" are idiomatic.
  - "would you like" (271) is a gap in the tool's regex.
  - みたい (124) is not たい.
  - も in もかからない (256) is "not even", not "too".
  - "hoped to see" (107) and "not ready to talk" (88) are soft English synonyms, left alone (R0.18).
- **zut_use phrase-vs-phrase clashes** (16 in seeds 1–300). Your rule (21 Oct) is that a clash counts only when a LEGO is on one side. The ones with a LEGO are in F4/F5 or KNOWN.
- **te-hoshikatta rows under 204, 237 and 238** ("wanted you/me to tell") are correct.

## Patterns added (`jpn.patterns.json`, all pass detect.cjs calibration)
| id | known positive | hits | read → real |
|---|---|---|---|
| jpn_glued_tail | 先生ことがある (#195) | 58 (all 301+) | KNOWN rebuild |
| jpn_two_sentences | ありがとう。でも… (#434 held 73) | 8 rows (+9 seeds) | F7 |
| jpn_third_person_tai | 彼は戻りたい (#421 item 428) | 27 | F3b |
| jpn_te_hoshikatta | 昨夜会ってほしかった | 44 | 4 real (F4), 40 correct |
| jpn_ni_aru_tail | 駐車場の隣にある (#434 held 467) | 7 (all 301+) | KNOWN (held 467/487 + rebuild) |
| jpn_particle_lego | ね (S0120L01) | 34 | F1 |
| en_no_over_un (known) | no, I like it | 50 | 1 family (S0282), rest fine |

The orchestrator's spa patterns don't apply to Japanese. The English `en_progressive_calque` pattern had 0 hits.

## Coverage
| family | jpn_for_eng |
|---|---|
| ZUT LEGO / seed / use | scanned (known side; ZUT key on the target with spaceless normalisation) |
| LEGO not in seed, target side | substring check only (spaceless) — scanned and read |
| LEGO not in seed, known side | scanned. 454 hits, 103 in seeds 1–300 read: most are latitude the canon allows (am/will/is, K6) or seed-English drift (F9, F11). The 351 in 301+ were not read one by one (rebuild) |
| untaught target words | **NOT RUN** — needs word tokens, which a spaceless script doesn't have |
| every seed part covered by a LEGO (S3, Kai 12 Nov) | **NOT machine-scanned** (no tokens). Seen by eye on the seeds read above: many early seeds leave words with no LEGO (e.g. 135 なんで/いい/思う) |
| phrase missing its LEGO | substring check — scanned and read |
| syllable cap | scanned, but the estimate is **wrong for Japanese** (see gaps) |
| dup rows, empty audio, not-new, dup debut, seed not played, ? mismatch | scanned and read (seeds 1–300 in full; 301+ counted) |
| lexical (jpn) | 6 patterns above + the committed mood checker |
| intro wording | **not scanned** (script-view carries no intro text) |
| female voice saying male forms | not applicable: Japanese first-person forms carry no gender here, and jpn has no gender prep (d/71221f73) |
| clip ≠ text | not scanned (by ear only, A22) |

## Gaps
- **The syllable cap (L3) is not really enforced for Japanese.** The builder estimates syllables as characters ÷ 1.5. That undercounts kana badly.
  - Counted by hand: S0074L02 理解するのを手伝ってくれて is ~13 syllables; S0090L01 もっとゆっくり話してくれる 12; S0277L03 来週早めに大事な会議がある 14; S0291L02 上手に話せるようになりたい 13. The tool says 9 for each.
  - The 27 at "7–8" are mostly over 8 too. For example, 聞きたいことがあった is 9.
  - A real count needs readings, which the dump does not carry. So I listed no number.
  - Proposed shorter cuts for the four above:
    - 理解するのを + 手伝ってくれて
    - もっとゆっくり + 話してくれる
    - 来週早めに + 大事な会議がある
    - 上手に話せる + ようになりたい
- I did not check whether any row I would change is one of the course's 75 human recordings.
- I did not read seeds 301–668 row by row. They are a KNOWN rebuild; I report counts only.
- No native speaker read any of this. Every Japanese wording above cites DBJG or the course's own taught forms.
- d/e28e8364 (in my brief) is the romanisation record for ara/hye/mkd. It says nothing about jpn, so the "301+ romaji open" point was not checked.
