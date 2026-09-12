# Parked-notes census — everything found, noted, and deliberately not fixed

**2026-09-03. Read-only census. No code, content or database changes made.**

## Headline

You remembered two: the English brackets, and the his/her gender work. There are two more you
already knew about (क्या→"did" at seed 355, and the six कल seeds). Beyond those four, this is
**not** "little or nothing" — the last week's intense QA campaigns on **eng_for_hin** and
**spa_for_eng** alone surfaced well over a hundred distinct items explicitly found and left
undone, and a fan-out sweep of 111 other published reports from the last 8 days turned up a long
tail across roughly 25 more courses. Most of it is small-per-item; a few items are large
(tens of thousands of rows).

Below: the four known items first (with fresh numbers), then the largest new items, then the
eng_for_hin and spa_for_eng backlogs condensed, then the long tail one line per course, then gaps.

---

## The four items you already knew, with current numbers

### 1. English brackets in narration — which courses, how many rows

**Not eng_for_hin.** The most recent census (job a108, 2026-08-18) found **6,804 raw
parenthetical-grammar annotations across 48 courses**, of which **4,706 are linked to a clip**
and **3,688 are confirmed spoken aloud** by whisper/word-boundary evidence. eng_for_hin does not
appear among the 48 affected courses in that census or in any later doc read.

Only 3 of the 48 are released: **ben_for_eng** (first tranche of 5 rows fixed and live, 2026-08-18),
**kor_for_eng** and **por_for_eng** (both still open — kor has 24 rows needing a Korean-particle
merge decision; por has 1 row where stripping leaves the prompt empty). The other 45 affected
courses are beta/draft, not reaching a paying learner today.

**Parked where:** `docs/a108/paren-annotations-2026-08-18.md`. Four explicit holds, all "your call
not mine": (1) ben S0297L3 — stripping collides with an existing "I don't know"; (2) por S0330 —
needs Portuguese eyes to re-text; (3) kor 24 particle rows — needs a Korean reviewer; (4) the
remaining 3,688 audible rows across 45 courses — "a per-course campaign... Go?"

**Fix size:** small per-row (delete/merge a bracket), but 45-course scope means real authoring
time; no audio nulling for a strip-only pass (the annotation's absence doesn't change the rest of
the sentence in most cases — not verified for all 3,688).

### 2. His/her gender work (eng_for_hin)

The mechanism to alternate voice-gender per prompt is **entirely unbuilt** — `phase8-audio-v13.cjs`
gates the substitution on the target language being grammatically gendered, and English isn't on
that list (confirmed against the live code, 2026-09-03, in the shared Popty room). A 3-line code
fix has been identified but not made.

Measured scope: **46 seeds** genuinely gender-ambiguous (not the "2" once assumed), of which **22**
have the learner-app UI showing the *opposite* gender's text to what the stored voice will speak —
three fix options listed, none chosen. A further **43 seeds** are permanently blocked on a ruling
about four sub-families (possessive, dative-subject, neutral-pronoun, object-agreement) where
Hindi genuinely cannot mark gender.

**Cannot render any of it anyway:** the course's whole voice config (known + target1 + target2 +
presentation) is on **xAI, retired for new renders** (403, non-retriable, since 2026-08-27).
Estimated ~34,024 clips needed for full playability, of which 5,584 are the gender work alone.
The course is `new_app_status: live` and reported "broadly silent from about seed 39 onward."

**Parked where:** `/d/aab243eb`, `/d/d455ce10`, `/d/66589a07`, Popty room 2026-09-03. Explicitly
Kai's call — voice recast to Azure is the blocking decision.

### 3. क्या→"did" at seed 355

Confirmed still real and still not free to fix (`/d/705d6018`, 2026-09-03): क्या is a question
particle, not "did," but it's the **only source of the tile "did"** in the whole course — retiring
it strands 5 phrases at seed 385 ("did you agree with her…" ×5). New content would need authoring.
No ZUT risk today (क्या appears bare exactly once). Kai's call.

### 4. Six bare कल LEGO prompts (seeds 30, 42, 155, 167, 192, 278)

Refined and measured 2026-09-03 (`/d/94ea3ff4`): the bare word कल is glossed "yesterday" in **111
phrases spanning seeds 30–464**, while seed 12 already teaches कल as "tomorrow" 18 seeds earlier.
Growing any of the six chunks to disambiguate strands **16–124 phrases each** and shifts round
numbers (a learner-progress migration). "The decision is Kai's." One of the six (S0012L03, seed 12)
was actually restored today as a *different* fix (कल→"tomorrow" component), unrelated to the
six-seed deferral, which still stands as-is.

---

## The largest new items (estate-wide or whole-course)

| # | Defect, plain English | Course(s) / measured scope | Parked where / stated reason | Fix size / audio |
|---|---|---|---|---|
| 5 | Tens of thousands of practice-phrase rows are just the LEGO's own text copied back — the learner never actually practises anything new. A code fix (2026-08-06) stops new ones; the old ones stand. | **67,374 estate-wide**, 114 courses. Worst: Hakka 2,256, Marathi 1,676, Korean(→Eng) 1,611, French 1,595, Portuguese 1,570, Italian 1,565, Spanish 1,247 | `docs/DECISIONS.md` 2026-08-06 + `docs/spa-bare-lego-repair-gate-and-sample-2026-08-26.md`: "a separate content call," "waits on a quality ruling" | Large — needs real phrases authored per row, then audio. A 35-row Spanish sample is staged (not live) at $0.01. |
| 6 | A word appears in the answer that the question never asked for, and the honest fix would mean rewriting the sentence (not just deleting the extra word) — so the tool refuses to touch it automatically. | **171 rows across 53 courses** (eng_for_hin: 2) | `docs/build-unbacked-2026-08-31/README.md`: "logged as AMBIGUOUS and left alone... any row whose honest repair was a rewrite... was left alone" | Small per-row, needs human judgment + new audio each time. |
| 7 | The word-by-word breakdown under a sentence no longer matches the sentence — it drifted after later edits. | **5,198 sentences across 60 of 91 courses** estate-wide (heaviest: Armenian 47.6%, Spanish 6.7%); spa_for_eng alone has 1,006 rows left after 47 were safely fixed | `/d/0ad59396`: "flagged here for a decision... only a detection check is proposed" | 586 of the Spanish rows need a full rebuild (risky, not attempted); fixing costs audio. |
| 8 | 158 pieces of live Italian audio use masculine word-endings, spoken by a course voice that's supposed to be female — the feminine version of the text has never even been written. | English-for-Italian, seeds 10–654 (virtually the whole course) | `/d/ac253d83` ("Main projects" scout) | Large — needs the feminine text authored from scratch across the whole course, then rendered. |
| 9 | A quarter of a live Irish course's phrases use English words the learner was never taught. | gle course: **26% of 5,975 phrases** (vs 0.4% in the newer Connemara course) | `/d/a1d41128` | Large, systemic; not a quick sweep. |
| 10 | Practice sentences exist for a taught word, but none of them actually contain that word. | **576 lessons estate-wide** (356 genuine, 220 near-miss/typo, e.g. Armenian 126); only 4 of ~119 courses fully read | `/d/6628b590`: "what to do about misspelled lesson words left as Kai's decision" | Medium; needs per-course reading, most courses not yet even read. |
| 11 | A build phrase is supposed to drill the new word its lesson just taught — many drill a different word instead. | **541 flagged rows / 225 LEGOs across 6 Japanese-prompt courses** (Spanish 209, Chinese 92, Italian 87, Portuguese 66, German 65, French 22); 120 individually hand-confirmed | `/d/bdb8f113`, `/d/5681805a`: "reported, not acted on... this is a list for you" | Medium-large; a checker exists but runs report-only, not as a gate. |
| 12 | Pure census: lessons whose practice phrases don't reliably teach what they claim to. | **839 defective lessons / 3,289 failing phrases across 40 courses** | `/d/5b1ccda0` | Unmeasured — census only, no fix attempted. |
| 13 | Cross-course grammar/case defects found while repairing a related "licensor" bug, explicitly left because they're a different job. | 19+ courses, itemized (Lithuanian genitive ~15–20 more phrases, Estonian partitive ~80% confidence, Russian чувствовать себя family ×8, Welsh 6 clips that can't be re-recorded, Connacht Irish over-lenition, 4 Serbian defects, Hungarian tag-leak) | `/d/4467db58`, `/d/938ac9b0`, `/d/c589bce1`: "a separate job... your call" | Small-medium each; several blocked on retired-provider audio (Welsh, French). |
| 14 | 27 Sinhala example sentences are simply missing — deliberately left blank rather than invented. | eng_for_sin, LEGO S0197 and others | `docs/course-methodology-canon.md` WC-1: "the known side is a controlled language, and guessing at it isn't mine to do. Flagged as Kai's call." Live-status note (2026-08-18, **not reverified since**): 2 rows still pointed at the old corrupt clips. | Needs a Sinhala speaker to write real examples; audio then follows normally. |
| 15 | चाहिए ("should"/"need to"/"supposed to"/"ought to") collapses five different English senses into one Hindi word; a specific fix was designed in detail across three jobs but never applied. | eng_for_hin, ~91 practice lines carry the collision; the "have to"/"need to" sibling issue spans ~40 seeds | `/d/5329c6c5`, `/d/8e3b3cf7`, `/d/f81e000b`: fix "would strand 11+ existing ladder rows and needs authoring outside the brief" | Medium; needs new contrast-sentence authored, would strand existing rows if done carelessly. |
| 16 | Four bare Hindi copula/auxiliary words are kept as stand-alone drilled cues (हो→"be", थी→"was", थे→"were", था→"was") — the gloss is literally true so it's not wrong, but it's the same *shape* as six sibling cues merged away today. | eng_for_hin, seeds 346/364/385/386 | `/d/705d6018`, 2026-09-03: "a taste call about what a cue may teach, not a correctness call... one word from him and it is a small job" | Tiny — 3 phrases would need re-tiling if removed. |
| 17 | The possessive उसका/उसकी ("his"/"her") is taught three contradictory ways in three different seeds with no resolving rule. | eng_for_hin, seeds 20 ("his"), 21 ("her"), 53 ("his"/could be "her") | `/d/a39e2edb`: "Kai has parked this" | Needs a ruling before any of the three can be called right or wrong. |

---

## eng_for_hin — the rest of the backlog (condensed)

This course had by far the most parked items of anything in the 111-doc sweep — it's under active,
intensive proofreading right now (Shuchita's review, several parallel worker passes this week).
Roughly 30 distinct items beyond the ones above, most already logged as "flagged, not fixed" in
their own reports:

- **985 stale practice phrases across 338 seeds** course-wide, left over after a hand-repair pass
  that only covered seeds 1–20; 129 hand-authored replacement texts still need a native-speaker
  pass. (`/d/722ae033`)
- **1,194 phrases fail the player's own tiling guard** as of yesterday's punctuation fix — a
  decomposition wasn't updated when "?" was added, so ~1 in 9 practice phrases render on a
  degraded fallback path, live. (`/d/182dd442`)
- **62 of 668 seeds never rebuilt** in this week's teaching-layer rebuild, including seeds 1–18 —
  the literal opening of the course; seed 2 has zero decomposition data at all. (`/d/182dd442`)
- **~1,700 practice lines + ~230 teaching chunks** flagged as stale against rewritten Hindi
  prompts from the proofreading pass — no tool exists to propagate the fix downward; "NOT
  STARTED." (`/d/2f036beb`, `/d/4bc3061d`)
- **91–139 Hindi prompts** where a rewrite now elicits different English than what's being taught
  ("fidelity drift") — 84 were applied 2026-09-02, more found since across several shard audits,
  not yet folded into any applied fix.
- **254 of 668 prompts never read/audited by anyone.**
- **412–415 of 668 prompt audio clips are silent** (38% coverage vs 94–100% on comparable
  courses) — can't be re-recorded, same retired-voice blocker as above.
- Two half-finished word swaps left mid-course ("important": 4 prompts/142 practice lines still
  old; "feel"/महसूस: 5 prompts/100 practice lines still old).
- **208 exact duplicate practice lines + 11 untransliterated Latin-letter leaks** — called
  "mechanically certain, no judgment needed," still not fixed.
- ~90 of 1,327 teaching chunks share no word-stem with their own prompt — a reading list only.
- Two seeds (S0309, S0518) left explicitly on hold for Kai between two disagreeing analyses.
- बताना ("tell"/"say") flagged as a live known-side ZUT collision, not on any applied-fix list.
- 20 practice phrases stranded unwritable by earlier chunk repairs (seeds 1–20), not deleted —
  deletion is Kai's call.
- A citation-form gap at S0351L03 — no notation exists to cite a chunk with its governing verb;
  growing it would permanently silence the clip.
- Embedded-question word order wrong in ~20–26 rows (seeds 631/642/652/657/664/666) — "flagged
  for a content pass to rule on."
- Shuchita's own August edits: 31 seeds reverted exactly back to her pre-edit Hindi by this week's
  rebuild (including two words she deliberately deleted, now live again); a further 74 seeds
  changed into text that is neither hers nor the original — attribution to her specifically is
  unverifiable (no author field in the audit log).
- Seeds 1–20's practice layer: of 517 rows only 131 were rewritten in this week's pass; 386 still
  carry original 2026-07-31 text with English-word-order Hindi.
- Scan-course backlog: 16 M-type LEGOs with zero component phrases; 1 empty LEGO (S0001L01, "must
  rebuild"); 2 presentation-audio text/announcement mismatches.
- 43 of 72 "Tier-C" seeds from an earlier proofreading pass are "genuine residue — no ruling
  covers them" (full list published in `/d/b5f4a8fa`); 251 "Tier-B" seeds untouched; 56 audio
  clips silent pending an audio pass.

Sources: `/d/722ae033`, `/d/182dd442`, `/d/2f036beb`, `/d/4bc3061d`, `/d/50c19c7e`, `/d/9f0f49a6`,
`/d/fc5be961`, `/d/901f3d06`, `/d/aea1c341`, `/d/26a82f53`, `/d/27af7a47`, `/d/a3d97d1b`,
`/d/a2d0dfbf`, `/d/1ece2273`, `/d/ccfc61e2`, `/d/b5f4a8fa`, `/d/5856a58b`, `/d/17d70479`,
`/d/55bf8b2d`.

## spa_for_eng — the rest of the backlog (condensed)

Under a separate, large-scale independent-read QA campaign (multiple readers, seeds 1–663 in
blocks). None of these have been repaired yet — they are freshly produced reading lists:

- **~250 confirmed defects across seeds 1–663** from six independent block reads (53+16 seeds
  1–110/441–550, 57 seeds 111–220, 43 seeds 221–330, 30 seeds 331–440, 16 seeds 551–663), roughly
  2–3% of rows read. Two systemic patterns called out repeatedly: reported-speech past tense
  collapsing to present (8 of 20 HIGH findings in one block alone), and subjunctive omission (14
  sentences in one block).
- **54 known/target mismatches left for a human** beyond 58 already fixed — 24 blocked because
  every grammatical fix uses vocabulary not yet taught; 56 rows now have no audio pending
  approval. (`/d/91cb5a7e`)
- One gender-agreement gloss error at S0279L02U10, explicitly found and left ("say the word and
  it's a one-word edit"). (`/d/c5ba08cf`)
- 31 lines where Spanish drops "poder" while English keeps "can" — opposite-direction sibling of
  an already-fixed defect, confirmed out of scope for that fix, still unaddressed. (`/d/66648a87`)

Sources: `/d/e5b305b4`, `/d/7fe1ab38`, `/d/17897f61`, `/d/aeecb63f`, `/d/9c4295b5`, `/d/7f36168f`,
`/d/015ae71b`, `/d/0ad59396`, `/d/c5ba08cf`, `/d/91cb5a7e`, `/d/66648a87`.

## The long tail — one line per course/cluster

- **Japanese-prompt courses** (deu/fra/ita/spa/zho/por_for_jpn): several small confirmed
  mismatches found in passing while diagnosing other bugs (wrong German verb form, idiom
  collisions, French/Italian answer-adds-content); a June vocabulary fix never propagated to
  practice phrases in German + 4 more courses; 31 deleted phrases left 2 follow-on gaps (1 LEGO
  with zero build phrases, 76 orphaned audio clips); 2 sequencing slips (French/German) filed one
  seed early; **51 rows live in zho_for_jpn + 446 in draft por_for_jpn** prompt the learner in the
  wrong language entirely.
- **Welsh** (3 released courses + cym_for_yor draft): one broken yes/no answer-particle row
  propagated identically into all 3 released courses; Southern course's mutation-lesson seeds
  (290, 310) are empty teaching stubs; cym_for_yor draft carries ~15 separate small unfixed items
  (untaught vocabulary in 31/855 phrases, inconsistent tense forms, pronoun-gender rule not
  applied, 2 wrong-particle rows) explicitly logged per Kai's own "build first, check later" call.
- **Italian** (ita_for_eng): ~900 xAI-voiced clips per role un-re-rendered after a voice repoint;
  16 phrases orphaned from their redrawn LEGO, not refiled; **28 other courses** carry the same
  voice-config mismatch, explicitly left alone.
- **Austrian German:** 24 recorded clips never attached to anything, "silently stranded."
- **Basque:** a July 3-phrase fix silently reverted by a rebuild, not restored; 10 seeds where the
  audio speaks different words than the row's text; ~1,945 draft phrases awaiting content approval.
- **Lebanese Arabic:** a tested bidi/RTL punctuation fix for all 13 RTL courses sits unmerged.
- **Mexican Spanish:** 28 phrases + 1 LEGO missing target audio.
- **Dutch:** a word ("om") taught 62 seeds too late — 85 phrases affected; fix identified, not
  applied; 2 mispronounced recordings reported but un-locatable.
- **Castilian Spanish:** 427 phrases missing target audio; a fix-pass of 39 rows has sat in the
  audio queue unrun since 2026-07-31.
- **Portuguese-for-English:** 8 seeds carry a stale review flag from a July batch run.
- **Cross-cutting:** 79 audio-generation requests unfulfilled estate-wide (oldest since 2026-07-24;
  only 6 approved and awaiting a run, 15 never approved at all).
- **Needs-you board:** 7 more parked course-content cards among items marked "still open," never
  ruled on — includes 236 Chinese sentences playing a completely unrelated recording (fixable by
  re-pointing), and 10 Irish sentences that speak the course code "gle" instead of the word
  "Irish."
- **Language-consistency drift** (contraction/register conventions): 6 courses need a repair pass
  not yet done (Egyptian Arabic 425/2,296 pairs, English-for-German 7.2% expanded, both Portuguese
  variants, both Korean directions); 6 English-target courses share an "I'll"→"I will" drift not
  fixed.
- **Irish courses generally:** beyond the 26% headline above — 18 wrong yes/no answers, 9
  vocabulary-as-yes/no LEGOs, 8 irregular-past errors in the live course; smaller counts in
  Connemara/Ulster/Munster; 6 items waiting on a native-speaker ruling.

---

## Where this was searched, and what was not

**Searched:**
1. Ops ledger — server caps `limit` at **500 rows / 8 days** (2026-08-26 → 2026-09-03); no
   pagination parameter worked past that. Everything the ledger holds was read.
2. All **111 unique published-doc links** referenced from those 500 ledger rows — fetched and
   read in full by 4 parallel workers (28/28, 28/28, 28/28, 28/28 fetched, 0 failures).
3. `docs/course-methodology-canon.md` — read in full; its open-clash section (C1–C22) is
   documentation/rule disagreements, not course-content defects, and is excluded here except
   where it names a live defect (WC-1, Sinhala).
4. `docs/DECISIONS.md` — read for "deferred/parked/out of scope" language; one genuine item found
   (item 5 above); other hits were routing/UI decisions, not course content.
5. Recently-modified `docs/` subdirectories (last ~4 weeks) — spot-checked several; two more
   genuine small items found (`docs/build-unbacked-2026-08-31/`: 1 row + 8 rows logged, untouched
   — folded into item 6's neighbourhood but not separately tabled given their size).
6. Both shared rooms (Popty dashboard, ssi-app) — read in full (25 and 3 messages respectively).
   **No course-content parked items found in either** — both rooms' recent traffic is
   infrastructure/deploy work (booth capture quality, dropdown filters, page performance) and the
   live gender-mechanism discussion already folded into item 2 above.

**Gaps, stated plainly:**
- The ops ledger's 8-day window means anything parked **before 2026-08-26** and never
  re-mentioned since is invisible to this census unless it happened to live in a `docs/` file I
  read directly (canon.md, DECISIONS.md, build-unbacked) or in the two rooms' archived
  predecessor threads, which were **not** chased (each room points to a predecessor conversation;
  reading those in full was judged out of proportion to the ask and was not done).
- The English-bracket per-course counts above are from the **2026-08-18** census; no live
  re-count was run today (no DB credentials in this checkout — `.env.psql` is not present here),
  so the true current count may differ slightly if any course was touched since.
- The Sinhala 27-example item's "2 rows still linked to corrupt clips" note is from **2026-08-18**
  and was not reverified live.
- Given the volume, most items above are reported at the granularity the source doc gave them;
  full per-row detail (e.g. every one of the ~250 spa_for_eng defects) lives in the linked docs,
  not reproduced here.

**No commits.**
