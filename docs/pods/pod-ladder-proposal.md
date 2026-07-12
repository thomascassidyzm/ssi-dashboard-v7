# The Pod Ladder — Pods 0–3 to B2

*Proposal, 2026-07-12. Design only — nothing here is seeded. Scenario slates and sample
scenes for the listening-pods climb from transactional survival (pod-0, live) to real
podcast comprehension (pod-3). Companion pieces: `tools/seed-canonical-pods.cjs` (the
master format), `services/pod-generation-prompt.txt` (the canon-fidelity renderer).*

---

## 1. The shape of the climb

The claim this ladder rests on: **the distance from B1 listening to B2 listening is a
discourse-type distance, not a vocabulary distance.** A B1 learner who fails to follow a
podcast isn't missing words — they're missing the *moves*: turns that run to five
sentences, two people talking at once, a story with a digression in the middle, an
opinion wrapped in irony, one voice holding the floor for three minutes. So each pod
teaches a discourse type, and the specialist pods that follow (health, sport, the
economy…) only ever add domain vocabulary on top of moves the learner already owns.

- **Pod 0 — Transactions.** Two people, fixed roles, one line each. Live today.
- **Pod 1 — Social conversation.** Two equals, longer turns, telling yesterday and
  planning tomorrow, saying how you feel about it.
- **Pod 2 — Real discussion.** Three voices, disagreement, anecdote, interruption,
  hypothesis, humour — the moves of podcast *talk*.
- **Pod 3 — Extended speech.** One voice holding the floor: storytelling, explanation,
  argument, reportage — what a podcast mostly *is*.

A learner who finishes pod-3 at natural delivery speed has heard every discourse move a
general-interest native podcast will throw at them.

**Speed is a rendering knob, not a content property** — scenarios control content
complexity only; delivery pace is set at the audio phase (§3) and the same canonical
text can be re-rendered faster as a bridge between rungs.

The whole ladder fits the existing pipeline as-is: the canonical master format already
handles three speakers (pod-0's Coffee Shop has Customers 1–3) and a monologue is just
consecutive numbered lines from one speaker. Each pod is one master markdown seeded with
`node tools/seed-canonical-pods.cjs --file=… --slug=pod-N`. The only pipeline change the
ladder asks for is a per-pod register spec in the generation prompt (§7).

## 2. The ramp model

| Dimension | Pod 0 (live) | Pod 1 | Pod 2 | Pod 3 |
|---|---|---|---|---|
| **Discourse type** | Transactional exchange: order, ask, pay, thank | Social conversation between equals: catching up, recounting, arranging | Multi-party discussion: disagreeing, persuading, anecdote with audience, banter | Extended speech: monologue with light framing — story, explainer, review, reportage |
| **Turn length** | 1–2 sentences, strict alternation | 1–4 sentences; questions earn real answers | 1–5 sentences, uneven; turns get taken, held, and lost mid-sentence | One voice holds 12–20 consecutive sentences; second voice minimal or absent |
| **Speaker count** | 2 (server/customer roles) | 2 (friends, colleagues, neighbours) | 3 (occasionally 2 where the move demands intimacy) | 1, plus a host/interviewer bookend in some scenes |
| **Narrative time** | Present and immediate need ("I'd like…", "Can you take me…") | Past narration and future plans ("we went…", "I'll book…"), feelings about both | Hypotheticals and counterfactuals ("if you won…", "you'd be bored"), shared past, narrative present for anecdotes | Full range nested inside one telling: past-in-past, reported speech, digression and return, habitual past |
| **Abstractness** | Concrete objects and needs: coffee, tickets, painkillers | Personal experience and feeling: my weekend, my job, my plans | Opinions about things beyond the room: taste, money, fairness — argued, not just stated | Ideas held up and examined: why something works, what something means, the case for X |
| **Register range** | Polite-neutral only; please/thank-you formulas | Friendly-informal: contractions throughout, soft fillers ("actually", "to be honest") | Informal with humour: teasing, irony, blunt disagreement, false starts and interruptions | Chatty-broadcast: a presenter's warmth with a presenter's structure — signposting, rhetorical questions, callbacks |
| **Delivery speed** *(rendering knob — see §3)* | Careful | Steady | Natural | Natural / native podcast pace |

**CEFR anchors:** pod-1 ≈ A2+/B1 · pod-2 ≈ B1+/B2 · pod-3 ≈ B2.

Within each pod, the `Difficulty:` tag stays what it is in pod-0 today: a *within-pod*
ordering (beginner → intermediate → advanced relative to that pod's own climb), not an
absolute CEFR label.

## 3. Speed: the rendering ramp

Content complexity and delivery pace are separate axes, and keeping them separate buys a
cheap doubling of the ladder's rungs. Proposal:

- **Named render profiles**, set at the audio phase per pod (rate + inter-line gap):
  **careful** → **steady** → **natural** → **native**. Each pod ships at its home profile
  (table above).
- **Bridge re-renders**: the same canonical text re-rendered one profile faster is a new
  listening experience at zero authoring cost — pod-1 at *natural* is the on-ramp to
  pod-2; pod-2 at *native* is the on-ramp to pod-3. The learner re-hears material they
  already understand, at the speed of the next rung — comprehension confidence for the
  price of a TTS pass.
- Pace lives in two places: the TTS rate *and* the silence between lines. The gap
  matters as much as the syllable rate — real discussion has near-zero gaps and pod-2/3
  profiles should close them up even before the syllable rate climbs.
- All of this is audio-phase work under the normal approval gate; nothing in this
  proposal generates audio.

## 4. Scenario slates

### Pod 1 — Social conversation (≈ A2+/B1) — 14 scenes

| # | Title — subtitle | Diff. | Content note |
|---|---|---|---|
| 1 | The Journey In — *Terrible weather again* | beginner | Small-talk with a colleague: weather, transport, mild complaint — the softest entry from pod-0 |
| 2 | The Weekend — *What did you get up to?* | beginner | Past narration with feelings; the core "how was your weekend" exchange |
| 3 | Making Plans — *Saturday, half past one* | beginner | Future arrangement: proposing, adjusting a time, confirming |
| 4 | Family — *Two sisters and a dog* | beginner | Describing people, ages, who's like whom; comparisons |
| 5 | Under the Weather — *You should go home* | intermediate | Sympathy and gentle advice; feelings vocabulary in real use |
| 6 | How's the New Job? — *Better than the last one* | intermediate | Opinions about work, comparing past and present, likes and dislikes |
| 7 | The New Flat — *More space, less light* | intermediate | Describing a place, weighing pros and cons, a small decision |
| 8 | Photos on the Phone — *And this is the beach* | intermediate | Showing holiday photos: pointing, reacting, past narration in fragments that stay natural |
| 9 | Last Night's Film — *I nearly cried* | intermediate | Stating and comparing opinions; agreeing and gently disagreeing |
| 10 | Where I Grew Up — *A small town by the sea* | intermediate | Habitual past ("we used to…"), describing childhood places |
| 11 | Holiday Stories — *The wrong bus* | advanced | Recounting a trip including a small mishap — proto-anecdote, still two calm voices |
| 12 | What Are You Learning? — *A little every day* | advanced | Hobbies, intentions, hopes; meta-comfort for the learner (echoes pod-0's First Conversation) |
| 13 | Good News — *You're joking!* | advanced | Announcing news, congratulating, reacting; future plans with feeling |
| 14 | Catching Up — *It must be two years* | advanced | An old friend: mixed past/future in longer turns — the capstone, one step from pod-2 |

### Pod 2 — Real discussion (≈ B1+/B2) — 14 scenes

| # | Title — subtitle | Diff. | Content note |
|---|---|---|---|
| 1 | Choosing a Restaurant — *Not Italian again* | beginner | Three friends, mild disagreement, teasing, a decision reached |
| 2 | Planning the Trip — *Two votes to one* | beginner | Three-way negotiation: proposals, objections, compromise |
| 3 | Was It Any Good? — *Three stars, being generous* | beginner | Disagreeing about taste; defending an opinion without falling out |
| 4 | House Rules — *Whose turn is the washing-up?* | intermediate | Flatmates: mild conflict, complaint, humour, resolution |
| 5 | What Would You Do? — *Half a million pounds* | intermediate | Hypotheticals and counterfactuals; predicting each other's behaviour |
| 6 | The Dilemma — *Take the job or not?* | intermediate | Asking for and giving advice; weighing options aloud; hedging |
| 7 | Do You Remember…? — *No, it was a Tuesday* | intermediate | Shared reminiscing with corrections and disputed details |
| 8 | Crossed Wires — *I thought YOU booked it* | intermediate | A misunderstanding surfacing and being repaired — clarifying, paraphrasing, apologising |
| 9 | The Organisers — *A surprise party in three weeks* | advanced | Task talk with interruptions: delegating, checking, fast turn-latching (sequential cut-offs only — see the TTS rule below §5) |
| 10 | Whose Round Is It? — *Playful injustice at the pub* | advanced | Banter as its own discourse: mock outrage, callbacks, keeping score |
| 11 | Changing Someone's Mind — *Go on, one weekend* | advanced | Persuasion: making a case, conceding a point, holding a position |
| 12 | Winding Each Other Up — *You've told this story before* | advanced | Teasing and irony between people who know each other well — the hardest register in the pod |
| 13 | Big Questions — *Would money make you happy?* | advanced | Abstract discussion: generalising, qualifying, disagreeing about ideas rather than plans |
| 14 | The Anecdote — *Thirty people in the living room* | advanced | One speaker holds a story against live reactions and interruptions — the bridge to pod-3 |

### Pod 3 — Extended speech (≈ B2) — 13 scenes

| # | Title — subtitle | Diff. | Content note |
|---|---|---|---|
| 1 | The Interview — *Short questions, long answers* | beginner | A host asks little, a guest answers big: monologue in four-to-six-sentence blocks — the on-ramp |
| 2 | When I Was Ten — *The summer of the bicycle* | beginner | Childhood reminiscence: habitual past, sensory detail, one voice |
| 3 | How I Got Here — *A wrong turn in Spain* | beginner | Personal story with digressions, self-correction, and a callback ending |
| 4 | A Walk Through the Market — *Everything has a smell* | intermediate | Descriptive reportage: present-tense scene-painting, one voice moving through a place |
| 5 | How to Make Real Bread — *Flour, water, salt, patience* | intermediate | Process explanation: sequencing, warnings, asides |
| 6 | Why You Forget Names — *It's not your memory* | intermediate | An explainer: claim, evidence, three tips, sign-off — classic podcast segment structure |
| 7 | The Travel Diary — *Four trains and a ferry* | intermediate | Narrated journey: chronology with reflection woven in |
| 8 | The Big Match — *All over by half-time* | intermediate | Sports recap register: fast recount, evaluation, one voice with broadcast energy |
| 9 | The Review — *Worth your Sunday afternoon?* | advanced | Extended cultural review: summary without spoilers, judgement with reasons, a recommendation |
| 10 | A History of the High Street — *Before the supermarket came* | advanced | Local history piece: then-and-now structure, reported memories of others |
| 11 | The Week in Brief — *Three stories you missed* | advanced | News round-up register: compressed, signposted, neutral-warm |
| 12 | Making the Case — *Why everyone should learn to cook* | advanced | Structured argument: position, objections anticipated and answered, conclusion |
| 13 | Episode One — *A whole small podcast* | advanced | The capstone: host intro, main item, a listener's letter, sign-off — the full form in miniature |

Between them, pods 1–3 cover the full move inventory a general podcast needs:
recounting, arranging, describing, opining (pod-1); disagreeing, persuading, hedging,
conceding, interrupting, holding the floor, repairing misunderstanding, hypothesising,
teasing, backchannelling, anecdote-with-audience (pod-2); signposting, digression and
return, self-correction, rhetorical questions, enumeration, reported speech,
scene-painting, structured argument, broadcast framing (pod-3). Specialist pods (§6)
re-use these moves and add only vocabulary.

## 5. Sample scenes — for the taste-check

Written in the exact seedable master format (each pod's slate becomes its own
`english-pods-N.md`; scene numbers below match the slates). These are honest mid-band
samples, not showcase pieces: contractions throughout from pod-1; fillers, false starts
and interruptions from pod-2; broadcast structure in pod-3. Interrupted lines end with a
dash — the TTS treatment of cut-offs is an audio-phase question (§7).

**TTS renderability rule (owner constraint, 2026-07-12): no overlapping speech, ever.**
Every line renders as one voice at a time (xAI TTS). "Interruption" in these pods always
means a *sequential* cut-off — a line ends mid-thought on a dash, the next speaker starts
immediately — never two voices simultaneously. Liveliness comes from fast turn-latching
and tight inter-line gaps at render time, not crosstalk. Anything in a slate or sample
that reads as genuine talking-over must be re-authored as clean sequential turns.

### Pod 1 samples

## 2. The Weekend — *What did you get up to?*

*Difficulty: beginner · 14 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Emma | Morning! How was your weekend? |
| 2 | Dan | Really good, thanks. We went to the coast on Saturday. |
| 3 | Emma | Oh lovely. What was the weather like? |
| 4 | Dan | Beautiful in the morning. But it rained in the afternoon, so we found a little café and just sat there for two hours. |
| 5 | Emma | That sounds quite nice, actually. |
| 6 | Dan | It was. The kids weren't happy, though. They wanted to swim. |
| 7 | Emma | Did they go in the sea in the end? |
| 8 | Dan | They did, on Sunday morning. It was freezing, but they loved it. And what about you? Did you do anything? |
| 9 | Emma | Not much, to be honest. I was really tired after last week, so I stayed at home and read my book. |
| 10 | Dan | Which book? |
| 11 | Emma | The one about the lighthouse — I told you about it. I finished it last night. |
| 12 | Dan | Was it good? |
| 13 | Emma | I loved it. I cried at the end, actually. You can borrow it if you like. |
| 14 | Dan | Go on then. I need something for the train. |

## 3. Making Plans — *Saturday, half past one*

*Difficulty: beginner · 13 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Priya | Are you doing anything on Saturday? |
| 2 | Tom | Saturday… I'm taking my mum shopping in the morning, but I'm free after that. Why? |
| 3 | Priya | A few of us are going to that new place by the river for lunch. Do you want to come? |
| 4 | Tom | The one with the green tables? I've been wanting to try it for ages. |
| 5 | Priya | That's the one. We're thinking about one o'clock. |
| 6 | Tom | One might be a bit tight for me. Could we say half past? |
| 7 | Priya | Half past should be fine. I'll check with the others and let you know. |
| 8 | Tom | Perfect. Shall I book a table? It gets busy at the weekend. |
| 9 | Priya | Good idea. There'll be five of us — six if Katie comes. |
| 10 | Tom | I'll book for six, just in case. What's Katie doing these days? I haven't seen her since the summer. |
| 11 | Priya | She's been really busy — she started a new job last month. She'll tell you all about it on Saturday. |
| 12 | Tom | I look forward to it. Right, I'd better go. See you Saturday. |
| 13 | Priya | See you then. I'll text you when I've spoken to the others. |

### Pod 2 samples

## 1. Choosing a Restaurant — *Not Italian again*

*Difficulty: beginner · 15 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Leah | Right, we need to decide. Italian, Indian, or that new Turkish place? |
| 2 | Marcus | Not Italian again. We always have Italian. |
| 3 | Leah | We don't always have — |
| 4 | Marcus | We do! Three times last month. I counted. |
| 5 | Jess | To be fair, that was mostly your idea, Marcus. |
| 6 | Marcus | It was not! Was it? |
| 7 | Leah | It was, actually. You said, and I quote, "life's too short for anything but pasta". |
| 8 | Jess | That does sound like you. |
| 9 | Marcus | Fine. Fine! What about the Turkish place then? Adam went last week and he hasn't stopped talking about it. |
| 10 | Jess | I don't know… it looked a bit expensive when I walked past. |
| 11 | Marcus | It's not cheap, but the portions are supposed to be huge. |
| 12 | Leah | I'd rather pay a bit more for something really good than have another average pizza. No offence, Marcus. |
| 13 | Marcus | Some offence taken, but go on. |
| 14 | Jess | OK, let's try it. But if it's terrible, we're never listening to Adam again. |
| 15 | Leah | Agreed. I'll see if they've got a table for eight o'clock. |

## 5. What Would You Do? — *Half a million pounds*

*Difficulty: intermediate · 14 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Sam | Here's a question. If you won half a million pounds tomorrow, what's the first thing you'd do? |
| 2 | Nina | Half a million? Easy. I'd quit my job. |
| 3 | Sam | Really? Just like that? |
| 4 | Nina | Well — maybe not straight away. I'd want to leave properly, not just disappear. But yes, within a month. |
| 5 | Ollie | See, I wouldn't. I actually like my job. |
| 6 | Nina | You say that now. You'd feel differently with half a million in the bank. |
| 7 | Ollie | I honestly don't think I would. I'd probably just work less. Four days a week, maybe. |
| 8 | Sam | That's the most sensible answer I've ever heard, and I hate it. |
| 9 | Ollie | What would you do, then, since you're the expert? |
| 10 | Sam | I'd buy a little house by the sea. Somewhere quiet. I've thought about it a lot, obviously. |
| 11 | Nina | You'd be bored within a fortnight. You can't sit still for ten minutes. |
| 12 | Sam | That's fair. All right — a house by the sea and a very fast car. |
| 13 | Ollie | And that's why you should never win the lottery. |
| 14 | Nina | Anyway, none of this matters, because I'm the one who's going to win it. |

## 14. The Anecdote — *Thirty people in the living room*

*Difficulty: advanced · 15 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Aisha | Did I ever tell you about the time I missed my own birthday party? |
| 2 | Ben | You missed your own party? How is that even possible? |
| 3 | Aisha | So, it was my thirtieth, right? And Dev had organised this whole surprise thing at the flat — |
| 4 | Ben | Wait, you knew about the surprise? |
| 5 | Aisha | No, that's the point! I had no idea. So I'm at work, and at about five o'clock my boss asks if I can stay late. |
| 6 | Ben | Oh no. |
| 7 | Aisha | And I think, fine, nothing's happening tonight anyway. So I stay. Meanwhile there are thirty people hiding in my living room. |
| 8 | Ben | Thirty people! For how long? |
| 9 | Aisha | Two and a half hours. Dev kept texting me, "when are you coming home?", and I kept replying, "don't wait for me, eat without me". |
| 10 | Ben | He must have been going mad. |
| 11 | Aisha | He was. By the time I got home, half of them had actually eaten without me. My own birthday cake. |
| 12 | Ben | No! |
| 13 | Aisha | I walked in, everyone shouted "surprise", and I just stood there holding my shopping. |
| 14 | Ben | That's brilliant. Please tell me somebody filmed it. |
| 15 | Aisha | Somebody filmed it. It gets watched every Christmas. |

### Pod 3 samples

## 3. How I Got Here — *A wrong turn in Spain*

*Difficulty: beginner · 16 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Host | Welcome back. Today, Carys tells us how a wrong turn on a walking holiday changed her whole life. |
| 2 | Carys | So this was about ten years ago now. I was on a walking holiday with my sister, in the north of Spain. |
| 3 | Carys | And I should say, first of all, that I am terrible with maps. Genuinely terrible. My sister will confirm this. |
| 4 | Carys | Anyway. On the third day, we were supposed to walk from one village to the next — about twelve miles, nothing serious. |
| 5 | Carys | But somewhere around lunchtime, we took a wrong turn. And instead of admitting it, I kept walking. For two hours. |
| 6 | Carys | By four o'clock it was obvious we were lost. No signs, no people, and no signal on our phones. |
| 7 | Carys | Eventually we came to a tiny farm. There was an old man outside, fixing a gate, and my sister — who is much braver than me — went up and asked for help. |
| 8 | Carys | Now, our Spanish at this point was terrible. Worse than my map reading, if you can imagine that. |
| 9 | Carys | But this man — Miguel, we found out later — just looked at us, laughed, and waved us into the house. |
| 10 | Carys | His wife fed us. Bread, cheese, the most incredible soup. And nobody could really say anything to anybody. We just sat there smiling and pointing at things. |
| 11 | Carys | And I remember thinking: I never want to feel this helpless again. Lovely as it was. |
| 12 | Carys | So when I got home, I signed up for an evening class. Spanish, obviously. |
| 13 | Carys | And that class is where I met my husband. Which is a whole other story. |
| 14 | Carys | But we go back, most summers. Same farm. Miguel's granddaughter runs it now. |
| 15 | Carys | And these days, when we get lost — because I still get lost — at least I can ask the way. |
| 16 | Host | Carys, thank you. Next week: why one listener swears by learning in the bath. |

## 6. Why You Forget Names — *It's not your memory*

*Difficulty: intermediate · 13 sentences*

| # | Speaker | English |
|---|---------|---------|
| 1 | Presenter | Here's something that happens to all of us. You meet someone, they say their name, and three seconds later — gone. |
| 2 | Presenter | It feels like a memory problem. It isn't, really. It's an attention problem. |
| 3 | Presenter | Think about what's happening when someone introduces themselves. You're looking at their face. You're deciding what you think of them. You're planning what you're going to say next. |
| 4 | Presenter | Their name arrives right in the middle of all that. And a name, on its own, is just a sound. It doesn't connect to anything. |
| 5 | Presenter | Compare that with what they do for a living. If someone tells you they're a beekeeper, you'll remember that for years. |
| 6 | Presenter | Why? Because "beekeeper" comes with pictures. Bees, honey, one of those white suits. The name "Karen" comes with nothing. |
| 7 | Presenter | So what can you actually do about it? |
| 8 | Presenter | The simplest trick is also the oldest: say the name back straight away. "Nice to meet you, Karen." That one repetition makes a surprising difference. |
| 9 | Presenter | The second trick is to attach the name to something. Karen with the red glasses. Karen from Bristol. It doesn't need to be clever — it just needs to be a connection. |
| 10 | Presenter | And the third thing — my favourite — is that if you do forget, you should simply ask again. |
| 11 | Presenter | People think it's rude. In fact, it's the opposite: asking someone's name again shows you care what it is. |
| 12 | Presenter | Nobody remembers that you forgot their name. They remember that you wanted to know it. |
| 13 | Presenter | That's it for this week. Short and, I hope, memorable. See you next time. |

## 6. Specialist pods — health as the worked example

A specialist pod adds **domain vocabulary only**. Every scene borrows its discourse
frame from pods 0–3; the learner never meets a new *move* and a new *word* in the same
breath. A health pod might run:

| Scene | Discourse frame borrowed from | Vocabulary it adds |
|---|---|---|
| Booking the Appointment | pod-0 transaction (Taxi/Hotel shape) | surgery, appointment, urgent, prescription |
| At the GP's | pod-0 transaction (Chemist's shape, extended) | symptoms, examination, blood pressure, referral |
| Telling a Friend You're Ill | pod-1 social (Under the Weather shape) | body and symptom vocabulary in narration |
| The Waiting Room | pod-1 social (Journey In shape) | appointments, waiting times, mild complaint |
| Should You See Someone? | pod-2 discussion (The Dilemma shape) | persuading someone to get a check-up |
| Old Remedies — *My gran swore by it* | pod-2 discussion (Do You Remember shape) | home remedies, scepticism, anecdote |
| What the Nurse Explained | pod-3 explainer (Forget Names shape) | how blood pressure works, plainly told |
| Getting Better — *Six weeks on crutches* | pod-3 story (How I Got Here shape) | injury, recovery, physiotherapy narrative |

Two consequences worth having: specialist pods become **cheap to author** (the frame is
a solved problem — slot the domain into it) and **safe to parallelise** across agents,
because the discourse design was done once, in pods 1–3. The same table works for
sport, the economy, travel, food: pick 8–12 frames, pour the domain in.

## 7. What the pipeline needs (small, and only when slates are approved)

- **Master format: unchanged.** Three speakers, uneven turns and monologues already fit
  the `## heading` + dialogue-table shape; `seed-canonical-pods.cjs` needs only
  `--slug=pod-1` etc. Pod-0's narrator vocabulary-list lines (numbers/colours/days) are
  proposed **retired from pod-1 onward** — they're survival scaffolding, and the
  learner arriving at pod-1 is past it.
- **Generation prompt: one real change.** The prompt hard-codes pod-0's register
  ("polite-neutral… no slang") in STEP 1. The ladder needs that paragraph parameterised
  as a per-pod `{{REGISTER_SPEC}}`: pod-1 "friendly-informal between equals", pod-2
  "informal, humour and interruption preserved", pod-3 "warm broadcast". The
  canon-fidelity doctrine — render faithfully, don't localise, don't improve — carries
  unchanged; what changes is the register the canon itself is written in. Fillers,
  false starts and interruptions are **canonical content**: the renderer maps them to
  the target language's own discourse markers, it never smooths them away. That
  instruction belongs in the register spec.
- **Cut-off lines** (dashes at interruptions) need a decided TTS treatment — likely a
  hard stop with no fall in pitch. Audio-phase question, flagged now so it isn't
  discovered later.
- **Speed profiles** (§3) are audio-phase configuration; no scenario involvement.
- **The ledger scales as-is** — recurring lines, prices, register pins all apply; a
  recurring *cast* (see open question 3) would give it slightly more to pin per pod.

## 8. Open questions for the owner

1. **Humour ceiling in pod-2.** Irony and teasing are the moves that flex worst across
   languages — the renderer must find each culture's own way to wind a friend up. Ship
   banter as written and accept looser parallelism, or keep pod-2's humour gentler and
   more literal? My read: ship it — podcast talk without teasing isn't podcast talk —
   but it deserves your explicit yes.
2. **Voices and accents in pod-3.** A real podcast diet includes accent variety. Do
   pod-3 renders draw on a wider voice pool per language (where pools allow), or stay
   with the course's standard voices for consistency? Rendering-side, no scenario
   impact either way.
3. **Recurring cast.** Pod-0 has Sarah; my samples introduce fresh names per scene. A
   light recurring cast across pods 1–3 (Sarah's world growing with the learner) would
   add warmth and cost nothing — but it's an identity call. Fresh, recurring, or
   recurring-with-guests?
4. **Narrator drill lines.** I've proposed retiring the numbers/colours/days lines
   after pod-0 (§7). If you'd rather keep the slot, the natural upgrade is
   discourse-marker drills ("anyway — actually — to be fair") — but my read is cut it.
5. **Topic spice in discussion scenes.** Pod-2/3 argue about restaurants, money and
   cooking — deliberately nowhere near politics. Is that the permanent ceiling for the
   core ladder, with anything spicier reserved for specialist pods?
6. **Pod-3 scene length.** Thirteen scenes of 13–18 sentences, or fewer, longer pieces
   (25–30 sentences) that better match a real podcast segment's stamina demand? The
   format handles either; this is a pacing taste call. My read: keep them short in
   pod-3 and let *Episode One* be the long one.
7. **Bridge re-renders as product surface.** Are the faster re-renders of earlier pods
   (§3) visible rungs the learner chooses ("Pod 1 · faster"), or an invisible setting?
   Visible rungs make the ladder feel longer and progress feel cheaper to earn; my
   read is visible.
