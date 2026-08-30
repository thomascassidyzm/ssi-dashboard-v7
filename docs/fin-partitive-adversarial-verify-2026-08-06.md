# fin_for_eng — negation + object case: adversarial verification

**Read-only. No data changed.** Pulled all **14,036** `course_practice_phrases` rows for `fin_for_eng` with the **SERVICE key** (`SUPABASE_SERVICE_KEY`, `sb_secret_…`) — not the anon key.

---

## 1. The two proposed fixes

### `S0057L01U06` — "mä en muista sen nimen" → **"sen nimeä"**
**CONFIRMED.** The negation→partitive rule for direct objects is absolute in Finnish — every register, every dialect: a negated clause cannot take a total (genitive-accusative) object, so `nimen` is ungrammatical here and `nimeä` (nimi : nimen : **nimeä**) is the only possible form. I tried to refute it via the colloquial register and could not: spoken Finnish *drops* final -n (mun nimi, sen kaa) and drops the possessive suffix (`sen nimeä`, not `hänen nimeään`) — it never *adds* accusative -n under negation. The course's own sibling `S0057L01B03` and `S0057L01U02` already say `sen nimeä`, and `nimeä` appears **15×** in the course against **0** for the colloquial variant `nimee`.

### `S0589L01U04` — "mä en oo nähnyt bussin" → **"bussia"**
**CONFIRMED.** Same rule under a negated perfect: `en oo nähnyt` demands a partitive object, so `bussia` (bussi : bussin : **bussia**). The seven non-negated siblings in the same lego (`mä nään bussin`, `ootko sä nähnyt bussin?`, `mä haluun nähdä bussin`) are all correctly accusative — this is precisely the one phrase where the case must flip, which is the classic shape of this error. `bussia` is attested **10×** elsewhere in the course (incl. `mä odotan bussia`) and the hyper-colloquial `bussii` **0×**, so `bussia` is also the right register.

**The one genuine limit on the rule** (neither case is affected): -n forms that are *not* direct objects survive negation fine — duration accusatives (`mä en haluu olla täällä koko päivän`, `mua ei haittaa odottaa hetken`), genitives before postpositions (`sun kaverin kanssa`, `ruohon poikki`), and predicate nominatives (`se ei oo punainen`). Both flagged words are true direct objects of `muistaa` / `nähdä`, with no head noun and no postposition.

---

## 2. Independent recall check — **one additional hit, 3 phrases**

I deliberately did not reuse the clause-splitting method. Mine was: (a) a **corpus-oracle** pass — for every -n token in a negated phrase, ask whether a partitive sibling of the same stem is attested anywhere in the course; then (b) an **exhaustive** pass — every distinct -n token appearing after a negation cue in all 2,376 negated phrases (**189 distinct tokens**), each read by hand rather than filtered by rule. I also ran a completeness check on the negation cues themselves (no unlisted negative forms exist in this corpus), a pass over -n tokens sitting *before* the negation verb, and a scan of all 332 legos whose bare-noun citation card is rendered as an -n form.

### High confidence — seed 523, "an excuse"

| id | known_text | current target_text | proposed |
|---|---|---|---|
| `fin_for_eng:S0523L01U01` | I don't want to give an excuse | mä en haluu antaa tekosyyn | mä en haluu antaa **tekosyytä** |
| `fin_for_eng:S0523L01U02` | you shouldn't give an excuse | sun ei pitäisi antaa tekosyyn | sun ei pitäisi antaa **tekosyytä** |
| `fin_for_eng:S0523L01U04` | I don't want to find an excuse | mä en haluu löytää tekosyyn | mä en haluu löytää **tekosyytä** |

Same rule: the object of an infinitive under a negated main verb goes partitive — `tekosyy : tekosyyn : tekosyytä`. `tekosyytä` currently appears **0×** in the course, so nothing here is a copy of an already-correct sibling.

### Possible — out of scope, flagging not claiming
Seed 523's *non*-negated phrases have a related but different problem: `mun pitää antaa tekosyyn`, `sun pitäisi antaa tekosyyn` — a total object of a necessive construction is standardly **nominative** (`tekosyy`), and the lego card `S0523L01B01 "an excuse" = tekosyyn` is a genitive where a citation form should be nominative. Colloquial Finnish does vary here, and it is not a negation error, so I am not asserting it — it wants a separate look by Kai.

### Everything else came back clean
The other 186 -n tokens under negation are all correct Finnish: 1sg verbs (`luulen`, `muistan`, `toivon`), passives (`tehdään`, `puhuttiin`), illatives (`kotiin`, `juhliin`), MA-infinitives (`muistamaan`, `viettämään`), VA-participles (`mikään ei näytä toimivan`), adverbs (`tänään`, `takaisin`, `koskaan`), genitive attributes and postposition genitives, and predicate nominatives. Several near-misses are genuinely fine because the -n object sits in an **affirmative embedded clause** inside a negated sentence — `mä en oo varma, muistanko mä sen nimen / sanan / tarinan / koko lauseen`, `ei oo totta, että kuka tahansa voi voittaa pelin`. Those are correct and must not be "fixed".

---

## Summary
Both proposed fixes **CONFIRMED**, neither refuted. The other worker's sweep was accurate but **not complete**: it missed three phrases in seed 523 (`tekosyyn` → `tekosyytä`), so the true count is **five**, not two.
