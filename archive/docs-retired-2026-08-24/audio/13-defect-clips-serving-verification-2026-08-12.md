# None of the 13 defective clips reaches a learner

**Verdict: 0 SERVED, 13 ORPHANED, 0 MISLINKED.** Every one of the 13 clips on the listening sampler is linked by a content row that no serving path in the learning app ever plays. Tom's premise challenge is upheld.

The fix is **link repair and row cleanup, not re-rendering.** Re-rendering these 13 would produce 13 new clips that also nobody hears.

And the same test applied to the whole 4,067-slot re-render queue says **99.2% of it is unplayable too**.

---

## What a learner actually hears, and how I checked it

The learner app has exactly three paths that turn a database row into a clip a learner hears. I read all three and drove them, rather than assuming:

| Path | What it is | What it lets through |
|---|---|---|
| `cycles` | the live round-by-round path | phrases with role `build` / `use` / `practice`, on LEGOs that are in the round map |
| `infplay-cycles` | infinite play after the course ends | `use` / `eternal_eligible` only, on `is_new` LEGOs only |
| `bundle` | the offline download | `build` / `use` / `practice` / `eternal_eligible` only |

All three exclude `component` rows outright. A second agent traced the offline/bundle side independently and end-to-end — including the live player's own script generator, which queries Supabase directly rather than through the bundle — and reached the same answer by a different route: a phrase row whose LEGO is not `is_new` is **inert**, never emitted, and not even speculatively downloaded. Its finding is filed as `docs/bundle-orphan-phrase-reachability-2026-08-12.md` in the learning-app repo. The live path is explicit about it in its own comment: *"Component rows never produce a cycle of any kind: components are never introduced (Tom, 2026-08-06). They reach the learner only as visual tiles."* Visual tiles carry text, not audio.

**The method, matching tonight's Welsh check.** I drove the exact read the live endpoint makes — the `get_course_cycles_window` RPC — with the **anon key**, so real RLS applied, then ran the **shipped serving code itself** over the result: `buildLegoCycles`, compiled straight out of the learning-app repo, not a re-implementation.

**Proof the harness is faithful.** I ran it against the *deployed* endpoint on two free-preview rounds where no paywall blocks an HTTP call. The deployed API and my harness returned byte-identical cycles and byte-identical clip ids. (The deployed side adds a `.v2` revision stamp to two ids; my match test tolerates the suffix, and none of the 13 is revised anyway — all 13 are revision 1, and each one's current S3 key is still exactly the file on the sampler page. So the sampler is playing the current bytes of the current row. That part of the sampler was right.)

**Proof the harness can say SERVED.** For each of the nine clips whose round genuinely exists, the same single query emitted **24–31 distinct clips** for that round. The defective clip was present in the raw query payload every time — and emitted into a playable cycle none of them. Same query, same round, same moment: its siblings play, it does not.

---

## The 13, one by one

Two different reasons, both terminal. Note the S3 filename is **not** the database id for 12 of the 13 — the sampler was built from S3 keys. I matched on `s3_key` to find the real rows.

### Reason A — the row is a `component` row (9 clips)

Component rows are per-sentence tiling glosses. No serving path plays them. The round they sit in is alive and plays fine; this row inside it never does.

| # | Clip | Course | The row that links it today | Round | Verdict |
|---|---|---|---|---|---|
| 1 | *ne pourront pas* | fra | `S0446L01C02` component · target2 | round 1021, alive | **ORPHANED** |
| 3 | *trop de temps* | fra | `S0027L02C02` component · target2 | round 84, alive | **ORPHANED** |
| 4 | *j'ai hâte* | fra | `S0029L01C01` component · target2 | round 89, alive | **ORPHANED** |
| 5 | *es macht mir Spaß* | deu | `S0101L01C01` component · target1 | round 234, alive | **ORPHANED** |
| 9 | "are not" | fra | `S0431L01C02` component · known | round 980, alive | **ORPHANED** |
| 10 | "will be able to" | deu | `S0292L01C02` **and** `S0291L02C02` component · known | rounds 569 / 568, alive | **ORPHANED** |
| 11 | "has just started" | deu | `S0228L01C02` component · known | alive | **ORPHANED** |
| 12 | deu presentation, "yellow" | deu | `S0394L02C02` component · presentation | round alive | **ORPHANED** |
| 13 | deu presentation, "his sister" | deu | `S0332L03C02` component · presentation | round alive | **ORPHANED** |

### Reason B — the row is real, but its LEGO has no round (4 clips)

These four sit on genuine `build`, `use` and LEGO rows. They fail for a different reason: the round map is built from `course_legos` **where `is_new = true`**, and all four of these LEGOs are `is_new = false`. No round index, so the live path's query never selects them, infinite play never selects them (it filters `is_new = true`), and the offline script builder never selects them (same filter). I looked for an `is_new = true` twin teaching the same text that might carry a good clip instead — there is none for any of the four.

| # | Clip | Course | The row that links it today | Round | Verdict |
|---|---|---|---|---|---|
| 2 | *j'ai entendu dire que* | fra | `S0509L02` LEGO · target2 **and** `S0509L02B01` build | **no round** (`is_new=false`) | **ORPHANED** |
| 6 | *sie will auch mit euch bleiben* | deu | `S0656L01U03` use · target2 | **no round** (`is_new=false`) | **ORPHANED** |
| 7 | *ich wollte eines von denen* | deu | `S0634L03B02` build · target2 | **no round** (`is_new=false`) | **ORPHANED** |
| 8 | the 22-word deu line | deu | `S0202L03U08` use · target1 | **no round** (`is_new=false`) | **ORPHANED** |

Two of these are USE phrases, so the obvious objection is spaced review. It doesn't rescue them: the review block picks its LEGOs out of the round map, so a LEGO with no round is never a review target either. Same for infinite play, which walks the `is_new` LEGO list directly.

---

## Reason B is a real bug, and it is bigger than these four

`S0202L03` teaches *die Frage* / "the question" with seven USE phrases and four BUILDs behind it. `S0656L01` teaches *euch*. `S0634L03` teaches *denen*. `S0509L02` teaches *j'ai entendu dire que*. All authored, all with audio, none of them ever played, because their LEGO is flagged `is_new = false` and the round map is `is_new = true` only.

Whether those flags are wrong or the content is a genuine duplicate is a content call, not mine. But it is worth a separate look: **it is content that was built and paid for and never reaches anyone.**

---

## The voices — Tom's clone theory, tested

Yes, on the reachable side. The clone `xai_gfzdpspr5fdp` now holds **13,534** English `known` clips in fra and **12,669** in deu, plus ~1,500 and ~1,400 presentation clips.

But the replacement was **not** total, and where it stopped is exactly the story. Look at one round, `fra S0446L01`:

- every `build` and `use` row's known side: **`xai_gfzdpspr5fdp`, rendered 8 Aug**
- the two `component` rows' known side: **`xai_eve`, rendered 3 Aug — untouched**

The same split appears at `S0431L01`, `S0027L02`, `S0029L01`, `S0292L01`, `S0291L02`, `S0101L01`. The Aug 7–8 clone pass re-voiced the rows a learner plays and skipped the rows a learner cannot. Which means **every English-side clip on this list is, by construction, a clip the clone pass correctly declined to replace** — the old voice survives only on rows nothing reaches.

Defect #9 is the sharpest case: "are not" on `xai_eve`, near-silent, sitting on `fra S0431L01C02`. The row directly above it in the same round, the build phrase "they are not", is on the clone and is fine.

So: not one English-side clip that a live learner hears today is off the clone in these rounds. Tom's read of the estate is correct.

---

## The number that matters more than 13

The dequeued 4,067-slot fra/deu re-render queue, run through the same reachability test:

| | slots |
|---|---|
| `component` rows (never played by any path) | **3,420** |
| `build` / `use` / LEGO rows whose LEGO has no round | **603** |
| genuinely on a played row in a live round | **34** |
| | **4,067** |

**99.2% of that queue is audio no learner can reach.** Of the 34 that are reachable, most are the `B01` bare-LEGO build rows, which the live path deliberately drops as a duplicate of the debut — so the truly-played remainder is smaller still.

This also re-frames the sampler's own headline. The "~460 slots carrying a genuine defect, 95% band 272–776" estimate was drawn from a frame of 10,456 "held slots" built the same way as this queue. If that frame is ~99% unplayable rows, then the projection is a projection about **the database, not about the learner's ears**. The defect rate is probably real; the population it describes is mostly not in the course.

That is the classic wrong-unit failure: the check counted rows, and rows are not what a learner hears.

---

## What to do

1. **Do not re-render these 13.** Nothing links them on a played path. New audio changes nothing a learner hears.
2. **Do not re-run the 4,067 queue as scoped.** It stays dequeued. If any part of it runs, it is the ≤34 reachable slots, and those should be re-counted after the bare-LEGO-build exclusion.
3. **Re-scope the defect census to played slots only** — `build`/`use`/LEGO rows whose LEGO is in `course_round_index`, plus the presentation clip of those LEGOs — and re-sample. That number is the one worth acting on, and it is unknown right now.
4. **Raise separately:** the `is_new = false` content with no round. Real authored content, real audio, zero reach.
5. **Row cleanup, if wanted, is a later and separate question.** Nothing here is urgent, because nothing here is audible.

---

## What I did not verify

- I could not drive the deployed HTTP endpoint for the 13 rounds themselves — they are all past seed 19, so the endpoint returns `403 Subscription required` to an unauthenticated caller, and no probe credentials are stored on this box. I closed that gap by proving the harness reproduces the deployed endpoint exactly on two free-preview rounds, and by running the shipped code rather than a re-implementation. It is one step short of a signed-in browser session.
- The live player today uses its own `generateLearningScript` module, not the bundle endpoint; both were traced, and both gate on `is_new` the same way. The bundle-cutover path has no live callers yet at all.
- I did not test the schools or listening-pod surfaces. None of the 13 is linked from `listening_pod_sentences` — I checked every audio column on that table and got no hits.
- Everything above is read-only. Nothing was rendered, nothing was written, no generation was triggered.
