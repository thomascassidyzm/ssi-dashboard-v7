# Connemara Irish, seeds 1–10 — read as a learner, and read as a grammarian

**20 August 2026.** Connemara Irish for English speakers. **No audio was generated — not one clip.
No text was changed. This is a read.** The course has zero audio clips before this read and zero
after, it is still a draft no learner can reach, and the released Irish course was not touched.

Every item in seeds 1–10 was read: **10 seed sentences, 26 teaching tiles, 182 practice phrases —
218 items, no sampling.**

---

## The sequencing gate, and a warning about timing

I was told to confirm seed 9 had moved to the "I have Irish" idiom before auditing anything.

**When I first looked, it had not.** Seed 9 still read *Labhraím beagán Gaeilge anois*. I read the
two evidence documents and pulled the rest of the course while waiting. **The rewrite landed while I
was working**, and I re-pulled and re-ran every check against the new text. Everything below
describes the course **after** that rewrite. Seed 9 now reads:

> **I have a little Irish now** — *Tá beagán Gaeilge agam anois*

Seeds 13, 14 and 22 moved at the same moment and are consistent with it.

**One thing about timing.** While I was reading, three build jobs were already running: the Connemara
build onward to seed 300, and full 668-seed builds of **Munster (Kerry)** and **Ulster (Donegal)**
Irish. The build is not "about to" start — it has started. The first two findings below are about
patterns that repeat in every seed that follows, so they get dearer by the hour.

---

## What I checked and found clean — this part is a real result

- **The one-prompt-one-answer rule: 0 violations across all 218 items.**
- **Vocabulary introduction: clean, with exactly one exception** (finding 6). Every English word and
  every Irish word is introduced on a teaching tile before any practice phrase uses it. I checked
  this mechanically, word by word, in course order. That is not common.
- **No bracketed glosses anywhere** — nothing that would be read aloud by mistake.
- **Every dialect rail holds.** *i nGaeilge* 27 and *as Gaeilge* zero; *eicínt* 42 and *éigin* zero;
  *amárach* zero; *céard* with *cad* zero; *chuile*, *tá muid* — all correct. The banned *ag triail*
  appears nowhere. Lenition after *ar* is right in all 12 places.
- **The verbal noun *labhairt* at seeds 1, 3 and 5 is correct and untouched**, per the standing ruling.
- **Seeds 3 and 4 having sentence fragments as their English is not a fault of this build.** I
  checked: that is the estate-standard English, word for word identical in Spanish, French and the
  released Irish course.
- **Seed 8's *iarracht a dhéanamh* does not need a preposition before the verb that follows.** I had
  this on my list as a possible error and dropped it; a corpus check (job **#526**) confirms the drop
  and corrects the reason — the dictionary pairs *ar* with *thabhairt*, not with *déanamh*, which is
  listed bare. Separately, *iarracht* still has no running-speech attestation in Connemara at all,
  which is the standing flag on seed 8 and it stays on.
- **The seed 9 rewrite left no loose ends** — no orphaned rows, and the course still has zero audio.

---

# THINGS THAT ARE WRONG

## 1. Seed 5 — "I'm going to" is not said this way in Connemara, and it is already in 41 rows

> **Seed 5:** I'm going to practise speaking with someone else
> **Irish:** ***Tá mé chun** labhairt a chleachtadh le duine eicínt eile*
> **Tile:** I'm going to — ***tá mé chun***

**This is the finding I would act on first, and it was not on anyone's list.** It came out of a
corpus check I commissioned (**#526**) on a hunch, and the answer is blunt:

- ***chun* followed by a verb-noun: 0** across all four volumes of the Connemara dialect monograph.
- ***tá X chun*: 0.**
- *chun* barely exists in the dialect at all — 59 tokens, and the dialect's own form is *un*, indexed
  flatly as a plain preposition **with no "going to" sense whatsoever**.
- **What Connemara actually says is *ag goil / ag dul a* + softened verb-noun**, with no motion in it:
  *céard tá muid **ag dul a dhéanamh** anois?*

**The exposure, counted today: 38 practice rows, 1 teaching tile and 2 seed sentences in seeds 1–10
alone — 41 rows.** And it is not contained: *"I'm going to"* is a reusable tile, **22 of the 668
seeds** carry "going to" in their English, and the pattern is fixed by the one-prompt-one-answer rule
**at seed 5**, so everything built after it inherits it. The Connemara build past seed 36 is running
right now and is laying down more of it as I write.

**One honest caution, and #526 raised it against itself.** All three course corpora use *tá mé chun*
heavily — but the two comparison corpora are standard Irish built from the same seed set by the same
pipeline. That is **one pipeline habit, not three independent votes.** The only genuinely Connemara
source says zero.

**Recommended fix:** *Tá mé ag goil a chleachtadh…* — but the exact shape is a translation decision
across 22 seeds, so this needs your ruling rather than my patch.

**Confidence: confident** that *tá mé chun* is not Connemara · **best attempt** on the replacement
wording.

---

## 2. Seed 8 — the clause is in the wrong place, and it will be misread as something else

> **English:** I'm going to try to explain what I mean
> **Irish now:** *Tá mé chun iarracht a dhéanamh **céard atá i gceist agam** a mhíniú*

Irish puts an object **before** the verb-noun — *Gaeilge a labhairt*. That slot takes a **noun**.
Here a whole **clause** has been pushed into it.

I counted both orders myself before commissioning anything:

| where | clause **after** the verb-noun | clause **fronted** |
|---|---|---|
| released Irish course | **32** | 8 |
| legacy Irish corpus (15,904 items) | **9** | **0** |
| **this Connemara build** | **0** | **17** |

**#526 then settled it against the dialect itself: the fronted pattern is 0 across all four volumes,
and verb-noun-then-clause is 13.** The citation is your own sentence in reverse — *níl mé i ndan **a
rá** céard a dhíonthas mé*, "I'm not able to say what I'll do." The grammar section on embedded
questions gives four examples and every one has the clause **following** its governor, including a
minimal pair where a real noun phrase fronts and the *céard*-clause sits after it.

**And there is a second problem I did not have, which is worse than the first.** The pattern *is*
attested 21 times — but only as *céard a bhí tú a rá*, "what were you saying", where *céard* is a
bare pronoun that is itself the object. **The two are identical as strings.** So a Connemara reader
meeting *céard atá i gceist agam a mhíniú* will parse it on the attested pattern and get roughly
**"what I'm on about explaining"** — not "explain what I mean". The sentence does not merely read
oddly; it reads as something else.

**Scope: the seed sentence and 16 practice rows, all at seed 8.** (#526 makes it 18 rows, counting
the teaching tiles in — same rows.)

**Recommended fix:**
> *Tá mé chun iarracht a dhéanamh **a mhíniú céard atá i gceist agam***

Note the tempting alternative *an rud atá i gceist agam* is **not** better for this dialect: it is
the paraphrase the grammarian himself reaches for, but that heavy shape is **0** in Connemara and
attested only in standard Irish.

**Confidence: confident.**

---

## 3. Seed 10 — "how to" is used in a way Connemara does not use it, in 12 rows

**The standing ruling on this is not being reopened.** That ruling examined the **standalone**
fragment — seed 3's *"how to speak as often as possible"* — and ruled **keep**. It stands.

What I am reporting is the **embedded** case, which is a different construction and was not what was
ruled on:

> I'm not sure **how to** speak — *níl mé cinnte **cén chaoi** labhairt*
> I'm trying to learn **how to** speak Irish — *tá mé ag iarraidh foghlaim **cén chaoi** Gaeilge a labhairt*

Two things have changed since that ruling. First, **the bill is bigger than it was told**: the
ruling measured exposure as *"2 seeds out of 668"*, counting seed sentences. **In seeds 1–10 alone
it is 12 practice rows, and 7 of them are at seed 10.** Second, **#526 checked the embedded case
directly and it is unattested**: 0 of 76, and embedded question words take a proper finite verb
**89 times out of 89**. A promising-looking 24 counter-examples dissolved on reading — 22 were *cé
raibh*, "where was".

**Recommended action: this one needs you, and I deliberately have no patch for it.** The obvious
repair is a finite verb after "how" — and for the verb *labhair* that collides head-on with the
standing ruling that this verb has no present tense in Connemara. #526 stopped at the same wall. So
the fix is a curriculum decision, not an edit.

**Confidence: confident** that the embedded form is unattested · **the remedy is genuinely open.**

---

## 4. Seed 10 — "remember about the whole sentence" is not English, in 7 rows

The seed sentence itself is correct:

> **Seed 10:** I'm not sure if I can remember the whole sentence
> *Níl mé cinnte an bhfuil mé in ann cuimhneamh ar an abairt ar fad* — **this is fine.**

But seven of its practice rows say **"remember about the whole sentence"**:

> to remember about the whole sentence · I want to remember about the whole sentence · if I can
> remember about the whole sentence · I want to remember about the whole sentence now · I'm going to
> remember about the whole sentence in Irish · how to remember about the whole sentence · I'm not
> sure if I can remember about the whole sentence now

**The cause is a mis-split, and it will repeat.** The tile breaks *ar an abairt ar fad* in two and
glosses the first piece as **"about" = *ar***. That *ar* is not "about" — it is the preposition the
verb *cuimhnigh* demands, the way English "listen" demands "to". It has no meaning of its own to
gloss. Having split it off and labelled it, the English was rebuilt with an "about" in it that
English does not want.

**The same fault sits on one seed 6 tile**, less visibly: the tile reads **"about a word" = *ar
fhocal*** while every seed 6 practice row correctly says "a word".

**Recommended fix:** delete "about" from the seven English rows; retire the component row
"about = *ar*"; re-label the seed 6 tile to **"a word"**. **The Irish does not change at all.**

**Confidence: confident.**

---

## 5. Seed 8 — "explain what I mean with someone else" is not English

> **English:** I'm going to explain what I mean with someone else
> **Irish:** *Tá mé chun céard atá i gceist agam a mhíniú le duine eicínt eile*

You explain something **to** someone, not **with** them. The row exists because "with someone else"
was a reusable tile from seed 5 and it has been bolted onto a verb that will not take it.

**Recommended fix:** retire the row. The natural repair needs *do dhuine eicínt eile*, a new
preposition, so retiring is cheaper.

**Confidence: confident.**

---

## 6. Seed 9 — one Irish form the learner has never been given, and the rewrite created it

> **English:** I'm trying to learn a little Irish
> **Irish:** *tá mé ag iarraidh beagán Gaeilge **a fhoghlaim***

Seed 2 taught "to learn" as ***foghlaim*** — bare, unchanged, straight after *ag iarraidh*: *tá mé ag
iarraidh foghlaim*. This row asks for ***a fhoghlaim*** — softened and in the before-the-verb frame.
Nothing has taught the learner that the word changes shape.

A learner following seed 2's model faithfully produces *tá mé ag iarraidh foghlaim beagán Gaeilge*,
which is wrong. That is the definition of a row a beginner cannot get right.

**This is the only untaught form in all 218 items**, and **it was not there before the seed 9
rewrite.**

**Recommended fix:** drop the row, or put a build row in front of it showing the shift, as seed 5
does for *labhairt a chleachtadh*.

**Confidence: confident** — found mechanically, not by taste.

---

# THINGS THAT ARE AWKWARD

## 7. Seed 9 — the most important construction in the first ten seeds gets two practice rows

> **Seed 9:** I have a little Irish now — *Tá beagán Gaeilge agam anois*
> **Tile:** I have Irish — *Tá Gaeilge agam*

The rewrite is right and I am not reopening it. But **this is the first time the learner ever
produces *tá … agam*** — the construction that carries "have" through the whole language. Before
this it appeared only buried inside the frozen chunk *céard atá i gceist agam*, where it is invisible.

- **The tile has no breakdown at all.** *Tá Gaeilge agam* arrives as one unanalysed lump, and the
  very next row asks the learner to push *beagán* **into the middle of it**. Inserting a word into a
  chunk you have only ever heard whole is precisely the move a beginner cannot make.
- **Seed 9 has 12 practice phrases and only 2 exercise the new construction.** Seed 5 has 30, seed 10
  has 28, seed 8 has 24. The seed carrying the biggest new idea has the fewest rows.

The earlier evidence document predicted this — *"better to introduce it deliberately than to have it
arrive by accident"*. It has arrived **thinly** rather than deliberately.

**Recommended fix:** give the tile a breakdown, and drill the possession pattern before *beagán* is
inserted into it.

**Confidence: confident** that it is under-taught · **best attempt** on the remedy.

---

## 8. Seeds 2, 7 and 8 — three different Irish answers all reachable from "try"

> **Seed 2:** I'm **trying** to learn — *tá mé **ag iarraidh** foghlaim*
> **Seed 7:** to **try** as hard as I can — ***mo dhícheall a dhéanamh***
> **Seed 8:** to **try** — ***iarracht a dhéanamh***

The learner must hear *"I'm going to **try** to speak Irish"* and *"I'm **trying** to speak Irish"*
and produce completely different sentences, the difference carried entirely by "try" versus "trying".

The earlier document argues the seed 7 / seed 8 pair is a **deliberate minimal pair**, and **I agree
— that is good teaching.** My concern is the **third** member: seed 2's *ag iarraidh* also means
"want", was taught six seeds earlier, and muddies the contrast the other two are drawing.

Two things ride along: ***a dhéanamh* appears in both seed 7 and seed 8 and is never taught** — two
unanalysed lumps sharing two invisible words; and **seed 7's tile contains *mo* and the softening it
causes**, a possessive and a mutation produced blind.

**Recommended fix:** none that is cheap — this is inherited from the shared English. Worth knowing
rather than fixing.

**Confidence: best attempt** — a judgement about learner load, not a grammar error.

---

## 9. Seed 6 — four rows that do not mean anything

> I'm going to remember in Irish — *tá mé chun cuimhneamh i nGaeilge*
> how to remember in Irish — *cén chaoi cuimhneamh i nGaeilge*
> I'm going to remember — *tá mé chun cuimhneamh*
> how to remember — *cén chaoi cuimhneamh*

"Remembering in Irish" is not a thing a person does. These are combinations produced by mixing tiles
that each work individually. The Irish is well formed; the sentences are not about anything.

**Recommended fix:** retire the two "in Irish" rows; the two bare ones are borderline.

**Confidence: confident** on the "in Irish" pair · **best attempt** on the others.

---

## 10. Five more rows where the English is stilted rather than natural

> **Seed 10:** I'm not sure how to speak Irish as often as possible
> **Seed 10:** I'm not sure how to speak a little Irish
> **Seed 9:** how to speak a little Irish
> **Seed 7:** how to try as hard as I can
> **Seed 7:** I want to try as hard as I can as often as possible

None is wrong; all are sentences nobody says. "How to speak *a little* Irish" is the oddest — you do
not learn how to do something a little.

**Confidence: best attempt** — this is taste, and it is your taste that should decide.

---

## 11. Seed 8 is about 30% longer than the same sentence in every other course

> *Tá mé chun iarracht a dhéanamh céard atá i gceist agam a mhíniú* — roughly 18 syllables against
> 13–14 for Spanish, French, Finnish and the released Irish.

**Already known and already ruled "keep for now"** — not reopened, only confirmed from a learner's
seat. If findings 1 and 2 are applied the word order changes but the length does not.

---

# THINGS THAT ARE MERELY NOT IDEAL

## 12. "if" is bound to the "whether" sense at seed 10, and most of the course's "if"s are not that

Seed 10 fixes **"if I can"** to ***an bhfuil mé in ann***. That is **correct** — after *níl mé
cinnte*, "if" means "whether".

But English "if" does two jobs and Irish uses different words. Across all 668 seeds, **37 contain
"if" and only about 11 are the "whether" sense.** About 22 are true conditionals — *"he would give
you an answer if he could"* — needing *má* or *dá*. Three more are *"as if"*.

**Seeds 1–10 are not wrong and this is not a rule breach**, because the tile is the whole phrase "if
I can", not the bare word. I flag it because the first conditional "if" arrives around seed 49 and
whoever builds it needs to know seed 10 did **not** settle "if".

**Confidence: confident** on the counts.

---

## 13. Capitalisation of the Irish is inconsistent, with no pattern

24 of the 208 Irish rows start with a capital and 184 do not, at random: seed 4 has 8 of 20, seed 8
has 0 of 27, seed 9 has 5 of 14. Cosmetic, invisible in audio, but visible on screen and cheap to
normalise before 630 more seeds inherit the drift.

---

## An adjacent note, outside seeds 1–10

The same rewrite moved **seed 14** to *An mbíonn tú ag caint i nGaeilge ar feadh an lae?* while
leaving its English as *"do you speak Irish all day?"*. The Irish now says "do you be **talking**"
and "for the length of the day"; the English still says "speak" and "all day". Seed 13's English
**was** updated to match its Irish; seed 14's was not. Worth a glance.

---

## Gaps — what I could not get

- **No native Connemara speaker has seen any of this**, and nothing here changes that. It remains the
  largest gap in the project. Point a speaker at **finding 1 first**, then finding 2, then finding 3.
- **One dialect source, and its counts are floors.** Everything Connemara-specific rests on a single
  monograph. Its phonetic transcription is an unreadable custom font, so all counts are
  **orthography-only and are floors, not totals** — an absence is weak evidence, not proof. #526
  could not reach an independent modern Connemara prose corpus; the obvious one served only search
  forms.
- **Finding 1 has a live counter-argument** and I have left it standing rather than burying it: all
  three course corpora use *tá mé chun* heavily. I discount that because those corpora share one
  pipeline, but if you think the pipeline was right and the monograph is silent rather than
  contradicting, that is a reasonable read and the change becomes optional.
- **#526 could not delegate** — the worker tree was already at its depth cap — so all four of its
  answers are one worker's, unreviewed by a second.
- **I did not re-count what the two standing evidence documents counted.** I took their settled
  rulings as given and checked only what was outside them.
