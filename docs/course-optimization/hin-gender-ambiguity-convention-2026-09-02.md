# The gender-ambiguity convention for eng_for_hin — written down, sized, and scheduled

Kai's refinement of 2026-09-02 turns the seed-21/53 gender-prep into a **standing convention**. This document writes it down so it does not have to be re-derived, sizes it against the live course, and fixes the one number he asked me to choose (the "long gap" threshold).

**Nothing was written.** 0 database writes, 0 audio clips, no repo files changed, **no commits**. Everything below was measured against the live database today.

---

## The convention, as rules

1. **Full explanation at the first occurrence.** The presentation says, in Hindi, that English distinguishes according to whether you are talking about a woman or a man, and that the woman's voice will give the woman's version and the man's voice the man's.
2. **Quick reminder at the second occurrence.** Short — not the full explanation again.
3. **After that, a reminder only after a long gap.** Threshold chosen below.
4. **The assignment is fixed and permanent, first occurrence to last: the FEMALE target voice always takes the "her" reading, the MALE target voice always takes the "his" reading.** Never swapped, never varied by seed.
5. **It applies wherever the Hindi genuinely cannot distinguish and both English answers are correct** — not only the possessive.

The female voice is `target1` (Olivia) and plays **first**; the male voice is `target2` (Tom) and plays second. Rule 4 therefore reads, in playback order: *woman first, "her"; man second, "his".* The scripts below say exactly that, in that order.

---

## The standing blocker — unchanged

The machinery still cannot deliver this. Detail and evidence: **https://watson-1.tail4968cb.ts.net/d/9b02511c**. In one paragraph: the variant-text store (`course_gender_expansions`) and the render-time substitution in phase8 are real and load-bearing, but all three load sites gate on the **target** language being grammatically gendered, and English is not (and should not be) on that list — `loadGenderMap('eng_for_hin')` returns 4,928 keys of which **0** are reachable. `courses.needs_gender_prep` is NULL on all 150 courses and is read by nothing on the render path, so setting it changes no audio. A contained three-line change to `services/phases/phase8-audio-v13.cjs` would open it; I have not made it, and I explain why in that document.

Everything below is therefore **specification and measurement, not build**. It is what to do the moment the switch is opened, and it is worth having now precisely because the convention is meant to hold for the life of the course.

---

## How big this actually is: 46 seeds, not 2

Kai's message says *"it is these 2 seeds"*. Measured against the live course, **seeds 21 and 53 are not the only two occurrences — they are the first two anyone happened to look at.** I scanned all 668 seeds of `eng_for_hin` for the property Kai names: a Hindi cue whose third-person referent has no determined gender, against an English answer that commits to one.

**132 seeds** have a gendered English third-person word in the answer. Of those, **46 leave the gender genuinely undetermined in the Hindi** — both English readings are correct answers to that cue. The other 86 are fixed by the Hindi, usually by verb agreement (`वह चाहता है` vs `वह चाहती है`).

Two corrections to the framing, both from live data:

- **The first occurrence is seed 20, not 21.** `आप उसका नाम जल्दी सीखना चाहते हैं।` → *"You want to learn his name quickly."* `उसका` is undetermined there and always has been; that is the seed where the chunk `उसका नाम` is taught.
- **Seeds 21 and 53 no longer qualify.** Kai's other job re-authored both cues at 18:25 and 18:26 today under a brief that authorised forcing a referent into them (`उस लड़की का नाम`, `उस लड़के की चिट्ठी`). They are now unambiguous, so under this convention they are ordinary seeds. That conflict of rulings is still open and is described in the earlier document.

Under the live data the sequence therefore starts **20 (full explanation), 84 (quick reminder)**, and runs on as below.

### The occurrence map

`gap` is seeds since the previous occurrence. `stored` is which reading the course's English text currently commits to.

| seed | gap | stored | Hindi cue | English answer |
|---|---|---|---|---|
| 20 | — | mas | आप उसका नाम जल्दी सीखना चाहते हैं। | You want to learn his name quickly. |
| 84 | 64 | mas | उसने मेरे दोस्त के बारे में जो कहा, मैं उससे सहमत नहीं हूँ। | I don't agree with what he said about my friend. |
| 105 | 21 | mas | इसीलिए उसे जवाब नहीं पता था। | That is why he didn't know the answer. |
| 148 | 43 | mas | जब मैं जवाब नहीं दे पाया तो उसने बहुत धैर्य नहीं दिखाया। | He wasn't very patient when I couldn't answer. |
| 204 | 56 | fem | मैं चाहता था कि वह इंतज़ाम संभालने में आपकी मदद करे। | I wanted her to help you to deal with the arrangements. |
| 224 | 20 | mas | उसने अभी सीखना शुरू किया है। | He's just started to learn. |
| 241 | 17 | mas | मैं यह उसे नहीं देना चाहता। | I don't want to give it to him. |
| 242 | 1 | fem | मैं उसे और समय देना चाहता हूँ। | I want to give her more time. |
| 268 | 26 | fem | हाँ, उसने पिछले हफ़्ते मुझे दो ईमेल भेजे थे। | Yes she sent me two emails last week. |
| 290 | 22 | mas | पता नहीं उसे जवाब पता है या नहीं। | I wonder if he knows the answer. |
| 309 | 19 | fem | नहीं, मैंने उन्हें पहले कभी नहीं देखा। | No I've never seen her before. |
| 319 | 10 | fem | उसे किसी दूसरे देश में जाना है। | She needs to move to a different country. |
| 320 | 1 | mas | उसे इस साल दूसरा टेलीविज़न ख़रीदने की ज़रूरत नहीं है। | He doesn't need to buy another television this year. |
| 322 | 2 | fem | उसने कहा कि उसे वही किताब पढ़नी है। | She said that she needs to read the same book. |
| 323 | 1 | mas | उसने कहा कि उसे पैदल स्कूल जाने की ज़रूरत नहीं है। | He said that he doesn't need to walk to school. |
| 325 | 2 | mas | मुझे लगता है कि उसे दस संभावित समस्याओं पर विचार करना होगा। | I think that he needs to consider ten possible problems. |
| 326 | 1 | fem | मुझे नहीं लगता कि उसे कंपनी बेचने की ज़रूरत है। | I don't think that she needs to sell the company. |
| 327 | 1 | fem | क्या आपको लगता है कि उसे कोई दूसरा तरीक़ा पेश करना होगा? | Do you think that she needs to offer another way? |
| 328 | 1 | fem | हाँ, मुझे लगता है उसे करना चाहिए। | Yes I think she should. |
| 339 | 11 | mas | नहीं, मुझे लगता है उसे बहुत बुरी तरह चोट लगी है। | No I think he's hurt himself quite badly. |
| 343 | 4 | fem | जिसने कहा कि वह अर्थव्यवस्था के बारे में चिंतित है। | Who said that she's worried about the economy. |
| 344 | 1 | mas | जिसने कहा कि उसे आपकी मदद करके ख़ुशी होती है। | Who said that he's happy to help you. |
| 345 | 1 | mas | जिसने कहा कि वह अभी जाने के लिए तैयार नहीं है। | Who said that he's not ready to leave yet. |
| 346 | 1 | fem | मैं चाहता था कि उसे पता हो कि मुझे उसकी किताब पसंद आई। | I wanted her to know that I liked her book. |
| 353 | 7 | fem | उसे मैदान के चारों ओर दौड़ने की ज़रूरत थी। | She needed to run around the field. |
| 354 | 1 | mas | उसे ग़ुस्से में नहीं दिखना था। | He didn't need to appear angry. |
| 355 | 1 | fem | क्या उसे उस औरत से बात करनी थी जिसे आप जानते हैं? | Did she need to talk to that woman you know? |
| 357 | 2 | fem | नहीं, वह बस उसे एक संदेश भेजना चाहती थी। | No she just wanted to send her a message. |
| 363 | 6 | mas | हाँ, उसका बहुत सी बातें करने का मन था। | Yes he felt like talking a lot. |
| 364 | 1 | mas | मैंने सुना कि उसे वह जगह पसंद नहीं आई। | I heard that he didn't like that place. |
| 365 | 1 | both | मैंने नहीं सुना कि उसने उससे क्या कहा। | I didn't hear what she said to him. |
| 384 | 19 | mas | थोड़ी देर पहले उसने जो कहा, मैं उससे सहमत नहीं हो पाया। | I couldn't agree with what he said a moment ago. |
| 385 | 1 | fem | क्या आप उससे सहमत थे? | Did you agree with her? |
| 386 | 1 | fem | हाँ, मैं उससे सहमत था। | Yes I agreed with her. |
| 438 | 52 | mas | वे यह नहीं तय करना चाहते थे कि उसे क्या करना चाहिए। | They didn't want to decide what he should do. |
| 465 | 27 | fem | अगली बार मैं उससे पूछूँगा कि उसका नाम क्या है। | Next time I will ask her what her name is. |
| 477 | 12 | mas | वह छुट्टियों के दूसरे दिन से बीमार है। | He's been sick since the second day of the holidays. |
| 478 | 1 | fem | उसका दिल बहुत दयालु है। | She has such a kind heart. |
| 480 | 2 | mas | वह चाहे जो कहे, अब यह ज़्यादा दूर नहीं है। | Whatever he says it's not far ahead now. |
| 589 | 109 | fem | उसने मुझे बताया कि उसने अभी आख़िरी बस देखी थी। | She told me she'd just seen the last bus. |
| 597 | 8 | mas | मुझे लगता है उसने इस बारे में सैकड़ों कहानियाँ सुनी हैं। | I suspect that he's heard a hundred stories about it. |
| 598 | 1 | mas | उसने हज़ारों कहानियाँ सुनी हैं कि वे क्या कर रहे थे। | He's heard a thousand stories about what they were doing. |
| 604 | 6 | fem | उसने पेशकश की कि हम उसके साथ रह सकते हैं। | She offered to let us stay with her. |
| 610 | 6 | mas | उसे काम ढूँढ़ना है। | He needs to look for work. |
| 621 | 11 | fem | मैं उसे यह बताने की हिम्मत नहीं कर पाता कि यह टूट गया था। | I wouldn't have dared to tell her that it was broken. |
| 637 | 16 | fem | उसका बैग कहाँ है? | Where is her bag? |
*(Method: pattern-match plus sentence-by-sentence judgement, not a parse. Independently checked by a second agent — see Verification below.)*

---

## The "long gap" threshold: **40 seeds**

Kai asked me to choose it and state it so it is written down. **40 seeds.**

Why 40 and not something else. The occurrences are not evenly spread — they come in a dense band and a few isolated ones. Sorted, the 45 gaps are: 25 of them are 1–7 seeds; then 8, 10, 11, 11, 12, 16, 17, 19, 19, 20, 21, 22, 26, 27; then **43, 52, 56, 64, 109**. There is a clean break between 27 and 43, and 40 sits in it. Anything from 28 to 43 picks out the same five, so the choice is robust rather than finely tuned; a threshold of 25 would add three more reminders inside the dense band, where the learner met the pattern less than a month of study ago.

In learner terms, 40 seeds is on the order of several sessions — long enough that a learner will have stopped expecting it, short enough that the reminder lands as *"remember this"* rather than *"here is something new"*.

**Reminders therefore fall at four seeds: 148, 204, 438, 589.** (Occurrence 2, seed 84, gets the rule-2 quick reminder regardless of its gap.) So across the whole course the convention costs **one full explanation, five short reminders, and 46 pairs of takes** — not 46 explanations.

If Kai wants a different number, changing it changes only which of these seeds carry a reminder; nothing else in the convention moves.

---

## Rule 4 has a consequence Kai needs to rule on

The player shows **one** target text and reveals it **under the male voice**. Verified in the learner app's own code: the cycle shape is `target: { text, voice1Url, voice2Url }` — a single string, two audio URLs, no second text field (`packages/core/src/script/generateScript.ts`) — and `LearningPlayer.vue:6728-6733` gates the reveal on `currentPhase === Phase.VOICE_2`.

So under rule 4 — male voice always takes "his" — **the stored English text has to be the male reading for every one of these 46 seeds**, or the learner reads "her" on screen while the voice under it says "his".

**22 of the 46 currently store the female reading.** They are seeds 204, 242, 268, 309, 319, 322, 326, 327, 328, 343, 346, 353, 355, 357, 385, 386, 465, 478, 589, 604, 621, 637 — e.g. *"Where is her bag?"*, *"I want to give her more time."*, *"Yes I think she should."*

That is a decision only Kai can make, and there are exactly three ways out:

- **Change those 21 English texts to the male reading** (`"Where is his bag?"`), keeping the female reading alive as the female take. This is the only option that satisfies rule 4 as written. It is 22 answer-text edits — forbidden by my brief, so I have not made them, and it would also need the standing content-change migration protocol because learner progress is filed under the slot.
- **Let the on-screen text be the female reading on those 21** and accept that the reveal contradicts the male voice on them. This breaks rule 4's promise of consistency in the one place the learner can actually *see* it.
- **Change the reveal rule** so the text is shown under voice 1 as well, or so each voice reveals its own reading. That is player work in `ssi-learning-app`, not content work, and it is the only option that makes the two readings visible as a pair — which is arguably what the lesson is.

I have no way to choose between these without Kai. **Flagging it as the one open decision that blocks the convention even after the render-side switch is opened.**

---

## Where the ambiguity actually lives: the chunks

The presentation clip binds to a **chunk** (`course_legos.presentation_audio_id`), not to a seed — `course_seeds` has no presentation column at all. So the convention is really a convention about chunks, and the chunk layer is where its absence already shows.

40 chunks in the course carry one of these pronouns. The same Hindi is glossed both ways, with no rule, today:

| chunk | Hindi | English now |
|---|---|---|
| S0020L01 | उसका नाम | his name |
| S0637L01 | उसका बैग | her bag |
| S0346L01 | उसकी किताब | her book |
| S0105L02 | उसे नहीं पता था | he didn't know |
| S0290L01 | उसे जवाब पता है | he knows the answer |
| S0319L01 | उसे जाना है | she needs to move |
| S0320L01 | उसे ख़रीदने की ज़रूरत नहीं है | he doesn't need to buy |
| S0328L01 | उसे करना चाहिए | she ought to |
| S0438L02 | उसे क्या करना चाहिए | what he should do |
| S0309L02 | उसे | her |
| S0301L01 | उसने कहा कि | he said that |
| S0302L01 | उसने कहा कि वह | she said that she |
| S0385L01 | उससे सहमत थे | agree with her |
| S0176L03 | मैं उससे पूछूँगा कि | I'll ask him if |

`उसका` is "his" at seed 20 and "her" at seed 637. `उसे` is "he", "she" and "her" in five different chunks. Each of those is defensible on its own and the set is arbitrary as a whole — **which is exactly the inconsistency rule 4 exists to end.** It is also worth saying plainly: at chunk level this is a live ZUT problem *today*, independent of whether the two-voice mechanism is ever built.

---

## The cost, one level down: the practice ladder

The 46 is a count of **seeds**. The learner meets the same open pronoun again in the practice phrases built on those seeds, and a convention that holds at the seed and drops at the phrase is not a convention.

**1,699 practice phrases** in this course pair one of these pronouns with a gendered English answer. Applying the same test as I applied to the seeds leaves roughly **300** of them with no gender marking anywhere in the Hindi — but hand-checking the first fifteen shows the phrase-level test still over-counts (`मेरा दोस्त` / `मेरी दोस्त` carries the gender in the possessive, which the test misses), so the true figure is **somewhere in the low hundreds**. I did not do the sentence-by-sentence pass at phrase level; the seeds were the unit Kai named and 668 sentences is a size I could read, 11,949 is not.

The number that matters for planning: **the convention is a few hundred pairs of takes, not 46 and certainly not 2.** Each distinct English string needs its own variant row, because the store is keyed by text. That is still a small job against a course of ~12,000 lines — around one line in forty — and it is the same order as the known-side design's "one in seven". But it should be sized honestly before it is approved, not discovered afterwards.

---

## Verification

The classification above is judgement about Hindi grammar, so I had it checked by a second agent (job **#107**, read-only, no writes) working from the same 132 sentences and my verdict on each, with instructions to look specifically for the trap where the only gender-marked verb belongs to the speaker rather than to the referent.

**It agreed with 130 of 132, disputed 1, and named 1 as genuinely unsure.**

- **Disputed, and I accept the correction: seed 355.** `क्या उसे उस औरत से बात करनी थी जिसे आप जानते हैं?` → *"Did she need to talk to that woman you know?"* I had marked it fixed by the noun `उस औरत`, but that woman is the person being talked *to*; `करनी` agrees with `बात`, not with the dative subject `उसे`, so the person who needs to talk is undetermined. **This is why the count above is 46 and not 45** — the table, the female-reading list and every total already include the correction. It does not move the reminder schedule.
- **Unsure: seed 266.** `वे मेरे पिता के एक पुराने दोस्त थे।` → *"He was an old friend of my father."* `थे` rather than `थीं` is real evidence the referent is male, but the checker would not stake full confidence on colloquial honorific usage holding that distinction. I have left it classified as fixed. It is one sentence, and it is named here rather than buried.
- It also flagged seeds **70** and **132** as cases where `वह`/`उससे` refers to a *thing*, not a person — both already correctly rendered with "it"/"than", so no action, but they are the shape that would trip a pattern-applied version of this convention.

That is the extent of the independent check. It is one agent, not a Hindi speaker, and **Shuchita should still see the 46-line list before any of it is rendered.**

---

## The scripts

Two scripts, not three — the "long gap" reminder is deliberately the *same text* as the second-occurrence reminder, so there is one short script to maintain rather than two that will drift apart. Prose only; no tags, slashes or brackets. NFC-normalised (verified). English words are kept out of the Hindi deliberately: the Hindi voice reading Latin-script "his"/"her" is a TTS risk, and the two English takes are about to say them anyway.

### 1. Full explanation — first occurrence (chunk S0020L01, `उसका नाम`)

> हिंदी में 'उसका' एक ही शब्द है — चाहे बात किसी लड़की की हो या किसी लड़के की। अंग्रेज़ी में इसके लिए दो अलग-अलग शब्द हैं। इसलिए अब आप इसे दो बार सुनेंगे: पहले औरत की आवाज़ में, किसी लड़की के बारे में; फिर आदमी की आवाज़ में, किसी लड़के के बारे में। दोनों सही हैं।

**Back-translation:** "In Hindi *uskā* is one single word — whether you are talking about a girl or about a boy. In English there are two different words for it. So now you will hear it twice: first in a woman's voice, about a girl; then in a man's voice, about a boy. Both are correct."

The quoted word is the only part that changes between occurrences: `'उसका'` at seed 20, `'उसे'` where the ambiguous word is the object pronoun, `'उसने'` where it is the ergative subject. Nothing else in the sentence moves.

### 2. Quick reminder — second occurrence, and every long-gap occurrence after it

> याद रखिए: औरत की आवाज़ किसी लड़की के बारे में कहेगी, और आदमी की आवाज़ किसी लड़के के बारे में। हिंदी में यह एक ही शब्द है।

**Back-translation:** "Remember: the woman's voice will say it about a girl, and the man's voice about a boy. In Hindi it is the same word."

### The two earlier scripts

The seed-21 and seed-53 scripts in the earlier document are superseded by these — those two seeds no longer carry the ambiguity. The seed-53 script's specific hazard is worth keeping on record though, because it is a property of the *construction*, not of that seed: Hindi separates `उसकी` (someone else's) from `अपनी` (her own) and English does not, so a "her X" reading can be newly ambiguous in English in a way the "his X" reading is not. **Check that before applying the convention to any possessive where the possessor could be the sentence's own subject.**

---

## Three cases the two-voice convention cannot carry

The convention gives two readings, one per voice. These do not fit in two, and each needs a ruling rather than a default:

- **Two independent referents in one sentence.** Seed 365: `मैंने नहीं सुना कि उसने उससे क्या कहा।` → *"I didn't hear what she said to him."* Both pronouns are open, so there are **four** correct English answers, not two. The convention as stated would silently teach one of the four.
- **`उन्हें` / `वे` — honorific or plural.** Seed 309: `मैंने उन्हें पहले कभी नहीं देखा।` → *"No I've never seen her before."* "them", "him" and "her" are all correct; the third reading has nowhere to go. (The chunk `S0309L02 उसे → "her"` has the same problem in miniature.)
- **The pronoun may not be a person at all.** `उससे` is "with her/him" at seeds 385 and 386 but "than that" at seeds 117, 118, 132 and 144. A convention applied by pattern rather than by reading would put a gender explanation on a sentence about a thing.

- **Two referents, only one of them open.** Seed 357: `नहीं, वह बस उसे एक संदेश भेजना चाहती थी।` → *"No she just wanted to send her a message."* `चाहती` fixes the **subject** as female for good; it is the **recipient** `उसे` that is open. A blanket "this seed is ambiguous" tag would invite flipping the wrong one. Whatever carries this convention has to name *which slot* is open, not just the sentence.

My recommendation, offered for Kai to accept or reject: **the convention applies only where exactly one referent is open, it is a person, and the record says which slot it is.** The multi-referent and honorific cases are re-authoring questions, and they are few.

---

## Recording it, as Kai asked

The convention is written in this document and in the repo at `docs/course-optimization/hin-gender-ambiguity-convention-2026-09-02.md` — **uncommitted**, as an untracked working-tree file, because my brief forbids commits. It needs someone with commit authority to land it, or it will be lost the next time the checkout is cleaned.

The generalisation to state alongside it: **this is not about the possessive.** Of the 46 occurrences only 7 are possessives (`उसका/उसकी`). The ambiguous word is an oblique pronoun (`उसे/उसको/उससे/उन्हें`) in 29, an ergative subject (`उसने`) in 12, and a bare `वह` whose verb happens not to mark gender in 11 — the classes overlap, since a sentence can carry more than one — Hindi's third person simply does not carry gender anywhere except through verb agreement, so the property appears wherever the agreement happens to attach to something else: an ergative object, an infinitive, an invariant adjective (`चिंतित`, `तैयार`, `बीमार`), or a subjunctive. **The rule to apply is "is there a gender-marked verb agreeing with this referent?" — if there is not, the convention applies.**
