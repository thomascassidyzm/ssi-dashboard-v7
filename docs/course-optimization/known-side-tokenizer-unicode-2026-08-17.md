# The known-side gate could not read a language that isn't English

**2026-08-17 · job #A135 · the gate is fixed; the exposure is below**

---

## ~1,100 known-side violations were hiding behind a clean pass

Seven live courses — the ones that teach English to Tamil, Hindi, Bengali,
Gujarati, Punjabi, Sinhala and Urdu speakers — have been running the known-side
vocabulary check and being told they were clean. The check was reading zero words
of their prompts. It could not: it split text on `a`–`z`, so a Tamil sentence came
out as an empty list and the checker found nothing wrong with an empty list.

With that fixed, those seven courses produce **14,662 raw hits**. Most are noise —
these are agglutinative languages and the check matches exact word forms, so a
verb that was taught in one ending and used in another looks new when it isn't.
After stripping the noise automatically and then having a language-by-language
adjudicator hand-judge 40 surviving cases per course, the estimate is:

# ≈ 1,100 real violations

Prompts that put a word in front of a learner who had never been given it.

---

## Per course

| Course | Prompts checked | Raw hits | After auto de-noising | Real, in a 40-case hand check | **Estimated real** |
|---|---:|---:|---:|---:|---:|
| eng_for_sin (Sinhala) | 10,506 | 2,256 | 876 | 62.5% | **≈ 548** |
| eng_for_urd (Urdu) | 9,746 | 1,288 | 620 | 25% | **≈ 155** |
| eng_for_guj (Gujarati) | 11,628 | 2,116 | 748 | 20% | **≈ 150** |
| eng_for_hin (Hindi) | 10,599 | 845 | 343 | 30% | **≈ 103** |
| eng_for_pan (Punjabi) | 10,621 | 1,088 | 328 | 22.5% | **≈ 74** |
| eng_for_tam (Tamil) | 10,936 | 3,797 | 772 | 5% | **≈ 39** |
| eng_for_ben (Bengali) | 10,632 | 3,272 | 1,394 | 2.5% | **≈ 35** |
| **Total** | **74,668** | **14,662** | **5,081** | — | **≈ 1,104** |

**How the raw number became the real one.** 14,662 → 5,081 by rule: a hit is
dropped if the flagged word is a listed free-class item carrying a case suffix, a
listed NPI or negation form, a construction marker the contract licenses, a word
sitting inside a gloss the learner already had, or a close morphological variant
of an already-taught stem. 5,081 → ≈1,104 by hand: seven adjudicators, one per
language, judged 40 residual cases each and reported what fraction were genuinely
new words. The per-course estimate is that fraction applied to that course's
residual — an extrapolation from a 40-case sample, not a census. Sinhala's rate is
far above the rest and drives half the total; it is the one worth counting
properly before acting on it.

**These are not fixed.** Nothing in the content was touched. This is a triage
list.

---

## The bigger number is the one with no count next to it

**34 more courses with real content still have no known-side check at all** —
including all 8 Japanese-known courses, 5 Chinese-known, 3 Spanish-known and
2 Welsh-known. Not a broken check: no check. Those pairs have no contract, and
the gate only runs where a contract exists. The fix does not change that, and
those courses have never had a known-side all-clear worth anything either.

They now say so out loud instead of passing quietly, which is the only part of
that gap this job closes.

| Known language | Courses with no known-side check |
|---|---:|
| Japanese | 8 |
| Chinese | 5 |
| Spanish | 3 |
| Welsh, French, Hindi, Tamil | 2 each |
| Arabic, German, Irish, Italian, Kannada, Korean, Marathi, Portuguese, Telugu, Yoruba | 1 each |

---

## One more thing the same bug was doing

Accented letters were separators too, so a Latin known side came apart into
rubble rather than words. Measured on live content: Yoruba produced 1.43 words for
every real one, 92% of them two letters or shorter; Irish 1.12; Spanish 1.08;
German 1.07; Portuguese 1.06; French 1.05. Italian went the other way — a word
made *entirely* of accented letters disappeared completely. None of those
languages is a known side with a contract today, so this was latent rather than
live, but it would have bitten the moment anyone wrote one.

---

## What changed in the code

One character class. The known-side tokenizer now recognises letters in every
script instead of only `a`–`z`, and languages written without spaces between
words (Japanese, Chinese, Thai, Lao, Khmer, Burmese) are segmented properly rather
than handed to the checker as one long unbroken string. English tokenizes
byte-for-byte as it did before — proven against 35,700 real English prompts, zero
differences — and a test suite now covers every script family, so this cannot
come back unnoticed.

Two judgment calls worth knowing about:

- **The seven Indic contracts are written as briefs for a human or agent to read,
  not as machine rules** — that was a deliberate decision ("no regex for
  language"). So the mechanical check now runs on them but its findings are
  advisory: they are flagged for a person, and never block a submission. Blocking
  would be wrong, because exact-form matching genuinely cannot tell an inflected
  form of a taught word from a new word in these languages. That is also why the
  ≈1,100 figure needed seven adjudicators rather than a count.
- **A course the gate cannot check now says so.** Previously silence and a clean
  pass looked identical from outside.

---

## What to do next

1. **Sinhala first.** 876 residual hits at a 62.5% hand-verified real rate is far
   out of line with its siblings — either it has a genuine content problem or its
   vocabulary inventory is recorded differently. Worth a proper count, not an
   extrapolation.
2. **Decide whether the 34 unchecked courses get contracts**, starting with
   Japanese (8 courses). The tokenizer can now read them; nothing else can.
3. **Triage the ≈1,100.** Per-course adjudication tables with phrase IDs, flagged
   words, glosses and reasons exist for all seven languages.
