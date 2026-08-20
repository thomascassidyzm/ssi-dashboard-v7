# The Donegal corpus contradiction, resolved

**2026-08-20.** Two workers reported opposite things about whether a countable Donegal corpus exists.
This is the adversarial re-check. Every number below was re-counted live by me, from scratch, without
reusing either worker's figures.

---

## Verdict

**Both reports are true. They were answering different questions and neither said which.**

- The corpus hunt (#554) searched **this machine**. Its finding is correct and stands in full: there is
  no countable Donegal text on disk, and its two candidate Ulster items are correctly disproved.
- The Ulster build (#528/#551) counted a corpus that is **not on this machine at all**. It queried
  `corpas.ie` over the network. That corpus is **real, live, and countable**, and I reproduced its
  numbers exactly.

There is no contradiction between the two findings. There *is* a contradiction between the build's
**description** of its evidence and what that evidence actually is, and one of the build's supporting
claims is false.

**The ruling itself — that `ní` is the Donegal default and all 668 seeds should use it — STANDS.**
The headline number quoted for it (11:1) does not. The honest figure is a range, and the build picked
the end of that range most favourable to its own decision.

---

## 1. Is the corpus real? Yes — and I calibrated it before believing anything

The material is the CNG corpus at `corpas.ie`, partitioned by RTÉ Raidió na Gaeltachta's regional
desks plus a Donegal folklore archive. It is **transcribed running speech in ordinary Irish
orthography**, not phonetic transcription and not OCR mush.

The mandated calibration — words that must appear in any real running Irish text — run by me against
the Donegal partition:

| word | Donegal | Connemara | Kerry |
|---|---|---|---|
| `agus` | 24,508 | 46,798 | 43,068 |
| `tá` | 16,629 | 28,428 | 13,535 |
| `sé` | 10,095 | 23,911 | 21,449 |
| `bhí` | 7,794 | 16,841 | 14,384 |
| `ní` | 2,954 | 8,281 | 9,473 |
| `duine` | 2,239 | 2,599 | 2,580 |

These are plausible running-text frequencies. **This is a real corpus.** It is the exact opposite of
the Quiggin result, where `bhí` and `sé` returned zero across 690,000 characters.

I also confirmed the false-zero trap is real and armed. Source names are matched as **full-string
regexes**. Querying the short label `Béaloideas Beo` returns **0** — identical to querying a source
name I invented. The archive only answers to its full name. A worker who abbreviated it would have
concluded the Donegal folklore archive does not exist.

**Provenance.** The two Donegal sources are genuine: `RnaG (Barrscéalta)`, RTÉ's Donegal programme
broadcast from na Doirí Beaga; and `Béaloideas Beo — Tionscadal Béaloidis Ghaeltacht Thír Chonaill`,
the Donegal Gaeltacht Folklore Project. Together ~1.36M tokens, which matches the build's claim.

---

## 2. Does 561 : 6,293 reproduce? Exactly — to the last digit

| form | Donegal | Connemara | Kerry |
|---|---|---|---|
| `cha` | 324 | 2 | 3 |
| `chan` | 166 | 6 | 5 |
| `char` | 71 | 5 | 0 |
| **cha-family** | **561** | 13 | 8 |
| **ní-family** | **6,293** | 14,571 | 13,173 |

Every figure reproduced. The counting was done honestly and the arithmetic is right.

---

## 3. Where the build went wrong — it used one Donegal source and took the wrong one

The build counted **only the broadcast source**. It never queried the folklore archive, which is real
Gaeltacht interview speech and the better witness for how Donegal is actually spoken. I ran it:

| | Folklore archive (Gaeltacht speech) | Broadcast |
|---|---|---|
| cha-family | 517 | 561 |
| ní-family | 1,889 | 6,293 |
| **ratio** | **3.7 : 1** | **11.2 : 1** |
| **cha as share of negation** | **21.5%** | 8.2% |
| `cha` density per 100k tokens | **207** | 50 |

**`cha` is four times denser in genuine Gaeltacht speech than in broadcast Irish.** Broadcast Irish is
more standardised; that is unsurprising, and it is exactly why using it alone understates `cha`.

The most robust comparison is the same verb in the same slot, which is immune to any miscounting of
`ní` as a noun: `ní raibh` vs `cha raibh` is **6.2:1** in broadcast and **3.2:1** in Gaeltacht speech.
Both still favour `ní`.

---

## 4. The corroboration claim is false

The build says a second worker "reached the same ratio from completely different material." Checked:

- **Not different material.** That worker used the same website, the same instrument, and one of the
  same two sources. The overlap is direct, not independent.
- **Not the same ratio.** It reported 3.2:1, not 11:1. The two are not in conflict about the data —
  their raw counts agree perfectly — they differ because one worker counted the better source and the
  other did not.
- Its third strand, the Doegen 1928–31 transcripts, is genuinely separate material (fetched from
  `doegen.ie`, not in this corpus — I confirmed Doegen and Quiggin are both absent from it). It gives
  `cha` 52 : `ní` 70, about **1.35:1** — pointing the *opposite* way, and suggesting `cha` has been
  receding for a century. That worker labelled it directional evidence rather than a measurement,
  which is the right call.

So the one genuinely unsupported statement in the build report is its claim of independent
corroboration. There was none.

I should also record that the build report described its corpus as including "the Doegen 1928–31
recordings and Quiggin from 1906." **Neither is in it.** Quiggin is precisely the item the corpus hunt
disproved. The evidence the build actually had was good; the description it gave of that evidence was
not, and it named as a source the one item known to be uncountable.

---

## 5. One number in the build's tooling is wrong by seventeenfold

The build's own script records the Donegal partition as ~65,000 tokens. It is **1,115,513**. At 65,000,
`agus` would be 37.7% of every token in the corpus, which is impossible; the true rate is 2.2%, which
is normal. Ratios and raw counts are unaffected, but **every "per 100,000 tokens" rate published in the
build's evidence document is inflated about seventeenfold** and should not be quoted.

---

## 6. What should now be believed

1. **The ruling stands, and the 668 seeds do not need changing.** `ní` outnumbers `cha` in every
   Donegal source measured, by every method of counting, on every one of the three sources. A wholesale
   `ní`→`cha` sweep would still be a serious error.
2. **Stop quoting "11 to 1" and "8%".** They come from broadcast Irish alone. The defensible statement
   is that `ní` leads `cha` by somewhere between about **3:1 and 11:1** depending on how formal the
   speech is, and that in genuine Gaeltacht speech `cha` is about **a fifth** of all negation, not a
   twelfth.
3. **The open question is now sharper, not closed.** If the course should reflect Gaeltacht speech
   rather than broadcast register, the natural share of `cha` is roughly 21%, not 8% — a materially
   bigger presence than the build assumed. Whether any of the 126 independent-clause negatives should
   carry `cha` remains a speaker's judgement call, and `cha` is contextually conditioned in ways that
   cannot be decided from the English alone.
4. **The corpus is remote, not local.** Any future check needs the network and the full source names.
   Nothing about this evidence base can be reproduced from this machine offline — which is exactly why
   the two reports appeared to contradict each other.

The corpus hunt's warning remains the most valuable thing either report produced: a false zero reads
identically to a real dialect fact. It nearly cost this job the folklore archive too.
