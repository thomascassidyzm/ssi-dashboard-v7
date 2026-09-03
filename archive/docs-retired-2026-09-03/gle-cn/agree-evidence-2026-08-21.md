# "I agree" — re-measured trap-aware, before it is ruled

**Seeds 83 and 84, `gle_cn_for_eng`. Measured 21 August 2026, at Tom's direction, so the ruling
rests on evidence rather than on an untested zero.**

The earlier note that *"`aontú` scores zero in Ó Curnáin"* was true and useless. This is the
re-measure: read in Python, apostrophes folded, inflected and mutated forms covered, and — the
part that mattered most — **a positive control for the alternative, not just for the incumbent.**

---

## Calibration first, as required. State these before reading anything below.

| control | got | expected | |
|---|---|---|---|
| `Gaeilge` | **121** | 121 | OK |
| `duine` | **521** | 521 | OK |
| `bhí` | **3133** | 3133 | OK |

All three exact across the four volumes. The extraction is sound and the numbers below are readable.

> **My own first pass failed this check and the check caught it.** I ran case-insensitively where
> the reference tool runs case-sensitively; `duine` came back 654 against an expected 521 and `bhí`
> 4011 against 3133. Every finding from that pass was discarded and re-run. This is exactly why the
> calibration is printed before the result and not after.

---

## A third trap, found while doing this — and it would have decided the question wrongly

`tá an ceart agat` probes as **0**. That zero is an artefact.

**Ó Curnáin does not write `agat`. He writes `a'd`.**

| form | count across ~2,700 pages |
|---|---|
| `agat` (standard spelling) | **21** |
| `a'd` (what he actually writes) | **527** |

So the second word of the idiom is itself near-absent in standard orthography, and any zero built
on it says nothing whatever about the dialect. Probed correctly, `ceart a'd` returns 2 — see below.

This is the third member of the same family as the binary-file trap and the apostrophe trap, and it
is now **fixed in the tool rather than written in a doc**: `ocurnain-probe.py` detects a zero on a
probe containing a standard-spelling prepositional pronoun, re-probes it in the dialect spelling,
and prints *"THIS ZERO IS NOT EVIDENCE until you read that number instead."*

---

## A. The form the course currently uses — `aontaím`

| probe | vol1 | vol2 | vol3 | vol4 | total |
|---|---|---|---|---|---|
| `aontaím` (1sg present — **the course's own form**) | 0 | 0 | 0 | 0 | **0** |
| `aontaíonn` | 0 | 0 | 0 | 0 | **0** |
| `aontú` (verbal noun) | 0 | 0 | 0 | 0 | **0** |
| `d'aonta…` (past) | 0 | 0 | 1 | 0 | **1** |
| `aont…` raw | 25 | 6 | 10 | 22 | 63 |

The raw 63 is **almost entirely homographs** and must not be quoted: `laonta` (calves), `aontaí`
(plural of *aonach*, fairs), `aontigh`/`aointigh` (same house), `éindí`. Hunt them before reporting,
as the tool's own docstring warns.

**What is actually there, and it is worth more than any count.** Vol IV's glossary carries the
headword:

> `aontaigh, v, agree', pst 3pl ~aíodar 11.129.`

One form. And §11.129, in vol III, is where he discusses it — in his own words:

> *"Note the palatalisation with **the Modern Irish borrowing** `aontaigh`: `d'aontaíodar air` … 35E."*

So the entire attestation of *agree* as a verb in this dialect is: **one past-tense form, from one
speaker, which Ó Curnáin explicitly labels a Modern Irish borrowing.** There is no present tense in
any person.

That is the same shape as the `labhair` finding that produced R6/A9 — a paradigm with no attested
present. `aontaím` is therefore doubly weak: **an unattested form of a verb he calls a borrowing.**

## B. The alternative — `tá an ceart agat`

| probe | total | reading |
|---|---|---|
| `ceart` (frame control) | **165** | the noun is common; the frame is not the problem |
| `ceart agat` | 0 | **artefact** — see the orthography trap |
| `ceart a'd` (correct spelling) | **2** | but read them |
| `an ceart a'd` | **0** | |
| `ceart a'm` (1sg) | **0** | |

Both `ceart a'd` hits are **other senses**, not agreement:

- vol I — *"tá fhios a'm go glanshiúráilte nach bhfuil sé déanta **ceart a'd**"* — "you haven't done
  it **right**". Adverbial *ceart*, not the idiom.
- vol IV, under *b'eilíbh* (belief) — *"tá an ~ **ceart a'd**"* — "you have the **right** belief".
  Attributive adjective, not the idiom.

**So `tá an ceart agat` in the agreement sense is not attested either.** Moving to it would not be
an evidence-led upgrade. It would be swapping one unattested form for another.

## C. What the corpus *does* attest — a third option nobody had on the table

| probe | total |
|---|---|
| `is fíor dhuit` (dialect spelling) | **3** |
| `is fíor duit` (standard spelling) | **0** |
| `is fíor` | 5 |
| `ní fíor` (**the negative**) | **0** |
| `nach fíor` | 2 |

The vol IV hit is a clean conversational agreement token from transcribed speech — exactly the move
seed 83 is trying to teach:

> *"Á! **is fíor dhuit**. Cuimhním go maith an lá sin ceart go leor."*
> — "Ah, you're right. I remember that day well." (speaker E)

Note also that the dialect spelling `dhuit` scores 3 and the standard `duit` scores 0, which is R1
behaving exactly as R1 says it does.

---

## The honest answer

**On attestation, `is fíor dhuit` is the only one of the three with a positive control.** But three
hits is thin, and there is a hard problem with it that I will not paper over:

> **Seed 84 is the negative, and the negative is not attested.** `ní fíor` scores **0**. Worse,
> *"ní fíor dhuit"* does not mean *"I don't agree"* — it means *"you're wrong"*, which is a
> markedly harsher speech act than the English seed. Seeds 83 and 84 are a matched positive/negative
> pair and **must move together**, so an option that only solves the positive half does not solve
> the pair.

**My recommendation, for Kai's decision rather than mine:**

1. **Do not switch to `tá an ceart agat` on evidence grounds** — it has none in this corpus either.
   If it is chosen, it should be chosen for teachability, and that reason should be written down as
   such rather than dressed as attestation.
2. **`is fíor dhuit` is the best-attested positive** and deserves to be on the table, which it was
   not before tonight.
3. **The negative half is genuinely unsolved.** This is the item to put in front of a Connemara
   speaker first, phrased as a question about what a speaker actually *says* when they disagree
   politely — not as a choice between three written forms.
4. **Leaving it open is defensible.** *We cannot tell from this corpus* is the true answer for the
   positive/negative pair as a unit, and it is better than a confident wrong one.

**Confidence: confident** on the counts and the calibration; **confident** that `aontaím` is
unattested and that Ó Curnáin calls the verb a borrowing; **best attempt** on the reading that
`is fíor dhuit` is the live conversational equivalent; **genuinely uncertain** on the negative.

---

## Sizing, already established, so the cost is known before the ruling

**2 teaching units and 24 practice phrases**, all inside seeds 83 and 84. Nothing else in the course
uses the word. If the ruling moves off `aontaím`, this is **not a word swap** — the frame changes
shape, so all 26 rows are rewritten, and the two seeds must move together as a matched pair.
