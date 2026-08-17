# Deborah's findings — programme report

**2026-08-17, for Kai.** Her findings are now in the repo at
`docs/deborah/findings-2026-08-17.md` (committed — they no longer live only in Slack).
Nothing has been posted to Deborah.

---

## Read this first: the database refused every connection for the whole session

Phase 1 triage, Phase 4 counts, and the *evidence* for the eus alarm all need live
reads. **I could not make a single one.** From 12:55Z to 13:30Z, continuously retried:

| Path tried | Result |
|---|---|
| `pg` direct, session pooler `:5432` | `FATAL 08006 Failed to connect to database: {:error, :timeout}` |
| `pg` direct, transaction pooler `:6543` | same |
| PostgREST via service key | hangs past 120 s, no response |
| `@supabase/supabase-js` | hangs past 45 s |
| **Local production-api `:3470`, non-DB route** | **404 in 4 ms — the service is alive** |
| Local production-api `:3470`, DB-backed route | hangs past 40 s |

The last two rows are the diagnosis: this is not my credentials and not my machine.
The Supabase backend itself is saturated — exactly the starvation you warned about.
A poller is still running; nothing opened.

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

*Read-only session throughout. Nothing generated, nothing deleted, nothing relinked,
no TTS spent, nothing posted to Deborah.*
