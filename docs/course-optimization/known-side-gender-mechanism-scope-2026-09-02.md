# The two-voice gender mechanism — scope, change-list and risks

**eng_for_hin (Hindi speakers learning English) · 2026-09-02 · scoping only**

This is a **claim and a recommendation**, not an instruction. Nothing was built, nothing
was committed, no audio was generated, nothing was written to the database. Every number
below was read from the live database or the running code today; where a figure came from
a worker rather than my own query, I say so.

*Model note: this job was commissioned at the Fable tier and actually ran on Opus 5.*

---

## 1. What the mechanism is

Say it once, precisely:

> **A Hindi cue that does not fix the referent's gender is answered by two English clips:
> the female target voice speaks the "her" reading, the male target voice speaks the "his"
> reading. The English text stored on the row is the male reading, because the player only
> ever puts text on screen while the second (male) voice is speaking. A Hindi presentation
> clip tells the learner, once, that English chooses according to whether you are talking
> about a woman or a man — and from then on the pairing is fixed and permanent.**

Nothing is annotated. Nothing is bracketed. The Hindi cue is never edited to smuggle a
referent in. The ambiguity is not hidden and not removed — it is *taught*, by the two
voices, in the same four beats the learner already knows.

### Why this is free rather than a compromise — verified, not assumed

The brief asked me to check the load-bearing fact against the running player and to say so
loudly if the code disagreed. **The code agrees.** Two independent implementations, both read
today:

- `packages/player-vue/src/composables/useSimplePlayer.ts:240` —
  `showTargetText = computed(() => internalState.value.phase === 'voice2')`
- `packages/player-vue/src/components/LearningPlayer.vue:6728` — the same test on
  `Phase.VOICE_2`
- and the tile path independently: `components/LegoAssembly.vue:277` carries the comment
  *"VOICE_1 is ears-only — no target text. Tiles reveal at VOICE_2"*, with the switch below
  it forcing `hidden` on `voice1` and `assembling` on `voice2`.

The cycle is **known (prompt) → silence (learner speaks) → target1 → target2**
(`SimplePlayer.ts:103`, roles mapped at `:646-647`). So target1 is heard and never read;
target2 is heard *and* read.

And the cast is right way round. `courses.voice_config` for eng_for_hin, read live:

| slot | voice | shown on screen? | carries |
|---|---|---|---|
| known | Eve (Hindi) | — | the cue |
| **target1** | **Olivia** (en-GB, female) | **no text** | the **"her"** reading |
| **target2** | **Tom** (en-GB, male) | **text shown** | the **"his"** reading |
| presentation | Eve (Hindi) | — | the explanation |

One correction to the brief: for *this* course the voices are Olivia and Tom, not Catrin and
Aran — Catrin/Aran is the Welsh cast. The polarity Kai relied on (female first, no text; male
second, with text) holds exactly.

---

## 2. The content changes

### The build is no longer blocked — the premise has moved

The brief says 43 seeds sit unbuilt waiting on this ruling. **As of tonight they do not.**
Read live by me:

- eng_for_hin: **668 seeds, 668 released, 1,489 LEGOs, 10,967 practice phrases, 0 seeds
  without LEGOs.** Last LEGO touched 2026-09-02 22:52.

Concurrent work today finished the build. That changes the shape of this job in an important
way, and I want to be blunt about it: **the mechanism is now a repair, not an unblocking.**
The 43 seeds were not left empty — they were completed by *picking a gender*. Live examples:

| seed | Hindi chunk | stored English |
|---|---|---|
| 20 | उसका नाम | his name |
| 21 | उसका नाम | **her name** |
| 328 | उसे करना चाहिए | she ought to |
| 589 | उसने मुझे बताया | she told me |
| 637 | उसका बैग | her bag |

Seeds 20 and 21 are the same Hindi chunk with two different English answers, both live in
the database right now. That is the collision the mechanism exists to license — except that
today it is licensed by nothing, and the learner meets it as an inconsistency.

### Reconciling the two counts (the brief's 566/91 and the worker's 48)

These are two different layers and they agree:

- I counted **1,720 practice-phrase rows** whose English contains a gendered third-person
  word. The hand census counted 1,717 and found **566 genuinely ambiguous, across 91 seeds.**
  Same population, three rows of drift in a day.
- A worker counting at the **seed-sentence** layer found 132 candidates and **48 genuinely
  ambiguous seeds**. That is the subset of the 91 whose *own headline sentence* is ambiguous.

Both are right. 91 seeds contain at least one ambiguous phrase; 48 are ambiguous in the seed
sentence itself.

### What has to be true, row by row

**(a) The stored English must be the male reading wherever the cue is ambiguous.** My live
count of rows currently storing a female-only reading — the upper bound on the flip:

| layer | female-only | male-only | both | total gendered |
|---|---|---|---|---|
| seeds | 62 | 68 | 2 | 132 |
| LEGOs | 62 | 66 | 1 | 129 |
| phrases | 837 | 863 | 20 | 1,720 |

Only the *ambiguous* ones flip; a female reading the Hindi genuinely licenses stays female.
Two independent hand counts put the ambiguous share at roughly a third (566 of 1,717 at the
phrase layer; 23 of 48 seeds store female). So the honest estimate for the flip is
**~23 seed rows, ~15 LEGO rows, and on the order of 200–300 phrase rows** — with the exact
figure requiring the same hand-read that produced the 566, applied to the female-stored half.
I am not going to invent a precise number for it.

**(b) Each flipped row needs a partner row carrying the female reading.**
`course_gender_expansions` is the slot that already exists for this — one stored row, two
voices, two sentences. `loadGenderMap` (`services/gender-haiku-service.cjs:403-433`) binds
it hard: **`expanded_f` → target1, `expanded_m` → target2** — female first, male second,
which is exactly Kai's ruling. The lookup key built at every consumer
(`phase8-audio-v13.cjs:2693, 3254, 6198`) is `` `${text}|${language}|${role}` `` where
`language` is the **target** language. So the rows this mechanism needs are:

> `original_text` = the stored English (male) answer · `language = 'eng'` ·
> `text_side = 'target'` · `expanded_f` = the "her" reading · `expanded_m` = the "his"
> reading.

Order of magnitude: low-to-mid hundreds of distinct rows once repeated strings collapse.

**A trap that must not be walked into.** eng_for_hin already has **2,464 rows** in that
table — and they are the *wrong axis*. They are `language='hin'`, `text_side='known'`, and
they vary the gender of the **speaker** in the **Hindi cue** (`वह नहीं था` / `वह नहीं थी`).
Kai's mechanism varies the gender of the **referent** in the **English answer**. Same table,
same columns, opposite meaning, and **there is no column that tells them apart.** Five sibling
courses carry the same rows (kor_for_hin 2,832; zho_for_hin 2,665; eng_for_pan 2,018;
eng_for_urd 2,013; eng_for_guj 1,159; and eng_for_mar 1,010, which nobody has named before).
No writer of `text_side='known'` exists anywhere in either repo — **whatever created those
rows is gone, and neither I nor two workers could find it.** That is an open question, not a
detail.

Worse: `gender-prep-coordinator.cjs:403` **deletes every row for a course** before writing.
One run against eng_for_hin destroys all 2,464 of them.

**(c) The presentation clips.** A presentation clip attaches to `course_legos.presentation_audio_id`
— `course_seeds` has no such column. The text can be arbitrary Hindi prose via
`POST /regenerate-presentation/:courseCode/:legoId`, which accepts a `{ text }` body; the
batch author is template-only and a bulk re-sweep would overwrite bespoke prose.

Kai's schedule — full explanation at first occurrence, quick reminder at the second, a reminder
after any 40-seed gap, plus one when reported speech first appears — comes to **six clips**,
computed against the live ambiguous-seed list:

| # | seed / LEGO | what it says | clip exists today? |
|---|---|---|---|
| 1 | seed 20, `S0020L01` | the full explanation | yes — text to be replaced |
| 2 | seed 21, `S0021L03` | quick reminder | no — new clip |
| 3 | seed 148, `S0148L01` | reminder (43-seed gap) | no — new clip |
| 4 | seed 204, `S0204L03` | reminder (56-seed gap) | yes — text to be replaced |
| 5 | seed 438, `S0438L02` | reminder (52-seed gap) | yes — text to be replaced |
| 6 | seed 589, `S0589L01` | reminder (109-seed gap) | yes — text to be replaced |

The reported-speech mention folds into one of these if the first reported-speech seed already
carries a clip; if not, it is a seventh. I did not pin down which seed that is — an explicit gap.

Note the second occurrence is **seed 21**, not seed 84: seeds 21 and 53 are recorded elsewhere
as having been re-authored today to force a referent in, but **the live database still shows
them bare** (`आप उसका नाम क्यों सीख रहे हैं?`). Either that edit was reverted or it never landed.
Worth someone checking before the schedule is fixed.

**One structural consequence.** A cycle is dropped from the walk unless *all three* clips exist
(`api/courses/[code]/cycles.ts:294`). So a row that gets a male clip but no female one does not
degrade gracefully — it disappears. This must be built make-before-break, as the standing
doctrine requires.

---

## 3. The builder changes

The gate is **code, not convention** — proven, not assumed.

The check is `checkLegoConflict` (`services/course-builder/lib/validation.cjs:479`): it looks
for an earlier LEGO with the same known text; same known + different target returns
`conflict:'zut'`. Because the known side of this course is Hindi, it keys on the Hindi chunk
and rejects the second English answer. Seven doors enforce it:

| door | result |
|---|---|
| `POST /api/seed/complete` | 400 "same known text maps to different targets" (`seed-complete.cjs:1149 → 1803`) |
| `POST /api/lego` | 400 (`seed-complete.cjs:463`) |
| `POST /api/batch` | 400 (`seed-complete.cjs:874`) |
| `POST /api/seed/translate` | 400 (`seed-translate.cjs:122`) |
| `POST /api/v2/decompose/finalize/:code` | 409 `COLLISIONS_DETECTED` — its own inline copy of the test (`v2.cjs:331-352, 425`) |
| `POST /api/course/:code/finalize` | 409 — another inline copy (`drafts.cjs:137-165, 278`) |
| `POST /api/build/zut-resolve/:code` | spawns an agent briefed to *eliminate* collisions (`build.cjs:997`) — it would undo this mechanism |

Neither escape hatch helps: `SKIP_VALIDATION` is clamped to seeds ≤ 3, and `?draft=true` only
defers the test to a 409 at finalize.

The phrase layer behaves differently and this matters: phrase-level ZUT **never rejects a
seed** — it silently *holds the phrase out* (`seed-complete.cjs:1482-1509`). So phrase-granular
ambiguity has been vanishing quietly rather than erroring.

### The recommended change: license by evidence, not by assertion

Inside `checkLegoConflict`, immediately before it returns `conflict:'zut'`: **consult
`course_gender_expansions`.** If a target-side row exists for this course whose
`expanded_f`/`expanded_m` pair is exactly the set {existing target, submitted target}, return
`licensed_variant` instead of `zut`, and treat it downstream the way `duplicate` is treated —
link to the existing LEGO rather than inserting a second one.

Why this and not a flag on the row:

- It needs **no new column**. `course_legos` and `course_seeds` have no free metadata column;
  adding one is a migration on live tables.
- It makes the licence **provable**. A seed cannot merely *claim* two readings — the two-voice
  rows must actually exist to carry them. The test is not weakened anywhere else, because for
  every other seed that lookup simply misses and the code falls through unchanged.
- `/seed/complete` discards submitted `metadata` anyway (it constructs its own), so the flag
  route would need pass-through plumbing as well.

The two finalize routes reimplement the comparison inline and would each need the same consult,
or they will 409 the seed regardless.

**And the render path is separately broken, three ways** — this is where the real engineering is:

1. All three sites that load the gender map gate on the **target** language being in
   `GENDERED_LANGUAGES` (`phase8-audio-v13.cjs:2515, 3159, 6114`). `eng` is not on that list
   and should not be — that list means *"this language agrees with the speaker's gender."*
   The mechanism here is about the **referent**. The contained fix is to load the map
   unconditionally: it returns an empty map for courses with no rows, so nothing else changes.
   **Do not add `eng` to `GENDERED_LANGUAGES`** — that list also gates the Haiku expander and
   would set it generating speaker-gender variants of English across the estate.
2. `phase8-audio-v13.cjs:4649, 5350, 5720` call `genderHaikuService.expandGender(...)`, **which
   is not exported**. Those three regeneration routes throw into their own `try/catch` and log
   "Gender expansion failed" — dead for every course in the estate. Any clip repaired through
   those routes comes back speaking the wrong reading, silently.
3. `processAndStore` hard-throws for a non-gendered target language, so it can never author the
   English-side rows. They need a new writer.

---

## 4. The player changes

**None. Zero lines.**

The earlier "roughly three lines" estimate was conservative, and the "server must not be the one
that picks" worry turns out not to apply — because **nobody picks.** The server reads
`known_audio_id`, `target1_audio_id` and `target2_audio_id` as three separate columns off the
row and puts all three ids in the response (`api/courses/[code]/cycles.ts:623, 830-832`); the
client passes them straight through (`providers/backendCyclesToRounds.ts:330-331`); the engine
plays target1 then target2 and reveals text on target2. Both readings are always delivered and
both are always played, in order.

So the five-minute shared edge cache on `/cycles` (`cycles.ts:748`, `s-maxage=300`) is
harmless here: the response is identical for every caller and correct for every caller. The
mechanism is a **data** operation — which two clip ids sit on the row, and which reading the
stored text holds — inside a slot the player already plays.

That is the strongest argument for this design. It asks the learner-facing code for nothing.

---

## 5. The generalisation

This would be the first live use of machinery that has sat unused across the whole estate. The
wall is: **the known language leaves the third-person referent's gender open, and the target
language forces a choice.** From the live course list (149 courses):

**Same family as Hindi — gender recoverable from verb agreement, open in specific structures:**
eng_for_hin, kor_for_hin, zho_for_hin, eng_for_pan, eng_for_urd, eng_for_guj — and two the
earlier list missed: **eng_for_mar** and **eng_for_ben** (Bengali has no gendered third-person
pronoun at all, so it is the stronger case of the two). All eight are live or near-live.

**Known languages with no gendered third-person pronoun whatsoever**, paired against a target
that forces one: the Japanese-known set (13 courses, into Arabic, Welsh, German, English,
French, Italian, Portuguese, Spanish), the Chinese-known set (12), eng_for_kor, and the mirror
case **cym_for_yor** — Yoruba known, Welsh target, `ó` covering he/she/it. cym_for_yor is a
draft with no voice configuration at all, so there is no live exposure there yet.

**Uncertain and deliberately not classified:** the Dravidian courses (eng_for_kan, eng_for_tam,
eng_for_tel, kor/zho_for_tam) and eng_for_sin. These languages do generally mark gender on
third-person human pronouns, and Sinhala's answer is register-dependent. I am not confident
enough to call them and will not guess.

**The honest limit, and it is a big one:** every course above is flagged because the *language
pair* can produce the problem. Nobody has read those courses' actual content. eng_for_hin is
the only course where the ambiguity has been *measured* — 566 phrases, hand-read. Theoretical
exposure is not evidence of authored ambiguity, and this list should be read as a place to
look, not a backlog.

One thing generalises cleanly and is worth saying: **the design is not Hindi-specific.** It
needs a female target voice, a male target voice, a presentation voice in the known language,
and a table of paired readings. Every one of those already exists estate-wide.

---

## 6. Risks, and what I am unsure of

**The design is sound and the player is free. The risk is all in the data and the plumbing.**

1. **The 2,464 rows already in the expansions table are the wrong axis, and nothing marks them
   as such.** Mixing referent-gender and speaker-gender rows in one table with no discriminator
   makes the ambiguity permanent. I would add a column before writing a single row. And
   `gender-prep-coordinator.cjs` deletes every row for a course before it writes — one run
   destroys them.
2. **Nobody knows what wrote those rows.** No writer of `text_side='known'` exists in either
   repo. Two workers and I looked.
3. **No machine knows Olivia is a woman.** There is no gender field on a voice slot anywhere in
   the schema. "female voice = her reading" is a human convention resting on a name in a JSON
   blob. If someone re-casts target1 to a male voice, every one of these seeds inverts silently
   and no check anywhere would catch it. **If one thing here deserves a code change beyond the
   mechanism itself, it is this.**
4. **Three regeneration routes are already broken** (`expandGender` unexported). Repair a clip
   through them and it comes back speaking the wrong gender, invisibly — `course_audio.text`
   stores the canonical male text either way, so only `word_boundaries` would show it.
5. **A half-built row disappears rather than degrading.** The cycle walk requires all three
   clips. Make-before-break is not optional here.
6. **Seeds 20 and 21 already contradict each other in live content.** A learner meeting seed 21
   today is told that उसका नाम means "her name" after being told it means "his name". The
   mechanism fixes this; until it ships, the defect is live.
7. **Seeds 21 and 53 are recorded as re-authored today, and the database disagrees.** Somebody
   should establish which is true before the schedule is fixed.

**What I could not determine.** The exact number of rows to flip and to pair — I have a firm
upper bound (961 female-stored rows across three layers) and a bounded estimate (~a third of
them), but the precise figure needs the same hand-read that produced the 566, applied to the
female-stored half; I am not going to fabricate it. Which seed first carries reported speech,
and therefore whether the schedule is six clips or seven. Whether the four skill documents that
might carry a one-answer rule contain one — they are registered with the harness but have no
on-disk copy in either repo. And whether any course other than eng_for_hin actually contains
ambiguous authored content.

---

*Read-only scoping. No commits, nothing merged, nothing deployed, no audio, no database writes.*
