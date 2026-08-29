# The frame layer, persisted — and the seed lab

**The lab is open: <https://watson-1.tail4968cb.ts.net:8461/lab>** (tailnet only, so your phone needs to be on the tailnet). It opens on Spanish seed 600. Your verdicts read back at <https://watson-1.tail4968cb.ts.net:8461/lab/verdicts>.

---

## What the lab shows you

Left: what is in the course today. Right: what a frame-guided generator produced for the same seed. Above each, the two criteria, computed, with the numbers.

| | live today | generated tonight |
|---|---:|---:|
| crosses the double-'d split | **NO** | **YES** |
| pattern diversity | **0.333** | **0.868** |
| distinct matrix frames across 9 phrases | 2 | 7 |
| verdict | FAIL — FRAME and SPLIT floors | PASS — every floor |

The live nine, every one of them `I'd have driven` + a swapped tail. The generated nine:

- if I had driven home — *si hubiera conducido a casa*
- If you had told me, I would have driven — *Si me hubieras dicho, habría conducido*
- I wouldn't have driven home if it had been my choice — *No habría conducido a casa si hubiera sido mi decisión*
- If I had driven safely, I would have been happy — *Si hubiera conducido de manera segura, habría estado encantado*
- I wouldn't have driven yesterday if you hadn't told me — *No habría conducido ayer si no me hubieras dicho*

…and four more. Both halves of the split, in several shapes, with the if-clause fronted as well as trailing. That is the difference the metric is measuring.

**Nothing was written to the course.** The lab is read-only against every content table; the seed itself is rendered read-only and labelled immutable on screen. The only thing that persists is your verdict.

---

## The four artefacts

All in `docs/frame-layer/` on main, each a human read plus a JSON companion a builder can consume.

1. **The English pattern inventory** — 31 frames mined from the 668-seed known side, ranked by attestation, every attesting seed number listed. Top of the ranking: want-chains 125, questions 111, relative clauses 72, say/tell 69, can/could 68. The ranking *is* the "most helpful patterns soonest" ordering the 2009 authors already encoded.
2. **The per-pair mapping table** — every frame against what the target does with it, in your four classes. spa_for_eng in full: **18 SPLIT, 7 DETERMINISTIC, 3 ERASURE, 2 INVERSION**, one pattern unattested. deu/zho/jpn populated where an example was cheap and marked NOT YET EXTRACTED everywhere else, which is a gap, not a guess.
3. **The Spanish structural splits** — 12 of them, each with its trigger and its attesting minimal pair, and every line of example text pulled live at build time rather than transcribed. **All 28 seeds you and Fable cited survived contact with the live rows.**
4. **Frame-ZUT and the metric** — the rule written so a machine can run it, plus the pattern-diversity metric implemented and working.

## Things worth your eye

- **I could not reproduce "155 questions".** I measure 111 seeds with a question mark; even counting the ten question-shaped seeds without one, 121. Every other headline number came out close: want-chains 114→125, It's-adj 45→56, counterfactual 12→16, what's-it-like 4→5. My numbers are in the artefacts with the seed lists behind them, so they are checkable.
- **The canonical known side is nearly, not exactly, one seed set.** Measured: deu differs from spa on 4 of 668 known sides, jpn on 3, **zho on 49** — a real divergent block in the 300s. A builder must read the known side of the pair it is building.
- **"Not one of the nine crossed the split" needs one word of refinement.** Three of the nine do contain `hubieras` — but all three carry it inside the same copied clause, `if you'd told me…`, lifted from the seeds themselves. So the split occurs and is never a contrast. The metric reports both: crossed-weakly yes, crossed no.
- **My first version of the metric passed the bad set.** Matching patterns over the whole phrase scored the tail-swap basket 0.62, because nine identical matrix clauses carried nine different tails and the tails lit up other frames. Measuring frames on the **matrix clause** is what makes it discriminate. That's a specification decision I made and marked as mine.
- **One taste call for you:** the generator writes `I would have driven` where the course drills `I'd have driven`. Both map to `habría conducido`, so ZUT holds — but the contraction is the thing seed 600 teaches, and I'd want your ear on whether the expanded form is allowed in the known side at all.
- **The seed-15 flag is real, and I re-confirmed it live.** deu renders "I want you to speak with me" as *ich will morgen mit dir Deutsch sprechen* — the embedded subject is gone, the meaning changed; jpn dodges the same way with 〜たい. spa and zho carry it. Fidelity vs naturalisation is your call.

## What to do in the lab

Change the seed in the row at the top and it re-draws from the live database — any course, any seed. A seed with no candidate set shows the one command that makes one. Type or dictate a sentence in the verdict box and press save: it is stored verbatim, never summarised, with the timestamp, the seed, which candidate set was on screen and the build SHA.
