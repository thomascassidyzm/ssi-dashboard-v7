# Pod text approval policy — adopted 2026-08-16 (A-109)

## The ruling

Tom, 2026-08-16, ruling on A-109, verbatim:

> "we're not going to manually read all text for all courses  - that's lunacy - we state an acceptable risk policy: maybe we ask a verifier agent to check all translations for reasonableness  - as distinct from the agent that did the translating - and then we mark text as approved to generate audio"

That is the policy. A human proofread of every line in every course is rejected. Nothing in the estate should be built, or recommended, that depends on one.

## The problem it answers

Pod lines can be machine-written drafts. `listening_pod_sentences.target_text_draft` has marked them since 2026-08-06, and the recording room badges them DRAFT so no recorder is handed drafted words believing they are finished.

The renderer did not care. `POST /generate-pods` queued a line on one test — "does it lack target audio?" — and never asked whether anyone had read the words. On 2026-08-16 that meant **4,852 drafted lines across 42 pods**, of which **128 sat in `spa_for_eng:pod-0-unrecorded`** — the one course whose voices are approved, so the only thing standing between those drafts and audio a learner would hear was somebody remembering to hand-scope every single run.

## What the flag means

`target_text_approved_at IS NOT NULL` means: an independent verifier has judged these words a reasonable rendering of their English, and we are content to spend money turning them into audio.

- Approved is the timestamp, and only the timestamp. There is no companion boolean, so there is nothing for it to disagree with.
- `target_text_approved_by` records who or what approved — `verifier:claude-opus-5`, or a human's name. That column is what makes "the verifier is not the translator" auditable after the fact rather than a claim in a report.
- `target_text_review` holds the verdict in the verifier's own words, plus the English and the target **as they stood at check time**.
- An approval is bound to the words it approved. Editing `target_text` clears the approval in the same update that clears the draft flag.

## What the gate refuses

A pod line's **target** track is renderable only when its words are settled:

> not a draft, **or** the draft is approved

Four consequences, each deliberate:

- **The known (English) track is never gated.** The draft marker is about target text; `known_text` is canonical English that was never drafted. Gating it would block the English side of 4,852 lines for no reason.
- **Bulk and sample alike.** A sample that renders unproofread words is exactly as wrong as a bulk run that does. The sample gate protects money and ears, not content rules.
- **A blocked line is not a failure.** It never enters the work queue, and it is counted, logged, and returned as `blocked_unapproved_target` alongside `generated`/`reused`/`failed`. A render that quietly skips 112 lines is the original disease in a new coat.
- **The estimate is gated too.** `/plan-pods` applies the same predicate, because an estimate that promises clips the render then refuses is a lie about what a run will cost.

One predicate, in one place: `services/pod-text-approval.cjs`. Wired into `/generate-pods`, `/plan-pods`, and `pod-bulk-migrate`'s in-process mode — which is its *default* mode and rebuilds the endpoint's queue, so without it that driver was a full bypass.

## Who the verifier is, and why it must be a different agent

`tools/pods/verify-pod-text.cjs` reads one pod's unapproved drafts and asks a **fresh Claude CLI session** — never the Anthropic SDK — whether each is reasonable. It is given only the English and the drafted target: no drafting rationale, no sibling verdicts, no contact with whatever produced the draft. Judged blind.

The separation is the mechanism, not a nicety. An agent asked to check its own translation is checking its own reasoning, and will agree with itself.

**Provenance gap, stated plainly:** we do not record which model wrote these drafts. `write-pod0-drafts.cjs` applies a JSON file authored elsewhere with no model stamped per row. So independence today is guaranteed by *session* and by *construction*, and only *probably* by model. Closing it means stamping the drafting model at draft time — recommended, not yet done.

### What "reasonable" means

Not a QA pass, not a ZUT audit, not a methodology review, and emphatically not a naturalness contest. One question: is this a reasonable rendering of this English line?

A line is flagged when it is **wrong** — a mistranslation, meaning added or dropped, a register that would embarrass a learner, the wrong language, corrupted characters, an English passthrough, leftover annotation or parentheses (banned outright in learner-facing text). A line is **not** flagged for being phrased differently than the verifier would have chosen. The brief says so in as many words, because a verifier not told this flags half a competent corpus on taste.

## What happens to flagged lines

Nothing is written but the verdict. The line stays unapproved and therefore stays unrenderable — the safe failure direction. Flagged lines are collected into a short list a human can actually read.

**That list is the trade.** Humans read the flagged tail; nobody reads the whole corpus.

## The residual accepted risk

An unflagged-but-wrong line renders, and we accept that.

That is the deal Tom struck and it is worth stating without softening: this policy does not guarantee every rendered line is correct. It guarantees every rendered line has been read by something other than whatever wrote it. In exchange, nobody reads 4,852 lines by hand — which was never going to happen, and whose non-happening was silently blocking the estate.

The risk is bounded by the verifier's discrimination, so that discrimination is worth measuring rather than assuming. On first use it was calibrated against control lines carrying planted defects; see below.

## First application

`spa_for_eng:pod-0-unrecorded`, 2026-08-16: **128 drafts, 128 approved, 0 flagged.**

A zero-flag rate is only meaningful if the verifier can flag. It was calibrated on 8 control lines carrying 5 planted defects — mistranslation, English passthrough, a parenthetical annotation, wrong language, mojibake — and caught **5 of 5**, passing all 3 clean lines with no false positives. The corpus is clean; it was not rubber-stamped.

Also found: **16 of the 128 drafts already had target audio**, rendered before this gate existed. They were never in a work queue built on "no audio yet", so the gate neither catches nor needs to catch them. All 16 were among the 128 the verifier judged, and all 16 came back `ok` — retrospectively cleared, nothing to repair.

## Pointers

- Predicate + tests: `services/pod-text-approval.cjs`, `services/pod-text-approval.test.cjs`
- Verifier: `tools/pods/verify-pod-text.cjs` (dry run by default, `--apply` to write)
- Columns: `database/migrations/20260816_pod_sentence_target_text_approval.sql`
- The draft marker this builds on: `database/migrations/20260806_pod_sentence_target_text_draft.sql`
- The sibling gate on *voices*: `services/pod-voice-approvals.cjs`
