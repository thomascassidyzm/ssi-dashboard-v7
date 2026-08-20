# The bad English: where it actually lives, and what I changed

**20 August 2026 · Connemara Irish for English speakers (draft, no learner can reach it).
No audio was generated. Not one clip. The course had zero audio rows before this work and zero
after, and no row anywhere else on the estate was touched.**

---

# THE HEADLINE: NO. NONE OF IT IS IN THE ENGLISH SEED TEXT.

Kai asked the only question that mattered before anything got edited: *are these actual issues with
the English seed text?*

**They are not.** I checked both findings against the seed rows themselves, and both seed sentences
are correct English, word for word:

> **Seed 10:** *I'm not sure if I can remember the whole sentence* — correct.
> **Seed 8:** *I'm going to try to explain what I mean* — correct.

Neither the phantom "about" nor the wrong "with" exists in the seed layer. Both live **one level
down**, in material this build generated itself.

And I checked the shared English is genuinely shared and genuinely intact. All four Irish courses —
Connemara, Munster, Ulster and the released one — plus Spanish and French carry those two seed
sentences **identically, character for character**. The 668-seed English set is clean here. Nothing
has propagated, because there was nothing at seed level to propagate.

### Where each defect actually lives

**Finding A — "remember about the whole sentence".** Nine items, all created by this build:

- one **teaching tile** at seed 10, glossed *"about the whole sentence"*
- one **sub-piece of that tile** that gave the bare preposition *ar* its own invented gloss, **"about"**
- **seven practice phrases** at seed 10 that were then written to match the invented gloss
- and one more **teaching tile** at seed 6, *"about a word"*

**Finding B — "explain what I mean with someone else".** **One practice phrase** at seed 8. That is
the whole of it.

### Where they came from — traced

**Finding A was born in this build and exists nowhere else on the estate.** I searched every course
in the system for a teaching tile glossed "about a word" or "about the whole sentence". Exactly two
rows came back, and both are Connemara's. The released Irish course does the same seeds cleanly —
its tiles read *"a word"* and *"the whole sentence"*, with no "about" anywhere. So this is not
inherited English. It is a decomposition mistake made here, on 18 August, when the seeds were split
into tiles.

The mistake is worth naming precisely, because it will otherwise happen again in the 630 seeds still
being built. The Irish verb *cuimhneamh* ("remember") demands the preposition *ar* after it, the way
English "listen" demands "to". *Ar* there carries no meaning of its own — it is grammatical
plumbing. The build split it off as if it were a word to be taught, and then had to invent a gloss
for it. The only English preposition that fits *ar* in a dictionary is "about", so "about" is what it
got. Every one of the seven broken practice sentences was then generated **downstream of that
invented gloss** — the English was manufactured to justify a tile that should never have existed.

There is a second, quieter consequence I found while checking, and it is arguably the more serious
one: **those two tiles did not match their own seed sentences.** A seed's teaching tiles are supposed
to mirror the sentence they come from. The seed says *"I'm trying to remember a word"* — but the tile
said *"about a word"*, a string that appears nowhere in the seed. Same at seed 10. So the fault was
not only bad English, it was a broken seed-to-tile mirror sitting undetected.

**Finding B is not unique to this build, and Kai should know that.** The exact shape — recycling the
"with someone else" tile onto "explain" at seed 8 — appears in **Breton, Cornish, Pennsylvania
Dutch, Romagnol, Turkish, Yiddish and Min Nan**, all at seed 8, all in practice phrases, never at
seed level. It is a phrase-generation habit that repeats wherever a course reuses a seed-5 tile
without checking the verb will take it. **I have not touched those courses** — they are outside this
job — but that pattern is real, it is at least eight courses wide, and it is a candidate for a
proper estate sweep.

### What else is affected — the honest answer

**Nothing yet, and there is a window.** Munster and Ulster have their 668 English seeds loaded but
**have not been decomposed at all** — zero teaching tiles between them as of tonight. The Connemara
fault cannot have reached them because they have not reached that stage. If the *ar* ruling below is
handed to those builds before they decompose seeds 6 and 10, they will never acquire it.

---

# THE CLASH ANALYSIS, DONE BEFORE ANYTHING WAS EDITED

Kai's instruction was to know the blast radius first. I did the whole of this before writing a single
character.

**The one-prompt-one-answer check, whole course, unchanged rule.** I ran the course-builder's own
uniqueness logic — the same text normalisation it uses when it refuses a submission — across every
teaching tile, every tile sub-piece and every practice phrase in the course at once. I did not loosen
it or widen what counts as a collision; I applied the same rule to all rows rather than one seed at a
time.

- **Before any edit: 317 items, 0 collisions.**
- **With all my proposed edits modelled but not yet written: 0 collisions.**
- **After writing them, re-run against the live course: 0 collisions.**

**One real collision was found in modelling, and it changed the fix.** My first sketch simply
renamed the seed 10 tile to "the whole sentence" and deleted the invented "about" piece. That would
have left the tile reading *the whole sentence → ar an abairt ar fad* while its own surviving
sub-piece read *the whole sentence → an abairt ar fad* — **the same English prompt pointing at two
different Irish answers, which is exactly the defect we must never create.** The checker caught it in
the model, before it was real. The fix was to retire the split entirely and make the tile a single
undivided unit, which is the shape the equivalent seed 6 tile already has. That is what shipped.

**On the presentation mirror.** Retiring the split means the tile has no sub-pieces left, so I
deleted both of its sub-piece rows. The tile now matches the seed 6 tile exactly in structure — one
undivided unit, no sub-pieces, no orphan rows pointing at pieces that no longer exist. And as noted
above, the rename **repairs** a mirror that was already broken: the tiles now genuinely appear in the
seed sentences they belong to.

**On approval and re-review.** Nothing was unapproved, because **nothing in this course has ever been
approved** — every seed's approval field is empty, and per the standing finding the course has never
had a content pass. So no approval was revoked and no re-review was triggered by my edits. The
course's own status is still draft throughout.

**On audio.** The course has **zero audio rows and zero linked clips**, verified before and after.
This is the cheap moment and it will not come again: normally editing an English or Irish string
unlinks the clip that was recorded for it and leaves a silent slot. Here there is nothing to unlink.
I re-checked after writing — still zero. **No queued audio pass was needed and none was raised**,
because there is no audio to bring back into line.

**On the build running underneath me.** Seed 13 landed while I was working; the course grew from 317
to 336 items during the session. I re-ran the collision check against the live course after that and
it is still clean. Everything downstream from here will inherit the corrected tiles.

---

# WHAT I CHANGED

Three fixes, all inside this one draft course.

### A — the invented "about", fixed at the cause rather than patched

Kai's instruction was to prefer fixing the decomposition over patching the English string, and not to
invent a gloss for a word with no independent meaning. That is what I did.

- The seed 10 tile is now **"the whole sentence"**, a single undivided unit. The Irish is untouched —
  it still carries its *ar*, silently, where it belongs.
- The sub-piece that glossed *ar* as **"about"** is **gone**, along with the sibling piece that would
  have collided with the renamed tile.
- The seed 6 tile is now **"a word"** instead of "about a word". Its Irish is untouched. Every
  practice sentence at seed 6 already said "a word", so the tile now agrees with its own rows for the
  first time.
- **All seven** broken practice sentences at seed 10 lost the word "about". The Irish did not change
  in any of them. They now read *"to remember the whole sentence"*, *"I want to remember the whole
  sentence"*, and so on.

The corrected English is not my invention — **seeds 11's rows already say it this way** (*"I'd like
to remember the whole sentence"*, with the same Irish). Seed 10 was the odd one out, and now it is
not.

I should flag one thing honestly. Attaching *ar* invisibly to the object tile is the right call here
— it is the only shape that lets the learner produce every sentence in seeds 6 and 10 correctly,
including the lenition (*focal* → *fhocal*) that the preposition causes and that a bare "a word" tile
would hide. But it does mean the tile "a word" carries a preposition inside it. If a later seed ever
needs a bare "a word" with no *ar*, whoever builds it must give that its own tile rather than reuse
this one. That is a note for the build, not a defect.

### B — "with" corrected, and the row kept

The single seed 8 row now reads **"I'm going to try to explain what I mean today"**, with the
matching Irish. I did not simply delete it: deleting would have left that teaching tile one practice
row short of every other tile in the course, all of which carry exactly three build rows and five use
rows. Replacing keeps the shape intact and keeps the row doing its job.

I chose "today" over the obvious "to someone else" deliberately. *"Explain to someone else"* needs a
preposition the learner has never met, so it would have swapped a wrong sentence for an unsayable
one. Every word in the replacement is already taught, and the row now sits as the natural partner of
the row directly above it, *"I'm going to try to say what I mean today"*.

### C — our own mess from earlier tonight, cleaned up

The seed 9 row *"I'm trying to learn a little Irish"* asked for *a fhoghlaim* — a changed form of a
word the course taught six seeds earlier as plain *foghlaim*. Nothing had told the learner the word
changes shape. This was introduced by our own rewrite earlier tonight, and it was the **only**
untaught form in the first ten seeds.

**I could not teach the form there, and I want to be explicit about why**, because "just teach it"
was the obvious option and it is not available. A seed's teaching tiles have to mirror that seed's
own sentence. Seed 9's sentence is *"I have a little Irish now"* — there is no "learn" in it. A "to
learn Irish" tile at seed 9 would have no seed sentence to mirror, and adding one would break the
rule I was fixing a different violation of two paragraphs earlier.

So I used what the learner already has. The row now reads **"I have a little Irish today"**. Every
word is taught, and it does a second job worth having: it drills the *tá … agam* possession pattern
— the construction the seed 9 rewrite introduced, and the one the earlier read flagged as arriving
too thinly. The row count is unchanged.

**The governing test, applied to all three:** a learner seeing only the English prompt, holding only
what the course has taught by that point, can now produce every one of these sentences. Before, they
could not produce any of them.

---

# What I did not touch, and one thing I did not find

- **The word-order finding at seed 8** — the fronted clause, 19 rows — is untouched, exactly as
  instructed. It is still Kai's.
- **Every settled ruling stands.** *Labhairt* is untouched, and so are *amáireach*, *eicínt*,
  *i nGaeilge*, *chuile*, *céard* and *tá muid*. I re-checked after editing: no dialect form moved.
- **I have not found a fourth defect and I am not claiming one.** All three of the findings I was
  sent turned out to be real. None of them was a false alarm, and I would have said so if one had
  been.

# Gaps — the honest list

- **No native Connemara speaker has seen any of this.** That remains the largest gap in the project
  and nothing I did tonight changes it. My corrections are to the **English**; the Irish strings I
  wrote are recombinations of forms the course already uses, not new translation judgements.
- **The eight-course "explain … with someone else" pattern is reported, not fixed.** It is outside
  this job. Somebody should decide whether it warrants a sweep.
- **The build is running while I write.** Seeds past 13 are being produced now. The corrected tiles
  are what they will inherit, but I cannot verify seeds that do not exist yet.
- **Munster and Ulster are clean only because they have not started decomposing.** That is a window,
  not a guarantee. If nobody carries the *ar* ruling to them, they can acquire the same fault
  independently.
