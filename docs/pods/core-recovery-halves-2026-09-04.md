# The six recovery halves — authored and in the rows

*2026-09-04. The six survivability edges with no attested recovery anywhere in the corpus (S2, M1,
M2, M3, M4, M5) now each have one, as rows in `canonical_pod_scenarios` under the slug
`core-recoveries` — 35 rows, six variant flows, every one marked DRAFT-UNREVIEWED. The live
`pod-1` (231 rows) is proven byte-identical before and after: same row count, same sha256, same
`updated_at` on every row. No audio was queued; this job is text only.*

## How this job reshaped against its commission

The commission asked for derivation and rows. The derivation half was largely already done: on
2026-08-31, five of the six recoveries were authored in English in
`docs/pods/core-recoveries-2026-08-31.md` (W1301–W1305), with attachment sites in
`services/shared/metagraph/proposed/core-recovery-attachments-2026-08-31.json` (A1001–A1006).
None of it was in the database. So this job's real work was: **judge** the five rather than
re-derive them (all five held, one small amendment), **test** the claim that the sixth (M3)
cannot attach (it fails — M3 attaches after all, and W1306 was authored here to discharge it),
and **land** all six as rows with apply hygiene. The rows are the part that did not exist
anywhere before this job.

## The six, each in three answers

### 1. `recovery-s2` — the hedge acted on *(6 rows, scene 2)*

- **Which edge:** S2 — acting on a hedge ("maybe three or four miles"). The only corpus-attested
  edge with no recovery: five hedges in the canon, not one ever taken up.
- **Why it discharges it:** the hedge is acted on out loud ("I might get off at the next stop"),
  the actual turns out different, and the recovery is the learner's own line: "you said maybe,
  and maybe was right." The correction arrives as a road sign — ground truth, never a mood — and
  nobody owes an apology because nobody promised. Acting on an answer aloud is a read-back, and
  the read-back is what gives the world its chance to object.
- **Why it attaches there:** g8/g9 is where the hedge is uttered; the learner meets the recovery
  inside the bus ride the hedge was about, while still deciding whether to get off. (A1001 also
  names a second site, scene 14 g133/g134 — left undischarged; the edge needs one recovery, not
  one per site.)
- Carried from W1301 unchanged.

### 2. `recovery-m1` — "I don't know", held with status *(6 rows, scene 3)*

- **Which edge:** M1 — the answer being "I don't know", held with status.
- **Why it discharges it:** the barista's not-knowing names where the answer lives ("today's
  delivery is still in its boxes"), and the learner's survival move is the re-route — from the
  person to the means ("Would you have a look?") — after which the transaction resumes as if the
  loop had never happened. O2's recovery staged transactionally, in a scene the learner meets in
  week one.
- **Why it attaches there:** g14–g16 is the canon's one stored branch (the crisps question
  forking into yes and no); this is the third arm on that same fork — not yes, not no, but
  not-knowing. The learner is mid-order, coffee already being made: still in the encounter.
- Carried from W1302 unchanged.

### 3. `recovery-m5` — the counterbid over when *(6 rows, scene 4)*

- **Which edge:** M5 — the haggle, your number countered.
- **Why it discharges it:** the canon already walked the haggle's first two positions without
  knowing it ("tomorrow" is a number on the table, "Saturday" its counterbid). The recovery adds
  the counter-counter — earned by a real constraint, "I'm away all afternoon" — and the
  settlement formula delivered whole: take the overlap, seal it with "then", add the precision
  that makes an agreement an arrangement. The learner accepts by reading the precision back. O9's
  third position is Saturday morning. The price-haggle is explicitly not attached.
- **Why it attaches there:** g21/g22 is the negotiation itself; the recovery arrives inside it,
  and the friend's last line honours the constraint the learner declared in her opening turn.
- Carried from W1303 unchanged.

### 4. `recovery-m3` — the challenge mid-story *(7 rows, scene 5)* — **the revised verdict**

- **Which edge:** M3 — a sceptical challenge landing mid-story. A1004 declared this one
  non-attachable: "CORE never gives the learner a story turn longer than one sentence; a
  mid-story challenge needs a story, and authoring one changes a scene rather than continuing it."
- **The test:** the factual premise holds — I scanned all 231 pod-1 rows and no story turn
  exists anywhere. But the conclusion fails under variant-flow storage. The canon *does* attest a
  story invitation: g23, "Did you have a long day?" — and a variant flow can author the learner's
  story as a continuation of that invitation while changing zero existing rows, which is exactly
  the same move the already-authored scene-22 flows make (they too replace a canon continuation
  with an authored one). A1004's verdict predates the variant-flow precedent and is stale.
- **Why it discharges it:** Sarah's story of her day is built entirely from the pod's own staged
  events (the bus, the six miles, the café, the Saturday arrangement) — no new world material.
  The neighbour's challenge lands mid-story, on a stated fact: "Six miles? Are you sure?" The
  survival move is concede-and-hold applied to a story detail: validate the scepticism ("I was
  surprised too"), supply the ground ("there's a sign on the road that says six — I saw it
  myself"), keep the fact. The proof of survival is that the story *resumes* — the challenger
  yields gracefully and hands the floor back ("Go on — what happened next?") — and the scene
  closes into its canon mood: tired, good night.
- **Why it attaches there:** g23 is the one place in CORE where somebody asks the learner for a
  story; the challenge can only be met inside the story it lands on.
- W1306, authored in this job. The road sign doing double duty — S2's correction becomes M3's
  evidence — is deliberate: the recovery set coheres as one day.

### 5. `recovery-m2` — the premise audited *(5 rows, scene 22)*

- **Which edge:** M2 — the premise being audited.
- **Why it discharges it:** the learner's opening claim ("I haven't been learning for very
  long") gets a friendly audit — "how long is that, exactly?" — which goes looking for the ground
  the learner was too modest to stand on and hands it back: six months, every day, is more than
  most people ever do. The canon's own compliment ("I can understand you easily") turns from
  kindness into evidence once the numbers are on the table. The close is concede-and-hold, scene
  22's signature: the arithmetic is accepted, the nervousness held anyway.
- **Why it attaches there:** g221 is where the premise is uttered; the audit rides on top of the
  canon's own grant of permission (g222's "Of course, no problem" opens the audit turn), so
  nothing is withheld to make room for the branch.
- Carried from W1304 with **one amendment**: the restaged g221 keeps the canon's
  `[target language]` bracket rather than the walk document's "your language" rendering — these
  are canonical-layer rows and the bracket is what the canon itself stores.

### 6. `recovery-m4` — the disagreement parked *(5 rows, scene 22)*

- **Which edge:** M4 — the disagreement parked rather than resolved.
- **Why it discharges it:** the canon runs its one contradiction round twice and then changes
  the subject, so no disagreement is ever seen to end anywhere in CORE. Here it ends parked: the
  learner locates the disagreement in vantage, not error ("you hear my sentences; I hear all my
  gaps"), and the friend's park restates both positions in the learner's own words and defers
  resolution to evidence neither has yet. What CORE owns: an unresolved disagreement is not a
  rupture — both branches of the parked question prescribe the same next move, more talking.
- **Why it attaches there:** g227/g228 is the disagreement's second round, the exact point where
  the canon walks away; the canon's g229 follows the flow's last line without a seam.
- Carried from W1305 unchanged.

## The findings

- **The g15 claim is stale as a claim about the format.** g15/g16 already store a branch — "No,
  we've only got drinks." and "Yes, would you like the menu?" are two alternative answers to g14,
  sitting flat as consecutive rows in a single flow. The format itself expresses branching fine:
  the health pod stores alternative continuations as `variant_key` flows sharing a scene. What the
  storage cannot mark is that g15/g16 *are* alternatives — pod-1's rows carry no variant keys, so
  the fork is invisible to anything reading the rows. A finding about pod-1's usage, not about
  the format.
- **M3 attaches** (above). A1004 should be revised; the rows record the revision as
  `A1004-revised`.
- **The siting decision, on quoted evidence:** the rows live under a distinct slug
  `core-recoveries`, not as variants on `pod-1`, because `services/pod-dialogue-generator.cjs:114`
  sets `CANONICAL_LIVE_SLUG = 'pod-1'` as the **default** canonical source for every course
  regen, and `loadCanonicalScenes()` (lines 271–275) selects by `pod_slug` alone with **no
  `variant_key` filter** — variant rows on pod-1 would be flexed into 22 courses by the next
  default regen, without the content-change migration protocol. Rows under `core-recoveries` are
  reachable only when that slug is explicitly named as a `canonicalSlug`, and nothing names it.
  Each flow records its attachment (CORE scene + g-numbers) in `scene_number`, `scene_subtitle`,
  `variant_key` and `author_notes`, so the attachment is data, not prose.
- **U1 consistency:** none of the six re-sequences outcome shapes; the floor U1 names —
  surviving a plain no with reason, O1 at position 1 — is not among the six recovery-less edges,
  so it stands discharged independently of this job. No gap opened.
- **Draft marking:** the table has no draft or approval columns (measured by job #394), so every
  row's `author_notes` is prefixed `DRAFT-UNREVIEWED (core recovery halves, 2026-09-04):` —
  greppable as one class. Flagged as a taste call, not blocked on.

## Structure, accounting, verification

- 35 rows: 6+6+6+7+5+5 across `recovery-s2`, `recovery-m1`, `recovery-m5`, `recovery-m3`,
  `recovery-m2`, `recovery-m4`. 9 restaged turns (verbatim quotations of the canon, marked so in
  `author_notes`), 1 part-restage (the g222 grant opening the audit), 25 authored.
- Ids: `core-recoveries:SC{scene}-R{edge}-S{n}`, e.g. `core-recoveries:SC02-RS2-S01`.
- Applied by `tools/pods/apply-core-recovery-rows.cjs` from
  `tools/pods/core-recovery-rows-2026-09-04.json`: dry-run first, then S2 alone as an end-to-end
  probe, then the remaining five. Three gates on every run: restaged rows asserted verbatim
  against the live canon (attachment drift aborts), target ids asserted absent (insert only —
  the script contains no delete and no upsert), and on execute the full pod-1 slug snapshotted
  before and after and required byte-identical.
- Logs: `docs/pods/core-recovery-halves-2026-09-04-{dryrun,applied}-log.json`, one entry per run.
- Reconciliation: live rows under `core-recoveries` = 35; logged rows = 35; ids and text
  identical as sorted sets. pod-1 = 231 rows with sha256
  `1df0d5c26d5c882b084d236779856ce6e065a8ae82472cd0bb7c05358c85f600` — the same value captured in
  the census taken before any write, so the live pod is untouched end to end.
- No audio queued, no pod regenerated, no materialised view refreshed, no existing row modified.
