# Irish (gle) course — state of play, 2026-08-17

Scouted live for Kai, ahead of answering Justin. Every number below is from the live
Supabase DB read today, not from docs. Where a fact could not be reached, it is named as
a gap rather than inferred around.

---

## 1. The answer first: yes, it is in use — and Irish is one of our most-used courses

**`gle_for_eng` is the 3rd most-enrolled course on the whole estate** — 102 enrolments,
behind only `eng_for_hin` (225) and `jpn_for_eng` (165), ahead of Northern Welsh (87).
93 courses have any enrolments at all.

These are **real learners, not testers.** The split is unusually clean:

| | learners | practice minutes | practised ≥10 min | practised ≥1 hour |
|---|---|---|---|---|
| Enrolled in only 1–3 courses (**real learners**) | **83** | **10,189** | 73 | 56 |
| Enrolled in ≥10 courses (internal / tester pattern) | 9 | 44 | 3 | 0 |
| All Irish enrolments | 102 | 10,238 | 76 | 56 |

The people who hop across ten-plus courses account for **44 minutes out of 10,238 —
0.4%.** 78 of the 102 learners are enrolled in Irish and nothing else. This is not our
own staff clicking around.

**Depth and recency:**

- **252.4 hours** of recorded session time across **1,153 sessions**, 97 distinct learners.
- Median session **13.8 minutes**; 918 of 1,153 sessions ran longer than 2 minutes.
- Longest single session: 4h 21m.
- **Last 30 days: 49 learners, 150 sessions, 44.4 hours.**
- Last 60 days: 77 learners, 494 sessions, 120.6 hours.
- Last 90 days: 89 learners, 833 sessions, 188.3 hours.
- **45 learners have a last-practised date in August 2026**; 33 more in July.
- Most recent activity: **2026-08-16**, yesterday.
- Learner-side play events: 11,846 since 2026-04-20, 90 distinct users; top countries
  GB 3,168 / DE 2,988 / **IE 2,111** / US 904. 73% of play is on mobile.

**How far they get:** deepest learner has completed **seed 39 of the 300 built**; the
median learner who has any progress sits at **seed 10**. So real usage is concentrated in
the opening stretch of the course — which is exactly the stretch a new tester would also
see, and exactly where a proofreader's time buys the most.

**One honest caveat on the last ten days.** Irish logged **zero play events from 8 to 15
August**, then 79 on the 16th. Estate-wide traffic in that same window was heavy
(54,674 events), but it is spread across `fra_for_eng`, `zho_for_eng`, `cym_n_for_eng`,
`swe_for_eng` and others under active audio work — so that ramp looks like our own
verification sweeps, not learners, and it is **not** a like-for-like comparison. What is
solid: Irish has a real, continuous learner population through July and into August, with
a quiet patch in the second week of August.

**Is it flagged beta?** In the data, yes: `status = beta`, `new_app_status = beta`,
`visibility = beta`, beta started **2026-06-23**, `released_at` null, pricing tier `free`.

**But a learner barely sees it — and an enrolled learner sees nothing at all.** Traced
through the app: the only learner-facing marker is a bare **`β` glyph** at
`BrowseScreen.vue:639` and `CourseSelector.vue:607`. Both are `v-else-if`, so **the badge
disappears the moment a learner enrols.** There is no banner and no wording anywhere, and
`courses.visibility = 'beta'` is read by nothing in the app. So if Justin signs up, he will
be told the course is beta by *us*, in the email — not by the product.

---

## 2. Old vs new

| | Old Irish course | New Popty course (`gle_for_eng`) |
|---|---|---|
| Where it lives | `course-configs` repo — **NOT reachable from this workspace** | live Supabase, `courses.course_code = 'gle_for_eng'` |
| Authored by | a **native Irish speaker**, seeds-and-legos, partly proofread by her | machine pipeline: `quality_rules.calibrated_by = "golden_builder"`, 10 golden seeds, calibrated **2026-02-18**. All 668 seed rows share **one identical `created_at`: 2026-02-17T20:20:53Z** — a single batch write |
| Content built | not measurable from here | **300 seeds built** (legos run to `S0300L03`), 943 legos, 5,975 practice phrases |
| Seed corpus present | — | 668 seed rows exist; **seeds 301–668 are unbuilt raw corpus**, not course content. (`courses.seed_count` says 300 — the row count and that field disagree, a known estate trap.) |
| Seeds approved | — | **0** — no seed in the course carries an `approved_at` |
| Audio | unknown from here | **25,308 clips**, all with a duration; known 7,520 / target1 7,282 / target2 6,552 / presentation 1,335, plus 2,542 pod clips |
| Audio generated | — | bulk in **Feb 2026** (17,893 clips), topped up through Aug 2026 |
| Voices | unknown | Azure **`ga-IE-OrlaNeural`** (f) and **`ga-IE-ColmNeural`** (m); English side Azure `en-GB-SoniaNeural`. Target speed 0.8–0.85 |
| Recorded human final pass | she proofread part of it | **none recorded** — see below |
| Last content change | — | **2026-08-16**, 15:18 UTC (`content_stamp`); audio stamp 2026-08-14 |
| Plays in the app | — | yes: 786 rounds in `course_round_index`; **25 of 25 sampled clips played through the real learner endpoint** |
| Audio integrity | — | **0 broken links** of 18,710 references; **2 wrong-voice clips of 22,080**, 0 wrong-role; target1 100% Orla, target2 100% Colm; presentation covers 786/786 served rounds |
| **Rounds with no practice phrases of their own** | — | **399 of 786 — 50.8%.** Peer courses `dan_for_eng` and `ell_for_eng` both measure **0.0%** |

### The new course is a generation from the shared English corpus — measured, not inferred

The single most decisive number found: comparing the Irish **known side** seed-by-seed
against other courses' known side —

| compared against | seeds with byte-identical `known_text` |
|---|---|
| `fin_for_eng` (Finnish) | **556 of 668 — 83%** |
| `spa_for_eng` (Spanish) | 532 of 668 — 79% |
| `cym_s_for_eng` (S. Welsh) | 314 of 668 — 47% |

The residual differences are cosmetic — seed 1 is "I want to speak **Irish** with you now"
where Finnish says "…**Finnish**…". A course authored seeds-and-legos by a native Irish
speaker would not share 83% of its prompts verbatim with Finnish. Together with
`golden_builder` calibration, zero approvals, and one batch `created_at`, the February 2026
build was **generated from the estate's shared English seed corpus**, and that is what
stands in production today.

**There is no Irish human audio at all.** Of 25,308 clips, 75 have a non-TTS origin — and
all 75 are **English** narration (48 instruction, 26 encouragement, 1 welcome, the shared
English voice-over). Irish-language clips with a non-TTS origin: **0**. `recording_provenance`
rows for anything Irish: **0**. Irish clips created before 2026-02-01: **0**.

**The one finding that speaks directly to Kai's worry.** 68 of our 145 courses carry a
recorded final quality pass (`quality_rules.final_pass_completed`) — Brazilian Portuguese,
for instance, records a final pass dated 2026-07-16 covering seeds 4–300, 153 phrase
deletions and a written lessons-learned list. **Irish is not one of the 68.** Its
`quality_rules` holds only pipeline timestamps and 10 golden decompositions. Even
Scottish Gaelic (`gla_for_eng`) has one; even `zho_for_gle`, a 5-seed stub, has one.

So: the new Irish course is our 3rd most-used course, and it is the most-used course on
the estate with **no recorded human final pass**. The native-built old course was the only
Irish content that ever had native review, and from here we cannot see it at all. That is
the gap Justin's wife would be filling — not duplicating.

**Measured quality signals on the new course** (methodology, not grammar — no Irish
grammar judgement is offered here, and none should be read into it):

- An estate-wide **ZUT / untaught-vocabulary audit** ran against live `gle_for_eng`. It
  produced **106 residue candidates across 26 distinct words**; 60 were adjudicated
  against the DB: **35 confirmed real untaught-word defects** (19 distinct words, at seeds
  12, 13, 14, 15, 21, 65, 69, 79, 85, 89, 93, 103, 155, 159, 198, 200), 6 real-candidates
  needing a human eye, 19 false positives (Irish inflected prepositional pronouns — `léi`,
  `aici` — which the detector cannot see through).
  - The confirmed words include very ordinary ones: `sin`, `caint`, `áit`, `teanga`, `dul`,
    `siad`, `anseo`, `fhios`, `roimh`. **Ten of the sixteen affected seeds are below seed
    22** — i.e. inside the stretch where nearly every real learner currently is.
  - Artefacts: `.a108-zut/verified-gle_for_eng.json`, `.a108-zut/residue-gle_for_eng.json`.
- A **pod-LEGO inventory triage** examined all 43 `needs_review` units from the pod-0
  extractor: 21 keep-as-is, 13 remap, 5 needs-note, 4 split
  (`docs/pods/inventory-triage-gle.md`).
- An **A-108 Celtic pass** (2026-08-14) examined 117 staged Irish drafts and made **zero
  changes** — annotations clean, gender structurally inapplicable, and it recorded a
  useful linguistic finding: Irish `tú`/`sibh` is number only, so there is no T-V register
  rule to apply (`docs/a108/celtic-cym_s-cym_n-gle-2026-08-14.md`).
- No open audio defects surfaced: 0 clips with a null duration.

**The practice layer is about half built — this is the biggest honest gap in the course.**
399 of 786 learner-facing rounds (**50.8%**) have no practice phrases of their own; the
median round has zero. Comparable 300-seed courses `dan_for_eng` and `ell_for_eng` both
measure **0.0%**. Those rounds still *play* — they serve an intro plus spaced review of
earlier material (traced in `cycles.ts:773-860`) — so this is **thinness, not breakage**,
and no learner walks off the end into silence: the round map stops cleanly at seed 300.
But it is the honest answer to "is it finished?": the seeds and audio are complete, the
practice is half there.

Against that, the audio layer is genuinely solid: **0 broken links across 18,710 audio
references**, every one resolving to a real file with a non-zero duration; **2 wrong-voice
clips out of 22,080** and none wrong-role; target1 100% Orla, target2 100% Colm; and 25 of
25 sampled clips played through the real learner endpoint.

**"0 open QA flags" should not be read as "nothing is wrong."** All 43 flags ever raised are
resolved (41 of 43 fixes verifiably stuck; 2 residual instances of one capitalisation
pattern remain at seeds 285/286) — but **nothing has looked at this course since
2026-02-18.** Zero open flags here means no reviewer, not a clean bill.

Two further measured items, neither Irish-specific: **30 English prompt clips voice their
grammatical gloss aloud** — `text_stripped` reads `that rel`, `time genitive`, `hit past` —
reaching 14 served rounds. `dan_for_eng` has 28 such rows and `fin_for_eng` 40, so this is
an estate-wide authoring pattern, not an Irish defect.

**We have already asked for exactly what Justin is offering — in writing, twice.** These
are our own notes, not an outside opinion:

- `docs/a108/celtic-cym_s-cym_n-gle-2026-08-14.md:130` — **"do not record gle pod-0 until a
  native Irish speaker reads the 117 drafts."** Line 89 of the same doc: *"explicitly not
  confident enough to rewrite Irish to native standard myself."* Irish pod recording is
  therefore **already blocked on a native reader**.
- `docs/pods/inventory-triage-gle.md` flags specific suspected-broken Irish in the current
  build for a native check: `"i do dhíol"` for *pleased to meet you* (expected *deas
  bualadh leat*), `"scéim ghréine"` for sunscreen (*scéim* = scheme), and missing eclipsis
  in `"An féadfainn…?"` / `"An féadfá…?"`. Reported here as our own flags, unadjudicated —
  they are precisely the class of thing only a native ear settles.

**On dialect.** Two facts, both hard:

1. The course targets **`ga-IE` generically**. Both target voices are the only two Azure
   Irish neural voices that exist, Orla and Colm. Azure ships no dialect variants, so a
   Connacht / Munster / Ulster split **cannot** be done with our current TTS — it requires
   voice actors, exactly as Kai is thinking.
2. **The word "dialect" is unmodelled in our estate.** A case-insensitive grep across both
   repos for Connacht, Connemara, Conamara, Munster, Ulster, Gaeltacht and Donegal returns
   **zero hits** in either repo — no config, no doc. `recording_provenance` *does* have
   `speaker_dialect` and `speaker_region` columns, and estate-wide the count of rows with
   `speaker_dialect IS NOT NULL` is **0** — the columns exist and have never been used.
   `courses.voice_pool_key` is null for `gle_for_eng`, and its `voice_config` has not been
   touched since **2026-02-18T12:14Z**. The two-voice pair is also locked for pods:
   `docs/pods/t21-casting-rulings-2026-08-17.md:117` — "Irish | `gle` | APPROVED | Colm (m,
   azure) + Orla (f, azure) | ear-verified". A voice census over 6,000 sampled Irish clips
   finds those two voices and nothing else. The good news: the machinery for regional
   variants landed last week —
   a regional variant now gets a voice-pool key and holds its own pod cast rather than a
   new `target_lang` (commits `5e2e0d29`, `68275529`, `docs/DECISIONS.md`). So the rail
   exists; nothing Irish is on it yet.

---

## 3. What we could honestly tell Justin

All of this is defensible from the data:

- "The Irish course is **live and in beta** — flagged beta since 23 June 2026, free, not
  formally released."
- "It is genuinely being used: **around 83 real learners**, 252 hours of practice, 49 of
  them active in the last 30 days, most recently yesterday. It is our third most-enrolled
  course."
- "It is **300 seeds built** with full audio — 25,308 clips — voiced by the two Azure Irish
  voices, Orla and Colm. It is not a sketch; it is a complete 300-seed course, and the audio
  layer verifies clean: no broken links in 18,710 references, 2 wrong-voice clips in 22,080."
- "The honest incompleteness: **about half the rounds (399 of 786) have no practice phrases
  of their own** and lean on review of earlier material. They play, but they are thin.
  Comparable courses measure zero. If he tells us the course feels repetitive in places, he
  will be right, and we already know why."
- "One practical warning worth giving him explicitly: **the product will not tell him it is
  beta once he enrols** — the only beta marker is a small `β` on the course-picker that
  disappears after sign-up. He should hear 'beta' from us."
- "It is **updated continuously, but by machine.** Content last changed yesterday
  (16 Aug); audio two days before that. What it has *never* had is a human native-speaker
  final pass — 68 of our 145 courses have one recorded, and Irish is not among them."
- "That is exactly why a native proofreader is valuable rather than redundant. Our own
  automated audit has already confirmed **35 places where a word is used in practice
  before it is taught**, 10 of them in the first 22 seeds — the stretch where almost every
  current learner is sitting. Those are findable by machine. What only a native ear finds
  is whether the Irish reads naturally, and that is the part we cannot self-certify."
- "Present dialect: **standard `ga-IE`**, not a regional variant. If dialect versions
  happen they will need human voice actors, because our TTS provider offers no Irish
  dialect voices."
- And the strongest thing we can say to him, because it is our own standing note rather
  than flattery: **our Irish pod recording is already blocked, in writing, on a native
  Irish speaker reading 117 drafts.** His wife would not be a nice-to-have review — she
  would unblock work we have deliberately stopped.

What we should **not** say: that the new course matches the quality of the older
native-built one. We cannot see the old course from the production side at all, so we have
no basis for that claim either way — see the gap below.

**Two things worth deciding, given the numbers:** real learners are clustered in seeds
1–39, so a proofread that starts at seed 1 lands where it matters most and needs nowhere
near 300 seeds to be worth doing. And a native proofreader's verdicts would be the first
human quality record this course has ever carried.

---

## 4. Gaps — named, not papered over

1. **The `course-configs` repo is outside this workspace and was not read — but we now know
   exactly where the old course is.** Two pointers in our own code prove it exists:
   `tools/sync/publish-to-course-configs.cjs:37` publishes to
   `$HOME/Documents/GitHub/course-configs`, `Courses/{course_id}.json`, branch **`author`**;
   and `database/lib/import-legacy-course-core.cjs:29` carries the alias
   **`'en-ga': 'gle_for_eng'`** (added 2026-01-10, commit `be648a98`, whose message names
   "Fix missing 'en-ga' alias"). So the target artefact is
   **`Courses/en-ga.json` on branch `author`** — and not one byte of it was readable. The
   clone is **not on this machine** (`$HOME/Documents/GitHub/course-configs` absent; no
   `course-configs` checkout anywhere under `/home/tomcassidy`). Everything about the old
   course's seeds, legos, proofreading state and audio UUID mapping is behind that wall.
   **Closing it needs Tom to widen scope, or Kai to hand over that one file.**
   Corroborating the wall from the other side: **zero** legacy Irish content artefacts exist
   in either repo's full git history — all 15 `gle`-named files ever added are dated
   2026-08-04 to 2026-08-15 and Popty-era. Legacy VFS manifests exist for
   `spa_for_eng`/`cmn_for_eng`/`bre_for_eng`/`ita_for_eng` — **never** for `gle`. The live DB
   holds exactly two Irish-involved course rows (`gle_for_eng`, `zho_for_gle`); there is no
   archived, duplicate or `_old` Irish course row. `legacy_app_status` for `gle_for_eng` is
   **`not_available`**. The old course is not "undone" in the production estate — it was
   never in it.
2. **S3 was inventoried — the old course's audio is *probably* still on the bucket, but
   unidentifiable.** Bucket `ssi-audio-stage` (eu-west-1) has no per-course or per-language
   prefix; keys are flat UUIDs. Probes for `gle/`, `irish/`, `gle_for_eng/`, `courses/`,
   `legacy/` all returned **0 keys**, and a keyword scan of all 409 non-`mastered` keys for
   `gle|irish|ga-|en-ga|gaeilge` found **0 matches**. All 25,308 Irish DB rows sit under
   `mastered/`. But there is a **layer of 5,945 root-level UUID `.mp3` files dated entirely
   2025-12 and 2026-01 — before the February build — referenced by no Irish DB row.** Some
   of that may be the old Irish course's audio; **it cannot be determined from here**,
   because the key→language mapping lived in the legacy manifest behind gap 1. Also: the
   `audit-archive/` daily content snapshots begin **2026-05-28** — there is no snapshot from
   before the February rebuild, so the pre-February DB state is unrecoverable on this box.
   (Caveat: the bucket census is a **lower bound** — an unbounded scan timed out; ~250,000
   keys were walked, 243,416 of them under `mastered/`.)
3. ~~Whether the beta flag is learner-visible.~~ **Closed:** a bare `β` glyph pre-enrolment
   only, which vanishes on enrolment. Detail in §1.
4. **The Aug 8–15 zero-activity window** is reported as observed. Its cause was not
   established.
5. `total_practice_minutes` sums to 10,238 while session durations sum to 15,144 minutes.
   Both are reported above from their own source; they disagree and neither was reconciled.
6. **No Irish grammar was assessed.** Deliberately. Every quality number above is
   structural or methodological.
7. **One method caveat, named because it nearly poisoned this document.** An initial audio
   pass paged the DB without an `ORDER BY`, which duplicated ~19% of rows while still
   matching the exact row count, and manufactured a false "212 wrong-voice clips" finding.
   Every audio figure quoted above was re-derived with ordered paging and re-verified; the
   bad numbers are discarded.
8. **`content_audit_log` is only partly measurable** — 3.37M rows, no `course_code` column,
   and JSON filters exceed the 8-second statement timeout. Any July/August edit counts
   derived from it are floors, not totals.
9. The build-completeness worker **could not fan out** — the surface refused its dispatch on
   the fan-out depth ceiling — so the learning-app trace behind the beta-badge finding is
   one agent's own reading, cited to `file:line` rather than independently confirmed.

---

*Scouted read-only. Nothing in the database or either repo was changed. Both workers have
now landed and their findings are folded in above: **#857** (old-course archaeology) closed
gap 2 and pinned gap 1 to one named file; **#858** (build completeness) closed gap 3 and
supplied the practice-coverage and audio-integrity numbers — its own fuller report is at
`/d/f478230c`. **One gap remains open and only Tom or Kai can close it: gap 1,
`Courses/en-ga.json` on branch `author` of the out-of-scope `course-configs` repo.***
