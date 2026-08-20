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

- IN: `fosta`, `achan`, `uilig`, `caidé`, `domh`, `ábalta`, `amharc`, `dada` — every one of these is
  an Ó Dónaill headword (probes in §2).
- OUT: `aríst` → `arís`, `a'` → `ag`, `'bhfuil` → `an bhfuil`, `goidé` → `caidé` (see §1e).

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
| what | `caidé` | `céard` | `cad é` | FGB headword: `caidé = cad é` |
| how | `cad é mar` / `caidé mar` | `cén chaoi` | `conas` | Wikipedia Ulster Irish; §2 |
| also | `fosta` | `freisin` | `freisin` | FGB: `fosta 2, adv. Also.` with 4 examples |
| every | `achan` | `chuile` | `gach aon` | FGB headword: `achan = gach aon` |
| all (the lot) | `uilig` | `ar fad` | `uile` | FGB headword: `uilig = uile` |
| able to | `ábalta` | `in ann` | `in ann` | FGB: `ábalta, a3. Able, capable. ~ (ar) rud a dhéanamh` |
| look / see (vb) | `amharc` | `breathnaigh` | `féach`/`amharc` | FGB full entry; Wikipedia gives W. Ulster `amhanc` |
| sees | `tchí` / `tchíonn` | `feiceann` | `feiceann` | Wikipedia: `tchíom` "I see", independent form only |
| to me | `domh` | `dom` | `dom` | FGB headword: `domh = dom` |
| we are | `tá muid` (analytic) | `tá muid` | `táimid` | FGB `muid`: "Tá, bhí, bheadh, ~" |
| we (pron.) | `muid` | `muid` | `muid`/`sinn` | as above |
| think | `síleann` / `sílim` | `ceapann`/`ceapaim` | either | FGB `síl 1`: "~im go bhfuil an ceart agat" |
| nothing | `dada` | `tada` | `dada`/`tada` | FGB `dada` full entry with negative examples |
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

**This section is PROVISIONAL pending the measured ruling from job #536**, which is counting
`cha`/`chan`/`char` against `ní`/`níor` in running Donegal text. What is already established from
Ó Dónaill's `cha` entry and the Wikipedia Ulster Irish article:

- `cha` lenites b c f g m p s, eclipses d and t; `chan` before a vowel or before `f`+vowel;
  `char` with the past tense of regular verbs; `char`/`charbh` with the copula.
- In **Gweedore specifically**, `cha` eclipses all consonants *except* `b-` in forms of the verb
  "to be", and sometimes `f-`.
- `cha` **cannot take the future tense** — the present habitual carries future meaning after it.
- FGB shows `cha` in ordinary declarative negation, not only in retorts:
  *Chan fhuil sin ceart* · *Char ith sé é* · *Cha bhíonn do dheifir ort*.
- `cha` is commonest in the **north** of the Donegal Gaeltacht — which is where Gaoth Dobhair is.

**The overapplication trap, which holds whichever way #536 rules.** `cha` is an *independent-clause*
particle. It does **not** replace:
- subordinate "that…not" → `nach` / `nár`, never `cha`
- negative relative clauses → `nach` / `nár`
- negative questions → `nach bhfuil…?`
- negative imperative → `ná`

A translator who swaps every English negative for `cha` will produce confidently wrong Irish.

### 1e. `caidé`, not `goidé`

Both are Ó Dónaill headwords and both resolve to `cad é`. `goidé` is the older Rann na Feirste
literary spelling (Ó Grianna writes it); `caidé` is the modern Donegal standard-orthography spelling
and is what Donegal writers and Ulster-dialect journalism use today. **Use `caidé` uniformly.** This
is a consistency decision, not a correctness one — either would be defensible, but mixing them
across 668 seeds would not be.

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
  `Ar thoisigh mé?` — never a bare verb after the question word.
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
