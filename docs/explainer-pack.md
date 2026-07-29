# Popty explanation pack — compiled render

**Version `ea0dac680d3c` · generated 2026-07-29 by `tools/explainer/compile.mjs`. DO NOT EDIT — edit the rulings/rules and recompile.**

Truth: roles admin/editor/recorder · workflow "Phase 1 → 3 → 8 → 9" · 14 gates · max LEGO syllables 8 · human-voice: cym_n_for_eng, cym_s_for_eng, bre_for_fra + cym_* prefix · 9 pair contracts · snapshot: 98 courses.

## admin

### home

Popty is where courses get made — everything a learner ever hears starts here and flows
through Supabase to the learning app. Three doors at the top: **Courses** is the library, the
canonical browsers (**Seeds**, **Content**, **Pods**) and every working surface inside a
course; **How & Why** is the app explaining itself — the how-to for what you do here plus the
founder's rulings; and **Admin** is the platform room — the whole estate at a glance.

### courses

Each course card opens on its Overview hub — one door per course, with every working surface
as a card inside: text generation, audio, recording, QA. Course content lives in the database,
not in files; what you see here is what learners get. Text edits never mint audio by
themselves — a content pass ends by queueing an audio-pass request, and audio is only ever
generated after an approved pass, because every minted clip costs real money.

### course-overview

A course's **Overview** is the single door into it, and the card grid is the pipeline in order:
**Text** — **Seed Editor**, **Text Generation**, **Listening Pods** on their own track — then
**Audio**, then **Review & QA**. The status and pricing pills set what the course *is*; the counts
beside them read the content as it stands right now. Overview never runs anything itself — it is
the map, and every card is a working surface underneath it.

### audio

**Audio Generation** mints the course's clips, and it is the surface where money actually gets
spent. Generate fills only what is missing — plan first, read the count, then run — and the same
run links already-minted clips to their phrases even when there is nothing new to synthesise, so
it is safe to press with zero missing. Introductions are authored inside that run rather than as a
stage of their own. Regenerating by role replaces clips that exist already, which is the expensive
direction; gendered courses need gender prep run before the result is right. Courses on the
human-voice list are never synthesised — their audio comes from the **Record Room**.

### script

**Script View** is the course in the order the learner meets it: every round, every prompt and
answer, with its audio. It is where checking happens, and it edits in place — fix the phrase,
regenerate that one clip, stay on the page. Search spans text, seed and LEGO, so one suspect form
can be chased across the whole course at once. It reads the same content the learning app plays,
straight from the database.

### admin

The Admin section is the platform-wide view. **Configs** holds per-course voice and listening
setup — a course without voice config cannot make audio. **Insights** is the measurement room.
**Activity** shows the builds and jobs actually running right now; a course that should be
moving and isn't shows up here first. **Maintenance** is the health sweep — the badge counts
days since the last audit, so a growing number is the system telling you it hasn't been
checked. **Users** is where access lives: admins see everything, editors are scoped to their
granted courses, recorders only ever see the Record Room. **Stock-take** is the compiled
reference — step in when you want to take stock of the system's current state.

### how

The app teaches itself — that replaced the old docs-and-manuals shelf. **How & Why** is one
surface: the how-to, written for what the signed-in person actually does, and the founder's
rulings — **Pedagogy**, **Pod Thinking**, schema truth, the APML lineage. The how-to for a
working surface now sits on that surface, behind its own **How this works**; **How & Why** keeps
the rulings and an index of where each explanation lives. Nothing there restates system state, so
it doesn't rot.

### stocktake

The **Stock-take** room is where the facts that can rot live as compiled renders: the
**Pipeline** shape, the **Glossary** of shared terms, the **APML** current state. They are
derived from the code and drift-gated, so they cannot go stale. Schema is the one fact even
the code can't vouch for — current schema is truth, migrations lie — so the Pipeline page
renders it from a live dump of the running database. The **Update docs** button re-reads live
state — course list, audio-pass queue, database counts, the schema dump — from the production
machine on demand; facts derived from code refresh when a commit deploys.

## editor

### home

Popty is where your courses get made. Two doors matter for you: **Courses** — your library,
scoped to the courses you've been granted — and **How & Why**, where the app explains itself.
Everything you edit here is live content: what the database holds is exactly what learners
hear.

### courses

The **Library** lists your courses, and next to it sit the canonical browsers — **Seeds**,
**Content** and **Pods** — windows onto the canonical material in the database. A course
opens on its **Overview** hub — one door per course, every working surface a card
inside it: text, audio, recording, QA. The method under all of it: one known prompt maps to
exactly one target form, course-wide, and the known side is a controlled language too — the
gates hold you to both when you submit, and a rejection is the method protecting the learner,
not the tool being difficult. Text edits never mint audio directly; a finished content pass
queues an audio-pass request, and audio happens after approval, because minted clips cost real
money and some courses are human-voiced and never synthesised at all.

### course-overview

A course's **Overview** is the one door into it — the working surfaces laid out in the order the
course actually goes through: **Text** first — the **Seed Editor** for approving translations,
**Text Generation** for seeds, LEGOs and phrases, **Listening Pods** on their own separate track
— then **Audio**, then **Review & QA**. The status and pricing pills at the top set what the
course *is*, not what it contains; the counts beside them are the current state of the content
itself. Nothing here generates anything: Overview is the map, and the work happens on the card
you open.

### audio

**Audio Generation** is where a course's clips get minted, and it is the one surface that spends
real money. Generate only ever fills what is *missing* — you plan first, see the count, then run
it, and the same run links existing clips to phrases even when there is nothing new to synthesise.
Introductions are authored inside that run, not as a stage of their own. Regenerating by role
replaces clips that already exist, so it is the expensive direction — reach for it when a voice or
a text change has actually invalidated them. Gendered courses need their gender prep run before
the audio is right. Human-voiced pairs are never synthesised at all; their clips come from the
Record Room instead.

### script

**Script View** is the course as the learner meets it, in order — round by round, every prompt and
every answer, with the audio attached. It is the reading surface where checking actually happens,
and it is editable in place: fix a phrase and regenerate just that clip without leaving the page.
Search runs over text, seed and LEGO, so a suspect word can be chased across the whole course in
one go. What you see here is what the learning app plays.

### checking

Checking a course is reading it the way a learner meets it: does each prompt force exactly one
answer, does every phrase use only what's been taught, does it read naturally in the known
language? The known-vocab flags this pack carries per course are the compiled starting point —
begin where the flags are earliest, because everything downstream builds on those seeds.

### how

**How & Why** is one surface with the two things worth reading: the how-to, written for what
you actually do here and compiled against the running system so it cannot drift from the app —
and the rulings, the founder's own thinking: **Pedagogy**, **Pod Thinking**, schema truth and the
APML lineage. Read Pedagogy before authoring anything — the method is the product. The how-to for
a surface you are standing on lives on that surface, behind its own **How this works** — this page
keeps the index of where each one is, and the thinking that no code can derive.

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
