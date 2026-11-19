# Rescued from #714·AI's worktree (uncommitted when it was cancelled, 18 Nov) — cs #931·AI, 19 Nov

Copied verbatim, not re-run. #714·AI was extending zho_for_eng past seed 49 (41 LEGOs, seeds 3-69, 505 ops; never dry-run).
Kept apart from `decisions/zho_for_eng.*` because **#741·AI's shard (shard-zho-37-450/) already decided 17 of the 18 LEGOs
in seeds 39-69 independently** — only S0061L01 is decided here alone. Two authors, one LEGO each: before any apply, pick ONE
plan per LEGO (default: #741's shard for 37-450, #714's committed `plans/zho_for_eng.json` for 3-36, and S0061L01 from here).
The committed top-level `plans/zho_for_eng.json` (#714, seeds 3-49) also overlaps #741 on seeds 39-49 (8 LEGOs).

- `decisions-zho_for_eng.{py,json}`, `plans-zho_for_eng.json` — #714's uncommitted versions
- `plan.py.patch` — #714's uncommitted stem() change (`-s` on 4-letter words, `-ss` kept, doubled consonant: putting→put); NOT applied to tools/plan.py
