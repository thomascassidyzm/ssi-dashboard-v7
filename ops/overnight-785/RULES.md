# Night rules for every #785 worker (paste-in; Kai Y 23 Nov 11:02Z "Yes on tonight's run")

## Canon digest
Full text: `course-methodology-canon.md` at the Popty repo root (385k chars; read only the section you need:
§2 LEGO l.331, §3 phrases l.572, §4 known side l.719, §5 audio l.1019, §6 obligations l.1112, §7 Kai's call l.1157).

HARD
- **ZUT (K2)**: one known prompt → exactly one target form, known→target direction. A new prompt that already maps to a
  different target anywhere in the course is a collision; the warning names both sides.
- **Known side is a controlled language (K1, K9)**: no known word/structure the learner has not been given; grammatical,
  natural English. Vocabulary is known / target / seed, never "source".
- **Target side (P1/P2, K14-K16)**: only material taught by that point, tiled from whole taught chunks; no untaught
  inflection/conjugation; correct natural language a native would say.
- **P17**: every phrase contains the WHOLE LEGO it sits under (both sides as the course glosses it). **P3** a BUILD shows the
  LEGO plugging into known material. **P7** USE rows are full sentences (fragments only as BUILD). **P6** USE replays cold.
- **P28**: once a form is taught for a meaning, every phrase with that meaning uses exactly that form.
- **Coverage is HARD (S3), overlap is normal (S4).**
- Obligations: **O1** seed edit → sweep the course; **O2/O13** LEGO text edit → its introduction (presentation line + clip)
  changes in the SAME pass; **O6/O12** grow/shrink/re-gloss a LEGO → rewrite every phrase under it AND re-check every phrase
  anywhere that uses the old gloss; **O3** check NULL audio links before overwriting; **O5** an edit unapproves the affected
  seeds where the course is in proofreading; **O8** a content pass ends by QUEUEING an audio pass (never TTS by hand);
  **O11** make before break, delete no clip.

KAI'S CALL vs OURS
- Ours: passing verification, no ZUT collisions, tiling, untaught vocab. Nothing that fails a gate goes to Kai.
- His: naturalness/taste in his languages (Finnish, Italian, Welsh, English), phrase rewrites/deletions *as a class*,
  spend at batch scale, scripted fixes (see below).
- **Best effort, not questions** (Kai 16 Nov): no native-speaker holds, no proofreader question lists; fix from evidence,
  cite, label confidence. The bar is improvement over what is there now.

KAI'S STANDING RULES FOR APPLIES
- **Live pre-check** (Kai 19 Nov): immediately before writing, read each target row LIVE through the governed Popty route,
  in the same small batch, WITH its LEGO and its seed; all three must still match what the plan was built on. A mismatch is
  HELD and listed for re-planning, never forced. (`apply-changeset.cjs` checks the row `expect` only, so add the LEGO+seed
  read yourself.)
- **Shortest LEGO cut** with stand-in frames; longer only if shorter reintroduces a clash or gap. List any LEGO kept ≥7
  syllables with the reason.
- **Thin baskets over bad phrases** (Kai 19 Nov). Never pad a basket with a weak phrase.
- **Stand-in "it" frames are OK** (Kai 17 Nov): phrases under such a frame swap the "it". Never flag or restructure them.
- **No scripts on these fixes without Kai's specific OK** (18 Nov): a plan may PROPOSE a scripted fix for his Y/N.

## Database (Tom 18 Nov: "Kai's Watson needs to never do any hammering. Ever.")
- ≤3 DB writers across the night: item 4 timer (from 22:05Z), the eng_for_tel A2C unit (`cs-long-785-tel`), and ONE edit
  writer (Child A). Child B writes NOTHING live.
- Read `curl -s localhost:3470/health | jq .dbLoadGate.level` before EVERY batch; send nothing unless `green`.
- Content writes only through Popty routes with `x-agent-id: kai-<job>`: `POST /api/production/:course/edit-batch`
  (dry run, then `"apply": true`), PATCH/edit-cascade, `link-clip`. Beyond hand scale: changesets via
  `node tools/changeset/apply-changeset.cjs <file> --key kai --agent kai-<job>` (runs 22:00-07:00 UK only).
- No hand-written DB code at all (no psql, no `node -e`, no python against the DB, no Supabase REST, no scratch query).
  Committed tools run unchanged, or Popty routes. A missing tool is a GAP to report.

## Audio
- Only `POST http://localhost:3470/api/audio/render` (or `node tools/audio/render.cjs`). Library-first. No retries.
- A refusal is the answer (402, NOT_IN_CHAIN, DAILY_TOTAL_CAP, REPEAT, EXISTS_IN_LANGUAGE, quota): record it, stop that run.
- Kai's approval token `kai:2026-11-23:<reason>` covers his approved fixes within budget. Never a `tom:` token.
- Audio proof = served clip ids + Kai's ear on a listening page. Listening pages via `node ~/command-surface/tools/clip-page.cjs`, marked UNHEARD.

## Night budget (Cartesia; Azure counted and reported separately)
| Item | Cap | Note |
|---|---|---|
| item 4 timer (por_br + eng_for_mar), from 22:05Z | 420,000 | reserved in full until its spend file shows otherwise |
| items 2-6 (Child A) | 80,000 | sum of plan figures ~67k; re-price from dry runs; report before exceeding |
| item 1 eng_for_tel A2C | 500,000 | runner `--cap 500000` |
| **night total** | **1,000,000** | stop all new Cartesia spend at 1M |
Each worker keeps its own spend file `ops/overnight-785/<item>/spend.json` = `{cartesia, azure, byItem, at}` from the
render answers' `charsSpent` (tts-cap.cjs status is refused by the DB guard).

## Survival
- Long work runs as `systemd-run --user --unit=cs-long-785-<name> --slice=cs-workers.slice --property=RuntimeMaxSec=<s> …`,
  never as a background task. No secret or token on that line (`--setenv=CS_CONV_TOKEN` passes your own by name).
- Wait with a `cs-wake-*` unit (`node ~/command-surface/tools/cs-wake-send.cjs <conv id> "$CS_CONV_TOKEN" "<msg>"`), bounded,
  always sending something at the end. Never sleep-poll.
- Do not touch spa_for_zho, its units (`cs-long-keep-zho-rerecord*`) or grant #184. Do not touch cym_for_kor.
  Send no messages to people.
