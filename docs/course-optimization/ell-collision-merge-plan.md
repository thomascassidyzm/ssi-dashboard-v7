# ell_for_eng — ZUT collision resolution plan (2026-07-17)

13 English cues map to >1 Greek target. Analysed each with full seed/sister/phrase context.
Grouped by fix type. **Nothing applied yet — awaiting Kai's OK.**

Effect legend: *re-gloss* = known_text change → re-voice presentation clip only (target audio unchanged).
*align* = target change → re-voice target audio + re-decorate. *is_new flip* → needs one round-index view refresh (batch with the 78 already done).

---

## A. Person-ambiguity → re-gloss to name the person (matches the 104 "for you to wait" precedent)

Bare "to X" hides the Greek person; the component already carries it. Re-gloss the lego known; set the two distinct persons is_new=true (neither currently debuts).

1. **"to make"** — S0047L05 να κάν**εις** (you) → known **"for you to make"**; S0048L02 να κάν**ω** (I) → known **"for me to make"**. Both → is_new=true (distinct debuts).
2. **"to tell me"** — S0222L02 να μου π**ει** (he) → **"for him to tell me"** (is_new=true); S0238L02 να μου π**εις** (you) → **"for you to tell me"** (is_new=true); S0250L02 (same πεις, 0 ph) → **"for you to tell me"**, is_new=false reuse of S0238.
3. **"to speak"** — S0240L04 να μιλά**ει** (he, 0 ph, inert) → **"for him to speak"**. Low priority.

Confidence: high. Effect: known-text change on 6 legos → re-voice their intro clips; is_new flips on 4 → view-refresh.

## B. Polysemy with a clean English distinction → re-gloss the secondary sense

4. **"that"** — demonstrative vs relative. S0247L02 εκείνο → known **"that one"** (its own build is already "that one"→εκείνο); S0228L01 εκείνος (masc, 0 ph) → **"that one"**; **που keeps "that"** (relative default). *Clears the tagged clip S0247L02.*
5. **"what"** — interrogative vs relative. S0059L04 αυτό που (0 ph) → known **"the thing that"** (matches the existing S0057L05 "the thing that"→αυτό που); **τι keeps "what"**. *Clears the tagged clip S0194L01.*

Confidence: high. Effect: known-text change; clears both remaining tagged presentation clips.

## C. Synonym variants → align the reuse to the debut form

6. **"last night"** — debut S0234L03 = χτες βράδυ. Align S0278L04 **χτες το βράδυ → χτες βράδυ** (+ its 10 phrases; drop the article). Both valid Greek; pick the debut form for ZUT consistency.
7. **"you're doing"** — debut S0072L02 = τα πας. Align S0129L03 **τα πηγαίνεις → τα πας** (+ its 10 phrases; πας = the common contracted form of πηγαίνεις).

Confidence: high (editorial pick of the debut form). Effect: target change on 2 legos + ~20 phrases → re-voice target audio + re-decorate.

## D. Glued-να → re-decompose, then dedup

8. **"I can" / "you can"** — S0113L02 μπορ**ώ να** / S0136L02 μπορ**είς να** (+ S0119L01, S0161L01) wrongly glue the subjunctive να that belongs to the *following* verb ("I can leave" = μπορώ **να φύγω**, where να φύγω is its own chunk). Strip the να → μπορώ / μπορείς, which then **dedup to is_new=false** (they equal the debuts S0029L05 μπορώ / S0028L05 μπορείς). Requires re-tiling the affected phrases so να attaches to the following verb.

Confidence: high on the diagnosis; **moderate effort** (phrase re-tiling). Recommend doing this one carefully/separately.

## E. Grammatical variants (role/aspect-determined) → recommend ACCEPT (like the gender pairs the ZUT check ignores)

9. **"to say"** — λέω (imperfective/ongoing) vs πω (aorist/one-off). The μιλάω/μιλήσω aspect distinction RichardBuck described; English "to say" can't express it, and the surrounding verb determines the form. λέω is the seed-4 debut. **Accept** as an aspect pair; forcing a gloss ("to say once") would read unnaturally.
10. **"time"** — χρόνο (accusative/object) vs χρόνος (nominative/subject). Case is set by sentence role; χρόνος only surfaces as the subject "πολύς χρόνος" (which is already its own lego S0279L02 "much time"). **Accept** as a case variant (or optionally re-gloss S0279L03 → "much time" to match L02).
11. **"more"** — περισσότερο (sg/neuter) vs περισσότερα (pl). περισσότερα is S0075L02, **is_new=false with 0 phrases** — inert, never independently drilled. **Accept**/leave (optionally re-gloss → "more things").

## F. Judgment call — "when"

12. **"when"** — πότε (interrogative, "When did you start?") vs όταν (temporal conjunction, "When we learn…"). πότε debuts properly (S0079L01); **όταν never debuts** — it's is_new=false at S0058 (0 ph) and S0111 (8 ph). Unlike "that"/"what", **English has no clean single-word distinguisher**, and όταν is a **productive conjunction** (όταν + many verbs), so:
- Merging it into one fixed chunk (e.g. "when we learn" όταν μαθαίνουμε at S0111) would absorb the "we learn" lego and re-cut the 8-phrase basket, and fights its productivity.
- Every όταν phrase is a *statement* and every πότε phrase a *question*, so clause type already disambiguates in practice.

**Two viable routes — Kai to pick:**
- **(i) Accept** πότε/όταν as a grammatical clause-type pair (lowest risk; context always resolves it), and just make όταν's flag consistent (debut it is_new=true at S0111 while keeping "when" — a tolerated grammatical-split exception).
- **(ii) Merge** at S0058 (its first, 0-phrase appearance) → debut "when you understand" (όταν καταλαβαίνεις) with όταν as a component, keeping it productive; S0111 stays a legitimate reuse.

My lean: **(i) accept** — cleanest, and the question/statement structure genuinely disambiguates; (ii) if you want όταν to have an explicit debut.

---

## Kai decisions (2026-07-17)
- **F: Option 2** — merge όταν at S0058 → debut "when you understand" (όταν καταλαβαίνεις), όταν as component. (Frequency confirms: όταν 108 > πότε 42, so it deserves a real debut.)
- **E: don't accept — contextualise the rarer form.** Frequencies: to-say λέω 104/πω 65 (πω=39×"να πω"); time χρόνο 123/χρόνος 8 (7=πολύς χρόνος); more περισσότερο 82/περισσότερα 32. Keep the common form bare; show the rarer only in its context (time→χρόνος as "much time"; more→περισσότερα as plural; to-say→πω in "να πω" one-off).
- **D: approved** (strip glued να → dedup).

## Progress
- ✅ **A applied** (2026-07-17): 6 person re-glosses (known_text only; is_new left for the consistency pass).
- ✅ **B applied**: 3 polysemy re-glosses; **both remaining tagged clips cleared → 0 served clips tagged, all 551 clean.** εκείνο intro re-voiced; τι(what) relinked to shared clip.
- ✅ **C applied + fixed course-wide** (Kai caught: align ALL, not just under-lego): τα πας (23), χτες βράδυ (majority) unified across 20+ phrases.
- ✅ **Slashes** (Kai flag): 91 legos' `components` metadata cleaned → 0 slashes (gender by lego context, synonyms→primary, paren-notes stripped).
- ✅ **D applied** (Fable-specced): μπορώ να/μπορείς να → μπορώ/μπορείς (dedup); να re-homed onto S0136L03 "for you to ask her"→να τη ρωτήσεις, S0161L02 "for you to give me"→να μου δώσεις; 2 component deletes. Backup scripts/ell-D-backup.json.
- ✅ **E applied**: time (S0279L03 "much time"→πολύς χρόνος, del bare B01), more (S0075L02→"more things", reuse of existing S0073L05 debut), to-say (S0057L04 "for me to say"→να πω is_new=true, S0298L03→false, S0057L03 "how"→πώς). Backup ell-E-backup.json. **Tier-2 (inverted S0279L02 basket, 8 phrases) NOT done — recommended quality follow-up.**
- ✅ **F applied — MINIMAL not Option 2.** Fable found όταν ALREADY debuts (S0055L03 "at the time when"→όταν, 10-ph productive; also S0034L03). Option 2 would be a redundant 3rd presentation. So re-glossed S0058L03 + S0111L01 "when"→"at the time when" (reuses of S0055L03). Zero audio cost. **Option 2 (build "when you understand" debut at S0058) remains available if Kai wants the explicit teaching moment.**
- ✅ **AUDIO REGENERATED** (phase8 POST /generate/:cc missing-only, port 3465): 81 TTS + 70 links → **0 missing, course operational.**
- **Collisions 13→1**: only "that one" (εκείνο/εκείνος gender pair, acceptable, εκείνος 0-ph).

## Open follow-ups (not blocking)
- **⚠️ ONE round-index view-refresh** owed (Tom): the 78 dedups + is_new flips (S0057L04→true, S0298L03→false; D's S0136L03/S0161L02 already true).
- **E1 Tier-2**: fix the inverted S0279L02 "much time" basket (drills bare πολύς w/ degraded English) — 8-phrase rewrite, Fable spec in agent output.
- **4 bugs Fable found** (queue): S0140L01 "I can't see"→μπορώ να δω (polarity), S0148L02 "I couldn't"→μπορούσα να (polarity), el_for_eng:S0090L02B01 phrase "you can" under "you are able to" lego, S0034L03 known has literal "...".
- Component paren grammatical-notes without slashes ("(gerund)" etc.) — same leak class, offered as optional cleanup.
