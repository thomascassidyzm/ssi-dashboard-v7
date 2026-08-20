# Connemara — decomposition band 248–273, coordinator report

**Course `gle_cn_for_eng`. Night of 20–21 August 2026. Decomposition only — no translation was
touched, no seed target text was rewritten.**

`course_audio` = **0 rows before and after**. No TTS was called, no audio pass was queued, nothing
was spent. `gle_for_eng`, `gle_ul_for_eng` and `gle_mu_for_eng` were not touched.

---

## What was found on arrival

Seed **247 was already banked** (1 lego, 10 phrases) by another job, so the open range was
**248–273, twenty-six seeds**. The coordinator took 248–254 and dispatched three workers on
contiguous sub-bands (255–261, 262–267, 268–273) so that each worker's own earlier seeds are
available as vocabulary to its later ones.

The band was built against a **moving frontier**. Between two runs of the pre-checker on a single
seed, other workers banked seeds 98, 112, 221 and 222. That is not a hazard to guard against once —
it has to be re-checked immediately before every POST. See "What surprised me" below.

---

## Seeds 248–254 (coordinator) — banked

| seed | new teaching units | confidence |
|---|---|---|
| 248 | `go raibh an scannán` · `bhí mé ag cheapadh` · `go dona ar fad` · `mo chuid airgid ar ais` | confident, except `go dona ar fad` (best attempt) |
| 249 | `go gcabhrófá liom` · `sula dtéann tú` | confident |
| 250 | `a inseacht dom` · `sula dtugaim freagra` | best attempt on the gloss of `a inseacht dom` — see below |
| 251 | `go dtí` | confident |
| 252 | `cén uair a bheidh tú` · `réidh le tosú` | confident |
| 253 | `ba cheart dom a bheith` · `faoi cheann cúpla nóiméad` | confident (`faoi cheann` is the C2 ruling) |
| 254 | `ó mhaidin` | confident |

**14 legos, 112 practice phrases.** Every seed passed the pre-checker clean before it was posted;
nothing was written to the database by any route other than `/api/seed/complete`.

Checkpoint over 248–254: translated 7/7, decomposed 7/7, legos 14, phrases 112, audio 0 — the
tool's five machine checks pass. (a) no word used before its introduction — the vocabulary gate is
chunk-level DP tiling, not word matching, so this is enforced rather than eyeballed. (b) no bare
frames — every unit is a contiguous span of its own seed sentence. (c) no preposition split off
with an invented gloss. (d) every unit mirrors its own seed sentence. (e) zero hits for
`labhraím`/`labhraíonn`, `as Gaeilge`, `amárach`, `éigin`, `táimid`, `cad`, `ag iarracht`, `chun`,
`ag dul a`, `i gceann` across all 112 phrases. (f) the English was written by hand from the
introduced-gloss list; noted strains are listed below. (g) audio 0.

---

## The two open items — both zero in this band

- **"try": 0.** No seed in 248–273 contains *try* or *trying*, checked against the English of all
  26 seeds, not by eye. I wrote no `iarracht`, no `ag iarracht`. Every `ag iarraidh` in the band is
  *want*. **Size the sweep with 0 from 248–254**, and with whatever the three sub-band workers
  report for 255–273.
- **"how to": 0.** No seed in the band says *how to*; no new `cén chaoi` was created.

**"going to"**: one instance in the band, seed 270, already translated as `ag goil a bheith
deireanach` — the A1 form, object not fronted. No `chun`-future was written anywhere.

---

## Decisions I had to make, annotated

**1. `a inseacht dom` vs the live `inseacht dom` — a real ZUT collision, resolved by syntax.**
Seed 222 (banked by another worker while I was working) teaches **"to tell me" → `inseacht dom`**,
the bare verbal noun after `ag iarraidh`. Seed 250's sentence needs the *fronted-object* form,
`rud eicínt eile **a** inseacht dom`, and the `a` particle has to live inside a tile — splitting it
off and glossing it would be exactly the defect that manufactured *"remember about the whole
sentence"*. But `"to tell me"` was already taken, so the gate refused my lego.

I banked it as **"tell me" → `a inseacht dom`**, which is honest (the English of the seed is *can
you tell me something else*, with no *to*) and distinct from seed 222's *to tell me*. **This is
still a soft ZUT wobble: two Irish forms for one English meaning, conditioned by whether the object
is fronted.** The course already contains the same alternation — seed 161 teaches
**"to give me" → `a thabhairt dom`** with the particle attached. **The clean resolution is a ruling
that the `a`-form is the citation form and seed 222 is the exception**; that is above my pay grade
tonight. Flagged for a surgical sweep: it is one lego and one seed.

**2. Seed 249 uses `cabhrú`, which ruling C2 says should be `cúnamh do`.** The translation
`Tá mé ag iarraidh go gcabhrófá liom` was already banked and audited, and I was told not to
re-translate, so I decomposed what was there. **But the course now holds both**: `cúnamh dhom` and
`as cúnamh dhom` are live as taught chunks, and `cabhrú` / `teacht agus cabhrú` are live too. C2
was decided on Ó Curnáin frequency (`cúnamh` 42, `cabhrú` 1) and it is being broken by seeds that
were translated before it landed. **This is a translation-side sweep, not a decomposition one**,
and it is bigger than seed 249 — it needs whoever owns the register to run it across the whole
translated 300.

**3. Seed 253 and `faoi cheann`.** Applied as ruled. `faoi cheann cúpla nóiméad` for *in a few
minutes*, never `i gceann`. Confident.

**4. Seed 251's English strains under the vocabulary ceiling.** *"I don't want to relax until after
we finish"* and *"I'd like to speak Irish until after we finish"* are grammatical but not sentences
anyone says. With only `go dtí` new and the palette otherwise fixed, the alternatives were worse.
Labelled **best attempt**; a later variety pass should replace two of the five.

---

## Show a Connemara speaker these first

1. **Seed 250, `rud eicínt eile a inseacht dom`** — is the fronted-object `a` form what a Carna
   speaker says here, or would they say `inseacht dom rud eicínt eile`? The answer settles the ZUT
   collision above and it settles seed 222 with it.
2. **Seed 248, `go dona ar fad` for *complete rubbish*** — literally *entirely bad*. Is there a
   idiomatic Connemara way to dismiss a film outright? This is the one gloss in my seven that is a
   translator's approximation rather than a lexical match.
3. **Seed 251** — T5 already flagged this translation as *genuinely uncertain*
   (`go dtí tar éis dúinn críochnú`, two stacked register prepositions). Decomposing it did not make
   it better. If a speaker would simply say `go dtí go gcríochnóidh muid`, the seed should be
   re-translated and this decomposition rebuilt; it is one lego and eight phrases.
4. **Seed 249, `go gcabhrófá liom`** — see decision 2. Ask which of `cabhrú le` and `cúnamh do` a
   speaker uses for *help me*, because the course is currently teaching both.

---

## What surprised me

**1. The pre-checker did not reproduce the known-side gate, and the known side blocks.** Seed 253
passed every local gate and was then rejected by the route for the English prompt *"I won't be able
to finish in a few minutes"* — `won't` tokenizes to an unknown gloss `wo`. That is a full round trip
lost to something that was checkable offline, and every worker on the band would have hit it.
**I added the gate to the shared pre-checker**, mirroring the route's own context builder, so it now
reports `KNOWN-VOCAB` errors locally. It also surfaces the non-blocking construction advisories,
which are worth reading: seed 254's own English (*I've been ready since this morning*) trips the
`have` machinery advisory, because the perfect has never been licensed in this course's contract.

**2. The LEGO syllable cap for this course is 8**, and it is tight enough to force decomposition
decisions. `rud eicínt eile a inseacht dom` is 9 and was refused — which is what pushed seed 250
into the ZUT collision above rather than letting me bundle my way past it.

**3. The frontier moves under you mid-seed.** Seeds 98, 112, 221 and 222 were banked by other
workers between two runs of my own pre-checker. That turned one of my legos into a duplicate
(seed 98 had already taught `rud eicínt eile`) and one of my phrases into a ZUT collision against a
phrase that did not exist when I wrote it. **The pre-checker must be re-run immediately before every
POST, not once when the seed is drafted** — I have written that into the band brief.

**4. The machine vocabulary gate is stricter than the word list makes it look, and that is good.**
It is a chunk-level DP tiling against whole taught legos and components, not a bag of words. It
refuses `go raibh sé deas` outright, because `sé` alone was never taught as a chunk. This is R5
actually enforced rather than eyeballed, and it is the reason seed 248 ended up teaching
`go raibh an scannán` as a unit instead of a `go raibh` fragment.

---

## Sub-bands 255–273

Dispatched to three workers on contiguous ranges — 255–261, 262–267 and 268–273 — each holding the
same ZUT sheet so that *ready*, *idea*, *friend* and *my father* cannot be picked two ways across a
sub-band boundary. Their results are reported separately.
