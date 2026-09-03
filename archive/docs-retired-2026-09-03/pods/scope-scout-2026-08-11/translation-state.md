# Pod-0 translation state, per target language

**2026-08-11 · read-only survey · no DB writes, no audio, nothing triggered on popty.app**

Every number below was read from the live database today or from a file in this repo, and the
query that produced it is `scripts/pod-survey/translation-state.cjs` (gitignored workspace).

---

## The answer in five lines

Of the 73 pod-0-family pods in the estate, **four** carry Aran's new 231-line canonical, and on
all four **every one of the 89 new lines has target text**. The other 69 carry the old 142-line
script and have **zero** of the 89 — not partially, not parked elsewhere: I looked in the
database, in this repo and across the estate and there is no translation of a new pod-0 line
anywhere outside `listening_pod_sentences`. Of the four that are done, **three are hidden from
learners** (they sit on a parallel `pod-0-unrecorded` slug the player never asks for), and the
one that is not — `deu_at_for_eng` — is serving learners **155 machine-drafted lines nobody has
proofread**, 50 of them already voiced. The pipeline and the tooling to do the remaining 69 are
built and proven; what is missing is the translations themselves and a ruling on three
methodology forks.

---

## 1. The pipeline, and what the source of truth actually is

```
canonical_pod_scenarios (pod_slug='pod-0', 231 rows, 22 scenes — English only)
  → pod-dialogue-generator.cjs: buildPodGlossary() pins ONE ledger per pod via the claude CLI
    (haiku), then generateScene() renders each scene independently via the claude CLI (sonnet),
    ledger pasted verbatim into every scene prompt
  → writeSceneSentences() upserts listening_pod_sentences {target_text, known_text}
  → OR, since 2026-08-07: align-pod0-to-canonical.cjs moves English/speakers/order ONLY and
    leaves target_text = '' , then write-pod0-drafts.cjs writes authored drafts into the blanks
  → listening_pod_sentences.target_text is what the recorder reads and the learner hears
```

**Confirmed: `listening_pod_sentences.target_text` IS the translation source of truth.** There is
no per-language canonical table. `canonical_pod_scenarios` holds English only (`english_text`;
its `variant_key` column is used only by pod-0.5, never for language variants — pod-0 is 231 rows
all with `variant_key = null`). Nothing else in the schema holds pod target text: the only
pod-related tables reachable from any code path in this repo are `canonical_pod_scenarios`,
`listening_pods`, `listening_pod_sentences` and `pod_legos`, and `pod_legos` is a derived index
(19,742 rows keyed to sentence ids), not a source.

Two things worth knowing about that pipeline:

- **`sync` mode will write target text.** `syncPodToCanonical()` re-flexes any scene whose hash
  changed by deleting it and re-translating it through the LLM. That is why the Welsh work used a
  bespoke aligner instead — `align-welsh-pod0-to-canonical.cjs`'s header says so in as many words:
  *"sync re-flexes every changed scene through an LLM, i.e. it WRITES WELSH. Nobody has authorised
  a machine to translate Aran's new lines."*
- **The English side is stored per course, not read from canon at play time.** Each course keeps
  its own copy in `known_text` (or `target_text` for `eng_for_*`). That is the mechanism behind the
  drift the parent measured, and it is also how the `[target language]` placeholder gets resolved
  (§4).

---

## 2. `target_text_draft` — what it is, and what it does not do

**Set by** exactly two tools: `tools/pods/write-pod0-welsh-drafts.cjs` (the hardcoded Welsh run)
and its 2026-08-08 generalisation `tools/pods/write-pod0-drafts.cjs`, both writing
`SET target_text = $1, target_text_draft = true` under a per-row guard
(`WHERE id=$1 AND known_text=$2 AND btrim(target_text)=''`) inside one transaction. **Cleared by**
a human editing the line — `PATCH /sentence/:id` writes the new text and drops the flag in the
same update (`pods-cast.cjs:313`). It means one thing: *a machine wrote this and no human has read
it.* Column added by `database/migrations/20260806_pod_sentence_target_text_draft.sql`, default
false.

**Does a draft row play to the learner? Yes — nothing on the learner path reads the flag.**
`useListeningPods.ts:164` and `usePodLapScheduler.ts:505` in player-vue select fifteen columns and
`target_text_draft` is not among them; neither is it in the offline bundle's select
(`api/courses/[code]/bundle.ts:664`). The flag is visible only to Popty's recording surfaces
(`pods-plan.cjs:162`, `PodsView.vue`, `podRecordingPlan.js`). So the only thing standing between a
drafted line and a learner's ear is whether the clip was rendered and whether the pod is on the
learner-visible slug. On `deu_at_for_eng:pod-0` — which *is* on the visible slug and is *not*
gated — **50 drafted lines already have target audio**. On `spa_for_eng:pod-0-unrecorded`, 16 do,
but that pod is hidden.

| pod | rows | draft + audio | draft, no audio | proofread + audio |
|---|---|---|---|---|
| `cym_n_for_eng:pod-0-unrecorded` | 232 | 0 | 0 | 87 |
| `cym_s_for_eng:pod-0-unrecorded` | 232 | 0 | 104 | 0 |
| `spa_for_eng:pod-0-unrecorded` | 232 | 16 | 112 | 103 |
| `deu_at_for_eng:pod-0` | 232 | **50** | 105 | 50 |

### Why cym_n has 0 drafts and cym_s has 104

Because a human cleared the Northern queue and has not touched the Southern one. Both were drafted
on 2026-08-06 in the same run — 109 Northern, 104 Southern, logged line by line in
`docs/pods/pod0-welsh-drafts-applied-log.json`. Comparing that log's `after.target_text` against
the live rows today:

| course | drafted | still flagged draft | text unchanged since drafting | text edited since |
|---|---|---|---|---|
| `cym_n_for_eng` | 109 | **0** | 91 | **18** |
| `cym_s_for_eng` | 104 | **104** | 104 | 0 |

157 Northern rows were updated on 2026-08-10. So Aran (or another editor — recorders cannot clear
the marker) went through all 109 Northern lines, changed the wording on 18 and accepted 91 as
written. Nobody has opened the Southern queue. That is also why Northern has 87 recorded target
clips and Southern has none: `pods-plan` will queue a drafted line for recording but badges it
"DRAFT — AWAITING ARAN" and tells the recorder not to record it as it stands.

### What the Welsh run actually cost, and how it was done

**Not an LLM API call and not a translation service — an agent session wrote the Welsh by hand,
line by line, and a gated script applied it.** `docs/pods/welsh-pod0-drafting-report-2026-08-06.md`
is the account: 213 lines (109 N / 104 S), each dialect drafted from *its own* corpus — the
surviving human-written pod-0 lines (114 N / 118 S) plus that course's ~5,000 authored practice
phrases — never translated once and dialect-swapped. 90 N / 89 S written from scratch, 19 N / 15 S
adapted from existing Welsh, of which 11 N / 8 S needed no change at all. The dialect spine
(*isio/moyn*, *efo/gyda*, *rŵan/nawr*, *deud/gweud*…) was held explicitly and the report tabulates
it. Breath marks `…` were matched to the corpus density (0.71 breaks/line at 6-10 words against the
corpus's 0.71). Consistency was checked mechanically across all 231 lines: zero one-English-to-two-
Welsh cases, zero one-Welsh-to-two-English cases. The report ships five named judgement calls for
Aran (the `chi`/`ti` block in scenes 15-21, a *That's very kind of you* fork, *sgŵp*, single/return
tickets, two Northern booking lines).

**Cost is an explicit gap.** No token count, wall-clock or spend figure was recorded for the
drafting session; the three commits landed within four minutes of each other, which bounds the
commit burst and not the authoring. The nearest thing to an estimate in the estate is
`pod-redo-scope-2026-08-07.md` §7 — *~4-8 min per course for a Sonnet-tier agent on ~120 lines,
41 courses ≈ 30 min wall-clock at ~10 parallel* — and that document flags it as an estimate with
no precedent, because the Welsh drafts were hand-authored, not dispatched.

The `spa_for_eng` and `deu_at_for_eng` drafts (2026-08-08) went through the generalised writer with
text-only QC gates: expected-script check, bracket ban, unresolved-placeholder check, English-
passthrough check, and a re-assert that the draft's English still matches the row's. Whisper is
deliberately **not** a gate there. The drafts JSON files themselves lived under `scripts/pod-audit/`
(gitignored) and are **no longer on disk** — explicit gap: the applied text survives only in the DB
for those two, unlike Welsh which has a committed applied log.

---

## 3. Per course: how many of the 89 new lines have a translation

**Method.** I recomputed "new" myself rather than inheriting it: normalise English
(case/punctuation-insensitive, `[target language]` folded to a token), multiset-subtract the old
142-line canon (`docs/pods/pod0-live-snapshot-2026-08-06.json`) from the live 231-line canon. Result
**89 new lines**, 89 of them distinct — matching this repo's own count in commit `941f9204` and the
89 in `pod-redo-scope-2026-08-07.md`. *(The parent's 91 is 2 higher; the difference is normalisation
of near-identical rewordings. I report 89 and the method that produced it.)* A course "has" a new
line when a sentence row's English side matches that canonical line **and** its `target_text` is
non-empty.

Where the 89 land — the rewrite is purely additive, and it lands almost entirely in the
**Extra-phrases** scenes:

| scene | label | old lines | new lines added |
|---|---|---|---|
| 2, 3 | A Day of Greetings (ii)/(iii) | 2, 3 | 3, 7 |
| 15 | 9 — Extra phrases | 12 | 10 |
| 16-20 | 10-14 — Extra phrases | 0 | 11 each |
| 21 | 15 — Extra phrases | 0 | 14 |
| 22 | 16 — First conversation | 0 | 0 (re-homed old scene-15 lines) |

### The four that are done

| pod | rows | canon match | new lines with target text | drafts | target audio | learner-visible? |
|---|---|---|---|---|---|---|
| `cym_n_for_eng:pod-0-unrecorded` | 232 | 226/231 | **89 / 89** | 0 | 87 | **no** — gated |
| `cym_s_for_eng:pod-0-unrecorded` | 232 | 226/231 | **89 / 89** | 104 | 0 | **no** — gated |
| `spa_for_eng:pod-0-unrecorded` | 232 | 226/231 | **89 / 89** | 128 | 119 | **no** — gated |
| `deu_at_for_eng:pod-0` | 232 | 226/231 | **89 / 89** | 155 | 100 | **YES** |

The 226/231 is not a shortfall: it is exactly the 5 `[target language]` lines, whose per-course
English resolves the placeholder (§4). All four have 231 rows with non-empty target text and one
blank row (below).

### The other 69 — all zero

Every remaining pod-0-family pod holds **142 rows and 0 of the 89 new lines**, on both the English
and the target side. Full per-pod table in `scripts/pod-survey/translation-state.json`; the shape:

| family | pods | rows each | new lines translated |
|---|---|---|---|
| 39 other `X_for_eng` (English known) | 39 | 142 | **0** |
| 16 `eng_for_*` (English is the target) | 16 | 142 | **0** |
| 7 no-English-side (`cat_for_spa`, `eus_for_spa`, 5 `X_for_jpn`) | 7 | 142 | **0** |
| `cym_n_for_eng:pod-0`, `cym_s_for_eng:pod-0` | 2 | **0 rows** | 0 |
| `spa_for_eng:pod-0` (still live, old script) | 1 | 142 | 0 |
| `zzz_test_for_eng:pod-0` | 1 | 6 | 0 |

**The Welsh learner-facing hole is real and current:** `cym_n_for_eng:pod-0` and
`cym_s_for_eng:pod-0` have **zero sentence rows**, and the player asks for exactly
`` `${course}:pod-0` `` (`useListeningPods.ts` line ~160, `usePodLapScheduler.ts:505`). Both Welsh
courses therefore serve **no pod-0 at all** to learners today. That is the deliberate consequence of
the 2026-08-06 gating (`metadata.gated_reason`: *"Aran/Catrin have not recorded these pods yet
(Tom, 2026-08-06)"*, with `restore_by`: *move `listening_pod_sentences.pod_id` back to
`<course>:pod-0`*) — flagging it because it is a state, not a plan. `spa_for_eng` was gated
differently: its old pod-0 was left intact and the aligned copy cloned onto `pod-0-unrecorded`
(*"Live pod-0 is untouched and is what learners read"*).

**One inconsistency worth a line:** the offline bundle endpoint selects **all** of a course's
`listening_pods` with no slug filter, so a gated `pod-0-unrecorded` would ride into an offline
download even though the live player never asks for it. Not verified end-to-end — flagging the
code path, not asserting the symptom.

**Orphan row on all four aligned pods.** Each carries a 232nd row, `…:SC15-S012`, with
`global_order = 90142` and empty known and target text — the aligner's park slot for a retired
line. Harmless (empty target = not recordable, not playable), but it is why the counts read 232.
Note also that the two Welsh and the Spanish rows keep ids prefixed `<course>:pod-0:` even though
their `pod_id` is now `…:pod-0-unrecorded` — ids were not rewritten when the pod was renamed.

### The hunt for translations parked off-pod — nothing found

| where I looked | result |
|---|---|
| Candidate tables (`pod_translations`, `pod_drafts`, `pod_sentence_drafts`, `translation_drafts`, `canonical_pod_translations`, `pod_scenario_translations`, `listening_pod_scenes`, `pod_sentences`, …) | **none exist** (PostgREST 204 vs 200 on a known table — discriminator verified against `listening_pods`) |
| `canonical_pod_scenarios.variant_key` | pod-0 is 231 rows, all `null`; variants exist only for pod-0.5 |
| `pod_legos` (19,742 rows) | derived index keyed to sentence ids; no course has legos from lines that don't already exist on its pod |
| `docs/`, `scripts/`, `tools/`, `services/` grep on distinctive new-line English | only Welsh/English artefacts: the recording packs, `pod0-welsh-drafts-{applied,dryrun}-log.json`, the pre-align archives, the canonical docs, and this survey's own JSON |
| `/home/tomcassidy` estate-wide grep (json/md/txt/csv/ts/cjs) | only `.wt-reuse-deploy`, a worktree of this same repo. Nothing in `ssi-learning-app`. |
| `scripts/pod-audit/*drafts*.json` (the spa/deu_at draft sources) | **absent** — explicit gap, see §2 |

**Conclusion: 69 courses need all 89 lines translated from scratch. There is no parked work to
recover.** One caveat that raises the true workload for the 41 English-known courses:
`pod-redo-scope-2026-08-07.md` §7 measures ~29 further lines per course whose *English has drifted
locally* under existing target text and so needs re-translation too — ~119 lines/course, not 89.
The 23 known≠English courses do not have that problem (their English was never edited after import),
so they need exactly the 89: `pod0-nonenglish-known-audit-2026-08-08.md` measures 141 surviving /
89 new / 0 stale / 0 wording rewrites for all 23.

---

## 4. How the 5 `[target language]` lines were resolved — the template for the other 69

The canonical writes the literal token on five lines: global orders **33 (S6.9), 94 (S10.8),
95 (S10.9), 221 (S22.1), 226 (S22.6)** — all of the form *"I'm learning [target language]"*.

**The mechanism is a plain substitution done at write time, into the per-course English, before
anything is translated.** `pod-dialogue-generator.cjs:164` does
`.replace(/\[target language\]/gi, targetLanguage)` when rendering the prompt;
`align-welsh-pod0-to-canonical.cjs` reimplements it as `substitutePlaceholder()` with a
`--language-name=` override; `write-pod0-drafts.cjs` gates on any surviving bracket token. So the
row's stored `known_text` already reads "Welsh" / "Spanish" / "German" and the canon's brackets never
reach a recorder or a learner.

**On the target side, all four use the language's own endonym.** Evidence, read from the live rows:

| pod | English name written into `known_text` | target-side rendering |
|---|---|---|
| `cym_n_for_eng` | Welsh | *Cymraeg* — e.g. *"Dw i'n dysgu Cymraeg"* |
| `cym_s_for_eng` | Welsh | *Cymraeg* |
| `spa_for_eng` | Spanish | *español* — *"Estoy aprendiendo español"* |
| `deu_at_for_eng` | German | *Deitsch* (Austrian spelling, not *Deutsch*) |

Two decisions are embedded there and both are precedents, not rulings:

1. **The English name is the plain language name, not the dialect name.** The aligner's header
   records the reasoning explicitly and marks it *DECISION FOR TOM/ARAN*: the served `cym_s` rows
   already said "Welsh" while `cym_n` said "Northern Welsh", *"which is not what a learner would
   actually say — so 'Welsh' is the default for both."* `deu_at_for_eng` follows the same rule with
   "German", not "Austrian German".
2. **The target side takes the everyday endonym in the target's own orthography/register** —
   *Deitsch*, not *Deutsch*. For the generated pods this is not ad-hoc: `buildPodGlossary()` §3 asks
   the ledger to pin *"the ONE standard everyday word … speakers use for their own language, used
   identically in every scene."* The 23 known≠English courses already have their own resolutions from
   the old canon on the same 5 rows — *catalán/català*, *euskera*, *ドイツ語/Deutsch*,
   *フランス語/français*, *イタリア語/italiano*, *スペイン語/español*, *中国語/中文*, and the plain word
   "English" for the 16 `eng_for_*` — so for those 23 the template is: **reuse what the row already
   says.**

Template for the remaining 69, in one line: substitute the plain English language name into
`known_text` at align time, pin the endonym once in the pod's consistency ledger, and let every
scene reuse it.

---

## 5. Taste / methodology calls for Tom — flagged, not decided

### 5a. T-V register across the Extra-phrases scenes

The new material is scenes 15-21, which is the learner out in the world — shops, stations,
restaurants — plus scene 22, a first conversation with a person. That straddles the tu-first law
("tu first as default, unless context insists") exactly where it bites, and the four done pods have
already answered it **three different ways**:

- **Welsh** — scenes 15-21 `chi` throughout, scene 22 `ti/chdi`. The drafting report flags this as
  judgement call #1 and singles out 19.3 *"When you talk quickly, it makes me feel stupid"* as a line
  that sounds like something said to a friend: *"One word from Aran flips the whole block."*
- **Spanish** — mixed *within the same course*: S6.9 *"¿Puedes repetirlo más despacio?"* (tú), S10.8
  *"¿Está aquí de vacaciones? Habla usted…"* (usted), S22.1 *"¿Te importaría… contigo?"* (tú).
- **Austrian German** — S10.8 *"San S' auf Urlaub do?"* (Sie), S22.1 *"…mit dir…"* (du).

**The call:** is the register a per-scene judgement made by whoever translates, or a course-wide
default pinned once in the ledger with named exceptions? Today the ledger prompt asks for
*"the unmarked polite second-person … for each relationship type"* — i.e. per-relationship, which is
how you get three answers. If tu-first governs pods the way it governs course content, the
Extra-phrases block should default informal and the shop/station scenes are the "context insists"
exception — that is a change to what the ledger pins, and it should be made before 69 courses are
drafted, not after.

### 5b. The drill tails — six Narrator lines that are lists, not dialogue

Six of the 89 are bare drills: S16.11 *"A million. 80. 90. 2 o'clock. 10 o'clock."*, S17.11 *"3
o'clock. 9 o'clock. January. February."*, S18.11, S19.11, S20.11, S21.14 *"October. November.
December."* — numbers, clock times and the twelve months spread across six scene-ends. They do not
translate as sentences and they collide with the canon's own numerals:

- All three done pods **spell the digits as words** in the target — *"Wyth deg. Naw deg. Dau o'r
  gloch."* / *"Ochenta. Noventa. Las dos."* / *"achtzig. neunzig. zwoa Uhr."* — correct for spoken
  audio, and note the Welsh report's standing rule: *"Numbers, days and times are always words, even
  where the new canonical writes numerals, because the Welsh is spoken aloud."*
- Spanish renders "2 o'clock" as *"Las dos"* — the natural clock form, which is **not** a
  word-for-word mapping of the English and would fail a naive ZUT read against another course's
  *"a las dos"*.
- Austrian gives *"Jänner"* for January, which is right for Austria and wrong for Germany.

**The call:** are these six lines translated per-language like everything else, or are they a fixed
per-language number/month/time inventory generated once and reused (they recur in course content
anyway)? And do the digits in the *English* stay digits on the recording sheet, given every target
spells them out? A machine drafting 69 courses will get these six lines wrong in small ways
69 times unless the answer is pinned.

### 5c. The seven no-English-side courses

`cat_for_spa`, `eus_for_spa`, `deu_for_jpn`, `fra_for_jpn`, `ita_for_jpn`, `spa_for_jpn`,
`zho_for_jpn` hold **no English in either field** — known is Spanish or Japanese, target is Catalan,
Basque, German, French, Italian, Spanish or Chinese. What "translating pod-0" means for them is a
two-sided job, not one:

1. **Write the known side afresh** — the 89 new lines have to exist in Japanese (or Spanish) first,
   as a learner-facing prompt, and there is no Japanese canon to copy from. The existing 142 prove
   this was done once already: `pod0-nonenglish-known-audit-2026-08-08.md` shows these courses match
   `eng_for_jpn`'s Japanese on only 9-17 of 142 rows, *"largely because they use polite register
   where `eng_for_jpn` uses casual"* — independent wording, identical spine.
2. **Then translate the target side from that known side**, not from the English, if the known side
   is genuinely the controlled language for those learners.

Lineage is not in doubt — the audit proves all seven descend line-for-line from Aran's old English
canon, including the five placeholder rows resolved per language. So the English canon *does* apply
as the spine. The open questions are whether the Japanese/Spanish known side is authored fresh per
course (5 Japanese-known courses × 89 lines = 445 lines of Japanese, five times over, or once and
reused?), and which register the Japanese known side takes — the audit shows the five
Japanese-known courses already sit at a politer register than `eng_for_jpn`, so "copy
`eng_for_jpn`'s Japanese" is not available without breaking their own consistency.

### 5d. Two smaller ones already sitting in the record

- **Script/transliteration** is handled by the ledger (§1 of `buildPodGlossary`: pin one rendering
  of every name in the target script) and by `write-pod0-drafts.cjs`'s Unicode-block gate, which
  currently knows latin/cyrillic/greek/arabic. Estate targets include Japanese, Korean, Chinese,
  Hebrew, Thai, Hindi, Bengali, Gujarati, Punjabi, Tamil, Sinhala, Urdu, Nepali, Armenian — **the
  script gate needs those ranges before those courses are drafted**, or it silently passes anything.
- **Proofreading.** The Welsh model was: machine drafts → flagged → a named human clears them. That
  worked, and it is half done — Northern cleared (18 of 109 lines actually reworded, so the drafts
  were ~83% accepted verbatim), Southern untouched five days on. `pod-redo-scope-2026-08-07.md` §7
  records a *"no-human-check ruling"* that removes the proofreading step for the fleet. Those two
  cannot both be true at 69 courses. Given `deu_at_for_eng` is already serving 50 unproofread lines
  to learners on the live slug, this is the ruling that matters most before any fleet run.

---

## Explicit gaps

1. **No cost figure for any drafting run.** No tokens, spend or wall-clock recorded for the Welsh
   213 or the spa/deu_at 283. The only estimate in the estate (4-8 min/course, Sonnet tier) is
   marked "estimate, not a measurement" by its own author.
2. **The spa/deu_at draft source files are gone** (`scripts/pod-audit/*-drafts.json`, gitignored).
   Their applied text survives only in the DB; unlike Welsh there is no committed applied log, so
   there is no record of what was written against what English.
3. **Nobody has read the 7 no-English courses' target text for fidelity.** The 2026-08-08 audit
   proves lineage, and says so: *"this audit proves lineage, not translation quality."*
4. **The bundle-endpoint slug question is code-read, not tested** — I did not call the endpoint.
5. **I did not verify the learner-facing symptom on Welsh** (that a learner opening `cym_n_for_eng`
   sees no pod). The DB state and the player's hard-coded `:pod-0` id make it the expected outcome,
   but it is an inference from two files, not an observation of the app.
