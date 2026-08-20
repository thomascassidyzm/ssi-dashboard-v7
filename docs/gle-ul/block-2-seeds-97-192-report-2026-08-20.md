# gle_ul_for_eng — Block 2 (seeds 97–192) translation report

96 seeds, all translated. Ulster (Donegal) Irish, standard orthography.
Deliverable: `scripts/gle-ul/out/block-2.json` (96 objects, validated against the input file —
seed numbers and English strings byte-identical, no empty Irish, every non-confident row carries a note).

## Confidence

| | count |
|---|---|
| confident | 78 |
| best attempt | 16 |
| genuinely uncertain | 2 |

## Negation — the interim rule was used, and why

`docs/gle-ul/cha-vs-ni-ruling-2026-08-20.md` **does not exist**. I checked at the start of the job and
again before writing the final JSON. Job #536 has not landed. So every negative in this block is
`ní` / `níl` / `níor` / `nach` / `nár`, per the interim rule. No `cha` was improvised.

Every seed whose Irish contains a negative carries a `neg` field. 32 rows have one:

- `independent` ×18 — 103, 106, 108, 112, 115, 132, 135, 146, 148, 149, 153, 157, 165, 166, 173, 178, 183, 188
- `subordinate` ×5 — 99, 102, 105, 121, 140
- `question` ×2 — 113, 145
- `copula` ×7 — 100, 116, 127, 134, 151, 159, 191
- `imperative` ×0 — no negative imperative occurs in this block

**Two annotation conventions I had to invent; a sweep author needs to know them:**

1. **Clause position beats copula.** Seed 121 (`nach maith leat`) is a negative copula *inside* a
   subordinate clause. I annotated it `subordinate`, not `copula`, because what a `ní`→`cha` sweep
   needs to know is that `cha` cannot enter there at all. `copula` is reserved for *independent*
   copula negatives (`ní hé sin`, `níor chóir duit`, `ní miste`).
2. **`cad chuige nach …?` is `question`.** Seeds 113 and 145 are interrogative sentences whose
   negative sits in the clause being questioned. Seed 99 — *"you should ask yourself why it's not
   working"* — is a declarative with an embedded indirect question, so it is `subordinate`.

Where a seed has **two** negatives of different types (106, 148, 183) the field names the
independent one — the only one a sweep could ever touch — and the note says what the second is.

Two future-tense negatives are flagged in their own notes because `cha` cannot take the future:
**157** (`Ní bheidh mé ábalta…`) and **149** (`go gcríochnóidh` — positive, but the sentence opens
with `Níl sé seo…`). Seed 153 is conditional, which `cha` *can* take.

Three seeds have an English negative but positive Irish, so they carry no `neg` field:
**155** and **191** (`is cuma liom` — "I don't mind" is positive in form in Irish) and **173**.
One seed has the reverse — **132**, positive English, negative Irish, because Irish has no
comfortable "less X than" and uses "not as X as".

## Glossary — every recurring chunk, fixed once and used everywhere

| English | Block 2 uses | Not | Seeds |
|---|---|---|---|
| what | `caidé` | céard, cad | 107, 113, 152, 162, 167, 169, 170, 174, 175, 179 |
| why | `cad chuige` (+ eclipsing `a`/`nach`) | cén fáth, tuige | 99, 113, 135, 145 |
| how (manner) | `cad é mar` | cén chaoi, conas | 160 |
| the way / how it's going | `dóigh` — `faoin dóigh a bhfuil`, `ar dhóigh eile`, `ar an dóigh chéanna` | cén chaoi | 122, 152, 153 |
| want | `tá … ag iarraidh` | teastaíonn | 127, 138, 144, 152, 154, 156, 169, 171, 175, 177, 178, 186 |
| trying to | `ag iarracht` (past: `rinne … iarracht`) | ag iarraidh, ag triail | 102, 103, 140, 146, 159 |
| I'd like | `ba mhaith liom` | | 110, 170, 180 |
| think | `sílim` / `síleann` / `shíl` | ceapaim | 123, 124, 135, 162, 163, 185 |
| believe | `creidim` | | 125 |
| can | `tig le` (cond. `thiocfadh le`) | in ann, is féidir | 113, 116, 119, 136, 140, 150, 161, 173 |
| be able to (future) | `ábalta` | in ann | 157, 168, 176 |
| need to / have to | `tá orm` — negative `níl orm` | | 104, 106, 139, 167, 181, 188 |
| must | `caithfidh` | | 109 |
| should | `ba chóir domh/duit` — negative `níor chóir` | | 98, 99, 100 |
| need (noun sense) | `de dhíth ar` | ag teastáil | 170 |
| something / someone | `rud inteacht`, `duine inteacht` | rud éigin, eicínt | 98, 111, 119, 128, 158, 186 |
| new | `úr` | nua | 109, 111 |
| a lot of | `cuid mhór` | go leor | 109 |
| too many | `barraíocht` | an iomarca | 131 |
| very | `iontach` | an- | 112, 125, 133, 142, 147, 148, 149, 166 |
| everything | `achan rud` | chuile, gach | 141 |
| nothing | `dada` | tada | 146 |
| hear | `cluinstin` | cloisteáil | 103 |
| wake | `múscail` / `múscailt` | dúisigh | 108, 144 |
| begin | `toiseacht` | tosú | 122 |
| help | `cuidiú` | cabhrú | 136, 142, 168, 171, 176 |
| search for | `a chuartú` | a chuardach, a lorg | 171 |
| after | `i ndiaidh` | tar éis | 110 |
| relax | `scíste a ligean` | scíth | 110 |
| minute | `bomaite` | nóiméad | 155 |
| because | `cionn is go/gur` | mar, óir | 130, 136 |
| of course | `ar ndóigh` | cinnte | 136 |
| going to (do) | `ag gabháil a dhéanamh` | chun | 179 |
| go (verbal noun) | `a ghabháil` | a dhul | 120, 156, 177 |
| come (verbal noun) | `a theacht` | teacht | 168 |
| busy | `gnóthach` | gnaitheach (not in FGB) | 192 |
| to me | `domh` | dom | 140, 150, 161, 170 |
| we are | `tá muid` (analytic) | táimid | 102, 103, 104, 106, 107, 108, 109, 110, 111, 118, 143 |

Every Donegal item above that I was not already certain of was probed live against Ó Dónaill on
teanglann.ie with `scripts/gle-ul/fgb.cjs` before use. Confirmed as headwords: `inteacht = éigin 1`,
`scíste, f = scíth`, `úr 3 … (b) New`, `cluin … vn ~stin`, `bomaite, m = nóiméad`,
`barraíocht … ~ daoine, too many people`, `toiseacht, f, toisigh 1 = tosú`, `cuartaigh = cuardaigh 1`,
`cionn is go`, and under `díth`: *"Rud a bheith de dhíth ort, to need sth"* / *"Cad é atá a dhíth ort?"*.
One guess was killed by the probe: **`gnaitheach` is not in FGB**, so seed 192 uses `gnóthach`.

## Two grammar decisions I made that the spec does not cover

1. **Yes / no.** Six seeds open with a bare English "yes" or "no" (97, 172, 173, 183, 184, 189).
   Irish has no such word, so the answer **echoes the verb**: `Tá,` / `Bheadh,` / `Chonaic,` /
   `Ní fhaca,` / `Is ea,` / `Níl,`. That is what a Donegal speaker says. It is a block-wide policy and
   the other six blocks will have hit the same problem — **it needs to be reconciled across blocks
   before the seeds are applied**, or the course will teach three different "yes".
2. **Ulster lenition after simple preposition + article.** `ar an bhus` (seed 120), not standard
   `ar an mbus`. This is a genuine Ulster grammar feature, not a spelling, so §0 admits it. It is
   *not* in the spec's checklist and it should be — it is high-frequency and a consistency pass
   that does not know about it will "correct" it back to the standard.

## The 5 lines I am least sure of

1. **98** — *"I should consider playing something else"*. The English "playing" is ambiguous. I read
   it as music (`a sheinm`); a game would be `a imirt`. There is nothing in the English to decide it
   and the whole seed turns on the guess.
2. **173** — *"no thank you I can manage on my own"*. Two separate problems, both in the note: the
   "no" answers an offer rather than this sentence's own verb, so the echo policy fights itself here;
   and Irish has no "manage". A speaker would say `Tá mé ceart go leor, go raibh maith agat`.
3. **140** — *"I'm sorry that I can't see what you're trying to show me"*. The object + `a` + verbal
   noun rule stacks two verbal nouns and produces a grammatical but heavy line
   (`… an rud atá tú ag iarracht a thaispeáint domh a fheiceáil`). Correct; not what anyone says.
4. **132** — *"that's less exciting than what she was saying"*. Rendered as "not as exciting as",
   which turns a positive English sentence into a negative Irish one and therefore into a row a
   `cha` sweep will pick up. Deliberate, flagged.
5. **114 / 115** — *"I feel as if…"*. `amhail is go` is correct and bookish. Spoken Donegal would
   probably just use `Sílim go…`, but that collides head-on with the block's "think" seeds (123, 163),
   so I kept the two distinct.

Honourable mention: **158** *"let's talk about something else"* — the 1st-plural imperative
(`Déanaimis`) is synthetic even in Donegal, which reads oddly next to the analytic `tá muid` rule but
is right, because there is no analytic alternative.

## Where I think the spec is wrong or incomplete

- **§1a lists `tchí`/`tchíonn` as REQUIRED while §3.4 lists it as an open question.** Those two
  statements contradict each other, and a validator written from §1a would demand a form §3 is not
  sure about. My block never needed a present-tense "sees", so nothing here depends on it — but the
  contradiction should be resolved before a block that does need it is written.
- **§0 vs §1f on the `-óch-` future.** I followed §0 (standard spelling: `go gcríochnóidh`, seed 149;
  `Fiafróidh`, 176/177). §1f says the Donegal future stem is `-óch-`. If §3.3 later rules for
  `-óch-`, three lines in this block change. Recording it so the sweep is cheap.
- **"at all" = `ar bith`** is right for `duine ar bith` / `áit ar bith` (seeds 134, 182) but not for
  the adverb. Seed 191 needs `ar chor ar bith`. Those are two different slots and the spec's one-line
  entry hides that.
- **The `trying` = `ag iarracht` ruling.** I applied it as briefed and I think it is right for a seed
  set. Worth saying plainly, though: `ag iarracht` as a progressive ("Tá muid ag iarracht a rá") is
  the less usual construction — the ordinary Irish is `ag iarraidh` for both, or
  `ag déanamh iarrachta`. The past falls out naturally as `rinne muid iarracht` (seed 146), which is
  unimpeachable. If a Donegal reviewer objects, they will object to the present progressive.

## Gap, stated plainly

There is still **no Donegal native reviewer and no Donegal running-text corpus** on this machine. The
FGB probes above are real evidence for *lexis* — every dialect word in the glossary is an Ó Dónaill
headword, verified today. They are **not** evidence for *idiom*: nothing here proves that a Gaoth
Dobhair speaker would phrase seed 114 or seed 173 the way I did. The 18 non-"confident" rows are
where to point a speaker first.
