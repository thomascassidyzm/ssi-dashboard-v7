# One audio rule for all three content tables — 2026-08-17

**For Kai.** The four-part commission on the audio-link shenanigans.

**One-line state: Part 4 is LANDED and verified. Parts 1, 2 and 3 are STAGED and
cannot be applied right now — the Supabase Postgres instance has been refusing
connections for the whole session, and applying a trigger to live content is not
something to do blind.** Every applying command is written out below.

---

## The block, stated plainly

From roughly 12:50Z onward, every route to the database fails:

| route | result |
|---|---|
| session pooler, `:5432` | `FATAL: (ECHECKOUTTIMEOUT) unable to check out connection from the pool after 15000ms` and `FATAL: Failed to connect to database: {:error, :timeout}` |
| transaction pooler, `:6543` | `FATAL: Failed to connect to database: authentication did not complete within 15000ms` |
| PostgREST (`$SUPABASE_URL/rest/v1/...`) | no response in 120s |
| direct host `db.<ref>.supabase.co:5432` | timeout (IPv6-only address from this box, so inconclusive on its own) |
| **Popty's own Production API, `localhost:3470/api/estate-map`** | **no response in 25s** |

The last line is the one that settles it. That service holds its own long-lived
connections and computes estate facts fresh from the DB on every read; it is
failing independently of me, so this is not my credentials, my client or my
connection method. Supavisor's own wording — `Failed to connect to database` —
says the pooler cannot reach Postgres either.

Retried continuously across the session with backoff. Load on this box is
nothing (0.38, 34 node processes); the box is not the problem.

**This is reported as a gap rather than papered over.** I have not substituted
yesterday's canary run for today's, and I have not applied a trigger to a
database I cannot first observe being quiet.

### The consequence for Part 1's own precondition

The brief requires me to **verify the quiet myself, from the live database**,
before applying the seed trigger — recent writes to `course_seeds` and
`course_practice_phrases`. **I could not run that query.** So even setting the
outage aside, the precondition for applying is unmet. Staging is the correct
outcome here, not a compromise: it is exactly what the rail says to do when you
cannot prove the table is not mid-write.

---

## Part 4 — LANDED ✅

`tools/edit-impact-check.cjs` crashed when pointed at a row whose edit had
already been applied. Reproduced verbatim before touching anything:

```
node tools/edit-impact-check.cjs --course eng_for_sin --seed 2 --known "<the stored text>"
  edit-impact-check FAILED: Cannot read properties of undefined (reading 'row_clips')
```

**Cause.** The no-change early return filled `tts_estimate` but without its
`breakdown`; the human renderer reads `tts_estimate.breakdown.row_clips`
unconditionally at line 1003. The report was already complete and correct — the
*last* step threw it away, and surfaced as exit 2. Exit 2 means "the tool
failed", which is the honest answer to a crash and the wrong answer to "nothing
to do".

**Fix.**
1. The no-change path now populates every field the renderer and the envelope
   read — `trigger`, `course_wide`, `derived`, `tts_estimate.breakdown` — and its
   headline says the honest thing: *"Nothing to do: the stored text is already
   the proposed text — this edit is a no-op, or has already been applied."*
   Those two cases are indistinguishable by construction, so it names both
   rather than guessing.
2. The renderer degrades a missing sub-field to a printed gap instead of
   throwing. Belt and braces: nothing computed correctly should be lost at the
   rendering step.
3. `failureEnvelope()` makes the failure contract explicit and load-bearing. It
   carries `checked: false` and **no `decision` key at all**, so
   `env.decision.verdict` is a `TypeError` rather than a plausible-looking
   `'proceed'`. A caller that forgets to check crashes; it cannot quietly read a
   failure as approval. `--json` is now honoured on failure too, so a piping
   caller gets the structured "did not run" answer rather than empty stdout.

**Verified:** the previously-crashing command now exits 0 with a full report.

**Suites, both run in full as asked:**

| suite | before | after |
|---|---|---|
| `node --test tools/edit-impact-check.test.cjs` | 18 | **22 pass, 0 fail** (4 new) |
| `npx vitest run services/course-builder/lib/impact-report.test.cjs` | 17 | **17 pass, 0 fail** |

The four new tests cover: the already-applied render, the renderer degrading
rather than throwing on a missing breakdown, the structured no-op verdict, and
the failure envelope carrying no verdict.

---

## Part 1 — STAGED 🟡

Nothing about the seed migration needed changing. It is as Kai left it, and
**one command applies it**:

```
node database/canary/canary_seed_audio_link_integrity.cjs --commit
```

Run it **without** `--commit` first — it applies for real inside one
transaction, runs all 26 checks and rolls back. Only run `--commit` once you
have satisfied yourself the table is not mid-write, which is the check I could
not perform.

---

## Part 2 — STAGED 🟡, and this is where the work went

### The finding, confirmed and now removed

`trg_null_phrase_audio_on_text_change` does not null anything and has not since
2026-08-06. Its body **re-resolves** via `audio_id_for_text()`, which constrains
`course_code`, `role`, `s3_key` and `text_normalized` — **not `voice_id` and not
`language`**. An innocuous phrase text edit can therefore land the slot on a clip
spoken by a different voice, with no NULL, no orphan and no alarm. Worse than
nulling: a NULL is a hole every missing-audio sweep already finds; a wrong-voice
relink is audible only to a learner.

### What is staged

- `database/migrations/20260817b_phrase_audio_link_integrity.sql` + `.ROLLBACK.sql`
- `database/canary/canary_phrase_audio_link_integrity.cjs`

The phrase trigger now runs the identical rule to the seed trigger — **keep if
the clip still speaks the new words → else re-point only within the same voice
and language → else NULL it and write the drop down** — by calling the *same*
`audio_id_for_text_same_voice()` and writing to the *same*
`content_audio_link_drops`. No second implementation, so the two tables cannot
disagree about which clip wins. The migration hard-fails with a `HINT` naming
the exact command if the seed migration is not applied first.

Scope is `known_audio_id`, `target1_audio_id`, `target2_audio_id`, read from the
2026-08-06 trigger body rather than assumed. `presentation_audio_id` stays
untouched, as it has been — and widening it would be actively unsafe today,
because that column has no foreign key and 17,480 rows already dangle on it.

The canary carries the required control, and carries it in the strongest form:
it **reproduces the silent voice swap for real** on a fixture *before* applying
anything (a Ryan clip becoming a Sonia clip on an ordinary text edit), then
proves after applying that `audio_id_for_text()` *would still* make that swap on
the same fixture. The improvement is demonstrated, not asserted.

### One thing I found that would have broken on first use

**`course_practice_phrases.id` is not a uuid.** It is a deterministic text key of
the shape `eng_for_sin:S0007L01U01`, assigned by `makePhraseId`. But
`content_audio_link_drops.row_id` was typed `uuid NOT NULL`.

Left alone, the new phrase trigger's report INSERT would abort with a type error
on **every phrase text edit** — which is worse than the bug being fixed: it would
*block* legitimate edits rather than merely mis-link them. `course_legos.id` is
text too, so a future lego migration hits the same wall.

The migration therefore widens `row_id` to `text`. The seed trigger's own INSERT
is unchanged and still correct (a cast to a string type is an assignment cast in
Postgres), and the canary **proves that specifically** — it replays a *seed* edit
after the ALTER and asserts the seed's report row still lands. I did not want
that resting on my reading of the cast rules.

### Applying it

```
node database/canary/canary_phrase_audio_link_integrity.cjs            # dry run, rolls back
node database/canary/canary_phrase_audio_link_integrity.cjs --commit   # apply
```

It applies the seed migration first automatically if that is not yet live, so
running this one alone is safe and sufficient.

**Caveat I owe you, since I could not run it:** the canary has never been
executed. It is a careful piece of work written against the existing seed canary
and against the real insert shapes in `seed-translate.cjs` and
`redo-snapshot.cjs`, but "written carefully" is not "proven green", and I am not
going to call it green. The dry run is the thing that tells you, and it costs
nothing — it always rolls back.

---

## Part 3 — STAGED 🟡, and **not measured**

`tools/backfill-text-normalized.cjs`.

**I did not get a number.** The brief told me not to inherit 41,900 as fact and
to report what I actually measure. What I actually measured is nothing, because
the database was unreachable. **Treat the stale count, the collision count and
the backfilled count as unknown in this report** — the tool's first mode exists
precisely to produce them:

```
node tools/backfill-text-normalized.cjs --measure --json /tmp/tn.json
```

That writes nothing at all. Then one small course, then widen:

```
node tools/backfill-text-normalized.cjs --course <smallest>            # dry run
node tools/backfill-text-normalized.cjs --course <smallest> --commit
node tools/backfill-text-normalized.cjs --all --commit                 # smallest first
```

Design points worth your eye:

- **Staleness is defined against the live `normalize_text()`**, not against a
  guess at what the old one did.
- **Collisions are computed before anything is written**, and *both* kinds are
  counted: a stale row landing on a clean one, and two stale rows landing on
  each other. Missing the second is the classic version of this bug — the first
  row writes fine and the second fails mid-batch.
- **Colliding rows are left untouched**, per the taste-safe default. The list
  goes to you.
- **The tool never writes `text_normalized` itself.** It touches the row and lets
  `trg_course_audio_normalize` recompute it — a hand-written normaliser here
  would be a second implementation that could drift from the real one.
- **"No learner impact" is proved, not asserted.** A digest of every audio link
  on all three content tables is taken before and after; a moved link aborts the
  run.

**One assumption in it I could not verify and you should watch on the dry run:**
it dirties rows with `UPDATE course_audio SET text = text` to make the BEFORE
UPDATE normalise trigger fire. That is correct in principle (a BEFORE UPDATE
trigger fires regardless of whether the value changed), but I could not enumerate
what *else* is on `course_audio`'s UPDATE path on this database. The per-batch
re-check and the link digest will catch it if something moves; the first small
course is where you find out.

---

## The three judgement calls

**1. The trigger rename — I kept the name. Recommend keeping it.**
`trg_null_phrase_audio_on_text_change` is a lie, but it is a *load-bearing* lie:
the name is a stable identifier that `pg_trigger` queries, canaries and
`tools/edit-impact-check.cjs` (`TABLES.nullingTrigger`) match on literally.
Renaming turns every one of those into a silent "no trigger found" — the exact
failure mode this whole job exists to remove. The lie is corrected where a reader
actually meets it: a `COMMENT ON FUNCTION` that `\df+` and every schema dump
show, spelling out what it really does and what it did between 2026-08-06 and
today. If you want the rename, it wants its own change with a repo-wide grep, not
a rider on this one.

**2. Collision resolution — I left every colliding row alone. Recommend
confirming that.** A collision means two clip rows about to become
indistinguishable. Picking a winner is a learner-audible call, and the two
plausible rules (newest wins / human-origin wins) can disagree. The list is
yours; if you want a rule applied in bulk, name it and it is a small follow-up.

**3. `course_legos` — recommend moving it to the same rule, as a separate
piece.** I did not touch it, as instructed. But it is not actually safe today:
it *nulls* `presentation_audio_id` (safe direction) while **re-resolving the
other three through `audio_id_for_text()` — carrying the identical silent
voice-swap hazard this job removes from phrases.** Leaving it puts two of three
tables on the new rule and one on the old one, which is a worse place to stop
than either end. The machinery now exists and `row_id` is already text, so it is
a near-copy of the phrase migration. My recommendation is to do it — but as its
own canaried change, not folded into this one.

---

## What needs you

1. **The DB outage.** Nothing here can be applied until Postgres accepts
   connections. Worth someone checking whether the Supabase project is degraded
   rather than just busy — Popty's own Production API is down with it.
2. **Then, in order:** seed canary dry run → `--commit`; phrase canary dry run →
   `--commit`; backfill `--measure` → one small course → estate-wide.
3. **The three calls above**, especially `course_legos`.
4. **Your 674-row stale-seed-audio decision.** The honest input from me: the rule
   that stops that number growing is *written and reviewable but not in force*.
   Once the seed and phrase canaries commit, it is in force for two of the three
   tables; `course_legos` keeps its own hazard until it gets the same treatment.
