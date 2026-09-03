# Register additions — worker D45a, seeds 56–61 of `gle_cn_for_eng`

Filed under Addendum §G. **Never edited the shared register directly.** These are the tiles this
band introduced that a later band could plausibly pick the other way. All mirror their own seed's
already-audited translation (A3) — this band re-translated nothing.

Corpus counts below are Ó Curnáin, four volumes, via `tools/gle-cn/ocurnain-probe.py`, controls
passing (Gaeilge 121 / duine 521 / bhí 3133).

| English gloss | Irish tile | first at | authority | confidence |
|---|---|---|---|---|
| so I can | `le go mbeidh mé in ann` | S56 | `le go` purposive = **100** in corpus; `in ann` live since S10 | best attempt |
| how to say | `cén chaoi a ndéarfaidh mé` | S56 | seed translation, pre-existing; **see Conflict A** | genuinely uncertain |
| a few words | `cúpla focal` | S56 | Ó Dónaill; ordinary | confident |
| I can't | `níl mé in ann` | S57 | negative of the live `in ann` frame | confident |
| what I wanted | `an rud a bhí mé ag iarraidh` | S57 | mirrors live `bhí sé/sí/muid ag iarraidh` (S52–54) | confident |
| it's interesting | `tá sé suimiúil` | S58 | `suimiúil` live since S51, `tá sé` since S28 | confident |
| when you understand | `nuair a thuigeann tú` | S58 | `tuigeann` **23** in corpus — the present of *tuig* is real, unlike *labhair* (A9) | best attempt |
| enough words | `do dhóthain focla` | S58 | `dhóthain` **51**; **see Note B — possessive-bound** | best attempt |
| I know | `tá a fhios agam` | S59 | `a fhios agam` **6**; Ó Dónaill's own frame | confident |
| how to do | `cén chaoi a ndéanfaidh mé` | S59 | seed translation, pre-existing; **see Conflict A** | genuinely uncertain |
| what I need to do | `an rud is gá dom a dhéanamh` | S59 | positive of the live `ní gá dom` (S45) | best attempt |
| next week | `an tseachtain seo chugainn` | S59 | mirrors live `an tseachtain seo caite` (S52); already at S277 with the same Irish | confident |
| I don't know | `níl a fhios agam` | S60 | negative of S59; **see Conflict C** | confident |
| enough different words | `dóthain focla difriúla` | S60 | bare `dóthain` after a verbal-noun object — the unpossessed use | best attempt |
| yet | `fós` | S60 | already live as a component at S88 with the same Irish | confident |
| could you | `an mbeifeá in ann` | S61 | `mbeifeá` 2 + `bheifeá` 1 — 2sg conditional of *bí* is attested | best attempt |
| to say that | `é sin a rá` | S61 | ordinary fronted object | confident |
| again | `aríst` | S61 | **169** in corpus, `arís` never written in this band (R1/A10) | confident |
| a little more slowly | `beagán níos moille` | S61 | `níos moille` 1 — above the noise floor; `beagán` live since S9 | best attempt |

**No preposition was split off as its own tile (A2).** `do dhóthain focla`, `cuimhneamh ar fhocal`
and `an rud is gá dom a dhéanamh` each keep their preposition/possessive inside the tile. This band
wrote no English gloss for a bare preposition.

---

## Conflict A — the `cén chaoi` embedded clause is now TWO Irish forms for one English family

Not a new instance and not this band's choice: seeds 56, 57, 59 and 60 were **already translated**
with `cén chaoi a ndéarfaidh mé` / `cén chaoi a ndéanfaidh mé`. A3 says decomposition mirrors its own
seed, so that is what was banked, and every instance carries `<!--HOWTO-OPEN-->`.

But the live course already teaches the *other* form. **36 practice phrases across seeds 3–13** use
`cén chaoi` + a bare verbal noun:

- S4  "how to say something" → `cén chaoi rud eicínt a rá`
- S6  "how to remember a word in Irish" → `cén chaoi cuimhneamh ar fhocal i nGaeilge`
- S10 "I'm not sure how to say something" → `níl mé cinnte cén chaoi rud eicínt a rá`

So the same English family now maps to two Irish structures. The submit gate did **not** stop this:
it only holds out a phrase whose *English is byte-identical* to a live one, so the two forms sit side
by side invisibly. It surfaced exactly once, as a held-out phrase on "how to say something".

Neither form is attested: `a ndéarfaidh mé` and `a ndéanfaidh mé` are **0** in the corpus, and
Addendum §B2 already records `cén chaoi` + verbal noun as 0 of 76. **This is a translation-side
sweep, not a decomposition fix**, and it is Kai's open call (§B2), so it is reported rather than
decided.

## Note B — `dóthain` is possessive-bound, and a naïve sweep will break it

`do dhóthain focla` is literally *"your fill of words"*. The corpus agrees the possessive agrees with
the subject: `do dhóthain` **22**, `mo dhóthain` **12**, `a dhóthain` **5**. So the S58 tile is only
correct with a **second-person** subject.

Every S58 practice sentence was therefore written with *you* as the one who understands. **A later
pass that swaps the subject to "I" must also change `do dhóthain` → `mo dhóthain`,** or it produces
"I want to say YOUR fill of words". Flagged here because nothing in the gates can catch it.

S60's bare `dóthain focla difriúla` is the unpossessed use after a verbal-noun object and is left
as its seed has it.

## Conflict C — "I don't know" now has two Irish forms

S60 introduces **"I don't know" → `níl a fhios agam`** (knowing a fact), which is what its own seed
sentence says. The live course already has a lego at **S85: "I don't know" → `níl aithne agam ar`**
(knowing *people*, from "I don't know those people").

Both Irish forms are correct for their own sentence; the **English gloss is the defect** — it is
doing double duty. The precheck did not catch it because its ZUT comparison does not look forward to
higher-numbered seeds, and S85 is numbered above S60.

**Recommended repair (not applied — S85 is outside this band):** re-gloss the S85 lego so the
English distinguishes acquaintance from fact, e.g. teach *"I don't know those people"* as one unit
at S85 and leave the bare gloss *"I don't know"* to `níl a fhios agam`.
