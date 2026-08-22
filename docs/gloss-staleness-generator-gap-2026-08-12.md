# The gloss-staleness generator: what I closed, and what is still open

2026-08-12. Follows `gloss-mapping-bug-2026-08-12.md`, which diagnosed the defect and
built the content-keyed repair tool. This note is about the *generator* — why the drift
reaccumulates — and it is deliberately narrow: it records one thing landed, one thing
refused, and one thing left for a human call.

## The mechanism, in one paragraph

A phrase's `decomposition` is computed once, at phrase-write time, and stored. Each block
is bound to a lego_id **slot** (`S0006L02`) and carries the gloss that slot held at that
moment. Re-author the LEGO in that slot and the frozen gloss stays put, now labelling a
different word. The player renders those stored `known` strings verbatim, so the wrong
gloss reaches the learner. Edit churn is the driver: the courses that went through the big
content sweeps are the worst affected.

## What already works — and it is more than the last note assumed

`course_legos` carries a trigger `course_legos_bump_course_version`, firing AFTER
INSERT / UPDATE / DELETE, which bumps `courses.version` on exactly the mutations that can
strand a gloss: `known_text`, `target_text`, `seed_number`, `lego_index`, `components`.

So the **invalidation signal already exists and is already automatic**. Nothing needed
building there. There is also an exact precedent for a derived artefact being invalidated
in-database when the text it describes changes: `trg_null_lego_audio_on_text_change`.

Worth correcting one inherited belief: `CLAUDE.md` says the `course_round_index`
materialised view is "refreshed on lego mutations by the dashboard pipeline". It is not.
`tools/refresh-round-index.cjs` says so in its own header — there is no trigger or RPC
keeping it in sync; it is a manual tool. So there was no existing auto-refresh hook to
copy. That is why the fix below is shaped the way it is.

## Landed: the detector no longer hides its own subject

The audit endpoint bucketed phrases as null / stale / clean, with
`stale = decomposition_course_version < courses.version` and `clean = >= version`. For an
**unstamped** row both comparisons evaluate to NULL, hence false, so a phrase that HAS a
decomposition and no stamp fell into no bucket and vanished from the report.

For `eus_for_eng` the three buckets summed to **566 of 6,450 phrases** — the audit was
hiding 5,884 rows, **91% of the course**, and reporting a reassuring small number. Fixed:
unstamped now counts as stale, which is what it means — nothing recorded which course
version produced that decomposition, so it cannot be asserted current. Verified:
null + stale + clean now equals total exactly.

## Refused: widening the backfill to match

The obvious next line — widen the backfill's selection predicate the same way — is a trap,
and it is left unwidened with a comment saying so.

That loop writes with `decomposeText`, not `decomposeAnchored`. `decomposeText` has no
parent LEGO and so cannot restore a salient anchor. Pointing it at the ~435k rows the audit
fix just made visible would overwrite correct anchored decompositions with weaker
unanchored ones, across the whole estate — a regression considerably larger than the drift
it set out to repair.

Widening is safe only once that loop decomposes with `decomposeAnchored`. That needs
`lego_index` added to its select (to resolve the parent LEGO) and the `kind === 'error'`
skip, so a phrase that does not cleanly contain its own LEGO is left alone for human triage
rather than silently flattened — the repair tool already implements both.

## Open: no automatic refresh on LEGO mutation

Detection is now honest. **Refresh is still manual.** Repair today means running
`tools/course-optimization/refresh-stale-phrase-decompositions.cjs`, by hand, after a sweep.

The reason this is not a quick hook: a database trigger cannot recompute a decomposition.
`decomposeAnchored` is JavaScript, and the correct decomposition depends on the course's
whole prior vocabulary. A trigger can only **invalidate**, and each way of invalidating
costs something a human should price:

- **Null the decomposition.** Self-healing and catches ad-hoc SQL sweeps, which is the
  actual generator. But the learner immediately drops to the runtime alignment fallback —
  documented as non-breaking, but weaker than a stored anchored decomposition — and stays
  there until someone runs a backfill. Trades a wrong gloss for a worse-but-right one.
- **Null the version stamp only.** Non-destructive; the row simply shows as stale in the
  now-honest audit. But it repairs nothing on its own, and with 71% of the estate already
  unstamped the marginal signal today is small.
- **Wire the application write paths instead of the database.** Cleaner semantics, but it
  cannot catch the sweeps — those are ad-hoc scripts writing straight to `course_legos`,
  and they are precisely where the churn comes from.

My recommendation is the second plus a scheduled repair run, because it is the only option
with no learner-path downside — but this is a real design call with a live-content
migration attached, not a hook to be pattern-matched into place, so it is Tom's or Kai's.

## Not touched, by instruction

The 521 zipped component arrays (translation-recovery question), the eng_for_X known-side
decomposition convention (methodology call), and the 43 `eus_for_eng` phrases logged
`SKIP_PARENT_UNLOCATABLE` (needs a native-speaker read) are all left exactly as the prior
workers left them.
