# Aran's course list — what is done, what is left

**Scout report, 2026-08-06. Read-only. Source: live Supabase + the live learner catalogue API.**

## Ground truth: what "live" means

The field that decides learner visibility is **`courses.new_app_status`**, not `courses.status`.

- The learner catalogue query is `new_app_status IN ('live','beta')` — see `ssi-learning-app/api/courses/available.ts:35`, `packages/player-vue/src/App.vue:431`, `CourseSelector.vue:373`, and the paid-provisioning guard `api/onboarding/provision.ts:108`.
- `live` = offered, no badge. `beta` = offered and fully playable, shown with a beta badge (`CourseSelector.vue:74`). **Both are live to learners.**
- `not_available` / `draft` = invisible to learners.
- **`courses.status` is a decoy.** It is the content-pipeline state and it disagrees with reality: `kor_for_hin` and `kor_for_tam` are `status='draft'` yet are `new_app_status='beta'` and are live in the app right now. Anyone reading `status` will report those two as not built. 5 courses in total are mislabelled this way.

Distribution across all 143 courses: **14 `live`, 68 `beta`, 60 `not_available`, 1 `draft`** → **82 courses playable by learners today.**

## Calibration (as demanded)

I ran the calibration before reporting any count.

| Check | Result |
|---|---|
| `kor_for_hin` | `new_app_status = beta` ✅ — returned as live |
| `kor_for_tam` | `new_app_status = beta` ✅ — returned as live |
| Live API `GET /api/courses/available` (production, Vercel) | 82 courses |
| DB `new_app_status IN ('live','beta')` with service key | 82 courses |
| Diff between the running system and the DB | **zero** — no additions, no omissions, no status mismatches |

So the query is calibrated against both the known positive *and* the running system.

**Key used: `SUPABASE_SERVICE_KEY` (service role).** I checked the known gotcha: the anon key returns **90** course rows where **143** exist. Every count in this report is on the service key.

---

## The status table

State vocabulary: **fully live** = `new_app_status='live'` · **beta** = `new_app_status='beta'`, playable by learners with a badge · **built not published** = content and audio exist but `not_available`/`draft` · **not built** = no content rows.

### Item 1 — "the last 4 for-English-speakers courses"

Already fully live for English speakers (11): Spanish, Portuguese, Italian, Chinese, Japanese, Korean, Bengali, Galician, Croatian, North Welsh, South Welsh.

The four majors missing from that live set are the strongest reading of "the last 4" — and all four are already in beta:

| course | what it is | state | blocker if not live |
|---|---|---|---|
| `deu_for_eng` | German for English speakers | **beta** | — playable; not promoted to `live` |
| `fra_for_eng` | French for English speakers | **beta** | — playable; not promoted to `live` |
| `por_br_for_eng` | Brazilian Portuguese for English speakers | **beta** | — playable; not promoted to `live` |
| `spa_mx_for_eng` | Mexican Spanish for English speakers | **beta** | — playable; not promoted to `live` |

**⚠️ The identity of "the last 4" is ambiguous and I am not picking silently.** Candidates, with state, so Aran can confirm:

| candidate set | courses | state |
|---|---|---|
| **A — the four European/LatAm majors** (my leading read: exactly the four full-length majors absent from the live set; also what this week's repair work has been aimed at) | deu, fra, por_br, spa_mx `_for_eng` | all 4 **beta** |
| **B — the Arabic tranche** | `ara_for_eng` (MSA), `ara_eg_for_eng` (Egyptian), `ara_lb_for_eng` (Lebanese) | all 3 **beta** — only 3, so a poor fit for "4" |
| **C — the last 4 to reach `live`** | there is no queue of 4; 36 for-English courses sit in beta | n/a |

Also relevant: `fra_ca_for_eng` (Quebec French) is **built not published** — 1,366 legos, 61,030 audio clips, `new_app_status='draft'`. It is the only fully-built for-English course sitting outside the learner catalogue.

### Items 2 and 3 — English for Japanese / Mandarin speakers

| course | what it is | state | blocker if not live |
|---|---|---|---|
| `eng_for_jpn` | English for Japanese speakers | **beta — live to learners** | none |
| `eng_for_zho` | English for Mandarin speakers | **beta — live to learners** | none |

(The Mandarin code is `zho`, not `cmn`. Both confirmed present in the production `/api/courses/available` response.)

### Item 4 — 4 trial for-Mandarin-speakers courses

The for-Japanese trial set is deu / fra / ita / spa (plus eng and zho). The same four exist for Mandarin, and all four are already in beta:

| course | what it is | state | blocker if not live |
|---|---|---|---|
| `deu_for_zho` | German for Mandarin speakers | **beta** | none |
| `fra_for_zho` | French for Mandarin speakers | **beta** | none |
| `ita_for_zho` | Italian for Mandarin speakers | **beta** | none |
| `spa_for_zho` | Spanish for Mandarin speakers | **beta** | none |
| `jpn_for_zho`, `kor_for_zho`, `por_for_zho`, `por_br_for_zho`, `spa_mx_for_zho`, `ara_for_zho`, `ara_eg_for_zho`, `ara_sy_for_zho`, `deu_at_for_zho` | further for-Mandarin courses | **not built** | course row exists but **0 legos, 1 audio row** — shells only |

### Item 5 — English for Indian-language speakers

| course | what it is | state | blocker if not live |
|---|---|---|---|
| `eng_for_kan` | English for Kannada speakers | **fully live** | — |
| `eng_for_mar` | English for Marathi speakers | **fully live** | — |
| `eng_for_tel` | English for Telugu speakers | **fully live** | — |
| `eng_for_tam` | English for **Tamil** speakers | **beta** | none — 1,421 legos / 55,618 clips |
| `eng_for_urd` | English for **Urdu** speakers | **beta** | none — 1,169 legos / 47,140 clips |
| `eng_for_hin` | English for **Hindi** speakers | **beta** | none — 1,327 legos / 51,279 clips |
| `eng_for_ben` | English for **Bengali** speakers | **beta** | none — 1,323 legos / 49,356 clips |
| `eng_for_guj` | English for **Gujarati** speakers | **beta** | none — 1,445 legos / 53,263 clips |
| `eng_for_pan` | English for **Punjabi** speakers | **beta** | none — 1,323 legos / 51,248 clips |
| `eng_for_sin` | English for Sinhala speakers | **beta** | none — 1,300 legos / 51,473 clips |
| Malayalam, Odia, Assamese, Nepali | English for those speakers | **not built** | no course row exists at all |

**All six languages Aran named — Tamil, Urdu, Hindi, Bengali, Gujarati, Punjabi — are live in beta today**, with full 668-seed content and 47k–56k audio clips each. Alongside them, other Indian-language known-side courses live in beta: `kor_for_hin`, `kor_for_tam`, `zho_for_hin`, `zho_for_tam`.

---

## The three lines

**(a) How many of Aran's five items are fully done — 4 of 5, arguably 5 of 5.**
Items 2, 3, 4 and 5 are done on the "visible to learners" definition. Item 1's four leading candidates are also all in beta — so if "live" means *learners can buy and play it*, **all five are done**. If "live" means specifically `new_app_status='live'` with no beta badge, then **1 of 5 is done** (item 5, partially — only Kannada/Marathi/Telugu carry `live`) and the rest are one flag-flip away. **Kai should get Aran to say which he meant before celebrating.** On the learner-facing reading, yes — celebrate.

**(b) Shortest path to closing the nearest-to-done item.** Item 1. If Aran meant "no beta badge", the whole thing is a single `UPDATE courses SET new_app_status='live'` on `deu_for_eng`, `fra_for_eng`, `por_br_for_eng`, `spa_mx_for_eng` — content and audio are already in place (43k–51k clips each) and they are already serving learners. Nothing needs building. That is a product decision about the beta badge, not an engineering task.

**(c) Where I could not get a definitive answer — three gaps, stated honestly.**
1. **Which four courses Aran meant in item 1.** Nothing in the DB or the repo names a "last 4" set. My reading (deu/fra/por_br/spa_mx) is inference from which majors are absent from the live set, not from data. Ask Aran.
2. **"Live" vs "beta" as Aran uses the words.** The system has two distinct states and both are learner-visible. My whole done/not-done count pivots on which one he means. Ask Aran.
3. **QA health, not checked.** I verified *existence and publication state*, not *quality*. There is no QA-flag table gating publication, so "no outstanding QA flags" is not something I can assert from the DB — and the recent repair work on `deu_for_eng` / `fra_for_eng` seed-1 audio, plus the standing note that `eng_for_mar` lego cards are unreliable, says at least some live courses have known content defects. **A course being `beta` means it is offered, not that it is clean.** If Aran's question is "are they good enough to celebrate", that is a separate audit and I did not run it.

### One thing I found broken, named and not fixed

`courses.status` and `courses.new_app_status` disagree on 5 courses (`kor_for_hin`, `kor_for_tam`, `zho_for_hin`, `zho_for_tam` are `status='draft'` but live in beta; `fra_for_eng` is `status='released'` but only beta). Any tool or report reading `status` will give wrong answers about what is live. Not touched — scout job.
