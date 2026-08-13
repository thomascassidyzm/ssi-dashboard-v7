# eus_for_eng audio revert — forensics, 2026-08-12

Read-only investigation. No database writes, no fixes applied.

Question: Deborah edited practice-phrase text in `eus_for_eng` on popty.app and regenerated
the audio; it played correctly at the time and later reverted to the old take. Her named
example: **Round 95, BUILD 2**. Which of three mechanisms actually happened?

---

## a) What "Round 95, BUILD 2" is as a row

**Round 95 = LEGO `S0033L01`** — "how long" / "zenbat denbora", seed 33.
Three independent sources agree, so confidence is high:

| Source | R95 |
|---|---|
| `/api/production/eus_for_eng/learning-journey` (production view) | `S0033L01` |
| same endpoint with `learnerView=1` (learner audio gate + round compression) | `S0033L01` |
| `course_round_index` materialised view (`round_index = 95`) | `S0033L01` |
| raw SQL `row_number() over (order by seed_number, lego_index)` over `is_new` legos | 95 → `S0033L01` |

Round numbering is `services/learning-script-generator.cjs:299` (`numberRounds`) — every
`is_new` LEGO takes the next consecutive number.

**BUILD 2 = `eus_for_eng:S0033L01B02`**, "how long have you been learning?" /
"zenbat denbora daramazu ikasten?" (`position` 4). Both readings converge on the same row:
it is the 2nd BUILD row by phrase id, and it is also the 2nd BUILD item as the round renders
it (the round's build slots come out `B03, B02, B04, U01, U03, U02, U05` — shortest-first;
`B01` is suppressed because it duplicates the debut text, so the 2nd *displayed* build is
`B02`).

### Its audio link + s3_key + revision history

| role | clip id | s3_key | audio_revision | created_at | clip text |
|---|---|---|---|---|---|
| known | `3ab614b2-d7cb-485d-9bf9-c4086fde4e13` | `mastered/DA4030CA-3449-4893-97FB-09F00FB478C9.mp3` | 1 | 2026-05-03 06:31:39 | "how long have you been learning?" |
| target1 | `426e7fa1-8a2f-4acd-a515-09da99d18f31` | `mastered/5407E165-16A3-45BD-B6B1-D3255A42B9C2.mp3` | 1 | 2026-05-03 15:10:06 | "zenbat denbora daramazu ikasten?" |
| target2 | `c2603329-01ed-4344-85c9-edde0420b201` | `mastered/2AF58CB8-EB28-4DFF-9232-35B40B35AE07.mp3` | 1 | 2026-05-03 15:50:14 | "zenbat denbora daramazu ikasten?" |

**History: there is none.** All three clips have **zero** rows in `content_audit_log` (which
covers 2026-07-03 → now) and **zero** rows in `course_audio_revisions`. The phrase row itself
has not been updated since **2026-07-04 22:43:45 UTC**. Text and clip text match exactly on
all three roles.

**So the named example carries no defect right now and no trace of ever having been edited or
regenerated.** That is a finding, not a dodge — see "What I could not establish" below.

## Every eus_for_eng edit that IS on the record

`content_audit_log` reaches back to 2026-07-03 and covers UPDATE/DELETE. Across
2026-08-10 → now, `eus_for_eng` shows **nothing at all on 08-10 or during 08-11 daytime**.
Every text edit is on **2026-08-12**, in seeds 1, 6, 27 and 85 — i.e. rounds 3, 18, 78 and 224,
never round 95:

| time (UTC) | rows |
|---|---|
| 09:30:38 – 09:31:19 | `S0027L01B01`, `S0027L01B02`, `S0027L01B03`, lego `62c1d8ab` ("I like") |
| 11:42 – 12:12 | `S0006L02B01`, `S0001L03B01`, lego `e39c7d0c` ("I want") |
| 12:41 – 13:12 | `S0006L02B02`, `S0001L03B01` |
| 14:27 – 14:30 | lego `10b01958` ("to know"), `lego_introductions` `8a50aacd`, `S0027L01U05`, `S0027L01U02`, `S0085L01U03` |
| 11:06:03 – 11:06:10 | 447-row bulk batch — **`decomposition` column only**; 0 text changes, 0 audio-link changes (verified field-by-field) |

Of her edited rows, all now agree with their clips' text except one pre-existing defect
(below), so **her regenerations landed**.

---

## b) Which mechanism is proven

### (b) The 2026-08-11 pod-0 canon + shared-cast rollout — **REFUTED**

The rollout is real and did run: commits `23d1bf0d`, `8ed21d7f`, `2e970c7b`, `ee43c5a7`
(2026-08-11 23:17–23:37), with DB writes 22:44–23:22. What it touched, estate-wide, in
2026-08-11 22:00 → 08-12 01:00:

| table | change | rows | courses |
|---|---|---|---|
| `listening_pod_sentences` | UPDATE | 12,004 | — |
| `listening_pods` | UPDATE / DELETE | 122 / 4 | 40 / 2 |
| `courses` | UPDATE | 463 | 44 |
| `course_seeds` / `course_legos` / `course_practice_phrases` | UPDATE | 41 / 9 / 20 | 1 (`pdc_for_eng`) |
| **`course_audio`** | — | **0** | — |

It repointed **pod sentence** audio only. It wrote **zero** `course_audio` rows and **zero**
`course_practice_phrases` rows in any course but `pdc_for_eng`. In `eus_for_eng` its only
footprint is `listening_pods` at 23:16 and 23:21 plus `courses`. **It overwrote no manual
practice-phrase regeneration, anywhere.**

### (c) A reuse-planner / relink pass pointed the phrase back at the old clip — **REFUTED for eus**

Since 2026-08-10 there is **not one** `course_practice_phrases` row in `eus_for_eng` whose
`known_audio_id` / `target1_audio_id` / `target2_audio_id` changed. The phrase pointers never
moved. (Other courses did see link repointing — listed under blast radius.)

### (a) Unversioned replacement — **CONFIRMED, and it is the only mechanism operating in eus**

All 13 `course_audio` events in `eus_for_eng` since 2026-08-10 are **in-place `s3_key` swaps
that left `audio_revision` at 1**:

| changed_at (UTC) | clip id | text | old s3_key → new s3_key |
|---|---|---|---|
| 09:29:37.560866 | `fcb724fd-91a0-43a3-897a-814ad26dc79d` | "The Basque for: 'I like', is:" | `1F5E24FE…` → `017BBF6B…` (also voice `xai_gfzdpspr5fdp` → `azure_en-GB-SoniaNeural`) |
| 09:30:36.923800 | `8dc0d3a5-6882-431d-8e52-d60d9ba46024` | "I like it" | `2F182F08…` → `9C18A41A…` |
| 09:30:38.729585 | `e6381bf4-362c-4509-9096-fa038140d59d` | "gustatzen zait" | `F4D2F8A4…` → `B481B5B3…` |
| 09:30:40.675595 | `c43378a6-4cb1-4988-a00c-965428c19f1b` | "gustatzen zait" | `87058D89…` → `1D4E03FC…` |
| 09:31:15.684089 | `28976f1d-75ad-4875-bdff-d9a725a9c96c` | "I don't like" | `3F65C9A6…` → `9C263CA1…` |
| 09:31:17.337762 | `1dfa4070-89cf-43de-8aad-44cbda8a87d9` | "ez zait gustatzen" | `9CB82586…` → `68D7168C…` |
| 09:31:19.122669 | `fbb0aed7-2665-4ee6-8068-e79b21493ad0` | "ez zait gustatzen" | `47118CE9…` → `11915547…` |
| 14:29:49.301497 | `2f0cf7ec-1091-463a-8c4d-1898c13db756` | "I like learning quickly" | `AE6421BF…` → `BB0E76A8…` |
| 14:29:51.073488 | `4a3f28a4-d512-48ec-8a33-c9c8b40f591e` | "azkar ikastea gustatzen zait" | `588D0AD5…` → `7545995D…` |
| 14:29:53.095145 | `b0fb06d9-4609-437b-aa31-f052bf7cfe29` | "azkar ikastea gustatzen zait" | `D049D206…` → `5BAC4005…` |
| 14:30:28.558999 | `722add8b-3dc7-481d-bbb2-9ae707c3e82b` | "I like meeting people" | `5A258A78…` → `39973A89…` |
| 14:30:30.197400 | `a1e7e0be-04a6-4e16-9a8d-40b80414c0eb` | "jendea ezagutzea gustatzen zait" | `2179BC29…` → `5FBD6F68…` |
| 14:30:31.948418 | `254a6ffd-1ba1-437b-8ec7-75ee716c63d0` | "jendea ezagutzea gustatzen zait" | `4F3C43C6…` → `FF585576…` |

`select count(*) from course_audio_revisions where course_code='eus_for_eng'` → **0**. Not
"none since Monday" — **none ever**. Every audio replacement this course has had is unversioned.

**Root cause is by design, and it is documented in the code.** `services/phases/phase8-audio-v13.cjs:4740`:

> the unique-key collision … is handled by the upsert-on-conflict at the write below, which
> UPDATES the existing row's s3_key/duration/text in place rather than 500ing.

`course_audio` has `UNIQUE (course_code, text_normalized, language, role, voice_id)`. Whenever
a regenerated text already owns a clip for that voice+role, `/regenerate-phrase` cannot mint a
fresh id — it overwrites the existing clip's `s3_key` and leaves `audio_revision` at 1. Two
consequences: nothing downstream can tell the clip changed by revision, and **every phrase,
LEGO and seed sharing that clip id silently receives the new bytes**.

The old S3 objects are all still in the bucket (`ssi-audio-stage`), verified by HEAD:
`mastered/2F182F08-….mp3` 14,976 bytes (2026-05-23) and `mastered/1F5E24FE-….mp3` 28,800 bytes
(2026-07-06) both still exist, alongside the new objects written at exactly the swap timestamps.
Nothing was deleted, so **any URL still holding a pre-swap key serves the old take, permanently.**

### Which code path actually hands her the old take

`/api/production/:courseCode/audio/:uuid/url` reads `s3_key` from the DB (`production-api.cjs:4307`),
so a plain reload is *usually* correct. Two paths defeat it:

1. **`resolvedUrlCache` in `src/composables/useScriptPlayer.js:58-63`** — signed URLs are cached
   per clip **uuid**, for the component's lifetime, never invalidated. Because the collision path
   *keeps the uuid*, the round player keeps replaying the **pre-swap** signed URL (valid 3600s)
   while the edit modal's inline audition — which uses the URL returned by the regen
   (`ScriptViewer.vue:1824`, `fetchAuditionUrl`) — played the **new** take. This reproduces
   Deborah's sentence exactly: correct at the time, old take afterwards.
2. **The convention key `mastered/<UUID>.mp3`** — `production-api.cjs:7057` (`buildS3Key`) and the
   legacy intro path `learning-script-generator.cjs:544`, combined with the `?s3Key=` query
   parameter at `production-api.cjs:4304` which **overrides** the DB lookup. `useScriptPlayer.js:69-72`
   already warns about this in a comment. For these clips the convention object does not exist
   (`HEAD mastered/8DC0D3A5-….mp3` → NotFound), so this path yields **silence**, not old audio.

So: mechanism (a) is proven as the storage behaviour, and path 1 is the proven serving vector
for "it reverted".

## c) Blast radius

| signature | scope |
|---|---|
| In-place `s3_key` swap, `audio_revision` unchanged, since 2026-08-10 | `eus_for_eng` **13**, `nld_for_eng` **3**, `cym_n_for_eng` **2** — 18 clips estate-wide |
| `course_audio_revisions` rows for `eus_for_eng`, all time | **0** — every replacement ever made in this course is unversioned |
| Phrase audio-link repointing since 2026-08-10 (mechanism-c candidates; **eus is not among them**) | `eng_for_mar` 104, `ita_for_jpn` 85, `ell_for_eng` 57, `dan_for_eng` 56, `eng_for_ita` 3, `nld_for_eng` 3, `cym_s_for_eng` 1, `deu_for_eng` 1 |
| Phrase text ≠ linked clip text, `eus_for_eng` | known 228, target1 187, target2 186, of 6,450 rows |
| Same, worst courses estate-wide | `eng_for_jpn` 3,502 / `por_for_eng` 3,394 / `zho_for_eng` 2,612 / `ita_for_eng` 2,404 / `jpn_for_eng` 2,205 / `gle_for_eng` 1,990 (known side) |

The desync counts use a crude comparison (lower + trim only), so some of that population is
punctuation and normalisation noise — treat them as an upper bound and a place to look, not a
defect count.

**One concrete eus defect, and it is not Deborah's doing:** `eus_for_eng:S0027L01B01`
("I like") and `eus_for_eng:S0027L01B02` ("I like it") share **all three** clips —
known `8dc0d3a5`, target1 `e6381bf4`, target2 `c43378a6`. The known clip's text is "I like it",
so `B01` plays "I like it". They have shared those ids since 2026-04-21; the audit log shows
the pointers unchanged through today. The hazard this creates is live: regenerating either
phrase overwrites the clip for both.

## d) What the fix would be — NOT APPLIED

1. **Make the collision path versioned.** In `/regenerate-phrase` (and `/regenerate-lego`), the
   upsert-on-conflict branch must do what `services/audio-repair-core.cjs` already does
   correctly: bump `course_audio.audio_revision` and insert a `course_audio_revisions` row
   recording `previous_s3_key`. That alone makes every replacement reversible and detectable.
2. **Refuse to overwrite a clip that other rows with different text depend on.** Before the
   in-place update, count the phrases/legos/seeds pointing at the clip id whose own text differs
   from the new text; if any, mint a distinct clip instead of overwriting (the unique key can be
   extended, or the sharer rebound). This is the make-before-break rule applied to clip identity.
3. **Invalidate `resolvedUrlCache` on regeneration.** `useScriptPlayer` should accept a cache-bust
   signal, and `ScriptViewer`'s regen handler should fire it for the affected uuids — or the cache
   should key on `uuid + audio_revision`, which requires (1).
4. **Delete the convention key.** Remove `buildS3Key` from the projections and the `?s3Key=`
   override at `production-api.cjs:4304`; let the DB be the only source of a clip's path.
5. **Separately, and independently of the above:** audit the phrase-text-vs-clip-text population
   with a proper normaliser and repair `S0027L01B01`.

Order matters: (1) unblocks (3), and (2) is what stops the next shared-clip surprise.

## What I could not establish — explicit gaps

- **Her named example has no DB trace.** `eus_for_eng:S0033L01B02` and its three clips have not
  been touched since 2026-07-04 / 2026-05-03, and their text and audio agree. I cannot attribute
  a revert on that row because the record contains no edit to it. Either the round number is
  misremembered (her actual edits are rounds 3, 18, 78, 224), or the edit never reached the
  database — note that today's commits include `387fd5f2 fix(script-viewer): restore in-place
  refresh after phrase edit (Deborah regression)` and `416c45d8 fix(script-viewer): the phrase
  projection dropped decomposition`, so a silently-dropped write on this page is not
  hypothetical. Worth asking her which text she changed; I can then locate the row by content.
- **Nothing happened in eus on 2026-08-11.** Her stated window starts then, but the audit log —
  which reaches back to 2026-07-03 — has no `eus_for_eng` phrase or audio change before
  2026-08-12 09:29. If she worked on 08-11, it was in a different course, or those writes did
  not land.
- **`content_audit_log` records UPDATE/DELETE only.** An INSERT is invisible, so a brand-new
  phrase row would not appear in any of the above.
- **There is no HTTP request log on watson-1**, so I cannot see the URL her browser actually
  fetched, only which URLs the code can construct. The `resolvedUrlCache` vector is proven from
  the code, not from a captured request.
