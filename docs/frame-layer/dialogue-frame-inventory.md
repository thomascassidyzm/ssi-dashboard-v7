# Dialogue frame inventory (known language: eng)

Mined from `canonical_pod_scenarios` (pod-1) plus 1 sector source(s), on 2026-09-13. 704 rows read, 688 dialogue rows (16 narrator rows excluded — a vocabulary drip is an admission event, not a frame).

**Sibling of `english-pattern-inventory.md`, not a replacement.** That file holds the frames the SEED corpus attests (`P*`); this one holds the delta the POD corpus adds, in two grains: `D*` sentence, `X*` exchange. Provenance is readable from the id in one character.

**Pods contribute frame ATTESTATION and ZERO VOCABULARY.** Nothing in this file is a source of production material. A frame here is a claim that the corpus says this shape happens — never a claim that any pair can say it. That second question is `instantiableFrameSet()` in `availability.cjs`, and a frame whose fixed material no LEGO has cut is absent from the generator's pool and absent from the FRAME denominator.

**The delta measured:** 580/688 dialogue rows fire at least one of the 31 seed frames; 220 fire at least one dialogue frame; 36 rows fire neither and are listed at the bottom as the inventory's honest residue.

## Sentence frames (`D*`) — utterance shapes the seed corpus cannot attest

| id | frame | shape | position | fixed material (the gate's input) | register | shape nodes | rows |
|---|---|---|---|---|---|---|---:|
| D2 | polar response + elaboration | `yes\|no\|of course , [CLAUSE]` | response | "yes" \| "no" \| "of course" | clinical, service, social | N2 N3 N9 | 58 |
| D3 | thanks / gratitude close | `thank you ( for [NP\|VPing] ) \| thanks ( , [CLAUSE] )` | either | "thank you" \| "thanks" | clinical, service, social | N2 N10 | 48 |
| D1 | ritual open/close | `hello\|good morning\|goodbye\|see you ( , [NAME] )` | either | "hello" \| "hi" \| "good morning" \| "good afternoon" \| "good evening" \| "goodbye" \| "bye" \| "welcome" \| "see you" | clinical, service, social | N1 | 37 |
| D12 | compliance commitment | `I will \| I'll [VP] ( , then )` | response | "i will" \| "will do" \| "i'll" | clinical, social | N4 | 24 |
| D7 | uptake assessment | `[ASSESSMENT] . [CONTINUATION]` | response | "lovely" \| "perfect" \| "great" \| "of course" \| "no problem" | clinical, service, social | N2 N8 | 19 |
| D4 | apology / attention-getter | `excuse me , [CLAUSE\|WH-Q] \| (I'm) sorry , [CLAUSE]` | initiating | "excuse me" \| "sorry" \| "i'm sorry" | clinical, service, social | N2 N6 | 17 |
| D6 | reciprocal return | `[ANSWER] . and you ? \| what about you ?` | response | "and you" \| "what about you" | clinical, service, social | N5 | 16 |
| D5 | deictic handover | `here's [NP] \| here you are \| here it is \| there's [NP]` | response | "here you are" \| "here it is" \| "here's" \| "here is" | clinical, service | N2 | 12 |
| D10 | read-back receipt | `[REPEATED INSTRUCTION] . got it \| understood \| will do` | response | "got it" \| "understood" | clinical | N4 | 10 |
| D11 | reassurance / normalising | `don't worry \| that's normal \| you're doing [ADV]` | response | "don't worry" \| "that's normal" \| "not at all" | clinical | N12 | 8 |
| D8 | ellipted order | `[NP] , please   (no finite verb)` | initiating | "please" | clinical, service, social | N2 | 7 |
| D9 | reckoning | `that's [AMOUNT] ( altogether )` | initiating | "that's" \| "that is" | service | N2 | 2 |

### Specimens, quoted live

- **D1 ritual open/close** — pod-1:SC01-S01 [Neighbour (8 am), social]: "Good morning, Sarah!"
  - the frame the seed corpus cannot attest at all: no seed opens a conversation
- **D2 polar response + elaboration** — pod-1:SC01-S04 [Sarah, social]: "Yes, I've got a busy day today. I hope you have a good day. See you later."
  - the strongest single argument for the whole design: the particle is cut early in essentially every pair, so the response register becomes reachable at almost zero cost
- **D3 thanks / gratitude close** — pod-1:SC01-S03 [Neighbour, social]: "I'm very well, thank you. Are you going to work?"
- **D4 apology / attention-getter** — pod-1:SC02-S01 [Sarah, social]: "Excuse me, is this seat taken?"
- **D5 deictic handover** — pod-1:SC03-S09 [Barista, service]: "Here's your coffee."
  - the physical hand-over move; the seeds have no deixis-in-situation at all
- **D6 reciprocal return** — pod-1:SC06-S02 [Anna, social]: "My name is Anna. And you?"
  - the sentence projection of X1. THE WORKED CASE: spa_for_eng has cut no "and you", no "y tu", no bare "tu" — so this frame is unreachable for spa at every position, and the gate must say so
- **D7 uptake assessment** — pod-1:SC09-S14 [Waiter, service]: "Excellent choice. I'll bring it right over."
  - same frame carries a service uptake ("Excellent choice") and a clinical graceful-switch ("Of course, no problem at all") — which is what the register tag is for
- **D8 ellipted order** — pod-1:SC07-S13 [Customer 3, service]: "Good morning. Two Americanos and a cup of tea, please."
  - ellipsis IS the frame — "Four single tickets to town, please" has no verb and no seed looks like it
- **D9 reckoning** — pod-1:SC07-S10 [Barista, service]: "That's eight pound forty altogether."
- **D10 read-back receipt** — health-sector-conversations-v3:1.5 Medication round / Flow 1 (happy path)#114 [P, clinical]: "Understood. I'll wait for you."
  - mined from the health source, as the design predicted the sector sources would add: the learner says the instruction back and marks receipt
- **D11 reassurance / normalising** — health-sector-conversations-v3:1.0 Linguistic situation opener (nurse) / Welsh version - flow 2 (question)#10 [P, clinical]: "A year? Well, you're doing marvellous. My grandson's learning in school, you know."
- **D12 compliance commitment** — pod-1:SC19-S08 [Learner, social]: "I promise I won't be late."
  - the confirm position of N4; distinct from D10 because it commits forward rather than echoing back

## Exchange frames (`X*`) — shapes that span a turn boundary

An exchange frame cannot exist at sentence grain: it is a pattern over an adjacent pair or triple inside one scene. Counts here are NEVER summed with the sentence-grain counts — a row can be attested at both grains and the two columns answer different questions ("how common is this utterance shape" vs "how common is this exchange shape").

Adjacency joined within-scene only: 588 adjacent pairs.

| id | frame | shape | positions | fixed material | sentence projection | shape nodes | pairs |
|---|---|---|---|---|---|---|---:|
| X2 | polar-response-to-question | `[POLAR Q] -> yes\|no , [CLAUSE]` | question → polar-response | "yes" \| "no" \| "of course" | D2 | N3 N9 | 44 |
| X3 | repair | `[TURN] -> non-understanding + request -> [REFORMULATION]` | trouble-source → repair-initiation → reformulation | "sorry" \| "i don't understand" \| "say that again" | D4 | N6 | 21 |
| X5 | order -> deictic handover | `[ORDER\|REQUEST] -> here you are \| here's [NP]` | order → deliver | "here you are" \| "here it is" \| "here's" | D5 | N2 | 9 |
| X4 | instruction -> read-back | `[INSTRUCTION] -> [INSTRUCTION REPEATED] + receipt` | instruct → read-back | "got it" \| "understood" \| "i will" | D10 | N4 | 8 |
| X1 | reciprocal return | `[WH-Q] -> [A] + and you ? -> [A]` | answer-plus-return → return-answer | "and you" \| "what about you" | D6 | N5 | 4 |
| X6 | thanks -> downgrade | `thank you -> not at all \| no problem \| you're welcome` | thank → downgrade | "not at all" \| "no problem" \| "you're welcome" | D11 | N10 N2 | 3 |

### Exchanges, quoted live

- **X1 reciprocal return** — Introductions: "Excuse me. Hello. What's your name?" → "My name is Anna. And you?" → "I'm James. Pleased to meet you."
- **X2 polar-response-to-question** — A Day of Greetings (i) - 8 am: "I'm very well, thank you. Are you going to work?" → "Yes, I've got a busy day today. I hope you have a good day. See you later."
- **X3 repair** — A Day of Greetings (iv) - 7 pm: "Hello, good evening!" → "Hello! I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow?" → "No, I'm sorry, I'm busy tomorrow. But let's talk on Saturday. See you then."
- **X4 instruction -> read-back** — 1.5 Medication round: "Lovely. I'll be back with the after-lunch one, so don't take anything in the meantime." → "Understood. I'll wait for you."
- **X5 order -> deictic handover** — A Day of Greetings (iii) - 3 pm: "Yes, please." → "Here's your coffee." → "Thank you very much. Goodbye."
- **X6 thanks -> downgrade** — Shop: "Thank you, you've been very helpful. I'm very grateful." → "You're welcome. Are you here on holiday? You speak very good [target language]." → "That's very kind of you! Yes, I'm on holiday, and I need to practice more to speak [target language] better. Thank you very much, and goodbye."

## What the pod corpus attests of the SEED frames

These need no new inventory entry — only new attestation context. The `response` column is the bit the seed corpus structurally cannot give: every seed is a statement with no turn before it.

| id | frame | pod rows | of which in response position |
|---|---|---:|---:|
| P20 | question | 245 | 148 |
| P28 | time adjunct | 136 | 109 |
| P4 | modal can/could | 108 | 74 |
| P21 | wh-question | 100 | 62 |
| P24 | comparative/superlative | 84 | 68 |
| P18 | It's-adjective | 74 | 60 |
| P13 | temporal clause | 70 | 52 |
| P14 | conditional if (real) | 70 | 44 |
| P23 | negation | 60 | 52 |
| P16 | relative clause | 52 | 39 |
| P31 | like/enjoy (dative) | 52 | 36 |
| P12 | matrix say/tell | 45 | 32 |
| P15 | because / so / but | 39 | 28 |
| P1 | want-chain | 37 | 25 |
| P29 | perfect | 37 | 34 |
| P3 | progressive | 36 | 22 |
| P10 | matrix know/sure | 36 | 30 |
| P22 | embedded question | 31 | 16 |
| P9 | matrix think/believe | 25 | 19 |
| P6 | have to / need to | 22 | 13 |
| P26 | imperative | 15 | 12 |
| P2 | going-to future | 11 | 3 |
| P8 | must / may / might | 11 | 7 |
| P7 | should / ought | 9 | 8 |
| P25 | as ... as | 5 | 2 |
| P11 | matrix hope/wish | 3 | 2 |
| P19 | there is/are | 3 | 3 |
| P5 | be able to | 2 | 1 |
| P27 | what's-it-like | 1 | 0 |

## Residue (36) — no frame in either inventory fires

The honest residue, not a claim that these rows are patternless. Each is a candidate for a matcher somebody has not written yet.

- `pod-1:SC06-S03` [James] "I'm James. Pleased to meet you."
- `pod-1:SC09-S09` [Customer 1] "I'll have the lamb, please. With a side of greens."
- `pod-1:SC09-S10` [Customer 2] "And the risotto for me. With a small green salad to start."
- `pod-1:SC09-S13` [Customer 2] "A bottle of the house red would be lovely."
- `pod-1:SC13-S05` [Local] "At the second roundabout, take the first exit."
- `pod-1:SC13-S07` [Local] "You'll see the supermarket on your left, just opposite the bus stop."
- `pod-1:SC17-S06` [Learner] "We'll pay by card again, please."
- `pod-1:SC18-S01` [Learner] "That's a bad idea."
- `pod-1:SC20-S02` [Learner] "And then another cone with one scoop of lemon and one of blueberry."
- `pod-1:SC20-S07` [Learner] "Good luck with that!"
- `pod-1:SC20-S09` [Learner] "You're very kind."
- `pod-1:SC03-RM1-S05` [Sarah] "Crisps will do nicely — salted, please."
- `health-sector-conversations-v3:1.0 Linguistic situation opener (nurse) / Welsh version - flow 1 (happy path)#6` [P] "Fire away, bach."
- `health-sector-conversations-v3:1.0 Linguistic situation opener (nurse) / English version - flow 3 (human moment - family helper)#34` [P] "She'll be glad of that. She worries, see."
- `health-sector-conversations-v3:1.0 Linguistic situation opener (nurse) / English version - flow 3 (human moment - family helper)#35` [HW] "That's what family's for. Right, with you both here, let's make a start."
- `health-sector-conversations-v3:1.1 Names and first meeting / Flow 1 (happy path + detail)#42` [P] "Third of March, nineteen forty-one. I'm no spring chicken."
- `health-sector-conversations-v3:1.1 Names and first meeting / Flow 3 (human moment - reassurance)#54` [P] "Course. Twelfth of June, nineteen thirty-eight."
- `health-sector-conversations-v3:1.2 Settling a new patient in / Flow 2 (question - visiting times)#63` [HW] "Visiting's two till eight, so plenty of time. Two visitors at a time, that's the only rule."
- `health-sector-conversations-v3:1.7 Meals and drinking / Flow 1 (happy path)#148` [P] "You read my mind. Sponge and custard, lovely."
- `health-sector-conversations-v3:1.9 Comfort round / Flow 1 (happy path - small requests)#185` [HW] "Right, you're all set. I'll be past again in an hour or so anyway."
- `health-sector-conversations-v3:1.10 Preparing for a procedure / Flow 1 (happy path)#201` [HW] "Good. Someone will come first thing to put a name band on and go through the checklist with you."
- `health-sector-conversations-v3:1.10 Preparing for a procedure / Flow 2 (safety-critical ⚠ - regular medication)#208` [P] "Written down would be lovely. I don't trust my memory these days."
- `health-sector-conversations-v3:1.10 Preparing for a procedure / Flow 2 (safety-critical ⚠ - regular medication)#209` [HW] "Leave it with me - it'll be there in black and white by your bed."
- `health-sector-conversations-v3:1.10 Preparing for a procedure / Flow 3 (human moment - nervous)#215` [HW] "About an hour, then a couple of hours coming round with us keeping an eye on you. You'll be back on the ward for lunch."
- `health-sector-conversations-v3:1.11 Going home / Flow 1 (happy path - writes it down)#220` [P] "Thursday, the nurse. I'll put this note on the fridge."
- `health-sector-conversations-v3:2.2 Exploring the symptom / Flow 2 (question - which symptom)#286` [P] "The pain came first, maybe a month ago. The dizziness is newer - a week or so."
- `health-sector-conversations-v3:2.2 Exploring the symptom / Flow 3 (problem - vague timeline)#294` [P] "Whatever you need, doctor."
- `health-sector-conversations-v3:2.3 Medication and allergy check / Flow 1 (happy path)#298` [P] "Every day with my breakfast, regular as clockwork."
- `health-sector-conversations-v3:2.3 Medication and allergy check / Flow 2 (safety-critical ⚠ - penicillin allergy)#302` [P] "I'm allergic to penicillin. It brings me out in a terrible rash."
- `health-sector-conversations-v3:2.4 Narrating an examination / Flow 1 (happy path)#316` [P] "Clear! Well, that's something, at least."
- `health-sector-conversations-v3:2.4 Narrating an examination / Flow 2 (safety-critical ⚠ - tender spot)#324` [P] "There we are. All yours."
- `health-sector-conversations-v3:2.6 Ordering tests / Flow 3 (problem - can't do today)#365` [HW] "Book at the desk to be safe. And keep taking the tablets in the meantime - don't wait for results."
- `health-sector-conversations-v3:2.6 Ordering tests / Flow 3 (problem - can't do today)#366` [P] "Text good, call thorough, tablets regardless. You've a way of making it simple."
- `health-sector-conversations-v3:2.7 Prescribing / Flow 2 (question - alcohol)#376` [P] "A week off the wine. My wife will be delighted."
- `health-sector-conversations-v3:2.8 Safety netting / Flow 3 (problem - doesn't like to fuss)#400` [P] "Alright, alright, I promise. My daughter will make me anyway."
- `health-sector-conversations-v3:2.9 Giving results / Flow 1 (happy path)#408` [P] "Three months. That's a fair challenge. I'll take it."

Machine-readable companion: `dialogue-frame-inventory.json`. Regenerate with `node tools/frame-layer/extract-dialogue-patterns.cjs`.

**Staleness:** the canon's newest `updated_at` when this was mined was `2026-09-03T23:59:26.519681+00:00`. Consumers compare that against the live canon and warn; four sector-pod authoring jobs are in flight, so a stale inventory is the normal case, not the exception — it must say so rather than lie.
