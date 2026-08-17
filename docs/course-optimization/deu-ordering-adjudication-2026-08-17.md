# 486 findings, 9 real defects — and the gate was reading the wrong side of the course

**eng_for_deu · pilot of the ordering-adjudication programme · 2026-08-17**

The A135 sweep found **486 known-side findings** in `eng_for_deu` — the cleanest course in the
queue, chosen deliberately as the pilot. Adjudicated under Kai's three-tier frame, **467 of them
(96.1%) are fine by design** and **9 phrases carry a real defect**. Nothing has been applied:
Supabase went unreachable from this machine partway through and the apply step is held. Detail at
the end, honestly.

The pilot's most useful output is not the count. It is a **method correction** that changes what
the sweep means on roughly half the estate.

---

## The thing worth reading first: the gate is measuring the wrong side

`eng_for_deu` teaches **English to German speakers**. `known_text` is the German prompt;
`target_text` is the English the learner must produce. So the German known side is the learner's
**native language**.

A native German speaker is never puzzled by a German word as such. When the gate says "the prompt
uses `erledigen` and this course never introduced it", the learner reads that prompt perfectly
well. It harms them for exactly one reason, and only sometimes: if the **English** that prompt
demands has not been taught yet, they cannot know which word is wanted — and *that* is the thing
that makes a learner freeze.

So the decisive question for every finding is not the one the gate asks. It is:

> **At this seed, is the ENGLISH the prompt demands already taught?**

Cross-tabbing all 486 findings on both axes:

| | English answer taught | English answer **missing** |
|---|---|---|
| German token is a **form-variant** of a taught gloss | **407** | 5 |
| German token is a **new lexeme** in this course | **60** | 14 |

**467 harmless. 19 to adjudicate.** The 60 in the bottom-left are the class the gate exists to
catch and that, in this course direction, cannot bite: `erledigen` (16 hits) prompts for English
"do", which the learner has had since the opening seeds. Many German prompts → one English answer
is ZUT-legal and is the contract's own documented rule.

**This does not mean the sweep was wasted** — it means its findings must be adjudicated on the
target side for every course whose known side is the learner's native language. Where the two
coincide, as they do in 19 cases here, the finding is real and it is *sharper* than the raw
class, because it names a word the learner genuinely cannot produce.

---

## The funnel

```
RAW                                    486 findings   466 phrases
├─ TIER 1, German form-variant         407            395
├─ TIER 1, direction-void               60             60
│     ── dead at tier 1: 467/486 = 96.1%
└─ SURVIVED to adjudication             19             14
     ├─ DISMISSED on adjudication        5              5
     ├─ TIER 2 (mild)                    1              1
     └─ TIER 3 (serious)                13              8
```

Re-derived live from `course_legos` + `course_practice_phrases` at 12:45 UTC, not from the A135
snapshot. The live count matched the report's 486 exactly.

---

## Tier 1 — the criteria, stated

A finding is tier 1 where the German token is **another form of a lexeme taught at or before that
seed** *and* the English answer is fully taught. The German machines that produce these, all
verified against the real inventory:

- **verb agreement and ablaut** — `spreche←sprechen` (32 hits), `wusste←wissen`, `waren/warst/wärst←bin`
- **separable prefix + the zu-infix** — `anzufangen←anfangen` (18 hits), `aufzupassen←aufpassen`, `fernzusehen←fernsehen`
- **participles** — `gefragt←fragen`, `gegeben←geben`, `verstanden←verstehen`
- **adjective and determiner declension** — `wichtiges/wichtiger/wichtige/wichtigem/wichtigen←wichtig`
- **noun plural and case** — `leuten←leute`, `wörtern←wort`, `gehirns←gehirn`
- **irregular comparison** — `besten←gut`

**Worked tier-1 example.** `haben` is flagged 11 times at S117–S129 as "not introduced until 143".
It is the bare infinitive of `haben`, and `habe` has been taught since **S37** — with `hat`, `hast`,
`hatte`, `hattest` all in the inventory before S117. The learner meets an infinitive of a verb they
have conjugated for eighty seeds. They reach for it and are, exactly as Kai says, pleasantly
surprised.

### The hand audit found seven classifier errors — and it is not optional

String morphology makes semantic mistakes in German. Every one of these was caught by eye, none by
the code:

| token | classifier said | truth |
|---|---|---|
| `warte` (4) | ← `war` ("was") | **string coincidence.** Real licence: `warten` S82 — verdict survives |
| `ändere` (1) | ← `ander-` ("other") | **different lexeme.** Real licence: `ändern` S104 — verdict survives |
| `hören` (23) | ← `aufhören` ("stop") | **prefix-stripping across a meaning change.** Real licence: `hört` S71 ("hear the truth") — verdict survives |
| `meinst` (7) | ← `meine` | **right by luck** — `meine` is both "my" and "I mean"; the *verb* really is taught at S8 |
| `verstanden` (3) | *missed* | ablaut gap — `verstehen` S58. Tier 1 |
| `übst` (2) | *missed* | a length guard refused to strip `-en` from a 4-character stem — `üben` S5. Tier 1 |
| `nachdenkst` (2) | *missed* | `nachzudenken` S37. Tier 1 |

Four more were rescued the same way (`zustimmst`, `kennenlernen`, `zurechtkomme`, `fern`). Every
verdict survived correction, but four of them survived **for a different reason than the code
gave** — and a classifier that is right for the wrong reason will be wrong on the next course.

One incidental find worth an author's eye: **`kennenlernen` is taught as two words at S133
("kennen lernen") and used as one from S283.** Both spellings are defensible German; the course
should pick one.

---

## Tier 2 — one phrase

**`eng_for_deu:S0090L01U04`, S90**
DE `wenn du langsamer sprechen kannst, ist es nicht so schwer`
EN `if you can speak more slowly it's not so hard`

English **"hard"** debuts at **S106**. But by S90 the learner *does* have **"difficult"** (S66,
`es ist nicht schwierig`). So a reach exists — and it is the wrong word. They say "difficult",
they are answered "hard". This is Kai's tier 2 precisely: a distinct lexeme for a concept they
already hold under another word. Not frightening. Still wrong.

---

## Tier 3 — eight phrases, no reach available

Every debut seed below was re-derived by hand from `course_legos`, not taken from the matcher.

| seed | phrase | untaught English | debuts | gap |
|---|---|---|---|---|
| **S43** | `es tut mir leid, ich habe nicht darüber nachgedacht` → *I'm sorry, I wasn't thinking about it* | **sorry** | S139 | **96** |
| **S84** | `es tut mir leid, ich stimme nicht dem zu, was du gesagt hast` → *I'm sorry, I don't agree with what you said* | **sorry** | S139 | 55 |
| **S55** | `es ist schwer, fertig zu werden, wenn ich nicht gut geschlafen habe` → *it's hard to finish when I didn't sleep very well* | **hard** | S106 | 51 |
| **S27** | `ich mag es nicht, mit Leuten zu sprechen, die mich nicht verstehen` → *…people who don't understand me* | **understand** | S58 | 31 |
| **S38** | `ich lerne seit ungefähr einer Woche, und es macht Spaß` → *…and it is fun* | **fun** | S64 | 26 |
| **S47** | `ich denke, es ist wichtig, sich Zeit zu nehmen` → *I think it's important to take time* | **important** *and* **take** | S65 | 18 |
| **S43** | `ich habe angefangen zu verstehen, wie ich antworten soll` → *I started to understand how to answer* | **understand** | S58 | 15 |
| **S26** | `ich denke, sie ist fast bereit zu gehen` → *I think she is nearly ready to go* | **think** | S37 | 11 |

**Worked tier-3 example — the flagship.** At S43 the learner hears `es tut mir leid` and must say
**"I'm sorry"**. English "sorry" is not taught until **S139**, ninety-six seeds later. There is no
near-miss in the S1–S42 inventory — no "excuse me", no "apologise", nothing. The learner does not
reach for the closest thing they know, because there is no closest thing. They stop. And "I'm
sorry" is a phrase most learners want in their first hour, so the scare lands on something that
should have been easy. Even were the pairing perfectly correct German-to-English — and it is — the
scare alone makes it serious.

**A note on how two of these arose.** S38's untaught word "fun" debuts at S64 *via this very German
phrase* (`es macht Spaß` → `it is fun`), and S47's "important" and "take" both debut together at S65
in **the same phrase** the S47 prompt is using. These are not near-misses in ordering; they are a
later seed's teaching material used wholesale, early. That is a recognisable authoring shape and
worth looking for on the next course.

### Dismissed on adjudication — 5 findings

Confirming a finding is *not* actually fine is half the job, and five were not:

- **S46 "good"** (debuts S47, used S46) and **S47 "care"** (debuts S48, used S47) — a **one-seed**
  lead, inside authoring tolerance. German `gut` has been taught since S13. The `th` that also
  appeared in the automated output at S46 was a **stemmer artefact of "thing"**, not a word.
- **S207, S211, S263 — "knew"**. The English past of "know" is taught at **S105** (`kannte nicht` →
  `didn't know`) and again at S128 (`I used to know`). The exact string "knew" is never drilled, but
  the learner has held past-tense *know* for a hundred seeds. Tier 1: an uninstructed form of a word
  they have.

---

## What to do about the nine — two piles, two different authorities

### Pile A · PROPOSE a debut reorder — for Kai, not applied

Five of the nine phrases are fine sentences whose *curriculum order* is wrong. In each case the
missing word is a beginner essential used long before its debut, and moving one lego earlier
re-legalises the phrase without adding a word of content. **This is a course-structure change and
is listed, not applied.**

| move this lego | from | to at most | re-legalises |
|---|---|---|---|
| `es tut mir leid` → *I'm sorry* | S139 | **S43** | S43, S84 |
| `understand` (`…verstehst`) | S58 | **S27** | S27, S43 |
| `ich denke` → *I think* | S37 | **S26** | S26 |

Three lego moves, five phrases fixed, no new content. This is the cheapest honest route on the
page, and "I'm sorry" arriving at S139 in a course that wants it at S43 looks like a plain
sequencing oversight rather than a judgement anyone made.

### Pile B · EDIT the phrase — four rows, specified and verified, ready to apply

Three of the four replacements are built **entirely from the seed's own legos** — the phrase
becomes its seed's teaching point instead of borrowing a later one. Every replacement was checked
in code against the inventory as of its seed: all four are legal, and two earlier drafts of mine
**failed that check and were rejected** (one used a dative plural whose own debut is S88, one used
the contraction `can't`, untaught until S57).

| row | now | proposed |
|---|---|---|
| `S0038L03U06` | DE `…einer Woche, und es macht Spaß`<br>EN `…for about a week, and it is fun` | DE `ich lerne seit ungefähr einer Woche`<br>EN `I've been learning for about a week` |
| `S0047L02U06` | DE `ich denke, es ist wichtig, sich Zeit zu nehmen`<br>EN `I think it's important to take time` | DE `ich denke, dass es gut ist, Fehler zu machen`<br>EN `I think that it's a good thing to make mistakes` |
| `S0055L02U02` | DE `es ist schwer, fertig zu werden, wenn…`<br>EN `it's hard to finish when I didn't sleep very well` | DE `ich wache nicht gerne auf, wenn ich nicht gut geschlafen habe`<br>EN `I don't enjoy waking up when I didn't sleep very well` |
| `S0090L01U04` | DE `…ist es nicht so schwer`<br>EN `…it's not so hard` | DE `…ist es nicht so schwierig`<br>EN `…it's not so difficult` |

S38, S47 and S55 use only their own seed's legos. S90 is a one-word swap on both sides to the
synonym the learner already has, which also removes German `schwer` from the corpus entirely
before S106 — the only two occurrences are S55 and S90, and both are addressed here.

**Judgement call for Kai on S47:** the replacement is close in sentiment to S46's existing
`I don't worry about making mistakes`. It is lawful and it is the seed's own material, but whether
two adjacent seeds should both be about mistakes is an author's call, not a gate's. Flagging rather
than deciding.

---

## Held, and why — the honest gap

**Nothing has been applied.** At approximately **13:00 UTC** Supabase became unreachable from this
machine on **both** paths — the REST API (requests hang indefinitely, then return an HTML error
page) and the Postgres pooler (`aws-1-eu-west-1.pooler.supabase.com:5432` → `FATAL: Failed to
connect to database: {:error, :timeout}`). Retried at 13:04 and 13:09; still down. All the reads
this adjudication rests on completed at **12:45–12:55**, before the outage, and are captured
offline — so the analysis above is complete and live-derived. The *writes* are not possible.

Three things are therefore outstanding, and none of them is a judgement I am dodging:

1. **The four Pile B edits are specified to the row and verified, but not written.** They need the
   live DB, and they need item 2 first.
2. **The blast-radius briefing (#920) has not landed.** Before touching a released course I need its
   answer on one specific thing: a phrase text edit **re-resolves** its audio link silently via
   `audio_id_for_text()` rather than nulling it, which means an edit can leave the learner hearing
   **stale bytes under correct-looking metadata**. The lego trigger does the opposite and nulls its
   link. I will not edit these four rows until that trigger behaviour is confirmed against
   `supabase/schema.sql` and the lawful write path is named. No TTS will be run either way — the
   pass ends by *queueing* an audio pass.
3. **Two verification workers are outstanding** — #919 on the direction claim and #921 the
   adversarial refutation of all nine findings. The direction claim is load-bearing for the entire
   96.1% figure, which is why it went to someone other than me. If #919 refutes it, the tier-1
   count changes and this page needs revising; the nine tier-3 items would survive regardless,
   since they fail on both axes.

## The runbook

The per-course procedure is written up as
[`docs/course-optimization/known-side-ordering-runbook.md`](known-side-ordering-runbook.md), so the
remaining courses can queue behind this as background jobs. Its load-bearing steps: establish the
**direction** before anything else; re-derive live and page every query; build the tier-1 test as
code with stated criteria **and then hand-audit every pairing**; dismiss aggressively where honest;
get the survivors adversarially refuted; split fixes into propose-a-reorder and edit-the-phrase.

`eng_for_deu` is the **easiest** course in the queue. Read 96.1% as a floor on tractability, not a
typical case — Japanese and Chinese segmenter fragments, the Telugu zero-width-non-joiner artefact
that strands a bare case suffix, and Marathi's unreliable debut seeds are all still ahead, and the
German tier-1 test will not transfer to any of them.
