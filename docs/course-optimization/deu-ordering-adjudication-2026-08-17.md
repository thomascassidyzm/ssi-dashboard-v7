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
     ├─ DISMISSED on adjudication        1              1
     ├─ TIER 2 (mild)                   11              8
     └─ TIER 3 (serious)                 7              5
```

Re-derived live from `course_legos` + `course_practice_phrases` at 12:45 UTC, not from the A135
snapshot. The live count matched the report's 486 exactly.

**These are the numbers after the adversarial pass (#921), and it moved them in both directions.**
My first cut read 9 confirmed defects with 5 dismissals; the refutation promoted four of those
dismissals and demoted three findings from tier 3 to tier 2, landing at **13 confirmed phrases —
5 serious, 8 mild**. Its verdict on my nine was that none was an outright error, two were
*understated*, and one sub-claim of mine was wrong. What it changed is set out under each tier.

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

## Tier 3 — five phrases, no reach available

Every debut seed below was re-derived by hand from `course_legos`, then re-derived *again*
independently by #921 against the live database. All five survived.

| seed | phrase | untaught English | debuts | gap |
|---|---|---|---|---|
| **S55** | `es ist schwer, fertig zu werden, wenn ich nicht gut geschlafen habe` → *it's hard to finish when I didn't sleep very well* | **hard** (predicative) | **never** | — |
| **S27** | `ich mag es nicht, mit Leuten zu sprechen, die mich nicht verstehen` → *…people who don't understand me* | **understand** | S58 | 31 |
| **S47** | `ich denke, es ist wichtig, sich Zeit zu nehmen` → *I think it's important to take time* | **important** | S65 | 18 |
| **S43** | `ich habe angefangen zu verstehen, wie ich antworten soll` → *I started to understand how to answer* | **understand** | S58 | 15 |
| **S26** | `ich denke, sie ist fast bereit zu gehen` → *I think she is nearly ready to go* | **think** | S37 | 11 |

**The worst one is worse than I wrote, and it is not an ordering fault at all.** At S55 the learner
must say **"it's hard"**. I reported this as "hard debuts S106". #921 checked what those legos
actually teach: **both** `hard` legos — S106 and S109 — are `work hard`, the manner **adverb**. The
**predicative** sense this phrase needs is *never taught in all 300 seeds*. So S106 names a repair
that does not exist, and no debut reorder can fix it. The `hart`/`hard` cognate is real but keyed to
a word this prompt does not use: the prompt says `schwer`. Every other item on this page is a word
that exists and arrives late. This one is a word that never arrives.

**Runner-up, and the cleanest pure gap: S47 "important."** #921 rates it the least refutable of the
set — no cognate, no loanword, and `importieren` is a false friend. My hedge that **take** was also
untaught is **refuted**: S27 teaches `taking too much time`, twenty seeds earlier. That was my prose
over-reaching, not my code — the tooling never flagged "take", and I should not have added it.

**A note on how two of these arose.** S47's "important" debuts at S65 *in the very phrase the S47
prompt is using*, and the same shape appears at S38/S64. These are not near-misses in ordering; they
are a later seed's teaching material used wholesale, early. Worth looking for on the next course.

---

## Tier 2 — eight phrases, a reach exists but it is the wrong one

Three of these were tier 3 in my first cut and were **demoted** by the adversarial pass; four were
**dismissals of mine that #921 promoted**. The demotions and the promotions are both worth reading,
because they turn on the same question: does a reach exist *from anywhere*, not just from the course?

**Demoted 3 → 2 — the loanword defence.** Duden lists **`sorry`** as a current German interjection
in daily colloquial use, and **`Fun`** as a German noun (*der Fun*). A learner who says "Sorry" in
German every day is not *frightened* by being asked for it in English, and Kai's tier 3 turns on the
scare. So these stay defects but stop being serious ones:

| seed | phrase | word | debuts | gap |
|---|---|---|---|---|
| **S43** | `es tut mir leid, ich habe nicht darüber nachgedacht` → *I'm sorry, I wasn't thinking about it* | **sorry** | S139 | **96** |
| **S84** | `es tut mir leid, ich stimme nicht dem zu, was du gesagt hast` → *I'm sorry, I don't agree with…* | **sorry** | S139 | 55 |
| **S38** | `ich lerne seit ungefähr einer Woche, und es macht Spaß` → *…and it is fun* | **fun** | S64 | 26 |

What the loanword supplies is the *word*, not the *frame*: German `Sorry` is bare, and the phrase
needs `I'm sorry, …`. The 96-seed gap at S43 is still the largest single item in the course, and
"I'm sorry" is still something a learner wants in their first hour — it is just no longer a freeze.

**S90 `hard` — tier 2 as originally ruled.** By S90 the learner has `difficult` (S66), so a reach
exists and it is the wrong word: they say "difficult", they are answered "hard". #921's finding that
predicative "hard" never arrives makes the proposed swap to "difficult" the **only** route rather
than one of two.

**Promoted from my dismissals — four phrases I got wrong.**

- **S47 `care`.** I dismissed this as symmetric with S46 `good`: a one-seed lead, inside tolerance.
  It is not symmetric. `good` is transparent from `gut`; `care` has **no cognate and no loanword
  status**, and the only earlier reach is S37 `carefully`, semantically unconnected to "care about".
  One seed of distance helps a learner at S48, not at S47. Real, shallow, cheap.
- **S207, S211, S263 `knew`.** I ruled that S105 `didn't know` had given the learner past-tense
  *know*. #921 checked the whole course: the string **`knew` appears in no lego's `target_text`
  anywhere in 300 seeds.** The KNOW family is taught fifteen times and **routes around the simple
  past every time** — S105 `didn't know`, S128 `used to know`, S152 `had known`. Worse, S105's
  glosses sit under `kannte` (*kennen*) while S207 and S211 prompt `wusste` (*wissen*). A German
  speaker asked for an affirmative past they have never met regularises it: **"knowed"**. That the
  course teaches this verb fifteen times and never once in the plain past is the interesting part.

### Dismissed on adjudication — 1 finding

- **S46 `good`** (debuts S47, used S46). Upheld by #921: `gut`→`good` is perfectly transparent and
  the gap is one seed. The `th` that also appeared in my automated output here was a **stemmer
  artefact of "thing"**, not a word.

---

## What to do about the thirteen — two piles, two different authorities

### Pile A · PROPOSE a debut reorder — with Kai, not applied

Six of the thirteen phrases are fine sentences whose *curriculum order* is wrong. In each case the
missing word is a beginner essential used before its debut, and moving one lego earlier re-legalises
the phrase without adding a word of content. **This is a course-structure change and is listed, not
applied.**

| move this lego | from | to at most | re-legalises |
|---|---|---|---|
| `es tut mir leid` → *I'm sorry* | S139 | **S43** | S43, S84 |
| `understand` (`…verstehst`) | S58 | **S27** | S27, S43 |
| `ich denke` → *I think* | S37 | **S26** | S26 |
| `es ist mir egal` → *I don't care about* | S48 | **S47** | S47 |

Four lego moves, six phrases fixed, no new content. This is the cheapest honest route on the page,
and "I'm sorry" arriving at S139 in a course that wants it at S43 looks like a plain sequencing
oversight rather than a judgement anyone made. The `care` move is a single seed and is as cheap as a
fix gets.

**A fifth Pile A item, and it is an addition rather than a move — `knew`.** S207, S211 and S263 all
require the English simple past of *know*, which the course never teaches once in 300 seeds despite
teaching the verb fifteen times. There is no lego to reorder, so the honest fix is to **introduce
`knew` before S207**. Whether a 300-seed English course should be teaching the plain past of its
most-drilled irregular verb at all is a curriculum question well past the scope of this
adjudication — flagging it, not answering it.

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

**The adversarial pass hardened two of these four from "a fix" into "the only fix."** Because
predicative `hard` is never taught anywhere in the course, S55 and S90 cannot be resolved by moving
a lego earlier — there is nothing to move. For those two, editing the phrase is the sole route, which
removes the main argument against Pile B on them.

**Judgement call for Kai on S47:** the replacement is close in sentiment to S46's existing
`I don't worry about making mistakes`. It is lawful and it is the seed's own material, but whether
two adjacent seeds should both be about mistakes is an author's call, not a gate's. Flagging rather
than deciding.

---

## Held, and why — the honest gap

**Nothing has been applied, and that is now a ruling rather than a recommendation.** At
approximately **13:00 UTC** Supabase also became unreachable from this machine on **both** paths —
the REST API (requests hang indefinitely, then return an HTML error page) and the Postgres pooler
(`aws-1-eu-west-1.pooler.supabase.com:5432` → `FATAL: Failed to connect to database: {:error,
:timeout}`). Retried at 13:04, 13:09 and 13:14; still down. All the reads this adjudication rests
on completed at **12:45–12:55**, before the outage, and are captured offline — so the analysis above
is complete and live-derived. The *writes* are not possible.

**The dispositions, as ruled 2026-08-17:**

- **Pile B (the four phrase edits) — HELD** until `feat/edit-impact-check-2026-08-17` merges. The
  pre-check tool and the same-voice migration that closes the silent-voice-swap hole both live on
  that branch, and editing a released course around a fix that is already written is the wrong
  trade. The merge ask is with Tom. **The apply happens in a fresh dispatch after the branch lands.**
- **Pile A (the three debut reorders) — WITH KAI.** A course-structure change; queued for his
  ruling. Not to be acted on here.
- **The S47 adjacent-sentiment judgement — WITH KAI**, alongside Pile A.

Three things are therefore outstanding, and none of them is a judgement I am dodging:

1. **The four Pile B edits are specified to the row and verified, but not written** — held per the
   ruling above, and they need item 2 to land first.
2. **The audio consequence is worse than I first wrote, and it has no safe tool on `main`.**
   #920 scouted it and I verified the trigger bodies myself in
   `database/migrations/20260806_audio_link_integrity.sql:113-165`. My earlier phrasing — that an
   edit could leave the learner hearing "stale bytes under correct-looking metadata" — **was
   wrong**, and in a way worth correcting: `null_phrase_audio_on_text_change` is a **BEFORE
   UPDATE** trigger that rewrites the audio column in the same statement, so there is no window in
   which new text sits over old audio. The two real outcomes are both sharper:

   - **Silent voice swap.** `audio_id_for_text()` matches on `course_code + role + s3_key IS NOT
     NULL + text_normalized` and **constrains no voice**. If the estate already owns a clip of the
     new German text in a *different* voice, the slot re-points at it immediately, with no NULL and
     no alarm.
   - **Immediate silence.** If no clip of the new text exists, the function returns NULL and the
     slot goes silent at once — not "silent until an audio pass runs".

   A `known_text` edit touches `known_audio_id` only; a `target_text` edit touches
   `target1_audio_id` and `target2_audio_id`. The phrase trigger deliberately leaves
   `presentation_audio_id` alone — the **lego** trigger does re-resolve it, so the two cards fail in
   opposite directions and neither can be reasoned about from the other.

   All four of my proposed edits change **both** sides, so all four are exposed to both outcomes.

   Two pieces of the safety kit exist but are **not on `main`** — they are committed and pushed on
   a colleague's in-flight branch, `feat/edit-impact-check-2026-08-17`: `tools/edit-impact-check.cjs`
   (read-only pre-check; reports the audio-link consequence per row before you commit to the SQL)
   and `database/migrations/20260817b_phrase_audio_link_integrity.sql`, whose commit message is
   *"phrases get the seed rule — no more silent voice swap"* — i.e. it closes the exact hazard above
   by adding an `audio_id_for_text_same_voice` rule, and ships with a ROLLBACK companion. **The
   right move is to let that branch land first rather than to edit these four rows around it.**
   That is a hand-off, not a blocker I own.

   One gap in this: `supabase/schema.sql`, which CLAUDE.md names as the schema source of truth,
   **does not exist in this checkout**, so the migrations pile was the only available evidence. The
   trigger bodies above are what the migrations *say*; I could not confirm against the live
   database what is actually installed, because of the outage. No TTS will be run either way — the
   pass ends by *queueing* an audio pass, and `queue-audio-pass.cjs` refuses human-voice courses,
   which is one more thing needing a live check on `eng_for_deu`.
3. **#921, the adversarial refutation, has landed and is folded in above** — every tier on this page
   is post-refutation. Its own write-up, with the Duden and false-friend sources, is at
   [`/d/e03724a8`](https://watson-1.tail4968cb.ts.net/d/e03724a8). It re-derived all nine teaching
   seeds against the live database rather than reasoning from my summary (it polled through the same
   outage to do so), confirmed every phrase is a real `phrase_role='use'` row at the stated seed,
   and found **no outright error** in my nine — but two understatements, one wrong sub-claim of mine
   (`take`), and four dismissals of mine that should not have been dismissed. Net effect: 9
   confirmed phrases became **13**, and the serious count fell from 8 to **5**.

   **#919, the direction claim, is still outstanding.** It confirmed the code-path half before the
   outage and is blocked on the database for the data half. It is load-bearing for the entire 96.1%
   figure, which is why it went to someone other than me. If it refutes the claim, the tier-1 split
   needs revising — but the five tier-3 items survive regardless, since they fail on both axes.

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
