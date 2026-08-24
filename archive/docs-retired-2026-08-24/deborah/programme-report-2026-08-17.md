# Deborah's findings — programme report

**2026-08-17, for Kai.** Her findings are now in the repo at
`docs/deborah/findings-2026-08-17.md` (committed — they no longer live only in Slack).
Nothing has been posted to Deborah.

**Addendum incorporated.** Kai's second Slack excerpt (native verdicts, the confirmed
R95 instance, and the "enumerate all rounds" ask) is answered in §Addendum at the end,
and the seven native verdicts have an implementation plan at
`docs/deborah/eus-native-verdicts-implementation-2026-08-17.md`.

> **Two things in the addendum change the picture, and one of them is urgent.**
>
> 1. **Tom's lane already diagnosed and fixed this revert bug — twice, with row-level
>    evidence.** My independent code reading landed on the same mechanism he proved.
>    The serving bug was closed on 2026-08-12 and is deployed. So the right posture is
>    **validate his fix**, not re-diagnose from scratch — see §Addendum 2.
> 2. **Deborah may be re-doing Basque audio right now that does not need re-doing.**
>    His 2026-08-14 forensics concluded, on the bytes, *"Deborah needs to redo
>    nothing."* If that still holds for 08-15→17 — which I could not check — then the
>    most valuable thing you can do today is tell her to stop before she spends
>    another day on it. **I could not verify the 08-15→17 window, so treat this as a
>    thing to check first, not a conclusion.**

---

## Read this first: the database refused every connection for the whole session

Phase 1 triage, Phase 4 counts, and the *evidence* for the eus alarm all need live
reads. **I could not make a single one.** From 12:55Z to 13:30Z, continuously retried:

| Path tried | Result |
|---|---|
| `pg` direct, session pooler `:5432` | `FATAL 08006 Failed to connect to database: {:error, :timeout}` |
| `pg` direct, transaction pooler `:6543` | same |
| PostgREST via service key | **HTTP 522 from Cloudflare — "Connection timed out"** |
| `@supabase/supabase-js` | same 522, returned as an HTML error page |
| **Local production-api `:3470`, non-DB route** | **404 in 4 ms — the service is alive** |
| Local production-api `:3470`, DB-backed route | hangs past 40 s |

The last two rows rule out my credentials and my machine. **A 522 means Cloudflare
could not reach the Supabase origin at all** — that is stronger than "the pool is busy".

**I checked whether it's us or them, and cannot cleanly attribute it:**
`status.supabase.com` shows an **active "API Gateway — Degraded Performance"**
incident, with Database and Connection Pooler reported operational and `eu-west-1`
operational. The gateway incident is a plausible external cause for the REST 522 —
**but the direct Postgres path on both pooler ports does not traverse that gateway,
and it timed out too.** Both paths failing at once is what an overloaded project
origin looks like, with the gateway degradation possibly compounding it.

Practical read for you: the pooler timeouts are the half that worker load would
cause and the half within our control — which is why I held the fan-out. The 522 is
the half that matches a live Supabase incident. A poller is still running; nothing
has opened in 45 minutes.

**So I did not fan out a single worker.** Every worker would have queued behind the
same closed pool, deepened the starvation, and reported the same gap I'm reporting
once. Holding the fan-out was the whole point of your pacing instruction. **0 of 15
workers used.**

**What this means for the deliverable, stated plainly:**

- ❌ **No item's live state was verified.** I cannot tell you whether the first few
  eng_for_por items are already fixed. Your belief is neither confirmed nor refuted.
- ❌ **No cross-course counts.** Phase 4 produced tools, not numbers.
- ❌ **Nothing was fixed.** Phase 3 did not start. No content was edited, no audio
  rendered, no link touched.
- ✅ The eus revert **mechanism** is narrowed to four named channels with code
  evidence, and one of them implies her lost work is *recoverable*.
- ✅ Every **question** in her list is answered, with evidence.
- ✅ The two systematic defects she found are now **measurable** — tools built and
  unit-tested against her own examples, ready to fire the moment the pool opens.

---

## Phase 2 — THE ALARM: what reverts Deborah's Basque fixes

She reports two different losses, and they are **not the same bug**:

1. *Text kept, voice reverted to the old wording* — the audio pointer or bytes moved.
2. *S0033/R95: her corrected Builds reverted outright* — the **text** was destroyed.

### This is the third sighting because the root cause was never closed

`docs/audio-repair-2026-08-08/why-manual-fixes-get-erased.md` already proved the
family, for German, with row-level evidence: **"the pipeline decides what a slot
should hold by matching TEXT, and nothing else."** Three of Tom's five hand-fixes
were erased; the two that kept canonical text survived. Three for three, both ways.

That document's closing finding is the one that matters today:

> the estate protects human **bytes** in six separate places, and protects
> **nothing at all** about a human's decision on *which row a slot points at*.
> That class of correction has no representation in the schema, so no code can
> honour it.

Deborah's corrections are exactly that class. **Nothing has been added to the schema
since to represent them.** There is still no `locked`, `pinned`, `approved` or
`do_not_touch` column anywhere on the audio path. So her work is unprotected by
construction, and re-fixing her items before that changes will lose them a fourth time.

### The four candidate channels, from code

I built the probe to *discriminate* between these rather than confirm a favourite
(`tools/deborah/eus-revert-forensics.cjs`). Each has a distinct fingerprint.

**A — Upsert overwrites her clip in place.** `services/phases/phase8-audio-v13.cjs:5136`
upserts `course_audio` on `(course_code, text_normalized, language, role, voice_id)`.
The code's own comment, measured 2026-08-07, says it outright:

> a "." variant shares its identity key with the unpunctuated clip: re-rendering
> the plain text later on the same voice upserts the same row and overwrites the
> tuned `s3_key`. […] Tuning done with "." is therefore not durable against a
> later course-wide pass.

Fingerprint: pointer never moves, text never changes, `audio_revision` bumps.
Invisible unless you read the revisions ledger. **Fits "text kept, voice reverted" exactly.**

**B — The trigger re-resolves to an older clip.** `null_lego_audio_on_text_change`
(`database/migrations/20260806_audio_link_integrity.sql`) re-points on *any*
`target_text` change, via `audio_id_for_text()`, which picks among rows whose
`text_normalized` matches — ranked human-first, then newest. But
`/regenerate-lego` deliberately writes the **spoken** text, which may differ from
`course_legos.target_text` ("LEGO TEXT IS LOCKED — never written"). When it differs,
**her clip is invisible to that lookup and an older clip wins.** eus is a TTS course,
so the `origin='human'` preference never fires to protect her.

**C — Text-vs-voiced desync.** The row claims her new wording while the mp3 still
speaks the old. This is the **only** channel that explains her S0006/R19 report —
text `gogoratzen saiatzen ari naiz` correct, voice saying `gogoratu nahian ari naiz`
— while every text field on screen looks right. `word_boundaries` is the only
witness to what TTS actually spoke; the probe compares it against `.text`.
Her S0029/R87 and S0034/R98 items have the same shape.

**D — Redo destroyed the Builds (R95).** `POST /api/build/redo` deletes a seed's
phrases and legos, then rebuilds. That destroys hand-corrected Builds with no
trace — precisely her R95 symptom, and a *text* loss, not an audio one.

> **The recoverable news.** I checked whether the 2026-08-11 snapshot fix ever
> landed: `services/course-builder/routes/build.cjs` on `origin/main` **does** call
> `snapshotSeeds`, and the migration was applied live. So redo now snapshots before
> deleting. **If channel D is what hit R95, her corrected Builds are still in
> `seed_redo_snapshots` and can be restored with `POST /api/build/redo-undo`
> (`{seed: 33}`), no TTS and no regeneration.** The probe checks for that row first.
> This is the single highest-value thing to run when the pool opens.

### What I could not do

I could not read one row, so I cannot tell you **which** channel fired, or how many
of her thirteen Basque items each accounts for. The channels are code-evidenced;
the attribution is not. **Do not treat this section as a diagnosis — it is a
narrowed suspect list with a probe pointed at it.**

---

## Phase 1 — triage: classification (complete) and live state (blocked)

Classification needs no DB and is done. The **State** column is empty for every row
because verifying it needs the DB — including the eng_for_por items you believe are
already fixed.

### eng_for_por

| Item | Class | State |
|---|---|---|
| S001 R2 — Build 1 ahead of what's introduced | (a) mechanical — ordering | unverified |
| S002 R6 — "I'd like" before R31 | (a) mechanical — ordering | unverified |
| S012 R33 — Cons 1 ahead of R34 | (a) mechanical — ordering | unverified |
| S0028 R23 — "as soon as you can" → "as soon as possible" | (c) content-design, **cross-course** | unverified |
| S0037 R104 — Build 7 ahead of R111/R112 | (a) mechanical — ordering | unverified |
| S0042 R118 — "than" mispronounced both voices | (b) voice/render | unverified |
| S0045 R126 — stray dots "tudo…" | (a) mechanical, **audio-first** ⚠ | unverified |

⚠ S0045 is not the one-character fix it looks like. Under
`null_lego_audio_on_text_change`, editing that text re-resolves the audio link
immediately — and per the code comment above, an ellipsis has its **own** identity
key, so `tudo…` and `tudo` are different clips. Deleting the dots repoints the slot
at a different clip or none. Fix `course_audio.text` before the row pointing at it,
per the audio-first sequencing rule, and verify the link after.

### spa_for_eng — she has stopped checking, and she is right to have

The filler-Build defect. **The rule she is describing already exists in the codebase**
— `services/course-builder/routes/qa.cjs:86`:

> `- Flag: BUILD phrases with meaningless filler (LEGO + "here" or LEGO + "please")`

and three lines above it, "Flag: phrases that all follow the exact same template
pattern". She independently rediscovered a rule we already wrote down. **The defect
is not a missing rule — it is that the rule lives only inside an LLM QA prompt,
which is advisory and can simply not run.** That is the generation-level answer you
asked me to scope: it needs a *deterministic* gate, not a better prompt.

So I wrote one: **`tools/deborah/filler-build-scan.cjs`**. A Build is filler when its
known text is the LEGO plus a residue of 1–3 tokens and nothing else. Unit-tested
offline against her five real examples:

| Her example | Residue found | Verdict |
|---|---|---|
| `was absolutely right yesterday` (R1150) | `yesterday` | filler ✓ |
| `in the mud before` (R1156) | `before` | filler ✓ |
| `small for everyone` (R1162) | `for everyone` | filler ✓ |
| `I think he was absolutely right about the weather` | 6 tokens | **not** filler ✓ |
| `in the mud` (LEGO alone) | 0 tokens | different defect, excluded ✓ |

Five for five, with the control case rejected. It reports RAW and CONFIRMED
separately (confirmed = a LEGO padded ≥2 different ways *with* residues that recur
across the course — the template, not a coincidence), and it is Unicode-aware:
`\p{L}\p{M}` with `/u`, verified tokenising Basque, Yoruba with combining tone
marks, Devanagari and Arabic. ASCII `\b` is why earlier audits read 0 defects across
31 non-Latin courses.

**Not run. No counts. `--all-eng-known` is ready.** I have not mass-regenerated
anything and will not without your ruling.

### eng_for_ita

| Item | Class | Answer / state |
|---|---|---|
| S0018 R48 `incontrarci` | (d) question → **confirmed hazard** | see below |
| S0021 R59 `sua`/`suo` | (d) question → **answered; ZUT issue** | see below |
| S0024 R65 variation | (c) content-design | for your ruling |
| S0029 R79 `riesco` coverage | (a) mechanical | unverified |
| S0039 R103 + S0041–S0048 `stanco` on the F voice | (b) voice/render, **systematic** | unverified |
| S0043 R114 — Cons 2 ahead of R115 | (a) mechanical — ordering | unverified |
| S0053 R142/R143 — odd "put" phrases | (c) content-design | needs native ruling |

### eus_for_eng, ara_lb_for_eng

All thirteen Basque items are **frozen pending the revert mechanism** — that is the
correct order of operations, and fixing them first would waste her work a fourth
time. Two of them are also cross-cutting: S0028/R83 is the same pattern as por
S0028, and R62 (`haren`) is a removal proposal for you.

---

## Questions class — answered with evidence

### Arabic `!` on the wrong side — she is right, and it is a *rendering* bug, not a content bug

Her observation is more precise than it looks: **`?` correct, `!` wrong**, in the same
sentences. That asymmetry is the whole answer.

- `؟` U+061F ARABIC QUESTION MARK has Unicode bidi class **AL** — a *strong*
  right-to-left character. It joins the Arabic run and lands correctly at the
  visual left, whatever the paragraph direction.
- `!` U+0021 has bidi class **ON** (Other Neutral). A trailing neutral takes the
  **paragraph** direction. Under an LTR paragraph it jumps to the visual right —
  "appearing right, like English", exactly as she describes.

So both marks are almost certainly stored correctly at the logical end; only the
neutral one is mis-*rendered*. Which requires the paragraph direction to be LTR — and
I verified that it is, on both surfaces she could be looking at:

- **Learning app**: searched every `.vue`/`.ts`/`.css`/`.html` in `packages/` and
  `apps/` — **no `dir` attribute, no `direction:`, no `unicode-bidi` anywhere.**
- **Popty dashboard**: exactly one `dir` in the entire `src/` tree —
  `src/views/PodDetailView.vue:237`, a pod textarea. The Content Checking cards she
  reads have none.

**The fix is `dir="rtl"` (or `dir="auto"`) on the text-bearing elements in both
surfaces — not an edit to a single Arabic sentence.** Editing content here would be
wrong: it would paper a rendering bug with a content hack (an inserted U+200F), in
every RTL course, forever. Note this affects heb/ara/fas at beta today.

*Gap: I have not confirmed by reading rows that the `!` really is stored last. If a
generator put it first, that's a separate content defect on top. One query, blocked.*

### Arabic: are "I speak" and bare "speak" the same?

**Yes — for the declarative.** Arabic is a pro-drop language: the verb inflects for
person, so أتكلم (*atakallam*) *is* "I speak", and the independent pronoun أنا
(*anā*) is optional and emphatic ("*I* speak", as against someone else).

**One caveat that matters for the course.** Bare English "speak" is ambiguous in a
way the Arabic is not: as an **imperative** it is a different form entirely
(تكلّم *takallam*). So if the known side ever uses bare "speak" as a command, the
target must change. And two known prompts ("speak", "I speak") mapping to one target
form is a prompt-side ZUT question for you, not a translation error.

### Italian `incontrarci` — her suspicion is correct

`incontrarci` is `incontrare` + the clitic `-ci`: "to meet **us** / to meet each
other (we)". The clitic on an infinitive **must** agree with the subject:
`incontrarmi` (io), `incontrarti` (tu), `incontrarsi` (lui/lei/loro),
`incontrarci` (noi), `incontrarvi` (voi). A LEGO frozen as `incontrarci` glossed
"to meet" is therefore **wrong for every subject except *noi***, and her note that
"Popty handles reflexives poorly" is a fair generalisation of it.

*Gap: which Builds under R48 use it with which subject — needs the DB.*

### Italian `sua` vs `suo` — the Italian is fine; the *methodology* is not

Italian possessives agree with the **thing possessed**, never the possessor. So
"her house" is `la sua casa` and "her book" is `il suo libro` — **both correct for
"her"**, and a single form never tells you the possessor's gender. Deborah's "ok?"
deserves a two-part answer:

- **As Italian: yes, correct.** No grammatical defect. Don't "fix" it.
- **As SSi method: no.** The known prompt "her" maps to two different target forms.
  That is a ZUT violation at the prompt level — one known prompt, one target form.
  The fix is on the **known** side: prompt with the possessed noun ("her house",
  "her book") so each prompt has exactly one target. That is a rails decision, and
  it's yours.

---

## Phase 3 — fixes: none applied

No content edited, no audio rendered, no link moved, no TTS spent. Everything in the
mechanical and voice classes needs a live read to locate first. The two content-design
proposals (as-soon-as-possible; `haren` removal) are named above and want
walk-the-course write-ups I could not build without reading the surrounding rounds.

---

## Phase 4 — cross-course: tools, no counts

| Pattern she found | Sweep status |
|---|---|
| Filler Builds (`LEGO + tiny adverb`) | **Tool built + unit-tested.** Not run. `--all-eng-known` ready. |
| as-soon-as-you-can class | Not swept. Confirmed in 2 courses **by her**, not by me. |
| Voice gender agreement (`stanco`/`stanca`) | Not swept. `tools/audio-gender-lint.cjs` exists — I have not read or validated it. |
| Text-vs-voiced mismatch via `word_boundaries` | Logic built inside the eus probe; not generalised, not run. |

**Every number in this table would be a fabrication. There are none.**

### Her closing note: ara_eg_for_eng and nld_for_eng "not yet addressed"

I could not find her points, and the reason is itself worth your attention.

- The proofreading tool at `scripts/proofread-live/tools/proofread/` keeps its
  progress on local disk, and it holds **exactly one course: `fin_for_eng`.**
  Her Dutch and Egyptian-Arabic points are not in it.
- Three flag tables do exist — `course_qa_flags`, `audio_flags`, `sample_flags`.
  Reading them is blocked. That is the query to run.
- If they aren't there either, then **her review has no store behind it at all** —
  which is exactly why "not yet addressed" cannot be tracked, and why she is
  re-checking Basque by hand right now.
- Adjacent but *not* hers: `docs/a108/t22-nld-a131-closeout-2026-08-17.md` settles a
  Dutch **pod** register clip by Tom's ear today. Different artefact; don't conflate.

---

## What to do next, in order

1. **When the pool opens, run `eus-revert-forensics.cjs` before touching any Basque
   item.** Channel D first: if seed 33 has a snapshot, her R95 Builds come back with
   one un-destructive call.
2. **Close the revert channel before re-fixing her work.** The 2026-08-08 document
   named the gap — no schema representation for "a human chose this pointer" — and
   nothing has closed it since. This is the fourth-loss risk.
3. **Run `filler-build-scan.cjs --all-eng-known`** and bring you counts before any
   regeneration decision on spa_for_eng.
4. **Ship `dir="rtl"`** in the two surfaces. It answers her Arabic question properly
   and helps every RTL course at once.
5. **Rule on the two rails questions**: "her" → `sua`/`suo` prompting, and
   "as soon as possible" across por + eus S0028 as one change.

---

---

# Addendum — Kai's second excerpt

## Addendum 1 — the seven native verdicts

Full plan: **`docs/deborah/eus-native-verdicts-implementation-2026-08-17.md`**.
**Nothing applied** — every write needs the DB. Two results worth surfacing here:

**Her basket question is answered, from the repo, without the DB.** She ruled `egotea`
correct and said whether to *teach* it "depends on the other sentences in the basket".
Tom enumerated that exact basket on 08-16
(`docs/basque-seven-for-deborah-followup-2026-08-16.md`): after his A-122 flip of
`S0055L04`, **seven siblings still say `esna izatea`, and every one of them means
"being awake"** — the same temporary state her ruling covers. The basket is homogeneous,
so the condition she attached is satisfied as strongly as it can be:
**teach `egotea`, flip all seven.** Leaving them split would also be a ZUT hazard in
itself — one prompt, two target forms.

Two things I will not fix silently: sentence 5, `esna izatea baina nekatuta nago`
("being awake but I'm tired"), is broken in *both* languages — the swap makes it
grammatical and still meaningless, so it needs a rewrite decision from you. And her
R299 sibling (the phrase she "just corrected" saying `sentitzen dut`) **I could not
find** — that search is blocked, and it should be resolved *before* the R299 change
lands, in case the sibling set a different frame.

**What Tom already applied from her earlier answers:** commit `882bbbac` (2026-08-16),
`fix(eus): flip S0055L04 to egotea (A-122)`, with dry-run and applied logs. That is
consistent with her verdict — `egotea` is what she confirms. **I could not verify the
row actually holds `egotea` now, or that its audio was handled**, so "consistent with
her verdict" is a code-and-log check, not a live one.

## Addendum 2 — the revert bug: Tom fixed it, and my job is to validate, not re-diagnose

You were right to send me to his lane first. He has **two** prior forensic passes:

| Doc | Date | Finding |
|---|---|---|
| `docs/eus-audio-revert-forensics-2026-08-12/findings.md` | 08-12 | proved the storage mechanism: in-place `s3_key` swaps leaving `audio_revision` at 1; **"R95 Build 2 has no edit on record"** |
| `docs/eus-audio-revert-forensics-2026-08-14/findings.md` | 08-14 | **no reversion occurred** — three independent detectors, all zero, over the whole audit reach |
| `docs/eus-deborah-rulings-2026-08-14/audio-reversion-pointer-finding.md` | 08-14 | the R95 Build 2 gap **closed**: she regenerated it 08-14 10:13Z, DB points at her new bytes |

**My independent Channel A was the same mechanism he proved** — the
upsert-on-conflict at `phase8-audio-v13.cjs` that updates `s3_key` in place. I reached
it from the code; he had already measured it: **182 swaps, 182 keys changed, 0
revisions bumped.** Treat my four-channel list as corroboration of his §2, not as a
new diagnosis.

**The actual cause was serving, not storage**, and it is closed:
`resolvedUrlCache` was keyed on the clip uuid, and the regeneration path *keeps the
uuid* and swaps only the `s3_key` — so the cache held a URL that outlived its bytes.
Fixed 2026-08-12 15:32Z (`84d37385`), and he verified it on the **served** bundle, not
just the source.

**Validation I could do without the DB — it has not regressed.** On today's
`origin/main`: `forgetAudioUrl` is still defined (`src/composables/useScriptPlayer.js:50`),
the 5-minute TTL is intact, and it is still called from all three regeneration handlers
in `ScriptViewer.vue` (1922, 2072, 2225). No handler has been added without it.

**One residual weakness in that fix, code-visible.** All three calls go through
`learningJourneyRef.value?.player?.forgetAudioUrl(...)` — optional chaining. If that
component isn't mounted when she regenerates, **the invalidation silently no-ops** and
the 5-minute TTL is the only backstop. Not the bug she reported, but it is a
best-effort invalidation presented as a fix, and worth hardening.

### A hypothesis I raised and then refuted myself — recorded so nobody re-runs it

I thought I had found a second, unclosed vector in the **learner** app. The chain looked
strong: the PWA caches audio under per-clip versioned refs `<uuid>.vN`, and
`buildAudioRef()` emits a version suffix **only when `audio_revision > 1`**
(`ssi-learning-app/api/_utils/audioAccess.ts:129-131`; `fetchRevisedAudioRefs` filters
`.gt('audio_revision', 1)`). Since every eus clip sits at revision 1 and her regens
never bump it, her new bytes would land under a ref *identical* to the old one — and
the `audio_stamp` lane deliberately does **not** clear the audio store, precisely
because it trusts versioned refs to make repaired clips miss. That would mean the
learner keeps the old take permanently.

**It is refuted.** Both regeneration handlers call
`bumpCourseVersion(courseCode, 'patch')`, which writes `courses.content_version`
(`services/shared/course-version.cjs:20-45`) — visible firing in the live log,
`[Version] eus_for_eng: 0.700.149 → 0.700.150`. A `content_version` change is the
learner cache's **lane 1**, which clears the script cache *and* the Service Worker
audio cache. So the learner heals. The versioned-ref weakness is real in isolation but
is not reachable, because the version bump fires on the same path.

## Addendum 3 — enumerate ALL rounds, not just R95

Built: **`tools/deborah/eus-revert-enumerate.sql`** — Tom's three detectors, plus the
text-vs-voiced and redo-snapshot checks, re-parameterised and reported **per round**.
**Not run.**

The scope is deliberately narrow, and this is the useful part of the answer:
**his 08-14 pass already ran the enumeration over the whole audit reach
(2026-07-03 → 2026-08-14 19:40Z) and the answer was zero on every detector** — no clip's
`s3_key` ever returned to a previous value (0 repeats in 362 states), no pointer ever
returned to a previous clip (0 rows). So "enumerate all rounds where regeneration was
followed by reversion" is **already answered for everything up to 08-14 19:40Z, and the
answer is none.**

What is genuinely unaudited is **2026-08-14 19:40Z → now** — which is exactly the window
she is working in. That is what the SQL targets, and it is the one thing I would run
first when the origin comes back, because it decides whether her current re-do work is
necessary at all.

**Where the enumeration can go blind, stated plainly:** `content_audit_log` records
UPDATE and DELETE only — **it cannot see an INSERT.** Her regenerations of *edited* text
mint a new row rather than colliding, so that whole population is invisible to the audit
log and has to be counted from `created_at` and cross-checked against pointer moves.
That is also the most likely reason the 08-12 pass found "no edit on record" for R95
Build 2 when an edit had in fact happened.

---

# ⚑ LIVE FINDINGS — the pool opened at 13:40Z and this is the answer

Everything above was written while the origin was returning 522. It reopened, and the
picture changed. **The revert alarm has a confirmed mechanism, and it is not the one
anybody has been chasing.**

## The mechanism: applying her rulings is what destroys her audio

Deborah's earlier Basque rulings were applied in **one batch at
`2026-08-14 19:38:01.972581+00`**. Four rows, one transaction (Tom's
`docs/eus-deborah-rulings-2026-08-14/apply-applied-log.json`, commit `be910c9f`).
Every one of them had a live `target1_audio_id` **before** that write. Every one is
**NULL now**:

| Round | Row | Old target text | Old target1 clip | Now |
|---|---|---|---|---|
| R18 | `S0006L02B03` | beste bat nahi dut | `a6cb1dcc…` | **NULL** |
| R18 | `S0006L02U04` | beste bat praktikatu nahi dut | `f3f06e93…` | **NULL** → *restored, see below* |
| R152 | `S0055L04U06` | ez zait gustatzen ondo lo egin ez dudanean esna egotea | `55988a0f…` | **NULL** |
| R299 | `S0115L02U04` | euskaraz hitz egiteko prest sentitzen naiz | `380fdbc8…` | **NULL** |

Plus Tom's separate A-122 flip on 2026-08-16 14:27:48Z (`S0055L04`, `izatea`→`egotea`):
**both `target1_audio_id` and `target2_audio_id` NULL**, and one older casualty at
R105 (`S0037L02` `kontuz`, silent since 2026-07-31).

**Why.** `null_lego_audio_on_text_change` / `null_phrase_audio_on_text_change` re-resolve
the link on any text change via `audio_id_for_text()`, matching on `text_normalized`.
No clip existed for the new Basque text, so the function returned NULL. I confirmed
there is **no `egotea` clip anywhere in the estate** — not in any course, any voice.

**So the loop she is trapped in is this:** she corrects text and re-voices it → her
ruling is applied to the text by a later batch → the trigger throws her audio link
away → she comes back, finds the text right and her voice gone, and reports it as a
reversion. **She is not wrong that her work is being destroyed. It is — by the act of
applying her own text verdicts.**

### Why the 08-14 all-clear and her experience both stand

The 08-14 forensics window ran to **19:40Z**. That batch landed at **19:38:01Z —
two minutes inside it.** Its three detectors asked "did any clip's `s3_key` return to a
previous value?" and "did any pointer return to a previous clip?" — both correctly zero.
**Nobody asked "did any pointer go to NULL?"** So "no reversion, nothing lost, Deborah
needs to redo nothing" was true about *bytes* and wrong about *reachability*. Both
reports are honest; the detector set had a hole exactly the shape of this bug.

### Current damage: 7 silent slots, and nothing has touched her audio since 08-14

`content_audit_log` since 2026-08-14 19:40Z, `eus_for_eng`: **`course_audio` 0 rows,
`course_practice_phrases` 0 rows**, `course_legos` **1** (Tom's deliberate flip),
`courses` 229 (stamp triggers only).

**So no in-place byte swap and no phrase change has occurred in three days.** The 109
new eus clips dated 2026-08-17 01:01Z are pod-0 conversation lines, not her work.

> **Tell Deborah to stop re-doing Basque audio.** Nothing is overwriting it. What she is
> hitting is **absence** — seven slots with no Basque clip at all — not reversion. Redoing
> a take cannot fix a NULL pointer, so the work she is doing right now cannot stick.

### What I did about it

- **Restored 1 of the 7, free.** `S0006L02U04` ("hitz bat ikasten saiatzen ari naiz"):
  two clips already existed in `eus_for_spa` with **exactly** this course's target voices
  (`azure_eu-ES-AinhoaNeural` / `AnderNeural`), correct roles, language `eus`. I HEAD-checked
  both S3 objects alive (38,304 B each) **before** moving any pointer, then relinked and
  re-verified both keys resolve. Before-image and a one-line rollback:
  `docs/deborah/eus-relink-2026-08-17-before-image.json`. No TTS, nothing deleted.
- **Queued an audio pass for the other 6** rather than rendering them — TTS costs money
  and is yours to approve: `queue-audio-pass.cjs eus_for_eng` (touched the existing pending
  request). The 6 are `S0055L04` (lego), `S0055L04U06`, `S0115L02U04`, `S0006L02B03`,
  `S0037L02` (lego) and `S0037L02B01`.

## R95 — her named instance: text landed, and the real defect is a different one

Her R95 report has two halves, and they need splitting:

- **"Her corrected Builds REVERTED" — they did not.** `S0033L01B02` reads
  `zenbat denbora daramazu ikasten?` and `B03` reads `noiz arte elkartu nahi duzu?`
  right now. Both of her corrections are in place, both clips carry the matching text,
  and the bytes were swapped to her 08-14 takes. Nothing to restore. **No redo-snapshot
  needed — my Channel D is refuted for R95.**
- **"Correct versions need `daramazu` and `noiz arte`, not yet introduced" — CONFIRMED,
  and worse than she put it.** Measured: `daramazu` and `noiz arte` appear in **no
  `course_legos` row anywhere in the course** — they are never introduced at all. They
  are first *used* at R95, in her own corrected Builds, and appear 3 and 5 times
  course-wide. So her linguistically-correct fix imports vocabulary the course never
  teaches. **This needs your ruling**: introduce `daramazu` / `noiz arte` as legos, or
  re-word the Builds within taught vocabulary.

## Her `sentitzen` sibling — found

She asked us to find a sibling she corrected in an earlier round and check consistency.
**It is `eus_for_eng:S0114L02U05` at R297** — `ikasten ari naizela sentitzen dut`,
"I feel as if I'm learning". The inconsistent row is one round later:

> **`eus_for_eng:S0115L02U05` (R299) — `ikasten ari naizela nagoenik sentitzen dut`**

It is wrong on *both* counts. It is **affirmative** yet carries `nagoenik`, which her
ruling says is negative-context only; and it is structurally broken — `ikasten ari
naizela` already carries the `-la` complementiser, so `nagoenik` is a second one wedged
in. Her R299 siblings that *are* negative (`U03`, `B03`, `U01`) all use `nagoenik`
correctly. **Not fixed — it needs her wording, and it would go silent like the others.**

## R325 — her verdict and the database disagree, and she is right

Kai's relay reads "lan hau CORRECT there — no change, clear any flag." **But the course
does not say `lan hau`. `S0126L01` teaches `lan honek`**, and applying her actual rule —
ergative `honek` only as a transitive subject — condemns four live phrases. Basque marks
transitive subjects ergative (`-k`) and intransitive subjects absolutive (unmarked), and
`da` is intransitive `izan`:

| Row | Current | Verb | Verdict |
|---|---|---|---|
| `S0126L01B03` | lan honek bikaina **da** | intransitive | ✗ → `lan hau bikaina da` |
| `S0126L01U01` | lan honek ona **da** | intransitive | ✗ → `lan hau ona da` |
| `S0126L01U03` | lan honek garrantzitsua **da** | intransitive | ✗ → `lan hau garrantzitsua da` |
| `S0126L01U04` | lan honek oso interesgarria **da** | intransitive | ✗ → `lan hau oso interesgarria da` |
| seed 126 | Lan honek …forma aldatzen ari da | **transitive** | ✓ correct |
| `S0126L01U02` | lan honek nire burmuina aldatzen ari da | **transitive** | ✓ correct |
| `S0126L01U06` | lan hau gustatzen zait | *gustatu* → absolutive | ✓ correct |
| **`S0126L01` (the LEGO)** | **lan honek** = "this work" | citation form | ⚠ ergative as the taught card |

So "no change" is the one reading her rule does **not** support. Either her verdict was
about a phrase rather than the LEGO, or the relay compressed it. **Please put the four
rows above back to her before anything is edited** — I have changed nothing here.
Separately, `lan honek ona da` glosses "this work is good **for me**" with no
`niretzat`: the English promises an argument the Basque doesn't have.

## Her closing note — the nld / ara_eg open points, located

They are **not** in `course_qa_flags`: that table holds nothing for nld_for_eng,
ara_eg_for_eng, eus_for_eng, eng_for_por, eng_for_ita or ara_lb_for_eng — its only rows
for any of her courses are 4 February `false_positive` rows in spa_for_eng. They are in
**`audio_flags`**, and they are genuinely unresolved:

| Course | Flags | By | Unresolved |
|---|---|---|---|
| `nld_for_eng` | **2** | **`deborah-am-pronunciation-2`** (2026-05-20) | **2** |
| `nld_for_eng` | 20 | `dashboard_user` (2026-06-08) | 20 |
| `ara_eg_for_eng` | 1,810 | `gender-prep` (machine, 2026-07-20) | 1,810 |
| `eus_for_eng` | 4 | `dashboard_user` (2026-06-11) | 4 |

**She is right that hers were not addressed.** Her two nld flags are a short-word TTS
pronunciation fix for "am", and **one of them has `regen_count = 0` — never regenerated,
not once.** Two things in them are worth your eye:

- The flagged `known` clip's text is **`'am…'`** — the pronunciation-nudge-by-ellipsis
  trick. That is precisely the fix the 2026-08-08 forensics proved gets erased by any
  text-matching pass, because `am…` and `am` are different clips.
- The paired `presentation` clip's stored text is **`The Dutch for — <phoneme alphabet=…`**
  — raw SSML baked into `course_audio.text`. Anything that re-renders from stored text
  without SSML handling will speak the markup aloud.

`ara_eg_for_eng`'s 1,810 are machine gender-prep flags, not hers, and its 11
`flagged_at` seeds are a separate queue. **Her Egyptian-Arabic points are not in any
store I can reach** — that part of her note remains an explicit gap, and it is the same
gap as before: her review has no ticket store behind it, so "addressed or not" cannot be
tracked.

## Corrections to what I wrote earlier in this document

- My **Channel D** (redo destroyed R95's Builds) is **refuted** — her Builds are intact,
  and no `seed_redo_snapshots` restore is needed.
- My **Channel B** is **confirmed, in its NULL branch**: the trigger re-resolves and,
  finding nothing, nulls. I had framed it as "an older clip wins"; the live failure is
  "no clip wins".
- The **Phase 4 numbers are still not mine** — workers **#924** (eng_for_por triage) and
  **#925** (cross-course sweep) are running and their reports land in this conversation.

---

*Writes this session: exactly one — the `S0006L02U04` relink, before-image and rollback
recorded. No TTS generated, nothing deleted, no text edited, nothing posted to Deborah.*

---

# ⚑ ESTATE SWEEP — this is not a Basque bug, it is an estate incident

Worker **#924** found the identical mechanism in `eng_for_por` (27 silent slots, all
dating to one 2026-08-06 batch, 23 of them from the "as soon as possible" change) and
flagged "are other courses affected?" as a gap. **I answered it. They are.**

I verified #924's count independently: `eng_for_por` = 25 phrase + 2 lego NULLs. Exact.

## 1,034 silent phrase slots across 19 courses

Courses where silent `target1` slots are a *small minority* of the total — the collateral
shape, as against a course that was simply never rendered:

| Course | Silent | of | % |
|---|---|---|---|
| **`spa_for_eng`** | **380** | 16,328 | 2.33% |
| `spa_mx_for_eng` | 156 | 12,688 | 1.23% |
| `zho_for_eng` | 149 | 11,879 | 1.25% |
| `ita_for_eng` | 71 | 13,507 | 0.53% |
| `fra_ca_for_eng` | 57 | 12,887 | 0.44% |
| `kor_for_eng` | 52 | 13,910 | 0.37% |
| `por_br_for_eng` | 45 | 14,179 | 0.32% |
| `eng_for_mar` | 34 | 12,848 | 0.26% |
| `por_for_eng` | 27 | 14,155 | 0.19% |
| `eng_for_por` | 24 | 6,011 | 0.40% |
| `ara_for_eng` | 17 | 12,638 | 0.13% |
| + 8 more (`cym_s`, `fra`, `eus`, `gle`, `heb`, `afr`, `hun`, `ukr`) | 22 | | |
| **TOTAL** | **1,034** | | |

## The signature holds, and it points at one day

For each silent slot I asked whether `content_audit_log` shows an UPDATE whose
`old_row` still carried a live `target1_audio_id` — i.e. it *had* audio and an edit took
it away:

| Course | Silent | **Confirmed lost to a text edit** | Loss dates |
|---|---|---|---|
| `spa_for_eng` | 380 | **380 (100%)** | 2026-07-31, 2026-08-06 |
| `spa_mx_for_eng` | 156 | 135 | 2026-08-06 |
| `ita_for_eng` | 71 | 30 | 2026-08-06 |
| `por_for_eng` | 27 | 5 | 2026-07-03 → 2026-08-06 |
| `zho_for_eng` | 149 | 4 | 2026-07-16 |

**`2026-08-06` recurs in four courses independently** — `spa_for_eng`, `spa_mx_for_eng`,
`ita_for_eng` and (per #924) `eng_for_por`. That was one estate-wide editing batch, and
it silenced learner-facing slots in every course it touched. Deborah's Basque case is
the same incident seen from one course.

**These "confirmed" numbers are a FLOOR, not a total.** `content_audit_log` is pruned to
roughly a 14-day hot window (`tools/archive-audit-log.cjs`), so losses older than that
cannot be attributed at all — which is exactly why `zho_for_eng` (4 of 149) and
`por_for_eng` (5 of 27) attribute so poorly. Their silent slots may be older collateral,
or may never have been rendered. **I did not distinguish those two causes.**

## The part that matters most

**`spa_for_eng` has 380 silent slots, 380 of them confirmed lost to a text edit — and it
is the course Deborah has STOPPED CHECKING.** She paused it over the filler-Build defect
and has therefore never reported the 380, because she never got to them. It is the
largest single concentration on the estate and nobody has been told.

For the rest of her courses: `eng_for_ita` is **clean (0)**. `eus_for_eng` is down to 4
after my relink. `ara_lb_for_eng` has 6,506 of 12,333 (53%) — that is the never-rendered
shape, not collateral, and consistent with her only just starting it.

## What this changes

The "as soon as possible" decision is no longer only a content-design question. **The
identical change has already been applied in `eng_for_por`, and it silenced 23 slots
there.** If it is applied to `eus_for_eng` S0028 the same way, it will silence that round
too. **Sequence the audio first, or don't apply it yet.**

*Additional writes: none. This section is measurement only.*
