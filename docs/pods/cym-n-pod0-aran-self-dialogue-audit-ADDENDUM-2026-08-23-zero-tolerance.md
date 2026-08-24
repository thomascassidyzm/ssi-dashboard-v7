# Addendum — zero-tolerance re-read (Tom's ruling, 2026-08-23 17:37Z)

Tom sharpened the standard after the first report: **zero adjacent-turn collisions,
full stop — any line where both sides of an exchange land on one voice is a
defect**, not a number to be minimised. He also named a specific suspicion: that
the self-dialogue arose from over-weighting the "just 2 voices" cast decision.

This addendum re-reports the same, already-complete audit against that bar, and
adds one new structural test run specifically to check his suspicion. Nothing in
§1–2 of the original report changes — the same 45 collisions, same enumeration,
same evidence. What changes is how they're being counted, and one new finding.

## 1. Under zero tolerance: all 45 are defects, none downgraded

The original report split the 45 collisions into "26 real two-way + 6
narrator-insert" on Aran's side and treated the narrator-insert ones as a softer
caveat ("not a second character in the conversation"). **Under Tom's ruling that
distinction doesn't matter — every one of the 45 is a defect, full stop**,
because in every one of them, two adjacent lines with different speakers land on
one voice. Re-stated plainly:

- **45 defects total.** 26 on Aran's voice, 19 on Catrin's.
- 0 is the standard. 45 is the count. There is no smaller "real" number underneath it.

## 2. The new finding: with exactly 2 voices, zero is not achievable for this
   script, in at least 3 scenes — independent of who is cast to what

Tom's suspicion — that this came from over-committing to "just 2 voices" — is
directly testable, and it's correct. I built the raw conversation-adjacency graph
(same metric as the collision count: which speakers sit next to which speaker,
scene by scene) and ran a bipartite check — can this graph be 2-coloured with
**zero** same-colour edges at all, for *any* assignment of speakers to the two
voices, not just the current one?

**No. The graph is non-bipartite.** It contains genuine odd cycles (triangles) in
three of pod-0's scenes — every scene where 2+ customers are served together:

| Scene | Location | The triangle | Why it can't be 2-coloured to zero |
|---|---|---|---|
| **9** | **Restaurant — Aran's own named scene** | Customer 1, Customer 2, Waiter | Both diners and the waiter directly address each other. Any 2-way split of 3 mutually-conversing people forces at least one same-voice pair. |
| 8 | Bar | Customer 1, Customer 2, Customer 3 | The three customers are mutually adjacent-turn connected — not just each talking to the bartender, but to each other. |
| 7 | Café | Barista, Customer 1, Customer 2 | Same shape: barista plus two customers who also turn-take with each other. |

This is a mathematical fact about the *script's own structure*, not about who got
cast where: a triangle (3 mutually-conversing parties) **cannot** be split into 2
groups with no same-group pair — pigeonhole forces two of the three into the same
voice, whichever two you pick. **No recast of pod-0 as currently written, with
exactly 2 voices, can reach zero.** The best a 2-voice recast can do is minimise
around these unavoidable triangle-collisions (my earlier local-search estimate of
~13 total collisions is the practical floor, not the true zero Tom is now asking
for).

**This is hard evidence for Tom's suspicion.** The "2 voices, cast by speaker,
third character recycles voice 1" rule (settled 2026-08-08) implicitly assumes the
third character never has to *directly address* whoever holds voice 1 — that's
what makes recycling safe. Scenes 7, 8 and 9 break that assumption: the third
(and in scene 8, the third *and* the second) character talks directly to a
same-voice colleague, not just to the shared staff member. The rule was sound for
a hub-and-spoke scene (one staff member, several customers who never address each
other); it silently fails the moment two of those customers turn-take with each
other too — which is exactly what a naturalistic restaurant/bar/café scene does.

## 3. What this means for "should he keep recording"

Unchanged from the first report: pod-0's dialogue is already fully voiced by
Aran from 2026-08-10 (§3 of the original report), so this defect — real,
confirmed, now proven structurally unfixable at 2 voices — does **not** block
what he's reading today. It is a defect in the existing pod-0 build, to be
scheduled as a separate fix, not a reason to pause his current queue.

## 4. What it would actually take to hit zero

Not my call, flagged for Tom, no action taken:

- **A third voice for these three scenes** (or for pod-0 generally) is the only
  way to guarantee zero under the current script — a triangle needs 3 colours.
- **Alternatively, a script edit**: remove the direct customer-to-customer (or
  diner-to-diner) address in scenes 7, 8 and 9, so multiple customers each talk
  only to staff and never to each other. That would flatten the triangles back
  into a hub-and-spoke shape the existing 2-voice/recycle rule already handles
  safely — but it changes the pods' content, which is a production decision, not
  an audit finding.
- Every other scene in pod-0 (all 19 of the remaining 22) *is* 2-colourable to
  zero in isolation — the structural problem is confined to these 3 multi-party
  hospitality scenes, not the whole pod.

## Landing line

Same branch, same status as the original report: commits are on
`docs/aran-catrin-recording-verify-2026-08-23`, pushed to origin, **not merged**
to `main`, **not deployed** — documentation only.
