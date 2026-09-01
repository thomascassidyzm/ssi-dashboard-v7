# Editor identity on save

*Tom's ruling, 2026-09-01. Built the same day, across every content-editing
surface in one pass.*

## What was wrong

Kai's team found that the seed editor recorded nothing about who made an edit.
Shuchita proofread 423 `eng_for_hin` seeds and the system holds no record that it
was her — not in the save path, not in an audit log.

Digging into it, the gap was wider than the seed editor:

- **36 routes across two services write course content**, and not one of them
  captured who was calling.
- A `content_audit_log` table already existed, fed by an `audit_content_change()`
  trigger, with a `changed_by_uid` column for exactly this purpose. It held
  **4,013,923 rows and zero identities.** It is fed by `auth.uid()`, and every
  writer of course content connects as `service_role`, where `auth.uid()` is
  null. The hook has never captured an identity and, as designed, never could.

That is fine while every editor is a trusted colleague. It stops being fine the
moment a community member edits their own course through Popty.

## The shape of the fix

Identity is **derived, never declared by a form**. There is no "your name" field
anywhere in this design, and none can be added: the actor comes from a Supabase
session this service verifies itself, or from an agent/service declaration that
is only accepted over trusted same-host loopback and is recorded as *unverified*
when it is.

Five pieces:

| Piece | What it does |
|---|---|
| `content_edit_events` (new table) | Append-only log, **one row per save operation**, not per content row. `actor_kind` / `actor_id` / `actor_label` / `actor_verified` are NOT NULL with non-blank CHECKs, so an event cannot physically exist without an identity. |
| `last_edit_event_id` on `course_seeds`, `course_legos`, `course_practice_phrases` | FK to the event that last wrote the row. Stamped inside the payload the handler was already sending, so it costs no extra write. |
| `services/shared/editor-identity.cjs` | The one resolver. Verified JWT → `human`; declared over loopback → `agent` / `service`. A JWT always wins over an agent header, because the human is the one who pressed the button. |
| `services/shared/content-write-surfaces.cjs` | The manifest of all 36 content-writing routes — and the gate's input, not a comment. |
| `services/shared/content-edit-gate.cjs` | App-level middleware on both services. For a manifest route it resolves an identity or answers **401 before the handler runs**; otherwise it does nothing at all. |

### Why one row per operation, not per row

`content_audit_log` takes the per-row shape and has grown to 4.0M rows in two
months. Answering "who proofread these 423 seeds" needs 423 rows, not 423 ×
every phrase underneath them. The event names its scope (`seed_numbers`,
`lego_ids`, `phrase_ids`, `rows`); the row-level pointer covers the reverse
direction. The two logs are complementary: `content_audit_log` holds the
before-image, `content_edit_events` holds the who.

### Why the untrusted-editor case is actually covered

RLS on all three content tables grants `SELECT` to `anon`/`authenticated` and
`ALL` only to `service_role`. A community member holding a Supabase account and
the anon key **cannot write course content directly at all**. Every write they
can reach is an HTTP surface in the manifest, and every surface in the manifest
runs the gate first. There is no second door.

A browser request also cannot impersonate an agent: agent/service declarations
are accepted only from bare loopback, and `production-api`'s proxy now stamps
`x-forwarded-for` on anything that came from outside, so a forged
`x-agent-role` from a browser is refused. That case is in the test suite and in
the live probe below.

## The transition, and why it is not a loophole

`CONTENT_EDIT_IDENTITY_MODE` is `observe` on this deploy:

- **`enforce`** — no identity, no write, full stop.
- **`observe`** — a *same-host loopback* caller that declares nothing is
  recorded as the named actor `undeclared-loopback` rather than refused, so an
  in-flight build or an unrevised `tools/` script cannot be broken by this
  deploy. It is still a named, non-blank actor and it is still logged.

A browser request — colleague or community member — never arrives on bare
loopback, so **it is refused in both modes.** The transition only ever softens
the same-host path.

Census before flipping, expected to reach zero:

```sql
SELECT surface, count(*) FROM content_edit_events
WHERE actor_id = 'undeclared-loopback'
  AND occurred_at > now() - interval '14 days'
GROUP BY 1 ORDER BY 2 DESC;
```

Then set `CONTENT_EDIT_IDENTITY_MODE=enforce` on both services, leave it a few
days, and apply
`supabase/migrations/20260901c_content_edit_identity_ENFORCE.sql.UNAPPLIED`,
which adds `CHECK (last_edit_event_id IS NOT NULL) NOT VALID` to the three
content tables. `NOT VALID` binds every future insert and update while never
demanding a value for a past row — which is the whole point.

## The 423 seeds were not retro-stamped

`last_edit_event_id` on every pre-existing row is NULL and stays NULL. It has
exactly one meaning, everywhere, for ever: **no attribution was captured for this
row.** It is never a claim about who edited it.

What *can* honestly be said about the 423 — a date-bounded inference, marked as
one, kept in a document rather than a column — is in
[`eng-for-hin-423-unattributed-2026-09-01.md`](./eng-for-hin-423-unattributed-2026-09-01.md).

## How it was verified

**Unit** — `services/shared/content-edit-gate.test.cjs` drives a real express app
over a real loopback socket (the distinction the gate turns on lives in the
socket, so a mocked `req` would let us assert a fiction): unauthenticated browser
write refused and *handler never runs*; expired token refused; authenticated-but-
unauthorised account refused; verified human recorded with `actor_verified: true`;
same-host agent recorded with `actor_verified: false`; human wins over a
co-present agent header; a handler that forgets to record still gets an event;
`observe` names the undeclared same-host caller but still refuses the browser;
`enforce` refuses both; and six malformed-identity shapes are rejected by the log
itself.

**Drift** — `services/shared/content-write-surfaces.test.cjs` re-derives the set
of content-writing routes from the route sources and fails if the manifest and
the code disagree in either direction. Proved non-vacuous by deleting the
edit-cascade entry and watching it fail with the file and line.

**Live** — a real `course-builder-api` instance on port 3999 against the live DB,
using a nonexistent course so nothing could be mutated:

| Probe | Result |
|---|---|
| Browser-origin content write, no auth | **401** `EDITOR_IDENTITY_REQUIRED` |
| Browser-origin with forged `x-agent-role` + `x-service-name` | **401** — the spoof is refused |
| Browser-origin with a garbage bearer token | **401** |
| Browser-origin `DELETE /api/course/:code` | **401** |
| Non-content route, no auth | **200** — untouched |
| Same-host caller declaring `x-service-name` | **200**, event recorded, actor named, `actor_verified: false` |

None of the four refused requests wrote an event, and no content row changed.

## Notes for whoever touches this next

- Adding a route that writes `course_seeds` / `course_legos` /
  `course_practice_phrases`? The drift test will fail until you add it to
  `content-write-surfaces.cjs`. That is the mechanism working.
- Writing a `tools/` sweep that edits content directly over SQL? It bypasses the
  HTTP gate by construction. Use `serviceIdentity('<sweep-name>')` with
  `recordContentEdit()` so the sweep names itself. `serviceIdentity('')` throws.
- `audit_content_change()` now ignores `last_edit_event_id` alongside
  `version`/`updated_at`/`created_at`. Without that, the second stamped save of
  any row would have looked like an overwrite of editorial data and pulled a full
  before-image into a 4.0M-row table — including for saves that change no content
  (`20260901b`).
