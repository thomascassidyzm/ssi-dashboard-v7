# Yoruba (`yor_for_eng`) — Opus handoff brief

**Status:** Seeds 1–10 are locked and anchor-verified (6 shippable, 4 correct-by-best-evidence but gated on native questions below). Fable + the native-checked anchor (`services/briefs/reference-examples/yor.json`) was sufficient — no tone, orthography, or calque errors remain in the reference set. **Biggest risk:** wrong-but-plausible output — Yoruba word order looks deceptively English-like, and tone marks are silent meaning-changers, so a fluent-looking line can be wrong in ways casual review will not catch. **Do not LEGO-decompose seed 5 until native question 3 is answered.**

## Orthography

**Standard:** modern Standard Yoruba orthography exactly as used in the native-checked anchor file `services/briefs/reference-examples/yor.json`. That file is the gold standard; where it is internally inconsistent, the normalizations below (locked in section 5) win. Secondary verification sources: yo.wikipedia.org and dictionary sites (Glosbe, WordHippo). **Never generate tone marks from memory — every new word must be verified against the anchor or an external source.**

Hard rules:

1. **Three tones, two of them marked:** high = acute (`kọ́`), low = grave (`kọ̀`), mid = unmarked (`kọ`). These are different words, not accents. An unmarked vowel is a positive claim of mid tone, not "tone unknown".
2. **Sub-dots are mandatory:** `ẹ` (open e), `ọ` (open o), `ṣ` (sh) are distinct letters from `e o s`. `ọrọ` for `ọ̀rọ̀` is a spelling error; `so` for `sọ` is a different word.
3. **Tone + sub-dot stack** (e.g. `ọ́`, `ẹ̀`, `ọ̀ọ́` in `kẹ́kọ̀ọ́`). Any pipeline step that strips combining diacritics or mixes Unicode normalization forms corrupts content. **Audit `text_normalized` behavior on Yoruba strings before any audio work** — verify a round-trip of `ọ́`/`ẹ̀` survives.
4. **Syllabic nasal carries tone:** `ń` (progressive marker, high), `ǹ` in `nǹkan`.
5. **Rejects:** toneless Yoruba (auto-reject), dotless substitutions (e/ẹ, o/ọ, s/ṣ swaps), bare `Yorùbá` without `èdè` in speaking/learning frames, `Mi kò` negation (we standardized `Mi ò`), `míràn` standalone (we standardized `mìíràn`).

## Core grammar the builder needs

Word order: **SVO**, prepositions, noun–modifier order (`ọ̀rọ̀ kan` "a word", `tẹlifíṣọ̀n díẹ̀` "a bit of TV", `fíìmù yẹn` "that film"). Verbs do not inflect; all tense/aspect is preverbal particles.

**Subject pronouns + their negatives** (negation restructures the pronoun — never compose `pronoun + ò` naively):

| person | affirmative | negative |
|---|---|---|
| I | Mo | **Mi ò** (locked; anchor also has Mi kò — rejected) |
| you sg | O | O ò / O kò (anchor has both; prefer `O ò`) |
| he/she/it | Ó | Kò (pronoun disappears) |
| we | A | A ò / A kò (prefer `A ò`) |
| they | Wọ́n | Wọn ò (loses high tone) |

**TAM particles** (preverbal, stackable in this order: subject – ti – ń/máa – verb):

| particle | meaning | anchor evidence |
|---|---|---|
| ń | progressive AND present habitual — **required** for English simple present of ongoing activity; bare `Mo sọ` = past "I said" | line 133 `O ń sọ èdè Welsh báyìí` = "you speak Welsh now" |
| ti | perfect ("have V-ed") | line 61 `Mo ti bẹ̀rẹ̀ sí rántí` |
| ti ń | perfect progressive ("have been V-ing") | line 73 `Mo ti ń kọ́ èdè Welsh fún oṣù kan` |
| máa | (a) future; (b) would/conditional; (c) frozen half of practise idiom `máa kọ` | future line 17; would- line 905; idiom line 21 |
| máa ń | habitual "often/always" | lines 537, 885 |
| gbọdọ̀ | must | line 85 |
| lè | can | line 109 |
| ṣẹ̀ṣẹ̀ | just (recently) | line 65 |
| yóò | future inside relatives/complements | line 729 `ohun tí yóò yípadà` |

**Clause machinery:** infinitive = `láti` + verb (sometimes dropped after `gbìyànjú` — see gotcha 8); "that"-complement = `pé` (`Mo rò pé…`); relative = `tí` (`ohun tí mo fẹ́ sọ` "what I want to say"); subjunctive/"that X should" = `kí` (`kí n máa kọ`, `Mo fẹ́ kí o sọ pẹ̀lú mi` "I want you to speak with me"); yes/no question = sentence-initial `Ṣé` (`Ṣé o lè sọ ọ́ díẹ̀díẹ̀?`); wh-questions use `ni` focus (`Kí ni o máa ṣe…?`, `Níbo ni o fẹ́ lọ?`).

**Noun phrase:** indefinite = N + `kan`; definite = N + `náà`; plural = `àwọn` + N; demonstratives `yìí` (this) / `yẹn` (that) follow the noun; "the whole X" = `gbogbo` X `náà` (line 1193). Language names always `èdè` + Name.

**Object/oblique pronouns are irregular** — copy from anchor, don't derive: "it" after a verb echoes the verb's vowel with high tone (`sọ ọ́` line 137, `jù ú` line 1049); "you" object = `ọ́`/`ẹ́` (`ràn ọ́ lọ́wọ́` line 229, `ràn ẹ́ lọ́wọ́` line 945); possessives `mi/rẹ/rẹ̀/wa/yín/wọn` follow the noun; `rẹ̀` also = "it" after some verbs (`gbádùn rẹ̀` line 373). When in doubt, find the exact verb+pronoun pair in the anchor.

**Serial/split verbs:** `ràn X lọ́wọ́` "help X", `dúró dè X` "wait for X", `yí X padà` "change X", `sọ X fún Y` "tell Y X", `béèrè X lọ́wọ́ Y` "ask Y X". These are discontinuous — a LEGO must seal the frame or keep both halves in one chunk.

## LOCKED DECISIONS (contracts Opus must NOT break)

ZUT contracts and fixed lexical choices — one known → one target, course-wide:

- [ ] **Negation "I don't/didn't/can't…" → `Mi ò`** (never `Mi kò`, though the anchor has it at line 29).
- [ ] **"other/else" standalone → `mìíràn`** (never `míràn`); **`ẹlòmíràn` is a fused lexeme and exempt** from this normalization.
- [ ] **`ṣeé ṣe` spaced** in the `tó bá ṣeé ṣe` "as-X-as-possible" frame (line 953); **`ṣeéṣe` fused** only inside `Ó ṣeéṣe kí` "it's possible that" (line 529). Two different frames, two spellings, held apart.
- [ ] **Language name → `èdè Yorùbá`** in all speak/learn/say-in frames (mirrors anchor's `èdè Welsh`). Bare `Yorùbá` in these slots is a defect.
- [ ] **Register: singular informal "you" = `o` / object `ọ́`/`ẹ́` / possessive `rẹ`** throughout (anchor default; its one polite `ẹ` at line 821 is an outlier — do not copy).
- [ ] "want" → `fẹ́` (+ `láti` where the anchor shows it); "would like" also → `fẹ́` (anchor line 105 etc. — no separate polite form).
- [ ] "try" → `gbìyànjú`; "practise" → **`máa kọ` with MID-tone kọ** (never "correct" to `kọ́`); "learn" → `kọ́` (high); "speak/say" → `sọ` (mid); "speaking" (gerund object) → `sísọ`.
- [ ] "remember" → `rántí`; "explain" → `ṣàlàyé`; "mean" → `túmọ̀ sí`; "think that" → `rò pé`; "need to" → `nílò láti`; "must" → `gbọdọ̀`; "can" → `lè`.
- [ ] "something" → `nǹkan`; "a word" → `ọ̀rọ̀ kan`; "sentence" → `gbólóhùn`; "someone" → `ẹnìkan`; "someone else" → `ẹlòmíràn` (gated, Q4).
- [ ] "now" → `báyìí`; "today" → `lónìí`; "often" → `lóòrèkóòrè`; "with you" → `pẹ̀lú rẹ`; "a little" → `díẹ̀` (post-nominal/post-verbal).
- [ ] **"I'm not sure if" → `Mi ò rò pé`** ("I don't think that") — the anchor's native strategy (line 113). Never build a literal sure/if calque.
- [ ] **"how to V" → `bí mo ṣe máa V`** ("how I will V") — finite, per anchor line 29. Never a bare infinitive calque.
- [ ] Present habitual/ongoing English simple present → target takes **`ń`** (contract with gotcha 4).

## The 10 reference seeds

| n | English | Target | Gloss | Conf |
|---|---|---|---|---|
| 1 | I want to speak Yoruba with you now | Mo fẹ́ láti sọ èdè Yorùbá pẹ̀lú rẹ báyìí | I want to speak language Yoruba with you now | high |
| 2 | I'm trying to learn | Mo ń gbìyànjú láti kọ́ | I PROG try to learn | medium |
| 3 | how to speak as often as possible | bí mo ṣe máa sọ lóòrèkóòrè tó bá ṣeé ṣe | how I do will speak often as-REL it-be possible | medium |
| 4 | how to say something in Yoruba | bí mo ṣe máa sọ nǹkan ní èdè Yorùbá | how I do will say something in language Yoruba | high |
| 5 | I'm going to practise speaking with someone else | Mo máa máa kọ sísọ pẹ̀lú ẹlòmíràn | I FUT HAB-practise speaking with someone-else | medium |
| 6 | I'm trying to remember a word | Mo ń gbìyànjú láti rántí ọ̀rọ̀ kan | I PROG try to remember word one/a | high |
| 7 | I want to try as hard as I can today | Mo fẹ́ láti gbìyànjú gidigidi lónìí | I want to try exceedingly today | medium |
| 8 | I'm going to try to explain what I mean | Mo máa gbìyànjú láti ṣàlàyé ohun tí mo túmọ̀ sí | I FUT try to explain thing REL I mean | high |
| 9 | I speak a little Yoruba now | Mo ń sọ èdè Yorùbá díẹ̀ báyìí | I PROG speak language Yoruba a-little now | high |
| 10 | I'm not sure if I can remember the whole sentence | Mi ò rò pé mo lè rántí gbogbo gbólóhùn náà | I NEG think that I can remember all sentence the | high |

Rule-carrying notes: **2** — objectless `kọ́` gated on Q1 (`kẹ́kọ̀ọ́` alternative); switch before this LEGO propagates if native prefers it. **3** — composed by analogy, not attested idiom; no heavy LEGO reuse before Q2. **5** — HARD GATE: no decomposition before Q3; do not let anyone "fix" mid `kọ` to `kọ́`; the double `máa` is deliberate (future marker + idiom half). **7** — deliberately narrowed to "try very hard"; either native supplies the idiom (Q5) or soften the English prompt to "really hard" before ship; do NOT extract an "as hard as I can" chunk from it. **9** — the `ń` is mandatory, not stylistic (anchor line 133).

## Worked decompositions

Copy this pattern: ordered known-atom → target-atom pairs; SEALED = must not be split further because internal order/particles break.

**Seed 1** — `Mo fẹ́ láti sọ èdè Yorùbá pẹ̀lú rẹ báyìí`

| known | target | note |
|---|---|---|
| I want | Mo fẹ́ | |
| to speak | láti sọ | `láti` travels with the verb, not with `fẹ́` |
| Yoruba | èdè Yorùbá | SEALED — `èdè` + name is one unit (contract) |
| with you | pẹ̀lú rẹ | SEALED — `rẹ` is the bound form of "you" here |
| now | báyìí | |

**Seed 6** — `Mo ń gbìyànjú láti rántí ọ̀rọ̀ kan`

| known | target | note |
|---|---|---|
| I'm trying | Mo ń gbìyànjú | SEALED at first debut — `ń` is meaningful and invisible to the ear-untrained learner; split Mo / ń gbìyànjú only after `ń` has been taught |
| to remember | láti rántí | |
| a word | ọ̀rọ̀ kan | SEALED — indefinite `kan` FOLLOWS the noun; never a standalone "a" LEGO |

**Seed 10** — `Mi ò rò pé mo lè rántí gbogbo gbólóhùn náà`

| known | target | note |
|---|---|---|
| I'm not sure if | Mi ò rò pé | SEALED — idiom-level mapping (lit. "I don't think that"); decomposing into sure/if atoms is forbidden; `pé` never detaches |
| I can | mo lè | lowercase `mo` mid-sentence |
| remember | rántí | reuses seed 6's verb (drop `láti` after `lè` — modals take bare verb) |
| the whole sentence | gbogbo gbólóhùn náà | SEALED — `gbogbo … náà` brackets the noun; no standalone "whole" or "the" LEGO |

Anti-pattern (seed 5): `Mo máa máa kọ sísọ` must stay ONE sealed chunk until Q3 resolves. The two `máa`'s are different morphemes (future + idiom); any decomposition that creates a reusable single-`máa` "going to practise" LEGO is wrong on current evidence.

## Gotchas

1. **Tone is lexical.** `kọ` (mid, practise-idiom/write) / `kọ́` (high, learn-teach) / `kọ̀` (low, refuse) are three words. Same class: `sọ`/`sọ̀`, `wa`/`wá`/`wà`. The practise idiom is `máa` + **mid** `kọ` throughout the anchor (lines 21/33/49/81/85/101/469). A "correction" to `kọ́` silently changes meaning and will look like an improvement.
2. **Sub-dots are load-bearing.** Any Unicode NFC/NFD mismatch or diacritic-stripping step corrupts `ọ́ ẹ̀ ṣ` etc. Audit `text_normalized` for Yoruba before audio.
3. **`máa` is triple-duty** (future / habitual-durative / practise-idiom half). Future-of-practise = `máa máa kọ` (seed 5). Keep the senses in separate LEGOs; never merge adjacent `máa`'s; never let one `máa` do future+idiom double duty.
4. **Bare present is past.** `Mo sọ` = "I said". English simple present about habit/ongoing state needs `ń`: `Mo ń sọ X báyìí` (anchor 133).
5. **Anchor inconsistencies, normalized once:** `ṣeé ṣe` spaced in `tó bá` frame / `ṣeéṣe` fused in `Ó ṣeéṣe kí`; `mìíràn` standalone (not `míràn`); `ẹlòmíràn` fused and exempt.
6. **Negation register is locked:** `Mi ò` (not `Mi kò`), and hold one form per pronoun course-wide (see table) or ZUT collisions will surface later.
7. **English infinitive/complement frames go finite:** "how to speak" → `bí mo ṣe máa sọ`; "I'm not sure if" → `Mi ò rò pé`. These are native-checked strategies — do not "fix" them toward literal calques, and gloss the known side so learners aren't surprised.
8. **`láti` is optional after `gbìyànjú`** (absent lines 25/105, present line 13). Don't treat it as always-required glue; follow the anchor line you're reusing. After `lè`/`gbọdọ̀`, no `láti`.
9. **`èdè` is obligatory** with the language name in speak/learn/say-in frames.
10. **Worst failure class = plausible calque.** A dangling frame (e.g. `bí mo ṣe lè` with no completing verb), a single `máa` where two are needed, or a missing `ń` all read fluently to a non-native reviewer. Every new line must be assembled from attested anchor chunks, not free-composed.
11. **Object pronouns are verb-dependent** (vowel-echo "it": `sọ ọ́`, `jù ú`; `ràn ọ́ lọ́wọ́`). Never invent one; find the verb+pronoun pair in the anchor first.

## Native-check questions

1. **Seed 2:** objectless "trying to learn" — bare `kọ́` (`Mo ń gbìyànjú láti kọ́`) or full `kẹ́kọ̀ọ́`?
2. **Seed 3:** does `lóòrèkóòrè tó bá ṣeé ṣe` work for "as often as possible" (analogy with `ní kíákíá tó bá ṣeé ṣe`, line 953)? If not, natural rendering? Confirm spaced `ṣeé ṣe` in this frame vs fused `ṣeéṣe` in `Ó ṣeéṣe kí`.
3. **Seed 5 (CRITICAL — blocks decomposition):** future practise = `Mo máa máa kọ sísọ`, or single `máa`? If single, how is the "I will write (kọ)" / "I will learn (kọ́)" misreading avoided? Confirm the idiom's `kọ` is mid tone.
4. **Seed 5:** is `ẹlòmíràn` natural for SINGULAR "someone else", or prefer `ẹnì mìíràn` / `ẹlòmíìràn`? (Anchor only shows it with plural `àwọn`, line 509.)
5. **Seed 7:** natural idiom for "try as hard as I can" (e.g. `gbìyànjú bí mo ṣe lè ṣe tó`, `pẹ̀lú gbogbo agbára mi`)? If we keep `gbìyànjú gidigidi`, confirm `gidigidi` unmarked (all mid); English prompt then softens to "really hard".
6. **Seed 10:** confirm `gbólóhùn` (tones as written) for "sentence"; `gbogbo gbólóhùn náà` vs `odindi gbólóhùn náà` for "the whole sentence".
7. **Course-wide:** confirm `Mi ò` negation and `mìíràn` held consistently; confirm `báyìí` / `lóòrèkóòrè` / `lónìí` spellings as in anchor.
8. **(New)** Negative "you"/"we": anchor mixes `O ò` (553) / `O kò` (629/1005) and `A ò` (709) / `A kò` (597) — confirm one form per pronoun for a beginner course (we propose `O ò`, `A ò`, matching `Mi ò`).
9. **(New)** "understand" appears as `gbọ́` in the anchor (lines 217/221), which is also "hear" (521/525) — confirm `gbọ́` covers both for this course or whether `yé mi`/`lóye` is needed when "understand" and "hear" must contrast in the same seed (potential ZUT collision).
10. **(New)** Vowel-echo object "it" (`sọ ọ́`): confirm the rule productive enough for new verbs the course introduces, or should each verb+`it` pair be individually checked?

## Instructions to Opus for continuing (seeds 11+)

1. **Assemble, don't compose.** For every new seed, first hunt the anchor (`services/briefs/reference-examples/yor.json`) for lines containing the needed frame; build the target by swapping attested chunks (as seeds 1, 4, 6 were built). A new line should decompose into pieces you can each point to an anchor line for. If you cannot, that piece is low-confidence by definition.
2. **Never generate tone marks from memory.** New vocabulary not in the anchor: verify tone + sub-dots against yo.wikipedia or Glosbe/WordHippo, record the source in the seed note, and mark `confidence: medium` at best. Two independent sources or one anchor attestation = eligible for high.
3. **Honor every contract in section 5 verbatim** — especially `Mi ò`, `mìíràn`, `èdè Yorùbá`, mid-tone `kọ` in the practise idiom, `ń` for English simple present, and the finite strategies for "how to" and "not sure if". If a new seed pressures a contract (e.g. needs "other" in a new slot), flag it in the seed note rather than inventing a second mapping — that is a ZUT decision for Kai/native, not for you.
4. **Respect the gates.** Do not decompose seed 5's `máa máa kọ` chunk, seed 3's `tó bá ṣeé ṣe` frame, or seed 7's intensifier until the numbered native questions resolve. If a new seed needs "practise" in the future, reuse seed 5's sealed chunk whole and add a note referencing Q3.
5. **Flag, don't guess, in these thin zones:** object pronouns for new verbs (gotcha 11), any new serial/split verb (`ràn…lọ́wọ́` class), idioms and intensifiers, anything requiring a tone contrast not attested in the anchor, plurals/quantifiers beyond `àwọn`/`gbogbo`/`kan`/`díẹ̀`, and politeness shifts (`ẹ` forms). Write the best candidate, set `confidence: low` or `medium`, and add a numbered native-check question in the same style as section 9. A deferred question is cheap; a shipped wrong tone propagates into LEGOs and audio.
6. **Keep the known side controlled.** When the target uses a finite strategy ("I don't think that" for "not sure if"), keep the English prompt natural but note the mapping in the gloss so the presentation can brief the learner — never reshape the Yoruba toward the English.
7. **Fresh-eyes pass:** after drafting each batch of ~10 seeds, re-verify every tone mark character-by-character against the anchor lines you cited (the failure mode is a dropped or migrated diacritic during editing), and re-run the section-5 checklist against the batch before submitting.

<!-- buddy: *taps tone marks with three arms* little lines on letters are whole words. Careful careful careful. -->