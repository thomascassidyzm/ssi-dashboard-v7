<!-- Course leader / editor persona. Mechanism only. Nav destinations are never
listed by hand here — the {{...Doors}} tokens are expanded from
src/nav/navigation.js at compile time. Checking has no role of its own yet, so
the checker's view lives in the checking section below until auth grows one. -->

## home

Popty is where your courses get made. Two doors matter for you: {{nonAdminDoors}} Everything
you edit here is live content: what the database holds is exactly what learners hear.

## courses

Your row: {{coursesDoors}} The Library is scoped to the courses you've been granted; the rest
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

## checking

Checking a course is reading it the way a learner meets it: does each prompt force exactly one
answer, does every phrase use only what's been taught, does it read naturally in the known
language? The known-vocab flags this pack carries per course are the compiled starting point —
begin where the flags are earliest, because everything downstream builds on those seeds.

## pedagogy

{{pedagogyDoors}} Read it before authoring anything — the method is the product, and every
gate you will meet downstream is that method being enforced rather than the tool being awkward.
