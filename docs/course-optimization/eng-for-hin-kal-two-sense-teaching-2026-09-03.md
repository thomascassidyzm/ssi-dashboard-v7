# eng_for_hin — teaching कल in both senses, by fixing the sense in the introduction

**Date** 2026-09-03 · **Course** `eng_for_hin` (known = Hindi, target = English), 668 seeds,
`new_app_status: live` · **All numbers re-measured today against the live DB, none inherited.**

Hindi **कल** means both *yesterday* and *tomorrow*; **कल रात** means both *last night* and
*tomorrow night*. Seven कल LEGOs debut with a cue that fixes no direction — and a LEGO's
`known_text` *is* the prompt at its debut — so the learner is asked to produce a tense the prompt
never carried.

**Kai's ruling, 2026-09-03**, is the method followed here:

> *"for the 6 bare legos, can they be attached to a sister lego with context easily? Otherwise, we
> can use the 'as in' context (already implemented, just need to make sure it kicks in and uses a
> phrase with the context in it) in the presentation… And then keep using it in only that sense…
> When it comes up in a seed sentence next, introduce it again… this time with the other sense, and
> drill the new one with phrases it works in."*

**Outcome in one line.** Two of the six कल chunks now carry their own tense marker and **no round was
deleted to do it** — the "LEGOs may not overlap" premise that made this look impossible is false, and
this course disproves it at seed 42. Of the other four, one is prepared and waiting on a single
decision from Kai and three genuinely cannot be grown; those fall back to the "as in" context, which
turned out to be broken for fifteen known languages *and* stale on this course. Both were fixed.

---

## 1. Kai's question: does the sister LEGO actually hold the tense?

> *"does the sister merge you were planning involve a sister lego that actually holds the
> past/future context? Because if they don't, it's pointless as a teaching opportunity! And whether
> it's cheap is not relevant, I don't care about losing a few phrases, just make new ones"*
> — Kai, 2026-09-03

**First, a premise that turned out to be false, and it changes the whole shape of the answer.**

Every earlier pass said the कल chunk cannot be *grown* to reach its verb, because everything in
between belongs to a sibling and **LEGOs may not overlap** — so the only move was a *merge*, which
deletes an `is_new` LEGO and therefore a round on a live course.

**This course already ships two overlapping LEGOs, on this very word.** At seed 42,
`S0042L02 के मुक़ाबले` is wholly contained inside `S0042L03 कल रात के मुक़ाबले`, both `is_new`, and the
seed **passes** the course's own gate. Re-verified today through `POST /v2/validate` with an
in-memory override, which gives the exact downstream blast radius without touching the DB.

So the कल chunk can be **grown to the tensed unit while the sister stays exactly where it is**. The
LEGO count does not change, `course_round_index` does not move, **no round is deleted and there is
no learner-progress migration.** The learner gets the sister as one rung and the grown, self-dating
chunk as the next — which is the ordinary SSi build ladder.

That removes cost from the argument entirely, exactly as Kai asked, and leaves only his question.

### The six, as a table

| seed | the sister LEGO, quoted | does it supply the tense? | verdict | why |
|---|---|---|---|---|
| **278** | `क्या आपको पूरा करना था` — *"did you have to finish"* | **Yes — करना था, past obligation** | **GROWN ✔ applied** | Sister already wraps the कल chunk, so the grown unit is the seed sentence, contiguous in both languages. All 9 existing drills already contain it; **0** phrases anywhere else tiled the old chunk. Cost: nothing at all. |
| **192** | `मैं व्यस्त हूँ` — *"I'm busy"* | **Yes — हूँ, an overt present copula** (Hindi present cannot host कल = *yesterday*) | **GROWN ✔ applied** | Same wrap. Drill set re-authored whole (8 new, every frame taught by seed 192, every one keeping हूँ); the 2 phrases elsewhere that tiled `कल रात` repaired to आज रात. |
| **167** | `आपको क्या करना है` — *"what do you need to do"* | **Yes — करना है, present obligation** | **grow-eligible, NOT applied — one decision for Kai** | Same wrap, and it qualifies on the criterion. But the grown chunk is a whole question, so its drills can only prefix or append (the 278 pattern), and growing it strips *"tomorrow afternoon"* from the learner's kit: **11 phrases in 8 unrelated seeds** would have to have their time word changed — sentences about taking a book, seeing your mother, going to the doctor, that have nothing to do with कल. Ready to go on one word from Kai; plan in §1b. |
| **42** | `ज़्यादा अच्छा महसूस करने लगा था` — *"I was starting to feel better"* | **Yes — करने लगा था, past inceptive** | **do not grow — quality, not cost** | Adjacent, and **0** downstream users, so it is free. But the grown chunk is 45 characters and seed 42 is early: only **two** sentence frames exist by then (लेकिन *but*, क्योंकि *because*). Six of its eight drills would be padding, which the canon forbids outright. The "as in" context in §3 does the job without that. |
| **30** | `आपसे पूछना` — *"to ask you"*: a **bare infinitive, no tense.** `मैं चाहता था` — *"I wanted"*: has चाहता था, but it is discontinuous and its English half sits at the **opposite end** of the sentence from *"yesterday"* | **No — not adjacently** | **no growth** | The only unit containing both is the whole sentence, and growing to it deletes standalone *"yesterday"* from the course: **104 phrases across 66 seeds** tile that chunk. कल alone is the one that most needs the "as in" fallback, and gets it. |
| **155** | `कुछ मिनट` — *"for a few minutes"*: **no tense.** `मुझे कोई आपत्ति नहीं` — *"I don't mind"*: a present frame with an **elided** copula, no overt marker at all | **No** | **no growth** | The nearest sister supplies nothing; the only thing that would is the whole sentence, three legos away, and even then the "tense" is an elision. That is precisely the pointless case. **43 phrases across 35 seeds** tile `कल सुबह`. |

**Result: 2 grown, 1 waiting on Kai, 3 on the "as in" fallback.** Not one round was deleted.

*A note on the cost figures that are no longer the point.* Job **#348** re-priced all six MERGES
against today's live state with a calibrated replica (it reproduced 622/622-passed/46-failed exactly
before it priced anything) and found every earlier figure stale — S0030L03 is 71 phrases / 43 seeds
today, not 99 / 47. Those numbers priced a *merge* — the chunk removed outright — and so do not
compare with the *growth* figures in the table above, which replace the chunk with a longer one and
keep the sister. Both are recorded so nobody reconciles two different counterfactuals. Per Kai's
ruling, neither drove a decision here.

### 1b. Seed 167, prepared and waiting

If Kai says go: `S0167L02` grows from `कल दोपहर` to `आपको कल दोपहर क्या करना है` /
*"what do you need to do tomorrow afternoon"*, keeping `S0167L01`. Drills follow seed 278's shape —
prefix (`तो` *so*, `और` *and*, `लेकिन` *but*) and append (`काम पर` *at work*, `यहाँ` *here*), because
an embedded question is unreachable in this course (the 47-row finding of 2026-09-03). The 11
downstream repairs are a same-slot swap of `कल दोपहर` for a taught, unambiguous time word — none of
them carries a single clip, so they cost no audio:

| phrase | becomes |
|---|---|
| s169 *what do you want me to do tomorrow afternoon?* | …this evening? (आज शाम) |
| s171 *do you want me to help you tomorrow afternoon?* | …this evening? |
| s171 *…help you look for it tomorrow afternoon?* | …this afternoon? (आज दोपहर बाद) |
| s175 *what do you want to do tomorrow afternoon?* | …tonight? (आज रात) |
| s179 *what are you going to do tomorrow afternoon?* | …next week? (अगले हफ़्ते) |
| s181 *I have to take that book tomorrow afternoon* | …this evening |
| s181 *I'd like to see my mother tomorrow afternoon* | …next week |
| s181 *I want to go to the doctor tomorrow afternoon* | …next month (अगले महीने) |
| s186 *…talk about the story tomorrow afternoon?* | …on Sunday morning? (रविवार सुबह) |
| s190 *do you mind if I ask you tomorrow afternoon?* | …this evening? |
| s249 *I want you to help me tomorrow afternoon* | …this afternoon |

**The one thing worth Kai's eye:** eleven sentences that have nothing to do with कल would change what
they say. That is the only reason this one was not just done.

---

## 2. Step two: does the "as in" mechanism kick in? — **It did not, for two separate reasons**

The mechanism is real. A LEGO's introduction is a `course_audio` row with `role = 'presentation'`,
rendered from the known language's template. Hindi's template is
`{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :` — जैसे is the "as in", and `{seed}`
is the context sentence. Frame B carries a context; Frame A is Frame B with the clause stripped.

### 2a. The strip was a list of languages, and Hindi was not on it

`stripSeedClause` (services/phases/presentation-author.cjs) removed the "as in" clause by matching a
hardcoded list of per-language phrasings — English `as in`, Spanish `como en`, Welsh `fel yn`,
fourteen in all. But templates are **generated per known language** by Haiku
(`getOrCreatePresentationTemplate`), so any language nobody added to the list fell through every
pattern, and only the `{seed}` placeholder itself was replaced. **The quote marks stayed.**

> **479 of eng_for_hin's 1,055 rendered introductions speak**
> `अंग्रेज़ी में — 'X' — जैसे — '' — में :`
> — *"The English for 'X', as in '', is:"*. An empty quotation, read aloud, to a learner.

Checked against every stored template: **fifteen known languages** were affected — `hin`, `jpn`,
`kor`, `cmn`, `zho`, `ben`, `guj`, `pan`, `urd`, `tam`, `tel`, `kan`, `mar`, `sin`, `aze`.

The fix is structural rather than another list entry: Frame A is the template minus everything from
the close of the `{known}` slot through the close of the `{seed}` slot, plus any particle bound to
the seed's quote with no space (Japanese `「…」のように`, Korean `'…'처럼`). The ten languages the
list already handled produce **byte-identical** output — verified against all 25 stored templates.
phase8 carried **two more inline copies** of the old list (`/prepare-presentations-scoped` and
`/regenerate-presentations`); both now call the shared function. Pinned by
`services/phases/__tests__/frame-a-strip.test.mjs`, 7 tests.

### 2b. This course's introductions are stale against its own LEGOs

Independently of the strip: **777 of 1,055** `is_new` LEGO introductions on this course quote a
Hindi chunk that the LEGO **no longer has**. The introduction text was authored 2026-06-11 and the
LEGOs were re-authored afterwards; nothing re-authors an introduction that already has a clip.

The worst case is one of ours. **S0192L02** teaches `कल रात → "tomorrow night"`, and its live clip says:

> `अंग्रेज़ी में — 'व्यस्त' — जैसे — 'मैं अगले हफ्ते व्यस्त हूँ।' — में :`
> *"The English for 'busy', as in 'I'm busy next week', is:"* … answer: **tomorrow night**.

Others in the same family: `S0030L03` (LEGO `कल`, intro says `कल को`), `S0012L03` (LEGO
`कल क्या होगा`, intro says `कल आगे क्या होगा`), `S0167L02` (context
`मुझे बहुत खुशी है कल दोपहर` — a verbless fragment that pins nothing).

**This is the reason the contexts below were authored by hand rather than left to a regeneration.**
The 777 are a course-wide defect well outside this brief; they are reported, not fixed.

---

## 3. Steps three and four: one sense established, then the other reintroduced

Seven introductions authored. **Every context sentence is already-live course text** — that seed's
own sentence or one of that LEGO's own practice phrases — so no Hindi was invented and the known
side stays a controlled language by construction. Each was checked to still exist in the DB, to
contain the chunk, and to sit under the engine's own chunk/context overlap limit.

| seed | LEGO | chunk → answer | sense | context now spoken in the introduction | what pins it |
|---|---|---|---|---|---|
| 12 | S0012L03 | कल क्या होगा → *what's going to happen tomorrow* | future | मैं यह अंदाज़ा नहीं लगाना चाहूँगा कि कल क्या होगा। | होगा, inside the chunk |
| **30** | S0030L03 | कल → *yesterday* | **past — the sense is established here** | मैं कल आपसे कुछ पूछना चाहता था। | चाहता था |
| 42 | S0042L03 | कल रात के मुक़ाबले → *than last night* | past | मैं कल रात के मुक़ाबले ज़्यादा अच्छा महसूस करने लगा था। | करने लगा था |
| **155** | S0155L04 | कल सुबह → *tomorrow morning* | **future — the reintroduction** | मैं कल सुबह मिलना चाहूँगा। | चाहूँगा |
| 167 | S0167L02 | कल दोपहर → *tomorrow afternoon* | future | क्या आप कल दोपहर जाना चाहते हैं? | चाहते हैं |
| 192 | S0192L02 | कल रात → *tomorrow night* | future | मुझे कल रात जाना है। | जाना है — **superseded: this chunk has since been GROWN to `मैं कल रात व्यस्त हूँ` and dates itself** |
| **278** | S0278L02 | कल रात सब → *everything last night* | **past — both senses now in play** | क्या आपको कल रात सब पूरा करना था? | करना था — **superseded: this chunk has since been GROWN to the full question and dates itself** |

**Two of these seven have since been superseded by the growths in §1** — seeds 192 and 278 no longer
need an "as in" context, because the chunk the learner is prompted with now carries its own tense
marker. Their contexted introductions were left in place as pending rows (nothing is deleted here)
and a Frame A introduction quoting the grown chunk was authored beside them. The remaining five —
seeds 12, 30, 42, 155, 167 — are the live "as in" set.

**The collisions, stated deliberately.** Kai authorised these: *"won't matter that it causes a ZUT —
because we're handling it."*

- **कल रात is taught in both directions** — *tomorrow night* at seed 192 (S0192L02), *last night*
  inside `कल रात सब` at seed 278 (S0278L02), 86 seeds later. Both now carry their own context.
- **कल alone is *yesterday* (seed 30) while कल सुबह / कल दोपहर / कल रात are all future.** These are
  different chunks, so no gate objects; the learner's ear is what needed the fix, and now has it.
- **Note the true ordering, which is not what the brief assumed.** The first कल in the course is
  seed 12, and it is *future* — bound inside `कल क्या होगा`, whose own होगा fixes it, and which is
  never answerable alone. The first **bare** कल is seed 30, and it is past. And seed 42's कल रात
  is *last night* — **consistent** with seed 30, not in contradiction with it. The contradiction the
  brief describes is real but runs the other way: seed 192 introduces कल रात as *tomorrow night*
  after seed 42 has already used it as *last night*. Both ends are now contexted.

### Make-before-break, in full

Each line was written as a **pending** `course_audio` row **beside** the existing one.
**No `course_legos.presentation_audio_id` was moved and nothing was deleted** — verified after the
write, `linksUnchanged: true`. This is exactly the shape phase8's own `[MakeBeforeBreak]` block
uses: the learner keeps hearing the old introduction, stale words but audible, until `/generate`
renders the replacement, passes it through the veracity gate and rebinds the link itself.

---

## 4. Step five: drilling

Every one of the seven कल LEGOs already sat at **the course norm of 8** build+use phrases — 1,279 of
1,337 `is_new` LEGOs are at 8, 47 are at 9, two at 10. Containment was clean on all seven.

**A single LEGO cannot drill both senses, and this is structural rather than a shortage of ideas.**
A practice phrase must *contain* its LEGO's target text (`runSeedChecks`, containment check), and for
these LEGOs the target text **is** the direction — *"tomorrow morning"*, *"everything last night"*.
So both senses can only ever be drilled **across rounds**, which is what the sequence in §3 does.

Four new USE drills were added for the reintroduced sense and for the LEGO where the two senses meet,
taking those LEGOs 8 → 9 (inside live precedent; **no LEGO added or removed, so no round moved**):

| LEGO | new phrase | English | sense |
|---|---|---|---|
| S0155L04 | क्या आप कल सुबह बात करना चाहते हैं? | do you want to speak tomorrow morning? | future |
| S0167L02 | मुझे कल दोपहर इंतज़ार करने में कोई आपत्ति नहीं। | I don't mind waiting tomorrow afternoon | future |
| S0192L02 | मुझे कल रात इंतज़ार करने में कोई आपत्ति नहीं। | I don't mind waiting tomorrow night | future |
| S0278L02 | क्या आपको कल रात सब जल्दी पूरा करना था? | did you have to finish everything last night quickly? | past |

Each was gate-tested before writing: containment, target vocabulary against the cumulative set at
that seed, ZUT against every known prompt in the course, duplicate check, and known-side words all
already met in the course prefix. Decompositions were computed with the course's own writer and
asserted to concatenate back to the target text exactly — the player's Strategy-0 guard.

---

## 5. Step six: does every कल sentence carry its own context? — one more found and fixed

The 2026-09-03 pass before this one rewrote 13 practice phrases to satisfy Kai's rule. Job **#346**
re-verified that claim independently today against the live DB, **reading all 344 कल-bearing rows**
(15 seeds, 12 LEGOs, 317 practice phrases) rather than classifying them by regex.

**It found one genuine miss, now fixed.** `eng_for_hin:S0074L01U02`:

> कल समझने में मेरी मदद करने के लिए बहुत-बहुत शुक्रिया। — *"thank you very much for helping me to
> understand yesterday"*

The frame is a bare nominal — करने के लिए … शुक्रिया, "thanks for X-ing" — with **no finite verb
anywhere**, so nothing in the Hindi fixes the direction. The earlier pass had *declared* this one a
judgement call ("a gratitude frame is compliant — thanking is retrospective by construction"); #346,
reading it cold, called it ambiguous, because thanking in advance is idiomatic in both languages.
Two readings, so the safer one wins.

**Fixed on the precedent of seed 305** in that same earlier pass: the LEGO being taught is
`समझने में मेरी मदद करने के लिए → "for helping me to understand"`, and कल is an **incidental
adverbial** in a slot the seed's other seven phrases fill with आज / यहाँ / अंग्रेज़ी में / आज सुबह /
पिछले हफ़्ते. It is now **पिछले महीने → "last month"** — taught at seed 37, unambiguously past, not
already used in this LEGO's set, and re-teaching no कल sense by proxy. The row carried **no clips at
all**, so the edit dropped nothing; decomposition rewritten and asserted to concatenate.

**#346 also found zero Hindi/English direction disagreements** across all 344 rows — including the
reported-speech and embedded-clause cases, which it traced individually rather than assuming the
outer verb governs.

### One rule for Kai to ratify or overturn

#346 independently reached the **same** judgement the earlier pass had flagged for Kai, on the **same
10 rows**: present-tense comparative frames (`X के मुक़ाबले बेहतर बोलता हूँ`, `कल से बुरा कर रहा हूँ`)
carry no tense marker, but you cannot presently benchmark yourself against a night that has not
happened — so the comparative construction *is* the context.

Two independent readings agreeing is worth something, but neither is Kai's. **If he overturns it,
those 10 rows (seeds 42, 114, 117, 118) are the next working set**, and the rule would apply
estate-wide to every present-tense "than / compared to" construction, not just these.

---

## 6. Measured, before and after — the whole day's work

Baseline taken by me at the start, re-taken after every write. The course changed under this job
(another pass re-authored phrases at 10:47), which is why nothing here is quoted from an earlier report.

| | before | after |
|---|---|---|
| `POST /api/v2/validate/eng_for_hin` — seeds passed | 622 | **622** |
| seeds failed | 46 | **46** |
| failing seed **set** | — | **identical: 0 newly failing, 0 newly passing** |
| `course_legos` | 1,489 | **1,489 — no LEGO row inserted or deleted, no `is_new` flag touched** |
| `course_round_index` rows | 1,321 | **1,321** (corroborating only — see the caveat below) |
| phrases losing tileability | — | **0** |
| decompositions concatenating back to `target_text` | 10,915 / 10,915 | **10,918 / 10,918, 0 mismatched** |
| `course_practice_phrases` | 10,945 | 10,948 |
| `course_audio` presentation rows | 2,964 | 2,973 (+9, all pending) |
| rows deleted | — | 9 (seed 192's superseded drill set, replaced in the same run) |
| कल prompts with no internal tense context | 1 (seed 74) | **0** |
| bare कल LEGO debut cues | 6 | **4** — 278 and 192 now carry their own tense |

**On the round evidence, stated precisely.** The load-bearing invariant is the first row, not the
second: rounds are a walk over `is_new` LEGOs, and no LEGO was inserted, deleted or flipped. The
`course_round_index` count corroborates it but is **not** a trustworthy census on this course — see
§7.6, where it is 62 rows short from seed 483 onward and carries 40 rows for LEGOs that no longer
exist. That staleness pre-dates this work and is untouched by it: all six कल LEGOs sit in the covered
early range and every one has a round row (83, 116, 377, 399, 448, 629).

**Writes, all on production Supabase, all re-read after the write:**
1. Seven "as in" introductions authored as pending rows; `linksUnchanged: true`.
2. Four second-sense drills added (LEGOs 8 → 9 phrases).
3. Seed 74's verbless gratitude phrase rewritten (`कल` → `पिछले महीने`).
4. **`S0278L02` grown** to `क्या आपको कल रात सब पूरा करना था`; 9 drills re-decomposed; full sweep
   unchanged at 622/46.
5. **`S0192L02` grown** to `मैं कल रात व्यस्त हूँ`; its 9 drills replaced with 8 authored ones; the 2
   downstream phrases that tiled the old chunk repaired to आज रात; 19 phrases re-decomposed; full
   sweep unchanged at 622/46.

### Audio — counted, none generated

| | |
|---|---|
| Presentation clips now wanted | **9** |
| Practice clips now wanted | **12** (4 new drills) + **24** (8 re-authored seed-192 drills) |
| Clip links nulled by the growths | **5** — `S0192L02` known/target1/target2, and its presentation link (nulled by the DB's own text-change trigger, not by this job) |
| Clip links dropped elsewhere | **0** — every other row touched carried no clips at all |
| `course_audio` rows deleted | **0** |
| TTS generated | **none** |
| Audio pass queued | **yes**, naming each set |

**None of these clips can be rendered today, by anyone.** All four voices on this course —
known, target1, target2, presentation — are **xAI**, and xAI is retired; phase8 passes the provider
explicitly, so a render hard-fails rather than falling back. Reported as a number, not solved.

**One honest regression to name.** Growing `S0192L02` nulled its known clip and its presentation
link, so that LEGO's debut is **silent** until the recast, where before it was audible-but-wrong (the
old introduction said *"the English for 'busy'…"* and answered *"tomorrow night"*). Everything else
touched was already silent: only **1,240 of 10,948** phrases on this course (11.3%) have all three
clips, and the learner walk **drops** the rest (`phraseHasFullAudio`,
`ssi-learning-app/api/courses/[code]/cycles.ts`) rather than playing a gap.

---

## 7. What is still open

1. **Seed 167** — grow-eligible on Kai's criterion, fully prepared in §1b, waiting on one word from
   him because it changes what eleven unrelated sentences say. Nothing else about it is unresolved.
2. **777 stale introductions on this course.** Out of scope here, and the largest thing found. A
   course-wide `/regenerate-presentations` would recompute them all — but it uses a **random roll**
   (~15–30% get no context at all) rather than the Frame A/B judgment agent the redesign specified
   and which `/generate` actually calls. Running it would fix 777 chunk mismatches and could
   re-break these seven कल contexts. **Do not run it on this course without re-authoring the seven.**
3. **Three templates still read oddly after the strip fix** — `tam` (`'{known}' போல்.`), `sin`
   (`'{known}' ඉතින්.`), `aze` (`'{known}' kimi budur:`) keep a space-separated word left over from
   the "as in" clause. No longer an empty quotation, but they want a native reading before anyone
   calls them correct.
4. **`course_round_index` is stale on the last quarter of this course** — found by job #348 while
   re-pricing, verified independently here. **62** `is_new` LEGOs from **seed 483 onward** have no
   round row at all; **40** round rows point at LEGOs that no longer exist and **6** at LEGOs since
   flipped to `is_new = false`. (62 − 46 = the 16-row gap against 1,337 `is_new` LEGOs.) The learning
   app's `round-map.ts` reads this materialised view, so this is worth someone's attention on its own
   account. The documented remedy is `REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index` —
   **not run here**, because refreshing it renumbers rounds on a live course, which is exactly the
   learner-progress migration this whole job was avoiding. Kai's call.
5. **The 10 comparative rows** above — a rule two agents have now proposed and nobody has ratified.
6. **Seed 155 still ships three byte-identical USE phrases** (`मुझे कल सुबह इंतज़ार करने में कोई
   आपत्ति नहीं।` ×3), noted by the previous pass and still true. Not a कल ambiguity, not touched.
