# Ulster (Donegal) Irish — dialect spec for `gle_ul_for_eng`

**Set 2026-08-20, BEFORE the first seed was translated.** Same discipline as the Connemara course:
the target is fixed first and the translators, the correctness pass and the consistency pass all
work to *this* document. Retrofitting a dialect is the failure mode of the original standard-Irish
course; this file exists so it does not happen a third time.

Kai's ruling, 2026-08-20: Ulster Irish **as spoken in the Donegal Gaeltacht** — Gaoth Dobhair,
Rann na Feirste, na Rosa, Cloich Cheann Fhaola. This is the most distinct of the three dialects and
**the point of the course is that it sounds like Donegal, not like the standard.**

Sister document: `docs/gle-cn/connemara-dialect-spec.md`. Read it — the structure here is
deliberately parallel so the two courses can be diffed against each other.

---

## 0. The governing line

> **Orthography = An Caighdeán Oifigiúil. Grammar and lexis = Donegal (Gaoth Dobhair / na Rosa
> register).**

Identical split to Connemara, for the same two reasons: learners must be able to read Irish that
isn't ours, and any future TTS voice will be trained on standard spelling.

So a **lexical** Donegal item that Ó Dónaill lists as a headword in standard orthography is IN.
A **spelling-only** respelling of a word that has a standard form is OUT.

- IN: `fosta`, `achan`, `uilig`, `goidé`, `domh`, `ábalta`, `amharc`, `a dhath` — every one is an
  Ó Dónaill headword (probes in §2) **and** attested in Donegal speech (counts in §2e).
- OUT: `aríst` → `arís`, `a'` → `ag`, `'bhfuil` → `an bhfuil`, `caidé` → `goidé` (see §1e).

**The headword test alone is NOT sufficient — see §2e.** It wrongly excluded `madadh`, which is the
Donegal word for "dog" (`madra` is used *zero* times in Donegal), and it wrongly proposed removing
`tuigbheáil`. Where the dictionary and attested Donegal speech disagree, **speech wins** — that is
Kai's ruling #1 applied to our own method, not just to the learner's dictionary.

### 0b. Register

Irish `tú`/`sibh` is number only — no T/V politeness split, so there is no register decision, exactly
as established for Connemara. Register work goes into verb-form choice, which §1 fixes.

### 0c. The known side is English, and it is shared with Connemara

The 668 English seeds are **read verbatim** from `gle_cn_for_eng`. They are not re-authored here.
That matters because they already carry Kai's Hiberno-English ruling of 2026-08-20 — seed 9 is
*"I have a little Irish now"*, seed 13 *"you have very good Irish"*, seed 22 *"people who have
Irish"* — teaching the `tá … agam` structure through the English that Irish people actually use.
Keeping the English byte-identical is what makes the two dialect courses teach the same English.

No bracketed glosses on the known side, ever — they get read aloud.

---

## 1. The checklist

### 1a. REQUIRED Donegal forms

| Meaning | Donegal (use this) | Connemara course uses | Standard | Evidence |
|---|---|---|---|---|
| what | `goidé` (§1e) | `céard` | `cad é` | corpus: `goidé` UL 1,477 / CO 0 / MU 0 |
| how | `cad é mar` / `caidé mar` | `cén chaoi` | `conas` | Wikipedia Ulster Irish; §2 |
| also | `fosta` | `freisin` | `freisin` | FGB: `fosta 2, adv. Also.` with 4 examples |
| every | `achan` | `chuile` | `gach aon` | FGB headword: `achan = gach aon` |
| all (the lot) | `uilig` | `ar fad` | `uile` | FGB headword — but **NOT a dialect marker**: Connemara uses it nearly as much (UL 1,510 / CO 1,124) |
| able to | `ábalta` | `in ann` | `in ann` | FGB: `ábalta, a3. Able, capable. ~ (ar) rud a dhéanamh` |
| look / see (vb) | `amharc` | `breathnaigh` | `féach`/`amharc` | FGB full entry; Wikipedia gives W. Ulster `amhanc` |
| sees | `tchí` / `tchíonn` | `feiceann` | `feiceann` | Wikipedia: `tchíom` "I see", independent form only |
| to me | `domh` | `dom` | `dom` | FGB headword: `domh = dom` |
| we are | `tá muid` (analytic) | `tá muid` | `táimid` | FGB `muid`: "Tá, bhí, bheadh, ~" |
| we (pron.) | `muid` | `muid` | `muid`/`sinn` | as above |
| think | `síleann` / `sílim` | `ceapann`/`ceapaim` | either | FGB `síl 1`: "~im go bhfuil an ceart agat" |
| nothing | `a dhath` (§1e-bis) | `tada` | `dada`/`tada` | corpus: `dhath` UL 596 / CO 22 / MU 1 |
| at all | `ar bith` | `ar bith` | `ar bith` | shared — no change |
| again | `arís` | `arís` | `arís` | standard spelling; `aríst` is spelling-only, OUT |
| can (be able) | `tig le` | `in ann` | `tig le`/`féad` | FGB `tar le 4`: "Tagann le, **tig le**, is able" |
| want | `tá … ag iarraidh` | `tá … ag iarraidh` | `teastaíonn` | shared with Connemara; `teastaíonn` OUT |
| very (intensifier) | `iontach` | `an-` | `an-` | Wikipedia lists `iontach` as the Ulster intensifier |

**`tá muid`, `ag iarraidh` and `ar bith` are shared with Connemara.** That is not a mistake and not
laziness — the two dialects genuinely agree there, and inventing a difference to make the courses
look more different would be worse than useless.

### 1b. FORBIDDEN — Munster

`táim` · `nílim` · `táimid` · `bhíos` · `chuas` · `dheineas` · `conas` · `ansan` · `ana-` ·
`in aon chor` · `faic` · `garsún` · `prátaí` · `fé` · `chughat` · `in acmhainn` · `sara`

### 1c. FORBIDDEN — Connacht

`céard` · `cén chaoi` · `chuile` · `tada` · `freisin` · `breathnaigh` · `in ann` · `ar fad`
(as "all") · `ceapaim`/`ceapann` (as "think")

These are exactly the forms the *sister* course requires. A translator who has read the Connemara
spec will reach for them by reflex; that reflex is the main contamination risk on this job.

### 1d. NEGATION — the one rule that decides the course

Negation is the highest-frequency dialect feature in this seed set: the English has *I don't* ×47,
*didn't* ×25, *wouldn't* ×11, *doesn't* ×11, *couldn't* ×9, *I'm not* ×13. Whatever we choose here is
668 seeds wide, and it is the single feature that most makes the course sound like Donegal.

**RULED 2026-08-20 ON MEASURED EVIDENCE. The default negative is `ní` / `níl` / `níor`.**

Job #536 never returned, but the question was settled twice over, independently:

| | Donegal | Connemara | Kerry |
|---|---|---|---|
| `cha` + `chan` + `char` | **561** | 13 | 8 |
| `ní` + `níor` + `níl` | **6,293** | 14,571 | 13,173 |

`cha` **is** emphatically Ulster — better than 40:1 against the other two dialects. But `ní` is the
default *even in Donegal*, by about 11:1; the cha-family is roughly **8%** of all negation, and
`níl` alone outnumbers it fivefold. Job #530's separate corpus (1.36M tokens of Donegal speech,
including the Béaloideas Beo folklore archive and the Doegen 1928–31 transcripts) reached the same
answer from different material: `ní` ahead 3.2:1 in Gaeltacht speech and 9.1:1 in broadcast, and
**`chan fhuil` is zero in both its Donegal sources** — "I'm not" is `níl mé`. Quiggin saw why as far
back as 1906: in a single townland, `cha` predominated in one family and `ní` "almost exclusively"
in another.

So: **`ní` throughout, and a wholesale `ní`→`cha` sweep would be an error** — it would over-apply
`cha` more than tenfold. The remaining open question is narrower: whether a *minority* of the 126
independent-clause negatives should carry `cha` to reach the natural ~8%. That is a speaker's
judgement on a marked subset, since natural `cha` use is conditioned by contradiction and emphasis,
which cannot be read off the English.

Background from Ó Dónaill's `cha` entry and the Wikipedia Ulster Irish article:

- `cha` lenites b c f g m p s, eclipses d and t; `chan` before a vowel or before `f`+vowel;
  `char` with the past tense of regular verbs; `char`/`charbh` with the copula.
- In **Gweedore specifically**, `cha` eclipses all consonants *except* `b-` in forms of the verb
  "to be", and sometimes `f-`.
- `cha` **cannot take the future tense** — the present habitual carries future meaning after it.
- FGB shows `cha` in ordinary declarative negation, not only in retorts:
  *Chan fhuil sin ceart* · *Char ith sé é* · *Cha bhíonn do dheifir ort*.
- `cha` is commonest in the **north** of the Donegal Gaeltacht — which is where Gaoth Dobhair is.

**The overapplication trap, which holds regardless.** `cha` is an *independent-clause*
particle. It does **not** replace:
- subordinate "that…not" → `nach` / `nár`, never `cha`
- negative relative clauses → `nach` / `nár`
- negative questions → `nach bhfuil…?`
- negative imperative → `ná`

A translator who swaps every English negative for `cha` will produce confidently wrong Irish.

### 1e. `goidé`, not `caidé` — REVERSED 2026-08-20 on measured evidence

**This section originally ruled the opposite way, and it was wrong.** It asserted that `caidé` "is
what Donegal writers and Ulster-dialect journalism use today". That was an assertion with no
evidence behind it, and two independent corpus counts contradict it flatly:

| form | Donegal | Connemara | Kerry |
|---|---|---|---|
| `goidé` | **1,477** | 0 | 0 |
| `caidé` | 45 | 3 | 0 |

Donegal writes `goidé` **33 times as often**. Both are Ó Dónaill headwords resolving to `cad é`, so
§0 admits either on the spelling test — which means Kai's ruling #1 decides it, and ruling #1 says
what Donegal actually says wins. **Use `goidé` uniformly.** 43 seeds were normalised.

### 1e-bis. `a dhath`, not `dada`

Same correction, same evidence. `dada` is Connacht-leaning; the Donegal word for anything/nothing is
`a dhath` — `dhath` UL 596 / CO 22 / MU 1 against `dada` UL 6 / CO 40 / MU 5. Four seeds normalised.

### 1f. Grammar rules Donegal requires

- Analytic 1st person **plural**: `tá muid`, `bhí muid`, `bheadh muid` — never `táimid`.
  Wikipedia: "In Ulster and North Connacht the analytic forms are used … `molann muid`".
- Synthetic 1st person **singular present** is kept: `sílim`, `tuigim`, `bheirim`. Same rule the
  Connemara spec had to correct itself on — synthetic 1sg present YES, synthetic 1pl and synthetic
  past NO.
- 2nd-conjugation **future stem is `-óch-`**, not `-ó-` (Wikipedia). e.g. `tosóchaidh` for
  standard `tosóidh`. *(Marked for the evidence pass — this is an orthographic consequence of a
  phonological fact and may collide with §0's standard-spelling rule. See §3.)*
- Interrogative + verb keeps its particle and mutation: `Cad é mar atá tú?`, `An bhfuil tú…?`,
  `Ar thosaigh mé?` — never a bare verb after the question word.
- Direct relative `a` + lenition; indirect relative `a` + eclipsis.
- Object + `a` + verbal noun: `Gaeilge a labhairt`, not `labhairt Gaeilge`.

---

## 2. Evidence — what was actually consulted for THIS document

Every row in §1a that cites FGB was fetched live from teanglann.ie on 2026-08-20 by
`scripts/gle-ul/fgb.cjs`, which extracts the dictionary section of the page. The quoted text is the
dictionary's own wording. Ó Dónaill is the right authority to lean on here for a reason worth
recording: **Ó Dónaill was himself a Donegal man** (Loughros, Ardara), and FGB carries Donegal forms
as headwords rather than relegating them.

Also consulted directly: the Wikipedia *Ulster Irish* article, for the `cha` mutation and
distribution statements, the `-óch-` future stem, analytic verb forms, `tchíom`/`bheiream`/`gheibhim`,
and the note that its consonant inventory is based on the Gweedore dialect.

**Two workers are extending this evidence base as this document is written** — job #530 on the
Donegal authorities and form inventory generally, job #536 on the `cha`/`ní` question specifically.
Their findings supersede anything provisional here.

### 2b. Honest comparison with the Connemara evidence base

The Connemara spec rested on two things this document does not have: **Ó Curnáin, *The Irish of
Iorras Aithneach*, vols I–IV** as searchable PDFs, and a **608,947-character base corpus** of
existing Irish course material that could be censused for dialect markers.

Neither exists here. There is no Donegal equivalent of Ó Curnáin on this machine, and there is no
existing Donegal course corpus to count — this course starts from 668 empty shells.

**So the Donegal evidence base is, as of this writing, thinner than the Connemara one was.** That is
stated plainly because papering it over would be poison. What jobs #530 and #536 are for is to close
that gap with real running Donegal text; how far they get is reported in the final write-up rather
than assumed here.

---

## 2c. Rulings made DURING the build (2026-08-20), from what block 1 threw up

Block 1 (job #539) surfaced four things the spec had not settled. Ruled here so all seven blocks
end up the same; anything already written the other way is normalised in the closing sweep.

### `tosaigh`, NOT `toisigh` — and this was the spec's own fault

§1f originally gave `Ar thoisigh mé?` as its worked example, and block 1 duly used `toisigh` eight
times. **That example was wrong and it has been corrected above.** Checked against FGB:

- `tosaigh 1, v.t. & i. **Begin, start.**`
- `toisigh 2 = **tomhais** 1` — i.e. FGB reads `toisigh` as a variant of *measure*, a different word.

`toisigh`/`toiseacht` is a real Donegal pronunciation of `tosaigh`/`tosú`, but it is a **spelling-only**
variant of a word that has a standard spelling, which §0 puts firmly OUT — and unlike a harmless
respelling this one collides with an existing headword meaning something else. **Use `tosaigh`,
`tosú`, `thosaigh`.**

### `tig le` vs `ábalta` — split by the ENGLISH, not by feel

Both are Donegal and §3 q5 left the split open, which meant seven workers would invent seven splits.
Block 1's split is adopted because it is mechanical and reproducible:

- English has a finite **"can" / "could"** → `tig le` (`an dtig liom`, `chomh luath agus a thig leat`,
  `an dtiocfadh leat` for the conditional).
- English literally says **"be able to"** → `ábalta` (`a bheith ábalta`).

Never `in ann` — that is the Connemara form.

### `ag iarracht` for "trying" — KEPT, but flagged for Kai as unattested

Block 1 is right on the evidence and it should be recorded: FGB has `iarracht` as a **noun only**
(`iarracht a thabhairt ar rud a dhéanamh`, `iarracht a dhéanamh`). There is no attested progressive
`ag iarracht` + verbal noun. The idiomatic form would be `ag déanamh iarrachta`.

It is kept anyway, for one reason only: **it is Kai's own explicit ruling** for the sister course —
*"no, not iarracht a dhéanamh, just ag iarracht"* (`docs/gle-cn/try-want-contrast-plan-2026-08-18.md`) —
and having the two dialect courses say different things about the same English would be worse than
having them share one questionable form. This is **not** a case for ruling #1 (dialect beats
standard): `ag iarracht` is not a Donegal dialect form, it is a pedagogical coinage, so the
"you can't look it up" defence does not apply to it. **Kai should rule.** It is roughly 20 seeds
course-wide and a one-line sweep either way.

### Donegal lexis from block 1, all FGB-verified and now binding on every block

| Form | FGB says | Use for |
|---|---|---|
| `inteacht` | `inteacht = éigin 1` | "some-" (`rud inteacht`, `duine inteacht`) — NOT `eicínt` (Connemara) |
| `pill`, `pilleadh` | `pill 2, ~eadh = fill 1` | return / come back |
| `cluinstin` | `cluin, v. … vn. ~stin` | hear — NOT `cloisteáil` |
| `doiligh` | full entry, "hard, difficult" | difficult |
| `barraíocht` | full entry, "excess; too much" | too much / too many |
| `cad chuige` | — | why (Ulster; not `cén fáth`) |
| `gasta` | — | quickly (`go gasta`) |
| `ag gabháil a` + vn | — | "going to" future |

---

## 2d. Rulings from block 2 (job #540) — and the biggest consistency risk in the job

### `yes` / `no` — 58 seeds, and Irish has no word for either

**Measured, not estimated:** 58 of the 668 seeds contain a bare English `yes` or `no`, and they are
spread across every block (96, 97, 141, 172, 173, 183, 184, 189, 191, 268 … 408 and on). Left
unruled, seven workers produce seven different "yes" and the course teaches all of them. This is the
single largest consistency exposure on the job.

**The rule: echo the verb.** Irish answers by repeating the verb of the question in the right tense
and polarity. These seeds are answers whose question is not present, so the echo takes its verb from
**the first finite verb of the clause that follows in the same seed**, then a comma, then the clause:

| seed | English | Irish |
|---|---|---|
| 97 | yes I'm ready to go … | `Tá, tá mé réidh le himeacht …` |
| 96 | no I'm not ready yet … | `Níl, níl mé réidh go fóill …` |
| 268 | yes she sent me two emails … | `Chuir, chuir sí dhá ríomhphost chugam …` |
| 172 | yes that would be very helpful | `Bheadh, bheadh sin iontach cuidiúil` |
| 189 | yes that's a good idea | `Is ea, is maith an smaoineamh é` (copula → copula) |
| 367 | no nobody told me | `Níor, níor inis duine ar bith domh` |

**Exception — `yes`/`no` that is not an answer.** Seed 141 `no problem.` and seed 173 `no thank you`
are English idioms, not polarity answers. Translate them as idioms (`Tá go maith`, `Níl, go raibh
maith agat`) and do NOT force a verb echo. If the `no` cannot be read as answering a question,
it is an idiom.

**If the `cha` ruling lands and makes `cha` the default,** the echo is unaffected: the bare echoed
verb is not a `cha` site, and only the following clause changes.

### Ulster lenition after simple preposition + article — REQUIRED, and a validator must not "fix" it

Ulster lenites after a simple preposition + singular article where the Caighdeán eclipses:
`ar an **bh**us`, `ar an **ch**aint`, `den **ch**aint`, `leis an **mh**éid`, `ag an **d**oras`.
The standard writes `ar an mbus`. **This is a genuine Donegal grammar feature, it is IN, and it is
one of the strongest dialect signals in the whole set.** It is recorded here because block 2 rightly
warned that a consistency pass ignorant of it would "correct" every instance back to the standard
and silently delete the dialect.

### §1a vs §3.4 contradicted each other on `tchí` — resolved

§1a listed `tchí` as REQUIRED while §3.4 listed it as an open question. A validator built from §1a
would have demanded a form the spec was not sure of. **Resolution: `tchí`/`tchíonn` is PERMITTED, not
required.** It is genuine spoken Donegal but sits on the §0 line between dialect lexis and phonetic
respelling, which is exactly what §3.4 asks a speaker to settle. Until then, neither require it nor
forbid it, and `feiceann`/`chífidh` is acceptable. §1a's row is to be read as permitted.

### `tosú`, not `toiseacht`

Block 2 used `toiseacht`. Same ruling as §2c: the standard verbal noun `tosú` is used. Normalised in
the closing sweep.

---

## 3. Open questions for a Donegal speaker

Listed here as they are found, so the speaker gets a single ranked list rather than a hunt.

1. **`cha` vs `ní` as the default negative** — the headline decision. See §1d.
2. **`cha bhfuil` vs `chan fhuil`** for "is not" — FGB shows the second, Wikipedia gives the first
   as the Gweedore form.
3. **`-óch-` futures**: does the standard-spelling rule of §0 survive here, or is `tosóchaidh` the
   right thing to write?
4. **`tchí` in writing** — universally spoken in Donegal, but is it right to put in a written
   course line, or is it a phonetic spelling that §0 would exclude?
5. **`ábalta` vs `tig le`** — both are Donegal; which does the course teach for "can/able to", and
   is the split by meaning?
