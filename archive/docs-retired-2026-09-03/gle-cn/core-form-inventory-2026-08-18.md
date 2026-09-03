# Connemara Irish — the core form inventory, decided

`gle_cn_for_eng`. **Nothing was changed.** No seed banked, no translation edited, no Supabase
write, no branch merged, **£0.00 spend, zero TTS**. This is a decision document. The build
stands exactly as it was until you rule.

---

## READ THIS FIRST — I am contradicting two of your rulings

You said you were no longer sure about `triail` / `iarracht` and told me to re-open it. I did, and
it went further than expected.

> ### **`ag iarracht` is not the Irish for "trying". It should not ship.**
>
> `iarracht` is a **feminine 3rd-declension noun** meaning "an attempt". There is no verb
> `iarracht` and no verbal noun `iarracht`, so `ag` + it cannot make a progressive. Every attested
> frame puts it round a light verb — `iarracht **a dhéanamh**`, `iarracht **a thabhairt ar**`,
> `iarracht **a bhaint as**`. Never `ag`.
>
> | check | result |
> |---|---|
> | Ó Dónaill (FGB), full `iarracht` entry | no `ag iarracht` |
> | An Foclóir Beag (monolingual) | noun only |
> | de Bhaldraithe, headword TRY | `ag iarracht` absent |
> | focloir.ie (New English–Irish Dictionary), headword TRY | `ag iarracht` absent |
> | direct string search on all three dictionary sites | **no exact-match block at all** — falls through to "similar words" |
> | the native base corpus, 15,904 items | **0** |
> | **Ó Curnáin, *The Irish of Iorras Aithneach* — 686 pages of deep-Connemara grammar and transcribed speech** | **0** (against `iarraidh` **69**) |
>
> **Correction to something I wrote earlier today:** I first reported that the phrase does not
> occur anywhere on the web. That was wrong — it came from a search summary, not a real query. A
> worker then queried the National Corpus of Irish properly and found **111 raw hits**. Read, they
> are mostly the noun sitting next to `ag` by accident, plus an older idiom `ag iarraidh ar` ("to
> call on someone"); at least one is a genuine "trying" use. So the honest statement is not "it
> does not exist" — it is: **absent from every dictionary, absent from the native corpus, absent
> from the fullest description of our target dialect, and marginal-to-ambiguous in general written
> Irish.** That is still a clear answer, and it is still: don't teach it.

**The decisive citation** — Ó Dónaill's entry for the verb `iarr`, **sense 2, headed "Attempt"**:

> **2. Attempt. Ag ~aidh rud a dhéanamh, trying to do sth.** … Bhí siad ag ~aidh a bheith ag magadh
> fúinn, they were trying to make fun of us. **Níl mé ag ~aidh éirí go fóill, I don't want to get
> up yet.**

Inside **one dictionary sense**, the same construction is glossed "trying to do sth." and "I don't
want to". Ó Dónaill does not treat want and try as two things. Neither should we.

**The second contradiction** is smaller and follows from the first: I am bringing back
**`iarracht a dhéanamh`**, which you rejected — but only for the eight sentences that need a
non-progressive "to try", never as the everyday word. Fork 3.

The fix costs almost nothing and it **undoes the damage yesterday's ruling did to the opening**. §4.

---

## 1. The inventory

Confidence **A** = multiple sources incl. dictionary or dialect monograph · **B** = one good source
plus my reading · **C** = my own Irish, unsupported — treat as a question, not an answer.

| Function | Gloss the learner hears | Chosen Irish | Why | Conf | Changes build? |
|---|---|---|---|---|---|
| **want** | `I want` | `tá mé ag iarraidh` | NEID's headline form for "desire sth"; base 2,625/2,680 | **A** | no |
| **would like** | `I'd like` | `ba mhaith liom` | FGB never glosses it bare "want"; base 898/972 | **A** | no |
| **trying to** | `I'm trying to` | **`tá mé ag iarraidh`** | FGB `iarr` sense 2 "Attempt"; de Bhaldraithe ×6; base 51× | **A** | **yes — replaces `ag iarracht`** |
| **to try** (non-progressive) | `to make an attempt` | **`iarracht a dhéanamh`** | FGB's own frame; base teaches it at its seed 283 | **A** | **yes — unblocks 48/49** |
| **try as hard as I can** | (whole idiom) | `mo dhícheall a dhéanamh` | de Bhaldraithe: *"I'll try my hardest to be there — déanfaidh mé mo mhíle dícheall a bheith ansin"* | **A** | unblocks seed 48 |
| **can / able** | `able` | **`in ann`** (only) | Connacht form; base 646 vs `ábalta` 0; Ó Curnáin has it | **A** | **yes — retires `an féidir liom`** |
| **as possible** | `as possible` | `agus is féidir` | frozen impersonal idiom, not "can" | **B** | no |
| **I speak** (habitual) | `I speak` | `labhraím` | synthetic 1sg; base 76× | **B** | no — but see Fork 7 |
| **you speak** | `you speak` / `do you speak` | `labhraíonn tú` / `an labhraíonn tú` | base 150× | **B** | no |
| **talking** | `talking` | `ag caint` | base 134× vs `ag labhairt` 64× | **A** | no |
| **to speak** | `to speak` | `labhairt`, object-fronted `Gaeilge a labhairt` | commoner shape; dodges the mutation validator | **A** | no |
| **we (1pl)** | `we` | `tá muid` (analytic) | Connacht, confirmed w/ Galway named | **A** | no |
| **know a fact** | `I know that` / `I don't know` | `tá a fhios agam` / `níl a fhios agam` | standard orthography — **but see clash #13** | **B** | no |
| **know a person** | `I know him/her/them` | `tá aithne agam ar` | base 156× | **A** | no |
| **have to / must** | `I have to` | `caithfidh mé` | Cois Fharraige realisation is just **[kaː]** — one of the *easiest* forms in the inventory | **A** | no |
| **need to** | `I need to` | `tá orm` | base's own choice at its seed 23 | **B** | no |
| **need a thing** | `I need (a thing)` | `tá … uaim` | base `uaim` 57× | **B** | no |
| **like** | `I like` | **see Fork 10 — this one is not safe** | — | **C** | possibly |
| **think** | `I think` | `ceapaim` | base 382× | **B** | no |
| **remember** | `to remember` | `cuimhneamh` (preposition split off) | already fixed in the build | **A** | no |
| **going to** | `I'm going to` | `tá mé chun` | base 49× | **A** | no |
| **how** | `how` | `cén chaoi` (+ `a` + eclipsis) | **best-attested item in the whole hunt** — see below | **A** | no |
| **why** | `why` | `cén fáth` | Connacht | **A** | no |
| **what** | `what` | `céard` | base 641× | **A** | no |
| **something / someone** | `something` | `rud éigin` / `duine éigin` | Connacht; `eicínt` is speech-only spelling (Fork 9) | **A** | no |
| **every** | `every` | `chuile` | Connemara | **A** | no |
| **look** | `look` | `breathnaigh` | Connacht | **A** | no |
| **negation / questions** | | `níl` · `ní` · `níor` · `nach` · `an bhfuil` · `ar` + lenition · `ar mhaith leat?` | — | **A** | no |
| **possessives** | `his` / `her` | `a` + lenition / `a h-` before vowel | — | **A** | no |
| **prepositional pronouns** | `with me`, `at me`, `on me` | `liom`, `agam`, `orm` | — | **A** | no |

**`cén chaoi a bhfuil tú?` is the single best-evidenced item here.** A corpus text names it *"an
leagan Connachtach"* — the Connacht version — outright, and it turns up repeatedly in real
transcribed oral speech from Aran (*"Dia is Muire duit Áine. **Cén chaoi a bhfuil tú** inniu?"*).
Nothing else in this document is sourced that well.

**Copula policy (my decision, conf B):** the copula appears in the first 50 seeds **only as frozen,
individually-glossed chunks** — `ba mhaith liom`, `níor mhaith liom`, `céard é`. Never taught as a
paradigm. `tá`/`níl`/`an bhfuil` is the spine and does all productive work. This ratifies what the
build already does.

---

## 2. The forks — smallest and most consequential first

Each answerable with one word.

### Fork 1 — `ag iarracht`: **kill** or keep?

**My answer: KILL.** Evidence in the box above — seven checks, all negative, including zero hits in
686 pages of the target dialect. **Cost: two seed translations (46, 47), neither decomposed.
Nothing is banked on it.**

**The case for keeping:** none I can find. If a native tells you they say it, believe them over me.

---

### Fork 2 — "I'm trying to" → `tá mé ag iarraidh`, the same words as "I want to"? **Yes** or no?

**My answer: YES.** This is the fork that matters most.

`ag iarraidh` natively means both — that is not a workaround, it is the language. FGB files both
under one sense (quoted above). de Bhaldraithe, *a Cois Fharraige native speaker*, gives both from
the identical string:

> *I wanted to see him* → **bhí mé ag iarraidh** é a fheiceáil
> *I was trying to catch his eye* → **bhí mé ag iarraidh** a umhail a tharraingt orm

And in real Connemara speech, from Ó Curnáin's transcripts with his own glosses:

> *"Bhfuil tú **ag iarraidh** mé a bhearáil?"* — glossed *"want to get me barred?"*
> *"tá sí **ag iarraidh** í a athrú"* — glossed *"she wants to be changed"*
> *"Bhí muid **ag iarraidh** finiseáil stuf"* — *we were trying to finish stuff*

**What this buys, all at once:**

- The `iarraidh` / `iarracht` minimal pair **stops existing.** Nothing left to drill apart.
- "Try" costs **zero new vocabulary**. Seed 1's lego already produces it.
- `ag triail` stays dead, and I agree with your learners — with a new reason. In the target dialect
  Ó Curnáin records `triail` as the verb of **`triall`, "journey, head for"**; FGB's own glosses for
  it are all *test / trial / try on / try a case in court*. Your learners reading it as "trialling"
  were reading it correctly.
- The 45-seed quarantine and the whole contrast-drilling plan become **unnecessary**, not merely
  satisfied.

**ZUT holds.** ZUT bans one English prompt with two Irish answers. This is the opposite — two
English prompts, one Irish answer. Every prompt keeps exactly one predictable target.

**The losing case, fairly.** The learner meets "I'm trying to learn" and is asked for the same words
they learned for "I want to". Some will read that as sloppiness — the exact trust failure you ruled
on yesterday. Mitigation: the presentation says it out loud and confidently, and unlike `ag triail`
we can produce Ó Dónaill if anyone argues. I judge the trust risk **lower** than `ag triail`,
because a learner who checks finds we are right. But it is real and the weighing is yours.

---

### Fork 3 — non-progressive "to try" → `iarracht a dhéanamh`? **Yes** or no?

**My answer: YES — for the eight sentences that need it, nowhere else.** *This re-opens your
rejection.*

Eight of 22 "try" sentences embed try under something else and cannot take a progressive: seeds
**48, 49**, 146, 236, 407, 491, 541, 579. `Tá mé ag iarraidh ag iarraidh…` is nonsense.

`iarracht a dhéanamh` is FGB's own frame, and the base course teaches it — its seed 283 renders
*"Shouldn't we attempt to set a good example?"* as `Nár chóir dúinn iarracht a dhéanamh dea-shampla
a leagan?`. **That is word-for-word our seed 407** (*"shouldn't we try to set a good example?"*). For
the exact sentence we must translate, a native already chose this form.

**Why it is safe now and was not before.** Your objection was two "try" words a learner can't choose
between. Under this inventory there aren't two competing: one progressive (`ag iarraidh`, which is
also "want") and one nominal construction that only ever appears **embedded**, glossed **"to make an
attempt"**, never "to try". Different shape, different slot, different gloss, first arrival seed 48.

**Runner-up, and why it lost: `féach le`.** FGB carries it as a dedicated headword — *"féach le, v.t.
Try to; try, attempt"* — and de Bhaldraithe gives it **first**. It is genuinely the tidier verb. But
Connacht has largely swapped `féach` → `breathnaigh` for "look", so `féach le` survives there as a
fixed idiom rather than a live form, and `féach` is the Munster-leaning member of the pair. I would
rather not put a Munster-flavoured stem in front of a learner for a concept this frequent.

**Bonus: seed 48 needs neither.** *"I want to try as hard as I can today"* →
**`Tá mé ag iarraidh mo dhícheall a dhéanamh inniu`**. de Bhaldraithe: *"I'll try my hardest to be
there — **déanfaidh mé mo mhíle dícheall** a bheith ansin."* Idiomatic, no doubled verb, no
`iarracht`. Your sharpest blocked seed dissolves.

**Honest note on seed 49** (*"I'm going to try to explain what I mean"*): no dictionary renders
English periphrastic *going to* + *try*, and the natural Irish is a plain future
(`Déanfaidh mé iarracht…`). But the course teaches `I'm going to → tá mé chun` at seed 4, so a
future here would break that gloss. `Tá mé chun iarracht a dhéanamh a mhíniú…` is correct and heavy.
**Flagging, not hiding:** this one sentence stays slightly awkward whatever we do.

---

### Fork 4 — move the four "try" seeds back to 2, 6, 7, 8? **Yes** or no?

**My answer: YES.**

They were exiled to 46–49 to quarantine a word that no longer exists. The exile cost real quality:
it took `foghlaim` out of the opening and pushed "learn" to seed 16, making seeds 2 and 3 thinner —
the F3 problem, worsened.

It also fixes the **worst "long words early" problem in the course**. Seed 2 is currently
`cén chaoi le labhairt chomh minic agus is féidir` — about thirteen syllables and two multi-word
chunks, as the second thing a learner ever says. The original seed 2 is `Tá mé ag iarraidh foghlaim`
— six syllables, one new word, built entirely from seed 1.

**The losing case:** a second permutation of the same seeds inside 24 hours, and every permutation
risks corrupting the ordering. Snapshots exist, so it is undo-able — but it is work.

---

### Fork 5 — "can": `in ann` only, retiring `an féidir liom`? **Yes** or no?

**My answer: YES.**

`tá mé in ann` is the Connacht form (independently sourced, and present in Ó Curnáin — including the
Connemara spelling-as-spoken `i ndan`). `is féidir liom` is attributed to **Munster**, not merely
"bookish". The base has `in ann` 646 against `ábalta` 0.

But **the new course has already banked both**: `to be able → a bheith in ann` at seed 7 and
`if I can → an féidir liom` at seed 6. Two constructions for one concept three seeds apart is the
try/want defect in a different coat.

Seed 6 becomes `Níl mé cinnte an bhfuil mé in ann cuimhneamh ar an abairt ar fad`, and `in ann`
debuts at 6 instead of 7 — better tiling, since seed 7's `a bheith in ann` then reuses a known piece.

**The losing case:** `an féidir liom` is two syllables shorter and is correct Irish, just not the
most Connacht choice — and the Munster attribution rests on one teaching site, which is thin.
This is also the **most expensive item in the document** (§4).

`chomh minic agus is féidir` stays: frozen idiom, "as is possible", not "can". Flagged in the clash
register rather than removed.

---

### Fork 6 — "want": keep `tá mé ag iarraidh`, or switch to `ba mhaith liom`? **Keep** or switch?

**My answer: KEEP — and keep both, with the division of labour already there.**

You said you didn't mind if I chose `ba mhaith liom`. I'm declining. The corpus shows a native
already made a cleaner decision than either:

| | base corpus | English side |
|---|---|---|
| `tá mé ag iarraidh` | 2,680 items | 2,625 contain "want"; 22 "would like" |
| `ba mhaith liom` | 972 items | 898 contain "would like"; 24 "want" |

92–97% clean, and it maps onto a distinction **English already makes**. The seed corpus needs it:
**114 seeds say "want", 9 say "would like"**. Putting a conditional-copula construction under the
highest-frequency slot in the course would be a mistake.

The dictionaries agree: NEID's headline verb-phrase for "want (desire sth)" is **`bheith ag
iarraidh`**, listed ahead of everything else; FGB never glosses `ba mhaith liom` as bare "want" —
always "I'd like" / "I would like".

**The losing case is stronger than I expected, and you should hear it.** Three things point the
other way:
1. `ba mhaith liom` is shorter (3 syllables vs 5), easier, and collides with nothing.
2. In the corpus's tagged **spoken** documents, `ba mhaith liom` has direct hits and `tá mé ag
   iarraidh` had none in the sample pulled. (Weak — it may just reflect what's in the speech
   subset — but it is what the data showed.)
3. **Ó Curnáin, on our target dialect, verbatim:** *"In the past form with maith, i.e. ba mhaith le,
   etc., there is often **present meaning**, e.g. **ba mhaith liomsa gubáiste** *I am fond of
   cabbage*, in addition to regular conditional meaning *I would like cabbage*."*

Point 3 cuts both ways and it is important — see Fork 10. My answer stands on the frequency data:
114 against 9.

---

### Fork 7 — "I speak": `labhraím`, or `tá Gaeilge agam`? **`labhraím`** or `agam`?

**My answer: `labhraím` — with the least confidence of anything in this document.**

`Tá Gaeilge agam` — "I have Irish" — is the idiomatic way to state language *ability*, and my worker
found a forum contributor calling `An labhraíonn tú Gaeilge?` **"utter nonsense"** for that sense.
That is a real warning and I am not going to bury it.

I still choose `labhraím`, because `Tá Gaeilge agam` is idiom-locked to languages: it cannot say
"I speak slowly", "do you speak to him?", "she speaks very well". `labhraím` / `labhraíonn tú` is a
productive pattern across 21 "speak" seeds, and it is the base's own choice at its seed 2. The
habitual/progressive split is then clean and English-cued.

**The losing case:** *"I speak a little Irish now"* (seed 5) is exactly where a Connemara speaker
would say `Tá beagán Gaeilge agam`. **This is the item I would put in front of a native first.**
Also honest: no source I reached states that synthetic 1sg `labhraím` is specifically Connemara —
it is an argument from what sources *didn't* say. Conf **B**, edging to **C**.

---

### Fork 8 — "I need" and "I have to": two forms or one? **Two** or one?

**My answer: TWO** — `I need to → tá orm`, `I have to → caithfidh mé`.

The base glosses **both** as `tá orm`, which passes ZUT but flattens two prompts a learner keeps
meeting separately (38 seeds "need", 12 "have to").

Plainly: **Irish does not distinguish these the way English does.** Both forms translate either. The
assignment is **arbitrary but consistent** — chosen so each English prompt has one predictable
answer, not because semantics demand it. If you'd rather one form did both, that is defensible and
cheaper; it just means the learner never produces `caithfidh mé`, which they will hear everywhere.

Good news on the length constraint: **Cois Fharraige pronounces `caithfidh` as [kaː]** — the `-idh`
is simply gone. It is one of the *easiest* forms in the inventory, not one of the heaviest.

`I need <a thing>` (seed 96, *"I need a little more time"*) is a genuinely different pattern,
`tá … uaim`.

---

### Fork 9 — `éigin` or `eicínt`? **`éigin`** or `eicínt`?

**My answer: `éigin`** — but the evidence against me got better and you should see it.

The dialect spec answers this: `eicínt` is a *respelling* of a word with a standard form, so it
fails the governing line, and a learner taught `eicínt` cannot look up `éigin`.

**The counter-evidence:** `eicint` is directly attested in transcribed Aran oral speech
(*"coicís déarfainn a chaith sé sa mbaile nó rud **eicint**"*), while `éigin`'s enormous raw corpus
count is mostly an artefact of that corpus being dominated by EU legislation. So the honest reading
is **not** "`éigin` is commoner in speech" — it is "`éigin` is the written form and `eicínt` is how
it is said."

That is exactly what the orthography/lexis split was built to handle: pronunciation belongs to the
voice, not the spelling. **If you want the course to *sound* Connemara more than it *reads*
standard, this is where you move the line** — a coherent position, just a different one from the
spec you ratified.

---

### Fork 10 — "I like": `is maith liom`, or avoid it? **`is maith liom`** or `taitníonn`?

**This fork did not exist when I started. Ó Curnáin created it, and it is sharper than try/want was.**

The course has banked `ba mhaith liom` (seed 4) and `níor mhaith liom` glossed *"I wouldn't like"*
(seed 13). The plan was for `is maith liom` = "I like" to arrive later. **In our target dialect that
distinction is not reliable:**

> Ó Curnáin, verbatim: *"ba mhaith liomsa gubáiste — **I am fond of cabbage**, in addition to regular
> conditional meaning I would like cabbage"* … *"**níor mhaith liom a bhlas** — **I don't like** the
> taste of it."*

So in Connemara `ba mhaith liom` already covers "I like", and `níor mhaith liom` already means
"I don't like" — the gloss seed 13 banked is at best ambiguous **in the dialect we chose**. Adding
`is maith liom` later would put two forms one vowel apart, sharing all three words, competing for
overlapping meanings.

**My answer: `taitníonn … liom` for "I like", and keep `is maith liom` out of the course.**
`Taitníonn sé liom` shares nothing with `ba mhaith liom` — different verb, different structure,
zero collision. Base corpus has it 14×. Only 8 seeds say "I like", so the cost is small.

**The losing case, and it is serious:** `is maith liom` is far commoner than `taitníonn`, it is what
every other Irish course teaches, and `taitníonn` inverts the subject (*"it pleases me"*), which is
hard for a beginner. Choosing `taitníonn` buys safety with naturalness. **If you'd rather have
`is maith liom`, then it must not arrive before ~seed 100 and it needs the deliberate side-by-side
contrast drilling that was written for try/want** — that plan transfers here almost line for line.

Either way, **seed 13's gloss "I wouldn't like" should be reviewed** (conf B).

---

### Fork 11 — `cén chaoi le` + a bare verbal noun at seed 2? **Native ear needed.**

Your open item 1, and **I will not pretend to settle it.** `cén chaoi le Gaeilge a labhairt` is
fine. Object-less `cén chaoi le labhairt` is the thin case, and my reading (conf **C**, my own
Irish, unsupported) is that a Connemara speaker would restructure.

If Fork 4 passes this stops being a seed-2 problem: seed 2 becomes "I'm trying to learn" and
`cén chaoi le` moves later, where the objectless case can be avoided in the phrases. **My preferred
handling: don't rule on it — relocate it.**

---

## 3. The clash register

| # | The pair | Distance | Handling |
|---|---|---|---|
| 1 | ~~`ag iarraidh` / `ag iarracht`~~ | 1 syllable | **DISSOLVED.** Fork 1. |
| 2 | **`is maith liom` / `ba mhaith liom` / `níor mhaith liom`** | **one vowel; same three words; overlapping meanings in Connemara** | **Now the sharpest hazard in the course.** Fork 10 — my answer is to keep `is maith liom` out entirely and use `taitníonn … liom`. If overruled, max separation + the transferred drilling plan. |
| 3 | `ba mhaith liom` / `níor mhaith liom` | negation only | Seeds 4 and 13. Normal positive/negative contrast — but the *gloss* on 13 needs review (Fork 10). |
| 4 | `a ainm` (his name) / `a hainm` (her name) | one /h/ | Seeds 16, 17, adjacent. **Deliberate adjacency is the right handling** — met as a pair, never by accident. Keep. |
| 5 | `an féidir liom` / `in ann` | two forms, one concept | **Resolved by Fork 5** — `in ann` only. |
| 6 | `is féidir` in `chomh minic agus is féidir` vs the retired `is féidir liom` | same string, different job | Residual after Fork 5: met once at seed 2 glossed "as possible", never again. **Acceptable.** Flagged, not fixed. |
| 7 | `céard atá` (what's) / `céard é` (what … is) | glosses look identical | Seeds 8, 13. Real rule, not learnable from the glosses. **Keep `céard é an freagra` as one unsplit chunk** so no competing `what is` lego exists. |
| 8 | `bualadh le chéile` (to meet) / `bualadh le` (to meet with) | one word | Seeds 14, 18. Held by gloss. Acceptable; watch it. |
| 9 | `labhairt` / `ag caint` / `labhraím` / `ag labhairt` | four ways to talk | Held by four distinct glosses. **Don't also teach `ag labhairt`** — `ag caint` covers "talking" and the base prefers it 134 to 64. |
| 10 | `ar ball` / `ar fad` / `ar bith` | `ar` + monosyllable ×3 | Seeds 6, 10, 12. Low risk, different glosses. Don't add a fourth in that stretch. |
| 11 | `tá orm` (need to) / `caithfidh mé` (have to) | conceptually identical | Fork 8. Arbitrary-but-consistent, declared as such. |
| 12 | `tá a fhios agam` / `tá aithne agam ar` | both "I know" | Held by gloss: "I know that…" vs "I know him/her/them". Base does this correctly. |
| 13 | **`níl a fhios agam` (our spelling) vs `níl fhios am` (what Connemara says)** | — | **New, from Ó Curnáin:** he records `níl fhios am/ad/aige` throughout — no `a`, and `agam` → `am`. So the base's `níl fhios agam`, which this build "corrected", is the *dialect* form. Under our governing line the Caighdeán spelling `níl a fhios agam` still wins — but **the correction was an orthography call, not a defect fix**, and the build report described it as the latter. Worth knowing. |

**Long / hard forms in the opening:**

| Form | Load | Where | Action |
|---|---|---|---|
| `chomh minic agus is féidir` | 8 syllables | **seed 2** | Fork 4 moves it off seed 2. |
| `cén chaoi le labhairt chomh minic agus is féidir` | ~13 syllables | **seed 2** | Same — Fork 4 replaces seed 2 with a 6-syllable sentence. |
| `tá mé ag iarraidh` | 5 syllables, awkward glide | seed 1 | **Unavoidable and correct.** Most useful construction in the language. Accept. |
| `cén chaoi` | 2 syllables but opens with [x], which English lacks | seed 2+ | Accept — it is the best-attested item we have. Flag for the voice. |
| `níl a fhios agam` | 4 syllables, opaque spelling (`fhios` ≈ "iss") | not yet built | Introduce late; presentation states the pronunciation. |
| `caithfidh mé` | **[kaː] mé — 2 syllables** | not yet built | **No action. It is easy.** My initial assumption that it was heavy was wrong. |
| `i ndáiríre` | 4 syllables, stress on 2nd, two slender r's, eclipsis | not yet built | **The genuinely hard one.** Delay it. |
| `iarracht a dhéanamh` | 5 syllables | seed 48+ | Fine at that depth. |

---

## 4. What changes in the existing build

Measured from the 19 committed decomposition files (473 documented phrase lines against 535 banked —
close estimates, not exact DB counts).

| Change | Seeds touched | Legos | Phrase lines | Notes |
|---|---|---|---|---|
| Fork 1+2 — kill `ag iarracht` | 46, 47 | 0 | 0 | **Free.** Neither decomposed. Two strings. |
| Fork 3 — `iarracht a dhéanamh` for the 8 | 0 built | 0 | 0 | **Free now.** Unblocks 48, 49 + six later. |
| Fork 4 — move try-seeds back to 2, 6, 7, 8 | **~8 rebuilt, 1–20 renumbered** | ~25 | ~200 | **The big one.** Yesterday's operation in reverse; snapshots exist. |
| Fork 5 — `in ann` only | **15 of 19 seeds carry `an féidir liom`** | 1 | **42 lines** | 1 lego at seed 6; ~42 phrases across 15 seeds. |
| Fork 10 — `taitníonn` for "I like" | 0 built (+ review seed 13's gloss) | 0–1 | 0 | Concept not built yet; the gloss review is one line. |
| Forks 6, 7, 8, 9 | 0 | 0 | 0 | Ratify what is built, or concern unbuilt concepts. |
| Clash #9 — drop `ag labhairt` | 0 | 0 | 0 | Nothing built uses it. |

**Accept everything: ~8 seeds rebuilt, ~26 legos rewritten, ~240 phrase lines regenerated — about
half the banked phrase layer.** That is one re-run of the pipeline that produced them yesterday, and
yesterday's destroy-and-restore worked cleanly, so the machinery is proven.

**Accept only Forks 1, 2 and 3** — the correctness ones, not the taste ones — **and the cost is two
translation strings and nothing else.** Everything banked stays banked. **That is the minimum safe
move and I would take it even if you rule against everything else.**

**One thing you gain, not lose:** the try/want contrast-drilling plan is no longer needed for
try/want — but it is not wasted. It transfers, almost line for line, to the `maith liom` family
(clash #2), which is a sharper pair than the one it was written for.

---

## 5. Sources — and where I had none

**Dictionaries and grammar** (all verbatim-quoted in the evidence files):
Ó Dónaill FGB — `iarr` (sense 2 "Attempt"), `iarracht`, `triail`, `féach le`, `tabhair faoi`,
`dícheall` · An Foclóir Beag · de Bhaldraithe English–Irish (TRY, WANT, `ag iarraidh`) ·
focloir.ie New English–Irish Dictionary (TRY, WANT, CAN) · Irish Grammar Database · Wiktionary
(Cois Fharraige `caithfidh` = [kaː]; Galway `iarraidh` /ˈiəɾˠə/).

**Dialect description — the strongest source, and it was unmined until this run:**
**Ó Curnáin, *The Irish of Iorras Aithneach, County Galway* (DIAS, 2007)**, freely downloadable.
A worker found it but this sandbox has no PDF tooling, so **I wrote a raw zlib/PDF text extractor
and mined Volume II myself** (686 pages, 1.8 MB of text). Everything attributed to Ó Curnáin above
is from that extraction, quoted verbatim. Iorras Aithneach is Carna — deep Connemara, mainland, and
much closer to our target than the Aran material.

**Corpora:**
- National Corpus of Irish (corpas.ie), queried live through its JSON API with per-line register
  and source metadata — this is where `cén chaoi a bhfuil tú` and `eicint` were confirmed in tagged
  **speech**, and where the honest `ag iarracht` count came from.
- The native base corpus, `scripts/en-ga-compare/en-ga.json`, 15,904 items — measured directly.
- Bailiúchán Béaloidis Árann (bba.duchas.ie) — real transcribed oral interviews. **Aran, not Cois
  Fharraige** — same family, not identical.

**Calibration, as required.** My matcher treats `á é í ó ú` and apostrophes as word characters,
because a plain `\b` regex splits accented Irish words:

| check | expected | got |
|---|---|---|
| known positive `céard` | ~644 | **641** (items containing; an occurrence-count gives 644) |
| known positive `in ann` | 646 | **646** |
| known negative `cad` | 0 | **0** |
| trap: `cad` inside `cadás` | no match | no match |
| trap: `ar` inside `arán` | no match | no match |
| trap: `ann` inside `ceann` | no match | no match |
| total item count | 15,904 | **15,904** |

A worker's independent census caught a further failure worth recording: **plain-ASCII probe strings
silently return 0 against fada-bearing corpora.** Fixed by fada-correcting each probe, not by
diacritic-folding (which would collapse distinct words).

### GAPS — where I had nothing

- **No Gaeilge Weekly transcript was obtained.** You named it and we went looking. The podcast is
  real (366 episodes, three difficulty tiers) but sits behind Patreon; Rephonic and Metacast both
  advertise transcripts and both returned **HTTP 403** to every attempt. **No line of Gaeilge Weekly
  Irish informs any decision in this document.** It is a live lead for anyone with a browser
  session or an account, not a dead end.
- **RTÉ Raidió na Gaeltachta**: every page 403'd. We do not know whether transcripts exist there.
- **TG4 / Ros na Rún**: Irish subtitles confirmed to exist as a broadcast feature, but burned into
  video, not extractable text.
- **Ó Siadhail, *Learning Irish*** — the one source that would settle most of Forks 7 and 11 — is
  access-restricted on archive.org in both copies. **Not one page was read.** Same for de
  Bhaldraithe's *Gaeilge Chois Fharraige* (print-only via DIAS) and the *Caint Chonamara* corpus
  (€32 paywall, not crossed — zero-spend rule).
- **Ó Curnáin volumes I, III and IV are still unmined.** I extracted Volume II (the verb) because it
  was where want/try/can live. Volume IV is the transcribed-speech volume and is the obvious next
  target. My extractor is at `/tmp/pdfx.py` and works.
- **Two bans in the dialect spec are unsourced.** `is dóigh liom` as Munster and `ábalta` as Ulster
  could not be verified by any source; FGB carries `is dóigh liom` with **no dialect label**. Not
  refuted — but the validator is currently rejecting content on an unverified basis. **I have not
  changed the spec**; flagging it for you.
- **teanglann's dialect audio is not dialect evidence** — every headword has all three dialect
  recordings, including `fosta` and `ábalta`, which are on our own forbidden list. Anyone reasoning
  "a Connacht clip exists, therefore it's Connacht" will wave Ulster forms straight in.
- **A sourced Connacht rule the spec doesn't carry:** `sa mbaile` — eclipsis after `sa` where the
  Caighdeán lenites. That is a grammar-vs-orthography call our rails don't automatically settle.
- **No native Connemara speaker has seen any of this.** Unchanged and still the largest gap.
  Forks 7, 10 and 11 are the three I would put in front of a native first.
- **Confidence C — my own Irish, unsupported:** the objectless `cén chaoi le labhairt` judgement
  (Fork 11); the claim that `chomh minic agus is féidir` is a frozen idiom distinct from `is féidir
  liom` (clash #6); the syllable-load "hard for an English speaker" judgements.
- **No TTS was generated**, so every pronunciation claim here is a *reason*, not a *measurement*.

---

## 6. Spend

**£0.00.** No TTS, no renders, no deletions, no writes of any kind. The only database access was a
read-only `SELECT` of the 668 English seed texts of `gle_cn_for_eng`. **The live `gle_for_eng`
course was never touched** — every base-corpus number above comes from the legacy JSON export on
disk.
