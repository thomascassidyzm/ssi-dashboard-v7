# The untaught-word check now reads every script — and admits when it can't

**2026-08-18.** Fixing the ASCII-only known-side gate, adding an UNCHECKED outcome, calibrating it,
and sweeping the 31 courses. Read-only against course content: nothing in this job edited a seed, a
lego or a phrase, and no audio was generated.

---

## The headline

| | |
|---|---|
| Courses on Kai's card | **31** |
| …that are empty shells (0 legos, 0 phrases — nothing to check) | **7** |
| …that now produce a real answer | **16** |
| …that remain UNCHECKED, with a reason | **8** (all Japanese-known) |
| Known-side rows swept | **259,443** |
| Machine hits on the 16 answerable courses | **19,866** |
| …that survive triage as strong candidates | **671** (3.4%) |
| …of those, in languages whose morphology still defeats the checker | **252** |
| **Genuinely reportable, high-confidence** | **419** |
| Borderline (NPI-in-positive-declarative), reported separately | **1,194** |
| Discarded as false positives, with grounds | **18,001** (90.6%) |

The raw count was 19,866. The number Kai should act on is **419**. Everything between those two
figures is the triage, and it is set out below.

> **Revised 2026-08-18 after adjudication.** Three workers sampled and adjudicated 13 of the 16
> answerable courses by hand. They found two real defects in this work, both now fixed (§5.4), and
> their independently-measured true-violation rates corroborate the triage (§5.5).

---

## 1. What was actually broken

`tokenizeKnown` in `services/course-builder/lib/validation.cjs` split on `/[^a-z']+/` — ASCII
letters only. That produced **two** silent failures, not one:

**Blind.** On a non-Latin known side it returned zero tokens. Zero tokens is zero violations is
PASS. Measured on real rows, v1 returned an empty token list for **100%** of Devanagari, Tamil,
Bengali, Sinhala, Urdu, Japanese, Korean, Arabic, Telugu and Kannada known-side text.

**Mangling.** On accented Latin it did not go blind, it invented words:

| real text | v1 saw | v2 sees |
|---|---|---|
| `mo ṣe é dáadáa` (Yoruba) | `mo, e, d, ad, a` | `mo, ṣe, é, dáadáa` |
| `ich möchte` (German) | `ich, m, chte` | `ich, möchte` |
| `je vais m'entraîner à parler` | `je, vais, m'entra, ner, parler` | `je, vais, m'entraîner, à, parler` |
| `a oiread agus is féidir` (Irish) | `a, oiread, agus, is, f, idir` | `a, oiread, agus, is, féidir` |

That is the Irish trap the estate has already been bitten by twice. Measured across every
Latin-script known side: **27 courses** are mis-tokenized, worst first — cym_for_yor 100%,
zho_for_gle 47%, eng_for_spa 32%, eng_for_fra 30%, eng_for_por 30%, eus_for_spa 29%, bre_for_fra
26%, cat_for_spa 20%, eng_for_deu 20%, eng_for_ita 14%. **12 of the 27 are non-English known
sides**; the English-known remainder mis-tokenize only parenthetical grammar tags like `(3sg)`.

There was a **third** silent skip nobody had counted. The gate only ran when a pair-contract
existed, and the else-branch was silence. **20 of the 31 courses had no contract at all**, so the
gate never executed — indistinguishable, in the output, from a clean pass.

And a fourth: the 2026-06 India briefs ship `freeClass`/`npi`/`negation`, while v1 read
`freeGlue`/`npiTokens`/`negationWords`. Even with a working tokenizer those seven contracts would
have compiled to an **empty free class** and flagged every function word.

---

## 2. Requirement 1 — the UNCHECKED outcome

Every verdict is now one of three, never two. `UNCHECKED` carries a machine-readable reason:

| reason | means |
|---|---|
| `no_contract` | no pair-contract and no known-language brief — the gate never ran |
| `contract_lang_mismatch` | the contract describes a different known language |
| `tokenizer_empty` | non-empty text, zero tokens — **the original silent-pass bug** |
| `segmenter_unavailable` | no ICU word-break data for that locale |
| `no_vocab_inventory` | nothing introduced to check against |
| `morphology_unresolved` | the token is not an exact introduced form and the language inflects — deciding whether it is a new lemma or an inflection is a *language* judgment, which this gate must not make |
| `detector_uncalibrated` | detection is not calibrated for this language, so any count would be unsafe to quote |
| `mixed_script` | the token is in a script the contract does not declare |

In the live submit path (`seed-complete.cjs`) the bare `if (contract && …)` is replaced: a course
that cannot be checked now emits a loud `known_side_unchecked` warning naming the reason. **These
are warnings, not errors** — they report that the gate could not run, which must never read as a
pass, but must also not block a submit on a course that has never been gated. Promoting them to
blocking is a separate decision and it is Kai's, not mine.

---

## 3. Requirement 2 — the known side may run ahead

The learner's own language is allowed to outrun its formal introductions where the prompt still
makes sense. The four exemptions from the 2026-06 `eng_for_X` sweeps are carried over unchanged, so
this sweep adjudicates the same way that one did:

- **E1 free class** — function words and glue, never "introduced", always permitted.
- **E2 inflection** — a form of an already-introduced lemma is not new vocabulary.
- **E3 NPI licensing** — an NPI under a licensing operator is fine; only a plain positive
  declarative makes it a violation, and even then it is scored **borderline**, never high-confidence.
- **E4 machinery** — grammatical machinery is licensed by its carrier's debut.

And the pilot's fifth ruling is honoured by omission: **naturalness and authoring quality are out
of scope** and are never counted as violations here.

---

## 4. Calibration

Fifteen courses, four controls, on real course data. C1 plants a word the course teaches *late*
into a prompt the learner meets *early* — real vocabulary, right script, right morphology, simply
not yet given. C2 feeds back known-clean text. C3 re-runs the old tokenizer. C4 guards English.

| course | script | C1 planted violations caught | C2 high-confidence false positives | old gate |
|---|---|---|---|---|
| eng_for_hin | Deva | **6/6** | 0 / 400 (0.00%) | blind 5/6, 100% mangled |
| eng_for_tam | Taml | **6/6** | 0 / 400 | blind |
| eng_for_ben | Beng | **6/6** | 0 / 400 | blind |
| eng_for_sin | Sinh | **6/6** | 0 / 400 | blind |
| eng_for_urd | Arab | **6/6** | 0 / 400 | blind |
| eng_for_kor | Hang | **6/6** | 0 / 400 | blind |
| eng_for_ara | Arab | **6/6** | 0 / 400 | blind |
| eng_for_mar | Deva | **6/6** | 0 / 400 | blind |
| eng_for_tel | Telu | **6/6** | 0 / 400 | blind |
| eng_for_kan | Knda | **6/6** | 0 / 400 | blind |
| **eng_for_jpn** | **Jpan** | **4/6** | 0 / 400 | blind |
| cym_for_yor | Latn | **6/6** | 0 / 28 | 100% mangled |
| eng_for_fra | Latn | **6/6** | 0 / 400 | 31% mangled |
| eng_for_deu | Latn | **6/6** | 0 / 400 | 22% mangled |
| cat_for_spa | Latn | **6/6** | 0 / 400 | 20% mangled |

**C4 — no regression:** plain English tokenizes **byte-identically** to v1 on every test case, so
the 76 English-known courses do not move.

**A limit of C2, stated because it matters.** LEGO known_text *is* the inventory, so C2 only proves
the gate does not flag text identical to what it was given. It does **not** establish precision on
practice phrases, where the same lemma appears in inflected forms. That is what §5 measures, and it
is why the sweep's raw counts are triaged rather than reported.

**Two defects the calibration found in my own checker**, both fixed: the Japanese arm tiled against
the *whole* inventory instead of the vocabulary introduced by that seed (so a word first taught at
seed 300 tiled clean at seed 1 — all six plants survived); and evidence of inflection was accepted
from anywhere inside the residue rather than anchored at the left edge.

---

## 5. The sweep, and the triage

### Per course

| course | known | status | rows | answered | machine hits | strong candidates | borderline |
|---|---|---|---:|---:|---:|---:|---:|
| eng_for_hin | hin | CHECKED | 13,748 | 97.1% | 396 | **41** | 95 |
| kor_for_hin | hin | CHECKED | 14,872 | 94.2% | 1,104 | **60** | 103 |
| zho_for_hin | hin | CHECKED | 14,594 | 94.4% | 957 | **48** | 76 |
| eng_for_mar | mar | CHECKED | 14,255 | 93.7% | 1,439 | **61** | 36 |
| eng_for_ben | ben | CHECKED | 13,799 | 91.2% | 1,634 | **14** | 30 |
| eng_for_guj | guj | CHECKED | 15,393 | 95.7% | 1,331 | **9** | 109 |
| eng_for_pan | pan | CHECKED | 13,910 | 97.5% | 675 | **7** | 63 |
| eng_for_sin | sin | CHECKED | 13,019 | 95.3% | 1,115 | **56** | 68 |
| eng_for_urd | urd | CHECKED | 12,426 | 96.1% | 662 | **47** | 3 |
| eng_for_tel | tel | CHECKED | 13,759 | 94.5% | 2,158 | **3** | 4 |
| eng_for_kan | kan | CHECKED | 15,784 | 96.7% | 1,041 | **28** | 131 |
| eng_for_ara | ara | CHECKED | 6,520 | 91.5% | 1,003 | 141 ⚠ | 5 |
| eng_for_kor | kor | PARTIAL | 5,952 | 76.9% | 751 | 111 ⚠ | 29 |
| eng_for_tam | tam | PARTIAL | 13,998 | 89.8% | 1,826 | **21** | 142 |
| kor_for_tam | tam | PARTIAL | 14,434 | 84.1% | 1,555 | **19** | 251 |
| zho_for_tam | tam | PARTIAL | 11,963 | 76.5% | 2,230 | **15** | 259 |
| 8 × *_for_jpn | jpn | **UNCHECKED** | 51,017 | 0% | — | — | — |
| 7 × *_for_jpn | jpn | **EMPTY** | 0 | — | — | — | — |

⚠ = the candidate class is still contaminated; see §5.2.

### 5.1 What the 20,408 hits actually are

| class | count | share | verdict |
|---|---:|---:|---|
| **inflection** — shares a ≥2-char prefix with a form already taught by that seed | 16,554 | 83.3% | **DISCARD** — E2, the learner's own morphology |
| **ordering** — shares a prefix only with a form taught later | 1,445 | 7.3% | **DISCARD** as a violation; a weaker methodology question |
| **npi** — negative-polarity item in a positive declarative | 1,194 | 6.0% | **BORDERLINE**, reported separately |
| **metalinguistic** — authoring scaffolding in `known_text` | 2 | 0.0% | out of scope (content defect) |
| **candidate** — no taught form shares even two leading characters | **671** | **3.4%** | the reportable pile |

**18,001 discarded (90.6%).** The grounds are Kai's rule 2: a Bengali `বইটা` is `বই`+definite, a
Marathi `करायला` is an infinitive of a taught verb, a Tamil `பேசுகிறேன்` is `பேச` inflected. None of
those is vocabulary the learner has not been given.

### 5.2 Two languages whose candidates are still not trustworthy

- **eng_for_ara (141 candidates)** — Arabic conjugates by **prefix** (`يذهب` / `تذهب` / `نذهب` from
  `ذهب`), and the checker's stem test is prefix-anchored, so it cannot see the stem. The Arabic
  brief predicted exactly this and quantified the related proclitic gap at ~11% of the known side.
  Treat the 141 as unadjudicated.
- **eng_for_kor (111 candidates)** — Korean stem alternation changes character 2 (`배우다` → `배워요`),
  which defeats a prefix test. `배워요` "learn" at seed 13 is flagged and is almost certainly taught.

**Excluding those two: 419 candidates across 14 courses.** That is the number I stand behind.

### 5.4 Two defects the adjudication found in this work, both fixed

A worker adjudicating the four Devanagari courses (60 high-confidence + 20 borderline sampled per
course, across the full seed range) found two things wrong with what I had built. Both are fixed and
the numbers above are post-fix.

**E4 was documented and never implemented.** This report's own exemption list claims machinery is
licensed by its carrier's debut. The v1 gate implemented that for the LEGACY `constructions[].test`
regexes only; the 2026-06 briefs declare machinery as `knownConstructions[].marker`, which I parsed
into the context and then never consulted. Every marker in every brief — Hindi चाहिए/सकता/रहा,
Marathi's five-way modal system हवं/शकतो/पाहिजे/नको — was checked as ordinary vocabulary. Now
implemented: a declared marker is dated from where the course first shows it and is free where the
course never teaches it. **Measured effect: 28 hits.** The worker estimated this class at 43% of the
Marathi sample; that was an over-estimate — it conflated declared machinery with inflected forms of
taught verbs (`बोलायचं` is `बोल` + the -आयचं suffix, not a declared marker), and those were already
being discarded as inflection.

**The Hindi brief had no personal pronouns.** `eng_for_hin.contract.cjs` shipped a 37-item free class
running the full copula, postposition and determiner paradigms — and not one 1st- or 2nd-person
pronoun. `मैं` "I" was checked as ordinary vocabulary. Cost, measured before the fix: **425 hits** —
kor_for_hin 268 (19.1% of its total), zho_for_hin 123 (11.2%), eng_for_hin 34 (7.3%). Every one a
pronoun a Hindi speaker plainly does not need taught, which is requirement 2 exactly. Free class is
now 92 entries with the suppletive forms listed individually. Hit counts fell kor_for_hin
1,401→1,104, zho_for_hin 1,103→957, eng_for_hin 467→396.

### 5.5 Three independent adjudications, and where I disagreed with them

Three workers sampled ~55 high-confidence + ~20 borderline rows per course across the full seed
range, adjudicating against each course's own lego inventory rather than by eye.

| adjudication | courses | sampled | measured true-violation rate |
|---|---|---|---|
| Devanagari (#163) | eng/kor/zho_for_hin, eng_for_mar | 337 rows | 6–19% |
| Indic (#164) | eng_for_ben/guj/pan/sin/urd | 358 rows | ~4.7% |
| Dravidian (#165) | eng/kor/zho_for_tam, eng_for_tel, eng_for_kan | 375 rows | 4–13% |
| **this report's mechanical triage** | all 16 | all 19,866 | **3.4%** |

**They converge.** Four methods — one mechanical over the whole population, three by-hand samples
using DB ground truth — all land between 3% and 19%, against a machine count that implied 100%. That
convergence is the strongest evidence here that the 419 is the right order of magnitude, and it is
worth more than any single sample.

**All three independently confirmed the borderline bucket is one class.** #164 found **0 confirmed
true violations in 271 machine-flagged borderline NPI rows**; #165 found 0 in 84. The 1,194
borderline hits should be read as a to-do on the gate, not a to-do on the courses.

**Two worker claims I checked and did not accept:**

- **#164: "every contract ships `stemStrip: []`, and this makes ~90%+ of the high bucket false
  positives."** The first half is true and worth knowing — the six 2026-06 briefs predate this
  schema entirely and carry no `script`, `morphology` or `stemStrip` field at all, so they run on
  defaults, and guj/sin do document suffix lists in prose that were never transcribed. But the
  second half does not survive measurement. Transcribing those prose lists and running them: Gujarati
  resolves **362 of 73,848 tokens (0.49%)**, Sinhala **120 of 54,389 (0.22%)**, against 114 and 56
  cases where stripping maps one taught form onto a *different* taught form (`કેવી` "how" → `કે`
  "that"). That is the Kannada author's own measured finding (0.13% gain, destructive collisions) in
  two more languages. **Empty stemStrip stays.** #165 reached the same conclusion independently and
  said so explicitly; where two adjudications disagree, this one has the measurement behind it.
- **#165: "Kannada `ಸದ್ಯಕ್ಕೆ` is ~115 rows; one freeClass line removes them."** It is **21 rows
  (2.0% of that course's hits)**, not 115 — the 115 was raw corpus occurrences, not flagged rows.
  And it is never taught as a LEGO anywhere in the course, so flagging it is arguably the gate
  working correctly, not a false positive. The Kannada brief's author deliberately excluded
  deictic/temporal adverbs from free class. Left flagged; **Kai's call**, not mine to overrule.

**#165's finding that `knownConstructions` was parsed and never read was correct** — and is the same
defect #163 found. It was fixed in `2254316f`, which postdates both runs, so neither worker's numbers
include the fix. Its measured effect was 28 hits estate-wide.

**A cross-course finding worth Kai's attention (#164):** Punjabi and Urdu leak the same "buy" verb
about five seeds before its own debut, **at the same seed number in both independently-built
courses**. That smells like a shared upstream generator defect rather than two coincidences.

**All three flagged the same honest gap:** none is a native speaker of the languages adjudicated.
Their calls rest on mechanical inventory evidence and each brief's own documented rules, not native
judgment of naturalness. #164 left ~31 rows uncalled; #165 left ~5.

**A third finding I have NOT acted on:** `isNegated()` detects only literal negation words and a
question mark, while the briefs each document 8–14 NPI licensing environments (desiderative,
conditional, comparative, ability, before/until…). That is why the entire borderline bucket is one
class. It does not touch the 419 — NPI hits are never high-confidence — so I have left it as a known
limit rather than change scoring behaviour late in the job.

### 5.3 The strongest confirmed findings

Recurring untaught content words, with seeds and phrases:

| course | seed | known-side prompt | target | untaught |
|---|---|---|---|---|
| eng_for_mar | 55 | `मी नीट झोपलो नाही` | I didn't sleep very well | `नीट` — **53 rows** |
| eng_for_kan | 106 | `ನಾನು ಕಷ್ಟಪಟ್ಟು ಕೆಲಸ ಮಾಡೋ ಅಗತ್ಯ ಇಲ್ಲ` | I don't need to work hard | `ಅಗತ್ಯ` "need" — 7 rows |
| eng_for_kan | 170 | `ನೀವು ನನಗೆ ಹೇಳಬೇಕು ಅಂತ ನನಗೆ ಅಗತ್ಯ ಇದೆ` | I need you to tell me | `ಅಗತ್ಯ` |
| kor_for_tam | 623 | `ஒரு கப் காப்பி` | 커피 한 잔 | `கப்` "cup" — 19 rows |
| zho_for_hin | 153 | `मुझे लगता है ये एक जैसे हैं।` | 我觉得这一样。 | `ये` — 8 rows |
| kor_for_hin | 96 | `मैं अजनबियों से बात करने के लिए तैयार नहीं हूँ` | 저는 모르는 사람들과… | `अजनबियों` "strangers" |
| eng_for_pan | 142 | `ਬਹੁਤ ਧੰਨਵਾਦ ਮਦਦ ਕਰਨ ਲਈ` | thank you very much for helping | `ਧੰਨਵਾਦ` "thank you" |
| eng_for_guj | 173 | `ના, ધન્યવાદ, હું સંભાળી શકું` | no thank you, I can manage | `ધન્યવાદ` "thank you" |
| eng_for_sin | 100 | `ඔයා ඕනේ නෑ වද වෙන්න` | you shouldn't worry | `වද` — 4 rows |
| eng_for_tel | 49 | `ఇతర వ్యక్తులు ఉన్నప్పుడు ఇది ఇలా ఉంటుంది` | it'll be like this when there are other people | `ఇతర` "other" |
| eng_for_ben | 160 | `কীভাবে বলে এই শব্দটা একটু ধীরে?` | how do you say this word more slowly? | `ধীরে` "slowly" |
| eng_for_tam | 102 | `நாங்கள் கடினமாக உழைக்க முயற்சிக்கிறோம்` | we're trying to work hard | `உழைக்க` "to work" |
| eng_for_urd | 163 | `مجھے لگتا ہے دلچسپ ہے مگر مشکل` | I think that it's interesting but difficult | `مگر` "but" |
| eng_for_hin | 253 | `मैं कुछ मिनट में वापस आऊँगा।` | I'll be back in a few minutes | `आऊँगा` |
| zho_for_tam | 190 | `சில கேள்விகள் எளிதல்ல` | 一些问题不容易 | `எளிதல்ல` |

`ಅಗತ್ಯ` is the **same defect family** the 2026-06 Hindi pilot found — `चाहिए` "need" leaking
un-introduced 8× because the brief left it unclassified. Same shape, different language.

---

## 6. Japanese — the gap, reported as a gap

**8 courses, 51,017 rows, UNCHECKED(`detector_uncalibrated`). No count is published for them.**

The sweep originally flagged **25,551 rows** across those 8 — about 40% of everything in them. I
classified all 25,551 rather than sampling:

- **49.0%** share a ≥2-character prefix with a form already taught by that seed
- **9.8%** with a form taught later
- **4.5%** are metalinguistic scaffolding baked into `known_text`
- **36.8%** residue — and hand-reading it killed that too. `説明しようとします` at seed 8 is the polite
  form of `説明しようとする`, which **seed 8 itself teaches**. `学びたい` at seed 2 is `学ぶ` (seed 2)
  plus `-たい`.

Japanese has no lemma an ICU segmenter can see — `話す/話し/話せる/話した` are four unrelated strings to
it — and 226 hiragana fragment types carry 59.5% of all tokens. Verb morphology rewrites the
characters next to the stem, which is precisely what prefix and tiling matching depend on.

So the gate now refuses. Publishing 25,551 hits nobody can stand behind would have been the same
false confidence this job exists to remove, only louder. Japanese known-side control belongs in the
**agent lane** the estate already designed (`eng-for-x-known-side-pilot.md`), and the new Japanese
brief equips it. Re-enable by setting `detection: 'calibrated'` once a lemmatiser or an agent check
lands.

---

## 7. Also found, not fixed (read-only job)

- **7 of the 31 courses are empty shells** — `ara_eg_for_jpn`, `ara_for_jpn`, `ara_sy_for_jpn`,
  `deu_at_for_jpn`, `kor_for_jpn`, `por_br_for_jpn`, `spa_mx_for_jpn` have 0 seeds, 0 legos, 0
  phrases. They were never built. They are counted separately from UNCHECKED so they cannot inflate
  either number.
- **One surviving Telugu-vowel corruption in the Kannada corpus**, in a place the 2026-08-17 sweep
  did not scan: lego `S0302L04` (seed 302), component `{ known: "ಅವಳು ಹೇಳಿದಳు", target: "she said" }`.
  Phrase, lego and seed rows are otherwise clean.
- **`इंग्रजीत` / ZWNJ**: 29 Telugu and 737 Kannada rows carry U+200C between a Latin loan stem and
  its clitic. `ఇంగ్లీష్` and `ఇంగ్లీష్‌లో` look identical and are different strings.
- **A Marathi spelling split**: `माहित` (491) and `माहीत` (24) are the same word, two spellings, in
  one course.
- **Korean component-fragment mis-glosses** — component `개` glossed "a few words", `안` glossed
  "i'm not", `이` glossed "what the is". Same family as the Hindi `रात को`→"very well" class.

---

## 8. What I'd ask Kai to decide

1. **The 419.** Fix list, or leave as known debt? They cluster hard — `नीट` alone is 53 rows, so the
   real remediation is far smaller than the count.
2. **Japanese.** Run the agent-lane known-side check on the 8 courses, or accept them as unchecked?
3. **Should `known_side_unchecked` ever block a submit?** Today it warns. Making it block would stop
   new content landing on a course the gate cannot read — but it would also block courses that have
   never been gated.
4. **Arabic and Korean** need a prefix-aware stem test before their 252 candidates mean anything.
5. **`ಸದ್ಯಕ್ಕೆ` ("for now", Kannada, 21 rows)** — a real untaught-word finding, or a free-class
   temporal adverb the brief should have listed? I left it flagged; the brief author's stated policy
   excludes temporals from free class, so overruling that is a call for you.
6. **The Punjabi/Urdu "buy" leak at the same seed in two independently-built courses** — worth
   someone looking upstream at the generator rather than patching two courses.

---

## Appendix — what to run

```
node tools/known-side/calibrate.cjs <course>...        # the four controls
node tools/known-side/sweep.cjs --set=31               # the sweep
node tools/known-side/triage.cjs /tmp/sweep-final.json # classify the hits
npx vitest run services/course-builder/lib/known-side-gate-v2
```

Full test suite: **2,182 tests green**, plus 20 new ones locking down the defect, the three
outcomes, and the exemptions.
