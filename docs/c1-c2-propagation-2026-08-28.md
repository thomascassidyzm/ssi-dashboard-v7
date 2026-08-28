# C1 and C2 propagated — the ruled position now sits in the text agents read

*2026-08-28. Branch `docs/propagate-c1-c2-2026-08-28`, pushed, not merged. Kai owns this doctrine; nothing lands until he has seen it.*

Two rulings Kai had already made were still contradicted by live files, including the prompt text a build agent reads at the moment it writes a phrase. That is the mechanism behind "compliant but dead" output like *"a few friends currently drink coffee"*: the agent was being told, at generation time, that stilted is correct and that a USE phrase must be a full sentence whatever the cost.

**C1 (Kai, 2026-08-17)** — full phrases are PREFERRED for USE but NOT a hard rule; a shorter phrase passes if it is clear, unambiguous for the remainder of the course, longish, and standalone-sayable ("something you could say on its own in a conversation"). Non-full USE phrases need *more careful checking*, not prohibition.

**C2 (Kai, 2026-08-06)** — the known side stays a controlled language, but controlled does not mean stilted: grammatical correctness is HARD, naturalness near-hard, and a ZUT-driven compromise is a rare exception justified case by case, *not a standing licence*.

## Count against the canon

The canon said ten live locations each. **The true figure is 24 corrected locations across 21 files** — 14 for C1, 10 for C2. The canon's ten were the survey's headline list; the survey itself carried an "Also:" tail, and I found three further live sites it had not listed at all: `services/shared/spawn-course-builder.cjs` (the brief handed to a spawned build agent — five separate passages), `services/briefs/build-team-creator.cjs` ("USE = complete, deployable thoughts… Never fragments") and `.claude/commands/phrase-monitor.md`. More, not fewer, and the extras were on the agent path.

## The build-agent prompts — done first, and what they now say

| Where | Now says |
|---|---|
| `services/course-builder/lib/validation.cjs` (METHODOLOGY_HINTS — injected on every rejection) | USE: "full sentences preferred, NOT required — a shorter USE passes if it is clear, unambiguous for the remainder of the course, longish, and standalone-sayable (Kai's ruling, 2026-08-17)… need more careful checking, not prohibition" |
| `services/course-builder/lib/build-escalation.cjs` (live LLM prompt for BUILD phrases) | "The known side tiles from known glosses AND must be grammatically correct and read naturally — a stilted prompt accepted for ZUT reasons is a rare per-case exception, never a standing licence (Kai, 2026-08-06)." |
| `services/course-builder/routes/course-data.cjs` (the resume payload an agent reads after a compaction — 3 passages) | USE: full sentences preferred but not required; standalone-sayable and unambiguous for the rest of the course is the test |
| `services/shared/spawn-course-builder.cjs` (spawned build agent's brief — 5 passages) | USE defined as standalone-sayable, full sentences preferred; the worked example's "(no complete sentences possible yet)" placeholders reworded to match |
| `services/briefs/build-team-creator.cjs` | "A full sentence is preferred but not required… a shorter USE needs more careful checking, not prohibition" |
| `services/briefs/backfill-phrases.cjs` | target_text must read naturally and be grammatically correct; full sentence preferred, not required |
| `services/course-builder/routes/v2.cjs` (phrase sub-agent prompt) | "USE (8+): natural, standalone-sayable phrases — full sentences preferred but not required" |
| `services/phases/phase1-translation/PROMPT.md` | consistency still outranks native variety, "but only within the bar: every line must still be grammatically correct and must not read weird, especially on the known side" |

No validator logic, no check thresholds and no pass/fail behaviour was touched. `node --check` passes on all seven edited `.cjs` files; the diff in those files is string and comment lines only.

## Doctrine, skills and glossary

- **`ralph-methodology.md`** — both origins. L49's "slightly stilted but tileable English is **correct**" is replaced by "**Controlled does not mean stilted**", with Kai's words quoted and the *rationale rewritten*: the answer to unlicensed machinery is a different well-formed prompt, not an awkward one. The "⚠️ CRITICAL … NEVER acceptable" USE passage, the syllable table's "Complete Sentence? Yes (required)" column, the summary line and the 2026-01-26 lesson (retitled "USE Phrases Must Stand On Their Own — *superseded in part*") all now state the standalone-sayable test. A one-line note records what the passage used to say and who overruled it, so the next reader is not confused by an older copy.
- **Skills** — `calibrate.md` (3), `checkpoint-qa.md` (3, including the rationale for the auto-halting Gate 2), `eng-for-jpn-build.md` (2), `course-resume.md`, `phrase-monitor.md` (with an explicit "do not flag one merely for being short"), `ssi-phrase-variety.md`, `ssi-translation-methodology.md` ("that sounds a bit stiff — that's okay" replaced by Kai's bar).
- **`tools/explainer/rulings/docs/glossary.md`** — both entries ("Fragments are never acceptable as USE" and "slightly stilted but tileable prompts are correct").
- **Retired docs tree** — `fix-agent-rules.md` in two places, including item 4, the "**Practical reading: tileability is the hard constraint and naturalness is the tie-breaker**" passage that the survey called the most dangerous line in the estate. It is now headed "**RULED**", the author's reconciliation is explicitly withdrawn, and Kai's ruling is quoted in its place. Also its source-index citation of ralph, and `course-optimization/HANDOFF-kai-eng-for-x.md`.
- **The canon** — C1 and C2 are out of CLASHES, retired in the C0/C23 style, with a note naming every corrected location. The ruled entries were already present as **P7** and **K9** with all five fields; their "⚠ still live in ten places" pointers are replaced by the propagation record, and K9 gained two fields' worth of detail (the bar applies to any known language, not only English; if a tiling prompt reads badly, rewrite the prompt or redraw the LEGO).

## Left alone deliberately — and why

- **Dated forensic reports that *quote* the old wording as evidence** — `build-phrase-padding-2026-08-06.md` and `second-opinion-spa-padding-2026-08-06.md` quote the old validator hint as part of a diagnosis. Rewriting them would falsify the record. `a135-jpn-paren-kor-2026-08-17/kor-39-report.md` states the overruled rail as a *rail applied that day*, so it got a bracketed correction note rather than a rewrite.
- **`.claude/agents/methodology-expert.md:39`** — "Consistency > naturalness **in target language**". The survey listed this under C2, but read in place it is the target-side ZUT-over-naturalness rule, and the line above it already says the known language must be natural. Changing it would be resolving something else. Flagged, untouched.
- **`services/briefs/deprecated/*`** — eight files (decompose, golden-checker, golden-qa, stage-phrases, calibrate…) state the USE absolute. They sit in a directory named `deprecated` and nothing reaches them on the build path. Untouched; say the word and they are five minutes' work.
- **The `apml/` tree and `ssi-course-production.apml`** — several ZUT/naturalness/complete-sentence statements. The survey recommended Kai decide whether apml is in scope for a doctrine repoint at all, since it is a spec layer with its own sync skills. Untouched.

## Gaps, honestly

- **The docs tree moved on `main`.** On `origin/main` the whole `docs/` tree — including the canon, `fix-agent-rules.md` and `house-fix-style-2026-08-06.md` — was retired to `archive/docs-retired-2026-08-24/` on 2026-08-24. The working checkout I was handed sits on a branch that predates that move, so the paths in the brief resolve to `archive/…` on main. I edited main's layout. **Worth Kai's attention on its own: the methodology canon currently lives in a directory called "retired".**
- **`docs/house-fix-style-2026-08-06.md`** is one of only two places recording the *winning* side of C2. It needed no correction, so it is untouched.
- **Verification is grep-based**, proportional to a text change: after the edits, no live file states either overruled position; the only surviving matches are the corrected passages themselves and their "this used to say…" notes. No test suite was run, and none was warranted — nothing executable changed.
