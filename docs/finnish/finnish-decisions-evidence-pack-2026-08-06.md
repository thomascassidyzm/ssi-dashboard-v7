# Finnish — decisions you need to make, with the evidence

**Nothing here has been applied.** No database writes, no audio generated, no money spent, nothing reverted. Every row below was re-read live from the database today, not copied from the last report — and in three places the live data disagrees with that report. Those disagreements are called out where they occur.

---

## Your ruling, and what it changed

You said the same-English-different-Finnish tiles are not defects:

> *"It needed to be different because we can't use onnellinen in some places, and we can't use tyytyväinen in other places… What we've done is try to separate the contexts to make it clearer. It's not the ideal solution but in this case it's the best we could do — we just need to make sure we don't have too many of these happening close to each other or early in the course."*

So I have **dropped all six relabelling proposals** from the last report. They are off the table.

What I did instead was build the check your rule actually asks for — *are any of these clustered, or early?* — and run it across the whole course. That is Part B, at the bottom. It cleared most of what the last report was worried about, and it turned up several collisions nobody had flagged — including two pairs sitting **one seed apart**.

**One thing you should know about how this document was made.** After I first sent it, I had a second session attack my own findings rather than confirm them. It broke several of them, and I have corrected them here — every correction re-checked by me against the live database. The collisions all turned out to be **tighter and earlier** than I first reported, and three of my explanations for them were wrong. Corrections are marked where they occur rather than quietly folded in.

**How to answer:** every section ends with a question you can answer with one word. You can reply to this document directly.

---

# Part A — the open decisions

Ordered smallest and least risky first.

---

## 1. Four small fixes — approve as a batch

Four separate one-field edits. None of them touches a single Finnish word except where noted. All four re-verified live today.

### 1a. Seed 152 — "differently" is used as the label for two different things

Seed 152 is *"I would have done it differently if I had known what you wanted"* — `Mä olisin tehnyt sen eri tavalla, jos mä olisin tiennyt, mitä sä halusit`. Seed 152 is round 426 of 1394, so a bit under a third of the way in.

Inside that seed's second tile, the learner meets:

| Row | English shown | Finnish expected |
|---|---|---|
| S0152L02**C01** | differently | `eri` |
| S0152L02**C02** | in a way | `tavalla` |
| S0152L02**B01** | differently | `eri tavalla` |

`eri` on its own means **different**, not *differently*. *Differently* is the two words together, `eri tavalla` — which is what B01 and all five practice phrases already say (`tehdä se eri tavalla`, `sanoa sen eri tavalla`, and so on). And `eri` is glossed as "different" elsewhere in the course, at seeds 319 and 457.

**Proposed change — English side only, one field:**

| Row | Field | Before | After |
|---|---|---|---|
| S0152L02C01 | English | differently | different |

Finnish `eri` unchanged.

**Does this introduce anything the learner hasn't met?** No. Nothing on the Finnish side moves at all.

**What the learner experiences if it stays wrong:** they're shown the word "differently", type the two-word answer they were just taught, and are marked wrong for not typing a single word that doesn't mean "differently".

### 1b. Seed 162 — "what do you think" is the label on two different answers

Seed 162 is *"what do you think about that?"* — `Mitä mieltä sä oot siitä?`. Round 447 of 1394.

| Row | English shown | Finnish expected |
|---|---|---|
| S0162L01C01 | what | `mitä` |
| S0162L01C02 | opinion | `mieltä` |
| S0162L01**B01** | **what do you think** | `mitä mieltä` |
| S0162L01**B02** | **what do you think** | `mitä mieltä sä oot` |

Two rows, identical English, different answers, back to back in the same tile. The components already name the pieces ("what" + "opinion"), so the chunk has an obvious name available.

**Proposed change — English side only, two fields:**

| Row | Field | Before | After |
|---|---|---|---|
| Lego card S0162L01 | English | what do you think | what opinion |
| S0162L01B01 | English | what do you think | what opinion |

Finnish `mitä mieltä` unchanged in both. B02 then becomes the only holder of "what do you think", which is what B03, B04 and all five practice phrases already do.

**Does this introduce anything new?** No. No Finnish changes.

### 1c. Seed 346 — the English promises "really", the Finnish doesn't deliver it

Seed 346 is *"I wanted her to know that I liked her book"* — `Mä halusin sen tietävän, että mä tykkäsin sen kirjasta`. Round 779 of 1394, so late-ish.

| Row | English shown | Finnish expected |
|---|---|---|
| S0346L03U01 | I liked it a lot | `mä tykkäsin siitä paljon` |
| S0346L03**U02** | **I really liked it today** | `mä tykkäsin siitä tänään` ← no "really" |
| S0346L03U04 | I liked it very much | `mä tykkäsin siitä tosi paljon` |

This is **not** the case you ruled on. Nothing here is one Finnish word serving two English ones. The English simply asks for an intensifier the Finnish never supplies.

The fix is available inside the same tile — `tosi paljon` is taught two rows later at U04.

| Row | Field | Before | After (pick one) |
|---|---|---|---|
| S0346L03U02 | Finnish | `mä tykkäsin siitä tänään` | `mä tykkäsin siitä tosi paljon tänään` |
| *or* S0346L03U02 | English | I really liked it today | I liked it today |

**Does either option introduce anything new?** No. `tosi paljon` is taught at seed 13 and again two rows below this one.

### 1d. Seed 556 — the same thing again, once

Seed 556 is *"they play music late at night"* — `Ne soittaa musiikkia myöhään yöllä`. Round 1227 of 1394 — very late in the course.

| Row | English shown | Finnish expected |
|---|---|---|
| S0556L01U05 | they **really** like to play music in the evening | `ne tykkää soittaa musiikkia illalla` ← no "really" |

Same shape as 1c, one row, isolated. Cleanest fix is to drop "really" from the English, since this tile has no intensifier of its own to lean on.

| Row | Field | Before | After |
|---|---|---|---|
| S0556L01U05 | English | they really like to play music in the evening | they like to play music in the evening |

**Does this introduce anything new?** No. Removing an English word only.

> ### ❓ Decision 1 — approve all four small fixes as a batch?
> **Yes / No** (or name the ones you want held back)

---

## 2. "how" — `kuinka` and `miten`, both taught in the first 40 seeds

This is one of the tiles you ruled on, so **I am not proposing a relabel.** The question is different now, and it comes from your own rule.

### What the learner sees

| Tile | Seed | Round | English shown | Finnish expected |
|---|---|---|---|---|
| S0003L01 (card) | **3** | 8 | how | `miten` |
| S0033L01C01 | **33** | 110 | how | `kuinka` |
| S0040L01C01 | **40** | 134 | how | `miten` |
| S0420L02C01 | 420 | — | how | `kuinka` |
| S0470L01C01 | 470 | — | how | `kuinka` |
| S0642L01C01 | 642 | — | how | `miten` (formal block) |

### The split is *mostly* real — but it leaks

I queried all 73 `kuinka` rows and all 82 `miten` rows. The division is largely as you'd expect:

- **`kuinka` mostly goes with a quantity or a degree** — *how long* (`kuinka kauan`), *how much* (`kuinka paljon`), *how many* (`kuinka monta`), *how old* (`kuinka vanha`), *how high* (`kuinka korkealle`), *how well* (`kuinka hyvin`).
- **`miten` goes with a manner** — *how to say something* (`miten sanoa jotain`), *how do you feel* (`miten sä voit`), *how it's going* (`miten se menee`).

**But there is at least one crossover, and I have to correct myself here** — my first pass claimed zero:

| Row | English shown | Finnish expected |
|---|---|---|
| S0245L01U04 | I'm really happy with **how you speak Finnish** | `mä oon tosi tyytyväinen siihen, kuinka sä puhut suomea` |

That is plain manner — no quantity, no degree — taking `kuinka`. Compare the near-identical row at seed 76 that takes `miten`:

| Row | English shown | Finnish expected |
|---|---|---|
| S0076L02U01 | I'm happy with **how you speak Finnish** | `mä oon tyytyväinen siihen, miten sä puhut suomea` |

**Almost the same English sentence, two different answers.** So the rule a learner would have to infer doesn't hold all the way.

### Why it is on your desk

It is the **earliest** collision in the course, and the two bare tiles are close.

- The two bare one-word "how" tiles are at **seed 33** (`kuinka`) and **seed 40** (`miten`) — **7 seeds apart**, both inside the first 6% of the course. (`miten` first appears even earlier, on a card at seed 3.)
- **Correction:** my first version of this document said the gap was 30 seeds. That was measuring `miten`'s seed-3 first appearance against `kuinka`'s at seed 33. The number that matters — the gap between the two bare tiles the learner actually has to choose between — is **7**. That trips *both* of your tests, not just earliness.
- For comparison, the `happy` pair you already accept has its members 30 seeds apart, and the earlier lands at seed 76.

Seed 76 is also the place the two "how" words first sit inside one tile:

| Row | English shown | Finnish expected |
|---|---|---|
| S0076L02U01 | I'm happy with **how** you speak Finnish | `mä oon tyytyväinen siihen, miten sä puhut suomea` |
| S0076L02U02 | I'm happy with **how much** I speak | `mä oon tyytyväinen siihen, kuinka paljon mä puhun` |

Here the English *does* disambiguate — "how" vs "how much". It is only the bare one-word tiles at seeds 33 and 40 that don't.

**What the learner experiences if this is a problem:** at around seed 33–40, six weeks of nerves in, they're shown the single word "how" twice within a week of study and marked wrong half the time depending on which one came up. They have no way to tell which is wanted.

**If you decide to act,** the lowest-cost option is *not* a relabel — it's leaving both words exactly as they are and moving one of the two bare tiles later, or letting the earlier tile carry its build's context ("how long" rather than bare "how"). I have not costed that because I don't want to build a proposal you haven't asked for.

> ### ❓ Decision 2 — is "how" at seeds 33 and 40 too early and too close together?
> **Accept / Act**

---

## 3. "thing" — `juttu` and `asia`, and a third label in the middle

Also one of the six you ruled on, so again **no relabel proposed.** But the live data is messier than the last report described, and you should see it.

### What the learner sees

| Tile | Seed | Round | English shown | Finnish expected |
|---|---|---|---|---|
| S0047L01C03 | **47** | 150 | thing | `juttu` |
| Seed 143 tiles | 143 | — | **matter** | `asia` |
| S0243L01C02 | **243** | 598 | thing | `asiaa` |
| S0257L01 tile | 257 | 618 | thing | `jutusta` |
| Seeds 573/607/608/609 | 573+ | — | thing / things | `asia` / `asiat` |

The last report described this as a two-way choice, `juttu` vs `asia`. It is really three-way, because **seed 143 already tries your technique and glosses `asia` as "matter"**, and then seed 243 abandons that and glosses it as "thing" again.

Seed 143's rows read a little oddly in English as a result:

| Row | English shown | Finnish expected |
|---|---|---|
| S0143L02B02 | a good **matter** | `hyvä asia` |
| S0143L02U02 | it is a good **matter** | `se on hyvä asia` |
| S0143L02U05 | it is the same **matter** as yesterday | `se on sama asia kuin eilen` |

Meanwhile `juttu` owns "a good thing" from seed 47 onwards — `on hyvä juttu`, `se on hyvä juttu`, 58 rows across 19 seeds.

### Where it falls — and a correction that makes this much worse

My first version of this document said the two members were 196 seeds apart (seed 47 vs seed 243) and called this the weakest of the three items. **That was wrong, and it was wrong because my check only matched English wording exactly.** It treated "thing" and "things" as unrelated.

The real nearest pair is four seeds apart:

| Row | Seed | Round | English shown | Finnish expected |
|---|---|---|---|---|
| S0047L01C03 | **47** | 150 | thing | `juttu` |
| S0051L04C02 | **51** | 162 | thing**s** | `asioita` |

**Four seeds, twelve rounds.** That trips your clustering test as well as your earliness test, and it makes this the second-tightest collision found anywhere in the course.

I also could not verify any split between `juttu` and `asia`. Across the seven seeds involved, the distribution looks arbitrary rather than context-separated — `hyvä juttu` at seed 47 and `hyvä asia` at seed 143 are the same phrase with the same meaning, and the only thing distinguishing them is that seed 143 relabels the English to "matter".

**What the learner experiences:** at seed 47 they learn `juttu` = thing. Four seeds later they're shown "things" and expected to produce `asioita` — a different word, not a plural of the first one. Nearly 200 seeds after that, "thing" comes back wanting `asiaa`. In between, seed 143 teaches them `asia` under a different English word again.

> ### ❓ Decision 3 — is "thing" a problem, or accepted technique?
> **Accept / Act**

---

## 4. Seed 371 — the island. The full case.

This is the biggest item and the one you asked to see. Here is all of it.

### The seed

> **Seed 371** — *"I went to see a film on Wednesday"*
> `Mä menin kattomaan leffaa keskiviikkona`

Round **828 of 1394** — a bit past halfway. Not early.

### What makes it an island

Seed 371 uses **two words that appear nowhere else in the course**, where the rest of the course has settled on different words for the same things.

**Word 1 — `kattomaan` ("to watch").** This is the colloquial form. Ten other seeds use the standard `katso-` stem. The base word `kattoa` that `kattomaan` comes from **never appears anywhere in the course at all** — so the learner has no way to connect it to anything.

**Word 2 — `leffaa` ("a film").** This is slang for a film. Four other seeds use the standard word `elokuva`. Again, the base word `leffa` never appears anywhere else.

### All 15 affected rows, in play order

Thirteen practice phrases, plus the lego card, plus the seed sentence itself.

| # | Row | English shown | Finnish expected |
|---|---|---|---|
| — | **Seed 371** | I went to see a film on Wednesday | `Mä menin kattomaan leffaa keskiviikkona` |
| — | **Lego card S0371L01** | I went to see a film | `mä menin kattomaan leffaa` |
| 1 | S0371L01C01 | I set off | `mä menin` |
| 2 | S0371L01**C02** | to watch | `kattomaan` |
| 3 | S0371L01**C03** | a movie | `leffaa` |
| 4 | S0371L01B01 | I went to see a film | `mä menin kattomaan leffaa` |
| 5 | S0371L01B02 | I went to see a film yesterday | `mä menin kattomaan leffaa eilen` |
| 6 | S0371L01B03 | I went to see a film today | `mä menin kattomaan leffaa tänään` |
| 7 | S0371L01U01 | I reckon I went to see a film | `mä luulen, että mä menin kattomaan leffaa` |
| 8 | S0371L01U02 | I went to see a film with your friend | `mä menin kattomaan leffaa sun kaverin kanssa` |
| 9 | S0371L01U03 | I went to see a film on my own | `mä menin kattomaan leffaa yksin` |
| 10 | S0371L01U04 | I went to see a film after you left | `mä menin kattomaan leffaa, sen jälkeen kun sä lähdit` |
| 11 | S0371L01U05 | I went to see a film with someone else | `mä menin kattomaan leffaa jonkun muun kanssa` |
| 12 | S0371L01U06 | I went to see a film last month | `mä menin kattomaan leffaa viime kuussa` |
| 13 | S0371L01U07 | I went to see a film on Sunday morning | `mä menin kattomaan leffaa sunnuntaiaamuna` |
| 14 | S0371L02B02 | I went to watch on Wednesday | `mä menin kattomaan keskiviikkona` |
| 15 | S0371L02U01 | I went to see a film on Wednesday | `mä menin kattomaan leffaa keskiviikkona` |

`kattomaan` is in **15** of those rows. `leffaa` is in **14** of them (all except S0371L02B02).

> **Correction to the record:** the last report said 14 rows. Live count is 15 for the watching word. It counted the two words together as one set; they aren't quite the same set.

### The ten seeds that use `katso-` instead

Every one of these was read live today.

| Seed | An example row | Finnish |
|---|---|---|
| **220** | did you watch a bit of television? | `Katsoitko sä vähän televisiota?` |
| **221** | I watched a film | `mä katsoin elokuvan` |
| **287** | to watch television | `katsoa televisiota` |
| **288** | most people like watching television | `useimmat ihmiset tykkää katsoa televisiota` |
| **297** | I don't know many people who like watching television | `mä en tunne monia ihmisiä, jotka tykkää katsoa televisiota` |
| **313** | to watch all five games | `katsoa kaikkia viittä peliä` |
| **358** | your friend said that I watched it | `sun kaveri sanoi, että mä katsoin sen` |
| **567** | to be watching television | `katsella televisiota` |
| **585** | to look from the window | `katsoa ikkunasta` |
| **611** | to go look | `mennä katsomaan` |

> **Correction to the record:** the last report listed nine seeds. Live data shows **ten** — it missed seed 567 (`katsella`). Seven of the ten come *before* seed 371.

### The four seeds that use `elokuva` instead

| Seed | An example row | Finnish |
|---|---|---|
| **221** | I watched a film | `mä katsoin elokuvan` |
| **248** | the film was really good | `elokuva oli tosi hyvä` |
| **433** | when the film started | `milloin elokuva alkoi` |
| **452** | they didn't say when the movie started | `ne ei sanonut, milloin elokuva alkoi` |

Two of the four (221 and 248) come before seed 371, so the learner already knows this word by the time they hit the island.

---

### 4a. The watching word — `kattomaan` → `katsomaan`

**Does this introduce anything the learner hasn't already met?** I checked this properly rather than assuming, and the answer has a wrinkle the last report missed.

- The stem `katso-` is taught long before: seed 220, and it appears **69 times before seed 371**. ✅
- The `-maan` ending is taught heavily before: **19 different verbs** carry it before seed 371, starting at seed 24 (`muistamaan`, `lähtemään`, `puhumaan`, `auttamaan`, `antamaan`, `avaamaan`…). ✅
- **But the exact word `katsomaan` does not appear until seed 611** — 240 seeds *after* 371.

So `katsomaan` would be a new word-form at seed 371, built by combining two things the learner knows well. That is ordinary SSi composition, and the alternative is worse: `kattomaan` is built from `kattoa`, which the course **never shows at all**, not once. Swapping strictly *reduces* how much the learner has to invent.

**Verdict: safe, and I'd recommend it** — but I am stating the seed-611 fact loudly rather than calling it "already taught", because it isn't.

**Also worth knowing:** seed 371 is the first place in the entire course where a movement verb is followed by a `-maan` verb (`menin kattomaan` = "went to watch"). The next earliest is seed 471. And `menin` — the past tense of "go" — appears **only** at seed 371 and nowhere else in the course. Neither is a defect in itself; seed 371's own component tile teaches both. But it means this seed is an island in more ways than the film word alone.

> ### ❓ Decision 4a — merge `kattomaan` → `katsomaan` across all 15 rows?
> **Yes / No**

---

### 4b. The film word — this is the one that needs your judgement

You told us that swapping to the obvious partitive would introduce a form the course has never shown. **That is true, and I confirmed it live:** `elokuvaa` appears **zero times** in the entire course.

But I checked one step further than the last report did, and it changes the picture.

**Option A — `leffaa` → `elokuvaa`**

New word-form? Yes, `elokuvaa` is new. New *pattern*? **No.** The course teaches this exact pattern — an a-ending noun taking `-a` — with at least three nouns where the learner sees **both** forms before seed 371:

| Noun | Base form, first seen | `-aa` form, first seen |
|---|---|---|
| `ongelma` (problem) | seed 134 | `ongelmaa`, seed 141 |
| `asia` (matter) | seed 143 | `asiaa`, seed 243 |
| `kirja` (book) | seed 164 | `kirjaa`, seed 180 |

plus `tarinaa` (seed 36), `koiraa` (seed 69), `roskaa` (seed 248), `faktaa` (seed 311).

And `elokuva` itself is taught at **seed 248**, 123 seeds before the island.

Here is the part that matters most: **the current row already asks the learner to do exactly this derivation.** `leffaa` is `leffa` + the same ending. So they are already being asked to invent a form — just on a word the course never teaches, instead of one it does. Option A doesn't add novelty; it moves the novelty onto solid ground.

**Option B — `leffaa` → `elokuvan`**

New word-form? **None at all.** `elokuvan` is taught at seed 221 in `mä katsoin elokuvan` ("I watched a film"). Zero novelty.

The cost is a shade of meaning: `elokuvan` suggests watching the film through to the end, `elokuvaa` suggests watching without that implication. Both are correct Finnish after "I went to see". `elokuvan` is the more conservative call.

| | Introduces a new word? | Introduces a new pattern? |
|---|---|---|
| **Keep `leffaa`** | The word `leffa` is taught nowhere in the course | No |
| **A — `elokuvaa`** | Yes, one new form of a word taught at seed 248 | **No** — pattern taught with 3+ nouns before seed 371 |
| **B — `elokuvan`** | **No** — taught at seed 221 | No |

**My read:** Option B is the zero-risk choice and I'd take it if you want this closed with no argument. Option A is the more natural Finnish and is *not* the mistake it was described as last time — but it is your call, and I'm not asserting it over your stated constraint.

**What the learner experiences today if this stays:** at seed 371 they are asked to produce a slang word for "film" that the course has never taught them, in a form the course has never shown, when they already know the standard word from seed 248 and would answer with that and be marked wrong.

> ### ❓ Decision 4b — the film word: keep `leffaa`, swap to `elokuvaa` (A), or swap to `elokuvan` (B)?
> **Keep / A / B**

---

# Part B — the new check your rule created

Your rule says these collisions are fine *unless* they cluster or land early. So I built exactly that check and ran it over the whole of Finnish for English speakers.

**Read-only.** The detector queries the database and writes nothing. No flags were added to the proofreading tool — flagging is yours.

## Calibration first — before any number

You will not trust a detector that hasn't found something you already know is there. So I ran it against the `happy` pair as a known positive before looking at anything else.

**It found it.** And it found a member the last report missed:

| Tile | Seed | English shown | Finnish expected |
|---|---|---|---|
| S0076L02C01 | 76 | happy | `tyytyväinen` |
| S0106L02 | **106** | happy | `onnellisia` ← not in the last report |
| S0129L01C02 | 129 | happy | `onnellinen` |
| S0408L02C01 | 408 | happy | `onnellinen` |

**It classified it correctly: accepted technique, not a defect.** The two nearest members are 30 seeds apart, and the earliest lands at seed 76. Under the thresholds below, it clears on both counts. That is the answer your ruling requires, and the detector produced it without being told.

One useful thing that calibration told me: at 30 seeds apart, `happy` is the **tightest gap of anything you have accepted**. It sits right on the line. That is what I used to set the line.

## The thresholds, and why

**"Close together" = the two words' first appearances are 25 seeds apart or less.**
Three reasons. Across all the real candidates the median gap is 73 seeds and the bottom quarter is under 17, so 25 isolates a genuinely tight tail rather than half the course. It sits just under the `happy` pair at 30, so your accepted case survives. And at roughly two rounds per seed, 25 seeds is over 50 rounds of practice in between — anything tighter than that is plausibly still in the learner's head from last time.

**"Early" = either word first appears at seed 50 or before** — the first 7.5% of the course, the first ~104 rounds of 1394.

I want to be straight with you: **this one is a judgement call, not something I derived.** What pins it is your own ruling — it has to be below seed 76, or `happy` would flag and contradict you. 50 is the round number below that. The sensitivity is narrow and easy to state:

- Set it at **30** instead: "thing" (seed 47) and "know" (seed 49) drop off. "how" and "very" still flag.
- Set it at **75**: nothing changes.
- Set it at **100**: `happy` starts flagging, which contradicts your ruling. So 100 is too high.

So the usable range is 50–75, and only two marginal items move inside it. **If you'd rather set the line yourself, say a number and I'll re-run.**

There is also a subtlety worth one sentence: a collision doesn't *exist* for the learner until they meet the **second** word. So arguably it's the second member's position that measures the danger, not the first. I've flagged on either member as you asked, but I report both numbers so you can apply the stricter reading if you prefer.

## What I started with, what I killed, what survived

**Treat the last report's "81 unaudited" as dead.** It came from a different and looser method (matching similar-looking words). I rebuilt the check from scratch on exact English matching, so the numbers don't map onto each other and I'm not carrying that 81 forward. Here is my own funnel, honestly:

| Stage | Count |
|---|---|
| English prompts with more than one Finnish answer, raw | **240** |
| — killed: the component→build ladder (`puhutko` → `puhutko sä`), which is the method working as designed | −49 |
| — killed: the formal/plural "you" block from seed 639 on, applied consistently | −8 |
| — killed: Finnish case and person endings on one single word, caught automatically | −56 |
| **Candidates left** | **127** |
| — cleared by your own rule: far apart *and* late, so accepted technique, no adjudication needed | −70 |
| **Hand-checked one by one** | **57** |
| — killed as my own false positives (see below) | −50 |
| **Genuinely two different Finnish words, and close or early** | **7** |
| **+ found only by a second, meaning-based sweep that my method was blind to** | **+3** |
| **Total on your desk** | **10** |

### The 50 I killed, and why

I hunted my own errors rather than reporting the raw number. They fell into three groups:

- **44 were Finnish word endings, not different words** — my automatic filter uses a shared-prefix test that fails on short Finnish words, so it let through things like "you" (`sä` / `sun` / `sua` / `sulle` / `sulla` / `sut`), "me" (`mun` / `mua` / `mulle`), "said" (`sanoit` / `sanoi` / `sanonut` / `sanoin`), "man" (`mies` / `miehen` / `miehestä`), "name" (`nimen` / `nimeä` / `nimi`), "wanted" (`halusin` / `halusit` / `halusi`). All one word in different cases or persons. Not collisions.
- **5 were English words with two genuinely different meanings** — "left" (`jätit` = left behind, `lähti` = departed, `jäljellä` = remaining), "that" (conjunction vs pointing word), "who" (question word vs joining word). Each Finnish word is right for its own English sense.
- **1 was a fragment label** — a component tile whose English is a slice of the chunk it belongs to and is never asked on its own. "in time" at seed 89 is only part of "in a short time" (`lyhyessä ajassa`). Not a real collision. ("any" was the second of these; I have moved it onto the flagged table above and disclosed the judgement, because it mechanically trips your clustering test.)

### The survivors, scored against your rule

**This table has been corrected since I first sent it.** A second session was asked to attack my findings rather than confirm them, and it broke several of them. Every correction below reproduces against the live database — I re-checked each one myself rather than taking the second session's word for it. The changes all go the same direction: **the collisions are real, but tighter and earlier than I first reported, and three of my explanations for them were wrong.**

| # | English | The two words | Seeds | Gap | Close? | Early? | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | that person | `se henkilö` / `toi henkilö` | 388, **389** | **1** | **YES** | no | **Flag — clustered** |
| 2 | thing / things | `juttu` / `asioita` | **47**, **51** | **4** | **YES** | **YES** | **Flag — both** |
| 3 | how | `kuinka` / `miten` (bare tiles) | **33**, **40** | **7** | **YES** | **YES** | **Flag — both** |
| 4 | very | `tosi` / `kovin` | **13**, **55** | 42 | no | **YES** | **Flag — early** |
| 5 | when | `kun` / `milloin` | **34**, 79 | 45 | no | **YES** | **Flag — early** |
| 6 | know | `tietää` / `tuntea` | **45**, 85 | 40 | no | **YES** | **Flag — early** |
| 7 | any | `mitään` / `tahansa` | 508, 531 | 23 | **YES** | no | Hand-killed by me — see below |

**What changed from my first version, and why:**

- **#2 "thing" moved from 196 seeds apart to 4.** My check matched English exactly, so it never compared "thing" (seed 47) with "things" (seed 51). Different Finnish word, not a plural. This is now the second-worst item in the course.
- **#3 "how" moved from 30 seeds to 7.** I had measured `miten`'s earliest appearance anywhere (seed 3) instead of the gap between the two bare tiles the learner actually has to choose between (seeds 33 and 40).
- **#5 "when" was in my first version marked Accepted. That was wrong.** I looked only at component tiles and found `kun` at seed 51. There is a bare lego card **S0034L06, "when" → `kun`, at seed 34** that I skipped. Seed 34 trips your earliness test. The split itself is clean — `kun` joins clauses, `milloin` asks questions, zero crossovers across all rows — but it is early.
- **#4 "very": my reassurance was too clean.** `kovin` really is a negative-polarity word — 28 of its 31 rows are negated. But the reverse doesn't hold: `tosi` appears under negation **nine times**, including the same collocation five seeds later. Seed 55: "I didn't sleep very well" → `mä en oo nukkunut **kovin** hyvin`. Seed 60: "I don't know how to speak Finnish very well yet" → `mä en vielä osaa puhua suomea **tosi** hyvin`. Both negated, both "very well", five seeds apart, nothing to choose by.
- **#6 "know" is four words, not two** — `osata` (seed 11), `tietää` (seed 45), `tuntea` (seed 85), `tutustua` (seed 133). The `tietää`/`tuntea` split is clean with zero crossovers, but `osata` creates a separate problem, below.
- **#7 "any" I killed by hand and I'm disclosing it.** It is an exact English match, 23 seeds apart, so it mechanically trips your clustering test. I killed it because neither row is ever asked on its own — "any" at seed 508 is a slice of `ei oo mitään järkeä` ("there's no point") and at seed 531 a slice of `kuka tahansa` ("anybody"). I still think that's right, but it was my judgement overriding the rule, so it belongs on the list rather than silently absent.

### Four more the exact-match method could never have seen

The second session ran a meaning-based sweep as well as an exact one. These are collisions where the English is worded slightly differently, so my check was blind to them by construction. All four verified live.

**A. "know how to" — `osata` vs `tietää miten`. Adjacent seeds. This is the worst thing in the report.**

| Row | Seed | English shown | Finnish expected |
|---|---|---|---|
| S0011L02 (card) | **11** | to know how to speak | `osata puhua` |
| S0013L02U03 | 13 | I'd like to know how to speak well | `mä haluaisin osata puhua hyvin` |
| S0059L01B04 | **59** | I know how to say something in Finnish | `mä tiedän **miten** sanoa jotain suomeksi` |
| S0059L01U04 | **59** | I know how to answer now | `mä tiedän **miten** vastata nyt` |
| S0060L01C03 | **60** | know how | `osaa` |
| S0060L01B02 | **60** | I don't know how to speak yet | `mä en vielä **osaa** puhua` |

The identical English frame — *know how to [verb]* — is `osata` at seeds 11, 13 and 60, and `tiedän miten` at seed 59. **Seeds 59 and 60 are adjacent.** This is the same shape as the "that person" finding and it happens 330 seeds earlier, in the nervous stretch.

**B. "need to" — `pitää` vs `tarvita`, one seed apart.**

| Row | Seed | English shown | Finnish expected |
|---|---|---|---|
| S0044L03 (card) | **44** | I need to | `mun pitää` |
| S0045L01 (card) | **45** | I don't need to | `mun ei tarvii` |

In fairness this one has a genuine grammatical reason — `ei tarvitse` is the standard Finnish negative of `pitää`, so it is arguably correct rather than arbitrary. But the learner meets "I need to" → `pitää` and "I don't need to" → `tarvita` one seed apart with nothing marking the switch. Worth your eye; I am not claiming it's a defect.

**C. "thing" / "things"** — already folded into #2 above.

**D. "can" rendered four ways inside the first 62 seeds** — `pystyn` (seed 7), `osata` (seed 11), `en pysty` (seed 24), and at seed 10 no modal word at all. This is the weakest of the four, because English "can" genuinely covers ability, permission and knowing-how, and each Finnish word is right for its own sense. Reporting it for completeness rather than flagging it.

> ### ❓ Decisions 6–10 — the collisions found by the corrected check
> Each is **Accept** (deliberate technique, leave it) or **Act** (too close or too early, do something about it). If you say Act on any of them I'll come back with costed options — I have not built proposals you haven't asked for.
>
> | | What | Why it's here |
> |---|---|---|
> | **6** | "know how to" — `osata` (s11/13/60) vs `tiedän miten` (s59) | Adjacent seeds, and early |
> | **7** | "when" — `kun` (s34) vs `milloin` (s79) | Early. Split itself is clean |
> | **8** | "very" — `tosi` (s13) vs `kovin` (s55) | Early, and both appear negated |
> | **9** | "know" — `osata` / `tietää` / `tuntea` / `tutustua` | Four words, first at seed 11 |
> | **10** | "need to" — `pitää` (s44) vs `tarvita` (s45) | One seed apart, but grammatically motivated |

### Everything else is accepted technique

The other 233 groups are **not defects.** That includes `ever` (`koskaan`/`ikinä`, 171 seeds apart), `sorry` (`pahoillani`/`sori`), `on my own` (`itse`/`yksin`), and `happy` itself.

### One method note the calibration exposed

The `happy` result held up under attack — gap 30, earliest seed 76, clear on both counts, correct for the right reason. But it only comes out at 30 **because the method collapses word-endings first**: `onnellisia` (seed 106) and `onnellinen` (seed 129) are one word in two forms, and their raw string gap is 23, which would trip your clustering test if anyone re-ran this without that collapse step. Worth recording, because that step is doing all the work.

Also worth recording: `happy to` → `mielellään` (seeds 344 and 448) is a **third** Finnish word for "happy" that only the meaning-based sweep found. It is neither close nor early, so it changes nothing — but it is another instance of the exact-match method's blind spot.

## The one new finding: seeds 388 and 389 sit one seed apart

This is the only thing the check turned up that nobody has flagged, and it is the clearest hit against your rule in the whole course — **one seed apart, two rounds apart** (rounds 864 and 866).

Seed 388 is *"that person you work with"* — `Se henkilö, jonka kanssa sä teet töitä`.
Seed 389 is *"that person over there"* — `Toi henkilö tuolla`.

Seed 389 is where the course teaches `toi` — "that one over there", pointing at something at a distance — against seed 388's `se`. That distinction is real and worth teaching.

**And seed 389 does apply your technique.** Look at what it does with the English:

| Row | English shown | Finnish expected |
|---|---|---|
| S0389L01C01 | that **one** | `toi` |
| S0389L01B02 | that nice person | `toi kiva henkilö` |
| S0389L01B03 | that person **over there** | `toi henkilö tuolla` |
| S0389L01B04 | that person **here** | `toi henkilö täällä` |
| S0389L01U01–U05 | that person **over there** … | `toi henkilö tuolla` … |

Nine of the eleven rows carry a disambiguator — "over there", "here", "one". That is exactly what you described doing.

**Two rows don't:**

| Row | English shown | Finnish expected |
|---|---|---|
| **Lego card S0389L01** | that person | `toi henkilö` |
| **S0389L01B01** | that person | `toi henkilö` |

And one seed earlier, seed 388 has the identical bare English:

| Row | English shown | Finnish expected |
|---|---|---|
| S0388L01B02 | that person | `se henkilö` |
| S0388L01U01 | that person is really nice | `se henkilö on tosi kiva` |
| S0388L01U04 | that person wants to help | `se henkilö haluu auttaa` |

So the learner meets "that person" → `se henkilö` at seed 388, and then, in the very next round but one, "that person" → `toi henkilö`, with nothing in the English to tell them which.

**What the learner experiences:** two days apart, the same three English words want two different Finnish answers, and they are given no way to know which. It is not that the distinction is wrong — it's that these two particular rows dropped the disambiguator the rest of the tile carries.

**The smallest possible fix** — and this is the same move seed 389 already makes on nine of its own rows, so it introduces nothing new at all:

| Row | Field | Before | After |
|---|---|---|---|
| Lego card S0389L01 | English | that person | that person over there |
| S0389L01B01 | English | that person | that person over there |

Finnish `toi henkilö` unchanged in both. Nothing on the Finnish side moves. Note `tuolla` ("over there") is taught in this same tile at B03, so if you'd rather the Finnish match the new English exactly, that's available too — but the English-only version is the zero-risk one.

> ### ❓ Decision 5 — fix the two bare "that person" rows at seed 389?
> **Yes / No**

---

# Gaps — things I could not settle

Stated plainly rather than papered over.

1. **The "early" threshold is a judgement, not a measurement.** I pinned it below seed 76 because your acceptance of `happy` requires that, and picked 50. It now matters less than it did: after the corrections below, "thing" trips the *clustering* test as well (4 seeds apart), so it flags whatever you set earliness to. "when" (seed 34), "know" (seed 45) and "very" (seed 13) flag on earliness alone. Give me a number and I'll re-run.
2. **The exact-match blind spot was real and it cost me findings.** My check paired English prompts only when they matched word for word. A second session ran a meaning-based sweep and found four collisions I was structurally incapable of seeing — including the worst item in this report ("know how to", adjacent seeds 59 and 60) and the correct 4-seed gap for "thing". Those are now folded in above. The meaning-based sweep is a judgement pass rather than a query, and it was **not** independently corroborated: that session tried to dispatch three workers to sweep the early course in parallel and all three were refused by the worker-depth limit. So the near-miss findings rest on a single pass. A meaning-pair neither of us thought to look for could still be there.
3. **Neither pass examined the `decomposition` or `display_tiling` data.** If a tile's displayed English can differ from the stored English, a collision could be hiding there. Unchecked.
4. **The seed 371 register argument still stands and I have not resolved it.** The whole course is colloquial (`mä`, `sä`, `oo`, `haluu`), and `kattoa`/`leffa` are the colloquial forms — so seed 371 is arguably the *more* register-consistent seed and the other ten are the odd ones out. I'm recommending the merge on consistency grounds, ten seeds against one, but that is a defensible disagreement and it's yours to make.
5. **Nothing here has any audio consequence.** I confirmed rather than assumed: `fin_for_eng` has no Finnish target audio at all, so none of these text edits can have knocked a recording out of sync.

---

# Summary — five one-word answers

| | Decision | Answer with |
|---|---|---|
| **1** | Four small fixes (seeds 152, 162, 346, 556) as a batch | **Yes / No** |
| **2** | "how" — `kuinka` vs `miten` at seeds 33 and 40, too early? | **Accept / Act** |
| **3** | "thing" — `juttu` vs `asia`, first at seed 47 | **Accept / Act** |
| **4a** | Seed 371 — merge `kattomaan` → `katsomaan`, 15 rows | **Yes / No** |
| **4b** | Seed 371 — the film word | **Keep / A (`elokuvaa`) / B (`elokuvan`)** |
| **5** | Seed 389 — fix the two bare "that person" rows | **Yes / No** |
| **6** | "know how to" — `osata` vs `tiedän miten` at adjacent seeds 59/60 | **Accept / Act** |
| **7** | "when" — `kun` at seed 34 vs `milloin` at seed 79 | **Accept / Act** |
| **8** | "very" — `tosi` (s13) vs `kovin` (s55), and both appear negated | **Accept / Act** |
| **9** | "know" — `osata` / `tietää` / `tuntea` / `tutustua`, first at seed 11 | **Accept / Act** |
| **10** | "need to" — `pitää` (s44) vs `tarvita` (s45) | **Accept / Act** |
| — | Should I re-run with a different "early" line than seed 50? | **a number, or leave it** |
