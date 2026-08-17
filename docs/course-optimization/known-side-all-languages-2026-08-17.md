# The known side is now checked in every language

**2026-08-17.** Thirty-four courses holding real content had **no known-side check of any kind** —
not a lenient check, *no check*. They all check now. Here is what the new checking found, and
then how contract resolution works.

---

## What it found

All 34 now run. **198,832 drilled prompts, 67,650 raw findings.**

**Confirmed defects: 10.** But the important number is the one below.

### The 16,715 findings that are not morphology

The raw findings split into two kinds, and they are **not** equally trustworthy:

| kind | count | what it means |
|---|---|---|
| `unknown gloss` | 49,118 | the word never appears in the course at all |
| **`not introduced until`** | **16,715 (25%)** | **the word IS taught by this course — just LATER than the prompt that uses it** |

The second class is far stronger evidence, and this is the single most useful thing to come out of
the sweep. The whole reason a raw count is untrustworthy is that the matcher cannot recognise an
inflected form of a taught word — but a `not introduced until` finding means the exact form **did**
match a taught gloss. Morphology blindness cannot easily manufacture it. These are candidate
**ordering defects**: the learner is prompted with a word before they have been given it.

I verified this end-to-end on German rather than assuming it. In `eng_for_deu`, `denke` first
appears as a LEGO at **seed 47**, and prompts use it at **S26, S38 and S46** — twenty-one seeds
early. `es tut mir leid` is used at S84 and debuts at S139. That is 106 of `eng_for_deu`'s 486
findings, and it is authoring, not morphology.

**This class should be the next pass.** One caveat, stated: for Japanese and Chinese a segmenter
fragment could coincidentally match a later lego's fragment, so the CJK share of the 16,715 needs
its own adjudication. German is clean because German tokenises on spaces.

Everything else on this page is a reading list.

That gap between 67,650 and 8 is the honest headline, and the reason for it is the point of the
whole exercise. For these languages the matcher compares **exact word forms**. It cannot tell an
inflected form of a word the learner already has from a word they have never seen. Tamil
விரும்பவில்லை is the taught verb விரும்பு with negation fused onto it; the matcher sees a string it
has never met and says so. So a raw count is a **triage list**, not a verdict — and these findings
cannot fail a build. That was your ruling and it is now enforced in code, not just intended.

### The calibration that says the numbers mean anything

Mature English-known courses have had a contract for months and have been built under it:

| | prompts | raw findings | **per 1,000** |
|---|---|---|---|
| The 34 newly-covered courses | 198,832 | 67,650 | **340** |
| `spa/deu/zho/fra_for_eng` (mature, English-known) | 52,820 | 13,490 | **255** |

**340 against 255.** The newly-covered courses are not dramatically worse than the estate's
best-tended ones. That ratio is the strongest single statement on this page: what we are mostly
looking at is the matcher's noise floor, not thirty-four broken courses. Read any language sitting
near 255 as "nothing visible here"; read the ones far above it as "worth a look, for a reason we
can usually name".

### Per known language

| known | courses | prompts | raw | per 1,000 | what drives it |
|---|---|---|---|---|---|
| **kor** | 1 | 4,680 | 3,459 | **739** | particles fused into the token — 것/것을/것이/것은 are four strings, one noun |
| **jpn** | 8 | 42,731 | 22,354 | **523** | no word spaces; the segmenter shreds (`聞いたことがありますか → 聞\|いたこ\|と\|が\|ありま\|すか`) |
| **tam** | 2 | 22,083 | 11,282 | **511** | agglutination — tense, person, number and polarity fused into one verb form |
| **ara** | 1 | 4,975 | 2,042 | **410** | root-and-pattern morphology; كتب/كاتب/مكتوب share a root but no substring |
| **zho** | 5 | 23,882 | 8,907 | **373** | no inflection, so **the highest genuine-signal rate of any language here** |
| **tel** | 1 | 10,859 | 3,443 | 317 | Dravidian agglutination, as Tamil |
| **gle** | 1 | 117 | 35 | 299 | initial consonant mutation; 117 prompts is too few to read |
| **mar** | 1 | 11,574 | 2,980 | 257 | at the English reference rate |
| **ita** | 1 | 4,982 | 1,225 | 246 | verb paradigm + gender concord + enclisis written inside the word (`dirti`) |
| **fra** | 2 | 10,256 | 2,337 | 228 | inflection and gender concord; elision kept whole (`l'anglais`) |
| **hin** | 2 | 24,221 | 4,810 | 199 | below the English reference |
| **kan** | 1 | 11,973 | 1,797 | 150 | below |
| **spa** | 3 | 15,816 | 1,945 | 123 | below |
| **por** | 1 | 5,104 | 510 | 100 | lowest of the large courses — Portuguese hyphenates enclisis, so it tokenises cleanly |
| **deu** | 1 | 4,937 | 486 | 98 | below |
| **cym** | 2 | 474 | 38 | 80 | 474 prompts total; too few to read |
| **yor** | 1 | 168 | 0 | **0** | **0 carries no information** — 168 prompts, 43 distinct word types |

### The 10 confirmed defects

Found by adjudicating the top repeated findings against the real corpus. Reported, **not fixed** —
that was the scope. Each needs a decision from a person who knows the course.

1. **`eng_for_ara` — taught form ≠ used form.** Seed 30 teaches `بالأمس` (with proclitic and
   article) but **90 prompt occurrences use bare `أمس`**. This is authoring, not morphology, and it
   is the single largest confirmed item on the estate. Smaller tail in the same course: `أظن`
   beside taught `أعتقد` (12), `شهر` beside `الشهر` (6), `بالضبط` (6), `ينبغي` (5), `صحيح` (5).
2. **`eng_for_spa` — 23 prompts are half untranslated English**, clustered in seeds 54–62:
   `give you`, `when`, `remember how to say something`, `slowly`, `at the same time`. Seed 55 is
   the course's worst at 41 findings. The same probe returns **zero** on the other six Romance-known
   courses, so this is one course's problem, not a Romance one.
3. **`eng_for_kor` — 39 of 5,408 prompt rows contain no Hangul at all**, `known_text` byte-identical
   to the English `target_text`, across 11 seeds between S40 and S300. All 546 lego rows are clean,
   so this is phrase-level only.
4. **All six European-target Japanese courses — grammatical annotations baked into learner-facing
   `known_text`**: `〜したかった（三人称複数半過去）`, `私の（女性複数）`. This is not Japanese prompt
   language, it is metadata the learner would be shown. Same family as the known tel/rus/nep
   parenthetical-tag defect. Deliberately left out of the free class so it keeps flagging.
5. **`eus_for_spa` — parenthetical metalanguage** in the prompts: `(ergativo)`, `(dativo potencial)`.
   Same shape as (4). Kept out of the free class on purpose rather than laundered away.
6. **`eng_for_zho` and siblings — plausible untaught vocabulary.** Chinese has no inflection, so a
   content-word finding here is much likelier to be real: `离开` (61), `谈` (61), `抱歉` (28),
   `一封信` (24). ~28% of Chinese findings are unexplained by any artefact — the highest of any
   language — and this group is the best candidate for the next adjudication pass.
7. **`eng_for_ara` — tatweel breaks the gate's own teaching.** `بـ` and `هـ` are taught at seeds
   4/20/55/69 *with an attached tatweel* (U+0640, category `Lm`, which survives stemming), so those
   debut keys can never match their own later fused uses. This one needs a **tokenizer** fix, not a
   contract fix.
8. **`eng_for_deu` — 106 ordering defects**, of which `denke` (taught S47, used S26/S38/S46) and
   `es tut mir leid` (taught S139, used S84) are verified by hand. See the section above: this is
   the strongest class on the estate.
9. **`zho_for_gle` — the inventory has enshrined a *mutated* form as the headword.** `dhéanamh` (18
   occurrences) and `bhaint` (21) appear **only** lenited; the radicals `déanamh`/`baint` never
   occur. The day a prompt uses the radical, the gate will report the correct form as unknown.
   Exact-form matching doesn't merely miss mutations — it can canonicalise one.
10. **A defect in the matcher itself, found and fixed here** — see below.

**And one strong negative result.** Welsh: all 38 `ita_for_cym` findings are 9 word types, and every
one is accounted for — 26 hits are soft mutation of a radical the course taught (`ddeud`←deud,
`drio`←trio), 12 are the fused definite-article clitic `'r` welding onto a content word
(`cofio'r` = "remember THE"), 1 is `wyt`. **Genuinely untaught Welsh vocabulary: zero of 38.** That
is the argument for advisory-not-blocking in a single number, measured on the only Welsh corpus
that exists.

### The matcher defect, found and fixed

Under a brief contract, "is this prompt negated?" was decided by looking for the negator **anywhere
in the string**. Yoruba `má` is a proper prefix of the ubiquitous future particle `máa`, so 48% of
`cym_for_yor` prompts read as negated against a true rate of 5% — and a wrongly-negated prompt
**silently licenses every NPI in it**. A negator now counts only if it **is** a token or **ends**
one. The suffix arm is required rather than slack: Dravidian negation is fused onto the verb.

Measured after the change — the last two rows are the proof it is right rather than merely different:

| | before | after |
|---|---|---|
| Yoruba `cym_for_yor` | 47.6% | **4.8%** (measured true rate: 5%) |
| Kannada `eng_for_kan` | 32.4% | **17.1%** |
| Arabic `eng_for_ara` | 64.4% | **45.5%** |
| Tamil `eng_for_tam` | 12.7% | 12.4% — bound-suffix negation still fires |
| Marathi `eng_for_mar` | 19.3% | 19.2% — unchanged |

### An unplanned find

**`eng_template` (572 legos) had never been checked either.** Its known language is English, but its
course code does not end `_for_eng`, and the old resolver keyed on the code. It is a 35th course, and
it is the clearest possible illustration of why keying on the code was wrong.

---

## How contract resolution works now

A course's known-side contract is chosen by the **known language**, not by the course code, with one
override: if somebody has written a contract for that specific pair, that file still wins. So
resolution tries the course-specific contract first, falls back to the language-level contract
`_lang_<iso>`, falls back to the shared English scaffold for English-known courses, and otherwise
resolves to nothing and says so out loud rather than passing silently. The reason is simply that the
known side is a property of the language: everything the check consumes is Tamil grammar, and Tamil
grammar does not change because the target language happens to be Korean instead of English — which
is exactly how `kor_for_tam` came to have no check at all while `eng_for_tam` had one. The pair-level
override stays because a pair can carry knowledge the language cannot, and where a language's
knowledge already lives in a pair file the language-level file **re-exports** it rather than copying,
so there is one source of truth per language.

---

## Calibration — why any of these numbers should be believed

Before trusting a single per-course result:

- **A deliberately planted violation is caught in all 11 script families** — Latin, Welsh,
  Yoruba-with-tone, Devanagari, Tamil, Kannada, Telugu, Arabic, Hangul, Japanese, Chinese — and a
  prompt built only from introduced vocabulary comes back clean in all 11. Both halves are asserted,
  because before the tokenizer fix a non-Latin known side produced **zero tokens**: it would have
  passed every clean case while catching nothing.
- **English is byte-identical.** `fra_for_eng`, `zho_for_eng`, `glg_for_eng` and `spa_for_eng` were
  run through the complete gate under the old resolver and the new one and the **SHA-256 of the
  entire finding list matches** in all four. No English course lost or swapped a contract.
- **244 tests pass**, including one generated per `_lang_*` file asserting it cannot hard-fail a
  submission.

## Gaps, stated rather than papered

- **The 8 confirmed defects come from adjudicating the top repeated findings, not from a pass over
  all 67,650.** The true confirmed count is higher than 8. Chinese is the best next candidate.
- **`yor` (168 prompts), `cym` (474) and `gle` (117) are not calibrated.** Yoruba's 0 findings is
  the expected result for 43 distinct word types across ten seeds and says nothing about quality.
  The Yoruba contract is unratified linguistics — its tone, allomorphy and `ní → l-` claims need a
  speaker.
- **Deliberate signal loss.** Japanese `した` (7,320 occurrences, nearly all the segmenter's cut of a
  masu-stem) and Korean `있어요/해요/거예요` are in the free class, so a genuine early "did" or a
  lexical "there is" will not be caught. Right trade for a triage list, but they are unchecked areas,
  not clean results.
- **`ita`, `por` and `kor` are each calibrated on one course by one author.** Korean's type/token
  ratio is 1:15 against 1:194 for Japanese. Re-derive when a second course lands.
- **`por` is European Portuguese.** A pt-BR course needs a revision, not this file.
- **The recorded "1,126 false Arabic defects" figure is stale** and must not be re-cited against this
  gate — it belongs to the old ASCII-only tokenizer. Arabic `،؟؛` separate correctly today.
- **Four tokenizer-level gaps that no contract file can close**, all measured, all left unfixed:
  `expandContractions` is English and runs on *every* known language, so German `"Wie geht's dir?"`
  tokenises to `["wie","geht","is"]` — inventing an English token (dormant: `eng_for_deu` has zero
  apostrophes in 5,880 prompts). Welsh `'r`/`'n` weld onto content words, which is 12 of the 38
  Welsh findings. Irish `an tSínis` fuses to `tsínis` and `ár n-athair` splits to a stray `n`.
  German `ß` and `ss` do not unify — dormant in `eng_for_deu`, but a Swiss-orthography `deu_ch`
  course would read as a wholly separate lexeme inventory.
- **Not in effect for live submissions.** See the landing line.

---

*Tools: `tools/course-optimization/known-side-sweep.cjs` (reads only, never writes).
Precedence rule and dialects: `docs/pair-contracts/README.md`.*
