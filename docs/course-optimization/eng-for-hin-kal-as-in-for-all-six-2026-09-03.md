# eng_for_hin — one method for कल, applied to all six: the growths reverted, the "as in" context made to stick

**Date** 2026-09-03 · **Course** `eng_for_hin` (known = Hindi, target = English), 668 seeds,
`new_app_status: live` · **Every number below was re-measured against the live DB immediately
before and immediately after the writes. Nothing is inherited from the earlier report.**

> *"that sister is really long, prefer the as in method. Probably best to be consistent also —
> the merging method didn't work for all, so we should use the as in method for all."*
> — Kai, 2026-09-03

Hindi **कल** means both *yesterday* and *tomorrow*; **कल रात** both *last night* and *tomorrow night*.
Six LEGOs debut the word with nothing fixing the direction. A pass earlier today grew two of them
onto their verbs and applied that live. Kai has ruled against the growth and for one method
everywhere. **Both growths are out, and the "as in" method now stands on all six.**

---

## In one page

| | |
|---|---|
| **Growths reverted** | 2 of 2 — `S0278L02` and `S0192L02`, back to the exact pre-growth text, and re-read |
| **Rows recovered** | 9 deleted drills restored **verbatim** from `content_audit_log`, plus 2 downstream phrases |
| **Audio regained** | **4 links** — `S0192L02`'s known, target1, target2 and its introduction, all silent since the growth |
| **Audio lost** | **0** — no clip nulled, no rendered `course_audio` row deleted anywhere in this job |
| **"as in" introductions live** | **7 of 7** (the six, plus `S0012L03`), all verified FRESH by phase8's own probe |
| **New drills** | **10**, spreading कल रात from 3 seeds to 10 and कल दोपहर from 9 to 12 |
| **LEGO rows inserted / deleted / `is_new` flipped** | **0 / 0 / 0** — 1,489 LEGOs and 1,337 `is_new` before and after |
| **Validator** | **622 passed / 46 failed before, 622 / 46 after, identical failing SET** — 0 newly failing, 0 newly passing |
| **Phrases losing tileability** | **0** |
| **Decomposition ↔ target concat mismatches** | **0 → 0** (10,929 decompositions) |
| **Clips now wanted** | **37** — 7 introductions, 30 practice. **None can be rendered by anyone today** |
| **TTS generated** | **none** |

**The single most important finding: Kai's step one did not work, and now it does.** He asked
that we "make sure it kicks in". Asked live, the Frame A/B judge answered **BARE — no context —
for three of the six** कल chunks. That is fixed in code, with tests. Details in §3.

---

## 1. The revert, and why it could be done cleanly

The growth tool's applied logs recorded which phrase ids it deleted but **not what they said**, so
the logs alone could not restore seed 192. `content_audit_log` could: it holds the full `old_row`
for every UPDATE and DELETE. The nine rows deleted at `19:14:21` — the instant before the growth
inserted its replacements — were re-inserted **verbatim**, text, position, metadata, decomposition
and clip links included, by pinned audit id rather than by time window, so the tool restores exactly
the rows a human read and refuses if any of them has moved.

Before touching anything, the baseline was re-taken: **622 passed / 46 failed, 1,489 LEGOs, 10,948
phrases, 0 concat mismatches** — identical to the earlier report's after-state, so nothing had been
written over the top and the revert was clean rather than a guess.

### seed 278 — `S0278L02`

`क्या आपको कल रात सब पूरा करना था` → back to **`कल रात सब` / "everything last night"**.
Its nine drills were never touched by the growth (all nine already contained the grown target), so
only the LEGO text moved back. It carried no clips before and carries none now.

### seed 192 — `S0192L02`

`मैं कल रात व्यस्त हूँ` → back to **`कल रात` / "tomorrow night"**, and this one had real audio.

- **Nine drills restored verbatim** — `मुझे कल रात मिलना है`, `मैं कल रात आराम करना चाहता हूँ`,
  `मैं कल रात व्यस्त हूँ`, `मैं कल रात मिलना चाहूँगा।`, `क्या आप कल रात जाना चाहते हैं?`,
  `हम कल रात आराम करना चाहते हैं।`, `आपको कल रात क्या करना है?`, `मुझे कल रात जाना है।`,
  `मुझे कल रात इंतज़ार करने में कोई आपत्ति नहीं।` The eight the growth authored are gone; none of
  them carried a clip, so deleting them dropped no audio.
- **Four clip links re-pointed**, each checked before the write to confirm the clip still exists,
  is rendered rather than pending, and still speaks the text it is being pointed at:
  `known` speaks exactly `कल रात`, `target1` and `target2` speak exactly `tomorrow night`.
  **That LEGO's debut was silent since the growth and is audible again.**
- **The two downstream phrases are back**, and they were kept rather than left as आज रात because
  each is independently correct under Kai's own rule that every कल sentence must carry its context:
  `S0193L02B02` *कल रात मैं बहुत व्यस्त हूँ* is pinned by the overt present copula **हूँ**, and
  `S0249L02U04` *मैं चाहता हूँ कि आप कल रात मेरी मदद करें।* by **चाहता हूँ** plus a subjunctive.
  Hindi's present cannot host कल = *yesterday*, so both read forward and both restore a drill of
  the chunk. Neither carried a clip in either state, so the choice cost no audio.

### The one honest concession in the revert

`S0192L02`'s restored introduction link points at a clip that says
`अंग्रेज़ी में — 'व्यस्त' — जैसे — 'मैं अगले हफ्ते व्यस्त हूँ।' — में :` — *"the English for 'busy',
as in 'I'm busy next week', is:"* — and then answers *tomorrow night*. **It is wrong, and it was
wrong before the growth too**: it is one of this course's 777 stale introductions, a defect that
predates all of this. Restoring the link returns the learner to audible-but-stale rather than
leaving the slot silent, which is what make-before-break asks for, and the corrected "as in"
introduction sits beside it as a pending row waiting on a renderer. Naming it rather than burying it.

### Two unrendered placeholders deleted

The growth wrote a bare Frame A introduction for each grown chunk. Both quote a chunk that no longer
exists, and a later `/generate` would have rendered and bound them. Both were `s3_key pending/…`
with no duration and no link — **placeholders, not audio** — and both were deleted after checking
all three of those things. `course_audio` presentation rows: 2,973 → 2,971.

---

## 2. The "as in" method, on all six

All six now teach the sense the same way, and so does the seventh कल LEGO that was never in dispute:

| seed | LEGO | chunk → answer | sense | the context its introduction now speaks | what pins it |
|---|---|---|---|---|---|
| 12 | `S0012L03` | कल क्या होगा → *what's going to happen tomorrow* | future | मैं यह अंदाज़ा नहीं लगाना चाहूँगा कि कल क्या होगा। | होगा |
| **30** | `S0030L03` | कल → *yesterday* | **past — the sense is established here** | मैं कल आपसे कुछ पूछना चाहता था। | चाहता था |
| 42 | `S0042L03` | कल रात के मुक़ाबले → *than last night* | past | मैं कल रात के मुक़ाबले ज़्यादा अच्छा महसूस करने लगा था। | करने लगा था |
| **155** | `S0155L04` | कल सुबह → *tomorrow morning* | **future — the other sense arrives** | मैं कल सुबह मिलना चाहूँगा। | चाहूँगा |
| 167 | `S0167L02` | कल दोपहर → *tomorrow afternoon* | future | क्या आप कल दोपहर जाना चाहते हैं? | चाहते हैं |
| 192 | `S0192L02` | कल रात → *tomorrow night* | future | मुझे कल रात जाना है। | जाना है |
| **278** | `S0278L02` | कल रात सब → *everything last night* | **past — both senses now in play** | क्या आपको कल रात सब पूरा करना था? | करना था |

Every context sentence is **live course text** — that seed's own sentence or one of that LEGO's own
practice phrases — so no Hindi was invented and the known side stays a controlled language by
construction. Each was re-checked today, after the revert, against the live DB.

**Will they actually be spoken?** Yes, once anything can render. Each of the seven was tested against
phase8's own freshness probe — the rule that decides whether a pending row is TTSed or thrown away —
and **all seven pass**: their quoted `{known}` slot matches the LEGO's current text. `/generate`
renders a fresh pending row and `bindPresentationAudio` then overwrites `course_legos.presentation_audio_id`
unconditionally, so the stale introductions on seeds 12, 30, 167 and 192 are replaced rather than
left in place. The revert did not break that: putting `S0192L02` back to `कल रात` is exactly what
makes its pending row fresh again.

### The collisions, stated deliberately

Kai authorised these: *"won't matter that it causes a ZUT — because we're handling it."*

- **कल रात is taught in both directions.** *tomorrow night* at seed 192, and *last night* at seed
  234 inside `मैं कल रात एक व्यक्ति से मिला`, at 278 inside `कल रात सब`, and at 453 inside
  `उन्होंने कल रात किसे देखा था`. Every one of those carries its own tense marker.
- **Bare कल is *yesterday* (seed 30) while कल सुबह / कल दोपहर / कल रात are all future.** Different
  chunks, so no gate objects; the learner's ear is what needed the fix.
- **The ordering, measured rather than assumed, is not what the brief supposed.** The first कल in
  the course is at seed **12** and it is *future*, bound inside `कल क्या होगा` whose own होगा fixes
  it and which is never answerable alone. The first **bare** कल is seed 30, and it is past. Seed
  42's कल रात is *last night* — **consistent** with seed 30. The contradiction is real but runs the
  other way: seed 192 introduces कल रात as *tomorrow night* after seed 42 has used it as *last night*.
  Both ends now carry context.

---

## 3. Kai's step one — "make sure it kicks in". It did not, and here is the proof

The introduction's frame is chosen by an LLM judge (`judgeBatch`, `services/phases/presentation-author.cjs`):
Frame **B** carries the "as in" context, Frame **A** is bare. **The judge was run live on the six
कल chunks.** It answered:

```
कल                    → B     कल सुबह    → A     ← context dropped
कल रात के मुक़ाबले    → B     कल दोपहर   → A     ← context dropped
                              कल रात     → A     ← context dropped
कल रात सब             → B
```

**Three of the six lost their context**, and they are the three future chunks — precisely the ones
whose sisters elsewhere in the course are past. The reason is in the prompt: Frame A was defined as
"a clear standalone word", and `कल सुबह` **is** a clear standalone word. Being clean as a word is
the reason a two-sense chunk needs the context, not a reason to drop it.

Three changes, all committed with tests:

1. **The judge's criterion now names the case.** Frame B is required when the chunk's known-language
   form covers more than one meaning the target language tells apart, "so a learner could correctly
   answer it two different ways", and Frame A now requires the chunk to be *single-sense* as well as
   self-sufficient. Re-run live against the same six, the judge moved from **3 of 6 keeping the
   context to 5 of 6**.
2. **`item.forceFrame` — a deterministic pin**, because a prompt is a hope and not an invariant.
   A caller can state the frame outright for a chunk a human has ruled on; the judge is still asked
   about the rest of the batch and its content flags still count, and a batch that is entirely
   pinned skips the CLI call altogether. A pinned Frame B is still refused when the context does not
   contain the chunk, which is the same downgrade the judge already applies to its own answers.
3. **A re-author can no longer silently drop a context that was already there.** When a pending
   introduction goes stale — an unrelated `known_text` edit is enough — phase8 throws it away and
   has the judge decide the frame from scratch. It now checks whether the row being discarded
   *had* a context (Frame A is deterministic, so this is knowable, not guessed) and carries that
   across as a pin. This is the failure mode that would have quietly undone this whole job.

Pinned by `services/phases/__tests__/force-frame-pin.test.mjs`, 6 tests; with the existing
`frame-a-strip.test.mjs`, **13 green**.

The judge also volunteered two content flags nobody asked it for, both worth Kai's eye and neither
acted on here: it called `कल रात सब` *"a broken constituent … doesn't match the seed's word order as
a contiguous chunk"*, and it questioned whether `कल रात के मुक़ाबले` should gloss as *"than last
night"* at all.

---

## 4. Drilling — measured first, then added where it was actually thin

Kai: *"it needs to be drilled a lot"*, *"I don't care about losing a few phrases, just make new
ones"*. Counting the phrases whose decomposition actually tiles each कल chunk, rather than assuming:

| chunk | → | phrases | seeds |
|---|---|---|---|
| कल | yesterday | **112** | 67 |
| कल सुबह | tomorrow morning | **54** | 36 |
| कल दोपहर | tomorrow afternoon | 20 | 9 |
| कल क्या होगा | what's going to happen tomorrow | 16 | 9 |
| **कल रात** | tomorrow night | **13** | **3** |
| **कल रात सब** | everything last night | **9** | **1 — orphan** |
| **कल रात के मुक़ाबले** | than last night | **8** | **1 — orphan** |

Two are drilled hard already. Two are **orphans** — taught in one round and never met again, which
is canon P11's "no spaced repetition" case. So the drilling was added where the count says it is
missing, not spread evenly:

**10 new USE drills, all applied and re-read live.** Each sits on a host LEGO whose own phrase set
already proves the adverbial slot exists — every one has a live sibling using आज शाम *"this evening"*
in exactly the slot कल रात takes here, so the frame is attested rather than invented.

| new phrase | host | drills | English |
|---|---|---|---|
| `S0197L01U07` | my son | कल रात | she wants to meet my son tomorrow night |
| `S0200L02U06` | they want | कल रात | they want to practise speaking English tomorrow night |
| `S0203L01U06` | what would you do | कल रात | what would you do tomorrow night? |
| `S0205L02U06` | the word | कल रात | can you tell me the word tomorrow night? |
| `S0210L02U06` | we need to discuss | कल रात | I think that we need to discuss the answer tomorrow night |
| `S0219L02U06` | for a while | कल रात | I'd like to relax for a while tomorrow night |
| `S0227L01U06` | that man is going to tell me | कल रात | that man is going to tell me something tomorrow night |
| `S0200L04U06` | we finish everything | कल दोपहर | they want to make sure that we finish everything tomorrow afternoon |
| `S0203L02U06` | if I asked you | कल दोपहर | what would you do with me if I asked you tomorrow afternoon? |
| `S0217L01U06` | a glass or two | कल दोपहर | can you give me a glass or two tomorrow afternoon? |

**कल रात goes from 3 seeds to 10; कल दोपहर from 9 to 12.** Each was gate-tested before the write —
containment against both its host and the कल chunk, target vocabulary against the cumulative set at
that seed, known-side words all already met in the course prefix, ZUT against every known prompt in
the course, duplicate check — and each was re-read afterwards and asserted to concatenate back to its
target text exactly, which is the player's Strategy-0 guard.

**Every one of them is FUTURE, and that is deliberate.** कल रात = *last night* has **no LEGO of its
own** in this course, so a past drill here would teach untaught material. Keeping every added drill
on the future sense is exactly Kai's *"keep using it in ONLY that sense"* for the stretch between
seed 192, which teaches कल रात as *tomorrow night*, and seed 234, where it comes back as *last night*
inside its own chunk. After 234 the two senses interleave, which is the *"soon after, start drilling
both versions"* leg.

### The two orphans were NOT spread, and the reason is not laziness

*"everything last night"* and *"than last night"* are constituents that fit only the frame of their
own seed. Spreading them means writing sentences nobody would say, which canon R0.3 and P14 both
forbid more strongly than they ask for volume. **That is a chunk-boundary defect, not a drilling
shortage** — and it is the same thing the growth was trying to fix. The "as in" method fixes the
*sense* for these two; it does not make them reusable. Kai should know that the two methods solve
different halves of the problem.

---

## 5. What I found and did NOT apply — Kai's call

### 5a. कल = "tomorrow" is an untaught GHOST in 57 phrases, 8 of them before the word is ever taught

Reading all 327 कल-bearing practice phrases and their decompositions:

> **57 of them carry कल as a tile with no LEGO behind it.** The learner is shown *"tomorrow"*
> (43 rows) or *"last night"* (6 rows) as material that was never introduced.

The cause is structural and it is the deepest thing under Kai's ruling: **bare कल is taught exactly
once, at seed 30, as *yesterday*.** There is no LEGO anywhere in the course that maps bare कल to
*tomorrow*, so the decomposer cannot tile it and emits a ghost instead.

**Eight of those sit BEFORE seed 30**, so the learner meets कल as *tomorrow* up to seven seeds before
being taught that it means *yesterday* — which is the direct opposite of *"keep using the word in
ONLY that sense"*:

| seed | id | Hindi | English |
|---|---|---|---|
| 23 | `S0023L02U04` | आप कल और बोलना शुरू करना चाहते हैं। | you want to start talking more tomorrow |
| 24 | `S0024L02U01` | मैं कल उसका नाम याद नहीं कर पाऊँगा। | I'm not going to be able to remember his name tomorrow |
| 25 | `S0025L01B03` | क्या आप कल मेरी मदद करेंगे | are you going to help me tomorrow |
| 26 | `S0026L02U04` | मैं कल जाने के लिए लगभग तैयार हूँ। | I'm nearly ready to go tomorrow |
| 27 | `S0027L01U05` | मुझे कल वापस आना पसंद नहीं है। | I don't like to come back tomorrow |
| 27 | `S0027L02U02` | मुझे कल बहुत समय लगाना पसंद नहीं है। | I don't like taking too much time tomorrow |
| 28 | `S0028L03U05` | क्या आप कल बोलना शुरू करना चाहते हैं? | do you want to start talking tomorrow? |
| 29 | `S0029L01B03` | मैं कल बोलने के लिए उत्सुक हूँ | I'm looking forward to speaking tomorrow |

**Not applied, because it is eight rewrites of sentences that have nothing to do with कल**, and
canon R0.3 says rewrites are reported for approval rather than applied silently — the same call the
earlier pass made about seed 167, which Kai then ruled on. The fix is a same-slot swap for a time
word already taught by that seed (`जल्द ही` *soon*, `बाद में` *later on*, `आज शाम` *this evening`),
**none of the eight carries a single clip, so it costs no audio**, and it takes the pre-seed-30
exposures of the wrong sense from eight to zero. One word from Kai and it goes in.

**The 43 after seed 30 cannot be fixed that way**, because by then कल = *tomorrow* is genuinely what
those sentences mean — seed 223's own seed sentence is *"He's going to ask you tomorrow."* The only
real fix is to **introduce bare कल = "tomorrow" as its own LEGO**, at seed 223, where it next appears
in a seed sentence in that sense. That is exactly Kai's *"when it comes up in a seed sentence,
introduce it again with the other sense"*, and it would make 43 ghost tiles real. **It costs one
round on a live course**, which means a learner-progress migration under the standing content-change
protocol — so it is his call and not mine.

### 5b. The earliest कल in the course is in a seed sentence, and fixing it costs three clips

Seed 15's own sentence is **`और मैं चाहता हूँ कि आप कल मेरे साथ अंग्रेज़ी बोलें।`** —
*"And I want you to speak English with me tomorrow."* — fifteen seeds before कल is taught at all,
and seed 15 has no LEGO covering it. Editing it would null all three of its rendered clips
(`known`, `target1`, `target2`), and **nothing on this course can be re-rendered**, so the sentence
would go silent. **Reported as a gap, deliberately not touched.**

### 5c. Still open from the earlier pass, unchanged and re-flagged

- **The 10 present-tense comparative rows** (seeds 42, 114, 117, 118): two agents have independently
  proposed that the comparative construction *is* the context — you cannot benchmark yourself against
  a night that has not happened — and nobody has ratified it. If Kai overturns it, those 10 are the
  next working set and the rule applies estate-wide.
- **777 stale introductions on this course**, and the warning that `/regenerate-presentations` uses a
  random roll rather than the judge, so running it would re-break these seven contexts.
- **`course_round_index` is stale on the last quarter of this course.** Not refreshed, not used as
  evidence here; the load-bearing invariant in the table at the top is the LEGO count, not the view.

### 5d. Two things this job found and left alone, on purpose

- **Seed 192 ships the same phrase twice.** `S0192L01B02` and `S0192L02B03` are byte-identical —
  `मैं कल रात व्यस्त हूँ` / *"I'm busy tomorrow night"* — on two different LEGOs, each with its own
  pair of target clips; and `S0192L01`'s build uses a chunk that its own seed does not teach until
  `L02`, one index later. Both predate today. Editing either would null real clips on a course that
  cannot re-render, so the duplicate is reported rather than fixed.
- **The ghost problem is far bigger than कल.** Course-wide, **1,171 phrases** carry a tile with no
  LEGO behind it that is not merely trailing punctuation. That is its own piece of work.

---

## 6. Audio — counted, none generated

| | |
|---|---|
| Introduction clips wanted | **7** (the seven pending "as in" rows) |
| Practice clips wanted | **30** (10 new drills × known/target1/target2) |
| Clip links **restored** | **4** — `S0192L02` known, target1, target2 and its introduction |
| Clip links nulled | **0** |
| Rendered `course_audio` rows deleted | **0** |
| Unrendered pending placeholders deleted | **2** (both quoted a chunk the revert removed) |
| TTS generated | **none** |
| Audio pass queued | **yes**, naming every set |

**None of these 37 clips can be rendered today, by anyone.** All four voices on this course — known,
target1, target2 and presentation — are **xAI**, and xAI is retired; phase8 passes the provider
explicitly, so a render hard-fails rather than falling back. Reported as a number, not solved.

The new drills are not new silent slots: the learner walk **drops** any phrase missing all three
clips rather than playing a gap (`phraseHasFullAudio`, `ssi-learning-app/api/courses/[code]/cycles.ts`),
and only **1,240 of 10,959** phrases on this course have all three. These join that queue and reach a
learner at the recast.

---

## 7. Every live write, and the read-back

All on production Supabase. Every changed row was re-read after the write.

1. **`S0278L02` reverted** to `कल रात सब` / *everything last night*; its nine drills re-decomposed.
2. **`S0192L02` reverted** to `कल रात` / *tomorrow night*; **nine drills restored verbatim** from the
   audit log; **four clip links re-pointed** after checking each clip speaks the right text; **two
   downstream phrases** put back to कल रात; 37 phrases re-decomposed, 0 concat mismatches.
3. **Two unrendered pending introduction placeholders deleted.**
4. **10 new USE drills inserted**, decomposed, and each asserted to concatenate; every one's कल tile
   is owned by a real LEGO (`S0192L02` or `S0167L02`) — **no new ghost**.
5. **Audio pass queued.**

Code, with tests: the judge's Frame A/B criterion, the `forceFrame` pin, and the phase8 rule that a
re-author cannot silently drop a context.

**Not done, and named as such:** the eight pre-seed-30 rewrites (§5a), the bare-कल-tomorrow LEGO at
seed 223 (§5a), seed 15's sentence (§5b), the 10 comparatives (§5c), the seed-192 duplicate (§5d).
