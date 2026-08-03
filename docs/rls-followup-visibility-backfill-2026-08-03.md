# RLS follow-up applied — visibility backfill + dangling enrolment clean (2026-08-03)

Founder-approved (Tom, 2026-08-03). Two direct writes against **production** Supabase
(project ref `swfvymspfxmnfhevgdkg`, verified against the dashboard's live SUPABASE_URL before writing).
Dry run rolled back first; applied in a single transaction with abort-on-drift assertions.
Per-row machine log: `scripts/rls-followup/log-applied.json` (gitignored workspace).

## Why

The live `courses_select` RLS policy is `visibility IN ('public','beta') OR new_app_status IN ('live','beta') OR …`.
The `new_app_status` leg was added later, so 46 courses sat at `visibility='hidden'` while being
served to learners via the `new_app_status` leg. `courses.visibility` is read by **nothing except that
policy** (grepped both repos: no app logic, no listing filter, no pricing/access-control use). So this is a
truthfulness correction to a stale flag, **not** a publish event — no course's reachability changed.

## Task 1 — visibility backfill (46 rows)

Derived independently from live data: all 46 have full content (668 seeds, 515–1554 legos);
43 have real enrolments (1–225 learners, practice as recent as 2026-08-02).
`hidden + new_app_status='draft'` (1) and `hidden + not_available` (55) were **not touched**.

| course_code | visibility | new_app_status |
|---|---|---|
| afr_for_eng | hidden → public | beta |
| bul_for_eng | hidden → public | beta |
| cat_for_eng | hidden → public | beta |
| ces_for_eng | hidden → public | beta |
| dan_for_eng | hidden → public | beta |
| deu_for_jpn | hidden → public | beta |
| deu_for_zho | hidden → public | beta |
| ell_for_eng | hidden → public | beta |
| eng_for_ben | hidden → public | beta |
| eng_for_guj | hidden → public | beta |
| eng_for_hin | hidden → public | beta |
| eng_for_pan | hidden → public | beta |
| eng_for_sin | hidden → public | beta |
| eng_for_tam | hidden → public | beta |
| eng_for_urd | hidden → public | beta |
| est_for_eng | hidden → public | beta |
| eus_for_eng | hidden → public | beta |
| fas_for_eng | hidden → public | beta |
| fra_for_jpn | hidden → public | beta |
| fra_for_zho | hidden → public | beta |
| heb_for_eng | hidden → public | beta |
| hin_for_eng | hidden → public | beta |
| hun_for_eng | hidden → public | beta |
| hye_for_eng | hidden → public | beta |
| isl_for_eng | hidden → public | beta |
| ita_for_jpn | hidden → public | beta |
| ita_for_zho | hidden → public | beta |
| lav_for_eng | hidden → public | beta |
| lit_for_eng | hidden → public | beta |
| nep_for_eng | hidden → public | beta |
| nor_for_eng | hidden → public | beta |
| ron_for_eng | hidden → public | beta |
| rus_for_eng | hidden → public | beta |
| spa_for_jpn | hidden → public | beta |
| spa_for_zho | hidden → public | beta |
| srp_for_eng | hidden → public | beta |
| swa_for_eng | hidden → public | beta |
| tha_for_eng | hidden → public | beta |
| ukr_for_eng | hidden → public | beta |
| zho_for_jpn | hidden → public | beta |
| ben_for_eng | hidden → public | live |
| eng_for_kan | hidden → public | live |
| eng_for_mar | hidden → public | live |
| eng_for_tel | hidden → public | live |
| glg_for_eng | hidden → public | live |
| hrv_for_eng | hidden → public | live |

Target value `public` follows the estate's majority convention (18 pre-existing `public`+`beta` vs 6
`beta`+`beta`; all 8 pre-existing `live` courses were already `public`).

Three of the 46 have **zero enrolments** — `deu_for_jpn`, `deu_for_zho`, `ita_for_zho`. Included because
they carry full content, sit in the same authored batch as siblings that do have learners, and were
explicitly set `new_app_status='beta'` — i.e. already published by the live policy. Flagged for Tom.

Rollback: the `courses_audit` trigger captured all 46 full pre-change rows in `content_audit_log`
(`table_name='courses', change_type='UPDATE'`, 2026-08-03).

## Task 2 — dangling course_enrollments (25 rows deleted, 8 kept)

33 rows had a `course_id` matching no `courses.course_code`. All 25 deleted rows belong to a **single
internal pentest learner** (`3f720a66-a979-490a-b521-ca9a313f5997`, `is_internal=true`), all stamped
2026-04-01, all with 0 practice minutes and no progress. Each was re-checked against `courses` under
case-insensitive/trimmed comparison (0 matches) before deletion; the script aborted if any loose match
appeared or the count differed from 25.

| deleted course_id | rows |
|---|---|
| `../../../../../../../../../../../../etc/passwd` | 1 |
| `../../../../../../../../../../../../Windows/system.ini` | 1 |
| `../WEB-INF/web.xml` | 1 |
| `/etc/passwd` | 1 |
| `c:/Windows/system.ini` | 1 |
| `cym_n_for_eng;cat /etc/passwd;` | 1 |
| `cym_n_for_eng&cat /etc/passwd&` | 1 |
| `cym_n_for_engcat /etc/passwd` | 1 |
| `eus_for_spa__ssti_probe__{{1234*5678}}` | 1 |
| `eus_for_spa__ssti_probe__${1234*5678}` | 1 |
| `eus_for_spa;cat /etc/passwd;` | 1 |
| `eus_for_spa'` | 1 |
| `eus_for_spa' OR SLEEP()=SLEEP() --` | 1 |
| `eus_for_spa"` | 1 |
| `eus_for_spa{{7*'7'}}` | 1 |
| `eus_for_spa\` | 1 |
| `eus_for_spa&cat /etc/passwd&` | 1 |
| `eus_for_spacat /etc/passwd` | 1 |
| `JvSYSHKgNAnyZ` | 1 |
| `JvSYSHΑgNAnyZ` | 1 |
| `JvSYSH콻gNAnyZ` | 1 |
| `sghctSKIlQzRe` | 1 |
| `sghctSΑIlQzRe` | 1 |
| `sghctS콻IlQzRe` | 1 |
| `WEB-INF/web.xml` | 1 |

**Kept (8 rows, real learners, real historical course codes):**

| course_id | rows | learners | note |
|---|---|---|---|
| `cym_for_eng_north` | 4 | 4 | legacy predecessor of `cym_n_for_eng` |
| `spa_for_eng_v2` | 3 | 3 | variant of `spa_for_eng`; **not in the original audit brief** |
| `cym_for_eng` | 1 | 1 | legacy predecessor of `cym_s_for_eng` |

## Counts

| metric | before | after |
|---|---|---|
| courses `visibility='hidden'` + `new_app_status IN ('live','beta')` | 46 | 0 |
| course_enrollments total | 1536 | 1511 |
| dangling course_id rows | 33 | 8 |

## Left alone (flagged, not acted on)

- The same pentest learner still holds **7 enrolments against real course codes** (`bul_for_eng`,
  `cat_for_eng`, `cym_n_for_eng`, `cym_s_for_eng`, `eus_for_spa`, `lav_for_eng`, `nld_for_eng`).
  Not dangling, so out of scope — but they inflate those courses' enrolment counts by 1 each.
- 6 courses remain `visibility='beta'` + `new_app_status='beta'` (`ara_for_eng`, `deu_for_eng`,
  `eng_for_jpn`, `gle_for_eng`, `nld_for_eng`, `zho_for_gle`). Functionally identical to `public`
  under the policy; left as-is rather than widening scope.
- 8 courses are `visibility='public'` + `new_app_status='not_available'` — the mirror-image
  disagreement. Out of scope for this pass.
