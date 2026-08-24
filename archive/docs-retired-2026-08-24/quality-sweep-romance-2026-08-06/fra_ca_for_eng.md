# Quality sweep — `fra_ca_for_eng` (Quebec French for English speakers)

**Date:** 2026-08-06 · **Course status at start:** `draft` / `new_app=draft` / visibility **HIDDEN** —
never switched on for learners · **668 seeds, 1,366 LEGOs, 12,887 practice phrases**

All counts below are read from the **live database via the service key**, not from any doc in this repo.

---

## 0. Headline

The course text is **good**. Quebec forms (`chu`, `j'vas`, `à matin`, `ptit`, `vous-autres`,
`tu veux-tu`) are genuine and consistent, the early seeds are craftsmanship, and the
USE-outranks-BUILD invariant holds in **1,339 of 1,350** LEGOs.

**But there is one decisive reason this course cannot go live as it stands, and it is audio, not text:
406 of its 1,359 presentation clips announce a gloss that no longer matches the LEGO they are attached
to.** Root cause proven below. I cannot fix it — it needs a TTS re-bake, which is under hold.

I fixed **45 rows** of real text defects and left a clearly-reasoned list of what I deliberately did not
touch.

---

## 1. WOULD ANYTHING JUSTIFY THE HOLD-BACK? — yes, one thing, and I found its exact cause

The coordinator flagged presentation drift as a candidate. It is not just a candidate; it is the answer,
and the cause is precise.

### The finding

| | |
|---|---|
| LEGOs with presentation audio | 1,359 |
| Clip announces exactly the LEGO's `known_text` | 953 (70.1%) |
| **Clip announces a DIFFERENT gloss** | **406 (29.9%)** |
| — severe (no lexical overlap, e.g. LEGO `"he didn't want"` / audio says `"dog"`) | 243 |
| — mild (article/inflection, e.g. LEGO `"my daughter"` / audio says `"daughter"`) | 163 |

*(The coordinator's figure was 275. Mine is 406 on the same data. My detector extracts the quoted gloss
from both clip formats — `The French for: 'X', is:` (547 clips) and
`The French for: 'X', as in — 'Y', is:` (412 clips) — and compares it to `known_text` after
case/punctuation normalisation. Every one of the 1,359 clips parsed; none were skipped. I hand-checked a
29-item spread across the whole seed range and all 29 were genuine.)*

### The cause, proven three ways

**(a) The drift is perfectly bounded by seed number.**

| Seed band | LEGOs w/ pres. audio | Drifted |
|---|---|---|
| S1–S299 | 638 | **405** |
| S300–S349 | 97 | 1 |
| **S350–S668** | **624** | **0** |

**(b) The drifted clips quote seed sentences that are not in this course any more.** S0003L03 is
`"as often as possible"`; its clip says *"The French for: 'often', as in — 'I'm trying to learn often',
is:"* — but S0003's actual sentence is *"how to speak as often as possible"*. Of the drifted clips
that carry an example sentence, only 72 quote the seed's current English; **203 quote a different
sentence entirely**.

**(c) The dates close it.** Every seed in the course was **re-decomposed on 2026-07-16/17**
(`decomposed_at`, all 668). Presentation clips for S301+ were all created **2026-07** — after the
re-decomposition — and drift is **zero**. Of the S1–S300 clips, 541 were created **2026-04** and only 98
in 2026-07. And:

> **All 406 drifted clips were created in 2026-04. Zero were created in 2026-07.**

**Conclusion: the course was re-decomposed in July 2026; seeds 301–668 had their presentation audio
re-baked, seeds 1–300 did not.** The learner-visible *opening* of the course — the first 300 seeds, the
part every learner hits first — announces the *previous* decomposition. That is a sufficient reason to
hold the course, it is real today, and it is fixed by one re-bake of the ~541 April clips in S1–S300, not
by any text edit.

### Also confirmed: grammar annotations are spoken aloud

I checked the actual clip text. The parenthetical tags are **baked into the TTS verbatim** — the learner
literally hears:

- `"The French for: 'you feel (formal)', is:"`
- `"The French for: 'special (plural)', is:"`
- `"The French for: 'what (question)', is:"`

19 LEGOs. This is learner-facing, not a data-only annotation.

### "The French for:" on a Quebec course

Reported, not fixed, as instructed. **All 1,359** presentation clips say *"The **French** for:"* while the
course display name is *Quebec French for English Speakers* — and the course's own practice phrases
translate "French" as **`québécois`** throughout (`"i don't need to speak French"` → `"j'ai pas besoin de
parler québécois"`, 40+ rows). So the course teaches the learner to call the language *québécois* while
every presentation clip calls it *French*. It is internally inconsistent, but it is 1,359 clips and it is
a naming decision for Kai, not a defect I should unilaterally rewrite.

---

## 2. STRUCTURAL FINDINGS — verified by hand, false positives separated

### Calibration (stated, as required)

- **ZUT detector.** Known positive supplied by the coordinator: `"i know"` → `j'sais` (S0059L01) vs
  `j'connais` (S0085L02). My scan **returned it**, alongside 8 others. Calibrated.
- **Unicode boundaries.** I used `(?<!\p{L})…(?!\p{L})` with `/u` everywhere, never `\b`. Sanity check on
  the trap itself: `\bconnaît\b` returns **0** matches on this course; `(?<!\p{L})connaît(?!\p{L})`
  returns **28**. The trap is live in this course and my detectors avoid it.
- **Presentation detector** calibrated on S0039, the coordinator's worked example: it reproduced both
  `S0039L01 "i'm"` → audio says `"tired"` and `S0039L02 "tired"` → audio says `"this morning"`.

### ZUT

Raw scan over LEGOs + phrases + seeds: **168 known prompts with >1 target**. Reporting that number would
be dishonest — **159 of them are component sub-glosses**, the documented top false-positive class
(`"the"` → `la`/`le`/`l'`/`les`, `"my"` → `mon`/`ma`/`mes`). Components are never drilled bare.

**Excluding components: 9 conflicts.** I adjudicated all 9 by hand.

| Prompt | Verdict |
|---|---|
| `"when"` → `quand` vs `"when...?"` → `quand est-ce que` | **FALSE POSITIVE** — my own normaliser strips the `...`; the DB strings differ. Checked consistency: **61 rows use `quand`, 0 crossovers** between the plain and question forms. The split has a reason and is honoured. Not touched. |
| `"i know"` → `j'sais` vs `j'connais` | **REAL** — see §3, fixed |
| `"she told me"` → `a m'a dit` vs `a me l'a dit` | **REAL** — second carries an unglossed *it*. Fixed |
| `"with you all"` → `avec vous` vs `avec vous-autres` | **REAL** — fixed at the seed |
| `"how do you feel"` → `comment tu te sens` vs `comment vous vous sentez` | tu/vous **person variation** — explicitly *not* a ZUT conflict per the rules. Left |
| `"worrying about it"` → `s'en faire` vs `ça donne rien de s'en faire` | **REAL** — English omitted "there's no point". Fixed |
| `"do you want to go today"` → `tu veux-tu aller…` vs `voulez-vous partir…` | **REAL** — fixed |
| `"do you understand this word"` → `tu comprends ce mot-là` vs `tu comprends-tu ce mot` | **REAL** — fixed |
| `"my friend used to work in an office"` (phrase vs seed) | **REAL** — see §3 F. Fixed |

**After my fixes, the same scan returns 4** — and all 4 are the `...`-normaliser artefact or the tu/vous
person pair. **Zero real conflicts remain.**

### The coordinator's other lists, hand-checked

- **Identical `known_text == target_text` (4 LEGOs, 18 phrases): all FALSE POSITIVES.** `bus`, `six`,
  `minutes`, `surprise`, `patient`, `questions`, `football`, `party`, `chance`, `fun`, `arrangements`,
  `jane` — every one is a real French/Quebec cognate or a proper name. Nothing to fix. The coordinator's
  suspicion was right.
- **Parentheticals (19) — mostly NOT strippable, and I explain why below.** Fixed 2 of 19 plus 7 drilled
  phrase rows; the rest are genuine disambiguators whose removal would mint ZUT conflicts (§4).
- **Slashes (1): REAL, fixed.** `S0593L03 "still/anyway"` → `"still"`, per §8's rule (read the seed
  sentence: *"however much I argued I **still** had to share"*). Confirmed `"still"` was not already in
  use as a prompt.
- **Underpopulated LEGOs (124):** confirmed none are empty; left alone as instructed.

---

## 3. WHAT HAND-READING FOUND THAT NO STRUCTURAL CHECKER COULD

I read ~35 seeds in full (seed row + LEGOs + every component/build/use phrase) spread deliberately across
the range — **early:** 5, 18, 34, 39, 45, 51, 59, 79, 85; **middle:** 160, 174, 199, 220, 283, 340, 367,
400; **late:** 438, 451, 470, 480, 492, 493, 508, 530, 578, 593, 631, 639, 642, 643, 644, 645, 650, 656,
657, 664, 668. Plus I read **all 264 rows** containing a form of *connaître* and every parenthetical row.

### 🔴 Finding 1 — `connaître` used with a clause complement. 24 rows. **This is the big one.**

Reading S0085 by hand I noticed `"I know the answer"` → `"j'connais pas la réponse"` and went looking.
The phrase generator applied a stock frame `I know ___` → `j'connais ___` mechanically, including to
LEGOs whose content is a **subordinate clause or an interrogative complement**. French does not allow
this: *connaître* takes a direct object (a person, a place, a thing) and **never** a clause. `savoir`
does.

Every one of these was live and wrong:

- `"I know what he should do"` → `j'connais ce qu'y devrait faire` (S438)
- `"I know what they wanted to do"` → `j'connais ce qu'y voulaient faire` (S451)
- `"I know what he says"` → `j'connais ce qu'y dit` (S480)
- `"I know which one"` → `j'connais laquelle` (S492)
- `"I know what is it that's happening"` → `j'connais qu'est-ce qui arrive` (S493)
- `"I know how high"` → `j'connais jusqu'à quelle hauteur` (S470)
- `"I know which of your friends"` → `j'connais lesquels de tes amis` (S283)

**Sweep vs hand-check, reported separately as required:**

| | |
|---|---|
| Rows containing any *connaître* form | 264 |
| Raw detector hits (*connaître* followed by a clause **or** an abstract fact-noun) | 45 |
| **Hand-confirmed categorically wrong** (clause / interrogative complement) | **24** |
| Rejected as false positives | 21 |

The 21 rejects were mine to catch, not the regex's: `j'connais un magasin où j'peux acheter ça`
(*where* attaches to *magasin*, a legitimate object), `j'connais quelqu'un qui a dit…` (object =
*quelqu'un*), and `tu finis par ben connaître quelqu'un quand vous travaillez ensemble`. All correct
French.

**A separate ~8 rows I judged BORDERLINE and did NOT fix:** `j'connais pas la réponse` /
`la vérité` / `la meilleure façon` (S85, S94, S128, S233, S290, S370, S408). *savoir* is more natural
here, but *connaître la vérité* and *connaître la réponse* are attested French. Not wrong enough to
justify the edit and the audio cost. Listed so Kai can overrule.

**Fix, and why it is safe:** replaced the verb only — `j'connais` → `j'sais`, `tu connais-tu` →
`tu sais-tu`. `j'sais` debuts at **S0059L01**, far before the earliest affected seed (283), so there is
no forward reference. The colloquial `tu VERB-tu` interrogative frame is taught from **S0014** onward
(`tu parles-tu`, `tu vas-tu`, `tu veux-tu`), so `tu sais-tu` is a form the learner can already build. No
LEGO needed changing — every one of the underlying LEGOs (`"what he should do"` → `ce qu'y devrait
faire`, etc.) is **correct**; the defect was purely in the wrapper phrases.

### 🔴 Finding 2 — the bare `j'connais` tile is not French

`S0085L02` taught `"I know"` → `"j'connais"`, and drilled it **bare** in a build phrase. Standing alone,
`je connais.` is not something a French speaker says — *connaître* is obligatorily transitive. It also
collided with `S0059L01 "i know"` → `j'sais`.

The seed itself is negative (*"I don't know those people"* / `J'connais pas ce monde-là`), and I checked
the shipped sibling **`fra_for_eng`**, which has the *identical* structure and solves it the same way:
its `S0085L01` is glossed `"I don't know"` → `je ne connais pas`.

Fixed to match: `"I don't know"` → `"j'connais pas"`, components corrected to
`I`→`j'` / `don't know`→`connais pas`. The two builds drilling the bare affirmative
(`"I know"` → `j'connais`, `"I know now"` → `j'connais là` — the latter is not idiomatic either) were
rewritten to `"I don't know your friend yet"` / `"I don't know those people yet"`, both staying in
genuine *connaître* territory and using only vocabulary already introduced at or before S0085. I verified
neither duplicates an existing use phrase in that seed, and that the seed's phrase count was unchanged
(21 before, 21 after — the "editing a LEGO vaporises its phrases" hazard did not fire).

### 🟠 Finding 3 — the formal-`vous` block is drilled with **plural** English

Seeds 639–655 teach the polite singular *vous* (their seeds are `with you **sir**`, `how do you feel
**madam**?`). But their practice phrases say **"you all"**:

- S0639 build `"with you all"` → `avec vous`
- S0642 `"you all feel tired"` → `vous vous sentez fatigué` — the English is plural and the French
  adjective is **singular**

Meanwhile seeds 656–668 teach the *actual* plural, `vous-autres`, glossed **"you guys"**. So `"you all"`
was pointing at two different targets.

**Where the real inconsistency was:** at S0656, the **LEGO says "you guys"** and **all ten of its
practice phrases say "you guys"** — only the **seed row itself** said "you all". One row against eleven.
That is the island, so I fixed the seed to `"with you guys"`, which resolves the collision in the
direction the course had already chosen everywhere else.

**What I deliberately did NOT do:** I did not rewrite S0639/S0642's LEGO-1 phrases to carry *sir*/*madam*.
`monsieur` debuts at **S0639L02** and `madame` at **S0642L02** — i.e. as *later siblings of the same
seed*. Using them at LEGO 1 would be a forward reference, which the rules ban outright. I flagged them
instead. Fixing these properly requires reordering those two seeds, which is a bigger decision than a
sweep should take.

### 🟠 Finding 4 — the back half of the course is markedly more formulaic

This is a quality observation, not a defect, and it is the clearest thing hand-reading turned up after
Finding 1. Reading S0530 and S0578 next to S0018 and S0039, the late seeds are visibly template-built
from a small fixed kit of lead-ins (`peut-être que…`, `j'ai entendu que…`, `chu sûr que…`,
`j'pense que…`) and adverb tails (`encore`, `aujourd'hui`, `tout de suite`, `là-bas`, `probablement`).

Measured across all 11,007 non-component phrases:

| Seed band | phrases using the canned frame kit |
|---|---|
| S1–S200 | 246 / 3,701 = **6.6%** |
| S201–S400 | 191 / 2,885 = **6.6%** |
| **S401–S668** | **1,129 / 4,421 = 25.5%** |

Nearly **4× the reliance** on canned framing in the last 268 seeds. Compare S0018 (*"we want to meet at
six o'clock this evening"*, phrases about meeting people and coming back tomorrow) with S0578
(*"that's warm over there"*, *"that's probably warm"*, *"I heard that it's warm again"*, *"maybe that's
warm today"*, *"that's warm right now"* — five USE phrases that are one adjective plus a rotating
adverb). Not wrong; noticeably thinner. Too large to fix in this pass and it is an authoring decision,
so: reported.

### 🟡 Finding 5 — subjunctive after `peut-être que`

S0530 USE: `"maybe I can count them"` → `peut-être que j'**puisse** les compter`. `peut-être que` takes
the **indicative**. The LEGO teaches `"i'm able to"` → `j'puisse` correctly *inside* its `pour que`
frame, and the generator reused it in a frame that doesn't license the subjunctive. Swept the course:
**exactly 1 occurrence**. Fixed to `j'peux`.

### 🟡 Finding 6 — a seed whose English can't produce its own target

S0199 seed: `"my friend used to work in an office"` → `Mon ami travaillait dans un bureau **dans le
temps**`. `dans le temps` ("in those days") is introduced by this seed's own **L03** — but the English
prompt contains nothing corresponding to it. The learner cannot know to add it. `"used to"` is already
carried by the imperfect *travaillait*.

Swept: 17 rows contain `dans le temps`; **16 have an English counterpart** ("in the past", "then", "back
then"). S0199 was the only one. Fixed the seed and its matching build phrase.

**A note on a sweep that did NOT hold up.** I generalised Finding 6 into "LEGO glosses whose words are
entirely absent from their seed's English" and got **96 hits — and ~90% are false positives.** LEGO
glosses are *deliberately* worded differently from the seed's natural English so the prompt is
unambiguous: `"to chat"` vs seed's *"have a conversation"*, `"truly"` vs *"definitely"*, `"elsewhere"`
vs *"somewhere else"*, `"I was aware"` vs *"I knew"*. That is the methodology working. I am reporting
the detector as **unreliable** rather than reporting its count.

### ✅ Checks that came back clean — worth saying out loud

- **USE outranks BUILD** in **1,339 of 1,350** LEGOs (mean target length). Methodology not inverted.
- **Quebec forms are correct and consistent.** `chu`, `j'vas`, `à matin`, `à soir`, `icitte`, `asteure`,
  `ben`, `faque`, `tantôt`, `ptit`, `char`, `job`, `vous-autres`, `tu veux-tu`. I did not "correct" any
  of these and they are not defects.
- Early seeds (1–60) read as genuinely well-authored. S0018, S0034, S0039, S0045 are good work.

---

## 4. FOUND BUT NOT FIXED — with reasons

### 🔴 401 direct questions with no question mark — the largest consistency defect in the course

Detector: English begins with an auxiliary/interrogative **and** the target is in an unambiguously
interrogative form (`-tu`, `-vous`, `est-ce que`, inversion). **810 such rows exist. 409 carry a `?`.
401 carry none on either side.** Spread across **110 seeds**, from S0014 to S0665: 46 LEGO rows, 2 seed
rows, 353 build/use phrases. Examples: `"do you speak French"` → `tu parles-tu québécois`,
`"did you go home yesterday"` → `es-tu allé chez vous hier`.

So the course punctuates the *same construction* both ways, roughly 50/50. By Kai's own first rule this
is the biggest consistency failure I found.

**I did not fix it, deliberately.** Adding `?` is an **audio-affecting** change — it changes TTS
intonation, so per the rules every one of those 401 rows would have to be unlinked. That is **~1,200
audio links nulled**, and the great majority sit in seeds 301–668 — the one part of this course whose
audio is currently **healthy**. Doing a punctuation fix now would leave the course text marginally more
consistent and its audio substantially worse, with no route to re-bake under the hold.

**Recommendation:** do this as one batch *together with* the S1–S300 presentation re-bake, when the audio
hold lifts. It is a one-command text fix; the cost is entirely in the audio. Flagging it here so it is
not lost.

### The `(formal)` / `(plural)` parentheticals — 17 of 19 left in place

These are **disambiguators for real distinctions English cannot carry** (T–V; number agreement).
Stripping `"you (formal)"` → `"you"` collides head-on with the `tu` forms taught from S0014; stripping
`"ready (plural)"` → `"ready"` collides with `"ready"` → `prêt` at S0039. That is precisely the
"your own fix mints a ZUT conflict" trap.

The correct fix is the shipped `fra_for_eng` pattern — carry the formality in the English as *sir* /
*madam* / *you all* — but that requires **rewording the target side too** across seeds 639–668, and in
several cases reordering the seed so the vocative debuts before it is needed. Too big for this pass; it
is a coherent piece of work someone should do.

**I did fix the two that needed no target change and had no collision:**
- `S0631L01 "what (question)"` → **`"what...?"`** — a grammar label replaced using the course's **own
  existing convention**: `S0079L02` already glosses `quand est-ce que` as `"when...?"`. Verified
  `"what...?"` was unused.
- `S0593L03 "still/anyway"` → **`"still"`** (the slash gloss).

**And the 7 drilled BUILD phrases that spoke the annotation to the learner** (S645–S655) — those I fixed
properly, adding the vocative to **both** sides (`"help you (formal)"` → `"help you madam"` /
`vous aider madame`). Legal because `monsieur`/`madame` debut at S0639/S0642, i.e. *earlier seeds*.

**Two drilled parentheticals remain, both skipped with reason:**
- `S0360 "did (he) say"` → `a-tu dit` — the target is a **discontinuous frame** (SUBJECT + `a-tu dit`);
  no single English gloss captures it without a slot marker. Forcing it would be worse.
- `S0642 "you feel (formal)"` — `madame` is a **later sibling** (L02) of that same seed. Cannot use it
  without a forward reference.

### Other, smaller

- The `"French"` vs `"québécois"` naming inconsistency (§1) — 1,359 clips, Kai's call.
- ~8 borderline `connaître` + abstract-noun rows (§3, Finding 1) — defensible French, left.
- Component gloss `"question"` → `-tu` (S0174, S0360, S0400) — a grammar label, but components are never
  drilled bare, so it is the documented false-positive class. Noted only.
- 1,376 phrases + 46 LEGOs with learner-facing lowercase `"i"` — **another worker owns this**. Untouched.

### Cross-course — REPORTED, NOT FIXED (rule 1)

`fra_for_eng` (**live**) has the same shape at `S0646L01`: known `"you are doing sir"` → target
`vous faites`, with **no `monsieur` in the target**. The learner is prompted for a word the answer does
not contain. Several siblings in its S639–S668 block look the same. Not my course; flagging only.

---

## 5. WHAT I FIXED — 45 rows

| # | Class | Rows |
|---|---|---|
| A | `connaître` + clause complement → `savoir` (S283/438/451/470/480/492/493) | 24 |
| B | `S0085L02` gloss → `"I don't know"` / `j'connais pas` + its 2 bare-affirmative builds | 3 |
| C | S0367 `"she told me"` → `"she said it to me"` (unglossed *it*; ZUT vs S0589) | 1 |
| D | S0508 `"worrying about it"` → `"there's no point worrying about it"` | 1 |
| E | S0174 build → `tu comprends-tu ce mot-**là**?` (align with S0160L02 + missing `?`) | 1 |
| F | S0199 seed + build → `"…in an office in those days"` / `…dans le temps` | 2 |
| G | S0656 seed `"with you all"` → `"with you guys"` (the 1-vs-11 island) | 1 |
| G | 7 drilled `(formal)` builds → vocative on both sides (S645–S655) | 7 |
| G | S0650 build → `"do you want to go today madam?"` / `…madame?` | 1 |
| H | S0593L03 `"still/anyway"` → `"still"`; S0631L01 `"what (question)"` → `"what...?"` | 2 |
| I | S0530 subjunctive after `peut-être que` → `j'peux` | 1 |
| | **Total** | **45** |

Reversible: every row's id and prior value is in `scripts/qsweep-fraca/edits.json` (gitignored, on the
worktree).

### Verification — re-run across the whole course, not against my edit list

- `connaître` + clause detector re-run on a **fresh dump from the live DB**: **0 remaining** (was 24).
- ZUT drilled-row scan: **9 → 4**, and all 4 are the `...`-normaliser artefact or the tu/vous person
  pair. **0 real.**
- Slashes in LEGO `known_text`: **1 → 0**. Parentheticals: 19 → 18 LEGOs, drilled phrases 13 → 2.
- Row counts unchanged (668 / 1,366 / 12,887) — **no phrases were vaporised** by the LEGO edit.
- All 45 rows re-read **from the live DB**: 45/45 text edits confirmed present.

**One thing worth flagging honestly:** on the first apply, 14 of the audio unlinks **silently did not
take** despite PostgREST returning success — something re-links `*_audio_id` by matching text on update.
I caught it because I verified against the live DB rather than trusting the `ok=44 failed=0` log. A
second, audio-only PATCH stuck. Final state verified: **100 links null, 0 residual.** Anyone else doing
bulk edits on these tables should expect this and re-verify.

---

## 6. AUDIO NOW OUT OF SYNC — NEEDS APPROVAL

**No TTS was generated, regenerated or queued. No `course_audio` row was deleted.** Links were nulled
only, per the rule.

### (a) Caused by my text edits — **100 links unlinked**

| Field | Count |
|---|---|
| `known_audio_id` | 20 |
| `target1_audio_id` | 39 |
| `target2_audio_id` | 39 |
| `presentation_audio_id` | 2 |
| **Total** | **100** |

Of these, **10 are free to recover** — a `course_audio` row with byte-identical text already exists in
this course and can simply be re-linked. **90 need new TTS.** The bulk is the `connaître`→`savoir` class
(24 rows × 2 target clips = 48).

### (b) Pre-existing, NOT caused by me — **406 presentation clips**, the §1 finding

406 presentation clips announce the wrong gloss (243 severe). All created 2026-04, all in seeds 1–300,
all stranded by the 2026-07-16 re-decomposition. **I did not unlink these** — nulling 406 links on a
hidden course would destroy the mapping that makes the re-bake straightforward, and they are wrong in
content, not in linkage. Flagging for a decision.

### (c) Would be created by the question-mark fix — **~1,200 links**, not done

See §4. Deliberately deferred to the same batch as (b).

**Recommended single audio pass when the hold lifts:** re-bake the ~541 April presentation clips in
S1–S300 → clears (b) entirely; add the 90 clips from (a); then apply the question-mark fix and bake (c)
in the same run. One pass clears the whole backlog and the only genuine blocker to switching this course
on.

---

## 7. EXPLICIT GAPS

1. **I could not fix the decisive defect.** The 406 drifted presentation clips are the one thing that
   would justify the hold-back, and it is audio. Under the TTS hold I can only characterise it.
2. **I did not find any *text* reason the course was held back.** The text is in better shape than the
   audio. If there was an original reason recorded somewhere outside this repo, I have not seen it — my
   evidence points at the July re-decomposition, which **post-dates** the hold and therefore cannot be
   the original cause. The original reason remains unknown, and I am not going to invent one.
3. **French judgement is mine and unreviewed.** Kai does not speak French and no francophone has checked
   these 45 edits. The `connaître`+clause class I am confident about — it is a categorical rule. The
   ~8 borderline `connaître`+abstract-noun rows I flagged rather than guessed, and the Quebec-specific
   register calls (`tu sais-tu`) rest on the course's own attested `tu VERB-tu` pattern, not on my
   intuition about Quebec speech.
4. **I read ~35 of 668 seeds in full (5%).** The `connaître` sweep and the ZUT/parenthetical scans are
   course-wide, but the *unstructured* reading is a sample. Findings 4 and 5 came from two late seeds; a
   deeper read of S400–S668 would likely surface more of the same formulaic thinness.
5. **The "LEGO gloss absent from seed English" detector is unreliable** (~90% FP) and I am reporting it
   as such rather than reporting its 96 hits. Someone building on this should not reuse it as-is.
6. **`course_round_index` not refreshed.** I edited via PostgREST, not the course-builder pipeline. Two
   seed rows and one LEGO changed. If the materialised view matters before this course ships, it needs a
   `REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index`. I did not run it — the course is hidden,
   and refreshing a shared view while six other workers are mid-sweep is not my call to make alone.
7. **Concurrent writers.** This is a shared working tree with six other sweep workers. My counts were
   stable across two full dumps taken ~40 minutes apart, but I only own this course, and I re-read every
   edited row from the live DB after applying.
