# Register additions — decomposition band 68–73, `gle_cn_for_eng`

Worker D45c, 21 Aug 2026. Sub-band of the 52–73 band register
(`docs/gle-cn/band-register-D45-52-73-2026-08-20.md`). Translations were already live and audited;
this band only decomposed. Nothing here re-translates a seed.

**Never edit the shared register directly (Addendum §G). Coordinator merges this file.**

---

## Tiles introduced by seeds 68–73

| English gloss | Irish tile | seed | confidence |
|---|---|---|---|
| what are you | `céard atá tú` (comp: *what's* → `céard atá`) | 68 | confident |
| looking for | `a chuartú` | 68 | confident |
| he didn't want | `ní raibh sé ag iarraidh` | 69 | confident |
| to look after the dog | `aire a thabhairt don mhadra` | 69 | confident |
| young | `óg` | 69 | confident |
| all afternoon | `ar feadh an tráthnóna` | 69 | confident |
| she didn't want | `ní raibh sí ag iarraidh` | 70 | confident |
| to tell me | `inseacht dom` | 70 | confident |
| where it was | `cén áit a raibh sé` | 70 | best attempt |
| we didn't want | `ní raibh muid ag iarraidh` | 71 | confident |
| to let anyone | `ligean do dhuine ar bith` (comp: *anyone* → `duine ar bith`) | 71 | best attempt |
| the truth | `an fhírinne` | 71 | confident |
| to hear | `a chloisteáil` | 71 | confident |
| that you're | `go bhfuil tú` | 72 | confident |
| doing | `ag déanamh` | 72 | confident |
| very well | `go han-mhaith` | 72 | confident |
| thank you very much | `go raibh míle maith agat` | 73 | confident |
| I've got more to learn | `tá níos mó le foghlaim agam` (comp: *more to learn* → `níos mó le foghlaim`) | 73 | confident |

`inseacht dom`, `ligean do dhuine ar bith`, `aire a thabhairt don mhadra` and `ag baint taitnimh as`
each carry their verb-demanded preposition **inside** the tile. There is no tile in this band
meaning "to", "for" or "out of" (A2).

`ar feadh an tráthnóna` deliberately mirrors the live S14 tile `ar feadh an lae` ("all day").

## Deviation from the band register, declared

The register row **"I think that" → `tá mé ag cheapadh go bhfuil`** at seed 72 is honoured as the
**Irish**, but not as a single lego. As a lego it is structurally unbuildable — the only complement
taught before seed 72 that can follow `go bhfuil` is S47's own `go bhfuil sé go maith`, so the tile
would have had exactly one legal partner and could not reach 3 BUILD + 5 USE. This is the same dead
end the register itself documents as Conflict 3 at seed 47.

Seed 72 therefore keeps the live S47 tile `tá mé ag cheapadh` ("I think") untouched and adds
`go bhfuil tú` ("that you're") as its own tile. The Irish of the seed sentence is byte-identical to
what the register specifies. ZUT with S47 is preserved.

## Findings for a sweep — none of these are in this band's scope to fix

1. **Real ZUT break: "doing".** S72 (this band, first introduction) teaches *doing* → `ag déanamh`.
   **S100 teaches the same English gloss as `a dhéanamh`.** One known, two targets. S100 is a later
   seed built by another worker; the endpoint's conflict check only looks at *earlier* seeds
   (`seed_number <` current), so neither worker could see the other. A translation-side call is
   needed on which frame each belongs to.

2. **Three benign duplicate introductions**, same known and same target, both marked `is_new`:
   *thank you very much* → `go raibh míle maith agat` at **S73 and S74**;
   *to hear* → `a chloisteáil` at **S71 and S103**;
   *to tell me* → `inseacht dom` at **S70 and S222**.
   In each pair the seed in this band is the **first** occurrence and is correct. The later row
   should be demoted to `is_new=false`. No learner-facing error, but the later seed presents an
   already-taught tile as new.

3. **The endpoint's known-side gate is looser than `checkpoint.cjs`.** Five seed-68 phrases using
   the contraction *"you're"* passed `/api/seed/complete` and were banked, then failed the
   checkpoint — *you're* is not taught until S72. The seed was snapshotted into
   `seed_redo_snapshots`, unbanked, rewritten without the contraction and reposted; the checkpoint
   is now clean. **Any worker who posts without running `checkpoint.cjs` afterwards can bank this
   class of R5 break undetected.** The gate should learn contractions.

## The word for "try" (§B1)

Confirmed by scanning the English and the Irish of every phrase banked in 68–73: **zero** instances.
No seed in this band asks for *try*, and no phrase written here uses `ag iarraidh` under a *trying*
gloss, `iarracht a dhéanamh` or `mo dhícheall a dhéanamh`. **`<!--TRY-OPEN-->` count for this band: 0.**
No `<!--HOWTO-OPEN-->` instances either — the `cén chaoi` seeds are 56–60, outside this band.
