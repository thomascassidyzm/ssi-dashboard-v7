# Decisions journal

One entry per decision that a later reader would otherwise have to reverse-engineer
from the code. Newest first.

---

## 2026-09-12 — content_audit_log archive pages on (changed_at, id), not on id; no new index (job #473, sweep item 5, Tom: "Yes to all this. Get cracking")

**Why.** `tools/archive-audit-log.cjs` (the hot/cold S3 tiering job, run by `AUDIT_ARCHIVE_CRON` and the Maintenance "Archive to S3" buttons) paged a day with `changed_at` in window AND `id > cursor ORDER BY id LIMIT 1000`. The planner satisfied the ORDER BY from `content_audit_log_pkey` and filtered on `changed_at` afterwards: EXPLAIN ANALYZE on 2026-08-18 (477,895 rows) read 3,408,400 rows off the pkey before page one and took 22.4s, past PostgREST's 8s statement timeout, so the dry run died on page one (job #130). It only ever worked on light days, where the estimate was small enough to prefer the changed_at index.

**Decision.** Keyset paging ordered by `changed_at` then `id`, with the lower bound of the range re-seeded from the cursor's own `changed_at` and an `or()` tie-break (`changed_at > c OR (changed_at = c AND id > i)`) for same-instant rows. The predicate a day yields is unchanged (`fromIso <= changed_at < toIso`, all tables), the cursor is still resume-safe, and same-instant bursts are handled exactly — 2026-08-18 holds 43,426 rows sharing one `changed_at`. Measured on the identical day and query: page one 28ms, mid-day page 22ms, page inside the burst 29ms, all served by the existing `idx_content_audit_log_changed_at`. Still PostgREST through supabase-js; no `pg` path. Better: pages in milliseconds on any day. Simpler: one index the table already has, the query builder is a pure exported function with a DB-free test. Cheaper: no composite `(changed_at, id)` index to maintain on a table that takes up to 611k rows a day.

**Rejected.** (a) Seeding an id range from `min(id)/max(id)` in the window: Postgres's min/max optimisation uses the pkey with the same filter and took 49.4s on the same day. (b) A composite `(changed_at, id)` index: it would work, but EXPLAIN proved the rewrite alone does, so it fails "cheaper". (c) Moving the cursor queries to `pg`: unnecessary once the shape was expressible in PostgREST.

**Also found.** The prune SELECT (`select('id')` in window `limit(500)`, no ORDER BY) was marked KNOWN-BROKEN alongside the page cursor but never was: EXPLAIN shows it served by the changed_at index in 13ms. Its marker is replaced by a comment saying not to add `order('id')` to it.

**Still off.** `AUDIT_ARCHIVE_CRON` stays unset. This change makes real tiering possible; enabling it is a separate decision. Proof: `tools/archive-audit-log-test.cjs` (red on the old shape, green on the fix) and the two live dry runs for 2026-08-18 and 2026-07-03, no `--execute`, nothing written or deleted.

## 2026-09-12 — Preview builds are governed by the Vercel dashboard rule alone; the in-repo `ignoreCommand` is gone (job #460, Watson's decision)

**Why.** The Aug 12–Sep 11 Vercel bill was $467, $366 of it Build CPU Minutes from ~8,962 preview deployments, one per push of every worker branch. RBF set an opt-in Ignored Build Step in the Vercel dashboard on every project: main, dev, staging and `preview/*` always build, a commit whose message carries `[preview]` builds, everything else is skipped. But a 2026-09-09 job had written an `ignoreCommand` into `vercel.json` (main|dev|staging build, everything else skipped; `bd0519a9d`) and Vercel gives the in-repo key precedence over the dashboard, so the dashboard rule only governed branches that lacked the file, and there was no route to a preview on this repo at all, and no worker branch could build.

**Decision.** One rule, in one place: the dashboard's `commandForIgnoringBuildStep`. The `ignoreCommand` key is deleted and nothing else in `vercel.json` changes. A worker that wants a preview URL pushes a `preview/*` branch or puts `[preview]` in its commit message; it never edits `vercel.json`. Worker branches cut before this landed still carry the old key and are not re-swept: they merge main when they want a preview. Better: previews exist again, opt-in. Simpler: one rule, not two that shadow each other. Cheaper: the build bill falls by the preview share, and nobody maintains a case list in a JSON string.

**Landing.** This is the promotion train's deploy config, not player code, so on Watson's call the identical commit lands on main, the only branch Vercel serves for Popty; `deploy/staging` is a git marker served from watson-1 and is left untouched, on RBF's check.

**Proof.** The Vercel deployment records after landing, read from the API: main builds READY; the preview probe on ssi-learning-app proves the shared dashboard rule.

## 2026-09-12 — a community voice needs no language_recording_policy row; the one resolver admits it to its cast course only

**Decision.** A voice that exists only as a `voice_config.podCast` entry on a course is a live
recording voice on THAT course. The one resolver both booth doors call (`resolveRecordist`) admits
it when no policy row names it, tagged `castCourses` = the courses whose cast names it; the queue,
the take route and the access verdict all honour that list. A policy row stays the only
language-wide claim. Within its course a cast-only voice sees only the lines cast to its own voice
id, so two artists an editor casts on one community course never see each other's lines.

**Why.** Job #311·F left this as its honest gap: a brand-new community language has no policy row,
so the voice an editor minted by casting 404'd at the "Copy link" and was dropped by the email
login alike. Community courses are the point of the casting work, so the gap was the next defect,
not a footnote. Scoping is per course because a podCast grant is per course (the 2026-09-12
leak-fix ruling above), and it is the same resolver so the two doors still cannot disagree.

**Where it lives.** `recordist-queue.cjs resolveCastOnlyRecordist` / `isCastOnlyLine`,
`recordist-router.cjs` (the `?course=` anchor on resolve, the take-route verdict),
`casting-rights.cjs boothArrival` (a no-email cast voice's fallback is its cast courses, never the
asked ones), `booth-community-voice.test.cjs` (Swahili, no policy row, two artists, a sibling
Swahili course; fails on the pre-fix modules, passes after).
Cold-verify #333 then showed propagation still filed Bea's take onto Zawadi's identical
swa_for_fra line; closed by fad310254 (`propagateTakeToDuplicates` admits a copy only when its
own cast resolves to the taking voice) and ea0272b23 (the one key). House re-check #362 re-ran
the Bea→Zawadi reproduction on HEAD: nothing lands (`booth-cast-confinement-reconcile.test.cjs`).

---

## 2026-09-12 — a course cast admits its own course only; only the language policy is language-wide

**Decision.** Where a casting is WRITTEN decides how far it reaches. A `language_recording_policy`
slot naming an email is the language's own record and admits every course of that language and
dialect. A `voice_config.podCast` entry naming an email admits the one course it is written on.
The users-page `voice_id` admits nothing by casting: the cast save provisions it from the same
podCast entry, so it carries no more authority than that entry. Voice-id matches against other
courses' casts count only for policy voices.

**Why.** Foreign-eyes verification (2026-09-12) confirmed a leak: `voicesForEmail` returned an
untagged union of the three sources and `castingForEmail` gave the language-wide grant to every
voice in it, so an editor casting a policy voice into course A under a second email handed that
email course B. Live check before confining the login source: every `dashboard_users` row with a
`voice_id` either holds an editor grant covering its courses or is named by a policy email, so no
artist loses access. **Corrected by house re-check #362 (2026-09-12), confirming cold-verify #331:**
"nobody" was too strong. Old-vs-new `castingForEmail` over the 23 live emails with a voice showed
two of Tom's own test logins, `+logintest` and `+tom_test3`, losing `zzz_test2_for_eng` — their
`human_tom_zzz` came from the users-page `voice_id` alone, which is exactly the source this ruling
stops counting — and Kai's casting-derived `fin_for_eng` entry going, which his admin grant covers.
No artist lost anything; the two test logins are re-admitted, if wanted, by casting them on the
fixture course or granting it, never by widening the users-page source.

**Where it lives.** `recordist-queue.cjs voicesForEmail` (the `castVia` tag),
`casting-rights.cjs castingForEmail` (the confinement), `casting-rights.test.cjs` (two
same-dialect courses; the second email reaches one and is refused loudly on the other).
The same merge landed the own-line 403 fix from job #324·F (`pods-router.cjs` sentence SELECT
now reads `speaker`; `pods-router-own-line.test.cjs`).

---
## 2026-09-12 — a booth text correction keeps learner progress; the pod-migration rules 4/6 do not apply to it

**Decision.** The recordist text-edit route (`services/voice-engine/recordist-router.cjs`,
`/voice/:voiceId/line/:lineId/text`) no longer deletes `learner_pod_state` rows for the edited
sentence group. It used to, on every edit of either side, for every id in the collapsed
duplicate group, with no learner filter — reasoning from the content-change migration protocol
(A-111) rules 6 ("a sentence that changed at all counts as new") and 4 ("a new sentence
arrives unseen"). Confirmed by the foreign-eyes pass of 2026-09-12 (doc /d/707d04e3).

**Tom's ruling, 2026-09-12 11:28Z, his words:** *"Wipe learner progress. Sounds bad to me.
Because it's presumably only a small edit. The sense of the line will be the same. So I think
we keep learner progress."* An artist's correction is the same line, so the learner keeps their
place. The ruling is categorical: there is deliberately no "big edit" heuristic, and no side
(target, known, both) reaches `learner_pod_state`. Standing rule behind it: never touch learner
progress unless asked.

**What did not change.** The edited side's take is still unlinked from the slot (never served
again under words it does not say), `course_audio` is never deleted, and the duplicate group
still moves as one line. A SEED sentence and a QUARRY piece are still refused. Pod swaps and
re-syncs still run rules 4/6 — the whole slate moves there; this ruling is about one line
corrected in the booth. `pod-migration-protocol.md` carries the exemption under rule 7.

**Proof.** `recordist-text-edit.test.cjs`: the test that asserted the drop on a target-side edit
now asserts no `learner_pod_state` write of any kind, and the known-only path (which never
checked progress before) asserts the same. Both were run against the pre-fix router and went
red; on the fixed router the suite is 17/17. The response field `progressDropped` is gone — no
caller read it.

## 2026-09-12 — the community course "Copy link" is the pre-signed form of the email login, not a second identity

**Decision.** The link the course editor copies from the casting row (`PodCastPanel`) is
`/r/<voiceId>?course=<code>`: the existing booth, scoped to that course, Start on the first
unread line. No third identity and no parallel access table. The email door (OTP login →
`castingForEmail` → `/my-recording` → `/r/<voiceId>`) and the link door both end in
`resolveRecordist`, and now both are *keyed* the same way: `casting-rights.boothArrival`
builds the link arrival as `castingIdentity(castingForEmail(email))` and asks the same
`courseAccessVerdict` the `:courseCode` gate asks, so `casting-access.jsonl` counts a link
arrival as a `reach` on the same email/course keys as a login, and a wrong-course link is a
`refused` event plus a 403 carrying the sentence. `voicesForEmail` reads
`voice_config.podCast` entries by email as a third candidate source — rights derive from
casting, not from the users-page row the cast save happens to provision.

**What was deliberately NOT changed.** `resolveRecordist` still answers from
`language_recording_policy` alone — "a recording link is only live while the policy names
that voice" is a stated rule in the code. A voice cast on a course by `podCast` and absent
from the policy still 404s at the link and is dropped by the email door: the doors agree,
by refusing together. Every cast voice live on 2026-09-12 is in its policy; widening the
resolver to `podCast` is a policy call and is left as the open gap. `AdminRecording`'s
language-wide link (no `?course=`) is untouched.

**Editor-only.** `useAuth.isEditorOf` mirrors `podWriteVerdict`'s grant rule (a grant that
is not the recorder role); only that viewer sees Copy link / Open, and `PodDetailView`'s
top-of-page booth links show an artist their own link and nobody else's.

**Proof.** `services/voice-engine/booth-two-doors.test.cjs` and
`src/components/PodCastPanel.copyLink.test.js`, each seen failing on the pre-fix code and
passing after. **Rollback.** Revert the one commit; the old per-voice "Copy record link"
comes back unscoped and visible to any viewer, which is the state before it.

---

## 2026-09-05 — the phrase-door frame work is on `main`, and claim honesty reports rather than gates

**Decision.** The frame-layer chain (jobs #503, #570, #572, #597) was merged to `main` as a
single `--no-ff` merge, `ac7c8f79b`. It carries the declaration module
(`tools/frame-layer/declaration.cjs`), the QA instrument with its candidate reader
(`tools/frame-layer/qa-report.cjs`), the corpus-claim verifier, and the door wiring in
`services/course-builder/lib/phrase-generation.cjs` and `routes/phrases-v3.cjs`. Popty is
internal: work lands on `main` with a rollback, not behind a pull request.

**The ruling it carries.** `checkDeclaration`'s `pass` is a verdict on the five CONTENT
floors alone; the frame-tag audit lives in a top-level `claim_honesty { checked, wrong,
findings[] }` and can never turn a PASS into a FAIL. On the four-basket spa_for_eng 599
run both final FAILs were the two strongest sets, blocked purely on a frame id the matchers
do not fire on — gating there buys compliance, not learner value, and the retry loop has no
repair path for a dishonest claim. **This is conditional with a trigger:** it holds only
while `frame` stays out of the database. The day anyone persists a frame tag on a content
row it becomes load-bearing and must gate again — that trigger is now a comment at the
decision point in `declaration.cjs`.

**The proof, re-run on `main` rather than quoted.** `qa-report.cjs spa_for_eng --seed 599
--candidates <baskets> --with-live` reproduces exactly: LIVE 4 baskets, 1 pass / 3 fail,
mean composite **0.677**; CANDIDATE 4 baskets, 4 pass / 0 fail, mean composite **0.862**.
Verdict and score lines are byte-identical to #597's recorded run apart from the candidate
path. The tool writes nothing to any database; `spa_for_eng` row counts were unchanged
either side (668 seeds / 1,475 legos / 16,325 phrases).

**ROLLBACK, one command.**

```
git revert -m 1 ac7c8f79b3d3b7c95f0c3d66c83f06cd4218caee && git push origin HEAD:main
```

(`1fba08e93` is a follow-up comment-only commit on top; revert it the same way, or leave it
— it changes no behaviour.)

**Merged is not running.** The course-builder API on `:3471` runs from the separate checkout
`/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod`, which sits at `26fe5c310`, eleven commits
behind. Picking this up is a pull in that checkout plus
`systemctl --user restart popty-course-builder-api` — Kai's or Tom's call, deliberately not
made here.

---

## 2026-09-01 — the live canonical slate is pod-1: the first rung of the compulsory default chain

**Decision.** `canonical_pod_scenarios`'s live slate, 231 rows in 22 scenes, was renamed
`pod-0` → `pod-1`. The two sacked pre-metagraph slates that held the names `pod-1` (236
rows) and `pod-0.5` (27 rows) were archived and deleted to free the name. Order forced:
delete, then rename, one transaction, row counts asserted per step. Nothing learner-facing
was touched — `listening_pods` is a separate per-course migration, 22 of 68 done, and its
counts are identical before and after (46 on `pod-0`, 22 on `pod-1`, 269 and 594
`learner_pod_state` rows).

**Why the number.** Numbering was retired as a CONTENT label — a walk is named by what it
masks, and Health is Health, not pod-4 — but numbers name the **compulsory default chain**
(Tom, 2026-09-01): pod-1, pod-2, pod-3 is the ladder a learner descends by *not choosing*.
This slate was always the first rung; it had never been named as one.

**Why it can't be reverse-engineered.** Once the rename lands there is no `pod-0` row left
in the database to check any old claim against, and ~200 documents still say `pod-0` is the
live pod. Nine that carried it as a standing warning now open with a dated banner;
`docs/pods/canonical-pod-slug-migration-2026-09-01.md` is the note they point at.

**One thing that was NOT a rename.** `syllableCeiling` was `podSlug === 'pod-0' ? 8 : 12` —
a pedagogical difficulty tier read off a name. Tom ruled: decouple it, do not just rename
the string. The tier is declared per slate in `services/shared/pod-tiers.cjs` with the rung
it sits on, and is read from the canonical slug, not the per-course listening slug. That
also fixed a live bug: the 22 already-flipped courses were getting the harder 12-syllable
ceiling for the same beginner content their siblings get at 8.

**One thing deliberately NOT deleted.** `canonical_script_versions`'s six `pod-0.5` rows.
The audit said "no FK dependents", which is true — but the absence of that FK is the
feature keeping the history alive, not evidence the rows are safe to bin. Its migration,
written the day before (`20260831_canonical_script_versions.sql`), enforces append-only with
a trigger and says "history must survive a line being re-ingested or removed, which is
exactly when someone wants to read it." Deleting them meant disabling a one-day-old guard
built to prevent that exact deletion. They are archived and still live; open for Tom.

**Decided by:** agent, under Tom's 2026-09-01 migration brief and his ruling on the
compulsory default chain; the append-only carve-out is the agent's call and is flagged.
## 2026-09-01 — a corpus that exists is ingestable without editing code; the walk registry replaces the hardcoded map

**Decision.** `tools/pods/ingest-canonical-pods.cjs` carried a hardcoded three-entry `PODS`
map, so the Script Lab showed three walks and had never shown a fourth. The map is gone,
replaced by `tools/pods/pod-corpora.json` — the walk registry. One file, two readers: the
ingest tool discovers what to ingest, and the Script Lab reads the labels a human needs to
tell walks apart. Adding a walk is one JSON entry plus its corpus file.

A second parser, `tools/pods/parse-sector-walk.cjs`, reads the themed-walk format
(`## scene` / `### Flow N` / `- **W:** "line"`), which the existing pod-table parser cannot
see. A flow becomes a `variant_key`, which is what that column already existed for. Nine
walks are now in `canonical_pod_scenarios`, up from four: health 438, trades 414, retail 330,
hospitality 330, care-work 306.

**Why it can't be reverse-engineered.** The claim was tested rather than asserted. The
care-work corpus landed mid-job; promoting it from mapping-only to ingested took editing
three fields and copying one file, with no code change anywhere. That is the whole
justification for the registry, and it is recorded in the entry's own `note`.

Two rulings sit inside it that a later reader would otherwise re-litigate:

*A mapping is not a walk.* Five proposals under `services/shared/metagraph/proposed/` record
`"corpus": "NONE"`. They are `status: mapping-only` and are skipped by the tool with a
different sentence from a refusal — "skipped: no corpus" and "refused: rows already live"
are different facts and are never the same row.

*No shape claims is not zero coverage.* health, hospitality and care-work declare no
metagraph shapes, so no walk steps were parsed and none were invented. Their coverage reads
as words, not numbers. Rendering that identically to a walk that declared shapes and failed
to resolve them would libel the exemplar corpus.

**Better:** a corpus that exists can be seen, which is the thing that was actually broken.
**Simpler:** one predicate — `status === 'authored' && corpus && format`, hoisted into the
registry as `ingestableRule` and cited by both readers rather than implemented twice.
**Cheaper (total):** the marginal cost of walk ten is one JSON entry, and there is no second
copy of the walk list to drift.

---

## 2026-09-01 — the Script Lab is LIVE AT NEXT GENERATION, and the evidence for LIVE NOW belongs to Pod Lab

**Decision.** The brief for this job said to give the Script Lab a LIVE NOW banner. It wears
LIVE AT NEXT GENERATION instead, naming `POST /api/canonical-script` as the control.

**Why it can't be reverse-engineered.** The instruction cited job #714's finding that
"a seam or gloss saved in the fine-map editor is read by the next learner" — but that is
**Pod Lab's** fine-map editor (`PATCH /api/pod-fine-map` → `atom_map_fine`, read live at
`useListeningPods.ts:179`), and #714 classified Pod Lab live on exactly that basis. The
Script Lab's only write is `POST /api/canonical-script`, which updates
`canonical_pod_scenarios`. Nothing learner-facing reads that table:
`services/pod-dialogue-generator.cjs` flexes it into `listening_pod_sentences`, and only when
explicitly invoked — verified that no scheduler triggers it.

#714's own rule is *classify by what the code writes, and a lab's tier is its
highest-reaching control*. Applying it faithfully gives deferred. Labelling the most deferred
write in the estate LIVE NOW would be the same class of lie that rule exists to prevent: a
label pitched wrong teaches people to disbelieve the axis.

This is the same distinction as the canonical seed versus a course's known text, re-measured
non-circularly on 2026-09-01: at the slot whose canonical line is "Good morning, Sarah!",
the generated pods hold **24 distinct `known_text` values across 46 courses**, including
"¡Buenos días, Sarah!" and "Bonjour, Sarah !"; seed 1 has **116 distinct values across 130
courses**. Editing the canonical does not propagate — the change is *owed* to every course
rather than applied to it. The page says so, unmissably.

**If a control that reaches a learner is ever added to this page, the tier flips.** The
banner names the specific write it rests on so the claim stays checkable.

---

## 2026-09-01 — machine-generated evidence leaves the tracked tree; a fresh worktree costs 60 MB, not 352

**Decision.** Tom ruled "yes, move 290MB of machine logs out of the repo". 1,922 tracked
files — 279 MB of sweep dryrun/applied/verify logs, queue tails, censuses, snapshots,
screenshots and sample mp3s under `docs/` and `archive/docs-retired-2026-08-24` — were
copied byte-for-byte to `~/ssi-evidence/ssi-dashboard-v7/<same path>` with a
`MANIFEST.tsv` (git blob SHA + bytes + the commit removed at), then `git rm`'d at the
tip. `.gitignore` now excludes `*.json`/`*.jsonl`/`*.gz` and image/audio under `docs/`
and `archive/`, with named exceptions for schemas and the eight files committed tools
and tests actually read. `docs/EVIDENCE.md` and `tools/lib/evidence-path.cjs` say where
new evidence goes.

**Why it can't be reverse-engineered.** A fresh `git worktree add` was **352 MB**; it is
now **60 MB**. Job #625 measured the estate writing ~10 GB/day and found every byte was
`git worktree add` — ~30 a day, ~300 MB each, 195 accumulated. Its hourly reaper made
that survivable; this removes the cause. History is untouched, so the old bytes are
still there: only NEW worktrees are cheap.

**Better:** the churn is deleted at source rather than swept up hourly, and `docs/` goes
back to being 9 MB of markdown a human can actually read.
**Simpler:** one predicate — machine formats don't live in `docs/` — expressed as
gitignore patterns, no size gate, no per-tool retrofit, no lifecycle hook.
**Cheaper (total):** one copy, one commit. Tools may still write into `docs/`; the
gitignore means it never enters the tree, so no tool had to change for the number to
move. The store is one directory on this box, mirroring repo paths, addressable by the
same path anyone already knew.

**Searched & rejected.** `git filter-branch`/`filter-repo` to reclaim the history bytes —
rewrites every SHA on a repo with dozens of live worktrees and two deploy checkouts, for
disk that costs nothing per worktree (objects are shared); #625 rejected it too.
Sparse-checkout excluding `docs/` — workers write and publish from `docs/`, so the cone
fights the work. A size threshold — not expressible in `.gitignore`, so the tree and the
gate would drift apart. Deleting outright — the data is not worthless, and "move it
somewhere addressable" costs 284 MB of disk we have.

**Verified before removing.** Published docs render from the surface DB `content` column
(2,752 rows, zero empty; `/d/<id>` in `server.js` never touches `src` on disk) — one
published doc has a `src` inside `archive/docs-retired-2026-08-24` and still renders. No
done card points at a repo file (33 non-`/d/` URLs, all external sites). Nothing in
`services/` statically serves `docs/`. A grep over all 1,658 tracked non-doc files for
`docs|archive` path literals found 28 references, 8 of which resolve to a tracked file —
all 8 kept.

**Not done, said instead.** Worktrees on other branches keep the files until those
branches take this change; nobody else's worktree was touched. One-off scripts under the
gitignored `scripts/` that read moved paths will need the `~/ssi-evidence` prefix — they
are spent one-offs and were not retrofitted.

---

## 2026-08-31 — The metagraph is ratified past its derivation counts, and CORE is a placement, not a coverage number

**Decision.** The store now carries the ratified discursive layer — N301–N306 /
F301–F306 / C301–C302 / S301–S305 (talk-bollocks), five method-pod mints
(N902/3/7/8/9), N501 and F601 (Tom's rulings) — and a **declared m→store
crosswalk** in `tools/pods/pod-shape-aliases.cjs` (20 of 23 m-tokens land;
m6/m14/m15 unresolved by ruling: intra-turn, not exchange positions). Five mint
candidates were REJECTED as duplicates of rulings already on the page
(N901→F302, N904→N11, N905→N301, N906→F1, N910→F301) — the rejections are the
record that consolidation verdicts, once written, bind later minting.

**Why it can't be reverse-engineered.** `tools/metagraph-selfcheck.cjs` used to
assert the shape-graph document's own counts (17 nodes, 20 moves); it now
asserts the ratified counts, and the header says so. If a future reader finds
the store bigger than the derivation doc, the ratification doc
(`docs/pods/core-walks-ratification-2026-08-31.md`) is the missing link, and
`proposed/*.json` files whose status says RATIFIED are provenance records, not
double-load hazards — the store proper is the only loaded copy.

**The naming ruling applied.** CORE = the compulsory walk (live POD 1, slug
`pod-0` — the off-by-one stands); everything else is an optional walk, and
"optional names WHICH, never WHETHER". Consequence used throughout the audit
(`docs/pods/core-compulsory-set-audit-2026-08-31.md`): a guarantee can live in
CORE, or on EVERY optional walk (a second floor at zero compulsory cost), or
nowhere — and survivability recoveries attach to the CORE scene that already
stages their branch, never as appended scenes, because a recovery three scenes
late is worth nothing.

---

## 2026-08-29 — The language cast beats the course's stored voices, but a legacy config is not an override

**Decision.** The render path now resolves a course's voices in three legs:
**explicit course override → language cast (`voice_language_roles`) → the
course's stored `voice_config`.** An explicit override is a NEW deliberate
marker — `voice_config.overrideLanguageCast: true`, or the same key on one role
— never the mere presence of a stored config.

**Why three legs and not two.** Tom's ruling is that casting moves to the
language, which read strictly means the cast wins and a per-course voice is
consulted only where someone deliberately set one. But `voice_language_roles`
held **zero rows** when this landed and **94 of 149 courses** carry a real
stored `voices` block. A strict two-tier rule would therefore have changed what
every render in the estate decides, overnight, in nobody's favour — and Tom's
own framing was that nothing should notionally break for courses already made.
Treating the legacy config as an override instead would have made the cast
unreachable forever, which is the opposite failure. The third leg is the only
version that satisfies both halves: **zero cast rows means zero behaviour
change**, measured — 94/94 configured courses resolve byte-identical.

**Where the reader lives.** `services/shared/language-voice-cast.cjs`, pure and
unit-tested, so the rule can be read without opening phase8. The provider ladder
(`tts-provider-policy.cjs`) and the canonicaliser (`clip-identity.cjs`) are
untouched: the cast decides WHO speaks, the ladder still decides on which
provider.

**The seam.** `loadVoiceConfig()` is the render read and resolves; a new
`loadStoredVoiceConfig()` is the editor read and does not — saving a resolved
config back would copy the language's decision into 94 course rows and defeat
the point. phase8 does not go through either (it reads `course.voice_config` off
its own `select('*')`), so it resolves explicitly at the course fetch in
`planHandler`, at the relink voice gate, and at the pod known voice.

**Two defaults chosen here, not ruled by Tom.** (1) A role's gender is read from
the gender of the voice the course already has, so an existing course keeps the
gender it has; only where there is none does `target1`=f, `target2`=m, `known`=f
apply. (2) `presentation` is EXCLUDED from the cast — it is the intro/clone
voice, not a specimen of the language.

---

## 2026-08-29 — One canonical rendered pace; the pace-shaped reuse guard retired

**Decision.** Rendered pace is no longer a role or cadence decision. The cadence
multiplier in `getEffectiveSpeed` resolves to 1.0 and the hardcoded `slow` 0.8x
in `phase8-audio-from-baskets.cjs` goes. The per-VOICE base speed STAYS: that
corrects a voice's own natural pace and is a property of the voice, not of the
role a clip plays in.

**Tom, 2026-08-29:** "playback speed is a player concern, not a baked-in render
concern — the same clip plays faster when used as the known language and slower
as the target, so stop treating rendered pace as a reason for distinct clips."

**Consequence, accepted.** `isSpeedTrustedVoice` refused cross-role reuse of an
Azure clip because Azure bakes speed into the MP3 and `course_audio` persists no
per-row speed. With new renders all at one pace it describes nothing, so it is
retired to a constant carrying its own obituary. The cost falls on clips already
in the estate: an old Azure clip rendered at 0.8x can now be borrowed into a
role that would previously have re-rendered it, and plays at its baked 0.8x
until next re-rendered. Tom waived this in advance: "I don't care if anything
notionally breaks, because these courses are already made — it's only going to
affect regeneration, or replacement." No speed column was added to
`course_audio`; that migration is not needed by this ruling.

**Outstanding, deliberately not done here.** The other half — known-fast /
target-slow playback — lives in the player (`ssi-learning-app`, deploys
separately to Vercel) and is Tom's to schedule.

---

## 2026-08-28 — Voice casting lives in its own table, not on `voices`

**Decision.** Per-language voice casting is stored in a new table,
`voice_language_roles`, keyed `(language, gender, rank)` with a foreign key to
`voices.voice_id`. Rank 0 is primary, 1 is first backup.

**The alternatives, and why they lost.**

*Columns on `voices`.* `voices` answers "what is this voice?" — one row per
voice, with `languages text[]` for what it can speak. Casting asks a different
question: "for this language, who is the primary female?" One voice can
legitimately be primary female for Spanish and first backup for Italian, and a
column cannot express that without an array-of-structs. Cheaper to write,
dearer to query and dearer to keep honest.

*Overloading `voices.notes`.* Free text would have needed no migration at all.
It would also have made the estate's casting unqueryable prose, so the screen
whose entire purpose is "show me what is missing" could not have computed the
answer. Rejected on total cost, not on taste.

**Why this is better, simpler and cheaper.** Better: the completeness question
("which languages lack a female voice?") becomes a `GROUP BY`, which is what
makes the gap visible on sight. Simpler: one primary key expresses the whole
rule, and the `no_self_backup` unique index makes "cast as your own backup"
unrepresentable rather than merely discouraged. Cheaper: one small table with no
change to `voices`, so nothing that already reads voices had to be touched, and
`ON DELETE CASCADE` means a withdrawn voice empties its slot instead of leaving
a dangling reference — the language then reads as incomplete, which is the alarm
we want rather than a silent lie.

**Taste call left open for Tom.** Completeness is currently "both genders, ranks
0 and 1" — four voices per language. Tom asked for "2 voices … with backups";
two backups is the reading that makes "backups" plural without demanding six
voices across ~70 languages. It is one env var, `VOICELAB_REQUIRED_RANKS`.

**Consequence accepted.** Casting is not enforced anywhere yet — the render path
still selects via `tts-provider-policy.cjs`, which reads `voices`, not this
table. That is deliberate: this landed as a registry a human reads and fills,
and wiring it into automatic selection is a separate decision with a much larger
blast radius.

---

## 2026-08-28 — The Voice Lab reports characters, not dollars

**Decision.** The lab no longer claims a dollar figure for any run. `usd` is
`null` ("not priced"), never `0` ("free"). The daily ceiling is, and always was,
a character ceiling.

**Why.** The lab priced runs at xAI's published $15/M characters. xAI is retired
from selection, so that constant priced a provider the lab can no longer call.
Neither Cartesia nor Azure has a rate verified anywhere in this repo. Replacing
one stale number with another guessed one would have bought false precision on
the money path, which is the worst place to have it. Characters are countable,
enforceable and already the mechanism that refuses a run, so nothing was lost by
reporting only them.

---

## 2026-08-30 — The shape metagraph has a canonical home, and there is only one of it

**Decision.** The shape metagraph derived in
`docs/pods/shape-graph-2026-08-30.md` is now a stored artefact at
`services/shared/metagraph/` — `nodes.json`, `moves.json`, `edges.json`,
`outcome-shapes.json` and `walks/pod-0.json`, with `schemas/metagraph-v1-schema.json`
and one reader, `services/shared/metagraph/index.cjs`. Three things are settled by
this and are not re-openable without a new decision:

1. **One store, not one per lab.** The pod side and the seed/basket side read the
   same files through the same module. Neither gets a copy.
2. **Walks are sequences of node references.** A step *is* a reference to a node
   and a position; the surface sentence hangs off it as a property. Coverage —
   which shapes a walk traverses, which it hits twice, which it never reaches —
   is computable without parsing any prose.
3. **Two edge kinds and only two:** composition, and presupposition-of-survivability.
   Chaining is a property of the walk, recorded as a `pivot_capable` position, never
   a third edge.

**Why.** The graph existed only as prose, so nothing could load it — which is why
PODLAB makes you load a course before it shows you anything: a course was the only
structure the tooling could reach. Files rather than a table because the graph is
language-agnostic structure, not course content: it is small, it wants git history
and review, and `database/migrations/` takes no new files. Walks as node references
rather than annotated text because the next move after coverage is visible is
"select the shapes this pod should teach and let the walk be generated", and a
prose-shaped store forecloses that. One store rather than per-lab copies because two
copies drift inside a fortnight.

**What the store carries that a flatter one would lose.** Provenance and attestation
on every row: N6 repair has exactly one dialogic attestation in 231 rows, S2 (acting
on a hedge) has no attested recovery at all, N13–N17 rest on the Method Pod alone,
and four of the nine outcome shapes are attested nowhere and must be minted. That
asymmetry is the finding. `tools/metagraph-selfcheck.cjs` asserts it, along with
every count the derivation document states.

---

## 2026-08-30 — Script View: the determinism boundary, and the spaced-review slot

**Decision.** The Script View keeps generating (it is an editable QA surface, Tom's ruling), but
the part of it a learner is promised — structure, round composition, cycle order, and which
LEGO's basket each spaced-review slot draws from — is what must match the serving path. The
random half stops being rendered at all: **each spaced-review slot is now ONE row naming the
LEGO, tapped to expand into that LEGO's whole USE basket** ("the spaced rep part of the script
should JUST show the LEGO ID and its basket of USE phrases as a clickable expand" — Tom,
2026-08-30). Nothing on the page invents a drawn phrase any more.

**What was established first** (`docs/script-view/what-order-the-learner-hears-2026-08-30.md`):

- The Script View has always run its own generator (`services/learning-script-generator.cjs`,
  behind `/api/production/:courseCode/learning-journey`, production-api.cjs:8440). Its own header
  says so: *"dashboard mirror … no shared code — keep the two in sync by hand."* Confirmed, not
  suspected.
- The live learner path is **not** the bundle. `packages/core/src/script/generateScript.ts` is
  built but has **no caller in player-vue** and nothing fetches `/api/courses/:code/bundle` from
  the client. A learner is served by `/cycles` for the opening (DB position order) and then by
  `providers/generateLearningScript.ts` in the browser (shortest-first, via
  `capPhrasesByLength`). Wiring Popty to the bundle generator today would have mirrored a path
  nobody is served by — the brief's suggested target, and it was wrong.
- On phrase order the Script View and the live walk **agree** (both shortest-first, which
  `ralph-methodology.md` line 270 states as doctrine). The position-order sort lives in the
  bootstrap endpoint and in the unswitched bundle generator. A-307 is a question about those two,
  not about the review tool.

**Why the basket row rather than a seeded draw.** Reproducing the draw would have meant the view
carrying a second copy of a per-learner random process — the exact duplication that let the
position-order sort go unnoticed. A slot that names its basket is honest about precisely what is
determined, and it is cheaper: no seed to keep in step, nothing to drift.

**Known consequence, named rather than hidden.** Because the view no longer draws, a review can
no longer claim a phrase for the round, so CONSOLIDATE occasionally picks a phrase a learner's
draw would have taken (observed once across spa_for_eng's first 8 rounds). Item counts also fall,
because a slot is one row where it used to be up to three.

**What is NOT done, and is the larger remaining piece.** The deterministic half still has two
implementations — Popty's `.cjs` and player-vue's `generateLearningScript.ts` — kept in step by
hand. Collapsing them means promoting the live walk (not the bundle generator) into `@ssi/core`
and having Popty call it, which is a cross-repo build change (Popty is CJS, `@ssi/core` is ESM/TS)
plus a golden-master parity run over several courses. Estimated a day's work of its own, and it
should not start until the bundle cutover's client half is switched on or abandoned — otherwise
it will be redone.

**Decided by:** agent, under Tom's 2026-08-30 ruling on the spaced-rep rendering; the ordering
question (A-307) was deliberately left untouched.

---

## 2026-08-31 — The Voice Lab's three gaps: the consent key, hearing a voice with no clip, and a judging set

Tom, looking at the live page: *"1 - there is no way to give consent to a voice here. 2 - there is
no way to hear a voice that does not currently have a clip. 3 - there is only one clip per voice."*

**Gap 1, and it was ours.** Consent became REQUIRED to cast on 2026-08-31 — refused server-side at
every door — and the only routes that could SATISFY it created a NEW voice. Nine voices already in
the estate were refused everywhere with no door anywhere. This branch built a key; so, within the
hour, did another worker, for the cast screens (61d0b9122, `ConsentStep.vue` +
`POST /voices/:id/consent-declaration`). **Theirs stayed and mine was deleted** — it is better
argued (a dashboard session rather than admin, because the people who hit the lock are course
leaders; and a capture that cannot overturn a recorded no). One component, one route, one wording,
three screens. The Voice Lab's contribution is WHERE it opens — the chip that says a voice has no
consent IS the door, opening the panel under the row it was tapped in — plus two optional controls
on the shared panel, both off by default: hearing the voice before consenting to it, and a refusal
of exactly the same weight as the yes.

The old freeform consent form (status dropdown, name, date, note) went with it. It could mark a
voice `authorised` on typing alone, which was a second meaning of the word consent one screen from
the first.

**Gap 3 — what a judging set is, and why.** Three lines from ONE named course: the median line
(unchanged from the single line this module always picked, so every cached clip in the estate stays
valid and the row's one-press fair comparison still renders identical words for every voice), a
SHORT line (onset and tail, where a clone clips its first consonant or hangs a breath), and a LONG
one (breath, pace and drift, which four words cannot show). The short slot prefers a QUESTION where
the corpus has one, because rising intonation is where a clone most often gives itself away.
Deterministic, so two voices are never compared on different words.

**Per VOICE, not per row, and that is the cost decision.** The row press renders one line for every
candidate — the fair comparison that makes a shortlist. Three lines for eighty candidates would
triple the bill to answer a question nobody asked about seventy-seven of them, so the spend follows
the attention: a voice gets its extra clips when somebody opens it.

**Two defects found by driving it rather than by reading it.** `ConsentStep`'s `clipFile` was a
plain `let` behind a computed, so the spoken route could not be completed by anybody — you read the
line aloud and the button stayed disabled. And in the two-column guide layout the consent chip was
being clipped underneath the neighbouring card, unclickable: a decision that looks as though it was
never offered.

**Decided by:** agent, under Tom's 2026-08-31 gaps brief; the consent mechanism itself is his
2026-08-31 ruling and was reused, never re-invented.

---

## 2026-09-02 — Colour means measurement, and absence is drawn rather than coloured

**Tom's ruling, implemented — not a design exploration.** Popty's colour had no rule. Green meant
the brand wordmark AND a page heading AND a breadcrumb AND a node id AND "reached/attested". Red
meant "never reached" AND the body text of a long paragraph. Amber meant the active nav tab AND
Select AND "declared, unresolved" AND "attested nowhere — must be minted" AND the chunk-mapping
chip. Every colour did three jobs, so the eye could not learn a rule and none of them read as a
measurement any more.

**Ruling 1 — colour is spent on a measured fact and on nothing else.** Titles, headings,
breadcrumbs, nav, node ids and inline emphasis go to ink and grey. Blue is the single action colour.
`/courses` is the reference implementation and was matched, not improved: it already spends colour
only on FREE / PREMIUM / Beta / Live, and it was left untouched.

**Ruling 2 — absence is DRAWN, not coloured. Red comes out.** Attested = solid outline, filled, full
opacity. Not reached = dashed outline, no fill, reduced opacity, ink text. Three redundant channels
deliberately: across 36 small cards a dash alone is noise and must not carry the signal by itself,
and the same three channels survive card size, light mode and a colourblind reader where a hue does
not. The page used to invert its own measurement — 25 red cards and a red deficit list for the
things that do not exist, with the 11 shapes actually reached sitting quiet at equal weight, which
reads as an accusation rather than as a map with holes. Consequences that fell out of the one rule
rather than being separate asks: the deficit list became plain grey body text (the cards now carry
the signal, and the page stops stating its deficit twice), and "attested nowhere — must be minted",
"declared, unresolved" and the chunk-mapping chips lost their amber.

**Light mode was not tuned separately.** It looked worse for the identical cause — pastel red/green
fills reading as a spreadsheet with conditional formatting — so the rule was fixed once, in tokens,
and both modes were verified.

**Ruling 3 — Script Lab is canonical-only at full width by default.** With no course loaded KNOWN
was a byte-identical copy of CANONICAL with "= canonical" stamped under every row, and TARGET was a
column of em-dashes: two thirds of a 1400px page carrying zero bits, and the reason the body type
had to run at ~13px to fit. KNOWN and TARGET now appear only when a language is selected.

**Ruling 4 — the missing selector already existed one tab across.** There IS a global "Choose
course…" in the top chrome; it reads as site-wide furniture and is not discoverable as this screen's
control, and THAT was the defect. The Metagraph's chip row was REUSED, with "Canonical only" as the
leftmost chip and the default, exactly as "Graph only" is there. The languages are counted from the
walk, never from a list somebody typed, and a script with no language layer says so in a sentence
rather than offering a dead control.

**Ruling 5 — the Library's type scale, app-wide.** `--text-body / --text-sm / --text-xs /
--text-label` are named once in `src/assets/ui-tokens.css` so a screen ADOPTS the scale rather than
tuning itself into a private one. Canonical-only is what makes it free: one column keeps the measure
sane at the larger size where three did not.

**One red survives, and it is named in the code and in the harness.** A failed fetch or a failed
write is a system fault, not a measurement of the content, and `/courses` — the answer sheet — keeps
red for exactly that (its `.error-panel`, and the Environment Switcher's connection dot).

**Verified by a declared harness, not by a stub.** `e2e/colour-rule/shots.spec.js` signs in through
the real login form as the seeded E2E admin, against the real production-api and the real canonical
store, and photographs three screens at 1440×900 and 430px in both themes. It also asserts the rule:
it reads the computed colour, border, background, fill and stroke of every rendered element on each
page and fails if any lands in the red or amber families. It writes nothing; every request is a GET.

**Decided by:** Tom, 2026-09-02. Implemented as ruled.

---

## 2026-09-05 — popty.app/builds serves APK bytes, behind a capability URL

**The defect.** `vercel.json`'s catch-all rewrite (`/((?!vfs|assets/).*)` → `/index.html`) swallowed
every unknown path, so `popty.app/builds/<anything>.apk` returned the 669-byte dashboard shell with
`HTTP 200`, `content-type: text/html`. Two jobs in one day recorded that URL as a distribution
surface; nobody could install anything, because a 200 hid it. There was no `/builds` route anywhere
in the repo — it had never been built.

**The fix.** A `/builds/:path*` rewrite placed ABOVE the catch-all (order decides — Vercel takes the
first match) onto `https://watson-1.tail4968cb.ts.net:8443/api/builds/:path*`, the tailscale funnel
that already carries `/api/recording`, into a new `services/builds-router.cjs` on the production API.
APKs live in `~/apk-serve`, outside every worktree, so a sweep cannot delete the file behind a link
already handed to a human.

**The auth call.** The capability URL — the link IS the identity, the same call the `/api/recording`
recordist routes already make. The reader is an external tester with no Popty account; a session
login would 401 on her phone and fail the actual requirement. Without the token segment there is no
listing and no download (`/builds` bare → 404).

**Rollback.** Revert to `95b7f1fac`; the change is `2d3da9c42`. Reverting `vercel.json` alone is
enough to take popty.app back to the old behaviour, and the route on port 3470 is inert without it.
Misbehaviour looks like: `/builds` serving something unexpected, or the new rewrite shadowing another
path. Verified still working after the change: the dashboard root, an SPA deep path (`/courses`), and
`/api/recording` (same 404 through popty.app as on port 3470 directly — the proxy is intact).

**Verified by bytes, not by a status code.** `https://popty.app/builds/<token>/ssi-devwrap-7ccf1288-debug.apk`
→ 23,347,632 bytes, sha256 `25288a3e2d550e79539b07fdefc76ab117525dcdb83ebc1db081a7a30364f53c`,
`content-type: application/vnd.android.package-archive`. The bytes crossed the Vercel edge, which is
outside the tailnet. `services/builds-distribution.test.cjs` holds the line: it asserts the rewrite
ORDER statically and was proven red against the pre-fix ordering.

## 2026-09-06 — one public link: popty.app/builds/android, bytes from the public bucket

**Supersedes the 2026-09-05 entry above.** That design (a `/builds/:path*` rewrite onto the
tailscale funnel) was reverted the same evening in `7becc11ba` because it shadowed `/builds`, a
real SPA route Kai, Deborah and Tom use. Its test has been red on `main` ever since, asserting a
rewrite nobody ships.

**The finding that made this cheap.** The bytes were never the problem. `/builds` already links to
the PUBLIC Supabase Storage bucket `app-builds`, and that bucket already answers a stranger — no
tailnet, no session — with `HTTP 200`, `content-type: application/vnd.android.package-archive` and
an exact `content-length`. The only thing gating a field tester was the Popty **login on the page**,
which is what put a 669-byte HTML shell on Deborah's phone named `.apk`.

**The fix.** One ordinary SPA route, `/builds/android`, marked `meta: { public: true }` — the same
exemption the recordist room at `/r/:voiceId` already uses. It renders `PublicAndroidBuild.vue`: a
single build, its download button, the unknown-sources walkthrough, and full provenance including
the sha256 and the signing certificate digest. No `vercel.json` change at all (the catch-all already
routes it to the SPA), no rewrite that can shadow `/builds`, no serverless function streaming 23 MB
(Vercel cannot), no port opened, and nothing that dies when watson-1 reboots.

**The auth call.** Tom, 2026-09-06: *"they still have accounts so it doesn't matter if this build is
publicly available does it?"* The APK is not the secret; the account is. So the download carries no
gate. The capability-token shape of the previous design is not needed and is not used.

**One build, never a list.** The public page serves the newest manifest entry carrying
`"public": true`. Five historical APKs on a public page is a way for a tester to install the wrong
one; the authed `/builds` page keeps the full list, unchanged.

**Rollback.** Revert this commit. `/builds` is untouched by it, so the authed page cannot be harmed;
worst case the public page disappears and the bucket URL still works directly.

**Verified by bytes.** `https://popty.app/builds/android` → the page, no login. Its download URL →
23,326,339 bytes, sha256 `4a42e50b09a41843086059bfe02dd8f9d5ee2526102b974c40e1d8f8a70dc130`,
first two bytes `PK`. `src/router/publicAndroidBuild.test.js` holds the line: public route exempt,
`/builds` still guarded and unshadowed, exactly one public build, bucket URL, provenance complete.

## 2026-09-12 — A human take propagates by (language, voice id, text), never by gender and never by course

**Tom's ruling, 2026-09-12 12:08Z, his words:** *"human recorded languages are ok to propagate across
because IF the text is the same then the voice selected will be the same won't it? E.g. Macedonian for
either target or known, for main course content or for pods, will always be the same line for the male
voice and the female voice. I guess we probably should be a little more definite about this. List the
courses and the voice-IDs of the human recorder. Since we may well want to have variations later."*

**The rule.** The unit a take stands for is **(language, voice id, text)**. A take by voice V of text T
fills every course, side (known/target) and pod line of that language whose text is T and whose cast
voice is V — and nothing cast to any other voice, however alike in gender. Gender is a property of the
voice, never a key. The `language_recording_policy` row's one job is to NAME which voice id carries a
language/gender (and, since 2026-08-19, a dialect: the course's dialect, never the cast's, decides which
policy voice a line is named to); the row is never itself the propagation key.

**Why this is the definite version.** After #336 there were two rules: a policy voice collapsed and
propagated by language+gender+dialect+text, a cast-only (community) voice by cast voice id. The first
stopped being true the day a language got a second voice of one gender — the second female Macedonian
would have inherited, and been filed onto, the first's lines. One key makes "variations later" a matter
of minting a voice id: a different id simply does not propagate into another's lines.

**Where it lives.** `services/voice-engine/recordist-queue.cjs`: `lineVoiceId` resolves every pod line
and wanted re-record to its owning voice; `voiceTextKey` collapses the queue on it; `linesForVoice`
hands a recordist exactly its own lines; `propagateTakeToDuplicates` and `clearRerecordWants` fill and
retire by the same key. `booth-propagation-by-voice-id.test.cjs` asserts it: two voices of the same
gender with identical text do NOT share a take; one voice cast on three courses with identical text DOES.

**What the one key covers, precisely (house re-check #362, 2026-09-12, confirming cold-verify #348).**
The key fills POD LINES and WANTED RE-RECORDS. A SEED SLOT is owned by the same thing — the voice id
the course's `voice_config.voices[role]` names, resolved through the policy (`seedCastEntry`) — but it
is a second fill, not the same one: a seed take propagates to the seed slots cast to that voice across
the language (`linkSeedTake`, keyed voice+role+text) and never to a pod line, and a pod take never fills
a seed slot; the same words under the same voice as both a seed slot and a pod line are read twice
(`recordist-seed-queue.test.cjs`: "a seed line does NOT collapse into a pod line that reads the same").
Tom's words above ("for main course content or for pods … the same line") plainly cover seeds, so
whether one take should fill both is his call, logged as a decision candidate rather than built here.
The two-voice cast collapse (`collapseTwoVoiceCast`, founder ruling 2026-07-17), which #349 read as a
gender-based identity collapse, is a cast-editing migration on the casting screen, not a take route,
and is the separate one-man-one-woman question already pending with Tom.

**The re-record take refuses a clip nobody is named for (house re-check #362, confirming cold-verify
#355).** `recordRerecordClip` read `owner && …`, so a flagged clip whose owner could not be named
(untagged narration with a want naming no gender, or a gender the course casts nobody or two voices
for) was recordable by any voice of the language past the course gate — while the queue counted it
`uncast` and offered it to nobody. Now `!owner ||` refuses it 403 `not_cast_on_line`, the same rule
the pod-line take holds; queue and take agree. Every live want (1,269 on 2026-09-12) names a gender,
so an owned narration clip on a one-voice-per-gender course is unaffected.

**No recording moved.** The change decides how future takes propagate and how queues collapse. Existing
takes that sit outside the key are reported, not migrated: Sasha's 492 `human_sasha_wanasky_deu_at` takes
(named by neither policy nor cast), cym_nnew_for_eng's 83 Aran seed takes on a course whose seed slots
name no voice, and the voiceless `legacy_import` / `catrin_human` imports — see the published table
*Human recorders — courses × voice ids, 2026-09-12*.

## 2026-09-12 — Cartesia word timings travel with the pod clip, on course_audio.word_timings

**Why.** Tom, 2026-09-12 (RBF room): pod IMMERSION display should keep pace within a sentence like a
podcast transcript. Pods are never cut below the sentence, so the timings have to sit on the
whole-sentence clip; Cartesia emits them and xAI never did. One nullable jsonb column, contract
`{source:'cartesia', words[], starts[], ends[]}` in seconds, equal length, playback order — the
writer's contract is `services/shared/word-timings.cjs`, the learning app maps it to `wordTimings`.

**Better × simpler × cheaper, and the two calls that were not in the brief.**
- Cartesia only emits timestamps on its streaming endpoints, and `/tts/sse` only returns RAW PCM.
  So a timed render is opt-in (`config.wordTimings`), goes to SSE, and the reassembled PCM is wrapped
  as WAV for the mastering chain (ffmpeg sniffs content, so the container is fine). Every other
  Cartesia call stays on `/tts/bytes` exactly as before — no blast radius on course-phrase renders.
  Two calls (bytes for audio, SSE for timings) would double the spend and time a different
  generation; rejected.
- Timings describe bytes, not rows: the writer lands `word_timings` only after the row is confirmed
  to hold the rendered bytes, and the revision swap clears them on any replacement that brings none.
- Mastering only cuts the TAIL (`trimToEndOfSpeech`) and re-levels; the head is untouched, so raw
  render timings still describe the mastered clip (proof: last word ends 1.32 s, clip 1.44 s).

**No backfill.** Pod-1, xAI and human clips carry NULL until a later alignment pass, by the brief.
Proof sample: *Pod word timings — first Cartesia sample, 2026-09-12*.

## 2026-09-12 — the two voices #344 found unnamed are named: Sasha in the German policy, Aran on cym_nnew's seed slot

**Decision.** Two data writes, both through the repo's own admin routes, no take moved, re-keyed or
deleted (job #427). (1) `language_recording_policy` gains a `deu` row, `human_only=false` on the
`fin` precedent, whose one slot `f` names `human_sasha_wanasky_deu_at` (Sasha Wanasky,
sasha.wanasky@gmail.com). The one propagation key (language, voice id, text) now has a policy owner
for her 492 `deu_at_for_eng` target2 takes, and the booth link `/r/human_sasha_wanasky_deu_at`
resolves (it 404'd before). German audio production is untouched: phase8 reads `human_only=true`
only. (2) `cym_nnew_for_eng.voice_config.voices.target2` names Aran (`human_aran_cym_n`, provider
human, assignedEmail aran@hey.com — the same shape as `cym_n_for_eng`), matching the 83 seed slots
that already carry his propagated takes.

**Proof.** Welsh coverage before and after is identical (total 1388, recorded 1084; Aran 994/993,
Catrin 394/91); `uncast` fell 239→238 because the uncast unit is the slot, and cym_nnew target2 is
now cast. Aran's queue is byte-for-byte the same size (994 lines, 993 recorded) — every cym_nnew
seed text also exists in cym_n, so the new slots collapse into lines he already has: 267 of his
305 seed lines now report `alsoFills: 1` (0 before), i.e. his next seed take fills the cym_nnew
slot too. DB counts unchanged: 492 Sasha clips, 17 linked deu_at target2 slots, 83 Aran cym_nnew
target2 links, 19 legacy_import.

**The half the policy row cannot do, and whose call it is.** Sasha's booth opens but lists 0 lines.
A seed slot is owned by the voice the course's `voice_config.voices[role]` names (`seedCastEntry`),
and deu_at_for_eng's target2 names Hermann (Cartesia) by Kai's 2026-09-10 cast ruling — "target2
for the seeds Sasha has NOT recorded" — with Sasha parked in a `humanVoice` sub-object that no code
reads. So her 17 seed takes are not in her queue and her future takes propagate to no slot until
the slot names her, and naming her there displaces Hermann for TTS on the seeds she has not read.
That is a cast fork (human slot vs TTS fallback on one role), Kai's or Tom's, not a data fix. Her
other 475 takes are practice phrases and LEGOs, which the booth does not queue at all (the quarry
is target1-only, ≤30 seeds).

**Gender.** The live DB records none for Sasha (the course slot said "Neutral"); the slot is `f`
because every estate record of the casting (e.g. the 2026-08-10 note to Kai, "the studio records
as her") refers to Sasha as she. Not a DB fact — recorded in the row's notes. It routes nothing
today: no German course casts by gender alone and no German clip carries a re-record want.

## 2026-09-12 — the one-man-one-woman pod casting rule is retired: a cast is any number of named voices

**Decision (Tom's, verbatim).** Asked "Retire the one-man-one-woman casting rule so a cast is any
number of named voices? Yes or no", Tom answered **"Yes. Retire"** (job #454). There is no longer a
fixed male-plus-female pair requirement anywhere in Popty pod casting. A pod cast is one or more
named voices, of any gender mix. No replacement constraint on gender balance, minimum or maximum
was added.

**What was retired.** (1) The `voicesInUse.length !== 2` refusal in `tools/pods/pod-cast-gate.cjs`
— the "EXACTLY TWO voices" half of the 2026-08-23 ruling ("there's always male talking to female,
so that two voices can actually do the whole thing"). (2) The load-time collapse in
`services/voice-engine/pods-router.cjs` GET /cast, which since 2026-07-17 rewrote
`courses.voice_config.podCast` to one voice per gender whenever a cast held more distinct voices
than `podCastVoices`; `collapseTwoVoiceCast` survives exported and tested, nothing calls it on
load, and `podCastVoices` is written as the distinct count, never a ceiling. (3) The min-two /
both-genders gate in `validateCastPeople` (POST /cast/propose): one to five voices, any gender
mix; `defaultCastPeople` prefills one row per roster human. (4) The `cast-size` FAIL in
`tools/pods/pod-script-view.cjs`; `same-gender-exchange` is now a warn-level note for the ear,
not a failure. (5) The recordist cast panel's two fixed slots, PodLab's two-dropdown picker
("Cast — two voices" → "Cast — voices"; the picker is a list of voices with gender as a per-row
label), the booth copy in ModeSelector, Aran's recording instructions, and the e2e strings.
Manual TTS casting (`api/pod-cast-voices.js` → `tools/pod-sync.cjs` overrides) accepts a LIST of
voices per gender and round-robins that gender's characters across it, so three or five voices
save as three or five.

**What stands, unchanged.** Casting is per speaker (Tom, 2026-08-08: "of course cast by
speaker"). Zero same-voice exchange pairs on the target track — the audible half of the old rule.
Every speaking character must have a voice (`uncast`). The five-column clip check. The known
track is not cast-gated. Every content write carries an editor identity. Two voices remains the
DEFAULT a course opens with (Tom, 2026-08-06) and the default TTS pool depth
(`POD_VOICES_PER_GENDER`); a default, not a rule.

**Proof.** Read-only gate run over all 68 served pods before and after: verdicts identical
(10 ok / 58 fail, the fails being pre-existing same-voice pairs and off-cast clips); the only
textual difference is the "not 2" line dropping from the three pods with no cast at all, which
still fail on `uncast`. No `voice_config` row was written. Red-then-green: the flipped gate tests
(three-voice cast passes, one-voice monologue passes, one-voice two-hander still fails on the
pair) failed on the old gate and pass on the new.

**Known edge, not fixed here.** `recordist-queue.cjs#lineVoiceId` routes a pod line by the cast
entry's declared voice id, so N voices of one gender each get their own queue. A cast entry that
names only a gender still resolves to the language policy's one voice for that (dialect, gender)
bucket — the policy's slot model, untouched.

## 2026-09-12 — a pod line that jumps in on the previous speaker is marked, once, on the row: `listening_pod_sentences.jump_in`

**Tom, 2026-09-12, listening to the Italian method pod on staging:** "The changeovers between
speakers need to be different depending on whether the speakers are jumping in — in which there
should be no gap, in fact it should be overlap if possible … Whereas genuine turn taking — asking
or answering questions etc. — should be as they are now, with whatever gap they currently have.
So it's more like a proper conversation."

**Decision.** One nullable boolean on the line row, no other schema change. NULL = never
annotated and plays as a turn exactly as before; false = judged a turn; true = jumps in. The
learner app reads the row straight from Supabase and maps it to `jumpIn` on the clip it
schedules (job #470); Popty serves `jumpIn` on `GET /api/pods/:course/:slug` and accepts
`jump_in` on the course-scoped sentence PATCH without unlinking audio or touching the draft
flag, because the marker is DELIVERY, never words. The pod page shows it as a lit ⤵ on the
line row and one tap flips it.

**The rule lives in one file** — `services/shared/pod-jump-in-rule.cjs` — one paragraph with
three examples each way, pasted verbatim into the generator prompt (rule 7, and the output
format now asks for `jump_in` per line) and into the back-catalogue annotator
(`tools/pods/annotate-jump-in.cjs`). Two prompts stating the rule separately would drift.
The first line of a scene is forced false in code, whatever a model says. A model answer that
is not a strict boolean collapses to NULL in the generator and is a retry-then-fail in the
annotator: a stray "yes" can never become a jump-in.

**Why better × simpler × cheaper.** A column on the row rather than metadata on the pod or a
side table: the app already fetches the row, the page already patches it, and offline snapshots
carry it for free. The rule as a shared constant rather than a second prompt: one place to
redline when Tom's ear disagrees. Annotation by scene, not by line: the judgement is about the
previous line's trailing "—"/"…", so the scene is the unit.

**Applied.** `ita_for_eng:method-pod`, 309 lines, 79 marked jump-in (26%), sonnet, 126 s,
before-state asserted per row, evidence at
`~/ssi-evidence/ssi-dashboard-v7/tools/pods/annotate-jump-in/`. The rest of the fleet
(11,028 further lines on 65 serving pods; 24,481 including held and retired) is not annotated
by this job — the count and price are in the #471 report, and running it is a separate call.
