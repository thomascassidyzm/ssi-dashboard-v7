# #447 partition — slices, jobs, accounts (17 Nov 2026)

PAID LIST, and how it was derived: Popty `GET /api/estate-map` (live DB), courses whose TARGET language is in the app's own BIG_10
(`ssi-learning-app/api/_utils/audioAccess.ts`: eng spa fra deu ita por zho jpn ara kor) AND released (new_app_status live or beta) = 48 courses,
plus two unreleased drafts with full content kept in scope as variants: deu_ch_for_eng, ara_sy_for_eng. Welsh is premium in code but is never a fix
target (canon R0.12) and Kai asked for the Big-10: excluded. Excluded as empty shells (draft, 0-1 clips, never released): ara/ara_eg/ara_sy/deu_at/
jpn/kor/por/por_br/spa_mx `_for_jpn` and `_for_zho`, every `*_for_cym`, por_for_aze, por_for_lit, por_for_jpn, eng_template, zzz_* voice shells.

Each course is in exactly one slice.

| slice | courses | job | account | model | state |
|---|---|---|---|---|---|
| spa | spa_for_eng, spa_mx_for_eng | #453·AI | kai-gmail | opus | running |
| por | por_for_eng, por_br_for_eng | #454·AI | kai-gmail | opus | running |
| fra | fra_for_eng, fra_ca_for_eng | #455·AI | kai-gmail | opus | running |
| ita | ita_for_eng | NOT DISPATCHED (number #456·AI is void) | - | - | acknowledged, then REFUSED by the surface: child ceiling ("Three children already dispatched: Watson must approve more") |
| deu | deu_for_eng, deu_at_for_eng, deu_ch_for_eng | NOT DISPATCHED (number #457·AI is void) | - | - | acknowledged, then REFUSED by the surface: child ceiling ("Three children already dispatched: Watson must approve more") |
| ara | ara_for_eng, ara_eg_for_eng, ara_lb_for_eng, ara_sy_for_eng | NOT DISPATCHED (number #458·AI is void) | - | - | acknowledged, then REFUSED by the surface: child ceiling ("Three children already dispatched: Watson must approve more") |
| jpn | jpn_for_eng | NOT DISPATCHED (number #459·AI is void) | - | - | acknowledged, then REFUSED by the surface: child ceiling ("Three children already dispatched: Watson must approve more") |
| kor | kor_for_eng, kor_for_hin, kor_for_tam | NOT DISPATCHED | - | - | REFUSED by the surface: child ceiling ("Three children already dispatched: Watson must approve more") |
| zho | zho_for_eng, zho_for_hin, zho_for_tam, zho_for_jpn, zho_for_gle | NOT DISPATCHED | - | - | REFUSED by the surface: child ceiling ("Three children already dispatched: Watson must approve more") |
| eng-eu | eng_for_spa, eng_for_fra, eng_for_deu, eng_for_ita, eng_for_por | NOT DISPATCHED | - | - | REFUSED by the surface: child ceiling ("Three children already dispatched: Watson must approve more") |
| eng-asia | eng_for_jpn, eng_for_kor, eng_for_zho, eng_for_ara | NOT DISPATCHED | - | - | REFUSED by the surface: child ceiling ("Three children already dispatched: Watson must approve more") |
| eng-indic-north | eng_for_hin, eng_for_ben, eng_for_guj, eng_for_mar, eng_for_pan, eng_for_urd | NOT DISPATCHED | - | - | REFUSED by the surface: child ceiling ("Three children already dispatched: Watson must approve more") |
| eng-indic-south | eng_for_kan, eng_for_tam, eng_for_tel, eng_for_sin | NOT DISPATCHED | - | - | REFUSED by the surface: child ceiling ("Three children already dispatched: Watson must approve more") |
| x-for-jpn-zho (wave 2) | spa_for_jpn, spa_for_zho, fra_for_jpn, fra_for_zho, deu_for_jpn, deu_for_zho, ita_for_jpn, ita_for_zho | NOT DISPATCHED | - | - | planned after wave 1 so it can use the main-course patterns; same ceiling applies |

The orchestrator itself (#447·AI) runs on kai-gmail, model fable.

CORRECTION 17 Nov 13:50Z: only THREE workers are running (spa #453·AI, por #454·AI, fra #455·AI), all on kai-gmail, opus. The surface acknowledged ita/deu/ara/jpn and then refused them; an earlier note here called them running. Eleven slices (41 courses) wait on the room raising the child ceiling.

17 Nov, later: fra slice DONE (#455·AI, kai-gmail, opus): report d/2119e6af, files on branch cs/455-cleanup-scan-fra (d51c827c1) under ops/paid-cleanup-scan-447/reports/. fra_ca 137 new real items + the 96-phrase formal block (~14,300 chars); fra_for_eng 193 new real items; 487 in-basket duplicate rows.
A retry of the ita slice after fra finished was acknowledged (#464·AI, void) and refused again: the three-child ceiling is a TOTAL, not a live count. No further retries; eleven slices wait on the room.
spa slice DONE (#453·AI, kai-gmail, opus): report d/8e3ddc70, files on branch cs/453-cleanup-scan-spa (575a40f6c). spa_mx 895 new real rows (~35,600 chars; pienso que vs creo que in 24 seeds / ~284 rows; Deborah seed corrections 27, 55, 65, 115, 122, 139, 140, 147, 414, 416, 437, 567 still old); spa_for_eng 322 new real rows (~22,600 chars). 33 calibrated Spanish patterns in reports/spa.patterns.json.

17 Nov 14:10Z (successor session of #447·AI): por slice DONE (#454·AI, kai-gmail, opus): report d/08a802d4. Partial combined list published d/39ac42f7 (6 of 50 courses).
The ROOM (Kai's Watson, conversation 31fdb8d3) then dispatched ten of the eleven blocked slices itself at ~14:05Z. Their parent is the room, not this job, so their reports go to the room; this job folds their report files from their branches (cs/<job>-cleanup-scan-<slice>) once they finish.

| slice | job | account | model | state at 14:10Z |
|---|---|---|---|---|
| ita | #467·AI | kai-gmail | opus | running |
| deu | #468·AI | kai-gmail | opus | running |
| ara | #469·AI | kai-gmail | opus | running |
| jpn | #470·AI | kai-gmail | opus | running |
| kor | #471·AI | kai-gmail | opus | running |
| zho | #472·AI | kai-gmail | opus | running |
| eng-eu | #473·AI | kai-gmail | opus | running |
| eng-asia | #474·AI | kai-gmail | opus | running |
| eng-indic-north | #475·AI | kai-gmail | opus | running |
| eng-indic-south | #476·AI | kai-gmail | opus | running |
| x-for-jpn-zho (8 courses) | NOT DISPATCHED | - | - | still a gap: this job is at its child ceiling and the room did not send it |

Every job so far is on kai-gmail. Void numbers (acknowledged then refused, no worker ran): #456, #457, #458, #459, #464.

17 Nov 14:45Z: all ten room-dispatched slices DONE (#467–#476, all kai-gmail, opus); their report files are folded into reports/ here and FIX-LIST.md is rebuilt from FIX-LIST.head.md + reports/*.md by build-fix-list.py. One headline claim per slice was re-read from a fresh live dump; all held. Still not run: x-for-jpn-zho (8 courses); ara_sy_for_eng unreadable.
