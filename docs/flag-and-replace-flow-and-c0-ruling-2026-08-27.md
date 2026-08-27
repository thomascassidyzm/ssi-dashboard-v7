# The flag-and-replace flow: does it exist, and is it safe?

**2026-08-27. Verified against the running code and the live database, not against documents.**

## Short answer

**Yes, it exists, and yes it is safe to point people at — for one of the two cases.**

You can flag a clip and have it replaced, and the replacement never removes the old audio first. The new clip is rendered, checked, and uploaded to a fresh location, and only then does the row swap over to it. If the job dies half way through, the learner keeps hearing the old clip. Nothing goes silent.

**The one thing it does not cover is a clip that is wrong because the *text* changed.** Every flag route re-records or re-renders the *same words*. If the words themselves changed, no flag will fix it, and there is a separate safe procedure for that — now written down.

## What is actually there

There are four separate flagging mechanisms. Only two of them carry any traffic, and calling them all "the flag flow" is how the wrong instruction gets followed.

**1. Flag, then regenerate the flagged clips — the road in daily use.**
Raise a flag from the dashboard; then run the "regenerate flagged" pass. It renders a new take, runs it through a check that the voice actually said the right words, uploads it to a new location, and then points the existing row at it and bumps a version number so nobody's phone serves the old cached audio. The old row is never deleted, and the flag is only cleared once the run reports success. Human recordings are excluded — a person's voice is never overwritten by a machine.
**48,868 flags raised since February, 7,125 in the last thirty days, across 63 courses. 40,885 are still open.**

**2. Propose, preview, accept — the careful version.**
Same idea, but a person hears the old take and the candidate side by side and has to click accept. A failed proposal changes nothing at all. The accept is an in-place swap: same row, new bytes, version bumped, and the superseded file is kept so undoing it costs nothing but a database write.
**1,309 accepted swaps. All of them between 5 and 11 August, on German and Greek only, then it stopped. 773 proposed replacements are still sitting there un-listened-to.**

**3. A newer flag-and-signoff table.** Correctly designed, wired to the manual approval gate — and **it has never held a single row.** Built and dormant. Don't cite it as evidence of anything.

**4. The "this human take needs redoing" flag.** 1,334 lines across two courses. It puts the line back in a recordist's queue without unlinking anything, so the old take keeps playing until a new one is filed. Non-destructive by design.

So: Kai remembered right. It is real, it is used, and it is make-before-break.

## What I changed

**The scan-course instructions.** They told an agent, after any text fix: delete the old audio record, then unlink it, then regenerate. That is the exact shape of the outage that left about 2,000 slots silent for two days in August. It is now rewritten:

- **Never delete the audio row.** Not first, not last. Deleting it also destroys — permanently — that clip's proposed replacements, its QA flags, its human sign-offs, its version history and its measured envelope, and makes an undo impossible. An unlinked row reaches no learner anyway, so there is nothing to gain.
- **The database already does the unlinking for you.** All three content tables now have a trigger that, on a text change, keeps the clip if it still says the right words, otherwise finds another clip in the *same voice* that does, otherwise drops the link — and writes down what it decided and why every single time. 1,783 of those decisions logged in the last ten days. So the hand-written "set the link to null" step in the old instructions is not just unsafe, it is redundant.
- **The correct order** is now spelled out: render the replacement first, verify it five ways before anything points at it, then change the text, then read the link back and check it landed. If you can't render first, change the text anyway and queue the audio — the slot goes quiet, which is honest, because the old clip is saying the wrong thing.
- **And a signpost** to the flag-and-regenerate road for the other case, so nobody reaches for the text procedure when the recording is simply bad.

**The methodology canon.** C0 was the urgent unresolved clash at the top of it. It is now ruled and out of that list: Kai's ruling and the date recorded, the reasoning quoted, the rule strengthened from "delete last" to "don't delete", the two replacement routes written up, the four flag mechanisms mapped so nobody confuses them again, and a new obligation added. One other entry there was factually out of date against the live database and has been corrected with today's date on it. **No other clash was touched.**

## Other copies of the bad instruction

**There is only one, and it is fixed.** A sweep of both repositories — every document, skill, brief and code comment — found the scan-course passage and nothing else telling anyone to delete before a verified replacement exists. Roughly forty-five other hits all turned out to be either the *correct* rule already stated, working code doing it properly, or old incident write-ups quoting the mistake in order to warn about it.

## One thing I found and did not fix

**The audio pipeline itself still does delete-first, in bulk.** When a lesson card's introduction text changes, the generation pass deletes those audio records — up to 200 at a time — and only then re-renders them. Human recordings are protected. But a run that dies in the gap leaves those introductions gone, and the delete takes their history with it, so there is no way back.

This is the very thing the ruling now forbids, sitting in live production code. I have **not** touched it: it is a generation path, changing it needs its own job and its own testing, and this one was investigation and documentation only. It is filed in the canon as a new open item for you, clearly marked as not resolved.

## Gaps

None. The database was reachable, both repositories were in scope, and every claim above was checked against the running code or the live data rather than against a document.
