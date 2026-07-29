<!-- ssi-admin persona. Mechanism only, never restated state. The drift gate
requires every surface an admin can stand on to be named here. -->

## home

Popty is where courses get made — everything a learner ever hears starts here and flows
through Supabase to the learning app. Three doors at the top: **Courses** is the library, the
canonical browsers (**Seeds**, **Content**, **Pods**) and every working surface inside a
course; **How & Why** is the app explaining itself — the how-to for what you do here plus the
founder's rulings; and **Admin** is the platform room — the whole estate at a glance.

## courses

Each course card opens on its Overview hub — one door per course, with every working surface
as a card inside: text generation, audio, recording, QA. Course content lives in the database,
not in files; what you see here is what learners get. Text edits never mint audio by
themselves — a content pass ends by queueing an audio-pass request, and audio is only ever
generated after an approved pass, because every minted clip costs real money.

## admin

The Admin section is the platform-wide view. **Configs** holds per-course voice and listening
setup — a course without voice config cannot make audio. **Insights** is the measurement room.
**Activity** shows the builds and jobs actually running right now; a course that should be
moving and isn't shows up here first. **Maintenance** is the health sweep — the badge counts
days since the last audit, so a growing number is the system telling you it hasn't been
checked. **Users** is where access lives: admins see everything, editors are scoped to their
granted courses, recorders only ever see the Record Room. **Stock-take** is the compiled
reference — step in when you want to take stock of the system's current state.

## how

The app teaches itself — that replaced the old docs-and-manuals shelf. **How & Why** is one
surface: the how-to, written for what the signed-in person actually does, and the founder's
rulings — **Pedagogy**, **Pod Thinking**, schema truth, the APML lineage. Nothing there
restates system state, so it doesn't rot.

## stocktake

The **Stock-take** room is where the facts that can rot live as compiled renders: the
**Pipeline** shape, the **Glossary** of shared terms, the **APML** current state. They are
derived from the code and drift-gated, so they cannot go stale. Schema is the one fact even
the code can't vouch for — current schema is truth, migrations lie — so the Pipeline page
renders it from a live dump of the running database. The **Update docs** button re-reads live
state — course list, audio-pass queue, database counts, the schema dump — from the production
machine on demand; facts derived from code refresh when a commit deploys.
