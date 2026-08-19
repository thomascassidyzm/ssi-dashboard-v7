# Known-side distinction coverage — check, calibration, and the eng_for_hin candidates

**2026-08-19** · scan-course Check 19 · `tools/check-known-distinction-coverage.cjs`

## The teaching problem

Shuchita, the proofreader for English for Hindi speakers, on eng_for_hin:

> "Hindi genders things that you dont in English. We want to make sure that the Hindi speakers
> understand the lack of gendering in these contexts — so we should prompt for the multiple
> options (both genders for example) with the same English phrase as the answer. Drilling that
> will help them understand the phrase they learnt is acceptable for both genders instead of just
> the one originally introduced."

In eng_for_hin the known side is Hindi and the target is English. A learner meets **मैं बोलना चाहता हूँ**
at seed 1, learns **"I want to speak"**, and has nothing telling them that **मैं बोलना चाहती हूँ** has the
same answer. They reasonably conclude the English belongs to the gender they were shown.

**The axis is not gender.** It is *same target answer, multiple known-side prompts, wherever the
learner's own language distinguishes what the target does not.* Hindi gender is one instance;
formality tiers, number, inclusive/exclusive "we" and case are the same shape elsewhere. The
checker is written so a second distinction is a table entry, not a rewrite — the tables live in
`tools/known-side/known-distinctions.cjs` and the checker never mentions gender.

**This is ZUT's mirror, not ZUT.** ZUT forbids one known prompt mapping to two target forms. This
finds one target form reachable from two known prompts with only one taught. A healthy course can
have both properties at once.

## Where it lives

It follows the Check 18 pattern exactly — a committed lib holding the verdict logic, a committed
CLI, and a section in the scan-course skill telling you to run the tool rather than hand-roll the
matcher:

| | |
|---|---|
| Config / verdict logic | `tools/known-side/known-distinctions.cjs` |
| Calibration test | `tools/known-side/known-distinctions.test.cjs` |
| CLI | `tools/check-known-distinction-coverage.cjs` |
| Registration | `.claude/commands/scan-course.md` — Check 19, plus a `[19]` slot in the Step 5 report |

```bash
node tools/check-known-distinction-coverage.cjs eng_for_hin
node tools/check-known-distinction-coverage.cjs eng_for_hin --json
node tools/known-side/known-distinctions.test.cjs
```

Courses whose known/target pair has no configured distinction print `SKIPPED` and exit 0 —
verified on spa_for_eng and eng_for_spa. Only `hin→eng` is configured. kor_for_hin and zho_for_hin
also have Hindi on the known side and are **deliberately not** enabled: neither Korean nor Chinese
marks speaker gender either, so the check would probably apply, but "probably" is not calibration
and nobody has looked at those courses.

**It proposes; it never applies.** Nothing is written to course content, and this does not go near
the course builder. That ordering is Kai's ruling: *"We should test it out properly as fixes before
thinking about changing the actual course generation."* A rule at generation time acts on everything
silently before anyone can look at it.

## How it decides

For each phrase, swap every gender-marked token to the other side, then ask whether the course
already teaches that prompt.

1. **Swap.** A phrase-level swap, not a token-level one: `मैं थका हुआ हूँ` → `मैं थकी हुई हूँ`. Swapping
   one word and not its agreeing neighbour produces `थका हुई हूँ`, which is not a sentence.
2. **Already taught with the same answer?** → *attested*. This is the calibration signal.
3. **Taught with a different answer?** → *counterpart-with-different-answer*, reported separately.
4. **Named rejection rules**, each carrying its reasoning into `--json`.
5. **Anchor check** — does the phrase show that a *participant* controls the agreement? If not it is
   *unanchored*: reported, never proposed.
6. Whatever survives is a **proposal**, deduped by prompt+answer with the earliest seed that needs it.

Every row carrying a marked form lands in exactly one bucket. The run prints
`coverage: classified/carrying`; on eng_for_hin that is **5,082/5,082 (100%)**. Nothing is dropped.

## Calibration — it finds cases that are already there

The strongest available evidence is not a count, it is the set of places the course **already does
this**, found by hand before the tool existed and then reproduced by it. eng_for_hin teaches both
sides with an identical English answer in **33 rows**:

| seed | taught | also taught | shared answer |
|---|---|---|---|
| 16 | चाहता | चाहती | wants |
| 30 | चाहता था | चाहती थी | wanted to |
| 34 | नहीं चाहता | नहीं चाहती | doesn't want |
| 332 | सकता है | सकती है | can |
| 357 | चाहती थी | चाहता था | wanted to |
| 361 | था | थी | was |

The pattern Shuchita is asking for is not hypothetical. It occurs 33 times in 12,421 phrases —
about a quarter of one percent — and the tool finds all of them. A run reporting zero attested on
this course would be a broken run, not a clean course.

The calibration test pins 24 real rows, and its false-positive half matters more than its
signal half: a swap table that fired on `मुझे लगता है` would bury the finding under 617 rows of
noise that looks exactly like signal to anyone who doesn't read Hindi.

**One calibration bug this caught, worth recording.** The Devanagari "word boundary" class
`ऀ-ॿ` contains U+0964, the danda — the full stop. With the danda inside the class,
`चाहता हूँ।` never matched, and every complete sentence in the course was silently skipped. The
count looked plausible the whole time. It is now excluded, with a test.

## The candidates — eng_for_hin

```
coverage: 5082/5082 rows carrying a marked form (100%)
PROPOSALS: 1906 distinct  (1924 rows, across 412 seeds; 625 of them at seed ≤100)
attested 33 · counterpart-with-different-answer 63 · unanchored 922 · rejected 2140
```

A sample, from seed 1 upward:

| seed | taught | missing counterpart | shared English answer |
|---|---|---|---|
| 1 | मैं बोलना चाहता हूँ। | मैं बोलना चाहती हूँ। | I want to speak |
| 1 | चाहता हूँ | चाहती हूँ | want |
| 2 | कोशिश कर रहा हूँ | कोशिश कर रही हूँ | I'm trying |
| 14 | क्या आप बोलते हैं? | क्या आप बोलती हैं? | do you speak? |
| 32 | क्या आप चाहते थे बोलना अंग्रेज़ी में आसानी से? | क्या आप चाहती थीं बोलना अंग्रेज़ी में आसानी से? | did you want to speak in English easily? |
| 39 | मैं थका हुआ हूँ आज। | मैं थकी हुई हूँ आज। | I'm tired today |
| 58 | क्या आप अभी समझते हैं? | क्या आप अभी समझती हैं? | do you understand now? |
| 205 | मैं आज भूल गया। | मैं आज भूल गई। | I've forgotten today |
| 379 | मैं अफ्रीका देखने के लिए इतना भाग्यशाली था | मैं अफ्रीका देखने के लिए इतना भाग्यशाली थी | I was lucky enough to see Africa |
| 490 | मैं कभी किसी पर भरोसा नहीं करूँगा | मैं कभी किसी पर भरोसा नहीं करूँगी | I will never trust anyone |
| 638 | मैं अभी सोचने की कोशिश कर रहा हूँ, कृपया रुकिए। | मैं अभी सोचने की कोशिश कर रही हूँ, कृपया रुकिए। | I'm trying to think now please |

Full list: `node tools/check-known-distinction-coverage.cjs eng_for_hin --json`.

**1,906 is a proposal count, not a work order.** Most of them are one verb apart from a phrase that
already exists, and the course front-loads them: a third sit in the first 100 seeds, where a learner
forms their first assumption about who the English belongs to. If this gets tested as a fix, the
honest experiment is the first 20 seeds, not the whole course.

## The false positives, and how they were removed

Hindi marks a great deal of gender that is **not** the speaker's. Every one of those is a false
positive, and they outnumbered the signal in the first cut. Two mechanisms deal with them: lexemes
that never agree with a participant are simply **absent from the tables** (absence is the
mechanism — an unlisted form is never swapped), and rows that survive the tables are killed by
**named rules** whose reasoning is in the output.

### Rejected by omission — never swapped at all

| pattern | rows | why it is not speaker gender |
|---|---|---|
| मुझे लगता है "I think" | 617 | लगता agrees with the thing thought, never the thinker. A woman also says मुझे लगता है. The single biggest trap in the course. |
| अगर मुझे पता होता "if I had known" | 169 | पता is a masculine noun; the phrase is invariant. |
| मैंने शुरू किया "I started" | 265 | Ergative — the perfective agrees with the object, so it is identical for both speakers. |
| मुझे मिला "I got" | 57 | Agrees with what was got. |
| मेरा / मेरी / आपका | — | Agree with the possessed noun, not the possessor. |
| अच्छा / अच्छी | — | `गाड़ी अच्छी है` is forced by गाड़ी being feminine, not by anyone's gender. |
| समझ नहीं आया | 20 | Idiom; agreement is with समझ, not the speaker. |

### Rejected by rule — 2,140 rows

| rule | rows | reasoning |
|---|---|---|
| `target-marks-gender` | 1,024 | The English answer already says he/she/his/her, so the two Hindi prompts do **not** share one answer. `वह चाहता है` → "he wants" and `वह चाहती है` → "she wants" is a real distinction, correctly taught as two things. |
| `third-person-subject` | 870 | Agreement is controlled by a third party or a gendered noun: `मेरी बेटी अंग्रेज़ी सीख रही है`. The counterpart would be a different sentence, not a variant. |
| `ambiguous-agreement-controller` | 100 | An honorific -ते form sitting after a plural/relative nominal agrees with **that** noun: in `आप चाहते हैं मिलना लोगों से जो अंग्रेज़ी बोलते हैं`, बोलते belongs to the people and stays बोलते however the listener is gendered. Swapping it was a real bug in the first cut, found by reading output rather than counting it. |
| `reverse-direction-needs-speaker-lock` | 139 | Going feminine→masculine, -ती is ambiguous between singular -ता and honorific -ते. The raw swap produced the ungrammatical `आप चाहता हैं`. A guessed prompt is worse than a missed one. |
| `explicitly-gendered-address` | 6 | `क्या आप चाहती हैं महोदया?` — the prompt names the gender of the person addressed. |
| `ergative-perfective` | 1 | ने marks the ergative. |

### One rule that had to be weakened, not strengthened

A blanket "any third person present → reject" threw away 112 valid rows:
`मैं आपके दोस्त से बात करना चाहता हूँ` is the *speaker's* gender however many friends the sentence
mentions. The rejection is now waived when every swapped form is **speaker-locked** — directly
followed by the 1sg copula हूँ, whose only possible subject is मैं, or a -ऊँगा future, which is 1sg by
its own morphology. The machinery then does the right thing on the hard case:

> `मुझे लगता है कि मैं उस जवान औरत को जानता हूँ जो बात कर रही है`
> → `… मैं उस जवान औरत को जानती हूँ जो बात कर रही है`

`जानता` (the speaker's) is swapped; `रही` (the young woman's) is left alone; `लगता` is never touched.

### Parked, not judged — 922 unanchored rows

Rows carrying a marked form where nothing shows whose gender it is: subjectless build fragments like
`चाहता था कि`, `भुगतान करना चाहता है`. Reported and never proposed. They are the honest residue of
insisting on a participant anchor.

### Known under-reports — precision was bought with recall

Stated plainly rather than hidden:

- **Speaker-gendered forms under a third-person subject.** `वह मुझे अकेला नहीं छोड़ना चाहता था` —
  `अकेला` is the *speaker's* gender, English marks none of it, and the row is rejected because the
  answer says "he". Real, and missed. Fixing it needs argument-level agreement resolution.
- **`हम` groups** (`हम चाहते` → `हम चाहती`) — the honorific table is keyed to the addressee.
- **Feminine-taught rows** are only proposed when the form is locked to मैं, so a feminine-only
  honorific prompt is never given a masculine partner.
- **Demonstratives.** `क्या आप वह सूटकेस उठा सकते हैं?` is rejected on `वह` even though `सकते` agrees
  with `आप`.

## A side finding, free with the run

The *counterpart-with-different-answer* bucket has 63 rows. Most are the correct he/she pairs. But
23 are not explained by English gender at all — they are the same Hindi fragment glossed
inconsistently across seeds:

| seed | | | |
|---|---|---|---|
| 30 / 302 | चाहता → "wanted" | चाहती → "want" | tense disagrees |
| 349 | चाहता था → "want to" | चाहती थी → "wanted to" | |
| 151 / 86 | नहीं था → "it wasn't" | नहीं थी → "didn't have" | different verb entirely |
| 640 | वाला → "one" | वाली → "with" | |

Not this check's subject, and not adjudicated here. Filed because it fell out of the same run.

## Not done, on purpose

- No counterpart phrases were created. Proposing them is the deliverable.
- Nothing was written to course content, and the course builder was not touched.
- Shuchita's other finding — the Hindi is too literal and too formal, close enough to the English to
  be hard to understand — is a separate and much larger pass, and is untouched here. The
  translation inconsistencies above are a hint of the same terrain.
