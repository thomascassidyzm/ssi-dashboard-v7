# Finnish fixes — consistency re-check against Kai's rule

**Kai's hunch was right, and it found more than he asked about.** One of the five grammar fixes leaves the learner asked for a form the course never taught and its own card contradicts. Two other things turned up that nobody had flagged.

Proposals below are **revised under Kai's 2026-08-06 ruling** allowing full rewrites (both sides) and deletion. That ruling produced a better seed-523 fix than my first one, and unlocked two English-side fixes I had previously parked.

Data: live `fin_for_eng`, read with the **SERVICE key** (`sb_secret_…`), not anon. 14,032 practice phrases, 1,425 legos, 668 seeds — the whole course, seeds + legos + practice phrases. No psql on this machine, so this is the Supabase REST API. **Nothing in this report has been applied. No reverts made. No TTS.**

---

## First, a correction to the record

The brief describes **9 changes**. There were **11**. The rollback file backs up 11 rows and the live DB confirms all 11 moved:

- 5 grammar fixes (negation → partitive) ✔ as briefed
- 4 duplicate-line deletions ✔ as briefed
- **2 edits nobody mentioned** — seed 346, `tosi paljon` → `paljon` (S0346L03U01, S0346L04U02)

Those last two matter because they were made under the `very`/`really` → `tosi` reasoning Kai has now overturned. I checked them anyway. They turn out to be **correct for a different and better reason** — see below.

---

## The five grammar fixes

| # | Row | Change | Learner already knows the corrected form? | Card contradicts it? | Verdict |
|---|---|---|---|---|---|
| 1 | S0057L01U06 "I don't remember his name" | `sen nimen` → `sen nimeä` | **Yes** — seed 21, a whole LEGO ("her name" = `sen nimeä`, 11 rows), again s24, s50 | **No** — card is "I don't remember" = `mä en muista`, no noun | **Safe** |
| 2 | S0589L01U04 "I haven't seen the bus" | `bussin` → `bussia` | **Yes** — seed 391, a whole LEGO (`bussia kohti`, 8 rows) + s476 `mä odotan bussia`; 12 exposures | Card says `bussin`, but that is **correct** for its own 9 affirmative rows | **Safe** |
| 3 | S0523L01U01 "I don't want to give an excuse" | `antaa tekosyyn` → `antaa tekosyytä` | **NO — zero prior occurrences anywhere in the course** | **YES** — card "an excuse" = `tekosyyn` | **Needs a build rewrite** |
| 4 | S0523L01U02 "you shouldn't give an excuse" | `antaa tekosyyn` → `antaa tekosyytä` | **NO** — same | **YES** | **Needs a build rewrite** |
| 5 | S0523L01U04 "I don't want to find an excuse" | `löytää tekosyyn` → `löytää tekosyytä` | **NO** — same | **YES** | **Needs a build rewrite** |

### How I found it (the method, and its calibration)

I did not go looking for seed 523. I swept all **277** lego cards whose Finnish ends in `-n` and asked, for each: does that tile also contain a *negated* phrase demanding the partitive of the same stem? Course-wide that returns exactly **two** tiles — seed 523 (the known calibration case, rediscovered independently ✔) and **seed 589, which had never been reported**. Two hits out of 277 is the sweep being tight, not lucky.

**Word-boundary trap, checked before I trusted anything.** JavaScript `\b` is ASCII-only and breaks *both ways* on Finnish. Demonstrated, not assumed:

- `/\bnimeä\b/` on `"sen nimeä"` → **false** (misses the real hit)
- `/\bnimeä\b/` on `"nimeäminen"` → **true** (false positive inside a longer word)

Every sweep here tokenises with `/\p{L}+/gu` and compares whole tokens instead.

### Fix 1 — safe, and it actually repaired a defect

Before the fix, S0057L01U06 was the **only** row in the entire course using `sen nimen` as the object of `muistaa`. Its own sibling three rows earlier, S0057L01B03 "I don't remember her name", already said `sen nimeä`. So the tile had *the same English structure with two different Finnish answers* — precisely the defect direction Kai says is real. The fix removed it. Keep.

### Fix 2 — safe, with an honest caveat

The card does teach `bussin`. But `bussin` is right for the nine affirmative rows around it, and the learner has both halves of what `bussia` needs: the **form** (12 exposures from seed 391, incl. a full LEGO) and the **rule** (1,681 negated-partitive phrases before seed 589). Caveat worth stating: the earlier `bussia` exposures are partitive for *other* reasons — the postposition `kohti`, and `odottaa` — never negation. So this is a composition of two well-taught things rather than a direct precedent. That is normal SSi and I would not touch it. Optional polish only.

### Fixes 3–5 — this is the real one

Seed 523 fails on **both** counts at once, which neither of the other tiles does:

1. **`tekosyytä` appears nowhere else in the course.** The noun `tekosyy` exists *only* in seed 523. The learner has never seen this form.
2. **Everything else in the tile teaches `tekosyyn`** — the card, build phrases B01/B02/B03, and the seed sentence itself.

The sharpest instance, both rows inside one tile:

| | English | Finnish |
|---|---|---|
| S0523L01B02 (build) | to give an excuse | antaa **tekosyyn** |
| S0523L01U01 (use) | I don't want to give an excuse | antaa **tekosyytä** |

Same verb, same object, same English words, two different answers, and the card backs the one the learner is now marked wrong for.

**The one mitigation, stated fairly:** `syytä` *is* taught at seed 475 (`monta syytä`), and `tekosyy` is literally `teko` + `syy`, so the form is reachable by analogy. It is thin, though — at s475 `syytä` is glossed "**reasons**" (plural) and appears only inside the frozen chunk `monta syytä`. I would not rely on a learner making that leap.

**I did not revert.** Reverting would restore three rows of ungrammatical Finnish to buy back tile consistency — trading a correctness bug for a consistency bug. The grammar fix is right; the tile has to catch up with it. But state it plainly: **until a build teaches `tekosyytä`, seed 523 is internally more contradictory than it was this morning.**

---

## Proposed complete fix for seed 523 — NOT APPLIED, Kai's call

**Revised under Kai's 2026-08-06 ruling** ("don't be afraid to completely reword phrases, both sides… don't be afraid to just delete"). That ruling gave me a better fix than the one I first proposed, and it is worth saying why.

**First, a refinement of the diagnosis.** The *construction* the three fixed rows use is **already taught, early**: seed 36 has `mä en haluu keskeyttää tarinaa` — "I don't want to interrupt the story" — negated *haluta* + infinitive + **partitive** noun object. That is exactly the shape of the three fixed rows. So the learner is not missing the grammar. **The only thing missing is the word-form `tekosyytä` itself.** That means the right fix is to *teach the form in a build*, not to neutralise the card.

Here is the tile in exact play order. The partitive first appears at **position 4 — the very first use row**, with no build having taught it:

| pos | role | row | English | Finnish |
|---|---|---|---|---|
| 1 | build | S0523L01B01 | an excuse | tekosyyn |
| 2 | build | S0523L01B02 | to give an excuse | antaa tekosyyn |
| 3 | build | S0523L01B03 | to find an excuse | löytää tekosyyn |
| **4** | **use** | **S0523L01U01** | **I don't want to give an excuse** | **antaa tekosyytä ← first ever** |

Builds teach; uses test. A form appearing first in a use row is the defect, stated precisely.

### Option A — recommended. One row rewritten, both sides.

Make the last build (position 3, immediately before the uses) the place the partitive is introduced:

| Row | Field | Before | After |
|---|---|---|---|
| `course_practice_phrases` fin_for_eng:S0523L01B03 | `known_text` | to find an excuse | **you don't want to give an excuse** |
| `course_practice_phrases` fin_for_eng:S0523L01B03 | `target_text` | löytää tekosyyn | **sä et haluu antaa tekosyytä** |

Every part is already introduced: `sä et haluu` attested from seed 110 (9 occurrences), `antaa` from seed 54 (160 occurrences), and the construction itself from seed 36. `tekosyytä` is introduced **here**, in a build, one position before the first use that needs it. Checked: this duplicates no existing row in the course.

**The cost, stated honestly:** `löytää tekosyyn` is no longer built. Position 6 (`mun pitää löytää tekosyyn`) then composes two separately-taught things — `löytää` (44 occurrences from seed 66) and the verb+accusative-object pattern from B02. That is normal SSi composition, but it is a real trade and Kai should weigh it.

**Optional companion (not required).** LEGO S0523L01 + B01 `tekosyyn` → `tekosyy`, making the card a nominative citation so both object forms read as inflections of one taught base. Course precedent exists — of the 65 cards glossed "a/an/the <noun>", 21 use the `-n` object form but 19+ already use the nominative (`a surprise` = `yllätys` s130, `a question` = `kysymys` s422, `a bottle` = `pullo` s414, `a mistake` = `virhe` s617). I have demoted this from "required" to "optional": once a build teaches the partitive, the card is simply one of two correctly-taught forms rather than a contradiction.

### Option B — delete the three phrases. Not recommended, and here is the number.

Deleting U01/U02/U04 takes seed 523 lego 1 from **6 use rows to 3**. Course-wide, the norm is **5 uses** (971 of 1,397 legos) and only **7 legos out of 1,397 (0.5%)** have 3 or fewer. That is **structurally short** — bottom half-percent of the course. Deletion is a legitimate tool per Kai's ruling, but this tile is not the place for it: the phrases are good, only one word-form is untaught.

### Option C — revert fixes 3–5 to `tekosyyn`. Not recommended.
Buys tile consistency by restoring three ungrammatical rows.

**Flagged, not asserted — the necessive rows.** S0523L01U03 / U05 / U06 (`mun pitää antaa tekosyyn`, `sun pitäisi antaa tekosyyn`) take a total object of a necessive construction, which standard grammar puts in the **nominative** (`tekosyy`); colloquial Finnish genuinely varies here. Not a negation error, and I am not claiming it — but it is the same tile, so worth deciding at the same time.

---

## Two known-side fixes now in scope

Kai's ruling puts the English side in play, which makes two nits I had parked cleanly fixable. Both are the real defect direction — same English, two different Finnish forms — and both are **low severity**.

**Seed 152 — "differently" taught as two things.** The component is mislabelled: `eri` alone means *different*, not *differently*.

| Row | Field | Before | After |
|---|---|---|---|
| fin_for_eng:S0152L02C01 | `known_text` | differently | **different** |

(`target_text` `eri` unchanged.) This also aligns it with `eri` = "different" as used at seeds 319 and 457, and leaves `eri tavalla` as the sole holder of "differently" — the LEGO, B01 and all five uses already agree on that.

**Seed 162 — "what do you think" on two different targets.** B01 `mitä mieltä` and B02 `mitä mieltä sä oot` carry an identical English label. The components already gloss the pieces as "what" = `mitä` and "opinion" = `mieltä`, so the chunk has a natural name:

| Row | Field | Before | After |
|---|---|---|---|
| `course_legos` S0162L01 | `known_text` | what do you think | **what opinion** |
| fin_for_eng:S0162L01B01 | `known_text` | what do you think | **what opinion** |

(`target_text` `mitä mieltä` unchanged in both.) This leaves B02 as the single holder of "what do you think" = `mitä mieltä sä oot`, matching B03, B04 and all five uses.

---

## The 4 deletions

| Deleted | English | Finnish | Survivor it duplicated |
|---|---|---|---|
| S0059L01U07 | I know you're learning Finnish | mä tiedän, että sä oot oppimassa suomea | S0059L01U06 "I know **that** you're learning Finnish" |
| S0105L01U06 | that's why it isn't working | siksi se ei toimi | S0105L01U05 "that's why it**'s not** working" |
| S0142L04U06 | thank you very much for the help | kiitos paljon avusta | S0142L04U03 "thank you very much for **helping**" |
| S0144L01U06 | I woke up in the middle of the night | mä heräsin keskellä yötä | S0144L01U02 "I woke in the middle of the night" |

**Structural check — clean.** No basket left short: every affected lego still holds the standard 3 build + 5 use or better (s59 L1 = 13 rows, s105 L1 = 8, s142 L4 = 8, s144 L1 = 11). **Zero dangling references** to the four deleted ids anywhere in the course. Two left cosmetic holes in position numbering (s59 lego 1: 12→14; s144 lego 1: 10→12) — ordering is unaffected, nothing points at the gap.

**But they were deleted under the rule Kai has just overturned.** Each is two different English prompts mapping to one identical Finnish string — redundancy, which Kai has ruled "doesn't constitute a proper issue." All four are **restorable verbatim** from `docs/fin-flags-2026-08-06-rollback.json`. Restoring is Kai's call; I have not touched them.

---

## The 2 unbriefed seed-346 edits — keep them

These were made under the `tosi` reasoning, but they are right for a better reason. Before the edit, seed 346 taught **"a lot" two different ways inside one tile**:

| | English | Finnish |
|---|---|---|
| S0346L04B03 (build) | liked her book **a lot** | tykkäsin sen kirjasta **paljon** |
| S0346L04U02 (use), before | I liked her book **a lot** | tykkäsin sen kirjasta **tosi paljon** |

The edit made the use row match its own build row. Post-edit the tile is consistent: **"a lot" = `paljon`**, **"really / very much" = `tosi paljon`** (S0346L04U03, S0346L03U04 untouched and still correct). Keep both edits.

---

## Sweep: same/similar English → two different Finnish forms

This is the direction that *is* a defect. Raw hit counts here are worthless — the naive query returns **206** groups, almost all of it Finnish case marking (`me` = mua/mulle/mun/mut) and person endings (`teen`/`teet`/`teette`). Handing over 206 would be noise. Tiered and hand-checked:

**Tier 1 — same tile, same English, different Finnish: 22 hits, 20 are false positives.** Twenty are the **component → build ladder**, which is the SSi method working exactly as designed (component `puhutko` → build `puhutko sä`; `voisitko` → `voisitko sä`). Not defects. The two real ones — **s162** "what do you think" and **s152** "differently" — are both labelling rather than grammar, and both now have concrete known-side proposals above.

**Tier 2 — same English (4+ words), different Finnish, anywhere: 3 hits, all false positives.** All three are the **formal/plural `te` register block** in the 640s, applied consistently (`ootko sä valmis lähtemään` s345 vs `oletteko te valmis lähtemään` s649). Legitimate different context, consistently applied — exactly the case Kai says is fine.

**Tier 3 — short English → lexically *different* Finnish word (not just inflection): 93 groups**, again mostly legitimate — English polysemy (`left` = jätit / lähti / jäljellä), interrogative vs relative (`when` = milloin in questions, kun as conjunction), case and person. A dozen genuine synonym-pair candidates (`how` = kuinka vs miten; `to watch` = katsoa vs the colloquial kattomaan; `ever` = koskaan vs ikinä; `happy` = tyytyväinen vs onnellinen) are under independent hand-check by a second session; **that result is not in yet and is listed as a gap below rather than guessed at.**

**Dropped from the open list as instructed:** the 9 `very`/`really` → `tosi` collapses. Per Kai's ruling, two English things sharing one Finnish target is not a defect. Not carried forward.

---

## Synonym hand-check — returned, and independently re-verified

The 12 candidate pairs went to a second session. **1 real defect, 11 false positives.** I re-ran its key claims against my own pull; all reproduce, so this is two independent passes agreeing, not one worker taken at face value.

The false positives had real reasons, and they are worth recording so nobody re-flags them: **`kovin` is a negative-polarity intensifier** — 35 of its 40 rows are negated, and I checked the 5 that aren't (three are bare tiles belonging to those same negated tiles, one is a question, both licensing contexts). **`kuinka` takes degree/quantity, `miten` manner**, no crossovers in 187 rows. **`ikinä` is not "ever" at all** — it occurs only inside `mitä ikinä` = "whatever". `jonkin muun`/`jotain muuta` and `idean`/`idealta` are one lexeme in two cases. Also verified: the formal `te` block starts at **seed 639** (not 640 as I assumed), and the sporadic earlier hits at 133/501/529 are genuine *plural* "you", not register leaks.

### The one real defect — seed 371 is a one-seed island

Not a register mix, which is what I had guessed. Seed 371 is the **only** seed in the course using the `katto-` stem; nine others (220, 221, 287, 288, 297, 313, 358, 585, 611) all use standard `katso-`. The same seed is also the only one using `leffa` where four others (221, 248, 433, 452) use `elokuva`. It affects **14 rows** including the seed and the LEGO.

| | Before | After | Safe? |
|---|---|---|---|
| stem, all 14 rows | `kattomaan` | **`katsomaan`** | **Yes** — `katso-` taught from seed 220, 69 occurrences before seed 371 |
| noun, 11 rows | `leffaa` | `elokuvaa` **or** `elokuvan` | **Needs Kai's choice — see below** |

**The `katsomaan` half is high confidence.** Merge it onto the stem the rest of the course already uses.

**The `leffaa` half I will not assert, because checking it the way I check everything else says it isn't clean.** The course teaches `elokuvan` (accusative, seed 221) and `elokuva` (nominative, seeds 248/433/452). It has **never shown `elokuvaa`**, the partitive. Swapping `leffaa` → `elokuvaa` would introduce an unshown form — the exact mistake this whole report is about. Kai's options: `elokuvaa` (regular partitive of a noun taught at s248, natural after `mennä katsomaan`), or `elokuvan` (attested at s221, but a different case). His call.

**One nuance stated honestly:** this course is colloquial throughout (`mä`, `sä`, `oo`, `haluu`), and `kattoa` is the colloquial form of `katsoa` — so seed 371 is arguably the *more* register-consistent one. But nine seeds against one means the course has settled on `katso-`, and consistency is the rule here. Same for `leffa`.

### A smaller defect the sweep wasn't built to catch — bare component tiles

The sentences are fine; the **single-word component tiles** collide. One English word, no context, two different answers:

| English | Tiles | Suggested relabel (known side only) |
|---|---|---|
| happy | `S0076L02C01` = tyytyväinen vs `S0129L01C02`/`S0408L02C01` = onnellinen | s76 → **"satisfied"** (that is what `tyytyväinen` means) |
| very | `S0055L04C02` = kovin vs `S0013L03C01`/`S0147L01C01` = tosi | s55 → **"particularly"** (fits its negative-polarity use: "didn't sleep particularly well") |
| ever | `S0480L01C02` = ikinä vs `S0309L01C02` = koskaan | s480 → **"-ever"**, since it only ever appears in `mitä ikinä` = "whatever" |
| to watch | `S0371L01C02` = kattomaan | resolved by the seed-371 merge above |
| how | `S0033L01C01` etc = kuinka vs `S0040L01C01` = miten | **Kai's judgement** — kuinka is degree, miten is manner; needs a gloss that carries that |
| thing | `S0047L01C03` = juttu vs `S0243L01C02` = asiaa | **Kai's judgement** — both genuinely mean "thing" |

Target text unchanged in every one of these; known side only.

### "really" / "very" present in English, absent in Finnish — 2 confirmed

The raw machine count was 15; **12 died to a missing stem (`oikeesti`)** and were dropped. Two survive, and they are isolated slips, not a cluster:

| Row | English | Finnish | Missing |
|---|---|---|---|
| fin_for_eng:S0346L03U02 | I **really** liked it today | mä tykkäsin siitä tänään | no intensifier |
| fin_for_eng:S0556L01U05 | they **really** like to play music in the evening | ne tykkää soittaa musiikkia illalla | no intensifier |

For s346 the clean fix is available inside its own tile — `tosi paljon` is taught two rows later at U04 — so either `mä tykkäsin siitä tosi paljon tänään`, or drop "really" from the English. Both are one-row edits; Kai picks. Note this is **not** the two-English-one-target case he ruled out — the English here promises an intensifier the Finnish never delivers.

---

## Gaps — things I could not determine

1. **81 component-tile collisions remain unaudited.** My pass found 87 bare-tile collisions with lexically different targets; six are handled above. The rest look like the same false-positive profile as everywhere else — pronoun case (`me`, `her`, `him`, `them`), polysemy (`left`, `right`, `time`, `saw`) — and at least one (`father`: isä/isää) is a false positive of my own 4-character stem heuristic on short words. **Likely mostly noise, but genuinely unchecked — I am not claiming a number.**
2. **The "after" verdict rests on only two rows of evidence** and is the weakest of the 11 false-positive calls.
3. **The necessive-case question in seed 523** (`mun pitää antaa tekosyyn` → `tekosyy`?) is genuinely contested between standard and colloquial Finnish. Flagged, deliberately not asserted.
4. **Untranslated intensifiers** — resolved above; 2 confirmed, 12 machine hits discarded.
5. **No audio consequence to verify.** `fin_for_eng` has 75 `course_audio` rows and all 75 are **English narration** — there is no Finnish target audio, so none of these text edits can have desynced a clip. Confirmed, not assumed.

---

## What I'd do next, in order

Each item below is independently approvable or rejectable:

1. **Seed 523 — Option A.** Rewrite B03 (both sides) so a build teaches `tekosyytä` before the first use demands it. One row, no new rows, nothing else in the tile moves. Until it lands, that tile tests a form it never taught.
2. **Seed 371** — merge `kattomaan` → `katsomaan` across 14 rows (high confidence). Decide the `leffaa` half separately.
3. **Seed 152 + seed 162** — two known-side relabels, four field edits total, no Finnish changes at all. Lowest-risk items here.
4. **Component-tile relabels** — 3 clear (happy/very/ever), 2 needing your judgement (how/thing). Known side only.
5. **The two untranslated "really"s** — s346 and s556, one row each.
6. **The 4 deletions** — restore or let stand; verbatim originals are in the rollback file. Under Kai's ruling deletion is a legitimate outcome, so "let stand" is now the easier call; I have no strong view.
7. **Leave alone**: fixes 1 and 2, and both seed-346 edits. They are correct as they stand.
