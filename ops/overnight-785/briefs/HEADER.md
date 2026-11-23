# PURPOSE / PRICE (from the #785·AK orchestrator, Kai's overnight run 23→24 Nov)
- Feeds live SSi course content learners use. Every apply writes the ONE shared SSi DB through Popty; every render spends real
  Cartesia money via Popty's /api/audio/render. Kai approved the run 23 Nov 11:02Z ("Yes on tonight's run"); the item list is
  #779·AK's verified menu https://watson-1.tail4968cb.ts.net:10000/d/6f2990a9 — settled by Kai's Y, do not re-open the list.
- Read by Kai tomorrow (Tue 24 Nov) via his Watson; he works Mon-Thu, so anything HELD needs a one-word answer tomorrow.
- Failure: night Cartesia > budget; >3 DB writers or a write while Popty's load gate is not green; forcing a row whose live
  state no longer matches the plan; real work dying as a background task; touching spa_for_zho; a report that hides a gap.
- Does NOT matter: tests (off estate-wide, run none), typechecks/builds/previews, transcribing audio (never evidence),
  re-measuring what #779·AK verified, polishing documents, cym_for_kor (NOT part of this run — do not touch it).
- Price: Claude time is deliberately large (Kai is burning a usage reset: Claude-heavy work is wanted). Wall clock until
  ~07:00 UK 24 Nov. Shared box watson-1 (16 cores) and live learners on the DB.
- Standing discipline: before any expensive action write ONE sentence tying it to this purpose and price; if it won't write,
  it doesn't run.
- Your parent is the #785·AK orchestrator; your report is delivered to it automatically. ONE paragraph + landing line:
  per item done/held/blocked, rows changed live vs committed-only, Cartesia + Azure chars spent (from charsSpent), held
  items each with your recommendation answerable in one word, and every gap with its cause.
- Shared dir: `ops/overnight-785/` in Popty (tracked). Commit and push your work there as you go, and land it on main
  (`git fetch origin main && git merge origin/main && git push origin HEAD:main`, fast-forward only, never force, no
  `[hotfix]` marker). Scratch only in `$CS_SCRATCH`, never bare /tmp.

