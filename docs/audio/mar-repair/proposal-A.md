# eng_for_mar repair proposal — seeds S0114, S0118, S0123

**14 rows rewritten, 0 left flagged. No DB writes, no audio generated.**

Cost if applied: **42 new clips** (14 × known + target1 + target2). No reuse was available — see "Audio" at the end.

---

## S0114 — "I feel as if I'm doing worse today than yesterday."

**S0114L01B03** (build) — lego "today than yesterday"
- was: `today than yesterday yet`
- now: `better today than yesterday`
- "yet" cannot attach to a comparative adjunct. Confidence **HIGH**.

**S0114L02U04** (use) — lego "feel as if I'm doing worse"
- was: `I'm not sure yet I feel as if I'm doing worse`
- now: `I'm not sure, but I feel as if I'm doing worse`
- "not sure" + "yet" were being used as a clause connector, producing a run-on. Confidence **HIGH**.

## S0118 — "I feel better than I felt when we were in the pub."

**S0118L01B03** (build) — lego "felt"
- was: `felt here`
- now: `felt okay`
- Confidence **HIGH**. Modelled on its own sibling "felt better".

**S0118L02B03** (build) — lego "were in"
- was: `were in here`
- now: `you were in the pub`
- Confidence **HIGH**.

**S0118L02U03** (use) — lego "were in"
- was: `we were in here today`
- now: `we were in the pub yesterday`
- Confidence **HIGH**.

**S0118L02U04** (use) — lego "were in"
- was: `we were in here in English`
- now: `we were in the pub last week in English`
- The "in English" tag was NOT the defect and is preserved in place; "in here" was. Confidence **HIGH**.

## S0123 — "I think that's a good idea."

**S0123L01B03** (build) — was `I think that's very happy` → now `I think that's a good thing` — **HIGH**
**S0123L01B04** (build) — was `I think that's yet` → now `I think that's a mistake` — **MEDIUM**
**S0123L01U01** (use) — was `I think that's very well` → now `I don't know, but I think that's a good thing` — **HIGH**
**S0123L01U02** (use) — was `I think that's not sure` → now `I think that's a mistake, but I'm not sure` — **MEDIUM**
**S0123L01U03** (use) — was `I think that's already in English` → now `I think that's a good thing in English` — **HIGH**
**S0123L01U04** (use) — was `because I think that's very well` → now `because I think that's a good thing` — **HIGH**
**S0123L01U05** (use) — was `I think that's very happy tonight` → now `I think that's a good thing and I'm happy` — **HIGH**
**S0123L02U05** (use) — was `I think that's a good idea yet` → now `yes I think that's a good idea` — **HIGH**

---

## USE-phrase counts — nothing drops below 4

| Lego | USE before | USE after |
|---|---|---|
| S0114 L1 | 4 | 4 |
| S0114 L2 | 5 | 5 |
| S0118 L1 | 5 | 5 |
| S0118 L2 | 4 | 4 |
| S0123 L1 | 5 | 5 |
| S0123 L2 | 5 | 5 |

Every row is a replacement; nothing deleted.

## Explicit gaps

1. **"a mistake" (2 items, MEDIUM).** The learner has met "mistakes" (S0046/47/48) but the singular "a mistake" is not introduced until S0617. A morphological step within known vocabulary, not new vocabulary — but a stretch. Fallback if rejected: `I think that's a good thing in English`, all-HIGH, at the cost of near-duplicating the existing B02.
2. **Two lego cards are themselves mistranslated, and are the root cause.** `S0114 L2 "feel as if I'm doing worse" = वाईट करत होतो` is past tense ("was doing badly"); `S0114 L1 "today than yesterday" = आज त्यापेक्षा` reads "today than that", with no standard of comparison. My Marathi follows the seed's own well-authored text instead. Cards are out of my scope and unchanged.
3. **`S0123 L1 "I think that's" = मला वाटतं ती` is gender-locked.** ती is the FEMININE demonstrative (agreeing with कल्पना). Every phrase on this lego is therefore forced to take a feminine noun complement, or it reads "I think *she* is…". This is why all seven replacements use "a good thing"/"a mistake" and not adjectives. A genuinely reusable card would be ते/की ते.
4. **Register lengthened on one item.** S0123L01U01 goes 5 → 10 words. Within this course's observed USE range but visibly longer; shorter alternative `yes I think that's a good thing` available.
5. **Out of scope but same defect:** `S0123L02U03 "I think that's a good idea again"` looks like the same generator fault and was not on my work list.
6. **No Marathi speaker reviewed any of this.** Every Marathi judgement is grounded in in-course attestation (cited per item) or an external grammar reference, but none is native-verified.

## Audio

All 14 replacements need fresh clips (42 total). I checked each against `course_audio` with a verified positive control. The only already-voiced near-misses are the broken texts themselves — the defects are what got voiced. `felt like` has audio but comes from S0363 (a prerequisite leak at S0118) with unrelated Marathi, so I rejected it.
