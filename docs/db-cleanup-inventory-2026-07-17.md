# DB cleanup inventory — schools/groups — 2026-07-17

**This is a shopping list, not an execution plan.** No deletions have been run and none will be run
by an agent — deletion now happens through the admin UI's own delete buttons (fixed + hardened in
`ssi-learning-app` PR [#4](https://github.com/thomascassidyzm/ssi-learning-app/pull/4), on the
Schools Setup admin view). This doc tells Tom which rows to click delete on; it is read-only
analysis of the shared dev/staging/prod Supabase database (`schools`, `groups`, `classes`,
`class_sessions`, `entitlement_grants`, `invite_codes`, `govt_admins`, `demo_orgs`, `user_tags`).

Where to delete: the admin Schools Setup view (`/admin/schools-setup` in `ssi-learning-app`,
`SchoolsSetup.vue`) — each school/group row has a delete action that now shows an impact preview
(classes/learners/teachers affected) before confirming, and requires typing the exact name for any
row with real recorded activity.

Snapshot: 23 rows in `schools`, 10 rows in `groups`, 0 rows in `entitlement_grants` anywhere in the
DB (so no billing/entitlement records are at risk from any of the candidates below).

## Protections applied (excluded from delete candidates)

- **(a) Chepstow** — `Ysgol Cas-gwent Chepstow School`, first real customer school, created by
  `angharadjones@chepstowschool.net`, 32 classes. KEEP.
- **(b) demo-schools tool lifecycle** — every row with `is_demo = true` has its own expire/purge
  cycle at `/admin/demo-schools`; left untouched: `Gaelscoil na Mara`, `Sakura International
  School`, `Ysgol Gynradd y Garn`, `Sunrise Public School, Pune`, `St. Mary's Academy, Kochi`,
  `Green Valley International, Jaipur`, and groups `Gaelscoileanna Píolótach`, `IME Demo Programme`.
- **(c) real activity in last 90 days** — `Sunrise Public School, Pune` and `St. Mary's Academy,
  Kochi` have genuine-looking daily session activity (hundreds of cycles/session, matches expected
  demo-programme usage pattern) — also covered by (b).
- **(d) created by a non-Tom account, not junk-named** — `LA SIS (EAS)` (`mcauleys51@hwbcymru.net`),
  `Newport High School` (`vaughans98@hwbcymru.net` / `mt@newporthigh.co.uk`) — real Hwb Cymru
  (Welsh government schools network) teacher emails, each with live classes and no test flag. KEEP.

## Surprising finding

**Two "real-looking" school names are actually Tom's own dry-run data, superseded by the real
thing the next day** — worth flagging explicitly because a name-only pass would have kept them:

- **`Angharad 001`** (school id `d8577963`) — `is_test = false` in the DB (not flagged), but its one
  class's teacher account is `thomas.cassidy+ang_school_teacher@gmail.com` and every one of its 12
  logged sessions has `cycles_completed = 0` (mostly 0–35 second durations) — classic click-through
  testing, not a learner. Created 2026-07-15, the day *before* the real Chepstow school
  (`angharadjones@chepstowschool.net`) went live on 2026-07-16. Recommend DELETE, but flagging the
  false `is_test` flag for awareness since it breaks the "trust the flag" heuristic.
- **`Cardiff 001`** (school id `6634d0ef`, group `Welsh Gov Lang Office`) — same pattern: `is_test =
  false`, created by `thomas.cassidy+cardiff_cluster@gmail.com`, zero classes, zero activity, one
  day before the real Newport/LA SIS Hwb schools appeared standalone (not under this group) on
  2026-07-16. Reads like Tom staging the Welsh Gov rollout UI before the real onboarding happened a
  different way. Recommend DELETE.

One judgment-fork logged for Tom, no action taken: **`Aran's Irish School`** (school id `fc81a15f`)
is flagged `is_test = true` in the DB but was created by a real external account
(`aranjones@gmail.com`, not one of Tom's `thomas.cassidy+*` addresses) and isn't junk-named. Could
be a genuine friend/beta tester. Recommended **KEEP** pending your confirmation — not deleted here.

## Full inventory

| School (id) | Created by | Created | Classes | Sessions | is_test | is_demo | Group | Recommendation |
|---|---|---|---|---|---|---|---|---|
| Ysgol Cas-gwent Chepstow School (`0f5bd6e4`) | angharadjones@chepstowschool.net | 07-16 06:23 | 32 | — | f | f | — | **KEEP** — real customer #1 |
| Gaelscoil na Mara (`3978af23`) | thomas.cassidy+demo.irish.admin | 06-10 | 3 | active | t | t | Gaelscoileanna Píolótach (demo) | **KEEP** — demo-schools lifecycle |
| Sakura International School (`cc0ba726`) | thomas.cassidy+demo.japanese.admin | 06-10 | 2 | active | t | t | — | **KEEP** — demo-schools lifecycle |
| Ysgol Gynradd y Garn (`38f85a1e`) | thomas.cassidy+demo.welsh.admin | 06-10 | 2 | active | t | t | — | **KEEP** — demo-schools lifecycle |
| Sunrise Public School, Pune (`2fd27c83`) | thomas.cassidy+demo.ime.sunrise.admin | 07-14 | 4 | heavy, through 07-16 | t | t | IME Demo Programme (demo) | **KEEP** — demo-schools lifecycle, live activity |
| St. Mary's Academy, Kochi (`08ae8828`) | thomas.cassidy+demo.ime.stmarys.admin | 07-14 | 2 | heavy, through 07-16 | t | t | IME Demo Programme (demo) | **KEEP** — demo-schools lifecycle, live activity |
| Green Valley International, Jaipur (`df9a7eb0`) | — | 07-14 | 0 | — | t | t | IME Demo Programme (demo) | **KEEP** — demo-schools lifecycle |
| LA SIS (EAS) (`e2e9adc3`) | mcauleys51@hwbcymru.net | 07-16 08:55 | 1 | — | f | f | — | **KEEP** — real Hwb Cymru teacher |
| Newport High School (`14710516`) | vaughans98@hwbcymru.net, mt@newporthigh.co.uk | 07-16 10:12 | 2 | — | f | f | — | **KEEP** — real Hwb Cymru teachers |
| Aran's Irish School (`fc81a15f`) | aranjones@gmail.com | 06-17 | 1 | none | t | f | — | **judgment-fork — KEEP pending confirmation**, real external account |
| 日本-001 (`b50c8ecb`) | thomas.cassidy+schools1-001 | 06-17 | 0 | — | t | f | — | **DELETE** — Tom, junk name, empty |
| Salesian College (`440bd184`) | thomas.cassidy+schools101 | 06-30 | 0 | — | t | f | — | **DELETE** — Tom, empty |
| Salesian-2 (`46b5aaec`) | thomas.cassidy+schools102 | 06-30 | 2 | none | t | f | — | **DELETE** — Tom, no session activity |
| E2E School 1783958726227 (`096438ed`) | (unset) | 07-13 | 0 | — | t | f | E2E Region … (renamed) | **DELETE** — obviously junk (timestamp in name) |
| Tom School 001 (`3429994d`) | (unset) | 07-13 | 0 | — | t | f | Tom Test Group | **DELETE** — obviously junk |
| Gwynedd School 001 (`59ec8b40`) | (unset) | 07-13 | 0 | — | t | f | Gwynedd Ed Test | **DELETE** — Tom's test group |
| Gwynedd School 002 (`23348bd3`) | thomas.cassidy+gwyneddschool002 | 07-13 | 0 | — | t | f | Gwynedd Ed Test | **DELETE** — Tom, empty |
| Gwynedd School 003 (`f13777bd`) | thomas.cassidy+gwynedd_teacher | 07-13 | 0 | — | t | f | Gwynedd Ed Test | **DELETE** — Tom, empty |
| Bangor 001 (`030256f0`) | (unset) | 07-14 | 0 | — | t | f | Bangor (test) | **DELETE** — Tom's test group |
| Python 001 (`eae2749f`) | (unset) | 07-14 | 1 | none | t | f | Python Community District | **DELETE** — Tom (teacher +python_admin), no real activity |
| Angharad 001 (`d8577963`) | (unset, teacher thomas.cassidy+ang_school_teacher) | 07-15 | 1 | 12, all 0-cycle click-throughs | **f** | f | Angharad District | **DELETE** — Tom's dry-run, superseded by real Chepstow next day (see surprising finding) |
| Angharad 002 (`3146393d`) | (unset) | 07-16 | 0 | — | f | f | Angharad District | **DELETE** — orphan dup of above |
| Cardiff 001 (`6634d0ef`) | thomas.cassidy+cardiff_cluster | 07-16 | 0 | — | **f** | f | Welsh Gov Lang Office | **DELETE** — Tom's dry-run, superseded by real Newport/LA SIS (see surprising finding) |

## Groups

| Group (id) | Schools attached | is_test | is_demo | Recommendation |
|---|---|---|---|---|
| Gaelscoileanna Píolótach (`2a0fdb87`) | Gaelscoil na Mara | t | t | **KEEP** — demo lifecycle |
| IME Demo Programme (`2d98bc20`) | Sunrise, St Mary's, Green Valley | t | t | **KEEP** — demo lifecycle |
| Tom Test Group (`a79cc097`) | none (orphan) | t | f | **DELETE** — orphan, Tom |
| E2E Region 1783958726227 (renamed) (`ceee815a`) | E2E School 1783958726227 | t | f | **DELETE** |
| Tom Test Group (`ba23682c`) | Tom School 001 | t | f | **DELETE** |
| Gwynedd Ed Test (`c7db460c`) | Gwynedd School 001/002/003 | t | f | **DELETE** |
| Bangor (`0fe746e0`) | Bangor 001 | t | f | **DELETE** |
| Python Community District (`903dad89`) | Python 001 | t | f | **DELETE** |
| Angharad District (`8e99c868`) | Angharad 001/002 | f | f | **DELETE** — Tom's dry-run (see surprising finding) |
| Welsh Gov Lang Office (`7f492d77`) | Cardiff 001 | f | f | **DELETE** — Tom's dry-run (see surprising finding) |

## Counts

- **23 schools total** → 10 KEEP (1 real customer + 6 demo-lifecycle + 2 real Hwb Cymru + 1 judgment-fork) / 13 recommended DELETE
- **10 groups total** → 2 KEEP (demo-lifecycle) / 8 recommended DELETE
- **0 entitlement_grants** anywhere in the DB — no billing records at risk from any candidate

## How to actually delete these

Through the admin Schools Setup UI (`ssi-learning-app`, `SchoolsSetup.vue`), once
[PR #4](https://github.com/thomascassidyzm/ssi-learning-app/pull/4) lands. The delete buttons there
were previously broken for real schools — `schools.invite_code_id` and `govt_admins.invite_code_id`
both reference `invite_codes` with no `ON DELETE` behaviour, and `invite_codes.grants_school_id` /
`grants_group_id` reference back to `schools`/`groups` the same way, so a bare `schools.delete()`
500s on essentially every school (every school gets 2 `invite_codes` rows at creation). The PR fixes
the cleanup order server-side, adds an impact preview before confirming, and requires typing the
exact name for any row with real recorded activity. No manual SQL needed — click delete on each
DELETE-recommended row above once the fix is deployed.
