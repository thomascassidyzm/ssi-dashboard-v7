
What the dry run cannot show, and what Popty has no operation for:

- **A dry run of one seed does not see the seeds before it.** Each request was checked against the live course, not against the course as the earlier requests would leave it. The plan's order (nothing used before it is taught) is checked by the plan's own tools (`build.py`: 0 uncovered words, 0 LEGOs over 8 syllables), not by Popty.
- **No operation re-orders LEGOs inside a seed.** `lego.update` cannot set the position, and a new LEGO takes the next free number, so it lands last. In 75 seeds the teaching order in Part 1 differs from the order Popty would store. This is a gap, not something I worked round. The two ways through are a re-order operation (Tom's to build) or removing and re-adding a seed's LEGOs in order at apply time.
- **Seed-level re-cuts through `POST /api/seed/complete` or the edit-cascade route were not dry-run**, because neither offers a dry run that I could find, and the plan does not need them: every change is expressed as edit-batch operations. If Kai prefers the 23 rewritten seeds in 1 to 300 to be rebuilt through the builder instead, that waits on open question 4.
- **Introductions.** The draft has no introduction rows, so there is nothing to keep in step yet; they are written at release (Part 5).
- **Word tiles.** edit-batch does not recompute a phrase's stored word tiles. After an apply, `POST /api/admin/recompute-decompositions` is needed, and it only refreshes a phrase whose English changed (known gap from #403).
- **Not in the operations at all**: seed 50 ("we don't want", open question 2); the 36 "to relax" phrases about other people (conflict 2); fuller baskets for the 129 thin pieces.
