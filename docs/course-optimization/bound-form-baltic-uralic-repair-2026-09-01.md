# Baltic & Finno-Ugric bound-form / licensor repair — hun, lit, est

*2026-09-01. Kai's ruling ("Yup, fix all and regenerate") applied to the three Baltic /
Finno-Ugric courses on the cross-course scan
(`docs/course-optimization/bound-form-licensor-scan-2026-09-01.md`). Ten phrase rows and
one LEGO edited in the live DB; 24 clips regenerated and verified. Template: the Italian
repair, `docs/course-optimization/ita-voice-config-repoint-and-s558-2026-09-01.md`.*

---

## Direct answer

**Ten defects fixed across the three courses, all of them the same shape — a case-marked
chunk welded onto a governor that requires a different case. Nine took Kai's clause 2
(correct the case, no licensor to merge toward); one took a known-side correction rather
than a target change, because the course's own attested practice said the English gloss
was what was wrong. No boundary was moved, no LEGO index shifted, no phrase id was
reissued, so no learner-progress migration was needed. 24 clips regenerated in the
courses' own incumbent Azure voices, every one transcribed back and passing.**

No retired-provider hazard: all three courses are configured Azure on all four roles
(`hu-HU-Noemi`/`Tamas`, `lt-LT-Ona`/`Leonas`, `et-EE-Anu`/`Kert`, `en-GB-Sonia` known and
presentation). Nothing was repointed and nothing was deleted.

---

## hun_for_eng (Hungarian) — 4 phrases, 9 clips

### The finding, re-derived

The scan named two isolated LEGOs. My own reading confirms two chunk families, both
dative-marked, welded onto governors that take a different case:

- **`S0052L05` = `a barátjának` "to his friend"** (dative). The LEGO itself is **correct**
  — seed 52 is *Múlt héten egy levelet akart írni a barátjának* ("He wanted to write a
  letter to his friend last week"), and `írni` governs the dative. **The LEGO text was not
  changed**, so its presentation clip still announces the right card and was left alone.
  Three of its practice phrases weld the dative onto verbs that govern something else.
- **`S0025L01` = `nekem` "to me"** (dative), welded onto `találkozni` at one phrase.

The deciding evidence is the course's own attested practice: **seed 51, the seed
immediately before, already maps this exact frame onto the instrumental** —
`hun_for_eng:S0051L05U04` "I meet my friends" → `találkozni a barátaimmal`. Sibling
rows `S0216L02U05` (`a hétvégén találkoztam barátommal`), `S0216L02U06`
(`holnap fogok találkozni barátommal`) and `S0022L02B02` (`találkozni emberekkel`) all do
the same. The course has already decided that *találkozni* takes `-val/-vel`.

### Before → after

| Row | known | was | is now | case |
|---|---|---|---|---|
| `S0052L05U03` | he wants to meet his friend | `találkozni a barátjának` | **`találkozni a barátjával`** | 2 |
| `S0052L05U05` | he/she wanted to speak to his/her friend tomorrow | `holnap akart beszélni a barátjának` | **`holnap akart beszélni a barátjával`** | 2 |
| `S0052L05B03` | ~~go to his friend~~ → **to write a letter to his friend** | `menni a barátjának` | **`levelet írni a barátjának`** | 2 (rebuilt) |
| `S0025L03U03` | meet me before I have to go | `találkozni **nekem** mielőtt mennem kell` | **`találkozni velem mielőtt mennem kell`** | 2 |

**All four are case two — correct the case; there was no licensor to merge toward.** In
each sentence the governing verb is *present and inside the phrase*, and it is the wrong
governor for the stored case: nothing anywhere in the sentence licenses a dative, so no
boundary redraw (clause 1) could reach one. Clause 1 would also have been the expensive
route here — merging `találkozni` into the chunk would have changed the LEGO text and the
lego index.

### The one rebuild, and why

`S0052L05B03` "go to his friend" → `menni a barátjának` is ungrammatical: Hungarian
*menni* takes the allative `-hoz/-hez/-höz`, i.e. `menni a barátjához`. **I did not use
that repair**, because `-hoz` is not attested anywhere in this course at or before seed 52
(first occurrence is `ahhoz`, seed 91; `orvoshoz`, seed 181). Writing it in at seed 52
would introduce an unintroduced case suffix inside the very slot that is supposed to be
drilling the dative — R0.2, and it defeats the LEGO.

So the build phrase was **rebuilt from seed 52's own material**: `levelet` (`S0052L02`
"a letter") + `írni` (`S0052L04` "to write") + `a barátjának` (`S0052L05`). It is correct
Hungarian, it exercises the taught chunk with its true licensor, it uses nothing the
learner has not been given, and it is distinct from its siblings B02 (`írni a barátjának`)
and U01 (`akart levelet írni a barátjának`). Its known text changed, so its known clip was
regenerated too.

`barátjával` and `velem` are both safe on R0.2: the instrumental `-val/-vel` is introduced
one seed earlier (`a barátaimmal`, seed 51, 10 phrases) and `velem` at seed 22
(`velem beszélnek`).

### Audio — 9 clips, all Azure, all passing

| Row | role | voice | transcribed back |
|---|---|---|---|
| `S0025L03U03` | target1 | `azure_hu-HU-NoemiNeural` | pass, CER 0.028 |
| `S0025L03U03` | target2 | `azure_hu-HU-TamasNeural` | pass, CER 0.167 |
| `S0052L05U03` | target1 | `azure_hu-HU-NoemiNeural` | pass, CER 0.087 |
| `S0052L05U03` | target2 | `azure_hu-HU-TamasNeural` | pass, CER 0.044 |
| `S0052L05U05` | target1 | `azure_hu-HU-NoemiNeural` | pass, CER 0.059 |
| `S0052L05U05` | target2 | `azure_hu-HU-TamasNeural` | pass, CER 0.147 |
| `S0052L05B03` | known | `azure_en-GB-SoniaNeural` | pass, CER 0 |
| `S0052L05B03` | target1 | `azure_hu-HU-NoemiNeural` | pass, CER 0.08 |
| `S0052L05B03` | target2 | `azure_hu-HU-TamasNeural` | pass, CER 0.04 |

Nine `content_audio_link_drops` entries, all `nulled-no-same-voice-clip-for-new-text` —
the same-voice relink path had nothing to offer because no clip of the new text existed.
The three unchanged known clips kept their links. Nothing was deleted; the superseded
dative clips are still in place, unlinked.

### Deliberately left alone in hun_for_eng

- **The `-nak` predicative adjective family** — `boldognak` (S0106L03 "happy"),
  `könnyebbnek` (S0122L02), `tökéletesnek` (S0137L02), `barátságtalannak` (S0300L01) — is
  stored case-marked and does appear bare in build fragments (`nagyon boldognak`,
  `ma barátságtalannak`). **Not a defect**: four LEGOs handle it identically, every seed
  supplies the licensor (`tűnni`, `érezni magam`, `lenni`, `hangzik`), and build phrases
  are fragments by design. Four consistent instances is a pattern, not a slip.
- **`S0052L05U04`** "he wanted to give something to his friend" → `valamit akart a
  barátjának`. The dative is correctly licensed by the intended *adni*; the verb is simply
  missing. That is a different defect (elision), not this shape.
- This course has a **general roughness problem well outside this brief** —
  verb-less phrases (`magyarul velem a barátaimmal` for "I speak Hungarian with my
  friends"), `könnyebbnek velem` for "speak easier", and the known side carries
  grammatical tags a learner should never see (`with my friend-instr`,
  `his/her friend-acc`, `unfriendly-dative` — which are, strictly, exactly the
  parenthetical notation Kai has ruled against). Flagged, not touched.
- **O5 not applied.** Seeds 25 and 52 carry `approved_at`, but all 300 approved seeds in
  this course share one identical timestamp (`2026-05-12 10:29:53.09+00`) — a bulk
  release-batch approval, not a human proofread pass. Unapproving on that basis would be
  noise.

---

## lit_for_eng (Lithuanian) — 3 phrases, 6 clips

### The finding, re-derived

The confirmed defect is the **genitive of negation**: Lithuanian moves a direct object from
accusative to genitive under a negated verb, and the negation propagates to the object of a
dependent infinitive. Three phrases under LEGO `S0012L01` (`nenorėčiau` "I wouldn't like
to") weld accusative-marked chunks straight in.

| Row | known | was | is now | confidence |
|---|---|---|---|---|
| `S0012L01U05` | I wouldn't like to remember that word | `nenorėčiau prisiminti **žodį**` | **`…prisiminti žodžio`** | high |
| `S0012L01U04` | I wouldn't like to learn the whole sentence today | `nenorėčiau mokytis **visą sakinį** šiandien` | **`…mokytis viso sakinio šiandien`** | high — *mokytis* governs the genitive independently of the negation, so the accusative was wrong twice over |
| `S0012L01U02` | I wouldn't like to say something wrong | `nenorėčiau pasakyti **ką nors**` | **`…pasakyti ko nors`** | medium-high — propagation across the infinitive boundary is prescriptively required but colloquially variable |

**All three are case two.** No licensor exists to merge toward: the licensor of the
genitive *is* the negation, and it is already inside the phrase, on the salient LEGO. The
LEGO `S0012L01` itself is correct and was not touched, so no presentation clip moved.

The course's own attested practice supports the genitive: `S0035L04U04`
(`ji nenori šią popietę **nieko** skaityti`), `S0069L03U04`
(`nenorėjo … prižiūrėti **jauno šuns**`), `S0260L01U01` (`neturiu **daugiau laiko**`) all
apply it. `ko nors` is taught explicitly at `S0030L05`, glossed "of something (genitive)".

**R0.2 tension, stated rather than hidden.** No genitive form is attested anywhere in this
course at or before seed 12 — the course introduces the genitive at seed 27
(`per daug laiko`) and names it at seed 30. So these three corrections put a genitive in
front of the learner ~15 seeds before the course introduces one. I judged correct
Lithuanian to be worth more than that ordering, but **it is a real cost and Kai may want
these three phrases moved later in the course instead of re-cased.**

### Audio — 6 clips, all Azure, all passing

| Row | role | voice | transcribed back |
|---|---|---|---|
| `S0012L01U02` | target1 / target2 | `azure_lt-LT-OnaNeural` / `azure_lt-LT-LeonasNeural` | pass, CER 0.111 / 0.074 |
| `S0012L01U04` | target1 / target2 | same pair | pass, CER 0.200 / 0.075 |
| `S0012L01U05` | target1 / target2 | same pair | pass, CER 0.107 / 0.036 |

Six drop-log entries, all `nulled-no-same-voice-clip-for-new-text`. Known text unchanged on
all three, so the known clips kept their links.

### ⚠️ GAP — Lithuanian genitive-of-negation is systemic, not isolated

The scan called this "1 confirmed, isolated (~26 seeds spot-checked)". **It is not
isolated.** One broad sweep of the whole course turns up at least a dozen more instances
of the identical defect, well outside the scanned window:

| Row | known | target as it stands | should be |
|---|---|---|---|
| `S0241L01B03` | I don't want to give an answer | `nenoriu duoti **atsakymą**` | `atsakymo` |
| `S0241L01U03` | I don't want to give you an answer today | `nenoriu duoti tau **atsakymą** šiandien` | `atsakymo` |
| `S0241L01U01` | I don't want to give you a film today | `nenoriu duoti tau **filmą** šiandien` | `filmo` |
| `S0241L01B02` / `U02` / `U05` | I don't want to give something (…) | `nenoriu duoti **ką nors** …` | `ko nors` |
| `S0260L01B03` | I don't have an answer | `neturiu **atsakymą**` | `atsakymo` (negated *turėti* always takes the genitive) |
| `S0070L01B03` | she didn't want to tell | `ji nenorėjo sakyti **ką nors** ir` | `ko nors` |
| `S0208L01U02` | I didn't want to say something to you | `nenorėjau tau **ką nors** pasakyti` | `ko nors` |
| `S0211L03B04` / `U04` | they don't want to explain the problem | `nenori aiškinti **problemą**` | `problemos` |
| `S0214L02U04` | we didn't want to discuss the problem at the weekend | `nenorėjome aptarti **problemą** savaitgalį` | `problemos` |
| `S0121L03U02` | she doesn't want to use her car | `ji nenori naudoti **savo automobilį**` | `savo automobilio` |

**I did not fix these, deliberately.** They are one systemic authoring gap, not scattered
slips, and a partial repair of a systemic pattern makes a course *less* internally
consistent, not more. Sizing, sequencing and the R0.2 question above are Kai's call, and
the sweep that would close it (≈15–20 phrases plus audio) is a different job from this
one. The list above is the starting point; it came from a single regex pass and is not
guaranteed exhaustive.

For the avoidance of doubt, these were checked and are **correct** — the genitive does not
propagate across an interrogative or complement-clause boundary:
`nesu tikras ar galiu prisiminti visą sakinį` (S0010L03U01), `nežinau kaip pasakyti ką
nors` (S0060L02U03), `nežinau, ką jis bando pasiekti` (S0222L01U03),
`nežinau, ar pažiūrėjai ką nors` (S0220L01U02). Accusative time adverbials
(`visą dieną`, `šį vakarą`) are also correct as they stand and were left alone.

---

## est_for_eng (Estonian) — 1 LEGO + 3 phrases, 9 clips

### The finding, re-derived

`S0022L02` stores **`inimestega`** — "people" in the **comitative** — as the chunk's base
form, glossed on the known side as bare **"people"**. The comitative is licensed only by
what seed 22 puts in front of it (`kohtuda inimestega`, "to meet with people"). Dropped
where nothing licenses it, it is wrong:

- `S0022L03B02` "people who speak Estonian" → `**inimestega** kes räägivad eesti keelt` —
  a relative-clause head standing in the comitative with **no licensor at all**. This is
  the exact Irish-lenition shape from `gle_cn_for_eng`.
- `S0022L02U04` "I want to find out **about** people" → `ma tahan **inimestega** teada
  saada` — "with people", not "about people"; Estonian wants `inimeste kohta`.
- `S0022L02B01` "people" → `inimestega` — the presentation slot itself, telling the learner
  that `inimestega` means "people".

**The deciding evidence is the course's own attested practice, and it is unanimous:
every other comitative in this course is glossed with English "with".** `sinuga` = "with
you" (S0001L03), `minuga` = "with me" (S0015L02, S0031L02), `kõigiga` = "with everyone"
(S0016L03), `kellegagi teisega` = "with someone else" (S0005L04). `S0022L02` glossing a
`-ga` form as bare "people" is the single odd one out. The course also teaches the plain
citation elsewhere — `inimesed` (S0034L03, S0087L02) and partitive `inimesi` (S0085L02).

### The repair route, and why it is not the gle_cn route

`gle_cn_for_eng` took clause 2: put the LEGO back to its citation form. **Here I did the
opposite and left the target alone** — because the target is not what is wrong. The
Estonian `inimestega` is a perfectly good chunk that genuinely means "with people"; what
was wrong was the **English gloss**, which under-described the marked form and thereby
licensed the two bad weldings. Correcting the gloss is the cheapest correct repair and the
one the course's own five sibling comitatives dictate. Reverting the target to `inimesed`
would instead have broken the eight phrases where the comitative *is* correctly licensed
(`kohtuda inimestega`, `ma tahan inimestega rääkida`, …), and `inimesed` is itself not
attested until seed 34.

| Row | known: was → is now | target: was → is now |
|---|---|---|
| **LEGO `S0022L02`** | people → **with people** | `inimestega` — *unchanged* |
| `S0022L02B01` | people → **with people** | `inimestega` — *unchanged* |
| `S0022L02U04` | I want to find out about people → **I'm trying to speak with people** | `ma tahan inimestega teada saada` → **`ma proovin inimestega rääkida`** |
| `S0022L03B02` | people who speak Estonian → **to meet people who speak Estonian** | `inimestega kes räägivad eesti keelt` → **`kohtuda inimestega kes räägivad eesti keelt`** |

`S0022L03B02` was repaired by **clause 1 — merging toward the licensor**: `kohtuda`
(`S0018L04`, seed 18) was pulled into the phrase so the comitative is taught with the thing
that licenses it. That is a phrase-level merge only; **no LEGO boundary moved**, so no
lego index shifted and no phrase id was reissued. `S0022L02U04` was rebuilt from material
attested at or before seed 22 (`ma proovin` seed 2, `rääkida` seed 1) because the correct
rendering of "about people" needs `inimeste kohta`, and the postposition `kohta` is not
attested here.

**O2 was honoured.** The LEGO's known text changed, so its **presentation clip was
regenerated** — it had been announcing *"The Estonian for: 'people', as in — 'I want to
speak with people', is:"* and now announces *"The Estonian for: 'with people', …"*. Worth
flagging for anyone repeating this: `POST /regenerate-presentation` **reuses the existing
row's text** unless you pass `text` in the body. The first call returned `created:false`
and re-linked the stale wording; the corrected text had to be supplied explicitly.

### Audio — 9 clips, all Azure, all passing

| Row | role | voice | transcribed back |
|---|---|---|---|
| LEGO `S0022L02` | known | `azure_en-GB-SoniaNeural` | pass, CER 0 |
| LEGO `S0022L02` | presentation | `azure_en-GB-SoniaNeural` | pass, CER 0.058 |
| `S0022L02B01` | known | `azure_en-GB-SoniaNeural` | pass, CER 0 |
| `S0022L02U04` | known / target1 / target2 | Sonia / `azure_et-EE-AnuNeural` / `azure_et-EE-KertNeural` | pass, CER 0 / 0.103 / 0.103 |
| `S0022L03B02` | known / target1 / target2 | Sonia / Anu / Kert | pass, CER 0 / 0.116 / 0.116 |

The LEGO's and `S0022L02B01`'s **target** clips were untouched (target text unchanged) and
kept their links — a learner hears the same Estonian, only the English changes.

### ⚠️ The unconfirmed item — reported, NOT fixed (as pre-decided)

The scan's Estonian **partitive-as-existential-subject** item was left unconfirmed by the
scanning worker. Per the brief's default I have **not fixed it**, because my own reading
does not reach the confidence I had on the other nine. What I can add is the evidence.

The row I believe was meant is **`est_for_eng:S0286L01U04`** — "there are people who like
speaking a lot" → **`on inimesed kellele meeldib palju rääkida`**. An Estonian existential
clause with an **indefinite plural** subject takes the partitive: `on inimesi, kellele
meeldib palju rääkida`. Nominative `on inimesed` reads as a definite/predicative
identification, not "there are (some) people". I put my confidence at roughly 80% — high
enough to report loudly, not high enough to write into a course on my own reading.

The course is **internally inconsistent** on exactly this point, which is why it is worth
a ruling rather than a quiet fix:

| Row | known | target | case of subject |
|---|---|---|---|
| `S0286L01U04` | there are people who like speaking a lot | `on **inimesed** kellele…` | nominative pl |
| `S0287L01U03` | there are many people here | `siin on **paljusid inimesi**` | partitive pl |
| `S0264L01U05` | there is an old man here | `siin on **vana mees**` | nominative sg |
| `S0230L01U01` | there is a young man here | `siin on **noort meest**` | partitive sg |

My reading of the four: the two **singular** ones are the ones I'd leave — `siin on vana
mees` is ordinary Estonian — and `siin on noort meest` looks like the *mirror* error
(partitive where nominative belongs). The two **plural** ones point opposite ways, and
`S0287L01U03` (partitive) is the one I'd trust. **A native check on these four rows would
settle the rule for the whole course in one pass**, and is worth more than any individual
fix here.

### Deliberately left alone in est_for_eng

- The eight phrases under `S0022L02`/`S0022L03` where the comitative **is** licensed
  (`kohtuda inimestega`, `ma tahan inimestega rääkida`, `ta tahab inimestega tagasi
  tulla`, …). Their decomposition gloss segments still label `inimestega` as "people",
  which is correct: gloss alignment is target-order segmentation of the *known sentence*,
  and those known sentences say "meet people", not "with people".
- `S0088L01U01`, `S0209L03U03/U04`, `S0214L02U04` — all licensed comitatives elsewhere in
  the course, all correct.

---

## Verification, read back live

- All ten edited rows: text, decomposition and audio links read back and asserted.
- **Every decomposition recomposes to its new target text character-for-character** (10/10).
- **No ZUT collision created**: each of the ten new known prompts maps to exactly one
  target across its course; the Hungarian repair also *removes* a contradiction, since
  `találkozni` now takes `-val/-vel` uniformly.
- **No audio link left NULL.** All 24 regenerated clips carry the course's incumbent voice
  and passed the pipeline's own veracity gate.
- **Nothing deleted.** Every superseded clip is still in `course_audio`, unlinked, with its
  drop logged in `content_audio_link_drops` (24 entries — 9 hun, 6 lit, 9 est of which 2
  on the LEGO row — all `nulled-no-same-voice-clip-for-new-text`).
- No LEGO index moved, no phrase id was reissued, no round index shifted, **no
  learner-progress migration was required.**
- No audio-pass request was queued: Kai approved the targeted regeneration and it is
  complete, so there is no missing-audio backlog for `/generate` to fulfil.

## Not done / not ruled on

1. **Lithuanian genitive-of-negation, ≈15–20 further phrases** — listed above, left for a
   ruling. This is the single biggest thing in this report.
2. **Estonian existential subject case** — four diagnostic rows above; wants a native check.
3. **Lithuanian R0.2 ordering** — three genitives now appear at seed 12, before the course
   introduces the genitive at seed 27/30.
4. **hun_for_eng general quality** — verb-less practice phrases and grammatical tags on the
   known side (`friend-instr`, `unfriendly-dative`). Out of this brief's shape; worth its
   own pass.
