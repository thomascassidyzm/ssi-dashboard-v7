# gle_ul_for_eng — Block 6 (seeds 481–576) translation report

96 seeds, all translated. Ulster (Donegal) Irish, standard orthography.
Deliverable: `scripts/gle-ul/out/block-6.json` — 96 objects, seed numbers and English strings
byte-identical to `scripts/gle-ul/blocks/block-6.json`, no empty Irish, no brackets or slashes in
any Irish field, every non-confident row carries a note.

## Confidence

| | count |
|---|---|
| confident | 79 |
| best attempt | 15 |
| genuinely uncertain | 2 |

## Negation — the interim rule was used

`docs/gle-ul/cha-vs-ni-ruling-2026-08-20.md` **does not exist.** I checked when I started and again
immediately before writing the final JSON. Job #536 has not landed. So every negative in this block
is `ní` / `níl` / `níor` / `nach` / `nár` / `mura` / `ná`, per the interim rule. No `cha` was
improvised anywhere.

26 rows carry a `neg` field:

- `independent` ×15 — 483, 485, 490, 496, 508, 518, 519, 533, 537, 538, 554, 562, 563, 564, 571
- `subordinate` ×8 — 482, 489, 502, 505, 526, 532, 535, 557
- `question` ×1 — 500
- `copula` ×1 — 531
- `imperative` ×1 — 534

I adopted block 2's two annotation conventions unchanged, so the two blocks sweep identically:
clause position beats copula, and where a seed has two negatives the field names the **independent**
one (the only one a sweep could touch) with the note saying what the second is. That applies to
**483** (two independent `níl`) and **538** (independent `níl mé` + subordinate `nach bhfuil`).

Three things a `cha` sweep author needs from this block specifically:

1. **Two rows are future-tense and can never take `cha`** regardless of how #536 rules — **490**
   (`ní bheidh muinín agam`) and **533** (`ní éistfidh sí`). Both notes say so.
2. **Two rows are conditional, which `cha` *can* take** — **563** and **564** (`ní bheinn ábalta`).
3. **Three rows have an English negative and positive Irish, so they carry no `neg` field** —
   **540** and **561** (`is cuma liom`: "I don't mind" / "I don't care" are positive in form in
   Irish) and **502**, where the negative sits inside the fixed idiom `is beag nár` and is annotated
   `subordinate` because `cha` cannot enter it.

`ní fíor` at **531** is annotated `copula` — a sweep needs `char`/`charbh` there, not `cha`.

## Glossary — every recurring chunk, fixed once and used everywhere

Checked against block 2's glossary before I wrote anything, so the two blocks agree. Rows marked ▲
are ones I probed live against Ó Dónaill with `scripts/gle-ul/fgb.cjs` today.

| English | Block 6 uses | Not | Seeds |
|---|---|---|---|
| what | `caidé` | céard, cad | 493, 494, 572 |
| why | `cad chuige` | cén fáth | 500 |
| how (manner) | `cad é mar` | conas, cén chaoi | 508 |
| the way | `an dóigh a` | an chaoi a | 491 |
| think | `sílim` / `shíleadh mé` | ceapaim | 486, 536, 553 |
| want | `tá … ag iarraidh` | teastaíonn | 500, 538, 540, 562 |
| can / could (finite) | `tig le` / `thiocfadh le` | in ann, is féidir | 501, 512, 518, 526, 529, 530, 531 |
| be able to (literal) | `ábalta` | in ann | 525, 563, 564 |
| to me | `domh` | dom | 489, 527, 528 |
| every / everyone | `achan`, `achan duine` | gach, chuile, gach éinne | 511, 533, 542, 574 |
| all / the lot / absolutely | `uilig` | ar fad | 520, 529, 544 |
| very | `iontach` | an- | 553, 571, 573, 574 |
| nothing | `dada` | tada | 485 |
| anyone | `duine ar bith` | éinne | 490, 531 |
| new | `úr` | nua | 509, 515, 519, 555 |
| difficult / hard | `doiligh` ▲ | deacair | 526, 544 |
| help (noun & verb) | `cuidiú` | cabhrú, cabhair | 491, 564 |
| because | `cionn is go/gur` | mar, toisc | 502, 547, 549 |
| instead of | `in áit` | in ionad, seachas | 502, 523 |
| after | `i ndiaidh` | tar éis | 494 |
| minute | `bomaite` | nóiméad | 524 |
| call (phone) | `scairt ar` ▲ | glaoigh ar | 524 |
| fast / quick | `gasta` | tapa, tapaidh | 561 |
| late | `mall` ▲ | déanach | 539, 556, 558 |
| slowly | `go réidh` ▲ | go mall (reserved for "late") | 541 |
| open (vb) | `foscail`, `foscailte` ▲ | oscail | 499, 512 |
| close (vb) | `druid`, `a dhruidim` ▲ | dún | 499 |
| dreadful | `millteanach` ▲ | uafásach | 534 |
| wrong (the wrong X) | `contráilte` ▲ | mícheart | 535 |
| wrong / right (be) | `ní raibh an ceart agam` / `bhí an ceart aici` | | 537, 543, 544 |
| search for | `a chuartú` | a chuardach, a lorg | 510 |
| look at / watch | `amharc` | féachaint, breathnaigh | 567 |
| news | `scéala` | nuacht | 511 |
| need | `de dhíth ar` | uait, teastaíonn | 497 |
| expect | `ag dúil le` ▲ | ag súil le | 568 |
| crazy | `ar mire` ▲ | as do mheabhair | 536 |
| distress / hurt / upset | `goill ar` ▲ | | 513, 575, 576 |
| it is no use | `níl gar ann` ▲ | níl aon phointe | 508 |
| yet | `go fóill` | fós | 519 |
| going to (future) | `ag gabháil a` + vn | chun | 504, 508, 509 |
| go (verbal noun) | `a ghabháil` | a dhul | 562 |
| dog | `madra` | ~~madadh~~ — see below | 546 |
| we (past) | `bhog muid` (analytic) | bhogamar | 506, 507 |
| we (present) | `a bhuaileann muid` (analytic) | a bhuailimid | 568 |

`ábalta` and `tig le` are split exactly as spec §2c binds: finite English **can/could** → `tig le`;
English literally saying **"be able to"** → `ábalta`. Nothing in this block uses `in ann`.

**A guess killed by a probe, worth recording next to block 2's `gnaitheach`.** I wanted `madadh` for
"dog" at seed 546 — it is what a Gaoth Dobhair speaker says. It is **not in FGB**, so §0's
standard-orthography rule excludes it and the seed uses `madra`. Same failure mode, same remedy:
probe before you commit.

## Two spec additions this block needs, neither of which is in the checklist

1. **Ulster lenition after simple preposition + article** — `ar an chéad lá` (514, 515),
   `leis an fhadhb` (518), `ar an fháth` (521), `tríd an choill` (559), `ag an cheann` (552),
   `leis an charr` (510). Block 2 raised exactly this from seed 120 (`ar an bhus`). It is genuine
   Ulster grammar, not a spelling, so §0 admits it — but a consistency pass that has not been told
   about it will "correct" all six back to the standard eclipsis. **It should go in §1f.**
2. **`mall` / `go réidh` must be split by sense.** `mall` is both "slow" and "late" (FGB gives both,
   and gives *"Tá sé ~ san oíche"* for late at night). This block uses `mall` **only** for "late"
   (539, 556, 558) and `go réidh` for "slowly" (541, FGB: *"Siúl go ~, to walk slowly"*). If another
   block writes `go mall` for "slowly" the course will teach one word with two jobs in adjacent seeds.

## Where I think the spec / brief is wrong

- **§1a still lists `tchí`/`tchíonn` as REQUIRED while §3.4 lists it as an open question.** Block 2
  flagged this and it is still unresolved. My block never needed a present-tense "sees" either, so
  again nothing depends on it — but two blocks have now hit the same contradiction.
- **The `trying` = `ag iarracht` divergence.** I agree with the brief's reasoning and with block 1's
  evidence, and it did not bite me: both "try" seeds in my block (491 `an dóigh a ndéanann tú
  iarracht cuidiú`, 541 `iarracht a dhéanamh análú`) are **infinitival**, not progressive, so they
  use the unimpeachable noun idiom `iarracht a dhéanamh` and no `ag iarracht` appears in block 6 at
  all. The unattested form is only ever a problem in the progressive.
- **The output format forbids prose but the brief also says "put your glossary in your output".**
  I kept `block-6.json` a pure array so the orchestrator's parser is safe; the glossary is the table
  above.

## The 5 lines I am least sure of

1. **575 / 576** — *"it's been upsetting"* / *"it has been very upsetting waiting"*. FGB's `goill ar`
   is precisely "distress, vex, hurt" — but it **requires a person**, and the English deliberately
   has none. I have had to supply `orm`, which puts a first person into a sentence that does not have
   one. The objectless alternative, `bhí sé corraitheach`, drifts towards "moving/exciting". These are
   the two `genuinely uncertain` rows and they are where to point a Donegal speaker first.
2. **481 / 482** — *"the only real hope"*. `fíordhóchas` is a transparent `fíor-` compound rather
   than an attested word; the base course simply dropped "real" (`an t-aon dóchas`). Two adjacent
   seeds turn on the same coinage, so if it is wrong it is wrong twice. Alternative: `an t-aon dóchas
   ceart`.
3. **552** — *"the church at the other end of the village is ugly"*. The predicate is discontinuous
   (`tá an séipéal … gránna` wrapped round the location phrase). It follows the base course's own
   structure for this exact seed and it is grammatical, but a speaker may well prefer the relative
   `tá an séipéal atá ag an cheann eile … gránna`. Related: I moved "end" from the base course's
   `bun` to `ceann` (550, 552) because `bun` means the *bottom* end and does not extend to "the
   other end".
4. **493** — *"what's going to come next?"* → `caidé a thiocfas ansin?`. The `-fas` relative future
   is a morphological Ulster form, not a respelling, so §0 admits it — but it is the **only** `-fas`
   in my block, and it sits next to §3.3's unresolved `-óch-` question. If §3.3 rules for standard
   spelling this line probably becomes `a thiocfaidh`.
5. **513** — *"it hurts most when I move my head up and down"*. I fronted the superlative
   (`is mó a ghoilleann sé orm`) rather than flattening it to the base course's comparative
   `níos mó`, which loses "most". The fronting is correct Irish; whether it is what a Donegal
   speaker reaches for, I cannot show.

Honourable mention: **522** and **534** use the synthetic 1st-plural imperative (`aontaímis`,
`ná téimis`). That reads oddly next to the analytic `tá muid` rule but is right — there is no
analytic alternative for "let's", exactly as block 2 found at seed 158.

## Method, and the gap

62 of my 96 English seeds have an existing **native-speaker translation** in the base Irish course,
reachable through `.a108-gle/base-tm.json` (15,627 English strings). I consulted it for every seed
and used it as the default, then Donegal-ised: `ceapaim`→`sílim`, `conas`→`cad é mar`,
`céard`→`caidé`, `in ann`→`ábalta`/`tig le`, `gach éinne`→`achan duine`, `ar fad`→`uilig`,
`dom`→`domh`, `nua`→`úr`, `an-`→`iontach`, `féachaint`→`amharc`, `bhogamar`→`bhog muid`,
`d'fhágadar`→`d'imigh siad`, `a bhuailimid`→`a bhuaileann muid`, and eclipsis→lenition after
preposition + article. Where the base was itself bad Irish I rewrote rather than inherited — 485
(the base has English word order), 517 (synthetic past plus a missing space), 557 (`ba mhór liom
muna seinnfidís` is both wrong idiom and synthetic).

**The gap, stated plainly: there is still no Donegal native reviewer and no Donegal running-text
corpus on this machine.** The FGB probes above are real evidence for *lexis* — `foscail`, `druid`,
`millteanach`, `contráilte`, `mall`, `gar`, `goill`, `réidh`, `mire`, `dúil` were all fetched from
Ó Dónaill today, and `madadh` was rejected by the same probe. They are **not** evidence for *idiom*:
nothing here proves a Gaoth Dobhair speaker would phrase 575 or 552 the way I did. The 17
non-"confident" rows are the ranked list to point a speaker at.
