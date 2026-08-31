# The canonical CORE pod-seed set — the trunk's own productive walk

**Authored 2026-08-31.** This is the canonical **English known-side** pod-seed set for CORE —
the artefact that gives the trunk's own pod corpus its cut handles, so that pod material can
enter every course's LEGO baskets. There is one canonical set, identical for every pair by
definition. **It contains no target language of any kind.** The target side is a pair overlay
and a separate downstream mapping job. This is the same act that produced the canonical health
seed set (`docs/sector-pods/health-general-seed-set-2026-08-31.md`), pointed at the trunk.

**Why it exists, measured not asserted** (job #450, the unified frame map): every eng-known
course can finish all 668 seeds without ever cutting a greeting. "hello", "and you",
"here you are", "got it" are cut nowhere in `spa_for_eng`. Ownable dialogue frames at end of
course: spa 6/18, deu 10/18, fra 10/18. The conversational register is not under-practised —
it is **un-cut**, and no prompt engineering reaches it. The pod already delivered every one of
these lines as a known/target pair; the learner owns the material. What is missing is the
handle, and a handle is a cut.

**The rulings this set is authored under** (Tom, 2026-08-31, none re-openable):

- **If it's been in a dialogue, they own it.** A pod line delivered as a known/target pair IS
  an established mapping; ZUT is about determinism, not drill count. Pod material needs a CUT,
  not a new SEED — the admission event already happened in the pod.
- **A pod sentence, intact, is a legitimate basket phrase** if it contains the LEGO being
  taught: the whole sentence is one established mapping, so ZUT is satisfied as a unit. It
  counts as corpus representation always, and toward pattern diversity to the degree its
  frame's slots are fillable from cut material (the existing instantiability gate).
- **Never cut a pod smaller than a phrase.** Atomising destroys the worn whole chunk that is
  the pod's entire value. A floor, not a preference. (Single meaningful units of intention —
  "hello", "a taxi", "left" — are phrases in this sense: complete conversational moves or
  order-tokens. The forbidden atoms are grammar fragments that are not moves.)
- **Cuts are on the target side in the pair overlay only** — and that is NOT this document.
  This is the canonical layer: English known side, no target language, no course code.
- **Pods do not cut, which is why pod known text is identical across pairs** — this set is
  pair-invariant by construction and must stay so.
- **Seeds SEQUENCE, LEGOs ADMIT, phrases MINT** — and the learner only ever touches the last.
  Floors belong to the LEGO basket, never the seed.

**Sources (read-only, unedited):**

- `services/shared/metagraph/walks/pod-0.json` — the live POD 1, byte-identical, untouched.
  It places 175 of the corpus's 231 rows (16 encoded walks + 69 drill rows + 16 codas + 4
  alternatives) and names the 56 rows on unencoded complete walks as a gap. The full 231
  surfaces were therefore read, read-only, from `canonical_pod_scenarios` (`pod_slug =
  'pod-0'`, the live POD 1; the sacked slates `pod-1` and `pod-0.5` are positively excluded).
  Row ids `gNN` below are `global_order` in that table.
- `services/shared/metagraph/walks/core-scene-0.json` — W1201–W1204, the medium contract's
  OFFER realisation (job #490, v2 as landed at `f590e9c95`).
- `services/shared/metagraph/walks/core-scene-0-notice.json` — W1401, the NOTICE realisation.
- `services/shared/metagraph/walks/core-recoveries.json` — W1301–W1305, the five withheld
  recoveries at their sited points.

**What this feeds:** the pair-overlay mapping job for each pair; the frame layer's
instantiability gate (`tools/frame-layer/availability.cjs`), which will find these chunks cut
and open the dialogue frames; and the cross-course union ZUT gate, which checks the ownership
statements in §4.

---

## 1. The projection — who mints, decided per role

The health set's projection question was "would a general health worker need to produce this
turn?". The trunk's analogue: **would the learner — the visitor living a day in the target
country — need to produce this turn, essentially as written?** The corpus answers it by role:

1. **Learner-role turns in walks mint.** Sarah, Customer, Guest, Tourist, Passenger (scene 14),
   Learner, James — the person the pod follows.
2. **All 73 drill rows mint** (scenes 15–21, speaker "Learner"). This includes the handful of
   service-side surfaces the pod itself promotes to learner drills ("No, we only take cash",
   "Do you want to pay by cash or card or put it on the room?", "It's down there on the left",
   "Would you like to order some drinks?") — the pod has already ruled those producible, and
   this set follows its ruling rather than re-litigating it.
3. **Counterpart turns mint only where the act is role-symmetric civilian business:** greetings
   and closings, the well-answer, thanks-downgrades ("You're welcome"), reassurance ("I will,
   don't worry", "I think that's normal"), the grant ("No, it's free. Please, go ahead"), the
   decline-with-counterproposal ("No, I'm sorry, I'm busy tomorrow. But let's talk on
   Saturday"), and the whole of the peer scenes (6 and 22), where both speakers are civilians
   and the learner will occupy either chair. Each minting counterpart turn is named in the
   ledger with this justification.
4. **Service-professional working lines stay receptive context** — "What can I get you?",
   "That's eight pound forty altogether", room details, dosing instructions, turn-by-turn
   direction-giving. The learner hears them (the mapping is owned — heard in dialogue), but
   the trunk's productive walk does not need them; a hospitality or retail sector pod is where
   they would mint. The one deliberate exception is the deictic handover (§3, D5).
5. **The 16 narrator codas** ("1. 2. 3. White. Black.") are vocabulary admission events, not
   frames (the frame map's own exclusion). They mint no seeds; their atoms — numbers, colours,
   days, months, clock times — enter Appendix A as assumed course-core vocabulary, which every
   base course cuts on its own account.

Every one of the 231 rows and 35 authored-walk steps is accounted for in the ledger (§6):
minted, consolidated, deferred, receptive, or coda.

---

## 2. Sequencing — walk order is not cut order

The pod has already delivered everything; nothing here is a first exposure. So the cut order
owes nothing to the delivery order and everything to **admission economy**: each seed admits as
little as possible, and zero-admission seeds — a pod sentence whose whole cut tiles from
already-owned chunks — are manufactured wherever the corpus allows, because they hand the
basket generator a complete worn sentence at zero new-LEGO cost. Only 7 of 668 seeds in
`spa_for_eng` are zero-admission; this set contains 14, each marked **ZERO**.

**Availability window:** for LEGO k in seed N — everything through seed N−1, plus LEGOs 1..k−1
of seed N, plus their components. Plus the assumed course-core strings each seed names
explicitly (Appendix A is their union). No forward references anywhere; verified mechanically
against the document (§7).

**Anchoring and interleave.** Unlike a sector segment, this thread has no single anchor: it
runs THROUGH the course, starting where pods start (activation round 6 of the base course).
Each seed's ownership statement is its own anchor contract: a pair overlay schedules each seed
at the earliest base-course position where that seed's assumed strings are owned, keeping this
document's order. The earliest seeds assume nothing at all — a greeting needs no prerequisite
— which is what lets the conversational register open at round 6 rather than seed 600.
Anything a base course does not own at the scheduled point, the overlay authors in-pair as
`is_new = true`; the canonical set does not move.

**Block order** (the register the learner needs first, at the lowest admission cost first):
A ritual open/close · B thanks and the particles · C introductions and the reciprocal loop ·
D attention, apology, repair · E the learner's contract (scene 0) · F café and ordering ·
G pub and restaurant · H paying and the handover · I hotel · J shop and pharmacy ·
K directions and travel · L time, weather and feelings · M talking about talking.

---

## 3. The seven named unlocks — resolved against what the corpus attests

Job #450 named the seven cheapest wins, each unlocking a structurally unreachable dialogue
frame. The corpus attests four verbatim; two are attested through their frame-siblings; one is
not attested in CORE at all. Nothing is minted that the corpus does not attest.

| Unlock | Frame | Attested in CORE? | Resolution |
|---|---|---|---|
| "hello" | D1 | g20, g21, g25, g131 | mints in **CP001**, the first seed |
| "and you" | D6/X1 | g26, g28, g29, g32 | mints in **CP025** (block C) |
| "sorry" / "I'm sorry" | D4/X3 | g21, g33, g150, g161, g182 | mints in **CP038** (block D) |
| "don't worry" | D11 | W1201.4 "I will, don't worry." | mints in **CP013** (block B, counterpart turn, reassurance is role-symmetric) |
| "here you are" | D5/X5 | **not verbatim** — attested as "here's my passport" (g99, learner-side), "here it is" (g65), "here's your coffee" (g18) | D5's attested alternates mint in **CP105/CP106** (block H); "here you are" itself is a corpus gap — see §8 |
| "not at all" | D11/X6 | **not attested** — X6 attested as "you're welcome" (g94), "no problem" (g222) | X6 mints via **CP011/CP012** (block B); "not at all" is a corpus gap — see §8 |
| "got it" | D10/X4 | **not attested in scoped CORE** (the inventory's specimen is from the sacked pod-1 slate); X4's read-back act is attested by echo, without a receipt token (W1401.3/.5/.7, W1303.5) | the read-back mints in **CP152/CP153** (block K); D10's fixed tokens ("got it", "understood") are a corpus gap — see §8 |

So five of the seven unlock frames open from this set as authored, early and cheap; D10
verbatim-receipt and the two named surface forms wait on one line of future walk authoring
each (§8 names the cheapest fix).

---

## 4. The spine — the ordered seed set

**Reading the entries.** Each seed carries: its verbatim source line with row id (or walk id
and step); the canonical English seed; the phrase-minimum cut — `chunk` **(new)** admits a
LEGO, `chunk` *(CPnnn)* is owned by an earlier seed in this set, `chunk` *(core)* is an
assumed course-core string (Appendix A); the derived job — what it admits that no earlier seed
did, over new LEGOs, new frames, and new sides of existing splits; and the ownership
statement, implicit in the cut's citations and stated where it needs a word. Where the
canonical seed differs from its source line, the edit and its reason are stated. Language
names are rendered deictically ("your language", "it"), scene 0's ratified convention, so the
set instantiates in any pair. British spelling is normalised once: the corpus's verb
"practice" (g95, g149) is written "practise"; the noun keeps "practice" (g229).

Glue — bare "and", "but", "so", "well", "just", "though", "too", "very", "now", "also",
"again" as connective tissue, and personal names as slot content — is course-core and never
minted (Appendix A). A chunk marked **(new)** always includes its own glue when the worn form
carries it.

### Block A — ritual open and close (D1)

**CP001 — hello, and the evening open**
- Source g20, sc4 (Friend, 7 pm): "Hello, good evening!"
- Seed: **"Hello — good evening!"**
- Cut: `hello` **(new)** · `good evening` **(new)**
- Job: opens D1, the frame no seed corpus can attest — no seed opens a conversation. "hello"
  is unlock #1 and this is the cheapest seed in the set.
- Assumes owned: nothing.

**CP002 — the morning open, and the first question**
- Source g2, sc1 (Sarah): "Good morning. How are you?"
- Seed: **"Good morning. How are you?"**
- Cut: `good morning` **(new)** · `how are you` **(new)**
- Job: the morning token, and the solicitous open — D1 plus the first initiating question.
- Assumes owned: nothing.

**CP003 — the greeting with a name (ZERO)**
- Source g1, sc1 (Neighbour, 8 am — role-symmetric greeting): "Good morning, Sarah!"
- Seed: **"Good morning, Sarah!"**
- Cut: `good morning` *(CP002)* · vocative name *(core — names are slot content)*
- Job: **zero admission.** Adds the vocative side of D1 — greeting a named person — at no new
  LEGO. The first manufactured zero-admission seed.

**CP004 — the afternoon token**
- Source g11, sc3 (Sarah), first sentence: "Good afternoon."
- Seed: **"Good afternoon."**
- Cut: `good afternoon` **(new)**
- Job: completes the daypart paradigm's third member (morning, evening, afternoon) before any
  service scene needs it — paradigm balance, not scatter.
- Assumes owned: nothing.

**CP005 — thanks, and the close**
- Source g19, sc3 (Sarah): "Thank you very much. Goodbye."
- Seed: **"Thank you very much. Goodbye."**
- Cut: `thank you very much` **(new)** · `goodbye` **(new)**
- Job: the emphatic thanks (D3) and the ritual close (D1's other end). Ends every service
  exchange in the corpus; earliest possible position on purpose.
- Assumes owned: nothing.

**CP006 — the evening greeting returned, with care**
- Source g23, sc5 (Neighbour, 10:30 pm — role-symmetric): "Good evening, Sarah. Did you have a long day?"
- Seed: **"Good evening, Sarah. Did you have a long day?"**
- Cut: `good evening` *(CP001)* · vocative *(core)* · `did you have a long day` **(new)**
- Job: one new LEGO — the solicitous evening question. The greeting side is CP003's, reused.

**CP007 — the night close**
- Source g24, sc5 (Sarah), closing pair (the row's front half is CP161's seed — one row, two
  acts, split as stated): "Good night. See you tomorrow."
- Seed: **"Good night. See you tomorrow."**
- Cut: `good night` **(new)** · `see you tomorrow` **(new)**
- Job: the night token and the dated close — the "see you X" family's first member.

**CP008 — the casual close**
- Source g4, sc1 (Sarah), final sentence (the row's rest is CP162's seed): "See you later."
- Seed: **"See you later."**
- Cut: `see you later` **(new)**
- Job: second member of the see-you family; with CP007 the split is established, so g22's
  "see you then" (CP157) lands as a side, not a surprise.

### Block B — thanks, the particles, and the downgrades (D2, D3, D7, D11, D12, X6)

**CP009 — yes, please**
- Source g17, sc3 (Sarah): "Yes, please."
- Seed: **"Yes, please."**
- Cut: `yes` **(new)** · `please` **(new)**
- Job: the two highest-frequency particles in the corpus, each a complete move. "yes" opens
  D2/X2 (polar response) — the frame map's strongest single argument; "please" opens D8's
  fixed material.
- Assumes owned: nothing.

**CP010 — the well-answer**
- Source g3, sc1 (Neighbour — role-symmetric; the row's question tail "Are you going to work?"
  is CP163's seed): "I'm very well, thank you."
- Seed: **"I'm very well, thank you."**
- Cut: `I'm very well` **(new)** · `thank you` **(new)**
- Job: the canonical answer to CP002's question — X2's response position — and the bare
  thanks, the D3 alternate the emphatic CP005 form doesn't cover.

**CP011 — you're welcome**
- Source g94, sc10 (Assistant — role-symmetric: anyone thanked may downgrade): "You're welcome. …"
- Seed: **"You're welcome."**
- Cut: `you're welcome` **(new)**
- Job: opens X6 (thanks → downgrade), one of the seven unlocks' frames. One LEGO.

**CP012 — of course, no problem**
- Source g222, sc22 (Friend — peer scene, role-symmetric): "Of course, no problem. …"
- Seed: **"Of course, no problem."**
- Cut: `of course` **(new)** · `no problem` **(new)**
- Job: D2's third particle and X6's second downgrade; "of course" is also D7's granting
  assessment. Two of the most reused chunks in the whole corpus.

**CP013 — I will, don't worry**
- Source W1201.4, scene 0 (Barista — reassurance is role-symmetric): "I will, don't worry."
- Seed: **"I will, don't worry."**
- Cut: `I will` **(new)** · `don't worry` **(new)**
- Job: opens D12 (compliance commitment) and D11 (reassurance) in four words — "don't worry"
  is unlock #4. The corpus's only "don't worry" and it is already a worn pair.

**CP014 — that's very kind of you**
- Source g203, sc20 (drill): "That's very kind of you."
- Seed: **"That's very kind of you."**
- Cut: `that's very kind of you` **(new)**
- Job: the gratitude assessment (D7 family), kept whole — the worn form is the value.

**CP015 — you're very kind (near-ZERO)**
- Source g204, sc20 (drill): "You're very kind."
- Seed: **"You're very kind."**
- Cut: `you're very kind` **(new)**
- Job: the minimal-pair sibling of CP014 — same act, subject flipped. One LEGO, and the pair
  teaches the that's/you're split by contrast.

**CP016 — thanks for helping**
- Source g201, sc20 (drill): "Thank you for helping me."
- Seed: **"Thank you for helping me."**
- Cut: `thank you` *(CP010)* · `for helping me` **(new)**
- Job: opens the "thank you for X" frame — D3's productive slot — over an owned head.

**CP017 — thanks for the work (near-ZERO)**
- Source g199, sc20 (drill): "Thank you for all your work."
- Seed: **"Thank you for all your work."**
- Cut: `thank you` *(CP010)* · `for all your work` **(new)**
- Job: second filler of CP016's slot; the frame is now attested twice with distinct fills.

**CP018 — thanks for the manner (near-ZERO)**
- Source g205, sc20 (drill): "Thank you for being so friendly."
- Seed: **"Thank you for being so friendly."**
- Cut: `thank you` *(CP010)* · `for being so friendly` **(new)**
- Job: third fill, and the first gerund-of-being fill — the slot's productive range shown.

**CP019 — the good-luck wish**
- Source g200, sc20 (drill): "I wish you good luck with everything."
- Seed: **"I wish you good luck with everything."**
- Cut: `I wish you good luck` **(new)** · `with everything` **(new)**
- Job: the farewell wish — a close-adjacent move no seed corpus attests as a turn.

**CP020 — good luck with that (near-ZERO)**
- Source g202, sc20 (drill): "Good luck with that!"
- Seed: **"Good luck with that!"**
- Cut: `good luck` **(new)** · `with that` **(new)**
- Job: the bare form of CP019's wish — overlap is the teaching mechanism: "good luck" appears
  inside CP019's chunk and now alone.

**CP021 — that's normal**
- Source g230, sc22 (Friend — peer reassurance, role-symmetric; tail "But it's so much fun…"
  stays receptive, its act returns at CP190): "I think that's normal. Learning a new language is difficult."
- Seed: **"I think that's normal — learning a new language is difficult."**
- Cut: `I think` *(core)* · `that's normal` **(new)** · `learning a new language is difficult` **(new)**
- Job: D11's second fixed alternate ("that's normal"), and the learner's own topic — the
  language-learning frame that block M will build on.

**CP022 — thank you very much, and goodbye (ZERO)**
- Source g95, sc10 (Customer), final sentence: "Thank you very much, and goodbye."
- Seed: **"Thank you very much, and goodbye."**
- Cut: `thank you very much` *(CP005)* · `goodbye` *(CP005)* · glue *(core)*
- Job: **zero admission.** The composed close — both chunks owned, now attested as one joined
  move. Pure corpus representation.

**CP023 — yes, very (ZERO)**
- Source g24, sc5 (Sarah), first words (the row's remainder: CP007, CP161): "Yes, very."
- Seed: **"Yes, very."**
- Cut: `yes` *(CP009)* · `very` *(core — glue)*
- Job: **zero admission.** The minimal polar-plus-degree answer — D2 in two owned words,
  answering CP006's question in the corpus's own exchange.

### Block C — introductions and the reciprocal loop (D6/X1, scene 6)

**CP024 — the approach**
- Source g25, sc6 (James): "Excuse me. Hello. What's your name?"
- Seed: **"Excuse me. Hello. What's your name?"**
- Cut: `excuse me` **(new)** · `hello` *(CP001)* · `what's your name` **(new)**
- Job: "excuse me" opens D4 (attention-getter) — the initiating half of the repair register
  before repair itself arrives in block D — plus the name question.

**CP025 — the name, and the return**
- Source g26, sc6 (Anna — peer scene): "My name is Anna. And you?"
- Seed: **"My name is Anna. And you?"** (name is slot content)
- Cut: `my name is Anna` **(new — name slot)** · `and you?` **(new)**
- Job: **the X1 unlock.** "And you?" is attested four times in pod-0 and cut in no eng-known
  course (#450's worked case); this seed mints it, plus the name-statement frame. The single
  highest-yield cut in the set.

**CP026 — the short name, and meeting**
- Source g27, sc6 (James): "I'm James. Pleased to meet you."
- Seed: **"I'm James. Pleased to meet you."** (name is slot content)
- Cut: `I'm James` **(new — name slot)** · `pleased to meet you` **(new)**
- Job: the short self-naming (beside CP025's long form — a deliberate split, both corpus
  forms) and the meeting ritual.

**CP027 — the return performed (near-ZERO)**
- Source g28, sc6 (Anna): "Pleased to meet you too. Where are you from?"
- Seed: **"Pleased to meet you too. Where are you from?"**
- Cut: `pleased to meet you` *(CP026)* · `too` *(core — glue)* · `where are you from` **(new)**
- Job: one new LEGO — the origin question. The reciprocated ritual costs nothing.

**CP028 — origin, residence, and the return again**
- Source g29, sc6 (James): "I'm from Manchester, but I live in London now. And you?"
- Seed: **"I'm from Manchester, but I live in London now. And you?"** (places are slot content)
- Cut: `I'm from Manchester` **(new — place slot)** · `I live in London now` **(new — place slot)** · `and you?` *(CP025)*
- Job: the two origin-answers (from X, live in Y), and X1's pivot reused in its second corpus
  attestation — the frame, not the phrase, is what recurs.

**CP029 — origin with duration (near-ZERO)**
- Source g30, sc6 (Anna): "I'm from France. I've been here for two years."
- Seed: **"I'm from France. I've been here for two years."**
- Cut: `I'm from France` *(CP028 — slot fill)* · `I've been here for two years` **(new)**
- Job: one new LEGO — time-in-country, the visibly-foreign speaker's standing answer.

**CP030 — the place assessed, and the work question**
- Source g31, sc6 (James): "This is a lovely city. What do you do?"
- Seed: **"This is a lovely city. What do you do?"**
- Cut: `this is a lovely city` **(new)** · `what do you do` **(new)**
- Job: the compliment-of-place and the occupation question — the introduction walk's next two
  moves, in the corpus's own order.

**CP031 — the occupation answer, located**
- Source g32, sc6 (Anna): "I'm a nurse, at the hospital just round the corner. And you?"
- Seed: **"I'm a nurse, at the hospital just round the corner. And you?"** (occupation is slot content)
- Cut: `I'm a nurse` **(new — occupation slot)** · `at the hospital` **(new)** · `just round the corner` **(new)** · `and you?` *(CP025)*
- Job: occupation + workplace + the corpus's worn locative ("just round the corner", reused
  by g92's assistant), and X1's third attestation.

**CP032 — the occupation nuanced**
- Source g35, sc6 (James), first half (the holiday half is CP033 — one row, two acts):
  "I teach English, but not in a school. I work with adults."
- Seed: **"I teach English, but not in a school. I work with adults."**
- Cut: `I teach English` **(new — occupation slot)** · `not in a school` **(new)** · `I work with adults` **(new)**
- Job: the corrected occupation answer — assert, exclude, refine — the first negation-of-place
  move in the set.

**CP033 — on holiday, with family**
- Source g35, sc6 (James), second half: "I'm on holiday here with my wife and children. We're having a lovely time."
- Seed: **"I'm on holiday here with my wife and children. We're having a lovely time."**
- Cut: `I'm on holiday here` **(new)** · `with my wife and children` **(new)** · `we're having a lovely time` **(new)**
- Job: the visitor's self-account — status, company, and the progressive assessment.

**CP034 — the interested close**
- Source g36, sc6 (Anna): "How interesting. Well, lovely to meet you."
- Seed: **"How interesting. Well, lovely to meet you."**
- Cut: `how interesting` **(new)** · `lovely to meet you` **(new)**
- Job: the uptake assessment (D7) in its social register, and the closing variant of CP026's
  ritual — the meet-you split now has both its sides.

### Block D — attention, apology, repair (D4, X3)

**CP035 — the seat question**
- Source g5, sc2 (Sarah): "Excuse me, is this seat taken?"
- Seed: **"Excuse me, is this seat taken?"**
- Cut: `excuse me` *(CP024)* · `is this seat taken` **(new)**
- Job: D4's attention-getter doing real work — one new LEGO over an owned head.

**CP036 — the grant**
- Source g6, sc2 (Passenger — the grant is role-symmetric): "No, it's free. Please, go ahead."
- Seed: **"No, it's free. Please, go ahead."**
- Cut: `no` **(new)** · `it's free` **(new)** · `please` *(CP009)* · `go ahead` **(new)**
- Job: **the bare "no" arrives** — D2/X2's negative particle, deliberately early — plus the
  granting pair. The corpus's first polar-negative response.

**CP037 — say that again**
- Source g213, sc21 (drill): "Can you say that again?"
- Seed: **"Can you say that again?"**
- Cut: `can you` *(core)* · `say that again` **(new)**
- Job: opens X3 (repair) — the request half of unlock #3's frame, minted from the drill the
  pod itself provides.

**CP038 — the full repair turn**
- Source g33, sc6 (James): "I'm sorry, I didn't understand you. I'm learning [target language]. Could you say that again more slowly?"
- Seed: **"I'm sorry, I didn't understand you. I'm learning your language. Could you say that again more slowly?"** — the bracketed language name rendered deictically, scene 0's ratified convention.
- Cut: `I'm sorry` **(new)** · `I didn't understand you` **(new)** · `I'm learning your language` **(new)** · `could you` *(core)* · `say that again` *(CP037)* · `more slowly` **(new)**
- Job: **"I'm sorry" is unlock #3**, minted inside the corpus's canonical repair turn: apology,
  the non-understanding report, the learner's self-identification, and the slowed re-request.
  Four new LEGOs, every one a repair-register staple.

**CP039 — the speed apology (near-ZERO)**
- Source g150, sc15 (drill): "I'm sorry I can't speak very quickly."
- Seed: **"I'm sorry I can't speak very quickly."**
- Cut: `I'm sorry` *(CP038)* · `I can't speak very quickly` **(new)**
- Job: the learner's own limitation stated — the production-side mirror of CP038's
  comprehension repair.

**CP040 — the diagnosis**
- Source g153, sc16 (drill): "You spoke a little too quickly, so I'm not sure if I understood."
- Seed: **"You spoke a little too quickly, so I'm not sure if I understood."**
- Cut: `you spoke a little too quickly` **(new)** · `so` *(core)* · `I'm not sure if I understood` **(new)**
- Job: the repair diagnosis — naming the trouble-source instead of just flagging trouble —
  and the hedged uncertainty frame ("I'm not sure if…"), reused at CP072.

**CP041 — try again**
- Source g154, sc16 (drill): "Can we try again?"
- Seed: **"Can we try again?"**
- Cut: `can we` *(core)* · `try again` **(new)**
- Job: the reset move — X3's third position when reformulation fails.

**CP042 — the preference for trying**
- Source g149, sc15 (drill): "I prefer to try to speak your language, I think it's polite."
- Seed: **"I prefer to try to speak your language — I think it's polite."**
- Cut: `I prefer to try` **(new)** · `to speak your language` **(new)** · `I think` *(core)* · `it's polite` **(new)**
- Job: the learner's stance declared — why the contract of block E is offered at all. "to
  speak your language" becomes the set's most reused infinitive chunk (CP118, CP185).

**CP043 — the manage clause**
- Source g152, sc16 (drill): "But if you can speak slowly I think we'll be able to manage."
- Seed: **"But if you can speak slowly, I think we'll be able to manage."**
- Cut: `if you can speak slowly` **(new)** · `I think` *(core)* · `we'll be able to manage` **(new)**
- Job: the conditional bargain — the learner's counterpart to CP038's request, framing repair
  as a joint capacity ("we'll manage") rather than a personal failure.

### Block E — the learner's contract (scene 0, learner side)

**CP044 — the offer**
- Source W1201.1 = W1202.1 = W1204.1, scene 0 (Sarah) — one act, three walks, one seed:
  "Before I order — I'm learning your language, and I'd like to do the whole thing in it, if that's OK with you. If I get properly stuck, I might have to ask you to switch back to mine."
- Seed: **"Before I order — I'm learning your language, and I'd like to do the whole thing in it, if that's OK with you. If I get properly stuck, I might have to ask you to switch back to mine."**
- Cut: `before I order` **(new)** · `I'm learning your language` *(CP038)* · `I'd like` *(core)* · `to do the whole thing in it` **(new)** · `if that's OK with you` **(new)** · `if I get properly stuck` **(new)** · `I might have to ask you` **(new)** · `to switch back to mine` **(new)**
- Job: the medium contract itself — the trunk's defining act. Five new LEGOs; the
  self-identification is already owned from the repair block, which is why E follows D.
  W1203.1's booking-desk variant defers here (same act, ZUT: one production form).

**CP045 — the licence**
- Source W1201.3, scene 0 (Sarah): "Thanks. And if I get a word wrong, just tell me — I'd rather be told. I'll ask if I lose you."
- Seed: **"Thanks. And if I get a word wrong, just tell me — I'd rather be told. I'll ask if I lose you."**
- Cut: `thanks` **(new)** · `if I get a word wrong` **(new)** · `just tell me` **(new)** · `I'd rather be told` **(new)** · `I'll ask` **(new)** · `if I lose you` **(new)**
- Job: the mutual repair licence, pre-disarmed. "thanks" is D3's casual alternate; the other
  five are the licence's own machinery, reused verbatim by W1401.1 (CP151) — cutting them once
  here makes the street contract a two-LEGO seed later.

**CP046 — the pivot to business**
- Source W1201.5, scene 0 (Sarah): "Right then. A coffee with milk, please — to drink here."
- Seed: **"Right then. A coffee with milk, please — to drink here."**
- Cut: `right then` **(new)** · `a coffee with milk` **(new)** · `please` *(CP009)* · `to drink here` **(new)**
- Job: the pivot marker, the first ellipted order (D8 — no finite verb, the frame no seed
  looks like), and the consumption qualifier.

**CP047 — the yield (near-ZERO)**
- Source W1202.3, scene 0 (Sarah): "Of course — mine it is. Just a coffee with milk, please."
- Seed: **"Of course — mine it is. Just a coffee with milk, please."**
- Cut: `of course` *(CP012)* · `mine it is` **(new)** · `just` *(core)* · `a coffee with milk` *(CP046)* · `please` *(CP009)*
- Job: one new LEGO — the instant, unresentful yield. The decline survived costs three words.

**CP048 — the comeback**
- Source W1202.5, scene 0 (Sarah): "Then I might come back after three and try you. Just the coffee, thanks — nothing else."
- Seed: **"Then I might come back after three and try you. Just the coffee, thanks — nothing else."**
- Cut: `I might come back after three` **(new)** · `and try you` **(new)** · `just the coffee, thanks` **(new)** · `nothing else` **(new)**
- Job: the deferred re-offer — holding the intention across the decline — and the
  order-closure pair ("just the X, thanks" / "nothing else") the service scenes reuse.

**CP049 — the scoped deal**
- Source W1203.3, scene 0 (Guest): "That's fair — I'd rather pay for the right ones. Mine for the numbers, yours for everything else."
- Seed: **"That's fair — I'd rather pay for the right ones. Mine for the numbers, yours for everything else."**
- Cut: `that's fair` **(new)** · `I'd rather pay for the right ones` **(new)** · `mine for the numbers` **(new)** · `yours for everything else` **(new)**
- Job: ratifying a scoped decline — the fairness assessment and the domain split, the
  contract's subtlest move, kept in its worn wholes.

**CP050 — the booking, in mine**
- Source W1203.5, scene 0 (Guest): "So, in mine: a double room, under the name Jones — three nights, Friday to Monday."
- Seed: **"So, in mine: a double room, under the name Jones — three nights, Friday to Monday."** (name is slot content)
- Cut: `in mine` **(new)** · `a double room` **(new)** · `under the name Jones` **(new — name slot)** · `three nights` **(new)** · `Friday to Monday` **(new)**
- Job: the exact-facts register done deliberately in the weaker medium's counterpart — room
  type, name formula, duration, day span. "under the name X" is reused by both booking scenes
  (CP082, CP108). Days and numbers themselves are coda vocabulary (core).

**CP051 — the biography answer**
- Source W1204.3, scene 0 (Sarah): "On my own, mostly — a little every day, for about a year. Did you ever learn one?"
- Seed: **"On my own, mostly — a little every day, for about a year. Did you ever learn one?"**
- Cut: `on my own, mostly` **(new)** · `a little every day` **(new)** · `for about a year` **(new)** · `did you ever learn one` **(new)**
- Job: the learning biography — method, cadence, duration — and the deflecting return
  question. The health set's HG08 assumes exactly these chunks; cutting them here is what
  makes that assumption true.

**CP052 — the recovery of the thread**
- Source W1204.5, scene 0 (Sarah): "Well — that's exactly what I'm here to learn. A coffee with milk, please. And stop me if I say it wrong."
- Seed: **"Well — that's exactly what I'm here to learn. A coffee with milk, please. And stop me if I say it wrong."**
- Cut: `that's exactly what I'm here to learn` **(new)** · `a coffee with milk` *(CP046)* · `please` *(CP009)* · `stop me` **(new)** · `if I say it wrong` **(new)**
- Job: the self-initiated pivot back from biography to business, and the licence's imperative
  form ("stop me") — the chunk the health set's HG01/HG11 lean on.

### Block F — café and ordering (D8, scenes 3, 7, 16, 19–20)

**CP053 — the full café order**
- Source g11, sc3 (Sarah), after the CP004 greeting head: "I'd like a coffee, please. With milk but with no sugar. To take away."
- Seed: **"I'd like a coffee, please. With milk but with no sugar. To take away."**
- Cut: `I'd like` *(core)* · `a coffee` **(new)** · `please` *(CP009)* · `with milk` **(new)** · `but with no sugar` **(new)** · `to take away` **(new)**
- Job: the customised order — item, additions, exclusions, mode — the trunk's canonical
  service turn. "a coffee" bare beside CP046's "a coffee with milk": the split's two sides.

**CP054 — the availability question**
- Source g12, sc3 (Sarah): "Do you have any food?"
- Seed: **"Do you have any food?"**
- Cut: `do you have` **(new)** · `any food` **(new)**
- Job: the availability frame-opener — the corpus's most productive question head (eleven
  attestations across four scenes).

**CP055 — the snacks variant (near-ZERO)**
- Source g13, sc3 (Sarah): "Do you have any snacks?"
- Seed: **"Do you have any snacks?"**
- Cut: `do you have` *(CP054)* · `any snacks` **(new)**
- Job: second fill of the availability slot — the frame confirmed by minimal contrast.

**CP056 — the or-list**
- Source g14, sc3 (Sarah): "Do you have crisps, or nuts, or anything?"
- Seed: **"Do you have crisps, or nuts, or anything?"**
- Cut: `do you have` *(CP054)* · `crisps, or nuts, or anything` **(new)**
- Job: the open or-list — offered whole because the listing intonation is the worn value;
  W1302.1 replays this exact line.

**CP057 — the black coffee (near-ZERO)**
- Source g39, sc7 (Customer 1): "I'd like a black coffee, please."
- Seed: **"I'd like a black coffee, please."**
- Cut: `I'd like` *(core)* · `a black coffee` **(new)** · `please` *(CP009)*
- Job: one LEGO — the item slot of the I'd-like order, second fill after CP053.

**CP058 — size and substitution**
- Source g41, sc7 (Customer 1): "I'd like large, please. With oat milk if you have it."
- Seed: **"I'd like large, please. With oat milk if you have it."**
- Cut: `I'd like large` **(new)** · `with oat milk` **(new)** · `if you have it` **(new)**
- Job: the anaphoric size answer (answering an unspoken "regular or large?"), a second
  with-addition, and the availability hedge "if you have it" — reusable after any request.

**CP059 — the mode answer (near-ZERO)**
- Source g43, sc7 (Customer 1): "I'd like takeaway, please."
- Seed: **"I'd like takeaway, please."**
- Cut: `I'd like takeaway` **(new)** · `please` *(CP009)*
- Job: the mode answer as a complete turn — the sit-in/takeaway fork's producible half.

**CP060 — the multi-item order**
- Source g44, sc7 (Customer 2): "Could I have two white coffees and two black coffees and one of those, please?"
- Seed: **"Could I have two white coffees and two black coffees and one of those, please?"**
- Cut: `could I have` **(new)** · `two white coffees and two black coffees` **(new)** · `one of those` **(new)**
- Job: the polite-request opener (beside "I'd like" — both corpus forms, distinct knowns, no
  fork), the coordinated plural order, and the pointing order "one of those" — deixis doing
  the vocabulary's job, the pod register at its purest.

**CP061 — the addition**
- Source g46, sc7 (Customer 2): "Yes, can I have a glass of water as well, please."
- Seed: **"Yes, can I have a glass of water as well, please."**
- Cut: `yes` *(CP009)* · `can I have` **(new)** · `a glass of water` **(new)** · `as well` **(new)**
- Job: the casual request opener (third of the family: I'd like / could I have / can I have)
  and the add-on marker "as well".

**CP062 — the counter order (D8 pure)**
- Source g50, sc7 (Customer 3): "Good morning. Two Americanos and a cup of tea, please."
- Seed: **"Good morning. Two Americanos and a cup of tea, please."**
- Cut: `good morning` *(CP002)* · `two Americanos` **(new)** · `and a cup of tea` **(new)** · `please` *(CP009)*
- Job: the ellipted order in its pure form — no finite verb anywhere, D8's defining shape,
  over an owned greeting and particle.

**CP063 — the ice-cream order (near-ZERO)**
- Source g194, sc19 (drill): "I'd like two scoops of ice-cream, please."
- Seed: **"I'd like two scoops of ice-cream, please."**
- Cut: `I'd like` *(core)* · `two scoops of ice-cream` **(new)** · `please` *(CP009)*
- Job: one LEGO — the measured-portion order, opening the scoop family.

**CP064 — the two-flavour cone**
- Source g196, sc20 (drill): "Can I have one scoop of chocolate and one of strawberry?"
- Seed: **"Can I have one scoop of chocolate and one of strawberry?"**
- Cut: `can I have` *(CP061)* · `one scoop of chocolate` **(new)** · `and one of strawberry` **(new)**
- Job: the portioned pair with ellipsis in the second conjunct ("one of strawberry") — the
  corpus's own economy of repetition.

**CP065 — and then another (near-ZERO)**
- Source g197, sc20 (drill): "And then another cone with one scoop of lemon and one of blueberry."
- Seed: **"And then another cone with one scoop of lemon and one of blueberry."**
- Cut: `and then` **(new)** · `another cone` **(new)** · `with one scoop of lemon and one of blueberry` *(CP064 — slot fill on the owned scoop pair)*
- Job: the order continued across turns — "and then" is the continuation marker CP126 and
  W1401 reuse — and "another X", the repeat-order frame.

**CP066 — any ice-cream? (ZERO)**
- Source g198, sc20 (drill): "Do you have any ice-cream?"
- Seed: **"Do you have any ice-cream?"**
- Cut: `do you have` *(CP054)* · `any ice-cream` *(side of CP063's "two scoops of ice-cream" — the noun is owned; "any" is the frame's own slot marker, attested twice already)*
- Job: **zero admission.** The availability frame's fourth fill from owned material — pure
  corpus representation for the ice-cream walk.

**CP067 — anything to eat**
- Source g157, sc16 (drill): "Do you have anything to eat?"
- Seed: **"Do you have anything to eat?"**
- Cut: `do you have` *(CP054)* · `anything to eat` **(new)**
- Job: the open availability question — "anything to eat" generalises the or-list's tail into
  the frame the learner actually reaches for when the nouns run out.

**CP068 — the menu**
- Source g155, sc16 (drill): "Can we see the menu?"
- Seed: **"Can we see the menu?"**
- Cut: `can we` *(core)* · `see the menu` **(new)**
- Job: the menu request — the corpus's standing repair for not knowing the words for food.

**CP069 — the dessert menu (near-ZERO)**
- Source g156, sc16 (drill): "Can we see the dessert menu also?"
- Seed: **"Can we see the dessert menu also?"**
- Cut: `can we` *(core)* · `see the dessert menu` **(new — the slot refilled)** · `also` *(core — glue)*
- Job: the slot's second fill; "see the X" is now a frame, not a phrase.

**CP070 — hungry, and a menu**
- Source g64, sc8 (Customer 1): "I'm not sure if I'm hungry. Do you have a menu?"
- Seed: **"I'm not sure if I'm hungry. Do you have a menu?"**
- Cut: `I'm not sure if I'm hungry` **(new)** · `do you have` *(CP054)* · `a menu` **(new)**
- Job: the hedged appetite — "I'm not sure if…" reattested from CP040 with a new complement —
  and the indefinite menu ask beside CP068's definite one.

### Block G — pub and restaurant (scenes 8–9)

**CP071 — the pint, and the ales question**
- Source g54, sc8 (Customer 1): "I'd like a pint, please. What ales do you have on?"
- Seed: **"I'd like a pint, please. What ales do you have on?"**
- Cut: `I'd like` *(core)* · `a pint` **(new)** · `please` *(CP009)* · `what ales do you have on` **(new)**
- Job: the pub's own order-token and the what-do-you-have question turned to a category —
  the availability frame's interrogative-wh side.

**CP072 — the specified pint (near-ZERO)**
- Source g56, sc8 (Customer 1): "I'd like a pint of the bitter, please."
- Seed: **"I'd like a pint of the bitter, please."**
- Cut: `I'd like` *(core)* · `a pint of the bitter` **(new)** · `please` *(CP009)*
- Job: one LEGO — the measured-of-the-named order, choosing from what the answer offered.

**CP073 — the half (near-ZERO)**
- Source g57, sc8 (Customer 2): "Can I have a half of cider?"
- Seed: **"Can I have a half of cider?"**
- Cut: `can I have` *(CP061)* · `a half of cider` **(new)**
- Job: one LEGO — the measure family's second member (pint, half).

**CP074 — the wine list, and the want**
- Source g58, sc8 (Customer 3): "Could I see the wine list? I want a glass of wine."
- Seed: **"Could I see the wine list? I want a glass of wine."**
- Cut: `could I see` **(new)** · `the wine list` **(new)** · `I want` *(core)* · `a glass of wine` **(new)**
- Job: the see-request in its polite form and the bare want — the corpus's only unhedged
  "I want", kept because its bluntness is the register truth of a third drink.

**CP075 — the large white (near-ZERO)**
- Source g60, sc8 (Customer 3): "I'd like a large glass of white wine, please."
- Seed: **"I'd like a large glass of white wine, please."**
- Cut: `I'd like` *(core)* · `a large glass of white wine` **(new)** · `please` *(CP009)*
- Job: one LEGO — size + vessel + kind in one worn NP.

**CP076 — the small red (near-ZERO)**
- Source g61, sc8 (Customer 1): "Can I have a small glass of red wine?"
- Seed: **"Can I have a small glass of red wine?"**
- Cut: `can I have` *(CP061)* · `a small glass of red wine` **(new)**
- Job: CP075's minimal pair — both size and colour flipped; the NP's slots shown by contrast.

**CP077 — two more (near-ZERO)**
- Source g62, sc8 (Customer 2): "I'd like two more glasses of beer."
- Seed: **"I'd like two more glasses of beer."**
- Cut: `I'd like` *(core)* · `two more glasses of beer` **(new)**
- Job: one LEGO — the re-order: "more" inside the NP is the repeat-custom move.

**CP078 — bread and chips for the table**
- Source g66, sc8 (Customer 1): "Can we have some bread? And a bowl of chips for the table."
- Seed: **"Can we have some bread? And a bowl of chips for the table."**
- Cut: `can we have` **(new)** · `some bread` **(new)** · `a bowl of chips` **(new)** · `for the table` **(new)**
- Job: the plural request opener (completing the can-family paradigm: can I / could I / can
  we) and the shared order "for the table".

**CP079 — the sandwich**
- Source g67, sc8 (Customer 2): "Do you have any sandwiches? I'd like a cheese sandwich, please."
- Seed: **"Do you have any sandwiches? I'd like a cheese sandwich, please."**
- Cut: `do you have` *(CP054)* · `any sandwiches` **(new)** · `I'd like` *(core)* · `a cheese sandwich` **(new)** · `please` *(CP009)*
- Job: the availability-then-order pair in one turn — ask the frame, use the answer — the
  corpus teaching the exchange grammar inside a single row.

**CP080 — the restaurant booking**
- Source g69, sc9 (Customer 1): "Good evening. We have a booking for two, under the name Davies."
- Seed: **"Good evening. We have a booking for two, under the name Davies."** (name is slot content)
- Cut: `good evening` *(CP001)* · `we have a booking for two` **(new)** · `under the name Davies` *(CP050 — slot fill)*
- Job: one new LEGO — the arrival declaration; the name formula is owned from the contract
  block, exactly as designed.

**CP081 — the waters**
- Source g72, sc9 (Customer 2): "We'd like one bottle of sparkling water and one bottle of still water, please."
- Seed: **"We'd like one bottle of sparkling water and one bottle of still water, please."**
- Cut: `we'd like` **(new)** · `one bottle of sparkling water` **(new)** · `and one bottle of still water` **(new)** · `please` *(CP009)*
- Job: the plural preference opener and the paired bottle order — the sparkling/still fork
  answered in its own worn coordination.

**CP082 — the dietary question**
- Source g73, sc9 (Customer 1): "Excuse me - do you have anything gluten-free? Or for vegetarians?"
- Seed: **"Excuse me — do you have anything gluten-free? Or for vegetarians?"**
- Cut: `excuse me` *(CP024)* · `do you have` *(CP054)* · `anything gluten-free` **(new)** · `or for vegetarians` **(new)**
- Job: the dietary-constraint ask — "anything X" reattested with an adjective fill, and the
  afterthought disjunct "or for X?" as its own move.

**CP083 — the recommendation question**
- Source g75, sc9 (Customer 1): "And what would you recommend tonight?"
- Seed: **"And what would you recommend tonight?"**
- Cut: `what would you recommend` **(new)** · `tonight` **(new)**
- Job: handing the choice to the expert — the move that turns a menu into a conversation —
  plus the daypart adverb.

**CP084 — the main, chosen**
- Source g77, sc9 (Customer 1): "I'll have the lamb, please. With a side of greens."
- Seed: **"I'll have the lamb, please. With a side of greens."**
- Cut: `I'll have` **(new)** · `the lamb` **(new)** · `please` *(CP009)* · `with a side of greens` **(new)**
- Job: the decision opener "I'll have" — commitment, not preference, completing the ordering
  paradigm (I'd like / could I / can I / can we / we'd like / I'll have) — and the side-order.

**CP085 — and for me (near-ZERO)**
- Source g78, sc9 (Customer 2): "And the risotto for me. With a small green salad to start."
- Seed: **"And the risotto for me. With a small green salad to start."**
- Cut: `and the risotto for me` **(new)** · `with a small green salad` **(new)** · `to start` **(new)**
- Job: the verbless second order ("and the X for me" — D8 ellipsis with a beneficiary) and
  the course-structure marker "to start".

**CP086 — the wine list again (ZERO)**
- Source g80, sc9 (Customer 1): "Could we see the wine list?"
- Seed: **"Could we see the wine list?"**
- Cut: `could I see` → plural side: `could we` *(core)* · `see` composed as *(CP068's "see the menu" frame with CP074's "the wine list")* — no new LEGO
- Job: **zero admission.** The see-frame refilled plural from wholly owned material; the
  corpus attests the recombination, which is exactly what a zero seed is for.

**CP087 — would be lovely**
- Source g81, sc9 (Customer 2): "A bottle of the house red would be lovely."
- Seed: **"A bottle of the house red would be lovely."**
- Cut: `a bottle of the house red` **(new)** · `would be lovely` **(new)**
- Job: the desiderative order — naming the thing and blessing it, no request verb at all —
  and "would be lovely", the politeness tail that upgrades any NP into an order.

**CP088 — coffees and decaf**
- Source g84, sc9 (Customer 1): "Just two coffees, please. Decaf for me."
- Seed: **"Just two coffees, please. Decaf for me."**
- Cut: `just` *(core)* · `two coffees` **(new)** · `please` *(CP009)* · `decaf for me` **(new)**
- Job: the winding-down order and the for-me specification — "X for me" now attested twice
  (CP085), a frame.

**CP089 — the bill, and the split**
- Source g85, sc9 (Customer 2): "And the bill, when you're ready. Could we split it?"
- Seed: **"And the bill, when you're ready. Could we split it?"**
- Cut: `the bill` **(new)** · `when you're ready` **(new)** · `could we split it` **(new)**
- Job: closing the meal — the verbless bill request, the pressure-softener "when you're
  ready", and the split question. Block H picks up payment from here.

### Block H — paying, and the handover (D5, X5, scenes 7, 14, 15–17)

**CP090 — how much is that?**
- Source g141, sc15 (drill): "How much is that?"
- Seed: **"How much is that?"**
- Cut: `how much is that` **(new)**
- Job: the price question, whole — the corpus's smallest complete transaction move.

**CP091 — the wrapped price question**
- Source g142, sc15 (drill): "Can you tell me how much that is?"
- Seed: **"Can you tell me how much that is?"**
- Cut: `can you tell me` **(new)** · `how much that is` **(new)**
- Job: mints "can you tell me" — the embedding wrap the corpus applies to three different
  questions (price, distance, place) — and the embedded word-order side of CP090's question.
  The pair teaches the direct/embedded split by minimal contrast.

**CP092 — can we pay?**
- Source g158, sc16 (drill): "Can we pay?"
- Seed: **"Can we pay?"**
- Cut: `can we pay` **(new)**
- Job: the settlement move at its barest — one LEGO.

**CP093 — by card (near-ZERO)**
- Source g159, sc16 (drill): "Can we pay by card?"
- Seed: **"Can we pay by card?"**
- Cut: `can we pay` *(CP092)* · `by card` **(new)**
- Job: one LEGO — the instrument phrase, the payment scenes' load-bearing chunk.

**CP094 — could I pay by card? (near-ZERO)**
- Source g48, sc7 (Customer 2), first half: "Could I pay by card?" — g138 (Taxi) is the same
  sentence and consolidates here.
- Seed: **"Could I pay by card?"**
- Cut: `could I pay` **(new)** · `by card` *(CP093)*
- Job: the singular-polite side of CP092's split, over the owned instrument.

**CP095 — contactless (near-ZERO)**
- Source g48, sc7 (Customer 2), second half: "Do you have contactless?"
- Seed: **"Do you have contactless?"**
- Cut: `do you have` *(CP054)* · `contactless` **(new)**
- Job: one LEGO — the availability frame reaching payment infrastructure.

**CP096 — only cash (near-ZERO)**
- Source g160, sc16 (drill — service-side, promoted by the pod itself): "No, we only take cash."
- Seed: **"No, we only take cash."**
- Cut: `no` *(CP036)* · `we only take cash` **(new)**
- Job: the polar-negative with its account (D2's no-side, first attested production) — and
  the learner's line when hosting or relaying a merchant's answer.

**CP097 — no cash (near-ZERO)**
- Source g161, sc16 (drill): "I'm sorry, I don't have any cash."
- Seed: **"I'm sorry, I don't have any cash."**
- Cut: `I'm sorry` *(CP038)* · `I don't have` **(new)** · `any cash` **(new)**
- Job: the apologised lack — "I don't have" is the possession negative the corpus reuses for
  tickets and time.

**CP098 — the cash machine**
- Source g163, sc17 (drill): "Is there a cash machine near here?"
- Seed: **"Is there a cash machine near here?"**
- Cut: `is there` **(new)** · `a cash machine` **(new)** · `near here` **(new)**
- Job: opens the existential frame (P19 — three pod attestations, all in response position)
  and the vicinity phrase "near here".

**CP099 — the three-way payment question**
- Source g164, sc17 (drill — service-side, promoted): "Do you want to pay by cash or card or put it on the room?"
- Seed: **"Do you want to pay by cash or card or put it on the room?"**
- Cut: `do you want to pay` **(new)** · `by cash or card` **(new)** · `or put it on the room` **(new)**
- Job: the offered alternatives — the or-list applied to payment — and the room-billing idiom
  arriving inside its question.

**CP100 — on the room (ZERO)**
- Source g165, sc17 (drill): "Can we put it on the room, please?"
- Seed: **"Can we put it on the room, please?"**
- Cut: `can we` *(core)* · `put it on the room` *(contained whole in CP099's "or put it on the room")* · `please` *(CP009)*
- Job: **zero admission.** The idiom flipped from offer to request entirely from owned
  material — the manufactured zero at its cleanest.

**CP101 — would you like to pay…? (near-ZERO)**
- Source g166, sc17 (drill): "Would you like to pay by cash or card or on the room?"
- Seed: **"Would you like to pay by cash or card or on the room?"**
- Cut: `would you like to pay` **(new)** · `by cash or card` *(CP099)* · `or on the room` *(side of CP099's chunk)*
- Job: one LEGO — the would-you-like offer opener, the politest of the asking paradigm,
  minted over owned alternatives.

**CP102 — did you want…? (near-ZERO)**
- Source g167, sc17 (drill): "Did you want to pay by cash or card?"
- Seed: **"Did you want to pay by cash or card?"**
- Cut: `did you want to pay` **(new)** · `by cash or card` *(CP099)*
- Job: one LEGO — the past-form softener ("did you want"), completing the offer paradigm's
  third member; CP184 reuses the bare "did you want" side.

**CP103 — again, by card (near-ZERO)**
- Source g168, sc17 (drill): "We'll pay by card again, please."
- Seed: **"We'll pay by card again, please."**
- Cut: `we'll pay` **(new)** · `by card` *(CP093)* · `again` *(core — glue)* · `please` *(CP009)*
- Job: one LEGO — the settled-intention form "we'll pay", D12's first-plural sibling.

**CP104 — here's my passport**
- Source g99, sc11 (Guest): "Of course. Here's my passport."
- Seed: **"Of course. Here's my passport."**
- Cut: `of course` *(CP012)* · `here's` **(new)** · `my passport` **(new)**
- Job: **the D5/X5 unlock** — the deictic handover from the learner's own side, the physical
  move of giving. "here's" is the frame's head and cut nowhere in any eng-known course.

**CP105 — here it is**
- Source g65, sc8 (Bartender — the handover is role-symmetric: the learner hands things
  daily): "Here it is."
- Seed: **"Here it is."**
- Cut: `here it is` **(new)**
- Job: D5's anaphoric alternate, one LEGO — with CP104 the handover frame has both its
  attested surfaces ("here you are" itself is a corpus gap, §8).

**CP106 — how much to town? (taxi)**
- Source g143, sc15 (drill): "How much does it cost to get a taxi into town?"
- Seed: **"How much does it cost to get a taxi into town?"**
- Cut: `how much does it cost` **(new)** · `to get a taxi` **(new)** · `into town` **(new)**
- Job: the costed-journey question — price meets travel; "into town" is block K's most
  reused destination.

**CP107 — how much by bus? (near-ZERO)**
- Source g144, sc15 (drill): "How much does it cost to get a bus into town?"
- Seed: **"How much does it cost to get a bus into town?"**
- Cut: `how much does it cost` *(CP106)* · `to get a bus` **(new)** · `into town` *(CP106)*
- Job: one LEGO — the vehicle slot's second fill; the frame confirmed by minimal contrast.
