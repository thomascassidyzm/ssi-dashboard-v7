# The Korean course speaks Korean again — and the Japanese fix is not safe to ship yet

**17 August 2026 · plate A-135 · two defects, one fixed and live, one stopped at the gate**

---

## The counts, first

| | found | fixed & live | held |
|---|---|---|---|
| **Korean prompts showing English** (`eng_for_kor`) | 39 | **37 repaired + 2 deleted — all of them** | 0 |
| **Same defect, Japanese** (`eng_for_jpn`) | 4 | **2** | 2 |
| **Japanese grammar notes in the prompt** (7 courses) | 1,423 rows on 3 surfaces | **0** | all of it |
| New audio clips rendered, gated and live | | **37** | |
| Prompt slots left silent | | **0** | |
| Seeds unapproved for your re-approval | | **12** | |

> **Round 2 (after Kai's ship-if-likely-an-improvement ruling):** the 4 held Korean rows are now shipped too, checked against real Korean grammar sources under the web-search authorisation. `eng_for_kor` has **zero** rows showing English.

Nothing was deleted. Every old clip is still alive.

---

## Defect 2 — the Korean course was showing, and reading aloud, English

39 practice phrases in **English for Korean speakers** had an English sentence sitting where the
learner's Korean prompt belongs. That is the half that was reported. The half that wasn't:

**all 39 also had a Korean voice reading that English out loud.** Sun-Hi, the course's own Korean
voice, saying *"she only had to do the job but she didn't want to stay"* — as the prompt. And
`target1` then played the same sentence again, correctly, in English. So the exercise handed the
learner the answer before asking the question.

**That is fixed and live.** 33 rows now carry Korean text and a Korean clip of that Korean. Two
more were deleted rather than repaired (below). Four are held (below).

### The overwrite bug: there isn't one, and here is why that matters

The brief suspected an overwrite worth naming. It isn't one — **these rows were born English**,
and the evidence is a clean partition rather than a correlation:

- All 39 were created on **2026-05-14, between 21:15:10 and 21:16:02**. **Zero** other phrase rows
  in the course were created that day. "Created that day" and "English on the known side" are the
  same 39 rows.
- Their clean siblings in the same seeds date from the original build (2026-02-25) or a later,
  *clean* top-up (2026-06-16). The bad run is bracketed by two healthy ones.
- They fill the **missing** slots in their legos — S0280L03 had U03 and U07 and gained U04, U05,
  U06. That is the fingerprint of a "top this basket up to N practice phrases" pass: the generator
  produced English sentences and copied the English into the Korean side instead of translating.
- The clips were rendered by the same run 24 minutes later, faithfully, from text that was already
  wrong.

So there is nothing to restore, and no destructive edit path still running. **What I could not
establish:** *which* module did it. `changed_by_uid` is NULL across the whole estate and the audit
log only reaches back to 2026-07-03 — seven weeks after the event. A mass touch on 2026-06-02
looked suspicious and was checked: it hit 86% of the course uniformly, so it was a version bump,
not surgery. Anyone re-running a phrase top-up on a non-English-known course should assume this
reproduces until the generator is found.

**Why nothing caught it for three months:** `eng_for_kor` has no pair contract, so the known-side
gate skips the course entirely — and even if it ran, its tokenizer splits on `a`–`z`, so it reads
zero words of Korean. This is the same blindness A-135 documented for the Indic courses.

### The same defect exists in two more courses

- **`eng_for_jpn` — 4 rows**, identical shape, clips linked, learner-reaching. **2 are now fixed**
  (you added these to the pass); 2 are held.
- **`por_for_jpn` — 344 rows**, whole untranslated seeds with no clips linked. That is a build gap,
  not a repair, and is **report-only** as you ruled.

---

## Defect 1 — the Japanese courses print the author's grammar notes, and the voice reads them

Seven Japanese-known courses (not six) carry **1,193 rows** with a grammar-gloss parenthetical in
learner-facing text, plus **230 more** on the LEGO card tiles — a second surface the brief didn't
cover, and the one the 2026-08-11 fix proved learners actually read.

**It is not merely printed. It is spoken.** The clip for 「行く（不定詞）」 has 708 milliseconds of
actual speech on 不定詞. The learner hears *"iku — futeishi"* — "go, infinitive". 673 prompt clips
and 666 narration clips say it. Nothing ever suppressed it: the pipeline strips the brackets and
keeps the word.

It is also **visible without logging in** — six of the seven courses show it inside the free
preview's first 19 seeds.

### I stopped this one at the gate, and I think that is the right call

The adjudication itself is good work and its hardest part survived attack. Two thirds of these
parentheses are genuinely the author's notes. But a third are **load-bearing**: 「〜と思っています
（彼らは）」 → `acham que` is undetermined without the person marker, because Japanese doesn't say
who. And **169 rows are held up by nothing but their grammar label** — strip 「知っていた（過去）」→
`wusste` and 「知っていた（過去形）」→`kannte` together and one Japanese prompt has two German
answers. The adversarial pass rebuilt that collision analysis from scratch and confirmed it
completely: the plan manufactures **zero** new collisions.

**What it did not survive was the blast radius.** Three findings, all measured:

1. **242 currently-audible prompt slots would go silent.** The "424 free rebinds" figure — mine,
   and I'll own it — was measured on a naive strip-everything. The real plan is mostly *rewrites*,
   and a rewrite to a string no voice has ever spoken can never rebind to an existing clip. Actual
   plan: 440 edits, 130 rebinds, **310 silent**, 242 of them audible today. That is
   make-before-break violated across five live beta courses.

2. **329 narration pointers would be destroyed, not just made stale.** The LEGO trigger repoints
   the narration clip from the *target* text — and a narration clip's text is a whole Japanese
   sentence while the target text is a foreign word. Measured match rate across all seven courses:
   **zero**. So the pointer always resolves to NULL and the trigger can never put it back.

3. **There is a fourth learner surface nobody had counted** — the English-under-target gloss on the
   card. It holds **16,430** annotated segments, about ten times the volume of the surface being
   fixed, and applying the plan would leave **9,618** of them contradicting the prompt printed
   directly above them.

Plus 108 rows refuted on content grounds. The sharpest: 87 rewrites use a person marker the learner
hasn't been given yet — 「彼・彼女が」 appears in **no** prompt at **any** seed in the German and
Italian courses, a Portuguese house convention imported into courses that never used it. And since
these prompts are spoken, its `・` would be read aloud as two nouns in a list. We would have
replaced *"iku — futeishi"* with *"kare-kanojo-ga"*.

**Held for a Japanese author and a revised plan.** The census, the before-images and the
adjudication all stand and are committed; it is the *application* that isn't safe. Nothing was
applied, so nothing regressed.

---

## What was actually done to the live database

- **33 clips rendered** on the compressor-free chain in each course's own configured voice, each
  passing seven gates, each with two gated spare takes held in reserve.
- **Make-before-break by construction, not by promise**: each clip was uploaded to S3, verified
  alive there, and inserted into the database *before* any text moved — so when the text changed,
  the trigger found the new clip already waiting and bound it. Measured afterwards: **zero** rows
  in either course have a missing prompt clip. The slot was never silent for an instant.
- **Verified through the route the app really reads**: all 33 objects fetch from the live audio
  bucket, and the served bytes decode to the same length as what was rendered, 33 out of 33.
- **12 seeds unapproved** for you to re-approve. I checked rather than assumed that nothing else
  moved: 736 other seeds in these courses are unapproved and every one of them already was —
  exactly 12 approval flags changed.

### Two things nearly shipped as bad checks, and didn't

**The quality gates were validated against known-good clips before being trusted, and the first
version failed 88% of them.** The cause is worth knowing generally: **two incompatible
`word_boundaries` formats coexist in the estate.** One carries the spoken words; the other is bare
number pairs with no text at all — and 89% of this course's clips are the second kind. Any check
that reads words out of that column sees nothing on those clips and cannot tell you so.

**The duration model was wrong and the clips were right.** All 28 Korean renders came out flagged
while the Japanese ones landed dead centre. Twenty-eight clips don't go wrong together. The model
had been fitted across the whole clip library at a reassuring r²=0.956 — but 5,611 of 9,153 clips
are single words, so the line was fitted on short clips and under-predicted every sentence.
Refitted on the sentence-length band: the gate was **calibrated, not widened**. Widening it to make
28 clips pass would have blinded that check for every future clip.

---

## The edit-impact-check tool — first production use

It earned its place. It found the stale-narration problem on its own, predicted the free rebinds
correctly, and flagged a database constraint that would have rejected a naive insert.

It also returned **three false "Reconsider" verdicts**, all its own faults, all now fixed:

1. It counted the row you were editing as "another row with the same text" — because it compared a
   display label (`phrase eng_for_...`) against a row id. **Every** phrase edit hit this.
2. Its vocabulary check split text on spaces, so a Japanese prompt was one single token and could
   never match anything taught. Every Japanese and Chinese edit came back "the course teaches this
   at no point at all". This is the same fault A-135 fixed in the known-side gate — that fix is on
   its own branch and has not reached main, and this tool held a second, independent copy of it.
3. **The worst one only bites in batch mode, which is the mode real work uses.** Batched phrase
   edits ran with no seed number, silently disabling the taught-late check and the blast-radius
   check. Before the fix, my 33-row batch returned 33 phantom warnings and zero real findings;
   after it, zero phantoms and 33 real findings to judge.

---

## Explicit gaps

- **No Korean speaker exists on the estate.** The Korean is a best attempt, labelled: 25 high,
  8 medium. High means "conforms to the course's own controlled Korean", which I can check
  mechanically — **not** "a Korean speaker approved it", which I cannot.
- **No independent transcription of the new clips.** Whisper isn't installed on this machine. The
  evidence I do have is Azure's own word boundaries proving every character was voiced at render
  time, plus served-byte durations matching. I did not put an ASR second opinion on them.
- **Learner-route proof stops at seed 19.** The public preview caps there and everything repaired
  here sits deeper, behind a paid login I don't have. For those I verified the stored data and the
  serving code — the same honest limit the 2026-08-11 fix reported.
- **There is no written migration protocol for deleting a practice phrase.** The two deletions are
  safe *by circumstance* — this course has zero rows in every progress table and both enrolled
  learners are at zero — not because the mechanism is safe by design. Worth its own decision.

## Round 2 — the four held rows, checked against real Korean and shipped

You ruled: ship the weak ones if they're likely improvements on what's there, and use web search to
check them. Both changed the answer, in opposite directions.

**Two of the three refutations did not survive contact with the grammar.** `#891` held
`피곤하게 보이다` and `긴장하게 보이다` because the `-게` adverbial form appears nowhere else in the
course. That's a real controlled-language observation, but it isn't a Korean problem: the reference
grammars state outright that **`A-게 보이다` is interchangeable with `A-아/어 보이다` with no change of
meaning**. Both shipped as originally authored.

**The third refutation was right, and the search also found the fix neither the author nor the
refuter could name.** `어렵게 보이다` is used of *tasks* — "looks difficult to do". For a person's
character, Korean uses **`까다롭다`**. So `S0300L02U02` now reads
`그는 까다롭게 보이고 싶어하지 않는다고 생각해요`, parallel to the attested sibling in the same lego.
Cost, stated plainly: `까다롭` appears **nowhere** in this course, so this introduces a new word —
accepted under your ruling, because what sat there instead was an English sentence being read aloud
by a Korean voice.

**`S0290L01U05` shipped with two imperfections named rather than hidden.** `알아야 해요` debuts three
seeds later (S293) — an *ordering* issue on a word the course does teach, the cheap-fix class. And it
means "have to know" where the target says "find out"; the exact Korean for that is `알아내다`, which
appears nowhere in the course. The attested near-match beats both the unattested exact match and the
English that was there.

### Still for a future Korean speaker

Nine rows, all now live, none blocking:

1. **`S0300L02U02`** — `까다롭게` is a new word in this course; confirm it's the right register.
2. **`S0290L01U05`** — the have-to / find-out gloss split, and a 3-seed debut reorder.
3. **`S0280L03U05` / `U06`** — `일만 했어요` renders "only did the work"; the English says "only *had to* do the job". The obligation is not carried.
4–9. The remaining medium rows in `kor-final-plan.json` and `kor-round2-plan.json`.

---

*Detail, before-images and rollback data: `docs/a135-jpn-paren-kor-2026-08-17/` on branch
`fix/jpn-paren-kor-english-2026-08-17`.*
