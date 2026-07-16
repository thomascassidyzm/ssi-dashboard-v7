# Pod-1 move-frame canon — build summary

*2026-07-16. Founder ruling: Option B, the move frame (`pod1-frame-decision-pack.md`).
Canon: `docs/pods/pod-1-english-canonical.md` (committed master markdown, the file
`tools/seed-canonical-pods.cjs` seeds from). Seeded into `canonical_pod_scenarios`
(`pod_slug='pod-1'`) on 2026-07-16, replacing the 196-row situational draft — old rows
backed up to `scripts/pod1-situational-draft-backup-2026-07-16.json` before deletion.
The old markdown draft at `scripts/pod-1-english-canonical.md` is superseded.*

## The slate — 16 scenes, 236 sentences

| # | Scene | Move | Lines | Source |
|---|---|---|---|---|
| 1 | Hello Stranger | openings and re-openings | 15 | fresh |
| 2 | And What About You? | turn-returning, follow-ups | 14 | decision-pack Sample B2, extended |
| 3 | Say That Again | repair — the flagship | 17 | `pod1-scene-say-that-again.md`, verbatim |
| 4 | You're Joking! | big reactions | 16 | converted from old 11 *Holiday Stories* |
| 5 | Tell Me About It | agreeing and commiserating | 15 | fresh; mines old 1's weather ritual |
| 6 | I See What You Mean, But | soft disagreement, conceding | 14 | converted from old 9 *Last Night's Film* |
| 7 | Poor You | sympathy and offers | 15 | converted from old 5 *Under the Weather* |
| 8 | You Look Well | compliments, giving and receiving | 13 | fresh |
| 9 | Go On, Come With Us | inviting and persuading | 15 | fresh |
| 10 | I'd Love To, But | declining and cancelling | 12 | decision-pack Sample B1, verbatim |
| 11 | Shall We Say Half Past? | proposing and adjusting | 15 | fresh; mines old 3's front half |
| 12 | If I Were You | asking for and giving advice | 15 | fresh; echoes old 7's decision-talk |
| 13 | To Be Honest | opinions with hedges | 15 | fresh |
| 14 | Guess What | news both ways, and receiving it | 16 | converted from old 13 *Good News* + bad-news mirror |
| 15 | What's the Word | word-hunting, holding the floor | 15 | fresh |
| 16 | Anyway, I'd Better Go | changing topic, closing warmly | 14 | fresh; bookends scene 1 |

Two light arcs run through the set: Grace's interview (scene 1) pays off as her first
day (scene 16), and the same two voices open and close the pod.

## Converted vs dropped

- **Converted (4)**: old scenes 5, 9, 11, 13 → new 7, 6, 4, 14, near-verbatim with C=12
  seams applied and the move sharpened (old 5's Sam renamed Adam so the name stays
  unique to the repair scene; old 13 compressed to make room for the bad-news half).
- **Mined (3)**: old 1's weather commiseration → new 5; old 3's front half → new 11;
  old 7's decision-talk shape → new 12.
- **Dropped (7)**: old 2 (Weekend), 4 (Family), 6 (New Job), 8 (Photos), 10 (Where I
  Grew Up), 12 (What Are You Learning?), 14 (Catching Up) — the interview-shaped and
  single-appearance-move scenes the stress test flagged. Their best moves (turn-return,
  reacting, encouragement, reunion) are drilled by construction in new 2, 4, 13, 1.

## Repair woven through (stress-test structural fix)

Zero-in-196 is fixed structurally, not quarantined in scene 3: misheard name (1.12),
say-that-again on a fact (4.9), which-place confirm-check (11.8), do-you-mean checks
(3.13, 15.6, 15.10), speaker slows down and asking is normalised (3.16–17), plus
self-repair word-hunting throughout scene 15.

## Verification

`node tools/audit-canon-ellipsis.cjs docs/pods/pod-1-english-canonical.md eng 12`
(the file-mode S-LEGO audit added for this build; English counter added to
`tools/lib/syllable-counters.cjs` with fixtures):

- 236 rows · **506 S-LEGO pieces · 100% fit C=12** · max piece = 12 syllables
- **0 forced splits** — every '…' (40, U+2026) sits at an intention/finite-clause
  boundary per §9a/§9b; no mid-clause seam was needed anywhere
- 0 parentheses, 0 ASCII '...', 0 digits in dialogue

Post-seed DB check: 236 rows, 16 scenes, 40 rows carrying '…'.

## Not done here (by design)

No translations to other lang-pairs, no audio rendering or audio-pass queueing — both
fan out only after founder review. The hrv pod-1 draft (180 rows against the old canon)
keeps only what maps to the four converted scenes; the translation pass regenerates the
rest via `POST /api/admin/pods/generate`.

## Taste-check first

1. **Scene 4, You're Joking!** — the riskiest conversion: old *Holiday Stories* re-cut
   for reaction density; judge whether it still breathes as an anecdote.
2. **Scene 15, What's the Word** — the most formally unusual scene (authored ellipses
   as genuine floor-holding, spoken letter "B", the chihuahua run); the register bet.
3. **Scene 1 → 16 pair** — the fresh open/close bookend; if these two land, the fresh
   register matches the converted scenes.
