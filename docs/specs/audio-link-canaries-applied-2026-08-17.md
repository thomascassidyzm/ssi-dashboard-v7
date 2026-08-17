# The audio-link fix is applied — 2026-08-17

**For Kai.** The staged work from this morning is now LIVE on the production
database. The canaries were run dry first, read, then committed. The backfill
was measured first, then run.

---

## The one-line answer

**Does a text edit still silently destroy audio links?**

- **course_seeds — NO.** It never even had a rule before; it does now.
- **course_practice_phrases — NO.** The silent voice swap is gone.
- **course_legos — YES, STILL.** Untouched, as instructed (queued separately).
  It still re-resolves through `audio_id_for_text()`, which constrains neither
  voice nor language. **This is the same mechanism that silenced the 1,034
  slots.** Two of three tables are now safe; the third is not, and it is the
  one that carries the learner's lego cards.

Nothing is silent any more on the two fixed tables: every dropped or moved link
writes a row to `content_audio_link_drops` with the clip id, its voice, and the
words it actually speaks.

---

## What is LIVE on the production DB

| trigger | table | state |
|---|---|---|
| `trg_null_seed_audio_on_text_change` | `course_seeds` | **NEW — live, enabled** |
| `trg_null_phrase_audio_on_text_change` | `course_practice_phrases` | **body REPLACED — live, enabled** (name deliberately kept) |
| `trg_null_lego_audio_on_text_change` | `course_legos` | **unchanged — still hazardous** |

Also live: `content_audio_link_drops` (the report table, `row_id` widened to
`text`), and `audio_id_for_text_same_voice()` (the voice-aware matcher both
triggers share, so the two tables can never disagree about which clip wins).

The rule now in force on seeds and phrases:

1. new text still speaks the same words → **keep the clip**
2. else a clip for the new text exists **in the same voice and language** →
   **re-point, and write the move down**
3. else → **NULL it, and write the drop down**

Never a silent relink onto a different voice.

---

## The canary runs

| canary | dry run | committed |
|---|---|---|
| `canary_seed_audio_link_integrity.cjs` | **26/26 green** | ✅ applied |
| `canary_phrase_audio_link_integrity.cjs` | **29/29 green** (after 2 fixture defects fixed — below) | ✅ applied |

The phrase canary had never been executed. Its first run **failed**, twice, and
both were defects in the canary's own fixtures rather than in the migration:

1. it inserted `course_legos.id` as a text key. **`course_legos.id` is a `uuid`
   with a `gen_random_uuid()` default** — verified against `information_schema`.
   The staged migration comment claiming "course_legos.id is text too" was
   **wrong** and is corrected in place. It changes no decision: `text` accepts a
   uuid by assignment cast, so `row_id` still had to widen — but for
   `course_practice_phrases` alone, which genuinely is a text key
   (`eng_for_sin:S0007L01U01`). That part of the staged work was right and
   necessary.
2. `word_count` and `lego_count` are `NOT NULL` with no default and were not
   supplied.

Neither was forced past. They were fixed, re-run dry, and only committed at
29/29.

**Worth reading:** the phrase canary's BASELINE reproduced the defect *on the
live database* before applying anything — an ordinary phrase text edit moved a
slot from **Ryan to Sonia**, with no NULL and no alarm. That is not a
hypothesis; it happened, in a transaction, and was rolled back.

### Verified again afterwards, against the deployed triggers

Not the migration-inside-a-transaction — the real thing, on a throwaway course,
rolled back:

```
PASS  LIVE seed trigger: no silent voice swap — link is NULLed
PASS  LIVE seed trigger: the drop is reported
        nulled-no-same-voice-clip-for-new-text, was azure_en-GB-RyanNeural
        saying "I have to take her"
PASS  LIVE seed trigger: same-voice clip re-points instead of nulling
PASS  LIVE seed trigger: the move is reported — relinked-same-voice
PASS  probe left nothing behind
```

**Link drops recorded since the triggers went live: 0.** No learner slot has
been changed by this fix.

---

## The backfill — the measured numbers

Measured against the **live** `normalize_text()`, not inherited:

| | |
|---|---|
| `course_audio` rows | **2,565,372** |
| stale `text_normalized` | **41,900** (1.63%), across **17 courses** |
| **backfilled** | **35,721**, across 16 courses |
| **left alone (colliding)** | **6,179**, across 13 courses |
| **audio links moved** | **none — on every single course** |

The remembered 41,900 turned out to be exactly right, but it is now measured.
Final state verified: `stale = 6179, colliding = 6179` — every row still stale
is one we deliberately declined to touch.

### The collision list — your call

All 6,179 have the **same shape**: a stale row whose stored key still carries a
trailing `?` / `.` / `。`, colliding with a clean row for the same sentence
without it. **100% are trailing-punctuation-only.** 6,059 are 2-way, 120 are
3-way. By role: 3,550 known, 1,433 target1, 1,196 target2.

| course | n | example |
|---|---|---|
| eng_for_jpn | 3,183 | `6時にあなたに聞きたかったです。` → `…です` |
| gle_for_eng | 930 | `a friend.` → `a friend` |
| jpn_for_eng | 785 | `6時に会いたい。` → `6時に会いたい` |
| por_for_eng | 454 | `a minha filha trabalha para a câmara.` |
| zho_for_eng | 338 | `are you ready?` |
| ita_for_eng | 174 | `can you tell me?` |
| kor_for_eng | 93 | `tv를 좀 봤어요?` |
| nld_for_eng | 78 | `begrijp je wat ik zeg?` |
| spa_for_eng | 65 | `¿a cuántas personas conoces…?` |
| eng_for_kor | 30 | `are you going to help me this evening?` |
| cym_s_for_eng | 21 | `beth o’t ti’n meddwl?` (voice `legacy_import`) |
| cym_n_for_eng | 19 | `beth oeddat ti’n meddwl?` (voice `legacy_import`) |
| ara_for_eng | 9 | `can i ask you something?` |

Each is genuinely "we own two clips of this sentence; which is canon". Full
per-row list (ids, voices, both texts) is in the JSON report. If you want a
bulk rule — newest wins, or human-origin wins — name it and it is a small
follow-up. I did not pick one.

---

## Two defects I found in the tooling by running it

**1. The backfill's own safety proof was unusable.** Its "no learner impact"
check md5-aggregates the audio links of *all three content tables estate-wide*,
so **any** other agent linking audio **anywhere** trips it. It did: a
fin_for_eng backfill aborted reporting "AUDIO LINKS MOVED on
course_practice_phrases". The audit log showed the mover was a concurrent
audio-linking campaign on spa_mx_for_eng / eng_for_mar / eng_for_por /
fra_ca_for_eng — 146 UPDATEs, 141 of them moving `target1_audio_id`, and
`text_changed = 0`. The backfill had touched no content row in any course.

Scoped to the course being backfilled. This loses no detection power: the write
is `UPDATE course_audio SET text = text` over ids from one course, and the only
triggers that fire on a `course_audio` UPDATE are `trg_course_audio_normalize`
(the intended one), `course_audio_audit` and `course_audio_touch_content_stamp`
— none writes an `audio_id` on a content table. `audio_autolink`, the one that
does, is `AFTER INSERT` only. A check that cries wolf on other people's
legitimate work does not add safety; it trains the operator to force past it.

**2. Both canaries dirtied a real production row and never cleaned up.** The
seed canary's comment said the trailing-space edit was undone "inside the txn";
**no statement did it.** Harmless on a dry run, which rolls back — but
`--commit` commits. The apply left a real trailing space on `eng_for_sin` seed 1
and on `eng_for_sin:S0001L01B01`.

Both were found and reverted in the same session. **All six audio links survived
the revert untouched and zero drops were recorded** — which is the cosmetic-keep
rule working correctly on live data. Both canaries now restore the text
explicitly and assert they left the row as they found it.

---

## Explicit gaps

1. **`course_legos` is still on the old, hazardous rule.** Out of scope by
   instruction, and correctly so — but it means the estate is now in a split
   state, and legos are where the 1,034-slot bleed came from. **This is the
   most important open item.** The machinery now exists and `row_id` is already
   `text`, so it is a near-copy of the phrase migration.
2. **The two new canary restore-assertions are written but unexercised.** A
   canary is one-shot against a given database: re-running the seed canary now
   fails its own `BASELINE trigger does not exist yet`, and the phrase canary
   fails `BASELINE … SILENTLY MOVES THE SLOT` — both because the fix is applied.
   That is correct behaviour, not a regression, but it means I could not
   demonstrate the restore assertions passing in a green run. What I *did*
   verify directly is that zero seeds estate-wide now carry trailing whitespace.
3. **The two production rows the canaries touched had their `version` bumped**
   (`eng_for_sin` seed 1 is now version 34) and `updated_at` set to today. The
   text is restored; the version churn is not revertible.
4. **A write fleet was active from ~14:18Z**, mid-backfill (spa_mx_for_eng and
   others). The backfill ran alongside it. I verified no interference — zero
   `tur/fin` content rows were written during the run and no `course_audio`
   rows were inserted — but the estate was not quiet for the whole operation,
   only for the trigger applies.
5. **The 16 backfilled courses now have a fresh `content_stamp`**, because
   `course_audio_touch_content_stamp` fires on any `course_audio` UPDATE
   (debounced to once per transaction, so once per 500-row batch). Learner
   script caches for those courses will re-fetch. Benign, but it is a real
   consequence and nobody asked for it.
6. **No TTS was generated, requested or implied. Nothing was deleted.**

---

## What needs you

1. **`course_legos`** — my recommendation is do it, as its own canaried change.
   Leaving two of three tables safe is a worse place to stop than either end.
2. **The collision rule**, if you want the 6,179 resolved in bulk.
3. **The branch is not merged**, per instruction — that is with Tom.
