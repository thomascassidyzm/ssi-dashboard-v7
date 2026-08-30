# The Connemara Irish course — where it actually is

**20 August 2026. Everything below was counted from the live database today.**

---

## First: which course this is

This report is about **Connemara Irish for English Speakers** — course code `gle_cn_for_eng`.

- **Created:** 18 August 2026, 10:08 in the morning.
- **Status:** draft. Not available to any learner, by any route.
- **Last time anything in it changed:** 18 August, 16:31. Nothing has moved in it for two days.

**How I know this is the one you meant, and not the other one.** There are three Irish courses in
the database. *Irish for English Speakers* is the released one — it has been open to learners since
January, it has 25,308 recordings, and its state was written up separately. *Chinese for Irish
Speakers* is a five-sentence stub. The third is this one: a **separate course, created two days ago,
still in draft, with no audio at all** — a deliberate dialect rewrite of the Irish course, using
Connacht words where the released course uses Munster ones. It is the only Irish course in the
estate that is genuinely in build. An earlier survey today looked at the released course by mistake;
this one does not touch it except as a yardstick.

---

## The finding, first

**The course is 5% built and it stopped two days ago — but the thing actually blocking it is not the
missing 95%. It is that no person who speaks Connemara Irish has heard a single word of it.**

The Irish in it was reconstructed by an agent from two written corpora, argued carefully, and it is
genuinely Connacht — 29 of the 36 finished sentences carry a positive Connemara marker and **not one
carries a form that is wrong for the dialect**. But two of the highest-stakes decisions in it were
explicitly flagged at the time as *"needs a native ear"*, and they are still standing, unheard. Every
new sentence built on top of them makes reversing them more expensive — the build's own notes put
the cost of reversing just one of them at 3 sentences, 2 tiles and about 60 practice lines **as of
two days ago, and rising**.

The second thing worth knowing: **the course is set up to be spoken by two synthetic standard-Irish
voices, copied wholesale from the released course** — the settings still carry the released course's
own name inside them. Irish does not appear anywhere in the table that says who records which
language. So a course whose entire reason for existing is the Connemara accent currently has no plan
for who or what speaks it, and its own accent label reads "standard".

---

## 1. How far it has got

| | Connemara Irish (in build) | Southern Welsh (released, my yardstick) |
|---|---|---|
| Sentences written in English | 668 | 668 |
| …with Irish/Welsh actually written | **36** | 668 |
| …broken into teaching tiles | **12** | 668 |
| Teaching tiles | **35** | 679 |
| Practice sentences | **266** | 5,365 |
| Recordings | **0** | 20,770 |
| Sentences signed off by anyone | **0** | — |

I chose **Southern Welsh for English Speakers** as the yardstick because it is finished and released,
and because it is built from the *same 668 English sentences*. It is a like-for-like target.

**Where it stands phase by phase:**

- **English side — done.** All 668 sentences are there, inherited intact from the released Irish
  course. This is finished work that does not need redoing.
- **Translation — 36 of 668 (5%).** The other 632 sit as English-only shells.
- **Breaking into teaching tiles — 12 of 668 (2%).**
- **Practice generation — done for those 12 sentences**, 266 lines, nothing starved: the thinnest
  sentence has 9 practice lines, the fattest 42.
- **Audio — nothing.** Zero recordings, and not one line in the course is even pointed at a
  recording belonging to another course. This is a clean nothing, not a broken something.
- **Learner-facing map — not built.** No learner can reach any of it.

In plain terms: **it got twelve sentences into a 668-sentence course in a single day's work, and
stopped.**

---

## 2. Quality of what exists

**The good news, and it is real.**

- **The dialect is genuinely Connemara.** Counted live: the Connacht word for "how" appears 39 times
  and the Munster one **zero**; the Connacht "what" 40 times and the Munster one **zero**; the
  Connacht "able to" 36 times and the alternative **zero**. Nine sentences carry a strong,
  unmistakable Connemara marker. **No sentence contains a form that is wrong for the dialect.**
- **The eleven big word-choice decisions taken on 18 August were all actually applied.** All
  twenty-two checks of "was this decision carried into the live text" came back yes, with no drift.
  That is unusually clean.
- **No sentence contradicts another.** The rule that one English prompt must always produce the same
  Irish holds across all 337 items with zero violations.
- **The Irish tiles fit their sentences perfectly** — all twelve break down and reassemble exactly.

**The bad news.**

- **Nobody has reviewed it.** Not one sentence is approved, not one flagged, not one practice line
  marked as checked. Every change record from the build day is attributed to the machine, not a
  person. The build's own write-up says it plainly: *"No native Connemara speaker has seen any of
  this."*
- **Two decisions were flagged for a native ear and are still unanswered** — the form used for "I
  speak", which the build itself rated low-confidence, and one phrasing at sentence 3 whose entire
  support is a **single hit in a 15,904-item corpus**.
- **The spelling is deliberately standard, against the dialect.** Two words are spelled the standard
  way where the Connemara corpus runs strongly the other way (58 against 18 for one, 22 against 1
  for the other). This was a knowing policy call — Connemara vocabulary, standard spelling — and it
  is explicitly recorded as your line to move, not the agent's.
- **Fourteen practice lines are in broken English.** Seven on sentence 10 say things like *"I want to
  remember **about** the whole sentence"*; seven on sentence 12 strand a word and end up meaning
  something different from the Irish they are teaching. This is a build rule, good for the Irish
  side, dragging an Irish preposition into the English. Nothing has been spoken aloud, so it costs
  only a text fix.
- **One teaching tile at sentence 3 shows Irish that does not appear in its own sentence** — a
  leftover from a decision that was reversed mid-build. Learners see these tiles.

**Has it been through the checks?** Yes, and I ran them again today rather than trusting the notes.

- The English-vocabulary check **does run** on this course, and it is awake — the same check on the
  released Irish course produces 1,128 flagged lines, so a number from it means something. On the
  Connemara course it flagged 41 lines. **All 41 are the same false alarm**: one word, on two
  sentences, caused by the checker expanding "I'd like" into "I would like" and then not recognising
  "would". **The real count of untaught English words in this course is zero.**
- **There are no reference decompositions for Irish.** The estate has them for three other language
  pairs and none for Irish, standard or Connemara. There is also no Irish-specific rulebook — the
  course is checked against the shared English fallback. So while the word choices were calibrated
  carefully against corpora, **the method of breaking sentences into tiles has never been calibrated
  for this pair.**
- Separately, the build tool **cries wolf**: a warning fires on about one line in five, on every
  course with English as the known side, for a reason that can never be satisfied. It is a known
  fault with a written diagnosis and it is still unfixed. It doesn't damage content — it trains
  people to ignore warnings.

---

## 3. Audio

**There is none. Not one recording, machine or human.** Nothing is half-done and nothing is silently
broken; the audio phase has simply never started. No money has been spent on this course.

What is *configured*, though, matters:

- The course's voice settings are a **word-for-word copy of the released Irish course's**, down to
  carrying that course's own name inside them. They name **two synthetic Microsoft Irish voices**,
  Orla and Colm — standard Irish, not Connemara.
- **Irish is not in the casting table at all.** That table — the one that says which real people
  record which language — holds five entries: Breton, Pennsylvania Dutch, Finnish, Welsh, and a test
  entry. There is no Irish row, so there is no recording queue for it and nobody to put in one. Of
  the 17 real human voices on the books, **not one is an Irish speaker**, and **no human recording
  session has ever been logged for either Irish course** — this one or the released one.
- **The course's own accent label says "standard".** The recording system now routes lines to
  recordists by that label. If human recording for Irish ever began, this course's Connemara lines
  would be routed as standard Irish — the exact mistake that recently sent 197 Southern Welsh lines
  to two Northern speakers.

**Costing it out (nothing generated, no money spent).** Fully voicing all 668 sentences would need
somewhere between **20,000 and 56,000 clips** — the finished Welsh course implies the low end, the
released Irish course the high end, and the honest answer is that it depends on how densely the
remaining sentences get practice lines. In synthesis fees, even the high end is about **£25–£40**.
So: **tens of pounds, not hundreds, on any reading. The cost is not the money. It is that spending it on standard-Irish
synthetic voices produces a Connemara course spoken in the wrong accent**, and no synthetic
Connemara voice exists to buy instead. That makes audio a *decision* that hasn't been made, not a
bill that hasn't been paid.

---

## 4. What is blocking it — ranked

**Stuck (needs a person, not more work):**

1. **No native Connemara speaker has reviewed anything.** The whole justification for a second Irish
   course is dialect authenticity, and the dialect in it is an agent's careful reconstruction from
   books. Two calls were flagged as needing a native ear and never got one. **This gets more
   expensive every day it waits**, because reversal cost grows with every sentence built on top.
2. **Nobody has decided who or what speaks Connemara.** No native voice is cast, no synthetic
   Connemara voice exists, and the current settings would deliver standard Irish. Until this is
   answered, the audio phase cannot honestly start — and the accent label being wrong means the one
   automated route that exists would send the work to the wrong place.
3. **A policy question left open on purpose:** Connemara words in standard spelling. It is recorded
   as yours to settle, and it is cheap to change now and expensive later.

**Not done (just work, nobody is stuck):**

4. **632 sentences have no Irish; 656 have no teaching tiles.** The build stopped on 18 August. There
   is no sign anything is wrong — it simply stopped. At the rate of the one day it ran, this is
   weeks of work.
5. **The 14 broken English practice lines and the one wrong tile.** Small, text-only, nothing spoken
   yet, cheap to fix — and cheapest right now, before any of it is recorded.
6. **No reference decompositions and no Irish rulebook for the checks.** Worth having before 656 more
   sentences are broken up by the same uncalibrated method.

---

## 5. The one next thing

**Sit one native Connemara speaker down with the 36 finished sentences and the two flagged questions
before another sentence is built.**

**Better:** it is the only thing that can validate the premise of the entire course, and it answers
the two decisions everything else will be stacked on. **Simpler:** it is 36 sentences and about six
questions — one sitting, no tooling, no build, no rebuild. **Cheaper:** it costs an hour of one
person's time and nothing in the system; done after another 200 sentences it costs a re-translation.
Right now the whole reversal surface is 36 sentences, 35 tiles and 266 practice lines with no audio
attached to any of it — **the cheapest this decision will ever be.**

---

*Method note. Three of us worked on this. I identified the course and measured its size, its English
side, its voice settings and the casting table myself; two colleagues went deeper — one at the audio
and recording routing, one at the quality checks, the dialect evidence and the review trail. Every
headline number here was taken from the live database today, not from a document. Where I quote the
build's own corpus counts for Connemara — the dictionary and the Ó Curnáin volume — I am quoting a
document dated 18 August, not a measurement of my own; that is the one place in this report where I
am trusting someone else's counting. No audio was generated and no money was spent.*
