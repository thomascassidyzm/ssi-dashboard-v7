# The Hindi prompt fix list — eng_for_hin

**What this is.** Kai asked for the inconsistencies to be surfaced and ranked before anyone touches the chunks again. This is that list. Nothing has been changed — it is a decision list, read-only. Every item shows the Hindi, a plain Roman transliteration and a word-by-word gloss, so you never have to take anyone's word for it.

**The one-line version.** The proofreading pass was a large net improvement and it left behind one specific, systematic problem: about a fifth of her edits moved the Hindi *away* from the English the course teaches. The learner reads the prompt, produces a perfectly good English sentence, and it is the wrong sentence. That is Band 1, and it is far bigger than anyone had counted.

---

## The shape, before you read a single item

| Band | What it is | How many |
|---|---|---|
| **1** | **Fidelity drift** — the prompt now asks for a different English sentence | **91 confident, plus 48 that want a native ear** |
| **2** | **Errors she introduced** — a doubled word, a missing postposition, a broken agreement, a misspelling | **8** |
| **3** | **ZUT clashes** — one Hindi prompt, two valid English answers | **13 seeds, plus 4 whole families** |
| **4** | **Inconsistent application** — the same fix made here and not there | **26 seeds across 15 families, plus 28 split chunks** |
| **5** | **Taste** — considered and deliberately not reported | listed, not counted |

**How this was arrived at.** All 668 seeds were pulled from the live database with her before-and-after Hindi side by side. All 420 of her edits were then read individually — five readers, 84 seeds each, no sampling and no pattern-matching verdicts. The consistency families were built by machine and then read one by one, and the readers threw most of them out: two of every three machine candidates were false positives, and their own numbers are quoted in Band 4.

---

## Two things you were told are still broken, and are not

Both of the "a machine could catch this for free" classes are **already clean**. That matters, because they were named as the cheapest things on the list and spending on them would buy nothing.

- **Roman letters sitting inside the Devanagari: zero, course-wide.** Seeds 635 and 636 did read `यह Jane का बैग है।` — she converted the name to जेन in the same pass. All 668 live prompts are pure Devanagari, checked character by character.
- **A woman addressed with male verb endings: zero.** Seed 642 did read `आप कैसा महसूस कर रहे हैं महोदया?` with the male ending; it now reads `कर रही हैं, मैडम`, which is correct. All 15 sir/madam seeds agree correctly today.

The earlier analysis that named these was describing the Hindi *before* her edit, not the live course. The floor those two checks were meant to provide is already standing.

**Also already swept:** six punctuation artefacts she left behind — a double comma at 651, a double full stop at 11 and 60, stray double spaces at 84 and 508, a misplaced nukta at 145 — were fixed by another job this morning while this list was being built. They are gone, and they are not in the list.

---

# BAND 1 — FIDELITY DRIFT (91 confident)

**Why this is first.** Tom's ruling on this class is that the English is the curriculum: where the Hindi and the English disagree, the fix is always to the Hindi and never to the English. These are the seeds where a learner practises the wrong sentence and nothing downstream notices.

**The earlier estimate was about 20 of these across all 420 edits. Five readers, briefed identically and working separately, found 28, 32, 39, 26 and 24 in their own 84 seeds each.** That agreement is itself the finding: the 20 were the specimens already known, not a count. 91 items are confident; another 48 want a Hindi ear and are in Band 5.

**The recurring shapes, so you can see the habits rather than 91 separate accidents:**

- **"need to" softened to "should"** — the largest family. Ten seeds: 207, 319, 325, 326, 327, 354, 355, 423, 610, and 534 where "let's not" became "we shouldn't". Five had been named before; there are ten. Every one uses चाहिए, which is also the course's word for "should" — so this is a fidelity drift and a ZUT clash at once.
- **"I'm not sure" turned into "I don't think"** — seeds 10, 62, 571, and 115 where "I don't feel as if" went the same way. That Hindi already belongs to the genuine "I don't think" seeds 318, 326, 330 and 336.
- **A word from the English simply losing its counterpart** — "let" at 71 and 604, "try to" at 407 and 491, "feel" at 106 and 657, "pay for" at 509, "hate" softened at 503, "already" at 76 and 421, "yet" at 88.
- **Tense** — a past becoming a present or a habitual at 55, 107, 375, 590, 615, 616.
- **Quantifiers** — "enough" becoming "a lot" at 60, "a hundred" becoming "hundreds" at 597, "many more" at 103.

---

### S7 — FIDELITY DRIFT

- **English taught:** I want to try as hard as I can today.
- **Hindi now:** आज मैं अपनी पूरी कोशिश करना चाहता हूँ।
- **Transliteration:** aaj main apni poori koshish karna chaahta hoon.
- **Word by word:** today / I / my / full / effort / to-do / want / am
- **Back-translation:** Today I want to give it my full effort.
- **What is wrong:** "अपनी पूरी कोशिश" is *my best effort* — the *as … as I can* comparison the sentence exists to teach has gone; the old Hindi had "जितनी हो सके उतनी" (*as much as is possible*).
- **Recommended fix:** मैं आज जितनी हो सके उतनी कोशिश करना चाहता हूँ।
- **Fix transliteration:** main aaj jitni ho sake utni koshish karna chaahta hoon.
- **Confidence:** high that the frame is gone; medium on restoring exactly the old wording.

---

### S10 — FIDELITY DRIFT

- **English taught:** I'm not sure if I can remember the whole sentence.
- **Hindi now:** मुझे नहीं लगता कि मैं पूरा वाक्य याद कर सकता हूँ।
- **Transliteration:** mujhe nahin lagta ki main poora vaakya yaad kar sakta hoon.
- **Word by word:** to-me / not / seems / that / I / whole / sentence / memory / do / can / am
- **Back-translation:** I don't think I can remember the whole sentence.
- **What is wrong:** the gloss contains no word meaning *sure* or *certain* anywhere — "मुझे नहीं लगता" is "I don't think".
- **Recommended fix:** मुझे यकीन नहीं है कि मैं पूरा वाक्य याद रख सकता हूँ।
- **Fix transliteration:** mujhe yaqeen nahin hai ki main poora vaakya yaad rakh sakta hoon.
- **Confidence:** high

---

### S20 — FIDELITY DRIFT (a taught verb swapped)

- **English taught:** You want to learn his name quickly.
- **Hindi now:** आप उसका नाम जल्दी जानना चाहते हैं।
- **Transliteration:** aap uska naam jaldi jaanna chaahte hain.
- **Word by word:** you / his / name / quickly / to-know / want / are
- **Back-translation:** You want to know his name quickly.
- **What is wrong:** जानना is this course's prompt for *know* — it is used for *know* in seeds 85, 87, 88, 230, 231, 232, 233, 284 — while *learn* is सीखना in seeds 2, 33, 38, 73, 75, 79, 109, 224. This seed now asks for the wrong verb.
- **Recommended fix:** आप उसका नाम जल्दी सीखना चाहते हैं।
- **Fix transliteration:** aap uska naam jaldi seekhna chaahte hain.
- **Confidence:** high

---

### S21 — FIDELITY DRIFT (same swap)

- **English taught:** Why are you learning her name?
- **Hindi now:** आप उसका नाम क्यों जान रहे हैं?
- **Transliteration:** aap uska naam kyon jaan rahe hain?
- **Word by word:** you / her / name / why / know / -ing / are
- **Back-translation:** Why are you finding out her name?
- **What is wrong:** as seed 20 — *know* where the English teaches *learn*, and seed 38 four lines later still uses सीख रहा हूँ for *learning*.
- **Recommended fix:** आप उसका नाम क्यों सीख रहे हैं?
- **Fix transliteration:** aap uska naam kyon seekh rahe hain?
- **Confidence:** high

---

### S25 — FIDELITY DRIFT (the "have to" dropped) — but read the note

- **English taught:** Are you going to help me before I have to go?
- **Hindi now:** क्या आप मेरे जाने से पहले मेरी मदद करेंगे?
- **Transliteration:** kya aap mere jaane se pahle meri madad karenge?
- **Word by word:** Q / you / **my** / going / from / before / my / help / will-do
- **Back-translation:** Will you help me before I go?
- **What is wrong:** there is no *have to* in the gloss — "मेरे जाने से पहले" is simply *before I go*.
- **Note in her favour:** this same edit **fixed** a real defect. The old Hindi was "क्या आप जाने से पहले…" with no subject at all, which Hindi reads as *before you go*. She added मेरे. Only the modal is missing.
- **Recommended fix:** क्या आप मेरी मदद करेंगे, इससे पहले कि मुझे जाना पड़े?
- **Fix transliteration:** kya aap meri madad karenge, isse pahle ki mujhe jaana pade?
- **Confidence:** high that *have to* is gone; medium on my fix — "जाना पड़े" carries *have to* correctly but Shuchita should judge whether the split clause sounds natural for a prompt.

---

### S27 — FIDELITY DRIFT (quantifier)

- **English taught:** I don't like taking too much time to answer.
- **Hindi now:** मुझे जवाब देने में बहुत समय लगाना पसंद नहीं है।
- **Transliteration:** mujhe javaab dene mein bahut samay lagaana pasand nahin hai.
- **Word by word:** to-me / answer / giving / in / much / time / to-spend / liked / not / is
- **Back-translation:** I don't like spending a lot of time answering.
- **What is wrong:** "बहुत" alone is *a lot*; *too much* is "बहुत ज़्यादा", which the old Hindi had.
- **Recommended fix:** मुझे जवाब देने में बहुत ज़्यादा समय लगाना पसंद नहीं है।
- **Fix transliteration:** mujhe javaab dene mein bahut zyaada samay lagaana pasand nahin hai.
- **Confidence:** high (small)

---

### S55 — FIDELITY DRIFT (past became habitual present)

- **English taught:** I don't enjoy waking up when I didn't sleep very well.
- **Hindi now:** जब अच्छी नींद नहीं आती तो मुझे जागना अच्छा नहीं लगता।
- **Transliteration:** jab achchhi neend nahin aati to mujhe jaagna achchha nahin lagta.
- **Word by word:** when / good / sleep / not / comes(habitually) / then / to-me / waking / good / not / seems
- **Back-translation:** When I don't sleep well, I don't like waking up.
- **What is wrong:** "नहीं आती" is a present habitual — *don't sleep* — where the English is past, *didn't sleep*; the old Hindi had the past "नहीं ली". *Very* has also gone.
- **Recommended fix:** जब मैंने रात को बहुत अच्छी नींद नहीं ली हो तो मुझे जागना अच्छा नहीं लगता।
- **Fix transliteration:** jab maine raat ko bahut achchhi neend nahin li ho to mujhe jaagna achchha nahin lagta.
- **Confidence:** high on the tense; medium on my exact wording — Shuchita would phrase the clause better.

---

### S60 — FIDELITY DRIFT (the "enough" → "a lot" specimen, twice over)

- **English taught:** I don't know how to say enough different words yet.
- **Hindi now:** मुझे अभी तक बहुत सारे अलग-अलग शब्द बोलना नहीं आता।
- **Transliteration:** mujhe abhi tak bahut saare alag-alag shabd bolna nahin aata.
- **Word by word:** to-me / still / until / very / many / different-different / words / to-speak / not / comes
- **Back-translation:** I still don't know how to speak a lot of different words.
- **What is wrong:** "बहुत सारे" is *a lot of / many*, not *enough* — and "बोलना" is *to speak*, not *to say*; two taught words changed in one line.
- **Recommended fix:** मुझे अभी तक काफ़ी अलग-अलग शब्द कहना नहीं आता।
- **Fix transliteration:** mujhe abhi tak kaafi alag-alag shabd kahna nahin aata.
- **Confidence:** high — the neighbouring seed 58 still uses काफ़ी for *enough*, so the course already has the right word.

---

### S62 — FIDELITY DRIFT

- **English taught:** I'm not sure if I can help you at the same time.
- **Hindi now:** मुझे नहीं लगता कि मैं साथ-साथ आपकी मदद कर सकता हूँ।
- **Transliteration:** mujhe nahin lagta ki main saath-saath aapki madad kar sakta hoon.
- **Word by word:** to-me / not / seems / that / I / together-together / your / help / do / can / am
- **Back-translation:** I don't think I can help you alongside that.
- **What is wrong:** same substitution as seed 10 — "I'm not sure" has become "I don't think"; the old Hindi's "मुझे यकीन नहीं" (*I have no certainty*) is gone.
- **Recommended fix:** मुझे यकीन नहीं है कि मैं एक साथ आपकी मदद कर सकता हूँ।
- **Fix transliteration:** mujhe yaqeen nahin hai ki main ek saath aapki madad kar sakta hoon.
- **Confidence:** high

---

### S71 — FIDELITY DRIFT (the dropped "let")

- **English taught:** We didn't want to let anyone hear the truth.
- **Hindi now:** हम नहीं चाहते थे कि कोई सच सुने।
- **Transliteration:** ham nahin chaahte the ki koi sach sune.
- **Word by word:** we / not / wanted / were / that / anyone / truth / may-hear
- **Back-translation:** We didn't want anyone to hear the truth.
- **What is wrong:** there is no word for *let* anywhere in the gloss; the old Hindi had "सुनने देना" (*to let hear*), which is the construction this seed exists to teach.
- **Recommended fix:** हम किसी को भी सच सुनने नहीं देना चाहते थे।
- **Fix transliteration:** ham kisi ko bhi sach sunne nahin dena chaahte the.
- **Confidence:** high

---

### S80 — FIDELITY DRIFT

- **English taught:** I'm not sure when I'll be ready.
- **Hindi now:** मैं कह नहीं सकता कि मैं कब तैयार होऊँगा।
- **Transliteration:** main kah nahin sakta ki main kab taiyaar hoonga.
- **Word by word:** I / say / not / can / that / I / when / ready / will-be
- **Back-translation:** I can't say when I'll be ready.
- **What is wrong:** the gloss says *I cannot say* — a different English sentence from *I'm not sure*.
- **Recommended fix:** मुझे यकीन नहीं है कि मैं कब तैयार होऊँगा।
- **Fix transliteration:** mujhe yaqeen nahin hai ki main kab taiyaar hoonga.
- **Confidence:** high. Worth knowing: "I'm not sure" now has **three** different Hindi prompts across the course — नहीं लगता (10, 62), कह नहीं सकता (80, 654), पक्का नहीं कह सकता (165). One decision would fix all four.

---

### S82 — FIDELITY DRIFT (a lost negative)

- **English taught:** I'm not going to wait for you. Why not?
- **Hindi now:** मैं आपका इंतज़ार नहीं करूँगा। क्यों?
- **Transliteration:** main aapka intezaar nahin karoonga. kyon?
- **Word by word:** I / your / wait / not / will-do. / why?
- **Back-translation:** I won't wait for you. Why?
- **What is wrong:** the second sentence lost its नहीं — "क्यों" is *Why?*, and the English being taught is *Why not?*
- **Recommended fix:** मैं आपका इंतज़ार नहीं करूँगा। क्यों नहीं?
- **Fix transliteration:** main aapka intezaar nahin karoonga. kyon nahin?
- **Confidence:** high. (The *going to* → *will* change in the first half is the fused-future class you already ruled on — I've left it alone.)

---

### S88 — FIDELITY DRIFT (the "yet" dropped)

- **English taught:** I'm not ready to talk to people I don't know yet.
- **Hindi now:** मैं अभी उन लोगों से बात करने के लिए तैयार नहीं हूँ जिन्हें मैं नहीं जानता।
- **Transliteration:** main abhi un logon se baat karne ke liye taiyaar nahin hoon jinhen main nahin jaanta.
- **Word by word:** I / **now** / those / people / with / talk / to-do / for / ready / not / am / whom / I / not / know
- **Back-translation:** Right now I'm not ready to talk to people I don't know.
- **What is wrong:** "अभी" is *right now*; *yet / so far* is "अभी तक", which the old Hindi had and which seed 60 still uses.
- **Recommended fix:** मैं अभी तक उन लोगों से बात करने के लिए तैयार नहीं हूँ जिन्हें मैं नहीं जानता।
- **Fix transliteration:** main abhi tak un logon se baat karne ke liye taiyaar nahin hoon jinhen main nahin jaanta.
- **Confidence:** high (small)

---

### S94 — FIDELITY DRIFT (whole sentence recast)

- **English taught:** This is the only way it will work.
- **Hindi now:** केवल इसी तरह कारगर होगा।
- **Transliteration:** keval isi tarah kaargar hoga.
- **Word by word:** only / this-very / way / effective / will-be
- **Back-translation:** Only this way will be effective.
- **What is wrong:** the gloss has no *this is … the way* frame and no subject at all — it reads "it will only work this way", which is a different English sentence.
- **Recommended fix:** यही एकमात्र तरीका है जिससे यह काम करेगा।
- **Fix transliteration:** yahi ekmaatra tareeka hai jisse yah kaam karega.
- **Confidence:** high

---

### S100 — FIDELITY DRIFT (modal lost; statement became a command)

- **English taught:** You shouldn't worry about doing something similar.
- **Hindi now:** आप ऐसा ही कुछ करने की चिंता न करें।
- **Transliteration:** aap aisa hi kuchh karne ki chinta na karen.
- **Word by word:** you / such / just / something / to-do / of / worry / not / do!(polite command)
- **Back-translation:** Don't worry about doing something like this.
- **What is wrong:** "न करें" is an imperative *don't do*, so the *should* has gone — and the seed immediately before it (99, *You should ask yourself…*) still uses चाहिए for *should*, so the pair no longer matches.
- **Recommended fix:** आपको ऐसा ही कुछ करने की चिंता नहीं करनी चाहिए।
- **Fix transliteration:** aapko aisa hi kuchh karne ki chinta nahin karni chaahiye.
- **Confidence:** high

---

### S106 — FIDELITY DRIFT (the "feel" dropped)

- **English taught:** We don't need to feel happy, we just need to work hard.
- **Hindi now:** हमें ख़ुश होने की ज़रूरत नहीं है, बस हमें मेहनत करनी है।
- **Transliteration:** hamein khush hone ki zaroorat nahin hai, bas hamein mehnat karni hai.
- **Word by word:** to-us / happy / **to-be** / of / need / not / is, / just / to-us / hard-work / to-do / is
- **Back-translation:** We don't need to be happy, we just need to work hard.
- **What is wrong:** "होने" is *to be*; the English teaches *to feel happy*, and the old Hindi had "महसूस करने" (*to feel*).
- **Recommended fix:** हमें ख़ुश महसूस करने की ज़रूरत नहीं है, बस हमें मेहनत करनी है।
- **Fix transliteration:** hamein khush mahsoos karne ki zaroorat nahin hai, bas hamein mehnat karni hai.
- **Confidence:** high

---

### S107 — FIDELITY DRIFT (tense)

- **English taught:** We hoped to see what you were doing.
- **Hindi now:** हम देखना चाहते थे कि आप क्या कर रहे हैं।
- **Transliteration:** ham dekhna chaahte the ki aap kya kar rahe hain.
- **Word by word:** we / to-see / wanted / were / that / you / what / doing / **are**
- **Back-translation:** We wanted to see what you are doing.
- **What is wrong:** "कर रहे हैं" is present tense — *are doing* — where the English is *were doing*; the old Hindi had the past "कर रहे थे" and she changed it.
- **Recommended fix:** हम देखना चाहते थे कि आप क्या कर रहे थे।
- **Fix transliteration:** ham dekhna chaahte the ki aap kya kar rahe the.
- **Confidence:** high on the tense. Second, smaller point on the same line: "चाहते थे" is *wanted*, not *hoped* — that was already true before her edit, but seed 108 next door now says *hope* properly (उम्मीद), so the two are inconsistent. A fuller fix: हमें उम्मीद थी कि हम देखेंगे कि आप क्या कर रहे थे। (*hamein ummeed thi ki ham dekhenge ki aap kya kar rahe the*).

---

### S114 — FIDELITY DRIFT (the "as if" dropped)

- **English taught:** I feel as if I'm doing worse today than yesterday.
- **Hindi now:** मुझे लग रहा है कि आज मैं कल से बुरा कर रहा हूँ।
- **Transliteration:** mujhe lag raha hai ki aaj main kal se bura kar raha hoon.
- **Word by word:** to-me / seeming / is / **that** / today / I / yesterday / than / bad / doing / am
- **Back-translation:** I feel that I'm doing worse today than yesterday.
- **What is wrong:** "कि" is *that*; the "ऐसा … जैसे" pair that carries *as if* — which the old Hindi had, and which seed 26 next door still has — is gone.
- **Recommended fix:** मुझे ऐसा लग रहा है जैसे मैं आज कल से बुरा कर रहा हूँ।
- **Fix transliteration:** mujhe aisa lag raha hai jaise main aaj kal se bura kar raha hoon.
- **Confidence:** high

---

### S115 — FIDELITY DRIFT (two changes in one line)

- **English taught:** I don't feel as if I'm ready to have a conversation.
- **Hindi now:** मुझे नहीं लगता कि मैं बात करने के लिए तैयार हूँ।
- **Transliteration:** mujhe nahin lagta ki main baat karne ke liye taiyaar hoon.
- **Word by word:** to-me / not / seems / **that** / I / talk / to-do / for / ready / am
- **Back-translation:** I don't think I'm ready to talk.
- **What is wrong:** "कि" is *that*, not *as if* — the old Hindi's "ऐसा … कि" pair that carries *as if* is gone — and "बात करने" is *to talk*, not *to have a conversation* (बातचीत).
- **Recommended fix:** मुझे ऐसा नहीं लगता कि मैं बातचीत करने के लिए तैयार हूँ।
- **Fix transliteration:** mujhe aisa nahin lagta ki main baatcheet karne ke liye taiyaar hoon.
- **Confidence:** high

---

### S116 — FIDELITY DRIFT (whole sentence recast)

- **English taught:** This isn't the best choice I could make.
- **Hindi now:** मैं इससे बेहतर विकल्प चुन सकता था।
- **Transliteration:** main isse behtar vikalp chun sakta tha.
- **Word by word:** I / than-this / better / choice / choose / could / was
- **Back-translation:** I could have chosen a better choice than this.
- **What is wrong:** nothing in the gloss says *this isn't the best* — the Hindi is now a positive statement about what I could have chosen, and a learner would produce "I could have made a better choice."
- **Recommended fix:** यह सबसे अच्छा विकल्प नहीं है जो मैं चुन सकता था।
- **Fix transliteration:** yah sabse achchha vikalp nahin hai jo main chun sakta tha.
- **Confidence:** high

---

### S133 — FIDELITY DRIFT

- **English taught:** You get to know someone very well when you work together.
- **Hindi now:** जब आप किसी के साथ काम करते हैं तो उसे अच्छी तरह जान जाते हैं।
- **Transliteration:** jab aap kisi ke sath kaam karte hain to use achchhi tarah jan jate hain.
- **Word by word:** when / you / someone / with / work / do / then / them / good / way / know / go.
- **Back-translation:** "When you work with someone, you get to know them well."
- **What is wrong:** बहुत ("very") was deleted — the old Hindi had बहुत अच्छी तरह ("very well") and the gloss now has only "well".
- **Recommended fix:** जब आप किसी के साथ काम करते हैं तो उसे बहुत अच्छी तरह जान जाते हैं।
- **Fix transliteration:** jab aap kisi ke sath kaam karte hain to use bahut achchhi tarah jan jate hain.
- **Confidence:** high on the missing word; low impact. *(Her जान जाते हैं for "get to know" is a genuine improvement and should be kept.)*

---

### S135 — FIDELITY DRIFT

- **English taught:** I don't know why you think that it's so good.
- **Hindi now:** पता नहीं यह आपको इतना अच्छा क्यों लगता है।
- **Transliteration:** pata nahin yah aapko itna achchha kyon **lagta hai**.
- **Word by word:** known / not / this / to-you / so / good / why / **seems / is**.
- **Back-translation:** "Don't know why this seems so good to you."
- **What is wrong:** "you think that it's so good" has become "it seems good to you" — लगता है means *seems*, so the verb "think" and its "that" clause are both gone, and the "I" of "I don't know" has been dropped too (there is no मुझे in the gloss).
- **Recommended fix:** मुझे नहीं पता कि आप ऐसा क्यों सोचते हैं कि यह इतना अच्छा है।
- **Fix transliteration:** mujhe nahin pata ki aap aisa kyon sochte hain ki yah itna achchha hai.
- **Confidence:** high

---

### S140 — FIDELITY DRIFT

- **English taught:** I'm sorry that I can't see what you're trying to show me.
- **Hindi now:** माफ़ करना कि मैं वह नहीं देख सकता जो आप दिखाना चाह रहे हैं।
- **Transliteration:** maaf karna ki main vah nahin dekh sakta jo aap dikhana **chah** rahe hain.
- **Word by word:** forgive / do / that / I / that / not / see / can / which / you / to-show / **wanting** / -ing / are.
- **Back-translation:** "Sorry that I can't see what you want to show me."
- **What is wrong:** "trying to show" became "wanting to show"; the register also slipped from formal माफ़ करें to familiar माफ़ करना.
- **Recommended fix:** मुझे माफ़ करें कि मैं वह नहीं देख पा रहा जो आप मुझे दिखाने की कोशिश कर रहे हैं।
- **Fix transliteration:** mujhe maaf karen ki main vah nahin dekh pa raha jo aap mujhe dikhane ki koshish kar rahe hain.
- **Confidence:** high

---

### S142 — FIDELITY DRIFT

- **English taught:** That's very kind of you and I'm grateful to you for helping.
- **Hindi now:** यह आपकी उदारता है और मैं मदद के लिए आपका आभारी हूँ।
- **Transliteration:** yah aapki **udarta** hai aur main madad ke liye aapka aabhari hun.
- **Word by word:** this / your / **generosity** / is / and / I / help / for / your / grateful / am.
- **Back-translation:** "That's generous of you and I'm grateful to you for helping."
- **What is wrong:** Two losses in three words — "kind" became "generous", and the intensifier बहुत ("very") was deleted, so "very kind" is now just "generous".
- **Recommended fix:** यह आपकी बहुत दयालुता है और मैं मदद के लिए आपका आभारी हूँ।
- **Fix transliteration:** yah aapki bahut dayaluta hai aur main madad ke liye aapka aabhari hun.
- **Confidence:** high

---

### S146 — FIDELITY DRIFT (dropped "seems")

- **English taught:** Nothing seems to be working since we tried to fix it.
- **Hindi now:** जब से हमने इसे ठीक करने की कोशिश की है, तब से कुछ भी ठीक नहीं चल रहा है।
- **Transliteration:** jab se hamne ise thik karne ki koshish ki hai, tab se kuch bhi thik nahin chal raha hai.
- **Word by word:** since / we-erg / it / right / to-do / of / try / did / is / then-since / anything / at-all / right / not / running / -ing / is.
- **Back-translation:** "Since we tried to fix it, nothing has been going right."
- **What is wrong:** The old Hindi ended in लगता ("seems"); that word is gone from the new version entirely, so the hedge in "seems to be working" is asserted as fact.
- **Recommended fix:** जब से हमने इसे ठीक करने की कोशिश की है, तब से कुछ भी काम करता नहीं लगता।
- **Fix transliteration:** jab se hamne ise thik karne ki koshish ki hai, tab se kuch bhi kaam karta nahin lagta.
- **Confidence:** high

---

### S147 — FIDELITY DRIFT

- **English taught:** She was very kind when she saw me feeling nervous.
- **Hindi now:** मुझे घबराते देखकर वह बहुत उदार हो गई थी।
- **Transliteration:** mujhe ghabrate dekhkar vah bahut **udar ho gai thi**.
- **Word by word:** me / getting-nervous / having-seen / she / very / **generous / become / went / was**.
- **Back-translation:** "Seeing me getting nervous, she became very generous."
- **What is wrong:** "kind" became "generous" again, and "was" became "became" (हो गई = *became*), so a description of how she was turns into an event of her changing.
- **Recommended fix:** जब उसने मुझे घबराया हुआ देखा तो वह बहुत दयालु थी।
- **Fix transliteration:** jab usne mujhe ghabraya hua dekha to vah bahut dayalu thi.
- **Confidence:** high *(straight revert)*

---

### S148 — FIDELITY DRIFT

- **English taught:** He wasn't very patient when I couldn't answer.
- **Hindi now:** जब मैं जवाब नहीं दे पाया तो उसने बहुत धैर्य नहीं दिखाया।
- **Transliteration:** jab main javab nahin de paya to usne bahut dhairya nahin **dikhaya**.
- **Word by word:** when / I / answer / not / give / could / then / he-erg / much / patience / not / **showed**.
- **Back-translation:** "When I couldn't answer, he didn't show much patience."
- **What is wrong:** "was patient" (adjective) became "showed patience" (verb plus noun) — the gloss contains a verb "showed" that the English does not have.
- **Recommended fix:** जब मैं जवाब नहीं दे पाया तो वह बहुत धैर्यवान नहीं था।
- **Fix transliteration:** jab main javab nahin de paya to vah bahut dhairyavan nahin tha.
- **Confidence:** high *(straight revert)*

---

### S150 — FIDELITY DRIFT

- **English taught:** Can you tell me what your name is?
- **Hindi now:** क्या आप मुझे अपना नाम बता सकते हैं?
- **Transliteration:** kya aap mujhe apna nam bata sakte hain?
- **Word by word:** Q / you / to-me / your-own / name / tell / can / are?
- **Back-translation:** "Can you tell me your name?"
- **What is wrong:** The embedded question "what your name is" has been flattened to a plain object "your name" — there is no word for "what" and no second clause left in the gloss.
- **Recommended fix:** क्या आप मुझे बता सकते हैं कि आपका नाम क्या है?
- **Fix transliteration:** kya aap mujhe bata sakte hain ki aapka nam kya hai?
- **Confidence:** high *(straight revert)*

---

### S151 — FIDELITY DRIFT

- **English taught:** That wasn't what I was hoping would happen.
- **Hindi now:** मुझे उम्मीद नहीं थी कि ऐसा होगा।
- **Transliteration:** mujhe ummid nahin thi ki aisa hoga.
- **Word by word:** to-me / hope / **not** / was / that / such / will-happen.
- **Back-translation:** "I was not hoping / did not expect that this would happen."
- **What is wrong:** The negation has moved off the "that wasn't what" and onto the hoping itself — the English presupposes the speaker *was* hoping for something (just not this), whereas the Hindi now says they were not hoping at all.
- **Recommended fix:** मुझे जिसकी उम्मीद थी, यह वह नहीं था।
- **Fix transliteration:** mujhe jiski ummid thi, yah vah nahin tha.
- **Confidence:** high

---

### S158 — FIDELITY DRIFT + ZUT RISK

- **English taught:** Let's talk about something else.
- **Hindi now:** चलिए कुछ और बात करते हैं।
- **Transliteration:** chaliye kuch aur baat karte hain.
- **Word by word:** let's / some / more-or-else / talk / do / we.
- **Back-translation:** "Let's talk a bit more." — or, less readily, "Let's talk about something else."
- **What is wrong:** The words "के बारे में" ("about") are gone, and without them कुछ और reads first as "some more" rather than "something else", so the most natural English out of this prompt is **"Let's talk some more"** — a different sentence.
- **ZUT clash:** this prompt would serve "Let's talk a little more" / "Let's talk some more" equally well.
- **Recommended fix:** चलिए किसी और बात के बारे में बात करते हैं।
- **Fix transliteration:** chaliye kisi aur baat ke bare mein baat karte hain.
- **Confidence:** high

---

### S165 — FIDELITY DRIFT

- **English taught:** But I'm not sure if it's true.
- **Hindi now:** लेकिन मैं पक्का नहीं कह सकता कि यह सच है।
- **Transliteration:** lekin main pakka nahin **kah sakta** ki yah sach hai.
- **Word by word:** but / I / for-certain / not / **say can** / that / this / true / is.
- **Back-translation:** "But I can't say for sure that it's true."
- **What is wrong:** "I'm not sure" (a state) has become "I can't say for sure" (an inability to speak) — the gloss shows a verb "say can" that the English does not contain anywhere. This is the same class as the known "not sure → don't think" specimen.
- **Recommended fix:** लेकिन मुझे यकीन नहीं है कि यह सच है।
- **Fix transliteration:** lekin mujhe yakin nahin hai ki yah sach hai.
- **Confidence:** high *(the old Hindi was already correct here — this is a straight revert)*

---

### S172 — FIDELITY DRIFT

- **English taught:** Yes that would be very helpful.
- **Hindi now:** हाँ, इससे बहुत मदद मिलेगी।
- **Transliteration:** han, isse bahut madad **milegi**.
- **Word by word:** yes / from-this / much / help / **will-be-got**.
- **Back-translation:** "Yes, that would help a lot."
- **What is wrong:** The adjective "helpful" plus copula has become "much help will be obtained" — there is no adjective in the gloss at all, so the learner produces "that would help a lot".
- **Recommended fix:** हाँ, यह बहुत मददगार होगा।
- **Fix transliteration:** han, yah bahut madadgar hoga.
- **Confidence:** high *(straight revert)*

---

### S195 — FIDELITY DRIFT

- **English taught:** I'm trying to find the money I left on the table.
- **Hindi now:** मैं वे पैसे ढूँढ़ रहा हूँ जो मैंने मेज़ पर छोड़े थे।
- **Transliteration:** main ve paise **dhundh raha hun** jo maine mez par chhore the.
- **Word by word:** I / those / money / **searching / -ing / am** / which / I-erg / table / on / left / were.
- **Back-translation:** "I'm looking for the money I left on the table."
- **What is wrong:** "trying to find" collapsed to "looking for" — कोशिश (*try*) has simply been deleted, with nothing standing in for it.
- **Recommended fix:** मैं वे पैसे ढूँढ़ने की कोशिश कर रहा हूँ जो मैंने मेज़ पर छोड़े थे।
- **Fix transliteration:** main ve paise dhundhne ki koshish kar raha hun jo maine mez par chhore the.
- **Confidence:** high *(her वह→वे number fix is correct and should be kept)*

---

### S197 — FIDELITY DRIFT

- **English taught:** My son works as a teacher.
- **Hindi now:** मेरा बेटा एक शिक्षक है।
- **Transliteration:** mera beta ek shikshak **hai**.
- **Word by word:** my / son / a / teacher / **is**.
- **Back-translation:** "My son is a teacher."
- **What is wrong:** The verb "works" has been deleted outright — the gloss has only the copula "is", so the learner cannot produce "works as".
- **Recommended fix:** मेरा बेटा टीचर का काम करता है।
- **Fix transliteration:** mera beta teacher ka kaam karta hai.
- **Confidence:** high *(the old Hindi kept "works" but was bookish — the fix keeps the verb and drops the bookishness)*

---

### S202 — FIDELITY DRIFT

- **English taught:** Nobody was sure how to answer the question.
- **Hindi now:** किसी को समझ नहीं आ रहा था कि सवाल का जवाब कैसे दें।
- **Transliteration:** kisi ko **samajh** nahin aa raha tha ki saval ka javab kaise den.
- **Word by word:** anyone / to / **understanding** / not / coming / was / that / question / of / answer / how / give.
- **Back-translation:** "Nobody could understand how to answer the question."
- **What is wrong:** "was sure" has become "could understand" — the gloss word समझ means *understanding*, and there is no word for *sure* left in the sentence.
- **Recommended fix:** किसी को यकीन नहीं था कि सवाल का जवाब कैसे दें।
- **Fix transliteration:** kisi ko yakin nahin tha ki saval ka javab kaise den.
- **Confidence:** high *(straight revert)*

---

### S204 — FIDELITY DRIFT (dropped "deal with")

- **English taught:** I wanted her to help you to deal with the arrangements.
- **Hindi now:** मैं चाहता था कि वह इंतज़ामों में आपकी मदद करे।
- **Transliteration:** main chahta tha ki vah intazamon mein aapki madad kare.
- **Word by word:** I / wanting / was / that / she / arrangements / in / your / help / does.
- **Back-translation:** "I wanted her to help you with the arrangements."
- **What is wrong:** The verb संभालना ("to deal with / handle") was in the old Hindi and has been deleted — the gloss now has only "in the arrangements", so "to deal with" cannot be produced.
- **Recommended fix:** मैं चाहता था कि वह इंतज़ाम संभालने में आपकी मदद करे।
- **Fix transliteration:** main chahta tha ki vah intazam sambhalne mein aapki madad kare.
- **Confidence:** high *(straight revert)*

---

### S205 — FIDELITY DRIFT

- **English taught:** I've forgotten the word I was trying to say.
- **Hindi now:** मैं वह शब्द भूल गया जो मैं कहना चाह रहा था।
- **Transliteration:** main vah shabd bhul gaya jo main kahna **chah** raha tha.
- **Word by word:** I / that / word / forget / went / which / I / to-say / **wanting** / -ing / was.
- **Back-translation:** "I've forgotten the word I wanted to say."
- **What is wrong:** Same substitution — "trying to say" is now "wanting to say".
- **Recommended fix:** मैं वह शब्द भूल गया जो मैं कहने की कोशिश कर रहा था।
- **Fix transliteration:** main vah shabd bhul gaya jo main kahne ki koshish kar raha tha.
- **Confidence:** high *(straight revert)*

---

### S207 — FIDELITY DRIFT (modal softening — a named class)

- **English taught:** You've done what you needed to do.
- **Hindi now:** आपने वही किया जो आपको करना चाहिए था।
- **Transliteration:** aapne vahi kiya jo aapko karna **chahiye tha**.
- **Word by word:** you-erg / that-very / did / which / to-you / to-do / **should / was**.
- **Back-translation:** "You did exactly what you should have done."
- **What is wrong:** चाहिए is the Hindi word for "should"; the English says "needed to", and the old Hindi करना था ("had to / needed to") said so correctly.
- **Recommended fix:** आपने वही किया जो आपको करना था।
- **Fix transliteration:** aapne vahi kiya jo aapko karna tha.
- **Confidence:** high

**This is a sixth seed in the need-to → should cluster, on top of the five were already named (319, 327, 354, 355, 423) — and it sits in a seed range nobody had looked at. Worth assuming the cluster is bigger than five.**

---

### S209 — FIDELITY DRIFT

- **English taught:** They want to spend more time meeting as a group.
- **Hindi now:** वे एक ग्रुप के रूप में मिलकर ज़्यादा समय बिताना चाहते हैं।
- **Transliteration:** ve ek group ke rup mein **milkar** zyada samay bitana chahte hain.
- **Word by word:** they / one / group / as / **having-met** / more / time / to-spend / want / are.
- **Back-translation:** "They want to get together as a group and spend more time."
- **What is wrong:** मिलने में ("in meeting") became मिलकर ("having met") — meeting stops being the thing the time is spent *on* and becomes a preliminary to it, so the English produced is "get together and spend time" rather than "spend time meeting".
- **Recommended fix:** वे एक ग्रुप के रूप में मिलने में ज़्यादा समय बिताना चाहते हैं।
- **Fix transliteration:** ve ek group ke rup mein milne mein zyada samay bitana chahte hain.
- **Confidence:** high *(straight revert)*

---

### S214 — FIDELITY DRIFT

- **English taught:** Did you have a good time at the weekend?
- **Hindi now:** क्या आपने अच्छा सप्ताहांत बिताया?
- **Transliteration:** kya aapne achchha saptahant bitaya?
- **Word by word:** Q / you-erg / good / weekend / spent?
- **Back-translation:** "Did you have a good weekend?"
- **What is wrong:** "good" now modifies "weekend" instead of "time" — the phrase अच्छा समय ("good time") has vanished, so the learner produces "Did you have a good weekend?"
- **Recommended fix:** क्या आपने सप्ताहांत में अच्छा समय बिताया?
- **Fix transliteration:** kya aapne saptahant mein achchha samay bitaya?
- **Confidence:** high *(straight revert)*

---

### S219 — FIDELITY DRIFT

- **English taught:** It was nice to relax for a while.
- **Hindi now:** थोड़ा आराम करना अच्छा लगा।
- **Transliteration:** **thora** aaram karna achchha laga.
- **Word by word:** **a-little** / rest / to-do / good / felt.
- **Back-translation:** "It was nice to relax a little."
- **What is wrong:** कुछ देर ("for a while", a duration) became थोड़ा ("a little", a quantity) — and seed 180, which she also edited, keeps कुछ देर for the same English "for a while", so the two seeds now disagree.
- **Recommended fix:** कुछ देर आराम करना अच्छा लगा।
- **Fix transliteration:** kuch der aaram karna achchha laga.
- **Confidence:** high on the word swap; the cross-seed inconsistency with 180 is checkable without Hindi.

---

### S226 — FIDELITY DRIFT

- **English taught:** The man is trying to help me.
- **Hindi now:** वह आदमी मेरी मदद करना चाह रहा है।
- **Transliteration:** vah aadmi meri madad karna **chah** raha hai.
- **Word by word:** that / man / my / help / to-do / **wanting** / -ing / is.
- **Back-translation:** "The man wants to help me."
- **What is wrong:** "trying" became "wanting" — the gloss has चाह (*want*) where the English plainly says "trying".
- **Recommended fix:** वह आदमी मेरी मदद करने की कोशिश कर रहा है।
- **Fix transliteration:** vah aadmi meri madad karne ki koshish kar raha hai.
- **Confidence:** high *(straight revert)*

---

### S230 — FIDELITY DRIFT

- **English taught:** I know a young man who wants to work with you.
- **Hindi now:** मैं एक लड़के को जानता हूँ जो आपके साथ काम करना चाहता है।
- **Transliteration:** main ek **larke** ko janta hun jo aapke sath kaam karna chahta hai.
- **Word by word:** I / one / **boy** / to / know / am / who / your / with / work / to-do / wants / is.
- **Back-translation:** "I know a boy who wants to work with you."
- **What is wrong:** लड़का means *boy*; there is no word for "young" and no word for "man" left in the sentence.
- **Recommended fix:** मैं एक जवान आदमी को जानता हूँ जो आपके साथ काम करना चाहता है।
- **Fix transliteration:** main ek javan aadmi ko janta hun jo aapke sath kaam karna chahta hai.
- **Confidence:** high

---

### S233 — FIDELITY DRIFT

- **English taught:** I know a young woman who knows your sister.
- **Hindi now:** मैं एक लड़की को जानता हूँ जो आपकी बहन को जानती है।
- **Transliteration:** main ek **larki** ko janta hun jo aapki bahan ko janti hai.
- **Word by word:** I / one / **girl** / to / know / am / who / your / sister / to / knows / is.
- **Back-translation:** "I know a girl who knows your sister."
- **What is wrong:** लड़की means *girl*; "young woman" has no representation left in the Hindi.
- **Recommended fix:** मैं एक जवान औरत को जानता हूँ जो आपकी बहन को जानती है।
- **Fix transliteration:** main ek javan aurat ko janta hun jo aapki bahan ko janti hai.
- **Confidence:** high

---

### S236 — FIDELITY DRIFT (two losses)

- **English taught:** I know someone who said that she was going to try to help.
- **Hindi now:** मैं एक लड़की को जानता हूँ जिसने कहा कि वह मदद करने की कोशिश करेगी।
- **Transliteration:** main ek **larki** ko janta hun jisne kaha ki vah madad karne ki koshish **karegi**.
- **Word by word:** I / one / **girl** / to / know / am / who-erg / said / that / she / help / to-do / of / try / **will-do**.
- **Back-translation:** "I know a girl who said that she will try to help."
- **What is wrong:** Two separate losses — "someone" has become "a girl" (लड़की), which gives away a gender the English withholds until "she"; and "was going to try" has become plain future "will try", losing the going-to.
- **Recommended fix:** मैं किसी ऐसे व्यक्ति को जानता हूँ जिसने कहा कि वह मदद करने की कोशिश करने वाली थी।
- **Fix transliteration:** main kisi aise vyakti ko janta hun jisne kaha ki vah madad karne ki koshish karne vali thi.
- **Confidence:** high *(straight revert)*

---

### S265 — FIDELITY DRIFT

- **English taught:** A friend.
- **Hindi now:** एक दोस्त थे।
- **Transliteration:** ek dost the.
- **Word by word:** ek [a/one] / dost [friend] / the [was — respectful form]
- **Back-translation:** (It) was a friend.
- **What is wrong:** She added a verb to a verbless English fragment; the seed immediately before it, 264 "An old man." → "एक बूढ़ा आदमी।" (ek boodha aadmi — no verb), shows the pattern she broke.
- **Recommended fix:** एक दोस्त।
- **Fix transliteration:** ek dost.
- **Confidence:** high

---

### S267 — FIDELITY DRIFT

- **English taught:** Have you heard from your friend?
- **Hindi now:** क्या आपकी अपनी दोस्त से बात हुई?
- **Transliteration:** kya aapki apni dost se baat hui?
- **Word by word:** kya [question-marker] / aapki [your] / apni [own] / dost [friend] / se [from-with] / baat [talk] / hui [happened]
- **Back-translation:** Did you get to talk with your own friend?
- **What is wrong:** "baat hui" means a conversation took place — that is "talked to", not "heard from" (and "apni" = "own" is redundant beside "aapki" = "your", and is not in the English).
- **Recommended fix:** क्या आपकी दोस्त से कोई ख़बर मिली?
- **Fix transliteration:** kya aapki dost se koi khabar mili?
- **Confidence:** high

---

### S275 — FIDELITY DRIFT

- **English taught:** Longer.
- **Hindi now:** ज़्यादा समय लगेगा।
- **Transliteration:** zyada samay lagega.
- **Word by word:** zyada [more] / samay [time] / lagega [it will take]
- **Back-translation:** It will take more time.
- **What is wrong:** The English is a one-word fragment; the Hindi is now a full sentence with the verb "will take", so the learner produces "It will take longer" — and in context (274 "Do you have to leave in a few days?" → 276 "No I can stay here for a little longer") the answer is about *staying* longer, not about anything taking time.
- **Recommended fix:** ज़्यादा समय।
- **Fix transliteration:** zyada samay.
- **Confidence:** high

---

### S306 — FIDELITY DRIFT

- **English taught:** I know that young woman who's talking to your friend.
- **Hindi now:** मैं उस लड़की को जानता हूँ जो आपके दोस्त से बात कर रही है।
- **Transliteration:** main us ladki ko jaanta hoon jo aapke dost se baat kar rahi hai.
- **Word by word:** main [I] / us ladki ko [that girl] / jaanta hoon [know] / jo [who] / aapke dost se [with your friend] / baat kar rahi hai [is talking]
- **Back-translation:** I know that girl who is talking to your friend.
- **What is wrong:** "ladki" is "girl" — and it is this course's own prompt for "girl" at seed 394 ("That girl with the yellow dress") and seed 500 ("the two girls"), so "young woman" now has no prompt of its own.
- **Recommended fix:** मैं उस युवती को जानता हूँ जो आपके दोस्त से बात कर रही है।
- **Fix transliteration:** main us yuvati ko jaanta hoon jo aapke dost se baat kar rahi hai.
- **Confidence:** high on the drift; medium on the wording — "yuvati" is exactly "young woman" but formal, and Shuchita may prefer "jawaan ladki".

---

### S307 — FIDELITY DRIFT

- **English taught:** I know that young man who's sitting over there.
- **Hindi now:** मैं उस लड़के को जानता हूँ जो वहाँ बैठा है।
- **Transliteration:** main us ladke ko jaanta hoon jo vahaan baitha hai.
- **Word by word:** main [I] / us ladke ko [that boy] / jaanta hoon [know] / jo [who] / vahaan [there] / baitha hai [is sitting]
- **Back-translation:** I know that boy who is sitting over there.
- **What is wrong:** Same as 306 in the other gender — "ladka" is "boy", and seed 393 ("That boy with the green shirt") uses the identical word.
- **Recommended fix:** मैं उस नौजवान को जानता हूँ जो वहाँ बैठा है।
- **Fix transliteration:** main us naujawaan ko jaanta hoon jo vahaan baitha hai.
- **Confidence:** high on the drift; medium on the wording.

---

### S315 — FIDELITY DRIFT

- **English taught:** I think that he couldn't afford the car that he wanted.
- **Hindi now:** मुझे लगता है कि वह उस कार को नहीं ख़रीद सकता जो उसे पसंद थी।
- **Transliteration:** mujhe lagta hai ki vah us car ko nahin khareed sakta jo use pasand thi.
- **Word by word:** mujhe lagta hai [it seems to me] / ki [that] / vah [he] / us car ko [that car] / nahin khareed sakta [cannot buy] / jo [which] / use pasand thi [was pleasing to him]
- **Back-translation:** I think he can't buy that car which he liked.
- **What is wrong:** Two shifts in one line — "khareed sakta" is present "can't buy" where the English is past "couldn't", and "use pasand thi" is "he liked" where the English is "he wanted".
- **Recommended fix:** मुझे लगता है कि वह वो कार नहीं ख़रीद सका जो वह चाहता था।
- **Fix transliteration:** mujhe lagta hai ki vah vo car nahin khareed saka jo vah chahta tha.
- **Confidence:** high

---

### S319 — FIDELITY DRIFT

- **English taught:** She needs to move to a different country.
- **Hindi now:** उसे किसी दूसरे देश चले जाना चाहिए।
- **Transliteration:** use kisi dusre desh chale jaana chahiye.
- **Word by word:** use [to her] / kisi dusre desh [some other country] / chale jaana [to go away] / chahiye [should]
- **Back-translation:** She should move to some other country.
- **What is wrong:** "chahiye" is this course's word for "should" (seeds 98–100, 253, 403–407), so the prompt now asks for "She should move…", not "She needs to move…".
- **Recommended fix:** उसे किसी दूसरे देश में जाने की ज़रूरत है।
- **Fix transliteration:** use kisi dusre desh mein jaane ki zarurat hai.
- **Confidence:** high

---

### S325 — FIDELITY DRIFT *(not previously named)*

- **English taught:** I think that he needs to consider ten possible problems.
- **Hindi now:** मुझे लगता है कि उसे दस संभावित समस्याओं पर सोचना चाहिए।
- **Transliteration:** mujhe lagta hai ki use das sambhavit samasyaon par sochna chahiye.
- **Word by word:** mujhe lagta hai [I think] / ki [that] / use [to him] / das [ten] / sambhavit [possible] / samasyaon par [on problems] / sochna [to think] / chahiye [should]
- **Back-translation:** I think he should think about ten possible problems.
- **What is wrong:** Two substitutions — "chahiye" turns "needs to" into "should", and "sochna" ("think about") replaces "consider", for which the old Hindi had the exact word "vichaar karna".
- **Recommended fix:** मुझे लगता है कि उसे दस संभावित समस्याओं पर विचार करने की ज़रूरत है।
- **Fix transliteration:** mujhe lagta hai ki use das sambhavit samasyaon par vichaar karne ki zarurat hai.
- **Confidence:** high

---

### S326 — FIDELITY DRIFT *(not previously named)*

- **English taught:** I don't think that she needs to sell the company.
- **Hindi now:** मुझे नहीं लगता कि उसे कंपनी बेचनी चाहिए।
- **Transliteration:** mujhe nahin lagta ki use company bechni chahiye.
- **Word by word:** mujhe nahin lagta [it does not seem to me] / ki [that] / use [to her] / company [company] / bechni chahiye [should sell]
- **Back-translation:** I don't think she should sell the company.
- **What is wrong:** "chahiye" = "should". The old Hindi had "bechne ki zarurat hai" — "needs to sell" — which was exactly right.
- **Recommended fix:** मुझे नहीं लगता कि उसे कंपनी बेचने की ज़रूरत है।
- **Fix transliteration:** mujhe nahin lagta ki use company bechne ki zarurat hai.
- **Confidence:** high

---

### S327 — FIDELITY DRIFT

- **English taught:** Do you think that she needs to offer another way?
- **Hindi now:** क्या आपको लगता है कि उसे कोई दूसरा तरीक़ा पेश करना चाहिए?
- **Transliteration:** kya aapko lagta hai ki use koi dusra tarika pesh karna chahiye?
- **Word by word:** kya [Q] / aapko lagta hai [does it seem to you] / ki [that] / use [to her] / koi dusra tarika [some other way] / pesh karna [to offer] / chahiye [should]
- **Back-translation:** Do you think she should offer another way?
- **What is wrong:** "chahiye" = "should", not "needs to".
- **Recommended fix:** क्या आपको लगता है कि उसे कोई दूसरा तरीक़ा पेश करने की ज़रूरत है?
- **Fix transliteration:** kya aapko lagta hai ki use koi dusra tarika pesh karne ki zarurat hai?
- **Confidence:** high

---

### S332 — FIDELITY DRIFT

- **English taught:** He can build a new life for his sister.
- **Hindi now:** वह अपनी बहन को एक नई ज़िंदगी दे सकता है।
- **Transliteration:** vah apni behan ko ek nayi zindagi de sakta hai.
- **Word by word:** vah [he] / apni behan ko [to his sister] / ek nayi zindagi [a new life] / de sakta hai [can give]
- **Back-translation:** He can give his sister a new life.
- **What is wrong:** "de sakta hai" is "can give" — the English verb "build" is gone — and "ko" makes it "to his sister" rather than "for his sister".
- **Recommended fix:** वह अपनी बहन के लिए एक नई ज़िंदगी बना सकता है।
- **Fix transliteration:** vah apni behan ke liye ek nayi zindagi bana sakta hai.
- **Confidence:** high

---

### S335 — FIDELITY DRIFT

- **English taught:** I think that he can add some valuable ideas.
- **Hindi now:** मुझे लगता है कि वह कुछ अहम विचार दे सकता है।
- **Transliteration:** mujhe lagta hai ki vah kuch aham vichaar de sakta hai.
- **Word by word:** mujhe lagta hai [I think] / ki [that] / vah [he] / kuch [some] / aham [important] / vichaar [ideas] / de sakta hai [can give]
- **Back-translation:** I think he can give some important ideas.
- **What is wrong:** "de" is "give", not "add"; and "aham" is the word this course now uses for **important** (seeds 137, 261, 311, 329, 330), so "valuable" has silently become "important" as well.
- **Recommended fix:** मुझे लगता है कि वह कुछ क़ीमती विचार जोड़ सकता है।
- **Fix transliteration:** mujhe lagta hai ki vah kuch qeemti vichaar jod sakta hai.
- **Confidence:** high

---

### S345 — FIDELITY DRIFT

- **English taught:** Who said that he's not ready to leave yet.
- **Hindi now:** जिसने कहा कि वह अभी जाने के लिए तैयार नहीं है।
- **Transliteration:** jisne kaha ki vah abhi jaane ke liye taiyaar nahin hai.
- **Word by word:** jisne kaha [who said] / ki [that] / vah [he] / abhi [right now] / jaane ke liye [for going] / taiyaar nahin hai [is not ready]
- **Back-translation:** Who said that he is not ready to leave right now.
- **What is wrong:** The old Hindi had "abhi tak" = "yet"; the new one has only "abhi" = "right now", so the English word "yet" has nothing prompting it.
- **Recommended fix:** जिसने कहा कि वह अभी तक जाने के लिए तैयार नहीं है।
- **Fix transliteration:** jisne kaha ki vah abhi tak jaane ke liye taiyaar nahin hai.
- **Confidence:** high

---

### S346 — FIDELITY DRIFT

- **English taught:** I wanted her to know that I liked her book.
- **Hindi now:** मैं उसे बताना चाहता था कि मुझे उसकी किताब पसंद आई।
- **Transliteration:** main use bataana chahta tha ki mujhe uski kitaab pasand aayi.
- **Word by word:** main [I] / use [to her] / bataana [to tell] / chahta tha [wanted] / ki [that] / mujhe [to me] / uski kitaab [her book] / pasand aayi [was pleasing]
- **Back-translation:** I wanted to tell her that I liked her book.
- **What is wrong:** "bataana chahta tha" is "wanted to tell"; the English is "wanted her to know", which the old Hindi expressed exactly ("chahta tha ki use pata ho" = wanted that she know).
- **Recommended fix:** मैं चाहता था कि उसे पता हो कि मुझे उसकी किताब पसंद आई।
- **Fix transliteration:** main chahta tha ki use pata ho ki mujhe uski kitaab pasand aayi.
- **Confidence:** high

---

### S353 — FIDELITY DRIFT

- **English taught:** She needed to run around the field.
- **Hindi now:** उसे मैदान में दौड़ना था।
- **Transliteration:** use maidaan mein daudna tha.
- **Word by word:** use [to her] / maidaan mein [in the field] / daudna tha [had to run]
- **Back-translation:** She had to run in the field.
- **What is wrong:** Two losses in five words — "mein" is "in", not "around" (the old Hindi had "ke chaaron or" = "around"), and "daudna tha" is "had to run" where the English is "needed to run".
- **Recommended fix:** उसे मैदान के चारों ओर दौड़ने की ज़रूरत थी।
- **Fix transliteration:** use maidaan ke chaaron or daudne ki zarurat thi.
- **Confidence:** high

---

### S354 — FIDELITY DRIFT

- **English taught:** He didn't need to appear angry.
- **Hindi now:** उसे ग़ुस्से में नहीं दिखना चाहिए था।
- **Transliteration:** use gusse mein nahin dikhna chahiye tha.
- **Word by word:** use [to him] / gusse mein [in anger] / nahin [not] / dikhna [to appear] / chahiye tha [should have]
- **Back-translation:** He shouldn't have appeared angry.
- **What is wrong:** "chahiye tha" is "should have" — a reproach — whereas "didn't need to" simply says it was unnecessary. This one drifted further than the other five: it changed the speaker's attitude, not just the modal.
- **Recommended fix:** उसे ग़ुस्से में दिखने की ज़रूरत नहीं थी।
- **Fix transliteration:** use gusse mein dikhne ki zarurat nahin thi.
- **Confidence:** high

---

### S355 — FIDELITY DRIFT

- **English taught:** Did she need to talk to that woman you know?
- **Hindi now:** क्या उसे उस औरत से बात करनी चाहिए थी जिसे आप जानते हैं?
- **Transliteration:** kya use us aurat se baat karni chahiye thi jise aap jaante hain?
- **Word by word:** kya [Q] / use [to her] / us aurat se [with that woman] / baat karni [to talk] / chahiye thi [should have] / jise [whom] / aap jaante hain [you know]
- **Back-translation:** Should she have talked to that woman you know?
- **What is wrong:** "chahiye thi" = "should have"; the English asks whether it was *necessary*, not whether it was *advisable*.
- **Recommended fix:** क्या उसे उस औरत से बात करने की ज़रूरत थी जिसे आप जानते हैं?
- **Fix transliteration:** kya use us aurat se baat karne ki zarurat thi jise aap jaante hain?
- **Confidence:** high

---

### S377 — FIDELITY DRIFT

- **English taught:** Did you go anywhere in the world last year?
- **Hindi now:** क्या आप पिछले साल विदेश गए थे?
- **Transliteration:** kya aap pichhle saal videsh gaye the?
- **Word by word:** kya [Q] / aap [you] / pichhle saal [last year] / videsh [abroad, foreign country] / gaye the [had gone]
- **Back-translation:** Did you go abroad last year?
- **What is wrong:** "videsh" means "abroad" — the words "anywhere" and "world" have both vanished from the prompt, and a learner reading it will produce "Did you go abroad last year?"
- **Recommended fix:** क्या आप पिछले साल दुनिया में कहीं गए?
- **Fix transliteration:** kya aap pichhle saal duniya mein kahin gaye?
- **Confidence:** high

---

### S380 — FIDELITY DRIFT

- **English taught:** I asked what she wanted to include.
- **Hindi now:** मैंने पूछा कि वह क्या जोड़ना चाहती है।
- **Transliteration:** maine poochha ki vah kya jodna chahti hai.
- **Word by word:** maine poochha [I asked] / ki [that] / vah [she] / kya [what] / jodna [to add] / chahti hai [wants]
- **Back-translation:** I asked what she wants to add.
- **What is wrong:** "jodna" is "to add", not "include", and "chahti hai" is present "wants" where the English is past "wanted" — the old Hindi had both right. Note the collision with seed 335, where the English verb **"add"** is rendered "de" (give): the two verbs have swapped places.
- **Recommended fix:** मैंने पूछा कि वह क्या शामिल करना चाहती थी।
- **Fix transliteration:** maine poochha ki vah kya shaamil karna chahti thi.
- **Confidence:** high

---

### S384 — FIDELITY DRIFT

- **English taught:** I couldn't agree with what he said a moment ago.
- **Hindi now:** थोड़ी देर पहले उसने जो कहा, मैं उससे सहमत नहीं था।
- **Transliteration:** thodi der pehle usne jo kaha, main usse sahmat nahin tha.
- **Word by word:** thodi der pehle [a little while ago] / usne jo kaha [what he said] / main [I] / usse [with it] / sahmat nahin tha [was not in agreement]
- **Back-translation:** I did not agree with what he said a moment ago.
- **What is wrong:** "sahmat nahin tha" is "didn't agree"; the modal "couldn't" is gone (the old Hindi had "sahmat nahin ho saka" = "couldn't agree").
- **Recommended fix:** थोड़ी देर पहले उसने जो कहा, मैं उससे सहमत नहीं हो सका।
- **Fix transliteration:** thodi der pehle usne jo kaha, main usse sahmat nahin ho saka.
- **Confidence:** high

---

### S390 — FIDELITY DRIFT

- **English taught:** The one who is standing near the entrance.
- **Hindi now:** जो दरवाज़े के पास खड़ा है।
- **Transliteration:** jo darwaaze ke paas khada hai.
- **Word by word:** jo [who] / darwaaze ke paas [near the door] / khada hai [is standing]
- **Back-translation:** The one who is standing near the door.
- **What is wrong:** "darwaaza" is "door"; nothing in the prompt now says "entrance".
- **Recommended fix:** जो प्रवेश द्वार के पास खड़ा है।
- **Fix transliteration:** jo pravesh dwaar ke paas khada hai.
- **Confidence:** high on the drift. "pravesh dwaar" is bookish, which is very likely why she changed it — Shuchita should pick a natural everyday word for "entrance" rather than simply reverting.

---

### S403 — FIDELITY DRIFT

- **English taught:** We should remain quiet for as long as possible.
- **Hindi now:** हमें ज़्यादा से ज़्यादा चुप रहना चाहिए।
- **Transliteration:** hamein zyada se zyada chup rehna chahiye.
- **Word by word:** hamein [to us] / zyada se zyada [at most, as much as possible] / chup rehna [to stay quiet] / chahiye [should]
- **Back-translation:** We should stay quiet as much as possible.
- **What is wrong:** "zyada se zyada" measures *amount*, not *duration*, so the prompt now says "as quiet as possible" instead of "for as long as possible".
- **Recommended fix:** हमें जितनी देर हो सके उतनी देर चुप रहना चाहिए।
- **Fix transliteration:** hamein jitni der ho sake utni der chup rehna chahiye.
- **Confidence:** high

---

### S407 — FIDELITY DRIFT

**English taught:** Shouldn't we try to set a good example?
**Hindi now:** क्या हमें अच्छा उदाहरण नहीं रखना चाहिए?
**Transliteration:** kya hamein achchha udaaharan nahin rakhna chaahiye?
**Word by word:** kya = [question marker] | hamein = to-us | achchha = good | udaaharan = example | nahin = not | rakhna = to keep/set | chaahiye = should
**Back-translation:** "Shouldn't we set a good example?"
**What is wrong:** the Hindi word for "try" — कोशिश (koshish) — was in the old version and is simply absent from the new one; nothing in the six remaining words means "try".
**Recommended fix:** क्या हमें अच्छा उदाहरण रखने की कोशिश नहीं करनी चाहिए?
**Fix transliteration:** kya hamein achchha udaaharan rakhne ki koshish nahin karni chaahiye?
**Confidence:** high.

---

### S414 — FIDELITY DRIFT

**English taught:** Could we have a bottle of red wine please?
**Hindi now:** क्या हमें एक बोतल रेड वाइन देंगे?
**Transliteration:** kya hamein ek botal red wine denge?
**Word by word:** kya = [q] | hamein = to-us | ek botal = one bottle | red wine = red wine | **denge = will [you] give**
**Back-translation:** "Will you give us a bottle of red wine?"
**What is wrong:** two losses. The verb is now "will give", pointed at the waiter, where the English is "could we have"; and कृपया ("please") from the old Hindi is gone with nothing replacing it — there is no politeness word left in the five-word prompt.
**Recommended fix:** क्या हमें एक बोतल रेड वाइन मिल सकती है, प्लीज़?
**Fix transliteration:** kya hamein ek botal red wine mil sakti hai, please?
**Confidence:** high that "please" is unrepresented. Medium on the modal — a Hindi ear does hear देंगे as polite. I used प्लीज़ rather than the old कृपया because she has been removing bookish register throughout; that word choice is hers to make.

---

### S421 — FIDELITY DRIFT + NEW ERROR

**English taught:** Because they already know he's getting weak.
**Hindi now:** क्योंकि वे पहले जानते हैं कि वे कमज़ोर होते जा रहे हैं।
**Transliteration:** kyunki ve pahle jaante hain ki ve kamzor hote jaa rahe hain.
**Word by word:** kyunki = because | ve = they | pahle = earlier/first | jaante hain = know | ki = that | **ve = they** | kamzor = weak | hote jaa rahe hain = are becoming
**Back-translation:** "Because they know beforehand that **they** are getting weak."
**What is wrong:** two things, both visible in the gloss — "already" was पहले **से** (pahle se) in the old Hindi and is now bare पहले (pahle, "earlier/first"), which does not mean "already"; and the "he" has become वे, *the identical word already used for "they" earlier in the same sentence*, so the line now reads as the same people getting weak.
**Recommended fix:** क्योंकि वे पहले से जानते हैं कि वह कमज़ोर होता जा रहा है।
**Fix transliteration:** kyunki ve pahle se jaante hain ki vah kamzor hota jaa raha hai.
**Confidence:** high on "already" — I checked, and the course's other "already" seed (244) uses पहले **ही**; bare पहले is used for "already" nowhere. Medium on the pronoun: वे is also Hindi's *respectful singular* "he", and the seed next door (420) did shift to respectful agreement for the same man — but even on that reading it is now the same word as "they" in the same sentence, so the fix stands either way.

---

### S423 — FIDELITY DRIFT *(confirms the specimen already in your brief)*

**English taught:** Do they need to ask such an obvious question?
**Hindi now:** क्या उन्हें इतना स्पष्ट सवाल पूछना चाहिए?
**Transliteration:** kya unhein itna spasht savaal poochhna chaahiye?
**Word by word:** kya = [q] | unhein = to-them | itna = so | spasht = obvious | savaal = question | poochhna = to ask | chaahiye = should
**Back-translation:** "Should they ask such an obvious question?"
**What is wrong:** चाहिए (chaahiye) is the Hindi word for "should"; the English says "need to". The old Hindi had ज़रूरत (zaroorat, "need") — the word this course uses for "need" in seeds 320, 396 and 420.
**Recommended fix:** क्या उन्हें इतना स्पष्ट सवाल पूछने की ज़रूरत है?
**Fix transliteration:** kya unhein itna spasht savaal poochhne ki zaroorat hai?
**Confidence:** high.

---

### S433 — FIDELITY DRIFT

**English taught:** They couldn't find out when the film started.
**Hindi now:** उन्हें पता नहीं लगा कि फ़िल्म कब शुरू हुई थी।
**Transliteration:** unhein pata nahin laga ki film kab shuru hui thi.
**Word by word:** unhein = to-them | pata nahin laga = did not become known | ki = that | film = film | kab = when | shuru hui thi = had started
**Back-translation:** "They didn't find out when the film had started."
**What is wrong:** the "could" is gone. The old Hindi had सके (sake), the Hindi ability marker — "were able to". The new sentence has no ability marker at all, so it says they simply did not find out.
**Recommended fix:** वे पता नहीं लगा सके कि फ़िल्म कब शुरू हुई।
**Fix transliteration:** ve pata nahin laga sake ki film kab shuru hui.
**Confidence:** high.

---

### S468 — FIDELITY DRIFT (+ ZUT clash)

**English taught:** It's a big world.
**Hindi now:** दुनिया बहुत बड़ी है।
**Transliteration:** duniya bahut badi hai.
**Word by word:** duniya = world | bahut = very | badi = big | hai = is
**Back-translation:** "The world is very big."
**What is wrong:** a "very" has appeared that the English does not have, and the "it's a …" frame has gone. **ZUT:** this exact Hindi is the natural prompt for a different English sentence, "The world is very big."
**Recommended fix:** यह एक बड़ी दुनिया है।
**Fix transliteration:** yah ek badi duniya hai.
**Confidence:** high.

---

### S478 — FIDELITY DRIFT

**English taught:** She has such a kind heart.
**Hindi now:** वह बहुत दयालु है।
**Transliteration:** vah bahut dayaalu hai.
**Word by word:** vah = she | bahut = very | dayaalu = kind | hai = is
**Back-translation:** "She is very kind."
**What is wrong:** count the words — there are four, and none of them is a noun. दिल (dil, "heart") was in the old Hindi and has vanished; the learner is being asked to produce "She has such a kind heart" from a prompt that says "she is very kind".
**Recommended fix:** उसका दिल इतना अच्छा है।
**Fix transliteration:** uska dil itna achchha hai.
**Confidence:** high.

---

### S491 — FIDELITY DRIFT

**English taught:** I love the way you try to help.
**Hindi now:** मुझे आपके मदद करने का तरीक़ा पसंद है।
**Transliteration:** mujhe aapke madad karne ka tariqa pasand hai.
**Word by word:** mujhe = to-me | aapke = your | madad karne ka = of helping | tariqa = way | pasand hai = is liked
**Back-translation:** "I like your way of helping."
**What is wrong:** the same dropped "try" as seed 407 — कोशिश (koshish) was in the old Hindi and is gone.
**Recommended fix:** मुझे वह तरीक़ा पसंद है जिससे आप मदद करने की कोशिश करते हैं।
**Fix transliteration:** mujhe vah tariqa pasand hai jisse aap madad karne ki koshish karte hain.
**Confidence:** high.

---

### S503 — FIDELITY DRIFT

**English taught:** I hate making trouble but that one's mine.
**Hindi now:** मुझे परेशानी खड़ी करना पसंद नहीं है लेकिन यह मेरा है।
**Transliteration:** mujhe pareshaani khadi karna pasand nahin hai lekin yah mera hai.
**Word by word:** mujhe = to-me | pareshaani khadi karna = making trouble | **pasand nahin hai = is not liked** | lekin = but | yah = this | mera hai = is mine
**Back-translation:** "I don't like making trouble, but this one is mine."
**What is wrong:** "hate" has been softened to "don't like". The old Hindi had नफ़रत (nafrat, "hatred").
**Recommended fix:** मुझे परेशानी खड़ी करने से नफ़रत है, लेकिन वह वाला मेरा है।
**Fix transliteration:** mujhe pareshaani khadi karne se nafrat hai, lekin vah vaala mera hai.
**Confidence:** high on the verb. Separately: *both* old and new say यह ("this") where the English says "that one" — a pre-existing miss, and my fix above repairs it too.

---

### S509 — FIDELITY DRIFT

**English taught:** I heard that you're going to pay for a new bed.
**Hindi now:** मैंने सुना है कि आप एक नया बेड ख़रीदने वाले हैं।
**Transliteration:** maine suna hai ki aap ek naya bed kharidne vaale hain.
**Word by word:** maine = I | suna hai = have heard | ki = that | aap = you | ek naya bed = a new bed | **kharidne vaale hain = are going to buy**
**Back-translation:** "I heard that you're going to buy a new bed."
**What is wrong:** the verb is now "buy". "Pay for" has no counterpart anywhere in the new Hindi; the old Hindi had भुगतान (bhugtaan, "payment") — a word she *kept* in the very next seed, 508, for "pay".
**Recommended fix:** मैंने सुना है कि आप एक नए बेड के पैसे देने वाले हैं।
**Fix transliteration:** maine suna hai ki aap ek naye bed ke paise dene vaale hain.
**Confidence:** high.

---

### S516 — FIDELITY DRIFT

**English taught:** They both came on their own.
**Hindi now:** वे दोनों अलग-अलग आए थे।
**Transliteration:** ve donon alag-alag aaye the.
**Word by word:** ve = they | donon = both | **alag-alag = separately, each apart** | aaye the = had come
**Back-translation:** "They both came separately."
**What is wrong:** अलग-अलग means "separately, one apart from the other" — it says they arrived by different routes or at different times, which is a different claim from "unaccompanied". The old Hindi had अपने दम पर (apne dam par, "under their own steam").
**Recommended fix:** वे दोनों अपने आप आए थे।
**Fix transliteration:** ve donon apne aap aaye the.
**Confidence:** high.

---

### S534 — FIDELITY DRIFT

**English taught:** Let's not go outside in this dreadful weather.
**Hindi now:** हमें इस भयानक मौसम में बाहर नहीं जाना चाहिए।
**Transliteration:** hamein is bhayaanak mausam mein baahar nahin jaana chaahiye.
**Word by word:** hamein = to-us | is = this | bhayaanak = dreadful | mausam mein = weather in | baahar = outside | nahin = not | jaana = to go | chaahiye = should
**Back-translation:** "We shouldn't go outside in this dreadful weather."
**What is wrong:** the same चाहिए = "should" as seed 423, and here it has eaten a "Let's". The old Hindi had चलो … न जाएँ (chalo … na jaayen, "let's not go"). I checked the rest of the course: seed 158 ("Let's talk about something else") and seed 522 ("Let's agree…") both still use चलिए/चलो — so this line is inconsistent with her own pass.
**Recommended fix:** चलो इस भयानक मौसम में बाहर न जाएँ।
**Fix transliteration:** chalo is bhayaanak mausam mein baahar na jaayen.
**Confidence:** high.

---

### S536 — FIDELITY DRIFT

- **English taught:** I used to think that being crazy was bad.
- **Hindi now:** मुझे लगता था कि झक्की होना बुरा है।
- **Transliteration:** mujhe lagta tha ki jhakki hona bura hai.
- **Word by word:** mujhe = to-me | lagta tha = used-to-seem | ki = that | jhakki = eccentric / cranky / oddball | hona = being | bura hai = is bad
- **Back-translation:** "I used to think that being an oddball is bad."
- **What is wrong:** झक्की / jhakki means "eccentric, cranky, a bit odd" — it is not the word for "crazy"; the old Hindi had पागल / paagal, which is.
- **Recommended fix:** मुझे लगता था कि पागल होना बुरा है।
- **Fix transliteration:** mujhe lagta tha ki paagal hona bura hai.
- **Confidence:** high

---

### S571 — FIDELITY DRIFT (the "not sure → don't think" class)

- **English taught:** I'm not convinced that would be a very good idea.
- **Hindi now:** मुझे नहीं लगता यह बहुत अच्छा विचार होगा।
- **Transliteration:** mujhe nahin lagta yah bahut achchha vichaar hoga.
- **Word by word:** mujhe = to-me | nahin lagta = does-not-seem | yah = this | bahut = very | achchha = good | vichaar = idea | hoga = would-be
- **Back-translation:** "I don't think this would be a very good idea."
- **What is wrong:** there is no word for "convinced" or "sure" left in the gloss — "नहीं लगता / nahin lagta" is the everyday Hindi for "I don't think", so the learner produces "I don't think" instead of "I'm not convinced"; the old Hindi had यकीन / yaqeen (= certainty, conviction).
- **Recommended fix:** मुझे यकीन नहीं है कि यह बहुत अच्छा विचार होगा।
- **Fix transliteration:** mujhe yaqeen nahin hai ki yah bahut achchha vichaar hoga.
- **Confidence:** high

---

### S573 — FIDELITY DRIFT (singular becomes plural)

- **English taught:** It's the kind of thing that makes the holidays very special.
- **Hindi now:** इस तरह की चीज़ें छुट्टियों को बहुत ख़ास बना देती हैं।
- **Transliteration:** is tarah ki cheezein chhuttiyon ko bahut khaas bana deti hain.
- **Word by word:** is tarah ki = of this kind | cheezein = THINGS (plural) | chhuttiyon ko = the holidays (object) | bahut = very | khaas = special | bana deti hain = make (plural verb)
- **Back-translation:** "Things of this kind make the holidays very special."
- **What is wrong:** both the noun and the verb are plural and the "It's … that …" frame is gone, so the learner produces "These kinds of things make the holidays very special", not the taught sentence.
- **Recommended fix:** यह उस तरह की चीज़ है जो छुट्टियों को बहुत ख़ास बना देती है।
- **Fix transliteration:** yah us tarah ki cheez hai jo chhuttiyon ko bahut khaas bana deti hai.
- **Confidence:** high

---

### S580 — FIDELITY DRIFT + ZUT clash with seed 578

- **English taught:** We've often wanted to take the children somewhere a little warmer.
- **Hindi now:** हमने अक्सर बच्चों को किसी ज़्यादा गर्म जगह ले जाना चाहा है।
- **Transliteration:** humne aksar bachchon ko kisi zyaada garm jagah le jaana chaaha hai.
- **Word by word:** humne = we (erg) | aksar = often | bachchon ko = the children | kisi = some | zyaada = more | garm = warm | jagah = place | le jaana = to take | chaaha hai = have wanted
- **Back-translation:** "We've often wanted to take the children to some warmer place."
- **What is wrong:** थोड़ा / thoda = "a little" has been dropped, so "a little warmer" now reads as plain "warmer" — and that makes this phrase character-for-character identical to seed 578's whole prompt (**किसी ज़्यादा गर्म जगह**, "Somewhere warmer"): one Hindi string now serves two different English sentences.
- **Recommended fix:** हमने अक्सर बच्चों को किसी थोड़ी ज़्यादा गर्म जगह ले जाना चाहा है।
- **Fix transliteration:** humne aksar bachchon ko kisi thodi zyaada garm jagah le jaana chaaha hai.
- **Confidence:** high

---

### S593 — FIDELITY DRIFT

- **English taught:** However much I argued I still had to share.
- **Hindi now:** इतनी बहस करने के बावजूद, मुझे बाँटना ही पड़ा।
- **Transliteration:** itni bahas karne ke baavajood, mujhe baantna hi pada.
- **Word by word:** itni = this-much | bahas karne = arguing | ke baavajood = DESPITE | mujhe = to-me | baantna = to-share | hi = indeed / still | pada = had-to
- **Back-translation:** "Despite arguing so much, I did have to share."
- **What is wrong:** the gloss now contains बावजूद / baavajood = "despite" and a fixed amount ("so much"), where the English is the concessive "however much" — the learner produces "Despite arguing so much, I still had to share."
- **Recommended fix:** मैंने चाहे जितनी भी बहस की, फिर भी मुझे बाँटना पड़ा।
- **Fix transliteration:** maine chaahe jitni bhi bahas ki, phir bhi mujhe baantna pada.
- **Confidence:** high

---

### S597 — FIDELITY DRIFT (quantifier)

- **English taught:** I suspect that he's heard a hundred stories about it.
- **Hindi now:** मुझे लगता है उसने इस बारे में सैकड़ों कहानियाँ सुनी हैं।
- **Transliteration:** mujhe lagta hai usne is baare mein saikdon kahaaniyaan suni hain.
- **Word by word:** mujhe lagta hai = it seems to me | usne = he (erg) | is baare mein = about this | saikdon = HUNDREDS-OF | kahaaniyaan = stories | suni hain = has heard
- **Back-translation:** "I think he's heard hundreds of stories about this."
- **What is wrong:** सौ / sau = "a hundred" was replaced by सैकड़ों / saikdon = "hundreds" — the learner produces "hundreds of stories", not "a hundred stories". Same shape as the known "enough → many" specimen.
- **Recommended fix:** मुझे लगता है उसने इस बारे में सौ कहानियाँ सुनी हैं।
- **Fix transliteration:** mujhe lagta hai usne is baare mein sau kahaaniyaan suni hain.
- **Confidence:** high

---

### S604 — FIDELITY DRIFT (the dropped "let")

- **English taught:** She offered to let us stay with her.
- **Hindi now:** उसने पेशकश की कि हम उसके साथ रह सकते हैं।
- **Transliteration:** usne peshkash ki ki ham uske saath rah sakte hain.
- **Word by word:** usne = she (erg) | peshkash ki = made-an-offer | ki = that | ham = we | uske saath = with her | rah sakte hain = CAN STAY
- **Back-translation:** "She offered that we could stay with her."
- **What is wrong:** the "let" is gone — "रह सकते हैं / rah sakte hain" is "can stay"; the old Hindi had रहने देने / rahne dene, which is literally "to let stay".
- **Recommended fix:** उसने हमें अपने साथ रहने देने की पेशकश की।
- **Fix transliteration:** usne hamein apne saath rahne dene ki peshkash ki.
- **Confidence:** high

---

### S610 — FIDELITY DRIFT (the modal-softening class, exactly)

- **English taught:** He needs to look for work.
- **Hindi now:** उसे काम ढूँढ़ना चाहिए।
- **Transliteration:** use kaam dhoondhna chaahiye.
- **Word by word:** use = to-him | kaam = work | dhoondhna = to-look-for | chaahiye = SHOULD
- **Back-translation:** "He should look for work."
- **What is wrong:** चाहिए / chaahiye is the Hindi word for "should"; "needs to" has been softened to "should", the same defect as seeds 319/327/354/355/423. The old Hindi ("ढूँढना है") carried the obligation.
- **Recommended fix:** उसे काम ढूँढ़ना है।
- **Fix transliteration:** use kaam dhoondhna hai.
- **Confidence:** high
- **Related, worth Kai knowing:** seed 595 ("I need to lie down in the garden") moved the *other* way in the same pass — from "लेटने की ज़रूरत है" (has the need to) to "लेटना है" (has to). The course now expresses "need to" three different ways (ज़रूरत है / -ना है / चाहिए). Only the चाहिए one actually changes the English, so 610 is the one to fix; 595 is a consistency question, not a drift.

---

### S615 — FIDELITY DRIFT (tense + a dropped "very")

- **English taught:** I thought you were very brave to say that.
- **Hindi now:** मेरा ख़्याल है कि आपका ऐसा कहना बहादुरी थी।
- **Transliteration:** mera khyaal hai ki aapka aisa kahna bahaaduri thi.
- **Word by word:** mera khyaal hai = my opinion IS (present tense) | ki = that | aapka = your | aisa kahna = saying-that | bahaaduri = bravery | thi = was
- **Back-translation:** "I think that your saying that was bravery."
- **What is wrong:** है / hai is present tense where the English is "I thought", and बहुत / bahut = "very" has disappeared.
- **Recommended fix:** मुझे लगा कि ऐसा कहने में आप बहुत बहादुर थे।
- **Fix transliteration:** mujhe laga ki aisa kahne mein aap bahut bahaadur the.
- **Confidence:** high

---

### S616 — FIDELITY DRIFT (tense + a dropped "very")

- **English taught:** You were very brave to say you thought that.
- **Hindi now:** ऐसा कहना आपकी बहादुरी थी कि आप ऐसा सोचते हैं।
- **Transliteration:** aisa kahna aapki bahaaduri thi ki aap aisa sochte hain.
- **Word by word:** aisa kahna = saying-that | aapki = your | bahaaduri = bravery | thi = was | ki = that | aap = you | aisa = so | sochte hain = THINK (present tense)
- **Back-translation:** "It was your bravery to say that you think that."
- **What is wrong:** सोचते हैं / sochte hain is present ("you think") where the English is "you thought", and "very brave" has become the noun "your bravery" with "very" gone.
- **Recommended fix:** यह कहने में आप बहुत बहादुर थे कि आपने ऐसा सोचा।
- **Fix transliteration:** yah kahne mein aap bahut bahaadur the ki aapne aisa socha.
- **Confidence:** high

---

### S629 — FIDELITY DRIFT (a noun added that isn't in the English)

- **English taught:** I like it with milk but without sugar.
- **Hindi now:** मुझे चाय दूध के साथ लेकिन चीनी के बिना पसंद है।
- **Transliteration:** mujhe chaay doodh ke saath lekin cheeni ke bina pasand hai.
- **Word by word:** mujhe = to-me | chaay = TEA | doodh ke saath = with milk | lekin = but | cheeni ke bina = without sugar | pasand hai = is liked
- **Back-translation:** "I like tea with milk but without sugar."
- **What is wrong:** चाय / chaay = "tea" was inserted; the English says "it", so the learner will produce "I like tea with milk…".
- **Recommended fix:** मुझे यह दूध के साथ लेकिन चीनी के बिना पसंद है।
- **Fix transliteration:** mujhe yah doodh ke saath lekin cheeni ke bina pasand hai.
- **Confidence:** high

---

### S657 — FIDELITY DRIFT (the taught verb has disappeared)

- **English taught:** how do you all feel?
- **Hindi now:** आप सब कैसे हैं?
- **Transliteration:** aap sab kaise hain?
- **Word by word:** aap = you | sab = all | kaise = how | hain = are
- **Back-translation:** "How are you all?"
- **What is wrong:** there is no word for "feel" left at all — this is now the standard Hindi greeting "how are you", and the parallel seed 642 ("how do you feel madam?") still uses महसूस / mahsoos = "feel", so the same English verb has two unrelated Hindi prompts.
- **Recommended fix:** आप सब कैसा महसूस कर रहे हैं?
- **Fix transliteration:** aap sab kaisa mahsoos kar rahe hain?
- **Confidence:** high


---

# BAND 2 — ERRORS SHE INTRODUCED (8)

Not judgement calls. In each of these the gloss itself shows a word doubled, a postposition missing, or an ending that does not agree.

---

### S119 — NEW ERROR (the question particle is missing)

- **English taught:** Can I ask you something before you leave?
- **Hindi now:** आपके जाने से पहले मैं आपसे कुछ पूछ सकता हूँ?
- **Transliteration:** aapke jaane se pahle main aapse kuchh poochh sakta hoon?
- **Word by word:** your / going / from / before / I / you-from / something / ask / can / am?
- **Back-translation:** Before you leave, I can ask you something? — a statement with a question mark on it.
- **What is wrong:** क्या, the particle that opens every other yes/no question in this course (seeds 25, 63, 75, 271, 284 all begin with it), has been dropped, and the old Hindi had it — so on the page only the question mark marks this as a question, and in the recorded prompt there is nothing marking it at all.
- **Recommended fix:** क्या मैं आपके जाने से पहले आपसे कुछ पूछ सकता हूँ?
- **Fix transliteration:** kya main aapke jaane se pahle aapse kuchh poochh sakta hoon?
- **Confidence:** high. Note again: her edit to this seed **fixed** the missing subject that was flagged as the worst drift on the estate.

---

### S143 — NEW ERROR

- **English taught:** It's the same thing as we were talking about earlier.
- **Hindi now:** हम पहले इसी बारे में हम बात कर रहे थे।
- **Transliteration:** ham pahle isi bare mein ham baat kar rahe the.
- **Word by word:** we / earlier / this-very / about / **we** / talk / doing / were.
- **Back-translation:** "We earlier about this very thing **we** were talking."
- **What is wrong:** The word **हम** ("we") appears twice in one clause — count it in the gloss, positions 1 and 5 — which is ungrammatical; separately, the "It's the same thing as…" framing is gone and the sentence is now a plain past statement, so the learner is no longer cued to produce "It's the same thing as".
- **Recommended fix:** यह वही बात है जिसके बारे में हम पहले बात कर रहे थे।
- **Fix transliteration:** yah vahi baat hai jiske bare mein ham pahle baat kar rahe the.
- **Confidence:** high

---

### S221 — NEW ERROR

- **English taught:** I watched the football and then I watched a film.
- **Hindi now:** मैंने फ़ुटबॉल देखी और फिर एक फ़िल्म देखी।
- **Transliteration:** maine futbol **dekhi** aur phir ek film dekhi.
- **Word by word:** I-erg / football / watched-**FEMININE** / and / then / one / film / watched-feminine.
- **Back-translation:** "I watched the football and then watched a film." (meaning intact; the grammar is not)
- **What is wrong:** Hindi verbs agree in gender with the object — फ़िल्म is feminine so देखी is right at the end, but फ़ुटबॉल is masculine and needs देखा; she changed the first verb from देखा to देखी, evidently pulled across by the second one, and the two identical verb forms in the gloss are the tell.
- **Recommended fix:** मैंने फ़ुटबॉल देखा और फिर एक फ़िल्म देखी।
- **Fix transliteration:** maine futbol dekha aur phir ek film dekhi.
- **Confidence:** high

---

### S308 — NEW ERROR

- **English taught:** Yes she's a friend of my mother.
- **Hindi now:** हाँ, वह मेरी माँ की सहेली हैं।
- **Transliteration:** haan, vah meri maa ki saheli hain.
- **Word by word:** haan [yes] / **vah** [she — plain singular] / meri maa ki [my mother's] / saheli [female friend] / **hain** [are — honorific plural]
- **Back-translation:** Yes, she is a friend of my mother. — with the subject in the plain form and the verb in the respectful form.
- **What is wrong:** She raised the verb to the honorific ("hain") but left the pronoun in the plain singular ("vah"); Hindi wants either "ve … hain" or "vah … hai", not one of each.
- **Recommended fix:** हाँ, वे मेरी माँ की सहेली हैं।
- **Fix transliteration:** haan, ve meri maa ki saheli hain.
- **Confidence:** medium — "vah … hain" is heard in casual speech, so a native speaker may not call it an error. What settles it: she used the honorific "unhein" at the very next seed (309), so "ve" is clearly what she meant here.

---

### S426 — NEW ERROR

**English taught:** They would like to love each other but they're unhappy.
**Hindi now:** वे एक-दूसरे से प्यार करना चाहते, लेकिन वे दुखी हैं।
**Transliteration:** ve ek-doosre se pyaar karna chaahte, lekin ve dukhi hain.
**Word by word:** ve = they | ek-doosre se = each other with | pyaar karna = to love | **chaahte = want-[UNFINISHED]** | lekin = but | ve = they | dukhi = unhappy | **hain = are**
**Back-translation:** "They … to love each other, but they are unhappy." The first clause has no finished verb.
**What is wrong:** चाहते is a bare participle and Hindi requires an auxiliary after it — चाहते **हैं** ("want") or चाहेंगे ("would like"). You can see the asymmetry in the gloss: the second clause in the very same sentence keeps its auxiliary (हैं), the first has lost one. The old Hindi had चाहेंगे, which is also the correct match for "would like".
**Recommended fix:** वे एक-दूसरे से प्यार करना चाहेंगे, लेकिन वे दुखी हैं।
**Fix transliteration:** ve ek-doosre se pyaar karna chaahenge, lekin ve dukhi hain.
**Confidence:** high.

---

### S589 — NEW ERROR (spelling; also affects 590 and 620)

- **English taught:** She told me she'd just seen the last bus.
- **Hindi now:** उसने मुझे बताया कि उसने अभी आख़री बस देखी थी।
- **Transliteration:** usne mujhe bataaya ki usne abhi aakhri bas dekhi thi.
- **Word by word:** usne = she (erg) | mujhe = to-me | bataaya = told | ki = that | usne = she (erg) | abhi = just | aakhri = last | bas = bus | dekhi thi = had seen
- **Back-translation:** "She told me that she had just seen the last bus." — the sentence is right; one word's spelling is not.
- **What is wrong:** आख़री is a common colloquial misspelling of आख़िरी / aakhiri ("last") — a vowel is missing; it occurs in exactly three seeds in the whole course (589, 590, 620), all three introduced by this edit pass.
- **Recommended fix:** आख़िरी (in all three seeds)
- **Fix transliteration:** aakhiri
- **Confidence:** medium — many Hindi speakers write आख़री and the TTS will read it acceptably; this is a spelling-consistency point, not a meaning error, and it is the lowest-priority item in this report.

---

### S608 — NEW ERROR (agreement, and inconsistent with her own next seed)

- **English taught:** It would have been the sensible thing to do.
- **Hindi now:** ऐसा करना समझदारी होती।
- **Transliteration:** aisa karna samajhdaari hoti.
- **Word by word:** aisa karna = doing-that (masculine subject) | samajhdaari = wisdom (feminine noun) | hoti = would-be (FEMININE verb)
- **Back-translation:** "Doing that would have been wisdom."
- **What is wrong:** the feminine verb होती / hoti has no feminine subject to agree with — her own next seed (609) solves the identical sentence by inserting बात / baat ("thing", feminine): "समझदारी की बात होती", and 608 does not.
- **Recommended fix:** ऐसा करना समझदारी की बात होती।
- **Fix transliteration:** aisa karna samajhdaari ki baat hoti.
- **Confidence:** medium — Hindi sometimes lets the verb agree with the predicate noun rather than the subject, so a native may accept it as written; the stronger argument for the fix is that it makes 608 match 609. The same pattern appears in her 615 ("आपका ऐसा कहना बहादुरी थी") and 616 ("ऐसा कहना आपकी बहादुरी थी").

---

### S641 — NEW ERROR (missing postposition)

- **English taught:** I think that it's the red one on that chair.
- **Hindi now:** मुझे लगता है लाल वाला है जो उस कुर्सी रखा है।
- **Transliteration:** mujhe lagta hai laal vaala hai jo us kursi rakha hai.
- **Word by word:** mujhe lagta hai = I think | laal vaala hai = is the red one | jo = which | us kursi = that chair | rakha hai = is placed
- **Back-translation:** "I think it's the red one which is placed that chair." — the word for "on" is simply absent.
- **What is wrong:** "उस कुर्सी" has no postposition after it; Hindi requires पर / par ("on") there, exactly as the old version had it — as written the clause is ungrammatical.
- **Recommended fix:** मुझे लगता है वह लाल वाला है जो उस कुर्सी पर रखा है।
- **Fix transliteration:** mujhe lagta hai vah laal vaala hai jo us kursi par rakha hai.
- **Confidence:** high


---

# BAND 3 — ZUT CLASHES (13 seeds, plus 4 families)

One Hindi prompt, two valid English answers. The learner cannot know which is wanted, and whichever they say they are marked as having practised the seed.

**The biggest is a family rather than a seed.** चाहिए (*chaahiye*, "should") is now the prompt for **both** "should" — seeds 98, 99, 328, 403, 404, 407, 438, 499 — **and** "need to" — seeds 207, 319, 325, 326, 327, 354, 355, 423, 497, 610. Twenty-one seeds, one word. Fixing the ten "need to" seeds in Band 1 fixes this too; it is the same repair.

Three more of the same shape, each measured:

- **पता नहीं** (*pata nahin*, "don't know") now prompts "I don't know why" at seed 135 **and** "I wonder if" at seeds 289 and 290. The course's other "I don't know" seeds, 213 and 263, use मुझे नहीं पता — so 135 is a straggler as well as a clash.
- **माफ़ करना** (*maaf karna*) now prompts "I'm sorry" at 140 and 193 **and** "I'm afraid" at 183.
- **मुझे नहीं लगता** (*mujhe nahin lagta*, "I don't think") now prompts "I don't think" (318, 326, 330, 336), "I'm not sure" (10, 62), "I'm not convinced" (571) and "I don't feel as if" (115). Four different English chunks, one Hindi cue.

---

### S51 — ZUT RISK: "like" and "enjoy" now share a prompt

- **English taught:** I enjoy doing interesting things with my friends.
- **Hindi now:** मुझे अपने दोस्तों के साथ रोचक काम करना पसंद है।
- **Transliteration:** mujhe apne doston ke saath rochak kaam karna pasand hai.
- **Word by word:** to-me / own / friends / with / interesting / work / to-do / **liked** / is
- **Back-translation:** I like doing interesting things with my friends.
- **What is wrong:** "…करना पसंद है" is this course's prompt for *like to do* (seeds 120 *you like to go by bus*, 121 *you don't like to use your car*, 240 *my father doesn't like to stop talking*), while *enjoy* is "अच्छा लगता है" (seed 206 *I enjoy the chance to practise*, and seed 55 which she moved **to** that form). She swapped seed 51 the opposite way, so the same prompt shape now asks for both *like* and *enjoy*.
- **Recommended fix:** मुझे अपने दोस्तों के साथ दिलचस्प काम करना अच्छा लगता है।
- **Fix transliteration:** mujhe apne doston ke saath dilchasp kaam karna achchha lagta hai.
- **Confidence:** high on the clash. Smaller point in the same line: she also changed *interesting* from दिलचस्प to रोचक, while seeds 58 and 120 keep दिलचस्प — two prompts for one English word. That isn't a ZUT violation, but it is avoidable noise.

---

### S216 — ZUT RISK *(not her drift — the old Hindi had it too)*

- **English taught:** I saw a few friends.
- **Hindi now:** मैं कुछ दोस्तों से मिला।
- **Transliteration:** main kuch doston se **mila**.
- **Word by word:** I / some / friends / with / **met**.
- **Back-translation:** "I met a few friends."
- **What is wrong:** The Hindi says "met", not "saw" — this prompt would serve **"I met a few friends"** exactly as well as the English on the seed, so the two English sentences share one prompt.
- **Honest caveat:** the old Hindi said मुलाकात की ("had a meeting with"), which is the same problem — she did not introduce this, and her version is better Hindi. Flagging it because the question asked was whether the *current* prompt elicits the English, and it does not reliably.
- **Recommended fix:** no confident fix — देखा (literal *saw*) would be wrong for people in Hindi. **This needs a translation-choice decision from Shuchita, or a change to the pairing, not a patch.**
- **Confidence:** high that the clash exists; no confidence in a fix.

---

### S240 — ZUT RISK

- **English taught:** My father doesn't like to stop talking.
- **Hindi now:** मेरे पिता को बोलना बंद करना पसंद नहीं है।
- **Transliteration:** mere pita ko **bolna** band karna pasand nahin hai.
- **Word by word:** my / father / to / **to-speak** / stop / to-do / liked / not / is.
- **Back-translation:** "My father doesn't like to stop speaking."
- **What is wrong:** बात करना ("to talk") became बोलना ("to speak"), and बोलना is already the prompt-word for "speaking" elsewhere in this course (e.g. seed 228, "practise speaking" = बोलने का अभ्यास), so "talk" and "speak" now share one Hindi cue.
- **Recommended fix:** मेरे पिता को बात करना बंद करना पसंद नहीं है।
- **Fix transliteration:** mere pita ko baat karna band karna pasand nahin hai.
- **Confidence:** medium — her को-construction change is a real improvement and should be kept; only the verb needs reverting. *(This course already has talk/speak muddle beyond her edits — seed 1's new Hindi uses बात करना for "speak".)*

---

### S266 — ZUT RISK

- **English taught:** He was an old friend of my father.
- **Hindi now:** वे मेरे पिता के एक पुराने दोस्त थे।
- **Transliteration:** ve mere pita ke ek puraane dost the.
- **Word by word:** ve [they / he-honorific] / mere pita ke [my father's] / ek [a/one] / puraane dost [old friend] / the [were]
- **Back-translation:** He (respectfully) was an old friend of my father. — or, read plainly: They were an old friend of my father.
- **What is wrong:** "ve … the" is the respectful way of saying "he was", but it is literally "they were", so this prompt could produce "They were old friends of my father"; the old "vah … tha" could only be "he was".
- **Recommended fix:** वह मेरे पिता का एक पुराना दोस्त था।
- **Fix transliteration:** vah mere pita ka ek puraana dost tha.
- **Confidence:** medium — the "ek" keeps it singular, so a careful learner still gets "he".

---

### S271 — ZUT RISK

- **English taught:** Would you like to come with us next month?
- **Hindi now:** क्या आप अगले महीने हमारे साथ चलना चाहेंगे?
- **Transliteration:** kya aap agle mahine hamaare saath chalna chaahenge?
- **Word by word:** kya [Q] / aap [you] / agle mahine [next month] / hamaare saath [with us] / chalna [to go along, to move] / chaahenge [would like]
- **Back-translation:** Would you like to go along with us next month?
- **What is wrong:** "chalna" is "to go/move along", so "come with us" and "go with us" are both natural readings; the old "aana" ("to come") could only be "come".
- **Recommended fix:** क्या आप अगले महीने हमारे साथ आना चाहेंगे?
- **Fix transliteration:** kya aap agle mahine hamaare saath aana chaahenge?
- **Confidence:** medium — "saath chalna" is the idiomatic Hindi for "come along", so many learners will still say "come".

---

### S289 and S290 — ZUT RISK

- **English taught:** 289 "I wonder if she's going to be there this afternoon." / 290 "I wonder if he knows the answer."
- **Hindi now:** 289 पता नहीं वह आज दोपहर वहाँ होगी या नहीं। / 290 पता नहीं उसे जवाब पता है या नहीं।
- **Transliteration:** pata nahin vah aaj dopahar vahaan hogi ya nahin. / pata nahin use jawaab pata hai ya nahin.
- **Word by word:** pata nahin [(I) don't know] / vah [she] / aaj dopahar [this afternoon] / vahaan [there] / hogi [will be] / ya nahin [or not] — and: pata nahin [don't know] / use [to him] / jawaab [answer] / pata hai [is known] / ya nahin [or not]
- **Back-translation:** I don't know whether she'll be there this afternoon or not. / I don't know whether he knows the answer or not.
- **What is wrong:** "pata nahin" is this course's own prompt for **"I don't know"** — seed 135, "I don't know why you think that it's so good", opens with the same two words — so these two seeds can equally produce "I don't know if…" rather than "I wonder if…". **Her edit is a genuine improvement** (the old "mujhe aashcharya hai" means "I am surprised", which was worse), so this needs a third form, not a revert.
- **Recommended fix:** न जाने वह आज दोपहर वहाँ होगी या नहीं। / न जाने उसे जवाब पता है या नहीं।
- **Fix transliteration:** na jaane vah aaj dopahar vahaan hogi ya nahin. / na jaane use jawaab pata hai ya nahin.
- **Confidence:** medium — "na jaane" is the closest Hindi to "I wonder", but it is slightly literary; Shuchita should choose between it and something like "sochta hoon ki kya…".

---

### S309 — ZUT RISK

- **English taught:** No I've never seen her before.
- **Hindi now:** नहीं, मैंने उन्हें पहले कभी नहीं देखा।
- **Transliteration:** nahin, maine unhein pehle kabhi nahin dekha.
- **Word by word:** nahin [no] / maine [I] / unhein [them / her-honorific] / pehle kabhi nahin [never before] / dekha [saw]
- **Back-translation:** No, I've never seen them before. — or: No, I've never seen her before.
- **What is wrong:** "unhein" is the same word for "them" and for a respectful "her", and nothing else in the sentence marks number or gender, so "I've never seen them before" is an equally valid English output; the old "use" was unambiguous.
- **Recommended fix:** नहीं, मैंने उसे पहले कभी नहीं देखा।
- **Fix transliteration:** nahin, maine use pehle kabhi nahin dekha.
- **Confidence:** medium

---

### S441 and S442 — ZUT RISK

**English taught:** *(441)* An approach. *(442)* Did they want to develop a new approach?
**Hindi now:** एक नज़रिया। / क्या वे एक नया नज़रिया विकसित करना चाहते थे?
**Transliteration:** ek nazariya. / kya ve ek naya nazariya viksit karna chaahte the?
**Word by word:** ek = a | **nazariya = viewpoint / outlook** | kya = [q] | ve = they | naya = new | viksit karna = to develop | chaahte the = wanted
**Back-translation:** "A viewpoint." / "Did they want to develop a new viewpoint?"
**What is wrong:** नज़रिया is "point of view / outlook", not "approach" — a learner would produce "A viewpoint" or "An outlook".
**Recommended fix: none yet, and this is deliberate.** I checked before recommending the obvious revert to the old एक तरीक़ा, and तरीक़ा is *already* this course's word for "way" — seed 408 ("the best way to make a happy family") and seed 491 ("the way you try to help") both use it. So reverting swaps one clash for another. Her change was solving a real problem. This needs a third word, chosen by a Hindi speaker.
**Confidence:** medium on the drift; the fix is genuinely open.

---

### S498 — ZUT RISK

**English taught:** He's standing alone over there inside the entrance.
**Hindi now:** वह वहाँ दरवाज़े के अंदर अकेला खड़ा है।
**Transliteration:** vah vahaan darvaaze ke andar akela khada hai.
**Word by word:** vah = he | vahaan = there | **darvaaze ke andar = door inside** | akela = alone | khada hai = is standing
**Back-translation:** "He's standing alone over there inside the door."
**What is wrong:** दरवाज़ा (darvaaza) is already this course's word for "door" — and the proof is the *next edited seed in this range*, 499: "Maybe we should open the door and close the window" = दरवाज़ा खोलना. One Hindi word now prompts two different English words. The old Hindi had प्रवेश द्वार (pravesh dvaar, "entrance").
**Recommended fix:** वह वहाँ प्रवेश द्वार के अंदर अकेला खड़ा है।
**Fix transliteration:** vah vahaan pravesh dvaar ke andar akela khada hai.
**Confidence:** high on the clash — seed 499 is right there. Medium on my particular fix: प्रवेश द्वार is exactly the formal register Shuchita has been stripping out, so she may want a third word. It just must not be दरवाज़ा.

---

### S501 — ZUT RISK

**English taught:** If only I could trust you to play together without arguing.
**Hindi now:** काश मैं आप पर भरोसा कर सकता कि आप बिना लड़े साथ खेलेंगे।
**Transliteration:** kaash main aap par bharosa kar sakta ki aap bina lade saath khelenge.
**Word by word:** kaash = if only | main = I | aap par = on you | bharosa kar sakta = could trust | ki = that | aap = you | **bina lade = without fighting** | saath = together | khelenge = will play
**Back-translation:** "If only I could trust you to play together without fighting."
**What is wrong:** लड़ना is "to fight" — the same verb this course uses for "fight" at seed 410, above. The old Hindi had झगड़ा (jhagda, "quarrel/argue"), which matches "arguing" and does not clash.
**Recommended fix:** काश मैं आप पर भरोसा कर सकता कि आप बिना झगड़े साथ खेलेंगे।
**Fix transliteration:** kaash main aap par bharosa kar sakta ki aap bina jhagde saath khelenge.
**Confidence:** medium. Keep the rest of her edit — she correctly added the missing "you" (आप) that the old Hindi lacked.

---

### S618 — ZUT RISK

- **English taught:** It doesn't feel like a long time.
- **Hindi now:** यह बहुत लंबा समय नहीं लगता।
- **Transliteration:** yah bahut lamba samay nahin lagta.
- **Word by word:** yah = this | bahut = VERY | lamba = long | samay = time | nahin lagta = doesn't seem
- **Back-translation:** "This doesn't seem like a very long time."
- **What is wrong:** बहुत / bahut = "very" was added, so this prompt now contains the exact phrase seed 620 uses for "a **very** long time" (बहुत लंबा समय) — the same Hindi would serve "It doesn't feel like a very long time" equally well.
- **Recommended fix:** यह लंबा समय नहीं लगता।
- **Fix transliteration:** yah lamba samay nahin lagta.
- **Confidence:** medium — Hindi often adds बहुत under negation without meaning "very". What would settle it: a native confirming that dropping it still sounds natural here.


---

# BAND 4 — SHE FIXED IT HERE BUT NOT THERE (26 seeds, 15 families)

**How to read the numbers.** Her systematic swaps were mostly complete: the honorific swap was 15 of 15, गाड़ी → कार was 7 of 7, and every nukta spelling family came out at zero remaining. Where a swap came out at 5 of 9, the four stragglers are the finding.

**The honest caveat, in the readers' own numbers.** The candidate families were built by machine and every hit was read. In the first half, 42 of 64 candidate seeds were thrown out as false positives — about two in three. In the second half it was worse: of roughly 230 candidate seed-instances, 4 survived. The machine list was a reading list and it behaved like one. What follows is what survived reading, and I would expect you to overturn some of even these.

## The two biggest families

**"feel" — 4 of 9.** She removed the calque-y महसूस करना ("to do feeling") at seeds 106, 118, 542 and 657, and left it standing at 40, 41, 42, 548 and 642. Seed 41 contradicts itself inside a single sentence she personally edited. The 642/657 pair is the clearest specimen on the page: the same English question, "how do you feel", now cued two different ways one seed apart.

**"important" — 5 of 9.** She swapped ज़रूरी for अहम at 137, 261, 311, 329 and 330, and left ज़रूरी at 65, 277, 280 and 356 — two of them seeds she edited in the same pass. Both words are correct Hindi; the course needs to pick one.

---

### Family: सके / जितनी (two headings, one underlying finding)

She fixed the "as X as possible/soon as I can" idiom (जितना/जितनी ... हो सके) 6 times,
replacing it with ज़्यादा से ज़्यादा / जल्दी से जल्दी (S3, S7, S29, S50, S403, S437). One
"सके" occurrence she left alone (S433) is a different sense of सके — "couldn't find out"
(ability, not the idiom) — so it isn't evidence either way.

SEED 28 — INCONSISTENT APPLICATION (सके / जितनी, applied 6 of 7 idiom-bearing seeds)
English taught: It's useful to start talking as soon as you can.
Hindi now: जितनी जल्दी हो सके बोलना शुरू करना उपयोगी रहता है।
Transliteration: jitni jaldi ho sake bolna shuru karna upyogi rahta hai.
Word by word: jitni-jaldi(as soon) ho-sake(as possible) bolna(to speak) shuru karna(to start) upyogi(useful) rahta hai(remains/is).
What is inconsistent: She fixed the identical "जितनी जल्दी हो सके" ("as soon as possible/as I can") idiom in S29 and S50, both to जल्दी से जल्दी. S28 still has the old idiom.
Recommended fix: जल्दी से जल्दी बोलना शुरू करना उपयोगी रहता है।
Fix transliteration: jaldi se jaldi bolna shuru karna upyogi rahta hai.
Confidence: high.

---

### Family: जैसे — she removed it from 2 seed(s), it survives in 1

SEED 26 — INCONSISTENT APPLICATION (जैसे, applied 2 of 3)
English taught: I like feeling as if I'm nearly ready to go.
Hindi now: मुझे यह अहसास अच्छा लग रहा है जैसे मैं जाने के लिए लगभग तैयार हूँ।
Transliteration: mujhe yah ehsaas achha lag raha hai jaise main jaane ke liye lagbhag taiyaar hoon.
Word by word: mujhe(to me) yah(this) ehsaas(feeling) achha(good) lag raha hai(feels) jaise(as if) main(I) jaane ke liye(to go) lagbhag(almost) taiyaar hoon(am ready).
What is inconsistent: In S114 and S497 she replaced the same "X लग रहा है जैसे Y" ("it feels as if") shape with the simpler "लगता/लग रहा है कि Y" ("it feels that Y") — e.g. S497's "ऐसा लग रहा है जैसे आपको...चाहिए" became "लगता है कि आपको...चाहिए।"
Recommended fix: मुझे यह अहसास अच्छा लग रहा है कि मैं जाने के लिए लगभग तैयार हूँ।
Fix transliteration: mujhe yah ehsaas achha lag raha hai ki main jaane ke liye lagbhag taiyaar hoon.
Confidence: medium — S26 has an extra noun "अहसास" (feeling) the other two didn't, so this could be deliberately distinct phrasing rather than a miss. Wants Shuchita's eye.

---

### Family: चलो — she removed it from 2 seed(s), it survives in 1

SEED 522 — INCONSISTENT APPLICATION (चलो, applied 1 of 2)
English taught: Let's agree that it was stupid to tell the truth.
Hindi now: चलो मान लेते हैं कि सच बोलना बेवक़ूफ़ी थी।
Transliteration: chalo maan lete hain ki sach bolna bewaqoofi thi.
Word by word: chalo(let's/come on — informal) maan lete hain(let's accept) ki(that) sach bolna(telling the truth) bewaqoofi thi(was foolish).
What is inconsistent: In S158 the identical "Let's + verb" opener was upgraded from the informal चलो to the more formal चलिए ("चलिए कुछ और बात करते हैं"), matching the formal "आप" register used throughout the course. S522 still opens with the informal चलो.
Recommended fix: चलिए मान लेते हैं कि सच बोलना बेवक़ूफ़ी थी।
Fix transliteration: chaliye maan lete hain ki sach bolna bewaqoofi thi.
Confidence: medium — only one direct चलो→चलिए swap is attested (S158); S534's other चलो removal restructured the whole sentence rather than confirming the same swap. Wants Shuchita's eye.

---

### Family: ऐसे — she removed it from 7 seed(s), it survives in 3

She systematically dropped ऐसा/ऐसे as unneeded filler in "[a/some] such-and-such person +
relative clause" under जानना/मिलना (know/meet) — e.g. S234 "किसी ऐसे व्यक्ति से मिला जो..."
→ "एक व्यक्ति से मिला जो..."

SEED 87 — INCONSISTENT APPLICATION (ऐसे, applied 7 of 10)
English taught: They are people I don't know.
Hindi now: वे ऐसे लोग हैं जिन्हें मैं नहीं जानता।
Transliteration: ve aise log hain jinhein main nahin jaanta.
Word by word: ve(they) aise(such) log hain(are people) jinhein(whom) main nahin jaanta(I don't know).
What is inconsistent: Same "ऐसे + person-noun + relative clause" filler under जानना she stripped seven times, just with the "known-people" phrase in subject position rather than object position.
Recommended fix: वे लोग हैं जिन्हें मैं नहीं जानता।
Fix transliteration: ve log hain jinhein main nahin jaanta.
Confidence: medium — structurally close to her fixes but not identical (subject vs. object position). Wants Shuchita's eye.

SEED 128 — INCONSISTENT APPLICATION (ऐसे, applied 7 of 10)
English taught: You're like someone I used to know.
Hindi now: आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं जानता था।
Transliteration: aap ek aise vyakti ki tarah hain jise main jaanta tha.
Word by word: aap(you) ek aise vyakti(a such person) ki tarah hain(are like) jise(whom) main jaanta tha(I knew).
What is inconsistent: The exact phrase "एक ऐसे व्यक्ति" is what she dropped ऐसे from in S234/S235/S236/S342; here it survives unchanged, just inside a "की तरह" (like) comparison instead of "जानना/मिलना."
Recommended fix: आप एक व्यक्ति की तरह हैं जिसे मैं जानता था।
Fix transliteration: aap ek vyakti ki tarah hain jise main jaanta tha.
Confidence: high.

SEED 287 — INCONSISTENT APPLICATION (ऐसे, applied 7 of 10)
English taught: How many people do you know who like watching television?
Hindi now: आप कितने ऐसे लोगों को जानते हैं जो टेलीविज़न देखना पसंद करते हैं?
Transliteration: aap kitne aise logon ko jaante hain jo television dekhna pasand karte hain?
Word by word: aap(you) kitne aise logon ko(how-many such people) jaante hain(know) jo(who) television dekhna pasand karte hain(like watching television).
What is inconsistent: Same "जानना" + person-noun + relative clause frame she dropped ऐसे from in S297 ("मैं बहुत कम ऐसे लोगों को जानता हूँ जो..." → "...ज़्यादा लोगों को नहीं जानता").
Recommended fix: आप कितने लोगों को जानते हैं जो टेलीविज़न देखना पसंद करते हैं?
Fix transliteration: aap kitne logon ko jaante hain jo television dekhna pasand karte hain?
Confidence: high.

---

### Family: कहने — she removed it from 3 seed(s), it survives in 2

SEED 159 — INCONSISTENT APPLICATION (कहने, applied 1 of 2 in the "trying to say" sub-pattern)
English taught: That isn't what I'm trying to say.
Hindi now: मैं यह कहने की कोशिश नहीं कर रहा।
Transliteration: main yah kahne ki koshish nahin kar raha.
Word by word: main(I) yah(this) kahne ki koshish(attempt of saying) nahin kar raha(am not doing).
What is inconsistent: In S205 she replaced the identical "X कहने की कोशिश कर रहा" ("trying to say X") idiom with the simpler "X कहना चाह रहा था" (wanted to say X). S159 still uses the "कोशिश" form.
Recommended fix: मैं यह कहना नहीं चाह रहा।
Fix transliteration: main yah kahna nahin chah raha.
Confidence: medium — only one direct precedent (S205); S615/S616 were restructured too differently to confirm a blanket rule against "कोशिश" phrasing here. Wants Shuchita's eye.

Also checked, not flagged: S298 "मेरे पास कहने के लिए कुछ नहीं बचा।" ("nothing left to say") uses
"कहने के लिए" — an infinitive-purpose "[nothing left] to say," a different construction from
"trying to say." False positive.

---

### Family: रूप — she removed it from 2 seed(s), it survives in 2

SEED 209 — INCONSISTENT APPLICATION (रूप, applied 1 of 2)
English taught: They want to spend more time meeting as a group.
Hindi now: वे एक ग्रुप के रूप में मिलकर ज़्यादा समय बिताना चाहते हैं।
Transliteration: ve ek group ke roop mein milkar zyada samay bitana chahte hain.
Word by word: ve(they) ek group ke roop mein(as/in-the-form-of a group) milkar(meeting) zyada samay bitana(to spend more time) chahte hain(want).
What is inconsistent: In S197 she dropped the identical "X के रूप में" ("as X") frame for an English "as [role]" phrase: "एक शिक्षक के रूप में काम करता है" (works as a teacher) → "एक शिक्षक है" (is a teacher). S474 similarly reduced "मुफ्त ऑफर के रूप में" to plain "मुफ़्त ऑफ़र में." S209 keeps the same calque for "as a group."
Recommended fix: वे एक ग्रुप में मिलकर ज़्यादा समय बिताना चाहते हैं।
Fix transliteration: ve ek group mein milkar zyada samay bitana chahte hain.
Confidence: medium — S474's fix kept "में" and only dropped "रूप" (the model used here), but S197's fix dropped the whole phrase, so the exact reduction Shuchita would pick for "as a group" isn't fully certain. Wants Shuchita's eye.

Also checked, not flagged: S117 "निश्चित रूप से बेहतर" ("definitely better") — रूप here is
part of the fixed adverb निश्चित रूप से ("definitely"), an unrelated sense. False positive.

---

### Family: बोलने — she removed it from 2 seed(s), it survives in 3

SEED 206 — INCONSISTENT APPLICATION (बोलने, applied 1 of 2)
English taught: I enjoy the chance to practise speaking with you.
Hindi now: मुझे आपके साथ बोलने का अभ्यास करने का मौक़ा पाना अच्छा लगता है।
Transliteration: mujhe aapke saath bolne ka abhyas karne ka mauka pana achha lagta hai.
Word by word: mujhe(to me) aapke saath(with you) bolne ka abhyas(practice of speaking) karne ka mauka(chance to do) pana achha lagta hai(getting it feels good).
What is inconsistent: S5 has the near-identical "किसी और के साथ बोलने का अभ्यास करने वाला हूँ" ("practise speaking WITH someone else") and she changed बोलने to बात करने there, since बात करना ("talk with") fits a with-someone construction better than the general verb बोलना. S206 keeps the old pattern.
Recommended fix: मुझे आपके साथ बात करने का अभ्यास करने का मौक़ा पाना अच्छा लगता है।
Fix transliteration: mujhe aapke saath baat karne ka abhyas karne ka mauka pana achha lagta hai.
Confidence: high.

Also checked, not flagged: S228 "practise speaking" (no "with someone") and S297 "अंग्रेज़ी
बोलने वाले" ("English-speaking [people]," speaking a language) both use बोलना correctly in
senses she never touched. False positives.

---

### Family: चाहूँगा। — she removed it from 2 seed(s), it survives in 3

Note: चाहूँगा itself isn't removed in her fixes — it survives in her NEW Hindi too, just
moved off the sentence-final position. The real pattern is that she moved a fronted "X के
बाद"/"कि" subordinate clause to trail the main verb instead of leading it.

SEED 110 — INCONSISTENT APPLICATION (चाहूँगा।, applied 1 of 2)
English taught: We're friends, and after we finish I'd like to relax.
Hindi now: हम दोस्त हैं, और यह पूरा होने के बाद मैं आराम करना चाहूँगा।
Transliteration: hum dost hain, aur yah pura hone ke baad main aaram karna chahoonga.
Word by word: hum dost hain(we are friends), aur(and) yah pura hone ke baad(after this finishes) main(I) aaram karna(to rest) chahoonga(would like).
What is inconsistent: S11's original had the same shape — a fronted "X के बाद" clause then the main verb ending in चाहूँगा: "मैं आपके खत्म करने के बाद बोल पाना चाहूँगा।" She restructured it to lead with चाहूँगा and trail the "after..." clause in a कि-clause: "मैं चाहूँगा कि आपकी बात पूरी होने के बाद मैं भी बोल सकूँ।" S110 keeps the old fronted-clause shape.
Recommended fix: हम दोस्त हैं, और मैं चाहूँगा कि यह पूरा होने के बाद मैं आराम करूँ।
Fix transliteration: hum dost hain, aur main chahoonga ki yah pura hone ke baad main aaram karoon.
Confidence: medium — only one clear precedent (S11); could be a general clause-ordering preference or specific to that one sentence. Wants Shuchita's eye.

Also checked, not flagged: S92 and S180 are simple infinitive-complement sentences with no
fronted subordinate clause at all, unlike the construction she fixed. False positives.

---

### Family: ऐसी — she removed it from 2 seed(s), it survives in 3

SEED 461 — INCONSISTENT APPLICATION (ऐसी, applied 1 of 2)
English taught: A shop where I can buy some postcards.
Hindi now: ऐसी दुकान जहाँ मैं कुछ पोस्टकार्ड ख़रीद सकूँ।
Transliteration: aisi dukaan jahaan main kuchh postcard khareed sakoon.
Word by word: aisi(such) dukaan(shop) jahaan(where) main kuchh postcard khareed sakoon(I can buy some postcards).
What is inconsistent: In S232 she dropped the identical filler before a noun+relative-clause: "एक ऐसी बूढ़ी औरत को जानता हूँ जो..." → "एक बूढ़ी औरत को जानता हूँ जो..." S461 keeps ऐसी in front of "दुकान जहाँ..." — the same decorative-filler pattern, with जहाँ (where) instead of जो (who).
Recommended fix: दुकान जहाँ मैं कुछ पोस्टकार्ड ख़रीद सकूँ।
Fix transliteration: dukaan jahaan main kuchh postcard khareed sakoon.
Confidence: medium — her two confirmed removals were both "X को जानता हूँ" (know-X) constructions; S461 is a "जहाँ" relative clause on an inanimate noun, a different grammatical frame, so this generalizes the rule rather than replicating it exactly. Wants Shuchita's eye.

Also checked, not flagged: S49 and S102 both use "बात ऐसी है" ("it's like this") — a
predicate use of ऐसी ("is such/thus"), not the pre-nominal filler she removed. False positives.

---

### Family: ज़रूरी — she removed it from 5 seed(s), it survives in 4

She systematically replaced ज़रूरी with अहम (both mean "important") in every one of the 5
seeds she touched — the cleanest, most confident finding in this batch.

SEED 65 — INCONSISTENT APPLICATION (ज़रूरी, applied 5 of 9)
English taught: It's important to take time to test yourself.
Hindi now: अपने आप को परखने के लिए समय निकालना ज़रूरी है।
Transliteration: apne aap ko parakhne ke liye samay nikaalna zaroori hai.
Word by word: apne aap ko(oneself) parakhne ke liye(to test) samay nikaalna(taking time out) zaroori hai(is important).
What is inconsistent: S329's identical "यह ज़रूरी है" (it's important) became "यह अहम है"; four other "important" seeds got the same swap.
Recommended fix: अपने आप को परखने के लिए समय निकालना अहम है।
Fix transliteration: apne aap ko parakhne ke liye samay nikaalna aham hai.
Confidence: high.

SEED 277 — INCONSISTENT APPLICATION (ज़रूरी, applied 5 of 9)
English taught: Yes I've got an important meeting early next week.
Hindi now: हाँ, अगले हफ़्ते के शुरू में मेरी एक ज़रूरी मीटिंग है।
Transliteration: haan, agle hafte ke shuru mein meri ek zaroori meeting hai.
Word by word: haan(yes) agle hafte ke shuru mein(early next week) meri ek(my an) zaroori meeting hai(important meeting is).
What is inconsistent: Same adjectival "important [noun]" sense she fixed in S311: "तीन सबसे ज़रूरी तथ्यों" (three most important facts) → "तीन सबसे अहम तथ्यों।"
Recommended fix: हाँ, अगले हफ़्ते के शुरू में मेरी एक अहम मीटिंग है।
Fix transliteration: haan, agle hafte ke shuru mein meri ek aham meeting hai.
Confidence: high.

SEED 280 — INCONSISTENT APPLICATION (ज़रूरी, applied 5 of 9)
English taught: No I only had to do the most important job.
Hindi now: नहीं, मुझे बस सबसे ज़रूरी काम करना था।
Transliteration: nahin, mujhe bas sabse zaroori kaam karna tha.
Word by word: nahin(no) mujhe bas(to me only) sabse zaroori kaam(most important job) karna tha(had to do).
What is inconsistent: Directly parallels S311's fixed "तीन सबसे ज़रूरी तथ्यों" → "तीन सबसे अहम तथ्यों," the same "सबसे ज़रूरी [noun]" shape.
Recommended fix: नहीं, मुझे बस सबसे अहम काम करना था।
Fix transliteration: nahin, mujhe bas sabse aham kaam karna tha.
Confidence: high.

SEED 356 — INCONSISTENT APPLICATION (ज़रूरी, applied 5 of 9)
English taught: Yes they had something important to discuss.
Hindi now: हाँ, उन्हें कुछ ज़रूरी बात करनी थी।
Transliteration: haan, unhein kuchh zaroori baat karni thi.
Word by word: haan(yes) unhein(to them) kuchh zaroori baat(something important to talk) karni thi(had to do).
What is inconsistent: Matches S261's fixed "यह कुछ ज़रूरी हो सकता है" → "यह कोई अहम चीज़ हो सकती है," the same "something important" shape.
Recommended fix: हाँ, उन्हें कुछ अहम बात करनी थी।
Fix transliteration: haan, unhein kuchh aham baat karni thi.
Confidence: high.

---

### Family: ऊपर — she removed it from 2 seed(s), it survives in 4

SEED 324 — INCONSISTENT APPLICATION (ऊपर, applied 1 of 2)
English taught: That student has both of her hands up.
Hindi now: उस छात्र के दोनों हाथ ऊपर हैं।
Transliteration: us chhatr ke donon haath oopar hain.
Word by word: us chhatr ke(that student's) donon haath(both hands) oopar hain(are up).
What is inconsistent: S529 has the same "hands up" idiom, and she moved from the literal "हाथ ऊपर करना" (make hands go up) to the single verb "हाथ उठाना" (raise hands): "अपने हाथ ऊपर कर सकते हैं" → "अपने हाथ उठा सकते हैं।" S324 still describes the position with ऊपर.
Recommended fix: उस छात्र के दोनों हाथ उठे हुए हैं।
Fix transliteration: us chhatr ke donon haath uthe hue hain.
Confidence: medium — S529's fix was to a verb ("put hands up"); S324 is a stative description ("hands are up"), and "हाथ ऊपर हैं" is itself common, natural Hindi — this may not be a real inconsistency. Wants Shuchita's eye.

Also checked, not flagged: S358 "reach the TOP" (ऊपर तक), S513 "up-down" (ऊपर-नीचे,
direction), S545 "take clothes UPSTAIRS" (ऊपर ले जाना) — three different senses of ऊपर,
none touching the "hands up" idiom. False positives.

---

### Family: महसूस — she removed it from 4 seed(s), it survives in 5

She systematically pushed महसूस करना ("to feel," a calque) out in favour of the natural
Hindi construction for each context — होना/लगना/आना — across all 4 seeds she touched. This
is the biggest miss in the batch: barely more than half the "feel" seeds got fixed, and one
residual (S41) is inconsistent WITHIN her own edited sentence.

SEED 40 — INCONSISTENT APPLICATION (महसूस, applied 4 of 9)
English taught: How do you feel at the moment?
Hindi now: आप अभी कैसा महसूस कर रहे हैं?
Transliteration: aap abhi kaisa mahsoos kar rahe hain?
Word by word: aap(you) abhi(right now) kaisa(how) mahsoos kar rahe hain(are feeling).
What is inconsistent: S657's near-identical "आप सब कैसा महसूस कर रहे हैं?" became "आप सब कैसे हैं?" — dropping महसूस करना entirely. S40 is the same question, minus "सब" (all), unfixed.
Recommended fix: आप अभी कैसे हैं?
Fix transliteration: aap abhi kaise hain?
Confidence: high.

SEED 41 — INCONSISTENT APPLICATION (महसूस, applied 4 of 9)
English taught: I feel okay, but I'm starting to feel tired.
Hindi now: मैं ठीक महसूस कर रहा हूँ, लेकिन थकान लगने लगी है।
Transliteration: main theek mahsoos kar raha hoon, lekin thakaan lagne lagi hai.
Word by word: main(I) theek mahsoos kar raha hoon(feel okay), lekin(but) thakaan lagne lagi hai(tiredness has started to feel).
What is inconsistent: This is a seed she DID edit — and she already fixed the second half ("feel tired" → थकान लगना, no महसूस करना) but left the first half ("feel okay" → महसूस कर रहा हूँ) in the old form, inside the same sentence.
Recommended fix: मैं ठीक हूँ, लेकिन थकान लगने लगी है।
Fix transliteration: main theek hoon, lekin thakaan lagne lagi hai.
Confidence: high.

SEED 42 — INCONSISTENT APPLICATION (महसूस, applied 4 of 9)
English taught: I was starting to feel better than last night.
Hindi now: मैं कल रात के मुक़ाबले ज़्यादा अच्छा महसूस करने लगा था।
Transliteration: main kal raat ke muqable zyada achha mahsoos karne laga tha.
Word by word: main(I) kal raat ke muqable(compared to last night) zyada achha(more good) mahsoos karne laga tha(had started feeling).
What is inconsistent: Directly parallels S118's original "मैं उससे बेहतर महसूस कर रहा हूँ" (I feel better than...), fixed to "मुझे...बेहतर लग रहा है" — replacing महसूस करना with लगना.
Recommended fix: मुझे कल रात के मुक़ाबले ज़्यादा अच्छा लगने लगा था।
Fix transliteration: mujhe kal raat ke muqable zyada achha lagne laga tha.
Confidence: high.

SEED 548 — INCONSISTENT APPLICATION (महसूस, applied 4 of 9)
English taught: I am feeling sad at the moment.
Hindi now: मैं अभी उदास महसूस कर रहा हूँ।
Transliteration: main abhi udaas mahsoos kar raha hoon.
Word by word: main(I) abhi(right now) udaas(sad) mahsoos kar raha hoon(am feeling).
What is inconsistent: Same "feeling [adjective]" shape as S41's unfixed half and S118's fixed original.
Recommended fix: मुझे अभी उदास लग रहा है।
Fix transliteration: mujhe abhi udaas lag raha hai.
Confidence: high.

SEED 642 — INCONSISTENT APPLICATION (महसूस, applied 4 of 9)
English taught: how do you feel madam?
Hindi now: आप कैसा महसूस कर रही हैं, मैडम?
Transliteration: aap kaisa mahsoos kar rahi hain, madam?
Word by word: aap(you) kaisa(how) mahsoos kar rahi hain(feel), madam(madam).
What is inconsistent: Same "how do you feel" shape as S40 and as S657's fixed original.
Recommended fix: आप कैसी हैं, मैडम?
Fix transliteration: aap kaisi hain, madam?
Confidence: high.

---

### Family: होगी। (removed 2, survives 5) — MIXED

SEED 418 — INCONSISTENT APPLICATION (होगी, applied 1 of 2)
English taught: They need to serve the community.
Hindi now: उन्हें समाज की सेवा करनी होगी।
Transliteration: unhen samaaj kii sevaa karnii hogii.
Word by word: unhen(to-them) samaaj(community) kii(of) sevaa(service) karnii(to-do) hogii(will-have-to-be)
— literally "to them community's service will-have-to-be-done" = "they will HAVE TO serve the community."
What is inconsistent: In S210 (also "need to discuss the problem"), she changed the identical
"V-नी होगी" (will have to V) construction to "V-नी है" (have to V) — pulling it back from a
future-obligation reading to a plain present necessity, closer to "need to." S418 is the same
English pattern ("need to serve") and the same Hindi construction, left as "will have to."
Recommended fix: उन्हें समाज की सेवा करनी है।
Fix transliteration: unhen samaaj kii sevaa karnii hai.
Confidence: medium — only one directly-comparable fixed instance (S210) exists to compare
against; "V-नी होगी" is not ungrammatical for "need to," so this may be a deliberate call
about tense/register rather than a hard error. Worth confirming with Shuchita whether the
S210 downgrade was a rule she meant to apply everywhere.

(The other four "still holding" seeds in this family — S109 "must," S344/S448 "होगी" as a
plain future-tense main verb meaning "will feel happy," S415 "will not be" — are a different
English modal or a different grammatical use of होगी entirely; not stragglers.)

---

### Family: बारे (removed 5, survives 9) — MIXED

SEED 143 — INCONSISTENT APPLICATION (बारे, applied 1 of 2)
English taught: It's the same thing as we were talking about earlier.
Hindi now: हम पहले इसी बारे में हम बात कर रहे थे।
Transliteration: ham pahle isii baare men ham baat kar rahe the.
Word by word: ham(we) pahle(earlier) isii(this-very) baare(about) men(in) ham(we) baat(talk) kar(do) rahe(-ing) the(were)
— literally "we earlier this-very about we talk doing were."
(Note: हम appears twice in this line — that duplication is a separate, already-known defect
in this seed, not the बारे issue below. Flagging both together since they're in the same line.)
What is inconsistent: In S158 ("Let's talk about something else"), she trimmed the exact
same "[X] के बारे में बात करना" (to talk about X) construction down to plain "बात करना" with no
बारे में. S143 uses the same "talking about X" construction, unsimplified.
Recommended fix: (independent of the हम-हम fix) हम पहले इसी के बारे में बात कर रहे थे। — or, if
applying her S158 pattern strictly, हम पहले यही बात कर रहे थे।
Fix transliteration: ham pahle isii ke baare men baat kar rahe the. / ham pahle yahii baat kar rahe the.
Confidence: medium — only one clean comparable instance (S158); बारे में is grammatically
necessary and correct in most other उपयोग (see false-positive note below), so this specific
simplification reads more like a style call than a hard rule. Given S143 already has a
separate known defect, recommend Shuchita look at the whole line together rather than
patching बारे में in isolation.

(The other eight residuals — S83, S84, S162, S310, S343, S565, S581, S597 — all use के बारे में
with a different verb, or as a necessary complement to "worried about / a story about / heard
about," where बारे में cannot be dropped without losing meaning. Not stragglers.)

---

### Family: वाला (removed 3, survives 14) — MIXED (high confidence)

She replaced first-person "मैं...V-ने वाला हूँ" ("I'm going to V") with plain simple future
("V-ऊँगा") three times: S5, S8, S504. She left every THIRD-person "going to" instance
untouched (S201, S223, S227, S293, S348, S493 — "he's going to.../what's going to happen"),
which confirms this is a person-specific rule, not a general ban on वाला — so those are correctly
excluded as false positives. Two first-person instances were missed:

SEED 23 — INCONSISTENT APPLICATION (वाला, applied 3 of 5 in the 1st-person "going to" pattern)
English taught: I'm going to start talking more soon.
Hindi now: मैं जल्द ही और बोलना शुरू करने वाला हूँ।
Transliteration: main jald hii aur bolnaa shuru karne vaalaa huun.
Word by word: main(I) jald-hii(soon) aur(more) bolnaa(to-speak) shuru(start) karne(to-do) vaalaa(about-to) huun(am)
What is inconsistent: S5 ("I'm going to practise speaking"), S8 ("I'm going to try to
explain"), and S504 ("I'm going to run") — all first-person "मैं...V-ने वाला हूँ" — were
converted to plain simple future. S23 is the same first-person "going to" pattern, untouched.
Recommended fix: मैं जल्द ही और बोलना शुरू करूँगा।
Fix transliteration: main jald hii aur bolnaa shuru karuungaa.
Confidence: high.

SEED 243 — INCONSISTENT APPLICATION (वाला, applied 3 of 5 in the 1st-person "going to" pattern)
English taught: I'm going to ask for the same thing to eat.
Hindi now: मैं खाने के लिए वही चीज़ माँगने वाला हूँ।
Transliteration: main khaane ke lie vahii chiiz maangne vaalaa huun.
Word by word: main(I) khaane(eating) ke-lie(for) vahii(same) chiiz(thing) maangne(to-ask) vaalaa(about-to) huun(am)
What is inconsistent: Same pattern as S5/S8/S504, untouched.
Recommended fix: मैं खाने के लिए वही चीज़ माँगूँगा।
Fix transliteration: main khaane ke lie vahii chiiz maanguungaa.
Confidence: high.

(S392, S393, S559, S640, S641 use वाला in its unrelated descriptive/pronominal sense —
"the one with black hair," "the red one" — a different grammatical function entirely, not
touched by her edits and not stragglers.)

---

## Chunk-level splits — one English chunk, several different Hindi cues

This is the other direction of the same problem, and it is the one that will bite the LEGO work directly. Fifty English chunks the course teaches were read against every live seed containing them. **Twenty-two are consistent. Twenty-eight are split.** The worst is "need to", now cued four different ways — की ज़रूरत है, ...ना है, ...ना होगा and चाहिए — across 23 seeds.

---

## CHUNK "need to" — BOTH (SPLIT + COLLISION) (23 seeds)

No single majority. Four different Hindi constructions share this one English chunk, roughly
tied between the two biggest:
- "...की ज़रूरत है/नहीं है" (ki zaroorat hai, "there is a need to") — 8 of 23 (44, 45, 106, 188, 320, 323, 396, 420)
- bare infinitive + है (-na/-ni hai) — 8 of 23 (59, 106, 139, 167, 210, 395, 595, 596)
- bare infinitive + होगा (-na/-ni hoga, a future/stronger-obligation flavour: "will have to") — 4 of 23 (104, 397, 418, 425)
- चाहिए (chahiye, "should") — 4 of 23 (354, 355, 423, 497)

The चाहिए group is also a COLLISION: चाहिए is the word this same list uses for the separate
"should" chunk (below), so a learner reading चाहिए cannot tell "need to" from "should".

The odd ones out (the two minority groups): seeds 104, 397, 418, 425, 354, 355, 423, 497

SEED 354
English taught: He didn't need to appear angry.
Hindi now: उसे ग़ुस्से में नहीं दिखना चाहिए था।
Transliteration: use gusse mein nahin dikhna chahiye tha.
Word by word: use(to-him) gusse-mein(in-anger) nahin(not) dikhna(to-appear) chahiye(should) tha(was).
Why it differs: "chahiye tha" = "should have", the same word the list uses for "should" elsewhere — not "need to".
Recommended fix: उसे ग़ुस्से में नहीं दिखना था।
Fix transliteration: use gusse mein nahin dikhna tha.

SEED 355
English taught: Did she need to talk to that woman you know?
Hindi now: क्या उसे उस औरत से बात करनी चाहिए थी जिसे आप जानते हैं?
Transliteration: kya use us aurat se baat karni chahiye thi jise aap jaante hain?
Word by word: kya(question) use(to-her) us(that) aurat(woman) se(with) baat(talk) karni(to-do) chahiye(should) thi(was) jise(whom) aap(you) jaante hain(know).
Why it differs: same chahiye-thi "should have" pattern.
Recommended fix: क्या उसे उस औरत से बात करनी थी जिसे आप जानते हैं?
Fix transliteration: kya use us aurat se baat karni thi jise aap jaante hain?

SEED 423
English taught: Do they need to ask such an obvious question?
Hindi now: क्या उन्हें इतना स्पष्ट सवाल पूछना चाहिए?
Transliteration: kya unhen itna spasht sawaal poochna chahiye?
Word by word: kya(question) unhen(to-them) itna(so) spasht(obvious) sawaal(question) poochna(to-ask) chahiye(should).
Why it differs: chahiye = should, not "need to".
Recommended fix: क्या उन्हें इतना स्पष्ट सवाल पूछना है?
Fix transliteration: kya unhen itna spasht sawaal poochna hai?

SEED 497
English taught: That sounds as though you need to get some sleep.
Hindi now: लगता है कि आपको थोड़ा सो लेना चाहिए।
Transliteration: lagta hai ki aapko thoda so lena chahiye.
Word by word: lagta hai(it seems) ki(that) aapko(to-you) thoda(a-little) so lena(to-sleep) chahiye(should).
Why it differs: chahiye = should; not previously named in the known "need to → should" specimen list (319/327/354/355/423), but the same pattern.
Recommended fix: लगता है कि आपको थोड़ा सो लेना है।
Fix transliteration: lagta hai ki aapko thoda so lena hai.
Confidence: high on all four above — matches Tom's confirmed "need to → should" softening class, and S497 extends the known count.

SEED 104 (secondary group — future/stronger-obligation होगा, not चाहिए)
English taught: We need to change what we're doing.
Hindi now: हम जो कर रहे हैं, उसे हमें बदलना होगा।
Transliteration: hum jo kar rahe hain, use hamein badalna hoga.
Word by word: hum(we) jo(what) kar rahe hain(are-doing) use(that) hamein(to-us) badalna(to-change) hoga(will-be/must).
Why it differs: होगा adds a future/"will have to" flavour not in the plain-present English, and not shared by the majority -hai/zaroorat renderings.
Recommended fix: हम जो कर रहे हैं, उसे हमें बदलना है।
Fix transliteration: hum jo kar rahe hain, use hamein badalna hai.

SEED 397
English taught: Do we need to get ready soon?
Hindi now: क्या हमें जल्दी तैयार होना होगा?
Transliteration: kya hamein jaldi taiyaar hona hoga?
Word by word: kya hamein(to-us) jaldi(soon) taiyaar hona(to-be-ready) hoga(will-be).
Why it differs: same होगा pattern; "soon" gives it partial grammatical cover, so this one is softer evidence than 104/418/425.
Recommended fix: क्या हमें जल्दी तैयार होना है?
Fix transliteration: kya hamein jaldi taiyaar hona hai?

SEED 418
English taught: They need to serve the community.
Hindi now: उन्हें समाज की सेवा करनी होगी।
Transliteration: unhen samaj ki sewa karni hogi.
Word by word: unhen(to-them) samaj ki(of-community) sewa(service) karni(to-do) hogi(will-be).
Why it differs: होगी again, no time marker in the English to justify a future reading.
Recommended fix: उन्हें समाज की सेवा करनी है।
Fix transliteration: unhen samaj ki sewa karni hai.

SEED 425
English taught: Yes they need to make sure they understand.
Hindi now: हाँ, उन्हें यह सुनिश्चित करना होगा कि वे समझते हैं।
Transliteration: haan, unhen yah sunishchit karna hoga ki ve samajhte hain.
Word by word: haan(yes) unhen(to-them) yah(this) sunishchit(sure) karna(to-do) hoga(will-be) ki(that) ve(they) samajhte hain(understand).
Why it differs: same होगा pattern, no time marker.
Recommended fix: हाँ, उन्हें यह सुनिश्चित करना है कि वे समझते हैं।
Fix transliteration: haan, unhen yah sunishchit karna hai ki ve samajhte hain.
Confidence: medium on the होगा group (397 has partial cover from "soon"; 104/418/425 don't).

---

## CHUNK "needs to" — SPLIT, tangled with the same COLLISION (6 seeds)

5 of 6 (319, 325, 326, 327, 610) use चाहिए (should) — these are exactly Tom's known
"needs to → should" fidelity-drift specimens (four of the five were already named; 610 adds
a fifth). The lone odd seed out, 322, is [untouched] and still uses the plain -ni hai
construction.

IMPORTANT CAVEAT: here the "majority" IS the defect. 322 is very likely the ORIGINAL,
correct rendering; the 5 "majority" seeds are what drifted. I'm not recommending you edit
322 to match the other five — that would spread the fidelity problem. Recommend the reverse:
revert 319/325/326/327/610 back to a -ni/-na hai construction, matching 322.

SEED 322
English taught: She said that she needs to read the same book.
Hindi now: उसने कहा कि उसे वही किताब पढ़नी है।
Transliteration: usne kaha ki use vahi kitaab padhni hai.
Word by word: usne kaha(she said) ki(that) use(to-her) vahi(that-same) kitaab(book) padhni(to-read) hai(is).
Why it differs from the other 5: it's the one seed the editing pass didn't touch, and still says "needs to" rather than "should".
Recommended fix: none for 322 itself — this is the target form. Fix the other five (319, 325, 326, 327, 610) toward this pattern instead.
Confidence: high — directly matches the known specimen class, now shown to be 5 of 6 seeds in this chunk rather than isolated.

---

## CHUNK "needed to" — SPLIT (3 seeds)

Majority: bare infinitive + था (-na tha) — 2 of 3 (353, 521). Odd one out: seed 207.

SEED 207
English taught: You've done what you needed to do.
Hindi now: आपने वही किया जो आपको करना चाहिए था।
Transliteration: aapne vahi kiya jo aapko karna chahiye tha.
Word by word: aapne(you) vahi(that-same) kiya(did) jo(which) aapko(to-you) karna(to-do) chahiye(should) tha(was).
Why it differs: चाहिए था = "should have", same word used for "should" elsewhere; other two "needed to" seeds use plain -na tha.
Recommended fix: आपने वही किया जो आपको करना था।
Fix transliteration: aapne vahi kiya jo aapko karna tha.
Confidence: high.

---

## CHUNK "have to" — SPLIT (7 seeds)

6 of 7 use the bare-infinitive + है/होगा/था family, with hoga/tha justified by explicit time
markers in the English ("in a few days" → होगा; "last night" → था) — legitimate tense
agreement, not a finding. The odd one out is seed 25, which drops "have to" completely.

SEED 25
English taught: Are you going to help me before I have to go?
Hindi now: क्या आप मेरे जाने से पहले मेरी मदद करेंगे?
Transliteration: kya aap mere jaane se pehle meri madad karenge?
Word by word: kya(question) aap(you) mere(my) jaane se pehle(before-going) meri madad(my help) karenge(will-do).
Why it differs: "before I have to go" becomes just "before my going" — no obligation word at all; "have to" is dropped, not translated.
Recommended fix: इससे पहले कि मुझे जाना है, क्या आप मेरी मदद करेंगे?
Fix transliteration: isse pehle ki mujhe jaana hai, kya aap meri madad karenge?
Confidence: medium — the fix requires restructuring the sentence, not a one-word swap, so worth an ear check before applying.

---

## CHUNK "had to" — SPLIT (4 seeds)

Majority: पड़ा/पड़े (paDa/paDe, "was forced/compelled to") — 3 of 4 (455, 593, 594). Odd one
out: seed 280, using the "-na tha" (standing-obligation) construction instead.

SEED 280
English taught: No I only had to do the most important job.
Hindi now: नहीं, मुझे बस सबसे ज़रूरी काम करना था।
Transliteration: nahin, mujhe bas sabse zaroori kaam karna tha.
Word by word: nahin(no) mujhe(to-me) bas(only) sabse zaroori(most-important) kaam(work) karna(to-do) tha(was).
Why it differs: करना था ("was to do") is a different verb from the पड़ना ("was forced to") used in the other three "had to" seeds.
Recommended fix: नहीं, मुझे बस सबसे ज़रूरी काम करना पड़ा।
Fix transliteration: nahin, mujhe bas sabse zaroori kaam karna paDa.
Confidence: medium — both are legitimate ways to say "had to" in Hindi; worth an ear check on whether native speakers actually treat this as a defect.

---

## CHUNK "should" — SPLIT, related to the same COLLISION (7 seeds)

Majority चाहिए — 5 of 7 (98, 99, 403, 438, 499). Two odd ones out: 405 and 253.

SEED 405
English taught: Should we ask if we have to book?
Hindi now: क्या हम पूछें कि हमें बुकिंग तो नहीं करनी?
Transliteration: kya hum poochhen ki hamein booking to nahin karni?
Word by word: kya(question) hum(we) poochhen(may-we-ask, subjunctive) ki(that) hamein(to-us) booking(booking) to nahin(surely-not) karni(to-do).
Why it differs: पूछें is a subjunctive verb form ("may we ask"), not चाहिए — a different grammatical device for "should".
Recommended fix: क्या हमें पूछना चाहिए कि हमें बुकिंग तो नहीं करनी?
Fix transliteration: kya hamein poochhna chahiye ki hamein booking to nahin karni?
Confidence: medium — subjunctive "should we..." questions are common natural Hindi; this may be acceptable style rather than a defect.

SEED 253
English taught: I should be ready in a few minutes.
Hindi now: मैं कुछ मिनटों में तैयार हो जाऊँगा।
Transliteration: main kuchh minaton mein taiyaar ho jaaunga.
Word by word: main(I) kuchh minaton mein(in-some-minutes) taiyaar(ready) ho jaaunga(will-become).
Why it differs: this is plain future tense ("I will be ready") — "should" (expectation) is dropped entirely and replaced with a flat prediction.
Recommended fix: मुझे कुछ मिनटों में तैयार हो जाना चाहिए।
Fix transliteration: mujhe kuchh minaton mein taiyaar ho jaana chahiye.
Confidence: high — this is a real meaning shift (expectation → plain statement of fact), not just style.

---

## CHUNK "shouldn't" — SPLIT (3 seeds)

Majority चाहिए नहीं — 2 of 3 (404, 407). Odd one out: seed 100.

SEED 100
English taught: You shouldn't worry about doing something similar.
Hindi now: आप ऐसा ही कुछ करने की चिंता न करें।
Transliteration: aap aisa hi kuchh karne ki chinta na karein.
Word by word: aap(you) aisa hi kuchh(something-similar) karne ki(of-doing) chinta(worry) na karein(don't-do, imperative).
Why it differs: न करें is a negative imperative/polite command ("don't worry"), not the modal चाहिए नहीं used in the other two seeds.
Recommended fix: आपको ऐसा ही कुछ करने की चिंता नहीं करनी चाहिए।
Fix transliteration: aapko aisa hi kuchh karne ki chinta nahin karni chahiye.
Confidence: high.

---

## CHUNK "going to" — SPLIT (22 seeds)

No dominant majority: plain future tense (-ेगा/-ेगी/-ेंगे) in 12 of 22; the dedicated
"about to" construction (-ने वाला/वाले/वाली है, -ne vaala hai) in 10 of 22. Worth flagging to
Kai directly: almost every seed using the "about to" construction is [untouched] from the
original machine translation (179, 201, 223, 227, 243, 293, 348, 493 — 8 of 10), while almost
every plain-future seed is [edited] (5, 8, 25, 82, 236, 270, 289, 340, 504, 508 — 10 of 12).
That looks like the editing pass is what introduced this split, collapsing "going to"
(planned near-future) into generic "will" — which risks colliding with whatever separate
"will" chunk this course also teaches (not in this reading list, so I can't confirm the
collision directly, only the risk).

Because plain future erases the "going to"/"will" distinction the course presumably still
needs elsewhere, I'm recommending the fix run the OPPOSITE direction from raw majority count:
toward the "-ne vaala hai" pattern the untouched originals already show. Flagging this
explicitly since it's a judgment call, not simple majority-matching.

SEED 5 (representative — same pattern also in seeds 8, 12, 24, 25, 82, 236, 270, 289, 340, 504, 508)
English taught: I'm going to practise speaking with someone else.
Hindi now: मैं किसी और के साथ बात करने का अभ्यास करूँगा।
Transliteration: main kisi aur ke saath baat karne ka abhyaas karoonga.
Word by word: main(I) kisi aur ke saath(with-someone-else) baat karne ka(of-talking) abhyaas(practice) karoonga(will-do).
Why it differs: करूँगा is plain simple future ("will practise") — no near-future/intention marker distinguishing "going to" from bare "will".
Recommended fix: मैं किसी और के साथ बात करने का अभ्यास करने वाला हूँ।
Fix transliteration: main kisi aur ke saath baat karne ka abhyaas karne vaala hoon.

SEED 8
English taught: I'm going to try to explain what I mean.
Hindi now: मैं समझाने की कोशिश करूँगा कि मेरा मतलब क्या है।
Transliteration: main samjhaane ki koshish karoonga ki mera matlab kya hai.
Word by word: main(I) samjhaane ki koshish(effort of explaining) karoonga(will-do) ki(that) mera matlab(my meaning) kya hai(what-is).
Why it differs: same plain-future substitution.
Recommended fix: मैं समझाने की कोशिश करने वाला हूँ कि मेरा मतलब क्या है।
Fix transliteration: main samjhaane ki koshish karne vaala hoon ki mera matlab kya hai.

The remaining plain-future seeds (same defect, compressed to save space — full detail available
on request): 12, 24, 25, 82, 236, 270, 289, 340, 504, 508.
Confidence: medium-high on the pattern overall (real, measurable, and traceable to the edit
pass); lower confidence on any single seed's "correct" fix wording, since restoring "-ne
vaala hai" sometimes requires reshaping the whole sentence, not just swapping the verb ending.

---

## CHUNK "be able to" — SPLIT (12 seeds)

Majority पाना (paana, "manage to") — 10 of 12. Odd ones out: 11, 352 (सकना, sakna, general
ability/permission — a different verb).

SEED 11
English taught: I'd like to be able to speak after you finish.
Hindi now: मैं चाहूँगा कि आपकी बात पूरी होने के बाद मैं भी बोल सकूँ।
Transliteration: main chahoonga ki aapki baat poori hone ke baad main bhi bol sakoon.
Word by word: main(I) chahoonga(would-want) ki(that) aapki baat poori hone ke baad(after your talk finishes) main bhi(I too) bol(speak) sakoon(subjunctive-can).
Why it differs: सकूँ (sakna) is used, not पाना, which is used in the other 10 "be able to" seeds.
Recommended fix: मैं चाहूँगा कि आपकी बात पूरी होने के बाद मैं भी बोल पाऊँ।
Fix transliteration: main chahoonga ki aapki baat poori hone ke baad main bhi bol paaoon.

SEED 352
English taught: Even if he wanted to he wouldn't be able to.
Hindi now: अगर वह चाहे, तो भी नहीं कर सकता।
Transliteration: agar vah chaahe, to bhi nahin kar sakta.
Word by word: agar(if) vah(he) chaahe(wants) to bhi(even-then) nahin(not) kar(do) sakta(can).
Why it differs: same सकना substitution.
Recommended fix: अगर वह चाहे, तो भी नहीं कर पाता।
Fix transliteration: agar vah chaahe, to bhi nahin kar paata.
Confidence: medium — सकना and पाना are close synonyms here; some native speakers may not treat this as a real defect, worth an ear check.

---

## CHUNK "able to" — SPLIT (15 seeds; overlaps "be able to" plus 3 more seeds)

Same two odd seeds as "be able to" (11, 352), plus a third, distinct construction in seed 563.

SEED 563
English taught: I wouldn't have been able to keep going any longer.
Hindi now: मैं और आगे चलने में सक्षम नहीं होता।
Transliteration: main aur aage chalne mein saksham nahin hota.
Word by word: main(I) aur aage(further) chalne mein(in-going) saksham(capable) nahin(not) hota(would-be).
Why it differs: सक्षम होना ("to be capable") is a formal/Sanskritized register — a third, visibly different word from both पाना and सकना used everywhere else in this chunk.
Recommended fix: मैं और आगे नहीं चल पाता।
Fix transliteration: main aur aage nahin chal paata.
Confidence: high — the register shift is stark and would stand out to a learner even without knowing Hindi grammar.

(Seeds 11 and 352: same finding and fix as reported under "be able to" above.)

---

## CHUNK "trying to" — SPLIT (14 seeds)

Majority कोशिश (koshish, "effort/attempt") — 9 of 14. Odd ones out: 102, 140, 205, 226 (चाह
रहे हैं, "wanting to" — a different verb, चाहना, expressing desire not effort), and 195
(drops "trying" completely). All five odd seeds are [edited].

SEED 102
English taught: We're trying to say that it's not like that.
Hindi now: हम कहना चाह रहे हैं कि बात ऐसी नहीं है।
Transliteration: hum kehna chaah rahe hain ki baat aisi nahin hai.
Word by word: hum(we) kehna(to-say) chaah rahe hain(are-wanting) ki(that) baat(matter) aisi(like-this) nahin hai(is-not).
Why it differs: चाह रहे हैं ("wanting") is desire, not effort — "trying" implies an ongoing attempt, "wanting" doesn't.
Recommended fix: हम यह कहने की कोशिश कर रहे हैं कि बात ऐसी नहीं है।
Fix transliteration: hum yah kehne ki koshish kar rahe hain ki baat aisi nahin hai.

SEED 140
English taught: I'm sorry that I can't see what you're trying to show me.
Hindi now: माफ़ करना कि मैं वह नहीं देख सकता जो आप दिखाना चाह रहे हैं।
Transliteration: maaf karna ki main vah nahin dekh sakta jo aap dikhaana chaah rahe hain.
Word by word: maaf karna(sorry) ki(that) main(I) vah(that) nahin dekh sakta(can't see) jo(which) aap(you) dikhaana(to-show) chaah rahe hain(are-wanting).
Why it differs: same substitution.
Recommended fix: ...जो आप दिखाने की कोशिश कर रहे हैं।
Fix transliteration: ...jo aap dikhaane ki koshish kar rahe hain.

SEED 205
English taught: I've forgotten the word I was trying to say.
Hindi now: मैं वह शब्द भूल गया जो मैं कहना चाह रहा था।
Transliteration: main vah shabd bhool gaya jo main kehna chaah raha tha.
Word by word: main(I) vah shabd(that word) bhool gaya(forgot) jo(which) main kehna(to-say) chaah raha tha(was-wanting).
Recommended fix: ...जो मैं कहने की कोशिश कर रहा था।
Fix transliteration: ...jo main kehne ki koshish kar raha tha.

SEED 226
English taught: The man is trying to help me.
Hindi now: वह आदमी मेरी मदद करना चाह रहा है।
Transliteration: vah aadmi meri madad karna chaah raha hai.
Word by word: vah aadmi(that man) meri madad(my help) karna(to-do) chaah raha hai(is-wanting).
Recommended fix: वह आदमी मेरी मदद करने की कोशिश कर रहा है।
Fix transliteration: vah aadmi meri madad karne ki koshish kar raha hai.

SEED 195
English taught: I'm trying to find the money I left on the table.
Hindi now: मैं वे पैसे ढूँढ़ रहा हूँ जो मैंने मेज़ पर छोड़े थे।
Transliteration: main ve paise dhoondh raha hoon jo mainne mez par chhode the.
Word by word: main(I) ve paise(that money) dhoondh raha hoon(am-searching) jo(which) mainne(I) mez par(on-table) chhode the(had-left).
Why it differs: no "trying" idea at all — plain "I am searching", the attempt/effort nuance is gone.
Recommended fix: मैं वे पैसे ढूँढ़ने की कोशिश कर रहा हूँ जो मैंने मेज़ पर छोड़े थे।
Fix transliteration: main ve paise dhoondhne ki koshish kar raha hoon jo mainne mez par chhode the.
Confidence: high across all five — all are [edited], all show the same substitution class, and it's a real meaning shift (desire vs. attempt).

---

## CHUNK "try to" — SPLIT (4 seeds)

No majority: कोशिश (koshish) in 2 of 4 (8, 236); "try to" dropped entirely in the other 2 (407, 491).

SEED 407
English taught: Shouldn't we try to set a good example?
Hindi now: क्या हमें अच्छा उदाहरण नहीं रखना चाहिए?
Transliteration: kya hamein achha udaaharan nahin rakhna chahiye?
Word by word: kya hamein(to-us) achha udaaharan(good example) nahin(not) rakhna(to-set/keep) chahiye(should).
Why it differs: "try to set" is reduced to plain "set" — no कोशिश or any attempt-marker.
Recommended fix: क्या हमें अच्छा उदाहरण रखने की कोशिश नहीं करनी चाहिए?
Fix transliteration: kya hamein achha udaaharan rakhne ki koshish nahin karni chahiye?

SEED 491
English taught: I love the way you try to help.
Hindi now: मुझे आपके मदद करने का तरीक़ा पसंद है।
Transliteration: mujhe aapke madad karne ka tareeka pasand hai.
Word by word: mujhe(to-me) aapke(your) madad karne ka(of-helping) tareeka(way) pasand hai(is-liked).
Why it differs: "try to help" becomes plain "helping" — the attempt nuance vanishes.
Recommended fix: मुझे आपके मदद करने की कोशिश करने का तरीक़ा पसंद है।
Fix transliteration: mujhe aapke madad karne ki koshish karne ka tareeka pasand hai.
Confidence: medium — with only 4 seeds split evenly 2/2, I can't call a true majority here; I lean toward कोशिश as the target because it's what the sibling "trying to" chunk uses 9 of 14 times.

---

CHUNK "i think" — CONSISTENT. All 22 seeds use मुझे लगता है (mujhe lagta hai). No finding.

CHUNK "i don't think" — CONSISTENT. All 4 seeds use मुझे नहीं लगता (mujhe nahin lagta). No finding.

---

## CHUNK "i'm not sure" — SPLIT (5 seeds)

No majority — three different renderings: मुझे नहीं लगता ("I don't think") in 2 of 5 (10, 62,
which are exactly Tom's already-flagged "I'm not sure → I don't think" drift and extend the
known count from one seed to two); मैं कह नहीं सकता ("I can't say") in 2 of 5 (80, 654); मैं
पक्का नहीं कह सकता ("I can't say for certain" — the closest genuine match) in 1 of 5 (165).

SEED 10
English taught: I'm not sure if I can remember the whole sentence.
Hindi now: मुझे नहीं लगता कि मैं पूरा वाक्य याद कर सकता हूँ।
Transliteration: mujhe nahin lagta ki main poora vaakya yaad kar sakta hoon.
Word by word: mujhe nahin lagta(I don't think) ki(that) main(I) poora vaakya(whole sentence) yaad kar sakta hoon(can remember).
Why it differs: "मुझे नहीं लगता" literally means "I don't think", the exact wording the list uses for the separate "I don't think" chunk — a direct collision with a different English meaning.
Recommended fix: मुझे नहीं पता कि मैं पूरा वाक्य याद कर सकता हूँ या नहीं।
Fix transliteration: mujhe nahin pata ki main poora vaakya yaad kar sakta hoon ya nahin.

SEED 62
English taught: I'm not sure if I can help you at the same time.
Hindi now: मुझे नहीं लगता कि मैं साथ-साथ आपकी मदद कर सकता हूँ।
Transliteration: mujhe nahin lagta ki main saath-saath aapki madad kar sakta hoon.
Why it differs: same "I don't think" substitution as seed 10.
Recommended fix: मुझे नहीं पता कि मैं साथ-साथ आपकी मदद कर सकता हूँ या नहीं।
Fix transliteration: mujhe nahin pata ki main saath-saath aapki madad kar sakta hoon ya nahin.
Confidence (10, 62): high — matches and extends the known specimen.

SEED 80
English taught: I'm not sure when I'll be ready.
Hindi now: मैं कह नहीं सकता कि मैं कब तैयार होऊँगा।
Transliteration: main keh nahin sakta ki main kab taiyaar hoonga.
Word by word: main(I) keh nahin sakta(cannot say) ki(that) main kab(when) taiyaar hoonga(will-be-ready).
Why it differs: "can't say" is close to "not sure" but drops the certainty word (पक्का) that seed 165 has.
Recommended fix: मैं पक्का नहीं कह सकता कि मैं कब तैयार होऊँगा।
Fix transliteration: main pakka nahin keh sakta ki main kab taiyaar hoonga.

SEED 654
English taught: I'm not sure if I can help you, sir.
Hindi now: मैं कह नहीं सकता कि मैं आपकी मदद कर सकता हूँ या नहीं, सर।
Transliteration: main keh nahin sakta ki main aapki madad kar sakta hoon ya nahin, sir.
Why it differs: same pattern as 80.
Recommended fix: मैं पक्का नहीं कह सकता कि मैं आपकी मदद कर सकता हूँ या नहीं, सर।
Fix transliteration: main pakka nahin keh sakta ki main aapki madad kar sakta hoon ya nahin, sir.
Confidence (80, 654): medium — "कह नहीं सकता" alone is a reasonable, common idiom for uncertainty too; milder than the seed-10/62 defect.

---

CHUNK "i hope" — CONSISTENT. All 4 seeds use मुझे उम्मीद है (mujhe ummeed hai). No finding.

CHUNK "i know" — CONSISTENT, on inspection. 8 of 10 seeds use जानना (jaanna, "to know [a
person]"); 2 (59, 606) use पता (pata, "to know [a fact]"). This tracks a real distinction in
the English itself — every जानना seed is "I know [a person]" (acquainted-with sense); every
पता seed is "I know [a fact/procedure]". Not a finding — legitimate sense split, not a choice
split.

CHUNK "i don't know" — CONSISTENT, same reasoning. 4 of 7 seeds ("don't know [people]") use
जानना; 2 of 7 ("don't know why/who" — fact/reason) use पता नहीं; 1 of 7 ("don't know how to
say" — procedural skill) uses नहीं आता, the standard idiom for that sense, and is the only
seed of that sense so there's nothing to compare it against. All three words track genuinely
different meanings of "know" — legitimate, not a finding.

---

## CHUNK "like to" — SPLIT (15 seeds, but 2 are miscategorised — see note)

Within the true "would like to" seeds (11, 12, 92, 110, 180, 271, 411, 426, 428, 581 — 10
seeds), majority चाहना (chahna: चाहूँगा/चाहेंगे/चाहते) — 9 of 10. Odd one out: seed 428.

The plain habitual "like to" seeds (120, 121, 240 — no "would") consistently use पसंद
(pasand) — internally fine, and legitimately different from "would like to" since it's a
different sense (habitual preference vs. one-off desire).

Note: seeds 582 and 584 ("What's it like to grow up here?" / "...wake up every morning") are
a different sense of "like" entirely — "how does it feel", not "like to" as a verb of
preference at all. These probably shouldn't be in this chunk's seed list; I haven't scored
them as findings either way.

SEED 428
English taught: Would they like to visit us on Tuesday?
Hindi now: क्या वे मंगलवार को हमसे मिलने आना पसंद करेंगे?
Transliteration: kya ve mangalvaar ko hamse milne aana pasand karenge?
Word by word: kya(question) ve(they) mangalvaar ko(on-Tuesday) hamse milne aana(to-come-meet-us) pasand karenge(will-like/prefer).
Why it differs: पसंद करेंगे is the habitual-preference verb used for plain "like to" elsewhere in this chunk; every other "would like to" seed uses चाहना (चाहेंगे/चाहूँगा), the "want" verb that carries the conditional "would" nuance.
Recommended fix: क्या वे मंगलवार को हमसे मिलने आना चाहेंगे?
Fix transliteration: kya ve mangalvaar ko hamse milne aana chaahenge?
Confidence: high.

---

## CHUNK "let" — SPLIT (7 seeds)

The causative sense ("let X do Y" — seeds 71, 334, 466, 604) is scattered with no majority:
देना (dena, causative "allow") in 2 (334, 466), dropped entirely in 1 (71), सकना (sakna,
"can/is able to") in 1 (604).

SEED 71
English taught: We didn't want to let anyone hear the truth.
Hindi now: हम नहीं चाहते थे कि कोई सच सुने।
Transliteration: hum nahin chaahte the ki koi sach sune.
Word by word: hum nahin chaahte the(we didn't want) ki(that) koi(anyone) sach(truth) sune(subjunctive-hear).
Why it differs: no causative "let/allow" (देना) at all — simplified to "[we didn't want] that anyone hear", losing the permission-granting idea.
Recommended fix: हम नहीं चाहते थे कि किसी को सच सुनने दें।
Fix transliteration: hum nahin chaahte the ki kisi ko sach sunne den.

SEED 604
English taught: She offered to let us stay with her.
Hindi now: उसने पेशकश की कि हम उसके साथ रह सकते हैं।
Transliteration: usne peshkash ki ki hum uske saath reh sakte hain.
Word by word: usne peshkash ki(she offered) ki(that) hum(we) uske saath(with-her) reh sakte hain(can stay).
Why it differs: सकते हैं (sakna, "can") expresses ability, not the causative देना used in seeds 334/466 ("let you hold the kitten" / "let me throw it").
Recommended fix: उसने पेशकश की कि वह हमें उसके साथ रहने दे।
Fix transliteration: usne peshkash ki ki vah hamein uske saath rehne de.
Confidence: medium — "we can stay [with her]" is a natural, common way to express "she let us stay" in Hindi; a native speaker might not flag this.

---

## CHUNK "let's" — SPLIT (3 seeds; same 3 seeds also appear under "let")

Majority चलो/चलिए (chalo/chaliye, the dedicated "let's" suggestion form) — 2 of 3 (158, 522).
Odd one out: seed 534.

SEED 534
English taught: Let's not go outside in this dreadful weather.
Hindi now: हमें इस भयानक मौसम में बाहर नहीं जाना चाहिए।
Transliteration: hamein is bhayaanak mausam mein baahar nahin jaana chahiye.
Word by word: hamein(to-us) is bhayaanak mausam mein(in-this-dreadful-weather) baahar(outside) nahin jaana(not-go) chahiye(should).
Why it differs: चाहिए renders this as "we shouldn't go outside" (an obligation/advice statement), not "let's not" (a first-person suggestion) — this is also a COLLISION with the separate "shouldn't" chunk above.
Recommended fix: चलिए इस भयानक मौसम में बाहर न जाएँ।
Fix transliteration: chaliye is bhayaanak mausam mein baahar na jaayen.
Confidence: high.

---

## CHUNK "enough" — SPLIT (6 seeds)

No majority — the most fragmented chunk in this list. काफ़ी (kaafi, "enough/sufficient") in
only 2 of 6 (58, 378); बहुत सारे ("many" — a quantity word, not a sufficiency word) in 1 (60);
इतना (itna, correlative "so...that") in 1 (91); पर्याप्त (paryaapt, a formal/Sanskritized
synonym of काफ़ी) in 1 (294); dropped entirely in 1 (379). Five different treatments across
six seeds.

SEED 60
English taught: I don't know how to say enough different words yet.
Hindi now: मुझे अभी तक बहुत सारे अलग-अलग शब्द बोलना नहीं आता।
Transliteration: mujhe abhi tak bahut saare alag-alag shabd bolna nahin aata.
Word by word: mujhe abhi tak(to-me until-now) bahut saare(many) alag-alag(different) shabd(words) bolna nahin aata(don't know how to speak).
Why it differs: बहुत सारे means "many/a lot of" — a quantity word, not "enough" (a sufficiency threshold). This is exactly the "enough → many" specimen already named in the earlier scoping.
Recommended fix: मुझे अभी तक काफ़ी अलग-अलग शब्द बोलना नहीं आता।
Fix transliteration: mujhe abhi tak kaafi alag-alag shabd bolna nahin aata.
Confidence: high — matches the known specimen exactly.

SEED 91
English taught: It's difficult to think quickly enough to answer in time.
Hindi now: इतनी जल्दी सोच पाना मुश्किल है कि समय से जवाब दिया जा सके।
Transliteration: itni jaldi soch paana mushkil hai ki samay se jawaab diya ja sake.
Word by word: itni jaldi(this-much quickly) soch paana(managing to think) mushkil hai(is-difficult) ki(that) samay se(on-time) jawaab(answer) diya ja sake(can-be-given).
Why it differs: uses an इतना...कि ("so...that") correlative frame rather than काफ़ी.
Confidence: low-medium — this might just be the natural Hindi syntax for the "adjective enough to VERB" shape (as opposed to "enough + noun"), not a real word-choice defect. Flagging for awareness, not a confident recommendation.

SEED 294
English taught: I don't have enough time to call you tonight.
Hindi now: मेरे पास आज रात आपको कॉल करने के लिए पर्याप्त समय नहीं है।
Transliteration: mere paas aaj raat aapko call karne ke liye paryaapt samay nahin hai.
Word by word: mere paas(with-me) aaj raat(tonight) aapko(you) call karne ke liye(to-call) paryaapt(sufficient) samay(time) nahin hai(is-not).
Why it differs: पर्याप्त is a formal/Sanskritized synonym of काफ़ी — a different word for the same idea.
Recommended fix: मेरे पास आज रात आपको कॉल करने के लिए काफ़ी समय नहीं है।
Fix transliteration: mere paas aaj raat aapko call karne ke liye kaafi samay nahin hai.
Confidence: medium — near-synonyms; may read as acceptable register variation to a native speaker.

SEED 379
English taught: Yes I was lucky enough to travel to Africa.
Hindi now: हाँ, मैं भाग्यशाली था कि अफ़्रीका जा सका।
Transliteration: haan, main bhaagyashaali tha ki Africa jaa saka.
Word by word: haan(yes) main(I) bhaagyashaali tha(was-lucky) ki(that) Africa jaa saka(could-go).
Why it differs: "enough" is dropped entirely — just "I was lucky that I could go", losing the "sufficiently lucky" nuance.
Recommended fix: हाँ, मैं इतना भाग्यशाली था कि अफ़्रीका जा सका।
Fix transliteration: haan, main itna bhaagyashaali tha ki Africa jaa saka.
Confidence: high — genuine omission, not a stylistic swap.

---

## CHUNK "a little" — SPLIT (9 seeds)

Majority थोड़ा-family (thoda/thoda aur) — 8 of 9. Odd one out: seed 580.

SEED 580
English taught: We've often wanted to take the children somewhere a little warmer.
Hindi now: हमने अक्सर बच्चों को किसी ज़्यादा गर्म जगह ले जाना चाहा है।
Transliteration: hamne aksar bachchon ko kisi zyada garam jagah le jaana chaaha hai.
Word by word: hamne aksar(we often) bachchon ko(the children) kisi(some) zyada(more/very) garam(warm) jagah(place) le jaana(to-take) chaaha hai(have-wanted).
Why it differs: ज़्यादा means "more/very" — the opposite mild-vs-strong flavour from थोड़ा ("a little"). This changes the degree, not just the wording: "somewhere much warmer" rather than "somewhere a little warmer".
Recommended fix: हमने अक्सर बच्चों को किसी थोड़ी गर्म जगह ले जाना चाहा है।
Fix transliteration: hamne aksar bachchon ko kisi thodi garam jagah le jaana chaaha hai.
Confidence: high — a real degree/meaning shift, not just synonym variation.

---

CHUNK "a lot" — CONSISTENT. All 4 seeds use बहुत (bahut), with the ending changing only for
grammatical gender/number agreement with the following noun (बहुत कुछ / बहुत सारे / बहुत सी) —
legitimate agreement, not a word-choice split. No finding.

---

## CHUNK "mind" — SPLIT (8 seeds)

Majority आपत्ति (aapatti, "objection") — 7 of 8. Odd one out: seed 281.

SEED 281
English taught: Do you mind if I finish my coffee before you start?
Hindi now: एतराज़ न हो तो आपके शुरू करने से पहले मैं अपनी कॉफ़ी ख़त्म कर लूँ?
Transliteration: etraaz na ho to aapke shuru karne se pehle main apni coffee khatm kar loon?
Word by word: etraaz(objection) na ho(not-be) to(then) aapke shuru karne se pehle(before-your-starting) main(I) apni coffee(my coffee) khatm kar loon(finish).
Why it differs: एतराज़ is a different (Urdu-origin) word for "objection" than आपत्ति, used in every other "mind" seed.
Recommended fix: आपको आपत्ति न हो तो आपके शुरू करने से पहले मैं अपनी कॉफ़ी ख़त्म कर लूँ?
Fix transliteration: aapko aapatti na ho to aapke shuru karne se pehle main apni coffee khatm kar loon?
Confidence: medium — आपत्ति and एतराज़ are near-perfect synonyms in everyday Hindi; a native speaker may consider this harmless style rather than a defect.

---

## "as soon as" — CONSISTENT (with a note)
S28 uses जितनी जल्दी हो सके ("as-much-quick-as-can-be"), S29 uses जल्दी से जल्दी ("quick from quick"), S97 uses जब भी आप चाहें ("whenever you want"). S97 is legitimately different — it's translating "as soon as you **want**", not "as soon as you **can**", a different English sense. S28 vs S29 really are two different fixed idioms for "as soon as possible," but both are extremely common, interchangeable, unambiguous Hindi idioms — the kind of variety a native speaker wouldn't blink at. I looked at it and am not reporting it as a finding; flagging here so you know it wasn't missed.

## "used to" — CONSISTENT
All 5 seeds use the standard Hindi habitual-past construction (verb + था/थी): जानता था, करता था, रहता था, लगता था, देती थी. S587 adds हमेशा ("always") for emphasis but keeps the same verb construction. No finding.

## "happy to" — CONSISTENT (with a note)
S344/S448 use करके ख़ुशी होगी ("by-doing, happiness will-be"); S599 uses करने में ख़ुशी होती ("in-doing, happiness would-be" — होती not होगी because it's a counterfactual "would have been happy," which is a required tense shift, not a choice). करके vs करने में is a genuine construction difference, but both are completely standard, interchangeable ways to say "happy to do X" in Hindi. Considered and not reported as a defect.

## "sorry" — SPLIT
CHUNK "sorry" — SPLIT (माफ़ करना in 2 of 3)
The odd one out: seed 139

SEED 139
English taught: I'm sorry that I need to leave so early.
Hindi now: मुझे अफ़सोस है कि मुझे इतनी जल्दी जाना है।
Transliteration: mujhe afsos hai ki mujhe itni jaldi jaana hai.
Word by word: to-me / regret / is / that / to-me / this-much / soon / go-must.
Why it differs: S140 and S193 both apologize with माफ़ करना ("forgive [me]"); this seed instead says अफ़सोस है ("I have regret") — a statement of feeling sad about a fact, not an apology to the listener.
Recommended fix: माफ़ करना कि मुझे इतनी जल्दी जाना है।
Fix transliteration: maaf karna ki mujhe itni jaldi jaana hai.
Confidence: high — 139 and 140 are grammatically parallel ("I'm sorry that [clause]") and rendered two different ways.

## "already" — SPLIT
CHUNK "already" — SPLIT (चुका completive in 2 of 3)
The odd one out: seed 421

SEED 421
English taught: Because they already know he's getting weak.
Hindi now: क्योंकि वे पहले जानते हैं कि वे कमज़ोर होते जा रहे हैं।
Transliteration: kyonki ve pahle jaante hain ki ve kamzor hote ja rahe hain.
Word by word: because / they / before / know / that / they / weak / becoming / going / are.
Why it differs: S76 and S244 both mark "already" with the चुका completive ("sीख चुका हूँ" = "have-already-learnt"). This seed drops चुका entirely and uses पहले ("before/earlier") + plain present tense — पहले alone (without ही) reads more like "earlier" than "already," and there's no completive marker at all.
Recommended fix: क्योंकि वे पहले से जान चुके हैं कि वे कमज़ोर होते जा रहे हैं।
Fix transliteration: kyonki ve pahle se jaan chuke hain ki ve kamzor hote ja rahe hain.
Confidence: high — the specific completive marker (चुका) that carries "already" elsewhere is simply absent here.

## "important" — SPLIT
CHUNK "important" — SPLIT (अहम in 5 of 9, ज़रूरी in 4 of 9 — near-even, no real majority)
The odd ones out: all of them, roughly evenly split — this reads as two competing words rather than one word with a rare outlier.

Full list so you can see the pattern:
- ज़रूरी ("necessary"): S65 [untouched], S277 [edited], S280 [untouched], S356 [edited]
- अहम ("significant"): S137 [edited], S261 [edited], S311 [edited], S329 [edited], S330 [edited]

SEED 65 (ज़रूरी — untouched, likely the original)
English taught: It's important to take time to test yourself.
Hindi now: अपने आप को परखने के लिए समय निकालना ज़रूरी है।
Transliteration: apne aap ko parakhne ke liye samay nikaalna zaroori hai.
Word by word: self-ACC / test-for / time / take-out / necessary / is.

SEED 137 (अहम — edited)
English taught: It's more important to talk often than to be perfect.
Hindi now: परफ़ेक्ट होने से ज़्यादा अहम अक्सर बात करना है।
Transliteration: perfect hone se zyaada aham aksar baat karna hai.
Word by word: perfect / being-than / more / important / often / talk / doing / is.

Why it differs: both words genuinely mean "important" in Hindi (ज़रूरी leans "necessary/needed," अहम leans "significant/weighty"), and both untouched seeds (65, 280) use ज़रूरी — suggesting the original machine translation was internally consistent. Shuchita's edits introduced अहम in 5 of the 9 seeds, nearly all of them her edits, without an obvious rule distinguishing which sense applies where.
Recommended fix: pick one canonical word (ज़रूरी matches what the untouched seeds already use) and apply it across all 9 — but this is a judgment call between two legitimate synonyms, not a clear error, so flagging for Tom/Kai to decide rather than prescribing.
Confidence: medium — real inconsistency, but neither word is "wrong," so this is a course-consistency call, not a fidelity error.

## "interesting" — SPLIT
CHUNK "interesting" — SPLIT (दिलचस्प in 6 of 7)
The odd one out: seed 51

SEED 51
English taught: I enjoy doing interesting things with my friends.
Hindi now: मुझे अपने दोस्तों के साथ रोचक काम करना पसंद है।
Transliteration: mujhe apne doston ke saath rochak kaam karna pasand hai.
Word by word: to-me / own / friends-with / interesting(रोचक) / work / doing / liked / is.
Why it differs: every other seed (58, 112, 120, 163, 164, 492) uses दिलचस्प; this one alone (an edited seed) swaps in रोचक, a more literary/Sanskritized synonym.
Recommended fix: मुझे अपने दोस्तों के साथ दिलचस्प काम करना पसंद है।
Fix transliteration: mujhe apne doston ke saath dilchasp kaam karna pasand hai.
Confidence: high.

## "tired" — CONSISTENT (with a note)
4 of 5 seeds use थका हुआ (adjectival "tired"). S41's थकान लगने लगी है ("tiredness is starting to be felt") is a different construction, but its English is also different — "starting to **feel** tired" (an onset) vs. plain "is tired" (a state) — so the different Hindi tracks a real grammatical difference in the English, not an arbitrary choice. Not reported as a finding.

## "busy" — CONSISTENT
All 3 seeds use व्यस्त. No finding.

## "ready" — CONSISTENT
All 21 seeds use तैयार. This is the most heavily-used chunk in the list and it's completely clean — worth Kai knowing that not everything is broken.

## "sure" — SPLIT (the biggest finding in this batch)
CHUNK "sure" — SPLIT (no clear majority for "not sure" — fragmented 5 ways across 7 comparable seeds)
The odd ones out: seeds 10, 62, 63, 80, 165, 202, 654 (all render "not sure," each differently — see below)

Two sub-groups are fine on their own and are NOT part of this finding: "I'm sure" (positive) uses यक़ीन है consistently in S340 and S406; "make sure" (a different phrase) uses सुनिश्चित करना consistently in S200 and S425.

But "I'm not sure" fragments into five different constructions:

SEED 10
English taught: I'm not sure if I can remember the whole sentence.
Hindi now: मुझे नहीं लगता कि मैं पूरा वाक्य याद कर सकता हूँ।
Transliteration: mujhe nahin lagta ki main poora vaakya yaad kar sakta hoon.
Word by word: to-me / not / seems / that / I / whole / sentence / remember / can / [I-am].
Why it differs: नहीं लगता means "I don't think," a weaker, different claim than "I'm not sure" (uncertainty vs. disbelief).
Recommended fix: मुझे यक़ीन नहीं है कि मैं पूरा वाक्य याद कर सकता हूँ।
Fix transliteration: mujhe yaqeen nahin hai ki main poora vaakya yaad kar sakta hoon.

SEED 62
English taught: I'm not sure if I can help you at the same time.
Hindi now: मुझे नहीं लगता कि मैं साथ-साथ आपकी मदद कर सकता हूँ।
Transliteration: mujhe nahin lagta ki main saath-saath aapki madad kar sakta hoon.
Word by word: to-me / not / seems / that / I / simultaneously / your / help / can-do.
Why it differs: same नहीं लगता ("don't think") substitution as seed 10.
Recommended fix: मुझे यक़ीन नहीं है कि मैं साथ-साथ आपकी मदद कर सकता हूँ।
Fix transliteration: mujhe yaqeen nahin hai ki main saath-saath aapki madad kar sakta hoon.

SEED 63
English taught: Are you sure you don't mind helping me?
Hindi now: क्या आपको सच में मेरी मदद करने में कोई आपत्ति नहीं है?
Transliteration: kya aapko sach mein meri madad karne mein koi aapatti nahin hai?
Word by word: Q / to-you / truly / my / help / doing-in / any / objection / not / is?
Why it differs: सच में means "really/truly" — an intensifier, not the "sure/certain" word used elsewhere.
Recommended fix: क्या आपको यक़ीन है कि आपको मेरी मदद करने में कोई आपत्ति नहीं है?
Fix transliteration: kya aapko yaqeen hai ki aapko meri madad karne mein koi aapatti nahin hai?

SEED 80
English taught: I'm not sure when I'll be ready.
Hindi now: मैं कह नहीं सकता कि मैं कब तैयार होऊँगा।
Transliteration: main kah nahin sakta ki main kab taiyaar hoonga.
Word by word: I / say / not / can / that / I / when / ready / will-be.
Why it differs: कह नहीं सकता means "I can't say" — a claim about ability to state something, not about certainty.
Recommended fix: मुझे यक़ीन नहीं है कि मैं कब तैयार होऊँगा।
Fix transliteration: mujhe yaqeen nahin hai ki main kab taiyaar hoonga.

SEED 165
English taught: But I'm not sure if it's true.
Hindi now: लेकिन मैं पक्का नहीं कह सकता कि यह सच है।
Transliteration: lekin main pakka nahin kah sakta ki yah sach hai.
Word by word: but / I / certain / not / say / can / that / this / true / is.
Why it differs: this is the closest to correct — पक्का ("certain") is the right word family, just wrapped in the same "cannot say" frame as seed 80 rather than "I'm not [certain]."
Recommended fix: लेकिन मुझे यक़ीन नहीं है कि यह सच है। (or leave as-is — this one is defensible)
Fix transliteration: lekin mujhe yaqeen nahin hai ki yah sach hai.

SEED 202
English taught: Nobody was sure how to answer the question.
Hindi now: किसी को समझ नहीं आ रहा था कि सवाल का जवाब कैसे दें।
Transliteration: kisi ko samajh nahin aa raha tha ki sawaal ka jawaab kaise den.
Word by word: anyone-to / understanding / not / coming / was / that / question's / answer / how / to-give.
Why it differs: समझ नहीं आ रहा था means "wasn't figuring out/understanding" — closer to "didn't know how" than "wasn't sure."
Recommended fix: किसी को यक़ीन नहीं था कि सवाल का जवाब कैसे दें।
Fix transliteration: kisi ko yaqeen nahin tha ki sawaal ka jawaab kaise den.

SEED 654
English taught: I'm not sure if I can help you, sir.
Hindi now: मैं कह नहीं सकता कि मैं आपकी मदद कर सकता हूँ या नहीं, सर।
Transliteration: main kah nahin sakta ki main aapki madad kar sakta hoon ya nahin, sir.
Word by word: I / say / not / can / that / I / your / help / can-do / or / not, / sir.
Why it differs: same "cannot say" substitution as seed 80.
Recommended fix: मुझे यक़ीन नहीं है कि मैं आपकी मदद कर सकता हूँ या नहीं, सर।
Fix transliteration: mujhe yaqeen nahin hai ki main aapki madad kar sakta hoon ya nahin, sir.

Confidence: high that this is a real defect — this is exactly the pattern flagged in the earlier scoping as a known specimen ("I'm not sure" → "I don't think"), and it's not isolated to one seed: it's the majority behavior (5 of 7 "not sure" seeds avoid the actual certainty word पक्का/यक़ीन entirely). Medium confidence on the exact fix wording for each seed — a Hindi speaker should sanity-check the यक़ीन नहीं है phrasing reads naturally in each sentence.

## "work" — CONSISTENT
11 of 13 seeds use काम for "work" (noun/verb, job/labor sense) consistently. The two apparent outliers are legitimate different senses, not defects: S94 ("this is the only way it will **work**") uses कारगर ("effective") because that's "work" meaning "function/succeed," not labor. S106/S109 ("work hard") use मेहनत करना, the standard fixed idiom for "work hard/put in effort," distinct from generic "work." No finding.

## "learn" — SPLIT (low-medium confidence)
CHUNK "learn" — SPLIT (सीखना in 7 of 8)
The odd one out: seed 20

SEED 20
English taught: You want to learn his name quickly.
Hindi now: आप उसका नाम जल्दी जानना चाहते हैं।
Transliteration: aap uska naam jaldi jaanna chahte hain.
Word by word: you / his-her / name / quickly / to-know / want.
Why it differs: every other seed (learning words, learning something new, learning a skill) uses सीखना; this one uses जानना ("to know/get to know") instead.
Recommended fix: आप उसका नाम जल्दी सीखना चाहते हैं।
Fix transliteration: aap uska naam jaldi seekhna chahte hain.
Confidence: low-medium — "learning a name" is arguably a genuinely different sense in Hindi (finding out a fact vs. studying), closer to "getting to know," so जानना may be the more natural word here rather than an error. Flagging so you can decide; I'm not confident this is a real defect.

## "speak" — BOTH (SPLIT and COLLISION)
CHUNK "speak" — BOTH (बोलना in 13 of 15)
The odd ones out: seeds 1 and 31

SEED 1
English taught: I want to speak English with you now.
Hindi now: मैं अब आपके साथ अंग्रेज़ी में बात करना चाहता हूँ।
Transliteration: main ab aapke saath angrezi mein baat karna chahta hoon.
Word by word: I / now / you-with / English-in / talk(बात करना) / doing / want.
Why it differs: seed 15 has the exact same structure — "speak [a language] with [a person]" — and uses बोलना there ("आप ... मेरे साथ अंग्रेज़ी बोलें" = "you speak English with me"). This seed uses बात करना instead, which is the SAME word the separate "talk" chunk uses everywhere (e.g. seed 158, "Let's talk about something else" = "चलिए कुछ और बात करते हैं"). So बात करना is now doing double duty prompting both "speak" and "talk."
Recommended fix: मैं अब आपके साथ अंग्रेज़ी बोलना चाहता हूँ।
Fix transliteration: main ab aapke saath angrezi bolna chahta hoon.
Confidence: high — seed 15 is a direct structural match that contradicts it.

SEED 31
English taught: You wanted to speak with me tonight.
Hindi now: आप आज रात मेरे साथ बात करना चाहते थे।
Transliteration: aap aaj raat mere saath baat karna chahte the.
Word by word: you / tonight / me-with / talk / doing / wanted-were.
Why it differs: same बात करना substitution — but this seed has no language object ("speak with me," not "speak English"), so बात करना ("talk with me") is a more defensible natural choice here than in seed 1.
Recommended fix: none confidently recommended — likely legitimate.
Confidence: low — probably not a real defect, included for completeness since it's the same word substitution as seed 1.

## "say" — BOTH (SPLIT and COLLISION)
CHUNK "say" — BOTH (कहना in ~17 of 20 comparable seeds)
The odd ones out: seeds 60, 452, 453 (seed 533 is a structural paraphrase — "won't listen to every word you say" becomes "won't listen to your every word/matter," with no verb standing in for "say" at all — not a comparable case, not counted).

SEED 60
English taught: I don't know how to say enough different words yet.
Hindi now: मुझे अभी तक बहुत सारे अलग-अलग शब्द बोलना नहीं आता।
Transliteration: mujhe abhi tak bahut saare alag-alag shabd bolna nahin aata.
Word by word: to-me / until-now / many / different / words / speaking(बोलना) / not / comes.
Why it differs: बोलना is the word the "speak" chunk uses everywhere; here it's substituted for "say," so the same collision problem as "speak" seed 1, in reverse.
Recommended fix: मुझे अभी तक बहुत सारे अलग-अलग शब्द कहना नहीं आता।
Fix transliteration: mujhe abhi tak bahut saare alag-alag shabd kahna nahin aata.
Confidence: medium.

SEED 452
English taught: They didn't say what they wanted to do.
Hindi now: उन्होंने यह नहीं बताया कि वे क्या करना चाहते थे।
Transliteration: unhonne yah nahin bataya ki ve kya karna chahte the.
Word by word: they / this / not / told(बताया) / that / they / what / do / wanted-were.
Why it differs: बताना ("to tell") is the word the separate "tell" chunk uses in all 11 of its seeds (e.g. seed 150, "Can you tell me your name" = "क्या आप मुझे अपना नाम बता सकते हैं"). Using it here for "say" means the same Hindi word now prompts two different English chunks.
Recommended fix: उन्होंने यह नहीं कहा कि वे क्या करना चाहते थे।
Fix transliteration: unhonne yah nahin kaha ki ve kya karna chahte the.
Confidence: high.

SEED 453
English taught: Did they say who they saw last night?
Hindi now: क्या उन्होंने बताया कि उन्होंने कल रात किसे देखा था?
Transliteration: kya unhonne bataya ki unhonne kal raat kise dekha tha?
Word by word: Q / they / told(बताया) / that / they / last / night / whom / saw / had?
Why it differs: same बताना/"tell" collision as seed 452.
Recommended fix: क्या उन्होंने कहा कि उन्होंने कल रात किसे देखा था?
Fix transliteration: kya unhonne kaha ki unhonne kal raat kise dekha tha?
Confidence: high.

## "tell" — CONSISTENT
10 of 11 seeds use बताना. Seed 522 ("tell the truth") uses सच बोलना — but "tell the truth" is a fixed Hindi idiom (सच बोलना is how this is virtually always said), a legitimate different collocation, not an error. No finding — but see "say," which does collide into तell's बताना.

## "understand" — CONSISTENT
All 6 seeds use समझना / समझ आना. No finding.

## "remember" — SPLIT
CHUNK "remember" — SPLIT (याद करना family in 4 of 7)
The odd ones out: seeds 57, 113, 232 (three different constructions, one each)

SEED 57
English taught: I can't remember how to say what I wanted to say.
Hindi now: मुझे याद नहीं आ रहा कि मैं जो कहना चाहता था उसे कैसे कहूँ।
Transliteration: mujhe yaad nahin aa raha ki main jo kahna chahta tha use kaise kahoon.
Word by word: to-me / memory / not / coming / that / I / what / say / wanted-was / that / how / say.
Why it differs: uses याद आना ("memory comes [to me]," spontaneous recall) where the majority (seeds 6, 10, 24, 56 — all also "can/can't remember X") use याद करना ("do the remembering," active effort/ability).
Recommended fix: मैं याद नहीं कर पा रहा कि मैं जो कहना चाहता था उसे कैसे कहूँ।
Fix transliteration: main yaad nahin kar pa raha ki main jo kahna chahta tha use kaise kahoon.

SEED 113
English taught: Why can't I remember what you said?
Hindi now: आपने जो कहा, वह मुझे याद क्यों नहीं रहता?
Transliteration: aapne jo kaha, vah mujhe yaad kyon nahin rahta?
Word by word: you / what / said, / that / to-me / memory / why / not / stays(रहता)?
Why it differs: uses याद रहना ("stay in memory") — same "can't remember X" pattern as the majority but a third construction.
Recommended fix: आपने जो कहा, वह मैं याद क्यों नहीं कर पाता?
Fix transliteration: aapne jo kaha, vah main yaad kyon nahin kar paata?

SEED 232
English taught: I know an old woman who can remember the answer.
Hindi now: मैं एक बूढ़ी औरत को जानता हूँ जो जवाब याद रख सकती है।
Transliteration: main ek boodhi aurat ko jaanta hoon jo jawaab yaad rakh sakti hai.
Word by word: I / one / old / woman-ACC / know / who / answer / memory / keep(रखना) / can.
Why it differs: uses याद रखना ("keep/retain in memory") — a fourth construction for the same "can remember X" pattern.
Recommended fix: मैं एक बूढ़ी औरत को जानता हूँ जो जवाब याद कर सकती है।
Fix transliteration: main ek boodhi aurat ko jaanta hoon jo jawaab yaad kar sakti hai.

Confidence: medium-high — all four constructions (करना/आना/रहना/रखना) are grammatically valid Hindi ways to talk about memory in general, but here they're applied to the identical English pattern ("can/can't remember X") three different ways with no apparent driver, which is exactly the kind of chunk-fragmentation ZUT is meant to prevent.

---

# BAND 5 — FIDELITY DRIFT THAT WANTS A NATIVE EAR (48)

Real differences from the English, but each turns on how a Hindi sentence *reads* rather than on a word being present or absent. Read these for the full picture; skip them if you want the fix list.

---

### S1 — FIDELITY DRIFT (speak → talk), and it's the course's first line

- **English taught:** I want to speak English with you now.
- **Hindi now:** मैं अब आपके साथ अंग्रेज़ी में बात करना चाहता हूँ।
- **Transliteration:** main ab aapke saath angrezi mein baat karna chaahta hoon.
- **Word by word:** I / now / your / with / English / **in** / **talk** / to-do / want / am
- **Back-translation:** I want to talk with you in English now.
- **What is wrong:** "बात करना" is *to talk / have a conversation* and "अंग्रेज़ी में" is *in English* — the English taught is *speak English*, which the old Hindi had as "अंग्रेज़ी बोलना".
- **Recommended fix:** मैं अब आपके साथ अंग्रेज़ी बोलना चाहता हूँ।
- **Fix transliteration:** main ab aapke saath angrezi bolna chaahta hoon.
- **Confidence:** medium — her Hindi is the more natural sentence, and she made the same swap at seed 5 while swapping the *other* way at seeds 23 and 28 (*talking* → बोलना). The inconsistency is the reason to look, more than this one line.

---

### S3 — FIDELITY DRIFT (frequency became quantity)

- **English taught:** how to speak as often as possible.
- **Hindi now:** कि ज़्यादा से ज़्यादा कैसे बोलूँ।
- **Transliteration:** ki zyaada se zyaada kaise boloon.
- **Word by word:** that / more / from / more / how / I-may-speak
- **Back-translation:** …how I can speak as much as possible.
- **What is wrong:** "ज़्यादा से ज़्यादा" is a quantity, *as much as possible*; the English is a frequency, *as often as possible*, which the old Hindi had as "जितनी बार हो सके" (*as many times as possible*).
- **Recommended fix:** कि ज़्यादा से ज़्यादा बार कैसे बोलूँ।
- **Fix transliteration:** ki zyaada se zyaada baar kaise boloon.
- **Confidence:** medium — adding बार (*times*) restores the frequency; Shuchita should say whether it reads naturally here.

---

### S26 — FIDELITY DRIFT (aspect, and a generic became a specific)

- **English taught:** I like feeling as if I'm nearly ready to go.
- **Hindi now:** मुझे यह अहसास अच्छा लग रहा है जैसे मैं जाने के लिए लगभग तैयार हूँ।
- **Transliteration:** mujhe yah ahsaas achchha lag raha hai jaise main jaane ke liye lagbhag taiyaar hoon.
- **Word by word:** to-me / **this** / feeling / good / seeming / **is-right-now** / as-if / I / to-go / for / nearly / ready / am
- **Back-translation:** I'm liking this feeling right now, as if I'm nearly ready to go.
- **What is wrong:** "लग रहा है" is the right-now progressive and "यह अहसास" is *this feeling* — the English is a general statement, *I like feeling…*, not a report about a feeling happening at this moment.
- **Recommended fix:** मुझे ऐसा महसूस करना पसंद है जैसे मैं जाने के लिए लगभग तैयार हूँ।
- **Fix transliteration:** mujhe aisa mahsoos karna pasand hai jaise main jaane ke liye lagbhag taiyaar hoon.
- **Confidence:** medium — if you want to keep her wording, changing only "लग रहा है" to "लगता है" fixes the aspect; what would settle it is whether she intended the "this feeling" reading.

---

### S29 — FIDELITY DRIFT

- **English taught:** I'm looking forward to speaking better as soon as I can.
- **Hindi now:** मैं जल्दी से जल्दी बेहतर बोल पाने के लिए उत्सुक हूँ।
- **Transliteration:** main jaldi se jaldi behtar bol paane ke liye utsuk hoon.
- **Word by word:** I / quickly / from / quickly / better / speak / **being-able** / for / **eager** / am
- **Back-translation:** I'm eager to be able to speak better as soon as possible.
- **What is wrong:** "उत्सुक" is *eager/keen* and "बोल पाने" adds *be able to*, which the English doesn't have; the old Hindi's "इंतज़ार कर रहा हूँ" is the standard *looking forward to*.
- **Recommended fix:** मैं जल्दी से जल्दी बेहतर बोलने का इंतज़ार कर रहा हूँ।
- **Fix transliteration:** main jaldi se jaldi behtar bolne ka intezaar kar raha hoon.
- **Confidence:** medium — "उत्सुक हूँ" is arguably an idiomatic *looking forward to*; what would settle it is Shuchita's ear.

---

### S58 — FIDELITY DRIFT ("is" became "becomes")

- **English taught:** It's interesting when you understand enough words.
- **Hindi now:** जब आप काफ़ी शब्द समझ लेते हैं, तो यह दिलचस्प हो जाता है।
- **Transliteration:** jab aap kaafi shabd samajh lete hain, to yah dilchasp ho jaata hai.
- **Word by word:** when / you / enough / words / understand / take / are, / then / this / interesting / **become** / goes / is
- **Back-translation:** When you understand enough words, it becomes interesting.
- **What is wrong:** "हो जाता है" is *becomes*; the English is *it's interesting*.
- **Recommended fix:** यह दिलचस्प होता है जब आप काफ़ी शब्द समझ लेते हैं।
- **Fix transliteration:** yah dilchasp hota hai jab aap kaafi shabd samajh lete hain.
- **Confidence:** medium

---

### S61 — FIDELITY DRIFT (that → this)

- **English taught:** Could you say that again a little more slowly?
- **Hindi now:** क्या आप इसे थोड़ा और धीरे दोबारा कह सकते हैं?
- **Transliteration:** kya aap ise thoda aur dheere dobaara kah sakte hain?
- **Word by word:** Q / you / **this** / a-little / more / slowly / again / say / can / are
- **Back-translation:** Could you say this again a little more slowly?
- **What is wrong:** "इसे" is *this / it*; the English is *that*, which the old Hindi had as "वह".
- **Recommended fix:** क्या आप उसे थोड़ा और धीरे दोबारा कह सकते हैं?
- **Fix transliteration:** kya aap use thoda aur dheere dobaara kah sakte hain?
- **Confidence:** medium — the *this/that* contrast matters in a beginner course, but a Hindi speaker would use either here.

---

### S76 — FIDELITY DRIFT (the "already" dropped)

- **English taught:** I'm very happy with how much I've learnt already.
- **Hindi now:** मैं इस बात से बहुत ख़ुश हूँ कि मैं कितना सीख चुका हूँ।
- **Transliteration:** main is baat se bahut khush hoon ki main kitna seekh chuka hoon.
- **Word by word:** I / this / matter / from / very / happy / am / that / I / how-much / learn / have-completed / am
- **Back-translation:** I'm very happy with how much I have learnt.
- **What is wrong:** the explicit "पहले ही" (*already*) that the old Hindi had is gone; "चुका हूँ" carries completion but not the word *already* — and seed 244 in the same course still says "पहले ही … सीख चुका हूँ" for *I've learnt a lot already*.
- **Recommended fix:** मैं इस बात से बहुत ख़ुश हूँ कि मैं पहले ही कितना सीख चुका हूँ।
- **Fix transliteration:** main is baat se bahut khush hoon ki main pahle hi kitna seekh chuka hoon.
- **Confidence:** medium — "चुका हूँ" may be enough on its own; the argument for restoring it is consistency with seed 244.

---

### S103 — FIDELITY DRIFT (quantifier)

- **English taught:** We're not trying to hear many more words.
- **Hindi now:** हम और ज़्यादा शब्द सुनने की कोशिश नहीं कर रहे हैं।
- **Transliteration:** ham aur zyaada shabd sunne ki koshish nahin kar rahe hain.
- **Word by word:** we / more / much / words / to-hear / of / effort / not / doing / are
- **Back-translation:** We're not trying to hear more words.
- **What is wrong:** "और ज़्यादा" is *more*; the English is *many more*. (In fairness the old Hindi's "बहुत और" was broken Hindi — this is a repair that lost a word rather than a careless edit.)
- **Recommended fix:** हम बहुत सारे और शब्द सुनने की कोशिश नहीं कर रहे हैं।
- **Fix transliteration:** ham bahut saare aur shabd sunne ki koshish nahin kar rahe hain.
- **Confidence:** medium — Shuchita should pick the natural Hindi for *many more*.

---

### S127 — FIDELITY DRIFT

- **English taught:** That isn't why I wanted to see you.
- **Hindi now:** मैं आपसे इसके लिए नहीं मिलना चाहता था।
- **Transliteration:** main aapse **iske liye** nahin milna chahta tha.
- **Word by word:** I / you-from / **for-this** / not / to-meet / wanted / was.
- **Back-translation:** "I didn't want to meet you for this."
- **What is wrong:** इसीलिए ("for that reason") became इसके लिए ("for this"), and with नहीं sitting next to the verb the negation now reads as attaching to the wanting — the English presupposes the speaker *did* want to see them.
- **Recommended fix:** मैं आपसे इसीलिए नहीं मिलना चाहता था।
- **Fix transliteration:** main aapse isilie nahin milna chahta tha.
- **Confidence:** medium — negation scope in Hindi is context-sensitive; what would settle it is asking Shuchita which reading she hears first.

---

### S138 — FIDELITY DRIFT

- **English taught:** This was where my friend wanted to meet us.
- **Hindi now:** मेरे दोस्त हमसे यहीं मिलना चाहते थे।
- **Transliteration:** mere dost hamse **yahin** milna chahte the.
- **Word by word:** my / friend / us-with / **right-here** / to-meet / wanted / were.
- **Back-translation:** "My friend wanted to meet us right here."
- **What is wrong:** The old Hindi began with यहीं ("right here"), matching the English cleft "This was where…"; moved into the middle it is now an ordinary adverb, so the natural English out of it is the plain "My friend wanted to meet us here."
- **Recommended fix:** यहीं मेरे दोस्त हमसे मिलना चाहते थे।
- **Fix transliteration:** yahin mere dost hamse milna chahte the.
- **Confidence:** medium — a native speaker may judge the fronting stilted; what would settle it is whether Shuchita reads the fronted version as marked or merely emphatic.

---

### S144 — FIDELITY DRIFT

- **English taught:** I woke earlier than I wanted to this morning.
- **Hindi now:** मैं आज जितना सोना चाहता था, उससे पहले ही जाग गया।
- **Transliteration:** main aaj jitna **sona** chahta tha, usse pahle hi jag gaya.
- **Word by word:** I / today / as-much / **to-sleep** / wanted / was / than-that / before / just / wake / went.
- **Back-translation:** "I woke earlier than I wanted to sleep today."
- **What is wrong:** Two small shifts — सुबह ("morning") was dropped so it now says only "today", and सोना ("to sleep") was added, a verb the English does not contain.
- **Recommended fix:** मैं आज सुबह जितना सोना चाहता था, उससे पहले ही जाग गया।
- **Fix transliteration:** main aaj subah jitna sona chahta tha, usse pahle hi jag gaya.
- **Confidence:** medium — the सोना reads naturally in Hindi and may be the right idiom; the dropped "morning" is the solid half.

---

### S183 — FIDELITY DRIFT + ZUT RISK

- **English taught:** No I'm afraid I haven't seen them.
- **Hindi now:** नहीं, माफ़ करना मैंने उन्हें नहीं देखा।
- **Transliteration:** nahin, **maaf karna** maine unhen nahin dekha.
- **Word by word:** no / **forgive / do** / I-erg / them / not / saw.
- **Back-translation:** "No, sorry, I haven't seen them."
- **What is wrong:** "I'm afraid" is now "sorry"; her edit correctly killed a bad calque (the old Hindi said मुझे डर है, *I have fear*, which is wrong in Hindi) but overshot into a different English phrase.
- **ZUT clash:** माफ़ करना is now also the Hindi for "I'm sorry" at seed 140 and seed 193, so one prompt serves both "I'm sorry" and "I'm afraid".
- **Recommended fix:** नहीं, अफ़सोस है कि मैंने उन्हें नहीं देखा।
- **Fix transliteration:** nahin, afsos hai ki maine unhen nahin dekha.
- **Confidence:** medium — the old Hindi was genuinely defective, so this needs a native decision on which phrase carries "I'm afraid" without colliding with "I'm sorry". **Shuchita's call.**

---

### S232 — FIDELITY DRIFT

- **English taught:** I know an old woman who can remember the answer.
- **Hindi now:** मैं एक बूढ़ी औरत को जानता हूँ जो जवाब याद **रख** सकती है।
- **Transliteration:** main ek burhi aurat ko janta hun jo javab yad **rakh** sakti hai.
- **Word by word:** I / one / old / woman / to / know / am / who / answer / memory / **keep** / can / is.
- **Back-translation:** "I know an old woman who can keep the answer in mind."
- **What is wrong:** याद करना ("to recall") became याद रखना ("to keep in mind / retain") — recalling something now shifts to holding on to it.
- **Recommended fix:** मैं एक बूढ़ी औरत को जानता हूँ जो जवाब याद कर सकती है।
- **Fix transliteration:** main ek burhi aurat ko janta hun jo javab yad kar sakti hai.
- **Confidence:** medium — याद रखना is often used loosely for "remember"; what would settle it is Shuchita saying whether she hears "recall" or "retain" here. **Weakest item in this report — happy to see it dropped.**

---

### S247 — FIDELITY DRIFT

- **English taught:** I thought that book was fairly good.
- **Hindi now:** मुझे वह किताब काफ़ी अच्छी लगी।
- **Transliteration:** mujhe vah kitab kafi achchhi **lagi**.
- **Word by word:** to-me / that / book / fairly / good / **seemed**.
- **Back-translation:** "I found that book fairly good." / "I liked that book quite a lot."
- **What is wrong:** "I thought X was Y" became "X seemed Y to me" — and note seed 124, which she left alone, still uses the मुझे लगा … था pattern for the identical English frame, so the two seeds now cue different English.
- **Recommended fix:** मुझे लगा वह किताब काफ़ी अच्छी थी।
- **Fix transliteration:** mujhe laga vah kitab kafi achchhi thi.
- **Confidence:** medium — मुझे … लगी is idiomatic and a native speaker may well say it back-translates fine as "I thought"; the cross-seed inconsistency with 124 is the firmer half of the point.

---

### S248 — FIDELITY DRIFT

- **English taught:** I thought the film was complete rubbish and I want my money back.
- **Hindi now:** मुझे फ़िल्म बिल्कुल बेकार लगी और मैं अपने पैसे वापस लेना चाहता हूँ।
- **Transliteration:** mujhe film bilkul bekar lagi aur main apne paise vapas **lena** chahta hun.
- **Word by word:** to-me / film / completely / useless / seemed / and / I / my-own / money / back / **to-take** / want / am.
- **Back-translation:** "I found the film complete rubbish and I want to take my money back."
- **What is wrong:** Same "thought → seemed" shift as 247, plus लेना ("to take") has been added — the English is "I want my money back", with no "take" in it.
- **Recommended fix:** मुझे लगा फ़िल्म बिल्कुल बेकार थी और मैं अपने पैसे वापस चाहता हूँ।
- **Fix transliteration:** mujhe laga film bilkul bekar thi aur main apne paise vapas chahta hun.
- **Confidence:** medium on the "thought" half, high on the added "take".

---

### S268 and S341 and S342 — FIDELITY DRIFT (one pattern, three seeds)

- **English taught:** 268 "Yes she sent me two emails last week." / 341 "I met someone a few days ago." / 342 "I met someone who said something."
- **Hindi now:** 268 हाँ, उसने पिछले हफ़्ते मुझे दो ईमेल भेजे **थे**। / 341 मैं कुछ दिन पहले किसी से मिला **था**। / 342 मैं किसी से मिला जिसने कुछ कहा **था**।
- **Transliteration:** bheje **the** / mila **tha** / kaha **tha**
- **Word by word:** bheje the [had sent] / mila tha [had met] / kaha tha [had said]
- **Back-translation:** "she had sent me two emails" / "I had met someone" / "who had said something".
- **What is wrong:** She added "tha/the" to three simple-past English sentences, which is the Hindi pluperfect — a learner reading it can produce "had sent", "had met", "had said".
- **Recommended fix:** drop the auxiliary in all three — भेजे। / मिला। / कहा।
- **Fix transliteration:** bheje. / mila. / kaha.
- **Confidence:** medium — spoken Hindi uses "tha" loosely for any remote past, so she may read all three as plain past. What would settle it: ask Shuchita directly whether she intended a "had"-reading.

---

### S281 — FIDELITY DRIFT

- **English taught:** Do you mind if I finish my coffee before you start?
- **Hindi now:** एतराज़ न हो तो आपके शुरू करने से पहले मैं अपनी कॉफ़ी ख़त्म कर लूँ?
- **Transliteration:** etraaz na ho to aapke shuru karne se pehle main apni coffee khatm kar loon?
- **Word by word:** etraaz [objection] / na ho [if there is not] / to [then] / aapke shuru karne se pehle [before your starting] / main [I] / apni coffee [my coffee] / khatm kar loon [may finish]
- **Back-translation:** If there's no objection, may I finish my coffee before you start?
- **What is wrong:** The English asks a question *about the listener* ("Do you mind if…"); the new Hindi demotes that to a conditional preface and asks permission instead. **Credit where due:** she fixed a real defect in the same line — the old Hindi's "main shuru karne se pehle" read "before *I* start", and she corrected it to "aapke" = "before *you* start".
- **Recommended fix:** क्या आपको एतराज़ होगा अगर आपके शुरू करने से पहले मैं अपनी कॉफ़ी ख़त्म कर लूँ?
- **Fix transliteration:** kya aapko etraaz hoga agar aapke shuru karne se pehle main apni coffee khatm kar loon?
- **Confidence:** medium — spoken with question intonation, her version may still cue "Do you mind if…".

---

### S318 — FIDELITY DRIFT

- **English taught:** No I don't think she could this time.
- **Hindi now:** नहीं, मुझे नहीं लगता वह इस बार ला पाएगी।
- **Transliteration:** nahin, mujhe nahin lagta vah is baar la paayegi.
- **Word by word:** nahin [no] / mujhe nahin lagta [I don't think] / vah [she] / is baar [this time] / la paayegi [will be able to bring]
- **Back-translation:** No, I don't think she'll be able to bring it this time.
- **What is wrong:** "paayegi" is future — "will be able to" — where the English is "could". Its own neighbour, seed 317 ("Yes I think she could if she wanted to"), still reads "la sakti hai", so two adjacent seeds now render the same English "could" two different ways.
- **Recommended fix:** नहीं, मुझे नहीं लगता वह इस बार ला सकती है।
- **Fix transliteration:** nahin, mujhe nahin lagta vah is baar la sakti hai.
- **Confidence:** medium

---

### S321 — FIDELITY DRIFT

- **English taught:** A book.
- **Hindi now:** किताब।
- **Transliteration:** kitaab.
- **Word by word:** kitaab [book]
- **Back-translation:** Book.
- **What is wrong:** She removed "ek" ("a/one"). Hindi has no articles, so "ek" was the only thing in the prompt cueing the English "a" — and seed 264 ("An old man." → "एक बूढ़ा आदमी") still has its "ek", so the two fragments now behave differently.
- **Recommended fix:** एक किताब।
- **Fix transliteration:** ek kitaab.
- **Confidence:** medium — bare "kitaab" is the natural spoken answer, so this may be deliberate; the question for Shuchita is whether this course wants the English article cued.

---

### S334 — FIDELITY DRIFT

- **English taught:** He said that he can let you hold the kitten.
- **Hindi now:** उसने कहा कि वह आपको बिल्ली के बच्चे को गोद में लेने दे सकता है।
- **Transliteration:** usne kaha ki vah aapko billi ke bachche ko god mein lene de sakta hai.
- **Word by word:** usne kaha [he said] / ki [that] / vah [he] / aapko [to you] / billi ke bachche ko [the kitten] / god mein [in lap] / lene [to take] / de sakta hai [can let]
- **Back-translation:** He said he can let you take the kitten in your lap.
- **What is wrong:** "god mein lena" is "to take into one's lap" — "hold" has become a more specific action and "in your lap" is content the English does not have. (The "let" is intact — this is not the dropped-"let" defect.)
- **Recommended fix:** उसने कहा कि वह आपको बिल्ली के बच्चे को हाथ में लेने दे सकता है।
- **Fix transliteration:** usne kaha ki vah aapko billi ke bachche ko haath mein lene de sakta hai.
- **Confidence:** medium — the old word "pakadna" can sound like "grab", which is probably why she changed it; "haath mein lena" is a middle option.

---

### S339 — FIDELITY DRIFT

- **English taught:** No I think he's hurt himself quite badly.
- **Hindi now:** नहीं, मुझे लगता है उसे बहुत बुरी तरह चोट लगी है।
- **Transliteration:** nahin, mujhe lagta hai use bahut buri tarah chot lagi hai.
- **Word by word:** nahin [no] / mujhe lagta hai [I think] / use [to him] / bahut [very] / buri tarah [badly] / chot lagi hai [injury has struck]
- **Back-translation:** No, I think he has been hurt very badly.
- **What is wrong:** Two things — the construction has no agent, so "himself" disappears; and "bahut" is "very" where the English says "quite".
- **Recommended fix:** नहीं, मुझे लगता है उसने ख़ुद को काफ़ी बुरी तरह चोट पहुँचाई है।
- **Fix transliteration:** nahin, mujhe lagta hai usne khud ko kaafi buri tarah chot pahunchaayi hai.
- **Confidence:** medium on the "himself" half (Hindi genuinely prefers the agentless form for accidental self-injury); the "quite" → "very" half I am confident about.

---

### S344 — FIDELITY DRIFT

- **English taught:** Who said that he's happy to help you.
- **Hindi now:** जिसने कहा कि उसे आपकी मदद करके ख़ुशी होगी।
- **Transliteration:** jisne kaha ki use aapki madad karke khushi hogi.
- **Word by word:** jisne kaha [who said] / ki [that] / use [to him] / aapki madad karke [by helping you] / khushi hogi [happiness will be]
- **Back-translation:** Who said that he would be glad to help you.
- **What is wrong:** "hogi" is future — "would be happy"; the English is present, "he's happy to help you".
- **Recommended fix:** जिसने कहा कि वह आपकी मदद करने में ख़ुश है।
- **Fix transliteration:** jisne kaha ki vah aapki madad karne mein khush hai.
- **Confidence:** medium — "khushi hogi" is the idiomatic Hindi offer of help, so she has a case; but it prompts "would".

---

### S352 — FIDELITY DRIFT

- **English taught:** Even if he wanted to he wouldn't be able to.
- **Hindi now:** अगर वह चाहे, तो भी नहीं कर सकता।
- **Transliteration:** agar vah chaahe, to bhi nahin kar sakta.
- **Word by word:** agar [if] / vah [he] / chaahe [wants — subjunctive] / to bhi [even then] / nahin kar sakta [cannot do]
- **Back-translation:** Even if he wants to, he still can't.
- **What is wrong:** "nahin kar sakta" is present "can't"; the English is the conditional "wouldn't be able to", which the old Hindi had ("nahin kar paata").
- **Recommended fix:** भले ही वह चाहता, तो भी वह नहीं कर पाता।
- **Fix transliteration:** bhale hi vah chaahta, to bhi vah nahin kar paata.
- **Confidence:** medium

---

### S374 — FIDELITY DRIFT

- **English taught:** Yes I thought it was very beautiful.
- **Hindi now:** हाँ, मेरे ख़्याल से यह बहुत सुंदर था।
- **Transliteration:** haan, mere khyaal se yah bahut sundar tha.
- **Word by word:** haan [yes] / mere khyaal se [in my opinion] / yah [it] / bahut sundar tha [was very beautiful]
- **Back-translation:** Yes, in my opinion it was very beautiful.
- **What is wrong:** "mere khyaal se" is a present-tense stance ("in my opinion"), not the past mental event "I thought" — and the same phrase now heads seed 255, where it renders "do you think", so one Hindi phrase is doing two different English jobs.
- **Recommended fix:** हाँ, मुझे लगा कि यह बहुत सुंदर था।
- **Fix transliteration:** haan, mujhe laga ki yah bahut sundar tha.
- **Confidence:** medium

---

### S375 — FIDELITY DRIFT

- **English taught:** No I didn't know what she was doing.
- **Hindi now:** नहीं, मुझे नहीं पता था कि वह क्या कर रही है।
- **Transliteration:** nahin, mujhe nahin pata tha ki vah kya kar rahi hai.
- **Word by word:** nahin [no] / mujhe nahin pata tha [I did not know] / ki [that] / vah [she] / kya [what] / kar rahi hai [is doing]
- **Back-translation:** No, I didn't know what she is doing.
- **What is wrong:** "kar rahi hai" is present where the English is "was doing". This is *correct* Hindi — Hindi does not backshift the embedded verb — but the prompt now cues exactly the English tense error Hindi speakers are most prone to.
- **Recommended fix:** नहीं, मुझे नहीं पता था कि वह क्या कर रही थी।
- **Fix transliteration:** nahin, mujhe nahin pata tha ki vah kya kar rahi thi.
- **Confidence:** medium — this is a straight trade-off between good Hindi and a prompt that teaches the English, and it is Shuchita's and Kai's call, not mine.

---

### S378 — FIDELITY DRIFT

- **English taught:** No I didn't have enough money for holidays.
- **Hindi now:** नहीं, मेरे पास छुट्टियों के लिए काफ़ी पैसे नहीं थे।
- **Transliteration:** nahin, mere paas chhuttiyon ke liye kaafi paise nahin the.
- **Word by word:** nahin [no] / mere paas [with me] / chhuttiyon ke liye [for holidays] / kaafi [quite a lot] / paise [money] / nahin the [there was not]
- **Back-translation:** No, I didn't have much money for holidays.
- **What is wrong:** "kaafi" leads with "a lot"; the old word "paryaapt" is exactly "enough". This is the same "enough → a lot" shape Kai already found elsewhere.
- **Recommended fix:** नहीं, मेरे पास छुट्टियों के लिए पर्याप्त पैसे नहीं थे।
- **Fix transliteration:** nahin, mere paas chhuttiyon ke liye paryaapt paise nahin the.
- **Confidence:** medium — "kaafi X nahin tha" *is* used for "not enough X" in speech, and "paryaapt" is bookish, which is presumably why she changed it. Shuchita should choose a natural word that still means "enough".

---

### S379 — FIDELITY DRIFT

- **English taught:** Yes I was lucky enough to travel to Africa.
- **Hindi now:** हाँ, मैं भाग्यशाली था कि अफ़्रीका जा सका।
- **Transliteration:** haan, main bhaagyashaali tha ki Africa ja saka.
- **Word by word:** haan [yes] / main [I] / bhaagyashaali tha [was lucky] / ki [that] / Africa [Africa] / ja saka [could go]
- **Back-translation:** Yes, I was lucky that I could go to Africa.
- **What is wrong:** The English construction being taught is "lucky **enough** to travel"; the new Hindi has dropped the "enough" word entirely (the old Hindi had "itna" = "that much / enough") and replaced "travel to" with "could go".
- **Recommended fix:** हाँ, मैं इतना भाग्यशाली था कि अफ़्रीका जा सका।
- **Fix transliteration:** haan, main itna bhaagyashaali tha ki Africa ja saka.
- **Confidence:** medium — the meaning is barely changed; it is the "adjective + enough to" structure that has lost its prompt.

---

### S391 — FIDELITY DRIFT

- **English taught:** The one who is walking towards the bus.
- **Hindi now:** जो बस की ओर जा रहा है।
- **Transliteration:** jo bus ki or ja raha hai.
- **Word by word:** jo [who] / bus ki or [towards the bus] / ja raha hai [is going]
- **Back-translation:** The one who is going towards the bus.
- **What is wrong:** "ja raha hai" is "is going"; the English verb is "walking", which the old Hindi had ("chal raha hai").
- **Recommended fix:** जो बस की ओर चल रहा है।
- **Fix transliteration:** jo bus ki or chal raha hai.
- **Confidence:** medium

---

### S398 — FIDELITY DRIFT

- **English taught:** We want to become more patient with our children.
- **Hindi now:** हम अपने बच्चों के साथ और धैर्यवान होना चाहते हैं।
- **Transliteration:** ham apne bachchon ke saath aur dhairyavaan hona chaahte hain.
- **Word by word:** ham [we] / apne bachchon ke saath [with our children] / aur [more] / dhairyavaan [patient] / hona [to be] / chaahte hain [want]
- **Back-translation:** We want to be more patient with our children.
- **What is wrong:** "hona" is "to be"; the English is "become", which the old Hindi had ("banna").
- **Recommended fix:** हम अपने बच्चों के साथ और धैर्यवान बनना चाहते हैं।
- **Fix transliteration:** ham apne bachchon ke saath aur dhairyavaan banna chaahte hain.
- **Confidence:** medium — Hindi "hona" can carry "become", so many learners will still produce the right word.

---

### S400 — FIDELITY DRIFT (with a ZUT edge)

- **English taught:** Do we want to eat something later on?
- **Hindi now:** क्या हम बाद में कुछ खाना चाहेंगे?
- **Transliteration:** kya ham baad mein kuch khaana chaahenge?
- **Word by word:** kya [Q] / ham [we] / baad mein [later] / kuch [something] / khaana [to eat] / chaahenge [would like / will want]
- **Back-translation:** Would we like to eat something later?
- **What is wrong:** "chaahenge" is the form this course uses for "would like" — seed 271 "Would you like to come with us next month" and seed 411 "We would like to reserve a table" both use it — so the plain present "do we want" has been moved into the "would like" slot. The old "chaahte hain" was the plain present.
- **Recommended fix:** क्या हम बाद में कुछ खाना चाहते हैं?
- **Fix transliteration:** kya ham baad mein kuch khaana chaahte hain?
- **Confidence:** medium — seeds 623 and 625 already use "chaahenge" for "Do you want…", so the known side was loose here before her; this edit removes the one seed in range that kept the distinction.

---

### S405 — FIDELITY DRIFT

**English taught:** Should we ask if we have to book?
**Hindi now:** क्या हम पूछें कि हमें बुकिंग तो नहीं करनी?
**Transliteration:** kya ham poochhen ki hamein booking to nahin karni?
**Word by word:** kya = [q] | ham poochhen = shall we ask | ki = that | hamein = to-us | booking = booking | **to nahin = surely-not** | karni = to do
**Back-translation:** "Shall we ask whether we *don't* have to book?" — or, on the idiomatic reading, "…whether we might have to book?"
**What is wrong:** there is a नहीं ("not") inside the embedded clause and there is no negation anywhere in the English. The old Hindi had none there either.
**Recommended fix:** क्या हम पूछें कि क्या हमें बुकिंग करनी होगी?
**Fix transliteration:** kya ham poochhen ki kya hamein booking karni hogi?
**Confidence:** medium. "तो नहीं" is a genuine Hindi apprehensive idiom ("might we have to?"), so a native may hear it correctly — but a learner sees a negative word, and the safe prompt has none. **This is the one I most want Shuchita's ear on.**

---

### S410 — FIDELITY DRIFT (+ ZUT clash)

**English taught:** They still fight with each other.
**Hindi now:** वे फिर भी आपस में लड़ते हैं।
**Transliteration:** ve phir bhi aapas mein ladte hain.
**Word by word:** ve = they | **phir bhi = even so / nevertheless** | aapas mein = among themselves | ladte hain = fight
**Back-translation:** "Even so, they fight with each other."
**What is wrong:** फिर भी is concessive ("despite that"), not temporal. "Still" here means "up to now", which is अभी भी (abhi bhi) — the word the old Hindi had. **ZUT:** फिर भी is the natural prompt for "They fight with each other anyway."
**Recommended fix:** वे अभी भी आपस में लड़ते हैं।
**Fix transliteration:** ve abhi bhi aapas mein ladte hain.
**Confidence:** medium — in the run of seeds 408–410 a concessive reading is arguable, but the English word on the line is "still".

---

### S422 and S500 — FIDELITY DRIFT (determiner cues)

**English taught:** *(422)* A question. *(500)* Why don't you want to sit between the two girls?
**Hindi now:** सवाल। / आप दो लड़कियों के बीच में क्यों नहीं बैठना चाहते?
**Transliteration:** savaal. / aap do ladkiyon ke beech mein kyun nahin baithna chaahte?
**Word by word:** savaal = question *(the old Hindi had* **एक** *= "a/one" in front of it)* | aap = you | **do = two** *(old:* **दोनों** *= "the two / both")* | ladkiyon = girls | ke beech mein = between | kyun nahin = why not | baithna chaahte = want to sit
**Back-translation:** "Question." / "Why don't you want to sit between two girls?"
**What is wrong:** Hindi has no articles, so एक and दोनों are the only cues a Hindi prompt can carry for English "a" and "the two". Both were removed. The new Hindi is more natural; the learner loses the determiner.
**Recommended fix:** एक सवाल। / आप दोनों लड़कियों के बीच में क्यों नहीं बैठना चाहते?
**Fix transliteration:** ek savaal. / aap donon ladkiyon ke beech mein kyun nahin baithna chaahte?
**Confidence:** medium, low severity. **What would settle it:** whether this course has already decided not to cue English articles from the Hindi side at all. If it has, both lines are correct as they stand and you should ignore this block.

---

### S470 — FIDELITY DRIFT

**English taught:** How high do you want to climb before we stop?
**Hindi now:** आप कितना ऊँचा चढ़ने के बाद चाहते हैं कि हम रुकें?
**Transliteration:** aap kitna ooncha chadhne ke baad chaahte hain ki ham ruken?
**Word by word:** aap = you | kitna ooncha = how high | **chadhne ke baad = after climbing** | chaahte hain = want | ki = that | ham ruken = we stop
**Back-translation:** "After climbing how high do you want us to stop?"
**What is wrong:** के बाद (ke baad) means "after"; the English says "before".
**Recommended fix:** इससे पहले कि हम रुकें, आप कितना ऊँचा चढ़ना चाहते हैं?
**Fix transliteration:** isse pahle ki ham ruken, aap kitna ooncha chadhna chaahte hain?
**Confidence:** medium — the two phrasings describe the same physical situation, so this is not a meaning error; but the learner is reading "after" and a *want-someone-to-stop* frame and would plausibly produce a different English sentence. Note her edit did fix a real defect (the old Hindi had dropped the "we" entirely) — my fix keeps that repair.

---

### S482 — FIDELITY DRIFT

**English taught:** The only real hope is that they're not serious.
**Hindi now:** एकमात्र असली उम्मीद यह है कि वे गंभीर नहीं होंगे।
**Transliteration:** ekmaatr asli ummeed yah hai ki ve gambhir nahin honge.
**Word by word:** ekmaatr = only | asli = real | ummeed = hope | yah hai = is this | ki = that | ve = they | gambhir = serious | **nahin honge = will not be**
**Back-translation:** "The only real hope is that they won't be serious."
**What is wrong:** होंगे is the future; the English is present, "they're not". The old Hindi had नहीं हैं ("are not").
**Recommended fix:** एकमात्र असली उम्मीद यह है कि वे गंभीर नहीं हैं।
**Fix transliteration:** ekmaatr asli ummeed yah hai ki ve gambhir nahin hain.
**Confidence:** medium — Hindi's होंगे can also carry "probably are", which would be an acceptable reading; but the English has neither a "probably" nor a future.

---

### S496 — FIDELITY DRIFT

**English taught:** I'm not planning to lose when it really matters.
**Hindi now:** जब यह सच में मायने रखता हो तब मेरा हारने का कोई इरादा नहीं है।
**Transliteration:** jab yah sach mein maayne rakhta ho tab mera haarne ka koi iraada nahin hai.
**Word by word:** jab = when | yah = it | sach mein = really | maayne rakhta ho = matters | tab = then | mera = my | haarne ka = of losing | **koi iraada nahin hai = there is no intention**
**Back-translation:** "When it really matters, I have no intention of losing."
**What is wrong:** इरादा (iraada) is "intention". The old Hindi had योजना (yojna, "plan"), which is the word matching "planning".
**Recommended fix:** जब यह सच में मायने रखता हो तब मैं हारने की योजना नहीं बना रहा।
**Fix transliteration:** jab yah sach mein maayne rakhta ho tab main haarne ki yojna nahin bana raha.
**Confidence:** medium — the senses overlap, but "I have no intention of losing" is a different English sentence and a very likely learner output.

---

### S497 — FIDELITY DRIFT (part of it pre-existing)

**English taught:** That sounds as though you need to get some sleep.
**Hindi now:** लगता है कि आपको थोड़ा सो लेना चाहिए।
**Transliteration:** lagta hai ki aapko thoda so lena chaahiye.
**Word by word:** lagta hai = it seems | **ki = that** | aapko = to-you | thoda = a little | so lena = to sleep | **chaahiye = should**
**Back-translation:** "It seems that you should get a bit of sleep."
**What is wrong:** two mismatches. कि ("that") replaces the old जैसे ("as though"); and चाहिए is "should" where the English says "need to". **Be fair to her on the second one — the चाहिए was already in the old Hindi.** Only the "as though" loss is hers. I flag the row because as it stands it prompts neither "sounds as though" nor "need to".
**Recommended fix:** ऐसा लगता है जैसे आपको थोड़ी नींद लेने की ज़रूरत है।
**Fix transliteration:** aisa lagta hai jaise aapko thodi neend lene ki zaroorat hai.
**Confidence:** medium-high.

---

### S523 — FIDELITY DRIFT (better Hindi, wrong English verb)

**English taught:** Instead of giving an excuse.
**Hindi now:** कोई बहाना बनाने की बजाय।
**Transliteration:** koi bahaana banaane ki bajaay.
**Word by word:** koi = any | bahaana = excuse | **banaane = making** | ki bajaay = instead of
**Back-translation:** "Instead of making an excuse."
**What is wrong:** बनाना is "to make"; the English says "giving".
**Recommended fix:** none I would push. This is the honest hard case: her बहाना बनाना is the correct Hindi collocation and the old बहाना देना was a word-for-word calque off the English. The rule says the English is the curriculum — but I can't produce Hindi that means "give an excuse" without going back to a calque.
**Confidence:** medium on the mismatch; Shuchita's call on whether it matters.

---

### S561 — FIDELITY DRIFT

- **English taught:** I don't care if it's a fast car.
- **Hindi now:** मुझे परवाह नहीं कि कार तेज़ है या नहीं।
- **Transliteration:** mujhe parvaah nahin ki kaar tez hai ya nahin.
- **Word by word:** mujhe = to-me | parvaah nahin = no care | ki = that/whether | kaar = car | tez hai = is fast | ya nahin = OR NOT
- **Back-translation:** "I don't care whether the car is fast or not."
- **What is wrong:** "या नहीं / ya nahin = or not" has been added with nothing in the English to match it, and "a fast car" has become "the car is fast".
- **Recommended fix:** मुझे परवाह नहीं कि यह तेज़ कार है।
- **Fix transliteration:** mujhe parvaah nahin ki yah tez kaar hai.
- **Confidence:** medium — English "if" here is genuinely ambiguous between "whether" and a conditional. What settles it: the taught sentence contains no "or not", so the prompt should not either.

---

### S590 — FIDELITY DRIFT (tense)

- **English taught:** I saw the last bus leaving the station.
- **Hindi now:** मैंने आख़री बस को स्टेशन से निकलते देखा था।
- **Transliteration:** maine aakhri bas ko station se nikalte dekha tha.
- **Word by word:** maine = I (erg) | aakhri = last | bas ko = the bus (object) | station se = from the station | nikalte = leaving | dekha tha = HAD SEEN
- **Back-translation:** "I had seen the last bus leaving the station."
- **What is wrong:** था / tha turns "I saw" into "I had seen" — and the seed immediately before it (589, "she'd just seen") genuinely is a past perfect, so the two English tenses now share one Hindi ending.
- **Recommended fix:** मैंने आख़िरी बस को स्टेशन से निकलते देखा।
- **Fix transliteration:** maine aakhiri bas ko station se nikalte dekha.
- **Confidence:** medium — colloquial Hindi does use देखा था loosely for a plain past. What settles it: whether 589/590 are meant to contrast "she'd seen" against "I saw".

---

### S602 — FIDELITY DRIFT

- **English taught:** How it started in the first place.
- **Hindi now:** इस सबकी शुरुआत कैसे हुई।
- **Transliteration:** is sabki shuruaat kaise hui.
- **Word by word:** is sabki = of all this | shuruaat = beginning | kaise = how | hui = happened
- **Back-translation:** "How all this began."
- **What is wrong:** nothing in the gloss corresponds to "in the first place", and "it" has become "all this" — the learner produces "How did all this begin?"
- **Recommended fix:** यह आख़िर शुरू कैसे हुआ।
- **Fix transliteration:** yah aakhir shuru kaise hua.
- **Confidence:** medium — she was right to remove the old wording ("पहली जगह" was a literal "at the first place", genuinely broken Hindi). Hindi has no clean equivalent of "in the first place"; a native should choose between आख़िर and मूल रूप से.

---

### S633 — FIDELITY DRIFT (degree word; see also 624)

- **English taught:** A large glass of water would be fine.
- **Hindi now:** पानी का एक बड़ा गिलास अच्छा रहेगा।
- **Transliteration:** paani ka ek bada gilaas achchha rahega.
- **Word by word:** paani ka = of water | ek bada gilaas = one large glass | achchha = GOOD | rahega = will-be
- **Back-translation:** "A large glass of water would be good."
- **What is wrong:** ठीक / theek = "fine, all right" became अच्छा / achchha = "good"; and in the same pass seed 624 turned बढ़िया / badhiya = "great" into बहुत अच्छा / bahut achchha = "very good" — so "fine", "good" and "great" now all sit on the one word अच्छा.
- **Recommended fix:** पानी का एक बड़ा गिलास ठीक रहेगा।
- **Fix transliteration:** paani ka ek bada gilaas theek rahega.
- **Confidence:** medium — both Hindi words are perfectly natural; this only matters because the course teaches "fine" and "great" as separate English words.

---

### S651 — FIDELITY DRIFT

- **English taught:** What do you think madam?
- **Hindi now:** आपका क्या ख़्याल है, मैडम?
- **Transliteration:** aapka kya khyaal hai, madam?
- **Word by word:** aapka = your | kya = what | khyaal = opinion / view | hai = is | madam
- **Back-translation:** "What is your opinion, madam?"
- **What is wrong:** the verb "think" (सोचना / sochna — present in the old Hindi as सोचती हैं) has been replaced by a noun meaning "opinion", so the learner is as likely to produce "What's your opinion?" as the taught sentence.
- **Recommended fix:** आप क्या सोचती हैं, मैडम?
- **Fix transliteration:** aap kya sochti hain, madam?
- **Confidence:** medium — "आपका क्या ख़्याल है" is a normal spoken equivalent of "what do you think". What settles it: whether "think" is a taught lesson word at this point in the course.

---

### S653 — FIDELITY DRIFT (a question turned negative)

- **English taught:** Do you mind madam?
- **Hindi now:** आपको आपत्ति तो नहीं है, मैडम?
- **Transliteration:** aapko aapatti to nahin hai, madam?
- **Word by word:** aapko = to-you | aapatti = objection | to = (emphasis) | nahin hai = IS NOT | madam
- **Back-translation:** "You don't mind, do you, madam?"
- **What is wrong:** नहीं / nahin ("not") has been added — the plain question has become a negative tag question, and the learner will produce "You don't mind, do you?"
- **Recommended fix:** क्या आपको आपत्ति है, मैडम?
- **Fix transliteration:** kya aapko aapatti hai, madam?
- **Confidence:** medium — the negative form is very idiomatic polite Hindi and a native may argue it *is* how "do you mind?" is said. What settles it: whether the course wants the plain question form produced here.

---

### S667 — FIDELITY DRIFT (same edit as 653)

- **English taught:** Do you all mind?
- **Hindi now:** आप सबको आपत्ति तो नहीं है?
- **Transliteration:** aap sabko aapatti to nahin hai?
- **Word by word:** aap sabko = to you all | aapatti = objection | to = (emphasis) | nahin hai = IS NOT
- **Back-translation:** "You all don't mind, do you?"
- **What is wrong:** same added नहीं / nahin as seed 653 — a plain question has become a negative tag question.
- **Recommended fix:** क्या आप सबको आपत्ति है?
- **Fix transliteration:** kya aap sabko aapatti hai?
- **Confidence:** medium — same caveat as 653; 653 and 667 stand or fall together.


---

# What I am confident about, and what wants Shuchita's eye

**Confident, and I would send straight to a fix list.** The two machine classes are clean — that is a character-by-character check on all 668 prompts and a reading of all 15 sir/madam seeds, and it needs no Hindi speaker to confirm. The "need to" → "should" family is confident in both directions: ten seeds use चाहिए for "need to", eight other seeds use the same word for "should", and you can see both lists without reading a word of Devanagari. The same goes for every Band 1 item where the finding is *a word from the English has no counterpart left in the Hindi* — "let", "try", "pay for", "feel", "already", "yet". The gloss convicts on its own. Band 2's eight errors are the same kind of thing: a doubled हम at 143 and a missing पर at 641 are visible in the gloss whether or not you read the script.

**Wants Shuchita, and I would not spend money before she rules.** Three things. First, the *replacement wording* for many Band 1 fixes: the readers can show you that the meaning drifted, but several of their proposed repairs reach back for exactly the bookish words she was right to remove — "enough" at 378 and "entrance" at 390 are the clearest cases, and reverting those would undo a real improvement. Second, all 48 of Band 5, by construction: they are claims about how a sentence reads, and a native ear settles each in a second where I cannot settle it at all. Third, the two big consistency families — "feel" and "important" — need a ruling on *which* form the course standardises on, not merely on the fact that it currently has two.

**And one question that is hers alone, and larger than any seed on this page.** She was briefed to make the Hindi natural, and natural Hindi collapses distinctions a teaching prompt exists to preserve — four different English modals genuinely do share one idiomatic Hindi word. Until that brief has a second axis, *does it still say what the English says?*, a second pass will produce the same class of drift again. That is the thing worth ruling on before the chunk work restarts, and it is why this list came before it.

**One thing the readers all volunteered, and it belongs here.** Across the 420 edits she fixed far more than she broke — dropped subjects, missing objects, real calques, and at seed 512 a prompt that said "while *you* fetch the keys" where the English says "while *I* fetch the keys". A defect list reads unfairly by its nature. This is the residue on top of a pass that was worth doing.

---

# Gaps, stated rather than papered over

- **Attribution is by date, not identity.** These 420 edits are everything that changed in the Hindi between 21 and 31 August. That the window is Shuchita's is your team's inference; I did not verify it.
- **Nobody who read these is a native Hindi speaker.** Every "high confidence" is a claim about a word being present, absent, or having a particular dictionary sense — things the gloss lets you check. Every "medium" is a claim about how a sentence reads, and those need her.
- **The false-positive rate on the machine-built consistency families was about two in three in the first half, and about forty in forty-one in the second.** The 26 survivors are what is left after reading.
- **The course moved while this was being read.** Six seeds were edited this morning by another job — punctuation, and one nukta at seed 145. The list reflects the state after those. Nothing else changed under me; I re-checked the whole Hindi side at the end and it was identical.
- **The English side has its own defect and it is untouched.** Seed 525's English reads "To check if you were been able to finish." Eighteen of the nineteen sibling courses have the correct "you've been able to"; only Hindi is corrupted, and the proofreader was reading Hindi, so it survived. It is in no band above because it is not a Hindi problem — but it is the one thing on this page that is unambiguously broken with nothing to weigh.

*Read-only throughout: no content was edited, no database row written, no audio generated, and no commits were made.*
