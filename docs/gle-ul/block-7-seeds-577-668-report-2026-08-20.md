# Block 7 — seeds 577–668 translated into Donegal Irish

**Job:** block 7 of the `gle_ul_for_eng` seed translation, 2026-08-20.
**Deliverable:** `scripts/gle-ul/out/block-7.json` (gitignored; the orchestrator reads it from disk
and `scripts/gle-ul/apply.cjs` is the only thing that writes to the database — I wrote nothing).
This document is the human-readable half: the fixed glossary, the negation annotations, the five
weakest lines, and what I think the spec still has wrong.

**92 seeds, all translated. No seed left blank, no bracketed glosses, no database writes, no audio.**

Confidence distribution:

| confidence | count |
|---|---|
| confident | 77 |
| best attempt | 14 |
| genuinely uncertain | 1 |

`apply.cjs` dry run: **0 problems** across my 92 rows — English byte-identical to the input block,
every Irish field non-empty, every non-confident row carries a note.

---

## What this block is

Seeds 577–638 are ordinary narrative sentences (waiting for news, growing up, conditionals about
what would have happened). **Seeds 639–668 are something else**: a fixed 30-seed drill cluster of
*sir / madam / you all* variants — `with you sir`, `how do you feel madam?`, `are you all ready?`.
They are near-identical to each other by design, so they are the one part of the whole 668 where a
single wrong choice is repeated fifteen times. I translated them as one unit, with one fixed form
per English chunk, rather than line by line.

## Negation

The `cha`/`ní` ruling file (`docs/gle-ul/cha-vs-ni-ruling-2026-08-20.md`) **did not exist** when I
started and **still did not exist** when I wrote the final JSON — I checked at both ends, as the
brief requires. So the interim rule applies: `ní` / `níl` / `níor` throughout.

Five seeds contain a negative, and every one of them is annotated:

| seed | Irish | neg |
|---|---|---|
| 603 | `ní raibh áit ar bith againn le cónaí ann ag an am` | independent |
| 618 | `ní mhothaíonn sé cosúil le tamall fada` | independent |
| 621 | `ní bheadh sé de mhisneach agam a inse di go raibh sé briste` | independent |
| 626 | `níl, níl tart orm, go raibh maith agat` | independent |
| 654 | `níl mé cinnte an dtig liom cuidiú leat, a dhuine uasail` | independent |

All five are independent-clause negatives, so **all five are `cha` sites** if the ruling goes that
way. None is a subordinate `nach`, a negative question, or an imperative — the block happens to
contain no `nach`/`nár`/`ná` at all. A `ní`→`cha` sweep over block 7 is therefore total, not partial.
Note 621's negative attaches to `bheadh` (conditional), and 626's first `níl` is a bare answer-echo,
so both would need the correct `cha`/`chan` shape rather than a string swap.

## The fixed glossary — one English chunk, one Irish form, block-wide

| English | my form | notes |
|---|---|---|
| what (interrogative) | `caidé` | 631, 651, 652, 666 |
| what (relative, "what you said") | `an rud a` | 606, 648, 663 — **not** caidé; a sweep keyed on English "what" will flag these as false positives |
| what's it like…? / how | `cad é mar` | 581–584, 601, 602, 642, 657 |
| every | `achan` | 584 |
| all (you all) | `uilig` | 656–668, never `go léir`/`ar fad` |
| some- / something / somewhere | `inteacht` | spec §2c; 578, 580, 611, 612, 625, 630, 646, 661 |
| think | `sílim` / `síleann` / `shíl` | 615–617, 636, 641, 651, 655, 666 — never `ceapaim` |
| can / could (finite) | `tig le`, `an dtig`, `an dtiocfadh` | spec §2c split; 585, 630, 644, 645, 654, 659, 660 |
| be able to (literal) | `ábalta` | 668 only — the one seed whose English says "be able to" |
| see / look | `feiceáil`, `amharc` | `tchí` is permitted but not required (§2d), so I did not use it |
| hear (perfect) | `cluinte` | spec §2c: cluin-, not clois- |
| to me | `domh` | 589, 599, 600 |
| need | `tá … de dhíth ar` | 595, 596, 605, 610, 652 |
| want | `tá … ag iarraidh` | throughout |
| trying | `ag iarracht` | 638 — per the rail, and see the objection below |
| because | `cionn is go` | 605, matching block 5 seed 455 |
| perfect ("had done", "would have bought") | `i ndiaidh` | 600, 606, 607, 612, 613, 622 — never `tar éis` |
| very (intensifier) | `iontach` | 615, 616, 620, 624, 655 — never `an-` |
| help | `cuidiú le` | 605, 645, 654, 660 — never `cabhrú le` |
| go | `a ghabháil` | 650, 665, 668, matching blocks 1–2 |
| start | `tosaigh` / `thosaigh` | spec §2c; I had written `thoisigh` and corrected it |
| sir / madam | `a dhuine uasail` / `a bhean uasail` | 639–655 |
| please | `le do thoil` | 624, 630 |

**Ulster lenition after simple preposition + article** is applied (`ar an chathaoir`, 641), per
spec §2d. A consistency pass that "corrects" it to `ar an gcathaoir` would be deleting the dialect.

**Two conventions I fixed and applied uniformly**, both worth checking against the other blocks:

1. **Capitalisation mirrors the English.** My English is nearly all lowercase-initial, so my Irish
   is too; seed 635 (`That is Jane's bag`) is capitalised because its English is. Blocks 1, 3 and 4
   do exactly this (96/96 each); block 2 capitalises everything. The closing sweep should pick one.
2. **A comma before a vocative, always** — `leat, a dhuine uasail` — even where the English writes
   `with you sir` with no comma. It is orthographically required in Irish and the base course does
   it too. Otherwise punctuation mirrors the English exactly: no full stops anywhere, question marks
   only where the English has one (so 643 and 659 have none).

## The five lines I am least sure of

1. **593 `however much I argued I still had to share`** → `is cuma cé chomh mór is a rinne mé
   argóint bhí orm roinnt mar sin féin`. The only "genuinely uncertain" row in the block: two
   awkward things at once — "however much", and "share" with no object. A speaker would probably
   restructure it: `ba chuma cá mhéad a throid mé faoi, b'éigean domh roinnt leo mar sin féin`.
2. **582 / 584 `what's it like to …?`** → `cad é mar atá sé ag fás aníos anseo?`. The English frame
   "what's it like to X" has no settled Irish equivalent. I used the base course's pattern with the
   Ulster interrogative swapped in, but a Donegal speaker might well say `cad é an dóigh a bhfuil
   sé…` or rebuild it around `nuair a`. Three seeds ride on this one decision (582, 583, 584) plus
   581, so it is worth a speaker's minute.
3. **597 `I suspect that…`** → `tá mé ag déanamh go bhfuil…`. `ag déanamh go` is the real Donegal
   idiom for "I reckon", and it is the most distinctively Donegal thing in my block — which is also
   why it is the one most likely to be judged too colloquial for a course line. Fallbacks:
   `tá amhras orm go…`, `sílim go…`.
4. **595 / 596 `I need to …`** → `tá sé de dhíth orm luí síos…`. `de dhíth ar` is unquestionably the
   Ulster way to say need, and FGB's own example is the Ulster `Cad é atá a dhíth ort?` — but the
   dictionary evidence is all with a **noun** object. With a verbal noun a speaker might just say
   `caithfidh mé luí síos`. This choice repeats at 605, 610 and 652, so it is five seeds wide.
5. **621 `I wouldn't have dared`** → `ní bheadh sé de mhisneach agam a inse di…`. "Dare" is the
   problem, not the negative: `leomh` is the dictionary verb but is bookish, so I used
   `bheith de mhisneach ag`. `inse` is FGB's own variant of `insint` (`inse 3, f = insint`).

Honourable mention: **592 `and along the main road`** → `agus feadh an bhóthair mhóir`. `an bóthar
mór` is the idiomatic Ulster phrase, but "along" is doing more work in the English than `feadh`
comfortably carries, and the base course went with `síos an príomhbhóthar`.

## Where I think the spec or the brief is wrong

**`ag iarracht` for "trying" is not Irish, and my block contains one instance of it (638).** Spec
§2c already records this honestly — FGB has `iarracht` as a noun only, there is no attested
progressive `ag iarracht` + verbal noun, and the idiomatic form is `ag déanamh iarrachta`. I used it
as instructed, and I want to add one data point to the case for changing it: at seed **579**
(`we've often tried`), where the English has no complement at all, `ag iarracht` cannot be used —
I had to write `is minic a rinne muid iarracht`. So the coinage does not even cover its own domain
uniformly; the course will teach `ag iarracht X` in some seeds and `iarracht a dhéanamh` in others
regardless. If Kai is going to rule, the fact that the form breaks on a bare "tried" is worth
knowing. It is a one-line sweep either way.

**The spec's own §1f worked example taught me a wrong form.** I wrote `thoisigh` at seeds 601–602
because §1f printed `Ar thoisigh mé?`, and only caught it because I probed FGB directly and found
`toisigh 2 = tomhais` — i.e. FGB reads it as *measure*. §2c has since ruled and corrected §1f, and
my rows now read `thosaigh`. Recording it because it is the cleanest example on this job of why
worked examples in a spec are load-bearing: two of my seeds were wrong for exactly as long as that
line was.

**No Donegal speaker has seen any of this.** Every form in my block is dictionary- and
spec-justified, not attested by an ear. The 14 "best attempt" rows and the 1 "genuinely uncertain"
row are where I would point one first.

## Explicit gaps

- The `cha`/`ní` ruling from job #536 **never landed** while I was working. My block is `ní`
  throughout, correctly Donegal but the less distinctive choice, with all five negatives annotated
  so the sweep is surgical.
- `docs/gle-ul/donegal-dialect-evidence-2026-08-20.md` **does not exist** — the evidence file my
  brief told me to read first was never written. I worked from the spec, FGB probes I ran myself
  (`inteacht`, `díth`, `dóigh`, `cuartaigh`, `tosaigh`, `toisigh`, `inse`, `cionn`, `garradh`), the
  base course translation memory (57 of my 92 seeds had a native-speaker Irish translation in
  `.a108-gle/base-tm.json`, which I used as a starting point and then de-Munsterised — the base is
  full of `conas`, `céard`, `ceapaim`, `go léir`), and the four sibling block outputs already on
  disk, which I read for cross-block consistency on `a ghabháil`, `cuidiú`, `cionn is go`,
  `i ndiaidh`, `tig liom` and `labhraíonn`.
- I did **not** read block 6 — it was not on disk when I finished, so seeds 481–576 are unchecked
  against mine. The closing consistency pass is the place that gets caught.
