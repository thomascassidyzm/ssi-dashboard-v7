# The Publish step — explainer copy now reaches learners without a deploy

19 August 2026.

## What this changes

Until today, editing the How This Works copy in Popty produced a saved draft that someone
then had to map back into code, on a branch, through a review, on a release train. From now
on there is a **Publish** button next to Save, and the learner app reads the published words
straight from the database.

Explainer text goes to learners **as data, on your timing** — no dev branch, no deploy.

## Save and Publish are different acts

- **Typing** autosaves a draft every couple of seconds, exactly as it did before. It reaches
  nobody. That behaviour is untouched — it is the safety net, and it stays one.
- **Publish** marks the version you are looking at as the live text. Learners see it within
  about a minute.

At the top of the editor there is now one sentence that says what learners are reading right
now, who put it there, and whether the words in the box have reached them. If you read nothing
else on the page, that line tells you where you stand.

## Rollback is just publishing an older version

Press **Earlier versions** and you get every version ever saved, newest first, with the
original copy at the bottom, and a **Publish this version** button on each one.

Nothing is ever deleted or overwritten. Putting an older version back is one click, and coming
forward again is the same click. Every publish is stamped with who did it.

## What a learner sees if anything goes wrong

The words built into the app are still there, and they are the floor. If Popty is slow, or
down, or a heading gets renamed so a section will not parse, the learner silently reads the
old good text. There is no spinner, no error message, no empty panel and no raw markdown — a
learner cannot tell which version they are on, which is the point.

The document's own instruction to its editor still holds and is now load-bearing: **edit the
words freely, but leave the `##` and `###` headings alone.** They are how the edits map back
into the app. If a heading is changed, that one block quietly keeps its built-in wording;
everything else still comes through.

The illustrations, and the web addresses behind the five proof-story links, always come from
the code, never from the document. Editing a link's wording changes what a learner reads;
it cannot change where the link goes.

## What is wired, and what is not

| Surface | Editable | Publishable | Reaches learners |
|---|---|---|---|
| How This Works (`popty.app/htw-copy`) | yes | yes | **yes — wired today** |
| The little walks a learner can ask for | yes | yes | not yet |
| The messages that meet a new learner | yes | yes | not yet |

Publishing works for all three. Only How This Works has a consumer reading it, so for the
other two a publish records an intent that nothing yet acts on. Wiring each is the same shape
of job: point it at the published document and map the headings back into the strings the app
renders.

## Three things worth knowing

**Nothing has been published yet.** All three surfaces are sitting on their drafts, and every
learner is reading the words built into the app. The first publish is deliberately yours or
Aran's — the machinery is in place and has not been fired.

**Anyone signed in to Popty can publish**, which is the same gate as editing. That is on
purpose: every publish is attributed by email and reversible in a click, so attribution and
undo do the work a narrower gate would have done. If you would rather it were a named list,
that is a one-line change.

**The code is not on production.** The Popty changes and the learner-app changes are both on
branches awaiting your word. What bypasses the branch train is the *text*, once the code is
live — not this first release of the code itself.
