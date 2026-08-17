# A-133 ear verdict — nine casting rulings, and where they now live

**Date:** 2026-08-17
**Source:** Tom's own listen to the 55-clip phrase test — 11 voices × 5 different lines, all fresh
renders through the wired chain (`tools/a108/a133-phrase-test.cjs`, published as `/d/3566099e`,
built on branch `feat/a133-tail-pad-in-chain-2026-08-17`).
**Status:** rulings RECORDED. Nothing recast, nothing rendered, nothing deleted.

---

## 1. The reader of record — where voice selection is genuinely read from

This is the finding that decides where a casting ruling belongs, so it goes first. There are **three
stores, and none of them is a document**:

| What is being cast | Store actually read | Read by |
|---|---|---|
| **Pod / listening casting** | `app_config.pod_voice_pools` (JSONB) — the *curated* pool | `tools/pod-sync.cjs:165` loads it, resolves a cast, writes `listening_pods.speakers`; `services/phases/phase8-audio-v13.cjs:6139,6549` reads that at render |
| **Course audio (target1/target2/known/presentation)** | `courses.voice_config` (JSONB) | `services/voice-config-service.cjs` |
| **Voice metadata (gender, engine, locale)** | `voices` table | `tools/pod-voice-coverage.cjs` via `loadVerifiedGenders()`; `services/shared/clone-copy-index.cjs:40` |

`tools/pod-voice-coverage.cjs` is the **code-level default map** that computes a pool from
`tools/pod-voices-xai.json` + `tools/pod-voices-azure.json`. It is read-only by construction (its own
header says so) — it proposes; `app_config.pod_voice_pools` disposes.

**`voices` has no status field.** Its columns are `voice_id, type, tts_engine, tts_voice_name,
tts_locale, human_name, human_email, languages, sample_count, last_used_at, is_active, created_at,
updated_at, display_name, provider_id, typical_roles, model, notes, gender, age, metadata_source,
metadata_checked_at`. There is no `approved` / `rejected` / `status` column, and **`is_active` is not
a selection gate** — a grep of `services/` and `tools/` finds it only ever *written* (hardcoded
`true` at `voice-config-service.cjs:233` and `:296`, `tools/sync/sync-voices-to-supabase.cjs:67`) and
never read to decide a cast. So the only place in that table a ruling can be recorded is **`notes`**,
which is exactly the precedent set for the `sal` gender ruling on this same day (commit `9563e8b1`).

**What a migration would need to add**, if Tom wants these rulings to *bind* rather than be
*recorded*: a `casting_status text` column on `voices` constrained to something like
`('lead','approved','benched','under_review','rejected')`, a `casting_status_reason text`, a
`ruled_at timestamptz`, and — the load-bearing half — a read of it in `resolveTargetPool()` /
`resolveKnownPool()` in `tools/pod-voice-coverage.cjs` and in `pod-sync.cjs`'s `poolVoice()`, so a
rejected voice cannot be handed a seat. Without that read, a column is just a longer note.

---

## 2. The rulings, verbatim in essence

| Voice | id | Ruling | Tom's reason |
|---|---|---|---|
| Tom's own clone | `gfzdpspr5fdp` (xai) | **LEAD / PRIMARY for English** | one of "the BEST" |
| Olivia | `bedd6226` (xai) | **LEAD / PRIMARY for English** | one of "the BEST" |
| Eve | `eve` (xai) | **OUT** | register completely wrong for learning content |
| Sal | `sal` (xai) | **OUT** | American accent |
| Leo | `leo` (xai) | **BENCHED** | fine, but redundant |
| Fenna | `nl-NL-FennaNeural` (azure) | **REJECTED — unusable** | quality. Drop Azure for Dutch entirely |
| Maarten | `nl-NL-MaartenNeural` (azure) | **REJECTED — unusable** | quality. Drop Azure for Dutch entirely |
| Femke | `58d27475085e` (xai) | **PASSES perfectly** | Dutch goes xAI |
| Thijs | `a13662ba951c` (xai) | **PASSES perfectly** | Dutch goes xAI |
| Ruben | `244e27b39200` (xai) | **PASSES perfectly** | Dutch goes xAI |
| Noor | `247783ebdd51` (xai) | **UNDER REVIEW** | fails p1 and p3, passes p2/p4/p5 — held pending the A-133 p1/p3 click diagnosis. Deliberately **not** rejected and **not** approved |

**Screening-shape preference:** phrase patterns **p4 and p5 work best as screening shapes**. p4 is
the quiet, low-energy ending with no consonant to mark it (Dutch unstressed schwa; English final
sibilant cluster); p5 is the weak final stop (Dutch final devoicing /d/→/t/; English final /t/
closing a /pt/ cluster). p1 remains the *control* line, not a screening shape.

---

## 3. Where each ruling was written

**`voices.notes`** — all eleven rows, one `UPDATE` each, additive text only. `sal`'s existing T-21
gender note was **appended to**, never overwritten. Exact SQL and row counts are in §5.

**`tools/pod-voice-coverage.cjs`** — the A-133 ruling block above `MULTI` (the multilingual TARGET
overflow list, which is where `eve`, `sal`, `leo`, `ara` and `rex` actually live), plus an inline
marker on the `nld` TARGET entry. Comment-only; no behaviour changed. Why, in §4.

**`tools/a108/a133-phrase-test.cjs`** — the p4/p5 preference recorded on the `PHRASES` definition
itself, which is where the brief asked for it.

**`tools/a108/a133-build-screen-list.cjs`** — the preference made into a real default, not just a
comment. `LINES` for `eng` and `nld` are now the **p5 shapes**, with the **p4 shapes** selectable via
`SCREEN_SHAPE=p4`. The render count per voice is unchanged (still one line), so this costs nothing
new. `zho`, `spa`, `deu`, `fra` and `jpn` keep their legacy line and are marked in the file as having
no p4/p5 shape authored yet — writing one for a language nobody on this job speaks would be a guess
wearing Tom's ruling's clothes.

---

## 4. What was deliberately NOT done, and why

**The live pools were not edited.** Two things would have to change to *enforce* these rulings, and
both are casting changes with a render consequence rather than recordings of a ruling:

1. **`app_config.pod_voice_pools.nld` still contains the two rejected Azure voices**, at index 2 of
   each gender:
   `f: [Lieke cdb1cec8 (xai), Sophie 6fe32f8a (xai), Fenna nl-NL-FennaNeural (azure)]`
   `m: [Bas 18245f0d (xai), Daan ef4ce33e (xai), Maarten nl-NL-MaartenNeural (azure)]`
   Note what that list also shows: **Femke, Thijs, Ruben and Noor — the four xAI voices Tom just
   judged — are not in the live Dutch pool at all.** They are in `tools/pod-voices-xai.json`'s `nl`
   block. Dutch has two separate voice inventories, which the T-21 ledger already flagged. So
   "drop Azure for Dutch" shortens `nld` from 3f/3m to 2f/2m and removes a colour a scene may need;
   the natural replacement (promote Femke/Thijs/Ruben, which he passed perfectly) is a *new cast*,
   and casts are his.

2. **`eve` is half the multilingual female overflow.** `MULTI_F` is `ara` + `eve`. Filtering `eve`
   out of `MULTI` can leave a language's female list empty, which `pod-sync.cjs:452` turns into a
   hard `No target voice available` at cast time. `eve` is also on **21 courses'
   `courses.voice_config`** today (`leo` 8, `sal` 1, `gfzdpspr5fdp` 20, `bedd6226` 13,
   `nl-NL-FennaNeural` 1, `nl-NL-MaartenNeural` 1). Ripping it out is a re-render decision.

**Recommendation, for Tom, one line each:**
- *Dutch:* promote Femke (f) and Ruben or Thijs (m) into `pod_voice_pools.nld` **and then** drop the
  Azure pair — make-before-break, pool depth preserved. One gated script, no renders until he says.
- *Eve:* schedule a replacement pass per course rather than a pool filter, because 21 courses read
  her from `courses.voice_config` and an empty overflow list fails a cast hard.

---

## 5. The collision this opens with T-21 — flagged, not resolved

The T-21 casting ledger (`docs/pods/t21-casting-rulings-2026-08-17.md`, earlier the same day)
records Tom **rejecting** two of these voices from the T-21 casting page:

> **Both in-production Dutch voices are REJECTED**: `247783ebdd51` (88 clips) and `a13662ba951c`
> (85 clips) … his stated reasons: they are misgendered in the labels, and not good enough anyway.

Those are **Noor and Thijs**. On the A-133 phrase test Tom has now said Thijs **passes perfectly**
and Noor is a p1/p3 failure held under review. T-21 also locked Dutch to **Bas + Lieke**.

The two verdicts were reached on different material — T-21 on the casting page's samples with a
known-bad gender label attached; A-133 on five fresh lines per voice through the fixed chain, with
no labels in play. Either could be the one he means. **This is Tom's call and nothing has been
changed on the strength of a guess.** Both records now point at each other.

Also still standing, and unaffected by anything here: the **A-131 ruling** that one Dutch clip's
original take (`nld_for_eng` pod-0 `SC08-S004`, clip `7e08e470-…`) must never be replaced, and the
**#800 end-click render hold** on Dutch.

---

## 6. Gaps, stated rather than papered over

- `tools/pod-voices-xai.json` and `pod-voices-azure.json` are pure JSON and **cannot carry a
  comment**. Adding a `_rulings` key would be read as a language by `pod-voice-coverage.cjs`'s
  `Object.entries(pool)` loop, which only skips `multilingual` — so it would corrupt the pool. The
  rulings for the voices in those files live in `pod-voice-coverage.cjs` (which reads them) and in
  `voices.notes` instead.
- `voices` cannot express "rejected", "benched" or "under review" as data — only as prose in
  `notes`. The migration that would fix that is spelled out in §1.
- p4/p5 screening shapes exist for **nl and en only**.
