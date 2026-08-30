# The morning read of Deborah's review column

**Built 2026-08-18. Basecamp is read-only throughout — nothing is ever written to the board.**

## The failure this fixes

On 2026-08-17 Deborah left ten findings on the Lebanese Arabic card of the
**Creu Cyrsiau** board. Two reached our queue. The other eight sat unread until
someone happened to go looking the next day — and one of them, `S0022, R61`, is a raw
template token (`b+people`) showing in a learner-facing **English** prompt.

Nothing watched that column. That was the whole problem.

## What runs

`tools/deborah/basecamp-column-watch.cjs`, once a morning, unattended.

1. Reads the **Content checking + audio gen** column of the Creu Cyrsiau card table
   (project `26277678`, card table `7038571695`) — every card, every comment, **and every
   card description**, fully paginated.
2. Diffs against durable state, so it reports what is genuinely **new** rather than the
   same list every morning.
3. Writes new findings to `docs/deborah/queue/<date>.md` and posts a card to Kai's board.
4. Records her progress markers (`"Checked to S0055, R146"`) to `docs/deborah/review-progress.json`.

## What it found on the real board, 2026-08-18

| Course | New findings |
|---|---|
| `eus_for_eng` | 44 |
| `eng_for_por` | 18 |
| `eng_for_ita` | 16 |
| `nld_for_eng` | 14 |
| `ara_lb_for_eng` | **10** — the 2026-08-17 comment, in full |
| `ara_eg_for_eng` | 8 — unread since 2026-06-09 |
| **Total** | **110 open**, plus 101 lines she had already marked `[Fixed]`, correctly not queued |

Three progress markers recovered. Two of them (`eng_for_por` S0050/R136, `eng_for_ita`
S0053/R144) independently match what Kai pasted from Slack into
`docs/deborah/findings-2026-08-17.md` — the parser and the human agree.

## Four things that were nearly missed, and are now handled

- **Basecamp pages every collection at 15.** Page one only is how this board stayed
  invisible. `fetchAllPages` loops until a page returns empty and throws rather than
  silently truncating.
- **`project.updated_at` is not an activity signal.** Freshness is judged from comment
  timestamps only.
- **Three of the six cards have zero comments.** Their content-check log lives in the
  **card description** — months of it. Reading comments alone would have found nothing on
  Dutch, Basque or Italian.
- **She marks her own lines `[Fixed]`.** 101 such lines are read and deliberately not
  queued; handing her corrections back as new questions would have destroyed trust in it.

Lines the parser cannot classify are printed under *"Lines this tool did not classify"*
rather than dropped. A watcher that quietly discards what it does not understand reports
quiet when it is simply blind.

## How it is scheduled, and how to turn it off

The estate's live scheduling mechanism is the **user crontab** (systemd `--user` timers run
no SSi job; the Command Surface has no scheduler of its own). One line, following the
existing `candidate-report.mjs` pattern:

```
30 6 * * *  /usr/bin/node /home/tomcassidy/SSi/ssi-dashboard-deborah-watch/tools/deborah/basecamp-column-watch.cjs >> /home/tomcassidy/.local/log/deborah-column-watch.log 2>&1; /bin/sh /home/tomcassidy/command-surface/ops/trim-log.sh /home/tomcassidy/.local/log/deborah-column-watch.log   # Deborah's review column morning read
```

**To turn it off:** `crontab -e` and delete (or `#`-comment) the line ending
`# Deborah's review column morning read`.

**To see whether it ran:** `tail -20 ~/.local/log/deborah-column-watch.log`. Every run
logs what it wrote, whether it published, and whether it posted a card. It fails loudly
and non-zero rather than exiting quiet.

### Why it runs from a separate checkout

`/home/tomcassidy/SSi/ssi-dashboard-deborah-watch` is a git worktree pinned to the branch
`docs/deborah-basecamp-column-watch-2026-08-18`. The shared checkout is worked in by several
agents at once and its branch moves, so a cron line pointing there would silently lose the
script the moment somebody checked out a branch without it. When this branch merges to
`main`, repoint the cron line at the `-prod` checkout and remove the worktree with
`git worktree remove /home/tomcassidy/SSi/ssi-dashboard-deborah-watch`.

## State

`~/.local/state/deborah-watch/state.json` — comment ids with their `updated_at`, plus a
per-line hash of every finding already queued. Findings are diffed **per line**, so an
edited comment surfaces only its new lines. Seeded 2026-08-18 with the 110 above, so
tomorrow reports only what is genuinely new. Delete the file to replay everything;
`--replay` does the same without disturbing it.

## The one gap: publishing to Kai's shelf

`publish-doc` files a document under the **authenticated caller's** user id, and an
unattended cron process on this box carries no identity, so it resolves to **Tom**.
Publishing the digest that way would file Deborah's review material — Kai's alone — as a
document of Tom's and put it on Tom's plate. So the daily run **deliberately does not
publish**; it writes the queue file and posts a card to Kai's board (`needs: "kai"`, which
Tom's ambient identity is permitted to address).

To switch the shelf publishing on, Tom mints a Kai cron session once — this writes to the
Command Surface's own session store, which is outside this repo's scope, so it was not done
here:

```
CS_CRON_USER=kai CS_SESSION_FILE=/home/tomcassidy/.cs-cron-session-kai \
  node /home/tomcassidy/command-surface/ops/cs-cron-session.js
```

then add `DEBORAH_WATCH_SESSION=/home/tomcassidy/.cs-cron-session-kai` to the cron line.
The code path is already written and gated on exactly that variable.

## A second gap, upstream and not ours to fix

`command-surface/ops/basecamp.js` reads HTTP responses with
`let data = ""; res.on("data", d => data += d)` and **no `res.setEncoding("utf8")`**, so each
chunk Buffer is stringified independently and any multi-byte character straddling a chunk
boundary is destroyed into `U+FFFD`. Observed live on 2026-08-18 (an em-dash in one comment).
It cannot hide a finding, but it can corrupt *her words, verbatim* — so this tool flags any
affected line as `⚠ char lost in transit` rather than passing the damage off as her typing.
The fix is one line, in a repo outside this workspace.
