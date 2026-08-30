# eng_for_sin seeds 101–200 — corruption scan and repair (A-134, step 3, slice 101–200)

**Date:** 2026-08-17 · **Branch:** `fix/sin-seeds-101-200-2026-08-17` (off `fix/sin-27-seed-rebuild-2026-08-17`)
**Course:** `eng_for_sin` — known/prompt side is **Sinhala**, target/answer side is **English**. Status `beta`, public.

---

## Headline

| | |
|---|---|
| Seeds examined | **100 of 100** (101–200 inclusive) |
| Rows repaired in the live DB | **86** — 10 seed rows, 2 lego cards, 74 practice phrases |
| Clips rendered and shipped | **78** rendered, 77 inserted + 1 relinked to an existing clean clip |
| Slots verified live, end to end | **83 of 86** |
| Deliberately held | **3 rows** (now silent) + **21 more** of the same family, + 2 single-row items |
| Learner progress migrated | **n/a — verified zero rows exist** (`seed_progress`=0, `lego_progress`=0 for this course) |

The prior analysis framed seeds 101–200 as "~23 seeds with an orphan word". That framing was
too narrow and, in six specific words, wrong. **The dominant defect in this range is not corrupt
seed rows — it is a corrupt layer in the practice phrases and LEGO cards**, concentrated here
almost to the exclusion of the rest of the course.

---

## What the scan found

Six signatures were run over all 100 seeds and their 165 cards and 1,840 practice phrases.
Two of them are new and are the ones that mattered.

### The concentration finding

| signature | course-wide rows | rows in 101–200 | share |
|---|---:|---:|---:|
| token-exact corrupt forms (`මමතා`, `මමා`, `ඔොළා*`, bare `ගෙ`, `ෙවෙනස`) | 76 | **73** | **96%** |
| encoding-invalid Sinhala (mechanical orthography gate) | 64 | **48** | 75% |
| non-Sinhala script inside Sinhala text | 3 | 1 | 33% |

**73 of the 76 corrupt-token rows in the entire 668-seed course sit in seeds 101–200.** This is
a far sharper localisation than the seed-level orphan test suggested, and it points at one bad
generation run rather than diffuse authoring quality.

### The two gates worth keeping

Both are **mechanical** — they need no Sinhala knowledge, so their hits are evidence, not opinion.

1. **Orthography gate.** A Sinhala dependent vowel sign (U+0DCA–U+0DDF) must follow a consonant.
   It cannot open a token and cannot sit on an *independent* vowel letter (U+0D85–U+0D96).
   Across 13,687 rows this flagged **10 distinct malformed word-forms** and nothing else.
2. **Script-purity gate.** Exactly **3 rows** course-wide carry non-Sinhala letters: `మమా`
   (Telugu, S151i1p10 — mine) and `ममा` (Devanagari, S233i1p7 and S241i1p5 — outside my range,
   reported not touched). All three are the same "mamaa" corruption rendered in the wrong script.

### The mechanism, named

`ෙවෙනස` is not random noise. `ෙ` (U+0DD9) is a **pre-base** vowel sign: it *renders* to the left
of its consonant but must be *stored* after it. Legacy non-Unicode Sinhala fonts stored it in
visual order. `ෙවෙනස` is a legacy→Unicode conversion artefact — an orphan U+0DD9 stranded ahead
of a correctly-encoded `වෙනස`. That also explains `ෙමෙක`, and the `ා`-suffixed `මමා`/`మమా` family.

---

## Adversarial verification — and what it killed

**EXPLICIT GAP: I could not dispatch the sonnet verifier my brief allocated me.** The surface
refused with `FAN-OUT CEILING — depth`: this session already sits at depth 2. The A-134 analyst
hit the same wall. I substituted two independent checks and disclose them plainly:

1. An independent **Sinhala linguistic adjudication** via the Claude CLI (`claude --print
   --model opus`, permitted by CLAUDE.md; not a dispatched worker), briefed to refute and to
   default to REFUTED when uncertain.
2. My own **re-derivation of every DB count** by a second method.

Neither is a second *agent* reviewing the live database, which is what the brief asked for. That
part is genuinely missing.

**The adjudication refuted 5 of my 8 proposed seed rewrites and corrected my diagnosis on six
words.** It was worth more than the repairs it approved:

| my claim | verdict |
|---|---|
| `මමතා` is a non-word | **REFUTED.** Real word — Sanskrit *mamatā*, "attachment"; also a common given name. The *repair* stands (a noun sits in a subject-pronoun slot) but the diagnosis was wrong. |
| `අරගෙන` is a non-word | **REFUTED.** Everyday spoken Sinhala, "having taken". The real fault is that `අරගෙන යනවා` takes objects; `එක්කගෙන යනවා` is correct for a person. |
| `හැරෙනවා` is a non-word | **REFUTED.** "Turns/revolves" — a sane metaphor for ideas in a head. Only `මාතෙ` is bad in seed 131. |
| `ළිහිල්` is a non-word | **REFUTED.** "Loose/relaxed". A poor translation, a real lexeme. |
| `දිකිනකොට` is corruption | **REFUTED.** One-vowel typo of the ordinary `දකිනකොට`. |
| `කියන්නද` is a defect | **REFUTED.** Standard interrogative. Seed 150's old text was grammatical, just imprecise. |

**The methodological lesson, which I had wrong:** *"0 legos, 0 phrases" is evidence of corpus
absence, not of corruption.* Four of the six words I flagged that way are real Sinhala. Any
future pass must separate those two claims. The prior analysis's ~18-broken-seeds figure rests
partly on the same conflation and should be re-read with that in mind.

The adjudicator's own replacements then had to be rejected in turn: they used `ඔලුවේ`, `එයා`,
`වෙලාවේ` — words this course never teaches. A **second constrained round**, given each seed's
allowed vocabulary, produced in-vocabulary sentences for all five.

---

## What was repaired

### Class 1 — mechanical normalisation (76 rows) · CONFIDENT

Every target form is attested in the course hundreds of times, and three have **minimal pairs**
— a clean twin row holding exactly the repaired sentence.

| corrupt | repair | rows | evidence |
|---|---|---:|---|
| `මමතා` | `මම` | 24 | `මම` in 2,818 rows; minimal pair S163i1p1 vs S1i1p1 |
| `මමා` | `මම` | 8 | A-134 already ruled it corrupt |
| `మమా` (Telugu) | `මම` | 1 | script-purity gate |
| `ඔොළා`/`ඔොළාව`/`ඔොළාගෙන්`/`ඔොගා` | `ඔයා`/… | 22 | encoding-invalid; **minimal pairs at S185 and S190** — the same sentence appears clean in the seed and corrupt in its own phrase |
| `ෙවෙනස` | `වෙනස` | 24 | encoding-invalid; legacy visual-order artefact |
| `ඔයා ගේ` | `ඔයාගේ` | 4 | genitive is written solid (caught by the adjudicator) |

### Class 2 — seed rewrites (7 seeds)

All in-vocabulary (verified by my own Unicode-aware gate, below) and grounded in each seed's own
cards and drilled phrases.

| seed | English | new Sinhala | confidence |
|---|---|---|---|
| 103 | We're not trying to hear many more words. | `අපි ගොඩාක් වැඩි වචන අහන්න හදන්නේ නෑ.` | MEDIUM-HIGH |
| 131 | There are too many ideas going around in my head. | `මගේ හිසේ ගොඩක් වැඩි අදහස් වටේට යනවා.` | HIGH |
| 144 | I woke earlier than I wanted to this morning. | `අද උදේ මට ඕනේ වුණාට වඩා ඉක්මනට මම අවදි වුණා.` | HIGH |
| 147 | She was very kind when she saw me feeling nervous. | `මම කලබල වෙලා ඉන්නවා දැක්කම ඇය ගොඩක් කරුණාවන්ත වුණා.` | HIGH |
| 148 | He wasn't very patient when I couldn't answer. | `මට පිළිතුරු දෙන්න බැරි වුණු වෙලාවේ ඔහු ගොඩක් ඉවසිලිවන්ත වුණේ නෑ.` | HIGH |
| 150 | Can you tell me what your name is? | `ඔයාගේ නම මොකක්ද කියලා මට කියන්න පුළුවන්ද?` | HIGH |
| 180 | I'd like to read my book for a while. | `මම ටිකක් වෙලා මගේ පොත කියවන්න කැමතියි.` | HIGH |

Seed 144's `ඇවිද්දා` was a genuine **meaning error** — it means "walked", never "woke". Seeds 147
and 148 were losing past tense and, in 148, the word "very"; both are restored.

**Seed 181 was dropped from my plan.** A concurrent session repaired it under me while I worked,
using `ඒත්` for "but" — taught at seed 19, where my `හැබැයි` is not taught until seed 469. Theirs
is strictly better on the controlled-language rail. I left it alone.

### The known-side gate

The builder's `tokenizeKnown` splits on an **ASCII-only** class, so it is **inert for Sinhala** —
a 0-violation result there means nothing. I wrote a **disclosed Unicode-aware substitute**
(tokens = maximal runs of U+0D80–U+0DFF plus ZWJ U+200D) and ran introduced-before-used against
every word of every replacement. **All 7 rewrites pass**; every word is taught at or before its
own seed.

---

## Audio

A text edit is never text-only. `trg_null_lego_audio_on_text_change` and
`trg_null_phrase_audio_on_text_change` fire BEFORE UPDATE on **either** text side.
`course_seeds` has **no such trigger** — verified empirically, and it is the more dangerous case.

| | |
|---|---:|
| lego slots nulled by the trigger | 2 |
| phrase slots nulled by the trigger | 71 |
| phrase slots silently **re-pointed** to another clip | 3 — **voice audited, all still `azure_si-LK-SameeraNeural`, no voice swap** |
| seed slots left **STALE** (no trigger; link survived, now pointing at the pre-edit audio) | **10 of 10** |

Total needing audio: **83 slots / 81 distinct texts**. One already had a clean clip (relinked, not
re-rendered); 80 were rendered.

**Render recipe:** Azure `si-LK-SameeraNeural`, speed read from `courses.voice_config` (never
hardcoded), mastered on the **compressor-free chain** (667a6e09), `PHASE8_NO_LISTEN=1`, up to 3
attempts, **every take kept as a spare**.

**Seven gates**, adapted from `gates-12.cjs` — which is tuned for *presentation* clips (template-
terminal `ඉතින්`, a presentation-length rate model) and does **not** transfer to known-side clips.
The duration model was **recalibrated on 1,700 healthy phrase-level `sin` clips of this course**
(intercept 1407 ms, slope 45.58 ms/char, sd 112).

1 decode + duration agreement · 2 duration z · **3 every word voiced, per the provider's
per-token array** · 4 not truncated · **5 no-filler regression — zero corrupt tokens voiced,
including `ඒ ගෙ` pairs** · 6 no end click (A-131 tail floor) · 7 text purity in.

**78 of 81 passed on the first attempt. The 3 failures were the gate working**: they are
bare-`ගෙ` placeholder rows whose text is still corrupt, and gates 5 and 7 correctly refused to
voice them.

**Make-before-break was held throughout:** render → gate → upload → `HeadObject` to prove the
object is alive → insert the row and repoint the link **in one transaction**. **No clip was
deleted.** The old rows are the only surviving evidence of what learners heard, and deletion
needs its own approval.

### Verified live, as a learner receives it

| check | result |
|---|---|
| slots checked | 86 |
| text clean of corrupt tokens | **83** (3 held, below) |
| has an audio link | **83** |
| clip text matches the row text | **83 / 83, zero mismatches** |
| clip object **alive in S3** (HEAD) | **83 / 83** |
| **word_boundaries prove no corrupt token was voiced** | **83 / 83** |

`courses.content_stamp` bumped to `2026-08-17T11:30:30Z` — fired by the `course_audio` inserts,
which is what actually invalidates the learner's cached script. A bare link UPDATE would not have.

---

## Held, and why — read this part

**1. The 24 bare-`ගෙ` placeholder rows (seeds 154, 155, 156, 158; 23 in my range, 1 at seed 60).**
`ගෙ` here is a null placeholder standing in for a whole missing chunk, and the surrounding word
order is scrambled too: `රෙස්ටෝරන්ට් ගෙ ඕනේද?` is glossed *"do you want to go to a restaurant?"*
These need **authoring**, not substitution, and I did not want to invent 24 sentences at low
confidence in one pass. Seed 156's own seed row (`ඔයාට අද රෑ රෙස්ටෝරන්ට් එකකට යන්න ඕනේද?`) is
clean and is the obvious grounding for that cluster.

> **A regression I caused, stated plainly:** three of these rows (S158i1p5, S158i1p8, S158i1p9)
> also contained `මමා`. Fixing that nulled their audio, and the gate then refused to re-render
> them because their text is still corrupt. **Those 3 practice phrases now have no known-side
> audio where before they had audio that spoke a placeholder aloud.** Silent rather than wrong,
> but it is a regression and it is mine. The other 21 are untouched and still voice the placeholder.

**2. `වෙනස` = "choice" (card S0116L02 + 23 phrases).** I fixed only the *encoding*. `වෙනස` means
"change/difference" and **cannot mean "choice"** — so after normalisation seed 116 reads *"That
isn't the best change I could make."* The correct word is `තේරීම`/`තීරණය`, neither taught. Filing
these 24 rows under "spelling normalisation" would understate the damage, so I am naming it
separately. The adjudicator also flags `කළ හැකි` as literary register in a colloquial course, and
`ඒ` where the English says "**This**".

**3. Card S0131L03 `එතැන` = "there".** English existential "there is/are" has **no** Unicode
exponent in Sinhala; `එතැන` means "in that place over there". The card and all its drilled
phrases are a calque. My seed-131 rewrite deliberately omits it, so that seed no longer tiles
that card. The card needs re-authoring.

**4. Two single rows.** S121i3p11 (`ෙමෙක` — the correct word is genuinely ambiguous between
`මේක` and `ඔයා`, and I had no grounding, so I did not guess) and S151i1p10's `දිකිනකොට` (a typo
of `දකිනකොට`, which has **zero** course attestation — repairing it would introduce an untaught form).

**5. Outside my range, found and not touched:** `මමා` at S216i1p4 and S226i1p7; `ममा` (Devanagari)
at S233i1p7 and S241i1p5; bare `ගෙ` at S60i1p9; `අපිේ` ×12 at seed 398; `ිකියලා` at S420i3p6;
`ෙ` at S61i3p5.

**6. A new controlled-language defect, found incidentally.** `හැබැයි` ("but") is not taught until
seed **469**, yet it is used in seed rows **165, 178 and 181**. Pre-existing, not introduced by me.

**7. 37 live presentation clips in this range still voice corrupt Sinhala** (`මමා` etc., seeds
105–117 and others) — 60 corrupt clips exist, 37 still referenced as `presentation_audio_id`.
These are the A-134 composer-filler class, a **different set** from the 27 that repair covered.
Repairing them needs the presentation composer (`recompose.cjs`), which the parallel A-134 line
already owns; I did not duplicate it and risk colliding.

---

## Reproducibility

Scripts under `scripts/s101/` (gitignored) in the worktree: `corpus.cjs` (dump, paged by seed
window — ordered full-table reads hit the 8 s statement timeout), `scan.cjs`, `adjudicate.cjs`,
`gold.cjs`, `spell.cjs`, `layerB.cjs`, `ortho.cjs`, `script.cjs`, `propose.cjs`, `finalplan.cjs`
(the Unicode-aware known-side gate), `apply.cjs`, `postcheck.cjs`, `renderlist.cjs`, `gates.cjs`,
`render.cjs`, `relink.cjs`, `verify-live.cjs`. Logs: `applied-log.json`, `ship-log.json`,
`relink-applied-log.json`, `verify-live.json`, `snapshot-before.json` / `snapshot-after.json`.
