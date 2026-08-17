# fur_for_eng orthographic-consistency audit — TEXT ONLY, read-only

Job #(retry, dispatched via Command Surface). Data source: `course_seeds` where `course_code='fur_for_eng'`, read via Supabase service client (`.a108-fur/q2.cjs` pattern), dumped to `.a108-fur/seeds.json` (668 rows, seed_number 1–668, no gaps, all `target_text` non-empty — confirmed by direct query, not assumed).

**I am not a Friulian speaker.** Everything below the line "MEASURED" is a direct count/grep against the corpus. Everything under "INTERPRETATION" is my inference about what the pattern might mean and should be treated as a hypothesis for a native reviewer, not a verified fact. Scripts used: `.a108-fur/scratch-orth-analysis.cjs` and `.a108-fur/scratch-orth-analysis2.cjs` (both read-only, no writes).

---

## 1. Grafie uficiale (ARLeF) adherence — MEASURED

| Marker | Seeds containing it | % of 668 |
|---|---|---|
| Circumflex vowels â/ê/î/ô/û | 506 | 76% |
| Cedilla ç | 23 | 3% |
| cj/gj digraph | 109 (44 distinct words) | 16% |
| l'-apostrophe article | 14 | 2% |
| -s plural-shaped word | 253 | 38% |

- **Feminine ending -e vs -a**: 187 distinct content words end in **-e** (616 token occurrences) vs only **3 distinct words** ending in **-a** (6 tokens): `yoruba` (×4, see §4 — not Friulian), `fra` (×1, seed 410 — likely "between/among", a preposition not a feminine noun), `sta` (×1, seed 421 — 3sg present of "stâ", a verb form not a feminine adjective). **No genuine feminine -a noun/adjective ending was found anywhere in the corpus.** This is a strong, clean signal for central-standard -e feminine morphology with zero counter-examples.
- **Article forms measured**: `il` 55, `la` 65, `al` 174 (masc. subject clitic), `e` 113 (fem. subject clitic), `l'` 14, `i` 25, `lis` 18. All forms fall inside the standard inventory; no anomalous article spellings (e.g. no `el`, `la` used as masculine, no `su`/`sa` Sardinian-style forms) turned up.
- **Indefinite article**: `un` 48, `une` 71, and **`una` (non-standard) = 0 hits**. Clean.
- **Participles**: circumflexed forms found — `-ât` (35 distinct words incl. `cjatât`, `imparât`, `pensât`, `spietât`, `fevelât`...), `-ut` (`brut`, `dut`, `frut`, `gjatut`, `sut`), `-ît` (`avilît`, `divertît`, `durmît`, `finît`, `vistît`). I manually pulled the corresponding non-circumflexed word list and found the earlier automated "-at/-it without circumflex" hits were almost entirely **false positives**: words like `propit`, `scuasit`, `forsit`, `invezit`, `stupit` are adverbs/adjectives, not participles missing a mark, and `dit` ("said") is the standard uncircumflexed spelling for that specific verb. The one real overlap is `fat` — see §2, it genuinely alternates with `fât`.
- **cj/gj digraph** is present and looks orthographically standard where it appears (`cjase`, `cjatât`, `mangjâ`, `ducj`, `ancjemò`, `dongje`, `coragjôs` etc.) — no seeds mixing digraph and non-digraph spelling of the same lexeme were found.

**INTERPRETATION**: the circumflex/ç/cj-gj/-e-feminine/un-une pattern is consistent with the ARLeF central (Grafie Uficiale) standard as I understand it from documentation, not a peripheral variety. I cannot independently verify this against the ARLeF spec text — a native-speaker or ARLeF-doc cross-check should confirm before this is treated as settled.

---

## 2. Internal inconsistency — MEASURED, with manual verification per case

An automated base-form (diacritic-stripped) diff (`variant-report-full.json`) flagged 25 candidate groups. **I checked the actual sentence context of every group with ≥2 seeds** rather than trusting the diacritic-strip alone, because Friulian uses circumflex/grave/acute to distinguish genuinely different words (not just stress marks on one word). Results split cleanly into two buckets:

### 2a. Likely GENUINE spelling inconsistency (same lemma, same grammatical role, different mark)

| Word pair | Seed counts | Example seeds | Context check |
|---|---|---|---|
| `fat` / `fât` ("done", past participle) | 5 vs 3 | 89: *"o vedi **fat** un grum"* / 152: *"o lu varès **fât**"* | Both are the past participle after an auxiliary (vê) in an identical syntactic slot — same word, inconsistent circumflex. |
| `mal` / `mâl` ("badly") | 1 vs 3 | 112: *"e no **mal** spietavi"* / 338: *"**mâl**"* (isolated, "Badly.") | Same adverb, inconsistent circumflex. |
| `podarès` / `podarês` ("could", conditional) | 9 vs 1 | 116: *"o **podarès** fâ"* / 668: *"o **podarês** ducj lâ"* | Possibly a genuine 1sg-vs-1pl conditional distinction (`o podarès` vs `o podarèsin`-family) rather than an error — flagged, not confirmed, needs a native check of person/number agreement. |
| `cirìn` / `cirin` ("try", 1st/3rd pl. present) | 1 vs 1 | 102: *"o **cirìn** di dî"* / 213: *"a **cirin** di otignî"* | Different subject clitic (`o` vs `a`) — could be a genuine 1pl/3pl stress difference or could be an accent-mark slip. Flagged, not confirmed. |
| `scugnìn` / `scugnin` ("must", present) | 2 vs 1 | 109: *"o **scugnìn** lavorâ"* / 450: *"a **scugnin** cjapâ"* | Same caveat as `cirìn`/`cirin` — different subject clitics, possibly different persons rather than an inconsistency. |
| `vioditi` / `viodîti` ("to see you") | 1 vs 1 | 178: *"o volevi **vioditi**"* / 127: *"o volevi **viodîti**"* | Same infinitive+clitic construction in both — looks like a genuine missing circumflex on one spelling. |

### 2b. NOT inconsistency — different lexemes that the diacritic-strip algorithm falsely merged (documented so nobody re-flags them)

I checked every one of these against sentence context; each pair/triple is two distinct Friulian words that happen to share a base form once diacritics are stripped:

- `che` (301, relative "that/which") vs `chê` (22, feminine demonstrative "that one")
- `di` (214, preposition "of/from") vs `dî` (20, infinitive "to say") vs `dì` (7, noun "day")
- `no` (163, negation) vs `nô` (2, "we", strong pronoun)
- `la` (65, article/clitic "the/her") vs `lâ` (26, infinitive "to go") vs `là` (5, adverb "there")
- `si`/`sì` (18/28 — reflexive clitic vs "yes")
- `par` (37, preposition "for") vs `pâr` (3, noun "pair")
- `je` (25, fem. 3sg clitic) vs `jê` (5, strong pronoun "she")
- `su`/`sù` (11/4 — preposition "on" vs adverb "up")
- `to`/`tô` (10/5 — masc./fem. possessive "your", correct gender agreement, not a spelling error)
- `me`/`mê` (2/11 — object pronoun vs fem. possessive)
- `an` (2, noun "year") vs `àn` (8, "they have")
- `so`/`sô` (5/4 — masc./fem. possessive "his/her")
- `dai` (2, "of the", masc. pl. contraction) vs `dâi` (1, "give him/her")
- `scugni` (1, 1sg present) vs `scugnî` (1, infinitive) — consistent morphological pattern (infinitive takes circumflex, finite present doesn't), not an error
- `voi` (2, "I go") vs `vôi` (2, "eyes") — unrelated nouns/verbs
- `lat`/`lât`, `ves`/`vês`, `sta`/`stâ`, `su`/`sù`, `te`/`tè` — same pattern: different grammatical forms of related but distinct lexemes (e.g. `sta` finite present vs `stâ` infinitive, standard morphology).

**Net finding**: after manual review, the genuine internal-inconsistency count is small — **6 word-pairs, ~17 seed instances total** across a 668-seed, several-thousand-word corpus. This is a low defect rate, not a systemic problem.

---

## 3. Different-variety (Carnian/Western/Gorizian) evidence — MEASURED absence + explicit gap

I have no reliable surface diagnostic to distinguish sub-varieties from central standard without domain knowledge I don't have (e.g. Western Friulian's different treatment of certain vowels, Carnian consonant differences). What I *can* report:

- Zero feminine -a endings (§1) argue against Western/Carnian influence, where -a survives more.
- cj/gj digraphs are present and used where expected for the central norm.
- No lexical items jumped out as marked dialectal vocabulary in a way I could pin to a specific named variety.

**GAP, honestly reported**: this question needs a native Friulian speaker or a wordlist keyed to known Carnian/Western/Gorizian markers — I do not have the linguistic competence to certify "central standard throughout" beyond the circumflex/ç/-e-feminine/un-une signals already listed, and those are consistent with — not proof of — central standard specifically.

---

## 4. Non-Friulian content — MEASURED, one confirmed defect class

- **Italian/Venetian lexical leakage**: 0 hits against a checklist of 19 common Italian function words (`sono`, `molto`, `perché`, `questo`, `della`, `voglio`, `grazie`, etc.). None found.
- **Untranslated English left in target_text**: automated scan flagged 10 seeds containing the token `to`. **All 10 are false positives** — I checked each one; Friulian `to` is the masculine 2nd-person possessive ("your"), e.g. seed 83: *"o soi dacuardi cun ce che tu âs dit sul **to** amì"* = "I agree with what you said about your friend." Not English leakage.
- **Confirmed defect — wrong-language word literally embedded**: 4 seeds contain the literal string `yoruba` where the known_text is about the Friulian language itself:
  - Seed 283: known *"Which of your friends speak **Friulian**?"* → target *"cuâi dai tiei amîs fevelino **yoruba**?"*
  - Seed 285: known *"She speaks **Friulian**."* → target *"e fevele **yoruba**"*
  - Seed 286: known *"People who like speaking **Friulian**."* → target *"int che i plâs fevelâ **yoruba**"*
  - Seed 297: known *"I don't know many people who speak **Friulian**."* → target *"no cognòs tante int che e fevele **yoruba**"*

  This looks like a cross-course content leak (the word "yoruba" should be the Friulian word for "Friulian", e.g. *furlan*) — not an orthography defect, a **content-correctness defect**: 4 seeds where the language name is factually wrong for a fur_for_eng course. Flagging as out-of-scope-but-important since it's not a spelling variant, it's a different word entirely.

---

## 5. Mechanical defects — MEASURED, clean

| Check | Count |
|---|---|
| Double spaces | 0 |
| Leading/trailing whitespace or punctuation | 0 |
| Stray brackets `[]{}()` | 0 |
| Mojibake (Ã/Â/Ð/Ñ/�) | 0 |
| Empty/whitespace-only target_text | 0 |
| Curly vs straight apostrophe mismatch | 0 curly found; 14 seeds use straight `'` for `l'` — internally consistent, single style throughout |

No mechanical corruption detected anywhere in the 668 rows.

---

## Summary

- **Corpus-wide orthography is clean and internally consistent** by the ARLeF-adjacent markers I could measure: circumflex, ç, cj/gj, article set, -e feminine (100% clean, zero -a exceptions), un/une (zero non-standard "una").
- **Genuine spelling inconsistencies: 6 word-pairs / ~17 seeds** (`fat`/`fât`, `mal`/`mâl`, `podarès`/`podarês`, `cirìn`/`cirin`, `scugnìn`/`scugnin`, `vioditi`/`viodîti`) — small enough to hand-fix, not a systemic issue. Two of these (`podarès`/`podarês`, `cirìn`/`cirin`, `scugnìn`/`scugnin`) may turn out to be legitimate person/number distinctions rather than errors — need native confirmation before touching.
- **Non-Friulian content**: 0 Italian/Venetian leakage, 0 real untranslated-English (the 10 flagged were a false-positive from `to`="your"). **1 confirmed content defect**: 4 seeds (283, 285, 286, 297) have the literal word "yoruba" where the Friulian word for "Friulian" belongs — this is a cross-course content bug, not an orthography variant.
- **Mechanical defects: 0** — no double spaces, brackets, mojibake, or leading/trailing junk anywhere.
- **Sub-variety identification (Carnian/Western/Gorizian): explicit gap** — I don't have the linguistic competence to make this call beyond the absence of counter-signals already listed above; needs a native reviewer.

No writes were made to Supabase or anywhere outside `.a108-fur/`. Files touched: `.a108-fur/worker-orthography.md` (this file), `.a108-fur/scratch-orth-analysis2.cjs`, `.a108-fur/scratch-orth-out.txt`, `.a108-fur/scratch-orth-out2.txt` (all new, none committed).
