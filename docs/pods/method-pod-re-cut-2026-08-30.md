# The Method Pod — the re-cut: measured turns, derived scene lengths

> **PRIVATE. Unlisted, Italian only, audience of two — Tom and Aran.** Nothing here is listed, scaled, rendered or written to production. No code runs this, no pipeline reads it, no audio has been queued or rendered. This document re-cuts the CONTAINER of the sixteen ratified scenes (`method-pod-first-specimens-2026-08-29.md`, scenes 1–4; `method-pod-round-two-2026-08-29.md`, scenes 5–16). **The shapes are ratified and closed.** Nothing here redesigns a scene, re-mines the corpus, adds a seventeenth scene or drops one of the sixteen. What changes is turn count, turn length and alternation — and every change carries a number.

**The ruling being executed** (Tom, 2026-08-29, on round two): *"SIX TURNS IS TOO FORMULAIC AS A STRUCTURE — it is good but will get repetitive very quickly — ESPECIALLY AS THE TURNS ARE SYMMETRIC."* The fix is his own rule applied here: **balance against the attested distribution, not flat.** Scene length becomes an output of the shape; turn asymmetry is measured off the corpus, not authored.

---

## 1. The segmentation rule, stated and validated

Measured from `docs/corpus/talk-bollocks/part-1.md`, `part-2.md`, `part-4.md` — the private corpus, three sessions of the four. **Part 3 is lost, and `part5.mp3` is Part 4's audio; Part 4 is titled "(of 4)".** Said once, per the corpus README; nothing below assumes a fourth text.

The unit of length is the **word** (whitespace-and-apostrophe tokenisation), the unit the pod-0.5 texture scorecard already uses (`pod05-texture-scorecard-2026-07-17.md` §Method). Comparability with a measurement Tom has already accepted is worth more than a bespoke metric.

**The rule, in full:**

1. Drop the YAML front matter, the title/byline/date/URL header block and the stray `- T` line.
2. Strip the `- ` bullet prefix (Parts 1 and 2 carry it, Part 4 does not) and markdown bold.
3. A line whose entire content is `Tom` or `Aran` is a **speaker label**. Everything after it, up to the next label, is that speaker's run.
4. A line is a **Descript section heading** — not speech — if it has 2–10 words, carries no sentence-final punctuation (`. ? ! ; :`), does not end in a comma, and every non-stopword is capitalised. **17 headings** were excluded this way: `Neuroplasticity`, `Spaced Repetition`, `The Activist's Dilemma`, `Start With Gwynedd` and so on.
5. A line that is entirely a bracketed editorial insertion (`**[****SLA**`, `**Acquisition]**`) is dropped as an artefact — **2 lines**, both in Part 1. Bracketed material *inside* a speech line (`[Game B]`) is left alone and counted.
6. A speaker label with nothing under it is an artefact and is dropped; if that leaves two adjacent runs by the same speaker they merge into one turn. **2 empty labels, 2 merges** across the corpus.

**Two calls the rule gets right, hand-checked against the page:**

- **`- So` at 1:220 is speech, not a heading.** It is Aran trailing off — and Tom completes it at 1:222 with "we don't have the web". A one-word capitalised line looked exactly like a Descript heading; requiring two words saves a joint-construction specimen from being deleted.
- **`Holy BatHead, ManDick,` (1:237)** is speech and `Holy Dickhead Batman` (1:231) is the heading above it. The trailing comma separates them.

**Hand-validation.** The first twelve turns of Part 1 were read against the page one by one. All twelve match, including the two hard cases: the mid-sentence label split ("There's so" / **Aran** / "many different ones!") is correctly two turns, and Tom's one-word clarification "being?" — landing inside Aran's run — is correctly its own turn.

### 1a. The finding that forced a second segmentation

Segmentation A — label runs exactly as Descript left them — reports only **7 backchannel turns in 25,345 words**. That is not credible for two people talking for three hours.

Counting *inside* the runs shows why: **223 sentences that are pure ratification tokens** ("Yeah.", "Exactly.", "Correct.", "Yep. Okay.", "absolutely.") sit **mid-run, in the other speaker's text** — 9.3 per 1,000 words. Descript's diarisation absorbed them. The single longest "turn" in the corpus, 1,564 words of Aran, ends `"…how we understand the brain at the moment. Yeah. That makes sense. But if you now say…"` — Tom is plainly in there.

So everything below is reported **both ways**:

- **Segmentation A** — label runs as given. Honest about what the file says; overstates floor-holds and erases backchannels.
- **Segmentation B** — the same runs, split at every mid-run pure-ratification sentence, that sentence attributed to the other speaker, adjacent same-speaker pieces re-merged. A reconstruction, stated as one.

**Operational definition of a backchannel** (both segmentations): a turn of **≤4 words**, containing no question mark, every word of which is drawn from a closed ratification lexicon (*yeah, yes, exactly, correct, right, sure, ok/okay, mm, hmm, brilliant, interesting, gotcha, absolutely, quite, indeed, true, no, nope, wow, nice, good, great, yep, yup, fine, oh, ah, totally, definitely, perfect*). Nothing propositional qualifies: Tom's "being?" (1 word) is a floor-taking turn because it is a question; "It's pretty complicated." (3 words) is floor-taking because its words are not in the lexicon. **No judgement calls were made** — the lexicon decided every one of the 175, which is why the count is reproducible rather than tasteful.

---

## 2. The distribution — the numbers, before anything is re-cut

### 2a. Turn length in words

| | turns | words | median | mean | **CV** | q1 | q3 | p90 | max | max/median |
|---|---|---|---|---|---|---|---|---|---|---|
| **A** part 1 | 75 | 8,967 | 57 | 119.6 | 1.74 | 13 | 144 | 222 | 1,564 | 27× |
| **A** part 2 | 101 | 8,382 | 31 | 83.0 | 1.60 | 8 | 105 | 229 | 945 | 31× |
| **A** part 4 | 66 | 7,996 | 80 | 121.2 | 1.00 | 23 | 193 | 300 | 467 | 6× |
| **A** pooled | **242** | **25,345** | 48 | 104.7 | **1.51** | 12 | 136 | 258 | 1,564 | 33× |
| **B** part 1 | 231 | 8,967 | 13 | 38.8 | 1.58 | 1 | 50 | 111 | 473 | 36× |
| **B** part 2 | 228 | 8,382 | 12.5 | 36.8 | 1.53 | 1 | 53 | 100 | 355 | 28× |
| **B** part 4 | 132 | 7,996 | 24 | 60.6 | 1.45 | 1 | 80 | 197 | 433 | 18× |
| **B** pooled | **591** | **25,345** | **14** | 42.9 | **1.57** | 1 | 56 | 114 | 473 | **34×** |
| **B** floor-taking only | 416 | 25,170 | 33 | 60.5 | **1.21** | 12 | 81 | 158 | 473 | 14× |

Backchannel turns, segmentation B: **175 of 591 = 30%** (part 1: 34%, part 2: 28%, part 4: 25%).

**The tail is not a tail, it is a second population.** Expressed as multiples of the pooled median (B, all turns):

| p05 | p25 | p50 | p75 | p90 | p95 | p99 |
|---|---|---|---|---|---|---|
| 0.10× | 0.10× | 1.00× | **4.00×** | 8.14× | 12.9× | 23.3× |

**25.5% of all turns are ≥4× the median. 35.5% are ≤0.25× the median.** The middle is nearly empty: the quartile boundary at p25 and the one at p05 are the same number, because a third of all turns are one or two words long. Real conversation between these two is not a distribution around a centre — it is a **bimodal alternation of holds and tokens**.

### 2b. What a six-turn window actually looks like

Every rolling six-turn window in the corpus (n = 585, segmentation B):

- **median CV = 1.13**, q1 0.96, q3 1.34
- **1% of windows fall below CV 0.6** — the pod-0.5 scorecard's own R1 floor
- median **max/min ratio inside a six-turn window = 102×**

### 2c. And what the sixteen ratified scenes look like

Measured off the English column of the ratified tables, same tokenisation:

| | turns | median | CV | max/median | min/median |
|---|---|---|---|---|---|
| Scene 1 | 6 | 10.5 | 0.35 | 1.3 | 0.48 |
| Scene 2 | 6 | 9.5 | 0.56 | 2.1 | 0.32 |
| Scene 3 | 6 | 6.0 | 0.46 | 2.2 | 0.50 |
| Scene 4 | 6 | 11.5 | 0.48 | 1.7 | 0.17 |
| Scene 5 | 6 | 6.5 | 0.47 | 1.7 | 0.46 |
| Scene 6 | 6 | 6.5 | 0.38 | 1.2 | 0.31 |
| Scene 7 | 6 | 11.0 | 0.47 | 1.3 | 0.09 |
| Scene 8 | 6 | 9.0 | 0.41 | 1.4 | 0.22 |
| Scene 9 | 6 | 8.5 | 0.49 | 2.2 | 0.59 |
| Scene 10 | 6 | 9.0 | 0.37 | 1.4 | 0.56 |
| Scene 11 | 6 | 9.0 | 0.45 | 1.2 | 0.22 |
| Scene 12 | 6 | 8.5 | 0.53 | 2.1 | 0.59 |
| Scene 13 | 6 | 10.0 | **0.21** | 1.3 | 0.70 |
| Scene 14 | 6 | 7.5 | 0.49 | 1.7 | 0.27 |
| Scene 15 | 6 | 9.5 | 0.43 | 1.8 | 0.42 |
| Scene 16 | 6 | 11.0 | 0.37 | 1.5 | 0.36 |
| **pooled (96 rows)** | 96 | 9.0 | **0.48** | 2.2 | 0.11 |

**The diagnosis, in three numbers:**

- **0 of 16** scenes contain a floor-hold (a turn ≥4× the scene's own median). The corpus has one every four turns.
- **0 of 16** scenes reach CV 0.6 — the scorecard's own R1 floor, which pod-0.5 cleared at 0.93 and the corpus clears at 1.13 in a six-turn window.
- **4 of 16** scenes contain a genuine minimal turn (≤0.25× median).

Tom's ear read this correctly with no instrument. The set is not *slightly* flat; **the entire ceiling is missing.** Every scene lives inside the narrow band 1.2×–2.2× its own median, where the corpus runs to 34×. That is what "symmetric" means as a measurement, and it is a container fault, not a content fault: the scenes' *text* was ratified and is almost entirely preserved below.

---

## 3. Alternation and floor-holds

### 3a. It is not ABAB

Segmentation B, pooled. Of the **416 floor-taking turns**, **175 (42.1%)** are *continuations*: the same speaker resumes after the partner has landed a backchannel that did not take the floor (A → "yeah" → A). Only **241 (57.9%)** are genuine floor swaps.

So: **two of every five times a new turn begins, the floor has not changed hands.** A pod scene in which the speaker alternates on every single row is asserting something the corpus contradicts 42% of the time.

### 3b. Speaker asymmetry — the finding I did not expect

| | turns | words | share of words | median turn | mean turn | max | backchannel turns |
|---|---|---|---|---|---|---|---|
| **Tom** | 296 | 6,907 | **27%** | **2** | 23 | 392 | 140 (47% of his own turns) |
| **Aran** | 295 | 18,438 | **73%** | **35** | 63 | 473 | 35 (12% of his own turns) |

They take almost exactly the same *number* of turns and Aran speaks **2.7× the words**. Tom's median turn is **two words**. Nearly half of Tom's turns are backchannels.

**Honest caveat, and it matters.** Talk Bollocks is podcast-shaped: Tom is largely hosting Aran on Aran's subject, and the imbalance is widest in Part 1 (Aran's SLA/neuroplasticity ground, max/median 36×) and narrowest in Part 4 (max/median 6× in segmentation A, the most conversational of the three). I am **not** claiming Tom and Aran are permanently a 27/73 pair. What I am claiming is narrower and safe: **within any one exchange, one of them owns the floor and the other punctuates.** Symmetry, where it exists, is a property of the *set* — of who owns which exchange across many of them — never of a single scene. That is the design rule §4 takes from it.

### 3c. Where the floor-holds sit

Floor-hold = a turn ≥4× the pooled median (≥56 words), segmentation B: **151 of 591 turns (25.5%)**. Aran 114, Tom 37. The longest is 473 words = **34× median**.

- **What precedes one: median 2 words.** Only **15 of 151** floor-holds are preceded by a question. The overwhelmingly common launcher is a backchannel — "Yeah.", "Yep. Okay.", "absolutely." — i.e. **a hold is usually a continuation, not an answer.** The question-as-handover is the *rare* and therefore marked way in, which is exactly why it reads as a move when it happens.
- **What follows one: median 2 words**, and **72 of 150** are followed by a backchannel. A hold does not hand over to another hold. It hands over to a token.
- The anecdote flag, when present, sits *inside* the hold's own first sentence ("I've got some anecdotal N equals 1. Hello me, evidence on this"), not in a preceding turn.

**The shape, stated once:** `token → HOLD → token → HOLD`. Not `medium → medium → medium`.

---

## 4. How long an exchange runs before its shape closes

This is the number that answers Tom's ruling directly. Each ratified move was read at its attested location and its turns counted from opening to close, in segmentation-B terms. **Turn profiles are words per turn, in order.**

| Shape (scene) | Attested at | **Turns to close** | Attested turn profile | Note |
|---|---|---|---|---|
| Joint construction (1) | 1:342–343; 1:220–222; 2:237–240 | **2–3** | 90 / **3** / 40 | The completion turn is 1–4 words, always. Never delivered without the ratification. |
| Anecdote + flag, challenged (2) | 1:344–349 | **3** | 60 / 40 / 12 → teller continues | The flag is inside the hold's first sentence. |
| Public self-repair (3) | 1:326–331 | **3** | 35 / **35 self-interrupting** / 40 | The repair happens *inside one turn*, not across turns. |
| Reformulation (4) | 1:365; 4:179 | **3** | 120 / 14 / 20 | Long → medium recast → short re-recast. |
| Return marker (4) | 2:57 | **0 — intra-turn** | — | "And where were we?" is mid-run and self-addressed. Not a turn. |
| Not-knowing + handover (5) | 4:68–77 | **2** | 110 / 130 | Cascade, "I don't know" and the handover are all **one** turn. |
| Precision haggle (6) | 2:120–134 | **8** | 6/5/5/4/20/16/19/5 — **CV 0.65** | The one genuinely fast, near-symmetric exchange in the corpus. |
| Flagged guess (7) | 2:290–298 | **3** | 9 / 120 / 60 | Flag + guess + reason arrive in one breath. |
| The razor (8) | 1:90–99 | **2** | 300 (self-staged) / 6 | The elaboration is staged by the razor's *own* speaker. |
| Audit inside the glow (9) | 4:144–169 | **5** | 60 / 60 / **5** / 70 / 150 | Ratify + audit in one turn; closes on the longest hold. |
| Position abandonment (10) | 2:159–166; 2:30–36 | **4** (once **1**) | 250 / **3** / 200 / 8 | The probe is a three-word question. One instance has no probe at all. |
| Mirrored tease (11) | 2:141–147 | **3** | cut-off / 37 / 35 → resumes | The tease *interrupts mid-clause*. |
| Metaphor handover (12) | 2:234–247 | **5** | 180 / **1** / 120 / 8 / 55 | The completion is **one word**: "trip!" |
| Co-owned line (13) | 4:241–246 | **2** | 50 / 90 | Claimed in the first 20 words of turn 2, then he keeps going. |
| Banked thread (14) | 4:474 | **0 — not dialogue** | — | The corpus's last line is an **editorial annotation**, not a turn. |
| Puppet show (15) | 4:102–113; 2:47–56 | **2** | 120 (both parts staged solo) / **1** ("Nope.") | The partner is **not** cast. See §7. |
| Parked clash (16) | 2:378–401 | **7** | 50 / **350** / 70 / 45 / 5 / 140 / **9** | Escalating holds, closed by the **shortest** turn in the exchange. And **Tom parks it**, not Aran. |

**Read the middle column.** Attested closing lengths run **2, 2, 2, 2, 3, 3, 3, 3, 4, 5, 5, 7, 8** — and two shapes are not exchanges at all. Six is not the answer to any of them. That is the ruling, in the corpus's own arithmetic.

---

## 5. The re-cut grammar — seven rules, each with its number

These are the rules the sixteen re-cuts below obey. Each is a translation of a measured fact into something a scene can carry.

**G1 — Scene length is the shape's attested closing length** (§4 column 3), adjusted only where the ratified shape-node requires a beat the corpus's instance happens not to contain, and then it is named. Range delivered: **3 to 8 turns.**

**G2 — Every scene carries exactly one floor-hold**, 3–4× the scene's own median. Corpus attests 4×–34×; **I deliberately undershoot at 3–4×** and flag it in §7 — a 4× hold at scene scale is ~40 words of Italian, and that is already at the edge of a learning event.

**G3 — The floor-hold is always a HEARD turn. It never carries the scene's owned exchange or its newly-admitted response position.** This is the rule that dissolves most of the teaching tension: heard ≠ owned is already ratified doctrine (round two §1), so a 40-word turn is availability-only surface, while everything the learner is being asked to *produce* stays ≤12 words and keeps one distinction per blink.

**G4 — Every scene carries at least one minimal turn** ≤0.25× its median (1–3 words). Corpus: 35.5% of all turns. Currently only 4 of 16 scenes have one.

**G5 — Not every scene alternates.** At least a third of the scenes contain an `A → minimal token → A` sandwich, where the same speaker resumes. Corpus: 42.1% of floor-taking turns.

**G6 — Within a scene, one speaker owns ~65–75% of the words; across the set, ownership alternates.** Corpus: 73/27 inside the sessions (§3b). Symmetry is a set property, never a scene property. Delivered set balance is reported in §6.

**G7 — Target scene CV ≥ 0.6** (the scorecard's R1 floor), aiming at 0.8–1.0. Corpus six-turn windows sit at 1.13; the current set sits at 0.47. **One exception, and it is the point of the whole exercise: Scene 6, the precision haggle, whose own attested CV is 0.65 — flat and fast is the *correct* shape for a haggle.** Replacing "everything is six and symmetric" with "everything is uneven" would be the same flat-prior error wearing a different number.

**What is NOT changed anywhere below:** the shape witnessed, the owned exchange, the newly-admitted response position, the subject matter, the near-neighbour selection points, the stage-content guard of round two §3, and the zero-admission status of Scenes 5 and 6. Wording is preserved wherever the new boundaries allow; where a turn is lengthened, the added material is the corpus's own (Scene 9's design-day, Scene 16's five-day model, Scene 10's "every single one of those people") or a plain extension of what the ratified turn already said.

**One consequence to be explicit about:** moving a turn boundary necessarily moves some ratified lines from one speaker's mouth to the other's. Scene 1 is the clearest case — Tom now says "The edges" because he is holding the floor into the open clause. The *shape* and the *text* survive; the *attribution within the scene* is what the re-cut is allowed to move, and that is what "re-cut the container" means in practice.

---

## 6. The sixteen, re-cut

Existing order and numbering, untouched. Each scene keeps its ratified **Owns / Newly admits / Shape witnessed / Surface forms admitted / near-neighbour points** exactly as published in round one §4 and round two §5 — they are not restated here; read them alongside. What follows is the container: the table, plus one sentence tying the new shape to a measured number. §7 carries the full per-scene accounting.

---

### Scene 1 — *Il palazzo in mezzo al campo* — joint construction

*Attested closing length: **2–3 turns**. In all three attested instances (1:342, 1:220, 2:237) the completion turn is **1–4 words** and the ratification is shorter still.*

| | English | Italiano |
|---|---|---|
| TOM | It's not that you know the words. You know what's between the words. The edges. Like a city — you don't know a city because you know the buildings; you know it because you know the streets. So a new word without streets… | Non è che conosci le parole. Conosci quello che c'è tra le parole. I collegamenti. Come una città — non conosci una città perché conosci i palazzi; la conosci perché conosci le strade. Quindi una parola nuova senza strade… |
| ARAN | …is a building in the middle of a field. | …è un palazzo in mezzo a un campo. |
| TOM | Exactly that. | Esatto, proprio così. |
| ARAN | Nobody lives there. And schools keep building them. Poor things. | Non ci abita nessuno. E le scuole continuano a costruirli. Poverini. |

**Why:** six alternating rows made the completion turn 8 words — 0.76× the scene median, when every attested completion in the corpus is at or below 0.1× its own exchange median; the whole scene is now the run-up to one small word and its two-word ratification. Every ratified near-neighbour point survives (*palazzo*, *strade*, locative *ci*, *quindi*); "The edges" moves to Tom's mouth because he is the one holding the floor into the open clause.

---

### Scene 1-bis — *Conoscere una persona* — **Option B, shown because my re-cut differs between the two**

*Same shape, same treatment. Presented, not chosen: the A-or-B fork is Tom's (round two §4).*

| | English | Italiano |
|---|---|---|
| TOM | It's not that you know a person because you know facts about them. I know your birthday. So what? You know someone when you know how they'll answer, before they answer. So a fact without… | Non è che conosci una persona perché sai delle cose su di lei. Io so quando è il tuo compleanno. E allora? Conosci qualcuno quando sai come risponderà, prima che risponda. Quindi un fatto senza… |
| ARAN | …without a voice around it is just a birthday. | …senza una voce intorno è solo un compleanno. |
| TOM | Exactly that. And you — I could write your answers myself. | Esatto, proprio così. E tu — le tue risposte potrei scriverle io. |
| ARAN | You could not. …Fine, you could. | Non potresti. …Va bene, potresti. |

**Why:** identical re-cut logic; Option B's ratified text loses nothing, and the *conoscere/sapere* anchor and the *e allora?* void both sit inside Tom's hold where they are heard, not produced.

---

### Scene 2 — *Il colpo basso* — anecdote-with-flag, challenged

*Attested closing length: **3 turns** (1:344–349). The status flag lives inside the hold's own first sentence; the punchline turn is short and the teller keeps going.*

| | English | Italiano |
|---|---|---|
| ARAN | I've got a story. It proves nothing — accept it anyway. | Ho una storia. Non dimostra niente — accettala lo stesso. |
| TOM | Go on. | Dai, racconta. |
| ARAN | A learner writes to me: the words she remembers are the ones that cost her effort. The easy ones, the ones that came free — gone. Every single one. | Una studentessa mi scrive: le parole che ricorda sono quelle che le sono costate fatica. Quelle facili, quelle venute gratis — sparite. Tutte quante. |
| TOM | One learner. You're building a church on one learner? | Una studentessa. Stai costruendo una chiesa su una studentessa? |
| ARAN | I said it proves nothing. But you'll remember it, won't you? | Ho detto che non dimostra niente. Ma tu te la ricorderai, no? |
| TOM | …That's a dirty trick. Yes. | …Che colpo basso. Sì. |

**Why:** the ratified 20-word story turn was 2.1× the scene median where the corpus's anecdote holds run 4×+; the story is now a genuine hold and "Go on." is a two-word invitation — the shortest turn in the scene at 0.2× median, matching the corpus's own launcher-into-a-hold (median 2 words, §3c).

---

### Scene 3 — *Due parole* — **ZERO-ADMISSION** — public self-repair, teasing audit

*Attested closing length: **3 turns** (1:326–331) — and the self-repair happens **inside a single self-interrupting turn**, not across turns.*

| | English | Italiano |
|---|---|---|
| TOM | Can we try again? More slowly. | Possiamo riprovare? Più lentamente. |
| ARAN | Of course. | Certo. |
| TOM | I don't need all the words. I need three. Three words. No — two. Two words, and I can talk all day. | Non mi servono tutte le parole. Me ne servono tre. Tre parole. No — due. Due parole, e posso parlare tutto il giorno. |
| ARAN | You said three. | Hai detto tre. |
| TOM | The third one is you. | La terza sei tu. |
| ARAN | Very well. That's enough for me. | Benissimo. A me basta. |

**Why:** the repair now runs inside one turn as the corpus has it, which is also what buys the scene its 3.8× hold without adding a word — **zero-admission is intact: every English content word is one already verified against the live canon in round one, and no new word enters.** Aran's "Of course." now sits between two Tom turns, giving the set one of its `A → token → A` sandwiches (§3a, 42%).

---

### Scene 4 — *Dov'eravamo?* — reformulation, flagged digression and return

*Attested: reformulation closes in **3 turns** (1:365); the return marker "And where were we?" (2:57) is **intra-turn** — it is not a turn boundary at all.*

| | English | Italiano |
|---|---|---|
| ARAN | The moment you've got edges, you can go in lots of directions. And that's when it becomes a game. | Nel momento in cui hai i collegamenti, puoi andare in tante direzioni. Ed è lì che diventa un gioco. |
| TOM | So what you're saying is: control arrives before correctness. | Quindi quello che stai dicendo è: il controllo arriva prima della correttezza. |
| ARAN | Hang on — that makes me think of the garden. Two minutes, I promise. | Aspetta — questo mi fa pensare al giardino. Due minuti, promesso. |
| TOM | Clock's running. | Il tempo corre. |
| ARAN | Nobody designs a garden leaf by leaf. Nobody can. You plant, and the garden answers, and then you find out what you've actually got, which is never the thing you drew. That's a garden, not a lesson plan. Anyway — where were we? | Nessuno progetta un giardino foglia per foglia. Nessuno ci riesce. Tu pianti, e il giardino risponde, e poi scopri quello che hai davvero, che non è mai quello che avevi disegnato. Quello è un giardino, non un piano di lezione. Comunque — dov'eravamo? |
| TOM | Control before correctness. And your garden just agreed with me. | Al controllo prima della correttezza. E il tuo giardino mi ha appena dato ragione. |

**Why:** the digression and its return marker are now one continuous hold, which is the only form the corpus attests, and "Clock's running" at 0.16× median is the scene's minimal turn; the ratified reformulation staple and every near-neighbour point are untouched.

---

### Scene 5 — *Non lo so* — **ZERO-ADMISSION** — not-knowing held with status

*Attested closing length: **2 turns** (4:68–80) — the question cascade, the "I don't know" and the handover are **all one 110-word turn**. See the teaching-tension flag in §8; this scene deliberately does not follow its attested form.*

| | English | Italiano |
|---|---|---|
| ARAN | Is this a good idea, or a bad idea? | È una buona idea, o una cattiva idea? |
| TOM | I don't know. | Non lo so. |
| ARAN | You don't know? | Non lo sai? |
| TOM | No. I don't know, and you don't know. Is it a good idea? I don't know. Is it a bad idea? I don't know. And you don't know. | No. Io non lo so, e tu non lo sai. È una buona idea? Non lo so. È una cattiva idea? Non lo so. E tu non lo sai. |
| ARAN | You're right. I don't know. | Hai ragione. Non lo so. |
| TOM | Good. Now we can start to think. What do you think? | Bene. Adesso possiamo iniziare a pensare. Tu cosa pensi? |

**Why:** the corpus's own form — cascade, not-knowing and handover in one breath — is unreachable at Layer 0, so the ping-pong stays and the **hold is built entirely by repetition of words the scene already owns**, taking the scene from 1.7× to 4.0× max/median without admitting a single new word. This is the one scene where the measurement and the teaching genuinely pull against each other, and I have chosen teaching; §8 states the conflict rather than hiding it.

---

### Scene 6 — *Cento ore* — **ZERO-ADMISSION** — the precision haggle

*Attested closing length: **8 turns** (2:120–134), turn profile 6/5/5/4/20/16/19/5 — **CV 0.65, the flattest and fastest exchange in the whole corpus.** This scene should NOT gain a floor-hold.*

| | English | Italiano |
|---|---|---|
| TOM | How much time is it going to take? | Quanto tempo ci vorrà? |
| ARAN | A lot. | Tanto. |
| TOM | How much? Ten hours? | Quanto? Dieci ore? |
| ARAN | More. Ten hours — and then ten more. | Di più. Dieci ore — e poi altre dieci. |
| TOM | And then? | E poi? |
| ARAN | And then ten more. And then ten more. | E poi altre dieci. E poi altre dieci. |
| TOM | So how much altogether? A hundred? | Quindi quanto in tutto? Cento? |
| ARAN | A hundred hours. It's a hundred hours. Ten hours, and then ten more, and then ten more — a hundred hours. Take them as you want. | Cento ore. Sono cento ore. Dieci ore, e poi altre dieci, e poi altre dieci — cento ore. Prendile come vuoi. |

**Why:** the only change is **+2 turns**, because the attested haggle takes eight and its own CV of 0.65 says flat-and-fast is the correct container for this shape — a scene set in which *every* scene became uneven would be the same flat prior as six-and-symmetric, wearing a different number. Zero-admission holds: the added rows reuse *e poi*, *dieci*, *ancora*, *cento*, all already verified.

---

### Scene 7 — *Un tiro di dadi* — the flagged guess

*Attested closing length: **3 turns** (2:290–298) — the flag, the guess and its reason arrive in **one 120-word breath** after a short handover.*

| | English | Italiano |
|---|---|---|
| TOM | Schools. How would you do it in a school? | Le scuole. Come lo faresti in una scuola? |
| ARAN | It's been a long time since I've worked in schools. I'm out of practice, and I haven't thought about it much. | È da tanto tempo che non lavoro nelle scuole. Sono fuori allenamento, e non ci ho pensato molto. |
| TOM | But? | Però? |
| ARAN | But if you give me one roll of the dice — one day a week. One whole day, every week, for a year. That's what I'd want to test, and I'd bet on it. | Però se mi dai un solo tiro di dadi — un giorno alla settimana. Un giorno intero, ogni settimana, per un anno. È quello che vorrei provare, e ci scommetterei. |
| TOM | That's a big bite out of the timetable. | È un bel morso all'orario. |
| ARAN | It looks big. But I suspect you wouldn't even need the whole year. | Sembra grande. Ma sospetto che non servirebbe nemmeno l'anno intero. |

**Why:** the corpus puts flag and guess in one turn, but the ratified node is *"the partner explicitly buys the guess anyway"* — so the one-word "Però?" stays and the guess behind it becomes a real hold at 3.1× median, giving the scene an `A → token → A` sandwich and the set's most extreme minimal turn at 0.10× median.

---

### Scene 8 — *Troppo complicato* — the razor

*Attested closing length: **2 turns** (1:90–99): one long self-staged elaboration carrying its own verdict, and a six-word uptake.*

| | English | Italiano |
|---|---|---|
| TOM | So the rules of grammar — where do they live, in the head? | Quindi le regole della grammatica — dove stanno, nella testa? |
| ARAN | Ask the question at the level of neurons. How would it even work? | Fai la domanda al livello dei neuroni. Come funzionerebbe, anche solo in teoria? |
| TOM | A parallel system? Word types, categories, a machine for putting them in order, and another machine to check the first one, and somewhere to keep all of that, and a way to learn it as a child… | Un sistema parallelo? Tipi di parole, categorie, una macchina per metterle in ordine, e un'altra macchina che controlla la prima, e un posto dove tenere tutto questo, e un modo per impararlo da bambino… |
| ARAN | Listen to yourself. It gets complicated very fast. | Ascoltati. Diventa complicato molto in fretta. |
| TOM | And so? | E quindi? |
| ARAN | It's complicated — so it can't be a thing. That's all. | È complicato — quindi non può essere una cosa vera. Tutto qui. |

**Why:** the elaboration was three flat rows of 10–13 words; letting it run in one turn at 3.5× median is what makes "listen to yourself" land as a verdict on something that visibly overran. **Deliberate deviation: attested is two turns, delivered is six** — the ratified node requires both the invitation ("E quindi?") and the elaboration-by-the-hypothesis-holder, and neither can be dropped; the deviation is named rather than smuggled.

---

### Scene 9 — *Che fine ha fatto?* — the audit inside the glow

*Attested closing length: **5 turns** (4:144–169), profile 60 / 60 / **5** / 70 / **150** — it closes on the longest turn in the exchange.*

| | English | Italiano |
|---|---|---|
| TOM | A few years ago we had a group — brilliant people. We wanted to grow food for the whole street. | Qualche anno fa avevamo un gruppo — gente in gamba. Volevamo coltivare cibo per tutta la via. |
| ARAN | Sounds fantastic. And what happened to that group? | Sembra fantastico. E che fine ha fatto, quel gruppo? |
| TOM | …It's gone cold. | …Si è raffreddato. |
| ARAN | How many of you were there? | Quanti eravate? |
| TOM | Fifteen. We did a design day, we made a ten-year plan. All of them busy. All of them time-poor. | Quindici. Abbiamo fatto una giornata di progettazione, abbiamo fatto un piano di dieci anni. Tutti impegnati. Tutti poveri di tempo. |
| ARAN | There's your answer. Fifteen people in a whole street, and every one of them without time. It wasn't the idea that failed — there just aren't many people with time. There never are, anywhere. | Ecco la risposta. Quindici persone in tutta una via, e nessuna di loro con tempo. Non è stata l'idea a fallire — è che non c'è tanta gente che ha tempo. Non c'è mai, da nessuna parte. |

**Why:** the deflating answer drops to three words — 0.24× median, the shape's own attested minimum — and the diagnosis becomes the scene's closing hold, which is exactly where the corpus puts its 150-word turn; the honest deflation reads as costly precisely because it is the shortest thing Tom says.

---

### Scene 10 — *Ci sbagliavamo* — public position-abandonment

*Attested closing length: **4 turns** (2:159–166), profile 250 / **3** / 200 / 8 — and one instance (2:30–36) closes in a **single turn** with no probe at all. The probe is a three-word question.*

| | English | Italiano |
|---|---|---|
| ARAN | For years we said it: three words of a language, an empty gesture. Classic tokenism. We used to laugh about it, honestly. And we were utterly wrong. | Per anni l'abbiamo detto: tre parole di una lingua, un gesto vuoto. Tokenismo classico. Ci ridevamo sopra, sinceramente. E ci sbagliavamo completamente. |
| TOM | Completely wrong? | Completamente? |
| ARAN | Utterly. Every single one of those people — three words, said with effort, badly, in the wrong order — made a connection that wouldn't have been there otherwise, and they didn't have to learn anything else at all. Three words open a door, and the door stays open. | Completamente. Ognuna di quelle persone — tre parole, dette con fatica, male, nell'ordine sbagliato — ha creato un legame che altrimenti non ci sarebbe stato, e non hanno dovuto imparare nient'altro. Tre parole aprono una porta, e la porta resta aperta. |
| TOM | And they cost the person almost nothing. That still amazes me. | E alla persona non costano quasi niente. Questo mi stupisce ancora. |

**Why:** the recantation and its holding-at-full-strength are the two things the shape exists to teach, and the corpus delivers both as holds separated by a three-word probe — so the scene is now two holds, one two-word probe at 0.11× median, and a close. Its max/median of 1.6 is *low on purpose*: the attested instance is 2.4 for the same reason — when both long turns are holds, the variance lives in the probe, not in the ratio.

---

### Scene 11 — *Sedici mesi* — the mirrored tease

*Attested closing length: **3 turns** (2:141–147) — and the tease **interrupts mid-clause**: Tom is cut off in the middle of "So what I'd like to do…".*

| | English | Italiano |
|---|---|---|
| TOM | You waited sixteen months to test one word? You're mad. | Hai aspettato sedici mesi per testare una parola? Sei matto. |
| ARAN | Sixteen months, yes. And since you've just called me mad — | Sedici mesi, sì. E visto che mi hai appena dato del matto — |
| TOM | Oh no. | Oh no. |
| ARAN | — you tested yourself in Chinese for a whole day. For fun. Nobody asked you to. You told me about it afterwards, and you were proud of it. | — tu ti sei messo alla prova in cinese per un giorno intero. Per divertimento. Nessuno te l'aveva chiesto. Me l'hai raccontato dopo, ed eri pure fiero. |
| TOM | …No, you're completely right. | …No, hai perfettamente ragione. |
| ARAN | Mad, both of us. That's why it works. | Matti, tutti e due. È per questo che funziona. |

**Why:** the ratified version split the evidence into two 11-word rows; in the corpus the tease is a single unbroken run and the victim's only contribution mid-tease is a groan — so "Oh no." becomes a genuine 0.22× minimal turn, the evidence becomes a 3.0× hold, and the scene carries an `A → token → A` sandwich.

---

### Scene 12 — *Le chiavi* — the metaphor handover

*Attested closing length: **5 turns** (2:234–247), profile 180 / **1** / 120 / 8 / 55. The completion is **one word**: "trip!"*

| | English | Italiano |
|---|---|---|
| TOM | Learning with other people — it's not a course. It's flexible; you decide together where you're going; it's temporary; and at the end, the thing you've made lives between you and the road. It's not a course. It's a trip in— | Imparare con altre persone — non è un corso. È flessibile; decidete insieme dove andare; è temporaneo; e alla fine, quello che avete creato vive tra voi e la strada. Non è un corso. È un viaggio in— |
| ARAN | —a car. Yes. I like the road trip. And it goes wider than that. | —macchina. Sì. Mi piace, il viaggio in macchina. E va anche più in là. |
| TOM | Wider how? | Più in là come? |
| ARAN | You'll do more than one. Sometimes with the same people, sometimes with new ones. A tour. And there will be crashes — that's the part you actually learn from. | Ne farai più di uno. A volte con le stesse persone, a volte con gente nuova. Un tour. E ci saranno degli incidenti — ed è da lì che impari davvero. |
| TOM | Now you're driving my metaphor. | Adesso la mia metafora la stai guidando tu. |
| ARAN | You gave me the keys. | Mi hai dato tu le chiavi. |

**Why:** this is the corpus's own profile transplanted almost row for row — the mint runs to 4.3× median, the completion arrives as the single word that opens Aran's turn (*macchina*, the Italian's own completion point), and the scene closes on two five-word turns exactly as 2:245–247 does. The English "trip in— / —a car" is the awkward half of carrying an Italian completion point in an English gloss; the Italian is the line that matters and it is clean.

---

### Scene 13 — *Il coccodrillo* — the co-owned line

*Attested closing length: **2 turns** (4:241–246): the line is minted at the end of one hold and claimed in the first twenty words of the next, which then keeps going.*

| | English | Italiano |
|---|---|---|
| TOM | Careful with that partner. You might wake up in bed with a crocodile. | Attento con quel socio. Potresti svegliarti nel letto con un coccodrillo. |
| ARAN | The crocodile — we're still using it? After all these years? | Il coccodrillo — lo usiamo ancora? Dopo tutti questi anni? |
| TOM | It's your line, not mine. You said it first, years ago, in the middle of something else entirely, and you said it exactly like this: I lost my foot in that river— | È una battuta tua, non mia. L'hai detta tu per primo, anni fa, nel mezzo di tutt'altro discorso, e l'hai detta proprio così: ho perso il piede in quel fiume— |
| ARAN | —please accept my anecdotal evidence. Yes. Though by now it's yours too. | — ti prego, accetta la mia prova aneddotica. Sì. Anche se ormai è anche tua. |
| TOM | It is now. | Adesso sì. |
| ARAN | A good line ends up belonging to both. Like everything else in a long conversation — after a while you stop knowing who brought what. | Una bella battuta finisce per appartenere a tutti e due. Come tutto il resto, in una conversazione lunga — dopo un po' non sai più chi ha portato cosa. |

**Why:** at CV **0.21** this was the flattest scene in the whole set — six rows between 7 and 13 words, a metronome. The provenance now runs as a hold that arrives at the shared line by a long route, so the completion across the turn boundary lands on something with momentum behind it, and "It is now." at 0.24× median gives the scene the minimal turn it entirely lacked.

---

### Scene 14 — *Il cane* — the banked thread

*Attested closing length: **none — this is not dialogue.** The corpus's last line (4:474) is an **editorial annotation** ("At this point we got interrupted by the dog"), not a turn. The container here is therefore authored on the corpus's general grammar rather than on an instance, and that is stated rather than implied.*

| | English | Italiano |
|---|---|---|
| ARAN | So the third thing — and this is the important one — is that when you actually— | Quindi la terza cosa — ed è quella importante — è che quando tu davvero— |
| TOM | Hang on. The dog. | Aspetta. Il cane. |
| ARAN | The dog? | Il cane? |
| TOM | The dog has opinions. Someone's at the door, and the dog has views about the door, and about the person behind it. This will take a while. | Il cane ha delle opinioni. C'è qualcuno alla porta, e il cane ha le sue idee sulla porta, e su chi c'è dietro. Ci vorrà un po'. |
| ARAN | Fine. We'll pick this up next time — you owe me a third thing. | Va bene. Riprendiamo la prossima volta — mi devi una terza cosa. |
| TOM | Noted. The third thing, for next time. | Segnato. La terza cosa, alla prossima. |

**Why:** the one thing the corpus does attest about interruptions is that they **cut a clause in half** (2:141–144), so Aran's opening now breaks mid-sentence and is never completed — which is also what makes the banked debt legible; "The dog?" at 0.18× median is the minimal turn.

---

### Scene 15 — *Vorrei un mutuo* — the puppet show

*Attested closing length: **2 turns** (4:102–113) — and in the corpus the explainer stages **both parts himself**; the partner's entire contribution is "Nope." **Casting the partner is a mint**, not an attestation. See §8.*

| | English | Italiano |
|---|---|---|
| TOM | But where does a bank get the money for a mortgage? | Ma dove li prende, una banca, i soldi per un mutuo? |
| ARAN | It doesn't. Watch — I'll be the bank, you be you. You come in, you sit down, and you say it: "I'd like a mortgage." Go on. | Non li prende. Guarda — io faccio la banca, tu fai te. Tu entri, ti siedi, e dici: «Vorrei un mutuo». Dai. |
| TOM | "I'd like a mortgage." | «Vorrei un mutuo». |
| ARAN | And the bank says: "Of course. One moment." And it invents the money. There. Now it exists. A second ago it didn't exist, and it didn't come out of anybody else's account. | E la banca dice: «Certo. Un momento». E inventa i soldi. Ecco. Adesso esistono. Un secondo fa non esistevano, e non sono usciti dal conto di nessun altro. |
| TOM | It doesn't take it from anywhere? | Non li prende da nessuna parte? |
| ARAN | From nowhere. A magic wand. That's why it's a power. | Da nessuna parte. Una bacchetta magica. È per questo che è un potere. |

**Why:** the staging and the reveal become two holds at 3.2× median, which is the corpus's own monologic shape, while Tom's cast line stays the four-word turn round two identified as the cheapest summit move in the set — the scene now costs a listener two holds and a learner four owned words.

---

### Scene 16 — *In pausa* — the parked clash

*Attested closing length: **7 turns** (2:378–401), profile 50 / **350** / 70 / 45 / 5 / 140 / **9** — escalating holds closed by the shortest turn in the exchange. **And Tom parks it, not Aran.***

| | English | Italiano |
|---|---|---|
| TOM | Thirteen weeks. One full day to start, then two hours a week for eleven weeks, then one full day to close. That would probably be plenty. | Tredici settimane. Un giorno pieno per iniziare, poi due ore alla settimana per undici settimane, poi un giorno pieno per chiudere. Probabilmente basterebbe. |
| ARAN | Mm. I'd be inclined not to differentiate that much. Here's the model: five days, then a year of an hour or two a week, then five days again. With your thirteen weeks you'd surprise a few people. And you'd lose a few. | Mm. Io sarei propenso a non differenziare così tanto. Il modello è questo: cinque giorni, poi un anno di un'ora o due alla settimana, poi altri cinque giorni. Con le tue tredici settimane qualcuno lo sorprenderesti. E qualcuno lo perderesti. |
| TOM | Fewer than you think. | Meno di quanto pensi. |
| ARAN | Maybe. But one day, twelve weeks, one day — some of them will hear that and think it isn't enough to be worth doing. To me the risk doesn't seem worth it. Five days. | Può darsi. Ma un giorno, dodici settimane, un giorno — qualcuno lo sentirà e penserà che non basta per valerne la pena. A me il rischio non sembra valerne la pena. Cinque giorni. |
| TOM | And I still like my thirteen weeks. | E a me piacciono ancora le mie tredici settimane. |
| ARAN | I know. And I still don't. | Lo so. E a me continuano a non piacere. |
| TOM | Then we'll put it on pause. Okay. | Allora la mettiamo in pausa. Va bene. |

**Why:** the attested clash escalates through two big holds and is closed by its **shortest** turn, and the re-cut reproduces that at 6.0× max/median — the widest spread in the set, in the scene that needs it most. **One fidelity correction the measurement forced: the park is Tom's line** ("Yep. We'll just put that on pause. Okay.", 2:401), and the ratified scene gave it to Aran; that is now put back. *Valerne la pena* — the set's most surgical near-neighbour point — is preserved and now appears twice, in Aran's own two turns, which is how a position gets restated at full strength.

---
## 7. Per-scene accounting — every number computed from the tables above

*Generated mechanically from this document's own English columns, same tokenisation as §2. "old" = the ratified six-row table, measured in §2c.*

| Scene | turns | CV | attested close | new profile (words/turn) | median | max/med | min/med | shortest turn | word share |
|---|---|---|---|---|---|---|---|---|---|
| **Scene 1** | 6 → **4** | 0.35 → **0.98** | 2–3 | 42/9/2/10 | 9.5 | **4.4×** | 0.21× | 2w | T 70 / A 30 |
| **Scene 1-bis** | 6 → **4** | 0.31 → **0.78** | 2–3 | 35/9/10/6 | 9.5 | **3.7×** | 0.63× | 6w | T 75 / A 25 |
| **Scene 2** | 6 → **6** | 0.56 → **0.76** | 3 | 10/2/28/9/11/5 | 9.5 | **2.9×** | 0.21× | 2w | T 25 / A 75 |
| **Scene 3** | 6 → **6** | 0.46 → **0.89** | 3 | 6/2/21/3/5/6 | 5.5 | **3.8×** | 0.36× | 2w | T 74 / A 26 |
| **Scene 4** | 6 → **6** | 0.48 → **0.81** | 3 (+intra-turn) | 19/9/13/2/42/10 | 11.5 | **3.7×** | 0.17× | 2w | T 22 / A 78 |
| **Scene 5** | 6 → **6** | 0.47 → **0.88** | 2 | 9/3/3/28/5/11 | 7.0 | **4.0×** | 0.43× | 3w | T 71 / A 29 |
| **Scene 6** | 6 → **8** | 0.38 → **0.89** | 8 | 8/2/4/7/2/8/6/25 | 6.5 | **3.8×** | 0.31× | 2w | T 32 / A 68 |
| **Scene 7** | 6 → **6** | 0.47 → **0.73** | 3 | 9/21/1/33/8/13 | 11.0 | **3.0×** | 0.09× | 1w | T 21 / A 79 |
| **Scene 8** | 6 → **6** | 0.41 → **0.81** | 2 | 12/13/37/8/2/10 | 11.0 | **3.4×** | 0.18× | 2w | T 62 / A 38 |
| **Scene 9** | 6 → **6** | 0.49 → **0.70** | 5 | 19/8/3/6/19/33 | 13.5 | **2.4×** | 0.22× | 3w | T 47 / A 53 |
| **Scene 10** | 6 → **4** | 0.37 → **0.78** | 4 (once 1) | 27/2/46/11 | 19.0 | **2.4×** | 0.11× | 2w | T 15 / A 85 |
| **Scene 11** | 6 → **6** | 0.45 → **0.80** | 3 | 10/10/2/27/4/8 | 9.0 | **3.0×** | 0.22× | 2w | T 26 / A 74 |
| **Scene 12** | 6 → **6** | 0.53 → **0.89** | 5 | 40/14/2/28/5/5 | 9.5 | **4.2×** | 0.21× | 2w | T 50 / A 50 |
| **Scene 13** | 6 → **6** | 0.21 → **0.61** | 2 | 13/10/32/12/3/24 | 12.5 | **2.6×** | 0.24× | 3w | T 51 / A 49 |
| **Scene 14** | 6 → **6** | 0.49 → **0.74** | n/a — not dialogue | 15/4/2/27/13/7 | 10.0 | **2.7×** | 0.20× | 2w | T 56 / A 44 |
| **Scene 15** | 6 → **6** | 0.43 → **0.70** | 2 | 11/26/4/32/6/10 | 10.5 | **3.0×** | 0.38× | 4w | T 24 / A 76 |
| **Scene 16** | 6 → **7** | 0.37 → **0.81** | 7 | 26/42/4/33/7/6/7 | 7.0 | **6.0×** | 0.57× | 4w | T 35 / A 65 |

**Set totals** (the sixteen; Option B excluded): **95 turns against 96**; set median 9 words; **pooled CV 0.86, against 0.48**; longest turn 46 words = **5.1× the set median, against 2.2× before**; shortest 1 word.

**Set-level speaker balance (G6): Tom 41% of words / Aran 59%** — near-even across the set, while individual scenes run as lopsided as 85/15. That is the corpus's asymmetry (73/27 within a session, §3b) put where it belongs: inside the scene, not across the set.

### 7a. The re-cut grammar of §5, scored honestly

| rule | target | delivered | before |
|---|---|---|---|
| **G1** length derived from the shape | 3–8 turns, spread | **[4, 6, 7, 8]**; 12 of 16 land on six — reached from below, not assumed | 16/16 on six |
| **G2** one floor-hold ≥3× scene median | 16/16 | **11/16** | **0/16** — at 3× and at 4× |
| **G2′** ≥ the shape's OWN attested max/median | 16/16 | **11/16** (below: Scene 1, Scene 4, Scene 8, Scene 9, Scene 16); Scene 14 has no attested instance | 0/16 |
| **G4** one minimal turn ≤0.25× median | 16/16 | **11/16** | 4/16 |
| **G4′** ≥1 turn of ≤4 words, absolute | 16/16 | **16/16** | 9/16 |
| **G5** `A → token → A` sandwich in ≥⅓ of scenes | ≥6 | **5** — Scenes 3, 4, 7, 11, 14 | 0 |
| **G7** CV ≥ 0.6 | 15/16, Scene 6 exempt | **16/16** | 0/16 |

### 7b. Where the grammar was missed, and why — no miss is silent

**G2 (the flat 3× bar) — five scenes below it: 2, 9, 10, 13, 14.** In four of the five the *corpus's own instance of that shape* is at or below the same ratio: the anecdote closes at 1.5× (Scene 2 delivers 2.9×), the audit at 2.5× (Scene 9 delivers 2.4×), position-abandonment at 2.4× (Scene 10 delivers 2.4×), the co-owned line at 1.3× (Scene 13 delivers 2.6×). Scene 14 has no attested instance at all. **A flat 3× bar is itself a flat prior**, which is why G2′ — measure each scene against its own shape — is the honest gate, and the one this document uses.

**G2′ — five scenes below their shape's attested ratio: 1, 4, 8, 9, 16.** Four of these are shapes whose corpus ratio is simply unreachable at learning scale: joint construction runs 30×, the razor 50×, the reformulation 6×, the parked clash 7×. **A 30× hold in a scene with a 9-word median is a 280-word Italian turn.** Scene 9's 2.4× against 2.5× is a rounding-level miss. These five are named rather than tuned away, and they are the same tension §8a names.

**G4 (the ≤0.25× ratio) — five below: 3, 5, 6, 15, 16.** Every one of them nevertheless contains a turn of **two to four words** (G4′ passes 16/16). The ratio fails only because the scene's own median is already small: in Scenes 3, 5 and 6 the median is 5.5–7 words, so a 0.25× turn would be a **single word**, and the rule is close to unsatisfiable rather than unmet. Scene 15's 4-word turn is the ratified cast line, which must not shrink. Scene 16's median of 7 is pulled down by the three short turns that *close* the clash — the attested profile.

**G5 — five scenes carry the `A → token → A` sandwich against a target of six.** Scenes 3, 4, 7, 11, 14. I stopped at five rather than manufacture a sixth: in each of the five the sandwich is doing work the shape asked for (a teasing audit, a clock, an invitation, a groan, an interruption). A sixth inserted to hit a number would be exactly the flat-prior error in miniature. **This is a genuine under-delivery against my own rule and it is a taste call, not an oversight** — one sentence from Tom adds one.

**Scene 6, the one deliberate over-shoot.** Its delivered CV is 0.89 against the haggle's attested 0.65, because the re-cut gave it two two-word turns. Its max/median of 3.8× matches the attested 3.5× closely and the exchange stays fast and flat in feel. Flagged rather than tuned away.

---

## 8. The teaching tensions — flagged, not resolved

**One distinction per blink still binds.** These are the places where the measured distribution and the teaching pull against each other. In every case the recommendation is given, and the conflict is presented as a conflict.

### 8a. The floor-hold ceiling — the general case

The corpus's floor-holds run **56 to 473 words** — 4× to 34× the median. At scene scale, a faithful 34× hold would be **a 280-word Italian turn**. That is not a learning event; it is a podcast. **Recommendation, taken:** rule **G3** — the hold is always a *heard* turn (surface-forms-admitted, availability only, never a prompt target), which is already ratified doctrine, and it is capped at **3–4×** rather than the attested 4–34×. The set's longest turn is 46 words. **The conflict, stated plainly: the re-cut set is measurably tamer than the corpus, deliberately, and its floor-holds run at roughly a tenth of the attested extreme.** If Tom's ear says the holds are still too short, they can go longer at zero cost to the *owned* content, because nothing in a hold is a production target. If his ear says they are already too long, the number to cut is the hold, not the scene.

### 8b. Scene 5 — the sharpest single conflict in the set

**Attested:** the whole not-knowing move — question cascade, "I don't know", handover — arrives as **one 110-word turn** (4:68–77), answered by another long turn. **Required:** Scene 5 is zero-admission at Layer 0. A faithful re-cut would be two 100-word turns built from a dozen words, which is neither speakable nor learnable. **Chosen:** the ratified ping-pong stays; the hold is manufactured by *repeating* words the scene already owns, which buys 4.0× max/median without admitting a single new word. **The conflict:** this scene is now the least faithful to the corpus of the sixteen, on purpose. My recommendation is to keep it exactly as it stands — it is the response family the live canon most conspicuously lacks, and a learnable approximation of the shape beats a faithful one nobody can say.

### 8c. Scene 15 — the puppet show casts a partner the corpus never casts

In the corpus (4:102–113) the explainer stages **both parts himself** and the partner's entire contribution is "Nope." Round two's turn 3 — Tom accepting the casting and speaking the line — is a **mint**, and round two described it as "the deep part of the move". **It is the deep part, and it is invented.** Recommendation: keep it. It is the cheapest summit turn in the whole set (four owned words) and it converts a monologue into an exchange. But it should be recorded as a mint alongside Scene 14 and Scene 16, not as attestation — round two lists Scene 16 as the deficit-mint and does not list this one.

### 8d. Scene 14 has no attested container at all

The corpus's last line — *"At this point we got interrupted by the dog"* — is an **editorial annotation written after the fact**, not a turn either of them spoke. Round two called it "the corpus's actual last line", which is true of the file and not true of the conversation. Scene 14's shape is sound and its container is authored on the corpus's general grammar (interruptions cut a clause in half, 2:141–144). Recorded so nobody later cites 4:474 as dialogue.

### 8e. Turn-boundary moves reassign ratified lines

Named once, because it recurs: re-cutting moves lines between mouths. Scene 1 gives Tom "The edges"; Scene 8 keeps Tom's elaboration but lets it run to 37 words; Scene 16 gives the park back to Tom, which is a *correction* to attestation. If any specific reassignment offends the ear, it is a one-line fix — the text is preserved, only the boundary moved.

---

## 9. The three still open — shown both ways, decided neither

1. **Scene 1, A or B.** Both are re-cut above, on identical logic, and the re-cut does **not** change the recommendation either way — Option A reaches CV 0.98 and 4.4× max/median, Option B 0.78 and 3.7×, and both work. Round two's recommendation (keep A, hold B in reserve) is unaffected by anything measured here. **One letter.**
2. **Whether the parked clash is Tom's true disagreement form.** Unchanged by the measurement, and reinforced by it: across 591 turns there is not one standing clash. What the measurement *did* find is that **Tom is the one who parks it** (2:401), and Scene 16 now reflects that. If the standing clash is real in their conversational life, Scene 16 gets a sibling — his ruling, not mine.
3. **Whether the Cambridge-drive origin story is safe.** Untouched. Scene 11 carries the sixteen-month self-experiment surface, as round two set it. If Tom rules the drive safe, the surface swaps back with **no change to the re-cut container** — the shape and the profile are the same either way.

---

## 10. Explicit gaps — nothing papered over

- **Part 3 is lost.** All measurement is on three sessions of four. Nothing here claims otherwise.
- **The backchannel reconstruction is a reconstruction.** Segmentation B is my inference from 223 mid-run ratification tokens, not a recovered recording. Both segmentations are reported side by side (§2a) precisely so the re-cut can be re-derived if Tom prefers A. Under A, the medians are 3–4× larger and every conclusion about *ratios* is unchanged; only absolute word counts move.
- **The 73/27 speaker split is podcast-shaped and I do not generalise it** (§3b). The claim carried into the design is the narrow one: within any single exchange, one holds and the other punctuates.
- **No database was read.** The brief scoped this job to writing and measuring, so zero-admission was held by a stricter rule than a query: Scenes 3, 5 and 6 were re-cut using **only words already present in the ratified zero-admission tables**, which round one and round two verified against the live canon. **No new vocabulary enters a zero-admission scene, so nothing needed re-verifying.** If a future pass wants the added Italian words in Scenes 3/5/6 confirmed against `ita_for_eng:pod-1` directly, that is one read-only query and it is not in this job.
- **The Italian I am least sure of, flagged rather than shipped quietly:** Scene 12's English "It's a trip in— / —a car" is an awkward gloss forced by putting the completion point where *Italian* breaks (*viaggio in— / —macchina*); the Italian is right and the English is a scaffold. Scene 13's "nel mezzo di tutt'altro discorso" and Scene 16's "sarei propenso a" are register calls — both are natural, both are slightly more written than *tu*-between-friends usually goes. Scene 4's "un piano di lezione" is a calque of "lesson plan"; *una lezione programmata* would be more Italian and less pointed. Three lines, one look each.
- **No audio was queued or rendered; no pod content was edited in place; no learner progress is affected.** This document creates no obligation on any pipeline.

---

## 11. What this changes, in one paragraph

Six-turn symmetry is retired as a rule and replaced with a measurement: **scene length is the shape's attested closing length (2 to 8 turns), one turn per scene is a heard floor-hold at 3–4× the scene median, one turn is two to four words, and the speaker balance is lopsided inside a scene and even across the set.** Applied to the sixteen, that gives 95 turns instead of 96 — the set did not get longer, it got *uneven* — with pooled CV moving from 0.48 to 0.86 against the corpus's 1.13, no floor-holds becoming eleven of sixteen, and the flattest scene in the set (13, at CV 0.21) becoming one of the more varied. The shapes, the subjects, the near-neighbour points and the zero-admission status are exactly as ratified. What is left is the ear.
