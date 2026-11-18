
## HOW TO PICK UP THE ORIGINAL WORK (do this FIRST)
The original job was frozen at 13:32Z on 18 Nov by Kai's Watson (a live marketing email send was CPU-starved on the shared Supabase DB; our writes were the load) and cancelled ~13:40-13:53Z with no successor. The hold lifted 14:10Z. You are its successor, dispatched by the resume coordinator (#724·AI). The work below is ALREADY APPROVED by Kai: do not widen scope, do not re-ask Kai anything.
1. Go to the ORIGINAL worktree named above. Read `git log --oneline -15` and `git status` there, and its progress file (.cs-journal.md) and any README/record in its ops dir.
2. SALVAGE its uncommitted tree: in that original worktree, `git add` every uncommitted file that is part of the work (NOT .cs-stop-warning), commit "salvage after 18 Nov DB hold (cs #724 resume)", and `git push origin HEAD:<its branch>`. That tree is wiped 24h after its job ended; the commit is what survives.
3. In YOUR OWN worktree, `git fetch origin && git merge origin/<original branch>` and continue there. Commit and push your branch as you go.
4. Before applying anything, READ BACK the live state of what you will touch (filtered reads only) — the freeze may have landed part of a batch. Never redo what is live.

## DB LOAD — why you were resumed carefully
- Before any write phase, read the newest line of ~/.local/state/db-watchdog/freezes/samples-<UTC date>T<UTC hour>.jsonl and sum `count` over `activity` entries with state "active". If more than 6, do not write: arm a bounded systemd-run waker (your system prompt's Waiting rule) — never a foreground sleep loop.
- One connection, small batches (≤50 rows), 1-2 s sleep between batches, no parallel xargs/-P fan-out, no bulk dump of a whole course when a filtered read will do. ONE audio unit at a time.
- Other jobs (#705, #712 tel/mar fills, #725 sister-prop) are also writing; that is why the cap is tight.

## RULES
- Canon: Popty's course-methodology-canon.md is the rulebook, but it is 385k characters — grep it for the sections bearing on your fix (ZUT, the family you fix, known-side controlled language, LEGO/seed rules) rather than reading it whole. Check every change against it and against grammar.
- Course content is written only through Popty routes (see CLAUDE.md); no hand-written DB code, read-only included. Use committed tools and Popty's API.
- Audio has one route only: Popty POST /api/audio/render (or tools/audio/render.cjs). Library first; no retries; a refusal (402, NOT_IN_CHAIN, DAILY_TOTAL_CAP, REPEAT, VOICE_POLICY…) is the answer — report it, never route round it. Audio evidence is a served clip id or a plan/span fact; never Whisper. A listening judgement goes to Kai on a listening page (node ~/command-surface/tools/clip-page.cjs).
- Cleanup fixes: validator + rebuild + back-fill (Kai's standing default).
- Best effort, not questions: fix from evidence and cite sources. Never hold a fix for a native speaker or Kai's review. Held rows are reported with a reason, not a question.
- HONESTY: a block from scope or access is an explicit gap in your report, never papered over with stale docs or assumptions.
- Scratch in $CS_SCRATCH (swept when your turn ends — anything you need across a wake goes in the tracked ops/ dir and is committed).
- Long runs go in a systemd-run cs-long-<name> unit with --slice=cs-workers.slice that wakes you via cs-wake-send.cjs; never end your turn with work in a background task.
- Publish any plan or listening page (/api/publish-doc) and give the /d/ url.
- Report: one paragraph — what is live (edit event ids), characters spent, what is held and why, /d/ links — then the landing line. Popty work lands on origin/main fast-forward per CLAUDE.md once applied and read back; plan-only work stays on your branch.
