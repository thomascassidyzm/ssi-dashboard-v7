# Register additions — worker T5, seeds 249–300

**Course `gle_cn_for_eng`. 20 August 2026.** Filed under §G of
`BUILD-ADDENDUM-2026-08-20-NIGHT.md`: English structures my band needed that
`translation-register-2026-08-20.md` does not cover, plus three objections to the register filed
under its own rule 3 (*use it anyway, file the objection*). **The shared register was not edited.**

Authorities: `FGB` = Ó Dónaill (1977) via teanglann.ie. `ÓC` = Ó Curnáin, *The Irish of Iorras
Aithneach* (DIAS 2007), counted today with `tools/gle-cn/ocurnain-probe.py`, controls passed
(`Gaeilge` 121). Where I give no count I did not run the probe and I say so.

---

## 0. A probe trap that nearly cost me a ruling — read this

**A literal `'` in a probe pattern returns a false near-zero.** Probing `b'fhéidir` returns **1**.
Probing `b.{0,2}fhéidir` returns **191**. The apostrophe in the extracted volumes is not U+0027.
This is the same class of trap as §D of the addendum, and it is not documented there.
**Never probe an Irish form containing an apostrophe with a literal `'` — use `.{0,2}`.**

---

## 1. Lexis and frames

| # | English | Irish | authority | confidence | my seed |
|---|---|---|---|---|---|
| T5-1 | **in [a span of time]** (*in a few minutes*, *in a few days*) | **`faoi cheann`** — *not* `i gceann` | ÓC `faoi cheann` **14**, temporal in running speech: *"Beidh mé ann faoi cheann seachtaine"*, *"faoi cheann dhá mhí eile"*, *"faoi cheann ceathrú nóiméide"*; listed among the compound prepositions, vol III §7.115 | confident | 253, 274 |
| T5-2 | **longer** (comparative of *fada*) | **`níos foide`** — *not* `níos faide` | ÓC `foide` **23**, `fuide` 9, `faide` **3**; `níos f[ou]ide` 13. See objection §2.1 | confident | 275, 276 |
| T5-3 | late (adjective) | `deireanach` | ÓC **25**; agrees with T4's `is deireanaí` | confident | 270 |
| T5-4 | since [this morning] | `ó mhaidin` | ÓC **25** — the idiom absorbs *this*, so register #113 `ar maidin` does not survive under `ó`. See §2.4 | confident | 254 |
| T5-5 | **might / it might be** (epistemic) | `go mb'fhéidir go …` / `go mb'fhéidir gur … é` | ÓC `go mb.{0,2}fhéidir` **22**; `b.{0,2}fhéidir` **191**. Distinct lexeme-use from the `féidir` the register bars in §5 (that ban is on `féadfá` as a second *ability* verb) | best attempt | 261 |
| T5-6 | who / what you mean | `atá i gceist agat` | ÓC `i gceist` **24** | confident | 263 |
| T5-7 | **do you think …?** (fronted interrogative) | `cén uair a cheapann tú a bheas …` | ÓC `a bheas` **37**, `ceapann tú` 1 (inside the noise floor). See §2.2 | best attempt | 255 |
| T5-8 | what's that …? (identifying a noun) | `Céard é … sin` — copula, not `céard atá` | FGB `céard`. See §2.3 | best attempt | 258 |
| T5-9 | sounds like | `is cosúil le` | ÓC `cosúil le` **17**; register #262 | **genuinely uncertain** | 272 |
| T5-10 | an old friend of X | `seanchara le X` | ÓC `seanchara` **0**; the `sean-` prefix is productive and T4 already ruled `seanfhear` | best attempt | 266 |
| T5-11 | **X's friend** (possession of a person) | `cara le X` — analytic, **not** the genitive | ÓC `deirféar` (gs. of `deirfiúr`) is **0**; `cara le` matches the frame already used at T5-10 and avoids an unattested genitive entirely | best attempt | 284 |
| T5-12 | unfriendly | `míchairdiúil` | FGB `míchairdiúil`; ÓC `míchairdiúil` **0**, `neamhchairdiúil` **0**, `cairdiúil` **0** — the whole family is absent | **genuinely uncertain** | 300 |
| T5-13 | until after we … | `go dtí tar éis dúinn …` | register #93 `go dtí go` + #91 `tar éis`, stacked. Not probed as a collocation | **genuinely uncertain** | 251 |
| T5-14 | early (*early next week*) | `go luath` + time phrase | register #117/#277's `chomh luath sin`; FGB `luath` | best attempt | 277 |
| T5-15 | in a day (*finish in a day*) | `i lá amháin` | FGB `amháin`. Not probed | best attempt | 295 |
| T5-16 | I want you to … | `tá mé ag iarraidh go g[C]onditional` | register #71 (S15 `go labhrófá`), applied to `cabhraigh` → `go gcabhrófá` | best attempt | 249 |

---

## 2. Objections to the register, filed rather than made silently

### 2.1 `níos faide` in the register's own example is the standard, not Connemara

Register §16, the worked example for #216/#217, is my seed 276 verbatim:
*no I can stay here for a little longer* → **`Tá mé in ann fanacht anseo beagán níos faide.`**

`faide` is **3** in Ó Curnáin against `foide` **23**. Under R1/A10 the dialect form wins, and §0 of
the register itself says *"R1 governs any form the course has not yet fixed"* — I scanned all 248
then-translated seeds, 368 practice phrases and 47 legos and **`faide` and `foide` are both zero**.
Nothing was fixed. The register's binding content is its numbered ruling rows, and there is **no
ruling row for the comparative of `fada`** — only this illustrative sentence.

**I have written `níos foide` at 275 and 276.** If the coordinator prefers `faide` for literal
register-fidelity, it is a two-row sweep and there is no audio.

### 2.2 The register's *think* frame does not survive a fronted interrogative

Register #16 fixes *I think that* as the progressive `tá mé ag cheapadh go`. Seed 255 is
*"when do you think you'll be ready to leave?"*, where the *think* clause sits under a fronted
`cén uair`. `*Cén uair a bhfuil tú ag cheapadh a bheas tú réidh` is not a sentence. I used the
**finite present `cheapann tú`**, which is *not* banned — A9/R6 bans the finite present of `labhair`
only. Flagging it because it is a shape the register did not authorise, and because a reviewer
trained to treat finite presents as a defect will stop on it.

### 2.3 `céard atá` cannot identify a noun

Register #99 fixes *what's* → `céard atá`. Seed 258 is *"what's that blue thing over there?"* —
an identifying question, which Irish does with the copula: `Céard é an rud gorm sin thall ansin?`
`Céard atá an rud gorm sin` is not Irish. I read #99 as covering *what's happening / what's wrong*,
not identification, and split it. **Worth a ruling row** so the next worker does not split it the
other way.

### 2.4 `ar maidin` does not survive under `ó`

Register #113 fixes *this morning* → `ar maidin`. Seed 254 is *"I've been ready since this morning"*.
`*ó ar maidin` is not Irish; the idiom is `ó mhaidin` (ÓC 25). ZUT is bent, not broken — different
English string, different Irish — but a mechanical ZUT sweep will flag it, so here it is in advance.

### 2.5 Two register examples contradict the register's own rulings

Both are in worked examples, not ruling rows, and I followed the **rulings**:

- **§1 #3's example writes `Ar b'éigean duit …`** (my seed 278). That is not a well-formed
  interrogative — the past copula interrogative is **`Arbh éigean duit`**, matching ÓC's own
  `gurbh éigin` / `narbh éigin` cited in the same row. I wrote `Arbh éigean duit`, and
  `Níorbh éigean dom` for the negative at 280. **This is a morphology fix, not a lexical divergence:
  the ruling (`éigean` for *had to*) is untouched.**
- **§14 #150's example writes `Ní raibh orm ach an jab is tábhachtaí a dhéanamh`** (my seed 280).
  That uses **`tá orm`** for *had to* — which §1 of the same document explicitly forbids
  (*"Do not introduce `tá orm` as a second one"*). I wrote `Níorbh éigean dom ach …`.

### 2.6 `dá laghad` (register #50) is 0 in Ó Curnáin

`tuairim` is 28; the intensifying tail `dá laghad` is **0 across all four volumes**. I used the
register form at seed 260 as instructed. Recording it so it is not lost.

### 2.7 `cruinniú` (register #187) means *gathering*, not *appointment*, in the corpus

ÓC `cruinniú` **27**, and every readable instance is a crowd or a gathering — vol IV glosses it
flatly *"m. Group, crowd"*; *"bhí cruinniú mór daoiní ann"*. The modern diary sense a learner needs
at seed 277 (*an important meeting early next week*) is **not attested**. `cruinniú` is FGB's word
and I used it, but it belongs on the native-ear list.

---

## 3. The two open questions — my counts

- **B1, the word for *try*: my band contains ZERO instances.** No seed in 249–300 carries *try* or
  *trying* in any form. I wrote no `iarracht`, and no `ag iarracht` anywhere. **Count: 0.**
  Every `ag iarraidh` I wrote (249, 251, 269, 295, 299, 300) is *want*, register #1/#61/#68 — not
  *try* — so none of them is in the swap radius.
- **B2, the *how to* embedded clause: my band contains ZERO instances.** No seed in 249–300 says
  *how to*. I created no new `cén chaoi`. **Count: 0.**
- **A1 *going to*: 3 instances**, all `ag goil a` + lenited verbal noun, none with a fronted object
  (so T4's word-order addition does not bite): **270** `ag goil a bheith deireanach`,
  **289** `ag goil a bheith ann`, **293** `ag goil a bhualadh liom`. I wrote no `chun`-future.
