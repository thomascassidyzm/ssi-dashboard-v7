# Yoruba known-side vocabulary gate — built, calibrated, first reading

**Course:** `cym_for_yor` (Welsh for Yoruba speakers — **Yoruba is the KNOWN side**)
**Date:** 2026-08-26 · **Status of the reading:** first pass, unratified (`ratified: null`)
**Scope:** build the instrument and report its first reading. **No course content was changed.**

---

## 1. What was missing, and what was built

`cym_for_yor` was the only course on the estate whose known-side gate returned
`UNCHECKED(no_contract)`. Two concrete consequences today: five decomposition agents policed Yoruba
vocabulary discipline by eye across seeds 111–160 with no machine check, and a verifier that found
Yoruba tokens first appearing in seeds 152–157 had to decline to say whether they were normal first
introductions or untaught vocabulary.

Built, following the existing estate pattern rather than a new mechanism:

| File | What it is |
|---|---|
| `docs/pair-contracts/_known_yor.contract.cjs` | The known-language brief, same schema as `_known_ara` / `_known_kan` / `_known_jpn`. Resolved automatically by `tools/known-side/inventory.cjs` `loadContract()` for any course whose known language is `yor`. |
| `tools/known-side/calibrate-yor.cjs` | The six Yoruba-specific calibration controls (Y1–Y6). |
| `tools/known-side/seed-scan.cjs` | Generic: runs the gate over `course_seeds.known_text` for a whole course, and reports the **undecomposed tail as UNCHECKED with a reason** rather than omitting it. |
| `services/course-builder/lib/known-side-script.cjs` + `known-side-gate-v2.cjs` | One additive, opt-in resolver — see §4. No other course changes behaviour; all 90 existing gate tests pass. |

The existing generic tools — `tools/known-side/sweep.cjs` and `tools/known-side/calibrate.cjs` —
needed no change at all. They picked the contract up on their own.

---

## 2. The Yoruba decisions, stated

**Tone marks and diacritics.** Normalised to **NFC and nothing else** — lowercase plus cosmetic
punctuation stripping, diacritics fully preserved. The estate's `normalizeKnown` already names Yoruba
explicitly and does the right thing. Measured on the live corpus: it is already byte-identical to its
own NFC form, and the only combining marks present are U+0300 (grave) and U+0301 (acute), which sit on
`ẹ`/`ọ` because Unicode has no precomposed `ẹ̀ ẹ́ ọ̀ ọ́`. A `\p{L}`-only token class would silently
delete them; the estate tokenizer includes `\p{M}`, so it does not. Control **Y1** proves the
separation holds end-to-end.

**High-frequency grammatical particles — are they tokens like any other? Yes, and `freeClass` is
empty.** This is the largest decision in the contract and it is deliberately the opposite of every
other brief on the estate. In English, Arabic or Hindi the equivalent particles genuinely are never
"introduced". **In this course they are taught vocabulary with real first positions**: `mo` s1,
`láti` s1, `ń` s2, `ṣe` s3, `bá` s3, `máa` s3, `ní` s4, `tí` s8, `pé` s10, `ò` s10, `o` s11, `kí` s15,
`a` s18, `ti` s26, `ni` s33, `kò` s34. Putting them in `freeClass` would switch the gate off over most
of the corpus by token count and would hide exactly the error the course team worries about — a
particle used before the seed that teaches it. `npi` and `negation` are empty for the same reason
(every path that consumes those arrays makes the token unexaminable). The NPI and negation facts are
recorded as prose in the contract's `glossRules` for the agent lane. Control **Y5** measures the cost
of that choice: zero.

**Contractions and elisions.** There are **no apostrophes at all** in 34,460 tokens, so the estate's
apostrophe hazard does not arise and English contraction expansion is correctly not applied. What
*is* pervasive is **preposition fusion**: `ní` and `sí` fuse with a following vowel-initial noun and
change its tone — `ní + alẹ́ → lálẹ́`, `ní + ọ̀la → lọ́la`, `sí + ilé → sílé`, `ni + ó → ló`. 23 of the
275 token types carry it. This is structurally the Arabic proclitic problem: the gate's `stemStrip` is
suffix-only and cannot relate `lálẹ́` (taught s31) to `alẹ́` (taught s154). **I did not undo it with
string surgery** — telling a fused `l-` from a lexical one (`lọ`, `lè`, `lẹ́tà`) is a language
judgment a stemmer must not make. The cost is coverage loss, not false violations, and it is
conservative in the right direction. One of the four flags below is an artefact of it, named as such.

**Morphology: `isolating`.** Yoruba has no inflection — tense, aspect and person are all free
preverbal particles (`ń`, `máa`, `ti`, `yóò`, `kò`). That is what gives this gate real teeth: unlike
Arabic or Korean, an exact-match failure here genuinely is new vocabulary.

---

## 3. Calibration — mandatory, and it passed

Run against **real course data**, not fixtures.

| Control | Result |
|---|---|
| **C1** planted violation (a word the course teaches late, dropped into seed 1) | **6/6 caught** — `níbẹ̀`(s157), `ilé`(s156), `oúnjẹ`(s156), `ọ̀la`(s155), `ìṣẹ́jú`(s155), `alẹ́`(s154) all flagged |
| **C2** clean negative control (400 real legos at their own seed) | **400/400 pass, 0 high-confidence false positives, 0 borderline** |
| **C3** old-gate defect | v1 mis-tokenizes the Yoruba corpus (Latin-mangling arm of the known defect) |
| **C4** ASCII regression | pass — English tokenizes byte-identically, the 76 English-known courses are untouched |
| **Y1** tone is lexical | **PASS** — `mo`/`mọ̀`, `mo`/`mọ́`, `o`/`ó`, `ti`/`tí`, `ni`/`ní`, `yí`/`yìí` each dated as two separate words; the late member fires at the early member's seed, the early member does not |
| **Y2** NFD does not leak | **PASS** — the probe flags in both NFC and NFD form; NFD input never produces a spurious pass |
| **Y3** reduplication resolves | **PASS** — 5/5 untaught CV-gerunds of taught verbs resolve to their base |
| **Y4** …but still dates | **PASS** — 5/5 of the same gerunds flag when checked one seed *before* their base debuts. The resolver dates; it is not a blanket exemption |
| **Y5** empty `freeClass` is safe | **PASS** — 20/20 grammatical particles pass at their own introduction seed |
| **Y6** seeds 152–157 | see §6 |

It flags what is known to be there (C1, Y1, Y4) and does not flag ordinary first introductions
(C2, Y5, Y6). Reproduce: `node tools/known-side/calibrate.cjs cym_for_yor` and
`node tools/known-side/calibrate-yor.cjs cym_for_yor`.

---

## 4. The one divergence from the existing pattern

Yoruba's single productive affix is a **prefix**: the CV-reduplication gerund, which copies the verb's
initial consonant and prefixes `C+í` — `sọ→sísọ`, `ṣe→ṣíṣe`, `kọ́→kíkọ́`, `lo→lílo`, `rí→rírí`.
`stemStrip` removes **suffixes only**, so the existing machinery had no way to express the estate's
own E2 exemption ("a form of an already-introduced lemma is not new vocabulary") for this language.

Added: one opt-in contract field `reduplicativeNominal` and a matching `resolveByReduplication()`,
wired in immediately after `resolveByStemStrip` and gated on that field. It dates the token against
its base exactly as `stemStrip` does — so a gerund of a *later*-taught verb is still a violation
(control Y4). No other contract declares the field, so nothing else on the estate changes; all 90
tests in `services/course-builder/lib` pass.

Its known limitation, stated rather than hidden: the test is a string shape, so it would also
"resolve" `pípé` 'complete' onto `pé` 'that', which is etymologically wrong. Exact match is tried
first, so it never reaches a token that has its own lego — but any hit is evidence for a human, not a
proof of derivation.

---

## 5. First reading

### 5a. Legos and practice phrases (seeds 1–160) — CHECKED

```
rows checked   4,634    (449 legos + 4,185 practice phrases)
pass           4,615
flagged           19    (0.41%)  — all high-confidence, 0 borderline
UNCHECKED          0    (100% of rows answered)
```

**Currency.** Other jobs were editing `cym_for_yor` content while this ran, so the row counts move
between runs — an earlier run of this same reading saw 4,612 rows. **The flagged set did not change
across those runs: the same 19 rows and the same four tokens.** Re-run the commands in §8 for a
current count; the gate is the durable artefact, this reading is a snapshot.

### 5b. Seed sentences, all 668 — the honest split

```
seeds              668
answered           160    (157 pass, 3 flagged)  — the decomposed range
UNCHECKED          508    reason: no_vocab_inventory — legos exist only through seed 160,
                          so there is no introduced-vocabulary inventory for seeds 161–668
```

**This is not a pass for seeds 161–668 and must not be read as one.** The gate can only date a token
against what the course has decomposed, and nothing past seed 160 has been decomposed. `seed-scan.cjs`
reports those 508 seeds as UNCHECKED with the reason code, and additionally emits a **forward
census**: **329 token types** appear in seeds 161–668 that no lego teaches yet — the forward
vocabulary workload, not a defect list. First debuts: `ìwé`@161, `yẹn`@161, `sunday`@161, `lójú`@165,
`wọ́pọ̀`@166, `nìkan`@173, `ọdún`@176, `mú`@181, `màmá`@181, `dókítà`@181 … As each slice is
decomposed, re-running the scan converts that slice from UNCHECKED to a real verdict.

### 5c. The 22 flagged rows are **4 distinct issues**, with a false-positive call on each

| # | Token | Where | Gate says | My assessment |
|---|---|---|---|---|
| 1 | **`ọ`** (2sg object pronoun) | 16 phrase rows + 1 seed row, all at **seed 54** | never introduced | **REAL.** No lego anywhere teaches `ọ`. Its tonal partner `ọ́` *is* taught — but at seed 62, still *after* seed 54. A Yoruba speaker should decide whether the course means to teach both tone variants or one; either way seed 54 uses an object pronoun the learner has not been given. |
| 2 | **`ìdí`** ('reason') | 1 phrase at **seed 99** | not introduced until 105 | **REAL, minor.** A 6-seed ordering slip. |
| 3 | **`ọ̀la`** ('tomorrow') | 1 phrase + 1 seed at **seed 15** | not introduced until 155 | **PROBABLE FALSE POSITIVE.** The fused form `lọ́la` is taught at **seed 12**. This is the `ní`-fusion coverage split described in §2 — one word to a learner, two tokens to the gate. Flagged honestly; a Yoruba reviewer's call. |
| 4 | **`jí`** ('wake') | 1 phrase + 1 seed at **seed 108** | not introduced until 144 | **BORDERLINE.** The gerund `jíjí` ('waking') is taught at **seed 55**. The reduplication resolver runs gerund→base, not base→gerund, so a learner given `jíjí` is not credited with `jí`. Arguably a coverage artefact of the derivation direction rather than a real gap. |

**Flag rate: 0.41% of rows, 4 distinct issues across a 160-seed course.** Two are real and small
(`ọ`, `ìdí`), two sit on the two limitations the contract already documents (`ọ̀la` on preposition
fusion, `jí` on derivation direction). That is a gate a human will actually read, not a thousand-line
wall.

---

## 6. The seeds 152–157 tokens the verifier could not adjudicate

The verifier reported 9 Yoruba tokens first appearing in seeds 152–157 and honestly declined to say
whether they were normal first introductions or untaught vocabulary. The gate finds **11** tokens
first appearing in that window (the count differs slightly — most likely because the two
single-vowel tokens `ì` and `é` read as fragments rather than words). Its verdict on **all eleven**:

| Token | First used | Taught by a lego at | Verdict |
|---|---|---|---|
| `ìbá` | s152 | s152 | normal first introduction |
| `é` | s152 | s152 | normal first introduction |
| `gangan` | s153 | s153 | normal first introduction |
| `ì` | s153 | s153 | normal first introduction |
| `alẹ́` | s154 | s154 | normal first introduction |
| `àbámẹ́ta` | s154 | s154 | normal first introduction |
| `níbo` | s154 | s154 | normal first introduction |
| `ìṣẹ́jú` | s155 | s155 | normal first introduction |
| `ilé` | s156 | s156 | normal first introduction |
| `oúnjẹ` | s156 | s156 | normal first introduction |
| `níbẹ̀` | s157 | s157 | normal first introduction |

**Every one is taught by a lego at the very seed it debuts. None is untaught vocabulary.** The
unknown the verifier reported is closed.

One thing the gate surfaced *next to* that window and could not settle, recorded as an honest gap in
the contract rather than adjudicated: the course spells the same counterfactual particle **two ways in
adjacent seeds** — `"mo ìbá ti"` (s152) and `"Mi ì bá ti"` (s153). Both check out as introduced; the
inconsistency is a content question for a Yoruba reviewer.

---

## 7. Gaps and limits — read these before trusting a number

* **508 of 668 seeds are UNCHECKED**, not clean. Nothing past seed 160 has been decomposed, so there
  is no inventory to check against. Re-run `seed-scan.cjs` after each decomposition slice.
* **Preposition fusion is invisible to the gate** (`lálẹ́`/`alẹ́`, `lọ́la`/`ọ̀la`, `lánàá`/`àná`,
  `sílé`/`ilé`). It under-reports; it does not invent violations. Flag #3 is an instance.
* **The reduplication resolver is one-directional** (gerund→base). Flag #4 is an instance.
* **`ratified: null`.** The contract is a first pass authored from the corpus by an agent. It has had
  no Yoruba native-speaker review, and the `ọ`/`ọ́` allomorphy call in particular wants one.
* `gan` / `an` are the two halves of `gan-an`, split by the hyphen in the estate's punctuation class.
  They date identically so nothing mis-fires, but `an` is not a Yoruba word on its own.
* The gate checks the **known side only**. It says nothing about Welsh, and nothing about naturalness
  or authoring quality — out of scope by the estate's own pilot ruling.

---

## 8. Reproduce

```bash
node tools/known-side/calibrate.cjs      cym_for_yor    # C1–C4 (CAL_OUT=… for JSON)
node tools/known-side/calibrate-yor.cjs  cym_for_yor    # Y1–Y6
node tools/known-side/sweep.cjs          cym_for_yor    # legos + phrases (SWEEP_OUT=…)
node tools/known-side/seed-scan.cjs      cym_for_yor    # all 668 seeds, honest UNCHECKED tail
```

All four are read-only against the live Supabase. No content was changed by this job.

---

## 9. Independent verification

Job **#703** (sonnet, read-only) re-ran every command above against the live DB and branch and
**confirmed all six claims**: calibration holds (and the controls are non-vacuous — Y1/Y3/Y5 each
assert in *both* directions, so a no-op gate would fail them rather than sail through); no
regression (90/90 tests, and `reduplicativeNominal` is declared by `_known_yor` alone); the four
flagged tokens are correct against its own independent inventory build; a 16-row hand-check of
passing rows found nothing wrong; tone integrity holds under its own probe, including NFD input; and
it agrees with the false-positive calls in §5c, explicitly including the hedging — noting that at
seed 15 `ọ̀la` occurs *unfused*, so a learner taught only `lọ́la` genuinely has not met that surface
form, which is why "probable false positive" rather than "false positive" is the right confidence.
It raised the currency drift recorded in §5a. It made no commits.
