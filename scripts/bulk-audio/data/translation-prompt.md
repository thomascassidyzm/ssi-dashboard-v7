# Translation Task: SSi Encouragement Messages

## What you're translating

These are spoken encouragement messages played to language learners via a learning app. They're warm, conversational, supportive - like a friendly coach giving a pep talk during a break. The speaker (Aran Jones) uses informal/familiar "you" (tu/tú/du, NOT vous/usted/Sie).

## Critical rules

1. **Use informal/familiar "you"** (tu, tú, du, ty, etc.) - never formal
2. **Where the English says "English"** (e.g., "learn English", "speak English"), translate as **"your new language"** or equivalent - do NOT use the specific language name
3. **Keep the conversational, warm tone** - contractions, dashes, casual phrasing
4. **Preserve meaning, not word-for-word** - natural-sounding translations
5. **Do NOT translate proper nouns** like "SaySomethingin", "The Zone", "the Noticing Mind" - keep these in English or translate the concept naturally if the term is explained in context

## Output format

Return a JSON object. The structure must be exactly:

```json
{
  "LANG_CODE": {
    "ordered": {
      "33": "translated text...",
      "34": "translated text...",
      "35": "translated text...",
      "36": "translated text..."
    },
    "pooled": {
      "14": "translated text...",
      "20": "translated text...",
      "21": "translated text...",
      ...
      "49": "translated text..."
    }
  },
  "NEXT_LANG_CODE": { ... }
}
```

The keys under "ordered" are position numbers (33, 34, 35, 36).
The keys under "pooled" are array indices (14, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49).

## Source texts

### ORDERED (4 items - these are long, ~200 words each)

**Position 33:**
The next few pieces of advice are going to show you how to develop a new ability that will not only accelerate your language learning but also help you achieve more in literally every part of your life. I've talked a lot about why you shouldn't worry about mistakes, and now I'm going to explain exactly HOW to stop yourself - by getting into what sports people often call The Zone. The Zone is that magic place where the game you're playing suddenly seems easy and obvious - tennis and cricket players talk about 'seeing the ball big'. If you search online for ways to get into the Zone, you'll find a huge amount of sometimes very complicated information - but actually, there's only one thing that you need to do, and it will work as consistently and reliably as the work you've already been doing to build synapses for your new language. Now if you focus as clearly as possible on learning a bit more, I'll tell you how to get into the Zone in our next break.

**Position 34:**
Right - time to learn how to get into the Zone - and when you've mastered this, you'll be able to get into the Zone with anything you do, and the results will be startling. There's only one thing you need to do - the Zone is really just another word for focus - and you can train and improve your ability to focus. You probably think of your mind as just one place where your thoughts and emotions bubble along, but there's actually a very important divide between the part of your mind where thoughts and emotions happen, and a separate, more powerful and trainable part of your mind. Let's call it the Noticing Mind. When you're in the noticing mind - fully focused - you don't have space for thoughts or feelings. It's like an off switch for thinking and feeling, and in our next break I'll tell you why that is so enormously important.

**Position 35:**
So, the noticing mind is an off switch for thoughts and emotions. That means that when you realise you're having a thought or an emotion - when you feel frustrated or upset because you said something that didn't match the models - you've fallen out of the Noticing Mind. When you're fully in the noticing mind, when your focus on the words you're hearing is absolute, there isn't any room for the thoughts or feelings. And, magically, when your focus on the words is absolute, you're giving your brain the best possible exposure to the language, which will help it learn your new language even more quickly. In other words, when you're having those negative feelings, they're a sign to you that you're not fully focussed on the learning. You shouldn't feel bad about that, it's completely normal - but there's one very simple thing you can do that will dramatically improve your ability to stay in the noticing mind, and I'll tell you about it in a few minutes, when you've learnt a bit more.

**Position 36:**
So, your noticing mind is the single best way to improve your learning, and when you have a negative emotional response, that means you've fallen out of your noticing mind - you've lost focus. How do we fix that? It's very simple. Every single time you have a negative emotional response, all you have to do is notice it - tell yourself 'oh, I'm having a negative emotional response, and now I'm going to move my focus back to the learning process'. This is like doing press-ups for the noticing mind - every single time you notice that you're having an emotional response, and move your attention back to the learning process, you're getting better at staying in the noticing mind. Start doing it as soon as this break is over, and you'll immediately be turning yourself into a better learner - and when I think you've had time to build some extra muscle for your noticing mind, I'll tell you about some other powers it unlocks for you. Now, in our next break, I'll tell you about something I call your 'internal voice', which is another incredibly important part of your learning journey.

### POOLED (31 items - these are shorter, ~40-60 words each)

**Index 14:**
The brain can rebuild and rewire itself all the time, even after being badly damaged - which means that your brain can cope with anything we can throw at it. Believe in yourself, or at least believe in your brain.

**Index 20:**
Time for a quick breather. That frustrated feeling when a word is on the tip of your tongue? That's your brain telling you it's almost finished building that memory. You're closer than you think. Okay, back to it - and remember, the frustration is a good sign!

**Index 21:**
Let's pause for a moment. Remember, every time you speak out loud, you're recruiting extra neural circuits that reading and writing just can't reach. Your mouth is doing important work for your brain right now. And now let's put that mouth back to work.

**Index 22:**
Your brain deserves a few seconds of rest. If you're feeling kind to yourself today, brilliant - you'll learn faster. If you're beating yourself up, try treating yourself the way you'd treat a nervous child who was trying really hard. Now, be kind to yourself and keep going.

**Index 23:**
Just a quick break while your synapses catch up. Your brain has more possible pathways through it than there are atoms in the universe (the maths on that is baffling but fun). Your brain can definitely handle this way of learning. Trust it. Now let's give it some more to work with.

**Index 24:**
Take a breath for a moment. Those moments of silence when you can't think of the word? Stay in them. Don't panic. Something will come, and every time it does, you get braver. Okay, back into the game now.

**Index 25:**
Time for a little encouragement. If a word sounds unclear, don't worry - your brain is encoding it syllable by syllable, sound by sound, even when you're not aware of it. One day it'll just click. For now, just keep going.

**Index 26:**
Let's have a tiny break. Remember, even difficult emotions pass through your brain in about 90 seconds if you let them. Notice the frustration, then bring your focus back to the next prompt. That's all you need to do. Speaking of which - here comes the next prompt.

**Index 27:**
A quick thought while you rest. You're not just learning words - you're building blocks that snap together in new combinations. The more blocks you collect, the more sentences appear almost by magic. Let's go and collect a few more now.

**Index 28:**
Here's something worth knowing. Rest is part of the process, not a break from it. Your brain keeps working on this stuff while you're doing other things. So if you need to stop, stop guilt-free. But if you're ready to carry on - let's carry on!

**Index 29:**
One more little breather. Every single sentence you say is like a press-up for your brain. It might not feel like much, but you're getting stronger with each one. And now it's time for a few more press-ups.

**Index 30:**
Let's take a moment. If you're pushing yourself and it feels hard, that's not a sign something's wrong - that's the 10% zone, where all the best learning happens. Easy never gets results. Hard gets results. And you're doing hard right now, so well done. And now, back to making that effort.

**Index 31:**
Quick break for your neurons. When you said something just then and heard a different version from the model, your brain noticed the difference. That noticing? That's learning happening in real time. So don't feel bad about it - feel proud. And now let's give your brain some more chances to notice a difference.

**Index 32:**
Time to catch your breath. You know how first language speakers talk so fast? It's because they've chunked words together into blocks. That's exactly what you're building right now, chunk by chunk. Soon enough, they'll flow out of you too. Okay, back to the building.

**Index 33:**
Here's a comforting thought. You don't need to remember everything perfectly right now. Spaced repetition means we'll keep bringing words back until they stick. Your only job is to keep moving forward. So let's keep moving.

**Index 34:**
A little pause for you. If you've been going for a while and your brain feels tired, even a bit achy - congratulations, you're doing genuine neurological work. This is what building new synapses feels like. Rest for a second, then let's build a few more.

**Index 35:**
Time for just a quick moment to breathe. That voice in your head that says you should be doing better by now? It's wrong. It's comparing you to an imaginary perfect learner who doesn't exist. You're doing brilliantly. Tell that voice to shush, and carry on.

**Index 36:**
Breather time. Remember, you're not trying to get every sentence perfect - you're trying to make as many attempts as possible. Speed beats precision right now. The precision comes later, almost by itself. So stay fast, stay loose, and let's go.

**Index 37:**
Let's pause here. Every word you're learning has thousands of synaptic connections forming around it - sounds, meanings, feelings, contexts. You're not just memorising, you're growing new architecture in your brain. That's genuinely amazing. Now let's add to it.

**Index 38:**
Time for a thought. If you're finding the long sentences overwhelming, that's completely fine - just say whatever words you can grab. Even two or three words is perfect. Your brain hears the rest and files it away for later. Okay, let's have another go at it.

**Index 39:**
Here's a moment to breathe. Some days the words flow easily; other days they seem to hide from you. That's just how brains work - energy goes up and down. Be gentle with yourself on the hard days. You're still learning, even when it doesn't feel like it. Right, onwards and upwards.

**Index 40:**
Time for a quick mini-rest. You might not realise it, but every time you jump in and say something - anything - before you're quite ready, you're training yourself to be braver. Bravery is a muscle too. Let's exercise it a bit more now.

**Index 41:**
Let's take a second. Now, the goal isn't to sound like a textbook. The goal is to communicate. First language speakers stumble, change direction mid-sentence, forget words all the time. You're allowed to do that too, okay? Now, where were we?

**Index 42:**
Here's something to remember. When you hear the model voices after you've spoken, listen as if you're hearing music - let it wash over you, don't analyse it. Your brain picks up more when you're relaxed than when you're straining. Nice and relaxed, then - here we go.

**Index 43:**
Time for a small break. That thing where you almost knew the word, and then heard it and thought "Of course!"? That's your brain putting the final pieces in place. Those moments are the finish line of a memory being built. Now let's go build some more memories.

**Index 44:**
Pause for a moment. Here's a strange thought - you're not the same person you were when you started this session. Literally - your brain has already changed. New connections exist now that didn't exist before. Even though it sounds a bit like me giving you motivational fluff, it's just plain old neuroscience. Pretty wonderful, isn't it? And now back to the wonderful work.

**Index 45:**
Just a quick breather now. If perfectionism is whispering that you need to get everything right before moving on - don't listen. Perfectionism is the enemy of language learning. The person who makes a hundred mistakes will always beat the person who makes ten careful attempts. And now let's go make some more mistakes.

**Index 46:**
Time for another quick thought. You know how athletes talk about being "in the zone"? That's just another word for focus. When you're fully focused on the prompts, there's no room for worry or self-criticism. Try to stay in that zone now. Here comes the next prompt.

**Index 47:**
Let's rest for a second. Speaking out loud might feel strange, especially if someone might hear you. But that slight embarrassment is a tiny price for what you're gaining. Every spoken word strengthens circuits that silent study can't reach. So keep speaking, and keep getting better at this.

**Index 48:**
A moment's pause for you. Your brain is doing something remarkable right now - it's taking a completely foreign system of sounds and meanings and making it yours. This is one of the most complex things a human brain can do. And yours is doing it. Right now. So let's give it another prompt straight away.

**Index 49:**
Here's the thing: you will become a speaker of this language. Not because you're special or talented, but because you're doing the work, and the work always leads to the result. It's not a question of if. Just when. Let's make it sooner rather than later by carrying on right now.

---

## Batch plan

Translate all 35 items for these languages in this batch:

### BATCH 1: afr, ara, asm, aze, bel, ben, bos, bul, cat, ceb
### BATCH 2: ces, cmn, cym, dan, deu, ell, est, fas, fil, fin
### BATCH 3: fra, gle, glg, guj, hau, heb, hin, hrv, hun, hye
### BATCH 4: ind, isl, ita, jav, jpn, kan, kat, kaz, kir, kor
### BATCH 5: lav, lin, lit, ltz, mal, mar, mkd, msa, nep, nld
### BATCH 6: nor, nya, pan, pol, por, pus, ron, rus, slk, slv
### BATCH 7: snd, som, spa, srp, swa, swe, tam, tel, tha, tur
### BATCH 8: ukr, urd, vie

## Language code reference

| Code | Language |
|------|----------|
| afr | Afrikaans |
| ara | Arabic |
| asm | Assamese |
| aze | Azerbaijani |
| bel | Belarusian |
| ben | Bengali |
| bos | Bosnian |
| bul | Bulgarian |
| cat | Catalan |
| ceb | Cebuano |
| ces | Czech |
| cmn | Mandarin Chinese |
| cym | Welsh |
| dan | Danish |
| deu | German |
| ell | Greek |
| est | Estonian |
| fas | Farsi/Persian |
| fil | Filipino/Tagalog |
| fin | Finnish |
| fra | French |
| gle | Irish |
| glg | Galician |
| guj | Gujarati |
| hau | Hausa |
| heb | Hebrew |
| hin | Hindi |
| hrv | Croatian |
| hun | Hungarian |
| hye | Armenian |
| ind | Indonesian |
| isl | Icelandic |
| ita | Italian |
| jav | Javanese |
| jpn | Japanese |
| kan | Kannada |
| kat | Georgian |
| kaz | Kazakh |
| kir | Kyrgyz |
| kor | Korean |
| lav | Latvian |
| lin | Lingala |
| lit | Lithuanian |
| ltz | Luxembourgish |
| mal | Malayalam |
| mar | Marathi |
| mkd | Macedonian |
| msa | Malay |
| nep | Nepali |
| nld | Dutch |
| nor | Norwegian |
| nya | Chichewa |
| pan | Punjabi |
| pol | Polish |
| por | Portuguese |
| pus | Pashto |
| ron | Romanian |
| rus | Russian |
| slk | Slovak |
| slv | Slovenian |
| snd | Sindhi |
| som | Somali |
| spa | Spanish |
| srp | Serbian |
| swa | Swahili |
| swe | Swedish |
| tam | Tamil |
| tel | Telugu |
| tha | Thai |
| tur | Turkish |
| ukr | Ukrainian |
| urd | Urdu |
| vie | Vietnamese |
