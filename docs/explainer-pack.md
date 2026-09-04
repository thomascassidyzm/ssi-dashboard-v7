# Popty explanation pack — compiled render

**Version `f6d60e628056` · generated 2026-09-04 by `tools/explainer/compile.mjs`. DO NOT EDIT — edit the rulings/rules and recompile.**

Truth: roles admin/editor/recorder · workflow "Phase 1 → 3 → 8 → 9" · 18 gates · max LEGO syllables 8 · human-voice: cym_n_for_eng, cym_s_for_eng, bre_for_fra, pdc_for_eng + cym_* prefix · 17 pair contracts · snapshot: 98 courses.

## admin

### home

Popty is where courses get made — everything a learner ever hears starts here and flows
through Supabase to the learning app. The doors at the top: **Courses** — The course library, the canonical browsers, and every working surface inside a course. **Pedagogy** — The founder's teaching model — what a LEGO is, the extraction heuristics, and ZUT. **Admin** — The platform room — labs, insights, activity, maintenance, users, recording and builds.

### courses

Each course card opens on its Overview hub — one door per course, with every working surface
as a card inside: text generation, audio, recording, QA. Course content lives in the database,
not in files; what you see here is what learners get. Text edits never mint audio by
themselves — a content pass ends by queueing an audio-pass request, and audio is only ever
generated after an approved pass, because every minted clip costs real money.

### admin

The Admin section is the platform-wide view, and the hub page is the same list read as cards:
**Labs** — Every lab in one place — Listening, Speaking, Voice, Pod, Script, VAD, Basket and Capture A/B — grouped by blast radius: who a change reaches, and when. **Insights** — Cross-course insight boards — lifecycle, rate, coverage, content, and ops signals. **Activity** — Running and recent jobs across the production pipeline — what is building right now. **Maintenance** — Housekeeping and health — audit log, archive, and platform upkeep. **Users** — Manage dashboard accounts, recorders, roles, and invite codes. **Recording** — Which languages we record with people instead of TTS, how far each has got, and the link to send each recordist. **Test builds** — The current Android test build, how to install it, and where it came from. **Stock-take** — The compiled current-state reference — pipeline, glossary and APML, regenerated from the code. Access lives under Users: admins see everything, editors are scoped to their
granted courses, recorders only ever see the Record Room. The Maintenance badge counts days
since the last audit, so a growing number is the system telling you it hasn't been checked.

### pedagogy

The app teaches itself — that replaced the old docs-and-manuals shelf. **Pedagogy** — The teaching model itself — the two extraction heuristics, what a LEGO is, and why ZUT decides. It is
the founder's own thinking rather than system state, which is why it doesn't rot; the facts
that CAN rot live in Stock-take instead, compiled from the code.

### stocktake

The Stock-take room is where the facts that can rot live as compiled renders:
**Stock-take** — The index of the compiled reference — what each derived page covers, and when it was compiled. **Pipeline** — The phase servers, the agent endpoints, the validation gates and the database tables the code actually touches. **Glossary** — The shared terms, each pinned to the table that holds it or the gate that enforces it. **APML** — The specification lineage, and the current-state facts it is checked against. They are derived from the code and drift-gated, so they cannot go stale.
Schema is the one fact even the code can't vouch for — current schema is truth, migrations lie
— so the Pipeline page renders it from a live dump of the running database. The **Update docs**
button re-reads live state — course list, audio-pass queue, database counts, the schema dump —
from the production machine on demand; facts derived from code refresh when a commit deploys.

## editor

### home

Popty is where your courses get made. Two doors matter for you: **Courses** — The course library, the canonical browsers, and every working surface inside a course. **Pedagogy** — The founder's teaching model — what a LEGO is, the extraction heuristics, and ZUT. Everything
you edit here is live content: what the database holds is exactly what learners hear.

### courses

Your row: **Library** — Every course on the estate, with its state, opened for editing. **Seeds** — The canonical seed sentences, in pedagogical order, with their {target} placeholders. **Content** — The canonical content store — seeds, encouragements and the per-pair welcome messages. **Pods** — The listening pods — the canonical English master and the pods generated from it. **Script Lab** — The canonical English master scripts — edited here, and nowhere else. **Metagraph** — The shape the scripts are walks over — what the learner has to survive, in delivery order. The Library is scoped to the courses you've been granted; the rest
are windows onto the canonical material in the database. **Script Lab** is the odd one: it
holds the pod scripts themselves, the language-neutral English masters, with no course loaded.
Editing a script there changes the source every course flexes from and changes no generated
pod, so a script edit reaches learners only when a pod is built from it again. Its read-out is
coverage — which shapes the script's walk reaches, and which it never does. **Metagraph** is
that coverage drawn out: every shape a conversation can take, taken from the pods already
written, joined by which shape happens inside which, and a pod is a walk through it. Lay a pod
over the graph and the shapes its script reaches light up, the ones it never reaches go red.
Nothing there can be edited — it is the picture, and the editing is back in the Script Lab. A
course opens on its **Overview** hub — one door per course, every working surface a card
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

### pedagogy

**Pedagogy** — The teaching model itself — the two extraction heuristics, what a LEGO is, and why ZUT decides. Read it before authoring anything — the method is the product, and every
gate you will meet downstream is that method being enforced rather than the tool being awkward.

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
