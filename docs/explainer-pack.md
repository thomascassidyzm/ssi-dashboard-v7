# Popty explanation pack — compiled render

**Version `14eaa1fa233d` · generated 2026-07-27 by `tools/explainer/compile.mjs`. DO NOT EDIT — edit the rulings/rules and recompile.**

Truth: roles admin/editor/recorder · workflow "Phase 1 → 3 → 8 → 9" · 14 gates · max LEGO syllables 8 · human-voice: cym_n_for_eng, cym_s_for_eng, bre_for_fra + cym_* prefix · 9 pair contracts · snapshot: 98 courses.

## admin

### home

Popty is where courses get made — everything a learner ever hears starts here and flows
through Supabase to the learning app. Three doors at the top: **Courses** is the library and
every working surface inside a course, **Docs** is the methodology reference, and **Admin** is
the platform room — the whole estate at a glance.

### courses

Each course card opens on its Overview hub — one door per course, with every working surface
as a card inside: text generation, audio, recording, QA. Course content lives in the database,
not in files; what you see here is what learners get. Text edits never mint audio by
themselves — a content pass ends by queueing an audio-pass request, and audio is only ever
generated after an approved pass, because every minted clip costs real money.

### admin

The Admin section is the platform-wide view. **Configs** holds per-course voice and listening
setup — a course without voice config cannot make audio. **Insights** is the measurement room.
**Activity** shows the builds and jobs actually running right now; a course that should be
moving and isn't shows up here first. **Maintenance** is the health sweep — the badge counts
days since the last audit, so a growing number is the system telling you it hasn't been
checked. **Users** is where access lives: admins see everything, editors are scoped to their
granted courses, recorders only ever see the Record Room.

### docs

Docs is one surface with two kinds of truth. The facts that can rot — gate lists, pipeline
shape, schema, endpoints — are compiled from the code and rendered directly, so they cannot go
stale; the founder-written methodology pages stay hand-maintained because no code can derive
them. The **Update docs** button on those pages re-reads live state — course list, audio-pass
queue, database counts — from the production machine on demand; facts derived from code refresh
when a commit deploys.

## editor

### home

Popty is where your courses get made. Two doors matter for you: **Courses** — your library,
scoped to the courses you've been granted — and **Docs**, the methodology reference. Everything
you edit here is live content: what the database holds is exactly what learners hear.

### courses

A course opens on its **Overview** hub — one door per course, every working surface a card
inside it: text, audio, recording, QA. The method under all of it: one known prompt maps to
exactly one target form, course-wide, and the known side is a controlled language too — the
gates hold you to both when you submit, and a rejection is the method protecting the learner,
not the tool being difficult. Text edits never mint audio directly; a finished content pass
queues an audio-pass request, and audio happens after approval, because minted clips cost real
money and some courses are human-voiced and never synthesised at all.

### checking

Checking a course is reading it the way a learner meets it: does each prompt force exactly one
answer, does every phrase use only what's been taught, does it read naturally in the known
language? The known-vocab flags this pack carries per course are the compiled starting point —
begin where the flags are earliest, because everything downstream builds on those seeds.

### docs

The Docs section is the reference shelf, and it carries two kinds of truth. Compiled pages —
**Overview**, **APML**, **Glossary**, **Pipeline** — are rendered from the code itself and
cannot go stale. Rulings pages — **Pedagogy** and **Pod Thinking** — are founder-written
methodology, kept by hand because no code can derive them. **Seeds**, **Content** and **Pods**
browse the canonical material in the database. Read Pedagogy before authoring anything — the
method is the product.

## recorder

### record-room

The Record Room is your whole studio. The queue you see is real work waiting: lines the course
needs in a human voice, in order. Read each line as it's written, at an easy natural pace —
recordings ship at one speed and the app adjusts playback, so never rush a take. Some courses
are human-voiced only — no synthetic voice is ever allowed to stand in for you there — which is
why a line waiting in your queue can't be filled by anyone but a person. A take you're not
happy with is worth redoing: whatever you record is exactly what a learner will hear, thousands
of times.

## Noticing rules

- **known-vocab-flags** (perChild, snapshot, mount home, admin/editor): "{name} has {knownBreaches} known-side vocabulary flags from the last gate run — worth a look before the next build session." → /course/{code}
- **recorder-pending-recording** (node, payload, mount record-room, recorder): "About {recordingScript.estimatedMinutes} minutes of reading left in your script — pick up whenever suits." → self
- **qa-open-error-flags** (countWhere, payload, mount qa, editor/admin): "{count} open QA flags are marked as errors — these are the ones worth clearing first." → self
- **qa-open-warning-flags** (countWhere, payload, mount qa, editor/admin): "{count} warning-level QA flags have built up on this course." → self
