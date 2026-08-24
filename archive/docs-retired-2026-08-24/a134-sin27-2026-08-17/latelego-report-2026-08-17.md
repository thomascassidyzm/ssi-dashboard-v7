# eng_for_sin — the late-taught-word coverage gap closed (A-134)

**Branch:** `fix/sin-late-lego-seeds-2026-08-17` (off `fix/sin-seed3-2026-08-17`, #850)
**Course:** `eng_for_sin` — known/prompt side **Sinhala**, target/answer side **English**.
**Corpus re-derived live 2026-08-17:** 668 seeds / 1,300 legos / 11,719 phrases (#850's denominators reproduce).

This closes the gap #850 found and could not reach: `හැබැයි` ("but") is used from seed 165 onward
but taught only at seed 469, and five of the seven early seed uses sat outside every worker's range.

---

## Headline

| | |
|---|---|
| Rows changed | **20** — 8 seed prompts + 12 practice phrases |
| Clips | **16** — 15 rendered (7 gates each), **1 reused** and verified on real S3 bytes |
| Known-side breaches on the edited rows | **26 before → 2 after**, both residuals declared in §5 |
| Independent refutation | **three passes, every one dispatched before anything went live** (#870, #872, #879) |
| Scope forced open by refutation | **twice** — the brief's 5 seeds became 18 rows, then 20 |

**The brief asked for five seeds. This delivers twenty rows**, because two refuters each
demonstrated that the smaller scope would have left the course in a worse or still-broken state.
The reasoning is in §3, and it is the most important thing in this document.

---

## 1. The gap, re-verified from the live database

`හැබැයි` ("but") is used in **10 seed prompts**; its only LEGO is at **seed 469**.

| seeds using `හැබැයි` | first LEGO |
|---|---|
| **165**, **178**, **246**, **426**, **431**, **456**, **464**, 469, 483, 503 | **469** (`S0469L02`) |

Seven uses precede the teach point. The brief assigned me five of them (246, 426, 431, 456, 464)
and said #851/#852 held 165 and 178. **Both of those workers have since landed their passes, and
165/178 still said `හැබැයි` in the live database** — the breach was missed there, not deferred.
Refuter #872 found the same thing independently and made it a blocker. **All seven are now fixed.**

All eight edited seeds' `known_text` were **byte-identical** to the strings quoted here and
**NFC-stable**; all `status='released'`.

### Two corrections to #850's framing, in opposite directions

- #850 wrote that `හැබැයි` "is not taught as a LEGO until seed 469". **Seed 469 is a fuller
  teaching event than that implies:** it carries both a bare component phrase `හැබැයි` → "but"
  (`L2p1`) *and* the lego `S0469L02` `හැබැයි ඒකෙන් ... කියලා නෙමේ` → "but that doesn't mean".
- Pulling the other way, and stronger for the repair: **`හැබැයි` is taught as bare "but" in no row
  anywhere before 469.** The course's *only* standalone teaching of "but" is `S0019L04` `ඒත්` →
  **"but"** at seed 19. So `ඒත්` is not merely *earlier* — it is the only word for the concept the
  learner has been given at these positions. #872 confirmed independently: exactly one row in the
  whole course contains `හැබැයි` in a lego, and it is seed 469's.

### The learners really were hearing it

Not inferred — measured. Every edited seed's linked clip had `text` **byte-identical** to the
defective `known_text`, with `word_boundaries` proving each token voiced. The defect was audible.

---

## 2. What changed

Full before/after for all 20 rows: `latelego-plan.cjs`, `latelego-apply-log2.json`.
`target_text` was **not touched on any row**.

### The eight seed prompts

| seed | before | after | change |
|---:|---|---|---|
| **165** | `හැබැයි ඒ ඇත්ත කියලා මට විශ්වාස නෑ.` | `ඒත් ඒ ඇත්ත …` | 1 token |
| **178** | `ඔයාව දකින්න ඕනේ වුණා, හැබැයි මම ළඟ ටයිම් නොතිබුණා.` | `ඔයාව දකින්න ඕනේ වුණත්, මට වෙලාවක් තිබුණේ නෑ` | **whole sentence — see §4** |
| **230** | `… කැමැති තරුණ කෙනෙකු …` | `… කැමති තරුණ කෙනෙකු …` | 1 token, spelling (§5) |
| **246** | `ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා, හැබැයි ඇය ගොඩක් බිස්ස.` | `… , ඒත් ඇය …` | 1 token |
| **426** | `ඒ අයට ඔකොව්කො ආදරේ කරන්නයි ඕනේ, හැබැයි ඒ අය දුකෙන් ඉන්නවා.` | `… , ඒත් ඒ අය …` | 1 token |
| **431** | `ඒ අය තාම සූදානම් නෑ, හැබැයි ඉක්මනින් සූදානම් වෙනවා.` | `… , ඒත් ඉක්මනින් …` | 1 token |
| **456** | `ඔහු ඒ තැනේ ඉන්නා, හැබැයි ගොඩ ඉඩ නෑ.` | `… , ඒත් ගොඩ ඉඩ නෑ.` | 1 token |
| **464** | `මම ඇයට එක සැරයක් මගේ කාමර අංකේ කිව්වා, හැබැයි ඇයට අමතකවෙලා.` | `… , ඒත් ඇයට …` | 1 token |

### The twelve drill phrases

Seed 246 ×5 (`L1p6`, `L1p12`, `L2p4`, `L2p6`, `L2p7`) and one each in seeds **247, 248, 257, 426,
431, 456, 464** — every row in the course using `හැබැයි` before its teach point. The 11 rows at or
after seed 469 were deliberately left alone: that is where the word is legitimately taught.

### Introduced-before-used gate — all 20 rows, phrases included

The original proposal gated only five seeds. `latelego-gate18.cjs` gates everything.

| | before | after |
|---|---:|---:|
| 7 `හැබැයි` seeds (165 counted at 1, 178 at 4) | 1 each, **4 for seed 178** | **0 each** |
| 12 `හැබැයි` phrases | 1 each (**2** for `s257L1p10`) | **0**, except `s257L1p10` → 1 |
| seed 230 | 2 | 1 |
| **total** | **26** | **2** |

**The repo's own known-side gate is INERT for Sinhala and was not relied on.**
`services/course-builder/lib/validation.cjs:818` splits on `[^a-z']` — every one of these strings
tokenizes to **0 tokens**, so its "no violations" verdict is meaningless. All three refuters
verified this by running the repo function itself. My substitute: NFC-normalise, split on
whitespace, strip edge punctuation, **keep ZWJ (U+200D — orthographic in Sinhala; stripping it
merges distinct words)**. #872 reimplemented it from scratch and reproduced every count.

### Is mid-sentence `ඒත්` real Sinhala, or a mechanical find-and-replace?

The one place this could fail on language rather than counts, so it was checked. `ඒත්` occurs in
**69 phrase rows, 56 of them mid-sentence** — exactly the `..., ඒත් ...` shape needed — and in four
seed prompts mid-sentence, two directly after a comma:

- s41 `හොඳයි, ඒත් වෙහෙස දැනෙන්න ගන්නවා.` → "I feel okay, but I'm starting to feel tired."
- s73 `ගොඩක් ස්තූතියි, ඒත් ඉගෙනගන්න ගොඩක් ඉතිරිව ඉන්නවා.` → "Thank you very much, but I've got more to learn."

So the construction is the course's own. `ඒත්` is also its dominant "but" (81:34). **Confidence on
the counts: HIGH. On grammaticality: MEDIUM** — see §7.

---

## 3. Why the scope opened twice — the refutation chain

Per Kai's standing rule every seed-text change went to an **independent sonnet refuter before
application**, defaulting to REFUTED. Unlike #850, which was blocked by the fan-out depth ceiling
and had to self-verify, **all three dispatches succeeded**. Two of the three ruled against me, and
both were right.

### #870 — DO-NOT-SHIP the 5-seed scope

It **confirmed** the live text quotes, LEGO debuts, breach arithmetic, gate inertness and
ZUT-safety, then blocked on coherence:

> Before the fix, seed 246 is *internally consistent* — prompt and drills agree on `හැබැයි`, even
> though that agreement is itself off the taught path. After the fix as scoped, seed 246 becomes
> *internally contradictory*: its own drill sequence teaches one word for "but" and its own
> headline prompt asserts a different one, in the same seed, moments apart.

It also caught that I had **undercounted my own declared gap**: 9 drill rows across all five seeds,
not "four", one a near-verbatim echo of seed 246's own text. Remedy: *bundle the phrase edits or
hold*. I bundled, and widened to all 12 pre-469 rows so `හැබැයි` no longer appears anywhere before
the seed that teaches it — removing the objection at its root rather than patching round it.

### #872 — DO-NOT-SHIP the 18-row scope

It **confirmed** the shared-clip mechanic, the seed-230 numbers at exact-token granularity, the
trigger analysis, ZUT, exposure, and that #870's self-contradiction was genuinely cured. Then it
blocked on completeness — **seeds 165 and 178**:

> Shipping 18 rows while knowingly leaving 165 and 178 uncorrected doesn't just under-deliver; it
> ships a *second* incomplete pass on the same named defect class, the exact failure mode the first
> proposal was refuted for, one level up.

Correct, and it is the finding I value most in this whole exercise. Extended to 20 rows.

### #872's three corrections, all accepted

1. **My blanket claim that no other class-A sibling has an earlier-taught equivalent was FALSE for
   `ලෙයිකයි` (seed 257)** — "like" is taught much earlier (`මට ආසයි` s11, `මට ආසා නෑ` s12,
   `මට කැමති නෑ` s27). My claim was wrong as written. **It still is not a same-pattern fix:**
   `මම ලෙයිකයි` → `මට ආසයි` changes subject case (nominative → dative), and `ලෙයිකයි` carries
   **197 phrase rows** against `ආසයි`'s 77 — it is the course's dominant "like" by volume and an
   English loanword whose register is a translation-choice question for a human. Not fixed.
2. **`s257L1p10` carries a second, same-class defect in the same sentence** (`ලෙයිකයි`@346). True.
   I edited that row for `හැබැයි` and left `ලෙයිකයි` — stated in §5 rather than passed over.
3. **Seed 426's English diverges between the seed and its paired phrase**, and since they share one
   clip, one clip sits under two official glosses. Ruling in §6.

### #870's seed-398 correction

`අපිේ` ("our children", seed 398) is orthographically anomalous and might be an earlier `අපේ`.
**Resolved: it carries two vowel signs on one consonant** — `අ ප [U+0DD2] [U+0DDA]` — which is not
valid Sinhala orthography, so it is a corrupt spelling, not a teaching event. Seed 271's breach
stands either way (271 < 398 < 454). #870's arithmetic also slipped: had 398 counted, the gap would
fall 183 → 127, not to 56. **New defect logged: `S0398`'s lego known_text is misspelt.**

---

## 4. Seed 178 — the one that is not a substitution

Seed 178 is the only row where I changed a whole sentence, and it deserves its own section because
it is the largest single judgement in this pass.

Its prompt was `ඔයාව දකින්න ඕනේ වුණා, හැබැයි මම ළඟ ටයිම් නොතිබුණා.` The gate scores it **4
breaches, not 1**: `හැබැයි`@469, `ළඟ`@358, `ටයිම්`@279 (an English loanword, "time"), and
`නොතිබුණා` — **taught nowhere in the course at all**.

Meanwhile seed 178's **own two legos** teach `මට වෙලාවක් තිබුණේ නෑ` → "I didn't have time" and
`ඔයාව දකින්න ඕනේ වුණත්` → "although I wanted to see you", and its **own USE phrase `L2p6`** is
exactly those two joined:

> `ඔයාව දකින්න ඕනේ වුණත්, මට වෙලාවක් තිබුණේ නෑ` → "I didn't have time although I wanted to see you"

I adopted that **byte-identically** — the method #850 used for seeds 207/261, which likewise stored
the phrase text without a trailing period. **4 breaches → 0.**

Note what this means: the concessive suffix `වුණත්` carries "although" by itself, so the repaired
sentence needs **no word for "but" at all**. `ඒත්` does not appear in seed 178.

**Why this is not overreach.** The seed was not merely using an untaught connective — it was using
an untaught *sentence*, three of whose four defects have nothing to do with `හැබැයි`. A one-token
substitution would have left seed 178 at 3 breaches and still contradicting its own legos. And the
replacement is not my composition: it is a row that already exists in the course, with its own
already-rendered clip.

**Word order is the course's own.** All **5** of seed 178's `L2` use phrases put the concessive
clause first, so the adopted order is attested, not invented. (My proposal to #879 said 7; **#879
refuted that count** — the other two rows are `build`, not `use`. The pattern holds 5/5; only my
number was wrong.) (My earlier draft said 7; #879 corrected it — the other two are `build` rows, not `use`.)

**The English is *not* byte-identical, and I will not repeat #850's overstatement.** Seed
`target_text` is `"I didn't have time, although I wanted to see you."`; `L2p6`'s is
`"I didn't have time although I wanted to see you"`. They differ by **a comma and a terminal
period**. Same sentence; not the same string. `target_text` was left untouched.

---

## 5. The two residual breaches — declared, not hidden

Neither is a `හැබැයි` breach. Both are pre-existing defects where the honest answer is "a
substitution may exist but I cannot show it is right."

**`s257L1p10` keeps `ලෙයිකයි`@346** — §3, correction 1. Fixing it means changing a construction and
contradicting 197 other rows.

**Seed 230 keeps `කෙනෙකු`@370.** Seed 230 goes from **2 breaches to 1, not to 0**, and I state that
rather than claim a clean sweep. `කෙනෙකු` appears in **10 seeds** course-wide and may be a genuine
case distinction from `කෙනෙක්` (debut seed 5, 21 phrase rows), not a variant — a Sinhala judgement
I am not equipped to make.

**What seed 230 *did* get, and why it is safe:** `කැමැති` occurs in **exactly one row in the entire
course** — this seed. 0 legos, 0 phrases. Seed 230's **own lego `S0230L01`** and **all 11 of its own
phrases** use `කැමති`, LEGO debut **seed 27**, **94 phrase drills**. The repair is byte-identical to
the seed's own lego. #872 re-verified every count at exact-token granularity, and noted a fair
caveat: `කැමති`'s debut at seed 27 is inside the negated collocation `කැමති නෑ` ("don't like"), not
the bare positive form seed 230 needs. **The bare positive form is taught by seed 230's own lego, at
seed 230** — so the learner does meet it, in the very seed that uses it.

---

## 6. Two rulings I made rather than deferred

**Seed 426's English divergence — disclose, do not touch.** The seed says "They **would like to**
love each other but they're unhappy."; its paired phrase says "they **want** to love each other but
they're unhappy". One Sinhala clip will sit under both. **The divergence is pre-existing** — the two
rows already share a clip today, modulo the trailing period, which is *why* they are forced onto one
clip after the fix. I did not change `target_text`, because (i) choosing English wording in a
released course is an editorial call, not a defect fix; (ii) editing `target_text` pulls
`target1`/`target2` audio into scope via the phrase trigger; and (iii) **the course is already
inconsistent about this gloss internally** — seed 426's own lego `S0426L02` glosses the Sinhala
`ඕනේ` as "they want" while its own component `L2p2` glosses the same word as "would like". Picking a
winner is a human's call. **Logged as a pre-existing ZUT violation awaiting a ruling.**

**Seed 246's word order — leave flagged.** Its `known_text` is object-first
(`ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා`) where its own `L1p7` is subject-first. Sinhala word order is
relatively free; calling this a defect would be my judgement, not a count. **LOW confidence either
way, not fixed.**

---

## 7. The sibling sweep — `හැබැයි` was not alone

Whole-course sweep (`latelego-sweep.cjs`), #850's method: for every whitespace token in any seed
`known_text`, compare **first seed use** against **LEGO debut** (earliest seed whose lego
`known_text` *or* components contain it, counted by exact token *and* by substring containment,
taking the earlier — deliberately generous, so a flag is not a tokenizer artefact).

**Calibration first.** The sweep reproduces the known `හැබැයි` result exactly — `teach@469`, early
uses `165,178,246,426,431,456,464`. That is what licenses the rest. (#872 re-ran it on a fresh pull
and got 1,106 tokens / 176 flagged against my 1,105 / 179 — drift from concurrent campaigns; **the
material number, 25 tokens with a real teach point and an early use in 201–668, reproduced
exactly**.)

1,105 seed tokens → 179 flagged → **25** with a real teach point and an early use in 201–668 →
**41 (token, seed) instances**, classified, because in an agglutinative language a raw flag is often
morphology:

| class | meaning | count |
|---|---|---:|
| **A — unambiguous** | no earlier-taught morphological relative, no earlier drill | **9** |
| **B — derivable** | an earlier-taught token shares a ≥4-char stem | **4** |
| **C — drill-exposed** | drilled in a practice phrase at an earlier seed | **28** |

### The nine class-A siblings

| seed | token | teach@ | gap | status |
|---:|---|---:|---:|---|
| **246** | `හැබැයි` | 469 | 223 | **FIXED** — with 6 more seeds and 12 phrases |
| **230** | `කැමැති` | never | — | **FIXED** — hapax vs its own lego (§5) |
| 243 | `ඒකෙන්` | 469 | 226 | not fixed — debuts in the same late lego as `හැබැයි`; no earlier equivalent |
| 275 | `ඉස්සර` | 480 | 205 | not fixed — **the seed's own lego says `වඩා දිගු` for "longer" while the seed and all 8 of its phrases say `ගොඩ ඉස්සර`: the LEGO is the outlier, so the fix direction is the lego** |
| 271 | `අපේ` | 454 | 183 | not fixed — no clean earlier "our" (§3) |
| 208 | `ඇහුවේ` | 365 | 157 | not fixed — and glossed "didn't hear" at 365 vs "ask" at 208 |
| 257 | `ලෙයිකයි` | 346 | 89 | not fixed — earlier equivalent exists but needs a construction change (§3) |
| 500 | `අතර` | 559 | 59 | not fixed — **the seed's own lego glosses "between the two girls" while omitting `අතර` entirely; again a lego defect** |
| 262 | `කවුද` | 283 | 21 | not fixed — #872 rules the "who"/"which" gloss difference benign, both person-interrogative frames |

**Confidence on the seven unfixed: MEDIUM that each is a real known-side breach** — counts are solid
and calibrated — **LOW on any specific repair, and I have proposed none.** Three (275, 500, and
arguably 208) look like **LEGO defects, not seed defects**: the seed agrees with its own drills and
the lego is the outlier. Repairing those means editing teaching material — a content-design
decision, and a human's.

Machine-readable: `latelego-sweep-all.json` (179 rows), `latelego-classified.json` (41 instances
with stem relatives and prior-drill seeds).

---

## 8. Audio — make-before-break, and the trap that nearly bit

### The structural fact no prior document recorded

**Seeds 426, 431, 456 and 464 each SHARE their known clip with their own culminating USE phrase.**
The phrase text is the seed text minus the trailing `.`; `normalize_text()` is
`rtrim(lower(trim(x)), '.?!¿¡。？！')`, so both collapse to one `text_normalized`, and
`unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)` dedups them
onto **one** `course_audio` row. Seed 178 joins the same pattern after its repair.

So 20 rows need **16** clips, not 20. Rendering one per row would have **violated the unique
index**; rendering 16 but linking only the seeds would have **stranded four drill phrases on stale
`හැබැයි` audio**. Found in preflight, confirmed by #872 and #879, and handled: one clip, two links.

### The trigger picture, read from `pg_trigger`/`pg_proc` rather than assumed

- **`course_seeds` has NO nulling trigger.** `pg_proc` holds only
  `null_lego_audio_on_text_change` and `null_phrase_audio_on_text_change`, on the other two tables.
  A seed text edit leaves `known_audio_id` on the **old clip still speaking `හැබැයි`** — silent
  divergence, no NULL, no alarm. #850's correction to the brief reproduces exactly. **The seed
  repoint had to be explicit, and is.**
- **`course_practice_phrases` DOES carry `trg_null_phrase_audio_on_text_change` — and it is
  misnamed: it does not null.** Read live, it *re-resolves*:
  `NEW.known_audio_id := audio_id_for_text(NEW.course_code, NEW.known_text, 'known')`, BEFORE
  UPDATE, and `audio_id_for_text` requires **`s3_key IS NOT NULL`**. #872's sharpest operational
  catch: if the new clip is not **uploaded** before the `known_text` UPDATE fires, the lookup finds
  nothing and the phrase is silently set to `known_audio_id = NULL` — a *silenced* row, worse than a
  stale one. The apply therefore uploads to S3 and inserts all rows **with `s3_key` populated,
  before any text UPDATE**, then re-reads all 20 rows in-transaction and rolls back on any mismatch
  rather than trusting its own assignment.
- **`audio_autolink` cannot over-reach.** It only fills links already NULL whose
  `normalize_text(known_text)` matches. Checked explicitly: **zero** rows anywhere in the course
  have a NULL known link matching any of the new normalized texts.

### Recipe and gates

Azure `si-LK-SameeraNeural` speed 1 read from `courses.voice_config` (not hardcoded),
compressor-free mastering chain (`d8ddb8e4` / `667a6e09`), `PHASE8_NO_LISTEN=1`. `gates.cjs` and
`rate-model.json` copied **unchanged** from #850 so numbers stay comparable — including its
disclosed deviations: gate 2 rate model refitted on this course's 13,301 clean known/sin clips
(`ms = 1398.0 + 45.58×chars`, sd 149.6), gate 4 restated as last-word-in-final-boundaries, gate 7
repurposed to full-text coverage. Gates 1, 3, 5, 6 unchanged in meaning.

**15 clips rendered, 15 passed all 7 gates, 0 failures, 30 spares.** *(Caveat carried from #850: the
TTS retry mechanism appends punctuation on later attempts, so spares 2–3 speak a `.`/`...` variant.
The **shipped** take is attempt 1 in every case, rendering the exact stored string — verified by
md5-matching every `ship/` file against its gated take.)*

**1 clip reused, not rendered** — seed 178's `c349d360…`, already owned by the phrase whose text the
seed adopts. Inserting a duplicate would violate the unique index. Verified rather than assumed:
pulled the **real S3 bytes** (39,168 B live) and ran all 7 gates → **PASS all 7**; `word_boundaries`
prove 9/9 tokens voiced; `duration_ms` 3240 vs ffprobe 3204 (inside gate 1's 60 ms tolerance).
*(Its `file_size_bytes` is NULL in the DB — a pre-existing metadata gap, measured from S3 instead.)*

**No old clip was deleted.** They are the only remaining evidence of what learners were hearing, and
deleting generated assets needs its own approval. Verified after the fact: **16/16 old clips still
present**, and **0 rows still pointing at one**.

### Applied, and verified as a learner receives it

All 20 rows were applied in **one transaction** — 15 clips uploaded and inserted (with `s3_key`
populated) *before* any text UPDATE, then all 20 rows re-read in-transaction with a rollback on any
mismatch. `latelego-apply-log2.json`, `latelego-postverify.cjs`.

| check | result |
|---|---|
| every row stores the new text | **20/20** |
| every row's linked clip's `text_normalized` matches its stored text | **20/20** |
| every word of every row present in the clip's `word_boundaries` | **20/20** (e.g. 11/11, 9/9, 8/8) |
| `හැබැයි` gone from the row | **20/20** |
| `හැබැයි` in *any* pre-469 seed / phrase / lego row | **0 / 0 / 0** — the word no longer appears anywhere before the seed that teaches it |
| rows at or after seed 469 (intentionally untouched) | 11 phrase rows |
| S3 objects alive | **16/16** |
| bytes in S3 md5-identical to the gated take | **15/15** rendered (the 16th was gated on its own live bytes) |
| `GET ssi-learning-app.vercel.app/api/audio/<id>` | **HTTP 200 `audio/mpeg`, 16/16** |
| bytes the learner is served == the gated take | **md5-identical, 15/15** |
| `courses.content_stamp` bumped (invalidates the cached script) | **yes** — `11:10:55Z → 11:49:49Z` |
| `target_text` unchanged | **true, all 20** |

`content_stamp` is what actually invalidates the learner's cached script, and it moved.

**A correction to my own verification, stated because it was briefly wrong:** the first
`postverify` run reported **15 byte mismatches**. That was a defect in my probe, not in the upload
— it shelled out to `aws s3 cp`, and **there is no `aws` CLI on this machine**, so it compared each
real clip against empty output (`d41d8cd98f00b204e9800998ecf8427e` is the md5 of the empty string).
Re-run through the S3 SDK, all 15 match. The script has been fixed and carries a comment so the
trap is not re-laid.

---

## 9. Migration and exposure

The standing content-change migration protocol **does not cover this change, by its own terms**:
`docs/pods/pod-migration-protocol.md` excludes non-pod content — "Seeds, LEGOs and practice phrases
have their own progress model and are out of scope here" — verified verbatim by #872. So
`pod-state-migrate.cjs` / `pod-switchover.cjs` are not applicable and were not run.

The principle was applied by hand, and the exposure it protects against was measured:

| measure | value |
|---|---|
| enrollments on `eng_for_sin` | **8** |
| `lego_progress` rows, whole course | **0** |
| `lego_progress` rows for the edited seeds | **0** |
| furthest learner | `highest_completed_seed=280`, last practised **2026-03-21** |

- **No slot moved.** Text and audio links only; no `lego_id` changed, no row inserted or deleted, no
  renumbering. `course_round_index` carries only `course_code, round_index, lego_id, seed_number,
  lego_index` — **no text and no audio** — so no `REFRESH` was needed (checked against the matview's
  actual columns, not assumed).
- **There is no per-lego progress to migrate** — zero rows, course-wide.
- The one lever that exists, `course_enrollments.highest_completed_seed`, is a **monotone scalar**.
  One dormant learner sits at 280, past seeds 165/178/230/246/247/248/257 and short of
  426/431/456/464. **Decision: do not roll back.** Rolling back to force a re-hear would violate the
  protocol's own "progress cannot go backwards" rule to recover a handful of sentences. The residual
  effect is a missed re-exposure, not a false credit, and strictly better than the status quo in
  which they heard the defect. Recorded rather than left implicit. As #872 notes, that learner will
  hear a different clip than they remember if they review — a minor UX discontinuity, stated.

**Rollback material:** `latelego-pre-state.json` and `latelego-plan-state.json` hold the exact prior
text, clip id and version for all 20 rows; `content_audit_log` additionally retains the whole OLD row
via `audit_content_change`. All old clips are intact. Reverting is a two-column UPDATE per row.

---

## 10. Confidence

| item | basis | confidence |
|---|---|---|
| The 20 rows breached introduced-before-used | counts against LEGO debut, reproduced by three independent passes | **HIGH** |
| `ඒත්` is the right replacement | the course's *only* taught "but" at these positions, 81:34 dominant | **HIGH** |
| `ඒත්` reads naturally in these 17 sentences | attested construction (56 phrase rows, 4 seeds) — but a language judgement | **MEDIUM** |
| Seed 178's rebuild from its own `L2p6` | byte-identical to an existing row, 4→0, word order attested 5/5 | **HIGH** |
| Seed 230 `කැමැති` → `කැමති` | hapax vs the seed's own lego, byte-identical, 94 drills | **HIGH** |
| The 7 unfixed class-A siblings are real breaches | calibrated counts | **MEDIUM** |
| Any specific repair for those 7 | none proposed | **LOW** |
| Seed 246's word order is acceptable as-is | free word order; my judgement, not a count | **LOW** — flagged, not fixed |

Per Kai's standing ruling I have parked nothing on "not a native speaker". The HIGH ratings rest on
**internal-consistency counts against the course's own drilled material**, not on my Sinhala. Where
genuine linguistic judgement was needed I said so and rated it down.

---

## 11. Explicit gaps

1. **Nobody in this chain is a Sinhala speaker** — me, #870, #872, #879, all said so rather than
   bluffing. Grammaticality of the `ඒත්` substitutions, of seed 178's adopted word order, of
   `කැමැති` vs `කැමති` as a real distinction, and of seed 246's word order are structurally attested
   but linguistically unverified. **This is the one gap a human could close cheaply, and it is the
   one worth closing.**
2. **The phrase corpus was never swept course-wide for this defect.** My sweep is seed-side only: it
   asks which *seed prompts* use a late-taught word. `හැබැයි` alone had 12 early phrase rows, so the
   phrase-side count is likely far larger than 41. **Unmeasured.** #872 declined to close it too.
3. **Seven class-A siblings named but unrepaired**, three looking like LEGO rather than seed defects
   (275, 500, 208). No repair proposed for any.
4. **Seed 426's English divergence is disclosed, not resolved** (§6) — it needs an editorial ruling.
5. **The within-seed presentation order was never traced in the player.** Flagged by #870 and #872:
   the drills-vs-prompt argument rests on `course_practice_phrases.position`, not a verified UI
   trace. It affects how bad the pre-fix incoherence was, not whether the fix is right.
6. **Two new defects found and not fixed:** `S0398`'s lego `අපිේ ළමාවිල` carries two vowel signs on
   one consonant (corrupt spelling in released teaching material); and seeds 275/500's legos
   contradict their own seeds and phrases.
7. **All 12 edited phrase rows carry `status='draft'`** while the seeds are `released`. Their clips
   are rendered, gated and live to learners on those phrases, so this is a metadata observation
   inherited from the course, not a defect introduced here — flagged, not resolved.
