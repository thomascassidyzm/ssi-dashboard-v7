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
`spa_for_eng` are zero-admission; this set contains 9 strict zeros, each marked **ZERO**, and
some forty more that admit exactly one LEGO, marked **near-ZERO**.

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

### Block I — hotel (scene 11)

**CP108 — the arrival (near-ZERO)**
- Source g97, sc11 (Guest): "Good afternoon. I have a booking under the name Jones."
- Seed: **"Good afternoon. I have a booking under the name Jones."** (name is slot content)
- Cut: `good afternoon` *(CP004)* · `I have a booking` **(new)** · `under the name Jones` *(CP050 — slot fill)*
- Job: one LEGO — the singular booking declaration beside CP080's plural; the name formula
  pays out a second time.

**CP109 — the view**
- Source g101, sc11 (Guest): "Does the room have a view?"
- Seed: **"Does the room have a view?"**
- Cut: `does the room have` **(new)** · `a view` **(new)**
- Job: the third-person possession question — the does-X-have frame's first member, reused by
  the boat/bus family (CP137–138) in its leave-shape.

**CP110 — breakfast**
- Source g103, sc11 (Guest): "What time is breakfast served?"
- Seed: **"What time is breakfast served?"**
- Cut: `what time is breakfast served` **(new — kept whole: the worn hotel formula, and the set's only passive; cutting it would mint grammar, not moves)**
- Job: the scheduled-meal question, one LEGO by design.

**CP111 — the late check-out**
- Source g105, sc11 (Guest): "Wonderful. Is it possible for us to have a late check-out?"
- Seed: **"Wonderful. Is it possible for us to have a late check-out?"**
- Cut: `wonderful` **(new)** · `is it possible for us` **(new)** · `to have a late check-out` **(new)**
- Job: the D7 assessment token "wonderful", and the impersonal permission frame "is it
  possible for us…" — the politest ask in the corpus, beside block L's "is it okay if".

**CP112 — the wifi password**
- Source g107, sc11 (Guest): "And what is the wifi password?"
- Seed: **"And what is the wifi password?"**
- Cut: `what is` **(new)** · `the wifi password` **(new)**
- Job: the bare what-is identification frame — CP142 closes it to zero later.

### Block J — shop and pharmacy (scenes 10, 12)

**CP113 — painkillers (near-ZERO)**
- Source g87, sc10 (Customer): "Excuse me. Do you have any painkillers?"
- Seed: **"Excuse me. Do you have any painkillers?"**
- Cut: `excuse me` *(CP024)* · `do you have` *(CP054)* · `any painkillers` **(new)**
- Job: one LEGO — the availability frame walks into the pharmacy.

**CP114 — for children (near-ZERO)**
- Source g89, sc10 (Customer): "Thank you. And do you have any painkillers for children?"
- Seed: **"Thank you. And do you have any painkillers for children?"**
- Cut: `thank you` *(CP010)* · `do you have` *(CP054)* · `any painkillers` *(CP113)* · `for children` **(new)**
- Job: one LEGO — the beneficiary qualifier, turning any item request into a for-someone
  request.

**CP115 — the shopping list**
- Source g91, sc10 (Customer): "I also need to get some sunscreen and some toothpaste."
- Seed: **"I also need to get some sunscreen and some toothpaste."**
- Cut: `I need to get` **(new)** · `some sunscreen` **(new)** · `and some toothpaste` **(new)** · `also` *(core — glue)*
- Job: the errand statement — need-to-get plus the some-list, the shop's own register.

**CP116 — the grateful close**
- Source g93, sc10 (Customer): "Thank you, you've been very helpful. I'm very grateful."
- Seed: **"Thank you, you've been very helpful. I'm very grateful."**
- Cut: `thank you` *(CP010)* · `you've been very helpful` **(new)** · `I'm very grateful` **(new)**
- Job: the warm exit pair — assessment of the helper plus own-state gratitude; g129
  recombines both into a zero seed in block K.

**CP117 — the practise-better resolve (near-ZERO)**
- Source g95, sc10 (Customer): "That's very kind of you! Yes, I'm on holiday, and I need to practice more to speak [target language] better."
- Seed: **"That's very kind of you! Yes, I'm on holiday, and I need to practise more to speak your language better."** — deictic language name; "practise" normalised (§4 head).
- Cut: `that's very kind of you` *(CP014)* · `yes` *(CP009)* · `I'm on holiday` *(side of CP033's chunk)* · `I need to practise more` **(new)** · `to speak your language better` **(new)**
- Job: the learner's resolve — the compliment received and converted into practice; "to speak
  your language better" is CP042's infinitive with its comparative tail, the split's new side.

**CP118 — not feeling great**
- Source g110, sc12 (Customer): "Good morning. I'm not feeling great - could you recommend something?"
- Seed: **"Good morning. I'm not feeling great — could you recommend something?"**
- Cut: `good morning` *(CP002)* · `I'm not feeling great` **(new)** · `could you recommend something` **(new)**
- Job: the symptom-opener and the recommendation request in its could-you form (beside
  CP083's what-would-you — question vs request, both corpus forms).

**CP119 — the symptoms**
- Source g112, sc12 (Customer): "I've had a headache and a sore throat since yesterday."
- Seed: **"I've had a headache and a sore throat since yesterday."**
- Cut: `I've had` **(new)** · `a headache` **(new)** · `and a sore throat` **(new)** · `since yesterday` **(new)**
- Job: the symptom report — perfect-of-experience, two ailment NPs, and the onset marker
  "since yesterday". The health segment's arrival language, cut in the trunk where it belongs.

**CP120 — how often?**
- Source g114, sc12 (Customer): "How often should I take the paracetamol?"
- Seed: **"How often should I take the paracetamol?"**
- Cut: `how often` **(new)** · `should I take` **(new)** · `the paracetamol` **(new)**
- Job: the dosing question — frequency wh, the should-I deontic, and the named medicine slot.

**CP121 — with food?**
- Source g116, sc12 (Customer): "Are they all right to take with food?"
- Seed: **"Are they all right to take with food?"**
- Cut: `are they all right` **(new)** · `to take with food` **(new)**
- Job: the safety check — "are they all right" generalises to any object of doubt.

**CP122 — the plasters (near-ZERO)**
- Source g118, sc12 (Customer): "Thank you. Could I also get a packet of plasters?"
- Seed: **"Thank you. Could I also get a packet of plasters?"**
- Cut: `thank you` *(CP010)* · `could I also get` **(new)** · `a packet of plasters` **(new)**
- Job: the afterthought add-on — "could I also get" beside CP060's "could I have": the get
  form is the shop's, the have form the table's, both corpus-attested, distinct knowns.

### Block K — directions and travel (scenes 2, 13, 14, W1401, W1301, travel drills)

**CP123 — the way to the supermarket**
- Source g120, sc13 (Tourist): "Excuse me, do you know how to get to the nearest supermarket?"
- Seed: **"Excuse me, do you know how to get to the nearest supermarket?"**
- Cut: `excuse me` *(CP024)* · `do you know` **(new)** · `how to get to` **(new)** · `the nearest supermarket` **(new)**
- Job: the full street ask — the knowledge hedge "do you know", the route infinitive, and the
  superlative destination.

**CP124 — the checking fragment**
- Source g122, sc13 (Tourist): "Past that church?"
- Seed: **"Past that church?"**
- Cut: `past that church` **(new)**
- Job: the read-back at its smallest — a bare landmark echoed with rising intonation, X4's
  learner-side shape with no receipt token (the D10 gap, §3).

**CP125 — and then? (ZERO)**
- Source g125, sc13 (Tourist); also W1401.5's tail: "And then?"
- Seed: **"And then?"**
- Cut: `and then` *(CP065)*
- Job: **zero admission.** The continuation probe — one owned chunk doing a whole turn's work,
  the purest zero in the set.

**CP126 — the cashpoint (near-ZERO)**
- Source g127, sc13 (Tourist): "Wonderful. And is there a cashpoint nearby?"
- Seed: **"Wonderful. And is there a cashpoint nearby?"**
- Cut: `wonderful` *(CP111)* · `is there` *(CP098)* · `a cashpoint` **(new)** · `nearby` **(new)**
- Job: the existential frame's second fill plus "nearby" — beside CP098's "near here", the
  vicinity split's two sides.

**CP127 — the helpful close (ZERO)**
- Source g129, sc13 (Tourist): "Thank you very much. You've been very helpful."
- Seed: **"Thank you very much. You've been very helpful."**
- Cut: `thank you very much` *(CP005)* · `you've been very helpful` *(CP116)*
- Job: **zero admission.** The grateful close recombined from two owned chunks — corpus
  representation for the directions walk at no cost.

**CP128 — the taxi ask**
- Source g131, sc14 (Passenger): "Hello. Can you take me to the train station, please?"
- Seed: **"Hello. Can you take me to the train station, please?"**
- Cut: `hello` *(CP001)* · `can you take me to` **(new)** · `the train station` **(new)** · `please` *(CP009)*
- Job: the transport imperative-request — "can you take me to X" is the taxi's whole grammar —
  plus the destination the ticket family reuses.

**CP129 — how long will it take?**
- Source g133, sc14 (Passenger): "About how long do you think it will take?"
- Seed: **"About how long do you think it will take?"**
- Cut: `about how long` **(new)** · `do you think` **(new)** · `it will take` **(new)**
- Job: the duration estimate solicited through the opinion hedge "do you think" — the
  corpus's polite-uncertainty wrap, reused wherever a native knows better.

**CP130 — the ticket question (near-ZERO)**
- Source g135, sc14 (Passenger): "Do you know where I can get a ticket in the station?"
- Seed: **"Do you know where I can get a ticket in the station?"**
- Cut: `do you know` *(CP123)* · `where I can get` **(new)** · `a ticket` **(new)** · `in the station` **(new)**
- Job: the embedded place question under the owned knowledge hedge — "where I can get X"
  generalises to everything a traveller runs out of.

**CP131 — how far?**
- Source g7, sc2 (Sarah): "How far is it into town?"
- Seed: **"How far is it into town?"**
- Cut: `how far is it` **(new)** · `into town` *(CP106)*
- Job: the distance question direct — one LEGO over the owned destination.

**CP132 — how far, wrapped (near-ZERO)**
- Source g8, sc2 (Sarah) = W1301.1: "Can you tell me how far it is into town?"
- Seed: **"Can you tell me how far it is into town?"**
- Cut: `can you tell me` *(CP091)* · `how far it is` **(new)** · `into town` *(CP106)*
- Job: one LEGO — the embedded side of CP131's question; the direct/embedded split now has
  two attested pairs (price, distance), so the pattern is inferable, never explained.

**CP133 — where can we get a bus?**
- Source g145, sc15 (drill): "Where can we get a bus?"
- Seed: **"Where can we get a bus?"**
- Cut: `where can we get` **(new)** · `a bus` **(new)**
- Job: the plural side of CP130's where-I-can-get, direct form, plus the vehicle.

**CP134 — a taxi (near-ZERO)**
- Source g146, sc15 (drill): "Where can we get a taxi?"
- Seed: **"Where can we get a taxi?"**
- Cut: `where can we get` *(CP133)* · `a taxi` **(new)**
- Job: one LEGO — the slot's second vehicle.

**CP135 — four singles**
- Source g147, sc15 (drill): "Four single tickets to town, please."
- Seed: **"Four single tickets to town, please."**
- Cut: `four single tickets` **(new)** · `to town` **(new)** · `please` *(CP009)*
- Job: the ellipted ticket order (D8 with no verb in sight) and bare "to town" beside owned
  "into town" — direction's two prepositions, both corpus forms.

**CP136 — two returns (near-ZERO)**
- Source g148, sc15 (drill): "Two return tickets to town, please."
- Seed: **"Two return tickets to town, please."**
- Cut: `two return tickets` **(new)** · `to town` *(CP135)* · `please` *(CP009)*
- Job: one LEGO — single/return, the ticket paradigm completed.

**CP137 — does the boat leave from here?**
- Source g177, sc18 (drill): "Does the boat leave from here?"
- Seed: **"Does the boat leave from here?"**
- Cut: `does the boat leave` **(new)** · `from here` **(new)**
- Job: the departure question and the source phrase "from here" — the does-X frame from CP109
  in its motion shape.

**CP138 — the bus version (near-ZERO)**
- Source g178, sc18 (drill): "Does the bus leave from here?"
- Seed: **"Does the bus leave from here?"**
- Cut: `does the bus leave` **(new)** · `from here` *(CP137)*
- Job: one LEGO — the minimal pair confirming the frame.

**CP139 — where does it leave from?**
- Source g179, sc18 (drill): "Where does the bus leave from?"
- Seed: **"Where does the bus leave from?"**
- Cut: `where does the bus leave from` **(new — kept whole: the wh-flip with its stranded preposition is one worn move; cutting it would mint word-order, not meaning)**
- Job: the open form of CP138's question — polar and wh sides of one frame, by contrast.

**CP140 — the toilet (near-ZERO)**
- Source g209, sc21 (drill): "Is there a toilet here?"
- Seed: **"Is there a toilet here?"**
- Cut: `is there` *(CP098)* · `a toilet` **(new)** · `here` *(core — glue)*
- Job: one LEGO — the existential frame's most necessary fill.

**CP141 — where the toilet is (near-ZERO)**
- Source g210, sc21 (drill): "Can you tell me where the toilet is?"
- Seed: **"Can you tell me where the toilet is?"**
- Cut: `can you tell me` *(CP091)* · `where the toilet is` **(new)**
- Job: one LEGO — the embed family's third member (price, distance, place); the wrap is now
  a fully productive frame.

**CP142 — what is that? (ZERO)**
- Source g215, sc21 (drill): "What is that?"
- Seed: **"What is that?"**
- Cut: `what is` *(CP112)* · `that` *(core — glue)*
- Job: **zero admission.** The identification question from owned material.

**CP143 — over there (near-ZERO)**
- Source g216, sc21 (drill): "What is that over there?"
- Seed: **"What is that over there?"**
- Cut: `what is` *(CP112)* · `that` *(core)* · `over there` **(new)**
- Job: one LEGO — distal deixis, the pointing phrase every street exchange leans on.

**CP144 — I said (near-ZERO)**
- Source g214, sc21 (drill): "Yes, I said it's over there."
- Seed: **"Yes, I said it's over there."**
- Cut: `yes` *(CP009)* · `I said` **(new)** · `it's` *(core — glue)* · `over there` *(CP143)*
- Job: one LEGO — the self-repeat marker "I said", the answering half of X3 when the learner
  is the one asked to say it again.

**CP145 — the street contract (near-ZERO family)**
- Source W1401.1 (Tourist): "Excuse me — could you tell me the way to the railway station? Your language isn't my first, so go slowly with me — if I get a word wrong, just tell me, and I'll ask if I lose you."
- Seed: **"Excuse me — could you tell me the way to the railway station? Your language isn't my first, so go slowly with me — if I get a word wrong, just tell me, and I'll ask if I lose you."**
- Cut: `excuse me` *(CP024)* · `could you tell me the way to` **(new)** · `the railway station` **(new)** · `your language isn't my first` **(new)** · `go slowly with me` **(new)** · `if I get a word wrong` *(CP045)* · `just tell me` *(CP045)* · `I'll ask` *(CP045)* · `if I lose you` *(CP045)*
- Job: the notice — the contract compressed into a stranger's minute. Four new LEGOs; the
  whole licence tail rides free on block E's cuts, exactly as the walk was authored to allow.

**CP146 — left at the lights (near-ZERO)**
- Source W1401.5 (Tourist): "Left at the lights — and then?"
- Seed: **"Left at the lights — and then?"**
- Cut: `left at the lights` **(new)** · `and then` *(CP065)*
- Job: one LEGO — the read-back echo plus the owned continuation probe: X4's learner side in
  four words.

**CP147 — the full read-back**
- Source W1401.7 (Tourist): "Straight to the lights, left, and across the square. Thank you — I understood every word."
- Seed: **"Straight to the lights, left, and across the square. Thank you — I understood every word."**
- Cut: `straight to the lights` **(new)** · `left` *(side of CP146's chunk)* · `and across the square` **(new)** · `thank you` *(CP010)* · `I understood every word` **(new)**
- Job: the route repeated whole and the comprehension receipt "I understood every word" — the
  nearest thing scoped CORE has to D10's receipt, and the walk's triumphant close.

**CP148 — the lost ticket**
- Source g182, sc18 (drill): "I'm sorry, my son lost his ticket."
- Seed: **"I'm sorry, my son lost his ticket."**
- Cut: `I'm sorry` *(CP038)* · `my son` **(new)** · `lost his ticket` **(new)**
- Job: the apologised mishap — the family member and the loss, the trouble-report frame's
  first member.

**CP149 — paid, but lost**
- Source g183, sc18 (drill): "We have paid, but my daughter has lost her ticket."
- Seed: **"We have paid, but my daughter has lost her ticket."**
- Cut: `we have paid` **(new)** · `my daughter` **(new)** · `has lost her ticket` **(new)**
- Job: the claim-plus-mishap — asserting the right before reporting the loss; the gendered
  pair with CP148 shows the his/her split without a word of grammar.

**CP150 — the walk considered**
- Source W1301.3 (Sarah): "Three or four miles — I could walk that. I might get off at the next stop, then, and walk the rest. It's a nice morning for it."
- Seed: **"Three or four miles — I could walk that. I might get off at the next stop, then, and walk the rest. It's a nice morning for it."**
- Cut: `three or four miles` **(new)** · `I could walk that` **(new)** · `I might get off at the next stop` **(new)** · `and walk the rest` **(new)** · `it's a nice morning for it` **(new)**
- Job: acting on a hedge — the echoed estimate, the tentative plan ("I could…", "I might…"),
  and the justifying pleasantry. The recovery walk's first learner turn.

**CP151 — the hedge honoured**
- Source W1301.5 (Sarah): "Don't be — you said maybe, and maybe was right. Six is too far for me. I'll stay in this seat and ride the whole way."
- Seed: **"Don't be — you said maybe, and maybe was right. Six is too far for me. I'll stay in this seat and ride the whole way."**
- Cut: `don't be` **(new)** · `you said maybe` **(new)** · `and maybe was right` **(new)** · `six is too far for me` **(new)** · `I'll stay in this seat` **(new)** · `and ride the whole way` **(new)**
- Job: absolving the apologiser — "don't be" is D11's second-person absolution, the corpus's
  own answer to "I'm sorry" — plus the revised plan stated as commitment (D12 shape).

### Block L — time, weather, and feelings (scenes 1, 4, 5, 17–19, 21, W1302, W1303)

**CP152 — can't talk now**
- Source g21, sc4 (Sarah) = W1303.1: "Hello! I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow?"
- Seed: **"Hello! I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow?"**
- Cut: `hello` *(CP001)* · `I'm sorry` *(CP038)* · `I can't talk` **(new)** · `at the moment` **(new)** · `I need to go home now` **(new)** · `can we talk tomorrow` **(new)**
- Job: the declined conversation with its account and counter-offer — the corpus's model of
  saying no warmly: apology, inability, reason, alternative.

**CP153 — busy, but Saturday**
- Source g22, sc4 (Friend — the decline-with-counterproposal is role-symmetric): "No, I'm sorry, I'm busy tomorrow. But let's talk on Saturday. See you then."
- Seed: **"No, I'm sorry, I'm busy tomorrow. But let's talk on Saturday. See you then."**
- Cut: `no` *(CP036)* · `I'm sorry` *(CP038)* · `I'm busy tomorrow` **(new)** · `let's talk` **(new)** · `on Saturday` **(new)** · `see you then` **(new)**
- Job: the counter-decline and counter-proposal — "let's talk" opens the let's frame; "see
  you then" completes the see-you family's third member (later, tomorrow, then).

**CP154 — only the morning**
- Source W1303.3 (Sarah): "Saturday's good — but only the morning. I'm away all afternoon."
- Seed: **"Saturday's good — but only the morning. I'm away all afternoon."**
- Cut: `Saturday's good` **(new)** · `but only the morning` **(new)** · `I'm away all afternoon` **(new)**
- Job: the counterbid — accept the day, scope the time, give the account. The negotiation
  move the trunk's M5 shape exists for.

**CP155 — ten at the café (near-ZERO)**
- Source W1303.5 (Sarah): "Ten at the café — perfect. See you Saturday!"
- Seed: **"Ten at the café — perfect. See you Saturday!"**
- Cut: `ten at the café` **(new)** · `perfect` **(new)** · `see you Saturday` *(see-you family + core day — no new LEGO)*
- Job: the settlement formula — time-place echo plus the sealing assessment "perfect" (D7's
  fixed material) — and the see-you frame taking a day name as its slot.

**CP156 — very tired (near-ZERO)**
- Source g24, sc5 (Sarah), middle sentence (head: CP023; tail: CP007): "I'm very tired now."
- Seed: **"I'm very tired now."**
- Cut: `I'm very tired` **(new)** · `now` *(core — glue)*
- Job: one LEGO — the state report; "I'm very X" now has well (CP010) and tired, a paradigm
  opening.

**CP157 — the busy day**
- Source g4, sc1 (Sarah), after CP008 took the close: "Yes, I've got a busy day today. I hope you have a good day. See you later."
- Seed: **"Yes, I've got a busy day today. I hope you have a good day. See you later."**
- Cut: `yes` *(CP009)* · `I've got a busy day today` **(new)** · `I hope you have a good day` **(new)** · `see you later` *(CP008)*
- Job: the possession-of-time idiom "I've got a busy day" and the parting wish "I hope you
  have a good day" — the corpus's warmest close, D3-adjacent.

**CP158 — going to work?**
- Source g3, sc1 (Neighbour — role-symmetric), question tail (head: CP010): "Are you going to work?"
- Seed: **"Are you going to work?"**
- Cut: `are you going to work` **(new)**
- Job: the neighbourly destination question, whole — progressive-as-future in a worn chunk,
  never as taught grammar.

**CP159 — hot again**
- Source g169, sc17 (drill): "It's hot today, again."
- Seed: **"It's hot today, again."**
- Cut: `it's hot today` **(new)** · `again` *(core — glue)*
- Job: opens the weather register — "it's X today" with its first adjective.

**CP160 — is the water warm?**
- Source g170, sc17 (drill): "Is the water warm?"
- Seed: **"Is the water warm?"**
- Cut: `is the water warm` **(new)**
- Job: the property question, whole — the polar side of the weather-and-water small talk.

**CP161 — a little cold (near-ZERO)**
- Source g171, sc17 (drill): "No, it's a little cold today."
- Seed: **"No, it's a little cold today."**
- Cut: `no` *(CP036)* · `it's a little cold today` **(new)**
- Job: one LEGO — the hedged negative answer, CP159's frame with the degree softener.

**CP162 — not bad**
- Source g172, sc17 (drill): "It's not bad."
- Seed: **"It's not bad."**
- Cut: `it's not bad` **(new)**
- Job: the litotes assessment — the most British chunk in the corpus, one LEGO.

**CP163 — a bad idea**
- Source g174, sc18 (drill): "That's a bad idea."
- Seed: **"That's a bad idea."**
- Cut: `that's a bad idea` **(new)**
- Job: the blunt evaluation — D7's negative pole, which no politeness formula covers.

**CP164 — that makes me happy**
- Source g185, sc19 (drill): "That makes me happy."
- Seed: **"That makes me happy."**
- Cut: `that makes me happy` **(new)**
- Job: opens the causative-feeling family, whole — the corpus's way of owning a feeling
  without owning the grammar of causatives.

**CP165 — a little worried**
- Source g186, sc19 (drill): "That makes me feel a little worried."
- Seed: **"That makes me feel a little worried."**
- Cut: `that makes me feel` **(new)** · `a little worried` **(new)**
- Job: the feel-variant with its hedged object — "that makes me feel X" is the family's
  productive frame, "a little X" the corpus's standing softener.

**CP166 — it makes me feel stupid**
- Source g187, sc19 (drill): "When you talk quickly, it makes me feel stupid."
- Seed: **"When you talk quickly, it makes me feel stupid."**
- Cut: `when you talk quickly` **(new)** · `it makes me feel stupid` **(new — the it-side of CP165's frame, kept whole with its blunt adjective)**
- Job: the learner's honest complaint — the temporal trigger clause and the feeling named;
  the repair register's emotional floor, and the pod's most quoted line for a reason.

**CP167 — is it okay if I sit here?**
- Source g188, sc19 (drill): "Is it okay if I sit here?"
- Seed: **"Is it okay if I sit here?"**
- Cut: `is it okay if` **(new)** · `I sit here` **(new)**
- Job: the permission frame — beside CP111's formal "is it possible for us", the casual ask;
  the seat question (CP035) now has its non-idiomatic sibling.

**CP168 — okay if we put this here? (near-ZERO)**
- Source g189, sc19 (drill): "Is it okay if we put this here?"
- Seed: **"Is it okay if we put this here?"**
- Cut: `is it okay if` *(CP167)* · `we put this here` **(new)**
- Job: one LEGO — the frame's plural-action fill.

**CP169 — I don't want to be late**
- Source g190, sc19 (drill): "I don't want to be late."
- Seed: **"I don't want to be late."**
- Cut: `I don't want` **(new)** · `to be late` **(new)**
- Job: the negative want (beside core "I want") and the lateness infinitive the next three
  seeds run on — a four-seed paradigm from one drill cluster.

**CP170 — are we going to be late? (near-ZERO)**
- Source g191, sc19 (drill): "Are we going to be late?"
- Seed: **"Are we going to be late?"**
- Cut: `are we going` **(new)** · `to be late` *(CP169)*
- Job: one LEGO — the going-to future interrogative over the owned complement.

**CP171 — I promise I won't be late**
- Source g192, sc19 (drill): "I promise I won't be late."
- Seed: **"I promise I won't be late."**
- Cut: `I promise` **(new)** · `I won't be late` **(new)**
- Job: D12's explicit performative "I promise" and the negative-future commitment — the
  compliance frame's strongest form.

**CP172 — we won't be late (near-ZERO)**
- Source g193, sc19 (drill): "I promise we won't be late."
- Seed: **"I promise we won't be late."**
- Cut: `I promise` *(CP171)* · `we won't be late` **(new)**
- Job: one LEGO — the plural side, promising for the party.

**CP173 — it sounds as though**
- Source g207, sc21 (drill): "It sounds as though we need to leave soon."
- Seed: **"It sounds as though we need to leave soon."**
- Cut: `it sounds as though` **(new)** · `we need to leave soon` **(new)**
- Job: the evidential hedge — reporting what the situation says rather than what you know —
  plus the shared-need statement.

**CP174 — you want us not to (near-ZERO)**
- Source g208, sc21 (drill): "It sounds as though you want us not to do that."
- Seed: **"It sounds as though you want us not to do that."**
- Cut: `it sounds as though` *(CP173)* · `you want us not to do that` **(new)**
- Job: one LEGO — the inferred prohibition, read from tone rather than words: the pod
  teaching pragmatics by attestation.

**CP175 — am I correct?**
- Source g180, sc18 (drill): "Is that correct? Am I correct?"
- Seed: **"Is that correct? Am I correct?"**
- Cut: `is that correct` **(new)** · `am I correct` **(new)**
- Job: the verification pair — fact-check and self-check, the learner's calibration moves.

**CP176 — am I wrong about that?**
- Source g181, sc18 (drill): "Am I wrong about that?"
- Seed: **"Am I wrong about that?"**
- Cut: `am I wrong` **(new)** · `about that` **(new)**
- Job: the inverse check plus the topic phrase "about that" — reused by block M's
  agree-about-this.

**CP177 — the drinks offer**
- Source g217, sc21 (drill — host-side, promoted by the pod): "Would you like to order some drinks?"
- Seed: **"Would you like to order some drinks?"**
- Cut: `would you like to order` **(new)** · `some drinks` **(new)**
- Job: the learner as host — the would-you-like offer with its first object; the ordering
  paradigm's other chair.

**CP178 — drinks first? (near-ZERO)**
- Source g218, sc21 (drill): "Do you want to order some drinks first?"
- Seed: **"Do you want to order some drinks first?"**
- Cut: `do you want to order` **(new)** · `some drinks` *(CP177)* · `first` **(new)**
- Job: the casual side of CP177's offer, plus the sequencing adverb "first".

**CP179 — something to drink? (near-ZERO)**
- Source g219, sc21 (drill): "Did you want something to drink first?"
- Seed: **"Did you want something to drink first?"**
- Cut: `did you want` **(new — the bare side of CP102's chunk)** · `something to drink` **(new)** · `first` *(CP178)*
- Job: the past-softened offer and "something to drink" — the indefinite object that outlives
  every menu.

**CP180 — would you have a look?**
- Source W1302.3 (Sarah): "Would you have a look? No rush — I'm waiting on my coffee anyway."
- Seed: **"Would you have a look? No rush — I'm waiting on my coffee anyway."**
- Cut: `would you have a look` **(new)** · `no rush` **(new)** · `I'm waiting on my coffee` **(new)** · `anyway` **(new)**
- Job: holding an "I don't know" with grace — the check request, the pressure release "no
  rush", and the waiting account. The M1 recovery's producible heart.

**CP181 — crisps will do nicely**
- Source W1302.5 (Sarah): "Crisps will do nicely — salted, please."
- Seed: **"Crisps will do nicely — salted, please."**
- Cut: `crisps will do nicely` **(new — "will do nicely" rides inside its worn subject)** · `salted` **(new)** · `please` *(CP009)*
- Job: accepting the partial win — "X will do nicely" is the settling formula, and the
  one-word specification "salted" is D8 ellipsis at its limit.

### Block M — talking about talking (scene 22, W1304, W1305)

**CP182 — the practise request**
- Source g221, sc22 (Learner) = W1304.1: "Would you mind if I tried to practise speaking [target language] with you? I haven't been learning for very long, and I still feel a little nervous about speaking with other people."
- Seed: **"Would you mind if I tried to practise speaking your language with you? I haven't been learning for very long, and I still feel a little nervous about speaking with other people."** — deictic language name.
- Cut: `would you mind if I tried` **(new)** · `to practise speaking your language` **(new)** · `with you` *(core — glue)* · `I haven't been learning for very long` **(new)** · `I still feel a little nervous` **(new)** · `about speaking with other people` **(new)**
- Job: the humblest ask in the corpus — "would you mind if I tried" is the permission frame's
  gentlest form — with the learner's self-account: short history, standing nerves.

**CP183 — what I need to practise**
- Source g223, sc22 (Learner): "Thank you, that's good to know. I need to learn more words, and I need to practise listening. I don't understand people very well when they don't speak slowly."
- Seed: **"Thank you, that's good to know. I need to learn more words, and I need to practise listening. I don't understand people very well when they don't speak slowly."**
- Cut: `thank you` *(CP010)* · `that's good to know` **(new)** · `I need to learn more words` **(new)** · `I need to practise listening` **(new)** · `I don't understand people very well` **(new)** · `when they don't speak slowly` **(new)**
- Job: the receipt of reassurance ("that's good to know") and the learner's own needs
  analysis — the two need-to statements and the honest comprehension limit.

**CP184 — easier with one person**
- Source g225, sc22 (Learner): "Yes, thank you. It's easier talking to just one person. It's a bit difficult thinking of something to say, though. I'm not sure what to say, but I feel as if I can speak enough to start having conversations."
- Seed: **"Yes, thank you. It's easier talking to just one person. It's a bit difficult thinking of something to say, though. I'm not sure what to say, but I feel as if I can speak enough to start having conversations."**
- Cut: `yes` *(CP009)* · `thank you` *(CP010)* · `it's easier talking to just one person` **(new)** · `it's a bit difficult` **(new)** · `thinking of something to say` **(new)** · `though` *(core — glue)* · `I'm not sure what to say` **(new)** · `I feel as if` **(new)** · `I can speak enough` **(new)** · `to start having conversations` **(new)**
- Job: the mid-conversation self-report — comparative ease, named difficulty, the hedge "I
  feel as if", and the threshold claim "I can speak enough to start having conversations".

**CP185 — frustrating, but keep practising**
- Source g227, sc22 (Learner) = W1305.1: "It's just a little frustrating when I can't think quickly enough to express myself properly. But I know that I need to keep practising if I want to speak more confidently."
- Seed: **"It's just a little frustrating when I can't think quickly enough to express myself properly. But I know that I need to keep practising if I want to speak more confidently."**
- Cut: `it's just a little frustrating` **(new)** · `when I can't think quickly enough` **(new)** · `to express myself properly` **(new)** · `I know that` **(new)** · `I need to keep practising` **(new)** · `if I want to speak more confidently` **(new)**
- Job: the frustration named and answered — the degree-hedged feeling, the capacity limit,
  and the resolve pair ("keep practising", "speak more confidently") block M's remaining
  seeds orbit.

**CP186 — changing my brain**
- Source g229, sc22 (Learner): "This is exactly the kind of practice I need. I think I can feel it changing my brain while we're talking! I really appreciate your help. But it's surprising how tired I get when I'm talking in a language I don't speak very well."
- Seed: **"This is exactly the kind of practice I need. I think I can feel it changing my brain while we're talking! I really appreciate your help. But it's surprising how tired I get when I'm talking in a language I don't speak very well."**
- Cut: `this is exactly the kind of practice I need` **(new)** · `I think` *(core)* · `I can feel it changing my brain` **(new)** · `while we're talking` **(new)** · `I really appreciate your help` **(new)** · `it's surprising` **(new)** · `how tired I get` **(new)** · `when I'm talking in a language` **(new)** · `I don't speak very well` **(new)**
- Job: the method talking about itself — appreciation, the felt change, and the honest cost
  ("how tired I get"). The richest single row in the corpus, cut at its natural joints.

**CP187 — more conversations**
- Source g231, sc22 (Learner): "It really is. I'm really happy that I can have this much of a conversation. And I hope we'll be able to have more conversations in the future as I keep on getting better."
- Seed: **"It really is. I'm really happy that I can have this much of a conversation. And I hope we'll be able to have more conversations in the future as I keep on getting better."**
- Cut: `it really is` **(new)** · `I'm really happy that` **(new)** · `I can have this much of a conversation` **(new)** · `I hope` **(new)** · `we'll be able to have more conversations` **(new)** · `in the future` **(new)** · `as I keep on getting better` **(new)**
- Job: the agreeing echo "it really is" (X2's warmest yes), the celebrated milestone, and the
  future opened — the scene's close and the trunk's promise to the learner.

**CP188 — six months, honestly counted**
- Source W1304.3 (Learner): "About six months. A little every day — usually just ten minutes. It doesn't feel like very much."
- Seed: **"About six months. A little every day — usually just ten minutes. It doesn't feel like very much."**
- Cut: `about six months` **(new)** · `a little every day` *(CP051)* · `usually just ten minutes` **(new)** · `it doesn't feel like very much` **(new)**
- Job: the audited premise — the duration answered exactly, the cadence owned from the
  contract block, and the self-deprecating coda the next seed overturns.

**CP189 — maybe it adds up (near-ZERO family)**
- Source W1304.5 (Learner): "Thank you. Maybe it does add up after all. I still feel nervous — but a little less than when we started talking."
- Seed: **"Thank you. Maybe it does add up after all. I still feel nervous — but a little less than when we started talking."**
- Cut: `thank you` *(CP010)* · `maybe it does add up` **(new)** · `after all` **(new)** · `I still feel nervous` *(side of CP182's chunk — the hedge dropped)* · `but a little less` **(new)** · `than when we started talking` **(new)**
- Job: the gift received — the premise revised in real time ("maybe it does add up after
  all") and the feeling re-measured. The M2 recovery's landing.

**CP190 — agree to differ**
- Source W1305.3 (Learner): "That's kind — but I don't think we're going to agree about this. You hear my sentences; I hear all my gaps."
- Seed: **"That's kind — but I don't think we're going to agree about this. You hear my sentences; I hear all my gaps."**
- Cut: `that's kind` **(new — the bare assessment beside CP014's full form)** · `I don't think` **(new)** · `we're going to agree about this` **(new)** · `you hear my sentences` **(new)** · `I hear all my gaps` **(new)**
- Job: disagreeing warmly — the softened dissent "I don't think we're going to agree" and the
  two-perspectives figure, the corpus's most grown-up move.

**CP191 — it's a deal**
- Source W1305.5 (Learner): "It's a deal. Either way, I need the practice — so let's keep talking."
- Seed: **"It's a deal. Either way, I need the practice — so let's keep talking."**
- Cut: `it's a deal` **(new)** · `either way` **(new)** · `I need the practice` **(new)** · `so` *(core)* · `let's keep talking` **(new)**
- Job: the parked disagreement sealed — settlement formula, the both-branches marker "either
  way", and the continuation resolve "let's keep talking": the set's closing act, and the
  method's.

### Block N — four late fills (found by the coverage audit)

The mechanical census (§7) caught four drill rows the first pass missed. All four are near-zero
seeds, and a near-zero seed's position is free — its admission cost is the same anywhere after
its owners — so they append here rather than forcing a renumber. Stated, not hidden.

**CP192 — orange juice (near-ZERO)**
- Source g175, sc18 (drill): "Do you have any orange juice?"
- Seed: **"Do you have any orange juice?"**
- Cut: `do you have` *(CP054)* · `any orange juice` **(new)**
- Job: one LEGO — the availability frame's drink fill.

**CP193 — apple juice (near-ZERO)**
- Source g176, sc18 (drill): "Do you have any apple juice?"
- Seed: **"Do you have any apple juice?"**
- Cut: `do you have` *(CP054)* · `any apple juice` **(new)**
- Job: one LEGO — the minimal pair confirming the fill's slot.

**CP194 — down there on the left**
- Source g211, sc21 (drill — direction-giving promoted to the learner by the pod): "It's down there on the left."
- Seed: **"It's down there on the left."**
- Cut: `it's down there` **(new)** · `on the left` **(new)**
- Job: the learner giving directions back — the deictic route answer and the side phrase,
  the producible half of what block K only asks.

**CP195 — on the right (near-ZERO)**
- Source g212, sc21 (drill): "It's down there on the right."
- Seed: **"It's down there on the right."**
- Cut: `it's down there` *(CP194)* · `on the right` **(new)**
- Job: one LEGO — the sides paired, left/right split complete.

---

## 5. Cuts and baskets — in order, as deep as quality allowed

**The rules these baskets follow** (identical to the health set's, restated once): the cut
never goes below a phrase and must tile its seed exactly. Only **new** LEGOs get baskets —
owned chunks enter as `is_new = false`, tiling and vocabulary, no round, no learning event.
Floors: **at least 4 BUILD and 5 USE per new LEGO** — fewer phrases is a fail; variety is a
bonus on top of volume, never a substitute. BUILD phrases may be fragments but must extend
into natural full English by appending or prepending owned chunks; USE phrases are complete
natural sentences, tier-1 or they die. Every phrase composes only from this seed's LEGO,
chunks owned at that point in the sequence (this document's order), assumed course-core
strings (Appendix A), and core glue — no forward references. A pod sentence, intact, is a
legitimate USE phrase wherever it contains the LEGO (Tom's ruling) — baskets are encouraged
to reuse corpus sentences verbatim as USE material.

Baskets are being authored in document order by a dispatched fan-out and assembled here as
they verify; the section below states exactly how far quality-complete baskets reach.

*(assembly in progress — see §7 for the verification protocol)*

---

## 6. The coverage ledger — all 231 rows and 35 authored-walk steps accounted

**Reconciliation: 165 minted-or-split + 16 codas + 50 receptive = 231.** Verified mechanically
against the document (§7).

**Minted rows (165).** Every row named as a seed source in §4. Rows carrying two acts were
split, each half named at its seed: g3 (CP010 + CP158), g4 (CP157 + CP008), g11 (CP004 +
CP053), g24 (CP023 + CP156 + CP007), g35 (CP032 + CP033), g48 (CP094 + CP095), g94 (CP011;
its holiday question tail stays receptive), g95 (CP022 + CP117), g222 (CP012; its
encouragement tail stays receptive), g230 (CP021; its fun-tail's act returns at CP190).
Consolidations, each stated in place: g138 → CP094 (same sentence as g48's first half);
g8 = W1301.1 → CP132; g14 = W1302.1 → CP056; g21 = W1303.1 → CP152; g221 = W1304.1 → CP182;
g227 = W1305.1 → CP185; W1203.1 → CP044 (the offer's booking-desk variant, one act one form);
g10's greeting head → CP004's token (the row itself stays receptive).

**Codas (16):** g37, g52, g68, g86, g96, g109, g119, g130, g140, g151, g162, g173, g184,
g195, g206, g220 — narrator vocabulary drips; admission events, not frames (§1.5). Their
atoms enter Appendix A as assumed course-core vocabulary.

**Receptive context (50):** g9, g10, g15, g16, g18, g34, g38, g40, g42, g45, g47, g49, g51,
g53, g55, g59, g63, g70, g71, g74, g76, g79, g82, g83, g88, g90, g92, g98, g100, g102, g104,
g106, g108, g111, g113, g115, g117, g121, g123, g124, g126, g128, g132, g134, g136, g137,
g139, g224, g226, g228 — service-professional working lines (the counter, the kitchen, the
desk, the wheel, turn-by-turn direction-giving), the native's repair reformulation (g34), and
scene 22's remaining encouragements (g224, g226, g228). All are owned mappings — heard in
dialogue — that the trunk's productive walk does not need; a hospitality/retail sector pod is
where they would mint. The near-misses were weighed and the call is stated: g9's hedge answer
("It's not very far. Maybe three or four miles.") stays receptive because W1301.3/.5 deliver
its chunks from the learner's own mouth (CP150–151); g18/g137's handovers stay receptive
because the learner-side D5 cut is CP104/CP105.

**Authored-walk steps (35).** Learner-side steps all mint: W1201.1/.3/.5 (CP044–046),
W1202.1 (=CP044) /.3/.5 (CP047–048), W1203.1 (→CP044) /.3/.5 (CP049–050), W1204.1 (=CP044)
/.3/.5 (CP051–052), W1301.1 (=CP132) /.3/.5 (CP150–151), W1302.1 (=CP056) /.3/.5 (CP180–181),
W1303.1 (=CP152) /.3/.5 (CP154–155), W1304.1 (=CP182) /.3/.5 (CP188–189), W1305.1 (=CP185)
/.3/.5 (CP190–191), W1401.1/.5/.7 (CP145–147). Counterpart steps are receptive with one
ruled exception, W1201.4 → CP013 (reassurance is role-symmetric). **W1401.3 is deliberately
unminted**: it contains the walk's designed error ("the lamps") — a seed must never teach the
mistake the walk exists to repair.

---

## 7. Decisions taken, and the mechanical verification

Decisions, one line each, each overrulable in one word:

1. **The projection is by role, stated in §1** — learner turns and all 73 drill rows mint;
   counterpart turns mint only for role-symmetric civilian acts, each named; service
   working lines stay receptive.
2. **Walk order is not cut order** — the pod has delivered everything already, so the
   sequence optimises admission economy, not narrative.
3. **Minimal pairs are kept as separate seeds, not consolidated** — different intentions
   (taxi/bus, single/return, left/right) are not ZUT forks, and the second member is a
   near-zero seed, the highest-yield kind. Consolidation applies only to same-act repeats
   (the offer ×3, "Could I pay by card?" ×2).
4. **Deictic language names** ("your language", "it") per scene 0's ratified convention, so
   the set instantiates in any pair; the two placeholder rows (g33, g221, g95, g149) are
   edited accordingly and stated in place.
5. **British spelling normalised once**: verb "practise" (g95, g149); the noun keeps
   "practice" (g229, W1305.5).
6. **Frame-opener LEGOs are molecular moves** ("do you have", "could I have", "can you tell
   me", "I'll have", "would you mind if I tried") — author-declared M-cuts whose standalone
   use is the ellipted service register itself; never cut below them.
7. **Worn wholes stay whole where cutting would mint grammar, not moves**: "what time is
   breakfast served" (the set's only passive), "where does the bus leave from" (the
   wh-flip), "crisps, or nuts, or anything" (the listing intonation).
8. **Sides of owned chunks** ("I'm on holiday" from CP033, "left" from CP146, "or on the
   room" from CP099) are cited as sides, never as new admissions; the pair overlay
   re-verifies target tiling and mints an in-pair cut where target morphology resists.
9. **W1401.3 never mints** — the designed error stays in the walk, out of the seed set.
10. **The four late fills stand as block N** rather than forcing a 191-seed renumber; a
    near-zero seed's position is free by construction, and the audit trail is worth more
    than cosmetic order.
11. **No JSON companion authored** — same call as the health set: the document is the
    canonical artefact; the structured form falls out at registration.

Mechanical verification, run against this document (the same discipline the health set
closed with): **195 seeds, CP001–CP195, contiguous, no duplicates; 401 new LEGOs; zero
forward references in any cut line** (every `(CPnnn)` citation in a cut resolves to an
earlier seed); **9 strict-zero seeds**; **all 73 drill rows mint** (verified per scene
block); **165 + 16 + 50 = 231** rows reconciled exactly; all 35 authored-walk steps
dispositioned. The census caught four missed drill rows on its first run — block N is the
honest record of that catch.

---

## 8. Explicit gaps — for Tom, none blocking

- **Three unlock surfaces are not attested in scoped CORE**: "here you are" (D5 attests
  "here's" / "here it is" instead), "not at all" (X6 attests "you're welcome" / "no
  problem"), and "got it" / "understood" (D10 — its inventory specimen comes from the
  sacked pod-1 slate; scoped CORE attests the read-back act only by echo, CP124/CP146/CP147).
  Nothing was minted without attestation. **Cheapest fix:** one line each in a future CORE
  walk or coda — e.g. a handover turn "Here you are.", a thanks-downgrade "Not at all.",
  and a receipt "Got it — thanks." — at which point each becomes a one-LEGO near-zero seed
  appended like block N.
- **D9 (reckoning — "That's eight pound forty altogether") mints nowhere**: the corpus
  attests it only in service mouths and the pod's drills never promote it. If learners
  should own the reckoning (market stalls, splitting bills), it needs either a promoted
  drill row or a sector pod; flagged, not resolved here.
- **The 56 corpus rows on unencoded complete walks** are placed in `canonical_pod_scenarios`
  but not in pod-0.json's walk encodings; this set reads them from the canon (they are the
  scenes-7–14 rows above), so nothing is lost — but the walk-encoding gap named in
  pod-0.json's own accounting remains open and is not this job's to close.
- **The union-ZUT registration is downstream**: this document's cuts and Appendix A are the
  gate's inputs, but no segment registration was performed (no DB writes in this job, and
  the trunk layer's registration semantics — pod-seed thread vs sector segment — want one
  ruling before anything is registered).
- **Basket depth is reported in §5** as assembled; wherever it stops short of CP195, the
  stopping point and reason are stated there rather than papered over.

---

## Appendix A — the assumed course-core inventory (the overlay's per-seed contract)

The union of every *(core)* citation in §4. A pair overlay schedules each seed at the
earliest base-course position where that seed's own assumed strings are owned (per-seed
anchoring, §2); anything not owned there is authored in-pair as `is_new = true`. The list is
normative, not descriptive — checked against no live course, by design.

**Frame openers and verbs of asking:** "I'd like" · "I want" · "I think" · "I hope" ·
"can you" · "could you" · "can we" · "I need to" *(as in CP115's "I need to get" family —
the bare need-to is early-core everywhere)*.

**Glue:** "and" · "but" · "so" · "or" · "well" · "just" · "too" · "very" · "now" · "also" ·
"again" · "though" · "then" · "that" (pronoun) · "it's" (as copular head in recombinations)
· "here" / "there" (bare deictics) · "with you" · "for me" (as free beneficiary glue where
not part of a worn chunk).

**Coda vocabulary (the 16 narrator drips, admission events):** numbers 1–21, tens to 100,
100 / 200 / 1,000 / 100,000 / a million; colours (white, black, red, green, blue, yellow,
orange, purple, pink, grey); days Monday–Sunday; months January–December; clock times
(1–12 o'clock, half-past). These are cut early in every base course on its own account;
the codas' role here is that CP050's "Friday to Monday", CP153's "on Saturday" and CP155's
"ten at the café" may treat day names and numbers as slot content.

**Names and places as slot content:** personal names (Sarah, Anna, James, Jones, Davies),
city and country names (Manchester, London, France, the Philippines-class slot) — slots,
never vocabulary.

