# Could the native-built legacy Irish course be imported over `gle_for_eng`?

**Verdict: UNSUITABLE as an overwrite of `gle_for_eng`. Feasible — and quite clean — as an import to a NEW course code.**

Read-only code assessment for Kai, 2026-08-17. No importer was run, nothing was written to the
DB, no commits. Every claim below is a line in the main checkout (not the `.worktrees` copies),
or a `jq` reading of the 33MB export at `scripts/en-ga-compare/en-ga.json`.

---

## The one-paragraph answer

The importer would *technically* run — the legacy JSON matches its expected shape almost
field-for-field, which is unsurprising because `en-ga` is hard-coded in its alias table
(`database/lib/import-legacy-course-core.cjs:29`). But it mints practice-phrase IDs with
**exactly the same deterministic scheme the live course already uses**, and upserts on that ID
(`:535`, `:563`). So on `gle_for_eng` it is not an import at all — it is an **in-place text edit
of the rows 102 enrolled learners' progress is already filed against**. That is precisely the
event the standing content-change migration protocol exists to forbid. Two further facts seal
it: with `clearFirst` it deletes all 25,308 existing audio rows before anything replaces them
(make-before-break violated), and without `clearFirst` it leaves seeds 512–668 of the old
generated corpus standing, producing a hybrid course. It also runs **zero** validation gates.

---

## 1. Input shape — does the legacy export fit?

**It fits directly. No transform needed.** The importer was evidently written against this very
file family; `'en-ga': 'gle_for_eng'` is line 29 of its alias table.

| What the importer reads | Line | Present in `en-ga.json`? |
|---|---|---|
| `manifest.id` | `:815` | ✅ `"en-ga"` → resolves to `gle_for_eng` |
| `manifest.known` / `.target` | `:61-62` | ✅ `"en"` / `"ga"` → `eng` / `gle` (verified through `language-code-service`) |
| `manifest.introduction.{id,duration}` | `:193-205` | ✅ |
| `slices[0].seeds[]` | `:404` | ✅ 511 |
| `seed.node.known.text` / `.target.text` | `:412-413` | ✅ |
| `seed.introductionItems ?? seed.introduction_items` | `:459` | ✅ — snake_case branch, explicitly handled |
| `lego.node.known.text` / `.target.text` | `:464-465` | ✅ |
| `lego.nodes[].known.text` / `.target.text` | `:520,525-526` | ✅ 13,455 |
| `lego.presentation` (string) | `:598` | ✅ |
| `slices[0].samples` keyed by text → `[{id,duration,role}]` | `:164-170` | ✅ 33,442 keys / 49,180 rows |
| `orderedEncouragements` / `pooledEncouragements` | `:271-272` | ✅ 48 / 26 |

Counts confirmed by `jq`: **511 seeds, 1,938 legos, 13,455 phrases** — matching the README exactly.
`ROLE_MAP` (`:35-41`) maps the export's `source`→`known`, `target1`/`target2` pass through.
Sample roles present: source 15,689 / target1 15,743 / target2 15,736 / presentation 2,012.

**Fields the export has that the importer silently drops:** `lemmas[]`, `tokens[]` (every
known/target node carries them — they are never read), `seed_sentence.canonical`, `seed.id` and
`node.id` UUIDs, `cadence`, `paywallEncouragements`. Components/decomposition are written as
`components: null` (`:475`) — so **no LEGO breakdowns and no word-mapping gloss come across.**

**One dead option:** `maxSeeds` is documented (`:798`) and destructured (`:808`) and then
**never used**. `--max-seeds=100` does nothing; a "small trial import" is not available.

## 2. Create-only, or can it target an existing course?

It can target an existing course, and that is the problem. There is **no guard anywhere** that
checks whether the course already has content. Every write is an upsert:

```js
:143  .from('courses').upsert({...}, { onConflict: 'course_code' })
:433  .from('course_seeds').upsert(batch, { onConflict: 'course_code,seed_number' })
:490  .from('course_legos').upsert(batch, { onConflict: 'course_code,seed_number,lego_index' })
:563  .from('course_practice_phrases').upsert(batch, { onConflict: 'id' })
```

So against a course with 668 seed rows and 511 incoming:

- **Without `clearFirst`: it overlays, it does not truncate.** Seeds 1–511 have their
  `known_text`/`target_text` overwritten with Irish native content; **seeds 512–668 of the old
  generated corpus survive untouched.** Same for legos and phrases: any old
  `(seed,lego_index)` slot beyond what the import fills stays as it was. The result is a
  Frankenstein course — native Irish at the front, machine-generated English-corpus material
  behind it, with no marker distinguishing them.
- **With `clearFirst: true`** (`:871-873` → `clearCourseData` `:95-127`) it hard-deletes, in
  order, `lego_introductions`, `course_practice_phrases`, `course_legos`, `course_seeds` **and
  `course_audio`** for the course code — *before* a single replacement row is written. All
  25,308 existing Irish clips' DB rows go first, and are re-created only if the legacy sample
  ids happen to match. **That is a direct violation of the make-before-break rule**
  (`AUDIO_PIPELINE_ARCHITECTURE.md` §6b) — the same shape as the fra_for_eng purge that left
  ~2,000 slots silent for two days. It also swallows its own failures: a delete error only
  `console.error`s a warning (`:117`) and the import proceeds.

The `clearFirst` flag is one checkbox in the dashboard UI (`src/components/ImportCourseModal.vue:205`),
posted to `POST /api/import-course` (`services/orchestration/orchestrator.cjs:10392`). There is no
confirmation gate on it beyond the checkbox.

## 3. Audio

It **mints new `course_audio` rows and links them by text** — it does not accept or verify asset ids.

- Every sample becomes a row with `voice_id: 'legacy_import'`, `origin: 'tts'`, and
  `s3_key: mastered/<UUID>.mp3` (`:184-186`). The UUID is used **only** to build that key.
- **There is no existence check on the S3 object.** If `mastered/<UUID>.mp3` is not in Popty's
  bucket, the row is still written and still linked, and the learner gets a dead clip. The
  importer will report success.
- The course intro and all encouragements are written `origin: 'human'` (`:201-202`, `:291`, `:309`).
- Step 9 (`linkAudioToContent`, `:647-784`) links by `text_normalized|role` — text match, not id.
  **Where no match is found it simply leaves the existing value in place** (`:701-703`: `if (knownId)
  updates.known_audio_id = knownId`). Combined with the PostgREST upsert in step 5/6/7, which only
  writes the columns present in the payload, this gives the nastiest outcome of all: **a seed row
  whose text is now the native Irish sentence but whose `target1_audio_id` still points at the
  clip of the old machine-generated sentence.** Not a dangling link — a *wrong* link, which no
  broken-link audit catches.
- **Bug worth noting independently:** presentation-role samples get `language = targetLang`
  (`:176` — only `source`/`known` gets the known language). All 2,012 English teaching-narration
  clips would be filed as Irish.

Existing target audio: with `clearFirst` its rows are destroyed (S3 objects survive, orphaned and
unreachable); without `clearFirst` its rows survive but become **mismatched to new text**.

## 4. Identity and idempotency

- `courses` → `course_code`
- `course_seeds` → `(course_code, seed_number)`, where **`seed_number` is the array index + 1**
  (`:410`) — position in the export, nothing content-derived.
- `course_legos` → `(course_code, seed_number, lego_index)`, `lego_index` = array index + 1 (`:470`)
- `course_practice_phrases` → `id = ${courseCode}:S{NNNN}L{NN}B{NN}` (`:531-535`)
- `course_audio` → `(course_code, text_normalized, language, role)` with `ignoreDuplicates: true` (`:229-231`)
- `lego_introductions` → **deleted wholesale then plain-inserted** (`:618`, `:629`)

**A re-run does not duplicate** — every table is keyed and upserted, and it is idempotent for the
same manifest. That is the one genuinely well-built part of it.

**But the phrase ID is the decisive fact.** `services/course-builder/lib/phrase-structure.cjs:27-33`
mints `${course_code}:S${s}L${l}${r}${p}` with `ROLE_PREFIX.build = 'B'` — **character-for-character
the same string** the importer builds at `:535`. So `gle_for_eng:S0001L01B01` in the export is not a
new row; it is the row a live learner has already practised.

## 5. Learner progress — does it trip the migration protocol?

**Yes. Unambiguously, and in the worst way.** This is the finding that decides the question.

Progress is slot-keyed, confirmed in the learning app: `lego_progress` rows carry
`lego_id: 'S0039L01'` + `course_id` (`ssi-learning-app/api/_utils/demoNodeRefresh.ts:305`),
`seed_progress` is per learner + seed number, and `course_enrollments.highest_completed_seed`
is a bare integer (`:262`). No progress row anywhere references phrase text.

The importer writes **new text into old slots** — same `seed_number`, same `lego_index`, same
phrase `id`. Every one of the 76 Irish learners with ≥10 minutes practised, and the 56 with an
hour or more, would keep their exposure counts and lose the sentences those counts were earned on.
The deepest learner sits at seed 39; seed 39 in the export is a completely different native-authored
sentence. That learner is silently credited with content they have never heard, at whatever
Fibonacci rung they had reached — and per the protocol, *"nothing orphans when this happens. There
is no error, no gap, no alarm."*

`docs/pods/pod-migration-protocol.md` rule 6 is explicit: **"a sentence that changed at all counts
as new, not as surviving."** This importer has no migration step, no content matching, and does not
run in one transaction with anything. It cannot satisfy the protocol, and it was written before the
protocol existed.

## 6. Validation — none of it

The module imports exactly two things: `@supabase/supabase-js` and `language-code-service.cjs`
(`:18-19`). It never touches `services/course-builder/lib/validation.cjs`. So it **bypasses every
gate `/api/seed/complete` enforces**:

- ❌ ZUT (`checkPhraseZUT`, validation.cjs:630) — one known prompt → one target form. Unchecked.
- ❌ Tiling (`checkTiling`, :101) — unchecked.
- ❌ Vocab violations (`checkVocabViolations`, :250) — unchecked; nothing verifies the known side
  uses only already-introduced words.
- ❌ Known-side gate (`checkKnownSide`, :843) — not called.
- ❌ LEGO conflict / overlap (`:476`, `:525`) — unchecked.
- ❌ Build-recombination, phrase balance, complexity, metadata gloss — all unchecked.
- ❌ The `blocked_unapproved_target` text gate — not on this path.

Everything lands with `status: 'released'` (`:420`, `:476`, `:548`) — the front door for content
that has never been through the front door.

**Two structural side-effects of that:**

1. **All 13,455 phrases are written `phrase_role: 'build'`** (`:528`). But 644 legos in the export
   carry more than 7 nodes (max 20), and `computePhraseRole` (phrase-structure.cjs:16-20) classes
   position ≥8 as `'use'`. The learner app's INF PLAY filters `.in('phrase_role', ['use',
   'eternal_eligible'])` (`ssi-learning-app/api/courses/[code]/infplay-cycles.ts:204`) — so an
   all-`build` course has **zero INF PLAY content**.
2. Every lego is written `type: 'A'`, `is_new: true`, `components: null` (`:472-475`) — no
   breakdowns, and the type distinction the methodology relies on is flattened.

## 7. Verdict and the safe path

### UNSUITABLE — for overwriting `gle_for_eng`

Three code facts decide it:

1. **`database/lib/import-legacy-course-core.cjs:535` + `:563`** — the phrase ID scheme is
   identical to the live one and the write is `upsert({onConflict: 'id'})`. This is an in-place
   content edit of slots carrying live learner progress, with no migration. Standing doctrine
   forbids it.
2. **`:95-127` (`clearCourseData`) runs before any replacement is written** — delete-then-hope.
   Make-before-break exists because this exact ordering silenced fra_for_eng for two days.
3. **`:18-19` — it imports no validation module at all**, and writes `status: 'released'`. 511
   seeds of unvalidated content would enter production with the ZUT, tiling, vocab and known-side
   gates all bypassed.

Add: without `clearFirst` you get a hybrid course (seeds 512–668 of the old corpus persist), and
`maxSeeds` is dead, so you cannot even trial it small.

### The safe alternative

**Import to a new course code, and never point it at `gle_for_eng`.**

`--course-code=` is supported and honoured (`database/import-legacy-course.cjs:37` →
`courseCodeOverride`, applied at core `:816`), as is `--display-name=`. So:

```
node database/import-legacy-course.cjs scripts/en-ga-compare/en-ga.json \
  --course-code=gle_native_for_eng --display-name="Irish for English Speakers (native build)" --dry-run
```

That gives a clean, side-by-side course with zero learner-progress exposure, zero risk to the
25,308 existing clips, and something Justin's wife can actually be shown and can proofread against.
The known open items on that path, none of them blocking the *decision*:

- The `mastered/<UUID>.mp3` S3 objects must be confirmed to exist before anyone treats the audio
  as real (see gap below). If they do not, the import is text-only and needs an audio plan.
- `phrase_role` needs correcting to `computePhraseRole(position)` before INF PLAY works.
- Content still hasn't passed any gate; it would want a proper QA pass, not a release-flag.
- If the native content is later judged better than what's live, the *migration* from
  `gle_for_eng` to it is a separate, protocol-governed piece of work — content-matched, not
  position-matched — and it is the harder half of the job.

---

## Explicit gaps

1. **Live DB reads failed today.** Both `psql` via `.env.psql` and the Supabase REST client timed
   out (`ECHECKOUTTIMEOUT` on the pooler, then a 90s REST hang). So I could **not** freshly verify
   (a) whether any `mastered/%` s3_keys exist in `course_audio` today, or (b) the exact current
   phrase IDs on `gle_for_eng`. The phrase-ID collision claim rests on reading both minting
   functions and finding them character-identical, which is solid; the current-state numbers
   (668 seeds / 300 built / 25,308 clips / 102 enrolments) are quoted from
   `docs/gle-course-state-scout-2026-08-17.md`, not from a read I did today.
2. **S3 object existence for the legacy UUIDs is unverified.** Whether `mastered/<UUID>.mp3`
   resolves in Popty's bucket cannot be determined from the code — the importer never checks, and
   I did not probe S3.
3. **There is no identity test for this file on `main`.** `import-legacy-course-core.identity.test.js`
   exists only under `.worktrees/edit-impact` and `.worktrees/a134-ge`, and those worktrees hold a
   *different, longer* version of the module (1,021 lines, exporting `canonicalSharedIdentity` and
   `legacyHumanVoiceId`) than main's 956-line copy, which exports neither. So main's importer is
   **untested**, and any behaviour documented against the worktree version does not necessarily
   describe it. Complete caller set on main: `services/orchestration/orchestrator.cjs:10370`,
   `database/import-legacy-course.cjs:22`, and the UI at `src/components/ImportCourseModal.vue:616`.
4. **Not determinable without running it:** exact PostgREST upsert column semantics on partial
   payloads (I have assumed only supplied columns are updated, which is PostgREST's documented
   behaviour); and whether the `null_phrase_audio_on_text_change` / `null_lego_audio_on_text_change`
   triggers (`database/migrations/20260806_audio_link_integrity.sql:127-165`) fire on the upsert
   path — if they do, they *re-resolve* rather than null the audio ids, which would mitigate the
   wrong-link problem in §3 but does not change any verdict above.
