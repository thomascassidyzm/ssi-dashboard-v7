# Phrase-quality lane (command-surface standing lane `phrase-quality`, job #415, Tom 2026-10-11)

A continuous two-family sweep of SSi course phrases for grammar, naturalness and seed consistency. **Codex does the labour and Opus reviews it** (ruling r-2026-10-11-codex-astra-works-under-opus-direction). A change is STAGED only when both families agree. Disagreements go to `ARAN-LIST.md`. Nothing in this lane writes the live database: staged edits reach learners only through a later, gated apply that needs Tom's go.

Scope: released and beta courses, never Welsh. Welsh course production is Aran's (r-2026-10-08). Arabic course content is ours.

## Files

| Path | What it is | Regenerates? |
|---|---|---|
| `queue.json` | every in-scope course cut into 20-seed windows, round-robin (`make-queue.cjs`) | yes, `node make-queue.cjs` (re-running keeps ids stable unless a course grows) |
| `RUBRIC.md` | the rubric digest both families judge by | hand-written |
| `export-window.cjs` | read-only export of one window plus its course-wide ZUT collisions | tool |
| `runs/<course>/<from>-<to>.codex.jsonl` | Codex's proposals for that window (labour stage) | **no** — the work product |
| `runs/<course>/<from>-<to>.verdicts.jsonl` | Opus's verdict on every proposal (review stage) | **no** |
| `staged/<course>.jsonl` | proposals both families AGREED on, ready for a gated apply | **no** |
| `ARAN-LIST.md` | disagreements and judgement forks, one line each | **no** |

## Proposal line (`*.codex.jsonl`)
`{"row_id","table":"course_practice_phrases","action":"edit|delete|flag","field":"known_text|target_text|null","before","after","rule":"R1|R2|…|grammar","triage":"a|b|c|d","evidence":"seed text + sibling ids that prove it"}`

## Verdict line (`*.verdicts.jsonl`)
The proposal, plus `"verdict":"AGREE|DISAGREE|AMEND"` and `"reason"`. `AMEND` means Opus agrees a defect exists but not with the fix. It goes to `ARAN-LIST.md`, not to staging, because the two families have not agreed on one change.
