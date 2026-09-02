# The text-ahead-of-audio standing count

**What it answers:** how many prompts in the estate have text that no audio has caught up with — counted every night, per course, with an alarm on any increase.

**Why it exists.** On 2 September 2026 a forensic pass into twelve silent English prompts (`docs/audio-forensics-2026-09-02/`) turned up roughly a thousand more by accident. In every sample the cause was identical: the text was edited or corrected, and no render pass ever followed. Text editing runs ahead of audio rendering, nobody counted the difference, and it grows. This makes it a number instead of a discovery.

## What the learner actually experiences

Not silence. **Absence.** `ssi-learning-app/api/courses/[code]/cycles.ts` → `phraseHasFullAudio()` drops any phrase missing known/target1/target2 audio from the walk rather than schedule a cycle the player would skip. So a gapped row is authored content the learner never meets, with no error and no alarm anywhere. That is why this needs counting rather than watching.

## Why the gap is NULLs and not stale clips

The brief that commissioned this expected stale audio — a clip rendered before the text's last edit — to be the larger number. It is not, and the schema says why:

* `null_lego_audio_on_text_change` / `null_phrase_audio_on_text_change` (BEFORE UPDATE) **null the audio links on any text change**.
* `link_audio_to_content` (AFTER INSERT ON `course_audio`) is the only relink path, and it fires only when brand-new audio is inserted.

(Both in `database/migrations/20260806_audio_link_integrity.sql`.) An edit therefore does not leave the old clip attached — it leaves NULL. Measured 2026-09-02: **107 rows estate-wide** carry a link whose clip text no longer matches, against **1,052** on the headline. The stale class is a rarity, and a *rise* in it is a signal that something wrote a link directly, bypassing the triggers.

## Categories

| Category | Meaning | Cost to fix |
|---|---|---|
| **missing_unrendered** | no link, and no clip anywhere in the course says that text | a TTS render — money |
| **missing_relinkable** | no link, but a clip for exactly that text already exists in the course | a relink — free |
| **stale_text** | a link is present and the clip's words no longer match the row | an edit or a render |
| **ts_stale** | clip predates `updated_at` but says the right words | **nothing — this is noise** |

`ts_stale` is measured and printed deliberately, at ~810,000 rows, precisely so nobody re-derives it in three months and believes it: `updated_at` is bumped by bulk passes that never touch the text, so the count means nothing.

## Two things the headline deliberately excludes

1. **Seed-level known audio.** ~12,800 seed prompts in otherwise-rendered courses have none, but it stops at a uniform boundary near seed 300 across ~30 courses — a render-plan boundary, not drift. Counted and shown on its own line.
2. **Courses still being built.** A course below the coverage threshold (`--threshold`, default 0.90 of known-side practice rows) has not had its render pass yet. ~166,000 prompts, reported as a build backlog and never in the headline. A course crossing the line shows up as a `bucket_move` in the delta rather than as a mystery jump.

Coverage is measured on **practice rows only** (phrase + lego — what the learner's walk pulls from), so the seed boundary can't drag a fully-rendered course into the building bucket.

## Text comparison

Uses the database's own `normalize_text()` — `rtrim(lower(trim(t)), '.?!¿¡。？！')` — because that is what writes `course_audio.text_normalized` and what the relink trigger matches on. Comparing any other way invents thousands of false "stale" rows out of full stops: measured at 32,762 before this was corrected. See `services/shared/text-normalize.cjs` for why the column holds two conventions.

## Running it

```
node tools/qa/audio-gap/count-audio-gap.cjs            # full report to stdout, saves a snapshot
node tools/qa/audio-gap/count-audio-gap.cjs --no-save  # look without touching the series
node tools/qa/audio-gap/count-audio-gap.cjs --json /path/out.json
npx vitest run tools/qa/audio-gap                      # the alarm logic
```

Read-only throughout: it never renders, never edits content, never deletes. Two grouped aggregates over ~1M content rows and ~800k audio rows, ~100 seconds. Needs `.env.psql` (gitignored, provisioned per machine — `docs/secrets-vault.md`).

## The nightly

`tools/qa/audio-gap/nightly.cjs` on a systemd user timer on watson-1 — **no GitHub Actions, that is estate policy**. Units are kept in `systemd/` here and installed to `~/.config/systemd/user/`:

```
cp tools/qa/audio-gap/systemd/ssi-audio-gap.{service,timer} ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now ssi-audio-gap.timer
systemctl --user list-timers ssi-audio-gap.timer     # is it armed
journalctl --user -u ssi-audio-gap -n 50 --no-pager  # what happened
tail ~/.local/log/ssi-audio-gap.log                  # one line per night
```

05:10 Europe/London, stated in London so DST needs no edit, chosen to miss every neighbour already on this box (03:00 SSi CI, 03:50 landing sweep, 04:15 tmp sweep, 04:40, 05:40 events archive).

It follows the nightly-CI doctrine in `~/command-surface/ops/ci-run.sh`: **quiet is silent, a rise is loud.** A night where nothing went up writes its snapshot and says nothing. A night where any course went up posts one plain-English notice into the Popty project channel naming the courses that rose — because a rise means text was edited and nothing rendered. A night it *cannot* count is loud too: a count that silently stops running is how this became invisible in the first place.

Snapshots: `~/.local/state/ssi-audio-gap/YYYY-MM-DD.json`, plus `latest.json`. One per night, so the series is the record.
