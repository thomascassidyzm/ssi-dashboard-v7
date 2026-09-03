# Pod 1 in your voice — Spanish, all 91 lines

**2026-08-27.** `spa_for_eng` Pod 1 is live in your Cartesia clone. **91 of 91 known-track lines rendered, verified and swapped. Nothing failed. Nothing was deleted.**

This is the one-language-first run you asked for. **The other 20 live pods have not been touched** — they wait on your ear, here.

---

## Listen to these five first

If they sound like you, the rest almost certainly do — they came off the same clone in one 4½-minute run.

**SC01-S003 — Neighbour** · "I'm very well, thank you. Are you going to work?"

https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-02.mp3

**SC06-S003 — James** · "I'm James. Pleased to meet you."

https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-13.mp3

**SC07-S013 — Cafe Customer 3** · "Good morning. Two Americanos and a cup of tea, please."

https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-25.mp3

**SC12-S006 — Pharmacist** · "One every four to six hours, no more than eight in a day."

https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-55.mp3

**SC22-S010 — Friend** · "I think that's normal. Learning a new language is difficult. But it's so much fun when you start to have conversations, isn't it?"

https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-91.mp3

---

## What the numbers say

| | |
|---|---|
| Lines rendered and swapped | **91 / 91** |
| Failed | **0** |
| Old clips deleted | **0** — every superseded row still exists, still linked wherever a sibling course shares it |
| Whisper-verified | **26 of 91** — 10 by the gate's own sampler, 16 more I checked by hand across the pod. **0 failures**, worst character error 0.069 |
| Loudness, all 91 measured | **-18 to -14.7 LUFS**, median **-16** |
| More than 0.5 dB under the −16 target | 13 of 91 |
| More than 1.5 dB under | 2 of 91 |
| Total listening | 5.1 minutes |

### On the loudness defect you asked me to watch

**It is real, it is smaller than feared, and it is not a regression.** The warning was that Cartesia comes back at −32 to −40 LUFS and the mastering stage caps its lift at 20 dB, so roughly 1 in 4 clips could not reach −16. On these full sentences it is 13 in 91, and the worst is −18.0.

**The clips it replaced were worse.** I measured twelve of the incumbent xAI clips in the same slots before overwriting anything: they ran **−15.6 to −22.3 LUFS**. The new ones run −14.7 to −18.0. The spread got *tighter*, not wider.

**The candidate fix does not work, and I am glad I tested it rather than gambling.** `generation_config.volume` is a real parameter — a number, not a word; every string value is rejected outright. `volume: 2` does lift the raw audio about 8 dB. It does **not** improve the finished clip: on twelve real Pod 1 sentences, five landed under target either way, and the median came out slightly *worse* with it. The reason is that on sentence-length text the binding constraint is not Cartesia at all — it is the mastering stage giving up after three passes, 0.6 to 1.1 dB short. I did not apply it.

**My read: ship it.** A 3 dB spread on a dialogue pod is worth fixing one day, but it is better than what is there now, and the fix belongs in the mastering stage rather than in this run.

---

## All 91, in pod order

Grouped by scene, as you hear them. ⚠️ marks a clip the mastering stage could not lift within 0.5 dB of target.


**Scene 1**

[⚠️ 1 Neighbour (8 am) — "Good morning, Sarah!"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-01.mp3)
[⚠️ 2 Neighbour — "I'm very well, thank you. Are you going to work?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-02.mp3)

**Scene 2**

[⚠️ 3 Passenger — "No, it's free. Please, go ahead."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-03.mp3)
[4 Passenger — "It's not very far. Maybe three or four miles."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-04.mp3)

**Scene 3**

[5 Barista (3 pm) — "Good afternoon. What can I get you?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-05.mp3)
[6 Barista — "No, we've only got drinks."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-06.mp3)
[7 Barista — "Yes, would you like the menu?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-07.mp3)
[8 Barista — "Here's your coffee."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-08.mp3)

**Scene 4**

[⚠️ 9 Friend (7 pm) — "Hello, good evening!"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-09.mp3)
[10 Friend — "No, I'm sorry, I'm busy tomorrow. But let's talk on …"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-10.mp3)

**Scene 5**

[11 Neighbour (10:30 pm) — "Good evening, Sarah. Did you have a long day?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-11.mp3)

**Scene 6**

[⚠️ 12 James — "Excuse me. Hello. What's your name?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-12.mp3)
[13 James — "I'm James. Pleased to meet you."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-13.mp3)
[14 James — "I'm from Manchester, but I live in London now. And y…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-14.mp3)
[15 James — "This is a lovely city. What do you do?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-15.mp3)
[16 James — "I'm sorry, I didn't understand you. I'm learning Spa…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-16.mp3)
[17 James — "I teach English, but not in a school. I work with ad…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-17.mp3)
[⚠️ 18 Narrator — "1. 2. 3. White. Black."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-18.mp3)

**Scene 7**

[19 Cafe Customer 1 — "I'd like a black coffee, please."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-19.mp3)
[20 Cafe Customer 1 — "I'd like large, please. With oat milk if you have it…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-20.mp3)
[21 Cafe Customer 1 — "I'd like takeaway, please."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-21.mp3)
[22 Cafe Customer 2 — "Could I have two white coffees and two black coffees…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-22.mp3)
[23 Cafe Customer 2 — "Yes, can I have a glass of water as well, please."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-23.mp3)
[24 Cafe Customer 2 — "Could I pay by card? Do you have contactless?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-24.mp3)
[25 Cafe Customer 3 — "Good morning. Two Americanos and a cup of tea, pleas…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-25.mp3)
[⚠️ 26 Narrator — "5. 10. 15. Red. Green."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-26.mp3)

**Scene 8**

[27 Bartender — "Good evening. What can I get you?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-27.mp3)
[28 Bartender — "We've got a bitter and a stout, and they're both loc…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-28.mp3)
[29 Bartender — "We have a house red, a house white, or you could hav…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-29.mp3)
[30 Bartender — "Are you eating tonight?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-30.mp3)
[31 Bartender — "Yes, of course. Here it is. The fish and chips are v…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-31.mp3)
[32 Narrator — "4. 6. 8. Blue. Yellow."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-32.mp3)

**Scene 9**

[33 Waiter — "Welcome. Please follow me. Here are the menus."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-33.mp3)
[34 Waiter — "Would you like still or sparkling water to start?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-34.mp3)
[35 Waiter — "Yes, the salmon and the risotto are both gluten-free…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-35.mp3)
[36 Waiter — "The lamb is excellent. It's been slow-cooked, with r…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-36.mp3)
[37 Waiter — "Of course. And what would you like to drink?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-37.mp3)
[38 Waiter — "Excellent choice. I'll bring it right over."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-38.mp3)
[39 Waiter — "Is everything alright? Do you have any room for dess…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-39.mp3)
[40 Narrator — "7. 9. 11. Orange. Purple."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-40.mp3)

**Scene 10**

[41 Assistant — "Yes, they're down that aisle, on the left."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-41.mp3)
[42 Assistant — "I think so, but you'll have to look to make sure."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-42.mp3)
[43 Assistant — "Sunscreen is down there on your right, and you'll fi…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-43.mp3)
[44 Assistant — "You're welcome. Are you here on holiday? You speak v…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-44.mp3)
[45 Narrator — "12. 13. 14. Pink. Grey."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-45.mp3)

**Scene 11**

[46 Guest — "Good afternoon. I have a booking under the name Jone…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-46.mp3)
[47 Guest — "Of course. Here's my passport."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-47.mp3)
[48 Guest — "Does the room have a view?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-48.mp3)
[49 Guest — "What time is breakfast served?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-49.mp3)
[50 Guest — "Wonderful. Is it possible for us to have a late chec…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-50.mp3)
[51 Guest — "And what is the wifi password?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-51.mp3)
[52 Narrator — "16. 17. 18. Monday. Tuesday."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-52.mp3)

**Scene 12**

[⚠️ 53 Pharmacist — "Of course. What are your symptoms?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-53.mp3)
[54 Pharmacist — "Try paracetamol for the headache, and these lozenges…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-54.mp3)
[55 Pharmacist — "One every four to six hours, no more than eight in a…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-55.mp3)
[56 Pharmacist — "Yes, with or after food is best."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-56.mp3)
[⚠️ 57 Narrator — "19. 20. 21. Wednesday. Thursday."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-57.mp3)

**Scene 13**

[58 Local — "Yes, it's about a ten minute walk. Go straight along…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-58.mp3)
[59 Local — "Yes, past the church and the post office."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-59.mp3)
[60 Local — "At the second roundabout, take the first exit."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-60.mp3)
[61 Local — "You'll see the supermarket on your left, just opposi…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-61.mp3)
[62 Local — "Yes, there's one on the high street, next to the bak…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-62.mp3)
[⚠️ 63 Narrator — "30. 40. 50. Friday. Saturday."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-63.mp3)

**Scene 14**

[64 Passenger — "Hello. Can you take me to the train station, please?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-64.mp3)
[65 Passenger — "About how long do you think it will take?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-65.mp3)
[66 Passenger — "Do you know where I can get a ticket in the station?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-66.mp3)
[⚠️ 67 Passenger — "Could I pay by card?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-67.mp3)
[⚠️ 68 Narrator — "100. 200. 1000. Sunday. 12 o'clock."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-68.mp3)

**Scene 15**

[69 Narrator — "100,000. 60. 70. 1 o'clock. 11 o'clock."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-69.mp3)

**Scene 16**

[70 Staff — "No, we only take cash."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-70.mp3)
[71 Narrator — "A million. 80. 90. 2 o'clock. 10 o'clock."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-71.mp3)

**Scene 17**

[72 Staff — "Do you want to pay by cash or card or put it on the …"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-72.mp3)
[73 Staff — "Would you like to pay by cash or card or on the room…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-73.mp3)
[74 Staff — "Did you want to pay by cash or card?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-74.mp3)
[75 Interlocutor — "No, it's a little cold today."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-75.mp3)
[76 Narrator — "3 o'clock. 9 o'clock. January. February."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-76.mp3)

**Scene 18**

[77 Narrator — "4 o'clock. 8 o'clock. March. April."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-77.mp3)

**Scene 19**

[78 Narrator — "5 o'clock. 7 o'clock. May. June."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-78.mp3)

**Scene 20**

[79 Narrator — "6 o'clock. July. August. September."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-79.mp3)

**Scene 21**

[80 Interlocutor — "It's down there on the left."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-80.mp3)
[81 Interlocutor — "It's down there on the right."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-81.mp3)
[82 Interlocutor — "Yes, I said it's over there."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-82.mp3)
[83 Interlocutor — "Would you like to order some drinks?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-83.mp3)
[84 Interlocutor — "Do you want to order some drinks first?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-84.mp3)
[85 Interlocutor — "Did you want something to drink first?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-85.mp3)
[⚠️ 86 Narrator — "October. November. December."](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-86.mp3)

**Scene 22**

[87 Friend — "Of course, no problem. You seem to speak it very wel…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-87.mp3)
[88 Friend — "Am I speaking slowly enough for you now?"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-88.mp3)
[89 Friend — "I think you're doing very well. I'm impressed. I thi…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-89.mp3)
[90 Friend — "You should be confident already. I think you're doin…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-90.mp3)
[91 Friend — "I think that's normal. Learning a new language is di…"](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/spa-91.mp3)

---

## A handful from other pods

**The Pod 1 English is one shared script.** Of the 91 lines your voice speaks in Spanish, **88 are word-for-word what your voice says in Italian, Japanese, German and Irish too** — the only difference is the three lines that name the language ("I'm learning Italian"). So Spanish in full is very nearly the whole 2,051-line inventory by content, and there was little new to hear elsewhere.

These were rendered **for listening only — they are linked to nothing** and no other pod has been altered.


**ita_for_eng** — 3 clips

[I'm sorry, I didn't understand you. I'm lear…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-ita-1.mp3) · [You're welcome. Are you here on holiday? You…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-ita-2.mp3) · [I think you're doing very well. I'm impresse…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-ita-3.mp3)

**jpn_for_eng** — 3 clips

[I'm sorry, I didn't understand you. I'm lear…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-jpn-1.mp3) · [You're welcome. Are you here on holiday? You…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-jpn-2.mp3) · [I think you're doing very well. I'm impresse…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-jpn-3.mp3)

**deu_for_eng** — 3 clips

[I'm sorry, I didn't understand you. I'm lear…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-deu-1.mp3) · [You're welcome. Are you here on holiday? You…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-deu-2.mp3) · [I think you're doing very well. I'm impresse…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-deu-3.mp3)

**gle_for_eng** — 3 clips

[I'm sorry, I didn't understand you. I'm lear…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-gle-1.mp3) · [You're welcome. Are you here on holiday? You…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-gle-2.mp3) · [I think you're doing very well. I'm impresse…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-gle-3.mp3)

**hrv_for_eng** — 140 clips

[Good morning. How are you?](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-hrv-1.mp3) · [Yes, I've got a busy day today. I hope you h…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-hrv-2.mp3) · [Excuse me, is this seat taken?](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-hrv-3.mp3) · [How far is it into town?](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-hrv-4.mp3) · [Can you tell me how far it is into town?](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-hrv-5.mp3) · [Good afternoon. I'd like a coffee, please. W…](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-hrv-6.mp3) · [Do you have any food?](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-hrv-7.mp3) · [Do you have any snacks?](https://watson-1.tail4968cb.ts.net/evidence/pod1-tom-voice-2026-08-27/other-hrv-8.mp3)

…and 132 more in the same voice.

---

## What is waiting for you

**One decision: does this sound like you?**

- **Yes** → I fire the remaining 20 live pods. 1,960 lines, about 92K credits, roughly 90 minutes of rendering. The driver resumes per slot, so it can run unattended.

- **Not quite** → nothing else is spent, and Spanish rolls back to its old clips by relinking. The old rows were never deleted, which is what makes that a five-minute job rather than a re-render.

`deu_at_for_eng` stays held on its own visibility, exactly as scoped.

---

## Three things you should know

**The pod renderer could not speak Cartesia at all.** The course path learned Cartesia this morning; the pod path resolves voices through its own function, which knew only xAI, ElevenLabs and Azure. Your voice id would have been posted to Azure as a voice name Azure has never heard of. Fixed and on `main` — but the running phase 8 service still holds the old code in memory, so **the fix reaches the HTTP route only when that service is next restarted.** This run did not need it: it drives the renderer directly.

**The bulk route fills gaps, it does not replace.** It builds its queue from slots with no audio, so the only way to push 2,051 already-linked slots through it is to unlink them first and let it find the holes — break-before-make on 21 live courses. I wrote a driver that inverts it instead: render, verify the clip is alive and in your voice, then move the link, one slot at a time. A run that dies loses money, never audio.

**I overspent about 7K credits by my own carelessness.** Sampling "a handful from other pods", my filter caught every line the Croatian pod does not share with Spanish rather than just the three new ones, and rendered 152 listening-only clips instead of about fifteen. They are on this page and they cost roughly 7% of the Pod 1 budget. My mistake, and it changes nothing about the run itself.


*Every slot, before and after, is logged at `docs/pods/pod1-tom-voice-2026-08-27/spa_for_eng-applied-log.jsonl` — keyed by slot id, per the pod migration protocol, so a resumed run reconciles per slot rather than per position. No learner progress was migrated and none is owed: this is new audio under unchanged text, so no slot moved and nobody is credited with a line they never heard.*
