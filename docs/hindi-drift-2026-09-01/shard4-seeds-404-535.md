# eng_for_hin — Shuchita drift audit, shard 4 (seeds 404–535)

**Read-only audit. Nothing was edited, in the database or anywhere else.**
84 seeds read, every one individually.

## Provenance of the input

The brief first arrived with its two file paths blank, so I rebuilt the shard from the database:
current `known_text` from `course_seeds` for `eng_for_hin` seeds 404-535, and the pre-edit Hindi
from the earliest `content_audit_log` row for each seed on or after 2026-08-20. That yielded
exactly 84 changed seeds in range.

The real shard file arrived afterwards, at
`/tmp/cs-1792f41f-4bb9-4e1f-aac6-775c3644b73f/hindi-inconsistencies-list/shard4.tsv`. I diffed it
against my reconstruction: **all 84 data rows are byte-identical**, the only difference being the
supplied file's header line. So this report was written against the intended shard, and the
database is the same story the file tells. Nothing below changed as a result of the file arriving.

---

## How to read this

Three tiers, by how much I'd stake on them:

- **Tier 1 (14 seeds)** — I would send these to be fixed without asking anyone.
- **Tier 2 (7 blocks)** — real, but the call is arguable; a native speaker should confirm.
- **Tier 3 (3 blocks)** — low severity, listed so you can decide, not so you can act.

Then a list of things I looked at and **rejected**, with why — those matter as much as the
findings, because several looked like drift until I checked the rest of the course.

---

# TIER 1 — act on these

## SEED 421 — FIDELITY DRIFT + NEW ERROR
**English taught:** Because they already know he's getting weak.
**Hindi now:** क्योंकि वे पहले जानते हैं कि वे कमज़ोर होते जा रहे हैं।
**Transliteration:** kyunki ve pahle jaante hain ki ve kamzor hote jaa rahe hain.
**Word by word:** kyunki = because | ve = they | pahle = earlier/first | jaante hain = know | ki = that | **ve = they** | kamzor = weak | hote jaa rahe hain = are becoming
**Back-translation:** "Because they know beforehand that **they** are getting weak."
**What is wrong:** two things, both visible in the gloss — "already" was पहले **से** (pahle se) in the old Hindi and is now bare पहले (pahle, "earlier/first"), which does not mean "already"; and the "he" has become वे, *the identical word already used for "they" earlier in the same sentence*, so the line now reads as the same people getting weak.
**Recommended fix:** क्योंकि वे पहले से जानते हैं कि वह कमज़ोर होता जा रहा है।
**Fix transliteration:** kyunki ve pahle se jaante hain ki vah kamzor hota jaa raha hai.
**Confidence:** high on "already" — I checked, and the course's other "already" seed (244) uses पहले **ही**; bare पहले is used for "already" nowhere. Medium on the pronoun: वे is also Hindi's *respectful singular* "he", and the seed next door (420) did shift to respectful agreement for the same man — but even on that reading it is now the same word as "they" in the same sentence, so the fix stands either way.

## SEED 407 — FIDELITY DRIFT
**English taught:** Shouldn't we try to set a good example?
**Hindi now:** क्या हमें अच्छा उदाहरण नहीं रखना चाहिए?
**Transliteration:** kya hamein achchha udaaharan nahin rakhna chaahiye?
**Word by word:** kya = [question marker] | hamein = to-us | achchha = good | udaaharan = example | nahin = not | rakhna = to keep/set | chaahiye = should
**Back-translation:** "Shouldn't we set a good example?"
**What is wrong:** the Hindi word for "try" — कोशिश (koshish) — was in the old version and is simply absent from the new one; nothing in the six remaining words means "try".
**Recommended fix:** क्या हमें अच्छा उदाहरण रखने की कोशिश नहीं करनी चाहिए?
**Fix transliteration:** kya hamein achchha udaaharan rakhne ki koshish nahin karni chaahiye?
**Confidence:** high.

## SEED 491 — FIDELITY DRIFT
**English taught:** I love the way you try to help.
**Hindi now:** मुझे आपके मदद करने का तरीक़ा पसंद है।
**Transliteration:** mujhe aapke madad karne ka tariqa pasand hai.
**Word by word:** mujhe = to-me | aapke = your | madad karne ka = of helping | tariqa = way | pasand hai = is liked
**Back-translation:** "I like your way of helping."
**What is wrong:** the same dropped "try" as seed 407 — कोशिश (koshish) was in the old Hindi and is gone.
**Recommended fix:** मुझे वह तरीक़ा पसंद है जिससे आप मदद करने की कोशिश करते हैं।
**Fix transliteration:** mujhe vah tariqa pasand hai jisse aap madad karne ki koshish karte hain.
**Confidence:** high.

## SEED 478 — FIDELITY DRIFT
**English taught:** She has such a kind heart.
**Hindi now:** वह बहुत दयालु है।
**Transliteration:** vah bahut dayaalu hai.
**Word by word:** vah = she | bahut = very | dayaalu = kind | hai = is
**Back-translation:** "She is very kind."
**What is wrong:** count the words — there are four, and none of them is a noun. दिल (dil, "heart") was in the old Hindi and has vanished; the learner is being asked to produce "She has such a kind heart" from a prompt that says "she is very kind".
**Recommended fix:** उसका दिल इतना अच्छा है।
**Fix transliteration:** uska dil itna achchha hai.
**Confidence:** high.

## SEED 423 — FIDELITY DRIFT *(confirms the specimen already in your brief)*
**English taught:** Do they need to ask such an obvious question?
**Hindi now:** क्या उन्हें इतना स्पष्ट सवाल पूछना चाहिए?
**Transliteration:** kya unhein itna spasht savaal poochhna chaahiye?
**Word by word:** kya = [q] | unhein = to-them | itna = so | spasht = obvious | savaal = question | poochhna = to ask | chaahiye = should
**Back-translation:** "Should they ask such an obvious question?"
**What is wrong:** चाहिए (chaahiye) is the Hindi word for "should"; the English says "need to". The old Hindi had ज़रूरत (zaroorat, "need") — the word this course uses for "need" in seeds 320, 396 and 420.
**Recommended fix:** क्या उन्हें इतना स्पष्ट सवाल पूछने की ज़रूरत है?
**Fix transliteration:** kya unhein itna spasht savaal poochhne ki zaroorat hai?
**Confidence:** high.

## SEED 534 — FIDELITY DRIFT
**English taught:** Let's not go outside in this dreadful weather.
**Hindi now:** हमें इस भयानक मौसम में बाहर नहीं जाना चाहिए।
**Transliteration:** hamein is bhayaanak mausam mein baahar nahin jaana chaahiye.
**Word by word:** hamein = to-us | is = this | bhayaanak = dreadful | mausam mein = weather in | baahar = outside | nahin = not | jaana = to go | chaahiye = should
**Back-translation:** "We shouldn't go outside in this dreadful weather."
**What is wrong:** the same चाहिए = "should" as seed 423, and here it has eaten a "Let's". The old Hindi had चलो … न जाएँ (chalo … na jaayen, "let's not go"). I checked the rest of the course: seed 158 ("Let's talk about something else") and seed 522 ("Let's agree…") both still use चलिए/चलो — so this line is inconsistent with her own pass.
**Recommended fix:** चलो इस भयानक मौसम में बाहर न जाएँ।
**Fix transliteration:** chalo is bhayaanak mausam mein baahar na jaayen.
**Confidence:** high.

## SEED 468 — FIDELITY DRIFT (+ ZUT clash)
**English taught:** It's a big world.
**Hindi now:** दुनिया बहुत बड़ी है।
**Transliteration:** duniya bahut badi hai.
**Word by word:** duniya = world | bahut = very | badi = big | hai = is
**Back-translation:** "The world is very big."
**What is wrong:** a "very" has appeared that the English does not have, and the "it's a …" frame has gone. **ZUT:** this exact Hindi is the natural prompt for a different English sentence, "The world is very big."
**Recommended fix:** यह एक बड़ी दुनिया है।
**Fix transliteration:** yah ek badi duniya hai.
**Confidence:** high.

## SEED 516 — FIDELITY DRIFT
**English taught:** They both came on their own.
**Hindi now:** वे दोनों अलग-अलग आए थे।
**Transliteration:** ve donon alag-alag aaye the.
**Word by word:** ve = they | donon = both | **alag-alag = separately, each apart** | aaye the = had come
**Back-translation:** "They both came separately."
**What is wrong:** अलग-अलग means "separately, one apart from the other" — it says they arrived by different routes or at different times, which is a different claim from "unaccompanied". The old Hindi had अपने दम पर (apne dam par, "under their own steam").
**Recommended fix:** वे दोनों अपने आप आए थे।
**Fix transliteration:** ve donon apne aap aaye the.
**Confidence:** high.

## SEED 509 — FIDELITY DRIFT
**English taught:** I heard that you're going to pay for a new bed.
**Hindi now:** मैंने सुना है कि आप एक नया बेड ख़रीदने वाले हैं।
**Transliteration:** maine suna hai ki aap ek naya bed kharidne vaale hain.
**Word by word:** maine = I | suna hai = have heard | ki = that | aap = you | ek naya bed = a new bed | **kharidne vaale hain = are going to buy**
**Back-translation:** "I heard that you're going to buy a new bed."
**What is wrong:** the verb is now "buy". "Pay for" has no counterpart anywhere in the new Hindi; the old Hindi had भुगतान (bhugtaan, "payment") — a word she *kept* in the very next seed, 508, for "pay".
**Recommended fix:** मैंने सुना है कि आप एक नए बेड के पैसे देने वाले हैं।
**Fix transliteration:** maine suna hai ki aap ek naye bed ke paise dene vaale hain.
**Confidence:** high.

## SEED 503 — FIDELITY DRIFT
**English taught:** I hate making trouble but that one's mine.
**Hindi now:** मुझे परेशानी खड़ी करना पसंद नहीं है लेकिन यह मेरा है।
**Transliteration:** mujhe pareshaani khadi karna pasand nahin hai lekin yah mera hai.
**Word by word:** mujhe = to-me | pareshaani khadi karna = making trouble | **pasand nahin hai = is not liked** | lekin = but | yah = this | mera hai = is mine
**Back-translation:** "I don't like making trouble, but this one is mine."
**What is wrong:** "hate" has been softened to "don't like". The old Hindi had नफ़रत (nafrat, "hatred").
**Recommended fix:** मुझे परेशानी खड़ी करने से नफ़रत है, लेकिन वह वाला मेरा है।
**Fix transliteration:** mujhe pareshaani khadi karne se nafrat hai, lekin vah vaala mera hai.
**Confidence:** high on the verb. Separately: *both* old and new say यह ("this") where the English says "that one" — a pre-existing miss, and my fix above repairs it too.

## SEED 433 — FIDELITY DRIFT
**English taught:** They couldn't find out when the film started.
**Hindi now:** उन्हें पता नहीं लगा कि फ़िल्म कब शुरू हुई थी।
**Transliteration:** unhein pata nahin laga ki film kab shuru hui thi.
**Word by word:** unhein = to-them | pata nahin laga = did not become known | ki = that | film = film | kab = when | shuru hui thi = had started
**Back-translation:** "They didn't find out when the film had started."
**What is wrong:** the "could" is gone. The old Hindi had सके (sake), the Hindi ability marker — "were able to". The new sentence has no ability marker at all, so it says they simply did not find out.
**Recommended fix:** वे पता नहीं लगा सके कि फ़िल्म कब शुरू हुई।
**Fix transliteration:** ve pata nahin laga sake ki film kab shuru hui.
**Confidence:** high.

## SEED 426 — NEW ERROR
**English taught:** They would like to love each other but they're unhappy.
**Hindi now:** वे एक-दूसरे से प्यार करना चाहते, लेकिन वे दुखी हैं।
**Transliteration:** ve ek-doosre se pyaar karna chaahte, lekin ve dukhi hain.
**Word by word:** ve = they | ek-doosre se = each other with | pyaar karna = to love | **chaahte = want-[UNFINISHED]** | lekin = but | ve = they | dukhi = unhappy | **hain = are**
**Back-translation:** "They … to love each other, but they are unhappy." The first clause has no finished verb.
**What is wrong:** चाहते is a bare participle and Hindi requires an auxiliary after it — चाहते **हैं** ("want") or चाहेंगे ("would like"). You can see the asymmetry in the gloss: the second clause in the very same sentence keeps its auxiliary (हैं), the first has lost one. The old Hindi had चाहेंगे, which is also the correct match for "would like".
**Recommended fix:** वे एक-दूसरे से प्यार करना चाहेंगे, लेकिन वे दुखी हैं।
**Fix transliteration:** ve ek-doosre se pyaar karna chaahenge, lekin ve dukhi hain.
**Confidence:** high.

## SEED 414 — FIDELITY DRIFT
**English taught:** Could we have a bottle of red wine please?
**Hindi now:** क्या हमें एक बोतल रेड वाइन देंगे?
**Transliteration:** kya hamein ek botal red wine denge?
**Word by word:** kya = [q] | hamein = to-us | ek botal = one bottle | red wine = red wine | **denge = will [you] give**
**Back-translation:** "Will you give us a bottle of red wine?"
**What is wrong:** two losses. The verb is now "will give", pointed at the waiter, where the English is "could we have"; and कृपया ("please") from the old Hindi is gone with nothing replacing it — there is no politeness word left in the five-word prompt.
**Recommended fix:** क्या हमें एक बोतल रेड वाइन मिल सकती है, प्लीज़?
**Fix transliteration:** kya hamein ek botal red wine mil sakti hai, please?
**Confidence:** high that "please" is unrepresented. Medium on the modal — a Hindi ear does hear देंगे as polite. I used प्लीज़ rather than the old कृपया because she has been removing bookish register throughout; that word choice is hers to make.

## SEED 498 — ZUT RISK
**English taught:** He's standing alone over there inside the entrance.
**Hindi now:** वह वहाँ दरवाज़े के अंदर अकेला खड़ा है।
**Transliteration:** vah vahaan darvaaze ke andar akela khada hai.
**Word by word:** vah = he | vahaan = there | **darvaaze ke andar = door inside** | akela = alone | khada hai = is standing
**Back-translation:** "He's standing alone over there inside the door."
**What is wrong:** दरवाज़ा (darvaaza) is already this course's word for "door" — and the proof is the *next edited seed in this very shard*, 499: "Maybe we should open the door and close the window" = दरवाज़ा खोलना. One Hindi word now prompts two different English words. The old Hindi had प्रवेश द्वार (pravesh dvaar, "entrance").
**Recommended fix:** वह वहाँ प्रवेश द्वार के अंदर अकेला खड़ा है।
**Fix transliteration:** vah vahaan pravesh dvaar ke andar akela khada hai.
**Confidence:** high on the clash — seed 499 is right there. Medium on my particular fix: प्रवेश द्वार is exactly the formal register Shuchita has been stripping out, so she may want a third word. It just must not be दरवाज़ा.

---

# TIER 2 — real, but a native speaker should confirm

## SEED 405 — FIDELITY DRIFT
**English taught:** Should we ask if we have to book?
**Hindi now:** क्या हम पूछें कि हमें बुकिंग तो नहीं करनी?
**Transliteration:** kya ham poochhen ki hamein booking to nahin karni?
**Word by word:** kya = [q] | ham poochhen = shall we ask | ki = that | hamein = to-us | booking = booking | **to nahin = surely-not** | karni = to do
**Back-translation:** "Shall we ask whether we *don't* have to book?" — or, on the idiomatic reading, "…whether we might have to book?"
**What is wrong:** there is a नहीं ("not") inside the embedded clause and there is no negation anywhere in the English. The old Hindi had none there either.
**Recommended fix:** क्या हम पूछें कि क्या हमें बुकिंग करनी होगी?
**Fix transliteration:** kya ham poochhen ki kya hamein booking karni hogi?
**Confidence:** medium. "तो नहीं" is a genuine Hindi apprehensive idiom ("might we have to?"), so a native may hear it correctly — but a learner sees a negative word, and the safe prompt has none. **This is the one I most want Shuchita's ear on.**

## SEED 470 — FIDELITY DRIFT
**English taught:** How high do you want to climb before we stop?
**Hindi now:** आप कितना ऊँचा चढ़ने के बाद चाहते हैं कि हम रुकें?
**Transliteration:** aap kitna ooncha chadhne ke baad chaahte hain ki ham ruken?
**Word by word:** aap = you | kitna ooncha = how high | **chadhne ke baad = after climbing** | chaahte hain = want | ki = that | ham ruken = we stop
**Back-translation:** "After climbing how high do you want us to stop?"
**What is wrong:** के बाद (ke baad) means "after"; the English says "before".
**Recommended fix:** इससे पहले कि हम रुकें, आप कितना ऊँचा चढ़ना चाहते हैं?
**Fix transliteration:** isse pahle ki ham ruken, aap kitna ooncha chadhna chaahte hain?
**Confidence:** medium — the two phrasings describe the same physical situation, so this is not a meaning error; but the learner is reading "after" and a *want-someone-to-stop* frame and would plausibly produce a different English sentence. Note her edit did fix a real defect (the old Hindi had dropped the "we" entirely) — my fix keeps that repair.

## SEED 482 — FIDELITY DRIFT
**English taught:** The only real hope is that they're not serious.
**Hindi now:** एकमात्र असली उम्मीद यह है कि वे गंभीर नहीं होंगे।
**Transliteration:** ekmaatr asli ummeed yah hai ki ve gambhir nahin honge.
**Word by word:** ekmaatr = only | asli = real | ummeed = hope | yah hai = is this | ki = that | ve = they | gambhir = serious | **nahin honge = will not be**
**Back-translation:** "The only real hope is that they won't be serious."
**What is wrong:** होंगे is the future; the English is present, "they're not". The old Hindi had नहीं हैं ("are not").
**Recommended fix:** एकमात्र असली उम्मीद यह है कि वे गंभीर नहीं हैं।
**Fix transliteration:** ekmaatr asli ummeed yah hai ki ve gambhir nahin hain.
**Confidence:** medium — Hindi's होंगे can also carry "probably are", which would be an acceptable reading; but the English has neither a "probably" nor a future.

## SEED 496 — FIDELITY DRIFT
**English taught:** I'm not planning to lose when it really matters.
**Hindi now:** जब यह सच में मायने रखता हो तब मेरा हारने का कोई इरादा नहीं है।
**Transliteration:** jab yah sach mein maayne rakhta ho tab mera haarne ka koi iraada nahin hai.
**Word by word:** jab = when | yah = it | sach mein = really | maayne rakhta ho = matters | tab = then | mera = my | haarne ka = of losing | **koi iraada nahin hai = there is no intention**
**Back-translation:** "When it really matters, I have no intention of losing."
**What is wrong:** इरादा (iraada) is "intention". The old Hindi had योजना (yojna, "plan"), which is the word matching "planning".
**Recommended fix:** जब यह सच में मायने रखता हो तब मैं हारने की योजना नहीं बना रहा।
**Fix transliteration:** jab yah sach mein maayne rakhta ho tab main haarne ki yojna nahin bana raha.
**Confidence:** medium — the senses overlap, but "I have no intention of losing" is a different English sentence and a very likely learner output.

## SEED 410 — FIDELITY DRIFT (+ ZUT clash)
**English taught:** They still fight with each other.
**Hindi now:** वे फिर भी आपस में लड़ते हैं।
**Transliteration:** ve phir bhi aapas mein ladte hain.
**Word by word:** ve = they | **phir bhi = even so / nevertheless** | aapas mein = among themselves | ladte hain = fight
**Back-translation:** "Even so, they fight with each other."
**What is wrong:** फिर भी is concessive ("despite that"), not temporal. "Still" here means "up to now", which is अभी भी (abhi bhi) — the word the old Hindi had. **ZUT:** फिर भी is the natural prompt for "They fight with each other anyway."
**Recommended fix:** वे अभी भी आपस में लड़ते हैं।
**Fix transliteration:** ve abhi bhi aapas mein ladte hain.
**Confidence:** medium — in the run of seeds 408–410 a concessive reading is arguable, but the English word on the line is "still".

## SEED 497 — FIDELITY DRIFT (part of it pre-existing)
**English taught:** That sounds as though you need to get some sleep.
**Hindi now:** लगता है कि आपको थोड़ा सो लेना चाहिए।
**Transliteration:** lagta hai ki aapko thoda so lena chaahiye.
**Word by word:** lagta hai = it seems | **ki = that** | aapko = to-you | thoda = a little | so lena = to sleep | **chaahiye = should**
**Back-translation:** "It seems that you should get a bit of sleep."
**What is wrong:** two mismatches. कि ("that") replaces the old जैसे ("as though"); and चाहिए is "should" where the English says "need to". **Be fair to her on the second one — the चाहिए was already in the old Hindi.** Only the "as though" loss is hers. I flag the row because as it stands it prompts neither "sounds as though" nor "need to".
**Recommended fix:** ऐसा लगता है जैसे आपको थोड़ी नींद लेने की ज़रूरत है।
**Fix transliteration:** aisa lagta hai jaise aapko thodi neend lene ki zaroorat hai.
**Confidence:** medium-high.

## SEEDS 441 and 442 — ZUT RISK
**English taught:** *(441)* An approach. *(442)* Did they want to develop a new approach?
**Hindi now:** एक नज़रिया। / क्या वे एक नया नज़रिया विकसित करना चाहते थे?
**Transliteration:** ek nazariya. / kya ve ek naya nazariya viksit karna chaahte the?
**Word by word:** ek = a | **nazariya = viewpoint / outlook** | kya = [q] | ve = they | naya = new | viksit karna = to develop | chaahte the = wanted
**Back-translation:** "A viewpoint." / "Did they want to develop a new viewpoint?"
**What is wrong:** नज़रिया is "point of view / outlook", not "approach" — a learner would produce "A viewpoint" or "An outlook".
**Recommended fix: none yet, and this is deliberate.** I checked before recommending the obvious revert to the old एक तरीक़ा, and तरीक़ा is *already* this course's word for "way" — seed 408 ("the best way to make a happy family") and seed 491 ("the way you try to help") both use it. So reverting swaps one clash for another. Her change was solving a real problem. This needs a third word, chosen by a Hindi speaker.
**Confidence:** medium on the drift; the fix is genuinely open.

---

# TIER 3 — low severity, listed for your decision

## SEED 501 — ZUT RISK
**English taught:** If only I could trust you to play together without arguing.
**Hindi now:** काश मैं आप पर भरोसा कर सकता कि आप बिना लड़े साथ खेलेंगे।
**Transliteration:** kaash main aap par bharosa kar sakta ki aap bina lade saath khelenge.
**Word by word:** kaash = if only | main = I | aap par = on you | bharosa kar sakta = could trust | ki = that | aap = you | **bina lade = without fighting** | saath = together | khelenge = will play
**Back-translation:** "If only I could trust you to play together without fighting."
**What is wrong:** लड़ना is "to fight" — the same verb this course uses for "fight" at seed 410, above. The old Hindi had झगड़ा (jhagda, "quarrel/argue"), which matches "arguing" and does not clash.
**Recommended fix:** काश मैं आप पर भरोसा कर सकता कि आप बिना झगड़े साथ खेलेंगे।
**Fix transliteration:** kaash main aap par bharosa kar sakta ki aap bina jhagde saath khelenge.
**Confidence:** medium. Keep the rest of her edit — she correctly added the missing "you" (आप) that the old Hindi lacked.

## SEED 523 — FIDELITY DRIFT (better Hindi, wrong English verb)
**English taught:** Instead of giving an excuse.
**Hindi now:** कोई बहाना बनाने की बजाय।
**Transliteration:** koi bahaana banaane ki bajaay.
**Word by word:** koi = any | bahaana = excuse | **banaane = making** | ki bajaay = instead of
**Back-translation:** "Instead of making an excuse."
**What is wrong:** बनाना is "to make"; the English says "giving".
**Recommended fix:** none I would push. This is the honest hard case: her बहाना बनाना is the correct Hindi collocation and the old बहाना देना was a word-for-word calque off the English. The rule says the English is the curriculum — but I can't produce Hindi that means "give an excuse" without going back to a calque.
**Confidence:** medium on the mismatch; Shuchita's call on whether it matters.

## SEEDS 422 and 500 — FIDELITY DRIFT (determiner cues)
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

# One thing outside my remit that you should see

**Seed 525's English is broken.** The English being taught reads:

> "To check if you were been able to finish."

"were been" is not English. Both the old and the new Hindi gloss cleanly as "to check whether
you were able to finish or not" — so the Hindi side is fine and the *English* is the defective
one. Because the English is the curriculum and must not be silently rewritten, this needs a
human decision rather than a fix. I have changed nothing.

---

# What I looked at and rejected

These looked like drift on first pass. I checked the rest of the course and dropped them.
Listing them because a rejected candidate is evidence too.

- **Seed 418** — "They need to serve the community" became करनी होगी, which glosses as "will have
  to". Looked like exactly the modal drift in your brief. **Rejected:** seeds 395, 397 and 425
  already render positive "need to" with होना है / होगा, and the course contains **no** "will
  have to" seeds at all, so there is nothing for it to clash with. This is course house style,
  not her drift.
- **Seed 504** — "I'm going to run across the grass": her edit removed the Hindi "going to"
  marker (वाला हूँ) and left a plain future (दौड़ूँगा). **Rejected:** seeds 5, 8, 24, 25 and 82
  already render "going to" as a plain future in this course. *(Separate pre-existing gap, not
  hers: neither version renders "across" — both say "on the grass".)*
- **Seeds 453, 462, 464, 502, 507** — she added the Hindi pluperfect (था/थे) to simple pasts.
  This is idiomatic Hindi narrative past and she did it consistently; I judged it style, not
  tense drift.
- **Seeds 479, 483, 484** — "It's the least I could do", "not meant to be easy", "meant to be a
  challenge". She replaced clunky calques with Hindi idioms. The English is idiomatic too and I
  could not show a learner would produce a different sentence.
- **Seeds 434, 466, 474, 492, 508, 512, 518, 519, 531** — she repaired real defects here: a
  missing "it" (466, 474), a missing "I" that made the prompt say "while *you* fetch the keys"
  (512), "worrying" that had been rendered as "thinking" (508), "imagine" that had been rendered
  as "see" (518), a missing animate marker (519), a genuine ambiguity between "anyone can win
  the game" and "one can win any game" (531). No drift; good edits.
- **Seeds 404, 406, 409, 424, 435, 436, 437, 440, 445, 448, 450, 452, 460, 461, 467, 471, 472,
  476, 481, 485, 488, 489, 495, 499, 506, 510, 511, 522, 527, 529, 532, 535** — clean. Many are
  nothing but nuqta restoration (खत्म → ख़त्म, फर्क → फ़र्क़), which changes spelling and not
  meaning.

---

# Counts

- **Seeds read: 84 of 84.** Every row individually; no sampling, no regex verdicts.
- **Findings: 26 seeds across 24 blocks.**
  - FIDELITY DRIFT: 21 seeds (405, 407, 410, 414, 421, 422, 423, 433, 468, 470, 478, 482, 491,
    496, 497, 500, 503, 509, 516, 523, 534)
  - NEW ERROR: 2 seeds (426 outright; 421 has both a drift and an error in one line)
  - ZUT RISK: 4 seeds (441, 442, 498, 501) — plus 410 and 468, already counted above, which
    carry a secondary clash
- **Would act on without asking: 14** (Tier 1). **Want a second opinion: 10** (Tiers 2 and 3).
- **Candidates checked and rejected: 7 classes**, listed above.

## On the count

Twenty-six out of eighty-four is higher than I expected, and I want to be straight about the
shape of it rather than let the headline number do the talking. **The fourteen in Tier 1 are the
real answer.** Six of those are one recurring move — a specific English word disappearing with
nothing to replace it: "try" twice (407, 491), "heart" (478), "pay for" (509), "could" (433),
"hate" softened (503). Those are the ones where the gloss convicts on its own and you do not
need to take my word for anything.

Tiers 2 and 3 are ten judgment calls, and I would rather show you my reasoning than either pad
the list or hide them. If you want the count to be defensible in one number, it is **14**.

## Which findings I want Shuchita's eye on

In order of how much I need her:

1. **Seed 405** — the "तो नहीं" negation. This is the one I am least sure of. It is either a
   polarity flip that will teach the wrong sentence, or a perfectly ordinary Hindi apprehensive
   idiom that I am reading too literally. Only a native speaker can settle it, and it is a
   two-second answer for her.
2. **Seeds 441/442** — "approach". I have shown that the drift is real *and* that the obvious
   revert creates a new clash with "way" at seeds 408 and 491. I have no third word to offer.
   She does.
3. **Seed 421** — the pronoun. The dropped "already" is not in doubt; whether her वे was meant
   as respectful singular "he" is. Either way my fix is right, but she should know which she meant.
4. **Seed 523** — "giving an excuse". A case where her Hindi is better than the English is
   literal, and the methodology rail says the English wins. She should be told that is why, not
   just handed a revert.
5. **Seeds 422/500** — the article and determiner cues. If there is already a course-level
   decision not to cue English articles from the Hindi, these two are not findings at all.
6. **Seed 414** — she deleted कृपया ("please"). I suspect she found it stiff. If so, प्लीज़ is
   available and the sentence needs *some* politeness word.

A general note in her favour, since a defect list reads unfairly: across these 84 rows she fixed
more than she broke. Nine of the rows I read are repairs of real defects — missing subjects,
missing objects, a prompt that said "while *you* fetch the keys" when the English says "while
*I* fetch the keys", genuine ambiguities. The drift class is narrow and it has a signature:
a word from the English quietly having no counterpart left in the Hindi.
