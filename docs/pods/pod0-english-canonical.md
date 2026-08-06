# Pod 0 — The First Day (English canonical)

*STATUS: CANONICAL — replaces the previous pod-0 canonical text in full (brief 2026-08-06).
Source: Aran's own file, `pod0-aran-original-2026-08-06.txt` (verbatim, UTF-8 BOM + CRLF) —
field-tested against his
Croatian 75-day experiment and the holiday that followed. Text preserved VERBATIM: the
only changes are three mechanical fixes, every one of them logged in
`pod0-canonical-corrections-2026-08-06.md` — Scene 3's repeated `6.` renumbered to `10.`,
curly apostrophes normalised to straight ASCII, trailing whitespace stripped. Aran's
wording, register and British English are untouched. Seeded into `canonical_pod_scenarios`
as `pod-0` via `node tools/seed-canonical-pods.cjs --file=docs/pods/pod0-english-canonical.md --slug=pod-0 --execute`;
the previous rows are snapshotted at `pod0-live-snapshot-2026-08-06.json`.
`pod0-aran-raw-2026-08-06.txt` is a transcript-recovered copy of the same text, kept for
provenance — it is identical to Aran's file on every non-blank line.
Translations/audio NOT regenerated — propagation to per-course pod dialogue is a separate
approved pass.*

*VOICING — Aran, 2026-08-06, verbatim: "Did some interleaving in the first few scenes and
then beyond that it seemed faster to do them as chunks, without scene-based to and fro for
everything, they'll work fine like that (also kind of fits with what I've been saying about
not needing multiple voices)." Tom adds: **a minimum of two voices where needed, especially
for less-well-served TTS languages.**

What that means for the audio pass, and for the `speaker` column it reads:
- **Scenes 1-14 and 22 are genuinely interleaved dialogue.** They keep their own characters
  (`Sarah`/`Neighbour`, `Barista`/`Customer 1-3`, `Waiter`, `Guest`/`Receptionist`,
  `Learner`/`Friend` …) and want the to-and-fro. Two voices is the floor, not the target —
  distinct voices per character are better where the language's TTS supports it.
- **Scenes 15-21, the Extra phrases, are CHUNKS.** They are a run of useful phrases, not a
  conversation, and no to-and-fro is needed. Every line is attributed to `Learner`. Some read
  as a second party's reply ("No, we only take cash.", "It's down there on the left.") — those
  are phrases in the chunk, and no alternating speaker has been forced onto them. If a future
  pass does want a second voice here, that is a free choice, not something the data dictates.
- **Drill tails are `Narrator`** and were already voiced separately under canon v2.*

*DRILL TAILS: the last line of scenes 6-21 (`1. 2. 3. White. Black.`, `7 o'clock. May. June.`)
is deliberate content — the numbers/colours/times/months drip. Speaker `Narrator`,
author_notes carried from the existing canon-v2 rows. Not a numbered list, do not renumber.*

*PLACEHOLDERS: `[target language]` (scene 6 line 9, scene 10 lines 8-9, scene 22 lines 1 and 6)
uses the existing canon-v2 machinery, `services/pod-generation-prompt.cjs`. Preserved exactly.*

## Pod 0 · A Day of Greetings (i) - 8 am — *Morning to night*

*4 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Neighbour (8 am) | Good morning, Sarah! |
| 2 | Sarah | Good morning. How are you? |
| 3 | Neighbour | I'm very well, thank you. Are you going to work? |
| 4 | Sarah | Yes, I've got a busy day today. I hope you have a good day. See you later. |

## Pod 0 · A Day of Greetings (ii) - a seat — *Morning to night*

*5 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Sarah | Excuse me, is this seat taken? |
| 2 | Passenger | No, it's free. Please, go ahead. |
| 3 | Sarah | How far is it into town? |
| 4 | Sarah | Can you tell me how far it is into town? |
| 5 | Passenger | It's not very far. Maybe three or four miles. |

## Pod 0 · A Day of Greetings (iii) - 3 pm — *Morning to night*

*10 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Barista (3 pm) | Good afternoon. What can I get you? |
| 2 | Sarah | Good afternoon. I'd like a coffee, please. With milk but with no sugar. To take away. |
| 3 | Sarah | Do you have any food? |
| 4 | Sarah | Do you have any snacks? |
| 5 | Sarah | Do you have crisps, or nuts, or anything? |
| 6 | Barista | No, we've only got drinks. |
| 7 | Barista | Yes, would you like the menu? |
| 8 | Sarah | Yes, please. |
| 9 | Barista | Here's your coffee. |
| 10 | Sarah | Thank you very much. Goodbye. |

## Pod 0 · A Day of Greetings (iv) - 7 pm — *Morning to night*

*3 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Friend (7 pm) | Hello, good evening! |
| 2 | Sarah | Hello! I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow? |
| 3 | Friend | No, I'm sorry, I'm busy tomorrow. But let's talk on Saturday. See you then. |

## Pod 0 · A Day of Greetings (v) - 10:30 pm — *Morning to night*

*2 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Neighbour (10:30 pm) | Good evening, Sarah. Did you have a long day? |
| 2 | Sarah | Yes, very. I'm very tired now. Good night. See you tomorrow. |

## Pod 0b · Introductions — *Pleased to meet you*

*Difficulty: beginner · 13 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | James | Excuse me. Hello. What's your name? |  |
| 2 | Anna | My name is Anna. And you? |  |
| 3 | James | I'm James. Pleased to meet you. |  |
| 4 | Anna | Pleased to meet you too. Where are you from? |  |
| 5 | James | I'm from Manchester, but I live in London now. And you? |  |
| 6 | Anna | I'm from France. I've been here for two years. |  |
| 7 | James | This is a lovely city. What do you do? |  |
| 8 | Anna | I'm a nurse, at the hospital just round the corner. And you? |  |
| 9 | James | I'm sorry, I didn't understand you. I'm learning [target language]. Could you say that again more slowly? |  |
| 10 | Anna | Yes, of course. I'm a nurse. I work at the hospital. It's near here. And what do you do? |  |
| 11 | James | I teach English, but not in a school. I work with adults. I'm on holiday here with my wife and children. We're having a lovely time. |  |
| 12 | Anna | How interesting. Well, lovely to meet you. |  |
| 13 | Narrator | 1. 2. 3. White. Black. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 1 · Coffee Shop — *A flat white, please*

*Difficulty: beginner · 15 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Barista | Good morning. What can I get you? |  |
| 2 | Customer 1 | I'd like a black coffee, please. |  |
| 3 | Barista | Do you want regular or large? |  |
| 4 | Customer 1 | I'd like large, please. With oat milk if you have it. |  |
| 5 | Barista | Of course. Would you like to sit-in or takeaway? |  |
| 6 | Customer 1 | I'd like takeaway, please. |  |
| 7 | Customer 2 | Could I have two white coffees and two black coffees and one of those, please? |  |
| 8 | Barista | Right away. Would you like anything else? |  |
| 9 | Customer 2 | Yes, can I have a glass of water as well, please. |  |
| 10 | Barista | That's eight pound forty altogether. |  |
| 11 | Customer 2 | Could I pay by card? Do you have contactless? |  |
| 12 | Barista | Of course. There's the machine. |  |
| 13 | Customer 3 | Good morning. Two Americanos and a cup of tea, please. |  |
| 14 | Barista | Would you like to sit-in? The table by the window is free. |  |
| 15 | Narrator | 5. 10. 15. Red. Green. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 2 · Pub — *A pint of bitter*

*Difficulty: beginner · 16 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Bartender | Good evening. What can I get you? |  |
| 2 | Customer 1 | I'd like a pint, please. What ales do you have on? |  |
| 3 | Bartender | We've got a bitter and a stout, and they're both local. |  |
| 4 | Customer 1 | I'd like a pint of the bitter, please. |  |
| 5 | Customer 2 | Can I have a half of cider? |  |
| 6 | Customer 3 | Could I see the wine list? I want a glass of wine. |  |
| 7 | Bartender | We have a house red, a house white, or you could have one of our bottles. |  |
| 8 | Customer 3 | I'd like a large glass of white wine, please. |  |
| 9 | Customer 1 | Can I have a small glass of red wine? |  |
| 10 | Customer 2 | I'd like two more glasses of beer. |  |
| 11 | Bartender | Are you eating tonight? |  |
| 12 | Customer 1 | I'm not sure if I'm hungry. Do you have a menu? |  |
| 13 | Bartender | Yes, of course. Here it is. The fish and chips are very good. |  |
| 14 | Customer 1 | Can we have some bread? And a bowl of chips for the table. |  |
| 15 | Customer 2 | Do you have any sandwiches? I'd like a cheese sandwich, please. |  |
| 16 | Narrator | 4. 6. 8. Blue. Yellow. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 3 · Restaurant — *A booking for two*

*Difficulty: intermediate · 18 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Customer 1 | Good evening. We have a booking for two, under the name Davies. |  |
| 2 | Waiter | Welcome. Please follow me. Here are the menus. |  |
| 3 | Waiter | Would you like still or sparkling water to start? |  |
| 4 | Customer 2 | We'd like one bottle of sparkling water and one bottle of still water, please. |  |
| 5 | Customer 1 | Excuse me - do you have anything gluten-free? Or for vegetarians? |  |
| 6 | Waiter | Yes, the salmon and the risotto are both gluten-free. We also have some salads. |  |
| 7 | Customer 1 | And what would you recommend tonight? |  |
| 8 | Waiter | The lamb is excellent. It's been slow-cooked, with rosemary. |  |
| 9 | Customer 1 | I'll have the lamb, please. With a side of greens. |  |
| 10 | Customer 2 | And the risotto for me. With a small green salad to start. |  |
| 11 | Waiter | Of course. And what would you like to drink? |  |
| 12 | Customer 1 | Could we see the wine list? |  |
| 13 | Customer 2 | A bottle of the house red would be lovely. |  |
| 14 | Waiter | Excellent choice. I'll bring it right over. |  |
| 15 | Waiter | Is everything alright? Do you have any room for dessert? |  |
| 16 | Customer 1 | Just two coffees, please. Decaf for me. |  |
| 17 | Customer 2 | And the bill, when you're ready. Could we split it? |  |
| 18 | Narrator | 7. 9. 11. Orange. Purple. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 4 · Shop

*10 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Customer | Excuse me. Do you have any painkillers? |  |
| 2 | Assistant | Yes, they're down that aisle, on the left. |  |
| 3 | Customer | Thank you. And do you have any painkillers for children? |  |
| 4 | Assistant | I think so, but you'll have to look to make sure. |  |
| 5 | Customer | I also need to get some sunscreen and some toothpaste. |  |
| 6 | Assistant | Sunscreen is down there on your right, and you'll find toothpaste just round the corner. |  |
| 7 | Customer | Thank you, you've been very helpful. I'm very grateful. |  |
| 8 | Assistant | You're welcome. Are you here on holiday? You speak very good [target language]. |  |
| 9 | Customer | That's very kind of you! Yes, I'm on holiday, and I need to practice more to speak [target language] better. Thank you very much, and goodbye. |  |
| 10 | Narrator | 12. 13. 14. Pink. Grey. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 5 · Hotel — *A booking under the name Jones*

*Difficulty: intermediate · 13 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Guest | Good afternoon. I have a booking under the name Jones. |  |
| 2 | Receptionist | Welcome. Yes, you have a double room for three nights. Could I see some ID, please? |  |
| 3 | Guest | Of course. Here's my passport. |  |
| 4 | Receptionist | Lovely. The room is on the third floor, room 709. |  |
| 5 | Guest | Does the room have a view? |  |
| 6 | Receptionist | Yes, it overlooks the garden. |  |
| 7 | Guest | What time is breakfast served? |  |
| 8 | Receptionist | From half-past seven until ten o'clock. We have fruit and cereals or a cooked breakfast. |  |
| 9 | Guest | Wonderful. Is it possible for us to have a late check-out? |  |
| 10 | Receptionist | Yes, you can stay until midday, no extra charge. |  |
| 11 | Guest | And what is the wifi password? |  |
| 12 | Receptionist | It's on the welcome card in your room. Have a lovely stay. |  |
| 13 | Narrator | 16. 17. 18. Monday. Tuesday. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 6 · Chemist's — *Something for a sore throat*

*Difficulty: intermediate · 10 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Customer | Good morning. I'm not feeling great - could you recommend something? |  |
| 2 | Pharmacist | Of course. What are your symptoms? |  |
| 3 | Customer | I've had a headache and a sore throat since yesterday. |  |
| 4 | Pharmacist | Try paracetamol for the headache, and these lozenges for the throat. |  |
| 5 | Customer | How often should I take the paracetamol? |  |
| 6 | Pharmacist | One every four to six hours, no more than eight in a day. |  |
| 7 | Customer | Are they all right to take with food? |  |
| 8 | Pharmacist | Yes, with or after food is best. |  |
| 9 | Customer | Thank you. Could I also get a packet of plasters? |  |
| 10 | Narrator | 19. 20. 21. Wednesday. Thursday. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 7 · Directions — *Past the church and the post office*

*Difficulty: intermediate · 11 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Tourist | Excuse me, do you know how to get to the nearest supermarket? |  |
| 2 | Local | Yes, it's about a ten minute walk. Go straight along this road. |  |
| 3 | Tourist | Past that church? |  |
| 4 | Local | Yes, past the church and the post office. |  |
| 5 | Local | At the second roundabout, take the first exit. |  |
| 6 | Tourist | And then? |  |
| 7 | Local | You'll see the supermarket on your left, just opposite the bus stop. |  |
| 8 | Tourist | Wonderful. And is there a cashpoint nearby? |  |
| 9 | Local | Yes, there's one on the high street, next to the bakery. |  |
| 10 | Tourist | Thank you very much. You've been very helpful. |  |
| 11 | Narrator | 30. 40. 50. Friday. Saturday. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 8 · Taxi

*Difficulty: beginner · 10 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Passenger | Hello. Can you take me to the train station, please? |  |
| 2 | Driver | Yes, of course. It may take some time, there's a lot of traffic at the moment. |  |
| 3 | Passenger | About how long do you think it will take? |  |
| 4 | Driver | Perhaps about twenty minutes, if we're not unlucky with the traffic lights. |  |
| 5 | Passenger | Do you know where I can get a ticket in the station? |  |
| 6 | Driver | Yes, I'll drop you right by the ticket office. |  |
| 7 | Driver | Here we are. That's twelve pound fifty. |  |
| 8 | Passenger | Could I pay by card? |  |
| 9 | Driver | Yes, of course. The machine is just here. |  |
| 10 | Narrator | 100. 200. 1000. Sunday. 12 o'clock. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 9 · Extra phrases

*11 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Learner | How much is that? |  |
| 2 | Learner | Can you tell me how much that is? |  |
| 3 | Learner | How much does it cost to get a taxi into town? |  |
| 4 | Learner | How much does it cost to get a bus into town? |  |
| 5 | Learner | Where can we get a bus? |  |
| 6 | Learner | Where can we get a taxi? |  |
| 7 | Learner | Four single tickets to town, please. |  |
| 8 | Learner | Two return tickets to town, please. |  |
| 9 | Learner | I prefer to try to speak your language, I think it's polite. |  |
| 10 | Learner | I'm sorry I can't speak very quickly. |  |
| 11 | Narrator | 100,000. 60. 70. 1 o'clock. 11 o'clock. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 10 · Extra phrases

*11 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Learner | But if you can speak slowly I think we'll be able to manage. |  |
| 2 | Learner | You spoke a little too quickly, so I'm not sure if I understood. |  |
| 3 | Learner | Can we try again? |  |
| 4 | Learner | Can we see the menu? |  |
| 5 | Learner | Can we see the dessert menu also? |  |
| 6 | Learner | Do you have anything to eat? |  |
| 7 | Learner | Can we pay? |  |
| 8 | Learner | Can we pay by card? |  |
| 9 | Learner | No, we only take cash. |  |
| 10 | Learner | I'm sorry, I don't have any cash. |  |
| 11 | Narrator | A million. 80. 90. 2 o'clock. 10 o'clock. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 11 · Extra phrases

*11 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Learner | Is there a cash machine near here? |  |
| 2 | Learner | Do you want to pay by cash or card or put it on the room? |  |
| 3 | Learner | Can we put it on the room, please? |  |
| 4 | Learner | Would you like to pay by cash or card or on the room? |  |
| 5 | Learner | Did you want to pay by cash or card? |  |
| 6 | Learner | We'll pay by card again, please. |  |
| 7 | Learner | It's hot today, again. |  |
| 8 | Learner | Is the water warm? |  |
| 9 | Learner | No, it's a little cold today. |  |
| 10 | Learner | It's not bad. |  |
| 11 | Narrator | 3 o'clock. 9 o'clock. January. February. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 12 · Extra phrases

*11 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Learner | That's a bad idea. |  |
| 2 | Learner | Do you have any orange juice? |  |
| 3 | Learner | Do you have any apple juice? |  |
| 4 | Learner | Does the boat leave from here? |  |
| 5 | Learner | Does the bus leave from here? |  |
| 6 | Learner | Where does the bus leave from? |  |
| 7 | Learner | Is that correct? Am I correct? |  |
| 8 | Learner | Am I wrong about that? |  |
| 9 | Learner | I'm sorry, my son lost his ticket. |  |
| 10 | Learner | We have paid, but my daughter has lost her ticket. |  |
| 11 | Narrator | 4 o'clock. 8 o'clock. March. April. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 13 · Extra phrases

*11 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Learner | That makes me happy. |  |
| 2 | Learner | That makes me feel a little worried. |  |
| 3 | Learner | When you talk quickly, it makes me feel stupid. |  |
| 4 | Learner | Is it okay if I sit here? |  |
| 5 | Learner | Is it okay if we put this here? |  |
| 6 | Learner | I don't want to be late. |  |
| 7 | Learner | Are we going to be late? |  |
| 8 | Learner | I promise I won't be late. |  |
| 9 | Learner | I promise we won't be late. |  |
| 10 | Learner | I'd like two scoops of ice-cream, please. |  |
| 11 | Narrator | 5 o'clock. 7 o'clock. May. June. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 14 · Extra phrases

*11 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Learner | Can I have one scoop of chocolate and one of strawberry? |  |
| 2 | Learner | And then another cone with one scoop of lemon and one of blueberry. |  |
| 3 | Learner | Do you have any ice-cream? |  |
| 4 | Learner | Thank you for all your work. |  |
| 5 | Learner | I wish you good luck with everything. |  |
| 6 | Learner | Thank you for helping me. |  |
| 7 | Learner | Good luck with that! |  |
| 8 | Learner | That's very kind of you. |  |
| 9 | Learner | You're very kind. |  |
| 10 | Learner | Thank you for being so friendly. |  |
| 11 | Narrator | 6 o'clock. July. August. September. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 15 · Extra phrases

*14 sentences*

| # | Speaker | English | Notes |
|---|---------|---------|-------|
| 1 | Learner | It sounds as though we need to leave soon. |  |
| 2 | Learner | It sounds as though you want us not to do that. |  |
| 3 | Learner | Is there a toilet here? |  |
| 4 | Learner | Can you tell me where the toilet is? |  |
| 5 | Learner | It's down there on the left. |  |
| 6 | Learner | It's down there on the right. |  |
| 7 | Learner | Can you say that again? |  |
| 8 | Learner | Yes, I said it's over there. |  |
| 9 | Learner | What is that? |  |
| 10 | Learner | What is that over there? |  |
| 11 | Learner | Would you like to order some drinks? |  |
| 12 | Learner | Do you want to order some drinks first? |  |
| 13 | Learner | Did you want something to drink first? |  |
| 14 | Narrator | October. November. December. | vocab coda — numbers/colours/days drip (canon v2, Aran 2026-06-10) |

## 16 · First conversation

*11 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Learner | Would you mind if I tried to practise speaking [target language] with you? I haven't been learning for very long, and I still feel a little nervous about speaking with other people. |
| 2 | Friend | Of course, no problem. You seem to speak it very well. I can understand you easily. |
| 3 | Learner | Thank you, that's good to know. I need to learn more words, and I need to practise listening. I don't understand people very well when they don't speak slowly. |
| 4 | Friend | Am I speaking slowly enough for you now? |
| 5 | Learner | Yes, thank you. It's easier talking to just one person. It's a bit difficult thinking of something to say, though. I'm not sure what to say, but I feel as if I can speak enough to start having conversations. |
| 6 | Friend | I think you're doing very well. I'm impressed. I think you're ready to start speaking [target language] to anyone who speaks [target language]. |
| 7 | Learner | It's just a little frustrating when I can't think quickly enough to express myself properly. But I know that I need to keep practising if I want to speak more confidently. |
| 8 | Friend | You should be confident already. I think you're doing much better than you realise. I feel comfortable speaking with you, and I'm not talking very slowly. |
| 9 | Learner | This is exactly the kind of practice I need. I think I can feel it changing my brain while we're talking! I really appreciate your help. But it's surprising how tired I get when I'm talking in a language I don't speak very well. |
| 10 | Friend | I think that's normal. Learning a new language is difficult. But it's so much fun when you start to have conversations, isn't it? |
| 11 | Learner | It really is. I'm really happy that I can have this much of a conversation. And I hope we'll be able to have more conversations in the future as I keep on getting better. |
