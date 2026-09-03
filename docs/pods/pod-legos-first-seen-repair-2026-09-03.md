# pod_legos.first_seen_sentence — 7,802 dead pointers repaired, and the leak welded shut

*2026-09-03. Job #157's residue, folded in as part of the pod-slug work.*

## What was wrong

`pod_legos.first_seen_sentence` is a slot key — `<course>:<slug>:<tail>` — and
`tools/pods/pod-switchover.cjs` never carried it. So every course that crossed to
`pod-1` under Tom's ruling of 2026-08-22 left its pod_legos rows naming
`<course>:pod-0:<tail>` ids that no longer existed.

Measured before the repair:

| | rows |
|---|---|
| pod_legos rows with a `first_seen_sentence` | 17,831 |
| naming a live sentence | 5,420 |
| **dangling `:pod-0:` slot keys, 19 courses** | **7,802** |
| dangling but not a slot key at all (a bare integer) | 4,609 |
| dangling with no live target | 0 |

Exactly the 7,802 across 19 of the 22 flipped courses that #157 found.

## Why it was safe to fix

It is **provenance, not plumbing**: nothing joins on the column — no foreign key in
the schema, no query in the code filters or joins on it. A dangling value breaks
nothing today; it just makes the provenance a lie, and it accrues one course at a
time forever.

The remap is **proved, never inferred**. A switchover rewrites only the SLUG segment
of a sentence id — the tail is carried verbatim — so the repair is
`<course>:pod-0:<tail>` → `<course>:pod-1:<tail>`, and the rule refuses to write any
row whose rewritten id does not already exist in `listening_pod_sentences`. All
7,802 remapped cleanly; zero guesses were required.

## What was applied

`node tools/pods/repair-pod-legos-first-seen.cjs --apply` — one transaction, per-row
before-state assertion (`where id = $2 and first_seen_sentence = $3`, abort on any
row that moved under us), and an in-transaction post-check that no slot-key dangler
survives. Every changed row is in
`tools/pods/repair-pod-legos-first-seen-applied-log.json`.

Result: **7,802 rows rewritten, slot-key danglers remaining: 0.**

Per course: hrv 521, gle 498, kor 493, ron 451, jpn 450, ara_eg 450, ara 446,
fra_ca 429, zho 427, fra 411, eus 393, ita 382, spa_mx 382, por_br 370, spa 360,
isl 345, nld 335, por 332, deu 327.

## What was deliberately left alone

The **4,609 bare-integer** values in the same column. Different defect, different
origin, older than this one. Counted and reported by the tool on every run, never
touched.

**Welsh was not involved.** `cym_n_for_eng` and `cym_s_for_eng` hold zero pod_legos
rows, before and after.

## The leak is welded shut

`pod-switchover.cjs` now calls `carryPodLegos()` inside its own transaction — the
same proved-remap rule, shared through `tools/pods/pod-legos-remap.cjs` — on the
forward flip and on the rollback, and reports the count in its final line. So the
next course to cross carries its provenance with it instead of adding to a residue
somebody has to sweep later.

10 unit tests on the pure rule, including the bare-integer case and the
refuse-to-guess case.
