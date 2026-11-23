# Child A — the night's ONE edit writer: items 3 → 5 → 4 → 6 → 2 (applies), Kai's overnight run (#785·AK)

You are the ONLY content edit writer tonight. Alongside you run at most two other writers: the eng_for_tel A2C render unit
(`cs-long-keep-785-tel`, link-clip writes) and the item-4 night timer (`cs-long-keep-item4-358`, from 22:05Z). So never run
two of your own batches at once, and never start a parallel apply process.

## Scope (settled by Kai's Y; sizes from #779·AK — re-price from your own dry runs before you spend)
**Your Cartesia cap for ALL of items 2-6 together is 80,000 characters** (plan figures sum ~67k). Item order for budget:
if it gets tight, smaller learner-heard fixes (3,5,4,6) come before item 2's tail. Report and stop before exceeding 80k.

- **Item 3 — por_br_for_eng held fixes + the "fala isso" LEGOs**, ~15.5k chars. Plan: #423·AI (doc /d/86cf198f, table
  /d/4a804f2e — find their source with `~/command-surface/tools/estate-search "423" --repo ssi-dashboard-v7-clean` or
  `git log --all --grep '#423'`). Still live: S0647L02 and S0662L01 (2 LEGOs + 23 phrases) teach "speak it" as *fala isso*
  ("say that") — fix with the shortest cut. /d/8389c0b1 also names S0385L01U05 (a lost LEGO). **Seeds 49 and 72 stay HELD
  for Kai — do not apply them.**
- **Item 5 — por_for_eng held fixes**, ~1.3k chars, from #426·AI (/d/f1e11f9f), including S0379 which still teaches *tive
  sorte suficiente*.
- **Item 4 — kor_for_eng held fixes**, ~5.5k chars, from #420·AI (/d/c38294a1), INCLUDING the S0082L01 duplicate rows (still
  live). Skip everything #484·AI already applied (`ops/kor-held-484`: seeds 633/656/662/664).
- **Item 6 — eng_for_jpn held small batches, seeds ≤300 only** (13 items), ~4.6k chars, from #421·AI (/d/71221f73).
- **Item 2 — eng_for_jpn known prompts D2, seeds 74-300** (1,262 flagged rows, ~40k chars), continuing #726·AI/#699·AI.
  A SIBLING (Child C, item-2 planner) is writing the plan TSVs during the day into
  `ops/overnight-785/item2-jpn-d2/plans/` on main, earliest seeds first, with a `READY.txt` listing each finished file.
  After items 3/5/4/6, `git fetch origin main`, merge, and apply those plans in seed order with the committed
  `ops/paid-cleanup-item3/run.cjs` (read → gate → batch → batch --apply → audio → link → readback). Rows the gate refuses
  are HELD and counted, never forced (#726 left ~127 such refusals as precedent). If no plan file is ready, item 2 is a gap.

## How to work
- Plan by DAY from what is committed + the nightly QA copy (`set -a; . ~/ssi-restore/qa-copy.env; set +a` before a
  committed read tool). Every Popty call from the paid-cleanup kits is refused outside 22:00-07:00 UK and needs
  `--live-ok '<why>'` (`ops/paid-cleanup-livegate.cjs`) — that is the design: live reads, gates and applies happen at night.
- Precedent apply kits to reuse rather than reinvent: `ops/kor-held-484/apply.cjs`, `ops/zho-held-431/`, `ops/ita-held-435/`,
  `ops/deu-held-apply-440/`, `ops/paid-cleanup-item3/run.cjs`. They talk to Popty over HTTP only.
- **Live pre-check before every write** (see RULES): read the row + its LEGO + its seed live in the same small batch; any
  mismatch with the plan is HELD for re-planning, never forced.
- Load gate before EVERY batch: `curl -s localhost:3470/health` → `.dbLoadGate.level` must be `green`; else wait (bounded) —
  for a long wait, end your turn with a `cs-wake-*` waker rather than sleeping.
- LEGO text edits obey O13: the introduction (presentation line + clip) changes in the same pass. Re-gloss obeys O12.
- Audio: `POST /api/audio/render` with `approval: "kai:2026-11-23:<item reason>"`, `x-agent-id: kai-<your job>`, and your
  own conversation token in `x-cs-conv` (the route verifies Kai's seat). Library first, one render, no retries, a refusal
  stops that item. Then point slots with `link-clip` (replace + expectCurrent). Keep
  `ops/overnight-785/<item dir>/spend.json` = `{"cartesia":N,"azure":N,"at":"…"}` from each answer's `charsSpent`, updated
  after every batch — the orchestrator reads it to keep the night under 1,000,000.
- Item dirs: `ops/overnight-785/item3-por-br/`, `item5-por/`, `item4-kor/`, `item6-jpn-small/`, `item2-jpn-d2/`
  (op list, dry-run answer, apply answer + undo, readback, spend.json). Commit + land each item on main as it finishes.
- One listening page per item that rendered audio: `node ~/command-surface/tools/clip-page.cjs` (served clip ids), marked
  UNHEARD; publish with `internal:false` and name the url in your report.
- At 06:45 UK stop starting new batches; finish the current one, read it back, commit, report.
- Long waits: end your turn and be woken (cs-wake unit) — never sleep-poll, never a background task holding real work.
- When your day planning is done, arm a one-shot waker for 22:00Z (UK = UTC this week) — e.g.
  `systemd-run --user --unit=cs-wake-785a-night --slice=cs-workers.slice --on-calendar='2026-11-23 22:00:00 UTC' --setenv=CS_CONV_TOKEN bash -lc 'node ~/command-surface/tools/cs-wake-send.cjs <your conv id> "$CS_CONV_TOKEN" "WAKE: 22:00Z, night window open; start applies"'`
  — and END YOUR TURN.
