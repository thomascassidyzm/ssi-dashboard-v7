# eng_for_hin — the two-voice gender mechanism, applied

2026-09-03. Tom's ruling, verbatim: *"no rules, no explanations - they will work it out - when
it is ambiguous we can have woman saying her, man saying his - for sure"*.

Where the Hindi genuinely does not fix a third-person referent's gender, the English answer is
given by BOTH voices: **Olivia (target1, female, no text on screen) speaks the "her" reading;
Tom (target2, male, text on screen) speaks the "his" reading.** Nothing is explained anywhere —
no note, no footnote, no first-encounter message, no presentation clip. The scoping doc's
six-clip explanation schedule was dropped entirely on Tom's ruling and no version of it was built.

Scoping this repairs: <https://watson-1.tail4968cb.ts.net/d/14cfccdb>

## What the rule is

The Hindi FIXES the referent's gender when it is the subject of a gender-agreeing
verb/participle/adjective (चाहता/चाहती, सकता/सकती, रहा/रही, था/थी, गया/गई, होगा/होगी,
खड़ा/खड़ी, व्यस्त था/थी), or is named by a gendered noun (औरत, आदमी, छात्रा, सहेली, माँ,
भाई; मेरा दोस्त vs मेरी दोस्त), or is the antecedent of a reflexive अपना/अपनी/अपने whose
subject is itself fixed.

It does NOT fix gender for a bare possessive उसका/उसकी/उसके (which agrees with the possessed
noun, never the owner), for an oblique/dative/ergative उसे/उससे/उसने/उन्हें with no verb
agreeing with it (an ergative ने clause agrees with the OBJECT), for invariant predicates
(चाहिए, ज़रूरत है, पता है, ...ना/नी है, करना होगा, चिंतित, तैयार, बीमार, ख़ुश), or when the
only gender-marked verbs belong to the speaker (मुझे लगता है, मैंने सुना) or the addressee.

The trap that decides the hard rows: one sentence can carry a FIXED referent and an OPEN one at
once. Seed 53 — *वह उसकी चिट्ठी अपने बैग में रखना चाहती थी।* → "She wanted to put his letter in
her bag." चाहती थी fixes "She", अपने fixes "her bag", and उसकी चिट्ठी is open. Only "his letter"
varies between the two readings.

## The census — 1,979 rows read, one at a time

| layer | gendered rows | ambiguous |
|---|---|---|
| seeds | 132 | **48** |
| LEGOs | 129 | 39 |
| practice phrases | 1,718 | 561 |
| **total** | **1,979** | **649** (33%) |

Every row was read against its own Hindi. Three independent passes agreed on the seed layer:
the scoping doc's hand census, my own read, and a worker's — the same 48 seed numbers, seed for
seed. 33% ambiguous matches the doc's independent phrase-layer census (566 of 1,717).

Verdicts, row by row: `eng-for-hin-gender-variant-verdicts-2026-09-03.tsv`
(id, verdict, male reading, female reading, reason).

An independent verifier then attacked the set: 263 AMBIGUOUS rows re-read (60 random plus every
ambiguous row in the densest region, seeds 340-390), 60 DETERMINED rows re-read weighted toward
the risky markers, 40 rows checked for reading hygiene, plus a full-corpus sweep checking every
DETERMINED row's cited justification word against its own Hindi. It found **two** genuine errors
in 1,979 rows: `S0480L03U01` and `S0480L03U02`, whose reason cited कहता है from their sibling
rows when their own text has the invariant subjunctive कहे. Both are corrected to AMBIGUOUS here.
It also flagged `S0177L02U05` — whether उससे and वह corefer in "I'll ask him where she wants to
go" is a judgment call, so no pairing was written for that row.

## What was written

**587 pairs into `course_gender_expansions`** (applied log:
`eng-for-hin-gender-variant-pairs-applied-log-2026-09-03.json`) — `language='eng'`, `text_side='target'`,
`original_text` = the male reading, `expanded_m` = male, `expanded_f` = female. One row per
distinct male reading. These are also the EVIDENCE that licenses the ZUT collision at the
builder gate (commit `0903bc7bd`): a seed cannot claim two readings, the two rows that carry the
two voices must already exist.

These rows are a different axis from the 2,564 rows already in that table for this course. Those
are `text_side='known'`, `language='hin'`, and they vary the gender of the **speaker** in the
Hindi cue. Ours vary the gender of the **referent** in the English answer. `(language, text_side)`
tells them apart, and the licence loader is scoped to `text_side='target'` so the known-side rows
can never license anything. ⚠ `gender-prep-coordinator.cjs:403` deletes every row for a course
before writing — one run against eng_for_hin destroys both sets.

## What was NOT written, and why — 305 text flips held

305 ambiguous rows (23 seeds, 21 LEGOs, 261 phrases) currently store the FEMALE reading and
must become the male reading, because the male voice is the one whose text is on screen.
**They were not flipped.** Reason, measured not assumed:

- a text change fires `null_{seed,lego,phrase}_audio_on_text_change`, which relinks to a
  same-voice clip for the new text if one exists and otherwise NULLs the link;
- **271 of the 305 have live audio today, and only 16 would relink.** The rest would go silent;
- a cycle missing any of its three clips is dropped from the walk entirely, so those rows would
  not degrade — they would disappear;
- eng_for_hin is a released course with **201 learners**, and its voices are all xAI, whose
  retirement is currently blocking every render on it
  (`docs/audio-repair-2026-09-03/eng-for-hin-seeds-1-20-go-attempt-2026-09-03.md`). There is no
  route to re-render today, so the silence would be indefinite.

Make-before-break is standing doctrine here, and the 2026-08-03 fra_for_eng purge is the
precedent. The flips are listed in the dry-run log and run in one command the moment rendering
for this course is unblocked:

    node tools/course-optimization/apply-gender-variant-pairing.cjs eng_for_hin \
      docs/course-optimization/eng-for-hin-gender-variant-verdicts-2026-09-03.tsv --apply

The pairs are already written, so the second run flips text only. An audio pass is queued.

## Seeds 20 and 21 — the live contradiction

Both teach उसका नाम. Seed 20 stored "his name", seed 21 stored "her name", licensed by nothing,
and a learner met them as an inconsistency. Both are now classified ambiguous with the same pair
("his name" / "her name"), the pair is stored, and the builder accepts them as one licensed
LEGO. Seed 21's stored text is one of the 305 held flips: until it flips and its two clips are
re-rendered, the contradiction is licensed and recorded but still visible on screen.

## Parked for Tom — 11 rows with two independent open referents

The ruling pairs a row to ONE voice, so every open pronoun in a row takes that voice's gender.
Eleven rows carry two *different* open referents, where that produces "he said to him" /
"she said to her" and the stored text ("she said to him") is neither reading. The apply script
refuses them rather than guess. They are unchanged.

- seed 365 and its whole LEGO family (`S0365`, `S0365L02`, `S0365L02B01-B03`, `S0365L02U01-U05`) —
  *मैंने नहीं सुना कि उसने उससे क्या कहा* → "I didn't hear what she said to him."
- `S0355L03U05` — *क्या उसे उससे बात करनी थी?* → "did she need to talk to him?"

The question for Tom is one sentence: when a sentence has two open referents, do both take the
speaking voice's gender, or does the pairing simply not apply to that row?
