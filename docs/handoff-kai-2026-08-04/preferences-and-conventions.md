# Kai's preferences & conventions — for the receiving assistant

Distilled from the local memory hub + how these sessions actually ran. The repo's `CLAUDE.md`
carries the hard rails; this is the *working relationship*.

## How Kai communicates / wants to be worked with

- **Short, direct, no fluff.** State the outcome plainly — if tests fail, say so with output; if a
  step was skipped, say that; when something's verified done, say it without hedging. Don't say
  "honest answer" / "to be honest".
- **Jumps between projects** and **doesn't end sessions with a wrap-up** — so **log as you go**, at
  every breakpoint, not at the end. Assume context recovery has to be fast.
- **Reply in English** even though Kai is a Welsh speaker (North Wales). Welsh writing has its own
  conventions (e.g. never start a LEGO/phrase with a contracted `'r` — use `y`/`yr`).
- Surface **deadlines** proactively at session start — they sneak up on Kai; say so if something's
  due today. (Fridays are for fixes; there's a pending-fixes inbox — don't surface Friday-inbox items
  early in the week.)

## Handoff / documentation style (what "good" looks like — this bundle follows it)

- **File-level and concrete.** Name the file, the function, the commit, the line. A receiving agent
  with repo access but no chat history should be able to act without guessing.
- **Every thread gets: current state · what's done · exact next step · files/branches/PRs · gotchas.**
- **Distrust stale "facts."** The code + git history are the source of truth; a stale fact is worse
  than none. Verify any architectural claim against the code before relying on it. (This is the
  opening line of `CLAUDE.md` — Kai means it.)
- **Trust the DB read over stale course memory** — course-state notes rot fast; re-read the DB.

## Approval gates (hard — these cost money or are irreversible)

- **Never generate TTS audio without showing a plan and getting explicit approval.** Content passes
  end by **queueing** an audio-pass request, never by running TTS. In practice: **TTS = Kai's click,
  every time.** Show `--plan` and wait.
- **Never delete generated assets** (audio/video/MARs) without a deletion plan + approval. On paid
  live courses, **list deletions for Kai** rather than executing.
- **Never use the Anthropic SDK directly** — all LLM calls go through the Claude CLI
  (`claude --print`). A past SDK module silently billed ~$38/day. Unset `CLAUDECODE` when spawning
  nested CLI calls.
- **Otherwise act autonomously** when docs are clear, the action is reversible, and there's no cost
  surprise. Kai has explicitly said to act on precedent — but destructive/cost actions still need
  approval. Manual review = *every* item when reviewing.

## Quality-gate habits

- **Quality over throughput.** Course content is craftsmanship — work slowly, don't batch/optimise it
  into mediocrity. One writer per course (never two writers on one course — DB race).
- **Base-rate discipline:** reviewers over-call "leaks" on dialect courses — always do a course-wide
  count before deleting anything. Verify a reviewer on 3–5 samples before trusting it in bulk.
- **Model tiering:** Opus for language quality / orchestration and for Indic scripts (Sonnet degrades
  on Indic); Sonnet for workers; Haiku for mechanical sweeps. A Haiku mechanical scan is expected on
  content work (now suspicion-gated rather than always-full).
- **Separable detectors, not blanket regen** (Kai's idea, used in the deu/fra audit): audit existing
  assets and only regen the true rejects.

## Rollback discipline (learned the hard way here)

- **Every destructive DB op:** backup to JSON first, then act; keep the backup path in the log. The
  audio reprocess and the deu/fra dupe-relink both wrote `*-backup-*.json` + a done-log with old→new
  mappings and a `--rollback <log>` path. Row-level content UPDATE/DELETE is recoverable; be careful
  with fix scripts.
- **Reversible-new, not destructive-overwrite:** the de-hiss reprocess uploaded to a *new* s3 key and
  only repointed `course_audio.s3_key` — originals stay for rollback. Prefer this shape.
- **Strip generated columns before restoring course rows** (`lego_id`, `target_lego_id`,
  `target_phrase_id`) — the DB recomputes them from `seed + lego_index`. (Learned when a kor rollback
  emptied a released seed twice.)
- **Single-course scope guardrail:** every query/UPDATE/DELETE filters `course_code`; SELECT + count
  before any write.

## Branch hygiene

- **One staging branch:** `kai-stage` → single PR to `main`. Stage work there or on `docs/…`/`fix/…`/
  `feat/…` branches.
- **Never commit onto someone else's `claude/*` branch** — `claude/*` auto-merges wholesale to main
  (`.github/workflows/auto-merge-claude.yml`), so it would sweep their whole branch to main.
- **Verify the current branch in the same step as commit/push** (concurrent checkouts move the branch
  under you). **Stage explicit paths, never `git add -A`.**

## File placement

- **Never create files in repo root** (only essential configs). `scripts/` is the **gitignored**
  agent workspace; `tools/` is committed/shared; `docs/` for docs. Agent outputs go under a `temp/`
  dir, not `/tmp`.

## Slack / external (if watson-1 has these)

- The Slack MCP account here was **Aran's, not Kai's** — always `slack_read_user_profile` before any
  send and hold if it's not Kai's account. Learner reports come via Aran — verify each.
- Deborah flags language issues; Claude executes. Deborah's languages do **not** include Dutch. A
  Deborah re-flag means "revisit," not "reject." Don't refine already-sent messages.
