# Connemara Irish — the eleven forks are ruled, and the build is running on them

`gle_cn_for_eng`. **£0.00 spend. Zero TTS. Zero audio rows.** Course still `status=draft` /
`new_app_status=not_available` — no learner can reach any of it. **`gle_for_eng` was never touched.**

You asked me to weigh everything up and decide, then build. Done. Read this one item at a time; each
section stands alone.

---

## 0. FIRST — something you need to know before you read anything else

**The "20 seeds banked, 65 legos, 535 phrases" in this morning's report was not in the database when
I started.** I checked before trusting it. At **15:51 UTC** a predecessor session snapshotted seeds
1–20 into `seed_redo_snapshots` batch `0f75acc2`, deleted seeds 2–20 to rebuild them under the
inventory's rulings, and then stopped. What I actually inherited was:

| | claimed | actually in Supabase at 16:05 |
|---|---|---|
| seeds banked | 20 | **1** |
| legos | 65 | **4** |
| practice phrases | 535 | **11** |

Nothing was lost — the snapshot is intact and the 19 decompositions are committed as markdown. But
the build was mid-operation, not at rest, and the inventory's line *"Nothing was changed… the build
stands exactly as it was"* had stopped being true ten minutes after it was written. **So "rebuild
seeds 2–20" turned out to be the actual job, not a side-effect of my rulings.** Worth knowing before
you read a number anywhere else.

The seed **order** had already been reverted to corpus order, which is Fork 4 — so that one was
applied before I got to it, and I have ratified rather than re-done it.

---

## 1. The eleven rulings, one line each

⚠️ = needs a native ear. Full reasoning and every count: `docs/gle-cn/rulings-2026-08-18.md`.

| # | Fork | RULING | Evidence | Conf |
|---|---|---|---|---|
| 1 | `ag iarracht` | **KILL** | 0 in 4 dictionaries, 0 in 15,904 base items, 0 in Ó Curnáin — against `iarraidh` 105 | A |
| 2 | "I'm trying" = the same words as "I want" | **YES** | **Ó Curnáin's own headword: `iarraidh, f, request, TRYING, turn, blow`** | A |
| 3 | non-progressive "to try" = `iarracht a dhéanamh` | **YES**, arriving seed 8 | FGB's frame; base 38×; the base course uses it for our exact seed 407 | A form / C placement |
| 4 | move the four "try" seeds back to 2, 6, 7, 8 | **YES** (already in the DB) | the exile quarantined a word that no longer exists | A |
| 5 | "can" = `in ann` only | **YES** | base 646 vs `ábalta` 0; Ó Curnáin `i ndan` **112** vs `in ann` 31 | A |
| 6 | "want" = `tá mé ag iarraidh` | **KEEP** | 114 seeds say "want", 8 say "would like"; base 2,680 vs 806 | A |
| 7 | "I speak" = `labhraím` | **`labhraím`** ⚠️ | base `labhraíonn tú` 84; but nothing sources the 1sg as Connemara | B→C |
| 8 | "need to" / "have to" = two forms | **TWO**: `tá orm` / `caithfidh mé` | **the dialect's own obligation form: *"Caithe tú breith ar an taltha"*** | A |
| 9 | `éigin` or `eicínt` | **`éigin`** — on policy, **against the corpus** | `eicínt` **58** vs `éigin` 18 in running Connemara speech. See §4 | A on policy |
| 10 | "I like" | **`is maith liom`** = like, **`taitníonn le`** = enjoy. **Overturns the inventory** | see §2 | A |
| 11 | `cén chaoi le` + verbal noun | **NO — the `le` comes OUT.** **Reversed mid-run** | see §3 | A |

---

## 2. Where I overturned a ruling — Fork 10, and it was the inventory's, not yours

The inventory wanted `taitníonn … liom` for "I like" and `is maith liom` kept out of the course
entirely, to dissolve the `is`/`ba`/`níor mhaith liom` collision. **I measured what the native
actually does with both words:**

| | base corpus | what the English side says |
|---|---|---|
| `is maith liom` | **82** | *I like Irish · I like tea · I like to speak Irish* — "like", every one |
| `taitníonn` | **14** | *they enjoy · who enjoy · people who enjoy speaking Irish* — "enjoy", every one |

**The native already made the split, and it isn't the one the inventory proposed.** Giving
`taitníonn` to "like" leaves "enjoy" homeless — and the corpus demands "enjoy" at seeds **51, 55,
101, 206**. That doesn't dissolve a collision, it relocates it onto a concept we also have to teach.

And the collision it feared is a **learnable** one: `is maith liom` / `ba mhaith liom` maps onto a
distinction **English already makes** — *like* vs *would like*. That is exactly the argument that won
Fork 6. `iarraidh`/`iarracht` mapped onto nothing; this maps onto something the learner already owns.

Then Ó Curnáin settled it — `is maith liom` is live, everyday transcribed Connemara:

> *"Is maith liom go dtáinigeamar beo"* · *"Ní maith liom teilibhisean"* ·
> *"ní maith liom na buidéil dhubha sin"* · *"Ní maith liom héin iad a ithe"*

**Two consequences for you:**
- **Seed 12's banked gloss "I wouldn't like" → `níor mhaith liom` STANDS.** The inventory asked you
  to review it. Under this ruling nothing competes for that slot, so there is nothing to review.
- **Your drilling design is transferred here and is binding**: `ba mhaith liom` at seed 11,
  `is maith liom` **no earlier than seed 26**, compulsory same-phrase pairs (`is maith liom labhairt`
  / `ba mhaith liom labhairt`) in the seed that introduces the second, and neither form introduced
  then dropped.
- **One honesty correction to my own ruling.** Ó Curnáin's headword is `taitnigh, v. **Like**.` — so
  the *dialect* does not keep like/enjoy apart the way I do. My split is
  **arbitrary-but-consistent, exactly like Fork 8**, and I am declaring it as such rather than
  pretending Irish makes the distinction. It is still the right course design. It is not a fact
  about Irish.

---

## 3. The other reversal — Fork 11, which I reversed against MYSELF, mid-build

I first ruled *keep* `cén chaoi le`. Then I mined a source the inventory had listed as unmined, and
it refuted me. I changed the ruling with two workers already in flight.

| probe | corpus | hits |
|---|---|---|
| `conas le` | base, 15,904 items | **0** |
| `chaoi le` | Ó Curnáin vol IV | **0** |
| `conas [object] a [verbal noun]` | base | **20** |
| `cén chaoi a` + finite verb | transcribed Connemara speech | attested ×5+ |

**Two corpora, zero hits each, for the one word the fork turned on.** The native's frame carries no
preposition at all: *"I want to learn how to speak Irish"* →
`tá mé ag iarraidh foghlaim conas Gaeilge a labhairt`. The `le` was ours, not the dialect's.

**The frame is now:** `cén chaoi [object] a [verbal noun]` · `cén chaoi a [finite verb]` · and bare
`cén chaoi [verbal noun]` where there is no object.

So seed 4 becomes `cén chaoi rud éigin a rá i nGaeilge` and seed 3 becomes
`cén chaoi labhairt chomh minic agus is féidir`.

⚠️ **The objectless case (seed 3) is still the weak one** — its only support is a single base item,
`conas foghlaim`, 1 hit in 15,904. It stays on the native-ear list. But **dropping `le` is better
evidenced than keeping it whatever a native says about seed 3**, so the reversal is right either way.

---

## 4. The one place I followed policy against the evidence, and you should see it

**`eicínt` beats `éigin` in this dialect, and not narrowly.**

| | Ó Curnáin vol IV |
|---|---|
| `eicínt` | **58** — all in transcribed running speech: *rud eicínt · áit eicínt · cuma eicínt* |
| `éigin` | 18 |

I still ruled `éigin`, on the dialect spec's governing line you ratified — standard orthography,
dialect lexis — plus the argument that a learner taught `eicínt` cannot look the word up. Your rule 1
says corpus outranks prescription; I treated the orthography split as a ratified *design decision*
rather than a prescription about Irish, which is why I did not consider it overruled.

**But that line is yours to move, and this is exactly where moving it bites.** Same call, same shape:
**`amáireach` 22 vs `amárach` 1** — our banked seeds 12 and 15 say `amárach`.

If you want the course to *sound* Connemara more than it *reads* standard, say so and this is a
one-pass substitution across two words.

---

## 5. New evidence nobody had — Ó Curnáin Volume IV

The inventory named vol IV — the transcribed-speech and glossary volume — as the obvious next target
and left it unmined. **I mined it.** 5.5 MB PDF → 2.2 MB of text, using a PDF reader I had to write
from zlib primitives because this sandbox has no PDF tooling. It is committed as
`docs/gle-cn/pdfx.py` so nobody rewrites it. Calibration: `Gaeilge` 71, `iarraidh` 105, `bíonn` 101.

**It confirmed, from the dialect monograph itself:** `cén chaoi` 29 against **`conas` 0** — so the
base's 279 `conas` really are a defect · `tá muid` 18 against **`táimid` 0** · `céard` 80 against
`cad` 2 · `chuile` 139 · `ag caint` 19 against `ag labhairt` 1 · `aithne` 58 · `teastaíonn` **0**.

**It upgraded four rulings** (Forks 2, 8, 10, and seed 7's `dícheall`, which the inventory had at
zero support and which turns out to be a headword: `deoicheall, (dícheall). m. Utmost.`).

**It cost me two arguments, and I am not hiding either:**
- **`féach` is alive in Connemara** (27 hits, running speech, plus a headword). The inventory
  rejected `féach le` as the "try" verb partly because *"Connacht has largely swapped féach →
  breathnaigh"*. **That claim is withdrawn.** Fork 3 still stands on its other legs, but on fewer.
  `féach le` deserves a second look.
- **Seed 7's frame may be wrong.** `dícheall` is attested — but as **`mo dhícheall a THABHAIRT`**
  (*"tá mo dhícheall tugthaí am, I have done my utmost"*), and `dícheall a dhéanamh` is **0**. Seed 7
  currently says `a dhéanamh`. Native-ear list.

**And one calibration that stops a wrong conclusion.** `labhraím` is **0** in vol IV. **That is not a
refutation of Fork 7.** Control, comparable 1sg present forms in the same volume: `deirim` 6,
`tuigim` 4, `ólaim` 4, `feicim` 2 — and **`ceapaim` 0**, for a form the base carries 382 times and
nobody doubts. The noise floor here is 0–6 hits. Anyone who cites `labhraím` = 0 as proof is
misreading a glossary.

---

## 6. What got built

<!--BUILD_NUMBERS-->

---

## 7. What still needs a native speaker, in the order I would ask

| rank | question | why it's first | cost to reverse |
|---|---|---|---|
| **1** | Seed 9 — *"I speak a little Irish now"*: `Labhraím beagán Gaeilge anois` or `Tá beagán Gaeilge agam anois`? | "Speak" is the course's spine. Nothing sources 1sg `labhraím` as Connemara — the argument is from what sources *didn't* say — and one forum contributor called the pattern *"utter nonsense"* for the ability sense | 3 seeds now (9, 13, 14), ~60 phrases. **Ten times that by seed 100.** Ask this one first |
| **2** | Seed 3 — does `cén chaoi labhairt chomh minic agus is féidir` sound right with no object? | 1 supporting item in 15,904. Becomes the course's standard "how to" frame, so it compounds | 1 seed, 3 legos, ~17 phrases |
| **3** | Seed 8 — is `Tá mé chun iarracht a dhéanamh céard atá i gceist agam a mhíniú` natural, and is `iarracht` too close to `ag iarraidh` seven seeds earlier? | My own Irish, unsupported (conf C). It is the ruling I most expect you to challenge | 1 seed. Move it to the corpus's next non-progressive demand at seed 146 |
| **4** | Seed 7 — `mo dhícheall a dhéanamh` or the dialect's `a thabhairt`? | Vol IV says `a thabhairt`; the dictionary says `a dhéanamh` | one lego's target text |
| **5** | Orthography vs sound — `éigin`/`eicínt`, `amárach`/`amáireach` | §4. This is a policy question for you, not a fact question for a native | one substitution pass |

---

## 8. What to undo if you disagree, per ruling

Every ruling is reversible and the before-image exists.

| ruling | to undo |
|---|---|
| Forks 1, 2 (kill `ag iarracht`, "trying" = `ag iarraidh`) | 2 seed translations + seed 2's lego. But you would be reversing Ó Dónaill and Ó Curnáin's own glosses |
| Fork 3 (`iarracht a dhéanamh` at seed 8) | un-bank seed 8 alone; move it to seed 146. Nothing depends on it |
| Fork 4 (seed order) | `docs/gle-cn/snapshots/renumber-2026-08-18.json` is the forward map, `renumber-reverted-…json` the inverse |
| Fork 5 (`in ann` only) | it cost nothing to apply because the seeds were unbanked anyway; undoing means re-editing ~42 phrase lines |
| Fork 6 (want = `ag iarraidh`) | course-wide. This is the expensive one to change and the best-evidenced one |
| Fork 7 (`labhraím`) | 3 seeds today. See §7 rank 1 |
| Fork 8 (two forms) | nothing built. Free |
| Fork 9 (`éigin`) | one substitution pass over 2 words |
| Fork 10 (`is maith liom`) | **free** — "I like" isn't demanded until seed 26 and nothing is built |
| Fork 11 (drop `le`) | `scripts/gle-cn/fork11-drop-le.cjs` run in reverse; 29 rows |

**Snapshots**: `docs/gle-cn/snapshots/pre-my-rulings-2026-08-18.json` (file before-image, mine),
`seed_redo_snapshots` batch `fa883f85` (mine) and `0f75acc2` (the predecessor's seeds 1–20).

---

## 9. Gaps — what I could not get

- **No native Connemara speaker has seen any of this.** Unchanged, and still the largest gap by far.
- **Gaeilge Weekly: still not obtained.** Behind Patreon; Rephonic and Metacast both 403. **No line
  of Gaeilge Weekly Irish informs any decision here.** Live lead for anyone with an account.
- **RTÉ Raidió na Gaeltachta**: 403 on every page. **TG4 / Ros na Rún**: subtitles burned into video,
  not extractable.
- **Ó Siadhail, *Learning Irish*** — the one source that would settle Fork 7 — access-restricted on
  archive.org, **not one page read.** Same for de Bhaldraithe's *Gaeilge Chois Fharraige* (print
  only) and *Caint Chonamara* (€32 paywall, not crossed — zero-spend rule).
- **Ó Curnáin vols I and III remain unmined.** II and IV are done. `docs/gle-cn/pdfx.py` works.
- **`is dóigh liom` as Munster is still unsourced** — 0 in vol IV, which is absence, not refutation.
  The validator is still rejecting content on that unverified basis. I have not changed the spec.
- **`caithfidh` and `ceapaim` cannot be counted by string search in vol IV** (`caith` has 175 hits
  across a dozen unrelated senses). Named so nobody re-runs the probe and mis-concludes.
- **No TTS exists**, so every pronunciation claim in this document is a *reason*, not a
  *measurement*.
- **Volume IV is a glossary.** It indexes the unusual. Absence in it is weak evidence, and I have
  tried to say so every time I leaned on an absence.
