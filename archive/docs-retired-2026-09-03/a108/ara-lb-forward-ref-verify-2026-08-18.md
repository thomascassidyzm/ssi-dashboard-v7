# ara_lb_for_eng — Deborah's five forward-reference defects, re-verified live

**2026-08-18. Read-only. No writes to Supabase, no audio, no code edits.**

Scope: the five "English known-side word used before its round" findings previously
triaged in `.a108-aralb/REPORT.md` (bucket A). That report is unpublished local
scratch, not committed evidence — everything below is re-derived independently
against the live DB, not copied from it. Two of the five do not survive
re-verification; I explain why below, since "confirmed" was the prior claim on
all five.

**Anchor check (required before trusting any round number):** `course_round_index`
maps `S0022L03` → `round_index 61` for `ara_lb_for_eng`. Matches the "b+people"
anchor exactly. Round numbers below are trustworthy.

---

## Verdicts at a glance

| # | Word | Round used | First taught | Verdict | Can learner PRODUCE the target answer? |
|---|---|---|---|---|---|
| 1 | "a lot" | R3 | R538 | **VERIFIED — but not the defect it looks like** | Yes, mechanically (all Arabic words are taught) — but the Arabic doesn't mean "a lot" at all |
| 2 | "with me" | R4 | R40 | **VERIFIED** | **No** — معي is not taught for 36 more rounds |
| 3 | "well" | R27 | R37 | **VERIFIED** | **No** — منيح is not taught for 10 more rounds |
| 4 | "enough" | R27 | R156 | **NOT REPRODUCIBLE as a forward-reference** | **Yes** — the Arabic used is a whole phrase taught 8 rounds *earlier* (R19); it never uses the R156 word at all |
| 5 | "I feel" | R109 | R110 | **NOT REPRODUCIBLE — refuted** | **Yes** — the Arabic word used (حاسس) was taught the round *before* (R108); the claim that these rows use the untaught R110 word (أحس) is factually wrong |

Only **2 of 5** are genuine target-production leaks. Of the remaining three: one is
confirmed as a real but *differently-shaped* defect (a mistranslation, not a
forward reference), one downgrades from "serious, 129 rounds early" to "cosmetic
known-side wording only," and one does not reproduce at all.

---

## 1. "a lot" — R3, seed 1, `S0001L03U03`

**Row:** known_text `"I want to speak Arabic a lot"`, target_text `"بدي أحكي عربي، عربي"`.
Audio (`4d8d9497-1241-44dd-8b5f-75a1ac7c88dc`, Layla F) verified live, 4128ms;
`word_boundaries` confirm it is spoken exactly as stored: بدي / أحكي / عربي / ، / عربي — **"I want to speak Arabic, Arabic."**

**First taught:** "a lot" → كتير, at `S0244L01` = **R538** (`"I've learnt a lot already"` → `"تعلمت كتير هلق"`). Confirmed against `course_round_index`. Gap: 535 rounds.

**What's actually wrong:** two independent defects stacked on one row, not one:
- English-side comprehension leak: the learner reads/hears "a lot" 535 rounds before it's taught — real, as reported.
- **Separately, and worse:** the Arabic never contains a word for "a lot" at all. It repeats عربي ("Arabic") a second time instead. This isn't an early-vocabulary problem, it's a mistranslation — كتير was simply never used.

**Can the learner produce the target?** Mechanically yes — بدي, أحكي, عربي are all taught by R3 — but what they'd produce is nonsense ("I want to speak Arabic, Arabic"), not an answer to what the English prompt asks. That is a worse pedagogical failure than a vocabulary gap: there is no correct target this prompt could currently produce.

**Fix:** cannot be repaired in context — at R3 the learner has met exactly 3 LEGOs (بدي, أحكي, عربي), none of which can express "a lot." This phrase has to be **deleted or deferred to well past R538**, not rephrased. No existing clip covers a valid taught-only alternative (checked: none of `"بدي أحكي عربي كتير"` / `"أحكي عربي كتير"` exist in `course_audio`), so any fix needs new audio — flagged, not applied.

**Confidence: 95%** (direct text/audio inspection, not inference).

---

## 2. "with me" — R4, seed 1, `S0001L04U04`

**Row:** known_text `"speak Arabic with me"`, target_text `"أحكي عربي معي"`.
Audio (`276ef71f-ea41-4ff0-b908-3e5ed45b61e1`) verified live, text matches exactly.

**First taught:** "with me" → معي, at `S0015L02` = **R40**. Confirmed. Searched every lego seed 1–14 for معي or a "me"-suffix component (as opposed to the "you"-suffix ك already taught at R4 in the same seed) — **no earlier occurrence, whole or componential.** Gap: 36 rounds, exact match to the earlier claim.

**Can the learner produce the target?** **No.** معي is a genuinely unmet morpheme at R4 — the learner has مع ("with") and ك ("you"-suffix) from this same seed, but not ي ("me"-suffix), which isn't introduced as a component anywhere before R40. This is a real, clean forward-reference — the Arabic itself is well-formed, it's simply premature.

**Fix:** unfixable in context (only 4 LEGOs exist by R4: "I want", "to speak", "Arabic", "with you"). No taught-only rephrase exists. **Flag for deletion or move to ≥R40.** No pre-existing clip to relink to — any fix needs new audio.

**Confidence: 95%.**

---

## 3. "well" — R27, seed 10, `S0010L03U02`

**Row:** known_text `"I'm not sure if I can explain it well"`, target_text `"مش متأكد إذا فيني أشرح منيح"`.
Audio (`fd57a870-12ac-4c06-bffe-8bc32d3e9302`) verified live, 5280ms, text matches.

**First taught:** "well" → منيح, at `S0013L03` = **R37**. Confirmed — no earlier occurrence of منيح in any lego seed 1–12. Gap: 10 rounds.

**Can the learner produce the target?** **No.** منيح genuinely isn't taught until R37. Real forward-reference, matches the earlier claim exactly.

**Extra, not previously separated out:** the English "it" in "explain it well" has **no counterpart in the Arabic at all** — أشرح ("[I] explain") takes no object. That's a distinct minor defect (an English word with nothing to produce), not a producibility problem, since there's nothing for the learner to fail to produce — just noted so it isn't miscounted as part of the "well" leak.

**Fix:** at R27 the learner has ~10 seeds of LEGOs including "not sure," "if," "I can," "to speak," "Arabic," "now" — enough to build "I'm not sure if I can speak Arabic now" (already exists as `S0010L03U01`) but not an "explain...well" variant without منيح. **Flag for deletion or move to ≥R37.** No relinkable clip exists for a منيح-free rephrase using only pre-R27 vocabulary that isn't already a duplicate of another row in the same seed.

**Confidence: 92%.**

---

## 4. "enough" — R27, seed 10, `S0010L03U04` — downgrades on re-check

**Row:** known_text `"I'm not sure if I can try hard enough"`, target_text `"مش متأكد إذا فيني أحاول بكل ما عندي"`.

**The R156 lego** (`S0060L02`, "enough" → كافية) is **never used in this row.** بكل ما عندي is a *separate, whole* Levantine idiom meaning "with everything I have" — and it is not a forward reference at all: it's `S0007L02`, glossed `"as hard as I can"` → `"بكل ما عندي"`, taught at **R19**, eight rounds *before* R27, not 129 rounds after.

**Can the learner produce the target?** **Yes.** بكل ما عندي is a fully-taught chunk by R27 (from R19). The learner can produce this exact Arabic string with material already met.

**What's actually left as a defect:** the English word "enough" itself appears on the known side before it's formally taught as its own LEGO (R156) — but since the Arabic side never corresponds to "enough" (it's an idiom substitution, "hard enough" ≈ "with everything I have"), this is a known-side wording/gloss choice, not a leak that blocks production. Low severity — arguably not a defect at all, since "enough" here is functioning as ordinary English prose around an idiom, not as a translatable unit the learner needs to produce.

**Verdict: NOT REPRODUCIBLE as a 129-round forward-reference.** The earlier characterization (gap = 129 rounds, "needs rephrase") is wrong on the producibility test — I'm downgrading it. No fix needed on the target side. If the known-side wording still bothers a reviewer, cheapest fix is deleting "enough" from the English gloss ("I'm not sure if I can try as hard as I can" is redundant, so more likely: rephrase English only, no Arabic/audio change) — but that's a stylistic call, not a course-integrity defect.

**Confidence: 90%** (direct text-and-round-index comparison — this is the strongest kind of check available here).

---

## 5. "I feel" — R109, seed 41, `S0041L01` Uses — refuted

**Rows checked (all of `S0041L01`'s Builds/Uses containing "feel"):**

| id | known | target |
|---|---|---|
| `S0041L01B02` | feeling okay | حاسس تمام |
| `S0041L01U01` | I feel okay today | حاسس تمام اليوم |
| `S0041L01U02` | I feel okay right now | حاسس تمام هلق |
| `S0041L01U04` | I was feeling okay this morning | كنت حاسس تمام هالصبح |
| `S0041L01U05` | I feel okay when I speak more | حاسس تمام لما بحكي أكتر |

**Every single one uses حاسس, not أحس.** أحس (the finite 1sg verb "I feel") only
starts appearing at `S0041L02` — **R110**, one round later — and every row that
uses it is a Build/Use of *that* lego, not R109's.

**First taught:** حاسس ("you feel" per its LEGO gloss) at `S0040L01` = **R108** —
one round *before* R109, not after.

**Can the learner produce the target?** **Yes.** حاسس is taught at R108 and used
correctly, unchanged, at R109.

**The prior claim ("R109's Builds ask the learner to produce أحس, a different
word they have not met") does not match the live data — I could not reproduce
it and the DB shows the opposite.** حاسس is an Arabic active participle, which
(unlike the b-/bt-/by-/bn- prefix verbs elsewhere in this course) does not
inflect for grammatical person at all — only gender/number. Glossing it "you
feel" at its LEGO debut and then reusing the identical, unchanged word for "I
feel" one round later isn't a forward reference; it's the same word doing what
Arabic participles do. No defect here.

**Verdict: REFUTED. No action.**

**Confidence: 95%** (five-row direct comparison plus lego-teach-order lookup,
not inference).

---

## What this changes about "5 confirmed"

| Finding | Prior claim | My verdict |
|---|---|---|
| a lot | untaught word, 535 rounds early | Confirmed leak, **but** also a distinct mistranslation (target never says "a lot") |
| with me | untaught word, 36 rounds early | **Confirmed as stated** |
| well | untaught word, 10 rounds early | **Confirmed as stated** |
| enough | untaught word, 129 rounds early | **Downgraded** — target never uses the R156 word; learner can produce the actual target from material taught 8 rounds *earlier* |
| I feel | untaught word, 1 round early | **Refuted** — target word is taught 1 round *earlier*, not later; the specific word claimed (أحس) is never used in these rows at all |

Net: **2 of 5 are genuine, unfixable-in-context target-production leaks** (with
me, well). **1 of 5 is a real but different defect** (a lot — mistranslation,
not lateness). **2 of 5 do not hold up** (enough, I feel).

---

## Fixes proposed (none applied)

| Row | Fix | Audio impact | Existing clip to relink? | Confidence |
|---|---|---|---|---|
| `S0001L03U03` ("a lot") | Delete or move past R538; needs a genuine "a lot" translation (كتير) if kept | New audio required | None found | 90% |
| `S0001L04U04` ("with me") | Delete or move to ≥R40 | New audio required | None found | 90% |
| `S0010L03U02` ("well") | Delete or move to ≥R37 | New audio required | None found | 88% |
| `S0010L03U04` ("enough") | No Arabic-side fix needed; optional English-only reword | None (if left) | N/A | 85% |
| `S0041L01` "I feel" rows | No fix needed | None | N/A | 95% |

All three genuine-defect rows sit too early in the course for an in-context
rephrase using only already-taught LEGOs (checked component inventory for each
round; none suffice). Per the standing fix rule, that means **human
rephrase-or-delete**, not a mechanical text edit — I have not written to any
row.

---

## Gaps

- I did not have access to Deborah's original raw note for these five items —
  only a prior (uncommitted, `.a108-aralb/REPORT.md`) local write-up that
  attributed them to her. I re-derived every number against the live DB rather
  than trusting that document, and two of its five did not survive
  re-verification. If Deborah's own wording differs from what that document
  paraphrased, the two refuted/downgraded items should be read as "this
  specific characterization doesn't hold," not "Deborah was wrong" — I don't
  have her original text to compare against directly.
- I did not exhaustively search every seed for every possible whole-phrase
  taught-alternative for the three genuine defects — I checked the direct
  component inventory of the relevant early seeds, which is sufficient to say
  "no simple fix exists," not sufficient to prove no fix of any shape exists.

No commits produced by this job — diagnosis only, written to this one file, not pushed.
