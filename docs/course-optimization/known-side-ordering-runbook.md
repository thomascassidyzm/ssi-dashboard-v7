# Runbook — adjudicating known-side ordering findings, one course per job

**Written 2026-08-17 from the `eng_for_deu` pilot** (A135 sweep → 486 findings → 13 confirmed defects, 5 of them serious).
This is the per-course procedure the remaining courses queue behind. It is written so a background
worker can follow it without re-deriving the method, and so its output is comparable across courses.

The frame is Kai's (2026-08-17) and is not negotiable by the worker:

| tier | what it is | what to do |
|---|---|---|
| **1** | an uninstructed **FORM** of a word the learner knows — case, conjugation, contraction, gender, declension | tick off in bulk, state the criteria, report the fraction |
| **2** | a **DISTINCT lexeme** for a concept taught under a different word | fix — usually edit the phrase; re-legalises when any form of the missing lexeme is introduced |
| **3** | the learner has **no chance of guessing at all** — not even a closest-word reach | fix with priority |

And the test is always the same: **put yourself in the learner's shoes at that exact seed.**
What do they know? What would they reach for? Would they cope, or freeze?
**Confirm a finding is not actually fine before fixing it.**

---

## Step 0 — establish the DIRECTION before anything else

This is the step the pilot proved you cannot skip, and it changes the answer more than any other.

Read `courses.known_lang` and `courses.target_lang`. `known_text` is the **prompt**; `target_text`
is what the learner **produces**. Then ask which of the two is the learner's **native** language.

- **Known side = the learner's native language** (e.g. `eng_for_deu`: German speakers learning
  English). A native speaker is never puzzled by a word of their own language, so an
  un-introduced *known-side* word cannot by itself scare them. It harms them only where the
  **target-side** word it demands has not been taught yet. **The gate is measuring the wrong side.**
  Adjudicate on the target side and expect the great majority of findings to die.
- **Known side = a language the learner is also acquiring** (a few pairs do this): the gate is
  measuring the right side and the findings carry their face value.

Record the verdict in the report, with the file/line evidence for how the prompt reaches the
learner. Get it independently checked — the pilot dispatched a worker for exactly this, because
the whole adjudication rests on it.

## Step 1 — re-derive the findings from live data. Never trust the snapshot.

```bash
node tools/course-optimization/known-side-sweep.cjs <course_code>
```

Confirm the total matches the A135 report for that course. If it does not, say so and use the
live number — content moves.

The sweep prints only ~12 examples, so dump the full set. The pilot's dump/classify/ledger
scripts are the pattern (they are gitignored working files by design, `scripts/`):
`deu-dump.cjs` → `deu-tier1.cjs` → `deu-english-axis.cjs` → `deu-ledger.cjs`.
Rebuild them per course rather than generalising them prematurely — the morphology is
language-specific and a shared "lemmatiser" would be a lie.

**Page every query.** `course_legos` and `course_practice_phrases` both exceed 1,000 rows on a
real course and an unpaged Supabase query truncates silently. Filter phrases to
`phrase_role in (build, use, practice)` — component rows are never drilled by the learner and
including them inflated an earlier census by ~60%.

**Never regex over a serialised `components` blob.** `components` is an array of `{known, target}`
pairs, so a regex across the stringified JSON matches the literal **key name** `"known"` — which
reports the English word *know* as taught at seed 1 in 457 legos, and will silently exonerate every
finding that depends on it. Access the fields (`c.known`, `c.target`), and when you are checking
which side a word is taught on, match that side only. Found the hard way on the pilot's adversarial
pass.

**Mind which side your stemmer indexes.** The pilot's target-side index was built from lego
`target_text` only and not from component glosses, which biases towards *over*-reporting — a word
taught only in a component reads as untaught. That is the safe direction to be wrong in, but say so
rather than implying full coverage.

## Step 2 — bulk tier-1 pass, with STATED criteria

Build the tier-1 test as code, with criteria written down, and report the fraction that dies.
Two independent signals, both cheap:

**(A) Morphological relatedness on the known side.** For token T in a phrase at seed S: is any
*other form of the same lexeme* taught at or before S? Build the language's paradigms explicitly.
For German the tractable machines were: umlaut/ablaut families (`wissen/weiß/wusste`,
`sein/bin/war/wäre`), the `ge-…-t / ge-…-en` participle circumfix, separable prefix + **zu-infix**
(`anfangen → anzufangen`), adjective/determiner declension, and noun plural/case. Fold umlauts
and ß before comparing.

**(B) Target-side coverage.** Are all the content words the learner must *produce* taught at or
before S? Function words are method-supplied structure, not vocabulary — exclude them. Use light
stemming, and handle irregulars explicitly (English `knew←know`, `better←good`).

Tier 1 = both signals satisfied. In the pilot this killed **467 of 486 = 96.1%**.

### Then HAND-AUDIT the pairings. This is not optional.

String morphology makes semantic mistakes, and in the pilot **7 of the classifier's pairings were
wrong or missing** — every one found by eye, none by the code:

- `warte` paired to `war` ("was") — pure string coincidence; the real licence is `warten` (S82).
- `ändere` ("change") paired to `ander-` ("other") — different lexemes.
- `hören` ("hear") paired to `aufhören` ("stop") by prefix-stripping — different lexemes; the real
  licence was `hört` at S71, which happened to make the verdict right for the wrong reason.
- `meinst` paired via a homograph (`meine` = both "my" and "I mean") — right by luck.
- Four were **missed**, because of a length guard that refused to strip `-en` from a 4-character
  stem (`übst←üben`) and a gap in the ablaut table (`verstanden←verstehen`).

So: print every pairing with the reason, read them all, and correct them by hand in a file that
records the correction and its evidence. A classifier that is right for the wrong reason is a
classifier that will be wrong on the next course.

## Step 3 — learner's-shoes adjudication of the remainder

For each survivor, write out: the seed, the prompt, the answer, the missing word, and the seed
that word actually debuts. Then rule, in prose, why the learner can or cannot cope. Web search is
fair game for real usage and grammar evidence — the pilot's languages are well-resourced.

Dismiss aggressively where dismissal is honest. In the pilot 5 of 19 survivors were dismissed:
two were **one-seed** leads (inside authoring tolerance), three were an English irregular past
whose base had been taught a hundred seeds earlier.

**Then get the survivors adversarially refuted.** Dispatch a worker whose job is to *refute*, told
to default to refuted when uncertain, and to re-derive every debut seed itself. Ask it explicitly
to try the strongest available refutation — for a language pair with transparent cognates, "the
learner probably knows this word anyway" — and to grade that refutation honestly, because under
the SSi method "they'd know it from school" is weak.

**Ask it to adjudicate your DISMISSALS too, not just your findings.** On the pilot the refuter
promoted **four of five dismissals** and demoted three findings — it moved the numbers in both
directions, and the dismissals were where the adjudicator (me) had been sloppiest. Two lessons worth
carrying:

- **A one-seed gap is not automatically tolerable.** The pilot dismissed two one-seed items as
  symmetric. They were not: `gut`→`good` is transparent, so the gap is harmless, whereas `care` has
  no cognate and no loanword route, so one seed of distance still leaves the learner with nothing.
  Judge the *reach*, never the *distance*.
- **Check whether the target word is a loanword in the known language.** Duden listing `sorry` and
  `Fun` as German demoted three findings from serious to mild, because a learner who uses the word
  daily in their own language is not frightened by it. Note what the loanword does *not* supply —
  usually the frame or the syntax — and keep the finding at tier 2 rather than dropping it.
- **Check whether the "debut" you are citing teaches the sense the phrase needs.** The pilot's worst
  item was reported as "hard debuts S106"; both S106/S109 legos teach `work hard`, the manner adverb,
  and the predicative sense is never taught at all. A debut seed that names a repair which does not
  exist is worse than no debut seed, because it makes a reorder look like a fix.
- **A missing irregular form hides behind a well-taught lemma.** English `knew` appears nowhere in
  300 seeds although `know` is taught fifteen times — the family routed around the simple past every
  time. Enumerate the irregular forms the prompts actually demand and check each surface form, not
  the lemma.

## Step 4 — fix the confirmed tier-2/3, cheapest honest route each

Sort the confirmed defects into two piles, and note that they need **different authority**:

**Pile A — PROPOSE a debut reorder. Do NOT apply.** When the missing word is a *beginner
essential* used far before its debut, the phrase is right and the curriculum order is wrong. In
the pilot: `sorry` debuts S139 but is used at S43 and S84; `understand` debuts S58, used at S27 and
S43; `think` debuts S37, used at S26. Moving three legos earlier re-legalises five phrases and adds
no content. This is a **course-structure change** — list it for Kai and stop there.

**Pile B — EDIT the phrase.** When the debut order is defensible and the phrase simply reached too
early. Prefer the smallest honest change: trim the offending clause, or swap the concept for one
already taught. Two rules:
- **Never invent vocabulary to patch it.** Every word in the replacement must be introduced at or
  before that seed. Verify the replacement against the inventory, in code, before proposing it.
- **Replacement text is a craftsmanship call.** Propose it and flag it for an author's eye; do not
  treat "it passes the gate" as "it is good content".

Deletion is usually unlawful anyway: at the phrase-count ramp minimum a seed cannot lose a phrase,
so "remove or remap" resolves to **remap**.

## Step 5 — gates at apply

- **Ordered paging** on every read; explicit paths on every `git add` (never `-A`), because a
  sibling session's dirty hunks will otherwise ride along.
- **Impact-check** before any text edit, and re-verify audio links **after**. Know exactly what the
  trigger does before you touch a released course, because it is not what "invalidate the audio"
  would suggest. `null_phrase_audio_on_text_change` is a **BEFORE UPDATE** trigger that re-resolves
  via `audio_id_for_text()` in the same statement, so there is never new text over old audio. The
  two real outcomes are:
  - **silent voice swap** — `audio_id_for_text()` constrains `course_code + role + s3_key IS NOT
    NULL + text_normalized` and **not voice**, so if the estate owns a clip of the new text in
    another voice the slot re-points at it with no NULL and no alarm;
  - **immediate silence** — no clip of the new text means NULL, at once, not "until a pass runs".

  A `known_text` edit touches `known_audio_id`; a `target_text` edit touches `target1_audio_id` and
  `target2_audio_id`. The phrase trigger leaves `presentation_audio_id` alone; the **lego** trigger
  re-resolves it. Adjacent cards fail in opposite directions and neither can be reasoned about from
  the other — read both trigger bodies for the course you are touching.

  Check whether `tools/edit-impact-check.cjs` and the `audio_id_for_text_same_voice` migration
  (`20260817b_phrase_audio_link_integrity.sql`) have landed on `main` yet. As of 2026-08-17 they are
  committed and pushed on `feat/edit-impact-check-2026-08-17` but not merged; the migration exists
  specifically to close the silent-voice-swap hole above. **If they have landed, use them. If not,
  prefer waiting over editing around them.** Note also that `supabase/schema.sql` — named in
  CLAUDE.md as the schema source of truth — may be absent from your checkout, in which case the
  migrations pile is your only evidence and you should say so rather than implying you verified the
  live database.
- **Blast-radius duty** on any text change: pods, learner progress, and the materialised
  `course_round_index` view.
- **Never run TTS.** A content pass ends by **queueing** an audio pass:
  `node tools/course-optimization/queue-audio-pass.cjs <course> --reason "<pass>"`.
- **Pod content is never edited in place** — migrate learner progress under
  `docs/pods/pod-migration-protocol.md`. Progress is filed under a sentence's *slot*, not its text.
- **Adversarial verify** anything seed- or card-level before and after.

## Step 6 — report

Publish a mobile page (`/api/publish-doc`) carrying: the funnel (raw → tier-1 dead → adjudicated →
fixed/held), a worked example of each tier, the judgement items for Kai, and a landing line naming
branch / merge target / deployment. Quote sub-workers as `#N`.

---

## Per-course expectations, from the pilot

`eng_for_deu` is the **easiest** course in the queue: space-tokenised, trustworthy debut seeds,
hand-verified examples. Read its numbers as a floor on quality, not a typical case.

| what | pilot value | what to expect elsewhere |
|---|---|---|
| tier-1 kill rate | 96.1% | **lower** where the known side is agglutinative or CJK — the matcher's noise is higher but so is the hand-audit cost |
| findings surviving | 19 of 486 | scales with the target-side gap, not the raw count |
| moved by the adversarial pass | 4 dismissals promoted, 3 findings demoted | budget for this — it is not a rubber stamp |
| confirmed defects | 13 phrases (5 serious, 8 mild) | |

Three known traps, all recorded in the A135 report and all still live:

- **Japanese and Chinese**: a segmenter fragment can coincidentally match a later lego's fragment.
  The CJK share needs its own adjudication and the tier-1 test above will not transfer.
- **Telugu**: a zero-width non-joiner strands a bare case suffix as a token; `గా` debuts at S474,
  so early-seed occurrences read as a hard ordering defect that is purely an artefact.
- **Marathi**: the debut seeds come from `eng_for_mar`'s LEGO cards, which are on record as
  unreliable. The finding count is sound; the seed each word is credited to is the weakest input.

And one methodological trap worth its own line: **`ß` and `ss` do not unify**, and
`expandContractions()` is English and rewrites a German `geht's` to the English word `is`.
Neither fires on `eng_for_deu` (zero apostrophes in 5,880 prompts, no ss/ß doublets) but both are
live for any future `deu_ch`/`deu_at` course.
