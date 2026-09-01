# Hospitality conversations v1
## Complete linear flows: the worker and the guest, the worker and the shift

**What this is:** the canonical English dialogue for the hospitality themed walk — authored
2026-09-01, from nothing. There was no hospitality corpus before this file
(`services/shared/metagraph/proposed/hospitality-2026-08-30.json` records `"corpus": "NONE"`);
the encounter inventory it covers (E1–E16) was derived by
`docs/sector-pods/hospitality-metagraph-mapping-2026-08-30.md`, and this file is the dialogue
that covers it. Every interaction is written as complete conversations that run start to
finish — worker, guest, worker, guest — six turns to a flow, each flow a coherent path a real
conversation could take. Between them the flows for each interaction cover the main response
families and their recoveries.

**The canonical layer:** English known side only. No target language, no pair, no course code.
Languages are named deictically throughout — the learner says "your language" and "mine", the
other party says "mine" and "yours" — so the walk instantiates in any pair without a template
slot. Names, dish names and prices are slot content.

**Scene 0 comes first, always.** The medium contract (N1201) sits at the front of every walk
unconditionally: `services/shared/metagraph/walks/core-scene-0.json` (W1201–W1204, the offer)
and `core-scene-0-notice.json` (W1401, the notice) are ratified, referenced here, and not
re-authored. Contexts 1.0 and 2.0 below are this walk's own staff-seat instantiations of the
same shape — the worker making the offer from behind the counter rather than in front of it —
and they resolve against scene 0 in the companion document
(`docs/sector-pods/hospitality-walk-2026-09-01.md`) rather than replacing it.

**Reading the labels:** each flow has a short tag saying which path it threads (*happy path*,
*question*, *problem*, *safety-critical ⚠*, *human moment*). **W** = the hospitality worker —
the learner's seat, on the floor, at the bar, on the desk, at the pass. **G** = guest.
**C** = chef or kitchen. **K** = colleague (another worker on the shift). **M** = manager.
**⚠** marks the safety-critical lines a learner must catch first time — in this register that
is the allergy chain, end to end.

**The register, in one line:** hospitality is serving someone who is already uncomfortable —
hungry, tired, late, lost or disappointed — so its signature moves are the apology that does
not over-apologise, the substitution offered when the wanted thing is gone, the complaint
received without defensiveness, and the check-back mid-service.

---

# Part 1: The floor and the desk

## 1.0 Linguistic situation opener (guest-facing)

### Flow 1 *(happy path)*
- **W:** "Evening — just so you know, I'm learning your language, and I'd like to look after you in it tonight if that's alright. If I get stuck, I might have to ask you to switch to mine for a moment."
- **G:** "Good for you! Of course that's alright. We're in no hurry at all."
- **W:** "Thank you. And if I say anything odd, just tell me — I'd rather be told."
- **G:** "We will, don't worry. You sound fine to me so far."
- **W:** "Right then. Can I get you some drinks while you look at the menu?"
- **G:** "Two glasses of the house white, please. And some water for the table."

### Flow 2 *(question)*
- **W:** "I'll be looking after you tonight. Fair warning — I'm still learning your language, so stop me if I lose you."
- **G:** "You're doing well by the sound of it. How long have you been at it?"
- **W:** "About a year now. Working here is the best practice there is — you lot never stop talking."
- **G:** "Ha! True enough. Well, you'll get no mercy from this table."
- **W:** "That's exactly what I'm after. Now — anything to drink while you're deciding?"
- **G:** "Go on then. A pint of the bitter and a lemonade, please."

### Flow 3 *(problem — the stakes carve-out)*
- **W:** "Just so you know, I'm learning your language, so bear with me — and stop me if anything I say isn't clear."
- **G:** "That's fine for the chat, love. But there's a nut allergy at this table, and for that bit I want to be word-perfect — can we do the allergy in yours?"
- **W:** "Of course — that's the right call. Anything about the allergy, we do in mine, and I'll say it back to you so we're sure."
- **G:** "Thank you. It's my daughter — it's serious, so we don't take chances."
- **W:** "You're not taking one tonight either. I'll go through the menu with the kitchen before you order anything."
- **G:** "That's put my mind at rest. We'll have a look at the menu, then."

---

## 1.1 The welcome, the booking, the walk-in

### Flow 1 *(happy path)*
- **W:** "Good evening — welcome. Do you have a booking with us?"
- **G:** "We do. Two of us, under the name Davies."
- **W:** "Davies, table for two — here you are. Can I take your coats?"
- **G:** "Oh, lovely — thank you. It's wild out there tonight."
- **W:** "So I hear. You're by the window — follow me, and I'll bring you the menus."
- **G:** "Perfect. Lead the way."

### Flow 2 *(problem — no booking found)*
- **W:** "Good evening. What name is the booking under?"
- **G:** "Hughes. Eight o'clock, for four."
- **W:** "Hmm — I've got nothing under Hughes tonight. Could it be booked under the company, or under someone else's name?"
- **G:** "Oh — try Pritchard, maybe. My colleague booked it."
- **W:** "Pritchard, there we are — four at eight. Panic over. Come through."
- **G:** "Phew! I was already planning who to blame."

### Flow 3 *(problem — the walk-in, with bounds)*
- **W:** "Good evening — have you booked with us tonight?"
- **G:** "No, we just chanced it. Any hope for two?"
- **W:** "Let me see. I can do you a table at quarter past nine, if you're happy to be out by quarter to eleven."
- **G:** "Quarter past nine… that's a bit of a wait, isn't it?"
- **W:** "It is, I'm sorry — we're full till then. But the bar's warm, and I'll come and fetch you the moment it's free. Can I get you a drink while you wait?"
- **G:** "Oh, go on then. Two halves of cider, and we'll take the table."

---

## 1.2 Check-in at the desk

### Flow 1 *(happy path — the walk-through)*
- **W:** "Good afternoon — welcome. What name is the booking under?"
- **G:** "Jones. A double, three nights."
- **W:** "Jones, double room, three nights — all correct. Here's your key: room 204, second floor, the lift's just behind you. Breakfast is seven till ten, and checkout's eleven."
- **G:** "Seven till ten — wonderful. Is there anywhere to eat nearby tonight?"
- **W:** "Plenty. Ask me when you come down and I'll point you somewhere good."
- **G:** "We'll do that. Thank you — you've been very helpful."

### Flow 2 *(question — the early arrival)*
- **W:** "Good morning — welcome. Checking in?"
- **G:** "Trying to! I know we're early. Is the room ready?"
- **W:** "Not quite yet, I'm afraid — housekeeping have it till two. But I can take your bags now, and you're welcome to sit in the lounge — the coffee's on us."
- **G:** "That's kind. We've been on the road since six, see."
- **W:** "Then you've earned the sofa. I'll come and find you the moment the room's ready."
- **G:** "Perfect. We'll be the two asleep by the fire."

---

## 1.3 Taking the order

### Flow 1 *(happy path — the option chains)*
- **W:** "Are you ready to order, or do you need another minute?"
- **G:** "We're ready. I'll have the steak, and she'll have the sea bass."
- **W:** "Lovely. How would you like the steak cooked?"
- **G:** "Medium-rare, please. And can we have a bowl of chips for the table?"
- **W:** "Medium-rare, and chips for the table. So that's one steak medium-rare, one sea bass, chips to share. Anything else to drink?"
- **G:** "That's everything. Well remembered!"

### Flow 2 *(problem — sold out, the substitution)*
- **W:** "What can I get you tonight?"
- **G:** "The sea bass for me, please."
- **W:** "Ah — I'm sorry, the sea bass is finished tonight. The hake is from the same boat, if that helps — it's very close."
- **G:** "Oh. I'd set my heart on the bass, rather."
- **W:** "I know — it went early, it always does. The hake's what I'd have in your shoes, and if it's not right, tell me and we'll sort it."
- **G:** "Go on then, the hake. You've talked me into it."

### Flow 3 *(question — the guest can't choose)*
- **W:** "Have you decided, or shall I give you a minute?"
- **G:** "Honestly, I can't choose. What's good tonight?"
- **W:** "Depends what you're after. If you're hungry, the lamb — it came in this morning, and it's what I'd have. If you want something lighter, the bream."
- **G:** "Nothing too heavy for me tonight."
- **W:** "Right, then the bream — and I'd start with the soup, they're good together."
- **G:** "Sold. The soup and the bream it is."

---

## 1.4 The recommendation and the concierge

### Flow 1 *(happy path — the upsell, offered once)*
- **W:** "Just the two mains, was it? I'll say one thing before I send it — the tasting menu tonight is the chef's good mood on a plate, and it's only a little more."
- **G:** "Oh? What's on it?"
- **W:** "Five small courses — the crab, the lamb, and three surprises. If you're celebrating, it's the way to do it."
- **G:** "We are, as it happens. Go on then — twist our arms."
- **W:** "Consider them twisted. Two tasting menus — and I'll bring you the wine that goes with it, shall I?"
- **G:** "In for a penny. Yes please."

### Flow 2 *(happy path — the desk concierge)*
- **W:** "Off out tonight? Anything I can point you towards?"
- **G:** "We were hoping for somewhere to eat. Nothing fancy — somewhere you'd go."
- **W:** "Then you want the little place on the harbour — ten minutes' walk, down the hill and left at the water. Shall I ring and book you a table?"
- **G:** "Would you? Eight o'clock, for two."
- **W:** "Leave it with me. Down the hill, left at the water — I'll have them hold you a table for eight, under Jones."
- **G:** "Down the hill, left at the water. You're a marvel."

---

## 1.5 The allergy ⚠

### Flow 1 *(safety-critical ⚠ — declared, checked, recorded)*
- **W:** "Before I take the order — any allergies or intolerances at the table?"
- **G:** ⚠ "Yes — a nut allergy, my daughter. It's serious."
- **W:** ⚠ "Thank you for telling me. Say it back to me so we're sure: one nut allergy, for your daughter, and it's serious. I'll check everything she orders with the kitchen before it goes on."
- **G:** "That's it exactly. She was thinking of the pesto pasta."
- **W:** ⚠ "The pesto has pine nuts, so we'll steer clear of that. Let me check the dressing with the kitchen and come straight back — and it goes on her ticket, so everyone behind me knows too."
- **G:** "Thank you. You've no idea how much easier that makes the evening."

### Flow 2 *(safety-critical ⚠ — the honest bound)*
- **W:** "You mentioned the nut allergy — I've been through it with the kitchen, so let me tell you exactly where we stand."
- **G:** "Please. We'd rather know straight."
- **W:** ⚠ "I can't promise the fryer is nut-free — so nothing fried, I won't stand behind it. The grilled dishes I can stand behind completely."
- **G:** "That's honest of you. So the grilled chicken is safe?"
- **W:** ⚠ "The grilled chicken is safe — the kitchen have confirmed it, and it's flagged on the ticket. If anything changes, I come and tell you before it's cooked, not after."
- **G:** "Then she'll have the grilled chicken, and I'll stop holding my breath."

### Flow 3 *(question — the intolerance, lighter stakes)*
- **W:** "Any allergies or intolerances I should know about?"
- **G:** "No allergies — but I can't have dairy. It doesn't kill me, it just ruins the film after."
- **W:** "Understood — no dairy, and we'll spare the film. The soup has cream in it, so not that one. The broth is safe, and so's the bream if we do it without the butter."
- **G:** "Can they really do it without the butter? I don't want to be a nuisance."
- **W:** "You're not a nuisance, you're a Tuesday. The kitchen does it all the time — I'll put it on the ticket."
- **G:** "Then the broth and the bream, and thank you for not making it a fuss."

---

## 1.6 The check-back and the complaint

### Flow 1 *(happy path — the ritual close)*
- **W:** "How is everything over here?"
- **G:** "Lovely, thanks. The lamb's perfect."
- **W:** "Glad to hear it. Can I get you anything else — more water, another glass of the red?"
- **G:** "We're all set. Actually — one more bowl of chips. They're dangerous."
- **W:** "Got it — one more bowl of the dangerous chips. Anything for the little one?"
- **G:** "No, she's happy. Look at her — chips first, chicken never."

### Flow 2 *(problem — the complaint, repaired)*
- **W:** "How are we doing here — everything alright?"
- **G:** "Actually — this is lukewarm. I didn't want to make a thing of it."
- **W:** "I'm glad you told me, and I'm sorry about that. I'll get it re-fired now — it'll be five minutes, no more."
- **G:** "Thank you. It's a shame, because it tastes lovely."
- **W:** "It'll taste lovelier hot. Here it comes — and the coffees after are on us, for the wait."
- **G:** "Well now. That's handsomely done. Thank you."

### Flow 3 *(problem — the repair isn't enough, the escalation)*
- **W:** "I've brought the re-fired plate — how is it now?"
- **G:** "Honestly? Still not right. And it's our anniversary, and I'm sorry, but I'm past it now."
- **W:** "Then I'm not going to stand here talking you round. Let me get the manager for you — she can do things I can't."
- **G:** "I don't want a scene. I just want it dealt with."
- **W:** "No scene, I promise. You've been patient and it wasn't good enough — that's all she'll hear from me. Two minutes."
- **G:** "Alright. Thank you for not arguing with me."

---

## 1.7 Refusing the guest ⚠

### Flow 1 *(problem — the refusal, absorbed)*
- **W:** "I'm sorry — I can't serve you another one. It's my licence, not my choice."
- **G:** "Come on. It's a birthday! One more."
- **W:** "Happy birthday — and the answer's still no, because it has to be. Water's free, and I'll call you a taxi whenever you want."
- **G:** "Ah, you're only doing your job, I suppose."
- **W:** "That's exactly it. And the first coffee's on me if you're staying for the cake."
- **G:** "Go on then. Coffee and cake, like my nan's house."

### Flow 2 *(problem — the refusal contested)*
- **W:** "I can't serve you, I'm afraid. It's the law, not my opinion."
- **G:** "You served him ten minutes ago! Same round!"
- **W:** "I did — and I'm not serving him again either. The rule doesn't move: it's my licence on the bar."
- **G:** "This is ridiculous. Who's above you, then?"
- **W:** "You're welcome to speak to the manager — she'll tell you the same, but she'll tell you kindly. Meanwhile there's water on the bar and a taxi number by the door."
- **G:** "Fine. Get her, then. But I'm telling her you were polite about it."

### Flow 3 *(safety-critical ⚠ — the second no, and the process)*
- **W:** "I've said no twice now, and I mean it kindly, but it's finished: no more drinks tonight."
- **G:** "One. More. Pint. What's it to you?"
- **W:** ⚠ "It's my licence, and it's you getting home in one piece. I'm asking you to leave now — you can come back any other night."
- **G:** "And if I don't?"
- **W:** ⚠ "Then the door staff will walk you out, and I'd much rather you walked yourself. Your coat's here, and the taxi's three minutes away — I've already rung it."
- **G:** "…Give me the coat. Three minutes, you said?"

---

## 1.8 The narrated intrusion

### Flow 1 *(happy path — licence sought, counter-conditioned)*
- **W:** "Are you still working on that, or can I take it?"
- **G:** "Still picking, if that's alright. We're slow eaters in this family."
- **W:** "Take all the time you like. Shall I come back in ten?"
- **G:** "Ten's perfect. You can take the bread board, though — we've demolished that."
- **W:** "The bread board it is, and the rest stays put. More water while I'm here?"
- **G:** "Yes please. You're very good at hovering without hovering."

### Flow 2 *(problem — halted mid-act)*
- **W:** "Let me get these glasses out of your way."
- **G:** "No — leave the glasses! Sorry. There's a toast coming, when my son gets back from the bar."
- **W:** "Then the glasses stay exactly where they are — good catch. Shall I bring a fresh one for the toast-maker?"
- **G:** "Oh, would you? And one for his girlfriend — she's parking the car."
- **W:** "Two fresh glasses, and I'll vanish till the speech is done. Wave when you want me."
- **G:** "You're a pro. It's the wave, then."

---

## 1.9 The bill and the reckoning

### Flow 1 *(happy path — the reckoning)*
- **W:** "Here's the bill whenever you're ready — no rush at all."
- **G:** "Thanks. What are we looking at?"
- **W:** "That's twelve pound fifty altogether — the coffees are on us from earlier, so they're not on there."
- **G:** "So they are — well remembered. Can we pay by card?"
- **W:** "Of course. There we are — and here's your receipt. Thank you for coming in."
- **G:** "Thank you. We'll be back for those chips."

### Flow 2 *(question — the line explained)*
- **W:** "The bill, when you're ready. Shout if anything looks odd."
- **G:** "Just one thing — what's this twelve and a half percent at the bottom?"
- **W:** "Good question — you're right to ask. It's a service charge, and it's discretionary — I can take it off, genuinely, no hard feelings."
- **G:** "No, leave it on — you've earned it. I just like to know what I'm paying."
- **W:** "Everyone should ask, honestly. So with the service that's forty-eight pounds altogether — card or cash?"
- **G:** "Card, please. And tell the chef the lamb was a triumph."

### Flow 3 *(problem — the line contested, the record decides)*
- **W:** "Here's the bill — have a look through before you pay."
- **G:** "Hang on — three bottles of wine? We only had two."
- **W:** "Let me check that against the till, one moment… You're quite right — two bottles. The third rang up from the wrong table. I'll take it off now."
- **G:** "Thank you. I wasn't trying to be difficult."
- **W:** "You weren't difficult, you were right — that's what the till's for. So that's thirty-one pound twenty altogether, with the correction."
- **G:** "Thirty-one twenty. There we are — and no harm done."

---

## 1.10 The guest's trouble

### Flow 1 *(problem — the bounded commitment)*
- **G:** "Excuse me — there's no hot water in 204."
- **W:** "I'm sorry about that — let's get it sorted. Maintenance are on until ten, so I'll have them up to you within the half hour."
- **G:** "And if they can't fix it tonight? I've been travelling all day — I just want a bath."
- **W:** "Then I'll move you — we have one twin left, and it's yours if the water isn't. Either way you get your bath tonight."
- **G:** "Alright. That's fair. I'll be in the room."
- **W:** "I've written it in the book, so it won't get lost between shifts. And I'll ring up either way before ten, so you're not waiting and wondering."

### Flow 2 *(happy path — the loop closed)*
- **W:** "Evening — I said I'd check: did maintenance sort you out last night?"
- **G:** "They did! Twenty minutes after we spoke. I had my bath and slept like a stone."
- **W:** "That's what I wanted to hear. And the water's behaving itself this morning?"
- **G:** "Piping hot. You run a tight ship here."
- **W:** "We have our moments. Breakfast's on till ten — the eggs are worth it."
- **G:** "Say no more. Point me at the eggs."

### Flow 3 *(problem — the fix fails, the redress)*
- **W:** "I have to be straight with you: maintenance couldn't fix the heating tonight — the part comes tomorrow."
- **G:** "Oh, for — we chose this place for a warm weekend. This is really disappointing."
- **W:** "You're right to be disappointed, and I'm sorry. Here's what I can do now: I'm moving you to the twin, which is warm, and tonight's room is off the bill."
- **G:** "The whole night off the bill?"
- **W:** "The whole night. You shouldn't pay for a cold room, and I don't need to ask anyone to do that — it's already done."
- **G:** "Well. That's more than I was going to ask for. Let's see this twin, then."

---

## 1.11 The booking on the phone

### Flow 1 *(happy path — no fit at eight, the counter)*
- **W:** "Good afternoon, the Harbour House — how can I help?"
- **G:** "I'd like to book a table. Saturday, eight o'clock, six of us."
- **W:** "Saturday for six… nothing at eight, I'm afraid — I can do half past six, or a quarter past nine."
- **G:** "Half six it is, then. The name's Ellis. Oh — and one of us is in a wheelchair."
- **W:** "Half past six, Saturday, six people, under Ellis, one wheelchair — I've put you at the big round table, there's proper room there. We hold the table fifteen minutes, and can I take a card to secure it? It's only charged if nobody shows."
- **G:** "That's all fine. Ready when you are."

### Flow 2 *(problem — the read-back is wrong)*
- **W:** "Let me read that back: a table for four, Saturday the eighth, at seven."
- **G:** "No, love — Friday the seventh. The Friday."
- **W:** "Friday the seventh — thank you, good catch. That's why I say it back. So: four people, Friday the seventh, at seven o'clock, under Morgan."
- **G:** "That's it now. It's my mother's eightieth, see, so it has to be right."
- **W:** "An eightieth! It's in the book, and I've written the birthday next to it — leave the rest with us."
- **G:** "Ooh, now I'm intrigued. Friday, then."

### Flow 3 *(problem — fully booked, the alternative)*
- **W:** "The Harbour House, good evening — how can I help?"
- **G:** "A table for two, tonight, about eight? Long shot, I know."
- **W:** "You're right, it is — we're fully booked tonight, I'm sorry. But our sister place on Duke Street usually has space midweek, and the kitchen's the same family."
- **G:** "Duke Street… is it as good? Be honest."
- **W:** "Honestly? The fish is better here, the puddings are better there. For a Tuesday, I'd go there and start with dessert."
- **G:** "Ha! That's the most useful review I've ever had. Duke Street it is."

---

## 1.12 The occasion disclosure

### Flow 1 *(human moment — acknowledged, not fixed)*
- **W:** "Here's the dessert menu — take your time."
- **G:** "Thank you. You know — this is our first trip away since my husband died. He'd have loved this place."
- **W:** "I'm glad you told me. He'd have been well fed here, by the sound of him."
- **G:** "Oh, he'd have had the lamb and half of my plate too. Listen to me — you've got tables waiting."
- **W:** "They can wait a minute more. You take your time with the menu — I'll come back when you wave."
- **G:** "Thank you, love. The sticky toffee, when you do."

### Flow 2 *(problem — the violation-by-fixing, recovered late)*
- **W:** "Someone said it's a special weekend — shall I send up champagne? On the house, of course."
- **G:** "Oh — no, please don't. It's not that kind of weekend. My sister's just out of hospital — we're here to be quiet together."
- **W:** "I'm sorry — I jumped to the wrong thing. I'm glad she's out, and quiet we can absolutely do."
- **G:** "Thank you. Everyone means well, but the fuss is the tiring part, see."
- **W:** "Understood — no fuss from us. If anything would make the weekend easier, just tell me; otherwise we'll leave you both be."
- **G:** "That's exactly right. A quiet corner at breakfast is all we need."

---

## 1.13 The regulars

### Flow 1 *(human moment — across the weeks)*
- **W:** "You're back! How was the wedding?"
- **G:** "Rained on and perfect. My feet have only just recovered."
- **W:** "The best ones ruin your feet. The usual table, and the usual pot of tea?"
- **G:** "You know me too well. And one of those almond things, if there's any left."
- **W:** "Saved you one — I had a feeling. Sit down and I'll bring it over."
- **G:** "This is why I don't go anywhere else, you know."

### Flow 2 *(question — small talk both ways)*
- **W:** "Busy week, Mr Pritchard? You look like a man who's earned his pint."
- **G:** "Don't ask. Stocktake. And you — always this busy in here on a Tuesday?"
- **W:** "Doubles on a Tuesday — that's the new normal, isn't it? Tell me about it."
- **G:** "The whole town's decided Tuesday's the new Friday. Nobody consulted us."
- **W:** "Nobody ever does. The usual, or are you feeling adventurous?"
- **G:** "Tuesday's quite adventurous enough. The usual, please."

---

## 1.14 The guest with little English of ours — the seats reversed

*(The learner sits on the fluent side for the first time: a visiting guest is struggling in the
local language, and the worker — still a learner themselves — does the slowing-down and the
reformulating. The repair never proposes a third language; the menu and the fingers do the work.)*

### Flow 1 *(problem — the reformulation)*
- **G:** "Sorry… I want… the fish? Fish of today?"
- **W:** "You're doing fine. Yes — the fish today is the hake. It comes with potatoes. Would you like that?"
- **G:** "Hake…? I don't know this word."
- **W:** "No problem, let me say it another way. A white fish — soft, not strong. Here, this one on the menu — I'll point: this is the hake."
- **G:** "Ah! Yes. This one. And… small beer?"
- **W:** "One hake, and a small beer. Good choices — you ordered that all yourself, by the way."

### Flow 2 *(human moment — the encouragement)*
- **G:** "The bill… please? Sorry, my words are little."
- **W:** "Your words are doing the job — that's all words are for. Here's the bill: that's nine pounds altogether."
- **G:** "Nine… pounds. Here you are. Is right?"
- **W:** "That's exactly right. And 'here you are' was perfect — I'm learning this language too, you know."
- **G:** "You also?! It is hard, yes?"
- **W:** "It's hard, and then one day it's Tuesday and it's easier. Come back and practise on us — we're free."

---

# Part 2: The shift

*(The learner's other family of encounters: worker to worker. The costliest failure in this
register is worker-to-worker — the allergen chain is a relay, and the dropped baton kills in the
back-of-house, not at the table. That is why the ⚠ lines below live at the pass.)*

## 2.0 Linguistic situation opener (shift-facing)

### Flow 1 *(happy path — the first shift)*
- **W:** "Before service — you should know I'm learning your language. I'll stay in it as much as I can, but if I get stuck mid-rush I'll switch to mine rather than slow the pass down."
- **C:** "Fair enough. On the pass, clear beats clever — say it however it comes out fastest."
- **W:** "That's what I figured. And if I call something wrong, shout — I'd rather be shouted at than send the wrong plate."
- **C:** "Oh, I'll shout. Ask anyone. Numbers first, always: table, then dish. You'll pick it up."
- **W:** "Table, then dish. Got it. Where do you want me tonight?"
- **C:** "Section by the window, with Marta. She talks even more than the customers — you'll be fluent by Friday."

### Flow 2 *(problem — the rush carve-out)*
- **W:** "Can I try running the pass calls in your language tonight? I need the practice."
- **C:** "Not mid-service — the pass is no place for a muddle, and Saturday's a zoo. We do service in yours."
- **W:** "Understood. Service in mine, no argument."
- **C:** "But after close, when we're cleaning down? All you like. I'll even slow down for you, which is more than I do for the owner."
- **W:** "Deal. And the allergy calls — those stay in whichever's clearest, always?"
- **C:** ⚠ "Allergy calls stay in whatever the whole kitchen understands first time, every time. That one's not about your learning, and you already know it."

---

## 2.1 The pre-service briefing

### Flow 1 *(happy path — the lineup)*
- **K:** "Right, tonight: the special's the crab linguine, and the sea bass is low — maybe eight portions, so don't oversell it."
- **W:** "Crab special, bass is low. What's in the crab — any of the usual suspects?"
- **K:** "Good question — shellfish obviously, and there's chilli in it, so warn the timid. Table fifteen is an anniversary: dessert plate's written, it's on the house."
- **W:** "Fifteen, anniversary, dessert on the house. Who's running the terrace?"
- **K:** "You are, with Marta — you've not run it before, right? Stay on her shoulder for the first hour."
- **W:** "On her shoulder, hour one. Ready when you are."

### Flow 2 *(problem — the briefing missed, re-run at speed)*
- **W:** "Marta — quick one, mid-service: what did I miss about the crab? A guest just asked and I blanked."
- **K:** "Chilli. There's chilli in it — that's the thing people want to know."
- **W:** "Chilli in the crab, got it. And the bass — are we still selling it?"
- **K:** "Dead as of ten minutes ago — chef 86'd it. Push the hake."
- **W:** "Bass dead, push the hake. Sorry — I should have caught the lineup properly."
- **K:** "You caught it now, that's what matters. Go — your window couple are waving."

---

## 2.2 The 86 and the pass

### Flow 1 *(happy path — the call relayed)*
- **C:** "86 the sea bass! Last one just went."
- **W:** "Heard — 86 the bass. I've got a table mid-order on it, so I'll go and turn them around now."
- **C:** "Do that. The hake's good and I've got plenty."
- **W:** "Hake it is. And Marta's section — does she know?"
- **C:** "You're relaying it, so she will in a minute, won't she?"
- **W:** "On my way. 86 the bass, long live the hake."

### Flow 2 *(question — the sequencing negotiation)*
- **W:** "Chef — I need mains on twelve held. They're mid-speech out there, glasses up and everything."
- **C:** "How long? Five minutes I can do. Twenty, and it's re-fired and you're paying me in pints."
- **W:** "It's a short speech — the best man's already lost his notes. Call it eight."
- **C:** "Eight, then, and not a second more — the fish won't forgive either of us."
- **W:** "Understood — held for eight, and I'll give you the nod the moment the glasses come down."
- **C:** "Watch for my hand. And tell the best man he owes the kitchen a round."

### Flow 3 *(problem — the relay failed, the own-fault admission)*
- **W:** "Chef — my fault: table nine ordered the bass after the 86. I never relayed it to myself, basically — I took the order on autopilot."
- **C:** "The bass I don't have. So what have you told them?"
- **W:** "Nothing yet — I came to you first. I'll offer them the hake and tell them straight it was my mistake, not the kitchen's."
- **C:** "Right answer, twice. Hake's four minutes, and I'll bump it up the queue."
- **W:** "Thanks, chef — the re-fire's on me. Anything to sweeten it for them?"
- **C:** "Send the good bread while they wait. And stop ordering on autopilot — you're better than that."

---

## 2.3 The stop call at the pass ⚠

### Flow 1 *(safety-critical ⚠ — the learner stops the plate)*
- **W:** ⚠ "WAIT — twelve is the nut allergy. Is that the satay? Don't send it."
- **C:** "Hands off the plate. Talk to me — what's twelve, exactly?"
- **W:** ⚠ "Nut allergy, serious, it's on the ticket — and satay's peanut through and through."
- **C:** "Ticket says… you're right. That plate was for fourteen, but they've swapped tables, so good catch either way. Twelve gets the grilled chicken."
- **W:** ⚠ "Confirming: twelve, grilled chicken, nut-safe. I'll carry it myself so it can't cross with anything."
- **C:** "Do that. That's what the stop call is for — never apologise for one."

### Flow 2 *(safety-critical ⚠ — the learner is stopped)*
- **C:** ⚠ "STOP — that dressing. Who's it for?"
- **W:** "Table six, the salad… oh no. Six is the dairy intolerance, isn't it."
- **C:** ⚠ "It is, and that dressing's half cream. Fresh salad, oil and lemon — two minutes. Nothing's happened; that's why we stop things."
- **W:** "Fresh salad, oil and lemon, for six. Thanks, chef — I'd have walked it straight over."
- **C:** "That's why the pass has two pairs of eyes. Check the ticket, then check it again."
- **W:** "Ticket, then again. It won't need catching twice."

### Flow 3 *(safety-critical ⚠ — the stop resented, and held)*
- **W:** ⚠ "Hold it — is there almond in that? Twelve is the nut allergy."
- **C:** "It's fine, it's the almond oil — it barely—"
- **W:** ⚠ "Not for twelve it isn't. On allergies the stop call outranks everyone — you taught me that in week one."
- **C:** "…I did, didn't I. Alright. Plate's dead — remake without, three minutes."
- **W:** "Thank you, chef. I'll tell the table their food's three minutes out and worth it."
- **C:** "And you were right to dig in. Mid-rush I forget my own rules — that's exactly when they matter."

---

## 2.4 The shift handover

### Flow 1 *(happy path — the state of the floor)*
- **W:** "Right, handover: nine's on desserts and they're comped — check on them, they've had a night. Twelve is a nut allergy, it's on the ticket. The window couple are pre-theatre — they need the bill by twenty past seven."
- **K:** "Nine comped and minded, twelve nuts, window billed by seven-twenty. What's open besides?"
- **W:** "One thing in flight: 204's heating — maintenance are coming back tomorrow, it's all in the book, and the guest knows. Float's counted, forty in the tin."
- **K:** "In the book, float's forty. Anything about the specials?"
- **W:** "Crab's got chilli in it — say so before they order, not after. And the bass is long gone, push the hake."
- **K:** "Chilli warned, hake pushed. Go home — I've got it from here."

### Flow 2 *(problem — the incoming worker wasn't told)*
- **K:** "Why is table nine asking me about a free dessert? Nobody told me anything about nine."
- **W:** "It's in the book — look: 'nine comped, rough night, check on them.' I wrote it before I did the bins."
- **K:** "…So it is. I came in through the kitchen and never opened the book. My fault."
- **W:** "No blame — but the book's the handover, not me. If I'm gone and it's written, it happened."
- **K:** "Fair. So what do I actually do with nine right now?"
- **W:** "Smile, bring the dessert, say it's on the house, and don't mention the muddle — they've had enough of a night without our admin."

### Flow 3 *(question — the learner receives the handover)*
- **K:** "Handing over: fifteen's mid-tasting-menu, two courses left, and the wine pairings are written on the ticket — don't freelance them."
- **W:** "Fifteen, two courses left, pairings as written. What else?"
- **K:** "The corner table asked for the manager earlier — it's resolved, but if they wave, fetch her, don't relitigate it yourself."
- **W:** "Corner waves, I fetch, I don't fix. Anything on the floor I should watch?"
- **K:** "The candle on eight is nearly out and the replacements are — honestly, I don't know where they live. Ask Marta, she knows where everything lives."
- **W:** "Candles via Marta. Go on, off with you — I've got it from here."

---

## 2.5 Cabin talk

### Flow 1 *(human moment — the post-mortem)*
- **K:** "That table nine, though."
- **W:** "Tell me about it. Three re-fires and a speech about the old chef. I aged a year."
- **K:** "You handled it, mind. The manager said so — 'didn't argue once', she said."
- **W:** "I argued plenty. Just inside my head, where it's legal."
- **K:** "That's the whole job, that is. Inside voice for the floor, outside voice for the cabin."
- **W:** "And a pint for both voices. Whose round is it?"

### Flow 2 *(question — the story challenged)*
- **K:** "So this stag do walks in — twelve of them — and I swear, the best man orders eleven pints and a glass of milk."
- **W:** "Come off it. Eleven pints and a milk? Nobody orders a milk."
- **K:** "On my life! The groom was driving — the milk was his."
- **W:** "A groom, driving, at his own stag? Now I know you're making it up."
- **K:** "Ask Marta! She poured the milk! She put a little umbrella in it and everything."
- **W:** "The umbrella I believe — that's exactly Marta. Fine: half a point for the milk, no points for 'eleven'."

### Flow 3 *(human moment — the mutual assessment after a bad one)*
- **K:** "Honest answer: how bad was tonight, one to ten?"
- **W:** "A seven. The heating thing, the bass thing, and the man who wanted the law changed for his birthday."
- **K:** "I'd say a six — you turned the anniversary table around, and that was heading for the reviews page."
- **W:** "They did leave smiling, didn't they. Alright, six and a half, and you get the half for the speech-hold at the pass."
- **K:** "Chef held it for eight whole minutes. I've never seen him hold a fish for eight minutes for anybody."
- **W:** "That's because nobody ever tells him the truth about the speech. Same again tomorrow?"

