# fin_for_eng seed 54 — the `kaverillensa` family, reworked

**Course:** `fin_for_eng` · **Flag:** `S0054L02U06`, Kai, 2026-08-18 — *"reads a bit awkward."*
**Ruling applied:** Kai, 2026-08-21 — rework the family so it reads naturally **without teaching a
word before its time**.
**Applied by:** worker session `fin-seed54-kaverillensa`. Fix (a) of three.

---

## The defect, stated precisely

`kaverillensa` = `kaveri` + `-lle` (allative) + `-nsa` (3rd-person possessive). The `-nsa`
suffix is **anaphoric**: it binds to the subject of its own clause. That gives three
distinct failure modes, and the course has all three.

**Class A — no binder.** With a first-person subject there is nothing for `-nsa` to bind to.
*mä haluun antaa jotain kaverillensa* is not a sentence a Finn produces; the natural form is
*mä haluun antaa jotain **sen kaverille***. This is exactly what Kai heard. **2 rows.**

**Class B — the binder is there, but it means the wrong thing.** With a third-person subject
the `-nsa` binds *reflexively*, so *se halusi antaa jotain kaverillensa* means "she wanted to
give something to **her own** friend". Two rows carried the English "**his** friend" against
that Finnish, so the Finnish and the English disagreed about whose friend it is. **2 rows.**

**Class C — an identical drill.** Colloquial Finnish renders both *he* and *she* as `se`, and
`-nsa` is gender-neutral, so "his friend" and "her friend" produce byte-identical Finnish.
At seed 54, p4 and p9 were the same sentence twice. This is the incidental Kai's earlier
report raised. **1 pair at seed 54** (resolved), **3 pairs at seed 52** (left alone — see below).

### Why the obvious repair is blocked, and what the course already does instead

The natural repair for Class A and B is `sen kaverille`, but **`kaverille` is not introduced
until seed 306** (`S0306L03C02`, *to a friend*). Using it at seed 54 or 185 would teach a word
252 seeds early. Not done.

The course does not need it, because **seed 53 already teaches this exact distinction**. Its
seed sentence is *she wanted to put his letter in her bag* → **Se halusi laittaa sen kirjeen
laukkuunsa** — non-coreferent possessor as free `sen`, coreferent possessor as `-nsa`
(`laukkuunsa`). The repair below simply makes seed 54 obey the rule seed 53 teaches: keep
`kaverillensa` where a third-person subject licenses it, and don't ask it to mean anything
other than *the subject's own friend*.

---

## Every row in the family — all 18, decided individually

Finnish left, English right. **Nothing was pulled.** 4 rows edited, 14 kept.

### Seed 52 — the lego's own teaching seed (12 rows, all kept)

The lego card is `S0052L04`: **"to his friend" → kaverillensa**. Every row here has either a
third-person subject or no subject at all (bare infinitive build fragments, matching the bare
lego card), so `-nsa` is licensed throughout. No edits.

| Pos | id | English | Finnish | Decision |
|---|---|---|---|---|
| 1 | S0052L04B01 | to write a letter to his friend | kirjoittaa kirjeen kaverillensa | kept — bare infinitive |
| 2 | S0052L04B02 | he wanted to write to his friend | se halusi kirjoittaa kaverillensa | kept — binds to `se` |
| 3 | S0052L04B03 | to say something to his friend | sanoa jotain kaverillensa | kept — bare infinitive |
| 4 | S0052L04U01 | he wanted to write a letter to his friend | se halusi kirjoittaa kirjeen kaverillensa | kept |
| 5 | S0052L04U02 | he wants to say something to his friend | se haluu sanoa jotain kaverillensa | kept |
| 6 | S0052L04U03 | he wanted to show something to his friend | se halusi näyttää jotain kaverillensa | kept |
| 7 | S0052L04U04 | he doesn't want to write to his friend | se ei haluu kirjoittaa kaverillensa | kept |
| 8 | S0052L04U05 | he wanted to speak to his friend | se halusi puhua kaverillensa | kept |
| 9 | S0052L04B04 | to say something to **her** friend | sanoa jotain kaverillensa | kept — duplicates pos 3 |
| 10 | S0052L04U06 | she wants to say something to **her** friend | se haluu sanoa jotain kaverillensa | kept — duplicates pos 5 |
| 11 | S0052L04U07 | she wanted to write a letter to **her** friend | se halusi kirjoittaa kirjeen kaverillensa | kept — duplicates pos 4 |
| — | S0052L05U01 | he wanted to write a letter to his friend last week | se halusi kirjoittaa kirjeen kaverillensa viime viikolla | kept |

**On rows 9–11, deliberately not touched.** These three are exact Finnish duplicates of rows
3, 5 and 4 — the same Class C defect as seed 54. But this is the lego's **introduction seed**,
and re-prompting the freshly-taught word with *her* immediately after *his* is a plausible and
useful way to show the learner that `-nsa` does not inflect for gender. Removing them would
remove a teaching point, which Kai's ruling forbids doing without saying so. **Flagged for his
word rather than changed** — if he wants them varied, that is a three-row edit at seed 52.

### Seed 54 — the flagged lego (3 rows, all 3 edited)

Lego `S0054L02` teaches **`antaa` (to give)**.

| Pos | id | English before → after | Finnish before → after | Class |
|---|---|---|---|---|
| 4 | S0054L02U01 | *I want to give something to his friend* → **he wants to give something to his friend** | *mä haluun antaa jotain kaverillensa* → **se haluu antaa jotain kaverillensa** | A |
| 5 | S0054L02U02 | *she wanted to give something to **his** friend* → **she wanted to give something to her friend** | *se halusi antaa jotain kaverillensa* → **unchanged** | B |
| 9 | S0054L02U06 | *I want to give something to her friend* → **we wanted to give something now** | *mä haluun antaa jotain kaverillensa* → **me haluttiin antaa jotain nyt** | A + C |

**Why each shape:**

- **p4** is the minimal repair Kai named: give the possessive a binder. Swapping `mä haluun` →
  `se haluu` makes it grammatical without touching a single word of vocabulary. It also lands
  as the exact structural twin of `S0052L04U02` (*se haluu **sanoa** jotain kaverillensa*, two
  seeds earlier), so the new lego `antaa` is drilled against a frame the learner already owns
  — which is what seed 54 is for.
- **p5** keeps its Finnish **completely unchanged**. The Finnish was always right; only the
  English was wrong about whose friend it is. This is the most conservative repair available.
  p4 and p5 now contrast cleanly on tense (`haluu` / `halusi`).
- **p9** had both defects at once: an unbound `-nsa`, *and* it was the identical drill to p4.
  A third `kaverillensa` row in a nine-row lego about `antaa` is redundant even when repaired,
  and the row only ever existed to serve a *his/her* distinction Finnish does not make. So it
  is **replaced, not pulled** — with a sentence that instead exercises build row `S0054L02B03`
  (*to give now* → *antaa nyt*), which until now was built and then never used.

  Vocabulary check on the replacement: `me haluttiin` is `S0054L01` (same seed, **earlier**
  lego), `antaa jotain` is `S0054L02B02` (same lego), `nyt` is first taught at seed 1. Nothing
  used ahead of its time, in either direction.

Seed 54 lego 2 now holds **zero duplicate Finnish** — verified live.

### Seeds 185, 357, 527 (3 rows, 1 edited)

| Seed | id | English before → after | Finnish | Class |
|---|---|---|---|---|
| 185 | S0185L01U08 | *I reckon that she gives it to **his** friend* → **I reckon that she gives it to her friend** | mä luulen, että se antaa sen kaverillensa — **unchanged** | B |
| 357 | S0357L02U06 | she wants to send a message to her friend | se haluu lähettää viestin kaverillensa | kept — correct |
| 527 | S0527L01U06 | she told it to her friend | se kertoi sen kaverillensa | kept — correct |

Seed 185 is Class B, not Class A: the main clause is *mä luulen*, but `-nsa` sits in the
embedded clause whose subject is `se`, so it binds correctly there. The Finnish was natural
and right; the English mismatched it. English corrected, Finnish untouched. Note the row also
already shows the seed-53 contrast in miniature — `sen` for the object *it*, `-nsa` for the
coreferent possessor.

**Totals: 4 rows edited, 0 rows pulled, 14 rows kept.**

---

## Checks

**ZUT — checked against the whole course, not seed 54.** Each of the four new known prompts
appears exactly once in `fin_for_eng` and maps to exactly one target. A full course-wide sweep
of `build`/`use` rows for *one known prompt → two different targets* returns **4 collisions,
all pre-existing and all outside this family**, untouched and reported here rather than
silently fixed: *that book* (`se kirja` / `sen kirjan`), *that person* (`se henkilö` / `toi
henkilö`), *very kind* (`tosi kiltti` / `tosi kilttiä`), *what do you think* (`mitä mieltä` /
`mitä mieltä sä oot`).

**Unbound `-nsa` — swept course-wide.** Every remaining `-nsa` / `itsensä` row in
`fin_for_eng` (7 rows) has its possessive inside a clause with a third-person subject or in an
impersonal construction. **Zero unbound possessives remain in the course.**

**Known side.** No new English word or structure. Every word in the four new prompts (*he
wants*, *she wanted*, *we wanted*, *to give*, *something*, *now*, *her friend*, *I reckon
that*) is already on the known side at or before its seed.

**Audio — none generated, none deleted, none orphaned.** All 18 family rows carry NULL on all
four audio columns (`known_audio_id`, `target1_audio_id`, `target2_audio_id`,
`presentation_audio_id`). More precisely than the previous pass stated: `fin_for_eng` does
hold 43 Finnish clips in `course_audio`, but **zero** of them are linked to any practice
phrase in the course (they are conversation/pod sentences), and none contains the text of any
row touched here. Nothing to re-render.

**Derived artefacts.** All 18 rows have NULL `decomposition`, `display_tiling` and
`known_gloss_segments`, so no word-mapping or gloss artefact references the old text.
`course_round_index` carries only `lego_id` / `seed_number` / `lego_index` and **no phrase
text**; no lego was mutated, so no refresh is required. The counters `word_count` (target
character length) and `lego_count` (known-side word count) were maintained on all four edited
rows.

**Seeds unapproved: 1.** There is **no trigger** that unapproves a seed on a content edit —
the six triggers on `course_practice_phrases` handle versioning, auditing, audio-nulling and
the content stamp, none of them approval. `course_seeds.approved_at` was therefore set to NULL
**explicitly**. Seed 54 was approved (2026-07-21) and is now unapproved. Seed 185 was already
unapproved before this pass. **Nothing was approved.**

**Kai's flag** on `S0054L02U06` was left untouched, as instructed — it closes itself now the
edit has landed.

---

## Raised, not acted on

**`kaverillensa` is a literary form in a colloquial course.** The course speaks *puhekieli*
throughout — *mä haluun*, *se oot*, *me haluttiin*, *oon*. In that register the possessive
suffix is normally dropped entirely (*sen kaverille*), and where it is used the ordinary
modern form is **`kaverilleen`**, not `kaverillensa`. `-nsa` is correct standard Finnish but
reads markedly written/older.

Not changed, for two reasons: it would move a teaching point across all 18 phrases plus the
seed 52 seed sentence, and the choice looks **deliberate** — seed 53 teaches `laukkuunsa`, the
same third-person possessive suffix, one seed earlier. So the course consistently *uses* the
`-nsa` suffix rather than dropping it colloquially; that is an authorial register decision, and
overturning it is Kai's call, not mine. (Note the two are not quite the same question: seed
53's `laukkuunsa` has no shorter variant, whereas `kaverillensa` does — `kaverilleen`. If Kai
wants the softer form, that is a one-word change to the seed 52 lego card and 18 phrase rows.)

---

## Rollback

All four rows are snapshotted verbatim, pre-edit, in
`docs/finnish/fin-seed54-kaverillensa-2026-08-21-rollback.json`, and the two seed rows in
`docs/finnish/fin-seed54-kaverillensa-2026-08-21-rollback-seeds.json` (which carries seed 54's
original `approved_at`). A straight `UPDATE` from those files restores the previous state
exactly.

## Method

Read live from the database throughout, never from a build artefact. All 18 family rows were
read and decided individually; the ZUT and unbound-`-nsa` sweeps ran over the whole course
(all 14,117 phrase rows), not over seed 54. Every post-write count and every row in the tables
above was re-read live from the database after the commit.
