# Block 5 (seeds 385–480) — Donegal glossary and translation decisions

`gle_ul_for_eng`. 96 seeds, translated 2026-08-20. Output: `scripts/gle-ul/out/block-5.json`.

The block JSON is a strict array of 96 objects — `seed`, `english`, `irish`, `confidence`, `note`,
and `neg` where a negative occurs — so the running glossary the brief asked for lives here instead.
Same placement as block 4.

| confidence | count |
|---|---|
| confident | 69 |
| best attempt | 24 |
| genuinely uncertain | 3 |

---

## 1. Recurring chunk → Irish, applied uniformly across the block

| English chunk | Irish used | Not | Seeds |
|---|---|---|---|
| what (interrogative / embedded) | `caidé` | céard, cad | 409, 420, 438, 451, 452, 465 |
| how + adjective | `caidé chomh …` | cé chomh, cén chaoi | 470 |
| the way / manner | `dóigh` — `an dóigh is fearr`, `ar an dóigh chéanna` | bealach, cén chaoi | 408, 443 |
| the way / a route | `bealach` | | 416 |
| want to | `tá … ag iarraidh` | teastaíonn | 22 seeds |
| want (a thing) | `níl mé á iarraidh` | níl sé uaim | 473, 474 |
| need to / have to | `tá ar` — neg. `níl ar`, interrog. `an bhfuil ar` | caithfidh | 395, 396, 397, 418, 420, 423, 424, 425, 450, 455 |
| need (+ noun) | `de dhíth ar` | ag teastáil, uaim | 436 |
| should / ought to | `ba chóir do` — `níor chóir`, `ar chóir`, `nár chóir` | ba cheart | 403–409, 438 |
| would like | `ba mhaith le` — `níor mhaith`, `ar mhaith` | | 411, 426–430 |
| can (present ability) | `tig le` | in ann, is féidir | 461, 469 |
| could (conditional ability) | `thiocfadh le` — `ní thiocfadh`, `an dtiocfadh` | d'fhéadfadh | 412, 413, 414, 432, 433, 434, 435, 436, 479 |
| be able to (explicit English) | `ábalta` | in ann | 445, 446, 447 |
| think | `shíl` / `síleann` | ceapaim | 387, 444 |
| try to | `iarracht a dhéanamh` | ag triail | 407 |
| something / somewhere | `rud inteacht`, `áit inteacht` | rud éigin, eicínt | 400, 402 |
| everybody / everything | `achan duine`, `achan rud` | chuile, gach | 396, 412, 424, 458 |
| still / yet | `go fóill` | fós | 410, 431, 440 |
| because | `cionn is go` | mar, de bhrí go | 421, 455 |
| after (temporal) | `i ndiaidh` | tar éis | 447 |
| about (approximation) | `thart fá` | timpeall | 454 |
| close to / near | `cóngarach do`, `in aice le` | | 390, 413, 460, 467 |
| opposite | `os coinne` | | 392 |
| in front of | `os comhair` | | 459 |
| new | `úr` | nua | 442 |
| help | `cuidiú` | cabhrú | 448 |
| to go (verbal noun) | `a ghabháil` | dul | 401 |
| stop | `stad` | stop | 402, 470, 471 |
| to me | `domh` | dom | 466 |
| like (be fond of) | `tá dúil ag … i` | is maith le, taitin le | 419 |
| expect | `ag dúil le` | ag súil le | 404 |
| almost | `chóir a bheith` | beagnach | 449 |
| in the past | `san am a chuaigh thart` | san am atá caite | 458 |
| start (past) | `thoisigh` | thosaigh | 433 |
| rest (noun) | `scíste` | scíth, sos | 471 |
| boy / girl | `gasúr` / `girseach` | buachaill / cailín | 393, 394 |

## 2. Grammar conventions held across the block

- **Ulster lenition after simple preposition + singular article.** `leis an bhealach isteach`,
  `leis an ghruaig dhubh`, `leis an léine ghlas`, `leis an ghúna bhuí`, `ag an chúinne`,
  `ar an phobal`, `ar an dóigh chéanna`, `thar an bhalla`, `leis an charrchlós` — never the
  eclipsing `ar an bpobal`. Coronals (d, t, s) left alone. **Block 4 raised the same point: the
  spec does not contain this rule and it should**, or a later consistency pass will "correct" it
  back to the Caighdeán.
- Analytic 1st plural throughout (`tá muid`, `bhí muid`, `sula stadann muid`, `caidé a dhéanann
  muid`); synthetic 1sg present kept. No synthetic past, no `d'fhéadfaimis`, no `stopaimid`.
- Object + `a` + verbal noun everywhere (`achan rud a bhuachan`, `an fhuinneog sin a bhriseadh`,
  `dóchas a chailleadh`).
- Interrogatives keep particle and mutation (`Ar aontaigh tú …?`, `An ndúirt siad …?`,
  `an dtiocfadh leo …?`, `nár chóir dúinn …?`).
- Indirect relative `a` + eclipsis where the antecedent is governed by a preposition:
  `An duine sin a bhfuil tú ag obair leis` (388), `siopa a dtig liom … a cheannach ann` (461).
- Capitalisation and terminal punctuation mirror the English seed line by line. Five seeds
  (460, 464, 473, 474, 476) open with English "I", which is capitalised by an English spelling
  rule rather than as a sentence opener — those Irish lines stay lower-case, matching the
  block's lower-case-opening convention.

## 3. Yes/no answers

Block 4's published convention was adopted verbatim: **echo the verb the yes/no actually answers,
comma, then the answer** — and where the echo would immediately repeat the answer's own verb, the
answer's verb carries it alone (386, 425, 448). Every answer seed in this block echoes the right
verb: 401/402 answer `an bhfuil muid ag iarraidh…?`; 406 answers `ar chóir dúinn…?`; 408/409 answer
`nár chóir dúinn…?`; 424/425 answer `an bhfuil orthu…?`; 429/430 answer `ar mhaith leo…?`;
435/436 answer `an dtiocfadh leo…?`; 443/444 answer `An raibh siad…?`; 448/450 answer
`an mbeidh siad ábalta…?`.

## 4. Negation

`docs/gle-ul/cha-vs-ni-ruling-2026-08-20.md` **did not exist** when this block started and still did
not exist when the final JSON was written — both checks were made, as the brief requires. Job #536
has not landed. The interim rule was followed: `ní` / `níl` / `níor` / `nach` / `nár` throughout,
and no `cha` was improvised.

30 of 96 seeds carry a negative, every one annotated:

- **`independent` ×23** — 387, 396, 399, 401, 412, 415, 420, 424, 430, 431, 433, 436, 438, 439,
  443, 446, 450, 452, 459, 469, 473, 474, 480
- **`copula` ×5** — 404, 406, 409, 427, 456
- **`question` ×1** — 407
- **`subordinate` ×1** — 472
- **`imperative` ×0** — no negative imperative occurs in this block

Conventions, which match block 2's and are stated so a sweep author does not have to guess:

1. **`copula` is reserved for *independent* copula negatives** — `níor chóir`, `níor mhaith`,
   `ní dócha`. These take `char`/`charbh`, not `cha`.
2. **Where a seed has two negatives of different types, the field names the one a sweep could
   touch** and the note says what the second is. Seed 430 (`níor mhaith` + `ní bheadh`) is tagged
   `independent`; seed 469 (`ní chiallaíonn` + subordinate `nach dtig`) is tagged `independent`.
3. **Two future-tense negatives must survive any `cha` sweep untouched**, because `cha` cannot take
   the future: **446** (`ní bheidh siad ábalta…`) and **450** (`ní bheidh,` answering
   `an mbeidh siad ábalta…?`). Both say so in their own notes.
4. Seed 457's `cuid den fhadhb ná …` is the identificational `ná`, **not** a negative, and carries
   no `neg` field.

## 5. Where I think the brief or the spec is wrong

1. **The spec is silent on Ulster lenition after preposition + article** — nine occurrences in this
   block, and independently flagged by block 4. It belongs in §1f.
2. **`toisigh` (spec §1f, `Ar thoisigh mé?`) does not survive an FGB probe.** `teanglann.ie/fgb/toisigh`
   returns `toisigh 2 = tomhais 1` — i.e. "measure", not "start". §0's standard-spelling rule would
   therefore point at `thosaigh`. I used `thoisigh` at seed 433 because the spec writes it and
   block 2 uses `toiseacht`, so the three blocks are at least consistent — but the spec should
   either cite real evidence for it or drop it.
3. **`ag iarracht` for "trying" (brief, decisions table).** Block 4 is right that `iarracht` is a
   noun and `ag iarracht` is not grammatical. This block has only one "try to" (seed 407), and
   `iarracht a dhéanamh` — arrived at independently — is the correct form and keeps "trying"
   distinct from "wanting". I would set `iarracht a dhéanamh` / `ag déanamh iarrachta` course-wide.
4. **Spec §3 open question 5 (`ábalta` vs `tig le`) is settled here by convention, not evidence**,
   in the same split blocks 2 and 4 chose: `tig le`/`thiocfadh le` for "can"/"could", `ábalta` where
   the English says "be able to". Three blocks agreeing is consistency, not proof; a Donegal speaker
   should ratify it.
5. **"need to" → `tá ar` merges "need" toward "have to"** (block 4's point 4). I hit it ten times.
   The Ulster `de dhíth` only takes a noun, so there is no clean alternative — but it means seeds
   395–397, 418, 420, 423–425 read as "have to" rather than "need to".

## 6. The five lines a Donegal speaker should be pointed at first

1. **427** *they wouldn't like you to think that they're bored* → `níor mhaith leo go sílfeá go
   bhfuil siad dubh dóite`. `dubh dóite` is really "fed up"; there is no comfortable Donegal
   "bored". Alternative: `go bhfuil leadrán orthu`.
2. **432** *they could mean that they want you to ask* → `thiocfadh leis a bheith i gceist acu go
   bhfuil siad ag iarraidh ort ceist a chur`. "They could mean that" has no natural Irish; this is
   "it could be that they mean". A speaker would likely restructure the whole line.
3. **480** *whatever he says it's not far ahead now* → `cibé rud a deir sé níl sé i bhfad chun
   tosaigh anois`. The English is opaque — read as distance; if time is meant, `níl sé i bhfad
   uainn anois`.
4. **394** *That girl with the yellow dress* → `An ghirseach sin leis an ghúna bhuí`. `girseach` is
   an FGB headword and the Donegal word, but it means a *young* girl; `cailín` is the neutral
   choice. Same question for `gasúr` at 393.
5. **471** *do you want to stop for a rest?* → `an bhfuil tú ag iarraidh stad le do scíste a
   ligean?`. `scíste` is an FGB headword glossing straight to `scíth`, and it is the Donegal form,
   but `do scíth a ligean` is the commoner set phrase.

Runners-up worth a glance: **444** (English passive "it could be done" turned active so `thiocfadh
le` could carry it), **454** (`thart fá a sé a chlog` for "came round at about six"), **464**
(`dearmad a dhéanamh **de**`, the Ulster government), **419** (`tá dúil ag daoine iontu` for "people
to like them").

## 7. Evidence actually consulted

`scripts/gle-ul/fgb.cjs` was run live against teanglann.ie on 2026-08-20 for the forms this block
turns on. Quoted verbatim from Ó Dónaill:

- `inteacht` — *"inteacht = éigin 1"*. Headword. IN.
- `girseach` — *"f. Young girl."* Headword.
- `gasúr` — *"m. 1. Boy. 2. Youngster, child."* Headword.
- `os` — *"~ coinne, ~ comhair, in front of, opposite."* Confirms `os coinne`.
- `díth` — *"Rud a bheith de dhíth, a dhíth, ort, to need sth."* and *"Cad é atá a dhíth ort? What do
  you want?"* Confirms `de dhíth ar` at 436.
- `dúil 2` — *"Desire, fondness, liking… Tá dúil mhór ag na daoine ann, the people are very fond of
  him."* Confirms 419, and `ag dúil le` at 404.
- `cóngarach` — *"Near, convenient (do, to). ~ don chathair, close to the city."* Confirms 413.
- `úr 3` — *"New. Éadaí úra, new clothes. Dóigh úr le rud a dhéanamh, new, novel, way of doing sth."*
  Confirms 442.
- `cionn` — related match `cionn is go`, with the FGB example *"Chuaigh sé sna céadéaga cionn is gur
  bhréagnaigh mé é, he went into a rage because I contradicted him."* Confirms 421 and 455.
- `scíste` — *"f = scíth 1 2."* Headword, so IN under §0, but see §6.
- `toisigh` — *"toisigh 2 = tomhais 1."* This is the negative result behind §5.2.

The existing standard-Irish seed set (`scripts/gle-ul/std_seeds.json`, all 668 populated) was read
as a reference for every line in this block, and departed from wherever it is Caighdeán rather than
Donegal — most often on eclipsis after preposition + article, on `d'fhéadfadh` vs `thiocfadh le`,
and on its synthetic forms (`dhéanaimid`, `d'fhéadfaimis`, `stopaimid`, `rachaimis`), none of which
survive here. `scripts/gle-ul/cn_seeds.json` has **empty** target text for all of 385–480, so the
Connemara sister course offered nothing to contaminate — or to check against — in this range.
