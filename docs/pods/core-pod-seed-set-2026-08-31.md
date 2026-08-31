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
