# Cold review: 0d0e43a176 → 5f8c393f71

Reviewed revision: `5f8c393f710c761a62ec2a0f25e1d02c5012f444`.
All findings below are static code traces, not executed reproductions. No tests were run and no database was queried. Production occurrence and live behaviour are unverified.

## 1. [P1] A completed redo can restore its old snapshot during a later redo

**Closed** on main by befc727dd (job #994): watchdog restores are guarded (require_newest + require_empty) under a per-seed lock shared with performRedo, superseded seeds are skipped, finished batches are recorded as done. PR #139 (cs #984) adds: rebuild-range now takes the same lock, and the undo route answers a refused restore with 409 SUPERSEDED or NOT_EMPTY instead of 500. The lock only works within one process; a DB-side lock needs a migration.

**Location:** `services/course-builder/lib/redo-watchdog.cjs:171` (also lines 221–226 and 256).

**Concrete failing sequence:** On `fry_for_eng` seed 200, redo batch A reaches attempt 2, successfully submits its replacement teaching, and exits. A sweep sees teaching present and returns `done`. Within 48 hours, the user presses Redo again on seed 200, creating batch B and wiping its teaching while B's agent starts. At the next sweep A's dead attempt-2 process and the now-empty seed cause the watchdog to restore A's pre-redo snapshot, even though B's agent is running. The seed regresses to the content from before A rather than the result the user asked B to revise. If A completed on attempt 1 instead, it starts an unwanted retry alongside B.

**Proof from callers and callees:**

- `redo-queue.cjs:229–238` creates a fresh snapshot batch for every redo, wipes the seed and clears `decomposed_at`; `:253` then starts that batch's agent. The route at `routes/build.cjs:280–301` only checks overlap with queued entries, so a second redo after the first has completed is allowed.
- `loadRecordedRedos()` at `redo-watchdog.cjs:221–226` excludes only batches with a final watchdog alert. A successful batch receives no terminal record: `sweepRedos()` at `:256` just continues on `done`.
- `pendingSeedsOf()` at `:159–171` reads the seed's current teaching and A's `restored_at`. It never asks whether a newer snapshot batch owns seed 200. A successful submission does not mark its snapshot restored.
- `decideRedoAction()` at `:61–75` restores a dead attempt 2. `sweepRedos()` at `:270–275` passes A's snapshot id to the undo route. `redo-snapshot.cjs:191–211` wipes the current seed, inserts the old snapshot's teaching and restores its old stamps; there is no newer-batch guard in that path.

**Smallest fix:** Before treating any seed as pending for a batch, exclude it when a newer redo snapshot exists for that course and seed. Enforce that ownership check again at restoration, under the same transaction/lock as the destructive restore, so a later redo cannot take ownership between the check and the wipe. Persist successful completion as well, so a completed batch cannot become pending again.

## 2. [P2] A marker in a commit body suppresses the weekly release

**Closed** on main by befc727dd: last release found by subject only, matching the production gate.

**Location:** `tools/release/weekly-release.sh:21–23`.

**Concrete failing input:** `origin/main` ends with this ordinary commit after the last real release:

```text
Fix the seed-grid refresh

[hotfix] is reserved for urgent production changes; this waits for Monday.
```

The Monday script sets `last` to this commit, finds `last = head`, and exits without creating a release. The ordinary commit did not opt into a production build, so these changes remain unreleased on every subsequent Monday until main moves again.

**Proof from callers and callees:** `git log --grep` matches the commit message, including body lines; anchoring its regular expression with `^` does not limit it to the subject. Lines 22–23 treat any matched HEAD as an already-built release. The script's lines 5–8 require the commit to *start* with the marker. The actual gate implementation read at `/home/tomcassidy/command-surface/ops/vercel-production-filter.cjs:21–24` uses `case "$VERCEL_GIT_COMMIT_MESSAGE" in "[release]"*|"[hotfix]"*)`, which rejects the example above. That external file was read only; its deployed configuration was not checked.

**Smallest fix:** Select the last release by an explicit subject field (`git log --format` with hash and `%s`, then match only that subject), rather than using `--grep` over the whole message.

## 3. [P2] Straight double quotes cannot find an existing curly-quoted recording

**Closed** on main by befc727dd: curly double-quote spellings are generated; PR #139 adds the both-directions fixture.

**Location:** `services/shared/text-normalize.cjs:106–108`.

**Concrete failing input:** The library holds a rendered, usable English clip with text `She said “hello”` and `text_normalized = 'she said “hello”'`. Request `She said "hello"` in the same language and voice, with no replacement or pronunciation override. `sameRecordedWords()` considers them the same recording, but the live lookup cannot retrieve the stored clip and answers with a miss. This permits a duplicate render or makes the re-record gate refuse a request that should have reused audio.

**Proof from callers and callees:**

- `foldTypography()` at `:101–102` folds curly double quotes to straight quotes. `typographySpellings()` at `:106–108` returns the input, the folded text, and a form that converts ellipses and apostrophes back. It never generates curly double quotes from straight ones. All generated keys for this input therefore retain straight double quotes.
- `recordingTextKeys()` at `:121–124` builds every queried spelling from that function. `normalizeForDb()` at `:29–34` retains internal curly quotes, so the stored key remains different.
- Both the index lookup (`clip-index.cjs:169–178`) and own-course lookup (`:182–190`) query only these generated keys. The fallback at `:198–210` uses the same keys in `text_normalized IN (...)`; it cannot rescue the miss.
- `clip-library.cjs:244–255` issues a miss ticket based only on rows those lookups returned. The comparison in `sameRecordedWords()` never sees the omitted row. `tts-service.cjs:1034–1047` consumes that library lookup before deciding whether a fresh render is needed.

**Smallest fix:** Add the curly double-quoted spelling to the generated lookup keys, preserving opening and closing quote positions. Cover both lookup directions with the same two texts; a comparison-only check would miss this defect.

## 4. [P2] A frame-mask batch can assign the old text's frames after an edit

**Closed** on main by befc727dd: each op asserts the read known_text; PR #139 updates the planner fixture to match, since the old exact-match case no longer holds against main.

**Location:** `tools/frame-layer/v4/write-frame-masks.cjs:61`.

**Concrete failing sequence:** The tool reads a seed with `known_text = 'I work'` and `frame_mask = null`; its cache entry has `frames: ['P1']`, so it plans mask `1`. Before that seed's batch is posted, an editor changes its text to `I worked`, leaving the mask null (or clearing it to null). Suppose the cache classifies the new text as `['P2']`. The planned operation still passes its before-state assertion and writes `1` onto the new text, rather than the required `2`.

**Proof from callers and callees:** `plan()` at `:54–55` derives the value from the read `known_text`, but the operation at `:61` asserts only the previous mask. `main()` reads the entire course at `:118–119` and posts successive batches at `:134–142`, with pauses between them; it does not reread the text. `course-edit-ops.cjs:443–448` checks exactly the fields supplied in `expect` against the locked current row. A text change with the same null mask is therefore invisible to the guard. The same planner is used for seeds and BUILD/USE phrases (`write-frame-masks.cjs:63–66`). This interleaving is unverified in production; the incorrect write follows directly from the supplied values.

**Smallest fix:** Include the exact read `known_text` alongside `frame_mask` in each operation's `expect`, so the existing transactional drift check refuses the stale batch.
