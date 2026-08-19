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

**This is live in production.** Popty and the learner app are both shipped. How This Works is
published at its frozen original, which the app renders identically to the words it already
shipped — so nothing a learner reads has changed by a character, but the text now genuinely
comes from the database. Your next edit plus Publish is the first one that will change what
learners see. The other two surfaces are still unpublished.

**Anyone signed in to Popty can publish**, which is the same gate as editing. That is on
purpose: every publish is attributed by email and reversible in a click, so attribution and
undo do the work a narrower gate would have done. If you would rather it were a named list,
that is a one-line change.

**The learner-app release carried the A-159 work with it.** Landing this through the normal
train promoted everything that was sitting on staging — the explainer wall, the Library hub,
the fonts, the in-app browser. Promoting also meant resolving a collision between the Arabic
bidi fix on main and the font work on staging; both are kept, because they set different
things. All 2,358 player tests pass, including the six bidi ones, but that resolution touches
Arabic and Urdu rendering and deserves a look from whoever owns those plates.
