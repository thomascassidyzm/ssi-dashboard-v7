# eng_for_sin ask/hear — corpus evidence snapshot

**Captured 2026-08-17 by direct `psql` against the live Supabase estate**, before the session
pooler saturated. Every table below is literal query output, not a reconstruction. This file
exists so that verification of the ask/hear ruling is **self-contained**: a refuter or scout can
attack the argument from these rows without holding a DB connection.

Course orientation, because it inverts the usual reading: **`eng_for_sin` teaches English TO
Sinhala speakers.** Sinhala is the **known / prompt** side (`known_text`); English is the
**target** the learner produces (`target_text`). So the ambiguity lives in the prompt, and ZUT —
one known prompt → exactly one target form — is what it threatens.

The verb at issue: **අහනවා** (past **ඇහුවා**) genuinely means both *ask* and *hear*.

---

## 1. Every seed whose known side contains අහ / ඇහු / විමස

Query:

```sql
select seed_number,
       (known_text ~ 'ගෙන්') as has_ablative,
       (known_text ~ 'ප්‍රශ්න') as has_question_noun,
       target_text
from course_seeds
where course_code = 'eng_for_sin' and known_text ~ 'අහ|ඇහු|විමස'
order by seed_number;
```

28 rows. `sense` and `abl` columns added by hand from the English target and from the
known-side text; `abl` is `t` where an ablative addressee clitic `-ගෙන්` **or** `-යෙන්` is
present. **Note the regex above misses seed 136**, which marks its addressee `ඇයෙන්`
(the `-යෙන්` allomorph) rather than `ඇයගෙන්` — corrected in the `abl` column.

| seed | abl | q-noun | sense | English target |
|---|---|---|---|---|
| 30 | t | f | ASK | I wanted to ask you something yesterday. |
| 99 | f | f | ASK | You should ask yourself why it's not working. |
| 103 | f | f | HEAR | We're not trying to hear many more words. |
| 119 | f | f | ASK | Can I ask you something before you leave? |
| 136 | **t** | f | ASK | Of course you can ask her because she's my friend. |
| 176 | t | f | ASK | I'll ask him if he'll be able to help next year. |
| 177 | t | f | ASK | I'll ask her where she wants to go. |
| 190 | t | t | ASK | Do you mind if I ask you some questions? |
| 196 | f | f | HEAR | Have you heard the latest idea? |
| 208 | t | f | ASK | I didn't want to ask you how to say it. |
| 223 | t | f | ASK | He's going to ask you tomorrow. |
| 364 | f | f | HEAR | I heard that he didn't like that place. |
| 365 | f | f | HEAR | I didn't hear what she said to him. |
| 366 | f | f | HEAR | Did you hear what he wanted to grow? |
| 368 | f | f | HEAR | Yes I heard that he wanted to grow tomatoes. |
| 380 | f | f | ASK | I asked what she wanted to include. |
| 381 | f | f | ASK | I didn't ask if he wanted to follow us. |
| 382 | f | f | ASK | Did you ask where he wanted to put it? |
| 399 | f | f | — | We don't want to lose hope. (`අහිමි` — unrelated homograph) |
| 405 | f | f | ASK | Should we ask if we have to book? |
| 415 | f | t | ASK | That wouldn't be a problem if you ask me. |
| 420 | f | f | ASK | They don't need to ask how old he is. |
| 423 | f | t | ASK | Do they need to ask such an obvious question? |
| 465 | f | f | ASK | Next time I will ask her what her name is. |
| 509 | f | f | HEAR | I heard that you're going to pay for a new bed. |
| 533 | f | f | HEAR | She won't listen to every word you say. |
| 597 | f | f | HEAR | I suspect that he's heard a hundred stories about it. |
| 598 | f | f | HEAR | He's heard a thousand stories about what they were doing. |

**Sense totals: 17 ASK, 10 HEAR, 1 unrelated.** Both senses are unavoidably required by the
course, so "pick one sense and align the outlier" is not an available fix.

### The load-bearing asymmetry

| | ASK | HEAR |
|---|---|---|
| ablative addressee present | **7** (30, 136, 176, 177, 190, 208, 223) | **0** |
| ablative addressee absent | 10 (99, 119, 380, 381, 382, 405, 415, 420, 423, 465) | **10** (103, 196, 364, 365, 366, 368, 509, 533, 597, 598) |

Read honestly, this is a **one-directional** cue:

- **ablative ⇒ ASK** holds at 7/7, with **zero** counterexamples in the hear column. Precision 100%.
- **bare ⇒ HEAR** does **not** hold. Ten ASK seeds are bare. Recall is 7/17 ≈ 41%.

Any claim that the learner can read a bare `ඇහුවා` as *hear* is therefore **not** supported by
the corpus as it stands — it only becomes true for the specific prompts where the ASK member has
been marked. That limitation is the main thing a refuter should press on.

### Full known-side text for the ablative-marked and contested seeds

| seed | known_text (Sinhala) | English target |
|---|---|---|
| 30 | ඊයේ **ඔයාගෙන්** මොකක් හරි අහන්න ඕනේ හිතුනා. | I wanted to ask you something yesterday. |
| 136 | ඇය මගේ යාළුවා නිසා **ඇයෙන්** අහන්නට පුළුවන්. | Of course you can ask her because she's my friend. |
| 176 | ලබන අවුරුද්දේ ඔහුට උදව් කරන්න පුළුවන්ද කියලා මම **ඔහුගෙන්** අහනවා. | I'll ask him if he'll be able to help next year. |
| 177 | ඇය යන්න ඕනේ කොහෙද කියලා මම **ඇයගෙන්** අහනවා. | I'll ask her where she wants to go. |
| 190 | මම **ඔයාගෙන්** ප්‍රශ්න කිහිපයක් ඇහුවොත් කමක් නෑද? | Do you mind if I ask you some questions? |
| 208 | ඒ කොහොමද කිව්වේ කියලා **ඔයාගෙන්** ඇහුවේ මම ඕනෑකමින් නෙමේ. | I didn't want to ask you how to say it. |
| 223 | ඔහු හෙට **ඔයාගෙන්** අහනවා. | He's going to ask you tomorrow. |
| 119 | ඔයා යන්නට කලිං මොකක් හරි අහන්නට පුළුවන්ද? | Can I ask you something before you leave? |
| 420 | ඔහු කොච්චර කාලද කියලා ඒ අයට අහන්නේ ඕනෑ නෑ. | They don't need to ask how old he is. |
| 99 | ඔයා **විමසන්න** ඕනේ ඔයාටම ඇයි ඒක ක්‍රියා කරන්නේ නැද්ද කියලා. | You should ask yourself why it's not working. |
| 103 | අපි ගොඩාක් වැඩි වචන අහන්න හදන්නේ නෑ. | We're not trying to hear many more words. |
| 196 | ඔයා අලුත්ම අදහස ගැන **අහලා තියෙනවාද**? | Have you heard the latest idea? |
| 364 | ඔහු ඒ තැනේ ලෙයිකළේ නෑ කියලා මම ඇහුවා. | I heard that he didn't like that place. |
| 365 | ඇය ඔහු ලවා කිව්ව දේ මම ඇහුවේ නෑ. | I didn't hear what she said to him. |
| 366 | ඔහු වවන්නයි ඕනේ කළේ ඔයා ඇහුවාද? | Did you hear what he wanted to grow? |
| 368 | ඔව් ඔහු තක්කාලි වවන්නයි ඕනේ කළා කියලා මම ඇහුවා. | Yes I heard that he wanted to grow tomatoes. |
| 380 | ඇය ඇතුළු කරන්නට ඕනේ කළේ මොකක්ද කියලා මම ඇහුවා. | I asked what she wanted to include. |
| 381 | ඔහු අපිව ගෙන ආවොත් ඕනේ කළාද කියලා මම ඇහුවේ නෑ. | I didn't ask if he wanted to follow us. |
| 382 | ඔහු ඒ දාන්නයි ඕනේ කළේ කොහෙද කියලා ඔයා ඇහුවාද? | Did you ask where he wanted to put it? |
| 405 | ඇල්ලුම් කළේ ඕනේදැ කියලා අපි ඇහුවොත් ඕනේද? | Should we ask if we have to book? |
| 415 | **මාව ලවා** ඇහුවොත් ඒ ප්‍රශ්නයක් නෙමෙයි. | That wouldn't be a problem if you ask me. |
| 423 | ඒ අයට ඒ හොදිනොකිය **ප්‍රශ්නේ** අහන්නේ ඕනේද? | Do they need to ask such an obvious question? |
| 465 | ඊළඟ සැරේ මම **ඇගේ** නම මොකක්ද කියලා අහනවා. | Next time I will ask her what her name is. |
| 509 | ඔයා අලුත් ඇඳක් ගන්නයි ගෙවනවා කියලා මම ඇහුවා. | I heard that you're going to pay for a new bed. |
| 533 | ඔයා කියන හැම වචනයක්ම ඇය අහන්නේ නෑ. | She won't listen to every word you say. |
| 597 | ඔහු ඒ ගැන කතා සිය ගණනක් ඇහුවා ඇති කියලා සැකෙනවා. | I suspect that he's heard a hundred stories about it. |
| 598 | ඔවුන් කරමින් සිටි දේ ගැන ඔහු දහස් ගණනක් කතා ඇහුවා. | He's heard a thousand stories about what they were doing. |

---

## 2. Every LEGO card in the ask/hear family

Query:

```sql
select lego_id, seed_number, lego_index, type, is_new, known_text, target_text
from course_legos
where course_code = 'eng_for_sin'
  and (known_text like '%අහ%' or known_text like '%විමස%' or known_text like '%ඇහු%')
order by seed_number, lego_index;
```

20 rows.

| lego_id | seed | idx | type | is_new | known_text | target_text |
|---|---|---|---|---|---|---|
| S0030L02 | 30 | 2 | A | t | අහන්න | to ask |
| S0099L01 | 99 | 1 | A | t | විමසන්න | ask |
| S0177L01 | 177 | 1 | M | t | ඇයගෙන් අහනවා | I'll ask her |
| S0196L02 | 196 | 2 | M | t | ඔයා අහලා තියෙනවාද | have you heard |
| S0364L03 | 364 | 3 | M | t | කියලා මම ඇහුවා | I heard that |
| S0365L02 | 365 | 2 | M | t | මම ... ඇහුවේ නෑ | I didn't hear |
| S0366L03 | 366 | 3 | M | t | ඔයා ... ඇහුවාද | did you hear |
| S0368L03 | 368 | 3 | M | t | ඔව් ... කියලා මම ඇහුවා | yes, I heard that |
| S0380L03 | 380 | 3 | M | t | මොකක්ද කියලා මම ඇහුවා | I asked what |
| S0381L03 | 381 | 3 | M | t | කියලා මම ඇහුවේ නෑ | I didn't hear if |
| **S0382L04** | 382 | 4 | M | **f** | ඔයා ... ඇහුවාද | **did you hear** |
| S0399L01 | 399 | 1 | M | t | බලාපොරොත්තුව අහිමි කරගන්නේ | to lose hope |
| S0405L03 | 405 | 3 | M | t | කියලා අපි ඇහුවොත් ඕනේද | do we need to ask if |
| S0415L03 | 415 | 3 | M | t | මාව ලවා ඇහුවොත් | if you ask me |
| S0423L03 | 423 | 3 | M | t | ඒ අයට ... අහන්නේ ඕනේද | do they need to ask |
| S0465L03 | 465 | 3 | M | t | මම ... අහනවා | I'll ask |
| S0509L03 | 509 | 3 | M | f | කියලා මම ඇහුවා | I heard that |
| S0533L02 | 533 | 2 | M | t | ඇය අහන්නේ නෑ | she doesn't listen to |
| S0597L01 | 597 | 1 | M | t | ඔහු ... ඇහුවා ඇති කියලා සැකෙනවා | I suspect that he's heard |
| S0598L01 | 598 | 1 | M | t | ඔහු දහස් ගණනක් කතා ඇහුවා | he's heard a thousand stories |

Course-wide, `eng_for_sin` has **1300 legos across seeds 1–668**.

### Full card list for the three contested seeds

```sql
select lego_id, seed_number, lego_index, is_new, known_text, target_text
from course_legos
where course_code='eng_for_sin' and seed_number in (380,381,382)
order by seed_number, lego_index;
```

| lego_id | seed | idx | is_new | known_text | target_text |
|---|---|---|---|---|---|
| S0380L01 | 380 | 1 | t | ඇතුළු කරන්නට | to include |
| S0380L02 | 380 | 2 | f | ඇය ... ඕනේ කළේ | she wanted to |
| S0380L03 | 380 | 3 | t | මොකක්ද කියලා මම ඇහුවා | I asked what |
| S0381L01 | 381 | 1 | t | අපිව ගෙන ආවොත් | to follow us |
| S0381L02 | 381 | 2 | t | ඔහු ... ඕනේ කළාද | he wanted |
| S0381L03 | 381 | 3 | t | කියලා මම ඇහුවේ නෑ | I didn't hear if |
| S0382L01 | 382 | 1 | t | ඒ දාන්නයි | to put that |
| S0382L02 | 382 | 2 | f | ඔහු ... ඕනේ කළේ | he wanted to |
| S0382L03 | 382 | 3 | t | කොහෙද | where |
| S0382L04 | 382 | 4 | **f** | ඔයා ... ඇහුවාද | **did you hear** |

---

## 3. The defect: cards that contradict their own seed

| seed | seed sentence says | its lego card says | verdict |
|---|---|---|---|
| 366 | Did you **hear** what he wanted to grow? | `S0366L03` → "did you hear" | consistent |
| 382 | Did you **ask** where he wanted to put it? | `S0382L04` → "did you hear" | **contradiction** |
| 365 | I didn't **hear** what she said to him. | `S0365L02` → "I didn't hear" | consistent |
| 381 | I didn't **ask** if he wanted to follow us. | `S0381L03` → "I didn't hear if" | **contradiction** |

`S0382L04` carries `is_new = false` — it is a **straight reuse of the seed-366 hear card**,
selected because the Sinhala string `ඔයා ... ඇහුවාද` is byte-identical between the two seeds. The
builder resolved a genuine lexical ambiguity by silently importing the wrong sense. `S0382L04`
also has **zero practice phrases**. At seed 381 an entire new card *plus its phrases* was built
in the wrong sense.

### The three colliding prompts

Same Sinhala prompt, two different English answers — this is what breaks ZUT:

| Sinhala core | HEAR at | ASK at | ASK evidence |
|---|---|---|---|
| `කියලා මම ඇහුවා` | 364, 368, 509 | **380** | card itself says "I asked what" |
| `මම ඇහුවේ නෑ` | 365 | **381** | seed says "I didn't ask if" |
| `ඔයා ඇහුවාද` | 366 | **382** | seed says "Did you ask where" |

Collision 1 is live in the shipped content today. Collisions 2 and 3 are currently *masked* by
the contradictions above — the cards say *hear*, so the learner is never asked to produce *ask*.
Fixing 381/382 to match their seeds **unmasks** them, which is precisely why the split has to be
decided before the correction is applied.

### The only exact-string ZUT collision detectable mechanically

```sql
-- legos UNION phrases, grouped by lower(trim(known_text)),
-- having count(distinct lower(trim(target_text))) > 1
```

Over the whole ask/hear family this returns **exactly one row**:

| known_text | targets | rows |
|---|---|---|
| අහනවා | `I'll ask` \| `will ask` | `S0177L01C02`, `S0465L03C02` |

That is a trivial connector variant, **not** the ask/hear problem. The important point for
verification: **a mechanical exact-string ZUT sweep cannot see any of the three real
collisions**, because the colliding cards differ by surrounding context (`මොකක්ද`, `ඔව්`) even
though the ambiguous verb core is shared. Whatever gate exists, it did not and could not catch
this.

---

## 4. Practice-phrase inventory

```sql
select seed_number, lego_index, count(*) filter (where phrase_role in ('practice','build'))
from course_practice_phrases
where course_code='eng_for_sin' and seed_number in (380,381,382,405,415,465,364,365,366,368)
group by 1,2 order by 1,2;
```

| seed | L1 | L2 | L3 |
|---|---|---|---|
| 364 | 3 | 3 | 3 |
| 365 | 3 | 3 | — |
| 366 | 3 | 3 | 3 |
| 368 | 3 | 3 | 3 |
| 380 | 3 | — | 3 |
| 381 | 3 | 3 | 3 |
| 382 | 3 | — | 3 |
| 405 | 3 | 3 | 4 |
| 415 | — | 2 | 3 |
| 465 | 3 | 4 | 3 |

**`S0382L04` has no row here at all — zero phrases.** Every other ask/hear card carries 3–4.

A separate dump of all 103 phrase rows whose known side contains `ඇහුව` confirms the sense
blocks are internally consistent: all nine of `S0381L03`'s phrases say *hear* (`I didn't hear
if he wanted`, `I didn't hear if he can't have it`, …), matching the wrong-sense card rather
than the seed.

---

## 5. Pair-contract fact that needs no DB

`docs/pair-contracts/eng_for_sin.contract.cjs` lists the ablative clitic **`ගෙන්` in
`freeClass`** — the set of Sinhala function words that are "never introduced", i.e. available at
any seed without being taught.

Verified by loading the module and comparing codepoints rather than eyeballing glyphs
(`U+0D9C U+0DD9 U+0DB1 U+0DCA`, exact match to real Sinhala `ගෙන්` — no stray virama, which was
my initial suspicion and it was wrong):

```
node -e "const c=require('./docs/pair-contracts/eng_for_sin.contract.cjs');
         const t=c.freeClass.find(x=>x.startsWith('ගෙ'));
         console.log(t==='ගෙන්')"   // → true
```

The contract also states, in its own words, that Sinhala grammatical role is suffixal via "case
clitics -ට/-ගේ/-ව/-ගෙන් and postpositions". `ratified: null` — the contract is advisory and
explicitly "pending a native Sinhala speaker + adversarial pass".

**Consequence:** marking an ASK card with `-ගෙන්` introduces **no untaught vocabulary at any
seed number**. The vocabulary-gate objection to the expanded-context route does not apply to the
ablative itself. It still applies to any *pronoun* added alongside it (`ඔහුගෙන්`, `ඇයගෙන්`) and
to the English addressee that would have to appear in the target — those must be checked
separately.

---

## 6. The coherence scope (Kai's ruling, 2026-08-17)

Kai's clarification changes what has to ship. The distinct-word and expanded-context routes have
**equal standing** — `විමසන්න` was never the preferred option — and the ablative-context route is
endorsed in principle here. What is **mandatory** is coherence: because the ablative rule is
one-directional, *"any phrases that can be misinterpreted by the learner should be removed or
fixed"*, and the shipped state must leave **no phrase a Sinhala speaker could read as the wrong
sense**. Wider scope is authorised if that is what it takes.

This reframes the 41% recall gap in §1. It is **not a flaw in the rule** — it is a measure of the
work needed to make the rule true. Marking every ASK row converts a one-directional cue
(*ablative ⇒ ask*, already 100% precise) into a **bidirectional** one, at which point *bare ⇒
hear* becomes reliable too, because there would no longer be a bare ASK row anywhere in the
course. The three-card fix cannot deliver that; the full sweep can.

So the scope is every ASK row, not three. Triaged from §1 by what it costs on the English side:

### Already unambiguous — no change

| seed | why |
|---|---|
| 30, 136, 176, 177, 190, 208, 223 | ablative addressee already present |
| 99 | uses the distinct word `විමසන්න`, not `අහනවා` at all — the course already runs a mixed system |

### Zero English change — ablative added on the known side only

| seed | current known side | proposed | note |
|---|---|---|---|
| 119 | `මොකක් හරි අහන්නට පුළුවන්ද?` | add `ඔයාගෙන්` | English already says "ask **you** something" |
| 415 | `මාව ලවා ඇහුවොත්` | `මගෙන් ඇහුවොත්` | `ලවා` is a causative-agent marker, not the addressee ablative; the idiomatic form *is* the ablative, so this is a naturalness fix that pays for itself |
| 465 | `මම ඇගේ නම මොකක්ද කියලා අහනවා` | `ඇගෙන්` | English already says "ask **her**" |

### English gains an addressee — the three collisions

| seed | current | proposed known | proposed English |
|---|---|---|---|
| 380 | `මොකක්ද කියලා මම ඇහුවා` | `... මම ඇයගෙන් ඇහුවා` | "I asked **her** what" |
| 381 | `කියලා මම ඇහුවේ නෑ` (card wrongly says *hear*) | `... මම ඔහුගෙන් ඇහුවේ නෑ` | "I didn't ask **him** if" |
| 382 | `ඔයා ... ඇහුවාද` (`is_new=false` reuse, wrongly *hear*) | `ඔයා ... ඔහුගෙන් ඇහුවාද` | "did you ask **him**" |

### Newly in scope — found while enumerating, same defect class

**`S0030L02`** is bare `අහන්න` → "to ask", **even though seed 30 itself carries `ඔයාගෙන්`**. The
card strips the very disambiguator its own seed had — exactly what happened at 381/382, and I did
not spot it in the first pass. Its ~8 phrases are bare too (`මට අහන්න ඕනේ` = "I want to ask").

Worse, those phrases mark the person asked with the **dative `ඔයාට`**, not the ablative:
`මට ඔයාට මොකක් හරි අහන්න ඕනේ` ("I want to ask you something"), `මම ඔයාට අහන්න උත්සාහ කරනවා`
("I'm trying to ask you"). The seed uses `ඔයාගෙන්`. If dative is not grammatical for the addressee
of `අහනවා` — my reading is that it is not, and this needs the refuter and ultimately a native ear —
then those phrases are **independently wrong**, and correcting them to ablative fixes a grammar
defect and the ambiguity together, at **zero English cost**.

### The hard cases — may be unfixable without changing meaning

| seed | English | problem |
|---|---|---|
| 405 | "Should we ask if we have to book?" | no addressee in the English, so the ablative cannot be added without inventing one |
| 420 | "They don't need to ask how old he is." | same |
| 423 | "Do they need to ask such an obvious question?" | carries the question-noun `ප්‍රශ්නේ`, which I *think* disambiguates — but one can *hear* a question as well as *ask* one, so this is not settled |

**These decide whether the mandate is fully achievable.** If 405 and 420 cannot be marked, the
gap never fully closes, *bare ⇒ hear* stays one-directional, and the honest shipped answer is
"fixed everywhere it could be, with two named residues" rather than "coherent". Kai's ruling
allows removal as well as repair, so deleting or remapping the offending phrases is on the table —
subject to the phrase-floor constraint, which forbids deletion at the ramp minimum and resolves
"remove or remap" into remapping from already-introduced chunks.

Not yet costed: how many practice phrases course-wide tile through these legos. That needs the DB.

---

## 7. Trigger fates — established from source, no DB needed

From `database/migrations/20260806_audio_link_integrity.sql`, read directly. This **corrects the
brief I wrote** and the standing note I was working from.

| table | on a text edit |
|---|---|
| `course_legos` | **re-resolves** `known_audio_id`, `target1/2_audio_id`, **and `presentation_audio_id`** — all via `audio_id_for_text()`. It does **not** null presentation. |
| `course_practice_phrases` | **re-resolves** the three audio ids; `presentation_audio_id` is *deliberately* left untouched, per the migration's own comment — so it goes **stale**, not silent. |
| `course_seeds` | **nothing.** No audio trigger exists. Links keep pointing at the clip for the **old sentence**, with no NULL for any sweep to find. |

The lego presentation body:

```sql
IF NEW.known_text IS DISTINCT FROM OLD.known_text
   OR NEW.target_text IS DISTINCT FROM OLD.target_text THEN
  NEW.presentation_audio_id :=
    audio_id_for_text(NEW.course_code, NEW.target_text, 'presentation')::text;
END IF;
```

"It nulls presentation" was true **before 2026-08-06** and is the reading I carried in. The
outcome is *usually* still NULL, because `audio_id_for_text` returns NULL when nothing matches —
which is exactly why the stale belief survived. The trap is the case where something **does**
match.

### The headline hazard, provable from source

```sql
CREATE OR REPLACE FUNCTION public.audio_id_for_text(p_course text, p_text text, p_role text)
RETURNS uuid LANGUAGE sql STABLE AS $function$
  SELECT a.id FROM course_audio a
   WHERE a.course_code = p_course
     AND a.role = p_role
     AND a.s3_key IS NOT NULL
     AND a.text_normalized = normalize_text(p_text)
   ORDER BY (a.origin = 'human') DESC, a.created_at DESC, a.id::text DESC
   LIMIT 1;
$function$;
```

It constrains `course_code`, `role`, `s3_key` and `text_normalized`. **It does not constrain
`voice_id` or `language`.** So every re-resolve this repair triggers — on the legos, and on the
practice phrases of seeds 380/381/382/415/465 — can silently land the row on a **different
voice**, with no error anywhere. The `(origin = 'human') DESC` ordering means it will actively
*prefer* a human take, in whatever voice that human happened to be.

That is the make-before-break hazard for this repair, and it is structural: it does not depend on
what any particular row's audio currently is.

A staged migration (`database/migrations/20260817_seed_audio_link_integrity.sql`, in the
`edit-impact` worktree) gives `course_seeds` a same-voice-or-null rule with a drop log. It is
canary-tested 26/26 green and **deliberately not applied** — held because a fleet was mid-edit on
`eng_for_sin` when it was written. The same "is anyone else live on this course" check applies
before applying it, and applying it *before* this repair would make the three seed edits safe
rather than silent.

Also confirmed from source: the **compressor-free render chain** (`667a6e09`) is the current
default — `masterAudio()` calls `normalizeAudioClean()` unconditionally, so nothing needs setting
to get it. And bumping `courses.audio_stamp` after a relink is established convention, so the
answer to "would it need bumping" is **yes, if anything relinks** — though `eng_for_sin`'s current
stamp value is a live fact I do not have.

---

## 8. What is NOT established here

Reported as gaps rather than papered over:

- **No audio state.** Not one `course_audio` row, link, voice or s3_key was read. Which links go
  stale, which the phrase trigger silently re-resolves onto a different voice, which the lego
  trigger nulls, and what spares exist — all unknown.
- **No `edit-impact-check` run.** `tools/edit-impact-check.cjs` (branch
  `feat/edit-impact-check-2026-08-17`, worktree `.worktrees/edit-impact`) was located and its
  usage read, but not executed against any proposal.
- **No adversarial verification.** The refuter dispatched for this returned zero rows.
- **`විමසන්න` attestation is uncounted.** It appears in seed 99 and card `S0099L01`; its total
  frequency across legos and phrases was never counted, so the strength of the
  different-word alternative is asserted, not measured.
- **Naturalness is not native-verified.** Every judgement about whether a proposed Sinhala form
  reads well is LLM judgement against course attestation. The contract itself is unratified
  pending a native speaker.

---

## Provenance

All queries run as `psql "$DATABASE_URL"` with `.env.psql` at the repo root, against the live
Supabase estate on 2026-08-17, read-only, before the shared session pooler saturated under a
concurrent 18-worker fleet. Sinhala text is reproduced exactly as stored.

---

## 9. The route reversed, on measured evidence (2026-08-17, pool reopened)

Two things measured once the pool cleared overturned the recommendation in §6. Both were things I
had **asserted rather than measured**, which is exactly where this went wrong.

### 9a. `විමසන්න` was undercounted — badly

I called it "a single attestation, in a reflexive frame, in a more formal register" and rejected
the distinct-word route on that basis. Measured:

| where | count |
|---|---|
| seeds | 1 |
| legos | 1 |
| **practice phrases** | **15** |

Spanning seeds **99, 100, 106, 109** — and mostly **not** reflexive, with varied addressees:

| id | known | English |
|---|---|---|
| `S0099L01B02` | විමසන්න මට | ask me |
| `S0099L01B03` | විමසන්න ඇයි | ask why |
| `S0099L01U02` | මට ඕනේ විමසන්න ඔයාට මොකක්හරි | I want to ask you something |
| `S0099L01U05` | මම විමසන්නවා ඔයාට හෙට | I'll ask you tomorrow |
| `S0099L01U08` | මට ඕනේ විමසන්න ඔයාගේ මිතුරාට | I want to ask your friend |
| `S0100L01U05` | ඔයා ඕනේ නෑ විමසන්න ඇයි | you shouldn't ask why |
| `S0106L01U08` | ඔයා විතරයි ඕනේ විමසන්න | you just need to ask |
| `S0109L01U05` | ඔයා කළ යුතුයි විමසන්න ඔයාටම ඇයි | you must ask yourself why |

Two incidental defects visible here: **`මම විමසන්නවා`** (`S0099L01U05`) appears malformed —
`විමසනවා` is the form — and these phrases mark the addressee with the **dative** (`මට`, `ඔයාට`,
`මිතුරාට`) where the `අහනවා` seeds use the **ablative**. Both are with the refuter.

Also honest: the past form **`විමසුවා` is not attested anywhere in the course** — only the
infinitive `විමසන්න`. My proposed `විමසුවා`/`විමසුවේ`/`විමසුවාද` are **inferred** forms.

### 9b. The English side cannot be touched — this is the decisive measurement

`tools/edit-impact-check.cjs` run on `S0380L03` both ways:

| | ablative route (English gains "her") | distinct-word route (known side only) |
|---|---|---|
| verdict | **RECONSIDER** | RECONSIDER |
| **phrases that stop tiling** | **143, across 48 seeds** | **0** — "no vocab unit removed" |
| own phrases losing containment | **8** | 0 |
| silent slots | **4** (known, target1, target2, presentation) | 2 (known, presentation) |
| stale presentation clips | 2 | 2 |
| clips to render | more | **≈3** |

The English chunk `"i asked what"` is **tiled through 143 phrases across 48 seeds**. Changing it to
`"I asked her what"` breaks all of them — other people's finished work — for the sake of one row.

And the ablative route **cannot avoid** the English change: putting `ඇයගෙන්` on the known side
while the English stays "I asked what" would leave the prompt saying *her* and the answer not, which
is precisely the known↔target mismatch the fix exists to remove.

**So the ablative route is dead for the three collisions, and my §6 recommendation is withdrawn.**
The viable route is the **distinct known-side word**, English untouched:

| seed | known before | known after | English |
|---|---|---|---|
| 380 | මොකක්ද කියලා මම ඇහුවා | මොකක්ද කියලා මම විමසුවා | **unchanged** — "I asked what" |
| 381 | කියලා මම ඇහුවේ නෑ | කියලා මම විමසුවේ නෑ | **unchanged from the seed** — "I didn't ask if" |
| 382 | ඔයා ... ඇහුවාද | ඔයා ... විමසුවාද | **unchanged from the seed** — "did you ask" |

It also reaches the two cases the ablative route could not: **405 and 420** need no addressee under
`විමසනවා`, so the coherence gap closes rather than leaving two named residues.

The zero-English-cost ablative fixes at **415** (`මගෙන් ඇහුවොත්`) and **465** (`ඇගෙන්`) still stand
on their own merits — those are naturalness repairs that touch no English chunk.

### 9c. Live-state facts now established

- **Every affected lego is fully linked.** Known side is `azure_si-LK-SameeraNeural` throughout;
  target side is `bedd6226`/`xai_bedd6226` — the **same voice**, bare and prefixed. No genuine
  voice split. `S0382L04` has no presentation clip, consistent with being a phraseless reuse.
- **Known-side edits null, they don't re-point.** No clip exists for any proposed new text, so
  `audio_id_for_text` returns NULL — a visible silent slot rather than a silent voice swap. The
  voice-swap hazard of §7 is real but **does not fire on this particular repair**.
- **`PRESENTATIONS STALE` is flagged DANGER on every variant** — 2 intro clips per edit, and one of
  them belongs to a *sibling* card (`S0380L01`) whose own text never changes but whose presentation
  quotes the seed sentence.
- **A lego and a phrase share one clip** ("same text elsewhere ... they share the same clip").
- **`eng_for_sin` is `new_app_status = 'beta'` — reachable by learners.** The blast radius is live.
- The course has **1 pod**, so the migration protocol check applies.
- This tool **does** tokenise Sinhala (it named `විමසුවා` by form), unlike the ASCII-only
  seed-complete known-side gate. Its "taught at seed NEVER" flag on `විමසුවා` is the one real
  objection left to the distinct-word route — an inflected form of an already-taught verb, on the
  learner's *native* side. Whether that counts as untaught vocabulary is a judgement for the
  refuter and ultimately a native speaker.

---

## 10. §9b RETRACTED — I read a number without a baseline

**The "143 phrases across 48 seeds break" figure in §9b does not mean what I said it means, and
the route reversal I built on it is withdrawn.**

Worker **#913** — the authoring job I had written off as a loss when it died on an account limit —
had already done the measurement I skipped. It ran a **control edit** on a completely unrelated
lego (`176:3`, `next year` → `next year time`) and got **172** broken phrases, in the same seeds
(396, 403, 410, 412, 427, 441, 485, 489, 490, 492 …). The tool's `COURSE-WIDE BREAKAGE` count is
dominated by a **pre-existing baseline it does not subtract**: `eng_for_sin` has roughly 135
phrases that already fail the tiling check today, caused by nothing in this plate.

I reproduced its control myself before accepting it:

```
$ node tools/edit-impact-check.cjs --course eng_for_sin --lego 176:3 \
    --known "කියලා මම ඔහුගෙන් අහනවා" \
    --target "I'll ask him if he'll be able to help next year time"
[DANGER] COURSE-WIDE BREAKAGE: 172 phrase(s) elsewhere ...
  tiling: 172 phrase(s) break of 7068 re-tiled  (chunks removed: next year)
```

Subtracting the baseline, #913's intersection of the sets:

| lego edit | reported broken | pre-existing | **edit-caused** |
|---|---|---|---|
| 380:3 | 143 | 135 | **8** — its own phrases, which the plan rewrites anyway |
| 381:3 | 135 | 135 | **0** |
| 382:4 | 135 | 135 | **0** |
| 415:3 | 0 | — | **0** |

**Real collateral damage outside the edited seeds: zero.** So the English-side change does *not*
break other people's finished work, the ablative route is not disqualified, and §9b's "decisive
measurement" was me quoting a raw tool number as though it were a delta. The lesson is the same
one that produced §9a: I asserted where I should have measured. #913 ran the control; I ran the
headline.

### #913's rule is narrower and better evidenced than mine

It also corrects §1's framing. The right statement is not "ASK always takes an ablative" but:

> **When an addressee is expressed, ASK marks it ablative; HEAR never does.**

Its census, over 36 ask/hear-bearing seeds (a wider net than my 28):

- **9/9** ASK seeds that express an addressee mark it ablative (30, 99, 136, 176, 177, 190, 203,
  208, 223)
- **0/12** HEAR seeds carry an ablative
- at phrase level the negative side is exceptionless: **0 of 125** HEAR-glossed phrases contain
  `-ගෙන්`/`-යෙන්`, against **40 of 133** ASK-glossed ones
- the **only two** ASK seeds expressing an addressee *without* an ablative are **415 and 465** —
  precisely the two naturalness fixes already proposed in §6. That convergence is the strongest
  single piece of evidence for the rule.

**This dissolves the recall gap I treated as the central problem.** The bare ASK rows are bare
because they *express no addressee*, not because they are unmarked — so **405, 420 and 423 need no
change at all**, and the coherence mandate is satisfiable without the two named residues I warned
about in §6. My "41% recall" framing counted rows that were never ambiguous in the first place.

### Where that leaves the route

The ablative route (Kai's 2b, as endorsed) is back as the recommendation, on #913's evidence rather
than mine. `විමසුවා` stays as a **fallback** for any row where an ablative genuinely cannot go —
and §9a's corrected count (15 phrases across seeds 99/100/106/109, not "a single attestation")
means that fallback is far better attested than I first claimed. That part of §9 stands.

Real dangers from #913's run, which survive all of the above:

1. **`course_seeds` has no audio-nulling trigger** — all five seed edits leave the learner hearing
   the OLD sentence with no signal. Repair: NULL the three audio ids by hand in the same
   transaction. Named stale clips: 380 `d8cf428e`/`a1d66785`/`1793eced`; 381 `d81a3055`/`a872bf67`/`d1268275`;
   382 `5ff52ce5`/`77507944`/`13716681`; 415 `1d4d22a8`; 465 `8a499630`.
2. **44 distinct presentation clips** embed an old seed sentence and are built at render time.
3. **`මගෙන්` is taught nowhere** (the 415 fix) — a genuine reconsider needing a ruling, not a fix.
4. For lego `382:4`, "same text elsewhere" names `366:3`. **The explicit decision is NO** — 366 is
   the HEAR seed and keeping its wording is the whole point; the shared clip stays with 366 and
   only 382's link is nulled.

Full plan: `docs/a134-sin-ask-hear/change-plan-2026-08-17.md`, machine-readable in
`plan-edits.json`. Still **nothing applied**.

---

## 11. My census regex was blind to a whole spelling family (#926)

The adversarial verify (#926) came back **PARTIALLY REFUTED on the priority claim** and it earned
that verdict: it found defects the evidence file could not see, because **§1's regex
`known_text ~ 'අහ|ඇහු|විමස'` misses `ඇහෙ-`**. In Unicode, `ඇහෙ` is
`[0D87][0DB9][0DD9]` — it shares no matchable prefix with either `අහ` `[0D85][0DB9]` or `ඇහු`
`[0D87][0DB9][0DD4]`. Every claim in §1 is therefore **under-counted**, mine and #913's alike.

Corrected census on `ඇහෙ|ඇහී|ඉල්ලු`, verified live:

| src | id | known | English |
|---|---|---|---|
| seed | 71 | කිසිම කෙනෙකුට සත්‍ය **ඇහෙනවා** දෙන්න ඕනේ හිතුනේ නෑ. | We didn't want to let anyone hear the truth. |
| lego | `S0071L01` | ඇහෙනවා | hear |
| seed | 203 | මම ඔයාගෙන් උදව් **ඉල්ලුවොත්** ඔයා මොකද කරන්නේ? | What would you do if I asked you to help me? |
| lego | `S0203L02` | මම ඔයාගෙන් උදව් ඉල්ලුවොත් | if I asked you to help me |
| seed | 272 | ඔව් ඒ ගොඩ හොඳ අදහසක් ලෙස **ඇහෙනවා**. | Yes that sounds like a great idea. |
| lego | `S0272L01` | වගේ ඇහෙනවා | sounds like |
| seed | 420 | ඔහු කොච්චර කාලද කියලා ඒ අයට අහන්නේ ඕනෑ නෑ. | They don't need to **ask** how old he is. |
| lego | `S0420L03` | ඒ අයට **ඇහෙන්නේ** ඕනෑ නෑ | they don't need to **hear** |
| seed | 432 | ඔයා **ඇහෙන්නයි** ඒ අය ඕනේ කරනවා කියලා ඒ අයට ෆෝකිවෙනවා. | They could mean that they want you to **ask**. |
| lego | `S0432L01` | ඔයා ඇහෙන්නයි ඒ අය ඕනේ කරනවා | they want to **hear** you |
| seed | 497 | ඔයාට නිදා ගන්නේ ඕනේ වගේ **ඇහෙනවා**. | That sounds as though you need to get some sleep. |
| lego | `S0497L02` | ඔයාට ඕනේ වගේ ඇහෙනවා | that sounds as though you need |
| seed | 609 | කරන්නට බුද්ධිසම්පන්න දෙය **ඇහීම**. | The sensible thing to do would have been to **ask**. |
| lego | `S0609L02` | ඇහීම | asking was |

### What this changes

**1. Two more cards contradict their own seeds — the count is five, not three.**
`S0420L03` and `S0432L01` both gloss **hear** under a seed whose English says **ask**. Same defect
class as 381/382, and **#913's change plan does not cover either**, so that plan is incomplete
against Kai's coherence mandate as written.

**These two are worse than 381/382.** `ඇහුවා` is genuinely ambiguous, so 381/382 were a defensible
wrong guess. But `ඇහෙනවා` is the **involuntary** form — 'be heard / sound' — and it **cannot bear
the ASK meaning at all**. Those two cards are not sense-mismatched, they are ungrammatical for the
sense their seed requires. `S0420L02` has a separate defect too: `ඔහු කොච්චර කාලද` → "how long he
stayed" under a seed asking "how old he is".

**2. My C6(a) premise was false.** I rejected the involuntary-form route for HEAR on the grounds
that it has "**zero** attestations in this course". It has **six rows**, including a bare
`ඇහෙනවා → hear` card at `S0071L01`. So a distinct-word split for the HEAR side — `ඇහෙනවා` hear vs
`අහනවා` ask — was available and attested all along, and I dismissed it on a fact I had not checked.
That is the third premise in this plate I asserted instead of measuring.

**3. There are at least four "ask" verbs, not two.** `අහනවා` (ask/hear), `විමසනවා` (ask, 15
phrases), `ඉල්ලනවා` (ask for/request — seed 203), and the verbal noun `ඇහීම` (seed 609, glossed
"asking"). #913's "9/9 ASK seeds mark the addressee ablative" **wrongly counts seed 203**, whose
verb is `ඉල්ලනවා`, not `අහනවා` — so the true denominator is 8/8. The rule survives, with a
corrected count.

**4. `ඇහෙනවා` itself carries two senses** — bare = *hear* (`S0071L01`), and with `වගේ`/`ලෙස` =
*sounds like* (`S0272L01`, `S0497L02`). The `වගේ` appears to disambiguate, so I am not calling this
a defect; it is unverified taste and goes on the speaker list.

### Still open

- **Phrase-level count for `ඇහෙ|ඇහී|ඉල්ලු` was not obtained** — the pool closed mid-query. Every
  phrase-level figure in §1, §4 and #913's plan (`0 of 125` HEAR, `40 of 133` ASK) is computed on
  the blind regex and is therefore **under-counted by an unknown amount**. This needs re-running
  before anything is applied.
- #926's other verdicts: C1, C2, C3, C5, C6(b), C7 **survive**; C4 partially refuted (the marker is
  real, not epiphenomenal, but its teachability depends on a coherence sweep that does not fully
  close); C8 **survives** — it was right that the denominator was miscounted and the census blind.

---

## 12. The corrected recount, and the route it settles

Per Tom's ruling: recount first with a Unicode-aware pattern, calibrated against the six known
`ඇහෙ` rows, then evaluate both routes on real numbers.

### The pattern, and why it is right

`[අඇ]හ|විමස|ඉල්ල`. The whole `අහනවා` family shares the consonant `හ` immediately after an initial
`අ` or `ඇ`, with the *vowel sign following* `හ` — so matching the two-character prefix catches every
inflection without enumerating them. Calibrated before use:

| form | old regex | new |
|---|---|---|
| අහනවා | ✓ | ✓ |
| ඇහුවා | ✓ | ✓ |
| **ඇහෙනවා** | **✗** | ✓ |
| **ඇහීම** | **✗** | ✓ |
| **ඇහෙන්නේ** | **✗** | ✓ |
| අහන්න | ✓ | ✓ |
| විමසන්න | ✓ | ✓ |
| **ඉල්ලුවොත්** | **✗** | ✓ |

`අහිමි` (seed 399, "lose hope") matches both and is excluded by hand as a known homograph.

### The census

| table | ASK | of which ablative | HEAR | ablative | SOUNDS-LIKE | OTHER |
|---|---|---|---|---|---|---|
| seeds | 23 | 8 | 11 | **0** | 2 | 2 |
| legos | 13 | 2 | 14 | **0** | 2 | 2 |
| phrases | 188 | 51 | 125 | **0** | 19 | 25 |

**The load-bearing claim survives the corrected regex exceptionlessly: zero ablative-marked HEAR
rows at every level — 0/11 seeds, 0/14 legos, 0/125 phrases.** That was the part the whole ruling
rested on, and it is now verified on a pattern that cannot hide a spelling family.

What the blind regex had actually under-counted was the **ASK** side, not the HEAR side: #913's
"40 of 133 ASK" becomes **51 of 188**, while its "0 of 125 HEAR" was already exactly right. So the
correction widens the ASK denominator and leaves the negative evidence untouched.

### The defect list is four, and it is two classes not one

Comparing every card's sense against its own seed's, over the corrected census:

| lego | is_new | seed says | card says | known side | form |
|---|---|---|---|---|---|
| `S0381L03` | t | ASK | HEAR | කියලා මම ඇහුවේ නෑ | `ඇහුවා` — genuinely ambiguous |
| `S0382L04` | **f** | ASK | HEAR | ඔයා ... ඇහුවාද | `ඇහුවා` — reuse of the 366 card |
| `S0420L03` | t | ASK | HEAR | ඒ අයට ඇහෙන්නේ ඕනෑ නෑ | **`ඇහෙනවා` — cannot mean ask** |
| `S0432L01` | t | ASK | HEAR | ඔයා ඇහෙන්නයි ඒ අය ඕනේ කරනවා | **`ඇහෙනවා` — cannot mean ask** |

I previously called this "five contradictions". It is **four contradictions plus one collision**, and
the distinction matters because they need different fixes:

- **Class 1 — contradiction** (card disagrees with its own seed): 381, 382, 420, 432.
  Within it, 381/382 are *markable* — `ඇහුවා` genuinely bears both senses, so an ablative fixes
  them. **420/432 are not** — the involuntary `ඇහෙනවා` means 'be heard/sound' and cannot carry ASK
  at all, so the verb must be **re-authored**, exactly as Tom ruled: their own class within the plan.
- **Class 2 — collision** (card agrees with its seed, but its known text is shared with the other
  sense): **380** only. `මොකක්ද කියලා මම ඇහුවා` = "I asked what" against 364/368/509's
  `කියලා මම ඇහුවා` = "I heard that".

`S0380L03` does **not** appear in the contradiction list, because seed 380 and its card both say
ASK. It was never a contradiction — I had it filed wrongly.

### Route B is measurably worse — this is not a taste fork

Route B was the attested-form split: move HEAR onto `ඇහෙනවා`, leaving `අහනවා` for ask. Costed:

| | Route A (ablative-mark ASK) | Route B (form split for HEAR) |
|---|---|---|
| rows touched | **~9** (380/381/382 marked, 415/465 naturalness) + 2 re-authored | **~150** (11 seeds, 14 legos, 125 phrases) |
| English changes | 3 anchor sentences gain a pronoun | none |
| **new collision created** | **none** | **yes — 19 SOUNDS-LIKE phrases** |
| 420/432 still need re-authoring | yes | **yes** |

Route B's fatal measured objection: **`ඇහෙනවා` already carries a second sense.** It is *hear* bare
(`S0071L01`) and *sounds like* with `වගේ`/`ලෙස` (`S0272L01`, `S0497L02`) — **2 seeds, 2 legos and 19
phrases**. Moving 125 HEAR phrases onto it would rest the entire hear-vs-sounds-like distinction on
one particle, manufacturing a fresh ambiguity of the same shape as the one being fixed, at 16× the
row count. And it does not even save the two hard cases: 420/432 need re-authoring under either
route.

**So Route A — Kai's 2b, the ablative mark — is confirmed on measured numbers, with 420/432 as a
separate authoring class.** Not adopted on the rebound, and not a taste call.

### Residue for the speaker list

- `S0420L02` — `ඔහු කොච්චර කාලද` → "how long he stayed" under a seed asking "how old he is". A
  separate defect from the sense problem, in the same card family.
- `S0609L02` — `ඇහීම` → "asking was", the verbal noun, glossed ASK while `ඇහෙනවා` elsewhere is
  hear/sounds-like. Not obviously wrong; unverified.
- `S0099L01U05` — `මම විමසන්නවා` looks malformed (`විමසනවා` is the form).
- The `විමස-` phrases mark the addressee **dative** (`මට`, `ඔයාට`) where `අහනවා` seeds use the
  **ablative**. Whether that split is correct Sinhala is a native-ear question.
- `මගෙන්` (the 415 fix) is taught nowhere — Kai's ruling still outstanding.
- Whether `වගේ ඇහෙනවා` vs bare `ඇහෙනවා` is a safe hear/sounds-like distinction.

**Nothing applied. No text edit will be made until #932 reports the seed triggers live.**
