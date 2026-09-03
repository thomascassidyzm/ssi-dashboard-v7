# Extra phrases, scenes 15–21 — proposed speaker per line, and what else is wrong

*2026-08-24. PROPOSAL ONLY. Nothing applied: no DB write, no `content_audit_log` entry, no
cast change, no text change, no audio. The paused Italian render (b8ea5db0 / #360) has not
been touched and stays paused.*

**Two sections. Part 1 is the speaker assignment you asked for. Part 2 is everything else I
found reading the same 80 lines — and Part 2 is the more important half, because one of its
findings says the speaker change should probably not be rendered as it stands.**

---

## Read this first — one premise needs correcting

The brief says the canonical has **no** speaker attribution for scenes 15–21 and the import
defaulted everything to `Learner`. That isn't what the data shows:

- `canonical_pod_scenarios` (`pod_slug='pod-0'`), scenes 15–21: **80 rows, zero NULL
  speakers.** Every line carries an explicit `Learner`; the drill tails an explicit `Narrator`.
- Commit `8dd662493` (2026-08-06) shows those labels were set **deliberately**: it moved 11
  lines in scenes 16/17/21 *from* an inferred alternating `Friend` *to* `Learner`, under Aran's
  chunk ruling.

So this is overruling a prior ruling, not repairing an import bug — your call to make, and the
canonical licenses it: *"If a future pass does want a second voice here, that is a free choice,
not something the data dictates."* I did the full assignment on that basis. But see **D1**: the
reason that ruling existed turns out to be load-bearing.

**Headline: applying conversational sense to all 73 phrase lines lands on exactly the 11 lines
job 60d19bc1 already changed.** Same scenes, same sentence numbers, no more, no fewer. That
work is already live on all 22 courses. There is no second batch of replies hiding here.

---

# PART 1 — the speaker assignment

## Scope

Of 80 lines (73 phrase lines + 7 `Narrator` drill tails, untouched):

| Scene | Canon label | Phrase lines | Proposed non-Learner | Already live | Net new rows |
|---|---|---|---|---|---|
| 15 | 9 · Extra phrases | 10 | **0** | 0 | none |
| 16 | 10 · Extra phrases | 10 | **1** | 1 | none |
| 17 | 11 · Extra phrases | 10 | **4** | 4 | none |
| 18 | 12 · Extra phrases | 10 | **0** | 0 | none |
| 19 | 13 · Extra phrases | 10 | **0** | 0 | none |
| 20 | 14 · Extra phrases | 10 | **0** | 0 | none |
| 21 | 15 · Extra phrases | 13 | **6** | 6 | none |
| **Total** | | **73** | **11** | **11** | **zero rows to change** |

**Scenes 18 and 19 — the ones you were looking at — contain no reply line at all.** Every line
is first-person learner production. There is no second party to give them to, so those scenes
stay ten-on-one-voice however the pass is run. Same for 15 and 20.

## The full assignment, all 80 lines

`L` = Learner (voice A). `S` = Staff, `I` = Interlocutor (both cast to **voice B** on all 22
courses — audibly identical). `N` = Narrator, untouched. **⚠** = I want your eyes on it.
**★** = differs from live. **⛔** = a Part-2 defect lands on this line.

### Scene 15 (canon label 9) — no changes

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | How much is that? | |
| 2 | L | **L** | Can you tell me how much that is? | politeness variant of 1 |
| 3 | L | **L** | How much does it cost to get a taxi into town? | |
| 4 | L | **L** | How much does it cost to get a bus into town? | |
| 5 | L | **L** | Where can we get a bus? | |
| 6 | L | **L** | Where can we get a taxi? | |
| 7 | L | **L** | Four single tickets to town, please. | |
| 8 | L | **L** | Two return tickets to town, please. | |
| 9 | L | **L** | I prefer to try to speak your language, I think it's polite. | ⛔ D6 |
| 10 | L | **L** | I'm sorry I can't speak very quickly. | |
| 11 | N | **N** | 100,000. 60. 70. 1 o'clock. 11 o'clock. | drill tail |

No answer is ever given to any question here, so there is no exchange to build.

### Scene 16 (canon label 10) — 1 non-Learner

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | But if you can speak slowly I think we'll be able to manage. | |
| 2 | L | **L** | You spoke a little too quickly, so I'm not sure if I understood. | ⛔ D7 |
| 3 | L | **L** | Can we try again? | |
| 4 | L | **L** | Can we see the menu? | |
| 5 | L | **L** | Can we see the dessert menu also? | |
| 6 | L | **L** | Do you have anything to eat? | |
| 7 | L | **L** | Can we pay? | |
| 8 | L | **L** | Can we pay by card? | sets up 9 |
| 9 | S | **S** | No, we only take cash. | only the till can say this |
| 10 | L | **L** | I'm sorry, I don't have any cash. | closes the exchange |
| 11 | N | **N** | A million. 80. 90. 2 o'clock. 10 o'clock. | drill tail |

**This is the one scene where the two-voice conform works cleanly**: 8→9→10 is a genuine
three-turn exchange, with a single reply and no variant run.

### Scene 17 (canon label 11) — 4 non-Learner

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | Is there a cash machine near here? | |
| 2 | S | **S** | Do you want to pay by cash or card or put it on the room? | hotel desk |
| 3 | L | **L** | Can we put it on the room, please? | answers 2 |
| 4 | S | **S** ⛔ | Would you like to pay by cash or card or on the room? | variant of 2 — **D1** |
| 5 | S | **S** ⛔ | Did you want to pay by cash or card? | variant of 2 — **D1** |
| 6 | L | **L** | We'll pay by card again, please. | answers 4/5 |
| 7 | L | **L** | It's hot today, again. | ⛔ D4 — topic jumps here |
| 8 | L | **L** | Is the water warm? | |
| 9 | I | **I** | No, it's a little cold today. | answers 8 |
| 10 | L | **L** ⚠ | It's not bad. | **ambiguous — see below** |
| 11 | N | **N** | 3 o'clock. 9 o'clock. January. February. | drill tail |

### Scene 18 (canon label 12) — no changes

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | That's a bad idea. | ⛔ D5 — answers nothing |
| 2 | L | **L** | Do you have any orange juice? | |
| 3 | L | **L** | Do you have any apple juice? | |
| 4 | L | **L** | Does the boat leave from here? | |
| 5 | L | **L** | Does the bus leave from here? | |
| 6 | L | **L** | Where does the bus leave from? | |
| 7 | L | **L** | Is that correct? Am I correct? | ⛔ D8 — two questions in one row |
| 8 | L | **L** | Am I wrong about that? | |
| 9 | L | **L** | I'm sorry, my son lost his ticket. | |
| 10 | L | **L** | We have paid, but my daughter has lost her ticket. | |
| 11 | N | **N** | 4 o'clock. 8 o'clock. March. April. | drill tail |

### Scene 19 (canon label 13) — no changes

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | That makes me happy. | |
| 2 | L | **L** | That makes me feel a little worried. | |
| 3 | L | **L** | When you talk quickly, it makes me feel stupid. | ⛔ **D2** (ita) / **D3** (spa) |
| 4 | L | **L** | Is it okay if I sit here? | |
| 5 | L | **L** | Is it okay if we put this here? | |
| 6 | L | **L** | I don't want to be late. | |
| 7 | L | **L** | Are we going to be late? | |
| 8 | L | **L** | I promise I won't be late. | |
| 9 | L | **L** | I promise we won't be late. | |
| 10 | L | **L** | I'd like two scoops of ice-cream, please. | ⛔ D9 — thread splits here |
| 11 | N | **N** | 5 o'clock. 7 o'clock. May. June. | drill tail |

### Scene 20 (canon label 14) — no changes

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | Can I have one scoop of chocolate and one of strawberry? | |
| 2 | L | **L** | And then another cone with one scoop of lemon and one of blueberry. | |
| 3 | L | **L** ⛔ | Do you have any ice-cream? | **D9 — out of order** |
| 4 | L | **L** | Thank you for all your work. | |
| 5 | L | **L** | I wish you good luck with everything. | |
| 6 | L | **L** | Thank you for helping me. | |
| 7 | L | **L** ⚠ | Good luck with that! | **ambiguous — see below** |
| 8 | L | **L** | That's very kind of you. | |
| 9 | L | **L** | You're very kind. | |
| 10 | L | **L** | Thank you for being so friendly. | |
| 11 | N | **N** | 6 o'clock. July. August. September. | drill tail |

### Scene 21 (canon label 15) — 6 non-Learner

| # | Now | Proposed | Text | Note |
|---|---|---|---|---|
| 1 | L | **L** | It sounds as though we need to leave soon. | |
| 2 | L | **L** | It sounds as though you want us not to do that. | |
| 3 | L | **L** | Is there a toilet here? | sets up 5/6 |
| 4 | L | **L** | Can you tell me where the toilet is? | variant of 3 |
| 5 | I | **I** ⛔ | It's down there on the left. | **D1** |
| 6 | I | **I** ⛔ | It's down there on the right. | **D1 — contradicts 5** |
| 7 | L | **L** | Can you say that again? | repair move |
| 8 | I | **I** ⛔ | Yes, I said it's over there. | **D1 — contradicts 5 and 6** |
| 9 | L | **L** | What is that? | |
| 10 | L | **L** | What is that over there? | |
| 11 | I | **S** ★⛔ | Would you like to order some drinks? | waiter — **D1** |
| 12 | I | **S** ★⛔ | Do you want to order some drinks first? | variant — **D1** |
| 13 | I | **S** ★⛔ | Did you want something to drink first? | variant — **D1** |
| 14 | N | **N** | October. November. December. | drill tail |

## Two lines I want your eyes on

**1. Scene 17.10 — "It's not bad."** Follows *"Is the water warm?" → "No, it's a little cold
today."* Reads either way: the learner conceding, or the local softening their own answer. I
kept it **Learner**, making a clean Q/A/rejoinder. If you hear it as the local, it becomes the
12th line.

**2. Scene 20.7 — "Good luck with that!"** Sits in a run of learner thank-yous, which argues
Learner. But it's also the natural thing the shopkeeper says back. I kept it **Learner** for run
consistency. If you want it as the reply, it becomes the 12th line.

Both defensible; I'd rather you decided than I guessed.

## The label question

There is **one second voice**, not two. `Staff` and `Interlocutor` both cast to voice B on all
22 courses (Italian: Enzo / Tom), as does `Narrator`. **The Staff-vs-Interlocutor split changes
nothing a learner hears.** Scene 21.11–13 are a waiter, so `Staff` by sense, currently
`Interlocutor` — the ★ rows. **My recommendation: don't bother.** 66 writes, another audit-log
batch, zero audible difference. Tidy it whenever those rows are next touched for a real reason.

---

# PART 2 — Other defects found

Everything below came out of reading the same 80 lines. **Nothing here has been fixed.** Nine
findings, hardest first.

## D1 — ⛔ BLOCKING. The two-voice conform turns three variant runs into nonsense read aloud

This is the one that should stop #360 as it stands.

These scenes are drills, so they contain **variant sets**: three ways to ask the same thing,
two answers to the same question. As a one-voice phrase chunk that is fine — it reads as a list.
**Put the variants on a second voice and the scene contradicts itself.** Read scene 21 aloud
with the attribution that is live right now:

> **Learner:** Is there a toilet here?
> **Learner:** Can you tell me where the toilet is?
> **Voice B:** It's down there on the left.
> **Voice B:** It's down there on the right.
> **Learner:** Can you say that again?
> **Voice B:** Yes, I said it's over there.

Voice B gives two contradictory directions in a row, then — asked to repeat — says a **third,
different** thing that matches neither. A human reading this aloud stumbles hard. As a phrase
list it was never wrong; as a conversation it is broken.

Three runs are affected:

| Lines | Length of same-voice run | What it sounds like |
|---|---|---|
| 21.5, 21.6 | 2 | left, then right, to the same question |
| 21.8 | (after the above) | "I *said* it's over there" — but nobody said that |
| 21.11, 21.12, 21.13 | **3** | the waiter asks about drinks three times, nobody answering |
| 17.4, 17.5 | 2 | the desk asks how you're paying twice more, after you already answered at 17.3 |

Note the irony worth naming plainly: the complaint that started this was *"8–10 consecutive
lines on one voice."* This change **creates a 3-line consecutive run on voice B** at 21.11–13
and a 2-line run at 21.5–6. It relocates the symptom rather than removing it.

**This is very likely why Aran's chunk ruling exists.** His words were *"it seemed faster to do
them as chunks, without scene-based to and fro"* — a variant drill can't carry to-and-fro
without inventing turns that were never written.

**Options, all of which need your call:**

- **(a)** Render as-is and accept the contradictions. Cheapest, and honestly I think a learner
  would notice.
- **(b)** Attribute only the lines that answer something with no competing variant — that is
  **16.9, 17.2, 17.9, 21.8 alone** (4 lines), leaving variant sets on the learner voice. Keeps
  the real exchanges, loses the nonsense. **This is my recommendation.**
- **(c)** Revert to all-Learner in 15–21, i.e. Aran's ruling as shipped.
- **(d)** Rewrite the English so the variants sit in separate exchanges — real authoring work,
  a new canonical, and a full re-render across 22 courses. Not cheap, and it is Aran's text.

Under (b) the Italian render drops from 22 clips to roughly 8, and none of them are contested.

## D2 — Italian scene 19.3 says something different from every other language

| | Text | Back-translation |
|---|---|---|
| EN canon | When you talk quickly, it makes me feel stupid. | |
| **ita** | Quando parli velocemente, **mi sento come se non capissi niente.** | "…I feel as if I understood nothing." |
| spa | Cuando hablas rápido, me hace sentir **tonto**. | stupid |
| por | Quando fala depressa, faz-me sentir **estúpida**. | stupid |
| por_br | Quando você fala rápido, isso me faz sentir **burra**. | stupid |
| fra | Quand tu parles vite, ça me donne l'impression **d'être stupide**. | stupid |
| fra_ca | Quand tu parles vite, ça me fait sentir **niaiseuse**. | stupid |
| ron | Când vorbești repede, mă face să mă simt **prost**. | stupid |
| deu | Wenn du schnell sprichst, komme ich mir **dumm** vor. | stupid |
| nld | Als je snel praat, voel ik me **dom**. | stupid |
| swe | När du pratar snabbt känns det som att jag är **dum**. | stupid |

**Italian is the only one of ten that drops the proposition.** It teaches a different sentence
from the English prompt it is paired with. Probably a well-meant softening; it is still a
known/target mismatch on a line that is about to be re-rendered. Judgment call, so flagged not
fixed — but it wants a decision before Italian audio is paid for.

## D3 — Spanish scene 19.3 is the wrong gender

`spa_for_eng` says **"me hace sentir tonto"** — masculine — while its `Learner` speaker is
`gender: f` (Elvira). Portuguese (*estúpida*), Brazilian (*burra*) and Québécois (*niaiseuse*)
all correctly use the feminine on the same line. Italian's own 16.2 gets this right
(*"non sono sicura"*). So `spa` 19.3 is an isolated gender-adaptation miss. Small, real,
one row.

## D4 — Scene 17 changes situation mid-scene with no seam

Lines 1–6 are paying at a hotel desk. Line 7 is *"It's hot today, again"* and lines 8–10 are
about the water. That's two unrelated situations in one scene with nothing between them. It
passed unnoticed as a phrase list; the moment you cast it as a conversation, the listener hears
one continuous exchange lurch from a bill to the weather. Related to D1 — the conform is what
makes it audible.

## D5 — Scene 18 opens on a reply to nothing

*"That's a bad idea."* is the first line of the scene. Nothing precedes it. Read aloud, the
learner opens by rejecting a suggestion nobody made. Harmless in a list, odd in an experience.

## D6 — "your language" is unresolved in scene 15.9

*"I prefer to try to speak your language, I think it's polite."* The canonical's
`[target language]` placeholder machinery exists for exactly this (used at scene 22 lines 1 and
6), and this line sidesteps it with "your language". Not wrong, just noting it is the one place
in 15–21 where the language is referred to and it doesn't use the placeholder — worth knowing
if the placeholder is ever audited for coverage.

## D7 — Italian 16.2 has the learner's gender baked into the text

*"non sono sicur**a**"* — feminine, correct for the female Italian Learner voice, and good
practice. Flagging only because it means the row is voice-gender-coupled: if a course's Learner
voice ever flips gender, this text is silently wrong and nothing will catch it. Same class as
D3, but here it is right.

## D8 — Scene 18.7 is two questions in one row

*"Is that correct? Am I correct?"* is a single `listening_pod_sentences` row, so it renders as
one clip containing two distinct questions with no gap. It's the only line in 15–21 that does
this. A reader stumbles; a learner gets two prompts for one slot.

## D9 — The ice-cream runs backwards across the scene 19/20 boundary

- 19.10 — *"I'd like two scoops of ice-cream, please."*
- (drill tail — months)
- 20.1 — *"Can I have one scoop of chocolate and one of strawberry?"*
- 20.2 — *"And then another cone with one scoop of lemon and one of blueberry."*
- 20.3 — **"Do you have any ice-cream?"**

The learner orders ice-cream three times across a scene break, and *then* asks whether they have
any. Line 20.3 plainly belongs before 20.1. This one is a pure content-order defect in the
English canonical, independent of speakers, and it hits **all 22 courses**. It is the closest
thing in 15–21 to the Scene 3 double-`6.` you spotted.

## What I checked and found clean

Worth recording, because these are the checks that would have found more if there were more:

- **The Scene 3 double-`6.` does NOT repeat.** I re-parsed Aran's original file end to end:
  231 numbered lines, and **scene 3 is the only numbering anomaly in all 22 scenes**. The
  corrections log asserted this; I verified it independently rather than taking it.
- **Zero duplicate texts** anywhere in the file — no line appears twice.
- **All 22 live courses**, scenes 15–21: 80 rows each, `sentence_number` contiguous 1..N in
  every scene, **zero** known-text drift from the canonical, **zero** NULL or empty
  `target_text`, **zero** rows where target merely echoes the known, and **zero** missing
  target or known audio links.
- Scene 16→17 continuity is actually *good*: *"we only take cash" → "I don't have any cash"*
  → (next scene) *"Is there a cash machine near here?"* Someone sequenced that on purpose.

---

# What happens next (planned, not done)

1. **You rule on D1** — that's the gate. Under my recommended **(b)**, 7 of the 11 live
   attributions revert to Learner and 4 stand.
2. **You rule on the two ⚠ lines** and, if you care, the cosmetic ★ label split.
3. **D2 and D3** are single-row text decisions — D2 needs an Italian ear, D3 is a
   one-word feminine agreement.
4. **D9** is an English canonical re-order affecting all 22 courses; it moves a sentence's
   position, so unlike the speaker change it **does** engage the migration protocol.
5. Only then does #360 resume, rendering once against settled text and settled attribution.

**On the learner-progress question you asked me to confirm — your reasoning holds for the
speaker change, and the "unattributed → attributed" worry doesn't apply.** Two reasons: it's
moot on the facts (nothing is unattributed), and `pod-migration-protocol.md` defines a
surviving sentence by **text**, folded for ellipsis/quotes/dashes/whitespace/case, at the
corresponding scene within 8 sentence positions. `speaker` is not in that definition, and no
`scene_number`, `sentence_number`, `known_text`, `target_text` or slot moves. Every row is a
content match at distance 0, so every learner keeps every exposure. **No migration needed.**

The caveat is different and real: changing `speaker` changes which voice renders the line, so
it must go **make-before-break** — generate, verify, swap, then retire. That is what #360 is
for, and why it stays paused.

**D9 is the opposite case.** Re-ordering 20.3 changes a `sentence_number`, and text-identical
matches move position — that *is* a migration event under the protocol, and must be handled as
one. Do not let it ride along with the speaker change.

---

## Method and gaps

- Assignment source: `canonical_pod_scenarios` (`pod_slug='pod-0'`, scenes 15–21, 80 rows),
  cross-checked against `docs/pods/pod0-english-canonical.md`, Aran's archived original
  `docs/pods/pod0-aran-original-2026-08-06.txt`, and
  `docs/pods/pod0-canonical-corrections-2026-08-06.md`.
- Live: `listening_pod_sentences` for all 22 `*:pod-1` pods; cast from `listening_pods.speakers`.
- **Gap — the big one.** I read **Italian** target text in full, line by line. The other 21
  courses got mechanical checks only (nulls, drift, echoes, contiguity, audio links) plus the
  ten-language spot comparison on 19.3. **There may be D2-class translation defects in the
  other 20 languages that nobody has read.** Finding them needs native ears per language; I am
  not one, and I'd rather say so than imply coverage I don't have.
- **Gap.** Italian register mixes `tu` and `Lei` across scenes 15–21 — 15.2 *Può dirmi* (Lei)
  against 15.9 *la tua lingua* (tu) in the same ticket-buying situation; scene 20 is
  consistently `Lei`; 16.1–2 and 21.2 are `tu`. The pod's own consistency ledger permits
  different registers by situation, so some of this is correct by design and some may not be. I
  can't split those without an Italian ear, so I am reporting it as an open question rather
  than a defect count.
- **Gap.** `content_audit_log` was not read; the "already live" column comes from the committed
  logs in `docs/pods/` plus a live read of current DB speakers.
- Nothing was written. #360 untouched.
