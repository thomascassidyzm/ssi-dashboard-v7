# eng_for_hin — the teaching layer is rebuilt from 241 up to 475

2026-09-02 · run 4 of the rebuild · picked up after the 20:05Z server restart killed run 3 mid-seed

**No commits. No audio generated. No seed's Hindi cue or English answer touched.**

---

## Where I got to

I verified seed 240 first, because the restart could have left it half-written: it is complete —
3 teaching chunks, 3 build + 5 use practice phrases on each, 24 rows. Nothing to repair. I started
at 241 and worked upward, one seed at a time, through the dashboard's own course-builder
(`/build/rebuild` → `/v2/decompose` → `/v2/decompose/finalize` → `/v2/phrases`), never a builder of
my own. Every seed was snapshotted before it was wiped, so any single one can be restored on its own.

| | |
|---|---|
| **Seed reached** | **475** |
| Seeds rebuilt this run | **206** (241–475, less the 29 blocked) |
| Teaching chunks written | **513** |
| Practice phrases written | **3,190** |
| Seeds left blocked, unbuilt | **29** — all on one ruling, listed below |
| Seeds still on the old layer | 476–668 |

Every seed between 241 and 475 is either rebuilt or on the blocked list. There are no silent gaps.

**Resume at seed 476.** The ledger is at `scripts/hin-rebuild2/LEDGER-run4.md` — one line per seed,
with its chunks, its snapshot id, and the reason for every judgement call. It is in the repo
(gitignored) rather than in scratch, deliberately: run 3's ledger was in `/tmp`, which is RAM-backed,
and the restart destroyed it. This one survives a restart.

---

## The thing you have to rule on: it is bigger than the possessive

The standing block is the his/her problem — Hindi possessives agree with the thing possessed, so one
Hindi form carries both "his" and "her". Working up from 241 I found the same defect in a **second,
much larger family**, and the earlier scan could not have seen it.

**The dative-subject family.** Hindi says "X needs to / X should / X is hurt" with a DATIVE subject
(उसे) and a verb that agrees with the OBJECT, not the subject. So the subject's gender is unmarked
twice over. Unlike the possessive, there is nothing anywhere in the clause to enlarge the chunk
around — no gender-marked word to swallow. Nine seeds in this stretch are this shape: 319, 320, 322,
323, 325, 326, 327, 328, 339.

**Why the earlier scan missed them.** That scan searched for *his / her / him / hers*. These seeds'
English says a bare **"he"** or **"she"** — "She needs to move to a different country", "He doesn't
need to buy another television". The scan was never looking for those words. The reading list I was
handed was a genuine reading list, but it was a partial census, not a full one.

**The full blocked list from this run — 29 seeds:**

> 241, 242, 268, 290, 309, 319, 320, 322, 323, 325, 326, 327, 328, 339, 343, 344, 345, 346, 353,
> 354, 355, 357, 363, 364, 365, 385, 386, 438, 465

Each was confirmed by hand, not taken from the list. Seven of them (309, 346, 357, 365, 385, 386,
465) were on your reading list and are confirmed. **Two on the list turned out NOT to be blocked** —
246 and 464 — because their own Hindi does license the gender: 246 ends "…but she was **too busy**"
(व्यस्त **थी**, feminine) and 464 ends "…but **she forgot** it" (भूल **गई**, feminine). A seed can
license its pronoun from a later clause in the same sentence, and where it does I built it normally.

**A question inside the question.** Seeds 267 and 268 are a dialogue pair. 267 says "your friend"
with आपकी दोस्त — feminine. 268 answers it: "Yes **she** sent me two emails last week", and 268's own
Hindi licenses nothing. Does the *preceding seed* count as licensing? I did not assume it does — the
cue the learner reads is 268 alone — so 268 is blocked. That is your call, not mine, and it may move
several seeds at once.

**And one you should know about, because an earlier run already decided it quietly.** Seed 384 needed
"what **he** said" from उसने जो कहा, which licenses no gender. But that exact chunk was already fixed
as "what he said" upstream at seed 84 by an earlier run. So the course-wide answer is *already*
deterministic, and I reused it rather than minting a new arbitrary gloss. That means the estate has,
in practice, been resolving some of these by fiat for a while. Worth deciding whether that is the
ruling you want, because it is currently the ruling you have.

---

## Open questions from the brief — where they stand now

**कल is still both "yesterday" and "tomorrow", and it cost me chunks.** This is no longer a
theoretical trap; it forced me to swallow कल रात into a bigger chunk three separate times (278, 453,
and again at 312 where it happily deduped as "tomorrow night"). The course now teaches कल = "yesterday"
(s30) alongside कल रात = "tomorrow night" (s192), कल सुबह = "tomorrow morning", कल दोपहर = "tomorrow
afternoon". Every individual chunk is deterministic; the *pattern* a learner infers is not. Still
flagged, still not forced.

**The two person-neutral adverbials (जितनी जल्दी हो सके / जल्दी से जल्दी) are unchanged**, and I added
one more instance of the same class: at 249, जाने से पहले → "before you go" takes its "you" from the
आप of the main clause, not from anything inside the chunk. Same question, one more example.

**Seeds 276 and 312 are resolved.** The previous run flagged both as holding contradictory glosses.
276's यहाँ now deduplicates cleanly to s34 "here"; 312's कल रात now deduplicates cleanly to s192
"tomorrow night". Neither needed a ruling in the end — they needed the rebuild to reach them.

**One deferral opened and closed inside this run.** Seed 275 is the single word ज़्यादा समय। →
"Longer." It could not be built when I reached it, because seed 333 (not yet rebuilt) still owned
ज़्यादा समय as "more time" and the tool refuses a collision. The usual remedy — enlarge this seed's
chunk — is impossible on a two-word seed. So I recorded it, carried on, and when I reached 333 I
swallowed ज़्यादा समय into its chunk and went straight back and built 275. **275 is built. The
deferral is closed.** Nothing is left hanging.

---

## New rulings I made — so the next run does not re-derive them

1. **A neutral reporting frame followed by a gender-marked verb is not blocked — enlarge it.**
   Seeds 301 and 302 both open with उसने कहा कि, and their English differs only in "He said" / "She
   said". A bare उसने कहा कि → "he said that" would collide head-on with 302. Taking the verb into the
   chunk (उसने कहा कि वह **चाहता है** / उसने कहा कि वह **नहीं चाहती**) makes both buildable. This is the
   general remedy whenever the licence exists but sits one word outside the chunk.
2. **Two different Hindi forms may share one English gloss.** मैं नहीं जानता and मुझे नहीं पता both →
   "I don't know". The learner reads Hindi and says English, so only the other direction — one Hindi
   form with two English answers — breaks ZUT. This unblocked a dozen seeds.
3. **A string that exists only as an M-LEGO *component* is NOT deduplicated by finalize.** It gets
   introduced as a fresh chunk and therefore needs its own 3 build / 5 use. Watch `legos_introduced`
   in the finalize response: if it is higher than the number of chunks you wrote phrases for, a chunk
   you thought was a duplicate has just been introduced silently with no phrases. Caught at seed 252,
   which I rebuilt.
4. **Swallowing is the standing remedy for a taken string, upstream or downstream.** I used it
   fourteen times: वहाँ ("there") at 258/307/389, कल रात at 278/453, जल्दी ("quickly") at 397/431,
   पहले ("earlier") at 458, ख़ुद ("on my own") at 351/450, कुछ और ("something else") at 360, मिलना
   ("to meet") at 350, अच्छा रहेगा ("would be fine", downstream) at 402, थोड़ी देर पहले ("a while ago")
   at 384.
5. **A frame with no second complement anywhere in the course should not be split off.** "to seem"
   (300) has exactly one complement in all 668 seeds, so ग़ैर मिलनसार दिखना is one chunk, not two.
   The same at 306 ("who's talking to" has only one object) and 316.
6. **When the two halves would produce identical practice phrases, merge them.** Splitting gives the
   round map two chunks and the learner the same eight sentences twice.

---

## A real bug I found — in my own tooling, fixed, and worth your knowing

`scripts/hin-rebuild2/lib.cjs` paged `course_legos` and `course_seeds` with `.range()` and **no
`.order()`**. PostgREST offset paging without an ORDER BY is non-deterministic — pages can repeat or
skip rows — so the "vocabulary available before seed N" set was silently losing chunks. It surfaced at
seed 442, where "to lead the way" (taught at 416) and "to visit us" (taught at 428) came back as
unknown words. Fixed: every page is now ordered by seed_number, lego_index.

**Blast radius: nothing wrong was written.** A missing chunk can only make my offline check *stricter*
(a phrase looks untileable), never looser. The one real risk — a missed ZUT collision — is covered,
because the *service* runs its own global collision check at finalize and every finalize in this run
returned `collisions: 0`. The service's own vocabulary loader orders correctly; only my mirror was
wrong. The fix is in the gitignored `scripts/` workspace and is not committed.

---

## Audio — counted from the live database, nothing generated, nothing deleted

Zero TTS calls, zero queued renders, zero synthesis, nothing deleted. Rebuilding a seed unlinks its
clips; the clips themselves are untouched in `course_audio` and S3. These numbers are that unlinking.

| scope | teaching chunks | Hindi silent | English silent |
|---|---|---|---|
| seeds 241–475, rebuilt this run | 513 | 513 | 513 |
| the 29 blocked seeds — untouched | 66 | 0 | 0 |
| seeds 476–668 — not yet rebuilt | 326 | 0 | 0 |
| **whole course** | **1,469** | **1,012** | **1,007** |

| scope | practice phrases | Hindi silent | English silent |
|---|---|---|---|
| seeds 241–475, rebuilt this run | 3,190 | 3,190 | 3,190 |
| the 29 blocked seeds — untouched | 636 | 0 | 0 |
| seeds 476–668 — not yet rebuilt | 2,764 | 0 | 0 |
| **whole course** | **11,158** | **7,525** | **7,516** |

**This run added 3,703 Hindi items and 3,703 English items to the rendering pass.** The whole
outstanding pass is now **8,537 Hindi items and 8,523 English items**. Nothing is queued. That is your
spend decision and I have not pre-empted it.

Seed approvals: 246 of the 668 seeds still carry `approved_at`; **422 are now cleared** and need
re-approval. That is what `/build/rebuild` does and it is correct — a rebuilt seed is a draft until a
human approves it.

---

## Explicit gaps

**GAP‑A · The gender ruling — 29 seeds this run, in two families.** The possessive family you already
knew about, and the dative-subject family, which is bigger and which no enlargement can rescue. Plus
the discourse question at 267/268 and the by-fiat precedent at s84/384. One decision, several
sub-questions.

**GAP‑B · Seeds 1–20's component glosses are still wrong and still learner-visible** (है → "he",
हैं → "you", हूँ → "I", में → "on", अच्छी → "well"). Inherited from the previous run's GAP‑B,
untouched, and still wanting its own downward pass.

**GAP‑C · कल has four faces.** Detailed above. Worse than when it was first flagged, because the
rebuild keeps meeting it.

**GAP‑D · The person-neutral adverbials.** Two from the previous run, plus जाने से पहले from seed 249.

**GAP‑E · Phrase variety thins where a seed's English is one fixed clause or one inverted question.**
Seeds 258, 278, 313 and 434 are the specimens: a question-shaped chunk can only take adjuncts, so its
eight phrases vary by "so" / "and" / a time or place word and nothing else. Every phrase is correct,
tiles, and reads as English — but those stretches are more formulaic than seeds 1–60. Named rather
than hidden. It is a consequence of fixed seed English plus a whole-chunk gate, not of haste.

**GAP‑F · An inherited defect at seed 204, not mine and not compounded.** s204 teaches
मैं चाहता था कि वह → "I wanted her to", although 204's own Hindi licenses no gender at all. Under the
standing ruling it should have been blocked. Run 3 built it. I reused it at 246 rather than minting a
rival gloss, and I am reporting it rather than quietly fixing a seed below my line.

**GAP‑G · A pre-existing ZUT violation the tool cannot see.** नहीं is glossed "no" at s96 (a chunk) and
"not" at s12 (an M-component). The finalize collision check compares CHUNKS only, so a
chunk-vs-component collision passes silently. Reported, not touched.

**GAP‑H · Run 3's ledger and per-seed specs are gone.** They were in `/tmp`, which is RAM-backed, and
the 20:05Z restart wiped them. I could not read run 3's reasoning for seeds 197–240; I carried
forward only what the two published reports record. Mine is in the repo so this cannot happen again.

---

## Database writes, plainly

- 206 seeds wiped and rebuilt through `/build/rebuild`, each snapshotted first, each restorable alone
- 513 teaching chunks written; 3,190 practice phrase rows written
- 2 seeds rebuilt twice on purpose — 252 (a component-only string was introduced with no phrases) and
  275 (deferred behind seed 333, then built once 333 freed the string)
- 422 of 668 seeds now have `approved_at` cleared and need re-approval
- No seed's Hindi cue or English answer was changed anywhere. `/v2/decompose` refuses a submission
  whose text disagrees with the canonical seed, and I submitted no seed text at all, so the canonical
  row was reused verbatim every time.

## What I need from you

1. **The gender ruling.** 29 seeds are waiting on it in this stretch alone, and the dative-subject
   family means it cannot be solved by adding a referent to a chunk. Plus: does the preceding seed in
   a dialogue pair license the gender (267→268)? And do you want the by-fiat resolution that s84 has
   already set as precedent?
2. **Seeds 1–20's component glosses** — a separate downward pass, or leave them?
3. **The 8,537 Hindi + 8,523 English silent items.** Say the word and they can be queued. Nothing is
   queued now.
