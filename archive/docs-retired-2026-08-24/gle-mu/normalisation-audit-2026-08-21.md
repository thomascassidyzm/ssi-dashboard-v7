# Munster normalisation audit — finished

**`gle_mu_for_eng`, all 668 seeds, no sampling. No writes were made. Zero audio before, zero
audio after — confirmed directly on all three Irish dialect courses. Nothing was spent.**

The job that started this at 23:16 on 20 August died at 23:34 with about 27 rows written and
no report. This is the part it never got to.

---

## The headline

**The course is in far better shape than the collision note left it.** The two operations
converged much more completely than either of them knew. I scanned the 668 seeds for every
non-Munster form that either spec bans — forty-odd of them — and all but a handful come back
**zero**: no `céard`, no `cén fáth`, no `cén chaoi`, no `cén uair`, no `anseo`, no `ansin`, no
`faoi`, no `freisin`, no `ar bith`, no `tada`, no `chuile`, no `muid`, no `amárach`, no
`sílim`, no `in ann`, no `airím`, no `rinne`, no `rachaidh`, no `feicim`, no `breathnaigh`,
no `aríst`, no `Gaeilge`, no `eicínt`, no `mise`, no `ag iarracht`, no `ag triail`, no
`thá`, no preverbal past `do`, no `ní foláir`, no `nach bhfuil`, no `ná bhfuil`, no `tá muid`.

I also confirmed the structural rulings hold across the whole course, not just in the named
places: `ná` takes the bare dependent form and never eclipses; the interrogative `an` does
eclipse; preposition-plus-article eclipsis is applied everywhere including the audible
Munster `d`→`nd` and `t`→`dt`, with **zero** un-eclipsed exceptions; `sa` lenites everywhere
and never takes the Connacht `sa m-`; the copula negative suppresses mutation everywhere; the
object rule (object + *a* + lenited verbal noun) is applied in 277 seeds with no violations;
first-person-plural is synthetic throughout; third-person-plural past is synthetic throughout.

**And I re-ran the seed-level ZUT check independently: there is exactly one duplicated English
prompt in the 668 — the forced pair at 68 and 194 — and it carries identical Irish.** No
English prompt anywhere in the course points at two different Irish sentences.

**Everything I could not check, I say so below with a count. Nothing here rests on assumption.**

---

## 1. The try-word divergence — RESOLVED, and the course is already right

**Ship `d'iarraidh`. Change nothing. The 20 seeds stand.**

### Why the two documents appeared to contradict each other

They were describing **three different things**, and the contradiction dissolves once they are
separated:

| shape | what it is | Kerry speech | Kerry prose | verdict |
|---|---|---|---|---|
| `ag iarraidh` | the standard spelling | 290 | **0** in the Blasket prose | pan-dialectal, not a Munster form |
| `a d'iarraidh` | reduced *ag* + *d'iarraidh*, as transcribed | the bulk of the 230 | rare | **out** — this writes *ag* as *a'* |
| **`d'iarraidh`** | what written Munster actually prints | — | **41** | **in** |

The dialect spec's OUT-list bans **`a' d'iarraidh`** — and it is right to, because that shape
spells *ag* as *a'*, which is aspiration captured by a transcriber, exactly like `thá`. But
the course does not write that. **The course writes bare `d'iarraidh`, which is a different
object, and the spec never ruled on it.** The try-word document's table collapsed the two,
and its own §4 says in plain words that it is *not* ruling the spelling — so its table cell
was never a ruling in the first place. Its prose is the part that was right.

### The evidence, calibrated

**Ó Sé §686, verbatim, and this is the crux:**

> *"Cuirtear an mhír* ag *roimh an bhfoirm* **d'iarraidh** *in ionad* iarraidh *leis féin"*

That sentence is in **Ó Sé's own standard-Irish prose** — his metalanguage, not a phonetic
data line with a bracketed speaker number. This matters, because the data-versus-metalanguage
distinction is the exact test that reversed the `Gaeilge`/`Gaelainn` and `éigin`/`éigint`
calls, and here it runs the other way: **`d'iarraidh` is the form Ó Sé writes when he is
writing normal orthography.** It is not eye-dialect. In the same section he glosses his data
lines as *"d'iarraidh dul lastuas ded chathaoirse"* and *"bhímíst d'iarraidh é a leanúint
amach"* — bare, with no *ag*, which is precisely the course's shape.

**An tOileánach — native Corca Dhuibhne prose: `d'iarraidh` 41, `ag iarraidh` 0.** Categorical,
and the sense is unmistakably *trying*: *"d'iarraidh iad a chur isteach ar an dtráigh"*,
*"ag rámhaidheacht d'iarraidh teacht suas léi"*, *"d'iarraidh fanúint anáirde air"*.

**Teach Yourself Irish (1961) — and this is the strongest single witness.** It is a graded
beginners' course in West Munster Irish that **confesses in its own preface that it substitutes
prescribed spellings for dialect ones**. It is therefore the best available proxy for "what
does the written Munster tradition standardise to?" — and it prints ***a d'iarraidh déarca***.
**The source that admits to standardising still does not standardise this word to `ag
iarraidh`.** That is the answer to the objection that `d'iarraidh` is something a learner
cannot look up.

Calibration: `tá`, `agus` and `bhí` all return sane non-zero counts in each of these three
files and a nonsense control returns 0, so the zeros above are real zeros.

### The live-speech measurement, which is new, and the precedent that settles it

I queried the national corpus partitioned by RTÉ Raidió na Gaeltachta's regional desks — the
Kerry desk at Corca Dhuibhne against Connemara and Donegal. The partition calibrates exactly
as expected (`muid`: Kerry 28, Connemara 9,478; nonsense control 0).

| | **Kerry** | Connemara | Donegal |
|---|---|---|---|
| `ag iarraidh` | **290** | 1,888 | 1,165 |
| `d'iarraidh` | **230** | **2** | **0** |

**This is the number nobody had.** The try-word document measured Kerry `ag iarraidh` at 290 —
which matches exactly — but never measured `d'iarraidh` in the same partition, so it saw a
one-sided picture and correctly declined to rule.

Two things follow. First, **`d'iarraidh` is a near-exclusive Munster badge — 230 against 2 in
Connemara and 0 in Donegal** — whereas `ag iarraidh` is pan-dialectal and carries no dialect
information at all. Second, inside Kerry it is a 44% minority.

**And that is the precedent, already settled, that decides it.** `Gaelainn` is a *20%* minority
inside the Kerry source — `Gaeilge` outnumbers it four to one — and the spec ruled for
`Gaelainn` anyway, in these words: *"it is 91:4 against Connemara, so it is unambiguously
Munster where it appears, and the majority is broadcast levelling."* **`d'iarraidh` is the same
shape of case and a stronger one — 230:2 against Connemara, at 44% rather than 20%.** A course
that writes `Gaelainn` and `ag iarraidh` is applying two opposite rules to two identical
situations. Ruling for `d'iarraidh` is what makes the spec coherent.

I checked the concordance lines rather than trusting the counts: both forms carry *trying* in
Kerry speech, in the same frames, so this is genuinely one word in two written shapes and not
two words.

**Authority, named:** Ó Sé §686 (primary, and in his own orthography); An tOileánach 41:0
(native prose); Teach Yourself Irish 1961 (the standardising source, which still prints the d'
form); corpas.ie CNG partitioned by RnaG regional desk, calibrated (the dialect-badge ratio);
and the `Gaelainn` ruling (the governing precedent for a minority form that is unambiguously
Munster where it appears).

**Verified in the course:** all 20 seeds use bare `d'iarraidh`; **none** has the banned
preceding *a*/*ag*; all 20 carry English *try/trying/tried*; and `d'iarraidh` never once
carries *want*, which is `teastaíonn ó` throughout. It is ZUT-clean and it is correct. **Leave it.**

---

## 2. What I verified of the settled list

Every categorical item checks out. Confirmed independently, not taken on trust:

`bhí mé` 0, `tá mé` 0 (synthetic endings in); `éigin` 0 against `éigint` 26; `amárach` 0
against `amáireach` 7; `cén chaoi` 0 against `conas` 21; `muid` 0; `rinne` 0; `tarluint` 0;
`ag iarraidh` 0 against `d'iarraidh` 20, with *want* carried by `teastaíonn` across 96 seeds.

**Two of these zeros are false-zero traps that I checked before reporting, and they are worth
naming because each one could have become a wrong ruling:**

- **`raghaidh` is 0 — and that is correct, not a defect.** There is no future-of-*téigh*
  sentence anywhere in the 668. No English prompt says *will go*. The ruling has no slot to
  apply to.
- **`chím`/`chíonn` are 0 — also correct.** There is no present-tense *see* sentence in the
  course. All 24 *see* seeds are past (`chonac`, `ní fheaca`, `chonaiceamar`, `chonaiceadar` —
  all correctly synthetic) or verbal noun (`feiscint`, 9 seeds, which is the form the spec
  requires). Nothing is missing.

**And the copula-negative precedent holds exactly as ruled — the course splits by predicate,
cleanly, in both directions.** Counted:

| subordinate copula negative | `nach` | `ná` |
|---|---|---|
| **`féidir`** — the predicate the evidence calls decisive | **3** (333, 469, 526) | **0** |
| **`maith` / `miste`** — the predicates the evidence calls genuinely mixed | **0** | **2** (63, 121) |

That is 3 out of 3 the one way and 2 out of 2 the other. **No blanket rule was applied in
either direction** — which is precisely what the settled ruling asks for, and it is better
than "defensible". Nothing to do here, and nothing to reopen.

Two neighbouring constructions are also correct and should not be confused with this one:
`ní maith` / `ní miste` (6 seeds) is the **main-clause** copula negative, correctly
unlenited; `níor mhaith` (4 seeds) is the **past** copula, correctly lenited. And `ná` never
lenites here — `ná mhaith` / `ná mhiste` are zero.

---

## 3. THE DIVERGENCES — every one, with counts

These are the places where the two operations' specs disagreed and the disagreement is still
visible in the seeds. **Nobody had checked these.** Ordered by how many sentences ride on them.

### The four that are worth acting on

**① "about" — 18 seeds, split 15 / 3. The largest divergence in the course.**

| rendering | seeds |
|---|---|
| `mar gheall ar` | **15** |
| `fé` | **3** (83, 84, 100) |

One English preposition, two Irish. The dialect spec rules **`fé`** and the ratio behind it is
one of the strongest in the whole document — **2,573 : 25** against Connemara. `mar gheall ar`
appears in **neither** spec as the word for *about*; it arrived in the locked spec as a gloss
for *because* and spread. **This is the single highest-value correction available**, and it
also puts a signature Munster form in front of the learner fifteen more times.

Three further seeds (37, 43, 565) render *about* with a governed preposition — *think about it*
→ `machnamh air`. Those are correct and are not part of the split.

**② "today / this evening" — 7 seeds, unanimous the wrong way.**

`inniu` 7, `inniubh` **0**. Not a split — a clean miss. The dialect spec rules `inniubh` on
**1,374 : 48 inside the Kerry source**, with Connemara inverting (103 : 813), and the collision
note explicitly awarded this call to that spec. Four of the seven are *tráthnóna inniu* / *ar
maidin inniu* rather than bare *today*, so all seven move together.

Worth saying plainly: the spec itself calls `inniubh` **"the boldest orthographic step in this
spec"** and lists it among the open questions a Kerry speaker should see first. The measurement
is decisive; the *decision* is a course-identity call of the same kind as `Gaelainn`, and it
should be made deliberately rather than by drift. **I recommend applying it — it is the same
rail that already put `Gaelainn`, `anso`, `ansan` and `fé` into the course** — but I am flagging
it rather than treating it as mechanical.

**③ "because" — 12 seeds, split 7 / 5.**

`toisc go` 7 (22, 47, 421, 455, 502, 547, 549) against `mar` 5 (130, 136, 270, 279, 605). One
English conjunction, two Irish, near-evenly. The dialect spec rules **`mar`** as the default
with `toisc go` as a *marked* alternative, and measures `toisc` at 168 : 2 — genuinely Munster,
but marked. The locked spec lists both without ranking them, which is how the course ended up
half and half. **This one needs a decision either way; it cannot stay 7/5.**

**④ "be able to" — 19 seeds, split 15 / 4.**

Bare `ábalta` + verbal noun 15, against **`ábalta ar`** + verbal noun 4 (11, 24, 525, 531).
**This is divergence #4 from the collision note, still live and never applied** — and that note
already settled it in favour of the bare form, on corpus evidence (*"bhí sé ábalta rudaí a
fheiceáil"*, *"ní raibh sé ábalta imeacht"*). The 15 are already right; the 4 are the stragglers.

Seed 531 is doubly wrong — *ábalta ar an gcluiche a bhuachaint* has both the stray `ar` and a
fronted object, so it should be *ábalta an cluiche a bhuachaint*.

**A note that matters for this item: *can* / *be able to* / *could* is NOT a ZUT clash.** The
course renders *can X* as `is féidir liom`, *be able to X* as `ábalta`, and *could X* as
`d'fhéadfadh` — three distinct English frames, three distinct Irish forms, applied consistently
across 76 seeds. That is correct and it is good work. The two specs disagreed here (one said
`ábalta`, the other `is féidir liom`) and the course resolved it better than either, by
splitting on the English. **Do not "fix" this into one form.**

### The five small ones

| item | ruled | in the course | divergent seeds |
|---|---|---|---|
| **2sg present question** | `an bhfuileann tú` (**288 : 1**) | synthetic 6, analytic 2 | **25, 63** |
| **"easy"** | `éascaidh` (bare `éasca` is 0 in all three Munster sources) | `éascaidh` 3, `éasca` 2 | **122, 458** |
| **"before" (conj.)** | `sara` (340 : 14) | `sara`/`sarar` 6, `sula` 1 | **25** |
| **"unless" / "if not"** | `muna` (378 : 106) | `muna` 1, `mura` 1 | **532** |
| **"anyone"** | `aoinne` (both specs) | `aoinne` 2, `éinne` 2 | **71, 202, 367, 370** |

The 2sg question is the one with weight behind it: the two specs directly contradicted each
other (one measured `an bhfuileann tú` at 288:1 and ruled synthetic; the other ruled analytic
and noted only that `an bhfuilir` is dead — which is true and is a different question). **The
course already votes 6 to 2 for the synthetic form**, and the embedded forms (`go bhfuileann
tú`, `ná fuileann tú`) are synthetic throughout, so the two analytic seeds are isolated.

`gach aoinne` for *everyone* is used consistently across 5 seeds and is correct — the split is
only in bare *anyone*.

### Two that need a human ruling rather than a sweep

**⑤ "I don't know" — 4 seeds, and the fix has a cost.**

`Ní fheadar` 3 (135, 213, 263) against `Níl a fhios agam` 1 (seed 60). The dialect spec rules
`ní fheadar` on **887 : 3 — the largest single dialect ratio in the entire document**.

**But seed 60 is deliberately paired with seed 59**, and that is why I am not calling this
mechanical:

> 59 — *I know how to do what I need to do* → **Tá a fhios agam** conas…
> 60 — *I don't know how to say enough different words yet* → **Níl a fhios agam** conas…

`ní fheadar` is a defective verb with no positive form, so changing 60 gives the learner
`tá a fhios agam` for the positive and `ní fheadar` for the negative on two adjacent seeds.
**That is what Munster actually does** — but it breaks a visibly contrastive pair the course
built on purpose. The other nine `a fhios` seeds are past, conditional or non-negative, where
`ní fheadar` is impossible, so they are correct and out of scope.

**My recommendation: change 60 and say so in the presentation.** But this is a pedagogy call,
not a data call, and the data does not make it for you.

**⑥ Seed 579, *"we've often tried"* — 1 seed, and it is the known hard one.**

Rendered `Táimid tar éis **iarracht a dhéanamh** go minic`. Every other *try* seed in the
course uses `d'iarraidh`, so this is the one place a single English word gets two Irish answers.

`iarracht a dhéanamh` comes from the locked spec §5, which **labels itself "best attempt,
flagged for a Kerry speaker"** and instructs that every seed using it be marked genuinely
uncertain. The try-word document is more specific and disagrees: Munster's light verb for
*iarracht* is **`tabhair`, not `déan`** — *"thugas **iarracht ar** mheon na ndaoine a chur
síos"*. My corpus check supports it: in Kerry speech `iarracht a dhéanamh` is 15 and `iarracht
a thabhairt` is 1, so neither frame is common, and **`déan` is not the flatly wrong choice the
document implies** — but the Munster attestation runs with `tabhair`.

There is a third option the try-word document evidences for Connemara and did not test here:
the **bare verbal noun**, *Táimid tar éis **iarraidh** go minic*, which keeps the course to one
try-word and is what the released Irish course does for this exact sentence. **I am not ruling
this one.** It is one seed, three defensible answers, and it is exactly the kind of call that
should go to a Kerry speaker rather than be decided by a worker at a keyboard.

---

## 4. What I found and am deliberately NOT recommending

**The demonstratives look wrong and are not.** `sin` 41, `san` 37, `seo` 23, `so` 3 looks like
two operations disagreeing. It is not — **it is a phonological rule, correctly applied.**
Munster takes `so`/`san` after a broad consonant and `seo`/`sin` after a slender one or a
vowel, and the course follows it: `san` after broad 24 against slender 3; `seo` after slender
13 against broad 1. That is deliberate, competent work.

About eleven tokens deviate from the rule, mostly the fixed idiom `mar sin` (which is written
everywhere, including in Munster) and three `san` after slender consonants. **I am not
recommending a sweep.** The rule requires judgement about the quality of a final consonant,
a blind replace would do real damage, and the residue is small and largely idiomatic.

**`cheapas` for *"I thought"* — 8 seeds — is a workaround, not an error.** Both specs ban
`ceapaim` for *I think*, and the course honours that: present *think* is `is dóigh liom`
across 21 seeds with **zero** `ceapaim`. But `is dóigh liom` is a copula construction with no
simple past, so past *thought* has nowhere to go and the course uses `cheapas`. Neither spec
anticipated this. It is defensible and I would leave it, but it should be recorded as a
knowing choice rather than discovered again by the next auditor.

**Do not "regularise" `is féidir liom` / `ábalta` / `d'fhéadfadh` into one form** — see ①④
above. And **do not reopen** the 55/45 want-ratio question, the preverbal `do`, or the
copula-negative-by-predicate ruling. All three are settled and the course honours all three.

---

## 5. Clash analysis — what a correction would cost

Run against the ZUT checker as it stands, not widened.

**The course currently has zero one-English-two-Irish splits at seed level, and I verified this
myself rather than taking it on trust** — one duplicated English prompt in 668 (the forced pair
68/194), carrying identical Irish.

**None of the corrections above creates a clash.** Every one of them *removes* a
one-English-two-Irish split rather than making one, because in each case the two forms are
already both live for the same English word. Checked specifically:

- `fé` for *about* — `fé` already carries *under* (487) and *at the moment* (40, 548). Those are
  different English and stay untouched; no new collision, and the preposition contracts
  correctly with the article, which the course already does (`fén ndroichead`).
- `inniubh` — no other Irish word in the course is near it. Clean.
- `muna`, `sara`, `aoinne`, `éascaidh`, `an bhfuileann tú` — each merges two spellings of one
  word into one. Nothing else moves.
- `mar` for *because* — `mar` already carries *like/as* (seed 49, `Mar so atá sé`). Merging
  *because* onto `mar` puts two English senses on one Irish word, which the ZUT rail permits
  (it bans one English with two Irish, not the reverse) — but it is the one correction here
  with a real pedagogical cost, and it is a reason to consider ruling the other way, toward
  `toisc go`. **Named so that whoever decides can decide it knowingly.**

**Mutation and governed prepositions:** every correction above needs the mutation re-derived,
not string-replaced. `sula gcaithfidh` → `sara gcaithfidh` keeps the eclipsis; `ábalta ar
chuimhneamh` → `ábalta cuimhneamh` **must drop the lenition** that `ar` was causing; `mar
gheall ar` → `fé` changes the governed mutation on the following noun. **No blind
string-replace on any of these.** Seed 531 additionally needs its object re-fronted.

---

## 6. EXPLICIT GAPS — what I could not check

**Four of the seven Munster sources on disk could not be read, and I am reporting them rather
than letting their zeros count as evidence.**

- **`peig.txt` — 163 bytes. `ocuiv-muskerry.txt` — 165 bytes.** Both are empty stubs, not
  corpora. Every count from them is meaningless. **2 sources unreadable.**
- **Dinneen 1904 and Dinneen 1927 — 2.9MB and 5.7MB, and both are OCR of Gaelic type.** The
  Irish extracts as a mangled character set (*comAinti*, *Aijce-fi-oit*), so a Roman-alphabet
  search returns 0 for words that are certainly present — `tarraing` returns **zero** in a
  dictionary, which is absurd on its face. **`iarraidh` returns 0 in both, and that zero is an
  artefact, not evidence.** Had I trusted it, it would have read as two dictionaries declining
  to attest the word. **2 sources unreadable.**

Neither gap changes the try-word verdict, which rests on three sources that calibrate cleanly
and on the live corpus partition. But the Dinneen entry for *iarraidh* is the one piece of
lexicographic evidence nobody on this question has actually read, in any dialect, and it stays
unread until someone extracts those files properly.

**No other gap.** All 668 seeds were read in full. No sampling was used anywhere in this audit.

---

## 7. What I recommend, in order

**Nothing has been applied. No row was written. This is a report, and the decisions are yours.**

1. **Leave the try-word alone.** `d'iarraidh` is right, on Ó Sé's own orthography, on 41:0 in
   native Blasket prose, on the standardising textbook's own practice, and on the `Gaelainn`
   precedent. Correct the try-word document's table cell so it stops contradicting its prose.
2. **Apply the four with counts behind them** — `fé` for *about* (18 seeds), `inniubh` (7),
   bare `ábalta` (4), and the 2sg synthetic question (2). Deriving mutation each time, one
   seed at a time, not by sweep.
3. **Rule "because" deliberately** — 7/5 is the one genuine coin-flip in the set, and §5 above
   names the cost of each direction.
4. **Apply the five small spelling merges** — 8 seeds in total, all low-risk.
5. **Send seed 60 and seed 579 to a Kerry speaker.** Two seeds, and both are judgement calls
   the data does not settle.
6. **Leave the demonstratives and `cheapas` alone**, and record both so the next auditor does
   not rediscover them as defects.

**All of it is text. None of it costs money. The course still holds zero audio rows, and
nothing here should change that until the text is settled.**
