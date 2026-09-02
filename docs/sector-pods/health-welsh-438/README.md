# The Health walk in Welsh — north (`cym_n`) pod content, authored source

These 23 files are the reproducible source of the 438 Welsh lines live in
`canonical_pod_scenarios`. **The `cy` field of each turn is the artefact.** It is a whole
target-language turn, and it is what `tools/pods/apply-target-overlay.cjs` writes.

## Two fields in here are SUPERSEDED. Do not read them as cuts.

`chunks` and `south` were written under a frame Tom corrected on 2026-09-02, and they are the
wrong object:

- **`chunks`** — 1,278 chunk mappings. **Pod content does not cut.** Cuts exist to make
  *production* deterministic, and a listening walk does not produce. Nothing downstream may treat
  a `chunks` entry as a LEGO, a seed, or a cut of any kind. They are retained as a record of how
  the whole lines were reasoned about while being written, and for no other purpose.
  (Pod-seeds — the separate helix thread for the sector — *do* cut, but at the SENTENCE, and they
  are a different artefact that does not exist yet and is not derivable from this file.)
- **`south`** and **`southLine`** — 832 annotation entries across 385 turns, plus 21 whole
  southern lines. **North and south Welsh are two distinct courses with their own pods**, not one
  course with a variant column. A per-row southern annotation collapses two pairs into one
  artefact. **No southern text was ever written to a database row** — this material lived only in
  these files and in the overlay document. It is retained because it is a real, usable head start
  on the south course, not because it belongs here.

## The grain rule that governs all of it

Everything is cut to the smallest grain at which known→target stays deterministic, and no smaller.
Main seeds reach word/phrase because that is where determinism still holds. Pod-seeds stop at the
sentence because below it conversational material stops being deterministic. Pod content does not
cut at all, because it does not produce. Grain is derived, never looked up.
