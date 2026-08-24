# Agent-driven known-side check — eng_for_hin pilot (2026-06-15)

*The replacement for the regex `checkKnownSide`. Each agent reasons in the known language (no regex,
no pattern-matching) against the introduced LEGO inventory + the language brief. Pilot: eng_for_hin
seeds 1–150, 6 batches of 25, 3,348 prompts. Findings: `eng-for-x-fixes/known-side_eng_for_hin.json`.*

## Verdict: PASS — the agent-gate is a credible replacement for the regex gate

37 findings across 3,348 prompts (**1.1% — low noise**), each citing seed + category + the exact string
+ a reproducible reason. What it does that regex cannot:

- **Inflection/agreement-aware vocab control** — चाहता/चाहती/चाहते all resolve to the introduced lemma
  'want'; मैंने perfective, सीख रहे हैं → बोल रहे हैं all trace to introduced lemmas. Not flagged as new.
- **Machinery licensing fully clean** (0 unlicensed across all 6 batches): ने / क्या / आप / रहे / सकता
  all correctly gated to debut seed.
- **Real linguistic judgment**: distinguishes NPI कुछ भी from positive कुछ; catches component
  mis-glosses (रात को → "very well", तक → "not", आता → "I") that are plainly wrong in Hindi.
- **Calibrated restraint**: declined to flag natural positive Hindi (किसी और), legitimate dual glosses,
  and — importantly — scoped naturalness/content-quality defects (broken syntax, "to speak mistakes",
  doubled मैं) OUT of the answerability check instead of inflating counts.

## What it found (Hindi, seeds 1–150)

| category | count | the story |
|---|--:|---|
| gloss_rule_violation | 21 | **component-fragment mis-glosses** — a bare component carries English belonging to an adjacent component (रात को→"very well", तक→"not", साथ→"at the time", the S98–99 "should" cluster). Unanswerable in isolation. |
| vocab_uncontrolled | 12 | mostly **चाहिए ('need/should') leaking un-introduced 8×** (seeds 51–75) — 'need' was taught only as ज़रूरत है; plus scattered slips (S33 यह 'this' before its S49 debut, अब vs taught अभी). |
| npi_violation | 4 | **NPI कुछ भी used positively as "something"** where कुछ is correct. |
| machinery_unlicensed | 0 | clean. |

## Three calibration fixes before scaling (the pilot's real payoff)

1. **Codify the NPI-licensing rule in the brief** — NPI items (कुछ भी/कोई/…) are permitted under licensing
   operators (negation, questions, 'want'/free-choice), a violation only in positive declaratives. The
   agent drifted on कुछ भी between batches (NPI in 1–25, allowed-under-'want' in 51–75); writing the rule
   makes it uniform and prevents per-language drift.
2. **Classify the unclassified function words** — चाहिए leaked 8× purely because the Hindi brief left it
   unclassified (it self-flagged this). Before the full run, an agent audits each of the 7 briefs for
   high-frequency function words not yet in freeClass/constructions and classifies them.
3. **Make `high_findings` + severity carry every recurring issue** (not just the 1–3 worst) so the gate can
   threshold on structured output, not prose notes. Add a thin **content-quality side-channel** for the
   naturalness/authoring defects the agent correctly keeps out of scope (they're real, just a different lane).

## Scale plan (gated on Tom's go)

Corrected: the courses are built only to **seed 300** (not 668 — that's the canonical list). So full =
**7 India briefs × 12 batches = 84 batch agents ≈ ~9–10M tokens** (half the earlier estimate). All 84 batch
files are exported (`scripts/known-side/<course>/`), the 3 calibration fixes are applied to the briefs, and
the scaled workflow is written (`scripts/known-side-scaled.workflow.js`) with fix #3 baked in (every
systematic issue emitted as a severity-tagged finding + a `content_quality` side-channel). One launch away.
CJK briefs (zho/jpn/kor) follow once authored. The 1.1% pilot finding-rate is tractable for triage at scale.

### Calibration applied (2026-06-15)
All 7 India briefs now carry an `npiLicensing` rule (8–10 licensing environments each) and an expanded
free class / construction set from the function-word audit (e.g. Hindi freeClass 20→37, constructions
8→15; चाहिए/सकता/वाला reclassified as machinery, यह/जो/जब/अगर added to free class). Still no regex.
