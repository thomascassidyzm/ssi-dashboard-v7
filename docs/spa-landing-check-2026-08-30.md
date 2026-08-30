# The landing check: 4 phrases, not 2,869

*30 August 2026 — a new check, built and run. Measurement only: no course content repaired, no audio queued, the live validator untouched.*

## The honest number

**Four phrases out of 15,205 in the live Spanish course would derail a learner. 0.03%.** The census published this morning said 2,869 phrases, 18.9%.

## What the check now asks

**Once the model voices say it correctly, does the learner go "yes, ok, that's it" — or "sorry, what???"**

That is the whole test, and it is a different test from the one being replaced. The learner is never required to succeed at producing the phrase: they attempt, then they hear the model answer. So a phrase that is a slight reach is fine, and often good. The only genuine defect is the **derailment** — the model voice says something the learner has no hook for at all, and they lose the thread. This is a landing check, not a coverage audit.

## The ladder, so the delta is visible

| what is being asked | phrases | share |
|---|---|---|
| the census as published — "was this exact string handed over as a taught unit?" | 2,869 | 18.9% |
| the landing check's mechanical stage, **without** crediting pods | 263 | 1.7% |
| the landing check's mechanical stage, **crediting pods** | 199 | 1.3% |
| **judged genuine derailments** | **4** | **0.03%** |

Crediting the pods clears 64 phrases on its own. The mechanical stage clears the other 2,606 by asking a different question, and judgement clears 195 of the 199 that survive it — because a reach is not a defect.

## The three things the old check got wrong, and what replaces each

**It asked a delivery question.** "Was this exact string handed over as a taught unit?" Extraction now counts. The new check looks for three kinds of contrast among material the learner already holds — a fused pair sharing an affix, two chunks differing in exactly one slot, and one chunk that is another minus a word — with the English side required to corroborate, so an accidental Spanish overlap cannot manufacture a false acquisition. Nothing about `con` is written into it anywhere. Handed the first forty seeds of the real course and nothing else, it reaches `con` on its own, out of *contigo* and *conmigo*. That is a committed self-test that fails the build if it ever stops being true.

**It ignored the pods.** Pods are scheduled into the main flow, so the default learner has met them. Pod exposure now counts as taught, in full, on the live schedule read from the running configuration: the first lap fires at round 6, another every 5 rounds, one new sentence per lap in order. Spanish serves a 231-sentence pod, so its last sentence is in play by round 1,156 of 1,339. Per the ruling, every pod sentence with text counts as heard; audio presence is not a gate.

**It counted tokens.** The unit is now the phrase. A phrase is not spoilt because one word is unattributable; the question is whether the whole thing lands.

The hard-coded exemption for Spanish glue — `con`, `de`, `la`, `me`, `te`, `por`, `para`, `que` — is gone, not carried forward. It was an assumption nobody ruled and it is precisely what hid `con`. The landing test replaces the need for it.

## How the two halves are kept apart

**The mechanical half is cheap and deterministic.** It grades every word of every phrase for hook strength: covered by a taught chunk; standing as its own word inside a taught chunk or inside a pod sentence already heard; isolated by contrast; only a related form available; or nothing at all. It can prove a learner **has** a hook. It can never prove they have none — so anything it cannot clear is a **shortlist**, never a verdict. On Spanish that is 199 phrases from 15,205, carrying 92 distinct words.

**The judging half rules on the shortlist**, phrase by phrase, against the bar quoted above, with the evidence in front of it: where the learner is in the course, what they are being taught in that round, the English prompt, the model answer, and — for each unhooked word — whether it appears earlier, later, or nowhere at all, plus the nearest Spanish they do hold. A matcher cannot rule on whether something lands, and the code says so rather than pretending.

Of the 199 shortlisted, 133 word-flags are material the course teaches only **later** (an ordering question), 69 are material that appears **nowhere in the course at all**, and 6 stand earlier but were missed by the tiling. 167 of the 199 are USE phrases, 32 are BUILD.

## The four derailments

**Round 160 — "I am not sure I can help you at the same time as doing this" → "No estoy seguro de si puedo ayudarte al mismo tiempo que hago esto."** The prompt's "as doing this" sends the learner to *haciendo esto*; the answer comes back with the finite *que hago esto*, a conjugated form they have not met and cannot match to "doing", at the tail of an already long sentence.

**Round 280 — "I think it is very unusual that you do not like to speak more with us" → "Pienso que es muy raro que no te guste hablar más con nosotros aquí."** Not *nosotros*, which lands. The answer ends with **aquí**, which the English never asked for. A learner who gets it entirely right hears an extra word and concludes they were wrong.

**Round 571 — "It is important that you tell me before you go" → "Es importante que me lo digas antes de que te vayas."** The whole point of the prompt — "tell me" — arrives as *me lo digas*, on a stem the learner has never met in any form. The only recognisable part is the trailing chunk.

**Round 630 — "I hope he knows the answer because I do not know what to do" → "Espero que él sepa la respuesta porque yo no sé qué hacer."** They will have attempted *sabe* and hear *sepa*, which carries the point of the clause and reads as a different verb rather than a variant.

Three are USE phrases, one is a BUILD phrase. Two are subjunctives of verbs the learner only holds in the indicative; one is a tense the prompt does not signal; one is an answer that says more than the prompt asked.

## The sample — 36 judged phrases, so the taste can be checked

Every derailment above, then the hardest thirty-two that were judged to LAND, one per distinct piece of unhooked material, hardest first. These are the borderline cases on purpose: if the taste here is wrong, it is wrong in the direction of letting things through, and this is where that would show.

### DERAILS — round 160 of 1,339 (USE)

**Prompt:** I am not sure I can help you at the same time as doing this  
**Model answer:** No estoy seguro de si puedo ayudarte al mismo tiempo que hago esto  
**Unhooked:** hago — nothing available resembles it; taught only LATER, round 445, in "hago" · esto — shorter_form_of_available_word: estoy; taught only LATER, round 208, in "esto"

The prompt's "as doing this" leads the learner to attempt "haciendo esto", but the model answers with the finite "que hago esto" — a conjugated form they have never met and cannot match to "doing", stacked with "esto" at the tail of an already long sentence, so the ending reads as a different sentence from the one they tried.

### DERAILS — round 280 of 1,339 (USE)

**Prompt:** I think it is very unusual that you do not like to speak more with us  
**Model answer:** Pienso que es muy raro que no te guste hablar más con nosotros aquí  
**Unhooked:** nosotros — nothing available resembles it; taught only LATER, round 598, in "venir con nosotros"

Not because of "nosotros", which lands as in items 1-2, but because the answer ends with "aquí" that the English prompt never asked for — the learner's fully correct attempt comes back with an extra word they have no prompt hook for, and they hear their own answer as wrong.

### DERAILS — round 571 of 1,339 (BUILD)

**Prompt:** It is important that you tell me before you go  
**Model answer:** Es importante que me lo digas antes de que te vayas  
**Unhooked:** digas — nothing available resembles it; taught only LATER, round 1128, in "cada palabra que digas"

The whole point of the prompt — "tell me" — arrives as "me lo digas", a stem (dig-) the learner has never met in any form, so the one clause they most need to map has no anchor and the taught chunk "antes de que te vayas" is all they can recognise.

### DERAILS — round 630 of 1,339 (USE)

**Prompt:** I hope he knows the answer because I do not know what to do  
**Model answer:** Espero que él sepa la respuesta porque yo no sé qué hacer  
**Unhooked:** sepa — nothing available resembles it; appears nowhere else in the course, in any chunk

The learner will have attempted "sabe" and hears "sepa" — a stem they have never met and cannot see as a form of anything they hold (the "sé" later in the same sentence doesn't bridge it), and it carries the whole point of the clause, so it registers as a different verb rather than a variant.

### LANDS — round 430 of 1,339 (USE)

**Prompt:** The doctor said I have to take my mother to see him every week  
**Model answer:** El médico dijo que tengo que llevar a mi madre a verlo todas las semanas  
**Unhooked:** verlo — nothing available resembles it; appears nowhere else in the course, in any chunk · todas — available_word_plus_ending: toda; taught only LATER, round 708, in "todas las respuestas" · semanas — available_word_plus_ending: semana; appears nowhere else in the course, in any chunk

Long, but each flagged piece is a transparent variant of something they hold ("ver"+"lo", "toda"→"todas", "semana"→"semanas"), and "todas las semanas" arrives in tail position pinned by "every week", so nothing displaces the core of the sentence.

### LANDS — round 249 of 1,339 (USE)

**Prompt:** I think we are doing very well and I feel happy about what we are learning together  
**Model answer:** Pienso que lo estamos haciendo muy bien y me siento contento con lo que aprendemos juntos  
**Unhooked:** aprendemos — shares_stem_with_available_word: aprender; taught only LATER, round 253, in "cuando aprendemos" · juntos — nothing available resembles it; taught only LATER, round 319, in "trabajando juntos"

*aprendemos* is transparently their *aprender*/*aprendiendo* in the -emos ending they've had since *tenemos*/*somos*, and *juntos* is again the pinned final "together", so the two unhooked items are one recognisable variant plus one tail word rather than a stack that hides the sentence.

### LANDS — round 318 of 1,339 (USE)

**Prompt:** When you get to know someone new it can be less exciting than what you thought  
**Model answer:** Cuando llegas a conocer a alguien nuevo puede ser menos emocionante que lo que pensaste  
**Unhooked:** ser — nothing available resembles it; taught only LATER, round 332, in "que ser perfecto" · pensaste — shares_stem_with_available_word: pensar; taught only LATER, round 1281, in "pensaste que era"

Both reaches are transparent: "puede ser" for "it can be" sits in a shape they know and echoes their "sería", and "pensaste" wears the visible pens- stem with "what you thought" fixing the person, so neither steals the core of the sentence.

### LANDS — round 184 of 1,339 (BUILD)

**Prompt:** I have already learned  
**Model answer:** Ya he aprendido  
**Unhooked:** ya — nothing available resembles it; stands in "ya" from round 184

"Ya" is a two-letter function word in initial position with everything else in the phrase already taught, so the only leftover English word ("already") maps onto the only leftover Spanish word — no ambiguity about what it answers to.

### LANDS — round 194 of 1,339 (BUILD)

**Prompt:** I am in agreement with what you said about  
**Model answer:** Estoy de acuerdo con lo que dijiste sobre  
**Unhooked:** sobre — nothing available resembles it; taught only LATER, round 195, in "sobre tu amigo"

The fragment ends on "sobre" precisely where the English fragment ends on "about", and it is the sole unknown in a sentence whose whole spine ("Estoy de acuerdo con lo que dijiste") they have — a one-word, position-pinned gap one round before it is formally taught.

### LANDS — round 251 of 1,339 (USE)

**Prompt:** It changes what it's like to speak a new language with people  
**Model answer:** Cambia lo que es hablar un nuevo idioma con personas  
**Unhooked:** nuevo — nothing available resembles it; taught only LATER, round 252, in "algo nuevo"

They already have `nuevas`, so `un nuevo idioma` is heard as the masculine singular of a word they hold, and the prompt's "a new language" pins it exactly — one visible ending swap, nothing else unhooked.

### LANDS — round 254 of 1,339 (BUILD)

**Prompt:** I thought that was very interesting  
**Model answer:** Pensé que eso fue muy interesante  
**Unhooked:** pensé — nothing available resembles it; taught only LATER, round 289, in "pensé"

`Pensé` opens the sentence but the `pens-` stem is one they already have from `pensar`/`pensando` and the prompt's "I thought" pins the person and tense; a learner at round 254 hears "think-something, I did" and stays on the thread even if they said `pensaba` or `pensar` themselves.

### LANDS — round 247 of 1,339 (USE)

**Prompt:** She said we have to stop worrying and just try to enjoy speaking Spanish every day  
**Model answer:** Ella dijo que tenemos que dejar de preocuparnos y solo intentar disfrutar hablando español todos los días  
**Unhooked:** preocuparnos — shares_stem_with_available_word: preocupo; appears nowhere else in the course, in any chunk · disfrutar — shares_stem_with_available_word: disfruto; appears nowhere else in the course, in any chunk

At round 247 they already have *preocuparte*, *preocupo*, *disfruto* and *disfrutando*, so *preocuparnos* is just the -te they know swapped for the -nos that "we have to" (tenemos) has just drilled, and *disfrutar* is the bare infinitive of a verb the prompt pins as "enjoy" — long sentence, but nothing in it is opaque.

### LANDS — round 249 of 1,339 (BUILD)

**Prompt:** We are people who are learning together  
**Model answer:** Somos personas que estamos aprendiendo juntos  
**Unhooked:** juntos — nothing available resembles it; taught only LATER, round 319, in "trabajando juntos"

*juntos* is the only unknown, it sits last, the rest of the sentence (*Somos personas que estamos aprendiendo*) is exactly what they attempted, and the prompt's "together" pins it — a single tail-position modifier they can absorb from the whole, not the core of the sentence.

### LANDS — round 264 of 1,339 (USE)

**Prompt:** I think I could make this work better if I try to practise more  
**Model answer:** Pienso que podría hacer que esto funcione mejor si intento practicar más  
**Unhooked:** funcione — shares_stem_with_available_word: funcionar; appears nowhere else in the course, in any chunk · intento — shares_stem_with_available_word: intentando; appears nowhere else in the course, in any chunk

Both unknowns are transparent forms of verbs this learner already has (funcionar/funcionando, intentar/intentando) sitting in slots the English prompt pins exactly — "make this work" and "if I try" — so the answer maps cleanly even though two words are new.

### LANDS — round 278 of 1,339 (BUILD)

**Prompt:** It is interesting that you like to go by bus with us  
**Model answer:** Es interesante que te guste ir en autobús con nosotros  
**Unhooked:** nosotros — nothing available resembles it; taught only LATER, round 598, in "venir con nosotros"

Everything but the last word is the taught chunk verbatim, so the single genuinely new item is a tail-position pronoun pinned exactly by "with us" — the learner hears it, recognises what it must be, and keeps the thread.

### LANDS — round 323 of 1,339 (USE)

**Prompt:** I do not know if what she was saying about working with them is going to be useful  
**Model answer:** No sé si lo que ella estaba diciendo sobre trabajar con ellos va a ser útil  
**Unhooked:** ser — nothing available resembles it; taught only LATER, round 332, in "que ser perfecto"

They already have `sería` and the "va a + infinitive" shape, so `ser` arrives in the one slot the prompt marks as "be" and reads as the plain form of a verb they recognise.

### LANDS — round 445 of 1,339 (USE)

**Prompt:** I do not always do it the best way but I know I am learning  
**Model answer:** No siempre lo hago de la mejor manera pero sé que estoy aprendiendo  
**Unhooked:** siempre — nothing available resembles it; taught only LATER, round 1146, in "siempre que te sientas"

Every other word of "No siempre lo hago de la mejor manera pero sé que estoy aprendiendo" is theirs, leaving one unknown sitting in precisely the "not always" slot the English hands them — absorbable from the whole rather than carrying it.

### LANDS — round 439 of 1,339 (BUILD)

**Prompt:** You left your keys  
**Model answer:** Dejaste tus llaves  
**Unhooked:** tus — nothing available resembles it; taught only LATER, round 617, in "tus amigos"

The only thing under test is "dejaste"; "tus" is a one-syllable possessive sitting where the prompt says "your", with "llaves" known — a small function word absorbed from the whole, not a derailment.

### LANDS — round 453 of 1,339 (BUILD)

**Prompt:** The money that I left  
**Model answer:** El dinero que dejé  
**Unhooked:** dejé — nothing available resembles it; taught only LATER, round 454, in "que dejé en la mesa"

With "dejar" and "dejaste" already in hand and the prompt saying "that I left", "dejé" is transparently the same verb with a first-person past ending, and it's taught one round later anyway.

### LANDS — round 455 of 1,339 (BUILD)

**Prompt:** Have you heard that story?  
**Model answer:** ¿Has oído esa historia?  
**Unhooked:** esa — nothing available resembles it; taught only LATER, round 533, in "esa mujer"

They already have "esas", so "esa" is just its singular, and the prompt's "that story" pins which English word it answers to.

### LANDS — round 465 of 1,339 (USE)

**Prompt:** They say we need to make sure that everything is ready before we start  
**Model answer:** Dicen que necesitamos asegurarnos de que todo esté listo antes de empezar  
**Unhooked:** asegurarnos — shares_stem_with_available_word: asegurarse; appears nowhere else in the course, in any chunk · esté — accent_or_diacritic_variant: este; taught only LATER, round 929, in "puede que esté allí"

"asegurarnos" is the taught chunk with the clitic swapped to match "we need to", and "esté" sits next to the "estés" they already have with the prompt's "everything is ready" pinning it — two transparent variants, not two unknowns.

### LANDS — round 517 of 1,339 (USE)

**Prompt:** I would like to read my book for a while before going to sleep  
**Model answer:** Me gustaría leer mi libro por un rato antes de irme a dormir  
**Unhooked:** dormir — nothing available resembles it; taught only LATER, round 1029, in "dormir"

They already met "dormí" and the prompt says "before going to sleep", so "a dormir" reads transparently as the infinitive of a word they have, in a tail slot the English fully predicts.

### LANDS — round 552 of 1,339 (USE)

**Prompt:** My mother wanted to see you this afternoon but she couldn't  
**Model answer:** Mi madre quería verte esta tarde pero no pudo  
**Unhooked:** pudo — nothing available resembles it; appears nowhere else in the course, in any chunk

"pudo" is the third-person of "pude", which they already have, and the prompt's "but she couldn't" pins it exactly in the final slot — a person-ending swap, not new material.

### LANDS — round 576 of 1,339 (BUILD)

**Prompt:** Just give me a little time and I should be ready in a few minutes  
**Model answer:** Dame un poco de tiempo y debería estar listo en unos minutos  
**Unhooked:** dame — nothing available resembles it; appears nowhere else in the course, in any chunk

"Dame" sits sentence-initially where the prompt says "give me", the rest of the answer ("un poco de tiempo", "debería estar listo en unos minutos") is fully theirs, so the one unhooked word is pinned by elimination rather than swallowing the sentence.

### LANDS — round 567 of 1,339 (USE)

**Prompt:** It was fairly difficult at first but afterwards it became much easier  
**Model answer:** Al principio fue bastante difícil pero después fue mucho más fácil  
**Unhooked:** principio — nothing available resembles it; appears nowhere else in the course, in any chunk

Every other piece of the answer is accounted for, so the one leftover chunk "al principio" maps by elimination onto the one leftover English phrase "at first", helped by the principal/principle cognate route — the fronting is a shape they can hear, not a sentence they'd mistake for another.

### LANDS — round 618 of 1,339 (USE)

**Prompt:** My friends speak Spanish a lot among themselves  
**Model answer:** Mis amigos hablan español mucho entre ellos  
**Unhooked:** entre — nothing available resembles it; taught only LATER, round 839, in "entre ellos"

The core of the sentence ("mis amigos hablan español mucho") is all theirs, and "entre" is a one-syllable preposition sitting in the slot the prompt's "among" already marked out, with "ellos" known.

### LANDS — round 650 of 1,339 (USE)

**Prompt:** I know she seems unfriendly but she is actually very kind  
**Model answer:** Sé que parece antipática pero en realidad es muy amable  
**Unhooked:** realidad — nothing available resembles it; appears nowhere else in the course, in any chunk

"en realidad" is a transparent near-cognate of "in reality" sitting exactly where "actually" sits in the prompt, and the rest of the sentence (Sé que parece… pero es muy amable) is already theirs, so the only new material is a two-word adverbial they can read off the English.

### LANDS — round 734 of 1,339 (USE)

**Prompt:** I think she's not ready to leave yet  
**Model answer:** pienso que ella no está lista para irse todavía  
**Unhooked:** lista — nothing available resembles it; appears nowhere else in the course, in any chunk

They already have "listo"; "lista" is the same word agreeing with "ella", which the prompt's "she" makes obvious — a visible gender variant, not new material.

### LANDS — round 943 of 1,339 (USE)

**Prompt:** I want to know about what happened during the war  
**Model answer:** quiero saber lo que pasó durante la guerra  
**Unhooked:** pasó — nothing available resembles it; taught only LATER, round 1201, in "lo que pasó"

"pasó" is a transparent form of pasar, which they have alongside pasado and pasaste, and "lo que pasó" answers directly to "what happened" in the prompt, so it reads as a familiar verb in a new tense rather than an unrecognisable word.

### LANDS — round 1117 of 1,339 (USE)

**Prompt:** I'm supposed to keep it before selling it  
**Model answer:** se supone que debo guardarlo antes de venderlo  
**Unhooked:** guardarlo — available_word_plus_ending: guardar; appears nowhere else in the course, in any chunk · venderlo — available_word_plus_ending: vender; appears nowhere else in the course, in any chunk

Two new surfaces but one mechanism, and "keep it before selling it" maps each -lo onto its own English "it", so venderlo lands off vender the same way guardarlo lands off guardar.

### LANDS — round 1093 of 1,339 (USE)

**Prompt:** having exactly this much  
**Model answer:** teniendo exactamente esta cantidad  
**Unhooked:** cantidad — nothing available resembles it; appears nowhere else in the course, in any chunk

Everything but the final noun is known or being taught, and "cantidad" sits in the slot the prompt's "this much" pins, with enough of "quantity" in it to be recognised rather than heard as a different sentence.

### LANDS — round 122 of 1,339 (USE)

**Prompt:** I was starting to explain it last night  
**Model answer:** Estaba empezando a explicarlo anoche  
**Unhooked:** explicarlo — available_word_plus_ending: explicar; appears nowhere else in the course, in any chunk

The learner already has "explicar" and the prompt says "explain it", so the tacked-on "-lo" is a transparent clitic extension of a verb they know rather than new material carrying the sentence.

### LANDS — round 137 of 1,339 (BUILD)

**Prompt:** I enjoy doing this here  
**Model answer:** Disfruto haciendo esto aquí  
**Unhooked:** esto — shorter_form_of_available_word: estoy; taught only LATER, round 208, in "esto"

"esto" is a one-vowel variant of the "esta" they already have, and the prompt's "this" pins it exactly in a sentence shape ("Disfruto haciendo … aquí") they were just given.

### LANDS — round 137 of 1,339 (USE)

**Prompt:** I enjoy doing something interesting with you  
**Model answer:** Disfruto haciendo algo interesante contigo  
**Unhooked:** interesante — shares_stem_with_available_word: interrumpir; taught only LATER, round 149, in "interesante"

"interesante" is a near-transparent cognate of the prompt's "interesting" sitting in the slot the English predicts; the flagged stem-match to "interrumpir" is a red herring.

### LANDS — round 161 of 1,339 (USE)

**Prompt:** I am asking again if you are sure you don't mind helping me today  
**Model answer:** Pregunto otra vez si estás seguro de que no te importa ayudarme hoy  
**Unhooked:** pregunto — shares_stem_with_available_word: preguntar; taught only LATER, round 627, in "me pregunto"

By round 161 the -o "I" ending is thoroughly drilled (they say "quiero" in the neighbouring item), and "pregunto" is visibly "preguntar" minus the infinitive, sitting exactly where the prompt says "I am asking".

### LANDS — round 165 of 1,339 (BUILD)

**Prompt:** I enjoy testing myself  
**Model answer:** Disfruto de ponerme a prueba  
**Unhooked:** ponerme — available_word_plus_ending: poner; appears nowhere else in the course, in any chunk

They have both "poner" and "ponerte", and the te→me swap is the same clitic move they just did with ayudarte/ayudarme, so "ponerme" reads straight off "testing myself".

## Gaps and limits, stated

- **The judgement is one model's taste, one pass, not adversarially re-judged.** The sample above is the calibration; if the taste is off, it is off in the permissive direction, since 195 of 199 were let through.
- **The mechanical stage can only shortlist on unhooked *material*.** A phrase where every word has a hook but the phrase as a whole is wrong will never reach judgement. The round-280 derailment — an answer carrying a word the prompt never asked for — was found only because a different word in it happened to be flagged. That class of defect exists, this check does not systematically hunt it, and a known-side-versus-target check is the right tool for it.
- **Legos marked as re-introductions do not advance the round count**, and their material is credited only from the point the walk reaches them. One real ordering fault surfaced this way: *ya* is used in seed 76's phrases and marked there as already introduced, but its genuine first introduction as a new lego is seed 145.
- **Only the served core pod is credited** — the one the player itself resolves, 231 sentences for Spanish. The optional choice pods (music, travel situations) are not credited to a default learner, because the player does not schedule them into the main flow.
- **Spanish only.** The design is language-agnostic — no Spanish word list anywhere in it — but running it on the other courses is a separate measurement that has not been done.
- The check is read-only throughout: no course content was repaired, no audio queued, the live validator untouched.
