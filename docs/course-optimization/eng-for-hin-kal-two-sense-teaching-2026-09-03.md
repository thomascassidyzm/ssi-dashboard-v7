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

**Outcome in one line.** The merges are all still priced in rounds, so none were done — but the
"as in" mechanism turned out to be broken for fifteen known languages *and* stale on this course,
and both were fixed: seven introductions now carry a hand-chosen context that pins the direction,
four second-sense drills were added, and the code no longer speaks an empty quotation aloud.

---

## 1. Step one: can any of the six be attached to a sister LEGO cheaply? — **No, and here is why**

Hindi is verb-final. Every span between कल and the verb that would fix its tense is already owned by
a sibling LEGO, so growing the chunk either **overlaps** a sibling or leaves a **gap** — both banned.
The only compliant move is a **merge**, and a merge removes one `is_new` LEGO.

**One `is_new` LEGO is exactly one round.** Verified, not assumed: `course_round_index` holds
**1,321 rows** for this course, one per `(lego_id, seed_number, lego_index)`, indexed by
`round_index`. Deleting a LEGO deletes its row and shifts every later `round_index` — a learner
progress migration under the standing content-change protocol.

My brief says: *if it would delete a round, STOP and report rather than doing it.* So **no merge was
performed**, including the two cheap ones. Job **#348** is re-pricing all six against today's data
(the course changed under us: `course_practice_phrases` was 10,947 this morning and 10,945 when I
took my baseline). The earlier pricing, for reference and **not to be quoted as current**:

| LEGO | chunk | phrases that stop tiling | newly failing seeds | round cost |
|---|---|---|---|---|
| S0030L03 | कल | 99 | 47 | 1 |
| S0155L04 | कल सुबह | 45 | 32 | 1 |
| S0167L02 | कल दोपहर | 13 | 9 | 1 |
| S0192L02 | कल रात | 6 | 5 | 1 |
| S0042L03 | कल रात के मुक़ाबले | 3 | 1 | 1 |
| S0278L02 | कल रात सब | 0 | 0 | 1 |

**S0278L02 and S0042L03 remain the two cheap ones and are Kai's to call.** Say the word and each is
a short job — but each costs a round, and that is the whole of the decision.

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
| 192 | S0192L02 | कल रात → *tomorrow night* | future | मुझे कल रात जाना है। | जाना है |
| **278** | S0278L02 | कल रात सब → *everything last night* | **past — both senses now in play** | क्या आपको कल रात सब पूरा करना था? | करना था |

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

## 6. Measured, before and after

| | before | after |
|---|---|---|
| `POST /api/v2/validate/eng_for_hin` — seeds passed | 622 | **622** |
| seeds failed | 46 | **46** |
| failing seed **set** | — | **identical, 0 newly failing, 0 newly passing** |
| `course_round_index` rows | 1,321 | **1,321** |
| phrases losing tileability | — | **0** |
| decompositions concatenating back to `target_text` | 10,915 / 10,915 | **10,919 / 10,919, 0 mismatched** |
| `course_practice_phrases` | 10,945 | 10,949 (+4) |
| कल prompts with no internal tense context | 1 (seed 74) | **0** |
| `course_audio` presentation rows | 2,964 | 2,971 (+7) |
| `course_legos.presentation_audio_id` moved | — | **0** |
| rows deleted | — | **0** |

### Audio — counted, none generated

| | |
|---|---|
| Presentation clips now wanted | **7** (one per authored introduction) |
| Practice clips now wanted | **12** (4 phrases × known + target1 + target2) |
| Clip links dropped or nulled by this work | **0** |
| `course_audio` rows deleted | **0** |
| TTS generated | **none** |
| Audio pass queued | **yes**, twice, naming both sets |

**None of these 19 clips can be rendered today, by anyone.** All four of this course's voices —
known, target1, target2 and presentation — are **xAI**, and xAI is retired; phase8 passes the
provider explicitly, so a render hard-fails rather than falling back. That is a standing estate
condition Kai holds, reported here as a number, not solved.

For scale: only **1,240 of 10,945** practice phrases on this course (11.3%) currently have all three
clips, and the learner walk **drops** any phrase missing them (`phraseHasFullAudio`,
`ssi-learning-app/api/courses/[code]/cycles.ts`). The four new drills join that queue — they are not
new silent slots, and they reach a learner the moment the course is recast.

---

## 7. What is still open

1. **The six merges are unpriced-for-today and undone** — pending job #348, and then Kai's call.
   Each costs one round.
2. **777 stale introductions on this course.** Out of scope here, and the largest thing found. A
   course-wide `/regenerate-presentations` would recompute them all — but it uses a **random roll**
   (~15–30% get no context at all) rather than the Frame A/B judgment agent the redesign specified
   and which `/generate` actually calls. Running it would fix 777 chunk mismatches and could
   re-break these seven कल contexts. **Do not run it on this course without re-authoring the seven.**
3. **Three templates still read oddly after the strip fix** — `tam` (`'{known}' போல்.`), `sin`
   (`'{known}' ඉතින්.`), `aze` (`'{known}' kimi budur:`) keep a space-separated word left over from
   the "as in" clause. No longer an empty quotation, but they want a native reading before anyone
   calls them correct.
4. **The 10 comparative rows** above — a rule two agents have now proposed and nobody has ratified.
5. **Seed 155 still ships three byte-identical USE phrases** (`मुझे कल सुबह इंतज़ार करने में कोई
   आपत्ति नहीं।` ×3), noted by the previous pass and still true. Not a कल ambiguity, not touched.
