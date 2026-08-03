# spa_for_eng_v2 — investigation + dangling-enrolment deletion (2026-08-03)

Founder ruling (Tom, 2026-08-03): *"spa_for_eng_v2 is an artefact of a previous/abandoned
approach and should be deleted — but first identify who the 3 enrolled people actually are."*

Production DB ref `swfvymspfxmnfhevgdkg`, confirmed against live `SUPABASE_URL` before any write.
Follow-up to `docs/rls-followup-visibility-backfill-2026-08-03.md`, which kept these 3 rows.

---

## 1. Who the 3 "learners" were

Not people. Three synthetic **class-entity** learners (`learners.is_class_entity = true`),
auto-created by a test harness. Zero human footprint:

| learner_id | user_id | display_name | created |
|---|---|---|---|
| `e618de77…9ec85` | `class-learner:4e468bc6-e881-431e-960b-00312d9abf84` | THE-MODEL demo mrpvawk0 | 2026-07-18 04:29:31Z |
| `2879e717…19163` | `class-learner:4917d68c-e042-4c4c-96be-7c309beaa83f` | THE-MODEL demo mrpvnobx | 2026-07-18 04:39:25Z |
| `65a9d6d5…65c44` | `class-learner:c7ee4f27-447b-41bb-8daf-9c9dc5a7737e` | THE-MODEL demo mrpvpfws | 2026-07-18 04:40:47Z |

Each learner row was created in the *same second* as its enrolment. Activity check across
every learner-scoped table returned **0 rows** for all three:

```
other_enrolments 0 | practice_history 0 | points 0 | milestones 0 | lego_metrics 0 | emails 0
```

Enrolment rows themselves: `last_practiced_at` NULL, `total_practice_minutes` 0,
`welcome_played` false, `highest_completed_lego_id` NULL, default `helix_state`.
`verified_emails` empty, no `learner_emails`, no entitlements, no other course enrolments.

`is_internal`/`is_demo` are both false on the learner rows — but that is a flag gap, not
evidence of real users: the *owning school* is explicitly flagged
`is_demo = true, is_test = true` (see below).

**Verdict: confirmed test artefacts. Tom's deletion assumption holds.**

## 2. Where the bad course_id came from — traced to the line

`ssi-learning-app/packages/player-vue/e2e/the-model/verify-the-model.mjs:184`

```js
const ts = Date.now().toString(36)                    // :141  -> "mrpvawk0"
…
body: JSON.stringify({ name: `THE-MODEL demo ${ts}`, shape: 'school',
                       course_code: 'spa_for_eng_v2' }),   // :184
```

- The literal entered at `8b959ea6` (2026-07-18 05:37 +0100, the delete-family FK fix) in **two**
  live call sites of the harness; `4ff94db1` (05:42, *"deployed-dev verification harness — 25/25
  against 8b959ea"*) then changed the second one to `ben_for_eng`, which is itself evidence the
  harness was run live between the two commits. Timestamps match the enrolments.
- The base36 `Date.now()` suffix explains the `mrpvawk0` / `mrpvnobx` / `mrpvpfws` names —
  three separate harness runs at 04:29, 04:39, 04:40 UTC.
- Both call sites reach `course_enrollments`:
  - `:184` → `POST /api/groups/:id/demo-mint` → `api/_utils/demoLeaf.ts:ensureDemoLeafClass` →
    `ensureClassLearnerEntity` (`api/_utils/classLearnerEntity.ts:53-58`) → upsert.
  - `:241` → `POST /api/onboarding/provision` (`track:'tutor'`) → `provision.ts:256-269` →
    same `ensureClassLearnerEntity` upsert.
  Each flow mints a **fresh** `learners` row (`user_id: 'class-learner:${classId}'`) before the
  upsert, so repeat runs produce distinct learner_ids rather than collapsing on conflict —
  exactly the 3 distinct learner_ids observed.
- Step 5 of the harness deletes the minted subtree; that cleanup left residue behind
  (3 enrolments, 1 `classes` row, 1 `schools` row).

**On the `_v2` suffix:** no code anywhere in either repo *constructs* a `_vN` suffix dynamically.
`_vN` is a real hand-authored naming convention — `services/course-builder/lib/validation.cjs:899`
strips a trailing `_vN` so a versioned course inherits the base vocab — but **no `_vN` course code
exists in production** (`SELECT course_code FROM courses WHERE course_code ~ '_v[0-9]+$'` → 0 rows).
So `spa_for_eng_v2` is a plausible-looking code hand-typed into a test file, never a real course.

**Root cause:** `api/groups/[id]/demo-mint.ts:188` validates only that `course_code` is
*present*, never that it *exists* in `courses`. Any string mints a live school/class/enrolment.
`onboarding/provision` has the same gap.

**Also worth Tom's eye:** the harness is labelled "deployed-dev" but its writes landed in the
production database.

## 3. What was deleted

```sql
BEGIN;
DELETE FROM course_enrollments WHERE course_id = 'spa_for_eng_v2';  -- DELETE 3
COMMIT;
```

Post-check: `0` remaining. Dangling-code sweep now returns only the two real historical codes
deliberately kept by the prior pass — `cym_for_eng` (1), `cym_for_eng_north` (4).

Rollback snapshot (enrolment rows verbatim, plus their learner rows) is embedded below and
also at `scripts/rls-followup/spa_for_eng_v2-enrolments-snapshot-2026-08-03.json` (gitignored).

## 4. NOT deleted — residue outside the ruling, for Tom

Deleting the enrolments does not remove the objects that produced them. Left in place
deliberately (Tom's ruling covered the enrolment rows; these are a bigger destructive step):

- `schools` `94bbb314-60f5-49a4-b804-7d5684445100` — "THE-MODEL demo mrpvawk0",
  `is_demo=t, is_test=t, platform_status='trial'`, **`trial_course_code = 'spa_for_eng_v2'`**,
  `platform_expires_at` 2027-07-18.
- `classes` `4e468bc6-e881-431e-960b-00312d9abf84` — same name, `course_code = 'spa_for_eng_v2'`,
  `is_active = true`, join code `LAN-308`, 0 `class_sessions`.
- The 3 `learners` rows themselves (now enrolment-free class entities).

The other two runs' school/class rows were already cleaned by the harness; only run 1's survived.

**Decision candidates:**
1. Delete the residual test school + class + 3 class-entity learners? (Recommendation: yes —
   `is_test=t` school, zero sessions, it is the same artefact.)
2. Add an existence check on `course_code` in `demo-mint.ts` against `courses`, and/or an FK.
   (Recommendation: yes — cheapest structural fix; stops any future string minting live rows.)
3. Point the e2e harness at a real course code and/or a non-production DB.

---

## Snapshot — deleted `course_enrollments` rows (verbatim)

```json
[
  {
    "id": "74782ba7-ce51-41b4-bed8-65524ee88b25",
    "course_id": "spa_for_eng_v2",
    "learner_id": "e618de77-161e-4ae0-aa71-f2f8cc19ec85",
    "enrolled_at": "2026-07-18T04:29:31.887+00:00",
    "helix_state": {
      "threads": {
        "1": {
          "seedOrder": [],
          "currentSeedId": null,
          "currentLegoIndex": 0
        },
        "2": {
          "seedOrder": [],
          "currentSeedId": null,
          "currentLegoIndex": 0
        },
        "3": {
          "seedOrder": [],
          "currentSeedId": null,
          "currentLegoIndex": 0
        }
      },
      "active_thread": 1,
      "injected_content": {}
    },
    "current_mode": "main",
    "welcome_played": false,
    "last_practiced_at": null,
    "current_cycle_index": 0,
    "infplay_round_index": 0,
    "completed_pod_rounds": 0,
    "pod_activation_round": null,
    "highest_completed_seed": null,
    "last_completed_lego_id": null,
    "total_practice_minutes": 0,
    "highest_completed_lego_id": null,
    "last_completed_round_index": null,
    "highest_completed_round_index": null
  },
  {
    "id": "85da219e-a42d-4b34-831c-95f648692119",
    "course_id": "spa_for_eng_v2",
    "learner_id": "2879e717-8fa1-48df-94d2-0f15d2819163",
    "enrolled_at": "2026-07-18T04:39:25.834663+00:00",
    "helix_state": {
      "threads": {
        "1": {
          "seedOrder": [],
          "currentSeedId": null,
          "currentLegoIndex": 0
        },
        "2": {
          "seedOrder": [],
          "currentSeedId": null,
          "currentLegoIndex": 0
        },
        "3": {
          "seedOrder": [],
          "currentSeedId": null,
          "currentLegoIndex": 0
        }
      },
      "active_thread": 1,
      "injected_content": {}
    },
    "current_mode": "main",
    "welcome_played": false,
    "last_practiced_at": null,
    "current_cycle_index": 0,
    "infplay_round_index": 0,
    "completed_pod_rounds": 0,
    "pod_activation_round": null,
    "highest_completed_seed": null,
    "last_completed_lego_id": null,
    "total_practice_minutes": 0,
    "highest_completed_lego_id": null,
    "last_completed_round_index": null,
    "highest_completed_round_index": null
  },
  {
    "id": "91440841-70df-4431-b62b-de884162284c",
    "course_id": "spa_for_eng_v2",
    "learner_id": "65a9d6d5-e2c0-47ec-81c6-2246b4a65c44",
    "enrolled_at": "2026-07-18T04:40:47.281709+00:00",
    "helix_state": {
      "threads": {
        "1": {
          "seedOrder": [],
          "currentSeedId": null,
          "currentLegoIndex": 0
        },
        "2": {
          "seedOrder": [],
          "currentSeedId": null,
          "currentLegoIndex": 0
        },
        "3": {
          "seedOrder": [],
          "currentSeedId": null,
          "currentLegoIndex": 0
        }
      },
      "active_thread": 1,
      "injected_content": {}
    },
    "current_mode": "main",
    "welcome_played": false,
    "last_practiced_at": null,
    "current_cycle_index": 0,
    "infplay_round_index": 0,
    "completed_pod_rounds": 0,
    "pod_activation_round": null,
    "highest_completed_seed": null,
    "last_completed_lego_id": null,
    "total_practice_minutes": 0,
    "highest_completed_lego_id": null,
    "last_completed_round_index": null,
    "highest_completed_round_index": null
  }
]
```
