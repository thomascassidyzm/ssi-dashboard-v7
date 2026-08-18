# Adversarial review — `20260817c_lego_audio_link_integrity` (commit fe515b0d)

Read-only. Nothing was applied, nothing committed, no canary run. All DB evidence
below was read out of the live database on 2026-08-17 as `postgres`, inside
`default_transaction_read_only = on`.

**Verdict in one line.** The migration itself is sound: I could not construct any
input that makes it raise, the loop-variable handling is correct, and every
number in its header is true to the digit. The severe findings are all *around*
it — one factual claim in the header is wrong, the lookup it adds is 250×–4,600×
more expensive than the one it replaces, and the canary that applies it takes an
`ACCESS EXCLUSIVE` lock on `course_legos` and holds it for tens of seconds while
a write fleet is editing that table.

---

## 1. CONFIRMED — the canary locks `course_legos` and `content_audio_link_drops` estate-wide for the whole run

The canary does everything in **one transaction**: it applies the migration at
line 246, then runs ~30 more checks, then commits at line 590.

The migration contains `DROP TRIGGER IF EXISTS trg_null_lego_audio_on_text_change
ON public.course_legos` and `ALTER TABLE public.content_audio_link_drops ADD
COLUMN …`. Both take `ACCESS EXCLUSIVE`, and in one transaction both are **held
until COMMIT**. `ACCESS EXCLUSIVE` blocks `SELECT` too, not just writes.

Measured cost of the work done *after* the lock is taken:

| canary step | measured |
|---|---|
| STALENORM's `text_normalized <> normalize_text(text)` scan of `ara_for_eng` (line 376) | **3,320 ms** |
| NOAUDIODEL's `count(*) FROM course_audio`, run twice (lines 249, 487) | **2,224 ms each** |
| LIVEPATHS view probes + real-lego write/restore | seconds |
| ~20 fixture legos, each firing the new trigger | seconds |

So `course_legos` is unreadable and unwritable estate-wide for roughly 10–40
seconds, and `content_audio_link_drops` for the same window — which means every
concurrent content edit anywhere in the estate stalls too, because the **already
live** seed and phrase triggers must `INSERT` into that table.

Two aggravating factors:

* `lock_timeout` is `0` on this database (verified). The `DROP TRIGGER` will wait
  forever to acquire the lock, and while it waits it **queues ahead of every
  subsequent reader**, so the stall starts before the lock is even granted.
* Other sessions run with the server default `statement_timeout = 2min`
  (verified). The canary raises *its own* to 300 s (line 166). If the combined
  wait + hold exceeds two minutes, other agents' queries do not stall, they
  **error**.

The commit message says "Not applied yet: a write fleet is editing eng_for_sin
legos as this lands." That is exactly the condition under which this is worst.

**This is not a defect in the SQL** — a standalone `psql -f migration.sql` holds
the lock for milliseconds. It is a defect in applying it via `--commit` on the
canary. Fix is either: apply the migration standalone and run the canary
separately in dry-run, or add `SET lock_timeout = '3s'` and move the two slow
census reads (STALENORM's scan, the two `count(*)`) to *before* the apply.

---

## 2. CONFIRMED — the added lookup is 250×–4,600× more expensive than the one it replaces, and for `presentation` it is provably incapable of ever matching

`audio_id_for_text` (today) is index-driven on `text_normalized`.
`audio_id_for_text_same_voice` (the replacement) adds
`OR normalize_text(a.text) = normalize_text(p_text)`, which defeats the index and
forces a scan of every clip in the course for that role, calling `normalize_text`
and the plpgsql `audio_canon_voice` **per row**.

Measured on `spa_for_eng` (78,946 clips), same connection, per single call:

| call | measured |
|---|---|
| `audio_id_for_text(…,'known')` — the function being removed | **1.06 ms** |
| `audio_id_for_text_same_voice(…,'known')` cold | **4,586 ms** |
| `audio_id_for_text_same_voice(…,'known')` warm | **263 ms**, **273 ms** |
| `audio_id_for_text_same_voice(…,'target1')` | **1,698 ms** |
| `audio_id_for_text_same_voice(…,'presentation')` cold / warm | **804 ms** / **42 ms** |

This is charged **per role, per edited row**, inside a `BEFORE UPDATE` trigger
holding the row lock. `course_legos` has 94,727 rows. A bulk rewrite of 500 legos
on a large course, with known and target both moving, is plausibly 500 × 3 ×
~300 ms ≈ **7½ minutes of pure trigger time**, versus ~1.5 s today.

Rule 1 (keep) short-circuits before this, so cosmetic edits are free. But there
is one place where rule 1 can *never* short-circuit, and the migration knows it:

> `-- Rule 2 is applied to presentation for uniformity, not because it is expected`
> `-- to fire: … It costs one lookup per genuinely-edited lego that has a`
> `-- presentation link`

That lookup costs 42–804 ms, not "one lookup", and it is provably dead. I
verified both halves myself:

* 0 of 72,062 linked presentation clips speak their row's `target_text` (§4), so
  rule 1 never saves a presentation link; the lookup always runs.
* **0** `presentation`-role clips anywhere in `course_audio` have
  `text_normalized` equal to *any* lego's `target_text` in the same course, so
  the lookup can never return non-NULL either.

Every genuinely-edited lego with a presentation link pays a guaranteed-futile
scan. The header calls this "one lookup"; it is the single most expensive thing
the trigger does, on the one column where it is guaranteed useless.

This cost is already live for `course_seeds` and `course_practice_phrases`, so
it is inherited rather than invented — but `course_legos` is the biggest of the
three tables and the one that gets bulk-rewritten.

---

## 3. CONFIRMED — the header's finding 3 is false: something *does* refill a NULLed lego presentation slot

The header, the commit message and the ROLLBACK file all rest on this:

> `--   3. That nulling is PERMANENT AND UNRECORDED. link_audio_to_content … So a`
> `--      NULLed lego presentation link is never refilled by anything, by any route,`
> `--      ever.`

The narrow half is true, and I verified it: `link_audio_to_content` is attached
only as `audio_autolink AFTER INSERT ON course_audio` (not `UPDATE`), and its
presentation branch matches
`normalize_text(target_text) = NEW.text_normalized`, which no composed
introduction satisfies.

The broad half — "by any route, ever" — is wrong. `services/phases/phase8-audio-v13.cjs:1550`:

```js
async function linkPresentationAudio(courseCode) {
  // Get all LEGOs missing presentation_audio_id
  …
  const presId = presMap.get(lego.lego_id)          // keyed by LEGO_ID, not text
  …
  .from('course_legos').update({ presentation_audio_id: presId })
```

It matches on `lego_id`, not on text, so the never-true text predicate is
irrelevant to it. It is called from three places in phase8
(lines 1391, 1531, 4164) and its own comment says "Runs after any presentation
generation." Two further sites bind the same column the same way —
`bindPresentationAudio` at line 2203 and the regeneration binder at line 3067 —
plus `lego_introductions`, which the learning app also reads.

Consequences, both directions:

* The clip is **not** "permanently unreachable, fully paid for". The next phase8
  presentation pass on that course re-binds it. The bleed is real but
  self-healing on a generation run, which lowers the urgency the header claims.
* More interesting: because `linkPresentationAudio` re-binds **by `lego_id`
  regardless of text**, a lego whose `target_text` genuinely changed gets its
  *old* introduction clip — one that quotes the words the lego no longer has —
  silently reattached. That is a pre-existing hazard this migration does not
  touch, but the new `content_audio_link_drops` rows now make it detectable
  (compare `dropped_at` against a later phase8 run), which is worth saying
  explicitly rather than claiming the drop is terminal.

The migration's *behaviour* is unaffected. Its stated justification and its
"Recorded as the next open item" are both mis-stated, and the ROLLBACK file
repeats the same false claim.

---

## 4. REFUTED — the "72,062 / ZERO" claim is exactly right

Verified against the live DB, testing the *stronger* predicate (both
`text_normalized` **and** re-normalised `text`, which is what the migration's own
keep-test uses — the header only mentions one):

| claim | measured |
|---|---|
| legos with a presentation link | **72,062** ✓ |
| of those, not uuid-shaped | **0** ✓ |
| of those, dangling (no `course_audio` row) | **0** ✓ |
| of those, whose clip text normalises to the row's `target_text` | **0** ✓ |
| of those, whose clip's `role` is not `presentation` (not claimed, checked anyway) | **0** |
| `known` links already stale | **31** ✓ (header says 31) |
| `target1` / `target2` links already stale | **103 / 103** ✓ (header says 103 / 103) |

Every number in the header is correct, including the three "already stale today"
counts it volunteers against itself. No caveat.

---

## 5. CONFIRMED — the trigger silently overrides an audio id supplied in the same `UPDATE` as the text

Failing input:

```sql
UPDATE course_legos
   SET target_text = 'the new words',
       target1_audio_id = NULL      -- writer explicitly clears it
 WHERE id = …;
```

The function never looks at `NEW.target1_audio_id`. It reads
`v_cur := OLD.target1_audio_id` (non-NULL), and if a same-voice clip exists for
the new text it assigns `NEW.target1_audio_id := v_sub` — **resurrecting a link
the writer just cleared** — and files a `relinked-same-voice` row describing a
move the writer never asked for. Substitute a deliberately-chosen new audio id
for `NULL` and it is discarded the same way.

This writer shape is not hypothetical; it is the documented remediation recipe in
`services/briefs/category-llm-orchestrator.cjs:159`:

```js
.update({target_text:'<NEW>',target1_audio_id:null,target2_audio_id:null})
```

(that one is against `course_practice_phrases`, where the identical rule is
already live).

Honest framing: today's trigger *also* clobbers `NEW`, with
`audio_id_for_text(NEW.target_text, …)` — so "the writer's value is ignored" is
pre-existing, not introduced. What changes is which value wins, and the new
answer can be a **resurrected old-voice link** where today it would have been the
text-correct clip. It is a new failure mode on an old defect, and the canary has
no fixture for it.

---

## 6. CONFIRMED — the canary's `NOAUDIODEL` arithmetic proves nothing and can fail either way

```js
const audioBefore = SELECT count(*) FROM course_audio      // line 249
const audioAfter  = SELECT count(*) FROM course_audio      // line 487
assert(… audioAfter - audioBefore === madeSince)
```

The transaction is `READ COMMITTED` (verified: `transaction_isolation = read
committed`, and the canary sets no isolation level). Each `count(*)` therefore
takes a fresh snapshot and **sees every other agent's committed inserts and
deletes**. Render campaigns write `course_audio` continuously.

* **False fail**: one clip rendered by anyone, anywhere, during the ~30 s between
  the two counts breaks the equality and rolls the whole thing back.
* **False pass**: N rows genuinely deleted while N rows are concurrently
  inserted nets to zero and the check goes green.

It also measures the wrong thing. The property worth asserting is "*this
transaction* inserted/updated/deleted no `course_audio` row outside the fixture
course" — a global `count(*)` cannot express that. The correct instrument is
`xmax`/`xmin = txid_current()` over the fixture-excluded set, or simply reading
the migration and noting it contains no `course_audio` DML at all (it does not).

Same root cause, same verdict for `strayDrops` (line 564). The high-water id
correctly excludes rows written **before** the run — the defect the commit
message boasts about fixing — but it does nothing about rows other agents commit
**during** the run, which is the likelier case given the seed and phrase triggers
are live and a fleet is editing. This one fails *safe* (it rolls back), but it
means a green run is not reliably reachable while the estate is busy.

---

## 7. CONFIRMED — vacuous checks in the canary

Two are literally hardcoded:

```js
line 353:  assert('PRESRAW an unparseable presentation link does not block the edit', true);
line 526:  assert('LIVEPATHS a no-op write on a real production lego still succeeds', true);
```

Both *are* in practice guarded — if the preceding `UPDATE` had raised, the
exception would land in the outer `catch` and the run would exit 2 — so the
property is tested even though the assertion is not. But they will read as green
in the 55/55 tally regardless, and neither would notice a change in what the
`UPDATE` actually *did*.

Two more are tautologies:

* **line 224–228, BASELINEPRES "link_audio_to_content could never refill it"** —
  it asserts `normalize_text('දැන්') <> a.text_normalized` for one hand-made
  intro clip. It never invokes `link_audio_to_content`, never tests any other
  refill route, and its conclusion is contradicted by `linkPresentationAudio`
  (§3). It cannot fail for any migration, correct or not.
* **line 382–384, STALENORM's fallback** — if no stale clip is found the check
  asserts `true` and the run still reads 55/55 green with STALENORM untested.
  The clip it depends on is chosen at runtime from `ara_for_eng`; another agent's
  backfill silently removes the coverage.

And the important class: **six checks pass identically if the trigger were simply
`DROP`ped** — COSMETIC (310–311), COSMETICPRES (319–322), NULLSTAYS (431),
NOTEXT (440–442), STALENORM's keep (391–394), and LIVEPATHS' trailing-space
probe (531–537). Every one of them asserts "the link is unchanged and nothing was
reported", which is exactly what happens with no trigger at all. That is not
wrong — keep-behaviour is what they mean to protect — but it means the suite's
discriminating power sits entirely in NOSWAP, SAMEVOICE, PRESDROP, PRESRAW,
PRESDANGLE, TARGET, NULLKNOWN and ROWID. A no-op migration would score roughly
half the board.

NOTEXT deserves a specific note: it is captioned "the WHEN clause", but it passes
identically under the *old* unconditional trigger, whose function opens with the
same `IS DISTINCT FROM` guards. It observes an outcome the WHEN clause cannot
change. Nothing in the canary actually demonstrates the WHEN clause kept the
function off the hot path.

---

## 8. CONFIRMED — "LEAVES IT EXACTLY AS IT FOUND IT" is false for the real production lego

Lines 512–556 restore `known_text` and assert all four links. But the real
`eng_for_sin` lego takes **three** `UPDATE`s (no-op write, trailing-space edit,
restore), and the other five triggers on that table are not undone:

* `course_legos_version_trigger` → `version` is **+3** and `updated_at = now()`.
  Not restored, not restorable from inside the transaction.
* `course_legos_audit` → the trailing-space edit and the restore each overwrite a
  non-NULL `known_text`, so `has_overwrite` is true for both: **two permanent
  `content_audit_log` rows** naming a change that was undone.
* `course_legos_bump_course_version` (AFTER UPDATE OF `known_text`) fires twice →
  `eng_for_sin`'s course version is bumped.
* `course_legos_touch_content_stamp` (AFTER UPDATE, unconditional) fires three
  times → the course **content stamp** moves. That is the stamp that invalidates
  learners' cached scripts, so on `--commit` this canary silently invalidates
  every `eng_for_sin` learner's cache.

On a dry run all of this rolls back and none of it matters. On `--commit` it is
committed. The claim in the header comment (lines 54–58) and in the check name
overstate what is actually restored: text and links, yes; bookkeeping, audit and
cache-invalidation, no.

---

## 9. CONFIRMED — coverage gaps in the canary

* **`language` is never exercised.** The migration's headline is "SAME VOICE
  **AND LANGUAGE**", and `audio_id_for_text_same_voice` carries
  `a.language IS NOT DISTINCT FROM prev.language`. No fixture creates two clips
  with the same `voice_id` and different `language`, so that conjunct could be
  deleted and the canary would still go 55/55.
* **Same-voice relink is only tested on `known`.** SAMEVOICE (292–303) uses
  `known`. TARGET (402–409) only tests the null-and-report path. Nothing tests a
  `target1`/`target2` same-voice re-point.
* **No fixture for §5** (text and audio id in one `UPDATE`).
* **No fixture for the report's `new_text` on a presentation drop caused by a
  `known_text` change** — see §10.

---

## 10. REFUTED — can the new function RAISE on any legitimate input?

I attacked every input the brief named and could not construct one. Evidence:

| attack | outcome |
|---|---|
| `known_text` NULL (521 rows are) | `normalize_text(NULL) IS DISTINCT FROM …` — no `=` anywhere on a nullable text. `CONTINUE WHEN NEW.known_text IS NOT DISTINCT FROM OLD.known_text` handles NULL→NULL. Clean. |
| `target_text` NULL | Not reachable: `course_legos.target_text` is `NOT NULL` (verified). Even if it were, same IS-DISTINCT-FROM treatment. |
| `presentation_audio_id` non-uuid | Regex-guarded, then recorded in `old_link_raw` and dropped. No cast is attempted. |
| `presentation_audio_id` uuid with no `course_audio` row | `SELECT INTO` finds nothing → `v_found` false → `v_sub := NULL` → `nulled-dangling-link`. No cast, no FK. |
| empty string / whitespace / very long text / unicode | `normalize_text` is `rtrim(lower(trim(…)), …)` — total on all text. No length limit anywhere. |
| **`content_audio_link_drops` constraint violation** | The only constraint on that table is `PRIMARY KEY (id)` (verified — no FK, no CHECK, no UNIQUE). Every `NOT NULL` column it writes (`table_name`, `row_id`, `course_code`, `column_name`, `role`, `reason`) is a literal or a `NOT NULL` source column. `seed_number` is nullable there and `NOT NULL` here. |
| **RLS on `content_audio_link_drops`** | `relrowsecurity = true`, `relforcerowsecurity = **false**`, owner `postgres`. The `SECURITY DEFINER` function will be owned by `postgres` (the only role in `.env.psql`), i.e. the table owner, so RLS is bypassed. The single policy is read-only (`is_ssi_admin()`), which would otherwise have blocked the INSERT — the `SECURITY DEFINER` is load-bearing and correct. |
| **`uuid` → `text` assignment cast for `row_id`** | There is **no** `pg_cast` entry either way (verified: empty). It works by I/O conversion, which PostgreSQL permits in assignment context when the target is a string type. Proved live rather than argued: `content_audio_link_drops` already holds **13 `course_seeds` rows**, and `course_seeds.id` is `uuid` while `row_id` is `text`. |
| **`audio_canon_voice` → `canonical_voice_id` raising** | This was the most promising path. `canonical_voice_id` has four `RAISE EXCEPTION` sites and **all four** carry `USING ERRCODE = 'check_violation'`; `audio_canon_voice` catches exactly `check_violation` (and deliberately not `OTHERS`). The only escape would be stack-depth exhaustion via a `comp:comp:comp:…` `voice_id`, and a terminal `comp:` degenerates to a caught `check_violation`. Not reachable in practice. |

**Nothing in the new function raises.** The `PRESRAW`/`PRESDANGLE` design is the
right call and it is implemented correctly.

---

## 11. REFUTED — loop-variable handling

`v_prev course_audio%ROWTYPE` is reused across four iterations, but:

* it is explicitly cleared (`v_prev := NULL;`) immediately before each
  `SELECT * INTO`; **and**
* PostgreSQL already guarantees `SELECT INTO` assigns NULL to every target field
  when no row is returned.

Belt and braces. There is no path on which a report row names a previous
iteration's clip, voice or text. I traced all four roles.

`v_raw` and `v_cur` are reset at the top of each iteration.
`v_sub`, `v_reason`, `v_col`, `v_new_text` are **not** reset — but each is
unconditionally assigned on every path that reaches its use (`v_col`/`v_new_text`
in the role dispatch; `v_sub` in the `IF v_found THEN … ELSE v_sub := NULL`;
`v_reason` in the four-way `IF`). Correct today, and fragile to a future edit
that adds a fifth role or an early `CONTINUE` — worth a comment, not a defect.

---

## 12. REFUTED — the WHEN clause is exactly equivalent

New trigger:

```sql
WHEN (OLD.known_text  IS DISTINCT FROM NEW.known_text
   OR OLD.target_text IS DISTINCT FROM NEW.target_text)
```

Live function (read with `pg_get_functiondef`, not from the migration file), the
union of its three guards, is the same disjunction. Every branch of the old body
is inside `IF NEW.known_text IS DISTINCT FROM OLD.known_text` or
`IF NEW.target_text IS DISTINCT FROM OLD.target_text` or the OR of the two. There
is no update on which the old trigger changed a link and the WHEN clause now
skips the function. `WHEN` on a `BEFORE ROW` trigger is evaluated against `NEW`
as modified by earlier BEFORE triggers, and the two that sort ahead of it
(`course_legos_pull_duration`, `course_legos_version_trigger`) touch neither text
column — verified from their live bodies.

---

## 13. REFUTED — trigger firing order and the audit trigger

Order on `course_legos` BEFORE UPDATE is as the brief states (alphabetical):
`course_legos_pull_duration` → `course_legos_version_trigger` →
`trg_null_lego_audio_on_text_change`.

* **`course_legos_pull_duration`** is `BEFORE INSERT OR UPDATE OF
  target1_audio_id, target2_audio_id`, so on a pure text `UPDATE` it does not
  fire at all, and when it does it fires *before* the new function moves the
  link. `target1_duration_ms`/`target2_duration_ms` therefore go stale on a
  relink and survive a NULL. The header records this and says it is pre-existing
  and identical on `course_practice_phrases` — correct. Worth noting the new rule
  makes one case strictly *better*: a cosmetic `target_text` edit now keeps the
  same clip, where the old rule could re-resolve to a different clip with a
  different duration and leave the cache wrong.
* **`course_legos_version_trigger`** only writes `version`/`updated_at`; no
  interaction.
* **`course_legos_audit`** (AFTER) is not made misleading. It stores the whole
  `to_jsonb(OLD)` row, so the pre-edit link values are captured either way; and
  its `has_overwrite` gate ignores only `version`/`updated_at`/`created_at`, so
  any edit that trips this trigger also trips the audit. The one shift is that a
  cosmetic edit which today *also* nulls `presentation_audio_id` will now change
  fewer columns — but `known_text`/`target_text` themselves already differ and
  are non-NULL, so `has_overwrite` is true regardless. No audit row is lost.
* `course_legos_bump_course_version` and `course_legos_touch_content_stamp` are
  AFTER triggers on the same statement; unaffected by the function, but they are
  what makes §8 bite.

---

## 14. CONFIRMED (minor) — the ROLLBACK does not fully restore current state

The function **body** is byte-for-meaning identical to the live
`pg_get_functiondef` output, comment lines included. I diffed them. That part of
the file's claim is true.

Three deltas remain after `apply → rollback`:

1. **ACL.** The migration does `REVOKE ALL ON FUNCTION … FROM PUBLIC`; the
   rollback does not restore it, and `CREATE OR REPLACE` preserves the existing
   ACL. Live today, `null_lego_audio_on_text_change` has `proacl` containing
   `=X/postgres` (PUBLIC has EXECUTE); `null_seed_audio_on_text_change` and
   `null_phrase_audio_on_text_change` — post-apply — do not. So the drift is
   demonstrated, not theoretical. Harmless in practice: EXECUTE on a trigger
   function is checked at `CREATE TRIGGER`, which the rollback performs as
   `postgres`.
2. **Comment.** The live function currently has **no** comment
   (`obj_description` is NULL). The rollback installs one. Better than nothing,
   but it is not a restore.
3. `SECURITY DEFINER` and `SET search_path` *are* correctly cleared, because
   `CREATE OR REPLACE FUNCTION` resets unspecified attributes to their defaults.
   No defect there.

Also: the rollback's own header repeats the false "never refilled … by any
route" claim from §3.

---

## 15. Minor / low, grouped

* **The dependency check has a hole.** `IF (SELECT data_type FROM
  information_schema.columns WHERE … column_name='row_id') <> 'text'` — if the
  column is absent the subquery is NULL, `NULL <> 'text'` is NULL, the `IF` is
  false and the guard passes silently. Use `IS DISTINCT FROM 'text'`. Only
  reachable in a corrupted-schema scenario.
* **A presentation drop caused by a `known_text` change reports a misleading
  `new_text`.** `v_new_text := NEW.target_text` for the presentation role. Edit
  `known_text` only, and the drop row records `new_text` = the target text, which
  did not change, with no trace of the known-side edit that actually caused it.
  `old_text` (the clip's composed introduction) is correct and useful.
  Reversibility is preserved (`old_audio_id` is kept); only the explanation is
  wrong.
* **`normalize_text` strips trailing `.?!¿¡。？！`,** so `"Yes."` → `"Yes?"` is now
  "cosmetic" and the presentation clip is **kept**, where today it is destroyed.
  Intended, consistent with the other three columns, and the clip's audio is
  unchanged — but it is a genuine widening of "cosmetic" for a column that
  previously had no keep-path at all.
* **A NULLed target link keeps its stale `target1_duration_ms`.** Pre-existing
  (§13), but the new drops table finally makes it findable.
* **PostgREST.** `NOTIFY pgrst, 'reload schema'` is present and correct. The new
  `old_link_raw` is on an RLS-protected table whose only policy is
  `is_ssi_admin()` SELECT, so nothing is newly exposed.
* **`ALTER TABLE … ADD COLUMN IF NOT EXISTS old_link_raw text`** is nullable with
  no default, so no table rewrite — the lock is instant. The problem is only how
  long the canary holds it (§1).

---

## What I could not check, and why

* **I did not run the canary**, in any mode. Every canary finding above is from
  reading it plus measuring, on live data, the queries it issues. I have not
  observed its actual 55/55 tally.
* **I could not test the `uuid` → `text` assignment cast directly**, because that
  needs a write. I proved it by precedent instead: 13 `course_seeds` rows (uuid
  `id`) are already recorded in the text `row_id` column.
* **Cold-vs-warm timings in §2 are single measurements** on a shared box under
  concurrent load (memory: watson-1 is 8 cores, shared). The order of magnitude
  is solid; the exact milliseconds are not repeatable.
* **I did not audit `ssi-learning-app`** for writers of
  `course_legos.presentation_audio_id` beyond a grep, which found only reads.
* **I did not attempt to enumerate every possible `voice_id`** in `course_audio`
  to prove `canonical_voice_id` cannot raise a non-`check_violation` error; I
  read all four of its `RAISE` sites instead and they are uniform.

---

## Recommendation

Nothing here says "do not apply". The rule is right, the implementation is
careful, and the header is unusually honest — three of its four verified findings
check out to the digit, and it volunteers its own costs. What I would want
changed before it goes on:

1. **Do not apply it with `canary --commit` while a write fleet is on
   `course_legos`** (§1). Add `SET lock_timeout`, move the slow census reads
   ahead of the apply, or apply the SQL standalone.
2. **Drop the `presentation` rule-2 lookup**, or gate it behind a cheap
   existence test (§2). It is measured at 42–804 ms per genuinely-edited lego and
   is proven incapable of returning a row.
3. **Correct finding 3** in the migration header, the commit message and the
   ROLLBACK file (§3). `linkPresentationAudio` refills by `lego_id`.
4. **Replace `NOAUDIODEL`'s global `count(*)` arithmetic** with something that
   can actually express "this transaction touched no `course_audio` row" (§6),
   and accept that `strayDrops` will false-fail under concurrency.
5. **Soften the "leaves it exactly as it found it" claim** to what is true, or
   restore/report the bookkeeping too (§8).
6. Add fixtures for `language`, for a `target1` same-voice relink, and for a
   combined text + audio-id `UPDATE` (§5, §9).
