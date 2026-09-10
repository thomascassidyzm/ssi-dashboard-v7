# The Fix Handbook — index

**This index is the only file you read in full.** Match your symptom to a chapter, open that ONE chapter file, and stop. If the chapter turns out to be the wrong one, come back here and take the next match. Do not read the handbook.

The binding rules live in a different, shorter document: **`course-methodology-rules.md`** at the repo root. Read that one whole, every time, before you touch anything. This handbook does not restate it; it tells you how the rules get applied to the problem in front of you.

There is a third document, and **you do not read it as part of a fix**: **`docs/decision-log/`** is the archive — every decision, dated, with its reasoning, its evidence and its limits, and what was rejected and why. It exists to be *searched*, and it is what lets these two stay short. When a rule here is too terse to convince you, or when you are about to escalate under **H3**, grep `docs/decision-log/INDEX.md` and open one entry.

---

## THREE RULES OF THE HANDBOOK ITSELF

**H1 — A chapter is a pattern with evidence, not a decree.** Every chapter earns its place by carrying real fixes that took the shape it describes. If a chapter's procedure contradicts `course-methodology-rules.md`, the rules document wins and the chapter is wrong — say so in your report.

**A chapter keeps the PATTERN and one line of evidence per case. The specifics live in the decision log.** Which four dictionaries, which 41 rows, which z-score, which six gates — those are archive, and a chapter that grows them back is drifting toward the thing this split was done to fix. Every worked case here ends with a `[DL-…]` citation; follow it when the one line is not enough.

**H2 — The worked examples are cross-language on purpose. Take the SHAPE, not the grammar.** An Irish case sits in a chapter because the *problem* had that shape, not because you are fixing Irish. A Japanese fixer reading the Irish case in "a LEGO is deadlocked" should take the deadlock, the test that proved it, and the order of operations — and none of the Irish. Never carry a language's specific answer into another language: that is a hard rule (`course-methodology-rules.md`, "every pair gets its own rule layer"). Language-specific answers live in `lang/`, and you read `lang/<code>.md` only for the language you are actually in.

**H3 — WHEN NOTHING HERE FITS, YOU ESCALATE TO KAI WITH A PROPOSED ANSWER. NEVER A BLANK QUESTION.**

This is Kai's instruction and it is a rule of this handbook, not a courtesy:

> "And if nothing's available, that's when you come back to me to ask for direction — still with a suggestion, based on past fixes!" — Kai, 2026-09-10

So a no-match escalation has a fixed shape, and an escalation missing any of these five parts is incomplete:

1. **The symptom, in the words you arrived with**, and the rows it sits on — course, seed, LEGO, phrase ids. Counts with a denominator.
2. **Which chapters you tried and why each was wrong.** Name them. This is what tells Kai whether the gap is a missing chapter or a bad index entry, and it is what the next worker searches on.
3. **THE NEAREST ANALOGOUS PAST FIX.** Search this handbook, then **grep `docs/decision-log/INDEX.md`** — this is what the log is for and this is the moment you use it — then the estate: `/home/tomcassidy/command-surface/tools/estate-search "<your symptom>"`. Name the case or the `DL-…` entry you are reasoning from and say in one sentence why its shape is close and in one sentence where it differs. **Read that entry's REJECTED, AND WHY field before you propose anything**; the fastest way to waste Kai's time is to re-make a recommendation he has already overturned.
4. **YOUR PROPOSED ANSWER, stated as a decision he can say yes or no to** — the actual edit, on the actual rows, with the blast radius you have already measured. Not "should we X or Y" with no lean. If you genuinely have two, rank them and say which you would do.
5. **Your confidence, and what would change it.** Name the one thing you could not verify.

**Do not sit on the work while you wait.** Do everything the answer does not depend on, and say in the escalation what is already done.

**And when Kai rules, YOU write the log entry.** The job that obtains a ruling files it: a new `docs/decision-log/` entry with his verbatim words, the evidence and its limits, and what he rejected — plus the rule or chapter it produced, if any. A ruling that lands nowhere is a ruling that gets re-litigated, and a ruling filed without its rejected alternatives loses the half that transfers furthest.

---

## SYMPTOM INDEX

Grep this section for the words you are holding. Each chapter's symptom lines are written as the sentences workers actually arrive with.

| # | Chapter | You are here if you are saying… |
|---|---|---|
| **HB-01** | [A detector fired and the hits are mostly false](HB-01-detector-hits-are-mostly-false.md) | "the tool reports N defects" · "this course is the worst on the estate" · "the check came back clean" · "it flagged 100% of them" · "zero violations" · "the count looks too big / too round" · "is this a real defect population?" |
| **HB-02** | one-known-word-two-target-words | "the same English gives two different targets" · "ZUT collision" · "one word, two senses" · "which sense does the learner pick?" · "do I merge these LEGOs?" |
| **HB-03** | a-lego-is-the-wrong-size-or-deadlocked | "this LEGO is too big / too small" · "it can't be glossed to match the seed" · "two LEGOs block each other" · "I want to add a tag or a slash" · "it only ever appears in one sentence" |
| **HB-04** | a-phrase-uses-something-untaught | "untaught vocabulary" · "the learner hasn't met this word yet" · "forward reference" · "it's an inflection of a taught word — does that count?" · "the known side uses a word we never gave them" |
| **HB-05** | the-audio-says-something-the-text-does-not | "the clip plays the wrong sentence" · "presentation drift" · "the voice says X, the row says Y" · "two voices disagree" · "is the recording wrong or the writing wrong?" |
| **HB-06** | a-text-edit-is-about-to-break-audio | "I need to change this text but it has a clip" · "the audio link went null" · "do I re-render first?" · "punctuation change" · "make before break" |
| **HB-07** | the-seed-itself-is-the-defect | "every phrase under this seed is broken" · "the seed uses a register it never introduced" · "should I rewrite the seed?" · "should I move this pattern later?" · "should I rebuild this stretch?" |
| **HB-08** | a-human-reviewer-flag-does-not-survive-checking | "Deborah says…" · "the proofread flag says…" · "the reviewer only saw the known side" · "the flag is right about the row but wrong about the reason" · "this is Kai's own past decision" |
| **HB-09** | practice-coverage-is-thin-or-a-bucket-is-empty | "this LEGO has no USE phrases" · "empty practice basket" · "below the phrase count" · "this chunk is taught once and never seen again" · "can I promote a USE to a BUILD?" |
| **HB-10** | a-particle-or-function-word-needs-introducing | "this particle has no meaning on its own" · "how do I teach a case marker?" · "it's a grammatical feature, not a word" · "it has three different uses" |
| **HB-11** | the-known-side-reads-badly-or-needs-editing | "the English is unnatural" · "there's a parenthetical tag" · "can I edit the known side?" · "the prompt asks for something the course never taught" · "the prompt leaks the answer" |
| **HB-12** | a-one-off-fix-wants-to-become-a-sweep | "this pattern is everywhere" · "the brief says replace N instances" · "can I apply this estate-wide?" · "find and replace" · "it's the same rule in every course, surely" |
| **HB-13** | it-is-deliberate-design-not-a-defect | "Welsh flags on this check" · "this ambiguity looks wrong but reads intentional" · "unlikely to come up" · "the overlap between these LEGOs" · "components fail the check" |
| **HB-14** | a-course-reports-clean-but-is-not-ready | "coverage is 97%" · "can we release this?" · "audio is missing on some slots" · "the build reported success" · "this is a human-voice course" |
| **HB-15** | a-per-course-convention-has-to-be-decided | "formal or informal?" · "pro-drop?" · "which spelling standard?" · "gendered speaker" · "this minority language has no agreed orthography" |
| **HB-16** | the-fix-is-right-but-the-blast-radius-is-not-mapped | "what else does this break?" · "who else uses this string?" · "the shared English seed corpus" · "does this seed belong to other courses?" · "do I need to unapprove?" |

### Language appendices — read ONLY your own

`lang/` holds only the per-language answers a fixer must **apply** — the operative forms and grammar rules a chapter deliberately refuses to state: `cym.md` (Welsh), `gle.md` (Irish — the preferred `iarracht` shapes and the genitive rule), `fin.md`, `ita.md`, `ara.md`, `sin.md`, `zho.md`, `cat.md`. **The attestations behind them are not here; they are in the decision log.** A language appendix is never evidence for another language.

---

## HOW THIS IS LOADED, AND WHY IT IS SEPARATE FILES

One chapter per file, flat, in this directory, with the index above as the only manifest. A worker `cat`s `00-index.md` (small), then `cat`s exactly one chapter. That is the whole mechanism, and it is deliberately not a JSON manifest or a single file with anchors: **the load unit has to equal the read unit.** A single large file with heading anchors still costs the whole file to read, which is the defect being fixed; and a manifest a worker must parse adds a step that a worker under load will skip in favour of reading the file. Grepping a markdown table of symptom sentences is something every worker already does correctly without being told.
