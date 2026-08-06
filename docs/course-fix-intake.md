# Course fix intake — standing log

A running ledger of proofreading and QA findings reported against live course content, with a
**measured** status for each one against the database at the time of triage.

**How to use this file**

- One `## <date>` section per intake batch. Append; never rewrite history.
- Every item gets a **stable id** of the form `<COURSE-SHORT>-<ROUND>-<n>` (e.g. `SPA-1121-1`).
  Ids are never reused, never renumbered.
- **Status** is one of `ALREADY FIXED` / `STILL PRESENT` / `CANNOT DETERMINE`, and must be backed by
  the *actual current value* quoted from the DB. An assertion without a quoted value is not a status.
- **Class** is one of `content one-off` / `pattern: <name>` / `AUDIO`.
- Triage is **read-only**. Recording a finding here is not permission to fix it.

**Standing exclusions**

- `AUDIO` items are **out of scope for fixing** under the audio stand-down. Tom is building a new
  audio QA tool; we contribute findings only. Log, flag, do not act.
- Anything already owned by another worker is recorded and pointed at, not acted on.

**Lookup method (so a later reader can reproduce a status)**

Round numbers (`R####`) as used by proofreaders map to legos via the `course_round_index`
materialised view; that view is the same one the learning app's `round-map.ts` reads, so it is the
learner-visible numbering:

```sql
select r.round_index, l.lego_id, l.type, l.known_text, l.target_text, l.components
from course_round_index r
join course_legos l on l.course_code = r.course_code and l.lego_id = r.lego_id
where r.course_code = :course and r.round_index = :round;

select position, phrase_role, known_text, target_text
from course_practice_phrases
where course_code = :course and seed_number = :seed and lego_index = :idx
order by position;
```

⚠️ **Role-name mismatch.** Proofreaders say "Build 1..n" and "Cons n" for what the learner sees.
In the DB the roles are `component` / `build` / `use`, and the proofreader's numbering does not map
cleanly onto `position`. Statuses below therefore locate the flagged **text**, and say which role
row it actually sits in — that is the reliable anchor, not the ordinal.

---

## 2026-08-06 — Deborah, relayed by Kai

Reporter: **Deborah**. Relayed by Kai 2026-08-06. Triaged same day, read-only, no writes.

**Counts: 7 already fixed · 9 still present · 0 cannot determine · 2 AUDIO (out of scope) ·
1 systemic finding recorded and referred.**

### Calibration

Before any batch verdict, the lookup method was calibrated against **one independently
confirmable item**: `SPA-1055-1`. Deborah reported the R1055 LEGO as *"I don't get"* where it should
be *"I don't stay"*. `course_round_index` resolves `spa_for_eng` R1055 → `S0505L02`, and that row's
`known_text` is `"I don't stay"` — i.e. the round number, the seed/lego id and the exact wording
Deborah quoted all agree. The R-number → lego resolution is therefore correct, and the same
resolution is used for every verdict below.

---

### spa_for_eng

#### SPA-1055-1 — S0505, R1055 — LEGO says "I don't get", should be "I don't stay" (correct in all Build phrases)

- **Status: ALREADY FIXED** *(with one residual, below)*
- **Class:** content one-off
- **Current value:** `S0505L02` — known `I don't stay`, target `no me quede`
  (`updated_at` 2026-07-31, later than its sibling legos at 2026-07-21 — this row was edited).
  All practice phrases agree: `I don't stay` / `so that I don't stay` /
  `so that I don't stay right here` / `so that I don't stay here` / `it is good so that I don't
  stay` / `so that I don't stay today` / `so that I don't stay this time`.
- **⚠️ Residual not covered by the fix:** the `component` row at position 2 still reads
  known `get` → target `me quede`. Components drive the intro breakdown, so a learner can still
  meet "get" here. Not re-opened as a new item; noted so whoever finished the fix can finish it.

#### SPA-1103-1 — S0522, R1103 — F voice says "estupida"; phrase is neutral 'it was stupid' so BOTH voices should say "estupido" in INTRO and LEGO; Build phrases fine

- **Status: ALREADY FIXED (text side)**
- **Class:** AUDIO for the remainder — see note
- **Current value:** `S0522L02` — known `it was stupid`, target `fue estúpido`;
  components `it was`→`fue`, `stupid`→`estúpido`. Every one of the nine practice phrases uses
  `estúpido` (`fue estúpido`, `oí que fue estúpido`, `en mi opinión fue estúpido`, …).
  There is **no** feminine variant anywhere in the text: `course_gender_expansions` holds
  **0 rows for spa_for_eng**, so nothing in the data can produce "estupida".
- **Therefore:** the divergence Deborah heard exists only in the rendered clip, not in the content.
  Flagged for Tom's audio QA tool. **Do not act.**

#### SPA-1105-1 — S0523, R1105 — LEGO prompt has an "um" at the end - "instead of um"

- **Status: ALREADY FIXED (text side)**
- **Class:** AUDIO for the remainder
- **Current value:** `S0523L01` — known `instead of`, target `en vez de`. No `um` in the lego or in
  any of its seven phrases (`instead of`, `instead of running around the field`, `instead of here`,
  `instead of that`, `instead of this`, `instead of going`, `instead of everything`).
- **Incidental finding, not Deborah's:** the lego's `target_text` is `en vez de` but its stored
  component says `en lugar de`. The two disagree. Worth someone's eye; not fixed here.

#### SPA-1107-1 — S0524, R1107 — LEGO is "I'll call you back" but Spanish is just "I'll call you", usable for a first call, so remove "back" from LEGO and all phrases

- **Status: ALREADY FIXED**
- **Class:** content one-off
- **Current value:** `S0524L01` — known `I'll call you`, target `te llamaré` (`updated_at`
  2026-07-31). The word "back" appears in **none** of the nine phrases: `I'll call you`,
  `I'll call you after the meal`, `I'll call you here`, `I'll call you before Thursday`,
  `I'll call you before`, `I'll call you tomorrow`, `I'll call you at the end`,
  `I'll call you in a moment`.

#### SPA-1120-1 — S0529, R1120 — LEGO and INTRO have opening inverted-question-mark but no closing question mark; English has no ?

- **Status: ALREADY FIXED**
- **Class:** pattern: *unbalanced Spanish question punctuation*
- **Current value:** `S0529L01` — known `can you all`, target `podéis` (`updated_at` 2026-07-31).
  Neither `¿` nor `?` is present on either side.

#### SPA-1121-1 — S0529, R1121 — Build 7 "put your hands up please" reads as a command; should be "levanta las manos por favor" (one person) or "levantad las manos por favor" (several familiar) but Deborah thinks those forms have not been introduced

- **Status: STILL PRESENT** *(with one part of it not reproducible — see below)*
- **Class:** pattern: *bare infinitive standing in for an imperative*
- **Current value:** `S0529L02` — known `put your hands up`, target `levantar las manos` — the
  infinitive. It recurs unchanged at `build` position 3 (`put your hands up` / `levantar las
  manos`), `use` position 8 (`put your hands up here` / `levantar las manos aquí`) and `use`
  position 9 (`put your hands up before` / `levantar las manos antes`). All three read as
  instructions and all three use the infinitive.
- **Not reproducible:** the exact string Deborah quotes, *"put your hands up please"*, does not
  exist — **no phrase under S0529 contains "please" or "por favor"**. Either it was edited out
  already or the quote was a paraphrase. The underlying defect she describes is unambiguously
  still there, so the item stands.
- Note her own caveat: she believes the imperative forms (`levanta` / `levantad`) have not been
  introduced, so this may not be fixable by simple substitution.

#### SPA-1123-1 — S0531, R1123 — LEGO M voice chops the end of the word off [AUDIO]; INTRO gives it as "whoever", all Build phrases translate it "anyone"

- **Status (text half — whoever/anyone inconsistency): ALREADY FIXED**
- **Status (audio half — chopped clip): AUDIO, OUT OF SCOPE — flagged for Tom**
- **Class:** AUDIO
- **Current value:** `S0531L01` — known `anyone`, target `cualquiera` (`updated_at` 2026-08-03).
  The word "whoever" appears nowhere: every phrase uses "anyone" — `anyone`,
  `not just anyone can win`, `anyone can try`, `it isn't true that just anyone can do it`,
  `anyone can learn Spanish`, `not just anyone can do it that well`.
- The truncated M clip cannot be judged from the DB and is **not** to be regenerated.

#### SPA-1124-1 — S0531, R1124 — INTRO says "the game" in English but only "juego" in Spanish; should be "el juego"

- **Status: ALREADY FIXED**
- **Class:** content one-off
- **Current value:** `S0531L02` — known `the game`, target `el juego` (`updated_at` 2026-07-31).
  The article is present.

#### SPA-1146-1 — S0542, R1146 — Build 2 "whenever you feel here" and Build 3 "whenever you feel before" do not make sense

- **Status: STILL PRESENT**
- **Class:** pattern: *adverb-padded phrase* — the same pattern as the systemic finding below
- **Current value:** `S0542L01` (known `whenever you feel` / `siempre que te sientas`) still carries
  both, and each appears **twice**:
  - `build` position 5 — `whenever you feel here` / `siempre que te sientas aquí`
  - `build` position 6 — `whenever you feel before` / `siempre que te sientas antes`
  - `use` position 9 — `whenever you feel before` / `siempre que te sientas antes`
  - `use` position 10 — `whenever you feel here` / `siempre que te sientas aquí`
  - and a third of the same shape at `use` position 11 — `whenever you feel everything` /
    `siempre que te sientas todo`

---

### eng_for_por

Known side is Portuguese, target side is English. Notes below spell out the rule at issue.

#### POR-2-1 — S001, R2 — Build 1 is "I'm going to try to speak" when only "I want" and "to speak" have been introduced

- **Status: STILL PRESENT**
- **Class:** pattern: *prerequisite leak* (material used before its own introduction round)
- **Current value:** `S0001L02` (known `falar` / target `to speak`), `build` position 3 —
  known `vou tentar falar`, target `I'm going to try to speak` (`updated_at` 2026-07-15).
- **The rule:** the known side is a controlled language too. At R2 the learner has been given
  `quero` ("I want") and `falar` ("to speak") and nothing else, so the phrase asks them to produce
  `vou tentar` — a future periphrasis plus a second verb — from nothing.
- **Proposed fix (not applied):** replace the phrase with one built only from R1–R2 material, e.g.
  `quero falar` / "I want to speak". The `use` row at position 2 already is exactly that, so the
  build row is the only offender.

#### POR-6-1 — S002, R6 — Build 1 uses "I'd like" which is not introduced until R31

- **Status: STILL PRESENT**
- **Class:** pattern: *prerequisite leak*
- **Current value:** `S0002L01` (known `aprender` / target `to learn`), `build` position 6 —
  known `gostaria de aprender`, target `I'd like to learn` (`updated_at` 2026-07-15).
- **Confirmed introduction round:** `gostaria de` / `I'd like` is `S0011L03` = **R31**. Deborah's
  round number is exact.
- **The rule:** `gostaria` is a conditional form. A learner at R6 has met only present-tense
  `quero`; asking for the conditional 25 rounds early gives them no way to derive it.
- **Proposed fix (not applied):** swap `gostaria de aprender` for a `quero`-framed build
  (`quero aprender`), and let R31 be where `gostaria de` first appears.

#### POR-33-1 — S012, R33 — Cons 1 uses "what's going to happen", introduced in R34

- **Status: STILL PRESENT**
- **Class:** pattern: *prerequisite leak*
- **Current value:** `S0012L02` (known `adivinhar` / target `to guess`), `use` position 8 —
  known `gostaria de tentar adivinhar o que vai acontecer`,
  target `I'd like to try to guess what's going to happen` (`updated_at` 2026-07-15).
- **Confirmed introduction round:** `o que vai acontecer` / `what's going to happen` is `S0012L03`
  = **R34** — the very next round. Deborah's round number is exact.
- **The rule:** a lego may not be used before the round that introduces it, not even by one round.
  This one leaks *backwards within the same seed*, which is the easiest kind to miss.
- **Proposed fix (not applied):** either move the phrase to R34, or truncate it to
  `gostaria de tentar adivinhar algo`.

#### POR-83-1 — reported as "S0028, R23" — LEGO is "as soon as you can", should be "as soon as possible". Portuguese does not specify a person; some Builds do not make sense with "as soon as you can" but all make sense with "as soon as possible" (and later "as quickly as possible" uses the same pattern)

- **Status: STILL PRESENT**
- **Class:** content one-off, but with a knock-on set (all ten phrases carry the wording)
- ⚠️ **Round-number correction:** R23 in `eng_for_por` is `S0009L01` (`um pouco de` / `a little`),
  not S0028. The seed number is the reliable one: **S0028 L01 is R83**. Triaged as R83.
- **Current value:** `S0028L01` — known `o mais cedo possível`, target `as soon as you can`.
  Components: `o mais cedo`→`as soon as`, `possível`→`you can`. All ten phrases carry it:
  `to answer as soon as you can`, `I want to meet as soon as you can`,
  `to start talking as soon as you can`, `I'm going to try to answer as soon as you can`,
  `I'd like to learn to answer as soon as you can`,
  `I want to start talking English as soon as you can`,
  `I want to practise speaking English as soon as you can`, and at S0028 L02
  `it's useful to learn as soon as you can`.
- **The rule:** `possível` is an impersonal adjective — "possible". It carries no person. Rendering
  it as "you can" invents a second-person subject that the Portuguese does not have, which is why
  `quero encontrar-nos o mais cedo possível` comes out as the incoherent *"I want to meet as soon
  as **you** can"* rather than "as soon as possible".
- **Deborah's supporting evidence checks out:** the parallel lego at **R136** (`S0050L02`) is
  `o mais depressa possível` → `as quickly as possible` — impersonal, exactly the form she wants.
  A second instance also leaks the person: **R86** (`S0029L02`) is
  `falar melhor o mais cedo possível` → `to speak better as soon as **I** can`. Same root cause,
  different invented person; worth fixing in the same pass.
- **Proposed fix (not applied):** retarget `S0028L01` to `as soon as possible`, re-point the
  component `possível`→`possible`, and rewrite the ten phrases and `S0029L02` to match.

#### POR-104-1 — S0037, R104 — Build 7 uses 'tired' (introduced R111) and 'this morning' (introduced R112)

- **Status: STILL PRESENT**
- **Class:** pattern: *prerequisite leak*
- **Current value:** `S0037L01` (known `comecei` / target `I started`), `use` position 10 —
  known `comecei a sentir-me cansado esta manhã`,
  target `I started to feel tired this morning` (`updated_at` 2026-07-15).
- **Confirmed introduction rounds:** `cansado`/`tired` is `S0039L01` = **R111**;
  `esta manhã`/`this morning` is `S0039L02` = **R112**. Both of Deborah's round numbers are exact.
- **The rule:** two unintroduced legos in one phrase, seven and eight rounds early.
- **Proposed fix (not applied):** either move the phrase to R112 or later, or rebuild it from
  R104-and-earlier material (`comecei a falar inglês ontem` at position 8 is the model).

#### POR-118-1 — S0042, R118 — pronunciation of "than" as a single-word LEGO is poor: F sounds like 'then', M like 'thun' [AUDIO]

- **Status: AUDIO — OUT OF SCOPE, flagged for Tom**
- **Class:** AUDIO
- **Current value (text, for the record):** `S0042L02` — known `do que`, target `than`. The text is
  correct; the defect is entirely in the two rendered clips.
- Not re-recorded, not regenerated. Contributed to the audio QA backlog only.

#### POR-126-1 — S0045, R126 — Portuguese LEGO prompt has trailing dots - "tudo..."; nothing else has dots

- **Status: STILL PRESENT**
- **Class:** pattern: *stray punctuation on a lego prompt*
- **Current value:** `S0045L02` — known `tudo…`, target `everything`. The trailing character is a
  single **U+2026 horizontal ellipsis**, not three periods — worth knowing for anyone grepping.
- **The rule:** a lego prompt is a citation form, not a sentence; the ellipsis is a rendering
  artefact that a proofreader will read aloud as hesitation. The word alone is `tudo`.
- **Proposed fix (not applied):** strip the trailing `…`. None of the eight practice phrases under
  this lego carry it, so the lego row is the only offender.

#### POR-note-1 — Deborah has completed eng_for_por up to S0050 / R136 and fixed some items herself where she could.

- **Status:** not an item — coverage note, recorded so a later reader knows the boundary of her pass.
- Some of the ALREADY-FIXED verdicts elsewhere in this batch may be her own edits.

---

### eng_for_ita

#### ITA-48-1 — S0018, R48 — checking whether "incontrarci" is reflexive and needs to vary with the subject of the Italian sentence. Deborah notes Popty does not seem to handle reflexive verbs well.

- **Status: STILL PRESENT** (unchanged since 2026-05-22; nothing has been done to it)
- **Class:** pattern: *clitic/reflexive not agreeing with the subject*
- **Current value:** `S0018L02` — known `incontrarci`, target `to meet`, no components.
  The `-ci` is frozen across every phrase regardless of subject:
  - `vogliamo incontrarci` — "we want to meet" ✅ the reciprocal reading works
  - `mi piacerebbe incontrarci` — "I'd like to meet"
  - `lui vuole incontrarci` — "he wants to meet"
  - `lei vuole incontrarci più tardi` — "she wants to meet later on"
  - `lui vuole incontrarci con tutti gli altri` — "he wants to meet with everyone else"
- **The finding, plainly:** Deborah is right that this needs adjudicating. `incontrarci` is the
  reciprocal `incontrarsi` with a 1pl clitic. With `vogliamo` it is correct. With `lui vuole` /
  `lei vuole` the `-ci` no longer means "each other" — it can only be read as the object "us", so
  `lui vuole incontrarci` is grammatical but means *"he wants to meet **us**"*, which is not the
  English gloss "he wants to meet". The English target is the same string in both cases, so the
  learner is being taught that one Italian form covers two different meanings. That is a ZUT
  problem as much as a grammar one.
- **The wider point stands too:** the lego stores one fixed clitic with no components, so there is
  no mechanism in the data for the clitic to vary with the subject.
- **Second, unreported Italian finding in the same seed:** `S0018L04` builds `di questa sera` for
  "this evening" and then recombines it — `vogliamo incontrarci di questa sera`,
  `voglio parlare di questa sera`, `lei vuole tornare di questa sera`,
  `mi piacerebbe parlare inglese di questa sera`. `di questa sera` is not a free time adverbial;
  the phrases want `questa sera` or `stasera`. The `di` is only licensed by `alle sei di questa
  sera`, which is where the lego was cut from. Same bug class as the exception-lego leak sweep.
  **Logged, not acted on.**

#### ITA-59-1 — S0021, R59 — LEGO prompt is "sua" for "her" but all Build phrase prompts are "suo". Is that OK?

- **Status: STILL PRESENT** (unchanged since 2026-05-22)
- **Class:** content one-off — wrong citation form on the lego prompt
- **Current value:** `S0021L03` — known `sua`, target `her`, no components. Every one of the nine
  phrases uses `il suo nome`: `il suo nome` / `imparare il suo nome` /
  `stai imparando il suo nome?` / `perché stai imparando il suo nome?` /
  `voglio ricordare il suo nome` / `mi piacerebbe scoprire il suo nome` /
  `lui vuole imparare il suo nome in fretta` / `vuoi ricordare il suo nome` /
  `perché vuoi imparare il suo nome?`
- **The finding, plainly:** the phrases are right and the lego is wrong. Italian possessives agree
  with the **thing possessed**, not the possessor; `nome` is masculine, so `il suo nome` is correct
  for "her name". The lego prompt `sua` is the feminine form, and since this lego is only ever used
  with `nome`, `sua` never once appears in the material it introduces. The learner meets a form in
  the intro that they will not meet again.
- **Proposed fix (not applied):** change the lego prompt to `suo`, or to `il suo` to match how it
  is actually used.

---

### Systemic — spa_for_eng, R1147 onward — NOT FOR ACTION HERE

> Deborah has **STOPPED** working on spa_for_eng until this is fixed.
>
> Most Build phrases merely append 'before' / 'here' / 'yesterday' (also 'for everyone' /
> 'about everything') to the LEGO, instead of practising varied known material. Examples:
> - R1150 LEGO 'was absolutely right' -> Builds: 'was absolutely right here' / 'yesterday' / 'before'
> - R1155 LEGO 'because he has been playing' -> Builds: same + 'here' / 'yesterday' / 'before'
> - R1156 LEGO 'in the mud' -> Builds: same + 'here' / 'yesterday' / 'before'
> - R1157 LEGO 'I am feeling sad' -> Builds: 'I am feeling sad yesterday' / 'I am feeling sad before'
>   (also ungrammatical)
> - R1162 'small' -> 'small yesterday' / 'small here' / 'small before' / 'small for everyone'

- **Status: STILL PRESENT** — every example verified.
- **Owner: a separate worker owns this finding. Nothing in this pass touches it.** Recorded here so
  the ledger is complete and so the measurement below is not repeated.

**Measured state, for whoever owns it.** The padding sits in the **`use`** role, not `build` — the
`build` rows for all five rounds now carry varied material. Deborah's "Build" is the learner-facing
label; in the data it is `use`. Anyone fixing this by filtering on `phrase_role = 'build'` will find
nothing and conclude wrongly that it is done.

| Round | Lego | `build` rows (varied — OK) | `use` rows (padded — the finding) |
|---|---|---|---|
| R1150 | `S0544L03` `was absolutely right` | `that person was absolutely right`, `that person over there was absolutely right` | `was absolutely right here`, `was absolutely right before`, `was absolutely right yesterday` |
| R1155 | `S0547L01` `because he has been playing` | `…until they are ready`, `…since the second day of the holidays`, `…right now` | `…here`, `…before`, `…yesterday`, `…well`, `…for us` |
| R1156 | `S0547L02` `in the mud` | `the dog is dirty and wet in the mud`, `to fall in the mud`, `if we go too close in the mud` | `in the mud here`, `in the mud before`, `in the mud yesterday` |
| R1157 | `S0548L01` `I am feeling sad` | `I don't want it, I am feeling sad`, `because I am feeling sad`, `since the second day I am feeling sad` | `I am feeling sad before`, `I am feeling sad yesterday`, `I am feeling sad about everything`, `I am feeling sad for everyone` |
| R1162 | `S0553L01` `small` | `the small shirt`, `a small hope` | `small here`, `small before`, `small yesterday`, `small for everyone` |

The padded `use` rows share a timestamp cluster (2026-07-21 11:03–11:24), i.e. they were written by
one generation run, which is consistent with a systemic cause rather than scattered authoring.
`SPA-1146-1` above is the same pattern reaching back before R1147, so the affected range starts
earlier than Deborah's R1147 boundary.

---

### Prerequisite leaks — relationship to the 2026-08-04 leak sweep

`POR-2-1`, `POR-6-1`, `POR-33-1`, `POR-104-1` are all *prerequisite leaks*: material used before the
round that introduces it. **These are not misses from the recent sweep** — on two independent counts:

1. **Different bug class.** `docs/exception-lego-leak-sweep-2026-08-04.md` hunted
   *exception-lego leaks* — "a lego whose target form is only valid inside a particular frame, then
   recombined into frames where it is wrong" (elision, classifiers, bound articles). Ordering /
   prerequisite violations were never in its scope.
2. **Different courses.** That sweep covered the `*_for_eng` cohort (fra, fra_ca, zho, ara_lb, kor,
   jpn, fin, deu, spa, por, ita, …). **No `eng_for_*` course appears in it at all** — the string
   `eng_for_` does not occur in the document. `eng_for_por` was never swept.

Nor is this content that post-dates the sweep: the four offending rows were last written
**2026-07-15**, three weeks *before* the 2026-08-04 sweep. They would have been visible to a
prerequisite-ordering check on that date — there just wasn't one. The sweep was also explicitly
read-only, so it could not have fixed them even had it found them.

**Conclusion:** an ordering/prerequisite check over the `eng_for_*` cohort has not been run. That is
a gap, not a regression. Recorded, not acted on.

---

### Flagged for Tom — audio stand-down

Two items are audio defects that cannot be judged or fixed from the database, and are held for the
new audio QA tool:

| Id | Course | Round | Defect |
|---|---|---|---|
| `SPA-1123-1` | spa_for_eng | R1123 | M voice chops the end off `cualquiera` |
| `POR-118-1` | eng_for_por | R118 | `than` as a single-word lego: F sounds like "then", M like "thun" |

Two further items had an audio component whose *text* side is already clean, so if the artefact is
still audible it is in the clip and belongs on the same list: `SPA-1103-1` (F voice "estupida" with
no feminine form anywhere in the data) and `SPA-1105-1` (audible "um" with no "um" in the text).

**No clip was played, analysed, regenerated or deleted in this pass.**
