# eng_for_sin — the five orphaned හැබැයි seeds, and the sibling sweep (A-134)

**STATUS AT TIME OF WRITING: STAGED, NOT APPLIED.** Nothing in the live database has been
touched by this piece of work. This document is the proposal that goes to the independent
refuter before anything is applied.

**Branch:** `fix/sin-late-lego-seeds-2026-08-17` (off `fix/sin-seed3-2026-08-17`, #850)
**Course:** `eng_for_sin` — known/prompt side **Sinhala**, target/answer side **English**.
**Corpus re-derived live 2026-08-17:** 668 seeds / 1,300 legos / 11,719 phrases (#850's denominators reproduce exactly).

---

## 1. The gap, re-verified from the live database

`හැබැයි` ("but") is used in **10 seed prompts** and gets its first LEGO at **seed 469**:

| seeds using `හැබැයි` | first LEGO |
|---|---|
| 165, 178, **246**, **426**, **431**, **456**, **464**, 469, 483, 503 | **469** (`S0469L02`) |

Seven uses precede the teach point. #851/#852 hold 165 and 178. **246, 426, 431, 456, 464 are
in no worker's range.** All five `known_text` values are **byte-identical** to the strings quoted
here and **NFC-stable**, all five seeds are `status='released'`.

### A correction to #850's framing, in both directions

- #850 wrote that `හැබැයි` is "not taught as a LEGO until seed 469, 288 seeds late". **The LEGO
  is real but the standalone gloss is later than #850 implied in one respect and earlier in
  another:** seed 469 carries BOTH a component phrase `හැබැයි` → "but" (`L2p1`) and the lego
  `S0469L02` `හැබැයි ඒකෙන් ... කියලා නෙමේ` → "but that doesn't mean". So 469 *is* a genuine
  teaching event for the bare word. The breach at 246–464 stands unchanged.
- **`හැබැයි` is never taught as bare "but" anywhere before 469, in any row.** The course's *only*
  standalone teaching of "but" is `S0019L04` `ඒත්` → **"but"**, at seed 19. This is stronger
  evidence for the substitution than #850 had: the replacement is not merely *earlier*, it is
  the course's only introduced word for the concept at these positions.

### What #850 did not see: the breach is also on the phrase side

`හැබැයි` appears in **23 practice phrases**, of which **12 sit before seed 469** (seeds 246, 247,
248, 257, 426, 431, 456, 464). So at seeds 426/431/456/464 the learner has met the word in
*drills* at 247/248/257 — earlier exposure, but exposure through rows that are themselves the
same breach, not through a teaching event.

**EXPLICIT GAP — declared, not fixed here.** Repairing the 12 early phrase rows is a real and
separate piece of work with a much larger blast radius: `course_practice_phrases` *does* carry
`trg_null_phrase_audio_on_text_change`, so each edit nulls its own clip and needs its own render.
It is outside this brief's five seeds and I have not done it. **Consequence to state plainly: after
this fix, seeds 246/426/431/456/464 will prompt with `ඒත්` while four of their own drill phrases
still say `හැබැයි` in the same slot.** That is a coherence cost, and it is the reason the refuter
is asked to rule on it in §4.

---

## 2. The proposed change — single-token substitution

Minimal edits. One token per seed. `target_text` untouched in all five.

| seed | before (live) | after (proposed) |
|---:|---|---|
| **246** | `ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා, හැබැයි ඇය ගොඩක් බිස්ස.` | `ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා, ඒත් ඇය ගොඩක් බිස්ස.` |
| **426** | `ඒ අයට ඔකොව්කො ආදරේ කරන්නයි ඕනේ, හැබැයි ඒ අය දුකෙන් ඉන්නවා.` | `ඒ අයට ඔකොව්කො ආදරේ කරන්නයි ඕනේ, ඒත් ඒ අය දුකෙන් ඉන්නවා.` |
| **431** | `ඒ අය තාම සූදානම් නෑ, හැබැයි ඉක්මනින් සූදානම් වෙනවා.` | `ඒ අය තාම සූදානම් නෑ, ඒත් ඉක්මනින් සූදානම් වෙනවා.` |
| **456** | `ඔහු ඒ තැනේ ඉන්නා, හැබැයි ගොඩ ඉඩ නෑ.` | `ඔහු ඒ තැනේ ඉන්නා, ඒත් ගොඩ ඉඩ නෑ.` |
| **464** | `මම ඇයට එක සැරයක් මගේ කාමර අංකේ කිව්වා, හැබැයි ඇයට අමතකවෙලා.` | `මම ඇයට එක සැරයක් මගේ කාමර අංකේ කිව්වා, ඒත් ඇයට අමතකවෙලා.` |

### Strict introduced-before-used gate (LEGO debut, Unicode-aware)

`docs/a134-sin27-2026-08-17/latelego-gate.cjs`. The repo's own known-side gate
(`services/course-builder/lib/validation.cjs:818`, `split(/[^a-z']+/)`) is **INERT for Sinhala** —
it tokenizes all ten of these strings to **0 tokens**, so its verdict is meaningless. I used the
same Unicode-aware substitute #850 disclosed (NFC, whitespace split, strip edge punctuation,
**keep ZWJ U+200D** — it is orthographic in Sinhala).

| seed | breaches BEFORE | breaches AFTER |
|---:|---:|---:|
| 246 | 1 (`හැබැයි`@469) | **0** |
| 426 | 1 (`හැබැයි`@469) | **0** |
| 431 | 1 (`හැබැයි`@469) | **0** |
| 456 | 1 (`හැබැයි`@469) | **0** |
| 464 | 1 (`හැබැයි`@469) | **0** |

### Is mid-sentence `ඒත්` attested in this course, or am I inventing a splice?

This is the one place the substitution could fail on natural Sinhala rather than on counts, so it
is checked rather than asserted. `ඒත්` appears in **69 practice phrases**, of which **56 are
mid-sentence** — exactly the `..., ඒත් ...` position these five seeds need — plus four seed prompts
(41, 64, 73, 112) use it mid-sentence, two of them after a comma:

- s41 `හොඳයි, ඒත් වෙහෙස දැනෙන්න ගන්නවා.` → "I feel okay, but I'm starting to feel tired."
- s73 `ගොඩක් ස්තූතියි, ඒත් ඉගෙනගන්න ගොඩක් ඉතිරිව ඉන්නවා.` → "Thank you very much, but I've got more to learn."

So the splice is the course's own attested construction, not my invention. `ඒත්` is also the
course's dominant "but" (#850's 81:34 count).

---

## 3. The sibling sweep — is `හැබැයි` the only one?

**No.** Whole-course sweep, same method as #850: for every whitespace token appearing in any seed
`known_text`, compare its **first seed use** against its **LEGO debut** (earliest seed whose lego
`known_text` *or* components contain it, counted both by exact token and by substring containment,
taking the *earlier* — deliberately generous, so a flag is not a tokenizer artefact).

**Calibration first, per the brief.** The sweep reproduces the known `හැබැයි` result exactly —
`teach@469`, early seed uses `165,178,246,426,431,456,464` — which is what licenses the rest.

1,105 distinct seed tokens. 179 flagged course-wide; **25** have a real (existing) teach point and
at least one early use in seeds 201–668. Those 25 give **41 (token, seed) breach instances**, which
I then classified — because in an agglutinative language a raw flag is often morphology, not a
defect:

| class | meaning | count |
|---|---|---:|
| **A — unambiguous** | no earlier-taught morphological relative, and no earlier practice-phrase exposure | **9** |
| **B — derivable** | an earlier-taught token shares a ≥4-char stem (suffixal inflection of taught material) | **4** |
| **C — phrase-exposed** | the word was drilled in a practice phrase at an *earlier* seed | **28** |

### Class A — the nine unambiguous siblings

| seed | token | teach@ | gap | note |
|---:|---|---:|---:|---|
| 243 | `ඒකෙන්` | 469 | 226 | debuts in the same late lego as `හැබැයි` |
| **246** | **`හැබැයි`** | **469** | **223** | **fixed here** |
| 275 | `ඉස්සර` | 480 | 205 | also used at 276, 277 (class C off 275) |
| 271 | `අපේ` | 454 | 183 | "our" |
| 208 | `ඇහුවේ` | 365 | 157 | |
| 257 | `ලෙයිකයි` | 346 | 89 | "like" — heavily drilled from 257 |
| 500 | `අතර` | 559 | 59 | |
| 262 | `කවුද` | 283 | 21 | "who" — also 263 (class C off 262) |
| 230 | `කැමැති` | 239 | 9 | |

**What I fix, and what I do not.** Only `හැබැයි` meets the bar this brief sets — "fix only the
unambiguous ones under the same pattern". The pattern requires **an earlier-taught word for the
same concept to substitute in**. `හැබැයි`→`ඒත්` has one, established by count. **The other eight do
not have an identified earlier-taught equivalent**, and inventing one would be my Sinhala rather
than the course's own material. Their true fix is more likely to be *moving the teach point
earlier* than swapping the word — a content-design decision, not a substitution.

**Confidence on the eight: MEDIUM that each is a real known-side breach** (the counts are solid and
the method is calibrated), **LOW on any specific repair**, and I have proposed none. Three of the
nine (`කවුද` gap 21, `කැමැති` gap 9, and `අතර` gap 59) are small enough that they may be
authoring drift rather than a learner-visible problem.

Full machine-readable output: `latelego-sweep-all.json` (179 rows), `latelego-classified.json`
(41 instances with stem relatives and prior-phrase seeds).

### An honest limit on the sweep

The sweep is **seed-side only** — it asks "which seed prompts use a word taught later". It does
**not** sweep the ~11,719 practice phrases for the same defect. Given that `හැබැයි` alone has 12
early phrase rows, the phrase-side count is likely much larger than 41. **Declared gap, not
measured.** Also, class C is a judgement: I treat an earlier *drill* as mitigating exposure, while
#850's strict reading counts only LEGO debut. Under #850's strict reading all 41 are breaches.

(The count in the paragraph above refers to `හැබැයි`'s 12 early phrase rows.)

---

## 4. What the refuter is asked to attack

1. That all five seeds' live `known_text` is as quoted and carries exactly one breach.
2. That `ඒත්` is taught at seed 19 and `හැබැයි` nowhere before 469.
3. **That the substitution is right at all**, given §1's coherence cost — four of these seeds'
   own drill phrases keep `හැබැයි`. Is a seed prompting `ඒත්` over drills saying `හැබැයි` better
   or worse for the learner than the status quo?
4. That mid-sentence `ඒත්` after a comma is natural Sinhala here, not a mechanical swap that
   breaks the sentence.
5. Seed 246 separately: its `known_text` word order (`ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා`) differs
   from its own USE phrase `L1p7` (`මම ඔයාව උදව් කරන්නයි ඇයට ඕනේ කළා`). I deliberately did **not**
   fold this into the fix — Sinhala word order is relatively free and this would be my judgement,
   not a count. Should it be repaired, or left flagged? (My position: left flagged, LOW confidence
   either way.)

---

## 5. Audio plan (not yet executed)

None of the five proposed strings exists anywhere in the course, so **no clip can be reused** —
five fresh renders, unlike #850's 3 (1 new + 2 reused).

`course_seeds` has **no** `null_seed_audio_on_text_change` trigger (#850 verified this against live
`pg_trigger`/`pg_proc`; I re-verify before applying). A text edit therefore leaves `known_audio_id`
pointing at the **old clip still speaking `හැබැයි`** — silently. The repoint must be explicit.

Plan: compressor-free chain (667a6e09, already on the base branch), Azure voice + speed read from
`courses.voice_config`, `PHASE8_NO_LISTEN=1`, seven gates per `seed3-gates.cjs` with #850's
disclosed deviations (gate 2 refitted rate model `ms = 1398.0 + 45.58×chars`, sd 149.6; gate 4
last-word-in-final-boundaries; gate 7 full-text coverage), 3 takes per seed → 5 shipped + 10
spares, then live verification by fetching bytes from the production learner endpoint and
md5-matching the gated take. **No old clip deleted.**

Current clips to be superseded (kept intact): 246 `5a61a893…`, 426 `4414a7a5…`, 431 `25496b24…`,
456 `cb93e237…`, 464 `9de7685e…`.
