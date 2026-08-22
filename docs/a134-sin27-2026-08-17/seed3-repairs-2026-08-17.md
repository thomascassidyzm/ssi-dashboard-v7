# eng_for_sin — the three seed repairs (A-134, step 2)

**Date:** 2026-08-17 · **Branch:** `fix/sin-seed3-2026-08-17` (off `fix/sin-27-seed-rebuild-2026-08-17`)
**Course:** `eng_for_sin` — known/prompt side **Sinhala**, target/answer side **English**.
**Applied:** all three. **Learners are hearing the result now** (verified end-to-end, see §6).

---

## Headline

| seed | verdict on the prior analyst's claim | applied? | audio |
|---|---|---|---|
| **181** | **CONFIRMED — with a correction to the replacement string** | yes | 1 clip newly rendered |
| **207** | **CONFIRMED — with a correction to one stated fact** | yes | existing clip reused (verified) |
| **261** | **CONFIRMED — with a correction to one stated fact** | yes | existing clip reused (verified) |

Three seed rows changed. One new clip rendered, two existing clips reused. **No clip was deleted.**
Every number below is re-derived from the live database, not taken from the prior document.

---

## 1. EXPLICIT GAP — the mandated independent verifier could not be spawned

My brief required me to dispatch a **sonnet verifier** to refute all three claims independently
before applying anything. **I could not.** The surface refused the dispatch:

```
FAN-OUT CEILING — depth. This worker would sit at depth 2 of fan-out tree
511af8e3-…, and this surface allows 2 level(s) of worker. Nothing was dispatched.
Do this piece yourself in-turn, or ask Tom to raise the ceiling for this sweep.
```

This is the **same ceiling that blocked the prior analyst** (their gap 4). Following the refusal's
own instruction I did the refutation myself, in-turn. **This is self-verification, and it is weaker
than what the brief asked for**: the three claims have now been checked twice, but by one agent
lineage, not two. A second pair of eyes remains genuinely absent. I have compensated where I can by
making every check a re-derivation from the live DB with raw counts, and by *changing* one of the
three proposals rather than ratifying it — but that is mitigation, not independence.

---

## 2. Adversarial re-verification, claim by claim

### String truth (all three)

Each seed's stored `known_text` is **byte-identical** to the string the prior analyst quoted, and
NFC-identical (NFC does not alter any of the three — no hidden normalisation trap). All three seeds
are `status='released'`.

### Seed 181 — the hapax claim reproduces exactly

Re-counted over the full corpus (**1,300 legos / 668 seeds / 11,719 phrases** — the prior analyst's
denominators reproduce). Counted two ways, because Sinhala has no ASCII word boundary: substring
containment (over-counts inflections) and exact whitespace-token match (under-counts). **They agree
exactly**, which is itself evidence:

| word | seeds | legos | phrases | (both methods identical) |
|---|---:|---:|---:|---|
| `ලෙකරට` | 1 | **0** | **0** | hapax — this seed only |
| `අරගෙන` | 1 | **0** | **0** | hapax — this seed only |
| `දොස්තර` ("doctor", taught) | 0 | 1 | **13** | |
| `එක්කගෙන` ("take", taught) | 0 | 1 | **9** | |

**CONFIRMED.** The seed uses two words the course never teaches, for two concepts it does.

### Seeds 207 and 261 — the defect is real, but one stated fact is FALSE

The prior analyst wrote that each replacement's authored English is **"verbatim identical"** to the
seed's own `target_text`. **It is not.** Re-derived:

| | phrase's authored English | seed's `target_text` | byte-identical? |
|---|---|---|---|
| 207 | `you've done what you needed to do` | `You've done what you needed to do.` | **NO** |
| 261 | `I think it might be something important` | `I think it might be something important.` | **NO** |

They differ by leading capital and terminal period. The *sentences* are the same; the claim as
written overstated the evidence. This is a **CONFIRMED-WITH-CORRECTION**, not a refutation — the
repair stands, the wording of its justification did not.

The replacement **known-side** strings, by contrast, *are* byte-identical to real rows:

- 207 → `course_practice_phrases` seed 207, `lego_index=2`, `position=8`, `phrase_role=use`
- 261 → `course_practice_phrases` seed 261, `lego_index=1`, `position=6`, `phrase_role=use`

(Both rows carry `status='draft'`, noted for the record; the seeds themselves are `released`.)

Both defects independently confirmed on the content: seed 207's `ඔයා කරන්නයි ඕනේ කළේ ඒ ඔයා කරලා`
deviates from the construction its **own 12 phrases** drill (`ඔයාට කරන්න ඕනේ වුණ දේ`) at four
separate points — case (`ඔයා`/`ඔයාට`), verb form (`කරන්නයි`/`කරන්න`), tense (`ඕනේ කළේ`/`ඕනේ වුණ`)
and head noun (`ඒ`/`දේ`). Seed 261 says `වෙන්නට ඕනේ` (obligation) where its own English says
"might be" and its own card teaches `වෙන්න පුළුවන්` (possibility). Confidence **HIGH** on both —
these are internal-consistency counts against the seed's own drilled material, not my Sinhala.

---

## 3. My correction to the seed 181 repair — `හැබැයි` → `ඒත්`

The proposed replacement kept `හැබැයි` for "but". **I changed it to `ඒත්`, and this is a real
improvement, not a stylistic preference.**

Introduced-before-used, under the strict reading — a word is *taught* when it appears in a LEGO's
`known_text` or a LEGO component, because a seed sentence is not a teaching event:

| candidate for "but" | LEGO debut | phrase drills | verdict at seed 181 |
|---|---:|---:|---|
| `හැබැයි` (proposed) | **seed 469** | 23 | **BREACH — 288 seeds early** |
| `ඒත්` (applied) | **seed 19** | 69 | taught, 162 seeds earlier |

`ඒත්` is also the course's dominant marker for "but" (81 co-occurrences against 34 across the 122
rows whose English contains "but"). The in-flight A-135 Sinhala adjudication independently reaches
the same finding — it flags `හැබැයි` used at seed 246 as a REAL known-side breach for exactly this
reason.

So the prior proposal would have **preserved a live known-side defect** while fixing the hapax one.
The applied string fixes both.

### Final introduced-before-used result (strict LEGO-debut gate)

| seed | applied string | breaches |
|---|---|---:|
| 181 | `ඒත් මට මගේ අම්මව දොස්තර ළඟට එක්කගෙන යන්න වෙනවා` | **0** |
| 207 | `ඔයාට කරන්න ඕනේ වුණ දේ ඔයා කරලා තියෙනවා` | **0** |
| 261 | `මම හිතනවා ඒක වැදගත් දෙයක් වෙන්න පුළුවන් කියලා` | **0** |

(As proposed, seed 181 scored **1** breach. `අම්මව`/`දොස්තර`/`ළඟට`/`එක්කගෙන` debut *at* seed 181 —
correct, that is the seed that introduces them.)

### The tokenizer — disclosed, as required

**The repo's own known-side gate is INERT for Sinhala and I did not rely on it.**
`services/course-builder/lib/validation.cjs:818` reads `split(/[^a-z']+/)` — ASCII-only. Run against
all three applied strings it returns **0 tokens** each, so its "no violations" verdict is
meaningless. Verified, not assumed.

I wrote my own Unicode-aware substitute: NFC-normalise, split on whitespace, strip leading/trailing
`. , ? ! " ' ‘ ’ “ ” ( ) ෴`, keep ZWJ (U+200D is orthographic in Sinhala — stripping it would merge
distinct words). I then **cross-checked it against the in-flight fix** on
`fix/known-side-tokenizer-unicode-2026-08-17`: on all three strings the two tokenizers agree
**token-for-token** (9/9, 8/8, 8/8).

### ZUT

Run over all seeds + legos + phrases. **0 hard collisions** on all three (no row carries an
identical known side bound to a different English). Two **consistent** matches — seeds 207 and 261
now share their known text with the practice phrase they came from, and that phrase carries the
*same* English. That is ZUT-conformant by construction, and reported here as a soft observation
rather than widened into a failure.

---

## 4. Blast radius, and a CORRECTION TO THE BRIEF about the trigger

My brief warned that "a trigger nulls or cross-voice-relinks course_audio the instant you patch
text — a text-only fix is NEVER text-only." I read the **live** `pg_trigger` before writing.
**That warning is true for `course_legos` and `course_practice_phrases`, and FALSE for
`course_seeds`.**

```
[course_seeds] course_seeds_audit            -> audit_content_change
[course_seeds] course_seeds_touch_content_stamp -> touch_course_content_stamp
[course_seeds] course_seeds_version_trigger  -> increment_version
```

`null_seed_audio_on_text_change` **does not exist** (confirmed against `pg_proc`). The nulling
triggers `trg_null_lego_audio_on_text_change` / `trg_null_phrase_audio_on_text_change` are attached
to the other two tables only.

**The consequence is the opposite hazard, and it is worse.** Editing a seed's `known_text` does not
null or relink `known_audio_id`; it leaves it pointing at the **old clip, which still speaks the old
corrupt Sinhala**. No NULL, no orphan, no alarm — a silent text/audio divergence where the learner
keeps hearing the defect. `audio_autolink` cannot save it either: that trigger only fills links that
are already NULL. **The repoint therefore had to be explicit, and was.**

Blast radius per seed, measured: exactly **one** clip each — the seed's own `known` clip. Nothing
else in the course embeds these strings (0 other seeds, 0 legos, 0 phrases, 0 presentation clips).
`target_text` was **not** touched, so `target1`/`target2` (the English answer clips) were never at
risk.

---

## 5. Migration record

**The standing content-change migration protocol does not cover this change, by its own terms.**
`docs/pods/pod-migration-protocol.md` §"What this protocol does not cover" states: *"Non-pod content.
Seeds, LEGOs and practice phrases have their own progress model and are out of scope here. The
principle transfers; the code does not."* It further excludes *"a course whose known side is not
English"* — and eng_for_sin's known side is Sinhala. So `pod-state-migrate.cjs` /
`pod-switchover.cjs` are not applicable tools here; I did not run them, and running them would have
been wrong.

I applied the **principle** by hand, and measured the exposure it exists to protect:

| measure | value |
|---|---|
| enrollments on `eng_for_sin` | **8** |
| `lego_progress` rows for the whole course | **0** |
| `lego_progress` rows for S0181L01/L02, S0207L01/L02, S0261L01 | **0** each |
| learners with any seed progress | **1** (`highest_completed_seed=280`, last practised **2026-03-21**) |

The harm the protocol prevents is crediting a learner for a sentence they never heard. Here:

- **No slot moved.** I changed three seed rows' text only. No `lego_id` changed, no row was inserted
  or deleted, no sequence was renumbered. `course_round_index` carries no seed text or audio
  (verified against the view definition), so no `REFRESH` was needed.
- **There are no per-seed or per-lego progress rows to migrate** — zero, course-wide.
- The single lever that exists, `course_enrollments.highest_completed_seed`, is a **monotone
  scalar**. The one affected learner sits at 280, past all three seeds. Rolling it back to 180 to
  force a re-hear would cost them 100 seeds of position to recover 3 sentences, and would violate
  the protocol's own rule 7 ("progress cannot go backwards").

**Decision: do not roll back progress.** Under rule 5 a changed sentence drops with no penalty; the
residual effect is that one dormant learner will not be re-served three corrected prompts they
already passed. That is a missed re-exposure, not a false credit, and it is strictly better than the
status quo, in which they *did* hear corrupt Sinhala. Recorded here rather than left implicit.

**Rollback material:** `seed3-pre-state.json` holds the exact prior text, clip id and version for all
three rows; `course_seeds_audit` (`audit_content_change`) additionally retains the whole OLD row
in `content_audit_log`. All three old clips are intact and unlinked — reverting is a two-column
UPDATE per seed.

---

## 6. Audio — make-before-break, seven gates, and live verification

Rendered on the **compressor-free chain** (667a6e09, already on the base branch), Azure
`si-LK-SameeraNeural` speed 1 read from `courses.voice_config` (not hardcoded), `PHASE8_NO_LISTEN=1`.

### The seven gates — adapted, and the deviations disclosed

`docs/a134-sin27-2026-08-17/gates-12.cjs` is tuned for **presentation** clips. These are bare
`known`-role **seed prompts**, so two gates do not transfer as written. My implementation is
`seed3-gates.cjs`; the changes:

- **Gate 2 (duration model) REFITTED.** The #823 model `3143 + 45.4×chars` carries a spoken preamble
  these clips have not got. Refitted on this course's **13,301** clean `known`/`sin`/SameeraNeural
  clips: **`ms = 1398.0 + 45.58×chars`, residual sd 149.6ms**. The slope agrees with #823 to 0.4%
  (same voice, same speed) while the intercept drops by exactly the preamble — which is what makes
  the refit credible rather than convenient. The three *pre-existing* clips score z = −0.23, −0.34,
  −0.90 against it.
- **Gate 4 (truncation) RESTATED.** A seed prompt has no `ඉතින්` terminator. Replaced with the
  equivalent test: the **last word of the text must appear in the final boundary tokens**.
- **Gate 7 REPURPOSED** from "example voiced" (no example exists) to **full-text coverage**: every
  word of the seed text present in the provider's token array.
- Gates 1 (decode/duration agreement), 3 (**headword voiced per the word_boundaries token array** —
  duration cannot do this job), 5 (**zero `ඒ ගෙ` filler pairs**) and 6 (end click, tail floor
  < −40 dB) are unchanged in meaning.

### Results

**9 renders, 9 passes, 0 failures.** 3 shipping takes + **6 spares** on disk.

| seed | ms | z | tail | tokens | all 7 gates |
|---|---:|---:|---:|---:|---|
| 181 | 3636 | +0.94 | −86.8 dB | 9 | PASS |
| 207 | 2916 | −1.43 | −86.8 dB | 8 | PASS |
| 261 | 3204 | −1.64 | −87.4 dB | 8 | PASS |

*Caveat on the spares:* the TTS regeneration-attempt mechanism appends punctuation on retries, so
spare takes 2 and 3 speak a `.` / `...` variant of the text. The **shipped** take is attempt 1 in
every case, rendering the exact stored string. Stated because a spare is only insurance if you know
what it contains.

### Two clips were reused, not rendered — and were held to the same bar

Seeds 207 and 261 **already owned a clip for the exact new text** (they are the `known` clips of the
very practice phrases the repair came from). Inserting duplicates would have violated
`unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)` — and
reusing them is the "play what we have" doctrine. I verified them rather than assuming:

- pulled the **real S3 bytes** and ran all 7 gates → **PASS all 7**, both.
- their stored `word_boundaries` prove every token was voiced (8/8 each, matching the text
  token-for-token).
- their ffprobe durations — **2916ms and 3204ms** — match my fresh renders of the same text
  **exactly**, independently confirming they are the same utterance.

So seed 181 got a new clip (`b278ab82…`, uploaded to `mastered/B278AB82-…mp3`); 207 and 261 were
repointed at verified existing clips. **All three old clips remain present and intact** — deleting
generated assets needs its own approval, and they are the only remaining evidence of what learners
were hearing.

### Live verification, as a learner receives it

Not just the DB row:

| check | result |
|---|---|
| `course_seeds.known_text` == linked clip's `text` | **true**, all three |
| every text word present in the clip's `word_boundaries` | **true**, all three |
| S3 object alive | 44,352 B / 35,712 B / 39,168 B |
| `GET ssi-learning-app.vercel.app/api/audio/<id>` | **HTTP 200 `audio/mpeg`**, all three |
| bytes served == bytes rendered | **md5 identical** (`b21e1825…`) for seed 181 |
| duration the learner actually receives | **3.636 s / 2.916 s / 3.204 s** — matches the gated takes |
| `courses.content_stamp` bumped (invalidates the cached script) | **yes**, `10:51:42Z → 10:57:42Z` |
| seed `version` bumped | 56→57, 29→30, 65→66 |
| `target_text` unchanged | **true**, all three |

`content_stamp` is what actually invalidates the learner's cached script, and it moved — fired by
`course_seeds_touch_content_stamp` on the update, so this did not depend on the audio insert.

---

## 7. Confidence

| seed | defect confirmed | repair grounded in course text | confidence |
|---|---|---|---|
| 181 | HIGH — a count (2 hapax vs 13/9 taught), not a judgement | splice: `ඒත්` (taught seed 19) + its own USE phrase, verbatim | **HIGH** |
| 207 | HIGH — 4 deviations from its own 12 drilled phrases | its own USE phrase, byte-identical | **HIGH** |
| 261 | HIGH — modality contradicts its own English and its own card | its own USE phrase, byte-identical | **HIGH** |

I am not a native Sinhala speaker, and per Kai's standing ruling I have not parked anything on that
basis. The confidence above rests on **internal-consistency counts against the course's own drilled
material** — which is why I rate it HIGH — not on my own Sinhala grammaticality judgement. The one
place I exercised genuine linguistic judgement is that `ඒත්` reads naturally in the seed-181 splice;
that specific point is **MEDIUM** confidence, and it is backed by `ඒත්` being the course's own
dominant "but" in 81 rows.

## 8. Residual gaps

1. **No independent verifier ran** (§1). Self-verification only. This is the significant one.
2. **The two reused clips' source phrases carry `status='draft'`** while the seeds are `released`.
   The clips are rendered, gated and already live to learners on those phrases, so this is a
   metadata observation, not a defect — flagged, not resolved.
3. `docs/audio-staleness-cache-layers-2026-08-11.md`, named in my brief, **does not exist** in this
   repo. I verified the cache-invalidation path against the live triggers and
   `courses.content_stamp` directly instead.
