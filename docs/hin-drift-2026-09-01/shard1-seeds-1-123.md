# eng_for_hin — Shuchita's edits, shard 1 (seeds 1–123)

**Read: all 84 rows in the shard, one at a time.** Read-only job: nothing was edited, no
database write, no git commit, no audio.

Course reminder: **English is the taught side and is the curriculum.** Hindi is only the
prompt. Where the Hindi and the English disagree, the fix is always to the Hindi.

---

## Before the findings: two things you need to know

**1. The brief arrived with both file paths blank**, so there was no shard file to open. I
rebuilt the shard from the live database: every `eng_for_hin` seed 1–123 whose `known_text`
changed between 2026-08-21 and 2026-08-31, old Hindi from the first audit-log row in that
window, new Hindi as the seed stands right now. That produced exactly 84 rows.

The real `shard1.tsv` arrived afterwards, and I diffed it against my reconstruction: **the two
are identical, byte for byte** — same 84 seeds, same English, same old and new Hindi. So this
report is about your shard, not a near-miss of it. Recording the detour because the finding is
reusable: this shard is exactly reproducible from `content_audit_log` if a file is ever lost.

**2. Your headline specimen is already fixed, and it was fixed by her.** The brief calls
seed 119 the worst case — *"Can I ask you something before you leave?"* where the Hindi
dropped the *you* and quietly became *"before I leave"*. In the live database it is the
**old** Hindi that said "before I leave" (`क्या मैं जाने से पहले…`), and **her edit added the
missing subject** (`आपके जाने से पहले…` — *before your leaving*). She repaired it. She did
introduce a small new fault in the same line, which is finding N-1 below, but the subject
drift is not live. Please don't spend a fix on it.

---

## How to read the count

I found more than the brief led me to expect (~20 fidelity items across all 420 edits, so
~4 in this shard). I found 28. That is a threshold difference, not a disagreement: I counted
**single-word losses** — a dropped *yet*, *already*, *too much* → *a lot* — as fidelity items,
because your brief named exactly those. So they are split into two tiers:

- **Tier 1 (19 seeds)** — the Hindi now asks for a *materially different English sentence*.
  Act on these.
- **Tier 2 (9 seeds)** — one word or one modifier moved. Real, small, and each is a
  judgement call you may want to wave through.

Plus **1 new error** and **2 ZUT clashes**. Nothing else in the 84 is defective: the
remaining 54 rows are register repairs, nukta spellings (`गलती`→`ग़लती`, `हफ्ते`→`हफ़्ते`),
hyphenation, and clause reordering that leaves the meaning intact. Those are hers being right.

---

# TIER 1 — act on these

## SEED 10 — FIDELITY DRIFT
- **English taught:** I'm not sure if I can remember the whole sentence.
- **Hindi now:** मुझे नहीं लगता कि मैं पूरा वाक्य याद कर सकता हूँ।
- **Transliteration:** mujhe nahin lagta ki main poora vaakya yaad kar sakta hoon.
- **Word by word:** to-me / not / seems / that / I / whole / sentence / memory / do / can / am
- **Back-translation:** I don't think I can remember the whole sentence.
- **What is wrong:** the gloss contains no word meaning *sure* or *certain* anywhere — "मुझे नहीं लगता" is "I don't think".
- **Recommended fix:** मुझे यकीन नहीं है कि मैं पूरा वाक्य याद रख सकता हूँ।
- **Fix transliteration:** mujhe yaqeen nahin hai ki main poora vaakya yaad rakh sakta hoon.
- **Confidence:** high

## SEED 62 — FIDELITY DRIFT
- **English taught:** I'm not sure if I can help you at the same time.
- **Hindi now:** मुझे नहीं लगता कि मैं साथ-साथ आपकी मदद कर सकता हूँ।
- **Transliteration:** mujhe nahin lagta ki main saath-saath aapki madad kar sakta hoon.
- **Word by word:** to-me / not / seems / that / I / together-together / your / help / do / can / am
- **Back-translation:** I don't think I can help you alongside that.
- **What is wrong:** same substitution as seed 10 — "I'm not sure" has become "I don't think"; the old Hindi's "मुझे यकीन नहीं" (*I have no certainty*) is gone.
- **Recommended fix:** मुझे यकीन नहीं है कि मैं एक साथ आपकी मदद कर सकता हूँ।
- **Fix transliteration:** mujhe yaqeen nahin hai ki main ek saath aapki madad kar sakta hoon.
- **Confidence:** high

## SEED 80 — FIDELITY DRIFT
- **English taught:** I'm not sure when I'll be ready.
- **Hindi now:** मैं कह नहीं सकता कि मैं कब तैयार होऊँगा।
- **Transliteration:** main kah nahin sakta ki main kab taiyaar hoonga.
- **Word by word:** I / say / not / can / that / I / when / ready / will-be
- **Back-translation:** I can't say when I'll be ready.
- **What is wrong:** the gloss says *I cannot say* — a different English sentence from *I'm not sure*.
- **Recommended fix:** मुझे यकीन नहीं है कि मैं कब तैयार होऊँगा।
- **Fix transliteration:** mujhe yaqeen nahin hai ki main kab taiyaar hoonga.
- **Confidence:** high. Worth knowing: "I'm not sure" now has **three** different Hindi prompts across the course — नहीं लगता (10, 62), कह नहीं सकता (80, 654), पक्का नहीं कह सकता (165). One decision would fix all four.

## SEED 71 — FIDELITY DRIFT (the dropped "let")
- **English taught:** We didn't want to let anyone hear the truth.
- **Hindi now:** हम नहीं चाहते थे कि कोई सच सुने।
- **Transliteration:** ham nahin chaahte the ki koi sach sune.
- **Word by word:** we / not / wanted / were / that / anyone / truth / may-hear
- **Back-translation:** We didn't want anyone to hear the truth.
- **What is wrong:** there is no word for *let* anywhere in the gloss; the old Hindi had "सुनने देना" (*to let hear*), which is the construction this seed exists to teach.
- **Recommended fix:** हम किसी को भी सच सुनने नहीं देना चाहते थे।
- **Fix transliteration:** ham kisi ko bhi sach sunne nahin dena chaahte the.
- **Confidence:** high

## SEED 60 — FIDELITY DRIFT (the "enough" → "a lot" specimen, twice over)
- **English taught:** I don't know how to say enough different words yet.
- **Hindi now:** मुझे अभी तक बहुत सारे अलग-अलग शब्द बोलना नहीं आता।
- **Transliteration:** mujhe abhi tak bahut saare alag-alag shabd bolna nahin aata.
- **Word by word:** to-me / still / until / very / many / different-different / words / to-speak / not / comes
- **Back-translation:** I still don't know how to speak a lot of different words.
- **What is wrong:** "बहुत सारे" is *a lot of / many*, not *enough* — and "बोलना" is *to speak*, not *to say*; two taught words changed in one line.
- **Recommended fix:** मुझे अभी तक काफ़ी अलग-अलग शब्द कहना नहीं आता।
- **Fix transliteration:** mujhe abhi tak kaafi alag-alag shabd kahna nahin aata.
- **Confidence:** high — the neighbouring seed 58 still uses काफ़ी for *enough*, so the course already has the right word.

## SEED 82 — FIDELITY DRIFT (a lost negative)
- **English taught:** I'm not going to wait for you. Why not?
- **Hindi now:** मैं आपका इंतज़ार नहीं करूँगा। क्यों?
- **Transliteration:** main aapka intezaar nahin karoonga. kyon?
- **Word by word:** I / your / wait / not / will-do. / why?
- **Back-translation:** I won't wait for you. Why?
- **What is wrong:** the second sentence lost its नहीं — "क्यों" is *Why?*, and the English being taught is *Why not?*
- **Recommended fix:** मैं आपका इंतज़ार नहीं करूँगा। क्यों नहीं?
- **Fix transliteration:** main aapka intezaar nahin karoonga. kyon nahin?
- **Confidence:** high. (The *going to* → *will* change in the first half is the fused-future class you already ruled on — I've left it alone.)

## SEED 100 — FIDELITY DRIFT (modal lost; statement became a command)
- **English taught:** You shouldn't worry about doing something similar.
- **Hindi now:** आप ऐसा ही कुछ करने की चिंता न करें।
- **Transliteration:** aap aisa hi kuchh karne ki chinta na karen.
- **Word by word:** you / such / just / something / to-do / of / worry / not / do!(polite command)
- **Back-translation:** Don't worry about doing something like this.
- **What is wrong:** "न करें" is an imperative *don't do*, so the *should* has gone — and the seed immediately before it (99, *You should ask yourself…*) still uses चाहिए for *should*, so the pair no longer matches.
- **Recommended fix:** आपको ऐसा ही कुछ करने की चिंता नहीं करनी चाहिए।
- **Fix transliteration:** aapko aisa hi kuchh karne ki chinta nahin karni chaahiye.
- **Confidence:** high

## SEED 107 — FIDELITY DRIFT (tense)
- **English taught:** We hoped to see what you were doing.
- **Hindi now:** हम देखना चाहते थे कि आप क्या कर रहे हैं।
- **Transliteration:** ham dekhna chaahte the ki aap kya kar rahe hain.
- **Word by word:** we / to-see / wanted / were / that / you / what / doing / **are**
- **Back-translation:** We wanted to see what you are doing.
- **What is wrong:** "कर रहे हैं" is present tense — *are doing* — where the English is *were doing*; the old Hindi had the past "कर रहे थे" and she changed it.
- **Recommended fix:** हम देखना चाहते थे कि आप क्या कर रहे थे।
- **Fix transliteration:** ham dekhna chaahte the ki aap kya kar rahe the.
- **Confidence:** high on the tense. Second, smaller point on the same line: "चाहते थे" is *wanted*, not *hoped* — that was already true before her edit, but seed 108 next door now says *hope* properly (उम्मीद), so the two are inconsistent. A fuller fix: हमें उम्मीद थी कि हम देखेंगे कि आप क्या कर रहे थे। (*hamein ummeed thi ki ham dekhenge ki aap kya kar rahe the*).

## SEED 116 — FIDELITY DRIFT (whole sentence recast)
- **English taught:** This isn't the best choice I could make.
- **Hindi now:** मैं इससे बेहतर विकल्प चुन सकता था।
- **Transliteration:** main isse behtar vikalp chun sakta tha.
- **Word by word:** I / than-this / better / choice / choose / could / was
- **Back-translation:** I could have chosen a better choice than this.
- **What is wrong:** nothing in the gloss says *this isn't the best* — the Hindi is now a positive statement about what I could have chosen, and a learner would produce "I could have made a better choice."
- **Recommended fix:** यह सबसे अच्छा विकल्प नहीं है जो मैं चुन सकता था।
- **Fix transliteration:** yah sabse achchha vikalp nahin hai jo main chun sakta tha.
- **Confidence:** high

## SEED 94 — FIDELITY DRIFT (whole sentence recast)
- **English taught:** This is the only way it will work.
- **Hindi now:** केवल इसी तरह कारगर होगा।
- **Transliteration:** keval isi tarah kaargar hoga.
- **Word by word:** only / this-very / way / effective / will-be
- **Back-translation:** Only this way will be effective.
- **What is wrong:** the gloss has no *this is … the way* frame and no subject at all — it reads "it will only work this way", which is a different English sentence.
- **Recommended fix:** यही एकमात्र तरीका है जिससे यह काम करेगा।
- **Fix transliteration:** yahi ekmaatra tareeka hai jisse yah kaam karega.
- **Confidence:** high

## SEED 115 — FIDELITY DRIFT (two changes in one line)
- **English taught:** I don't feel as if I'm ready to have a conversation.
- **Hindi now:** मुझे नहीं लगता कि मैं बात करने के लिए तैयार हूँ।
- **Transliteration:** mujhe nahin lagta ki main baat karne ke liye taiyaar hoon.
- **Word by word:** to-me / not / seems / **that** / I / talk / to-do / for / ready / am
- **Back-translation:** I don't think I'm ready to talk.
- **What is wrong:** "कि" is *that*, not *as if* — the old Hindi's "ऐसा … कि" pair that carries *as if* is gone — and "बात करने" is *to talk*, not *to have a conversation* (बातचीत).
- **Recommended fix:** मुझे ऐसा नहीं लगता कि मैं बातचीत करने के लिए तैयार हूँ।
- **Fix transliteration:** mujhe aisa nahin lagta ki main baatcheet karne ke liye taiyaar hoon.
- **Confidence:** high

## SEED 55 — FIDELITY DRIFT (past became habitual present)
- **English taught:** I don't enjoy waking up when I didn't sleep very well.
- **Hindi now:** जब अच्छी नींद नहीं आती तो मुझे जागना अच्छा नहीं लगता।
- **Transliteration:** jab achchhi neend nahin aati to mujhe jaagna achchha nahin lagta.
- **Word by word:** when / good / sleep / not / comes(habitually) / then / to-me / waking / good / not / seems
- **Back-translation:** When I don't sleep well, I don't like waking up.
- **What is wrong:** "नहीं आती" is a present habitual — *don't sleep* — where the English is past, *didn't sleep*; the old Hindi had the past "नहीं ली". *Very* has also gone.
- **Recommended fix:** जब मैंने रात को बहुत अच्छी नींद नहीं ली हो तो मुझे जागना अच्छा नहीं लगता।
- **Fix transliteration:** jab maine raat ko bahut achchhi neend nahin li ho to mujhe jaagna achchha nahin lagta.
- **Confidence:** high on the tense; medium on my exact wording — Shuchita would phrase the clause better.

## SEED 20 — FIDELITY DRIFT (a taught verb swapped)
- **English taught:** You want to learn his name quickly.
- **Hindi now:** आप उसका नाम जल्दी जानना चाहते हैं।
- **Transliteration:** aap uska naam jaldi jaanna chaahte hain.
- **Word by word:** you / his / name / quickly / to-know / want / are
- **Back-translation:** You want to know his name quickly.
- **What is wrong:** जानना is this course's prompt for *know* — it is used for *know* in seeds 85, 87, 88, 230, 231, 232, 233, 284 — while *learn* is सीखना in seeds 2, 33, 38, 73, 75, 79, 109, 224. This seed now asks for the wrong verb.
- **Recommended fix:** आप उसका नाम जल्दी सीखना चाहते हैं।
- **Fix transliteration:** aap uska naam jaldi seekhna chaahte hain.
- **Confidence:** high

## SEED 21 — FIDELITY DRIFT (same swap)
- **English taught:** Why are you learning her name?
- **Hindi now:** आप उसका नाम क्यों जान रहे हैं?
- **Transliteration:** aap uska naam kyon jaan rahe hain?
- **Word by word:** you / her / name / why / know / -ing / are
- **Back-translation:** Why are you finding out her name?
- **What is wrong:** as seed 20 — *know* where the English teaches *learn*, and seed 38 four lines later still uses सीख रहा हूँ for *learning*.
- **Recommended fix:** आप उसका नाम क्यों सीख रहे हैं?
- **Fix transliteration:** aap uska naam kyon seekh rahe hain?
- **Confidence:** high

## SEED 7 — FIDELITY DRIFT
- **English taught:** I want to try as hard as I can today.
- **Hindi now:** आज मैं अपनी पूरी कोशिश करना चाहता हूँ।
- **Transliteration:** aaj main apni poori koshish karna chaahta hoon.
- **Word by word:** today / I / my / full / effort / to-do / want / am
- **Back-translation:** Today I want to give it my full effort.
- **What is wrong:** "अपनी पूरी कोशिश" is *my best effort* — the *as … as I can* comparison the sentence exists to teach has gone; the old Hindi had "जितनी हो सके उतनी" (*as much as is possible*).
- **Recommended fix:** मैं आज जितनी हो सके उतनी कोशिश करना चाहता हूँ।
- **Fix transliteration:** main aaj jitni ho sake utni koshish karna chaahta hoon.
- **Confidence:** high that the frame is gone; medium on restoring exactly the old wording.

## SEED 26 — FIDELITY DRIFT (aspect, and a generic became a specific)
- **English taught:** I like feeling as if I'm nearly ready to go.
- **Hindi now:** मुझे यह अहसास अच्छा लग रहा है जैसे मैं जाने के लिए लगभग तैयार हूँ।
- **Transliteration:** mujhe yah ahsaas achchha lag raha hai jaise main jaane ke liye lagbhag taiyaar hoon.
- **Word by word:** to-me / **this** / feeling / good / seeming / **is-right-now** / as-if / I / to-go / for / nearly / ready / am
- **Back-translation:** I'm liking this feeling right now, as if I'm nearly ready to go.
- **What is wrong:** "लग रहा है" is the right-now progressive and "यह अहसास" is *this feeling* — the English is a general statement, *I like feeling…*, not a report about a feeling happening at this moment.
- **Recommended fix:** मुझे ऐसा महसूस करना पसंद है जैसे मैं जाने के लिए लगभग तैयार हूँ।
- **Fix transliteration:** mujhe aisa mahsoos karna pasand hai jaise main jaane ke liye lagbhag taiyaar hoon.
- **Confidence:** medium — if you want to keep her wording, changing only "लग रहा है" to "लगता है" fixes the aspect; what would settle it is whether she intended the "this feeling" reading.

## SEED 114 — FIDELITY DRIFT (the "as if" dropped)
- **English taught:** I feel as if I'm doing worse today than yesterday.
- **Hindi now:** मुझे लग रहा है कि आज मैं कल से बुरा कर रहा हूँ।
- **Transliteration:** mujhe lag raha hai ki aaj main kal se bura kar raha hoon.
- **Word by word:** to-me / seeming / is / **that** / today / I / yesterday / than / bad / doing / am
- **Back-translation:** I feel that I'm doing worse today than yesterday.
- **What is wrong:** "कि" is *that*; the "ऐसा … जैसे" pair that carries *as if* — which the old Hindi had, and which seed 26 next door still has — is gone.
- **Recommended fix:** मुझे ऐसा लग रहा है जैसे मैं आज कल से बुरा कर रहा हूँ।
- **Fix transliteration:** mujhe aisa lag raha hai jaise main aaj kal se bura kar raha hoon.
- **Confidence:** high

## SEED 106 — FIDELITY DRIFT (the "feel" dropped)
- **English taught:** We don't need to feel happy, we just need to work hard.
- **Hindi now:** हमें ख़ुश होने की ज़रूरत नहीं है, बस हमें मेहनत करनी है।
- **Transliteration:** hamein khush hone ki zaroorat nahin hai, bas hamein mehnat karni hai.
- **Word by word:** to-us / happy / **to-be** / of / need / not / is, / just / to-us / hard-work / to-do / is
- **Back-translation:** We don't need to be happy, we just need to work hard.
- **What is wrong:** "होने" is *to be*; the English teaches *to feel happy*, and the old Hindi had "महसूस करने" (*to feel*).
- **Recommended fix:** हमें ख़ुश महसूस करने की ज़रूरत नहीं है, बस हमें मेहनत करनी है।
- **Fix transliteration:** hamein khush mahsoos karne ki zaroorat nahin hai, bas hamein mehnat karni hai.
- **Confidence:** high

## SEED 25 — FIDELITY DRIFT (the "have to" dropped) — but read the note
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

# TIER 2 — small, one word each; your call

## SEED 3 — FIDELITY DRIFT (frequency became quantity)
- **English taught:** how to speak as often as possible.
- **Hindi now:** कि ज़्यादा से ज़्यादा कैसे बोलूँ।
- **Transliteration:** ki zyaada se zyaada kaise boloon.
- **Word by word:** that / more / from / more / how / I-may-speak
- **Back-translation:** …how I can speak as much as possible.
- **What is wrong:** "ज़्यादा से ज़्यादा" is a quantity, *as much as possible*; the English is a frequency, *as often as possible*, which the old Hindi had as "जितनी बार हो सके" (*as many times as possible*).
- **Recommended fix:** कि ज़्यादा से ज़्यादा बार कैसे बोलूँ।
- **Fix transliteration:** ki zyaada se zyaada baar kaise boloon.
- **Confidence:** medium — adding बार (*times*) restores the frequency; Shuchita should say whether it reads naturally here.

## SEED 27 — FIDELITY DRIFT (quantifier)
- **English taught:** I don't like taking too much time to answer.
- **Hindi now:** मुझे जवाब देने में बहुत समय लगाना पसंद नहीं है।
- **Transliteration:** mujhe javaab dene mein bahut samay lagaana pasand nahin hai.
- **Word by word:** to-me / answer / giving / in / much / time / to-spend / liked / not / is
- **Back-translation:** I don't like spending a lot of time answering.
- **What is wrong:** "बहुत" alone is *a lot*; *too much* is "बहुत ज़्यादा", which the old Hindi had.
- **Recommended fix:** मुझे जवाब देने में बहुत ज़्यादा समय लगाना पसंद नहीं है।
- **Fix transliteration:** mujhe javaab dene mein bahut zyaada samay lagaana pasand nahin hai.
- **Confidence:** high (small)

## SEED 88 — FIDELITY DRIFT (the "yet" dropped)
- **English taught:** I'm not ready to talk to people I don't know yet.
- **Hindi now:** मैं अभी उन लोगों से बात करने के लिए तैयार नहीं हूँ जिन्हें मैं नहीं जानता।
- **Transliteration:** main abhi un logon se baat karne ke liye taiyaar nahin hoon jinhen main nahin jaanta.
- **Word by word:** I / **now** / those / people / with / talk / to-do / for / ready / not / am / whom / I / not / know
- **Back-translation:** Right now I'm not ready to talk to people I don't know.
- **What is wrong:** "अभी" is *right now*; *yet / so far* is "अभी तक", which the old Hindi had and which seed 60 still uses.
- **Recommended fix:** मैं अभी तक उन लोगों से बात करने के लिए तैयार नहीं हूँ जिन्हें मैं नहीं जानता।
- **Fix transliteration:** main abhi tak un logon se baat karne ke liye taiyaar nahin hoon jinhen main nahin jaanta.
- **Confidence:** high (small)

## SEED 76 — FIDELITY DRIFT (the "already" dropped)
- **English taught:** I'm very happy with how much I've learnt already.
- **Hindi now:** मैं इस बात से बहुत ख़ुश हूँ कि मैं कितना सीख चुका हूँ।
- **Transliteration:** main is baat se bahut khush hoon ki main kitna seekh chuka hoon.
- **Word by word:** I / this / matter / from / very / happy / am / that / I / how-much / learn / have-completed / am
- **Back-translation:** I'm very happy with how much I have learnt.
- **What is wrong:** the explicit "पहले ही" (*already*) that the old Hindi had is gone; "चुका हूँ" carries completion but not the word *already* — and seed 244 in the same course still says "पहले ही … सीख चुका हूँ" for *I've learnt a lot already*.
- **Recommended fix:** मैं इस बात से बहुत ख़ुश हूँ कि मैं पहले ही कितना सीख चुका हूँ।
- **Fix transliteration:** main is baat se bahut khush hoon ki main pahle hi kitna seekh chuka hoon.
- **Confidence:** medium — "चुका हूँ" may be enough on its own; the argument for restoring it is consistency with seed 244.

## SEED 58 — FIDELITY DRIFT ("is" became "becomes")
- **English taught:** It's interesting when you understand enough words.
- **Hindi now:** जब आप काफ़ी शब्द समझ लेते हैं, तो यह दिलचस्प हो जाता है।
- **Transliteration:** jab aap kaafi shabd samajh lete hain, to yah dilchasp ho jaata hai.
- **Word by word:** when / you / enough / words / understand / take / are, / then / this / interesting / **become** / goes / is
- **Back-translation:** When you understand enough words, it becomes interesting.
- **What is wrong:** "हो जाता है" is *becomes*; the English is *it's interesting*.
- **Recommended fix:** यह दिलचस्प होता है जब आप काफ़ी शब्द समझ लेते हैं।
- **Fix transliteration:** yah dilchasp hota hai jab aap kaafi shabd samajh lete hain.
- **Confidence:** medium

## SEED 103 — FIDELITY DRIFT (quantifier)
- **English taught:** We're not trying to hear many more words.
- **Hindi now:** हम और ज़्यादा शब्द सुनने की कोशिश नहीं कर रहे हैं।
- **Transliteration:** ham aur zyaada shabd sunne ki koshish nahin kar rahe hain.
- **Word by word:** we / more / much / words / to-hear / of / effort / not / doing / are
- **Back-translation:** We're not trying to hear more words.
- **What is wrong:** "और ज़्यादा" is *more*; the English is *many more*. (In fairness the old Hindi's "बहुत और" was broken Hindi — this is a repair that lost a word rather than a careless edit.)
- **Recommended fix:** हम बहुत सारे और शब्द सुनने की कोशिश नहीं कर रहे हैं।
- **Fix transliteration:** ham bahut saare aur shabd sunne ki koshish nahin kar rahe hain.
- **Confidence:** medium — Shuchita should pick the natural Hindi for *many more*.

## SEED 29 — FIDELITY DRIFT
- **English taught:** I'm looking forward to speaking better as soon as I can.
- **Hindi now:** मैं जल्दी से जल्दी बेहतर बोल पाने के लिए उत्सुक हूँ।
- **Transliteration:** main jaldi se jaldi behtar bol paane ke liye utsuk hoon.
- **Word by word:** I / quickly / from / quickly / better / speak / **being-able** / for / **eager** / am
- **Back-translation:** I'm eager to be able to speak better as soon as possible.
- **What is wrong:** "उत्सुक" is *eager/keen* and "बोल पाने" adds *be able to*, which the English doesn't have; the old Hindi's "इंतज़ार कर रहा हूँ" is the standard *looking forward to*.
- **Recommended fix:** मैं जल्दी से जल्दी बेहतर बोलने का इंतज़ार कर रहा हूँ।
- **Fix transliteration:** main jaldi se jaldi behtar bolne ka intezaar kar raha hoon.
- **Confidence:** medium — "उत्सुक हूँ" is arguably an idiomatic *looking forward to*; what would settle it is Shuchita's ear.

## SEED 1 — FIDELITY DRIFT (speak → talk), and it's the course's first line
- **English taught:** I want to speak English with you now.
- **Hindi now:** मैं अब आपके साथ अंग्रेज़ी में बात करना चाहता हूँ।
- **Transliteration:** main ab aapke saath angrezi mein baat karna chaahta hoon.
- **Word by word:** I / now / your / with / English / **in** / **talk** / to-do / want / am
- **Back-translation:** I want to talk with you in English now.
- **What is wrong:** "बात करना" is *to talk / have a conversation* and "अंग्रेज़ी में" is *in English* — the English taught is *speak English*, which the old Hindi had as "अंग्रेज़ी बोलना".
- **Recommended fix:** मैं अब आपके साथ अंग्रेज़ी बोलना चाहता हूँ।
- **Fix transliteration:** main ab aapke saath angrezi bolna chaahta hoon.
- **Confidence:** medium — her Hindi is the more natural sentence, and she made the same swap at seed 5 while swapping the *other* way at seeds 23 and 28 (*talking* → बोलना). The inconsistency is the reason to look, more than this one line.

## SEED 61 — FIDELITY DRIFT (that → this)
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

# NEW ERROR

## SEED 119 — NEW ERROR (the question particle is missing)
- **English taught:** Can I ask you something before you leave?
- **Hindi now:** आपके जाने से पहले मैं आपसे कुछ पूछ सकता हूँ?
- **Transliteration:** aapke jaane se pahle main aapse kuchh poochh sakta hoon?
- **Word by word:** your / going / from / before / I / you-from / something / ask / can / am?
- **Back-translation:** Before you leave, I can ask you something? — a statement with a question mark on it.
- **What is wrong:** क्या, the particle that opens every other yes/no question in this course (seeds 25, 63, 75, 271, 284 all begin with it), has been dropped, and the old Hindi had it — so on the page only the question mark marks this as a question, and in the recorded prompt there is nothing marking it at all.
- **Recommended fix:** क्या मैं आपके जाने से पहले आपसे कुछ पूछ सकता हूँ?
- **Fix transliteration:** kya main aapke jaane se pahle aapse kuchh poochh sakta hoon?
- **Confidence:** high. Note again: her edit to this seed **fixed** the missing subject that the brief flagged as the worst drift on the estate.

---

# ZUT RISK

## SEED 115 (with 10 and 62) — ZUT RISK: one prompt, four different English sentences
- **Hindi now:** मुझे नहीं लगता कि …
- **Transliteration:** mujhe nahin lagta ki …
- **Word by word:** to-me / not / seems / that …
- **What is wrong:** after her pass, this exact prompt opening now stands in front of **four different English answers** in the same course:
  - seed 10 — *I'm not sure if I can remember the whole sentence.*
  - seed 62 — *I'm not sure if I can help you at the same time.*
  - seed 115 — *I don't feel as if I'm ready to have a conversation.*
  - seeds 326, 336 — *I don't think that she needs to sell the company.* / *I don't think that she can open the door.*
  A learner meeting मुझे नहीं लगता कि has no way to know which of *I'm not sure*, *I don't feel as if*, or *I don't think* is wanted.
- **Recommended fix:** reserve मुझे नहीं लगता for *I don't think* (326, 336 — correct as they stand); move 10 and 62 to मुझे यकीन नहीं है, and 115 to मुझे ऐसा नहीं लगता … as above.
- **Fix transliteration:** mujhe nahin lagta = "I don't think" only; mujhe yaqeen nahin hai = "I'm not sure"; mujhe aisa nahin lagta … jaise = "I don't feel as if".
- **Confidence:** high — the four English sentences are quoted straight from the live seed rows.

## SEED 51 — ZUT RISK: "like" and "enjoy" now share a prompt
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

# One class I deliberately did not report

Seeds **5, 8, 25 and 82** all turn an English *going to* future into a plain Hindi future
(करूँगा / करेंगे) where the old Hindi had the periphrastic "वाला हूँ". That is the fused-future
class you already ruled on (`docs/hindi-tier-c-2026-09-01/tier-c-rulings-applied-2026-09-01.md`),
and seeds 5 and 25 are the two the ruling explicitly taught. I've left it alone. The separate
faults on 25 (*have to*) and 82 (*Why not?*) are reported above and are not part of that class.

---

# Summary

- **Rows read: 84 of 84.** Every row read individually against its English and its old Hindi.
- **Fidelity drift: 28** — 19 Tier 1 (materially different English), 9 Tier 2 (one word or modifier).
- **New errors: 1** (seed 119, missing क्या). No doubled words and no missing postpositions in
  this shard — I checked mechanically as well as by reading. The known specimens of that class
  (seeds 143 and 641) are outside seeds 1–123.
- **ZUT risks: 2**, both proved by quoting other live seeds rather than by assertion.
- **Clean: 54 rows** — nukta and hyphenation spelling fixes, clause reordering, register repairs.
  She is right far more often than she is wrong.

**More, not fewer, than the brief expected** — 28 against an implied ~4 for a shard this size.
The gap is entirely the Tier 2 tail: single dropped modifiers (*yet*, *already*, *too much*,
*many more*). If you only want sentences that now ask for a different English sentence, read
Tier 1 and stop; that's 19, and it's still above the brief's expectation, which I think is the
real finding — the fidelity drift in this range is denser than the estate-wide estimate.

**Where I want Shuchita's eye**, honestly:
- **Seed 25** — my fix ("इससे पहले कि मुझे जाना पड़े") carries *have to* correctly but splits the
  clause; she'd phrase a prompt better.
- **Seed 3** — adding बार restores *as often as*, but I'm not certain it reads naturally.
- **Seed 103** — the natural Hindi for *many more*.
- **Seed 29** — whether "उत्सुक हूँ" is already a fair *looking forward to*. If she says yes,
  drop it.
- **Seed 1** — she may have a reason for बात करना at seed 1 that I can't see; but if so, seeds
  23 and 28 need to move the same way, because right now the mapping runs in both directions.
- **Seed 76** — whether "चुका हूँ" alone is enough for *already*.
