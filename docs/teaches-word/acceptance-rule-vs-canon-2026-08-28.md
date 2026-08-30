# The acceptance rule, against what the canon actually says

Kai gave the acceptance rule directly on 2026-08-28 and said this kind of rule is already recorded
in `docs/course-methodology-canon.md`. It largely is. Where the canon is on point I have used its
wording verbatim in the reader instructions rather than a paraphrase. Three places need flagging,
and in none of them have I silently picked a side.

## Where the canon says it plainly, and I used its words

**The asymmetry itself is canonical, and it points the way Kai said.**

> **K8** — "The TARGET side stays strict, always. Every target sentence tiles from taught chunks,
> no exceptions. K6 and K7 are known-side latitude only."

> **K6** — "The known side MAY use uninstructed forms of taught words; only genuinely different
> WORDS are defects… the known can use a different case, or conjugation, contraction, gender or
> whatever if it needs, even if it isn't introduced… They'll try with the closest thing they know,
> and be pleasantly surprised." — "The controlled-language constraint on the known side is about
> LEXEMES, not surface forms."

**The automaticity test** Kai described is the canon's K7 tier 1 versus tier 2: tier 1 is "a
contraction, gender, case or conjugation of a word they know" (fine), tier 2 is "a *distinct
lexeme* for a concept whose mapping they were taught differently", which "to the learner… feels
like a whole new word".

K7 also says something this whole exercise should be measured against: **"This adjudication needs
language knowledge, not string matching. A matcher cannot place a finding on this scale."** That
is the argument for the rebuild, written down before the rebuild was asked for.

## Discrepancy 1 — "splitting is allowed" versus P2's wording

Kai's rule: *a multi-word LEGO MAY be broken up — another word inserted between its words — where
the sentence needs it. That is acceptable.*

The canon's nearest sentence reads, on its face, the other way:

> **P2** — "Phrases tile from WHOLE already-introduced chunks, **never re-split into words**." …
> "if a wording needs a form you have not introduced as a whole chunk, it fails"

**These are about different things and I do not believe they actually conflict.** P2's "never
re-split into words" governs *what the author may draw on* — you may not take a taught chunk apart
and reuse one of its words as though that word had been taught on its own. Kai's rule governs
*where the chunk's words may sit in the sentence* — the chunk is used whole, with every word
present in its taught form, and ordinary grammar is allowed to put something between them.

**The running code already resolves it Kai's way**, and has for as long as the gate has existed:
`checkWordContainment` (`services/course-builder/lib/text-normalization.cjs:43`) requires every word
of the LEGO target to be present in the phrase *in any position*, and it is the default path for
every space-delimited language at submission time. Splitting passes; a changed form does not.

I have built to Kai's rule and the code's behaviour. **Flagging it because the canon's wording,
read alone, would send a careful agent the other way.**

## Discrepancy 2 — the mild-mutation tolerance is not in the canon at all

Kai's rule: *the only tolerable variation is a difference so slight a learner would barely perceive
it: a mild softening mutation, or a slightly different vowel ending.*

I can find no statement of this anywhere in the canon, and the code has no such tolerance —
`checkWordContainment` compares normalised strings for equality, so `Cymraeg` and `Gymraeg` are
simply different words to it. K8's "no exceptions" is, if anything, stricter than Kai's rule.

So this is **new latitude, granted today, not recorded anywhere**. It is real and it matters: on
the first probe of Welsh target rows the reader used it twice in twelve items, correctly
(`cofio`/`gofio`, `gwella`/`wella`), and without it those would both have been false accusations.
**It belongs in the canon.**

## Discrepancy 3 — what the first run got wrong, and why it is worth recording

The first run of 2026-08-28 used ONE reading instruction for both sides, and it was the *known*
side's. On the target side it therefore accepted any inflected form as a pass. Worse, the
pre-filter cleared the target side on plain substring, so an inflected form was discarded before
any reader saw it — `parle` cleared by `parlerai`.

The retrospective check was **looser than the write-time gate it was supposed to be policing**.
Every target-side number in that run understates, and they have been re-read rather than corrected
in place.

## What I did not do

I have not changed the canon. Adding K6a/K8a for the mutation tolerance, and a clarifying clause on
P2, is Kai's call, not mine — canon §7 reserves methodology rulings to him.
