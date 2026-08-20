# Connemara Irish — the open calls, resolved

**20 August 2026.** `gle_cn_for_eng`. **£0.00 spend. Zero TTS. Zero audio rows before, zero after.**
Course still `status=draft` / `new_app_status=not_available` — no learner can reach any of it.
`gle_for_eng`, the released Irish course, **was not touched**.

The build stopped on 18 August with five questions open, two of them marked *"needs a native ear"*.
Nobody who speaks Connemara Irish has been available since. Under Kai's standing ruling of
2026-08-17 — *"we should fix it as much as we can in the meantime… we do not expect you to be as
good as a real human speaker and that is okay, you can still try"* — every one of them is answered
here, with the authority named, and with a confidence label so a speaker can later be pointed at
the weak ones.

**Nothing in this document has been applied to the course text.** Three things *were* applied, and
they are in §7: two housekeeping faults, and the tidy-up of a ruling already taken.

---

## The evidence base, and one correction to how it was read

Every count below is my own, taken today. Two of them overturn numbers in the 18 August report.

**Ó Curnáin, *The Irish of Iorras Aithneach, County Galway* (DIAS 2007), all four volumes** —
~2,700pp describing the Carna dialect, i.e. deep mainland Connemara. The 18 August pass mined
volumes II and IV. **All four are now extracted and probed.**

> ⚠️ **Volumes I–III cannot be searched with `grep`, and a previous zero was false.** Their bodies
> are largely phonetic transcription in a custom font, which extracts as control bytes (6–13% of
> every file). `grep` classifies the files as binary and prints *"Binary file matches"* rather than
> counting — so `grep -c Gaeilge` returns **0** on volumes where the real count is 30, 9 and 12.
> I hit this trap myself and caught it on the calibration step. Read them in Python.
> `tools/gle-cn/ocurnain-probe.py` does this and refuses to be trusted until the controls pass.

Calibration, all four volumes: `Gaeilge` 121 · `duine` 521 · `bhí` 3,133 · `iarraidh` 105 (vol IV).

**Ó Dónaill, *Foclóir Gaeilge–Béarla* (1977)**, via teanglann.ie — the standard dictionary, and the
lookup a learner of this course would actually perform.

**The two Irish corpora, which disagree and must be named separately** — the legacy export
(`.a108-gle/base-items.json`, 15,904 items) and the live released course `gle_for_eng` (7,586 items).
The 18 August report quotes the legacy export throughout. Where a number below says "base corpus" I
say which.

**The full 668-seed English side**, scanned exhaustively rather than sampled — job #477.

---

## 1. Seed 9 — "I speak a little Irish now" · was Fork 7, rank 1, ⚠️ native ear

> **English:** I speak a little Irish now
> **Currently:** `Labhraím beagán Gaeilge anois`
> **Ruling:** **`Tá beagán Gaeilge agam anois`**
> **Confidence: confident** on the idiom · **best attempt** on the exact wording

**The authority.** Ó Dónaill, under the preposition `ag`: **"Tá Gaeilge agus Spáinnis acu, *they know
Irish and Spanish*."** That is the dictionary's own idiom for possessing — knowing, speaking — a
language. Under `labhair` he gives the verbal noun frame `Gaeilge a labhairt, to speak Irish` and the
past `labhair sé i nGaeilge, he spoke in Irish`. **He gives no present-tense example of speaking a
language at all.**

**Why the current form is wrong, and it isn't frequency.** `Labhraím Gaeilge` is a perfectly
grammatical *habitual* present — "I habitually speak Irish". It does not say "I know some Irish".
At seed 9 of a beginner course, after eight seeds of wanting and trying to speak, "I speak a little
Irish now" is a claim about *proficiency*, not about *habit*. Those are two different sentences in
Irish and the course currently has the other one.

**What Ó Curnáin adds — and he is not silent, which I first thought he was.** `labhraím` **0** in
all four volumes; `labhraíonn` **0**.

> **I am not leaning on that zero, and neither should anyone else.** Noise-floor controls, same
> four volumes: `deirim`, `tuigim`, `ólaim`, `feicim`, `bím` all land between 2 and 9 — and
> `ceapaim` scores 0 in volume IV *only because the index abbreviates it `~aim`*, which defeats
> substring search. A bare 0 for `labhraím` sits inside that noise floor and refutes nothing.

**The evidence that is not a count.** Volume IV's index gives a form-by-form paradigm for every verb.
`abair` lists **`pres 1sg deirim`** and **`3sg abraíonn`**. `ceap` lists **`pres 1sg ~aim`** and
**`3sg ~ann`**. The entry for `labhair` lists imperative, past, 3pl `labhradar`, impersonal,
past-habitual, future `labhróidh`, relative `labhrós`, conditional, past-subjunctive, verbal
adjective and verbal noun — **and no present tense at all, in any person.** Its one 1sg form,
`labhrainn*`, carries Ó Curnáin's own *non-attested* asterisk.

**And the idiom I am ruling *in* is alive in Connemara, in all four volumes** — which I had wrongly
recorded as absent, having searched only the 1sg `agam`:

> *tá Gaeilge **aici** chomh maith liomsa* (vol I, speaker 21Pt) · *daoiní TÁ Gaeilge **ACÚ*** ·
> *níl aon Ghaeilge chomh maith sin **ACÚ*** (vol III) · *ní raibh Béarla mórán **ag** aon-nduine.
> Is Gaeilge uiliug a bhí gach, ann* (vol IV, speaker 70M) · *bhí teanga mhaith Bhéarla **aige***
> (vol I, 892M)

So this ruling is not Ó Dónaill against Ó Curnáin's silence. It is both authorities pointing the
same way: the dictionary supplies the idiom, and the dialect monograph shows Connemara speakers
using it, while never once recording the form the course currently has.

**Cost, measured:** 1 lego, 11 practice phrases, 1 seed. Job #477 confirms seed 9 is the **only** one
of all 668 English seeds that is a bare first-person-singular *"I speak X"* statement — so this
change has no course-wide tail of its own.

**Where a speaker should be pointed:** at the wording, not the idiom. `beagán` is Ó Dónaill's
headword and `beagán Gaeilge` is unremarkable, but a speaker might prefer `Tá beagáinín Gaeilge agam
anois`, or the phrase the released Irish course already carries verbatim, `Tá cúpla focal Gaeilge
agam` ("I have a few words of Irish").

**But it does have a tail through a different door — see §2.**

---

## 2. Seeds 13, 14 and 22 — the same verb, the same doubt · NOT previously flagged

This is the one thing I found that nobody had on the list, and it follows directly from §1.

The problem at seed 9 is not the word `labhair`. It is the **finite present tense** of `labhair` —
the form Ó Curnáin never recorded and Ó Dónaill never exemplifies for a language. Three more banked
seeds use exactly that form, and the 18 August list did not name them:

> **Seed 13 · English:** you speak Irish very well
> **Currently:** `Labhraíonn tú Gaeilge go han-mhaith`
> **Ruling:** **`Tá Gaeilge an-mhaith agat`** — the same proficiency idiom, the same authority
> **Confidence: confident**

> **Seed 14 · English:** do you speak Irish all day?
> **Currently:** `An labhraíonn tú Gaeilge an lá ar fad?`
> **Ruling:** **`An mbíonn tú ag caint as Gaeilge an lá ar fad?`**
> **Confidence: best attempt**
> This one genuinely *is* habitual, so a habitual present is right — but the dialect's habitual verb
> is `bíonn` and its verb for talking is `caint`. Ó Curnáin, four volumes: `caint` **256**,
> `ag caint` **79**, against `labhairt` **17** in ~2,700 pages. `bíonn` is 101 in vol IV alone.

> **Seed 22 · English:** because I want to meet people who speak Irish
> **Currently:** `Mar tá mé ag iarraidh bualadh le daoine a labhraíonn Gaeilge`
> **Ruling:** **`Mar tá mé ag iarraidh bualadh le daoine a bhfuil Gaeilge acu`**
> **Confidence: confident** — "people who have Irish", Ó Dónaill's idiom again

**What is NOT in question, and must not be swept up with this.** The verbal noun `labhairt` is fine,
is Ó Dónaill's own frame (`Gaeilge a labhairt`), and is used correctly at seeds 1, 3, 5, 11 and 29.
So is seed 15's conditional `go labhrófá` — Ó Curnáin records this verb's conditional (`labhróinn`,
speaker 892M2419, and `labhróinnse` emphatic). **Only the finite present is affected.**

Seeds 13, 14 and 22 are `draft` — target text written, not yet decomposed into tiles — so the cost
is three sentences and nothing downstream. An exhaustive sweep of every `labhair` form in the course,
with a measured reversal cost, is running as job #478.

---

## 3. Seed 3 — the objectless "how to" · was Fork 11, rank 2, ⚠️ native ear

> **English:** how to speak as often as possible
> **Currently:** `cén chaoi labhairt chomh minic agus is féidir`
> **Ruling:** **keep it** — and the `le` residue is removed (applied, §7c)
> **Confidence: best attempt** — this is the weakest call in the document and the first I would
> put in front of a speaker

**The part that is now settled beyond argument.** The 18 August ruling took the preposition `le` out
of the frame on the strength of one volume. On all four: **`chaoi le` = 0** in ~2,700 pages of
Connemara. `conas le` = **0** in both base corpora. **That reversal was right, and it is now
confirmed on four times the evidence.**

**The part that was flagged.** The build's own note said the *objectless* case — `cén chaoi` followed
by a bare verbal noun with no object — rested on a single hit in 15,904 items (`conas foghlaim`).

**What I found.** Of 297 tokens of `chaoi` across the four volumes, what follows is overwhelmingly a
finite verb: `a raibh` 24, `a bhfuil` 19, `an bhfuil`, `a mbeadh`, `a scanródh`, `a ndéantaí`,
`ar imigh`, `a d'éirigh`. Citations read like *"Cén chaoi a ndíontaí im fadó?"*, *"Cén chaoi a
scanródh mise í?"*, *"Sé an chaoi a bhfuil sé agam."* Checked independently (job #476): of the
interrogative `cén chaoi` uses, **48 of 48 take a particle plus a finite verb, and none takes a bare
verbal noun.** `conas` is **0** in all four volumes, which separately confirms that the base course's
279 `conas` really are a Munster import.

**One qualification, and it is thin.** Volumes II and III both carry **`Sé chaoi hiumprú anuas é`**
(speaker S85) — `chaoi` followed directly by a verbal noun, no particle, no object. That is *not* the
interrogative `cén chaoi`, and Ó Curnáin discusses that neighbourhood as irregular. It shows the
noun `caoi` can govern a bare verbal noun in this dialect; it does not show that `cén chaoi` can.
Weigh it at about the same value as the single `conas foghlaim` hit the build was already worried
about — which is to say, not much, in either direction.

**Why keep it.** Three reasons, and the third is the one that decides it.
1. The frame is not a different construction — it is `cén chaoi [object] a [verbal noun]`, which the
   course already uses at seed 4 and which 8 of the 13 "how to" seeds will need, **with the object
   slot empty because the English has no object.** Replacing it with a finite verb would destroy the
   tile's reusability and force a person ending into what has to stay a person-neutral fragment.
2. Job #477 scanned all 668: the objectless case occurs in **exactly 2 seeds — 3 and 43**
   ("I wasn't thinking about how to answer"). The other 11 how-to seeds are safe either way. This is
   a two-sentence exposure, not a frame-wide one.
3. Absence here is weak. Ó Curnáin's transcribed material is narrative — people telling stories.
   *"How to do X"* as a nominal fragment barely occurs in narrative in any language. This is not the
   kind of corpus that would show the form even if it were common in instruction.

**Cost if a speaker says no:** 2 seeds of 668. It stays cheap indefinitely, which is why I am
comfortable ruling "keep" rather than rebuilding it on thin evidence in the other direction.

---

## 4. Seed 8 — "I'm going to try to explain what I mean" · was Fork 3, rank 3

> **English:** I'm going to try to explain what I mean
> **Currently:** `Tá mé chun iarracht a dhéanamh céard atá i gceist agam a mhíniú`
> **Ruling:** **keep it for now — but it stays on the native-ear list, and it is the item on this
> page I am least able to defend**
> **Confidence: best attempt**

**I had this at "confident" and an independent check (job #476) knocked it down. The correction
matters, so here it is plainly.** My first count found `iarracht` 38 times across the four volumes,
including **`rinne sé a bhinniarracht`** — which I read as `déan` + `iarracht` incidentally attested
in Connemara. That reading does not survive scrutiny. My 38 was inflated by compound prefix forms
(`binn-`, `mór-`, `tréan-`, `fíor-`), and those are morphological examples elicited from Máire to
demonstrate a *prefix* — a prefix Ó Curnáin explicitly flags as uncommon, used by one speaker only,
and which three other speakers **do not permit**. That is not running speech.

**The bare-word count is 9, and all nine are non-evidence:** two are a **Seán Ó Ríordáin epigraph in
Munster literary Irish** printed at the front of volume I; six are a single elicitation session about
lenition after ordinals, using `iarracht` as the test noun in the sense "go, turn" (*his sixth go*),
counted six times; one is a bare index line. **`iarracht a dhéanamh` is 0 in all four volumes, and
`iarracht` has no unqualified running-speech attestation in Connemara at all.**

**So where does that leave the form?** It is **correct standard Irish** — Ó Dónaill gives `iarracht`
= attempt, effort, with `iarracht a dhéanamh ar rud` as the frame, and the legacy base corpus carries
`iarracht a dhéanamh` 38 times. It is simply **unattested in this dialect**. Under the course's own
rail — Connemara lexis, standard orthography — that is exactly the kind of choice the rail exists to
catch. The 18 August report rated it confidence **C** and called it *"the ruling I most expect you to
challenge"*; the corpus now agrees with that instinct rather than retiring it.

**And the dialect has its own "try" word, which is a problem of its own.** Volume IV's glossary:
*`traíáil2`, (triail2), v. 1. **Try**… Tá mé ag cheapadh go dtraíála mé síos í*; and
*`traíáil1`, f. 1. **Attempt, chance at, go**. Ba mhaith liom ~ a fháil air.* That is a borrowing of
English *try* — and it **collides head-on with the course's standing ban on `ag triail`**. I am not
applying it. Whether a Connemara course should teach the dialect's real word when that word is an
English borrowing the course has already banned is a judgement about what this course is *for*, and
it needs either a speaker or Kai — it is not a call the corpus can make.

**The honest cost, now measured rather than felt.** Seed 8's English is the same in every course
built on these 668 seeds, so I measured what other released courses do with it:

| course | seed 8 | ≈syllables |
|---|---|---|
| Spanish | *voy a intentar explicar lo que quiero decir* | 14 |
| French | *Je vais essayer d'expliquer ce que je veux dire* | 13 |
| Finnish | *Mä aion yrittää selittää mitä mä tarkoitan* | 14 |
| released Irish | *Tá mé chun triail a mhíniú cad atá i gceist agam* | 14 |
| **Connemara** | ***Tá mé chun iarracht a dhéanamh céard atá i gceist agam a mhíniú*** | **~18** |

So the length worry is real — about 30% over the estate norm — and I am not going to pretend
otherwise. **But it cannot be fixed without breaking a rail.** ZUT fixes "going to" = `tá mé chun` at
seed 5. The shorter Irish (`Déanfaidh mé iarracht…`) needs the synthetic future, which would violate
it. And moving the form to seed 146, as the build report offered, leaves seed 8's English — *"going
to try"* — with no lawful translation at all.

**On the `ag iarraidh` / `iarracht` near-collision:** I read this the opposite way to the build
report. Fork 2 deliberately taught the learner that "want" and "trying" are the *same* Irish words.
Seed 8 then shows that "make an attempt" is a *different, related* word. That is a minimal pair, and
minimal pairs work when the two items are close together. At seed 146 the learner would meet
`iarracht` cold, 138 seeds later, with the contrast long forgotten.

**Why "keep for now" rather than "change".** Nothing better is available that does not break
something: `traíáil` is banned, ZUT fixes `chun` at seed 5, and moving the form to seed 146 leaves
seed 8's English untranslatable. Keeping it costs nothing today and the reversal stays at 11 phrases
and one seed. **But it should not be recorded as settled, and the 18 August flag stays on.**

**What a speaker should be asked, in this order:** does `iarracht a dhéanamh` sound like Connemara or
like schoolbook Irish? If it sounds imported, is `traíáil` what they would actually say — and does
that override the `ag triail` ban? And separately, is ~18 syllables bearable as the eighth thing a
learner ever says?

---

## 5. Seed 7 — "as hard as I can" · was rank 4, a genuine source conflict

> **English:** I want to try as hard as I can today
> **Currently:** `Tá mé ag iarraidh mo dhícheall a dhéanamh inniu`
> **Ruling:** **keep `a dhéanamh`**
> **Confidence: confident**

The build recorded this as a real conflict: Ó Curnáin's transcription gives `dícheall a **thabhairt**`
where de Bhaldraithe gives `a **dhéanamh**`, and it reported `dícheall a dhéanamh` as **0** in the
corpus. **That zero was an artefact of only volume IV having been mined.**

- **Ó Curnáin volume II, running transcription, speaker 04B:** ***"do dhícheall a dhéanamh, ar sise"***
  — and the same speaker, ***"ag déanamh mo mhíle dícheall"***. `a dhéanamh` is Connemara, in
  Connemara's own recorded speech.
- **Ó Curnáin volume IV** does carry the other frame, as its glossary headword:
  *`deoicheall, (dícheall). m. Utmost.` … `tá mo dh-~ tugthaí am, I have done my utmost`* — plus
  speaker 892M's *"Tá mé ar mo dhícheall."* **Both frames are live in this dialect.** It was never
  one-or-the-other.
- **Ó Dónaill** settles which to teach: *"Do dhícheall a dhéanamh, **to do one's best**."* — the
  dictionary's own primary example. `dícheall a thabhairt` is not among his frames at all.
- **The released Irish course** uses `dícheall a dhéanamh` 98 times and `a thabhairt` 0.

Where two forms are both correct, the course should teach the one the dictionary leads with and the
learner will meet everywhere else. That is `a dhéanamh`.

**And the stakes are lower than anyone thought.** Job #477 scanned all 668 English seeds: the words
*best*, *utmost* and the phrase *do my best* appear in **2 seeds, both of them the ordinary
superlative** ("the best choice", "the best way"). **The do-my-best idiom is not scoped in this
course at all.** `mo dhícheall` at seed 7 is a free translation of "as hard as I can" — a one-off,
with no course-wide consequences whichever way it goes.

---

## 6. `éigin` or `eicínt` — the orthography line · was Fork 9, and this one is Kai's

**This is the only item in the document that is a policy call rather than a language call**, because
it turns on the ratified line *"standard orthography, dialect lexis"*, which is Kai's to move. So it
is presented as a worked recommendation with the exposure measured, not as a question.

### What the corpus actually says, with the false positives removed

The 18 August report gave `eicínt` 58 against `éigin` 18 from volume IV. **Both halves of that were
contaminated.** Across all four volumes:

| | raw hits | after hunting false positives |
|---|---|---|
| `eicínt` + `eicín` (Connemara) | 213 | **213** — all the indefinite adjective |
| `éigin` (standard) | 45 | **1** |

Of the 45 raw `éigin` hits, **44 are a different word**: `ar éigin` "barely, with difficulty" (16),
`b'éigin` / `narbh éigin` / `gurbh éigin` "had to" (10), Ó Curnáin's own metalanguage discussing the
form (3), and further `ar éigin` variants. **Exactly one is the indefinite pronoun** — and it is
inside a *written letter* (speaker 43Mlt), not speech.

So the true ratio in running Connemara is not 58:18. It is about **213 : 1**.

Same story for tomorrow: **`amáireach` 65, `amárach` 2**.

### And there is something stronger than any count, which I nearly missed

Ó Curnáin marks forms with an asterisk. His own abbreviation key, volume I preface:

> **`*` … (ii) non-attested form, or, in query, impermissible or very doubtful form**

The volume IV index entries read:

> **`eicín, eicíneach, eicíneacht, eicínt, eicínteach, eicínteacht, eichín, eichíneacht, icín,
> icíneach, cínt, éigin*, a., some`**
>
> **`amáireach, máireach, amárach*, adv, tomorrow`**

**He lists eleven attested Connemara variants of "some" and marks `éigin` itself as non-attested.
He gives `amáireach` as the headword and marks `amárach` as non-attested.** That is not a frequency
argument I have assembled — it is the dialect's describer stating, in his own notation, that these
two standard spellings are not forms of this dialect.

*(Same notation, in the course's favour elsewhere: `deoicheall, deicheall, dicheall, dícheall,
díthcheall*` — so `dícheall` at seed 7 is **unasterisked and attested**, and only `díthcheall` is
not. And `pstsbj 1sg labhrainn*` in §1 is his asterisk too.)*

**This is the strongest evidence against the recommendation I am about to make, so it goes first.**

### The fact that splits the call — and it is a dictionary fact, not a feeling

The argument for standard spelling has always been that **a learner taught the dialect form cannot
look it up.** I tested that against Ó Dónaill, one word at a time:

| form | in Ó Dónaill? | can a learner look it up? |
|---|---|---|
| `eicínt` | **no entry at all** | **no** |
| `amáireach` | **yes — *"amáireach = amárach"*** | **yes** |
| `chuile` | yes — *"chuile = gach uile"* | yes |
| `céard` | yes — full headword | yes |

**The lookup argument holds for `eicínt` and fails for `amáireach`.** They are not the same call and
should not be ruled together.

### The recommendation

**Adopt this as the rail, because it names an authority and never asks anyone to normalise by feel:**

> **Write the Connemara form wherever Ó Dónaill recognises it — as a headword or as a
> cross-reference. Write the standard form where he does not.**

This is not a new policy. **It is the rule the course is already following in three cases out of
four** — `chuile` and `céard` are both in the course and both are in Ó Dónaill; `eicínt` is not in
either. **`amárach` is the single place it breaks.** So:

- **`amárach` → `amáireach` — switch.** This one I would call almost obligatory now. FGB carries
  `amáireach = amárach`, so the lookup objection does not apply at all; `amáireach` is Ó Curnáin's
  headword; and he marks `amárach` non-attested. There is no argument left on the other side.
  **Confidence: confident.**
- **`éigin` — keep standard, and know what you are keeping.** The lookup argument is the only thing
  holding it up: `eicínt` has no FGB entry, so a learner taught it cannot find it in the dictionary
  they will own. Against that stands 213-to-1 and Ó Curnáin's own asterisk. **This is the one place
  the course would knowingly print a form the dialect's describer says the dialect does not have.**
  **Confidence: best attempt** — and honestly, if Kai's instinct is that a Connemara course should
  sound Connemara before it reads standard, the evidence is on his side and I would not argue. The
  substitution is one pass over 59 rows today, and it is the cheapest it will ever be.

### What it costs, scanned across all 668 seeds and not just the 36 built

| | seeds in the whole 668 that will need it | rows banked today |
|---|---|---|
| indefinite "some/any-" | **44 of 668** | 59 rows (2 tiles + 57 phrases), 8 seeds — all standard |
| "tomorrow" | **7 of 668** | 9 rows (1 tile + 8 phrases), **seed 12 only** — all standard |

Zero Connemara-spelling exposure exists anywhere today, so nothing needs undoing on that side.
**Switching `amárach` today costs nine rows and one sentence.** It will cost seven sentences by the
end of the build. There is no audio in this course, so it is text-only either way.

### One thing I could not settle, stated as a gap

I argued to myself that standard spelling is safe because a Connemara speaker reading `éigin` aloud
will say */eˈciːnʲtʲ/* anyway — native readers convert standard orthography to their own phonology.
**I cannot demonstrate that**, there is no Connemara voice in the estate to test it against, and no
audio is being generated. It is a plausible argument and it is not evidence, so it carries no weight
above. A speaker reading the two spellings aloud would settle it in a minute.

---

## 7. Three things fixed, not asked

All three verified against the live database after the write. **Course had 0 audio rows before and
has 0 after** — no clip was generated, replaced or deleted, and no TTS was called. The course is
`draft` / `not_available` with no learner able to reach it, so no progress migration arises.
Before-images are in `docs/gle-cn/snapshots/`.

**a) The accent label said "standard".** `courses.dialect` was `standard`. Since 19 August the
recording queue partitions by `(dialect, gender)` and matches a course's dialect against a voice's —
never against who happens to be cast, because that was the bug that sent 197 Southern Welsh lines to
two Northern speakers. A Connemara course labelled *standard* would route its lines to standard-Irish
recordists the moment anyone recorded. **Now `connemara`.** I did **not** relabel the released Irish
course: leaving it `standard` means a Connemara line can never fall into its queue, which is the safe
direction. Retagging a released course is a visible content decision and is not mine.

**b) The voice settings were a copy of the released Irish course.** `voice_config` was byte-for-byte
`gle_for_eng`'s, still carrying `"courseCode": "gle_for_eng"` inside it, and naming two synthetic
Microsoft **standard-Irish** voices — Orla and Colm — as the two target voices for a course whose
entire reason for existing is the Connemara accent. **The course code is corrected, and both target
voices are emptied** — the same shape `cym_n_for_eng` already uses for a course whose voice is not
yet decided. No `ga-IE` voice and no reference to `gle_for_eng` remains anywhere in the config. This
banks the content and defers the voice: it does not decide who speaks Connemara, it stops the wrong
answer being pre-filled. The English prompt voice is left alone — it is dialect-neutral and was not
the fault.

**c) Seed 3 still had the `le` in its tiles.** The 18 August ruling took `le` out of the sentence and
left it in the teaching tiles: a lego component `to → le` and a learner-visible practice row
`to → le`, teaching Irish that appears nowhere in the sentence it belongs to. With the `le` gone,
"how to" maps wholesale onto `cén chaoi`, so the tile is now atomic and both component rows are
removed. **This is cleanup of a ruling already taken and independently re-confirmed above, not a new
decision.** ZUT re-checked afterwards across all 262 remaining practice phrases: **0 violations.**

I also set `variant_label` to `Connemara`, for parity with `cym_s_for_eng`'s `Southern` — the field
recording which variant a course is. Nothing in the codebase reads it today.

---

## 8. Can the build resume, and what would let it

**Yes — translation can resume now, on seeds 37 onward, and nothing in this document blocks it.**

The five open calls are answered. Three are decided on named external authority and are safe to build
on (§1/§2, §3, §5). §6 is a one-line policy ruling from Kai that costs nine rows today. **§4 is the
one I could not close** — `iarracht a dhéanamh` is correct standard Irish with no attestation in
Connemara, and the dialect's own word for it is one the course has banned. It is left standing
because nothing better is available, not because it is settled. Every ruling is reversible and the
before-images exist.

**Resume with these in hand:**
1. **§6 is the only thing worth waiting for**, and only if seeds with "tomorrow" or "something" come
   up early — and they do: seeds 30, 32 and 35 all need the indefinite. One line from Kai unblocks it.
   Everything else can proceed in parallel.
2. **Apply §1 and §2 before building past seed 36.** The finite-present-of-`labhair` question touches
   seeds 9, 13, 14 and 22, all of which are built or drafted, and the corpus has 17 more "speak"
   seeds waiting. This is the one that gets dearer per day. Job #478 has the exhaustive list.
3. **Two things that stop the build being checked properly, and neither is a decision** — there are
   no reference decompositions for Irish and no Irish-specific rulebook, so the tiling method has
   never been calibrated for this pair; and the known-side gate fires a permanently-false warning on
   21% of this course's phrases, which makes a real breach indistinguishable from noise. Both are
   documented and unfixed. Neither blocks translation.

**What does *not* block it: audio.** No voice is cast, no synthetic Connemara voice exists, and none
is needed. Bank the content; defer the voice. With the two standard-Irish voices now cleared out and
the accent label correct, the course can accumulate 632 more sentences without any of them acquiring
a wrong-accent clip by accident.

**The one thing that would still change everything** is an hour with a Connemara speaker reading the
36 sentences aloud. That has not become less true — but it is no longer the *only* thing standing
between this course and its next 600 sentences, and it is now an hour of confirmation rather than an
hour of decision.

---

## 9. Gaps — what I could not get

- **No native Connemara speaker has seen any of this.** Unchanged, and still the largest gap. Every
  call above is labelled so a speaker can be pointed at the weak ones first: **§4 (seed 8 — the one
  genuinely unsupported form, and the `traíáil` question behind it)**, then §3 (seed 3), then §1's
  exact wording.
- **One of my own rulings was wrong and was corrected mid-pass.** I had §4 at "confident" on the
  strength of `rinne sé a bhinniarracht`, having counted 38 hits for `iarracht`. An independent
  check (job #476) showed my count was inflated by compound prefix forms, and that every remaining
  hit is a Munster epigraph, an elicitation artefact or an index line. §4 now reads "best attempt"
  and stays on the native-ear list. I have left the working visible rather than quietly restating
  the conclusion.
- **Ó Curnáin volumes I–III are only partly searchable.** Their bodies are phonetic transcription in
  a custom font; Irish orthography survives extraction only where he quotes it in running text or
  glossary. Counts from those volumes are therefore *floors*, not totals, and I have not treated any
  absence in them as refutation.
- **No pronunciation claim in this document is a measurement.** There is no Connemara voice in the
  estate and no audio was generated. Everything phonetic here is a reason, not evidence — §6's
  closing gap says so explicitly.
- **The sources the 18 August pass could not reach are still unreached**: Ó Siadhail's *Learning
  Irish* (access-restricted — and it is the one source that would settle §1 outright, being
  explicitly Cois Fharraige Connemara), de Bhaldraithe's *Gaeilge Chois Fharraige* (print only),
  *Caint Chonamara* (paywalled, zero-spend rule), *Gaeilge Weekly* (behind Patreon).
- **The FGB entries were read through teanglann.ie's web pages**, not a full-text dump. Where a
  headword is quoted above it is quoted as the site served it today. `eicínt` returns 404 on the
  same site, which is the basis for "no entry" in §6 — an absence from a lookup, which is exactly
  the thing §6's argument is about, but an absence nonetheless.

---

*Every number here was counted today from the live database or from the four volumes' extracted
text, not taken from a document. Where I quote the 18 August report I say so, and where I overturn
it — the `dícheall` zero in §5 and the `éigin` count in §6 — I show the false positive that caused
it. Jobs #476, #477 and #478 did the exhaustive legwork; #477's full 668-seed scan is at
`docs/gle-cn/gle-cn-668-scan-2026-08-20.md`.*
