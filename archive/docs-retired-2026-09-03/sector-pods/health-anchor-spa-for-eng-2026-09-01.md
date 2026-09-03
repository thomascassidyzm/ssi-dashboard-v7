# Health-general anchor census — spa_for_eng (2026-09-01)

Read-only census. Measures Appendix A ("the assumed-ownership inventory") coverage in
`spa_for_eng`'s `course_legos` + `course_practice_phrases` (component rows), to turn the
canonical seed set's functional anchor definition into a concrete `core_anchor_lego_id`
recommendation for this pair. No DB writes were made. Script:
`tools/sector-pods/health-anchor-census-spa-for-eng.cjs`.

Source doc: `docs/sector-pods/health-general-seed-set-2026-08-31.md` (origin/main), §2 ("The
core anchor — chosen") and Appendix A ("the assumed-ownership inventory (the anchor's binding
contract)").

## Method

- **Inventory**: Appendix A's four "core …" string groups plus the scene-0 (W1201–W1204)
  citations, transcribed mechanically from the source doc into the script. 170 entries after
  de-duplication (two strings — "before we start", "of course" — are cited twice in the source
  and counted once). 169 are literal, matchable strings; one ("can you … for me") contains an
  ellipsis placeholder and cannot be matched verbatim, so it is reported separately rather than
  silently scored as unowned.
- **Ownership rule**: whole-chunk match only. A chunk is owned at seed N if some
  `course_legos.known_text` or `course_practice_phrases.known_text` (phrase_role='component')
  row in spa_for_eng, at seed_number ≤ N, equals the Appendix A string after normalising both
  sides (lowercase, trim, strip bookend punctuation/quotes, collapse whitespace). Substring
  containment was deliberately NOT used — "and" inside "and you", or "look" inside "looking
  for", is not ownership of the chunk "look".
- Both `course_legos` (type A/M) and `course_practice_phrases` component rows were searched,
  since a component row's target_text is a literal tiling slice and its known_text is the
  matching literal gloss — either can carry an Appendix A chunk.

## 1. Coverage curve

Cumulative fraction of the 169 literal Appendix A entries owned by end of seed N:

| Checkpoint | Owned | Total | % |
|---|---|---|---|
| seed 1 | 1 | 169 | 0.6% |
| seed 2 | 1 | 169 | 0.6% |
| seed 3 | 1 | 169 | 0.6% |
| seed 5 | 1 | 169 | 0.6% |
| seed 8 | 2 | 169 | 1.2% |
| seed 13 | 5 | 169 | 3.0% |
| seed 21 | 9 | 169 | 5.3% |
| seed 34 | 13 | 169 | 7.7% |
| seed 55 | 17 | 169 | 10.1% |
| seed 89 | 20 | 169 | 11.8% |
| seed 144 | 28 | 169 | 16.6% |
| end of course (seed 668) | 44 | 169 | 26.0% |

**The curve never gets steep.** Coverage grows almost linearly and slowly across the whole
668-seed course; there is no "knee" where waiting a little buys a lot. Even the full 668-seed
course only ever owns 44/169 (26.0%) of the inventory as whole-chunk matches — the other
125/169 (74.0%) are **never** owned anywhere in spa_for_eng, at any seed, under this matching
rule (list in §3). This means the "wait for full Appendix-A coverage" reading of the anchor is
not just late here — it is **unreachable**: no seed number in this course ever gets there.

## 2. Recommended anchor

**Recommend `S0001L01`** (`known_text: "I want"`, the first lego of spa_for_eng).

Reasoning: the canonical anchor definition is scene-0-complete *plus* the earliest base-course
position by which Appendix A is owned (§2 below explains scene 0 does not exist in this pair at
all, so that half of the definition cannot be evaluated literally here). What §1's curve shows
is that there is no efficient later point to lean on instead — coverage is 0.6% at seed 5, still
only 1.2% at seed 8, 3.0% at seed 13; whatever a segment author gains by waiting to seed 20 or
even seed 50 is a handful of extra strings out of 169, bought at the cost of exactly the
immediacy the helix exists to protect. Given the doctrine ("push anchors as early as authoring
allows... a later anchor buys nothing this set needs... delays every learner's entry"), and given
the coverage math shows no early plateau worth waiting for, the earliest lego id in the course is
the defensible choice for spa_for_eng: it costs nothing relative to the alternatives on this
evidence, and it maximises immediacy, which is the stated point of the feature.

This is a recommendation, not a registration decision — that's explicitly out of scope for this
census.

## 3. Shortfall at the recommended anchor

At `S0001L01`, spa_for_eng owns **0/169** of Appendix A (only "now", the sole seed-1 hit, arrives
at `S0001L05`, one lego past the recommended anchor lego). Practically, **all 169 literal
entries are shortfall** at the recommended anchor and must be authored in-segment as
`is_new = true`, plus the 1 non-literal entry.

For completeness, here is the full "never owned anywhere in the 668-seed course" list (125
entries) — these need in-segment authoring regardless of which anchor is picked, since no later
anchor recovers them either:

```
before we start · if we get stuck · if I get properly stuck · if that's all right · stop me ·
I'd rather be stopped · I'll do the same if I lose you · yours it is · no trouble at all ·
another day, then · on my own, mostly · a bit every day for about a year ·
I still get most of it wrong · right — the reason I came · hello · good morning · my name's ·
what's your name · thank you for telling me · don't worry · look · right then · any time ·
not at all · no problem · no trouble · I promise · honestly · remember · hold on · come on ·
careful · anyway · I need to · I've got · let me just · shall I · shall we · can you tell me ·
what would you like · which would you like · can I get you anything · before I go ·
before they come · if that's alright · if that's possible · if you can · if you like ·
if you need anything · if you're not sure · if you're ready · if you forget · if you're tired ·
take your time · no rush · well done · good question · give me a minute ·
it won't take a minute · to be safe · see how you go · that's all · that's it ·
whatever it is · where were we · a hard question · you're alright · you'll be fine ·
you've done nothing wrong · will do you good · how about · half past two · at two · at twelve ·
till eight · this year · after lunch · after tea · after work · in the mornings · later ·
a minute · a second · in an hour · an hour or so · a day or two · every day · three years ·
about a year · from now on · the whole way · at first · at last · straight away · not long now ·
at home · this place · on the left · by the bed · next to the bed · out of the way · the bed ·
the table · the light · the water · the food · the weather · much better · better or worse ·
worse than · the same as · more slowly · a bit more · a little bit · plenty of · only ·
nothing big · safer · a long day · a long way from here · lunch · sleep · a little sleep ·
you can rest · she worries
```

The remaining 44 entries that ARE owned somewhere before end of course (e.g. "now" at
`S0001L05`, "right" at `S0387L01`) are owned too late to be reachable at the recommended early
anchor and so are also part of the practical shortfall at `S0001L01` — the 125/169 list above is
the subset that's shortfall *no matter what anchor is chosen*.

**Shortfall count at the recommended anchor: 169/169 literal entries (100%) + 1 non-literal
entry, all authored in-segment as `is_new = true`.**

## 4. Scene 0 (W1201–W1204) — does it exist in spa_for_eng, or anywhere?

**No. It does not exist as content in spa_for_eng, and it does not exist anywhere in the content
tables under any course code.**

Checked:
- `course_legos`, `course_practice_phrases`, `course_seeds` (all courses): zero rows contain the
  literal strings "W1201", "W1202", "W1203" or "W1204" anywhere in known_text.
- The four scene-0 hallmark quoted strings from Appendix A ("I'd rather be stopped", "no trouble
  at all", "on my own, mostly", "yours it is") were searched against `course_legos.known_text`
  across **every** course code, not just spa_for_eng: zero matches, anywhere.
- The only DB tables matching `%walk%`/`%scene%` are `canonical_pod_walk_steps` (224 rows,
  `pod_slug` values: `learning-flagship`, `method-pod-chapters`, `method-pod-43-scene`) — a
  different, unrelated authoring system (generic chapter/scene walk-graph scaffolding with node
  ids like "N7", not W12xx ids, and no health content). No walk_id or pod_slug there references
  "1201", "health", or "scene 0".

**This is a real gap, not a measurement artefact.** "Scene 0 complete" — the medium-contract
walks W1201–W1204 the source doc says are "authored by job #490" — is referenced only in the
sector-pods design doc; it has not been written into the content tables for spa_for_eng or any
other pair. Whatever "scene-0-complete" is meant to anchor against, it currently anchors against
nothing that exists in this database. The registration decision this feeds needs to know that
before it treats "scene-0-complete" as a resolvable position in spa_for_eng.

## Explicit gaps

- Scene 0 (§4) does not exist anywhere in the DB — the functional anchor definition's first half
  ("scene-0-complete") cannot be evaluated for any pair right now, spa_for_eng included. The
  recommendation in §2 stands on the Appendix-A coverage evidence alone, not on locating a
  scene-0 position, because there is none to locate.
- Matching is whole-chunk-exact against `known_text` as stored; it does not account for
  Appendix A strings that might be taught compositionally across multiple legos (e.g. as two
  separate legos that combine at phrase level) without ever appearing as their own
  `known_text` row. That would be a different, weaker notion of "ownership" than the brief's
  "the course teaches it as a chunk" — flagged here rather than silently loosening the rule.
- "personal names as slot content" (Appendix A, closing item) is not a matchable string and was
  excluded from both the inventory count and the coverage curve.
