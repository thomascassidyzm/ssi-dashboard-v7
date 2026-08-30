# Deborah on ara_lb_for_eng — verdicts

**She is right on 9 of her 10 comments.** The tenth (the exclamation mark) is a real observation of a real problem, but the database is correct — it's the screen that's wrong.

She doesn't speak Arabic. She caught these from the English side and from method alone. Every Arabic inference she made turned out to point at something real, and twice at something bigger than she described.

I have ruled on every Arabic question myself, with a confidence on each. **One fix is applied and verified. Nothing else was written. No audio was generated.**

---

## Verdicts at a glance

| Item | Verdict | Confidence |
|---|---|---|
| R83 "extra word" في | **Error. Fixed.** | 90% |
| R37 female "well" | **The female lego clip is wrong** | 90% |
| R87 "help me show" | **English is wrong; the Arabic verb is the same** | 85% |
| Pronoun in the verb | **She's right — but her fix would break something** | 95% |
| Exclamation mark | **Data correct as designed; display is wrong** | 95% |

**One decision needed:** the pronoun convention. My answer below is one word, but it is *not* the word she suggested, and the reason matters.

---

## R83 — the extra word. Fixed.

Build 3 read كنت بدي **في** شي — *kunt biddi as'alak fi shi*. She was right that a word was inserted.

**Verdict: في is an error. 90%.**

Two independent reasons. Grammatically, Levantine سأل takes a direct object — "ask you something" is أسألك شي. To ask *about* something is سأل عن, never سأل في. And the course convicts itself: of **40 ask-constructions in this course, 39 use أسأل + suffix + شي with no في.** This was the only one.

- "I want to ask her something" → بدي أسألها شي
- "ask you something before I go" → أسألك شي قبل ما أروح
- Build 3 → كنت بدي أسألك **في** شي ← the outlier

**Applied.** `S0030L02B03` target text is now كنت بدي أسألك شي. The audio trigger re-resolved both clips onto the already-existing correct recordings — verified live, 3456ms and 2976ms, no silent slot, **nothing rendered, nothing spent**.

One correction to her note: she named "Builds 2 & 3". Build 2 is "I wanted to ask you" with no "something" — correct as it stands. The mismatched pair was Build 3 against Use 1.

---

## R37 — the female "well"

She heard the F voice differ from M in the lego but not in the builds. **She heard it exactly right.**

**Verdict: the female lego clip is wrong. 90%.**

Three independent sources agree on what happened:

| Source | Lego, female | Lego, male | Builds, female |
|---|---|---|---|
| Stored text | منيح | منيح | منيح |
| Azure's own word boundaries | **منيحة** | منيح | منيح |
| Whisper transcription (I ran it) | **مناحة** | منيح | منيح |

منيح used adverbially — "well" — is **invariable** in Levantine. منيحة is the feminine adjective, for describing a feminine thing or a woman. The lego glosses "well", and all three builds use it adverbially, where both voices correctly say منيح. The isolate clip is the outlier.

*What would change my mind:* a Lebanese speaker saying women do say *mniiha* adverbially in casual speech. Even then it stays a defect, because the same voice says منيح in the very next clip the learner hears.

### The sweep — and a correction to my own first number

Sweeping every Arabic-script course for text-vs-spoken disagreement returned 380 rows for this course and 1,284 for Egyptian. **Reporting those as defects would have been wrong, and I nearly did.**

Almost all of them are the female voice applying feminine agreement to an *adjective* — مبسوط → مبسوطة, عارف → عارفة. When a woman says "I'm happy" in Arabic, مبسوطة **is correct**. That is the system working.

The real defect is agreement applied to a word that has none. Isolating that:

| | ara_lb_for_eng | ara_eg_for_eng |
|---|---|---|
| Gender-adapted clips | 380 | 1,284 |
| …legitimate agreement on an adjective/verb | 355 | **1,284** |
| **…agreement forced onto an invariable word** | **24** | **0** |

All 24 are منيح → منيحة, all on the female voice. Of those, **22 are the TTS being wrong** (impersonal منيح إنو "good that…", adverbial كان منيح "it was good"). **One is the opposite** — فكرة منيح, where فكرة is a feminine noun, so منيحة is right and *the stored text is wrong*.

So the population is 22 clips, not 365. Egyptian is clean.

**Important: re-rendering will not fix this.** The same voice already says منيح correctly when it follows a verb and منيحة when isolated — the adaptation is context-driven, so a re-render of the isolate would most likely reproduce it. This needs a pipeline change, not an audio pass. One test render would settle it, and that is a TTS call I am not approved to make.

Listen for yourself — the first two are the same word, same text, different voice:

- Lego, female (says *mniiha*): https://ssi-learning-app.vercel.app/api/audio/11fdef4e-77c8-4d5c-a6fc-59238efd4c73?f=.mp3
- Lego, male (says *mniih*): https://ssi-learning-app.vercel.app/api/audio/85b13fb1-1792-450f-8e55-10679b3f716d?f=.mp3
- Build, female (says *mniih*): https://ssi-learning-app.vercel.app/api/audio/eb67d5d1-6360-4e76-9893-c5e15b7d3893?f=.mp3

---

## R87 — "to show me" vs "help me show"

**Verdict: the Arabic verb is the same in both. It is the English that's wrong. 85%.**

Deborah inferred the Arabic differed. It doesn't — and that is the useful correction.

- Lego "to show me" → **تورجيني** = *t-warrji-ni* — "you show me" (2nd person verb, "me" as object)
- Build 2 "help me show" → تساعدني **تورجيني** — the identical verb

The verb never changes. What's wrong is the gloss: **تورجيني already contains "me"**, and the English "help me show" drops it, then implies *I* do the showing when the Arabic says *you* show *me*.

The same defect appears elsewhere: `S0140L02B03` glosses تحاول تورجيني as "you try to show" — again dropping the "me" the ‑ني encodes.

**Separately, and with lower confidence (60%): the Arabic phrase itself is awkward.** تساعدني تورجيني chains two 2nd-person subjunctives — "you help me, you show me". I'd expect ساعدني ورجيني or a modal. I would rebuild this phrase rather than re-gloss it.

**Not written.** A fix needs a new English gloss and probably new Arabic, which means new audio.

*A gap I want on the record:* I built a detector to sweep for this dropped-object class course-wide. It returned 88 hits and **failed its own false-positive check** — مجاني ("free"), الدني ("the world"), التاني ("the second") all end in ‑ني without being verb-plus-object. I am not giving you a number for this class, because the number I have is not trustworthy. The two instances above were confirmed by hand.

---

## The pronoun — she's right, and her fix would break something

**Verdict: she is right that the Arabic carries the person. 95%.**

عم بحكي — the b‑ prefix with no t/y/n marker is first person singular. The course's own data agrees **16 times out of 16**: every phrase containing بحكي that has an English subject has "I". So yes — "speak Arabic" and "I speak Arabic" produce the identical Arabic, and the English is the learner's only signal.

**But adding "I", as she suggests, would create a new collision.** "I speak Arabic" is already taken:

| English | Arabic | Where |
|---|---|---|
| "I speak Arabic" | أنا أحكي عربي | S0001L03U02 (round 3) |
| "speak Arabic" → would become "I speak Arabic" | عم بحكي عربي | S0009L01B02 (round 23) |

One prompt, two different targets. That is the ZUT rail broken — the exact thing her review is protecting.

**The root cause is one round earlier than she looked.** عم is the *progressive* particle. عم بحكي is "I'm speaking"; أنا أحكي is "I speak". Seed 9 glosses the progressive as simple present, and that is what forces the collision.

The course already knows this: **of 411 rows whose Arabic carries عم, 379 correctly use an "-ing" English gloss.** Only 32 don't — and they cluster in seed 9, precisely where Deborah was looking.

The particle's own gloss is a mess too — عم is glossed seven different ways across the course: *"continuous""* (with a stray quote mark), *"present"*, *"I'm in the middle"*, *"am"*, *"they are"*, *"progressive"*, and *"[progressive]"* — that last one a bracket artefact of the same family as `b+people`.

### Recommendation: **Progressive**

Not "add I". Gloss seed 9's lego as **"I'm speaking"**. That carries the pronoun, matches the 379 rows already doing it right, and dissolves the collision instead of creating one.

A blanket "add I" would also be wrong elsewhere: R95 "to read" is تقرأ (she/you), R173 "not hard to find" is تلاقي — a generic 2nd person that English correctly renders as an infinitive. **The pronoun must be read off the Arabic verb, not defaulted to "I".**

### Course-wide measurement

Raw flags: 2,248. Every reduction step, so you can see the cut:

| Step | Left |
|---|---|
| Rows whose Arabic is person-marked but English has no subject | 2,248 |
| − by-design build fragments (only inconsistency counts) | 815 |
| − tokens with no person morphology (تقريباً "nearly", بالضبط "exactly" — tagged by mere co-occurrence) | 380 |
| − generic 2nd person after adjectives ("it's hard to find" = صعب تلاقي — English is correct) | **248** |

**248 high-confidence, an 89% cut, across 149 rounds — 59 of them in the stretch Deborah has read.** The Arabic carries "I" in 138, "he" in 47, "you" in 37.

Calibrated first: three of her four flagged rows are caught by the detector. The fourth (`S0009L01B04`, "speak Arabic with you") is missed because "you" appears as an *object* and masks the missing subject — so **248 is a floor, not the population.**

Cost if applied: 248 known-side clips, well under a cent. The bill is the rewriting, not the rendering.

---

## The exclamation mark — she's right that it looks wrong, but the data is correct

**Verdict: correct as designed. 95%. No fix needed in the database — and editing it would cause harm.**

Every instance checked — around 450 rows across every RTL course — stores the `!` at the **last** logical position, which is right. Same for `؟` and `،`.

The page declares `<html lang="en">` and never sets `dir`. A trailing `!` is *neutral* under the Unicode bidi algorithm, so with no direction declared it drifts to the LTR edge — visually the front. The browser is applying the correct rule to a missing instruction.

Exactly one component in the learning app gets this right. The full-sentence displays don't, and neither does the proofread tool she reads from. **So learners see this too.**

Moving punctuation in the database to match the wrong-looking render would be the actual defect-introduction event — punctuation changes TTS pronunciation and would invalidate live clips. The fix is a `dir` attribute in the display surfaces, costing no audio at all.

*Gap:* established from the bidi spec and an exhaustive grep, not a screenshot. No browser was opened.

---

## Her own edits — checked, per the standing rule

**Live: yes. Audio nulled: no. Clip matches text: yes.**

S0053L02 ("puts") and S0053L03 ("his letter") were touched today at 08:23. All eight audio links across the two rows are intact. I compared each presentation clip's word boundaries against its stored text word for word — they match exactly. The clarification is live in the database *and* in the learner's ears:

> *"The Arabic for: 'puts', as in — 'she puts things away quickly', is:"*

**Two things she should know.**

First, the clips were rendered on 2026-05-18 and still match their text — which means today's touch **did not change that wording**. The version counter on these tables bumps on any touch, not only a real edit. The "as in" text she's seeing was already there. If she intended a change, it didn't land.

Second — and this is the methodology check — her "as in" examples do introduce words the learner hasn't met: **"away"** and **"bag"**. My verdict: **acceptable, 85%.** An "as in" gloss is comprehension-only for a native English speaker; the rail exists to stop learners being asked to *produce* untaught material, which this doesn't. Worth her knowing, not worth changing.

---

## Everything else still stands

Unchanged from the first pass, and all still true:

- **Untaught words** — all five of hers confirmed; the detector independently reproduced her round numbers (R40 for "with me", R37 for "well"). Course-wide: 546 raw → **137** word-level, 1,229 raw → **27** unit-level. 183 phrases affected. R3 can't be fixed in context — at round 3 only three legos exist, so the only legal sentence already exists in that round. It has to be cut.
- **`b+people`** — the "+" is audibly spoken as a 355ms token in six clips, including *"The Arabic for: 'b plus people', is:"*. Estate-wide: **hak_for_eng** has 138 untranslated `[classifier]` placeholders **with no audio yet** — the cheapest moment there will ever be to fix them — and **spa_mx_for_eng** speaks `(introduce:false)` aloud in 217 clips.
- **Filler words** — 221 prompts have more than one Arabic form; 164 share one signature, an untranslated word tacked on. "my daughter is here" → بنتي هون **بكرا** (+tomorrow). 520 raw → **154** after cutting real translations that merely end in the same word ("vital" = مهم is correct).

Total to render everything: **~870 clips, ~$0.07** at Azure's $4/1M characters. The money was never the constraint. The rewriting is.

---

## Writes made

| Row | Before | After | Audio |
|---|---|---|---|
| `ara_lb_for_eng:S0030L02B03` | كنت بدي أسألك **في** شي | كنت بدي أسألك شي | Re-linked to existing clips, verified live. Nothing rendered. |

That is the only database write in this job. No TTS was generated at any point.

---

## Gaps

- The dropped-object (‑ني) sweep failed its false-positive check; no number given.
- The pronoun count of 248 is a floor — object pronouns mask missing subjects.
- No browser screenshot for the bidi finding.
- 46% of `ara_for_eng` audio rows store word boundaries in a shape with no token text, so its clean gender-agreement result is a floor, not proof.
- Eight courses timed out and 16 hit a row cap in the estate token sweep — those counts are floors.
