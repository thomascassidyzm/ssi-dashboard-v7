# eus_for_eng audio revert — forensics part 2, Deborah's recent work

**2026-08-14. Read-only investigation. No database writes, no fixes applied, no TTS generated.**

Continues `docs/eus-audio-revert-forensics-2026-08-12/findings.md`, which covered her earlier
work and proved the storage mechanism (in-place `s3_key` swaps that leave `audio_revision` at 1)
and the serving vector (`resolvedUrlCache` keyed on clip uuid, never invalidated). This slice
covers **2026-08-12 00:00 UTC → 2026-08-14 19:40 UTC** and answers whether the reversion can
recur under the new canonical `audio_clips` scheme.

---

## The short answer

**No reversion occurred.** Not one eus clip's `s3_key` ever returned to a value it had previously
held, and not one phrase pointer ever moved back to a clip it had previously pointed at — across
the entire reach of the audit log, not merely this window. Her regenerations all landed and are
all still in place. **No human QA work was destroyed.**

The thing she was seeing — regenerate, hear it correct, come back later and hear the old take —
was the browser cache, and **that hole was closed on 2026-08-12 at 15:32 UTC** and is deployed
to popty.app now. Everything she regenerated *after* that time was never at risk from it.

Two things did go wrong, and neither is the thing she reported:

1. **Eight of her regenerations silently changed the audio of a *different* row** that shares the
   same clip. Not a reversion — collateral damage in the opposite direction. §4.
2. **The new canonical scheme is installed but has never fired, is English-only, and holds
   eus's superseded bytes for two lines.** It is not currently a reversion risk because nothing
   serves from it — but the two named lines are a reversion *in waiting* if a convergence pass
   ever runs. §3.

---

## 1. Every eus_for_eng audio change, 2026-08-12 00:00 UTC → now

All figures from `content_audit_log`, which reaches back to `2026-07-03 00:21:45` and — stated
where it bites, below — **records UPDATE and DELETE only, never INSERT**.

```sql
select table_name, change_type, count(*) from content_audit_log
where changed_at >= '2026-08-12' and old_row->>'course_code' = 'eus_for_eng'
group by 1,2 order by 1;
```

| table | change | rows |
|---|---|---|
| `course_audio` | UPDATE | **182** |
| `course_practice_phrases` | UPDATE | 690 |
| `course_legos` | UPDATE | 34 |
| `lego_introductions` | UPDATE | 2 |
| `courses` | UPDATE | 1,386 |

The `courses` rows are the `audio_stamp` / `content_stamp` touch triggers firing, not edits.

### The 182 course_audio events are all in-place `s3_key` swaps

```sql
with h as (select changed_at, primary_key pk, old_row from content_audit_log
           where table_name='course_audio' and old_row->>'course_code'='eus_for_eng'
             and changed_at>='2026-08-12'),
     j as (select h.*, ca.s3_key ck, ca.text ct, ca.voice_id cv, ca.audio_revision cr
           from h join course_audio ca on ca.id::text = h.pk)
select count(*) updates,
       count(*) filter (where old_row->>'s3_key' is distinct from ck) key_changed,
       count(*) filter (where old_row->>'text' is distinct from ct) text_changed,
       count(*) filter (where old_row->>'voice_id' is distinct from cv) voice_changed,
       count(*) filter (where (old_row->>'audio_revision')::int is distinct from cr) revision_bumped
from j;
```

| updates | key changed | text changed | voice changed | **revision bumped** |
|---|---|---|---|---|
| 182 | 182 | 9 | 4 | **0** |

Every single one replaced the bytes; **not one bumped `audio_revision`**. Two clips
(`61914374-cfc1-41e3-a29d-983e00971922`, `522d181c-799b-46ce-a5c4-db171b280163`) were swapped
twice; the other 178 once. The mechanism is exactly the one already proven on 08-12 — the
upsert-on-conflict at `services/phases/phase8-audio-v13.cjs:4740`, whose own comment says it
"UPDATES the existing row's s3_key/duration/text in place rather than 500ing". That code is
**unchanged on `origin/main` as of today**; the only commits touching phase8 since 08-12 are
`0cda2107` (pods) and `d24a7473` (veracity sampling).

### Revision tables

```sql
select count(*) from course_audio_revisions r
  join course_audio a on a.id = r.audio_id where a.course_code = 'eus_for_eng';   -- 0
select count(*) from course_audio_revisions where created_at >= '2026-08-12';     -- 36
select audio_revision, count(*) from course_audio
  where course_code='eus_for_eng' group by 1;                                     -- 1 | 28537
```

**Zero** `course_audio_revisions` rows for `eus_for_eng` — still none ever. All 28,537 eus clips
sit at `audio_revision = 1`. The 36 revision rows written estate-wide in this window belong to
other courses (the audio-repair path, which does version correctly).

### New clips — and where the audit log goes blind

51 new `course_audio` rows were INSERTed in `eus_for_eng` in this window (by `created_at`, since
**the audit log cannot see an INSERT at all**). This matters here more than usual: her
regenerations of *edited* text mint a new row rather than colliding, and that whole population is
invisible to the audit log. I measured it from `created_at` instead, and cross-checked it against
the phrase-pointer moves below — the two agree, so the blind spot is covered for this window, but
it would not be for a question about rows that were inserted and then deleted.

| hour (UTC) | new rows | of which linked to canon |
|---|---|---|
| 08-12 14:00 | 1 | 1 |
| 08-13 07:00 | 6 | 6 |
| 08-13 08:00 | 10 | 6 |
| 08-13 09:00 | 8 | 2 |
| 08-13 13:00 | 10 | 4 |
| 08-14 07:00 | 6 | 2 |
| 08-14 09:00 | 9 | 1 |
| 08-14 10:00 | 1 | 1 |

### Phrase / lego audio-link repointing — this time it DID happen

The 08-12 investigation found zero pointer moves in eus. That is no longer true: her later work
moved **96 pointers** (13 known, 36 target1, 47 target2) across the phrase table. Legos moved
none (0 of 34 audited lego rows changed any audio id).

The dominant shape is a regeneration clearing `target1`/`target2` to NULL and then setting
target1 a second later to a **brand-new** clip id, with target2 filled in on a later pass — e.g.
`eus_for_eng:S0026L03U03` at 08-13 13:46:18 → NULL, 13:46:20 → `3e33186d…`. Nothing in that
sequence reuses an id. `eus_for_eng:S0031L01U04` went round the loop twice on 08-14 09:59 and got
four distinct new ids, never an old one.

---

## 2. Did a reversion actually occur? **No — per clip, on every vector**

Three independent detectors, all negative.

### (a) Did any clip's `s3_key` return to a value it previously held?

Reconstruct the full value chain per clip — every `old_row->>'s3_key'` in audit order, then the
current row as the terminal state — and count repeats. Run over the **whole audit reach**
(2026-07-03 → now), not just this window, so a pre-window value returning would still be caught.

```sql
with touched as (select distinct primary_key::uuid cid from content_audit_log
                 where table_name='course_audio' and old_row->>'course_code'='eus_for_eng'
                   and changed_at>='2026-08-12'),
     h as (select primary_key::uuid cid, changed_at, old_row->>'s3_key' k from content_audit_log
           where table_name='course_audio' and primary_key::uuid in (select cid from touched)),
     seq as (select cid, changed_at, k from h
             union all select ca.id, now(), ca.s3_key from course_audio ca
             where ca.id in (select cid from touched))
select count(*) states, count(distinct (cid,k)) distinct_cid_key,
       count(*) - count(distinct (cid,k)) repeats from seq;
```

→ `states 362 | distinct 362 | **repeats 0**`

**Zero.** No eus clip has ever held the same `s3_key` twice.

### (b) Did any phrase pointer move back to a clip it previously held?

Same shape over `known_audio_id` / `target1_audio_id` / `target2_audio_id`, counting any non-null
clip id that is arrived at more than once:

```sql
… dd as (select pk, role, changed_at, val,
                lag(val) over (partition by pk, role order by changed_at) prev from u),
  ch as (select * from dd where prev is distinct from val)
select pk, role, val, count(*) from ch where val is not null
group by 1,2,3 having count(*) > 1;
```

→ **0 rows.**

### (c) Are the old bytes still reachable — i.e. could a stale URL still serve them?

S3 HEAD on all 182 old keys and all 182 new keys, bucket `ssi-audio-stage`:

```
checked 182 | old missing 0 | new missing 0
```

| role | text | old object | new object |
|---|---|---|---|
| presentation | "The Basque for: 'I like', is:" | 28,800 B, 2026-07-06 | 32,256 B, 2026-08-12 09:29:38 |
| known | "I like it" | 14,976 B, 2026-05-23 | 22,176 B, 2026-08-12 09:30:37 |
| target1 | "gustatzen zait" | 21,312 B, 2026-05-24 | 23,904 B, 2026-08-12 09:30:39 |
| target2 | "gustatzen zait" | 21,312 B, 2026-05-23 | 23,904 B, 2026-08-12 09:30:41 |
| known | "I don't like" | 18,720 B, 2026-05-23 | 22,176 B, 2026-08-12 09:31:16 |
| target1 | "ez zait gustatzen" | 25,344 B, 2026-05-23 | 26,208 B, 2026-08-12 09:31:18 |

Every new object's mtime matches its swap timestamp to the second. **Nothing was deleted** — so
any URL still holding a pre-swap key serves the old take, permanently. That is the browser story,
not a database story. (24 of the 182 pairs have byte-identical sizes; those are re-renders of
unchanged text, where old and new are plausibly the same audio.)

### The verdict, stated the way Tom asked for it

**The bytes never reverted in the database.** For all 180 distinct clips she touched, the DB has
only ever moved forward. What she experienced was **the browser serving a stale cached signed
URL** — the `resolvedUrlCache` vector proved on 08-12. Her work was never destroyed; it only
*appeared* to be.

**And that vector is now closed.** Commit `84d37385` (2026-08-12 15:32:02 UTC, on `origin/main`)
adds a 5-minute TTL to the cache and an explicit `forgetAudioUrl(uuid)`, wired into all three
regeneration handlers in `ScriptViewer.vue` (lines 1922, 2072, 2225). Verified on served bytes:
`https://popty.app/assets/ScriptViewer-91WVB9Q-.js` contains `forgetAudioUrl`, so the fix is
deployed, not merely merged. Every regeneration she made from 08-12 15:32 onwards — which is all
of the 08-13 and 08-14 work, 169 of the 182 swaps — was never exposed to it.

### Provenance — checked correctly, and legitimately empty

Joined on the **S3 key UUID** per Tom's method note, not on `course_audio.id`:

```sql
with k as (select upper(substring(s3_key from 'mastered/([0-9A-Fa-f-]{36})')) u
           from course_audio where course_code='eus_for_eng')
select count(*), count(rp.audio_uuid) from k
left join recording_provenance rp on upper(rp.audio_uuid) = k.u;
```

→ `28,537 eus rows | **0** with provenance`. Same query over the 182 superseded keys → **0**.

This is a true zero, not a failed join: `recording_provenance` holds only 310 rows across 11
recorders estate-wide (aran 67, Tom 46, Kai 33, sasha 28, plus test accounts), and none of them
is Basque. **`eus_for_eng` contains no human-recorded audio at all** — Deborah is regenerating
TTS, not recording. Provenance therefore contributes nothing to this question, in either
direction.

---

## 3. The canonical `audio_clips` scheme

### What it is

Live in the database; **the code that uses it is not on `main`**. It lives on branch
`feat/canonical-audio-identity-2026-08-14` (worktree `~/SSi/wt-canon-audio`, head `579b6e29`).
`grep -rl audio_clips` across `ssi-dashboard-v7-clean` and `ssi-learning-app` returns **nothing**
— no service, no API route, no player composable in production refers to it.

**Identity key:** `UNIQUE (text_key, language, role, voice_id)` — constraint
`audio_clips_identity`. Note what is *absent*: **there is no `course_code`.** That is deliberate
and is the whole point of the scheme — one line of English is one take for the entire estate.
`text_key` is the canonicalised text: lowercase, trim, collapse internal whitespace, strip all
trailing terminal punctuation (`services/shared/canonical-clip-store.cjs:47-56`, byte-identical
to the SQL `audio_canon_text()`).

**Does it version?** Yes, and better than `course_audio` does. `audio_clips.audio_revision`
increments on promotion, and every change is written to `audio_clip_promotions` with
`old_s3_key`, `new_s3_key`, old/new origin, old/new revision and a `reason`.

**Does it retain previous keys?** Yes — `audio_clip_promotions.old_s3_key` is the retained
pointer, and the superseded S3 object is explicitly left in place ("the fresh object is left on
S3 untouched (deletion is a separate approved pass)"). This is the make-before-break rule that
`course_audio` has never had.

**The write path** is a single BEFORE INSERT trigger, `trg_course_audio_zz_clip_link`, running
`course_audio_link_canonical_clip()` (`database/migrations/20260814_canonical_audio_identity_trigger.sql`).
I dumped the live `pg_get_functiondef` and it matches the migration exactly. It:
- skips `pending/%` and NULL keys, leaving `clip_id` NULL;
- if no canon exists for the identity, makes the arriving row the canon;
- if a canon exists and the arriving clip ranks *better* (human beats TTS, veracity-passed beats
  unchecked beats failed), **promotes** — logging to `audio_clip_promotions` and bumping revision;
- otherwise **discards the arriving bytes** and overwrites `NEW.s3_key` with the canon's, logging
  `duplicate_render_deduped`.

It is **deliberately INSERT-only**. Its own header says why: reaching into UPDATE "would either
neutralise those regens or propagate one course's regen to every course sharing the clip — a
large audible change with no verification behind it yet."

### Is eus_for_eng on it? Partly — and its Basque side, not at all

```sql
select language, count(*) total, count(clip_id) linked
from course_audio where course_code='eus_for_eng' group by 1;
```

| language | rows | linked |
|---|---|---|
| `eng` | 9,906 | 9,906 |
| `en` | 820 | 820 |
| `en-GB` | 9 | 9 |
| **`eus`** | **16,665** | **0** |
| **`eu`** | **740** | **0** |
| **`eu-ES`** | **161** | **0** |
| `auto` | 236 | 0 |

`select count(*) from audio_clips where language <> 'eng'` → **0**. The whole table — all
746,535 rows — is English. The backfill was run with `\set scope 'eng'` and no other scope has
been run; its staging tables `_canon_stage`, `_canon_lang_map`, `_canon_voice_map` are still
sitting in the database.

**So the Basque half of eus_for_eng — the half Deborah is actually working on — is entirely off
the canonical scheme.** 37.6% of eus rows are linked, and every one of them is an English row.

### The trigger is installed but has never fired

`select reason, count(*) from audio_clip_promotions group by 1` → **0 rows.** Not one promotion,
not one dedup, ever.

Corroborating: every non-English row inserted anywhere in the estate today is unlinked —
08-14 16:00 gave 113 `eng` rows (all linked, by the backfill) and 329 `spa` rows (0 linked);
08-14 17:00 gave 254 `spa` + 21 `nld`, **0 linked**. If the trigger had been live for those
inserts it would have minted Spanish and Dutch canon rows, and `audio_clips` would not be
English-only. The newest `course_audio` insert is 17:50:32; the newest `audio_clips.updated_at`
is 17:17:51.

I checked and eliminated the obvious alternative explanation — that these rows were inserted as
`pending/%` stubs (which the trigger skips) and updated afterwards. There are **zero** audit rows
anywhere since 08-13 with a `pending/%` old key, so they were inserted with real keys and simply
did not meet a live trigger.

**Honest limit on this one:** I can bound the trigger's install time only from below — it is
enabled now (`tgenabled = 'O'`) and no insert has been observed to fire it. I could not find a
migration-application timestamp in the database to name the exact moment, and I did not test it
by writing. So: *installed, enabled, zero observed firings*. That is what the evidence supports
and no more.

### Can the in-place-overwrite reversion recur under it? **Yes — the scheme does not touch it**

The trigger is INSERT-only by design. `/regenerate-phrase` and `/regenerate-lego` do an
**UPDATE** on the colliding row. Nothing in the canonical scheme intercepts an UPDATE, and
`phase8-audio-v13.cjs:4740` is unchanged. **The exact mechanism that produced all 182 unversioned
swaps in this window is untouched by `audio_clips` and will happen again on the next
regeneration.** Item (1) of the 08-12 fix list — make the collision path bump `audio_revision`
and write a `course_audio_revisions` row — is still the fix, and `audio_clips` does not deliver it.

### Can the `resolvedUrlCache` serving vector recur under it? **No, and not because of it**

That vector was closed on 2026-08-12 by `84d37385`, independently of `audio_clips`, and is
deployed (verified on the served chunk above). `audio_clips` neither helps nor hurts here — the
player never reads it.

### The one thing `audio_clips` *does* put at risk: a reversion in waiting

Because the backfill copied whichever row it judged best — "prefer human, then veracity-passed,
then **oldest** `created_at`" — and because eus shares English lines with other courses, the canon
for some lines is **another course's older object**, including objects eus has deliberately
replaced.

```sql
with h as (select primary_key::uuid cid, old_row->>'s3_key' oldk from content_audit_log
           where table_name='course_audio' and old_row->>'course_code'='eus_for_eng'
             and changed_at>='2026-08-12')
select count(*) swapped_and_linked,
       count(*) filter (where ac.s3_key = h.oldk) canon_holds_the_old_key,
       count(*) filter (where ac.s3_key = ca.s3_key) canon_holds_current
from h join course_audio ca on ca.id = h.cid join audio_clips ac on ac.id = ca.clip_id;
```

→ `15 swapped-and-linked | **2 canon holds the superseded key** | 9 canon holds current`
(the remaining 4 hold a third object entirely, from another course's render of the same line).

The two:

| line | eus now serves | canon holds | who made the canon |
|---|---|---|---|
| "I like learning quickly" | `…74D79B69.mp3` (regen 08-12 14:29) | `…2C8A306A.mp3` — **the take she replaced** | `fra_ca_for_eng`, 2026-04-16 |
| "I like meeting people" | `…F6E0A6A3.mp3` (regen 08-12 14:30) | `…03FE502F.mp3` — **the take she replaced** | `lav_for_eng` 2026-03-24, also `hun_for_eng`, `ben_for_eng` |

Nothing serves from `audio_clips` today, so this is inert. But the migration header names a
follow-up pass, `…_converge_s3.sql`, which points `course_audio.s3_key` at the canonical object.
**If that pass runs as-is, those two lines revert to the takes Deborah rejected** — and this time
it would be a real, database-level reversion. Estate-wide the exposure is large:
`select count(*) from course_audio ca join audio_clips ac on ac.id=ca.clip_id where ca.s3_key <> ac.s3_key`
→ **262,097 rows** diverge from their canon; 3,262 of them are in eus.

---

## 4. Did any regeneration overwrite a shared clip? **Yes — 8 of them**

Building every content→clip reference in eus across phrases, legos and seeds on all three roles
(23,581 references over 19,099 distinct clips):

- **2,961 clips are shared** by more than one row.
- **670 are *hazardous*** — shared by rows that disagree on the text for that role, so one clip
  is speaking two different sentences.
- Of the 180 clips Deborah regenerated in this window, **23 are shared and 8 are hazardous**.

These eight are live collateral damage. In each case her regeneration was correct *for her row*
and silently replaced the audio another row depends on:

| swapped | role | clip text (= her row) | the row that got dragged along |
|---|---|---|---|
| 08-12 09:30 | known | "I like it" | `S0027L01B01` says **"I like"** — plays "I like it" |
| 08-13 09:10 | known | "you want to learn her name quickly" | seed `8ded69d1…` says **"You want to learn *his* name quickly."** |
| 08-13 09:59 | target1 | "euskaraz hitz egiten **duen** jendea ezagutu nahi nuke" | `S0297L02U04` says **"duten"** |
| 08-13 09:59 | target2 | same | `S0297L02U04` says **"duten"** |
| 08-13 10:05 | target1 | "…**duen** jendea ezagutu nahi dudalako" | seed `d12d9ebf…` says **"duten"** |
| 08-13 10:05 | target2 | same | seed `d12d9ebf…` says **"duten"** |
| 08-13 13:17 | target1 | "**ez dut** erraz gogoratu ahal izango" | seed `27b4cb2f…` says **"ez naiz"** |
| 08-13 13:17 | target2 | same | seed `27b4cb2f…` says **"ez naiz"** |

Three of these are genuine Basque grammar distinctions — *duen* vs *duten* (singular vs plural
relative), *ez dut* vs *ez naiz* (transitive vs intransitive negation). A learner on
`S0297L02U04` now hears the singular where the text says plural. This is not a reversion and
it is not Deborah's mistake: it is the shared-clip hazard the 08-12 doc flagged as item (2) of
the fix list, now demonstrated firing eight times in three days.

The wider `S0027L01B01`/`B02` case is unchanged from 08-12 and still live.

---

## 5. What I could not establish — explicit gaps

- **The trigger's install time.** Bounded from below only (enabled now, zero observed firings,
  newest insert 17:50 today). I found no migration-application ledger in the database and did not
  probe by writing. Anyone who knows when the migration was run can close this in one sentence.
- **Which of the 182 swaps were Deborah's** versus another agent's or a scheduled pass.
  `content_audit_log.changed_by_role` is always `postgres` and `changed_by_uid` is null, so the
  log cannot name a human. I attributed by shape — regeneration-sized bursts of known/target1/
  target2 triples 1-2 seconds apart, in office hours, in seeds 17-34, matching her reported work.
  That is inference, not attribution.
- **INSERTs are invisible.** `content_audit_log` has a CHECK constraint permitting only UPDATE and
  DELETE. I measured the 51 new eus clips from `created_at` instead. A row that was inserted and
  then deleted inside this window would be invisible to both methods, and I cannot rule one out.
- **No HTTP request log on watson-1**, so I still cannot see the URL Deborah's browser actually
  fetched. The cache story is proven from code and from the deployed chunk, not from a captured
  request. It is consistent with her testimony and with the DB showing no reversion, which is the
  strongest form available.
- **The 24 same-size old/new S3 pairs** are consistent with identical re-renders but I did not
  byte-compare or transcribe them; size equality alone does not prove sameness.
- **The "hazardous shared clip" count of 670** uses a crude text comparison (lower + trim). Treat
  it as an upper bound and a place to look; the eight in §4 were each read in full and are real.

---

## DECISION 1 — Should regeneration ever overwrite a clip another row depends on?

**Context.** Eight overwrites in three days silently changed audio on rows nobody was editing,
including three genuine Basque grammar distinctions. 670 hazardous shared clips are live in eus
alone. The current behaviour is not a considered choice — it falls out of the `course_audio`
unique key `(course_code, text_normalized, language, role, voice_id)`, which cannot distinguish
"two rows legitimately share a line" from "two rows accidentally collided".

**Options.**

- **A — Refuse the overwrite; mint a distinct clip.** Before the in-place UPDATE, count the
  phrases/legos/seeds pointing at the clip whose own text differs from the new text; if any,
  insert a new row and rebind only the editor's pointer.
  *Consequences:* the hazard becomes structurally impossible. Costs one extra render in the rare
  legitimate-sharing case. Requires the unique key to admit a discriminator, which is a schema
  change. This is make-before-break applied to clip identity.
- **B — Warn and proceed.** Show the editor "3 other rows use this clip; regenerating changes
  them too" and let them decide.
  *Consequences:* cheap, no schema change, and puts the judgement where the taste is. But it
  spends Deborah's attention on every regeneration, and one dismissed dialogue restores the
  hazard silently.
- **C — Leave it and repair after the fact.** Run the 670-clip audit as a separate pass.
  *Consequences:* fixes today's damage, prevents none of tomorrow's. The eight new cases in three
  days say the rate is not negligible.

**Recommendation: A, with B's warning as the interim.** A is the only option where the failure
cannot recur, and it is item (2) of the 08-12 fix list — already identified, still not built.
Ship B this week so Deborah stops creating new cases while A is built, then run C's audit once A
is in so the repair is not immediately re-broken. All three legs hold: better (the defect class
disappears), simpler (one rule at one write site replaces a permanent audit obligation), cheaper
(one extra render beats re-auditing 670 clips forever).

## DECISION 2 — Must `audio_clips` be complete before further human QA on eus?

**Context.** The Basque side of eus is 100% off the canonical scheme; the English side is on it
but 3,262 eus rows diverge from their canon, two of them holding takes Deborah has explicitly
rejected. The convergence pass named in the migration header would push those back.

**Options.**

- **A — Block further eus QA until the scheme covers Basque.** *Consequences:* stops the best
  reviewer the course has, to wait for a migration that has never fired. The reversion risk is
  currently inert. Disproportionate.
- **B — Let her carry on; gate the *convergence* pass instead.** Require that
  `…_converge_s3.sql` never runs against a course_audio row whose current key post-dates the
  canon's, and re-derive canon from the newest human-approved take rather than the oldest object.
  *Consequences:* Deborah is unblocked, and the one real risk — a convergence pass reverting her
  work estate-wide — is closed at its source. Requires the canon-selection rule to learn about
  approval, which it currently has no notion of.
- **C — Backfill Basque now, then carry on.** *Consequences:* extends the scheme's reach, but
  cross-course sharing of *Basque* lines is near-zero (eus is the only Basque course), so it buys
  almost no dedup and adds a second population that could be converged wrongly.

**Recommendation: B.** The scheme's benefit is estate-wide English dedup, which eus already has;
its risk is the convergence pass, which has not run. Gate the pass, do not gate the reviewer.
Concretely: before `…_converge_s3.sql` is approved for any course, it must skip every row where
`course_audio.created_at` or the last `s3_key` swap post-dates `audio_clips.created_at` — the two
"I like learning quickly" / "I like meeting people" rows are the test case, and if the pass would
revert them it is not ready.

---

## What still needs building (unchanged from 08-12, none of it done)

1. **Version the collision path** — `/regenerate-phrase` must bump `audio_revision` and write
   `course_audio_revisions.previous_s3_key`, as `services/audio-repair-core.cjs` already does.
   Still the root fix; `audio_clips` does not provide it.
2. **Refuse to overwrite a depended-on clip** — DECISION 1.
3. ~~Invalidate `resolvedUrlCache` on regeneration~~ — **DONE**, `84d37385`, deployed.
4. **Delete the convention key** — remove `buildS3Key` from the projections and the `?s3Key=`
   override at `production-api.cjs:4304`.
5. **Audit phrase-text-vs-clip-text** and repair `S0027L01B01` plus the seven new cases in §4.

---

## For Deborah, in one paragraph

Nothing you regenerated has been lost. Every take you made is still the one in the database, and
the old files are still on S3 untouched — the database has only ever moved forwards. What you
were hearing was your browser holding on to the old file's address after you'd replaced it; that
was fixed on Tuesday afternoon and the fix is live, so anything you've regenerated since then
plays back correctly straight away. One thing does need your ear: eight of your regenerations also
changed the audio on a *different* phrase that happened to share the same recording — including
three where the Basque is genuinely different (*duen* vs *duten*, *ez dut* vs *ez naiz*). Those
other phrases now play your version rather than theirs. They are listed in §4 and none of them is
your mistake.

---

**LANDING LINE:** commits are on branch `docs/eus-audio-revert-2026-08-14`, pushed to origin;
**not merged** to `main`; **not deployed** anywhere — this is a documentation-only branch with no
code or database changes.
