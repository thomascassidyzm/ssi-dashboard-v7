# Your flags now close themselves — and the three Finnish fixes

*fin_for_eng · 2026-08-21 · everything below is live in the database and in the tool you proofread in*

---

## 1. A resolved flag closes itself, and the row comes back unaccepted

The proofreading tool knew only **ok** and **flagged**, and nothing in any fixing path
wrote back to it — so a flag you left stayed open in your queue forever after the row
had been fixed, and agents were clearing them by hand. That is now done by the tool.

**What happens now.** A flag quietly records what the row said when you left it. The
next time the tool reads the course, the flag closes by itself if, since you flagged it:

- the row was **edited** — the ordinary fix;
- the row was **deleted** — as your `kysyä` flags were resolved, by pulling six phrases
  outright;
- **phrases were added to or removed from its seed** — which is how your seed 105 note
  ("we could also add some *she didn't know*s") gets resolved without the flagged row
  itself ever changing.

**It closes to unchecked, never to ok.** The row goes back to never-looked-at, so it
comes round to you again, and its seed cannot be approved while it sits there. If the
seed was already approved, that approval is removed. Nothing in this path ever approves
anything — that stays your call, which is exactly what you asked for. Your note is kept
and shown on the row when it comes back: *"a flag you left here has been resolved — the
row was edited. You wrote: …"*

**Why it is decided on the tool's own read rather than in an edit screen.** Course rows
are edited from half a dozen places that know nothing about this tool — psql by hand,
the course-builder API, dashboard views, agent scripts. A hook on any one of them leaves
the other five dangling flags, which is the bug. The tool's own live read is the one
place that sees every edit, whoever made it.

**Seen working, not read in the code.** Both of your open flags closed themselves on the
first live read after the change went in, as the fixes below landed:

| Your flag | Your note | Why it closed |
|---|---|---|
| seed 54, *I want to give something to her friend* | "reads a bit awkward." | the row was edited |
| seed 105, *he didn't know her name* | "this is fine, but we could also add some \"she didn't know\"s in here, you know?" | the seed it sits in changed |

Both rows now show as unchecked and unaccepted, with your note on them. The end-to-end
loop — flag a row, fix it, watch the flag close and the seed lose its approval — was also
run start to finish on a throwaway test course, including the delete case, and the page
was checked in a real browser rather than by reading the response.

---

## 2. Seed 54 — the `kaverillensa` family

`-nsa` is anaphoric: it binds to its own clause's subject. Three things were wrong, and
seed 53 already teaches the repair (*se halusi laittaa **sen** kirjeen **laukkuunsa***),
so nothing is taught before its time and `kaverille` — a seed 306 card — is not used.

| Seed | English before → after | Finnish before → after |
|---|---|---|
| 54 | *I want to give something to his friend* → **he wants to give something to his friend** | *mä haluun antaa jotain kaverillensa* → **se haluu antaa jotain kaverillensa** |
| 54 | *she wanted to give something to **his** friend* → **she wanted to give something to her friend** | *se halusi antaa jotain kaverillensa* → **unchanged** |
| 54 | *I want to give something to her friend* → **we wanted to give something now** | *mä haluun antaa jotain kaverillensa* → **me haluttiin antaa jotain nyt** |
| 185 | *I reckon that she gives it to **his** friend* → **…to her friend** | *mä luulen, että se antaa sen kaverillensa* → **unchanged** |

All 18 phrases in the family were read, not a sample. The other 14 keep `kaverillensa`
untouched: every one has a third-person subject or no subject at all, so the suffix is
licensed. Your seed 52 duplicate pairs were left alone deliberately — you passed those
three rows at 09:13 and flagged the unbound one at 09:14, so the record says you had
already ruled on them.

**Still open, and worth a look:** the same defect sits in the `siskolleen` family at
seed 332 (two rows). A worker is applying the same repair there now; it is a different
lego with its own vocabulary window, so it is being swept and reported separately.

## 3. Seed 105 — the "she didn't know" mirrors

Your row is untouched. Three mirrors added, so the pattern is taught from both sides
(all eleven teaching rows in that lego previously began *he didn't know*):

| English | Finnish |
|---|---|
| she didn't know the answer | se ei tiennyt vastausta |
| she didn't know what to say | se ei tiennyt mitä sanoa |
| she didn't know her name | se ei tiennyt sen nimeä |

Every word was already taught before seed 105 — *vastausta* at 66, *mitä* at 8, *sanoa*
at 4, *sen* at 20, *nimeä* at 21 — and `sen nimeä` keeps the seed 20/21 genitive-vs-
partitive split intact. Three rather than one or ten follows the course's own mirror
precedent at seed 52 (3 her-side rows on an 8-row lego). Added through the additive path,
so no existing row or audio link moved.

## 4. Seed 380 — `kysyä` takes a partitive object

Fixed rather than pulled, as you ruled — there is no learner-confusion argument here.

| Seed | English | Finnish before → after |
|---|---|---|
| 380 | I asked it on Wednesday | mä kysyin **sen** keskiviikkona → mä kysyin **sitä** keskiviikkona |
| 380 | I asked it on Monday | mä kysyin **sen** maanantaina → mä kysyin **sitä** maanantaina |
| 382 | did you ask that | kysyitkö sä **sen** → kysyitkö sä **sitä** |

The sweep was the whole course and the whole error class, not the `nim*` pattern the
earlier pass used: 237 `kys*` phrase rows adjudicated by hand, plus all 14 `kys*` legos
and all 21 `kys*` seed sentences. One row beyond the two you named — *did you ask that*
at seed 382. `sitä` is taught as a bare partitive object at seed 37, long before every
row that now uses it. Left alone on merit: `kysyä muutaman kysymyksen` (a cognate object,
where a total object is correct), `vastata kysymykseen` (a different verb), and `sen` as
the object of other verbs. Nothing of the class remains anywhere in the course.

---

## Approvals and audio

**One seed unapproved: seed 54.** Every other seed touched — 105, 185, 380, 382 — was
already unapproved before this work. Counted independently: 102 approved seeds before,
101 after. Nothing was approved by anyone.

**No audio was generated, deleted or orphaned.** None of the rows touched carries any
audio link.
