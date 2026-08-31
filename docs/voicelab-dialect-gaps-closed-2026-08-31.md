# The two dialects that never said so, and the nine courses taught from a Welsh nobody had named

**2026-08-31.** Follow-up to `feat(voice-cast): a dialect is its own language, with its own cast`
(`fcfa5fe26`), which moved the casting axis onto the dialect entity and, in doing so, reported the
entities that state nothing. Tom: **do this now.**

Two things are closed here. The first was live and wrong today. The second was a missing column.

---

## Part 1 — Swiss German and Lebanese Arabic are their own entities now

### The defect, measured before it was fixed

`deu_ch_for_eng` and `ara_lb_for_eng` are genuinely their own dialects, and carried neither
`courses.voice_pool_key` nor a non-standard `courses.dialect`. Their siblings all did —
`deu_at`, `ara_eg`, `ara_sy` — so these two keyed on their parent language and a cast on plain
`deu` or `ara` reached straight into them. Asked of the real render-path resolver
(`voice-config-service.explainVoiceConfig`, the function every phase-8 handler goes through), with
three real rows written into an empty `voice_language_roles` and then removed:

```
-- BEFORE, cast on the parents only: deu, ara --
   deu_for_eng      target1 de-DE-KatjaNeural   <== CAST deu/f rank0
   deu_ch_for_eng   target1 de-DE-KatjaNeural   <== CAST deu/f rank0     <- THE DEFECT
   ara_for_eng      target1 ar-EG-SalmaNeural   <== CAST ara/f rank0
   ara_lb_for_eng   target1 ar-EG-SalmaNeural   <== CAST ara/f rank0     <- THE DEFECT
```

A German cast was replacing Swiss German's `de-CH-LeniNeural`, and an Arabic cast was replacing
Lebanese `ar-LB-LaylaNeural`, on 1,423 and 5,390 live clips' worth of course respectively.

### What was written

Three writes, all data, no code change needed for this part — which is the point of the previous
worker's design: an entity is *stated*, never inferred.

| what | value | why this value |
|---|---|---|
| `courses.voice_pool_key` on `deu_ch_for_eng` | `deu_ch` | the column its siblings already carry |
| `courses.voice_pool_key` on `ara_lb_for_eng` | `ara_lb` | same |
| `app_config.pod_voice_pools['deu_ch']` | Leni (f) `azure de-CH-LeniNeural` + Jan (m) `azure de-CH-JanNeural` | the voices the course **already speaks in** — 1,423 target1 and 236 target2 clips — and `docs/deu-ch-mixed-provider-readiness-2026-08-28.md` records them as picked by ear |
| `app_config.pod_voice_pools['ara_lb']` | Layla (f) `azure ar-LB-LaylaNeural` + Rami (m) `azure ar-LB-RamiNeural` | the voices the course already speaks in — 5,390 target1 and 5,390 target2 clips, live since May |

The pool entries are not optional extras. `tools/pod-sync.cjs` **refuses** a `voice_pool_key` with
no `pod_voice_pools` entry — *"refusing to fall back, which would silently miscast"* — so writing
the key without the pool would have converted a silent miscast into a hard failure of every pod
sync on those two courses. Both halves went in one gated run.

**Nothing here is a new casting decision.** Each pool records what its course already sounds like.
For `deu_ch` that is also a ruling Tom made by ear; for `ara_lb` it is not, and this document does
not claim otherwise — it records the status quo so a re-sync reproduces it instead of inventing
something.

Verified afterwards, same method:

```
-- AFTER, cast on the parents only: deu, ara --
   deu_for_eng      target1 de-DE-KatjaNeural   <== CAST deu/f rank0
   deu_ch_for_eng   target1 -                     (stored config, untouched)   <- FIXED
   ara_for_eng      target1 ar-EG-SalmaNeural   <== CAST ara/f rank0
   ara_lb_for_eng   target1 -                     (stored config, untouched)   <- FIXED

-- AFTER, cast on the dialects only: deu_ch, ara_lb --
   deu_for_eng      target1 -                     (stored config, untouched)
   deu_at_for_eng   target1 -                     (stored config, untouched)
   deu_ch_for_eng   target1 de-DE-KatjaNeural   <== CAST deu_ch/f rank0        <- and it MOVES
   ara_for_eng      target1 -                     (stored config, untouched)
   ara_eg_for_eng   target1 -                     (stored config, untouched)
   ara_lb_for_eng   target1 ar-EG-SalmaNeural   <== CAST ara_lb/f rank0        <- and it MOVES

-- RESTORED, nothing cast anywhere --   identical to BASELINE, 0 rows left
```

And `tools/pod-sync.cjs`'s own `poolKeysForCourse` now resolves both without throwing:
`deu_ch_for_eng → {target: "deu_ch", known: "eng"}`, `ara_lb_for_eng → {target: "ara_lb", known: "eng"}`.

The Voice Lab Languages screen went 86 rows → 88, the two new ones carrying `dialectOf` (`deu`,
`ara`) so neither can be mistaken for a duplicate.

---

## Part 2 — `courses.known_dialect`: which Welsh a learner already has

### There was no column, and that was the whole problem

`courses.dialect` states the dialect of a course's **target** content — *"a Southern Welsh course is
Southern as a fact of its content"* (Tom, 2026-08-19). It says nothing about the other side. Nine
courses are taught **from** Welsh — `spa_for_cym`, `deu_for_cym` and seven siblings — and Welsh has
two variants in play here. Nothing in the data said which one those learners have.

`courses.known_dialect text NULL` (migration `20260831_courses_known_dialect.sql`) is that column.

**It is nullable where `courses.dialect` is NOT NULL DEFAULT 'standard', and the difference is
deliberate.** `dialect` defaults safely because every non-Welsh, non-Irish course genuinely *is*
standard — one dialect, so the default is a fact. The known side is not like that: a course taught
from Spanish, French, German, Arabic or Portuguese is taught from a language that **has** a regional
fork on this estate, and nobody has ever ruled which side of it that known text sits on. Writing
`'standard'` there would be inventing an answer. So **NULL means NOT STATED**, and it means only
that.

### How the nine were determined — from their own text, with a control

Not from the course code, and not from a linguist's memory. Nine diagnostic north/south lexeme
families (`efo`/`rŵan`/`isio`/`gen i`/`allan`/`taid`/`nain` against `gyda`/`nawr`/`moyn`/`mas`/
`tad-cu`/`mam-gu`/`lan`/`wi'n`/`rwy`) are run **first against the estate's own labelled corpora**,
and the whole run aborts before reading a single `*_for_cym` course unless they separate them:

| control | `courses.dialect` says | the markers read | |
|---|---|---|---|
| `cym_n_for_eng` target text | north | **north** — 95 northern-marked sentences, 0 southern | ✅ |
| `cym_s_for_eng` target text | south | **south** — 106 southern-marked sentences, 0 northern | ✅ |

Then, against each of the nine courses' own 668 Welsh `known_text` rows — nine independent reads,
nine distinct corpora (their MD5s all differ):

| course | northern-marked sentences | southern | written |
|---|---|---|---|
| `ara_for_cym` | 179 | 0 | `north` |
| `deu_for_cym` | 179 | 0 | `north` |
| `fra_for_cym` | 179 | 0 | `north` |
| `ita_for_cym` | 179 | 0 | `north` |
| `jpn_for_cym` | 179 | 0 | `north` |
| `kor_for_cym` | 179 | 0 | `north` |
| `por_for_cym` | 179 | 0 | `north` |
| `spa_for_cym` | 179 | 0 | `north` |
| `zho_for_cym` | 179 | 0 | `north` |

The bar for writing anything is deliberately high — at least 20 dialect-marked sentences and at
least 95% of them on one side — and every one of the nine cleared it at 179 to 0. **No `*_for_cym`
course came out unknown.** The honest-unknown branch exists, is tested, and simply did not fire; had
a course been mixed or unmarked it would have been left NULL and named here.

### What IS left explicitly unknown, and why

**Ten rows, none of them Welsh-known.** Reported rather than defaulted:

| rows | what is unknown | why it is NULL |
|---|---|---|
| `eng_for_spa`, `cat_for_spa`, `eus_for_spa` | Peninsular or Mexican Spanish on the known side | `spa`/`spa_mx` is a real fork on this estate and nobody has ruled which one these teach from |
| `eng_for_fra`, `bre_for_fra` | metropolitan or Quebec French | `fra`/`fra_ca` fork, unruled |
| `eng_for_deu` | German, Austrian or Swiss | `deu`/`deu_at`/`deu_ch` fork, unruled |
| `eng_for_ara` | MSA, Egyptian, Syrian or Lebanese | `ara`/`ara_eg`/`ara_sy`/`ara_lb` fork, unruled |
| `eng_for_por` | European or Brazilian Portuguese | `por`/`por_br` fork, unruled |
| `zho_for_gle` | which Irish — Connemara, Munster or Ulster | three Irish dialects exist as entities; this course states none |
| every other course | nothing to state | their known language has no fork on this estate |

These are **not** in scope of Tom's ask, which was Welsh, and none of them is a live defect today —
a NULL keys on the base language, which is exactly the behaviour they have always had. They are
listed because the column now makes the question askable, and an unasked question left off a report
is the kind of gap that becomes poison later.

One more of the same family, on the **target** side, found while checking: **`cym_for_yor` teaches
Welsh and states no dialect**, so it keys on plain `cym`. It is the exact shape of the two courses
Part 1 just fixed. `cym_anthem_for_jpn` is a content variant, not a dialect, and correctly stays as
it is.

### The column is read, not decorative

`services/shared/cast-language-key.cjs` now keys the known side on it, symmetrically with the target
side — which is what makes the ruling *"a dialect is its own language"* true on whichever side of a
course the language stands. Three deliberate asymmetries are tested:

- the known side **never** reads `voice_pool_key` (that states a TARGET pool — reading it would give
  `ara_lb_for_eng`'s English narration an `ara_lb` cast);
- the known side **never** reads `courses.dialect` (`cym_n_for_eng`'s known side is plain English,
  not `eng_north`);
- `'standard'` and NULL both mean *no statement*, so neither can become an entity.

`services/voicelab/registry.cjs` groups the screen's known-side rows on the same key, so the screen
cannot offer a guide slot that reaches nothing: `cym_north` now carries **knownCourses = 9**, where
plain `cym` carried them before. The measured `voice_guide_in_use` view is still read at the BASE
language and deliberately so — it counts clips by `courses.known_lang` and cannot tell one Welsh
from another. A **measurement** is asked of the base; a **decision** is asked of the entity.

Proof on the real resolver, after the backfill — casting `cym` and casting `cym_north` in turn:

```
   spa_for_cym   known  REFUSED, human-recorded: known is spoken in cym_north, a human-recorded language
```

The known role of a Spanish course now resolves as **`cym_north`**, and the human-voice guard still
holds over it — which is the second half of the proof, because the guard reads the BASE of whatever
the key returns. Welsh is human-recorded whichever Welsh it is.

---

## What did not change

- Every course that states nothing regional on either side keys on its base language and resolves
  byte for byte as before. The RESTORED probe is identical to BASELINE.
- The empty-table invariant survives: with no cast rows anywhere, resolution is the stored config.
- No audio was rendered, no clip touched, no row deleted. `voice_language_roles` is back to the zero
  rows it started with.

## Files

- `database/migrations/20260831_courses_known_dialect.sql` (+ `.ROLLBACK.sql`) — the column, applied
- `tools/dialect-entity-gaps-2026-08-31.cjs` — the gated write; `--apply` off by default, before-state
  assertions, aborts on drift, idempotent, exact reconcile after write
- `docs/voicelab/dialect-entity-gaps-2026-08-31-{dryrun,applied}-log.json` — per-row logs
- `services/shared/cast-language-key.cjs` — the known side reads `known_dialect`
- `services/voice-config-service.cjs` — the cast cache tops up all three columns, not two
- `services/voicelab/registry.cjs` — known-side rows and `phraseReach` key on the cast key
- `services/shared/cast-language-key.test.cjs` — 24 tests (10 new, all known-side)

Suites run: `services/shared` (79 tests) and `services/voicelab` (69 tests), all passing.
