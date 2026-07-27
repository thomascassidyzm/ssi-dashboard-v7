<!-- ssi-admin persona. Mechanism only, never restated state. The drift gate
requires every surface an admin can stand on to be named here. -->

## home

Popty is where courses get made — everything a learner ever hears starts here and flows
through Supabase to the learning app. Three doors at the top: **Courses** is the library and
every working surface inside a course, **Docs** is the methodology reference, and **Admin** is
the platform room — the whole estate at a glance.

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
granted courses, recorders only ever see the Record Room.

## docs

Docs is the written methodology — the why behind the gates. The pages there are hand-written
reference; the facts that can rot, like gate lists and pipeline shape, are compiled from the
code itself and live in this pack instead.
