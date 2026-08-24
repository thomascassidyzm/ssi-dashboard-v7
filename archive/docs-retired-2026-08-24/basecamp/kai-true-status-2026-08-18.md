# Kai's Basecamp — true status, 2026-08-18

Every item on your board checked against the **live database and the running learner app**, not against documents. Verdict first, evidence second, what's left third. Same order as Basecamp so you can hold the two side by side.

## The two lines

**18 of your 52 items are finished and just not ticked.** Another 24 are part-done with small, named remainders — so only 8 items are genuinely not started, and 2 can't be settled from here.

**Set the encouragements bar at the March/May batch and it's 30 done, not 18** — twelve republish items were published after that batch and need only a cheap re-export for the final two clips.

## The five things worth doing

1. **Quebec French is one field from live.** Content is finished — 668 seeds, all audio. Set `new_app_status='beta'`.
2. **Spanish has 11 LEGOs with no playable practice at all.** The only substantial content defect on the board.
3. **Dutch legacy export is the one piece of untouched real work** on the republish lists.
4. **Korean seed 181 doesn't exist** — marked released, never decomposed.
5. **Welsh for Yoruba needs one thing:** decompose seeds 11–668. Everything else is downstream of it.

---

## How "live" was decided

Not by `status` and not by `visibility`. The learner catalogue is one filter:
`new_app_status IN ('live','beta')` — `ssi-learning-app/api/courses/available.ts:35`, mirrored by the in-app query.

Same filter at all four call sites: the in-app catalogue (`App.vue:446`), the Browse grid (`BrowseScreen.vue:253`), the course picker (`CourseSelector.vue:373`) and the public API.

Verified against the running system: `GET https://ssi-learning-app.vercel.app/api/courses/available` returns **82 courses** offered to learners today. A course in that list, whose `/round-map` also returns rounds, is genuinely reachable.

Three things follow, and they matter for reading the rest of this page:

- **`visibility` is dead on the learner path.** The column is read *nowhere* in the learning app. A course marked `hidden` is not hidden by that field, and one marked `public` is not published by it.
- **`status` and `released_at` are also unread** by the learner app. `new_app_status` is the whole gate. That is why no course on the estate has `released_at` set and it changes nothing.
- **Content routes are not gated at all.** Round-map and cycles check only that the course code exists. A draft course's content serves fine over HTTP — it simply never appears anywhere a learner can find it. **Live means discoverable, and discoverability is one field.**

Second finding that matters for the Arabic items: `api/_utils/courseBoundary.ts` deliberately stops Lebanese and Egyptian Arabic at seed 300, on your and Tom's decision of 2026-08-04 ("that's an MVP course and that's absolutely fine"). Those courses are not broken past 300; they are capped on purpose.

---

## Build full versions of courses — 2 done, 6 nearly, 1 with real work

**"Full version" means 668 seeds built out into LEGOs**, against the 300-seed MVP tier — confirmed from `services/config/course-modes.json:40-53`. All nine are in the 668 population, so on the build criterion all nine are done. What separates them below is defects.

**One thing to know before reading the gap counts:** a phrase missing audio is *not* a silent slot. The learner walk drops it rather than schedule it, so the effect is a **thinner practice basket**, not silence. What matters is whether a LEGO falls below the methodology minimum, and that is what I measured — not raw counts.

- **French** — **DONE.** 668/668 built with audio, 15,898 phrases, 24 unplayable rows (0.15%, 19 of them component rows), **zero starved LEGOs**. Nothing material left.
- **Spanish** — **PART-DONE, and the only one with substantial work.** 394 phrase rows unplayable, and unlike everywhere else it bites: **11 LEGOs have no playable practice material at all** — I verified this independently and got exactly 11. Three more are thin on authored content before audio even enters it. Left: voice ~394 phrase rows, backfill 3 baskets, render one missing debut clip.
- **Italian** — **PART-DONE (minor).** 71 unplayable rows → 9 LEGOs below the USE minimum. A separate 85 LEGOs lack a linked presentation clip, but **the clips all exist** and the player backfills at runtime — a bookkeeping gap, not missing audio. Left: 71 phrase renders.
- **Portuguese** — **PART-DONE (minor).** 27 unplayable rows → 2 LEGOs below minimum. Has a **genuine unfulfilled audio pass** queued 2026-08-06: 4 learner-reachable clips to re-render. Left: those 4, plus 27 phrase rows.
- **German** — **PART-DONE (audio only).** The cleanest content of the nine — **zero** unplayable phrase rows. But a **pending audio pass of 12 clips** (queued 2026-08-11) and **3 LEGOs whose presentation clip does not exist anywhere**, so those 3 intro cards never play their "The German for X is…". Left: 12 re-renders, 3 presentation clips.
- **Mandarin** — **PART-DONE (minor).** 150 unplayable rows → 1 LEGO below minimum. Two LEGOs are thin on *authored* content, not audio — one has a single USE phrase. Left: backfill those 2, voice 150 rows.
- **Korean** — **PART-DONE, one real hole.** **Seed 181 does not exist as teaching content** — "but I have to take my mother to the doctor" is marked released but was never decomposed: 0 legos, 0 phrases, absent from the round map. I confirmed this directly against seeds 180 and 182, which are both present. It doesn't stall playback; the map skips it. Left: decompose and build seed 181, 52 phrase renders, and clear 147 stale flags whose stated cause is already resolved.
- **Japanese** — **DONE.** 668/668, **zero** unplayable phrase rows, zero starved LEGOs, zero unlinked presentations. The cleanest of the nine. Nothing left.
- **Arabic (MSA)** — **PART-DONE.** Content complete: 668/668, 17 unplayable rows → 1 LEGO below minimum. Left: 17 phrase renders, plus the proofread question below.

**An honest gap on Korean and Arabic.** Their seed approvals stop dead at *exactly* seed 300 — the MVP boundary. That is the fingerprint you'd expect if the final pass ran over the MVP tranche and was never re-run after the extension to 668. But it is suggestive, not proof: `course_seeds` records no approver and no proofread event, and the bulk-approve route can stamp hundreds of seeds without a human reading one — so a *high* count proves nothing either, in any of the nine. **No table on this estate distinguishes "reviewed and passed" from "bulk-stamped."** If Korean and Arabic need a human proofread of 301–668 before you tick them, the database cannot make that call for you.

## 4 x-for-Mandarin courses — all four DONE

All four are built to 300 seeds, every lego and every practice phrase has target audio (zero holes), and all four answer live to a learner right now.

- **Spanish for Mandarin** — **DONE.** Live to learners as `beta`; 300/300 seeds built, 4,733 phrases all with audio, round-map returns 574 rounds. Nothing left.
- **French for Mandarin** — **DONE.** Live as `beta`; 300/300 seeds, 5,633 phrases all with audio, 576 rounds served. Nothing left.
- **German for Mandarin** — **DONE.** Live as `beta`; 300/300 seeds, 5,539 phrases all with audio, 611 rounds served. Nothing left.
- **Italian for Mandarin** — **DONE.** Live as `beta`; 300/300 seeds, 5,073 phrases all with audio, 595 rounds served. Nothing left.

The only judgement call: all four are at `beta`, not `live`. If "done" for you means promoted to `live`, that is a one-field change per course and nothing else — the content and audio are complete.

---

## Welsh for Yoruba — the hard part is done, the course is parked right after it

The headline: **the seed corpus is finished and genuinely good** — 668 real Yoruba↔North Welsh pairs, no placeholders, no English leakage. The expensive part is behind you. Everything else is blocked on one step.

- **Content imported to popty** — **DONE.** 668/668 seeds, numbers 1–668 contiguous, zero empty on either side, zero English placeholders, zero rows where known equals target. Known side is real Yoruba (625 rows carry ẹ/ọ/ṣ); target side is real North Welsh matching the North Welsh register. **Tick it.**
- **seeds finished** — **PART-DONE.** All 668 are authored, but only seeds 1–10 are promoted to `released`; 658 sit at `draft`. One real defect: **seeds 68 and 194 have the identical Yoruba prompt `Kí ni o ń wá?` mapping to two different Welsh targets** — I verified this directly. Same known → two targets is a ZUT reject. **Fix it before decomposition runs**, because editing seed text later nulls audio links.
- **seeds proofread** — **NOT STARTED.** Zero of 668 approved, zero flagged, and every signoff and QA table is empty for this course. Calibrated against Finnish, which has 103 approvals — so the marker is live and in use, it just hasn't been used here.
- **content finished** — **PART-DONE, about 1.5%.** 28 legos and 194 phrases, and both **stop dead at seed 10**. Left: seeds 11–668 — 98.5% of the decomposition and phrase work.
- **content proofread** — **NOT STARTED.** Nothing to proofread yet; QA gate unpassed, zero rounds.
- **voices recorded/generated** — **NOT STARTED.** `voice_config` is literally empty and no voice pool is set — **no voices are even cast**, let alone rendered. Zero audio rows.
- **welcomes/encouragements added** — **NOT STARTED, and this one has a long lead time.** Encouragements are per *known* language, so this course needs **Yoruba** ones. `shared_audio` holds encouragements for 70 languages and **Yoruba is not among them** — I confirmed zero rows. This doesn't depend on the decomposition, so it can start today.
- **tested in stage** — **NOT STARTED.** Not export-ready, absent from the round index entirely, nothing playable to stage.
- **live!** — **NOT STARTED.** `new_app_status='not_available'` — not reachable by any learner.

**What actually unblocks it:** decomposition of seeds 11–668. Stages 4 through 9 are all downstream of that one gap. The Aug-15 timestamps show seeds 1–10 were built in a 17-second burst — a pipeline run that started and stopped, not a hand-build that ran out of road. Two things can run in parallel today: casting voices, and getting Yoruba encouragements written.

## English-for-x priority — seven DONE, one all-but-one-seed

Every one of these is reachable by a learner today and has **zero** legos and **zero** practice phrases missing target audio.

- **English for Japanese** — **DONE.** Live as `beta`; 300/300 seeds, 10,770 phrases all with audio, 675 rounds served. Nothing left.
- **English for Chinese** — **PART-DONE.** Live as `beta`, 500 rounds served, 5,092 phrases all with audio — but **299 of 300 seeds are built, not 300**. Seed 189 ("是的，好主意" / "Yes that's a good idea") has no legos at all. What's left: build seed 189, or accept a 299-seed course.
- **English for Korean** — **DONE.** Live as `beta`; 300/300 seeds, 5,406 phrases all with audio, 543 rounds served. Nothing left.
- **English for French** — **DONE.** Live as `beta`; 300/300 seeds, 6,325 phrases all with audio, 637 rounds served. Nothing left.
- **English for German** — **DONE.** Live as `beta`; 300/300 seeds, 5,880 phrases all with audio, 602 rounds served. Nothing left.
- **English for Spanish** — **DONE.** Live as `beta`; 300/300 seeds, 5,800 phrases all with audio, 600 rounds served. Nothing left.
- **English for Arabic** — **DONE.** Live as `beta`; 300/300 seeds, 5,920 phrases all with audio, 589 rounds served. Nothing left.
- **English for Italian** — **DONE.** Live as `beta`; 300/300 seeds, 5,661 phrases all with audio, 594 rounds served. Nothing left.

---

## The three empty lists

- **Profion ieithoedd lleiafrifol yr Eidal** (tests of Italian minority languages) — **NOT STARTED, and the list is empty so nothing is being tracked.** For reference, none of Friulian, Lombard, Neapolitan, Sicilian, Venetian, Romagnol or Romansh is reachable by a learner; all are `draft`/`hidden` with only 10–30 seeds built out of 668 and no audio at all. Real early-stage exploration, not a testing programme yet.
- **English for Indian languages** — **the list is empty, but the work is largely DONE.** Ten courses exist and all ten are reachable by learners today: Kannada, Marathi and Telugu at `live`; Hindi, Bengali, Gujarati, Punjabi, Tamil, Urdu and Sinhala at `beta`. Nine of the ten are built to the full 668 seeds with complete audio. This list understates reality more than any other on the board.
- **Fixes anthem-4-Japaneeg** — **empty list, and the course it refers to looks complete.** The Welsh anthem course for Japanese speakers is `released`, 7 seeds, 27 legos and 147 phrases, all with audio, no holes. Note it is **not** in the learner catalogue (`new_app_status=not_available`), so whether it counts as shipped depends on how anthem courses are meant to be delivered — I could not settle that.

---

## Ychwanegu tafodieithoedd arabeg — two live, one rename nearly done

Both Arabic dialects are **live and playable right now**, deliberately capped at 300 seeds. That cap is not a fault: `api/_utils/courseBoundary.ts:45` hard-codes both to `MVP_MAX_SEED = 300`, recording Tom's 2026-08-04 decision — *"we'll just stop at 300 seeds. That's an MVP course and that's absolutely fine."* Lifting either to the full 668 is one line in that file, once the audio exists.

- **Arabic (Lebanon) for English live** — **DONE**, as a 300-seed MVP. In the live catalogue at `beta`; round-map serves 638 rounds; cycles endpoint serving. Below seed 300 it is clean — **zero** phrases missing audio. Nothing left to make it live. To lift it past 300: 886 legos from seed 301 on have no presentation audio and 6,852 phrases sit past the wall.
- **Arabic (Egypt) for English live** — **DONE**, as a 300-seed MVP. In the live catalogue at `beta`; round-map serves 683 rounds. Nothing left for "live". One small real gap worth closing regardless: **28 phrases inside seeds 1–300 have no audio** — inside the stretch learners actually play.
- **Arabic (MSA) renamed** — **PART-DONE.** The DB reads "Modern Standard Arabic for English Speakers" and the **live API returns exactly that string**, so the learner-facing rename has landed. Content is complete: 668/668 seeds and legos with audio, 1,370 rounds served. Left: three hard-coded `'Arabic'` labels still stale — `packages/core/src/courses/displayName.ts:25` (which names the Browse *group header* over all three Arabic courses), plus `teacherCourses.ts:42` and `PodStageAuditioner.vue:96` on the teacher/admin side. **What it was called before could not be established** — the audit log only reaches back to 2026-07-03 and the course was created 2026-02-12, so the rename predates the record.

## Ychwanegu tafodieithoedd ewropeaidd — two live, one is a single field away

- **Mexican Spanish for English speakers live** — **DONE.** Live at `beta`, 1,290 rounds to seed 668, uncapped, 668/668 legos with audio. Nothing left.
- **Quebecois French for English speakers live** — **NOT STARTED as "live" — but the content is finished.** It is absent from the live catalogue purely because `new_app_status='draft'`. Yet the server already returns 1,351 rounds to seed 668 and real cycles: 668/668 legos with audio, 12,834 of 12,887 phrases with audio. **The single remaining action is to set `new_app_status = 'beta'`.** That one field flips it live — `visibility='hidden'` and `status` are not read by the learner app at all. This is the biggest gap between the board and reality on the page.
- **Brazilian Portuguese for English speakers live** — **DONE.** Live at `beta`, 1,424 rounds to seed 668, uncapped, 668/668 legos with audio. Nothing left.

## Ail-gyhoeddi pob cwrs efo'r anogiadau newydd — 12 substantially done, 1 real job, 2 unknown

**What the new encouragements are.** The legacy manifest reads encouragements from `shared_audio`, per *known* language, not per course (`services/phases/generate-legacy-manifest.cjs:274-281`). Two waves landed: the substantive set of 48 (English 2026-03-11; Spanish, Arabic, Japanese and the rest 2026-05-01), then a top-up to 50 on 2026-07-06/07. All 70 languages now hold 50 each. The old set is the 26 human recordings by Aran still sitting in `course_audio`.

**What republish means.** Generate the legacy manifest, then `publish-manifest-service.cjs` writes `{id}.json` into the `course-configs` repo. Progress is recorded in `course_export_states` — that table is the ledger, and it is what I used.

**Two things that change the answers, and only you can settle them:**

1. **Where you set the bar.** Twelve of these were published *after* the 48-clip set but *before* the +2 top-up. If "the new encouragements" means the big batch, those twelve are done. If it means all 50, none are and each needs one cheap re-export. **Nothing in the estate has been published since 2026-06-02** — I confirmed that against the ledger.
2. **Whether "published" means shipped.** `publish_apidev_filename` is **NULL on all 29 ledger rows** — I verified this directly. So every publish recorded here means "written into course-configs on your Mac", not "live on the legacy app". If the SCP to apidev is the real go-live step, nothing on this box shows it has ever run, for any course. That would turn all 16 into "staged, not shipped".

Verdicts below assume bar #1 = the 48-clip set. Course mappings marked (obs) are confirmed by the filename in the ledger; (inf) are inferred from the naming rule.

- **en-ar** (Modern Standard Arabic) — **PART-DONE.** Published 2026-05-18, v3.1.1, audio deployed — after the English set. Left: re-export for the final 2 clips.
- **en-de** (German) — **PART-DONE.** Published 2026-05-19, v7.2.1, audio deployed. Left: re-export for the last 2.
- **en-it** (Italian) — **PART-DONE.** Published 2026-05-19, v5.1.1, audio deployed. Left: re-export for the last 2.
- **en-pt** (Portuguese) — **PART-DONE.** Published 2026-05-15, v5.2.3, but **audio deploy not recorded**. Left: the 2 clips *and* an audio deploy.
- **en-cmn** (Mandarin) — **PART-DONE.** Published 2026-05-18, v5.0.2, audio deployed. Left: re-export for the last 2.
- **en-es** (Spanish) — **CAN'T TELL.** There is **no row for Spanish in the ledger at all**. The flagship course has no recorded export or publish, ever. Could mean never republished, or republished before the ledger existed. Settling it needs a look at `course-configs/Courses/en-es.json` — outside this workspace.
- **en-fr** (French) — **PART-DONE.** A manifest was **generated 2026-05-28 and never published** — `manifest_published` is false, version NULL, no path. Left: the publish step itself, then the +2 refresh. This is the one item where the work stalled halfway.
- **en-ja** (Japanese) — **PART-DONE.** Published 2026-05-19, v4.2.0, audio deployed. Left: re-export for the last 2.
- **en-pt-br** (Brazilian Portuguese) — **PART-DONE.** Published 2026-05-15, v2.0.2, **audio deploy not recorded**. Left: 2 clips + audio deploy.
- **en-fr-ca** (Quebec French) — **PART-DONE.** Published 2026-05-15, v2.0.2, **audio deploy not recorded**. Left: 2 clips + audio deploy.
- **en-es-mx** (Mexican Spanish) — **PART-DONE.** Published 2026-05-18, v2.1.0, audio deployed. Left: re-export for the last 2.
- **en-ko** (Korean) — **CAN'T TELL.** **No row in the ledger**, same gap as Spanish. Needs a look at `course-configs/Courses/en-ko.json`, outside this workspace.
- **ar-en** (English for Arabic) — **PART-DONE.** Published 2026-05-20, v3.0.0, audio deployed — after the Arabic set of 2026-05-01. Left: the 2 Arabic clips from 07-07.
- **es-en** (English for Spanish) — **PART-DONE.** Published 2026-05-30, v3.0.0, after the Spanish set. **Audio deploy not recorded.** Left: 2 clips + audio deploy.
- **ja-en** (English for Japanese) — **PART-DONE.** Published 2026-06-02, v4.0.0 — the most recent publish anywhere in the estate. **Audio deploy not recorded.** Left: 2 clips + audio deploy.

## Legacy Manifest Export

- **Dutch_for_English** — **NOT STARTED.** Published 2026-02-06 at v1.0.1 — over a month *before* the English encouragements existed in `shared_audio` at all (first row 2026-03-11). The live `en-nl.json` cannot contain any of the new set; the course still shows the 26 old human recordings. Left: a full export, publish and audio deploy. **This is the one unambiguous piece of real work on either list.**

---

# Course Production | Native Clients (second project)

**Most of this board cannot be answered from here, and that is the honest finding.** Nineteen of its 26 unticked items are implemented in `saysomethingin/course-production-native-clients`, a repo outside this workspace. Its vocabulary — nodes, GrabBag, belt celebrations, limit profiles — has no counterpart anywhere in Popty's schema. Mapping our coverage numbers onto those check names would be inventing a correspondence, so those items are marked CAN'T TELL rather than guessed.

**Translate practice phrases into source language — all three DONE.**
- **Sinhala** — **DONE.** 11,719 phrases, 100% carrying Sinhala script, none empty. One defect: **7 phrases at seed 226 have untranslated English determiners** on the Sinhala side (`the මිනිහා`, `a මිනිහා`, `that මිනිහා` and 4 built on them).
- **Tamil** — **DONE.** 12,577 phrases, 100% Tamil script, zero Latin contamination, zero gaps.
- **Mandarin** — **DONE for the built course.** 5,092 phrases, 100% Han script. All 668 seeds have Chinese known-side text, but only 300 are released — 368 remain draft with no legos or phrases.

**Recording / Creating sounds — two DONE, one PART-DONE.** Verified by joining to `course_audio` and checking each clip's actual language, not merely that a link existed.
- **Sinhala** — **DONE.** 11,719/11,719 target clips, 11,718/11,719 known clips. One phrase missing its known-side clip.
- **Tamil** — **DONE.** 12,577/12,577 both sides, legos and seeds complete. Zero gaps.
- **Mandarin** — **PART-DONE.** Complete across the 300 released seeds. 40 of the 368 draft seeds have no Chinese clip, and the draft tail has nothing to record yet.

**Stocktake — "rework encouragements to remove implementation specifics" is PART-DONE.** All 3,455 encouragement texts across 70 languages were scanned for UI and product references (button, tap, screen, download, "the app", CD, track/lesson numbers, SSi). **Zero true hits** — every raw match was a substring inside a non-English word. The Popty corpus is clean. If the item means encouragements embedded in the native client apps, that's out of scope. The other four Stocktake items are CAN'T TELL.

**Bulk production of practice phrases — length variation PART-DONE, edge variation CAN'T TELL.** Phrase length is already broadly and smoothly varied on all three courses. "Edge variation" is undefined in every readable Basecamp artefact, so it was not guessed at.

**Course materials consistency checks — all 13 CAN'T TELL.** Out of workspace scope, wholesale.

**Parse XLSX Files** — empty list; the board's one message announces `xlsx2tsv` complete at tag 0.1.0. That confirms the announcement, not the code — the repo is out of scope.

---

# Gaps — what could not be settled, and why

Five things the data genuinely cannot answer. Each is a real answer, not a failure:

1. **Spanish and Korean legacy republish (en-es, en-ko)** — no row in the export ledger at all. Needs a look at `course-configs/Courses/en-es.json` and `en-ko.json`, which live on your Mac, outside this workspace.
2. **Whether any legacy publish ever reached apidev** — `publish_apidev_filename` is NULL on all 29 ledger rows. If that SCP is the real go-live step, nothing here shows it has ever run, for any course.
3. **What Modern Standard Arabic was called before the rename** — the audit log starts 2026-07-03; the course was created 2026-02-12. The rename predates the record.
4. **Whether Korean and Arabic seeds 301–668 were ever proofread** — no table on this estate distinguishes "reviewed and passed" from "bulk-stamped", because the bulk-approve route stamps hundreds of seeds without a human reading one and no approver is recorded.
5. **Nineteen of 26 Native Clients items** — implemented in a repo outside this workspace.

Basecamp reads all succeeded (todos, messages, docs on both projects). Hill charts were not attempted — known not to return through the API.

**Method.** Every figure above came from read-only queries against the live Supabase database, plus live HTTP probes of the running learner app at `ssi-learning-app.vercel.app`. No writes, no audio generation, no spend. Where a worker's claim drove a real decision — the Spanish starved baskets, the Korean seed hole, the export ledger, the Yoruba ZUT collision — it was re-verified independently before landing here.
