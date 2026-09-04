<!-- ssi-admin persona. Mechanism only, never restated state. Wherever a
sentence would have to list nav destinations, it uses a {{...Doors}} token
instead: the compiler expands it from src/nav/navigation.js, so this file
never has to be edited when a page arrives, moves or goes. -->

## home

Popty is where courses get made — everything a learner ever hears starts here and flows
through Supabase to the learning app. The doors at the top: {{primaryDoors}}

## courses

Each course card opens on its Overview hub — one door per course, with every working surface
as a card inside: text generation, audio, recording, QA. Course content lives in the database,
not in files; what you see here is what learners get. Text edits never mint audio by
themselves — a content pass ends by queueing an audio-pass request, and audio is only ever
generated after an approved pass, because every minted clip costs real money.

## admin

The Admin section is the platform-wide view, and the hub page is the same list read as cards:
{{adminDoors}} Access lives under Users: admins see everything, editors are scoped to their
granted courses, recorders only ever see the Record Room. The Maintenance badge counts days
since the last audit, so a growing number is the system telling you it hasn't been checked.

## pedagogy

The app teaches itself — that replaced the old docs-and-manuals shelf. {{pedagogyDoors}} It is
the founder's own thinking rather than system state, which is why it doesn't rot; the facts
that CAN rot live in Stock-take instead, compiled from the code.

## stocktake

The Stock-take room is where the facts that can rot live as compiled renders:
{{stocktakeDoors}} They are derived from the code and drift-gated, so they cannot go stale.
Schema is the one fact even the code can't vouch for — current schema is truth, migrations lie
— so the Pipeline page renders it from a live dump of the running database. The **Update docs**
button re-reads live state — course list, audio-pass queue, database counts, the schema dump —
from the production machine on demand; facts derived from code refresh when a commit deploys.
