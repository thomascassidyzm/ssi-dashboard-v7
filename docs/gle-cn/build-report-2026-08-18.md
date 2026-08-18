# Connemara Irish — the build has started

`gle_cn_for_eng` exists, the dialect target is set, and a pilot slice has been through
translation → decomposition → validation. **Your live `gle_for_eng` was never touched.**

**Audio spend today: £0.00. No TTS was generated.** No clip was rendered, no voice was
swapped, nothing was deleted. Projected render cost for the full build is in §7 — please
read that number before I commit to it.

---

## 1. What got built

| | |
|---|---|
| New course | **`gle_cn_for_eng`** — "Connemara Irish for English Speakers" |
| Visibility | `status=draft`, `new_app_status=not_available` — **no learner can see it** |
| English seed corpus loaded | **668 / 668**, no gaps |
| Seeds translated to Connemara | **20** |
| Seeds decomposed and banked | **4** (seeds 1–4) |
| LEGOs | 12 · **Practice phrases** 64 |
| Rejected by validation before landing | 9 submissions across 5 error classes |
| Audio generated | **0** |

Every banked seed passed the course-builder's own atomic gate — tiling, ZUT, target
vocabulary, known-side controlled language, phrase counts, anti-template.

**Why 4 and not 20.** The pilot found three real forks (§4) and one of them made me
un-bank and rebuild a seed. I stopped at the point where the rails are proven rather
than spending the day producing seeds that a later ruling would redo. The 20
translations are banked and reviewed; the decomposition of 5–20 is the next run.

---

## 2. The dialect decision, and the evidence

**Target: Connemara. The governing line I set —**

> **Orthography = An Caighdeán Oifigiúil. Grammar and lexis = Connemara.**

So `chuile`, `céard`, `cén chaoi`, `tada`, `muid` are IN — they are Connemara *words*,
and Connacht writers spell them that way. `aríst`, `'bhfuil`, `a'` are OUT — they are
respellings of words that have a standard form, and a learner taught `aríst` cannot look
up `arís`. It also keeps the existing TTS voices on spelling they were trained on, which
matters because you deferred voices.

### The census — 63 markers, not 9

I ran a marker census over the **whole** native base course: 15,904 items, 608,947
characters of Irish. **Calibrated first:** against the known positive `céard` it returns
**644**, matching the figure the earlier pass reported, and `cad` **0**. A plain word-boundary
regex splits accented Irish words and miscounts, so the counter treats `á é í ó ú` and
apostrophes as letters.

**What was already known held up.** Munster verb morphology is a true zero across the
base: `táim` 0, `nílim` 0, `bhíos` 0, `chuas` 0, `dheineas` 0, `ansan` 0, `ana-` 0,
`fé` 0, `in aon chor` 0, `faic` 0, `garsún` 0, `prátaí` 0. Ulster is zero on every marker
tested. Her text is not Munster.

**What nobody had tested for, and it matters:**

| Found | Count | Why it matters |
|---|---|---|
| **`conas`** | **276 items** | This is the **Munster** word for "how" — and it is the base's word for "how". Base seed 21 teaches the LEGO `how → conas` outright and 275 items inherit it. Connemara says `cén chaoi`, which appears **0** times. |
| `táimid` | 22 items | Synthetic 1st-plural, from one lego at base seed 274. Connemara is analytic `tá muid`. |
| `chuile`, `cén chaoi`, `breathnaigh`, `gasúr` | **0 each** | The positive Connemara lexis is simply absent. |

I read all 276 `conas` hits rather than trusting the count — every one is the
interrogative: `Conas a mhothaíonn tú?`, `Conas tá tú?`, `conas Gaeilge a labhairt`.

**The honest reading of the base: Connacht-leaning by not being Munster, rather than
Connemara by choosing Connemara forms.** That is exactly the gap you asked me to close,
and it is now closed *before* a word of Irish was written, not after.

The new course's 20 seeds carry `cén chaoi` ×2, `tá muid` ×1, `chuile` ×1, `céard` ×3,
`in ann` ×1, `ag iarraidh` ×8 — and **0** forbidden forms.

**The gate is calibrated, not asserted:** 9 known Munster/Ulster positives all fire;
12 known-clean sentences stay clean, including the embedding traps `cadás`, `canadh`,
`chara`, `domhan` that a naive substring match would flag.

---

## 3. What I carried over from the base, and what I did not

The base's English→Irish pairs are loaded as a **translation memory — 15,627 distinct
English strings** — and consulted for every seed, so a native speaker's choice is the
default and a fresh translation has to justify itself.

**Carried over:** the analytic register (`tá mé` 1,858 / `níl mé` 299), `céard`,
`ar bith`, `tada`, `in ann`, `ceapaim`, `ag iarraidh` for "want" (2,707 against
`teastaíonn` 21), the object + `a` + verbal-noun word order, and her seed and lego
translations wherever the marker checklist passes. Seeds 1, 13 and 19 are **her Irish,
character-identical**.

**Deliberately not carried over:** `conas` and the 276 items built on it · `táimid` ·
`teastaíonn` for "want" · her `níl fhios agam` spelling (→ `níl a fhios agam`) ·
`níos deireanaí` for "later on" (→ **`ar ball`**, which is her own choice elsewhere and
more Connemara than mine was) · and `labharófá`.

**On `labharófá` — a defect in the base worth your attention.** `labhair` syncopates: the
base itself writes `labhraím`/`labhraíonn` **258 times** with the stem `labhr-` and never
once writes `labharaíonn`. But in the conditional it writes `labharófá` **46 times**, all
inherited from one lego at her seed 7. A form that syncopates in the present cannot
un-syncopate in the conditional. The correct form is **`labhrófá`**, which is what the new
course uses. All 46 base items carrying it are contaminated.

---

## 4. What the pilot found — the three forks

**F1 — Chunking too big blocks reuse, and it bites immediately.** I first banked "how to
speak" as one chunk `cén chaoi le labhairt`. Seed 4 then needed "how to *say*" and the
validator correctly refused: `cén chaoi le` had never been taught as a separable piece. I
un-banked seed 3 (snapshotted, undoable) and re-split it. **Rule adopted: never chunk a
function word into a lexical lego if the function word will recombine.**

**F2 — Irish initial mutation versus the word-containment validator.** The validator does
exact word matching with no mutation awareness, so lego `foghlaim` is rejected inside the
perfectly correct `Gaeilge a fhoghlaim`. **I expected this to be a serious structural
problem and measured it instead of asserting it — it is not: 44 of 13,455 base phrases,
0.3%.** It bites only where a lego is a bare verbal noun that will later be fronted. The
fix is a decomposition rule, not a code change: **teach verbal-noun legos in their
object-fronted form** ("to speak Irish" → `Gaeilge a labhairt`), which is also the commoner
real-world shape.

**F3 — Early seeds are structurally thin, and this is why the live course is thin too.**
The validator's phrase requirements *escalate* with accumulated vocabulary: seed 1's second
lego needs 1 USE phrase, seed 4's needs 5. So seeds 1–3 bank at 5.3 phrases per lego against
a floor of 7, and `quality` reads **FAIL** for the course right now. It is not a defect in
my seeds — it is that seed 1 has almost no vocabulary to build sentences from. **Seeds 1–3
must be deliberately backfilled once vocabulary exists.** I think this is the mechanism
behind the live course's 50.8% empty rounds, and it will recur unless we plan for it.

---

## 5. A finding that corrects my own hypothesis

I told a reviewer I suspected the base's 13,455 practice phrases were mechanical filler —
`Conas tá tú?`, `Conas bhfuil tú ag foghlaim?` are ungrammatical, missing their particles.

**I was wrong, and the number is much better than I feared.** A calibrated four-detector
pass over all 13,455, with every raw hit hand-adjudicated rather than sampled, found
**107 confirmed defects — 0.80%. 99.0% pass clean.** Damage is concentrated, not uniform:
only 46 of 511 seed-families contain any flagged phrase. Seeds and legos are **completely
clean** — 0 of 511 and 0 of 1,938.

**So her practice layer is a genuinely valuable asset, not filler**, and the fact that only
1.8% of it survived into the live course is a real loss rather than a lucky escape. Two
false-positive traps were caught and excluded during calibration (the frozen idiom
`ar maidin`, 42 spurious hits; and `go` as preposition vs complementiser). Honest caveat
from that worker: 0.80% is a **floor, not a ceiling** — a spot-check of *unflagged* phrases
turned up a further defect type no detector covers.

Full report: https://watson-1.tail4968cb.ts.net/d/6788df88

---

## 6. YOUR LIST — what I think should improve, for you to rule on

**Ready for your call now (I have deliberately not decided these — they are taste):**

1. **`cén chaoi le` + verbal noun for "how to"** (seeds 3, 4). Structurally it is exactly
   her pattern with the Munster word swapped out. But object-less `cén chaoi le labhairt`
   is the thin case — with no object there is nothing for `le` to bind to. A native ear
   should settle it.
2. **"try" splits into two Irish forms** — `ag triail` (seeds 2, 6) and `iarracht a
   dhéanamh` (seeds 7, 8). **This is the one real predictability hazard in the twenty.**
   She avoided it by reserving `iarracht a dhéanamh` for the English word "attempt". If we
   keep both, the second lego must be glossed "to make an effort", never "to try", or a
   learner cannot choose. **Your ruling shapes hundreds of later phrases.**
3. **`chomh dian` for "as hard as I can"** (seed 7) — zero support in her corpus; `dian`
   leans "strenuous". `chomh crua` is the commoner collocation. Also `Tá mé ag iarraidh
   iarracht…` is echoic to the ear.
4. **`ar feadh an lae` for "all day"** (seed 14) — grammatical, but `ar feadh` frames a
   bounded stretch where "all day" here is habitual. `i rith an lae` reads better.
5. **`a ainm a fhoghlaim` for "learn his name"** (seed 20) — clean grammar, but `foghlaim`
   fits skills, and "learn someone's name" is usually `a fháil amach cén t-ainm atá air`.
   Keeping `foghlaim` protects the ZUT lock; that is a trade, not an obvious win.
6. **Clause order in seed 8** — a full relative clause carried in front of `a mhíniú` is
   heavy; her lighter clause-final order is easier to hear.
7. **`éigin` vs `eicínt`** — I used standard `éigin`. Connemara speech is `eicínt`. My
   orthography line says `éigin`; if you want the course to *sound* Connemara more than it
   *reads* standard, this is where you'd move the line.

**Structural improvements I recommend:**

8. **Mine her practice layer properly.** 13,320 clean native phrases exist and 1.8% of them
   reached learners. This is the largest single quality lever available and it is free.
9. **Backfill seeds 1–3 deliberately** (F3) — otherwise the new course inherits the old
   course's thin opening, in the exact stretch where your median learner sits.
10. **Fix `labharófá` estate-wide**, not just here — 46 contaminated items.
11. **Ratify the dialect spec as the course's pair contract** so the gate runs on every
    future submission rather than only when I run it.

---

## 7. Spend, and the number you should see before I go further

**Spent today: £0.00.** No TTS. No deletions.

**Projected for the full 668-seed build — this is materially larger than a routine render
and I am not committing to it without you.** The live Irish course holds **25,308 clips**
for 300 built seeds. A 668-seed build at the same density is **roughly 56,000 clips**, and
the practice layer we are deliberately making *denser* than the live course pushes that up,
not down. **I have not costed this per-clip against actual Azure billing, so treat ~56,000
clips as the unit of decision, not a price.** I will produce a real costed plan, with a
per-clip figure derived from our own recent billing, before a single clip is rendered.
Nothing gets generated until you approve that plan.

---

## 8. Gaps — things I could not settle

- **No native Connemara speaker has seen any of this.** Every dialect and naturalness
  judgement rests on my own knowledge plus her corpus. Items 1, 3, 4 and 5 above are
  exactly the ones a native ear should settle, and I cannot substitute for one.
- **No external corpus, dictionary or web access** was used. `chomh minic`, "all day" and
  "this evening" return **zero** hits in her corpus, so my calls on seeds 3, 14 and 18's
  time adverbial are unsupported by any evidence at all.
- **The 0.80% base-phrase defect rate is a floor, not a ceiling** (§5).
- **TTS behaviour on `labhrófá`, `chuile dhuine`, `cén chaoi` is unverified** — no audio was
  generated, so the claim that standard orthography protects pronunciation is a *reason*,
  not a *measurement*.
- **The course code `gle_cn_for_eng` is my choice**, following `cym_n`/`cym_s`. It needs no
  code change to work — I verified it resolves to "Irish", family "celtic", and inherits the
  English pair contract. Say if you want it named differently; renaming is cheap now and
  expensive later.
- **Seeds 5–20 are translated and reviewed but not yet decomposed.** 648 seeds are still
  untranslated. This is a start, not a finished course.
- The untaught-word gate **was calibrated on this course, not assumed**: a deliberate probe
  using "my brother tomorrow" was correctly blocked on both the English and Irish sides.
  Irish is Latin-script, so the checker's English-letters-only limitation does not bite here.
