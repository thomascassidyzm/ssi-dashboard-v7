# North/south Welsh divergences, counted — and the two-voice casting read

**Measured 2026-09-01.** This document **authors no Welsh**. Every Welsh form quoted below is
lifted verbatim from the pair overlay (`docs/sector-pods/health-welsh-pair-overlay-2026-09-01.md`,
commit `6b32a1451`, branch `docs/health-welsh-pair-overlay-2026-09-01`, not merged), where it is
stamped **draft-for-Aran**. Southern counterparts named here are **well-known standard
alternatives, reported, not authored** — where I do not know one, the cell says `?`.
Nothing here queues audio, touches the DB, or changes any content.

---

## THE TWO ANSWERS, FIRST

### 1. One Welsh course with a dialect mask — viable. But it does not halve the recording.

**Mask viable.** Not one of the 57 seeds needs a *different sentence* in the south. Every
divergence is a **swap inside a chunk whose cut is identical** — same seed, same cut, same
basket, same tiling, different token. The inventory of divergent items is **small and closed:
37 distinct items**, of which about ten do most of the work.

**But it is diffuse, not concentrated.** Those 37 items land in **51 of the 57 seeds (89%)**.
Only six seeds are dialect-neutral end to end. So the honest shape is: *few kinds, everywhere*.

That splits the win cleanly, and Tom should hold both halves:

- **A mask saves everything expensive on the authoring side** — the English canon, the 85→57
  projection, the cut design, the baskets, the seed ordering, the ZUT sweep, the anchor, the
  maintenance. All of it is written once and stays written once. **One Welsh course, one
  curriculum, one thing to defend publicly.** That is the grief-removal Tom is after, and it is
  real.
- **A mask saves close to nothing on the recording.** 51 of 57 seeds carry at least one
  divergent token, and every practice phrase built from a touched chunk is touched too.
  **Aran and Catrin record two full passes either way.** The standing recording instruction
  already assumes exactly this — the same two people cover `cym_n_for_eng` *and*
  `cym_s_for_eng` — so a fork does not double the *cast*, it doubles the *studio hours*, and
  the mask does not undouble them.

**So the casting decision does not freeze the unification answer.** Watson's worry was that
commissioning North Welsh and casting for it buys two courses by accident. On this measurement
it does not: the cast is the same two humans for both dialects by standing rule, and the
northern recording is a prerequisite of *either* architecture. **The thing that would freeze it
is forking the English canon or the cuts — and nothing in this seed set does.**

**One caveat that decides what "mask" means technically.** The mask cannot be a token-level
find-and-replace. `mae gen i chydig o jobsys bach` (HG18) becomes, in the south, a sentence with
the possessed noun and the `gyda fi` phrase in a *different order*. Same with `mae'n well gen i`
(HG57). A mask therefore has to be **an alternate target form per chunk/LEGO** — which is the
unit the estate already stores. That is a column, not a course.

**Watson's guess — "small and concentrated, a handful of high-frequency function words and some
verb forms, shapes identical" — is confirmed on kind and on shape, and overturned on spread.**
The shapes are identical; the inventory is a handful; the spread is 89% of sentences, not a
handful of seeds.

### 2. Casting — two voices carry the whole set, with room to spare. Zero turns need a third.

**All 85 turns are the general worker's own mouth.** This is a production seed set: the learner
*is* the worker, and every turn is the sentence the learner produces. Patient, companion and
doctor turns are context and are explicitly out of scope (overlay §6 defers them to the walk's
listening realisation).

So the production set needs **one voice**, not two — and the standing two-voice rule is not
strained anywhere near its limit.

- **The worker's gender is fixed by the text: female.** HG17 — *"Hello, my name's Siân"* — and
  HG21 — *"It's on my badge, look"* (the same Siân). **That casts the general-role production
  set to Catrin**, in both dialects.
- **The three-party scenes do not need a third speaker.** HG14 (*"she's very welcome"*), HG15
  (*"with you both here"*) and HG16 (*"all three of us"*) each *mention* a companion; none
  *voices* one. Same for the doctor sequence (HG12, HG13, HG04, HG05, HG06, HG07, HG16 — turns
  #235–#257): the worker speaks about the doctor, never as the doctor.
- **Turns needing one person to double: N = 0.**
- **Fixed-gender facts to carry forward** (they matter for the pod realisation, not for this
  set): the worker is female (Siân, HG17/HG21); the companion is female (HG14's "she", which
  the overlay's R8/S3 then pins into the Welsh as *iddi hi*, *chi'ch dwy*, *ni'n tair*); the
  patient is female in the seed text (Peggy, HG18). Three named or implied characters, three
  female — **if the pod realisation ever voices all three in one scene, the two-voice rule
  bites there**, because one female voice would have to play worker, patient and companion.
  That is a real exception, it belongs to the downstream pod job, and it is recorded here for
  Tom and Aran rather than solved.

**Answer in one line: yes — two voices carry it; in fact one does, and the text says which one.**

---

## THE COUNTS

Method, so the numbers are checkable: `git show 6b32a1451:…overlay.md` to a scratch file, then
`grep -c '🏔'` for the marks, an `awk` pass keying each marked row to its `**HGnn**` heading for
the row table, and a `python3` regex pass over the 57 extracted draft Welsh lines (the `> **Draft:**`
blocks only) for the per-item and per-seed distribution. Scripts are in this conversation's
scratch dir, not committed.

### The headline numbers

| what | number |
|---|---|
| 🏔 marks in the overlay, whole file | **54** |
| …of which in §1's chunk tables (the countable rows) | **47** |
| …of which in §0's frame ledgers and §4.1 prose | 7 |
| marked rows as a share of the **205 classified chunk-mappings** | **47 / 205 = 23%** |
| seeds carrying at least one 🏔 mark | **33 of 57 (58%)** |
| distinct divergent items named in §4.3 | **30** |
| distinct divergent items found by scanning all 57 draft lines | **37** |
| occurrences of those 37 items across the 57 draft lines | **157** |
| **seeds touched by at least one divergent item** | **51 of 57 (89%)** |
| seeds fully dialect-neutral | **6** — HG11, HG13, HG14, HG27, HG39, HG46 |

### The reconciliation finding — §4.3 undercounts, and by how much

The brief anticipated a discrepancy between §4.3's prose list and §1's tables. There is one, and
it runs in a specific direction, so state it plainly:

**§4.3's claim — *"a southern overlay would differ at exactly these points and no others"* — is
not supported by the tables.** Three separate gaps:

1. **Seven items are marked 🏔 in §1 but absent from §4.3's gathered list**: *angen* (the bare
   *dw i angen* need-frame, marked at HG19/HG31/HG51 and in R3), *petha* (HG26), *nôl* (HG51),
   *saff* (HG44), *reit 'ta* (HG31, where §4.3 lists only *rŵan 'ta*), *jobsys* (HG18, flagged
   as ward-register rather than dialect), *diarth*-adjacent notes. So the list is not a complete
   gather of its own marks.
2. **Two genuinely pervasive divergences are marked nowhere and listed nowhere.** These are the
   biggest misses and they are both function words:
   - **the preverbal particle *mi*** (northern) versus *fe* / bare (southern) — **17 seeds, 19
     occurrences**: *mi ddeuda i*, *mi fedra i*, *mi fydda i*, *mi wnawn ni*, *mi bicia i*…
   - **the 3sg masculine pronoun *o / fo*** (northern) versus *e / fe* (southern) — **11 seeds,
     12 occurrences**: *mae o'n 135 dros 80*, *mi ddeuda i o eto*, *ei fod o*, *amdano fo*.
3. **The marking convention is first-sighting, not every-instance.** *dach chi* is marked once
   (HG22) but appears in 16 seeds; *efo* is marked once (HG10) but appears in 8. So the 47-row
   count is a **count of flagged sites, not of divergent tokens** — which is exactly why the
   row count (23%) and the seed coverage (89%) are so far apart, and why quoting only one of
   them would mislead.

**None of this changes the verdict.** Adding *mi* and *o/fo* adds two more one-token swaps
inside identical chunks. It moves the spread from 33 seeds to 51, which is the number that
matters for recording hours, and it leaves "no seed needs a different sentence" intact.

### By kind — rows, distinct items, and spread

Buckets are Tom's four. "Rows" = 🏔-marked rows in §1. "Items" = distinct divergent items.
"Seeds" = seeds in which the item actually appears anywhere in the draft text.

| kind | 🏔 rows | distinct items | seeds touched by the kind |
|---|---|---|---|
| **function word** (pronouns, prepositions, particles, quantifiers) | 12 | **13** | **48** |
| **verb form** (inflection / verb-noun shape) | 12 | **7** | **31** |
| **lexical** (different word, same thing) | 20 | **16** | **28** |
| **other** | 3 | **1** | 5 |
| **total** | **47** | **37** | **51 (union)** |

The read of that table in one sentence: **the lexical items are the many and the cheap; the
function words are the few and the expensive**, because thirteen items reach 48 of 57 seeds.

### The pervasive set — the five §4.3 names, plus the two it missed

This is the group that actually decides mask-versus-fork, because each one touches far more of
the course than its row count suggests.

| item | north | south | seeds | occurrences | 🏔 rows |
|---|---|---|---|---|---|
| you / we, present | *dach chi* / *dan ni* | *dych chi* / *dyn ni* (*ych chi* / *ŷn ni*) | **16** | 17 | 1 |
| **preverbal particle** | *mi* + soft mutation | *fe* + soft mutation, or bare | **17** | 19 | **0 — unlisted** |
| **3sg masc pronoun** | *o* / *fo* | *e* / *fe* | **11** | 12 | **0 — unlisted** |
| can / be able | *medru* — *fedra i, fedrwch chi, mi fedar* | *gallu* — *galla i, gallwch chi* | 11 | 12 | 3 |
| with | *efo* | *gyda* | 8 | 8 | 1 |
| say / understand | *deud* / *dallt* (*fy nallt i*) | *dweud* / *deall* | 7 | 10 | 4 |
| do / make | *gneud* / *neud* | *gwneud* | 7 | 7 | 2 |
| need-frame | *dw i angen* / *dach chi angen* | *mae angen i fi* / *mae eisiau i fi* | 7 | 7 | 3 |
| now | *rŵan* | *nawr* | 6 | 6 | 2 |
| a little | *chydig* | *tipyn* / *bach o* | 5 | 5 | 1 |

Seven items above §4.3's five, and the two additions are the two widest-spread items in the
whole document. That is the single most important line in this report.

### The full item inventory — 37 items, by kind

`?` means I do not know the southern counterpart with enough confidence to write it. An honest
`?` is worth more than a guess, and Aran or a southern authority fills them in one pass.

**Function word — 13 items**

| item (north) | south | seeds | seeds listed |
|---|---|---|---|
| *dach chi / dan ni* | *dych chi / dyn ni* | 16 | HG02, 06, 07, 22, 23, 24, 25, 28, 35, 40, 42, 48, 51, 53, 54, 55 |
| *mi* preverbal particle | *fe* / bare | 17 | HG01, 03, 20, 23, 28, 32, 33, 34, 36, 40, 43, 44, 45, 49, 50, 51, 53 |
| *o / fo* 3sg masc | *e / fe* | 11 | HG01, 16, 21, 25, 32, 33, 34, 35, 44, 45, 50 |
| *efo* | *gyda* | 8 | HG10, 15, 18, 23, 26, 29, 33, 47 |
| *angen* bare need-frame | *mae angen i fi / mae eisiau i fi* | 7 | HG19, 22, 24, 31, 48, 51, 56 |
| *chydig* | *tipyn / bach o* | 5 | HG08, 18, 29, 32, 41 |
| *wrthach chi / wrthan ni / ohonan ni* | *wrthoch chi / wrthon ni / ohonon ni* | 4 | HG19, 20, 21, 28 |
| *fan'ma / fan'na* | *fan hyn / fanna* | 4 | HG24, 25, 26, 43 |
| *gen i* (possession) | *gyda fi* — **and a reorder** | 2 | HG18, 57 |
| *bob dim* | *popeth* | 1 | HG02 |
| *'ta* alternative-question tag (*y cyw iâr 'ta'r cawl*) | *neu*? `?` | 1 | HG41 |
| *reit 'ta / rŵan 'ta* tag | `?` | 2 | HG10, 31 |
| *petha* | *pethe* | 1 | HG26 |

**Verb form — 7 items**

| item (north) | south | seeds | seeds listed |
|---|---|---|---|
| *medru* — *fedra i, fedrwch chi, mi fedar* | *gallu* — *galla i, gallwch chi* | 11 | HG03, 12, 19, 20, 23, 28, 29, 30, 38, 41, 43 |
| *deud / dallt / nallt* | *dweud / deall* | 7 | HG01, 02, 04, 19, 20, 28, 44 |
| *gneud / neud* | *gwneud* | 7 | HG05, 07, 12, 18, 24, 34, 40 |
| *fasach chi'n licio / liciech chi* | *byddech chi'n hoffi / hoffech chi* | 3 | HG17, 38, 41 |
| *steddwch / ista* | *eisteddwch / ishte* | 2 | HG25, 47 |
| *gaddo* | *addo* | 2 | HG37, 49 |
| *picio / bicia* | *pico / galw heibio* | 2 | HG34, 51 |

**Lexical — 16 items**

| item (north) | south | seeds |
|---|---|---|
| *isio* | *eisiau / moyn* | HG04, 10, 55 |
| *rŵan* | *nawr* | HG08, 09, 10, 32, 37, 47 |
| *ara deg / gan bwyll / ara bach* | `?` — both are broadly current; a southern authority should rule | HG16, 47, 49, 56 |
| *sownd* (stuck) | `?` — likely shared | HG03, 23 |
| *clustog* (pillow) | *gobennydd*? `?` — *clustog* may be shared | HG22, 52 |
| *adra* | *adre* | HG26 |
| *tŷ bach* | `?` — likely shared | HG51 |
| *gola* | *golau / gole* — an accent-spelling difference | HG28 |
| *ylwch* (look) | *edrychwch* `?` | HG21 |
| *toc* (shortly) | *cyn bo hir* `?` | HG40 |
| *del* (nicely) | *neis / pert* `?` | HG34 |
| *clên* (kind) | *ffeind / caredig* — the overlay itself names *ffeind* as the fallback | HG10 |
| *call* (sensible) | `?` — likely shared | HG06 |
| *diarth* | *dieithr* | HG04 |
| *stafell molchi* | *stafell ymolchi* — reduction, not lexis | HG24 |
| *gan fwya* | *gan fwyaf* — reduction, not lexis | HG08 |
| *nôl* (fetch) | `?` — likely shared | HG51 |
| *disgwyl* = expect | `?` — the north/south senses of *disgwyl* differ and I will not guess | HG54 |
| *saff* | `?` — a borrow, likely shared | HG44 |

*(Nineteen rows above for sixteen counted items: three — *stafell molchi*, *gan fwya*, *gola* —
are colloquial vowel reductions rather than different words, and are counted in "other".)*

**Other — 1 item**

| item | what it is | seeds |
|---|---|---|
| colloquial vowel reduction (*gynta*, *dechra*, *hynna*, *gola*, *gan fwya*, *stafell molchi*) | a spelling-of-accent matter, not a different word; a southern text would reduce differently (*cynta'*, *dechre*, *gole*) | HG02, 11, 19, 31, 47, 50, 52, 08, 24, 28 |

---

## THE CHUNKS THAT WOULD HAVE TO DIFFER — the southern build list

Keyed to seed ids, so whoever builds the southern overlay knows the size of the job. **This is a
swap list, not a re-authoring list.**

### Seeds needing a wholly different *shape*, not a swap — the expensive ones

**Two. Both are the same fork.**

- **HG18** — *"mae gen i chydig o jobsys bach i'w gneud efo chi"* → the southern *gyda fi*
  possession moves the possessed noun and the possessor phrase relative to each other. Not a
  token swap.
- **HG57** — *"mae'n well gen i ddeg peth bach"* → same *gen i* → *gyda fi* fork in the
  preference frame.

The overlay itself calls this out (§4.1 item 2, 🏔: *"the N-form fork"*) and it is the only
structural one in the set. **A per-chunk alternate form covers both. A per-token mask does not.**

### The 47 flagged sites, seed by seed

| seed | English chunk | northern Welsh (overlay, draft) | southern counterpart |
|---|---|---|---|
| HG01 | if I say | *os dw i'n deud* | *os dw i'n dweud* |
| HG02 | if you have any trouble understanding me | *os dach chi'n cael unrhyw drafferth fy nallt i* | *os dych chi'n cael… fy neall i* |
| HG02 | it's really important that you understand everything | *…eich bod chi'n dallt bob dim* | *…eich bod chi'n deall popeth* |
| HG03 | I can call someone | *mi fedra i alw ar rywun* | *fe alla i alw ar rywun* |
| HG04 | if I use a word you don't know | *os dw i'n defnyddio gair diarth i chi* | *…gair dieithr i chi* |
| HG04 | just say | *dim ond deud sydd isio* | *dim ond dweud sydd eisiau / moyn* `?` |
| HG05 | a word that doesn't make sense | *gair sydd ddim yn gneud synnwyr* | *…yn gwneud synnwyr* |
| HG06 | that's completely sensible | *mae hynna'n hollol gall* | `?` — *call* may be shared |
| HG08 | a little bit every day | *rhyw chydig bob dydd* | *rhyw dipyn bob dydd* `?` |
| HG10 | the weather takes some getting used to | *mae isio arfer efo'r tywydd* | *mae eisiau arfer gyda'r tywydd* |
| HG10 | but the people are kind | *ond mae'r bobl yn glên* | *ond mae'r bobl yn ffeind* |
| HG10 | now then | *rŵan 'ta* | *nawr 'te* |
| HG12 | what can I do for you today | *be fedra i neud i chi heddiw* | *beth alla i wneud i chi heddiw* |
| HG17 | what would you like me to call you | *be liciech chi i mi'ch galw chi* | *beth hoffech chi i fi'ch galw chi* |
| HG18 | I've got a few little jobs to do with you | *mae gen i chydig o jobsys bach i'w gneud efo chi* | **reorder** — *mae … gyda fi* |
| HG19 | I just need to check your details | *dw i jyst angen tsiecio'ch manylion chi* | *mae angen i fi tsiecio…* `?` |
| HG21 | it's on my badge (+ look) | *mae o ar fy mathodyn i, ylwch* | *mae e ar fy mathodyn i, …* `?` |
| HG21 | there's a lot of us to remember | *mae 'na lot ohonan ni i'w cofio* | *…ohonon ni…* |
| HG22 | is there anything you need | *oes 'na rywbeth dach chi angen* | *oes rhywbeth dych chi angen* `?` |
| HG22 | another pillow | *clustog arall* | `?` — possibly shared |
| HG24 | the bathroom's just through there | *mae'r stafell molchi jyst drwy fan'na* | *…stafell ymolchi… fanna* |
| HG25 | don't sit there worrying quietly | *peidiwch ag ista'n fan'na'n poeni'n ddistaw* | *peidiwch ag eistedd fanna…* |
| HG26 | your things go in the cupboard there | *mae'ch petha chi'n mynd i'r cwpwrdd fan'na* | *…pethe… fanna* |
| HG26 | valuables are best going home with the family | *mae'n well i betha gwerthfawr fynd adra efo'r teulu* | *…adre gyda'r teulu* |
| HG28 | I won't lie to you | *ddeuda i ddim celwydd wrthach chi* | *ddweda i ddim celwydd wrthoch chi* |
| HG28 | we keep the lights down | *dan ni'n cadw'r gola'n isel* | *dyn ni'n cadw'r gole'n isel* |
| HG29 | can you roll up your sleeve for me | *fedrwch chi dorchi'ch llawes i mi* | *allwch chi dorchi'ch llawes i fi* |
| HG31 | right then | *reit 'ta* | *reit 'te* |
| HG31 | I need to | *dw i angen* | *mae angen i fi* `?` |
| HG34 | it's come down nicely | *mae o wedi dod i lawr yn ddel* | *mae e wedi dod i lawr yn neis* `?` |
| HG34 | I'll pop back | *mi bicia i'n ôl* | *fe bica i 'nôl* `?` |
| HG37 | I promise | *dw i'n gaddo* | *dw i'n addo* |
| HG37 | all done for now | *wedi gorffen am rŵan* | *wedi gorffen am nawr* |
| HG38 | would you like something for it | *fasach chi'n licio rhywbeth at y boen* | *hoffech chi rywbeth at y boen* |
| HG40 | I'll be back shortly | *mi fydda i'n ôl toc* | *fe fydda i 'nôl cyn bo hir* `?` |
| HG41 | what would you like for lunch | *be fasach chi'n licio i ginio* | *beth hoffech chi i ginio* |
| HG41 | the chicken or the soup | *y cyw iâr 'ta'r cawl* | `?` — the *'ta* tag's southern equivalent |
| HG43 | I'll leave this jug of water here | *mi adawa i'r jwg dŵr 'ma yn fan'ma* | *fe adawa i'r jwg dŵr 'ma fan hyn* |
| HG44 | the chicken's safe | *mae'r cyw iâr yn saff* | `?` — likely shared |
| HG47 | nice and slow | *yn ara deg* | `?` — likely shared |
| HG47 | sit on the edge of the bed | *steddwch ar ochr y gwely gynta* | *eisteddwch ar ochr y gwely gynta'* |
| HG51 | do you need the toilet | *dach chi angen y tŷ bach* | *dych chi angen y tŷ bach* `?` |
| HG51 | can I get you anything before I go | *ga i nôl rhywbeth i chi cyn i mi fynd* | *ga i nôl rhywbeth i chi cyn i fi fynd* |
| HG54 | expecting someone nice | *disgwyl rhywun neis* | `?` — the *disgwyl* sense differs |
| HG55 | if you want a hand | *os dach chi isio help llaw* | *os dych chi moyn help llaw* |
| HG56 | let's take it steady | *dewch i ni fynd gan bwyll* | `?` — likely shared |
| HG57 | I'd rather ten small things | *mae'n well gen i ddeg peth bach* | **reorder** — *mae'n well gyda fi* |

Plus the two unmarked pervasive items above, which apply mechanically wherever they occur:
*mi* → *fe* (17 seeds) and *o / fo* → *e / fe* (11 seeds).

**Thirteen `?` cells.** Every one of them is a southern lexical or sense question a southern
speaker settles in a single pass; none of them affects the mask-versus-fork verdict, because a
`?` here is still a one-chunk swap, just one I cannot name.

---

## THE CASTING READ — the 85 turns, block by block

| block | turns | who speaks | who else is present | third speaker needed |
|---|---|---|---|---|
| §1.0 opener, nurse sequence (HG01–HG11, HG14–HG16) | 18 | worker | patient; from #33 a family companion (female) | no |
| §2.0 opener, doctor sequence (HG04–HG07, HG12, HG13, HG16) | 12 | worker | patient; the doctor is *referred to*, never voiced | no |
| §1.1 names and first meeting (HG17–HG23) | 9 | worker (**named Siân — female**) | patient (Peggy) | no |
| §1.2 settling in (HG24–HG28) | 8 | worker | patient | no |
| §1.3 observations (HG29–HG37) | 9 | worker | patient | no |
| §1.4 pain assessment (HG38–HG40) | 5 | worker | patient | no |
| §1.7 meals and drinking (HG41–HG45) | 7 | worker | patient | no |
| §1.8 mobility (HG46–HG50) | 8 | worker | patient | no |
| §1.9 comfort round (HG51–HG57) | 9 | worker | patient | no |

**Every turn is the worker's.** The set is a production seed set — the learner's own mouth —
so "who is present" never becomes "who else records".

**The three-party seeds, checked individually as the brief asks:**

- **HG14** — *"Of course — she's very welcome. Two pairs of ears are better than one."* Worker
  speaks; the companion is granted entry, not voiced. **No third speaker.**
- **HG15** — *"That's what family's for. Right — with you both here, let's make a start."*
  Worker speaks; "you both" is addressed, not answered. **No third speaker.**
- **HG16** — *"Then we'll go through it slowly, all three of us."* Worker speaks; the "three"
  are counted, not cast. **No third speaker.** (The Welsh does pin the companion female —
  *ni'n tair* — per the overlay's S3.)
- **Doctor sequence, #235–#257** — the worker's twelve turns include *"I can call someone who
  speaks it more confidently than me"* (HG03) and *"what can I do for you today?"* (HG12). The
  doctor is a referent throughout. **No third speaker.**

**Fixed genders in the text**, which remove the doubling freedom later: the worker is female
(HG17 *Siân*, HG21 *"it's on my badge"*); the companion is female (HG14 *"she"*, hardened into
the Welsh as *iddi hi / chi'ch dwy / ni'n tair*); the patient is female (HG18 *Peggy*).

**The one exception, recorded not solved:** if the downstream pod realisation ever voices worker
+ patient + companion in a single scene, all three are female by the text, and the two-voice
rule would put all three on Catrin. That is Tom and Aran's call, it belongs to the pod job, and
nothing here should be redesigned to avoid it.

---

## OBSERVATIONS — flagged, not changed

Per the brief, these are noted in one line each and nothing was edited.

1. **HG09 and HG17 give the worker two different biographies.** HG09 is *"I'm from the
   Philippines — I've been here three years now"*; HG17 introduces her as *Siân*. Both are
   canonical seeds consolidated from different source flows, so the set carries a Filipino
   worker called Siân. Harmless for a production set (the learner supplies their own name and
   origin), possibly awkward the moment a pod voices it. Tom's or Aran's call.
2. **§4.3's completeness claim should be softened** when the overlay is next touched — the
   phrase *"and no others"* is the only line in it my count contradicts.
3. ***tŷ bach*, *call*, *sownd*, *saff*, *nôl*, *gan bwyll*, *ara deg*, *clustog*** are marked
   as northern in the overlay; my read is that several are current in the south too, which
   would *shrink* the divergence list. A southern speaker settles it; I have written `?` rather
   than overruling Aran's own marking.

---

## EXPLICIT GAPS

- **No southern Welsh authority was consulted.** Thirteen southern counterparts are `?`. They
  are reported as unknown, not filled by guess.
- **The baskets are not measured.** Overlay decision R9 defers rendering the ~900 basket phrases
  until Aran ratifies §1, so there is no Welsh basket text to scan. My 89%-of-seeds figure is
  over the 57 seed sentences only; the basket phrases compose from the same chunks, so the
  expectation is that it holds or rises, but it is an expectation, not a measurement.
- **Patient-turn Welsh does not exist yet** (overlay §8), so the casting read covers the
  production side only. The three-female-characters exception above is derived from the English
  seed text, not from any Welsh dialogue.
- **No base-course census was run** — job #630's per-item census is still outstanding (overlay
  §4.2), so I cannot say how many of the 37 divergent items `cym_n_for_eng` already teaches.
  That number would tell Tom how much of the mask is already built.
